/**
 * @file A hidden row stays hidden when something else repaints the stack: a finished run, which
 * repaints every layer that may read its results, paints what the eye left, never the hidden
 * layer as its author wrote it.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import type { ElementSession } from "../../src/session/types";

const RED = "#ff0000";

/**
 * A run that puts each of the three nodes in its own group.
 * @param context - The run being executed.
 * @returns The outcome.
 */
async function groups(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    const ids = ["a", "b", "c"];

    return {
        result: createRunResult({
            runId: context.runId,
            shape: "community",
            fields: [
                {
                    name: "group",
                    plainName: "Group",
                    technicalName: "community",
                    kind: "node",
                    type: "integer",
                    path: `results.${context.runId}.group`,
                },
            ],
            measured: { nodes: ids.length, edges: 0 },
            nodes: ids.map((id, at) => ({ id, values: { group: at } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "louvain", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

/**
 * The color the last passes painted each node, as hex.
 * @param session - The session.
 * @returns One color per node.
 */
function drawn(session: GraphSession): (string | undefined)[] {
    const element = session as ElementSession;
    const { nodeCount } = session.data.snapshot();
    return Array.from({ length: nodeCount }, (_, index) => element.paint.styleOf("node", index)["node.color"]?.hex);
}

describe("a hidden row under a run", () => {
    it("is not painted again when a run finishes", async () => {
        const session = createGraphSession({ runs: { execute: groups } });
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        const red = await session.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": RED },
        });
        await session.styles.settled();
        assert.deepEqual(drawn(session), [RED, RED, RED]);

        await session.styles.hideRow(red.id, true);
        await session.styles.settled();
        assert.notInclude(drawn(session), RED, "the eye took the red away");

        await session.runs.start("louvain", undefined, { style: false });
        await session.styles.settled();
        assert.notInclude(drawn(session), RED, "the run's repaint left the hidden layer hidden");
        assert.isTrue(session.styles.get(red.id)?.hidden);
        session.dispose();
    });
});
