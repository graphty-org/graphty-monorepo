/**
 * Leiden Algorithm for Community Detection
 *
 * An improved version of the Louvain algorithm that guarantees
 * well-connected communities and provides better quality partitions.
 *
 * Reference: Traag, V.A., Waltman, L. & van Eck, N.J. (2019)
 * "From Louvain to Leiden: guaranteeing well-connected communities"
 */

import type { Graph } from "../../core/graph.js";
import { graphToMap } from "../../utils/graph-converters.js";
import { SeededRandom, shuffle } from "../../utils/math-utilities.js";

export interface LeidenOptions {
    resolution?: number;
    randomSeed?: number;
    maxIterations?: number;
    threshold?: number;
}

export interface LeidenResult {
    communities: Map<string, number>;
    modularity: number;
    iterations: number;
}

/** How many local-moving sweeps one level may take before it is declared settled. */
const LOCAL_MOVE_PASSES = 50;

/**
 * Internal implementation of Leiden algorithm for community detection
 * Improves upon Louvain by ensuring well-connected communities
 * @param inputGraph - Map representation of the graph (node to neighbors with weights)
 * @param options - Algorithm configuration options
 * @returns Community assignments, modularity score, and iteration count
 */
function leidenImpl(inputGraph: Map<string, Map<string, number>>, options: LeidenOptions = {}): LeidenResult {
    const { resolution = 1.0, randomSeed = 42, maxIterations = 100, threshold = 1e-7 } = options;

    // Handle empty graph
    if (inputGraph.size === 0) {
        return {
            communities: new Map(),
            modularity: 0,
            iterations: 0,
        };
    }

    const random = SeededRandom.createGenerator(randomSeed);
    const base = weighLevel(inputGraph);

    // Which node of the CURRENT level holds each original node. Every partition is scored against
    // the original graph through this map, so an aggregation can never leave the answer keyed by
    // the super-node names a caller has never heard of -- which is what it used to do.
    const placement = new Map<string, string>();
    for (const node of inputGraph.keys()) {
        placement.set(node, node);
    }

    let bestCommunities = singletonCommunities(inputGraph);
    let bestModularity = calculateModularity(inputGraph, bestCommunities, base.degrees, base.totalWeight, resolution);
    let levelGraph = inputGraph;
    let iterations = 0;

    while (iterations < maxIterations) {
        iterations++;

        const weights = weighLevel(levelGraph);
        const communities = singletonCommunities(levelGraph);
        const moved = moveNodesLocally(levelGraph, weights, communities, random, resolution, LOCAL_MOVE_PASSES);

        // Leiden's guarantee over Louvain: a community whose members are not connected to each
        // other inside this level's graph is split into the pieces that are.
        for (const [node, piece] of refinePartition(levelGraph, communities)) {
            communities.set(node, piece);
        }

        const candidate = new Map<string, number>();
        for (const [original, levelNode] of placement) {
            const community = communities.get(levelNode);
            if (community !== undefined) {
                candidate.set(original, community);
            }
        }

        const modularity = calculateModularity(inputGraph, candidate, base.degrees, base.totalWeight, resolution);

        if (modularity <= bestModularity + threshold) {
            break;
        }

        bestModularity = modularity;
        bestCommunities = candidate;

        const distinct = new Set(communities.values()).size;
        if (!moved || distinct === levelGraph.size) {
            break;
        }

        const aggregated = aggregateLevel(levelGraph, communities);
        for (const [original, levelNode] of placement) {
            const superNode = aggregated.mapping.get(levelNode);
            if (superNode !== undefined) {
                placement.set(original, superNode);
            }
        }

        levelGraph = aggregated.graph;
    }

    // Renumber communities consecutively, in the order they are first met, so the ids a caller
    // reads are 0..k-1 whatever the levels handed out along the way.
    const renumbered = new Map<number, number>();
    const finalCommunities = new Map<string, number>();
    for (const [node, community] of bestCommunities) {
        let id = renumbered.get(community);
        if (id === undefined) {
            id = renumbered.size;
            renumbered.set(community, id);
        }

        finalCommunities.set(node, id);
    }

    return {
        communities: finalCommunities,
        modularity: bestModularity,
        iterations,
    };
}

