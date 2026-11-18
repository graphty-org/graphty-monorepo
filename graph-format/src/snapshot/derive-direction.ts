/**
 * Derived graphs that change how arcs are oriented or merged (design section 7.3): `toUndirected`,
 * `transpose` and `simplified`.
 */

import { INVALID_INDEX } from "../constants.js";
import {
    type EdgeListView,
    type GraphSnapshot,
    type ReverseView,
    type SimplifyOptions,
    type ToUndirectedOptions,
    type U32,
} from "../types/index.js";
import { type SnapshotParts } from "../types/internal.js";
import { assertOneOf, WEIGHT_REDUCERS } from "../util/options.js";
import { noteShared } from "../util/shared-buffers.js";
import { deriveGroupedEdges } from "./derive-reduce.js";
import { checkReducers, type DerivedParts, groupingFromSurvivors, NO_REPORT } from "./derived.js";
import { arcRangeIn } from "./queries.js";
import { computeFlags, isIdentity } from "./validate.js";

// ============================================================ toUndirected, transpose

/**
 * The end of the run of parallel arcs (same column) that starts at arc `a` of a row ending at `end`.
 * @param colIdx - the column indices
 * @param a - the first arc of the run
 * @param end - the end of the row
 * @returns the first arc past the run
 */
function parallelRunEnd(colIdx: U32, a: number, end: number): number {
    const v = colIdx[a];
    let g = a + 1;
    while (g < end && colIdx[g] === v) {
        g++;
    }
    return g;
}

/**
 * Visit every run of parallel arcs (same row, same column) in arc order.
 * @param source - the snapshot
 * @param visit - called with the row u, the column v, the run's first arc a and the arc past it g
 */
function forEachParallelRun(source: GraphSnapshot, visit: (u: number, v: number, a: number, g: number) => void): void {
    const { nodeCount, rowPtr, colIdx } = source;
    for (let u = 0; u < nodeCount; u++) {
        const end = rowPtr[u + 1];
        let a = rowPtr[u];
        while (a < end) {
            const g = parallelRunEnd(colIdx, a, end);
            visit(u, colIdx[a], a, g);
            a = g;
        }
    }
}

/**
 * Pair the i-th arc u -> v (from `a`) with the i-th arc v -> u (from `lo`) for `pairs` pairs: both
 * edges survive as the lower edge index.
 * @param survivorOf - the survivor of each edge (written)
 * @param arcToEdge - the arc -> edge permutation
 * @param a - the first arc u -> v
 * @param lo - the first arc v -> u
 * @param pairs - how many pairs
 */
function pairReciprocalArcs(survivorOf: U32, arcToEdge: U32, a: number, lo: number, pairs: number): void {
    for (let i = 0; i < pairs; i++) {
        const e1 = arcToEdge[a + i];
        const e2 = arcToEdge[lo + i];
        const low = Math.min(e1, e2);
        const high = Math.max(e1, e2);
        survivorOf[low] = low;
        survivorOf[high] = low;
    }
}

/**
 * `toUndirected(options)` on a directed snapshot (design section 7.3): every edge becomes undirected;
 * reciprocal pairs u -> v / v -> u (paired k-th to k-th among parallels, in edge order) collapse to
 * one edge keeping the lower index's row and the reduced weight (default "first"); with
 * `reciprocal: true` only paired edges survive. Self-loops are kept.
 * @param source - a directed snapshot
 * @param list - the source edge list
 * @param options - reciprocal filtering and the weight reducer
 * @returns the derived parts
 */
export function deriveToUndirected(
    source: GraphSnapshot,
    list: EdgeListView,
    options: ToUndirectedOptions = {},
): DerivedParts {
    const reciprocal = options.reciprocal === true;
    const reducer = assertOneOf("weights", options.weights, WEIGHT_REDUCERS) ?? "first";
    const { edgeCount, rowPtr, colIdx, arcToEdge } = source;
    const survivorOf = new Uint32Array(edgeCount);
    for (let e = 0; e < edgeCount; e++) {
        survivorOf[e] = reciprocal && list.src[e] !== list.dst[e] ? INVALID_INDEX : e;
    }
    forEachParallelRun(source, (u, v, a, g) => {
        if (v > u) {
            const [lo, hi] = arcRangeIn(rowPtr, colIdx, v, u);
            pairReciprocalArcs(survivorOf, arcToEdge, a, lo, Math.min(g - a, hi - lo));
        }
    });
    return deriveGroupedEdges(source, list, groupingFromSurvivors(survivorOf), false, reducer, undefined);
}

