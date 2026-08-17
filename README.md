# Landscaping Intake

Multi-tenant intake and AI property assessment for landscaping companies.

A homeowner enters their property details, picks the services they think they
need, and uploads photos of the yard. The app reviews those photos, tells them
what it noticed, and suggests work they didn't ask for — the upsell — before
they pick a visit time.

Runs at `intake.jacsalservices.com` on a single Cloudflare Worker. One
deployment serves many landscapers, each at `/t/<slug>` with their own service
catalog, branding, and staff.

## How it works

**Photos answer *what needs doing*. Measurements answer *how much*. The service
catalog answers *what it costs*.** Those three stay separate on purpose.

The vision model is given the tenant's own catalog as a closed vocabulary and
may only answer with service keys from it — anything it invents is dropped
before the customer sees it and recorded so the drift is visible. It never
returns a price and never returns a measurement. Prices come from the catalog
afterwards, so editing one updates every future quote.

Measurement comes from three tracked-separately sources: a polygon traced on
satellite imagery (exact), what the customer typed, and authoritative parcel
data. When they disagree, the app says so instead of quietly picking one. A
handheld ground photo is never a measurement source — it has no scale reference.

## Development

```bash
npm install
npm run cf-typegen     # generate worker-configuration.d.ts (gitignored)
npm run dev            # Vite + the real Workers runtime
npm run check          # typecheck SPA + Worker
npm run deploy         # build and deploy
```

Architecture, bindings, data model, and open decisions: [`CLAUDE.md`](./CLAUDE.md).

## Layout

```
worker/          API Worker — the backend
  index.ts       routes
  lib/           tenants, leads, photos, measurement, assessment
src/
  lib/api.ts     typed client for the Worker API
  app/intake/    the customer flow
  app/admin/     staff dashboard
migrations/      D1 schema
```
