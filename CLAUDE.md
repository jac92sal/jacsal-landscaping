# jacsal-intake

Multi-tenant landscaping intake + AI property assessment. A homeowner submits
property details, photos, and measurements; the app returns a recommended
service list with upsell suggestions derived from the photos.

Rebuilt from the previous Figma/Supabase "AI client screening" app. The old
consulting flow still lives on `main`; this branch is the landscaping rebuild on
Cloudflare.

| | |
|---|---|
| **Subdomain** | `intake.jacsalservices.com` |
| **Worker** | `jacsal-intake` (route: `intake.jacsalservices.com`, custom domain) |
| **Frontend** | React + Vite SPA, shadcn/ui, served as static assets |
| **Repo** | `jac92sal/aipoweredclientscreeningapp`, branch `claude/landscaping-app-rebuild-k086ef` |

## Resources

| Binding | Kind | Name / ID |
|---|---|---|
| `DB` | D1 | `jacsal-intake-db` — `f3d610a3-3d1f-437a-a813-48222e49808a` |
| `CONFIG` | KV | `jacsal-intake-config` — `56090979e35b4e74bbbee2533846ae99` |
| `PHOTOS` | R2 | `jacsal-intake-photos` (private — never public) |
| `ASSETS` | Static assets | SPA fallback; `run_worker_first: ["/api/*"]` |
| `AUTH` | Service binding | `jacsal-auth` → `AuthService` entrypoint |
| `ANTHROPIC_API_KEY` | Secrets Store | store `393ef1d6ad114ec598b1b2abf1e9a2b6` |
| `GOOGLE_MAPS_API_KEY` | Secrets Store | store `393ef1d6ad114ec598b1b2abf1e9a2b6` — needs Geocoding API + Maps Static API enabled |

> ⚠️ **Confirm both secret names before the first deploy.** The store ID is
> correct, but the two `secret_name` values in `wrangler.jsonc` were not
> verified against the registry. Run:
> `wrangler secrets-store secret list --store-id 393ef1d6ad114ec598b1b2abf1e9a2b6`
> and correct `wrangler.jsonc` if the stored spellings differ. Use names exactly
> as stored — do not "fix" a misspelling in the store.

## Data model

Config in KV, data in D1 — config is read on nearly every request and is tiny.

- KV `tenant:<slug>` → tenant record (branding, admin emails, time slots)
- KV `tenant:<slug>:service:<id>` → service catalog entry
- D1 `leads` → one row per intake, tenant-scoped
- D1 `photos` → metadata; bytes in R2 under `<tenant>/<lead>/<uuid>.<ext>`
- D1 `assessments` → append-only, one row per vision run

Migrations live in `migrations/`. Apply with `npm run db:migrate`.

## Auth

Two independent models, deliberately not merged:

- **Customers** are anonymous. `POST /api/t/<slug>/leads` returns a one-time
  opaque `leadToken`; every later write must send it as `X-Lead-Token`. Only
  its SHA-256 is stored, so guessing a lead UUID grants nothing.
- **Staff** authenticate via the `jacsal-auth` service binding (passwordless
  email code) and must additionally appear in the tenant's `adminEmails`.

First-run bootstrap: when zero tenants exist, the first authenticated user may
create one and becomes its admin. After that, only an existing admin can.

## The AI assessment

`worker/lib/assess.ts`. One rule holds it together: **the model classifies, it
never prices and never measures.**

- It receives the tenant's catalog as a closed vocabulary and may only answer
  with `service_value` keys from it. Invented keys are dropped before the
  customer sees anything and recorded in `rejected_service_values`.
- Prices are attached afterwards from the catalog, so a price edit updates every
  future quote and no dollar figure can be hallucinated.
- The `triggers` field on each service is the highest-leverage knob for quality:
  it is fed to the model verbatim as the "suggest when you see…" vocabulary.

## Measurements

Two sources, kept separate so an admin can see *why* a figure is trusted
(`worker/lib/measure.ts`):

- `traced_*` — geodesic area of a polygon the customer draws on satellite
  imagery. A real measurement, exact to the shape they drew.
- `client_*` — what the customer typed.

Priority is traced → client. Disagreement beyond 35% is recorded in
`measurement_flag` rather than silently reconciled.

**There is no parcel source, deliberately.** Google Maps Platform has no
assessor data — no APN, no legal lot size — and for a landscaping quote that
matters less than it sounds: a lot includes the house, driveway, and hardscape,
so it was never the number being quoted. The lawn is. The `parcel_*` columns
stay on the table so county data can be layered in later without a migration,
and `resolveMeasurements()` still accepts a lot size for cross-checking.

Ground photos are never a measurement source — a handheld photo has no scale
reference. Overhead imagery at a known zoom does, which is the entire reason
tracing works.

### How tracing works

`worker/lib/maps.ts` + `src/app/intake/LawnTracer.tsx`.

1. `POST /api/t/<slug>/leads/<id>/locate` geocodes the service address once and
   stores `lat`/`lng`. Geocoding is billed per call and addresses rarely change.
2. `GET .../map?zoom=N` proxies a Static Maps satellite tile. The key never
   reaches the browser, and the image is streamed, never stored — Google's terms
   permit displaying imagery, not retaining it.
3. The customer taps the lawn edge. Taps convert from logical pixels to
   coordinates via Web Mercator against the tile's known centre and zoom, then
   `polygonAreaSqFt()` computes the geodesic area.

The tile centre and zoom are what make the pixel maths valid, so **the image must
never be pannable** — zoom changes re-request a fresh, re-centred tile. Points
are stored as coordinates, not pixels, so they survive a zoom change.

Verified numerically: a 100 ft square returns exactly 10,000 sq ft, and
project/unproject round-trips are lossless.

## Commands

```bash
npm run dev             # Vite + Workers runtime locally
npm run cf-typegen      # regenerate worker-configuration.d.ts (gitignored)
npm run check           # typecheck SPA + Worker
npm run db:migrate      # apply D1 migrations (remote)
npm run deploy          # vite build && wrangler deploy
```

`worker-configuration.d.ts` is generated, not source — run `cf-typegen` after
changing `wrangler.jsonc` and on a fresh clone before typechecking.
