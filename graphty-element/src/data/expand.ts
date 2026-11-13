/**
 * @file Expanding a node: the neighbourhood the consumer's `fetchEdges` and `fetchNodes` hand back
 * for it, as the one `data.expand` command that adds it. A double-click on a node and the
 * assistant's `edit_data expand` both build the command here, so they read the same endpoint
 * columns and add the same records; each dispatches it where its own change goes.
 */

import type { FetchEdgesFn, FetchNeighborEdgesFn, FetchNodesFn } from "../config";
import type { Graph } from "../Graph";
import type { Node as GraphNode, NodeIdType } from "../Node";
import type { SessionCommand } from "../session/planning";
import { readEndpoint, resolveEndpoints } from "./endpoints";

/** The fetchers a graph's layout behaviour may supply. */
interface Fetchers {
    readonly fetchNodes?: FetchNodesFn;
    readonly fetchEdges?: FetchEdgesFn;
    readonly fetchNeighborEdges?: FetchNeighborEdgesFn;
}

/** The `data.expand` command for one node. */
export type ExpandCommand = Extract<SessionCommand, { readonly op: "data.expand" }>;

/**
 * Whether a graph can expand nodes: its layout behaviour supplies both fetchers.
 * @param graph - The graph.
 * @returns True when it can.
 */
export function canExpand(graph: Fetchers): boolean {
    return typeof graph.fetchNodes === "function" && typeof graph.fetchEdges === "function";
}

/**
 * Fetch a node's neighbourhood and build the command that adds it. Which keys name the edges'
 * endpoints is decided once, by the resolver the data manager uses, and handed to the command, so
 * both halves of the expansion read the same columns: a `fetchEdges` returning `{source, target}`,
 * `{src, dst}` or `{from, to}` all work.
 * @param graph - The graph, whose fetchers are called with it.
 * @param node - The node to expand.
 * @returns The command, or undefined when the graph supplies no fetchers.
 */
export function expansionOf(graph: Graph & Fetchers, node: GraphNode): ExpandCommand | undefined {
    const { fetchNodes, fetchEdges, fetchNeighborEdges } = graph;
    if (fetchNodes === undefined || fetchEdges === undefined) {
        return undefined;
    }

    const own = Array.from(fetchEdges(node, graph));
    const ownEnds = resolveEndpoints(own, { source: null, target: null });
    const nodeIds = new Set<NodeIdType>();
    for (const edge of own) {
        nodeIds.add(readEndpoint(edge, ownEnds.source) as NodeIdType);
        nodeIds.add(readEndpoint(edge, ownEnds.target) as NodeIdType);
    }

    nodeIds.delete(node.id);
    const nodes = [...fetchNodes(nodeIds, graph)];
    const among = fetchNeighborEdges === undefined || nodeIds.size === 0 ? [] : neighborEdges(graph, nodeIds, node);
    // One spelling for both halves, so the command reads every edge with the same columns.
    const edges = [...own, ...among];
    const endpoints = among.length === 0 ? ownEnds : resolveEndpoints(edges, { source: null, target: null });
    // The records ride in the command, so a redo puts them back without asking the consumer again.
    return {
        op: "data.expand",
        seed: node.id,
        nodes,
        edges,
        source: endpoints.source,
        target: endpoints.target,
    };
}

/**
 * The edges `fetchNeighborEdges` hands back for the fetched nodes, keeping only those whose ends
 * are both in the graph or just fetched: an edge to a node nothing brought would add that node
 * with no record.
 * @param graph - The graph, whose `fetchNeighborEdges` is set.
 * @param nodeIds - The ids the expansion fetched.
 * @param seed - The node being expanded.
 * @returns The edges to add with the expansion.
 */
function neighborEdges(graph: Graph & Fetchers, nodeIds: Set<NodeIdType>, seed: GraphNode): Record<string, unknown>[] {
    const fetched = Array.from(graph.fetchNeighborEdges?.(new Set(nodeIds), graph) ?? []);
    if (fetched.length === 0) {
        return [];
    }

    const ends = resolveEndpoints(fetched, { source: null, target: null });
    const known = (id: unknown): boolean =>
        id === seed.id || nodeIds.has(id as NodeIdType) || graph.getNode(id as NodeIdType) !== undefined;
    return fetched.filter((edge) => known(readEndpoint(edge, ends.source)) && known(readEndpoint(edge, ends.target)));
}
