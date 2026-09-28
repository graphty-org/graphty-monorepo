import type { GraphSnapshot } from "@graphty/graph-format";

import type { LayoutResult } from "../positions";
import { toLayoutSnapshot } from "../simulation/snapshot";
import { type CommonLayoutOptions, planar, resolve, result } from "./common";
import { type LayerAlign, layeredRows, multipartitePlace } from "./multipartite";

/** Options of the index-based breadth-first layout. */
export interface BfsLayoutOptions extends CommonLayoutOptions {
    /** Index of the node the search starts from; default 0. */
    readonly start?: number | undefined;
    /** Default `vertical`. */
    readonly align?: LayerAlign | undefined;
}

/**
 * The breadth-first layers from `start`: layer k holds the nodes k hops away, each node's neighbours visited in
 * ascending node index. Edges are taken as undirected.
 * @param g - an undirected snapshot
 * @param start - the start index
 * @returns node indices per layer
 * @throws when a node is not reachable from `start`
 */
function bfsLayers(g: GraphSnapshot, start: number): number[][] {
    const n = g.nodeCount;
    if (!Number.isInteger(start) || start < 0 || start >= n) {
        throw new Error(`start node ${String(start)} is not in the graph`);
    }
    const visited = new Uint8Array(n);
    visited[start] = 1;
    let reached = 1;
    const layers: number[][] = [[start]];
    for (let layer = layers[0]; ; ) {
        const next: number[] = [];
        for (const u of layer) {
            for (let a = g.rowPtr[u]; a < g.rowPtr[u + 1]; a++) {
                const v = g.colIdx[a];
                if (visited[v] === 0) {
                    visited[v] = 1;
                    next.push(v);
                }
            }
        }
        if (next.length === 0) {
            break;
        }
        reached += next.length;
        layers.push(next);
        layer = next;
    }
    if (reached < n) {
        throw new Error("bfs_layout didn't include all nodes. Graph may be disconnected.");
    }
    return layers;
}

/**
 * Nodes in layers by hop distance from `start`, laid out as the multipartite layout lays out its layers: with
 * `vertical` alignment layer k is a column, its nodes in the order the search reached them. In 3D the layout lies in
 * the plane of the centre's z.
 * @param s - the snapshot; a directed one is read as its undirected derived graph
 * @param options - `scale` is the distance of the farthest node from the centre; `start` the first layer
 * @returns the layout
 * @throws when the graph is not connected
 */
export function bfs(s: GraphSnapshot, options: BfsLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    const { start = 0, align = "vertical" } = options;
    const layers = n === 0 ? [] : bfsLayers(toLayoutSnapshot(s), start);
    return result(planar(layeredRows(n, layers, multipartitePlace, align, scale, center), dim, center), dim, n);
}
