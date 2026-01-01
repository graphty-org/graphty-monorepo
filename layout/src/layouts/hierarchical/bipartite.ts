/**
 * Bipartite layout algorithm
 */

import { Graph, Node, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";
import { rescaleLayout } from "../../utils/rescale";

/**
 * Position nodes in two straight lines (bipartite layout).
 * @param G - Graph or list of nodes
 * @param nodes - Nodes in one node set of the graph
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

    const processed = _processParams(G, center || [0, 0], 2);
    const graph = processed.G;
    center = processed.center;

    const allNodes = getNodesFromGraph(graph);

    if (allNodes.length === 0) {
        return {};
    }

    // If nodes not provided, try to determine bipartite sets
    if (!nodes) {
        // A simple heuristic for bipartite detection: use nodes with even/odd indices
        // This is a simplification, in Python NetworkX has bipartite.sets()
        nodes = allNodes.filter((_: Node, i: number): boolean => i % 2 === 0);
    }

    const left = new Set(nodes);
    const right: Set<Node> = new Set(allNodes.filter((n: Node) => !left.has(n)));

    const height = 1;
    const width = aspectRatio * height;
    const offset = [width / 2, height / 2];

    const pos: PositionMap = {};

    // Position nodes in the left set
    const leftNodes = [...left];
    leftNodes.forEach((node, i) => {
        const x = 0;
        const y = (i * height) / (leftNodes.length || 1);
        pos[node] = [x, y];
    });

    // Position nodes in the right set
    const rightNodes = [...right];
    rightNodes.forEach((node, i) => {
        const x = width;
        const y = (i * height) / (rightNodes.length || 1);
        pos[node] = [x, y];
    });

    // Center positions around the origin and apply offset
    for (const node in pos) {
        pos[node][0] -= offset[0];
        pos[node][1] -= offset[1];
    }

    // Rescale positions
    const scaledPos = rescaleLayout(pos, scale, center) as PositionMap;

    // Handle horizontal alignment
    if (align === "horizontal") {
        for (const node in scaledPos) {
            const temp = scaledPos[node][0];
            scaledPos[node][0] = scaledPos[node][1];
            scaledPos[node][1] = temp;
        }
    }

    return scaledPos;
}
