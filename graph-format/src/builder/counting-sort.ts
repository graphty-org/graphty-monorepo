/**
 * The two stable counting-sort passes of the freeze pipeline (design section 6.3 steps 3-6, 8): arc
 * materialization (doubled storage for undirected graphs, self-loops once, invariant I7), the
 * identity check for directed input that is already grouped by source and sorted by target (step 4),
 * pass 1 by target, pass 2 by source into rowPtr with the scatter writing colIdx / arcToEdge /
 * edgeToArc straight into the target arrays (the arena, for a "keep" freeze), and the flag
 * predicates of design section 3.8 computed on the way (I9). There is no comparator sort anywhere;
 * the cost is O(n + A).
 *
 * Because pass 2 is stable and consumes arcs in pass-1 order, every row ends sorted by target with
 * parallel arcs in ascending logical-edge order (I4), and the k-th `u -> v` arc in row u and the
 * k-th `v -> u` arc in row v come from the same edge (design section 6.4).
 *
 * Layout of the passes, chosen from the memory profile of the 100k-node / 1M-edge benchmark (the
 * scatters are cache-miss bound, so the rule is: as few random streams per loop as possible, and no
 * random LOAD whose value a branch depends on inside a scatter):
 *
 * - One sequential pass over the edges counts arcs per target and per source (both prefix sums come
 *   out of it), counts the self-loops, and scans the weights (NaN refusal, I8; the min / max of the
 *   stored f32 values, from which the three weight flags follow, I9). Every edge lands on at least
 *   one arc, so predicates over the edges equal predicates over the arcs.
 * - Pass 1 scatters (source, edge) PAIRS into target order, one 8-byte write per arc into a single
 *   `byTarget` transient of 2A words; for an undirected graph a bitmap over the pass-1 positions
 *   marks the arc whose stored orientation is the declared one (the mirror arc of an edge is
 *   emitted right after it, so arcs stay in edge order within a bucket).
 * - Pass 2 reads `byTarget` sequentially bucket by bucket and scatters ONLY colIdx and arcToEdge (and
 *   edgeToArc when undirected, where the declared bit is at hand).
 * - Sequential post-passes derive edgeToArc from arcToEdge (directed), gather the arc weights
 *   through arcToEdge, and test adjacent targets within each row for the multigraph flag.
 *
 * Every loop lives in its own small function: V8 optimizes a hot loop by on-stack replacement of the
 * function that contains it, and a function invoked once per freeze with a dozen loops in it is
 * re-entered through stale OSR code that deoptimizes at every loop exit.
 *
 * Transients of the non-identity path: 2 x U32(n + 1), U32(2A), and for an undirected graph a bitmap
 * of A bits.
 */

import { INVALID_INDEX } from "../constants.js";
import { GraphFormatError } from "../errors.js";
import { type F32, type F64, type SnapshotFlags, type U32 } from "../types/index.js";
import { allocateCoreArrays, type CoreArrays } from "./arena.js";

/** The per-logical-edge input of the sort: views over the (compacted) staging arrays. */
export interface SortInput {
    /** Whether the graph is directed. */
    readonly directed: boolean;
    /** The node count n; every endpoint is below it. */
    readonly nodeCount: number;
    /** The logical edge count E; only the first E entries of src / dst / weights are read. */
    readonly edgeCount: number;
    /** Declared source of every edge. */
    readonly src: U32;
    /** Declared target of every edge. */
    readonly dst: U32;
    /** Per-edge staging weights (f32 or f64), or null when unweighted. */
    readonly weights: F32 | F64 | null;
}

/** What the sort produces: the core arrays, the counts and the truthful flags. */
export interface SortResult {
    /** The core arrays (in the arena when requested). */
    readonly core: CoreArrays;
    /** colIdx.length. */
    readonly arcCount: number;
    /** Logical edges with source === target. */
    readonly selfLoopCount: number;
    /** The flags of design section 3.8, computed from the arrays (invariant I9). */
    readonly flags: SnapshotFlags;
}

/**
 * The number of self-loop edges among the first `edgeCount` entries.
 * @param src - sources
 * @param dst - targets
 * @param edgeCount - how many edges to inspect
 * @returns the loop count
 */
export function countSelfLoops(src: U32, dst: U32, edgeCount: number): number {
    let loops = 0;
    for (let e = 0; e < edgeCount; e++) {
        if (src[e] === dst[e]) {
            loops++;
        }
    }
    return loops;
}

/**
 * The identity check of design section 6.3 step 4: whether (src[e], dst[e]) is non-decreasing
 * lexicographically, so that a stable sort by (source, target) moves nothing and the CSR permutation is
 * the identity.
 * @param src - sources
 * @param dst - targets
 * @param edgeCount - how many edges to inspect
 * @returns true when the edges are already in CSR order
 */
export function isSortedEdgeList(src: U32, dst: U32, edgeCount: number): boolean {
    for (let e = 1; e < edgeCount; e++) {
        const u = src[e];
        const prev = src[e - 1];
        if (u < prev || (u === prev && dst[e] < dst[e - 1])) {
            return false;
        }
    }
    return true;
}

/**
 * The E_INVALID_WEIGHT error for a NaN staging weight (invariant I8).
 * @param e - the logical edge
 * @param w - the value
 * @returns the error
 */
function nanWeight(e: number, w: number): GraphFormatError {
    return new GraphFormatError("E_INVALID_WEIGHT", `edge ${e} has a NaN weight`, { edge: e, weight: w });
}

// ============================================================ the sequential edge pass

