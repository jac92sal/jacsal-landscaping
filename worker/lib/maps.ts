/**
 * Google Maps Platform integration: geocoding, and a satellite-image proxy the
 * customer traces their lawn on.
 *
 * The API key never reaches the browser. Both calls are made from the Worker
 * with the Secrets Store binding, and the image is streamed straight through —
 * never written to R2 or cached anywhere durable, since Google's terms allow
 * displaying imagery but not storing it.
 *
 * Note on what this does and does not provide: Google has no parcel data. There
 * is no APN and no legal lot size here — that lives with county assessors. What
 * it gives us is a scaled overhead image, which is enough to measure the thing
 * that actually matters for a quote: the lawn itself.
 */
import { HttpError } from './http'

export interface GeocodeResult {
  lat: number
  lng: number
  formatted: string
  /** Google's own confidence hint — 'ROOFTOP' means it resolved to a building. */
  locationType: string
}

async function mapsKey(env: Env): Promise<string | null> {
  try {
    const key = await env.GOOGLE_MAPS_API_KEY.get()
    return key || null
  } catch {
    return null
  }
}

export async function hasMaps(env: Env): Promise<boolean> {
  return (await mapsKey(env)) !== null
}

export async function geocode(env: Env, address: string): Promise<GeocodeResult | null> {
  const key = await mapsKey(env)
  if (!key) return null

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address)
  url.searchParams.set('key', key)

  const response = await fetch(url.toString())
  if (!response.ok) {
    console.error(`[maps] geocode HTTP ${response.status}`)
    return null
  }

  const body = (await response.json()) as {
    status: string
    results?: {
      formatted_address: string
      geometry: { location: { lat: number; lng: number }; location_type: string }
    }[]
  }

  // ZERO_RESULTS is a normal outcome for a typo'd address, not an error.
  if (body.status !== 'OK' || !body.results?.length) {
    if (body.status !== 'ZERO_RESULTS') console.error(`[maps] geocode status ${body.status}`)
    return null
  }

  const top = body.results[0]
  return {
    lat: top.geometry.location.lat,
    lng: top.geometry.location.lng,
    formatted: top.formatted_address,
    locationType: top.geometry.location_type,
  }
}

/** Zoom range the tracer allows. 21 is the deepest Google serves for most areas. */
export const MIN_ZOOM = 17
export const MAX_ZOOM = 21
/**
 * 20, not 19. At zoom 19 the 640px tile spans ~160 m, so a typical suburban lot
 * occupies barely a seventh of the frame and the customer is tracing a postage
 * stamp. Zoom 20 spans ~80 m, which frames one property.
 */
export const DEFAULT_ZOOM = 20
/** Logical pixel size of the tracing canvas. `scale=2` doubles actual pixels. */
export const MAP_SIZE = 640

export function clampZoom(value: unknown): number {
  const zoom = Math.round(Number(value))
  if (!isFinite(zoom)) return DEFAULT_ZOOM
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

/**
 * Fetch the satellite tile for a position and stream it back.
 *
 * `scale=2` is requested so the image is crisp on phone screens, while the
 * coordinate math on the client stays in 640-pixel logical space.
 */
export async function satelliteImage(
  env: Env,
  lat: number,
  lng: number,
  zoom: number,
): Promise<Response> {
  const key = await mapsKey(env)
  if (!key) throw new HttpError(503, 'maps_unavailable', 'Satellite imagery is not configured.')

  const url = new URL('https://maps.googleapis.com/maps/api/staticmap')
  url.searchParams.set('center', `${lat},${lng}`)
  url.searchParams.set('zoom', String(zoom))
  url.searchParams.set('size', `${MAP_SIZE}x${MAP_SIZE}`)
  url.searchParams.set('scale', '2')
  url.searchParams.set('maptype', 'satellite')
  url.searchParams.set('key', key)

  const response = await fetch(url.toString())
  if (!response.ok) {
    console.error(`[maps] staticmap HTTP ${response.status}`)
    throw new HttpError(502, 'maps_failed', 'Could not load the satellite view.')
  }

  return new Response(response.body, {
    headers: {
      'content-type': response.headers.get('content-type') ?? 'image/png',
      // Private and short-lived: imagery may be displayed but not stored, and
      // the URL is scoped to one customer's property.
      'cache-control': 'private, max-age=600',
    },
  })
}
