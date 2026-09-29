/**
 * Hierarchical Clustering Algorithm
 *
 * Builds a hierarchy of clusters through agglomeration (bottom-up). `hierarchicalClustering`
 * delegates to `indexed.hierarchicalClustering` over an unweighted snapshot of the graph (hop
 * distances never read a weight) and rebuilds the legacy dendrogram from its merges; the result
 * equals the pre-migration implementation in `hierarchical-legacy.ts` exactly.
 */

import type { Graph } from "../core/graph.js";
import { hierarchicalClustering as indexedHierarchicalClustering } from "../indexed/hierarchical.js";
import { toTopologySnapshot } from "../indexed/to-snapshot.js";
import {
    type ClusterNode,
    cutDendrogram,
    hierarchicalClustering as legacyHierarchicalClustering,
    type HierarchicalClusteringResult,
    type LinkageMethod,
} from "./hierarchical-legacy.js";

export type { ClusterNode, HierarchicalClusteringResult, LinkageMethod } from "./hierarchical-legacy.js";
export { cutDendrogram, cutDendrogramKClusters, modularityHierarchicalClustering } from "./hierarchical-legacy.js";

const LINKAGES: readonly string[] = ["single", "complete", "average", "ward"];

/**
 * Agglomerative hierarchical clustering
 * Builds clusters bottom-up by merging closest pairs
 * @param graph - Undirected graph - accepts Graph class or Map<T, Set<T>>
 * @param linkage - Linkage method for cluster distance
 * @returns Hierarchical clustering result
 *
 * Time Complexity: O(n³) naive, O(n² log n) with heap
 * Space Complexity: O(n²)
 */
export function hierarchicalClustering(
    graph: Graph,
    linkage: LinkageMethod = "single",
): HierarchicalClusteringResult<string> {
    const s = toTopologySnapshot(graph);
    const n = s.nodeCount;
    const names = Array.from({ length: n }, (_, i) => String(s.ids.idOf(i)));
    // The old code keys nodes by String(id), so ids spelled alike (1 and "1") are one node to it.
    if (new Set(names).size !== n) {
        return legacyHierarchicalClustering(graph, linkage);
    }
    if (n === 0) {
        return {
            root: { id: "empty", members: new Set(), distance: 0, height: 0 },
            dendrogram: [],
            clusters: new Map(),
        };
    }
    // An unknown linkage falls through to single linkage, as it always has.
    const r = indexedHierarchicalClustering(s, { linkage: LINKAGES.includes(linkage) ? linkage : "single" });

    const dendrogram: ClusterNode<string>[] = names.map((name, i) => ({
        id: `leaf-${String(i)}`,
        members: new Set([name]),
        distance: 0,
        height: 0,
    }));
    for (let k = 0; k < r.left.length; k++) {
        const left = dendrogram[r.left[k]];
        const right = dendrogram[r.right[k]];
        dendrogram.push({
            id: `cluster-${String(n + k)}`,
            members: new Set([...left.members, ...right.members]),
            left,
            right,
            distance: r.distance[k],
            height: r.height[n + k],
        });
    }
    let root: ClusterNode<string>;
    if (r.roots.length === 1) {
        root = dendrogram[r.roots[0]];
    } else {
        const trees = Array.from(r.roots, (c) => dendrogram[c]);
        root = {
            id: `forest-${String(dendrogram.length)}`,
            members: new Set(names),
            distance: Infinity,
            height: Math.max(...trees.map((t) => t.height)) + 1,
            trees,
        };
        dendrogram.push(root);
    }

    const clusters = new Map<number, Set<string>[]>();
    for (let h = 0; h <= root.height; h++) {
        clusters.set(h, cutDendrogram(root, h));
    }
    return { root, dendrogram, clusters };
}
