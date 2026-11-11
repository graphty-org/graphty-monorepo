# Invariants and vocabulary

This page is the contract every snapshot keeps. You need it when you write code that reads the
arrays directly (an algorithm, a GPU kernel, a file reader); code that only calls methods can skip
it.

## Counting vocabulary

```
nodeCount      n
edgeCount      number of logical edges (NetworkX number_of_edges);
               every EDGE column has edgeCount rows
arcCount       colIdx.length === rowPtr[nodeCount];
               every ARC-aligned array (weights, arcToEdge, per-arc results) has arcCount entries
selfLoopCount  logical edges with source === target
directed:      arcCount === edgeCount
undirected:    arcCount === 2 * edgeCount - selfLoopCount
INVALID_INDEX  0xFFFFFFFF, the one "no index" sentinel for node, edge and arc indices,
               in JS return values and inside Uint32Array vectors alike
```

A **node index** is a dense integer `0 <= i < nodeCount`; a **node id** (`string | number`) lives only
in the id map and at API boundaries and is never coerced. A **logical edge** is one edge as declared;
an **arc** is one entry of `colIdx` (a directed edge is one arc, an undirected edge two, an undirected
self-loop one). A **row** is the arc range `[rowPtr[u], rowPtr[u + 1])` of node `u`.

## Invariants

Every snapshot, whether frozen by the builder, adopted by `fromCsr()` or decoded by `fromBytes()`,
satisfies all of the following. Kernels and algorithms may assume them without
checking; `validate()` re-checks I1-I13. Changing any of them is a data-model major bump.

- **I1** `rowPtr.length === nodeCount + 1`, `rowPtr[0] === 0`, `rowPtr` non-decreasing,
  `rowPtr[nodeCount] === arcCount === colIdx.length`.
- **I2** `colIdx[a] < nodeCount` for every arc; `INVALID_INDEX` never appears in a core or view array.
- **I3** `nodeCount`, `edgeCount`, `arcCount <= MAX_COUNT (0xFFFFFFFE)`; `edgeCount <= arcCount`.
  Arc indices may exceed 2^31: never apply JS bitwise operators to them.
- **I4** Sorted rows: within a row `colIdx` is non-decreasing and equal targets are ordered by
  ascending `arcToEdge`. There is no unsorted mode.
- **I5** Permutations: `arcToEdge` (arcCount entries, values `< edgeCount`) and `edgeToArc`
  (edgeCount entries, values `< arcCount`) with `arcToEdge[edgeToArc[e]] === e`; the arc at
  `edgeToArc[e]` stores the declared `source -> target` orientation of edge `e`.
- **I6** Directed: `arcCount === edgeCount` and `arcToEdge` is a permutation of `0..edgeCount-1`.
- **I7** Undirected: doubled storage; every non-loop arc has exactly one mate in the opposite row
  with the same edge and weight; a self-loop has one arc; `arcCount === 2 * edgeCount - selfLoopCount`.
- **I8** `weights === null` or `weights.length === arcCount`; no `NaN` (infinities are legal and
  reported by `flags.finiteWeights`).
- **I9** Flags are truthful: every `SnapshotFlags` member is a predicate over the arrays, computed at
  freeze or by validation, never guessed.
- **I10** Alignment: every core array, 4-byte view array and GPU-bindable column array is a view over
  a plain `ArrayBuffer` with `byteOffset % 4 === 0` and `byteLength % 4 === 0`; arena segments start
  at multiples of 256 bytes.
- **I11** `ids` is a bijection between `[0, nodeCount)` and the id set (SameValueZero, no `NaN`).
- **I12** `nodes.rowCount === nodeCount`, `edges.rowCount === edgeCount`, `graph.rowCount === 1`;
  every column obeys its length rules; dictionary codes and `refersTo` indices are in range.
- **I13** Edge attribute columns are indexed by logical edge, never by arc.
- **I14** Node index = order of first appearance; edge index = order of `addEdge` minus removals and
  merges, relative order preserved. Nothing is ever sorted by id or degree at freeze.
- **I15** Determinism: the same builder operations with the same options give byte-identical core
  arrays, flags, id map and columns on every run and engine.
- **I16** Prefix stability: without removals or merging policies between two freezes, the earlier
  snapshot's indices are a prefix of the later one's; `freezeWithReport` says exactly when a remap
  happened.
- **I17** After `freeze()` no core array, count, flag, id-map entry or immutable column changes; views
  are memoised once and shared; only the column SET and the CONTENTS of `mutable` columns may change.
- **I18** No core array, view array or column aliases memory a builder can still write.

## On the GPU

`snapshot.arena` describes one `ArrayBuffer` holding the core arrays at 256-byte-aligned offsets
(`hotByteLength` covers `rowPtr`, `colIdx` and `weights`); every core array, every 4-byte view and
`table.gpuView(name)` are plain-`ArrayBuffer` views accepted by `GPUQueue.writeBuffer` without a
cast. `flags` (`weighted`, `multigraph`, `hasSelfLoops`, `arcToEdgeIsIdentity`, ...) let kernels
branch once at dispatch.

## Versioning

The invariants, `INVALID_INDEX`, the counting vocabulary and the meaning of each view are part of
the public API: changing any of them is a breaking change even when no TypeScript signature
changes.
