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
| `GOOGLE_MAPS_API_KEY` | Secrets Store | store `393ef1d6ad114ec598b1b2abf1e9a2b6` |

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

Three sources, kept separate so an admin can see *why* a figure is trusted
(`worker/lib/measure.ts`):

- `traced_*` — geodesic area of a polygon drawn on satellite imagery. Exact.
- `client_*` — what the customer typed.
- `parcel_*` — authoritative lot data. **Not wired yet**; see below.

Priority is traced → client. Parcel lot size is used to sanity-check, never as
turf area (a lot includes house, driveway, and hardscape). Disagreements are
recorded in `measurement_flag` rather than silently reconciled.

Ground photos are deliberately not a measurement source — a handheld photo has
no scale reference.

> **Open architecture decision — parcel lookup.** `adu-san-diego-api` and its D1
> already resolve address → APN / lot_sqft / zone for San Diego. Reading that DB
> directly from this Worker would couple two apps through storage, and calling it
> over public HTTP is also out. Wire it either by adding a `ParcelService`
> `WorkerEntrypoint` to `adu-san-diego-api`, or by extracting a shared
> `parcel-service` Worker. Until then `lookupParcel()` returns `null` and the app
> degrades to trace-only.

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
