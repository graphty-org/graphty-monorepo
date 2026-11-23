/**
 * @file What a version 2 `results` section saves and opens as, read only through `project.save` and
 * `project.open` with the `save-files-v2` experiment on: a hand-edited or damaged section (runs or a
 * layout record missing members, columns of the wrong shape, references that bind nowhere), a rerun
 * whose values disagree with the file (graph, node, edge and community fields), a seeded rerun on
 * other code, a node-set option naming a removed node, and a 2D layout.
 */

import { assert, beforeEach, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { FieldDescriptor } from "../../../src/catalog/types";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";

type Json = Record<string, unknown>;

/** What the executor answers with; each test sets it. */
const answer = {
    /** Each node's value, by node id. */
    values: { a: 0, b: 1, c: 2 } as Record<string, unknown>,
    /** The `group` field's value per node, written only when set. */
    groups: undefined as Record<string, unknown> | undefined,
    /** The graph-level `total` field, written only when set. */
    total: undefined as number | undefined,
    /** Whether each edge carries a `weight` field. */
    edges: false,
};

/** The runs the executor computed, by algorithm. */
const computed: string[] = [];

/**
 * A field descriptor.
 * @param name - Its name.
 * @param kind - Its kind.
 * @returns The descriptor.
 */
function field(name: string, kind: FieldDescriptor["kind"]): FieldDescriptor {
    return { name, plainName: name, technicalName: name, kind, type: "number", path: `results.$.${name}` };
}

/**
 * Answer a run from {@link answer}, counting it.
 * @param context - The run.
 * @param session - The session it runs in, for its edge ids.
 * @returns Its outcome.
 */
function respond(context: RunExecutionContext, session: GraphSession): Promise<RunOutcome> {
    computed.push(context.algorithm);
    const nodeIds = Object.keys(answer.values);
    const fields = [
        field("value", "node"),
        ...(answer.groups === undefined ? [] : [field("group", "node")]),
        ...(answer.total === undefined ? [] : [field("total", "graph")]),
        ...(answer.edges ? [field("weight", "edge")] : []),
    ];
    const result = createRunResult({
        runId: context.runId,
        shape: "node-metric",
        fields,
        measured: { nodes: nodeIds.length, edges: 2 },
        graph: answer.total === undefined ? {} : { total: answer.total },
        nodes: nodeIds.map((id) => ({
            id,
            values: { value: answer.values[id], ...(answer.groups === undefined ? {} : { group: answer.groups[id] }) },
        })),
        edges: answer.edges
            ? session.data.edges().map((edge, at) => ({ id: edge.id, values: { weight: at + 1 } }))
            : [],
        caveats: {
            exact: true,
            direction: "as-loaded",
            precision: "f64",
            method: "test",
            facts: [],
            notes: [],
        },
        durationMs: 1,
    });
    return Promise.resolve({ result, summary: result.summary() });
}

/**
 * An empty session whose runs {@link respond} answers.
 * @returns The session.
 */
function blank(): GraphSession {
    const session: GraphSession = createGraphSession({
        features: ["save-files-v2"],
        runs: { execute: (context) => respond(context, session) },
    });
    return session;
}

/**
 * A session holding the path a-b-c.
 * @returns The session.
 */
async function path(): Promise<GraphSession> {
    const session = blank();
    await session.data.addNodes(["a", "b", "c"].map((id) => ({ id })));
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);
    return session;
}

/**
 * A version 2 save, parsed.
 * @param session - The session.
 * @returns The file.
 */
async function saved(session: GraphSession): Promise<Json> {
    const { text } = await session.project.save({ format: 2, results: true, markSaved: false });
    return JSON.parse(text) as Json;
}

/**
 * A file's section.
 * @param file - The file.
 * @param name - The section.
 * @returns It.
 */
function section(file: Json, name: string): Json {
    return (file.sections as Record<string, Json>)[name];
}

/**
 * A file's results runs.
 * @param file - The file.
 * @returns The runs, by id.
 */
function runsOf(file: Json): Record<string, Json> {
    return section(file, "results").runs as Record<string, Json>;
}

/**
 * A file with no view section, so no view starts the runs and the results section restores them.
 * @param file - The file.
 * @returns It, changed in place.
 */
function withoutView(file: Json): Json {
    delete (file.sections as Json).view;
    return file;
}

/**
 * Open a file in a new session.
 * @param file - The file.
 * @param rerun - Whether the runs the view records run again.
 * @returns The session and the problems the open reported.
 */
