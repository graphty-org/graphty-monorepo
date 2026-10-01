/**
 * A natural logarithm that returns the same bits on every JavaScript engine.
 *
 * ECMAScript leaves `Math.log` "implementation-approximated", so two engines may differ in the
 * last bit, and a geometric skip `floor(log(u) / log(1 - p))` that lands on an integer boundary
 * would then pick a different edge. This is a port of fdlibm's `__ieee754_log` (e_log.c, Sun
 * Microsystems 1993, the code V8 and SpiderMonkey themselves use): it reads the exponent and
 * mantissa through a little-endian DataView and otherwise uses only IEEE-754 double addition,
 * subtraction, multiplication and division, which ECMAScript requires to be correctly rounded
 * (and forbids from being fused). So the result is a pure function of the input bits.
 * Error below 1 ulp.
 */

const LN2_HI = 6.9314718036912381649e-1; // 3fe62e42 fee00000
const LN2_LO = 1.90821492927058770002e-10; // 3dea39ef 35793c76
const TWO54 = 1.8014398509481984e16; // 43500000 00000000
const LG1 = 6.66666666666673513e-1; // 3FE55555 55555593
const LG2 = 3.999999999940941908e-1; // 3FD99999 9997FA04
const LG3 = 2.857142874366239149e-1; // 3FD24924 94229359
const LG4 = 2.222219843214978396e-1; // 3FCC71C5 1D8E78AF
const LG5 = 1.818357216161805012e-1; // 3FC74664 96CB03DE
const LG6 = 1.531383769920937332e-1; // 3FC39A09 D078C69F
const LG7 = 1.479819860511658591e-1; // 3FC2F112 DF3E5244

const view = new DataView(new ArrayBuffer(8));

/**
 * The natural logarithm of `x`, bit-identical across engines.
 * @param input - the argument
 * @returns ln(input); -Infinity for 0, NaN for negative input or NaN
 */
export function detLog(input: number): number {
    let x = input;
    view.setFloat64(0, x, true);
    let hx = view.getInt32(4, true);
    const lx = view.getUint32(0, true);

    let k = 0;
    if (hx < 0x00100000) {
        if (((hx & 0x7fffffff) | lx) === 0) {
            return -Infinity;
        }
        if (hx < 0) {
            return NaN;
        }
        // subnormal: scale up
        k -= 54;
        x *= TWO54;
        view.setFloat64(0, x, true);
        hx = view.getInt32(4, true);
    }
    if (hx >= 0x7ff00000) {
        return x + x;
    }
    k += (hx >> 20) - 1023;
    hx &= 0x000fffff;
    const i0 = (hx + 0x95f64) & 0x100000;
    // normalize x or x/2
    view.setInt32(4, hx | (i0 ^ 0x3ff00000), true);
    x = view.getFloat64(0, true);
    k += i0 >> 20;
    const f = x - 1.0;
    if ((0x000fffff & (2 + hx)) < 3) {
        // |f| < 2**-20
        if (f === 0) {
            return k === 0 ? 0 : k * LN2_HI + k * LN2_LO;
        }
        const r = f * f * (0.5 - 0.3333333333333333 * f);
        return k === 0 ? f - r : k * LN2_HI - (r - k * LN2_LO - f);
    }
    const s = f / (2.0 + f);
    const dk = k;
    const z = s * s;
    let i = hx - 0x6147a;
    const w = z * z;
    const j = 0x6b851 - hx;
    const t1 = w * (LG2 + w * (LG4 + w * LG6));
    const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
    i |= j;
    const R = t2 + t1;
    if (i > 0) {
        const hfsq = 0.5 * f * f;
        return k === 0 ? f - (hfsq - s * (hfsq + R)) : dk * LN2_HI - (hfsq - (s * (hfsq + R) + dk * LN2_LO) - f);
    }
    return k === 0 ? f - s * (f - R) : dk * LN2_HI - (s * (f - R) - dk * LN2_LO - f);
}
