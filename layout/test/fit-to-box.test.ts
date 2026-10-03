import assert from "node:assert";

import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, it } from "vitest";

import { arf, fitToBox, type LayoutResult } from "../src";

function result(rows: number[], dim: 2 | 3): LayoutResult {
    return { positions: Float32Array.from(rows), dim, n: rows.length / dim };
}

function farthest(r: LayoutResult, center: number[]): number {
    let max = 0;
    for (let i = 0; i < r.n; i++) {
        let sq = 0;
        for (let k = 0; k < r.dim; k++) {
            sq += (r.positions[r.dim * i + k] - center[k]) ** 2;
        }
        max = Math.max(max, Math.sqrt(sq));
    }
    return max;
}

describe("fitToBox", () => {
    it("fits the bounding box into the target, keeping the aspect ratio and centring the short side", () => {
        // a 2 x 1 layout into a 100 x 100 box at (10, 20): the long side fills it, the short side is centred
        const out = fitToBox(result([-1, 0, 1, 1], 2), { x: 10, y: 20, w: 100, h: 100 });
        assert.deepStrictEqual(Array.from(out.positions), [10, 45, 110, 95]);
        assert.equal(out.dim, 2);
        assert.equal(out.n, 2);
    });

    it("leaves an unplaced node unplaced and puts coincident nodes in the centre", () => {
        const out = fitToBox(result([3, 3, Number.NaN, Number.NaN, 3, 3], 2), { x: 0, y: 0, w: 10, h: 4 });
        assert.deepStrictEqual(Array.from(out.positions), [5, 2, Number.NaN, Number.NaN, 5, 2]);
    });

    it("scales z by the x/y factor about its midpoint in 3D", () => {
        const out = fitToBox(result([0, 0, 4, 2, 2, 8], 3), { x: 0, y: 0, w: 20, h: 20 });
        assert.deepStrictEqual(Array.from(out.positions), [0, 0, -20, 20, 20, 20]);
    });

    it("does not touch its input", () => {
        const input = result([0, 0, 1, 1], 2);
        fitToBox(input, { x: 0, y: 0, w: 10, h: 10 });
        assert.deepStrictEqual(Array.from(input.positions), [0, 0, 1, 1]);
    });
});

describe("arf scale and center", () => {
    const s = fromEdgeArrays({ src: [0, 1, 2, 3], dst: [1, 2, 3, 0], nodeCount: 4, directed: false });

    it("puts the farthest node 1 from the origin when neither is given, as every one-shot layout does", () => {
        const plain = arf(s, { seed: 3, maxIter: 50 });
        assert.ok(Math.abs(farthest(plain, [0, 0]) - 1) < 1e-5);
        const explicit = arf(s, { seed: 3, maxIter: 50, scale: 1, center: [0, 0] });
        assert.deepStrictEqual(plain.positions, explicit.positions);
    });

    it("puts the farthest node scale from center when either is given", () => {
        const scaled = arf(s, { seed: 3, maxIter: 50, scale: 5, center: [10, -2] });
        assert.ok(Math.abs(farthest(scaled, [10, -2]) - 5) < 1e-4);
        const centred = arf(s, { seed: 3, maxIter: 50, center: [1, 1] });
        assert.ok(Math.abs(farthest(centred, [1, 1]) - 1) < 1e-5);
    });
});
