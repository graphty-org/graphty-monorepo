/**
 * Layout-specific type definitions
 */

import { Node } from "./graph.js";

export type Position = number[];

export type PositionMap = Record<Node, Position>;
