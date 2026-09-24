/**
 * @file Kruskal's Minimum Spanning Tree Algorithm wrapper
 *
 * This algorithm finds the minimum spanning tree of an undirected graph using Kruskal's
 * algorithm. It returns an edge set: every edge says whether it is in the tree, and the run
 * publishes what the tree costs in total.
 */

import { INVALID_INDEX } from "@graphty/graph-format";

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

        // Undirected: a spanning tree is a set of unordered pairs, and the tree is chosen over the
        // undirected view, whose edge space merged every reciprocal pair into one edge.
        const { edgeRemap, run } = this.accelerated("minimumSpanningTree", "undirected");

        context.report({ phase: "Choosing edges", total: null });
        const { value, precision } = await run((dispatch, s) => dispatch.minimumSpanningTree(s));

        // The chosen edges are indices into the UNDIRECTED view. Reading the remap in the other
        // direction -- from the edge the reader declared to the edge the tree chose -- is what
        // flags BOTH halves of a reciprocal pair that merged into one.
        const chosen = new Set<number>(value.edges);

        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Marking the network", graphEdges, (edge) => {
            const merged = edgeRemap === null ? edge.index : (edgeRemap[edge.index] ?? INVALID_INDEX);
            edges.push({ id: edge.id, values: { in: chosen.has(merged) } });
        });

        return {
            shape: "edge-set",
            fields: setFieldSpecs("edge", { name: "totalWeight", type: "number" }),
            edges,
            graph: { totalWeight: value.totalWeight },
            caveats: declaredCaveats({
                method: "kruskal",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "distance" },
                precision,
                notes: [`The tree joins the graph with ${String(value.edges.length)} edges.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(KruskalAlgorithm);
