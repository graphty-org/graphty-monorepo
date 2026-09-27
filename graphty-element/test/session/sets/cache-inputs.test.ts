/**
 * @file The cache audit (design/sets/sets-design.md sections 6.2 and 22 item 7): every cache the
 * sets code keeps, against the full list of inputs it reads. For each (cache, input) pair, one
 * test changes only that input and must miss, and one changes an input the entry does not read
 * and must hit.
 *
 * | Cache           | Keyed by                          | Inputs it reads                                                   |
 * |-----------------|-----------------------------------|-------------------------------------------------------------------|
 * | signature memo  | set id / saved id, per epoch      | store, snapshot serial, input tick, saved-map and set-list identity |
 * | resolution      | kept definition / canonical scope | store, serial, attribute revisions read, mask versions read,      |
 * |                 |                                   | execution tokens read, saved record identity (absent marker),     |
 * |                 |                                   | seeds, and, through the columns a re-import writes, `edgeIdPath`  |
 * | summary         | set id                            | the resolution's signature                                        |
 * | digest          | the resolution object             | whatever the resolution reads (memoised on it)                    |
 * | offer counts    | run id                            | the run's execution token, store, snapshot serial; the edge-count |
 * |                 |                                   | pass is filled into the entry and dropped with it                 |
 * | derived input   | store, serial, bitmap signature,  | the scope's node and edge bitmaps (confirmed word for word), the  |
 * |                 | orientation, merge policy         | store and snapshot serial, the orientation, the merge policy      |
 */

import { type GraphSnapshot, maskToIndices, type U32 } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { DerivedInputs } from "../../../src/algorithms/input/derivedInputs";
import { createScopedInput, type ResolvedInputScope } from "../../../src/algorithms/input/ScopedInput";
import type { NodeId, Query, Scope, ScopeId, SetId } from "../../../src/catalog/types";
import { AttributeRevisions, InputTick } from "../../../src/session/attributes";
import type { RunResult } from "../../../src/session/results/types";
import { edgeSpaceOf, ElementMask, nodeSpaceOf } from "../../../src/session/scope/index";
import { cacheCounters, countsOf, resolveSet, SetsCache } from "../../../src/session/sets/cache";
import { createOffering, offerCounters,type Offering } from "../../../src/session/sets/offers";
import { digestOf, type Resolution, type ResolveContext, resolveCounters, resolveScope } from "../../../src/session/sets/resolve";
import { scopeSignature, signatureCounters } from "../../../src/session/sets/signature";
import { InputGraph, resolutionOver } from "../../algorithms/input/harness";
import { type EdgeRecord, TestGraph } from "./graphs";

const RECORDS: EdgeRecord[] = [
    { s: "a", t: "b", fields: { eid: "e1" } },
    { s: "b", t: "c", fields: { eid: "e2" } },
    { s: "c", t: "d", fields: { eid: "e3" } },
    { s: "a", t: "b", fields: { eid: "e4" } },
];

/**
 * The paths a test query reads: its words that start `data.` or `results.`.
 * @param where - The query.
 * @returns The paths.
 */
function pathsOf(where: Query): string[] {
    return where.split(/\s+/).filter((word) => word.startsWith("data.") || word.startsWith("results."));
}

/** Everything one audit test drives. */
class Fixture {
    readonly graph = new TestGraph();
    readonly tick = new InputTick();
    readonly revisions = new AttributeRevisions(this.tick);
    readonly cache = new SetsCache();
    readonly executions = new Map<string, string>();
    /** What the fake query engine answers, by query. */
    readonly matches = new Map<Query, NodeId[]>();
    saved = new Map<ScopeId, { readonly spec: Scope }>();
    store: object;
    visibleNodes: ElementMask<NodeId>;
    visibleEdges: ElementMask<string>;
    selected: ElementMask<NodeId>;