async function reopen(
    file: Json,
    rerun = false,
): Promise<{ session: GraphSession; problems: { code: string; params?: Json }[] }> {
    const session = blank();
    const report = await session.project.open(JSON.stringify(file), { rerun });
    assert.strictEqual(report.opened, "project");
    return { session, problems: report.problems as { code: string; params?: Json }[] };
}

/**
 * The runs a report lists as not run.
 * @param problems - The report.
 * @returns Their ids.
 */
function notRun(problems: readonly { code: string; params?: Json }[]): unknown[] {
    return problems.filter((problem) => problem.code === "W_RUN_NOT_RUN").map((problem) => problem.params?.run);
}

/**
 * The codes of a report.
 * @param problems - The report.
 * @returns The codes.
 */
const codes = (problems: readonly { code: string }[]): string[] => problems.map((problem) => problem.code);

beforeEach(() => {
    computed.length = 0;
    Object.assign(answer, { values: { a: 0, b: 1, c: 2 }, groups: undefined, total: undefined, edges: false });
});

describe("a hand-edited results section", () => {
    it("lists a run whose entry is not an object, or whose algorithm is not named, as not run, and keeps the rest", async () => {
        const session = await path();
        await session.runs.start("degree", {});
        const file = withoutView(await saved(session));
        const runs: Record<string, unknown> = runsOf(file);
        runs.broken = "not a run";
        runs.nameless = { ...(runs.degree as Json), algorithm: 7 };
        computed.length = 0;

        const { session: opened, problems } = await reopen(file);
        assert.sameMembers(notRun(problems), ["broken", "nameless"]);
        assert.deepEqual(
            opened.runs.list().map((run) => run.id),
            ["degree"],
        );
        assert.deepEqual(computed, [], "the saved run is restored, never computed");
        // The run no algorithm could restore is written back as it was read.
        assert.deepEqual(runsOf(await saved(opened)).nameless, runs.nameless);
    });

    it("opens nothing from a runs member that is not an object", async () => {
        const session = await path();
        await session.runs.start("degree", {});
        const file = withoutView(await saved(session));
        section(file, "results").runs = ["degree"];
        const { session: opened, problems } = await reopen(file);
        assert.notInclude(codes(problems), "W_RUN_NOT_RUN");
        assert.deepEqual(opened.runs.list(), []);
    });

    it("restores a run whose optional members are missing or of the wrong shape, reading only the values it can", async () => {
        const session = await path();
        await session.runs.start("degree", {});
        const file = withoutView(await saved(session));
        const run = runsOf(file).degree;
        const nodes = run.nodes as { refs: unknown[]; columns: Record<string, unknown> };
        // One column is not a list, one cell is null: neither gives a value.
        nodes.columns = { value: [5, null, 7], other: "not a column" };
        delete run.durationMs;
        delete run.params;
        run.caveats = "none";
        run.engine = "unknown";
        run.bindsTo = "nothing";
        run.graph = "nothing";
        computed.length = 0;

        const { session: opened, problems } = await reopen(file);
        assert.deepEqual(notRun(problems), []);
        const result = opened.runs.get("degree")?.result;
        assert.isDefined(result);
        assert.strictEqual(result.node("a")?.value, 5);
        assert.isUndefined(result.node("b")?.value);
        assert.strictEqual(result.node("c")?.value, 7);
        assert.deepEqual(computed, []);
        assert.include(codes(problems), "W_DATA_CHANGED", "a binding that is not an object names no build");
    });

    it("restores a run whose fields and columns are not lists or objects with no values", async () => {
        const session = await path();
        await session.runs.start("degree", {});
        const file = withoutView(await saved(session));
        const run = runsOf(file).degree;
        run.fields = "value";
        run.nodes = { refs: (run.nodes as Json).refs, columns: "value" };
        run.params = "total";

        const { session: opened, problems } = await reopen(file);
        assert.deepEqual(notRun(problems), []);
        const result = opened.runs.get("degree")?.result;
        assert.isDefined(result);
        assert.deepEqual(result.fields, []);
        assert.deepEqual(result.node("a"), {});
    });

    it("leaves a run whose node option names a node the data lacks not run, and reports the reference", async () => {
        const session = await path();
        await session.runs.start("removal-impact", { nodes: ["a", "b"] });
        const file = withoutView(await saved(session));
        const run = Object.values(runsOf(file))[0];
        const [id] = Object.keys(runsOf(file));
        const refs = (run.params as { nodes: Json[] }).nodes;
        assert.lengthOf(refs, 2);
        refs[1] = { ...refs[1], key: "gone" };
        computed.length = 0;

        const { session: opened, problems } = await reopen(file);
        assert.deepEqual(notRun(problems), [id]);
        const unbound = problems.filter((problem) => problem.code === "W_REFERENCE_UNBOUND");
        assert.lengthOf(unbound, 1);
        assert.match(String(unbound[0].params?.pointer), /\/params\/nodes\/1$/);
        assert.deepEqual(opened.runs.list(), []);
        assert.deepEqual(computed, []);
    });

    it("leaves a run whose start node is not in the data not run", async () => {
        const session = await path();
        await session.runs.start("bfs", { source: "a" });
        const file = withoutView(await saved(session));
        const [id] = Object.keys(runsOf(file));
        const params = runsOf(file)[id].params as Json;
        params.source = { ...(params.source as Json), key: "gone" };
        computed.length = 0;

        const { session: opened, problems } = await reopen(file);
        assert.deepEqual(notRun(problems), [id]);
        assert.deepEqual(
            problems
                .filter((problem) => problem.code === "W_REFERENCE_UNBOUND")
                .map((problem) => problem.params?.pointer),
            [`/sections/results/runs/${id}/params/source`],
        );
        assert.deepEqual(opened.runs.list(), []);
        assert.deepEqual(computed, []);
    });

    it("restores a sampled run at the sample size its caveats record", async () => {
        const session = await path();
        await session.runs.start("betweenness", {});
        const file = withoutView(await saved(session));
        const [id] = Object.keys(runsOf(file));
        runsOf(file)[id].caveats = { ...(runsOf(file)[id].caveats as Json), exact: false, sampleSize: 2 };
        computed.length = 0;

        const { session: opened, problems } = await reopen(file);
        assert.deepEqual(notRun(problems), []);
        assert.deepEqual(computed, []);
        assert.strictEqual(opened.runs.get(id)?.result?.node("c")?.value, 2);
    });

    it("leaves a run not run, with the code it was refused with, when its saved options are refused", async () => {
        const session = await path();
        await session.runs.start("degree", {});
        const file = withoutView(await saved(session));
        (runsOf(file).degree.params as Json).direction = "sideways";

        const { session: opened, problems } = await reopen(file);
        const refused = problems.find((problem) => problem.code === "W_RUN_NOT_RUN");
        assert.strictEqual(refused?.params?.run, "degree");
        assert.isString(refused?.params?.reason);
        assert.deepEqual(opened.runs.list(), []);
        // Kept as read, so a save writes it back.
        assert.strictEqual((runsOf(await saved(opened)).degree.params as Json).direction, "sideways");
    });
});

