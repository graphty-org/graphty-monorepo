/**
 * @file Which analysis this graph can support, what each would cost, and which of them have
 * already been run.
 *
 * Nothing here is new work. The catalogue already declares every algorithm the element ships and
 * what each one requires of a graph; the cost model already answers, synchronously, what one of
 * them would take over the scope a run would actually cover, and already reports a requirement the
 * graph does not meet as `available: false` with a sentence rather than a throw; and the runs API
 * already holds which algorithms this session has run. This file is the assembly of those three
 * into the one answer a metrics panel needs, so that a consumer stops writing the loop itself.
 *
 * The assembly belongs to the element for the reason the cost model's own file states: the element
 * is the only party that knows what its own work costs and can time it, and the one consumer that
 * modelled this package's internals for itself was wrong by 6.9x at 200,000 nodes.
 *
 * Every metric is listed, including the ones this graph cannot support, because a list that
 * silently drops them cannot say WHY a metric is missing. `available` plus `reason` is the
 * difference between a greyed-out card that explains itself and a card nobody can find.
 */

import type { AlgorithmDescriptor, AlgorithmKey, MetricAvailability, RunId } from "../catalog/types";
import type { CostEstimate } from "./cost";

/**
 * One run, as a metric listing reads it: which algorithm it ran, under which id.
 *
 * Not exported: a consumer never builds one of these. It is the shape the session hands in, and
 * `Run` already satisfies it.
 */
interface MetricRunRecord {
    /** The run id, which is what a consumer hands back to read the result. */
    readonly id: RunId;
    /** Which algorithm it ran. */
    readonly algorithm: AlgorithmKey;
}

/**
 * The three things a metric listing reads, each of which the session already maintains.
 *
 * Declared as a seam rather than taken as a session so that the assembly is testable against a
 * fixed catalogue and a fixed cost model, and so that nothing here has to know how a session
 * resolves a scope.
 */
export interface MetricsSource {
    /**
     * Every algorithm the element can run.
     * @returns The descriptors.
     */
    algorithms(): readonly AlgorithmDescriptor[];
    /**
     * What one algorithm would cost on this graph, over the scope a run of it would cover.
     * @param algorithm - Which algorithm.
     * @returns The estimate, which reports `available: false` with a reason rather than throwing.
     */
    estimate(algorithm: AlgorithmKey): CostEstimate;
    /**
     * Every run this session holds, in the order they were started.
     * @returns The runs.
     */
    runs(): readonly MetricRunRecord[];
}

/**
 * Which run ids belong to each algorithm.
 * @param runs - Every run the session holds.
 * @returns The run ids by algorithm, each list in the order the runs were started.
 */
function runIdsByAlgorithm(runs: readonly MetricRunRecord[]): ReadonlyMap<AlgorithmKey, RunId[]> {
    const byAlgorithm = new Map<AlgorithmKey, RunId[]>();

    for (const run of runs) {
        const held = byAlgorithm.get(run.algorithm);

        if (held === undefined) {
            byAlgorithm.set(run.algorithm, [run.id]);
        } else {
            held.push(run.id);
        }
    }

    return byAlgorithm;
}

/**
 * Every metric the element could compute on this graph, with what it would cost and whether it
 * has been run.
 *
 * The estimate is taken over the session's DEFAULT SCOPE with no parameters, because that is what
 * the button a consumer is about to draw would run. A consumer that wants a different scope or
 * different parameters asks `session.estimate` for that exact command instead; this is the
 * listing, not a substitute for the estimate.
 * @param source - The catalogue, the cost model and the run history.
 * @returns One entry per algorithm the element ships, in catalogue order.
 */
export function describeMetrics(source: MetricsSource): readonly MetricAvailability[] {
    const byAlgorithm = runIdsByAlgorithm(source.runs());

    return Object.freeze(
        source.algorithms().map((descriptor) => {
            const estimate = source.estimate(descriptor.key);
            const runIds = byAlgorithm.get(descriptor.key) ?? [];

            return Object.freeze({
                key: descriptor.key,
                plainName: descriptor.plainName,
                technicalName: descriptor.technicalName,
                available: estimate.available,
                // Present only when the metric is unavailable, which is what the descriptor's own
                // contract says. A reason beside an available metric would read as a caveat on a
                // number that has none.
                ...(estimate.available || estimate.reason === undefined ? {} : { reason: estimate.reason }),
                costClass: estimate.costClass,
                estimateSeconds: estimate.seconds,
                hasRun: runIds.length > 0,
                runIds: Object.freeze([...runIds]),
            } satisfies MetricAvailability);
        }),
    );
}
