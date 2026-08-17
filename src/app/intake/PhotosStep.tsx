import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Trash2, Upload, AlertTriangle } from 'lucide-react'
import { api, type IntakeConfig, type LatLng, type Lead, type Photo } from '../../lib/api'
import { LawnTracer } from './LawnTracer'

/**
 * Guided prompts rather than a bare file picker. Naming the shot does two jobs:
 * people take more useful photos, and each image reaches the vision model
 * labelled with the area it shows instead of leaving the model to infer it.
 */
const PROMPTS = [
  { area: 'front', label: 'Front yard', hint: 'Stand at the curb and capture the whole front.' },
  { area: 'back', label: 'Back yard', hint: 'A wide shot from the back door or patio.' },
  { area: 'problem', label: 'Problem areas', hint: 'Anything specific that’s bothering you.' },
  { area: 'other', label: 'Anything else', hint: 'Side yards, slopes, planters.' },
]

/**
 * Long-edge cap for uploads. Comfortably inside the model's high-resolution
 * tier while cutting a modern phone photo (4000px+) to a fraction of its size —
 * which reduces vision cost, R2 storage, and upload time on cell data all at
 * once. Well above what's needed to see an overgrown hedge.
 */
const MAX_EDGE = 1568
const JPEG_QUALITY = 0.85

/**
 * Downscale in the browser before upload.
 *
 * HEIC is passed through untouched: most browsers can't decode it to a canvas,
 * and a failed re-encode would lose the photo entirely. The Worker stores it and
 * the admin can view it; it just sits out of the vision call.
 */
async function prepareForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/heic' || file.type === 'image/heif') {
    return file
  }
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    // Any decode failure: send the original rather than dropping the photo.
    return file
  }
}

const inputClass =
  'w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring'

