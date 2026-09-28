/**
 * Common-neighbour link prediction over a legacy `Graph`. Every function here delegates to its
 * `indexed.*` port over an unweighted snapshot of the graph (the scores never read a weight) and
 * keeps its signature and result shape; the results equal the pre-migration implementation's
 * exactly (recorded in `test/golden/unit/indexed/link-prediction-facade.json.gz`).
 *
 * A node argument is looked up by the id itself, never by its spelling, as `graph.hasNode` does: a
 * node that is not in the graph scores 0 and has no candidates.
 * @module
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { Graph } from "../core/graph.js";
import { commonNeighborsScore as indexedCommonNeighborsScore } from "../indexed/common-neighbors.js";
import {
    commonNeighborsForPairs as indexedCommonNeighborsForPairs,
    commonNeighborsPrediction as indexedCommonNeighborsPrediction,
    evaluateCommonNeighbors as indexedEvaluateCommonNeighbors,
    getTopCandidatesForNode as indexedGetTopCandidatesForNode,
    type LinkPredictionResult,
    type NodePairs,
} from "../indexed/link-prediction.js";
import { toTopologySnapshot } from "../indexed/to-snapshot.js";
import type { NodeId } from "../types/index.js";

export interface LinkPredictionScore {
    source: NodeId;
    target: NodeId;
    score: number;
}

export interface LinkPredictionOptions {
    directed?: boolean; // Consider direction (default: false)
    includeExisting?: boolean; // Include existing edges (default: false)
    topK?: number; // Return only top K predictions
}

/**
 * Id pairs to index pairs; an id not in the graph becomes `INVALID_INDEX`, which scores 0.
 * @param s - The snapshot
 * @param pairs - The caller's id pairs
 * @returns The index pairs
 */
function toNodePairs(s: GraphSnapshot, pairs: [NodeId, NodeId][]): NodePairs {
    return {
        sources: Uint32Array.from(pairs, ([u]) => s.ids.indexOf(u)),
        targets: Uint32Array.from(pairs, ([, v]) => s.ids.indexOf(v)),
    };
}

/**
 * Ranked index pairs to the legacy score objects.
 * @param s - The snapshot
 * @param r - The port's ranked pairs
 * @returns One score object per pair, in rank order
 */
function toScores(s: GraphSnapshot, r: LinkPredictionResult): LinkPredictionScore[] {
    return Array.from(r.scores, (score, k) => ({
        source: s.ids.idOf(r.sources[k]),
        target: s.ids.idOf(r.targets[k]),
        score,
    }));
}

/**
 * Calculate common neighbors score for a pair of nodes
 * @param graph - The input graph
 * @param source - The source node ID
 * @param target - The target node ID
 * @param options - Link prediction options
 * @returns The number of common neighbors
 */
export function commonNeighborsScore(
    graph: Graph,
    source: NodeId,
    target: NodeId,
    options: LinkPredictionOptions = {},
): number {
    const s = toTopologySnapshot(graph);
    const u = s.ids.indexOf(source);
    const v = s.ids.indexOf(target);
    if (u >= s.nodeCount || v >= s.nodeCount) {
        return 0;
    }
    return indexedCommonNeighborsScore(s, u, v, { directed: options.directed });
}

/**
 * Calculate common neighbors scores for all possible node pairs
 * @param graph - The input graph
 * @param options - Link prediction options
 * @returns Array of link prediction scores sorted by score descending
 */
export function commonNeighborsPrediction(graph: Graph, options: LinkPredictionOptions = {}): LinkPredictionScore[] {
    const s = toTopologySnapshot(graph);
    return toScores(s, indexedCommonNeighborsPrediction(s, options));
}

/**
 * Calculate common neighbors scores for specific node pairs
 * @param graph - The input graph
 * @param pairs - Array of node ID pairs to calculate scores for
 * @param options - Link prediction options
 * @returns Array of link prediction scores for the specified pairs
 */
export function commonNeighborsForPairs(
    graph: Graph,
    pairs: [NodeId, NodeId][],
    options: LinkPredictionOptions = {},
): LinkPredictionScore[] {
    const s = toTopologySnapshot(graph);
    const scores = indexedCommonNeighborsForPairs(s, toNodePairs(s, pairs), { directed: options.directed });
    return pairs.map(([source, target], k) => ({ source, target, score: scores[k] }));
}

/**
 * Get top candidates for link prediction for a specific node
 * @param graph - The input graph
 * @param node - The node ID to get candidates for
 * @param options - Link prediction options with optional candidate list
 * @returns Array of top link prediction candidates sorted by score descending
 */
export function getTopCandidatesForNode(
    graph: Graph,
    node: NodeId,
    options: LinkPredictionOptions & { candidates?: NodeId[] } = {},
): LinkPredictionScore[] {
    const s = toTopologySnapshot(graph);
    const candidates = options.candidates?.map((id) => s.ids.indexOf(id));
    return toScores(s, indexedGetTopCandidatesForNode(s, s.ids.indexOf(node), { ...options, candidates }));
}

/**
 * Calculate precision and recall for link prediction evaluation
 * @param trainingGraph - The training graph without test edges
 * @param testEdges - Array of node pairs that are actual edges
 * @param nonEdges - Array of node pairs that are not edges
 * @param options - Link prediction options
 * @returns Evaluation metrics including precision, recall, F1 score, and AUC
 */
export function evaluateCommonNeighbors(
    trainingGraph: Graph,
    testEdges: [NodeId, NodeId][],
    nonEdges: [NodeId, NodeId][],
    options: LinkPredictionOptions = {},
): {
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
} {
    const s = toTopologySnapshot(trainingGraph);
    const metrics = indexedEvaluateCommonNeighbors(s, toNodePairs(s, testEdges), toNodePairs(s, nonEdges), {
        directed: options.directed,
    });
    return { ...metrics };
}
