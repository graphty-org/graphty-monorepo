/**
 * `log`, `exp`, `sin`, `cos`, `acos`, `hypot` and `pow` that return the same bits on every JavaScript engine.
 *
 * ECMAScript leaves `Math.log`, `Math.exp`, `Math.sin`, `Math.cos`, `Math.acos`, `Math.hypot` and `Math.pow`
 * "implementation-approximated", and engines do change their last bit between versions (Chromium 143 and 153
 * disagree on thousands of inputs). A seeded or iterative computation can amplify a one-bit difference into a
 * different result, so a seed would not mean the same output in every browser. `detLog`, `detExp`, `detSin`,
 * `detCos` and `detAcos` are ports of fdlibm 5.3 (Sun Microsystems 1993; e_log.c, e_exp.c, e_rem_pio2.c, k_sin.c,
 * k_cos.c, s_sin.c, s_cos.c, e_acos.c), the code V8 used before Chromium 153: they read the exponent and mantissa
 * through a DataView and otherwise use only IEEE-754 double addition, subtraction, multiplication, division and
 * `Math.sqrt`, which ECMAScript requires to be correctly rounded. So each result is a pure function of the input
 * bits. Error below 1 ulp, the same as fdlibm. `detHypot` is V8's own `Math.hypot` algorithm and `detPow` is built
 * on the others.
 * @module
 */

const view = new DataView(new ArrayBuffer(8));

/**
 * The high 32 bits of a double.
 * @param x - the double
 * @returns the sign, exponent and top 20 mantissa bits
 */
function high(x: number): number {
    view.setFloat64(0, x, true);
    return view.getInt32(4, true);
}

/**
 * The low 32 bits of a double.
 * @param x - the double
 * @returns the bottom 32 mantissa bits
 */
function low(x: number): number {
    view.setFloat64(0, x, true);
    return view.getUint32(0, true);
}

// ============================================================ log (e_log.c)

const LN2_HI = 6.9314718036912381649e-1; // 3fe62e42 fee00000
const LN2_LO = 1.90821492927058770002e-10; // 3dea39ef 35793c76
const TWO54 = 1.8014398509481984e16; // 43500000 00000000
const LG1 = 6.66666666666673513e-1;
const LG2 = 3.999999999940941908e-1;
const LG3 = 2.857142874366239149e-1;
const LG4 = 2.222219843214978396e-1;
const LG5 = 1.818357216161805012e-1;
const LG6 = 1.531383769920937332e-1;
const LG7 = 1.479819860511658591e-1;

/**
 * The natural logarithm, bit-identical across engines.
 * @param input - the argument
 * @returns ln(input); -Infinity for 0, NaN for negative input or NaN
 */
export function detLog(input: number): number {
    let x = input;
    let hx = high(x);
    const lx = low(x);
    let k = 0;
    if (hx < 0x00100000) {
        if (((hx & 0x7fffffff) | lx) === 0) {
            return -Infinity;
        }
        if (hx < 0) {
            return Number.NaN;
        }
        k -= 54; // subnormal: scale up
        x *= TWO54;
        hx = high(x);
    }
    if (hx >= 0x7ff00000) {
        return x + x;
    }
    k += (hx >> 20) - 1023;
    hx &= 0x000fffff;
    const i0 = (hx + 0x95f64) & 0x100000;
    view.setFloat64(0, x, true);
    view.setInt32(4, hx | (i0 ^ 0x3ff00000), true); // normalize x or x/2
    x = view.getFloat64(0, true);
    k += i0 >> 20;
    return logReduced(x - 1, k, hx);
}

/**
 * ln(1 + f) + k ln 2, the second half of e_log.c.
 * @param f - the reduced argument, in [sqrt(2)/2 - 1, sqrt(2) - 1]
 * @param k - the power of two taken out
 * @param hx - the top 20 mantissa bits of the input
 * @returns the logarithm
 */
