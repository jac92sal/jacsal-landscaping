---
name: arcgis-static-maps
description: Render a static map image (PNG/JPEG/WebP) with a pin, several pins, a route polyline, a polygon boundary, or up to 64 custom-symbol overlays using the ArcGIS Static Maps service. Use for map thumbnails in web pages, emails, receipts, PDFs, reports, and dashboards where an interactive map is overkill.
---

# ArcGIS Static Maps service

Base URL pattern (version is `v1`):
```
https://static-maps-api.arcgis.com/arcgis/rest/services/static-maps-service/v1/static-maps/arcgis/{style}/{endpoint}
```
`{style}` ∈ `streets`, `streets-night`, `navigation`, `navigation-night`, `imagery`.

## Auth (required)
API key / token with the static maps privilege (`premium:user:staticMaps`). Read from `ARCGIS_API_KEY`. Pass `?token=` on GET, or `Authorization: Bearer` header on GET/POST. Pricing: 1,000 images free per month, then $0.90 per 1,000; the attribution call is free.

## Choose GET vs POST
| | GET (`with-point`, `with-many-points`, `with-polyline`, `with-polygon`) | POST (`with-overlay`) |
|---|---|---|
| Geometries | one geometry, or ≤10 points | ≤64 mixed geometries |
| Vertices per geometry | ≤10 | ≤5000 (POST body size bound) |
| Symbols | built-in `pin`/`circle`/`square`/`none` | built-in + custom SVG via `symbolDictionary` |
| Typical use | business locator, property boundary, route preview | delivery routes, service areas, GPS tracks, incident maps |

## Common parameters (all endpoints)
| Param | Default | Notes |
|---|---|---|
| `format` | `webp` | `png`, `jpeg`, `webp`. Use `png` for email/PDF compatibility. |
| `width`, `height` | 400 | 128–1024 px each |
| `padding` | `[10]` | 1–4 percentages (CSS order), max 25 |
| `centerX`, `centerY` | auto-fit | WGS84 lon/lat; override auto-fit |
| `zoom` | auto | 0–22, mutually exclusive with `radius` |
| `radius` | auto | metres, 10–20,000,000, mutually exclusive with `zoom` |
| `attribution` | `auto` | `auto`, `light`, `dark`, `none`. If `none`, you MUST show attribution text yourself (see below). |
| `referenceDetails` | `all` | `all`/`none`; imagery style only (labels/roads overlay) |
| `symbolColor` | `007AC2` | `RRGGBB` or `RRGGBBAA` |
| `symbolScale` | 1 | 0.1–4.0 |
| `symbolStyle` | `pin` | `pin`, `circle`, `square`, `none` |

Coordinates are always `x,y` = `lon,lat`, WGS84, comma-separated, URL-encoded (`%2C`).

## GET endpoints
### `with-point`  — `x`, `y` required; optional `symbolLabel` (1–2 alphanumerics)
```
.../arcgis/streets/with-point?x=-77.0369&y=38.9072&radius=300&symbolStyle=pin&symbolLabel=A&format=png&width=600&height=400&token=$ARCGIS_API_KEY
```
### `with-many-points` — `points=x1,y1,x2,y2,...` (≤10 pairs); `labelOption=none|letter|number`
```
.../arcgis/navigation/with-many-points?points=-77.0369,38.9072,-77.0091,38.8899&labelOption=number&format=png&token=...
```
### `with-polyline` — `polyline=x1,y1,...` (2–10 pairs)
Extra: `lineColor`, `lineStyle` (`solid|dash|dot`), `lineWidth` (1–16), `startSymbolStyle/Color/Label`, `endSymbolStyle/Color/Label`.
### `with-polygon` — `polygon=x1,y1,...` (3–10 pairs; ring need not repeat the first point)
Extra: `fillColor`, `fillStyle` (`solid|none`), `outlineColor`, `outlineStyle` (`solid|dash|dot`), `outlineWidth` (1–16).

