import { useCallback, useEffect, useState } from 'react'
import { Loader2, LogOut, Mail, RefreshCw, AlertTriangle } from 'lucide-react'
import {
  adminApi,
  type AdminAssessment,
  type AdminService,
  type AuthUser,
  type Lead,
  type Photo,
  type TenantAdminDto,
} from '../../lib/api'

const inputClass =
  'w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring'

type Tab = 'leads' | 'services' | 'settings'

export function AdminApp() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    void adminApi
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return <SignIn onSignedIn={setUser} />
  return <Dashboard user={user} onSignedOut={() => setUser(null)} />
}

// ---------------------------------------------------------------------------

/**
 * Passwordless email code, handled entirely by the shared jacsal-auth service.
 * This app never sees or stores a password.
 */
function SignIn({ onSignedIn }: { onSignedIn: (user: AuthUser) => void }) {
  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (stage === 'email') {
        await adminApi.requestCode(email)
        setStage('code')
      } else {
        const { user } = await adminApi.verify(email, code)
        onSignedIn(user)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-card border border-border rounded-xl p-8 space-y-5">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h1 className="mb-1">Staff sign in</h1>
          <p className="text-sm text-muted-foreground">
            {stage === 'email'
              ? 'We’ll email you a six-digit code.'
              : `Enter the code we sent to ${email}.`}
          </p>
        </div>

        {stage === 'email' ? (
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoFocus
            required
          />
        ) : (
          <input
            className={`${inputClass} text-center tracking-[0.4em] font-mono`}
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            autoFocus
            required
          />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {stage === 'email' ? 'Send code' : 'Sign in'}
        </button>

        {stage === 'code' && (
          <button
            type="button"
            onClick={() => {
              setStage('email')
              setCode('')
              setError(null)
            }}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            Use a different email
          </button>
        )}
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Dashboard({ user, onSignedOut }: { user: AuthUser; onSignedOut: () => void }) {
  const [tenants, setTenants] = useState<TenantAdminDto[]>([])
  const [canBootstrap, setCanBootstrap] = useState(false)
  const [slug, setSlug] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('leads')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { tenants: list, canBootstrap: bootstrap } = await adminApi.listTenants()
    setTenants(list)
    setCanBootstrap(bootstrap)
    setSlug((current) => current ?? list[0]?.slug ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh().catch(() => setLoading(false))
  }, [refresh])

  const signOut = async () => {
    await adminApi.logout().catch(() => undefined)
    onSignedOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!slug) {
    return <NoTenants canBootstrap={canBootstrap} email={user.email} onCreated={refresh} onSignOut={signOut} />
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-lg">Intake admin</h1>
            {tenants.length > 1 ? (
              <select
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="px-3 py-1.5 bg-input-background border border-border rounded-lg text-sm"
              >
                {tenants.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-muted-foreground">
                {tenants.find((t) => t.slug === slug)?.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user.email}</span>
            <button
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-6 flex gap-1">
          {(['leads', 'services', 'settings'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm capitalize border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === 'leads' && <LeadsTab slug={slug} />}
        {tab === 'services' && <ServicesTab slug={slug} />}
        {tab === 'settings' && (
          <SettingsTab tenant={tenants.find((t) => t.slug === slug)!} onSaved={refresh} />
        )}
      </main>
    </div>
  )
}

function NoTenants({
  canBootstrap,
  email,
  onCreated,
  onSignOut,
}: {
  canBootstrap: boolean
  email: string
  onCreated: () => Promise<void>
  onSignOut: () => Promise<void>
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await adminApi.createTenant({ name, slug, parcelLookupEnabled: true })
      await onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the company.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 space-y-5">
        {canBootstrap ? (
          <>
            <div>
              <h1 className="mb-1">Set up your first company</h1>
              <p className="text-sm text-muted-foreground">
                You’ll be its administrator, and a starter service catalog will be created.
              </p>
            </div>
            <form onSubmit={create} className="space-y-4">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!slug) {
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '')
                        .slice(0, 40),
                    )
                  }
                }}
                placeholder="Company name"
                required
              />
              <div>
                <input
                  className={inputClass}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="url-slug"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Customers will use /t/{slug || 'your-slug'}
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Create company
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <h1 className="mb-1">No access yet</h1>
                <p className="text-sm text-muted-foreground">
                  {email} isn’t an administrator on any company. Ask an existing admin to add you.
                </p>
              </div>
            </div>
          </>
        )}
        <button
          onClick={() => void onSignOut()}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function LeadsTab({ slug }: { slug: string }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    void adminApi
      .listLeads(slug)
      .then((r) => setLeads(r.leads))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(load, [load])

  if (selected) {
    return <LeadDetail slug={slug} leadId={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2>Leads</h2>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      ) : leads.length === 0 ? (
        <p className="text-muted-foreground">No leads yet.</p>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 hidden md:table-cell">Address</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden sm:table-cell">Received</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelected(lead.id)}
                  className="border-t border-border hover:bg-muted/40 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-muted-foreground text-xs">{lead.email}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {lead.serviceAddress ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-muted text-xs capitalize">
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {new Date(lead.createdAt * 1000).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LeadDetail({
  slug,
  leadId,
  onBack,
}: {
  slug: string
  leadId: string
  onBack: () => void
}) {
  const [data, setData] = useState<{
    lead: Lead
    photos: Photo[]
    assessments: AdminAssessment[]
  } | null>(null)

  useEffect(() => {
    void adminApi
      .getLead(slug, leadId)
      .then(setData)
      .catch(() => setData(null))
  }, [slug, leadId])

  if (!data) return <Loader2 className="w-5 h-5 animate-spin text-primary" />

  const { lead, photos, assessments } = data
  const latest = assessments[0]
  const m = lead.measurements

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to leads
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2>{lead.name}</h2>
          <p className="text-muted-foreground text-sm">
            {lead.email}
            {lead.phone ? ` · ${lead.phone}` : ''}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-muted text-sm capitalize">{lead.status}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Property">
          <Row label="Address" value={lead.serviceAddress} />
          <Row label="City" value={[lead.city, lead.postalCode].filter(Boolean).join(' ')} />
          <Row label="Type" value={lead.propertyType} />
          <Row label="Areas" value={lead.areas.join(', ')} />
          <Row label="Gate" value={lead.gateAccess} />
          <Row label="Pets" value={lead.petsOnProperty ? 'Yes' : 'No'} />
          <Row label="Access notes" value={lead.accessNotes} />
        </Card>

        <Card title="Request">
          <Row label="Requested" value={lead.requestedServices.join(', ')} />
          <Row label="Frequency" value={lead.cadence} />
          <Row label="Accepted" value={lead.acceptedServices.join(', ')} />
          <Row label="Declined" value={lead.declinedServices.join(', ')} />
          <Row label="Notes" value={lead.notes} />
          <Row
            label="Requested visit"
            value={lead.bookingDate ? `${lead.bookingDate} ${lead.bookingTime ?? ''}` : null}
          />
        </Card>
      </div>

      <Card title="Measurements">
        {m.flag && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <span>{m.flag}</span>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-x-6">
          <Row
            label="Turf (used)"
            value={m.turfSqft ? `${m.turfSqft.toLocaleString()} sq ft (${m.turfSqftSource})` : null}
          />
          <Row label="Customer said" value={m.clientTurfSqft?.toLocaleString()} />
          <Row label="Traced" value={m.tracedTurfSqft?.toLocaleString()} />
          <Row label="Lot (customer)" value={m.clientLotSqft?.toLocaleString()} />
          <Row label="Lot (county)" value={m.parcelLotSqft?.toLocaleString()} />
          <Row label="APN" value={m.parcelApn} />
          <Row label="Trees" value={m.treeCount?.toString()} />
          <Row label="Fence line" value={m.fenceLengthFt ? `${m.fenceLengthFt} ft` : null} />
        </div>
      </Card>

      {photos.length > 0 && (
        <Card title={`Photos (${photos.length})`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <a
                key={photo.id}
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                className="block aspect-square"
              >
                <img
                  src={photo.url}
                  alt={photo.area}
                  loading="lazy"
                  className="w-full h-full object-cover rounded-lg border border-border"
                />
                <span className="text-xs text-muted-foreground capitalize">{photo.area}</span>
              </a>
            ))}
          </div>
        </Card>
      )}

      {latest && (
        <Card title="AI assessment">
          <p className="text-xs text-muted-foreground mb-3">
            {latest.model} · {latest.photoCount} photos · {latest.status}
            {latest.inputTokens ? ` · ${latest.inputTokens} in / ${latest.outputTokens} out` : ''}
          </p>

          {latest.rejectedServiceValues.length > 0 && (
            <div className="mb-3 rounded-lg border border-border p-3 text-sm">
              <strong>Dropped (not in catalog):</strong>{' '}
              {latest.rejectedServiceValues.join(', ')}
            </div>
          )}

          {latest.observations.length > 0 && (
            <ul className="text-sm space-y-1 mb-3">
              {latest.observations.map((o, i) => (
                <li key={i}>
                  <span className="capitalize font-medium">{o.area}</span> — {o.condition}: {o.detail}{' '}
                  <span className="text-muted-foreground">({o.severity})</span>
                </li>
              ))}
            </ul>
          )}

          {latest.crewNotes && (
            <p className="text-sm">
              <strong>Crew notes:</strong> {latest.crewNotes}
            </p>
          )}
        </Card>
      )}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-border rounded-xl p-5">
      <h3 className="mb-3">{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm py-1">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="min-w-0">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------

function ServicesTab({ slug }: { slug: string }) {
  const [services, setServices] = useState<AdminService[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    void adminApi
      .listServices(slug)
      .then((r) => setServices(r.services))
      .catch(() => setServices([]))
      .finally(() => setLoading(false))
  }, [slug])

  const save = async (service: AdminService, patch: Partial<AdminService>) => {
    setSaving(service.id)
    try {
      const { service: updated } = await adminApi.updateService(slug, service.id, patch)
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-primary" />

  return (
    <div className="space-y-4">
      <div>
        <h2>Services</h2>
        <p className="text-sm text-muted-foreground mt-1">
          “Suggest when you see” is sent to the AI verbatim — it decides when a service gets
          suggested from a photo. Be specific and visual.
        </p>
      </div>

      {services.map((service) => (
        <div key={service.id} className="border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-medium">{service.name}</div>
              <code className="text-xs text-muted-foreground">{service.serviceValue}</code>
            </div>
            <div className="flex items-center gap-3 text-sm shrink-0">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={service.isActive}
                  onChange={(e) => void save(service, { isActive: e.target.checked })}
                  className="accent-[var(--primary)]"
                />
                Active
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={service.isAddon}
                  onChange={(e) => void save(service, { isAddon: e.target.checked })}
                  className="accent-[var(--primary)]"
                />
                Upsell
              </label>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Price ($)</span>
              <input
                className={inputClass}
                defaultValue={service.price}
                inputMode="decimal"
                onBlur={(e) => {
                  const price = Number(e.target.value)
                  if (price !== service.price) void save(service, { price })
                }}
              />
            </label>
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="text-muted-foreground">Suggest when you see…</span>
              <textarea
                className={`${inputClass} resize-none`}
                rows={2}
                defaultValue={service.triggers ?? ''}
                onBlur={(e) => {
                  if (e.target.value !== (service.triggers ?? '')) {
                    void save(service, { triggers: e.target.value })
                  }
                }}
              />
            </label>
          </div>

          {saving === service.id && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------

function SettingsTab({ tenant, onSaved }: { tenant: TenantAdminDto; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    name: tenant.name,
    tagline: tenant.tagline ?? '',
    contactEmail: tenant.contactEmail ?? '',
    contactPhone: tenant.contactPhone ?? '',
    serviceAreas: (tenant.serviceAreas ?? []).join(', '),
    adminEmails: (tenant.adminEmails ?? []).join(', '),
  })
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await adminApi.updateTenant(tenant.slug, {
        name: form.name,
        tagline: form.tagline,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        serviceAreas: splitList(form.serviceAreas),
        adminEmails: splitList(form.adminEmails),
      })
      await onSaved()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <h2>Settings</h2>

      <Labelled label="Company name">
        <input
          className={inputClass}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </Labelled>
      <Labelled label="Tagline">
        <input
          className={inputClass}
          value={form.tagline}
          onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
        />
      </Labelled>
      <Labelled label="Contact email">
        <input
          className={inputClass}
          type="email"
          value={form.contactEmail}
          onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
        />
      </Labelled>
      <Labelled label="Contact phone">
        <input
          className={inputClass}
          value={form.contactPhone}
          onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
        />
      </Labelled>
      <Labelled label="Service areas (comma separated)">
        <input
          className={inputClass}
          value={form.serviceAreas}
          onChange={(e) => setForm((f) => ({ ...f, serviceAreas: e.target.value }))}
        />
      </Labelled>
      <Labelled label="Administrators (comma separated emails)">
        <input
          className={inputClass}
          value={form.adminEmails}
          onChange={(e) => setForm((f) => ({ ...f, adminEmails: e.target.value }))}
        />
      </Labelled>

      <p className="text-sm text-muted-foreground">
        Customer link: <code>/t/{tenant.slug}</code>
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-primary">Saved.</p>}

      <button
        type="submit"
        disabled={busy}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        Save
      </button>
    </form>
  )
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm">{label}</span>
      {children}
    </label>
  )
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}
