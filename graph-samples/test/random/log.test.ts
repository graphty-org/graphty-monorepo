import { describe, expect, it } from "vitest";

import { detLog } from "../../src/random/log.js";
import { RandomStream } from "../../src/random/stream.js";

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

describe("detLog", () => {
    it("handles the special values", () => {
        expect(detLog(1)).toBe(0);
        expect(detLog(0)).toBe(-Infinity);
        expect(detLog(Infinity)).toBe(Infinity);
        expect(detLog(-1)).toBeNaN();
        expect(detLog(NaN)).toBeNaN();
    });

    it("pins golden bit patterns (fdlibm e_log.c results)", () => {
        expect(bits(detLog(0.5))).toBe(bits(-0.6931471805599453));
        expect(bits(detLog(2))).toBe(bits(0.6931471805599453));
        expect(bits(detLog(10))).toBe(bits(2.302585092994046));
        expect(bits(detLog(1e-300))).toBe(bits(-690.7755278982137));
        expect(bits(detLog(5e-324))).toBe(bits(-744.4400719213812));
        expect(bits(detLog(0.9999999999999999))).toBe(bits(-1.1102230246251565e-16));
    });

    it("agrees with the engine's Math.log to within one ulp over the unit interval and beyond", () => {
        const stream = new RandomStream(1, "test-log", 0);
        let exact = 0;
        const samples = 200_000;
        for (let i = 0; i < samples; i++) {
            const u = 1 - stream.nextFloat();
            const x = i % 4 === 0 ? u * 1e6 : u;
            const ours = detLog(x);
            const theirs = Math.log(x);
            if (ours === theirs) {
                exact++;
            } else {
                expect(Math.abs(ours - theirs)).toBeLessThanOrEqual(Math.abs(theirs) * 2.3e-16);
            }
        }
        // V8 and SpiderMonkey both ship fdlibm's log, so on them this is every sample
        expect(exact / samples).toBeGreaterThan(0.99);
    });
});
