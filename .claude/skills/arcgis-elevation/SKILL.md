---
name: arcgis-elevation
description: Get TopoBathy elevation (metres, land or water depth) for one lon/lat point or up to 100 points from the ArcGIS Elevation service. Use when asked for elevation, altitude, height above sea level, terrain height, bathymetry, or a slope/profile along a set of coordinates.
---

# ArcGIS Elevation service

Base URL: `https://elevation-api.arcgis.com/arcgis/rest/services/elevation-service/v1`

Returns elevation in **metres** at the best available resolution, seamless over land (topography) and water (bathymetry, negative values).

## Auth (required)
An ArcGIS Location Platform API key or token with the `premium:user:elevation` privilege. Without it the service returns `{"error":{"code":499,"message":"Token Required."}}`.
- Read the key from `ARCGIS_API_KEY`. Pass it as `?token=` **or** header `Authorization: Bearer <key>` (header preferred so the key stays out of URLs/logs).
- Price category: Elevation (per request; the many-points call counts as one request, so batch).

## Endpoints

### 1. Single point: `GET /elevation/at-point`
| Param | Req | Values | Default |
|---|---|---|---|
| `lon` | yes | -179.99 .. 179.99 | |
| `lat` | yes | -85.05 .. 85.05 | |
| `relativeTo` | no | `meanSeaLevel` (orthometric, geoid) or `ellipsoid` (geodetic) | `meanSeaLevel` |
| `f` | no | `json`, `pjson` | json |
| `token` | if no header | | |

```bash
curl -sS -H "Authorization: Bearer $ARCGIS_API_KEY" \
  "https://elevation-api.arcgis.com/arcgis/rest/services/elevation-service/v1/elevation/at-point?lon=-77.0369&lat=38.9072&f=json"
```
Response:
```json
{"elevationInfo":{"relativeTo":"meanSeaLevel"},
 "result":{"point":{"spatialReference":{"wkid":4326,"vcsWkid":105700},"x":-77.0369,"y":38.9072,"z":18.4}}}
```
`z` is the elevation. `vcsWkid` 105700 = EGM2008 geoid (mean sea level).

### 2. Many points: `POST /elevation/at-many-points`
Content-Type `application/json` (or form-encoded). Body:
```json
{"coordinates":[[-77.0369,38.9072],[-77.0091,38.8899]],"relativeTo":"meanSeaLevel","f":"json"}
```
Limits: **max 100 coordinates**, and the points must all lie within a **50 km × 50 km** box (east–west span ≤ 50 km AND north–south span ≤ 50 km) or the service returns HTTP 400. Split larger sets by both count and geography.

Response: `result.points[]`, each `{x, y, z, spatialReference}` **in the same order as the request**.

```bash
curl -sS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $ARCGIS_API_KEY" \
  "https://elevation-api.arcgis.com/arcgis/rest/services/elevation-service/v1/elevation/at-many-points" \
  --data '{"coordinates":[[-77.0369,38.9072],[-77.0091,38.8899]],"f":"json"}'
```

## TypeScript helper (Worker or browser)
```ts
const BASE = "https://elevation-api.arcgis.com/arcgis/rest/services/elevation-service/v1/elevation";
type Pt = { x: number; y: number; z: number };

export async function elevationAt(lon: number, lat: number, key: string, relativeTo: "meanSeaLevel"|"ellipsoid" = "meanSeaLevel"): Promise<number> {
  const u = `${BASE}/at-point?lon=${lon}&lat=${lat}&relativeTo=${relativeTo}&f=json`;
  const r = await fetch(u, { headers: { Authorization: `Bearer ${key}` } });
  const j = await r.json() as { error?: {code:number;message:string}; result?: { point: Pt } };
  if (j.error) throw new Error(`elevation ${j.error.code}: ${j.error.message}`);
  return j.result!.point.z;
}

export async function elevationMany(coords: [number, number][], key: string): Promise<Pt[]> {
  const out: Pt[] = [];
  for (let i = 0; i < coords.length; i += 100) {            // 100-point limit; caller must also keep each batch within 50 km
    const r = await fetch(`${BASE}/at-many-points`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ coordinates: coords.slice(i, i + 100), f: "json" }),
    });
    const j = await r.json() as { error?: {code:number;message:string}; result?: { points: Pt[] } };
    if (j.error) throw new Error(`elevation ${j.error.code}: ${j.error.message}`);
    out.push(...j.result!.points);
  }
  return out;
}
```

## Gotchas
- Argument order is `lon, lat` (x, y). Swapping them silently returns the wrong place or a 400 range error.
- `relativeTo=ellipsoid` differs from `meanSeaLevel` by the geoid undulation (tens of metres). Use mean sea level for anything a human reads.
- Water: `z` is negative depth below the surface, not zero.
- Errors may come back as HTTP 200 with an `error` object; always check the body.
- **Referrer-restricted API keys.** If an API key credential has any Referrers set, every request must carry a matching `Referer` header or the service answers `498 Token Invalid` (indistinguishable from a bad key). Browsers add it automatically; `curl` and Workers do not, so send `-H "Referer: https://<allowed-domain>/"` (Workers may set `Referer` on `fetch`). Clear the Referrers list, or add the calling domain, to avoid this.
- In this repo secrets live in the Cloudflare Secrets Store (see CLAUDE.md). If this call moves into the Worker, add `ARCGIS_API_KEY` to store `393ef1d6ad114ec598b1b2abf1e9a2b6`, bind it in `wrangler.jsonc` like `GOOGLE_MAPS_API_KEY`, and list it in the CLAUDE.md resources table. Locally, export it in the shell.
