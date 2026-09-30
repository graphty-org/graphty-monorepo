import type { AdjacencyView, F64, GraphSnapshot, U32 } from "@graphty/graph-format";

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

/** Each node's edge count, split by the end of the edge it sits at. @public */
export interface DegreesResult {
    /** Edges declared into the node. */
    readonly inDegree: U32;
    /** Edges declared out of the node. */
    readonly outDegree: U32;
}

/**
 * Each node's edges counted from the edge list: every logical edge once at its declared source (out)
 * and once at its declared target (in), so a self-loop counts once in each half. The orientation is
 * the one each edge was declared with, on an undirected snapshot too, so in plus out is the degree
 * counted once -- where the snapshot's own degree views give an undirected node its whole degree as
 * both halves. Parallel edges each count; merge them first to count a pair once.
 * @param s - The snapshot
 * @returns The two halves, one count per node index
 * @public
 */
export function degrees(s: GraphSnapshot): DegreesResult {
    const { src, dst } = s.edgeList();
    const inDegree = new Uint32Array(s.nodeCount);
    const outDegree = new Uint32Array(s.nodeCount);
    for (let e = 0; e < src.length; e++) {
        outDegree[src[e]]++;
        inDegree[dst[e]]++;
    }
    return { inDegree, outDegree };
}