    constructor() {
        this.graph.load(RECORDS);
        this.store = this.graph.store;
        const snapshot = this.graph.snapshot();
        const advance = (): void => {
            this.tick.advance();
        };
        const nodes = nodeSpaceOf(snapshot);
        const edges = edgeSpaceOf(snapshot);
        this.visibleNodes = new ElementMask<NodeId>(() => nodes, 1, advance);
        this.visibleEdges = new ElementMask<string>(() => edges, 1, advance);
        this.selected = new ElementMask<NodeId>(() => nodes, 1, advance);
        this.visibleNodes.grow(snapshot.nodeCount);
        this.visibleNodes.fill();
        this.visibleEdges.grow(snapshot.edgeCount);
        this.visibleEdges.fill();
        this.selected.grow(snapshot.nodeCount);
        this.selected.add(0);
    }

    /**
     * What a resolution reads now.
     * @returns The context.
     */
    context(): ResolveContext {
        return {
            snapshot: this.graph.snapshot(),
            store: this.store,
            saved: this.saved,
            sets: this.graph.setsStore,
            visibility: { nodes: () => this.visibleNodes, edges: () => this.visibleEdges },
            selection: { nodes: () => this.selected },
            match: (where: Query) => this.matches.get(where) ?? [],
            pathsOf,
            revisions: this.revisions,
            executionOf: (run) => this.executions.get(run),
            tick: this.tick,
            cache: this.cache,
        };
    }

    /**
     * Resolve a scope.
     * @param scope - The scope.
     * @returns The resolution.
     */
    scope(scope: Scope): Resolution {
        return resolveScope(scope, this.context());
    }

    /**
     * Resolve a kept set.
     * @param id - The set.
     * @returns The resolution.
     */
    set(id: SetId): Resolution {
        const record = this.graph.sets.get(id);
        assert.isDefined(record);

        return resolveSet(record, this.context());
    }

    /**
     * Save a scope, replacing the map as the resolver does.
     * @param id - The id.
     * @param spec - The scope.
     */
    save(id: ScopeId, spec: Scope): void {
        this.saved = new Map(this.saved).set(id, { spec });
        this.tick.advance();
    }
}

/**
 * The ids a resolution holds.
 * @param resolution - It.
 * @param snapshot - Its snapshot.
 * @returns Sorted node ids.
 */
function nodeIds(resolution: Resolution, snapshot: GraphSnapshot): string[] {
    return Array.from(maskToIndices(resolution.nodes, snapshot.nodeCount), (i) => String(snapshot.ids.idOf(i))).sort();
}

/**
 * One audit row: resolve, change something, resolve again.
 * @param fixture - The fixture.
 * @param resolve - What to resolve.
 * @param change - The one input to change.
 * @returns Whether the second resolution was served from the cache.
 */
function served(fixture: Fixture, resolve: () => Resolution, change: () => void): boolean {
    const first = resolve();
    assert.strictEqual(resolve(), first, "nothing changed: a hit");
    change();

    return resolve() === first;
}

