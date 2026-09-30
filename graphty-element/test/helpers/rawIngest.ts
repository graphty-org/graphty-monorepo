/**
 * @file Raw writes into a `GraphStore`, for tests that build a graph beneath a session without
 * any history: the session harness in `test/session/helpers.ts` and the mock graph. Nothing in
 * `src/` writes the store this way; the element writes it only through the graph primitives in
 * `src/session/project/graphOps.ts`, which record what undo needs.
 */

import { INVALID_INDEX } from "@graphty/graph-format";

import type { GraphStore } from "../../src/data/GraphStore";
import { readSeedPosition } from "../../src/data/seedPosition";
import type { DirectionOutcome } from "../../src/session/project/graphOps";

/**
 * Whether graph-format stores this id.
 * @param id - The id.
 * @returns True for a string or a finite number.
 */
function isStorableId(id: unknown): id is string | number {
    return typeof id === "string" || (typeof id === "number" && Number.isFinite(id));
}

/**
 * Push one node into the builder and seed its file coordinate.
 * @param store - The store.
 * @param id - The node id.
 * @param record - The record, read for a `position`.
 * @returns The row, INVALID_INDEX for an id graph-format will not take, and whether it existed.
 */
export function ingestNode(
    store: GraphStore,
    id: unknown,
    record: Record<string | number, unknown>,
): { index: number; merged: boolean } {
    if (!isStorableId(id)) {
        return { index: INVALID_INDEX, merged: false };
    }

    const merged = store.builder.hasNode(id);
    const index = store.builder.addNode(id);
    const seed = readSeedPosition(record);
    if (seed !== null) {
        store.builder.setNodeValue(store.seedColumn, index, seed);
    }

    store.touch();
    return { index, merged };
}

/**
 * Push one edge into the builder with the next element-assigned id.
 * @param store - The store.
 * @param srcId - The source id.
 * @param dstId - The target id.
 * @param weight - The weight.
 * @param fileId - The file's own id for the edge, its stable identity, when it has one.
 * @param capacity - Its flow capacity, written to the capacity column when it is not 1.
 * @returns The row and the id, INVALID_INDEX for both when an id cannot be stored.
 */
export function ingestEdge(
    store: GraphStore,
    srcId: unknown,
    dstId: unknown,
    weight: number,
    fileId?: string | number,
    capacity = 1,
): { index: number; edgeId: number } {
    if (!isStorableId(srcId) || !isStorableId(dstId)) {
        return { index: INVALID_INDEX, edgeId: INVALID_INDEX };
    }

    const index = store.builder.addEdge(srcId, dstId, weight);
    const edgeId = store.nextEdgeId();
    store.stampEdgeId(index, edgeId);
    if (capacity !== 1) {
        store.builder.setEdgeValue(store.capacityColumn, index, capacity);
    }

    // Completed at the next freeze, or with the load open around it, as the graph primitives'.
    store.recordIngestedEdge(index, edgeId, fileId);
    store.touch();
    return { index, edgeId };
}

/**
 * Give the builder the direction a file declared, as an import does: never over a direction the
 * configuration locked, and never once edges are held.
 * @param store - The store.
 * @param directed - The declared direction.
 * @param statedBy - The text that declared it.
 * @returns What happened.
 */
export function ingestDeclaredDirection(store: GraphStore, directed: boolean, statedBy: string): DirectionOutcome {
    const { builder } = store;
    if (builder.directed === directed) {
        if (!builder.directedLocked) {
            store.recordDirectionFromFile(statedBy);
        }

        return "unchanged";
    }

    if (builder.directedLocked) {
        return "config-wins";
    }

    if (builder.edgeCount > 0) {
        return "edges-present";
    }

    builder.setDirected(directed);
    store.recordDirectionFromFile(statedBy);
    store.touch();
    return "applied";
}