/**
 * The weight scan of design section 6.3 step 8 over the first `edgeCount` staging weights: NaN is
 * refused (invariant I8, the bulk-input re-check, naming the lowest such edge), and the smallest and
 * largest STORED values -- the values as the f32 arc array holds them (invariant I9: an f64 that
 * rounds to 1, to -0 or to Infinity counts as its rounded value) -- are left in `bounds[0]` and
 * `bounds[1]`. They are written from inside the loop whenever they change, so the loop's optimized
 * code has no exit path without type feedback.
 * @param edgeWeights - the staging weights
 * @param edgeCount - how many edges to inspect; at least 1
 * @param bounds - two slots initialized to +Infinity / -Infinity; receive the minimum and the maximum
 */
function scanStoredWeights(edgeWeights: F32 | F64, edgeCount: number, bounds: F64): void {
    let min = Infinity;
    let max = -Infinity;
    for (let e = 0; e < edgeCount; e++) {
        const w = Math.fround(edgeWeights[e]);
        if (Number.isNaN(w)) {
            throw nanWeight(e, edgeWeights[e]);
        }
        if (w < min) {
            min = w;
            bounds[0] = w;
        }
        if (w > max) {
            max = w;
            bounds[1] = w;
        }
    }
}

/**
 * The counting half of the directed sort (design section 6.3 steps 5 and 6, the `cnt` arrays):
 * arcs per target into `targetCount[v + 1]` and arcs per source into `rowCount[u + 1]`, ready for the
 * exclusive prefix sums.
 * @param src - sources
 * @param dst - targets
 * @param edgeCount - the logical edge count
 * @param targetCount - n + 1 zeroed counters, by target
 * @param rowCount - n + 1 zeroed counters, by source
 * @returns the self-loop count
 */
function countDirectedArcs(src: U32, dst: U32, edgeCount: number, targetCount: U32, rowCount: U32): number {
    let loops = 0;
    for (let e = 0; e < edgeCount; e++) {
        const u = src[e];
        const v = dst[e];
        targetCount[v + 1]++;
        rowCount[u + 1]++;
        if (u === v) {
            loops++;
        }
    }
    return loops;
}

/**
 * The counting half of the undirected sort (design section 6.3 steps 3, 5 and 6): every non-loop
 * edge contributes an arc in each direction, a self-loop one arc (invariant I7).
 * @param src - sources
 * @param dst - targets
 * @param edgeCount - the logical edge count
 * @param targetCount - n + 1 zeroed counters, by target
 * @param rowCount - n + 1 zeroed counters, by source
 * @returns the self-loop count
 */
function countUndirectedArcs(src: U32, dst: U32, edgeCount: number, targetCount: U32, rowCount: U32): number {
    let loops = 0;
    for (let e = 0; e < edgeCount; e++) {
        const u = src[e];
        const v = dst[e];
        targetCount[v + 1]++;
        rowCount[u + 1]++;
        if (u === v) {
            loops++;
        } else {
            targetCount[u + 1]++;
            rowCount[v + 1]++;
        }
    }
    return loops;
}

/**
 * Turn per-node counts stored at index + 1 into exclusive prefix sums in place: afterwards
 * `counts[v]` is the start of v's bucket and `counts[nodeCount]` the total.
 * @param counts - n + 1 counters with `counts[0] === 0`
 * @param nodeCount - n
 */
function prefixSum(counts: U32, nodeCount: number): void {
    for (let v = 0; v < nodeCount; v++) {
        counts[v + 1] += counts[v];
    }
}

// ============================================================ the identity path

/**
 * The identity path of design section 6.3 step 4 (directed input already in CSR order): colIdx is a
 * copy of dst, and the multigraph flag is one comparison of adjacent edges.
 * @param src - sources, grouped
 * @param dst - targets, sorted within each group
 * @param edgeCount - the logical edge count
 * @param colIdx - receives dst
 * @returns true when two adjacent edges connect the same pair
 */
function copySortedTargets(src: U32, dst: U32, edgeCount: number, colIdx: U32): boolean {
    let multigraph = false;
    for (let e = 0; e < edgeCount; e++) {
        const v = dst[e];
        colIdx[e] = v;
        if (e > 0 && src[e] === src[e - 1] && dst[e - 1] === v) {
            multigraph = true;
        }
    }
    return multigraph;
}

// ============================================================ pass 1: by target

/**
 * Pass 1 of a directed sort (design section 6.3 step 5): scatter every edge into target order as a
 * (source, edge) pair, `byTarget[2p] = src[e]`, `byTarget[2p + 1] = e`.
 * @param src - sources
 * @param dst - targets
 * @param edgeCount - the logical edge count
 * @param cursor - the target bucket starts; advanced in place
 * @param byTarget - 2A words receiving the pairs
 */
function scatterDirectedByTarget(src: U32, dst: U32, edgeCount: number, cursor: U32, byTarget: U32): void {
    for (let e = 0; e < edgeCount; e++) {
        const p = 2 * cursor[dst[e]]++;
        byTarget[p] = src[e];
        byTarget[p + 1] = e;
    }
}

/**
 * Pass 1 of an undirected sort (design section 6.3 steps 3 and 5, fused): the declared arc
 * `(src, dst, e)` goes into bucket dst and, for a non-loop, the mirror `(dst, src, e)` into bucket
 * src right after it, so arcs stay in edge order within every bucket. The pass-1 position of every
 * declared arc is marked in `declared` (bit p).
 * @param src - sources
 * @param dst - targets
 * @param edgeCount - the logical edge count
 * @param cursor - the target bucket starts; advanced in place
 * @param byTarget - 2A words receiving the (source, edge) pairs
 * @param declared - a zeroed bitmap of A bits
 */
