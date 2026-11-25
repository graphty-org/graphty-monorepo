/**
 * @file Filter leaves a caller reaches through `session.visibility` and `session.scope`, on the
 * paths the other visibility tests leave unread: a category list matched against a single value,
 * `by-size` cuts and the values it cannot count, degree paths on an undirected graph, a `measure`
 * step's `categories`, `text` and `missing` tests, and the conditions held off under source-steps
 * whatever kind of rule names the missing column.
 */

import { assert, describe, it } from "vitest";

import type { StepsReading } from "../../../session";
import type { RuleTree, UnionLeaf, UnionStep } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { phase1 } from "../source-steps/scenario";

/**
 * An undirected graph: a-b, a-c, a-d, b-c, e-f, with `g` and `h` alone. Each node carries a `kind`
 * (`g`'s is not a number, `h`'s is an object, so neither has a category) and `tags`, a single
 * value on some nodes and a list on others.
 * @param options - Session options.
 * @returns The session.
 */
async function small(options: Parameters<typeof createGraphSession>[0] = {}): Promise<GraphSession> {
    const session = createGraphSession({ ...options, config: { data: { directed: false } } });
    await session.data.addNodes([
        { id: "a", kind: "x", tags: ["red", "blue"] },
        { id: "b", kind: "x", tags: "red" },
        { id: "c", kind: "x", tags: "blue" },
        { id: "d", kind: "y", tags: ["red"] },
        { id: "e", kind: "y" },
        { id: "f", kind: "z" },
        { id: "g", kind: Number.NaN },
        { id: "h", kind: { not: "a category" } },
    ]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "a", target: "c" },
        { source: "a", target: "d" },
        { source: "b", target: "c" },
        { source: "e", target: "f" },
    ]);
    return session;
}

/**
 * The node ids a filter condition keeps, sorted.
 * @param session - The session.
 * @param rule - The condition's rule.
 * @returns The ids.
 */
async function kept(session: GraphSession, rule: RuleTree): Promise<string[]> {
    await session.visibility.setConditions([{ effect: "keep", rule }]);
    return [...session.visibility.nodes].map(String).sort();
}

/**
 * The node ids a rule holds, sorted.
 * @param session - The session.
 * @param where - The rule.
 * @returns The ids.
 */
async function holds(session: GraphSession, where: RuleTree): Promise<string[]> {
    const resolved = await session.scope.resolve({ define: { kind: "rule", where, reading: "clipped" } });
    return [...resolved.nodes].map(String).sort();
}

/**
 * A node union of one branch over a base.
 * @param start - Its start.
 * @param steps - Its steps.
 * @param within - Its base.
 * @returns The leaf.
 */
function union(start: "all" | "none", steps: readonly UnionStep[], within: "graph" | "visible" = "graph"): UnionLeaf {
    return { kind: "union", side: "nodes", within, branches: [{ start, steps }] };
}

describe("a categories leaf with a match mode reads a single value as a list of one", () => {
    it('"all" keeps a single value only when it is the one category wanted', async () => {
        const session = await small();
        const red = await kept(session, { kind: "categories", attribute: "data.tags", values: ["red"], match: "all" });
        assert.deepEqual(red, ["a", "b", "d"]);
        const both = await kept(session, {
            kind: "categories",
            attribute: "data.tags",
            values: ["red", "blue"],
            match: "all",
        });
        assert.deepEqual(both, ["a"], "a single value never holds two categories");
        session.dispose();
    });

    it('"any" keeps a single value that is one of the categories', async () => {
        const session = await small();
        const blue = await kept(session, {
            kind: "categories",
            attribute: "data.tags",
            values: ["blue"],
            match: "any",
        });
        assert.deepEqual(blue, ["a", "c"]);
        session.dispose();
    });
});

