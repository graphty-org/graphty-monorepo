/**
 * @file Real algorithm runs for a harness session: an executor that runs the element's own
 * algorithm classes over the harness's store, with no renderer, and publishes a hand-built result
 * for any run id a test table names instead (for shapes no built-in algorithm has).
 */

import "../../../src/algorithms/index";

import { AccelerationController, AcceleratorRegistry } from "../../../src/acceleration";
import { algorithmByKey } from "../../../src/catalog/algorithms";
import type { Graph } from "../../../src/Graph";
import { AlgorithmManager } from "../../../src/managers/AlgorithmManager";
import type { EventManager } from "../../../src/managers/EventManager";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { edgeSpaceOf } from "../../../src/session/scope/ScopeApi";
import type { Harness } from "../helpers";
import { type Published, resultOf } from "../visibility/results";

/**
 * An executor running built-in algorithms against a harness's store.
 * @param harness - Read on every run, so a test can build the session with this executor first.
 * @param table - Run ids to publish by hand instead, read on every run so a re-run can change it.
 * @returns The executor.
 */
export function builtInRuns(harness: () => Harness, table: Map<string, Published> = new Map()): (context: RunExecutionContext) => Promise<RunOutcome> {
    return (context) => {
        const published = table.get(context.runId);
        if (published !== undefined) {
            return Promise.resolve({ result: resultOf(context.runId, published) });
        }

        // The four data-manager members the algorithms read, rebuilt from the current snapshot.
        const { store } = harness();
        const snapshot = store.getSnapshot();
        const space = edgeSpaceOf(snapshot);
        const nodes = new Map<string, { id: string }>();
        const edges = new Map<string, { id: string; index: number; srcId: string; dstId: string }>();
        for (let index = 0; index < snapshot.nodeCount; index++) {
            const id = String(snapshot.ids.idOf(index));
            nodes.set(id, { id });
        }

        for (let row = 0; row < snapshot.edgeCount; row++) {
            const id = space.idOf(row);
            edges.set(id, { id, index: row, srcId: String(snapshot.ids.idOf(snapshot.edgeSource(row))), dstId: String(snapshot.ids.idOf(snapshot.edgeTarget(row))) });
        }

        const dataManager = {
            nodes,
            edges,
            graphResults: undefined,
            getSnapshot: () => store.getSnapshot(),
            undirected: (graph: ReturnType<typeof store.getSnapshot>) => store.undirected(graph),
            applyStylesToExistingNodes: (): void => undefined,
            applyStylesToExistingEdges: (): void => undefined,
        };
        const graph = {
            getDataManager: () => dataManager,
            acceleration: new AccelerationController({ policy: "auto", minNodes: 0, registry: new AcceleratorRegistry() }),
        } as unknown as Graph;
        const events = { emitGraphError: () => undefined, emitGraphEvent: () => undefined } as unknown as EventManager;
        const descriptor = algorithmByKey(context.algorithm);
        if (descriptor === undefined) {
            throw new Error(`no built-in algorithm "${context.algorithm}"`);
        }

        return new AlgorithmManager(events, graph).execute(context, descriptor);
    };
}