describe("the resolution cache, input by input", () => {
    it("misses on a new snapshot serial; hits on an unread attribute revision", () => {
        const f = new Fixture();
        assert.isFalse(served(f, () => f.scope({ nodes: ["a"] }), () => f.graph.addNode("q")));
        assert.isTrue(served(f, () => f.scope({ nodes: ["a"] }), () => f.revisions.bump(["weight"])));
    });

    it("misses on another store instance over the same serial; hits on an unrelated set write", () => {
        const f = new Fixture();
        assert.isFalse(served(f, () => f.scope({ nodes: ["a"] }), () => (f.store = {})));
        assert.isTrue(served(f, () => f.scope({ nodes: ["a"] }), () => f.graph.sets.create({ kind: "fixed", nodes: ["b"], reading: "induced" })));
    });

    it("misses on the revision of a field a query reads; hits on one it does not read", () => {
        const f = new Fixture();
        const where = { where: "data.weight > 1" };
        f.matches.set(where.where, ["a"]);
        assert.isFalse(served(f, () => f.scope(where), () => f.revisions.bump(["weight"])));
        assert.isTrue(served(f, () => f.scope(where), () => f.revisions.bump(["label"])));
    });

    it("misses on the visibility mask versions; hits on the selection's", () => {
        const f = new Fixture();
        assert.isFalse(served(f, () => f.scope("visible"), () => f.visibleNodes.delete(1)));
        assert.isFalse(served(f, () => f.scope("visible"), () => f.visibleEdges.delete(0)));
        assert.isTrue(served(f, () => f.scope("visible"), () => f.selected.add(2)));
    });

    it("misses on the selection mask version; hits on the visibility's", () => {
        const f = new Fixture();
        assert.isFalse(served(f, () => f.scope("selection"), () => f.selected.add(3)));
        assert.isTrue(served(f, () => f.scope("selection"), () => f.visibleNodes.delete(2)));
    });

    it("misses on the execution token of a run a query reads, minted or put by a load; hits on another run's", () => {
        const f = new Fixture();
        const where = { where: "results.pr.score > 0" };
        f.executions.set("pr", "n1.1");
        assert.isFalse(served(f, () => f.scope(where), () => f.executions.set("pr", "n1.2")));
        // A file load puts a token minted by another session: never equal to a live one.
        assert.isFalse(served(f, () => f.scope(where), () => f.executions.set("pr", "filenonce.2")));
        assert.isFalse(served(f, () => f.scope(where), () => f.executions.delete("pr")));
        assert.isTrue(served(f, () => f.scope(where), () => f.executions.set("louvain", "n1.9")));
    });

    it("misses when a named saved record is replaced; hits when an unrelated one is saved", () => {
        const f = new Fixture();
        f.save("core", { nodes: ["a", "b"] });
        assert.isFalse(served(f, () => f.scope({ set: "core" }), () => f.save("core", { nodes: ["a", "b"] })));
        assert.isTrue(served(f, () => f.scope({ set: "core" }), () => f.save("other", { nodes: ["c"] })));
    });

    it("carries an explicit absent marker for a named id nothing holds", () => {
        const f = new Fixture();
        f.save("outer", { set: "ghost" });
        const absent = scopeSignature({ set: "outer" }, f.context());
        assert.include(absent, '"ghost"!');
        f.save("ghost", { nodes: ["a"] });
        const present = scopeSignature({ set: "outer" }, f.context());
        assert.notInclude(present, "!");
        assert.notStrictEqual(present, absent);
    });

    it("hits on a rename of a kept set and on an unrelated set write; misses on a redefine", () => {
        const f = new Fixture();
        const id = f.graph.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "Pair" });
        assert.isTrue(served(f, () => f.set(id), () => f.graph.sets.rename(id, "Renamed")));
        assert.isTrue(served(f, () => f.set(id), () => f.graph.sets.create({ kind: "fixed", nodes: ["c"], reading: "induced" })));
        assert.isFalse(served(f, () => f.set(id), () => f.graph.sets.redefine(id, { kind: "fixed", nodes: ["a", "c"], reading: "induced" })));
    });

    it("misses on a reading-only redefine, which shares the member arrays", () => {
        const f = new Fixture();
        const id = f.graph.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" });
        const prior = f.graph.sets.get(id);
        assert.isFalse(served(f, () => f.set(id), () => f.graph.sets.redefine(id, { kind: "fixed", nodes: ["a", "b"], reading: "listed" })));
        const next = f.graph.sets.get(id);
        assert.strictEqual(next?.definition.kind === "fixed" ? next.definition.nodes : null, prior?.definition.kind === "fixed" ? prior.definition.nodes : undefined);
    });

    it("hits again when an undo-shaped put restores the identical frozen record", () => {
        const f = new Fixture();
        const id = f.graph.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" });
        const prior = f.graph.sets.get(id);
        assert.isDefined(prior);
        const before = f.set(id);
        f.graph.sets.redefine(id, { kind: "fixed", nodes: ["c"], reading: "induced" });
        assert.notStrictEqual(f.set(id), before);
        f.graph.setsStore.transact(() => {
            f.graph.setsStore.put(prior);
        });
        assert.strictEqual(f.set(id), before);
    });

    it("misses when a door seeds new edge members; hits on another set's seeds", () => {
        const f = new Fixture();
        const [e1, e2] = f.graph.counters();
        const id = f.graph.sets.create({ kind: "fixed", nodes: [], edges: [f.graph.edgeId(e1)], reading: "listed" });
        const other = f.graph.sets.create({ kind: "fixed", nodes: [], edges: [f.graph.edgeId(e1)], reading: "listed" });
        assert.isFalse(served(f, () => f.set(id), () => f.graph.sets.addMembers(id, { edges: [f.graph.edgeId(e2)] })));
        assert.isTrue(served(f, () => f.set(id), () => f.graph.sets.addMembers(other, { edges: [f.graph.edgeId(e2)] })));
    });

    it("reads edgeIdPath only through the columns a re-import writes", () => {
        const f = new Fixture();
        // Ordinal members: the graph was loaded with no edgeIdPath.
        const [first] = f.graph.counters();
        const id = f.graph.sets.create({ kind: "fixed", nodes: [], edges: [f.graph.edgeId(first)], reading: "listed" });
        const record = f.graph.sets.get(id);
        const definition = record?.definition;
        assert.strictEqual(definition?.kind === "fixed" ? definition.edges?.[0]?.ordinal : undefined, 0);

        // Configured alone, nothing a resolution reads has moved: the binding is still right.
        assert.isTrue(served(f, () => f.set(id), () => (f.graph.path = "eid")));

        // Applied by a re-import, the columns move with the serial: the binding is redone, and the
        // ordinal member still binds (design 12.3 rule 4).
        const passes = resolveCounters.identityPasses;
        const bound = f.set(id);
        f.graph.replaceStore();
        f.graph.load(RECORDS);
        f.store = f.graph.store;
        const rebound = f.set(id);
        assert.notStrictEqual(rebound, bound);
        assert.strictEqual(resolveCounters.identityPasses - passes, 1);
        assert.strictEqual(rebound.edgeCount, 1);
        assert.strictEqual(rebound.missingEdges, 0);
    });

    it("never serves a query it cannot enumerate the inputs of", () => {
        const f = new Fixture();
        const context = { ...f.context(), pathsOf: undefined };
        f.matches.set("x", ["a"]);
        assert.notStrictEqual(resolveScope({ where: "x" }, context), resolveScope({ where: "x" }, context));
    });
});

