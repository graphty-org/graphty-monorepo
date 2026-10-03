import { ConvergenceError } from "@graphty/algorithms";
import { z } from "zod/v4";

import type { AccelerationPrecision } from "../acceleration/types";
import type { FieldDescriptor, NodeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import { GraphtyError } from "../errors";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import type { ScopeInputDeclaration } from "./input/ScopedInput";
import { walkInChunks } from "./metrics/context";
import { nodeMetricFields } from "./metrics/fields";
import { MetricAlgorithm } from "./metrics/MetricAlgorithm";
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
            description:
                "On a directed graph, score a node by the nodes pointing at it (in), the nodes it points at (out), or ignore direction (total)",
            advanced: true,
        },
    },
    endpoints: {
        schema: z.boolean().default(false),
        meta: {
            label: "Include Endpoints",
            description:
                "Not supported: this method walks no paths, so a run with it switched on is refused. Leave it off",
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
    /** On a directed graph: score by the nodes pointing in ("in"), out ("out"), or either ("total") */
    mode: "in" | "out" | "total";
    /** Not supported: this method walks no paths, so `true` is refused */
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
    static scopeInput: ScopeInputDeclaration = "subgraph";

    static zodOptionsSchema: ZodOptionsSchema = eigenvectorCentralityOptionsSchema;

    static optionsSchema: OptionsSchema = {
        maxIterations: {
            type: "integer",
            default: 1000,
            label: "Max Iterations",
            description: "Maximum power iterations",
            min: 1,
            max: 10000,
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
            description:
                "On a directed graph, score a node by the nodes pointing at it (in), the nodes it points at (out), or ignore direction (total)",
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
            description:
                "Not supported: this method walks no paths, so a run with it switched on is refused. Leave it off",
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
        refuseEndpoints("Eigenvector centrality", endpoints);
        // Map types are programmatic-only (not in schema)
        const startVector = this._schemaOptions.startVector ?? undefined;

        // "total" (the default), or a graph loaded undirected: influence flows across an edge in
        // either direction. "in" and "out" on a directed graph keep the declared direction and let
        // the algorithm pick which edges feed a node.
        const directed = mode !== "total" && this.input("declared").graph.directed;
        const { snapshot, run } = this.accelerated("eigenvectorCentrality", directed ? "directed" : "undirected");
        const { ids } = snapshot;

        context.report({
            phase: "iterating",
            completed: 0,
            total: nodeIds.length,
            message: `Power iteration, up to ${String(maxIterations)} passes.`,
        });
        let scores: ArrayLike<number>;
        let precision: AccelerationPrecision;
        try {
            ({
                value: { scores },
                precision,
            } = await run((dispatch, s) =>
                dispatch.eigenvectorCentrality(s, {
                    normalized,
                    maxIterations,
                    tolerance,
                    mode,
                    // Edge weights are not read (the caveat says so); @graphty/algorithms reads them by default.
                    weighted: false,
                    // Keyed by node id; a node the map does not name starts at 1, as it always has.
                    startVector:
                        startVector === undefined
                            ? undefined
                            : Float64Array.from(
                                  { length: s.nodeCount },
                                  (_, i) => startVector.get(String(ids.idOf(i))) ?? 1,
                              ),
                }),
            ));
        } catch (error) {
            // On the device path the controller reports the failure as its own, with the
            // algorithm's error as the cause; either way an unconverged run is E_NOT_CONVERGED.
            const convergence = error instanceof Error && !(error instanceof ConvergenceError) ? error.cause : error;
            if (!(convergence instanceof ConvergenceError)) {
                throw error;
            }
            const algorithm = `${EigenvectorCentralityAlgorithm.namespace}:${EigenvectorCentralityAlgorithm.type}`;
            throw new GraphtyError({
                code: "E_NOT_CONVERGED",
                message:
                    `Eigenvector centrality did not converge in ${String(maxIterations)} iterations (tolerance ${String(tolerance)}). ` +
                    "Raise the maxIterations param (up to 10000), or loosen tolerance, and run it again.",
                source: "run",
                target: { kind: "run", id: context.runId },
                details: { algorithm, maxIterations, tolerance },
                cause: convergence,
            });
        }
        context.signal.throwIfAborted();

        const nodes: ResultElementValues[] = [];
        await walkInChunks(nodeIds, context, "reading scores", (nodeId) => {
            const score = scores[ids.indexOf(nodeId)];
            nodes.push({ id: nodeId, values: score === undefined ? {} : { value: score } });
        });

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
                notes: [
                    `Power iteration reached a tolerance of ${String(tolerance)} within ${String(maxIterations)} passes.`,
                    ...(directed
                        ? [
                              mode === "in"
                                  ? "A node is scored by the nodes whose edges point at it."
                                  : "A node is scored by the nodes its edges point at.",
                          ]
                        : []),
                    "Edge weights are not read.",
                ],
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(EigenvectorCentralityAlgorithm);
