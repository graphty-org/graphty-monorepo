import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    grid3dGraph,
    gridGraph,
    hexagonalLatticeGraph,
    triangularLatticeGraph,
} from "../../src/generators/lattices.js";
import { componentCount, degrees, edgeKeys, expectSimple, fullGraphHash, pairs } from "../helpers/graph.js";

/**
 * The count of each degree value.
 * @param d - the degrees
 * @returns degree -> count
 */
function histogram(d: number[]): Record<number, number> {
    const h: Record<number, number> = {};
    for (const x of d) {
        h[x] = (h[x] ?? 0) + 1;
    }
    return h;
}

describe("gridGraph and grid3dGraph options", () => {
    it("the defaults are the phase 1 lattices, edge for edge", () => {
        expect(pairs(gridGraph({ rows: 2, cols: 3 }))).toEqual([
            [0, 1],
            [0, 3],
            [1, 2],
            [1, 4],
            [2, 5],
            [3, 4],
            [4, 5],
        ]);
        const g = grid3dGraph({ rows: 2, cols: 2, layers: 2 });
        expect(pairs(g).slice(0, 3)).toEqual([
            [0, 1],
            [0, 2],
            [0, 4],
        ]);
    });

    it("periodic makes a torus: every node has degree 4 (2D) or 6 (3D)", () => {
        const torus = gridGraph({ rows: 4, cols: 5, periodic: true });
        expectSimple(torus);
        expect(torus.src.length).toBe(40);
        expect(degrees(torus).every((d) => d === 4)).toBe(true);
        const t3 = grid3dGraph({ rows: 3, cols: 3, layers: 3, periodic: true });
        expectSimple(t3);
        expect(degrees(t3).every((d) => d === 6)).toBe(true);
    });

    it("periodic does not wrap a dimension shorter than 3 (no loops or doubled edges)", () => {
        const g = gridGraph({ rows: 2, cols: 4, periodic: true });
        expectSimple(g);
        // rows do not wrap (2 < 3): each column is a single edge; each row is a 4-cycle
        expect(g.src.length).toBe(4 + 8);
    });

    it("diagonals give the king's graph (8 neighbours) and the 26-neighbour 3D lattice", () => {
        const king = gridGraph({ rows: 3, cols: 3, diagonals: true });
        expectSimple(king);
        expect(degrees(king)[4]).toBe(8);
        expect(king.src.length).toBe(20);
        const moore = grid3dGraph({ rows: 3, cols: 3, layers: 3, diagonals: true, periodic: true });
        expectSimple(moore);
        expect(degrees(moore).every((d) => d === 26)).toBe(true);
    });

    it("directed emits forward arcs only: a DAG from node 0 to node n - 1", () => {
        const g = gridGraph({ rows: 3, cols: 4, directed: true });
        expect(g.directed).toBe(true);
        for (const [u, v] of pairs(g)) {
            expect(v).toBeGreaterThan(u);
        }
        expect(edgeKeys(g).length).toBe(edgeKeys(gridGraph({ rows: 3, cols: 4 })).length);
        expect(fromEdgeArrays(g).directed).toBe(true);
        expect(() => gridGraph({ rows: 3, cols: 3, directed: true, periodic: true })).toThrow(RangeError);
    });

    it("positions are the lattice coordinates", () => {
        const g = grid3dGraph({ rows: 2, cols: 3, layers: 2, positions: true });
        const { x, y, z } = g.nodeColumns as Record<string, Float64Array>;
        expect(Array.from(x.slice(0, 6))).toEqual([0, 1, 2, 0, 1, 2]);
        expect(Array.from(y.slice(0, 6))).toEqual([0, 0, 0, 1, 1, 1]);
        expect(z[6]).toBe(1);
        expect(gridGraph({ rows: 2, cols: 2, positions: true }).nodeColumns?.z).toBeUndefined();
        const w = gridGraph({ rows: 3, cols: 3, positions: true, weights: { kind: "euclidean" } }).weights;
        expect(Array.from(w as Float32Array).every((d) => d === 1)).toBe(true);
    });

    it("obstacles block a random share of the nodes, which keep their index but lose every edge", () => {
        const g = gridGraph({ rows: 100, cols: 100, obstacles: 0.3, seed: 4 });
        expectSimple(g);
        const blocked = g.nodeColumns?.blocked as Uint8Array;
        const count = blocked.reduce((a, b) => a + b, 0);
        expect(count).toBeGreaterThan(2700);
        expect(count).toBeLessThan(3300);
        for (const [u, v] of pairs(g)) {
            expect(blocked[u] + blocked[v]).toBe(0);
        }
        const d = degrees(g);
        for (let i = 0; i < d.length; i++) {
            if (blocked[i] === 1) {
                expect(d[i]).toBe(0);
            }
        }
        expect(g.nodeCount).toBe(10_000);
        expect(() => gridGraph({ rows: 2, cols: 2, obstacles: 1 })).toThrow(RangeError);
        expect(gridGraph({ rows: 3, cols: 3, obstacles: 0 }).nodeColumns?.blocked).toBeDefined();
    });

    it("GOLDEN VALUES: an obstacle grid with positions (a change is a breaking change, never a test to update)", () => {
        expect(fullGraphHash(gridGraph({ rows: 20, cols: 30, obstacles: 0.25, positions: true, seed: 1 }))).toBe(
            "57984a86",
        );
        // the default seed is 0
        expect(fullGraphHash(gridGraph({ rows: 20, cols: 30, obstacles: 0.25 }))).toBe(
            fullGraphHash(gridGraph({ rows: 20, cols: 30, obstacles: 0.25, seed: 0 })),
        );
    });

    it("GOLDEN VALUES: every option combination, edge for edge (a change is a breaking change, never a test to update)", () => {
        // bit 1 periodic, 2 diagonals, 4 directed, 8 obstacles 0.3, 16 positions; periodic + directed throws
        const golden: Record<number, Record<number, string>> = {
            1: {
                0: "7037361a",
                1: "544a7ec1",
                2: "955ff2a2",
                3: "18d7cd61",
                4: "7037361b",
                6: "955ff2a3",
                8: "c8b6ded2",
                9: "f1d56075",
                10: "374719ee",
                11: "744025a5",
                12: "5db1d4c9",
                14: "1a1f8495",
                16: "83771418",
                17: "9e93e44f",
                18: "298e7c80",
                19: "aca577ef",
                20: "d0a01d85",
                22: "af63286d",
                24: "3108c530",
                25: "e9da4c0b",
                26: "6c2640b4",
                27: "1783d4bb",
                28: "299c1397",
                30: "f323dfab",
            },
            3: {
                0: "83fd8312",
                1: "15198a29",
                2: "eedf658a",
                3: "d30f35c9",
                4: "83fd8313",
                6: "eedf658b",
                8: "d6f6659c",
                9: "34408060",
                10: "7a8766e3",
                11: "0279c890",
                12: "2685f233",
                14: "e942064c",
                16: "5522a6ce",
                17: "d95238b7",
                18: "c33aa886",
                19: "2da56a57",
                20: "319b3535",
                22: "3f0bd2ad",
                24: "97a27e54",
                25: "10ce3368",
                26: "c7e51245",
                27: "dba7e1d8",
                28: "930a9fd5",
                30: "affd37c4",
            },
        };
        for (const layers of [1, 3]) {
            for (let mask = 0; mask < 32; mask++) {
                const periodic = (mask & 1) !== 0;
                const directed = (mask & 4) !== 0;
                if (periodic && directed) {
                    continue;
                }
                const g = grid3dGraph({
                    rows: 4,
                    cols: 5,
                    layers,
                    periodic,
                    diagonals: (mask & 2) !== 0,
                    directed,
                    obstacles: (mask & 8) !== 0 ? 0.3 : undefined,
                    positions: (mask & 16) !== 0,
                    seed: 7,
                });
                expect(fullGraphHash(g), `layers ${layers}, options ${mask}`).toBe(golden[layers][mask]);
            }
        }
    });

    it("builds a 1000 x 1000 torus", () => {
        expect(gridGraph({ rows: 1000, cols: 1000, periodic: true }).src.length).toBe(2_000_000);
    });
});

