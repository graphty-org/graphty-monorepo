/**
 * Markov Clustering (MCL) over a legacy `Graph`. `markovClustering` delegates to
 * `indexed.markovClustering` through `toSnapshot`, with the graph's exact f64 weights; the result
 * equals the pre-migration implementation in `mcl-legacy.ts` exactly. Parameters or weights the port
 * refuses (a fractional expansion, a negative, infinite or NaN weight, an undirected edge whose two
 * stored halves carry different weights, ...) keep the old code.
 */

import type { Graph } from "../core/graph.js";
import { exactArcWeights, labelsToGroups } from "../indexed/facade.js";
import { markovClustering as indexedMarkovClustering } from "../indexed/markov.js";
import { toSnapshot } from "../indexed/to-snapshot.js";
import { markovClustering as legacyMarkovClustering, type MCLOptions, type MCLResult } from "./mcl-legacy.js";

export type { MCLOptions, MCLResult } from "./mcl-legacy.js";
export { calculateMCLModularity } from "./mcl-legacy.js";

/**
 * Whether the port accepts these parameters and the graph's weights.
 * @param graph - The caller's graph
 * @param options - The caller's options
 * @returns True when the port runs without throwing
 */
function portAccepts(graph: Graph, options: MCLOptions): boolean {
    const { expansion = 2, inflation = 2, maxIterations = 100, tolerance = 1e-6, pruningThreshold = 1e-5 } = options;
    if (!Number.isInteger(expansion) || expansion < 1 || !(inflation > 0) || inflation === Infinity) {
        return false;
    }
    if (!Number.isInteger(maxIterations) || maxIterations < 0 || !(tolerance >= 0) || !(pruningThreshold >= 0)) {
        return false;
    }
    for (const { source, target, weight = 1 } of graph.edges()) {
        if (!(weight >= 0) || weight === Infinity) {
            return false;
        }
        // An undirected edge is stored once per direction, and `getEdge` hands out either half, so
        // a weight set in place can leave the halves disagreeing. The snapshot holds one weight per
        // edge; the old code reads each half, so it keeps such a graph.
        if (!graph.isDirected && (graph.getEdge(target, source)?.weight ?? 1) !== weight) {
            return false;
        }
    }
    return true;
}

/**
 * Perform Markov Clustering on a graph
 * @param graph - The input graph to cluster
 * @param options - MCL algorithm options (expansion, inflation, iterations, etc.)
 * @returns MCL clustering result with communities, attractors, and convergence info
 */
export function markovClustering(graph: Graph, options: MCLOptions = {}): MCLResult {
    if (!portAccepts(graph, options)) {
        return legacyMarkovClustering(graph, options);
    }
    const s = toSnapshot(graph);
    const r = indexedMarkovClustering(s, { ...options, weights: exactArcWeights(s) });
    return {
        communities: labelsToGroups(s.ids, r.labels, r.count),
        attractors: new Set(Array.from(r.attractors, (i) => s.ids.idOf(i))),
        // The old loop reported one round more than it ran when it stopped at the cap.
        iterations: r.iterations + (r.converged ? 0 : 1),
        converged: r.converged,
    };
}
