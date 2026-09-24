import { type NodeId as AlgorithmNodeId, pageRank } from "@graphty/algorithms";
import { z } from "zod/v4";

import type { FieldDescriptor, NodeId } from "../catalog/types";
import { defineOptions, type InferOptions, parseOptions } from "../config";
import type { Graph } from "../Graph";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import { walkInChunks } from "./metrics/context";
import { nodeMetricFields } from "./metrics/fields";
import { MetricAlgorithm } from "./metrics/MetricAlgorithm";
import type { MetricMeasurement, MetricRunContext } from "./metrics/types";
import type { OptionsSchema } from "./types/OptionSchema";

/**
 * Zod-based options schema for PageRank algorithm (NEW unified system)
 *
 * This is the new Zod-based schema that provides both validation and UI metadata.
 * It will eventually replace the legacy optionsSchema.
 */
const pageRankOptionsSchema = defineOptions({
    dampingFactor: {
        schema: z.number().min(0).max(1).default(0.85),
        meta: {
            label: "Damping Factor",
            description: "Probability of following a link (0.85 is standard for web graphs)",
            step: 0.05,
        },
    },
    maxIterations: {
        schema: z.number().int().min(1).max(1000).default(100),
        meta: {
            label: "Max Iterations",
            description: "Maximum power iterations before stopping",
            advanced: true,
        },
    },
    tolerance: {
        schema: z.number().min(1e-10).max(0.1).default(1e-6),
        meta: {
            label: "Tolerance",
            description: "Convergence threshold for early stopping",
            advanced: true,
        },
    },
    weight: {
        schema: z.string().nullable().default(null),
        meta: {
            label: "Weight Attribute",
            description: "Edge attribute name for weighted PageRank (empty = unweighted)",
            advanced: true,
        },
    },
    useDelta: {
        schema: z.boolean().default(true),
        meta: {
            label: "Use Delta Optimization",
            description: "Use delta-based optimization for faster convergence on large graphs",
            advanced: true,
        },
    },
});

/**
 * Inferred options type from the Zod schema
 */
type PageRankSchemaOptions = InferOptions<typeof pageRankOptionsSchema>;

/**
 * Options for the PageRank algorithm
 *
 * Extends the schema options with programmatic-only options that can't be
 * represented in the schema (Map types).
 */
interface PageRankOptions extends PageRankSchemaOptions, Record<string, unknown> {
    /** Initial PageRank values for nodes (programmatic only, not in schema) */
    initialRanks?: Map<AlgorithmNodeId, number> | null;
    /** Personalization vector for Personalized PageRank (programmatic only, not in schema) */
    personalization?: Map<AlgorithmNodeId, number> | null;
}

/** What a PageRank result publishes: the uniform node-metric fields and nothing else. */
const PAGERANK_FIELDS: readonly FieldDescriptor[] = nodeMetricFields({
    plainName: "Influence",
    technicalName: "PageRank score",
});

/**
 * The graph size above which `@graphty/algorithms` switches to its delta method.
 *
 * Mirroring the implementation's own rule is the only way the element can say honestly which
 * method produced a number: the package chooses between the two internally and returns no sign of
 * which it took. The rule lives at `algorithms/src/algorithms/centrality/pagerank.ts:110`, and
 * this constant goes away when that function reports its own method, iteration count and
 * convergence instead of returning `converged: true` as a constant at `:147`.
 */
const DELTA_METHOD_NODE_THRESHOLD = 100;

/**
 * PageRank: the influence that flows into a node from the nodes that point at it.
 *
 * The published `value` is the raw rank, which sums to 1 across the graph. It is not scaled: the
 * result carries a graph-level `min` and `max`, so a consumer that wants a 0-to-1 value has the
 * range to make one with.
 */
export class PageRankAlgorithm extends MetricAlgorithm<PageRankOptions> {
    static namespace = "graphty";
    static type = "pagerank";

    /**
     * NEW: Zod-based options schema for unified validation and UI metadata
     *
     * This is the new system that uses Zod for validation. Access via:
     * - PageRankAlgorithm.zodOptionsSchema (the schema)
     * - pageRankOptionsSchema (exported from module)
     */
    static zodOptionsSchema = pageRankOptionsSchema;

