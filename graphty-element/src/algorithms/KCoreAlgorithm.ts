import { kCoreDecomposition } from "@graphty/algorithms";

import type { FieldDescriptor, NodeId } from "../catalog/types";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import { walkInChunks } from "./metrics/context";
import { nodeMetricFields } from "./metrics/fields";
import { MetricAlgorithm } from "./metrics/MetricAlgorithm";
import type { MetricMeasurement, MetricRunContext } from "./metrics/types";

/** What a k-core result publishes: the uniform node-metric fields, the value being a core number. */
const K_CORE_FIELDS: readonly FieldDescriptor[] = nodeMetricFields({
    plainName: "Core depth",
    technicalName: "core number",
    type: "integer",
});

/**
 * K-core decomposition: how deep in the graph's densely connected core each node sits.
 *
 * A node's core number is the largest k for which it belongs to a k-core -- the largest part of
 * the graph in which every node has at least k neighbours. Every node has one, so every node is
 * measured.
 */
export class KCoreAlgorithm extends MetricAlgorithm {
    static namespace = "graphty";
    static type = "k-core";

    /**
     * The fields a k-core result publishes.
     * @returns The uniform node-metric fields.
     */
    protected resultFields(): readonly FieldDescriptor[] {
        return K_CORE_FIELDS;
    }

    /**
     * Give every node its core number.
     * @param context - Where progress goes and where cancellation arrives.
     * @param nodeIds - The nodes to measure.
     * @returns One core number per node.
     */
    protected async measure(context: MetricRunContext, nodeIds: readonly NodeId[]): Promise<MetricMeasurement> {
        // Undirected: a core counts neighbours, whichever way the record declared the edge.
        const graphData = this.algorithmGraph("undirected");

        context.report({ phase: "peeling cores", total: null });
        // One synchronous call into `@graphty/algorithms`, which cannot be interrupted from here.
        const { coreness } = kCoreDecomposition(graphData);
        context.signal.throwIfAborted();

        const nodes: ResultElementValues[] = [];
        await walkInChunks(nodeIds, context, "reading core numbers", (nodeId) => {
            const core = coreness.get(String(nodeId));
            nodes.push({ id: nodeId, values: core === undefined ? {} : { value: core } });
        });

        return {
            nodes,
            // A count of neighbours, published as it was counted.
            normalization: "none",
            caveats: {
                exact: true,
                direction: "undirected",
                weight: null,
                precision: "f64",
                method: "k-core",
                notes: ["Counted over the graph read as undirected; edge weights are not read."],
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(KCoreAlgorithm);
