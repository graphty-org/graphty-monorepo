import { describe, expect, it } from "vitest";

import { detExp, detPow } from "../../src/random/exp.js";
import { RandomStream } from "../../src/random/stream.js";
import { detCosSinTurn } from "../../src/random/trig.js";

/**
 * The bit pattern of a double as 16 hex digits.
 * @param x - the value
 * @returns the hex bit pattern
 */
function bits(x: number): string {
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, x);
    return view.getBigUint64(0).toString(16).padStart(16, "0");
}

describe("detExp", () => {
    it("handles the special values and the range limits", () => {
        expect(detExp(0)).toBe(1);
        expect(detExp(-0)).toBe(1);
        expect(detExp(Infinity)).toBe(Infinity);
        expect(detExp(-Infinity)).toBe(0);
        expect(detExp(NaN)).toBeNaN();
        expect(detExp(710)).toBe(Infinity);
        expect(detExp(-746)).toBe(0);
        expect(detExp(1e-30)).toBe(1);
        expect(detExp(-740)).toBeGreaterThan(0);
        expect(detExp(-740)).toBeLessThan(1e-320);
    });

    it("pins golden bit patterns (fdlibm e_exp.c results)", () => {
        // fdlibm (and Java StrictMath) give e one ulp above Math.E
        expect(bits(detExp(1))).toBe(bits(2.7182818284590455));
        expect(bits(detExp(-1))).toBe(bits(0.36787944117144233));
        expect(bits(detExp(0.5))).toBe(bits(1.6487212707001282));
        expect(bits(detExp(10))).toBe(bits(22026.465794806718));
        expect(bits(detExp(-20))).toBe(bits(2.061153622438558e-9));
        expect(bits(detExp(700))).toBe(bits(1.0142320547350045e304));
    });

    it("agrees with the engine's Math.exp to within one ulp", () => {
        const stream = new RandomStream(1, "test-exp", 0);
        let exact = 0;
        const samples = 200_000;
        for (let i = 0; i < samples; i++) {
            const x = (stream.nextFloat() - 0.5) * (i % 3 === 0 ? 1400 : 4);
            const ours = detExp(x);
            const theirs = Math.exp(x);
            if (ours === theirs) {
                exact++;
            } else {
                expect(Math.abs(ours - theirs)).toBeLessThanOrEqual(theirs * 2.3e-16);
            }
        }
        expect(exact / samples).toBeGreaterThan(0.99);
    });

    it("detPow matches Math.pow closely and handles a zero base", () => {
        expect(detPow(0, 2)).toBe(0);
        expect(detPow(0, 0)).toBe(1);
        expect(detPow(0, -1)).toBe(Infinity);
        for (const [x, y] of [
            [2, 10],
            [10, -2.5],
            [0.3, 1.7],
            [1234.5, 0.25],
        ]) {
            expect(detPow(x, y) / Math.pow(x, y)).toBeCloseTo(1, 12);
        }
    });
});

describe("detCosSinTurn", () => {
    it("is exact at the quarter turns and matches Math.cos / Math.sin elsewhere", () => {
        const out = new Float64Array(2);
        detCosSinTurn(0, out);
        expect(Array.from(out)).toEqual([1, 0]);
        detCosSinTurn(0.25, out);
        expect(out[0]).toBe(-0);
        expect(out[1]).toBe(1);
        detCosSinTurn(0.5, out);
        expect(Array.from(out)).toEqual([-1, -0]);
        const stream = new RandomStream(2, "test-trig", 0);
        let worst = 0;
        for (let i = 0; i < 100_000; i++) {
            const u = stream.nextFloat();
            detCosSinTurn(u, out);
            worst = Math.max(
                worst,
                Math.abs(out[0] - Math.cos(2 * Math.PI * u)),
                Math.abs(out[1] - Math.sin(2 * Math.PI * u)),
            );
        }
        expect(worst).toBeLessThan(2e-15);
    });

    it("pins golden bit patterns", () => {
        const out = new Float64Array(2);
        detCosSinTurn(0.1, out);
        expect([bits(out[0]), bits(out[1])]).toMatchInlineSnapshot(`
          [
            "3fe9e3779b97f4a8",
            "3fe2cf2304755a5e",
          ]
        `);
        detCosSinTurn(0.7, out);
        expect([bits(out[0]), bits(out[1])]).toMatchInlineSnapshot(`
          [
            "bfd3c6ef372fe954",
            "bfee6f0e134454ff",
          ]
        `);
    });
});
