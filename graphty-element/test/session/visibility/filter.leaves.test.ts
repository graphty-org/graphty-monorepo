/**
 * @file The `item` and `threshold` leaves (design/sets/sets-design.md sections 4.3 and 5.2):
 * what each speaks, the refusals at the doors, and what a pass does with one it cannot evaluate.
 *
 * The graph: a-b 0.9, a-c 0.1, b-c 0.8, c-d 0.9, d-e 0.95. Degrees a2 b2 c3 d2 e1. Scores a1 b5 c5
 * d3, e none.
 */

import { assert, describe, it } from "vitest";

import { parseSetDefinition } from "../../../src/catalog/sets/parse";
import type { Filter, NodeId, Scope, SetDefinition } from "../../../src/catalog/types";
import { type GraphtyError, isGraphtyError } from "../../../src/errors";
import { resultExecutionOf } from "../../../src/session/results/ResultsApi";
import type { Run } from "../../../src/session/runs";
import { resolveSet } from "../../../src/session/sets/cache";
import { setsStoreOf } from "../../../src/session/sets/SetsApi";
import { edgeBetween, type Harness, makeSession } from "../helpers";
import { type Published, publishing, resultOf } from "./results";

const STRONG = "data.weight > `0.5`";

/**
 * The fixture, with the runs the table publishes.
 * @param table - What each run id publishes; filled in after the edges exist.
 * @returns The harness.
 */
function harnessOf(table = new Map<string, Published>()): Harness {
    const harness = makeSession({ directed: false, runs: { execute: publishing(table) } });
    harness.add(
        [{ id: "a", score: 1 }, { id: "b", score: 5 }, { id: "c", score: 5 }, { id: "d", score: 3 }, { id: "e" }],
        [
            { src: "a", dst: "b", weight: 0.9 },
            { src: "a", dst: "c", weight: 0.1 },
            { src: "b", dst: "c", weight: 0.8 },
            { src: "c", dst: "d", weight: 0.9 },
            { src: "d", dst: "e", weight: 0.95 },
        ],
    );

    return harness;
}

/**
 * Edge ids of named pairs, sorted.
 * @param harness - The harness.
 * @param pairs - `"ab"` style pairs.
 * @returns The ids.
 */
function edgesOf(harness: Harness, ...pairs: string[]): string[] {
    return pairs.map((pair) => edgeBetween(harness, pair[0], pair[1])).sort();
}

/**
 * Nodes to values, from an object.
 * @param values - Id to values.
 * @returns The map.
 */
function perNode(values: Record<string, Record<string, unknown>>): Map<NodeId, Record<string, unknown>> {
    return new Map(Object.entries(values));
}

/**
 * Start a run under an id and wait for it.
 * @param harness - The harness.
 * @param as - The run id.
 */
async function run(harness: Harness, as: string): Promise<void> {
    await harness.session.runs.start("degree", undefined, { as, scope: "graph", style: false });
}

/**
 * A harness with a partition run `louv` (group a0 b0 c1 d1 e1, and c also in 0 through `tags`),
 * a path run `route` (a-b-c) and a metric run `deg` (the degrees).
 * @returns The harness, the table and the runs.
 */
async function withRuns(): Promise<{ harness: Harness; table: Map<string, Published>; louv: Run }> {
    const table = new Map<string, Published>();
    const harness = harnessOf(table);
    table.set("louv", {
        shape: "community",
        nodes: perNode({ a: { group: 0, tags: [0] }, b: { group: 0, tags: [0] }, c: { group: 1, tags: [0, 1] }, d: { group: 1, tags: [1] }, e: { group: 1, tags: [1] } }),
    });
    table.set("route", {
        shape: "path",
        nodes: perNode({ a: { onPath: true, order: 0 }, b: { onPath: true, order: 1 }, c: { onPath: true, order: 2 }, d: { onPath: false }, e: { onPath: false } }),
        edges: new Map([
            [edgeBetween(harness, "a", "b"), { onPath: true }],
            [edgeBetween(harness, "b", "c"), { onPath: true }],
            [edgeBetween(harness, "a", "c"), { onPath: false }],
        ]),
    });
    table.set("deg", { shape: "node-metric", nodes: perNode({ a: { value: 2 }, b: { value: 2 }, c: { value: 3 }, d: { value: 2 }, e: { value: 1 } }) });
    await run(harness, "louv");
    await run(harness, "route");
    await run(harness, "deg");
    const louv = harness.session.runs.get("louv");
    if (louv === undefined) {
        throw new Error("the partition run is missing");
    }

    return { harness, table, louv };
}

/**
 * What a filter leaves visible, as two sorted id lists.
 * @param harness - The harness.
 * @param filter - The filter.
 * @returns Nodes and edges.
 */
