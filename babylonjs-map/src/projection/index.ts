// This entry point never imports Babylon.js (test/no-babylon.test.ts checks it), so a layout can
// project points in Node or a worker.
export type { BoundsOfOptions, MapFrame, MapFrameOptions } from "./frame.js";
export { boundsOf, createMapFrame, longitudeIn, projections, worldBounds } from "./frame.js";
export { equirectangular, WEB_MERCATOR_MAX_LATITUDE, webMercator } from "./projections.js";
export { latLonToSphere, raySphere, sphereToLatLon } from "./sphere.js";
export type { GeoBounds, Handedness, LatLon, Projection, ProjectionId, UnitXY, XYZ } from "./types.js";
