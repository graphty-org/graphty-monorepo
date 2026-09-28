/**
 * Shell layout algorithm
 */

import type { F64 } from "@graphty/graph-format";

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

    const { rowIds, lists: shells } = nodeListsToRows(nodes, nlist ?? [nodes]);
    return shellsToPositionMap(shellRows(rowIds.length, shells, scale, center), shells, rowIds);
}

/**
 * Row indices for lists of node ids: node `i` of `nodes` is row `i`, and an id the lists name but `nodes` does not
 * gets a row of its own after them, so the legacy layouts still place it, as they always did.
 * @param nodes - the graph's nodes
 * @param lists - lists of node ids
 * @returns the id of every row, and the lists as row indices
 */
export function nodeListsToRows(
    nodes: readonly Node[],
    lists: readonly (readonly Node[])[],
): { rowIds: Node[]; lists: number[][] } {
    const rowIds: Node[] = [...nodes];
    const rowOf = new Map<string, number>(nodes.map((node, i) => [String(node), i]));
    const rows = lists.map((list) =>
        list.map((node) => {
            let row = rowOf.get(String(node));
            if (row === undefined) {
                row = rowIds.push(node) - 1;
                rowOf.set(String(node), row);
            }
            return row;
        }),
    );
    return { rowIds, lists: rows };
}

/**
 * The id-keyed map of shell rows, keys in placement order (shell by shell, a node listed twice at its first place),
 * as the legacy shell and radial layouts returned it. A node in no shell is left out.
 * @param rows - `2 * ids.length` values
 * @param shells - row indices per shell
 * @param ids - the id of every row
 * @returns the map
 */
export function shellsToPositionMap(rows: F64, shells: readonly (readonly number[])[], ids: readonly Node[]): PositionMap {
    const pos: PositionMap = {};
    for (const shell of shells) {
        for (const i of shell) {
            pos[ids[i]] = [rows[2 * i], rows[2 * i + 1]];
        }
    }
    return pos;
}
