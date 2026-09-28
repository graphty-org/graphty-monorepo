import type { AdjacencyView, GraphSnapshot } from "@graphty/graph-format";

/** Options of the index-based common-neighbour score. @public */
export interface CommonNeighborsOptions {
    /** Intersect out(u) with in(v) instead of the two undirected rows. */
    readonly directed?: boolean | undefined;
}

/**
 * Merge row u of `fwd` with row v of `bwd` (both sorted) and add up each DISTINCT common neighbour
 * once: 1 per neighbour, or `weight(z)` when a weight function is given. The adjacent-skip after a
 * match is what gives simple-graph semantics on a multigraph.
 * @param fwd - The view whose row u is read
 * @param bwd - The view whose row v is read
 * @param u - A node index
 * @param v - A node index
 * @param weight - Optional weight of a common neighbour
 * @returns The count, or the weight sum, over distinct common neighbours
 */
export function sortedRowMerge(
    fwd: AdjacencyView,
    bwd: AdjacencyView,
    u: number,
    v: number,
    weight?: (z: number) => number,
): number {
    let i = fwd.rowPtr[u];
    const iEnd = fwd.rowPtr[u + 1];
    let j = bwd.rowPtr[v];
    const jEnd = bwd.rowPtr[v + 1];
    let sum = 0;
    while (i < iEnd && j < jEnd) {
        const a = fwd.colIdx[i];
        const b = bwd.colIdx[j];
        if (a === b) {
            sum += weight === undefined ? 1 : weight(a);
            i++;
            j++;
            while (i < iEnd && fwd.colIdx[i] === a) {
                i++;
            }
            while (j < jEnd && bwd.colIdx[j] === b) {
                j++;
            }
        } else if (a < b) {
            i++;
        } else {
            j++;
        }
    }
    return sum;
}

/**
 * The number of distinct common neighbours of two nodes, by a merge of their sorted rows.
 * @param s - The snapshot
 * @param u - A node index
 * @param v - A node index
 * @param o - Options
 * @returns The count of distinct common neighbours
 * @public
 */
export function commonNeighborsScore(s: GraphSnapshot, u: number, v: number, o: CommonNeighborsOptions = {}): number {
    return sortedRowMerge(s, o.directed === true ? s.reverse() : s, u, v);
}
