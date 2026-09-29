import { expandEdges, GraphBuilder, type GraphSnapshot, maskTest } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { bipartiteFlowNetwork, maxFlow, type MaxFlowResult, minSTCut } from "../../../src/indexed/flow.js";
import { resolveNode } from "../../helpers/facade.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import type { LegacyMaxFlowResult } from "../../helpers/legacy-types.js";
import { toSnapshot } from "../../helpers/to-snapshot.js";
import { gnm } from "./port-fixtures.js";

interface FlowFixture {
    readonly name: string;
    readonly graph: Graph;
    /** Source and sink as the legacy string parameters take them. */
    readonly pairs: readonly (readonly [string, string])[];
}

function directedNetwork(): Graph {
    // The classic CLRS network: max flow 23 from s to t.
    const g = new Graph({ directed: true });
    g.addEdge("s", "v1", 16);
    g.addEdge("s", "v2", 13);
    g.addEdge("v2", "v1", 4);
    g.addEdge("v1", "v3", 12);
    g.addEdge("v3", "v2", 9);
    g.addEdge("v2", "v4", 14);
    g.addEdge("v4", "v3", 7);
    g.addEdge("v3", "t", 20);
    g.addEdge("v4", "t", 4);
    return g;
}

function undirectedGrid(): Graph {
    const g = new Graph({ directed: false });
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
            if (c < 3) {
                g.addEdge(`${r},${c}`, `${r},${c + 1}`, 1 + ((r + c) % 3));
            }
            if (r < 2) {
                g.addEdge(`${r},${c}`, `${r + 1},${c}`, 2);
            }
        }
    }
    return g;
}

function weightedNonF32(): Graph {
    // Weights that are not f32-exact, so exact results need the f64 override.
    const g = new Graph({ directed: true });
    g.addEdge("a", "b", 0.1);
    g.addEdge("a", "c", 0.7);
    g.addEdge("b", "d", 0.3);
    g.addEdge("c", "b", 0.2);
    g.addEdge("c", "d", 0.45);
    g.addEdge("b", "e", 1.1);
    g.addEdge("d", "e", 0.35);
    return g;
}

function numericIds(): Graph {
    const g = new Graph({ directed: true });
    g.addEdge(0, 1, 3);
    g.addEdge(0, 2, 2);
    g.addEdge(1, 2, 1);
    g.addEdge(1, 3, 2);
    g.addEdge(2, 3, 4);
    g.addEdge(3, 4, 5);
    g.addNode(5);
    return g;
}

/**
 * A seeded random directed graph with no two opposite edges: where both of a pair carry flow the
 * legacy per-edge flows are not a flow (see the opposite-edges test), so only there do they differ.
 */
function directedNoOpposites(nodeCount: number, edgeCount: number, seed: number): Graph {
    const base = gnm(nodeCount, edgeCount * 2, true, seed, true);
    const g = new Graph({ directed: true });
    for (const node of base.nodes()) {
        g.addNode(node.id);
    }
    for (const edge of base.edges()) {
        if (!g.hasEdge(edge.target, edge.source) && g.totalEdgeCount < edgeCount) {
            g.addEdge(edge.source, edge.target, edge.weight);
        }
    }
    return g;
}

function fixtures(): FlowFixture[] {
    return [
        {
            name: "CLRS directed network",
            graph: directedNetwork(),
            pairs: [
                ["s", "t"],
                ["v1", "t"],
                ["t", "s"],
            ],
        },
        {
            name: "undirected weighted 3x4 grid",
            graph: undirectedGrid(),
            pairs: [
                ["0,0", "2,3"],
                ["1,1", "0,3"],
            ],
        },
        {
            name: "directed weights that are not f32-exact",
            graph: weightedNonF32(),
            pairs: [
                ["a", "e"],
                ["c", "e"],
            ],
        },
        {
            name: "numeric ids passed as strings",
            graph: numericIds(),
            pairs: [
                ["0", "4"],
                ["1", "3"],
                ["0", "5"],
            ],
        },
        {
            name: "random directed 30 nodes, 90 weighted edges",
            graph: directedNoOpposites(30, 90, 97),
            pairs: [
                ["n0", "n29"],
                ["n3", "n17"],
            ],
        },
        {
            name: "random undirected 30 nodes, 80 weighted edges",
            graph: gnm(30, 80, false, 4242, true),
            pairs: [
                ["n0", "n29"],
                ["n5", "n11"],
            ],
        },
    ];
}

