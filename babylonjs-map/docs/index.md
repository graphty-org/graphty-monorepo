# babylonjs-map

`babylonjs-map` puts maps and globes into [Babylon.js](https://www.babylonjs.com/) scenes:

- **a globe or a flat map**, drawn from a world picture shipped in the package or from web map
  tiles, with sharper tiles loaded as the camera comes closer;
- **projections** from latitude and longitude to scene coordinates, on a map or a sphere, and back;
- **location parsing** for the common ways of writing a place: decimal pairs, degrees, minutes and
  seconds, GeoJSON, WKT, ISO 6709, geohash, plus codes, MGRS and UTM.

The package knows nothing about graphs. Its projection and location entry points never load
Babylon.js, so they also run in Node, a Web Worker or a page without a 3D scene.

## Read next

- [Getting started](./guide/getting-started): install it and draw a globe.
- [Flat maps](./guide/flat-map): a map of one area, in a 3D or a 2D scene.
- [Map sources](./guide/sources): the built-in sources, your own tiles or picture, credits and
  loading.
- [Projections](./guide/projections): latitude and longitude to scene coordinates without a scene.
- [Reading locations](./guide/locations): parse a location, or a whole column of them.
- [API reference](./api/): every exported class, function, constant and type.
