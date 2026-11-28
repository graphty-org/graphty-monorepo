/**
 * @file Real algorithm runs for a harness session: an executor that runs the element's own
 * algorithm classes over the harness's session, with no renderer, and publishes a hand-built result
 * for any run id a test table names instead (for shapes no built-in algorithm has).
 */

import "../../../src/algorithms/index";

import { algorithmHostOf } from "../../../src/algorithms/host";
import { algorithmByKey } from "../../../src/catalog/algorithms";
import { AlgorithmManager } from "../../../src/managers/AlgorithmManager";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { graphHandle } from "../../helpers/session-graph";
import type { Harness } from "../helpers";
import { type Published, resultOf } from "../visibility/results";

/**
 * An executor running built-in algorithms against a harness's session.
 * @param harness - Read on every run, so a test can build the session with this executor first.
 * @param table - Run ids to publish by hand instead, read on every run so a re-run can change it.
 * @returns The executor.
 */
export function builtInRuns(
    harness: () => Harness,
    table: Map<string, Published> = new Map(),
): (context: RunExecutionContext) => Promise<RunOutcome> {
    return (context) => {
        const published = table.get(context.runId);
        if (published !== undefined) {
            return Promise.resolve({ result: resultOf(context.runId, published) });
        }

        // The run reads the harness session through the host a headless session's own runs read
        // (its store, its records, its configuration, its acceleration controller), and the
        // manager reports through a real event manager.
        const { session } = harness();
        const host = algorithmHostOf(session);
        const { graph } = graphHandle(session, {
            getDataManager: () => host.getDataManager(),
            acceleration: host.acceleration,
            styles: host.styles,
        });
        const descriptor = algorithmByKey(context.algorithm);
        if (descriptor === undefined) {
            throw new Error(`no built-in algorithm "${context.algorithm}"`);
        }

        return new AlgorithmManager(graph.eventManager, graph).execute(context, descriptor);
    };
}
