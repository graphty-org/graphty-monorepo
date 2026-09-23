/**
 * The CPU references of `histogram` and `countingSortByKey` (spec 6 row 5; P4-T3): a bucket loop, and the STABLE
 * counting sort (indices in key order, ties in index order) whose `outStart` is the exclusive scan of the histogram.
 * The GPU scatter is only set-deterministic, so a test compares its `outIndex` by the KEY sequence it induces, never
 * index by index. Pure; no device.
 */

import { type U32 } from "@graphty/graph-format";

/**
 * The histogram of `keys` over `bins` bins; a key >= bins is not counted (the kernel's contract).
 * @param keys - the u32 keys
 * @param bins - the bin count (>= 1)
 * @returns `hist[k]` = the number of keys equal to k
 */
export function histogramOracle(keys: ArrayLike<number>, bins: number): U32 {
    const hist = new Uint32Array(bins);
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (k < bins) {
            hist[k] += 1;
        }
    }
    return hist;
}

/**
 * The stable counting sort of `keys` (every key < bins): `outStart` is the exclusive scan of the histogram and
 * `outIndex` lists the indices in key order, ties in index order.
 * @param keys - the u32 keys, each below bins
 * @param bins - the bin count (>= 1)
 * @returns the histogram, the bin starts and the sorted indices
 */
export function countingSortOracle(
    keys: ArrayLike<number>,
    bins: number,
): { readonly hist: U32; readonly outStart: U32; readonly outIndex: U32 } {
    const hist = histogramOracle(keys, bins);
    const outStart = new Uint32Array(bins);
    let acc = 0;
    for (let k = 0; k < bins; k++) {
        outStart[k] = acc;
        acc += hist[k];
    }
    const cursor = Uint32Array.from(outStart);
    const outIndex = new Uint32Array(keys.length);
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        outIndex[cursor[k]] = i;
        cursor[k] += 1;
    }
    return { hist, outStart, outIndex };
}
