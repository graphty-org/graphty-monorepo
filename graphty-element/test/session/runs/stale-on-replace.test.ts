import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";

const FRIENDS = "source,target,weight\nAva,Ben,3\nBen,Chloe,4\nChloe,Ava,5\nChloe,Dev,1\n";
const FRIENDS_V2 = "source,target,weight\nAva,Ben,1\nBen,Chloe,2\nChloe,Ava,1\nChloe,Dev,5\n";

/**
 * A stand-in PageRank: a standalone session runs no algorithm of its own.
 * @param context - the run
 * @returns a score per node
 */
async function execute(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    const ids = ["Ava", "Ben", "Chloe", "Dev"];
    return {
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [
                {
                    name: "value",
                    plainName: "Rank",
                    technicalName: "pagerank",
                    kind: "node",
                    type: "number",
                    path: `results.${context.runId}.value`,
                },
            ],
            measured: { nodes: ids.length, edges: 4 },
            nodes: ids.map((id, index) => ({ id, values: { value: index / 10 } })),
            edges: [],
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

/**
 * Load the first file and rank it.
 * @returns the session and the run's id
 */
async function ranked(): Promise<{ session: GraphSession; id: string }> {
    const session = createGraphSession({ runs: { execute } });
    await session.data.import({ type: "csv", config: { data: FRIENDS } });
    const run = session.runs.start("pagerank", undefined, { style: false });
    await run;
    return { session, id: run.id };
}

describe("a run goes out of date", () => {
    it("when a replacing load changes the weights of the same nodes", async () => {
        const { session, id } = await ranked();
        assert.strictEqual(session.runs.get(id)?.stale, null);

        await session.data.import({ type: "csv", config: { data: FRIENDS_V2 } });

        const stale = session.runs.get(id)?.stale;
        assert.isNotNull(stale);
        assert.strictEqual(stale?.reason, "data-changed");
        assert.strictEqual(stale?.ranOn, 4);
        assert.strictEqual(stale?.nowVisible, 4);
        session.dispose();
    });

    it("not when the same file is loaded again", async () => {
        const { session, id } = await ranked();
        await session.data.import({ type: "csv", config: { data: FRIENDS } });

        assert.strictEqual(session.runs.get(id)?.stale, null);
        session.dispose();
    });

    it("when a filter changes what it ran over", async () => {
        const { session, id } = await ranked();
        await session.visibility.set({ kind: "categories", attribute: "data.id", values: ["Ava", "Ben"] });

        const stale = session.runs.get(id)?.stale;
        assert.strictEqual(stale?.reason, "scope-changed");
        assert.strictEqual(stale?.nowVisible, 2);
        session.dispose();
    });

    it("not when another run finishes", async () => {
        const { session, id } = await ranked();
        const other = session.runs.start("degree", undefined, { style: false });
        await other;

        assert.strictEqual(session.runs.get(id)?.stale, null);
        session.dispose();
    });

    it("not after its project is saved and opened again", async () => {
        const { session, id } = await ranked();
        const { text } = await session.project.save();
        const reopened = createGraphSession({ runs: { execute } });
        await reopened.project.open(text);

        assert.isString(reopened.runs.get(id)?.record.scope.dataDigest);
        assert.strictEqual(reopened.runs.get(id)?.stale, null);
        session.dispose();
        reopened.dispose();
    });

    it("keeps its runs, styles and notes across a replacing load", async () => {
        const { session, id } = await ranked();
        await session.styles.add({
            name: "Ava red",
            target: "node",
            selector: { match: "expression", where: "id == 'Ava'" },
            set: { "node.color": "#ff0000" },
        });
        session.notes.add({ text: "Ava is the hub", targets: [{ node: "Ava" }] });

        await session.data.import({ type: "csv", config: { data: FRIENDS_V2 } });

        assert.isDefined(session.runs.get(id));
        assert.isTrue(session.styles.list().some((layer) => layer.name === "Ava red"));
        assert.strictEqual(session.notes.list().length, 1);
        session.dispose();
    });
});
