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
import type { WeightedOptions } from "./weights.js";

/** Options of {@link stoerWagner}. @public */
export interface StoerWagnerOptions extends WeightedOptions {
    /** Per-arc weight override, arcCount long; without it the snapshot's weights (1 when unweighted). */
    readonly weights?: NumericVector | undefined;
}

/** Options of {@link kargerMinCut}. @public */
export interface KargerOptions extends WeightedOptions {
    /** Independent contraction trials; the lightest cut found wins. Default 100. */
    readonly iterations?: number | undefined;
    /** Seed of the edge orders; one seed gives one result, bit for bit. Default 42. */
    readonly randomSeed?: number | undefined;
    /** Per-arc weight override, arcCount long; without it the snapshot's weights (1 when unweighted). */
    readonly weights?: NumericVector | undefined;
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
    const capacity = edgeCapacities(s, options);
    if (n < 2) {
        const side = makeMask(n, true);
        return { ...sidesPartition(side, n), cutValue: 0, side, cutEdges: new Uint32Array(0) };
    }
    // Incident (neighbour, edge) pairs per node, both directions of every edge.
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

    const rep = new Uint32Array(n);
    const next = new Uint32Array(n).fill(INVALID_INDEX); // member lists, one per representative
    const tail = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        rep[i] = i;
        tail[i] = i;
    }
    const connection = new Float64Array(n);
    const added = new Uint8Array(n);
    const heap = new IndexedMaxHeap(n);
    let best = Infinity;
    let bestSide: NodeMask = makeMask(n);

    for (let active = n; active > 1; active--) {
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
        let prev = INVALID_INDEX;
        let last = start;
        for (;;) {
            added[last] = 1;
            for (let m = last; m !== INVALID_INDEX; m = next[m]) {
                for (let k = offset[m]; k < offset[m + 1]; k++) {
                    const x = rep[neighbour[k]];
                    if (added[x] === 0) {
                        connection[x] += weight[k];
                        heap.pushOrIncrease(x, connection[x]);
                    }
                }
            }
            if (heap.isEmpty()) {
                break;
            }
            prev = last;
            last = heap.pop();
        }
        if (connection[last] < best) {
            best = connection[last];
            bestSide = makeMask(n);
            for (let m = last; m !== INVALID_INDEX; m = next[m]) {
                maskSet(bestSide, m, true);
            }
        }
        // Merge the last node of the phase into the one before it.
        for (let m = last; m !== INVALID_INDEX; m = next[m]) {
            rep[m] = prev;
        }
        next[tail[prev]] = last;
        tail[prev] = tail[last];
    }
    return {
        ...sidesPartition(bestSide, n),
        cutValue: best,
        side: bestSide,
        cutEdges: crossingEdges(s, bestSide, false, capacity, false),
    };
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
    const capacity = edgeCapacities(s, options);
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
        for (let e = 0; e < order.length; e++) {
            order[e] = e;
        }
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            const t = order[i];
            order[i] = order[j];
            order[j] = t;
        }
        const uf = new IntUnionFind(n);
        let groups = n;
        for (let i = 0; i < order.length && groups > 2; i++) {
            if (uf.union(src[order[i]], dst[order[i]])) {
                groups--;
            }
        }
        const root = uf.find(0);
        let cut = 0;
        for (let e = 0; e < s.edgeCount; e++) {
            if ((uf.find(src[e]) === root) !== (uf.find(dst[e]) === root)) {
                cut += capacity[e];
            }
        }
        if (cut < best) {
            best = cut;
            bestSide = makeMask(n);
            for (let v = 0; v < n; v++) {
                maskSet(bestSide, v, uf.find(v) === root);
            }
        }
    }
    return {
        ...sidesPartition(bestSide, n),
        cutValue: best,
        side: bestSide,
        cutEdges: crossingEdges(s, bestSide, false, capacity, false),
    };
}
