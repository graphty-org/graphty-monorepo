import assert from "node:assert";

import { fromEdgeArrays, GraphFormatError, type GraphSnapshot, isGraphSnapshot } from "@graphty/graph-format";
import { describe, it } from "vitest";

import { toLayoutSnapshot } from "../../src/simulation";
import type { Graph, Node } from "../../src/types";

function triangle(): Graph {
    return {
        nodes: () => ["a", "b", "c"],
        edges: () => [
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
        ],
    };
}

function weightedTriangle(): Graph {
    const w = new Map<string, number>([
        ["a|b", 2],
        ["b|c", 3],
        ["c|a", 4],
    ]);
    return {
        ...triangle(),
        getEdgeData: (source: Node, target: Node, attr: string) =>
            attr === "w" ? w.get(`${String(source)}|${String(target)}`) : undefined,
    };
}

function directedPath() {
    return fromEdgeArrays({
        directed: true,
        nodeCount: 3,
        src: Uint32Array.from([0, 1]),
        dst: Uint32Array.from([1, 2]),
    });
}

/** A triangle whose getEdgeData answers "w" with whatever `values` holds: the legacy results the Graph type does not admit. */
function legacyTriangle(values: Record<string, unknown>): Graph {
    const getEdgeData = (source: Node, target: Node, attr: string): unknown =>
        attr === "w" ? values[`${String(source)}|${String(target)}`] : undefined;
    return { ...triangle(), getEdgeData: getEdgeData as Graph["getEdgeData"] };
}

/** The weight of every logical edge in addEdge order (1 everywhere when the snapshot is unweighted). */
function edgeWeights(s: GraphSnapshot): number[] {
    const { weights } = s;
    return Array.from({ length: s.edgeCount }, (_, e) => (weights === null ? 1 : weights[s.edgeToArc[e]]));
}

describe("toLayoutSnapshot", () => {
    it("walks a duck-typed graph once: ids in nodes() order, both arcs per edge, no weights", () => {
        const G = triangle();
        const s = toLayoutSnapshot(G);
        assert.ok(isGraphSnapshot(s));
        assert.equal(s.directed, false);
        assert.equal(s.nodeCount, 3);
        assert.equal(s.arcCount, 6);
        assert.deepEqual([s.ids.idOf(0), s.ids.idOf(1), s.ids.idOf(2)], G.nodes());
        assert.equal(s.weights, null);
    });
    it("returns the cached snapshot for the same duck-typed object", () => {
        const G = triangle();
        const first = toLayoutSnapshot(G);
        assert.equal(toLayoutSnapshot(G), first);
        assert.notEqual(toLayoutSnapshot(triangle()), first, "a different object is walked on its own");
    });
    it("reads weights through getEdgeData when weightAttr is given", () => {
        const s = toLayoutSnapshot(weightedTriangle(), "w");
        assert.notEqual(s.weights, null);
        assert.equal(s.nodeCount, 3);
        assert.equal(s.arcCount, 6);
    });
    it("leaves a weighted duck graph unweighted when weightAttr is null", () => {
        assert.equal(toLayoutSnapshot(weightedTriangle()).weights, null);
        assert.equal(toLayoutSnapshot(weightedTriangle(), null).weights, null);
    });
    it("keys the cache by (object, weightAttr): the same duck object laid out unweighted and then through w", () => {
        const G = weightedTriangle();
        const unweighted = toLayoutSnapshot(G);
        const weighted = toLayoutSnapshot(G, "w");
        assert.notEqual(weighted, unweighted, "two snapshots, not one");
        assert.equal(unweighted.weights, null);
        assert.notEqual(weighted.weights, null, "the second is weighted");
        assert.deepEqual(edgeWeights(weighted), [2, 3, 4]);
        assert.equal(toLayoutSnapshot(G, "w"), weighted, "a repeat call through w returns the cached second");
        assert.equal(toLayoutSnapshot(G), unweighted, "and the unweighted one stays cached beside it");
    });
    it("leaves an edge unweighted when getEdgeData returns null", () => {
        const allNull = toLayoutSnapshot(legacyTriangle({ "a|b": null, "b|c": null, "c|a": null }), "w");
        assert.equal(allNull.weights, null, "null on every edge is an unweighted snapshot");
        const mixed = toLayoutSnapshot(legacyTriangle({ "a|b": 2, "b|c": null, "c|a": 4 }), "w");
        assert.notEqual(mixed.weights, null);
        assert.deepEqual(edgeWeights(mixed), [2, 1, 4], "the null edge carries the default weight 1");
    });
    it("coerces a numeric string from getEdgeData with Number()", () => {
        const s = toLayoutSnapshot(legacyTriangle({ "a|b": "2.5", "b|c": "3", "c|a": 4 }), "w");
        assert.notEqual(s.weights, null);
        assert.deepEqual(edgeWeights(s), [2.5, 3, 4]);
    });
    it("lets the builder reject a non-numeric string from getEdgeData as E_INVALID_WEIGHT", () => {
        assert.throws(
            () => toLayoutSnapshot(legacyTriangle({ "a|b": "heavy", "b|c": 3, "c|a": 4 }), "w"),
            (error: unknown) => error instanceof GraphFormatError && error.code === "E_INVALID_WEIGHT",
        );
    });
    it("turns a node list into an edgeless snapshot", () => {
        const nodes: Node[] = ["x", "y", 3];
        const s = toLayoutSnapshot(nodes);
        assert.equal(s.nodeCount, 3);
        assert.equal(s.arcCount, 0);
        assert.deepEqual([s.ids.idOf(0), s.ids.idOf(1), s.ids.idOf(2)], nodes);
        assert.equal(toLayoutSnapshot(nodes), s, "cached per list object");
    });
    it("derives one undirected snapshot from a directed one and reuses it", () => {
        const directed = directedPath();
        const s = toLayoutSnapshot(directed);
        assert.notEqual(s, directed);
        assert.equal(s.directed, false);
        assert.equal(s.nodeCount, 3);
        assert.equal(s.arcCount, 4);
        assert.equal(toLayoutSnapshot(directed), s, "the same undirected copy on the second call");
    });
    it("returns an undirected snapshot as-is", () => {
        const undirected = fromEdgeArrays({
            directed: false,
            nodeCount: 3,
            src: Uint32Array.from([0, 1]),
            dst: Uint32Array.from([1, 2]),
        });
        assert.equal(toLayoutSnapshot(undirected), undirected);
        assert.equal(toLayoutSnapshot(undirected, "w"), undirected);
    });
});
