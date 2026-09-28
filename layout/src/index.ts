/**
 * Main entry point for @graphty/layout
 *
 * This file exports the complete public API, maintaining
 * compatibility with the original layout.ts file.
 */

// Re-export all types
export * from "./types";

// Re-export utilities that are part of the public API
export { rescaleLayout, rescaleLayoutDict } from "./utils/rescale";

// Conversions between index-based layout results, PositionMap and the scene position column
export * from "./positions";

// Index-based layouts over graph-format snapshots. A namespace: indexed.circular and the rest would otherwise sit
// beside the legacy circularLayout family under names that differ only by suffix.
export * as indexed from "./indexed";
export type { CommonLayoutOptions } from "./indexed/common";

// Re-export all layout algorithms
export * from "./layouts";

// Re-export all graph generation functions
export * from "./generators";

// Re-export the simulation seam (design/webgpu/webgpu-acceleration-plan.md section 9.3)
export * from "./simulation";
