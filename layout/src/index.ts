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

// Re-export all layout algorithms
export * from "./layouts";

// Re-export all graph generation functions
export * from "./generators";

// Re-export the simulation seam (design/webgpu/webgpu-acceleration-plan.md section 9.3)
export * from "./simulation";

// Index-based layouts over a graph-format snapshot. A namespace, because indexed.forceAtlas2 and the rest sit beside
// the legacy functions of the same layouts. Their option types are exported flat, with an Indexed prefix where the
// plain name is taken.
export type {
    ArfOptions,
    IndexedForceAtlas2Options,
    IndexedFruchtermanReingoldOptions,
    KamadaKawaiOptions,
} from "./indexed";
export * as indexed from "./indexed";
