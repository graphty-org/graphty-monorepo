import { type AdjacencyView, INVALID_INDEX, type NumericVector, type U32 } from "@graphty/graph-format";

import { type SsspOptions, type SsspResult, walkPredArcs, walkPredEdges } from "./dijkstra.js";

/** Result of the index-based Bellman-Ford: the SSSP result plus the negative-cycle flag. @public */
export interface BellmanFordResult extends SsspResult {
    /**
     * True when a negative cycle is reachable from the source. `dist` and `predArc` then hold the
     * state after `nodeCount - 1` rounds, which are not shortest paths, and a path accessor may throw
     * `PathWalkError` on a predecessor chain that loops.
     */
    readonly hasNegativeCycle: boolean;
}

/**
 * Bellman-Ford single-source shortest paths, index-based, for weights that may be negative. It
 * relaxes every arc, so an undirected edge is relaxed both ways (it has an arc in each direction),
 * and one negative undirected edge is therefore a negative cycle. Rounds stop early once one changes
 * nothing; after `nodeCount - 1` rounds one more round decides `hasNegativeCycle`. The predecessor
 * is the relaxing ARC, as in `dijkstra`, so a parallel edge on a path is identified exactly.
 * @param g - The adjacency to search
 * @param source - The node index to start from
 * @param options - Cutoff (a relaxation beyond it is skipped) and per-arc weight override
 * @returns The distances, the predecessor arcs, the path accessors and the negative-cycle flag
 * @public
 */
export function bellmanFord(g: AdjacencyView, source: number, options: SsspOptions = {}): BellmanFordResult {
    const { nodeCount, rowPtr, colIdx } = g;
    const weights: NumericVector | null = options.weights ?? g.weights;
    const cutoff = options.cutoff ?? Infinity;
    const dist = new Float64Array(nodeCount).fill(Infinity);
    const predArc = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    dist[source] = 0;

    /**
     * One pass over every arc leaving a reached node.
     * @returns True when any distance dropped
     */
    const round = (): boolean => {
        let changed = false;
        for (let u = 0; u < nodeCount; u++) {
            const du = dist[u];
            if (du === Infinity) {
                continue;
            }
            const end = rowPtr[u + 1];
            for (let a = rowPtr[u]; a < end; a++) {
                const v = colIdx[a];
                const dv = du + (weights === null ? 1 : weights[a]);
                if (dv < dist[v] && dv <= cutoff) {
                    dist[v] = dv;
                    predArc[v] = a;
                    changed = true;
                }
            }
        }
        return changed;
    };

    let settled = false;
    for (let i = 0; i < nodeCount - 1 && !settled; i++) {
        settled = !round();
    }
    const hasNegativeCycle = !settled && round();
    return {
        dist,
        predArc,
        hasNegativeCycle,
        pathTo: (target: number): U32 => walkPredArcs(g, predArc, source, target),
        pathEdges: (target: number): U32 => walkPredEdges(g, predArc, source, target),
    };
}
