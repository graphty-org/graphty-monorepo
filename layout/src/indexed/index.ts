/**
 * Index-based layouts over `@graphty/graph-format` snapshots (graph-format design 14.3): every function takes a
 * `GraphSnapshot` first and an options object last, and returns a `LayoutResult` whose row `i` is node index `i`.
 * Reached as the `indexed` namespace of `@graphty/layout`.
 * @module
 */

export { circular } from "./circular";
export type { CommonLayoutOptions } from "./common";
export { grid, type GridLayoutOptions } from "./grid";
export { radial, type RadialLayoutOptions } from "./radial";
export { random } from "./random";
export { shell, type ShellLayoutOptions } from "./shell";
export { spiral, type SpiralLayoutOptions } from "./spiral";
