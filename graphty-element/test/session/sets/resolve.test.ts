/**
 * @file Bitmap resolution of every Scope form, of fixed sets (induced, and listed edge members
 * through the binding table) and of paths (design/sets/sets-design.md sections 4.1, 4.2, 4.4,
 * 6.1 and 6.3), and its work counts.
 */

import { fromEdgeArrays, type GraphSnapshot, maskToIndices, type U32 } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import type { EdgeId, NodeId, SetDefinition } from "../../../src/catalog/types";
import { createScopeApi, edgeSpaceOf, ElementMask, nodeSpaceOf } from "../../../src/session/scope/index";
import { resolvePath } from "../../../src/session/sets/path";
import {
    type Resolution,
    type ResolveContext,
    resolveCounters,
    resolveFixed,
    resolveScope,
} from "../../../src/session/sets/resolve";
import { edgeBetween, type EdgeRow, type Harness, makeSession, type NodeRow } from "../helpers";
import { TestGraph } from "./graphs";

/** A session with data in it. */
function harnessOf(nodes: readonly NodeRow[], edges: readonly EdgeRow[] = [], directed = false): Harness {
    const harness = makeSession({ directed });
    harness.add(nodes, edges);

    return harness;
}

/** The node ids a resolution holds, sorted. */
function nodeIds(resolution: Resolution, snapshot: GraphSnapshot): NodeId[] {
    return Array.from(maskToIndices(resolution.nodes, snapshot.nodeCount), (i) => snapshot.ids.idOf(i)).sort();
}

/** The edge ids a resolution holds, sorted. */
function edgeIds(resolution: Resolution, snapshot: GraphSnapshot): EdgeId[] {
    const space = edgeSpaceOf(snapshot);

    return Array.from(maskToIndices(resolution.edges, snapshot.edgeCount), (e) => space.idOf(e)).sort();
}

/** Every edge bit has both endpoint bits: the endpoint invariant. */
function assertEndpoints(resolution: Resolution, snapshot: GraphSnapshot): void {
    const nodes = new Set(maskToIndices(resolution.nodes, snapshot.nodeCount));
    for (const edge of maskToIndices(resolution.edges, snapshot.edgeCount)) {
        assert.isTrue(nodes.has(snapshot.edgeSource(edge)) && nodes.has(snapshot.edgeTarget(edge)), `edge ${edge}`);
    }
}

/** A byte mask over a snapshot's nodes holding the given ids. */
function nodeMask(snapshot: GraphSnapshot, ids: readonly NodeId[]): ElementMask<NodeId> {
    const space = nodeSpaceOf(snapshot);
    const mask = new ElementMask<NodeId>(() => space);
    mask.grow(snapshot.nodeCount);
    for (const id of ids) {
        mask.add(mask.indexOf(id));
    }

    return mask;
}

/** A byte mask over a snapshot's edges holding the given edge ids. */
function edgeMask(snapshot: GraphSnapshot, ids: readonly EdgeId[]): ElementMask<EdgeId> {
    const space = edgeSpaceOf(snapshot);
    const mask = new ElementMask<EdgeId>(() => space);
    mask.grow(snapshot.edgeCount);
    for (const id of ids) {
        mask.add(mask.indexOf(id));
    }

    return mask;
}

const ABC = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
const PATH = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "c", dst: "d" },
];

