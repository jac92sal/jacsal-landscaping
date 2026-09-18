# Project skills

Skills in this folder load automatically in Claude Code sessions for this repo.
Each `SKILL.md` is a self-contained how-to for one external service or data format.

| Skill | Use when |
|---|---|
| `arcgis-elevation` | Need ground/water-depth elevation (metres) for one or up to 100 lon/lat points. |
| `arcgis-static-maps` | Need a PNG/JPEG/WebP map image with pins, a route line, or a boundary, for a page, PDF, email, or report. |
| `arcgis-js-sdk` | Need an interactive browser map or 3D scene: web components (`arcgis-map`, `arcgis-scene`), graphics, feature layers, BuildingSceneLayer + Slice for Revit/BIM models, React/Vite setup. |
| `arcgis-feature-query` | Need to query ANY ArcGIS REST MapServer/FeatureServer layer (`/query`): WHERE filters, spatial filters, paging, stats, distinct values. |
| `dc-gis-soil` | Need the USDA soil type / slope for a location or parcel in Washington, DC. Worked example of `arcgis-feature-query`. |
| `usgs-comcat-phases` | Need earthquake origin + seismic phase-pick data from USGS ComCat, or must read/write the `getphases` CSV format. |
| `adu-feasibility-report` | Asked whether an ADU / backyard cottage / garage conversion is feasible on a lot, or to assemble a site feasibility packet. Composes the four skills above. |

## Stripe skills (installed with `npx skills add https://docs.stripe.com -y`)

Real files live in `.agents/skills/<name>/`; `.claude/skills/<name>` is a symlink the CLI created so Claude Code sees them. Re-run the same command to update them; do not hand-edit.

| Skill | Use when |
|---|---|
| `stripe-docs` | Reading or searching docs.stripe.com or the API reference (prefer over WebFetch). |
| `stripe-best-practices` | Choosing Checkout vs PaymentIntents, sandboxes, Connect setup, billing, tax, Treasury. |
| `stripe-projects` | Provisioning third-party services and credentials through Stripe Projects (`stripe projects ...`). |
| `stripe-apps` | Building or reviewing a Stripe App / Dashboard extension. |
| `connect-recommend` | Designing a Connect marketplace or platform: account types, charge patterns. |
| `connect-required-verification-information` | What KYC / verification fields a connected account needs by country. |
| `stripe-directory` | Finding or verifying an external business, provider, or API to pay or integrate with. |
| `stripe-pay` | Sending funds to another Stripe business or profile handle. |
| `upgrade-stripe` | Upgrading Stripe API versions and SDKs. |

Conventions shared by the ArcGIS skills:
- Coordinates are always `x = longitude`, `y = latitude`, WGS84 (wkid 4326) unless a layer says otherwise.
- Esri location services (elevation, static maps) need an ArcGIS Location Platform API key. Read it from the environment as `ARCGIS_API_KEY`; never hard-code it and never commit it. If it is missing, say so and stop rather than guessing.
- Public ArcGIS Server layers (like DC GIS) need no key.
- An API key with Referrers configured returns `498 Token Invalid` unless the request sends a matching `Referer` header; server-side callers must set it explicitly.
- Keys in the Worker come from the Cloudflare Secrets Store (CLAUDE.md resources table), never `wrangler secret put` and never `vars`.
- Always send `f=json` and check the body for an `error` object; ArcGIS returns HTTP 200 with `{"error":{"code":...}}` on many failures.
