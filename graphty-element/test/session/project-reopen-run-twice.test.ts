/**
 * A reopened project's run answers the question it answered before the save (#6227): a later
 * start of the same algorithm over the same scope -- Analyze run again, or a filter step that
 * reads the run's result (`startOwn`, which the filter steps use) -- hands back the restored run
 * instead of minting a second one beside it.
 */
import { assert, describe, it } from "vitest";

import type { GraphStore } from "../../src/data/GraphStore";
import { sessionRunsOf } from "../../src/session/GraphSession";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { type Harness, makeSession } from "./helpers";

/**
 * A session whose degree runs count every node's links, counting how many times they ran.
 * @returns The harness and the count.
 */
function withDegree(): Harness & { executed: () => number } {
    let store: GraphStore | null = null;
    let count = 0;
    const execute = (context: RunExecutionContext): Promise<RunOutcome> => {
        if (store === null) {
            throw new Error("no store");
        }

        count++;
        const snapshot = store.getSnapshot();
        const degrees = snapshot.degree();
        const nodes = [];
        for (let index = 0; index < snapshot.nodeCount; index++) {
            nodes.push({ id: snapshot.ids.idOf(index), values: { value: degrees[index] } });
        }

        const result = createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [
                {
                    name: "value",
                    plainName: "Connections",
                    technicalName: "degree",
                    kind: "node",
                    type: "number",
                    path: "results.$.value",
                },
            ],
            measured: { nodes: snapshot.nodeCount, edges: snapshot.edgeCount },
            nodes,
            edges: [],
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "degree", facts: [], notes: [] },
            durationMs: 1,
        });
        return Promise.resolve({ result, summary: result.summary() });
    };
    const harness = makeSession({ runs: { execute } });
    ({ store } = harness);
    return { ...harness, executed: () => count };
}

describe("a run brought back by a reopened project", () => {
    it.each(["graph", "visible"] as const)("answers a later start over the %s scope", async (scope) => {
        const { session } = withDegree();
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ]);
        const first = await session.runs.start("degree", undefined, { scope, style: false });
        const { text } = await session.project.save();
        session.dispose();

        const fresh = withDegree();
        await fresh.session.project.open(text);
        assert.deepStrictEqual(
            fresh.session.runs.list().map((run) => run.id),
            [first.runId],
        );
        assert.strictEqual(fresh.session.runs.answered("degree", undefined, { scope })?.id, first.runId);
        assert.strictEqual(
            sessionRunsOf(fresh.session).answeredOwn("degree", undefined, { scope, style: false })?.id,
            first.runId,
        );

        const again = await fresh.session.runs.start("degree", undefined, { scope, style: false });
        assert.strictEqual(again.runId, first.runId);
        const own = await sessionRunsOf(fresh.session).startOwn("degree", undefined, { scope, style: false });
        assert.strictEqual(own.runId, first.runId);
        assert.deepStrictEqual(
            fresh.session.runs.list().map((run) => run.id),
            [first.runId],
        );
        assert.strictEqual(fresh.executed(), 0, "the restored result is reused, never computed again");
        fresh.session.dispose();
    });
});