async function visible(harness: Harness, filter: Filter): Promise<{ nodes: NodeId[]; edges: string[] }> {
    await harness.session.visibility.set(filter);

    return { nodes: [...harness.session.visibility.nodes].sort(), edges: [...harness.session.visibility.edges].sort() };
}

/**
 * What a scope resolves to, as two sorted id lists.
 * @param harness - The harness.
 * @param scope - The scope.
 * @returns Nodes and edges.
 */
async function members(harness: Harness, scope: Scope): Promise<{ nodes: NodeId[]; edges: string[] }> {
    const resolved = await harness.session.scope.resolve(scope);

    return { nodes: [...resolved.nodes].sort(), edges: [...resolved.edges].sort() };
}

/**
 * A rule scope.
 * @param where - Its tree.
 * @param reading - Its reading.
 * @returns The scope.
 */
function rule(where: Filter, reading: "induced" | "listed" | "clipped"): Scope {
    return { define: { kind: "rule", where, reading } };
}

/**
 * The refusal a call throws.
 * @param call - The call.
 * @returns The error.
 */
function refusal(call: () => unknown): GraphtyError {
    try {
        call();
    } catch (error) {
        if (isGraphtyError(error)) {
            return error;
        }

        throw error;
    }

    throw new Error("the call did not refuse");
}

describe("the item leaf", () => {
    it("holds the nodes of one group, following the run's current execution", async () => {
        const { harness } = await withRuns();

        assert.deepStrictEqual((await members(harness, rule({ kind: "item", item: { run: "louv", key: { field: "group", value: 1 } } }, "induced"))).nodes, ["c", "d", "e"]);
        harness.session.dispose();
    });

    it("counts an element whose value is an array holding the key", async () => {
        const { harness } = await withRuns();
        const tagged = await members(harness, rule({ kind: "item", item: { run: "louv", key: { field: "tags", value: 0 } } }, "induced"));

        assert.deepStrictEqual(tagged.nodes, ["a", "b", "c"]);
        harness.session.dispose();
    });

    it("holds its execution: current, it reads the run; after a re-run, nothing until captures exist", async () => {
        const { harness, table, louv } = await withRuns();
        const execution = resultExecutionOf(harness.session.results, "louv");
        assert.isString(execution);
        const held = rule({ kind: "item", item: { run: "louv", key: { field: "group", value: 0 }, execution } }, "induced");
        const followed = rule({ kind: "item", item: { run: "louv", key: { field: "group", value: 0 } } }, "induced");

        assert.deepStrictEqual((await members(harness, held)).nodes, ["a", "b"]);

        table.set("louv", { shape: "community", nodes: perNode({ a: { group: 0 }, b: { group: 1 }, c: { group: 0 }, d: { group: 1 }, e: { group: 1 } }) });
        await louv.rerun();

        assert.notStrictEqual(resultExecutionOf(harness.session.results, "louv"), execution);
        assert.deepStrictEqual((await members(harness, followed)).nodes, ["a", "c"], "a follow reads the new execution");
        assert.deepStrictEqual((await members(harness, held)).nodes, [], "a held execution that is gone reads nothing");
        harness.session.dispose();
    });

    it("speaks both halves for onPath: the path's nodes and exactly its edges", async () => {
        const { harness } = await withRuns();
        const onPath: Filter = { kind: "item", item: { run: "route", key: { field: "onPath", value: true } } };

        assert.deepStrictEqual(await visible(harness, onPath), { nodes: ["a", "b", "c"], edges: edgesOf(harness, "ab", "bc") });
        assert.deepStrictEqual(await members(harness, rule(onPath, "listed")), { nodes: ["a", "b", "c"], edges: edgesOf(harness, "ab", "bc") });
        // Read induced, the edge half would be ignored: refused, as the doors refuse a kept one.
        let reason: unknown = null;
        try {
            await members(harness, rule(onPath, "induced"));
        } catch (error) {
            reason = isGraphtyError(error) ? (error.details as { reason?: unknown } | undefined)?.reason : error;
        }

        assert.strictEqual(reason, "induced-edge-leaf");
        harness.session.dispose();
    });

    it("holds nothing for a run with no result, in a filter and in a rule, and throws nowhere", async () => {
        const { harness } = await withRuns();
        const gone: Filter = { kind: "item", item: { run: "never", key: { field: "group", value: 0 } } };

        assert.deepStrictEqual(await visible(harness, gone), { nodes: [], edges: [] });
        assert.deepStrictEqual(await visible(harness, { kind: "not", of: gone }), {
            nodes: ["a", "b", "c", "d", "e"],
            edges: edgesOf(harness, "ab", "ac", "bc", "cd", "de"),
        });
        const outcome = await harness.session.visibility.set(gone);
        assert.include(outcome.unresolvedPaths, "results.never.group", "the path nothing answers is reported");
        assert.deepStrictEqual(await members(harness, rule(gone, "clipped")), { nodes: [], edges: [] });
        harness.session.dispose();
    });

    it("stores a Run or RunResult handle as the run's id", async () => {
        const { harness, louv } = await withRuns();
        const handles: unknown[] = [louv, resultOf("louv", { shape: "community" })];

        for (const handle of handles) {
            const id = harness.session.sets.create({
                kind: "rule",
                where: { kind: "item", item: { run: handle as string, key: { field: "tags", value: 1 } } },
                reading: "induced",
            });
            const stored = harness.session.sets.get(id)?.definition;

            assert.deepStrictEqual(stored, { kind: "rule", where: { kind: "item", item: { key: { field: "tags", value: 1 }, run: "louv" } }, reading: "induced" });
            assert.strictEqual(JSON.stringify(stored), JSON.stringify(structuredClone(stored)));
        }

        harness.session.dispose();
    });
});

