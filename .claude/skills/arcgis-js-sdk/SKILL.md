---
name: arcgis-js-sdk
description: Build interactive 2D maps and 3D scenes in the browser with the ArcGIS Maps SDK for JavaScript 5.x (web components such as arcgis-map / arcgis-scene, $arcgis.import for core modules, Calcite UI, BuildingSceneLayer from Revit/BIM with the Slice tool). Use when asked for a live map or 3D building viewer in a web page or React app, a WebMap/WebScene embed, graphics on a map, or exploring a BIM model in the browser; not for server-side or static-image maps (see arcgis-static-maps).
---

# ArcGIS Maps SDK for JavaScript (5.1)

Web components are the primary API since 5.0; the older "widgets" are legacy. Version pin: `5.1` (patch versions as `5.1.x`). Verified 2026-09-18: CDN `https://js.arcgis.com/5.1/` and npm `@arcgis/core`, `@arcgis/map-components`, `@arcgis/create` at 5.1.24, `@esri/calcite-components` at 5.1.2.

## Auth
Basemaps and location services need an ArcGIS Location Platform **API key** with the Basemaps privilege (and Elevation for 3D ground). In the browser the key is exposed, so restrict it by **Referrers** in the dashboard (browsers send `Referer` automatically). Set it before any component loads:
```html
<script type="module">
  const esriConfig = await $arcgis.import("@arcgis/core/config.js");
  esriConfig.apiKey = "AAPT...";   // referrer-restricted key, never an OAuth client secret
</script>
```
Public layers (e.g. DC GIS MapServers) need no key.

## Minimal CDN page (2D)
```html
<!doctype html><html><head>
  <script type="module" src="https://js.arcgis.com/5.1/"></script>
  <style>html,body{height:100%;margin:0}</style>            <!-- last thing in <head> -->
</head><body>
  <arcgis-map basemap="arcgis/topographic" center="-77.0369,38.9072" zoom="12">
    <arcgis-zoom slot="top-left"></arcgis-zoom>
    <arcgis-search slot="top-right"></arcgis-search>
  </arcgis-map>
  <script type="module">
    const Graphic = await $arcgis.import("@arcgis/core/Graphic.js");
    const el = document.querySelector("arcgis-map");
    await el.viewOnReady();                                   // view exists after this
    el.graphics.add(new Graphic({
      geometry: { type: "point", longitude: -77.0369, latitude: 38.9072 },
      symbol: { type: "simple-marker", color: "#2f6fed", size: 10, outline: { color: "white", width: 1 } },
      attributes: { name: "Site" }, popupTemplate: { title: "{name}" },
    }));
  </script>
</body></html>
```
- Use `item-id="<WebMap id>"` instead of `basemap/center/zoom` to load a saved WebMap/WebScene; then basemap and extent come from the item.
- `$arcgis.import(path | path[])` is CDN-only; with npm use normal ES imports (`import Graphic from "@arcgis/core/Graphic.js"`).
- Components accept attributes (kebab-case) or properties (camelCase). Watch changes with `reactiveUtils.watch(() => el.view.stationary, ...)`.
- Legacy widgets or a programmatic `MapView` still need `<link rel="stylesheet" href="https://js.arcgis.com/5.1/esri/themes/light/main.css">`; theme via Calcite modes (`class="calcite-mode-dark"`).

## Feature layers from a REST endpoint
```js
const FeatureLayer = await $arcgis.import("@arcgis/core/layers/FeatureLayer.js");
el.map.add(new FeatureLayer({
  url: "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Environment_Land_WebMercator/MapServer/17", // DC soil
  outFields: ["TYPEDESC", "SLOPEDESC", "MUKEY"],
  popupTemplate: { title: "{TYPEDESC}", content: "{SLOPEDESC} · MUKEY {MUKEY}" },
  definitionExpression: "SLOPE <> ' '",
}));
```
`layer.queryFeatures({ geometry, spatialRelationship: "intersects", outFields: ["*"], returnGeometry: true })` mirrors the REST `/query` parameters (see `arcgis-feature-query`).