function scatterUndirectedByTarget(
    src: U32,
    dst: U32,
    edgeCount: number,
    cursor: U32,
    byTarget: U32,
    declared: U32,
): void {
    for (let e = 0; e < edgeCount; e++) {
        const u = src[e];
        const v = dst[e];
        const p = cursor[v]++;
        byTarget[2 * p] = u;
        byTarget[2 * p + 1] = e;
        declared[p >>> 5] |= 1 << (p & 31);
        if (u !== v) {
            const q = 2 * cursor[u]++;
            byTarget[q] = v;
            byTarget[q + 1] = e;
        }
    }
}

// ============================================================ pass 2: by source

/**
 * Pass 2 of a directed sort (design section 6.3 step 6): walk the target buckets in order and
 * scatter every arc into its row, writing colIdx and arcToEdge. Stable, so rows end sorted by target
 * with parallels in edge order (I4).
 * @param nodeCount - n
 * @param targetStart - the target bucket starts (pass-1 layout)
 * @param byTarget - the pass-1 (source, edge) pairs
 * @param cursor - the row starts (a copy of rowPtr); advanced in place
 * @param colIdx - receives the targets
 * @param arcToEdge - receives the edges
 */
function scatterDirectedBySource(
    nodeCount: number,
    targetStart: U32,
    byTarget: U32,
    cursor: U32,
    colIdx: U32,
    arcToEdge: U32,
): void {
    for (let v = 0; v < nodeCount; v++) {
        const end = 2 * targetStart[v + 1];
        for (let p = 2 * targetStart[v]; p < end; p += 2) {
            const a = cursor[byTarget[p]]++;
            colIdx[a] = v;
            arcToEdge[a] = byTarget[p + 1];
        }
    }
}

/**
 * Pass 2 of an undirected sort (design section 6.3 step 6): as the directed pass, plus
 * `edgeToArc[e] = a` for the arc whose stored orientation is the declared one (for a self-loop the
 * single arc), which the pass-1 bitmap identifies.
 * @param nodeCount - n
 * @param pass1 - the pass-1 layout
 * @param pass1.targetStart - the target bucket starts
 * @param pass1.byTarget - the pass-1 (source, edge) pairs
 * @param pass1.declared - bit p set when pass-1 position p holds a declared arc
 * @param cursor - the row starts (a copy of rowPtr); advanced in place
 * @param colIdx - receives the targets
 * @param arcToEdge - receives the edges
 * @param edgeToArc - receives the declared arc of every edge
 */
function scatterUndirectedBySource(
    nodeCount: number,
    pass1: { readonly targetStart: U32; readonly byTarget: U32; readonly declared: U32 },
    cursor: U32,
    colIdx: U32,
    arcToEdge: U32,
    edgeToArc: U32,
): void {
    const { targetStart, byTarget, declared } = pass1;
    for (let v = 0; v < nodeCount; v++) {
        const end = targetStart[v + 1];
        for (let p = targetStart[v]; p < end; p++) {
            const e = byTarget[2 * p + 1];
            const a = cursor[byTarget[2 * p]]++;
            colIdx[a] = v;
            arcToEdge[a] = e;
            if (((declared[p >>> 5] >>> (p & 31)) & 1) === 1) {
                edgeToArc[e] = a;
            }
        }
    }
}

// ============================================================ sequential post-passes

/**
 * The inverse of a directed permutation: `edgeToArc[arcToEdge[a]] = a` (every arc is its edge's only
 * arc).
 * @param arcToEdge - the arc permutation
 * @param edgeToArc - receives the inverse
 */
function invertPermutation(arcToEdge: U32, edgeToArc: U32): void {
    const arcCount = arcToEdge.length;
    for (let a = 0; a < arcCount; a++) {
        edgeToArc[arcToEdge[a]] = a;
    }
}

/**
 * The arc weights (design section 3.7): `weights[a] = f32(edgeWeights[arcToEdge[a]])`, a sequential
 * write with one independent random read per arc.
 * @param arcToEdge - the arc permutation
 * @param edgeWeights - the staging weights
 * @param weights - receives the f32 arc weights
 */
function gatherWeights(arcToEdge: U32, edgeWeights: F32 | F64, weights: F32): void {
    const arcCount = arcToEdge.length;
    for (let a = 0; a < arcCount; a++) {
        weights[a] = edgeWeights[arcToEdge[a]];
    }
}

/**
 * The multigraph flag (design section 3.8): whether some row holds two adjacent arcs with the same
 * target; rows are sorted by target, so parallels are adjacent (I4).
 * @param rowPtr - the row starts
 * @param colIdx - the sorted targets
 * @param nodeCount - n
 * @returns true when a parallel pair exists
 */
function hasAdjacentParallels(rowPtr: U32, colIdx: U32, nodeCount: number): boolean {
    for (let u = 0; u < nodeCount; u++) {
        const end = rowPtr[u + 1];
        for (let a = rowPtr[u] + 1; a < end; a++) {
            if (colIdx[a] === colIdx[a - 1]) {
                return true;
            }
        }
    }
    return false;
}

// ============================================================ the sort