/**
 * Calculate modularity of a partition
 * @param graph - Map representation of the graph
 * @param communities - Map of node IDs to community IDs
 * @param degrees - Map of node IDs to their weighted degrees
 * @param totalWeight - Total weight of all edges in the graph
 * @param resolution - Resolution parameter for modularity calculation
 * @returns The modularity score of the partition
 */
function calculateModularity(
    graph: Map<string, Map<string, number>>,
    communities: Map<string, number>,
    degrees: Map<string, number>,
    totalWeight: number,
    resolution: number,
): number {
    let modularity = 0;
    const communityWeights = new Map<number, number>();

    // Calculate internal weights for each community
    for (const [node, neighbors] of graph) {
        const nodeCommunity = communities.get(node);
        if (nodeCommunity === undefined) {
            continue;
        }

        for (const [neighbor, weight] of neighbors) {
            const neighborCommunity = communities.get(neighbor);
            if (neighborCommunity === undefined) {
                continue;
            }

            if (nodeCommunity === neighborCommunity) {
                modularity += weight;
            }
        }

        const degree = degrees.get(node);
        if (degree !== undefined) {
            communityWeights.set(nodeCommunity, (communityWeights.get(nodeCommunity) ?? 0) + degree);
        }
    }

    // Handle empty graph or zero weight
    if (totalWeight === 0) {
        return 0;
    }

    // Normalize and apply resolution
    modularity /= 2 * totalWeight;

    // Subtract expected edges
    for (const weight of communityWeights.values()) {
        modularity -= resolution * (weight / (2 * totalWeight)) ** 2;
    }

    return modularity;
}

/**
 * Get communities of neighbors
 * @param node - The node ID to get neighbor communities for
 * @param graph - Map representation of the graph
 * @param communities - Map of node IDs to community IDs
 * @returns Map of community IDs to total edge weight connecting to that community
 */
function getNeighborCommunities(
    node: string,
    graph: Map<string, Map<string, number>>,
    communities: Map<string, number>,
): Map<number, number> {
    const neighborCommunities = new Map<number, number>();
    const neighbors = graph.get(node);

    if (neighbors) {
        for (const [neighbor, weight] of neighbors) {
            const community = communities.get(neighbor);
            if (community !== undefined) {
                neighborCommunities.set(community, (neighborCommunities.get(community) ?? 0) + weight);
            }
        }
    }

    return neighborCommunities;
}

/**
 * Refine partition (Leiden-specific improvement)
 * Ensures well-connected communities by considering subsets
 * @param originalGraph - Map representation of the original graph
 * @param communities - Map of node IDs to community IDs
 * @returns Refined community assignments with well-connected communities
 */
function refinePartition(
    originalGraph: Map<string, Map<string, number>>,
    communities: Map<string, number>,
): Map<string, number> {
    const refined = new Map<string, number>();

    // For each community, check if it should be split
    const communityNodes = new Map<number, string[]>();
    for (const [node, community] of communities) {
        if (!communityNodes.has(community)) {
            communityNodes.set(community, []);
        }

        const nodes = communityNodes.get(community);
        if (nodes) {
            nodes.push(node);
        }
    }

    let newCommunityId = 0;

    for (const [community, nodes] of communityNodes) {
        if (nodes.length === 1) {
            // Single node community
            const singleNode = nodes[0];
            if (singleNode) {
                refined.set(singleNode, newCommunityId++);
            }

            continue;
        }

        // Check connectivity within community
        const subgraph = new Map<string, Set<string>>();
        for (const node of nodes) {
            subgraph.set(node, new Set());
            const neighbors = originalGraph.get(node);
            if (neighbors) {
                for (const [neighbor] of neighbors) {
                    if (communities.get(neighbor) === community) {
                        const nodeSet = subgraph.get(node);
                        if (nodeSet) {
                            nodeSet.add(neighbor);
                        }
                    }
                }
            }
        }

        // Find connected components within community
        const components = findConnectedComponents(subgraph);

        // Assign new community IDs to components
        for (const component of components) {
            for (const node of component) {
                refined.set(node, newCommunityId);
            }
            newCommunityId++;
        }
    }

    return refined;
}

