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
