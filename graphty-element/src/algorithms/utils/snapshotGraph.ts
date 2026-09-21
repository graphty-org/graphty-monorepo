/**
 * @file Builds the `@graphty/algorithms` Graph an algorithm runs on, out of the element's graph
 * snapshot instead of out of the render object graph.
 */

import { Graph as AlgorithmGraph } from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";

import type { DataManager } from "../../managers/DataManager";

/**
 * How an algorithm wants the reader's graph presented to `@graphty/algorithms`.
 *
 * - `"directed"` -- one arc per edge, in the orientation the record declared. The algorithm reads
 *   `inNeighbors` and `outNeighbors` as different sets, which is the point: in-degree, PageRank and
 *   strongly connected components are all meaningless without it.
 * - `"undirected"` -- one edge per unordered pair, and `Graph.isDirected` is false. Reciprocal
 *   records (`A -> B` AND `B -> A`) become ONE edge, so the algorithm sees the edge count the
 *   reader sees. Algorithms that ask whether their input is directed -- betweenness divides its
 *   raw scores by two for an undirected graph, Floyd-Warshall seeds both directions of every edge
 *   -- then take the branch the reader's data actually calls for.
 */
export type AlgorithmGraphMode = "directed" | "undirected";

/**
 * Build the algorithm-package Graph for one run.
 *
 * The snapshot -- not the `Node` and `Edge` render objects -- is the source. An edge whose
 * endpoints have no mesh yet is in the snapshot already, ids come from the snapshot's id map, and
 * weights come from its weight column, so an algorithm sees the graph the reader loaded rather
 * than the part of it the scene has caught up with.
 * @param data - the element's data manager, which owns the one snapshot
 * @param mode - the shape this algorithm needs; see {@link AlgorithmGraphMode}
 * @returns a freshly built Graph for `@graphty/algorithms`
 */
export function toAlgorithmGraph(data: DataManager, mode: AlgorithmGraphMode): AlgorithmGraph {
    const declared = data.getSnapshot();
    // The undirected view is derived once per snapshot and cached by the store, so two algorithms
    // run back to back over the same data pay for it once. It is also what collapses a reciprocal
    // pair into a single edge; building an undirected Graph straight from the directed snapshot
    // would count that pair twice, which is the doubling this conversion exists to end.
    const snapshot = mode === "directed" ? declared : data.undirected(declared).snapshot;
    return build(snapshot, mode);
}

/**
 * Copy one snapshot into an algorithm-package Graph.
 * @param snapshot - the snapshot to read, already in the orientation `mode` asks for
 * @param mode - the shape this algorithm needs
 * @returns the built Graph
 */
function build(snapshot: GraphSnapshot, mode: AlgorithmGraphMode): AlgorithmGraph {
    const graph = new AlgorithmGraph({
        directed: mode !== "undirected",
        // A second `addEdge` for a pair that already has one would THROW when parallel edges are
        // refused. The snapshot does not hand out duplicate logical edges, so this permission is
        // never used in practice -- it is here so that a multigraph loaded one day fails as a
        // count, not as an exception thrown in the middle of an algorithm run.
        allowParallelEdges: true,
    });

    const { ids } = snapshot;
    for (let index = 0; index < snapshot.nodeCount; index++) {
        graph.addNode(ids.idOf(index));
    }

    // One pass over the logical edges: `src` and `dst` carry the declared orientation and `weights`
    // is already gathered per edge, so no arc bookkeeping is needed here.
    const { src, dst, weights } = snapshot.edgeList();
    for (let edge = 0; edge < snapshot.edgeCount; edge++) {
        const srcId = ids.idOf(src[edge]);
        const dstId = ids.idOf(dst[edge]);
        // null weights means "every weight is 1", which is how graph-format stores an unweighted
        // graph; it does not mean the weight is unknown.
        const weight = weights === null ? 1 : weights[edge];

        graph.addEdge(srcId, dstId, weight);
    }

    return graph;
}
