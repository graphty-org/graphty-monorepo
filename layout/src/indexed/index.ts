/**
 * Index-based layouts over `@graphty/graph-format` snapshots (graph-format design 14.3): every function takes a
 * `GraphSnapshot` first and an options object last, and returns a `LayoutResult` whose row `i` is node index `i`.
 * Reached as the `indexed` namespace of `@graphty/layout`; `toPositionMap` turns a result into the legacy id-keyed map.
 * @module
 */

export type { ArfOptions } from "./arf";
export { arf } from "./arf";
export { bfs, type BfsLayoutOptions } from "./bfs";
export { bipartite, type BipartiteLayoutOptions } from "./bipartite";
export { circular } from "./circular";
export type { CommonLayoutOptions } from "./common";
export type { IndexedForceAtlas2Options, IndexedFruchtermanReingoldOptions } from "./force";
export { forceAtlas2, fruchtermanReingold } from "./force";
export { grid, type GridLayoutOptions } from "./grid";
export type { KamadaKawaiOptions } from "./kamada-kawai";
export { kamadaKawai } from "./kamada-kawai";
export { type LayerAlign, multipartite, type MultipartiteLayoutOptions } from "./multipartite";
export { planar } from "./planar";
export { radial, type RadialLayoutOptions } from "./radial";
export { random } from "./random";
export { shell, type ShellLayoutOptions } from "./shell";
export { spectral } from "./spectral";
export { spiral, type SpiralLayoutOptions } from "./spiral";