describe("the latent defect of a saved predicate over results", () => {
    it("re-resolves a saved { where } over results.pr after pr re-runs with no data change", async () => {
        const { makeSession } = await import("../helpers");
        const { stubResult } = await import("../runs/harness");
        let generation = 0;
        const harness = makeSession({
            runs: {
                execute: (context) => {
                    generation++;
                    const hot = generation % 2 === 1 ? "a" : "b";
                    return Promise.resolve({ result: { ...stubResult(context.runId), node: (id: NodeId) => ({ score: id === hot ? 1 : 0 }) } });
                },
            },
        });
        harness.add([{ id: "a" }, { id: "b" }, { id: "c" }]);
        const { runs, scope } = harness.session;
        const run = runs.start("degree", undefined, { as: "pr", style: false });
        await run;
        const id = scope.save("Hot", { where: "results.pr.score > `0`" });
        assert.deepStrictEqual([...(await scope.resolve({ set: id })).nodes], ["a"]);

        const {hits} = cacheCounters;
        assert.deepStrictEqual([...(await scope.resolve({ set: id })).nodes], ["a"]);
        assert.strictEqual(cacheCounters.hits - hits, 1, "unchanged inputs: served");

        await run.rerun();
        assert.deepStrictEqual([...(await scope.resolve({ set: id })).nodes], ["b"]);
        harness.session.dispose();
    });
});

