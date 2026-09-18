---
name: dc-gis-soil
description: Look up USDA/NRCS soil type, slope class, and map unit key (MUKEY) for any point, parcel, or area in Washington, DC from the DC GIS "Soil Type" layer. Use for site assessments, drainage/foundation questions, environmental screening, or when asked what soil is at a DC address or coordinate.
---

# DC GIS Soil Type layer

Public ArcGIS MapServer layer, no key needed. Source: USDA Natural Resources Conservation Service (SSURGO digital soil survey), served by DC Office of the CTO.

```
Service: https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Environment_Land_WebMercator/MapServer
Layer 17: Soil Type            (polygons, the one to use)
Layer 18: Soil Type by Slope   (same data, symbolised by SLOPE)
```
Layer facts (verified): `geometryType=esriGeometryPolygon`, native SR `102100`/`3857` (Web Mercator), `maxRecordCount=2000`, 2,648 polygons, pagination/statistics/distinct/distance all supported, formats `JSON, geoJSON, PBF`.

## Fields
| Field | Type | Meaning | Example |
|---|---|---|---|
| `TYPE` | string(16) | Soil map unit symbol without slope letter | `Mc` |
| `TYPEDESC` | string(100) | Soil series / complex name | `Manor channery loam` |
| `DESC_` | string(100) | Full description incl. slope range | `Manor channery loam, 8 to 15 percent slopes` |
| `SLOPE` | string(5) | Slope class letter: `A` 0–3%, `B` 0–8% (or 3–8%), `C` 8–15%, `D` 15–25%, `E` 25–45%+; blank for urban land | `C` |
| `SLOPEDESC` | string(100) | Slope class text | `8 to 15 percent slopes` |
| `TYPE_ORIG` | string(5) | Original SSURGO map unit symbol (TYPE + slope) | `McC` |
| `MUKEY` | string(30) | NRCS Map Unit Key; join key to SSURGO / Web Soil Survey tables | `128629` |
| `GIS_ID` | string(50) | DC GIS row id | `SoilPly_1` |
| `GLOBALID` | GlobalID | | |
| `CREATED`, `EDITED` | date (epoch ms) | usually null | |
| `SHAPE.AREA`, `SHAPE.LEN` | double | may be 0 in attribute-only responses | |
| `OBJECTID` | OID | | |

Common `TYPEDESC` values in DC: `Urban Land` (`Ub`, most of downtown, no slope), Manor, Glenelg, Chillum, Beltsville, Sassafras, Christiana, Keyport, Woodstown, Codorus, Udorthents, and their `-urban land complex` variants.

## Recipes (all via the `arcgis-feature-query` skill)
Point lookup (lon, lat):
```bash
L="https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Environment_Land_WebMercator/MapServer/17"
curl -sS "$L/query" --data-urlencode "geometry=-77.0369,38.9072" --data-urlencode "geometryType=esriGeometryPoint" \
  --data-urlencode "inSR=4326" --data-urlencode "spatialRel=esriSpatialRelIntersects" \
  --data-urlencode "outFields=TYPE,TYPEDESC,DESC_,SLOPE,SLOPEDESC,TYPE_ORIG,MUKEY" \
  --data-urlencode "returnGeometry=false" --data-urlencode "f=json"
# → {"features":[{"attributes":{"TYPE":"Ub","TYPEDESC":"Urban Land","SLOPE":" ", ... "MUKEY":"128672"}}]}
```
Parcel / polygon overlap (pass the parcel ring in lon/lat):
```
geometry={"rings":[[[-77.05,38.90],[-77.04,38.90],[-77.04,38.91],[-77.05,38.91],[-77.05,38.90]]],"spatialReference":{"wkid":4326}}
geometryType=esriGeometryPolygon&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=TYPEDESC,SLOPEDESC,MUKEY&returnGeometry=true&outSR=4326&f=geojson
```
Within 100 m of a point: add `distance=100&units=esriSRUnit_Meter` to the point query.
Distinct soil names: `where=1=1&outFields=TYPEDESC&returnDistinctValues=true&returnGeometry=false&orderByFields=TYPEDESC&f=json`.
Area by soil type (Web Mercator m², approximate): `outStatistics=[{"statisticType":"sum","onStatisticField":"SHAPE.AREA","outStatisticFieldName":"area_m2"}]&groupByFieldsForStatistics=TYPEDESC&f=json`.

## Interpretation notes
- `Urban Land` / `-urban land complex` means the natural profile is disturbed or covered; NRCS gives no engineering properties. Say so rather than inventing drainage or bearing values.
- Slope letters apply to the SSURGO map unit, not the exact parcel; for a specific point use `arcgis-elevation` to compute local slope.
- For hydric rating, drainage class, hydrologic soil group, or depth to water table, take the `MUKEY` to NRCS Soil Data Access (`https://sdmdataaccess.sc.egov.usda.gov/`) or Web Soil Survey; this layer only carries names and slope.
- A point in the Potomac/Anacostia or outside DC returns an empty `features` array, not an error.
- Attribute DC GIS / NRCS when publishing results (`copyrightText`: U.S. Department of Agriculture, Natural Resources Conservation Service).
