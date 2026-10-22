// This entry point never imports Babylon.js (test/location-no-babylon.test.ts checks it), so it runs
// in Node, a worker or a page without a 3D scene.
export type { LatLon, LocationError, LocationErrorCode } from "./parse-lat-lon.js";
export { isLocationError, parseLatLon } from "./parse-lat-lon.js";