/**
 * `transpose()` on a directed snapshot (design section 7.3): the orientation of every edge swapped by
 * adopting the reverse view's arrays as the core (zero copy, so `arena` is null); node and edge
 * spaces unchanged, tables shared.
 * @param source - a directed snapshot
 * @param reverse - its reverse view
 * @returns the derived parts
 */
export function deriveTranspose(source: GraphSnapshot, reverse: ReverseView): DerivedParts {
    const { nodeCount, edgeCount, arcCount, selfLoopCount } = source;
    const revArcToEdge = reverse.arcToEdge;
    const identity = isIdentity(revArcToEdge);
    let arcToEdge: U32 | null = null;
    let edgeToArc: U32 | null = null;
    if (!identity) {
        arcToEdge = revArcToEdge;
        edgeToArc = new Uint32Array(edgeCount);
        for (let k = 0; k < arcCount; k++) {
            edgeToArc[revArcToEdge[k]] = k;
        }
    }
    const flags = computeFlags({
        directed: true,
        nodeCount,
        rowPtr: reverse.rowPtr,
        colIdx: reverse.colIdx,
        weights: reverse.weights,
        arcToEdge,
        selfLoopCount,
    });
    // the adopted arrays stay held by the source's cached reverse view (design section 9.1)
    noteShared(reverse.rowPtr.buffer);
    noteShared(reverse.colIdx.buffer);
    if (reverse.weights !== null) {
        noteShared(reverse.weights.buffer);
    }
    if (arcToEdge !== null) {
        noteShared(arcToEdge.buffer);
    }
    const parts: SnapshotParts = {
        label: source.label,
        serial: null,
        directed: true,
        nodeCount,
        edgeCount,
        arcCount,
        selfLoopCount,
        rowPtr: reverse.rowPtr,
        colIdx: reverse.colIdx,
        weights: reverse.weights,
        arcToEdge,
        edgeToArc,
        flags,
        ids: source.ids,
        nodes: source.nodes,
        edges: source.edges,
        graph: source.graph,
        extensions: source.extensions,
        meta: source.meta,
        arena: null,
        checksum: false,
    };
    return {
        parts,
        nodeOrigin: null,
        edgeOrigin: null,
        nodeRemap: null,
        edgeRemap: null,
        blockSizes: null,
        report: NO_REPORT,
    };
}

// ============================================================ simplified

/**
 * `simplified(options)` (design section 7.3): one edge per (u, v) group (parallels are adjacent by
 * I4; undirected groups are unordered pairs), survivor = lowest index, weights per `weights`
 * (default "first"), self-loops kept or dropped, other edge columns per `edgeReducers` (default: the
 * survivor's row). `flags.multigraph` is false afterwards.
 * @param source - the source snapshot
 * @param list - the source edge list
 * @param options - reducers and self-loop policy
 * @returns the derived parts
 */
export function deriveSimplified(
    source: GraphSnapshot,
    list: EdgeListView,
    options: SimplifyOptions = {},
): DerivedParts {
    const reducer = assertOneOf("weights", options.weights, WEIGHT_REDUCERS) ?? "first";
    const dropLoops = assertOneOf("selfLoops", options.selfLoops, ["keep", "drop"] as const) === "drop";
    checkReducers("edgeReducers", options.edgeReducers);
    const { edgeCount, arcToEdge } = source;
    const survivorOf = new Uint32Array(edgeCount).fill(INVALID_INDEX);
    forEachParallelRun(source, (u, v, a, g) => {
        if ((source.directed || v >= u) && !(v === u && dropLoops)) {
            const survivor = arcToEdge[a];
            for (let i = a; i < g; i++) {
                survivorOf[arcToEdge[i]] = survivor;
            }
        }
    });
    return deriveGroupedEdges(
        source,
        list,
        groupingFromSurvivors(survivorOf),
        source.directed,
        reducer,
        options.edgeReducers,
    );
}
