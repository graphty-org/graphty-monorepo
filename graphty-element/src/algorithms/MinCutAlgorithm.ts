/**
 * @file Minimum Cut Algorithm wrapper
 *
 * This algorithm finds the minimum cut that separates a source from a sink
 * or the global minimum cut of a graph. Uses the max-flow min-cut theorem.
 */

import { Graph as AlgorithmGraph, kargerMinCut, minSTCut, stoerWagner } from "@graphty/algorithms";
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
import { type OptionsSchema } from "./types/OptionSchema";

/**
 * Zod-based options schema for Min Cut algorithm
 */
const minCutOptionsSchema = defineOptions({
    source: {
        schema: z.union([z.string(), z.number()]).nullable().default(null),
        meta: {
            label: "Source Node",
            description: "Source node for s-t cut (uses global min cut if not set)",
        },
    },
    sink: {
        schema: z.union([z.string(), z.number()]).nullable().default(null),
        meta: {
            label: "Sink Node",
            description: "Sink node for s-t cut (uses global min cut if not set)",
        },
    },
    useGlobalMinCut: {
        schema: z.boolean().default(false),
        meta: {
            label: "Use Global Min Cut",
            description: "Use global minimum cut algorithm instead of s-t cut",
        },
    },
    useKarger: {
        schema: z.boolean().default(false),
        meta: {
            label: "Use Karger Algorithm",
            description: "Use Karger's randomized algorithm instead of Stoer-Wagner for global min cut",
            advanced: true,
        },
    },
    kargerIterations: {
        schema: z.number().int().min(1).max(10000).default(100),
        meta: {
            label: "Karger Iterations",
            description: "Number of iterations for Karger's algorithm (higher = better accuracy but slower)",
            advanced: true,
        },
    },
});

/**
 * Options for Min Cut algorithm
 */
interface MinCutOptions extends Record<string, unknown> {
    /** Source node for s-t cut (optional - uses global min cut if not provided) */
    source: string | number | null;
    /** Sink node for s-t cut (optional - uses global min cut if not provided) */
    sink: string | number | null;
    /** Whether to use Stoer-Wagner global minimum cut instead of s-t cut */
    useGlobalMinCut: boolean;
    /** Whether to use Karger's randomized algorithm instead of Stoer-Wagner for global min cut */
    useKarger: boolean;
    /** Number of iterations for Karger's algorithm (higher = better accuracy) */
    kargerIterations: number;
}

/**
 * Minimum Cut algorithm using max-flow min-cut theorem
 *
 * Finds the minimum cut that separates a source from a sink (s-t cut)
 * or the global minimum cut of the graph using Stoer-Wagner or Karger's algorithm.
 */
export class MinCutAlgorithm extends DeclaredAlgorithm<MinCutOptions> {
    static namespace = "graphty";
    static type = "min-cut";

    static zodOptionsSchema: ZodOptionsSchema = minCutOptionsSchema;

    /**
     * Options schema for Min Cut algorithm
     */
    static optionsSchema: OptionsSchema = {
        source: {
            type: "nodeId",
            default: null,
            label: "Source Node",
            description: "Source node for s-t cut (uses global min cut if not set)",
            required: false,
        },
        sink: {
            type: "nodeId",
            default: null,
            label: "Sink Node",
            description: "Sink node for s-t cut (uses global min cut if not set)",
            required: false,
        },
        useGlobalMinCut: {
            type: "boolean",
            default: false,
            label: "Use Global Min Cut",
            description: "Use global minimum cut algorithm instead of s-t cut",
            required: false,
        },
        useKarger: {
            type: "boolean",
            default: false,
            label: "Use Karger Algorithm",
            description: "Use Karger's randomized algorithm instead of Stoer-Wagner for global min cut",
            advanced: true,
        },
        kargerIterations: {
            type: "integer",
            default: 100,
            label: "Karger Iterations",
            description: "Number of iterations for Karger's algorithm (higher = better accuracy but slower)",
            min: 1,
            max: 10000,
            advanced: true,
        },
    };

    /**
     * Legacy options set via configure() for backward compatibility
     */
    private legacyOptions: { source?: string; sink?: string; useGlobalMinCut?: boolean } | null = null;

    /**
     * Configure the algorithm with source, sink, and useGlobalMinCut options
     * @param options - Configuration options
     * @param options.source - The source node for s-t cut (optional)
     * @param options.sink - The sink node for s-t cut (optional)
     * @param options.useGlobalMinCut - Whether to use global min cut (optional)
     * @returns This algorithm instance for chaining
     * @deprecated Use constructor options instead. This method is kept for backward compatibility.
     */
    configure(options: { source?: string; sink?: string; useGlobalMinCut?: boolean }): this {
        this.legacyOptions = options;
        return this;
    }

