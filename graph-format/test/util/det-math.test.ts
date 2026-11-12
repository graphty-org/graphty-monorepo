import { afterEach, describe, expect, it, vi } from "vitest";

import { detAcos, detCos, detExp, detHypot, detLog, detPow, detSin } from "../../src/index.js";

const view = new DataView(new ArrayBuffer(16));

/** The distance in units in the last place between two doubles of the same sign. */
function ulps(a: number, b: number): number {
    view.setFloat64(0, a);
    view.setFloat64(8, b);
    const d = view.getBigInt64(0) - view.getBigInt64(8);
    return Number(d < 0n ? -d : d);
}

/** The bits of a double, so a test can tell 0 from -0 and pin the last bit. */
function bits(x: number): bigint {
    view.setFloat64(0, x);
    return view.getBigUint64(0);
}

/**
 * A fixed sequence of doubles in [0, 1), the same in every engine.
 * @param count - how many
 * @yields the next double
 */
function* uniform(count: number): Generator<number> {
    let x = 12345;
    for (let i = 0; i < count; i++) {
        x = (Math.imul(x, 1103515245) + 12345) >>> 0;
        yield x / 4294967296;
    }
}

const ENGINE_APPROXIMATED = [
    "log",
    "exp",
    "sin",
    "cos",
    "tan",
    "acos",
    "asin",
    "atan",
    "atan2",
    "cbrt",
    "hypot",
    "pow",
    "log1p",
    "expm1",
    "log2",
    "log10",
] as const;

