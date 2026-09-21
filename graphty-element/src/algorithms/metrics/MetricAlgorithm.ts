/**
 * @file The pipeline every node-metric algorithm runs through.
 *
 * Before this existed, running a metric meant `runAlgorithm(namespace, type): Promise<void>`: the
 * numbers were pushed onto render objects as a side effect, each algorithm chose its own names
 * for them, and the only way back to a result was to walk the graph looking for it. The element's
 * one consumer paid for that twice over -- 923 lines reconstructing rankings, ranges and
 * histograms the element never published, and a 449-line model of the element's own performance
 * because nothing said what a run would cost or how far along it was.
 *
 * So a metric now measures, and the element publishes. The algorithm returns one value per node
 * and the honest qualification of those numbers; `createRunResult` fills the rank, the percentile
 * and every graph-level statistic from that column, once, in the same arithmetic for every
 * metric. That result is the source of truth, and a style layer reads it at
 * `results.<runId>.<field>`.
 */

import type { FieldDescriptor, NodeId } from "../../catalog/types";
import { createRunResult, type RunResult } from "../../session/results";
import { Algorithm } from "../Algorithm";
import type { AlgorithmRunContext } from "../results/types";
import { detachedRunContext } from "./context";
import type { MetricMeasurement, MetricRunContext } from "./types";

/**
 * A metric: an algorithm that measures one number for every node.
 *
 * A subclass says what its fields are called and how to measure them. It never writes a result
 * itself, which is what makes "the uniform fields are filled for every metric" a property of the
 * code rather than a promise in a document.
 */
export abstract class MetricAlgorithm<
    TOptions extends Record<string, unknown> = Record<string, unknown>,
> extends Algorithm<TOptions> {
    /** What the last run published, kept so a caller that has the algorithm can read the result. */
    #result: RunResult | undefined;

    /**
     * What the last run published.
     * @returns The result, or undefined when nothing has run or the graph was empty.
     */
    get result(): RunResult | undefined {
        return this.#result;
    }

    /**
     * Run the algorithm.
     *
     * This is the 1.10 entry point and it still returns nothing, because `AlgorithmManager` and
     * every caller behind `element.runAlgorithm` still expect that. It publishes a result all the
     * same: read {@link MetricAlgorithm.result}, or call {@link MetricAlgorithm.measureRun} with a
     * run context to get one back.
     * @returns A promise that settles once the result has been published.
     */
    async run(): Promise<void> {
        await this.measureRun(detachedRunContext(this.type));
    }

    /**
     * Measure the graph on behalf of a run, and hand the result back.
     *
     * The run machinery's entry point. A metric's own context is its run context plus the run id,
     * so this is the whole of the translation.
     * @param context - A signal, a progress channel and a yield.
     * @param runId - The id the result is published under.
     * @returns The result, or undefined when there was nothing to measure.
     * @throws Whatever the context's signal throws once the run has been cancelled.
     */
    publishResult(context: AlgorithmRunContext, runId: string): Promise<RunResult | undefined> {
        return this.measureRun({ runId, ...context });
    }

    /**
     * Measure the graph, publish the result, and project the 1.10 view from it.
     * @param context - Where progress goes, where cancellation arrives, and which run id to
     *   publish under.
     * @returns The result, or undefined when there was nothing to measure.
     * @throws Whatever the context's signal throws once the run has been cancelled, which is a
     *   `DOMException` named `AbortError`.
     */
    async measureRun(context: MetricRunContext): Promise<RunResult | undefined> {
        const data = this.graph.getDataManager();
        const nodeIds = Array.from(data.nodes.keys());

        if (nodeIds.length === 0) {
            return undefined;
        }

        const startedAt = Date.now();
        const measurement = await this.measure(context, nodeIds);

        const result = createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: this.resultFields(),
            measured: { nodes: nodeIds.length, edges: data.edges.size },
            // The only graph-level field a metric publishes itself. Everything else the shape
            // promises -- the range, the average, how many elements were measured, how many sit at
            // the bottom -- is computed from the column the measurement produced.
            graph: { normalization: measurement.normalization },
            nodes: measurement.nodes,
            caveats: measurement.caveats,
            durationMs: Date.now() - startedAt,
        });

        this.#result = result;

        return result;
    }

    /**
     * The fields this metric publishes, which are the shape's uniform ones plus its own.
     * @returns The field list, which must equal the catalogue's for this algorithm.
     */
    protected abstract resultFields(): readonly FieldDescriptor[];

    /**
     * Measure every node.
     * @param context - Where progress goes and where cancellation arrives.
     * @param nodeIds - The nodes to measure, in the graph's own order.
     * @returns One value per node, how they were scaled, and what qualifies them.
     */
    protected abstract measure(
        context: MetricRunContext,
        nodeIds: readonly NodeId[],
    ): Promise<MetricMeasurement>;
}
