import { GraphBuilder, type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import type { Graph } from "../../../src/core/graph.js";
import { betweennessCentrality, edgeBetweennessCentrality, resolveSources } from "../../../src/indexed/betweenness.js";
import { toSnapshot } from "../../../src/indexed/to-snapshot.js";
import { legacyResult } from "../../helpers/golden.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { multigraphFixtures, numericIdsFromZero } from "./multigraph-fixtures.js";
import { directedFixtures, gnm, undirectedFixtures } from "./port-fixtures.js";

const TOLERANCE = 1e-9;

function expectClose(actual: number, expected: number, what: string): void {
    expect(Math.abs(actual - expected), `${what}: ${actual} vs ${expected}`).toBeLessThanOrEqual(
        TOLERANCE * Math.max(1, Math.abs(expected)),
    );
}

/** Port node scores against the legacy record, by id. */
function expectNodesMatch(s: GraphSnapshot, ported: Float64Array, legacy: Record<string, number>): void {
    expect(Object.keys(legacy)).toHaveLength(s.nodeCount);
    for (let v = 0; v < s.nodeCount; v++) {
        const id = String(s.ids.idOf(v));
        expectClose(ported[v], legacy[id], id);
    }
}

/**
 * Port edge scores against the legacy map, per unordered (undirected) or ordered (directed) pair of ids: the
 * port's parallel edges are summed, and on an undirected graph the legacy "u-v" and "v-u" values are summed.
 */
function expectEdgesMatch(s: GraphSnapshot, ported: Float64Array, legacy: Map<string, number>): void {
    const pair = (u: string, v: string): string => (s.directed || u <= v ? `${u}|${v}` : `${v}|${u}`);
    const want = new Map<string, number>();
    for (const [key, value] of legacy) {
        // ids in these fixtures never contain "-"
        const [u, v] = key.split("-");
        want.set(pair(u, v), (want.get(pair(u, v)) ?? 0) + value);
    }
    const got = new Map<string, number>();
    const { src, dst } = s.edgeList();
    for (let e = 0; e < s.edgeCount; e++) {
        const key = pair(String(s.ids.idOf(src[e])), String(s.ids.idOf(dst[e])));
        got.set(key, (got.get(key) ?? 0) + ported[e]);
    }
    for (const [key, value] of got) {
        if (key.split("|")[0] !== key.split("|")[1]) {
            expectClose(value, want.get(key) ?? 0, key);
        }
    }
}

const OPTION_SETS = [{}, { normalized: true }];

describe("indexed.betweennessCentrality", () => {
    it("scores the middle of a path by the pairs it separates", () => {
        const b = new GraphBuilder({ directed: false });
        for (let i = 0; i < 4; i++) {
            b.addEdge(i, i + 1);
        }
        const r = betweennessCentrality(b.freeze());
        expect([...r.scores]).toEqual([0, 3, 4, 3, 0]);
        expect(r.iterations).toBe(5);
        expect(r.converged).toBe(true);
    });

    it("splits a pair's credit between equal shortest paths", () => {
        // a four-cycle: a and c are joined through b and through d, so each carries half
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b");
        b.addEdge("b", "c");
        b.addEdge("c", "d");
        b.addEdge("d", "a");
        expect([...betweennessCentrality(b.freeze()).scores]).toEqual([0.5, 0.5, 0.5, 0.5]);
    });

    it("counts paths through node id 0", () => {
        const g = numericIdsFromZero();
        const s = checksummedSnapshot(g);
        const ported = betweennessCentrality(s).scores;
        expectNodesMatch(s, ported, legacyResult<Record<string, number>>());
        expect(ported[s.ids.requireIndex(0)]).toBeGreaterThan(0);
        s.validate({ checksum: true });
    });

    it("gives the empty graph and a single node empty and zero scores", () => {
        expect(betweennessCentrality(new GraphBuilder({ directed: false }).freeze()).scores).toHaveLength(0);
        const one = new GraphBuilder({ directed: true });
        one.addNode("x");
        expect([...betweennessCentrality(one.freeze(), { normalized: true }).scores]).toEqual([0]);
    });

    describe("endpoints", () => {
        it("adds each path's two ends, as NetworkX does", () => {
            // path a-b-c: NetworkX betweenness_centrality(endpoints=True) gives a 2, b 3, c 2
            const b = new GraphBuilder({ directed: false });
            b.addEdge("a", "b");
            b.addEdge("b", "c");
            const s = b.freeze();
            expect([...betweennessCentrality(s, { endpoints: true }).scores]).toEqual([2, 3, 2]);
            // normalised by n (n - 1) / 2 = 3
            expect([...betweennessCentrality(s, { endpoints: true, normalized: true }).scores]).toEqual([
                2 / 3,
                1,
                2 / 3,
            ]);
        });

        it("on a directed graph, credits each end of each reachable ordered pair once", () => {
            const b = new GraphBuilder({ directed: true });
            b.addEdge("a", "b");
            b.addEdge("b", "c");
            // pairs (a,b) (a,c) (b,c): a ends 2, b ends 2 and is inside 1, c ends 2
            expect([...betweennessCentrality(b.freeze(), { endpoints: true }).scores]).toEqual([2, 3, 2]);
        });
    });

    describe("sampling", () => {
        const g = gnm(40, 120, false, 12345);
        const s = checksummedSnapshot(g);

        it("runs exactly the listed sources, the same way every time", () => {
            const first = betweennessCentrality(s, { sources: [3, 17, 0, 29] });
            const second = betweennessCentrality(s, { sources: [3, 17, 0, 29] });
            expect([...first.scores]).toEqual([...second.scores]);
            expect(first.iterations).toBe(4);
            // the sample is the unscaled sum of its single-source runs
            const sum = new Float64Array(s.nodeCount);
            for (const source of [3, 17, 0, 29]) {
                betweennessCentrality(s, { sources: [source] }).scores.forEach((x, i) => (sum[i] += x));
            }
            first.scores.forEach((x, i) => expectClose(x, sum[i], `node ${i}`));
            s.validate({ checksum: true });
        });

        it("draws k distinct sources deterministically, and every node when k is n", () => {
            const a = betweennessCentrality(s, { k: 10 });
            const b = betweennessCentrality(s, { k: 10 });
            expect([...a.scores]).toEqual([...b.scores]);
            expect(a.iterations).toBe(10);
            const full = betweennessCentrality(s).scores;
            betweennessCentrality(s, { k: s.nodeCount }).scores.forEach((x, i) => expectClose(x, full[i], `${i}`));
        });

        it("draws a fixed list for a given (n, k), so a saved k call reruns on the same sources", () => {
            // pinned: a changed seed or draw changes every sampled score a caller has stored
            expect(resolveSources(6, undefined, 2)).toEqual([2, 1]);
            expect(resolveSources(10, undefined, 4)).toEqual([3, 1, 7, 9]);
        });

        it("accepts k equal to the list's length and refuses anything else", () => {
            expect(betweennessCentrality(s, { sources: [1, 2], k: 2 }).iterations).toBe(2);
            expect(() => betweennessCentrality(s, { sources: [1, 2], k: 3 })).toThrow(RangeError);
            expect(() => betweennessCentrality(s, { sources: [40] })).toThrow(RangeError);
            expect(() => betweennessCentrality(s, { sources: [-1] })).toThrow(RangeError);
            expect(() => betweennessCentrality(s, { k: 41 })).toThrow(RangeError);
            expect(() => betweennessCentrality(s, { k: 1.5 })).toThrow(RangeError);
            expect([...betweennessCentrality(s, { k: 0 }).scores].every((x) => x === 0)).toBe(true);
        });
    });

    for (const { name, graph } of [...undirectedFixtures(), ...directedFixtures()]) {
        it(`equals the legacy betweennessCentrality on ${name}`, () => {
            const s = checksummedSnapshot(graph);
            for (const options of OPTION_SETS) {
                expectNodesMatch(s, betweennessCentrality(s, options).scores, legacyResult<Record<string, number>>());
            }
            s.validate({ checksum: true });
        });
    }

    for (const { name, snapshot } of multigraphFixtures()) {
        it(`counts parallel edges as one path on the ${name}, equal to legacy on the merged graph`, () => {
            for (const options of OPTION_SETS) {
                expectNodesMatch(
                    snapshot,
                    betweennessCentrality(snapshot, options).scores,
                    legacyResult<Record<string, number>>(),
                );
            }
            snapshot.validate({ checksum: true });
        });
    }
});

describe("indexed.edgeBetweennessCentrality", () => {
    it("scores an undirected path's edges by the pairs that cross them, both directions together", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b");
        b.addEdge("b", "c");
        // pairs crossing a-b: {a,b} and {a,c}
        expect([...edgeBetweennessCentrality(b.freeze()).scores]).toEqual([2, 2]);
    });

    it("gives an edgeless graph an empty result", () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode(1);
        expect(edgeBetweennessCentrality(b.freeze()).scores).toHaveLength(0);
    });

    for (const { name, graph } of [
        ...undirectedFixtures(),
        ...directedFixtures(),
        { name: "numeric ids from 0", graph: numericIdsFromZero() },
    ]) {
        it(`equals the legacy edgeBetweennessCentrality on ${name}`, () => {
            const s = checksummedSnapshot(graph);
            for (const options of OPTION_SETS) {
                expectEdgesMatch(s, edgeBetweennessCentrality(s, options).scores, legacyResult<Map<string, number>>());
            }
            s.validate({ checksum: true });
        });
    }

    for (const { name, snapshot } of multigraphFixtures()) {
        it(`puts a pair's whole score on one parallel edge on the ${name}`, () => {
            const { scores } = edgeBetweennessCentrality(snapshot);
            expectEdgesMatch(snapshot, scores, legacyResult<Map<string, number>>());
            // a and b are joined by three parallel edges; exactly one carries the pair
            const { src, dst } = snapshot.edgeList();
            const a = snapshot.ids.requireIndex("a");
            const bIndex = snapshot.ids.requireIndex("b");
            const parallels = [...src.keys()].filter((e) => src[e] === a && dst[e] === bIndex);
            expect(parallels.filter((e) => scores[e] > 0)).toHaveLength(1);
            snapshot.validate({ checksum: true });
        });
    }

    describe("the alive-edge mask", () => {
        function withoutEdges(graph: Graph, remove: readonly (readonly [string, string])[]): Graph {
            const copy = graph.clone();
            for (const [u, v] of remove) {
                expect(copy.removeEdge(u, v)).toBe(true);
            }
            return copy;
        }

        for (const { name, graph } of [
            { name: "Zachary's karate club", graph: undirectedFixtures()[7].graph },
            { name: "a random directed graph", graph: directedFixtures()[2].graph },
        ]) {
            it(`equals the unmasked scores of the graph with those edges deleted, on ${name}`, () => {
                const s = checksummedSnapshot(graph);
                const { src, dst } = s.edgeList();
                const dead = [0, 5, 11, 23];
                const alive = makeMask(s.edgeCount, true);
                for (const e of dead) {
                    maskSet(alive, e, false);
                }
                const masked = edgeBetweennessCentrality(s, { alive, normalized: true }).scores;
                const removed = withoutEdges(
                    graph,
                    dead.map((e) => [String(s.ids.idOf(src[e])), String(s.ids.idOf(dst[e]))] as const),
                );
                const smaller = toSnapshot(removed);
                const reference = edgeBetweennessCentrality(smaller, { normalized: true }).scores;
                const key = (u: unknown, v: unknown): string => {
                    const [a, b] = [String(u), String(v)];
                    return s.directed || a <= b ? `${a}|${b}` : `${b}|${a}`;
                };
                const index = new Map<string, number>();
                const small = smaller.edgeList();
                for (let e = 0; e < smaller.edgeCount; e++) {
                    index.set(key(smaller.ids.idOf(small.src[e]), smaller.ids.idOf(small.dst[e])), e);
                }
                for (let e = 0; e < s.edgeCount; e++) {
                    if (dead.includes(e)) {
                        expect(masked[e]).toBe(0);
                        continue;
                    }
                    const at = index.get(key(s.ids.idOf(src[e]), s.ids.idOf(dst[e])));
                    expect(at).toBeDefined();
                    expectClose(masked[e], reference[at ?? -1], `edge ${e}`);
                }
                s.validate({ checksum: true });
            });
        }

        it("hands a pair's score to the next parallel edge when the first is masked out", () => {
            const { snapshot } = multigraphFixtures()[0];
            const full = edgeBetweennessCentrality(snapshot).scores;
            const carrier = [...full.keys()].find((e) => {
                const { src, dst } = snapshot.edgeList();
                return snapshot.ids.idOf(src[e]) === "a" && snapshot.ids.idOf(dst[e]) === "b" && full[e] > 0;
            });
            expect(carrier).toBeDefined();
            const alive = makeMask(snapshot.edgeCount, true);
            maskSet(alive, carrier ?? 0, false);
            const masked = edgeBetweennessCentrality(snapshot, { alive }).scores;
            expect(masked[carrier ?? 0]).toBe(0);
            const { src, dst } = snapshot.edgeList();
            const pairTotal = (scores: Float64Array): number =>
                [...scores.keys()]
                    .filter((e) => {
                        const u = snapshot.ids.idOf(src[e]);
                        const v = snapshot.ids.idOf(dst[e]);
                        return (u === "a" && v === "b") || (u === "b" && v === "a");
                    })
                    .reduce((sum, e) => sum + scores[e], 0);
            expectClose(pairTotal(masked), pairTotal(full), "a-b");
        });

        it("refuses a mask that does not cover every edge", () => {
            const s = checksummedSnapshot(gnm(10, 40, true, 3));
            expect(() => edgeBetweennessCentrality(s, { alive: new Uint32Array(1) })).toThrow(RangeError);
        });
    });
});