/**
 * Step 8's weight predicates over the edges: every edge lands on at least one arc, so the per-value
 * predicates over the stored arc weights equal those over the f32-rounded edge weights. Throws
 * E_INVALID_WEIGHT on a NaN weight (through `scanStoredWeights`).
 * @param edgeWeights - the per-edge weights, or null when unweighted
 * @param edgeCount - the edge count
 * @returns whether every weight is one, none is negative and every one is finite
 */
function weightPredicates(
    edgeWeights: SortInput["weights"],
    edgeCount: number,
): { allOne: boolean; nonNegative: boolean; finite: boolean } {
    if (edgeWeights === null || edgeCount === 0) {
        return { allOne: true, nonNegative: true, finite: true };
    }
    const bounds = new Float64Array([Infinity, -Infinity]);
    scanStoredWeights(edgeWeights, edgeCount, bounds);
    const min = bounds[0];
    const max = bounds[1];
    return { allOne: min === 1 && max === 1, nonNegative: min >= 0, finite: min > -Infinity && max < Infinity };
}

/**
 * Steps 5 and 6 of a non-identity sort: pass 1 scatters the arcs by target, pass 2 by source into
 * the rows, filling `colIdx`, both permutations and the f32 weights.
 * @param input - the per-edge arrays
 * @param arcCount - the arc count
 * @param counts - the per-node counts of the first pass; both are overwritten
 * @param counts.targetStart - per node, the arcs that target it (prefix-summed here)
 * @param counts.rowCount - the row counts, already prefix-summed into rowPtr (reused as the cursor)
 * @param core - the allocated core
 * @param permutations - the core's permutation arrays
 * @param permutations.arcToEdge - arc -> edge
 * @param permutations.edgeToArc - edge -> arc
 * @returns whether two arcs of one row share a target (a multigraph)
 */
function sortByTwoPasses(
    input: SortInput,
    arcCount: number,
    counts: { targetStart: U32; rowCount: U32 },
    core: CoreArrays,
    permutations: { arcToEdge: U32; edgeToArc: U32 },
): boolean {
    const { directed, nodeCount, edgeCount, src, dst } = input;
    const { targetStart, rowCount } = counts;
    const { rowPtr, colIdx, weights } = core;
    const { arcToEdge, edgeToArc } = permutations;
    // step 5: pass 1 by target; `rowCount` is reused as the pass-1 cursor
    prefixSum(targetStart, nodeCount);
    const cursor = rowCount;
    cursor.set(targetStart);
    const byTarget = new Uint32Array(2 * arcCount);
    let declared: U32 | null = null;
    if (directed) {
        scatterDirectedByTarget(src, dst, edgeCount, cursor, byTarget);
    } else {
        declared = new Uint32Array((arcCount + 31) >>> 5);
        scatterUndirectedByTarget(src, dst, edgeCount, cursor, byTarget, declared);
    }
    // step 6: pass 2 by source into the rows; the cursor now walks rowPtr
    cursor.set(rowPtr);
    if (declared === null) {
        scatterDirectedBySource(nodeCount, targetStart, byTarget, cursor, colIdx, arcToEdge);
        invertPermutation(arcToEdge, edgeToArc);
    } else {
        scatterUndirectedBySource(nodeCount, { targetStart, byTarget, declared }, cursor, colIdx, arcToEdge, edgeToArc);
    }
    if (weights !== null && input.weights !== null) {
        gatherWeights(arcToEdge, input.weights, weights);
    }
    return hasAdjacentParallels(rowPtr, colIdx, nodeCount);
}

/**
 * Sort a per-edge list into a CSR core (design section 6.3 steps 3-6 and 8). Directed input that is
 * already in CSR order takes the identity path (one count + scan + copy, no permutation arrays,
 * `flags.arcToEdgeIsIdentity`); everything else takes the two counting-sort passes. Undirected input
 * emits the mirror arc of every non-loop edge (I7). Weights are stored as f32 (design section 3.7) and
 * the flags are computed from the stored values (I9). A NaN weight is E_INVALID_WEIGHT (I8) naming
 * the lowest such edge, thrown before anything is allocated.
 * @param input - the per-edge arrays
 * @param useArena - allocate the core inside one 256-aligned arena (true) or as separate buffers
 * @returns the core, the counts and the flags
 */
export function sortIntoCore(input: SortInput, useArena: boolean): SortResult {
    const { directed, nodeCount, edgeCount, src, dst } = input;
    const edgeWeights = input.weights;

    // step 8's weight predicates, over the edges: every edge lands on at least one arc, so the
    // per-value predicates over the stored arc weights equal those over the f32-rounded edge weights
    const { allOne, nonNegative, finite } = weightPredicates(edgeWeights, edgeCount);

    // steps 3-6 counts: one sequential pass over the edges yields both prefix sums and the loop count
    const targetStart = new Uint32Array(nodeCount + 1);
    const rowCount = new Uint32Array(nodeCount + 1);
    const selfLoopCount = directed
        ? countDirectedArcs(src, dst, edgeCount, targetStart, rowCount)
        : countUndirectedArcs(src, dst, edgeCount, targetStart, rowCount);
    const arcCount = directed ? edgeCount : 2 * edgeCount - selfLoopCount;
    const identity = directed && isSortedEdgeList(src, dst, edgeCount);
    const core = allocateCoreArrays(
        { nodeCount, arcCount, edgeCount, weighted: edgeWeights !== null, identity },
        useArena,
    );
    const { rowPtr, colIdx, weights, arcToEdge, edgeToArc } = core;
    prefixSum(rowCount, nodeCount);
    rowPtr.set(rowCount);
    let multigraph: boolean;

    if (identity) {
        // step 4: the edge arrays are the arc arrays -- copy, and round the weights to f32
        multigraph = copySortedTargets(src, dst, edgeCount, colIdx);
        if (weights !== null && edgeWeights !== null) {
            weights.set(edgeWeights.subarray(0, edgeCount));
        }
    } else if (arcToEdge !== null && edgeToArc !== null) {
        multigraph = sortByTwoPasses(input, arcCount, { targetStart, rowCount }, core, { arcToEdge, edgeToArc });
    } else {
        // allocateCoreArrays materializes both permutations whenever the sort is not the identity
        throw new GraphFormatError("E_UNSUPPORTED", "unreachable: a non-identity core without permutation arrays", {
            directed,
            arcCount,
        });
    }

    const flags: SnapshotFlags = Object.freeze({
        multigraph,
        hasSelfLoops: selfLoopCount > 0,
        arcToEdgeIsIdentity: identity,
        weighted: weights !== null,
        allWeightsOne: allOne,
        nonNegativeWeights: nonNegative,
        finiteWeights: finite,
    });
    return { core, arcCount, selfLoopCount, flags };
}

