/**
 * Circular layout algorithm
 */

import { Graph, Node, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { np } from "../../utils/numpy";
import { _processParams } from "../../utils/params";
import { RandomNumberGenerator } from "../../utils/random";

/**
 * Position nodes on a circle (2D) or sphere (3D).
 * @param G - Graph or list of nodes
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout (supports 2D circle or 3D sphere)
 * @returns Positions dictionary keyed by node
 */
export function circularLayout(
    G: Graph,
    scale: number = 1,
    center: number[] | null = null,
    dim: number = 2,
): PositionMap {
    if (dim < 2) {
        throw new Error("cannot handle dimensions < 2");
    }

    const processed = _processParams(G, center, dim);
    const nodes = getNodesFromGraph(processed.G);
    center = processed.center;

    const pos: PositionMap = {};

    if (nodes.length === 0) {
        return pos;
    }

    if (nodes.length === 1) {
        pos[nodes[0]] = center;
        return pos;
    }

    if (dim === 2) {
        // 2D circle layout
        const theta = np.linspace(0, 2 * Math.PI, nodes.length + 1).slice(0, -1);

        nodes.forEach((node: Node, i: number) => {
            const x: number = Math.cos(theta[i]) * scale + center[0];
            const y: number = Math.sin(theta[i]) * scale + center[1];
            pos[node] = [x, y];
        });
    } else if (dim === 3) {
        // 3D sphere layout using Fibonacci spiral
        const n = nodes.length;
        const goldenRatio = (1 + Math.sqrt(5)) / 2;

        nodes.forEach((node: Node, i: number) => {
            // Use Fibonacci spiral for even distribution on sphere
            const theta = (2 * Math.PI * i) / goldenRatio;
            const phi = Math.acos(1 - (2 * (i + 0.5)) / n);

            const x = Math.sin(phi) * Math.cos(theta) * scale + center[0];
            const y = Math.sin(phi) * Math.sin(theta) * scale + center[1];
            const z = Math.cos(phi) * scale + center[2];

            pos[node] = [x, y, z];
        });
    } else {
        // For higher dimensions, fall back to random on hypersphere
        const rng = new RandomNumberGenerator();
        nodes.forEach((node: Node) => {
            // Generate random point on unit hypersphere
            const coords = Array(dim)
                .fill(0)
                .map(() => (rng.rand() as number) * 2 - 1);
            const norm = Math.sqrt(coords.reduce((sum, c) => sum + c * c, 0));
            pos[node] = coords.map((c, j) => (c / norm) * scale + center[j]);
        });
    }

    return pos;
}
