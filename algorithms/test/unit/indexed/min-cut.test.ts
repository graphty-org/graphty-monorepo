import { expandEdges, type GraphSnapshot, maskTest, type NodeMask } from "@graphty/graph-format";
import { describe, expect, it, vi } from "vitest";

import type { MinCutResult } from "../../../src/indexed/flow.js";
import { mulberry32 } from "../../../src/indexed/label-propagation.js";
import { kargerMinCut, stoerWagner } from "../../../src/indexed/min-cut.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import { toSnapshot } from "../../helpers/to-snapshot.js";
import { gnm, undirectedFixtures } from "./port-fixtures.js";

function exactWeights(s: GraphSnapshot): Float64Array | undefined {
    const shadow = s.edges.byRole("weight");
    return shadow?.dtype === "f64" ? (expandEdges(s, shadow.data) as Float64Array) : undefined;
}

function sideIds(s: GraphSnapshot, side: NodeMask, inside: boolean): string[] {
    const out: string[] = [];
    for (let i = 0; i < s.nodeCount; i++) {
        if (maskTest(side, i) === inside) {
            out.push(String(s.ids.idOf(i)));
        }
    }
    return out.sort();
}

function pairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function portCutEdges(s: GraphSnapshot, r: MinCutResult): string[] {
    return Array.from(r.cutEdges, (e) =>
        pairKey(String(s.ids.idOf(s.edgeSource(e))), String(s.ids.idOf(s.edgeTarget(e)))),
    ).sort();
}

/** The weight of the edges between the two sides, from scratch. */
function cutWeight(s: GraphSnapshot, side: NodeMask, weights: Float64Array | undefined): number {
    let total = 0;
    for (let e = 0; e < s.edgeCount; e++) {
        if (maskTest(side, s.edgeSource(e)) !== maskTest(side, s.edgeTarget(e))) {
            total += weights !== undefined ? weights[s.edgeList().arc[e]] : (s.edgeList().weights?.[e] ?? 1);
        }
    }
    return total;
}

function weightedNonF32(): Graph {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b", 0.3);
    g.addEdge("a", "c", 0.7);
    g.addEdge("b", "c", 0.45);
    g.addEdge("c", "d", 0.15);
    g.addEdge("d", "e", 0.6);
    g.addEdge("d", "f", 0.35);
    g.addEdge("e", "f", 0.9);
    return g;
}

function numericIds(): Graph {
    const g = new Graph({ directed: false });
    for (const [u, v, w] of [
        [0, 1, 3],
        [0, 2, 2],
        [1, 2, 4],
        [2, 3, 1],
        [3, 4, 5],
        [3, 5, 2],
        [4, 5, 3],
    ]) {
        g.addEdge(u, v, w);
    }
    return g;
}

/** Directed, with no two opposite edges (legacy keeps one weight of such a pair, the port adds them). */
function directedChain(): Graph {
    const g = new Graph({ directed: true });
    g.addEdge("x", "y", 4);
    g.addEdge("y", "z", 1);
    g.addEdge("z", "x", 3);
    g.addEdge("z", "w", 2);
    g.addEdge("w", "v", 6);
    g.addEdge("v", "z", 1);
    return g;
}

function fixtures(): { name: string; graph: Graph }[] {
    return [
        ...undirectedFixtures(),
        { name: "weights that are not f32-exact", graph: weightedNonF32() },
        { name: "numeric ids", graph: numericIds() },
        { name: "directed, read as undirected", graph: directedChain() },
        { name: "random 50 nodes, 150 weighted edges", graph: gnm(50, 150, false, 31337, true) },
    ];
}