// ============================================================ appending to a sorted core

/**
 * The most appended edges, as a share of the edges already sorted, that {@link appendIntoCore} takes
 * on: past it a full sort is about as fast.
 */
const APPEND_SHARE = 1 / 16;

/**
 * The first arc of `[from, to)` whose target is above `target`: where an arc with that target and a
 * higher edge index than every arc there goes (invariant I4: ties by ascending arcToEdge).
 * @param colIdx - the targets
 * @param from - the row's first arc
 * @param to - one past its last arc
 * @param target - the new arc's target
 * @returns the arc index to insert before
 */
function upperBound(colIdx: U32, from: number, to: number, target: number): number {
    let low = from;
    let high = to;
    while (low < high) {
        const middle = (low + high) >>> 1;
        if (colIdx[middle] <= target) {
            low = middle + 1;
        } else {
            high = middle;
        }
    }
    return low;
}

/**
 * The core of a graph made by appending nodes and edges to one already sorted, built from that sort
 * rather than sorting every edge again: the old arcs are copied in runs, each new arc is put where a
 * full sort puts it (after every arc of its row with a lower or equal target, because its edge index
 * is higher than theirs), and the permutations follow. The result is what {@link sortIntoCore} returns
 * for `input`, array for array. A freeze after one added edge of a million-edge graph copies the core
 * instead of running the two counting sorts.
 * @param previous - the sort of the first `previousEdges` edges over `previousNodes` nodes
 * @param previousNodes - its node count
 * @param previousEdges - its edge count
 * @param input - the same edges with more appended, over the same or more nodes
 * @param useArena - allocate the core in an arena
 * @returns the sort, or null when appending does not apply (an identity core, or too many edges)
 */
export function appendIntoCore(
    previous: SortResult,
    previousNodes: number,
    previousEdges: number,
    input: SortInput,
    useArena: boolean,
): SortResult | null {
    const old = previous.core;
    const added = input.edgeCount - previousEdges;
    if (
        old.arcToEdge === null ||
        old.edgeToArc === null ||
        input.nodeCount < previousNodes ||
        added < 0 ||
        added > Math.max(1, previousEdges * APPEND_SHARE) ||
        (old.weights === null) !== (input.weights === null)
    ) {
        return null;
    }

    // Throws E_INVALID_WEIGHT for a NaN, as the full sort does, before anything is allocated.
    const { allOne, nonNegative, finite } = weightPredicates(input.weights, input.edgeCount);
    const { arcs, loops } = appendedArcs(input, previousEdges);
    const arcCount = previous.arcCount + arcs.length;
    const core = allocateCoreArrays(
        {
            nodeCount: input.nodeCount,
            arcCount,
            edgeCount: input.edgeCount,
            weighted: old.weights !== null,
            identity: false,
        },
        useArena,
    );
    const { at, multigraph } = mergeArcs(previous, previousNodes, arcs, input, core);
    fillRowPtr(core.rowPtr, old.rowPtr, previousNodes, previous.arcCount, arcs);
    // An old edge's arc moves by the new arcs put at or before it.
    const edgeToArc = core.edgeToArc as U32;
    for (let e = 0; e < previousEdges; e++) {
        const arc = old.edgeToArc[e];
        edgeToArc[e] = arc + countAtOrBefore(at, arc);
    }

    const selfLoopCount = previous.selfLoopCount + loops;
    const flags: SnapshotFlags = Object.freeze({
        multigraph: previous.flags.multigraph || multigraph,
        hasSelfLoops: selfLoopCount > 0,
        arcToEdgeIsIdentity: false,
        weighted: core.weights !== null,
        allWeightsOne: allOne,
        nonNegativeWeights: nonNegative,
        finiteWeights: finite,
    });
    return { core, arcCount, selfLoopCount, flags };
}

// ============================================================ removing from a sorted core

/**
 * The core of a graph made by removing a few nodes and edges from one already sorted, built from that
 * sort rather than sorting every edge again. A removal keeps the order of what stays (invariant I14), so
 * every kept arc is already where a full sort puts it: the kept arcs are copied in runs between the few
 * dropped ones, each run's targets and edges moved down by the nodes and edges removed below them, and the
 * permutations follow. The result is what {@link sortIntoCore} returns for the compacted input, array for
 * array. A freeze after one removed edge of a million-edge graph copies the core instead of running the two
 * counting sorts.
 * @param previous - the sort of the edges before the removal
 * @param nodeRemap - old node -> new node, or INVALID_INDEX for a removed node
 * @param edgeRemap - old edge -> new edge, or INVALID_INDEX for a removed edge
 * @param input - the compacted input, the same edges less the removed ones
 * @param useArena - allocate the core in an arena
 * @returns the sort, or null when removing does not apply (an identity core, or too many removed)
 */
