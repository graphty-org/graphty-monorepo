import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    bianconiBarabasiGraph,
    duplicationDivergenceGraph,
    forestFireGraph,
    newmanWattsGraph,
    randomApollonianGraph,
    randomRecursiveTreeGraph,
    wilsonMazeGraph,
} from "../../src/generators/growth.js";
import { detLog } from "../../src/random/log.js";
import { RandomStream } from "../../src/random/stream.js";
import { type SampleGraph } from "../../src/types.js";
import {
    componentCount,
    degrees,
    edgeKeys,
    expectSameGraph,
    expectSimple,
    fullGraphHash,
    graphHash,
    pairs,
} from "../helpers/graph.js";

/**
 * Assert the common determinism properties: same graph twice, unseeded equals seed 0, another seed
 * differs.
 * @param make - builds the graph for a seed (undefined for the default)
 */
function expectDeterministic(make: (seed?: number) => SampleGraph): void {
    expectSameGraph(make(3), make(3));
    expectSameGraph(make(), make(0));
    expect(graphHash(make(1))).not.toBe(graphHash(make(2)));
}

/**
 * The adjacency sets of an undirected graph.
 * @param g - the graph
 * @returns one set per node
 */
function adjacency(g: SampleGraph): Set<number>[] {
    const adj = Array.from({ length: g.nodeCount }, () => new Set<number>());
    for (const [u, v] of pairs(g)) {
        adj[u].add(v);
        adj[v].add(u);
    }
    return adj;
}

/**
 * Replay a forest fire: node v's arcs come as one run in v order, all to earlier nodes, and every
 * target after the first (the ambassador) is an out-neighbour (or, when backward burning is on, an
 * in-neighbour) of an earlier target of v in the graph before v arrived.
 * @param g - the graph
 * @param backward - whether in-links may burn
 */
function expectBurnsFollowLinks(g: SampleGraph, backward: boolean): void {
    const out = Array.from({ length: g.nodeCount }, () => new Set<number>());
    const inn = Array.from({ length: g.nodeCount }, () => new Set<number>());
    let e = 0;
    for (let v = 1; v < g.nodeCount; v++) {
        const burned: number[] = [];
        while (e < g.src.length && g.src[e] === v) {
            const t = g.dst[e];
            expect(t).toBeLessThan(v);
            if (burned.length > 0) {
                expect(burned.some((b) => out[b].has(t) || (backward && inn[b].has(t)))).toBe(true);
            }
            burned.push(t);
            e++;
        }
        expect(burned.length).toBeGreaterThanOrEqual(1);
        for (const t of burned) {
            out[v].add(t);
            inn[t].add(v);
        }
    }
    expect(e).toBe(g.src.length);
}

describe("randomRecursiveTreeGraph", () => {
    it("attaches each node to an earlier one, in node order", () => {
        const g = randomRecursiveTreeGraph({ n: 500, seed: 4 });
        expect(g.directed).toBe(false);
        expect(g.nodeCount).toBe(500);
        expect(g.src.length).toBe(499);
        for (let e = 0; e < g.src.length; e++) {
            expect(g.dst[e]).toBe(e + 1);
            expect(g.src[e]).toBeLessThan(e + 1);
        }
        expect(componentCount(g)).toBe(1);
        expect(randomRecursiveTreeGraph({ n: 1 }).src.length).toBe(0);
    });

    it("picks the parent uniformly, and builds 100k nodes quickly", () => {
        const g = randomRecursiveTreeGraph({ n: 100_000, seed: 1 });
        let low = 0;
        for (let e = 0; e < g.src.length; e++) {
            if (2 * g.src[e] < e + 1) {
                low++;
            }
        }
        expect(low / g.src.length).toBeGreaterThan(0.49);
        expect(low / g.src.length).toBeLessThan(0.51);
    });

    it("rejects bad options and is deterministic", () => {
        expect(() => randomRecursiveTreeGraph({ n: 0 })).toThrow(RangeError);
        expect(() => randomRecursiveTreeGraph({ n: 2.5 })).toThrow(RangeError);
        expectDeterministic((seed) => randomRecursiveTreeGraph({ n: 200, seed }));
    });
});

