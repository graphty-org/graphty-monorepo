/**
 * Planar layout algorithm
 */

import { Graph, Node, Edge, PositionMap } from '../../types';
import { _processParams } from '../../utils/params';
import { getNodesFromGraph, getEdgesFromGraph } from '../../utils/graph';
import { rescaleLayout } from '../../utils/rescale';
import { checkPlanarity, combinatorialEmbeddingToPos } from '../../algorithms/planarity';

/**
 * Position nodes without edge intersections (planar layout).
 * 
 * @param G - Graph
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout (must be 2)
 * @param seed - Random seed for reproducible layouts
 * @returns Positions dictionary keyed by node
 */
export function planarLayout(
  G: Graph,
  scale: number = 1,
  center: number[] | null = null,
  dim: number = 2,
  seed: number | null = null
): PositionMap {
  if (dim !== 2) {
    throw new Error("can only handle 2 dimensions");
  }

  const processed = _processParams(G, center || [0, 0], dim);
  
  // Planar layout requires a proper Graph, not just a list of nodes
  if (Array.isArray(processed.G)) {
    throw new Error('Planar layout requires a Graph with edges, not just a list of nodes');
  }
  
  const graph = processed.G;
  center = processed.center;

  const nodes = getNodesFromGraph(graph);
  const edges = getEdgesFromGraph(graph);

  if (nodes.length === 0) {
    return {};
  }

  // Check if graph is planar and get embedding
  const { isPlanar, embedding } = checkPlanarity(graph, nodes, edges, seed);

  if (!isPlanar) {
    throw new Error("G is not planar.");
  }

  if (!embedding) {
    throw new Error("Failed to generate planar embedding.");
  }

  // Convert embedding to positions
  let pos = combinatorialEmbeddingToPos(embedding, nodes);

  // Rescale the positions
  pos = rescaleLayout(pos, scale, center) as PositionMap;

  return pos;
}