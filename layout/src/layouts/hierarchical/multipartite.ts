import { type GraphSnapshot, isGraphSnapshot } from "@graphty/graph-format";

import { groupsOfColumn, layeredRows, multipartitePlace } from "../../indexed/multipartite";
import { toLayoutSnapshot } from "../../simulation/snapshot";
import type { Graph, Node, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { nodeListsToRows, shellsToPositionMap } from "../geometric/shell";

/**
 * Position nodes in layers of straight lines (multipartite layout).
 *
 * With `horizontal` alignment the layout is rescaled around `center` before x and y are swapped, so it is centred
 * on `[center[1], center[0]]`; `indexed.multipartite` centres on `center` itself.
 * @param G - Graph, or a GraphSnapshot when `subsetKey` names a node column
 * @param subsetKey - Object mapping layers to node sets, or the name of a `u32` or `dict` node column of a
 * GraphSnapshot whose equal values form one layer, in ascending value order; for any other graph a string puts every
 * node in one layer
 * @param align - The alignment of nodes: 'vertical' or 'horizontal'
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @returns Positions dictionary keyed by node; a node in no layer is left out
 */
export function multipartiteLayout(
    G: Graph | GraphSnapshot,
    subsetKey: Record<number | string, Node | Node[]> | string = "subset",
    align: "vertical" | "horizontal" = "vertical",
    scale: number = 1,
    center: number[] | null = null,
): PositionMap {
    if (align !== "vertical" && align !== "horizontal") {
        throw new Error("align must be either vertical or horizontal");
    }
    center ??= [0, 0];
    if (center.length !== 2) {
        throw new Error("length of center coordinates must match dimension of layout");
    }
    const s = toLayoutSnapshot(G);
    const nodes = isGraphSnapshot(G)
        ? Array.from({ length: s.nodeCount }, (_, i) => s.ids.idOf(i))
        : getNodesFromGraph(G);
    if (nodes.length === 0) {
        return {};
    }

    let rowIds: readonly Node[] = nodes;
    let layers: number[][];
    if (typeof subsetKey === "string" && isGraphSnapshot(G)) {
        layers = groupsOfColumn(G, subsetKey, "subset");
    } else {
        // a graph without node columns has nothing for a string subsetKey to read, so every node shares one layer
        const lists =
            typeof subsetKey === "string"
                ? [nodes]
                : Object.values(subsetKey).map((value) => (Array.isArray(value) ? value : [value]));
        ({ rowIds, lists: layers } = nodeListsToRows(nodes, lists));
    }
    const rescaleCenter = align === "horizontal" ? [center[1], center[0]] : center;
    return shellsToPositionMap(
        layeredRows(rowIds.length, layers, multipartitePlace, align, scale, rescaleCenter),
        layers,
        rowIds,
    );
}
