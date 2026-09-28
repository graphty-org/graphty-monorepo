import type { AdjacencyView, F64, GraphSnapshot } from "@graphty/graph-format";

/** Options of the index-based degree centrality, matching the legacy `degreeCentrality`. @public */
export interface DegreeCentralityOptions {
    /** On a directed snapshot, which neighbours to count; ignored when undirected. Default `"total"`. */
    readonly mode?: "in" | "out" | "total" | undefined;
    /** Divide by `n - 1`, the most neighbours a node can have. Default false. */
    readonly normalized?: boolean | undefined;
}

/**
 * Add each node's number of DISTINCT neighbours in `g` to `out`: parallel edges count once and a self-loop
 * counts once, as the legacy `Graph.degree` counts them.
 * @param g - The adjacency
 * @param out - Per-node totals, added to in place
 */
function addDistinctNeighbours(g: AdjacencyView, out: F64): void {
    const { rowPtr, colIdx } = g;
    for (let v = 0; v < g.nodeCount; v++) {
        let prev = -1;
        for (let a = rowPtr[v], end = rowPtr[v + 1]; a < end; a++) {
            if (colIdx[a] !== prev) {
                prev = colIdx[a];
                out[v]++;
            }
        }
    }
}

/**
 * Degree centrality: each node's number of distinct neighbours (in, out, or both on a directed snapshot),
 * optionally divided by `n - 1`. Equals the legacy `degreeCentrality` on every graph it can hold, and on a
 * multigraph equals it on the same graph with each pair's parallel edges merged.
 * @param s - The snapshot
 * @param options - Direction and normalisation
 * @returns One score per node index
 * @public
 */
export function degreeCentrality(s: GraphSnapshot, options: DegreeCentralityOptions = {}): F64 {
    const scores = new Float64Array(s.nodeCount);
    const mode = s.directed ? (options.mode ?? "total") : "out";
    if (mode !== "in") {
        addDistinctNeighbours(s, scores);
    }
    if (mode !== "out") {
        addDistinctNeighbours(s.reverse(), scores);
    }
    const max = s.nodeCount - 1;
    if (options.normalized === true && max > 0) {
        for (let v = 0; v < scores.length; v++) {
            scores[v] /= max;
        }
    }
    return scores;
}