describe("the signature memo, input by input", () => {
    /**
     * How many referent parts a signature walked.
     * @param f - The fixture.
     * @returns The walk count.
     */
    function walks(f: Fixture): number {
        const before = signatureCounters.walks;
        scopeSignature({ set: "top" }, f.context(), f.cache.memo);

        return signatureCounters.walks - before;
    }

    /**
     * A fixture with a chain `top` -> `base`.
     * @returns It.
     */
    function chain(): Fixture {
        const f = new Fixture();
        f.save("base", { nodes: ["a"] });
        f.save("top", { set: "base" });
        assert.strictEqual(walks(f), 2);
        assert.strictEqual(walks(f), 0, "same epoch: memoised");

        return f;
    }

    it("misses on each epoch input", () => {
        const changes: [string, (f: Fixture) => void][] = [
            ["the input tick", (f) => f.tick.advance()],
            ["the snapshot serial", (f) => f.graph.addNode("q")],
            ["the store", (f) => (f.store = {})],
            ["the saved map", (f) => (f.saved = new Map(f.saved))],
            ["the kept-set list", (f) => f.graph.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" })],
        ];
        for (const [name, change] of changes) {
            const f = chain();
            change(f);
            assert.strictEqual(walks(f), 2, name);
        }
    });

    it("hits across reads that change no epoch input", () => {
        const f = chain();
        f.scope({ nodes: ["b"] });
        f.cache.pin("anything")();
        digestOf(f.scope("graph"), f.graph.snapshot());
        assert.strictEqual(walks(f), 0);
    });

    it("walks the base of a diamond once, at two sizes", () => {
        for (const size of [1_000, 100_000]) {
            const f = new Fixture();
            f.save("base", { nodes: Array.from({ length: size }, (_, i) => `n${i}`) });
            f.save("left", { set: "base" });
            f.save("right", { set: "base" });
            f.save("top", { set: "left" });
            const before = signatureCounters.walks;
            for (const id of ["left", "right", "top"]) {
                scopeSignature({ set: id }, f.context(), f.cache.memo);
            }

            assert.strictEqual(signatureCounters.walks - before, 4, `left, base, right, top once each at ${size}`);
        }
    });

    it("caches a rule tree by what its leaves read: a named set's redefine misses, its rename hits", () => {
        const f = new Fixture();
        const { sets } = f.graph;
        const named = sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "named" });
        const tree: Scope = { define: { kind: "rule", where: { kind: "any", of: [{ kind: "scope", scope: { set: named } }, { kind: "degree", min: 3 }] }, reading: "induced" } };
        const first = f.scope(tree);
        assert.strictEqual(f.scope(tree), first, "unchanged inputs: a hit");

        sets.rename(named, "renamed");
        assert.strictEqual(f.scope(tree), first, "a rename reads nothing the tree reads");

        sets.redefine(named, { kind: "fixed", nodes: ["a", "d"], reading: "induced" });
        const second = f.scope(tree);
        assert.notStrictEqual(second, first);
        assert.strictEqual(second.nodeCount, first.nodeCount + 1);
    });

    it("walks the base of a true diamond of rule sets once, at two sizes", () => {
        for (const size of [1_000, 100_000]) {
            const f = new Fixture();
            const { sets } = f.graph;
            const base = sets.create({ kind: "fixed", nodes: Array.from({ length: size }, (_, i) => `n${i}`), reading: "induced" }, { name: "base" });
            const left = sets.create({ kind: "rule", where: { kind: "scope", scope: { set: base } }, reading: "induced" }, { name: "left" });
            const right = sets.create({ kind: "rule", where: { kind: "not", of: { kind: "scope", scope: { set: base } } }, reading: "induced" }, { name: "right" });
            const top = sets.create(
                { kind: "rule", where: { kind: "any", of: [{ kind: "scope", scope: { set: left } }, { kind: "scope", scope: { set: right } }] }, reading: "induced" },
                { name: "top" },
            );
            const before = signatureCounters.walks;
            assert.isNotNull(scopeSignature({ set: top }, f.context(), f.cache.memo), "a rule tree has a signature");

            assert.strictEqual(signatureCounters.walks - before, 4, `top, left, base, right once each at ${size}`);
        }
    });
});

