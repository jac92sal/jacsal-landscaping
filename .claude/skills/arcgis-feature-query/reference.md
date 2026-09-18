# ArcGIS `/query` full parameter reference (condensed from Esri REST docs)

Applies to Map Service and Feature Service layer `query` operations. Support for advanced options is advertised per layer in the layer resource under `advancedQueryCapabilities` (e.g. `supportsPagination`, `supportsStatistics`, `supportsPercentileStatistics`, `supportsHavingClause`, `supportsOrderBy`, `supportsDistinct`, `supportsQueryWithDistance`, `supportsReturningQueryExtent`, `supportsReturningGeometryCentroid`, `supportsQueryWithDatumTransformation`, `supportsSqlExpression`, `supportsDefaultSR`, `supportsReturningGeometryEnvelope`, `supportsFullTextSearch`, `supportsCurrentUserQueries`, `supportsResultPaginationToken`).

## Filters
- `where` — SQL-92 WHERE on layer fields. Spatiotemporal stores support only `<= >= < > = != <> LIKE AND OR IS IS NOT IN NOT IN BETWEEN`. Also `shape is null` / `shape is not null`. `current_user` keyword (Enterprise, `supportsCurrentUserQueries`). `9999=9999` + `returnCountOnly=true` gives a fast approximate count on non-hosted Pro-published services.
- `objectIds` — comma-separated. Performance drops past ~1000 on enterprise geodatabases.
- `geometry`, `geometryType` (`esriGeometryPoint|Multipoint|Polyline|Polygon|Envelope`, default Envelope), `inSR` (wkid or SR JSON; defaults to layer SR), `spatialRel` (`esriSpatialRelIntersects|Contains|Crosses|EnvelopeIntersects|IndexIntersects|Overlaps|Touches|Within|Relation`), `relationParam` (DE-9IM string like `FFFTTT***`, only with `Relation`, not on Enterprise hosted).
- `distance`, `units` — geodesic buffer of input geometry (`esriSRUnit_Meter|StatuteMile|Foot|Kilometer|NauticalMile|USNauticalMile`).
- `time` — `<instant>` or `<start>,<end>` in epoch ms; `null` = infinity.
- `historicMoment` — epoch ms, archive-enabled layers (`supportsQueryWithHistoricMoment`).
- `gdbVersion` — e.g. `SDE.DEFAULT` when `isDataVersioned`.
- `fullText` — JSON array of `{onFields:[..]|["*"], searchTerm, searchType:"simple"|"prefix"|"native", operator:"and"|"or"|"not", searchOperator:"and"|"or"}` and/or `{sqlExpression:"..."}` (11.4+, needs full-text index on string fields; see `fullTextSearchableFields`).
- `uniqueIds`, `returnUniqueIdsOnly` — string-ID stores (11.5+).

## Output control
- `outFields` — comma list or `*`; SQL expressions allowed when `supportsOutFieldSqlExpression`.
- `returnGeometry` (default true), `outSR`, `defaultSR` (11.3+, sets SR for inSR/outSR/quantization at once), `geometryPrecision`, `maxAllowableOffset`, `returnZ`, `returnM`, `returnTrueCurves`, `returnCentroid` (polygons), `returnEnvelope` (11.3+, lines/polygons), `multipatchOption` (`xyFootprint|stripMaterials|embedMaterials|externalizeTextures|extent`).
- `returnIdsOnly`, `returnCountOnly` (also returns extent), `returnExtentOnly`, `returnDistinctValues`.
- `orderByFields` — `f1 ASC, f2 DESC`; only layer fields if `supportsOrderByOnlyOnLayerFields`.
- `outStatistics` — array of `{statisticType, onStatisticField, outStatisticFieldName}`; with it only `groupByFieldsForStatistics`, `orderByFields`, `time`, `returnDistinctValues`, `where`, `havingClause` may be used. `outStatisticFieldName` must be alphanumeric/underscore and not a DBMS reserved word.
- `havingClause` — aggregate functions `AVG|COUNT|SUM|STDDEV|MIN|MAX|VAR` over fields, not over out-stat aliases.
- `resultOffset`, `resultRecordCount` — paging; `resultRecordCount` ≤ `maxRecordCount`, ≥1.
- `resultType` — `none|standard|tile`; picks `maxRecordCount` vs `standardMaxRecordCount`/`tileMaxRecordCount`. `returnExceededLimitFeatures=false` with `tile` returns nothing when over limit.
- `resultPaginationToken` — 12.1 OpenSearch/Elastic/spatiotemporal: first call `true`, then pass returned token until `exceededTransferLimit:false`; cannot combine with `resultOffset`; keep `orderByFields` identical each call.
- `quantizationParameters` — `{mode:"view"|"edit", originPosition:"upperLeft"|"lowerLeft", tolerance, extent}` snaps coordinates to a grid (default 10,000×10,000 if no tolerance/maxAllowableOffset).
- `datumTransformation` — wkid, `{wkt}`, or `{geoTransforms:[{wkid|wkt, transformForward}]}` (10.8+).
- `sqlFormat` — `none|standard|native` (native only when `useStandardizedQuery=false`).
- `timeReferenceUnknownClient=true` — required to query layers whose `datesInUnknownTimeZone` is true.
- `f` — `html` (default) | `json` | `pjson` | `geojson` | `pbf`. `geojson` unsupported with `returnM=true`; RFC 7946-compliant only when `outSR` is unset or 4326.

## Date/time semantics
- Field types: `esriFieldTypeDate` (epoch ms, assumed in `dateFieldsTimeReference` TZ; returned UTC), `esriFieldTypeDateOnly` (`date 'yyyy-mm-dd'`), `esriFieldTypeTimeOnly` (`time 'HH24:mm:ss'`), `esriFieldTypeTimestampOffset` (`timestamp 'yyyy-mm-dd HH24:mm:ss -TZH:TZM'`, returned ISO 8601 with offset; `cast(f as timestamp) = timestamp '...'` matches wall-clock time instead of absolute).
- Query literal: `field = timestamp '2015-02-09 13:00:00'` in the layer's `dateFieldsTimeReference` zone (null → UTC). Editor-tracking fields use `editFieldsInfo.dateFieldsTimeReference`.
- Relative: `field >= CURRENT_TIMESTAMP - INTERVAL '3 05:32:28' DAY TO SECOND`, also `INTERVAL '7' DAY`, `'HH' HOUR`, `'MI' MINUTE`, `'SS' SECOND`, `'DD HH' DAY TO HOUR`, `'DD HH:MI' DAY TO MINUTE`, `'HH:MI' HOUR TO MINUTE`, `'MI:SS' MINUTE TO SECOND`, and `CURRENT_DATE`.

## Response variants
- Feature set: `objectIdFieldName, globalIdFieldName, geometryType, spatialReference, hasZ, hasM, fields[], features[{attributes, geometry, centroid?, envelope?}], exceededTransferLimit?`
- `returnCountOnly`: `{count}`; with `returnExtentOnly`: `{count, extent}`
- `returnIdsOnly`: `{objectIdFieldName, objectIds[]}`
- Control points: `geometry.ids` arrays parallel to vertices (1 = control point).
- Multipatch `extent` option with `returnZ`: five-point 3D extent polygon; `heightModelInfo` describes vertical units.
- `returnUniqueIdsOnly`: `{uniqueIdFieldNames, uniqueIds[]}`; string-ID layers expose a server-generated integer `hash_id` as OID.
