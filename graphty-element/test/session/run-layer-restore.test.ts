/**
 * @file A run whose layer a reader deleted: `runs.layers` says the layer is missing, and starting
 * the run again with `restoreLayer` puts it back from the stored result, in one undo step, without
 * computing again unless the settings changed.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";

const IDS = ["a", "b", "c", "d", "e", "f"];

/**
 * A session whose Leiden run puts the nodes in three groups, counting how often it computes.
 * @returns The session and the count.
 */
async function leiden(): Promise<{ session: GraphSession; computed: () => number }> {
    let computed = 0;
    const execute = async (context: RunExecutionContext): Promise<RunOutcome> => {
        await Promise.resolve();
        computed++;

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
                measured: { nodes: IDS.length, edges: 0 },
                nodes: IDS.map((id, at) => ({ id, values: { group: at % 3 } })),
                caveats: {
                    exact: true,
                    direction: "as-loaded",
                    precision: "f64",
                    method: "leiden",
                    facts: [],
                    notes: [],
                },
                durationMs: 1,
            }),
        };
    };
    const session = createGraphSession({ runs: { execute } });
    await session.data.addNodes(IDS.map((id) => ({ id })));

    return { session, computed: () => computed };
}

describe("a run whose layer was deleted", () => {
    it("reports the layer missing, and restoreLayer puts it back from the stored result", async () => {
        const { session, computed } = await leiden();
        const run = await session.runs.start("leiden", {});
        await session.styles.settled();

        const before = session.runs.layers(run.runId);
        assert.lengthOf(before?.present ?? [], 1, "the first completion painted one layer");
        assert.lengthOf(before?.missing ?? [1], 0);
        assert.strictEqual(computed(), 1);

        await session.styles.remove(before?.present[0] ?? "");
        const deleted = session.runs.layers(run.runId);
        assert.lengthOf(deleted?.present ?? [1], 0);
        assert.deepStrictEqual(
            deleted?.missing.map((suggestion) => suggestion.channels),
            [["node.color"]],
            "the color the run painted is what is missing",
        );

        await session.runs.start("leiden", {}, { restoreLayer: true });
        await session.styles.settled();
        const restored = session.runs.layers(run.runId);
        assert.lengthOf(restored?.present ?? [], 1, "the layer is back");
        assert.lengthOf(restored?.missing ?? [1], 0);
        assert.strictEqual(computed(), 1, "nothing was computed again");

        await session.undo();
        await session.styles.settled();
        assert.lengthOf(session.runs.layers(run.runId)?.present ?? [1], 0, "one undo takes the restored layer away");
        session.dispose();
    });

    it("adds nothing when the layer is still there", async () => {
        const { session } = await leiden();
        const run = await session.runs.start("leiden", {});
        await session.styles.settled();

        await session.runs.start("leiden", {}, { restoreLayer: true });
        await session.styles.settled();
        assert.lengthOf(session.runs.layers(run.runId)?.present ?? [], 1, "no second copy");
        session.dispose();
    });

    it("computes again when the settings changed, and the layer comes back on the new result", async () => {
        const { session, computed } = await leiden();
        const run = await session.runs.start("leiden", { resolution: 1 }, { as: "groups" });
        await session.styles.settled();
        await session.styles.remove(session.runs.layers(run.runId)?.present[0] ?? "");

        const again = await session.runs.start("leiden", { resolution: 2 }, { as: "groups", restoreLayer: true });
        await session.styles.settled();
        assert.strictEqual(again.runId, run.runId, "the same run, retuned");
        assert.strictEqual(computed(), 2);
        assert.lengthOf(session.runs.layers(run.runId)?.present ?? [], 1);
        session.dispose();
    });
});
