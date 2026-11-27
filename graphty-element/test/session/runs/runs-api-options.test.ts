/**
 * @file `session.runs`: the options a consumer passes through to a run (a signal, a progress
 * callback, a stability series' parameters), what an option outside its listed choices is refused
 * with, how a sweep names two values that spell one id, what a run is called beside a sibling that
 * differs only by scope or by parameters, what the lookups answer for a run the session does not
 * hold, which parameter values and empty scopes are refused, and how the "replace" queue policy and
 * canceling a batch end the work still running.
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
                path: `results.${context.runId}.value`,
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
                                path: `results.${context.runId}.group`,
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

describe("a parameter outside its range", () => {
    it("is refused before anything runs, naming the bound or the whole-number rule it breaks", async () => {
        const session = await graph();
        const refusal = (params: Record<string, unknown>): unknown => {
            try {
                session.runs.start("pagerank", params);
            } catch (error) {
                return isGraphtyError(error) ? [error.code, error.details] : "not a GraphtyError";
            }
            return null;
        };

        assert.deepStrictEqual(refusal({ maxIterations: 1.5 }), [
            "E_OPTION_RANGE",
            { algorithm: "pagerank", option: "maxIterations", value: 1.5 },
        ]);
        assert.deepStrictEqual(refusal({ dampingFactor: -0.5 }), [
            "E_OPTION_RANGE",
            { algorithm: "pagerank", option: "dampingFactor", value: -0.5, min: 0 },
        ]);
        assert.deepStrictEqual(refusal({ dampingFactor: 2 }), [
            "E_OPTION_RANGE",
            { algorithm: "pagerank", option: "dampingFactor", value: 2, max: 1 },
        ]);
        assert.strictEqual(calls.length, 0);
    });
});

describe("a run asked to be exact", () => {
    it("hands the executor that request", async () => {
        const session = await graph();
        await session.runs.start("degree", {}, { exact: true });

        assert.deepStrictEqual(
            calls.map((call) => call.exact),
            [true],
        );
    });
});

describe("what a run's layer is called beside a sibling of other parameters", () => {
    it("names each parameter that differs, sorted by name, a switch as on or off and an omitted one by its default", async () => {
        const session = await graph();
        await Promise.all([
            session.runs.start("pagerank", { useDelta: true, directed: true, dampingFactor: 0.5 }, { as: "p1" }),
            session.runs.start("pagerank", { useDelta: false, directed: false }, { as: "p2" }),
            session.runs.start("pagerank", {}, { as: "p3" }),
        ]);
        await session.styles.settled();

        assert.deepStrictEqual(
            session.styles.tree().map((row) => row.name),
            [
                "Influence (dampingFactor 0.5, directed on, useDelta on)",
                "Influence (dampingFactor 0.85, directed off, useDelta off)",
                "Influence (dampingFactor 0.85, directed on, useDelta on)",
            ],
        );
        assert.deepStrictEqual(
            session.runs.list().map((run) => run.record.siblingsDifferBy),
            [
                ["dampingFactor", "directed", "useDelta"],
                ["dampingFactor", "directed", "useDelta"],
                ["dampingFactor", "directed", "useDelta"],
            ],
        );
    });

    it("names the selection and a kept set by its name when only the scope differs", async () => {
        const session = await graph();
        await session.selection.apply({ nodes: ["a", "b"] });
        const kept = session.sets.create({ kind: "fixed", nodes: ["b", "c"], reading: "induced" }, { name: "Kept" });
        await Promise.all([
            session.runs.start("degree", {}, { scope: "selection" }),
            session.runs.start("degree", {}, { scope: { set: kept } }),
        ]);
        await session.styles.settled();

        assert.deepStrictEqual(
            session.styles.tree().map((row) => row.name),
            ["Connections (selection)", "Connections (Kept)"],
        );
    });
});

describe("a run over a scope that holds no nodes", () => {
    it("is refused when the scope is one the caller chose, naming a kept set as the target", async () => {
        const session = await graph();
        const empty = session.sets.create(
            { kind: "rule", where: "data.score > `10`", reading: "induced" },
            { name: "Nobody" },
        );
        const failure = async (scope: Parameters<GraphSession["runs"]["start"]>[2]): Promise<unknown> => {
            try {
                await session.runs.start("degree", {}, scope);
            } catch (error) {
                return isGraphtyError(error) ? [error.code, error.target ?? null] : "not a GraphtyError";
            }
            return null;
        };

        assert.deepStrictEqual(await failure({ scope: { nodes: [] } }), ["E_SCOPE_EMPTY", null]);
        assert.deepStrictEqual(await failure({ scope: { set: empty } }), [
            "E_SCOPE_EMPTY",
            { kind: "scope", id: empty },
        ]);
        assert.strictEqual(calls.length, 0);
    });

    it("runs over the whole graph even when the graph is empty", async () => {
        calls.length = 0;
        const session = createGraphSession({ runs: { execute } });
        const run = session.runs.start("degree", {}, { scope: "graph" });
        await run;

        assert.strictEqual(run.status, "succeeded");
        assert.deepStrictEqual(
            calls.map((call) => call.scope.nodeCount),
            [0],
        );
    });
});

/**
 * A session whose executor holds every run until it is aborted, except a run of `direction: "out"`,
 * which it answers at once.
 * @returns The session.
 */
async function held(): Promise<GraphSession> {
    calls.length = 0;
    const session = createGraphSession({
        runs: {
            execute: (context) => {
                if (context.params.direction === "out") {
                    return execute(context);
                }
                calls.push(context);
                return new Promise<RunOutcome>((_resolve, reject) => {
                    context.signal.addEventListener(
                        "abort",
                        () => {
                            reject(new DOMException("aborted", "AbortError"));
                        },
                        { once: true },
                    );
                });
            },
        },
    });
    await session.data.addNodes([{ id: "a" }, { id: "b" }]);
    return session;
}

/**
 * How a run settled: "resolved", or the name of the DOMException it rejected with.
 * @param run - The run.
 * @returns The outcome.
 */
function outcomeOf(run: PromiseLike<unknown>): Promise<string> {
    return Promise.resolve(run).then(
        () => "resolved",
        (error: unknown) => (error instanceof DOMException ? error.name : "other"),
    );
}

describe("the replace queue policy", () => {
    it("cancels the earlier run of the same algorithm that is still running", async () => {
        const session = await held();
        const first = session.runs.start("degree", { direction: "in" }, { as: "first" });
        const settledFirst = outcomeOf(first);
        const second = session.runs.start("degree", { direction: "out" }, { as: "second", queue: "replace" });

        assert.strictEqual(await settledFirst, "AbortError");
        assert.strictEqual(first.status, "canceled");
        await second;
        assert.strictEqual(second.status, "succeeded");
    });
});

describe("canceling a batch that is still running", () => {
    it("settles it as canceled, with the member it stopped and the one it never started", async () => {
        const session = await held();
        const batch = session.runs.batch([{ algorithm: "degree" }, { algorithm: "pagerank" }]);
        batch.cancel();
        const result = await batch;

        assert.strictEqual(batch.status, "canceled");
        assert.strictEqual(result.completed, 0);
        assert.isTrue(result.partial);
        assert.deepStrictEqual(
            result.steps.map((step) => step.failure?.code ?? "ok"),
            ["canceled", "not-started"],
        );
    });
});
