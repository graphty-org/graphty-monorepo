import { describe, expect, it } from "vitest";

import { mulberry32 } from "../../../src/utils/math-utilities.js";

describe("mulberry32", () => {
    it("matches the reference mulberry32 sequence", () => {
        // Reference values from a BigInt implementation of mulberry32 (exact 32-bit arithmetic).
        const zero = mulberry32(0);
        expect([zero(), zero(), zero()]).toEqual([0.26642920868471265, 0.0003297457005828619, 0.2232720274478197]);
        const fortyTwo = mulberry32(42);
        expect([fortyTwo(), fortyTwo(), fortyTwo()]).toEqual([
            0.6011037519201636, 0.44829055899754167, 0.8524657934904099,
        ]);
    });

    it("never returns 1 and stays in [0, 1) over a long run", () => {
        for (const seed of [0, 1, -1, 42, 2147483647, -2147483648, Number.MAX_SAFE_INTEGER]) {
            const rand = mulberry32(seed);
            for (let i = 0; i < 200_000; i++) {
                const x = rand();
                expect(x >= 0 && x < 1).toBe(true);
            }
        }
    });

    it("is deterministic per seed and differs across seeds", () => {
        const a = mulberry32(42);
        const b = mulberry32(42);
        const c = mulberry32(43);
        const xs = Array.from({ length: 10 }, () => a());
        expect(Array.from({ length: 10 }, () => b())).toEqual(xs);
        expect(Array.from({ length: 10 }, () => c())).not.toEqual(xs);
    });
});
