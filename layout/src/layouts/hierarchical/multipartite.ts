import type { Graph, Node, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";
import { rescaleLayout } from "../../utils/rescale";

/**
 * Position nodes in layers of straight lines (multipartite layout).
 * @param G - Graph or list of nodes
 * @param subsetKey - Object mapping layers to node sets, or node attribute name
 * @param align - The alignment of nodes: 'vertical' or 'horizontal'
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @returns Positions dictionary keyed by node
 */
export function multipartiteLayout(
    G: Graph,
    subsetKey: Record<number | string, Node | Node[]> | string = "subset",
    align: "vertical" | "horizontal" = "vertical",
    scale: number = 1,
    center: number[] | null = null,
): PositionMap {
    if (align !== "vertical" && align !== "horizontal") {
        throw new Error("align must be either vertical or horizontal");
    }

    const processed = _processParams(G, center || [0, 0], 2);
    const graph = processed.G;
    ({ center } = processed);

    const allNodes = getNodesFromGraph(graph);

    if (allNodes.length === 0) {
        return {};
    }

    // Convert subsetKey to a layer mapping if it's a string
    let layers: Record<number | string, Node[]> = {};
    if (typeof subsetKey === "string") {
        // In JS we don't have access to node attributes directly
        // This is a simplification - in a real implementation we would need
        // to access node attributes from the graph
        console.warn("Using string subsetKey requires node attributes, using default partitioning");
        // Create a simple partitioning as fallback
        layers = { 0: allNodes };
    } else {
        // subsetKey is already a mapping of layers to nodes
        // Convert single nodes to arrays
        for (const [key, value] of Object.entries(subsetKey)) {
            if (Array.isArray(value)) {
                layers[key] = value;
            } else {
                layers[key] = [value];
            }
        }
    }

    const layerCount = Object.keys(layers).length;
    let pos: PositionMap = {};

    // Process each layer
    Object.entries(layers).forEach(([_layer, nodes], layerIdx) => {
        const layerNodes = Array.isArray(nodes) ? nodes : [nodes];
        const layerSize = layerNodes.length;

        layerNodes.forEach((node, nodeIdx) => {
            // Place nodes in a grid: layerIdx determines x-coordinate (column)
            // nodeIdx determines y-coordinate (row position within column)
            const x = layerIdx - (layerCount - 1) / 2;
            const y = nodeIdx - (layerSize - 1) / 2;
            pos[node] = [x, y];
        });
    });

    // Rescale positions
    pos = rescaleLayout(pos, scale, center) as PositionMap;

    // Handle horizontal alignment
    if (align === "horizontal") {
        for (const node in pos) {
            const temp = pos[node][0];
            pos[node][0] = pos[node][1];
            pos[node][1] = temp;
        }
    }

    return pos;
}
