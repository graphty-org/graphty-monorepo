import {
    type Column,
    coordinateSystemOf,
    detAcos,
    detLog,
    detSin,
    type F64,
    type GraphSnapshot,
} from "@graphty/graph-format";

import type { LayoutResult } from "../positions.js";
import { type CommonLayoutOptions, planar, refusal, resolve, result } from "./common.js";

/**
 * How longitude and latitude become x and y:
 * - "equirectangular": x is the longitude and y the latitude, in radians (plate carree).
 * - "web-mercator": the projection of web map tiles (EPSG:3857); latitudes beyond +-85.0511 degrees are clamped.
 * - "equal-earth": the Equal Earth projection (Savric, Patterson and Jenny, 2018), which keeps areas in proportion.
 */
export type GeographicProjection = "equirectangular" | "web-mercator" | "equal-earth";

/** Options of the geographic layout. */
export interface GeographicLayoutOptions extends CommonLayoutOptions {
    /**
     * A node column holding longitude then latitude in degrees (an altitude component is ignored). Default: the
     * snapshot's role-`position` column when its coordinates are geographic.
     */
    readonly position?: string | null | undefined;
    /** A numeric node column of longitudes in degrees; give it with `latitude` instead of `position`. */
    readonly longitude?: string | null | undefined;
    /** A numeric node column of latitudes in degrees; give it with `longitude` instead of `position`. */
    readonly latitude?: string | null | undefined;
    /** The projection; default "equirectangular". */
    readonly projection?: GeographicProjection | undefined;
    /**
     * The longitude, in degrees, drawn at the center; the map's left and right edges are the meridian opposite it.
     * "auto" centers the narrowest longitude range holding every node, so the edges of the map fall in the widest
     * gap between nodes: nodes on both sides of the 180th meridian (Fiji, the Aleutians, Pacific routes) are drawn
     * side by side and the edges between them run the short way. Default 0 (Greenwich).
     */
    readonly centralMeridian?: number | "auto" | undefined;
}

/** The numeric columns the layout reads coordinates from. */
type NumericColumn = Extract<Column, { readonly dtype: "f32" | "f64" | "i32" | "u32" | "u8" }>;
const NUMERIC = new Set<string>(["f32", "f64", "i32", "u32", "u8"]);

/**
 * Whether a column holds numbers.
 * @param column - the column
 * @returns true for f32, f64, i32, u32 and u8
 */
function isNumeric(column: Column): column is NumericColumn {
    return NUMERIC.has(column.dtype);
}

const RAD = Math.PI / 180;
/** The latitude where Web Mercator's square world ends, in degrees. */
const WEB_MERCATOR_MAX_LATITUDE = 85.0511287798066;
// Equal Earth's polynomial coefficients (Savric et al. 2018, equations 1 and 2)
const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;

/** Each projection of a longitude and a latitude in radians onto the unit sphere's map. */
const PROJECTIONS: Readonly<Record<GeographicProjection, (lon: number, lat: number) => [number, number]>> = {
    equirectangular: (lon, lat) => [lon, lat],
    "web-mercator": (lon, lat) => {
        const max = WEB_MERCATOR_MAX_LATITUDE * RAD;
        const clamped = Math.min(max, Math.max(-max, lat));
        // ln(tan(PI / 4 + lat / 2)), written as atanh(sin(lat)) with the engine-independent functions
        const sin = detSin(clamped);
        return [lon, detLog((1 + sin) / (1 - sin)) / 2];
    },
    "equal-earth": (lon, lat) => {
        const sinT = M * detSin(lat);
        const t = Math.PI / 2 - detAcos(sinT); // asin
        const t2 = t * t;
        const t6 = t2 * t2 * t2;
        const x = (lon * Math.sqrt(1 - sinT * sinT)) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
        return [x, t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2))];
    },
};

/**
 * A node column the option names, refused when the snapshot does not hold it or it is not numeric.
 * @param s - the snapshot
 * @param name - the column name
 * @param option - the option naming it
 * @returns the column
 */
