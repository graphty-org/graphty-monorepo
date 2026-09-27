/**
 * The result record of triangle counting (design 3.3 line 828, 8.5; design 17 line 5067). Design 3.3 declares
 * `{ perNode, total }`; this package also returns the clustering coefficient and the transitivity, because they are
 * an epilogue over the counts and degrees the call already holds and nothing else in the monorepo computes them
 * (design/decisions/2026-09-23-triangles-carry-the-clustering-coefficient.md). Types only.
 */

import type { F32, U32 } from "@graphty/graph-format";

/**
 * Triangle counting over the simple undirected graph underlying the snapshot: arc directions are ignored, parallel
 * edges count once and self-loops not at all, so a directed snapshot and its undirected twin give the same answer.
 * @public
 */
export interface GpuTriangleResult {
    /** The triangles each node lies in. */
    readonly perNode: U32;
    /** The triangles of the graph (each counted once). */
    readonly total: number;
    /**
     * The local clustering coefficient of every node, `2 T(v) / (d(v) (d(v) - 1))` with `d` the node's number of
     * distinct neighbours. It is 0 -- a defined value, not a missing one -- for a node with fewer than two
     * neighbours, so a star graph returns all zeros.
     */
    readonly coefficient: F32;
    /** The graph's transitivity, `3 x triangles / connected triples`; 0 when the graph has no connected triple. */
    readonly transitivity: number;
}