/**
 * Find connected components in undirected graph
 * @param graph - Map representation of the graph (node to set of neighbors)
 * @returns Array of connected components (each is a set of node IDs)
 */
function findConnectedComponents(graph: Map<string, Set<string>>): Set<string>[] {
    const visited = new Set<string>();
    const components: Set<string>[] = [];

    for (const node of graph.keys()) {
        if (!visited.has(node)) {
            const component = new Set<string>();
            const queue = [node];

            while (queue.length > 0) {
                const current = queue.shift();
                if (current === undefined || visited.has(current)) {
                    continue;
                }

                visited.add(current);
                component.add(current);

                const neighbors = graph.get(current);
                if (neighbors) {
                    for (const neighbor of neighbors) {
                        if (!visited.has(neighbor)) {
                            queue.push(neighbor);
                        }
                    }
                }
            }

            components.push(component);
        }
    }

    return components;
}

/**
 * What one level of the algorithm knows about its own graph.
 *
 * RECOMPUTED PER LEVEL, which is the half that used to be missing. After the first aggregation
 * every node is a super-node, and scoring the new graph with the old graph's degrees made the
 * second level's modularity a number about a graph that no longer existed. It came out at zero,
 * the loop read that as "no improvement", and the algorithm stopped after one pass.
 */
interface LevelWeights {
    /** The weighted degree of each node at this level, self-loops included. */
    degrees: Map<string, number>;
    /** Half the summed degree: the total edge weight m, each undirected edge counted once. */
    totalWeight: number;
}

/**
 * Weigh one level's graph.
 * @param graph - The level's graph, stored with both directions of every edge.
 * @returns The degrees and the total edge weight.
 */
function weighLevel(graph: Map<string, Map<string, number>>): LevelWeights {
    const degrees = new Map<string, number>();
    let summed = 0;

    for (const [node, neighbors] of graph) {
        let degree = 0;
        for (const weight of neighbors.values()) {
            degree += weight;
        }

        degrees.set(node, degree);
        summed += degree;
    }

    return { degrees, totalWeight: summed / 2 };
}

/**
 * One node per community, numbered from zero in the order the graph lists its nodes.
 * @param graph - The level's graph.
 * @returns The partition every level starts from.
 */
function singletonCommunities(graph: Map<string, Map<string, number>>): Map<string, number> {
    const communities = new Map<string, number>();
    let next = 0;

    for (const node of graph.keys()) {
        communities.set(node, next++);
    }

    return communities;
}

/**
 * The summed degree of each community's members, which local moving keeps in step with every move.
 * @param communities - The partition.
 * @param degrees - The weighted degree of each node at this level.
 * @returns The summed degree per community.
 */
function communityDegrees(communities: Map<string, number>, degrees: Map<string, number>): Map<number, number> {
    const totals = new Map<number, number>();

    for (const [node, community] of communities) {
        totals.set(community, (totals.get(community) ?? 0) + (degrees.get(node) ?? 0));
    }

    return totals;
}

/**
 * Move nodes to neighbouring communities until a whole sweep changes nothing.
 *
 * ONE SWEEP IS NOT CONVERGENCE, and treating it as such is what left this algorithm returning
 * partitions it could beat with six single-node moves. A move changes the communities its
 * neighbours are weighed against, so the node visited first is judged against a partition that no
 * longer exists by the time the sweep ends. Repeating until a sweep moves nobody is what makes
 * the answer a local optimum of the objective rather than an artefact of the visiting order.
 * @param graph - The level's graph.
 * @param weights - Its degrees and total edge weight.
 * @param communities - The partition, moved in place.
 * @param random - The seeded generator the visiting order is shuffled with.
 * @param resolution - Higher values favour smaller communities.
 * @param maxPasses - A ceiling on the sweeps, so a pathological graph cannot spin for ever.
 * @returns Whether anything moved at all.
 */
