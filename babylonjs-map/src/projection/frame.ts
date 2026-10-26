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
    /** The smallest span, in degrees, so a single point still gets a box. Default 1. */
    minSpan?: number;
}

/**
 * The west and east edges of the narrowest longitude range holding every longitude: the range
 * left when the largest gap between neighbors (around the circle) is cut out. The east edge passes
 * 180 when the range crosses the antimeridian, so `east - west` is always the span.
 * @param lons - The longitudes, -180 to 180.
 * @returns West and east, west in -180..180 and east >= west.
 */
function longitudeRange(lons: number[]): [number, number] {
    const sorted = [...lons].sort((a, b) => a - b);
    // The gap across the antimeridian, from the last longitude round to the first.
    let gap = sorted[0] + 360 - sorted[sorted.length - 1]; // NOSONAR(S7755): babylonjs-map's lib is ES2020, which has no Array#at
    let west = sorted[0];
    let east = sorted[sorted.length - 1]; // NOSONAR(S7755): babylonjs-map's lib is ES2020, which has no Array#at
    for (let i = 1; i < sorted.length; i++) {
        const between = sorted[i] - sorted[i - 1];
        if (between > gap) {
            gap = between;
            west = sorted[i];
            east = sorted[i - 1] + 360;
        }
    }
    return [west, east];
}

/**
 * The box around some points, with a margin. Latitudes are clamped to the poles; longitudes are
 * not clamped, because the box takes the narrowest longitude range, which crosses the
 * antimeridian for data around it (Fiji, the Aleutians): then the east edge is past 180 (a box
 * from 170 to 190 is 170 E to 170 W). The west edge is never before -180. Shift a point's
 * longitude by 360 to place it in such a box ({@link longitudeIn}).
 * @param points - The points in degrees; non-finite ones are skipped.
 * @param options - Margin and minimum span.
 * @returns The box, or null when no point is finite.
 */
export function boundsOf(points: Iterable<LatLon>, options: BoundsOfOptions = {}): GeoBounds | null {
    const { margin = 0.1, minSpan = 1 } = options;
    const lons: number[] = [];
    let south = Infinity;
    let north = -Infinity;
    for (const { lat, lon } of points) {
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            continue;
        }
        lons.push(lon);
        south = Math.min(south, lat);
        north = Math.max(north, lat);
    }
    if (lons.length === 0) {
        return null;
    }
    const [west, east] = longitudeRange(lons);
    const halfLon = Math.min(180, (Math.max(east - west, minSpan) / 2) * (1 + 2 * margin));
    const halfLat = (Math.max(north - south, minSpan) / 2) * (1 + 2 * margin);
    const lon = (west + east) / 2;
    // The west edge in -180..180, so a box across the antimeridian runs east past 180.
    const turn = lon - halfLon < -180 ? 360 : 0;
    const lat = (south + north) / 2;
    return [
        [lon - halfLon + turn, Math.max(-90, lat - halfLat)],
        [lon + halfLon + turn, Math.min(90, lat + halfLat)],
    ];
}

/**
 * A longitude moved by whole turns into a box's west-to-east range, when one lands in it.
 * @param lon - The longitude, -180 to 180.
 * @param bounds - The box; its east edge may pass 180 and its west edge may be before -180.
 * @returns The longitude, plus or minus 360 when that puts it inside the box.
 */
export function longitudeIn(lon: number, bounds: GeoBounds): number {
    const [[west], [east]] = bounds;
    for (const shifted of [lon, lon + 360, lon - 360]) {
        if (shifted >= west && shifted <= east) {
            return shifted;
        }
    }
    return lon;
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
