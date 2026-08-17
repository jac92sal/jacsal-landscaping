import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Minus, Plus, RotateCcw, Undo2, MapPin } from 'lucide-react'
import { api, type LatLng } from '../../lib/api'

/**
 * Trace-the-lawn measurement.
 *
 * The customer taps around the edge of their grass on a satellite photo of their
 * own address; we convert those taps to real coordinates and compute the true
 * geodesic area. This is a measurement, not an estimate — which is the whole
 * reason it exists alongside the "roughly how big is it?" text boxes.
 *
 * The satellite image is proxied by the Worker so the Maps key never reaches the
 * browser, and it is requested at a fixed centre and zoom. That fixed framing is
 * what makes the pixel→coordinate maths below valid, so the image must never be
 * panned — zoom changes re-request a fresh, re-centred tile instead.
 */

/** Logical pixel size of the tile the Worker requests. Must match MAP_SIZE. */
const MAP_SIZE = 640
const MIN_ZOOM = 17
const MAX_ZOOM = 21
const TILE = 256

// ---- Web Mercator ----------------------------------------------------------
// Standard slippy-map projection: the world is TILE * 2^zoom pixels square.

function worldSize(zoom: number): number {
  return TILE * Math.pow(2, zoom)
}

function project(point: LatLng, zoom: number): { x: number; y: number } {
  const size = worldSize(zoom)
  const lat = Math.max(-85.05112878, Math.min(85.05112878, point.lat))
  const sin = Math.sin((lat * Math.PI) / 180)
  return {
    x: ((point.lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  }
}

function unproject(x: number, y: number, zoom: number): LatLng {
  const size = worldSize(zoom)
  const lng = (x / size) * 360 - 180
  const n = Math.PI * (1 - (2 * y) / size)
  const lat = (Math.atan(Math.sinh(n)) * 180) / Math.PI
  return { lat, lng }
}

/** Same spherical-excess formula the Worker uses, so the preview never disagrees. */
const EARTH_RADIUS_M = 6378137
const SQM_TO_SQFT = 10.763910416709722

function polygonAreaSqFt(points: LatLng[]): number {
  if (points.length < 3) return 0
  const toRad = (deg: number) => (deg * Math.PI) / 180
  let total = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    total += (toRad(b.lng) - toRad(a.lng)) * (2 + Math.sin(toRad(a.lat)) + Math.sin(toRad(b.lat)))
  }
  return Math.round(Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2) * SQM_TO_SQFT)
}

// ---------------------------------------------------------------------------

interface Props {
  slug: string
  leadId: string
  token: string
  /** Shown while locating so the customer can tell we found the right house. */
  address: string
  onChange: (result: { polygon: LatLng[]; areaSqFt: number; zoom: number } | null) => void
}

type Status = 'locating' | 'ready' | 'not_found' | 'unavailable'

