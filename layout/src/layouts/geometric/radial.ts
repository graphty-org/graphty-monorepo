/**
 * Radial layout algorithm
 */

import { rowsToPositionMap } from "../../indexed/common";
import { radialRings } from "../../indexed/radial";
import { shellRows } from "../../indexed/shell";
import { toLayoutSnapshot } from "../../simulation/snapshot";
import type { Graph, Node, PositionMap } from "../../types";

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
    const s = toLayoutSnapshot(G);
    if (s.nodeCount === 0) {
        return {};
    }
    if (root !== null && !s.ids.has(root)) {
        throw new Error(`root node ${String(root)} is not in the graph`);
    }

    const rings = radialRings(s, root === null ? null : s.ids.indexOf(root));
    const ids = Array.from({ length: s.nodeCount }, (_, i) => s.ids.idOf(i));
    // shells space n rings scale / n apart with the root's ring at radius 0, so the outermost ring
    // would sit at scale * (n - 1) / n; stretch it so the outermost ring lands on scale.
    const stretch = rings.length > 1 ? rings.length / (rings.length - 1) : 1;
    return rowsToPositionMap(shellRows(s.nodeCount, rings, scale * stretch, center ?? [0, 0]), 2, ids);
}
