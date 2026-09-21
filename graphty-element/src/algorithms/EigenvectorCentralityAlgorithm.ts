import { eigenvectorCentrality } from "@graphty/algorithms";
import { z } from "zod/v4";

import type { FieldDescriptor, NodeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import { walkInChunks } from "./metrics/context";
import { nodeMetricFields } from "./metrics/fields";
import { MetricAlgorithm } from "./metrics/MetricAlgorithm";
import type { MetricMeasurement, MetricRunContext } from "./metrics/types";
import type { OptionsSchema } from "./types/OptionSchema";

/**
 * Zod-based options schema for Eigenvector Centrality algorithm
 */
const eigenvectorCentralityOptionsSchema = defineOptions({
    maxIterations: {
        schema: z.number().int().min(1).max(1000).default(100),
        meta: {
            label: "Max Iterations",
            description: "Maximum power iterations",
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
            description: "Whether to normalize the final scores",
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
 * Options for the Eigenvector Centrality algorithm
 */
interface EigenvectorCentralityOptions extends Record<string, unknown> {
    /** Maximum power iterations */
    maxIterations: number;
    /** Convergence threshold */
    tolerance: number;
    /** Whether to normalize the final scores */
    normalized: boolean;
    /** Direction mode for directed graphs: "in", "out", or "total" */
    mode: "in" | "out" | "total";
    /** Whether to include endpoints in path calculations */
    endpoints: boolean;
    /** Custom initial vector for power iteration (programmatic only, not in schema) */
    startVector: Map<string, number> | null;
}

/** What an eigenvector result publishes: the uniform node-metric fields and nothing else. */
const EIGENVECTOR_FIELDS: readonly FieldDescriptor[] = nodeMetricFields({
    plainName: "Influence by association",
    technicalName: "eigenvector score",
});

/**
 * Eigenvector centrality: how influential a node's neighbours are.
 *
 * A node scores highly when it is connected to other nodes that themselves score highly, so a few
 * important connections count for more than many unimportant ones.
 */
export class EigenvectorCentralityAlgorithm extends MetricAlgorithm<EigenvectorCentralityOptions> {
    static namespace = "graphty";
    static type = "eigenvector";

    static zodOptionsSchema: ZodOptionsSchema = eigenvectorCentralityOptionsSchema;

    static optionsSchema: OptionsSchema = {
        maxIterations: {
            type: "integer",
            default: 100,
            label: "Max Iterations",
            description: "Maximum power iterations",
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
            description: "Whether to normalize the final scores",
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
        // Note: startVector is a Map type - programmatic only, not in schema
    };

    /**
     * The fields an eigenvector result publishes.
     * @returns The uniform node-metric fields.
     */
    protected resultFields(): readonly FieldDescriptor[] {
        return EIGENVECTOR_FIELDS;
    }

    /**
     * Score every node by the influence of its neighbours.
     * @param context - Where progress goes and where cancellation arrives.
     * @param nodeIds - The nodes to measure.
     * @returns One score per node, scaled as the options asked for.
     */
    protected async measure(context: MetricRunContext, nodeIds: readonly NodeId[]): Promise<MetricMeasurement> {
        const { maxIterations, tolerance, normalized, mode, endpoints } = this.schemaOptions;
        // Map types are programmatic-only (not in schema)
        const startVector = this._schemaOptions.startVector ?? undefined;

        // Undirected: influence flows across an edge in either direction.
        const graphData = this.algorithmGraph("undirected");

        context.report({
            phase: "iterating",
            completed: 0,
            total: nodeIds.length,
            message: `Power iteration, up to ${String(maxIterations)} passes.`,
        });
        // One synchronous call into `@graphty/algorithms`, which cannot be interrupted from here.
        // The element's own half -- reading the scores back out -- is chunked below.
        const scores = eigenvectorCentrality(graphData, {
            normalized,
            maxIterations,
            tolerance,
            mode,
            endpoints,
            startVector,
        });
        context.signal.throwIfAborted();

        const nodes: ResultElementValues[] = [];
        await walkInChunks(nodeIds, context, "reading scores", (nodeId) => {
            const score = scores[String(nodeId)];
            nodes.push({ id: nodeId, values: score === undefined ? {} : { value: score } });
        });

        return {
            nodes,
            // With `normalized`, the algorithm rescales its eigenvector so the lowest score is 0
            // and the highest is 1. Without it the raw unit-length eigenvector is published.
            normalization: normalized ? "min-max" : "none",
            caveats: {
                exact: true,
                direction: "undirected",
                weight: null,
                precision: "f64",
                method: "power-iteration",
                // `converged` and `iterations` are deliberately absent: the algorithm stops either
                // at its tolerance or at its iteration cap and reports neither, so saying it
                // converged would be an assertion nothing measured.
                notes: [
                    `Power iteration stops at a tolerance of ${String(tolerance)} or after ${String(maxIterations)} passes, whichever comes first.`,
                    "Whether it reached the tolerance is not reported by the implementation, so this run cannot say whether it converged.",
                    "Edge weights are not read.",
                ],
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(EigenvectorCentralityAlgorithm);
