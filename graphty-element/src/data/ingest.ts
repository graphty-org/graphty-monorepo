import { INVALID_INDEX } from "@graphty/graph-format";

import type { GraphStore } from "./GraphStore";

/**
 * Whether a value may be used as a graph-format node id.
 *
 * graph-format accepts a string or a FINITE number and throws `E_INVALID_ID` for anything else
 * (`graph-format/src/ids/node-id-map.ts`). The element is looser: a node id is whatever the
 * configured JMESPath expression returns, which is `null` for a record that does not carry the
 * key at all, and the element has always let such a record through and rendered it. So the id is
 * CHECKED here rather than thrown on -- an unusable id leaves the render object exactly as it is
 * today and keeps it out of the store, which is the one place the id has to be real.
 * @param id - the extracted id
 * @returns true when graph-format will accept it
 */
function isStorableId(id: unknown): id is string | number {
    return typeof id === "string" || (typeof id === "number" && Number.isFinite(id));
}

/**
 * The file-unit coordinate a record carries, in the two shapes the element's own data has always
 * used, or null when it carries none.
 *
 * `{ x, y, z? }` is what `FixedLayoutEngine` reads off `node.data` today
 * (`src/layout/FixedLayoutEngine.ts`), and `[x, y]` / `[x, y, z]` is the array form the importers
 * produce. A missing z is 0, not NaN: a 2D record IS placed, on the z = 0 plane, and NaN is
 * reserved for "no layout has run".
 *
 * Anything non-finite makes the WHOLE record unseeded rather than partly seeded. A row stored with
 * one NaN component reports itself PLACED (`ElementPositions.isPlaced` tests x), so a layout would
 * never repair it and the mesh would vanish; left unseeded, the node is laid out like any other.
 * @param record - the raw node record
 * @returns the file-unit triple, or null when there is nothing usable to seed
 */
function readSeedPosition(record: Record<string | number, unknown>): [number, number, number] | null {
    const { position } = record;
    if (position === null || typeof position !== "object") {
        return null;
    }

    let x: unknown;
    let y: unknown;
    let z: unknown;
    if (Array.isArray(position)) {
        if (position.length !== 2 && position.length !== 3) {
            return null;
        }

        [x, y] = position;
        z = position.length === 3 ? position[2] : 0;
    } else {
        const vector = position as { x?: unknown; y?: unknown; z?: unknown };
        ({ x, y } = vector);
        z = vector.z ?? 0;
    }

    if (typeof x !== "number" || typeof y !== "number" || typeof z !== "number") {
        return null;
    }

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return null;
    }

    return [x, y, z];
}

/**
 * Push one node record into the element's builder and seed its import position.
 *
 * The seed column keeps FILE units: `config.data.knownFields.positionScale` is applied by
 * `GraphStore` on every freeze, so a scale changed after a record arrived still reaches the scene
 * correctly from the same column.
 * @param store - the element's store
 * @param id - the node id, already extracted with JMESPath
 * @param record - the raw record
 * @returns the assigned node index -- `INVALID_INDEX` when the id is not one graph-format accepts
 *     -- and whether the builder already knew this id
 */
export function ingestNode(
    store: GraphStore,
    id: unknown,
    record: Record<string | number, unknown>,
): { index: number; merged: boolean } {
    if (!isStorableId(id)) {
        return { index: INVALID_INDEX, merged: false };
    }

    const before = store.builder.nodeCount;
    const index = store.builder.addNode(id);
    const merged = store.builder.nodeCount === before;

    const seed = readSeedPosition(record);
    if (seed !== null) {
        store.builder.setNodeValue(store.seedColumn, index, seed);
    }

    // EVERY mutating path touches, including this one when it was a merge: `builder.mutationCount`
    // counts neither a merge nor a column write, so a burst of merges would otherwise serve a stale
    // snapshot and fire no `snapshot-replaced` (DEP-M6-A).
    store.touch();
    return { index, merged };
}

/**
 * Resolve an edge weight: the configured path, then the legacy "value" key, then 1.
 *
 * The second probe exists because the conversion this replaced hard-coded a `value` weight key, so
 * every weighted dataset, fixture and story in this repository carries `value` and nothing carries
 * `weight`. Reading only the configured path would silently re-read all of them as unweighted.
 * The probe is removed once nothing ships a `value` key.
 * @param record - the raw edge record
 * @param path - `config.data.knownFields.edgeWeightPath`; null means "do not look"
 * @returns the weight and which probe produced it
 */
export function resolveEdgeWeight(
    record: Record<string | number, unknown>,
    path: string | null,
): { weight: number; source: "path" | "legacy" | "default" } {
    const fromPath = path === null ? undefined : record[path];
    if (typeof fromPath === "number" && Number.isFinite(fromPath)) {
        return { weight: fromPath, source: "path" };
    }

    const legacy = record.value;
    if (typeof legacy === "number" && Number.isFinite(legacy)) {
        return { weight: legacy, source: "legacy" };
    }

    return { weight: 1, source: "default" };
}

/**
 * Push one edge into the element's builder and stamp its element-assigned counter column.
 *
 * The builder is constructed with `addMissingNodes: true`, so an endpoint that has not arrived yet
 * is MATERIALISED here and the snapshot is complete while the render side is still catching up.
 * That is deliberate: the snapshot is the authoritative copy, and it must not be missing an edge
 * merely because a mesh has not been built for one of its endpoints.
 *
 * Note the argument order of `setEdgeValue`: `(column, edge, value)`. Swapping the first two is
 * `E_UNKNOWN_COLUMN` at run time in plain JavaScript; the branded `ColumnHandle` type is what makes
 * it a compile error here.
 * @param store - the element's store
 * @param srcId - source node id, already extracted with JMESPath
 * @param dstId - destination node id
 * @param weight - the resolved weight
 * @returns the logical edge index, or `INVALID_INDEX` when either id is not one graph-format accepts
 */
export function ingestEdge(store: GraphStore, srcId: unknown, dstId: unknown, weight: number): number {
    if (!isStorableId(srcId) || !isStorableId(dstId)) {
        return INVALID_INDEX;
    }

    const index = store.builder.addEdge(srcId, dstId, weight);
    store.builder.setEdgeValue(store.edgeIdColumn, index, store.nextEdgeId());
    store.touch();
    return index;
}
