import { betweennessCentrality } from "@graphty/algorithms";

import type { FieldDescriptor, NodeId } from "../catalog/types";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import { walkInChunks } from "./metrics/context";
import { nodeMetricFields } from "./metrics/fields";
import { MetricAlgorithm } from "./metrics/MetricAlgorithm";
import type { MetricMeasurement, MetricRunContext } from "./metrics/types";

/** What a betweenness result publishes: the uniform node-metric fields and nothing else. */
const BETWEENNESS_FIELDS: readonly FieldDescriptor[] = nodeMetricFields({
    plainName: "Bridging",
    technicalName: "betweenness",
});

/**
 * Betweenness centrality: how many of the shortest paths between other nodes run through a node.
 *
 * The published `value` is the raw path count, halved because a shortest path in an undirected
 * graph is reached from both ends. It is not scaled: a graph-level `min` and `max` sit on the
 * result, so a consumer that wants a 0-to-1 value has the range to make one with.
 */
export class BetweennessCentralityAlgorithm extends MetricAlgorithm {
    static namespace = "graphty";
    static type = "betweenness";

    /**
     * The fields a betweenness result publishes.
     * @returns The uniform node-metric fields.
     */
    protected resultFields(): readonly FieldDescriptor[] {
        return BETWEENNESS_FIELDS;
    }

    /**
     * Score every node by the shortest paths that run through it.
     * @param context - Where progress goes and where cancellation arrives.
     * @param nodeIds - The nodes to measure.
     * @returns One raw path count per node, unscaled.
     */
    protected async measure(context: MetricRunContext, nodeIds: readonly NodeId[]): Promise<MetricMeasurement> {
        // Undirected: a shortest path may cross an edge in either direction, and betweenness halves
        // its raw counts for an undirected input because each pair is then reached twice.
        const graphData = this.algorithmGraph("undirected");

        context.report({
            phase: "tracing shortest paths",
            completed: 0,
            total: nodeIds.length,
            message: "Brandes runs a breadth-first search from every node.",
        });
        // Brandes is one synchronous call into `@graphty/algorithms` and cannot be interrupted
        // from here. The element's own half -- reading the scores back out -- is chunked below.
        const scores = betweennessCentrality(graphData);
        context.signal.throwIfAborted();

        const nodes: ResultElementValues[] = [];
        await walkInChunks(nodeIds, context, "reading scores", (nodeId) => {
            const score = scores[String(nodeId)];
            nodes.push({ id: nodeId, values: score === undefined ? {} : { value: score } });
        });

        return {
            nodes,
            // Raw counts. `options.normalized` is not set, so nothing rescales them.
            normalization: "none",
            caveats: {
                exact: true,
                direction: "undirected",
                weight: null,
                precision: "f64",
                method: "brandes",
                notes: [
                    "Every shortest path is counted exactly, over the graph read as undirected.",
                    "The raw counts are halved, because an undirected shortest path is reached from both ends.",
                    "Path lengths count edges; edge weights are not read.",
                ],
            },
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(BetweennessCentralityAlgorithm);
