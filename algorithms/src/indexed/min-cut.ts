import {
    type GraphSnapshot,
    INVALID_INDEX,
    makeMask,
    maskSet,
    type NodeMask,
    type NumericVector,
} from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { mulberry32 } from "../utils/math-utilities.js";
import { crossingEdges, edgeCapacities, type MinCutResult, sidesPartition } from "./flow.js";
import { IndexedMaxHeap } from "./structures/max-heap.js";
import { IntUnionFind } from "./structures/union-find.js";

/** Options of {@link stoerWagner}. @public */
export interface StoerWagnerOptions {
    /** Per-arc weight override, arcCount long; without it the snapshot's weights (1 when unweighted). */
    readonly weights?: NumericVector | undefined;
}

/** Options of {@link kargerMinCut}. @public */
export interface KargerOptions {
    /** Independent contraction trials; the lightest cut found wins. Default 100. */
    readonly iterations?: number | undefined;
    /** Seed of the edge orders; one seed gives one result, bit for bit. Default 42. */
    readonly randomSeed?: number | undefined;
    /** Per-arc weight override, arcCount long; without it the snapshot's weights (1 when unweighted). */
    readonly weights?: NumericVector | undefined;
}

/**
 * Incident (neighbour, edge weight) pairs per node, both directions of every edge.
 * @param s - The snapshot
 * @param capacity - The capacity of every edge
 * @returns The row offsets, neighbours and weights
 */
function incidentLists(
    s: GraphSnapshot,
    capacity: Float64Array,
): { offset: Uint32Array; neighbour: Uint32Array; weight: Float64Array } {
    const n = s.nodeCount;
    const { src, dst } = s.edgeList();
    const offset = new Uint32Array(n + 1);
    for (let e = 0; e < s.edgeCount; e++) {
        offset[src[e] + 1]++;
        offset[dst[e] + 1]++;
    }
    for (let i = 0; i < n; i++) {
        offset[i + 1] += offset[i];
    }
    const fill = offset.slice(0, n);
    const neighbour = new Uint32Array(offset[n]);
    const weight = new Float64Array(offset[n]);
    for (let e = 0; e < s.edgeCount; e++) {
        neighbour[fill[src[e]]] = dst[e];
        weight[fill[src[e]]++] = capacity[e];
        neighbour[fill[dst[e]]] = src[e];
        weight[fill[dst[e]]++] = capacity[e];
    }
    return { offset, neighbour, weight };
}

/** The state of one Stoer-Wagner run, built once per call. */
interface StoerWagnerState {
    n: number;
    offset: Uint32Array;
    neighbour: Uint32Array;
    weight: Float64Array;
    rep: Uint32Array;
    /** Member lists, one per representative. */
    next: Uint32Array;
    tail: Uint32Array;
    connection: Float64Array;
    added: Uint8Array;
    heap: IndexedMaxHeap;
    /** The second-to-last and last node of the current phase. */
    prev: number;
    last: number;
}

/**
 * Resets every remaining representative and queues all but the lowest-index one.
 * @returns The lowest-index representative, where the phase starts
 * @param st - The run state, updated in place
 */
function startPhase(st: StoerWagnerState): number {
    const { n, rep, added, connection, heap } = st;
    let start = INVALID_INDEX;
    for (let i = 0; i < n; i++) {
        if (rep[i] !== i) {
            continue;
        }
        added[i] = 0;
        connection[i] = 0;
        if (start === INVALID_INDEX) {
            start = i;
        } else {
            heap.push(i, 0);
        }
    }
    return start;
}

/**
 * Adds `v` to the phase and raises the connection of its unadded neighbours.
 * @param st - The run state, updated in place
 * @param v - The node added
 */
function addToPhase(st: StoerWagnerState, v: number): void {
    const { offset, neighbour, weight, rep, next, added, connection, heap } = st;
    added[v] = 1;
    for (let m = v; m !== INVALID_INDEX; m = next[m]) {
        for (let k = offset[m]; k < offset[m + 1]; k++) {
            const x = rep[neighbour[k]];
            if (added[x] === 0) {
                connection[x] += weight[k];
                heap.pushOrIncrease(x, connection[x]);
            }
        }
    }
}

