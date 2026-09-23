import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    akGraph,
    type FlowNetwork,
    genrmfGraph,
    gridFlowNetwork,
    layeredFlowNetwork,
    layeredFlowRows,
    planLayeredFlow,
} from "../../src/generators/flow.js";
import { EdgeBuffer } from "../../src/generators/util.js";
import { expectSameGraph, fullGraphHash, graphHash, pairs } from "../helpers/graph.js";

/**
 * Edmonds-Karp (shortest augmenting paths by BFS) over a residual adjacency matrix: an independent
 * reference for small networks.
 * @param g - the network
 * @returns the maximum flow value from g.source to g.sink
 */
function maxFlow(g: FlowNetwork): number {
    const n = g.nodeCount;
    const residual = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (let e = 0; e < g.src.length; e++) {
        residual[g.src[e]][g.dst[e]] += g.weights?.[e] ?? 0;
    }
    let flow = 0;
    for (;;) {
        const parent = new Array<number>(n).fill(-1);
        parent[g.source] = g.source;
        const queue = [g.source];
        for (let head = 0; head < queue.length && parent[g.sink] === -1; head++) {
            const u = queue[head];
            for (let v = 0; v < n; v++) {
                if (parent[v] === -1 && residual[u][v] > 0) {
                    parent[v] = u;
                    queue.push(v);
                }
            }
        }
        if (parent[g.sink] === -1) {
            return flow;
        }
        let push = Infinity;
        for (let v = g.sink; v !== g.source; v = parent[v]) {
            push = Math.min(push, residual[parent[v]][v]);
        }
        for (let v = g.sink; v !== g.source; v = parent[v]) {
            residual[parent[v]][v] -= push;
            residual[v][parent[v]] += push;
        }
        flow += push;
    }
}

/**
 * Assert the common shape of a flow network: directed, integer capacities, a role column.
 * @param g - the network
 */
function expectFlowNetwork(g: FlowNetwork): void {
    expect(g.directed).toBe(true);
    expect(g.weights?.length).toBe(g.src.length);
    expect(Array.from(g.weights ?? []).every((w) => Number.isInteger(w) && w >= 0)).toBe(true);
    const role = g.nodeColumns?.role as Uint8Array;
    expect(role).toBeInstanceOf(Uint8Array);
    expect(role[g.source]).toBe(1);
    expect(role[g.sink]).toBe(2);
    expect(role.filter((r) => r !== 0).length).toBe(2);
    expect(g.source).not.toBe(g.sink);
    const snapshot = fromEdgeArrays(g);
    expect(snapshot.edgeCount).toBe(g.src.length);
}

describe("gridFlowNetwork", () => {
    it("is a grid with arcs both ways, terminals on the left and right columns", () => {
        const rows = 4;
        const cols = 6;
        const g = gridFlowNetwork({ rows, cols, seed: 1 });
        expectFlowNetwork(g);
        expect(g.nodeCount).toBe(rows * cols + 2);
        expect(g.source).toBe(24);
        expect(g.sink).toBe(25);
        expect(g.src.length).toBe(2 * (rows * (cols - 1) + cols * (rows - 1)) + 2 * rows);
        const keys = new Set(pairs(g).map(([u, v]) => `${u}-${v}`));
        for (const [u, v] of pairs(g)) {
            if (u < rows * cols && v < rows * cols) {
                expect(keys.has(`${v}-${u}`)).toBe(true);
                expect(Math.abs(u - v) === 1 || Math.abs(u - v) === cols).toBe(true);
            }
        }
        const w = g.weights as Float32Array;
        const terminal = pairs(g).flatMap(([u, v], e) => (u === g.source || v === g.sink ? [w[e]] : []));
        expect(terminal).toEqual(new Array<number>(2 * rows).fill(40));
        const inner = pairs(g).flatMap(([u, v], e) => (u === g.source || v === g.sink ? [] : [w[e]]));
        expect(Math.min(...inner)).toBe(1);
        expect(Math.max(...inner)).toBe(10);
        const x = g.nodeColumns?.x as Float64Array;
        const y = g.nodeColumns?.y as Float64Array;
        expect([x[7], y[7], x[g.source], x[g.sink], y[g.sink]]).toEqual([1, 1, -1, 6, 1.5]);
    });

    it("has a max flow between rows * minCapacity and the first column's cut", () => {
        const rows = 5;
        const cols = 5;
        const g = gridFlowNetwork({ rows, cols, minCapacity: 2, maxCapacity: 9, seed: 3 });
        const w = g.weights as Float32Array;
        const firstCut = pairs(g).reduce((s, [u, v], e) => (u % cols === 0 && v === u + 1 && u < rows * cols ? s + w[e] : s), 0);
        const flow = maxFlow(g);
        expect(flow).toBeGreaterThanOrEqual(rows * 2);
        expect(flow).toBeLessThanOrEqual(firstCut);
        expect(flow).toBe(18);
    });

    it("scales to 100,000 nodes", () => {
        const g = gridFlowNetwork({ rows: 316, cols: 317, seed: 1 });
        expect(g.nodeCount).toBe(316 * 317 + 2);
    });

    it("rejects bad arguments", () => {
        expect(() => gridFlowNetwork({ rows: 0, cols: 3 })).toThrow(RangeError);
        expect(() => gridFlowNetwork({ rows: 3, cols: 1 })).toThrow(RangeError);
        expect(() => gridFlowNetwork({ rows: 3, cols: 3, minCapacity: 5, maxCapacity: 4 })).toThrow(RangeError);
        expect(() => gridFlowNetwork({ rows: 3, cols: 3, maxCapacity: 2 ** 22 + 1 })).toThrow(RangeError);
        expect(() => gridFlowNetwork({ rows: 3, cols: 3, seed: -1 })).toThrow(RangeError);
    });
});

