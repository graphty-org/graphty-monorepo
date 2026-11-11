# Algorithms

Every algorithm is an async function with the same shape: `await fn(ctx, snapshot, options?)`, or
`await fn(ctx, snapshot, source, options?)` for the ones that start from a node. Every array that comes back is
indexed by the snapshot's node index (`0 .. nodeCount - 1`), never by node id, and every score result carries
`precision: "f32"`.

<<< ../examples/algorithms.ts

Each one is also a method of the object `createAccelerator(ctx)` returns (`acc.pageRank(snapshot, options)`),
which is how [`@graphty/algorithms`](../../algorithms/) runs them when you pass it a GPU accelerator.

## Options every algorithm takes

| Option       | Meaning                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `dest`       | a preallocated result array of exactly `nodeCount` elements (`Float32Array` for scores, `Uint32Array` for labels) |
| `signal`     | an `AbortSignal`, checked between batches; aborting rejects with `E_ABORTED`                                      |
| `onProgress` | `(done, total)` after every batch                                                                                 |

## Uploads and release

The context uploads what an algorithm needs the first time it sees a snapshot and keeps it until
`ctx.release(snapshot)`, so a second algorithm on the same snapshot pays no upload. Release a snapshot when the
graph goes away: nothing is freed by garbage collection.

## Centrality

| Function                                      | Result                 | Notes                                                                                                      |
| --------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pageRank(ctx, s, options)`                   | `GpuPageRankResult`    | NetworkX's iteration; `dampingFactor` (0.85), `maxIterations` (100), `tolerance` (1e-6), `weighted` (true) |
| `personalizedPageRank(ctx, s, bias, options)` | `GpuPageRankResult`    | the teleport vector is `bias`, one non-negative weight per node, normalised for you                        |
| `hits(ctx, s, options)`                       | `GpuHitsResult`        | hub and authority scores, each summing to 1; direction matters                                             |
| `eigenvectorCentrality(ctx, s, options)`      | `GpuScoresResult`      | power iteration, L2-normalised                                                                             |
| `katzCentrality(ctx, s, options)`             | `GpuScoresResult`      | `alpha` (0.1) attenuates each step, `beta` (1) is every node's floor; L2-normalised                        |
| `closenessCentrality(ctx, s, options)`        | `GpuClosenessResult`   | exact, or sampled from `sources`                                                                           |
| `betweennessCentrality(ctx, s, options)`      | `GpuBetweennessResult` | exact, or sampled with `k` or `sources` (the sum over the sources run, not extrapolated)                   |
| `edgeBetweennessCentrality(ctx, s, options)`  | `GpuEdgeScoresResult`  | one score per edge                                                                                         |

The iterative ones converge when the L1 change of the whole vector falls below `tolerance * nodeCount`;
`iterations` is the first iteration that did, and `converged` says whether any did before `maxIterations`.

## Components and communities

| Function                               | Result              | Notes                                                                                                                                                                                                            |
| -------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `connectedComponents(ctx, s, options)` | `GpuLabelResult`    | weak components (an edge joins its endpoints whatever its direction); labels dense `0 .. count - 1` in first-seen order, the same labels `@graphty/algorithms` gives; `renumber: false` returns raw root indices |
| `labelPropagation(ctx, s, options)`    | `GpuLabelResult`    | communities by label propagation                                                                                                                                                                                 |
| `triangleCount(ctx, s)`                | `GpuTriangleResult` | triangles per node and in total, each node's clustering coefficient, and the transitivity                                                                                                                        |

`GpuLabelResult.groups()` returns the member node indices of each component, built on the first call and cached.

## Paths and traversal

| Function                                      | Result                 | Notes                                                                                                   |
| --------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `breadthFirstSearch(ctx, s, source, options)` | `GpuBfsResult`         | `depth` and `parent` per node; an unreached node's depth is 4294967295 (graph-format's `INVALID_INDEX`) |
| `sssp(ctx, s, source, options)`               | `GpuSsspResult`        | shortest distances over non-negative weights; unreached is `Infinity`                                   |
| `bellmanFord(ctx, s, source, options)`        | `GpuBellmanFordResult` | allows negative weights; `hasNegativeCycle` reports a reachable one                                     |
| `allPairsShortestPath(ctx, s, options)`       | `GpuApspResult`        | an `n x n` distance matrix; refused when it does not fit the device                                     |
| `minimumSpanningTree(ctx, s)`                 | `GpuMstResult`         | a minimum spanning forest (Boruvka)                                                                     |

## Edge cases

- An empty snapshot (`nodeCount: 0`) returns empty results without touching the GPU.
- Results are f32. Compare scores with a tolerance, not for exact equality with a CPU implementation's f64 results.
- A graph too large for the device is refused before any GPU work with `E_TOO_LARGE`; see [Errors](./errors.md).

## A diagnostic: degree

`degree(ctx, snapshot)` returns each node's out-degree, computed on the device. If it disagrees with
`snapshot.outDegree()`, nothing else will work on that device; if it agrees, the device, the upload and the readback
all do.

For every option and field, see the [API Reference](../api/).
