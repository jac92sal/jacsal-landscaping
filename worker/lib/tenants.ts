/**
 * Tenants and their service catalogs.
 *
 * Both live in KV (`CONFIG`) rather than D1: they're read on nearly every
 * request, they're tiny, and they change rarely — exactly KV's shape. Keys:
 *   tenant:<slug>                → Tenant
 *   tenant:<slug>:service:<id>   → Service
 */
import { HttpError, notFound, nowS } from './http'

export interface Tenant {
  slug: string
  name: string
  tagline?: string
  logoUrl?: string
  primaryColor?: string
  contactEmail?: string
  contactPhone?: string
  /** Cities/areas served, shown to the client and used to sanity-check addresses. */
  serviceAreas?: string[]
  /** Bookable start times, e.g. ["08:00","10:00","13:00"]. */
  timeSlots?: string[]
  /** Overrides the Worker-level ASSESSMENT_MODEL var when set. */
  assessmentModel?: string
  /**
   * Parcel lookup is San Diego-only today. Tenants outside that coverage fall
   * back to trace-only measurement rather than showing a broken lookup.
   */
  parcelLookupEnabled?: boolean
  /** Emails allowed into this tenant's admin. Checked against the auth session. */
  adminEmails?: string[]
  createdAt: number
  updatedAt: number
}

export type ServiceUnit = 'visit' | 'hour' | 'sqft' | 'item'

export interface Service {
  id: string
  /** Stable key the assessment maps to. Renaming this breaks past assessments. */
  serviceValue: string
  name: string
  description: string
  category: 'maintenance' | 'cleanup' | 'irrigation' | 'planting' | 'other'
  unit: ServiceUnit
  price: number
  /**
   * Whether this service may be surfaced as an AI upsell suggestion. Core
   * services the client already asked for are not re-suggested as add-ons.
   */
  isAddon: boolean
  isActive: boolean
  sortOrder: number
  /**
   * Plain-language description of the visible conditions that should trigger
   * this service — e.g. "brown or bare patches in the turf; thinning grass".
   * This is the single highest-leverage field for assessment quality: it is fed
   * to the model verbatim as the trigger vocabulary, so a vague trigger produces
   * vague suggestions. Same lesson as writing a good tool description.
   */
  triggers?: string
}

const tenantKey = (slug: string) => `tenant:${slug}`
const servicePrefix = (slug: string) => `tenant:${slug}:service:`
const serviceKey = (slug: string, id: string) => `${servicePrefix(slug)}${id}`

/** Slugs are used in URLs and KV keys, so keep them boring and unambiguous. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)
}

export async function getTenant(env: Env, slug: string): Promise<Tenant | null> {
  if (!isValidSlug(slug)) return null
  return await env.CONFIG.get<Tenant>(tenantKey(slug), 'json')
}

export async function requireTenant(env: Env, slug: string): Promise<Tenant> {
  const tenant = await getTenant(env, slug)
  if (!tenant) throw notFound(`No intake form is configured at "${slug}".`)
  return tenant
}

export async function putTenant(env: Env, tenant: Tenant): Promise<Tenant> {
  const record: Tenant = { ...tenant, updatedAt: nowS() }
  await env.CONFIG.put(tenantKey(tenant.slug), JSON.stringify(record))
  return record
}

export async function listTenants(env: Env): Promise<Tenant[]> {
  const out: Tenant[] = []
  let cursor: string | undefined
  do {
    const page = await env.CONFIG.list({ prefix: 'tenant:', cursor })
    // `tenant:<slug>` only — skip the nested `:service:` keys.
    const slugKeys = page.keys.filter((k) => !k.name.includes(':service:'))
    for (const key of slugKeys) {
      const tenant = await env.CONFIG.get<Tenant>(key.name, 'json')
      if (tenant) out.push(tenant)
    }
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export async function listServices(env: Env, slug: string): Promise<Service[]> {
  const out: Service[] = []
  let cursor: string | undefined
  do {
    const page = await env.CONFIG.list({ prefix: servicePrefix(slug), cursor })
    for (const key of page.keys) {
      const svc = await env.CONFIG.get<Service>(key.name, 'json')
      if (svc) out.push(svc)
    }
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  return out.sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function putService(env: Env, slug: string, service: Service): Promise<Service> {
  await env.CONFIG.put(serviceKey(slug, service.id), JSON.stringify(service))
  return service
}

export async function deleteService(env: Env, slug: string, id: string): Promise<void> {
  await env.CONFIG.delete(serviceKey(slug, id))
}

export async function getService(env: Env, slug: string, id: string): Promise<Service | null> {
  return await env.CONFIG.get<Service>(serviceKey(slug, id), 'json')
}

/**
 * Default landscaping catalog, modelled on what a maintenance crew actually
 * advertises. `triggers` is written for the vision model, not for the customer.
 * Prices are placeholders — every tenant is expected to set their own.
 */
