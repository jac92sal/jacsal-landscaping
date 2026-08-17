import { useEffect, useState } from 'react'
import { Check, Eye, Loader2, Plus, AlertTriangle, Sparkles } from 'lucide-react'
import { api, type Assessment, type Lead, type SuggestedService } from '../../lib/api'

/**
 * The plan screen, and the upsell.
 *
 * No prices anywhere on this screen by design: the assessment states what the
 * yard needs and why, and the team follows up with pricing. That keeps a
 * photo-derived recommendation from reading as a committed quote.
 */
export function AssessmentStep({
  slug,
  lead,
  token,
  assessment,
  onAssessment,
  onBack,
  onComplete,
}: {
  slug: string
  lead: Lead
  token: string
  assessment: Assessment | null
  onAssessment: (assessment: Assessment) => void
  onBack: () => void
  onComplete: (accepted: string[], declined: string[]) => Promise<void>
}) {
  const [loading, setLoading] = useState(!assessment)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (assessment) return
    let cancelled = false
    void (async () => {
      try {
        const { assessment: result } = await api.assess(slug, lead.id, token)
        if (cancelled) return
        onAssessment(result)
        // Everything the yard needs starts selected; add-ons start unselected so
        // an accepted add-on is a real signal rather than an un-noticed default.
        setAccepted(new Set(result.recommended.map((s) => s.serviceValue)))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'We could not review your photos.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [assessment, slug, lead.id, token, onAssessment])

  const toggle = (value: string) =>
    setAccepted((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const all = [
        ...(assessment?.recommended ?? []),
        ...(assessment?.addons ?? []),
      ].map((s) => s.serviceValue)
      const acceptedList = [...accepted]
      const declined = all.filter((v) => !accepted.has(v))
      await onComplete(acceptedList, declined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your plan.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <div>
          <p className="font-medium">Looking over your photos…</p>
          <p className="text-sm text-muted-foreground">This usually takes a few seconds.</p>
        </div>
      </div>
    )
  }

  // Degraded paths are first-class: the customer still gets to book, they just
  // get a human review instead of an instant plan.
  if (error || !assessment || assessment.status !== 'ok') {
    const message =
      assessment?.status === 'no_photos'
        ? 'No problem — we’ll review your property when we visit.'
        : (assessment?.error ??
          error ??
          'We couldn’t review the photos automatically, so a person will look at them.')
    return (
      <div className="space-y-6">
        <div>
          <h2 className="mb-2">We’ll take it from here</h2>
          <p className="text-muted-foreground">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Continue to scheduling
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2">Here’s what we noticed</h2>
        <p className="text-muted-foreground">
          Based on {assessment.photoCount} photo{assessment.photoCount === 1 ? '' : 's'} of your
          property. Pricing comes with your confirmation — nothing here is a final quote.
        </p>
      </div>

      {assessment.observations.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/40 p-5">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium">
            <Eye className="w-4 h-4 text-primary" />
            What we saw
          </div>
          <ul className="space-y-2">
            {assessment.observations.map((obs, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                    obs.severity === 'high'
                      ? 'bg-destructive'
                      : obs.severity === 'medium'
                        ? 'bg-primary'
                        : 'bg-muted-foreground'
                  }`}
                />
                <span>
                  <span className="font-medium capitalize">{obs.area}</span> — {obs.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {assessment.recommended.length > 0 && (
        <section className="space-y-3">
          <h3>Your plan</h3>
          {assessment.recommended.map((service) => (
            <ServiceCard
              key={service.serviceValue}
              service={service}
              selected={accepted.has(service.serviceValue)}
              onToggle={() => toggle(service.serviceValue)}
            />
          ))}
        </section>
      )}

      {assessment.addons.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3>Worth adding while we’re there</h3>
          </div>
          <p className="text-sm text-muted-foreground -mt-1">
            Things your photos showed that you didn’t ask about. Add any that make sense.
          </p>
          {assessment.addons.map((service) => (
            <ServiceCard
              key={service.serviceValue}
              service={service}
              selected={accepted.has(service.serviceValue)}
              onToggle={() => toggle(service.serviceValue)}
              isAddon
            />
          ))}
        </section>
      )}

      {assessment.recommended.length === 0 && assessment.addons.length === 0 && (
        <p className="text-muted-foreground">
          Your yard looks well maintained — nothing beyond what you already asked for stood out.
        </p>
      )}

      {assessment.photoQualityIssues.length > 0 && (
        <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 mb-1 text-foreground">
            <AlertTriangle className="w-4 h-4" />
            A couple of photos were hard to read
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {assessment.photoQualityIssues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Continue to scheduling
        </button>
      </div>
    </div>
  )
}

function ServiceCard({
  service,
  selected,
  onToggle,
  isAddon,
}: {
  service: SuggestedService
  selected: boolean
  onToggle: () => void
  isAddon?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`w-full text-left rounded-xl border p-4 transition-colors ${
        selected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
            selected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
          }`}
        >
          {selected ? <Check className="w-3.5 h-3.5" /> : isAddon ? <Plus className="w-3.5 h-3.5" /> : null}
        </span>
        <div className="min-w-0">
          <div className="font-medium">{service.name}</div>
          <p className="text-sm text-muted-foreground mt-0.5">{service.reason}</p>
        </div>
      </div>
    </button>
  )
}
