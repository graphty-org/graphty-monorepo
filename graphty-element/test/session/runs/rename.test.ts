/**
 * @file `runs.rename`: a reader names a finished run, as one step undo takes back.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors/GraphtyError";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";

/**
 * Finish every run at once with an empty node metric.
 * @param context - The run.
 * @returns Its outcome.
 */
function execute(context: RunExecutionContext): Promise<RunOutcome> {
    return Promise.resolve({
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [],
            measured: { nodes: context.scope.nodeCount, edges: context.scope.edgeCount },
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "degree", facts: [], notes: [] },
            durationMs: 1,
        }),
    });
}

/**
 * A session holding a small graph.
 * @returns The session.
 */
async function triangle(): Promise<GraphSession> {
    const session = createGraphSession({ runs: { execute } });
    await session.data.addNodes(["a", "b", "c"].map((id) => ({ id })));
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "a" },
    ]);

    return session;
}

/**
 * The code a call rejects with.
 * @param call - The call.
 * @returns The code, or undefined when it settled.
 */
async function refusal(call: () => Promise<unknown>): Promise<string | undefined> {
    try {
        await call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : String(error);
    }

    return undefined;
}

describe("runs.rename", () => {
    it("names the run in its record and its label, and undo and redo take it back and forth", async () => {
        const session = await triangle();
        const run = await session.runs.start("degree", undefined, { as: "deg", style: false });
        const record = (): { name: string | null; label: string } => {
            const { name, label } = session.runs.get(run.runId)?.record ?? { name: null, label: "" };
            return { name, label };
        };
        const before = record();
        assert.isNull(before.name);

        await session.runs.rename(run.runId, "Connections");
        assert.deepStrictEqual(record(), { name: "Connections", label: "Connections" });

        await session.undo();
        assert.deepStrictEqual(record(), before);

        await session.redo();
        assert.strictEqual(record().name, "Connections");

        await session.runs.rename(run.runId, null);
        assert.deepStrictEqual(record(), before, "null gives back the element's own name");
        session.dispose();
    });

    it("keeps the name through a re-run", async () => {
        const session = await triangle();
        const run = await session.runs.start("degree", undefined, { as: "deg", style: false });
        await session.runs.rename(run.runId, "Connections");

        await session.data.addNodes([{ id: "d" }]);
        await session.runs.get(run.runId)?.rerun();

        assert.strictEqual(session.runs.get(run.runId)?.record.name, "Connections");
        session.dispose();
    });

    it("refuses a run it does not hold and a blank name", async () => {
        const session = await triangle();
        const run = await session.runs.start("degree", undefined, { as: "deg", style: false });

        assert.strictEqual(await refusal(() => session.runs.rename("nope", "x")), "E_UNKNOWN_RUN");
        assert.strictEqual(await refusal(() => session.runs.rename(run.runId, "  ")), "E_OPTION_RANGE");
        assert.isNull(session.runs.get(run.runId)?.record.name);
        session.dispose();
    });
});
