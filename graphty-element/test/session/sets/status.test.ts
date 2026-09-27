/**
 * @file A set's status, derived on read (design/sets/sets-design.md section 5.3): one test per row
 * of the design's table, in order, each asserting freshness, reasons, earlier runs and what the set
 * resolves to; then `revision-unknown`, the work a panel's status reads cost, and "Used by".
 *
 * The graph: a-b, a-c, b-c, c-d, d-e. Degrees a2 b2 c3 d2 e1.
 */

import { afterEach, assert, describe, it } from "vitest";

import { algorithmByKey } from "../../../src/catalog/algorithms";
import { clearRegisteredAlgorithmsForTesting, publishAlgorithmDescriptor } from "../../../src/catalog/registry";
import type {
    NodeId,
    Scope,
    SetCreatedFrom,
    SetDefinition,
    SetDefinitionInput,
    SetId,
} from "../../../src/catalog/types";
import { GraphtyError } from "../../../src/errors";
import { resultExecutionOf } from "../../../src/session/results/ResultsApi";
import { cacheCounters, outcomeOf, resolveSet, SetsCache } from "../../../src/session/sets/cache";
import { loadRecord, prepareCreate } from "../../../src/session/sets/prepare";
import { resolveCounters } from "../../../src/session/sets/resolve";
import { createSetAs, createSetsApi, setsStoreOf } from "../../../src/session/sets/SetsApi";
import { statusOf } from "../../../src/session/sets/status";
import type { SetStatus } from "../../../src/session/sets/types";
import { type Harness, makeSession } from "../helpers";
import { type Published, publishing } from "../visibility/results";
import { TestGraph } from "./graphs";

/**
 * Nodes to values.
 * @param values - Id to values.
 * @returns The map.
 */
function perNode(values: Record<string, Record<string, unknown>>): Map<NodeId, Record<string, unknown>> {
    return new Map(Object.entries(values));
}

const LOUVAIN_1: Published = {
    shape: "community",
    nodes: perNode({ a: { group: 0 }, b: { group: 0 }, c: { group: 1 }, d: { group: 1 }, e: { group: 1 } }),
};
const LOUVAIN_2: Published = {
    shape: "community",
    nodes: perNode({ a: { group: 0 }, b: { group: 1 }, c: { group: 0 }, d: { group: 1 }, e: { group: 1 } }),
};
const SCORES_1: Published = {
    shape: "node-metric",
    nodes: perNode({ a: { value: 1 }, b: { value: 5 }, c: { value: 5 }, d: { value: 3 }, e: { value: 0 } }),
};
const SCORES_2: Published = {
    shape: "node-metric",
    nodes: perNode({ a: { value: 9 }, b: { value: 0 }, c: { value: 0 }, d: { value: 0 }, e: { value: 4 } }),
};

/** A session with its executor table. */
interface Fixture {
    readonly harness: Harness;
    readonly table: Map<string, Published>;
}

/**
 * The graph, with an executor that publishes what the table says.
 * @returns The fixture.
 */
