# Location map layout: nodes on a flat map or a globe

Status: proposal, 2026-10-22, with a prototype on branch `feat/location-map-prototype`; section
15.3 lists what the prototype's 2026-10-22 review changed.

## 1. Summary

A new built-in layout in graphty-element, `location-map`, places every node at the place its data
names: a latitude and longitude, a coordinate string in one of several common spellings, a
geohash or plus code, or (with help) a place name. Under the graph the element draws a map: a flat
map, or in 3D a globe. Edges are flat straight lines on a flat map in the 2D view, raised arcs over
a flat map in the 3D view, and raised great-circle arcs on the globe.

The map is a picture under the graph, not a replacement for it. Nodes stay graphty nodes, with
every shape, color, effect, shader and label a style layer can give them, and every other layout,
algorithm and selection keeps working on the same graph. A reader can switch from a force layout
to the map and back, and the nodes travel to and from their places.

Everything lives in graphty-element: reading the location field, converting it, projecting it,
loading and drawing map tiles, level of detail, arcs and attribution. The graphty app only shows
controls that set the element's options. A third-party consumer turns the feature on by setting
two options and needs no other package, no key and no server.

The recommendation, in one paragraph: write the projection, tile selection and tile drawing in
graphty-element itself (about 1,000 to 1,500 lines, lazily loaded), because no maintained
Babylon.js slippy-map or globe library exists and the heavyweight alternatives (CesiumJS,
MapLibre GL JS, deck.gl) are whole rendering engines. Reuse small, permissively licensed parsers
for the coordinate spellings that need one (`coordinate-parser`, `ngeohash`, `open-location-code`,
`mgrs`). Ship with a bundled, public-domain world image as the default map, so the default
contacts no third party, and offer named free tile sources (OpenStreetMap, OpenFreeMap, NASA GIBS,
OpenTopoMap, USGS) and keyed ones (Stadia, MapTiler, Mapbox, Esri, Google) as one option.

Grounding in this repository:

