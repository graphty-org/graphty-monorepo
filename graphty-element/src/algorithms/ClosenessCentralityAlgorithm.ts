import { z } from "zod/v4";

import type { FieldDescriptor, NodeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import { GraphtyError } from "../errors";
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
 * Above this many nodes an EXACT closeness run is never sent to an accelerator.
 *
 * `design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md` drops exact all-source closeness
 * above roughly 30,000 nodes: the device call is 17 to 42 seconds at 100,000 nodes and grows as
 * n squared, so nobody waits for it in a browser. A sampled run has no such cap.
 */
export const EXACT_CLOSENESS_MAX_ACCELERATED_NODES = 30_000;

const closenessOptionsSchema = defineOptions({
    k: {
        schema: z.number().int().min(1).nullable().default(null),
        meta: {
            label: "Sampled sources",
            description:
                "Estimate from this many sources, drawn the same way every time, instead of from every node (empty = exact)",
            advanced: true,
        },
    },
});

/** Options for closeness centrality. */
interface ClosenessOptions extends Record<string, unknown> {
    /** How many sources to draw for a sampled run, or null for the exact score from every node. */
    k: number | null;
    /**
     * The node ids to run from, for a sampled run (programmatic only: a list is not a value a form
     * holds). A node listed twice runs twice. With `k` set, `k` must equal the list's length.
     */
    sources?: readonly NodeId[] | null;
}

/** What a closeness result publishes: the uniform node-metric fields and nothing else. */
const CLOSENESS_FIELDS: readonly FieldDescriptor[] = nodeMetricFields({
    plainName: "Reach",
    technicalName: "closeness",
});

/**
 * Closeness centrality: how short a node's paths to the rest of the graph are.
 *
 * The published `value` is the algorithm's own figure, unscaled. A graph-level `min` and `max`
 * sit on the result, so a consumer that wants a 0-to-1 value has the range to make one with.
 *
 * With `k` or `sources` the run is SAMPLED: each node is scored from its distances to the
 * sampled sources only, so `1 / value` is the summed distance to those sources. The ranking is
 * the estimate; multiply by `k / n` for an estimate of the exact value.
 */
export class ClosenessCentralityAlgorithm extends MetricAlgorithm<ClosenessOptions> {
    static namespace = "graphty";
    static type = "closeness";
    /** Computes over the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

    static zodOptionsSchema: ZodOptionsSchema = closenessOptionsSchema;

    static optionsSchema: OptionsSchema = {
        k: {
            type: "integer",
            default: null,
            label: "Sampled sources",
            description:
                "Estimate from this many sources, drawn the same way every time, instead of from every node (empty = exact)",
            min: 1,
            required: false,
            advanced: true,
        },
    };

    /** The node ids to run from, kept from the constructor's arguments: no schema carries a list. */
    private readonly sources: readonly NodeId[] | null;

    /**
     * Creates a closeness run.
     * @param g - The graph to run on.
     * @param options - `k`, and the programmatic `sources` list.
     */
    constructor(g: Graph, options?: Partial<ClosenessOptions>) {
        super(g, options);
        this.sources = options?.sources ?? null;
    }

    /**
     * The fields a closeness result publishes.
     * @returns The uniform node-metric fields.
     */
    protected resultFields(): readonly FieldDescriptor[] {
        return CLOSENESS_FIELDS;
    }

    /**
     * Score every node by how short its paths to the rest of the graph are.
     * @param context - Where progress goes and where cancellation arrives.
     * @param nodeIds - The nodes to measure.
     * @returns One score per node, unscaled.
     */
    protected async measure(context: MetricRunContext, nodeIds: readonly NodeId[]): Promise<MetricMeasurement> {
        const { k } = this.schemaOptions;
        const sampled = k !== null || this.sources !== null;
        if (k !== null && this.sources !== null && k !== this.sources.length) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `"k" is ${String(k)} but "sources" names ${String(this.sources.length)} nodes; give one, or make them agree`,
                source: "run",
                details: { option: "k", value: k },
            });
        }

        // Undirected: closeness here measures distance, which ignores the declared direction. An
        // exact run is too slow on the device above the cap, so it stays on the CPU port there.
        const accelerable = sampled || this.input("undirected").nodeCount <= EXACT_CLOSENESS_MAX_ACCELERATED_NODES;
        const { snapshot, run } = this.accelerated("closenessCentrality", "undirected", { accelerable });
        const sources = this.sources?.map((id) => this.nodeIndex(snapshot, "sources", id));
        // A k past the node count (a small scope, say) samples every node, which is the exact score.
        const drawn = sources === undefined && k !== null ? Math.min(k, snapshot.nodeCount) : undefined;

        context.report({
            phase: "measuring distances",
            completed: 0,
            total: nodeIds.length,
            message: sampled
                ? "A breadth-first search runs from every sampled source."
                : "A breadth-first search runs from every node.",
        });
        // One synchronous call into `@graphty/algorithms`, which cannot be interrupted from here.
        // The element's own half -- reading the scores back out -- is chunked below.
        const { value, precision } = await run((dispatch, s) =>
            dispatch.closenessCentrality(s, sampled ? { sources, k: drawn } : undefined),
        );
        context.signal.throwIfAborted();

        const nodes: ResultElementValues[] = [];
        await walkInChunks(nodeIds, context, "reading scores", (nodeId) => {
            const score = value.scores[snapshot.ids.indexOf(nodeId)];
            nodes.push({ id: nodeId, values: score === undefined ? {} : { value: score } });
        });

        const notes = [
            "Distance counts edges; edge weights are not read.",
            "A score is the reciprocal of the total distance to the nodes this one can reach, with no correction for how many that is, so a node in a small component scores as though it reached the whole graph.",
        ];

        return {
            nodes,
            // The algorithm's own figure, published as it was computed.
            normalization: "none",
            caveats: {
                exact: !sampled,
                ...(sampled ? { sampleSize: value.sourcesUsed } : {}),
                direction: "undirected",
                weight: null,
                precision,
                method: sampled ? "closeness-bfs-sampled" : "closeness-bfs",
                notes: sampled
                    ? [
                          `Estimated from ${String(value.sourcesUsed)} sampled sources of ${String(snapshot.nodeCount)} nodes, over the graph read as undirected: each node's distances are summed to those sources only, unscaled, so multiply by ${String(value.sourcesUsed)} / ${String(snapshot.nodeCount)} to estimate the exact score.`,
                          ...notes,
                      ]
                    : ["Distances are exact, measured over the graph read as undirected.", ...notes],
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(ClosenessCentralityAlgorithm);