describe("resolving the legacy scope forms to bitmaps", () => {
    it("packs the visible and selected byte masks once per mask version", () => {
        const harness = harnessOf(ABC, PATH);
        const snapshot = harness.store.getSnapshot();
        const visibleNodes = nodeMask(snapshot, ["a", "b", "c"]);
        const visibleEdges = edgeMask(snapshot, [edgeBetween(harness, "a", "b")]);
        const selected = nodeMask(snapshot, ["b"]);
        const context: ResolveContext = {
            snapshot,
            visibility: { nodes: () => visibleNodes, edges: () => visibleEdges },
            selection: { nodes: () => selected },
        };

        const before = resolveCounters.maskPacks;
        resolveScope("visible", context);
        resolveScope("selection", context);
        assert.strictEqual(resolveCounters.maskPacks - before, 3, "two visible masks and one selection mask");

        resolveScope("visible", context);
        resolveScope("selection", context);
        assert.strictEqual(resolveCounters.maskPacks - before, 3, "nothing moved, so nothing is packed again");

        selected.add(selected.indexOf("c"));
        const after = resolveScope("selection", context);
        assert.strictEqual(resolveCounters.maskPacks - before, 4, "a new selection version packs once");
        assert.deepStrictEqual(nodeIds(after, snapshot), ["b", "c"]);
        harness.session.dispose();
    });

    it("reads visible clipped: the visible edges between visible nodes", () => {
        const harness = harnessOf(ABC, PATH);
        const snapshot = harness.store.getSnapshot();
        const ab = edgeBetween(harness, "a", "b");
        const cd = edgeBetween(harness, "c", "d");
        const context: ResolveContext = {
            snapshot,
            visibility: {
                nodes: () => nodeMask(snapshot, ["a", "b", "c"]),
                // c-d is allowed by the edge filter but d is hidden; b-c is hidden by the filter.
                edges: () => edgeMask(snapshot, [ab, cd]),
            },
        };

        const resolution = resolveScope("visible", context);

        assert.deepStrictEqual(nodeIds(resolution, snapshot), ["a", "b", "c"]);
        assert.deepStrictEqual(edgeIds(resolution, snapshot), [ab]);
        assertEndpoints(resolution, snapshot);
        harness.session.dispose();
    });

    it("takes the largest weakly connected component, ties to the lowest label", async () => {
        // Directed a -> b <- c is one weak component of three; d -> e is two.
        const directed = harnessOf(
            [{ id: "d" }, { id: "e" }, { id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "d", dst: "e" },
                { src: "a", dst: "b" },
                { src: "c", dst: "b" },
            ],
            true,
        );
        const largest = await directed.session.scope.resolve("largest-component");
        assert.deepStrictEqual([...largest.nodes].sort(), ["a", "b", "c"]);
        directed.session.dispose();

        // Two components of two: the one holding the first node wins, every time.
        const tied = harnessOf(
            [{ id: "p" }, { id: "q" }, { id: "r" }, { id: "s" }],
            [
                { src: "r", dst: "s" },
                { src: "p", dst: "q" },
            ],
        );
        const first = await tied.session.scope.resolve("largest-component");
        assert.deepStrictEqual([...first.nodes].sort(), ["p", "q"]);
        tied.session.dispose();
    });

    it("ignores the listed ids the graph does not hold, and counts them", () => {
        const harness = harnessOf(ABC, PATH);
        const snapshot = harness.store.getSnapshot();

        const resolution = resolveScope({ nodes: ["a", "gone", "b", 99] }, { snapshot });

        assert.deepStrictEqual(nodeIds(resolution, snapshot), ["a", "b"]);
        assert.strictEqual(resolution.missingNodes, 2);
        assert.strictEqual(resolution.missingEdges, 0);
        assert.deepStrictEqual(edgeIds(resolution, snapshot), [edgeBetween(harness, "a", "b")]);
        assertEndpoints(resolution, snapshot);
        harness.session.dispose();
    });

    it("tags a resolution with the snapshot serial and the store", () => {
        const harness = harnessOf(ABC, PATH);
        const snapshot = harness.store.getSnapshot();

        const resolution = resolveScope("graph", { snapshot, store: harness.store });

        assert.strictEqual(resolution.serial, snapshot.serial);
        assert.strictEqual(resolution.store, harness.store);
        assert.strictEqual(resolution.nodeCount, 4);
        assert.strictEqual(resolution.edgeCount, 3);
        harness.session.dispose();
    });
});

