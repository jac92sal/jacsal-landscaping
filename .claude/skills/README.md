# Project skills

Skills in this folder load automatically in Claude Code sessions for this repo.
Each `SKILL.md` is a self-contained how-to for one external service or data format.

| Skill | Use when |
|---|---|
| `arcgis-elevation` | Need ground/water-depth elevation (metres) for one or up to 100 lon/lat points. |
| `arcgis-static-maps` | Need a PNG/JPEG/WebP map image with pins, a route line, or a boundary, for a page, PDF, email, or report. |
| `arcgis-feature-query` | Need to query ANY ArcGIS REST MapServer/FeatureServer layer (`/query`): WHERE filters, spatial filters, paging, stats, distinct values. |
| `dc-gis-soil` | Need the USDA soil type / slope for a location or parcel in Washington, DC. Worked example of `arcgis-feature-query`. |
| `usgs-comcat-phases` | Need earthquake origin + seismic phase-pick data from USGS ComCat, or must read/write the `getphases` CSV format. |
| `adu-feasibility-report` | Asked whether an ADU / backyard cottage / garage conversion is feasible on a lot, or to assemble a site feasibility packet. Composes the four skills above. |

Conventions shared by the ArcGIS skills:
- Coordinates are always `x = longitude`, `y = latitude`, WGS84 (wkid 4326) unless a layer says otherwise.
- Esri location services (elevation, static maps) need an ArcGIS Location Platform API key. Read it from the environment as `ARCGIS_API_KEY`; never hard-code it and never commit it. If it is missing, say so and stop rather than guessing.
- Public ArcGIS Server layers (like DC GIS) need no key.
- Keys in the Worker come from the Cloudflare Secrets Store (CLAUDE.md resources table), never `wrangler secret put` and never `vars`.
- Always send `f=json` and check the body for an `error` object; ArcGIS returns HTTP 200 with `{"error":{"code":...}}` on many failures.