describe("the summary cache and the digest", () => {
    it("serves counts from the summary while the signature holds, and misses when it moves", () => {
        const f = new Fixture();
        f.matches.set("data.weight > 1", ["a", "b"]);
        const id = f.graph.sets.create({ kind: "rule", where: "data.weight > 1", reading: "induced" });
        const record = f.graph.sets.get(id);
        assert.isDefined(record);
        assert.strictEqual(countsOf(record, f.context()).nodeCount, 2);

        const reads = cacheCounters.hits + cacheCounters.misses;
        f.revisions.bump(["label"]);
        assert.strictEqual(countsOf(record, f.context()).nodeCount, 2);
        assert.strictEqual(cacheCounters.hits + cacheCounters.misses, reads, "an unread input: the summary answers");

        f.matches.set("data.weight > 1", ["a"]);
        f.revisions.bump(["weight"]);
        assert.strictEqual(countsOf(record, f.context()).nodeCount, 1, "a read input: resolved again");
    });

    it("holds one entry per set under a 10,000-update stream", () => {
        const f = new Fixture();
        const ids = ["data.weight > 1", "data.weight > 2", "data.weight > 3"].map((where) => {
            f.matches.set(where, ["a"]);
            return f.graph.sets.create({ kind: "rule", where, reading: "induced" });
        });
        for (let update = 0; update < 10_000; update++) {
            f.revisions.bump(["weight"]);
            const id = ids[update % 3];
            const record = f.graph.sets.get(id);
            assert.isDefined(record);
            countsOf(record, f.context());
        }

        assert.strictEqual(f.cache.summaries.size, 3);
        assert.strictEqual(f.cache.size, 3, "one resolution per definition, the latest signature");
    });

    it("sums the digest once per resolution: again only when the resolution missed", () => {
        const f = new Fixture();
        const sums = resolveCounters.digestSums;
        digestOf(f.scope({ nodes: ["a"] }), f.graph.snapshot());
        f.revisions.bump(["weight"]);
        digestOf(f.scope({ nodes: ["a"] }), f.graph.snapshot());
        assert.strictEqual(resolveCounters.digestSums - sums, 1, "an unread input");
        f.graph.addNode("q");
        digestOf(f.scope({ nodes: ["a"] }), f.graph.snapshot());
        assert.strictEqual(resolveCounters.digestSums - sums, 2, "a new serial");
    });
});

/** A resolution of a given size, for the byte tests. */
function sized(bytes: number): Resolution {
    const words = bytes / 8;

    return {
        nodes: new Uint32Array(words),
        edges: new Uint32Array(words),
        nodeCount: 0,
        edgeCount: 0,
        serial: 0,
        store: null,
        missingNodes: 0,
        missingEdges: 0,
        ambiguousEdges: 0,
    };
}

/**
 * Every typed-array byte reachable from a value.
 * @param value - The value.
 * @param seen - Objects walked already.
 * @returns The bytes.
 */
function reachableBytes(value: unknown, seen = new Set<unknown>()): number {
    if (typeof value !== "object" || value === null || seen.has(value)) {
        return 0;
    }

    seen.add(value);
    if (ArrayBuffer.isView(value)) {
        return value.byteLength;
    }

    return Object.values(value).reduce<number>((sum, child) => sum + reachableBytes(child, seen), 0);
}

const MB = 1024 * 1024;

