import { hits } from "@graphty/algorithms";
import { z } from "zod/v4";

import type { FieldDescriptor, NodeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import { walkInChunks } from "./metrics/context";
import { metricField, nodeMetricFields } from "./metrics/fields";
import { MetricAlgorithm } from "./metrics/MetricAlgorithm";
import type { MetricMeasurement, MetricRunContext } from "./metrics/types";
import type { OptionsSchema } from "./types/OptionSchema";

/**
 * Zod-based options schema for HITS algorithm
 */
const hitsOptionsSchema = defineOptions({
    maxIterations: {
        schema: z.number().int().min(1).max(1000).default(100),
        meta: {
            label: "Max Iterations",
            description: "Maximum iterations for hub/authority computation",
            advanced: true,
        },
    },
    tolerance: {
        schema: z.number().min(1e-10).max(0.01).default(1e-6),
        meta: {
            label: "Tolerance",
            description: "Convergence threshold",
            advanced: true,
        },
    },
    normalized: {
        schema: z.boolean().default(true),
        meta: {
            label: "Normalized",
            description: "Whether to normalize the final hub/authority scores",
            advanced: true,
        },
    },
    mode: {
        schema: z.enum(["in", "out", "total"]).default("total"),
        meta: {
            label: "Direction Mode",
            description: "Direction mode for directed graphs",
            advanced: true,
        },
    },
    endpoints: {
        schema: z.boolean().default(false),
        meta: {
            label: "Include Endpoints",
            description: "Whether to include endpoints in path calculations",
            advanced: true,
        },
    },
});

/**
 * Options for the HITS algorithm
 */
interface HITSOptions extends Record<string, unknown> {
    /** Maximum iterations for hub/authority computation */
    maxIterations: number;
    /** Convergence threshold */
    tolerance: number;
    /** Whether to normalize the final scores */
    normalized: boolean;
    /** Direction mode for directed graphs: "in", "out", or "total" */
    mode: "in" | "out" | "total";
    /** Whether to include endpoints in path calculations */
    endpoints: boolean;
}

/**
 * What a HITS result publishes: the uniform node-metric fields over the combined score, plus the
 * two scores it is the average of.
 */
const HITS_FIELDS: readonly FieldDescriptor[] = [
    ...nodeMetricFields({ plainName: "Hub and authority", technicalName: "combined HITS score" }),
    metricField({ name: "hub", plainName: "Hub", technicalName: "hub score", kind: "node", type: "number" }),
    metricField({
        name: "authority",
        plainName: "Authority",
        technicalName: "authority score",
        kind: "node",
        type: "number",
    }),
];

/**
 * HITS: every node scored twice, as a hub and as an authority.
 *
 * An authority is a node that good hubs point at; a hub is a node that points at good
 * authorities. The published `value` is the average of the two, because one number is what a
 * colour ramp or a size can be bound to; `hub` and `authority` are published beside it, because
 * the two halves are the reason to run HITS rather than PageRank.
 */
export class HITSAlgorithm extends MetricAlgorithm<HITSOptions> {
    static namespace = "graphty";
    static type = "hits";

    static zodOptionsSchema: ZodOptionsSchema = hitsOptionsSchema;

    static optionsSchema: OptionsSchema = {
        maxIterations: {
            type: "integer",
            default: 100,
            label: "Max Iterations",
            description: "Maximum iterations for hub/authority computation",
            min: 1,
            max: 1000,
            advanced: true,
        },
        tolerance: {
            type: "number",
            default: 1e-6,
            label: "Tolerance",
            description: "Convergence threshold",
            min: 1e-10,
            max: 0.01,
            advanced: true,
        },
        normalized: {
            type: "boolean",
            default: true,
            label: "Normalized",
            description: "Whether to normalize the final hub/authority scores",
            advanced: true,
        },
        mode: {
            type: "select",
            default: "total",
            label: "Direction Mode",
            description: "Direction mode for directed graphs",
            options: [
                { value: "total", label: "Total (both directions)" },
                { value: "in", label: "In-degree (incoming edges)" },
                { value: "out", label: "Out-degree (outgoing edges)" },
            ],
            advanced: true,
        },
        endpoints: {
            type: "boolean",
            default: false,
            label: "Include Endpoints",
            description: "Whether to include endpoints in path calculations",
            advanced: true,
        },
    };

    /**
     * The fields a HITS result publishes.
     * @returns The uniform node-metric fields, plus `hub` and `authority`.
     */
    protected resultFields(): readonly FieldDescriptor[] {
        return HITS_FIELDS;
    }

    /**
     * Score every node as a hub and as an authority.
     * @param context - Where progress goes and where cancellation arrives.
     * @param nodeIds - The nodes to measure.
     * @returns The combined score per node, with the two halves beside it.
     */
    protected async measure(context: MetricRunContext, nodeIds: readonly NodeId[]): Promise<MetricMeasurement> {
        const { maxIterations, tolerance, normalized, mode, endpoints } = this.schemaOptions;

        // Directed: hubs and authorities are the out- and in-directions, so HITS is meaningless
        // without them. On data with no real direction every score simply converges together.
        const graphData = this.algorithmGraph("directed");

        context.report({
            phase: "iterating",
            completed: 0,
            total: nodeIds.length,
            message: `Hub and authority scores refine each other, up to ${String(maxIterations)} passes.`,
        });
        // One synchronous call into `@graphty/algorithms`, which cannot be interrupted from here.
        // The element's own half -- reading the scores back out -- is chunked below.
        const results = hits(graphData, {
            maxIterations,
            tolerance,
            normalized,
            mode,
            endpoints,
        });
        context.signal.throwIfAborted();

        const nodes: ResultElementValues[] = [];
        await walkInChunks(nodeIds, context, "reading scores", (nodeId) => {
            const hub = results.hubs[String(nodeId)];
            const authority = results.authorities[String(nodeId)];

            if (hub === undefined || authority === undefined) {
                nodes.push({ id: nodeId, values: {} });

                return;
            }

            nodes.push({ id: nodeId, values: { value: (hub + authority) / 2, hub, authority } });
        });

        return {
            nodes,
            // The combined score is the average of two vectors the algorithm scaled, which leaves
            // it scaled by neither of the two rules this field names. The notes say what was done.
            normalization: "none",
            caveats: {
                exact: true,
                direction: "directed",
                weight: null,
                precision: "f64",
                method: "hits",
                // `converged` and `iterations` are deliberately absent: the implementation stops
                // either at its tolerance or at its iteration cap and reports neither.
                notes: [
                    "The published value is the average of this node's hub score and its authority score.",
                    normalized
                        ? "The hub and authority vectors each have unit length, which is how the iteration leaves them."
                        : "The hub and authority vectors were each divided by their own highest score.",
                    `Iteration stops at a tolerance of ${String(tolerance)} or after ${String(maxIterations)} passes, whichever comes first.`,
                    "Whether it reached the tolerance is not reported by the implementation, so this run cannot say whether it converged.",
                    "Edge weights are not read.",
                ],
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(HITSAlgorithm);
