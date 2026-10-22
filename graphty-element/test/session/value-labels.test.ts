/**
 * @file `session.data.setValueLabel`: a name for one value of a path (a community called
 * "Students"), one undoable step, carried on the legend's swatch and on `styles.categories`,
 * moved with its group when the run is computed again, and saved with the project.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";

/**
 * A session whose Louvain run puts a and b in one group and c and d in the other, swapping the two
 * groups' numbers on every computation after the first, as a re-run renumbers communities.
 * @returns The session.
 */
async function communities(): Promise<GraphSession> {
    let computed = 0;
    const execute = async (context: RunExecutionContext): Promise<RunOutcome> => {
        await Promise.resolve();
        const flip = computed++ > 0 ? 1 : 0;
        const ids = session.data.nodes().map((node) => String(node.id));
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
                nodes: ids.map((id) => ({ id, values: { group: (id < "c" ? 0 : 1) ^ flip } })),
                graph: { sizes: [2, ids.length - 2] },
                caveats: {
                    exact: true,
                    direction: "as-loaded",
                    precision: "f64",
                    method: "louvain",
                    facts: [],
                    notes: [],
                },
                durationMs: 1,
            }),
        };
    };
    const session = createGraphSession({ runs: { execute } });
    await session.data.addNodes(["a", "b", "c", "d"].map((id) => ({ id })));

    return session;
}

describe("a value's name", () => {
    it("is one undoable step, read back by path and shown on the legend's swatch", async () => {
        const session = await communities();
        const run = await session.runs.start("louvain", {});
        await session.styles.settled();
        const path = `results.${run.runId}.group`;

        await session.data.setValueLabel(path, 0, "Students");
        assert.strictEqual(session.data.valueLabels(path).get("0"), "Students");
        const swatches = session.styles.legend().flatMap((block) => block.swatches);
        const named = swatches.find((swatch) => swatch.value === 0);
        assert.strictEqual(named?.name, "Students");
        assert.isTrue(named?.arbitrary, "a run's group ids are codes it made up");
        assert.isUndefined(swatches.find((swatch) => swatch.value === 1)?.name);

        const layer = session.styles.legend()[0].layerId;
        const categories = session.styles.categories(layer, "node.color");
        assert.strictEqual(categories.find((category) => category.value === 0)?.name, "Students");

        await session.undo();
        assert.strictEqual(session.data.valueLabels(path).size, 0, "one undo takes the name away");

        await session.redo();
        await session.data.setValueLabel(path, "0", null);
        assert.strictEqual(session.data.valueLabels(path).size, 0, "null removes it; 0 and '0' are one value");
        session.dispose();
    });

    it("follows its group when the run is computed again and renumbers the groups", async () => {
        const session = await communities();
        const run = await session.runs.start("louvain", {});
        const path = `results.${run.runId}.group`;
        await session.data.setValueLabel(path, 0, "First two");

        // A data change makes the same run compute again; the a-and-b group is now numbered 1.
        await session.data.addNodes([{ id: "e" }]);
        await session.runs.start("louvain", {});
        await session.styles.settled();
        assert.strictEqual(session.runs.get(run.runId)?.result?.node("a")?.group, 1);
        assert.deepStrictEqual([...session.data.valueLabels(path)], [["1", "First two"]]);
        session.dispose();
    });

    it("is saved with the project and read back when it opens", async () => {
        const session = await communities();
        const run = await session.runs.start("louvain", {});
        const path = `results.${run.runId}.group`;
        await session.data.setValueLabel(path, 1, "Last two");
        const saved = await session.project.save();
        session.dispose();

        const reopened = await communities();
        await reopened.project.open(saved.text, { discard: true });
        assert.strictEqual(reopened.data.valueLabels(path).get("1"), "Last two");
        reopened.dispose();
    });
});
