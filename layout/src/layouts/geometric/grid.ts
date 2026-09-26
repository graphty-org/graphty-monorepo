/**
 * Grid layout algorithm
 */

import type { Graph, Node, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";

/**
 * Position nodes on a regular two-dimensional lattice, row by row in node order.
 *
 * Node i goes to column `i % columns` and row `floor(i / columns)`. The lattice is centred on
 * `center`, and its longer side spans `[-scale, scale]`, so every cell is the same distance from
 * its neighbours.
 * @param G - Graph or list of nodes
 * @param columns - Number of columns; defaults to `ceil(sqrt(n))`, which makes the grid square
 * @param scale - Half the length of the lattice's longer side
 * @param center - Coordinate pair around which to center the layout
 * @returns Positions dictionary keyed by node
 */
export function gridLayout(
    G: Graph | Node[],
    columns: number | null = null,
    scale: number = 1,
    center: number[] | null = null,
): PositionMap {
    const processed = _processParams(G, center, 2);
    const nodes = getNodesFromGraph(processed.G);
    ({ center } = processed);

    if (columns !== null && (!Number.isInteger(columns) || columns < 1)) {
        throw new Error("columns must be a positive integer");
    }

    const pos: PositionMap = {};
    const n = nodes.length;

    if (n === 0) {
        return pos;
    }

    const cols = Math.min(columns ?? Math.ceil(Math.sqrt(n)), n);
    const rows = Math.ceil(n / cols);
    const longest = Math.max(cols - 1, rows - 1);
    const spacing = longest === 0 ? 0 : (2 * scale) / longest;

    nodes.forEach((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        pos[node] = [
            center[0] + (col - (cols - 1) / 2) * spacing,
            center[1] + (row - (rows - 1) / 2) * spacing,
        ];
    });

    return pos;
}