describe("resolving a fixed set", () => {
    it("derives an induced set's edges from its nodes", () => {
        const harness = harnessOf(ABC, [...PATH, { src: "a", dst: "c" }, { src: "a", dst: "b" }]);
        const snapshot = harness.store.getSnapshot();

        const resolution = resolveFixed({ kind: "fixed", nodes: ["a", "b", "zz"], reading: "induced" }, { snapshot });

        assert.deepStrictEqual(nodeIds(resolution, snapshot), ["a", "b"]);
        assert.strictEqual(resolution.edgeCount, 2, "both parallel a-b edges");
        assert.strictEqual(resolution.missingNodes, 1);
        assertEndpoints(resolution, snapshot);
        harness.session.dispose();
    });

    it("leaves an induced set's edge members inert: one stray edge adds no node", () => {
        const harness = harnessOf(ABC, PATH);
        const snapshot = harness.store.getSnapshot();

        const resolution = resolveFixed(
            {
                kind: "fixed",
                nodes: ["a", "b"],
                edges: [{ source: "c", target: "d", ordinal: 0, among: 1 }],
                reading: "induced",
            },
            { snapshot },
        );

        assert.deepStrictEqual(nodeIds(resolution, snapshot), ["a", "b"]);
        assert.deepStrictEqual(edgeIds(resolution, snapshot), [edgeBetween(harness, "a", "b")]);
        assertEndpoints(resolution, snapshot);
        harness.session.dispose();
    });

    it("gives a node-only set read listed no edges", () => {
        const harness = harnessOf(ABC, PATH);
        const snapshot = harness.store.getSnapshot();

        const resolution = resolveFixed({ kind: "fixed", nodes: ["a", "b"], reading: "listed" }, { snapshot });

        assert.deepStrictEqual(nodeIds(resolution, snapshot), ["a", "b"]);
        assert.strictEqual(resolution.edgeCount, 0);
        harness.session.dispose();
    });
});

describe("the resolved scope is lazy", () => {
    it("builds nodes and edges on their first read only, with the same contents", () => {
        const harness = harnessOf(ABC, PATH);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        const before = resolveCounters.idSetBuilds;
        const resolved = scope.resolveNow({ nodes: ["a", "b"] });
        assert.strictEqual(resolved.nodeCount, 2);
        assert.strictEqual(resolved.edgeCount, 1);
        assert.strictEqual(resolveCounters.idSetBuilds - before, 0, "counting builds no set");

        const { nodes } = resolved;
        assert.strictEqual(resolveCounters.idSetBuilds - before, 1);
        assert.strictEqual(resolved.nodes, nodes, "a second read returns the set already built");
        assert.deepStrictEqual([...nodes].sort(), ["a", "b"]);
        assert.deepStrictEqual([...resolved.edges], [edgeBetween(harness, "a", "b")]);
        assert.strictEqual(resolveCounters.idSetBuilds - before, 2);
        harness.session.dispose();
    });

    it("reads a scope's node ids from the bitmap without building a set", () => {
        const harness = harnessOf(ABC, PATH);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        const before = resolveCounters.idSetBuilds;
        assert.deepStrictEqual([...scope.nodeIdsOf({ nodes: ["c", "a"] })].sort(), ["a", "c"]);
        assert.strictEqual(resolveCounters.idSetBuilds - before, 0);
        harness.session.dispose();
    });
});

/**
 * A ring of `n` numeric-id nodes, undirected.
 * @param n - The node count.
 * @returns The snapshot.
 */
function ring(n: number): GraphSnapshot {
    const src = new Uint32Array(n);
    const dst = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        src[i] = i;
        dst[i] = (i + 1) % n;
    }

    return fromEdgeArrays({ nodeCount: n, src, dst, directed: false });
}