/**
 * One maximum-adjacency phase; leaves its last two nodes in `prev` and `last`.
 * @param st - The run state, updated in place
 */
function runPhase(st: StoerWagnerState): void {
    st.prev = INVALID_INDEX;
    st.last = startPhase(st);
    for (;;) {
        addToPhase(st, st.last);
        if (st.heap.isEmpty()) {
            return;
        }
        st.prev = st.last;
        st.last = st.heap.pop();
    }
}

/**
 * The mask of the members of representative `r`.
 * @param st - The run state, updated in place
 * @param r - The representative
 * @returns The mask
 */
function membersMask(st: StoerWagnerState, r: number): NodeMask {
    const mask = makeMask(st.n);
    for (let m = r; m !== INVALID_INDEX; m = st.next[m]) {
        maskSet(mask, m, true);
    }
    return mask;
}

/**
 * Merges the last node of the phase into the one before it.
 * @param st - The run state, updated in place
 */
function mergeLastPhasePair(st: StoerWagnerState): void {
    const { rep, next, tail, prev, last } = st;
    for (let m = last; m !== INVALID_INDEX; m = next[m]) {
        rep[m] = prev;
    }
    next[tail[prev]] = last;
    tail[prev] = tail[last];
}

/**
 * Global minimum cut by Stoer-Wagner, reading every edge as undirected (a directed snapshot's arcs
 * count in both directions, so two opposite arcs between one pair add up).
 *
 * No graph is contracted (graph-format design 14.2): a representative array and member lists
 * merge the last two nodes of each phase, and each phase's maximum-adjacency order accumulates the
 * weights of the ORIGINAL arcs of the merged members in an {@link IndexedMaxHeap}. A phase starts
 * from the lowest-index remaining representative and takes equal keys lowest index first, and the
 * first phase with the lightest cut wins, which is the order the legacy implementation uses.
 * O(n (m + n) log n).
 * @param s - The snapshot
 * @param options - The weight override
 * @returns The cut value, the side holding the last node of the winning phase, and the cut edges;
 *   with fewer than two nodes the value is 0 and every node is on `side`
 * @public
 */
export function stoerWagner(s: GraphSnapshot, options: StoerWagnerOptions = {}): MinCutResult {
    const n = s.nodeCount;
    const capacity = edgeCapacities(s, options.weights);
    if (n < 2) {
        const side = makeMask(n, true);
        return { ...sidesPartition(side, n), cutValue: 0, side, cutEdges: new Uint32Array(0) };
    }
    const { offset, neighbour, weight } = incidentLists(s, capacity);
    const st: StoerWagnerState = {
        n,
        offset,
        neighbour,
        weight,
        rep: new Uint32Array(n),
        next: new Uint32Array(n).fill(INVALID_INDEX),
        tail: new Uint32Array(n),
        connection: new Float64Array(n),
        added: new Uint8Array(n),
        heap: new IndexedMaxHeap(n),
        prev: INVALID_INDEX,
        last: INVALID_INDEX,
    };
    for (let i = 0; i < n; i++) {
        st.rep[i] = i;
        st.tail[i] = i;
    }
    let best = Infinity;
    let bestSide: NodeMask = makeMask(n);
    for (let active = n; active > 1; active--) {
        runPhase(st);
        if (st.connection[st.last] < best) {
            best = st.connection[st.last];
            bestSide = membersMask(st, st.last);
        }
        mergeLastPhasePair(st);
    }
    return {
        ...sidesPartition(bestSide, n),
        cutValue: best,
        side: bestSide,
        cutEdges: crossingEdges(s, bestSide, false, capacity, false),
    };
}

/**
 * Fills `order` with 0..m-1 and Fisher-Yates shuffles it, drawing from the last slot down.
 * @param order - The edge order, one slot per edge
 * @param rand - The seeded generator
 */
function shuffledEdgeOrder(order: Uint32Array, rand: () => number): void {
    for (let e = 0; e < order.length; e++) {
        order[e] = e;
    }
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const t = order[i];
        order[i] = order[j];
        order[j] = t;
    }
}

