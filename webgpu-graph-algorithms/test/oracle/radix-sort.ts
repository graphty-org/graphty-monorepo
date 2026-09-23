/**
 * The CPU reference of `radixSort` (spec 6 row 6; P4-T4): a STABLE sort of (key, value) pairs by the low `bits` of
 * the key in Number arithmetic, through Array.prototype.sort with the original index as the tie-break (which makes
 * the reference stable whatever the engine's sort is). Pure; no device.
 */

import { type U32 } from "@graphty/graph-format";

/**
 * The pairs sorted stably by `key mod 2^bits`.
 * @param keys - the u32 keys
 * @param vals - the u32 values (the same length)
 * @param bits - how many low bits of the key order the pairs (8, 16, 24 or 32)
 * @returns the sorted keys (whole words, not masked) and their values in the same order
 */
export function radixSortOracle(
    keys: ArrayLike<number>,
    vals: ArrayLike<number>,
    bits: number,
): { readonly keys: U32; readonly vals: U32 } {
    if (vals.length !== keys.length) {
        throw new Error(`radixSortOracle: ${keys.length} keys but ${vals.length} values`);
    }
    const modulus = 2 ** bits;
    const masked = new Float64Array(keys.length);
    for (let i = 0; i < keys.length; i++) {
        masked[i] = keys[i] % modulus;
    }
    const order = Array.from({ length: keys.length }, (_, i) => i);
    order.sort((a, b) => masked[a] - masked[b] || a - b);
    const outKeys = new Uint32Array(keys.length);
    const outVals = new Uint32Array(keys.length);
    for (let i = 0; i < order.length; i++) {
        outKeys[i] = keys[order[i]];
        outVals[i] = vals[order[i]];
    }
    return { keys: outKeys, vals: outVals };
}
