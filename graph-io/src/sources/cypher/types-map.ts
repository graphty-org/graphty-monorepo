/**
 * The one type mapper of the Cypher source (design section 10): every transport's wire values --
 * Neo4j's typed JSON, neo4j-driver's objects, Neptune's plain JSON -- become the same plain values,
 * and every node, relationship and path becomes a GraphNode, a GraphRel or an array of them.
 *
 * - Integers: a number while it is exact; past 2^53 the `long` parameter picks a rounded number
 *   (W_PRECISION, once per column) or the exact digits as a string.
 * - Floats, booleans, strings: as they are. Dates and instants: epoch milliseconds. Local times,
 *   times and durations: their ISO text. Points: `{ srid, x, y, z? }`. Lists and maps: arrays and
 *   objects of mapped values. Bytes: dropped (W_SOURCE_VALUE).
 */

import { PRECISION_CODE } from "../../common/codes.js";
import { type ImportReportBuilder } from "../../common/report.js";
import { warnOn } from "../fail.js";

/** A node a query returned. */
export class GraphNode {
    /**
     * Create one.
     * @param id - the server's element id
     * @param labels - its labels
     * @param properties - its mapped properties
     */
    constructor(
        readonly id: string,
        readonly labels: readonly string[],
        readonly properties: Readonly<Record<string, unknown>>,
    ) {}
}

/** A relationship a query returned. */
export class GraphRel {
    /**
     * Create one.
     * @param id - the server's element id
     * @param start - the start node's element id
     * @param end - the end node's element id
     * @param type - its type
     * @param properties - its mapped properties
     */
    constructor(
        readonly id: string,
        readonly start: string,
        readonly end: string,
        readonly type: string,
        readonly properties: Readonly<Record<string, unknown>>,
    ) {}
}

/** What the mapper needs: the `long` choice and the report its warnings go to. */
export interface MapContext {
    /** Integers past 2^53: "f64" (rounded, W_PRECISION) or "string". */
    readonly long: "f64" | "string";
    /** The load's report. */
    readonly report: ImportReportBuilder;
}

/** Values past this need a 64-bit integer. */
const SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * An integer from its exact decimal digits.
 * @param digits - the digits
 * @param column - the column it belongs to, for the warning
 * @param m - the map context
 * @returns a number, or a string past 2^53 under `long: "string"`
 */
function integer(digits: string, column: string, m: MapContext): number | string {
    let big: bigint;
    try {
        big = BigInt(digits);
    } catch {
        return Number(digits);
    }
    if (big <= SAFE && big >= -SAFE) {
        return Number(big);
    }
    if (m.long === "string") {
        return big.toString();
    }
    m.report.warnOnce(
        "precision",
        PRECISION_CODE,
        `column ${column}: an integer beyond 2^53 was stored as the nearest 64-bit float; pass long: "string" to keep every digit`,
        undefined,
        `${PRECISION_CODE}:${column}`,
    );
    return Number(big);
}

/**
 * Epoch milliseconds of an ISO instant, the zone name in brackets ignored; the text itself when it
 * does not parse.
 * @param text - the ISO text
 * @param type - the server's type name
 * @param column - the column
 * @param m - the map context
 * @returns milliseconds, or the text
 */
function epoch(text: string, type: string, column: string, m: MapContext): number | string {
    const ms = Date.parse(withoutZoneName(text));
    if (Number.isNaN(ms)) {
        warnOn(m.report, "W_SOURCE_VALUE", `column ${column}: a ${type} kept as text`, { type, column, as: "string" });
        return text;
    }
    return ms;
}

/**
 * Warn that a value with no dtype was dropped; the caller leaves the property out.
 * @param type - the server's type name
 * @param column - the column
 * @param m - the map context
 */
function dropped(type: string, column: string, m: MapContext): void {
    warnOn(m.report, "W_SOURCE_VALUE", `column ${column}: a ${type} value was dropped`, {
        type,
        column,
        as: "dropped",
    });
}

/**
 * Map every property of a map, leaving out dropped values.
 * @param value - the map
 * @param each - maps one value, given its key
 * @returns the mapped map
 */
function mapEntries(
    value: Readonly<Record<string, unknown>>,
    each: (v: unknown, key: string) => unknown,
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
        const mapped = each(v, k);
        if (mapped !== undefined) {
            out[k] = mapped;
        }
    }
    return out;
}

/**
 * A WKT point as Neo4j's typed JSON spells it ("SRID=7203;POINT (1.0 2.0)").
 * @param text - the text
 * @returns `{ srid, x, y, z? }`, or the text when it does not parse
 */
