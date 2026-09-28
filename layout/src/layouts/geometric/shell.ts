/**
 * Shell layout algorithm
 */

import { rowsToPositionMap } from "../../indexed/common";
import { shellRows } from "../../indexed/shell";
import { Graph, Node, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";

/**
 * Position nodes in concentric circles.
 * @param G - Graph or list of nodes
 * @param nlist - List of node lists for each shell
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout (currently only supports dim=2)
 * @returns Positions dictionary keyed by node
 */
export function shellLayout(
    G: Graph,
    nlist: Node[][] | null = null,
    scale: number = 1,
    center: number[] | null = null,
    dim: number = 2,
): PositionMap {
    if (dim !== 2) {
        throw new Error("can only handle 2 dimensions");
    }

    const processed = _processParams(G, center, dim);
    const nodes = getNodesFromGraph(processed.G);
    ({ center } = processed);

    if (nodes.length === 0) {
        return {};
    }

    if (nodes.length === 1) {
        return { [nodes[0]]: center };
    }

    // a node the shells name but the graph does not is still placed, as it always was: give it a row of its own
    const rowIds: Node[] = [...nodes];
    const rowOf = new Map<string, number>(nodes.map((node, i) => [String(node), i]));
    const shells = (nlist ?? [nodes]).map((shell) =>
        shell.map((node) => {
            let row = rowOf.get(String(node));
            if (row === undefined) {
                row = rowIds.push(node) - 1;
                rowOf.set(String(node), row);
            }
            return row;
        }),
    );
    return rowsToPositionMap(shellRows(rowIds.length, shells, scale, center), 2, rowIds, true);
}
