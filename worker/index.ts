/**
 * jacsal-intake — the Worker behind intake.jacsalservices.com.
 *
 * Multi-tenant: every landscaper is a `slug`, and the public flow lives under
 * /api/t/<slug>/*. Static assets are served without invoking this Worker at all;
 * only /api/* is forced through it (see `run_worker_first` in wrangler.jsonc).
 *
 * Two independent auth models, deliberately not merged:
 *   * Customers are anonymous and own their lead via an opaque bearer token
 *     issued at creation (X-Lead-Token). No account, no signup friction.
 *   * Staff authenticate through the shared `jacsal-auth` service over a Service
 *     Binding, and must additionally be listed on the tenant they're accessing.
 */
import {
  HttpError,
  badRequest,
  fail,
  forbidden,
  json,
  notFound,
  ok,
  readJson,
  unauthorized,
} from './lib/http'
import {
  assertValidSlug,
  getTenant,
  isTenantAdmin,
  listServices,
  listTenants,
  putService,
  putTenant,
  deleteService,
  requireTenant,
  seedServicesIfEmpty,
  type Service,
  type Tenant,
} from './lib/tenants'
import {
  createLead,
  listLeads,
  markAssessed,
  requireOwnedLead,
  requireLead,
  toLeadDto,
  updateLead,
  updateMeasurements,
} from './lib/leads'
import {
  deletePhoto,
  listPhotos,
  loadPhotosForAssessment,
  getPhoto,
  toPhotoDto,
  uploadPhoto,
} from './lib/photos'
import { assessProperty, saveAssessment } from './lib/assess'
import { isValidPolygon, lookupParcel, polygonAreaSqFt, resolveMeasurements } from './lib/measure'
import { nowS } from './lib/http'

const SESSION_COOKIE = 'jacsal_session'

interface AuthUser {
  id: string
  email: string
  name: string | null
  emailVerified: boolean
}

/** Typed view of the jacsal-auth RPC surface reached over the Service Binding. */
interface AuthService {
  requestCode(email: string): Promise<{ ok: boolean; error?: string }>
  verifyCode(
    email: string,
    code: string,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<
    { ok: true; sessionToken: string; ttlSeconds: number; user: AuthUser } | { ok: false; error: string }
  >
  getSession(token: string): Promise<AuthUser | null>
  logout(token: string): Promise<void>
}

const auth = (env: Env) => env.AUTH as unknown as AuthService

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Anything that isn't an API call is the SPA. `run_worker_first` only routes
    // /api/* here, but defer explicitly so direct hits behave too.
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    try {
      return await route(request, env, url)
    } catch (err) {
      if (err instanceof HttpError) return err.toResponse()
      console.error('[worker] unhandled error', err)
      return fail(500, 'internal_error', 'Something went wrong. Please try again.')
    }
  },
} satisfies ExportedHandler<Env>

async function route(request: Request, env: Env, url: URL): Promise<Response> {
  // '/api/t/acme/leads' -> ['t','acme','leads']
  const seg = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
  const method = request.method.toUpperCase()

  if (seg[0] === 'health') return ok({ service: 'jacsal-intake', time: nowS() })
  if (seg[0] === 'auth') return await authRoutes(request, env, method, seg.slice(1))
  if (seg[0] === 'photos') return await photoBytesRoute(request, env, method, seg.slice(1))
  if (seg[0] === 't') return await publicRoutes(request, env, method, seg.slice(1))
  if (seg[0] === 'admin') return await adminRoutes(request, env, url, method, seg.slice(1))

  throw notFound('Unknown endpoint.')
}

// ---------------------------------------------------------------------------
// Auth (staff)
// ---------------------------------------------------------------------------

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

async function currentUser(request: Request, env: Env): Promise<AuthUser | null> {
  const token = readCookie(request, SESSION_COOKIE)
  if (!token) return null
  return await auth(env).getSession(token)
}

