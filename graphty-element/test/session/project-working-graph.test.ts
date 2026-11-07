/**
 * @file The project file and the journal keep the scope a run or a layout was given
 * (design/working-graph/design.md, step S9): an open restores the filter before the runs that read
 * what it shows, the layout scope is saved and comes back, and a run started with no scope
 * journals the scope it resolved to.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import type { GraphSession } from "../../src/session/types";
import { CAVEATS } from "./runs/harness";

/** Each node's degree in the path a-b-c-d with a lone node beside it. */
const DEGREE: Readonly<Record<string, number>> = { a: 1, b: 2, c: 2, d: 1, lonely: 0 };

/**
 * An executor that gives each node of the run's scope its degree in the whole graph.
 * @param context - The run.
 * @returns Its outcome.
 */
function degreeOfScope(context: RunExecutionContext): Promise<RunOutcome> {
    const result = createRunResult({
        runId: context.runId,
        shape: "node-metric",
        fields: [
            {
                name: "degree",
                plainName: "Degree",
                technicalName: "degree",
                kind: "node",
                type: "number",
                path: "results.$.degree",
            },
        ],
        measured: { nodes: context.scope.nodeCount, edges: 0 },
        nodes: [...(context.scope.nodes ?? [])].map((id) => ({ id, values: { degree: DEGREE[String(id)] ?? 0 } })),
        edges: [],
        caveats: CAVEATS,
        durationMs: 1,
    });
    return Promise.resolve({ result, summary: result.summary() });
}

/**
 * A session whose runs give degrees.
 * @returns The session.
 */
function sessionWithRuns(): GraphSession {
    return createGraphSession({ runs: { execute: degreeOfScope } });
}

/** The layout slice's scope, which the session reaches only through the element. */
const layoutScopeOf = (session: GraphSession): unknown =>
    (session as unknown as { dispatcher: { state: { layout?: { scope?: unknown } } } }).dispatcher.state.layout
        ?.scope ?? null;

/**
 * A path a-b-c-d and a lone node: a filter keeping degree 1 and up hides the lone node.
 * @returns The session.
 */
async function pathAndLoner(): Promise<GraphSession> {
    const session = sessionWithRuns();
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "lonely" }]);
    await session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
        { src: "c", dst: "d" },
    ]);
    return session;
}

/**
 * Save a session and open the file in a new one.
 * @param session - The session to save.
 * @returns The new session and the open's problems.
 */
async function reopen(session: GraphSession): Promise<{ opened: GraphSession; problems: readonly unknown[] }> {
    const { text } = await session.project.save({ markSaved: false });
    const opened = sessionWithRuns();
    const report = await opened.project.open(text);
    return { opened, problems: report.problems };
}

describe("the project file keeps what a run and a layout were given", () => {
    it("restores the filter before a run over what is shown, so the run comes back current", async () => {
        const session = await pathAndLoner();
        await session.visibility.set({ kind: "degree", min: 1 });
        await session.runs.start("degree", undefined, { as: "r1", style: false });
        assert.strictEqual(session.runs.get("r1")?.scope.nodeCount, 4);

        const { opened, problems } = await reopen(session);
        const run = opened.runs.get("r1");
        assert.deepEqual(problems, []);
        assert.strictEqual(run?.scope.nodeCount, 4, "computed over the four shown nodes, as it was");
        assert.isNull(run?.stale ?? null, "and not out of date");
        session.dispose();
        opened.dispose();
    });

    it("keeps a run that was out of date when saved out of date when opened", async () => {
        const session = await pathAndLoner();
        await session.runs.start("degree", undefined, { as: "r1", style: false });
        await session.visibility.set({ kind: "degree", min: 1 });
        assert.isNotNull(session.runs.get("r1")?.stale ?? null);

        const { opened } = await reopen(session);
        assert.isNotNull(opened.runs.get("r1")?.stale ?? null);
        session.dispose();
        opened.dispose();
    });

    it("restores a run the filter reads before the filter", async () => {
        const session = await pathAndLoner();
        await session.runs.start("degree", undefined, { as: "r1", style: false, scope: "graph" });
        await session.visibility.set({ kind: "range", attribute: "results.r1.degree", min: 2 });
        assert.strictEqual(session.data.statistics({ scope: "visible" }).nodeCount, 2);

        const { opened, problems } = await reopen(session);
        assert.deepEqual(problems, []);
        assert.strictEqual(opened.data.statistics({ scope: "visible" }).nodeCount, 2);
        session.dispose();
        opened.dispose();
    });

    it("saves the layout scope and brings it back", async () => {
        const session = await pathAndLoner();
        await session.execute({ op: "layout.scope", scope: { nodes: ["a", "b"] } });

        const { opened, problems } = await reopen(session);
        assert.deepEqual(problems, []);
        assert.deepEqual(layoutScopeOf(opened), { nodes: ["a", "b"] });
        session.dispose();
        opened.dispose();
    });

    it("keeps a whole-graph layout scope apart from no scope, through save and open", async () => {
        const session = await pathAndLoner();
        await session.execute({ op: "layout.scope", scope: "graph" });
        assert.strictEqual(layoutScopeOf(session), "graph");

        const { opened } = await reopen(session);
        assert.strictEqual(layoutScopeOf(opened), "graph");
        session.dispose();
        opened.dispose();
    });

    it("saves no layout scope when none was given", async () => {
        const session = await pathAndLoner();
        const { text } = await session.project.save({ markSaved: false });
        const member = (JSON.parse(text) as { members: { kind: string; layout?: object }[] }).members.find(
            (each) => each.kind === "graphty-session",
        );
        assert.notProperty(member?.layout, "scope");
        session.dispose();
    });
});

describe("the journal keeps the scope a run resolved to", () => {
    it("writes the default scope into the entry of a run started with none", async () => {
        const session = await pathAndLoner();
        const run = session.runs.start("degree", undefined, { style: false });
        await run;
        const entry = session.journal.get(run.journalId ?? "");
        assert.strictEqual((entry?.command as { scope?: unknown }).scope, "visible");
        session.dispose();
    });

    it("writes a named scope as it was named", async () => {
        const session = await pathAndLoner();
        const run = session.runs.start("degree", undefined, { style: false, scope: "graph" });
        await run;
        const entry = session.journal.get(run.journalId ?? "");
        assert.strictEqual((entry?.command as { scope?: unknown }).scope, "graph");
        session.dispose();
    });
});
