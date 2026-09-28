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

import { indexed } from "@graphty/algorithms";
import { INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod/v4";

import type { EdgeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import { scopeEdges, type ScopeInputDeclaration } from "./input/ScopedInput";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    forEachChunked,
    setFieldSpecs,
} from "./results";
import type { OptionsSchema } from "./types/OptionSchema";

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
    /** Spans the run's scope: the edge list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

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
        // The declared edges of the run's input: its scope's, or every edge of the graph.
        const graphEdges = scopeEdges(this.input("undirected"));

        if (graphEdges.length === 0) {
            return null;
        }

        // Get startNode from legacy options, schema options, or use undefined (algorithm will pick first node)
        // Legacy configure() takes precedence for backward compatibility
        const startNode = this.legacyOptions?.startNode ?? this._schemaOptions.startNode ?? undefined;

        /* Undirected: a spanning tree is a set of unordered pairs, chosen over the undirected view,
           whose edge space merged every reciprocal pair and parallel group into one edge. A scope
           often cuts a component, so the tree is a forest: one tree per piece, the start node's
           grown from it and every other piece's from its first node. No accelerator grows a Prim
           tree, so this is the CPU port's decision. */
        const { snapshot, edgeRemap, run } = this.accelerated("primMST", "undirected");
        const start = startNode === undefined ? undefined : this.nodeIndex(snapshot, "startNode", startNode);

        context.report({ phase: "Choosing edges", total: null });
        const { value: tree, precision } = await run((_dispatch, s) =>
            Promise.resolve(indexed.primMST(s, { start, forest: true })),
        );

        // Read the remap from the edge the reader declared to the edge the tree chose, which is
        // what flags BOTH halves of a merged reciprocal pair and every edge of a parallel group.
        const chosen = new Set<number>(tree.edges);

        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Marking the network", graphEdges, (edge) => {
            const merged = edgeRemap === null ? edge.row : (edgeRemap[edge.row] ?? INVALID_INDEX);
            edges.push({ id: edge.id, values: { in: chosen.has(merged) } });
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
                precision,
                notes: [`The tree joins the graph with ${String(tree.edges.length)} edges.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(PrimAlgorithm);