describe("the threshold leaf", () => {
    it("takes the top n of a data field over the nodes carrying it, whole tie groups only", async () => {
        const harness = harnessOf();
        const top = (n: number): Filter => ({ kind: "threshold", path: "data.score", top: n });

        assert.deepStrictEqual((await visible(harness, top(2))).nodes, ["b", "c"], "b and c tie at 5 and both fit");
        assert.deepStrictEqual((await visible(harness, top(1))).nodes, [], "the tie at 5 does not fit in one");
        assert.deepStrictEqual((await visible(harness, top(4))).nodes, ["a", "b", "c", "d"], "e carries no score and is not in the population");
        assert.deepStrictEqual((await visible(harness, top(10))).nodes, ["a", "b", "c", "d"]);
        harness.session.dispose();
    });

    it("takes the elements strictly above a value", async () => {
        const harness = harnessOf();

        assert.deepStrictEqual((await visible(harness, { kind: "threshold", path: "data.score", above: 3 })).nodes, ["b", "c"]);
        harness.session.dispose();
    });

    it("ranks an edge attribute over the edges, and speaks only the edge half", async () => {
        const harness = harnessOf();
        const strongest: Filter = { kind: "threshold", path: "data.weight", top: 2 };

        // 0.95 is first; a-b and c-d tie at 0.9, and taking them would make three.
        assert.deepStrictEqual(await visible(harness, strongest), { nodes: ["a", "b", "c", "d", "e"], edges: edgesOf(harness, "de") });
        assert.deepStrictEqual(await members(harness, rule(strongest, "listed")), { nodes: ["d", "e"], edges: edgesOf(harness, "de") });
        harness.session.dispose();
    });

    it("ranks a run's field, reading only the elements the run measured", async () => {
        const { harness } = await withRuns();

        assert.deepStrictEqual((await visible(harness, { kind: "threshold", path: "results.deg.value", top: 1 })).nodes, ["c"]);
        assert.deepStrictEqual((await visible(harness, { kind: "threshold", path: "results.deg.value", above: 1 })).nodes, ["a", "b", "c", "d"]);
        assert.deepStrictEqual((await visible(harness, { kind: "threshold", path: "results.never.value", above: 1 })).nodes, [], "a run with no result holds nothing");
        harness.session.dispose();
    });

    it("all [degree >= 3, edges strong] read listed is every strong edge with its endpoints, plus the hubs", async () => {
        const harness = harnessOf();
        const tree: Filter = { kind: "all", of: [{ kind: "degree", min: 3 }, { kind: "edges", where: STRONG }] };

        assert.deepStrictEqual(await members(harness, rule(tree, "listed")), {
            nodes: ["a", "b", "c", "d", "e"],
            edges: edgesOf(harness, "ab", "bc", "cd", "de"),
        });
        assert.deepStrictEqual(await members(harness, rule(tree, "clipped")), { nodes: ["c"], edges: [] });
        harness.session.dispose();
    });
});

