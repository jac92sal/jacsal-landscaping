---
name: adu-feasibility-report
description: Assemble a short ADU (accessory dwelling unit) feasibility report for a residential lot from an address or coordinates - locator and satellite exhibits, lot and lawn area, slope from elevation, soil and drainage notes, zoning district and ADU rules from the jurisdiction's own GIS and code, and a go / conditional / no-go summary. Use when asked whether an ADU, backyard cottage, garage or basement conversion, in-law suite, or detached studio is feasible on a property, or for a site feasibility packet.
---

# ADU feasibility report

Composes `arcgis-feature-query` (zoning, parcel), `dc-gis-soil` (soil), `arcgis-elevation` (slope), and `arcgis-static-maps` (exhibits) into one deliverable. It is a **screening** document, not a permit set or legal advice; say so on page 1.

## Inputs
- Service address (geocode via the app's `locate` endpoint / Google Geocoding) or lon/lat.
- Optional: lot polygon (customer-traced from `LawnTracer`, or parcel geometry from the jurisdiction), ADU type wanted (detached new build, garage conversion, basement/attic conversion, attached addition), target size.
- Optional tenant-supplied cost ranges. **Never invent construction costs.** If none are supplied, omit the cost section or leave labelled placeholders.

## Workflow
1. **Locate.** Geocode once; keep `lat`/`lng`. Build the locator map: `arcgis-static-maps` `streets` `with-point` (`symbolLabel=A`, `radius=400`, `format=png`).
2. **Parcel.** Query the jurisdiction's parcel/ownership polygon layer with a point filter (`inSR=4326`, `returnGeometry=true`, `outSR=4326`). Record lot area, premise address, property type, and the ring. Use the ring for the satellite exhibit (`imagery` `with-polygon`, `fillStyle=none`, `outlineColor=FFD400`, `width=800`, `height=600`) and as the sampling area for slope.
   - DC: `Property_and_Land_WebMercator/MapServer/40` "Owner Polygons (Common Ownership Layer)". Useful fields: `SSL`, `SQUARE`, `LOT`, `LANDAREA` (sq ft), `PROPTYPE`, `USECODE`, `PREMISEADD`, `NBHDNAME`, `PRMSWARD`, `UNDERLIES_CONDO`. **Do not copy owner names, assessments, or tax history into the report**; the client sees only what they need for feasibility.
   - No parcel layer available (see CLAUDE.md, Google has none): fall back to the customer's traced polygon and `client_lot_sqft`; label the source.
3. **Zoning.** Point-query the zoning layer. Record zone code, district family, and the code URL. Then read the **jurisdiction's ADU rules for that zone** (the URL from the layer, or the municipal code) and fill the regulatory table below from that text, citing section numbers and access date. Leave a cell as "verify" rather than guess.
   - DC: `Planning_Landuse_and_Zoning_WebMercator/MapServer/32` "Zoning Boundaries (Zoning Regulations of 2016)". Fields: `ZONING` (e.g. `R-1B`), `ZONE_DISTRICT`, `ZONE_DESCRIPTION`, `ZONING_WEB_URL` (DCOZ handbook page for the zone), `ZONING_STATUS`. Also check layer 6 "Overlay Areas 2016" and layer 24 "Historic Landmark Sites" / 23 "Historic Landmarks" at the same point; a historic district adds HPRB review.
   - Other jurisdictions: find the open-data ArcGIS zoning layer (`arcgis-feature-query` skill, layer listing) and the ADU chapter of the code. Many US jurisdictions now permit ADUs by right in single-family zones, but size caps, setbacks, height, owner-occupancy, and parking vary; only the local text counts.
4. **Slope.** Sample a grid inside the parcel ring (5×5 for lots under half an acre, coarser above) with `arcgis-elevation` `at-many-points` (≤100 points, within 50 km). Compute max and mean grade between neighbouring samples (`rise / run × 100`). Flags: ≤5% flat, 5–15% workable with grading, >15% expect retaining walls, engineered foundation, and stormwater review. Report the elevation range across the lot in feet and metres.
5. **Soil.** DC: `dc-gis-soil` point query → `TYPEDESC`, `SLOPEDESC`, `MUKEY`. Elsewhere: NRCS Soil Data Access by MUKEY / lon-lat. `Urban Land` means no NRCS engineering data; recommend a geotechnical boring before a slab or foundation. Note hydric or poorly drained series as a drainage/stormwater flag. Never state bearing capacity from a map unit.
6. **Site conditions from imagery and photos.** Existing structures, driveway, mature trees, alley or side-yard access for construction, visible utility lines, likely sewer/water tap route. Ground photos are observational only, never a measurement (CLAUDE.md rule).
7. **Buildable envelope.** Subtract the zone's rear/side setbacks and lot-coverage cap from the lot; compare the remaining rectangle with the requested ADU footprint. State the largest footprint that fits and whether a conversion is the cleaner path.
8. **Verdict.** `Go` (permitted by right, envelope fits, no physical red flags), `Conditional` (fits with a variance, special exception, grading, or utility upgrade; list each), or `No-go` (prohibited, or envelope/slope makes it impractical). Give the three deciding facts.

## Report outline (5 pages max)
Formatting per the user's standing preference: Times New Roman, 12 pt, double-spaced; use the `docx` skill to produce the file, PDF only if asked. Short declarative sentences, formal tone.
1. **Summary** — verdict, three deciding facts, three next steps.
2. **Property** — address, parcel ID, lot area (source), zone, existing use; locator + satellite exhibits (two images, captioned with attribution).
3. **Regulatory check** — table: ADU permitted (by right / special exception / no), max ADU size, max lot coverage, rear setback, side setback, height limit, parking, owner-occupancy, historic/overlay review, short-term-rental restriction; each row has a source citation and date. Unknown = "verify with <office>".
4. **Physical site** — slope (max/mean, elevation range), soil (series, slope class, drainage note), access, trees, utilities, stormwater.
5. **Buildable envelope and options** — envelope dimensions, option A/B (e.g. detached 1-storey vs garage conversion), rough size each; costs only from tenant-supplied ranges.
6. **Risks, next steps, disclaimer** — survey, zoning confirmation letter, geotech, utility capacity, permit path; "screening only, based on public GIS data as of <date>; confirm with a licensed professional and the zoning office".

## Data hygiene
- Public parcel layers return owner names and assessed values. Keep them out of the report and out of stored lead records unless the client is the owner and asked.
- Store only coordinates, zone code, areas, and the exhibit images you generated; do not persist third-party tiles beyond what the map service terms allow.
- Cite every regulatory number to a section of the code with the access date; a feasibility report that guesses a setback is worse than one that says "verify".
