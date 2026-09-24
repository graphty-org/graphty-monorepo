import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { cycleGraph } from "../../src/generators/classic.js";
import {
    addPathologicalEdges,
    EDGE_CASE_NAMES,
    edgeCaseGraph,
    type EdgeCaseName,
    randomMultigraph,
} from "../../src/generators/variants.js";
import { type SampleGraph } from "../../src/types.js";
import { componentCount, expectSameGraph, fullGraphHash, graphHash, pairs } from "../helpers/graph.js";

/**
 * The number of self-loops.
 * @param g - the graph
 * @returns the count
 */
function selfLoops(g: SampleGraph): number {
    return pairs(g).filter(([u, v]) => u === v).length;
}

/**
 * Naive Bellman-Ford from `source` over a directed weighted graph.
 * @param g - the graph (weights required)
 * @param source - the source node
 * @returns the distances, or null when a negative cycle is reachable
 */
function bellmanFord(g: SampleGraph, source: number): number[] | null {
    const w = g.weights as Float32Array;
    const dist = new Array<number>(g.nodeCount).fill(Infinity);
    dist[source] = 0;
    for (let round = 0; round < g.nodeCount; round++) {
        let changed = false;
        for (let e = 0; e < g.src.length; e++) {
            const d = dist[g.src[e]] + w[e];
            if (d < dist[g.dst[e]]) {
                dist[g.dst[e]] = d;
                changed = true;
            }
        }
        if (!changed) {
            return dist;
        }
    }
    return null;
}

describe("randomMultigraph", () => {
    it("draws m independent uniform pairs, keeping loops and repeats", () => {
        const g = randomMultigraph({ n: 20, m: 5000, seed: 1 });
        expect(g.directed).toBe(false);
        expect(g.nodeCount).toBe(20);
        expect(g.src.length).toBe(5000);
        expect(Math.max(...g.src, ...g.dst)).toBe(19);
        // an edge is a self-loop with probability 1/20: about 250 of them
        expect(selfLoops(g)).toBeGreaterThan(180);
        expect(selfLoops(g)).toBeLessThan(330);
        const snapshot = fromEdgeArrays(g);
        expect(snapshot.edgeCount).toBe(5000);
        expect(snapshot.selfLoopCount).toBe(selfLoops(g));
    });

    it("can forbid self-loops and be directed", () => {
        const g = randomMultigraph({ n: 3, m: 3000, directed: true, selfLoops: false, seed: 2 });
        expect(g.directed).toBe(true);
        expect(selfLoops(g)).toBe(0);
        const counts = new Map<string, number>();
        for (const [u, v] of pairs(g)) {
            counts.set(`${u}-${v}`, (counts.get(`${u}-${v}`) ?? 0) + 1);
        }
        expect(counts.size).toBe(6);
        for (const c of counts.values()) {
            expect(c).toBeGreaterThan(400);
            expect(c).toBeLessThan(600);
        }
    });

    it("builds a million edges, rejects bad options and is deterministic", () => {
        expect(randomMultigraph({ n: 100_000, m: 1_000_000, seed: 1 }).src.length).toBe(1_000_000);
        expect(randomMultigraph({ n: 5, m: 0 }).src.length).toBe(0);
        expect(() => randomMultigraph({ n: 0, m: 1 })).toThrow(/n must/);
        expect(() => randomMultigraph({ n: 1, m: 1, selfLoops: false })).toThrow(/selfLoops/);
        expect(() => randomMultigraph({ n: 5, m: -1 })).toThrow(/m must/);
        expectSameGraph(randomMultigraph({ n: 50, m: 100 }), randomMultigraph({ n: 50, m: 100, seed: 0 }));
        expect(graphHash(randomMultigraph({ n: 50, m: 100, seed: 1 }))).not.toBe(
            graphHash(randomMultigraph({ n: 50, m: 100, seed: 2 })),
        );
    });
});

