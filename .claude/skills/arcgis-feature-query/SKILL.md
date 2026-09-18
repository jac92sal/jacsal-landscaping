---
name: arcgis-feature-query
description: Query any ArcGIS REST MapServer or FeatureServer layer via its /query endpoint - attribute WHERE filters, point/envelope/polygon spatial filters, buffers, paging past maxRecordCount, counts, distinct values, statistics, and GeoJSON output. Use whenever a URL contains /rest/services/.../MapServer/N or /FeatureServer/N, or when asked for parcels, zoning, soils, boundaries, or any open-data GIS layer.
---

# ArcGIS layer `/query` operation

Works identically for ArcGIS Online, ArcGIS Enterprise, and public ArcGIS Server sites (city/county open data portals). Public layers need no token; private ones take `token=`.

URL: `<service>/<MapServer|FeatureServer>/<layerId>/query?<params>&f=json`
Metadata: `<service>/<MapServer|FeatureServer>/<layerId>?f=json` (fields, geometryType, spatialReference, `maxRecordCount`, `advancedQueryCapabilities`).
Layer list: `<service>/<MapServer|FeatureServer>?f=json` → `layers[]` `{id,name}`.

**Always read the layer metadata first** when you have not used the layer before. It tells you field names (case-sensitive in the response, case-insensitive in WHERE), the native `spatialReference`, and which features below are supported.

## The 90% recipe
```bash
L="https://host/arcgis/rest/services/Folder/Service/MapServer/17"
# attribute filter, no geometry, first page
curl -sS "$L/query" --data-urlencode "where=TYPE='Ub'" --data-urlencode "outFields=*" \
  --data-urlencode "returnGeometry=false" --data-urlencode "f=json"
# what polygon contains this lon/lat?
curl -sS "$L/query" --data-urlencode "geometry=-77.0369,38.9072" --data-urlencode "geometryType=esriGeometryPoint" \
  --data-urlencode "inSR=4326" --data-urlencode "spatialRel=esriSpatialRelIntersects" \
  --data-urlencode "outFields=*" --data-urlencode "returnGeometry=false" --data-urlencode "f=json"
# count only
curl -sS "$L/query?where=1%3D1&returnCountOnly=true&f=json"
```
Using `curl --data-urlencode` sends a POST with form encoding; ArcGIS accepts GET or POST for `/query` and POST avoids URL-length limits on long geometries.

## Core parameters
| Param | Purpose / values |
|---|---|
| `where` | SQL-92 WHERE. `1=1` = everything. Strings in single quotes. `LIKE '%x%'`, `IN (...)`, `IS NULL`, `BETWEEN`. Dates: `field = timestamp '2015-02-09 13:00:00'` or `field >= CURRENT_TIMESTAMP - INTERVAL '7' DAY`. |
| `objectIds` | Comma list of OIDs (keep under 1000 per call). |
| `outFields` | `*` or comma list. Prefer a list; `*` is slower and bigger. |
| `returnGeometry` | `true`/`false`. Set `false` unless you need shapes. |
| `outSR` | wkid for returned geometry, e.g. `4326`. Layers are often `3857`/`102100` natively. |
| `geometry` + `geometryType` + `inSR` | Spatial filter. Point: `geometry=x,y&geometryType=esriGeometryPoint`. Envelope: `geometry=xmin,ymin,xmax,ymax&geometryType=esriGeometryEnvelope`. Polygon/polyline: Esri JSON `{"rings":[[...]]}` / `{"paths":[[...]]}`. `inSR` defaults to the layer SR, so pass `inSR=4326` when using lon/lat. |
| `spatialRel` | `esriSpatialRelIntersects` (default), `Contains`, `Within`, `Crosses`, `Touches`, `Overlaps`, `EnvelopeIntersects`, `IndexIntersects`, `Relation` (+`relationParam`). |
| `distance` + `units` | Buffer the input geometry: `distance=100&units=esriSRUnit_Meter` (also `_Foot`, `_Kilometer`, `_StatuteMile`, `_NauticalMile`, `_USNauticalMile`). Needs `supportsQueryWithDistance`. Default unit is foot on Enterprise, metre on Online, so always set `units`. |
| `orderByFields` | `FIELD ASC, FIELD2 DESC`. Needs `supportsAdvancedQueries`. |
| `resultOffset` + `resultRecordCount` | Paging (needs `supportsPagination`). Keep the same `where`+`orderByFields` across pages. |
| `returnCountOnly` | `{"count":N}`. |
| `returnIdsOnly` | `{"objectIdFieldName":..,"objectIds":[...]}` up to 1,000,000 IDs. |
| `returnExtentOnly` | bounding box of matches (needs `supportsReturningQueryExtent`). |
| `returnDistinctValues` | distinct combos of `outFields`; set `returnGeometry=false`. |
| `outStatistics` + `groupByFieldsForStatistics` + `havingClause` | Aggregates (see below). |
| `returnCentroid` | polygon centroids alongside/instead of rings. |
| `geometryPrecision` | decimal places in x/y (e.g. `6` for lon/lat). |
| `maxAllowableOffset` | generalise geometry, in `outSR` units. |
| `returnZ`, `returnM`, `returnTrueCurves`, `returnEnvelope` | as named. |
| `time` | `ms` instant or `start,end` for time-aware layers (`null` = open-ended). |
| `gdbVersion`, `historicMoment`, `datumTransformation`, `sqlFormat`, `quantizationParameters`, `resultType`, `multipatchOption`, `fullText` | advanced; see `reference.md`. |
| `f` | `json` (default response type otherwise is HTML), `pjson`, `geojson`, `pbf`. |

