/**
 * @file The session the round-trip fixtures and the random-sequence model run on, in Node: the
 * fixtures' graph -- `n1 -> n2 -> n3` -- over a store a test feeds, with fake runs of `degree` and
 * `shortest-path`. Kept apart from `round-trip-harness.ts`, which the browser twin imports too.
 */

import type { FieldDescriptor } from "../../../src/catalog/types";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import type { ElementSession, GraphSession } from "../../../src/session/types";
import { type Harness, makeSession } from "../helpers";

/**
 * One field a fake run publishes.
 * @param runId - The run.
 * @param name - The field.
 * @param kind - Which half carries it.
 * @param type - Its value type.
 * @returns The descriptor.
 */
function field(runId: string, name: string, kind: "node" | "edge", type: "number" | "boolean"): FieldDescriptor {
    return { name, plainName: name, technicalName: name, kind, type, path: `results.${runId}.${name}` };
}

/**
 * The runs a fixture session can do, without the element's algorithms: `degree` publishes each
 * node's degree, and `shortest-path` a route through every node.
 * @param harness - The session's harness, read when a run starts.
 * @param context - The run.
 * @returns Its outcome.
 */
function fakeRun(harness: () => Harness, context: RunExecutionContext): Promise<RunOutcome> {
    const snapshot = harness().store.getSnapshot();
    const degrees = snapshot.degree();
    const ids = Array.from({ length: snapshot.nodeCount }, (_, index) => snapshot.ids.idOf(index));
    const route = context.algorithm === "shortest-path";
    const result = createRunResult({
        runId: context.runId,
        shape: route ? "path" : "node-metric",
        fields: [route ? field(context.runId, "onPath", "node", "boolean") : field(context.runId, "value", "node", "number")],
        measured: { nodes: snapshot.nodeCount, edges: snapshot.edgeCount },
        nodes: ids.map((id, index) => ({ id, values: route ? { onPath: true } : { value: degrees[index] } })),
        caveats: { exact: true, direction: "as-loaded", precision: "f64", method: context.algorithm, notes: [] },
        durationMs: 1,
    });

    return Promise.resolve({ result });
}

/**
 * A session holding the fixtures' graph -- `n1 -> n2 -> n3` -- that can run `degree` and
 * `shortest-path`, with its baseline painted the way a renderer's first draw paints it. A
 * headless session paints only what an edit touches, so without that first draw the picture
 * before the first edit would be an empty one no undo returns to.
 * @param internals - The history clock and queue, for a test that drives them itself.
 * @returns The session.
 */
export async function fixtureSession(
    internals?: NonNullable<Parameters<typeof makeSession>[0]>["internals"],
): Promise<GraphSession> {
    const harness = makeSession({
        runs: { execute: (context) => fakeRun(() => harness, context) },
        ...(internals === undefined ? {} : { internals }),
    });
    harness.add(
        [{ id: "n1" }, { id: "n2" }, { id: "n3" }],
        [
            { src: "n1", dst: "n2" },
            { src: "n2", dst: "n3" },
        ],
    );
    const session = harness.session as ElementSession;
    await session.paint.repaintAll(session.styles.compiled(), {
        signal: new AbortController().signal,
        report: () => undefined,
    });

    return session;
}

