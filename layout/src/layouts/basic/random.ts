/**
 * Random layout algorithm
 */

import { Graph, Node, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";
import { RandomNumberGenerator } from "../../utils/random";

/**
 * Position nodes uniformly at random in the unit square.
 * @param G - Graph or list of nodes
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @param seed - Random seed for reproducible layouts
 * @returns Positions dictionary keyed by node
 */
export function randomLayout(
    G: Graph | Node[],
    center: number[] | null = null,
    dim: number = 2,
    seed: number | null = null,
): PositionMap {
    const processed = _processParams(G, center, dim);
    const nodes = getNodesFromGraph(processed.G);
    center = processed.center;

    const rng = new RandomNumberGenerator(seed ?? undefined);
    const pos: PositionMap = {};

    nodes.forEach((node: Node) => {
        pos[node] = (rng.rand(dim) as number[]).map((val: number, i: number) => val + center[i]);
    });

    return pos;
}
