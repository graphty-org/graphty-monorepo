import { describe, expect, it } from "vitest";

import { detLog } from "../../src/random/log.js";
import { checkSeed, domainId, RandomStream } from "../../src/random/stream.js";

/**
 * GOLDEN VALUES. These freeze the stream derivation of src/random/stream.ts: the first eight words
 * of several (seed, domain, block) streams. If one of these changes, every seeded graph the package
 * has ever produced changes with it -- that is a breaking change, never a test to update.
 */
const GOLDEN: readonly (readonly [number, string, number, readonly number[]])[] = [
    [0, "golden", 0, [0x98c7126a, 0x7b73b0d5, 0x4642ed52, 0xd6130134, 0x5c130b46, 0x91fc8e94, 0xb22ccad4, 0x376f2e3f]],
    [1, "golden", 0, [0xa76d28ff, 0x93cb1128, 0xc3e74da8, 0xd468ca96, 0xe2d66160, 0xbdc77bf0, 0xfa1cece7, 0xe18fd039]],
    [42, "gnp", 7, [0x53f4e00f, 0x68ca9686, 0x400fefbb, 0xc61db9ba, 0x82a3e336, 0x2518e57c, 0x98ce4adb, 0x4bd953aa]],
    [
        2 ** 53 - 1,
        "sbm",
        4294967295,
        [0x7e0590d6, 0x9f5bba8e, 0x74822599, 0xf3d2a172, 0xfae6d5ff, 0xd7b2fdd4, 0x459f54ed, 0xccd2e6ea],
    ],
    [
        123456789012,
        "golden",
        1,
        [0xc180482d, 0xed10f231, 0x24065a19, 0x1698e7fc, 0x365fcef9, 0xc64decd7, 0x863065a3, 0x3de60fa9],
    ],
];

describe("RandomStream", () => {
    it.each(GOLDEN)("seed %d domain %s block %d yields its golden words", (seed, domain, block, words) => {
        const stream = new RandomStream(seed, domain, block);
        expect(Array.from({ length: words.length }, () => stream.nextU32())).toEqual(words);
    });

    it("freezes the derived draws: nextFloat, nextBelow and nextSkip", () => {
        const s = new RandomStream(7, "golden", 3);
        expect(Array.from({ length: 4 }, () => s.nextFloat())).toEqual([
            0.4372093877141191, 0.49817077233798446, 0.3267851011523154, 0.16483445578331823,
        ]);
        expect([10, 1000, 2 ** 32, 2 ** 40, 2 ** 53 - 1].map((n) => s.nextBelow(n))).toEqual([
            1, 341, 3937285383, 19975913410, 309168842813344,
        ]);
        expect([0.5, 0.01, 1e-6].map((p) => s.nextSkip(detLog(1 - p)))).toEqual([2, 69, 949132]);
    });

    it("hashes domains with 32-bit FNV-1a", () => {
        expect(domainId("")).toBe(0x811c9dc5);
        expect(domainId("a")).toBe(0xe40c292c);
        expect(domainId("foobar")).toBe(0xbf9cf968);
    });

    it("reset(block) restarts exactly where a fresh stream of that block starts", () => {
        const a = new RandomStream(9, "golden", 0);
        a.nextU32();
        a.nextU32();
        a.nextU32();
        a.reset(5);
        const b = new RandomStream(9, "golden", 5);
        expect(Array.from({ length: 5 }, () => a.nextU32())).toEqual(Array.from({ length: 5 }, () => b.nextU32()));
    });

    it("gives different streams for different seeds, domains and blocks", () => {
        const first = (seed: number, domain: string, block: number): number =>
            new RandomStream(seed, domain, block).nextU32();
        const base = first(1, "x", 1);
        expect(first(2, "x", 1)).not.toBe(base);
        expect(first(1, "y", 1)).not.toBe(base);
        expect(first(1, "x", 2)).not.toBe(base);
        expect(first(2 ** 32 + 1, "x", 1)).not.toBe(base);
    });

    it("keeps nextFloat in [0, 1) and nextBelow in range, roughly uniformly", () => {
        const s = new RandomStream(3, "uniformity", 0);
        const buckets = new Array<number>(10).fill(0);
        for (let i = 0; i < 20_000; i++) {
            const f = s.nextFloat();
            expect(f).toBeGreaterThanOrEqual(0);
            expect(f).toBeLessThan(1);
            const k = s.nextBelow(10);
            buckets[k]++;
        }
        for (const count of buckets) {
            expect(count).toBeGreaterThan(1800);
            expect(count).toBeLessThan(2200);
        }
        expect(s.nextBelow(1)).toBe(0);
    });

    it("draws geometric skips with the right mean", () => {
        const s = new RandomStream(4, "geometric", 0);
        const p = 0.1;
        const logQ = detLog(1 - p);
        let sum = 0;
        const draws = 20_000;
        for (let i = 0; i < draws; i++) {
            sum += s.nextSkip(logQ);
        }
        // mean number of failures (1 - p) / p = 9
        expect(sum / draws).toBeGreaterThan(8.6);
        expect(sum / draws).toBeLessThan(9.4);
    });

    it("rejects seeds that are not safe non-negative integers", () => {
        for (const bad of [-1, 1.5, NaN, Infinity, 2 ** 53]) {
            expect(() => {
                checkSeed(bad);
            }).toThrow(RangeError);
        }
        expect(() => new RandomStream(-1, "x", 0)).toThrow(RangeError);
    });
});