/** The per-arc f64 capacity override the facade will pass, or undefined when f32 is exact. */
function exactWeights(s: GraphSnapshot): Float64Array | undefined {
    const shadow = s.edges.byRole("weight");
    return shadow?.dtype === "f64" ? (expandEdges(s, shadow.data) as Float64Array) : undefined;
}

function legacyEdgeFlow(legacy: LegacyMaxFlowResult, s: GraphSnapshot, e: number): number {
    const u = String(s.ids.idOf(s.edgeSource(e)));
    const v = String(s.ids.idOf(s.edgeTarget(e)));
    const forward = legacy.flowGraph.get(u)?.get(v) ?? 0;
    return s.directed ? forward : forward - (legacy.flowGraph.get(v)?.get(u) ?? 0);
}

function sideIds(s: GraphSnapshot, r: MaxFlowResult, inside: boolean): string[] {
    const out: string[] = [];
    for (let i = 0; i < s.nodeCount; i++) {
        if (maskTest(r.sourceSide, i) === inside) {
            out.push(String(s.ids.idOf(i)));
        }
    }
    return out.sort();
}

/** Capacity and conservation: what any maximum flow satisfies, whichever paths found it. */
function expectFeasible(s: GraphSnapshot, r: MaxFlowResult, source: number, sink: number, cap: Float64Array): void {
    const net = new Float64Array(s.nodeCount);
    for (let e = 0; e < s.edgeCount; e++) {
        const f = r.flow[e];
        expect(Math.abs(f)).toBeLessThanOrEqual(cap[e] + 1e-12);
        if (s.directed) {
            expect(f).toBeGreaterThanOrEqual(0);
        }
        net[s.edgeSource(e)] -= f;
        net[s.edgeTarget(e)] += f;
    }
    for (let v = 0; v < s.nodeCount; v++) {
        let expected = 0;
        if (v === sink) {
            expected = r.maxFlow;
        } else if (v === source) {
            expected = -r.maxFlow;
        }
        expect(Math.abs(net[v] - expected)).toBeLessThan(1e-9);
    }
}

function capacities(s: GraphSnapshot): Float64Array {
    const w = exactWeights(s);
    return Float64Array.from({ length: s.edgeCount }, (_, e) =>
        w !== undefined ? w[s.edgeList().arc[e]] : (s.edgeList().weights?.[e] ?? 1),
    );
}