Response: HTTP 200 with the raw image bytes (`Content-Type: image/png` etc.). Errors are JSON `{"error":{...}}` with 4xx/5xx.

## POST `with-overlay` (complex maps)
`Content-Type: application/json`. Body:
```json
{
  "overlay": [
    {"type":"point","geometry":{"x":-77.0369,"y":38.9072,"spatialReference":{"wkid":4326}},
     "symbol":{"customSymbolId":"office","scale":1,"offsetX":0,"offsetY":0}},
    {"type":"polyline","geometry":{"paths":[[[-77.04,38.90],[-77.03,38.91]]],"spatialReference":{"wkid":4326}},
     "symbol":{"style":"dash","color":"FF0000","width":3}},
    {"type":"polygon","geometry":{"rings":[[[-77.05,38.89],[-77.02,38.89],[-77.02,38.92],[-77.05,38.92],[-77.05,38.89]]],"spatialReference":{"wkid":4326}},
     "symbol":{"fillColor":"007AC240","outlineColor":"007AC2","outlineWidth":2}}
  ],
  "symbolDictionary": {"office": "data:image/svg+xml;base64,<svg base64, max 8000 chars>"},
  "image": {"width":800,"height":600,"format":"png","padding":[10,10,10,10],"attribution":"auto"},
  "map": {"radius":1500,"center":{"x":-77.0369,"y":38.9072,"spatialReference":{"wkid":4326}},
          "basemapOptions":{"referenceDetails":"all"}}
}
```
- Polyline geometry uses Esri JSON `paths`, polygon uses `rings` (closed, first point repeated), point uses `x`/`y`.
- `symbolDictionary` keys are referenced by `customSymbolId`. Custom symbols are data-URL SVGs, ≤8000 chars each.
- Omit `map` to auto-fit all overlays.

```bash
curl -sS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $ARCGIS_API_KEY" \
  ".../static-maps/arcgis/streets/with-overlay" --data @body.json -o map.png
```

## Attribution (legally required)
"Esri and data attribution must be displayed whenever the static map is visible." Either keep `attribution=auto|light|dark` (burned into the image) or, if you use `none`, fetch the text and render it next to the map:
```
GET .../static-maps/arcgis/{style}/attribution?f=json&token=...
→ {"attribution":"Esri, TomTom, Garmin, FAO, NOAA, USGS, © OpenStreetMap contributors, and the GIS User Community.\n"}
```

## TypeScript helper
```ts
const SM = "https://static-maps-api.arcgis.com/arcgis/rest/services/static-maps-service/v1/static-maps/arcgis";
export async function staticMapPoint(lon: number, lat: number, key: string, opts: Record<string,string|number> = {}): Promise<Blob> {
  const q = new URLSearchParams({ x: String(lon), y: String(lat), format: "png", ...Object.fromEntries(Object.entries(opts).map(([k,v])=>[k,String(v)])) });
  const r = await fetch(`${SM}/streets/with-point?${q}`, { headers: { Authorization: `Bearer ${key}` } });
  if (!r.headers.get("content-type")?.startsWith("image/")) throw new Error(await r.text());
  return r.blob();
}
```

## Gotchas
- Check `Content-Type` before treating the body as an image; a JSON error body is the usual failure mode.
- **Referrer-restricted API keys.** If an API key credential has any Referrers set, every request must carry a matching `Referer` header or the service answers `498 Token Invalid` (indistinguishable from a bad key). Browsers add it automatically; `curl` and Workers do not, so send `-H "Referer: https://<allowed-domain>/"` (Workers may set `Referer` on `fetch`). Clear the Referrers list, or add the calling domain, to avoid this.
- `zoom` and `radius` cannot both be set.
- GET URLs with 10 vertices are fine; more than that or any custom symbol means POST.
- Do not embed the API key in HTML that ships to browsers unless the key is referrer-restricted in the ArcGIS dashboard. Prefer proxying through the Worker.
