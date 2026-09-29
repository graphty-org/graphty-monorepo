import type { Graph } from "../../core/graph.js";
import { labelsToGroups } from "../../indexed/facade.js";
import { girvanNewman as indexedGirvanNewman } from "../../indexed/girvan-newman.js";
import { needsLegacyCode, toSnapshot } from "../../indexed/to-snapshot.js";
import type { CommunityResult, GirvanNewmanOptions } from "../../types/index.js";
import { girvanNewman as legacyGirvanNewman } from "./girvan-newman-legacy.js";

/**
 * Girvan-Newman community detection algorithm
 *
 * Implements the Girvan-Newman method for community detection by iteratively
 * removing edges with the highest betweenness centrality until the graph
 * splits into disconnected components.
 *
 * This is a divisive hierarchical clustering algorithm that produces a
 * dendrogram of community structures. It delegates to `indexed.girvanNewman`; the result equals
 * the pre-migration implementation in `girvan-newman-legacy.ts`.
 *
 * References:
 * - Girvan, M., & Newman, M. E. J. (2002). Community structure in social
 * and biological networks. Proceedings of the National Academy of Sciences,
 * 99(12), 7821-7826.
 * @param graph - The input graph (must be undirected)
 * @param options - Algorithm options
 * @returns Array of community detection results representing the dendrogram
 * @throws Error on a directed graph
 */
export function girvanNewman(graph: Graph, options: GirvanNewmanOptions = {}): CommunityResult[] {
    // A directed graph throws from the old code's component step. A self-loop counts once in the
    // old modularity's node degree and twice in the port's; ids spelled alike share the old code's
    // edge keys.
    if (graph.isDirected || needsLegacyCode(graph)) {
        return legacyGirvanNewman(graph, options);
    }
    const s = toSnapshot(graph);
    if (s.flags.hasSelfLoops) {
        return legacyGirvanNewman(graph, options);
    }
    const minCommunitySize = options.minCommunitySize ?? 1;
    let { maxCommunities, maxIterations } = options;
    // The old code stopped after the first round on any truthy maxCommunities it had reached, which
    // a negative one always has; the port ignores a count below 1.
    if (maxCommunities !== undefined && maxCommunities < 0) {
        maxCommunities = undefined;
        maxIterations = Math.min(maxIterations ?? 100, 1);
    }
    const r = indexedGirvanNewman(s, { maxCommunities, minCommunitySize, maxIterations });
    return r.levels.map((labels, i) => {
        let count = 0;
        for (const label of labels) {
            count = Math.max(count, label + 1);
        }
        return {
            communities: labelsToGroups(s.ids, labels, count).filter((c) => c.length >= minCommunitySize),
            modularity: r.modularity[i],
        };
    });
}
