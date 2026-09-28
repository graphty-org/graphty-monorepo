/**
 * Planar layout algorithm
 */

import { rowsToPositionMap } from "../../indexed/common";
import { planarRows } from "../../indexed/planar";
import { toLayoutSnapshot } from "../../simulation/snapshot";
import type { Graph, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";

/**
 * Position nodes without edge intersections (planar layout). Each node's neighbours are visited in node order (the
 * order of `G.nodes()`), not edge order.
 * @param G - Graph
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout (must be 2)
 * @param seed - Random seed for reproducible layouts
 * @returns Positions dictionary keyed by node
 */
export function planarLayout(
    G: Graph,
    scale: number = 1,
    center: number[] | null = null,
    dim: number = 2,
    seed: number | null = null,
): PositionMap {
    if (dim !== 2) {
        throw new Error("can only handle 2 dimensions");
    }

    const processed = _processParams(G, center || [0, 0], dim);

    // Planar layout requires a proper Graph, not just a list of nodes
    if (Array.isArray(processed.G)) {
        throw new Error("Planar layout requires a Graph with edges, not just a list of nodes");
    }
    if (getNodesFromGraph(G).length === 0) {
        return {};
    }

    const s = toLayoutSnapshot(G);
    const ids = Array.from({ length: s.nodeCount }, (_, i) => s.ids.idOf(i));
    return rowsToPositionMap(planarRows(s, scale, processed.center, seed), 2, ids);
}
