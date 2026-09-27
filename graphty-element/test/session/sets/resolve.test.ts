/**
 * @file Bitmap resolution of every Scope form and of fixed induced sets
 * (design/sets/sets-design.md sections 4.1, 4.2, 6.1 and 6.3), and its work counts.
 */

import { fromEdgeArrays, type GraphSnapshot, maskToIndices, type U32 } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import type { EdgeId, NodeId } from "../../../src/catalog/types";
import { createScopeApi, edgeSpaceOf, ElementMask, nodeSpaceOf } from "../../../src/session/scope/index";
import {
    type Resolution,
    type ResolveContext,
    resolveCounters,
    resolveFixed,
    resolveScope,
} from "../../../src/session/sets/resolve";
import { edgeBetween, type EdgeRow, type Harness, makeSession, type NodeRow } from "../helpers";

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

    it("puts an edge member's endpoints in the node half of an induced set", () => {
        const harness = harnessOf(ABC, PATH);
        const snapshot = harness.store.getSnapshot();

        const resolution = resolveFixed(
            { kind: "fixed", nodes: ["a"], edges: [{ source: "c", target: "d", ordinal: 0, among: 1 }], reading: "induced" },
            { snapshot },
        );

        assert.deepStrictEqual(nodeIds(resolution, snapshot), ["a", "c", "d"]);
        assert.deepStrictEqual(edgeIds(resolution, snapshot), [edgeBetween(harness, "c", "d")]);
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
function workOf(run: (context: ResolveContext) => Resolution, snapshot: GraphSnapshot): { passes: number; rows: number; lookups: number; nodes: U32 } {
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

            const fixed = workOf((context) => resolveFixed({ kind: "fixed", nodes: members, reading: "induced" }, context), snapshot);
            assert.strictEqual(fixed.lookups, K);
            assert.strictEqual(fixed.passes, 1);
            assert.strictEqual(fixed.rows, snapshot.edgeCount, "one pass reads each edge row once");

            const listed = workOf((context) => resolveFixed({ kind: "fixed", nodes: members, reading: "listed" }, context), snapshot);
            assert.strictEqual(listed.lookups, K);
            assert.strictEqual(listed.passes, 0, "a listed node-only set derives no edges");
        });
    }
});
