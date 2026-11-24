/**
 * @file `session.runs`: the options a consumer passes through to a run (a signal, a progress
 * callback, a stability series' parameters), what an option outside its listed choices is refused
 * with, how a sweep names two values that spell one id, what a run is called beside a sibling that
 * differs only by scope, and what the lookups answer for a run the session does not hold.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { RunId } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";

/** Every run the executor was asked for, in order. */
const calls: RunExecutionContext[] = [];

/**
 * Answer every algorithm with one node measurement per node, reporting progress once.
 * @param context - The run.
 * @returns Its outcome.
 */
function execute(context: RunExecutionContext): Promise<RunOutcome> {
    calls.push(context);
    context.report({ phase: "measuring", completed: 1, total: 2 });
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
                path: `store.graphty.${context.runId}.value`,
            },
        ],
        measured: { nodes: 3, edges: 2 },
        nodes: ["a", "b", "c"].map((id, index) => ({ id, values: { value: index } })),
        caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", facts: [], notes: [] },
        durationMs: 1,
    });
    return Promise.resolve({ result, summary: result.summary() });
}

/**
 * A session holding a three-node path.
 * @returns The session.
 */
async function graph(): Promise<GraphSession> {
    calls.length = 0;
    const session = createGraphSession({ runs: { execute } });
    await session.data.addNodes([
        { id: "a", score: 1 },
        { id: "b", score: 2 },
        { id: "c", score: 3 },
    ]);
    await session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ]);
    return session;
}

/**
 * The code a call throws, or null when it does not throw.
 * @param call - The call.
 * @returns The code.
 */
function codeOf(call: () => unknown): string | null {
    try {
        call();
        return null;
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not a GraphtyError";
    }
}

describe("options passed through to a run", () => {
    it("hands a started run's progress to the callback it was given beside a signal", async () => {
        const session = await graph();
        const seen: number[] = [];
        const run = session.runs.start(
            "degree",
            {},
            {
                signal: new AbortController().signal,
                onProgress: (update) => seen.push(update.completed),
            },
        );
        await run;

        assert.strictEqual(run.status, "succeeded");
        assert.include(seen, 1, "the executor's report reached the consumer's callback");
        assert.strictEqual(calls.length, 1);
    });

    it("hands a batch's progress to the callback", async () => {
        const session = await graph();
        const seen: number[] = [];
        const batch = session.runs.batch([{ algorithm: "degree" }, { algorithm: "pagerank" }], {
            signal: new AbortController().signal,
            onProgress: (update) => seen.push(update.completed),
        });
        const result = await batch;

        assert.strictEqual(result.completed, 2);
        assert.isAbove(seen.length, 0);
        assert.strictEqual(calls.length, 2);
    });

    it("runs every seed of a stability series with the parameters it was given", async () => {
        const session = await graph();
        await session.runs.stability("louvain", [1, 2], { params: { resolution: 2 } });

        assert.deepStrictEqual(
            calls.map((call) => [call.seed, call.params.resolution]),
            [
                [1, 2],
                [2, 2],
            ],
        );
    });
});

describe("an option outside its listed choices", () => {
    it("is refused before anything runs, naming the choices", async () => {
        const session = await graph();
        let allowed: unknown;
        try {
            session.runs.start("degree", { direction: "sideways" });
        } catch (error) {
            assert.isTrue(isGraphtyError(error));
            assert.strictEqual(isGraphtyError(error) ? error.code : "", "E_OPTION_RANGE");
            allowed = isGraphtyError(error) ? error.details.allowed : undefined;
        }

        assert.deepStrictEqual(allowed, ["total", "in", "out"]);
        assert.strictEqual(calls.length, 0);
        assert.strictEqual(
            codeOf(() => session.runs.start("degree", { direction: "in" })),
            null,
        );
    });
});

describe("a sweep over two values that spell one id", () => {
    it("still runs each value as a run of its own", async () => {
        const session = await graph();
        const sweep = await session.runs.sweep("pagerank", "dampingFactor", [0.5, "0.5"]);

        assert.strictEqual(sweep.completed, 2);
        const ids = session.runs.list().map((run) => run.id);
        assert.strictEqual(new Set(ids).size, 2);
        assert.isTrue(ids[1].endsWith("_2"), ids.join(","));
    });

    it("runs each value over the scope the sweep was given", async () => {
        const session = await graph();
        await session.runs.sweep("pagerank", "dampingFactor", [0.5, 0.9], { scope: { nodes: ["a", "b"] } });

        assert.deepStrictEqual(
            session.runs.list().map((run) => run.scope.nodeCount),
            [2, 2],
        );
        assert.strictEqual(calls.length, 2);
    });
});

