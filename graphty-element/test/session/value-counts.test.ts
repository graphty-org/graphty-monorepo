/**
 * @file `session.data.setValueLabel` and `session.data.valueCounts`: a name for one value of a
 * path, one undoable step saved with the project, and how many elements carry each value.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";

const PEOPLE = [
    { id: "a", team: "red", age: 30 },
    { id: "b", team: "blue", age: 41 },
    { id: "c", team: "red" },
    { id: "d", team: 3 },
];

async function people(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(PEOPLE);
    await session.data.addEdges([
        { source: "a", target: "b", kind: "work" },
        { source: "b", target: "c", kind: "work" },
        { source: "c", target: "d" },
    ]);

    return session;
}

describe("a value's name", () => {
    it("is one undoable step, read back by path; null removes it and 3 and '3' are one value", async () => {
        const session = await people();
        await session.data.setValueLabel("data.team", 3, "Third");
        assert.strictEqual(session.data.valueLabels("data.team").get("3"), "Third");
        assert.deepStrictEqual(session.history.steps.at(-1)?.fact, {
            code: "data.label",
            params: { path: "data.team", value: 3, label: "Third" },
        });

        await session.undo();
        assert.strictEqual(session.data.valueLabels("data.team").size, 0, "one undo takes the name away");
        await session.redo();
        await session.data.setValueLabel("data.team", "3", null);
        assert.strictEqual(session.data.valueLabels("data.team").size, 0);
        session.dispose();
    });

    it("refuses a path that is not a value path", async () => {
        const session = await people();
        const error: unknown = await session.data
            .setValueLabel("team", "red", "Reds")
            .catch((caught: unknown) => caught);
        assert.strictEqual((error as { code?: unknown } | undefined)?.code, "E_BAD_COMMAND");
        session.dispose();
    });

    it("is saved with the project and read back when it opens", async () => {
        const session = await people();
        await session.data.setValueLabel("data.team", "red", "Reds");
        const saved = await session.project.save();
        session.dispose();

        const reopened = createGraphSession();
        await reopened.project.open(saved.text, { discard: true });
        assert.deepStrictEqual([...reopened.data.valueLabels("data.team")], [["red", "Reds"]]);
        reopened.dispose();
    });
});

describe("session.data.valueCounts", () => {
    it("counts a node column's values, most first, and the nodes carrying none", async () => {
        const session = await people();
        assert.deepStrictEqual(session.data.valueCounts("data.team"), {
            values: [
                { value: "red", count: 2 },
                { value: "blue", count: 1 },
                { value: 3, count: 1 },
            ],
            missing: 0,
            total: 4,
        });
        assert.deepStrictEqual(session.data.valueCounts("data.age").missing, 2);
        assert.strictEqual(session.data.valueCounts("id").values.length, 4);
        session.dispose();
    });

    it("counts an edge column on the edges without being told", async () => {
        const session = await people();
        assert.deepStrictEqual(session.data.valueCounts("data.kind"), {
            values: [{ value: "work", count: 2 }],
            missing: 1,
            total: 3,
        });
        assert.strictEqual(session.data.valueCounts("data.kind", { kind: "node" }).missing, 4);
        session.dispose();
    });
});

describe("session.data.valueCounts over a run's field", () => {
    it("counts the groups a run wrote", async () => {
        const execute = async (context: RunExecutionContext): Promise<RunOutcome> => {
            await Promise.resolve();
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
                    nodes: ids.slice(0, 3).map((id) => ({ id, values: { group: id === "a" ? 0 : 1 } })),
                    graph: { sizes: [1, 2] },
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
        await session.data.addNodes(PEOPLE);
        const run = await session.runs.start("louvain", {});
        assert.deepStrictEqual(session.data.valueCounts(`results.${run.runId}.group`), {
            values: [
                { value: 1, count: 2 },
                { value: 0, count: 1 },
            ],
            missing: 1,
            total: 4,
        });
        session.dispose();
    });

    it("counts degree, read from the graph's structure rather than a column", async () => {
        const session = await people();
        assert.deepStrictEqual(session.data.valueCounts("graphty.degree", { kind: "node" }), {
            values: [
                { value: 1, count: 2 },
                { value: 2, count: 2 },
            ],
            missing: 0,
            total: 4,
        });
        session.dispose();
    });
});
