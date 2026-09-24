import { type NodeId as AlgorithmNodeId, pageRank } from "@graphty/algorithms";
import { INVALID_INDEX } from "@graphty/graph-format";
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
 * Why this run cannot take the index-based route, or null when it can.
 *
 * Three things the reference implementation does have no index-based counterpart, and each one is
 * a question of the RESULT rather than of speed: a personalization vector and a set of initial
 * ranks change what the numbers mean, and an undirected graph has no out-edges for rank to flow
 * along -- the indexed port refuses one outright, while the reference implementation reads the
 * same pair of records as a link each way. So the run stays where the answer is defined, and says
 * so in its caveats.
 * @param run - What this run was asked for.
 * @param run.directed - Whether the graph the element froze is directed.
 * @param run.hasInitialRanks - Whether the caller supplied starting values.
 * @param run.hasPersonalization - Whether the caller supplied a personalization vector.
 * @returns The reason, in a sentence a reader can read, or null.
 */
function legacyPageRankReason(run: {
    directed: boolean;
    hasInitialRanks: boolean;
    hasPersonalization: boolean;
}): string | null {
    if (run.hasPersonalization) {
        return "a personalization vector was given, and only the reference implementation takes one";
    }

    if (run.hasInitialRanks) {
        return "initial ranks were given, and only the reference implementation takes them";
    }

    if (!run.directed) {
        return "the graph is undirected, and rank flows along out-edges";
    }

    return null;
}

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
     * The two Map-valued options, kept from what the caller passed.
     *
     * NEITHER SCHEMA CARRIES THEM -- a Map is not a value a form or a saved document can hold --
     * and `resolveOptions` returns only the keys its schema declares, so reading them back off the
     * resolved options found nothing and a personalized run quietly ran an unpersonalized one.
     */
    private readonly programmaticOptions: Pick<PageRankOptions, "initialRanks" | "personalization">;

    /**
     * Creates a new PageRank algorithm instance
     * @param g - The graph to run the algorithm on
     * @param options - Optional configuration options
     */
    constructor(g: Graph, options?: Partial<PageRankOptions>) {
        super(g, options);
        // Use new Zod-based validation for schema options
        this.zodOptions = parseOptions(pageRankOptionsSchema, options ?? {});
        this.programmaticOptions = {
            initialRanks: options?.initialRanks ?? null,
            personalization: options?.personalization ?? null,
        };
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
        // Map types are programmatic-only (not in schema) - kept from the constructor's arguments
        const initialRanks = this.programmaticOptions.initialRanks ?? undefined;
        const personalization = this.programmaticOptions.personalization ?? undefined;

        /* Directed: rank flows along out-edges, so the declared direction is the whole model --
           and whether the snapshot IS directed is one of the three things that decide whether any
           index-based port answers this run at all. So it is read here, from the declared
           snapshot, BEFORE the route is taken: a run that ends on the reference implementation
           must not first pay for the parallel-edge merge it will never look at. */
        const legacyReason = legacyPageRankReason({
            directed: this.graph.getDataManager().getSnapshot().directed,
            hasInitialRanks: initialRanks !== undefined,
            hasPersonalization: personalization !== undefined,
        });

        if (legacyReason === null) {
            const { snapshot, run } = this.accelerated("pageRank", "directed");

            context.report({
                phase: "iterating",
                completed: 0,
                total: nodeIds.length,
                message: `Power iteration, up to ${String(maxIterations)} passes.`,
            });

            const { value, precision } = await run((dispatch, s) =>
                dispatch.pageRank(s, {
                    dampingFactor,
                    maxIterations,
                    tolerance,
                    // ONE weight column, so naming an attribute is the same request as asking for
                    // a weighted run: the snapshot carries the weight the element resolved.
                    weighted: weight !== null,
                }),
            );

            context.signal.throwIfAborted();

            const { ids } = snapshot;
            const measured: ResultElementValues[] = [];
            await walkInChunks(nodeIds, context, "reading ranks", (nodeId) => {
                const index = ids.indexOf(nodeId);
                const rank = index === INVALID_INDEX ? undefined : value.scores[index];
                measured.push({ id: nodeId, values: rank === undefined ? {} : { value: rank } });
            });

            const routedNotes = [
                `A reader follows a link with probability ${String(dampingFactor)} and jumps to a random node otherwise.`,
                "The ranks sum to 1 across the graph.",
            ];

            if (weight === null) {
                routedNotes.push("Edge weights are not read.");
            }

            if (useDelta) {
                routedNotes.push(
                    "Power iteration ran: the delta optimisation is the CPU reference implementation's own and has no index-based counterpart, so it was not taken.",
                );
            }

            return {
                nodes: measured,
                normalization: "none",
                caveats: {
                    exact: true,
                    direction: "directed",
                    weight: weight === null ? null : { attribute: weight, meaning: "strength" },
                    precision,
                    method: "power-iteration",
                    converged: value.converged,
                    iterations: value.iterations,
                    notes: routedNotes,
                },
            };
        }

        // No index-based port answers this run, so the reference implementation does.
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
            `Computed on the CPU reference implementation: ${legacyReason}.`,
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