describe("indexed.maxFlow against legacy", () => {
    for (const algorithm of ["edmonds-karp", "ford-fulkerson"] as const) {
        for (const fixture of fixtures()) {
            it(`${algorithm}: ${fixture.name}`, () => {
                const s = toSnapshot(fixture.graph, { checksum: true });
                const weights = exactWeights(s);
                for (const [sourceId, sinkId] of fixture.pairs) {
                    const expected = legacyResult() as LegacyMaxFlowResult;
                    const source = resolveNode(s.ids, sourceId);
                    const sink = resolveNode(s.ids, sinkId);
                    const r = maxFlow(s, source, sink, { algorithm, weights });
                    const at = `${sourceId} -> ${sinkId}`;
                    expect(r.maxFlow, at).toBe(expected.maxFlow);
                    for (let e = 0; e < s.edgeCount; e++) {
                        expect(r.flow[e], `${at} edge ${e}`).toBe(legacyEdgeFlow(expected, s, e));
                    }
                    expect(sideIds(s, r, true), at).toEqual([...(expected.minCut?.source ?? [])].sort());
                    expect(sideIds(s, r, false), at).toEqual([...(expected.minCut?.sink ?? [])].sort());
                    expectFeasible(s, r, source, sink, capacities(s));
                }
                s.validate({ checksum: true });
            });
        }
    }

    it("reports the net flow of two opposite directed edges, each within its capacity", () => {
        // Legacy books every push on the edge in the push's direction, so a push that cancels flow
        // on b->a lands on a->b and a->b can show more than its capacity. Only the pair's net flow,
        // the flow value and the cut are comparable.
        const g = new Graph({ directed: true });
        g.addEdge("s", "a", 2);
        g.addEdge("s", "b", 2);
        g.addEdge("a", "b", 1);
        g.addEdge("b", "a", 1);
        g.addEdge("a", "t", 1);
        g.addEdge("b", "t", 3);
        const s = toSnapshot(g, { checksum: true });
        for (const algorithm of ["edmonds-karp", "ford-fulkerson"] as const) {
            const legacy = legacyResult() as LegacyMaxFlowResult;
            const source = s.ids.indexOf("s");
            const sink = s.ids.indexOf("t");
            const r = maxFlow(s, source, sink, { algorithm });
            expect(r.maxFlow).toBe(legacy.maxFlow);
            const ab = s.ids.indexOf("a");
            const ba = s.ids.indexOf("b");
            const edge = (u: number, v: number): number => s.arcToEdge[s.findArc(u, v)];
            const legacyNet = (legacy.flowGraph.get("a")?.get("b") ?? 0) - (legacy.flowGraph.get("b")?.get("a") ?? 0);
            expect(r.flow[edge(ab, ba)] - r.flow[edge(ba, ab)]).toBe(legacyNet);
            expectFeasible(s, r, source, sink, capacities(s));
            expect(sideIds(s, r, true)).toEqual([...(legacy.minCut?.source ?? [])].sort());
        }
        s.validate({ checksum: true });
    });

    it("splits a pair's flow over parallel edges within capacity and treats capacity <= 0 as none", () => {
        // Parallel edges and non-positive capacities exist only on a snapshot; the legacy Graph
        // keeps one edge per pair.
        const b = new GraphBuilder({ directed: true, duplicateEdges: "keep" });
        b.addEdge("s", "a", 1);
        b.addEdge("s", "a", 2);
        b.addEdge("s", "b", -1);
        b.addEdge("s", "b", 2);
        b.addEdge("s", "t", 0);
        b.addEdge("a", "t", 10);
        b.addEdge("b", "t", 10);
        const s = b.freeze();
        expect(s.edgeCount).toBe(7);
        const source = s.ids.indexOf("s");
        const sink = s.ids.indexOf("t");
        for (const algorithm of ["edmonds-karp", "ford-fulkerson"] as const) {
            const r = maxFlow(s, source, sink, { algorithm });
            expect(r.maxFlow).toBe(5);
            expect(Array.from(r.flow)).toEqual([1, 2, 0, 2, 0, 3, 2]);
            expect(sideIds(s, r, true)).toEqual(["s"]);
            // The zero and negative edges leave the source side but carry nothing, so they are not cut.
            expect(Array.from(r.cutEdges)).toEqual([0, 1, 3]);
        }

        const u = new GraphBuilder({ directed: false, duplicateEdges: "keep" });
        u.addEdge("s", "a", 1);
        u.addEdge("a", "s", 2);
        u.addEdge("a", "t", 10);
        const us = u.freeze();
        const ur = maxFlow(us, us.ids.indexOf("s"), us.ids.indexOf("t"));
        expect(ur.maxFlow).toBe(3);
        expect(Array.from(ur.flow)).toEqual([1, -2, 3]);
    });

    it("reads f32 arc weights without the override", () => {
        const s = toSnapshot(directedNetwork(), { checksum: true });
        expect(maxFlow(s, s.ids.indexOf("s"), s.ids.indexOf("t")).maxFlow).toBe(23);
        s.validate({ checksum: true });
    });

    it("gives every edge capacity 1 on an unweighted snapshot", () => {
        const s = bipartiteFlowNetwork(
            ["a", "b"],
            ["x", "y"],
            [
                ["a", "x"],
                ["b", "x"],
                ["b", "y"],
            ],
        );
        expect(s.snapshot.weights).toBeNull();
        expect(maxFlow(s.snapshot, s.source, s.sink).maxFlow).toBe(2);
    });

    it("reports the cut edges leaving the source side", () => {
        const s = toSnapshot(directedNetwork(), { checksum: true });
        const r = maxFlow(s, s.ids.indexOf("s"), s.ids.indexOf("t"));
        const cut = Array.from(
            r.cutEdges,
            (e) => `${String(s.ids.idOf(s.edgeSource(e)))}-${String(s.ids.idOf(s.edgeTarget(e)))}`,
        );
        expect(cut).toEqual(["v1-v3", "v4-v3", "v4-t"]);
        let total = 0;
        for (const e of r.cutEdges) {
            total += capacities(s)[e];
        }
        expect(total).toBe(r.maxFlow);
    });

    it("returns zero flow and a one-node source side when the sink is unreachable", () => {
        const s = toSnapshot(numericIds(), { checksum: true });
        const r = maxFlow(s, s.ids.indexOf(0), s.ids.indexOf(5));
        expect(r.maxFlow).toBe(0);
        expect(r.cutEdges.length).toBe(0);
        expect(sideIds(s, r, true)).toEqual(["0", "1", "2", "3", "4"]);
    });

    it("refuses a source equal to the sink and indices out of range", () => {
        const s = toSnapshot(directedNetwork());
        expect(() => maxFlow(s, 0, 0)).toThrow(RangeError);
        expect(() => maxFlow(s, 0, s.nodeCount)).toThrow(RangeError);
        expect(() => maxFlow(s, -1, 1)).toThrow(RangeError);
    });
});

