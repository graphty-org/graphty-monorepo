/**
 * Label Propagation Algorithm for Community Detection
 *
 * A fast, near-linear time algorithm that detects communities by
 * propagating labels through the network. Each node adopts the label
 * that most of its neighbors have.
 *
 * Reference: Raghavan et al. (2007) "Near linear time algorithm to
 * detect community structures in large-scale networks"
 */

import type { Graph } from "../../core/graph.js";
import { labelPropagation as indexedLabelPropagation } from "../../indexed/label-propagation.js";
import { toSnapshot } from "../../indexed/to-snapshot.js";
import { graphToMap } from "../../utils/graph-converters.js";
import { SeededRandom, shuffle } from "../../utils/math-utilities.js";

export interface LabelPropagationOptions {
    maxIterations?: number;
    randomSeed?: number;
}

export interface LabelPropagationResult {
    communities: Map<string, number>;
    iterations: number;
    converged: boolean;
}

/**
 * Internal implementation of Asynchronous Label Propagation
 * Updates all nodes simultaneously (can lead to oscillations)
 * @param graph - Map representation of the graph (node to neighbors with weights)
 * @param options - Algorithm configuration options
 * @returns Community assignments, iteration count, and convergence status
 */
function labelPropagationAsyncImpl(
    graph: Map<string, Map<string, number>>,
    options: LabelPropagationOptions = {},
): LabelPropagationResult {
    const { maxIterations = 100 } = options;

    if (graph.size === 0) {
        return {
            communities: new Map(),
            iterations: 0,
            converged: true,
        };
    }

    // Initialize labels
    const labels = new Map<string, number>();
    const nodes = Array.from(graph.keys());
    nodes.forEach((node, i) => labels.set(node, i));

    let iterations = 0;
    let converged = false;

    // Main loop
    while (iterations < maxIterations && !converged) {
        iterations++;
        converged = true;

        // Store new labels
        const newLabels = new Map<string, number>();

        // Update all nodes simultaneously
        for (const node of nodes) {
            const neighbors = graph.get(node);
            if (!neighbors || neighbors.size === 0) {
                const nodeLabel = labels.get(node);
                if (nodeLabel !== undefined) {
                    newLabels.set(node, nodeLabel);
                }

                continue;
            }

            // Count label frequencies
            const labelCounts = new Map<number, number>();
            let maxCount = 0;
            const nodeLabel = labels.get(node);
            if (nodeLabel === undefined) {
                continue;
            }

            let maxLabel = nodeLabel;

            for (const [neighbor, weight] of neighbors) {
                const neighborLabel = labels.get(neighbor);
                if (neighborLabel === undefined) {
                    continue;
                }

                const count = (labelCounts.get(neighborLabel) ?? 0) + weight;
                labelCounts.set(neighborLabel, count);

                if (count > maxCount || (count === maxCount && neighborLabel < maxLabel)) {
                    maxCount = count;
                    maxLabel = neighborLabel;
                }
            }

            newLabels.set(node, maxLabel);

            if (maxLabel !== labels.get(node)) {
                converged = false;
            }
        }

        // Apply new labels
        for (const [node, label] of newLabels) {
            labels.set(node, label);
        }
    }

    // Renumber communities
    const uniqueLabels = new Set(labels.values());
    const labelMap = new Map<number, number>();
    let communityId = 0;

    for (const label of uniqueLabels) {
        labelMap.set(label, communityId++);
    }

    const communities = new Map<string, number>();
    for (const [node, label] of labels) {
        const mappedLabel = labelMap.get(label);
        if (mappedLabel !== undefined) {
            communities.set(node, mappedLabel);
        }
    }

    return {
        communities,
        iterations,
        converged,
    };
}

/**
 * Internal implementation of Semi-supervised Label Propagation
 * Some nodes have fixed labels that don't change
 * @param graph - Map representation of the graph (node to neighbors with weights)
 * @param seedLabels - Map of node IDs to their fixed community labels
 * @param options - Algorithm configuration options
 * @returns Community assignments, iteration count, and convergence status
 */
