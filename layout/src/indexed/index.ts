/**
 * Index-based layouts over `@graphty/graph-format` snapshots: every function takes a `GraphSnapshot` first and an
 * options object last, and returns a `LayoutResult` whose row `i` is node index `i`. `@graphty/layout` exports them
 * at the top level (and, until 3.0.0, through the deprecated `indexed` namespace). The position helpers exported beside
 * them convert a result: `toPositionMap` to an id-keyed map, `toPositionColumn` to the stride-3 scene-unit column
 * graphty-element and the steppable simulations share, and `fromPositionColumn` back.
 * @module
 */

export type { ArfOptions } from "./arf.js";
export { arf } from "./arf.js";
export { bfs, type BfsLayoutOptions } from "./bfs.js";
export { bipartite, type BipartiteLayoutOptions } from "./bipartite.js";
export { circular } from "./circular.js";
export type { CommonLayoutOptions } from "./common.js";
export type { IndexedForceAtlas2Options, IndexedFruchtermanReingoldOptions } from "./force.js";
export { forceAtlas2, fruchtermanReingold } from "./force.js";
export { grid, type GridLayoutOptions } from "./grid.js";
export type { KamadaKawaiOptions } from "./kamada-kawai.js";
export { kamadaKawai } from "./kamada-kawai.js";
export { type LayerAlign, multipartite, type MultipartiteLayoutOptions } from "./multipartite.js";
export { planar } from "./planar.js";
export { radial, type RadialLayoutOptions } from "./radial.js";
export { random } from "./random.js";
export { shell, type ShellLayoutOptions } from "./shell.js";
export { spectral } from "./spectral.js";
export { spiral, type SpiralLayoutOptions } from "./spiral.js";