describe("a by-size filter", () => {
    it("keeps the categories with at least min members, leaving out values that are no category", async () => {
        const session = await small();
        assert.deepEqual(await kept(session, { kind: "by-size", path: "data.kind", min: 2 }), [
            "a",
            "b",
            "c",
            "d",
            "e",
        ]);
        assert.deepEqual(
            await kept(session, { kind: "by-size", path: "data.kind", min: 1 }),
            ["a", "b", "c", "d", "e", "f"],
            "g (not a number) and h (an object) carry no category, so no size passes them",
        );
        session.dispose();
    });

    it("keeps the categories with at most max members", async () => {
        const session = await small();
        assert.deepEqual(await kept(session, { kind: "by-size", path: "data.kind", max: 2 }), ["d", "e", "f"]);
        session.dispose();
    });

    it('counts top from the smallest category with from: "low"', async () => {
        const session = await small();
        assert.deepEqual(await kept(session, { kind: "by-size", path: "data.kind", top: 1, from: "low" }), ["f"]);
        assert.deepEqual(await kept(session, { kind: "by-size", path: "data.kind", top: 1 }), ["a", "b", "c"]);
        session.dispose();
    });

    it("computed on So far, counts only the step's input", async () => {
        const session = await small();
        const steps: UnionStep[] = [
            { op: "except", rule: { kind: "categories", attribute: "data.kind", values: ["x"] } },
            { op: "keep", computedOn: "so-far", rule: { kind: "by-size", path: "data.kind", top: 1 } },
        ];
        // Over the whole graph x (3 members) is largest; among what is left y (2) is.
        assert.deepEqual(await holds(session, union("all", steps)), ["d", "e"]);
        session.dispose();
    });
});

describe("degree paths on an undirected graph", () => {
    it("read in- and out-degree as the degree", async () => {
        const session = await small();
        assert.deepEqual(await holds(session, { kind: "threshold", path: "graphty.outDegree", top: 1 }), ["a"]);
        assert.deepEqual(await holds(session, { kind: "threshold", path: "graphty.inDegree", above: 1 }), [
            "a",
            "b",
            "c",
        ]);
        session.dispose();
    });

    it("count every visible edge both ways inside a step over the visible graph", async () => {
        const session = await small();
        await session.visibility.setConditions([{ effect: "exclude", rule: { kind: "member", of: { nodes: ["c"] } } }]);
        // c is hidden: inside the visible graph a meets b and d (2), b meets a (1), d meets a (1).
        const step: UnionStep = { op: "add", rule: { kind: "threshold", path: "graphty.outDegree", above: 1 } };
        assert.deepEqual(await holds(session, union("none", [step], "visible")), ["a"]);
        session.dispose();
    });
});

/** Each node's label and score, as the fake algorithm below publishes them. */
const MEASURED: Readonly<Record<string, { label?: unknown; score?: number }>> = {
    a: { label: "alpha", score: 3 },
    b: { label: "beta", score: 1 },
    c: { label: ["alpha", "gamma"], score: 2 },
    d: { label: "Delta" },
};

/**
 * An executor that publishes {@link MEASURED} for the nodes in the run's scope.
 * @param context - The run.
 * @returns The outcome.
 */
function labels(context: RunExecutionContext): Promise<RunOutcome> {
    const nodes = [...context.scope.nodes]
        .map(String)
        .filter((id) => id in MEASURED)
        .map((id) => ({ id, values: { ...MEASURED[id] } }));
    return Promise.resolve({
        result: createRunResult({
            runId: context.runId,
            measured: { nodes: nodes.length, edges: 0 },
            caveats: {
                exact: true,
                direction: "as-loaded",
                precision: "f64",
                method: context.algorithm,
                facts: [],
                notes: [],
            },
            durationMs: 1,
            shape: "node-metric",
            fields: [
                {
                    name: "label",
                    plainName: "Label",
                    technicalName: "label",
                    kind: "node",
                    type: "string",
                    path: `results.${context.runId}.label`,
                },
                {
                    name: "score",
                    plainName: "Score",
                    technicalName: "score",
                    kind: "node",
                    type: "number",
                    path: `results.${context.runId}.score`,
                },
            ],
            nodes,
        }),
    });
}

