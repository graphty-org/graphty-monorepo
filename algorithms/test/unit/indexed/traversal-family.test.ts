import { GraphBuilder, type GraphSnapshot, INVALID_INDEX, maskToIndices } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { accelerated, type AlgorithmAccelerator, type BfsResultLike } from "../../../src/index.js";
import * as indexed from "../../../src/indexed/index.js";
import { Graph } from "../../helpers/legacy-graph.js";
import { legacyArcOrder } from "../../helpers/to-snapshot.js";

/** A snapshot from an edge list over numeric ids 0..n-1, frozen with checksums. */
function snap(directed: boolean, n: number, edges: [number, number][]): GraphSnapshot {
    const b = new GraphBuilder({ directed });
    for (let i = 0; i < n; i++) {
        b.addNode(i);
    }
    for (const [u, v] of edges) {
        b.addEdge(u, v);
    }
    return b.freeze({ checksum: true });
}

describe("indexed.depthFirstSearch", () => {
    it("walks neighbours in index order and leaves an isolated node unvisited", () => {
        const s = snap(false, 5, [
            [0, 2],
            [0, 1],
            [1, 3],
            [2, 3],
        ]);
        const r = indexed.depthFirstSearch(s, 0);
        expect([...r.order]).toEqual([0, 1, 3, 2]);
        expect([...r.parent]).toEqual([INVALID_INDEX, 0, 3, 1, INVALID_INDEX]);
        expect([...r.depth]).toEqual([0, 1, 3, 2, INVALID_INDEX]);
        expect(r.visitedCount).toBe(4);
        expect([...indexed.depthFirstSearch(s, 0, { order: "post" }).order]).toEqual([2, 3, 1, 0]);
        s.validate({ checksum: true });
    });

    it("walks in-neighbours over reverse()", () => {
        const s = snap(true, 3, [
            [0, 1],
            [1, 2],
        ]);
        expect(indexed.depthFirstSearch(s, 2).visitedCount).toBe(1);
        expect([...indexed.depthFirstSearch(s.reverse(), 2).order]).toEqual([2, 1, 0]);
        s.validate({ checksum: true });
    });

    it("stops at the target in pre-order and ignores it in post-order", () => {
        const s = snap(true, 4, [
            [0, 1],
            [1, 2],
            [0, 3],
        ]);
        expect([...indexed.depthFirstSearch(s, 0, { target: 1 }).order]).toEqual([0, 1]);
        expect([...indexed.depthFirstSearch(s, 0, { target: 0 }).order]).toEqual([0]);
        expect([...indexed.depthFirstSearch(s, 0, { target: 1, order: "post" }).order]).toEqual([2, 1, 3, 0]);
        s.validate({ checksum: true });
    });

    it("walks a 200,000-node path without overflowing the call stack", () => {
        const n = 200_000;
        const edges: [number, number][] = [];
        for (let i = 1; i < n; i++) {
            edges.push([i - 1, i]);
        }
        const s = snap(true, n, edges);
        const r = indexed.depthFirstSearch(s, 0);
        expect(r.visitedCount).toBe(n);
        expect(r.depth[n - 1]).toBe(n - 1);
        expect(indexed.topologicalSort(s)?.[n - 1]).toBe(n - 1);
        expect(indexed.stronglyConnectedComponents(s).count).toBe(n);
        s.validate({ checksum: true });
    });
});

describe("indexed.hasCycle", () => {
    it("reads an undirected multigraph as simple: a parallel pair is no cycle, a self-loop is", () => {
        const pair = snap(false, 2, [
            [0, 1],
            [0, 1],
        ]);
        expect(indexed.hasCycle(pair)).toBe(false);
        expect(indexed.hasCycle(snap(false, 1, [[0, 0]]))).toBe(true);
        expect(
            indexed.hasCycle(
                snap(false, 3, [
                    [0, 1],
                    [1, 2],
                    [2, 0],
                ]),
            ),
        ).toBe(true);
        expect(indexed.hasCycle(snap(false, 0, []))).toBe(false);
        pair.validate({ checksum: true });
    });

    it("finds a directed cycle and a directed self-loop, and not a diamond", () => {
        expect(
            indexed.hasCycle(
                snap(true, 4, [
                    [0, 1],
                    [0, 2],
                    [1, 3],
                    [2, 3],
                ]),
            ),
        ).toBe(false);
        expect(indexed.hasCycle(snap(true, 2, [[1, 1]]))).toBe(true);
        expect(
            indexed.hasCycle(
                snap(true, 3, [
                    [2, 0],
                    [0, 1],
                    [1, 2],
                ]),
            ),
        ).toBe(true);
    });
});

