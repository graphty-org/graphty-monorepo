import assert from "node:assert";
import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, it } from "vitest";

import { Lcg, LCG_A, LCG_C, LCG_M, seedPositions } from "../../src/simulation/seed";
import { RandomNumberGenerator } from "../../src/utils/random";

function ring(n: number) {
    const src = new Uint32Array(n);
    const dst = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        src[i] = i;
        dst[i] = (i + 1) % n;
    }
    return fromEdgeArrays({ directed: false, nodeCount: n, src, dst });
}

describe("Lcg", () => {
    it("carries the port's constants (m = 2^35 - 31, a = 185852, c = 1)", () => {
        assert.equal(LCG_M, 2 ** 35 - 31);
        assert.equal(LCG_A, 185852);
        assert.equal(LCG_C, 1);
    });

    it("is the package's RandomNumberGenerator bit for bit over 10,000 draws (the W1 cross-test of design 9.3)", () => {
        for (const seed of [1, 7, 42, 123456, 999999]) {
            const lcg = new Lcg(seed);
            const rng = new RandomNumberGenerator(seed);
            for (let k = 0; k < 10000; k++) {
                assert.equal(lcg.next(), rng.rand(), `seed ${seed}, draw ${k}`);
            }
        }
    });

    it("seed 0 and null are unseeded, as the port's `seed || random` quirk has it", () => {
        assert.ok(new Lcg(0).seed > 0 && new Lcg(null).seed > 0);
    });
});

describe("seedPositions", () => {
    it("draws every NaN row in [-1, 1) per axis in index order and writes z = center.z in 2D", () => {
        const s = ring(4);
        const positions = new Float32Array(12).fill(Number.NaN);
        seedPositions(s, positions, 7, 2, 1, null, "fa2");
        const rng = new RandomNumberGenerator(7);
        for (let i = 0; i < 4; i++) {
            assert.equal(positions[3 * i], Math.fround((rng.rand() as number) * 2 - 1));
            assert.equal(positions[3 * i + 1], Math.fround((rng.rand() as number) * 2 - 1));
            assert.equal(positions[3 * i + 2], 0);
        }
    });

    it("keeps finite rows, draws the rest inside the finite rows' box, applies scale and center", () => {
        const s = ring(3);
        const positions = new Float32Array([10, 20, 0, 30, 40, 0, Number.NaN, Number.NaN, Number.NaN]);
        seedPositions(s, positions, 42, 2, 5, [100, 100, 0], "fa2");
        assert.deepEqual(Array.from(positions.subarray(0, 6)), [10, 20, 0, 30, 40, 0]);
        assert.ok(positions[6] >= 10 && positions[6] <= 30 && positions[7] >= 20 && positions[7] <= 40);
        assert.equal(positions[8], 0);
    });

    it('range "fr" draws in [0, 1)', () => {
        const s = ring(2);
        const positions = new Float32Array(6).fill(Number.NaN);
        seedPositions(s, positions, 3, 2, 1, null, "fr");
        for (let i = 0; i < 4; i++) {
            const v = positions[3 * Math.floor(i / 2) + (i % 2)];
            assert.ok(v >= 0 && v < 1);
        }
    });

    it("rejects a wrong length, a bad dim, a non-positive scale and a non-finite center", () => {
        const s = ring(2);
        assert.throws(() => seedPositions(s, new Float32Array(5), 1, 2, 1, null, "fa2"), /positions has 5 entries/);
        assert.throws(() => seedPositions(s, new Float32Array(6), 1, 4 as 2, 1, null, "fa2"), /dim must be 2 or 3/);
        assert.throws(() => seedPositions(s, new Float32Array(6), 1, 2, 0, null, "fa2"), /scale must be/);
        assert.throws(() => seedPositions(s, new Float32Array(6), 1, 2, 1, [Number.NaN], "fa2"), /center\[0\]/);
    });
});