describe("refusals at the doors", () => {
    it("refuses an item that follows a partition group, and accepts one that holds it or follows onPath", async () => {
        const { harness } = await withRuns();
        const group = { run: "louv", key: { field: "group", value: 1 } };
        const followed: SetDefinition = { kind: "rule", where: { kind: "item", item: group }, reading: "induced" };

        const error = refusal(() => harness.session.sets.create(followed));
        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(error.details?.reason, "follow-group");

        const inline = refusal(() => harness.session.sets.create({ kind: "rule", where: { kind: "scope", scope: { define: followed } }, reading: "induced" }));
        assert.strictEqual(inline.details?.reason, "follow-group", "found inside an inline definition");

        const filterError = refusal(() => harness.session.visibility.set({ kind: "not", of: { kind: "item", item: group } }));
        assert.strictEqual(filterError.details?.reason, "follow-group");

        const execution = resultExecutionOf(harness.session.results, "louv") ?? "";
        harness.session.sets.create({ kind: "rule", where: { kind: "item", item: { ...group, execution } }, reading: "induced" });
        harness.session.sets.create({ kind: "rule", where: { kind: "item", item: { run: "louv", key: { field: "tags", value: 1 } } }, reading: "induced" });
        harness.session.sets.create({ kind: "rule", where: { kind: "item", item: { run: "route", key: { field: "onPath", value: true } } }, reading: "listed" });
        harness.session.dispose();
    });

    it("refuses an induced rule whose item or threshold speaks edges", async () => {
        const { harness } = await withRuns();
        const leaves: Filter[] = [
            { kind: "item", item: { run: "route", key: { field: "onPath", value: true } } },
            { kind: "threshold", path: "data.weight", top: 2 },
        ];

        for (const where of leaves) {
            assert.strictEqual(refusal(() => harness.session.sets.create({ kind: "rule", where, reading: "induced" })).details?.reason, "induced-edge-leaf");
        }

        harness.session.sets.create({ kind: "rule", where: { kind: "threshold", path: "data.score", top: 2 }, reading: "induced" });
        harness.session.dispose();
    });

    const threshold = (fields: Record<string, unknown>): unknown => ({ kind: "rule", reading: "clipped", where: { kind: "threshold", path: "data.score", ...fields } });
    const MALFORMED: readonly (readonly [string, unknown])[] = [
        ["no cut", threshold({})],
        ["two cuts", threshold({ top: 2, above: 1 })],
        ["a NaN cut", threshold({ above: Number.NaN })],
        ["an infinite cut", threshold({ above: Number.POSITIVE_INFINITY })],
        ["a fractional top", threshold({ top: 1.5 })],
        ["a negative top", threshold({ top: -1 })],
        ["a path that is not a value path", { kind: "rule", reading: "clipped", where: { kind: "threshold", path: "score", top: 1 } }],
        ["a results path with no field", { kind: "rule", reading: "clipped", where: { kind: "threshold", path: "results.pr", top: 1 } }],
        ["an item with no run", { kind: "rule", reading: "clipped", where: { kind: "item", item: { key: { field: "group", value: 1 } } } }],
        ["an item key with an object value", { kind: "rule", reading: "clipped", where: { kind: "item", item: { run: "r", key: { field: "group", value: {} } } } }],
        ["an item with an empty execution", { kind: "rule", reading: "clipped", where: { kind: "item", item: { run: "r", execution: "", key: { field: "g", value: 1 } } } }],
    ];

    it.each(MALFORMED)("refuses %s", (_what, value) => {
        assert.strictEqual(refusal(() => parseSetDefinition(value)).code, "E_BAD_COMMAND");
    });

    const RESERVED: readonly (readonly [string, unknown, string])[] = [
        ["a percentile", threshold({ percentile: 0.9 }), "threshold.percentile"],
        ["a z score", threshold({ z: 2 }), "threshold.z"],
        ["a population", threshold({ top: 3, population: "group" }), "threshold.population"],
        ["an op on an item key", { kind: "rule", reading: "clipped", where: { kind: "item", item: { run: "r", key: { field: "level", op: "le", value: 2 } } } }, "itemKey.op"],
        ["a keyed item form", { kind: "rule", reading: "clipped", where: { kind: "item", item: { run: "r", key: { smallestNode: "a" } } } }, "itemKey.smallestNode"],
    ];

    it.each(RESERVED)("refuses %s as reserved", (_what, value, field) => {
        const error = refusal(() => parseSetDefinition(value));

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.deepStrictEqual(error.details, { field, reserved: true });
    });
});

describe("a pass never throws on a leaf it cannot evaluate", () => {
    it("resolves a component beyond the current count, and an item of a missing run, to nothing", async () => {
        const { harness } = await withRuns();
        const api = harness.session.sets;
        const store = setsStoreOf(api);
        const beyond = api.create({ kind: "rule", where: { kind: "component", id: 9 }, reading: "induced" });
        const missing = api.create({ kind: "rule", where: { kind: "item", item: { run: "never", key: { field: "in", value: true } } }, reading: "induced" });

        for (const id of [beyond, missing]) {
            const record = store.get(id);
            assert.isDefined(record);
            const resolution = resolveSet(record ?? { id, definition: { kind: "fixed", nodes: [], reading: "induced" } }, {
                snapshot: harness.session.data.snapshot(),
                sets: store,
                components: () => ({ labels: new Int32Array(5), count: 1 }),
                result: () => undefined,
            });

            assert.strictEqual(resolution.nodeCount, 0, id);
            assert.strictEqual(resolution.edgeCount, 0, id);
        }

        assert.deepStrictEqual(await harness.session.scope.count({ set: missing }), { nodes: 0, edges: 0, exact: true });
        harness.session.dispose();
    });
});
