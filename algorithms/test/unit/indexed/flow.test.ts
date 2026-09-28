import { expandEdges, type GraphSnapshot, maskTest } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import {
    createBipartiteFlowNetwork,
    edmondsKarp as legacyEdmondsKarp,
    fordFulkerson as legacyFordFulkerson,
    type MaxFlowResult as LegacyMaxFlowResult,
} from "../../../src/flow/ford-fulkerson.js";
import { minSTCut as legacyMinSTCut } from "../../../src/flow/min-cut.js";
import { resolveNode } from "../../../src/indexed/facade.js";
import { bipartiteFlowNetwork, maxFlow, type MaxFlowResult, minSTCut } from "../../../src/indexed/flow.js";
import { toSnapshot } from "../../../src/indexed/to-snapshot.js";
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
    for (const [algorithm, legacy] of [
        ["edmonds-karp", legacyEdmondsKarp],
        ["ford-fulkerson", legacyFordFulkerson],
    ] as const) {
        for (const fixture of fixtures()) {
            it(`${algorithm}: ${fixture.name}`, () => {
                const s = toSnapshot(fixture.graph, { checksum: true });
                const weights = exactWeights(s);
                for (const [sourceId, sinkId] of fixture.pairs) {
                    const expected = legacy(fixture.graph, sourceId, sinkId);
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
            const legacy = (algorithm === "edmonds-karp" ? legacyEdmondsKarp : legacyFordFulkerson)(g, "s", "t");
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
                const expected = legacyMinSTCut(fixture.graph, sourceId, sinkId);
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
        const legacyNetwork = createBipartiteFlowNetwork(left, right, edges);
        const expected = legacyEdmondsKarp(legacyNetwork.graph, legacyNetwork.source, legacyNetwork.sink);
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