describe("layeredFlowNetwork", () => {
    it("has arcs only from one layer to the next, the source first and the sink last", () => {
        const layers = [3, 5, 4, 2];
        const g = layeredFlowNetwork({ layers, p: 0.6, seed: 1 });
        expectFlowNetwork(g);
        expect(g.nodeCount).toBe(16);
        expect([g.source, g.sink]).toEqual([14, 15]);
        const layer = g.nodeColumns?.layer as Uint32Array;
        expect(Array.from(layer)).toEqual([1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 0, 5]);
        for (const [u, v] of pairs(g)) {
            expect(layer[v]).toBe(layer[u] + 1);
        }
        const w = g.weights as Float32Array;
        const terminal = pairs(g).flatMap(([u, v], e) => (u === g.source || v === g.sink ? [w[e]] : []));
        expect(terminal).toEqual(new Array<number>(5).fill(50));
        expect(maxFlow(g)).toBeGreaterThan(0);
        expect(maxFlow(layeredFlowNetwork({ layers: [4], p: 0.5 }))).toBe(4 * 40);
    });

    it("does not depend on how its rows are chunked", () => {
        const options = { layers: [100, 200, 150, 250], p: 0.05, seed: 5 };
        const plan = planLayeredFlow(options);
        const whole = new EdgeBuffer(0);
        const wholeCaps: number[] = [];
        layeredFlowRows(plan, 0, 700, whole, wholeCaps);
        const expected = [Array.from(whole.finish().src), Array.from(whole.finish().dst), wholeCaps];
        for (const size of [1, 7, 333]) {
            const src: number[] = [];
            const dst: number[] = [];
            const caps: number[] = [];
            for (let start = 0; start < 700; start += size) {
                const out = new EdgeBuffer(0);
                layeredFlowRows(plan, start, Math.min(700, start + size), out, caps);
                src.push(...out.finish().src);
                dst.push(...out.finish().dst);
            }
            expect([src, dst, caps]).toEqual(expected);
        }
        const g = layeredFlowNetwork(options);
        expect(Array.from(g.weights ?? []).slice(0, wholeCaps.length)).toEqual(wholeCaps);
        expect(Array.from(g.src.slice(0, whole.length))).toEqual(Array.from(whole.finish().src));
    });

    it("rejects bad arguments", () => {
        expect(() => layeredFlowNetwork({ layers: [], p: 0.5 })).toThrow(RangeError);
        expect(() => layeredFlowNetwork({ layers: [2, 0], p: 0.5 })).toThrow(RangeError);
        expect(() => layeredFlowNetwork({ layers: [2, 2], p: 2 })).toThrow(RangeError);
        expect(() => layeredFlowNetwork({ layers: [2, 2 ** 20], p: 0.5, maxCapacity: 17 })).toThrow(RangeError);
    });
});

describe("genrmfGraph", () => {
    it("links b frames of a x a grids by permutations", () => {
        const a = 3;
        const b = 4;
        const g = genrmfGraph({ a, b, c1: 1, c2: 20, seed: 1 });
        expectFlowNetwork(g);
        expect(g.nodeCount).toBe(a * a * b);
        expect(g.src.length).toBe(b * 4 * a * (a - 1) + (b - 1) * a * a);
        expect([g.source, g.sink]).toEqual([0, 35]);
        const frame = g.nodeColumns?.frame as Uint32Array;
        const w = g.weights as Float32Array;
        const hit = new Array<number>(g.nodeCount).fill(0);
        for (const [e, [u, v]] of pairs(g).entries()) {
            if (frame[u] === frame[v]) {
                expect(w[e]).toBe(20 * a * a);
            } else {
                expect(frame[v]).toBe(frame[u] + 1);
                expect(w[e]).toBeGreaterThanOrEqual(1);
                expect(w[e]).toBeLessThanOrEqual(20);
                hit[v]++;
            }
        }
        // every node of frames 1 .. b - 1 is the target of exactly one arc from the previous frame
        expect(hit.slice(a * a)).toEqual(new Array<number>(a * a * (b - 1)).fill(1));
        expect(maxFlow(g)).toBe(66);
    });

    it("handles one frame and rejects bad arguments", () => {
        const one = genrmfGraph({ a: 2, b: 1, c1: 1, c2: 1 });
        expect(maxFlow(one)).toBe(8);
        expect(() => genrmfGraph({ a: 1, b: 1, c1: 1, c2: 1 })).toThrow(RangeError);
        expect(() => genrmfGraph({ a: 2, b: 2, c1: 5, c2: 4 })).toThrow(RangeError);
        expect(() => genrmfGraph({ a: 100, b: 2, c1: 1, c2: 2000 })).toThrow(RangeError);
        expect(() => genrmfGraph({ a: 0, b: 2, c1: 1, c2: 2 })).toThrow(RangeError);
    });

    it("scales to 100,000 nodes", () => {
        expect(genrmfGraph({ a: 50, b: 40, c1: 1, c2: 100, seed: 1 }).nodeCount).toBe(100000);
    });
});

