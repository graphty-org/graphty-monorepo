import { z } from "zod";

import type { FieldDescriptor, NodeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import { caveat, noted } from "../session/runs/caveatFacts";
import { Algorithm } from "./Algorithm";
import type { ScopeInputDeclaration } from "./input/ScopedInput";
import { nodeMetricFields } from "./metrics/fields";
import { MetricAlgorithm } from "./metrics/MetricAlgorithm";
import {
    converged,
    convergenceOptions,
    convergenceZodOptions,
    endpointsOption,
    endpointsZodOption,
    readScores,
} from "./metrics/powerIteration";
import type { MetricMeasurement, MetricRunContext } from "./metrics/types";
import type { OptionsSchema } from "./types/OptionSchema";
import { refuseEndpoints } from "./utils/graphUtils";

/**
 * Zod-based options schema for Eigenvector Centrality algorithm
 */
const eigenvectorCentralityOptionsSchema = defineOptions({
    maxIterations: {
        schema: z.number().int().min(1).max(10000).default(1000),
        meta: {
            label: "Max Iterations",
            description: "Maximum power iterations",
            advanced: true,
        },
    },
    ...convergenceZodOptions,
    mode: {
        schema: z.enum(["in", "out", "total"]).default("total"),
        meta: {
            label: "Direction Mode",
            description:
                "On a directed graph, score a node by the nodes pointing at it (in), the nodes it points at (out), or ignore direction (total)",
            advanced: true,
        },
    },
    ...endpointsZodOption,
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
    /** On a directed graph: score by the nodes pointing in ("in"), out ("out"), or either ("total") */
    mode: "in" | "out" | "total";
    /** Not supported: this method walks no paths, so `true` is refused */
    endpoints: boolean;
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
    static readonly namespace: string = "graphty";
    static readonly type: string = "eigenvector";
    static readonly scopeInput: ScopeInputDeclaration = "subgraph";

    static readonly zodOptionsSchema: ZodOptionsSchema = eigenvectorCentralityOptionsSchema;

    static readonly optionsSchema: OptionsSchema = {
        maxIterations: {
            type: "integer",
            default: 1000,
            label: "Max Iterations",
            description: "Maximum power iterations",
            min: 1,
            max: 10000,
            advanced: true,
        },
        ...convergenceOptions,
        mode: {
            type: "select",
            default: "total",
            label: "Direction Mode",
            description:
                "On a directed graph, score a node by the nodes pointing at it (in), the nodes it points at (out), or ignore direction (total)",
            options: [
                { value: "total", label: "Total (both directions)" },
                { value: "in", label: "In-degree (incoming edges)" },
                { value: "out", label: "Out-degree (outgoing edges)" },
            ],
            advanced: true,
        },
        ...endpointsOption,
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
        refuseEndpoints("Eigenvector centrality", endpoints);

        // "total" (the default), or a graph loaded undirected: influence flows across an edge in
        // either direction. "in" and "out" on a directed graph keep the declared direction and let
        // the algorithm pick which edges feed a node.
        const directed = mode !== "total" && this.input("declared").graph.directed;
        const { snapshot, run } = this.accelerated("eigenvectorCentrality", directed ? "directed" : "undirected");
        const { ids } = snapshot;

        context.report({ phase: "iterating", completed: 0, total: nodeIds.length, params: { maxIterations } });
        const {
            value: { scores },
            precision,
        } = await converged(
            context,
            {
                algorithm: `${EigenvectorCentralityAlgorithm.namespace}:${EigenvectorCentralityAlgorithm.type}`,
                name: "Eigenvector centrality",
                advice: "Raise the maxIterations param (up to 10000), or loosen tolerance, and run it again.",
                maxIterations,
                tolerance,
            },
            run((dispatch, s) => dispatch.eigenvectorCentrality(s, { normalized, maxIterations, tolerance, mode })),
        );
        context.signal.throwIfAborted();
        const nodes = await readScores(context, nodeIds, ids, scores);

        return {
            nodes,
            // With `normalized`, the algorithm rescales its eigenvector so the lowest score is 0
            // and the highest is 1. Without it the raw unit-length eigenvector is published.
            normalization: normalized ? "min-max" : "none",
            caveats: {
                exact: true,
                direction: directed ? "directed" : "undirected",
                weight: null,
                precision,
                method: "power-iteration",
                // Measured, not assumed: the algorithm throws when it hits its iteration cap, and
                // that becomes E_NOT_CONVERGED above, so a result exists only when it converged.
                converged: true,
                ...noted([
                    caveat("eigenvector.converged", { tolerance, maxIterations }),
                    ...(directed ? [caveat("eigenvector.scored-by", { mode })] : []),
                    caveat("weights.unread"),
                ]),
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(EigenvectorCentralityAlgorithm);
