/**
 * @file Walking a graph in chunks, and the context a measurement gets when nobody is watching.
 *
 * A measurement that runs to completion in one synchronous pass locks the frame for as long as it
 * takes. The element's own history records what that costs: a 70,000-node graph estimated at 2.10
 * seconds held the frame for 10.4. Neither number is the point -- the point is that nothing could
 * be drawn, and nothing could be cancelled, while it happened.
 *
 * So the element's half of every metric is walked in chunks: the signal is checked, progress is
 * reported and the host is given a turn between them. The work inside `@graphty/algorithms` is
 * still one synchronous call and cannot be interrupted from here; what is chunked is everything
 * the element does around it.
 */

import { YIELD_BUDGET_MS } from "../results/types";
import type { MetricRunContext } from "./types";

/**
 * How many nodes a measurement visits between progress reports.
 *
 * The frame is NOT given back at every chunk: a yield costs the host a whole frame, which on a
 * large scene is far more than a chunk of work, so it is given back only once a frame's worth of
 * work has built up since the last one -- the same budget every declared algorithm's pass uses,
 * for the same reason (see `YIELD_BUDGET_MS`).
 */
export const METRIC_CHUNK_SIZE = 2048;

/**
 * The context a measurement gets when it was started outside the run machinery.
 *
 * `runAlgorithm(namespace, type)` still exists and still returns nothing, so an algorithm reached
 * that way has no run to report to and no caller holding a signal. It gets this: a signal that is
 * never aborted, a report that goes nowhere, and a real yield, because giving the frame back is
 * not something a caller has to ask for.
 * @param runId - The id to publish the result under.
 * @returns The context.
 */
export function detachedRunContext(runId: string): MetricRunContext {
    return {
        runId,
        signal: new AbortController().signal,
        report: (): void => undefined,
        yieldNow: (): Promise<void> =>
            new Promise<void>((resolve) => {
                setTimeout(resolve, 0);
            }),
    };
}

/**
 * Visit every item, checking the signal, reporting progress between chunks and giving the host a
 * turn once a frame's worth of work has built up.
 * @param items - What to visit, in order.
 * @param context - Where progress goes and where cancellation arrives.
 * @param phase - What to call this step in a progress line.
 * @param visit - What to do with one item.
 * @returns A promise that settles once every item has been visited.
 * @throws Whatever `signal.throwIfAborted` throws once the run has been cancelled, which is a
 *   `DOMException` named `AbortError`.
 */
export async function walkInChunks<T>(
    items: readonly T[],
    context: MetricRunContext,
    phase: string,
    visit: (item: T, index: number) => void,
): Promise<void> {
    const total = items.length;
    let lastYield = performance.now();

    for (let index = 0; index < total; index++) {
        context.signal.throwIfAborted();
        visit(items[index], index);

        if ((index + 1) % METRIC_CHUNK_SIZE === 0 && index + 1 < total) {
            context.report({ phase, completed: index + 1, total });

            if (performance.now() - lastYield >= YIELD_BUDGET_MS) {
                await context.yieldNow();
                lastYield = performance.now();
            }
        }
    }

    context.report({ phase, completed: total, total });
}
