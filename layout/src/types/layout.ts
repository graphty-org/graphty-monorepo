/**
 * Layout-specific type definitions
 */

import { Node } from "./graph";

export type Position = number[];

export type PositionMap = Record<Node, Position>;
