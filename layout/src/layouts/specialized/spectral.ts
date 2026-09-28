/**
 * Spectral layout algorithm using eigenvectors of the graph Laplacian
 */

import { rowsToPositionMap } from "../../indexed/common";
import { spectralRows } from "../../indexed/spectral";
import { toLayoutSnapshot } from "../../simulation/snapshot";
import type { Graph, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";

/**
 * Position nodes in a spectral layout using eigenvectors of the graph Laplacian.
 * @param G - Graph
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @param seed - Random seed for reproducible layouts
 * @returns Positions dictionary keyed by node
 */
export function spectralLayout(
    G: Graph,
    scale: number = 1,
    center: number[] | null = null,
    dim: number = 2,
    seed: number | null = null,
): PositionMap {
    const processed = _processParams(G, center, dim);
    if (getNodesFromGraph(G).length === 0) {
        return {};
    }
    const s = toLayoutSnapshot(G);
    const ids = Array.from({ length: s.nodeCount }, (_, i) => s.ids.idOf(i));
    return rowsToPositionMap(spectralRows(s, dim, scale, processed.center, seed), dim, ids);
}
