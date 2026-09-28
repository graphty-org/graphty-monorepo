import type { GraphSnapshot, NumericVector } from "@graphty/graph-format";

import type { ScoresResult } from "./betweenness.js";
import { IndexedMinHeap } from "./structures/min-heap.js";

/** Options of the index-based closeness centrality, matching the legacy `closenessCentrality`. @public */
export interface ClosenessOptions {
    /**
     * Scale by the fraction of other nodes reached (Wasserman and Faust), or with `harmonic` divide by
     * `n - 1`. Default false.
     */
    readonly normalized?: boolean | undefined;
    /** Sum `1 / distance` instead of taking `1 / sum(distance)`; better on disconnected graphs. Default false. */
    readonly harmonic?: boolean | undefined;
    /**
     * Stop searching from nodes this far away or farther. A node past the cutoff is still counted when an edge
     * reaches it from a node closer than the cutoff, as in the legacy functions. Default: every reachable node.
     */
    readonly cutoff?: number | undefined;
    /**
     * Measure distance by edge weight (Dijkstra) rather than by hops, as the legacy
     * `weightedClosenessCentrality` does. Default false: weights are ignored, as the legacy
     * `closenessCentrality` ignores them.
     */
    readonly weighted?: boolean | undefined;
    /** Per-arc weight override, arcCount long, read when `weighted`; a facade passes the exact f64 weights. */
    readonly weights?: NumericVector | undefined;
}

/** Scores one source at a time, reusing its scratch arrays across sources. */
type Scorer = (source: number) => number;

/**
 * Build the per-source scorer: a breadth-first search, or Dijkstra when `weighted`, then the legacy formula.
 * @param s - The snapshot
 * @param o - The options
 * @returns The scorer
 */
function scorer(s: GraphSnapshot, o: ClosenessOptions): Scorer {
    const { nodeCount: n, rowPtr, colIdx } = s;
    const cutoff = o.cutoff ?? Infinity;
    const weights = o.weighted === true ? (o.weights ?? s.weights) : null;
    const dist = new Float64Array(n).fill(Infinity);
    const reached = new Uint32Array(n);
    const heap = weights === null ? null : new IndexedMinHeap(n);
    // A popped node is final, as in the legacy search: without this a negative cycle never ends.
    const settled = new Uint8Array(n);

    /**
     * Fill `dist` from the source and list the reached nodes in `reached`.
     * @param source - The source index
     * @returns How many nodes were reached, the source included
     */
    function search(source: number): number {
        let tail = 0;
        dist[source] = 0;
        reached[tail++] = source;
        if (heap === null || weights === null) {
            for (let head = 0; head < tail; head++) {
                const v = reached[head];
                if (dist[v] >= cutoff) {
                    continue;
                }
                for (let a = rowPtr[v], end = rowPtr[v + 1]; a < end; a++) {
                    const w = colIdx[a];
                    if (dist[w] === Infinity) {
                        dist[w] = dist[v] + 1;
                        reached[tail++] = w;
                    }
                }
            }
            return tail;
        }
        heap.push(source, 0);
        while (!heap.isEmpty()) {
            const v = heap.pop();
            settled[v] = 1;
            if (dist[v] >= cutoff) {
                continue;
            }
            for (let a = rowPtr[v], end = rowPtr[v + 1]; a < end; a++) {
                const w = colIdx[a];
                if (settled[w] === 1) {
                    continue;
                }
                const d = dist[v] + weights[a];
                if (d < dist[w]) {
                    if (dist[w] === Infinity) {
                        reached[tail++] = w;
                    }
                    dist[w] = d;
                    heap.pushOrDecrease(w, d);
                }
            }
        }
        return tail;
    }

    return (source: number): number => {
        const count = search(source);
        let score = 0;
        let total = 0;
        for (let i = 1; i < count; i++) {
            const d = dist[reached[i]];
            if (o.harmonic === true) {
                score += d > 0 ? 1 / d : 0;
            } else {
                total += d;
            }
        }
        for (let i = 0; i < count; i++) {
            dist[reached[i]] = Infinity;
            settled[reached[i]] = 0;
        }
        if (o.harmonic === true) {
            return o.normalized === true && n > 1 ? score / (n - 1) : score;
        }
        if (total <= 0) {
            return 0;
        }
        return o.normalized === true && n > 1 ? (count - 1) / total / (n - 1) : 1 / total;
    };
}

/**
 * Closeness centrality of every node: `1 / sum(distance to each reached node)` by default, the legacy
 * `closenessCentrality` (hops) and `weightedClosenessCentrality` (`weighted: true`) numbers. The weighted
 * route reads the snapshot's f32 arc weights, so it matches legacy to f32 rounding; pass the f64 weights as
 * `weights` for the exact legacy sums. As in legacy, a node's distance is final once it is searched from, so a
 * negative weight gives the legacy (not the true shortest) distance and never loops. An unreached node adds
 * nothing, and a node that reaches nothing scores 0.
 * @param s - The snapshot
 * @param options - Normalisation, harmonic form, cutoff and weights
 * @returns One score per node index; `iterations` is the number of searches run
 * @public
 */
export function closenessCentrality(s: GraphSnapshot, options: ClosenessOptions = {}): ScoresResult {
    const score = scorer(s, options);
    const scores = new Float64Array(s.nodeCount);
    for (let v = 0; v < s.nodeCount; v++) {
        scores[v] = score(v);
    }
    return { scores, iterations: s.nodeCount, converged: true };
}

/**
 * Closeness centrality of one node, with one search rather than n.
 * @param s - The snapshot
 * @param node - The node index
 * @param options - As {@link closenessCentrality}
 * @returns The node's score
 * @throws RangeError for a node index outside `[0, nodeCount)`
 * @public
 */
export function nodeClosenessCentrality(s: GraphSnapshot, node: number, options: ClosenessOptions = {}): number {
    if (!Number.isInteger(node) || node < 0 || node >= s.nodeCount) {
        throw new RangeError(`nodeClosenessCentrality: node must be an index in [0, ${s.nodeCount}), got ${node}`);
    }
    return scorer(s, options)(node);
}
