import { closenessCentrality } from "@graphty/algorithms";

import type { FieldDescriptor, NodeId } from "../catalog/types";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import { walkInChunks } from "./metrics/context";
import { nodeMetricFields } from "./metrics/fields";
import { MetricAlgorithm } from "./metrics/MetricAlgorithm";
import type { MetricMeasurement, MetricRunContext } from "./metrics/types";

/** What a closeness result publishes: the uniform node-metric fields and nothing else. */
const CLOSENESS_FIELDS: readonly FieldDescriptor[] = nodeMetricFields({
    plainName: "Reach",
    technicalName: "closeness",
});

/**
 * Closeness centrality: how short a node's paths to the rest of the graph are.
 *
 * The published `value` is the algorithm's own figure, unscaled. A graph-level `min` and `max`
 * sit on the result, so a consumer that wants a 0-to-1 value has the range to make one with.
 */
export class ClosenessCentralityAlgorithm extends MetricAlgorithm {
    static namespace = "graphty";
    static type = "closeness";

    /**
     * The fields a closeness result publishes.
     * @returns The uniform node-metric fields.
     */
    protected resultFields(): readonly FieldDescriptor[] {
        return CLOSENESS_FIELDS;
    }

    /**
     * Score every node by how short its paths to the rest of the graph are.
     * @param context - Where progress goes and where cancellation arrives.
     * @param nodeIds - The nodes to measure.
     * @returns One score per node, unscaled.
     */
    protected async measure(context: MetricRunContext, nodeIds: readonly NodeId[]): Promise<MetricMeasurement> {
        // Undirected: closeness here measures distance, which ignores the declared direction.
        const graphData = this.algorithmGraph("undirected");

        context.report({
            phase: "measuring distances",
            completed: 0,
            total: nodeIds.length,
            message: "A breadth-first search runs from every node.",
        });
        // One synchronous call into `@graphty/algorithms`, which cannot be interrupted from here.
        // The element's own half -- reading the scores back out -- is chunked below.
        const scores = closenessCentrality(graphData);
        context.signal.throwIfAborted();

        const nodes: ResultElementValues[] = [];
        await walkInChunks(nodeIds, context, "reading scores", (nodeId) => {
            const score = scores[String(nodeId)];
            nodes.push({ id: nodeId, values: score === undefined ? {} : { value: score } });
        });

        return {
            nodes,
            // The algorithm's own figure, published as it was computed.
            normalization: "none",
            caveats: {
                exact: true,
                direction: "undirected",
                weight: null,
                precision: "f64",
                method: "closeness-bfs",
                notes: [
                    "Distances are exact, measured over the graph read as undirected.",
                    "Distance counts edges; edge weights are not read.",
                    "A score is the reciprocal of the total distance to the nodes this one can reach, with no correction for how many that is, so a node in a small component scores as though it reached the whole graph.",
                ],
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(ClosenessCentralityAlgorithm);