/**
 * The nodes a one-step measure union adds once its run has finished, sorted.
 * @param session - The session.
 * @param field - The field.
 * @param test - The measure's test.
 * @returns The ids.
 */
async function measured(session: GraphSession, field: string, test: Record<string, unknown>): Promise<string[]> {
    const rule = union("none", [
        { op: "add", rule: { kind: "measure", algorithm: "degree", field, test } as RuleTree },
    ]);
    // A watch calls back on a change only: over a run already computed, its current reading is
    // the settled one.
    let settled: StepsReading | undefined;
    let done: ((reading: StepsReading) => void) | undefined;
    const watch = session.scope.watchSteps(rule, (reading) => {
        if (settled === undefined && reading.branches[0].state !== "pending") {
            settled = reading;
            done?.(reading);
        }
    });
    if (watch.current.branches[0].state !== "pending") {
        settled ??= watch.current;
    }
    const ready =
        settled ??
        (await new Promise<StepsReading>((resolve) => {
            done = resolve;
        }));
    watch.end();
    assert.strictEqual(ready.branches[0].state, "ready", JSON.stringify(ready.branches[0]));
    const resolved = await session.scope.resolve(ready.result);
    return [...resolved.nodes].map(String).sort();
}

describe("a measure step's value tests", () => {
    it("a text test matches a single label or any label of a list", async () => {
        const session = await small({ runs: { execute: labels } });
        assert.deepEqual(await measured(session, "label", { kind: "text", mode: "starts-with", text: "AL" }), [
            "a",
            "c",
        ]);
        session.dispose();
    });

    it("a case-sensitive text test keeps the case", async () => {
        const session = await small({ runs: { execute: labels } });
        assert.deepEqual(
            await measured(session, "label", { kind: "text", mode: "exact", text: "Delta", caseSensitive: true }),
            ["d"],
        );
        assert.deepEqual(
            await measured(session, "label", { kind: "text", mode: "exact", text: "delta", caseSensitive: true }),
            [],
        );
        session.dispose();
    });

    it("a categories test with match all needs every category in the label list", async () => {
        const session = await small({ runs: { execute: labels } });
        assert.deepEqual(
            await measured(session, "label", { kind: "categories", values: ["alpha", "gamma"], match: "all" }),
            ["c"],
        );
        session.dispose();
    });

    it('a range test with missing: "include" also passes the nodes the run measured no score for', async () => {
        const session = await small({ runs: { execute: labels } });
        assert.deepEqual(await measured(session, "score", { kind: "range", min: 2 }), ["a", "c"]);
        assert.deepEqual(await measured(session, "score", { kind: "range", min: 2, missing: "include" }), [
            "a",
            "c",
            "d",
            "e",
            "f",
            "g",
            "h",
        ]);
        session.dispose();
    });
});

describe("source-steps: a condition on a column no element carries is held, whatever its rule", () => {
    const CASES: readonly [string, RuleTree][] = [
        ["a text leaf", { kind: "text", reads: "data.nothing", mode: "substring", text: "x" }],
        ["a not", { kind: "not", of: { kind: "range", attribute: "data.nothing", min: 1 } }],
        [
            "an any",
            {
                kind: "any",
                of: [
                    { kind: "categories", attribute: "data.nothing", values: ["a"] },
                    { kind: "range", attribute: "data.nowhere", min: 1 },
                ],
            },
        ],
    ];

    for (const [name, rule] of CASES) {
        it(name, async () => {
            const { session } = await phase1();
            const { id } = await session.visibility.addCondition({ effect: "keep", rule });
            assert.strictEqual(session.visibility.nodes.size, session.data.store.getSnapshot().nodeCount);
            assert.deepStrictEqual(session.visibility.held, [
                { code: "W_FILTER_HELD", params: { filter: id, column: "data.nothing" } },
            ]);
            session.dispose();
        });
    }
});
