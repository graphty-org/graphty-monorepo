/**
 * The graphty algorithms package: graph algorithms over `@graphty/graph-format` snapshots.
 *
 * Every algorithm takes a frozen `GraphSnapshot` (or an `AdjacencyView` such as `snapshot.reverse()`,
 * for the traversals and paths) first and an options object last, and returns typed arrays indexed
 * by node or edge index plus scalars. Build a snapshot with `GraphBuilder` or `fromEdgeArrays` from
 * `@graphty/graph-format`; `snapshot.ids` maps between node ids and indices.
 * @module
 */

// The algorithms, their options and their results.
export * from "./indexed/index.js";

// Id-keyed views of results, for a caller holding its own node ids.
export { groupsById, type Partition, pathIds, scoresById } from "./indexed/by-id.js";

/**
 * The algorithms under their 2.x namespace, types included (`indexed.PageRankResult`).
 * @deprecated Every algorithm is a top-level export since 3.0.0: `indexed.pageRank` is `pageRank`. Removed in 4.0.0.
 */
export * as indexed from "./indexed/index.js";

// Errors the algorithms throw.
export { ConvergenceError, PathCountOverflowError, PathWalkError } from "./errors.js";

// General-purpose data structures.
export * from "./data-structures/index.js";

// The accelerator seam (design/webgpu/webgpu-acceleration-plan.md section 9.2): an accelerator such as
// @graphty/webgpu-graph-algorithms satisfies AlgorithmAccelerator structurally, and accelerated(acc)
// dispatches each call to it or to the CPU implementation above.
export type {
    AcceleratedAlgorithms,
    AlgorithmAccelerator,
    ApspCycleResultLike,
    ApspResultLike,
    BellmanFordResultLike,
    BetweennessAcceleratorOptions,
    BfsResultLike,
    ClosenessAcceleratorOptions,
    ClosenessResultLike,
    CommunityResultLike,
    CorenessResultLike,
    EdgeScoresResultLike,
    HitsOptionsLike,
    HitsResultLike,
    KatzOptionsLike,
    LabelResultLike,
    MstResultLike,
    PageRankOptionsLike,
    PageRankResultLike,
    PathCountReport,
    ScoresResultLike,
    SsspResultLike,
} from "./indexed/accelerator.js";
export { accelerated } from "./indexed/accelerator.js";

// The machine-readable catalog of the algorithms above: direction, weights, inputs, result and accelerator.
export {
    type AcceleratorMethod,
    type AlgorithmCategory,
    type AlgorithmEntry,
    type AlgorithmInput,
    type AlgorithmInputKind,
    type AlgorithmName,
    type AlgorithmResultKind,
    ALGORITHMS,
    type DispatcherMethod,
    type GraphDirection,
    type WeightUse,
} from "./catalog.js";
