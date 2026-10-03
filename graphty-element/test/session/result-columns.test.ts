import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, isGraphtyError } from "../../session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";

/** What the stand-in runs publish, by run id or algorithm: node values, and edge values by edge id. */
const published = new Map<
    string,
    { nodes?: readonly (readonly [string, number])[]; edges?: readonly (readonly [string, boolean])[] }
>();

/**
 * Publishes whatever {@link published} holds for the run when it executes, so a rerun publishes
 * what the test changed it to. A standalone session runs no algorithm of its own.
 * @param context - the run
 * @returns the outcome
 */
function execute(context: RunExecutionContext): Promise<RunOutcome> {
    const { nodes = [], edges = [] } = published.get(context.runId) ?? published.get(context.algorithm) ?? {};
    const field = (kind: "node" | "edge", type: "number" | "boolean") =>
        ({
            name: "value",
            plainName: "Value",
            technicalName: "value",
            kind,
            type,
            path: `results.${context.runId}.value`,
        }) as const;
    return Promise.resolve({
        result: createRunResult({
            runId: context.runId,
            shape: edges.length > 0 ? "edge-metric" : "node-metric",
            fields: [edges.length > 0 ? field("edge", "boolean") : field("node", "number")],
            measured: { nodes: nodes.length, edges: edges.length },
            nodes: nodes.map(([id, value]) => ({ id, values: { value } })),
            edges: edges.map(([id, value]) => ({ id, values: { value } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", notes: [] },
            durationMs: 1,
        }),
    });
}

/**
 * Five nodes, and a "degree" run that scores four of them.
 * @returns the session, loaded and run
 */
async function scored(): Promise<GraphSession> {
    const session = createGraphSession({ runs: { execute } });
    await session.data.addNodes([{ id: "hub" }, { id: "a" }, { id: "b" }, { id: "c" }, { id: "alone" }]);
    published.set("degree", {
        nodes: [
            ["hub", 3],
            ["a", 2],
            ["b", 2],
            ["c", 1],
        ],
    });
    await session.runs.start("degree", undefined, { as: "degree", style: false });
    return session;
}

/*
 * `columns` and a `results.<run>.<field>` sort key on `nodePage` and `edgePage`: a table shows a
 * run's values beside the records, and sorts by them, without reading the result itself.
 */
describe("result values as page columns", () => {
    it("runs the guide's example (docs/guide/javascript-api.md, Result values as table columns)", async () => {
        const session = createGraphSession({ runs: { execute } });
        await session.data.addNodes([{ id: "ada" }, { id: "grace" }, { id: "alan" }]);
        published.set("pagerank", {
            nodes: [
                ["ada", 0.2],
                ["grace", 0.5],
                ["alan", 0.3],
            ],
        });
        const element = { session, run: session.runs.start.bind(session.runs) };

        // The guide's code, as written.
        const run = element.run("pagerank");
        await run;
        const column = `results.${run.id}.value`;

        const page = element.session.data.nodePage({
            columns: [column],
            sort: { key: column, descending: true },
            limit: 50,
        });
        assert.deepStrictEqual(
            page.records.map((record) => [record.id, record[column]]),
            [
                ["grace", 0.5],
                ["alan", 0.3],
                ["ada", 0.2],
            ],
        );
        session.dispose();
    });

    it("carries a run's values on each record and sorts by them in either direction", async () => {
        const session = await scored();
        const column = "results.degree.value";

        const page = session.data.nodePage({ columns: [column], sort: { key: column, descending: true }, limit: 2 });

        assert.deepStrictEqual(
            page.records.map((record) => [record.id, record[column]]),
            [
                ["hub", 3],
                ["a", 2],
            ],
        );
        assert.strictEqual(page.total, 5);
        assert.isTrue(Object.isFrozen(page.records[0]));

        const ascending = session.data.nodePage({ sort: { key: column } });
        assert.deepStrictEqual(
            ascending.records.map((record) => record.id),
            ["c", "a", "b", "hub", "alone"],
            "equal values keep graph order; the unscored node is last",
        );
        assert.notProperty(ascending.records[0], column, "a column is added only when asked for");
        session.dispose();
    });

    it("sorts a record with no value for the column last in either direction", async () => {
        const session = await scored();
        const column = "results.degree.value";

        for (const descending of [false, true]) {
            const page = session.data.nodePage({ columns: [column], sort: { key: column, descending } });
            assert.strictEqual(page.records[4]?.id, "alone", `descending: ${String(descending)}`);
            assert.notProperty(page.records[4], column, "no value, no key");
        }

        // A run that never happened reads absent everywhere: graph order, nothing thrown.
        const unknown = session.data.nodePage({ columns: ["results.nope.value"], sort: { key: "results.nope.value" } });
        assert.deepStrictEqual(
            unknown.records.map((record) => record.id),
            ["hub", "a", "b", "c", "alone"],
        );
        session.dispose();
    });

    it("reflects a rerun's new values", async () => {
        const session = await scored();
        const column = "results.degree.value";
        const before = session.data.nodePage({ columns: [column], sort: { key: column, descending: true } });
        assert.strictEqual(before.records[0]?.id, "hub");

        published.set("degree", {
            nodes: [
                ["hub", 3],
                ["alone", 9],
            ],
        });
        await session.runs.get("degree")?.rerun();

        const after = session.data.nodePage({ columns: [column], sort: { key: column, descending: true } });
        assert.notStrictEqual(after.revision, before.revision);
        assert.deepStrictEqual(
            after.records.map((record) => [record.id, record[column]]),
            [
                ["alone", 9],
                ["hub", 3],
                ["a", undefined],
                ["b", undefined],
                ["c", undefined],
            ],
        );
        session.dispose();
    });

    it("reads an edge result on edge pages", async () => {
        const session = createGraphSession({ runs: { execute } });
        await session.data.addNodes([{ id: "x" }, { id: "y" }, { id: "z" }]);
        await session.data.addEdges([
            { source: "x", target: "y" },
            { source: "y", target: "z" },
        ]);
        const [first, second] = session.data.edges().map((edge) => edge.id);
        published.set("path", {
            edges: [
                [first ?? "", false],
                [second ?? "", true],
            ],
        });
        await session.runs.start("degree", undefined, { as: "path", style: false });
        const column = "results.path.value";

        const page = session.data.edgePage({ columns: [column], sort: { key: column, descending: true } });

        assert.deepStrictEqual(
            page.records.map((record) => [record.source, record.target, record[column]]),
            [
                ["y", "z", true],
                ["x", "y", false],
            ],
        );
        session.dispose();
    });

    it("refuses a column that is not a result path", async () => {
        const session = await scored();
        for (const column of ["label", "results.degree", "results.degree.value.deeper", "results..value"]) {
            try {
                session.data.nodePage({ columns: [column] });
                assert.fail(`accepted ${column}`);
            } catch (error) {
                assert.isTrue(isGraphtyError(error) && error.code === "E_OPTION_RANGE", String(error));
            }
        }

        session.dispose();
    });
});
