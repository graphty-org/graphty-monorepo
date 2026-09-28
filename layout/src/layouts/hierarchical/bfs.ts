import { bfsLayers } from "../../indexed/bfs";
import { layeredRows, multipartitePlace } from "../../indexed/multipartite";
import { toLayoutSnapshot } from "../../simulation/snapshot";
import type { Graph, Node, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";
import { shellsToPositionMap } from "../geometric/shell";

/**
 * Position nodes according to breadth-first search algorithm: layer k holds the nodes k hops from `start`, laid out
 * as `multipartiteLayout` lays out its layers. Each node's neighbours are visited in node order (the order of
 * `G.nodes()`), not edge order.
 *
 * With `horizontal` alignment the layout is rescaled around `center` before x and y are swapped, so it is centred
 * on `[center[1], center[0]]`; `indexed.bfs` centres on `center` itself.
 * @param G - Graph
 * @param start - Starting node for bfs
 * @param align - The alignment of layers: 'vertical' or 'horizontal'
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @returns Positions dictionary keyed by node
 */
export function bfsLayout(
    G: Graph,
    start: Node,
    align: "vertical" | "horizontal" = "vertical",
    scale: number = 1,
    center: number[] | null = null,
): PositionMap {
    const processed = _processParams(G, center || [0, 0], 2);

    // BFS layout requires a proper Graph, not just a list of nodes
    if (Array.isArray(processed.G)) {
        throw new Error("BFS layout requires a Graph with edges, not just a list of nodes");
    }
    ({ center } = processed);
    if (getNodesFromGraph(G).length === 0) {
        return {};
    }

    const s = toLayoutSnapshot(G);
    if (!s.ids.has(start)) {
        throw new Error(`start node ${String(start)} is not in the graph`);
    }
    const layers = bfsLayers(s, s.ids.indexOf(start));
    const ids = Array.from({ length: s.nodeCount }, (_, i) => s.ids.idOf(i));
    // multipartiteLayout rescales around the centre before it swaps x and y
    const rescaleCenter = align === "horizontal" ? [center[1], center[0]] : center;
    return shellsToPositionMap(
        layeredRows(s.nodeCount, layers, multipartitePlace, align, scale, rescaleCenter),
        layers,
        ids,
    );
}
