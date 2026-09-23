/**
 * The cosine and sine of a uniformly drawn angle, the same bits on every engine.
 *
 * The angle is given as a turn fraction u in [0, 1) (angle 2 pi u), so the argument reduction is
 * exact: 8u splits into an octant k and a fraction f without rounding, and only f * pi / 4 rounds
 * once. On [0, pi / 4] the polynomials are fdlibm's `__kernel_sin` and `__kernel_cos` (FreeBSD
 * k_sin.c and k_cos.c, Sun Microsystems 1993) with a zero tail, evaluated with the four basic
 * operations only. Error a few ulp; bit-identical everywhere.
 */

const PIO4 = 7.85398163397448278999e-1;

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
const C5 = 2.08757232129817482790e-9;
const C6 = -1.13596475577881948265e-11;

/**
 * sin(x) for |x| <= pi / 4.
 * @param x - the argument
 * @returns the sine
 */
function kernelSin(x: number): number {
    const z = x * x;
    const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
    return x + z * x * (S1 + z * r);
}

/**
 * cos(x) for |x| <= pi / 4.
 * @param x - the argument
 * @returns the cosine
 */
function kernelCos(x: number): number {
    const z = x * x;
    const w = z * z;
    const r = z * (C1 + z * (C2 + z * C3)) + w * w * (C4 + z * (C5 + z * C6));
    const hz = 0.5 * z;
    const v = 1.0 - hz;
    return v + (1.0 - v - hz + z * r);
}

/**
 * cos(2 pi u) and sin(2 pi u).
 * @param u - the turn fraction, in [0, 1)
 * @param out - receives [cos, sin]
 */
export function detCosSinTurn(u: number, out: Float64Array): void {
    const t = u * 8;
    const octant = Math.floor(t);
    const x = (t - octant) * PIO4;
    // the octant's angle is (octant >> 1) quarter turns plus x (even octant) or pi/2 - (pi/4 - x)
    const odd = (octant & 1) === 1;
    const z = odd ? PIO4 - x : x;
    const c = odd ? kernelSin(z) : kernelCos(z);
    const s = odd ? kernelCos(z) : kernelSin(z);
    switch ((octant >> 1) & 3) {
        case 0:
            out[0] = c;
            out[1] = s;
            break;
        case 1:
            out[0] = -s;
            out[1] = c;
            break;
        case 2:
            out[0] = -c;
            out[1] = -s;
            break;
        default:
            out[0] = s;
            out[1] = -c;
    }
}
