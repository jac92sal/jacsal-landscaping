/**
 * Lead persistence.
 *
 * Anonymous visitors own their lead through an opaque bearer token issued once
 * at creation; only its SHA-256 is stored. Every later write must present it, so
 * guessing a lead UUID is not enough to read or modify someone's intake.
 */
import { forbidden, notFound, nowS, parseJsonArray, randomToken, sha256Hex, timingSafeEqualHex } from './http'

export interface LeadRow {
  id: string
  tenant_slug: string
  created_at: number
  updated_at: number
  token_hash: string
  name: string
  email: string
  phone: string | null
  service_address: string | null
  city: string | null
  postal_code: string | null
  property_type: string | null
  areas: string | null
  gate_access: string | null
  pets_on_property: number
  access_notes: string | null
  requested_services: string | null
  cadence: string | null
  notes: string | null
  client_lot_sqft: number | null
  client_turf_sqft: number | null
  parcel_apn: string | null
  parcel_lot_sqft: number | null
  parcel_zone: string | null
  parcel_source: string | null
  traced_turf_sqft: number | null
  traced_polygon: string | null
  turf_sqft: number | null
  turf_sqft_source: string | null
  measurement_flag: string | null
  tree_count: number | null
  shrub_count: number | null
  fence_length_ft: number | null
  photos_completed: number
  photos_skipped: number
  assessment_completed: number
  accepted_services: string | null
  declined_services: string | null
  booking_date: string | null
  booking_time: string | null
  status: string
}

/** Shape returned to clients. Never includes token_hash. */
export function toLeadDto(row: LeadRow) {
  return {
    id: row.id,
    tenantSlug: row.tenant_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    name: row.name,
    email: row.email,
    phone: row.phone,
    serviceAddress: row.service_address,
    city: row.city,
    postalCode: row.postal_code,
    propertyType: row.property_type,
    areas: parseJsonArray(row.areas),
    gateAccess: row.gate_access,
    petsOnProperty: row.pets_on_property === 1,
    accessNotes: row.access_notes,
    requestedServices: parseJsonArray(row.requested_services),
    cadence: row.cadence,
    notes: row.notes,
    measurements: {
      clientLotSqft: row.client_lot_sqft,
      clientTurfSqft: row.client_turf_sqft,
      parcelApn: row.parcel_apn,
      parcelLotSqft: row.parcel_lot_sqft,
      parcelZone: row.parcel_zone,
      parcelSource: row.parcel_source,
      tracedTurfSqft: row.traced_turf_sqft,
      tracedPolygon: row.traced_polygon ? JSON.parse(row.traced_polygon) : null,
      turfSqft: row.turf_sqft,
      turfSqftSource: row.turf_sqft_source,
      flag: row.measurement_flag,
      treeCount: row.tree_count,
      shrubCount: row.shrub_count,
      fenceLengthFt: row.fence_length_ft,
    },
    photosCompleted: row.photos_completed === 1,
    photosSkipped: row.photos_skipped === 1,
    assessmentCompleted: row.assessment_completed === 1,
    acceptedServices: parseJsonArray(row.accepted_services),
    declinedServices: parseJsonArray(row.declined_services),
    bookingDate: row.booking_date,
    bookingTime: row.booking_time,
    status: row.status,
  }
}