async function requireUser(request: Request, env: Env): Promise<AuthUser> {
  const user = await currentUser(request, env)
  if (!user) throw unauthorized()
  return user
}

async function authRoutes(
  request: Request,
  env: Env,
  method: string,
  seg: string[],
): Promise<Response> {
  if (seg[0] === 'request-code' && method === 'POST') {
    const body = await readJson<{ email?: string }>(request)
    if (!body.email) throw badRequest('An email address is required.')
    const result = await auth(env).requestCode(body.email)
    // Deliberately uniform: never reveal whether an address is known, and treat
    // throttling as success so timing can't be used to enumerate accounts.
    if (!result.ok && result.error === 'invalid_email') {
      throw badRequest('That email address does not look valid.')
    }
    return ok({ sent: true })
  }

  if (seg[0] === 'verify' && method === 'POST') {
    const body = await readJson<{ email?: string; code?: string }>(request)
    if (!body.email || !body.code) throw badRequest('Email and code are both required.')
    const result = await auth(env).verifyCode(body.email, body.code, {
      userAgent: request.headers.get('user-agent') ?? undefined,
      ip: request.headers.get('cf-connecting-ip') ?? undefined,
    })
    if (!result.ok) throw new HttpError(401, result.error, 'That code was not valid or has expired.')

    return json(
      { ok: true, user: result.user },
      {
        headers: {
          'set-cookie': `${SESSION_COOKIE}=${encodeURIComponent(result.sessionToken)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${result.ttlSeconds}`,
        },
      },
    )
  }

  if (seg[0] === 'logout' && method === 'POST') {
    const token = readCookie(request, SESSION_COOKIE)
    if (token) await auth(env).logout(token)
    return json(
      { ok: true },
      { headers: { 'set-cookie': `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0` } },
    )
  }

  if (seg[0] === 'me' && method === 'GET') {
    const user = await currentUser(request, env)
    return ok({ user })
  }

  throw notFound('Unknown auth endpoint.')
}

// ---------------------------------------------------------------------------
// Photo bytes — /api/photos/:id
// Readable by the lead's own token or by an admin of the owning tenant.
// ---------------------------------------------------------------------------

async function photoBytesRoute(
  request: Request,
  env: Env,
  method: string,
  seg: string[],
): Promise<Response> {
  if (method !== 'GET' || !seg[0]) throw notFound('Unknown photo endpoint.')

  const photo = await getPhoto(env, seg[0])
  if (!photo) throw notFound('Photo not found.')

  const leadToken = request.headers.get('x-lead-token') ?? new URL(request.url).searchParams.get('t')
  let allowed = false

  if (leadToken) {
    try {
      await requireOwnedLead(env, photo.tenant_slug, photo.lead_id, leadToken)
      allowed = true
    } catch {
      allowed = false
    }
  }
  if (!allowed) {
    const user = await currentUser(request, env)
    const tenant = await getTenant(env, photo.tenant_slug)
    allowed = Boolean(tenant && isTenantAdmin(tenant, user?.email))
  }
  if (!allowed) throw forbidden('You do not have access to this photo.')

  const object = await env.PHOTOS.get(photo.r2_key)
  if (!object) throw notFound('Photo file is missing.')

  return new Response(object.body, {
    headers: {
      'content-type': photo.mime_type ?? 'application/octet-stream',
      // Private: a shared link is useless without the token, and no shared
      // cache should ever hold a customer's property photo.
      'cache-control': 'private, max-age=3600',
      'content-disposition': `inline; filename="${(photo.file_name ?? 'photo').replace(/"/g, '')}"`,
    },
  })
}

// ---------------------------------------------------------------------------
// Public customer flow — /api/t/:slug/*
// ---------------------------------------------------------------------------

