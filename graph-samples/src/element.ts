/**
 * Records for graphty-element's `nodeData` / `edgeData` properties.
 */

import { type SampleGraph } from "./types.js";

/** The node and edge records graphty-element loads. */
export interface ElementData {
    /** One record per node: `id` plus one field per node column. */
    readonly nodes: Record<string, unknown>[];
    /** One record per edge: `source`, `target` and, when weighted, `weight`. */
    readonly edges: Record<string, unknown>[];
}

/**
 * Turn a graph into the plain records `<graphty-element>` takes as `nodeData` and `edgeData`.
 * A node's id is its external id when the graph has them, else its index. Builds one object per
 * node and edge, so it is meant for graphs a browser draws, not for millions of edges.
 * @param graph - a generator's or dataset's graph
 * @returns the node and edge records
 */
export function toElementData(graph: SampleGraph): ElementData {
    const { ids, src, dst, weights } = graph;
    const columns = Object.entries(graph.nodeColumns ?? {}).map(
        ([name, column]) => [name, ArrayBuffer.isView(column) ? column : column.data] as const,
    );
    const idOf = (i: number): string | number => (ids === undefined ? i : ids[i]);
    const nodes = Array.from({ length: graph.nodeCount }, (_, i) => {
        const record: Record<string, unknown> = { id: idOf(i) };
        for (const [name, data] of columns) {
            record[name] = data[i];
        }
        return record;
    });
    const edges = Array.from(src, (u, e) =>
        weights === undefined
            ? { source: idOf(u), target: idOf(dst[e]) }
            : { source: idOf(u), target: idOf(dst[e]), weight: weights[e] },
    );
    return { nodes, edges };
}
