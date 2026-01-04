/**
 * Spiral layout algorithm
 */

import type { Graph, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";
import { rescaleLayout } from "../../utils/rescale";

/**
 * Position nodes in a spiral layout.
 * @param G - Graph or list of nodes
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @param resolution - Controls the spacing between spiral elements
 * @param equidistant - Whether to place nodes equidistant from each other
 * @returns Positions dictionary keyed by node
 */
export function spiralLayout(
    G: Graph,
    scale: number = 1,
    center: number[] | null = null,
    dim: number = 2,
    resolution: number = 0.35,
    equidistant: boolean = false,
): PositionMap {
    if (dim !== 2) {
        throw new Error("can only handle 2 dimensions");
    }

    const processed = _processParams(G, center || [0, 0], dim);
    const nodes = getNodesFromGraph(processed.G);
    ({ center } = processed);

    const pos: PositionMap = {};

    if (nodes.length === 0) {
        return pos;
    }

    if (nodes.length === 1) {
        pos[nodes[0]] = [...center];
        return pos;
    }

    let positions: number[][] = [];

    if (equidistant) {
        // Create equidistant points along the spiral
        // This matches the Python implementation logic
        const chord = 1;
        const step = 0.5;
        let theta = resolution;
        theta += chord / (step * theta);

        for (let i = 0; i < nodes.length; i++) {
            const r = step * theta;
            theta += chord / r;
            positions.push([Math.cos(theta) * r, Math.sin(theta) * r]);
        }
    } else {
        // Create points with equal angle but increasing distance
        const dist = Array.from({ length: nodes.length }, (_, i) => parseFloat(String(i)));
        const angle = dist.map((d) => resolution * d);

        positions = dist.map((d, i) => [Math.cos(angle[i]) * d, Math.sin(angle[i]) * d]);
    }

    // Convert position array to position matrix for rescaling
    const posArray: number[][] = [];
    for (let i = 0; i < positions.length; i++) {
        posArray.push(positions[i]);
    }

    // Rescale positions and add center offset
    const scaledPositions = rescaleLayout(posArray, scale) as number[][];
    for (let i = 0; i < scaledPositions.length; i++) {
        scaledPositions[i][0] += center[0];
        scaledPositions[i][1] += center[1];
    }

    // Create position dictionary
    for (let i = 0; i < nodes.length; i++) {
        pos[nodes[i]] = scaledPositions[i];
    }

    return pos;
}
