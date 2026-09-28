/**
 * Main entry point for @graphty/layout: layouts over `@graphty/graph-format` snapshots, the conversions between
 * their results and other position forms, and the steppable simulations.
 */

import * as layouts from "./indexed";

// Re-export all types
export * from "./types";

// Re-export utilities that are part of the public API
export { rescaleLayout, rescaleLayoutDict } from "./utils/rescale";

// Conversions between layout results, PositionMap and the scene position column
export * from "./positions";

// The layouts: each takes a GraphSnapshot and an options object and returns a LayoutResult. Explicit rather than
// export *, so CommonLayoutOptions is the layouts' own and not the simulations' type of the same name.
export {
    arf,
    type ArfOptions,
    bfs,
    type BfsLayoutOptions,
    bipartite,
    type BipartiteLayoutOptions,
    circular,
    type CommonLayoutOptions,
    forceAtlas2,
    fruchtermanReingold,
    grid,
    type GridLayoutOptions,
    type IndexedForceAtlas2Options,
    type IndexedFruchtermanReingoldOptions,
    kamadaKawai,
    type KamadaKawaiOptions,
    type LayerAlign,
    multipartite,
    type MultipartiteLayoutOptions,
    planar,
    radial,
    type RadialLayoutOptions,
    random,
    shell,
    type ShellLayoutOptions,
    spectral,
    spiral,
    type SpiralLayoutOptions,
} from "./indexed";

/**
 * The layouts under their 1.x namespace.
 * @deprecated Every layout is a top-level export since 2.0.0: `indexed.circular` is `circular`. Removed in 3.0.0.
 */
export const indexed = layouts;

// Re-export the simulation seam (design/webgpu/webgpu-acceleration-plan.md section 9.3)
export * from "./simulation";