export function PhotosStep({
  slug,
  lead,
  token,
  config,
  onBack,
  onLeadChange,
  onComplete,
}: {
  slug: string
  lead: Lead
  token: string
  config: IntakeConfig
  onBack: () => void
  onLeadChange: (lead: Lead) => void
  onComplete: () => void
}) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  const [measurements, setMeasurements] = useState({
    clientLotSqft: lead.measurements.clientLotSqft?.toString() ?? '',
    clientTurfSqft: lead.measurements.clientTurfSqft?.toString() ?? '',
    treeCount: lead.measurements.treeCount?.toString() ?? '',
    fenceLengthFt: lead.measurements.fenceLengthFt?.toString() ?? '',
  })
  const [unsure, setUnsure] = useState(false)
  const [trace, setTrace] = useState<{ polygon: LatLng[]; areaSqFt: number; zoom: number } | null>(
    null,
  )

  useEffect(() => {
    void api
      .listPhotos(slug, lead.id, token)
      .then((r) => setPhotos(r.photos))
      .catch(() => setPhotos([]))
  }, [slug, lead.id, token])

  const handleFiles = useCallback(
    async (area: string, files: FileList | null) => {
      if (!files?.length) return
      setUploading(area)
      setError(null)
      try {
        for (const file of Array.from(files)) {
          const prepared = await prepareForUpload(file)
          const form = new FormData()
          form.append('file', prepared)
          form.append('area', area)
          const { photo } = await api.uploadPhoto(slug, lead.id, token, form)
          setPhotos((prev) => [...prev, photo])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That photo could not be uploaded.')
      } finally {
        setUploading(null)
      }
    },
    [slug, lead.id, token],
  )

  const remove = async (photoId: string) => {
    try {
      await api.deletePhoto(slug, lead.id, token, photoId)
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that photo.')
    }
  }

  const submit = async (skipped: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const { lead: measured } = await api.measure(slug, lead.id, token, {
        clientLotSqft: unsure ? null : num(measurements.clientLotSqft),
        clientTurfSqft: unsure ? null : num(measurements.clientTurfSqft),
        treeCount: num(measurements.treeCount),
        fenceLengthFt: num(measurements.fenceLengthFt),
        // A traced boundary is a measurement; the typed numbers are a recollection.
        // Both are sent, and the Worker decides which to quote from and flags any
        // meaningful disagreement rather than silently picking one.
        polygon: trace?.polygon ?? null,
        zoom: trace?.zoom ?? null,
      })
      const { lead: updated } = await api.updateLead(slug, lead.id, token, {
        photosCompleted: !skipped && photos.length > 0,
        photosSkipped: skipped,
        status: 'assessment',
      })
      onLeadChange({ ...updated, measurements: measured.measurements })
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your details.')
    } finally {
      setBusy(false)
    }
  }

  const byArea = (area: string) => photos.filter((p) => p.area === area)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2">Show us the yard</h2>
        <p className="text-muted-foreground">
          Photos are how we build your plan — they let us spot work you might not think to ask for,
          so the estimate is accurate before anyone drives out.
        </p>
      </div>

      <div className="space-y-4">
        {PROMPTS.map((prompt) => {
          const taken = byArea(prompt.area)
          return (
            <div key={prompt.area} className="border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="font-medium">{prompt.label}</div>
                  <p className="text-sm text-muted-foreground">{prompt.hint}</p>
                </div>
                <button
                  type="button"
                  onClick={() => inputs.current[prompt.area]?.click()}
                  disabled={uploading !== null}
                  className="shrink-0 px-4 py-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading === prompt.area ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  Add
                </button>
              </div>

              <input
                ref={(el) => {
                  inputs.current[prompt.area] = el
                }}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => {
                  void handleFiles(prompt.area, e.target.files)
                  e.target.value = ''
                }}
              />

              {taken.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {taken.map((photo) => (
                    <div key={photo.id} className="relative group aspect-square">
                      <img
                        src={`${photo.url}?t=${encodeURIComponent(token)}`}
                        alt={photo.caption ?? prompt.label}
                        loading="lazy"
                        className="w-full h-full object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => void remove(photo.id)}
                        aria-label="Remove photo"
                        className="absolute top-1 right-1 p-1.5 rounded-md bg-background/90 border border-border opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ---- Measurements ---- */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <div>
          <h3 className="mb-1">Rough sizes</h3>
          <p className="text-sm text-muted-foreground">
            Estimates are fine — we confirm on site.
            {config.mapsEnabled && ' Or trace your lawn on the map below and we’ll measure it exactly.'}
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={unsure}
            onChange={(e) => setUnsure(e.target.checked)}
            className="w-4 h-4 accent-[var(--primary)]"
          />
          <span className="text-sm">I’m not sure — work it out from the photos and address</span>
        </label>

        {!unsure && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm">Lawn / turf area (sq ft)</label>
              <input
                className={inputClass}
                inputMode="numeric"
                value={measurements.clientTurfSqft}
                onChange={(e) =>
                  setMeasurements((m) => ({ ...m, clientTurfSqft: e.target.value }))
                }
                placeholder="1500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm">Total lot size (sq ft)</label>
              <input
                className={inputClass}
                inputMode="numeric"
                value={measurements.clientLotSqft}
                onChange={(e) => setMeasurements((m) => ({ ...m, clientLotSqft: e.target.value }))}
                placeholder="6000"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm">Number of trees</label>
              <input
                className={inputClass}
                inputMode="numeric"
                value={measurements.treeCount}
                onChange={(e) => setMeasurements((m) => ({ ...m, treeCount: e.target.value }))}
                placeholder="3"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm">Fence / hedge line (ft)</label>
              <input
                className={inputClass}
                inputMode="numeric"
                value={measurements.fenceLengthFt}
                onChange={(e) => setMeasurements((m) => ({ ...m, fenceLengthFt: e.target.value }))}
                placeholder="60"
              />
            </div>
          </div>
        )}
      </div>

      {config.mapsEnabled && lead.serviceAddress && (
        <div className="border border-border rounded-xl p-5">
          <LawnTracer
            slug={slug}
            leadId={lead.id}
            token={token}
            address={lead.serviceAddress}
            onChange={setTrace}
          />
          {trace && (
            <p className="mt-3 text-sm text-primary">
              We'll use {trace.areaSqFt.toLocaleString()} sq ft from your tracing.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => void submit(false)}
          disabled={busy || photos.length === 0}
          className="flex-1 min-w-[200px] px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Build my plan
        </button>
      </div>

      {/* An escape hatch rather than a hard wall: someone at work or without the
          yard in front of them still becomes a lead, just a manual one. */}
      <button
        type="button"
        onClick={() => void submit(true)}
        disabled={busy}
        className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 disabled:opacity-50"
      >
        I’ll send photos later — have someone contact me instead
      </button>
    </div>
  )
}

function num(value: string): number | null {
  const parsed = Number(value.replace(/[^0-9.]/g, ''))
  return isFinite(parsed) && parsed > 0 ? parsed : null
}
