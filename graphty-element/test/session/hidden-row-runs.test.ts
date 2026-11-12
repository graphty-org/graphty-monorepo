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

    it("leaves a hidden edge row unpainted through a run, an undo and a data change", async () => {
        const session = createGraphSession({ runs: { execute: groups } });
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ]);
        const element = session as ElementSession;
        const edges = (): (string | undefined)[] =>
            Array.from(
                { length: session.data.snapshot().edgeCount },
                (_, index) => element.paint.styleOf("edge", index)["edge.color"]?.hex,
            );
        const red = await session.styles.add({
            name: "Red edges",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": RED },
        });
        await session.styles.hideRow(red.id, true);
        await session.styles.settled();
        assert.notInclude(edges(), RED);

        await session.runs.start("louvain", undefined, { style: true });
        await session.styles.settled();
        assert.notInclude(edges(), RED, "the run's repaint painted what each edge shows, not the hidden row");

        await session.undo();
        await session.styles.settled();
        assert.notInclude(edges(), RED, "undoing the run repainted without the hidden row");

        await session.data.addEdges([{ source: "a", target: "c" }]);
        await session.styles.settled();
        assert.lengthOf(edges(), 3);
        assert.notInclude(edges(), RED, "a data change repainted without the hidden row");
        session.dispose();
    });

    it("holds no run's picture back while its row is hidden: a hidden layer paints nothing", async () => {
        const session = createGraphSession({ runs: { execute: groups } });
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        const red = await session.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": RED },
        });
        await session.styles.hideRow(red.id, true);
        const run = session.runs.start("louvain", undefined, { style: true });
        await run;
        await session.styles.settled();
        const painting = session.runs.painting(run.id);
        assert.notInclude(
            painting?.suggestions.map((outcome) => outcome.outcome) ?? [],
            "suppressed",
            "the hidden row held nothing back",
        );
        assert.isAbove(session.runs.bindings(run.id).length, 0, "the run painted its layer");
        session.dispose();
    });
});
