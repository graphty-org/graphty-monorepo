/**
 * The CPU references of `compact` and `dedupe` (spec 6 row 4; P8-T3): `compactOracle` is Array.prototype.filter over
 * the flags in queue order (order-preserving, so the kernel's output is compared bitwise), and `dedupeOracle` is a
 * Set walk keeping the FIRST occurrence of every vertex. The kernel keeps the LAST writer's index instead, so a test
 * compares the two as sets (sorted), never entry for entry. Pure; no device.
 */

import { type U32 } from "@graphty/graph-format";

/**
 * The entries of `queue` whose flag is non-zero, in queue order, and their count.
 * @param queue - the entries
 * @param flags - one word per entry, 0 or 1 (any non-zero keeps)
 * @returns `out` (exactly `count` words) and `count`
 */
export function compactOracle(queue: ArrayLike<number>, flags: ArrayLike<number>): { readonly out: U32; readonly count: number } {
    if (flags.length !== queue.length) {
        throw new Error(`compactOracle: ${flags.length} flags for ${queue.length} entries`);
    }
    const kept: number[] = [];
    for (let i = 0; i < queue.length; i++) {
        if (flags[i] !== 0) {
            kept.push(queue[i]);
        }
    }
    return { out: Uint32Array.from(kept), count: kept.length };
}

/**
 * The distinct vertices of `queue`, each at its first occurrence, in queue order.
 * @param queue - the entries (vertex indices)
 * @returns the surviving vertices (exactly one per distinct value)
 */
export function dedupeOracle(queue: ArrayLike<number>): U32 {
    const seen = new Set<number>();
    const kept: number[] = [];
    for (let i = 0; i < queue.length; i++) {
        const v = queue[i];
        if (!seen.has(v)) {
            seen.add(v);
            kept.push(v);
        }
    }
    return Uint32Array.from(kept);
}
