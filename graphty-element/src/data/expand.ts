/**
 * @file Expanding a node: the neighbourhood the consumer's `fetchEdges` and `fetchNodes` hand back
 * for it, as the one `data.expand` command that adds it. A double-click on a node and the
 * assistant's `edit_data expand` both build the command here, so they read the same endpoint
 * columns and add the same records; each dispatches it where its own change goes.
 */

import type { FetchEdgesFn, FetchNodesFn } from "../config";
import type { Graph } from "../Graph";
import type { Node as GraphNode, NodeIdType } from "../Node";
import type { SessionCommand } from "../session/planning";
import { readEndpoint, resolveEndpoints } from "./endpoints";

/** The fetchers a graph's layout behaviour may supply. */
interface Fetchers {
    readonly fetchNodes?: FetchNodesFn;
    readonly fetchEdges?: FetchEdgesFn;
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
    const { fetchNodes, fetchEdges } = graph;
    if (fetchNodes === undefined || fetchEdges === undefined) {
        return undefined;
    }

    const edges = Array.from(fetchEdges(node, graph));
    const endpoints = resolveEndpoints(edges, { source: null, target: null });
    const nodeIds = new Set<NodeIdType>();
    for (const edge of edges) {
        nodeIds.add(readEndpoint(edge, endpoints.source) as NodeIdType);
        nodeIds.add(readEndpoint(edge, endpoints.target) as NodeIdType);
    }

    nodeIds.delete(node.id);
    // The records ride in the command, so a redo puts them back without asking the consumer again.
    return {
        op: "data.expand",
        seed: node.id,
        nodes: [...fetchNodes(nodeIds, graph)],
        edges,
        source: endpoints.source,
        target: endpoints.target,
    };
}