- Two developer personas ask for it: `design/designloom/personas/supply-chain-analyst.yaml`
  ("Overlays geographic data to identify concentration risks by region"; "Geographic
  visualization options are limited") and `design/designloom/personas/intelligence-analyst.yaml`
  ("Uses geographic overlays to correlate digital connections with physical proximity"). Workflow
  `design/designloom/workflows/W11.yaml` needs "Geographic locations of all entities".
- `design/extensions/candidates.md` section 17 already decided that basemaps are not an extension
  point: "every consumer with geographic data needs it, so the element should ship it." Section 20
  recommends element-owned great-circle and arc edges "because every geographic layout would
  otherwise reimplement it". This design follows both.
- graph-samples already ships datasets with `latitude` and `longitude` node columns in degrees
  (`contiguous-usa`, `knuth-miles`, `openflights`, `road-ny`), two of which list "geographic layout
  from latitude and longitude" as a showcase. They are the test and demo data.
- No GitHub issue and no design document covers a map layout today (searched 2026-10-22).

## 2. The consumer API

### 2.1 The simplest example

```html
<graphty-element id="g" style="display:block;width:800px;height:500px"></graphty-element>
<script type="module">
    import "@graphty/graphty-element";

    const g = document.getElementById("g");
    g.nodeData = [
        { id: "SFO", where: "37.619, -122.375" },
        { id: "JFK", where: "40 38 23 N, 73 46 44 W" },
        { id: "LHR", where: "gcpsvq" }, // a geohash
    ];
    g.edgeData = [
        { source: "SFO", target: "JFK" },
        { source: "JFK", target: "LHR" },
    ];
    g.layout = "location-map";
    g.layoutConfig = { location: "where" };
</script>
```

That is the whole integration. It shows the three airports on the bundled world map, framed to the
data, in the default 3D view with arcs between them. Setting `view-mode="2d"` gives a flat map with
straight edges. Nothing in the example names a projection, a tile, a texture or a parser.

### 2.2 Choosing the map and its dimension

```js
g.layoutConfig = { location: "where", mapDimension: "2d" }; // or "3d" (the default): the globe in 3D
// The layout's `map` option picks the picture (decided 2026-10-22; see section 15.1):
g.layoutConfig = { location: "where", map: { source: "openstreetmap" } }; // a named free source
g.layoutConfig = {
    location: "where",
    map: { tiles: "https://tiles.example.com/{z}/{x}/{y}.png", attribution: "(c) Example" },
};
g.layoutConfig = {
    location: "where",
    map: {
        image: "/floorplan.png",
        bounds: [
            [-122.52, 37.7],
            [-122.35, 37.83],
        ],
    },
};
g.layoutConfig = { location: "where", map: { source: "none" } }; // the layout without a picture
```

### 2.3 What is added to the public API

All of it is additive; nothing existing changes.

The layout `location-map`, in the layout catalog (`graphty-element/src/catalog/layouts.ts`) and in
`KNOWN_LAYOUT_IDS` (`graphty-element/src/catalog/types.ts`). Its options:

| Option         | Type                  | Default    | Meaning                                                                                                                                                                                                                                |
| -------------- | --------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `location`     | node attribute        | null       | One field holding a whole location (a pair, a string, a GeoJSON Point, a code).                                                                                                                                                        |
| `latitude`     | node attribute        | null       | Separate latitude column, used with `longitude` instead of `location`.                                                                                                                                                                 |
| `longitude`    | node attribute        | null       | Separate longitude column.                                                                                                                                                                                                             |
| `format`       | enum                  | `"auto"`   | `auto`, `decimal`, `lon-lat` (decimal pair with longitude first), `dms`, `iso6709`, `geojson`, `wkt`, `geohash`, `plus-code`, `mgrs`, `utm`, `place-name`. `auto` detects per column, below.                                           |
| `mapDimension` | enum                  | `"3d"`     | `3d` (a globe) or `2d` (a flat map) in the 3D view. The 2D view always draws the 2D map, whatever this says, and keeps the value for the 3D view. Owner decision 2026-10-23: the map follows the 2D/3D mode, no flat-map/globe choice. |
| `projection`   | enum                  | `"auto"`   | Flat surface only: `auto`, `web-mercator`, `equirectangular`, `equal-earth`, `albers-usa`, `transverse-mercator`. `auto` is Web Mercator, which matches every web tile source.                                                         |
| `extent`       | enum or bounds        | `"data"`   | `data` fits the projection and the map to the located nodes plus a margin; `world` shows the whole map; `[[west, south], [east, north]]` fixes it.                                                                                     |
| `size`         | number                | 100        | Scene units across the shown extent (flat) or the globe's radius (globe).                                                                                                                                                              |
| `unplaced`     | enum                  | `"tray"`   | Nodes with no usable location: `tray` puts them in a row beside the map, `leave` leaves them where the previous layout put them. They are never put at latitude 0, longitude 0 (`design/extensions/layout.md` already forbids that).   |
| `overlap`      | enum                  | `"spread"` | Nodes at exactly the same place: `spread` arranges them in a small spiral around the point, `stack` keeps them on it.                                                                                                                  |
| `geocoder`     | geocoder name or null | null       | For `place-name`: `"gazetteer"` (offline country, state and city names) or a keyed service. See section 4.5.                                                                                                                           |
| `nodeScale`    | enum                  | `"scene"`  | `scene`: node sizes are scene units and grow as the camera zooms in; `screen`: every node keeps its size on screen at any zoom, a size-1 node drawn as one unit is when the map's extent fills the view's height.                      |

The location options use the existing option type `"attribute"` with `on: "node"`, the same type the
algorithms' `weight` option uses (`WEIGHT_OPTION` in `graphty-element/src/catalog/algorithms.ts`),
so the graphty app's generic options form (`graphty/src/workspace/options/OptionsForm.tsx`) shows
an attribute picker for them with no new UI.

The layout option `map` (decided 2026-10-22, section 15.1; this section first proposed a separate
element property and project setting `basemap`), saved with the layout in the project file. A new
`map` on the applied layout swaps the picture without placing a node again. Its shape:

```ts
type Basemap =
    | { source: BasemapSourceId; key?: string; style?: string } // a named source
    | {
          tiles: string;
          attribution: string;
          maxZoom?: number;
          tileSize?: 256 | 512;
          projection?: "web-mercator" | "equirectangular";
          subdomains?: string[];
      }
    | { image: string; bounds: [[number, number], [number, number]]; attribution?: string }
    | { pmtiles: string; attribution: string } // later phase, section 7.4
    | { source: "none" };
```

A catalog of named sources, `basemapSources` in the `./catalog` entry, so an application can list
them (id, `plainName`, kinds offered, whether a key is needed, the provider's sign-up URL, the
attribution facts). Applications write their own words for them.

New warning codes in `graphty-element/src/errors/codes.ts`, emitted through
`SnapshotLayoutInput.warn` as the existing `layout-warning` event, and new basemap codes on a new
`basemap-status` event:

| Code                      | Params                                  | When                                                                        |
| ------------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| `W_LOCATION_UNPARSED`     | `{ missing, unparsed, total, samples }` | Some nodes have no value, or a value no format reads (samples: up to 8).    |
| `W_LOCATION_OUT_OF_RANGE` | `{ count, samples }`                    | Parsed, but latitude beyond +/-90 or longitude beyond +/-180.               |
| `W_LOCATION_AMBIGUOUS`    | `{ formats, column }`                   | `auto` matched two formats equally (for example a lat,lon or lon,lat pair). |
| `W_LOCATION_SWAPPED`      | `{ column }`                            | `auto` read a pair as longitude first because latitudes would exceed 90.    |
| `W_GEOCODE_PENDING`       | `{ pending, total }`                    | Place names are being looked up; nodes move as answers arrive.              |
| `W_GEOCODE_FAILED`        | `{ count, samples, reason }`            | Names the geocoder did not find, or a service error code.                   |
| `E_BASEMAP_KEY_REQUIRED`  | `{ source }`                            | A keyed source without a key.                                               |
| `E_BASEMAP_UNREACHABLE`   | `{ source, status }`                    | Tiles fail (CORS, 401, 403, 429); the bundled map is drawn instead.         |

Every one is `{ code, params }`, as the presentation-neutral rule requires; the app writes the
sentences (`graphty/src/workspace/layout/refusalWords.ts` is where layout codes get words today).

Read-only facts the element exposes for an application to show (a status chip, a legend):
`element.basemapStatus` (`{ source, state: "loading" | "ready" | "fallback", attribution: string[] }`)
and the layout's frame (section 5.4).

## 3. How it fits the existing code

- **The layout** is a static, single-pass layout written like `CircularLayout`
  (`graphty-element/src/layout/CircularLayoutEngine.ts`) as a `SnapshotLayoutEngine` subclass
  (`graphty-element/src/layout/SnapshotLayoutEngine.ts`), registered in
  `graphty-element/src/layout/index.ts`, with Zod options (`defineOptions` in
  `graphty-element/src/config/OptionsSchema.ts`) and an override that marks the three location
  options as `type: "attribute", on: "node"`, the way `GROUP_BY_OVERRIDE` does for `groupBy`. Its
  `compute(input)` reads the field with `input.column("location")` (which already resolves dotted
  paths like `geo.lat` and `data.<key>` and `results.<run>.<field>`), parses, projects and returns
  the `Float32Array` of positions, with NaN rows for unplaced nodes, and reports problems with
  `input.warn({ code, params })` exactly as `FixedLayout` reports `W_NO_POSITION`.
- **Positions** flow as for every layout: `ElementPositions` (`graphty-element/src/data/positions.ts`),
  `UpdateManager.redrawArrangement()`, `Node.update()`, `Node.setMeshPosition()`. Nothing about nodes
  changes, which is what keeps style layers working (section 6).
- **2D and 3D.** The layout gets `input.dimensions` from the view mode. In 2D it returns z = 0 and
  the map is 2D; `Graph.settleDimension` already flattens z. In 3D with `mapDimension: "2d"`
  the map lies in the x-y plane at z = 0 (the plane the 2D camera looks at, so switching views does
  not move the map) and nodes sit on it at z = 0; with `mapDimension: "3d"` (the default) nodes sit on a sphere.
- **The map** is a new manager, `BasemapManager` (`graphty-element/src/managers/BasemapManager.ts`),
  beside `RenderManager`, whose `applyBackground()` (`graphty-element/src/managers/RenderManager.ts`)
  is the closest existing piece: it already builds a `PhotoDome` from a URL. The basemap code is
  loaded with a dynamic `import()` on first use, the way `GraphvizLayoutEngine` loads its host, so
  the main entry does not grow.
- **Edges** gain one edge-style property (section 7) drawn by the existing line batches
  (`graphty-element/src/meshes/EdgeLineBatch.ts`) as more segments, the way curves are drawn today.
- **The graphty app** adds no logic: `location-map` appears in the Layout popover
  (`graphty/src/workspace/layout/LayoutPopover.tsx`) and its options in `LayoutForm.tsx` from the
  catalog; a Basemap control in `graphty/src/workspace/inspector/GraphSettings.tsx` beside the
  Background control writes `element.basemap`; keys go through the element's existing credential
  store (section 8.3).

## 4. Location field and formats

### 4.1 Which formats, and how each is read

- **Two numeric columns** -- example: `latitude: 40.64`, `longitude: -73.78`; auto-detected: Yes, by column name (lat, latitude, y; lon, lng, long, longitude, x) and range; converted offline: Yes; how: No library.
- **Decimal pair in one field** -- example: `"40.64, -73.78"`, `[40.64, -73.78]`; auto-detected: Yes; order checked by range; converted offline: Yes; how: No library.
- **GeoJSON Point** -- example: `{"type":"Point","coordinates":[-73.78,40.64]}`; auto-detected: Yes (`type: "Point"`); converted offline: Yes; how: No library. Longitude first.
- **Neo4j point** -- example: `point({latitude: 40.64, longitude: -73.78})`; auto-detected: Yes; converted offline: Yes; how: graph-io already parses it (`parsePointText` in `graph-io/src/common/declared-types.ts`).
- **ISO 6709** -- example: `+40.6398-073.7789/`; auto-detected: Yes (leading sign, fixed widths, trailing slash); converted offline: Yes; how: A short regex; no maintained package exists.
- **Degrees, minutes, seconds** -- example: `40 38 23 N, 73 46 44 W`, `40deg38'23"N`; auto-detected: Yes (hemisphere letters, degree, minute, second marks); converted offline: Yes; how: `coordinate-parser` (Apache-2.0, about 1.1 KB gzip).
- **WKT POINT** -- example: `POINT(-73.78 40.64)`; auto-detected: Yes (`POINT (`); converted offline: Yes; how: A regex; `betterknown` (MIT, 1.8 KB) if other WKT types are wanted.
- **Geohash** -- example: `dr5x1n7`; auto-detected: Per column only (alphabet without a, i, l, o; all values similar length); converted offline: Yes; how: `ngeohash` (MIT, 1.5 KB). Decodes to the cell center.
- **Open Location Code (plus code)** -- example: `87G8Q2PQ+6V`; auto-detected: Yes ("+" after the 8th character, its 20-letter alphabet); converted offline: Full codes only; how: Google's `open-location-code` (Apache-2.0, 1.7 KB). A short code (`Q2PQ+6V New York`) needs a reference place, so it goes through geocoding.
- **MGRS** -- example: `18TWL8573807587`; auto-detected: Yes; converted offline: Yes; how: `mgrs` from the proj4js project (MIT, 2.7 KB).
- **UTM** -- example: `18T 585738 4507587`; auto-detected: Yes (zone, band, easting, northing); converted offline: Yes; how: `utm` (2.6 KB min) or the same `mgrs` package's conversions.
- **what3words** -- example: `///filled.count.soap`; auto-detected: Yes (three dotted words); converted offline: No; how: Only through what3words' API with the reader's key; the free plan allows 100 conversions a month (https://what3words.com/pricing). Offered as a keyed geocoder, never built in.
- **Country, state or city name** -- example: `France`, `Ohio`, `Lyon, FR`; auto-detected: As "text that is none of the above"; converted offline: Yes, with a gazetteer; how: Offline gazetteer, section 4.5.
- **Street address** -- example: `1 Infinite Loop, Cupertino`; auto-detected: As text; converted offline: No; how: Needs a geocoding service with the reader's key, section 4.5.

Sizes are minified and gzipped, from bundlephobia. Licenses are from each package's npm registry
entry. Together the parsers are under 10 KB gzipped and live in the lazily loaded layout chunk.

### 4.2 Detection

`format: "auto"` decides once per column, never per cell, so a geohash column is not half read as
place names. It samples up to 200 non-empty values and scores each format by the share it parses
without error and within range. The best format wins; a format that reads within 5% as many values
is reported with `W_LOCATION_AMBIGUOUS`. Geohash is scored only for a column whose values all have
one length of at least five characters and contain letters, so ZIP codes and words are never read
as geohashes. A value the column's format refuses is tried in the formats whose spelling cannot be
mistaken (a decimal pair, degrees-minutes-seconds, WKT, GeoJSON, ISO 6709), never as a geohash, so
a column mixing spellings loses no row. Two rules settle the classic confusion:

- A decimal pair is read latitude first (the ISO 6709 order and the common spoken order) unless
  that puts any latitude outside +/-90 and longitude-first does not, in which case it is read
  longitude first and `W_LOCATION_SWAPPED` says so. When longitude first reads as many values (a
  column of European capitals reads either way), `lon-lat` is an alternative and
  `W_LOCATION_AMBIGUOUS` points the reader at `format`. GeoJSON and WKT are always longitude first.
- With separate columns picked by name, `latitude` and `longitude` never swap.

When no location option is set at all, the layout looks for columns named like latitude and
longitude (the same heuristic Graphistry, Ogma, NeoDash and sigma.js use), then for the column a
format reads best, when it reads at least half its values. The graph-samples datasets therefore
work with no options. When only one of Latitude and Longitude is set, the other is found by name
and reported as filled. If nothing is found the layout refuses with `layout.needs-location`,
naming the role nothing fills and the attributes it saw: in its cost estimate before it is chosen
(so a picker greys it out with the reason), and when it starts (so the previous layout stays drawn).
Separate latitude and longitude columns also read a hemisphere letter before or after the number
("51.5074 N") and a decimal comma ("48,8566").

### 4.3 Conversion and errors

Each parser returns `{ lat, lon }` in WGS 84 degrees, or a reason code (`empty`, `syntax`,
`range`, `short-code`). Per node failures are not exceptions: the node is unplaced (tray or
left), and one `W_LOCATION_UNPARSED` warning per run carries counts and up to 8 sample values with
their reasons. The parsed result is also published as two node results,
`results.location-map.lat` and `results.location-map.lon`, plus `results.location-map.status`
(`placed`, `unplaced`, `geocoded`), so a style layer or a filter can select unplaced nodes and an
application can list them. This uses the existing result path that `input.column()` and style
selectors already resolve. NOT BUILT in the prototype: results are published only by runs in the
run registry, and a layout that registered a run would show among the reader's runs. Until that is
designed, the unplaced nodes' ids are in both unplaced warnings (`params.ids`) and in
`element.mapFrame.unplaced`, which is what an application's Select reads.

### 4.4 Parser libraries considered

| Need          | Chosen                         | Also considered                                                | Why                                                       |
| ------------- | ------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------- |
| DMS free text | `coordinate-parser` 1.0.7      | `parse-dms` (old), `geographiclib-dms` (one angle at a time)   | Reads both halves of mixed-symbol strings.                |
| Geohash       | `ngeohash` 0.6.4               | `latlon-geohash` 2.0.0                                         | Either works; ngeohash also returns the error box.        |
| Plus codes    | `open-location-code`, vendored | the npm 1.0.3 copy, which is old                               | The reference implementation; vendor the current file.    |
| MGRS and UTM  | `mgrs` 2.2.0                   | `proj4` (43 KB gzip, only needed for arbitrary national grids) | Small; proj4 waits for a real request for national grids. |
| WKT           | regex                          | `wellknown`, `wkt`, `betterknown`                              | Only POINT matters for node placement.                    |

Each is small enough that writing our own would save nothing, and each is the reference or most
used implementation of a format that has edge cases (hemisphere letters, MGRS zone letters,
plus code padding).

### 4.5 Place names and addresses

Geocoding cannot be an always-on built-in for a serverless component:

- Nominatim (OpenStreetMap's public geocoder) allows at most 1 request per second summed over the
  whole application, forbids client-side autocomplete and discourages bulk geocoding
  (https://operations.osmfoundation.org/policies/nominatim/). A 5,000-row CSV of addresses breaks it.
- Google's Geocoding API may not be used with a non-Google map and cannot use a referrer-restricted
  browser key (https://cloud.google.com/archive/maps-platform/terms/maps-service-terms-20250331,
  https://developers.google.com/maps/documentation/javascript/get-api-key). It is not offered.
- Mapbox "temporary" geocoding results may be shown but not stored
  (https://docs.mapbox.com/help/dive-deeper/understand-temporary-vs-permanent-geocoding/).

So there are two paths:

1. **The offline gazetteer** (`geocoder: "gazetteer"`): country names and ISO codes, first-level
   regions (US states, provinces) and cities with population of 15,000 or more. Sources: Natural
   Earth admin-0 and admin-1 label points (public domain, https://www.naturalearthdata.com/about/terms-of-use/)
   and GeoNames `cities15000` (CC BY 4.0, about 26,000 cities, 3.2 MB zipped,
   https://download.geonames.org/export/dump/). Trimmed to name, alternate names, country, region,
   lat, lon and population it is about 1 to 2 MB gzipped, fetched once on first use. "Paris"
   resolves to the most populous match unless the value or a `country` hint narrows it. The
   attribution "GeoNames (CC BY 4.0)" joins the map attribution while it is in use.
2. **A keyed geocoder**, the reader's own account: OpenCage, LocationIQ or ArcGIS Location
   Platform, whose terms allow storing results and showing them on any map (OpenCage 2,500 a day
   on its free trial, LocationIQ 5,000 a day, ArcGIS 20,000 a month, https://location.arcgis.com/help),
   and what3words for three-word addresses. Requests are rate-limited to the provider's stated rate,
   results are cached in the session (and in the project file, so a saved project does not
   geocode again), and progress is reported with `W_GEOCODE_PENDING`. Nodes move into place as
   answers arrive.

Where the gazetteer is hosted is a choice for the owner (section 13): graph-samples already serves
its datasets from graphty.app, and the same hosting fits.

## 5. Projections and the view matrix

### 5.1 The four combinations

| graphty-element view                  | `mapDimension: "2d"`                                                                                                | `mapDimension: "3d"` (default)                                                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2D (`view-mode="2d"`)                 | Flat map in the x-y plane, orthographic 2D camera, straight edges                                                   | Not offered. The value is kept and the 2D map is drawn (`optionInEffect` answers `setting.notIn2d` with `params.drawn: "2d"`); the app offers only the 2D map in 2D, and the globe comes back in 3D. |
| 3D (`view-mode="3d"`, also AR and VR) | Flat map in the x-y plane, orbit camera first seen from the south at 45 degrees, edges as raised arcs above the map | The whole sphere at the origin, faced straight on, orbit camera, edges as raised great-circle arcs                                                                                                   |

### 5.2 Flat projections

Web Mercator is the default because every web tile source is drawn in it, so tiles and nodes line
up with no reprojection. It cannot show the poles (it stops at +/-85.05 degrees) and inflates
high latitudes, which is fine for a city or a country and misleading for a world map of
quantities. A point past +/-85.05 degrees on a flat Web Mercator map goes to the tray and is
counted in `W_LOCATION_OUT_OF_RANGE`, rather than drawn on the map's edge. Other projections are
offered for the bundled map and for equirectangular tile
sources: equirectangular (plate carree, the NASA GIBS EPSG:4326 tiles), Equal Earth (an equal-area
world map), Albers USA (the familiar US map with Alaska and Hawaii inset) and transverse Mercator
(small areas far from the equator). Picking a projection that does not match the tile source's
draws the bundled image instead, with a basemap status of `fallback` and a reason code; reprojecting
raster tiles on the GPU is possible later but not in the first versions.

Projection math comes from `d3-geo` (ISC license, tree-shakeable, roughly 12 KB gzipped for the
few projections used), which already covers every projection Gephi's Geo Layout plugin offers
(https://gephi.org/desktop/plugins/geolayout-plugin). Web Mercator and equirectangular are a few
lines each and need no library; d3-geo is loaded only for the others.

Positions are in scene units: `size` scene units across the shown extent, centered on the origin,
y up (north up). A world-sized number range would break Babylon's single-precision positions at
street zoom; scaling the shown extent to `size` keeps numbers small whatever the zoom.

### 5.3 The globe

A sphere of radius `size` at the origin, with the north pole on +y, longitude 0 facing the starting
camera. A node at (lat, lon) sits at radius `size` plus a lift of half the largest node size, so a
node is never half inside the sphere. Nodes are not rotated to the surface by default; a node's
shape faces the camera as it does in every layout. Babylon.js 9 (March 2026) adds a
`GeospatialCamera` (orbits a planet, globe-anchored drag, zoom to cursor, tilt) and floating-origin
"large world rendering" (https://blogs.windows.com/windowsdeveloper/2026/03/30/part-2-babylon-js-9-0-tooling-updates-and-new-geospatial-features/).
graphty-element is on `@babylonjs/core` 8.36, so the first versions use the existing orbit camera
(`graphty-element/src/cameras/OrbitCameraController.ts`) and the move to Babylon 9 is its own
change (section 14).

### 5.4 The geographic frame

The layout publishes a frame with its result: `{ kind: "geographic", surface, projection, extent,
size }`. This is the "descriptor frame" that open decision 27 in `design/extensions/README.md`
anticipated (`"geographic-lonlat"`). The basemap manager draws only while the active layout has a
geographic frame, and draws in that frame, so the map and the nodes can never disagree. The frame
is also readable by an application (to show a scale bar or a "fit to data" button) and by camera
views (a `topView` on the globe looks down on the data's center).

## 6. How nodes appear on the map

Nodes are not replaced by map markers. A node on the map is the same `Node`
(`graphty-element/src/Node.ts`) with the same mesh from `MeshCache`, placed through
`Node.setMeshPosition()` like any other layout's output. So everything a style layer sets works
unchanged: shape, color, size, texture, border, glow and other effects
(`graphty-element/src/meshes/NodeEffects.ts`), images, pie and chart glyphs, labels and tooltips
(`graphty-element/src/config/NodeStyle.ts`). Selection, hover, dragging, algorithms and their
suggested styles are untouched.

The map sits under the nodes:

- **Draw order.** On the flat surface the map is at z = 0 and nodes are lifted a little toward
  the camera (by half their size, as on the globe). The map material writes depth but is drawn in
  an earlier rendering group, so a node never z-fights with it and labels stay on top.
- **Lighting.** Map tiles use an unlit material (emissive texture), so lighting presets
  (`RenderManager.applyLighting`) do not darken the picture, and the map does not change node
  lighting.
- **Dragging a node** on the map moves it in the map plane (or along the globe surface) and pins
  it, as dragging does today. The node's data is not rewritten; an application that wants "drop to
  set location" reads the pinned position, converted back through the frame with a new
  `element.locationAt(position)`, and writes the attribute itself.
- **Two styling helpers** come for free from the published results (section 4.3): a selector on
  `results.location-map.status == 'unplaced'` styles the tray, and the lat and lon results can
  drive color or size like any column.

Size on a map: nodes keep their scene size, so on a zoomed-in city map they look as they do in any
layout; `nodeScale: "screen"` holds node size on screen while zooming, as web maps do with markers.
On the globe the radius is set so the data's extent spans `size` scene units of arc, the same share
of the view as on the flat map, so a node is the same size on either surface.

No styling of the map's own: nodes and edges on a map look exactly as their style layers paint
them, as in every other layout (appearance comes only through style layers). An outline or a
darker line for contrast against a busy map is a reader's choice, made with a style layer; the
layout adds none. What the map does change is draw order: nodes are drawn after edges, with edges
writing no depth, so an arc passing in front of a hub never hides it.

## 7. Edges

### 7.1 What is drawn

| Surface and view | Default edge shape                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flat, 2D view    | Straight line in the map plane (the owner's requirement). Every existing 2D edge style still applies, including the existing in-plane `bezier` and `bendCurve` styles if a style layer sets them. |
| Flat, 3D view    | A raised arc: a parabola-like curve in the vertical plane through the two endpoints, peaking at `arcHeight` times the edge's map length above its midpoint (default 0.25).                        |
| Globe            | A raised great-circle arc: points along the great circle between the endpoints, each lifted by `arcHeight` times the arc length times sin(pi * t).                                                |

All three come from one new edge-style property, `line.route`, with values `straight`,
`arc` (raised arc over a flat map) and `great-circle`, plus `line.arcHeight`. The location-map
layout's frame supplies the default (`great-circle` on the globe, `arc` on a flat 3D map,
`straight` in 2D), so the default needs no style layer, and a style layer can override per edge (for
example, flat great circles on the globe with `arcHeight: 0`, or straight chords for short edges).
This is the element-owned edge routing that `design/extensions/candidates.md` section 20
recommended. It is new geometry: every existing curve in `graphty-element/src/meshes/edgeRoute.ts`
bows in the x-y plane only (`EdgeMesh.calculateControlPoints` crosses with the z axis).

### 7.2 How

- Great-circle points come from spherical interpolation (slerp) between the two unit vectors,
  about 10 lines; no library (`@turf/great-circle` and `arc.js` exist but solve the harder case of
  arcs drawn in a flat projection across the antimeridian, which this design avoids by drawing
  on the sphere).
- The segment count adapts to the arc's angular length (one segment per 2 degrees, clamped to 8 to
  64), the way curves already take one line-batch slot per segment.
- Arrowheads (`graphty-element/src/meshes/ArrowCapBatch.ts`) follow the last segment's direction,
  so they point along the arc. Edge trimming at node meshes already works on the final segment.
- On a flat 2D map, an edge between, say, Tokyo and Los Angeles is drawn across the map, not across
  the antimeridian. A `wrap: "shortest"` option that splits such an edge into two pieces that leave
  one side of the map and enter the other is a later addition; most graph readers expect the
  single line.
- Edge bundling (`design/rendering/edge-bundling.md`) works on the flat surface unchanged; on the
  globe it is out of scope for the first versions.

## 8. Map graphics and providers

### 8.1 Kinds of map

Like Google Maps' map types, each source offers one or more kinds, and `basemap.style` picks one:
`plain` (land and water, borders), `streets`, `satellite`, `terrain` (topographic or shaded
relief), `light` and `dark` (muted backdrops that let the graph stand out). Which kinds a source
offers is in the `basemapSources` catalog.

### 8.2 Free sources usable from a static site

Checked against each provider's own policy pages on 2026-10-22. "Static site" means the browser
fetches tiles directly with no graphty server in between.

- **`natural-earth` (bundled)** -- kind: plain, terrain (shaded relief); key: No; license and attribution shown: Public domain; "Made with Natural Earth" optional; limits and conditions: None. One equirectangular image, about 300 to 600 KB at 2048 x 1024, shipped in the package and fetched on first use.; usable as a built-in choice?: Yes. The default: no network contact with any third party.
- **`openstreetmap`** -- kind: streets; key: No; license and attribution shown: ODbL; "(c) OpenStreetMap contributors", visible, bottom-right; limits and conditions: Best effort, may block without notice; requires a correct Referer and identifying User-Agent; honor caching (7 days minimum); no prefetching or bulk download. https://operations.osmfoundation.org/policies/tiles/; usable as a built-in choice?: Yes, for viewport loading only. The tile loader must never prefetch beyond the view when this source is active. Not recommended as an application's default for heavy use.
- **`openfreemap`** -- kind: streets, light, dark, plain (vector); key: No; license and attribution shown: "OpenMapTiles" and "(c) OpenStreetMap contributors"; limits and conditions: Public instance, no view limits, commercial use allowed. CORS allows any origin (checked). https://openfreemap.org/; usable as a built-in choice?: Yes, once vector drawing exists (section 11, later phase).
- **`nasa-gibs-blue-marble`** -- kind: satellite (global mosaic); key: No; license and attribution shown: NASA imagery, credit "NASA EOSDIS GIBS"; limits and conditions: EPSG:4326 (equirectangular) tiles that wrap onto the globe with no polar gap; CORS allows any origin (checked with a live tile request). https://nasa-gibs.github.io/gibs-api-docs/access-basics/; usable as a built-in choice?: Yes. The best free globe imagery. Low resolution (500 m), so not for street scale.
- **`opentopomap`** -- kind: terrain; key: No; license and attribution shown: CC BY-SA; "Map data: (c) OpenStreetMap contributors, SRTM; map style: (c) OpenTopoMap (CC-BY-SA)"; limits and conditions: No numeric limit; light use only, no mass download. https://opentopomap.org/about; usable as a built-in choice?: Yes, for low volume.
- **`usgs-topo`, `usgs-imagery`** -- kind: terrain, satellite (US only); key: No; license and attribution shown: US government public data; credit "USGS The National Map"; limits and conditions: ArcGIS tile endpoints. https://apps.nationalmap.gov/help/3.0%20TNM%20Base%20Maps.htm; usable as a built-in choice?: Yes, for US data.
- **`eox-s2cloudless-2016`** -- kind: satellite (10 m); key: No; license and attribution shown: CC BY 4.0, "Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)"; limits and conditions: Only the 2016 layer is free for any use; 2018 to 2024 layers are non-commercial (CC BY-NC-SA). https://eox.at/2025/03/sentinel-2-cloudless-2024/; usable as a built-in choice?: Yes, the 2016 layer only.
- **`terrain-tiles` (elevation)** -- kind: elevation for 3D relief; key: No; license and attribution shown: Credit Mapzen and the sources (SRTM, GMTED, ETOPO1 and others); limits and conditions: AWS Open Data, no account. https://registry.opendata.aws/terrain-tiles/; usable as a built-in choice?: Yes, later phase (relief).
- **Protomaps PMTiles file** -- kind: streets, light, dark (vector); key: No (own hosting); license and attribution shown: ODbL; OSM attribution; limits and conditions: One file read with HTTP range requests; a world extract to zoom 6 is small enough to host beside a site. https://docs.protomaps.com/basemaps/downloads; usable as a built-in choice?: Yes, as `{ pmtiles: url }` once vector drawing exists.

Not offered keyless: Esri World Imagery (the legacy endpoint answers without a key, but Esri's
terms require an ArcGIS Location Platform key for third-party applications,
https://www.esri.com/content/dam/esrisites/en-us/media/legal/product-specific-terms-of-use/e300.pdf),
CARTO basemaps (now watermarked without a key, https://carto.com/legal/basemap-terms/) and Stadia
(works keyless only on localhost).

**Attribution is drawn by the element, always.** Every policy above requires visible attribution,
and a third-party consumer cannot be trusted to add it. The element draws a small attribution strip
in the canvas's bottom-right corner, listing the attributions of the sources currently drawn
(including a custom source's `attribution` and the gazetteer's), and exposes the same list on
`basemapStatus.attribution` for an application that wants to show it elsewhere. Hiding the strip
requires an explicit `basemap.attributionShown: false`, documented as "you must then show
`basemapStatus.attribution` yourself". Provider logos where a provider demands one (MapTiler free,
Google) are drawn the same way.

**Requests carry the Referer.** Tile requests use plain image loads with the page's referrer
policy; the element never sets `referrerpolicy="no-referrer"`, because OpenStreetMap requires the
Referer and keyed providers check it (section 8.3).

### 8.3 Bring your own key

A reader or a consumer with their own account gets more: higher limits, better imagery, more kinds
of map. How this works with no server: the provider issues a browser key restricted to the
consumer's own domains (Google "website restrictions", Mapbox URL restrictions, Stadia domain
authentication, MapTiler and Protomaps allowed origins, Esri referrers). The provider checks the
browser's Origin or Referer header, which page scripts cannot forge, so a key visible in the page
source is useless elsewhere. The consumer adds their domain to the allow-list; graphty-element
appends the key to tile URLs. The restriction deters misuse rather than preventing it (a
non-browser client can forge a Referer), so the docs tell readers to set a quota or budget alert
with the provider.

Keys are passed as `basemap.key` or, in the graphty app, remembered through the element's existing
credential store (`graphty-element/src/credentials/CredentialStore.ts`, `element.credentials`),
using graph-io's existing `credentials.apiKey({ query: "key" }, value)` bound to the provider's
origin. No new key storage is invented.

- **Stadia Maps** -- what a key adds: Polished streets, light (Alidade Smooth), dark, Stamen Toner, Terrain and Watercolor, Alidade Satellite; free allowance (2026-10): 200,000 credits a month, non-commercial; conditions that matter here: Domain authentication: no key in the page at all. https://docs.stadiamaps.com/authentication/
- **MapTiler** -- what a key adds: Satellite, terrain, outdoor, streets, elevation for 3D relief; free allowance (2026-10): 100,000 requests a month, non-commercial; conditions that matter here: MapTiler logo required on the free plan. https://www.maptiler.com/cloud/pricing/
- **Mapbox** -- what a key adds: Satellite, streets, terrain-RGB elevation; free allowance (2026-10): Billed per tile request outside Mapbox GL JS; conditions that matter here: URL-restricted public tokens. https://docs.mapbox.com/accounts/guides/tokens/
- **CARTO** -- what a key adds: Positron (light) and Dark Matter (dark), the classic data-viz backdrops; free allowance (2026-10): 5 million requests a month non-commercial, 1 million commercial; conditions that matter here: https://carto.com/legal/basemap-terms/
- **Esri ArcGIS Location Platform** -- what a key adds: World Imagery (high-resolution satellite), topographic, light and dark gray canvas; also 20,000 geocodes a month; free allowance (2026-10): 2 million basemap tiles a month; conditions that matter here: Location Platform key, not an ArcGIS Online one. https://location.arcgis.com/help
- **Thunderforest** -- what a key adds: OpenCycleMap, Transport, Outdoors, Landscape; free allowance (2026-10): 150,000 tiles a month (hobby); conditions that matter here: https://thunderforest.com/pricing
- **Google Map Tiles API** -- what a key adds: 2D roadmap, satellite and terrain tiles; Photorealistic 3D Tiles (textured 3D buildings and terrain worldwide); free allowance (2026-10): 100,000 2D tiles a month; 1,000 3D root tileset requests a month; conditions that matter here: Third-party renderers allowed if the Google logo and every data attribution are shown and nothing is prefetched or stored. https://developers.google.com/maps/documentation/tile/policies
- **Cesium ion** -- what a key adds: Cesium World Terrain, Bing imagery, Google 3D tiles through one token; free allowance (2026-10): Community plan, personal and non-commercial; conditions that matter here: https://cesium.com/platform/cesium-ion/pricing/
- **OpenCage, LocationIQ, what3words** -- what a key adds: Geocoding of addresses, place names and three-word addresses (section 4.5); free allowance (2026-10): see section 4.5; conditions that matter here: Results may be stored and shown on any map (OpenCage, LocationIQ).

Not offered: Bing Maps (free and basic accounts ended June 30, 2025,
https://microsoft.com/en-us/maps/bing-maps/support) and Google geocoding (not usable with a
non-Google map).

Photorealistic 3D Tiles are the most striking thing a key adds, and the most expensive to support:
the NASA-AMMOS `3d-tiles-renderer` library has a Babylon.js renderer
(`3d-tiles-renderer/babylonjs`, Apache-2.0) with a Google tiles demo, but it requires
`scene.useRightHandedSystem = true` (graphty-element's scene is left-handed) and Babylon 8 or
later. It is the last phase and an optional peer dependency (section 12).

## 9. Custom maps

- **A tile URL template**: `{ tiles: "https://.../{z}/{x}/{y}.png", attribution, maxZoom, tileSize,
projection }`. Also accepts `{s}` subdomains, `{r}` for retina and `{-y}` for TMS row order. Any
  tile server with CORS works, including the consumer's own, a GeoServer or a MapProxy.
- **One image with its bounds**: `{ image, bounds }`. A historical map, a regional chart or a
  floor plan. With `projection: "equirectangular"` bounds are degrees; for a floor plan, an
  `identity` projection treats `latitude` and `longitude` as y and x in the image's own units
  (the KeyLines "CRS.Simple" idea), so indoor or schematic locations work too.
- **A PMTiles file** (later): one static file holding a whole vector or raster tileset, read with
  HTTP range requests (`pmtiles` reader, BSD-3, about 8 KB gzipped). The ideal format for
  self-hosting a map beside a static site.
- **A style JSON** (MapLibre style specification): only for vector sources, later, and only the
  subset the lightweight vector painter draws (fill, line and background layers; no symbol labels).
  A full style needs MapLibre GL JS, which is not embedded (section 11).

## 10. Fit to data and partial maps

Yes, a flat map can show only a portion. With `extent: "data"` (the default) the layout fits the
shown extent to the located nodes' bounding box plus a 10% margin, so a graph of Chicago
restaurants fills the view with Chicago, at street-level tiles, not a speck on a world map. The
shown extent is what `size` scene units span; the map draws tiles that cover it plus one tile
ring, clipped at its edge so the picture ends where the extent does (with an option,
`basemap.beyond: "fade" | "clip" | "continue"`, for how the edge looks).

Projection by extent, with `projection: "auto"`: Web Mercator always (it matches the tiles, and at
city and state scale its distortion is negligible). A consumer who wants an equal-area view of the
world sets `equal-earth` and gets the bundled image. The camera starts framing the data
(`fitToGraph` works unchanged because the nodes are the graph).

On the globe, `extent: "data"` turns the globe so the data's center faces the camera and sets the
camera distance so the data fills the view.

Edge cases: a single node, or all nodes at one point, gets the region around it, 10 degrees
across (1 degree of the bundled picture is a blur of a few texels); any other data at least 0.01
degree, about a kilometer, so a city is framed at its own size; data
crossing the antimeridian (Fiji, the Aleutians) is detected by the largest longitude gap, the box's
east edge passes 180 degrees, and longitudes are shifted by 360 into it before projecting, so an
800 km edge is not drawn across the whole map. `basemap.beyond` defaults to `"continue"`: the map
goes on past the box (a world to the east and west), so panning or zooming out shows map, and Fit
frames the camera rather than cropping the picture.

## 11. Zoom and level of detail

Yes: zooming in loads more detailed tiles, as in Google Maps, on both surfaces. No maintained
Babylon.js library does this (a 2025 Babylon forum thread pasting map tiles onto one sphere texture
hit exactly the blurriness problem, https://forum.babylonjs.com/t/tms-tiled-map-service-in-babylon/61185),
so graphty-element implements it, following `three-slippy-map-globe` (MIT,
https://github.com/vasturiano/three-slippy-map-globe) for the globe and the standard slippy-map
scheme (https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames) for the flat map.

**Flat map.** On every camera change (the existing camera observers; render-on-demand stays
honored):

1. Compute the visible ground rectangle from the camera (the 2D orthographic camera's bounds, or
   the 3D frustum intersected with the map plane).
2. Pick the zoom level so a tile pixel is about one screen pixel:
   `z = log2(visibleScreenPixels / visibleWorldFraction / tileSize)`, clamped to the source's
   max zoom.
3. Request the visible tiles at that level. Each tile is one quad mesh with an unlit material and
   its own texture, placed in scene units from the frame. A 3D view tilted toward the horizon uses
   lower levels toward the far edge.
4. Keep drawing the parent tile (scaled) until its children load, so zooming never shows holes.
5. Evict least recently used textures beyond a cap (about 256 tiles).
6. Never prefetch outside the view (the OpenStreetMap policy forbids it; other sources do not
   need it).

**Globe.** A quadtree of sphere patches, each an N x N vertex grid (about 16 x 16) with the tile as
its texture. A patch is split into four when its screen-space error exceeds a threshold
(Cesium's default is 2 pixels, `error_px = geometricError * viewportHeight / (2 * distance *
tan(fov / 2))`), and is culled when outside the frustum or behind the horizon. Skirts on patch edges
hide cracks between levels. Web Mercator tiles end at +/-85.05 degrees, so polar caps are drawn
from the bundled equirectangular image; equirectangular sources (NASA GIBS) cover the poles
directly.

**Precision.** Scene positions are single-precision floats; at a globe radius of 100 scene units a
street (about 10 m) is 0.0002 units, close to the limit. For the first versions globe zoom is
capped around city level (zoom 12). Deeper globe zoom needs Babylon 9's floating origin (section 14).
The flat map does not have this problem because the extent is rescaled to `size`.

**Vector tiles.** Raster tiles come first. Vector sources (OpenFreeMap, Protomaps, OpenStreetMap's
own vector tiles) are drawn later by decoding them (`@mapbox/vector-tile` and `pbf`, about 5 KB
gzipped) and painting fills and lines with Canvas2D on an OffscreenCanvas in a worker, uploaded as
a texture. That gives crisp, restylable light and dark maps with no tile quota. Labels are left
out of the painter (graph labels compete with map labels anyway). MapLibre GL JS
(294 KB gzipped) as an offscreen rasterizer was considered and rejected for size.

## 12. Features borrowed from similar products

Value: how much a reader with geographic data gains. Cost: implementation effort on top of this
design. Rated low, medium or high.

| Feature                                                   | Seen in                                                            | Value  | Cost   | Plan                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------ | ------ | ------ | ------------------------------------------------------------------------------------ |
| Animated move between a network layout and the map        | Linkurious Ogma `geo.toggle`, KeyLines `map().show()`              | High   | Low    | Free: graphty-element already animates layout changes. Phase 1.                      |
| A tray for nodes with no location, instead of hiding them | Gephi Geo Layout (a row at the bottom), ArcGIS (force-places them) | High   | Low    | Phase 1 (`unplaced: "tray"`).                                                        |
| Spread exactly co-located nodes                           | Common in map clients                                              | High   | Low    | Phase 1 (`overlap: "spread"`).                                                       |
| Raised arcs and great circles                             | deck.gl ArcLayer and GreatCircleLayer, kepler.gl                   | High   | Medium | Phase 2 and 3.                                                                       |
| Map styles: streets, satellite, terrain, light, dark      | Google Maps, Mapbox                                                | High   | Low    | Phase 2 (raster sources).                                                            |
| Fit to data, partial maps                                 | Every map client                                                   | High   | Low    | Phase 1 (layout) and 2 (tiles).                                                      |
| Cluster nearby nodes at low zoom, expand on zoom          | NeoDash map, Mapbox clustering, Flowmap.blue                       | High   | High   | Later. Fits graphty-element's sets and collapse work better than a map-only feature. |
| Aggregate edges between clusters (flow maps)              | Flowmap.blue                                                       | Medium | High   | Later, with clustering.                                                              |
| Time playback of dated nodes and edges                    | kepler.gl, deck.gl TripsLayer, Cesium timeline                     | Medium | High   | Not map-specific; belongs to a general time filter.                                  |
| Heatmap or hexbin density under the graph                 | kepler.gl                                                          | Medium | Medium | Later: a computed texture drawn as one more basemap layer.                           |
| Region shapes (choropleth) from GeoJSON                   | Ogma GeoJSON shapes                                                | Medium | Medium | Later: `basemap.overlays` drawn into the map texture.                                |
| Smooth flat-to-globe transition                           | Mapbox GL and MapLibre globe                                       | Low    | Medium | Later; the animated layout change already moves the nodes.                           |
| Node size fixed in screen pixels while zooming            | Every web map's markers                                            | Medium | Low    | Phase 2 option (`nodeScale: "screen"`).                                              |
| Image or floor-plan maps with an identity projection      | KeyLines CRS.Simple                                                | Medium | Low    | Phase 2.                                                                             |
| Terrain relief on the 3D flat map and globe               | Cesium, MapTiler, Google Earth                                     | Low    | Medium | Later (`terrain-tiles` elevation).                                                   |
| Photorealistic 3D cities                                  | Google Earth, Cesium                                               | Low    | High   | Last, optional peer dependency.                                                      |
| Map labels with collision avoidance                       | MapLibre symbols                                                   | Low    | High   | No: raster tiles already carry labels; graph labels have their own declutter.        |

## 13. Library comparison and recommendation

- **Own tile selection and drawing in Babylon** -- license: ours; size (gzip): about 15 to 25 KB; fits babylon.js?: Native: meshes, textures, the existing cameras and render-on-demand; verdict: **Recommended.** About 1,000 to 1,500 lines for flat and globe raster LOD.
- **`d3-geo` (projections only)** -- license: ISC; size (gzip): about 12 KB used; fits babylon.js?: Pure math; verdict: **Use** for non-Mercator projections, lazily.
- **Small parsers (section 4.4)** -- license: MIT, Apache-2.0; size (gzip): under 10 KB total; fits babylon.js?: Pure functions; verdict: **Use.**
- **`pmtiles`, `@mapbox/vector-tile`, `pbf`** -- license: BSD-3, BSD-3, BSD-3; size (gzip): about 13 KB; fits babylon.js?: Pure decoding; we paint; verdict: **Use later** for vector and PMTiles sources.
- **`3d-tiles-renderer/babylonjs`** -- license: Apache-2.0; size (gzip): large, optional; fits babylon.js?: Yes, but needs a right-handed scene; verdict: **Optional peer, last phase**, for Google Photorealistic 3D Tiles.
- **loaders.gl (`@loaders.gl/terrain`, `/mvt`, `/3d-tiles`)** -- license: MIT; size (gzip): moderate per module; fits babylon.js?: Framework-independent loaders; verdict: Keep in reserve for terrain meshes (MARTINI) if relief is built.
- **MapLibre GL JS 5 (has a globe)** -- license: BSD-3; size (gzip): 294 KB; fits babylon.js?: A separate WebGL canvas; would need overlaying and camera syncing (the sigma.js and Ogma approach); verdict: No. Two renderers fight over depth, picking and XR; nodes could not sit on a 3D globe.
- **CesiumJS** -- license: Apache-2.0; size (gzip): several MB; fits babylon.js?: A complete separate engine; verdict: No.
- **deck.gl GlobeView** -- license: MIT; size (gzip): large; fits babylon.js?: Separate engine; GlobeView is experimental with no pitch; verdict: No.
- **Leaflet underneath the canvas** -- license: BSD-2; size (gzip): 42 KB; fits babylon.js?: 2D only, a DOM layer under a transparent canvas; verdict: No: works only for the 2D view and breaks AR and VR.

The deciding point: the owner's requirements (nodes styled as ordinary graphty nodes, 3D arcs
over a flat map, a globe, AR and VR) all need the map inside the Babylon scene. Every
off-the-shelf map engine draws into its own canvas. Drawing tiles in Babylon ourselves is a
modest amount of code; integrating two renderers is not.

## 14. Packaging and bundle size

**Owner decision, 2026-10-22: the reusable map code is its own package, `babylonjs-map`**
(unscoped on npm, directory `babylonjs-map/`). It knows nothing about graphs and works in any
Babylon.js scene, left- or right-handed. graphty-element keeps everything graph-specific (the
location field, the layout, edges, styling, attribution drawing, `basemapStatus`) and depends on
`babylonjs-map` as a normal dependency, loaded lazily the first time the location map layout runs.
`@babylonjs/core` is a peer dependency of `babylonjs-map`. Its entry points:

- `babylonjs-map`: `FlatMap` and `Globe` (Babylon meshes showing a list of map sources, with the
  tile pyramid, zoom level of detail, LRU texture cache and `attribution`), `mapSources` (the
  bundled `natural-earth` image and the keyless tile sources of section 8.2), and everything below.
- `babylonjs-map/projection` (no Babylon.js): Web Mercator, equirectangular, `createMapFrame`
  (fit a box to `size` scene units), `boundsOf`, `latLonToSphere`. graphty-element's layout
  projects through this entry so the `./session` entry stays free of Babylon.js.
- `babylonjs-map/location` (no Babylon.js): `parseLocation`, `detectLocationFormat`,
  `latLonFromColumns` for the formats of section 4.1 except place names and what3words.

The bundled world image is `babylonjs-map/assets/natural-earth.jpg` (Natural Earth I with shaded
relief and water, 1:50m, public domain, 4096 x 2048, 770 KB, downsampled from `NE1_50M_SR_W`), loaded by URL, not inlined.

The bullets below predate the decision: read "graphty-element chunk" as "graphty-element's lazy
chunk plus `babylonjs-map`".

- **No new package, no new entry point, no new peer dependency** for phases 1 to 4. The layout
  and the basemap code are internal lazily loaded chunks of graphty-element, reached by a dynamic
  `import()` the first time `location-map` runs or a basemap is set (the
  `GraphvizLayoutEngine` pattern). The main entry (`.`, budget 599,979 bytes in
  `graphty-element/size-budgets.json`) grows only by the catalog entry and option schema, under 2
  KB. The checker (`tools/check-bundle-size.mjs`) measures an entry plus its static chunks, so the
  lazy chunk does not count against `.`; a new budget line for the chunk would be added if the
  checker learns to measure dynamic chunks.
- Estimated lazy chunk: parsers under 10 KB, tile LOD and drawing 15 to 25 KB, d3-geo projections
  about 12 KB (a further lazy split), so about 40 to 50 KB gzipped in all.
- The bundled Natural Earth image (about 300 to 600 KB) is a package asset loaded by URL
  (`new URL("./assets/natural-earth.jpg", import.meta.url)`), not inlined in JavaScript. The
  `./bundle` single-file build (budget 3.2 MB) would either inline it as a data URL or fetch it from
  the same directory; inlining would grow `./bundle` by about 20%.
- The gazetteer data (1 to 2 MB) is never in the package; it is fetched on first use.
- Photorealistic 3D Tiles (last phase) follow the `@graphty/webgpu-graph-algorithms` model: an
  optional peer dependency, `3d-tiles-renderer`, reached only from an opt-in entry point, so the
  core never imports a package a consumer may not have installed.
- Babylon.js 9's `GeospatialCamera` and floating origin need a Babylon major upgrade of
  graphty-element; that is its own change, not part of this feature.

## 15. Decisions

### 15.1 One-way doors for the owner

These are public names or contracts that would be breaking to change once published.

1. **The layout id `location-map`** (alternatives: `geo`, `geographic`, `map`). It is stored in
   saved project files and in `KNOWN_LAYOUT_IDS`.
2. **Where the map is set.** Decided by the owner (2026-10-22): the map is the location map
   layout's own option, `map`, with the shapes of section 2.3 (`{ source }`, `{ tiles, attribution
}`, `{ image, bounds }`, each with `attributionShown` and `beyond`), set with `layout.set` and
   saved with the layout in the project file. There is no separate `basemap` element property,
   project setting or Graph settings section: a map means nothing to a reader who is not using
   the map layout. A new `map` on the applied layout swaps the picture without placing a node
   again.
3. **The option names** `location`, `latitude`, `longitude`, `mapDimension`, `projection`, `extent`,
   `unplaced`, `overlap`, and the edge-style properties `line.route` and `line.arcHeight`.
4. **The named source ids** (`openstreetmap`, `openfreemap`, `nasa-gibs-blue-marble`, ...): saved
   project files will name them.
5. **Whether the default map is the bundled Natural Earth image.** The alternative is a network
   tile source by default (sharper, but every consumer's readers would contact a third party
   without the consumer choosing it). Recommended: bundled image, network sources opt-in.
6. **Where the gazetteer is hosted**: graphty.app beside the graph-samples datasets (a URL that
   third-party consumers then depend on), with a `gazetteerUrl` option to self-host.

Still open after the 2026-10-22 decisions (the package name `babylonjs-map` is decided): items 1
to 6 above, which the prototype uses under the proposed names, and the public API of
`babylonjs-map` itself -- the class names `FlatMap` and `Globe`, the source shapes
(`{ tiles, attribution, ... }`, `{ image, bounds, ... }`), the source ids in `mapSources`, the
location format ids (`decimal`, `lon-lat`, `geojson`, `wkt`, `iso6709`, `dms`, `geohash`,
`plus-code`, `mgrs`, `utm`) and the error codes (`empty`, `syntax`, `range`, `short-code`). All are
unpublished (version 0.0.0) until the first release.

The graphty-element prototype (branch `feat/location-map-prototype`) ships under these proposed
names, all still open: the layout id `location-map` and its options (`location`, `latitude`,
`longitude`, `format`, `mapDimension`, `projection`, `extent`, `size`, `unplaced`, `overlap`, `nodeScale`,
`map`); the read-only `basemapStatus` (`{ source, state: "off" | "loading" | "ready" | "fallback",
attribution }`); the style channels `edge.route` and `edge.arcHeight` (`line.route`,
`line.arcHeight`); the warning codes `W_LOCATION_UNPARSED`, `W_LOCATION_OUT_OF_RANGE`,
`W_LOCATION_AMBIGUOUS` and `W_LOCATION_SWAPPED`; the catalog table `BASEMAP_SOURCE_DESCRIPTORS`
(`{ id, plainName, kind: "plain" | "streets" | "satellite" | "terrain", coverage: "world" | "us",
network }`, in the `./catalog` entry, where the design said `basemapSources`); and the graph-samples
dataset id `venice-transit`.

The graphty app's controls, built on these: Map in the Layout popover, whose form shows Location,
Latitude, Longitude (each a node column picker that reads "Automatic" while empty), Surface (Flat
map or Globe) and Fit, with Format, Projection, Size, Unplaced (Tray or Leave in place) and Same
place behind Advanced, and Map: one list of the catalog's sources grouped Plain, Light, Satellite,
Streets and Topographic, then Custom (Tiles or Image, each with Address and Credit) and None, which
on the applied map swaps the picture at once; and a notice "N of M nodes
unplaced" from the `W_LOCATION_UNPARSED` layout warning. The credits are the element's strip on the
canvas.

What the prototype does differently from the text above, and why: an unset `arcHeight` is 0.25 on a
flat map but 0.1 on a globe (a quarter of a long great circle rose higher than the globe is wide);
`basemapStatus.state` adds `off` for "no geographic layout is active"; an unknown named source
draws the bundled image with state `fallback` rather than refusing; and the `basemap-status` event,
the `E_BASEMAP_*` codes, the published `results.location-map.*` fields, a bounds `extent`, keyed
sources and the gazetteer are not built yet.

### 15.2 Decisions made here, each with its reason

- The map is the layout's `map` option, joined to the drawing by a published frame: the map
  follows the layout, and a new `map` on the applied layout is taken by the engine as it stands
  (`takeDrawingOptions`), so no node is placed again. (It began as a separate `basemap` project
  setting; the owner moved it into the layout on 2026-10-22.)
- Nodes stay graphty nodes; no map markers: the owner's requirement, and the only way style layers
  keep working.
- Flat map in the x-y plane at z = 0: the plane the 2D camera already looks at, so switching 2D and
  3D does not move the map.
- Web Mercator by default: it matches every web tile source.
- Raster tiles before vector tiles: far less code for the first useful version.
- Own LOD code instead of a map engine: everything must be in one Babylon scene (section 13).
- Detect format per column, not per cell: avoids reading geohash-like ids as places one by one.
- Decimal pairs read latitude first unless the range proves otherwise: the ISO 6709 and spoken
  order, with a warning when swapped.
- Unplaced nodes go to a tray by default, never to latitude 0, longitude 0: hiding loses data
  silently, and (0, 0) is a real place in the Gulf of Guinea.
- No Google geocoding, no keyless Esri, no Bing: their terms or status forbid it (section 8).
- Attribution drawn by the element by default: every source's policy requires it, and consumers
  forget.
- Keys through the existing credential store: no second key store.
- Edge route as an edge-style property any layout can use: what `design/extensions/candidates.md`
  section 20 recommended.

### 15.3 What the 2026-10-22 review changed

Four reviews of the prototype were sorted into decisions
(`design/ui/studio/location-map/decisions.md`). The prototype now does the following; names added
here are prototype names and open (15.1).

- **A map that cannot run says why.** The cost estimate refuses `location-map` with
  `layout.needs-location` (`{ layout, missing, attributes }`), so the Layout list greys Map out with
  the app's words; the layout refuses again when it starts, before it becomes the active layout,
  so the previous layout stays drawn and the form never says Applied. It throws no sentence: a
  `GraphtyError` whose `details.refusal` is the coded fact.
- **Feedback on the column choice.** Half a pair is completed by name and reported as `filled` in
  the frame; every location warning has words under the Latitude and Longitude fields, read from
  `element.mapFrame.warnings`.
- **Detection** takes a column that reads at least half its values; geohash only for one-length
  values of five or more characters with letters; mixed columns retry each value in the
  unambiguous formats; latitude and longitude columns read hemisphere letters and decimal commas;
  longitude-first pairs are flagged as ambiguous.
- **The date line**: `boundsOf` takes the narrowest longitude range and `longitudeIn` shifts points
  into it; the flat map draws a box past 180 degrees from both copies of the world.
- **Unplaced nodes**: points past 85.05 degrees on Web Mercator go to the tray; both unplaced
  warnings carry `unplaced` (one total), `total` and `ids`; the tray is one row; an edge to a tray
  node is straight; a run on an emptied graph reports nothing. The app's notice names its whole,
  has Select, and is posted once per layout and options.
- **Undo** of a map layout publishes its frame again from the nodes' locations (`loadArrangement`),
  so the map, the routes and the facing come back.
- **Camera**: a new map is faced (the orbit turned to look at -z) and framed with the map's extent,
  the tray and the view insets; Fit with the whole graph includes the map, and a kept angle that
  sees the map from behind is not kept; on the globe the camera's distance from the center never
  drops below 1.02 radii (wheel or pinch), world data opens at the equator, north up; Top, Side and
  Isometric look at the map's face, from the south and from its front while a map layout is active.
- **Tiles**: the level is chosen by texel size on screen with edge tiles sized as whole tiles;
  failed tiles retry with backoff (1 s doubling to 60 s) and on `online`; a failed tile's parent
  stands in for its siblings; `setSources` keeps a source that stays; the poles of a Web Mercator
  source on a globe are filled from its own coarsest tile. Not done: a rule that no two drawn
  levels in one area differ by more than one.
- **Status and credits**: the element emits `basemap-status` (`{ source, state, attribution,
error? }`, `error` being `{ code: "E_BASEMAP_UNREACHABLE", params: { source, status } }` with
  `status` null because an image load reveals no HTTP status) and reports `fallback` when a tile
  service drew nothing and failed; the credits list only sources that drew a tile, each a link,
  on one line or folded into a "(c)" button, raised by `element.attributionOffset`. The app shows
  "Not reachable" at a custom Address, announces Map shown and fallback, and sets the offset to the
  toolbar's height.
- **Map dimension in 2D**: `session.layout.optionInEffect(id, option, dimension)` answers
  `setting.notIn2d` with `params.drawn: "2d"` for `location-map.mapDimension`; the value is kept
  for the 3D view (5.1), and the app's Map type field offers only the 2D map in 2D.
- **The owner's matrix (2026-10-22)**: a flat map in 3D opens seen from the south at 45 degrees, so
  its edges read as arcs above it (straight down, an arc looks like a straight line, and the flat
  3D map looked like the 2D one); a globe opens framed as the whole sphere, not on its data (framed
  on its data, a globe looked like a flat map with arcs).
- **"Automatic (column)"**: `element.mapFrame.location` names the columns used; `optionsFor` lists
  every node column for the three location options, fitting ones first and the rest with
  `refusal: { code: "location.column-unfit", params: { role, share } }`.
- **Map choice**: the select in Graph settings > Map is labeled Source; the Map layout form has one
  row naming the source that moves focus there.
- **Node size**: `nodeScale` (above) and the globe radius rule.
- **Gestures**: a reader's own pan or zoom stops the camera gliding back to the selection until it
  changes (any layout); on a map the wheel zooms toward the pointer; dragging the globe keeps the
  grabbed point under the pointer (babylonjs-map's `raySphere`).
- **Reduced motion**: `element.cameraTransitionDuration` (ms; 0 moves at once, glides included);
  the app sets 0 when the reader prefers reduced motion.
- **Recommendation**: `recommend.location-map`, fired by `recommendLayout(..., { locations })` and by
  `session.recommendLayout()`, which reads the map's own estimate. The import's recommended layout
  is unchanged (it does not pass `locations`).
- **Gray backdrop**: `natural-earth-gray`, the bundled picture desaturated and lightened in a canvas
  at load (kind `light` in the catalog); no new image file.
- **Small fixes**: Escape in the Advanced pop-out closes only it, and its gear has the tooltip
  Advanced; one-point data spans 10 degrees, other data at least 0.01; the Venice sample card is
  re-rendered with darker edges and outlined nodes (`tools/render-sample-thumbnails.mjs`, median
  mark contrast 3.5:1 on white).
- **From checking these on screen**: a globe drag turns about the globe's
  center wherever the camera looks; a map replaced by one on the other surface (an undo from globe
  to flat) is framed again; the basemap status stays `loading` while a tile's
  shader compiles; the Map form shows the location note once, under the field the places were
  read from. Not fixed: the tray lies on the map itself now that the map continues past the data,
  where its row can read as places in the ocean (Select on the notice finds them); and a tile
  service is still credited beside Natural Earth, whose picture is drawn under it.

Added to the open names (15.1): the refusal code `layout.needs-location`, `recommend.location-map`,
`location.column-unfit`, the frame facts `element.mapFrame` (`location`, `unplaced`, `warnings`),
`nodeScale`, `basemap.beyond`, `attributionOffset`, `cameraTransitionDuration`,
`session.layout.optionInEffect`, `session.recommendLayout`, the `basemap-status` event and
`E_BASEMAP_UNREACHABLE`, the source id `natural-earth-gray` and the catalog kind `light`; and the
default `beyond: "continue"`. The map's default node and edge casing (`basemap.casing`) was
removed after review: a layout gives nodes and edges no look of its own. `results.location-map.*` is not built (4.3).

## 16. Implementation plan

Each phase is a small landed change behind no switch (the layout is new, so nothing existing
changes until a consumer picks it). Each phase lists its tests.

**Phase 1: the layout, no map (smallest useful slice).** The `location-map` layout with
`latitude`/`longitude` columns and the decimal, GeoJSON, ISO 6709 and DMS formats, `format: "auto"`,
Web Mercator, `extent: "data"`, the tray and the spread, the warnings and published results, on a
flat surface in 2D and 3D, edges as today's straight lines. Draws the graph-samples `openflights`
and `contiguous-usa` datasets in the right shape with no map at all. Tests: parser and detection
unit tests (`default` project), a browser test that loads `contiguous-usa` and checks node
positions against projected coordinates, and a Storybook story per dataset.

**Phase 2: the flat map.** `BasemapManager`, the bundled Natural Earth image, raster tile sources
(`openstreetmap`, `opentopomap`, `usgs-*`, `nasa-gibs-blue-marble`, `eox-s2cloudless-2016`), custom
tile templates and single images, LOD tile loading for the flat map in 2D and 3D, the attribution
strip, `basemapStatus`, the remaining formats (geohash, plus codes, MGRS, UTM, WKT). The graphty
app's Basemap control. Tests: tile selection math unit tests; a browser test with a local tile
server (no network in CI) that zooms with real wheel input and checks the requested tile levels;
visual baselines from the bundled map only (network tiles are never captured).

**Phase 3: arcs and the globe.** `line.route` and `line.arcHeight`; raised arcs on the flat 3D
map; `mapDimension: "3d"` with great-circle arcs, globe quadtree LOD and polar caps. Tests: arc
geometry unit tests (endpoints, peak height, segment counts), a real-input orbit and zoom test on
the globe, visual baselines.

**Phase 4: keys and names.** Keyed sources (Stadia, MapTiler, Mapbox, CARTO, Esri, Thunderforest,
Google 2D) through the credential store; the offline gazetteer; keyed geocoders with rate limits
and caching in the project file; `nodeScale: "screen"`; other projections through d3-geo.

**Phase 5: vector maps.** OpenFreeMap, PMTiles and OpenStreetMap vector tiles painted in a worker,
light and dark styles from a style JSON subset.

**Later, each its own design:** clustering and flow aggregation, heatmaps and region overlays,
terrain relief, the Babylon 9 upgrade (geospatial camera, deep globe zoom), Google Photorealistic
3D Tiles through the optional `3d-tiles-renderer` peer.

See `design/extensions/candidates.md` sections 17 and 20 for the earlier basemap and edge-geometry
verdicts this design implements.
