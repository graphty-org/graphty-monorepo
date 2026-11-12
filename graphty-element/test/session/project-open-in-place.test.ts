/**
 * Opening a project file in place, over the session that saved it, leaves the session holding
 * exactly what the file holds (#3231): a run's suggested layer that the session painted when the
 * run first completed is not painted again by the run the file brings back.
 */
import { assert, describe, it } from "vitest";

import type { GraphStore } from "../../src/data/GraphStore";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { type Harness, makeSession } from "./helpers";

/**
 * A session whose degree runs count every node's links.
 * @returns The harness.
 */
function withDegree(): Harness {
    let store: GraphStore | null = null;
    const execute = (context: RunExecutionContext): Promise<RunOutcome> => {
        if (store === null) {
            throw new Error("no store");
        }

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
    return harness;
}

/**
 * A session with a degree run whose suggested layer it painted.
 * @returns The session.
 */
async function built(): Promise<Harness["session"]> {
    const { session } = withDegree();
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);
    await session.runs.start("degree");
    await session.styles.settled();
    return session;
}

describe("a project opened in place", () => {
    it("holds the file's layers, without the run's suggested layer painted again", async () => {
        const session = await built();
        assert.lengthOf(session.styles.tree(), 1, "the run painted its suggested layer");
        const { text } = await session.project.save();
        const saved = session.styles.toDocument();

        await session.project.open(text, { discard: true });
        await session.styles.settled();
        assert.deepStrictEqual(session.styles.toDocument(), saved);

        // The same as a session that opens the file afresh.
        const { session: fresh } = withDegree();
        await fresh.project.open(text);
        await fresh.styles.settled();
        assert.deepStrictEqual(session.styles.toDocument(), fresh.styles.toDocument());
        assert.deepStrictEqual(
            session.runs.list().map((run) => run.id),
            fresh.runs.list().map((run) => run.id),
        );
        session.dispose();
        fresh.dispose();
    });

    it("lets a removed run started again choose its own styling", async () => {
        const session = await built();
        const [run] = session.runs.list();
        session.runs.remove(run.id);
        assert.lengthOf(session.styles.tree(), 0, "its layer went with it");

        await session.runs.start("degree", undefined, { as: run.id, style: false });
        await session.styles.settled();
        assert.deepStrictEqual(
            session.runs.list().map((listed) => listed.id),
            [run.id],
        );
        assert.lengthOf(session.styles.tree(), 0, "style: false paints nothing");
        session.dispose();
    });
});
