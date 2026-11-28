/**
 * @file An after-frame listener, and `afterFrame()`, never wait for a run still going: only for the
 * repaint of the edits written so far. A run that waits on the reader (or a long layout) held every
 * one of them until it ended, so the graphty app's panels stopped redrawing while it ran.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";

describe("after-frame listeners beside a run still going", () => {
    it("hear a selection, and afterFrame() settles, while a run waits", async () => {
        // A run that ends only when it is canceled.
        const execute = (context: RunExecutionContext): Promise<RunOutcome> =>
            new Promise((_resolve, reject) => {
                context.signal.addEventListener("abort", () => {
                    reject(new Error("canceled"));
                });
            });
        const session = createGraphSession({ runs: { execute } });
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        const run = session.runs.start("degree");
        run.then(undefined, () => undefined);

        const heard: string[][] = [];
        session.on("selection:changed", () => heard.push([...session.selection.nodes]), { afterFrame: true });
        await session.selection.apply({ nodes: ["a"] });
        await session.afterFrame();

        assert.deepEqual(heard, [["a"]]);
        assert.notEqual(session.runs.get(run.id)?.status, "succeeded", "the run is still going");
        run.cancel();
        session.dispose();
    });
});
