/**
 * GRSBM (Greedy Recursive Spectral Bisection with Modularity) over a legacy `Graph`. `grsbm`
 * delegates to `indexed.grsbm` over an unweighted snapshot of the graph, counting edges as the old
 * code did, and rebuilds the cluster tree, labels and explanations; the result equals the
 * pre-migration implementation in `grsbm-legacy.ts` exactly. A graph with a self-loop keeps the old
 * code: the port counts a self-loop twice in the degree, the old code once. Unlike the old code the
 * port never replaces `Math.random`.
 */

import { INVALID_INDEX } from "@graphty/graph-format";

import type { Graph } from "../core/graph.js";
import { grsbm as indexedGrsbm } from "../indexed/grsbm.js";
import { toTopologySnapshot } from "../indexed/to-snapshot.js";
import type { NodeId } from "../types/index.js";
import {
    type ClusterExplanation,
    grsbm as legacyGrsbm,
    type GRSBMCluster,
    type GRSBMConfig,
    type GRSBMResult,
} from "./grsbm-legacy.js";

export type { ClusterExplanation, GRSBMCluster, GRSBMConfig, GRSBMResult } from "./grsbm-legacy.js";

/**
 * GRSBM - Greedy Recursive Spectral Bisection with Modularity
 *
 * This algorithm performs hierarchical community detection using spectral
 * bisection guided by modularity optimization. It provides explainable
 * community structure by tracking the reasoning behind each split.
 *
 * Based on: "Explainable Community Detection via Hierarchical Spectral Clustering" (2024)
 * @param graph - Input graph to cluster
 * @param config - Configuration options
 * @returns Hierarchical clustering result with explanations
 */
export function grsbm(graph: Graph, config: GRSBMConfig = {}): GRSBMResult {
    const s = toTopologySnapshot(graph);
    if (s.selfLoopCount > 0) {
        return legacyGrsbm(graph, config);
    }
    // numEigenvectors was never read by the old code either.
    const { maxDepth, minClusterSize, tolerance, maxIterations, seed } = config;
    const r = indexedGrsbm(s, { maxDepth, minClusterSize, tolerance, maxIterations, seed, weighted: false });
    const idOf = (i: number): NodeId => s.ids.idOf(i);
    const name = (serial: number): string => (serial === 0 ? "root" : `cluster_${String(serial)}`);

    const build = (c: number): GRSBMCluster => {
        const cluster = r.clusters[c];
        const out: GRSBMCluster = {
            id: name(cluster.serial),
            members: new Set(Array.from(cluster.members, idOf)),
            modularity: cluster.modularity,
            depth: cluster.depth,
            spectralScore: cluster.spectralScore,
        };
        if (cluster.left !== INVALID_INDEX) {
            out.left = build(cluster.left);
            out.right = build(cluster.right);
        }
        return out;
    };

    // The old labels number the leaves left to right, an emptied leaf included.
    const clusters = new Map<NodeId, number>();
    let leaves = 0;
    const walk = (c: number): void => {
        const cluster = r.clusters[c];
        if (cluster.left === INVALID_INDEX) {
            for (const i of cluster.members) {
                clusters.set(idOf(i), leaves);
            }
            leaves++;
        } else {
            walk(cluster.left);
            walk(cluster.right);
        }
    };
    walk(0);

    const explanation: ClusterExplanation[] = r.clusters.flatMap((cluster) => {
        const { split } = cluster;
        if (split === null) {
            return [];
        }
        const left = r.clusters[cluster.left];
        const right = r.clusters[cluster.right];
        return [
            {
                clusterId: name(cluster.serial),
                reason: `Spectral bisection based on Fiedler vector with modularity ${split.bisectionModularity.toFixed(3)}. Split creates clusters of sizes ${String(left.members.length)} and ${String(right.members.length)}.`,
                modularityImprovement: split.improvement,
                keyNodes: Array.from(split.keyNodes, idOf),
                spectralValues: Array.from(split.spectralValues),
            },
        ];
    });

    return {
        root: build(0),
        clusters,
        numClusters: leaves,
        modularityScores: Array.from(r.modularityScores),
        explanation,
    };
}
