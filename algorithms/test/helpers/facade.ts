/**
 * Conversions between the ports' index-based results and the id-keyed shapes the removed 2.x
 * functions returned, so a port's result can be compared with what the 2.x function recorded in
 * `test/golden/`. Test-only.
 * @module
 */

import {
    expandEdges,
    GraphBuilder,
    type GraphSnapshot,
    INVALID_INDEX,
    type NodeIdMap,
    type NumericVector,
    type U32,
} from "@graphty/graph-format";

import type { NodeId } from "./legacy-types.js";

/**
 * Resolve a legacy node argument to an index: the id itself first, then -- for a string only --
 * its spelling, so `"5"` finds numeric id 5 the way the legacy string-typed parameters
 * (flow `source` / `sink`, seed-label Maps) do today. A number never finds a string id: the
 * legacy graph's `hasNode(5)` is false for a node `"5"`.
 * @param ids - The snapshot's id map
 * @param id - The caller's node argument
 * @returns The node index, or `INVALID_INDEX` when absent; the facade throws its legacy message
 */
export function resolveNode(ids: NodeIdMap, id: NodeId): number {
    const index = ids.indexOf(id);
    if (index !== INVALID_INDEX || typeof id !== "string") {
        return index;
    }
    return ids.stringIndex().get(id) ?? INVALID_INDEX;
}

/**
 * The per-arc `weights` override a weighted port needs to reproduce legacy f64 results exactly
 * (design 14.1 rule 4). Undefined when the f32 arc weights are already exact, so the port reads
 * its own arc array.
 * @param s - The snapshot
 * @returns arcCount f64 weights, or undefined
 */
export function exactArcWeights(s: GraphSnapshot): NumericVector | undefined {
    const shadow = s.edges.byRole("weight");
    return shadow?.dtype === "f64" ? expandEdges(s, shadow.data) : undefined;
}

/**
 * Labels to the legacy `NodeId[][]` (components, communities): one group per label in label order,
 * members in index order. A node labelled `INVALID_INDEX` belongs to no group.
 * @param ids - The snapshot's id map
 * @param labels - One label per node, in `[0, count)` or `INVALID_INDEX`
 * @param count - The number of labels
 * @returns The groups
 */
export function labelsToGroups(ids: NodeIdMap, labels: U32, count: number): NodeId[][] {
    const groups: NodeId[][] = Array.from({ length: count }, () => []);
    for (let i = 0; i < labels.length; i++) {
        if (labels[i] !== INVALID_INDEX) {
            groups[labels[i]].push(ids.idOf(i));
        }
    }
    return groups;
}

/**
 * A legacy Map-of-Maps adjacency (`astar`, `edmondsKarp`, `stoerWagner`, `kargerMinCut` inputs) to
 * a snapshot, weights kept exactly through the f64 shadow. Every key is a node in key order, then
 * each target not already a key as it is first met. DIRECTED by default: one arc per inner entry.
 * With `directed` false the adjacency lists an undirected graph, each edge usually twice (`a -> b`
 * and `b -> a`): an unordered pair is one edge, and where its entries disagree the last one met
 * wins, as the legacy cut functions read such a Map. Not memoised: a Map has no mutation counter.
 * The snapshot's `weights` view is f32 like every snapshot's, so a port reads rounded weights
 * (0.1 + 0.2 comes back as 0.30000000447) unless the facade passes `{ weights: exactArcWeights(s) }`.
 * @param adjacency - source id to (target id to weight)
 * @param directed - Whether each entry is an arc (default) or the adjacency is undirected
 * @returns The frozen snapshot
 */
export function fromAdjacencyMap(
    adjacency: ReadonlyMap<string, ReadonlyMap<string, number>>,
    directed = true,
): GraphSnapshot {
    const builder = new GraphBuilder({ directed, weightDtype: "f64", duplicateEdges: directed ? "keep" : "last" });
    for (const id of adjacency.keys()) {
        builder.addNode(id);
    }
    for (const [source, row] of adjacency) {
        for (const [target, weight] of row) {
            builder.addEdge(source, target, weight);
        }
    }
    return builder.freeze({ label: "algorithms.fromAdjacencyMap" });
}