/**
 * Unions edge endpoints in `order` until two groups remain.
 * @param n - The node count
 * @param order - The edge order, one slot per edge
 * @param src - The tail of every edge
 * @param dst - The head of every edge
 * @returns The groups
 */
function contractToTwo(n: number, order: Uint32Array, src: Uint32Array, dst: Uint32Array): IntUnionFind {
    const uf = new IntUnionFind(n);
    let groups = n;
    for (let i = 0; i < order.length && groups > 2; i++) {
        if (uf.union(src[order[i]], dst[order[i]])) {
            groups--;
        }
    }
    return uf;
}

/**
 * The weight of the edges with exactly one endpoint in `root`'s group.
 * @param uf - The groups after contraction
 * @param root - The group's root
 * @param src - The tail of every edge
 * @param dst - The head of every edge
 * @param capacity - The capacity of every edge
 * @returns The cut weight
 */
function groupCut(uf: IntUnionFind, root: number, src: Uint32Array, dst: Uint32Array, capacity: Float64Array): number {
    let cut = 0;
    for (let e = 0; e < capacity.length; e++) {
        if ((uf.find(src[e]) === root) !== (uf.find(dst[e]) === root)) {
            cut += capacity[e];
        }
    }
    return cut;
}

/**
 * The mask of the nodes in `root`'s group.
 * @param uf - The groups after contraction
 * @param root - The group's root
 * @param n - The node count
 * @returns The mask
 */
function groupMask(uf: IntUnionFind, root: number, n: number): NodeMask {
    const mask = makeMask(n);
    for (let v = 0; v < n; v++) {
        maskSet(mask, v, uf.find(v) === root);
    }
    return mask;
}

/**
 * Global minimum cut by Karger's randomised contraction, reading every edge as undirected. Each
 * trial unions the endpoints of the edges in a seeded random order (an {@link IntUnionFind}, no
 * graph is contracted) until two groups remain, so every edge is equally likely to be contracted
 * next whatever its weight; the trial's cut is the weight of the edges between the two groups.
 * A graph with more than two components gives a cut of 0 with node 0's component on `side`.
 * O(m alpha(n)) per trial.
 * @param s - The snapshot
 * @param options - Trials, seed and weight override
 * @returns The lightest cut found; with fewer than two nodes the value is 0 and `side` is empty
 * @throws RangeError when `randomSeed` is not an integer or `iterations` is not a positive integer
 * @public
 */
export function kargerMinCut(s: GraphSnapshot, options: KargerOptions = {}): MinCutResult {
    const iterations = options.iterations ?? 100;
    const randomSeed = options.randomSeed ?? 42;
    if (!Number.isInteger(iterations) || iterations < 1) {
        throw withCode(new RangeError(`iterations must be a positive integer, got ${iterations}`), "E_BAD_OPTION");
    }
    if (!Number.isInteger(randomSeed)) {
        throw withCode(new RangeError(`randomSeed must be a finite integer, got ${randomSeed}`), "E_BAD_OPTION");
    }
    const n = s.nodeCount;
    const capacity = edgeCapacities(s, options.weights);
    if (n < 2) {
        const side = makeMask(n);
        return { ...sidesPartition(side, n), cutValue: 0, side, cutEdges: new Uint32Array(0) };
    }
    const { src, dst } = s.edgeList();
    const rand = mulberry32(randomSeed);
    const order = new Uint32Array(s.edgeCount);
    let best = Infinity;
    let bestSide: NodeMask = makeMask(n);
    for (let trial = 0; trial < iterations; trial++) {
        shuffledEdgeOrder(order, rand);
        const uf = contractToTwo(n, order, src, dst);
        const root = uf.find(0);
        const cut = groupCut(uf, root, src, dst, capacity);
        if (cut < best) {
            best = cut;
            bestSide = groupMask(uf, root, n);
        }
    }
    return {
        ...sidesPartition(bestSide, n),
        cutValue: best,
        side: bestSide,
        cutEdges: crossingEdges(s, bestSide, false, capacity, false),
    };
}
