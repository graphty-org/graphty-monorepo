/**
 * Shared modularity calculation utilities for community detection algorithms
 *
 * Used by: Louvain, Leiden, Girvan-Newman
 */
import type { Graph } from "../../core/graph.js";
import type { NodeId } from "../../types/index.js";

/**
 * Calculate total edge weight in the graph
 *
 * For undirected graphs, each edge is counted once.
 * For directed graphs, each directed edge is counted once.
 * @param graph - The input graph
 * @returns Total sum of edge weights (default weight is 1)
 */
export function getTotalEdgeWeight(graph: Graph): number {
    let totalWeight = 0;

    for (const edge of graph.edges()) {
        totalWeight += edge.weight ?? 1;
    }

    return totalWeight;
}

/**
 * Get the total degree (sum of edge weights) for a node
 *
 * Computes the weighted degree by summing all edge weights incident to the node.
 * @param graph - The input graph
 * @param nodeId - The node ID to compute degree for
 * @returns The weighted degree of the node
 */
export function getNodeDegree(graph: Graph, nodeId: NodeId): number {
    let degree = 0;

    for (const neighbor of graph.neighbors(nodeId)) {
        const edge = graph.getEdge(nodeId, neighbor);
        degree += edge?.weight ?? 1;
    }

    return degree;
}

/**
 * Get communities of neighboring nodes
 *
 * Returns the set of community IDs that neighbors of the given node belong to.
 * @param graph - The input graph
 * @param nodeId - The node to get neighbor communities for
 * @param communities - Map from node IDs to community IDs
 * @returns Set of community IDs that neighbors belong to
 */
export function getNeighborCommunities(graph: Graph, nodeId: NodeId, communities: Map<NodeId, number>): Set<number> {
    const neighborCommunities = new Set<number>();

    for (const neighbor of graph.neighbors(nodeId)) {
        const community = communities.get(neighbor);
        if (community !== undefined) {
            neighborCommunities.add(community);
        }
    }

    return neighborCommunities;
}

/**
 * Calculate modularity of a partition
 *
 * Modularity measures the quality of a community partition. It compares the
 * weight of the edges inside communities to what would be expected in a random graph
 * with the same degrees.
 *
 * Formula: Q = sum over communities c of [ w_in(c)/m - gamma * (K_c / 2m)^2 ]
 * where:
 * - m = total edge weight, each undirected edge counted once
 * - w_in(c) = summed weight of the edges with both endpoints inside community c
 * - K_c = summed weighted degree of community c's nodes
 * - gamma = resolution parameter (higher values favor smaller communities)
 *
 * This is the per-community form of Q = (1/2m) * sum_ij [A_ij - gamma * k_i * k_j / (2m)] over the
 * pairs in the same community.
 * The double sum runs over every PAIR of nodes inside a community, so collecting the null-model
 * term only where an edge exists leaves the penalty far too small and rewards coarseness: the
 * single-community partition, whose modularity is 0 by definition, would otherwise outscore every
 * real split. The form below visits each community once and each edge once, so it counts every
 * pair exactly once without a pass over the whole adjacency matrix.
 * @param graph - The input graph
 * @param communities - Map from node IDs to community IDs
 * @param resolution - Resolution parameter (default: 1.0)
 * @returns Modularity score (range typically -0.5 to 1.0)
 */
export function calculateModularity(graph: Graph, communities: Map<NodeId, number>, resolution = 1.0): number {
    const totalEdgeWeight = getTotalEdgeWeight(graph);
    if (totalEdgeWeight === 0) {
        return 0;
    }

    // Summed weighted degree of each community's nodes.
    const degreeSum = new Map<number, number>();
    for (const node of graph.nodes()) {
        const community = communities.get(node.id);
        if (community === undefined) {
            continue;
        }

        degreeSum.set(community, (degreeSum.get(community) ?? 0) + getNodeDegree(graph, node.id));
    }

    // Summed weight of the edges that stay inside a community.
    const internalWeight = new Map<number, number>();
    for (const edge of graph.edges()) {
        const communityI = communities.get(edge.source);
        const communityJ = communities.get(edge.target);

        if (communityI === undefined || communityI !== communityJ) {
            continue;
        }

        internalWeight.set(communityI, (internalWeight.get(communityI) ?? 0) + (edge.weight ?? 1));
    }

    let modularity = 0;
    for (const [community, degrees] of degreeSum) {
        const share = degrees / (2 * totalEdgeWeight);
        modularity += (internalWeight.get(community) ?? 0) / totalEdgeWeight - resolution * share * share;
    }

    return modularity;
}
