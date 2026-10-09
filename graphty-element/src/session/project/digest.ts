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
 * positions lane lends it. With `arrangement`, those two are hashed as well: the coordinates and
 * pin bytes the lane holds now, which is the arrangement undo and redo restore. The `arrangement`
 * slice itself is not hashed: it names the last capture, a record of how the lane got there.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { stableDigest } from "../runs/runId";
import type { ProjectState } from "./state";

/** Which optional parts a digest includes. */
interface DigestOptions {
    /** Hash the positions lane too: its coordinates and pin bytes. Needs `snapshot`. */
    readonly arrangement?: boolean;
    /** The snapshot of the graph the state holds, whose rows are hashed with the slice. */
    readonly snapshot?: GraphSnapshot;
}

/** The columns the positions lane lends every snapshot: coordinates, not rows. */
const LANE_COLUMNS: ReadonlySet<string> = new Set(["position", "graphty.pinned"]);

/** What a data digest leaves out besides the lane: the edge ids the element assigns per load. */
const NOT_DATA: ReadonlySet<string> = new Set([...LANE_COLUMNS, "graphty.edgeId"]);

/** Nothing left out. */
const NO_COLUMNS: ReadonlySet<string> = new Set();

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
            return `Set{${[...value]
                .map((entry: unknown) => canonical(entry, path))
                .sort()
                .join(",")}}`;
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
        // Each set by its revision, the canonical hash of its definition: a fixed set's edge
        // members are typed columns that a walk would materialise at 72 bytes a member.
        `sets=${canonical(
            new Map(
                [...state.sets].map(([id, set]) => [
                    id,
                    {
                        id: set.id,
                        name: set.name,
                        order: set.order,
                        createdFrom: set.createdFrom,
                        revision: set.revision,
                    },
                ]),
            ),
            path,
        )}`,
        `views=${canonical(state.views, path)}`,
        `notes=${canonical(state.notes, path)}`,
        `attributes=${canonical(state.attributes, path)}`,
    ];
    if (options.snapshot !== undefined) {
        parts.push(
            `rows=${rowsDigest(options.snapshot, path, options.arrangement === true ? NO_COLUMNS : LANE_COLUMNS)}`,
        );
    }

    return stableDigest(parts.join("\n"));
}

/** The data digest of each graph slice. */
const dataDigests = new WeakMap<object, string>();

/**
 * The digest of the graph's data alone: its node and edge records, and its rows (ids, endpoints,
 * weights and columns). Equal for two loads of the same data, whatever else the project holds, so
 * a run can tell that the numbers it was computed from have changed under it.
 *
 * Memoised per `graph` slice, which is replaced, never edited, when data moves. The snapshot is
 * read only on a miss: a layout replaces it every frame (positions are lane columns, which the
 * digest leaves out), so keying on it re-hashed the whole graph on every frame of a layout.
 * ponytail: hashes the whole graph once per data change; hash per column if a large graph's edits
 * make it show up in a profile.
 * @param graph - The `graph` slice.
 * @param readSnapshot - Reads the snapshot of its rows.
 * @returns The digest.
 */
export function dataDigest(graph: ProjectState["graph"], readSnapshot: () => GraphSnapshot): string {
    const held = dataDigests.get(graph);
    if (held !== undefined) {
        return held;
    }

    const path = new WeakSet();
    // Edge records by value: the element assigns an edge id per load, so a reload of the same
    // file names the same edges afresh.
    const edges = [...graph.edges.values()].map((edge) => canonical(edge, path)).sort();
    const digest = stableDigest(
        `graph=${canonical({ nodes: graph.nodes, edges }, path)}\nrows=${rowsDigest(readSnapshot(), path, NOT_DATA)}`,
    );
    dataDigests.set(graph, digest);

    return digest;
}

/**
 * The canonical text of a snapshot's rows: row order is meaningful here, so nothing is sorted
 * except the column names.
 * @param snapshot - The snapshot.
 * @param path - The cycle guard of the digest being written.
 * @param skip - The columns left out.
 * @returns Its text.
 */
function rowsDigest(snapshot: GraphSnapshot, path: WeakSet<object>, skip: ReadonlySet<string>): string {
    const { ids, weights, edgeToArc } = snapshot;
    const edges = Array.from({ length: snapshot.edgeCount }, (_, edge) => [
        ids.idOf(snapshot.edgeSource(edge)),
        ids.idOf(snapshot.edgeTarget(edge)),
        weights === null ? 1 : weights[edgeToArc[edge]],
    ]);
    const tables = { nodes: snapshot.nodes, edges: snapshot.edges, graph: snapshot.graph };
    const columns = Object.entries(tables).map(([table, columns]) =>
        [...columns.names()]
            .filter((name) => !skip.has(name))
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