async function publicRoutes(
  request: Request,
  env: Env,
  method: string,
  seg: string[],
): Promise<Response> {
  const slug = seg[0]
  if (!slug) throw notFound('No intake form specified.')
  const tenant = await requireTenant(env, slug)
  const rest = seg.slice(1)

  // Everything the SPA needs to render the flow, in one call.
  if (rest[0] === 'config' && method === 'GET') {
    const services = (await listServices(env, slug)).filter((s) => s.isActive)
    return ok({
      tenant: publicTenant(tenant),
      services: services.map(publicService),
      // Maps is optional; the SPA hides the tracing step when absent.
      mapsEnabled: await hasMapsKey(env),
      parcelLookupEnabled: Boolean(tenant.parcelLookupEnabled),
    })
  }

  if (rest[0] !== 'leads') throw notFound('Unknown endpoint.')

  // POST /api/t/:slug/leads — step 1
  if (rest.length === 1 && method === 'POST') {
    const body = await readJson<Record<string, unknown>>(request)
    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim()
    if (!name) throw badRequest('Please enter your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Please enter a valid email address.')

    const { row, token } = await createLead(env, slug, {
      name,
      email,
      phone: str(body.phone),
      serviceAddress: str(body.serviceAddress),
      city: str(body.city),
      postalCode: str(body.postalCode),
      propertyType: str(body.propertyType),
      areas: Array.isArray(body.areas) ? (body.areas as string[]) : [],
      gateAccess: str(body.gateAccess),
      petsOnProperty: body.petsOnProperty === true,
      accessNotes: str(body.accessNotes),
    })

    // The token is shown exactly once. The SPA keeps it for the rest of the flow.
    return ok({ lead: toLeadDto(row), leadToken: token })
  }

  const leadId = rest[1]
  if (!leadId) throw notFound('Unknown endpoint.')
  const token = request.headers.get('x-lead-token')
  const lead = await requireOwnedLead(env, slug, leadId, token)
  const action = rest[2]

  if (!action && method === 'GET') return ok({ lead: toLeadDto(lead) })

  if (!action && method === 'PATCH') {
    const patch = await readJson<Record<string, unknown>>(request)
    const updated = await updateLead(env, slug, leadId, patch)
    return ok({ lead: toLeadDto(updated) })
  }

  // ---- Photos ----
  if (action === 'photos') {
    if (method === 'GET') {
      const rows = await listPhotos(env, leadId)
      return ok({ photos: rows.map(toPhotoDto) })
    }

    if (method === 'POST') {
      const form = await request.formData().catch(() => null)
      if (!form) throw badRequest('Expected a multipart upload.')
      const file = form.get('file')
      if (!(file instanceof File)) throw badRequest('No photo was included in the upload.')
      const row = await uploadPhoto(env, slug, leadId, {
        area: String(form.get('area') ?? 'other'),
        caption: str(form.get('caption')),
        file,
      })
      return ok({ photo: toPhotoDto(row) })
    }

    if (method === 'DELETE' && rest[3]) {
      const removed = await deletePhoto(env, rest[3], leadId)
      if (!removed) throw notFound('Photo not found.')
      return ok({ deleted: true })
    }
  }

  // ---- Measurements ----
  // Merges what the customer typed, what they traced, and (where available)
  // authoritative parcel data, then records which source won and why.
  if (action === 'measure' && method === 'POST') {
    const body = await readJson<Record<string, unknown>>(request)

    let tracedTurfSqft: number | null = null
    let polygon: unknown = null
    if (body.polygon !== undefined && body.polygon !== null) {
      if (!isValidPolygon(body.polygon)) {
        throw badRequest('The traced area was not a valid shape. Please redraw it.')
      }
      polygon = body.polygon
      tracedTurfSqft = polygonAreaSqFt(body.polygon)
    }

    // Persist whatever the customer typed before resolving, so the two stay
    // independently visible to the admin.
    const withClientValues = await updateLead(env, slug, leadId, {
      clientLotSqft: body.clientLotSqft,
      clientTurfSqft: body.clientTurfSqft,
      treeCount: body.treeCount,
      shrubCount: body.shrubCount,
      fenceLengthFt: body.fenceLengthFt,
    })

    let parcel = null
    if (tenant.parcelLookupEnabled && withClientValues.service_address) {
      parcel = await lookupParcel(env, withClientValues.service_address, withClientValues.city)
    }

    const resolved = resolveMeasurements({
      clientTurfSqft: withClientValues.client_turf_sqft,
      tracedTurfSqft,
      clientLotSqft: withClientValues.client_lot_sqft,
      parcelLotSqft: parcel?.lotSqft ?? null,
    })

    const updated = await updateMeasurements(env, slug, leadId, {
      parcelApn: parcel?.apn ?? null,
      parcelLotSqft: parcel?.lotSqft ?? null,
      parcelZone: parcel?.zone ?? null,
      parcelSource: parcel?.source ?? null,
      tracedTurfSqft,
      tracedPolygon: polygon,
      turfSqft: resolved.turfSqft,
      turfSqftSource: resolved.turfSqftSource,
      measurementFlag: resolved.flag,
    })

    return ok({ lead: toLeadDto(updated), parcelAvailable: parcel !== null })
  }

  // ---- Assessment ----
  if (action === 'assess' && method === 'POST') {
    const services = await listServices(env, slug)
    const photos = await loadPhotosForAssessment(env, leadId)

    const result = await assessProperty(env, {
      tenant,
      services,
      photos,
      requestedServices: JSON.parse(lead.requested_services ?? '[]'),
      cadence: lead.cadence,
      propertyType: lead.property_type,
      notes: lead.notes,
    })

    await saveAssessment(env, slug, leadId, result)
    if (result.status === 'ok') await markAssessed(env, slug, leadId)

    // Prices are attached HERE, from the catalog — never from the model.
    const byValue = new Map(services.map((s) => [s.serviceValue, s]))
    const decorate = (list: { service_value: string; reason: string; confidence: string }[]) =>
      list
        .map((s) => {
          const svc = byValue.get(s.service_value)
          return svc
            ? {
                serviceValue: s.service_value,
                name: svc.name,
                description: svc.description,
                price: svc.price,
                unit: svc.unit,
                reason: s.reason,
                confidence: s.confidence,
              }
            : null
        })
        .filter(Boolean)

    return ok({
      assessment: {
        status: result.status,
        error: result.error,
        observations: result.observations,
        recommended: decorate(result.recommendedServices),
        addons: decorate(result.addonServices),
        photoQualityIssues: result.photoQualityIssues,
        photoCount: result.photoCount,
      },
    })
  }

  throw notFound('Unknown endpoint.')
}

