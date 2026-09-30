import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";

import type { GraphImpl } from "../benchmark-graph";

/**
 * Freezes a generated benchmark graph into the snapshot every algorithm takes.
 * @param benchmarkGraph - The generated graph
 * @param directed - Direction of the snapshot; defaults to the generated graph's own
 * @returns The frozen snapshot, isolated vertices included
 */
export function convertToSnapshot(benchmarkGraph: GraphImpl, directed = benchmarkGraph.directed): GraphSnapshot {
    const builder = new GraphBuilder({ directed });
    builder.addNodes(benchmarkGraph.vertices);
    for (const [from, to, weight] of benchmarkGraph.edges) {
        builder.addEdge(from, to, weight ?? 1);
    }
    return builder.freeze();
}
