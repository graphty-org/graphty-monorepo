/**
 * Main entry point for @graphty/layout: layouts over `@graphty/graph-format` snapshots, the conversions between
 * their results and other position forms, and the steppable simulations.
 */

// Re-export all types
export * from "./types";

// The deprecated rescale utilities (rescaleLayout, rescaleLayoutDict). A star re-export, because naming a
// deprecated export here trips @typescript-eslint/no-deprecated.
export * from "./utils/rescale";

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

// Re-export the simulation seam (design/webgpu/webgpu-acceleration-plan.md section 9.3)
export * from "./simulation";

// The machine-readable catalog of the layouts and simulations above.
export {
    type LayoutAcceleratorMethod,
    type LayoutEntry,
    type LayoutName,
    LAYOUTS,
    type LayoutWeightUse,
} from "./catalog";
