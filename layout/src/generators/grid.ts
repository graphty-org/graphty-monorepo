/**
 * Grid graph generation function
 */

import { Edge,Graph, Node } from "../types";

/**
 * Create a grid graph with rows x cols nodes
 * @param rows - Number of rows
 * @param cols - Number of columns
 * @returns Graph object with grid topology
 */
export function gridGraph(rows: number, cols: number): Graph {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create nodes
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            nodes.push(`${i},${j}`);
        }
    }

    // Create edges
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            // Connect to right neighbor
            if (j < cols - 1) {
                edges.push([`${i},${j}`, `${i},${j + 1}`]);
            }
            // Connect to bottom neighbor
            if (i < rows - 1) {
                edges.push([`${i},${j}`, `${i + 1},${j}`]);
            }
        }
    }

    return {
        nodes: () => nodes,
        edges: () => edges,
    };
}
