import { INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod/v4";

import type { FieldDescriptor, NodeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import { releaseOnAccelerator, type ScopeInputDeclaration } from "./input/ScopedInput";
import { walkInChunks } from "./metrics/context";
import { nodeMetricFields } from "./metrics/fields";
import { MetricAlgorithm } from "./metrics/MetricAlgorithm";
import type { MetricMeasurement, MetricRunContext } from "./metrics/types";
import type { OptionsSchema } from "./types/OptionSchema";
import { refuseEndpoints } from "./utils/graphUtils";

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
            description: "Which paths count: arriving along each edge's direction (in), leaving (out), or either way (total)",
            advanced: true,
        },
    },
    endpoints: {
        schema: z.boolean().default(false),
        meta: {
            label: "Include Endpoints",
            description: "Not supported: this method walks no paths, so a run with it switched on is refused. Leave it off",
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
    /** Which paths count: arriving along each edge's direction ("in"), leaving ("out"), or either way ("total") */
    mode: "in" | "out" | "total";
    /** Not supported: Katz walks no paths end to end, so `true` is refused */
    endpoints: boolean;
}

/** What a Katz result publishes: the uniform node-metric fields and nothing else. */
const KATZ_FIELDS: readonly FieldDescriptor[] = nodeMetricFields({
    plainName: "Influence at a distance",
    technicalName: "Katz score",
});

/** Which paths were counted, by the `mode` option, in a sentence a reader can read. */
const MODE_NOTES: Readonly<Record<KatzCentralityOptions["mode"], string>> = {
    in: "Paths were counted arriving at each node, along the direction each edge was declared in.",
    out: "Paths were counted leaving each node, along the direction each edge was declared in.",
    total: "Paths were counted over the graph read as undirected, so an edge carries influence both ways.",
};

/**
 * Katz centrality: every path that reaches a node, with a longer path counting for less.
 *
 * It generalises eigenvector centrality by giving every node a base amount of influence whatever
 * its position, which is what keeps a node with no incoming paths from scoring zero.
 */
export class KatzCentralityAlgorithm extends MetricAlgorithm<KatzCentralityOptions> {
    static namespace = "graphty";
    static type = "katz";
    /** Computes over the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

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
            description: "Which paths count: arriving along each edge's direction (in), leaving (out), or either way (total)",
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
            description: "Not supported: this method walks no paths, so a run with it switched on is refused. Leave it off",
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
        refuseEndpoints("Katz centrality", endpoints);

        /* `"total"`, the default: every neighbour counts as an influence, whichever way the record
           declared the edge. `"in"` counts the paths that ARRIVE at a node along the declared
           direction, which is what the port reads off a directed snapshot; `"out"` counts the
           paths that LEAVE it, which is the same reading over the transposed snapshot. A graph
           loaded undirected has no direction to keep, so every mode reads it undirected. */
        const direction = mode !== "total" && this.input("declared").graph.directed ? "directed" : "undirected";
        const { snapshot, run } = this.accelerated("katzCentrality", direction);
        // Built here, per run and uncached, so it is released here: an accelerator that uploaded it
        // would otherwise hold it until its device is torn down.
        const transposed = mode === "out" && direction === "directed" ? snapshot.transpose().snapshot : null;

        context.report({
            phase: "iterating",
            completed: 0,
            total: nodeIds.length,
            message: `Attenuated path sums, up to ${String(maxIterations)} passes.`,
        });
        let outcome;
        try {
            outcome = await run((dispatch, s) =>
                dispatch.katzCentrality(transposed ?? s, { alpha, beta, maxIterations, tolerance, normalized }),
            );
        } finally {
            if (transposed !== null) {
                releaseOnAccelerator(this.graph, transposed);
            }
        }
        const { value: result, precision } = outcome;
        context.signal.throwIfAborted();

        const { ids } = snapshot;
        const nodes: ResultElementValues[] = [];
        await walkInChunks(nodeIds, context, "reading scores", (nodeId) => {
            const index = ids.indexOf(nodeId);
            nodes.push({ id: nodeId, values: index === INVALID_INDEX ? {} : { value: result.scores[index] } });
        });

        return {
            nodes,
            // With `normalized`, the algorithm rescales so the lowest score is 0 and the highest
            // is 1. Without it the raw attenuated sums are published.
            normalization: normalized ? "min-max" : "none",
            caveats: {
                exact: true,
                direction,
                weight: null,
                precision,
                method: "katz-iteration",
                converged: result.converged,
                iterations: result.iterations,
                notes: [
                    `Every node starts with a base influence of ${String(beta)}, and a path of length k contributes ${String(alpha)} to the power k.`,
                    MODE_NOTES[mode],
                    `Iteration stops at a tolerance of ${String(tolerance)} or after ${String(maxIterations)} passes, whichever comes first.`,
                    "Edge weights are not read.",
                ],
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(KatzCentralityAlgorithm);
