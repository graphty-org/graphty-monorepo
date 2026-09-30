import { z } from "zod/v4";

import type { FieldDescriptor, NodeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import type { ScopeInputDeclaration } from "./input/ScopedInput";
import { walkInChunks } from "./metrics/context";
import { nodeMetricFields } from "./metrics/fields";
import { MetricAlgorithm } from "./metrics/MetricAlgorithm";
import type { MetricMeasurement, MetricRunContext } from "./metrics/types";
import type { OptionsSchema } from "./types/OptionSchema";

const SAMPLED_SOURCES_DESCRIPTION =
    "Estimate from this many sources, drawn the same way every time, instead of from every node (empty = exact)";

const betweennessOptionsSchema = defineOptions({
    k: {
        schema: z.number().int().min(1).nullable().default(null),
        meta: { label: "Sampled sources", description: SAMPLED_SOURCES_DESCRIPTION, advanced: true },
    },
});

/** Options for betweenness centrality. */
interface BetweennessOptions extends Record<string, unknown> {
    /** How many sources to draw for a sampled run, or null for the exact count from every node. */
    k: number | null;
}

/** What a betweenness result publishes: the uniform node-metric fields and nothing else. */
const BETWEENNESS_FIELDS: readonly FieldDescriptor[] = nodeMetricFields({
    plainName: "Bridging",
    technicalName: "betweenness",
});

/**
 * Betweenness centrality: how many of the shortest paths between other nodes run through a node.
 *
 * The published `value` is the raw path count, halved because a shortest path in an undirected
 * graph is reached from both ends. It is not scaled: a graph-level `min` and `max` sit on the
 * result, so a consumer that wants a 0-to-1 value has the range to make one with.
 *
 * With `k` the run is SAMPLED: only the shortest paths from `k` drawn sources are counted, so each
 * value is the count over those sources, unscaled. The ranking is the estimate; multiply by
 * `n / k` for an estimate of the exact count.
 */
export class BetweennessCentralityAlgorithm extends MetricAlgorithm<BetweennessOptions> {
    static namespace = "graphty";
    static type = "betweenness";
    /** Computes over the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

    static zodOptionsSchema: ZodOptionsSchema = betweennessOptionsSchema;

    static optionsSchema: OptionsSchema = {
        k: {
            type: "integer",
            default: null,
            label: "Sampled sources",
            description: SAMPLED_SOURCES_DESCRIPTION,
            min: 1,
            required: false,
            advanced: true,
        },
    };

    /**
     * The fields a betweenness result publishes.
     * @returns The uniform node-metric fields.
     */
    protected resultFields(): readonly FieldDescriptor[] {
        return BETWEENNESS_FIELDS;
    }

    /**
     * Score every node by the shortest paths that run through it.
     * @param context - Where progress goes and where cancellation arrives.
     * @param nodeIds - The nodes to measure.
     * @returns One raw path count per node, unscaled.
     */
    protected async measure(context: MetricRunContext, nodeIds: readonly NodeId[]): Promise<MetricMeasurement> {
        // Undirected: a shortest path may cross an edge in either direction, and betweenness halves
        // its raw counts for an undirected input because each pair is then reached twice.
        const { k } = this.schemaOptions;
        const { snapshot, run } = this.accelerated("betweennessCentrality", "undirected", {
            sources: k ?? Number.POSITIVE_INFINITY,
        });
        // A k past the node count (a small scope, say) samples every node, which is the exact count.
        const drawn = k === null ? undefined : Math.min(k, snapshot.nodeCount);
        const sampled = drawn !== undefined;

        context.report({
            phase: "tracing shortest paths",
            completed: 0,
            total: nodeIds.length,
            message: sampled
                ? "Brandes runs a breadth-first search from every sampled source."
                : "Brandes runs a breadth-first search from every node.",
        });
        // Brandes is one synchronous call into `@graphty/algorithms` and cannot be interrupted
        // from here. The element's own half -- reading the scores back out -- is chunked below.
        const { value, precision } = await run((dispatch, s) =>
            dispatch.betweennessCentrality(s, sampled ? { k: drawn } : undefined),
        );
        context.signal.throwIfAborted();

        const nodes: ResultElementValues[] = [];
        await walkInChunks(nodeIds, context, "reading scores", (nodeId) => {
            const score = value.scores[snapshot.ids.indexOf(nodeId)];
            nodes.push({ id: nodeId, values: score === undefined ? {} : { value: score } });
        });

        return {
            nodes,
            // Raw counts. `options.normalized` is not set, so nothing rescales them.
            normalization: "none",
            caveats: {
                exact: !sampled,
                ...(sampled ? { sampleSize: drawn } : {}),
                direction: "undirected",
                weight: null,
                precision,
                method: sampled ? "brandes-sampled" : "brandes",
                notes: [
                    sampled
                        ? `Estimated from the shortest paths of ${String(drawn)} sampled sources of ${String(snapshot.nodeCount)} nodes, over the graph read as undirected, unscaled: multiply by ${String(snapshot.nodeCount)} / ${String(drawn)} to estimate the exact count.`
                        : "Every shortest path is counted exactly, over the graph read as undirected.",
                    "The raw counts are halved, because an undirected shortest path is reached from both ends.",
                    "Path lengths count edges; edge weights are not read.",
                ],
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(BetweennessCentralityAlgorithm);
