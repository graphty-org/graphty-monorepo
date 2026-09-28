/**
 * Spiral layout algorithm
 */

import { rowsToPositionMap } from "../../indexed/common";
import { spiralRows } from "../../indexed/spiral";
import type { Graph, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";

/**
 * Position nodes in a spiral layout.
 * @param G - Graph or list of nodes
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @param resolution - Controls the spacing between spiral elements
 * @param equidistant - Whether to place nodes equidistant from each other
 * @returns Positions dictionary keyed by node
 */
export function spiralLayout(
    G: Graph,
    scale: number = 1,
    center: number[] | null = null,
    dim: number = 2,
    resolution: number = 0.35,
    equidistant: boolean = false,
): PositionMap {
    if (dim !== 2) {
        throw new Error("can only handle 2 dimensions");
    }

    const processed = _processParams(G, center || [0, 0], dim);
    const nodes = getNodesFromGraph(processed.G);
    return rowsToPositionMap(spiralRows(nodes.length, scale, processed.center, resolution, equidistant), 2, nodes);
}