describe("addPathologicalEdges", () => {
    const base: SampleGraph = {
        directed: true,
        nodeCount: 6,
        src: new Uint32Array([0, 1, 2, 3, 4]),
        dst: new Uint32Array([1, 2, 3, 4, 5]),
        weights: new Float32Array([1.5, 2.5, 3.5, 4.5, 5.5]),
        ids: ["a", "b", "c", "d", "e", "f"],
        nodeColumns: { community: new Uint32Array([0, 0, 0, 1, 1, 1]) },
    };

    it("appends self-loops, parallel copies and reversed copies, in that order", () => {
        const g = addPathologicalEdges(base, { selfLoops: 3, parallelEdges: 4, antiParallelEdges: 2, seed: 1 });
        expect(g.src.length).toBe(5 + 3 + 4 + 2);
        expect(Array.from(g.src.subarray(0, 5))).toEqual([0, 1, 2, 3, 4]);
        expect(g.ids).toBe(base.ids);
        expect(g.nodeColumns).toBe(base.nodeColumns);
        expect(g.directed).toBe(true);
        const w = g.weights as Float32Array;
        const original = new Map(pairs(base).map(([u, v], e) => [`${u}-${v}`, base.weights?.[e]]));
        for (let e = 5; e < 8; e++) {
            expect(g.src[e]).toBe(g.dst[e]);
            expect(w[e]).toBe(1);
        }
        for (let e = 8; e < 12; e++) {
            expect(w[e]).toBe(original.get(`${g.src[e]}-${g.dst[e]}`));
        }
        for (let e = 12; e < 14; e++) {
            expect(w[e]).toBe(original.get(`${g.dst[e]}-${g.src[e]}`));
        }
        const snapshot = fromEdgeArrays(g);
        expect(snapshot.edgeCount).toBe(14);
        expect(snapshot.selfLoopCount).toBe(3);
    });

    it("works on unweighted undirected graphs and leaves the input alone", () => {
        const ring = cycleGraph({ n: 10 });
        const before = graphHash(ring);
        const g = addPathologicalEdges(ring, { selfLoops: 2, parallelEdges: 2, seed: 3 });
        expect(g.weights).toBeUndefined();
        expect(g.src.length).toBe(14);
        expect(selfLoops(g)).toBe(2);
        expect(graphHash(ring)).toBe(before);
        expect(fromEdgeArrays(g).selfLoopCount).toBe(2);
        expect(graphHash(addPathologicalEdges(ring, {}))).toBe(before);
    });

    it("rejects impossible requests and is deterministic", () => {
        const ring = cycleGraph({ n: 10 });
        expect(() => addPathologicalEdges(ring, { antiParallelEdges: 1 })).toThrow(/directed/);
        expect(() => addPathologicalEdges(ring, { selfLoops: -1 })).toThrow(/selfLoops/);
        const empty: SampleGraph = { directed: true, nodeCount: 0, src: new Uint32Array(0), dst: new Uint32Array(0) };
        expect(() => addPathologicalEdges(empty, { selfLoops: 1 })).toThrow(/node/);
        expect(() => addPathologicalEdges(empty, { parallelEdges: 1 })).toThrow(/edge/);
        expect(() => addPathologicalEdges(empty, { antiParallelEdges: 1 })).toThrow(/edge/);
        const opts = { selfLoops: 2, parallelEdges: 3, antiParallelEdges: 3 };
        expect(fullGraphHash(addPathologicalEdges(base, opts))).toBe(
            fullGraphHash(addPathologicalEdges(base, { ...opts, seed: 0 })),
        );
        expect(graphHash(addPathologicalEdges(base, { ...opts, seed: 1 }))).not.toBe(
            graphHash(addPathologicalEdges(base, { ...opts, seed: 2 })),
        );
    });
});

