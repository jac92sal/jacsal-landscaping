import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { BookingCalendar } from '../components/BookingCalendar'
import type { IntakeConfig, Lead } from '../../lib/api'

const inputClass =
  'w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring'

const AREAS = [
  { value: 'front', label: 'Front yard' },
  { value: 'back', label: 'Back yard' },
  { value: 'side', label: 'Side yard' },
  { value: 'full', label: 'Whole property' },
]

const CADENCES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'one-time', label: 'One-time visit' },
]

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="block">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------

export function PropertyStep({
  config,
  initial,
  onComplete,
}: {
  config: IntakeConfig
  initial: Lead | null
  onComplete: (values: Record<string, unknown>) => Promise<void>
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    serviceAddress: initial?.serviceAddress ?? '',
    city: initial?.city ?? '',
    postalCode: initial?.postalCode ?? '',
    propertyType: initial?.propertyType ?? 'residential',
    gateAccess: initial?.gateAccess ?? '',
    accessNotes: initial?.accessNotes ?? '',
  })
  const [areas, setAreas] = useState<string[]>(initial?.areas ?? [])
  const [pets, setPets] = useState(initial?.petsOnProperty ?? false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const valid = form.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onComplete({ ...form, areas, petsOnProperty: pets })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your details.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h2 className="mb-2">Your property</h2>
        <p className="text-muted-foreground">
          Where are we working, and how do we get in?
          {config.tenant.serviceAreas.length > 0 && (
            <> We currently serve {config.tenant.serviceAreas.join(', ')}.</>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Name" required>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Your full name"
            required
          />
        </Field>
        <Field label="Email" required>
          <input
            className={inputClass}
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="you@email.com"
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Phone">
          <input
            className={inputClass}
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="(619) 555-0123"
          />
        </Field>
        <Field label="Property type">
          <select
            className={inputClass}
            value={form.propertyType}
            onChange={(e) => set('propertyType', e.target.value)}
          >
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
        </Field>
      </div>

      <Field label="Service address">
        <input
          className={inputClass}
          value={form.serviceAddress}
          onChange={(e) => set('serviceAddress', e.target.value)}
          placeholder="1234 Camino Ruiz"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="City">
          <input
            className={inputClass}
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            placeholder="San Diego"
          />
        </Field>
        <Field label="ZIP code">
          <input
            className={inputClass}
            value={form.postalCode}
            onChange={(e) => set('postalCode', e.target.value)}
            placeholder="92126"
          />
        </Field>
      </div>

      <Field label="Which areas need work?">
        <div className="flex flex-wrap gap-2">
          {AREAS.map((area) => {
            const selected = areas.includes(area.value)
            return (
              <button
                key={area.value}
                type="button"
                onClick={() =>
                  setAreas((prev) =>
                    selected ? prev.filter((a) => a !== area.value) : [...prev, area.value],
                  )
                }
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                  selected
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {selected && <Check className="w-3.5 h-3.5 inline mr-1.5 text-primary" />}
                {area.label}
              </button>
            )
          })}
        </div>
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Gate access">
          <input
            className={inputClass}
            value={form.gateAccess}
            onChange={(e) => set('gateAccess', e.target.value)}
            placeholder="Gate code, or “unlocked”"
          />
        </Field>
        <Field label="Anything else we should know?">
          <input
            className={inputClass}
            value={form.accessNotes}
            onChange={(e) => set('accessNotes', e.target.value)}
            placeholder="Park on the street, sprinkler box on left…"
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={pets}
          onChange={(e) => setPets(e.target.checked)}
          className="w-4 h-4 accent-[var(--primary)]"
        />
        <span className="text-sm">There are pets on the property</span>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={!valid || busy}
        className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        Continue
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------

export function ServicesStep({
  config,
  initial,
  onBack,
  onComplete,
}: {
  config: IntakeConfig
  initial: Lead
  onBack: () => void
  onComplete: (values: Record<string, unknown>) => Promise<void>
}) {
  const [selected, setSelected] = useState<string[]>(initial.requestedServices ?? [])
  const [cadence, setCadence] = useState(initial.cadence ?? 'biweekly')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (value: string) =>
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onComplete({ requestedServices: selected, cadence, notes })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your selection.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h2 className="mb-2">What do you need?</h2>
        <p className="text-muted-foreground">
          Pick anything you already know you want. We’ll suggest anything else your photos show.
        </p>
      </div>

      <div className="space-y-3">
        {config.services.map((service) => {
          const isSelected = selected.includes(service.serviceValue)
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => toggle(service.serviceValue)}
              className={`w-full text-left rounded-xl border p-4 transition-colors ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{service.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                  {service.description && (
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <Field label="How often?">
        <div className="flex flex-wrap gap-2">
          {CADENCES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCadence(option.value)}
              className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                cadence === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Anything specific you want handled?">
        <textarea
          className={`${inputClass} resize-none`}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="The hedge along the driveway has gotten out of hand…"
        />
      </Field>

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
          type="submit"
          disabled={busy}
          className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Continue to photos
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------

export function ScheduleStep({
  config,
  onBack,
  onComplete,
}: {
  config: IntakeConfig
  onBack: () => void
  onComplete: (date: string, time: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2">Pick a visit time</h2>
        <p className="text-muted-foreground">
          {config.tenant.name} will confirm by email. Times are estimates — weather and job length
          can shift the schedule.
        </p>
      </div>

      <BookingCalendar
        onBook={(date, time) => {
          setBusy(true)
          setError(null)
          void onComplete(date.toISOString().slice(0, 10), time)
            .catch((err: unknown) =>
              setError(err instanceof Error ? err.message : 'Could not save your booking.'),
            )
            .finally(() => setBusy(false))
        }}
      />

      {busy && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Saving…
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="button"
        onClick={onBack}
        className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
      >
        Back
      </button>
    </div>
  )
}
