/**
 * @file `session.recipes`: what applying a hand-written recipe does with commands it cannot
 * replay (a malformed command, filter or set, a repeated run name, an unknown algorithm or layout
 * dimension), the run choices it passes on, and what `export` writes for scopes, seeds, columns a
 * run reads and filters that are off.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";

/** Every run the executor was asked for, by run id. */
const started: string[] = [];

/**
 * Answer every algorithm with an empty node measurement, counting what ran.
 * @param context - The run.
 * @returns Its outcome.
 */
function execute(context: RunExecutionContext): Promise<RunOutcome> {
    started.push(context.runId);
    const result = createRunResult({
        runId: context.runId,
        shape: "node-metric",
        fields: [
            {
                name: "value",
                plainName: "Value",
                technicalName: "value",
                kind: "node",
                type: "number",
                path: "store.graphty.$.value",
            },
        ],
        measured: { nodes: 0, edges: 0 },
        nodes: [],
        edges: [],
        caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", facts: [], notes: [] },
        durationMs: 1,
    });
    return Promise.resolve({ result, summary: result.summary() });
}

/**
 * A session with a small graph: a numeric node column and a weighted edge column.
 * @returns The session.
 */
async function graph(): Promise<GraphSession> {
    started.length = 0;
    const session = createGraphSession({ features: ["save-files-v2"], runs: { execute } });
    await session.data.addNodes([
        { id: "a", score: 1 },
        { id: "b", score: 2 },
        { id: "c", score: 3 },
        { id: "d", score: 4 },
    ]);
    await session.data.addEdges([
        { src: "a", dst: "b", weight: 1 },
        { src: "b", dst: "c", weight: 2 },
    ]);
    return session;
}

/**
 * A recipe section file holding the commands, under the namespace `lab`.
 * @param commands - The commands.
 * @returns The file's text.
 */
function recipe(commands: unknown): string {
    return JSON.stringify({
        kind: "graphty-recipe",
        version: 2,
        generator: { name: "test", version: "0.0.0" },
        namespace: "lab",
        commands,
    });
}

/**
 * Apply hand-written commands to a fresh graph.
 * @param commands - The commands.
 * @returns The session and each problem as `code pointer-or-run`.
 */
async function apply(commands: unknown): Promise<{ session: GraphSession; problems: string[] }> {
    const session = await graph();
    const report = await session.recipes.apply(recipe(commands));
    const problems = report.problems.map((problem) => {
        const params = problem.params as Readonly<Record<string, string | undefined>>;
        const where = params.pointer ?? params.run ?? "";
        return params.reason === undefined ? `${problem.code} ${where}` : `${problem.code} ${where} ${params.reason}`;
    });
    return { session, problems };
}

/**
 * The commands `export` writes.
 * @param session - The session.
 * @returns The recipe section of the exported file.
 */
async function exported(
    session: GraphSession,
): Promise<{ commands: Record<string, unknown>[]; dependencies?: unknown }> {
    const { text } = await session.recipes.export();
    const file = JSON.parse(text) as {
        sections: { recipe: { commands: Record<string, unknown>[]; dependencies?: unknown } };
    };
    return file.sections.recipe;
}

const runIds = (session: GraphSession): string[] => session.runs.list().map((run) => run.id);

describe("session.recipes.apply, commands it cannot replay", () => {
    it("stops at a command that is not an object, listing the runs after it as not run", async () => {
        const { session, problems } = await apply([
            { op: "algo.run", algorithm: "degree", as: "first" },
            42,
            { op: "algo.run", algorithm: "degree", as: "later" },
        ]);
        assert.deepEqual(runIds(session), ["lab__first"], "a run with no params and no style still runs");
        assert.deepEqual(started, ["lab__first"]);
        assert.includeMembers(problems, ["E_BAD_DOCUMENT /commands/1", "W_RUN_NOT_RUN lab__later"]);
        session.dispose();
    });

    for (const [what, filter, pointer] of [
        ["a where that is not text", { op: "graph.filter", where: 3 }, "/commands/0"],
        [
            "an on naming neither nodes nor edges",
            { op: "graph.filter", where: "data.score > `1`", on: "faces" },
            "/commands/0",
        ],
        [
            "dropIsolated, which has no exact form",
            { op: "graph.filter", where: "data.score > `1`", dropIsolated: true },
            "/commands/0/dropIsolated",
        ],
    ] as const) {
        it(`stops at a filter with ${what}, adding no step`, async () => {
            const { session, problems } = await apply([filter, { op: "algo.run", algorithm: "degree", as: "after" }]);
            assert.lengthOf(session.visibility.steps, 0);
            assert.deepEqual(started, [], "nothing after the filter ran");
            assert.includeMembers(problems, [`E_BAD_DOCUMENT ${pointer}`, "W_RUN_NOT_RUN lab__after"]);
            session.dispose();
        });
    }

    it("skips a set with no name and goes on; a set under a hand-made id scopes a later run", async () => {
        const { session, problems } = await apply([
            { op: "set.define", id: "set_nameless", where: "data.score > `1`", reading: "induced" },
            { op: "set.define", id: "set_high", name: "High", where: "data.score > `2`", reading: "induced" },
            { op: "algo.run", algorithm: "degree", as: "on_high", scope: { set: "set_high" } },
        ]);
        assert.include(problems, "E_BAD_DOCUMENT /commands/0");
        assert.deepEqual(
            session.sets.list().map((set) => set.name),
            ["High"],
        );
        const [high] = session.sets.list();
        const run = session.runs.get("lab__on_high");
        assert.isDefined(run);
        assert.deepEqual(run.record.scope.spec, { set: high.id }, "the recipe's set id is bound to the session's");
        session.dispose();
    });

    it("lists a run scoped by a set the recipe never defined as not run, with the refusal's code", async () => {
        const { session, problems } = await apply([
            { op: "algo.run", algorithm: "degree", as: "orphan", scope: { set: "set_missing" } },
        ]);
        assert.isUndefined(session.runs.get("lab__orphan"));
        assert.isTrue(
            problems.some((problem) => problem.startsWith("W_RUN_NOT_RUN lab__orphan E_")),
            problems.join("; "),
        );
        session.dispose();
    });

    it("refuses a repeated run name without running it twice, and an algorithm it does not know", async () => {
        const { session, problems } = await apply([
            { op: "algo.run", algorithm: "degree", as: "deg" },
            { op: "algo.run", algorithm: "degree", as: "deg" },
            { op: "algo.run", algorithm: "no-such-algorithm", as: "ghost" },
        ]);
        assert.deepEqual(started, ["lab__deg"]);
        assert.include(problems, "E_BAD_DOCUMENT /commands/1");
        assert.notInclude(problems, "W_RUN_NOT_RUN lab__deg", "the first run with that name ran");
        assert.isTrue(
            problems.some((problem) => problem.startsWith("W_RUN_NOT_RUN lab__ghost")),
            problems.join("; "),
        );
        session.dispose();
    });

    it("goes on past an unknown op with no name that says it narrows nothing", async () => {
        const { session, problems } = await apply([
            { op: "lab.paint-sky", narrows: false },
            { op: "algo.run", algorithm: "degree", as: "deg" },
        ]);
        assert.include(problems, "E_UNKNOWN_COMMAND /commands/0/op");
        assert.deepEqual(started, ["lab__deg"]);
        session.dispose();
    });

    it("leaves the layout as it is for a layout.set with a dimension other than 2 or 3", async () => {
        const session = await graph();
        const before = { id: session.layout.id, dimension: session.layout.dimension };
        const report = await session.recipes.apply(recipe([{ op: "layout.set", id: "circular", dimension: 4 }]));
        assert.deepEqual({ id: session.layout.id, dimension: session.layout.dimension }, before);
        assert.isTrue(
            report.problems.some(
                (problem) =>
                    problem.code === "E_BAD_DOCUMENT" &&
                    (problem.params as { pointer?: string }).pointer === "/commands/0",
            ),
        );
        session.dispose();
    });
});

