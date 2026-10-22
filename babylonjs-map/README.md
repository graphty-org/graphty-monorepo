# babylonjs-map

Maps and globes for [Babylon.js](https://www.babylonjs.com/) scenes.

**Early days.** Today the package holds the Web Mercator projection and a parser for decimal
latitude and longitude. It is growing into a reusable map and globe library for Babylon.js:

- map projections (Web Mercator, equirectangular, Equal Earth and more)
- a tile pyramid that picks and loads the tiles a camera can see
- a globe mesh, and level of detail that follows the zoom
- map source definitions for free and keyed tile providers, with their attribution
- `babylonjs-map/location`: parsers for location formats (decimal pairs, GeoJSON points, degrees
  minutes seconds, ISO 6709, geohash and others), with no Babylon.js dependency

```bash
npm install babylonjs-map
```

The map and globe code will take `@babylonjs/core` 8 as a peer dependency. `babylonjs-map/location`
never loads Babylon.js, so it works in Node, a Web Worker or a page without a 3D scene.

## Project a point

```ts
import { webMercator } from "babylonjs-map";

const { x, y } = webMercator.forward({ lat: 40.6398, lon: -73.7789 });
// x and y in [0, 1]: x from 180 W to 180 E, y from the map's north edge to its south edge.
// Tile (z, tx, ty) of a web tile source covers x in [tx, tx + 1] / 2^z, y in [ty, ty + 1] / 2^z.

webMercator.inverse({ x, y }); // { lat: 40.6398, lon: -73.7789 }
```

Web Mercator stops at about 85.05 degrees north and south (`WEB_MERCATOR_MAX_LATITUDE`); points
beyond it are placed on the map's edge.

## Read a location

```ts
import { isLocationError, parseLatLon } from "babylonjs-map/location";

parseLatLon("40.64, -73.78"); // { lat: 40.64, lon: -73.78 }
parseLatLon([40.64, -73.78]); // { lat: 40.64, lon: -73.78 }

const result = parseLatLon("95, 10");
if (isLocationError(result)) {
    result.code; // "range"
}
```

`parseLatLon` reads latitude first. It never throws: a value it cannot read returns
`{ code, params: { value } }`, where `code` is `"empty"`, `"syntax"` or `"range"`, so your
application decides how to word the message.

## License

MIT
