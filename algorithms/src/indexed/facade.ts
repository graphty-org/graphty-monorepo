/**
 * The conversions a legacy function uses to delegate to its `indexed.*` port and keep its own
 * signature and result shape (graph-format design 14.1 rule 1 and the 14.2 result table). Internal:
 * nothing here is exported from the package, and nothing here takes a legacy `Graph` -- a facade
 * gets its snapshot from `toSnapshot`, or from {@link fromAdjacencyMap} for a Map-of-Maps input.
 * @module
 */

import {
    expandEdges,
    type F64,
    GraphBuilder,
    type GraphSnapshot,
    INVALID_INDEX,
    maskToIndices,
    type NodeIdMap,
    type NodeMask,
    type NumericVector,
    type U32,
} from "@graphty/graph-format";

import type { Edge, NodeId, ShortestPathResult } from "../types/index.js";
import type { SsspResult } from "./dijkstra.js";

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
 * The snapshot's per-edge weights at full f64 precision: the role-`weight` f64 shadow column
 * `toSnapshot` keeps when a legacy weight is not f32-exact, else the f32 per-edge weights (exact by
 * definition then), else null for an unweighted snapshot.
 * @param s - The snapshot
 * @returns One weight per logical edge, or null
 */
function exactEdgeWeights(s: GraphSnapshot): NumericVector | null {
    const shadow = s.edges.byRole("weight");
    if (shadow?.dtype === "f64") {
        return shadow.data;
    }
    return s.edgeList().weights;
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
 * A traversal's visited nodes to the legacy tree (or predecessor) Map: node id to parent id, null for
 * the start, in visit order -- the order a legacy walk set its entries in.
 * @param ids - The snapshot's id map
 * @param order - The visited node indices, in visit order
 * @param parent - The parent of every node index, INVALID_INDEX for the start
 * @returns The tree
 */
export function orderToTree(ids: NodeIdMap, order: U32, parent: U32): Map<NodeId, NodeId | null> {
    const tree = new Map<NodeId, NodeId | null>();
    for (const i of order) {
        tree.set(ids.idOf(i), parent[i] === INVALID_INDEX ? null : ids.idOf(parent[i]));
    }
    return tree;
}

/**
 * Per-node scores to the legacy `Record<string, number>` keyed by `String(id)`, in index order. A
 * plain object, as the legacy functions return: `ids.toRecord` gives a null-prototype one, which a
 * caller's `result.hasOwnProperty(id)` cannot call.
 * @param ids - The snapshot's id map
 * @param scores - One score per node index
 * @returns The keyed scores
 */
export function scoresToRecord(ids: NodeIdMap, scores: ArrayLike<number>): Record<string, number> {
    const out: Record<string, number> = {};
    for (let i = 0; i < ids.size; i++) {
        out[String(ids.idOf(i))] = scores[i];
    }
    return out;
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
 * A node mask to the legacy `Set<string>` (`getKCore`, min-cut partitions), keyed by `String(id)`.
 * @param ids - The snapshot's id map
 * @param mask - A node mask over `ids.size` nodes
 * @returns The included nodes' ids as strings
 */
export function maskToStringSet(ids: NodeIdMap, mask: NodeMask): Set<string> {
    const out = new Set<string>();
    for (const i of maskToIndices(mask, ids.size)) {
        out.add(String(ids.idOf(i)));
    }
    return out;
}

/**
 * An `SsspResult` to the legacy `Map<NodeId, ShortestPathResult>`: an entry per reached node in
 * index order. Each entry gets its own copy of the predecessor Map over every node (null for the
 * source and the unreached), as legacy `dijkstra` does, so a caller that mutates one entry's Map
 * does not change the others. That copy is O(n) per reached node, the legacy cost.
 *
 * It matches only a legacy `dijkstra` call WITHOUT the `target` option. With `target`, legacy stops
 * once the target is settled and reports tentative, not final, distances for the nodes it had not
 * settled; the port has no early stop, so a facade must not route a `target` call through here.
 * @param s - The snapshot the search ran on
 * @param result - The port's result
 * @returns The legacy result
 */
export function ssspToShortestPaths(s: GraphSnapshot, result: SsspResult): Map<NodeId, ShortestPathResult> {
    const { ids } = s;
    const predecessor = new Map<NodeId, NodeId | null>();
    for (let v = 0; v < s.nodeCount; v++) {
        const arc = result.predArc[v];
        predecessor.set(ids.idOf(v), arc === INVALID_INDEX ? null : ids.idOf(s.arcSource(arc)));
    }
    const out = new Map<NodeId, ShortestPathResult>();
    for (let v = 0; v < s.nodeCount; v++) {
        const distance = result.dist[v];
        if (distance < Infinity) {
            const path = Array.from(result.pathTo(v), (i) => ids.idOf(i));
            out.set(ids.idOf(v), { distance, path, predecessor: new Map(predecessor) });
        }
    }
    return out;
}

/**
 * Logical edge indices to legacy `Edge` objects, in the given order, each in the orientation the
 * snapshot stores (the declared one) with its exact f64 weight (1 on an unweighted snapshot). That
 * is the orientation legacy `kruskalMST` reports. Legacy `primMST` reports tree edges in traversal
 * orientation instead, so a Prim facade must orient its edges itself.
 * @param s - The snapshot
 * @param edges - Logical edge indices
 * @returns `{ source, target, weight }` per edge
 */
export function edgesToLegacy(s: GraphSnapshot, edges: U32): Edge[] {
    const { src, dst } = s.edgeList();
    const weights = exactEdgeWeights(s);
    return Array.from(edges, (e) => ({
        source: s.ids.idOf(src[e]),
        target: s.ids.idOf(dst[e]),
        weight: weights === null ? 1 : weights[e],
    }));
}

/**
 * Per-edge scores to the legacy `Map<string, number>` keyed `"source-target"` (edge betweenness):
 * every edge in declared orientation and edge order, then -- on an undirected snapshot -- every
 * edge again reversed, with the same score, in edge order. Legacy `edgeBetweennessCentrality`
 * returns both orientations of an undirected edge with equal values; it adds the reversed keys in
 * the order its searches first cross them, which this converter does not reproduce.
 * @param s - The snapshot
 * @param scores - One score per logical edge
 * @returns The keyed scores
 */
export function edgeScoresToPairMap(s: GraphSnapshot, scores: F64): Map<string, number> {
    const { src, dst } = s.edgeList();
    const key = (from: number, to: number): string => `${String(s.ids.idOf(from))}-${String(s.ids.idOf(to))}`;
    const out = new Map<string, number>();
    for (let e = 0; e < s.edgeCount; e++) {
        out.set(key(src[e], dst[e]), scores[e]);
    }
    if (!s.directed) {
        for (let e = 0; e < s.edgeCount; e++) {
            out.set(key(dst[e], src[e]), scores[e]);
        }
    }
    return out;
}

/**
 * A legacy Map-of-Maps adjacency (`astar`, `edmondsKarp`, `stoerWagner`, `kargerMinCut` inputs) to
 * a DIRECTED snapshot: one arc per inner entry, weights kept exactly through the f64 shadow. Every
 * key is a node in key order, then each target not already a key as it is first met. Not memoised:
 * a Map has no mutation counter. The snapshot's `weights` view is f32 like every snapshot's, so a
 * port reads rounded weights (0.1 + 0.2 comes back as 0.30000000447) unless the facade passes
 * `{ weights: exactArcWeights(s) }`.
 * @param adjacency - source id to (target id to weight)
 * @returns The frozen snapshot
 */
export function fromAdjacencyMap(adjacency: ReadonlyMap<string, ReadonlyMap<string, number>>): GraphSnapshot {
    const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
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