describe("what a run's layer is called beside a sibling", () => {
    it("names the scope when only the scope tells two runs apart", async () => {
        const session = await graph();
        const whole = session.runs.start("degree", {}, { scope: "graph" });
        const listed = session.runs.start("degree", {}, { scope: { nodes: ["a", "b"] } });
        const where = session.runs.start("degree", {}, { scope: { where: "data.score > `1`" } });
        const defined = session.runs.start(
            "degree",
            {},
            {
                scope: { define: { kind: "path", nodes: ["a", "c"] } },
            },
        );
        await Promise.all([whole, listed, where, defined]);
        await session.styles.settled();

        assert.deepStrictEqual(
            session.styles.tree().map((row) => row.name),
            [
                "Connections (whole graph)",
                "Connections (2 nodes)",
                "Connections (data.score > `1`)",
                "Connections (path set)",
            ],
        );
    });
});

describe("a run the session does not hold", () => {
    it("has no record, painting, layers, readers or bindings", async () => {
        const session = await graph();
        const id = "nonesuch" as RunId;

        assert.isUndefined(session.runs.get(id));
        assert.isUndefined(session.runs.painting(id));
        assert.isUndefined(session.runs.layers(id));
        assert.deepStrictEqual(session.runs.readers(id), []);
        assert.deepStrictEqual(session.runs.bindings(id), []);
    });
});

describe("removing a run that is still running", () => {
    it("cancels it", async () => {
        const session = await graph();
        const run = session.runs.start("degree");
        const removal = session.runs.remove(run.id);

        await run.then(
            () => undefined,
            () => undefined,
        );
        assert.strictEqual(run.status, "canceled");
        assert.isDefined(removal);
        assert.isUndefined(session.runs.get(run.id));
    });
});

describe("a run still running", () => {
    it("says its painting is pending until it finishes", async () => {
        const session = await graph();
        const run = session.runs.start("degree");
        const before = session.runs.painting(run.id)?.state;
        await run;

        assert.strictEqual(before, "pending");
        assert.notStrictEqual(session.runs.painting(run.id)?.state, "pending");
    });
});

describe("a run that failed", () => {
    it("says it did not succeed when asked how it was painted", async () => {
        const session = createGraphSession({
            runs: { execute: () => Promise.reject(new Error("the algorithm broke")) },
        });
        await session.data.addNodes([{ id: "a" }]);
        const run = session.runs.start("degree");
        await run.then(
            () => undefined,
            () => undefined,
        );

        assert.strictEqual(run.status, "failed");
        assert.strictEqual(session.runs.painting(run.id)?.state, "not-succeeded");
    });
});

/** Ten nodes, each its own group named by text. */
const TEAMS = Array.from({ length: 10 }, (_, index) => `team-${String(index)}`);

/**
 * A session whose runs publish every node of {@link TEAMS} as a group of its own, named by text.
 * @returns The session.
 */
async function teams(): Promise<GraphSession> {
    calls.length = 0;
    const session = createGraphSession({
        runs: {
            execute: (context) => {
                calls.push(context);
                return Promise.resolve({
                    result: createRunResult({
                        runId: context.runId,
                        shape: "community",
                        fields: [
                            {
                                name: "group",
                                plainName: "Group",
                                technicalName: "community",
                                kind: "node",
                                type: "string",
                                path: `store.graphty.${context.runId}.group`,
                            },
                        ],
                        measured: { nodes: TEAMS.length, edges: 0 },
                        nodes: TEAMS.map((name) => ({ id: name, values: { group: name } })),
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
                });
            },
        },
    });
    await session.data.addNodes(TEAMS.map((id) => ({ id })));
    return session;
}

describe("a partition's groups named by text, as layers", () => {
    it("colors more groups than any offered palette holds from the first palette, a layer per group", async () => {
        const session = await teams();
        await session.runs.start(
            "louvain",
            {},
            { as: "louvain", style: { groups: "layers", groupPalettes: ["okabe-ito"] } },
        );
        await session.styles.settled();

        const [folder] = session.styles.tree().filter((row) => row.kind === "folder");
        assert.sameMembers(
            folder.children.map((row) => row.name),
            TEAMS,
            "each layer is named for its group's text",
        );
        const okabe = session.catalog.palettes().find((palette) => palette.id === "okabe-ito")?.colors ?? [];
        const colors = TEAMS.map((node) =>
            (session.styles.explain({ node }).merged["node.color"] as { hex?: string } | undefined)?.hex?.toUpperCase(),
        );
        assert.lengthOf(new Set(colors), TEAMS.length, colors.join(", "));
        assert.includeMembers(
            colors,
            okabe.map((color) => color.toUpperCase()),
            "the offered palette's colors first, continued past its end",
        );
        assert.lengthOf(calls, 1);
    });

    it("paints nothing when the only palette offered is not one the session knows, and says so", async () => {
        const session = await teams();
        const run = session.runs.start(
            "louvain",
            {},
            { as: "louvain", style: { groups: "layers", groupPalettes: ["nonesuch"] } },
        );
        await run;
        await session.styles.settled();

        assert.lengthOf(
            session.styles.tree().filter((row) => row.kind === "folder"),
            0,
        );
        const painting = session.runs.painting(run.id);
        assert.strictEqual(painting?.state, "decided");
        assert.deepStrictEqual(
            painting?.suggestions.map((entry) => [entry.outcome, entry.outcome === "refused" ? entry.code : ""]),
            [["refused", "E_UNKNOWN_PALETTE"]],
        );
    });
});
