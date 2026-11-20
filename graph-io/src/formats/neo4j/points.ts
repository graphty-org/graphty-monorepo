/**
 * Neo4j point values as node positions: a point property read into the role-`position` column with its coordinate
 * system (cartesian or WGS-84, 2D or 3D), and written back as a point literal in the same coordinate reference system.
 */

import { type CoordinateSystem, type CoordinateSystemInput } from "@graphty/graph-format";

import { formatF64 } from "../../common/format.js";

/** One Neo4j point: its coordinate reference system and x, y, z (longitude, latitude, height when geographic). */
export interface Neo4jPoint {
    readonly geographic: boolean;
    readonly dims: 2 | 3;
    readonly xyz: [number, number, number];
}

/** The four coordinate reference systems Neo4j has, by name and by SRID. */
const CRS_BY_NAME: Readonly<Record<string, { geographic: boolean; dims: 2 | 3 }>> = {
    cartesian: { geographic: false, dims: 2 },
    "cartesian-3d": { geographic: false, dims: 3 },
    "wgs-84": { geographic: true, dims: 2 },
    "wgs-84-3d": { geographic: true, dims: 3 },
};
const CRS_BY_SRID: Readonly<Record<number, string>> = {
    7203: "cartesian",
    9157: "cartesian-3d",
    4326: "wgs-84",
    4979: "wgs-84-3d",
};

/**
 * The first finite number among a point object's keys.
 * @param point - the point object
 * @param keys - the keys, in order of preference
 * @returns the number, or undefined when no key holds one
 */
function first(point: Readonly<Record<string, unknown>>, keys: readonly string[]): number | undefined {
    for (const key of keys) {
        const v = point[key];
        if (typeof v === "number" && Number.isFinite(v)) {
            return v;
        }
    }
    return undefined;
}

/**
 * A parsed point literal (`parsePointText()`) as a position, the way Neo4j reads it: the `crs` (or `srid`), else
 * WGS-84 when it names a longitude or latitude and cartesian otherwise; 3D when it has a z or a height.
 * @param value - the parsed point object
 * @param headerCrs - the crs the header's `{crs:...}` option names, or undefined
 * @returns the point, or null when it is not a point of finite numbers
 */
export function neo4jPoint(value: unknown, headerCrs: string | undefined): Neo4jPoint | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null;
    }
    const p = value as Readonly<Record<string, unknown>>;
    const srid = typeof p.srid === "number" ? CRS_BY_SRID[p.srid] : undefined;
    const named = typeof p.crs === "string" ? p.crs : (srid ?? headerCrs);
    const crs = named === undefined ? undefined : CRS_BY_NAME[named.toLowerCase()];
    if (named !== undefined && crs === undefined) {
        return null;
    }
    const geographic = crs?.geographic ?? first(p, ["longitude", "latitude"]) !== undefined;
    const x = first(p, geographic ? ["longitude", "x"] : ["x"]);
    const y = first(p, geographic ? ["latitude", "y"] : ["y"]);
    const z = first(p, geographic ? ["height", "z"] : ["z"]);
    if (x === undefined || y === undefined) {
        return null;
    }
    const dims = crs?.dims ?? (z === undefined ? 2 : 3);
    return { geographic, dims, xyz: [x, y, dims === 3 ? (z ?? 0) : 0] };
}

/**
 * The coordinate system of a position column read from Neo4j points.
 * @param point - the column's first point
 * @returns the declaration's `coordinates`
 */
export function neo4jCoordinates(point: Neo4jPoint): CoordinateSystemInput {
    return point.geographic
        ? { kind: "geographic", dims: point.dims, crs: point.dims === 3 ? "wgs-84-3d" : "wgs-84" }
        : { kind: "cartesian", dims: point.dims, units: "file", yAxis: "up" };
}

/**
 * A Neo4j point literal of one position, in its column's coordinate reference system: 3D when the column is, or when
 * the point has a z other than 0.
 * @param system - the column's coordinate system
 * @param xyz - x, y, z (longitude, latitude, height), y up for a cartesian column
 * @returns the literal, or null when a coordinate is not finite
 */
export function formatNeo4jPoint(system: CoordinateSystem, xyz: ArrayLike<number>): string | null {
    // a 3D point among 2D ones (the column records its first point's dims) keeps its z
    const three = system.dims === 3 || (xyz.length > 2 && xyz[2] !== 0);
    const values = three ? [xyz[0], xyz[1], xyz[2]] : [xyz[0], xyz[1]];
    if (!values.every((v) => Number.isFinite(v))) {
        return null;
    }
    const geographic = system.kind === "geographic";
    const keys = geographic ? ["longitude", "latitude", "height"] : ["x", "y", "z"];
    const crs = (geographic ? "wgs-84" : "cartesian") + (three ? "-3d" : "");
    const parts = values.map((v, k) => `${keys[k]}:${formatF64(v)}`);
    return `{${parts.join(", ")}, crs:'${crs}'}`;
}