export function removeFromCore(
    previous: SortResult,
    nodeRemap: U32,
    edgeRemap: U32,
    input: SortInput,
    useArena: boolean,
): SortResult | null {
    const old = previous.core;
    if (old.arcToEdge === null || old.edgeToArc === null || (old.weights === null) !== (input.weights === null)) {
        return null;
    }
    const goneNodes = droppedIndices(nodeRemap);
    const goneEdges = droppedIndices(edgeRemap);
    if (goneNodes.length + goneEdges.length > Math.max(1, edgeRemap.length * APPEND_SHARE)) {
        return null;
    }
    const dropped = droppedArcs(old, goneNodes, goneEdges, input.directed);
    const loops = previous.selfLoopCount - dropped.loops;
    const arcCount = previous.arcCount - dropped.arcs.length;
    // Every arc of a removed edge or node found, and no other: else the removal is not one the core follows.
    if (arcCount !== (input.directed ? input.edgeCount : 2 * input.edgeCount - loops)) {
        return null;
    }

    const { allOne, nonNegative, finite } = weightPredicates(input.weights, input.edgeCount);
    const core = allocateCoreArrays(
        {
            nodeCount: input.nodeCount,
            arcCount,
            edgeCount: input.edgeCount,
            weighted: old.weights !== null,
            identity: false,
        },
        useArena,
    );
    copyKeptRuns(old, dropped.arcs, { gone: goneNodes, remap: nodeRemap }, { gone: goneEdges, remap: edgeRemap }, core);
    if (input.directed && isIdentityPermutation(core.arcToEdge as U32)) {
        // what is left is in CSR order, which a full sort lays out as the identity core (flag I9)
        return null;
    }
    keptRowPtr(old.rowPtr, nodeRemap, dropped.arcs, core.rowPtr);
    keptEdgeToArc(old.edgeToArc, edgeRemap, dropped.arcs, core.edgeToArc as U32);
    const flags: SnapshotFlags = Object.freeze({
        // a removal never makes two arcs parallel, so only a multigraph is looked at again
        multigraph: previous.flags.multigraph && hasParallelArcs(core.rowPtr, core.colIdx),
        hasSelfLoops: loops > 0,
        arcToEdgeIsIdentity: false,
        weighted: core.weights !== null,
        allWeightsOne: allOne,
        nonNegativeWeights: nonNegative,
        finiteWeights: finite,
    });
    return { core, arcCount, selfLoopCount: loops, flags };
}

/**
 * The indices a remap drops, ascending.
 * @param remap - old index -> new index, or INVALID_INDEX
 * @returns they
 */
function droppedIndices(remap: U32): U32 {
    const out: number[] = [];
    for (let i = 0; i < remap.length; i++) {
        if (remap[i] === INVALID_INDEX) {
            out.push(i);
        }
    }
    return Uint32Array.from(out);
}

/** Up to this many, {@link countBelow} counts with one comparison each. */
const LINEAR_COUNT = 8;

/**
 * How many of an ascending list are below a value: a comparison each for a short list, else a binary search
 * whose steps do not branch on the data.
 * @param sorted - the list
 * @param value - the value
 * @returns the count
 */
function countBelow(sorted: U32, value: number): number {
    const { length } = sorted;
    if (length <= LINEAR_COUNT) {
        let below = 0;
        for (let i = 0; i < length; i++) {
            below += sorted[i] < value ? 1 : 0;
        }
        return below;
    }
    let base = 0;
    let span = length;
    while (span > 1) {
        const half = span >>> 1;
        base = sorted[base + half] < value ? base + half : base;
        span -= half;
    }
    return base + (sorted[base] < value ? 1 : 0);
}

/**
 * The arcs a removal drops, ascending: every arc of a removed node's row, and each removed edge's arc and,
 * undirected, its mirror (the arc of the same edge in the other end's row).
 * @param old - the old core
 * @param goneNodes - the removed nodes, ascending
 * @param goneEdges - the removed edges, ascending
 * @param directed - whether the graph is directed
 * @returns the arcs, and how many of the removed edges were self-loops
 */
function droppedArcs(old: CoreArrays, goneNodes: U32, goneEdges: U32, directed: boolean): { arcs: U32; loops: number } {
    const { rowPtr, colIdx } = old;
    const edgeToArc = old.edgeToArc as U32;
    const arcs: number[] = [];
    for (const u of goneNodes) {
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            arcs.push(a);
        }
    }
    let loops = 0;
    for (const e of goneEdges) {
        const a = edgeToArc[e];
        arcs.push(a);
        const row = upperBound(rowPtr, 0, rowPtr.length, a) - 1;
        if (colIdx[a] === row) {
            loops++;
        } else if (!directed) {
            arcs.push(mirrorArc(old, row, colIdx[a], e));
        }
    }
    return { arcs: uniqueSorted(arcs), loops };
}

/**
 * An undirected edge's arc in its other end's row: among the arcs of row `v` to `row`, the one of the edge.
 * @param old - the core
 * @param row - the row of the edge's declared arc
 * @param v - its other end
 * @param e - the edge
 * @returns the arc
 */