describe("edge-case pack", () => {
    it("has unique names, and every case loads into graph-format with default options", () => {
        expect(new Set(EDGE_CASE_NAMES).size).toBe(EDGE_CASE_NAMES.length);
        for (const name of EDGE_CASE_NAMES) {
            const g = edgeCaseGraph(name);
            const snapshot = fromEdgeArrays(g);
            expect(snapshot.nodeCount, name).toBe(g.nodeCount);
            expect(snapshot.edgeCount, name).toBe(g.src.length);
            expect(snapshot.selfLoopCount, name).toBe(selfLoops(g));
            expect(g.weights === undefined || g.weights.length === g.src.length, name).toBe(true);
        }
    });

    it("returns fresh arrays on every call", () => {
        const a = edgeCaseGraph("disconnected");
        a.src[0] = 9;
        expect(edgeCaseGraph("disconnected").src[0]).toBe(0);
    });

    it("builds each case as documented", () => {
        const counts = (name: EdgeCaseName): [number, number] => {
            const g = edgeCaseGraph(name);
            return [g.nodeCount, g.src.length];
        };
        expect(counts("empty")).toEqual([0, 0]);
        expect(counts("single-node")).toEqual([1, 0]);
        expect(counts("single-self-loop")).toEqual([1, 1]);
        expect(counts("isolated-nodes")).toEqual([10, 0]);
        expect(componentCount(edgeCaseGraph("disconnected"))).toBe(3 + 2);
        expect(counts("star-100k")).toEqual([100_001, 100_000]);
        expect(counts("path-100k")).toEqual([100_000, 99_999]);
        expect(componentCount(edgeCaseGraph("path-100k"))).toBe(1);
        expect(counts("max-node-index")[0]).toBe(2 ** 20);
        expect(Math.max(...edgeCaseGraph("max-node-index").dst)).toBe(2 ** 20 - 1);
        const dup = edgeCaseGraph("duplicate-heavy");
        expect(new Set(pairs(dup).map(([u, v]) => `${u}-${v}`)).size).toBe(1);
        expect(dup.src.length).toBe(1000);
        expect(Array.from(edgeCaseGraph("zero-weights").weights ?? [1]).every((w) => w === 0)).toBe(true);
    });

    it("carries the pathologies it names", () => {
        const u = edgeCaseGraph("pathological-undirected");
        expect(u.directed).toBe(false);
        expect(selfLoops(u)).toBeGreaterThan(0);
        const w = Array.from(u.weights ?? []);
        expect(w).toContain(0);
        expect(w.some((x) => x < 0)).toBe(true);
        expect(w.some((x) => !Number.isInteger(x))).toBe(true);
        const keys = pairs(u).map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`);
        expect(Math.max(...keys.map((k) => keys.filter((x) => x === k).length))).toBeGreaterThanOrEqual(3);

        const d = edgeCaseGraph("pathological-directed");
        expect(d.directed).toBe(true);
        expect(selfLoops(d)).toBeGreaterThan(0);
        const arcs = pairs(d).map(([a, b]) => `${a}-${b}`);
        expect(arcs.some((k, i) => arcs.indexOf(k) !== i)).toBe(true);
        expect(pairs(d).some(([a, b]) => a !== b && arcs.includes(`${b}-${a}`))).toBe(true);
        expect(Array.from(d.weights ?? [])).toContain(0);
        expect(bellmanFord(d, 0)).toBeNull();
    });

    it("gives shortest-path cases with known answers", () => {
        const dag = edgeCaseGraph("negative-weights");
        expect(dag.directed).toBe(true);
        expect(Array.from(dag.weights ?? []).some((x) => x < 0)).toBe(true);
        expect(bellmanFord(dag, 0)).toEqual([0, 4, 1, 4, 3]);
        const cycle = edgeCaseGraph("negative-cycle");
        expect(bellmanFord(cycle, 0)).toBeNull();
    });

    it("rejects an unknown name", () => {
        expect(() => edgeCaseGraph("nope" as EdgeCaseName)).toThrow(RangeError);
    });
});

/**
 * GOLDEN VALUES: a full hash of the seeded structural variants. A change here means seeded graphs
 * changed, which is a breaking change of the package -- never a test to update.
 */
describe("golden values", () => {
    it("randomMultigraph", () => {
        expect(fullGraphHash(randomMultigraph({ n: 50, m: 300, directed: true, seed: 1 }))).toMatchInlineSnapshot(
            `"4d3278e8"`,
        );
    });
    it("addPathologicalEdges", () => {
        expect(
            fullGraphHash(
                addPathologicalEdges(
                    { directed: true, nodeCount: 4, src: new Uint32Array([0, 1, 2]), dst: new Uint32Array([1, 2, 3]) },
                    { selfLoops: 2, parallelEdges: 2, antiParallelEdges: 2, seed: 1 },
                ),
            ),
        ).toMatchInlineSnapshot(`"b25c4fa1"`);
    });
});