describe("indexed.minSTCut against legacy", () => {
    for (const fixture of fixtures()) {
        it(fixture.name, () => {
            const s = toSnapshot(fixture.graph, { checksum: true });
            const weights = exactWeights(s);
            for (const [sourceId, sinkId] of fixture.pairs) {
                const expected = legacyResult() as MinCutResult;
                const r = minSTCut(s, resolveNode(s.ids, sourceId), resolveNode(s.ids, sinkId), { weights });
                const at = `${sourceId} -> ${sinkId}`;
                expect(r.cutValue, at).toBe(expected.cutValue);
                const side = sideIds(s, { sourceSide: r.side } as MaxFlowResult, true);
                expect(side, at).toEqual([...expected.partition1].sort());
                expect(sideIds(s, { sourceSide: r.side } as MaxFlowResult, false), at).toEqual(
                    [...expected.partition2].sort(),
                );
                const edgeKey = (from: string, to: string): string =>
                    s.directed || from < to ? `${from}|${to}` : `${to}|${from}`;
                const cut = Array.from(r.cutEdges, (e) =>
                    edgeKey(String(s.ids.idOf(s.edgeSource(e))), String(s.ids.idOf(s.edgeTarget(e)))),
                ).sort();
                const cap = capacities(s);
                expect(
                    Array.from(r.cutEdges).reduce((sum, e) => sum + cap[e], 0),
                    at,
                ).toBeCloseTo(r.cutValue, 12);
                if (typeof s.ids.idOf(0) === "number") {
                    // Legacy looks each cut edge up with graph.getEdge("0", "1"), which misses a
                    // numeric id, so it reports none.
                    expect(expected.cutEdges, at).toEqual([]);
                } else {
                    expect(cut, at).toEqual(expected.cutEdges.map((c) => edgeKey(c.from, c.to)).sort());
                }
            }
            s.validate({ checksum: true });
        });
    }

    it("reports the same cut value as legacy on 0.01-step weights, bit for bit", () => {
        // Legacy minSTCut always runs fordFulkerson. Decimal weights are not binary fractions, so
        // summing the same bottlenecks in another order (Edmonds-Karp) changes the last bits.
        let state = 7;
        const random = (): number => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state / 4294967296;
        };
        let compared = 0;
        for (let trial = 0; trial < 60; trial++) {
            const directed = trial % 2 === 0;
            const numeric = trial % 3 === 0;
            const n = 4 + Math.floor(random() * 12);
            const id = (i: number): string | number => (numeric ? i : `v${i}`);
            const g = new Graph({ directed });
            for (let i = 0; i < n; i++) {
                g.addNode(id(i));
            }
            for (let k = 0; k < n * 2; k++) {
                const u = id(Math.floor(random() * n));
                const v = id(Math.floor(random() * n));
                if (u !== v && !g.hasEdge(u, v) && !g.hasEdge(v, u)) {
                    g.addEdge(u, v, Math.round((0.05 + random() * 2) * 100) / 100);
                }
            }
            const s = toSnapshot(g);
            const weights = exactWeights(s);
            const source = String(id(0));
            const sink = String(id(n - 1));
            const r = minSTCut(s, resolveNode(s.ids, source), resolveNode(s.ids, sink), { weights });
            expect(r.cutValue, `trial ${trial}`).toBe((legacyResult() as MinCutResult).cutValue);
            compared++;
        }
        expect(compared).toBe(60);
    });
});

