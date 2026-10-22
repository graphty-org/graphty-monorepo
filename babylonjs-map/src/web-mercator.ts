/** A point in WGS 84 degrees. */
export interface LatLon {
    lat: number;
    lon: number;
}

/** A point in the unit square: x from 0 (180 W) to 1 (180 E), y from 0 (north edge) to 1 (south edge). */
export interface UnitXY {
    x: number;
    y: number;
}

/** The latitude Web Mercator stops at, in degrees: the square map's top and bottom edges. */
export const WEB_MERCATOR_MAX_LATITUDE = 85.0511287798066;

const DEG = Math.PI / 180;

/**
 * Web Mercator (EPSG:3857), the projection every web tile source is drawn in, as a pair of
 * functions over the unit square. Tile (z, tx, ty) covers x in [tx, tx + 1] / 2^z and y in
 * [ty, ty + 1] / 2^z. Latitudes beyond +/-85.05 degrees are clamped to the map's edge.
 */
export const webMercator = {
    /**
     * Projects a latitude and longitude onto the unit square.
     * @param point - The point in degrees.
     * @returns The point's x and y in [0, 1].
     */
    forward(point: LatLon): UnitXY {
        const lat = Math.max(-WEB_MERCATOR_MAX_LATITUDE, Math.min(WEB_MERCATOR_MAX_LATITUDE, point.lat));
        const sin = Math.sin(lat * DEG);
        return {
            x: (point.lon + 180) / 360,
            y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
        };
    },

    /**
     * Turns a point on the unit square back into a latitude and longitude.
     * @param point - The point's x and y in [0, 1].
     * @returns The point in degrees.
     */
    inverse(point: UnitXY): LatLon {
        return {
            lat: (2 * Math.atan(Math.exp((0.5 - point.y) * 2 * Math.PI)) - Math.PI / 2) / DEG,
            lon: point.x * 360 - 180,
        };
    },
};
