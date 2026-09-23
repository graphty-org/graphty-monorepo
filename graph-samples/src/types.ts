import { type ColumnInput, type F32, type TypedArrayData, type U32 } from "@graphty/graph-format";

/**
 * A graph as typed arrays: the output of every generator and every dataset loader.
 *
 * It is structurally an `EdgeArraysInput` of @graphty/graph-format, so `fromEdgeArrays(graph)`
 * builds a snapshot from it in one call, and every array is a plain typed array that a Web Worker
 * can transfer. Edge `e` joins `src[e]` and `dst[e]`, both node indices in `[0, nodeCount)`.
 */
export interface SampleGraph {
    /** Whether the edges are directed (src to dst). */
    readonly directed: boolean;
    /** The number of nodes; isolated nodes count. */
    readonly nodeCount: number;
    /** Source node index of every edge. */
    readonly src: U32;
    /** Target node index of every edge. */
    readonly dst: U32;
    /** Per-edge weights, when the graph is weighted. */
    readonly weights?: F32 | undefined;
    /** External node ids in index order, when the graph has meaningful names for its nodes. */
    readonly ids?: readonly string[] | undefined;
    /**
     * Node attribute columns in index order, keyed by name: ground truth such as `community`
     * (u32), `side` (u8, bipartite) or `layer` (u32, layered DAG), and a dataset's own attributes.
     */
    readonly nodeColumns?: Readonly<Record<string, TypedArrayData | ColumnInput>> | undefined;
}