// ---------------------------------------------------------------------------
// Admin — /api/admin/*
// ---------------------------------------------------------------------------

async function adminRoutes(
  request: Request,
  env: Env,
  url: URL,
  method: string,
  seg: string[],
): Promise<Response> {
  const user = await requireUser(request, env)

  if (seg[0] !== 'tenants') throw notFound('Unknown admin endpoint.')

  // GET /api/admin/tenants — only those you actually administer.
  if (seg.length === 1 && method === 'GET') {
    const all = await listTenants(env)
    const mine = all.filter((t) => isTenantAdmin(t, user.email))
    return ok({ tenants: mine, canBootstrap: all.length === 0 })
  }

  // POST /api/admin/tenants
  // Bootstrap: with no tenants at all, the first authenticated user may create
  // one (and is added as its admin). After that, only an existing admin of any
  // tenant may create more — otherwise anyone with an account could self-serve.
  if (seg.length === 1 && method === 'POST') {
    const all = await listTenants(env)
    const isBootstrap = all.length === 0
    if (!isBootstrap && !all.some((t) => isTenantAdmin(t, user.email))) {
      throw forbidden('Only an existing administrator can add a new company.')
    }

    const body = await readJson<Record<string, unknown>>(request)
    const slug = String(body.slug ?? '').trim().toLowerCase()
    assertValidSlug(slug)
    if (await getTenant(env, slug)) throw badRequest(`The slug "${slug}" is already taken.`)

    const name = String(body.name ?? '').trim()
    if (!name) throw badRequest('A company name is required.')

    const admins = new Set<string>([user.email.toLowerCase()])
    for (const e of (body.adminEmails as string[] | undefined) ?? []) {
      if (typeof e === 'string' && e.includes('@')) admins.add(e.trim().toLowerCase())
    }

    const tenant = await putTenant(env, {
      slug,
      name,
      tagline: str(body.tagline) ?? undefined,
      logoUrl: str(body.logoUrl) ?? undefined,
      primaryColor: str(body.primaryColor) ?? undefined,
      contactEmail: str(body.contactEmail) ?? undefined,
      contactPhone: str(body.contactPhone) ?? undefined,
      serviceAreas: Array.isArray(body.serviceAreas) ? (body.serviceAreas as string[]) : [],
      timeSlots: Array.isArray(body.timeSlots) ? (body.timeSlots as string[]) : undefined,
      parcelLookupEnabled: body.parcelLookupEnabled === true,
      adminEmails: [...admins],
      createdAt: nowS(),
      updatedAt: nowS(),
    })
    await seedServicesIfEmpty(env, slug)
    return ok({ tenant })
  }

  const slug = seg[1]
  if (!slug) throw notFound('Unknown admin endpoint.')
  const tenant = await requireTenant(env, slug)
  if (!isTenantAdmin(tenant, user.email)) {
    throw forbidden('You are not an administrator for this company.')
  }
  const rest = seg.slice(2)

  if (rest.length === 0 && method === 'GET') return ok({ tenant })

  if (rest.length === 0 && method === 'PUT') {
    const body = await readJson<Partial<Tenant>>(request)
    // slug/createdAt are identity, not settings — never patchable.
    const updated = await putTenant(env, {
      ...tenant,
      name: body.name ?? tenant.name,
      tagline: body.tagline ?? tenant.tagline,
      logoUrl: body.logoUrl ?? tenant.logoUrl,
      primaryColor: body.primaryColor ?? tenant.primaryColor,
      contactEmail: body.contactEmail ?? tenant.contactEmail,
      contactPhone: body.contactPhone ?? tenant.contactPhone,
      serviceAreas: body.serviceAreas ?? tenant.serviceAreas,
      timeSlots: body.timeSlots ?? tenant.timeSlots,
      assessmentModel: body.assessmentModel ?? tenant.assessmentModel,
      parcelLookupEnabled: body.parcelLookupEnabled ?? tenant.parcelLookupEnabled,
      adminEmails: body.adminEmails ?? tenant.adminEmails,
    })
    return ok({ tenant: updated })
  }

  // ---- Services ----
  if (rest[0] === 'services') {
    if (rest[1] === 'seed' && method === 'POST') {
      return ok({ services: await seedServicesIfEmpty(env, slug) })
    }
    if (rest.length === 1 && method === 'GET') {
      return ok({ services: await listServices(env, slug) })
    }
    if (rest.length === 1 && method === 'POST') {
      const body = await readJson<Partial<Service>>(request)
      const existing = await listServices(env, slug)
      const service: Service = {
        id: crypto.randomUUID(),
        serviceValue: (body.serviceValue ?? '').trim(),
        name: (body.name ?? '').trim(),
        description: body.description ?? '',
        category: body.category ?? 'other',
        unit: body.unit ?? 'visit',
        price: Number(body.price) || 0,
        isAddon: body.isAddon ?? true,
        isActive: body.isActive ?? true,
        sortOrder: existing.reduce((m, s) => Math.max(m, s.sortOrder), 0) + 1,
        triggers: body.triggers ?? '',
      }
      if (!service.serviceValue || !service.name) {
        throw badRequest('A service needs both a name and a service value.')
      }
      if (existing.some((s) => s.serviceValue === service.serviceValue)) {
        throw badRequest(`The service value "${service.serviceValue}" is already used.`)
      }
      return ok({ service: await putService(env, slug, service) })
    }
    if (rest[1] && method === 'PUT') {
      const services = await listServices(env, slug)
      const current = services.find((s) => s.id === rest[1])
      if (!current) throw notFound('Service not found.')
      const body = await readJson<Partial<Service>>(request)
      // serviceValue is the key past assessments reference — changing it would
      // silently orphan them, so it is intentionally immutable.
      const updated: Service = {
        ...current,
        name: body.name ?? current.name,
        description: body.description ?? current.description,
        category: body.category ?? current.category,
        unit: body.unit ?? current.unit,
        price: body.price !== undefined ? Number(body.price) || 0 : current.price,
        isAddon: body.isAddon ?? current.isAddon,
        isActive: body.isActive ?? current.isActive,
        sortOrder: body.sortOrder ?? current.sortOrder,
        triggers: body.triggers ?? current.triggers,
      }
      return ok({ service: await putService(env, slug, updated) })
    }
    if (rest[1] && method === 'DELETE') {
      await deleteService(env, slug, rest[1])
      return ok({ deleted: true })
    }
  }

  // ---- Leads ----
  if (rest[0] === 'leads') {
    if (rest.length === 1 && method === 'GET') {
      const rows = await listLeads(env, slug, {
        limit: Number(url.searchParams.get('limit')) || 100,
        status: url.searchParams.get('status'),
      })
      return ok({ leads: rows.map(toLeadDto) })
    }
    if (rest[1] && method === 'GET') {
      const lead = await requireLead(env, slug, rest[1])
      const photos = await listPhotos(env, rest[1])
      const { results: assessments } = await env.DB.prepare(
        'SELECT * FROM assessments WHERE lead_id = ? ORDER BY created_at DESC',
      )
        .bind(rest[1])
        .all()
      return ok({
        lead: toLeadDto(lead),
        photos: photos.map(toPhotoDto),
        assessments: (assessments ?? []).map(parseAssessmentRow),
      })
    }
  }

  throw notFound('Unknown admin endpoint.')
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s.length ? s : null
}

