/**
 * @file Prim's Minimum Spanning Tree Algorithm wrapper
 *
 * This algorithm finds the minimum spanning tree of an undirected graph using Prim's
 * algorithm. It returns an edge set: every edge says whether it is in the tree, and the run
 * publishes what the tree costs in total.
 *
 * Unlike Kruskal's which processes edges globally, Prim's grows the tree
 * from a starting node, which can be optionally configured.
 */

import { primMST } from "@graphty/algorithms";
import { z } from "zod/v4";

import type { EdgeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
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
import type { OptionsSchema } from "./types/OptionSchema";
import { edgePairKey } from "./utils/graphUtils";

/**
 * Zod-based options schema for Prim algorithm
 */
const primOptionsSchema = defineOptions({
    startNode: {
        schema: z.union([z.string(), z.number()]).nullable().default(null),
        meta: {
            label: "Start Node",
            description: "Starting node for MST growth (uses first node if not set)",
        },
    },
});

/**
 * Options for Prim algorithm
 */
interface PrimOptions extends Record<string, unknown> {
    /** Optional starting node for the algorithm */
    startNode: number | string | null;
}

/**
 * Prim's algorithm for finding minimum spanning trees
 *
 * Computes the minimum spanning tree of an undirected graph by growing
 * the tree from a starting node.
 */
export class PrimAlgorithm extends DeclaredAlgorithm<PrimOptions> {
    static namespace = "graphty";
    static type = "prim";

    static zodOptionsSchema: ZodOptionsSchema = primOptionsSchema;

    static optionsSchema: OptionsSchema = {
        startNode: {
            type: "nodeId",
            default: null,
            label: "Start Node",
            description: "Starting node for MST growth (uses first node if not set)",
            required: false,
        },
    };

    /**
     * Legacy options set via configure() for backward compatibility
     */
    private legacyOptions: PrimOptions | null = null;

    /**
     * Configure the algorithm with an optional start node
     * @param options - Configuration options
     * @param options.startNode - The optional start node ID
     * @returns This algorithm instance for chaining
     * @deprecated Use constructor options instead. This method is kept for backward compatibility.
     */
    configure(options: { startNode?: number | string }): this {
        this.legacyOptions = { startNode: options.startNode ?? null };
        return this;
    }

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

        // Get startNode from legacy options, schema options, or use undefined (algorithm will pick first node)
        // Legacy configure() takes precedence for backward compatibility
        const startNode = this.legacyOptions?.startNode ?? this._schemaOptions.startNode ?? undefined;

        // Undirected: a spanning tree is a set of unordered pairs, and primMST refuses a directed input.
        const graphData = this.algorithmGraph("undirected");

        context.report({ phase: "Choosing edges", total: null });
        const tree = primMST(graphData, startNode);

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
                method: "prim",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "distance" },
                notes: [`The tree joins the graph with ${String(tree.edges.length)} edges.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(PrimAlgorithm);
