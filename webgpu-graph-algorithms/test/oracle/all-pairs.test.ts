/**
 * The all-pairs references check THEMSELVES against answers computable by hand before they are trusted to judge a
 * kernel: the grid's matrix is the Manhattan distance, the path's is `|i - j|`, a pair across components is
 * `+Infinity`, parallel arcs keep the cheapest and a self-loop never displaces the diagonal zero, a directed cycle is
 * asymmetric, the breadth-first rows equal Floyd-Warshall on hop counts, and the blocked order equals the textbook
 * order EXACTLY on integer weights (no rounding to differ by) while differing from f64 on fractional ones. No device:
 * this file imports nothing from test/setup.
 */

import { cycleEdges, gridEdges, pathEdges, randomEdges, snapshotOf } from "../helpers/graphs.js";
import { relSpread, weightedEdges } from "../helpers/sssp.js";
import { apspRowsOracle, expectMatrixTriangleInequality, expectSymmetric, floydWarshallOracle } from "./all-pairs.js";

describe("the all-pairs references (design 8.7, 11.3)", () => {
    it("the 7 x 5 grid is the Manhattan distance, by BFS rows and by both Floyd-Warshall orders", () => {
        const w = 7;
        const h = 5;
        const s = snapshotOf(gridEdges(w, h));
        const n = w * h;
        const manhattan = new Float64Array(n * n);
        for (let a = 0; a < n; a++) {
            for (let b = 0; b < n; b++) {
                manhattan[a * n + b] = Math.abs((a % w) - (b % w)) + Math.abs(Math.floor(a / w) - Math.floor(b / w));
            }
        }
        expect(Array.from(apspRowsOracle(s))).toEqual(Array.from(manhattan));
        for (const tile of [undefined, 4, 32]) {
            expect(Array.from(floydWarshallOracle(s, { weighted: false, precision: "f64", tile }))).toEqual(
                Array.from(manhattan),
            );
        }
        expectSymmetric(manhattan, n);
        expectMatrixTriangleInequality(manhattan, s, false, 0);
    });

    it("the 40-path is |i - j| under a 16-node tile, which leaves a partial last block", () => {
        const s = snapshotOf(pathEdges(40));
        const d = floydWarshallOracle(s, { weighted: false, precision: "f32", tile: 16 });
        for (let i = 0; i < 40; i++) {
            for (let j = 0; j < 40; j++) {
                expect(d[i * 40 + j]).toBe(Math.abs(i - j));
            }
        }
    });

    it("a pair across components is +Infinity; parallel arcs keep the cheapest; a self-loop leaves the diagonal 0", () => {
        const s = snapshotOf(
            [
                [0, 1, 5],
                [0, 1, 2],
                [1, 1, 7],
                [2, 3, 1],
            ],
            { nodeCount: 5 },
        );
        const d = floydWarshallOracle(s, { weighted: true, precision: "f64" });
        expect(d[0 * 5 + 1]).toBe(2);
        expect(d[1 * 5 + 1]).toBe(0);
        expect(d[0 * 5 + 2]).toBe(Infinity);
        expect(d[4 * 5 + 4]).toBe(0);
        expect(d[4 * 5 + 0]).toBe(Infinity);
    });

    it("a directed cycle is asymmetric: d[0][1] = 1 and d[1][0] = n - 1", () => {
        const s = snapshotOf(cycleEdges(9), { directed: true });
        const d = floydWarshallOracle(s, { weighted: false, precision: "f64", tile: 4 });
        expect(d[1]).toBe(1);
        expect(d[9]).toBe(8);
        expect(() => expectSymmetric(d, 9)).toThrow();
        expect(Array.from(d)).toEqual(Array.from(apspRowsOracle(s)));
    });

    it("the blocked order equals the textbook order exactly on integer weights, and f32 drifts from f64 on fractional ones", () => {
        const integer = snapshotOf(weightedEdges(randomEdges(150, 450, 5), "integer", 6), { directed: true });
        const textbook = floydWarshallOracle(integer, { weighted: true, precision: "f64" });
        expect(Array.from(floydWarshallOracle(integer, { weighted: true, precision: "f32", tile: 32 }))).toEqual(
            Array.from(textbook),
        );
        const uniform = snapshotOf(weightedEdges(randomEdges(150, 450, 7), "uniform", 8));
        const f64 = floydWarshallOracle(uniform, { weighted: true, precision: "f64" });
        const f32 = floydWarshallOracle(uniform, { weighted: true, precision: "f32", tile: 32 });
        const spread = relSpread(f32, f64);
        expect(spread).toBeGreaterThan(0);
        expect(spread).toBeLessThan(1e-5);
        expectMatrixTriangleInequality(f64, uniform, true, 1e-6); // the bound is rounded to f32
    });
});
