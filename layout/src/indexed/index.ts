/**
 * Index-based layouts over a graph-format snapshot: each takes `(snapshot, options?)` and returns a LayoutResult
 * (`dim` values per node in index order). toPositionMap turns a result into the legacy id-keyed map.
 */

export type { ArfOptions } from "./arf";
export { arf } from "./arf";
export type { IndexedForceAtlas2Options, IndexedFruchtermanReingoldOptions } from "./force";
export { forceAtlas2, fruchtermanReingold } from "./force";
export type { KamadaKawaiOptions } from "./kamada-kawai";
export { kamadaKawai } from "./kamada-kawai";
