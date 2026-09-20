import type { U32 } from "@graphty/graph-format";

/**
 * The source node of an arc, by binary search on `rowPtr`. `GraphSnapshot` exposes `arcSource(a)`
 * (`graph-format/src/snapshot/graph-snapshot.ts:544`), but an `AdjacencyView` -- which is what the
 * Port 1 and Port 2 signatures take, so that `reverse()` works as an input for free -- does not,
 * so the predecessor walk carries its own.
 * @param rowPtr - The view's nodeCount + 1 row offsets
 * @param arc - An arc index in `[0, arcCount)`
 * @returns The node index whose row contains the arc
 * @public
 */
export function arcSourceIn(rowPtr: U32, arc: number): number {
    let lo = 0;
    let hi = rowPtr.length - 1; // nodeCount
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (rowPtr[mid + 1] <= arc) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}
