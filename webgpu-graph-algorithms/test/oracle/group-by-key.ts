/**
 * The CPU reference of the per-row group-by-key (design 8.6; the P11 plan's P11-T5): a Map per row from key to
 * summed weight, then the key with the largest sum, the lowest on a tie. The sums follow the primitive's documented
 * fixed-point rule -- each weight scaled by the row's power of two `2^s` (`maxWeight x degree x 2^s < 2^30`), rounded
 * to the nearest integer with halves up, negatives counted as 0 -- because that rule IS the primitive's contract: it
 * is what makes two tiers and two devices agree bitwise.
 */

import { type F32, type U32 } from "@graphty/graph-format";

const INVALID = 0xffffffff;
const bits = new DataView(new ArrayBuffer(4));

/**
 * The f32 bit pattern of a number.
 * @param x - the value (rounded to f32)
 * @returns its bits
 */
function f32Bits(x: number): number {
    bits.setFloat32(0, x, true);
    return bits.getUint32(0, true);
}

/**
 * The row's scale `2^s` from the exponents of `maxW` and `d` alone (no rounded product): `s = 28 - em - ed`, so
 * `maxW x d x 2^s` lies in [2^28, 2^30); the exponent is clamped to [-126, 126].
 * @param maxW - the row's largest weight (0 when every weight is <= 0)
 * @param d - the row's arc count
 * @returns the scale
 */
export function rowScale(maxW: number, d: number): number {
    const em = ((f32Bits(maxW) >>> 23) & 255) - 127;
    const ed = 31 - Math.clz32(Math.max(d, 1));
    const s = Math.min(126, Math.max(-126, 28 - em - ed));
    return 2 ** s;
}

/**
 * One weight in fixed point at a scale.
 * @param w - the weight
 * @param scale - the row's scale
 * @returns the integer
 */
export function quantize(w: number, scale: number): number {
    const x = Math.max(Math.fround(w * scale), 0);
    const i = Math.floor(x);
    return x - i >= 0.5 ? i + 1 : i;
}

/**
 * The best key and its score for every row.
 * @param rowPtr - the row offsets
 * @param colIdx - the targets
 * @param weights - one weight per arc, or null (every arc weighs 1)
 * @param keyIn - one key per node
 * @returns bestKey (INVALID_INDEX for an empty row) and bestScore (0 for an empty row)
 */
export function groupByKeyOracle(
    rowPtr: ArrayLike<number>,
    colIdx: ArrayLike<number>,
    weights: ArrayLike<number> | null,
    keyIn: ArrayLike<number>,
): { readonly bestKey: U32; readonly bestScore: F32 } {
    const n = rowPtr.length - 1;
    const bestKey = new Uint32Array(n);
    const bestScore = new Float32Array(n);
    for (let v = 0; v < n; v++) {
        const lo = rowPtr[v];
        const hi = rowPtr[v + 1];
        let maxW = 0;
        for (let a = lo; a < hi; a++) {
            maxW = Math.max(maxW, weights === null ? 1 : weights[a]);
        }
        const scale = rowScale(maxW, hi - lo);
        const sums = new Map<number, number>();
        for (let a = lo; a < hi; a++) {
            const k = keyIn[colIdx[a]];
            sums.set(k, (sums.get(k) ?? 0) + quantize(weights === null ? 1 : weights[a], scale));
        }
        let key = INVALID;
        let sum = 0;
        for (const [k, s] of sums) {
            if (s > sum || (s === sum && k < key)) {
                key = k;
                sum = s;
            }
        }
        bestKey[v] = key;
        bestScore[v] = Math.fround(sum) / scale;
    }
    return { bestKey, bestScore };
}
