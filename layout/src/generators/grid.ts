/**
 * Grid graph generation function: a deprecated alias of @graphty/graph-samples/generators.
 */

import { gridGraph as sampleGridGraph } from "@graphty/graph-samples/generators";

import { type Graph } from "../types";
import { listGraph, sampleCount, toLayoutGraph } from "./sample";

/**
 * Create a grid graph with rows x cols nodes, named "row,col"; each node's edge to its right
 * neighbour comes before its edge to the one below. A zero dimension gives the empty graph.
 * @deprecated Use `gridGraph({ rows, cols })` from `@graphty/graph-samples/generators` (node
 * `r * cols + c` there is "r,c" here); removed in layout's next major.
 * @param rows - Number of rows
 * @param cols - Number of columns
 * @returns Graph object with grid topology
 */
export function gridGraph(rows: number, cols: number): Graph {
    const r = sampleCount(rows);
    const c = sampleCount(cols);
    if (r === 0 || c === 0) {
        return listGraph([], []);
    }
    return toLayoutGraph(sampleGridGraph({ rows: r, cols: c }), (i) => `${Math.floor(i / c)},${i % c}`);
}
