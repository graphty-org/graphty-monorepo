import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import type { Graph } from "../../core/graph.js";
import {
    findAllIsomorphisms as indexedFindAllIsomorphisms,
    isGraphIsomorphic as indexedIsGraphIsomorphic,
    type IsomorphismOptions as IndexedIsomorphismOptions,
} from "../../indexed/isomorphism.js";
import { toTopologySnapshot } from "../../indexed/to-snapshot.js";
import type { NodeId } from "../../types/index.js";

/**
 * Graph Isomorphism (VF2)
 *
 * Determines if two graphs are isomorphic (structurally identical).
 * Two graphs are isomorphic if there exists a bijection between their vertices
 * that preserves adjacency.
 *
 * `isGraphIsomorphic` and `findAllIsomorphisms` delegate to their `indexed.*` ports. An `edgeMatch`
 * callback is offered every pair of corresponding edges once -- on a directed graph an arc into the
 * newly mapped node too, and every self-loop -- each as `[source, target]` in the edge's own
 * orientation, so a weight-comparing callback can reject mappings earlier releases accepted.
 *
 * Time complexity: O(n! * n) worst case, but typically much faster
 * Space complexity: O(n)
 */

export interface IsomorphismResult {
    isIsomorphic: boolean;
    mapping?: Map<NodeId, NodeId>; // Maps nodes from graph1 to graph2
}

export interface IsomorphismOptions {
    nodeMatch?: (node1: NodeId, node2: NodeId, g1: Graph, g2: Graph) => boolean;
    edgeMatch?: (edge1: [NodeId, NodeId], edge2: [NodeId, NodeId], g1: Graph, g2: Graph) => boolean;
    /**
     * Has no effect: `isGraphIsomorphic` returns the first mapping it finds and
     * `findAllIsomorphisms` returns them all. Before 3.0 setting it made `isGraphIsomorphic`
     * answer false for every pair of graphs.
     */
    findAllMappings?: boolean;
}

/**
 * The legacy predicates over ids and graphs to the port's over indices and snapshots.
 * @param g1 - The first graph
 * @param g2 - The second graph
 * @param options - The legacy options
 * @returns The port's options
 */
function portOptions(g1: Graph, g2: Graph, options: IsomorphismOptions): IndexedIsomorphismOptions {
    const { nodeMatch, edgeMatch } = options;
    const ends = (s: GraphSnapshot, e: number): [NodeId, NodeId] => [
        s.ids.idOf(s.edgeSource(e)),
        s.ids.idOf(s.edgeTarget(e)),
    ];
    return {
        nodeMatch: nodeMatch && ((i1, i2, s1, s2) => nodeMatch(s1.ids.idOf(i1), s2.ids.idOf(i2), g1, g2)),
        edgeMatch: edgeMatch && ((e1, e2, s1, s2) => edgeMatch(ends(s1, e1), ends(s2, e2), g1, g2)),
    };
}

/**
 * A port mapping to the legacy Map, graph1's nodes in node order.
 * @param s1 - The first snapshot
 * @param s2 - The second snapshot
 * @param mapping - The image in `s2` of every node of `s1`
 * @returns The mapping by id
 */
function toMap(s1: GraphSnapshot, s2: GraphSnapshot, mapping: U32): Map<NodeId, NodeId> {
    const out = new Map<NodeId, NodeId>();
    for (let i = 0; i < mapping.length; i++) {
        if (mapping[i] !== INVALID_INDEX) {
            out.set(s1.ids.idOf(i), s2.ids.idOf(mapping[i]));
        }
    }
    return out;
}

/**
 * Check if two graphs are isomorphic using VF2 algorithm
 * @param graph1 - The first graph to compare
 * @param graph2 - The second graph to compare
 * @param options - Optional configuration for node and edge matching predicates
 * @returns An object indicating if the graphs are isomorphic and an optional mapping between nodes
 */
export function isGraphIsomorphic(graph1: Graph, graph2: Graph, options: IsomorphismOptions = {}): IsomorphismResult {
    const s1 = toTopologySnapshot(graph1);
    const s2 = toTopologySnapshot(graph2);
    const { mapping } = indexedIsGraphIsomorphic(s1, s2, portOptions(graph1, graph2, options));
    return mapping === null ? { isIsomorphic: false } : { isIsomorphic: true, mapping: toMap(s1, s2, mapping) };
}

/**
 * Find all isomorphisms between two graphs
 * @param graph1 - The first graph to compare
 * @param graph2 - The second graph to compare
 * @param options - Optional configuration for node and edge matching predicates
 * @returns An array of all possible node mappings between the graphs
 */
export function findAllIsomorphisms(
    graph1: Graph,
    graph2: Graph,
    options: IsomorphismOptions = {},
): Map<NodeId, NodeId>[] {
    const s1 = toTopologySnapshot(graph1);
    const s2 = toTopologySnapshot(graph2);
    return indexedFindAllIsomorphisms(s1, s2, portOptions(graph1, graph2, options)).map((m) => toMap(s1, s2, m));
}