describe("engine-independent math", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("stays within 1 ulp of Math over wide ranges", () => {
        // fdlibm's error bound; in an engine that uses fdlibm (Node 22, Chromium 143) the results are identical
        const cases: [string, (x: number) => number, (x: number) => number, (u: number) => number][] = [
            ["log", detLog, Math.log, (u) => 10 ** (-300 + 600 * u)],
            ["log", detLog, Math.log, (u) => 1 + 100 * u],
            ["exp", detExp, Math.exp, (u) => (2 * u - 1) * 740],
            ["exp", detExp, Math.exp, (u) => -50 * u],
            ["sin", detSin, Math.sin, (u) => (2 * u - 1) * 1e5],
            ["cos", detCos, Math.cos, (u) => (2 * u - 1) * 1e5],
            ["sin", detSin, Math.sin, (u) => (2 * u - 1) * 7],
            ["cos", detCos, Math.cos, (u) => (2 * u - 1) * 7],
            ["acos", detAcos, Math.acos, (u) => 2 * u - 1],
        ];
        for (const [name, det, ref, gen] of cases) {
            for (const u of uniform(10000)) {
                const x = gen(u);
                const a = det(x);
                const b = ref(x);
                expect(ulps(a, b), `${name}(${String(x)}): ${String(a)} vs ${String(b)}`).toBeLessThanOrEqual(1);
            }
        }
    });

    it("returns fdlibm's bits", () => {
        // Chromium 153 returns 7.777230250455667 for this log, the input of issue #2430
        expect(bits(detLog(2385.6579861603677))).toBe(bits(7.777230250455666));
        expect(bits(detExp(1))).toBe(bits(2.7182818284590455));
        expect(bits(detExp(-1))).toBe(bits(0.36787944117144233));
        expect(bits(detExp(10))).toBe(bits(22026.465794806718));
        expect(bits(detExp(700))).toBe(bits(1.0142320547350045e304));
        expect(bits(detSin(1))).toBe(bits(0.8414709848078965));
        expect(bits(detCos(1))).toBe(bits(0.5403023058681398));
    });

    it("handles the special values", () => {
        expect(detLog(0)).toBe(-Infinity);
        expect(detLog(-1)).toBeNaN();
        expect(detLog(Number.NaN)).toBeNaN();
        expect(detLog(Infinity)).toBe(Infinity);
        expect(detLog(1)).toBe(0);
        expect(detLog(Number.MIN_VALUE)).toBe(Math.log(Number.MIN_VALUE));
        expect(detLog(Number.MIN_VALUE * 12345)).toBe(Math.log(Number.MIN_VALUE * 12345));
        expect(detExp(0)).toBe(1);
        expect(detExp(-0)).toBe(1);
        expect(detExp(Infinity)).toBe(Infinity);
        expect(detExp(-Infinity)).toBe(0);
        expect(detExp(Number.NaN)).toBeNaN();
        expect(detExp(710)).toBe(Infinity);
        expect(detExp(-746)).toBe(0);
        expect(detExp(-740)).toBe(Math.exp(-740)); // a subnormal result
        expect(detExp(1e-30)).toBe(1);
        expect(detSin(Infinity)).toBeNaN();
        expect(detCos(Number.NaN)).toBeNaN();
        expect(Object.is(detSin(-0), -0)).toBe(true);
        expect(detSin(Number.MIN_VALUE)).toBe(Number.MIN_VALUE);
        expect(detCos(0)).toBe(1);
        expect(Math.abs(detSin(1e300))).toBeLessThanOrEqual(1);
        expect(detAcos(1)).toBe(0);
        expect(detAcos(-1)).toBe(Math.PI);
        expect(detAcos(1.5)).toBeNaN();
    });

    it("hypot is V8's Math.hypot bit for bit", () => {
        const gen = uniform(60000);
        const next = (): number => {
            const u = gen.next().value as number;
            return (u - 0.5) * 10 ** ((Math.trunc(u * 1e6) % 40) - 20);
        };
        for (let i = 0; i < 10000; i++) {
            const [a, b, c] = [next(), next(), next()];
            expect(bits(detHypot(a, b))).toBe(bits(Math.hypot(a, b)));
            expect(bits(detHypot(a, b, c))).toBe(bits(Math.hypot(a, b, c)));
        }
        expect(detHypot()).toBe(0);
        expect(detHypot(0, -0)).toBe(0);
        expect(detHypot(3, 4)).toBe(5);
        expect(detHypot(-3)).toBe(3);
        expect(detHypot(Number.NaN, Infinity)).toBe(Infinity);
        expect(detHypot(Number.NaN, 1)).toBeNaN();
        expect(detHypot(1e300, 1e300)).toBe(Math.hypot(1e300, 1e300)); // no overflow
        expect(detHypot(Number.MIN_VALUE, Number.MIN_VALUE)).toBe(Math.hypot(Number.MIN_VALUE, Number.MIN_VALUE));
    });

    it("pow is exact multiplication for small integer exponents and Math.pow's special values", () => {
        for (const x of uniform(10000)) {
            expect(bits(detPow(x, 2))).toBe(bits(x * x));
            expect(bits(detPow(x, 1))).toBe(bits(x));
            expect(bits(detPow(x * 100, -1))).toBe(bits(1 / (x * 100)));
            expect(bits(detPow(x, 0.5))).toBe(bits(Math.sqrt(x)));
            expect(detPow(x, 3)).toBeCloseTo(x * x * x, 15);
            expect(detPow(x, 1.7) / Math.pow(x, 1.7)).toBeCloseTo(1, 13);
        }
        const specials = [
            0,
            -0,
            1,
            -1,
            0.5,
            -0.5,
            2,
            -2,
            3,
            -3,
            1.5,
            Infinity,
            -Infinity,
            Number.NaN,
            Number.MIN_VALUE,
        ];
        for (const x of specials) {
            for (const y of [...specials, 2049, -2049, 1e20]) {
                const ours = detPow(x, y);
                const theirs = Math.pow(x, y);
                // the special values must agree exactly; finite results only to rounding
                if (!Number.isFinite(theirs) || theirs === 0 || Number.isNaN(theirs)) {
                    expect(Object.is(ours, theirs), `pow(${String(x)}, ${String(y)})`).toBe(true);
                } else {
                    expect(ours / theirs, `pow(${String(x)}, ${String(y)})`).toBeCloseTo(1, 12);
                }
            }
        }
    });

    it("never calls an engine-approximated Math function", () => {
        for (const name of ENGINE_APPROXIMATED) {
            vi.spyOn(Math, name).mockImplementation(() => {
                throw new Error(`Math.${name} called`);
            });
        }
        for (const x of [0, 1e-310, 0.3, 0.7, 1, 2.5, 100, 1e6, -0.4, -3, 700, -740]) {
            detLog(Math.abs(x));
            detExp(x);
            detSin(x);
            detCos(x);
            detAcos(Math.max(-1, Math.min(1, x)));
            detHypot(x, 2 * x, 3);
            detPow(Math.abs(x), 1.5);
            detPow(x, 3);
            detPow(x, -2049);
        }
    });
});
