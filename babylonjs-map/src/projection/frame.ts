import { equirectangular, webMercator } from "./projections.js";
import type { GeoBounds, LatLon, Projection, ProjectionId } from "./types.js";

/** Every projection, by id. */
export const projections: Readonly<Record<ProjectionId, Projection>> = {
    "web-mercator": webMercator,
    equirectangular,
};

/**
 * The whole map a projection can show.
 * @param projection - The projection or its id.
 * @returns `[[-180, -maxLatitude], [180, maxLatitude]]`.
 */
export function worldBounds(projection: Projection | ProjectionId): GeoBounds {
    const { maxLatitude } = typeof projection === "string" ? projections[projection] : projection;
    return [
        [-180, -maxLatitude],
        [180, maxLatitude],
    ];
}

/** Options of {@link boundsOf}. */
export interface BoundsOfOptions {
    /** Space added on every side, as a share of the points' span. Default 0.1. */
    margin?: number;
    /** The smallest span, in degrees, so a single point still gets a box. Default 0.01 (about 1 km). */
    minSpan?: number;
}

/**
 * The box around some points, with a margin, clamped to the world.
 * @param points - The points in degrees; non-finite ones are skipped.
 * @param options - Margin and minimum span.
 * @returns The box, or null when no point is finite.
 */
export function boundsOf(points: Iterable<LatLon>, options: BoundsOfOptions = {}): GeoBounds | null {
    const { margin = 0.1, minSpan = 0.01 } = options;
    let west = Infinity;
    let south = Infinity;
    let east = -Infinity;
    let north = -Infinity;
    for (const { lat, lon } of points) {
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            continue;
        }
        west = Math.min(west, lon);
        east = Math.max(east, lon);
        south = Math.min(south, lat);
        north = Math.max(north, lat);
    }
    if (west === Infinity) {
        return null;
    }
    // ponytail: no antimeridian handling; data spanning 180 degrees (Fiji, the Aleutians) gets a
    // world-wide box. Add the largest-longitude-gap test when wrapped bounds are drawn.
    const halfLon = (Math.max(east - west, minSpan) / 2) * (1 + 2 * margin);
    const halfLat = (Math.max(north - south, minSpan) / 2) * (1 + 2 * margin);
    const lon = (west + east) / 2;
    const lat = (south + north) / 2;
    return [
        [Math.max(-180, lon - halfLon), Math.max(-90, lat - halfLat)],
        [Math.min(180, lon + halfLon), Math.min(90, lat + halfLat)],
    ];
}

/** A flat map placed in a scene: a projection, the box it shows and its size in scene units. */
export interface MapFrame {
    readonly projection: Projection;
    /** The box shown, clamped to the projection's latitudes. */
    readonly bounds: GeoBounds;
    /** Scene units across the box's longer side. */
    readonly size: number;
    /** The box's width and height in scene units. */
    readonly width: number;
    readonly height: number;
    /** Where a point lands: x east, y north, the box centered on the origin. */
    toScene(point: LatLon): { x: number; y: number };
    /** The point at a scene position (the inverse of `toScene`). */
    fromScene(position: { x: number; y: number }): LatLon;
}

/** Options of {@link createMapFrame}. */
export interface MapFrameOptions {
    /** Default `web-mercator`, which matches every web tile source. */
    projection?: Projection | ProjectionId;
    /** The box to show; default the whole world. */
    bounds?: GeoBounds;
    /** Scene units across the box's longer side. Default 100. */
    size?: number;
}

/**
 * Places a projected box in a scene, so a city fills the same `size` scene units a world map
 * would. Scaling the shown box (rather than the world) keeps scene numbers small at street zoom.
 * @param options - Projection, box and size.
 * @returns The frame.
 */
export function createMapFrame(options: MapFrameOptions = {}): MapFrame {
    const projection =
        typeof options.projection === "string" ? projections[options.projection] : (options.projection ?? webMercator);
    const size = options.size ?? 100;
    const max = projection.maxLatitude;
    const [[w, s], [e, n]] = options.bounds ?? worldBounds(projection);
    const bounds: GeoBounds = [
        [w, Math.max(-max, s)],
        [e, Math.min(max, n)],
    ];
    const topLeft = projection.forward({ lat: bounds[1][1], lon: bounds[0][0] });
    const bottomRight = projection.forward({ lat: bounds[0][1], lon: bounds[1][0] });
    const spanX = bottomRight.x - topLeft.x;
    const spanY = bottomRight.y - topLeft.y;
    if (!(spanX > 0 && spanY > 0)) {
        throw new RangeError(`createMapFrame: empty bounds ${JSON.stringify(options.bounds)}`);
    }
    const scale = size / Math.max(spanX, spanY);
    const cx = (topLeft.x + bottomRight.x) / 2;
    const cy = (topLeft.y + bottomRight.y) / 2;
    return {
        projection,
        bounds,
        size,
        width: spanX * scale,
        height: spanY * scale,
        toScene(point) {
            const { x, y } = projection.forward(point);
            return { x: (x - cx) * scale, y: (cy - y) * scale };
        },
        fromScene(position) {
            return projection.inverse({ x: position.x / scale + cx, y: cy - position.y / scale });
        },
    };
}