function logReduced(f: number, k: number, hx: number): number {
    if ((0x000fffff & (2 + hx)) < 3) {
        // |f| < 2**-20
        if (f === 0) {
            return k === 0 ? 0 : k * LN2_HI + k * LN2_LO;
        }
        const r = f * f * (0.5 - 0.3333333333333333 * f);
        return k === 0 ? f - r : k * LN2_HI - (r - k * LN2_LO - f);
    }
    const s = f / (2 + f);
    const z = s * s;
    const w = z * z;
    const t1 = w * (LG2 + w * (LG4 + w * LG6));
    const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
    const R = t2 + t1;
    if (((hx - 0x6147a) | (0x6b851 - hx)) > 0) {
        const hfsq = 0.5 * f * f;
        return k === 0 ? f - (hfsq - s * (hfsq + R)) : k * LN2_HI - (hfsq - (s * (hfsq + R) + k * LN2_LO) - f);
    }
    return k === 0 ? f - s * (f - R) : k * LN2_HI - (s * (f - R) - k * LN2_LO - f);
}

// ============================================================ sin and cos (k_sin.c, k_cos.c, e_rem_pio2.c)

const S1 = -1.66666666666666324348e-1;
const S2 = 8.33333333332248946124e-3;
const S3 = -1.98412698298579493134e-4;
const S4 = 2.75573137070700676789e-6;
const S5 = -2.50507602534068634195e-8;
const S6 = 1.58969099521155010221e-10;

const C1 = 4.16666666666666019037e-2;
const C2 = -1.38888888888741095749e-3;
const C3 = 2.48015872894767294178e-5;
const C4 = -2.75573143513906633035e-7;
const C5 = 2.0875723212981748279e-9;
const C6 = -1.13596475577881948265e-11;

/**
 * sin(x + y) for |x| <= pi / 4, y the tail of x.
 * @param x - the head
 * @param y - the tail
 * @param iy - 0 when y is known to be 0
 * @returns the sine
 */
function kernelSin(x: number, y: number, iy: number): number {
    if ((high(x) & 0x7fffffff) < 0x3e400000 && Math.trunc(x) === 0) {
        return x; // |x| < 2**-27
    }
    const z = x * x;
    const v = z * x;
    const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
    if (iy === 0) {
        return x + v * (S1 + z * r);
    }
    return x - (z * (0.5 * y - v * r) - y - v * S1);
}

/**
 * cos(x + y) for |x| <= pi / 4, y the tail of x.
 * @param x - the head
 * @param y - the tail
 * @returns the cosine
 */
function kernelCos(x: number, y: number): number {
    const ix = high(x) & 0x7fffffff;
    if (ix < 0x3e400000 && Math.trunc(x) === 0) {
        return 1; // |x| < 2**-27
    }
    const z = x * x;
    const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
    if (ix < 0x3fd33333) {
        return 1 - (0.5 * z - (z * r - x * y)); // |x| < 0.3
    }
    let qx: number;
    if (ix > 0x3fe90000) {
        qx = 0.28125; // |x| > 0.78125
    } else {
        view.setInt32(4, ix - 0x00200000, true); // x / 4
        view.setUint32(0, 0, true);
        qx = view.getFloat64(0, true);
    }
    const hz = 0.5 * z - qx;
    const a = 1 - qx;
    return a - (hz - (z * r - x * y));
}

const INVPIO2 = 6.36619772367581382433e-1;
const PIO2_1 = 1.57079632673412561417; // first 33 bits of pi/2
const PIO2_1T = 6.07710050650619224932e-11; // pi/2 - PIO2_1
const PIO2_2 = 6.0771005063039659766e-11; // second 33 bits of pi/2
const PIO2_2T = 2.02226624879595063154e-21; // pi/2 - (PIO2_1 + PIO2_2)
const PIO2_3 = 2.0222662487111664558e-21; // third 33 bits of pi/2
const PIO2_3T = 8.47842766036889956997e-32; // pi/2 - (PIO2_1 + PIO2_2 + PIO2_3)

const reduced = new Float64Array(2);

/**
 * x - n pi / 2 as the pair `reduced[0] + reduced[1]`, |x| > pi / 4.
 * @param x - the argument
 * @returns n
 */