function labelPropagationSemiSupervisedImpl(
    graph: Map<string, Map<string, number>>,
    seedLabels: Map<string, number>,
    options: LabelPropagationOptions = {},
): LabelPropagationResult {
    const { maxIterations = 100, randomSeed = 42 } = options;

    // Initialize random number generator
    const random = SeededRandom.createGenerator(randomSeed);

    // Initialize labels
    const labels = new Map<string, number>();
    const nodes = Array.from(graph.keys());
    let labelCounter = Math.max(...Array.from(seedLabels.values())) + 1;

    for (const node of nodes) {
        if (seedLabels.has(node)) {
            const seedLabel = seedLabels.get(node);
            if (seedLabel !== undefined) {
                labels.set(node, seedLabel);
            }
        } else {
            labels.set(node, labelCounter++);
        }
    }

    let iterations = 0;
    let converged = false;

    // Main loop
    while (iterations < maxIterations && !converged) {
        iterations++;
        converged = true;

        // Create random order
        const nodeOrder = nodes.filter((n) => !seedLabels.has(n));
        shuffle(nodeOrder, random);

        // Update non-seed nodes
        for (const node of nodeOrder) {
            const neighbors = graph.get(node);
            if (!neighbors || neighbors.size === 0) {
                continue;
            }

            // Count label frequencies
            const labelCounts = new Map<number, number>();
            let maxCount = 0;
            const candidateLabels: number[] = [];

            for (const [neighbor, weight] of neighbors) {
                const neighborLabel = labels.get(neighbor);
                if (neighborLabel === undefined) {
                    continue;
                }

                const count = (labelCounts.get(neighborLabel) ?? 0) + weight;
                labelCounts.set(neighborLabel, count);

                if (count > maxCount) {
                    maxCount = count;
                    candidateLabels.length = 0;
                    candidateLabels.push(neighborLabel);
                } else if (count === maxCount) {
                    candidateLabels.push(neighborLabel);
                }
            }

            // Choose label
            const currentLabel = labels.get(node);
            if (currentLabel === undefined) {
                continue;
            }

            let newLabel = currentLabel;

            if (candidateLabels.length > 0) {
                const index = Math.floor(random() * candidateLabels.length);
                const selectedLabel = candidateLabels[index];
                if (selectedLabel !== undefined) {
                    newLabel = selectedLabel;
                }
            }

            if (newLabel !== currentLabel) {
                labels.set(node, newLabel);
                converged = false;
            }
        }
    }

    return {
        communities: labels,
        iterations,
        converged,
    };
}

/**
 * Label Propagation Algorithm (fast label propagation: a seeded work queue of nodes whose label
 * may no longer be dominant). Each node adopts the label with the largest summed edge weight among
 * its neighbours, ties drawn uniformly; on a directed graph in- and out-neighbours both vote, and a
 * self-loop does not vote. Communities are numbered in order of first appearance in node order.
 * @param graph - The graph (can be weighted)
 * @param options - Algorithm options
 * @returns Community assignments keyed by `String(id)`
 * @throws RangeError when an edge weight is negative, NaN or infinite
 *
 * Time Complexity: O(m) per full pass, at most maxIterations passes
 * Space Complexity: O(n + m)
 */
export function labelPropagation(graph: Graph, options: LabelPropagationOptions = {}): LabelPropagationResult {
    const s = toSnapshot(graph);
    const n = s.nodeCount;
    // This function always took any number: its loop ran while iterations < maxIterations, and any
    // seed started a stream. The port wants integers, so round here the way that loop counted.
    const max = options.maxIterations ?? 100;
    const cap = max > 0 ? Math.min(Math.ceil(max), Math.floor(Number.MAX_SAFE_INTEGER / Math.max(n, 1))) : 0;
    const seed = options.randomSeed ?? 42;
    const { labels, iterations, converged } = indexedLabelPropagation(s, {
        maxIterations: cap,
        randomSeed: Number.isFinite(seed) ? Math.floor(seed) : 0,
    });
    // With no pass run on a non-empty graph, nothing was checked, so nothing converged.
    return { communities: s.ids.toStringMap(labels), iterations, converged: converged && (cap > 0 || n === 0) };
}

/**
 * Asynchronous Label Propagation
 * Updates all nodes simultaneously (can lead to oscillations)
 * @param graph - Undirected graph (can be weighted)
 * @param options - Algorithm options
 * @returns Community assignments
 */
export function labelPropagationAsync(graph: Graph, options: LabelPropagationOptions = {}): LabelPropagationResult {
    // Convert Graph to Map representation
    const graphMap = graphToMap(graph);
    return labelPropagationAsyncImpl(graphMap, options);
}

/**
 * Semi-supervised Label Propagation
 * Some nodes have fixed labels that don't change
 * @param graph - Undirected graph (can be weighted)
 * @param seedLabels - Initial fixed labels for some nodes
 * @param options - Algorithm options
 * @returns Community assignments
 */
export function labelPropagationSemiSupervised(
    graph: Graph,
    seedLabels: Map<string, number>,
    options: LabelPropagationOptions = {},
): LabelPropagationResult {
    // Convert Graph to Map representation
    const graphMap = graphToMap(graph);
    return labelPropagationSemiSupervisedImpl(graphMap, seedLabels, options);
}
