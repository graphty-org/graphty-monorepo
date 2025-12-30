/**
 * Type definitions for optimization algorithms
 */

import { Node } from '../../types';

// Type definitions for distance structure used in Kamada-Kawai
export type DistanceMap = Record<Node, Record<Node, number>>;