/** Strip internal fields before a tenant record reaches a public page. */
function publicTenant(t: Tenant) {
  return {
    slug: t.slug,
    name: t.name,
    tagline: t.tagline ?? null,
    logoUrl: t.logoUrl ?? null,
    primaryColor: t.primaryColor ?? null,
    contactEmail: t.contactEmail ?? null,
    contactPhone: t.contactPhone ?? null,
    serviceAreas: t.serviceAreas ?? [],
    timeSlots: t.timeSlots ?? ['08:00', '10:00', '13:00', '15:00'],
  }
}

/** `triggers` is prompt engineering for staff, not customer copy — omit it. */
function publicService(s: Service) {
  return {
    id: s.id,
    serviceValue: s.serviceValue,
    name: s.name,
    description: s.description,
    category: s.category,
    unit: s.unit,
    price: s.price,
    isAddon: s.isAddon,
  }
}

function parseAssessmentRow(row: Record<string, unknown>) {
  const parse = (v: unknown) => {
    try {
      return JSON.parse(String(v ?? '[]'))
    } catch {
      return []
    }
  }
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    error: row.error,
    model: row.model,
    photoCount: row.photo_count,
    observations: parse(row.observations),
    recommendedServices: parse(row.recommended_services),
    addonServices: parse(row.addon_services),
    crewNotes: row.crew_notes,
    photoQualityIssues: parse(row.photo_quality_issues),
    rejectedServiceValues: parse(row.rejected_service_values),
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
  }
}

async function hasMapsKey(env: Env): Promise<boolean> {
  try {
    return Boolean(await env.GOOGLE_MAPS_API_KEY.get())
  } catch {
    return false
  }
}