describe("forestFireGraph", () => {
    it("draws geometric counts with P(X >= k) = p^k", () => {
        const stream = new RandomStream(9, "test", 0);
        const p = 0.4;
        const logP = detLog(p);
        const tally = [0, 0, 0];
        const trials = 100_000;
        for (let i = 0; i < trials; i++) {
            const x = stream.nextSkip(logP);
            for (let k = 0; k < 3; k++) {
                if (x >= k + 1) {
                    tally[k]++;
                }
            }
        }
        for (let k = 0; k < 3; k++) {
            expect(tally[k] / trials).toBeCloseTo(p ** (k + 1), 2);
        }
    });

    it("burns only through links that existed, and never twice", () => {
        const g = forestFireGraph({ n: 2000, forward: 0.35, backward: 0.3, seed: 2 });
        expect(g.directed).toBe(true);
        expectSimple(g);
        expectBurnsFollowLinks(g, true);
        expect(g.src.length).toBeGreaterThan(1.5 * g.nodeCount);
    });

    it("forward-only burning follows out-links, and zero burning gives a recursive tree", () => {
        expectBurnsFollowLinks(forestFireGraph({ n: 1000, forward: 0.4, backward: 0, seed: 5 }), false);
        const tree = forestFireGraph({ n: 300, forward: 0, backward: 0, seed: 5 });
        expect(tree.src.length).toBe(299);
        expect(componentCount(tree)).toBe(1);
    });

    it("caps the burn per node", () => {
        const g = forestFireGraph({ n: 3000, forward: 0.6, backward: 0.8, maxBurn: 5, seed: 1 });
        const outDegree = new Uint32Array(g.nodeCount);
        for (const u of g.src) {
            outDegree[u]++;
        }
        expect(Math.max(...outDegree)).toBe(5);
        expect(forestFireGraph({ n: 50, forward: 0.9, backward: 1, maxBurn: 1 }).src.length).toBe(49);
    });

    it("builds 100k nodes and loads into graph-format", () => {
        const g = forestFireGraph({ n: 100_000, forward: 0.3, backward: 0.3, seed: 1 });
        const snapshot = fromEdgeArrays(g);
        expect(snapshot.edgeCount).toBe(g.src.length);
        expect(snapshot.selfLoopCount).toBe(0);
    });

    it("rejects bad options and is deterministic", () => {
        expect(() => forestFireGraph({ n: 10, forward: 1, backward: 0 })).toThrow(/forward/);
        expect(() => forestFireGraph({ n: 10, forward: -0.1, backward: 0 })).toThrow(RangeError);
        expect(() => forestFireGraph({ n: 10, forward: 0.5, backward: -1 })).toThrow(/backward/);
        expect(() => forestFireGraph({ n: 10, forward: 0.5, backward: 2 })).toThrow(/backward/);
        expect(() => forestFireGraph({ n: 10, forward: 0.5, backward: 0, maxBurn: 0 })).toThrow(/maxBurn/);
        expect(() => forestFireGraph({ n: 0, forward: 0.5, backward: 0 })).toThrow(/n must/);
        expectDeterministic((seed) => forestFireGraph({ n: 300, forward: 0.35, backward: 0.3, seed }));
    });
});

describe("duplicationDivergenceGraph", () => {
    it("is simple and connected, and every new node copies part of one earlier node's neighbourhood", () => {
        const g = duplicationDivergenceGraph({ n: 1500, retention: 0.4, seed: 3 });
        expect(g.directed).toBe(false);
        expect(g.nodeCount).toBe(1500);
        expectSimple(g);
        expect(componentCount(g)).toBe(1);
        expect([g.src[0], g.dst[0]]).toEqual([0, 1]);
        // replay: new node i's neighbours must all be neighbours of one earlier node
        const adj = Array.from({ length: g.nodeCount }, () => new Set<number>());
        adj[0].add(1);
        adj[1].add(0);
        let e = 1;
        for (let i = 2; i < g.nodeCount; i++) {
            const mine: number[] = [];
            while (e < g.src.length && g.src[e] === i) {
                mine.push(g.dst[e++]);
            }
            expect(mine.length).toBeGreaterThan(0);
            let parent = -1;
            for (let r = 0; r < i && parent < 0; r++) {
                if (mine.every((x) => adj[r].has(x))) {
                    parent = r;
                }
            }
            expect(parent).toBeGreaterThanOrEqual(0);
            for (const x of mine) {
                adj[i].add(x);
                adj[x].add(i);
            }
        }
        expect(e).toBe(g.src.length);
    });

    it("with retention 1 copies whole neighbourhoods: a complete bipartite graph", () => {
        const g = duplicationDivergenceGraph({ n: 60, retention: 1, seed: 8 });
        const hubSide = adjacency(g)[0];
        for (const [u, v] of pairs(g)) {
            expect(hubSide.has(u)).not.toBe(hubSide.has(v));
        }
        expect(g.src.length).toBe(hubSide.size * (g.nodeCount - hubSide.size));
    });

    it("gives up with a RangeError instead of looping forever", () => {
        expect(() => duplicationDivergenceGraph({ n: 1000, retention: 1e-9 })).toThrow(/attempts/);
    });

    it("builds 100k nodes", () => {
        const g = duplicationDivergenceGraph({ n: 100_000, retention: 0.4, seed: 1 });
        expect(fromEdgeArrays(g).edgeCount).toBe(g.src.length);
    });

    it("rejects bad options and is deterministic", () => {
        expect(() => duplicationDivergenceGraph({ n: 1, retention: 0.5 })).toThrow(/n must/);
        expect(() => duplicationDivergenceGraph({ n: 10, retention: 0 })).toThrow(/retention/);
        expect(() => duplicationDivergenceGraph({ n: 10, retention: 1.5 })).toThrow(/retention/);
        expect(duplicationDivergenceGraph({ n: 2, retention: 0.5 }).src.length).toBe(1);
        expectDeterministic((seed) => duplicationDivergenceGraph({ n: 300, retention: 0.5, seed }));
    });
});

