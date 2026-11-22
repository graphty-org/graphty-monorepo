import { INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod";

import type { FieldDescriptor, NodeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema, parseOptions } from "../config";
import { caveat, noted } from "../session/runs/caveatFacts";
import { Algorithm } from "./Algorithm";
import type { ScopeInputDeclaration } from "./input/ScopedInput";
import { walkInChunks } from "./metrics/context";
import { metricField, nodeMetricFields } from "./metrics/fields";
import { MetricAlgorithm } from "./metrics/MetricAlgorithm";
import type { MetricMeasurement, MetricRunContext } from "./metrics/types";

/**
 * What a degree result publishes: the uniform node-metric fields, plus the two halves of the
 * count that only a directed graph can tell apart.
 */
const DEGREE_FIELDS: readonly FieldDescriptor[] = [
    ...nodeMetricFields({ plainName: "Connections", technicalName: "degree", type: "integer", unit: "links" }),
    metricField({
        name: "inDegree",
        plainName: "Incoming connections",
        technicalName: "inDegree",
        kind: "node",
        type: "integer",
        directedOnly: true,
    }),
    metricField({
        name: "outDegree",
        plainName: "Outgoing connections",
        technicalName: "outDegree",
        kind: "node",
        type: "integer",
        directedOnly: true,
    }),
];

/** What a degree run can be asked for. */
const degreeOptionsSchema = defineOptions({
    direction: {
        schema: z.enum(["total", "in", "out"]).default("total"),
        meta: {
            label: "Direction",
            description:
                "On a directed graph, which edges the published value counts: incoming (in), outgoing (out) or both (total)",
        },
    },
});

/** The options of a degree run. */
interface DegreeOptions extends Record<string, unknown> {
    /** On a directed graph, which edges `value` counts. */
    direction: "total" | "in" | "out";
}

/**
 * Degree centrality: how many edges each node has.
 *
 * The published `value` is the count the `direction` option names: incoming plus outgoing by
 * default, or only one of them. On a directed graph `inDegree` and `outDegree` are published
 * beside it, because the direction the records declared is a real distinction the total throws
 * away. On an undirected graph there is no such distinction -- which end of an edge was written
 * first is only record order -- so neither is published and `value` is every node's whole degree,
 * whatever `direction` says.
 */
export class DegreeAlgorithm extends MetricAlgorithm<DegreeOptions> {
    static readonly namespace: string = "graphty";
    static readonly type: string = "degree";
    /** Counts over the run's scope: the node list and the graph both come from the input. */
    static readonly scopeInput: ScopeInputDeclaration = "subgraph";

    static readonly zodOptionsSchema: ZodOptionsSchema = degreeOptionsSchema;

    /**
     * Read the options from the Zod schema.
     * @param options - What the caller gave.
     * @returns The options with their defaults.
     */
    protected override resolveOptions(options?: Partial<DegreeOptions>): DegreeOptions {
        return parseOptions(degreeOptionsSchema, options ?? {});
    }

    /**
     * The fields a degree result publishes.
     * @returns The uniform node-metric fields, plus `inDegree` and `outDegree`.
     */
    protected resultFields(): readonly FieldDescriptor[] {
        return DEGREE_FIELDS;
    }

    /**
     * Count every node's edges.
     * @param context - Where progress goes and where cancellation arrives.
     * @param nodeIds - The nodes to measure.
     * @returns One count per node, unscaled.
     */
    protected async measure(context: MetricRunContext, nodeIds: readonly NodeId[]): Promise<MetricMeasurement> {
        /* The declared snapshot, with each group of parallel edges counted once -- the same merge
           every run takes. The dispatcher counts each edge at its declared source and target rather
           than reading the snapshot's degree views: an undirected snapshot's in- and out-degree are
           one array holding the whole degree, so adding them would double it. No accelerator counts
           degrees, so this is the CPU port's decision. */
        const { snapshot, run } = this.accelerated("degrees", "directed");
        const { ids, directed } = snapshot;
        const { direction } = this.schemaOptions;
        const counted = directed ? direction : "total";
        const {
            value: { inDegree: inDegrees, outDegree: outDegrees },
        } = await run((dispatch, s) => dispatch.degrees(s));
        /* Published as columns, not as an object per node: the objects cost more than the counting,
           and how much more depended on the garbage collector's state when the run started (2.5 to
           3x between processes at 800,000 nodes). */
        const measured: NodeId[] = [];
        const value = new Float64Array(nodeIds.length);
        const inDegree = new Float64Array(nodeIds.length);
        const outDegree = new Float64Array(nodeIds.length);

        await walkInChunks(nodeIds, context, "counting-connections", (nodeId) => {
            const index = ids.indexOf(nodeId);

            // A node the snapshot does not hold is left out, so it reads as unmeasured.
            if (index === INVALID_INDEX) {
                return;
            }

            const row = measured.push(nodeId) - 1;
            inDegree[row] = inDegrees[index];
            outDegree[row] = outDegrees[index];
            value[row] = (counted === "out" ? 0 : inDegrees[index]) + (counted === "in" ? 0 : outDegrees[index]);
        });

        const rows = measured.length;

        return {
            nodes: {
                ids: measured,
                columns: directed
                    ? {
                          value: value.subarray(0, rows),
                          inDegree: inDegree.subarray(0, rows),
                          outDegree: outDegree.subarray(0, rows),
                      }
                    : { value: value.subarray(0, rows) },
            },
            // A count of edges, published as it was counted.
            normalization: "none",
            caveats: {
                exact: true,
                direction: directed ? "directed" : "undirected",
                weight: null,
                precision: "f64",
                method: "degree",
                ...noted(directed ? [caveat("degree.as-declared", { direction })] : []),
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(DegreeAlgorithm);