describe("a hand-edited layout record", () => {
    /**
     * A file whose results section holds a layout record, from a session with placed nodes.
     * @returns The file.
     */
    async function placed(): Promise<Json> {
        const session = await path();
        await session.positions.set([
            { id: "a", x: 1, y: 2, z: 3 },
            { id: "b", x: 4, y: 5, z: 6 },
            { id: "c", x: 7, y: 8, z: 9 },
        ]);
        const file = withoutView(await saved(session));
        assert.isDefined(section(file, "results").layout, "a placed graph saves its layout");
        return file;
    }

    it("places the nodes it can bind at finite coordinates, and reports a reference that binds nowhere", async () => {
        const file = await placed();
        const layout = section(file, "results").layout as {
            nodes: { refs: Json[]; columns: Record<string, unknown[]> };
        };
        layout.nodes.refs[2] = { ...layout.nodes.refs[2], key: "gone" };
        layout.nodes.columns.x[1] = "not a number";

        const { session, problems } = await reopen(file);
        assert.deepEqual(
            problems
                .filter((problem) => problem.code === "W_REFERENCE_UNBOUND")
                .map((problem) => problem.params?.pointer),
            ["/sections/results/layout/nodes/refs/2"],
        );
        const snapshot = session.positions.snapshot();
        const at = snapshot.order.indexOf("a");
        assert.isAtLeast(at, 0);
        assert.deepEqual([...snapshot.xyz.slice(at * 3, at * 3 + 3)], [1, 2, 3]);
    });

    it("places nothing from a record whose nodes, refs or columns are missing", async () => {
        for (const damage of [
            (layout: Json) => delete layout.nodes,
            (layout: Json) => ((layout.nodes as Json).refs = "a"),
            (layout: Json) => ((layout.nodes as Json).columns = "xyz"),
            (layout: Json) => ((layout.nodes as Json).columns = { x: "1", y: [], z: [] }),
        ]) {
            const file = await placed();
            damage(section(file, "results").layout as Json);
            const { session, problems } = await reopen(file);
            assert.notInclude(codes(problems), "W_REFERENCE_UNBOUND");
            const snapshot = session.positions.snapshot();
            const at = snapshot.order.indexOf("a");
            assert.notDeepEqual(at < 0 ? [] : [...snapshot.xyz.slice(at * 3, at * 3 + 3)], [1, 2, 3]);
        }
    });

    it("writes a 2D layout's dimension as 2", async () => {
        const session = await path();
        await session.layout.setDimension("2d");
        await session.positions.set([
            { id: "a", x: 1, y: 2, z: 0 },
            { id: "b", x: 4, y: 5, z: 0 },
            { id: "c", x: 7, y: 8, z: 0 },
        ]);
        const layout = section(await saved(session), "results").layout as Json;
        assert.strictEqual(layout.dimension, 2);
    });
});