/** The work one resolution does, counted. */
function workOf(
    run: (context: ResolveContext) => Resolution,
    snapshot: GraphSnapshot,
): { passes: number; rows: number; lookups: number; nodes: U32 } {
    let lookups = 0;
    const ids = {
        indexOf: (id: NodeId): number => {
            lookups++;
            return snapshot.ids.indexOf(id);
        },
    };
    const passes = resolveCounters.edgePasses;
    const rows = resolveCounters.edgeRowVisits;
    const resolution = run({ snapshot, ids });

    return {
        passes: resolveCounters.edgePasses - passes,
        rows: resolveCounters.edgeRowVisits - rows,
        lookups,
        nodes: resolution.nodes,
    };
}

describe("work counts at two sizes", () => {
    const K = 50;
    const members = Array.from({ length: K }, (_, i) => i * 3);

    for (const n of [1_000, 100_000]) {
        it(`at ${n} nodes: the graph walks no edge, a fixed set of ${K} ids makes ${K} lookups and one edge pass`, () => {
            const snapshot = ring(n);

            const whole = workOf((context) => resolveScope("graph", context), snapshot);
            assert.strictEqual(whole.passes, 0);
            assert.strictEqual(whole.rows, 0);
            assert.strictEqual(whole.lookups, 0);

            const fixed = workOf(
                (context) => resolveFixed({ kind: "fixed", nodes: members, reading: "induced" }, context),
                snapshot,
            );
            assert.strictEqual(fixed.lookups, K);
            assert.strictEqual(fixed.passes, 1);
            assert.strictEqual(fixed.rows, snapshot.edgeCount, "one pass reads each edge row once");

            const listed = workOf(
                (context) => resolveFixed({ kind: "fixed", nodes: members, reading: "listed" }, context),
                snapshot,
            );
            assert.strictEqual(listed.lookups, K);
            assert.strictEqual(listed.passes, 0, "a listed node-only set derives no edges");
        });
    }
});