## 3D: Scene + BuildingSceneLayer (Revit / BIM) + Slice
```html
<arcgis-scene basemap="arcgis/imagery" ground="world-elevation" camera-position="-117.1957,34.0561,400" camera-tilt="60">
  <arcgis-slice slot="top-right"></arcgis-slice>
  <arcgis-layer-list slot="top-left"></arcgis-layer-list>
</arcgis-scene>
<script type="module">
  const BuildingSceneLayer = await $arcgis.import("@arcgis/core/layers/BuildingSceneLayer.js");
  const scene = document.querySelector("arcgis-scene");
  await scene.viewOnReady();
  const building = new BuildingSceneLayer({
    url: "https://tiles.arcgis.com/tiles/V6ZHFr6zdgNZuVG0/arcgis/rest/services/BSL__4326__US_Redlands__EsriAdminBldg_PublicDemo/SceneServer",
    title: "Administration Building (Revit → BuildingSceneLayer)",
  });
  scene.map.layers.add(building);
  await building.load();
  // Show the full model instead of the exterior shell. modelName is the I3S standard name and never changes.
  building.allSublayers.forEach((l) => { if (l.modelName === "FullModel") l.visible = true; if (l.modelName === "Overview") l.visible = false; });
  // Component sublayers behave like SceneLayers: renderer, popups, definitionExpression.
  const doors = building.allSublayers.find((l) => l.modelName === "Doors");
  if (doors) doors.renderer = { type: "simple", symbol: { type: "mesh-3d", symbolLayers: [{ type: "fill", material: { color: "red" } }] } };
  // Keep a discipline out of the slice so it stays visible inside the cut.
  const slice = document.querySelector("arcgis-slice");
  const structural = building.allSublayers.find((l) => l.modelName === "Structural");
  if (structural) slice.excludedLayers.add(structural);
  // Or define the cut programmatically:
  const SlicePlane = await $arcgis.import("@arcgis/core/analysis/SlicePlane.js");
  slice.shape = new SlicePlane({ position: { spatialReference: { wkid: 4326 }, x: -117.1957, y: 34.0561, z: 400 }, tilt: 90, width: 60, height: 30, heading: 0 });
</script>
```
BuildingSceneLayer structure: `Overview` (shell) and `FullModel` group sublayers; `FullModel` holds disciplines (Architectural, Structural, Electrical, Mechanical) which hold `BuildingComponentSublayer`s (Walls, Doors, Columns, Foundation, …). Use `allSublayers` (flat) and match on `modelName`, not `title`. The Building Explorer component (`arcgis-building-explorer`) filters by discipline/level/phase.

## Elevation: ground, ElevationLayer, queryElevation, profiles
`ElevationLayer` is a tiled ImageServer layer that lives in `map.ground.layers`, never in the operational layers. `ground="world-elevation"` on `<arcgis-scene>` is shorthand for the Esri world terrain service `https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer` (needs the Elevation privilege on the API key).
```html
<arcgis-scene basemap="arcgis/topographic" ground="world-elevation" camera-position="-121.85,48.28,4000" camera-tilt="55">
  <arcgis-elevation-profile slot="top-right"></arcgis-elevation-profile>
</arcgis-scene>
<script type="module">
  const [ElevationLayer, Multipoint, Point] = await $arcgis.import([
    "@arcgis/core/layers/ElevationLayer.js",
    "@arcgis/core/geometry/Multipoint.js",
    "@arcgis/core/geometry/Point.js",
  ]);
  const scene = document.querySelector("arcgis-scene");
  await scene.viewOnReady();

  // 1) Extra terrain source stacked on top of world elevation (later layers win where they have data).
  const lidar = new ElevationLayer({
    url: "https://sampleserver6.arcgisonline.com/arcgis/rest/services/OsoLandslide/OsoLandslide_After_3DTerrain/ImageServer",
    title: "Post-slide LiDAR", visible: false,
  });
  scene.ground.when(() => scene.ground.layers.add(lidar));     // wait for the Ground instance
  toggle.addEventListener("calciteSwitchChange", () => (lidar.visible = toggle.checked));
  // Flat scene: hide every ground layer (or set ground="none" / ground.opacity).
  // scene.ground.layers.forEach((l) => (l.visible = false));

  // 2) Query elevation for points (works on a layer OR on scene.map.ground, which merges all ground layers).
  const pts = new Multipoint({ points: [[-77.03, 38.89], [-77.04, 38.90]] });   // [lon, lat], WGS84 default
  const r = await scene.map.ground.queryElevation(pts, { demResolution: "auto", returnSampleInfo: true });
  r.geometry.points.forEach(([x, y, z], i) => console.log(x, y, Math.round(z), "m @", r.sampleInfo[i].demResolution, "m/px"));
  // Polyline: r.geometry.paths[*][i][2] is z; ascent/descent = sum of consecutive z deltas.
  // Single point: (await lidar.queryElevation(new Point({ longitude: -121.85, latitude: 48.28 }))).geometry.z
  // noDataValue is returned when a sample falls outside the service; check r.noDataValue.

  // 3) Many samples in one area: build a cached sampler once, then sample synchronously.
  const sampler = await lidar.createElevationSampler(scene.extent, { demResolution: "finest-contiguous" });
  const z = sampler.queryElevation(new Point({ longitude: -121.85, latitude: 48.28 })).z;

  // 4) Profile component: ground vs scene (buildings) along a drawn or supplied line.
  const profile = document.querySelector("arcgis-elevation-profile");
  profile.profiles = [{ type: "ground" }, { type: "scene" }];
  // profile.input = new Graphic({ geometry: polyline }) to skip interactive drawing.
</script>
```
`demResolution`: `"auto"` (default, picks resolution from the geometry extent), `"finest-contiguous"` (best resolution that covers the whole geometry), or a number in metres. `ElevationLayer.fetchTile(level,row,col)` returns `{ values: Float32Array, width, height }` for raw tile math; `layer.sourceJSON` exposes the full ImageServer metadata. Custom services on another domain need CORS (ArcGIS Server ≥10.1 enables it by default). Server-side equivalents: the `arcgis-elevation` skill (Elevation REST API, up to 100 points) does the same without a browser.

