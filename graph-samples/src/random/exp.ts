/**
 * An exponential and the power functions built on it, returning the same bits on every JavaScript
 * engine: a port of fdlibm's `__ieee754_exp` (e_exp.c, Sun Microsystems 1993), for the same reason
 * and with the same technique as `detLog` in log.ts -- the exponent is read and written through a
 * little-endian DataView and everything else is IEEE-754 double addition, subtraction,
 * multiplication and division, which ECMAScript requires to be correctly rounded. Error below 1 ulp.
 */

import { detLog } from "./log.js";

const O_THRESHOLD = 7.09782712893383973096e2;
const U_THRESHOLD = -7.45133219101941108420e2;
const LN2_HI = 6.93147180369123816490e-1;
const LN2_LO = 1.90821492927058770002e-10;
const INV_LN2 = 1.44269504088896338700;
const TWOM1000 = 9.33263618503218878990e-302;
const P1 = 1.66666666666666019037e-1;
const P2 = -2.77777777770155933842e-3;
const P3 = 6.61375632143793436117e-5;
const P4 = -1.65339022054652515390e-6;
const P5 = 4.13813679705723846039e-8;

const view = new DataView(new ArrayBuffer(8));

/**
 * `y * 2^k` for a y in [0.5, 2) and k >= -1021, by adding k to the exponent field.
 * @param y - the mantissa part
 * @param k - the power of two
 * @returns the scaled value
 */
function scale(y: number, k: number): number {
    view.setFloat64(0, y, true);
    view.setInt32(4, view.getInt32(4, true) + (k << 20), true);
    return view.getFloat64(0, true);
}

/**
 * e^x, bit-identical across engines.
 * @param x - the argument
 * @returns e^x; +Infinity above about 709.78, 0 below about -745.13, NaN for NaN
 */
export function detExp(x: number): number {
    view.setFloat64(0, x, true);
    const high = view.getInt32(4, true);
    const negative = high < 0 ? 1 : 0;
    const hx = high & 0x7fffffff;
    if (hx >= 0x40862e42) {
        if (hx >= 0x7ff00000) {
            // NaN stays NaN, +Infinity stays, -Infinity gives 0
            return negative === 0 || Number.isNaN(x) ? x + x : 0;
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
            hi = negative === 0 ? x - LN2_HI : x + LN2_HI;
            lo = negative === 0 ? LN2_LO : -LN2_LO;
            k = 1 - negative - negative;
        } else {
            k = Math.trunc(INV_LN2 * x + (negative === 0 ? 0.5 : -0.5));
            hi = x - k * LN2_HI;
            lo = k * LN2_LO;
        }
        r = hi - lo;
    } else if (hx < 0x3e300000) {
        // |x| < 2^-28
        return 1 + x;
    }
    const t = r * r;
    const c = r - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
    if (k === 0) {
        return 1 - ((r * c) / (c - 2.0) - r);
    }
    const y = 1 - (lo - (r * c) / (2.0 - c) - hi);
    return k >= -1021 ? scale(y, k) : scale(y, k + 1000) * TWOM1000;
}

/**
 * x^y as `detExp(y * detLog(x))` for x > 0: deterministic, not correctly rounded (the relative
 * error grows with |y ln x|, about 1e-13 for the magnitudes the generators use). 0^y is 0 for
 * y > 0.
 * @param x - the base, >= 0
 * @param y - the exponent
 * @returns x^y
 */
export function detPow(x: number, y: number): number {
    if (x === 0) {
        if (y === 0) {
            return 1;
        }
        return y > 0 ? 0 : Infinity;
    }
    return detExp(y * detLog(x));
}
