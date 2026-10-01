/**
 * The CPU reference of `advance` (design 6 row 8; P8-T5): a nested loop -- for each frontier vertex in order, for
 * each of its arcs in row order, the target vertex. The kernel's edge queue is the same MULTISET in the schedule's
 * order (the workgroups reserve their spans by `atomicAdd`), so a test sorts both sides before comparing. Pure; no
 * device; nothing from `src/`.
 */

import { type GraphSnapshot, type U32 } from "@graphty/graph-format";

/**
 * The targets of every arc of every frontier vertex, in frontier order then row order.
 * @param s - the snapshot
 * @param frontier - the frontier vertices (indices below `s.nodeCount`)
 * @returns the edge queue the expansion produces, as a multiset in this order
 */
export function advanceOracle(s: GraphSnapshot, frontier: ArrayLike<number>): U32 {
    const { rowPtr, colIdx } = s;
    const out: number[] = [];
    for (let i = 0; i < frontier.length; i++) {
        const u = frontier[i];
        if (!Number.isInteger(u) || u < 0 || u >= s.nodeCount) {
            throw new Error(`advanceOracle: frontier[${i}] = ${u} is not a vertex of ${s.nodeCount}`);
        }
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            out.push(colIdx[a]);
        }
    }
    return Uint32Array.from(out);
}
