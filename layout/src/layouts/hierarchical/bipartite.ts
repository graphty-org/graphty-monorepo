/**
 * Bipartite layout algorithm
 */

import { bipartiteRows } from "../../indexed/bipartite";
import type { Graph, Node, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";
import { nodeListsToRows, shellsToPositionMap } from "../geometric/shell";

/**
 * Position nodes in two straight lines (bipartite layout).
 *
 * With `horizontal` alignment the layout is rescaled around `center` before x and y are swapped, so it is centred
 * on `[center[1], center[0]]`; `indexed.bipartite` centres on `center` itself.
 * @param G - Graph or list of nodes
 * @param nodes - Nodes in one node set of the graph; default every other node
 * @param align - The alignment of nodes: 'vertical' or 'horizontal'
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param aspectRatio - The ratio of the width to the height of the layout
 * @returns Positions dictionary keyed by node
 */
export function bipartiteLayout(
    G: Graph,
    nodes: Node[] | null = null,
    align: "vertical" | "horizontal" = "vertical",
    scale: number = 1,
    center: number[] | null = null,
    aspectRatio: number = 4 / 3,
): PositionMap {
    if (align !== "vertical" && align !== "horizontal") {
        throw new Error("align must be either vertical or horizontal");
    }
    ({ center } = _processParams(G, center || [0, 0], 2));
    const allNodes = getNodesFromGraph(G);
    if (allNodes.length === 0) {
        return {};
    }

    const left = new Set(nodes ?? allNodes.filter((_, i) => i % 2 === 0));
    const right = new Set(allNodes.filter((node) => !left.has(node)));
    const { rowIds, lists } = nodeListsToRows(allNodes, [[...left], [...right]]);
    const rescaleCenter = align === "horizontal" ? [center[1], center[0]] : center;
    return shellsToPositionMap(
        bipartiteRows(rowIds.length, lists[0], lists[1], aspectRatio, align, scale, rescaleCenter),
        lists,
        rowIds,
    );
}
