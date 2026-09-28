/**
 * @file Minimum Cut Algorithm wrapper
 *
 * This algorithm finds the minimum cut that separates a source from a sink
 * or the global minimum cut of a graph. Uses the max-flow min-cut theorem.
 */

import { indexed, type IndexedMinCutResult } from "@graphty/algorithms";
import { INVALID_INDEX, maskTest } from "@graphty/graph-format";
import { z } from "zod/v4";

import type { EdgeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import { scopeEdges, type ScopeInputDeclaration, scopeNodeIds } from "./input/ScopedInput";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    forEachChunked,
    setFieldSpecs,
} from "./results";
import { type OptionsSchema } from "./types/OptionSchema";
import { requireDistinctEnds, requireNodeOption } from "./utils/graphUtils";

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
    /** Cuts the run's scope: the node and edge lists and the graph all come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

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
        // The nodes and declared edges of the run's input: its scope's, or the whole graph's.
        const input = this.input("undirected");
        const graphEdges = scopeEdges(input);
        const nodeIds = scopeNodeIds(input);

        if (graphEdges.length === 0 || nodeIds.length === 0) {
            return null;
        }

        // The weights are the element's edge weights, read off the input: a reciprocal pair is one
        // edge and parallel edges are one edge carrying their summed weight, because cutting a
        // pair of nodes apart costs every edge between them.
        const { snapshot: cutInput, edgeRemap } = input.derived();

        // Get options from legacy or schema options
        // Legacy configure() takes precedence for backward compatibility
        const useGlobalMinCut = this.legacyOptions?.useGlobalMinCut ?? this._schemaOptions.useGlobalMinCut;
        const sourceOption = this.legacyOptions?.source ?? this._schemaOptions.source;
        const sinkOption = this.legacyOptions?.sink ?? this._schemaOptions.sink;
        const { useKarger, kargerIterations } = this._schemaOptions;

        let cut: IndexedMinCutResult;
        let method: string;
        let autoEndNote: string | undefined;

        context.report({ phase: "Finding the cut", total: null });

        if (useGlobalMinCut || (sourceOption === null && sinkOption === null)) {
            if (useKarger) {
                method = "karger";
                cut = indexed.kargerMinCut(cutInput, { iterations: kargerIterations });
            } else {
                method = "stoer-wagner";
                cut = indexed.stoerWagner(cutInput);
            }
        } else {
            method = "min-st-cut";
            const source =
                sourceOption === null ? nodeIds[0] : requireNodeOption("min-cut", "source", sourceOption, nodeIds);
            const sink =
                sinkOption === null
                    ? nodeIds[nodeIds.length - 1]
                    : requireNodeOption("min-cut", "sink", sinkOption, nodeIds);
            requireDistinctEnds("min-cut", source, sink);
            if (sourceOption === null || sinkOption === null) {
                autoEndNote =
                    `Only one end was set, so the other was chosen automatically (cut between ${String(source)} and ${String(sink)}); ` +
                    "set both source and sink to cut between the nodes you mean.";
            }

            cut = indexed.minSTCut(cutInput, cutInput.ids.indexOf(source), cutInput.ids.indexOf(sink));
        }

        // Every declared edge maps onto the input edge it was merged into, so both edges of a
        // reciprocal pair and every member of a parallel group are in the cut together.
        const inCut = new Uint8Array(cutInput.edgeCount);
        for (const edge of cut.cutEdges) {
            inCut[edge] = 1;
        }

        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Marking the cut", graphEdges, (edge) => {
            const merged = edgeRemap === null ? edge.row : edgeRemap[edge.row];

            edges.push({ id: edge.id, values: { in: merged !== INVALID_INDEX && inCut[merged] === 1 } });
        });

        let firstSide = 0;
        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Marking the sides", nodeIds, (nodeId) => {
            const onFirstSide = maskTest(cut.side, cutInput.ids.indexOf(nodeId));
            firstSide += onFirstSide ? 1 : 0;

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
            graph: { cutValue: cut.cutValue },
            caveats: declaredCaveats({
                method,
                direction: "undirected",
                weight: { attribute: "weight", meaning: "strength" },
                exact: method !== "karger",
                iterations: method === "karger" ? kargerIterations : undefined,
                notes: [
                    method === "karger"
                        ? "Karger's method is randomised: it finds the cheapest cut with high probability, not certainty."
                        : `The cut separates ${String(firstSide)} nodes from ${String(nodeIds.length - firstSide)}.`,
                    ...(autoEndNote === undefined ? [] : [autoEndNote]),
                ],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(MinCutAlgorithm);
