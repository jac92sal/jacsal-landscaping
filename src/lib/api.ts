/**
 * Client for the jacsal-intake Worker API.
 *
 * Same-origin: the SPA and the Worker are one deployment, so there is no base
 * URL and no CORS. Customer requests carry the opaque lead token; staff requests
 * ride the HttpOnly session cookie the Worker sets, which JS never touches.
 */

export interface TenantConfig {
  slug: string
  name: string
  tagline: string | null
  logoUrl: string | null
  primaryColor: string | null
  contactEmail: string | null
  contactPhone: string | null
  serviceAreas: string[]
  timeSlots: string[]
}

export interface ServiceDto {
  id: string
  serviceValue: string
  name: string
  description: string
  category: string
  unit: string
  price: number
  isAddon: boolean
}

export interface IntakeConfig {
  tenant: TenantConfig
  services: ServiceDto[]
  mapsEnabled: boolean
  parcelLookupEnabled: boolean
}

export interface Measurements {
  clientLotSqft: number | null
  clientTurfSqft: number | null
  parcelApn: string | null
  parcelLotSqft: number | null
  parcelZone: string | null
  parcelSource: string | null
  tracedTurfSqft: number | null
  tracedPolygon: { lat: number; lng: number }[] | null
  turfSqft: number | null
  turfSqftSource: string | null
  flag: string | null
  treeCount: number | null
  shrubCount: number | null
  fenceLengthFt: number | null
}

export interface Lead {
  id: string
  tenantSlug: string
  createdAt: number
  updatedAt: number
  name: string
  email: string
  phone: string | null
  serviceAddress: string | null
  city: string | null
  postalCode: string | null
  propertyType: string | null
  areas: string[]
  gateAccess: string | null
  petsOnProperty: boolean
  accessNotes: string | null
  requestedServices: string[]
  cadence: string | null
  notes: string | null
  measurements: Measurements
  photosCompleted: boolean
  photosSkipped: boolean
  assessmentCompleted: boolean
  acceptedServices: string[]
  declinedServices: string[]
  bookingDate: string | null
  bookingTime: string | null
  status: string
}

export interface Photo {
  id: string
  area: string
  caption: string | null
  fileName: string | null
  fileSize: number | null
  mimeType: string | null
  createdAt: number
  url: string
}

export interface Observation {
  area: string
  condition: string
  detail: string
  severity: 'low' | 'medium' | 'high'
}

/** A suggestion after the Worker attaches catalog pricing. */
export interface SuggestedService {
  serviceValue: string
  name: string
  description: string
  price: number
  unit: string
  reason: string
  confidence: 'low' | 'medium' | 'high'
}

export interface Assessment {
  status: 'ok' | 'no_key' | 'no_photos' | 'refused' | 'error'
  error: string | null
  observations: Observation[]
  recommended: SuggestedService[]
  addons: SuggestedService[]
  photoQualityIssues: string[]
  photoCount: number
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(init.headers ?? {}),
    },
  })

  let payload: Record<string, unknown> | null = null
  try {
    payload = (await response.json()) as Record<string, unknown>
  } catch {
    payload = null
  }

  if (!response.ok || payload?.ok === false) {
    throw new ApiError(
      response.status,
      String(payload?.error ?? 'request_failed'),
      String(payload?.message ?? 'Something went wrong. Please try again.'),
    )
  }
  return payload as T
}

// ---- Customer flow --------------------------------------------------------

const leadHeaders = (token: string) => ({ 'x-lead-token': token })