function mirrorArc(old: CoreArrays, row: number, v: number, e: number): number {
    const { rowPtr, colIdx } = old;
    const arcToEdge = old.arcToEdge as U32;
    // the first arc to `row` is just past the arcs to targets below it
    let m = row === 0 ? rowPtr[v] : upperBound(colIdx, rowPtr[v], rowPtr[v + 1], row - 1);
    while (arcToEdge[m] !== e) {
        m++;
    }
    return m;
}

/**
 * A list sorted ascending with repeats left out: a removed node's own arcs are also its removed edges' arcs.
 * @param values - the list
 * @returns it, sorted, each value once
 */
function uniqueSorted(values: readonly number[]): U32 {
    const sorted = Uint32Array.from(values).sort();
    let kept = 0;
    for (let i = 0; i < sorted.length; i++) {
        if (i === 0 || sorted[i] !== sorted[i - 1]) {
            sorted[kept++] = sorted[i];
        }
    }
    return sorted.subarray(0, kept);
}

/** The indices a removal dropped, ascending, and its remap. */
interface Removed {
    /** The removed indices, ascending. */
    readonly gone: U32;
    /** Old index -> new index, or INVALID_INDEX. */
    readonly remap: U32;
}

/**
 * Copy the kept arcs into the new core in runs between the dropped ones: targets and edges renumbered, weights
 * as they were.
 * @param old - the old core
 * @param dropped - the dropped arcs, ascending
 * @param nodes - the removed nodes
 * @param edges - the removed edges
 * @param core - the new core, written
 */
function copyKeptRuns(old: CoreArrays, dropped: U32, nodes: Removed, edges: Removed, core: CoreArrays): void {
    const oldArcToEdge = old.arcToEdge as U32;
    const arcToEdge = core.arcToEdge as U32;
    let to = 0;
    for (let run = 0; run <= dropped.length; run++) {
        const from = run === 0 ? 0 : dropped[run - 1] + 1;
        const end = run === dropped.length ? old.colIdx.length : dropped[run];
        if (end <= from) {
            continue;
        }
        shiftedCopy(old.colIdx, from, end, core.colIdx, to, nodes.gone, nodes.remap);
        shiftedCopy(oldArcToEdge, from, end, arcToEdge, to, edges.gone, edges.remap);
        if (core.weights !== null && old.weights !== null) {
            core.weights.set(old.weights.subarray(from, end), to);
        }
        to += end - from;
    }
}

/**
 * `target[at + i]` = `source[from + i]` renumbered: a plain copy when nothing is gone, one comparison when one
 * is, else a read of the remap.
 * @param source - the old values
 * @param from - the first
 * @param end - one past the last
 * @param target - receives them
 * @param at - where the first goes
 * @param gone - the removed indices, ascending
 * @param remap - old index -> new index
 */
function shiftedCopy(source: U32, from: number, end: number, target: U32, at: number, gone: U32, remap: U32): void {
    if (gone.length === 0) {
        target.set(source.subarray(from, end), at);
        return;
    }
    if (gone.length === 1) {
        const g = gone[0];
        for (let i = from; i < end; i++) {
            const value = source[i];
            target[at++] = value > g ? value - 1 : value;
        }
        return;
    }
    for (let i = from; i < end; i++) {
        target[at++] = remap[source[i]];
    }
}

/**
 * The new row offsets: each kept row's start moved down by the dropped arcs before it.
 * @param oldRowPtr - the old row offsets
 * @param nodeRemap - old node -> new node, or INVALID_INDEX
 * @param dropped - the dropped arcs, ascending
 * @param rowPtr - the new row offsets, written
 */
function keptRowPtr(oldRowPtr: U32, nodeRemap: U32, dropped: U32, rowPtr: U32): void {
    let before = 0;
    let row = 0;
    for (let u = 0; u < nodeRemap.length; u++) {
        if (nodeRemap[u] === INVALID_INDEX) {
            continue;
        }
        const start = oldRowPtr[u];
        while (before < dropped.length && dropped[before] < start) {
            before++;
        }
        rowPtr[row++] = start - before;
    }
    rowPtr[row] = (oldRowPtr.at(-1) ?? 0) - dropped.length;
}

/**
 * Each kept edge's arc, moved down by the dropped arcs before it.
 * @param oldEdgeToArc - the old edge -> arc
 * @param edgeRemap - old edge -> new edge, or INVALID_INDEX
 * @param dropped - the dropped arcs, ascending
 * @param edgeToArc - receives new edge -> new arc
 */
function keptEdgeToArc(oldEdgeToArc: U32, edgeRemap: U32, dropped: U32, edgeToArc: U32): void {
    const edges = edgeRemap.length;
    let at = 0;
    for (let e = 0; e < edges; e++) {
        if (edgeRemap[e] !== INVALID_INDEX) {
            const arc = oldEdgeToArc[e];
            edgeToArc[at++] = arc - countBelow(dropped, arc);
        }
    }
}

/**
 * Whether every arc's edge is the arc itself.
 * @param arcToEdge - the arc permutation
 * @returns true for the identity
 */
function isIdentityPermutation(arcToEdge: U32): boolean {
    for (let a = 0; a < arcToEdge.length; a++) {
        if (arcToEdge[a] !== a) {
            return false;
        }
    }
    return true;
}

/**
 * Whether two adjacent arcs of a row share a target.
 * @param rowPtr - the row offsets
 * @param colIdx - the targets
 * @returns true for a multigraph
 */