describe("session.recipes.apply, run choices", () => {
    it("passes the scope, seed, sample and exact a command names to the run", async () => {
        const { session, problems } = await apply([
            {
                op: "algo.run",
                algorithm: "louvain",
                as: "groups",
                scope: "largest-component",
                seed: 7,
                sample: 2,
                exact: false,
                style: false,
            },
        ]);
        const run = session.runs.get("lab__groups");
        assert.isDefined(run, problems.join("; "));
        assert.strictEqual(run.record.scope.spec, "largest-component");
        assert.strictEqual(run.record.seed, 7);
        session.dispose();
    });
});

describe("session.recipes.export", () => {
    it("writes no filter for a step that is off", async () => {
        const session = await graph();
        await session.visibility.setSteps([
            { id: "off", on: false, rule: { kind: "expression", where: "data.score > `1`" } },
        ]);
        const { commands } = await exported(session);
        assert.notInclude(
            commands.map((command) => command.op),
            "graph.filter",
        );
        session.dispose();
    });

    it("writes a largest-component scope, a predicate scope and a seed as the run had them", async () => {
        const session = await graph();
        await session.runs.start("louvain", undefined, {
            as: "lab__groups",
            scope: "largest-component",
            seed: 11,
            style: false,
        });
        await session.runs.start("degree", undefined, {
            as: "lab__big",
            scope: { where: "data.score > `1`" },
            style: false,
        });
        const { commands } = await exported(session);
        const runs = commands.filter((command) => command.op === "algo.run");
        const groups = runs.find((command) => command.as === "groups");
        const big = runs.find((command) => command.as === "big");
        assert.strictEqual(groups?.scope, "largest-component");
        assert.strictEqual(groups?.seed, 11);
        assert.deepEqual(big?.scope, { where: "data.score > `1`" });
        session.dispose();
    });

    it("leaves out a run over the whole graph beneath a recipe filter, which it cannot write exactly", async () => {
        const session = await graph();
        await session.visibility.setSteps([
            { id: "s1", on: true, rule: { kind: "expression", where: "data.score > `1`" } },
        ]);
        await session.runs.start("degree", undefined, { as: "lab__all", scope: "graph", style: false });
        const { commands } = await exported(session);
        assert.deepEqual(
            commands.map((command) => command.op),
            ["graph.filter", "layout.set"],
        );
        session.dispose();
    });

    it("leaves out a run over the visible graph when something the recipe cannot hold narrows it", async () => {
        const session = await graph();
        await session.visibility.setSteps([
            { id: "near", on: true, rule: { kind: "neighborhood", seeds: ["a"], depth: 1 } },
        ]);
        await session.runs.start("degree", undefined, { as: "lab__seen", scope: "visible", style: false });
        const { commands } = await exported(session);
        assert.deepEqual(
            commands.map((command) => command.op),
            ["layout.set"],
        );
        session.dispose();
    });

    it("lists the edge column a run's attribute option reads as a dependency", async () => {
        const session = await graph();
        await session.runs.start("pagerank", { weight: "weight" }, { as: "lab__rank", style: false });
        const { dependencies } = await exported(session);
        const columns = (dependencies as { columns?: { kind: string; name: string }[] } | undefined)?.columns ?? [];
        assert.deepInclude(
            columns.map(({ kind, name }) => ({ kind, name })),
            { kind: "edge", name: "weight" },
        );
        session.dispose();
    });
});
