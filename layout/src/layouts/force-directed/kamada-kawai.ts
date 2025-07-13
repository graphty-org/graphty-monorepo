import type { Graph, Node, PositionMap } from '../../types';
import type { DistanceMap } from '../../algorithms/optimization';
import { getNodesFromGraph } from '../../utils/graph';
import { _processParams } from '../../utils/params';
import { rescaleLayout } from '../../utils/rescale';
import { circularLayout } from '../geometric/circular';
import { 
  _computeShortestPathDistances,
  _kamadaKawaiSolve
} from '../../algorithms/optimization';

/**
 * Position nodes using Kamada-Kawai path-length cost-function.
 * 
 * @param G - NetworkX graph or list of nodes
 * @param dist - A two-level dictionary of optimal distances between nodes
 * @param pos - Initial positions for nodes
 * @param weight - The edge attribute used for edge weights
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @returns Positions dictionary keyed by node
 */
export function kamadaKawaiLayout(
  G: Graph,
  dist: DistanceMap | null = null,
  pos: PositionMap | null = null,
  weight: string = 'weight',
  scale: number = 1,
  center: number[] | null = null,
  dim: number = 2
): PositionMap {
  const processed = _processParams(G, center, dim);
  const graph = processed.G;
  center = processed.center;

  const nodes = getNodesFromGraph(graph);

  if (nodes.length === 0) {
    return {};
  }

  if (nodes.length === 1) {
    return { [nodes[0]]: center };
  }

  // Initialize distance matrix
  if (!dist) {
    // Kamada-Kawai requires a proper Graph, not just a list of nodes
    if (Array.isArray(graph)) {
      throw new Error('Kamada-Kawai layout requires a Graph with edges, not just a list of nodes');
    }
    dist = _computeShortestPathDistances(graph, weight);
  }

  // Convert distances to a matrix
  const nodesArray: Node[] = Array.from(nodes);
  const nNodes = nodesArray.length;
  const distMatrix: number[][] = Array(nNodes).fill(0).map(() => Array(nNodes).fill(1e6));

  for (let i = 0; i < nNodes; i++) {
    const nodeI = nodesArray[i];
    distMatrix[i][i] = 0;

    if (!dist[nodeI]) continue;

    for (let j = 0; j < nNodes; j++) {
      const nodeJ = nodesArray[j];
      if (dist[nodeI][nodeJ] !== undefined) {
        distMatrix[i][j] = dist[nodeI][nodeJ];
      }
    }
  }

  // Initialize positions if not provided
  if (!pos) {
    if (dim >= 2) {
      // Use circular/spherical layout for 2D and 3D
      pos = circularLayout(G, 1, center, dim);
    } else {
      // For 1D, use a linear layout
      const posArray: PositionMap = {};
      nodesArray.forEach((node, i) => {
        posArray[node] = [i / (nNodes - 1 || 1)];
      });
      pos = posArray;
    }
  }

  // Convert positions to array for computation
  const posArray: number[][] = new Array(nNodes);
  for (let i = 0; i < nNodes; i++) {
    const node = nodesArray[i];
    posArray[i] = pos[node] ? [...pos[node]] : Array(dim).fill(0);

    // Ensure correct dimensionality
    while (posArray[i].length < dim) {
      posArray[i].push(0);
    }
  }

  // Run the Kamada-Kawai algorithm
  const newPositions = _kamadaKawaiSolve(distMatrix, posArray, dim);

  // Convert positions array back to dictionary and rescale
  const finalPos: PositionMap = {};
  for (let i = 0; i < nNodes; i++) {
    finalPos[nodesArray[i]] = newPositions[i];
  }

  return rescaleLayout(finalPos, scale, center) as PositionMap;
}