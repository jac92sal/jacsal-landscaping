/**
 * Measurement resolution.
 *
 * Three independent sources, never collapsed into a single opaque number:
 *   client  — what the customer typed
 *   parcel  — authoritative lot data from a parcel lookup
 *   traced  — exact geodesic area of a polygon the customer drew on satellite
 *
 * Ground photos are deliberately NOT a source here. A handheld photo has no
 * scale reference, so anything derived from one would be a guess presented as a
 * measurement. Overhead imagery is different: at a known zoom it has a real
 * meters-per-pixel, which is why a traced polygon is exact rather than inferred.
 */

const EARTH_RADIUS_M = 6378137
const SQM_TO_SQFT = 10.763910416709722

export interface LatLng {
  lat: number
  lng: number
}

export interface ParcelInfo {
  apn: string | null
  lotSqft: number | null
  zone: string | null
  source: string
}

export type TurfSource = 'client' | 'parcel' | 'traced'

export interface ResolvedMeasurements {
  turfSqft: number | null
  turfSqftSource: TurfSource | null
  /** Human-readable note when sources disagree. Surfaced to the admin, not hidden. */
  flag: string | null
}

/**
 * Geodesic area of a closed polygon, in square feet.
 *
 * Spherical-excess formula (the same one Google Maps' computeSignedArea uses).
 * Planar shoelace would be wrong here: a degree of longitude is ~0.79 of a
 * degree of latitude at San Diego's latitude, so treating lat/lng as cartesian
 * understates area by roughly 20% locally, and worse further from the equator.
 */
export function polygonAreaSqFt(points: LatLng[]): number {
  if (!Array.isArray(points) || points.length < 3) return 0

  const toRad = (deg: number) => (deg * Math.PI) / 180
  let total = 0

  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    if (!isFinite(a?.lat) || !isFinite(a?.lng) || !isFinite(b?.lat) || !isFinite(b?.lng)) return 0
    total += (toRad(b.lng) - toRad(a.lng)) * (2 + Math.sin(toRad(a.lat)) + Math.sin(toRad(b.lat)))
  }

  const areaSqM = Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2)
  return Math.round(areaSqM * SQM_TO_SQFT)
}

/** Reject nonsense before it reaches the area math. */
export function isValidPolygon(points: unknown): points is LatLng[] {
  if (!Array.isArray(points) || points.length < 3 || points.length > 500) return false
  return points.every(
    (p) =>
      p &&
      typeof p === 'object' &&
      typeof (p as LatLng).lat === 'number' &&
      typeof (p as LatLng).lng === 'number' &&
      Math.abs((p as LatLng).lat) <= 90 &&
      Math.abs((p as LatLng).lng) <= 180,
  )
}

/**
 * Address → parcel record (APN, lot size, zoning).
 *
 * NOT WIRED YET — returns null so callers degrade to trace-only measurement.
 *
 * The data exists: `adu-san-diego-api` and its D1 (`adu-san-diego`) already
 * resolve address → apn / lot_sqft / zone for San Diego. Reaching into that
 * database directly from this Worker would couple two apps through storage,
 * which the house rules rule out, and calling it over public HTTP is also out.
 * The correct wiring is one of:
 *   (a) add a `ParcelService` WorkerEntrypoint to adu-san-diego-api and service-
 *       bind it here — cheapest, but puts a shared capability inside an app; or
 *   (b) extract a `parcel-service` Worker owning the parcel data, service-bound
 *       by both apps — correct if anything else will ever need parcel data.
 * That's an architecture decision, so it is being raised rather than improvised.
 */
export async function lookupParcel(
  _env: Env,
  _address: string,
  _city?: string | null,
): Promise<ParcelInfo | null> {
  return null
}

/**
 * Pick the turf figure to quote from, and say why.
 *
 * Priority is traced → client, because a drawn boundary is measured while a
 * typed number is recalled. Parcel lot size is deliberately NOT used as turf:
 * a lot includes the house, driveway, and hardscape, so treating it as lawn
 * would systematically over-quote. It is used to sanity-check instead.
 */
export function resolveMeasurements(input: {
  clientTurfSqft?: number | null
  tracedTurfSqft?: number | null
  clientLotSqft?: number | null
  parcelLotSqft?: number | null
}): ResolvedMeasurements {
  const { clientTurfSqft, tracedTurfSqft, clientLotSqft, parcelLotSqft } = input
  const lot = parcelLotSqft ?? clientLotSqft ?? null

  let turfSqft: number | null = null
  let turfSqftSource: TurfSource | null = null

  if (isPositive(tracedTurfSqft)) {
    turfSqft = tracedTurfSqft
    turfSqftSource = 'traced'
  } else if (isPositive(clientTurfSqft)) {
    turfSqft = clientTurfSqft
    turfSqftSource = 'client'
  }

  const notes: string[] = []

  // Turf larger than the whole parcel is impossible — surface it loudly.
  if (isPositive(turfSqft) && isPositive(lot) && turfSqft > lot) {
    notes.push(
      `Turf area (${fmt(turfSqft)} sq ft) exceeds the lot size (${fmt(lot)} sq ft) — one of the two is wrong.`,
    )
  }

  // Both sources present and far apart: trust the trace, but say so.
  if (isPositive(tracedTurfSqft) && isPositive(clientTurfSqft)) {
    const diff = Math.abs(tracedTurfSqft - clientTurfSqft)
    const ratio = diff / Math.max(tracedTurfSqft, clientTurfSqft)
    if (ratio > 0.35) {
      notes.push(
        `Customer estimated ${fmt(clientTurfSqft)} sq ft but the traced area is ${fmt(tracedTurfSqft)} sq ft (${Math.round(ratio * 100)}% apart). Using the traced figure.`,
      )
    }
  }

  // Parcel disagrees with what they typed for the lot.
  if (isPositive(parcelLotSqft) && isPositive(clientLotSqft)) {
    const ratio = Math.abs(parcelLotSqft - clientLotSqft) / Math.max(parcelLotSqft, clientLotSqft)
    if (ratio > 0.3) {
      notes.push(
        `Customer gave a lot size of ${fmt(clientLotSqft)} sq ft; county records show ${fmt(parcelLotSqft)} sq ft.`,
      )
    }
  }

  return { turfSqft, turfSqftSource, flag: notes.length ? notes.join(' ') : null }
}

function isPositive(n: number | null | undefined): n is number {
  return typeof n === 'number' && isFinite(n) && n > 0
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}