function fixture(): Fixture {
    const table = new Map<string, Published>([
        ["louv", LOUVAIN_1],
        ["pr", SCORES_1],
        ["plug", SCORES_1],
    ]);
    const harness = makeSession({ directed: false, runs: { execute: publishing(table) } });
    harness.add(
        ["a", "b", "c", "d", "e"].map((id) => ({ id })),
        [
            { src: "a", dst: "b" },
            { src: "a", dst: "c" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
            { src: "d", dst: "e" },
        ],
    );

    return { harness, table };
}

/**
 * Start a run under an id and wait for it.
 * @param f - The fixture.
 * @param as - The run id.
 * @param scope - Its scope.
 * @param algorithm - The algorithm.
 */
async function run(f: Fixture, as: string, scope: Scope = "graph", algorithm = "degree"): Promise<void> {
    await f.harness.session.runs.start(algorithm, undefined, { as, scope, style: false });
}

/**
 * Re-run a run in place and wait for it.
 * @param f - The fixture.
 * @param as - The run.
 */
async function rerun(f: Fixture, as: string): Promise<void> {
    await f.harness.session.runs.get(as)?.rerun();
}

/**
 * The nodes a kept set resolves to, sorted.
 * @param f - The fixture.
 * @param id - The set.
 * @returns The ids.
 */
async function nodesOf(f: Fixture, id: SetId): Promise<NodeId[]> {
    return [...(await f.harness.session.scope.resolve({ set: id })).nodes].sort();
}

/**
 * How many nodes and edges a kept set counts: zeros for one that resolves to nothing.
 * @param f - The fixture.
 * @param id - The set.
 * @returns The two counts.
 */
async function countOf(f: Fixture, id: SetId): Promise<[number, number]> {
    const count = await f.harness.session.scope.count({ set: id });

    return [count.nodes, count.edges];
}

/**
 * Put a record straight into the store, as the loader or an undo does, past the doors' refusals.
 * @param f - The fixture.
 * @param name - Its name, which its id is minted from.
 * @param definition - Its definition.
 * @returns The id.
 */
function put(f: Fixture, name: string, definition: unknown): SetId {
    const store = setsStoreOf(f.harness.session.sets);

    return store.transact(() => {
        const id = store.mint(name);
        store.put(
            prepareCreate(store, { id, name, order: store.nextOrder(), definition, createdFrom: { kind: "user" } }),
        );

        return id;
    });
}

/**
 * The status of a kept set.
 * @param f - The fixture.
 * @param id - The set.
 * @returns The status.
 */
function statusOfSet(f: Fixture, id: SetId): SetStatus {
    return f.harness.session.sets.status({ set: id });
}

/**
 * A status as plain data.
 * @param freshness - The freshness.
 * @param reasons - The reasons.
 * @param earlierRuns - The earlier runs.
 * @returns The status.
 */
function status(
    freshness: SetStatus["freshness"],
    reasons: SetStatus["reasons"] = [],
    earlierRuns: string[] = [],
): SetStatus {
    return { freshness, reasons, earlierRuns };
}

/** A rule over run `pr`'s values. */
const OVER_PR: SetDefinitionInput = { kind: "rule", where: "results.pr.value > `2`", reading: "induced" };

/**
 * Register a plugin algorithm, so it can later be unregistered.
 */
function registerPlugin(): void {
    const degree = algorithmByKey("degree");
    assert.isDefined(degree);
    publishAlgorithmDescriptor({ descriptor: { ...degree, key: "plugrank" }, namespace: "acme", type: "plugrank" });
}

describe("status, row by row of the design's table", () => {
    afterEach(() => {
        clearRegisteredAlgorithmsForTesting();
    });

    it("a fixed set kept from community 1, then Louvain re-runs: current, earlier run, its members", async () => {
        const f = fixture();
        await run(f, "louv");
        const execution = resultExecutionOf(f.harness.session.results, "louv") ?? "";
        const createdFrom: SetCreatedFrom = {
            kind: "result",
            item: { result: "louv", key: { field: "group", value: 1 }, run: execution },
        };
        const id = createSetAs(
            f.harness.session.sets,
            { kind: "fixed", nodes: ["c", "d", "e"], reading: "induced" },
            "Community 1",
            createdFrom,
        );
        assert.deepStrictEqual(statusOfSet(f, id), status("current"));

        f.table.set("louv", LOUVAIN_2);
        await rerun(f, "louv");

        assert.deepStrictEqual(statusOfSet(f, id), status("current", [], ["louv"]));
        assert.deepStrictEqual(await nodesOf(f, id), ["c", "d", "e"]);
    });

    it("a rule holding community 1 of execution e, then the run re-executes: current, earlier run, the captured members", async () => {
        const f = fixture();
        await run(f, "louv");
        const execution = resultExecutionOf(f.harness.session.results, "louv") ?? "";
        const id = f.harness.session.sets.create({
            kind: "rule",
            where: { kind: "item", item: { result: "louv", key: { field: "group", value: 1 }, run: execution } },
            reading: "induced",
        });

        f.table.set("louv", LOUVAIN_2);
        await rerun(f, "louv");

        assert.deepStrictEqual(statusOfSet(f, id), status("current", [], ["louv"]));
        assert.deepStrictEqual(await nodesOf(f, id), ["c", "d", "e"], "not the new group 1: b, d, e");
    });

    it("the same after a reload without execution e's values: current, values-not-kept, nothing", async () => {
        const f = fixture();
        await run(f, "louv");
        // A token no live execution carries, and no capture: what a file written without them holds.
        const id = f.harness.session.sets.create({
            kind: "rule",
            where: { kind: "item", item: { result: "louv", key: { field: "group", value: 1 }, run: "saved.3" } },
            reading: "induced",
        });

        assert.deepStrictEqual(
            statusOfSet(f, id),
            status("current", [{ kind: "values-not-kept", run: "louv" }], ["louv"]),
        );
        assert.deepStrictEqual(await countOf(f, id), [0, 0]);
    });

    it("a rule over results.pr.value, then pr re-runs: current, and it re-resolves", async () => {
        const f = fixture();
        await run(f, "pr");
        const id = f.harness.session.sets.create(OVER_PR);
        assert.deepStrictEqual(await nodesOf(f, id), ["b", "c", "d"]);

        f.table.set("pr", SCORES_2);
        await rerun(f, "pr");

        assert.deepStrictEqual(statusOfSet(f, id), status("current"));
        assert.deepStrictEqual(await nodesOf(f, id), ["a", "e"]);
    });

    it("a rule reading results.pr while pr is out of date: out-of-date, run-out-of-date, and it re-resolves", async () => {
        const f = fixture();
        const scope = f.harness.session.sets.create({
            kind: "fixed",
            nodes: ["a", "b", "c", "d", "e"],
            reading: "induced",
        });
        await run(f, "pr", { set: scope });
        const id = f.harness.session.sets.create(OVER_PR);
        assert.deepStrictEqual(statusOfSet(f, id), status("current"));

        // The set the run recorded is redefined: a declared input of pr changed.
        f.harness.session.sets.redefine(scope, { kind: "fixed", nodes: ["a", "b"], reading: "induced" });

        assert.deepStrictEqual(statusOfSet(f, id), status("out-of-date", [{ kind: "run-out-of-date", run: "pr" }]));
        assert.deepStrictEqual(await nodesOf(f, id), ["b", "c", "d"], "the run's current values");
    });

    it("a run over a kept set reads out of date when a data edit moves its members, as the same members inline do", async () => {
        for (const kind of ["fixed", "rule"] as const) {
            const f = fixture();
            f.table.set("kept", SCORES_1);
            f.table.set("inline", SCORES_1);
            const { sets } = f.harness.session;
            // Fixed: a, b and c, and removing b removes a member. Rule: degree two or more (a, b, c
            // and d), and removing b leaves a with one edge, so a and b leave. No revision moves.
            const definition: SetDefinition =
                kind === "fixed"
                    ? { kind: "fixed", nodes: ["a", "b", "c"], reading: "induced" }
                    : { kind: "rule", where: { kind: "degree", min: 2 }, reading: "induced" };
            const kept = sets.create(definition);
            await run(f, "kept", { set: kept });
            await run(f, "inline", { define: definition });
            const overKept = sets.create(
                { kind: "rule", where: "results.kept.value > `0`", reading: "induced" },
                { name: "Over kept" },
            );
            const overInline = sets.create(
                { kind: "rule", where: "results.inline.value > `0`", reading: "induced" },
                { name: "Over inline" },
            );
            assert.strictEqual(statusOfSet(f, overKept).freshness, "current", kind);

            f.harness.store.builder.removeNode("b");
            f.harness.store.touch();
            f.harness.session.data.snapshot();

            assert.deepStrictEqual(
                statusOfSet(f, overInline),
                status("out-of-date", [{ kind: "run-out-of-date", run: "inline" }]),
                kind,
            );
            assert.deepStrictEqual(
                statusOfSet(f, overKept),
                status("out-of-date", [{ kind: "run-out-of-date", run: "kept" }]),
                kind,
            );
        }
    });

    it("a rule reading a run whose algorithm is no longer registered: current, missing-capability, the run's values", async () => {
        const f = fixture();
        registerPlugin();
        await run(f, "plug", "graph", "plugrank");
        const id = f.harness.session.sets.create({
            kind: "rule",
            where: "results.plug.value > `2`",
            reading: "induced",
        });
        clearRegisteredAlgorithmsForTesting();

        assert.deepStrictEqual(
            statusOfSet(f, id),
            status("current", [{ kind: "missing-capability", name: "plugrank" }]),
        );
        assert.deepStrictEqual(await nodesOf(f, id), ["b", "c", "d"]);
    });

    it("the same after an input of that run changed: cannot-rerun, missing-capability, the run's values", async () => {
        const f = fixture();
        registerPlugin();
        const scope = f.harness.session.sets.create({
            kind: "fixed",
            nodes: ["a", "b", "c", "d", "e"],
            reading: "induced",
        });
        await run(f, "plug", { set: scope }, "plugrank");
        const id = f.harness.session.sets.create({
            kind: "rule",
            where: "results.plug.value > `2`",
            reading: "induced",
        });
        clearRegisteredAlgorithmsForTesting();
        f.harness.session.sets.redefine(scope, { kind: "fixed", nodes: ["a"], reading: "induced" });

        assert.deepStrictEqual(
            statusOfSet(f, id),
            status("cannot-rerun", [{ kind: "missing-capability", name: "plugrank" }]),
        );
        assert.deepStrictEqual(await nodesOf(f, id), ["b", "c", "d"]);
    });

    it("names a removed set or run: detached, missing-set or missing-run, nothing, never throws", async () => {
        const f = fixture();
        const gone = f.harness.session.sets.create(
            { kind: "fixed", nodes: ["a"], reading: "induced" },
            { name: "Gone" },
        );
        const readsSet = f.harness.session.sets.create({
            kind: "rule",
            where: { kind: "member", of: { set: gone } },
            reading: "induced",
        });
        await run(f, "pr");
        const readsRun = f.harness.session.sets.create(OVER_PR);
        f.harness.session.sets.remove(gone);
        f.harness.session.runs.remove("pr");

        assert.deepStrictEqual(
            statusOfSet(f, readsSet),
            status("detached", [{ kind: "missing-set", id: gone, name: "Gone" }]),
        );
        assert.deepStrictEqual(statusOfSet(f, readsRun), status("detached", [{ kind: "missing-run", run: "pr" }]));
        assert.deepStrictEqual(
            statusOfSet(f, gone),
            status("detached", [{ kind: "missing-set", id: gone, name: "Gone" }]),
            "the removed set itself",
        );
        assert.deepStrictEqual(await countOf(f, readsSet), [1, 0], "a removed set is read from its kept record");
        assert.deepStrictEqual(await countOf(f, readsRun), [0, 0]);
    });

    it("caught in a cycle, its last compile failed, or holds an unknown kind: unresolvable, nothing, never throws", async () => {
        const f = fixture();
        // Two sets reading each other: the doors refuse this, a load or an undo can make it.
        const a = put(f, "ring a", {
            kind: "rule",
            where: { kind: "member", of: { set: "set_ring-b" } },
            reading: "induced",
        });
        const b = put(f, "ring b", { kind: "rule", where: { kind: "member", of: { set: a } }, reading: "induced" });
        assert.deepStrictEqual(statusOfSet(f, a), status("unresolvable", [{ kind: "cycle", through: [b, a] }]));
        assert.deepStrictEqual(await countOf(f, a), [0, 0]);

        // A rule whose last pass could not compile it: read from the outcome that pass recorded.
        const graph = new TestGraph();
        graph.load([{ s: "a", t: "b" }]);
        const broken = graph.sets.create({ kind: "rule", where: "weight > `1`", reading: "induced" });
        const cache = new SetsCache();
        const failure = new GraphtyError({
            code: "E_BAD_SELECTOR",
            message: "The column weight cannot be compared here.",
            source: "style",
        });
        const context = {
            snapshot: graph.snapshot(),
            store: graph.storeTag(),
            sets: graph.setsStore,
            cache,
            match: (): never => {
                throw failure;
            },
        };
        const brokenSets = createSetsApi(
            { edgeMember: () => undefined, outcome: (record) => outcomeOf(cache, record) },
            graph.setsStore,
        );
        assert.deepStrictEqual(
            brokenSets.status({ set: broken }),
            status("current"),
            "no pass yet: nothing known to be wrong",
        );
        const passed = resolveSet({ id: broken, definition: graph.sets.get(broken)?.definition as never }, context);
        assert.strictEqual(passed.nodeCount, 0);
        assert.deepStrictEqual(
            brokenSets.status({ set: broken }),
            status("unresolvable", [{ kind: "invalid", message: failure.message }]),
        );
        brokenSets.redefine(broken, { kind: "rule", where: "weight > `2`", reading: "induced" });
        assert.deepStrictEqual(
            brokenSets.status({ set: broken }),
            status("current"),
            "an outcome is never read for a later definition",
        );

        const store = setsStoreOf(f.harness.session.sets);
        const opaque = store.transact(() => {
            const id = store.mint("opaque");
            store.put(
                loadRecord({
                    id,
                    name: "Opaque",
                    order: store.nextOrder(),
                    definition: { kind: "acme:blob", payload: 1 },
                    createdFrom: { kind: "user" },
                }),
            );

            return id;
        });
        assert.deepStrictEqual(
            statusOfSet(f, opaque),
            status("unresolvable", [{ kind: "missing-capability", name: "acme:blob" }]),
        );
        assert.deepStrictEqual(await countOf(f, opaque), [0, 0]);
    });

    it("a fixed set after some members were removed: current, the rest, and count reports missing", () => {
        const graph = new TestGraph();
        graph.load([
            { s: "a", t: "b" },
            { s: "b", t: "c" },
        ]);
        const id = graph.sets.create({ kind: "fixed", nodes: ["a", "b", "c"], reading: "induced" });
        graph.removeNode("c");
        const cache = new SetsCache();
        const resolution = resolveSet(
            { id, definition: graph.sets.get(id)?.definition as never },
            { snapshot: graph.snapshot(), store: graph.storeTag(), sets: graph.setsStore, cache },
        );

        const sets = createSetsApi(
            { edgeMember: () => undefined, outcome: (record) => outcomeOf(cache, record) },
            graph.setsStore,
        );
        assert.deepStrictEqual(sets.status({ set: id }), status("current"));
        assert.strictEqual(resolution.nodeCount, 2);
        assert.strictEqual(resolution.missingNodes, 1);
    });

    it("a fixed set after a re-import changed a parallel group's size: current, ambiguous-parallel-edge, the rest", () => {
        const graph = new TestGraph();
        const [one] = graph.load([{ s: "a", t: "b" }]);
        const [two] = graph.load([{ s: "a", t: "b" }]);
        const [three] = graph.load([{ s: "b", t: "c" }]);
        const id = graph.sets.create({
            kind: "fixed",
            nodes: [],
            edges: [one, two, three].map((c) => graph.edgeId(c)),
            reading: "listed",
        });
        graph.replaceStore();
        graph.load([{ s: "a", t: "b" }]);
        graph.load([{ s: "a", t: "b" }]);
        graph.load([{ s: "b", t: "c" }]);
        const cache = new SetsCache();
        const resolution = resolveSet(
            { id, definition: graph.sets.get(id)?.definition as never },
            { snapshot: graph.snapshot(), store: graph.storeTag(), sets: graph.setsStore, cache },
        );

        const sets = createSetsApi(
            { edgeMember: () => undefined, outcome: (record) => outcomeOf(cache, record) },
            graph.setsStore,
        );
        assert.deepStrictEqual(
            sets.status({ set: id }),
            status("current", [{ kind: "ambiguous-parallel-edge", count: 1 }]),
        );
        assert.strictEqual(resolution.edgeCount, 1, "b-c still binds");
        assert.strictEqual(resolution.missingEdges, 1, "the a-b member, which two edges carry, binds neither");
    });

    it("a rule set after a data edit: current, and it re-resolves", async () => {
        const f = fixture();
        const id = f.harness.session.sets.create({
            kind: "rule",
            where: { kind: "degree", min: 3 },
            reading: "induced",
        });
        assert.deepStrictEqual(await nodesOf(f, id), ["c"]);
        f.harness.add([], [{ src: "a", dst: "d" }]);

        assert.deepStrictEqual(statusOfSet(f, id), status("current"));
        assert.deepStrictEqual(await nodesOf(f, id), ["a", "c", "d"]);
    });

    it("an input set out of date, unable to re-run, or detached: the worse, with input", async () => {
        const f = fixture();
        registerPlugin();
        const scope = f.harness.session.sets.create({
            kind: "fixed",
            nodes: ["a", "b", "c", "d", "e"],
            reading: "induced",
        });
        await run(f, "pr", { set: scope });
        await run(f, "plug", { set: scope }, "plugrank");
        const stale = f.harness.session.sets.create(OVER_PR);
        const stuck = f.harness.session.sets.create({
            kind: "rule",
            where: "results.plug.value > `2`",
            reading: "induced",
        });
        const gone = f.harness.session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" });
        const orphan = f.harness.session.sets.create({
            kind: "rule",
            where: { kind: "member", of: { set: gone } },
            reading: "induced",
        });
        const reader = (input: SetId): SetId =>
            f.harness.session.sets.create({
                kind: "rule",
                where: { kind: "member", of: { set: input } },
                reading: "induced",
            });
        const readsStale = reader(stale);
        const readsStuck = reader(stuck);
        const readsOrphan = reader(orphan);
        const readsAll = f.harness.session.sets.create({
            kind: "rule",
            where: {
                kind: "any",
                of: [
                    { kind: "member", of: { set: stale } },
                    { kind: "member", of: { set: orphan } },
                ],
            },
            reading: "induced",
        });

        clearRegisteredAlgorithmsForTesting();
        f.harness.session.sets.redefine(scope, { kind: "fixed", nodes: ["a", "b"], reading: "induced" });
        f.harness.session.sets.remove(gone);

        assert.deepStrictEqual(
            statusOfSet(f, readsStale),
            status("out-of-date", [{ kind: "input", id: stale, freshness: "out-of-date" }]),
        );
        assert.deepStrictEqual(
            statusOfSet(f, readsStuck),
            status("cannot-rerun", [{ kind: "input", id: stuck, freshness: "cannot-rerun" }]),
        );
        assert.deepStrictEqual(
            statusOfSet(f, readsOrphan),
            status("detached", [{ kind: "input", id: orphan, freshness: "detached" }]),
        );
        assert.deepStrictEqual(
            statusOfSet(f, readsAll),
            status("detached", [
                { kind: "input", id: stale, freshness: "out-of-date" },
                { kind: "input", id: orphan, freshness: "detached" },
            ]),
            "the worse of the two",
        );
        assert.deepStrictEqual(await nodesOf(f, readsStale), await nodesOf(f, stale), "as the input");
    });
});

describe("status beyond the table", () => {
    it("reads a run that recorded a revision of another scheme as revision-unknown, never out of date", () => {
        const sets = createSetsApi({ edgeMember: () => undefined });
        const store = setsStoreOf(sets);
        const scope = sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" });
        const id = sets.create({
            kind: "rule",
            where: { kind: "threshold", path: "results.old.value", top: 1 },
            reading: "induced",
        });
        const old = {
            id: "old",
            label: "Old",
            algorithm: "degree",
            registered: true,
            execution: "x.1",
            scope: { spec: { set: scope }, set: { id: scope, revision: "r0:0123" } },
            scopeMoved: () => true,
            captures: new Map(),
        };

        const read = statusOf(
            { set: id },
            {
                sets: store,
                dependencies: { referent: (ref) => store.get(ref)?.definition },
                run: (ref) => (ref === "old" ? old : undefined),
            },
        );
        assert.deepStrictEqual(read, status("current", [{ kind: "revision-unknown", run: "old" }]));
    });

    it("never resolves: 200 status reads of a panel's sets do no resolution work", async () => {
        const f = fixture();
        await run(f, "louv");
        await run(f, "pr");
        const execution = resultExecutionOf(f.harness.session.results, "louv") ?? "";
        const ids: SetId[] = [];
        for (let i = 0; i < 50; i++) {
            ids.push(f.harness.session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }));
            ids.push(f.harness.session.sets.create(OVER_PR));
            ids.push(
                f.harness.session.sets.create({
                    kind: "rule",
                    where: {
                        kind: "item",
                        item: { result: "louv", key: { field: "group", value: i % 2 }, run: execution },
                    },
                    reading: "induced",
                }),
            );
            ids.push(
                f.harness.session.sets.create({
                    kind: "rule",
                    where: { kind: "member", of: { set: ids[ids.length - 2] } },
                    reading: "induced",
                }),
            );
        }

        assert.strictEqual(ids.length, 200);
        const resolved = { ...resolveCounters };
        const { misses } = cacheCounters;
        for (const id of ids) {
            assert.strictEqual(statusOfSet(f, id).freshness, "current");
        }

        assert.deepStrictEqual(
            { ...resolveCounters },
            resolved,
            "no edge pass, mask pack, digest, id set or binding plan",
        );
        assert.strictEqual(cacheCounters.misses, misses, "no resolution was computed");
    });

    it("an induced rule whose referent was redefined to speak edges: invalid, and every consumer gets nothing", async () => {
        const f = fixture();
        const { session } = f.harness;
        const referent = session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" });
        const rule = session.sets.create({
            kind: "rule",
            where: { kind: "member", of: { set: referent } },
            reading: "induced",
        });
        session.sets.redefine(referent, { kind: "fixed", nodes: ["a", "b"], reading: "listed" });

        assert.strictEqual(statusOfSet(f, rule).freshness, "unresolvable");
        assert.strictEqual(statusOfSet(f, rule).reasons[0]?.kind, "invalid");
        assert.deepStrictEqual(await countOf(f, rule), [0, 0]);
        await session.visibility.set({ kind: "member", of: { set: rule } });
        assert.strictEqual([...session.visibility.nodes].length, 0, "a filter over it shows nothing");
        let refused: unknown = null;
        try {
            await session.runs.start("degree", undefined, { scope: { set: rule }, style: false });
        } catch (error) {
            refused = error;
        }

        assert.ok(refused instanceof GraphtyError, "a run over it is refused");
    });

    it("a rule reading a run whose scope set was removed: cannot-rerun, missing-set by name, the run's values", async () => {
        const f = fixture();
        const { session } = f.harness;
        const scope = session.sets.create(
            { kind: "fixed", nodes: ["a", "b", "c"], reading: "induced" },
            { name: "Scope" },
        );
        await run(f, "pr", { set: scope });
        const reads = session.sets.create(OVER_PR);
        session.sets.remove(scope);

        assert.deepStrictEqual(
            statusOfSet(f, reads),
            status("cannot-rerun", [{ kind: "missing-set", id: scope, name: "Scope" }]),
        );
        assert.ok((await nodesOf(f, reads)).length > 0, "it still reads the run's values");
        assert.strictEqual(
            session.runs.get("pr")?.record.stale?.nowVisible,
            0,
            "the run's record reads, and its scope holds nothing",
        );
        let message = "";
        try {
            await rerun(f, "pr");
        } catch (error) {
            message = String(error);
        }

        assert.match(message, /"Scope" was removed/);
    });

    it("refuses a set id that was never issued, and reads a keyword as current", () => {
        const f = fixture();
        assert.throws(() => f.harness.session.sets.status({ set: "set_never" }), /never/);
        assert.deepStrictEqual(f.harness.session.sets.status("visible"), status("current"));
    });
});

describe("usedBy", () => {
    it("lists the sets naming the id and the runs whose scope names it", async () => {
        const f = fixture();
        const base = f.harness.session.sets.create(
            { kind: "fixed", nodes: ["a", "b", "c"], reading: "induced" },
            { name: "Base" },
        );
        const reader = f.harness.session.sets.create(
            { kind: "rule", where: { kind: "member", of: { set: base } }, reading: "induced" },
            { name: "Reader" },
        );
        f.harness.session.sets.create(
            { kind: "rule", where: { kind: "member", of: { set: reader } }, reading: "induced" },
            { name: "Indirect" },
        );
        await run(f, "pr", { set: base });
        await run(f, "louv");

        assert.deepStrictEqual(f.harness.session.sets.usedBy(base), [
            { kind: "set", id: reader, label: "Reader" },
            { kind: "run", id: "pr", label: f.harness.session.runs.get("pr")?.label ?? "" },
        ]);
        assert.deepStrictEqual(f.harness.session.sets.usedBy("set_never"), []);
    });
});
