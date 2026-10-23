# babylonjs-map

Maps and globes for [Babylon.js](https://www.babylonjs.com/) scenes: a flat map or a globe drawn
from a bundled world picture or from web map tiles, sharper tiles loaded as the camera comes closer,
and parsers for the common ways of writing a location.

```bash
npm install babylonjs-map @babylonjs/core
```

`@babylonjs/core` 8 is a peer dependency. `babylonjs-map/location` and `babylonjs-map/projection`
never load Babylon.js, so they work in Node, a Web Worker or a page without a 3D scene.

## A globe

```ts
import { ArcRotateCamera, Engine, Scene, Vector3 } from "@babylonjs/core";
import { Globe } from "babylonjs-map";

const engine = new Engine(canvas);
const scene = new Scene(engine);
new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 300, Vector3.Zero(), scene).attachControl();

const globe = new Globe(scene, { radius: 100 });
const marker = globe.toScene({ lat: 40.64, lon: -73.78 }, 1); // 1 unit above the surface
engine.runRenderLoop(() => scene.render());
```

The globe sits at the origin with the north pole up and longitude 0 facing a camera on the scene's
default side. Left- and right-handed scenes (`scene.useRightHandedSystem`) both work. The map is
wrapped onto the sphere and needs no light: it is drawn at full brightness where the globe faces the
camera and darker toward its rim, so it reads as a ball.

## A flat map

```ts
import { FlatMap, mapSources } from "babylonjs-map";

const map = new FlatMap(scene, {
    sources: [mapSources.openstreetmap],
    frame: {
        bounds: [
            [-74.1, 40.55],
            [-73.7, 40.9],
        ],
        size: 100,
    }, // [[west, south], [east, north]]
});
map.toScene({ lat: 40.64, lon: -73.78 }); // a Vector3 on the map
```

The map lies in the x-y plane at z = 0, north up, the box centered on the origin and `size` scene
units across its longer side, so a city map uses the same small numbers as a world map. It looks the
same under a perspective camera and an orthographic 2D one. Leave `frame` out for the whole world.

The picture ends at the box (`beyond: "clip"`, the default). With `beyond: "continue"` every source
is drawn whole, a world to the east and west too, so panning or zooming out past the box still
shows map. A box whose east edge is past 180 degrees (data across the date line, which `boundsOf`
gives) is drawn from both sides of the line.

## Map sources

| Source                        | What it shows                                       | Deepest zoom |
| ----------------------------- | --------------------------------------------------- | ------------ |
| `natural-earth` (the default) | A 2048 x 1024 world picture shipped in the package  | one picture  |
| `natural-earth-gray`          | The same picture as a plain light gray backdrop     | one picture  |
| `openstreetmap`               | Streets                                             | 19           |
| `opentopomap`                 | Topographic                                         | 17           |
| `nasa-gibs-blue-marble`       | Satellite mosaic of the whole earth, poles included | 7            |
| `usgs-topo`, `usgs-imagery`   | US topographic maps and imagery                     | 16           |
| `eox-s2cloudless-2016`        | Cloudless satellite imagery                         | 15           |

None needs a key. `natural-earth` contacts no one; the others are public services that ask for light
use, and this package only ever requests the tiles in view. Sources are layered bottom first:

```ts
new Globe(scene, { sources: [mapSources["natural-earth"], mapSources.openstreetmap] });
```

Street tiles stop at 85 degrees north and south; on a globe the poles past that are filled from the
source's own coarsest tile. A picture can be drawn as a light gray backdrop with `tone: "gray"`.

Your own tile server or picture:

```ts
map.setSources([{ tiles: "https://tiles.example.com/{z}/{x}/{y}.png", attribution: "(c) Example", maxZoom: 18 }]);
map.setSources([
    {
        image: "/old-map.jpg",
        bounds: [
            [-10, 35],
            [30, 60],
        ],
        attribution: "(c) Library",
    },
]);
```

A template may use `{z}`, `{x}`, `{y}`, `{-y}` (TMS rows), `{s}` (with `subdomains`) and `{r}`.
`projection: "equirectangular"` reads EPSG:4326 tiles and pictures; `web-mercator` is the default
for tiles and `equirectangular` for pictures. A picture in the other projection is reprojected.

## Credits

Every tile service requires its credit to be visible while its tiles are. `map.attribution` lists
the credits of the sources that drew a tile; `map.credits` gives each with the page it links to
(`attributionUrl` on a source of your own). Show them over the canvas.

```ts
creditElement.textContent = map.attribution.join(" | ");
```

## Loading and level of detail

- `map.status` counts tiles `loading`, `ready` and `failed` (a failed tile is a CORS, 403, 404 or
  429 answer), in all and per source (`status.layers`).
- The level is chosen from the size of a texel on screen. A failed tile is asked for again after 1 s,
  doubling to a minute, and at once when the browser comes back online; meanwhile its parent is drawn
  in place of it and its siblings, so an area is never drawn from two levels once loading settles.
- `setSources` keeps the pictures of a source that stays (the base under a changed tile service).
- `map.onChangedObservable` fires when a tile arrives or fails. If your scene renders only on demand,
  render a frame then.
- Options: `lodScale` (default 1: a finer tile once a tile covers more than its own pixel size on
  screen), `maxTiles` (256 per source), `maxCachedTiles` (256), `maxConcurrentLoads` (6),
  `renderingGroupId` (0) and `loadTexture` (your own loader).
- `map.root` is the parent of every map mesh: move, rotate or scale it to place the map. Map meshes
  are not pickable.
- `map.dispose()` frees every mesh, material and texture.

## Projections

```ts
import { boundsOf, createMapFrame, latLonToSphere, webMercator } from "babylonjs-map/projection";

webMercator.forward({ lat: 40.64, lon: -73.78 }); // { x, y } on a map one unit wide
const box = boundsOf(points, { margin: 0.1 }); // the box around some points, or null
const frame = createMapFrame({ projection: "web-mercator", bounds: box, size: 100 });
frame.toScene({ lat: 40.64, lon: -73.78 }); // { x, y } in scene units
latLonToSphere({ lat: 40.64, lon: -73.78 }, 100, "left"); // { x, y, z } on a globe
raySphere(ray.origin, ray.direction, 100); // the point of a globe a ray meets first, or null
```

`boundsOf` takes the narrowest longitude range: for data across the date line its east edge passes
180, and `longitudeIn(lon, box)` shifts a longitude by 360 into it. A single point gets a box 1
degree across.

`webMercator` (tiles z/x/y cover x in [x, x + 1] / 2^z) and `equirectangular` (a 2:1 map).

## Read a location

```ts
import { detectLocationFormat, isLocationError, parseLocation } from "babylonjs-map/location";

parseLocation("40.64, -73.78"); // { lat: 40.64, lon: -73.78 }
parseLocation("40 38 23 N, 73 46 44 W");
parseLocation({ type: "Point", coordinates: [-73.78, 40.64] });
parseLocation("POINT(-73.78 40.64)");
parseLocation("+40.6398-073.7789/");
parseLocation("87G8J6QC+WC");
parseLocation("18TXK0325499489");
parseLocation("dr5x1n7", "geohash");

const result = parseLocation("95, 10");
if (isLocationError(result)) {
    result.code; // "range"
}
```

| Format      | Example                                               |
| ----------- | ----------------------------------------------------- |
| `decimal`   | `"40.64, -73.78"`, `[40.64, -73.78]`, `{ lat, lon }`  |
| `lon-lat`   | `"-73.78, 40.64"`                                     |
| `geojson`   | a Point or a Feature holding one, object or JSON text |
| `wkt`       | `"POINT(-73.78 40.64)"`, `"SRID=4326;POINT Z (...)"`  |
| `iso6709`   | `"+40.6398-073.7789/"`, `"+403823-0734644/"`          |
| `dms`       | `"40 38 23 N, 73 46 44 W"`, `"N40 38.383 W73 46.733"` |
| `geohash`   | `"dr5x1n7"`                                           |
| `plus-code` | `"87G8J6QC+WC"` (full codes)                          |
| `mgrs`      | `"18TXK0325499489"`                                   |
| `utm`       | `"18T 603254 4499489"`                                |

`parseLocation` never throws. A value it cannot read returns `{ code, params: { value } }` with
`code` one of `empty`, `syntax`, `range` or `short-code` (a short plus code needs a reference place),
so your application words the message.

Without a format, `parseLocation` tries them all except `lon-lat` and `geohash`, which only make
sense for a whole column. For a column, pick one format first:

```ts
const { format, share, alternatives } = detectLocationFormat(column);
const points = column.map((value) => parseLocation(value, format ?? "decimal"));
```

A column mixing spellings reads every value with `parseColumnValue(value, format)`: in the column's
format, else in the formats that cannot be mistaken (a decimal pair, DMS, WKT, GeoJSON, ISO 6709),
never as a geohash. `detectLocationFormat` scores geohashes only for a column of one length of at
least five characters with letters in it (so ZIP codes and words are not), and lists `lon-lat` as
an alternative when a decimal pair reads as well longitude first.

`latLonFromColumns(lat, lon)` reads separate latitude and longitude values: numbers, or text with a
hemisphere letter (`"51.5074 N"`) or a decimal comma (`"48,8566"`).

## License

MIT. The bundled world picture is [Natural Earth](https://www.naturalearthdata.com/) (public
domain).