function wktPoint(text: string): unknown {
    const match = /^SRID=(\d+);POINT(?: Z)? ?\(([^)]*)\)$/i.exec(text.trim());
    if (match === null) {
        return text;
    }
    const [x = 0, y = 0, z] = match[2].trim().split(/\s+/).map(Number);
    return z === undefined ? { srid: Number(match[1]), x, y } : { srid: Number(match[1]), x, y, z };
}

/** One typed JSON value: `{ "$type": "Integer", "_value": "42" }`. */
interface Typed {
    readonly $type: string;
    readonly _value: unknown;
}

/** The shape of a typed JSON node's value. */
interface TypedNode {
    readonly _element_id: string;
    readonly _labels: readonly string[];
    readonly _properties: Readonly<Record<string, unknown>>;
}

/** The shape of a typed JSON relationship's value. */
interface TypedRel {
    readonly _element_id: string;
    readonly _start_node_element_id: string;
    readonly _end_node_element_id: string;
    readonly _type: string;
    readonly _properties: Readonly<Record<string, unknown>>;
}

/**
 * Map a value of Neo4j's typed JSON (the Query API's `application/vnd.neo4j.query.v1.1`).
 * @param v - the wire value
 * @param column - the result column or property key it belongs to
 * @param m - the map context
 * @returns the plain value, a GraphNode, a GraphRel or an array; undefined when dropped
 */
export function fromTypedJson(v: unknown, column: string, m: MapContext): unknown {
    if (v === null || typeof v !== "object" || !("$type" in v)) {
        return v ?? null;
    }
    const { $type: type, _value: value } = v as Typed;
    switch (type) {
        case "Null":
            return null;
        case "Boolean":
        case "String":
            return value;
        case "Integer":
            return integer(String(value), column, m);
        case "Float":
            return Number(value);
        case "Date":
            return epoch(`${String(value)}T00:00:00Z`, type, column, m);
        case "OffsetDateTime":
        case "ZonedDateTime":
            return epoch(String(value), type, column, m);
        case "LocalDateTime":
        case "LocalTime":
        case "Time":
        case "Duration":
            return String(value);
        case "Point":
            return wktPoint(String(value));
        case "Base64":
            dropped(type, column, m);
            return undefined;
        case "List":
            return (value as readonly unknown[]).map((x) => fromTypedJson(x, column, m));
        case "Map":
            return mapEntries(value as Record<string, unknown>, (x) => fromTypedJson(x, column, m));
        case "Node": {
            const n = value as TypedNode;
            return new GraphNode(
                n._element_id,
                n._labels,
                mapEntries(n._properties, (x, k) => fromTypedJson(x, k, m)),
            );
        }
        case "Relationship": {
            const r = value as TypedRel;
            return new GraphRel(
                r._element_id,
                r._start_node_element_id,
                r._end_node_element_id,
                r._type,
                mapEntries(r._properties, (x, k) => fromTypedJson(x, k, m)),
            );
        }
        case "Path":
            return (value as readonly unknown[]).map((x) => fromTypedJson(x, column, m));
        default:
            warnOn(m.report, "W_SOURCE_VALUE", `column ${column}: a ${type} kept as text`, {
                type,
                column,
                as: "string",
            });
            return typeof value === "string" ? value : JSON.stringify(value);
    }
}

/** The parts of neo4j-driver the mapper uses: its type checks. */
export interface DriverTypes {
    isInt(v: unknown): boolean;
    isNode(v: unknown): boolean;
    isRelationship(v: unknown): boolean;
    isPath(v: unknown): boolean;
    isPoint(v: unknown): boolean;
    isDate(v: unknown): boolean;
    isDateTime(v: unknown): boolean;
    isLocalDateTime(v: unknown): boolean;
    isLocalTime(v: unknown): boolean;
    isTime(v: unknown): boolean;
    isDuration(v: unknown): boolean;
}

/** A driver node or relationship, as far as the mapper reads it. */
interface DriverEntity {
    readonly identity: unknown;
    readonly elementId?: string;
    readonly labels?: readonly string[];
    readonly type?: string;
    readonly start?: unknown;
    readonly end?: unknown;
    readonly startNodeElementId?: string;
    readonly endNodeElementId?: string;
    readonly properties: Readonly<Record<string, unknown>>;
}

/** A driver path. */
interface DriverPath {
    readonly start: unknown;
    readonly segments: readonly { readonly relationship: unknown; readonly end: unknown }[];
}

/** A driver point. */
interface DriverPoint {
    readonly srid: unknown;
    readonly x: number;
    readonly y: number;
    readonly z?: number;
}

/**
 * The text without a trailing bracketed zone name (`...+01:00[Europe/Paris]`).
 * @param text - the ISO text
 * @returns the text without the zone name
 */
