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
 * The graph an algorithm reads, as `Algorithm.algorithmGraph` hands it over.
 *
 * PUBLISHED SO A PLUGIN CAN NAME IT. A third party's algorithm gets its input from
 * `this.algorithmGraph(mode)`, and the moment it wants to pass that input to a helper of its own
 * it needs a name for the type. Without this the only names available were an import of
 * `@graphty/algorithms` -- a dependency the plugin would then have to take, and keep in step with
 * the element's version -- or a hand-written structural interface, which is re-declaring a type
 * the element already has. It is an alias rather than a narrowed interface on purpose: a subset
 * written here would drift from what the element actually passes, and the first method a plugin
 * needed that the subset omitted would be a bug report.
 */
export type AlgorithmGraphView = AlgorithmGraph;

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
    const oriented = mode === "directed" ? declared : data.undirected(declared).snapshot;
    // THE ELEMENT SIMPLIFIES BEFORE IT CONVERTS, because `@graphty/algorithms` cannot represent a
    // multigraph: its `Graph` holds one edge per pair, so a second parallel edge replaces the first
    // and its weight is lost.
    // Summing rather than taking the first, because a repeated edge between two nodes is MORE
    // connection, not the same connection -- and it is the same reading a weighted layout gives
    // the same number.
    const snapshot = oriented.flags.multigraph ? oriented.simplified({ weights: "sum" }).snapshot : oriented;
    return build(snapshot, mode);
}

/**
 * How many parallel edges an algorithm run over this graph merges before it can run.
 *
 * Published so a run can say so in its caveats: the numbers an algorithm produces over a
 * multigraph are the numbers for the SIMPLIFIED graph, and a reader looking at a result card has
 * no other way to learn that. It counts repeats in the graph AS DECLARED, which is the same
 * number `statistics().repeatedEdgeCount` reports, so the caveat and the graph summary agree.
 * @param data - the element's data manager
 * @returns how many edges the simplification removes; zero for a graph with no parallel edges
 */
export function mergedParallelEdges(data: DataManager): number {
    const declared = data.getSnapshot();
    if (!declared.flags.multigraph) {
        return 0;
    }

    return declared.edgeCount - declared.simplified({ weights: "sum" }).snapshot.edgeCount;
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
