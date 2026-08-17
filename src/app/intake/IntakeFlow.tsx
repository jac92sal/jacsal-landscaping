import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { SiteFooter } from '../components/SiteFooter'
import { StepIndicator } from '../components/StepIndicator'
import { PropertyStep, ServicesStep, ScheduleStep } from './steps'
import { PhotosStep } from './PhotosStep'
import { AssessmentStep } from './AssessmentStep'
import { DoneStep } from './DoneStep'
import {
  ApiError,
  api,
  clearLeadSession,
  loadLeadSession,
  saveLeadSession,
  type Assessment,
  type IntakeConfig,
  type Lead,
} from '../../lib/api'

type Step = 'property' | 'services' | 'photos' | 'assessment' | 'schedule' | 'done'

const STEP_LABELS = ['Property', 'Services', 'Photos', 'Your Plan', 'Schedule']
const STEP_INDEX: Record<Step, number> = {
  property: 0,
  services: 1,
  photos: 2,
  assessment: 3,
  schedule: 4,
  done: 5,
}

export function IntakeFlow() {
  const params = useParams<{ slug?: string }>()
  // A bare visit to the domain lands on the default tenant rather than a 404.
  const slug = params.slug ?? (import.meta.env.VITE_DEFAULT_TENANT as string) ?? 'jacsal'

  const [config, setConfig] = useState<IntakeConfig | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>('property')
  const [lead, setLead] = useState<Lead | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [assessment, setAssessment] = useState<Assessment | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const result = await api.getConfig(slug)
        if (!cancelled) setConfig(result)
      } catch (err) {
        if (!cancelled) {
          setConfigError(
            err instanceof ApiError
              ? err.message
              : 'We could not load this booking form. Please try again shortly.',
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  // Resume an in-progress intake if the tab was reloaded mid-flow.
  useEffect(() => {
    const saved = loadLeadSession(slug)
    if (!saved) return
    let cancelled = false
    void (async () => {
      try {
        const { lead: existing } = await api.updateLead(slug, saved.leadId, saved.token, {})
        if (cancelled) return
        setLead(existing)
        setToken(saved.token)
        // Never resume into 'done' — a finished booking starts fresh.
        const resumeAt = (existing.status === 'booked' ? 'property' : existing.status) as Step
        if (resumeAt in STEP_INDEX && resumeAt !== 'done') setStep(resumeAt)
      } catch {
        clearLeadSession() // stale or revoked token
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const handleProperty = useCallback(
    async (values: Record<string, unknown>) => {
      if (lead && token) {
        const { lead: updated } = await api.updateLead(slug, lead.id, token, values)
        setLead(updated)
      } else {
        const created = await api.createLead(slug, values)
        setLead(created.lead)
        setToken(created.leadToken)
        saveLeadSession(slug, created.lead.id, created.leadToken)
      }
      setStep('services')
    },
    [lead, token, slug],
  )

  const patch = useCallback(
    async (values: Record<string, unknown>) => {
      if (!lead || !token) return
      const { lead: updated } = await api.updateLead(slug, lead.id, token, values)
      setLead(updated)
    },
    [lead, token, slug],
  )

  if (configError) {
    return (
      <Shell>
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <h2 className="mb-2">This form is unavailable</h2>
          <p className="text-muted-foreground">{configError}</p>
        </div>
      </Shell>
    )
  }

  if (!config) {
    return (
      <Shell>
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Shell>
    )
  }

  return (
    <Shell tenantName={config.tenant.name} tagline={config.tenant.tagline}>
      {step !== 'done' && (
        <div className="mb-10">
          <StepIndicator currentStep={STEP_INDEX[step]} steps={STEP_LABELS} />
        </div>
      )}

      <div className="bg-card rounded-xl p-6 md:p-8 border border-border shadow-sm">
        {step === 'property' && (
          <PropertyStep config={config} initial={lead} onComplete={handleProperty} />
        )}

        {step === 'services' && lead && (
          <ServicesStep
            config={config}
            initial={lead}
            onBack={() => setStep('property')}
            onComplete={async (values) => {
              await patch({ ...values, status: 'photos' })
              setStep('photos')
            }}
          />
        )}

        {step === 'photos' && lead && token && (
          <PhotosStep
            slug={slug}
            lead={lead}
            token={token}
            config={config}
            onBack={() => setStep('services')}
            onLeadChange={setLead}
            onComplete={() => setStep('assessment')}
          />
        )}

        {step === 'assessment' && lead && token && (
          <AssessmentStep
            slug={slug}
            lead={lead}
            token={token}
            assessment={assessment}
            onAssessment={setAssessment}
            onBack={() => setStep('photos')}
            onComplete={async (accepted, declined) => {
              await patch({
                acceptedServices: accepted,
                declinedServices: declined,
                status: 'booking',
              })
              setStep('schedule')
            }}
          />
        )}

        {step === 'schedule' && lead && (
          <ScheduleStep
            config={config}
            onBack={() => setStep('assessment')}
            onComplete={async (date, time) => {
              await patch({ bookingDate: date, bookingTime: time, status: 'booked' })
              clearLeadSession()
              setStep('done')
            }}
          />
        )}

        {step === 'done' && lead && <DoneStep lead={lead} config={config} />}
      </div>
    </Shell>
  )
}

function Shell({
  children,
  tenantName,
  tagline,
}: {
  children: React.ReactNode
  tenantName?: string
  tagline?: string | null
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 py-10 md:py-14 px-4">
        <div className="max-w-3xl mx-auto">
          {tenantName && (
            <div className="text-center mb-10">
              <p className="mb-2 text-xs font-semibold tracking-[0.14em] uppercase text-primary">
                Free Estimate
              </p>
              <h1 className="mb-3">{tenantName}</h1>
              <p className="text-muted-foreground">
                {tagline ?? 'Tell us about your yard and we’ll put together a plan.'}
              </p>
            </div>
          )}
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
