/**
 * Measurement resolution.
 *
 * Two independent sources, never collapsed into a single opaque number:
 *   client  — what the customer typed
 *   traced  — exact geodesic area of a polygon the customer drew on satellite
 *
 * There is deliberately no parcel source. Google Maps Platform has no assessor
 * data — no APN, no legal lot size — and for a landscaping quote that matters
 * less than it sounds: a lot includes the house, driveway, and hardscape, so it
 * was never the number being quoted. The traced lawn boundary is. The parcel_*
 * columns remain on the table so county data can be layered in later without a
 * migration, and resolveMeasurements still accepts a lot size for cross-checking.
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
 * Pick the turf figure to quote from, and say why.
 *
 * Priority is traced → client, because a drawn boundary is measured while a
 * typed number is recalled. A lot size, wherever it comes from, is deliberately
 * NOT used as turf: it includes the house, driveway, and hardscape, so treating
 * it as lawn would systematically over-quote. It sanity-checks instead.
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