## Statistics
```
outStatistics=[{"statisticType":"count","onStatisticField":"OBJECTID","outStatisticFieldName":"n"},
               {"statisticType":"sum","onStatisticField":"SHAPE.AREA","outStatisticFieldName":"area"}]
groupByFieldsForStatistics=TYPEDESC
orderByFields=n DESC
returnGeometry=false
```
Types: `count`, `sum`, `min`, `max`, `avg`, `stddev`, `var`, plus `PERCENTILE_CONT`/`PERCENTILE_DISC` with `statisticParameters:{"value":0.9,"orderBy":"ASC"}` when `supportsPercentileStatistics`. `havingClause` uses aggregate functions, e.g. `COUNT(OBJECTID) > 10`.

## Paging past `maxRecordCount`
Responses cap at the layer's `maxRecordCount` (commonly 1000/2000) and set `"exceededTransferLimit": true`. Two strategies:
1. **Offset paging** (if `supportsPagination`): loop `resultOffset += resultRecordCount` until `exceededTransferLimit` is absent/false or a page comes back short.
2. **ID chunking** (always works): `returnIdsOnly=true`, then request `objectIds=` in chunks of ≤1000.

```ts
export async function queryAll(layer: string, params: Record<string,string>, pageSize = 1000) {
  const feats: any[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const body = new URLSearchParams({ f: "json", where: "1=1", outFields: "*", ...params,
      resultOffset: String(offset), resultRecordCount: String(pageSize) });
    const j = await (await fetch(`${layer}/query`, { method: "POST", body })).json();
    if (j.error) throw new Error(`${j.error.code}: ${j.error.message}`);
    feats.push(...j.features);
    if (!j.exceededTransferLimit || j.features.length < pageSize) return feats;
  }
}
```

## Response shape (`f=json`)
```json
{"objectIdFieldName":"OBJECTID","geometryType":"esriGeometryPolygon","spatialReference":{"wkid":4326},
 "fields":[{"name":"TYPE","type":"esriFieldTypeString","alias":"Type","length":16}],
 "features":[{"attributes":{"TYPE":"Ub"},"geometry":{"rings":[[[x,y],...]]}}],
 "exceededTransferLimit":true}
```
- Points: `geometry.x/y`; lines: `geometry.paths`; polygons: `geometry.rings`.
- `esriFieldTypeDate` values are epoch **milliseconds** UTC. Empty result sets omit `fields`.
- `f=geojson` with `outSR=4326` gives RFC 7946 FeatureCollection (easiest for web maps/Turf).

## Gotchas
- Errors arrive as HTTP 200 `{"error":{"code":400,"message":"...","details":[...]}}`. Always check.
- Field names in `outFields`/`where` are the `name`, not the `alias`. Some names contain dots (`SHAPE.AREA`); quote nothing, just use them as-is.
- Without `inSR`, a lon/lat point is interpreted in the layer SR (often Web Mercator metres) and matches nothing.
- `returnDistinctValues=true` must have `returnGeometry=false`.
- URL-encode `=` as `%3D` and `'` as `%27` in GET URLs, or use POST form data.
- Respect `maxRecordCount`; asking for more than it in `resultRecordCount` is silently clamped.
- Full parameter reference with every advanced option: `reference.md` in this folder.