describe("listed edge members bind through the binding table", () => {
    /** The counters a resolution's edge bits carry, ascending. */
    const countersOf = (graph: TestGraph, resolution: Resolution): number[] =>
        Array.from(maskToIndices(resolution.edges, graph.snapshot().edgeCount), (e) => graph.counterAt(e)).sort(
            (a, b) => a - b,
        );

    /** Three a-b edges and one b-c edge in one load, plus one session edge c-d. */
    function threeParallel(): { graph: TestGraph; ab: number[]; bc: number; cd: number } {
        const graph = new TestGraph();
        const [ab0, ab1, ab2, bc] = graph.load([
            { s: "a", t: "b" },
            { s: "a", t: "b" },
            { s: "a", t: "b" },
            { s: "b", t: "c" },
        ]);
        const [cd] = graph.load([{ s: "c", t: "d" }], { asLoad: false });

        return { graph, ab: [ab0, ab1, ab2], bc, cd };
    }

    it("binds unseeded members by identity: an ordinal member and a minted id", () => {
        const { graph, ab, cd } = threeParallel();
        const snapshot = graph.snapshot();
        const before = { ...resolveCounters };
        const resolution = resolveFixed(
            {
                kind: "fixed",
                nodes: [],
                edges: [
                    { source: "a", target: "b", ordinal: 1, among: 3 },
                    { id: `graphty:e${cd}`, source: "c", target: "d" },
                ],
                reading: "listed",
            },
            { snapshot },
        );

        assert.deepStrictEqual(countersOf(graph, resolution), [ab[1], cd]);
        assert.deepStrictEqual(nodeIds(resolution, snapshot), ["a", "b", "c", "d"]);
        assert.strictEqual(resolution.missingEdges, 0);
        assert.strictEqual(resolveCounters.identityPasses - before.identityPasses, 1);
        assert.strictEqual(resolveCounters.bindMerges - before.bindMerges, 0, "nothing seeded, nothing merged");
        assertEndpoints(resolution, snapshot);
    });

    it("binds seeded members by a linear merge when the edge-id column ascends", () => {
        const { graph, ab, bc } = threeParallel();
        const id = graph.sets.create({
            kind: "fixed",
            nodes: [],
            edges: [graph.edgeId(ab[2]), graph.edgeId(bc)],
            reading: "listed",
        });
        const record = graph.sets.get(id);
        assert.isDefined(record);
        const definition = record?.definition as Extract<SetDefinition, { kind: "fixed" }>;

        const before = { ...resolveCounters };
        const resolution = resolveFixed(definition, { snapshot: graph.snapshot() }, graph.setsStore.seedsOf(id));

        assert.deepStrictEqual(countersOf(graph, resolution), [ab[2], bc]);
        assert.strictEqual(resolveCounters.bindMerges - before.bindMerges, 1);
        assert.strictEqual(resolveCounters.bindSearches - before.bindSearches, 0);
        assert.strictEqual(
            resolveCounters.identityPasses - before.identityPasses,
            0,
            "every member was seeded and found",
        );
    });

    it("binds seeded members by binary search when the edge-id column does not ascend", () => {
        const { graph, ab, bc, cd } = threeParallel();
        const id = graph.sets.create({
            kind: "fixed",
            nodes: [],
            edges: [graph.edgeId(ab[0]), graph.edgeId(cd)],
            reading: "listed",
        });
        const definition = graph.sets.get(id)?.definition as Extract<SetDefinition, { kind: "fixed" }>;
        // Rebuilt with the edges shuffled: the restored counters no longer ascend with the row.
        for (let seed = 1; ; seed++) {
            graph.rebuildEmbedded(seed);
            const column = graph.snapshot().edges.requireTyped("graphty.edgeId", "u32").data;
            if (column.some((value, e) => e > 0 && value < column[e - 1])) {
                break;
            }
        }

        const before = { ...resolveCounters };
        const resolution = resolveFixed(definition, { snapshot: graph.snapshot() }, graph.setsStore.seedsOf(id));

        assert.deepStrictEqual(countersOf(graph, resolution), [ab[0], cd]);
        assert.strictEqual(resolveCounters.bindSearches - before.bindSearches, 1);
        assert.strictEqual(resolveCounters.bindMerges - before.bindMerges, 0);
        assert.notInclude(countersOf(graph, resolution), bc);
    });

    it("counts a member two edges carry as missing and ambiguous, and binds neither", () => {
        const graph = new TestGraph();
        graph.load([{ s: "a", t: "b" }]);
        graph.load([{ s: "a", t: "b" }]);
        const resolution = resolveFixed(
            {
                kind: "fixed",
                nodes: [],
                edges: [{ source: "a", target: "b", ordinal: 0, among: 1 }],
                reading: "listed",
            },
            { snapshot: graph.snapshot() },
        );

        assert.strictEqual(resolution.edgeCount, 0);
        assert.strictEqual(resolution.missingEdges, 1);
        assert.strictEqual(resolution.ambiguousEdges, 1);
    });

    it("keeps a seeded twin bound to the edge it was added through", () => {
        const graph = new TestGraph();
        const [first] = graph.load([{ s: "a", t: "b" }]);
        const id = graph.sets.create({ kind: "fixed", nodes: [], edges: [graph.edgeId(first)], reading: "listed" });
        graph.load([{ s: "a", t: "b" }]);
        const definition = graph.sets.get(id)?.definition as Extract<SetDefinition, { kind: "fixed" }>;

        const resolution = resolveFixed(definition, { snapshot: graph.snapshot() }, graph.setsStore.seedsOf(id));
        assert.deepStrictEqual(countersOf(graph, resolution), [first]);
        assert.strictEqual(resolution.missingEdges, 0);

        graph.removeEdge(first);
        const gone = resolveFixed(definition, { snapshot: graph.snapshot() }, graph.setsStore.seedsOf(id));
        // Its own edge is gone; the one edge left carrying its identity is the twin, and the
        // identity rule binds exactly what it names.
        assert.strictEqual(gone.edgeCount, 1);
        assert.strictEqual(gone.missingEdges, 0);
    });
});