describe("newmanWattsGraph", () => {
    it("keeps the ring lattice and appends shortcuts", () => {
        const n = 400;
        const k = 6;
        const g = newmanWattsGraph({ n, k, p: 0.1, seed: 1 });
        expectSimple(g);
        const ring = n * (k / 2);
        for (let u = 0; u < n; u++) {
            for (let j = 1; j <= k / 2; j++) {
                const slot = u * (k / 2) + j - 1;
                expect([g.src[slot], g.dst[slot]]).toEqual([u, (u + j) % n]);
            }
        }
        const shortcuts = g.src.length - ring;
        expect(shortcuts).toBeGreaterThan(80);
        expect(shortcuts).toBeLessThan(160);
        // shortcuts come in slot order: their sources never decrease
        for (let e = ring + 1; e < g.src.length; e++) {
            expect(g.src[e]).toBeGreaterThanOrEqual(g.src[e - 1]);
        }
    });

    it("adds nothing at p = 0 and skips saturated nodes", () => {
        expect(newmanWattsGraph({ n: 50, k: 4, p: 0, seed: 1 }).src.length).toBe(100);
        const full = newmanWattsGraph({ n: 5, k: 4, p: 1, seed: 1 });
        expect(full.src.length).toBe(10);
        const dense = newmanWattsGraph({ n: 7, k: 4, p: 1, seed: 1 });
        expectSimple(dense);
        expect(dense.src.length).toBeLessThanOrEqual(21);
    });

    it("builds 100k nodes and rejects bad options", () => {
        const g = newmanWattsGraph({ n: 100_000, k: 6, p: 0.05, seed: 1 });
        expect(fromEdgeArrays(g).edgeCount).toBe(g.src.length);
        expect(() => newmanWattsGraph({ n: 10, k: 3, p: 0.1 })).toThrow(/even/);
        expect(() => newmanWattsGraph({ n: 4, k: 4, p: 0.1 })).toThrow(/n must/);
        expect(() => newmanWattsGraph({ n: 10, k: 2, p: 2 })).toThrow(/p must/);
        expectDeterministic((seed) => newmanWattsGraph({ n: 200, k: 4, p: 0.2, seed }));
    });
});