describe("triangularLatticeGraph", () => {
    it("is the triangulated grid: interior degree 6, 3 (r - 1)(c - 1) + ... edges", () => {
        const g = triangularLatticeGraph({ rows: 4, cols: 5 });
        expectSimple(g);
        // right: r (c - 1), down: (r - 1) c, diagonal: (r - 1)(c - 1)
        expect(g.src.length).toBe(4 * 4 + 3 * 5 + 3 * 4);
        expect(degrees(g)[1 * 5 + 2]).toBe(6);
        expect(componentCount(g)).toBe(1);
    });

    it("its positions make every edge unit length", () => {
        const g = triangularLatticeGraph({ rows: 5, cols: 6, positions: true, weights: { kind: "euclidean" } });
        for (const w of g.weights as Float32Array) {
            expect(w).toBeCloseTo(1, 6);
        }
    });
});

describe("hexagonalLatticeGraph", () => {
    it("is the honeycomb (brick-wall form): degrees at most 3, interior exactly 3", () => {
        const g = hexagonalLatticeGraph({ rows: 6, cols: 8 });
        expectSimple(g);
        const h = histogram(degrees(g));
        expect(Math.max(...Object.keys(h).map(Number))).toBe(3);
        expect(degrees(g)[2 * 8 + 3]).toBe(3);
        expect(componentCount(g)).toBe(1);
    });

    it("its positions make every edge unit length", () => {
        const g = hexagonalLatticeGraph({ rows: 6, cols: 7, positions: true, weights: { kind: "euclidean" } });
        for (const w of g.weights as Float32Array) {
            expect(w).toBeCloseTo(1, 6);
        }
    });

    it("rejects bad sizes", () => {
        expect(() => hexagonalLatticeGraph({ rows: 0, cols: 3 })).toThrow(RangeError);
        expect(() => triangularLatticeGraph({ rows: 2, cols: -1 })).toThrow(RangeError);
    });
});
