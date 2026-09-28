/**
 * SynC (Synergistic Deep Graph Clustering) over a legacy `Graph`. `syncClustering` delegates to
 * `indexed.syncClustering` over an unweighted snapshot of the graph (SynC never reads a weight);
 * clusters, embeddings, loss, iterations and convergence equal the pre-migration implementation in
 * `sync-legacy.ts`, the floats to rounding. A cluster count that is not an integer keeps the old
 * code, which mostly fails on one ("Invalid array length"). Unlike the old code the port never
 * replaces `Math.random`.
 */

import type { Graph } from "../core/graph.js";
import { syncClustering as indexedSyncClustering } from "../indexed/sync.js";
import { toTopologySnapshot } from "../indexed/to-snapshot.js";
import type { NodeId } from "../types/index.js";
import { syncClustering as legacySyncClustering, type SynCConfig, type SynCResult } from "./sync-legacy.js";

export type { SynCConfig, SynCResult } from "./sync-legacy.js";

/**
 * Synergistic Deep Graph Clustering (SynC) Algorithm
 *
 * This algorithm combines representation learning with structure augmentation
 * for improved clustering performance on graphs. It jointly optimizes node
 * embeddings and cluster assignments while preserving graph structure.
 *
 * Based on: "Synergistic Deep Graph Clustering" (arXiv:2406.15797, June 2024)
 * @param graph - Input graph to cluster
 * @param config - Configuration options
 * @returns Clustering result with assignments and embeddings
 */
export function syncClustering(graph: Graph, config: SynCConfig): SynCResult {
    if (!Number.isInteger(config.numClusters)) {
        return legacySyncClustering(graph, config);
    }
    const s = toTopologySnapshot(graph);
    const n = s.nodeCount;
    const r = indexedSyncClustering(s, config);

    const clusters = new Map<NodeId, number>();
    const embeddings = new Map<NodeId, number[]>();
    for (let i = 0; i < n; i++) {
        const id = s.ids.idOf(i);
        clusters.set(id, r.labels[i]);
        embeddings.set(id, Array.from(r.embeddings.subarray(i * r.dimensions, (i + 1) * r.dimensions)));
    }
    // The old code reported the loss of the round before the converging one. The run is
    // deterministic, so stopping one round earlier gives exactly that loss.
    // ponytail: a converged call costs two runs; a previous-loss field on the port would save one.
    const loss =
        r.converged && r.iterations > 1
            ? indexedSyncClustering(s, { ...config, maxIterations: r.iterations - 1 }).loss
            : r.loss;
    return {
        clusters,
        loss,
        // ...and one round more than it ran when it stopped at the cap.
        iterations: r.iterations + (r.converged ? 0 : 1),
        embeddings,
        converged: r.converged,
    };
}