describe("bianconiBarabasiGraph", () => {
    it("starts from a clique and adds m distinct edges per node", () => {
        const g = bianconiBarabasiGraph({ n: 800, m: 3, seed: 1 });
        expectSimple(g);
        expect(g.src.length).toBe(6 + (800 - 4) * 3);
        expect(edgeKeys({ ...g, src: g.src.slice(0, 6), dst: g.dst.slice(0, 6) })).toEqual([
            "0-1",
            "0-2",
            "0-3",
            "1-2",
            "1-3",
            "2-3",
        ]);
        for (let e = 6; e < g.src.length; e++) {
            expect(g.src[e]).toBe(4 + Math.floor((e - 6) / 3));
            expect(g.dst[e]).toBeLessThan(g.src[e]);
        }
        const fitness = g.nodeColumns?.fitness as Float64Array;
        expect(fitness).toBeInstanceOf(Float64Array);
        expect(fitness.length).toBe(800);
        expect(Math.min(...fitness)).toBeGreaterThan(0);
        expect(Math.max(...fitness)).toBeLessThanOrEqual(1);
    });

    it("attaches in proportion to fitness times degree", () => {
        let toZero = 0;
        const trials = 4000;
        for (let seed = 0; seed < trials; seed++) {
            const g = bianconiBarabasiGraph({ n: 3, m: 1, fitness: [3, 1, 1], seed });
            if (g.dst[1] === 0) {
                toZero++;
            }
        }
        expect(toZero / trials).toBeGreaterThan(0.72);
        expect(toZero / trials).toBeLessThan(0.78);
    });

    it("lets a fit latecomer overtake its elders", () => {
        const fitness = new Float64Array(3000).fill(1);
        fitness[1000] = 50;
        const g = bianconiBarabasiGraph({ n: 3000, m: 2, fitness, seed: 1 });
        const d = degrees(g);
        expect(d[1000]).toBeGreaterThan(5 * Math.max(d[999], d[1001], 20));
        expect(g.nodeColumns?.fitness).toEqual(fitness);
    });

    it("builds 100k nodes and rejects bad options", () => {
        const g = bianconiBarabasiGraph({ n: 100_000, m: 3, seed: 1 });
        expect(fromEdgeArrays(g).edgeCount).toBe(g.src.length);
        expect(() => bianconiBarabasiGraph({ n: 3, m: 3 })).toThrow(/n must/);
        expect(() => bianconiBarabasiGraph({ n: 10, m: 0 })).toThrow(/m must/);
        expect(() => bianconiBarabasiGraph({ n: 3, m: 1, fitness: [1, 1] })).toThrow(/fitness/);
        expect(() => bianconiBarabasiGraph({ n: 3, m: 1, fitness: [1, 0, 1] })).toThrow(/fitness/);
        expect(() => bianconiBarabasiGraph({ n: 3, m: 1, fitness: [1, Infinity, 1] })).toThrow(/fitness/);
        expectDeterministic((seed) => bianconiBarabasiGraph({ n: 200, m: 2, seed }));
    });
});

describe("randomApollonianGraph", () => {
    it("splits a uniform existing face with each new node: maximal planar, 3n - 6 edges", () => {
        const n = 600;
        const g = randomApollonianGraph({ n, seed: 2 });
        expectSimple(g);
        expect(g.src.length).toBe(3 * n - 6);
        expect(edgeKeys({ ...g, src: g.src.slice(0, 3), dst: g.dst.slice(0, 3) })).toEqual(["0-1", "0-2", "1-2"]);
        // replay against a naive set of faces
        const faces = new Set<string>(["0,1,2"]);
        const face = (a: number, b: number, c: number): string => [a, b, c].sort((x, y) => x - y).join(",");
        for (let v = 3; v < n; v++) {
            const e = 3 + 3 * (v - 3);
            const [a, b, c] = [g.dst[e], g.dst[e + 1], g.dst[e + 2]];
            expect([g.src[e], g.src[e + 1], g.src[e + 2]]).toEqual([v, v, v]);
            expect(faces.delete(face(a, b, c))).toBe(true);
            faces.add(face(a, b, v));
            faces.add(face(b, c, v));
            faces.add(face(a, c, v));
        }
        expect(faces.size).toBe(1 + 2 * (n - 3));
        expect(randomApollonianGraph({ n: 3 }).src.length).toBe(3);
    });

    it("builds 100k nodes and rejects bad options", () => {
        const g = randomApollonianGraph({ n: 100_000, seed: 1 });
        expect(fromEdgeArrays(g).edgeCount).toBe(3 * 100_000 - 6);
        expect(() => randomApollonianGraph({ n: 2 })).toThrow(/n must/);
        expectDeterministic((seed) => randomApollonianGraph({ n: 200, seed }));
    });
});