describe("indexed.topologicalSort", () => {
    it("orders a DAG, returns null on a cycle and refuses an undirected graph", () => {
        const s = snap(true, 4, [
            [3, 1],
            [1, 0],
            [3, 2],
        ]);
        expect([...(indexed.topologicalSort(s) ?? [])]).toEqual([3, 2, 1, 0]);
        expect(indexed.topologicalSort(snap(true, 1, [[0, 0]]))).toBeNull();
        expect(() => indexed.topologicalSort(snap(false, 1, []))).toThrow("requires a directed graph");
        expect([...(indexed.topologicalSort(snap(true, 0, [])) ?? [1])]).toEqual([]);
        s.validate({ checksum: true });
    });
});

describe("indexed.isBipartite", () => {
    it("returns the second side as a mask, lowest index of each component on the first side", () => {
        const s = snap(false, 7, [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 0],
            [5, 4],
        ]);
        const r = indexed.isBipartite(s);
        expect(r.bipartite).toBe(true);
        expect([...maskToIndices(r.sides ?? new Uint32Array(1), s.nodeCount)]).toEqual([1, 3, 5]);
        s.validate({ checksum: true });
    });

    it("rejects an odd cycle and a self-loop, and accepts a parallel pair and the empty graph", () => {
        const triangle = snap(false, 3, [
            [0, 1],
            [1, 2],
            [2, 0],
        ]);
        expect(indexed.isBipartite(triangle)).toEqual({ bipartite: false, sides: null });
        expect(indexed.isBipartite(snap(false, 1, [[0, 0]])).bipartite).toBe(false);
        expect(
            indexed.isBipartite(
                snap(false, 2, [
                    [0, 1],
                    [1, 0],
                ]),
            ).bipartite,
        ).toBe(true);
        expect(indexed.isBipartite(snap(false, 0, [])).bipartite).toBe(true);
    });
});

describe("indexed.stronglyConnectedComponents and indexed.condensation", () => {
    function twoCyclesAndATail(): GraphSnapshot {
        // {0, 1} and {2, 3} are cycles, 0 -> 2 joins them twice over, 4 hangs off 3.
        return snap(true, 5, [
            [0, 1],
            [1, 0],
            [0, 2],
            [0, 2],
            [1, 3],
            [2, 3],
            [3, 2],
            [3, 4],
        ]);
    }

    it("labels components in completion order", () => {
        const s = twoCyclesAndATail();
        const r = indexed.stronglyConnectedComponents(s);
        expect(r.count).toBe(3);
        expect([...r.labels]).toEqual([2, 2, 1, 1, 0]);
        s.validate({ checksum: true });
    });

    it("condenses to one edge per connected ordered pair of components", () => {
        const s = twoCyclesAndATail();
        const { components, condensed } = indexed.condensation(s);
        const d = condensed.snapshot;
        expect(d.nodeCount).toBe(3);
        expect(d.selfLoopCount).toBe(0);
        const el = d.edgeList();
        expect(
            Array.from({ length: d.edgeCount }, (_, e) => `${String(el.src[e])}->${String(el.dst[e])}`).sort(),
        ).toEqual(["1->0", "2->1"]);
        expect([...(condensed.nodeRemap ?? [])]).toEqual([...components.labels]);
        expect([...(condensed.blockSizes ?? [])]).toEqual([1, 2, 2]);
        s.validate({ checksum: true });
        d.validate();
    });

    it("refuses an undirected graph", () => {
        const s = snap(false, 2, [[0, 1]]);
        expect(() => indexed.stronglyConnectedComponents(s)).toThrow("require a directed graph");
        expect(() => indexed.condensation(s)).toThrow("require a directed graph");
    });
});

describe("indexed.breadthFirstSearch target", () => {
    it("stops when the target leaves the queue, keeping every node discovered by then", () => {
        const s = snap(false, 5, [
            [0, 1],
            [0, 2],
            [1, 3],
            [2, 4],
        ]);
        const r = indexed.breadthFirstSearch(s, 0, { target: 1 });
        expect([...r.order]).toEqual([0, 1, 2]);
        expect(r.depth[3]).toBe(INVALID_INDEX);
        expect(indexed.breadthFirstSearch(s, 0, { target: 0 }).visitedCount).toBe(1);
        s.validate({ checksum: true });
    });

    it("runs the CPU port through the dispatcher when a target is set", async () => {
        const s = snap(true, 3, [
            [0, 1],
            [1, 2],
        ]);
        const calls: number[] = [];
        const sentinel: BfsResultLike = {
            order: new Uint32Array(0),
            parent: new Uint32Array(0),
            depth: new Uint32Array(0),
            visitedCount: 0,
        };
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            breadthFirstSearch: (_s, source) => {
                calls.push(source);
                return Promise.resolve(sentinel);
            },
        };
        const d = accelerated(fake);
        expect(await d.breadthFirstSearch(s, 0)).toBe(sentinel);
        const targeted = await d.breadthFirstSearch(s, 0, { target: 1 });
        expect(calls).toEqual([0]);
        expect([...targeted.order]).toEqual([0, 1]);
        s.validate({ checksum: true });
    });
});