describe("byte accounting", () => {
    it("evicts unpinned entries oldest first past 64 MB", () => {
        const cache = new SetsCache();
        for (let i = 0; i < 10; i++) {
            cache.store(`k${i}`, "s", sized(8 * MB));
        }

        assert.isAtMost(cache.bytes, 64 * MB);
        const keys = cache.cached().map(([key]) => key);
        assert.deepStrictEqual(keys, ["k2", "k3", "k4", "k5", "k6", "k7", "k8", "k9"]);
    });

    it("keeps pinned entries past the bound and leaves 16 MB for unpinned ones", () => {
        const cache = new SetsCache();
        for (let i = 0; i < 10; i++) {
            cache.pin(`p${i}`);
            cache.store(`p${i}`, "s", sized(8 * MB));
        }

        assert.strictEqual(cache.pinnedBytes, 80 * MB, "pins may exceed the bound");
        for (let i = 0; i < 3; i++) {
            cache.store(`u${i}`, "s", sized(8 * MB));
        }

        assert.strictEqual(cache.bytes - cache.pinnedBytes, 16 * MB, "the reserve");
        assert.deepStrictEqual(
            cache.cached().map(([key]) => key).filter((key) => String(key).startsWith("u")),
            ["u1", "u2"],
        );
    });

    it("reports exactly the bytes its entries reach, and a summary holds none", () => {
        const f = new Fixture();
        f.save("core", { nodes: ["a", "b"] });
        f.scope("graph");
        f.scope("visible");
        f.scope({ set: "core" });
        const id = f.graph.sets.create({ kind: "fixed", nodes: ["a"], edges: [f.graph.edgeId(f.graph.counters()[0])], reading: "listed" });
        f.set(id);
        const seen = new Set<unknown>();
        // `store` is a tag naming what the entry was resolved against, not something it holds.
        const walked = f.cache.cached().reduce((sum, [, resolution]) => sum + reachableBytes({ ...resolution, store: null }, seen), 0);
        assert.strictEqual(f.cache.bytes, walked);
        assert.strictEqual(reachableBytes([...f.cache.summaries.values()]), 0);
    });

    it("never shares a bitmap between two entries", () => {
        const f = new Fixture();
        f.save("v", "visible");
        const direct = f.scope("visible");
        const named = f.scope({ set: "v" });
        const arrays = new Set<U32>([direct.nodes, direct.edges, named.nodes, named.edges]);
        assert.strictEqual(arrays.size, 4);
        assert.deepStrictEqual(nodeIds(direct, f.graph.snapshot()), nodeIds(named, f.graph.snapshot()));
    });
});

describe("the offer counts, input by input", () => {
    /**
     * An offering over the fixture: one partition run, `louv`, putting even node indices in group
     * 0 and odd ones in group 1, under the fixture's execution token.
     * @param f - The fixture.
     * @returns The offering.
     */
    function offeringOf(f: Fixture): Offering {
        const run = { id: "louv", label: "Louvain", result: { shape: "community" } as RunResult };

        return createOffering({
            run: (id) => (id === "louv" ? run : undefined),
            runs: () => [run],
            values: () => ({
                execution: f.executions.get("louv"),
                fields: [{ name: "group", kind: "node" }],
                nodeValue: (index: number) => index % 2,
                edgeValue: () => undefined,
            }),
            context: () => f.context(),
            sets: () => f.graph.sets.list(),
        });
    }

    /**
     * One audit row for the node counts: offer, change one input, offer again.
     * @param f - The fixture.
     * @param offering - Its offering.
     * @param change - The one input to change.
     * @returns Whether the second offer read the cached counts.
     */
    function countsServed(f: Fixture, offering: Offering, change: () => void): boolean {
        offering.offers("louv");
        const scans = offerCounters.nodeScans;
        offering.offers("louv");
        assert.strictEqual(offerCounters.nodeScans, scans, "nothing changed: a hit");
        change();
        offering.offers("louv");

        return offerCounters.nodeScans === scans;
    }

    it("misses on the execution token, the snapshot serial and the store", () => {
        const f = new Fixture();
        f.executions.set("louv", "n1.1");
        const offering = offeringOf(f);
        assert.isFalse(countsServed(f, offering, () => f.executions.set("louv", "n1.2")));
        assert.isFalse(countsServed(f, offering, () => f.graph.addNode("q")));
        assert.isFalse(countsServed(f, offering, () => (f.store = {})));
    });

    it("hits on an attribute revision, a mask version, a set write and another run's token", () => {
        const f = new Fixture();
        f.executions.set("louv", "n1.1");
        const offering = offeringOf(f);
        assert.isTrue(countsServed(f, offering, () => f.revisions.bump(["group"])));
        assert.isTrue(countsServed(f, offering, () => f.selected.add(2)));
        assert.isTrue(countsServed(f, offering, () => f.visibleNodes.delete(1)));
        assert.isTrue(countsServed(f, offering, () => f.graph.sets.create({ kind: "fixed", nodes: ["b"], reading: "induced" })));
        assert.isTrue(countsServed(f, offering, () => f.executions.set("pr", "n1.3")));
    });

    it("keeps the edge-count pass with its entry, and drops it when the execution moves", () => {
        const f = new Fixture();
        f.executions.set("louv", "n1.1");
        const offering = offeringOf(f);
        const passes = offerCounters.edgePasses;

        offering.countEdges("louv");
        offering.countEdges("louv");
        assert.strictEqual(offerCounters.edgePasses, passes + 1, "one pass per entry");
        assert.isDefined(offering.offers("louv").offers[0].edges);

        f.executions.set("louv", "n1.2");
        assert.isUndefined(offering.offers("louv").offers[0].edges, "the new execution has no pass yet");
        offering.countEdges("louv");
        assert.strictEqual(offerCounters.edgePasses, passes + 2);
    });
});

