import type { NodeId as AlgorithmNodeId } from "@graphty/algorithms";
import { type F64, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod/v4";

import type { FieldDescriptor, NodeId } from "../catalog/types";
import { defineOptions, type InferOptions, parseOptions } from "../config";
import type { Graph } from "../Graph";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import type { ScopeInputDeclaration } from "./input/ScopedInput";
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
            description: "Accepted and ignored: every run is a plain power iteration",
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
 * One value per node of a snapshot, read out of a Map the caller keyed by node id.
 * @param snapshot - The graph the values are for.
 * @param values - The caller's Map.
 * @param fill - What a node the Map does not name gets.
 * @returns The values, in node index order.
 */
function perNode(snapshot: GraphSnapshot, values: ReadonlyMap<AlgorithmNodeId, number>, fill: number): F64 {
    const out = new Float64Array(snapshot.nodeCount);
    for (let index = 0; index < out.length; index++) {
        out[index] = values.get(snapshot.ids.idOf(index)) ?? fill;
    }

    return out;
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
    /** Ranks over the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

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
            description: "Accepted and ignored: every run is a plain power iteration",
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
        const { dampingFactor, maxIterations, tolerance, weight } = this.zodOptions;
        // Map types are programmatic-only (not in schema) - kept from the constructor's arguments
        const initialRanks = this.programmaticOptions.initialRanks ?? undefined;
        const personalization = this.programmaticOptions.personalization ?? undefined;

        /* The declared orientation: rank flows along out-edges, so the declared direction is the
           whole model. On an undirected graph every edge carries rank both ways.

           Only the plain run -- directed, from the uniform start, teleporting anywhere -- is one an
           accelerator answers. A personalization vector or a set of initial ranks changes what the
           numbers mean, and those runs, and the undirected one, iterate as the element's PageRank
           always has: until no single rank moves by the tolerance. The plain run stops on the
           summed change, as the accelerator does, so the two routes of it agree. */
        const declared = this.input("declared").graph;
        const plain = declared.directed && initialRanks === undefined && personalization === undefined;
        const { snapshot, run } = this.accelerated(
            personalization === undefined ? "pageRank" : "personalizedPageRank",
            "directed",
            {
                accelerable: plain,
            },
        );

        context.report({
            phase: "iterating",
            completed: 0,
            total: nodeIds.length,
            message: `Power iteration, up to ${String(maxIterations)} passes.`,
        });

        const { value, precision } = await run((dispatch, s) => {
            const options = {
                dampingFactor,
                maxIterations,
                tolerance,
                // ONE weight column, so naming an attribute is the same request as asking for a
                // weighted run: the snapshot carries the weight the element resolved.
                weighted: weight !== null,
                ...(plain ? {} : { convergenceNorm: "max" as const }),
                ...(initialRanks === undefined ? {} : { initialRanks: perNode(s, initialRanks, 1 / s.nodeCount) }),
            };

            return personalization === undefined
                ? dispatch.pageRank(s, options)
                : dispatch.personalizedPageRank(s, perNode(s, personalization, 0), options);
        });

        context.signal.throwIfAborted();

        const { ids } = snapshot;
        const measured: ResultElementValues[] = [];
        await walkInChunks(nodeIds, context, "reading ranks", (nodeId) => {
            const index = ids.indexOf(nodeId);
            const rank = index === INVALID_INDEX ? undefined : value.scores[index];
            measured.push({ id: nodeId, values: rank === undefined ? {} : { value: rank } });
        });

        const notes = [
            `A reader follows a link with probability ${String(dampingFactor)} and jumps to a random node otherwise.`,
            "The ranks sum to 1 across the graph.",
        ];

        if (!snapshot.directed) {
            notes.push("The graph is undirected, so every edge carries rank both ways.");
        }

        if (personalization !== undefined) {
            /* An entry naming a node outside this run's graph -- outside a scope, say -- has no
               node to land on, so it is left out and the rest share the jump. When nothing is
               left, the port jumps anywhere, as an unpersonalized run does, and the notes say
               that rather than claiming a personalization that never applied. */
            const outside = [...personalization.keys()].filter((id) => ids.indexOf(id) === INVALID_INDEX).length;
            const applies = perNode(snapshot, personalization, 0).some((share) => share > 0);
            notes.push(
                applies
                    ? "The random jump lands on the personalization vector's nodes, in proportion to their values."
                    : "No personalization entry gives a node of this graph a positive share, so the random jump lands on any node.",
            );

            if (outside > 0) {
                notes.push(
                    `${String(outside)} personalization ${outside === 1 ? "entry names a node" : "entries name nodes"} outside this graph, left out of the random jump.`,
                );
            }
        }

        if (weight === null) {
            notes.push("Edge weights are not read.");
        }

        return {
            nodes: measured,
            // Raw ranks, published as they were computed.
            normalization: "none",
            caveats: {
                exact: true,
                direction: snapshot.directed ? "directed" : "undirected",
                weight: weight === null ? null : { attribute: weight, meaning: "strength" },
                precision,
                method: "power-iteration",
                converged: value.converged,
                iterations: value.iterations,
                notes,
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(PageRankAlgorithm);
