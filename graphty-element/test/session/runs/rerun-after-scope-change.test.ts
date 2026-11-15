import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";

/**
 * A stand-in algorithm: one value for one node.
 * @param context - The run.
 * @returns The outcome.
 */
async function execute(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    return {
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [
                {
                    name: "value",
                    plainName: "Value",
                    technicalName: "value",
                    kind: "node",
                    type: "number",
                    path: `results.${context.runId}.value`,
                },
            ],
            measured: { nodes: 1, edges: 0 },
            nodes: [{ id: "A", values: { value: 1 } }],
            edges: [],
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

describe("run.rerun()", () => {
    it("runs again, keeping its id, after the visible scope it was derived from moved", async () => {
        // An unnamed run over "visible" has an id derived from the filter in force. Its re-run
        // used to derive the id again under the new filter, name another run, and wait for ever.
        const session = createGraphSession({ runs: { execute } });
        await session.data.import({ type: "csv", config: { data: "source,target\nA,B\nB,C\n" } });
        await session.visibility.set({ kind: "categories", attribute: "data.id", values: ["A", "B"] });
        const run = session.runs.start("degree", undefined, { style: false });
        await run;
        await session.visibility.set({ kind: "categories", attribute: "data.id", values: ["A", "B", "C"] });
        assert.strictEqual(run.stale?.reason, "scope-changed");

        await run.rerun();

        assert.strictEqual(run.status, "succeeded");
        assert.isNull(run.stale);
        assert.strictEqual(session.runs.list().length, 1);
        session.dispose();
    });
});
