/**
 * @file Prim's Minimum Spanning Tree Algorithm wrapper
 *
 * This algorithm finds the minimum spanning tree of an undirected graph
 * using Prim's algorithm. It marks edges that are part of the MST
 * and stores graph-level results (total weight, edge count).
 *
 * Unlike Kruskal's which processes edges globally, Prim's grows the tree
 * from a starting node, which can be optionally configured.
 */

import { primMST } from "@graphty/algorithms";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema as ZodOptionsSchema, type SuggestedStylesConfig } from "../config";
import { Algorithm } from "./Algorithm";
import type { OptionsSchema } from "./types/OptionSchema";
import { toAlgorithmGraph } from "./utils/graphConverter";

/**
 * Zod-based options schema for Prim algorithm
 */
export const primOptionsSchema = defineOptions({
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
export class PrimAlgorithm extends Algorithm<PrimOptions> {
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

    static suggestedStyles = (): SuggestedStylesConfig => ({
        layers: [
            {
                edge: {
                    selector: "",
                    style: { enabled: true },
                    calculatedStyle: {
                        inputs: ["algorithmResults.graphty.prim.inMST"],
                        output: "style.line.color",
                        expr: "{ return StyleHelpers.color.binary.greenSuccess(arguments[0]) }",
                    },
                },
                metadata: {
                    name: "Prim - MST Edges",
                    description: "Highlights minimum spanning tree edges (green) - colorblind-safe",
                },
            },
            {
                edge: {
                    selector: "algorithmResults.graphty.prim.inMST == `false`",
                    style: {
                        enabled: true,
                        line: {
                            opacity: 0.3,
                        },
                    },
                },
                metadata: {
                    name: "Prim - Non-MST Edges",
                    description: "Dims edges not in minimum spanning tree",
                },
            },
        ],
        description: "Visualizes minimum spanning tree computed via Prim's algorithm",
        category: "path",
    });

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
     * Executes Prim's algorithm on the graph
     *
     * Computes the minimum spanning tree and marks MST edges.
     */
    async run(): Promise<void> {
        const g = this.graph;
        const edges = Array.from(g.getDataManager().edges.values());

        if (edges.length === 0) {
            return;
        }

        // Get startNode from legacy options, schema options, or use undefined (algorithm will pick first node)
        // Legacy configure() takes precedence for backward compatibility
        const startNode = this.legacyOptions?.startNode ?? this._schemaOptions.startNode ?? undefined;

        // Convert to @graphty/algorithms format and run Prim's algorithm
        // Note: Prim's algorithm requires a truly undirected graph (not a directed graph with reverse edges)
        const graphData = toAlgorithmGraph(g, { directed: false, addReverseEdges: false });
        const mstResult = primMST(graphData, startNode);

        // Create set of MST edge keys for fast lookup
        // Store both directions since the graph is undirected
        const mstEdgeKeys = new Set<string>();
        for (const edge of mstResult.edges) {
            mstEdgeKeys.add(`${String(edge.source)}:${String(edge.target)}`);
            mstEdgeKeys.add(`${String(edge.target)}:${String(edge.source)}`);
        }

        // Mark each edge as in MST or not
        for (const edge of edges) {
            const edgeKey = `${edge.srcId}:${edge.dstId}`;
            const inMST = mstEdgeKeys.has(edgeKey);
            this.addEdgeResult(edge, "inMST", inMST);
        }

        // Store graph-level results
        this.addGraphResult("totalWeight", mstResult.totalWeight);
        this.addGraphResult("edgeCount", mstResult.edges.length);
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(PrimAlgorithm);
