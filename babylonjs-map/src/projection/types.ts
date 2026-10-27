/** A point in WGS 84 degrees. */
export interface LatLon {
    lat: number;
    lon: number;
}

/**
 * A point on a projection's map: x from 0 (180 W) to 1 (180 E), y from 0 (the map's north edge)
 * to the projection's `height` (its south edge).
 */
export interface UnitXY {
    x: number;
    y: number;
}

/** The projections this package draws maps in. */
export type ProjectionId = "web-mercator" | "equirectangular";

/** A map projection over a map one unit wide and `height` units tall. */
export interface Projection {
    readonly id: ProjectionId;
    /** The map's height in units of its width: 1 for Web Mercator, 0.5 for equirectangular. */
    readonly height: number;
    /** The furthest latitude north or south the map shows, in degrees. */
    readonly maxLatitude: number;
    /** Projects a point; latitudes beyond `maxLatitude` land on the map's edge. */
    forward(point: LatLon): UnitXY;
    /** Turns a point on the map back into degrees. */
    inverse(point: UnitXY): LatLon;
}

/** A position in a Babylon.js scene, or in a map node's own space. */
export interface XYZ {
    x: number;
    y: number;
    z: number;
}

/** A latitude and longitude box: `[[west, south], [east, north]]`, in degrees. */
export type GeoBounds = readonly [readonly [number, number], readonly [number, number]];

/** Which way a Babylon.js scene's z axis points: `left` is Babylon's default. */
export type Handedness = "left" | "right";
