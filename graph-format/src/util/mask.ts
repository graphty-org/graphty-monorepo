/**
 * The public packed-mask helpers of design section 7.4 (makeMask, maskTest, maskSet, maskCount,
 * maskToIndices), the word-wise set algebra over them (maskAnd, maskOr, maskAndNot, maskXor,
 * maskNot), plus the E_MASK_LENGTH check that filterEdges() and inducedSubgraph({ mask }) apply
 * to a caller's mask. A NodeMask / EdgeMask is the same layout as a validity bitmap and a bool column
 * (decision C13): ceil(length / 32) Uint32Array words, LSB-first, bit i set means index i is included.
 * Masks are not part of the snapshot contract; no kernel is required to honour one.
 */

import {
    bitmapCount,
    bitmapGet,
    bitmapToIndices,
    bitmapWordCount,
    bitmapWrite,
    lastWordMask,
    makeBitmap,
} from "../columns/bitmap.js";
import { GraphFormatError } from "../errors.js";
import { type U32 } from "../types/index.js";

/**
 * Allocate a packed mask over `length` indices: ceil(length / 32) words, every bit clear, or every bit
 * below `length` set when `fill` is true (design section 7.4).
 * @param length - the number of indices the mask covers (nodeCount, edgeCount or arcCount)
 * @param fill - the initial value of every bit; defaults to false
 * @returns the mask words
 */
export function makeMask(length: number, fill?: boolean): U32 {
    return makeBitmap(length, fill === true);
}

/**
 * Whether index i is in the mask.
 * @param mask - the mask words
 * @param i - the index, below the mask's length
 * @returns true when bit i is set
 */
export function maskTest(mask: U32, i: number): boolean {
    return bitmapGet(mask, i);
}

/**
 * Include or exclude index i.
 * @param mask - the mask words
 * @param i - the index, below the mask's length
 * @param value - true to include, false to exclude
 */
export function maskSet(mask: U32, i: number, value: boolean): void {
    bitmapWrite(mask, i, value);
}

/**
 * The number of included indices below `length` (the loop guard of an algorithm-owned alive mask,
 * design section 7.4).
 * @param mask - the mask words, at least ceil(length / 32) of them
 * @param length - the number of indices the mask covers
 * @returns the number of set bits in [0, length)
 */
export function maskCount(mask: U32, length: number): number {
    return bitmapCount(mask, length);
}

/**
 * The included indices below `length` in ascending order, as a fresh U32.
 * @param mask - the mask words, at least ceil(length / 32) of them
 * @param length - the number of indices the mask covers
 * @returns the set bit indices
 */
export function maskToIndices(mask: U32, length: number): U32 {
    return bitmapToIndices(mask, length);
}

/**
 * Check that a caller-supplied mask has enough words for `length` indices; filterEdges() and
 * inducedSubgraph({ mask }) call it before reading the mask (design section 11.2). Throws
 * E_MASK_LENGTH when mask.length < ceil(length / 32).
 * @param mask - the mask words
 * @param length - the number of indices the mask must cover
 * @param what - what the mask is over, for the message ("edges", "nodes")
 */
export function checkMaskLength(mask: U32, length: number, what: string): void {
    const required = bitmapWordCount(length);
    if (mask.length < required) {
        throw new GraphFormatError(
            "E_MASK_LENGTH",
            `mask over ${what} has ${mask.length} words; ${required} needed for ${length} ${what}`,
            { found: mask.length, required, length },
        );
    }
}

// ============================================================ word-wise algebra

/**
 * Check the operand lengths of a word-wise op and return the output words: `out` when given (checked
 * like the inputs), else a fresh clear mask.
 * @param length - the number of indices the op covers
 * @param inputs - the operand masks
 * @param out - the caller's output mask, or undefined for a fresh one
 * @returns the mask to write
 */
function prepare(length: number, inputs: readonly U32[], out: U32 | undefined): U32 {
    for (const input of inputs) {
        checkMaskLength(input, length, "indices");
    }
    if (out === undefined) {
        return makeBitmap(length, false);
    }
    checkMaskLength(out, length, "indices");
    return out;
}

