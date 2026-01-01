/**
 * Kamada-Kawai layout algorithm optimization functions
 */

import { Edge,Graph, Node } from "../../types";
import { getEdgesFromGraph,getNodesFromGraph } from "../../utils/graph";
import { _lbfgsDirection } from "./lbfgs";
import { _backtrackingLineSearch } from "./line-search";
import { DistanceMap } from "./types";

/**
 * Compute all-pairs shortest path distances for the graph
 * @param G - NetworkX graph
 * @param weight - Edge attribute for weight
 * @returns Dictionary of dictionaries of shortest path distances
 */
export function _computeShortestPathDistances(G: Graph, weight: string): DistanceMap {
    const distances: DistanceMap = {};
    const nodes = getNodesFromGraph(G);
    const edges = getEdgesFromGraph(G);

    // Initialize distances with direct edges
    for (const node of nodes) {
        distances[node] = {};
        distances[node][node] = 0;

        for (const other of nodes) {
            if (node !== other) {
                distances[node][other] = Infinity;
            }
        }
    }

    // Add direct edges
    for (const [source, target] of edges) {
        // In a real implementation, we would get the weight from the graph
        // For now, assume weight = 1 or use weight attribute if available
        let edgeWeight = 1;
        if (G.getEdgeData) {
            edgeWeight = G.getEdgeData(source, target, weight) || 1;
        }

        distances[source][target] = edgeWeight;
        distances[target][source] = edgeWeight; // Assuming undirected graph
    }

    // Floyd-Warshall algorithm for all-pairs shortest paths
    for (const k of nodes) {
        for (const i of nodes) {
            for (const j of nodes) {
                if (distances[i][k] + distances[k][j] < distances[i][j]) {
                    distances[i][j] = distances[i][k] + distances[k][j];
                }
            }
        }
    }

    return distances;
}

/**
 * Solve the Kamada-Kawai layout optimization problem
 * @param distMatrix - Matrix of desired distances between nodes
 * @param positions - Initial node positions
 * @param dim - Dimension of layout
 * @returns Optimized node positions
 */
export function _kamadaKawaiSolve(distMatrix: number[][], positions: number[][], dim: number): number[][] {
    // Implementation of L-BFGS optimization for Kamada-Kawai
    const nNodes = positions.length;
    const meanWeight = 1e-3;

    // Convert distances to inverse distances (with protection against division by zero)
    const invDistMatrix = distMatrix.map((row) => row.map((d) => (d === 0 ? 0 : 1 / (d + 1e-3))));

    // Flatten positions for optimization
    const posVec = positions.flat();

    // Optimization parameters
    const maxIter = 500;
    const gtol = 1e-5;
    const m = 10; // L-BFGS memory size

    // Implement a simplified L-BFGS-B algorithm
    let alpha = 1.0;
    const oldValues: number[][] = [];
    const oldGrads: number[][] = [];

    for (let iter = 0; iter < maxIter; iter++) {
        // Calculate cost and gradient
        const [cost, grad] = _kamadaKawaiCostfn(posVec, invDistMatrix, meanWeight, dim);

        // Compute search direction using L-BFGS approximation
        const direction = _lbfgsDirection(grad, oldValues, oldGrads, m);

        // Simple line search for step size
        alpha = _backtrackingLineSearch(
            posVec,
            direction,
            cost,
            grad,
            (x: number[]) => _kamadaKawaiCostfn(x, invDistMatrix, meanWeight, dim)[0],
            alpha,
        );

        // Save current position and gradient for next iteration
        const oldPos = [...posVec];

        // Update position
        for (let i = 0; i < posVec.length; i++) {
            posVec[i] += alpha * direction[i];
        }

        // Calculate new gradient
        const [, newGrad] = _kamadaKawaiCostfn(posVec, invDistMatrix, meanWeight, dim);

        // Update L-BFGS memory
        oldValues.push(posVec.map((val, i) => val - oldPos[i]));
        oldGrads.push(newGrad.map((val, i) => val - grad[i]));

        // Keep only m most recent updates
        if (oldValues.length > m) {
            oldValues.shift();
            oldGrads.shift();
        }

        // Check convergence
        const gradNorm = Math.sqrt(newGrad.reduce((sum, g) => sum + g * g, 0));
        if (gradNorm < gtol) {
            break;
        }
    }

    // Reshape result back into positions array
    const result: number[][] = [];
    for (let i = 0; i < nNodes; i++) {
        result.push(posVec.slice(i * dim, (i + 1) * dim));
    }

    return result;
}

/**
 * Cost function and gradient for Kamada-Kawai layout algorithm
 * @param posVec - Flattened position array
 * @param invDist - Inverse distance matrix
 * @param meanWeight - Weight for centering positions
 * @param dim - Dimension of layout
 * @returns Array with [cost, gradient]
 */
export function _kamadaKawaiCostfn(
    posVec: number[],
    invDist: number[][],
    meanWeight: number,
    dim: number,
): [number, number[]] {
    const nNodes = invDist.length;
    const positions: number[][] = [];

    // Reshape flat vector into positions array
    for (let i = 0; i < nNodes; i++) {
        positions.push(posVec.slice(i * dim, (i + 1) * dim));
    }

    // Calculate cost
    let cost = 0;

    // Add mean position penalty term
    const sumPos = Array(dim).fill(0);
    for (let i = 0; i < nNodes; i++) {
        for (let d = 0; d < dim; d++) {
            sumPos[d] += positions[i][d];
        }
    }
    cost += 0.5 * meanWeight * sumPos.reduce((sum, val) => sum + val * val, 0);

    // Add distance penalty terms
    for (let i = 0; i < nNodes; i++) {
        for (let j = i + 1; j < nNodes; j++) {
            // Calculate actual distance
            const diff = positions[i].map((val, d) => val - positions[j][d]);
            const distance = Math.sqrt(diff.reduce((sum, d) => sum + d * d, 0));

            // Add penalty for difference between actual and ideal distance
            const idealInvDist = invDist[i][j];
            const offset = distance * idealInvDist - 1.0;
            cost += 0.5 * offset * offset;
        }
    }

    // Calculate gradient
    const grad = new Array(posVec.length).fill(0);

    // Add gradient of mean position penalty
    for (let i = 0; i < nNodes; i++) {
        for (let d = 0; d < dim; d++) {
            grad[i * dim + d] += meanWeight * sumPos[d];
        }
    }

    // Add gradient of distance penalties
    for (let i = 0; i < nNodes; i++) {
        for (let j = i + 1; j < nNodes; j++) {
            // Calculate actual distance and direction
            const diff = positions[i].map((val, d) => val - positions[j][d]);
            const distance = Math.sqrt(diff.reduce((sum, d) => sum + d * d, 0)) || 1e-10;
            const direction = diff.map((d) => d / distance);

            // Calculate contribution to gradient
            const idealInvDist = invDist[i][j];
            const offset = distance * idealInvDist - 1.0;

            for (let d = 0; d < dim; d++) {
                const force = idealInvDist * offset * direction[d];
                grad[i * dim + d] += force;
                grad[j * dim + d] -= force;
            }
        }
    }

    return [cost, grad];
}
