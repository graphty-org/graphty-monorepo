/**
 * Circular layout algorithm
 */

import { circularRows } from "../../indexed/circular";
import { rowsToPositionMap } from "../../indexed/common";
import { Graph, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";

/**
 * Position nodes on a circle (2D) or sphere (3D).
 * @param G - Graph or list of nodes
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout (supports 2D circle or 3D sphere)
 * @returns Positions dictionary keyed by node
 */
export function circularLayout(
    G: Graph,
    scale: number = 1,
    center: number[] | null = null,
    dim: number = 2,
): PositionMap {
    if (dim < 2) {
        throw new Error("cannot handle dimensions < 2");
    }

    const processed = _processParams(G, center, dim);
    const nodes = getNodesFromGraph(processed.G);
    return rowsToPositionMap(circularRows(nodes.length, dim, scale, processed.center), dim, nodes);
}