    /**
     * Find the cheapest set of edges to remove to split the graph in two.
     *
     * A cut is a set of edges, so the result is shaped as one: every edge says whether it is in
     * the cut, the element counts how many are, and the run publishes what the cut costs, which
     * is the number the answer is read for. Every node also carries which side of the split it
     * ended up on, because a cut is only legible beside the two pieces it makes.
     *
     * Three methods can answer, and they answer different questions: Stoer-Wagner and Karger find
     * the cheapest cut anywhere in the graph, while the max-flow route finds the cheapest cut
     * between two named nodes. Karger is randomised and is the only one that may be wrong, so the
     * caveats say which ran and whether it was exact.
     * @param context - What the element gave the run.
     * @returns The edge set, or null when there is nothing to cut.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const dataManager = this.graph.getDataManager();
        const graphEdges = Array.from(dataManager.edges.values());
        const nodeIds = Array.from(dataManager.nodes.keys());

        if (graphEdges.length === 0 || nodeIds.length === 0) {
            return null;
        }

        // Build weighted graph from edges - Map format for stoerWagner/kargerMinCut
        const weightedGraphMap = new Map<string, Map<string, number>>();
        // Also build AlgorithmGraph for minSTCut (which requires Graph type)
        const weightedGraph = new AlgorithmGraph({ directed: false });

        for (const nodeId of nodeIds) {
            weightedGraphMap.set(String(nodeId), new Map());
            weightedGraph.addNode(String(nodeId));
        }

        for (const edge of graphEdges) {
            const srcId = String(edge.srcId);
            const dstId = String(edge.dstId);

            // Get weight from edge data
            const edgeData = edge.data as Record<string, unknown> | undefined;
            const edgeObject = edge as unknown as Record<string, unknown>;
            const rawWeight = edgeData?.value ?? edgeObject.value ?? 1;
            const weight: number = typeof rawWeight === "number" ? rawWeight : 1;

            weightedGraphMap.get(srcId)?.set(dstId, weight);
            // Add reverse edge for undirected graph (Map)
            weightedGraphMap.get(dstId)?.set(srcId, weight);
            weightedGraph.addEdge(srcId, dstId, weight);
        }

        // Get options from legacy or schema options
        // Legacy configure() takes precedence for backward compatibility
        const useGlobalMinCut = this.legacyOptions?.useGlobalMinCut ?? this._schemaOptions.useGlobalMinCut;
        const sourceOption = this.legacyOptions?.source ?? this._schemaOptions.source;
        const sinkOption = this.legacyOptions?.sink ?? this._schemaOptions.sink;
        const { useKarger, kargerIterations } = this._schemaOptions;

        let partition1: Set<string>;
        let partition2: Set<string>;
        let cutEdges: { from: string; to: string; weight: number }[];
        let cutValue: number;
        let method: string;

        context.report({ phase: "Finding the cut", total: null });

        if (useGlobalMinCut || (sourceOption === null && sinkOption === null)) {
            if (useKarger) {
                method = "karger";
                ({ partition1, partition2, cutEdges, cutValue } = kargerMinCut(weightedGraphMap, kargerIterations));
            } else {
                method = "stoer-wagner";
                ({ partition1, partition2, cutEdges, cutValue } = stoerWagner(weightedGraphMap));
            }
        } else {
            method = "min-st-cut";
            const source = sourceOption !== null ? String(sourceOption) : String(nodeIds[0]);
            const sink = sinkOption !== null ? String(sinkOption) : String(nodeIds[nodeIds.length - 1]);

            ({ partition1, partition2, cutEdges, cutValue } = minSTCut(weightedGraph, source, sink));
        }

        // Both directions, because the element's edge carries the direction it was declared in
        // and the cut's does not.
        const cutWeightOf = new Map<string, number>();
        for (const edge of cutEdges) {
            cutWeightOf.set(`${edge.from}:${edge.to}`, edge.weight);
            cutWeightOf.set(`${edge.to}:${edge.from}`, edge.weight);
        }

        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Marking the cut", graphEdges, (edge) => {
            const key = `${String(edge.srcId)}:${String(edge.dstId)}`;
            const weight = cutWeightOf.get(key);

            edges.push({ id: key, values: { in: weight !== undefined } });
        });

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Marking the sides", nodeIds, (nodeId) => {
            const onFirstSide = partition1.has(String(nodeId));

            nodes.push({ id: nodeId, values: { side: onFirstSide ? "1" : "2" } });
        });

        return {
            shape: "edge-set",
            fields: [
                ...setFieldSpecs("edge", { name: "cutValue", type: "number" }),
                { name: "side", kind: "node", type: "string" },
            ],
            nodes,
            edges,
            graph: { cutValue },
            caveats: declaredCaveats({
                method,
                direction: "undirected",
                weight: { attribute: "weight", meaning: "strength" },
                exact: method !== "karger",
                iterations: method === "karger" ? kargerIterations : undefined,
                notes:
                    method === "karger"
                        ? ["Karger's method is randomised: it finds the cheapest cut with high probability, not certainty."]
                        : [`The cut separates ${String(partition1.size)} nodes from ${String(partition2.size)}.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(MinCutAlgorithm);