    /**
     * LEGACY: Old-style options schema for backward compatibility
     * @deprecated Use zodOptionsSchema instead. This will be removed in a future version.
     */
    static optionsSchema: OptionsSchema = {
        dampingFactor: {
            type: "number",
            default: 0.85,
            label: "Damping Factor",
            description: "Probability of following a link (0.85 is standard for web graphs)",
            min: 0,
            max: 1,
            step: 0.05,
        },
        maxIterations: {
            type: "integer",
            default: 100,
            label: "Max Iterations",
            description: "Maximum power iterations before stopping",
            min: 1,
            max: 1000,
            advanced: true,
        },
        tolerance: {
            type: "number",
            default: 1e-6,
            label: "Tolerance",
            description: "Convergence threshold for early stopping",
            min: 1e-10,
            max: 0.1,
            advanced: true,
        },
        weight: {
            type: "string",
            default: null as unknown as string,
            label: "Weight Attribute",
            description: "Edge attribute name for weighted PageRank (empty = unweighted)",
            advanced: true,
        },
        useDelta: {
            type: "boolean",
            default: true,
            label: "Use Delta Optimization",
            description: "Use delta-based optimization for faster convergence on large graphs",
            advanced: true,
        },
        // Note: initialRanks and personalization are Map types - programmatic only, not in schema
    };

    /**
     * Resolved options using the NEW Zod-based validation
     */
    private zodOptions: PageRankSchemaOptions;

    /**
     * Creates a new PageRank algorithm instance
     * @param g - The graph to run the algorithm on
     * @param options - Optional configuration options
     */
    constructor(g: Graph, options?: Partial<PageRankOptions>) {
        super(g, options);
        // Use new Zod-based validation for schema options
        this.zodOptions = parseOptions(pageRankOptionsSchema, options ?? {});
    }

    /**
     * The fields a PageRank result publishes.
     * @returns The uniform node-metric fields.
     */
    protected resultFields(): readonly FieldDescriptor[] {
        return PAGERANK_FIELDS;
    }

    /**
     * Rank every node by the influence flowing into it.
     * @param context - Where progress goes and where cancellation arrives.
     * @param nodeIds - The nodes to measure.
     * @returns One raw rank per node, unscaled.
     */
    protected async measure(context: MetricRunContext, nodeIds: readonly NodeId[]): Promise<MetricMeasurement> {
        // Get options from NEW Zod-based schema (validated at construction)
        const { dampingFactor, maxIterations, tolerance, weight, useDelta } = this.zodOptions;
        // Map types are programmatic-only (not in schema) - accessed from legacy options
        const initialRanks = this._schemaOptions.initialRanks ?? undefined;
        const personalization = this._schemaOptions.personalization ?? undefined;

        // Directed: rank flows along out-edges, so the declared direction is the whole model.
        const graphData = this.algorithmGraph("directed");
        // The delta method does not report how many passes it took or whether it converged: it
        // returns `iterations: maxIterations` with the comment "For now, assume we used all
        // iterations" and `converged: true` as a constant. So which method ran decides whether
        // this run can answer those two questions at all.
        const delta = useDelta && graphData.nodeCount > DELTA_METHOD_NODE_THRESHOLD;

        context.report({
            phase: "iterating",
            completed: 0,
            total: nodeIds.length,
            message: `Power iteration, up to ${String(maxIterations)} passes.`,
        });
        // One synchronous call into `@graphty/algorithms`, which cannot be interrupted from here.
        // The element's own half -- reading the ranks back out -- is chunked below.
        const result = pageRank(graphData, {
            dampingFactor,
            maxIterations,
            tolerance,
            weight: weight ?? undefined,
            useDelta,
            initialRanks,
            personalization,
        });
        context.signal.throwIfAborted();

        const nodes: ResultElementValues[] = [];
        await walkInChunks(nodeIds, context, "reading ranks", (nodeId) => {
            const rank = result.ranks[String(nodeId)];
            nodes.push({ id: nodeId, values: rank === undefined ? {} : { value: rank } });
        });

        const notes = [
            `A reader follows a link with probability ${String(dampingFactor)} and jumps to a random node otherwise.`,
            "The ranks sum to 1 across the graph.",
        ];

        if (delta) {
            notes.push(
                "The delta method ran, and it reports neither how many passes it took nor whether it converged, so this run cannot say.",
            );
        }

        if (weight === null) {
            notes.push("Edge weights are not read.");
        }

        return {
            nodes,
            // Raw ranks, published as they were computed.
            normalization: "none",
            caveats: {
                exact: true,
                direction: "directed",
                weight: weight === null ? null : { attribute: weight, meaning: "strength" },
                precision: "f64",
                method: delta ? "delta-pagerank" : "power-iteration",
                // Present only when the method that ran measured them. Absent is the honest
                // answer where it did not; a hard-coded `true` was the defect this replaces.
                ...(delta ? {} : { converged: result.converged, iterations: result.iterations }),
                notes,
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(PageRankAlgorithm);