describe("the derived inputs, input by input", () => {
    /** a -> b -> c -> d, with a second a -> b so a merge policy has something to merge. */
    const graph = (): InputGraph =>
        new InputGraph(["a", "b", "c", "d"], [
            ["a", "b", 1],
            ["a", "b", 2],
            ["b", "c", 1],
            ["c", "d", 1],
        ]);

    /**
     * One audit row: derive, change one input of the key, derive again.
     * @param g - The graph.
     * @param first - The scope read first.
     * @param second - What is read second: a scope, an orientation and a merge policy.
     * @param second.scope - The scope.
     * @param second.orientation - The orientation.
     * @param second.simplify - The merge policy.
     * @returns Whether the second read was served the first read's input.
     */
    const same = (
        g: InputGraph,
        first: ResolvedInputScope,
        second: { scope?: ResolvedInputScope; orientation?: "declared" | "undirected"; simplify?: "sum" | "min" },
    ): boolean => {
        const inputs = new DerivedInputs();
        const holder = {};
        const read = (scope: ResolvedInputScope, orientation: "declared" | "undirected", simplify: "sum" | "min"): unknown =>
            createScopedInput(g.getDataManager(), orientation, { simplify }, { inputs, holder, scope: () => scope }).subgraph();
        const before = read(first, "declared", "sum");

        return read(second.scope ?? first, second.orientation ?? "declared", second.simplify ?? "sum") === before;
    };

    it("misses on the node bitmap, the edge bitmap, the orientation and the merge policy", () => {
        const g = graph();
        const scope = g.scope(["a", "b", "c"]);
        assert.isFalse(same(g, scope, { scope: g.scope(["a", "b", "d"]) }));
        assert.isFalse(same(g, scope, { scope: g.scope(["a", "b", "c"], (source) => source === "a") }));
        assert.isFalse(same(g, scope, { orientation: "undirected" }));
        assert.isFalse(same(g, scope, { simplify: "min" }));
    });

    it("misses on the store and on the snapshot serial", () => {
        const g = graph();
        const scope = g.scope(["a", "b", "c"]);
        const elsewhere = { graph: scope.graph, resolution: resolutionOver(scope.graph, scope.resolution.nodes, scope.resolution.edges, {}) };
        assert.isFalse(same(g, scope, { scope: elsewhere }));

        const inputs = new DerivedInputs();
        const holder = {};
        const before = createScopedInput(g.getDataManager(), "declared", undefined, { inputs, holder, scope: () => scope }).subgraph();
        g.add(["e"]);
        const after = g.scope(["a", "b", "c"]);
        assert.notStrictEqual(createScopedInput(g.getDataManager(), "declared", undefined, { inputs, holder, scope: () => after }).subgraph(), before);
    });

    it("hits on another resolution of the same members, whatever spelled it", () => {
        const g = graph();
        const scope = g.scope(["a", "b", "c"]);
        const respelled = { graph: scope.graph, resolution: resolutionOver(scope.graph, scope.resolution.nodes.slice(), scope.resolution.edges.slice(), g.store) };
        assert.isTrue(same(g, scope, { scope: respelled }));
    });
});
