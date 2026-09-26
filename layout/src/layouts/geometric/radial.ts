/**
 * Radial layout algorithm
 */

import type { Graph, Node, PositionMap } from "../../types";
import { getEdgesFromGraph, getNodesFromGraph } from "../../utils/graph";
import { shellLayout } from "./shell";

/**
 * Position nodes on concentric rings by their hop distance from a root node.
 *
 * The root sits at the centre, its neighbours on the first ring, their unvisited neighbours on
 * the second, and so on: a breadth-first search over the edges, treated as undirected. Nodes the
 * root cannot reach share one extra ring outside the last. Ring k has radius
 * `k * scale / (ringCount - 1)`, so a node's distance from the centre is proportional to its hop
 * distance and the outermost ring has radius `scale`.
 * @param G - Graph
 * @param root - The node at the centre; defaults to the node with the most edges (first on a tie)
 * @param scale - Radius of the outermost ring
 * @param center - Coordinate pair around which to center the layout
 * @returns Positions dictionary keyed by node
 */
export function radialLayout(
    G: Graph,
    root: Node | null = null,
    scale: number = 1,
    center: number[] | null = null,
): PositionMap {
    const nodes = getNodesFromGraph(G);

    if (nodes.length === 0) {
        return {};
    }

    const adjacency = new Map<Node, Set<Node>>(nodes.map((node) => [node, new Set<Node>()]));
    for (const [source, target] of getEdgesFromGraph(G)) {
        adjacency.get(source)?.add(target);
        adjacency.get(target)?.add(source);
    }

    if (root === null) {
        root = nodes.reduce((best, node) =>
            (adjacency.get(node)?.size ?? 0) > (adjacency.get(best)?.size ?? 0) ? node : best,
        );
    } else if (!adjacency.has(root)) {
        throw new Error(`root node ${String(root)} is not in the graph`);
    }

    const rings: Node[][] = [[root]];
    const visited = new Set<Node>([root]);
    for (let ring = rings[0]; ring.length > 0; ) {
        const next: Node[] = [];
        for (const node of ring) {
            for (const neighbor of adjacency.get(node) ?? []) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    next.push(neighbor);
                }
            }
        }
        if (next.length > 0) {
            rings.push(next);
        }
        ring = next;
    }

    const unreachable = nodes.filter((node) => !visited.has(node));
    if (unreachable.length > 0) {
        rings.push(unreachable);
    }

    // shellLayout spaces n rings scale / n apart with the root's ring at radius 0, so its outermost
    // ring would sit at scale * (n - 1) / n; stretch it so the outermost ring lands on scale.
    const stretch = rings.length > 1 ? rings.length / (rings.length - 1) : 1;
    return shellLayout(G, rings, scale * stretch, center);
}