export async function createLead(
  env: Env,
  tenantSlug: string,
  input: {
    name: string
    email: string
    phone?: string | null
    serviceAddress?: string | null
    city?: string | null
    postalCode?: string | null
    propertyType?: string | null
    areas?: string[]
    gateAccess?: string | null
    petsOnProperty?: boolean
    accessNotes?: string | null
  },
): Promise<{ row: LeadRow; token: string }> {
  const id = crypto.randomUUID()
  const token = randomToken()
  const tokenHash = await sha256Hex(token)
  const ts = nowS()

  await env.DB.prepare(
    `INSERT INTO leads
       (id, tenant_slug, created_at, updated_at, token_hash, name, email, phone,
        service_address, city, postal_code, property_type, areas, gate_access,
        pets_on_property, access_notes, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      id,
      tenantSlug,
      ts,
      ts,
      tokenHash,
      input.name,
      input.email,
      input.phone ?? null,
      input.serviceAddress ?? null,
      input.city ?? null,
      input.postalCode ?? null,
      input.propertyType ?? null,
      JSON.stringify(input.areas ?? []),
      input.gateAccess ?? null,
      input.petsOnProperty ? 1 : 0,
      input.accessNotes ?? null,
      'services',
    )
    .run()

  const row = await getLead(env, tenantSlug, id)
  if (!row) throw new Error('lead insert did not round-trip')
  return { row, token }
}

export async function getLead(env: Env, tenantSlug: string, id: string): Promise<LeadRow | null> {
  return await env.DB.prepare('SELECT * FROM leads WHERE id = ? AND tenant_slug = ?')
    .bind(id, tenantSlug)
    .first<LeadRow>()
}

/**
 * Load a lead and verify the caller holds its token. Tenant mismatch and a bad
 * token both surface as the same 403, so this endpoint can't be used to probe
 * which lead IDs exist.
 */
export async function requireOwnedLead(
  env: Env,
  tenantSlug: string,
  id: string,
  token: string | null,
): Promise<LeadRow> {
  const row = await getLead(env, tenantSlug, id)
  if (!row || !token) throw forbidden('This intake link is not valid.')
  const candidate = await sha256Hex(token)
  if (!timingSafeEqualHex(candidate, row.token_hash)) {
    throw forbidden('This intake link is not valid.')
  }
  return row
}

export async function requireLead(env: Env, tenantSlug: string, id: string): Promise<LeadRow> {
  const row = await getLead(env, tenantSlug, id)
  if (!row) throw notFound('That request could not be found.')
  return row
}

/**
 * Column allow-list for updates. Anything not listed here is ignored, so a
 * client cannot set `token_hash`, `tenant_slug`, or `id` by posting extra keys.
 */
const UPDATABLE: Record<string, (v: unknown) => unknown> = {
  name: asText,
  email: asText,
  phone: asText,
  serviceAddress: asText,
  city: asText,
  postalCode: asText,
  propertyType: asText,
  areas: asJsonArray,
  gateAccess: asText,
  petsOnProperty: asBool,
  accessNotes: asText,
  requestedServices: asJsonArray,
  cadence: asText,
  notes: asText,
  clientLotSqft: asNumber,
  clientTurfSqft: asNumber,
  treeCount: asInt,
  shrubCount: asInt,
  fenceLengthFt: asNumber,
  photosCompleted: asBool,
  photosSkipped: asBool,
  acceptedServices: asJsonArray,
  declinedServices: asJsonArray,
  bookingDate: asText,
  bookingTime: asText,
  status: asText,
}

const COLUMN_OF: Record<string, string> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  serviceAddress: 'service_address',
  city: 'city',
  postalCode: 'postal_code',
  propertyType: 'property_type',
  areas: 'areas',
  gateAccess: 'gate_access',
  petsOnProperty: 'pets_on_property',
  accessNotes: 'access_notes',
  requestedServices: 'requested_services',
  cadence: 'cadence',
  notes: 'notes',
  clientLotSqft: 'client_lot_sqft',
  clientTurfSqft: 'client_turf_sqft',
  treeCount: 'tree_count',
  shrubCount: 'shrub_count',
  fenceLengthFt: 'fence_length_ft',
  photosCompleted: 'photos_completed',
  photosSkipped: 'photos_skipped',
  acceptedServices: 'accepted_services',
  declinedServices: 'declined_services',
  bookingDate: 'booking_date',
  bookingTime: 'booking_time',
  status: 'status',
}

export async function updateLead(
  env: Env,
  tenantSlug: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<LeadRow> {
  const sets: string[] = []
  const values: unknown[] = []

  for (const [key, coerce] of Object.entries(UPDATABLE)) {
    if (!(key in patch)) continue
    sets.push(`${COLUMN_OF[key]} = ?`)
    values.push(coerce(patch[key]))
  }

  if (sets.length > 0) {
    sets.push('updated_at = ?')
    values.push(nowS())
    values.push(id, tenantSlug)
    await env.DB.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = ? AND tenant_slug = ?`)
      .bind(...values)
      .run()
  }

  return await requireLead(env, tenantSlug, id)
}

/** Measurement columns are written by the server only, never by a client patch. */
export async function updateMeasurements(
  env: Env,
  tenantSlug: string,
  id: string,
  m: {
    parcelApn?: string | null
    parcelLotSqft?: number | null
    parcelZone?: string | null
    parcelSource?: string | null
    tracedTurfSqft?: number | null
    tracedPolygon?: unknown | null
    turfSqft?: number | null
    turfSqftSource?: string | null
    measurementFlag?: string | null
  },
): Promise<LeadRow> {
  await env.DB.prepare(
    `UPDATE leads SET
       parcel_apn = ?, parcel_lot_sqft = ?, parcel_zone = ?, parcel_source = ?,
       traced_turf_sqft = ?, traced_polygon = ?,
       turf_sqft = ?, turf_sqft_source = ?, measurement_flag = ?,
       updated_at = ?
     WHERE id = ? AND tenant_slug = ?`,
  )
    .bind(
      m.parcelApn ?? null,
      m.parcelLotSqft ?? null,
      m.parcelZone ?? null,
      m.parcelSource ?? null,
      m.tracedTurfSqft ?? null,
      m.tracedPolygon ? JSON.stringify(m.tracedPolygon) : null,
      m.turfSqft ?? null,
      m.turfSqftSource ?? null,
      m.measurementFlag ?? null,
      nowS(),
      id,
      tenantSlug,
    )
    .run()
  return await requireLead(env, tenantSlug, id)
}

export async function markAssessed(env: Env, tenantSlug: string, id: string): Promise<void> {
  await env.DB.prepare(
    'UPDATE leads SET assessment_completed = 1, status = ?, updated_at = ? WHERE id = ? AND tenant_slug = ?',
  )
    .bind('assessment', nowS(), id, tenantSlug)
    .run()
}

export async function listLeads(
  env: Env,
  tenantSlug: string,
  opts: { limit?: number; status?: string | null } = {},
): Promise<LeadRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500)
  const stmt = opts.status
    ? env.DB.prepare(
        'SELECT * FROM leads WHERE tenant_slug = ? AND status = ? ORDER BY created_at DESC LIMIT ?',
      ).bind(tenantSlug, opts.status, limit)
    : env.DB.prepare(
        'SELECT * FROM leads WHERE tenant_slug = ? ORDER BY created_at DESC LIMIT ?',
      ).bind(tenantSlug, limit)
  const { results } = await stmt.all<LeadRow>()
  return results ?? []
}

// ---- coercion helpers ------------------------------------------------------

function asText(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s.length ? s.slice(0, 4000) : null
}

function asBool(v: unknown): number {
  return v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0
}

function asNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isFinite(n) && n >= 0 ? n : null
}

function asInt(v: unknown): number | null {
  const n = asNumber(v)
  return n === null ? null : Math.round(n)
}

function asJsonArray(v: unknown): string {
  if (!Array.isArray(v)) return '[]'
  return JSON.stringify(v.filter((x) => typeof x === 'string').slice(0, 100))
}
