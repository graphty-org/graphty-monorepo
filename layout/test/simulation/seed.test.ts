import assert from "node:assert";

import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, it } from "vitest";

import { Lcg, LCG_A, LCG_C, LCG_M, seedPositions } from "../../src/simulation/seed";

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

    it("steps state = (a * state + c) % m from state = seed % m over 10,000 draws", () => {
        for (const seed of [0, 1, 7, 42, 123456, 999999, LCG_M + 5]) {
            const lcg = new Lcg(seed);
            let state = seed % LCG_M;
            for (let k = 0; k < 10000; k++) {
                state = (LCG_A * state + LCG_C) % LCG_M;
                assert.equal(lcg.next(), state / LCG_M, `seed ${seed}, draw ${k}`);
            }
        }
    });

    it("treats seed 0 as an ordinary seed: the same stream every time", () => {
        const a = new Lcg(0);
        const b = new Lcg(0);
        assert.equal(a.seed, 0);
        for (let k = 0; k < 10; k++) {
            assert.equal(a.next(), b.next());
        }
    });

    it("draws a random integer seed below 1e6 for null", () => {
        const lcg = new Lcg(null);
        assert.ok(Number.isInteger(lcg.seed) && lcg.seed >= 0 && lcg.seed < 1000000);
    });

    it("refuses a negative, fractional or non-finite seed with E_BAD_OPTION", () => {
        for (const seed of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
            assert.throws(
                () => new Lcg(seed),
                (err: unknown) => {
                    const e = err as { code?: unknown; params?: { option?: unknown; value?: unknown } };
                    return (
                        err instanceof RangeError &&
                        e.code === "E_BAD_OPTION" &&
                        e.params?.option === "seed" &&
                        Object.is(e.params.value, seed)
                    );
                },
                `seed ${seed}`,
            );
        }
    });

    it("refuses a bad seed in seedPositions even when no row needs seeding", () => {
        const positions = new Float32Array(9);
        assert.throws(() => seedPositions(ring(3), positions, -1, 2, 1, null, "fa2"), /seed must be/);
    });
});

describe("seedPositions", () => {
    it("draws every NaN row in [-1, 1) per axis in index order and writes z = center.z in 2D", () => {
        const s = ring(4);
        const positions = new Float32Array(12).fill(Number.NaN);
        seedPositions(s, positions, 7, 2, 1, null, "fa2");
        const rng = new Lcg(7);
        for (let i = 0; i < 4; i++) {
            assert.equal(positions[3 * i], Math.fround(rng.next() * 2 - 1));
            assert.equal(positions[3 * i + 1], Math.fround(rng.next() * 2 - 1));
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

    it("pads a zero-width box: one finite row spreads the others around it instead of stacking them on it", () => {
        for (const range of ["fa2", "fr"] as const) {
            const s = ring(4);
            const positions = new Float32Array(12).fill(Number.NaN);
            positions.set([5, -3, 0], 0);
            seedPositions(s, positions, 11, 2, 1, null, range);
            const seen = new Set<string>();
            for (let i = 0; i < 4; i++) {
                const x = positions[3 * i];
                const y = positions[3 * i + 1];
                // the padded box is the range's width (2 for "fa2", 1 for "fr") centered on the finite row
                const half = range === "fr" ? 0.5 : 1;
                assert.ok(Math.abs(x - 5) <= half && Math.abs(y + 3) <= half, `${range} row ${i} at (${x}, ${y})`);
                seen.add(`${x},${y}`);
            }
            assert.equal(seen.size, 4, `${range}: every row has its own position`);
        }
    });

    it("pads only the zero-width axis: two finite rows on a horizontal line do not flatten the rest onto it", () => {
        const s = ring(4);
        const positions = new Float32Array(12).fill(Number.NaN);
        positions.set([0, 2, 0, 4, 2, 0], 0);
        seedPositions(s, positions, 5, 2, 1, null, "fa2");
        for (let i = 2; i < 4; i++) {
            assert.ok(positions[3 * i] >= 0 && positions[3 * i] <= 4, "x stays inside the finite box");
            assert.notEqual(positions[3 * i + 1], 2, "y is not the line's");
            assert.ok(Math.abs(positions[3 * i + 1] - 2) <= 1, "y stays within the padded box");
        }
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
