import type { GlobeLook } from "@graphty/graphty-element/schema";

/**
 * How the app draws the location map's globe: as the earth is seen from space, with a glow of
 * air around its rim against a near-black sky. Handed to graphty-element as its `globeLook`, a
 * view setting; the element's own default draws neither, and a 2D map ignores it.
 */
export const APP_GLOBE_LOOK: GlobeLook = { atmosphere: true, background: "#05070d" };

/**
 * The picture the app wraps onto a globe of world data when the reader has chosen no map: NASA's
 * Blue Marble satellite mosaic with the sea floor's relief, free and keyless, loaded only for the tiles in view and finer as
 * the camera comes down to the surface. The bundled Natural Earth picture shows while it loads.
 */
export const APP_GLOBE_SOURCE = "nasa-gibs-blue-marble-bathymetry";
