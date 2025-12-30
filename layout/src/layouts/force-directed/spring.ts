/**
 * Spring layout algorithm (Fruchterman-Reingold variant)
 */

import { Graph, Node, PositionMap } from '../../types';
import { fruchtermanReingoldLayout } from './fruchterman-reingold';

/**
 * Position nodes using Fruchterman-Reingold force-directed algorithm.
 * 
 * @param {Object} G - Graph or list of nodes
 * @param {number} k - Optimal distance between nodes
 * @param {Object} pos - Initial positions for nodes
 * @param {Array} fixed - Nodes to keep fixed at initial position
 * @param {number} iterations - Maximum number of iterations
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @param {number} dim - Dimension of layout
 * @param {number} seed - Random seed for initial positions
 * @returns {Object} Positions dictionary keyed by node
 */
export function springLayout(
  G: Graph,
  k: number | null = null,
  pos: PositionMap | null = null,
  fixed: Node[] | null = null,
  iterations: number = 50,
  scale: number = 1,
  center: number[] | null = null,
  dim: number = 2,
  seed: number | null = null
): PositionMap {
  // Legacy compatibility alias
  return fruchtermanReingoldLayout(G, k, pos, fixed, iterations, scale, center, dim, seed);
}