function moveNodesLocally(
    graph: Map<string, Map<string, number>>,
    weights: LevelWeights,
    communities: Map<string, number>,
    random: () => number,
    resolution: number,
    maxPasses: number,
): boolean {
    const { degrees, totalWeight } = weights;

    if (totalWeight === 0) {
        return false;
    }

    const totals = communityDegrees(communities, degrees);
    const nodes = [...graph.keys()];
    let movedEver = false;

    for (let pass = 0; pass < maxPasses; pass++) {
        const order = [...nodes];
        shuffle(order, random);
        let movedThisPass = false;

        for (const node of order) {
            const current = communities.get(node);
            const degree = degrees.get(node);
            if (current === undefined || degree === undefined) {
                continue;
            }

            const neighborCommunities = getNeighborCommunities(node, graph, communities);
            const selfLoop = graph.get(node)?.get(node) ?? 0;
            const weightToCurrent = (neighborCommunities.get(current) ?? 0) - selfLoop;
            const degreeOfCurrent = (totals.get(current) ?? 0) - degree;

            let bestCommunity = current;
            let bestGain = 0;

            for (const [community, weightToTarget] of neighborCommunities) {
                if (community === current) {
                    continue;
                }

                // The standard modularity gain for moving one node out of its community and into
                // another: what the move adds to the edges inside a community, less what it adds
                // to what a random graph of the same degrees would have had there.
                const gain =
                    (weightToTarget - weightToCurrent) / totalWeight -
                    (resolution * degree * ((totals.get(community) ?? 0) - degreeOfCurrent)) /
                        (2 * totalWeight * totalWeight);

                if (gain > bestGain) {
                    bestGain = gain;
                    bestCommunity = community;
                }
            }

            if (bestCommunity !== current) {
                communities.set(node, bestCommunity);
                totals.set(current, (totals.get(current) ?? 0) - degree);
                totals.set(bestCommunity, (totals.get(bestCommunity) ?? 0) + degree);
                movedThisPass = true;
                movedEver = true;
            }
        }

        if (!movedThisPass) {
            break;
        }
    }

    return movedEver;
}

/**
 * Collapse each community into one node, carrying its internal weight as a self-loop.
 *
 * THE SELF-LOOP IS THE POINT. Without it the aggregated graph forgets every edge inside a
 * community, so the next level scores a graph with no internal weight anywhere and every
 * partition of it looks equally bad. Both directions of every internal edge land in the same
 * entry, which is exactly the doubled internal weight the modularity sum wants.
 * @param graph - The level's graph.
 * @param communities - The partition to collapse.
 * @returns The next level's graph, and where each node of this one went.
 */
function aggregateLevel(
    graph: Map<string, Map<string, number>>,
    communities: Map<string, number>,
): { graph: Map<string, Map<string, number>>; mapping: Map<string, string> } {
    const aggregated = new Map<string, Map<string, number>>();
    const mapping = new Map<string, string>();

    for (const [node, community] of communities) {
        const superNode = `c${String(community)}`;
        mapping.set(node, superNode);
        if (!aggregated.has(superNode)) {
            aggregated.set(superNode, new Map());
        }
    }

    for (const [node, neighbors] of graph) {
        const source = mapping.get(node);
        const row = source === undefined ? undefined : aggregated.get(source);
        if (row === undefined) {
            continue;
        }

        for (const [neighbor, weight] of neighbors) {
            const target = mapping.get(neighbor);
            if (target === undefined) {
                continue;
            }

            row.set(target, (row.get(target) ?? 0) + weight);
        }
    }

    return { graph: aggregated, mapping };
}

/**
 * Leiden algorithm for community detection
 * Improves upon Louvain by ensuring well-connected communities
 * @param graph - Undirected weighted graph - accepts Graph class or Map representation
 * @param options - Algorithm options
 * @returns Community assignments and modularity
 *
 * Time Complexity: O(m) per iteration, typically O(m log m) total
 * Space Complexity: O(n + m)
 */
export function leiden(graph: Graph, options: LeidenOptions = {}): LeidenResult {
    // Convert Graph to Map representation
    const graphMap = graphToMap(graph);
    return leidenImpl(graphMap, options);
}
