import type { Projection } from "./types.js";

/** The latitude Web Mercator stops at, in degrees: the square map's top and bottom edges. */
export const WEB_MERCATOR_MAX_LATITUDE = 85.0511287798066;

const DEG = Math.PI / 180;

/**
 * Web Mercator (EPSG:3857), the projection every web tile source is drawn in, over the unit
 * square. Tile (z, tx, ty) covers x in [tx, tx + 1] / 2^z and y in [ty, ty + 1] / 2^z. Latitudes
 * beyond +/-85.05 degrees are clamped to the map's edge.
 */
export const webMercator: Projection = {
    id: "web-mercator",
    height: 1,
    maxLatitude: WEB_MERCATOR_MAX_LATITUDE,

    forward(point) {
        const lat = Math.max(-WEB_MERCATOR_MAX_LATITUDE, Math.min(WEB_MERCATOR_MAX_LATITUDE, point.lat));
        const sin = Math.sin(lat * DEG);
        return {
            x: (point.lon + 180) / 360,
            y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
        };
    },

    inverse(point) {
        return {
            lat: (2 * Math.atan(Math.exp((0.5 - point.y) * 2 * Math.PI)) - Math.PI / 2) / DEG,
            lon: point.x * 360 - 180,
        };
    },
};

/**
 * Equirectangular (plate carree, EPSG:4326 tiles): longitude and latitude drawn as a 2:1 grid.
 * x runs 0 to 1 from 180 W to 180 E and y runs 0 to 0.5 from the north pole to the south pole,
 * so one unit is 360 degrees on both axes.
 */
export const equirectangular: Projection = {
    id: "equirectangular",
    height: 0.5,
    maxLatitude: 90,

    forward(point) {
        const lat = Math.max(-90, Math.min(90, point.lat));
        return { x: (point.lon + 180) / 360, y: (90 - lat) / 360 };
    },

    inverse(point) {
        return { lat: 90 - point.y * 360, lon: point.x * 360 - 180 };
    },
};