export const DEFAULT_SERVICES: Omit<Service, 'id'>[] = [
  {
    serviceValue: 'lawn-mow',
    name: 'Lawn Mowing',
    description: 'Cut, edge, and clean up clippings across all turf areas.',
    category: 'maintenance',
    unit: 'visit',
    price: 45,
    isAddon: false,
    isActive: true,
    sortOrder: 1,
    triggers: 'Grass that is tall, uneven, or visibly overgrown; turf that has clearly not been cut recently.',
  },
  {
    serviceValue: 'weeding',
    name: 'Weeding',
    description: 'Pull and clear weeds from beds, walkways, and gravel areas.',
    category: 'maintenance',
    unit: 'visit',
    price: 55,
    isAddon: true,
    isActive: true,
    sortOrder: 2,
    triggers:
      'Weeds growing in planting beds, through gravel or decomposed granite, or in cracks along walkways, driveways, and fence lines.',
  },
  {
    serviceValue: 'bush-trim',
    name: 'Bush & Hedge Trimming',
    description: 'Shape and reduce shrubs and hedges, haul away trimmings.',
    category: 'maintenance',
    unit: 'visit',
    price: 85,
    isAddon: true,
    isActive: true,
    sortOrder: 3,
    triggers:
      'Shrubs or hedges that are overgrown, blocking windows, walkways, or driveways, or have lost their shape.',
  },
  {
    serviceValue: 'dead-plant-removal',
    name: 'Dead Plant Removal',
    description: 'Remove dead or dried-out plants, shrubs, and stumps.',
    category: 'cleanup',
    unit: 'visit',
    price: 95,
    isAddon: true,
    isActive: true,
    sortOrder: 4,
    triggers:
      'Plants, shrubs, or small trees that are brown, brittle, leafless, or clearly dead; dried-out ornamental grasses.',
  },
  {
    serviceValue: 'yard-cleanup',
    name: 'Full Yard Cleanup',
    description: 'Clear debris, leaves, and overgrowth; blow down hard surfaces.',
    category: 'cleanup',
    unit: 'visit',
    price: 175,
    isAddon: true,
    isActive: true,
    sortOrder: 5,
    triggers:
      'Accumulated leaf litter, fallen branches, piles of debris, or general neglect across the yard.',
  },
  {
    serviceValue: 'sprinkler-adjust',
    name: 'Sprinkler Adjustment & Repair',
    description: 'Adjust heads, check coverage, and repair obvious breaks.',
    category: 'irrigation',
    unit: 'visit',
    price: 75,
    isAddon: true,
    isActive: true,
    sortOrder: 6,
    triggers:
      'Exposed, broken, tilted, or buried sprinkler heads; pooling water, muddy patches, or dry areas next to healthy turf suggesting uneven coverage.',
  },
  {
    serviceValue: 'fertilize',
    name: 'Fertilization',
    description: 'Apply seasonal fertilizer to promote healthy, even growth.',
    category: 'maintenance',
    unit: 'visit',
    price: 65,
    isAddon: true,
    isActive: true,
    sortOrder: 7,
    triggers:
      'Turf that is pale, yellowing, thin, or patchy in a way that suggests nutrient deficiency rather than mowing neglect.',
  },
  {
    serviceValue: 'palm-trim',
    name: 'Palm Trimming',
    description: 'Remove dead fronds and seed pods from palms.',
    category: 'maintenance',
    unit: 'item',
    price: 120,
    isAddon: true,
    isActive: true,
    sortOrder: 8,
    triggers: 'Palms carrying brown or hanging dead fronds, or visible seed pods.',
  },
  {
    serviceValue: 'edging',
    name: 'Edging',
    description: 'Define clean edges along walkways, driveways, and beds.',
    category: 'maintenance',
    unit: 'visit',
    price: 35,
    isAddon: true,
    isActive: true,
    sortOrder: 9,
    triggers:
      'Grass creeping over walkway, driveway, or bed borders; edges that look soft or undefined.',
  },
]

/** Seeds the default catalog for a tenant that has none. Idempotent. */
export async function seedServicesIfEmpty(env: Env, slug: string): Promise<Service[]> {
  const existing = await listServices(env, slug)
  if (existing.length > 0) return existing
  const created: Service[] = []
  for (const template of DEFAULT_SERVICES) {
    const service: Service = { ...template, id: crypto.randomUUID() }
    await putService(env, slug, service)
    created.push(service)
  }
  return created.sort((a, b) => a.sortOrder - b.sortOrder)
}

/** Admin access is per-tenant: an authenticated user is not automatically an admin. */
export function isTenantAdmin(tenant: Tenant, email: string | undefined | null): boolean {
  if (!email) return false
  const allowed = tenant.adminEmails ?? []
  return allowed.some((e) => e.trim().toLowerCase() === email.trim().toLowerCase())
}

export function assertValidSlug(slug: string): void {
  if (!isValidSlug(slug)) {
    throw new HttpError(
      400,
      'bad_request',
      'Slug must be 3-40 characters, lowercase letters, numbers, and hyphens.',
    )
  }
}