describe("paths", () => {
    /** a-b twice, b-a once, b-c once, c-d once, all one load, in a store declared directed. */
    function walkGraph(): { graph: TestGraph; ab: number[]; ba: number; bc: number; cd: number } {
        const graph = new TestGraph(true);
        const [ab0, ab1, ba, bc, cd] = graph.load([
            { s: "a", t: "b" },
            { s: "a", t: "b" },
            { s: "b", t: "a" },
            { s: "b", t: "c" },
            { s: "c", t: "d" },
        ]);

        return { graph, ab: [ab0, ab1], ba, bc, cd };
    }

    const countersOf = (graph: TestGraph, resolution: Resolution): number[] =>
        Array.from(maskToIndices(resolution.edges, graph.snapshot().edgeCount), (e) => graph.counterAt(e)).sort(
            (a, b) => a - b,
        );

    it("resolves distinct nodes and the named edges, a null step every edge between the pair", () => {
        const { graph, ab, ba, bc } = walkGraph();
        const snapshot = graph.snapshot();
        const resolution = resolvePath(
            {
                kind: "path",
                nodes: ["a", "b", "a", "b", "c"],
                edges: [
                    { source: "a", target: "b", ordinal: 1, among: 2 },
                    null,
                    [{ source: "a", target: "b", ordinal: 0, among: 2 }],
                    null,
                ],
            },
            { snapshot },
        );

        assert.deepStrictEqual(nodeIds(resolution, snapshot), ["a", "b", "c"]);
        // Step 2 (b to a, null) takes every edge between the pair, in both directions.
        assert.deepStrictEqual(
            countersOf(graph, resolution),
            [ab[0], ab[1], ba, bc].sort((x, y) => x - y),
        );
        assert.strictEqual(resolution.missingEdges, 0);
        assertEndpoints(resolution, snapshot);
    });

    it("takes only forward edges when directed", () => {
        const { graph, ab, bc } = walkGraph();
        const resolution = resolvePath(
            { kind: "path", nodes: ["a", "b", "c"], directed: true },
            { snapshot: graph.snapshot() },
        );
        assert.deepStrictEqual(countersOf(graph, resolution), [ab[0], ab[1], bc]);

        // A named edge against its step is not walked, so that step is missing.
        const against = resolvePath(
            {
                kind: "path",
                nodes: ["a", "b"],
                edges: [{ source: "b", target: "a", ordinal: 0, among: 1 }],
                directed: true,
            },
            { snapshot: graph.snapshot() },
        );
        assert.strictEqual(against.edgeCount, 0);
        assert.strictEqual(against.missingEdges, 1);
    });

    it("counts a step whose edges are all gone as missing, and a missing node once", () => {
        const { graph, ab, cd } = walkGraph();
        const definition: SetDefinition = {
            kind: "path",
            nodes: ["a", "b", "c", "d", "zz", "d"],
            edges: [
                [
                    { source: "a", target: "b", ordinal: 0, among: 2 },
                    { source: "a", target: "b", ordinal: 1, among: 2 },
                ],
                null,
                null,
                null,
                null,
            ],
        };
        graph.removeEdge(ab[0]);
        let resolution = resolvePath(definition, { snapshot: graph.snapshot() });
        assert.strictEqual(
            resolution.missingEdges,
            2,
            "one of the group is left; the two steps through zz are missing",
        );
        assert.strictEqual(resolution.missingNodes, 1);
        assert.include(countersOf(graph, resolution), cd);

        graph.removeEdge(ab[1]);
        resolution = resolvePath(definition, { snapshot: graph.snapshot() });
        assert.strictEqual(resolution.missingEdges, 3, "now the whole group is gone too");
    });

    it("gives a one-node path its node and no steps", () => {
        const { graph } = walkGraph();
        const resolution = resolvePath({ kind: "path", nodes: ["c"] }, { snapshot: graph.snapshot() });
        assert.strictEqual(resolution.nodeCount, 1);
        assert.strictEqual(resolution.edgeCount, 0);
        assert.strictEqual(resolution.missingEdges, 0);
    });
});