describe("wilsonMazeGraph", () => {
    /**
     * Assert g is a spanning tree of the rows x cols grid.
     * @param g - the graph
     * @param rows - the rows
     * @param cols - the columns
     */
    function expectGridSpanningTree(g: SampleGraph, rows: number, cols: number): void {
        expect(g.nodeCount).toBe(rows * cols);
        expect(g.src.length).toBe(rows * cols - 1);
        expectSimple(g);
        expect(componentCount(g)).toBe(1);
        for (const [u, v] of pairs(g)) {
            const du = Math.abs(Math.floor(u / cols) - Math.floor(v / cols));
            const dc = Math.abs((u % cols) - (v % cols));
            expect(du + dc).toBe(1);
        }
    }

    it("is a spanning tree of the grid with positions", () => {
        const g = wilsonMazeGraph({ rows: 30, cols: 40, seed: 1 });
        expectGridSpanningTree(g, 30, 40);
        const x = g.nodeColumns?.x as Float64Array;
        const y = g.nodeColumns?.y as Float64Array;
        expect([x[41], y[41]]).toEqual([1, 1]);
        expect([x[39], y[39]]).toEqual([39, 0]);
        expectGridSpanningTree(wilsonMazeGraph({ rows: 1, cols: 7 }), 1, 7);
        expect(wilsonMazeGraph({ rows: 1, cols: 1 }).src.length).toBe(0);
    });

    it("is uniform over the 15 spanning trees of the 2 x 3 grid", () => {
        const counts = new Map<string, number>();
        const trials = 3000;
        for (let seed = 0; seed < trials; seed++) {
            const key = edgeKeys(wilsonMazeGraph({ rows: 2, cols: 3, seed })).join(" ");
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        expect(counts.size).toBe(15);
        for (const c of counts.values()) {
            expect(c).toBeGreaterThan(140);
            expect(c).toBeLessThan(260);
        }
    });

    it("builds a 100k-cell maze and rejects bad options", () => {
        const g = wilsonMazeGraph({ rows: 250, cols: 400, seed: 1 });
        expect(g.src.length).toBe(99_999);
        expect(componentCount(g)).toBe(1);
        expect(() => wilsonMazeGraph({ rows: 0, cols: 3 })).toThrow(/rows/);
        expect(() => wilsonMazeGraph({ rows: 3, cols: 1.5 })).toThrow(/cols/);
        expectDeterministic((seed) => wilsonMazeGraph({ rows: 12, cols: 12, seed }));
    });
});

/**
 * GOLDEN VALUES: a full hash (edges, weights, node columns) of one graph per growth model. A change
 * here means seeded graphs changed, which is a breaking change of the package -- never a test to
 * update.
 */
describe("golden values", () => {
    it("randomRecursiveTreeGraph", () => {
        expect(fullGraphHash(randomRecursiveTreeGraph({ n: 200, seed: 1 }))).toMatchInlineSnapshot(`"ceae67b6"`);
    });
    it("forestFireGraph", () => {
        expect(
            fullGraphHash(forestFireGraph({ n: 200, forward: 0.35, backward: 0.32, seed: 1 })),
        ).toMatchInlineSnapshot(`"888e8798"`);
    });
    it("duplicationDivergenceGraph", () => {
        expect(fullGraphHash(duplicationDivergenceGraph({ n: 200, retention: 0.4, seed: 1 }))).toMatchInlineSnapshot(
            `"9e22e5cc"`,
        );
    });
    it("newmanWattsGraph", () => {
        expect(fullGraphHash(newmanWattsGraph({ n: 200, k: 4, p: 0.1, seed: 1 }))).toMatchInlineSnapshot(`"d6750c45"`);
    });
    it("bianconiBarabasiGraph", () => {
        expect(fullGraphHash(bianconiBarabasiGraph({ n: 200, m: 2, seed: 1 }))).toMatchInlineSnapshot(`"9e29137c"`);
    });
    it("randomApollonianGraph", () => {
        expect(fullGraphHash(randomApollonianGraph({ n: 200, seed: 1 }))).toMatchInlineSnapshot(`"85420fa7"`);
    });
    it("wilsonMazeGraph", () => {
        expect(fullGraphHash(wilsonMazeGraph({ rows: 10, cols: 20, seed: 1 }))).toMatchInlineSnapshot(`"04379be6"`);
    });
    it("the weights option leaves the edges alone", () => {
        const plain = randomApollonianGraph({ n: 100, seed: 4 });
        const weighted = randomApollonianGraph({ n: 100, seed: 4, weights: { kind: "uniform" } });
        expect(graphHash(weighted)).toBe(graphHash(plain));
        expect(weighted.weights?.length).toBe(plain.src.length);
        const maze = wilsonMazeGraph({ rows: 5, cols: 5, weights: { kind: "euclidean" } });
        expect(Array.from(maze.weights ?? [])).toEqual(new Array(24).fill(1));
    });
});