function remPio2(x: number): number {
    const hx = high(x);
    const ix = hx & 0x7fffffff;
    if (ix < 0x4002d97c) {
        // |x| < 3pi/4, n = +-1
        const sign = hx > 0 ? 1 : -1;
        let z = x - sign * PIO2_1;
        if (ix === 0x3ff921fb) {
            z -= sign * PIO2_2; // near pi/2: use 33+33+53 bit pi
            reduced[0] = z - sign * PIO2_2T;
            reduced[1] = z - reduced[0] - sign * PIO2_2T;
        } else {
            reduced[0] = z - sign * PIO2_1T;
            reduced[1] = z - reduced[0] - sign * PIO2_1T;
        }
        return sign;
    }
    const t = Math.abs(x);
    const n = Math.floor(t * INVPIO2 + 0.5);
    let r = t - n * PIO2_1;
    let w = n * PIO2_1T; // 1st round, good to 85 bits
    const j = ix >> 20;
    let y0 = r - w;
    let i = j - ((high(y0) >> 20) & 0x7ff);
    if (i > 16) {
        // 2nd iteration, good to 118 bits
        let tt = r;
        w = n * PIO2_2;
        r = tt - w;
        w = n * PIO2_2T - (tt - r - w);
        y0 = r - w;
        i = j - ((high(y0) >> 20) & 0x7ff);
        if (i > 49) {
            // 3rd iteration, 151 bits
            tt = r;
            w = n * PIO2_3;
            r = tt - w;
            w = n * PIO2_3T - (tt - r - w);
            y0 = r - w;
        }
    }
    const y1 = r - y0 - w;
    if (hx < 0) {
        reduced[0] = -y0;
        reduced[1] = -y1;
        return -n;
    }
    reduced[0] = y0;
    reduced[1] = y1;
    return n;
}

const TWO_PI = 6.283185307179586;

/**
 * An angle beyond fdlibm's medium range (|x| > 2^19 pi / 2, about 8e5 radians) brought back below 2 pi.
 * ponytail: fdlibm's large case (__kernel_rem_pio2, a 1200-bit 2/pi table) is not ported. `%` is exact in
 * ECMAScript, so this stays deterministic; its error is |x| / 2pi times the 2.4e-16 by which the double 2pi misses
 * 2pi (4e-11 rad at x = 1e6). Port the large case if a layout ever draws at such angles.
 * @param x - the angle
 * @param ix - its high word without the sign
 * @returns an angle within 2 pi of 0 with nearly the same sine and cosine
 */
function clampHuge(x: number, ix: number): number {
    return ix > 0x413921fb ? x % TWO_PI : x;
}

/**
 * The sine, bit-identical across engines.
 * @param x - the angle in radians
 * @returns sin(x); NaN for an infinite or NaN argument
 */
export function detSin(x: number): number {
    const ix = high(x) & 0x7fffffff;
    if (ix <= 0x3fe921fb) {
        return kernelSin(x, 0, 0);
    }
    if (ix >= 0x7ff00000) {
        return Number.NaN;
    }
    switch (remPio2(clampHuge(x, ix)) & 3) {
        case 0:
            return kernelSin(reduced[0], reduced[1], 1);
        case 1:
            return kernelCos(reduced[0], reduced[1]);
        case 2:
            return -kernelSin(reduced[0], reduced[1], 1);
        default:
            return -kernelCos(reduced[0], reduced[1]);
    }
}

/**
 * The cosine, bit-identical across engines.
 * @param x - the angle in radians
 * @returns cos(x); NaN for an infinite or NaN argument
 */
export function detCos(x: number): number {
    const ix = high(x) & 0x7fffffff;
    if (ix <= 0x3fe921fb) {
        return kernelCos(x, 0);
    }
    if (ix >= 0x7ff00000) {
        return Number.NaN;
    }
    switch (remPio2(clampHuge(x, ix)) & 3) {
        case 0:
            return kernelCos(reduced[0], reduced[1]);
        case 1:
            return -kernelSin(reduced[0], reduced[1], 1);
        case 2:
            return -kernelCos(reduced[0], reduced[1]);
        default:
            return kernelSin(reduced[0], reduced[1], 1);
    }
}

// ============================================================ acos (e_acos.c)

