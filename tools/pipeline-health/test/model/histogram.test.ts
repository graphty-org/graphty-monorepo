import { describe, expect, it } from "vitest";
import { addValue, binOf, emptyHistogram, FACTOR, HI, LO, mergeInto, quantile } from "../../src/model/histogram.js";

/** A deterministic generator, so a failure reproduces. */
const rand = (seed: number) => () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;

const exact = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.max(1, Math.ceil(q * xs.length)) - 1];

describe("log histogram", () => {
    it("reads median and p90 within one bin of the exact value", () => {
        const r = rand(7);
        for (let trial = 0; trial < 20; trial++) {
            const xs = Array.from({ length: 50 + trial * 20 }, () => LO * (HI / LO) ** r());
            const h = emptyHistogram();
            for (const x of xs) addValue(h, x);
            for (const q of [0.5, 0.9]) {
                const est = quantile(h, q)!;
                expect(Math.abs(Math.log(est / exact(xs, q)))).toBeLessThanOrEqual(Math.log(FACTOR));
            }
        }
    });

    it("merges to the histogram of the combined values", () => {
        const a = emptyHistogram();
        const b = emptyHistogram();
        const all = emptyHistogram();
        [5_000, 60_000, 3_600_000].forEach((x) => (addValue(a, x), addValue(all, x)));
        [7_000, 61_000].forEach((x) => (addValue(b, x), addValue(all, x)));
        mergeInto(a, b);
        expect(a).toEqual(all);
    });

    it("clamps values outside its range and is empty without values", () => {
        expect(binOf(1)).toBe(0);
        expect(binOf(HI * 10)).toBe(31);
        expect(quantile(emptyHistogram(), 0.5)).toBeUndefined();
    });
});
