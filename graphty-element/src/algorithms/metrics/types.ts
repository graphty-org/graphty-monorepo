/**
 * @file What a metric algorithm is given while it measures, and what it hands back.
 *
 * A metric run has two vocabularies and they are deliberately kept apart here. The run context is
 * what the work is given -- a signal it must throw from, a place to report progress, and a way to
 * give the frame back. The measurement is what the work produces: one value per node and the
 * honest qualification of those numbers, and nothing else.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: it is interfaces over plain data.
 */

import type { Normalization, ResultElementValues } from "../../session/results";
import type { Caveats, RunProgressReport } from "../../session/runs";

// ---------------------------------------------------------------------------------------------
// What a measurement is given
// ---------------------------------------------------------------------------------------------

/**
 * Where a metric algorithm writes its progress, and where it learns it has been stopped.
 *
 * This is the subset of the run machinery's execution context that a measurement actually uses,
 * so the bridge that will start these algorithms from `session.runs.start` hands its own context
 * straight through rather than translating one shape into another.
 *
 * `yieldNow` is the member the run context does not carry, and it is the one that decides whether
 * a graph big enough to be interesting is usable: a measurement that never gives the frame back
 * locks the screen for as long as it takes, whatever the progress bar says.
 */
export interface MetricRunContext {
    /** The run id the result is published under, which is the `<runId>` in `results.<runId>`. */
    readonly runId: string;
    /** Aborted when the run is cancelled. A measurement throws from it rather than swallowing it. */
    readonly signal: AbortSignal;
    /**
     * Report how far along the measurement is.
     * @param progress - What changed since the last report.
     */
    report(progress: RunProgressReport): void;
    /**
     * Give the host a turn before the next chunk of work.
     * @returns A promise that settles once the host has had a chance to paint.
     */
    yieldNow(): Promise<void>;
}

// ---------------------------------------------------------------------------------------------
// What a measurement produces
// ---------------------------------------------------------------------------------------------

/**
 * What one metric algorithm measured.
 *
 * Only the primary `value` and whatever extra per-node numbers the algorithm genuinely computed
 * are here. The rank, the percentile and every graph-level statistic are filled in by
 * `createRunResult` from this column, once, so that no algorithm has its own opinion about what
 * "the highest value" means.
 */
export interface MetricMeasurement {
    /** One entry per measured node, in the order the result's column reads them. */
    readonly nodes: readonly ResultElementValues[];
    /**
     * How the published `value` was scaled before publication.
     *
     * This is a fact about the run rather than about the algorithm -- eigenvector centrality
     * publishes min-max scaled values with its default options and raw ones without them -- which
     * is why it is measured here and not declared in the catalogue.
     */
    readonly normalization: Normalization;
    /** What qualifies these numbers: the method, the direction, the weight and the convergence. */
    readonly caveats: Caveats;
}