export const api = {
  getConfig: (slug: string) => request<IntakeConfig>(`/api/t/${slug}/config`),

  createLead: (slug: string, body: Record<string, unknown>) =>
    request<{ lead: Lead; leadToken: string }>(`/api/t/${slug}/leads`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateLead: (slug: string, id: string, token: string, patch: Record<string, unknown>) =>
    request<{ lead: Lead }>(`/api/t/${slug}/leads/${id}`, {
      method: 'PATCH',
      headers: leadHeaders(token),
      body: JSON.stringify(patch),
    }),

  listPhotos: (slug: string, id: string, token: string) =>
    request<{ photos: Photo[] }>(`/api/t/${slug}/leads/${id}/photos`, {
      headers: leadHeaders(token),
    }),

  uploadPhoto: (slug: string, id: string, token: string, form: FormData) =>
    request<{ photo: Photo }>(`/api/t/${slug}/leads/${id}/photos`, {
      method: 'POST',
      headers: leadHeaders(token),
      body: form,
    }),

  deletePhoto: (slug: string, id: string, token: string, photoId: string) =>
    request<{ deleted: boolean }>(`/api/t/${slug}/leads/${id}/photos/${photoId}`, {
      method: 'DELETE',
      headers: leadHeaders(token),
    }),

  /** Resolves client-entered numbers, the traced polygon, and parcel data. */
  measure: (slug: string, id: string, token: string, body: Record<string, unknown>) =>
    request<{ lead: Lead; parcelAvailable: boolean }>(`/api/t/${slug}/leads/${id}/measure`, {
      method: 'POST',
      headers: leadHeaders(token),
      body: JSON.stringify(body),
    }),

  assess: (slug: string, id: string, token: string) =>
    request<{ assessment: Assessment }>(`/api/t/${slug}/leads/${id}/assess`, {
      method: 'POST',
      headers: leadHeaders(token),
    }),
}

// ---- Staff ----------------------------------------------------------------

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

export const adminApi = {
  requestCode: (email: string) =>
    request<{ sent: boolean }>('/api/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verify: (email: string, code: string) =>
    request<{ user: AuthUser }>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  me: () => request<{ user: AuthUser | null }>('/api/auth/me'),

  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),

  listTenants: () =>
    request<{ tenants: TenantAdminDto[]; canBootstrap: boolean }>('/api/admin/tenants'),

  createTenant: (body: Record<string, unknown>) =>
    request<{ tenant: TenantAdminDto }>('/api/admin/tenants', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateTenant: (slug: string, body: Record<string, unknown>) =>
    request<{ tenant: TenantAdminDto }>(`/api/admin/tenants/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  listServices: (slug: string) =>
    request<{ services: AdminService[] }>(`/api/admin/tenants/${slug}/services`),

  createService: (slug: string, body: Record<string, unknown>) =>
    request<{ service: AdminService }>(`/api/admin/tenants/${slug}/services`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateService: (slug: string, id: string, body: Record<string, unknown>) =>
    request<{ service: AdminService }>(`/api/admin/tenants/${slug}/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteService: (slug: string, id: string) =>
    request<{ deleted: boolean }>(`/api/admin/tenants/${slug}/services/${id}`, {
      method: 'DELETE',
    }),

  listLeads: (slug: string) => request<{ leads: Lead[] }>(`/api/admin/tenants/${slug}/leads`),

  getLead: (slug: string, id: string) =>
    request<{ lead: Lead; photos: Photo[]; assessments: AdminAssessment[] }>(
      `/api/admin/tenants/${slug}/leads/${id}`,
    ),
}

export interface TenantAdminDto extends TenantConfig {
  assessmentModel?: string
  parcelLookupEnabled?: boolean
  adminEmails?: string[]
}

export interface AdminService extends ServiceDto {
  isActive: boolean
  sortOrder: number
  /** Fed to the vision model verbatim as the "suggest when you see…" vocabulary. */
  triggers?: string
}

export interface AdminAssessment {
  id: string
  createdAt: number
  status: string
  error: string | null
  model: string | null
  photoCount: number
  observations: Observation[]
  recommendedServices: { service_value: string; reason: string; confidence: string }[]
  addonServices: { service_value: string; reason: string; confidence: string }[]
  crewNotes: string | null
  photoQualityIssues: string[]
  rejectedServiceValues: string[]
  inputTokens: number | null
  outputTokens: number | null
}

// ---- Local persistence -----------------------------------------------------

/**
 * The lead token is shown exactly once. Persisting it lets someone finish an
 * intake after closing the tab. sessionStorage rather than localStorage: it is
 * scoped to the tab and cleared on close, which suits a shared family computer.
 */
const TOKEN_KEY = 'jacsal-intake-lead'

export function saveLeadSession(slug: string, leadId: string, token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ slug, leadId, token }))
  } catch {
    /* private browsing — the flow still works, it just won't resume */
  }
}

export function loadLeadSession(slug: string): { leadId: string; token: string } | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { slug: string; leadId: string; token: string }
    return parsed.slug === slug ? { leadId: parsed.leadId, token: parsed.token } : null
  } catch {
    return null
  }
}

export function clearLeadSession(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}