Layer placement on terrain: set `layer.elevationInfo = { mode: "on-the-ground" | "relative-to-ground" | "relative-to-scene" | "absolute-height", offset, featureExpressionInfo }` on FeatureLayer/GraphicsLayer/SceneLayer; `relative-to-scene` drapes points on top of buildings from BuildingSceneLayers/IntegratedMesh.

## npm / Vite / React
```bash
npx @arcgis/create -n my-map -t react      # or -t vite | angular | vue | webpack | cdn | node
npm i @arcgis/map-components @arcgis/core @esri/calcite-components
```
```ts
import "@arcgis/map-components/components/arcgis-map";     // registers the element
import "@arcgis/map-components/components/arcgis-zoom";
// JSX: <arcgis-map basemap="arcgis/streets" center="-77.03,38.9" zoom="12" onarcgisViewReadyChange={(e) => { const view = e.target.view }} />
```
Vite needs no special plugin; the SDK ships ES modules and loads its assets from the CDN by default (`esriConfig.assetsPath` to self-host). TypeScript types come with the packages.

## Gotchas
- Don't put `<style>` before the CDN `<script>`; the SDK injects its own CSS and yours must come last.
- `viewOnReady()` resolves when the view exists, not when layers have loaded; `await layer.load()` / `view.whenLayerView(layer)` for that.
- Coordinates in attributes are `lon,lat`; geometry objects are `{ longitude, latitude }` or `{ x, y, spatialReference }`.
- Basemap enum names are `arcgis/streets`, `arcgis/topographic`, `arcgis/imagery`, `arcgis/navigation`, `arcgis/light-gray`, `arcgis/dark-gray`, `osm/standard`, etc.
- 3D needs WebGL2; BuildingSceneLayers are heavy, keep `Overview` visible until the user opts into `FullModel`.
- Attribution is rendered by the map component; do not hide `arcgis-attribution` in production.

## Reference
- Sample gallery (search by keyword): https://developers.arcgis.com/javascript/latest/sample-code/ — relevant slugs: `scene-elevationlayer`, `scene-toggle-elevation`, `elevation-query-points`, `elevation-query` (lines, with routing), `elevation-profile`, `elevation-profile-group`, `analysis-elevation-profile`, `elevation-analysis` (raster functions), `scene-elevationinfo`, `building-scene-layer-slice`, `building-scene-layer-filter`, `building-scene-layer-building-filter`, `intro-sceneview`, `scene-goto`, `scene-hittest`, `scene-underground`, `scene-shadow`.
- API reference: https://developers.arcgis.com/javascript/latest/references/core/ (e.g. `.../layers/ElevationLayer/`, `.../Ground/`, `.../layers/BuildingSceneLayer/`).