const PI = 3.141592653589793116;
const PIO2_HI = 1.570796326794896558;
const PIO2_LO = 6.12323399573676603587e-17;
const PS0 = 1.66666666666666657415e-1;
const PS1 = -3.25565818622400915405e-1;
const PS2 = 2.01212532134862925881e-1;
const PS3 = -4.00555345006794114027e-2;
const PS4 = 7.91534994289814532176e-4;
const PS5 = 3.4793310759602116757e-5;
const QS1 = -2.40339491173441421878;
const QS2 = 2.02094576023350569471;
const QS3 = -6.8828397160545329303e-1;
const QS4 = 7.70381505559019352791e-2;

/**
 * The rational approximation of e_acos.c.
 * @param z - the reduced argument
 * @returns p(z) / q(z)
 */
function acosRatio(z: number): number {
    const p = z * (PS0 + z * (PS1 + z * (PS2 + z * (PS3 + z * (PS4 + z * PS5)))));
    const q = 1 + z * (QS1 + z * (QS2 + z * (QS3 + z * QS4)));
    return p / q;
}

/**
 * The arc cosine, bit-identical across engines.
 * @param x - the argument
 * @returns acos(x) in [0, pi]; NaN outside [-1, 1]
 */
export function detAcos(x: number): number {
    const hx = high(x);
    const ix = hx & 0x7fffffff;
    if (ix >= 0x3ff00000) {
        if (((ix - 0x3ff00000) | low(x)) === 0) {
            return hx > 0 ? 0 : PI + 2 * PIO2_LO; // acos(+-1)
        }
        return Number.NaN; // |x| > 1
    }
    if (ix < 0x3fe00000) {
        // |x| < 0.5
        if (ix <= 0x3c600000) {
            return PIO2_HI + PIO2_LO; // |x| < 2**-57
        }
        return PIO2_HI - (x - (PIO2_LO - x * acosRatio(x * x)));
    }
    if (hx < 0) {
        // x < -0.5
        const z = (1 + x) * 0.5;
        const s = Math.sqrt(z);
        const w = acosRatio(z) * s - PIO2_LO;
        return PI - 2 * (s + w);
    }
    // x > 0.5
    const z = (1 - x) * 0.5;
    const s = Math.sqrt(z);
    view.setFloat64(0, s, true);
    view.setUint32(0, 0, true);
    const df = view.getFloat64(0, true);
    const c = (z - df * df) / (s + df);
    const w = acosRatio(z) * s + c;
    return 2 * (df + w);
}

// ============================================================ exp (e_exp.c)

const O_THRESHOLD = 7.09782712893383973096e2;
const U_THRESHOLD = -7.4513321910194110842e2;
const INV_LN2 = 1.442695040888963387;
const TWOM1000 = 9.3326361850321887899e-302;
const P1 = 1.66666666666666019037e-1;
const P2 = -2.77777777770155933842e-3;
const P3 = 6.61375632143793436117e-5;
const P4 = -1.6533902205465251539e-6;
const P5 = 4.13813679705723846039e-8;

/**
 * `y * 2^k` for a y in [0.5, 2) and k >= -1021, by adding k to the exponent field.
 * @param y - the mantissa part
 * @param k - the power of two
 * @returns the scaled value
 */
function scaleByPowerOfTwo(y: number, k: number): number {
    view.setFloat64(0, y, true);
    view.setInt32(4, view.getInt32(4, true) + (k << 20), true);
    return view.getFloat64(0, true);
}

/**
 * e^x, bit-identical across engines.
 * @param x - the argument
 * @returns e^x; +Infinity above about 709.78, 0 below about -745.13, NaN for NaN. detExp(1) is fdlibm's
 * 2.7182818284590455, 1 ulp above `Math.E`, which V8 returns as a special case.
 */
