# API reference

babylonjs-map has three entry points, and the generated reference has a module for each:

| Module       | Import from                | Holds                                                                                         |
| ------------ | -------------------------- | --------------------------------------------------------------------------------------------- |
| `index`      | `babylonjs-map`            | `Globe`, `FlatMap`, `MapSurface`, `mapSources`, `loadTexture`, and every projection export    |
| `projection` | `babylonjs-map/projection` | `createMapFrame`, `boundsOf`, `webMercator`, `equirectangular`, `latLonToSphere`, `raySphere` |
| `location`   | `babylonjs-map/location`   | `parseLocation`, `detectLocationFormat`, `parseColumnValue`, `latLonFromColumns`              |

The main entry needs `@babylonjs/core` 8; `projection` and `location` never load it.

The pages are generated from the source's documentation comments, and are listed in the sidebar
under "Generated TypeDoc".
