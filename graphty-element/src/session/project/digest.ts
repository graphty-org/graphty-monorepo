/**
 * @file The canonical state digest: one string that is equal for two states exactly when they
 * hold the same project. The round-trip and random-sequence tests compare it before and after
 * undo and redo.
 *
 * Canonical means order-free where order carries no meaning: map and set entries are sorted, and
 * object keys are sorted. Functions (a compiled selector's predicate) are left out, because they
 * are derived from data that is hashed.
 *
 * The graph part hashes the `graph` slice (the records by id and the graph-level values), and,
 * given the snapshot, the rows behind it: node ids in row order, edges in row order
 * with their endpoints and weights, and every column of the snapshot's tables except the two the
 * positions lane lends it. The arrangement part is off until captures are restored.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { stableDigest } from "../runs/runId";
import type { ProjectState } from "./state";

/** Which optional parts a digest includes. */
interface DigestOptions {
    /** Hash the `arrangement` slice. Off until undo restores coordinates. */
    readonly arrangement?: boolean;
    /** The snapshot of the graph the state holds, whose rows are hashed with the slice. */
    readonly snapshot?: GraphSnapshot;
}

/** The columns the positions lane lends every snapshot: coordinates, not rows. */
const LANE_COLUMNS: ReadonlySet<string> = new Set(["position", "graphty.pinned"]);

/**
 * The canonical text of a value.
 * @param value - Any value state holds.
 * @param path - The objects being written, to cut a cycle instead of recursing forever.
 * @returns Its text; equal for equal values whatever their insertion order.
 */
function canonical(value: unknown, path: WeakSet<object>): string {
    if (typeof value === "number") {
        return Object.is(value, -0) ? "0" : String(value);
    }

    if (typeof value === "bigint") {
        return `${value}n`;
    }

    if (typeof value === "symbol") {
        return value.toString();
    }

    if (typeof value !== "object" || value === null) {
        return value === undefined ? "undefined" : JSON.stringify(value);
    }

    if (path.has(value)) {
        return "[cycle]";
    }

    path.add(value);
    try {
        if (ArrayBuffer.isView(value)) {
            const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

            return `${value.constructor.name}(${bytes.join(",")})`;
        }

        if (Array.isArray(value)) {
            return `[${value.map((entry: unknown) => canonical(entry, path)).join(",")}]`;
        }

        if (value instanceof Map) {
            const entries = [...value].map(([key, entry]) => `${canonical(key, path)}:${canonical(entry, path)}`);

            return `Map{${entries.sort().join(",")}}`;
        }

        if (value instanceof Set) {
            return `Set{${[...value].map((entry: unknown) => canonical(entry, path)).sort().join(",")}}`;
        }

        if (value instanceof Date) {
            return `Date(${value.getTime()})`;
        }

        const entries = Object.entries(value)
            .filter(([, entry]) => entry !== undefined && typeof entry !== "function")
            .sort(([left], [right]) => (left < right ? -1 : 1))
            .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry, path)}`);

        return `{${entries.join(",")}}`;
    } finally {
        path.delete(value);
    }
}

/**
 * The canonical digest of a project state.
 * @param state - The state.
 * @param options - Which optional parts to include.
 * @returns A digest, equal for equal states.
 */
export function stateDigest(state: ProjectState, options: DigestOptions = {}): string {
    const path = new WeakSet();
    const parts = [
        // The records and graph values; the token and epoch name rows, they are not content, and
        // a rollback takes a fresh token for rows that are the same.
        `graph=${canonical({ nodes: state.graph.nodes, edges: state.graph.edges, values: state.graph.values }, path)}`,
        `pins=${canonical(state.pins, path)}`,
        `config=${canonical(state.config, path)}`,
        `layout=${canonical(state.layout, path)}`,
        `runs=${canonical(state.runs, path)}`,
        `styles=${canonical(state.styles, path)}`,
        `visibility=${canonical(state.visibility, path)}`,
        `scopes=${canonical(state.scopes, path)}`,
        `views=${canonical(state.views, path)}`,
    ];
    if (options.snapshot !== undefined) {
        parts.push(`rows=${rowsDigest(options.snapshot, path)}`);
    }

    if (options.arrangement === true) {
        parts.push(`arrangement=${canonical(state.arrangement, path)}`);
    }

    return stableDigest(parts.join("\n"));
}

/**
 * The canonical text of a snapshot's rows: row order is meaningful here, so nothing is sorted
 * except the column names.
 * @param snapshot - The snapshot.
 * @param path - The cycle guard of the digest being written.
 * @returns Its text.
 */
function rowsDigest(snapshot: GraphSnapshot, path: WeakSet<object>): string {
    const { ids, weights, edgeToArc } = snapshot;
    const edges = Array.from({ length: snapshot.edgeCount }, (_, edge) => [
        ids.idOf(snapshot.edgeSource(edge)),
        ids.idOf(snapshot.edgeTarget(edge)),
        weights === null ? 1 : weights[edgeToArc[edge]],
    ]);
    const tables = { nodes: snapshot.nodes, edges: snapshot.edges, graph: snapshot.graph };
    const columns = Object.entries(tables).map(([table, columns]) =>
        [...columns.names()]
            .filter((name) => !LANE_COLUMNS.has(name))
            .sort()
            .map((name) => {
                const values = Array.from({ length: columns.rowCount }, (_, row) => columns.value(name, row));
                return `${table}.${name}=${canonical(values, path)}`;
            })
            .join(";"),
    );

    return [
        `directed=${String(snapshot.directed)}`,
        `nodes=${canonical(ids.toArray(), path)}`,
        `edges=${canonical(edges, path)}`,
        ...columns,
    ].join("|");
}
