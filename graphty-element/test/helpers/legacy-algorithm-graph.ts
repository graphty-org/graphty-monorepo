/**
 * @file The reference graph the adapter tests compare the element against: the element's input,
 * copied into an `@graphty/algorithms` object graph so the legacy implementation can run on it.
 *
 * TEST-ONLY. The element no longer builds an object graph for any run; its algorithms and its
 * plugins read graph-format snapshots. The adapter tests still check that a port gives the
 * legacy implementation's numbers over the same simplified input, and this is that input.
 */

import { Graph as AlgorithmGraph } from "@graphty/algorithms";

import { createScopedInput, orientationOf, type ScopedInput } from "../../src/algorithms/input/ScopedInput";
import type { DataManager } from "../../src/managers/DataManager";

/**
 * Build the object graph of one input.
 * @param data - The element's data manager.
 * @param mode - `"directed"` or `"undirected"`.
 * @param input - The input to copy; the whole graph, simplified by "sum", when absent.
 * @returns The object graph.
 */
export function toAlgorithmGraph(
    data: DataManager,
    mode: "directed" | "undirected",
    input: ScopedInput = createScopedInput(data, orientationOf(mode)),
): AlgorithmGraph {
    const snapshot = input.subgraph();
    const graph = new AlgorithmGraph({ directed: mode !== "undirected" });
    const { ids } = snapshot;
    for (let index = 0; index < snapshot.nodeCount; index++) {
        graph.addNode(ids.idOf(index));
    }

    const { src, dst, weights } = snapshot.edgeList();
    for (let edge = 0; edge < snapshot.edgeCount; edge++) {
        graph.addEdge(ids.idOf(src[edge]), ids.idOf(dst[edge]), weights === null ? 1 : weights[edge]);
    }

    return graph;
}