export function LawnTracer({ slug, leadId, token, address, onChange }: Props) {
  const [status, setStatus] = useState<Status>('locating')
  const [center, setCenter] = useState<LatLng | null>(null)
  const [zoom, setZoom] = useState(20)
  const [points, setPoints] = useState<LatLng[]>([])
  const [imageLoading, setImageLoading] = useState(true)
  const frameRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const result = await api.locate(slug, leadId, token)
        if (cancelled) return
        if (result.lat === null || result.lng === null) {
          setStatus('not_found')
          return
        }
        setCenter({ lat: result.lat, lng: result.lng })
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('unavailable')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug, leadId, token])

  const areaSqFt = useMemo(() => polygonAreaSqFt(points), [points])

  // Report upward whenever the shape becomes (or stops being) a real polygon.
  useEffect(() => {
    onChange(points.length >= 3 ? { polygon: points, areaSqFt, zoom } : null)
  }, [points, areaSqFt, zoom, onChange])

  const addPoint = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!center || !frameRef.current) return
      const rect = frameRef.current.getBoundingClientRect()
      // Displayed size varies with the viewport; the maths is in logical pixels.
      const logicalX = ((event.clientX - rect.left) / rect.width) * MAP_SIZE
      const logicalY = ((event.clientY - rect.top) / rect.height) * MAP_SIZE
      const origin = project(center, zoom)
      setPoints((prev) => [
        ...prev,
        unproject(
          origin.x + (logicalX - MAP_SIZE / 2),
          origin.y + (logicalY - MAP_SIZE / 2),
          zoom,
        ),
      ])
    },
    [center, zoom],
  )

  /** Points are stored as coordinates, so a zoom change just re-places them. */
  const screenPoints = useMemo(() => {
    if (!center) return []
    const origin = project(center, zoom)
    return points.map((point) => {
      const projected = project(point, zoom)
      return {
        x: projected.x - origin.x + MAP_SIZE / 2,
        y: projected.y - origin.y + MAP_SIZE / 2,
      }
    })
  }, [points, center, zoom])

  if (status === 'locating') {
    return (
      <Frame>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Finding {address || 'your property'}…
        </div>
      </Frame>
    )
  }

  if (status !== 'ready' || !center) {
    return (
      <Frame>
        <div className="flex items-start gap-3 text-sm">
          <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium">
              {status === 'not_found'
                ? 'We couldn’t find that address on the map'
                : 'Satellite view isn’t available right now'}
            </p>
            <p className="text-muted-foreground">
              No problem — the sizes you typed above are enough, and we’ll confirm on site.
            </p>
          </div>
        </div>
      </Frame>
    )
  }

  const mapUrl = api.mapUrl(slug, leadId, token, zoom)
  const closed = points.length >= 3

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="mb-1">Trace your lawn</h3>
          <p className="text-sm text-muted-foreground">
            Tap around the edge of the grass. Three taps or more and we’ll measure it.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            label="Zoom out"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
            disabled={zoom <= MIN_ZOOM}
          >
            <Minus className="w-4 h-4" />
          </IconButton>
          <IconButton
            label="Zoom in"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
            disabled={zoom >= MAX_ZOOM}
          >
            <Plus className="w-4 h-4" />
          </IconButton>
          <IconButton
            label="Undo last point"
            onClick={() => setPoints((p) => p.slice(0, -1))}
            disabled={points.length === 0}
          >
            <Undo2 className="w-4 h-4" />
          </IconButton>
          <IconButton
            label="Start over"
            onClick={() => setPoints([])}
            disabled={points.length === 0}
          >
            <RotateCcw className="w-4 h-4" />
          </IconButton>
        </div>
      </div>

      <div
        ref={frameRef}
        onClick={addPoint}
        className="relative w-full aspect-square rounded-xl overflow-hidden border border-border cursor-crosshair select-none bg-muted"
      >
        <img
          key={mapUrl}
          src={mapUrl}
          alt={`Satellite view of ${address}`}
          draggable={false}
          onLoad={() => setImageLoading(false)}
          onError={() => setStatus('unavailable')}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* viewBox is in logical map pixels, so the overlay scales with the image. */}
        <svg
          viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {screenPoints.length > 1 &&
            (closed ? (
              <polygon
                points={screenPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="rgba(47,122,62,0.35)"
                stroke="#2F7A3E"
                strokeWidth={3}
              />
            ) : (
              <polyline
                points={screenPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#2F7A3E"
                strokeWidth={3}
              />
            ))}
          {screenPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={7} fill="#fff" stroke="#2F7A3E" strokeWidth={3} />
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-muted-foreground">
          {points.length === 0
            ? 'Tap the first corner of your lawn'
            : closed
              ? `${points.length} points`
              : `${points.length} point${points.length === 1 ? '' : 's'} — ${3 - points.length} more to measure`}
        </span>
        {closed && (
          <span className="font-medium">
            ≈ {areaSqFt.toLocaleString()} sq ft
          </span>
        )}
      </div>
    </div>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border p-5">{children}</div>
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}