export function detExp(x: number): number {
    const hxSigned = high(x);
    const negative = hxSigned < 0;
    const hx = hxSigned & 0x7fffffff;
    if (hx >= 0x40862e42) {
        if (hx >= 0x7ff00000) {
            // NaN stays NaN, +Infinity stays, -Infinity gives 0
            return !negative || Number.isNaN(x) ? x + x : 0;
        }
        if (x > O_THRESHOLD) {
            return Infinity;
        }
        if (x < U_THRESHOLD) {
            return 0;
        }
    }
    let hi = 0;
    let lo = 0;
    let k = 0;
    let r = x;
    if (hx > 0x3fd62e42) {
        // |x| > 0.5 ln 2: reduce to r = x - k ln 2
        if (hx < 0x3ff0a2b2) {
            hi = negative ? x + LN2_HI : x - LN2_HI;
            lo = negative ? -LN2_LO : LN2_LO;
            k = negative ? -1 : 1;
        } else {
            k = Math.trunc(INV_LN2 * x + (negative ? -0.5 : 0.5));
            hi = x - k * LN2_HI;
            lo = k * LN2_LO;
        }
        r = hi - lo;
    } else if (hx < 0x3e300000) {
        return 1 + x; // |x| < 2**-28
    }
    const t = r * r;
    const c = r - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
    if (k === 0) {
        return 1 - ((r * c) / (c - 2) - r);
    }
    const y = 1 - (lo - (r * c) / (2 - c) - hi);
    return k >= -1021 ? scaleByPowerOfTwo(y, k) : scaleByPowerOfTwo(y, k + 1000) * TWOM1000;
}

// ============================================================ hypot

/**
 * The square root of the sum of squares, bit-identical across engines. This is V8's own `Math.hypot`: scale by
 * the largest magnitude, add the squares with Kahan compensation, take the correctly rounded `Math.sqrt`.
 * @param values - the components
 * @returns sqrt(sum of squares); Infinity if any component is infinite, else NaN if any is NaN; 0 for none
 */
export function detHypot(...values: number[]): number {
    let max = 0;
    let nan = false;
    for (const v of values) {
        const a = Math.abs(v);
        if (Number.isNaN(a)) {
            nan = true;
        } else if (a > max) {
            max = a;
        }
    }
    if (max === Infinity) {
        return Infinity;
    }
    if (nan) {
        return Number.NaN;
    }
    if (max === 0) {
        return 0;
    }
    let sum = 0;
    let compensation = 0;
    for (const v of values) {
        const n = Math.abs(v) / max;
        const summand = n * n - compensation;
        const preliminary = sum + summand;
        compensation = preliminary - sum - summand;
        sum = preliminary;
    }
    return Math.sqrt(sum) * max;
}

// ============================================================ pow

/**
 * x^y, bit-identical across engines. An integer exponent up to 1024 in magnitude is binary exponentiation, so
 * `detPow(x, 2)` is exactly `x * x` and `detPow(x, -1)` exactly `1 / x`, as fdlibm gives; otherwise it is
 * `Math.sqrt(x)` for y = 0.5 and `detExp(y * detLog(|x|))` for the rest, which is not correctly rounded: its relative error is about |y ln x| times 1.1e-16.
 * The special values follow `Math.pow`.
 * @param x - the base
 * @param y - the exponent
 * @returns x^y
 */
export function detPow(x: number, y: number): number {
    if (y === 0) {
        return 1;
    }
    if (Number.isNaN(x) || Number.isNaN(y)) {
        return Number.NaN;
    }
    const integer = Number.isInteger(y);
    if (integer && Math.abs(y) <= 1024) {
        let base = x;
        let n = Math.abs(y);
        let result = 1;
        for (;;) {
            if (n & 1) {
                result *= base;
            }
            n >>>= 1;
            if (n === 0) {
                break;
            }
            base *= base;
        }
        return y < 0 ? 1 / result : result;
    }
    const ax = Math.abs(x);
    if (!Number.isFinite(y)) {
        if (ax === 1) {
            return Number.NaN;
        }
        return ax > 1 === y > 0 ? Infinity : 0;
    }
    let result: number;
    if (ax === 0) {
        result = y > 0 ? 0 : Infinity;
    } else if (ax === Infinity) {
        result = y > 0 ? Infinity : 0;
    } else if (x < 0 && !integer) {
        return Number.NaN;
    } else if (y === 0.5) {
        result = Math.sqrt(ax); // as fdlibm, which returns sqrt(x) here
    } else {
        result = detExp(y * detLog(ax));
    }
    const odd = integer && y % 2 !== 0;
    return odd && (x < 0 || Object.is(x, -0)) ? -result : result;
}
