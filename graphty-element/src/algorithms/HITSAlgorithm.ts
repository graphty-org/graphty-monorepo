import { INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod/v4";

import type { FieldDescriptor, NodeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import type { ScopeInputDeclaration } from "./input/ScopedInput";
import { walkInChunks } from "./metrics/context";
import { metricField, nodeMetricFields } from "./metrics/fields";
import { MetricAlgorithm } from "./metrics/MetricAlgorithm";
import type { MetricMeasurement, MetricRunContext } from "./metrics/types";
import type { OptionsSchema } from "./types/OptionSchema";
import { refuseEndpoints } from "./utils/graphUtils";

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
            description: "Which score is the published value: authority (in), hub (out) or their average (total)",
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
 * Options for the HITS algorithm
 */
interface HITSOptions extends Record<string, unknown> {
    /** Maximum iterations for hub/authority computation */
    maxIterations: number;
    /** Convergence threshold */
    tolerance: number;
    /** Whether to normalize the final scores */
    normalized: boolean;
    /** Which score is the published value: authority ("in"), hub ("out") or their average ("total") */
    mode: "in" | "out" | "total";
    /** Not supported: HITS walks no paths, so `true` is refused */
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

/** Which score becomes the published `value`, by the `mode` option. */
const PUBLISHED_HALF: Readonly<Record<HITSOptions["mode"], (hub: number, authority: number) => number>> = {
    in: (_hub, authority) => authority,
    out: (hub) => hub,
    total: (hub, authority) => (hub + authority) / 2,
};

/** What the published `value` is, by the `mode` option, in a sentence a reader can read. */
const MODE_NOTES: Readonly<Record<HITSOptions["mode"], string>> = {
    in: "The published value is this node's authority score: how well the nodes pointing at it point.",
    out: "The published value is this node's hub score: how well the nodes it points at are pointed at.",
    total: "The published value is the average of this node's hub score and its authority score.",
};

/**
 * HITS: every node scored twice, as a hub and as an authority.
 *
 * An authority is a node that good hubs point at; a hub is a node that points at good
 * authorities. The published `value` is the average of the two by default -- the authority score
 * for `mode: "in"`, the hub score for `mode: "out"` -- because one number is what a colour ramp or
 * a size can be bound to; `hub` and `authority` are published beside it, because the two halves
 * are the reason to run HITS rather than PageRank.
 */
export class HITSAlgorithm extends MetricAlgorithm<HITSOptions> {
    static namespace = "graphty";
    static type = "hits";
    /** Computes over the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

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
            description: "Which score is the published value: authority (in), hub (out) or their average (total)",
            options: [
                { value: "total", label: "Average of hub and authority" },
                { value: "in", label: "Authority score" },
                { value: "out", label: "Hub score" },
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
        refuseEndpoints("HITS", endpoints);

        // Directed: hubs and authorities are the out- and in-directions, so HITS is meaningless
        // without them. On data with no real direction every score simply converges together.
        const { snapshot, run } = this.accelerated("hits", "directed");

        context.report({
            phase: "iterating",
            completed: 0,
            total: nodeIds.length,
            message: `Hub and authority scores refine each other, up to ${String(maxIterations)} passes.`,
        });
        const { value: results, precision } = await run((dispatch, s) =>
            // Edge weights are not read (the caveat says so); @graphty/algorithms reads them by default.
            dispatch.hits(s, { maxIterations, tolerance, normalized, weighted: false }),
        );
        context.signal.throwIfAborted();

        const { ids } = snapshot;
        const nodes: ResultElementValues[] = [];
        await walkInChunks(nodeIds, context, "reading scores", (nodeId) => {
            const index = ids.indexOf(nodeId);

            if (index === INVALID_INDEX) {
                nodes.push({ id: nodeId, values: {} });

                return;
            }

            const hub = results.hubs[index];
            const authority = results.authorities[index];
            nodes.push({ id: nodeId, values: { value: PUBLISHED_HALF[mode](hub, authority), hub, authority } });
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
                precision,
                method: "hits",
                converged: results.converged,
                iterations: results.iterations,
                notes: [
                    MODE_NOTES[mode],
                    normalized
                        ? "The hub and authority vectors each have unit length, which is how the iteration leaves them."
                        : "The hub and authority vectors were each divided by their own highest score.",
                    `Iteration stops at a tolerance of ${String(tolerance)} or after ${String(maxIterations)} passes, whichever comes first.`,
                    ...(results.converged
                        ? []
                        : [`It stopped at the ${String(maxIterations)}-pass cap without reaching the tolerance.`]),
                    "Edge weights are not read.",
                ],
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(HITSAlgorithm);
