import { katzCentrality } from "@graphty/algorithms";
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
 * Zod-based options schema for Katz Centrality algorithm
 */
const katzCentralityOptionsSchema = defineOptions({
    alpha: {
        schema: z.number().min(0.01).max(0.5).default(0.1),
        meta: {
            label: "Alpha (Attenuation)",
            description: "Attenuation factor - must be less than 1/λmax",
            step: 0.01,
        },
    },
    beta: {
        schema: z.number().min(0).max(10).default(1.0),
        meta: {
            label: "Beta (Base Weight)",
            description: "Base centrality added to each node",
            step: 0.1,
            advanced: true,
        },
    },
    maxIterations: {
        schema: z.number().int().min(1).max(1000).default(100),
        meta: {
            label: "Max Iterations",
            description: "Maximum iterations",
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
 * Options for the Katz Centrality algorithm
 */
interface KatzCentralityOptions extends Record<string, unknown> {
    /** Attenuation factor - must be less than 1/λmax */
    alpha: number;
    /** Base centrality added to each node */
    beta: number;
    /** Maximum iterations */
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

/** What a Katz result publishes: the uniform node-metric fields and nothing else. */
const KATZ_FIELDS: readonly FieldDescriptor[] = nodeMetricFields({
    plainName: "Influence at a distance",
    technicalName: "Katz score",
});

/**
 * Katz centrality: every path that reaches a node, with a longer path counting for less.
 *
 * It generalises eigenvector centrality by giving every node a base amount of influence whatever
 * its position, which is what keeps a node with no incoming paths from scoring zero.
 */
export class KatzCentralityAlgorithm extends MetricAlgorithm<KatzCentralityOptions> {
    static namespace = "graphty";
    static type = "katz";

    static zodOptionsSchema: ZodOptionsSchema = katzCentralityOptionsSchema;

    static optionsSchema: OptionsSchema = {
        alpha: {
            type: "number",
            default: 0.1,
            label: "Alpha (Attenuation)",
            description: "Attenuation factor - must be less than 1/λmax",
            min: 0.01,
            max: 0.5,
            step: 0.01,
        },
        beta: {
            type: "number",
            default: 1.0,
            label: "Beta (Base Weight)",
            description: "Base centrality added to each node",
            min: 0,
            max: 10,
            step: 0.1,
            advanced: true,
        },
        maxIterations: {
            type: "integer",
            default: 100,
            label: "Max Iterations",
            description: "Maximum iterations",
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
    };

    /**
     * The fields a Katz result publishes.
     * @returns The uniform node-metric fields.
     */
    protected resultFields(): readonly FieldDescriptor[] {
        return KATZ_FIELDS;
    }

    /**
     * Score every node by the paths that reach it.
     * @param context - Where progress goes and where cancellation arrives.
     * @param nodeIds - The nodes to measure.
     * @returns One score per node, scaled as the options asked for.
     */
    protected async measure(context: MetricRunContext, nodeIds: readonly NodeId[]): Promise<MetricMeasurement> {
        const { alpha, beta, maxIterations, tolerance, normalized, mode, endpoints } = this.schemaOptions;

        // Undirected: every neighbour counts as an influence, whichever way the record declared it.
        const graphData = this.algorithmGraph("undirected");

        context.report({
            phase: "iterating",
            completed: 0,
            total: nodeIds.length,
            message: `Attenuated path sums, up to ${String(maxIterations)} passes.`,
        });
        // One synchronous call into `@graphty/algorithms`, which cannot be interrupted from here.
        // The element's own half -- reading the scores back out -- is chunked below.
        const scores = katzCentrality(graphData, {
            normalized,
            alpha,
            beta,
            maxIterations,
            tolerance,
            mode,
            endpoints,
        });
        context.signal.throwIfAborted();

        const nodes: ResultElementValues[] = [];
        await walkInChunks(nodeIds, context, "reading scores", (nodeId) => {
            const score = scores[String(nodeId)];
            nodes.push({ id: nodeId, values: score === undefined ? {} : { value: score } });
        });

        return {
            nodes,
            // With `normalized`, the algorithm rescales so the lowest score is 0 and the highest
            // is 1. Without it the raw attenuated sums are published.
            normalization: normalized ? "min-max" : "none",
            caveats: {
                exact: true,
                direction: "undirected",
                weight: null,
                precision: "f64",
                method: "katz-iteration",
                // `converged` and `iterations` are deliberately absent: the implementation stops
                // either at its tolerance or at its iteration cap and reports neither.
                notes: [
                    `Every node starts with a base influence of ${String(beta)}, and a path of length k contributes ${String(alpha)} to the power k.`,
                    `Iteration stops at a tolerance of ${String(tolerance)} or after ${String(maxIterations)} passes, whichever comes first.`,
                    "Whether it reached the tolerance is not reported by the implementation, so this run cannot say whether it converged.",
                    "Edge weights are not read.",
                ],
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(KatzCentralityAlgorithm);