describe("indexed.directionOptimizedBfs", () => {
    it("lists levels in ascending order and picks the lowest-index frontier parent", () => {
        const s = snap(true, 6, [
            [0, 3],
            [0, 1],
            [1, 5],
            [3, 5],
            [3, 4],
        ]);
        for (const alpha of [Number.MIN_VALUE, 15, Number.MAX_VALUE]) {
            const r = indexed.directionOptimizedBfs(s, 0, { alpha, beta: Number.MAX_VALUE });
            expect([...r.order]).toEqual([0, 1, 3, 4, 5]);
            expect([...r.parent]).toEqual([INVALID_INDEX, 0, INVALID_INDEX, 0, 3, 1]);
            expect([...r.depth]).toEqual([0, 1, INVALID_INDEX, 1, 2, 2]);
        }
        s.validate({ checksum: true });
    });
});

describe("traversal input checks", () => {
    // 0 -> 1, 0 -> 2: node 0 owns arcs 0 and 1.
    const s = snap(true, 3, [
        [0, 1],
        [0, 2],
    ]);

    it("rejects a start or a target that is not a node index", () => {
        expect(() => indexed.breadthFirstSearch(s, 3)).toThrow(RangeError);
        expect(() => indexed.depthFirstSearch(s, -1)).toThrow(RangeError);
        expect(() => indexed.directionOptimizedBfs(s, 1.5)).toThrow(RangeError);
        expect(() => indexed.breadthFirstSearch(s, 0, { target: 99 })).toThrow("target node index 99");
        expect(() => indexed.depthFirstSearch(s, 0, { target: 99 })).toThrow("target node index 99");
    });

    it("rejects an arcOrder of the wrong length, with a foreign arc, or with a repeated arc", () => {
        expect(() => indexed.breadthFirstSearch(s, 0, { arcOrder: new Uint32Array([0]) })).toThrow("expected 2");
        expect(() => indexed.depthFirstSearch(s, 0, { arcOrder: new Uint32Array([0, 2]) })).toThrow(
            "is not an arc of node 0",
        );
        const repeated = new Uint32Array([0, 0]);
        expect(() => indexed.breadthFirstSearch(s, 0, { arcOrder: repeated })).toThrow("repeats an arc");
        expect(() => indexed.depthFirstSearch(s, 0, { arcOrder: repeated })).toThrow("repeats an arc");
        expect(() => indexed.topologicalSort(s, { arcOrder: repeated })).toThrow("repeats an arc");
        expect(() => indexed.stronglyConnectedComponents(s, { arcOrder: repeated })).toThrow("repeats an arc");
        expect(() => indexed.condensation(s, { arcOrder: repeated })).toThrow("repeats an arc");
        const reversed = indexed.breadthFirstSearch(s, 0, { arcOrder: new Uint32Array([1, 0]) });
        expect([...reversed.order]).toEqual([0, 2, 1]);
        s.validate({ checksum: true });
    });

    it("runs the CPU port through the dispatcher when an arcOrder is set", async () => {
        const calls: number[] = [];
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            breadthFirstSearch: (_s, source) => {
                calls.push(source);
                return Promise.reject(new Error("the accelerator cannot follow an arcOrder"));
            },
        };
        const r = await accelerated(fake).breadthFirstSearch(s, 0, { arcOrder: new Uint32Array([1, 0]) });
        expect(calls).toEqual([]);
        expect([...r.order]).toEqual([0, 2, 1]);
    });
});

describe("indexed.condensation weights", () => {
    it("gives each condensed edge the weight of the first source edge of its pair", () => {
        const b = new GraphBuilder({ directed: true });
        b.addEdge(0, 1, 5);
        b.addEdge(0, 1, 9);
        b.addEdge(1, 2, 7);
        const s = b.freeze({ checksum: true });
        const d = indexed.condensation(s).condensed.snapshot;
        const el = d.edgeList();
        const weighted = Array.from(
            { length: d.edgeCount },
            (_, e) => `${String(el.src[e])}->${String(el.dst[e])}:${String(el.weights?.[e])}`,
        );
        // Components complete as 2, 1, 0, so node 0 is component 2.
        expect(weighted.sort()).toEqual(["1->0:7", "2->1:5"]);
        s.validate({ checksum: true });
    });
});

describe("legacyArcOrder", () => {
    it("refuses a snapshot whose last row holds an arc the graph does not", () => {
        const graph = new Graph({ directed: false });
        graph.addEdge("a", "b");
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b");
        b.addEdge("b", "c");
        expect(() => legacyArcOrder(graph, b.freeze())).toThrow("does not hold this graph's nodes and neighbours");
    });

    it("refuses a snapshot that numbers the graph's nodes in another order", () => {
        const graph = new Graph({ directed: false });
        graph.addEdge("b", "a");
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b");
        expect(() => legacyArcOrder(graph, b.freeze())).toThrow("does not hold this graph's nodes and neighbours");
    });
});
