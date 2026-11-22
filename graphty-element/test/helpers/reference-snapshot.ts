/**
 * @file The reference input the adapter tests run `@graphty/algorithms` over directly: the
 * element's input, frozen as the snapshot an adapter reads, and conversions from a port's
 * index-based result to node and edge ids.
 *
 * TEST-ONLY. The adapter tests check that what an adapter publishes is what the algorithm computes
 * over the same simplified input. The adapter calls that same function, so a comparison against it
 * holds the element's plumbing (which input, which options, which ids and edges the values land on),
 * not the answer: whether the algorithm's answer is right is held by the recorded 2.x results in
 * algorithms/test/golden/, and by the element's own recorded answers where a test names one.
 */

import type { GraphSnapshot, NodeId } from "@graphty/graph-format";

import { createScopedInput, orientationOf, type ScopedInput } from "../../src/algorithms/input/ScopedInput";
import type { DataManager } from "../../src/managers/DataManager";

/**
 * The snapshot of one input.
 * @param data - The element's data manager.
 * @param mode - `"directed"` or `"undirected"`.
 * @param input - The input; the whole graph, simplified by "sum", when absent.
 * @returns The snapshot an adapter reads.
 */
export function referenceSnapshot(
    data: DataManager,
    mode: "directed" | "undirected",
    input: ScopedInput = createScopedInput(data, orientationOf(mode)),
): GraphSnapshot {
    return input.subgraph();
}

/**
 * A per-node vector keyed by node id.
 * @param s - The snapshot.
 * @param values - One value per node index.
 * @returns Value per node id.
 */
export function byId(s: GraphSnapshot, values: ArrayLike<number>): Map<NodeId, number> {
    return new Map(Array.from({ length: s.nodeCount }, (_, i) => [s.ids.idOf(i), values[i]]));
}

/**
 * The node ids of node indices.
 * @param s - The snapshot.
 * @param indices - Node indices.
 * @returns Their ids.
 */
export function idsOf(s: GraphSnapshot, indices: ArrayLike<number>): NodeId[] {
    return Array.from(indices, (i) => s.ids.idOf(i));
}

/**
 * The end node ids of edge indices.
 * @param s - The snapshot.
 * @param edges - Edge indices.
 * @returns Source and target id per edge.
 */
export function edgeEnds(s: GraphSnapshot, edges: ArrayLike<number>): { source: NodeId; target: NodeId }[] {
    const { src, dst } = s.edgeList();
    return Array.from(edges, (e) => ({ source: s.ids.idOf(src[e]), target: s.ids.idOf(dst[e]) }));
}
