/**
 * Embedding type for planar layout algorithms
 */

import { Node, Position } from './index';

export interface Embedding {
  nodeOrder: Node[];
  faceList: Node[][];
  nodePositions: Record<Node, Position>;
}