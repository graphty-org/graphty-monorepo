import { INVALID_INDEX } from "@graphty/graph-format";

import type { FieldDescriptor, NodeId } from "../catalog/types";
import type { ResultElementValues } from "../session/results";
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
    }),
    metricField({
        name: "outDegree",
        plainName: "Outgoing connections",
        technicalName: "outDegree",
        kind: "node",
        type: "integer",
    }),
];

/**
 * Degree centrality: how many edges each node has.
 *
 * The published `value` is the total count, incoming plus outgoing. `inDegree` and `outDegree`
 * are published beside it because the direction the records declared is a real distinction the
 * total throws away.
 */
export class DegreeAlgorithm extends MetricAlgorithm {
    static namespace = "graphty";
    static type = "degree";
    /** Counts over the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

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
        const { ids } = snapshot;
        const {
            value: { inDegree: inDegrees, outDegree: outDegrees },
        } = await run((dispatch, s) => dispatch.degrees(s));
        const nodes: ResultElementValues[] = [];

        await walkInChunks(nodeIds, context, "counting connections", (nodeId) => {
            const index = ids.indexOf(nodeId);

            if (index === INVALID_INDEX) {
                nodes.push({ id: nodeId, values: {} });

                return;
            }

            const inDegree = inDegrees[index];
            const outDegree = outDegrees[index];
            nodes.push({ id: nodeId, values: { value: inDegree + outDegree, inDegree, outDegree } });
        });

        return {
            nodes,
            // A count of edges, published as it was counted.
            normalization: "none",
            caveats: {
                exact: true,
                direction: "directed",
                weight: null,
                precision: "f64",
                method: "degree",
                notes: [
                    "Counted over the graph as the records declared it, so a node's total is its incoming edges plus its outgoing ones.",
                ],
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(DegreeAlgorithm);