describe("indexed.bipartiteFlowNetwork", () => {
    const left = ["l0", "l1", "l2", "l3"];
    const right = ["r0", "r1", "r2"];
    const edges: [string, string][] = [
        ["l0", "r0"],
        ["l0", "r1"],
        ["l1", "r0"],
        ["l2", "r1"],
        ["l2", "r2"],
        ["l3", "r2"],
        ["l0", "r0"], // repeated: kept once, as the legacy Map does
    ];

    it("numbers nodes source, left, right, sink and keeps a repeated edge once", () => {
        const { snapshot, source, sink } = bipartiteFlowNetwork(left, right, edges);
        expect(source).toBe(0);
        expect(sink).toBe(snapshot.nodeCount - 1);
        expect(Array.from({ length: snapshot.nodeCount }, (_, i) => snapshot.ids.idOf(i))).toEqual([
            "__source__",
            ...left,
            ...right,
            "__sink__",
        ]);
        expect(snapshot.edgeCount).toBe(left.length + 6 + right.length);
        expect(snapshot.directed).toBe(true);
    });

    it("gives the same flow as legacy edmondsKarp over createBipartiteFlowNetwork", () => {
        const expected = legacyResult() as LegacyMaxFlowResult;
        const { snapshot, source, sink } = bipartiteFlowNetwork(left, right, edges);
        const r = maxFlow(snapshot, source, sink);
        expect(r.maxFlow).toBe(expected.maxFlow);
        expect(r.maxFlow).toBe(3);
        for (let e = 0; e < snapshot.edgeCount; e++) {
            expect(r.flow[e]).toBe(legacyEdgeFlow(expected, snapshot, e));
        }
    });

    it("adds edge endpoints that are not listed on either side", () => {
        const { snapshot } = bipartiteFlowNetwork(["a"], ["x"], [["b", "y"]]);
        expect(Array.from({ length: snapshot.nodeCount }, (_, i) => snapshot.ids.idOf(i))).toEqual([
            "__source__",
            "a",
            "b",
            "x",
            "y",
            "__sink__",
        ]);
    });

    it("refuses the reserved source and sink ids", () => {
        expect(() => bipartiteFlowNetwork(["__sink__"], ["x"], [])).toThrow(RangeError);
        expect(() => bipartiteFlowNetwork(["a"], ["x"], [["a", "__source__"]])).toThrow(RangeError);
    });
});