function numericColumn(s: GraphSnapshot, name: string, option: string): NumericColumn {
    const column = s.nodes.get(name);
    if (column === null) {
        throw refusal(
            new RangeError(`${option} names node column "${name}", which the snapshot does not hold`),
            "E_UNKNOWN_COLUMN",
            {
                option,
                column: name,
            },
        );
    }
    if (!isNumeric(column)) {
        throw refusal(new TypeError(`node column "${name}" is ${column.dtype}, not numeric`), "E_COLUMN_TYPE", {
            option,
            column: name,
            dtype: column.dtype,
            expected: "f32, f64, i32, u32 or u8",
        });
    }
    return column;
}

/**
 * Component `k` of a row of a numeric column; NaN for an unset row.
 * @param column - a numeric column
 * @param row - the row
 * @param k - the component
 * @returns the value
 */
function read(column: NumericColumn, row: number, k: number): number {
    return column.isSet(row) ? column.data[row * column.meta.components + k] : Number.NaN;
}

/**
 * Each node's longitude and latitude in degrees, NaN where a node has none.
 * @param s - the snapshot
 * @param options - the options naming the columns
 * @returns `2 * n` values, longitude then latitude
 */
function lonLat(s: GraphSnapshot, options: GeographicLayoutOptions): F64 {
    const n = s.nodeCount;
    const out = new Float64Array(2 * n);
    const { longitude, latitude } = options;
    if ((longitude ?? null) !== null || (latitude ?? null) !== null) {
        if (typeof longitude !== "string" || typeof latitude !== "string") {
            const option = typeof longitude === "string" ? "latitude" : "longitude";
            throw refusal(new Error("longitude and latitude are given together"), "E_BAD_OPTION", {
                option,
                value: options[option],
            });
        }
        const lon = numericColumn(s, longitude, "longitude");
        const lat = numericColumn(s, latitude, "latitude");
        for (let i = 0; i < n; i++) {
            out[2 * i] = read(lon, i, 0);
            out[2 * i + 1] = read(lat, i, 0);
        }
        return out;
    }
    const column = positionColumn(s, options.position ?? null);
    for (let i = 0; i < n; i++) {
        out[2 * i] = read(column, i, 0);
        out[2 * i + 1] = read(column, i, 1);
    }
    return out;
}

/**
 * The longitude / latitude column: the named one (refused when it declares cartesian coordinates), else the
 * role-`position` column when its coordinates are geographic.
 * @param s - the snapshot
 * @param name - the `position` option
 * @returns the column
 */
function positionColumn(s: GraphSnapshot, name: string | null): NumericColumn {
    if (name === null) {
        const byRole = s.nodes.byRole("position");
        if (byRole === null || coordinateSystemOf(byRole.meta).kind !== "geographic") {
            throw refusal(
                new RangeError(
                    "the snapshot holds no geographic position column; name one with position, or longitude and latitude",
                ),
                "E_UNKNOWN_COLUMN",
                { option: "position", column: null },
            );
        }
        return numericColumn(s, byRole.meta.name, "position");
    }
    const column = numericColumn(s, name, "position");
    if (column.meta.components < 2 || column.meta.coordinates?.kind === "cartesian") {
        throw refusal(new TypeError(`node column "${name}" holds no longitude and latitude`), "E_COLUMN_TYPE", {
            option: "position",
            column: name,
            dtype: column.dtype,
            expected: "geographic coordinates",
        });
    }
    return column;
}

/**
 * The center of the narrowest longitude range holding every given longitude: the range left when the largest gap
 * between neighbors around the circle is cut out.
 * @param lons - longitudes in degrees, -180 to 180
 * @returns its center in degrees; 0 for none
 */