describe("a rerun compared with the saved values", () => {
    /**
     * Save one run, change what the executor answers, and reopen with reruns on.
     * @param algorithm - The algorithm.
     * @param change - Changes {@link answer}, or the file, before the reopen.
     * @param options - The run's options.
     * @param options.seed - A seed.
     * @returns The problems.
     */
    async function rerunWith(
        algorithm: string,
        change: (file: Json) => void,
        options: { seed?: number } = {},
    ): Promise<{ code: string; params?: Json }[]> {
        const session = await path();
        await session.runs.start(algorithm, {}, options);
        const file = await saved(session);
        change(file);
        computed.length = 0;
        const { problems } = await reopen(file, true);
        assert.deepEqual(computed, [algorithm], "the view's run is computed again");
        return problems;
    }

    it("reports a graph-level value that changed", async () => {
        answer.total = 3;
        const problems = await rerunWith("degree", () => (answer.total = 4));
        assert.include(codes(problems), "W_RESULTS_DIFFER");
    });

    it("reports nothing when every value comes back the same, edge values included", async () => {
        answer.total = 3;
        answer.edges = true;
        const problems = await rerunWith("degree", () => undefined);
        assert.notInclude(codes(problems), "W_RESULTS_DIFFER");
    });

    it("accepts communities renumbered the same way, and reports communities that split", async () => {
        answer.groups = { a: 0, b: 1, c: 1 };
        const renamed = await rerunWith("louvain", () => (answer.groups = { a: 8, b: 9, c: 9 }));
        assert.notInclude(codes(renamed), "W_RESULTS_DIFFER");

        answer.groups = { a: 0, b: 1, c: 1 };
        const split = await rerunWith("louvain", () => (answer.groups = { a: 8, b: 8, c: 9 }));
        assert.include(codes(split), "W_RESULTS_DIFFER");
    });

    it("reports a seeded run that ran again on other code than the file names", async () => {
        const problems = await rerunWith(
            "louvain",
            (file) => {
                const [run] = Object.values(runsOf(file));
                assert.strictEqual(run.seed, 7);
                (run.engine as { packages: Json }).packages["@graphty/algorithms"] = "0.0.1";
            },
            { seed: 7 },
        );
        const changed = problems.filter((problem) => problem.code === "W_ENGINE_CHANGED");
        assert.deepEqual(
            changed.map((problem) => [problem.params?.key, problem.params?.was]),
            [["@graphty/algorithms", "0.0.1"]],
        );
    });
});

describe("saving a run whose node-set option names a node removed since", () => {
    it("writes the nodes still there and reports the option", async () => {
        const session = await path();
        await session.runs.start("removal-impact", { nodes: ["a", "b"] });
        await session.data.removeNodes(["b"]);
        const { text, report } = await session.project.save({ format: 2, results: true, markSaved: false });
        const file = JSON.parse(text) as Json;
        const run = Object.values(runsOf(file))[0];
        assert.lengthOf((run.params as { nodes: unknown[] }).nodes, 1);
        assert.include(codes(report.leftOut), "W_ELEMENT_NAMING_LEFT_OUT");
    });
});
