/**
 * Index-based layouts over `@graphty/graph-format` snapshots: every function takes a `GraphSnapshot` first and an
 * options object last, and returns a `LayoutResult` whose row `i` is node index `i`. `@graphty/layout` exports them
 * at the top level (and, until 3.0.0, through the deprecated `indexed` namespace). The position helpers exported beside
 * them convert a result: `toPositionMap` to an id-keyed map, `toPositionColumn` to the stride-3 scene-unit column
 * graphty-element and the steppable simulations share, and `fromPositionColumn` back.
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