function narrowestCenter(lons: number[]): number {
    if (lons.length === 0) {
        return 0;
    }
    lons.sort((a, b) => a - b);
    const last = lons.at(-1) ?? lons[0];
    // the gap across the antimeridian, from the last longitude round to the first
    let gap = lons[0] + 360 - last;
    let west = lons[0];
    let east = last;
    for (let i = 1; i < lons.length; i++) {
        if (lons[i] - lons[i - 1] > gap) {
            gap = lons[i] - lons[i - 1];
            west = lons[i];
            east = lons[i - 1] + 360;
        }
    }
    return (west + east) / 2;
}

/**
 * A longitude relative to the central meridian, wrapped into -180..180 (one already in range is kept, so -180 and
 * 180 stay on their own edges).
 * @param lon - the longitude in degrees
 * @param meridian - the central meridian in degrees
 * @returns the relative longitude
 */
function relative(lon: number, meridian: number): number {
    const d = lon - meridian;
    return d >= -180 && d <= 180 ? d : ((((d + 180) % 360) + 360) % 360) - 180;
}

/**
 * Nodes where a map puts them: each node's longitude and latitude in degrees, projected. x grows east and y north
 * (y up), and `scale` is the radius of the globe the map is drawn from (default 1, so an equirectangular map spans
 * `[-PI, PI]` by `[-PI / 2, PI / 2]`). A node with no coordinates, or a latitude outside -90..90, gets a NaN row
 * (unplaced). In 3D the map lies in the plane of the center's z; an altitude is not drawn.
 * @param s - the snapshot; its node columns are read
 * @param options - where the coordinates are, the projection and the central meridian
 * @returns the layout
 * @throws an Error with `code` `E_UNKNOWN_COLUMN` when no column holds the coordinates, `E_COLUMN_TYPE` when a named
 * column is not numeric (or `position` declares cartesian coordinates), `E_BAD_OPTION` for an unknown projection, a
 * non-finite central meridian, or only one of `longitude` and `latitude`
 * @example
 * ```ts
 * import { geographic } from "@graphty/layout";
 *
 * // snapshot: nodes with "lon" and "lat" columns in degrees
 * const { positions } = geographic(snapshot, { longitude: "lon", latitude: "lat", projection: "web-mercator" });
 * ```
 */
export function geographic(s: GraphSnapshot, options: GeographicLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    const projection: string = options.projection ?? "equirectangular";
    if (!(projection in PROJECTIONS)) {
        throw refusal(new Error(`unknown projection ${projection}`), "E_BAD_OPTION", {
            option: "projection",
            value: projection,
        });
    }
    const project = PROJECTIONS[projection as GeographicProjection];
    const meridianOption = options.centralMeridian ?? 0;
    if (meridianOption !== "auto" && !Number.isFinite(meridianOption)) {
        throw refusal(new RangeError('centralMeridian must be finite or "auto"'), "E_BAD_OPTION", {
            option: "centralMeridian",
            value: meridianOption,
        });
    }
    const coords = lonLat(s, options);
    const valid = (i: number): boolean =>
        Number.isFinite(coords[2 * i]) && Number.isFinite(coords[2 * i + 1]) && Math.abs(coords[2 * i + 1]) <= 90;
    let meridian = 0;
    if (meridianOption === "auto") {
        const lons: number[] = [];
        for (let i = 0; i < n; i++) {
            if (valid(i)) {
                lons.push(relative(coords[2 * i], 0));
            }
        }
        meridian = narrowestCenter(lons);
    } else {
        meridian = meridianOption;
    }
    const rows = new Float64Array(2 * n);
    for (let i = 0; i < n; i++) {
        if (!valid(i)) {
            rows[2 * i] = Number.NaN;
            rows[2 * i + 1] = Number.NaN;
            continue;
        }
        const [x, y] = project(relative(coords[2 * i], meridian) * RAD, coords[2 * i + 1] * RAD);
        rows[2 * i] = x * scale + center[0];
        rows[2 * i + 1] = y * scale + center[1];
    }
    return result(planar(rows, dim, center), dim, n);
}
