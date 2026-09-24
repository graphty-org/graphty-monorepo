/**
 * @file Kruskal's Minimum Spanning Tree Algorithm wrapper
 *
 * This algorithm finds the minimum spanning tree of an undirected graph using Kruskal's
 * algorithm. It returns an edge set: every edge says whether it is in the tree, and the run
 * publishes what the tree costs in total.
 */

import { kruskalMST } from "@graphty/algorithms";

import type { EdgeId } from "../catalog/types";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    forEachChunked,
    setFieldSpecs,
} from "./results";
import { edgePairKey } from "./utils/graphUtils";

/**
 *
 */
export class KruskalAlgorithm extends DeclaredAlgorithm {
    static namespace = "graphty";
    static type = "kruskal";

    /**
     * Find the cheapest set of edges that still joins every node.
     *
     * A spanning tree is a set of edges, so the result is shaped as one: every edge says whether
     * it is in the network, the element counts how many are, and the run publishes the one number
     * the answer is actually read for -- what the network costs in total.
     * @param context - What the element gave the run.
     * @returns The edge set, or null when there are no edges to choose from.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const graphEdges = Array.from(this.graph.getDataManager().edges.values());

        if (graphEdges.length === 0) {
            return null;
        }

        // Undirected: a spanning tree is a set of unordered pairs, and kruskalMST refuses a directed input.
        const graphData = this.algorithmGraph("undirected");

        context.report({ phase: "Choosing edges", total: null });
        const tree = kruskalMST(graphData);

        // Both directions, because the element's edge carries the direction it was declared in
        // and the tree's does not.
        const chosen = new Set<string>();
        for (const edge of tree.edges) {
            chosen.add(edgePairKey(edge.source, edge.target));
            chosen.add(edgePairKey(edge.target, edge.source));
        }

        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Marking the network", graphEdges, (edge) => {
            // The pair key looks the tree's answer up; the element's own id is what is published.
            edges.push({ id: edge.id, values: { in: chosen.has(edgePairKey(edge.srcId, edge.dstId)) } });
        });

        return {
            shape: "edge-set",
            fields: setFieldSpecs("edge", { name: "totalWeight", type: "number" }),
            edges,
            graph: { totalWeight: tree.totalWeight },
            caveats: declaredCaveats({
                method: "kruskal",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "distance" },
                notes: [`The tree joins the graph with ${String(tree.edges.length)} edges.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(KruskalAlgorithm);
