/**
 * TypeScript types for interaction testing
 */

import type { ViewMode } from "../../src/config";

/**
 * Options for creating a test graph
 */
export interface TestGraphOptions {
    /** View mode: "2d", "3d", or "xr" */
    mode?: ViewMode;
    /** Whether to pin nodes after dragging */
    pinOnDrag?: boolean;
    /** Layout algorithm to use */
    layout?: string;
    /** Initial node data */
    nodes?: NodeData[];
    /** Initial edge data */
    edges?: EdgeData[];
}

/**
 * Simplified node data for test setup
 */
export interface NodeData {
    id: string | number;
    label?: string;
    x?: number;
    y?: number;
    z?: number;
    [key: string]: unknown;
}

/**
 * Simplified edge data for test setup
 */
export interface EdgeData {
    src: string | number;
    dst: string | number;
    [key: string]: unknown;
}

/**
 * Screen coordinates returned by node position helpers
 */
export interface ScreenPosition {
    x: number;
    y: number;
}

/**
 * Delta for drag operations
 */
export interface DragDelta {
    dx: number;
    dy: number;
}
