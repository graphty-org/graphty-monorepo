/**
 * Spectral layout algorithm using eigenvectors of the graph Laplacian
 */

import { Edge, Graph, Node, PositionMap } from "../../types";
import { getEdgesFromGraph,getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";
import { rescaleLayout } from "../../utils/rescale";

/**
 * Position nodes in a spectral layout using eigenvectors of the graph Laplacian.
 * @param G - Graph
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @returns Positions dictionary keyed by node
 */
export function spectralLayout(
    G: Graph,
    scale: number = 1,
    center: number[] | null = null,
    dim: number = 2,
): PositionMap {
    const processed = _processParams(G, center, dim);
    const graph = processed.G;
    center = processed.center;

    const nodes = getNodesFromGraph(graph);

    if (nodes.length <= 2) {
        if (nodes.length === 0) {
            return {};
        } else if (nodes.length === 1) {
            return { [nodes[0]]: center };
        } 
            return {
                [nodes[0]]: center.map((v) => v - scale),
                [nodes[1]]: center.map((v) => v + scale),
            };
        
    }

    // Create adjacency matrix
    const N = nodes.length;
    const nodeIndices: Record<Node, number> = {};
    nodes.forEach((node: Node, i: number) => {
        nodeIndices[node] = i;
    });

    const A = Array(N)
        .fill(0)
        .map(() => Array(N).fill(0));
    const edges = getEdgesFromGraph(graph);

    for (const [source, target] of edges) {
        const i = nodeIndices[source];
        const j = nodeIndices[target];
        A[i][j] = 1;
        A[j][i] = 1; // Make symmetric for undirected graphs
    }

    // Create Laplacian matrix: L = D - A where D is degree matrix
    const L = Array(N)
        .fill(0)
        .map(() => Array(N).fill(0));
    for (let i = 0; i < N; i++) {
        // Compute degree (sum of row)
        L[i][i] = A[i].reduce((sum, val) => sum + val, 0);
        for (let j = 0; j < N; j++) {
            L[i][j] -= A[i][j];
        }
    }

    // Compute eigenvectors using power iteration method
    // We need the smallest non-zero eigenvectors of L
    const eigenvectors: number[][] = [];

    // For each dimension, find an eigenvector
    for (let d = 0; d < dim; d++) {
        let vector = Array(N)
            .fill(0)
            .map(() => Math.random() - 0.5);

        // Orthogonalize against previous eigenvectors
        for (const ev of eigenvectors) {
            const dot = vector.reduce((acc, val, idx) => acc + val * ev[idx], 0);
            vector = vector.map((val, idx) => val - dot * ev[idx]);
        }

        // Normalize
        const norm = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0));
        vector = vector.map((val) => val / norm);

        // Apply shifted inverse iteration to find smallest non-zero eigenvector
        // This is a simplification of the actual algorithm
        for (let iter = 0; iter < 100; iter++) {
            // Apply Laplacian
            const newVec = Array(N).fill(0);
            for (let i = 0; i < N; i++) {
                for (let j = 0; j < N; j++) {
                    newVec[i] += L[i][j] * vector[j];
                }
            }

            // Orthogonalize against the constant vector (eigenvector with eigenvalue 0)
            const mean = newVec.reduce((acc, val) => acc + val, 0) / N;
            newVec.forEach((val, idx, arr) => {
                arr[idx] = val - mean;
            });

            // Normalize
            const newNorm = Math.sqrt(newVec.reduce((acc, val) => acc + val * val, 0));
            if (newNorm < 1e-10) {continue;} // Skip if vector is close to zero

            vector = newVec.map((val) => val / newNorm);
        }

        eigenvectors.push(vector);
    }

    // Create position array from eigenvectors
    const positions: number[][] = Array(N)
        .fill(0)
        .map(() => Array(dim).fill(0));
    for (let i = 0; i < N; i++) {
        for (let d = 0; d < dim; d++) {
            positions[i][d] = eigenvectors[d][i];
        }
    }

    // Rescale and create position dictionary
    const scaledPositions = rescaleLayout(positions as any, scale);
    const pos: PositionMap = {};
    nodes.forEach((node: Node, i: number) => {
        pos[node] = (scaledPositions as number[][])[i].map((val: number, j: number) => val + center[j]);
    });

    return pos;
}
