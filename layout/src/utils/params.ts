/**
 * Parameter processing utilities
 */

import { Graph, Node } from '../types';

/**
 * Process and validate layout parameters
 * Helper function similar to _process_params in Python version
 * 
 * @param G - Graph object or array of nodes
 * @param center - Center coordinates or null
 * @param dim - Dimension of layout
 * @returns Processed parameters
 */
export function _processParams(G: Graph | Node[], center: number[] | null, dim: number): { G: Graph | Node[]; center: number[] } {
  if (!center) {
    center = Array(dim).fill(0);
  }

  if (center.length !== dim) {
    throw new Error("length of center coordinates must match dimension of layout");
  }

  return { G, center };
}