import { assert, describe, expectTypeOf, it } from "vitest";

import { createGraphSession, type GraphSession, isGraphtyError, type PageColumn } from "../../session";
import type { FieldDescriptor } from "../../src/catalog/types";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";

/** What a stand-in run publishes, by run id or algorithm. */
interface Published {
    readonly shape?: "node-metric" | "edge-metric" | "community";
    readonly nodes?: readonly (readonly [string, number])[];
    readonly edges?: readonly (readonly [string, boolean])[];
    /** Settles before the run publishes, so a test can read a page while it is still running. */
    readonly gate?: Promise<void>;
}

const published = new Map<string, Published>();

/**
 * A field descriptor for the stand-in runs.
 * @param runId - the run
 * @param name - the field
 * @param kind - nodes, edges or the graph
 * @param type - its type
 * @returns the descriptor
 */
function field(runId: string, name: string, kind: FieldDescriptor["kind"], type: FieldDescriptor["type"]) {
    return { name, plainName: name, technicalName: name, kind, type, path: `results.${runId}.${name}` } as const;
}

/**
 * Publishes whatever {@link published} holds for the run when it executes, so a rerun publishes
 * what the test changed it to. A standalone session runs no algorithm of its own.
 * @param context - the run
 * @returns the outcome
 */
async function execute(context: RunExecutionContext): Promise<RunOutcome> {
    const spec = published.get(context.runId) ?? published.get(context.algorithm) ?? {};
    await spec.gate;
    const { nodes = [], edges = [] } = spec;
    const shape = spec.shape ?? (edges.length > 0 ? "edge-metric" : "node-metric");
    const id = context.runId;
    const fields = {
        community: [
            field(id, "group", "node", "integer"),
            field(id, "groupSize", "node", "integer"),
            field(id, "sizes", "graph", "table"),
        ],
        "edge-metric": [field(id, "value", "edge", "boolean")],
        "node-metric": [field(id, "value", "node", "number")],
    }[shape];
    const key = shape === "community" ? "group" : "value";
    return {
        result: createRunResult({
            runId: id,
            shape,
            fields,
            measured: { nodes: nodes.length, edges: edges.length },
            nodes: nodes.map(([node, value]) => ({ id: node, values: { [key]: value } })),
            edges: edges.map(([edge, value]) => ({ id: edge, values: { value } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", notes: [] },
            durationMs: 1,
        }),
    };
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

/**
 * The error a call throws.
 * @param call - the call
 * @returns its error code and details
 */
function refusal(call: () => unknown): { code: string; details: Readonly<Record<string, unknown>> } {
    try {
        call();
    } catch (error) {
        assert.isTrue(isGraphtyError(error), String(error));
        if (isGraphtyError(error)) {
            return { code: error.code, details: error.details ?? {} };
        }
    }

    return assert.fail("did not throw");
}

/*
 * `columns` and a result `sort` on `nodePage` and `edgePage`: a table shows a run's values beside
 * the records and sorts by them, addressed by the run, never by a path.
 */
describe("result values as page columns", () => {
    it("runs the guide's example (docs/guide/result-columns.md)", async () => {
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
        const lines: unknown[][] = [];
        const console = { log: (...args: unknown[]) => lines.push(args) };

        // The guide's code, as written.
        const run = await element.run("pagerank");

        const page = element.session.data.nodePage({
            columns: [run],
            sort: { run, descending: true },
            limit: 10,
        });
        const [rank] = page.columns;

        page.records.forEach((node, i) => {
            console.log(node.id, rank?.values[i]);
        });

        assert.deepStrictEqual(lines, [
            ["grace", 0.5],
            ["alan", 0.3],
            ["ada", 0.2],
        ]);
        session.dispose();
    });

    it("returns each column in request order, with the field, path and type, and leaves the records alone", async () => {
        const session = await scored();
        const run = session.runs.get("degree");
        assert.isDefined(run);
        if (run === undefined) {
            return;
        }

        const page = session.data.nodePage({ columns: [{ run: "degree", field: "value" }, run], limit: 2 });

        assert.lengthOf(page.columns ?? [], 2);
        const [first, second] = page.columns ?? [];
        assert.deepStrictEqual(
            { ...first, values: [...(first?.values ?? [])] },
            {
                run: "degree",
                field: "value",
                path: "results.degree.value",
                type: "number",
                pending: false,
                values: [3, 2],
            },
        );
        assert.deepStrictEqual(second?.values, first?.values, "a run with no field means its primary field");
        assert.deepStrictEqual(Object.keys(page.records[0] ?? {}), ["id"], "no result key is added to a record");
        assert.isTrue(Object.isFrozen(page.columns) && Object.isFrozen(first) && Object.isFrozen(first?.values));
        assert.isUndefined(session.data.nodePage().columns, "no columns asked, no columns returned");
        session.dispose();
    });

    it("sorts by a run's values, ties in graph order, unmeasured last in either direction", async () => {
        const session = await scored();

        const ids = (descending: boolean): unknown[] =>
            session.data.nodePage({ sort: { run: "degree", descending } }).records.map((record) => record.id);

        assert.deepStrictEqual(ids(true), ["hub", "a", "b", "c", "alone"]);
        assert.deepStrictEqual(ids(false), ["c", "a", "b", "hub", "alone"]);
        session.dispose();
    });

    it("sorts a grouping field by group size, not by group id", async () => {
        const session = createGraphSession({ runs: { execute } });
        await session.data.addNodes(["p", "q", "r", "s", "t", "u"].map((id) => ({ id })));
        published.set("louvain", {
            shape: "community",
            nodes: [
                ["p", 0],
                ["q", 1],
                ["r", 1],
                ["s", 1],
                ["t", 0],
                ["u", 2],
            ],
        });
        const run = await session.runs.start("louvain", undefined, { style: false });

        const page = session.data.nodePage({ columns: [run], sort: { run, descending: true } });

        assert.deepStrictEqual(
            page.records.map((record) => record.id),
            ["q", "r", "s", "p", "t", "u"],
        );
        assert.deepStrictEqual(page.columns?.[0]?.values, [1, 1, 1, 0, 0, 2], "cells hold the raw group");
        session.dispose();
    });

    it("gives each cell of a group column the rank the summary names that group by (#905)", async () => {
        const session = createGraphSession({ runs: { execute } });
        await session.data.addNodes(["p", "q", "r", "s", "t", "u", "v"].map((id) => ({ id })));
        published.set("louvain", {
            shape: "community",
            nodes: [
                ["p", 0],
                ["q", 2],
                ["r", 2],
                ["s", 2],
                ["t", 0],
                ["u", 1],
            ],
        });
        const run = await session.runs.start("louvain", undefined, { style: false });

        const [column] = session.data.nodePage({ columns: [run] }).columns ?? [];

        assert.deepStrictEqual(column?.values, [0, 2, 2, 2, 0, 1, undefined]);
        assert.deepStrictEqual(column?.ranks, [2, 1, 1, 1, 2, 3, undefined], "group 2 is the largest, so rank 1");
        const byGroup = new Map(run.summary().groups?.map((group) => [group.group, group.rank]));
        column?.values.forEach((value, index) => {
            assert.strictEqual(column.ranks?.[index], byGroup.get(value as number), "the summary agrees");
        });
        const scores = session.data.nodePage({ columns: [{ run, field: "groupSize" }] }).columns?.[0];
        assert.isUndefined(scores?.ranks, "a column that is not the groups carries no ranks");
        session.dispose();
    });

    it("reports a run with no result yet as pending", async () => {
        const session = await scored();
        let open = (): void => undefined;
        published.set("slow", {
            gate: new Promise<void>((resolve) => {
                open = resolve;
            }),
            nodes: [["a", 1]],
        });
        const run = session.runs.start("degree", undefined, { as: "slow", style: false });

        const during = session.data.nodePage({ columns: [run], sort: { run, descending: true } });
        assert.isTrue(during.columns?.[0]?.pending);
        assert.deepStrictEqual(during.columns?.[0]?.values, [undefined, undefined, undefined, undefined, undefined]);

        open();
        await run;
        const after = session.data.nodePage({ columns: [run], sort: { run, descending: true } });
        assert.isFalse(after.columns?.[0]?.pending);
        assert.notStrictEqual(after.revision, during.revision);
        assert.deepStrictEqual(after.columns?.[0]?.values, [1, undefined, undefined, undefined, undefined]);
        session.dispose();
    });

    it("shows a rerun's new values once it publishes", async () => {
        const session = await scored();
        const before = session.data.nodePage({ columns: ["degree"] });
        published.set("degree", {
            nodes: [
                ["hub", 3],
                ["alone", 9],
            ],
        });
        await session.runs.get("degree")?.rerun();

        const after = session.data.nodePage({ columns: ["degree"], sort: { run: "degree", descending: true } });
        assert.notStrictEqual(after.revision, before.revision);
        assert.deepStrictEqual(
            after.records.map((record, i) => [record.id, after.columns?.[0]?.values[i]]),
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

    it("runs the guide's keep-current example: one session revision, a rerun, then a removal", async () => {
        const session = await scored();
        const element = { session };
        const run = session.runs.get("degree");
        assert.isDefined(run);
        if (run === undefined) {
            return;
        }
        let redraws = 0;

        // The guide's code, as written ("redraw" counted).
        const options = { columns: [run], sort: { run, descending: true }, limit: 20 };
        let page = element.session.data.nodePage(options);

        function reread(): void {
            if (element.session.data.nodePage({ limit: 0 }).revision === page.revision) {
                return;
            }
            page = element.session.data.nodePage(options);
            redraws++;
        }
        const stopRuns = element.session.on("run:changed", reread);
        const stopEdits = element.session.on("project:changed", reread);

        // The revision is the session's, whatever the options.
        assert.strictEqual(session.data.nodePage({ limit: 0 }).revision, page.revision);
        assert.strictEqual(session.data.edgePage().revision, page.revision);

        published.set("degree", { nodes: [["alone", 9]] });
        await run.rerun();
        assert.isAbove(redraws, 0);
        assert.strictEqual(page.records[0]?.id, "alone");
        assert.strictEqual(page.columns?.[0]?.values[0], 9);

        stopRuns();
        stopEdits();
        const held = redraws;
        session.runs.remove(run.id);
        assert.strictEqual(redraws, held, "a stopped listener is not called");
        assert.isUndefined(session.runs.get(run.id), "a removed run is gone from runs.get()");
        assert.strictEqual(refusal(() => session.data.nodePage(options)).code, "E_UNKNOWN_RUN");
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
        const run = await session.runs.start("degree", undefined, { as: "path", style: false });

        const page = session.data.edgePage({ columns: [run], sort: { run, descending: true } });

        assert.deepStrictEqual(
            page.records.map((record, i) => [record.source, record.target, page.columns?.[0]?.values[i]]),
            [
                ["y", "z", true],
                ["x", "y", false],
            ],
        );
        assert.strictEqual(page.columns?.[0]?.type, "boolean");
        session.dispose();
    });

    it("never reads an attribute key as a result: a key sort is always the literal key", async () => {
        const session = await scored();
        await session.data.addNodes([{ id: "spoof", "results.degree.value": 100 }]);

        const page = session.data.nodePage({ sort: { key: "results.degree.value", descending: true }, limit: 1 });

        assert.strictEqual(page.records[0]?.id, "spoof");
        session.dispose();
    });

    it("types columns as present exactly when they were asked for", async () => {
        const session = await scored();
        expectTypeOf(session.data.nodePage({ columns: ["degree"] }).columns).toEqualTypeOf<readonly PageColumn[]>();
        expectTypeOf(session.data.edgePage({ columns: [] }).columns).toEqualTypeOf<readonly PageColumn[]>();
        expectTypeOf(session.data.nodePage({ limit: 1 }).columns).toEqualTypeOf<readonly PageColumn[] | undefined>();
        assert.isArray(session.data.nodePage({ columns: ["degree"] }).columns);
        assert.isUndefined(session.data.nodePage({ limit: 1 }).columns);
        session.dispose();
    });

    it("refuses an unknown run, an unknown field, and a field with no value per record", async () => {
        const session = await scored();
        published.set("louvain", { shape: "community", nodes: [["hub", 0]] });
        await session.runs.start("louvain", undefined, { as: "groups", style: false });

        const unknownRun = refusal(() => session.data.nodePage({ columns: ["degre"] }));
        assert.strictEqual(unknownRun.code, "E_UNKNOWN_RUN");
        assert.include(unknownRun.details.candidates as string[], "degree");
        assert.strictEqual(refusal(() => session.data.nodePage({ columns: ["data.weight"] })).code, "E_UNKNOWN_RUN");

        const path = refusal(() => session.data.nodePage({ columns: ["results.degree.value"] }));
        assert.strictEqual(path.code, "E_UNKNOWN_RUN", "a string is a run id, never a path");
        assert.strictEqual((path.details.candidates as string[])[0], "degree", "the run the path names comes first");
        assert.strictEqual(
            refusal(() => session.data.nodePage({ sort: { run: "nope" } })).code,
            "E_UNKNOWN_RUN",
            "a sort is checked too",
        );

        const unknownField = refusal(() => session.data.nodePage({ columns: [{ run: "degree", field: "valu" }] }));
        assert.strictEqual(unknownField.code, "E_UNKNOWN_ATTRIBUTE");
        assert.include(unknownField.details.candidates as string[], "value");

        assert.strictEqual(refusal(() => session.data.edgePage({ columns: ["degree"] })).code, "E_BAD_COMMAND");
        assert.strictEqual(
            refusal(() => session.data.nodePage({ columns: [{ run: "groups", field: "sizes" }] })).code,
            "E_BAD_COMMAND",
        );
        session.dispose();
    });
});