function hasParallelArcs(rowPtr: U32, colIdx: U32): boolean {
    for (let u = 0; u + 1 < rowPtr.length; u++) {
        for (let a = rowPtr[u] + 1; a < rowPtr[u + 1]; a++) {
            if (colIdx[a] === colIdx[a - 1]) {
                return true;
            }
        }
    }
    return false;
}

/** One arc an appended edge adds. */
interface NewArc {
    /** Its row (source node). */
    readonly row: number;
    /** Its target. */
    readonly target: number;
    /** Its edge. */
    readonly edge: number;
    /** Whether it is the edge's declared orientation (edgeToArc points at it). */
    readonly declared: boolean;
}

/**
 * The arcs the appended edges add, by row, then target, then edge: the order the full sort leaves them in.
 * @param input - the sort input
 * @param previousEdges - how many edges were sorted before
 * @returns the arcs and how many of the edges are self-loops
 */
function appendedArcs(input: SortInput, previousEdges: number): { arcs: NewArc[]; loops: number } {
    const arcs: NewArc[] = [];
    let loops = 0;
    for (let e = previousEdges; e < input.edgeCount; e++) {
        const u = input.src[e];
        const v = input.dst[e];
        arcs.push({ row: u, target: v, edge: e, declared: true });
        if (u === v) {
            loops++;
        } else if (!input.directed) {
            arcs.push({ row: v, target: u, edge: e, declared: false });
        }
    }
    arcs.sort((a, b) => a.row - b.row || a.target - b.target || a.edge - b.edge);
    return { arcs, loops };
}

/**
 * Copy the old arcs into the new core in runs, writing each new arc at its place.
 * @param previous - the old sort
 * @param previousNodes - its node count
 * @param arcs - the new arcs, sorted
 * @param input - the sort input (weights)
 * @param core - the new core
 * @returns each new arc's insertion point in old arc indices, and whether one sits beside an equal target
 */
function mergeArcs(
    previous: SortResult,
    previousNodes: number,
    arcs: readonly NewArc[],
    input: SortInput,
    core: CoreArrays,
): { at: U32; multigraph: boolean } {
    const old = previous.core;
    const oldColIdx = old.colIdx;
    const oldArcToEdge = old.arcToEdge as U32;
    const { colIdx, weights } = core;
    const arcToEdge = core.arcToEdge as U32;
    const edgeToArc = core.edgeToArc as U32;
    const at = new Uint32Array(arcs.length);
    let from = 0;
    let to = 0;
    let multigraph = false;
    const copy = (end: number): void => {
        colIdx.set(oldColIdx.subarray(from, end), to);
        arcToEdge.set(oldArcToEdge.subarray(from, end), to);
        if (weights !== null && old.weights !== null) {
            weights.set(old.weights.subarray(from, end), to);
        }
        to += end - from;
        from = end;
    };
    for (let i = 0; i < arcs.length; i++) {
        const arc = arcs[i];
        const inOld = arc.row < previousNodes;
        const rowStart = inOld ? old.rowPtr[arc.row] : previous.arcCount;
        const rowEnd = inOld ? old.rowPtr[arc.row + 1] : previous.arcCount;
        const place = upperBound(oldColIdx, Math.max(rowStart, from), rowEnd, arc.target);
        copy(place);
        at[i] = place;
        colIdx[to] = arc.target;
        arcToEdge[to] = arc.edge;
        if (weights !== null && input.weights !== null) {
            weights[to] = Math.fround(input.weights[arc.edge]);
        }
        if (arc.declared) {
            edgeToArc[arc.edge] = to;
        }
        // The arc before it in its row (an old arc or a new one just written) with the same target.
        const newRowStart = rowStart + i - countBefore(arcs, i, arc.row);
        multigraph ||= to > newRowStart && colIdx[to - 1] === arc.target;
        to++;
    }
    copy(previous.arcCount);
    return { at, multigraph };
}

/**
 * The new row offsets: each old row start moved by the new arcs of the rows before it.
 * @param rowPtr - the new row offsets, written
 * @param oldRowPtr - the old ones
 * @param previousNodes - the old node count
 * @param oldArcs - the old arc count
 * @param arcs - the new arcs, sorted
 */
function fillRowPtr(
    rowPtr: U32,
    oldRowPtr: U32,
    previousNodes: number,
    oldArcs: number,
    arcs: readonly NewArc[],
): void {
    let shift = 0;
    for (let r = 0; r < rowPtr.length; r++) {
        while (shift < arcs.length && arcs[shift].row < r) {
            shift++;
        }
        rowPtr[r] = (r < previousNodes ? oldRowPtr[r] : oldArcs) + shift;
    }
}

/**
 * How many of the new arcs before `i` are in the same row: they were written in this row ahead of it.
 * @param arcs - the new arcs, sorted
 * @param i - the arc
 * @param row - its row
 * @returns the count
 */
function countBefore(arcs: readonly { row: number }[], i: number, row: number): number {
    let count = 0;
    for (let j = i - 1; j >= 0 && arcs[j].row === row; j--) {
        count++;
    }
    return count;
}

/**
 * How many insertion points are at or before an old arc (sorted ascending): the new arcs written ahead of it.
 * @param at - the insertion points, ascending
 * @param arc - the old arc
 * @returns the count
 */
function countAtOrBefore(at: U32, arc: number): number {
    let low = 0;
    let high = at.length;
    while (low < high) {
        const middle = (low + high) >>> 1;
        if (at[middle] <= arc) {
            low = middle + 1;
        } else {
            high = middle;
        }
    }
    return low;
}
