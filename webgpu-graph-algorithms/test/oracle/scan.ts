/**
 * The CPU reference of `exclusiveScan` (spec 6 row 2; P4-T2): a sequential exclusive prefix sum over u32 words in
 * Number arithmetic modulo 2^32 (the kernel's u32 addition wraps the same way), and the total. Pure; no device.
 */

import { type U32 } from "@graphty/graph-format";

/** 2^32: the modulus of u32 addition. */
const TWO_32 = 4294967296;

/**
 * The exclusive prefix sum of `values` modulo 2^32 and the (wrapped) total.
 * @param values - the u32 words
 * @returns `out[i] = sum(values[0..i)) mod 2^32` and `total = sum(values) mod 2^32`
 */
export function scanOracle(values: ArrayLike<number>): { readonly out: U32; readonly total: number } {
    const out = new Uint32Array(values.length);
    let acc = 0;
    for (let i = 0; i < values.length; i++) {
        out[i] = acc;
        acc = (acc + values[i]) % TWO_32;
    }
    return { out, total: acc };
}
