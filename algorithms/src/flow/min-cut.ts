/**
 * Minimum Cut Algorithms
 *
 * Various algorithms for finding minimum cuts in graphs
 *
 * `minSTCut`, `stoerWagner` and `kargerMinCut` delegate to `indexed.minSTCut`,
 * `indexed.stoerWagner` and `indexed.kargerMinCut`. `minSTCut` reports its cut edges on numeric
 * ids too; `stoerWagner` adds the weights of two opposite directed edges; `kargerMinCut` is seeded,
 * so one graph gives one result on every run.
 */

import { type GraphSnapshot, INVALID_INDEX, type NodeMask, type U32 } from "@graphty/graph-format";

import type { Graph } from "../core/graph.js";
import {
    cutEdgesToLegacy,
    exactArcWeights,
    fromAdjacencyMap,
    maskToStringSet,
    resolveNode,
} from "../indexed/facade.js";
import { edgeCapacities, minSTCut as indexedMinSTCut } from "../indexed/flow.js";
import { kargerMinCut as indexedKargerMinCut, stoerWagner as indexedStoerWagner } from "../indexed/min-cut.js";
import { toSnapshot } from "../indexed/to-snapshot.js";

export interface MinCutResult {
    cutValue: number;
    partition1: Set<string>;
    partition2: Set<string>;
    cutEdges: { from: string; to: string; weight: number }[];
}

/**
 * A port's cut in the legacy shape: `side` is `partition1`, every other node `partition2`, both in
 * node order, and the cut edges run from `partition1` to `partition2`.
 * @param s - The snapshot the port ran on
 * @param cut - The port's cut value, side and cut edges
 * @param cut.cutValue - The weight of the cut
 * @param cut.side - The nodes of `partition1`
 * @param cut.cutEdges - The logical edges crossing the cut
 * @returns The legacy result
 */
function toLegacy(s: GraphSnapshot, cut: { cutValue: number; side: NodeMask; cutEdges: U32 }): MinCutResult {
    const partition1 = maskToStringSet(s.ids, cut.side);
    const partition2 = new Set<string>();
    for (let i = 0; i < s.nodeCount; i++) {
        const id = String(s.ids.idOf(i));
        if (!partition1.has(id)) {
            partition2.add(id);
        }
    }
    const capacity = edgeCapacities(s, exactArcWeights(s));
    return {
        cutValue: cut.cutValue,
        partition1,
        partition2,
        cutEdges: cutEdgesToLegacy(s, cut.side, cut.cutEdges, capacity),
    };
}

/**
 * The snapshot of a legacy Graph, or of a Map-of-Maps read as an undirected graph (a pair listed
 * both ways is one edge).
 * @param graph - The input
 * @returns Its snapshot
 */
function snapshotOf(graph: Graph | Map<string, Map<string, number>>): GraphSnapshot {
    return graph instanceof Map ? fromAdjacencyMap(graph, false) : toSnapshot(graph);
}

/**
 * Find minimum s-t cut using max flow
 * The minimum cut value equals the maximum flow value (max-flow min-cut theorem)
 * @param graph - Weighted graph
 * @param source - Source node
 * @param sink - Sink node
 * @returns Minimum cut information
 * @throws RangeError when `source` and `sink` are the same node
 *
 * Time Complexity: Same as max flow algorithm used
 */
export function minSTCut(graph: Graph, source: string, sink: string): MinCutResult {
    const s = toSnapshot(graph);
    const from = resolveNode(s.ids, source);
    const to = resolveNode(s.ids, sink);
    if (from === INVALID_INDEX || to === INVALID_INDEX) {
        return { cutValue: 0, partition1: new Set(), partition2: new Set(), cutEdges: [] };
    }
    const r = indexedMinSTCut(s, from, to, { weights: exactArcWeights(s) });
    return toLegacy(s, r);
}

/**
 * Stoer-Wagner algorithm for finding global minimum cut
 * Finds the minimum cut that separates the graph into two parts
 * @param graph - Undirected weighted graph - accepts Graph class or Map representation; a directed
 *   one is read as undirected, the weights of two opposite edges adding up
 * @returns Global minimum cut
 *
 * Time Complexity: O(V^3) or O(VE + V^2 log V) with heap
 */
export function stoerWagner(graph: Graph | Map<string, Map<string, number>>): MinCutResult {
    const s = snapshotOf(graph);
    return toLegacy(s, indexedStoerWagner(s, { weights: exactArcWeights(s) }));
}

/**
 * Karger's randomized min-cut algorithm
 * Finds a min cut with high probability; the edge orders are seeded, so one graph gives one result
 * @param graph - Undirected graph - accepts Graph class or Map representation
 * @param iterations - Number of iterations (higher = better accuracy); a fraction is rounded up
 * @returns Minimum cut found; with fewer than one iteration, an infinite cut and no partitions
 *
 * Time Complexity: O(m alpha(n) * iterations)
 */
export function kargerMinCut(graph: Graph | Map<string, Map<string, number>>, iterations = 100): MinCutResult {
    const trials = Math.ceil(iterations);
    if (!(trials >= 1)) {
        // No trial ran, as in 2.x.
        return { cutValue: Infinity, partition1: new Set(), partition2: new Set(), cutEdges: [] };
    }
    const s = snapshotOf(graph);
    const cut = indexedKargerMinCut(s, { iterations: trials, weights: exactArcWeights(s) });
    if (s.nodeCount < 2) {
        // No cut to make: neither side holds a node.
        return { cutValue: cut.cutValue, partition1: new Set(), partition2: new Set(), cutEdges: [] };
    }
    return toLegacy(s, cut);
}