describe("akGraph", () => {
    // The construction was verified arc for arc (order and capacity) against igraph's example
    // instance ak-4102.max (DIMACS max format): akGraph({ k: 4102 }) reproduces all 24619 arcs.
    it("has 4k + 6 nodes, 6k + 7 arcs and the AK structure", () => {
        const k = 5;
        const g = akGraph({ k });
        expectFlowNetwork(g);
        expect(g.nodeCount).toBe(4 * k + 6);
        expect(g.src.length).toBe(6 * k + 7);
        expect([g.source, g.sink]).toEqual([0, 1]);
        expect(pairs(g).slice(0, 4)).toEqual([
            [2, 3],
            [2, 8],
            [3, 4],
            [3, 8],
        ]);
        expect(Array.from(g.weights ?? []).slice(0, 4)).toEqual([6, 1, 5, 1]);
        const outDegree = new Array<number>(g.nodeCount).fill(0);
        const inDegree = new Array<number>(g.nodeCount).fill(0);
        for (const [u, v] of pairs(g)) {
            outDegree[u]++;
            inDegree[v]++;
        }
        expect([outDegree[0], inDegree[0], outDegree[1], inDegree[1]]).toEqual([2, 0, 0, 2]);
        expect(inDegree[k + 3]).toBe(k + 1);
        const w = Array.from(g.weights ?? []);
        expect(w.filter((c) => c === 1000000).length).toBe(4);
        expect(Math.max(...w.filter((c) => c < 1000000))).toBe(k + 1);
    });

    it("has the pinned max flow 2k + 3", () => {
        const ks = [1, 2, 3, 4, 5, 10];
        expect(ks.map((k) => maxFlow(akGraph({ k })))).toEqual(ks.map((k) => 2 * k + 3));
    });

    it("rejects bad arguments", () => {
        expect(() => akGraph({ k: 0 })).toThrow(RangeError);
        expect(() => akGraph({ k: 499999 })).toThrow(RangeError);
    });
});

describe("determinism", () => {
    it("gives the same network twice, and unseeded equals seed 0", () => {
        expectSameGraph(gridFlowNetwork({ rows: 5, cols: 5 }), gridFlowNetwork({ rows: 5, cols: 5, seed: 0 }));
        expect(fullGraphHash(gridFlowNetwork({ rows: 5, cols: 5, seed: 1 }))).not.toBe(
            fullGraphHash(gridFlowNetwork({ rows: 5, cols: 5, seed: 2 })),
        );
        expect(graphHash(layeredFlowNetwork({ layers: [5, 5], p: 0.5, seed: 1 }))).not.toBe(
            graphHash(layeredFlowNetwork({ layers: [5, 5], p: 0.5, seed: 2 })),
        );
        expect(graphHash(genrmfGraph({ a: 3, b: 3, c1: 1, c2: 9, seed: 1 }))).not.toBe(
            graphHash(genrmfGraph({ a: 3, b: 3, c1: 1, c2: 9, seed: 2 })),
        );
    });

    /**
     * GOLDEN VALUES: a hash of one network per generator (structure, capacities and node columns).
     * A change here means seeded graphs changed, which is a breaking change of the package -- never
     * a test to update.
     */
    it("reproduces the golden networks", () => {
        expect(fullGraphHash(gridFlowNetwork({ rows: 6, cols: 7, seed: 1 }))).toMatchInlineSnapshot(`"c023da0b"`);
        expect(fullGraphHash(layeredFlowNetwork({ layers: [4, 6, 6, 3], p: 0.4, seed: 1 }))).toMatchInlineSnapshot(`"27b63a2f"`);
        expect(fullGraphHash(genrmfGraph({ a: 4, b: 3, c1: 1, c2: 50, seed: 1 }))).toMatchInlineSnapshot(`"552cff9c"`);
        expect(fullGraphHash(akGraph({ k: 6 }))).toMatchInlineSnapshot(`"524132a7"`);
    });
});
