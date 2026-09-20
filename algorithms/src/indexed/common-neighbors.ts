import type { AdjacencyView, GraphSnapshot } from "@graphty/graph-format";

/** Options of the index-based common-neighbour score. @public */
export interface CommonNeighborsOptions {
    /** Intersect out(u) with in(v) instead of the two undirected rows. */
    readonly directed?: boolean | undefined;
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
    const fwd: AdjacencyView = s;
    const bwd: AdjacencyView = o.directed === true ? s.reverse() : s;
    let i = fwd.rowPtr[u];
    const iEnd = fwd.rowPtr[u + 1];
    let j = bwd.rowPtr[v];
    const jEnd = bwd.rowPtr[v + 1];
    let count = 0;
    while (i < iEnd && j < jEnd) {
        const a = fwd.colIdx[i];
        const b = bwd.colIdx[j];
        if (a === b) {
            count++;
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
    return count;
}