describe("indexed.stoerWagner against legacy", () => {
    for (const { name, graph } of fixtures()) {
        it(name, () => {
            const s = toSnapshot(graph, { checksum: true });
            const expected = legacyResult() as MinCutResult;
            const r = stoerWagner(s, { weights: exactWeights(s) });
            expect(r.cutValue).toBe(expected.cutValue);
            expect(sideIds(s, r.side, true)).toEqual([...expected.partition1].sort());
            expect(sideIds(s, r.side, false)).toEqual([...expected.partition2].sort());
            expect(portCutEdges(s, r)).toEqual(expected.cutEdges.map((c) => pairKey(c.from, c.to)).sort());
            s.validate({ checksum: true });
        });
    }

    it("puts every node on one side of a graph with fewer than two nodes", () => {
        const g = new Graph({ directed: false });
        g.addNode("only");
        const s = toSnapshot(g);
        const r = stoerWagner(s);
        expect(r.cutValue).toBe(0);
        expect(sideIds(s, r.side, true)).toEqual(["only"]);
        expect(r.cutEdges.length).toBe(0);
    });

    it("adds the weights of two opposite directed edges", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 2);
        g.addEdge("b", "a", 3);
        g.addEdge("b", "c", 10);
        g.addEdge("c", "b", 10);
        const s = toSnapshot(g);
        const r = stoerWagner(s);
        expect(r.cutValue).toBe(5);
        expect([sideIds(s, r.side, true), sideIds(s, r.side, false)].sort()).toEqual([["a"], ["b", "c"]]);
    });
});

describe("indexed.kargerMinCut", () => {
    it("is deterministic for one seed", () => {
        const s = toSnapshot(gnm(40, 120, false, 12345, true));
        const a = kargerMinCut(s, { randomSeed: 7, iterations: 20 });
        const b = kargerMinCut(s, { randomSeed: 7, iterations: 20 });
        expect(b.cutValue).toBe(a.cutValue);
        expect(Array.from(b.side)).toEqual(Array.from(a.side));
        expect(Array.from(b.cutEdges)).toEqual(Array.from(a.cutEdges));
    });

    it("reports a cut whose edges weigh what it says", () => {
        for (let seed = 1; seed <= 5; seed++) {
            const s = toSnapshot(gnm(30, 70, false, seed, true));
            const r = kargerMinCut(s, { randomSeed: seed, iterations: 5 });
            expect(cutWeight(s, r.side, undefined)).toBe(r.cutValue);
            expect(r.cutEdges.length).toBe(
                Array.from({ length: s.edgeCount }).filter(
                    (_, e) => maskTest(r.side, s.edgeSource(e)) !== maskTest(r.side, s.edgeTarget(e)),
                ).length,
            );
        }
    });

    // Karger is randomised on both sides and the two draw differently, so only the minimum is
    // comparable: with enough trials both find it, and it is the Stoer-Wagner value.
    for (const { name, graph } of [
        ...undirectedFixtures().filter((f) => f.graph.nodeCount <= 34),
        { name: "numeric ids", graph: numericIds() },
        { name: "weights that are not f32-exact", graph: weightedNonF32() },
    ]) {
        it(`finds the legacy minimum: ${name}`, () => {
            const s = toSnapshot(graph, { checksum: true });
            const weights = exactWeights(s);
            const r = kargerMinCut(s, { randomSeed: 1, iterations: 300, weights });
            const exact = stoerWagner(s, { weights });
            expect(r.cutValue).toBe(exact.cutValue);
            // Legacy draws from Math.random; a seeded stand-in makes its run repeatable.
            const random = vi.spyOn(Math, "random").mockImplementation(mulberry32(1));
            try {
                expect((legacyResult() as MinCutResult).cutValue).toBe(r.cutValue);
            } finally {
                random.mockRestore();
            }
            expect(cutWeight(s, r.side, weights)).toBe(r.cutValue);
            s.validate({ checksum: true });
        });
    }

    it("gives a zero cut on a graph of three components", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("c", "d");
        g.addNode("e");
        const s = toSnapshot(g);
        const r = kargerMinCut(s, { iterations: 3 });
        expect(r.cutValue).toBe(0);
        expect(maskTest(r.side, 0)).toBe(true);
        expect(r.cutEdges.length).toBe(0);
    });

    it("returns an empty cut with fewer than two nodes", () => {
        const g = new Graph({ directed: false });
        g.addNode("only");
        const r = kargerMinCut(toSnapshot(g));
        expect(r.cutValue).toBe(0);
        expect(r.cutEdges.length).toBe(0);
    });

    it("refuses a non-integer seed and a non-positive trial count", () => {
        const s = toSnapshot(numericIds());
        expect(() => kargerMinCut(s, { randomSeed: 0.5 })).toThrow(RangeError);
        expect(() => kargerMinCut(s, { iterations: 0 })).toThrow(RangeError);
    });
});
