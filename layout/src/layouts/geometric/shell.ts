/**
 * Shell layout algorithm
 */

import { Graph, Node, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { np } from "../../utils/numpy";
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

    const pos: PositionMap = {};

    if (nodes.length === 0) {
        return pos;
    }

    if (nodes.length === 1) {
        pos[nodes[0]] = center;
        return pos;
    }

    // If no nlist is specified, put all nodes in a single shell
    if (!nlist) {
        nlist = [nodes];
    }

    const radiusBump = scale / nlist.length;
    let radius: number;

    if (nlist[0].length === 1) {
        // Single node at center
        radius = 0;
        pos[nlist[0][0]] = [...center];
        radius += radiusBump;
    } else {
        // Start at radius 1
        radius = radiusBump;
    }

    for (let i = 0; i < nlist.length; i++) {
        const shell = nlist[i];
        if (shell.length === 0) {continue;}

        if (shell.length === 1 && i === 0) {
            // Already handled the case of a single center node
            continue;
        }

        // Calculate positions on a circle
        const theta = np.linspace(0, 2 * Math.PI, shell.length + 1).slice(0, -1);

        shell.forEach((node: Node, j) => {
            const x = Math.cos(theta[j]) * radius + center[0];
            const y = Math.sin(theta[j]) * radius + center[1];
            pos[node] = [x, y];
        });

        radius += radiusBump;
    }

    return pos;
}