/**
 * Clear the bits of the last written word at or above `length`, so a result never includes an
 * index outside the mask whatever the inputs carried there.
 * @param out - the result words
 * @param length - the number of indices
 */
function clearTail(out: U32, length: number): void {
    const words = bitmapWordCount(length);
    if (words > 0) {
        out[words - 1] &= lastWordMask(length);
    }
}

/**
 * Intersection: index i is in the result when it is in both `a` and `b`. One pass over the
 * ceil(length / 32) packed words (LSB-first, bit i of word i >>> 5 is index i, design section 7.4);
 * bits at or above `length` are clear in the result. Words of `out` beyond ceil(length / 32) are not
 * touched. `out` may alias `a` or `b`. Throws E_MASK_LENGTH when any mask has fewer than
 * ceil(length / 32) words.
 * @param a - the first mask
 * @param b - the second mask
 * @param length - the number of indices both masks cover
 * @param out - the mask to write the result into; a fresh mask when omitted
 * @returns `out`, or the fresh result
 */
export function maskAnd(a: U32, b: U32, length: number, out?: U32): U32 {
    const result = prepare(length, [a, b], out);
    const words = bitmapWordCount(length);
    for (let w = 0; w < words; w++) {
        result[w] = a[w] & b[w];
    }
    clearTail(result, length);
    return result;
}

/**
 * Union: index i is in the result when it is in `a` or `b`. Same packed layout, tail and `out`
 * rules and E_MASK_LENGTH check as maskAnd.
 * @param a - the first mask
 * @param b - the second mask
 * @param length - the number of indices both masks cover
 * @param out - the mask to write the result into; a fresh mask when omitted
 * @returns `out`, or the fresh result
 */
export function maskOr(a: U32, b: U32, length: number, out?: U32): U32 {
    const result = prepare(length, [a, b], out);
    const words = bitmapWordCount(length);
    for (let w = 0; w < words; w++) {
        result[w] = a[w] | b[w];
    }
    clearTail(result, length);
    return result;
}

/**
 * Difference: index i is in the result when it is in `a` and not in `b`. Same packed layout, tail
 * and `out` rules and E_MASK_LENGTH check as maskAnd.
 * @param a - the mask to subtract from
 * @param b - the mask to subtract
 * @param length - the number of indices both masks cover
 * @param out - the mask to write the result into; a fresh mask when omitted
 * @returns `out`, or the fresh result
 */
export function maskAndNot(a: U32, b: U32, length: number, out?: U32): U32 {
    const result = prepare(length, [a, b], out);
    const words = bitmapWordCount(length);
    for (let w = 0; w < words; w++) {
        result[w] = a[w] & ~b[w];
    }
    clearTail(result, length);
    return result;
}

/**
 * Symmetric difference: index i is in the result when it is in exactly one of `a` and `b`. Same
 * packed layout, tail and `out` rules and E_MASK_LENGTH check as maskAnd.
 * @param a - the first mask
 * @param b - the second mask
 * @param length - the number of indices both masks cover
 * @param out - the mask to write the result into; a fresh mask when omitted
 * @returns `out`, or the fresh result
 */
export function maskXor(a: U32, b: U32, length: number, out?: U32): U32 {
    const result = prepare(length, [a, b], out);
    const words = bitmapWordCount(length);
    for (let w = 0; w < words; w++) {
        result[w] = a[w] ^ b[w];
    }
    clearTail(result, length);
    return result;
}

/**
 * Complement within [0, length): index i is in the result when it is not in `a`. The result never
 * sets a bit at or above `length`, so maskCount(maskNot(a, n), n) is n - maskCount(a, n). Same packed
 * layout and `out` rules and E_MASK_LENGTH check as maskAnd.
 * @param a - the mask
 * @param length - the number of indices the mask covers
 * @param out - the mask to write the result into; a fresh mask when omitted
 * @returns `out`, or the fresh result
 */
export function maskNot(a: U32, length: number, out?: U32): U32 {
    const result = prepare(length, [a], out);
    const words = bitmapWordCount(length);
    for (let w = 0; w < words; w++) {
        result[w] = ~a[w];
    }
    clearTail(result, length);
    return result;
}
