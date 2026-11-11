/**
 * Layout-specific type definitions
 */

import { Node } from "./graph.js";

/** One node's position: `dim` numbers. */
export type Position = number[];

/** Positions keyed by node id. */
export type PositionMap = Record<Node, Position>;