function withoutZoneName(text: string): string {
    const end = text.length - 1;
    if (text[end] !== "]") {
        return text;
    }
    const open = text.indexOf("[", text.lastIndexOf("]", end - 1) + 1);
    return open === -1 || open >= end ? text : text.slice(0, open);
}

/**
 * Map a driver node or relationship.
 * @param e - the driver entity
 * @param node - whether it is a node
 * @param m - the map context
 * @param t - the driver's type checks
 * @returns a GraphNode or a GraphRel
 */
function fromEntity(e: DriverEntity, node: boolean, m: MapContext, t: DriverTypes): GraphNode | GraphRel {
    const props = mapEntries(e.properties, (x, k) => fromDriver(x, k, m, t));
    const id = e.elementId ?? String(e.identity);
    return node
        ? new GraphNode(id, [...(e.labels ?? [])], props)
        : new GraphRel(
              id,
              e.startNodeElementId ?? String(e.start),
              e.endNodeElementId ?? String(e.end),
              e.type ?? "",
              props,
          );
}

/**
 * Map a driver point.
 * @param p - the point
 * @returns srid, x, y and z when it has one
 */
function fromPoint(p: DriverPoint): { srid: number; x: number; y: number; z?: number } {
    const srid = Number(String(p.srid));
    return p.z === undefined ? { srid, x: p.x, y: p.y } : { srid, x: p.x, y: p.y, z: p.z };
}

/**
 * Map a value neo4j-driver returned. Its lossless Integer keeps every digit, so `long` decides.
 * @param v - the driver value
 * @param column - the result column or property key
 * @param m - the map context
 * @param t - the driver's type checks
 * @returns the plain value, a GraphNode, a GraphRel or an array; undefined when dropped
 */
export function fromDriver(v: unknown, column: string, m: MapContext, t: DriverTypes): unknown {
    if (v === null || v === undefined) {
        return null;
    }
    if (typeof v !== "object") {
        return typeof v === "bigint" ? integer(v.toString(), column, m) : v;
    }
    // driver values (Integer, the temporal types) spell themselves exactly through toString()
    const text = (): string => (v as { toString(): string }).toString();
    if (t.isInt(v)) {
        return integer(text(), column, m);
    }
    if (t.isNode(v) || t.isRelationship(v)) {
        return fromEntity(v as DriverEntity, t.isNode(v), m, t);
    }
    if (t.isPath(v)) {
        const p = v as DriverPath;
        return [p.start, ...p.segments.flatMap((s) => [s.relationship, s.end])].map((x) => fromDriver(x, column, m, t));
    }
    if (t.isDate(v)) {
        return epoch(`${text()}T00:00:00Z`, "Date", column, m);
    }
    if (t.isDateTime(v)) {
        return epoch(text(), "DateTime", column, m);
    }
    if (t.isLocalDateTime(v) || t.isLocalTime(v) || t.isTime(v) || t.isDuration(v)) {
        return text();
    }
    if (t.isPoint(v)) {
        return fromPoint(v as DriverPoint);
    }
    if (v instanceof Uint8Array || v instanceof ArrayBuffer) {
        dropped("ByteArray", column, m);
        return undefined;
    }
    if (Array.isArray(v)) {
        return v.map((x: unknown) => fromDriver(x, column, m, t));
    }
    return mapEntries(v as Record<string, unknown>, (x) => fromDriver(x, column, m, t));
}

/**
 * Map a value of Neptune's openCypher JSON: nodes `{ "~id", "~entityType": "node", "~labels",
 * "~properties" }`, relationships adding `~start`, `~end`, `~type`. Its numbers are plain JSON, so
 * an integer past 2^53 was already rounded on the wire (W_PRECISION).
 * @param v - the wire value
 * @param column - the result column or property key
 * @param m - the map context
 * @returns the plain value, a GraphNode, a GraphRel or an array
 */
export function fromNeptune(v: unknown, column: string, m: MapContext): unknown {
    if (typeof v === "number" && Number.isInteger(v) && !Number.isSafeInteger(v)) {
        return integer(BigInt(v).toString(), column, m);
    }
    if (v === null || typeof v !== "object") {
        return v ?? null;
    }
    if (Array.isArray(v)) {
        return v.map((x: unknown) => fromNeptune(x, column, m));
    }
    const o = v as Record<string, unknown>;
    const props = (): Record<string, unknown> =>
        mapEntries((o["~properties"] ?? {}) as Record<string, unknown>, (x, k) => fromNeptune(x, k, m));
    switch (o["~entityType"]) {
        case "node":
            return new GraphNode(String(o["~id"]), (o["~labels"] ?? []) as string[], props());
        case "relationship":
            return new GraphRel(String(o["~id"]), String(o["~start"]), String(o["~end"]), String(o["~type"]), props());
        default:
            return mapEntries(o, (x) => fromNeptune(x, column, m));
    }
}
