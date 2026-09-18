# @graphty/graph-format Design

Status: Accepted (owner confirmed the section 18 decisions on 2026-09-13)
Date: 2026-09-13
Package: `@graphty/graph-format` (directory `graph-format/` in the pnpm/Nx
monorepo at `/home/apowers/Projects/graphty-monorepo`)
Companion package proposed here: `@graphty/graph-io` (section 8.2)

Reading guide. This document is the single normative description of the
graph data format that `@graphty/algorithms`, `@graphty/layout`,
`@graphty/graphty-element` and `@graphty/webgpu-graph-algorithms` will
consume. It is self-contained: a reader who has not seen the ten research
notes in `tmp/graph-format-design/` can implement it. Sections 1-2 fix the
vocabulary and the owner decisions that are not revisited. Sections 3-7
define the data model (snapshot, id map, columns, builder, views) and are
the part kernels and algorithms depend on; the numbered invariants in
section 3.2 are the contract. Sections 8-11 cover populating, serialising,
GPU upload and errors. Section 12 is the complete TypeScript surface in one
place and is normative wherever an earlier section shows an excerpt.
Sections 13-16 cover the package, the consumer migration (with worked
ports), the performance model and the tests. Section 17 is the decision
log: one row per contradiction C1-C22 and per gap G1-G18 of research note
10, the open-question register, and (17.4) the decisions taken where the
six adversarial reviews of this document conflicted. Section 18 records
the owner decisions that were confirmed on 2026-09-13. Plain ASCII throughout; `--` is a dash.

---

## Table of contents

1. Summary and goals / non-goals
2. Terminology
3. Data model: the frozen snapshot
4. Id map
5. Attribute columns
6. Builder
7. Derived views and derived graphs
8. Populating the format
9. Serialisation and transfer
10. GPU contract
11. Error handling and validation conventions
12. TypeScript surface
13. Package layout and monorepo conventions
14. Consumer migration
15. Performance and memory model
16. Testing strategy
17. Decision log
18. Open questions for the owner

---

## 1. Summary and goals / non-goals

### 1.1 What is decided already (not relitigated)

- `@graphty/graph-format` is a zero-runtime-dependency, framework-agnostic
  graph DATA FORMAT: a frozen compressed-sparse-row (CSR) representation
  over typed arrays, a mutable builder that produces frozen snapshots,
  columnar typed node/edge attribute storage, and an id-to-index map kept
  outside the CSR. It contains no graph algorithms, no rendering and no
  WebGPU code.
- ONE representation serves CPU algorithms and WebGPU algorithms. Upload to
  the GPU is a memcpy of typed arrays, never a format conversion. Derived
  views (reverse CSR, COO edge list, degree arrays, ...) are lazily computed
  and cached per frozen instance.
- `@graphty/algorithms`, `@graphty/layout` and `@graphty/graphty-element`
  will be refactored to consume this format. The WebGPU package at
  `/home/apowers/Projects/webgpu-graph-algorithms` moves into the monorepo
  as `@graphty/webgpu-graph-algorithms`, consumes the CSR directly, and is
  an OPTIONAL accelerator injected by the caller. The GPU package never
  falls back to CPU; the CPU algorithms package is the separate,
  always-available implementation.
- The format must be easy to populate from GEXF, GML, GraphML, CSV edge
  lists, JSON and similar.
- Measured on 100k nodes / 1M edges in Node 22: CSR from typed edge arrays
  20 ms; the current algorithms `Graph` class build 650 ms / 243 MB;
  `graphToMap` 1021 ms; `toCSRGraph` 2376 ms. String coercion of ids and
  per-edge object allocation are the main costs. Conversion must happen
  once per graph mutation, never per algorithm call.

### 1.2 Summary of the design

A `GraphBuilder` interns ids once, appends edges to growable typed staging
arrays and typed attribute columns, tolerates removals with tombstones, and
produces a `GraphSnapshot` with `freeze()`. The same builder can be frozen
again after further mutation; a freeze after appends keeps every existing
index, a freeze after removals compacts and returns a remap.

A snapshot is an out-adjacency CSR (`rowPtr`, `colIdx`) with rows always
sorted by target index, an optional arc-aligned `Float32Array` of weights,
two permutation arrays that tie every CSR entry ("arc") to the logical edge
it came from (`arcToEdge`, `edgeToArc`; both present, both free when they
are the identity), a `NodeIdMap` that translates external ids
(`string | number`) to dense indices, three Arrow-style columnar attribute
tables (`nodes`, `edges`, `graph`), a flags block, and a per-instance cache
of lazily derived views. Undirected graphs are stored doubled (both arcs,
self-loops once). Node indices and logical edge indices are insertion
order. The core arrays of a freshly frozen snapshot live in one
256-byte-aligned `ArrayBuffer` arena so the WebGPU package can upload the
whole core with one `writeBuffer` and bind sub-ranges, or upload arrays one
by one; either way the upload is a memcpy. Every public typed array is
typed over a plain `ArrayBuffer` (`Uint32Array<ArrayBuffer>`, section
12.1), which is what `GPUQueue.writeBuffer` accepts without a cast.

Everything that changes the node or edge set produces a new snapshot plus a
remap. Everything else -- results, positions, importer attributes -- is an
index-aligned column attached to the snapshot's side tables without a new
freeze.

### 1.3 Goals

- G-ONCE: the CSR is built once per topology mutation; every algorithm,
  layout and GPU upload consumes the same frozen object. The stale-cache
  bug of the current `WeakMap<Graph, CSRGraph>` cannot recur because a
  snapshot never changes.
- G-MEMCPY: every GPU-bound array is a 4-byte-element typed array over an
  `ArrayBuffer` with `byteOffset % 4 === 0` and `byteLength % 4 === 0`; the
  frozen core lives in one 256-byte-aligned arena; no conversion at the GPU
  boundary for the core, the 4-byte views or `f32`/`i32`/`u32`/`u8`/`bool`
  columns. The documented exceptions are `f64` columns (`gpuView()`
  converts once and caches) and the four `f64` views (the three
  weighted-degree views and `selfLoopWeight()`), which the GPU package
  recomputes on the device when a kernel needs them (section 10.1).
- G-FAST: freeze from typed edge arrays stays in the 20-30 ms class per
  million directed arcs (45-55 ms undirected) in Node 22; freeze from string
  ids adds only the unavoidable id interning, paid in the builder, not at
  freeze.
- G-STABLE: node index = insertion order, edge index = insertion order,
  deterministic freeze; the five order-sensitive layouts, seeded layouts and
  file round trips depend on it.
- G-ERGONOMIC: no `undefined` from in-range reads, no branded casts in hot
  loops, no nullable permutation arrays, one field name per concept across
  the four consumer packages.
- G-LOSSLESS: attribute columns, ids, edge order, orientation, graph
  metadata and GEXF dynamic values carry enough information for GEXF 1.3 /
  GraphML / GML / CSV / JSON round trips to be exact within declared types;
  every loss an exporter cannot avoid is reported before writing.
- G-TRANSFER: a snapshot crosses a Worker boundary in O(1) per buffer and
  persists to IndexedDB or a file as one versioned blob.
- G-MIGRATE: legacy public signatures and result shapes of the three
  consumers keep working unchanged through a dual-API window.

### 1.4 Non-goals

- No graph algorithms (traversal, shortest path, centrality, communities,
  planarity, matchings, spanning trees, flow, layouts, APSP, generators).
  Section 7.1 gives the criterion that separates a "view" from an
  "algorithm" and lists what falls on each side.
- No rendering, no Babylon.js, no WebGPU API calls, no `GPUDevice`. The
  format exposes byte lengths, alignment and flags; it never inspects
  device limits.
- No text parsers in the core package. GEXF/GML/GraphML/CSV/DOT/Pajek/JSON
  dialect importers and exporters live in `@graphty/graph-io` (section
  8.2); the core exposes the `GraphSink` contract they push into and three
  in-memory entry points.
- No mutable CSR. Mutation happens in the builder, never on a snapshot.
- No masks honoured by algorithms. Filtering is `inducedSubgraph()` /
  `filterEdges()`; hiding is a renderer concern.
- No 64-bit indices: node, edge and arc counts are bounded by `0xFFFFFFFE`
  (invariant I3). WGSL has no 64-bit integers; a graph that does not fit
  32-bit indices cannot be processed on a WebGPU device anyway.
- No `bigint` ids (Neo4j int64 ids above 2^53 import as strings).
- No hyperedges, no GraphML ports, no nested graphs as topology
  (containment is a node column).
- No fallbacks of any kind: the format hands out typed arrays and does not
  care whether WebGPU exists; a big-endian host or an unknown wire dtype is
  an error (`E_UNSUPPORTED`), never a silent downgrade.
- No `SharedArrayBuffer` in v1 (decision D-SAB, section 9.4): every buffer
  the package allocates or adopts is a plain `ArrayBuffer`, so every public
  typed array is `Uint32Array<ArrayBuffer>`-shaped and uploads without a
  cast. Shared-memory snapshots are reserved for a later minor as a
  separate generic instantiation; section 18 decision 3 covers the deployment
  side.

---

## 2. Terminology

These names are used consistently in this document, in code identifiers,
in JSDoc, in error messages and in the four consumer packages.

| Term | Meaning | Identifier |
| --- | --- | --- |
| node index | Dense integer `0 <= i < nodeCount`, assigned in insertion order by the builder (first `addNode` or first mention as an edge endpoint). The only way nodes are referenced inside a snapshot. | `NodeIndex` (alias of `number`) |
| node id | The external identity of a node, `string \| number`, never coerced. Lives only in the id map and at API boundaries. | `NodeId` |
| logical edge (edge) | One edge as the caller declared it: `(source, target[, weight, attributes])`. Index `0 <= e < edgeCount` in insertion order (compacted after removals or merges). Edge attribute columns have `edgeCount` rows. | `EdgeIndex` (alias of `number`) |
| arc | One entry of `colIdx`: the out-arc `u -> colIdx[a]` stored in row `u`. A directed edge is one arc; an undirected edge `{u, v}`, `u !== v`, is two arcs (one in row `u`, one in row `v`); an undirected self-loop is one arc. Index `0 <= a < arcCount` in CSR order. | `ArcIndex` (alias of `number`) |
| row | The contiguous arc range `[rowPtr[u], rowPtr[u+1])` of node `u`: its out-arcs. | -- |
| arc-to-edge | The array giving the logical edge of every arc. | `arcToEdge: Uint32Array(arcCount)` |
| edge-to-arc | The array giving, for every logical edge, the arc that stores the DECLARED `source -> target` orientation. | `edgeToArc: Uint32Array(edgeCount)` |
| mate | For an undirected graph, the arc storing the opposite orientation of the same edge (a self-loop is its own mate). | `mate(): Uint32Array(arcCount)` |
| snapshot | The frozen object: CSR core + id map + attribute tables + flags + view cache. Topology is immutable; the column SET and, for columns declared mutable, column CONTENTS are mutable side tables (section 5.8). | `GraphSnapshot` |
| builder | The mutable accumulator that produces snapshots. Long-lived; can be frozen repeatedly. | `GraphBuilder` |
| view | Typed arrays derived from the snapshot's topology in O(n + m), in the SAME node and edge index space, lazily computed and cached on the snapshot. Never a new snapshot. | methods on `GraphSnapshot` |
| derived graph | A NEW snapshot produced from an existing one by a structural mapping the caller specifies, plus index maps back to the source. Not cached by the format. | `DerivedGraph` |
| column | One attribute: a dtype, a typed data buffer, an optional validity bitmap, optional dictionary / offsets / child, and metadata. | `Column` (discriminated union) |
| table | A set of columns with a fixed row count: `nodes` (nodeCount rows), `edges` (edgeCount rows), `graph` (1 row), extension tables (their own row count). | `AttributeTable` |
| id map | Bijection between node ids and node indices for one snapshot. Kept outside the CSR arrays. | `NodeIdMap` |
| remap | A `Uint32Array` mapping old index -> new index (`INVALID_INDEX` for removed) produced when a freeze compacts or a derived graph changes the index space. | `nodeRemap`, `edgeRemap` |
| role | A format-neutral tag on a column saying what it means (`weight`, `label`, `position`, `parent`, ...). | `ColumnRole` |
| dictionary | The string table of a dictionary-encoded column; codes are `u32`. | `DictColumn.dictionary` |
| validity | Arrow-style bitmap: bit `r` set means row `r` holds a value; clear means "not set" (null). | `Column.validity` |
| wire form | The plain-object, transferable, versioned representation of a snapshot (JSON manifest + `ArrayBuffer[]`). | `WireSnapshot` |
| edge id | Optional external identity of a logical edge, `string \| number`, carried by an edge column with role `id` (section 4.6). | `EdgeId` |
| container | The byte encoding of the wire form as one contiguous buffer (magic `GSNP`). | section 9.2 |
| arena | One `ArrayBuffer` holding the core arrays at 256-byte-aligned offsets. | `ArenaLayout` |
| `INVALID_INDEX` | `0xFFFFFFFF`. The one and only "no index" sentinel, for node, edge and arc indices, in JS return values and inside `Uint32Array` vectors alike. | `INVALID_INDEX` |

Words deliberately NOT used for exported types: `Graph`, `Node`, `Edge`
(three incompatible types with those names already exist in the monorepo),
`CSRGraph` (collides with the algorithms class and the WebGPU type until
both are removed). Words not used as a synonym for arc, edge or node in
prose or identifiers: "slot", "half-edge", "incidence", "nnz", "vertex",
"link", "transpose view" (say reverse), "symmetric view" (say
`toUndirected`). The words keep their ordinary technical meaning
elsewhere: the builder's per-node "incidence lists" are a data-structure
name, "node-link" is a JSON dialect name, an "array element" is never
called a slot.

Counting vocabulary (C5, C19, C20):

```
nodeCount      n
edgeCount      number of logical edges (what NetworkX calls number_of_edges);
               every EDGE column has edgeCount rows
arcCount       colIdx.length === rowPtr[nodeCount];
               every ARC-aligned array (weights, arcToEdge, per-arc results) has arcCount entries
selfLoopCount  logical edges with source === target
directed:      arcCount === edgeCount
undirected:    arcCount === 2 * edgeCount - selfLoopCount
```

---

## 3. Data model: the frozen snapshot

### 3.1 Fields

Every field below is a public readonly property of the `GraphSnapshot`
class. Typed arrays are exposed as the aliases `U32` / `F32` / ... of
section 12.2 (`Uint32Array<ArrayBuffer>` and friends; plain typed-array
classes with the buffer parameter fixed to `ArrayBuffer`, not
`Readonly<...>` wrappers; section 12.1 explains why) so that
`.subarray()`, `queue.writeBuffer()`, `structuredClone` and `postMessage`
accept them without casts.

```typescript
export declare class GraphSnapshot implements AdjacencyView {
    // ---- identity ----
    readonly serial: number;               // process-unique identity of the CORE; shared by withColumns() snapshots (section 5.8)
    readonly label: string | null;         // debugging aid supplied at freeze
    readonly formatVersion: 1;             // data-model major (section 13.5)

    // ---- counts ----
    readonly directed: boolean;
    readonly nodeCount: number;            // n, <= MAX_COUNT
    readonly edgeCount: number;            // logical edges
    readonly arcCount: number;             // colIdx.length
    readonly selfLoopCount: number;        // logical edges with source === target

    // ---- CSR core: immutable, 4-byte element arrays over ArrayBuffer ----
    readonly rowPtr: U32;                  // nodeCount + 1
    readonly colIdx: U32;                  // arcCount; target node index of each arc; sorted within each row; length 0 when arcCount === 0
    readonly weights: F32 | null;          // arcCount; null when unweighted (every weight is 1)
    readonly arcToEdge: U32;               // arcCount; logical edge of each arc (lazily materialised when identity)
    readonly edgeToArc: U32;               // edgeCount; arc holding the declared orientation (lazily materialised when identity)

    // ---- flags kernels branch on (section 3.8) ----
    readonly flags: SnapshotFlags;

    // ---- side structures ----
    readonly ids: NodeIdMap;               // section 4
    readonly nodes: AttributeTable;        // rowCount === nodeCount, section 5
    readonly edges: AttributeTable;        // rowCount === edgeCount
    readonly graph: AttributeTable;        // rowCount === 1
    readonly extensions: ReadonlyMap<string, AttributeTable>;   // section 5.10 (temporal tables)
    readonly meta: GraphMeta;              // section 5.9
    readonly arena: ArenaLayout | null;    // section 10.3; null when arrays were adopted from separate buffers
    get detached(): boolean;               // rowPtr.length === 0: the core was transferred away (section 9.4)
    readonly [SNAPSHOT_BRAND]: true;       // Symbol.for brand read by isGraphSnapshot() (section 7.5)
    // methods: sections 3.9, 7, 9, 11
}
```

`colIdx`, `arcToEdge` and `weights` have length 0 when `arcCount === 0`,
and `edgeToArc` has length 0 when `edgeCount === 0` (an empty builder, or
a node-only graph before its edges arrive, freezes to a valid snapshot;
section 11.3). A zero-length array is a legal JS value but not a legal
storage binding, so section 10.5 tells the GPU package what to do.

Dtype and length of every core array:

| Array | Dtype | Length | Contents |
| --- | --- | --- | --- |
| `rowPtr` | u32 | n + 1 | `rowPtr[0] === 0`; `rowPtr[u+1] - rowPtr[u]` is the out-arc count of `u` |
| `colIdx` | u32 | arcCount | target node index of arc `a`; the source is the row containing `a`; non-decreasing within a row |
| `weights` | f32 | arcCount | weight of logical edge `arcToEdge[a]`; both arcs of an undirected edge carry the same value |
| `arcToEdge` | u32 | arcCount | logical edge index of arc `a` |
| `edgeToArc` | u32 | edgeCount | the arc `a` in row `source(e)` with `colIdx[a] === target(e)` and `arcToEdge[a] === e` (the declared orientation) |

`arcToEdge` and `edgeToArc` are declared as plain `readonly U32`
properties (C6). When the permutation is the identity (a directed graph
whose input was already grouped by source and sorted by target, which is
what `fromCsr`, sorted edge files and re-frozen snapshots produce), the
arrays are allocated on first access by a getter, as separate
4-byte-aligned buffers outside the arena (their `arena.segments` entry is
`null`). Whether or not a consumer has touched the getter, an identity
permutation is NEVER part of `arena`, `transferables()`, `byteLength()`,
`toWire()` or `toBytes()`: the wire form always carries `null` for it
when `flags.arcToEdgeIsIdentity` is set, and `fromWire` / `fromBytes`
never materialise it, so `toBytes()` output does not depend on which
getters were called (I15, P11). The flag `flags.arcToEdgeIsIdentity` is
what GPU code tests, BEFORE reading `snapshot.arcToEdge` /
`snapshot.edgeToArc` (section 10.1 gives the shader pattern that makes
the identity case free). CPU code never checks for `null`. For undirected
graphs both arrays are always materialised, whatever their contents (the
predicate behind the flag is `directed && arcToEdge[a] === a` for every
`a`; an undirected graph whose edges are all self-loops has an identity
permutation and still reports `false`, section 3.8).

The declared orientation of an undirected edge is preserved: `edgeToArc[e]`
points at the arc in the row of the source the caller passed to
`addEdge`, so exporters and `edgeList()` reproduce the file's endpoint
order even though both arcs exist.

### 3.2 Invariants (numbered, testable)

Every snapshot -- produced by the builder, adopted from caller arrays with
validation, or decoded from the wire form with validation -- satisfies all
of the following. Kernels and algorithms may assume them without checking.
`validate()` (section 11.4) checks I1-I13 per the level table of section
9.5; I14-I16 are properties of the BUILDER and are checked by the property
tests P2 / P3 / P11 of section 16.1 against the builder command log;
I17-I18 are checked by `validate({ checksum: true })` and P11. A change to
any invariant is a data-model major bump (section 13.5).

Structure:

- I1. `rowPtr.length === nodeCount + 1`; `rowPtr[0] === 0`; `rowPtr` is
  non-decreasing; `rowPtr[nodeCount] === arcCount === colIdx.length`.
- I2. `colIdx[a] < nodeCount` for every arc. `INVALID_INDEX` never appears
  in `rowPtr`, `colIdx`, `arcToEdge`, `edgeToArc` or any view array.
- I3. `nodeCount <= MAX_COUNT`, `edgeCount <= MAX_COUNT`,
  `arcCount <= MAX_COUNT`, where `MAX_COUNT = 0xFFFFFFFE`; `edgeCount <=
  arcCount`. Arc indices may exceed `2^31`, so consumers never apply JS
  bitwise operators to them (`x & ~63` is negative above `2^31`; write
  `x - (x % 64)`, section 10.6).
- I4. Sorted rows: within every row, `colIdx` is non-decreasing, and arcs
  with equal `colIdx` are ordered by ascending `arcToEdge`. There is no
  unsorted mode and no flag (C1).
- I5. Permutations: `arcToEdge.length === arcCount`, every value
  `< edgeCount`; `edgeToArc.length === edgeCount`, every value
  `< arcCount`; `arcToEdge[edgeToArc[e]] === e` for every edge; the row
  containing `edgeToArc[e]` is the declared source of `e` and
  `colIdx[edgeToArc[e]]` is the declared target of `e`.
- I6. `directed === true` implies `arcCount === edgeCount` and `arcToEdge`
  is a permutation of `0..edgeCount-1` (every edge appears exactly once).
- I7. `directed === false` implies doubled storage: for every arc `a` in
  row `u` with `colIdx[a] === v` and `u !== v` there is exactly one arc
  `b` in row `v` with `colIdx[b] === u` and `arcToEdge[b] === arcToEdge[a]`;
  a self-loop edge has exactly one arc; `arcCount === 2 * edgeCount -
  selfLoopCount`; `weights[a] === weights[b]` when weighted. Consequently
  `reverse()` returns the forward arrays themselves.
- I8. `weights === null` or `weights.length === arcCount`; no element is
  `NaN`. `+Infinity` and `-Infinity` are legal and reported by
  `flags.finiteWeights`.
- I9. Flags are truthful: every member of `SnapshotFlags` is defined by a
  predicate over the arrays (section 3.8), computed at freeze or by
  validation, never guessed. There is no flag whose value may be "unknown".
- I10. Alignment: every core array, every 4-byte view array, and the array
  a GPU-eligible column hands to the GPU (`data` for `u32` / `i32` /
  `f32`, `paddedU32View()` for `u8`, `data` for `bool`, the validity words)
  is a view over a plain `ArrayBuffer` with `byteOffset % 4 === 0` and
  `byteLength % 4 === 0`; `f64` arrays have `byteOffset % 8 === 0` (the
  typed-array constructor guarantee). When `arena !== null`, every core
  array whose entry in `arena.segments` is non-null is a view into
  `arena.buffer` starting at an offset that is a multiple of 256 bytes
  relative to `arena.byteOffset`; a core array whose segment is `null` (an
  identity permutation materialised on demand, a zero-length array, an
  absent `weights`) is not in the arena.

Ids and columns:

- I11. `ids` is a bijection between `[0, nodeCount)` and the id set of the
  snapshot: `ids.indexOf(ids.idOf(i)) === i` for every `i`, `ids.size ===
  nodeCount`, equality is SameValueZero, no id is `NaN`.
- I12. `nodes.rowCount === nodeCount`, `edges.rowCount === edgeCount`,
  `graph.rowCount === 1`; every column obeys its own length rules (section
  5.7); dictionary codes of valid rows are `< dictionary.length`;
  `refersTo` columns (and the `u32` child of a `refersTo` list column) hold
  in-range indices or `INVALID_INDEX` with the row unset.
- I13. Edge attribute columns are indexed by LOGICAL edge, never by arc.

Order and stability:

- I14. Node index equals order of first appearance in the builder; logical
  edge index equals order of `addEdge` calls minus edges removed or merged,
  preserving relative order. Nothing is ever sorted by id or by degree at
  freeze (C18).
- I15. Determinism: the same sequence of builder operations with the same
  options produces byte-identical core arrays, flags, id map and columns on
  every run and every engine (stable counting sorts only; `Map` iteration
  is insertion order).
- I16. Prefix stability: if no `removeNode`, `removeEdge` or merging
  duplicate policy took effect between two freezes of the same builder,
  the earlier snapshot's node indices and edge indices are a prefix of the
  later snapshot's. `freezeWithReport` returns `nodeRemap === null` exactly
  when step 1 of section 6.3 did not renumber nodes, and `edgeRemap ===
  null` exactly when neither step 1 nor step 7 renumbered edges; the two
  are independent (a `removeNode` followed by a reviving `addNode` of the
  same id before the freeze leaves nodes prefix-stable while the removed
  incident edges still compact, so `nodeRemap === null` with `edgeRemap
  !== null` is a legal report). For the FIRST freeze of a builder the
  "old" index space is the builder's own (`nodeBound` / `edgeBound` before
  step 1), so a removal before the first freeze is reported like any
  other.

Immutability and aliasing:

- I17. After `freeze()` returns, no core array, count, flag, id-map entry
  or immutable column of the returned snapshot ever changes. Views are pure
  functions of the core, memoised once, never invalidated, and SHARED: a
  view returns the cached array itself, so writing into a view is a
  contract violation (callers that need scratch call `.slice()` first,
  section 7.2). The column SET of `nodes` / `edges` / `graph` and the
  CONTENTS of columns declared `mutable` may change (section 5.8); row
  counts may not. Derived graphs over the same node space share the SAME
  `AttributeTable` instance for `nodes` (section 5.11), so a column
  attached to either is visible on both.
- I18. No core array, view array or column of a snapshot aliases memory a
  builder can still write. `freeze()` copies out of staging by scatter;
  adoption (`fromCsr`, `fromBytes`) transfers ownership to the snapshot.

### 3.3 Undirected storage

Undirected graphs are stored DOUBLED (I7): every edge `{u, v}` with `u !==
v` contributes arc `u -> v` in row `u` and arc `v -> u` in row `v`, both
mapping to the same logical edge through `arcToEdge` and carrying the same
weight; a self-loop `{u, u}` contributes exactly one arc in row `u`. This
is the consensus of every library surveyed in research note 08 (NetworKit,
cuGraph, Gunrock, LAGraph, GAP, DGL, graphology-indices, petgraph `Csr`)
and the only layout for which a GPU gather kernel reads one contiguous row
per node. igraph's half storage (one arc per edge plus two permutation
indices, a merge on every neighbour query) is rejected: it has no
contiguous row and cannot be bound as one `array<u32>`.

Consequences:

- `reverse()` on an undirected snapshot returns the forward arrays
  themselves (zero cost).
- The "each edge once" rule for edge-centric loops: iterate logical edges
  `0..edgeCount-1` through `edgeList()` (`src` / `dst` / `weights` per
  logical edge; the binding an edge-parallel kernel uses, section 10.1),
  or iterate arcs and keep `a` only when `a === edgeToArc[arcToEdge[a]]`
  (two dependent gathers per arc; CPU-side only). The old `source >
  target` string-coercing comparison in `@graphty/algorithms` disappears.
  A "canonical COO" (arcs with `src <= dst`) asked for by research note 09
  is superseded by `edgeList()` (decision log, section 17.1 C19).
- Edge attributes exist once per logical edge (I13); a per-arc result is
  folded to per-edge with `foldArcs()` (section 7.5).
- Weights are materialised per arc (Q30): `weights[a]` is read by SSSP and
  PageRank inner loops without a gather. Cost: 4 bytes per arc, i.e. 8
  bytes per undirected edge.

### 3.4 Self-loops

A self-loop is one arc in row `u` with `colIdx === u`, whether the graph is
directed or undirected (I7). `rowPtr[u+1] - rowPtr[u]` therefore counts a
loop once; this is the GPU-native quantity and what every kernel reads.
Two degree conventions exist in the wild (the layout package's
`getNodeDegree` test asserts once; NetworkX counts an undirected loop
twice), so the snapshot names both as views (C20, Q1) and no consumer
package hides an adjustment:

| View | Directed graph | Undirected graph |
| --- | --- | --- |
| `outDegree()[u]` | `rowPtr[u+1] - rowPtr[u]` | same (loop counted once) |
| `inDegree()[u]` | count of arcs with `colIdx === u` | alias of `outDegree()` |
| `degree()[u]` (graph-theoretic, NetworkX convention) | `inDegree[u] + outDegree[u]` | `outDegree[u] + selfLoopsPerNode()[u]` (loop counts twice) |

`selfLoopsPerNode()` and `selfLoopArcs()` (section 7.2) are the building
blocks. `@graphty/layout` uses `outDegree()` for parity with its existing
test; `@graphty/algorithms`' NetworkX-parity results use `degree()`.

Builder option `selfLoops: "keep" | "drop" | "error"`, default `"keep"`.

### 3.5 Parallel edges (multigraph)

Parallel edges are kept by default (C2): the CSR represents them natively
as repeated `colIdx` values in a row, adjacent because of I4 and ordered by
logical edge index. Flow residual graphs (research note 02), GEXF 1.3
`kind` multigraphs and Gephi CSV files need them; graphty-element's
converter already asks for `allowParallelEdges: true`. `flags.multigraph`
is computed during freeze at no extra cost (adjacent equal `colIdx`).

Semantics on a multigraph:

- `findArc(u, v)` returns the FIRST matching arc (lowest arc index, which
  by I4 is the lowest logical edge index among the parallels), or
  `INVALID_INDEX`.
- `arcsBetween(u, v)` returns the half-open range `[lo, hi)` as a
  two-element tuple; empty when `lo === hi`. Total: never throws.
- `multiplicity(u, v) === hi - lo`.
- `hasArc(u, v) === (findArc(u, v) !== INVALID_INDEX)`.

Merging is opt-in through the builder option `duplicateEdges` (section
6.5), applied at freeze after sorting so no `(u, v)` hash is ever built;
`simplified()` (section 7.3) dedupes an existing snapshot with per-column
reducers. Three sanctioned behaviours for code that wants simple-graph
semantics on a multigraph:

- CPU row loops skip adjacent arcs with equal `colIdx` (I4 guarantees the
  parallels are adjacent): `if (v === prevV) continue; prevV = v;` costs
  one compare per arc and no allocation. This is the default idiom for
  betweenness, k-core, isomorphism, Katz, common neighbours and every
  other "neighbour SET" algorithm in `@graphty/algorithms` (section 14.2).
- `simplified()` is for callers that need a simple SNAPSHOT (a kernel
  upload, a consumer that keeps it around); graphty-element caches it per
  source snapshot next to `toUndirected()` (section 14.4).
- Kernels that cannot do either check `flags.multigraph` and throw.

Undirected multigraph pairing: with the two stable counting-sort passes of
section 6.3, the k-th `u -> v` arc in row `u` and the k-th `v -> u` arc in
row `v` originate from the same logical edge, so `arcToEdge` pairs them
without a search and `mate()` is a lockstep walk (proof in section 6.4).

### 3.6 Directedness

`directed: boolean` on every snapshot. There is no tri-state and no
per-arc direction bit in the core (C3). The builder is constructed with a
`directed` value and may change it with `setDirected()` while it holds no
edges, or from undirected to directed at any time with `{ expand: true }`
(section 6.6); the OWNER of a builder can `lockDirected()` so that
importers cannot change it. Every snapshot frozen from a builder carries
the builder's value at that moment.

- `directed === false`: doubled storage (I7); every logical edge is
  undirected.
- `directed === true`: every logical edge is one arc (I6). No symmetry is
  assumed; `isSymmetric()` (section 7.2) reports whether the arc set
  happens to be closed under reversal with equal weights, so an undirected
  algorithm can accept such a graph without copying.

Mixed-direction files (GEXF, GraphML, Pajek, Gephi CSV, JGF, graphology;
research note 07 E4) are handled at IMPORT by expansion into a directed
snapshot: every undirected source edge becomes two logical edges `u -> v`
and `v -> u`, and the importer writes two reserved-role edge columns so
exporters can reverse the expansion:

- `graphty.directed` (dtype `bool`, role `directed`): `1` for edges that
  were directed in the source, `0` for both halves of an expanded edge.
- `graphty.pair` (dtype `u32`, role `pair`, `refersTo: "edge"`): the
  logical index of the other half, `INVALID_INDEX` (row unset) for
  genuinely directed edges. Because `refersTo` is declared, compaction,
  `inducedSubgraph`, `relabel` and `filterEdges` rewrite the values
  (section 5.11).

The names follow the producer-owned dotted convention of section 5.6 so a
user attribute called `directed` or `pair` never collides with them;
consumers look the columns up by ROLE. The PRIMARY half of an expanded
edge is the one with the lower logical index (`pair[e] > e`); the mirror
half is `pair[e] < e`. Mirror rows of every other edge column are left
UNSET: exporters fold pairs back through `pair` and read attributes from
the primary half only, so nothing is duplicated and a column declared
`unique` (edge ids) is never violated by the expansion. GEXF `mutual`
edges expand the same way with an additional `graphty.mutual` bool role
column so the exporter re-emits one `mutual` edge.

Importer option `onMixedDirection: "expand" | "directed" | "undirected" |
"error"`, default `"expand"`: `"directed"` treats every edge as directed
(drops the distinction with a report entry), `"undirected"` treats every
edge as undirected (for a 99%-undirected GEXF that should load as an
undirected graph; reported), `"error"` refuses. A file whose edges are ALL
undirected imports as `directed: false` with no `pair` column; a file whose
edges are all directed imports as `directed: true` with no `pair` column.
Both statements hold whenever the importer is allowed to set the sink's
direction (the registry's own builder, or a caller's builder that is
empty and not locked); the precedence rule for a locked or non-empty sink
is in section 8.4.

Why not a tri-state: roughly two dozen algorithms in `@graphty/algorithms`
branch on or assert directedness (research note 01 section 4); a third
state adds a rejection branch to each of them, makes invariants I6/I7
unstatable, makes the `arcCount` formula depend on per-edge data, and a
`directed` sugar boolean would make a mixed graph read as undirected to any
unported `if (!graph.directed)` check. Expansion keeps one rule, costs
nothing for the two common cases, and costs 5 bytes per edge (`directed` +
`pair`) only for mixed input. NetworkX refuses mixed files outright.

### 3.7 Weights and precision

- `weights` is `Float32Array | null`, arc-aligned, materialised at freeze.
  `null` means every weight is 1 and no array is allocated (the GraphBLAS
  "iso" case, Q4); `flags.allWeightsOne` is then `true`. A builder
  allocates the array on the first `addEdge` that passes a weight (or the
  first `setEdgeWeight`), filling earlier edges with 1. A caller that
  declares `weighted: true` gets the array even if every value is 1 (the
  format never drops a declared array; `flags.allWeightsOne` lets kernels
  skip it).
- Storage precision is f32 because WGSL has no f64 and the weight is read
  in the hottest loops (SSSP, PageRank, Louvain, spectral, force layouts).
  CPU algorithms read `weights[a]` as a JS number holding the f32 value and
  accumulate in f64.
- f64 fidelity (C4): the builder option `weightDtype: "f32" | "f64"`
  (default `"f32"` for the builder; EVERY importer and the algorithms
  facade's `toSnapshot(Graph)` pass `"f64"`, section 8.4) selects the
  staging dtype. At freeze, if `weightDtype` is `"f64"` and at least one
  value is not f32-exact, the original values are kept as an `f64` edge
  column with role `weight` (the "shadow"); if every value is f32-exact
  the shadow costs zero bytes because the arc array already holds the
  exact values (the common integer-weight case, so the 20 ms path is
  unaffected). `meta.weightOrigin` records the declared source type either
  way so exporters re-declare `double`. Exporters prefer the shadow column
  when present and otherwise read `edgeList().weights`, formatting each
  f32 value as the shortest decimal that round-trips through
  `Math.fround` (never `String(x)`, which would print
  `0.10000000149011612` for a stored `0.1`).
- Explicit versus defaulted weights (G-LOSSLESS): the arc array cannot
  tell "weight absent" from "weight 1". The builder therefore keeps a
  lazily allocated `weightSet` bitmap (`ceil(E / 32)` words; allocated on
  the first `addEdge` that omits the weight after one that supplied it, or
  vice versa; `null` while every edge agrees). At freeze, when the bitmap
  exists, the role-`weight` edge column is kept even if every value is
  f32-exact (then with dtype `f32`, 4E bytes) and the bitmap becomes its
  validity: set rows were explicit. The one case where the bitmap is
  `null` although no weight was explicit -- a builder declared
  `weighted: true` whose edges all omitted the weight, so the arc array
  exists and is all ones -- is treated the same way at freeze: the column
  is kept with an all-clear validity bitmap (`nullCount === edgeCount`).
  Exporters emit the weight attribute
  for set rows only; GEXF is the one format where an absent weight and
  `1.0` are spec-equivalent, so its exporter may emit either. A snapshot
  with no role-`weight` column therefore has every weight explicit (or is
  unweighted, `weights === null`).
- `NaN` is rejected at `addEdge` / `setEdgeWeight` / `addEdges`
  (`E_INVALID_WEIGHT`). `+Infinity` / `-Infinity` are accepted (a legal
  SSSP sentinel) and `flags.finiteWeights` reports whether any infinite
  value exists. Negative weights are accepted; `flags.nonNegativeWeights`
  reports. Zero is a valid weight; the layout package's legacy wrappers
  keep their `|| 1` behaviour on the way in, the indexed layout API uses
  the value as is (section 14.3).
- The default weight for an edge added without one in a weighted graph is
  `1`. `@graphty/algorithms`' Kruskal/Prim `?? 0` default becomes `1`
  during the port (section 18 decision 7).
- The single weight per edge is THE weight. Any other numeric edge
  attribute is a column. Which source field becomes the weight is the
  importer's job (`weightFrom`, section 8.4); the builder takes an explicit
  `weight` argument per edge (Q14).

### 3.8 Flags

```typescript
export interface SnapshotFlags {
    /** Some row contains two arcs with equal colIdx (parallel edges). */
    readonly multigraph: boolean;
    /** selfLoopCount > 0. */
    readonly hasSelfLoops: boolean;
    /** directed && arcToEdge[a] === a for all a (and edgeToArc is the identity). Always false when !directed, even when arcCount === edgeCount. */
    readonly arcToEdgeIsIdentity: boolean;
    /** weights !== null. */
    readonly weighted: boolean;
    /** weights === null, or every value === 1. Lets SSSP degrade to BFS. */
    readonly allWeightsOne: boolean;
    /** weights === null, or every value >= 0. Dijkstra / delta-stepping legal. */
    readonly nonNegativeWeights: boolean;
    /** weights === null, or every value is finite. */
    readonly finiteWeights: boolean;
}
```

Each flag is defined by the predicate in its comment; `validate("full")`
recomputes and compares them (I9). Deliberately NOT flags: `sortedRows`
(always true, I4), `symmetric` (a lazily computed view, `isSymmetric()`,
because computing it for a directed graph costs a transpose and a flag must
never be "unknown"), `indexOrder` (always insertion, I14).

### 3.9 Row ordering and query methods

Rows are sorted by target index with ties broken by ascending logical edge
index (I4). Freeze achieves this with two stable counting-sort passes over
the edge list (by target, then by source; section 6.3), so there is no
comparator sort anywhere and the cost is O(n + m). Insertion order of
edges is carried by the logical edge index and is recoverable at any time
through `edgeToArc`, so exporters and anything that wants "the edges in
file order" iterate logical edges, never arcs.

This choice (C1) is made because: `findArc` / `hasArc` become O(log d)
binary searches; common-neighbour, k-truss and triangle counting become
merge intersections; multigraph detection is free; the existing
`@graphty/algorithms` `CSRGraph` already sorts rows so its BFS-family code
ports unchanged; GPU dedupe and intersection kernels assume it. The
order-sensitive layouts depend on NODE order (preserved, I14) and not on
neighbour order, except `bfsLayout` and `planarLayout`, whose neighbour
visiting order becomes "ascending node index" (deterministic, documented;
their Chromatic stories are re-baselined once, section 14.3).

Query methods on the snapshot (all total for valid indices, unchecked for
out-of-range indices, section 11.3). `outArcs` and `arcsBetween` return a
fresh two-element tuple per call and are BOUNDARY conveniences: hot loops
read `rowPtr[u]` / `rowPtr[u + 1]` directly (every worked port in section
14.2 does), and callers that need the multiplicity without a tuple use
`findArc` + `multiplicity`.

```typescript
export declare class GraphSnapshot {
    outArcs(u: number): readonly [start: number, end: number];   // [rowPtr[u], rowPtr[u + 1]]; allocates
    outDegreeOf(u: number): number;                              // rowPtr[u + 1] - rowPtr[u]
    findArc(u: number, v: number): number;                       // first arc u -> v or INVALID_INDEX; binary search
    hasArc(u: number, v: number): boolean;
    arcsBetween(u: number, v: number): readonly [lo: number, hi: number];   // allocates
    multiplicity(u: number, v: number): number;
    arcSource(a: number): number;                                // row of arc a; O(1) after coo(), else binary search on rowPtr
    edgeSource(e: number): number;                               // arcSource(edgeToArc[e])
    edgeTarget(e: number): number;                               // colIdx[edgeToArc[e]]
    edgeIndexOf(id: EdgeId): number;                             // via the role "id" edge column; INVALID_INDEX on miss
}
```

---

## 4. Id map

### 4.1 Id type and equality (C15, G1)

```typescript
export type NodeId = string | number;
```

Concrete, not generic. Every consumer already uses exactly this union
(`NodeId`, `NodeIdType`, layout `Node`); a generic `TNodeId` on a class
whose only operations are lookups trips
`@typescript-eslint/no-unnecessary-type-parameters`; the dense-integer
fast path can only exist if the map knows ids are numbers. The root
`CLAUDE.md` pattern `algorithmName<TNodeId = unknown>(graph:
ReadonlyGraph<TNodeId>)` is superseded for format-consuming code (open
question 4); the id-keyed `ReadonlyGraph<TNodeId>` facade does not live in
this package (the legacy `Graph` class of `@graphty/algorithms` is that
facade during the dual-API window).

Equality is SameValueZero, the semantics of a JS `Map` key: `1 !== "1"`,
`-0` equals `0` (stored as `0`), `1` equals `1.0`, non-integers such as
`1.5` are legal ids, the text `"1.0"` (a GEXF float-looking string id) is a
string and never equals the number `1`. `NaN`, `Infinity`, `-Infinity`,
`bigint`, objects, `null` and `undefined` are rejected with `E_INVALID_ID`
(`NaN` so that a `Float64Array` of numeric ids can use it internally as
"not a number"). A string id containing a lone UTF-16 surrogate is also
rejected (`E_INVALID_ID`, `details.reason: "lone surrogate"`): `TextEncoder`
would replace it with U+FFFD on the wire and I11 would break across a
transfer. Nothing in the core coerces an id; coercion is an importer
option (`ids: "keep" | "canonical" | "string" | "number"`, section 8.4)
applied before the id reaches the builder. `"keep"` is the default for
sources whose values are already typed (JSON, records); `"canonical"` is
the default for text-cell sources (CSV, Pajek, DOT, GML, GEXF, GraphML): a
cell becomes a number iff it is canonical integer text
(`/^-?(0|[1-9][0-9]*)$/` and `Number.isSafeInteger`), else it stays a
string. The rule is injective on text (`"01"`, `"1.0"` and `"+1"` stay
strings; `"1"` becomes `1`), so `String(id)` on export reproduces the cell
exactly, SNAP / KONECT files hit the `identity` / `dense` fast path, and no
two distinct cells collide. `"number"` (`Number()` per cell) can merge
`"01"` and `"1"`; the importer counts such merges as `coercion` issues. A
paired node table and edge table (two CSV files) are coerced with the
same rule in one import call (section 8.4).

### 4.2 Storage kinds and the dense-integer fast path

`NodeIdMap` is immutable and has five storage kinds, chosen at freeze (or by
`fromEdgeArrays` / `fromCsr` / `fromWire`) by inspecting the ids once in
O(n):

| kind | Condition | index -> id | id -> index | Bytes / node |
| --- | --- | --- | --- | --- |
| `identity` | every id is a number and `id === index + offset` for one integer `offset` (0 or 1 in practice: SNAP, Pajek, GML, d3 index links, `fromEdgeArrays` without ids) | arithmetic | arithmetic + range check | 0 |
| `dense` | every id is an integer in `[0, MAX_COUNT)`, all distinct, and `maxId + 1 <= 2 * nodeCount` (SNAP-style non-contiguous ids) | `Uint32Array(n)` | `Uint32Array(maxId + 1)` filled with `INVALID_INDEX` | 4 + 4..8 |
| `numeric` | every id is a number, no other pattern | the builder's `ids` JS array (shared) and/or `Float64Array(n)` (wire), two caches of one value, materialised lazily in either direction like the string store below | `Map<number, number>` (shared from the builder or built lazily) | 8 + ~40 when the Map exists |
| `string` | every id is a string | decoded `string[]` and/or Utf8 store (`Uint32Array(n + 1)` offsets + `Uint8Array` bytes), see below | `Map<string, number>` | 8 + bytes + ~60 (Map + string) |
| `mixed` | otherwise | the builder's `ids` array (shared) and/or `Uint8Array(n)` tag (0 number, 1 string) + `Float64Array(n)` + the string store (wire; lazily materialised) | one `Map<NodeId, number>` (a JS Map already distinguishes types) | 13 + bytes + Map |

Rules:

- The builder keeps a `Map<NodeId, number>` and an `ids: (string |
  number)[]` array from the first non-anonymous `addNode` onward
  (`addAnonymousNodes` needs neither, section 6.6); it needs both to make
  `addNode` idempotent and to resolve `addEdge(id, id)` (C17: eager).
- At freeze the snapshot's `numeric`, `string` or `mixed` map SHARES the
  builder's `Map` and `ids` array by reference, guarded by `index <
  nodeCount`: entries with a larger index belong to the builder's future
  and are invisible to the snapshot. This is correct because indices are
  append-only between compactions (I16). A compacting freeze builds
  FRESH, compacted `Map` and `ids` objects for the builder and the NEW
  snapshot shares those; the PREVIOUS snapshot retains the objects it was
  frozen with (section 6.3 step 1). Per-freeze cost for string ids: zero
  (C17). The interning cost (~15-25 ms per 100k short strings) is paid
  once in `addNode`.
- `identity` and `dense` kinds drop the `Map` on the snapshot side; the
  builder keeps its own.
- `fromEdgeArrays` without `ids` yields `identity` with `offset` 0 and no
  storage at all. `identity` with `offset: 1` covers 1-based files (Pajek,
  GML, KONECT) without materialising anything (Q24).
- A `dense` map is only chosen when the inverse array would be at most
  twice the node count; beyond that density the `Map` is cheaper.
- A map whose first 1000 ids are dense integers and whose 1001st is a
  string is simply `mixed`; there is no partial fast path.
- Strings have two physical representations that are two caches of one
  logical value: the decoded `string[]` (what the builder has; what
  `idOf()` returns) and the Arrow Utf8 store (offsets + UTF-8 bytes; what
  the wire form and the container carry, transferable in O(1)). A snapshot
  frozen from a builder holds the decoded array and materialises the Utf8
  store lazily on the first `toWire()` / `toBytes()` / `transferables()`;
  a snapshot decoded from the wire holds the Utf8 store and decodes lazily
  (per row on `idOf(i)`, cached in a sparse array; in bulk on
  `idsSlice()` / `toArray()`). Nothing is encoded or decoded at freeze.
- The reverse `Map` of a wire-decoded snapshot is built lazily on the first
  `indexOf` / `has` / `requireIndex` (one pass over the ids).

### 4.3 API

```typescript
export type NodeIdMapKind = "identity" | "dense" | "numeric" | "string" | "mixed";

export declare class NodeIdMap implements Iterable<NodeId> {
    readonly kind: NodeIdMapKind;
    readonly size: number;                          // === nodeCount
    readonly offset: number;                        // identity only; else 0
    idOf(index: number): NodeId;                    // throws E_INDEX_RANGE when index >= size
    indexOf(id: NodeId): number;                    // INVALID_INDEX when absent (C9)
    has(id: NodeId): boolean;
    requireIndex(id: NodeId): number;               // throws E_UNKNOWN_NODE when absent
    indicesOf(ids: Iterable<NodeId>, onMissing?: "invalid" | "throw"): U32;
    idsSlice(start?: number, end?: number): NodeId[];   // bulk decode, one pass
    toArray(): NodeId[];                            // fresh array in index order
    [Symbol.iterator](): IterableIterator<NodeId>;
    // boundary helpers for index-aligned result vectors (generic over the vector element type, C11)
    toMap<T>(values: ArrayLike<T>): Map<NodeId, T>;
    toStringMap<T>(values: ArrayLike<T>): Map<string, T>;   // String(id) keys; legacy Map<string, T> result shapes
    toRecord<T>(values: ArrayLike<T>): Record<string, T>;   // String(id) keys; legacy result shapes only
    entries<T>(values: ArrayLike<T>): IterableIterator<[NodeId, T]>;
    stringIndex(): ReadonlyMap<string, number>;     // String(idOf(i)) -> i; built lazily once; for legacy string-typed id parameters
    byteLength(): number;                           // typed storage only; excludes the Map and JS strings
}
```

`indexOf` returns `INVALID_INDEX` (`0xFFFFFFFF`) on a miss rather than
`-1` or `undefined` (C9): it is the same sentinel used in every
`Uint32Array` result vector (C10), it does not force an `undefined` check
under strict flags, it keeps `indexOf` total, and a stray sentinel cannot
masquerade as a valid index in a typed array (a `Uint32Array` write of
`-1` produces the same bits). `requireIndex` is the boundary call for
algorithms that today throw "node not found"; it preserves their error
behaviour. `has(id)` is for boolean tests.

### 4.4 Index stability across snapshots

- Within one snapshot indices are dense and fixed (I11).
- Within one builder, node indices are assigned in insertion order and
  never reused between compactions; `removeNode` tombstones. After a
  compacting freeze the builder's own indices are renumbered to EQUAL the
  new snapshot's indices (C7), so between freezes "builder index" and
  "snapshot index" are the same number for every live node and edge, and
  an index-aligned consumer buffer needs exactly one remap per removal
  burst, never a permanent handle-to-index indirection.
- Two snapshots from the same builder with only appends between them share
  index prefixes (I16): node `i` of the old snapshot is node `i` of the
  new one for all `i < oldNodeCount`, and likewise for edges. Consumers
  extend index-aligned buffers instead of rebuilding them;
  `freezeWithReport().nodeRemap === null` is the signal.
- A freeze after `removeNode` / `removeEdge`, or one whose duplicate policy
  merged edges, compacts and returns `nodeRemap: Uint32Array(oldNodeBound)`
  and `edgeRemap: Uint32Array(oldEdgeBound)` (old index -> new index or
  `INVALID_INDEX`), where "old" is the index space of the previous freeze
  of the same builder (plus anything appended since), or the builder's own
  index space for the first freeze (I16). `remapArray(data, remap,
  newLength, fill, components)` (section 5.11) carries raw index-aligned
  arrays such as positions across; `remapColumn(column, remap, newLength)`
  does the same for a `Column`. Removal is rare (research note 04, paths
  M4/M5).
- Derived graphs (section 7.3) carry their own `NodeIdMap`, sharing the
  underlying storage by reference when the node set is unchanged and
  gathering otherwise.

### 4.5 Serialisability

| kind | Wire form (section 9.1) |
| --- | --- |
| `identity` | `{ kind: "identity", size, offset }` |
| `dense` | `{ kind: "dense", size, values: u32 buffer }` (the inverse array is rebuilt on load) |
| `numeric` | `{ kind: "numeric", size, values: f64 buffer }` |
| `string` | `{ kind: "string", size, offsets: u32 buffer, utf8: u8 buffer }` |
| `mixed` | `{ kind: "mixed", size, tags: u8 buffer, numbers: f64 buffer (0 where string), offsets: u32 buffer, utf8: u8 buffer }` |

All buffers are transferable; the reverse `Map` is never serialised.
`structuredClone(idMap)` of the class instance is not supported; always go
through the snapshot's `toWire()`.

### 4.6 Edge ids

Edge ids are optional data, not structure: an edge column with role `id`
(dtype `string`, `dict`, `u32` or `f64`; the value type is `EdgeId =
string | number`), declared `unique: true` by importers that read them
(GEXF, GraphML, Cytoscape, Gephi CSV) and by graphty-element for its
counter ids (section 14.4). Uniqueness over SET rows is enforced at freeze
(`E_DUPLICATE_EDGE_ID` with both edge indices). `snapshot.edgeIndexOf(id)`
returns the edge index or `INVALID_INDEX`, backed by a `Map` built lazily
on first call. Exporters
that require ids (GEXF 1.2, Cytoscape) and find no column generate
canonical `e0..e{E-1}` at write time and never write them back. Cytoscape's
shared node/edge id namespace and Neo4j id spaces (Q27) are importer and
exporter conventions recorded in `ColumnMeta.origin.namespace` and an
optional `idSpace` column; the core has one node id space and one optional
edge id column.

---

## 5. Attribute columns

The attribute model is Apache Arrow's columnar layout without the
dependency: a typed values buffer, an optional validity bitmap, an optional
dictionary or offsets or child, and per-column metadata that records where
the column came from. Mirroring Arrow's layout means a future
`toArrowTable()` bridge is a relabelling, not a conversion. No per-row
objects exist anywhere.

### 5.1 Dtypes

| dtype | Data buffer | Extra buffers | GPU eligibility (section 10.4) | Typical sources |
| --- | --- | --- | --- | --- |
| `f32` | `Float32Array(rows * components)` | -- | `direct` | positions, layout mass/size, GPU results, declared `float` |
| `f64` | `Float64Array(rows * components)` | -- | `convert` (cached f32 copy) | JSON numbers; GEXF/GraphML `double`, `long`; GML `real`; timestamps; CPU results |
| `i32` | `Int32Array(rows * components)` | -- | `direct` | GEXF `integer`/`short`/`byte`; GraphML `int`; GML `int` |
| `u32` | `Uint32Array(rows * components)` | -- | `direct` | index references (`parent`, `pair`), labels, partitions, dictionary codes, remaps |
| `u8` | `Uint8Array(rows * components)` over a store from which a zero-copy `Uint32Array` view is constructible (section 5.7) | -- | `packed` (4 per u32 word, `unpack4xU8`) | small enums, byte flags, colour bytes |
| `bool` | `Uint32Array(ceil(rows / 32))` bit-packed, LSB-first: the Arrow boolean layout, identical to the validity bitmap and to `NodeMask` / `EdgeMask` (one bitmap layout in the package, C13) | -- | `packed` (32 per word, `(w[r >> 5u] >> (r & 31u)) & 1u`) | GEXF/GraphML/Neo4j booleans, `fixed`, `hidden`, `graphty.directed` |
| `dict` | `Uint32Array(rows)` codes | `dictionary: readonly string[]` (wire: offsets + utf8) | `direct` (codes only) | categories, `kind`, Neo4j labels/type, GEXF `<options>` |
| `string` | Utf8 store: `Uint32Array(rows + 1)` offsets + `Uint8Array` utf8, plus a lazily decoded `string[]` cache (section 4.2 rule for ids applies) | -- | `none` | free text, urls, names |
| `list` | `Uint32Array(rows + 1)` offsets | `child: Column` of any dtype except `list` (one level, Q23), non-nullable | `none` (a consumer may upload the child with its offsets) | GEXF list types, Neo4j arrays, Cytoscape `classes`, GML repeated keys, spells |
| `json` | `unknown[]` (wire: JSON text in a utf8 buffer) | -- | `none` | nested objects: GEXF `viz:color`, yFiles geometry, node-link nested dicts (C22) |

Not provided: `i64`/`u64` (`BigInt64Array` has no WGSL counterpart and no
consumer); `f16` (not in the ES2020 lib, not in Node 22, `shader-f16`
absent on the reference GPU; Q41: can be added as a new dtype string later
without breaking anything); `i16`/`u16` (WGSL cannot address them; use
`u32` or packed `u8`).

Dtype rules (C4):

- Declared types map exactly: GEXF/GraphML/Neo4j `double` and `long` ->
  `f64`; `float` -> `f32`; `int`/`short`/`byte` -> `i32`; `boolean` ->
  `bool`; `string` -> `string` (or `dict` when the importer's cardinality
  heuristic fires); `liststring` / `list*` -> `list`; JSON numbers ->
  `f64`. The format never silently downcasts an attribute; a consumer that
  wants f32 for the GPU asks `gpuView()`, which converts once per snapshot
  and caches. The one place f32 is mandatory is the arc-aligned `weights`
  array (section 3.7).
- Type inference for untyped sources (CSV cells, GML values, DOT strings,
  `fromRecords`, `addNodeRecord`) runs per COLUMN, never per cell, widening
  monotonically in the order `(unset) -> bool -> i32 -> f64 -> string ->
  json`. Inference never yields `f32` (f32 silently corrupts `0.1` and
  integers above 2^24). A column that saw `1` and then `"01"` becomes
  `string` for all rows. Widening after rows were written reallocates the
  column once (O(rows), at most four times); the builder reports it in
  `FreezeReport.widened` so importers can fix headers. Inference lives in
  the core because `fromRecords` and `addNodeRecord` are core entry points.
  The lexical grammar is fixed so two implementations agree (I15): from
  TEXT, `bool` is exactly `true` / `false` (case-sensitive); `i32` is
  `/^-?(0|[1-9][0-9]*)$/` within `[-2^31, 2^31)`; `f64` is a decimal or
  exponent literal accepted by `Number()` that is not empty, not
  whitespace, not `Infinity` / `NaN` and not a hex / octal / binary form;
  everything else is `string`. `0` / `1` text is `i32`, never `bool`. JS
  values map by `typeof` (`boolean` -> `bool`, integral `number` in i32
  range -> `i32`, other `number` -> `f64`, `string` -> `string`, array or
  object -> `json`).
- A DECLARED `long` / `double` column never widens. A `long` value with
  `|v| > 2^53` is stored as the nearest `f64` and recorded as a
  `precision` issue, unless the importer option `long: "string"` was given,
  in which case the whole column is `string` from the declaration.
  `bigdecimal` / `biginteger` are always `string`; `origin.type` records
  the declared type in every case.
- `date` / `dateTime` and Neo4j temporal types become `f64` epoch
  milliseconds (or the raw numeric time when the file's `timeformat` is
  integer/double), with `origin.type` and `meta.timeFormat` preserved for
  the exporter; missing `end` is `+Infinity`. When any value's canonical
  re-formatting would differ from the source text (a UTC offset such as
  `+02:00`, fractional seconds, a date without a time) the importer also
  writes a companion `string` column named `<column>.text` with role
  `timeText` and `extra.for: "<column>"` holding the lexical form; the
  exporter emits the text when present and formats the number otherwise.
  The CPU and GPU never read the companion.
- Spells (`[[s0,e0],[s1,e1]]`) are a `list` whose child is `f64` with
  `itemComponents: 2`, role `spells`. GEXF 1.3 `timestamps="<[t1, t2]>"`
  (a list of instants per element) is a `list` of `f64`, role
  `timestamps`. GEXF 1.2 `startopen` / `endopen` are a `u8` column with
  role `open` (bit 0 = start open, bit 1 = end open); an exporter for a
  format without open intervals reports `W_OPEN_INTERVAL` in `check()`.

### 5.2 Multi-component (stride) columns

`components` (1..16, default 1) applies to `f32`, `f64`, `i32`, `u32`,
`u8`. The data buffer has `rows * components` elements, interleaved,
row-major (`data[row * components + k]`). The validity bitmap is per ROW
(one bit covers all components). WGSL kernels read a 3-component `f32`
column as `array<f32>` with manual `3u * i + k` indexing; `array<vec3<f32>>`
has a 16-byte stride and must never be declared over it; a column meant to
be read as `array<vec4<f32>>` is declared with `components: 4`.

Positions (C14): the canonical column has role `position`, dtype `f32`,
`components: 3`, `mutable: true`, and its unit is SCENE units (the
coordinates the renderer draws, post-scale). Fixed stride keeps the
renderer's Babylon buffers and GPU kernels branch-free; the 4 bytes per
node spent on `z = 0` for 2D graphs is negligible. Layout RESULTS keep
their own `dim` (2 or 3) and their own normalised units in `LayoutResult`
(research note 03 explicitly asks not to force `dim = 3` there); the
layout package's `toPositionColumn(result, scale, center, out?)` applies
the scene scale and expands the stride once at store time, not per
upload, writing into `out` (the owner's existing array) when given;
`fromPositionMap` / `pos` seeding divides by the same scale on the way
back into a layout. `withComponents(data, from, to, fill)` is the generic
stride helper. Importers map GEXF `viz:position`, Pajek coordinates,
Cytoscape `position` and DOT `pos` INTO this one column (filling `z = 0`,
recording `origin.extra.sourceDims: 2` so the exporter omits `z`, and
`origin.extra.units: "file"` so the consumer knows the values are the
file's, not the scene's; graphty-element rescales at import per its
config); there are no separate `x`/`y`/`z` roles, so there is no
precedence rule to get wrong.

### 5.3 Nullability, validity bitmap and defaults (C13)

Every column has `validity: U32 | null`. `null` means all rows are set
(the fast path for weights, positions, results and CSV columns without
blanks). When present, `validity.length === ceil(rows / 32)` and row `r` is
set iff `(validity[r >>> 5] >>> (r & 31)) & 1`. This is LSB-first within a
little-endian 32-bit word, which is bit-for-bit the Arrow validity bitmap
when the words are viewed as bytes on a little-endian host, and it is a
4-byte-multiple buffer that uploads as `array<u32>` unchanged. It is the
same layout as `bool` column data (section 5.1) and as the packed
node/edge mask helpers (section 7.4), so the package has ONE bitmap
layout and a kernel reads a `fixed` bool column, a validity bitmap and a
`NodeMask` with the same expression. `nullCount` is stored on the column
and kept exact by the setters.

Unset rows hold the column's `fill` value in `data` (`0`, empty string,
code `0` for `dict`, empty list, `undefined` for `json`): the GPU sees the
fill, never a NaN unless the producer chose NaN as the fill.
`meta.default` (the GEXF/GraphML declared default) is separate from
`fill`, with one rule that makes defaults free on the GPU: when a column
is declared with a `default` that is representable in its dtype (a
number for `f32` / `f64` / `i32` / `u32` / `u8`, a boolean for `bool`, a
dictionary member for `dict`) and no explicit `fill` was given, `fill` is
SET TO the default, so `data` already holds the default in unset rows and
`materializeDefault()` returns the column itself. The typed accessor
`column.value(r)` returns `default` for unset rows when a default is
declared and `undefined` otherwise; the raw `data` exposes the fill;
exporters consult `validity` to emit only explicit values (so the
`validity` bitmap still records which rows were explicit). For `string` /
`list` / `json` columns, or when `fill` and `default` differ,
`column.materializeDefault()` returns a copy with the default written
into unset rows (cached like a view, invalidated by `markDirty()`;
`E_NO_DEFAULT` when no default is declared); the GPU cannot bind those
dtypes anyway. JSON `null` imports as unset; export writes the key absent
(the one documented lossy corner). For `dict` columns an unset row is
never a dictionary entry; for `list` columns unset (`offsets[r] ===
offsets[r + 1]`, bit clear) is distinct from empty (same offsets, bit
set).

In-place writes through `mutableData()` do not touch `validity`; a
mutable column therefore offers `mutableValidity(): U32 | null` (the
bitmap itself, for owners that set rows one at a time) and `setAll()`
(drops the bitmap, `nullCount = 0`). A layout engine or importer that
writes every row calls `setAll()` after its first full pass so an
exporter does not omit positions that are now valid; exporters treat a
`null` bitmap as all set.

### 5.4 Dictionary strings

A `dict` column holds `Uint32Array` codes and a `dictionary: readonly
string[]` in first-seen order (or the declared GEXF `<options>` order when
the importer declares it up front). Codes are dense `0..dictionary.length -
1`. The builder interns on the fly with a `Map<string, number>` that is
dropped at freeze; the snapshot rebuilds it lazily on the first
`codeOf(value)`. Cardinality is unbounded; the importer heuristic (in
`graph-io`) chooses `dict` over `string` when the number of distinct
values is below `rows / 2` after the first 1024 rows and otherwise widens
to `string`. `codes` uploads directly (colour-by-category kernels); the
dictionary stays on the CPU. Merging two dictionaries
(`GraphBuilder.from(snapshot)` continuing a snapshot, or `addGraph()`)
re-interns codes through the target dictionary (O(rows)).

### 5.5 Column metadata

Two shapes exist: `ColumnDecl` is the INPUT to `declareNodeColumn` /
`declareEdgeColumn` / `set()` and uses optional (`?:`) fields;
`ColumnMeta` is the OUTPUT on every column, has every field present with
`null` for "none", and never uses `?:` (the `exactOptionalPropertyTypes`
rule of section 12.1). The complete definitions are in section 12.2; the
fields and their meaning:

| Field | Meaning |
| --- | --- |
| `name` | unique within its table; case-sensitive; dotted names allowed (section 5.9) |
| `domain` | `"node" \| "edge" \| "graph" \| "extension"` |
| `dtype` | section 5.1 |
| `components` | `>= 1`; only `> 1` for `f32 f64 i32 u32 u8` |
| `itemDtype` | `list` only: the child dtype |
| `itemComponents` | `list` only: the child's `components` (spells: `2`) |
| `nullable` | whether a validity bitmap may exist |
| `mutable` | contents may be written in place on a snapshot (section 5.8) |
| `role` | section 5.6 |
| `refersTo` | `"node" \| "edge" \| null`: a `u32` column (or a `list` whose child is `u32`) holding indices, rewritten by every remap and every derived graph (section 5.11) |
| `unique` | enforced at freeze over set rows (`E_DUPLICATE_EDGE_ID` / `E_DUPLICATE_ID`) |
| `default` | declared default (GEXF/GraphML), returned by `value()` for unset rows |
| `fill` | value physically stored in unset rows (default: the declared `default` when representable in the dtype, else `0` / `""` / `false`; section 5.3) |
| `options` | declared enum (GEXF `<options>`); for `dict` the dictionary itself |
| `origin` | `{ format, id, title, type, namespace }`: GEXF attribute id, GraphML key id, declared type text (`"long"`, `"anyURI"`, `"liststring"`, `"date"`), namespace (`"viz"`, `"yfiles"`, `"neo4j"`) |
| `dynamic` | GEXF dynamic attribute: values live in the temporal extension table (section 5.10) |
| `extra` | anything an importer wants to survive (JSON-serialisable) |

Roles are format-neutral tags so consumers find "the position column"
without per-format knowledge and exporters map roles back to reserved
fields. At most one column per role per table; `set()` with a role already
taken throws `E_DUPLICATE_ROLE` unless `{ replaceRole: true }`, in which
case the previous holder is REMOVED from the table (its data is untouched;
a caller that still needs it keeps its own reference -- graphty-element
replaces the importer-seed position column this way after every freeze,
section 14.4). Known roles
(the `ColumnRole` union in section 12.2 is these literals plus an open
`string` extension): `id`, `label`, `weight` (f64 shadow, section 3.7),
`capacity`, `position` (f32 x3), `color` (f32 x4 rgba 0..1 or u8 x4),
`size`, `shape`, `thickness`, `parent` (u32, refersTo node), `parents`
(list of u32, refersTo node), `kind`, `labels`, `classes`, `start`, `end`,
`timestamp`, `timestamps`, `spells`, `open`, `timeText`, `key`,
`directed`, `pair` (u32, refersTo edge), `mutual`, `originalId`,
`sourcePort`, `targetPort`, `idSpace`, `fixed`, `mass`, `subset`,
`hidden`, `component`, `community`, `rank`.

### 5.6 Roles versus names, and namespacing

Column names are flat strings; the core imposes no structure. Monorepo
convention: importer columns keep the source attribute name; producer-owned
result columns use dotted names `"<producer>.<kind>.<name>"`
(graphty-element writes `"graphty.pagerank.rank"`, which is exactly its
existing `algorithmResults.graphty.pagerank.rank` JMESPath nesting
flattened); columns the FORMAT or an importer writes on its own behalf
use the `graphty.` prefix (`graphty.directed`, `graphty.pair`,
`graphty.mutual`, `graphty.originalId`, `graphty.edgeId`). Roles, not
names, identify reserved meanings: a user attribute named `weight` with
no role is just data; the edge weight is the arc array plus the column
whose ROLE is `weight`. graphty-element resolves `edgeWeightPath` (or the
per-algorithm `weight` option) once at the boundary and passes
`addEdge(source, target, weight)` (Q14).

Source attribute naming (io rule, so two importers agree): a column's
`name` is the GEXF `title` / GraphML `attr.name`, falling back to the
attribute `id` / key `id` when the title is absent (yFiles keys omit
`attr.name`); `origin.id` always keeps the source id so the exporter can
restore the declaration. XML-attribute-derived columns have fixed names
and roles: the GEXF / GraphML node `label` is the column named `label`
with role `label`, an edge id is `id` with role `id`. When a declared
attribute would collide with an existing name in the same table (two
attributes titled `label`, an attribute titled `directed`, a declared
attribute titled `label` next to the XML `label`), the importer names it
`<name>#<origin.id>` deterministically (`label#3`) and records a
`coercion` issue; on export the declaration is restored from `origin`.

### 5.7 Column API and length rules

`AttributeTable` (complete class in section 12.2) offers `names()`,
`has()`, `get()` (total; `null` when absent), `require()` (throws
`E_UNKNOWN_COLUMN`), `typed(name, dtype)` (`null` if absent or the dtype
differs), `requireTyped()` (throws `E_COLUMN_TYPE`), `byRole()` (`null`
when no column has the role), `value(name, row)` (typed read honouring
`default`), `isSet()`, `set()`, `remove()`, `rename()`, `gpuView()`
(section 10.4, cached), `clone()` and iteration over columns in
declaration order. "Absent" is always `null` on this surface (section
12.1); `undefined` only ever means "unset row" from `value()`.

`set()` adopts a typed array BY REFERENCE (no copy) after validating
`data.length === rowCount * components` (`E_COLUMN_LENGTH`). For the
4-byte dtypes (`u32`, `i32`, `f32`, `bool` words) and for `f64` the
typed-array constructor already guarantees I10 (`byteOffset` and
`byteLength` are multiples of the element size), so adoption is
UNCONDITIONAL and never copies: a GPU readback `new Uint32Array(mapped.
slice(0))` of any length attaches as it is. For `u8` the adoption
predicate is exactly "a zero-copy padded `Uint32Array` view is
constructible": `data.byteOffset % 4 === 0 && data.byteOffset +
roundUp(data.byteLength, 4) <= data.buffer.byteLength`; when it fails the
array is copied into a store that satisfies it, the copy is observable
because the returned `column.data !== input`, and `opts.adopt: "strict"`
throws `E_COLUMN_ALIGNMENT` instead of copying. `set()` on a name that
already exists REPLACES the column (the role check still applies, so
replacing a column with one of a different role that is already taken
throws `E_DUPLICATE_ROLE` unless `replaceRole`). A `Column` object can be
moved from one snapshot's table to another with `set(name, column)` when
the row counts match (used by derived graphs that keep the node set).

Length rules (I12): scalar `data.length === components * rowCount`; `bool`
`data.length === ceil(rowCount / 32)`; `dict` `codes.length === rowCount`
and `codes[r] < dictionary.length` for every set row; `string`
`offsets.length === rowCount + 1`, non-decreasing, `offsets[rowCount] ===
utf8.length`; `list` `offsets.length === rowCount + 1`, non-decreasing,
`offsets[rowCount] === child.length`, child non-nullable; `json`
`values.length === rowCount`; `validity` `null` or `length ===
ceil(rowCount / 32)`; `column.paddedByteLength` is `byteLength` for every
dtype except `u8`, where it is `roundUp(byteLength, 4)` (the size of the
`paddedU32View()`, taken over the COLUMN's byte range, not the whole
backing buffer, since adopted arrays may be subarrays of larger buffers).
Padding to 16 bytes is never required: `writeBuffer`, `copyBufferToBuffer`
and storage bindings need multiples of 4 only.

`slice(start, end)` is zero-copy for the 4-byte dtypes, `f64`, `string`,
`list` and `json` (same buffers, offsets adjusted) and for `u8` when
`start % 4 === 0`. For `bool` data and for any validity bitmap the row
range must start at a word boundary to alias; `slice` therefore copies
the bitmap words (and a `u8` store when `start % 4 !== 0`) into a fresh
aligned store, so a sliced column always satisfies I10 and keeps its
`gpu` eligibility. The trailing lanes of the last `u8` word and the
trailing bits of the last `bool` word are undefined; kernels bound-check
`i < rows`.

### 5.8 Mutability rules: the boundary of "frozen" (G14)

| Thing | Frozen? | Rule |
| --- | --- | --- |
| Core arrays, counts, flags, id map | yes | I17; never written after freeze |
| View caches | populate-once, shared | pure functions of the core; cannot go stale; every call returns the SAME cached array, so a caller that wants scratch calls `.slice()` (k-core peeling, degree decrements, Kruskal candidate lists); `dropCaches()` frees them |
| Column SET of `nodes` / `edges` / `graph` | no (side table) | `set` / `remove` / `rename` allowed at any time by the snapshot owner; `rowCount` fixed; no view depends on columns |
| Column CONTENTS | frozen unless `meta.mutable === true` | producers declare `mutable` when they will write in place (positions written per frame by a layout engine, selection flags). `mutableData()` returns the typed array and throws `E_COLUMN_IMMUTABLE` otherwise. After in-place writes the owner calls `column.markDirty()`, which invalidates the cached `gpuView()` f32 copy and `materializeDefault()` copy (the only things the format derives from column contents) and bumps `column.version`. A mutable column's CONTENTS never survive a freeze unless the owner re-attaches them (section 5.11): the next snapshot's copy comes from builder staging |
| Weights for flow residuals | frozen | the algorithm copies `weights` into its own scratch |

Immutability of typed-array contents cannot be enforced by the engine
(typed arrays cannot be frozen), so it is by contract, made testable:
when `freeze()` is called with `checksum: true` (a `FreezeOptions` field;
tests and debug builds) the package records an FNV-1a checksum of every
core array and of every immutable column, and of every cached view at the
moment it is first materialised; `validate({ checksum: true })` recomputes
and compares (O(bytes)), and throws `E_INVALID_SNAPSHOT` with
`details.reason: "no-checksum"` on a snapshot frozen without the option.
The algorithms package runs every `indexed.*` differential test with
checksummed snapshots and asserts them after each call, which is how
"writing into a view" is caught (section 14.2). `Object.freeze` is
applied to the snapshot object so `snapshot.rowPtr = x` throws in strict
mode; the lazily populated members (`arcToEdge` / `edgeToArc` when
identity, view caches, decoded strings) live in ES private fields, which
`Object.freeze` does not affect, and the public accessors are prototype
getters. A snapshot therefore has a stable identity for its topology
(`serial`, the identity of the CORE: `withColumns()` snapshots and
derived graphs that return `this` share it, and a GPU package keys its
uploaded buffers on the typed-array OBJECT, `WeakMap<Uint32Array, ...>`
keyed by `rowPtr`, which dedupes across `withColumns()`, across
`reverse()` of an undirected snapshot (aliased arrays) and across
consumers) while carrying a living set of index-aligned columns. Results
are attached to the snapshot they were computed against; when a new
snapshot is frozen, columns do not carry over automatically (section 5.11
gives the remap helpers).

### 5.9 Graph-level attributes and metadata

`snapshot.graph` is an `AttributeTable` with `rowCount === 1` and the same
column model, so GraphML `for="graph"` keys keep their declared types,
NetworkX `graph` dicts and Cytoscape top-level `data` round-trip as `json`
columns, and graphty-element's `graphResults` become graph columns.

```typescript
export interface GraphMeta {
    readonly name: string | null;
    readonly description: string | null;
    readonly creator: string | null;
    readonly created: string | null;           // ISO-8601
    readonly modified: string | null;
    readonly keywords: readonly string[];
    readonly sourceFormat: string | null;      // "gexf"
    readonly sourceVersion: string | null;     // "1.3"
    readonly idType: "string" | "integer" | "mixed" | null;   // GEXF idtype, for exporters
    readonly timeFormat: "integer" | "double" | "date" | "dateTime" | null;
    readonly timeRepresentation: "interval" | "timestamp" | null;   // GEXF 1.3 timerepresentation
    readonly mode: "static" | "dynamic" | "slice" | null;           // GEXF graph mode
    readonly declaredMultigraph: boolean | null;   // node-link / graphology "multigraph" flag as declared, independent of flags.multigraph
    readonly weightOrigin: ColumnOrigin | null;   // declared source type of the weight (section 3.7)
    readonly extra: Readonly<Record<string, unknown>>;   // JSON-serialisable; reserved per-format keys in section 8.5
}
```

`extra` (and `ColumnMeta.extra`, `default`, `options`) must be JSON
values; the builder rejects anything else at `setMeta` / `declare*` /
`set()` time (`E_COLUMN_TYPE` with `details.field`). Non-finite numbers
and `-0` are legal values that JSON cannot carry (`JSON.stringify(
Infinity)` is `null`); the wire form encodes them as tagged strings
`{ "$num": "Infinity" | "-Infinity" | "NaN" | "-0" }` and decodes them
back, so a `default: Infinity` on an `end` column and a `fill: NaN`
survive `toBytes()` / `fromBytes()` unchanged (section 16.3 tests both).

### 5.10 Extension tables (GEXF dynamic attribute values)

Dynamic GEXF attribute values (a time series per element) do not fit
fixed-width columns. They are carried losslessly, not interpreted:
`snapshot.extensions` is a `ReadonlyMap<string, AttributeTable>` of tables
with domain `"extension"` and their own row counts. For each dynamic
attribute the importer creates one table named
`"temporal:<node|edge>:<attribute name>"` with four columns: `element`
(`u32`, `refersTo` the domain, so compaction and derived graphs rewrite
it), `start` (`f64`), `end` (`f64`), `value` (the attribute's declared
dtype), plus the optional `start.text` / `end.text` companions of section
5.1 and an optional `open` column. A `dict`-typed `value` column shares
the static column's dictionary object by reference so codes agree. The
static column of the same name carries `meta.dynamic: true` and holds the
value with no time bound (or is unset). A dynamic edge attribute titled
`weight` (which the GEXF primer says overrides the static weight) imports
as a temporal table like any other; the arc `weights` take the untimed
value when one exists and `1` otherwise, and the exporter re-emits the
table. The core promises to
preserve, remap, serialise and validate extension tables (I12 applies);
`@graphty/graph-io` reads and writes them. Containment (GEXF `pid`,
Cytoscape `parent`, DOT clusters, GraphML nested graphs) is a `parent` node
column and never enters the CSR; a children CSR over that column is a
`graph-io` helper (section 7.1).

### 5.11 Propagation through derived graphs and re-freezes

| Operation | Node columns | Edge columns | Index-valued columns (`refersTo`) |
| --- | --- | --- | --- |
| `freeze()` from builder | compacted through `nodeRemap` when tombstones existed (identity otherwise: one `slice` of the staging buffer) | gathered through `edgeRemap` when compaction or merging happened; identity otherwise | values rewritten through the matching remap; dangling references become `INVALID_INDEX` + unset |
| `reverse()` view | n/a (same snapshot) | reached through `reverse().arcToEdge` | n/a |
| `toUndirected()` | the SAME `AttributeTable` instance (same node set, same id map) | gathered through `edgeOrigin`; reciprocal pairs keep the lower logical index's row (keep-first, Q36) | rewritten |
| `transpose()` | same instance | same instance (same logical edges, orientation swapped) | unchanged |
| `simplified()` | same instance | survivor rows gathered; merged rows reduced per `edgeReducers` (default: survivor's value; weights per `weights`) | rewritten |
| `withoutSelfLoops()`, `filterEdges()` | same instance | gathered | rewritten |
| `inducedSubgraph()` | gathered through `nodeOrigin` | gathered through `edgeOrigin` | rewritten |
| `contract(partition)` | NOT propagated automatically; `nodeReducers: Record<name, ColumnReducer>` names the columns to keep | weights reduced per `weights`; other edge columns dropped unless `edgeReducers` given | dropped |
| `relabel(perm)` | gathered | gathered (edge order preserved) | rewritten |
| `withColumns()` | a CLONED column set (new table object) sharing the same `Column` objects plus the given ones | same | unchanged |
| new snapshot after builder mutation | not carried; the owner re-attaches: `remapArray(data, nodeRemap, newLength, fill, components)` when `nodeRemap !== null`, plain copy-extend otherwise | not carried; `remapArray(data, edgeRemap, ...)` | `remapColumn(column, remap, newLength)` rewrites values when `refersTo` is set |

"Same instance" means the derived snapshot's `nodes` (and, where noted,
`edges`) IS the source's `AttributeTable` object: a `set()` / `remove()`
on either is visible on both, and so is a write through a shared mutable
column. This is intentional for positions and results (graphty-element
attaches positions to the directed snapshot after it has cached the
undirected copy, and the GPU layout reads them through the copy); a
consumer that needs isolation calls `snapshot.withColumns()` (the only
operation that clones the column SET) or `table.clone()`. Property test
P9 checks table identity for every same-node-space derived graph.

Helpers (exported functions, section 12.2), one name per shape: for
`Column` objects `remapColumn(column, remap, newLength)` (old -> new,
drops rows mapped to `INVALID_INDEX`, rewrites `refersTo` values) and
`gatherColumn(column, indexMap)` (`out[i] = column[indexMap[i]]`); for
raw typed arrays `remapArray(data, remap, newLength, fill, components)`,
`gatherArray(data, indexMap, components)` and `scatterArray(out, values,
indexMap, components)` (`out[indexMap[i]] = values[i]`: writes results or
positions computed on a derived graph back into the parent's index space
through `nodeOrigin` / `edgeOrigin`); plus `withComponents`,
`paddedU32View`, `foldArcs`, `expandEdges`, `renumberPartition`.

---

## 6. Builder

### 6.1 Lifecycle (C7, Q12, Q46)

`GraphBuilder` is the only mutable object in the package and it is
LONG-LIVED: graphty-element's `DataManager` owns one for the life of a
graph, calls `freeze()` whenever a consumer needs a snapshot and the
topology is dirty, and keeps mutating it afterwards. `freeze()` does not
reset the builder and never shares core arrays or columns with the
snapshot it returns (I18; the id `Map` and `ids` array ARE shared by
design, section 4.2). Importers create one, freeze once and drop it; algorithms that need
temporary graphs (flow residuals, Leiden aggregation) create one, freeze
once and drop it. Callers that build once call `freeze({ release: true })`,
which returns the snapshot and empties the staging arrays (Arrow `flush()`
semantics) so peak memory drops immediately; `dispose()` releases
everything and makes every further call throw `E_BUILDER_DISPOSED`.

Indices: `addNode` assigns the next node index; `addEdge` assigns the next
logical edge index. Indices are never reused while the builder lives,
except through a compacting freeze, after which builder indices equal the
new snapshot's indices (section 4.4).

Incremental freeze is NOT in v1. Re-freeze after a mutation is a full O(n +
m) pass; section 15.4 budgets it at 25-30 ms for 1M directed arcs and
45-55 ms for 1M undirected edges, inside graphty-element's "mark dirty,
freeze on next consumer" model. An append-only fast path is deferred until
the benchmark suite shows interactive expand dropping frames (open
question 8).

### 6.2 Staging layout and internal representation

All staging is structure-of-arrays typed arrays that grow by doubling
(capacity rounded up to 16 elements, backing buffers a multiple of 64
bytes), using resizable `ArrayBuffer` (`new ArrayBuffer(n, { maxByteLength
})`, feature-detected once; Node 20+, Chrome 111+, Safari 16.4+, Firefox
128+) to grow without copying, and allocate-and-copy doubling otherwise.
The base `lib: ["ES2020"]` lacks the types, so the package ships a local
declaration for the two members it uses.

```
nodes:    ids: (string | number)[]; idToIndex: Map<NodeId, number>; nodeAlive: Uint32Array (bitmap)
          firstOut: Uint32Array(nodeBound); firstIn: Uint32Array(nodeBound)     // incidence lists, INVALID_INDEX = end
edges:    src: Uint32Array; dst: Uint32Array; weight: Float32Array | Float64Array | null; edgeAlive: Uint32Array (bitmap)
          weightSet: Uint32Array | null (bitmap; explicit-weight tracking, section 3.7)
          nextOut: Uint32Array(edgeBound); nextIn: Uint32Array(edgeBound)
counts:   liveNodeCount, liveEdgeCount, selfLoopCount, nodeBound, edgeBound, mutationCount
columns:  one growable column per declaration (data + validity + dictionary Map + offsets), node and edge domains
graph:    graph AttributeTable (1 row), GraphMeta, extension tables
bookkeeping: previous snapshot's nodeBound / edgeBound for freezeWithReport remaps
```

The two incidence lists cost 8 bytes per edge and 8 bytes per node and
make `removeNode` O(degree) with exact live counts and an exact list of
removed incident edges (both directions), which graphty-element needs to
dispose its edge render objects. No per-node or per-edge object is ever
allocated.

### 6.3 freeze() pipeline (exact)

Let `S` be the number of live staging edges, `n` the number of live nodes,
`A` the arc count (`S` directed; `2S - loops` undirected). Every step is a
typed-array pass; there is no comparator sort anywhere.

1. Compact (only if tombstones exist or the previous freeze's merge left
   work): build `nodeRemap` over `0..nodeBound` skipping dead nodes and
   `edgeRemap` over `0..edgeBound` skipping dead edges (assigned in index
   order, I14); rewrite `src` / `dst` / `weight` / incidence lists / every
   staging column in place; rebuild `ids` and `idToIndex` (fresh objects,
   so the previous snapshot keeps the old ones, section 4.2). After this
   step `nodeBound === n`, `edgeBound === S`.
2. Self-loop policy: `"drop"` tombstones loops (extends `edgeRemap` and
   re-runs step 1's edge compaction); `"error"` throws `E_SELF_LOOP` naming
   the first loop.
3. Arc materialisation. Directed: the edge arrays ARE the arc arrays (no
   copy). Undirected: transient `arcSrc`, `arcDst`, `arcEdge`
   (`3 x Uint32Array(A)`): for each edge `e` emit `(src, dst, e)` and, if
   `src !== dst`, `(dst, src, e)`.
4. Identity check (directed only): one pass tests whether `(src[e], dst[e])`
   is non-decreasing lexicographically; if so `flags.arcToEdgeIsIdentity =
   true` and steps 5-6 skip writing the permutation arrays (they are
   getters).
5. Pass 1 -- stable counting sort by target: count `cnt[v]` over arc
   targets, exclusive prefix sum, scatter arc ids into `byTarget:
   Uint32Array(A)`.
6. Pass 2 -- stable counting sort by source over the pass-1 order: count
   `cnt[u]` over arc sources, exclusive prefix sum INTO `rowPtr`, then walk
   `byTarget` in order and scatter, writing `colIdx[a] = target`,
   `arcToEdge[a] = e`, `weights[a] = f32(weight[e])`, and `edgeToArc[e] = a`
   for the arc whose stored orientation equals the declared one (for a
   self-loop the single arc). Because pass 2 is stable and consumes arcs in
   pass-1 order, each row ends sorted by target; ties (parallel arcs) are
   in ascending edge order because pass 1 consumed arcs in edge order (I4).
   When the duplicate policy is `"keep"` (the default) these writes target
   the arena views directly (the sizes `A` and `E` are known after step
   3); otherwise they target transients.
7. Duplicate policy (only when not `"keep"`): one linear walk over rows;
   adjacent arcs with equal `colIdx` are a group. `"error"` throws
   `E_DUPLICATE_EDGE` with `{ source, target, edges }`. Merge modes apply
   the weight reducer, mark every non-survivor dead in the BUILDER
   (tombstone) and store the reduced weight on the survivor, then re-run
   steps 1-6 on the reduced edge set into the final arena (one repeat; the
   builder is thereby rewritten to the merged edge set so re-freezing is
   idempotent and builder indices still equal snapshot indices). For
   undirected graphs `(u, v)` and `(v, u)` are one group and the mates are
   adjacent in the other row in the same relative order (section 6.4).
8. Weights and flags: `NaN` re-check for bulk input (`E_INVALID_WEIGHT`),
   `allWeightsOne` / `nonNegativeWeights` / `finiteWeights` in one pass;
   `multigraph` and `hasSelfLoops` from the step-6/7 walk. If
   `weightDtype` is `"f64"`, a second pass tests f32-exactness and keeps
   the `f64` shadow column only when needed (section 3.7).
9. Id map: detect `identity` (numbers, `ids[i] === i + offset`), `dense`,
   `numeric`, `string`, `mixed` (section 4.2); share or drop the `Map`.
10. Columns: node columns sliced to `n` rows (identity) or gathered through
    `nodeRemap`; edge columns gathered through `edgeRemap` (identity
    otherwise); `refersTo` columns rewritten; dictionaries finished;
    validity bitmaps built from the builder's set-tracking; `unique`
    columns verified (`E_DUPLICATE_EDGE_ID`); extension tables remapped.
11. Arena (default): one `ArrayBuffer` of the total padded size (section
    10.3) allocated before step 5; with `arena: false` the arrays from
    steps 5-6 are separate fresh allocations (I10 still holds). Requested
    `prepare` views are computed now while transients are hot.
12. Construct the snapshot (`Object.freeze`), record checksums when
    `checksum: true` was passed, free transients, and if `release`, free
    staging too; mark the builder clean. `freeze()` never bumps
    `mutationCount`, even when step 7 rewrote the builder to the merged
    edge set: the builder and the snapshot agree afterwards, which is what
    a consumer keyed on `mutationCount` wants.

### 6.4 Undirected pairing correctness

For an undirected edge `e = (u, v)`, `u !== v`, step 3 emits `(u, v, e)` and
`(v, u, e)`. Both counting sorts are stable, so within row `u` the arcs
targeting `v` appear in increasing edge order, and within row `v` the arcs
targeting `u` appear in the same increasing edge order. The k-th arc of
`arcsBetween(u, v)` and the k-th arc of `arcsBetween(v, u)` therefore
carry the same `e`, which is why `arcToEdge` pairs them without any
search, why `mate()` (section 7.2) is a lockstep walk over both ranges,
and why merge policies can tombstone mates by position. Property test P4
(section 16.1) checks this for random multigraphs.

### 6.5 Duplicate policy semantics

`duplicateEdges: "keep" | "error" | "first" | "last" | "sum" | "min" |
"max"`, default `"keep"`, applied at freeze (never at `addEdge`, so the
builder needs no `(u, v)` hash):

| Policy | Structure | Weight | Other edge columns | `edgeCount` |
| --- | --- | --- | --- | --- |
| `keep` | all arcs kept, adjacent, ordered by edge index | each kept | each kept | unchanged |
| `error` | throws `E_DUPLICATE_EDGE` naming the pair and both edge indices | -- | -- | -- |
| `first` | one arc per `(u, v)` (plus its mate if undirected) | weight of the lowest edge index | row of the lowest edge index | reduced |
| `last` | same | weight of the highest edge index | row of the highest edge index | reduced |
| `sum` / `min` / `max` | same | reducer over the group | row of the lowest edge index | reduced |

`edgeRemap` in the `FreezeReport` maps every pre-freeze edge index to its
survivor, so importers can report which file lines were merged. A merge
policy MUTATES THE BUILDER (step 7 tombstones the non-survivors and
stores the reduced weight on the survivor), so a caller that passes
`freeze({ duplicateEdges: "sum" })` once has permanently merged the
builder's parallel edges; a one-off deduplicated snapshot is
`simplified()` on the frozen result instead. Callers that need
attribute-aware merging keep `"keep"` and call `simplified()` with
per-column reducers (section 7.3).

### 6.6 API

The complete class is in section 12.2. Semantics that the signatures do
not convey:

- `addNode(id)` on an existing live node returns its index without change.
  Re-adding an id that was removed before the next freeze revives the same
  index (the tombstone is cleared; NetworKit `restoreNode` semantics), so
  index-aligned consumer buffers stay valid; revival never revives the
  edges `removeNode` tombstoned (they compact at the next freeze, so
  `edgeRemap !== null` while `nodeRemap === null`, I16). After a
  compacting freeze the id is gone and a re-add assigns a new index.
- `addNodeRecord(id, attrs)` on an existing live id is last-write-wins per
  attribute: every key present in `attrs` overwrites that row and sets its
  validity bit; keys absent from `attrs` are untouched. `addEdgeRecord`
  always creates a new edge (parallels are kept, C2). The same rule
  applies to `addGraph(snapshot, { onDuplicateNode: "merge" })`: for nodes
  the incoming snapshot defines, its set rows overwrite (including the
  `position` column, so a second file's coordinates win only for the
  nodes it positions); a column declared in both graphs with different
  dtypes widens per the section 5.1 order for the union (never throws);
  incoming edges are appended. `onDuplicateNode: "error"` throws
  `E_DUPLICATE_ID` naming the id.
- `setDirected(directed, options?)`: a call that does not change the
  value is a no-op. While `edgeCount === 0` it simply changes the
  builder's direction (no cost; nodes and columns are kept). With edges
  present, `setDirected(true, { expand: true })` converts an undirected
  builder into a directed one by appending a mirror edge `v -> u` for
  every existing edge `u -> v` (mirrors take indices `E..2E-1`, so
  existing indices are untouched and I16 holds), writing the
  `graphty.directed` / `graphty.pair` columns of section 3.6 and leaving
  every other column's mirror rows unset; `setDirected(true)` without
  `expand` on a non-empty undirected builder, `setDirected(false)` with
  edges present, or any changing `setDirected` after `lockDirected()`,
  throws `E_DIRECTED`. `lockDirected()` is for owners that fix the direction by
  configuration (graphty-element under an explicit `directed` setting,
  section 14.4); `directedLocked` reports it. Importers use `setDirected`
  to make the builder's direction follow the file (section 8.4).
- `addNodes(ids, out?)` writes the index of every id (new or existing) into
  `out` (allocated when omitted) and returns it; it never promises
  contiguity because `addNode` is idempotent.
- `addAnonymousNodes(count)` appends `count` nodes whose ids are their own
  indices (numbers) and returns the first index; together with
  `addEdges(src, dst, weights?)` it is the index-space path used by
  algorithms that build temporary graphs (residual networks, quotients)
  and by generators; it never touches the id `Map` when every node so far
  is anonymous (the map is created lazily on the first non-anonymous
  `addNode`).
- `addEdge(u, v)` with `addMissingNodes: true` (default, Q15) calls
  `addNode` for unknown endpoints; this replaces graphty-element's
  `bufferedEdges` retry loop and lets CSV edge lists and GraphML
  `parse.order="free"` load in one pass. `addMissingNodes: false` throws
  `E_UNKNOWN_NODE`.
- `addEdge(u, u)` stores one edge and counts a self-loop (or drops / throws
  at freeze per `selfLoops`).
- `removeNode(id)` tombstones the node and every live incident edge (both
  lists) and returns the removed edge indices as a `Uint32Array`;
  `removeEdge(e)` is O(1). Both bump `mutationCount`; column writes do not.
- `outEdgesOf(index)`, `inEdgesOf(index)` and `findEdges(u, v)` walk the
  builder's incidence lists (O(degree), fresh `Uint32Array` of live edge
  indices) so an owner can answer "which edges touch this node" and "is
  there an edge u -> v" for edges added SINCE the last freeze without
  freezing; graphty-element uses them while `dirty` is true and the
  snapshot otherwise (section 14.4). `edgeEndpoints(e)` and
  `edgeWeight(e)` read a live edge back (importers use them to expand
  edges they already pushed, section 8.4).
- `freezeWithReport()` remaps are relative to the previous freeze of the
  same builder, or to the builder's own index space on the first freeze
  (I16); they are `null` exactly when nothing was renumbered, so a consumer
  tests `remap === null` for "my index-aligned arrays are still valid,
  just extend them". The node and edge remaps are independent.
- `GraphBuilder.from(snapshot)` seeds staging from a snapshot in O(n + m)
  (ids, edges in logical order with declared orientation, weights,
  columns, meta); indices are preserved. `addGraph(snapshot, { onDuplicateNode })`
  appends another snapshot (disjoint union, or merge by id) re-interning
  dictionaries (G16 composition).
- `freeze()` is deterministic (I15).

### 6.7 Freeze options and their costs

| Option | Effect | Cost (100k nodes / 1M edges; targets, section 15.4) |
| --- | --- | --- |
| (base, directed) | steps 1-12 | 25-30 ms |
| (base, undirected) | plus arc materialisation and 2M-arc passes | 45-55 ms |
| `duplicateEdges !== "keep"` | step 7 walk (+ one repeat when anything merged) | +3 ms (+ base when merged) |
| `weightDtype: "f64"` | exactness pass, possible shadow column | +2 ms (+8 MB when the shadow is kept) |
| `prepare: ["reverse"]` (directed) | counting-sort transpose | +15-25 ms |
| `prepare: ["outDegree", "inDegree", "coo"]` | trivial passes | +1-3 ms each |
| `prepare: ["symmetric"]` (directed) | reverse plus one merge pass | +20-30 ms |
| `checksum: true` | FNV-1a over core arrays and immutable columns | +5-10 ms (tests and debug builds) |
| string ids, long-lived builder | Map shared by reference | 0 at freeze (C17) |
| compaction after removals | one gather pass over staging and columns | +32 ms measured (the estimate was +10-15; see 15.6) |
| K typed edge columns | gather per column (identity: one `slice`) | +2-4 ms each |
| `arena: false` | per-array allocation | 0 (needed only above the per-allocation ceiling, section 15.3) |

Peak memory during freeze (section 15.2 has the full table): staging +
transients + arena + column copies. Directed 1M weighted: ~21 MB staging +
4.4 MB transients + 16.4 MB arena = ~42 MB plus the id map. Undirected 1M
weighted: ~21 MB + 32.4 MB + 28.4 MB = ~82 MB plus the id map.

---

## 7. Derived views and derived graphs

### 7.1 Criterion: what belongs in a "no algorithms" package (G15)

A method belongs in `@graphty/graph-format` if and only if ALL of these
hold:

1. It is a re-indexing, re-orientation, filtering or aggregation of the
   same incidence data (rows, arcs, logical edges) or a count over it,
   parameterised by nothing but a policy enum or an index array / mask /
   partition supplied by the caller.
2. It runs in O(n + m + k) time with a constant number of passes (k = size
   of the caller's array), never iterates to a fixed point, never sorts by
   a comparator (counting sort by an index or a degree is allowed), uses
   no randomness and no floating-point tolerance.
3. It has exactly one correct output for a given input (so a differential
   test can compare against a naive implementation), and computes no graph
   property that is not already implied by the arrays: no distances, no
   components, no centralities, no planarity.
4. At least two consumer packages need it, or a file format needs it for
   round trip.

Under this rule, VIEWS (lazy, cached, same index space): `reverse`, `coo`,
`edgeList`, `outDegree`, `inDegree`, `degree`, `weightedOutDegree`,
`weightedInDegree`, `weightedDegree`, `selfLoopWeight`, `totalWeight`,
`selfLoopArcs`, `selfLoopsPerNode`, `mate`, `degreeOrder`, `isSymmetric`. DERIVED GRAPHS (new snapshot with
maps back): `toUndirected`, `transpose`, `simplified`, `withoutSelfLoops`,
`filterEdges`, `inducedSubgraph`, `contract`, `relabel`, `withColumns`.
`degreeOrder()` is the borderline case and passes: a counting sort by a
local count, one correct output, needed by GPU load balancing and layout
mass. NOT in the package: BFS/DFS, shortest paths, APSP for Kamada-Kawai
(Q10: `@graphty/algorithms` on the CPU, the WebGPU package on the GPU,
layout consumes a `Float32Array(n * n)`), components, transitive closure,
k-core, triangle counting, centrality, communities, matchings, MST, flow,
planarity, layouts, spectral anything, generators (Q9: they stay in
`@graphty/layout` and return snapshots wrapped for compatibility, section
14.3), sampling, random walks, the `children` CSR over a `parent` column
(a `graph-io` helper used only by importers and exporters), and scratch
structures (bitsets, frontier queues, indexed heaps, union-find; they
belong with the algorithms).

### 7.2 Views (lazy, cached on the snapshot, same index space)

All views are pure functions of the core arrays, computed on first call
and cached for the life of the snapshot (I17). Every view is SHARED: a
call returns the cached array itself, never a copy, so writing into a
view is a contract violation that corrupts every later reader of the same
snapshot; callers that need a mutable working copy call `.slice()` on the
returned array (the JSDoc of every view method says so). Every
view except the four `f64` views and the scalar `totalWeight()` is made
of 4-byte typed arrays over an `ArrayBuffer` and uploads as memcpy (I10);
`weightedOutDegree()`, `weightedInDegree()`, `weightedDegree()` and
`selfLoopWeight()` are `F64` because the CPU consumers that need them
(modularity, PageRank normalisation, weighted closeness) are f64-sensitive
(C11), and the GPU package recomputes the per-node weight sum on the
device instead (section 10.1). `prepare(names)` computes a set eagerly
(inside `freeze()` or off the critical path in a worker); `dropCaches()`
releases every cached view and every cached `gpuView` copy;
`cachedViews()` lists what is resident; `byteLength({ views: true })`
includes them. Caches are per instance and per realm.

`AdjacencyView` (section 12.2) is the structural interface `{ directed,
nodeCount, arcCount, rowPtr, colIdx, arcToEdge, weights }` implemented by
`GraphSnapshot` and by `ReverseView`, so an algorithm that only walks rows
takes either without a wrapper (an in-neighbour BFS is the out-neighbour
BFS over `reverse()`). GPU entry points take `GraphSnapshot` only (they
need `flags` and `arena`) and call `reverse()` themselves. `ReverseView`
adds `fwdArc` (reverse arc k -> forward arc index; identity, lazily
materialised, for undirected graphs) and its `arcToEdge` is the gather
`arcToEdge[fwdArc[k]]`, lazily materialised, EXCEPT that when `fwdArc` is
the identity (every undirected snapshot) `reverse().arcToEdge ===
snapshot.arcToEdge` (aliased, zero bytes). `CooView` is `{ src, dst,
arcToEdge, weights }` with everything but `src` aliased; `EdgeListView` is
`{ src, dst, arc, weights }` per logical edge in declared orientation with
`arc` aliasing `edgeToArc`; `DegreeOrderView` is `{ perm, segmentOffsets }`
with `segmentOffsets = [0, hiEnd, midEnd, lowEnd, n]` for the cuGraph
thresholds 1024 / 32 / 1. `degreeOrder({ of })` orders by the OUT-degree
of the named view: `"forward"` (default) uses `rowPtr`, `"reverse"` uses
`reverse().rowPtr`, i.e. the in-degree, which is what a pull kernel
(PageRank, HITS, bottom-up BFS) needs; both are cached, and on an
undirected snapshot they are the same object.

| Method | Returns | Cost | Notes |
| --- | --- | --- | --- |
| `reverse()` | `ReverseView` | O(n + m) counting sort over `coo()` | in-adjacency with rows sorted by source; `weights` materialised by gather when weighted (Q37, pull kernels read `weights[a]` without a gather); undirected: returns the forward arrays themselves with `fwdArc` = identity (I7, Q34) |
| `coo()` | `CooView` | O(m) | `src` is the only new array |
| `edgeList()` | `EdgeListView` | O(m) | each logical edge once, declared orientation; `weights` gathered through `edgeToArc` unless identity |
| `outDegree()` | `Uint32Array(n)` | O(n) | `rowPtr` differences materialised (kernels may read `rowPtr` directly) |
| `inDegree()` | `Uint32Array(n)` | O(m) | via `reverse().rowPtr`; undirected: the same object as `outDegree()` |
| `degree()` | `Uint32Array(n)` | O(n + m) | graph-theoretic (section 3.4) |
| `weightedOutDegree()` / `weightedInDegree()` | `F64(n)` | O(m) | row sums of `weights` (a self-loop arc counted once); `outDegree` widened when unweighted; NOT 4-byte (see above); a node with out-arcs can have sum `0` because zero weights are legal (3.7), so a PageRank normaliser must guard the division |
| `weightedDegree()` | `F64(n)` | O(m) | NetworkX weighted degree: `weightedOutDegree[u] + (directed ? weightedInDegree[u] : selfLoopWeight[u])`, so an undirected self-loop counts twice and `sum(weightedDegree) === 2 * totalWeight()` on an undirected snapshot (the modularity identity Leiden / Louvain / Girvan-Newman rely on) |
| `selfLoopWeight()` | `F64(n)` | O(n log d) | sum of `weights` over `selfLoopArcs()` per node (`selfLoopsPerNode()` widened when unweighted) |
| `totalWeight()` | `number` | O(m) once | sum over logical edges (each undirected edge once) |
| `selfLoopArcs()` | `Uint32Array(selfLoopCount)` | O(n log d) | arcs `a` with `colIdx[a] === row(a)`, found by binary search per row |
| `selfLoopsPerNode()` | `Uint32Array(n)` | O(n log d) | loop arcs per node; `selfLoopsAt(u)` is the O(log d) point query |
| `mate()` | `Uint32Array(arcCount)` | O(m) lockstep walk (6.4) | undirected only (throws `E_DIRECTED`); self-loop maps to itself |
| `degreeOrder(options?: { of?: "forward" \| "reverse" })` | `DegreeOrderView` | O(n + maxDegree) counting sort (plus `reverse()` for `"reverse"`) | `perm` is the GPU binding; `segmentOffsets` (5 words) is read on the CPU to size the three dispatches; the `ViewName`s are `degreeOrder` and `reverseDegreeOrder` for `prepare` / `includeViews` |
| `isSymmetric()` | `boolean` | O(m) after `reverse()` | directed: forward row `v` equals reverse row `v` (targets vs sources, both sorted) for every `v`, with equal weights; undirected: `true` without work |

### 7.3 Derived graphs (explicit, not cached by the format, new snapshot)

```typescript
export interface DerivedGraph {
    readonly snapshot: GraphSnapshot;
    readonly nodeOrigin: U32 | null;   // new node index -> source node index (contract: the LOWEST source index of the block); null when the node space is unchanged
    readonly edgeOrigin: U32 | null;   // new edge index -> source edge index (a merged edge: its SURVIVOR's source index, never INVALID_INDEX); null when unchanged
    readonly nodeRemap: U32 | null;    // source node index -> new index (contract: the block) or INVALID_INDEX (dropped); null when unchanged
    readonly edgeRemap: U32 | null;    // source edge index -> new index; a merged / collapsed edge maps to its SURVIVOR, a dropped edge to INVALID_INDEX; null when unchanged
    readonly blockSizes: U32 | null;   // contract only: source nodes per new node; null otherwise
    readonly report: { readonly droppedEdges: number; readonly mergedEdges: number };
}
export type WeightReducer = "first" | "last" | "sum" | "min" | "max";
export type ColumnReducer = WeightReducer | "mean" | "count" | "drop";
```

`edgeRemap` semantics are the same for every operation that merges edges
(`toUndirected` reciprocal pairs, `simplified`, `contract` with `parallel:
"merge"`) and for the `FreezeReport` of a merging freeze (section 6.5):
every non-survivor maps to its survivor, so a consumer that writes a
per-edge result of the derived graph back onto SOURCE edges (graphty-
element's MST / cut / path adapters, section 14.4) does `out[e] =
vec[edgeRemap[e]]` for every source `e` whose entry is not
`INVALID_INDEX`, and both halves of a collapsed reciprocal pair receive
the value. `edgeRemap[edgeOrigin[d]] === d` for every derived edge `d`
(property P9b).

| Method | Node space | Edge space | Semantics |
| --- | --- | --- | --- |
| `toUndirected(opts?: { reciprocal?: boolean; weights?: WeightReducer })` | same | new | every directed edge becomes undirected; reciprocal pairs `(u, v)` / `(v, u)` collapse to one edge keeping the lower index's row (keep-first, Q36) and the reduced weight (default `"first"`); `reciprocal: true` keeps only pairs present in both directions (cuGraph `symmetrize(reciprocal)`); on an undirected snapshot returns `{ snapshot: this, null maps }` |
| `transpose()` | same | same | orientation of every edge swapped; the reverse view's arrays become the core; on an undirected snapshot returns `this` |
| `simplified(opts?: { weights?: WeightReducer; selfLoops?: "keep" \| "drop"; edgeReducers?: Record<string, ColumnReducer> })` | same | new | one edge per `(u, v)` group (parallels adjacent by I4); survivor is the lowest index; `flags.multigraph === false` afterwards |
| `withoutSelfLoops()` | same | new | |
| `filterEdges(keep: EdgeMask /* packed bitmap over logical edges */)` | same | new | Girvan-Newman "remove edges" as a rebuild; algorithms that remove edges iteratively keep their own alive bitmap instead (section 7.4) |
| `inducedSubgraph(selection: U32 \| { mask: NodeMask })` | new (compact) | new | index list (order = new index order; an out-of-range or repeated index throws `E_INDEX_RANGE`) or packed mask (ascending order; `E_MASK_LENGTH` when the mask is short); edges with both endpoints kept; the two forms are distinguishable at runtime by shape |
| `contract(partition: U32, opts?: ContractOptions)` | new (`k` blocks) | new | `partition.length === nodeCount` with no `INVALID_INDEX` entry, else `E_PARTITION`. Labels need not be dense: labels that already form the set `0..k-1` are kept as block indices (so Tarjan-order SCC labels give `condensationGraph` today's numbering); any other labelling (Leiden communities with holes, union-find roots) is renumbered in first-seen order, and `nodeRemap` gives every source node its block. Semantics are at the LOGICAL-EDGE level: each source edge contributes exactly once; an edge between two blocks becomes one edge `block(u) -> block(v)` (undirected: `{block(u), block(v)}`); an intra-block edge becomes ONE self-loop logical edge with weight `w` (never `2w`), kept or dropped per `selfLoops` (Leiden needs both); parallels per `parallel: "merge" \| "keep"` with `weights` (default `"sum"`). On an unweighted source (`weights === null`) the reducers `first` / `last` / `min` / `max` yield `null` (still all ones) and `sum` yields a materialised `F32` of multiplicities (what Leiden on an unweighted input needs); `condensationGraph` passes `"first"`. `blockSizes` is returned; node columns per `nodeReducers`; the new id map is `identity` (ids `0..k-1`); `contract(identity)` preserves `weightedDegree` and `totalWeight` (P9c). This is the Leiden / Louvain aggregation (one call per level) and `condensationGraph` primitive (Q6); Stoer-Wagner and Karger do NOT use it (section 14.2) |
| `relabel(perm: U32)` | permuted | same order | `perm[newIndex] = oldIndex`; the id map follows; `relabel(snapshot.degreeOrder().perm)` is the cuGraph-style degree renumbering for callers who want it (Q38, C18: never implicit) |
| `relabel(perm)` with a `perm` that is not a permutation of `0..n-1` | -- | -- | `E_INVALID_PERMUTATION` |
| `filterEdges(keep)` with `keep.length < ceil(edgeCount / 32)` | -- | -- | `E_MASK_LENGTH` |
| `withColumns(nodes?, edges?)` | same | same | a new snapshot object sharing the core, the id map and the SERIAL with a CLONED column set plus the given columns; for consumers that must not mutate the caller's tables |

Node id maps of derived graphs: same node space -> shared by reference;
`inducedSubgraph` / `relabel` -> gathered (`identity` becomes `numeric`
unless the selection is a prefix); `contract` -> `identity`.

Derived graphs are NOT cached by the format (C8): a memoised second CSR is
memory the owner did not ask for and would make every snapshot silently
able to double its resident size. The consumer that wants the undirected
view of a directed graph owns ONE cache: graphty-element's `DataManager`
keeps `WeakMap<GraphSnapshot, DerivedGraph>` entries for `toUndirected()`
and `simplified()` and hands the same object to every adapter and to the
layout engine (section 14.4; the layout package's own `WeakMap` is only
for legacy duck-typed inputs, section 14.3). A derived graph that depends
on a mask (`inducedSubgraph` for "analyse visible only") is keyed on
`(source serial, mask version)` by its owner, never on the snapshot alone.
Every derived graph goes through the freeze pipeline and inherits every
invariant.

### 7.4 Masks (G16, Q32)

Masks are NOT part of the snapshot contract; no kernel or algorithm in any
consumer package is required to honour a node or edge mask (a mask-aware
kernel is a second kernel). The two needs behind masks are served
differently: hiding/filtering for rendering is graphty-element's own
packed bitmap per snapshot (or a `bool` column with role `hidden`), and
"analyse visible only" runs on `inducedSubgraph` / `filterEdges` results;
algorithm-internal edge removal (Girvan-Newman, k-truss peeling) uses an
algorithm-owned bitmap tested in the inner loop: over LOGICAL edges
(`makeMask(edgeCount)` tested through `arcToEdge[a]`, one bit per removed
edge, no mate lookup) for undirected snapshots, where `arcToEdge` is
always materialised, and over arcs for directed snapshots, where it may be
identity-lazy; `maskCount` is the loop guard. The package exports the
packed-bitmap helpers (`makeMask`, `maskTest`, `maskSet`, `maskCount`,
`maskToIndices`) because `inducedSubgraph`, `filterEdges`, `bool` columns
and validity bitmaps share the layout.

### 7.5 Boundary helpers

Small pure functions exported by the package because every consumer needs
them and they touch format internals: `foldArcs(snapshot, perArc, reducer,
out?)` reduces `arcCount -> edgeCount` through `arcToEdge` (`"first" |
"sum" | "max" | "min"`; returns the input itself when the permutation is
the identity); `expandEdges(snapshot, perEdge, out?)` gathers `edgeCount
-> arcCount`; both are generic over `NumericVector` (C11).
`renumberPartition(labels, out?)` renumbers an arbitrary `u32` labelling
to dense `0..k-1` in first-seen order and returns `{ labels, count }`
(what `contract()` does internally; exported because Leiden refinement
and Louvain need it between levels). `isGraphSnapshot(x)` is a structural
check on the `SNAPSHOT_BRAND` property (`Symbol.for(
"@graphty/graph-format/snapshot")`, declared on the class in section
12.2) plus `formatVersion`, never `instanceof`, so a duplicated package
copy still interoperates. `equalsTopology(a, b)` compares core arrays and
id maps byte for byte. `structuredClone(snapshot)` and
`postMessage(snapshot)` THROW `DataCloneError` immediately: the class
defines a non-enumerable own property holding a function, which the
structured clone algorithm refuses, so nobody can accidentally deep-copy
28 MB into a dead plain object; `WireSnapshot` is the only cloneable
shape (section 9.1).

---

## 8. Populating the format

### 8.1 Core entry points (zero dependencies)

Three factory functions cover every in-memory source; everything
text-based goes through the `GraphSink` contract (8.3) from
`@graphty/graph-io`.

```typescript
// (verbatim copy of the section 12.2 declarations)
// 1. COO typed arrays with dense indices: the 20 ms path. No id Map unless `ids` is given.
export interface EdgeArraysInput {
    readonly directed: boolean;
    readonly nodeCount?: number | undefined;                      // required unless `ids` is given; isolates are preserved
    readonly ids?: readonly NodeId[] | F64 | undefined;           // optional external ids in index order (length = nodeCount)
    readonly src: U32;                                            // node indices
    readonly dst: U32;
    readonly weights?: F32 | F64 | undefined;                     // F64: downcast to f32; f64 shadow kept only when not f32-exact
    readonly nodeColumns?: Readonly<Record<string, TypedArrayData | ColumnInput>> | undefined;
    readonly edgeColumns?: Readonly<Record<string, TypedArrayData | ColumnInput>> | undefined;
    readonly meta?: GraphMetaPatch | undefined;
}
export function fromEdgeArrays(input: EdgeArraysInput, options?: BuilderOptionsPatch & FreezeOptions): GraphSnapshot;

// 2. Adopt prebuilt CSR arrays (a file, a worker, another package, a generator that emits CSR directly).
export interface CsrInput {
    readonly directed: boolean;
    readonly nodeCount: number;
    readonly rowPtr: U32;
    readonly colIdx: U32;
    readonly weights?: F32 | null | undefined;
    readonly arcToEdge?: U32 | undefined;                         // absent => identity (directed only; undirected input must supply it)
    readonly edgeToArc?: U32 | undefined;                         // absent => derived in one O(m) pass (or identity)
    readonly edgeCount?: number | undefined;                      // defaults to arcCount (directed) or is derived from arcToEdge
    readonly ids?: readonly NodeId[] | F64 | undefined;
    readonly nodeColumns?: Readonly<Record<string, TypedArrayData | ColumnInput>> | undefined;
    readonly edgeColumns?: Readonly<Record<string, TypedArrayData | ColumnInput>> | undefined;
    readonly meta?: GraphMetaPatch | undefined;
    readonly flags?: FlagClaims | undefined;                      // claims; verified unless validate === "none"
}
export interface FromCsrOptions { readonly validate?: ValidationLevel | undefined; readonly copy?: boolean | undefined; readonly sortRows?: boolean | undefined; }
export function fromCsr(input: CsrInput, options?: FromCsrOptions): GraphSnapshot;

// 3. Plain records (what graphty-element's DataSources emit today; node-link shaped JSON).
export interface RecordsInput {
    readonly directed: boolean;
    readonly nodes?: Iterable<Readonly<Record<string, unknown>>> | undefined;
    readonly edges: Iterable<Readonly<Record<string, unknown>>>;
    readonly nodeId?: string | null | undefined;                  // default "id"; null = node index is array position and endpoints are indices (d3 v3)
    readonly edgeSource?: string | undefined;                     // default "source", falling back to "src" / "from"
    readonly edgeTarget?: string | undefined;                     // default "target", falling back to "dst" / "to"
    readonly edgeWeight?: string | null | undefined;              // default "weight"; null = unweighted
    readonly columns?: "infer" | "json" | "none" | readonly ColumnDecl[] | undefined;   // default "infer" (section 5.1 widening)
    readonly ids?: IdCoercion | undefined;                        // default "keep" (values are already typed)
}
export function fromRecords(input: RecordsInput, options?: BuilderOptionsPatch & FreezeOptions): { snapshot: GraphSnapshot; report: FreezeReport };
```

`fromCsr` ADOPTS the caller's arrays without copying by default (`copy:
false`, GraphBLAS pack semantics, C12): the caller transfers ownership and
must not mutate them afterwards. `validate` defaults to `"full"` (section
11.4) because adopted arrays typically come from a file or the network;
`"structure"` skips the sortedness / multigraph / flag checks and trusts
`flags`; `"none"` is for a loader that already validated. With `sortRows:
true` (the default) the constructor first checks I4 in O(m); if every row
is already sorted the arrays are adopted as they are, otherwise a fresh
sorted core is built through the freeze pipeline (the caller's arrays are
not modified, `arena` is set as for `freeze()`, and the cost is a
freeze); `sortRows: false` asserts the rows are sorted (checked under
`"full"`, `E_INVALID_SNAPSHOT` with `details.invariant: "I4"` otherwise).
The snapshot has `arena === null` unless the caller's arrays already
share ONE `ArrayBuffer` with offsets that are 256-byte-aligned relative to
the first array, in which case that buffer is adopted as the arena
(detected; `fromWire` applies the same detection when the manifest
carries no `arena` descriptor). For a directed snapshot whose `arcToEdge`
is the identity and whose `weights` were passed as `F32`,
`edgeList().weights` aliases `weights` (zero extra memory). Legacy duck types (`{ nodes(), edges() }`
of `@graphty/layout`, the algorithms `Graph`) are NOT adapted in the core;
each consumer package owns its adapter (section 14).

### 8.2 Where importers and exporters live (C16, Q25)

| Layer | Package | Runtime deps | Contents |
| --- | --- | --- | --- |
| Core | `@graphty/graph-format` | none (and no DOM lib: the core's public types reference only ES2020 globals) | snapshot, builder, tables, id map, wire form, `GraphSink`, `fromEdgeArrays` / `fromCsr` / `fromRecords` |
| IO | `@graphty/graph-io` (new package, phase IO1 of section 14.6) | `@graphty/graph-format` (peer + workspace dependency); initially `fast-xml-parser` and `papaparse` moved from graphty-element, replaced by hand-written streaming tokenisers per format as they pass the corpus | the io contract TYPES (`GraphImporter`, `GraphExporter`, `ImportInput`, `CommonImportOptions`, `CommonExportOptions`, `ExportCapabilities`, `LossNote`, `ImportReport`, `ImportIssue`, `ImportError`; they reference `ReadableStream` and `AbortSignal`, which is why they are not in the core), one importer and one exporter per format under per-format subpath exports (`@graphty/graph-io/gexf`, `/graphml`, `/gml`, `/dot`, `/pajek`, `/csv`, `/json` (node-link, JGF, Cytoscape, graphology, vis), `/neo4j`), the registry with `sniff()` (today's `format-detection.ts`), `importGraph()` which creates the builder after sniffing, the `children` CSR helper, the corpus and the fidelity tests |
| App | `@graphty/graphty-element` | as today | `DataSource` subclasses become thin wrappers that fetch bytes (data / file / url, retry, progress) and stream into the io importer with the `DataManager`'s builder as the sink |

Rationale: the core must stay zero-dependency, small and auditable (its
version number means "format version"); parsers are the largest code by
line count (3000+ lines today) with their own fixture corpus and
dependency story; subpath exports let a CSV-only bundle skip the XML
tokeniser (remote-logger already ships subpath exports in this monorepo,
so the build convention exists; wiring the multi-entry vite build is an
io-package task). Landing order (section 14.6): graphty-element's
`DataManager` switches to the builder FIRST while its existing
`DataSource`s keep emitting `{ nodes: object[], edges: object[] }` chunks
pushed with `addNodeRecord` / `addEdgeRecord`; moving the parsers into
`@graphty/graph-io` and making them scalar-push is a later, independent
step where the "one object per node/edge" allocation cost goes away.
JSON dialect sniffing (JGF, Cytoscape, graphology, vis) is an io concern;
the core's `fromRecords` handles the node-link shape every dialect parses
into.

### 8.3 The sink contract

`GraphSink` (complete interface in section 12.2) is the subset of
`GraphBuilder` that importers may call: `directed` / `directedLocked` /
`setDirected`, `reserve`, `addNode` / `addNodes`, `addEdge` / `addEdges`,
`setEdgeWeight`, `edgeEndpoints` / `edgeWeight`, `indexOf`, `edgeCount`,
`declareNodeColumn` / `declareEdgeColumn`, `nodeColumn` / `edgeColumn`,
`setNodeValue` / `setEdgeValue` (a string column name auto-declares with
inference), `setGraphValue`, `setMeta`, `addExtensionTable` /
`addExtensionRow`, and the record conveniences `addNodeRecord` /
`addEdgeRecord`.

Importers push scalars, never objects (research note 07 section 8.1); the
record methods exist for the transitional element path and JSON. `addEdge`
before `addNode` is legal with `addMissingNodes: true` (the sink's
option). Typed fast setters (`setNodeF64(handle, i, v)`) are reserved for a
later minor; the generic setter already avoids allocation. `GraphBuilder`
implements `GraphSink`, and `GraphSink` is an interface so tests can pass
a recording sink.

### 8.4 Importer plugin shape

`GraphImporter<Opts>` (section 12.2) declares `format`, `extensions`,
`mimeTypes`, an optional `sniff(head): number` confidence, and
`import(input: ImportInput, sink: GraphSink, options?: Opts &
CommonImportOptions): Promise<ImportReport>`, where `ImportInput` is a
string, a `Uint8Array`, a `ReadableStream<Uint8Array>` or an async
iterable of chunks. `CommonImportOptions`: `ids` (`"canonical"` default
for text-cell formats, `"keep"` for JSON; `"string"`, `"number"`; section
4.1; the CSV importer applies the ONE rule of the import call to a node
table and the edge table it is paired with through its format option
`nodes` (`got-nodes.csv` + `got-edges.csv`), so endpoints and node ids
agree across the two files); `nodeIdFrom` (`"id"` default, `"label"`, `"index"` for the GML /
Pajek / d3 ambiguity); `addMissingNodes` (default true; the GEXF importer
defaults false for EDGES and reports, while `pid` / `<parent for>`
references are resolved by deferral, below); `duplicateEdges` (default
`"keep"`); `selfLoops` (default `"keep"`); `onMixedDirection` (default
`"expand"`, section 3.6); `defaultDirected` for files that omit it (GEXF:
undirected per spec, Q22); `weightFrom` (per-format default: `"weight"`,
GML `"value"`, Pajek third column; `null` = unweighted); `weightDtype`
(default `"f64"` for EVERY importer, so `0.1` in a CSV `Weight` column or
`16777217` in a KONECT file is never corrupted; the shadow column costs
zero bytes when the values are f32-exact; `"f32"` is an explicit opt-in);
`long` (`"f64"` default, `"string"`; section 5.1); `restoreMangledIds`
(default true: an importer that finds the `graphty.originalId` column /
`graphty:originalId` attribute written by `sanitizeIds: "mangle"` restores
the original ids); `hyperedges` (`"error" | "skip" | "star" | "clique"`,
default `"skip"` with a report entry, Q28); `errorLimit` (default 100;
beyond it the importer aborts with `E_IMPORT`); `signal`;
`onProgress(bytesDone, bytesTotal?)`.

The importer never freezes: it pushes into the caller's sink. The
`@graphty/graph-io` registry exposes `importGraph(input, { format?,
...options }): Promise<{ snapshot; report; freeze: FreezeReport }>` which
sniffs, creates the builder (`directed: true` as a placeholder; the
importer sets the real value), imports and freezes, for callers who do
not own a sink.

Direction is resolved by the IMPORTER in one pass, using `setDirected()`
(section 6.6), so no importer stages edges and no format needs a second
pass:

1. Before the first edge, the importer reads the header (GEXF
   `defaultedgetype`, GraphML `edgedefault`, GML `directed`, DOT `graph` /
   `digraph`, JSON `directed`, `defaultDirected` for files that say
   nothing) and calls `sink.setDirected(headerDirected)`. On a registry
   builder or an empty unlocked caller builder this always succeeds. On a
   non-empty unlocked UNDIRECTED sink with a directed header (a second file
   loaded into graphty-element under `"auto"`) the importer calls
   `sink.setDirected(true, { expand: true })` instead and the graph
   becomes directed-with-pairs. If the call throws `E_DIRECTED` (the sink
   is locked, or is a non-empty directed sink and the header says
   undirected) the importer records a `coercion` issue ("file is
   undirected, sink is directed") and continues with `sink.directed`, so
   rule 2 expands every edge that differs.
2. Every edge is pushed as it is read. An edge whose direction equals
   `sink.directed` is one `addEdge`. An edge that differs is handled per
   `onMixedDirection`: with `"expand"`, an undirected edge into a directed
   sink becomes two `addEdge` calls plus the `graphty.directed` /
   `graphty.pair` writes of section 3.6 (mirror rows of other columns
   unset); a directed edge into an undirected sink triggers ONE
   `sink.setDirected(true, { expand: true })`, after which the builder has
   expanded everything pushed so far (O(E) once, using its own staging;
   this is why `edgeEndpoints` / `edgeWeight` exist on the sink) and the
   importer continues in directed mode. If that call throws `E_DIRECTED`
   (locked undirected sink) the importer records the issue and, with
   `"expand"` or `"error"`, aborts with `E_IMPORT`; with `"directed"` /
   `"undirected"` it applies that policy and reports.
3. Per-section (Pajek `*Arcs` / `*Edges`) and per-row (Gephi CSV `Type`)
   direction go through the same two rules; `ImportReport.counts.
   expandedMixed` counts the expanded edges.

Precedence, stated once: the registry's builder follows the file; a
caller's builder follows the file while it is empty and unlocked; a
locked or non-empty builder wins and the importer reports every option it
could not honour (`directed`, `addMissingNodes`, `duplicateEdges`,
`selfLoops`, `weightDtype` are builder options exposed read-only as
`sink.options`; `CommonImportOptions` carries them only to seed the
registry's builder). Streaming: CSV/TSV, SNAP, KONECT, Neo4j CSV and Pajek
importers are line-oriented over a byte stream; GEXF and GraphML are
single-pass SAX-style (attributes precede nodes, edges follow nodes,
forward edge references are legal because `addMissingNodes` defaults
true; GEXF `pid` / `<parent for>` references may precede the parent's
declaration, so the importer buffers `(childIndex, parentId)` pairs and
writes the `parent` / `parents` columns after `</nodes>`, reporting
unresolved parents as `missing-value` issues); GML, DOT and JSON await the
whole text. The io base class provides the chunk/line iterator and UTF-8
decoding (`new TextDecoder("utf-8", { fatal: true })`, so invalid bytes
are a `parse-error`, never a silent U+FFFD that could alias two ids).

### 8.5 Exporter plugin shape

`GraphExporter<Opts>` (section 12.2) declares `format`, a
`capabilities: ExportCapabilities` table (mixed direction, multi-edges,
self-loops, edge ids required / optional / none, id charset, dtypes,
components, lists, json, defaults, options, hierarchy, temporal support,
graph attributes, positions, viz), `check(snapshot, options):
LossNote[]` (pre-flight; each note has `code`, `message`, optional
`column` and `count`), `export(snapshot, options): AsyncIterable<
Uint8Array>` and `exportToString()`. `CommonExportOptions` are
`sanitizeIds: "error" | "mangle"` and `onMixedDirection: "error" |
"directed" | "undirected"` (the same option name as on import, without
`"expand"`) for formats without mixed-direction support.

Exporters iterate nodes `0..nodeCount` and logical edges `0..edgeCount`
(never arcs), read `edgeList()` for declared orientation, the `pair` /
`directed` role columns for expanded mixed input (folding pairs back and
reading attributes from the primary half), the `weight` role column when
present (its validity says which edges had an explicit weight, section
3.7; else `edgeList().weights`, formatted as the shortest round-tripping
decimal), and columns in declaration order. `sanitizeIds` defaults to
`"error"`: an exporter never silently renames a node; `"mangle"` writes
the original id into a `data` attribute named by the exporter
(`graphty:originalId`, read back by `restoreMangledIds`) and `check()`
reports it. The fidelity matrix of research note 07 section 9 is the
`capabilities` table of each exporter and the acceptance test list for
`check()`, with these format rules added so the double round trips of
section 16.5 are exact:

- GML: the importer honours NetworkX's `_networkx_list_start` marker (a
  one-element list re-imports as a `list`), records `origin.type` as
  `int` / `real` / `string` per column, and maps nested records to
  `json`; the exporter writes `f64` columns with a decimal point (`2.0`,
  never `2`, so the dtype survives), writes one-element lists with the
  marker, and `check()` reports `W_GML_RECORD_NUMBER_TYPE` for `json`
  columns containing numbers (JSON cannot keep GML's `int` / `real`
  distinction inside a record).
- GraphML: `key for="all"` is declared in the node, edge and graph tables
  with the same `origin.id`; yFiles nested XML mapped through the XML
  parser to `json` is marked `lossy` in the matrix (structure preserved,
  not byte-exact).
- node-link / JGF / Cytoscape / graphology JSON: shape information the
  exporter needs is recorded under reserved `meta.extra.json` keys `{
  dialect: "node-link" | "d3" | "jgf" | "cytoscape" | "graphology" | "vis",
  edgesKey: "links" | "edges", nodeIdKey: "id" | "name", indexLinks:
  boolean }` and `meta.declaredMultigraph`; node ids that are JSON `true`
  / `false` / `null` (legal NetworkX ids) are `E_INVALID_ID` in the core,
  so the JSON importer reports them as `unsupported` and coerces with
  `String(v)` only under `ids: "string"`.
- GEXF: `timeRepresentation`, `mode`, `timestamps`, `open` and the
  `timeText` companions of section 5.1 give the exporter what the primer
  requires; absent and `1.0` weights are equivalent.

### 8.6 Import report and error aggregation (G10)

`ImportReport` (declared in `@graphty/graph-io`, shape in section 12.2)
carries `format`, `counts` (`nodes`, `edges`, `skippedNodes`,
`skippedEdges`, `expandedMixed`), `issues` (each
with a `category` -- `parse-error`, `missing-value`, `validation-error`,
`unsupported`, `precision`, `coercion`, `merged` -- a `severity`, a stable
`code` such as `"E_UNKNOWN_NODE"` or `"W_WIDENED"`, a `message`, and
optional `line` and `element`), `errorCount`, `warningCount`, `truncated`
(the `errorLimit` was reached), `lossy` notes for what the importer could
not represent, and `durationMs` for the parse phase (the freeze is the
caller's and reports separately).

Layering: the builder throws on the first hard error (section 11.1); the
importer catches `GraphFormatError` per element, records an
`ImportIssue`, skips the element and continues until `errorLimit`, then
aborts with `E_IMPORT` (an `ImportError extends GraphFormatError`,
declared in graph-io, carrying the partial report; the code is reserved
in the core's union so `err.code === "E_IMPORT"` narrows). This keeps the
core total and simple and the aggregation in the one place that knows
line numbers. graphty-element's existing `ErrorAggregator` semantics map
onto this one-to-one.

---

## 9. Serialisation and transfer

### 9.1 Wire form (in memory)

Every snapshot converts to a plain object made of a JSON-serialisable
manifest and a list of `ArrayBuffer`s. The same object is what
`postMessage`, `structuredClone`, IndexedDB and the byte container carry
(G6/G7); the `buffers` array is literally the `postMessage` transfer list.

`WireSnapshot` (section 12.2) is `{ manifest: WireManifest; buffers:
ArrayBuffer[] }`. The manifest carries `format: "graphty-snapshot"`, `wire:
[major, minor]`, `producer` (the npm version string; masked when golden
fixtures are compared, section 16.3, so I15's "byte-identical" is
"byte-identical modulo `producer`"), `formatVersion`, `directed`, the
four counts, `flags`, `core` (a `WireBufferRef` per core array, `null`
for an identity permutation -- always, whether or not a getter
materialised it -- and for an absent or zero-length array), `arena` (the
buffer index, offset and length of the arena region when the core lives
in one buffer, `null` otherwise, so a receiver keeps the one-`writeBuffer`
path), `ids` (section 4.5), `nodeColumns`, `edgeColumns`, `graphColumns`,
`extensions`, `meta`, `label` and `views` (`null` unless requested). A
`WireBufferRef` is `{ buffer, byteOffset, byteLength, dtype, length }`
where `buffer` indexes `buffers`. A `WireColumn` is `{ meta, data,
validity, nullCount }` plus `dictionary` / `strings` / `jsonText`
(offsets + utf8 pairs), `offsets` + `child` for lists, each `null` when
not applicable (the 12.1 rule: absent output is `null`, never `?:`);
`meta.default`, `options` and `extra` are JSON values with the tagged
encoding of section 5.9 for non-finite numbers.

```typescript
export declare class GraphSnapshot {
    toWire(options?: ToWireOptions): WireSnapshot;
    transferables(): ArrayBuffer[];       // distinct, exclusively owned backing buffers of core, id map, typed columns, string stores, extensions
}
export function fromWire(wire: WireSnapshot, options?: FromWireOptions): GraphSnapshot;
```

- `toWire()` allocates nothing for typed data EXCEPT the first
  materialisation of a lazily kept representation: the Utf8 store of
  string ids and string columns, the `Float64Array` of a `numeric` /
  `mixed` id map (section 4.2), and the JSON text of `json` columns; each
  is cached afterwards. The core is views over the arena (ONE buffer).
- Sharing and `transfer: true`. The format shares storage deliberately:
  `withColumns()` shares the core, same-node-space derived graphs share
  the node table, `set(name, column)` moves a `Column` between tables.
  The package records every such sharing in a `WeakMap<ArrayBuffer,
  number>` owner count (incremented when a buffer gains a second holder;
  conservative: never decremented). `toWire({ transfer: true })` puts
  only EXCLUSIVELY owned buffers into `buffers` as transferables and
  COPIES every shared one (listed in `wire.manifest.copied` by ref index),
  so a transfer is O(1) per exclusive buffer and O(bytes) for shared ones,
  and no sibling snapshot is ever silently emptied. `transferables()`
  returns the same exclusive set. A consumer that kept its own view over a
  buffer (a GPU package holding a `Uint8Array` over `arena.buffer`) is
  outside the count; that is why `detached` is DERIVED, not a private bit:
  `snapshot.detached === (snapshot.rowPtr.length === 0)` (a transferred
  `ArrayBuffer` leaves zero-length views; `rowPtr` always has `n + 1 >= 1`
  elements otherwise), so every holder of the same core reports `detached`
  and throws `E_DETACHED` from core accessors, and view caches of a
  detached snapshot are dropped. Without `transfer: true` nothing is
  transferable: `buffers` are plain references and `postMessage` clones.
- Fan-out: a transferred wire has exactly one receiver; to send one
  snapshot to several workers, `structuredClone(wire)` per receiver (a
  copy each) or transfer to one and let it forward.
- `fromWire()` defaults to `validate: "structure"` (the manifest is
  trusted to have come from this package; the cheap checks still run) and
  `copy: false`. It refuses a manifest whose `formatVersion` is not the
  reader's (`E_UNSUPPORTED_VERSION`, `details.kind: "format"`) or whose
  wire major is unknown (`details.kind: "wire"`); reads a newer wire minor
  by ignoring unknown manifest FIELDS; and for unknown enum VALUES
  (forward-compatible minors that add a dtype, a view name or an id-map
  kind) behaves as follows: an unknown column `dtype` throws
  `E_UNSUPPORTED` (`details.dtype`) unless `unknownColumns: "skip"` is
  passed, in which case the column is dropped and named in
  `snapshot.meta.extra["graphty.skippedColumns"]`; an unknown id-map
  `kind` always throws `E_UNSUPPORTED` (ids are not optional); unknown
  `views` entries are ignored and recomputed.
- `structuredClone(wire)` works (plain object + `ArrayBuffer`s);
  `structuredClone(snapshot)` on the class instance throws
  `DataCloneError` (section 7.5).
- Cached views are NOT included unless `includeViews` names them; the
  receiver recomputes. Scalar views (`totalWeight`, `symmetric`) are
  ignored by `includeViews` and always recomputed.

### 9.2 Byte container (files, IndexedDB blobs, network)

Layout, all integers little-endian:

```
offset  size   field
0       4      magic: bytes 0x47 0x53 0x4E 0x50 ("GSNP")
4       2      wire major (u16) = 1, written with DataView(..., littleEndian = true)
6       2      wire minor (u16) = 0, DataView little-endian
8       4      endianness probe: the u32 value 0x01020304 written through a HOST-ORDER
               typed array (new Uint32Array(buf, 8, 1)[0] = 0x01020304) and read the same
               way. A reader that sees bytes 04 03 02 01 is little-endian-compatible;
               anything else -> E_BAD_SERIALIZATION. The writer computes
               IS_LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1
               once and toBytes() / toWire() throw E_UNSUPPORTED (details.reason:
               "big-endian host") when it is false, so a big-endian host never emits a
               file other hosts reject (every supported platform -- x86-64, ARM64,
               WebAssembly -- is little-endian; no byte-swapping reader in v1).
12      4      manifest byte length L (u32), DataView little-endian
16      L      manifest: UTF-8 JSON of WireManifest with every WireBufferRef.buffer === 0
               and byteOffset relative to the start of the buffer region
16+L    pad    zero padding to the next multiple of 256 bytes
B       ...    buffer region: each array at a 256-byte-aligned offset, in manifest order
               (core arrays first so the region's prefix is the arena); no trailer
```

```typescript
export declare class GraphSnapshot {
    toBytes(options?: ToBytesOptions): U8;                       // one contiguous buffer
    toByteChunks(options?: ToBytesOptions): Iterable<U8>;        // header + manifest, then each padded segment in order
}
export function fromBytes(bytes: Uint8Array | ArrayBufferLike, options?: FromWireOptions): GraphSnapshot;
export function fromByteChunks(chunks: Iterable<Uint8Array>, options?: FromWireOptions): GraphSnapshot;
```

`fromBytes` defaults to `validate: "full"` and `copy: false`: the core
arrays are views into the caller's buffer, which is exactly one memcpy
away from a GPU buffer, and the buffer region is adopted as the arena
(`arena.byteOffset === bytes.byteOffset + B`). Adoption requires that the
container be a plain `ArrayBuffer` (a `SharedArrayBuffer` container is
copied, decision D-SAB) and that `bytes.byteOffset % 8 === 0`: segments
sit at `bytes.byteOffset + B + 256k`, and the container carries `f64`
segments (numeric and mixed id maps, `f64` columns, extension `start` /
`end`) whose `Float64Array` view needs 8-byte alignment, so a `Uint8Array`
at offset 4 takes the documented copy path (into a fresh 256-aligned
buffer) instead of throwing a `RangeError` (section 16.3 tests offsets 0,
4 and 8). The version, unknown-field and unknown-enum rules are those of
`fromWire` (section 9.1). The container is one contiguous buffer, so its
size is bounded by the engine's per-allocation ceiling (section 15.3);
`toByteChunks()` yields the same bytes as a sequence (header + manifest
first, then every 256-padded segment in manifest order) for a streaming
file writer or an IndexedDB store that keeps chunks under one key prefix,
and `fromByteChunks()` adopts each chunk's buffer per segment with `arena
=== null`. For the benchmark graph (undirected, weighted, string ids of 8
bytes, no columns) the container is 28.4 MB core + 1.3 MB ids + ~1 KB
manifest.

### 9.3 IndexedDB

Store `toBytes()` output as a single `ArrayBuffer` value (one structured
clone of one buffer; IndexedDB stores it without re-encoding), keyed by a
caller-chosen key plus the wire major. On read, `fromBytes(buf, {
validate: "structure" })`. `snapshot.contentHash()` (a 64-bit hash
computed as two independent 32-bit FNV-1a lanes over the u32 words of the
core arrays using `Math.imul`, returned as a 16-character hex string,
lazily computed and cached; tens of milliseconds for the benchmark core)
lets callers key caches by content. The package does not open databases
itself; graphty provides the wrapper.

### 9.4 Worker transfer

Producer side (parse and freeze in a `DedicatedWorkerGlobalScope`):

```typescript
const wire = snapshot.toWire({ transfer: true });
self.postMessage(wire, snapshot.transferables());   // Worker.postMessage(message, transfer); the Window overload takes a targetOrigin
```

Consumer side: `fromWire(wire, { validate: "none" })`. Cost: O(1) per
exclusively owned buffer (section 9.1); the id map's reverse `Map` and
decoded strings are rebuilt lazily on the receiver. Each realm keeps its
own view cache; freezes above ~10M edges belong in a worker (application
decision); cancellation is the importer's `signal`, not the freeze's.

Decision D-SAB: `SharedArrayBuffer` is not supported in v1. There is no
`shared` builder option and no `flags.shared`; `ArenaLayout.buffer` and
`WireSnapshot.buffers` are plain `ArrayBuffer`s; every public typed array
is `Uint32Array<ArrayBuffer>`-shaped and therefore accepted by
`GPUQueue.writeBuffer` without a cast (section 12.1). Reasons: (1)
`Uint32Array<SharedArrayBuffer>` is NOT a `BufferSource`, so a shared
core would need a second upload path (`writeBuffer(gbuf, 0, arena.buffer,
byteOffset, byteLength)` with the raw SAB) and a generic
`GraphSnapshot<B>` through every consumer signature; (2) a shared arena
cannot be transferred, so `transferables()` and `toWire({ transfer })`
would need per-buffer exceptions; (3) the browser gate is
`crossOriginIsolated`, a deployment decision graphty.app has not made
(section 18 decision 3). When that decision lands, shared snapshots are added as
a minor: `GraphBuilderOptions.shared` allocating EVERY snapshot buffer
(core, id map, columns, string stores, extensions, and `set()`-adopted
columns via copy) as `SharedArrayBuffer`, a `SharedGraphSnapshot` type
whose arrays are `Uint32Array<SharedArrayBuffer>`, `transferables()`
returning `[]`, and the constructor throwing `E_UNSUPPORTED` unless
`typeof SharedArrayBuffer !== "undefined" && (typeof crossOriginIsolated
=== "undefined" || crossOriginIsolated)`.

### 9.5 Validation of untrusted input

`ValidationLevel = "none" | "structure" | "full"`:

| Level | Checks | Cost |
| --- | --- | --- |
| `none` | manifest shape only (TypeScript-level) | O(1) |
| `structure` | every `WireBufferRef`: `byteOffset % elementSize(dtype) === 0`, `byteLength === length * elementSize`, `byteOffset + byteLength <= buffers[i].byteLength`, no byte overlap between a `mutable` column and any core or immutable segment, `components` in `1..16` (`E_BAD_SERIALIZATION` with `details.ref`); I1-I3, I5 (lengths and ranges), I6/I7 counts, I8 length, I10, I12 lengths (column lengths, dictionary code ranges, list and string offsets monotonic, validity length, `nullCount` recomputed from the bitmap), I13 (edge columns have `edgeCount` rows); `ids.size === counts.nodes`; unique column names per table; `core.arcToEdge === null` only when `directed && flags.arcToEdgeIsIdentity`; every `refersTo` value (including extension `element` columns) `< rowCount` or `INVALID_INDEX`; the manifest parsed with a reviver that rejects `__proto__`, `constructor` and `prototype` keys and copies `extra` / `origin` / `options` into frozen `Object.create(null)` objects | O(n + m + columns) |
| `full` | `structure` plus I4 (sortedness), I5 orientation, I7 pairing walk, I8 NaN-free, I9 (flags recomputed), I11 (id bijection, string ids decoded with a fatal decoder), `unique` columns | O(m log d) |

A corrupt `colIdx` from a file or the network would otherwise cause silent
`undefined` reads on the CPU and clamped reads on the GPU, so `fromBytes`
and `fromCsr` default to `"full"`. Any failure throws `GraphFormatError`
with `code: "E_INVALID_SNAPSHOT"` and `details.invariant` naming the
number and location (or `E_BAD_SERIALIZATION` for a malformed manifest or
buffer reference).

---

## 10. GPU contract

This section is what `@graphty/webgpu-graph-algorithms` (and any other GPU
consumer) may rely on. The format never touches WebGPU; it guarantees
array shapes. The GPU package is an optional accelerator injected by the
caller; it never falls back to CPU.

### 10.1 Fields the GPU package binds

| Array | WGSL type | Length | Present |
| --- | --- | --- | --- |
| `rowPtr` | `array<u32>` | n + 1 | always |
| `colIdx` | `array<u32>` | arcCount | always (length 0 when `arcCount === 0`: do not bind, dispatch nothing) |
| `weights` | `array<f32>` | arcCount | when `flags.weighted` (else the kernel uses a `1.0` constant) |
| `arcToEdge` | `array<u32>` | arcCount | needed by any kernel that gathers an edge-aligned column (`col[arcToEdge[a]]`). Test `flags.arcToEdgeIsIdentity` BEFORE touching `snapshot.arcToEdge` (the getter would allocate 4A bytes outside the arena). Recommended pattern, so one pipeline layout serves both cases: the shader declares `override USE_PERM: bool` and reads `select(a, arcToEdge[a], USE_PERM)`; in the identity case the `arcToEdge` binding slot is filled with `colIdx` (already uploaded, length `arcCount`, never read), so no allocation and no second bind-group layout |
| `edgeToArc` | `array<u32>` | edgeCount | for writing per-edge results from per-arc buffers; same `override` pattern when identity (bind `rowPtr` as the never-read dummy) |
| `reverse().rowPtr / colIdx / fwdArc / weights` | `array<u32>` / `array<f32>` | n + 1 / arcCount | pull kernels (PageRank, HITS, bottom-up BFS); undirected: the SAME array objects as the forward ones, so a cache keyed on the array object uploads once |
| `coo().src` | `array<u32>` | arcCount | PER-ARC edge-parallel kernels (every arc, both directions of an undirected edge) |
| `edgeList().src / .dst / .weights` | `array<u32>` / `array<f32>` | edgeCount | EACH-EDGE-ONCE edge-parallel kernels: CC hook, Boruvka / Kruskal candidate lists, Bellman-Ford relax on undirected graphs (each edge relaxed in both directions by the kernel), edge sampling; correct on directed and undirected snapshots with no special case |
| `outDegree()`, `inDegree()`, `selfLoopsPerNode()` | `array<u32>` | n | optional; kernels may compute from `rowPtr` |
| weighted out-degree normaliser (PageRank / HITS / Katz with weights) | `array<f32>` | n | NOT a format upload: `weightedOutDegree()` is `F64` for CPU precision (section 7.2), so the GPU package computes the per-node weight sum on the device with a segmented reduce over `rowPtr` / `weights` (one O(m) kernel, as cuGraph does), and guards the division because the sum may be `0` for a node with out-arcs (zero weights are legal) |
| `degreeOrder(opts).perm` | `array<u32>` | n | load-balancing permutation; `{ of: "reverse" }` for pull kernels (tiers by in-degree) |
| `degreeOrder(opts).segmentOffsets` | -- (CPU) | 5 | read on the CPU to size the three dispatches (`hi = [0, hiEnd)`, `mid = [hiEnd, midEnd)`, `low = [midEnd, lowEnd)`); a 20-byte `array<u32, 5>` is not a legal uniform layout (uniform array stride must be a multiple of 16), so tier bounds that a kernel needs are passed as ordinary uniform scalars |
| `mate()` | `array<u32>` | arcCount | residual/flow kernels (undirected only) |
| node/edge columns with eligibility `direct` or `packed` | `array<u32|i32|f32>` | rows * components (`u8`: `ceil(rows * components / 4)` words; `bool`: `ceil(rows / 32)` words) | via `table.gpuView(name)` |

GPU entry points take `GraphSnapshot` (not `AdjacencyView`) so they can
read `flags` and `arena`. Field names are final (C21): the WebGPU package
renames `numVertices -> nodeCount`, `numEdges -> arcCount`, `edgeWeights
-> weights`, and its `parents: Int32Array` becomes `Uint32Array` with
`INVALID_INDEX` (C10).

### 10.2 Alignment and padding rules the format guarantees

- Every array above has 4-byte elements over a plain `ArrayBuffer`, so
  `byteLength % 4 === 0` and `byteOffset % 4 === 0` hold by construction
  (I10) and `queue.writeBuffer(buf, 0, array)` / `mappedRange.set(array)`
  need no padding logic and no cast (`Uint32Array<ArrayBuffer>` is a
  `BufferSource`, section 12.1).
- `u8` columns are allocated (or adopted, section 5.7) over a store from
  which `column.paddedU32View()` returns the zero-copy `Uint32Array` of
  `ceil(byteLength / 4)` words for `writeBuffer`; kernels read
  `unpack4xU8(w[i >> 2u])[i & 3u]` and bound-check `i < rows *
  components` because the trailing lanes of the last word are undefined.
- `bool` columns, validity bitmaps and masks are `Uint32Array` words
  already (one bitmap layout); kernels read `(w[r >> 5u] >> (r & 31u)) &
  1u`.
- Multi-component columns are flat interleaved `array<f32>`; a
  `components: 3` column must never be declared as `array<vec3<f32>>`
  (stride 16 != 12); `components: 4` may be read as `array<vec4<f32>>`.
- `f64` columns are converted by `gpuView()` into a cached `Float32Array`;
  this is the one documented non-memcpy conversion, it is explicit, it
  never applies to the core, and it is invalidated by `markDirty()` or
  replacement of the column.

### 10.3 Arena versus per-array buffers (C12, Q39)

Every snapshot produced by `freeze()` (default `arena: true`), adopted
by `fromBytes`, or decoded by `fromWire` from a manifest that carries an
`arena` descriptor has `arena !== null`:

```typescript
export type CoreArrayName = "rowPtr" | "colIdx" | "weights" | "arcToEdge" | "edgeToArc";
export interface ArenaSegment { readonly byteOffset: number; readonly byteLength: number; }
export interface ArenaLayout {
    readonly buffer: ArrayBuffer;
    readonly byteOffset: number;               // start of the arena inside buffer (0 for builder output; bytes.byteOffset + B for a container)
    readonly byteLength: number;
    readonly alignment: 256;
    readonly segments: Readonly<Record<CoreArrayName, ArenaSegment | null>>;   // absolute offsets in buffer; null = absent, zero-length, or identity (never in the arena)
    readonly hotByteLength: number;            // end of the weights segment (or colIdx when unweighted) relative to byteOffset: the prefix a traversal kernel needs
}
```

Segments start at multiples of 256 bytes relative to `byteOffset`
(`minStorageBufferOffsetAlignment` on every adapter surveyed and the spec
default) and are ordered HOT TO COLD: `rowPtr`, `colIdx`, `weights`,
`arcToEdge`, `edgeToArc`. Every traversal kernel binds the first three;
`arcToEdge` is needed only to gather edge columns; `edgeToArc` only to
write per-edge results back. So `writeBuffer` of the first
`hotByteLength` bytes is one contiguous call that skips the 4A + 4E cold
bytes, and `edgeToArc` is uploaded only by the result-writeback path. A
zero-length array (`weights === null`, `arcCount === 0`) has a `null`
segment and occupies nothing. Layout math for the benchmark graph
(undirected, weighted, n = 100,000, arcCount = 2,000,000, edgeCount =
1,000,000):

```
segment    byteLength  offset      end         padding to next 256
rowPtr     400,004     0           400,004     124   -> 400,128
colIdx     8,000,000   400,128     8,400,128   0
weights    8,000,000   8,400,128   16,400,128  0          <- hotByteLength = 16,400,128
arcToEdge  8,000,000   16,400,128  24,400,128  0
edgeToArc  4,000,000   24,400,128  28,400,128  0
total      28,400,128 bytes (27.08 MiB), 124 bytes of padding
```

Directed weighted with materialised permutations: `rowPtr` 0..400,128,
`colIdx` 4,000,000 at 400,128, `weights` at 4,400,128, `arcToEdge` at
8,400,128, `edgeToArc` at 12,400,128; total 16,400,128 (hot prefix
8,400,128). Directed weighted with identity permutations: `rowPtr`,
`colIdx` at 400,128, `weights` at 4,400,128; total 8,400,128. Identity
permutations are never in the arena; when a getter materialises one it is
a separate 4-byte-aligned buffer with a `null` segment (I10).

The GPU package chooses per device: (1) whole-arena path when
`arena.byteLength <= device.limits.maxBufferSize` (256 MiB default; 4 GiB
on the reference 4070 SUPER when requested) AND every non-null
`segment.byteLength <= device.limits.maxStorageBufferBindingSize` (128
MiB default, half of `maxBufferSize`; an arena of 200 MiB with a 140 MiB
`colIdx` fits the buffer and still fails `createBindGroup`): one
`createBuffer` + one `writeBuffer(gbuf, 0, new Uint8Array(arena.buffer,
arena.byteOffset, arena.hotByteLength))` (or the full `byteLength`), bind
each segment as `{ buffer: gbuf, offset: seg.byteOffset -
arena.byteOffset, size: seg.byteLength }`; (2) otherwise per-array
buffers (`writeBuffer(bufX, 0, snapshot.colIdx)`), the same views the CPU
reads, which is also the path for `arena === null` (adopted arrays); (3)
windowed bindings (10.6) when a single array exceeds the binding size on
its own. Views and attribute columns are never in the core arena (they
are added and dropped independently); each is its own buffer and uploads
the same way. `arena: false` at freeze is for cores above the engine's
per-allocation ceiling (section 15.3).

### 10.4 GPU-eligible columns

```typescript
export type GpuEligibility = "direct" | "packed" | "convert" | "none";
export function gpuEligibility(dtype: Dtype): GpuEligibility;
```

| Column dtype | Eligibility | `gpuView()` returns |
| --- | --- | --- |
| `u32`, `i32`, `f32` (any components) | `direct` | the column's own data array |
| `u8` | `packed` | `paddedU32View()` (4 values per word, `unpack4xU8`) |
| `bool` | `packed` | the column's own `data` words (32 values per word, bit test) |
| `dict` | `direct` (codes) | the `Uint32Array` codes; the dictionary stays on the CPU |
| `f64` | `convert` | cached `Float32Array` copy (lossy; the column keeps f64) |
| `string`, `list`, `json` | `none` | throws `E_GPU_INELIGIBLE` |

`column.gpu` is derived from the dtype and exposed for convenience.
Declared defaults are already in `data` for the numeric / bool / dict
dtypes (section 5.3), so a kernel that must honour defaults binds
`gpuView()` with no extra copy. Results flow back as columns:
`snapshot.nodes.set("graphty.cc.component", labels)` attaches a
`Uint32Array` readback by reference, unconditionally, whatever its length
(section 5.7).

### 10.5 Invariants the WebGPU package may assume without checking

I1-I10 and the flag semantics of section 3.8. Specifically:
`INVALID_INDEX` (`0xFFFFFFFFu` in WGSL) never appears in `rowPtr`,
`colIdx`, `arcToEdge`, `edgeToArc`, `coo().src`, `mate()` or
`degreeOrder().perm` and is free as a sentinel in every `array<u32>`
because counts are bounded by `0xFFFFFFFE`; rows are sorted (dedupe by
adjacent compare, intersection by merge, `hasArc` by binary search are
valid); `flags.multigraph === false` implies no two arcs in a row share
`colIdx`; undirected implies doubled storage with matching `arcToEdge` and
equal weights, so gather kernels never need atomics and `reverse()` is
the forward buffers; a self-loop is one arc; `flags.allWeightsOne` lets
SSSP degrade to BFS; `flags.nonNegativeWeights` makes Dijkstra /
delta-stepping legal; `!flags.finiteWeights` means some weight is
+/-Infinity; a per-arc result written to `out[arcToEdge[a]]` lands once
per edge (both arcs hold equal values, or write from `edgeToArc` only);
attribute columns are index-aligned. Two things the GPU package must
handle itself: `colIdx`, `arcToEdge` and `weights` have length 0 when
`arcCount === 0`, `edgeToArc` has length 0 when `edgeCount === 0`, and a
nullable column of an empty table has an empty validity array -- a
zero-length array must not be bound (Dawn rejects a zero-size binding),
so the package dispatches nothing for empty ranges; and a node with
out-arcs may have a weighted out-degree of `0` (zero weights are legal),
so `outDegree > 0` is not the dangling test for weighted PageRank and the
division by the weight sum is guarded.

### 10.6 Chunking above binding limits

Owned by the GPU package; what the format provides: `byteLength()` and
`arena.byteLength` for planning; plain typed arrays over `ArrayBuffer`,
so `rowPtr.subarray(v0, v1 + 1)` and `colIdx.subarray(rowPtr[v0],
rowPtr[v1])` are zero-copy windows satisfying I10 (`subarray` keeps the
`ArrayBuffer` type parameter, so the window uploads without a cast); and
the counts for the dispatch decision. The 1D dispatch rule the GPU
package implements: a 1D dispatch is legal iff `ceil(count /
workgroupSize) <= device.limits.maxComputeWorkgroupsPerDimension` (65,535
at the core default), i.e. at most 65,535 x 256 = 16,776,960 invocations
for a workgroup size of 256 (NOT 2^24 = 16,777,216; a planner that uses
the round number silently skips the last 256 items for any count in
`(16,776,960, 16,777,216]`); above that use a 2D grid or a grid-stride
loop. A storage window into `colIdx` must start at a 256-byte boundary,
i.e. an arc index that is a multiple of 64: for a row range `[v0, v1)` the
GPU package binds `colIdx.subarray(start, rowPtr[v1])` with `start =
rowPtr[v0] - (rowPtr[v0] % 64)` and passes `start` in a uniform as the
rebase constant. The formula is written with `%`, not `& ~63`: JS bitwise
operators coerce to `Int32`, so `(0x80000040 & ~63)` is negative and
`subarray` would count from the end (I3 allows arc indices up to
`0xFFFFFFFE`). A single row longer than `maxStorageBufferBindingSize / 4`
arcs (33,554,432 at defaults) cannot be windowed by row range, so the
planner works on ARC ranges and splits such a row across windows, with
the row's kernel iteration clamped to the window. `degreeOrder(
).segmentOffsets` gives the high / mid / low / zero degree segments for
workgroup / subgroup / thread-per-node scheduling without physical
renumbering. No field of the format changes for chunking.

### 10.7 Result readback conventions

- Per-node results: `Uint32Array(n)` (labels, parents, levels;
  `INVALID_INDEX` = none / root / unreached) or `Float32Array(n)` (scores,
  distances). Per-arc results: `Float32Array(arcCount)` or
  `Uint32Array(arcCount)`; fold to logical edges with `foldArcs(snapshot,
  vec, reducer)`: `"first"` when both arcs of an undirected edge hold the
  same value (edge betweenness, edge-level flags), `"sum"` / `"max"` /
  `"min"` only when the per-arc quantity is defined as a per-direction
  contribution (per-direction traffic counts). Flow is NOT a `foldArcs`
  case: the residual graph is a DIRECTED builder with twin edges (section
  14.2), so its per-edge flow is already per logical edge. Per-edge inputs
  expand with `expandEdges`.
- The GPU package copies out of `getMappedRange()` before `unmap()` (the
  mapped buffer is detached at unmap) into a fresh typed array or a
  caller-supplied destination; preallocated destinations are accepted by
  every GPU algorithm to avoid churn.
- Results become columns by reference (`nodes.set(name, vec)`); mapping
  to ids happens only at the API boundary through `ids.toMap` /
  `ids.entries` / `ids.toRecord`. Nothing keyed by id leaves the GPU
  package. CPU results are `Float64Array`, GPU results `Float32Array`; the
  helpers accept both (C11).

### 10.8 What stays out of the format

Device and limit queries, buffer creation, chunk planning, 2D dispatch
math, kernel selection by flags, frontier queues, scans, dense relabelling
of component ids, and any "GPU unavailable" behaviour (the project rule:
the GPU package never falls back; the caller injects it or not).

---

## 11. Error handling and validation conventions

### 11.1 Policy

- The BUILDER and the constructors (`fromEdgeArrays`, `fromCsr`,
  `fromRecords`, `fromWire`, `fromBytes`) THROW on malformed input, on the
  first error, with a `GraphFormatError` carrying a stable `code`. The
  builder is left in a consistent state after every throw (the failing
  operation is not partially applied).
- SNAPSHOT methods that take an INDEX are TOTAL for in-range arguments and
  UNCHECKED for out-of-range ones (typed-array semantics: reading
  `rowPtr[n + 5]` yields `undefined`; hot loops must not pay bounds
  checks). Methods that take an ID (`indexOf`, `requireIndex`,
  `edgeIndexOf`) are checked and return `INVALID_INDEX` or throw as
  documented. The few index-taking boundary calls that are checked because
  a silent wrong answer would be worse: `ids.idOf(i)` (`E_INDEX_RANGE`),
  `table.value(name, row)` (`E_INDEX_RANGE`), `mate()` on a directed
  snapshot (`E_DIRECTED`), any accessor after a consuming transfer
  (`E_DETACHED`).
- `validate()` is the only exhaustive check and is opt-in on trusted paths
  (builder output); it is the default on untrusted paths (bytes, adopted
  arrays).
- No `Result` / `Either` types; no `console.log`; `console.warn` only from
  the io package's importer defaults, never from the core. Only
  `GraphFormatError` instances are thrown (ESLint `only-throw-error`).
  Messages are plain ASCII and include the offending index, id or value
  when it is a number or a short string.
- Importers aggregate (section 8.6); the core does not.

### 11.2 Error class and codes

```typescript
export type GraphFormatErrorCode =
    | "E_INVALID_ID"          // NaN, non-finite number, bigint, object, null, undefined as an id
    | "E_UNKNOWN_NODE"        // addEdge with addMissingNodes: false; requireIndex miss
    | "E_INDEX_RANGE"         // idOf / value out of range
    | "E_TOO_LARGE"           // nodeCount / edgeCount / arcCount would exceed MAX_COUNT
    | "E_INVALID_WEIGHT"      // NaN weight
    | "E_DIRECTED"            // mate() on a directed snapshot; setDirected() refused (locked, or directed -> undirected with edges)
    | "E_SELF_LOOP"           // selfLoops: "error"
    | "E_DUPLICATE_EDGE"      // duplicateEdges: "error"
    | "E_DUPLICATE_EDGE_ID"   // unique role "id" edge column violated
    | "E_DUPLICATE_ID"        // unique node column violated; addGraph onDuplicateNode: "error"
    | "E_DUPLICATE_ROLE"      // two columns with the same role in one table
    | "E_UNKNOWN_COLUMN" | "E_COLUMN_TYPE" | "E_COLUMN_LENGTH" | "E_COLUMN_ALIGNMENT" | "E_COLUMN_EXISTS" | "E_COLUMN_IMMUTABLE"
    | "E_NO_DEFAULT"          // materializeDefault() on a column without a declared default
    | "E_PARTITION"           // contract() partition has the wrong length or an INVALID_INDEX label
    | "E_INVALID_PERMUTATION" // relabel() with a perm that is not a permutation of 0..n-1
    | "E_MASK_LENGTH"         // filterEdges() / inducedSubgraph({ mask }) with a short mask
    | "E_GPU_INELIGIBLE"      // gpuView on string / list / json
    | "E_INVALID_SNAPSHOT"    // validate() failure; details.invariant = "I4", details.row = 17; details.reason = "no-checksum"
    | "E_BAD_SERIALIZATION"   // magic / endianness / manifest / segment errors; details.ref names a bad WireBufferRef
    | "E_UNSUPPORTED_VERSION" // wire major or formatVersion the reader does not know; details.kind = "wire" | "format"
    | "E_DETACHED"            // access after a consuming transfer
    | "E_BUILDER_DISPOSED"
    | "E_UNSUPPORTED"         // big-endian host; unknown wire dtype / id-map kind (details.reason, details.dtype, details.kind)
    | "E_IMPORT";             // reserved for @graphty/graph-io's ImportError (importer aborted; error.report holds the partial ImportReport)

export declare class GraphFormatError extends Error {
    readonly code: GraphFormatErrorCode;
    readonly details: Readonly<Record<string, unknown>>;   // { index, id, edge, invariant, row, found, supported, ... }
    constructor(code: GraphFormatErrorCode, message: string, details?: Readonly<Record<string, unknown>>);
}
```

`ImportError extends GraphFormatError` (with `readonly report:
ImportReport`) is declared in `@graphty/graph-io` (section 8.2).

### 11.3 Situations and behaviour

| Situation | Behaviour |
| --- | --- |
| id `NaN`, `Infinity`, `bigint`, object, `null`, `undefined` | `E_INVALID_ID` |
| id `-0` | stored as `0` (SameValueZero) |
| id `"1"` and `1` | two distinct nodes |
| `addEdge` to an unknown id | node created (default) or `E_UNKNOWN_NODE` |
| `addEdgeByIndex` with a dead or out-of-range index | `E_UNKNOWN_NODE` with `details.index` |
| weight `NaN` | `E_INVALID_WEIGHT` at `addEdge` / `setEdgeWeight` / `addEdges` |
| weight `+/-Infinity`, negative, `0` | accepted; flags reflect it |
| weight omitted in a weighted graph | `1` |
| `addEdge(u, u)` | kept (default), dropped, or `E_SELF_LOOP` at freeze |
| duplicate with `duplicateEdges: "error"` | `E_DUPLICATE_EDGE` at freeze, `details: { source, target, edges: [e1, e2] }` |
| the `0xFFFFFFFF`-th node, edge or arc | `E_TOO_LARGE` at the `add*` call that crosses the limit |
| `freeze()` of an empty builder | valid: `nodeCount 0`, `rowPtr = Uint32Array [0]`, `colIdx` / `arcToEdge` / `edgeToArc` of length 0, `weights === null`; layouts detect "edgeless" by `edgeCount === 0`; the GPU package binds nothing of length 0 (section 10.5) |
| `setDirected(x)` on an empty unlocked builder | takes effect; `setDirected(true, { expand: true })` on a non-empty undirected builder expands (section 6.6) |
| `setDirected()` after `lockDirected()`, or `setDirected(false)` with edges present | `E_DIRECTED` |
| a file's direction disagrees with a locked or non-empty sink | importer expands into a directed sink, or reports and applies `onMixedDirection` / aborts with `E_IMPORT` for an undirected sink (section 8.4) |
| column `set` with wrong length | `E_COLUMN_LENGTH` |
| column `set` of a `u8` array from which no zero-copy `Uint32Array` view is constructible (`byteOffset % 4 !== 0` or the buffer ends before the padded length) with `adopt: "strict"` | `E_COLUMN_ALIGNMENT` (otherwise copied, section 5.7); 4-byte and `f64` arrays are always adopted by reference |
| column `set` on an existing name | replaces the column (role rules apply) |
| `typed(name, dtype)` mismatch, `get` / `byRole` miss | `null` (total); `require` throws `E_UNKNOWN_COLUMN`, `requireTyped` throws `E_COLUMN_TYPE` |
| `declareNodeColumn` twice with a different dtype / components | `E_COLUMN_EXISTS` (same declaration returns the existing handle) |
| `nodeColumn(name)` / `edgeColumn(name)` miss | `INVALID_INDEX` (a `ColumnHandle`) |
| `mutableData()` / `markDirty()` / `mutableValidity()` / `setAll()` on an immutable column | `E_COLUMN_IMMUTABLE` |
| `materializeDefault()` without a declared default | `E_NO_DEFAULT` |
| a `default`, `fill`, `options` entry or `extra` value that is not a JSON value (after the tagged-number rule of section 5.9) | `E_COLUMN_TYPE` with `details.field` |
| a string id or string value containing a lone surrogate | `E_INVALID_ID` / `E_COLUMN_TYPE` (`details.reason: "lone surrogate"`) |
| `mate()` on a directed snapshot | `E_DIRECTED` |
| `contract()` with `partition.length !== nodeCount` or an `INVALID_INDEX` label | `E_PARTITION` (non-dense labels are legal and renumbered, section 7.3) |
| `relabel()` with a non-permutation | `E_INVALID_PERMUTATION` |
| `filterEdges()` / `inducedSubgraph({ mask })` with a short mask | `E_MASK_LENGTH` |
| `inducedSubgraph(list)` with an out-of-range or repeated index | `E_INDEX_RANGE` |
| any core accessor after `toWire({ transfer: true })`, or on any snapshot whose core buffer was transferred by someone else | `E_DETACHED` (`detached` is derived from the array state, section 9.1) |
| `validate({ checksum: true })` on a snapshot frozen without `checksum: true` | `E_INVALID_SNAPSHOT`, `details.reason: "no-checksum"` |
| `toBytes()` / `toWire()` on a big-endian host | `E_UNSUPPORTED`, `details.reason: "big-endian host"` |
| `fromWire` / `fromBytes` with an unknown `formatVersion` or wire major | `E_UNSUPPORTED_VERSION` (`details.kind`, `details.found`, `details.supported`) |
| `fromWire` / `fromBytes` with an unknown column dtype or id-map kind | `E_UNSUPPORTED` (dtype: unless `unknownColumns: "skip"`) |
| `fromBytes` of a `SharedArrayBuffer` or a buffer at `byteOffset % 8 !== 0` | copied, never adopted (section 9.2) |

### 11.4 validate()

```typescript
export declare class GraphSnapshot {
    validate(options?: ValidateOptions): void;   // { level?: "structure" | "full"; checksum?: boolean }
}
```

Throws `E_INVALID_SNAPSHOT` on the first violated invariant with
`details.invariant` (the number from section 3.2) and the location (`row`,
`arc`, `edge`, `column`). Levels are defined in section 9.5. `checksum:
true` compares the FNV-1a hashes of the core arrays, immutable columns and
materialised views recorded by `freeze({ checksum: true })` against the
current bytes, catching contract violations where a consumer mutated a
frozen array or a shared view (debug builds and tests only, O(bytes));
on a snapshot without recorded checksums it throws `E_INVALID_SNAPSHOT`
with `details.reason: "no-checksum"` rather than silently passing. Defaults: builder output `"none"` (trusted by construction;
tests call `validate({ level: "full" })` after every freeze); `fromCsr`
and `fromBytes` `"full"`; `fromWire` `"structure"`.

---

## 12. TypeScript surface

### 12.1 Strictness and typing decisions (G9)

- Public arrays are typed as the concrete typed-array classes with the
  buffer type parameter fixed to `ArrayBuffer`: `U32 = Uint32Array<
  ArrayBuffer>`, `I32`, `F32`, `F64`, `U8` (section 12.2). Verified with
  tsc 5.9.3 and `@webgpu/types` 0.1.68 (the monorepo's versions):
  `GPUQueue.writeBuffer` takes `BufferSource | SharedArrayBuffer` where
  `BufferSource = ArrayBufferView<ArrayBuffer> | ArrayBuffer`, so a plain
  `Uint32Array` (which is `Uint32Array<ArrayBufferLike>`) is a TYPE ERROR
  while `Uint32Array<ArrayBuffer>` passes -- the discriminator is the
  buffer parameter, not `Readonly`. `subarray()`, `slice()`, `fill()` and
  `new Uint32Array(n)` all preserve or produce the `ArrayBuffer`
  parameter (TS 5.7+), so windows (section 10.6), readbacks and fresh
  result vectors upload without casts. A `Uint32Array<SharedArrayBuffer>`
  never passes, which is one of the reasons `SharedArrayBuffer` is out of
  v1 (D-SAB, section 9.4). Consumers annotate arrays they hand back to the
  format (`set()`, `remapArray`, `addEdges`) with the aliases (`F32`,
  `U32`), never with the bare class names, whose default parameter is
  `ArrayBufferLike` and is rejected; a fresh `new Float32Array(n)` needs
  no annotation. No `Readonly<...>` aliases are exported: a
  `Readonly<Uint32Array>` enforces nothing (it is assignable to
  `Uint32Array`, every mutator stays callable, `subarray()` returns a
  mutable view), so exporting one would imply a guarantee the type system
  does not give. Immutability is by contract (I17), enforced at runtime by
  `Object.freeze` on the snapshot object, by `mutableData()` gating, and
  by `validate({ checksum: true })`.
- Branded INDEX types are not used (typed-array reads produce `number`;
  brands would need a cast on every `colIdx[a]`). `NodeIndex`, `EdgeIndex`
  and `ArcIndex` are plain `number` aliases for documentation. Builder
  HANDLES are branded (`ColumnHandle`, `ExtensionHandle`): they never come
  out of a typed array, and the brand stops `setNodeValue(index, handle,
  v)` with the arguments swapped from type-checking.
- Absent OUTPUT data is `T | null`, never `undefined` and never an
  optional property, on every public surface including method returns
  (`get()`, `typed()`, `byRole()`, `weights`, `arena`, remaps) and the
  wire types (`WireColumn.dictionary: ... | null`), so the interfaces read
  identically under `exactOptionalPropertyTypes: true` and `false` and
  consumers never write `weights?.length`. The two exceptions are
  deliberate and named: lookups by ID or by name that must be total and
  sentinel-compatible return `INVALID_INDEX` (`indexOf`, `findArc`,
  `edgeIndexOf`, `nodeColumn`, `edgeColumn`, `codeOf`), and `value(row)`
  returns `undefined` for an UNSET ROW because `null` is a legal `json`
  value.
- Options and declaration objects (`GraphBuilderOptions`, `FreezeOptions`,
  `ColumnDecl`, `*Input`) use `?:` for optional INPUT fields, and every
  optional input field also accepts an explicit `undefined` (`prop?: T |
  undefined`) so a consumer compiled with `exactOptionalPropertyTypes` can
  spread partial objects. TypeScript's `Partial<T>` adds `?` but not `|
  undefined`, so the surface never uses it: patch shapes are `Loose<T> =
  { [K in keyof T]?: T[K] | undefined }` (`ColumnDeclPatch`,
  `GraphMetaPatch`, `BuilderOptionsPatch`, `FlagClaims`,
  `ColumnOriginInput`). Resolved option objects are declared explicitly
  (`ResolvedBuilderOptions`) rather than as `Required<...>`, whose shape
  changes with the consumer's flags.
- `noUncheckedIndexedAccess` is OFF in every package that consumes the
  format: the core (Q19), algorithms, layout, graphty-element and -- on
  move-in, W1 -- the WebGPU package, which switches it off to match. The
  reason is that no row-loop idiom is legal under both settings: with the
  flag on, `rowPtr[u]` is `number | undefined` and needs `as number`,
  which is an ESLint error (`no-unnecessary-type-assertion`,
  `strictTypeChecked`) with the flag off; shared hot-loop code (the
  result-writing loop graphty-element uses for `indexed.*` and the GPU
  accelerator alike, the `AdjacencyView` ports) can only be written once
  if every consumer agrees. The package's public `.d.ts` is still
  compiled in CI under BOTH `noUncheckedIndexedAccess: true` and
  `exactOptionalPropertyTypes: true` (the strict-consumer compile of
  section 16.6, whose sample code uses only flag-neutral idioms) so that
  an external consumer with either flag can use it. No public method
  returns `undefined` for an in-range index.
- Enums are string-literal unions; no `enum`, no `namespace`, no
  static-only classes (factories are functions), named exports only,
  `.js` suffixes on relative imports. `GraphSnapshot`, `GraphBuilder`,
  `NodeIdMap`, `AttributeTable` and the error class are classes so the
  JSDoc-on-method lint rules apply; everything else is an interface or a
  type alias. `ColumnRole = KnownColumnRole | (string & {})` is the
  deliberate lint-clean spelling of "these literals plus any string":
  `no-empty-object-type` exempts a `{}` inside an intersection and
  `no-redundant-type-constituents` treats the intersection as
  non-primitive, so the literals survive for autocomplete; a bare `{}`
  would be rejected.
- The core's public types reference only ES2020 globals: the io contract
  types that need `ReadableStream` and `AbortSignal` live in
  `@graphty/graph-io` (section 8.2, 12.4), so a consumer compiling with
  `lib: ["ES2020"]` and no DOM lib type-checks against the core.

### 12.2 Complete public type definitions

This listing is the shape of `dist/graph-format.d.ts`: everything below
is exported from `src/index.ts` (including `ColumnBase`) and nothing else
is. It is written in ambient (`declare`) form; where an earlier section
shows an excerpt, this listing is normative.

```typescript
// ============================================================ scalars, sentinels, typed-array aliases
export type NodeId = string | number;
export type EdgeId = string | number;
export type NodeIndex = number;
export type EdgeIndex = number;
export type ArcIndex = number;
export const INVALID_INDEX = 0xffffffff;
export const MAX_COUNT = 0xfffffffe;
export const FORMAT_VERSION = 1;
export const SNAPSHOT_BRAND: unique symbol;   // Symbol.for("@graphty/graph-format/snapshot")

export type U32 = Uint32Array<ArrayBuffer>;
export type I32 = Int32Array<ArrayBuffer>;
export type F32 = Float32Array<ArrayBuffer>;
export type F64 = Float64Array<ArrayBuffer>;
export type U8 = Uint8Array<ArrayBuffer>;
export type TypedArrayData = U32 | I32 | F32 | F64 | U8;
export type NumericVector = F32 | F64 | U32 | I32;
/** Patch shape: every field optional AND accepting an explicit undefined (section 12.1). */
export type Loose<T> = { [K in keyof T]?: T[K] | undefined };

export type ValidationLevel = "none" | "structure" | "full";
export type DuplicatePolicy = "keep" | "error" | "first" | "last" | "sum" | "min" | "max";
export type WeightReducer = "first" | "last" | "sum" | "min" | "max";
export type ColumnReducer = WeightReducer | "mean" | "count" | "drop";
export type IdCoercion = "keep" | "canonical" | "string" | "number";

// ============================================================ columns
export type Dtype = "f32" | "f64" | "i32" | "u32" | "u8" | "bool" | "dict" | "string" | "list" | "json";
export type ScalarDtype = Exclude<Dtype, "list">;
export type ColumnDomain = "node" | "edge" | "graph" | "extension";
export type GpuEligibility = "direct" | "packed" | "convert" | "none";
export type KnownColumnRole =
    | "id" | "label" | "weight" | "capacity" | "position" | "color" | "size" | "shape" | "thickness"
    | "parent" | "parents" | "kind" | "labels" | "classes" | "start" | "end" | "timestamp" | "timestamps" | "spells" | "open" | "timeText"
    | "key" | "directed" | "pair" | "mutual" | "originalId" | "sourcePort" | "targetPort" | "idSpace"
    | "fixed" | "mass" | "subset" | "hidden" | "component" | "community" | "rank";
export type ColumnRole = KnownColumnRole | (string & {});   // known roles plus open extension; the intersection form is deliberate (section 12.1)

export interface ColumnOrigin {
    readonly format: string | null;        // "gexf" | "graphml" | "gml" | "csv" | ...
    readonly id: string | null;            // GEXF attribute id, GraphML key id
    readonly title: string | null;         // GEXF title / GraphML attr.name when different from name
    readonly type: string | null;          // declared type text: "liststring", "anyURI", "long", "date", "int", "real", "yfiles"
    readonly namespace: string | null;     // "viz", "yfiles", "neo4j"
}
export type ColumnOriginInput = Loose<ColumnOrigin>;

/** Input shape for declaring a column. */
export interface ColumnDecl {
    name: string;
    dtype: Dtype;
    components?: number | undefined;                       // default 1
    itemDtype?: ScalarDtype | undefined;                   // list only
    itemComponents?: number | undefined;                   // list only; the child's components (spells: 2)
    nullable?: boolean | undefined;                        // default true for declared columns, false for typed bulk sets
    mutable?: boolean | undefined;                         // default false
    role?: ColumnRole | undefined;
    refersTo?: "node" | "edge" | undefined;
    unique?: boolean | undefined;
    default?: unknown;                                     // JSON value (non-finite numbers allowed, section 5.9)
    fill?: number | string | boolean | undefined;          // default: the declared default when representable, else 0 / "" / false
    options?: readonly unknown[] | undefined;              // for dict: the initial dictionary (GEXF <options>)
    origin?: ColumnOriginInput | undefined;
    dynamic?: boolean | undefined;
    extra?: Readonly<Record<string, unknown>> | undefined;
}
export type ColumnDeclPatch = Loose<ColumnDecl>;

/** Output shape on every column: every field present, null for none. */
export interface ColumnMeta {
    readonly name: string;
    readonly domain: ColumnDomain;
    readonly dtype: Dtype;
    readonly components: number;
    readonly itemDtype: ScalarDtype | null;
    readonly itemComponents: number | null;
    readonly nullable: boolean;
    readonly mutable: boolean;
    readonly role: ColumnRole | null;
    readonly refersTo: "node" | "edge" | null;
    readonly unique: boolean;
    readonly default: unknown;                             // undefined when none declared
    readonly fill: number | string | boolean;
    readonly options: readonly unknown[] | null;
    readonly origin: ColumnOrigin | null;
    readonly dynamic: boolean;
    readonly extra: Readonly<Record<string, unknown>>;
}

export interface ColumnInput { readonly data: TypedArrayData | readonly unknown[]; readonly decl: ColumnDeclPatch; }
export interface SetOptions { readonly replaceRole?: boolean | undefined; readonly adopt?: "copy" | "strict" | undefined; }

/** What value(row) returns for a set row of each dtype. */
export type DtypeValue<D extends Dtype> =
    D extends "f32" | "f64" | "i32" | "u32" | "u8" ? number | ArrayLike<number>
    : D extends "bool" ? boolean
    : D extends "dict" | "string" ? string
    : D extends "list" ? readonly unknown[]
    : unknown;

export interface ColumnBase<D extends Dtype> {
    readonly dtype: D;
    readonly meta: ColumnMeta;
    readonly length: number;                 // rows
    readonly validity: U32 | null;           // LSB-first words, ceil(length / 32); null = all set
    readonly nullCount: number;
    readonly gpu: GpuEligibility;
    readonly byteLength: number;             // bytes of data (+ validity)
    readonly paddedByteLength: number;       // byteLength, or roundUp(byteLength, 4) for u8 (section 5.7)
    readonly version: number;                // bumped by markDirty()
    isSet(row: number): boolean;
    value(row: number): DtypeValue<D> | undefined;   // typed read honouring meta.default; undefined for an unset row without default; components > 1 returns a subarray view
    materializeDefault(): ColumnOf<D>;       // this column when fill === default; else a cached copy with defaults written into unset rows; E_NO_DEFAULT when none
    paddedU32View(): U32;                    // u8: zero-copy padded view; u32 / bool: the data itself; else E_GPU_INELIGIBLE
    markDirty(): void;                       // mutable columns only (E_COLUMN_IMMUTABLE otherwise)
    mutableValidity(): U32 | null;           // mutable columns only; the bitmap itself
    setAll(): void;                          // mutable columns only; drops the bitmap, nullCount = 0
    slice(start: number, end: number): ColumnOf<D>;   // row range; zero-copy except packed stores at unaligned starts (section 5.7)
    clone(): ColumnOf<D>;
}
export interface F32Column extends ColumnBase<"f32"> { readonly data: F32; mutableData(): F32; }
export interface F64Column extends ColumnBase<"f64"> { readonly data: F64; mutableData(): F64; }
export interface I32Column extends ColumnBase<"i32"> { readonly data: I32; mutableData(): I32; }
export interface U32Column extends ColumnBase<"u32"> { readonly data: U32; mutableData(): U32; }
export interface U8Column extends ColumnBase<"u8"> { readonly data: U8; mutableData(): U8; }
export interface BoolColumn extends ColumnBase<"bool"> { readonly data: U32; mutableData(): U32; }   // bit-packed, ceil(rows / 32) words
export interface DictColumn extends ColumnBase<"dict"> {
    readonly codes: U32;
    readonly dictionary: readonly string[];
    codeOf(value: string): number;                        // INVALID_INDEX when absent; lazy Map
    mutableData(): U32;                                   // codes
}
export interface StringColumn extends ColumnBase<"string"> {
    readonly offsets: U32;                                // rows + 1 (materialised lazily from the decoded cache when needed)
    readonly utf8: U8;
    valueAt(row: number): string;                         // decoded, cached per row
    decodeAll(): string[];                                // one pass; not cached
}
export interface ListColumn extends ColumnBase<"list"> {
    readonly offsets: U32;                                // rows + 1
    readonly child: Exclude<Column, ListColumn>;
    sliceOf(row: number): readonly unknown[];             // narrow through child.dtype
}
export interface JsonColumn extends ColumnBase<"json"> { readonly values: readonly unknown[]; }
export type Column = F32Column | F64Column | I32Column | U32Column | U8Column | BoolColumn | DictColumn | StringColumn | ListColumn | JsonColumn;
export type ColumnOf<D extends Dtype> = Extract<Column, { dtype: D }>;

export declare class AttributeTable {
    readonly domain: ColumnDomain;
    readonly rowCount: number;
    names(): readonly string[];
    has(name: string): boolean;
    get(name: string): Column | null;
    require(name: string): Column;
    typed<D extends Dtype>(name: string, dtype: D): ColumnOf<D> | null;
    requireTyped<D extends Dtype>(name: string, dtype: D): ColumnOf<D>;
    byRole(role: ColumnRole): Column | null;
    value(name: string, row: number): unknown;
    isSet(name: string, row: number): boolean;
    set(name: string, data: Column | TypedArrayData | readonly unknown[], decl?: ColumnDeclPatch, opts?: SetOptions): Column;
    remove(name: string): boolean;
    rename(from: string, to: string): void;
    gpuView(name: string): U32 | I32 | F32;
    clone(): AttributeTable;
    [Symbol.iterator](): IterableIterator<Column>;
}

export interface GraphMeta {
    readonly name: string | null;
    readonly description: string | null;
    readonly creator: string | null;
    readonly created: string | null;
    readonly modified: string | null;
    readonly keywords: readonly string[];
    readonly sourceFormat: string | null;
    readonly sourceVersion: string | null;
    readonly idType: "string" | "integer" | "mixed" | null;
    readonly timeFormat: "integer" | "double" | "date" | "dateTime" | null;
    readonly timeRepresentation: "interval" | "timestamp" | null;
    readonly mode: "static" | "dynamic" | "slice" | null;
    readonly declaredMultigraph: boolean | null;
    readonly weightOrigin: ColumnOrigin | null;
    readonly extra: Readonly<Record<string, unknown>>;
}
export type GraphMetaPatch = Loose<GraphMeta>;

// column helpers
export function gpuEligibility(dtype: Dtype): GpuEligibility;
export function paddedU32View(data: U8): U32;
export function remapColumn(column: Column, remap: U32, newLength: number): Column;                        // gathers data + validity; rewrites refersTo values; INVALID_INDEX in remap drops the row
export function gatherColumn(column: Column, indexMap: U32): Column;                                       // out[i] = column[indexMap[i]]
export function remapArray<T extends TypedArrayData>(data: T, remap: U32, newLength: number, fill: number, components?: number): T;
export function gatherArray<T extends TypedArrayData>(data: T, indexMap: U32, components?: number): T;    // out[i] = data[indexMap[i]]
export function scatterArray<T extends TypedArrayData>(out: T, values: T, indexMap: U32, components?: number): T;   // out[indexMap[i]] = values[i]
export function withComponents(data: F32, from: number, to: number, fill: number): F32;
export function foldArcs<T extends NumericVector>(snapshot: GraphSnapshot, perArc: T, reducer: "first" | "sum" | "max" | "min", out?: T): T;
export function expandEdges<T extends NumericVector>(snapshot: GraphSnapshot, perEdge: T, out?: T): T;
export function renumberPartition(labels: U32, out?: U32): { readonly labels: U32; readonly count: number };   // dense 0..k-1 in first-seen order

// ============================================================ masks (packed bitmaps; helper type, not a snapshot contract)
export type NodeMask = U32;   // ceil(n / 32) words, bit i => node i included; same layout as validity and bool columns
export type EdgeMask = U32;
export function makeMask(length: number, fill?: boolean): U32;
export function maskTest(mask: U32, i: number): boolean;
export function maskSet(mask: U32, i: number, value: boolean): void;
export function maskCount(mask: U32, length: number): number;
export function maskToIndices(mask: U32, length: number): U32;

// ============================================================ id map
export type NodeIdMapKind = "identity" | "dense" | "numeric" | "string" | "mixed";
export interface WireIdMap {
    readonly kind: NodeIdMapKind;
    readonly size: number;
    readonly offset: number;
    readonly values: WireBufferRef | null;    // dense (u32) / numeric (f64)
    readonly tags: WireBufferRef | null;      // mixed
    readonly numbers: WireBufferRef | null;   // mixed
    readonly offsets: WireBufferRef | null;   // string / mixed
    readonly utf8: WireBufferRef | null;      // string / mixed
}
export declare class NodeIdMap implements Iterable<NodeId> {
    readonly kind: NodeIdMapKind;
    readonly size: number;
    readonly offset: number;
    idOf(index: number): NodeId;
    indexOf(id: NodeId): number;
    has(id: NodeId): boolean;
    requireIndex(id: NodeId): number;
    indicesOf(ids: Iterable<NodeId>, onMissing?: "invalid" | "throw"): U32;
    idsSlice(start?: number, end?: number): NodeId[];
    toArray(): NodeId[];
    [Symbol.iterator](): IterableIterator<NodeId>;
    toMap<T>(values: ArrayLike<T>): Map<NodeId, T>;
    toStringMap<T>(values: ArrayLike<T>): Map<string, T>;
    toRecord<T>(values: ArrayLike<T>): Record<string, T>;
    entries<T>(values: ArrayLike<T>): IterableIterator<[NodeId, T]>;
    stringIndex(): ReadonlyMap<string, number>;
    byteLength(): number;
}

// ============================================================ flags, arena, views
export interface SnapshotFlags {
    readonly multigraph: boolean;
    readonly hasSelfLoops: boolean;
    readonly arcToEdgeIsIdentity: boolean;
    readonly weighted: boolean;
    readonly allWeightsOne: boolean;
    readonly nonNegativeWeights: boolean;
    readonly finiteWeights: boolean;
}
export type FlagClaims = Loose<SnapshotFlags>;
export type CoreArrayName = "rowPtr" | "colIdx" | "weights" | "arcToEdge" | "edgeToArc";
export interface ArenaSegment { readonly byteOffset: number; readonly byteLength: number; }
export interface ArenaLayout {
    readonly buffer: ArrayBuffer;
    readonly byteOffset: number;
    readonly byteLength: number;
    readonly alignment: 256;
    readonly segments: Readonly<Record<CoreArrayName, ArenaSegment | null>>;
    readonly hotByteLength: number;
}
export type ViewName =
    | "reverse" | "coo" | "edgeList" | "outDegree" | "inDegree" | "degree" | "weightedOutDegree" | "weightedInDegree" | "weightedDegree"
    | "selfLoopWeight" | "totalWeight" | "selfLoopArcs" | "selfLoopsPerNode" | "mate" | "degreeOrder" | "reverseDegreeOrder" | "symmetric";
export interface DegreeOrderOptions { readonly of?: "forward" | "reverse" | undefined; }

export interface AdjacencyView {
    readonly directed: boolean;
    readonly nodeCount: number;
    readonly arcCount: number;
    readonly rowPtr: U32;
    readonly colIdx: U32;
    readonly arcToEdge: U32;
    readonly weights: F32 | null;
}
export interface ReverseView extends AdjacencyView { readonly fwdArc: U32; }
export interface CooView { readonly src: U32; readonly dst: U32; readonly arcToEdge: U32; readonly weights: F32 | null; }
export interface EdgeListView { readonly src: U32; readonly dst: U32; readonly arc: U32; readonly weights: F32 | null; }
export interface DegreeOrderView { readonly perm: U32; readonly segmentOffsets: U32; }

// ============================================================ derived graphs
export interface DerivedGraph {
    readonly snapshot: GraphSnapshot;
    readonly nodeOrigin: U32 | null;
    readonly edgeOrigin: U32 | null;
    readonly nodeRemap: U32 | null;
    readonly edgeRemap: U32 | null;
    readonly blockSizes: U32 | null;
    readonly report: { readonly droppedEdges: number; readonly mergedEdges: number };
}
export interface ToUndirectedOptions { readonly reciprocal?: boolean | undefined; readonly weights?: WeightReducer | undefined; }
export interface SimplifyOptions {
    readonly weights?: WeightReducer | undefined;
    readonly selfLoops?: "keep" | "drop" | undefined;
    readonly edgeReducers?: Readonly<Record<string, ColumnReducer>> | undefined;
}
export interface ContractOptions {
    readonly weights?: WeightReducer | undefined;                 // default "sum"
    readonly selfLoops?: "keep" | "drop" | undefined;             // default "keep"
    readonly parallel?: "merge" | "keep" | undefined;             // default "merge"
    readonly nodeReducers?: Readonly<Record<string, ColumnReducer>> | undefined;   // default: drop node columns
    readonly edgeReducers?: Readonly<Record<string, ColumnReducer>> | undefined;   // default: drop edge columns
}

// ============================================================ wire
export type WireDtype = "u32" | "i32" | "f32" | "f64" | "u8" | "utf8";
export interface WireBufferRef { readonly buffer: number; readonly byteOffset: number; readonly byteLength: number; readonly dtype: WireDtype; readonly length: number; }
export interface WireUtf8 { readonly offsets: WireBufferRef; readonly utf8: WireBufferRef; }
export interface WireColumn {
    readonly meta: ColumnMeta;
    readonly data: WireBufferRef | null;
    readonly validity: WireBufferRef | null;
    readonly nullCount: number;
    readonly dictionary: WireUtf8 | null;
    readonly strings: WireUtf8 | null;
    readonly offsets: WireBufferRef | null;
    readonly child: WireColumn | null;
    readonly jsonText: WireUtf8 | null;
}
export interface WireArena { readonly buffer: number; readonly byteOffset: number; readonly byteLength: number; readonly hotByteLength: number; }
export interface WireManifest {
    readonly format: "graphty-snapshot";
    readonly wire: readonly [major: number, minor: number];
    readonly producer: string;
    readonly formatVersion: 1;
    readonly directed: boolean;
    readonly counts: { readonly nodes: number; readonly edges: number; readonly arcs: number; readonly selfLoops: number };
    readonly flags: SnapshotFlags;
    readonly core: { readonly rowPtr: WireBufferRef; readonly colIdx: WireBufferRef | null; readonly weights: WireBufferRef | null; readonly arcToEdge: WireBufferRef | null; readonly edgeToArc: WireBufferRef | null };
    readonly arena: WireArena | null;
    readonly ids: WireIdMap;
    readonly nodeColumns: readonly WireColumn[];
    readonly edgeColumns: readonly WireColumn[];
    readonly graphColumns: readonly WireColumn[];
    readonly extensions: readonly { readonly name: string; readonly rowCount: number; readonly columns: readonly WireColumn[] }[];
    readonly meta: GraphMeta;
    readonly views: Readonly<Record<string, Readonly<Record<string, WireBufferRef>>>> | null;
    readonly copied: readonly number[];   // buffer indices that were copied rather than transferred (shared storage, section 9.1)
    readonly label: string | null;
}
export interface WireSnapshot { readonly manifest: WireManifest; readonly buffers: readonly ArrayBuffer[]; }
export interface ToWireOptions { readonly transfer?: boolean | undefined; readonly includeViews?: readonly ViewName[] | undefined; readonly includeColumns?: boolean | undefined; }
export interface ToBytesOptions { readonly includeViews?: readonly ViewName[] | undefined; }
export interface FromWireOptions { readonly validate?: ValidationLevel | undefined; readonly copy?: boolean | undefined; readonly unknownColumns?: "error" | "skip" | undefined; }
export interface ValidateOptions { readonly level?: "structure" | "full" | undefined; readonly checksum?: boolean | undefined; }
export interface ByteLengthOptions { readonly views?: boolean | undefined; readonly columns?: boolean | undefined; readonly ids?: boolean | undefined; }

// ============================================================ snapshot
export declare class GraphSnapshot implements AdjacencyView {
    readonly [SNAPSHOT_BRAND]: true;
    readonly serial: number;
    readonly label: string | null;
    readonly formatVersion: 1;
    readonly directed: boolean;
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly arcCount: number;
    readonly selfLoopCount: number;
    readonly rowPtr: U32;
    readonly colIdx: U32;
    readonly weights: F32 | null;
    readonly arcToEdge: U32;
    readonly edgeToArc: U32;
    readonly flags: SnapshotFlags;
    readonly ids: NodeIdMap;
    readonly nodes: AttributeTable;
    readonly edges: AttributeTable;
    readonly graph: AttributeTable;
    readonly extensions: ReadonlyMap<string, AttributeTable>;
    readonly meta: GraphMeta;
    readonly arena: ArenaLayout | null;
    get detached(): boolean;

    // queries (3.9)
    outArcs(u: number): readonly [start: number, end: number];
    outDegreeOf(u: number): number;
    findArc(u: number, v: number): number;
    hasArc(u: number, v: number): boolean;
    arcsBetween(u: number, v: number): readonly [lo: number, hi: number];
    multiplicity(u: number, v: number): number;
    arcSource(a: number): number;
    edgeSource(e: number): number;
    edgeTarget(e: number): number;
    edgeIndexOf(id: EdgeId): number;

    // views (7.2)
    reverse(): ReverseView;
    coo(): CooView;
    edgeList(): EdgeListView;
    outDegree(): U32;
    inDegree(): U32;
    degree(): U32;
    weightedOutDegree(): F64;
    weightedInDegree(): F64;
    weightedDegree(): F64;
    selfLoopWeight(): F64;
    totalWeight(): number;
    selfLoopArcs(): U32;
    selfLoopsPerNode(): U32;
    selfLoopsAt(u: number): number;
    mate(): U32;
    degreeOrder(options?: DegreeOrderOptions): DegreeOrderView;
    isSymmetric(): boolean;
    prepare(views: readonly ViewName[]): this;
    dropCaches(): void;
    cachedViews(): readonly ViewName[];

    // derived graphs (7.3)
    toUndirected(options?: ToUndirectedOptions): DerivedGraph;
    transpose(): DerivedGraph;
    simplified(options?: SimplifyOptions): DerivedGraph;
    withoutSelfLoops(): DerivedGraph;
    filterEdges(keep: EdgeMask): DerivedGraph;
    inducedSubgraph(selection: U32 | { readonly mask: NodeMask }): DerivedGraph;
    contract(partition: U32, options?: ContractOptions): DerivedGraph;
    relabel(perm: U32): DerivedGraph;
    withColumns(nodes?: Readonly<Record<string, TypedArrayData | ColumnInput>>, edges?: Readonly<Record<string, TypedArrayData | ColumnInput>>): GraphSnapshot;

    // memory, transfer, checks (9, 11)
    byteLength(options?: ByteLengthOptions): number;
    contentHash(): string;
    transferables(): ArrayBuffer[];
    toWire(options?: ToWireOptions): WireSnapshot;
    toBytes(options?: ToBytesOptions): U8;
    toByteChunks(options?: ToBytesOptions): Iterable<U8>;
    validate(options?: ValidateOptions): void;
}

// ============================================================ factories and statics (functions, not static-only classes)
export interface EdgeArraysInput {
    readonly directed: boolean;
    readonly nodeCount?: number | undefined;
    readonly ids?: readonly NodeId[] | F64 | undefined;
    readonly src: U32;
    readonly dst: U32;
    readonly weights?: F32 | F64 | undefined;
    readonly nodeColumns?: Readonly<Record<string, TypedArrayData | ColumnInput>> | undefined;
    readonly edgeColumns?: Readonly<Record<string, TypedArrayData | ColumnInput>> | undefined;
    readonly meta?: GraphMetaPatch | undefined;
}
export interface CsrInput {
    readonly directed: boolean;
    readonly nodeCount: number;
    readonly rowPtr: U32;
    readonly colIdx: U32;
    readonly weights?: F32 | null | undefined;
    readonly arcToEdge?: U32 | undefined;
    readonly edgeToArc?: U32 | undefined;
    readonly edgeCount?: number | undefined;
    readonly ids?: readonly NodeId[] | F64 | undefined;
    readonly nodeColumns?: Readonly<Record<string, TypedArrayData | ColumnInput>> | undefined;
    readonly edgeColumns?: Readonly<Record<string, TypedArrayData | ColumnInput>> | undefined;
    readonly meta?: GraphMetaPatch | undefined;
    readonly flags?: FlagClaims | undefined;
}
export interface FromCsrOptions { readonly validate?: ValidationLevel | undefined; readonly copy?: boolean | undefined; readonly sortRows?: boolean | undefined; }
export interface RecordsInput {
    readonly directed: boolean;
    readonly nodes?: Iterable<Readonly<Record<string, unknown>>> | undefined;
    readonly edges: Iterable<Readonly<Record<string, unknown>>>;
    readonly nodeId?: string | null | undefined;
    readonly edgeSource?: string | undefined;
    readonly edgeTarget?: string | undefined;
    readonly edgeWeight?: string | null | undefined;
    readonly columns?: "infer" | "json" | "none" | readonly ColumnDecl[] | undefined;
    readonly ids?: IdCoercion | undefined;
}
export function fromEdgeArrays(input: EdgeArraysInput, options?: BuilderOptionsPatch & FreezeOptions): GraphSnapshot;
export function fromCsr(input: CsrInput, options?: FromCsrOptions): GraphSnapshot;
export function fromRecords(input: RecordsInput, options?: BuilderOptionsPatch & FreezeOptions): { snapshot: GraphSnapshot; report: FreezeReport };
export function fromWire(wire: WireSnapshot, options?: FromWireOptions): GraphSnapshot;
export function fromBytes(bytes: Uint8Array | ArrayBufferLike, options?: FromWireOptions): GraphSnapshot;
export function fromByteChunks(chunks: Iterable<Uint8Array>, options?: FromWireOptions): GraphSnapshot;
export function isGraphSnapshot(x: unknown): x is GraphSnapshot;
export function equalsTopology(a: GraphSnapshot, b: GraphSnapshot): boolean;

// ============================================================ builder
export interface GraphBuilderOptions {
    directed: boolean;                                            // REQUIRED; no default; changeable later via setDirected() (section 6.6)
    weighted?: boolean | "auto" | undefined;                      // default "auto": weighted if any addEdge supplied a weight
    weightDtype?: "f32" | "f64" | undefined;                      // default "f32" (section 3.7); importers pass "f64"
    duplicateEdges?: DuplicatePolicy | undefined;                 // default "keep"
    selfLoops?: "keep" | "drop" | "error" | undefined;            // default "keep"
    addMissingNodes?: boolean | undefined;                        // default true
    expectedNodes?: number | undefined;
    expectedEdges?: number | undefined;
}
export type BuilderOptionsPatch = Loose<GraphBuilderOptions>;
/** The builder's options after defaults were applied; the same shape under every compiler flag. */
export interface ResolvedBuilderOptions {
    readonly directed: boolean;                                   // the CURRENT value (setDirected() updates it)
    readonly weighted: boolean | "auto";
    readonly weightDtype: "f32" | "f64";
    readonly duplicateEdges: DuplicatePolicy;
    readonly selfLoops: "keep" | "drop" | "error";
    readonly addMissingNodes: boolean;
    readonly expectedNodes: number | null;
    readonly expectedEdges: number | null;
}
export interface FreezeOptions {
    label?: string | undefined;
    prepare?: readonly ViewName[] | undefined;                    // views computed eagerly inside freeze
    arena?: boolean | undefined;                                  // default true
    release?: boolean | undefined;                                // default false; true empties staging after freezing
    duplicateEdges?: DuplicatePolicy | undefined;                 // overrides the builder default for this freeze; a merge policy REWRITES THE BUILDER (section 6.5)
    profile?: boolean | undefined;                                // fills FreezeReport.timings
    checksum?: boolean | undefined;                               // records FNV-1a checksums for validate({ checksum: true }) (section 5.8)
}
export interface FreezeReport {
    readonly nodeRemap: U32 | null;            // previous freeze's index space (the builder's own on the first freeze) -> new index or INVALID_INDEX; null when nodes were not renumbered (I16)
    readonly edgeRemap: U32 | null;            // same for edges (a merged edge: its survivor); null when edges were not renumbered; independent of nodeRemap
    readonly compacted: boolean;
    readonly droppedSelfLoops: number;
    readonly mergedEdges: number;              // parallel edges collapsed by duplicateEdges
    readonly droppedEdges: number;             // tombstoned + dropped loops + merged
    readonly widened: readonly { readonly column: string; readonly domain: ColumnDomain; readonly from: Dtype; readonly to: Dtype }[];
    readonly timings: Readonly<Record<string, number>>;   // ms per phase; empty unless profile
}
export type ColumnHandle = number & { readonly __brand: "ColumnHandle" };        // index into the builder's column list for its domain; INVALID_INDEX when absent
export type ExtensionHandle = number & { readonly __brand: "ExtensionHandle" };
export interface SetDirectedOptions { readonly expand?: boolean | undefined; }

export interface GraphSink {
    readonly options: ResolvedBuilderOptions;
    readonly directed: boolean;
    readonly directedLocked: boolean;
    readonly edgeCount: number;
    setDirected(directed: boolean, options?: SetDirectedOptions): void;
    reserve(nodes?: number, edges?: number): void;
    addNode(id: NodeId): number;
    addNodes(ids: Iterable<NodeId>, out?: U32): U32;
    addEdge(source: NodeId, target: NodeId, weight?: number): number;
    addEdges(src: U32, dst: U32, weights?: F32 | F64): number;
    setEdgeWeight(edge: number, weight: number): void;
    edgeEndpoints(edge: number): readonly [source: number, target: number];
    edgeWeight(edge: number): number;
    indexOf(id: NodeId): number;
    declareNodeColumn(decl: ColumnDecl): ColumnHandle;
    declareEdgeColumn(decl: ColumnDecl): ColumnHandle;
    nodeColumn(name: string): ColumnHandle;
    edgeColumn(name: string): ColumnHandle;
    setNodeValue(column: ColumnHandle | string, index: number, value: unknown): void;
    setEdgeValue(column: ColumnHandle | string, edge: number, value: unknown): void;
    setGraphValue(name: string, value: unknown, decl?: ColumnDeclPatch): void;
    setMeta(meta: GraphMetaPatch): void;
    addExtensionTable(name: string, decls: readonly ColumnDecl[]): ExtensionHandle;
    addExtensionRow(table: ExtensionHandle, values: readonly unknown[]): number;
    addNodeRecord(id: NodeId, attrs: Readonly<Record<string, unknown>>): number;
    addEdgeRecord(source: NodeId, target: NodeId, attrs: Readonly<Record<string, unknown>>, weightKey?: string | null): number;
}

export declare class GraphBuilder implements GraphSink {
    constructor(options: GraphBuilderOptions);
    static from(snapshot: GraphSnapshot, options?: BuilderOptionsPatch): GraphBuilder;
    readonly options: ResolvedBuilderOptions;
    get directed(): boolean;
    get directedLocked(): boolean;
    get nodeCount(): number;            // live nodes
    get edgeCount(): number;            // live edges (exact; incidence lists)
    get nodeBound(): number;            // next node index to be assigned
    get edgeBound(): number;
    get mutationCount(): number;        // increments on every topology or weight mutation; column writes and freeze() do not count
    get dirty(): boolean;               // mutated since the last freeze()
    setDirected(directed: boolean, options?: SetDirectedOptions): void;
    lockDirected(): void;
    // nodes
    addNode(id: NodeId): number;
    addNodes(ids: Iterable<NodeId>, out?: U32): U32;
    addAnonymousNodes(count: number): number;
    hasNode(id: NodeId): boolean;
    indexOf(id: NodeId): number;
    idOf(index: number): NodeId;
    removeNode(id: NodeId): U32;                       // removed live incident edge indices
    removeNodeByIndex(index: number): U32;
    reserve(nodes?: number, edges?: number): void;
    // edges
    addEdge(source: NodeId, target: NodeId, weight?: number): number;
    addEdgeByIndex(u: number, v: number, weight?: number): number;
    addEdges(src: U32, dst: U32, weights?: F32 | F64): number;
    addEdgesByIds(src: ArrayLike<NodeId>, dst: ArrayLike<NodeId>, weights?: ArrayLike<number>): number;
    removeEdge(edge: number): boolean;
    hasEdge(edge: number): boolean;
    edgeEndpoints(edge: number): readonly [source: number, target: number];
    edgeWeight(edge: number): number;
    setEdgeWeight(edge: number, weight: number): void;
    outEdgesOf(index: number): U32;                    // live edge indices leaving index (O(degree))
    inEdgesOf(index: number): U32;
    findEdges(u: number, v: number): U32;              // live edges u -> v (undirected: either orientation)
    // attributes
    declareNodeColumn(decl: ColumnDecl): ColumnHandle;
    declareEdgeColumn(decl: ColumnDecl): ColumnHandle;
    nodeColumn(name: string): ColumnHandle;
    edgeColumn(name: string): ColumnHandle;
    setNodeValue(column: ColumnHandle | string, index: number, value: unknown): void;
    setEdgeValue(column: ColumnHandle | string, edge: number, value: unknown): void;
    setNodeColumn(name: string, data: TypedArrayData, decl?: ColumnDeclPatch): void;   // bulk; length must equal nodeBound
    setEdgeColumn(name: string, data: TypedArrayData, decl?: ColumnDeclPatch): void;
    setGraphValue(name: string, value: unknown, decl?: ColumnDeclPatch): void;
    setMeta(meta: GraphMetaPatch): void;
    addExtensionTable(name: string, decls: readonly ColumnDecl[]): ExtensionHandle;
    addExtensionRow(table: ExtensionHandle, values: readonly unknown[]): number;
    addNodeRecord(id: NodeId, attrs: Readonly<Record<string, unknown>>): number;
    addEdgeRecord(source: NodeId, target: NodeId, attrs: Readonly<Record<string, unknown>>, weightKey?: string | null): number;
    // composition
    addGraph(snapshot: GraphSnapshot, options?: { readonly onDuplicateNode?: "merge" | "error" | undefined }): void;
    // output and lifecycle
    freeze(options?: FreezeOptions): GraphSnapshot;
    freezeWithReport(options?: FreezeOptions): { snapshot: GraphSnapshot; report: FreezeReport };
    clear(): void;
    dispose(): void;
    byteLength(): number;
}

// ============================================================ errors
export type GraphFormatErrorCode =
    | "E_INVALID_ID" | "E_UNKNOWN_NODE" | "E_INDEX_RANGE" | "E_TOO_LARGE" | "E_INVALID_WEIGHT" | "E_DIRECTED"
    | "E_SELF_LOOP" | "E_DUPLICATE_EDGE" | "E_DUPLICATE_EDGE_ID" | "E_DUPLICATE_ID" | "E_DUPLICATE_ROLE"
    | "E_UNKNOWN_COLUMN" | "E_COLUMN_TYPE" | "E_COLUMN_LENGTH" | "E_COLUMN_ALIGNMENT" | "E_COLUMN_EXISTS" | "E_COLUMN_IMMUTABLE"
    | "E_NO_DEFAULT" | "E_PARTITION" | "E_INVALID_PERMUTATION" | "E_MASK_LENGTH"
    | "E_GPU_INELIGIBLE" | "E_INVALID_SNAPSHOT" | "E_BAD_SERIALIZATION" | "E_UNSUPPORTED_VERSION"
    | "E_DETACHED" | "E_BUILDER_DISPOSED" | "E_UNSUPPORTED" | "E_IMPORT";
export declare class GraphFormatError extends Error {
    readonly code: GraphFormatErrorCode;
    readonly details: Readonly<Record<string, unknown>>;
    constructor(code: GraphFormatErrorCode, message: string, details?: Readonly<Record<string, unknown>>);
}
```

### 12.3 Column accessor typing example

Written to compile under both `noUncheckedIndexedAccess` settings (the
strict-consumer compile of section 16.6 includes it) and to pass the root
ESLint config with the flag off: no `as number`, no non-null assertion,
`null` tests for absent columns, `=== undefined` only where a typed-array
read may legitimately be undefined under the strict flag
(`no-unnecessary-condition` is off in the root config, section 13.4).

```typescript
const pos = snapshot.nodes.requireTyped("position", "f32");   // F32Column; throws E_COLUMN_TYPE otherwise
const stride = pos.meta.components;                          // 3
const x = pos.data[i * stride];                              // number (number | undefined under the strict flag)
const kind = snapshot.edges.byRole("kind");                  // Column | null
if (kind !== null && kind.dtype === "dict") {
    const code = kind.codes[e];
    const label = code === undefined ? undefined : kind.dictionary[code];
    use(label);
}
const { rowPtr, colIdx } = snapshot;                         // hot loops read plain numbers
use(x, rowPtr, colIdx);
```

The worked ports of section 14.2 are consumer code and target the
consumer configuration of section 13.4 (`noUncheckedIndexedAccess:
false`), where `rowPtr[u]` is `number`; they are type-checked under that
configuration. Under `exactOptionalPropertyTypes`, no public object type
rejects an explicit `undefined` for an optional input field, and "no
value" is always `null` in outputs. `GraphBuilder` is assignable to
`GraphSink`; `GraphSnapshot` and `ReverseView` are assignable to
`AdjacencyView`.

### 12.4 io contract types (declared in @graphty/graph-io)

These are normative for `@graphty/graph-io` and for anyone implementing
an importer or exporter; they are listed here because sections 8.4-8.6
reference them. They depend on `lib: ["DOM"]` (or `@types/node` >= 18)
for `ReadableStream` and `AbortSignal`, which is why they are not in the
core.

```typescript
export type ImportInput = string | Uint8Array | ReadableStream<Uint8Array> | AsyncIterable<string | Uint8Array>;
export interface CommonImportOptions {
    ids?: IdCoercion | undefined;
    nodeIdFrom?: "id" | "label" | "index" | undefined;
    addMissingNodes?: boolean | undefined;
    duplicateEdges?: DuplicatePolicy | undefined;
    selfLoops?: "keep" | "drop" | "error" | undefined;
    onMixedDirection?: "expand" | "directed" | "undirected" | "error" | undefined;
    defaultDirected?: boolean | undefined;
    weightFrom?: string | null | undefined;
    weightDtype?: "f32" | "f64" | undefined;
    long?: "f64" | "string" | undefined;
    restoreMangledIds?: boolean | undefined;
    hyperedges?: "error" | "skip" | "star" | "clique" | undefined;
    errorLimit?: number | undefined;
    signal?: AbortSignal | undefined;
    onProgress?: ((bytesDone: number, bytesTotal?: number) => void) | undefined;
}
export interface GraphImporter<Opts = unknown> {
    readonly format: string;
    readonly extensions: readonly string[];
    readonly mimeTypes: readonly string[];
    sniff?(head: Uint8Array): number;
    import(input: ImportInput, sink: GraphSink, options?: Opts & CommonImportOptions): Promise<ImportReport>;
}
export interface ExportCapabilities {
    readonly mixedDirection: boolean; readonly multiEdges: boolean; readonly selfLoops: boolean;
    readonly edgeIds: "required" | "optional" | "none";
    readonly idCharset: "any" | "nmtoken" | "integer" | "dense-1-based";
    readonly dtypes: readonly Dtype[]; readonly components: boolean; readonly lists: boolean; readonly json: boolean;
    readonly defaults: boolean; readonly options: boolean; readonly hierarchy: boolean;
    readonly temporal: "none" | "intervals" | "spells" | "dynamic-values";
    readonly graphAttributes: boolean; readonly positions: boolean; readonly viz: boolean;
}
export interface LossNote { readonly code: string; readonly message: string; readonly column: string | null; readonly count: number | null; }
export interface CommonExportOptions { sanitizeIds?: "error" | "mangle" | undefined; onMixedDirection?: "error" | "directed" | "undirected" | undefined; }
export interface GraphExporter<Opts = unknown> {
    readonly format: string;
    readonly capabilities: ExportCapabilities;
    check(snapshot: GraphSnapshot, options?: Opts & CommonExportOptions): readonly LossNote[];
    export(snapshot: GraphSnapshot, options?: Opts & CommonExportOptions): AsyncIterable<Uint8Array>;
    exportToString(snapshot: GraphSnapshot, options?: Opts & CommonExportOptions): Promise<string>;
}
export type IssueCategory = "parse-error" | "missing-value" | "validation-error" | "unsupported" | "precision" | "coercion" | "merged";
export interface ImportIssue {
    readonly category: IssueCategory;
    readonly severity: "error" | "warning";
    readonly code: string;
    readonly message: string;
    readonly line: number | null;
    readonly element: string | null;
}
export interface ImportReport {
    readonly format: string;
    readonly counts: { readonly nodes: number; readonly edges: number; readonly skippedNodes: number; readonly skippedEdges: number; readonly expandedMixed: number };
    readonly issues: readonly ImportIssue[];
    readonly errorCount: number;
    readonly warningCount: number;
    readonly truncated: boolean;
    readonly lossy: readonly LossNote[];
    readonly durationMs: number;
}
export declare class ImportError extends GraphFormatError { readonly report: ImportReport; }
```

The default `Opts = unknown` (not `Record<string, never>`, which makes
every common option `never` under intersection, and not `{}`, which the
root lint rejects) lets a caller pass common options to an importer or
exporter typed without a format-specific option set.

---

## 13. Package layout and monorepo conventions

### 13.1 Directory tree

```
graph-format/
+-- package.json                  # @graphty/graph-format, 0.1.0, ESM only, sideEffects false, zero dependencies
+-- project.json                  # "name": "graph-format"
+-- tsconfig.json                 # extends ../tsconfig.base.json; includes src/ test/ benchmarks/; noEmit (lint-discoverable)
+-- tsconfig.build.json           # extends ./tsconfig.json; src/ only; composite; rootDir src; outDir dist
+-- tsconfig.strict-consumer.json # type-level test compile: noUncheckedIndexedAccess + exactOptionalPropertyTypes over dist/*.d.ts
+-- vitest.config.ts              # single project, environment node, pool forks, thresholds 80/80/75/80
+-- README.md  CLAUDE.md  LICENSE (MIT, copied from algorithms/LICENSE)
+-- scripts/build-bundle.js       # programmatic vite lib build -> dist/graph-format.js (+ map)
+-- scripts/bundle-types.js       # writes dist/graph-format.d.ts = `export * from "./src/index.js";` (one line, cannot drift; Q18)
+-- src/
|   +-- index.ts                  # the only public barrel; named exports only (section 12.2)
|   +-- constants.ts              # INVALID_INDEX, MAX_COUNT, FORMAT_VERSION, SNAPSHOT_BRAND, ALIGNMENT, IS_LITTLE_ENDIAN
|   +-- errors.ts                 # GraphFormatError, codes (ImportError lives in graph-io)
|   +-- types/                    # snapshot.ts columns.ts builder.ts wire.ts (every interface of section 12.2)
|   +-- ids/                      # node-id-map.ts (five kinds), string-store.ts (Utf8 store, lazy decode), edge-id-index.ts
|   +-- columns/                  # column.ts table.ts bitmap.ts dictionary.ts infer.ts growable.ts remap.ts
|   +-- builder/                  # graph-builder.ts freeze.ts (section 6.3) compact.ts counting-sort.ts arena.ts
|   +-- snapshot/                 # graph-snapshot.ts views.ts queries.ts derived.ts validate.ts hash.ts
|   +-- populate/                 # from-edge-arrays.ts from-csr.ts from-records.ts
|   +-- wire/                     # to-wire.ts from-wire.ts bytes.ts (GSNP container)
|   +-- util/                     # typed-array.ts (grow, pad, resizable-buffer detection), mask.ts
|   +-- lib-resizable-array-buffer.d.ts   # local declaration for `resizable` / `resize` / `maxByteLength`
+-- test/
|   +-- helpers/model-graph.ts    # ~150-line Map-of-Maps reference model for property tests
|   +-- helpers/random-ops.ts     # fast-check arbitraries for builder operation sequences
|   +-- helpers/legacy-graph.ts   # copy of the legacy algorithms Graph class for differential tests (no package dependency)
|   +-- fixtures/*.gsnp           # golden containers
|   +-- ids/ columns/ builder/ snapshot/ populate/ wire/  *.test.ts
|   +-- invariants.test.ts        # I1-I18 as executable checks; P1-P12
|   +-- alignment.test.ts  order-golden.test.ts  differential.test.ts
|   +-- types/*.test-d.ts         # expectTypeOf + strict-consumer compile
|   +-- build-output.test.ts      # package.json shape smoke test (layout pattern)
+-- benchmarks/                   # run.ts freeze.bench.ts views.bench.ts ids.bench.ts wire.bench.ts datasets.ts results/
```

Sibling package (phase IO1): `graph-io/` with the same skeleton,
`src/types.ts` (the section 12.4 contract types and `ImportError`),
`src/formats/{gexf,graphml,gml,dot,pajek,csv,json,neo4j}/{importer,exporter}.ts`,
`src/registry.ts`, `src/sniff.ts`, `src/children.ts`, per-format subpath
exports, `test/corpus/` (moved from `graphty-element/test/helpers/corpus/`).

### 13.2 package.json

Exactly the file proposed in research note 06 section 4: name
`@graphty/graph-format`, version `0.1.0` (the first `feat:` on master
publishes `0.2.0`; `1.0.0` per section 13.5), `"type": "module"`, ESM
only, `sideEffects: false`, `exports["."]` with `types` first, `files:
["dist/", "src/", "README.md", "LICENSE"]`, `publishConfig: { access:
"public", provenance: true }`, `engines.node >= 18.19.0`, no
`dependencies`, devDependencies limited to `vitest`, `vite`, `tsx`,
`typescript`, `@vitest/coverage-v8`, `@vitest/ui` and `fast-check` (hoisted
from graphty-element). Scripts: `build` (`tsc -p tsconfig.build.json`),
`build:bundle`, `build:all`, `lint` (`eslint && tsc --noEmit -p
tsconfig.json`), `typecheck`, `test`, `test:run`, `coverage`,
`coverage:preview` (port 9056), `benchmark` (`tsx benchmarks/run.ts`),
`ready:commit`. `@graphty/graph-io` adds `dependencies` on
`@graphty/graph-format: workspace:^` only (the parsers are hand-written),
and `peerDependencies` on the format.

### 13.3 Root touch points

The checklist of research note 06 section 1, for `graph-format` now and
`graph-io` at IO1: `pnpm-workspace.yaml` (`graph-format` before
`algorithms`), `commitlint.config.js` scope-enum, `knip.config.ts`
workspace entries, `tools/prepush.sh` fast-test block,
`tools/merge-coverage.sh` PACKAGES, `.github/workflows/ci.yml` (build
upload, test shard, build download), `.github/workflows/release.yml`
download step, root `CLAUDE.md` (naming table, build order "graph-format
-> graph-io -> algorithms -> layout -> graphty-element -> graphty", ports
9056 / 9057), root `README.md`, `pnpm install`. `webgpu-graph-algorithms`
repeats the checklist at W1.

### 13.4 Build, test, lint

- Two-step build as algorithms/layout (`tsc` per module into `dist/src/`
  plus a programmatic vite lib bundle, `formats: ["es"]`, `minify: false`,
  `sourcemap: true`); `tsconfig.build.json` emits `src/` only;
  `tsconfig.json` includes `test/` so the root ESLint `projectService`
  type-checks tests (option (a) of note 06; no root ignore entry).
- tsconfig: extends base; `composite: true`; `noImplicitOverride: true`;
  `noUncheckedIndexedAccess: false` (Q19; the setting of EVERY format
  consumer, section 12.1); `exactOptionalPropertyTypes: false`; `lib`
  stays at the base ES2020 with the local resizable `ArrayBuffer`
  declaration (the core's public types need nothing from the DOM lib;
  `Uint32Array<ArrayBuffer>` generics need TypeScript >= 5.7, which the
  base already requires). `graph-io` adds `lib: ["DOM"]` for
  `ReadableStream` / `AbortSignal`.
- vitest: single `default` project, `environment: "node"`, `pool:
  "forks"`, `globals: true`, coverage v8 (`lcov`), thresholds 80/80/75/80,
  `include: ["test/**/*.test.ts"]`, `exclude` barrels and `.d.ts`; no
  browser project (the `writeBuffer` proof lives in the WebGPU package).
- Lint (root flat config): `camelcase` field names (`rowPtr`, never
  `row_ptr`); `curly`; `prefer-destructuring` is configured `["error", {
  object: true, array: false }]` with the default
  `enforceForRenamedProperties: false`, so `const { rowPtr, colIdx } =
  snapshot;` is the house style but `const n = s.nodeCount` is NOT
  flagged (destructuring is a style choice for renamed reads, not a lint
  requirement); `no-non-null-assertion` and
  `no-unnecessary-type-assertion` are errors (hence
  `noUncheckedIndexedAccess` off: `as number` would be flagged);
  `no-unnecessary-condition` is off, which is why the `=== undefined`
  checks of the flag-neutral samples (section 12.3) lint clean;
  `explicit-function-return-type`; `unified-signatures` (optional trailing
  parameters instead of overloads); `no-extraneous-class` (factories are
  functions); JSDoc on every exported function, class and method
  (`@param name - description`, `@returns`); `default-case` in every dtype
  `switch`; `import { type X, y }` inline qualifiers; `@public` on exports
  used only by other packages so knip does not flag them; no
  `console.log`.

### 13.5 Versioning and semver policy for a data format (G8)

Three version numbers, each with its own rule:

| Number | Where | Bumps when |
| --- | --- | --- |
| npm package version | `package.json`, nx release | conventional commits: `feat` minor, `fix` / `perf` patch, `!` major |
| `formatVersion` (data-model major) | `snapshot.formatVersion`, compared with `FORMAT_VERSION` by `isGraphSnapshot()` and by `fromWire` / `fromBytes` (a mismatch is `E_UNSUPPORTED_VERSION`, `details.kind: "format"`, even when the byte layout is unchanged, because the MEANING of `colIdx`, degrees or validity bits may have changed) | any change to invariants I1-I18, to the meaning of a public field, flag or sentinel, to the `arcCount` arithmetic, to self-loop storage or counting, to the sort order or tie-break, to `arcToEdge` / `edgeToArc` semantics, to default builder policies, to column fill values or the validity bit order, to the `NodeIdMap` equality rule; always coincides with an npm major AND with a wire major |
| wire `[major, minor]` | byte container header and manifest | major: incompatible layout or a `formatVersion` bump (reader refuses with `E_UNSUPPORTED_VERSION`); minor: additive manifest FIELDS (older readers ignore unknown fields, newer readers read older minors) and additive enum VALUES with a defined skip behaviour: a new dtype (an older reader refuses it unless `unknownColumns: "skip"`), a new view name (ignored), never a new id-map kind (that is a major, since ids cannot be skipped); a wire major is always an npm major, an npm major may leave the wire major unchanged |

Rules:

1. The invariants, the flag predicates, `INVALID_INDEX`, the counting
   vocabulary and the view / derived-graph tables are the public API.
   Changing any of them is a breaking change even when no TypeScript
   signature changes and requires a `feat!:` commit, an npm major and a
   `formatVersion` bump.
2. Adding a view, a derived graph, a dtype (with the skip rule above), a
   role, a flag, an optional option or a manifest field with a default is
   a minor. Adding a required option or an id-map kind is a major.
3. Consumers (`algorithms`, `layout`, `graphty-element`,
   `webgpu-graph-algorithms`, `graph-io`) declare `@graphty/graph-format`
   in BOTH `dependencies` (`workspace:^`, published as a caret range --
   `workspace:*` publishes an EXACT pin) AND `peerDependencies` (`^<major>`
   from `1.0.0` on, `^0.<minor>.0` during 0.x), so an application that
   installs several consumers gets one copy; `isGraphSnapshot()` is a
   structural `Symbol.for` brand check plus `formatVersion`, never
   `instanceof`, so a duplicated copy within one major still interoperates.
4. Because algorithms and layout re-export format types, a format major
   forces their majors; format majors are scheduled only at consumer major
   boundaries (2.0 in section 14.6).
5. 0.x period: every minor may break (semver 0.x). External npm users of
   `@graphty/algorithms` 1.x must never transitively pin a 0.x format, and
   releases are automatic on every green merge to `master` (note 06
   section 9), so the rule is mechanical: NO consumer PR that adds
   `@graphty/graph-format` to its `dependencies` may merge to `master`
   until the format on `master` is `>= 1.0.0` (a CI check compares the
   two `package.json` files). Consumer ports are developed and validated
   on branches against the 0.x format (section 14.6); the `1.0.0` cut is
   the gate that lets the first of them merge. Anything the consumer
   ports discover afterwards lands as a 1.x minor or, if breaking, as the
   2.0 scheduled with the consumer majors.
6. Deprecations: a public symbol is tagged `@deprecated` only after no
   in-repo caller remains (the root ESLint `no-deprecated` rule is an
   error in `src`), and removed one major later.

### 13.6 Docs

README with the badge row, install, a 40-line quick start (`GraphBuilder`
-> `freeze()` -> a row loop -> `ids.toMap` -> `toBytes()`), the invariant
list and the counting vocabulary; package `CLAUDE.md` with the structure,
commands, invariants and "adding a view / a dtype" recipes; this document
and the implementation plan under `design/graph-format/`. Typedoc wiring
is deferred until `graph-io` lands, then both are added in one docs
change (Q20).

---

## 14. Consumer migration

### 14.1 Principles

1. No public result type of `@graphty/algorithms` or `@graphty/layout`
   changes during the dual-API window. Legacy entry points keep their
   signatures and return shapes; they become facades.
2. Index-based implementations live under a namespace export `indexed`
   in each consumer package (`export * as indexed from
   "./indexed/index.js"`), take a `GraphSnapshot` (or `AdjacencyView`
   where sufficient) first and an options object last, and return result
   objects whose fields are typed arrays plus scalars. graphty-element and
   the WebGPU package program against `indexed`.
3. `@typescript-eslint/no-deprecated` is an error in `src/`; a legacy entry
   point is tagged `@deprecated` only after the last internal caller in
   every package has moved (phase D1); tests are exempt.
4. Conversion from a legacy input happens once per mutation: the legacy
   `Graph` class gains a `mutationCount`; `toSnapshot(graph)` memoises on
   `(graph, mutationCount)` in a `WeakMap`, which fixes the existing stale
   `WeakMap<Graph, CSRGraph>` bug. It builds with `weightDtype: "f64"` so
   a legacy graph's double weights are kept in the role-`weight` shadow
   column, and every weighted `indexed.*` function accepts an optional
   per-arc `weights: NumericVector` override so the facade can pass
   `expandEdges(s, shadow.data)` and reproduce the legacy f64 results
   exactly (the `1e-9` differential tolerance of section 16.2 stays
   honest; without the override the f32 arc weights would change weighted
   results in the 7th significant digit).
5. CPU scores are `Float64Array`, GPU scores `Float32Array`; parents,
   labels and matchings are `Uint32Array` with `INVALID_INDEX` (C10,
   C11); `DirectionOptimizedBFS`'s `Int32Array parent` becomes
   `Uint32Array`.

### 14.2 @graphty/algorithms

Result-type conventions for `indexed.*` and the facade conversion:

| Legacy shape | `indexed` shape | Facade conversion |
| --- | --- | --- |
| `Record<string, number>` | `Float64Array(n)` | `snapshot.ids.toRecord(vec)` |
| `Map<NodeId, number>` | `Float64Array(n)` / `Uint32Array(n)` | `snapshot.ids.toMap(vec)` |
| `Map<NodeId, NodeId \| null>` (predecessors) | `Uint32Array(n)` with `INVALID_INDEX` | loop with `idOf` |
| `Map<NodeId, ShortestPathResult>` | `SsspResult { dist: Float64Array; predArc: Uint32Array; pathTo(t): Uint32Array; pathEdges(t): Uint32Array }` | materialise per reachable node; the predecessor is the ARC that relaxed the node (`INVALID_INDEX` for the source and unreached nodes), so the exact parallel edge on the path is `arcToEdge[predArc[v]]` and the predecessor node is `arcSource(predArc[v])`; `pathEdges` gives logical edge indices for graphty-element's `isInPath`; the predecessor array is shared, not copied per node (removes an O(n^2) pathology). Same convention for Bellman-Ford, bidirectional Dijkstra and Prim (discovery arc) |
| `NodeId[][]` (components, communities) | `{ labels: Uint32Array; count: number; groups(): Uint32Array[] }` | `groups()` + `idOf` |
| `Set<NodeId>` | `Uint32Array` index list or packed mask | `maskToIndices` + `idOf` |
| `Map<string, T>` keyed by `String(id)` (`leiden.communities`, `labelPropagation*`, `kCoreDecomposition.coreness`, hierarchical clustering members) | `Float64Array(n)` / `Uint32Array(n)` | `snapshot.ids.toStringMap(vec)` (graphty-element reads these with `String(nodeId)` keys today) |
| `Set<string>` (`getKCore`, `MinCutResult.partition1/2`, `minCut.source/sink`) | packed `NodeMask` | `maskToIndices` + `String(idOf(i))` |
| `Map<NodeId, NodeId>` (matching, isomorphism mapping) | `Uint32Array(n)` with `INVALID_INDEX` | `entries` loop with `idOf` |
| `CommunityResult[]` (dendrogram levels) | `{ levels: Uint32Array[]; modularity: Float64Array }` | per level as above |
| `Edge[]` (MST) | `{ edges: Uint32Array; totalWeight: number }` | `edgeList()` + `idOf` rebuilds `{ source, target, weight }` |
| `Map<string, number>` keyed `"v-w"` (edge betweenness) | `Float64Array(edgeCount)` | rebuild string keys via `edgeList()` |
| `Graph` (condensationGraph) | `DerivedGraph` from `contract()` | the facade BUILDS a legacy `Graph` from `d.snapshot` with `addNode` / `addEdge` (small output; the only place a snapshot is converted to a `Graph`); component labels are assigned in Tarjan completion order so `componentMap` and the condensed node numbering are byte-identical to today's |
| `Map<string, Map<string, number>>` (flow) | `MaxFlowResult { maxFlow: number; flow: Float64Array(edgeCount); sourceSide: NodeMask; cutEdges: Uint32Array }` | rebuild the Map-of-Maps; `minCut.source/sink` from the mask, `minCut.edges` from `cutEdges` |
| `MinCutResult` | `{ cutValue: number; side: NodeMask; cutEdges: Uint32Array }` | `partition1/2` from the mask |
| `{ node, rank }[]` (`topPageRankNodes`) | `Uint32Array` of indices + `Float64Array` | today returns `String(id)` for numeric input (a type lie); the facade keeps that for the window and section 18 decision 5 records the fix |

`toSnapshot(input)` dispatches on `isGraphSnapshot`; the widening of
every legacy function's first parameter to `Graph | GraphSnapshot`
happens in phase A2 together with the indexed implementation that can
consume the snapshot (phase A1 adds `toSnapshot` and the differential
harness only, section 14.6). Legacy STRING-typed auxiliary inputs
(`labelPropagationSemiSupervised(graph, seedLabels: Map<string, number>)`,
flow / min-cut `source: string, sink: string`, `getKCore` callers) resolve
through `ids.indexOf(id)` first and, on a miss, through
`ids.stringIndex()` (the `String(idOf(i)) -> i` map, built lazily once per
snapshot), so a numeric-id graph called with `"5"` keeps working as it
does today; `indexed.*` callback options take indices and snapshots
(`nodeMatch(i1, i2, s1, s2)`) and the facade adapts. The `Map<string,
Map<string, number>>` overloads of `astar`, `edmondsKarp`, `stoerWagner`
and `kargerMinCut` are kept for one major behind a `fromAdjacencyMap()`
helper inside algorithms (Q7). Directedness checks stay in the facades
and the indexed functions; graphty-element stops building "directed with
reverse edges" and passes `snapshot` or its cached `toUndirected()` per
adapter, so `directed` finally reflects the data (which changes raw
centrality values: betweenness is now halved and normalised with the
undirected factor for those adapters; section 18 decision 5). Scratch
structures (`IndexedMinHeap` with `Float64Array` keys and decrease-key,
`IntUnionFind`, `RingQueue`, `BitSet`) live in
`algorithms/src/indexed/structures/`.

Rules the ports follow:

- Views are shared (I17): any port that decrements degrees, peels, or
  sorts a degree array works on `view.outDegree().slice()`; the
  differential suite freezes with `checksum: true` and asserts
  `validate({ checksum: true })` after every `indexed.*` call, so a
  write into a view fails a test rather than corrupting the next call.
- Simple-graph semantics on a multigraph use the adjacent-skip idiom of
  section 3.5 (betweenness sigma counts, k-core, isomorphism
  neighbourhoods, Katz, common neighbours); nothing calls `simplified()`
  per algorithm call.
- Row bounds are read from `rowPtr` directly; `outArcs()` /
  `arcsBetween()` allocate and are used only at boundaries (section 3.9).
- Modularity-based ports (Leiden, Louvain, Girvan-Newman's
  `calculateModularity`, MCL modularity, grsbm) use `weightedDegree()`
  (loop counted twice, `sum === 2 * totalWeight()`), never
  `weightedOutDegree()`.
- Contraction: Leiden / Louvain aggregation and `condensationGraph` use
  `snapshot.contract(partition, opts)` once per level (non-dense labels
  are accepted; `blockSizes` feeds refinement; on an unweighted input
  `weights: "sum"` materialises multiplicities). Stoer-Wagner and Karger
  do NOT contract snapshots: Stoer-Wagner keeps a `rep: Uint32Array(n)`
  representative array plus member lists and accumulates per-phase
  weights over the ORIGINAL rows (`w[rep[colIdx[a]]] += weights[a]`) with
  an `IndexedMaxHeap`, O(n * (m + n log n)); Karger is `IntUnionFind` over
  `edgeList()` with a random edge order, O(m alpha(n)) per trial. A
  `contract()` per phase would be n freezes (~25 s on the benchmark
  graph), the per-step conversion section 1.1 forbids.
- Girvan-Newman keeps an alive bitmap over LOGICAL edges tested through
  `arcToEdge[a]` (undirected input; section 7.4) and a masked BFS instead
  of `clone()` + `removeEdge()`; `maskCount` is the termination guard.
- Flow: the residual graph is a DIRECTED builder built with
  `fromEdgeArrays`. For a directed input over `[edges ++ reversed edges]`
  the twin of edge `e` is `e + E`; for an UNDIRECTED input (legacy
  `graphToMap` emits both `(u, v, c)` and `(v, u, c)` as real capacities)
  the input is `[edges ++ reversed edges ++ reversed edges ++ edges]`, 2E
  real edges plus 2E residual reverses, and the twin is `e < 2E ? e + 2E
  : e - 2E`. The residual's `arcToEdge` is never the identity (the input
  is not source-grouped), so the port precomputes `twinArc[a] =
  r.edgeToArc[twin(r.arcToEdge[a])]` once (O(A)) and keeps residual
  capacity PER ARC, so the augmenting loop reads no permutation; `mate()`
  is not needed. Flow values accumulate in `Float64Array`.
- `kCoreDecomposition` drops `graphToAdjacencySet`; `teraHAC`'s id/index
  bug disappears by construction. `graphToMap`, `GraphAdapter`,
  `toCSRGraph`, `createOptimizedGraph`, `optimized/csr-graph.ts` and
  `optimized/graph-adapter.ts` are unreachable after A2 and deleted at
  2.0.

Port 1 -- breadthFirstSearch (out-neighbours, unweighted; takes any
`AdjacencyView`, so `reverse()` gives an in-neighbour BFS for free):

```typescript
export interface BfsResult { readonly order: U32; readonly parent: U32; readonly depth: U32; readonly visitedCount: number; }
export interface BfsOptions { readonly maxDepth?: number | undefined; }
export function breadthFirstSearch(g: AdjacencyView, start: number, options: BfsOptions = {}): BfsResult {
    const { nodeCount, rowPtr, colIdx } = g;
    const parent = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const depth = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const order = new Uint32Array(nodeCount);
    const maxDepth = options.maxDepth ?? INVALID_INDEX;
    let head = 0; let tail = 0;
    order[tail++] = start; depth[start] = 0;
    while (head < tail) {
        const u = order[head++]; const d = depth[u];
        if (d >= maxDepth) { continue; }
        const end = rowPtr[u + 1];
        for (let a = rowPtr[u]; a < end; a++) {
            const v = colIdx[a];
            if (depth[v] === INVALID_INDEX) { depth[v] = d + 1; parent[v] = u; order[tail++] = v; }
        }
    }
    return { order: order.subarray(0, tail), parent, depth, visitedCount: tail };
}
// facade (signature unchanged): const s = toSnapshot(graph);
// return traversalResultFromIndexed(indexed.breadthFirstSearch(s, s.ids.requireIndex(startNode), { maxDepth }), s.ids);
```

The `> 10000 nodes` dual dispatch and the `WeakMap<Graph, CSRGraph>` cache
disappear; `DirectionOptimizedBFS` becomes `indexed.directionOptimizedBfs(
snapshot)` using `reverse()` for bottom-up steps.

Port 2 -- dijkstra (weights at the arc index, indexed heap; the
predecessor is the relaxing ARC so parallel edges are identified exactly):

```typescript
export interface SsspResult { readonly dist: F64; readonly predArc: U32; pathTo(target: number): U32; pathEdges(target: number): U32; }
export interface SsspOptions { readonly cutoff?: number | undefined; readonly weights?: NumericVector | undefined; }   // per-arc override (f64 shadow)
export function dijkstra(g: AdjacencyView, source: number, options: SsspOptions = {}): SsspResult {
    const { nodeCount, rowPtr, colIdx } = g;
    const weights: NumericVector | null = options.weights ?? g.weights;
    const dist = new Float64Array(nodeCount).fill(Infinity);
    const predArc = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const heap = new IndexedMinHeap(nodeCount);
    const cutoff = options.cutoff ?? Infinity;
    dist[source] = 0; heap.push(source, 0);
    while (!heap.isEmpty()) {
        const u = heap.pop(); const du = dist[u]; const end = rowPtr[u + 1];
        for (let a = rowPtr[u]; a < end; a++) {
            const w = weights === null ? 1 : weights[a];          // hoisted into two loop bodies in the real code
            const v = colIdx[a]; const dv = du + w;
            if (dv < dist[v] && dv <= cutoff) { dist[v] = dv; predArc[v] = a; heap.pushOrDecrease(v, dv); }
        }
    }
    return { dist, predArc, pathTo: (t) => walkPredArcs(g, predArc, source, t), pathEdges: (t) => walkPredEdges(g, predArc, source, t) };
}
```

`walkPredArcs` follows `arcSource(predArc[v])` (O(1) after `coo()`, else a
binary search on `rowPtr`) and `walkPredEdges` gathers
`arcToEdge[predArc[v]]` (one gather per path node; `arcToEdge` is
materialised for undirected graphs and identity-lazy for directed ones).
`flags.nonNegativeWeights` lets the facade skip the per-arc negativity
check and pick Bellman-Ford otherwise.

Port 3 -- pageRank (directed, pull over `reverse()`, dangling mass):

```typescript
export interface PageRankOptions { readonly dampingFactor?: number | undefined; readonly maxIterations?: number | undefined; readonly tolerance?: number | undefined; readonly weighted?: boolean | undefined; }
export function pageRank(s: GraphSnapshot, o: PageRankOptions = {}): PageRankResult {
    if (!s.directed) { throw new Error("PageRank requires a directed graph"); }
    const n = s.nodeCount; const d = o.dampingFactor ?? 0.85; const maxIter = o.maxIterations ?? 100; const tol = o.tolerance ?? 1e-6;
    const rev = s.reverse();                                        // in-adjacency; weights materialised
    const weighted = o.weighted === true && rev.weights !== null;
    const outW: NumericVector = weighted ? s.weightedOutDegree() : s.outDegree();   // f64 view: read, never written
    let rank = new Float64Array(n).fill(1 / n); let next = new Float64Array(n);
    let it = 0; let converged = false;
    for (; it < maxIter && !converged; it++) {
        let dangling = 0;
        for (let u = 0; u < n; u++) { if (outW[u] === 0) { dangling += rank[u]; } }   // a weighted node whose out-weights are all 0 is dangling too
        const base = (1 - d) / n + (d * dangling) / n; let delta = 0;
        for (let v = 0; v < n; v++) {
            let acc = 0; const end = rev.rowPtr[v + 1];
            for (let a = rev.rowPtr[v]; a < end; a++) {
                const u = rev.colIdx[a]; const ow = outW[u];
                if (ow > 0) { acc += (rank[u] * (weighted && rev.weights !== null ? rev.weights[a] : 1)) / ow; }   // guard: zero weights are legal (3.7)
            }
            next[v] = base + d * acc; delta += Math.abs(next[v] - rank[v]);
        }
        [rank, next] = [next, rank]; converged = delta < tol;
    }
    return { scores: rank, iterations: it, converged };
}
```

The facade returns `{ ranks: ids.toRecord(scores), iterations, converged }`
unchanged; the `SimpleDeltaPageRank` path becomes a second indexed
implementation over the same view with today's dispatch rule kept so the
differential tests compare like with like.

Port 4 -- connectedComponents (union-find over `edgeList()`, each edge
once): `for (let e = 0; e < s.edgeCount; e++) uf.union(src[e], dst[e]);
return uf.toLabels();` with labels renumbered `0..count-1` in first-seen
node order (matches today's iteration order); `weaklyConnectedComponents`
is the same function without the directed check.

Port 5 -- kruskalMST (stable key sort of edge indices, union-find): sort
`0..edgeCount-1` by `edgeList().weights` (or the per-arc `weights`
override gathered through `edgeToArc`) with a typed radix sort on the
bit pattern (stable, no comparator), union endpoints in that order, emit
edge indices and `totalWeight` (weights `null` -> 1); the facade rebuilds
`{ source, target, weight }` objects in the same orientation as today;
graphty-element matches MST edges by edge index, mapping derived-graph
edges back through `edgeRemap` (section 14.4), instead of
`"${src}:${dst}"` strings.

Port 6 -- commonNeighborsScore (sorted-row merge, zero allocation):

```typescript
export interface CommonNeighborsOptions { readonly directed?: boolean | undefined; }
export function commonNeighborsScore(s: GraphSnapshot, u: number, v: number, o: CommonNeighborsOptions = {}): number {
    const fwd: AdjacencyView = s; const bwd: AdjacencyView = o.directed === true ? s.reverse() : s;   // out(u) intersect in(v) when directed
    let i = fwd.rowPtr[u]; const iEnd = fwd.rowPtr[u + 1]; let j = bwd.rowPtr[v]; const jEnd = bwd.rowPtr[v + 1]; let count = 0;
    while (i < iEnd && j < jEnd) {                                  // merge intersection; valid because rows are sorted (I4)
        const a = fwd.colIdx[i]; const b = bwd.colIdx[j];
        if (a === b) { count++; i++; j++; while (i < iEnd && fwd.colIdx[i] === a) { i++; } while (j < jEnd && bwd.colIdx[j] === b) { j++; } }
        else if (a < b) { i++; } else { j++; }
    }
    return count;
}
```

Adamic-Adar adds `1 / Math.log(outDegree()[z])` per common `z`; the
`Prediction` variants use `hasArc` (binary search) for `includeExisting`.

### 14.3 @graphty/layout

Option B of research note 03: index-based entry points under `indexed`,
results `{ positions: Float32Array; dim: 2 | 3; n }` (dim NOT forced to
3), the 14 positional legacy signatures kept as wrappers returning
`PositionMap` for one major.

```typescript
export interface LayoutResult { readonly positions: F32; readonly dim: 2 | 3; readonly n: number; }   // layout units (normalised), not scene units
export interface CommonLayoutOptions { readonly dim?: 2 | 3 | undefined; readonly scale?: number | undefined; readonly center?: ArrayLike<number> | undefined; readonly seed?: number | null | undefined; }
export function toPositionMap(r: LayoutResult, ids: NodeIdMap): PositionMap;
export function fromPositionMap(pos: PositionMap | null | undefined, ids: NodeIdMap, dim: 2 | 3, fill: (i: number, out: F32) => void): F32;
export function toPositionColumn(r: LayoutResult, scale: number, center: ArrayLike<number> | null, out?: F32): F32;   // n * 3 SCENE units, zero z; writes into `out` (the owner's array) when given (C14, section 5.2)
export function fromPositionColumn(column: F32, dim: 2 | 3, scale: number, center: ArrayLike<number> | null, out?: F32): F32;   // the inverse: seeds `pos` for a re-run from the current scene positions
export function rescaleInPlace(positions: F32, dim: number, scale?: number, center?: ArrayLike<number>): F32;
export function toLayoutSnapshot(G: LayoutGraph | LegacyDuck | NodeId[] | GraphSnapshot, weightAttr?: string | null): GraphSnapshot;   // undirected; legacy duck type walked once
export declare class LayoutGraph { readonly snapshot: GraphSnapshot; nodes(): NodeId[]; edges(): [NodeId, NodeId][]; getEdgeData(s: NodeId, t: NodeId, attr: string): number | undefined; }

/** Steppable layouts (force-directed CPU layouts and the GPU package's layout kernels). */
export interface LayoutSimulation {
    load(snapshot: GraphSnapshot, positions: F32): void;        // positions: the owner's stride-3 scene-unit array, read AND written in place
    step(iterations?: number): void | Promise<void>;           // GPU implementations are async (mapAsync readback); the GPU buffer is authoritative while stepping
    readonly settled: boolean;
    setFixed(mask: NodeMask): void;                             // the same bitmap layout as a bool column with role "fixed"
    setPosition(index: number, x: number, y: number, z: number): void;   // drag during simulation: a 12-byte write (writeBuffer on the GPU)
    dispose(): void;
}
```

`toLayoutSnapshot` returns its input UNCHANGED when it is already an
undirected `GraphSnapshot`; graphty-element therefore passes
`dm.undirected(s)` (its single cached derived graph, section 14.4) and the
layout package's own `WeakMap<GraphSnapshot, GraphSnapshot>` is used only
for legacy duck-typed and directed-snapshot inputs from external callers
(C8; one undirected copy per source, never two). `Node[]` input becomes an
edgeless snapshot and KK / BFS / planar keep their current error messages
when `edgeCount === 0`. Static layouts are one-shot `LayoutResult`
producers; force layouts and GPU layouts also implement
`LayoutSimulation`, whose kernels take the position STRIDE (3) as a
uniform and operate on the owner's stride-3 column directly, so no
per-frame `withComponents` copy exists in either direction. Layouts read
weights
via `snapshot.weights` when `weight === true` or a named edge column when
`weight` is a string; f64 scratch, f32 output (Q44). Generators
(`completeGraph`, `gridGraph`, ...) stay in the layout package (Q9), build
with `fromEdgeArrays` (ids preserved: `"r,c"` strings for grid, `"A0"` for
bipartite, integers elsewhere; edge insertion order and the private LCG
preserved) and return a `LayoutGraph` wrapper so `gridGraph(3, 4).nodes()`
keeps working for external users; the format itself exposes no
`nodes()` / `edges()`. `bipartiteGraph` adds a `partition` `u8` node
column. Attributes: `nodeMass` / `nodeSize` accept a `Float32Array`, a
column name or the legacy `Record`; `subsetKey` / `nlist` accept a `u32`
or `dict` column name (fixes the multipartite `console.warn` fallback);
`fixed` accepts a `NodeMask` or the name of a `bool` column with role
`fixed` (the same bit layout, section 5.3); KK `dist` accepts a
`Float32Array(n * n)` from `@graphty/algorithms` or the GPU package (Q10).
FA2 default mass uses `outDegree()` (self-loop once, matching today's
test). A re-run of a static layout on a graph that already has positions
takes `pos` from `fromPositionColumn(current, dim, scale, center)` and
`fixed` from the pinned mask, so an interactive add keeps every existing
node where the user left it (section 14.4).

Layout port 1 -- circularLayout (order-sensitive, O(n)): node `i` is
placed at angle `2 * PI * i / n` into `positions[dim * i + k]`, exactly
as today, because node index equals `nodes()` order (I14); the 3D branch
keeps the Fibonacci-sphere formula; the wrapper is
`toPositionMap(indexed.circular(toLayoutSnapshot(G), { scale, center, dim
}), s.ids)` and the existing tests pass unchanged.

Layout port 2 -- forceAtlas2: `const g = toLayoutSnapshot(s); const deg =
g.outDegree(); mass = resolveNodeVector(options.nodeMass, g, (i) => deg[i]
+ 1); w = resolveWeights(options.weight, g) /* Float32Array(arcCount) |
null */;` attraction is a CSR row loop `for (a = rowPtr[u]; a < rowPtr[u
+ 1]; a++) attract(u, colIdx[a], w === null ? 1 : w[a], ...)`; repulsion
is an all-pairs loop with no per-pair allocation; swing / traction /
adaptive speed as today over `Float64Array` scratch. The N x N x dim
`diff` and N x N `distance` arrays allocated per iteration today are gone;
the O(N * E) `getNodeDegree` scan is `outDegree()`. Attraction sums over
parallel arcs when the snapshot is a multigraph (the dense matrix
collapsed them; documented behaviour change; callers who want the old
behaviour pass `simplified()` first).

Chromatic re-baselining: one commit per package re-baselines stories
whose output changes for the documented reasons (neighbour order in
`bfsLayout` / `planarLayout`, weights now reaching KK / FA2 from
graphty-element, f32 output with `toBeCloseTo(1e-6)` in tests that
compared literal doubles, the single-RNG fix for missing `pos` nodes in
FR). The commit message lists the reasons.

### 14.4 @graphty/graphty-element

Ownership rules that the sketch below implements:

- The element owns ONE builder for the life of the graph. Its direction
  follows the graph-level config `data.directed: boolean | "auto"`
  (default `"auto"`): under `"auto"` the builder starts `directed: true`
  and unlocked, so the first data source's importer sets it from the file
  header (section 8.4) and an all-undirected GEXF / GML / GraphML loads as
  an undirected snapshot with one logical edge per file edge; a later
  source that disagrees is expanded (undirected -> directed with `{
  expand: true }`, or per-edge expansion into a directed builder). With an
  explicit boolean the element calls `lockDirected()` and importers
  report what they could not honour. Record-pushed data (`addNodes` /
  `addEdges` API calls) never changes the direction.
- One `EdgeObject` per PRIMARY logical edge: after any expansion the
  element skips edges whose role-`pair` row is set with `pair[e] < e`
  (mirror halves), `getStats` reports primary edges (`edgeCount - number
  of mirror rows`), and `getEdgeBetween` folds through `pair`. Under
  `"auto"` expansion only happens for genuinely mixed input.
- Edge identity is an element-assigned counter written into an edge
  column `{ name: "graphty.edgeId", dtype: "u32", role: "id", unique:
  true }` at `addEdge` time; `removeEdge(id)`, `getEdge(id)` and
  event-to-object resolution use `snapshot.edgeIndexOf(id)` (lazy `Map`,
  section 4.6) or the builder-side `Map` while `dirty`, never a scan.
- Positions are ELEMENT-OWNED, not snapshot-owned: `DataManager` keeps
  `positions: F32` of `3 * capacity` scene-unit floats outside every
  snapshot; after each freeze it grows it (prefix-stable: copy-extend to
  `3 * nodeCount`, new rows filled from the importer-seed column or `NaN`
  for "unplaced") or remaps it (`remapArray(positions, nodeRemap,
  nodeCount, NaN, 3)`), then attaches it BY REFERENCE with
  `snapshot.nodes.set("position", positions.subarray(0, 3 * nodeCount),
  { dtype: "f32", components: 3, role: "position", mutable: true }, {
  replaceRole: true })`, replacing the builder's importer-seed column
  (which exists only so file coordinates reach the element). Layout
  engines, drag and the GPU layout all write into this one array; nothing
  the user laid out is ever lost to a freeze (section 5.8).
- Node indices are assigned at add time (`node.index = builder.addNode(
  id)`); the id lookup loop runs only when `report.nodeRemap !== null`
  (walking the remap, no hashing), so an `UpdateManager` frame between an
  add and the next freeze never sees an undefined index.
- Layout-update triggers are COALESCED per operation-queue drain: however
  many `data-add` / `data-remove` operations a burst contains, `getSnapshot(
  )` runs once, and the M3 interactive-expand path goes through the same
  coalesced call rather than bypassing the queue.
- Engines iterate `DataManager`'s render collections (`nodes` values,
  `edgesByIndex`) rather than owning copies, and per-frame position reads
  write into caller-supplied vectors (`getNodePositionInto(index, out)`,
  `getEdgePositionsInto(e, outSrc, outDst)`), never into a shared
  `{x, y, z}` (which would alias source and destination).
- Two consumer-owned derived-graph caches, both keyed on the source
  snapshot: `undirected(s)` (the `DerivedGraph`, so `edgeRemap` is
  available to edge-result adapters) and `simplified(s)` for kernels that
  need a simple snapshot; and one `visible(s)` cache keyed on `(s.serial,
  hiddenMaskVersion)` holding the induced `DerivedGraph` and its
  undirected copy for "analyse visible only" (two freezes per hidden-set
  change, zero per algorithm afterwards; results for hidden nodes stay
  stale unless the adapter clears them). Layout engines receive the same
  `undirected(s).snapshot` object as the adapters.
- Edge-result adapters (kruskal, prim, girvan-newman, min-cut, bipartite
  matching, dijkstra `isInPath`, bellman-ford, floyd-warshall) run on a
  DERIVED snapshot whose edge indices are a different index space; they
  write back through the derived graph's `edgeRemap`: `for (e <
  s.edgeCount) { d = edgeRemap === null ? e : edgeRemap[e]; if (d !==
  INVALID_INDEX) addEdgeResult(edgesByIndex[e], name, vec[d]); }`, so both
  halves of a collapsed reciprocal pair receive the MST / cut / path flag.
- `weightFromPath` is `data.knownFields.edgeWeightPath` with the element
  default `"weight"` (the io importers' default; today's converter default
  `"value"` is never read, so this is a documented behaviour change, open
  question 5). Adapters that take a NAMED edge column as weight (MaxFlow /
  MinCut capacity, KK / FA2 `weightProperty`) use `expandEdges(snapshot,
  column.data)` cached per `(snapshot.serial, column name, column.version)`
  so the gather runs once per mutation, not per algorithm call.
- Lifecycle: after every freeze `DataManager` emits `snapshot-replaced`
  `{ previous, next, report }`; listeners release per-snapshot resources
  (the GPU accelerator's `release(previous)` destroys its `GPUBuffer`s,
  which no `WeakMap` can do for it; caches drop their entries; the
  element calls `previous.dropCaches()`), so an interactive session holds
  at most one superseded snapshot (section 15.2 costs it).

```typescript
class DataManager {
    private readonly builder = new GraphBuilder({ directed: true, addMissingNodes: true });   // "auto": importers may setDirected() while empty; an explicit config calls lockDirected()
    private snapshotCache: GraphSnapshot | null = null;
    private snapshotMutation = -1;
    private readonly undirectedCache = new WeakMap<GraphSnapshot, DerivedGraph>();   // toUndirected() once per snapshot (C8); the whole DerivedGraph, for edgeRemap
    readonly nodes = new Map<NodeIdType, NodeObject>();                          // render objects, id-keyed (public shape unchanged)
    readonly edgesByIndex: (EdgeObject | undefined)[] = [];                      // edge index -> render object; re-keyed only on compaction; undefined for mirror halves
    private positions: F32 = new Float32Array(3 * 1024);                         // element-owned scene-unit positions, 3 per node, grown by doubling
    private readonly seedColumn: ColumnHandle = this.builder.declareNodeColumn({ name: "graphty.importPosition", dtype: "f32", components: 3, role: "position", mutable: false });
    private readonly edgeIdColumn: ColumnHandle = this.builder.declareEdgeColumn({ name: "graphty.edgeId", dtype: "u32", role: "id", unique: true });
    private readonly listeners: ((previous: GraphSnapshot | null, next: GraphSnapshot, report: FreezeReport) => void)[] = [];

    getSnapshot(): GraphSnapshot {
        if (this.snapshotCache === null || this.snapshotMutation !== this.builder.mutationCount) {
            const previous = this.snapshotCache;
            const { snapshot, report } = this.builder.freezeWithReport({ label: "graphty-element" });
            if (report.nodeRemap !== null) {
                this.positions = remapArray(this.positions, report.nodeRemap, snapshot.nodeCount, Number.NaN, 3);
                for (const node of this.nodes.values()) { node.index = report.nodeRemap[node.index] ?? INVALID_INDEX; }   // walk the remap; no hashing
            } else {
                this.growPositions(snapshot);                                    // copy-extend; new rows seeded from the import column or NaN
            }
            if (report.edgeRemap !== null) { this.rekeyEdges(report.edgeRemap); }   // one pass; removal bursts only
            snapshot.nodes.set("position", this.positions.subarray(0, 3 * snapshot.nodeCount),
                { dtype: "f32", components: 3, role: "position", mutable: true }, { replaceRole: true });
            this.snapshotCache = snapshot; this.snapshotMutation = this.builder.mutationCount;
            for (const l of this.listeners) { l(previous, snapshot, report); }   // "snapshot-replaced": GPU release(previous), cache drops, previous.dropCaches()
        }
        return this.snapshotCache;
    }
    undirected(s: GraphSnapshot): DerivedGraph {                                 // nine adapters and every layout engine share this one object
        let u = this.undirectedCache.get(s);
        if (u === undefined) { u = s.directed ? s.toUndirected() : { snapshot: s, nodeOrigin: null, edgeOrigin: null, nodeRemap: null, edgeRemap: null, blockSizes: null, report: { droppedEdges: 0, mergedEdges: 0 } }; this.undirectedCache.set(s, u); }
        return u;
    }
}
```

Each `EdgeObject` carries the element-assigned stable `id` (the counter
above; its string form is what events expose) and a current `index`;
only `edgesByIndex` is re-keyed on compaction, so event identity never
changes (section 18 decision 5 confirms the string form). Per mutation path of
research note 04:

| Path | What happens |
| --- | --- |
| `addNodes(records)` (M1/M2/M3) | per record: `node.index = builder.addNode(id)`; create the `NodeObject` (mesh, styles, data bag exactly as today); if `data.position` exists `builder.setNodeValue(seedColumn, index, [x, y, z])` (scaled to scene units per `data.knownFields.positionScale`); an id that already exists is a merge (`addNodeRecord` last-write-wins, section 6.6). No freeze. |
| `addEdges(records)` (M1/M2/M3) | per record: `e = builder.addEdge(srcId, dstId, weightFromPath ?? 1)`; `builder.setEdgeValue(edgeIdColumn, e, nextEdgeId++)`; unknown endpoints are created by the builder (`bufferedEdges` retry loop deleted). `EdgeObject`s for sources that emit edges before nodes (CSV edge lists, section 8.4) are created at `data-loading-complete` in one pass over `edgeList()` of the first freeze; for record sources that emit nodes first they are created inline. Duplicate `(src, dst)` pairs are now kept -- `EdgeMap` and the "duplicate Edge" throw are deleted; `getEdgeBetween(src, dst)` is `builder.findEdges(u, v)[0]` while `dirty` and `snapshot.findArc` + `arcToEdge` (first parallel, folded through `pair`) otherwise. No freeze. |
| `removeNode(id)` (M4) | `removed = builder.removeNode(id)`; dispose the `EdgeObject`s for those indices (fixes the TODO: incident edges are now removed) and the mesh; delete from `nodes`. A revive (`addNode` of the same id before the next freeze) is treated as an add: the position row is retained, the disposed `EdgeObject`s are not recreated (section 6.6). |
| `removeEdge(id)` (M5) | `builder.removeEdge(edgeIndexOf(id))`; dispose the `EdgeObject`. |
| `updateNodes(updates)` (M6) | `Object.assign(node.data, update)` and restyle as today; a `position` update writes `positions` directly (no builder involvement, no re-freeze). |
| algorithm results (M7) | adapters call `getSnapshot()` once, run `indexed.*` (or the injected GPU accelerator), then `for (i < n) addNodeResult(snapshot.ids.idOf(i), name, vec[i])` (Option A; render objects and Proxy semantics untouched); edge results via `edgesByIndex[e]` through `edgeRemap` as above; later (Option B) results also land in `snapshot.nodes.set("graphty.<type>.<name>", vec)`. |
| `runAlgorithmsOnLoad` | moves from the per-chunk `data-added` listener to `data-loading-complete` (Q16), so a load freezes once. |
| layout set (M10) | `LayoutManager._setLayoutInternal` calls `engine.load(dm.undirected(getSnapshot()).snapshot, positions)` for `SimpleLayoutEngine` subclasses; ngraph / d3 engines keep their incremental feed and gain `removeNode` / `removeEdge`. |
| topology change with an active layout (M3/M4/M5) | on `snapshot-replaced` the manager calls `engine.reload(undirectedSnapshot, report, positions)`. Static engines re-run with `pos = fromPositionColumn(positions, ...)` and `fixed = pinned mask`, so existing nodes keep their coordinates and only new nodes are placed -- the cost is a full layout run (a 100k-node FA2 re-run is seconds, not the 30 ms of the re-freeze; a static layout is re-run on the next animation frame after the burst, and the element may choose to place new nodes at their neighbours' centroid without a re-run, a product decision left open). ngraph / d3 engines feed the delta. `LayoutSimulation` engines keep stepping on the new array. |
| drag (M11) / per-frame (M12) | `SimpleLayoutEngine` reads and writes `positions` (index-aligned, stride 3, scene units); `getNodePositionInto(index, out)` reads `positions[3 * index + k]`; drag writes the same three floats (or `simulation.setPosition` while a simulation is stepping, the GPU buffer being authoritative then); `FixedLayout` reads the same array; `column.markDirty()` once per frame before any GPU upload of the position column. |
| `getStats` / counts | `builder.nodeCount`, `builder.edgeCount` minus mirror halves. |
| selection / style (M8/M9) | unchanged (no topology). |
| hide / filter + "analyse visible" | `visible(s)` cache (above); `scatterArray` writes results computed on the induced snapshot back into the parent's index space through `nodeOrigin`. |

`toAlgorithmGraph` is replaced by a two-line selector per adapter: `const
s = dm.getSnapshot();` then `indexed.x(s)` for directed adapters
(pagerank, degree, scc, hits) or `indexed.x(dm.undirected(s).snapshot)`
for the undirected ones (connected components, girvan-newman, label
propagation, leiden, louvain, kruskal, prim, bipartite matching) and for
the "directed with reverse edges" group (betweenness, closeness,
eigenvector, katz, dijkstra, dfs, bfs, bellman-ford, floyd-warshall),
which today mirror edges by hand and semantically want the undirected
view. MaxFlow / MinCut pass the cached `expandEdges` of the capacity
column as the per-arc `weights` override. `graphUtils.buildAdjacencyList`,
`buildWeightedAdjacencyList`, `graphConverter.ts` and `EdgeMap` are
deleted. Data sources keep their output shape until IO1, after which each
`DataSource` fetches bytes and streams into the io importer with the
builder as the sink, `format-detection.ts` becomes the io registry's
`sniff` table and `ErrorAggregator` maps onto `ImportReport`. The
element-level id coercion option `data.knownFields.idCoercion:
IdCoercion` (default `"canonical"` for text sources, `"keep"` for JSON;
section 4.1) replaces the silent phantom-node behaviour a JSON numeric-id
node list plus a CSV string-id edge list would otherwise produce. Not
solved by the format (research note 04 section 8.5): per-node Babylon
mesh creation, JMESPath style selection and the on-change Proxies still
dominate at 100k nodes.

### 14.5 @graphty/webgpu-graph-algorithms

Moves into the monorepo as `webgpu-graph-algorithms/` with the note 06
checklist, `@webgpu/types`, a browser-only vitest project (Playwright
Chromium on the real GPU per its `HEADLESS_GPU_REPORT.md`), no
`browserslist`, and `noUncheckedIndexedAccess` switched OFF in its
tsconfig on move-in so that it shares row-loop code and the
result-writing loop with the other consumers (section 12.1; the format's
declarations are still verified under the flag by the strict-consumer
compile, section 16.6). Its `CSRGraph { numVertices, numEdges, rowPtr,
colIdx, edgeWeights? }` and `EdgeListGraph` types are deleted; every
kernel entry takes `GraphSnapshot` and reads `nodeCount`, `arcCount`,
`rowPtr`, `colIdx`, `weights`, `flags`, `arena` (C21); `parents` becomes
`Uint32Array` with `INVALID_INDEX`. Upload planning per section 10.3:
the arena (hot prefix) when it and every segment fit the device limits,
else per array; raised limits requested from the adapter first; windows
at 64-arc boundaries on arc ranges above `maxStorageBufferBindingSize`;
2D dispatch or grid-stride above 16,776,960 invocations (65,535 x 256,
section 10.6); the `override USE_PERM` pattern for identity permutations
(section 10.1). Uploaded buffers are cached in a `WeakMap` keyed on the
typed-array object (`rowPtr` for a core, the view array for a view, the
`gpuView()` array for a column, dropped on `markDirty()` via
`column.version`) and released explicitly through `release(snapshot)`,
which graphty-element calls from `snapshot-replaced` (GPU memory is not
collected by a `WeakMap`). It consumes `reverse()`, `coo()`,
`edgeList()`, `degreeOrder({ of })`, `mate()` and `gpuView()` columns,
computes the weighted-degree normaliser on the device, and returns
index-aligned typed arrays; graphty-element injects it as `runAlgorithm(
snapshot, { accelerator: gpu })` and uses the same result-writing loop as
for `indexed.*`; GPU layout kernels implement `LayoutSimulation` (section
14.3) over the element's stride-3 position array; the GPU package itself
throws when no device is available and never falls back.

### 14.6 Landing order and the dual-API window (G13)

| Phase | Package | Content | Gate |
| --- | --- | --- | --- |
| F1 | graph-format | core package at 0.1.0: snapshot, builder, id map, columns, views, derived graphs, populate, wire, tests, benchmarks; iterates as 0.x on master with no dependents | invariant, property, differential (vs the copied legacy `Graph`) and wire tests green; freeze <= 30 ms directed / <= 60 ms undirected on the 100k/1M benchmark |
| A1 (branch) | algorithms | `toSnapshot(Graph)` with `mutationCount` memoisation and `weightDtype: "f64"`; the differential harness (legacy result vs the same computation replayed through a snapshot's views for the properties a snapshot can answer directly: node sets, neighbour sets, degrees, edge multisets, weights); public signatures UNCHANGED (a legacy Map-of-Maps algorithm cannot consume a snapshot until its indexed implementation exists, so the widening waits for A2) | every existing test's graph converts with `equalsTopology` / neighbour-set parity, against the 0.x format, on the branch |
| F2 | graph-format | `1.0.0` cut on master (`feat!:` commit or `nx release version 1.0.0`); invariants frozen | A1 branch green; rule 5 of section 13.5 now lets consumers merge |
| A1 | algorithms | merge | CI dependency check passes |
| A2 | algorithms | `indexed` namespace: all 95+ functions ported; every public function's first parameter widens to `Graph \| GraphSnapshot` and dispatches to `indexed.*` through `toSnapshot`; legacy entry points become facades; `optimized/*` and `graphToMap` unreachable internally | differential tests equal within tolerance (weighted results exact through the f64 override, section 14.1); view checksums asserted after every call; benchmark: BFS / PageRank / Louvain / CC old vs new |
| L1 | layout | `toLayoutSnapshot`, `indexed` layouts, wrappers, `LayoutGraph` generators | tests green; Chromatic re-baseline commit |
| E1 | graphty-element | `DataManager` owns the builder; adapters and `SimpleLayoutEngine` subclasses use `indexed.*`; position column; `EdgeMap` removed; `runAlgorithmsOnLoad` on load-complete; existing `DataSource`s push records | element tests + stories green; Chromatic re-baseline |
| W1 | webgpu-graph-algorithms | move-in; consume snapshots; rename fields; `noUncheckedIndexedAccess` off; `release()` and the array-keyed upload cache | browser tests green |
| D1 | algorithms, layout | `@deprecated` tags on legacy `Graph` input paths, `graphToMap`, `CSRGraph`, positional layout signatures (only now, after E1 removed the last internal callers) | lint green |
| IO1 | graph-io (new) + graphty-element | parsers moved out of `DataSource` subclasses into `@graphty/graph-io` importers targeting `GraphSink` (scalar push); `DataSource`s become wrappers; exporters; corpus moves | corpus round-trip tests; parse -> freeze benchmark for CSV / JSON / GEXF |
| 2.0 | algorithms, layout | remove facades, the legacy `Graph` class, Map overloads, positional signatures; promote `indexed.*` to top level; any accumulated breaking format change ships as format 2.0 in the same window | |

A2, L1 and E1 can proceed in parallel after A1 merges. The dual-API
window is A1 through 2.0: legacy input types and result shapes are
unchanged; `indexed.*` is additive; graphty-element and the WebGPU package
are the only consumers of `indexed.*` until 2.0. Root `CLAUDE.md`'s
algorithm pattern changes to `algorithmName(snapshot: GraphSnapshot,
options?: Options): Result` (C15). Ownership of shared helpers: `foldArcs`,
`expandEdges`, `remapColumn` / `remapArray` / `gatherColumn` /
`gatherArray` / `scatterArray`, `renumberPartition`, `ids.toMap / toStringMap /
entries / toRecord / stringIndex`, `isGraphSnapshot` -> graph-format;
`IndexedMinHeap`, `IntUnionFind`, bitsets, ring queue, APSP ->
algorithms; `toPositionMap`, `fromPositionMap`, `toPositionColumn`,
`fromPositionColumn`, `rescaleInPlace`, `LayoutSimulation`, generators ->
layout; importers, exporters, sniffing, `children` CSR, the io contract
types -> graph-io; upload planning, chunking, readback, `release` ->
webgpu-graph-algorithms.

---

## 15. Performance and memory model

### 15.1 Bytes per node and per edge

`n` nodes, `E` logical edges, `L` self-loops, `A` arcs (`A = E` directed;
`A = 2E - L` undirected). Benchmark graph: n = 100,000, E = 1,000,000,
L = 0.

| Component | Bytes | Directed weighted, perms materialised | Directed weighted, identity perms | Undirected weighted |
| --- | --- | --- | --- | --- |
| `rowPtr` | 4(n + 1) | 0.4 MB | 0.4 MB | 0.4 MB |
| `colIdx` | 4A | 4.0 MB | 4.0 MB | 8.0 MB |
| `arcToEdge` | 4A (0 while identity) | 4.0 MB | 0 | 8.0 MB |
| `edgeToArc` | 4E (0 while identity) | 4.0 MB | 0 | 4.0 MB |
| `weights` | 4A (0 when unweighted) | 4.0 MB | 4.0 MB | 8.0 MB |
| core total | | 16.4 MB (16,400,128 B) | 8.4 MB (8,400,128 B) | 28.4 MB (28,400,128 B) |
| core total, unweighted | | 12.4 MB | 4.4 MB | 20.4 MB |
| `reverse()` | 4(n + 1) + 4A colIdx + 4A fwdArc + 4A weights (+ 4A lazy arcToEdge) | 12.4 MB (+4) | 12.4 MB (+4) | 0 (aliased) |
| `coo().src` | 4A | 4.0 MB | 4.0 MB | 8.0 MB |
| `edgeList()` | 8E (+4E weights unless aliased) | 12 MB | 8 MB | 12 MB |
| `outDegree` / `inDegree` / `degree` / `selfLoopsPerNode` | 4n each | 0.4 MB | 0.4 MB | 0.4 MB |
| `weightedOutDegree` / `weightedInDegree` / `weightedDegree` / `selfLoopWeight` | 8n each (f64, CPU only) | 0.8 MB | 0.8 MB | 0.8 MB |
| `mate()` | 4A | n/a | n/a | 8.0 MB |
| `degreeOrder()` | 4n + 20 | 0.4 MB | 0.4 MB | 0.4 MB |
| id map `identity` | 0 | 0 | 0 | 0 |
| id map `dense` | 4n + 4(maxId + 1) | 0.4-1.2 MB | | |
| id map `numeric` | 8n + Map ~40n | 4.8 MB | | |
| id map `string` (8-char ids) | ~8n array entries + ~32n strings + ~60n Map (+ 1.3 MB Utf8 store when materialised) | ~10 MB | | |
| f32 / i32 / u32 column | 4 rows x components | 0.4 MB per node column, 4 MB per edge column | | |
| f64 column | 8 rows x components (+ 4 rows f32 shadow if uploaded) | 0.8 MB / 8 MB | | |
| dict column | 4 rows + dictionary | 0.4 MB / 4 MB | | |
| validity bitmap, `bool` column, `NodeMask` / `EdgeMask` | rows / 8 (rounded to 4 bytes) | 12.5 KB / 125 KB | | |
| `u8` column | rows x components (rounded to 4 bytes) | 100 KB / 1 MB | | |
| position column | 12n, mutable | 1.2 MB | | |
| legacy `Graph` class (same graph) | | 243 MB | | |
| legacy `CSRGraph` (undirected, eager reverse, Map ids) | | ~30 MB | | |

Doubling factor summary: an undirected graph costs 2x in `colIdx`,
`arcToEdge`, `weights` and `coo().src` but 0x in `reverse()`; a directed
graph pays 1x plus the reverse view when a pull kernel or in-neighbour
algorithm asks for it.

### 15.2 Builder staging and freeze peak

Staging per edge: `src` 4 + `dst` 4 + `weight` 4 (f32; 8 for f64) +
`nextOut` 4 + `nextIn` 4 + `edgeAlive` 1/8 = ~20 B at exact capacity, up
to 2x with doubling slack (1M edges at capacity 1,048,576: ~21 MB).
Staging per node: `firstOut` + `firstIn` 8 + `ids` slot 8 + Map entry
~40 (number) / ~60-80 (string) + the string itself; 100k string ids: ~8-10
MB. Freeze transients: `cnt` 4(n + 1) + `byTarget` 4A + (undirected) the
arc triple 12A: directed 4.4 MB, undirected 32.4 MB.

| Phase (undirected weighted, string ids, one f64 edge column, one f32 node column) | Bytes |
| --- | --- |
| staging (src, dst, weight, lists) | 21 MB |
| staging columns | 8.4 MB |
| id structures (Map + strings + array) | ~10 MB |
| freeze transients | 32.4 MB |
| snapshot core (arena) | 28.4 MB |
| snapshot columns (gathered copies) | 8.4 MB |
| peak during step 11 (staging retained) | ~109 MB |
| steady state, builder kept | ~76 MB |
| steady state after `release: true` | ~47 MB (core + columns + id structures) |
| steady state, builder kept, one superseded snapshot still referenced (the interactive-expand window between a freeze and the listeners' `snapshot-replaced` cleanup) | ~76 MB + 28.4 MB core + its cached `toUndirected()` copy (up to 28.4 MB) + its views; released when the last consumer drops it |

Directed weighted, same setup: ~21 + 8.4 + 10 + 4.4 + 16.4 + 8.4 = ~69 MB
peak, ~34 MB after release. These are the numbers every table in this
document uses; the benchmark suite (15.5) replaces them with measurements
before 1.0.

### 15.3 Target graph sizes

| Tier | Nodes / edges | Core (undirected weighted) | With reverse + coo + 8 f32 node columns + `string` ids | Fits |
| --- | --- | --- | --- | --- |
| mobile tab (iOS Safari, low hundreds of MB resident before termination) | 100k / 1M | 28.4 MB | ~55 MB | yes; graphty-element's per-node objects dominate |
| desktop tab, interactive | 1M / 10M | 284 MB | ~400 MB + ~100 MB ids | yes (`ArrayBuffer`s are off-heap in V8; renderer limits are in the GBs) |
| desktop tab / Node batch (worker) | 10M / 100M | 2.8 GB | ~4.0 GB | core only, numeric ids, `arena: false` because a single 2.8 GB `ArrayBuffer` exceeds the ~2 GiB per-allocation ceiling in some engines; per-array buffers of 800 MB are fine in V8; GPU needs raised limits and windowed bindings |
| beyond (Friendster 65M / 1.8B) | | | | out of scope for a tab; the index ceiling is 4.29e9 arcs, memory is the limit first |
| WebGPU defaults | up to 33M arcs per single binding (128 MiB), 67M per buffer (256 MiB); raised limits on discrete GPUs remove this | | | GPU package windows above that |

Engine ceilings to verify in the benchmark suite (G5): V8 `kMaxByteLength`
for `ArrayBuffer` / `TypedArray` (2^53 - 1 on 64-bit V8 12.x; Chromium
enforces a lower renderer limit), JavaScriptCore `MAX_ARRAY_BUFFER_SIZE`,
`performance.measureUserAgentSpecificMemory()` under cross-origin
isolation.

### 15.4 Expected freeze cost breakdown (100k nodes / 1M edges, Node 22, i9-14900, single thread)

Measured: CSR from typed edge arrays (one count + scan + scatter, directed,
unsorted, no permutations) 20 ms. Everything else is a target extrapolated
from it and must be confirmed by `benchmarks/freeze.bench.ts` before 1.0.

| Phase | Directed (1M arcs) | Undirected (2M arcs) | Notes |
| --- | --- | --- | --- |
| builder: id interning, 100k string ids | 15-25 ms | same | `Map.set` per node; paid in `addNode`, not at freeze |
| builder: `addEdge` x 1M | 25-40 ms | same | two `Map.get`, five typed writes per edge |
| compaction (only after removals) | 32 ms measured (was 10-15) | 32 ms measured (was 10-15) | one gather pass; corrected 2026-09-16, see 15.6 |
| arc materialisation (step 3) | 0 | 5 ms | sequential writes |
| identity check (step 4) | < 1 ms | -- | |
| pass 1 counting sort by target | 8 ms | 15 ms | random scatter, cache-miss bound |
| pass 2 counting sort by source + writes | 10 ms | 18 ms | writes straight into the arena |
| duplicate walk (non-keep policy) | 2 ms | 4 ms | |
| weights + flags | 2 ms | 3 ms | |
| id map kind detection | < 1 ms | < 1 ms | Map shared, no copy |
| columns (8 node f32, 2 edge f32) | 3-5 ms | 3-5 ms | memcpy class |
| arena allocation | < 1 ms | < 1 ms | |
| freeze total | 25-30 ms | 45-55 ms | budget: <= 30 / <= 60 ms |
| `reverse()` | 15-25 ms | 0 | |
| `coo()`, degrees | 1-3 ms each | 2-4 ms | |
| `isSymmetric()` (given reverse) | 3-5 ms | 0 | |
| `toUndirected()` of a directed graph | ~50 ms | n/a | a full freeze |
| `toBytes()` | 5-10 ms | 8-12 ms | memcpy of the core |
| `toWire({ transfer: true })` + `postMessage` | < 1 ms | < 1 ms | pointer moves |
| `fromBytes` with `validate: "full"` | 15-25 ms | 25-35 ms | dominated by I4 / I7 checks |

The sorted-row invariant costs one extra counting pass (about +8 ms per
1M arcs); that is the price of binary-search `findArc`, merge
intersections and adjacent dedupe everywhere else, paid once per
mutation. Interactive expand on graphty-element (add 1 node + 20 edges to
a 1M-edge graph) is ONE coalesced re-freeze at ~30 ms directed (plus ~50
ms for the cached `toUndirected()` copy when a directed graph is shown
with undirected adapters or layouts): one dropped frame at most, and the
mark-dirty model defers it to the next algorithm or layout request, which
is already asynchronous. What the re-freeze does NOT include is the
layout: a static layout re-run on 100k nodes is a full FA2 / KK run
(seconds), which is why section 14.4 seeds it from the current positions
and pins existing nodes rather than pretending the add costs 30 ms. The
650 ms / 243 MB legacy `Graph` build, the 1021 ms `graphToMap` and the
2376 ms `toCSRGraph` are replaced by one freeze per mutation; per-
algorithm conversion cost is zero once the consumer's derived-graph
caches (`undirected`, `simplified`, `visible`) are warm, and "analyse
visible only" costs two freezes per change of the hidden set, never per
algorithm.

### 15.5 Benchmark plan (G12)

`graph-format/benchmarks/` (tsx, `nx run graph-format:benchmark`), each
benchmark reporting the median of 5 runs with `process.memoryUsage()`
deltas under `--expose-gc`, results appended to
`benchmarks/results/<host>-<node>.json` with Node version and CPU model
(the `algorithms/benchmarks/benchmark-sessions.json` pattern):

1. `freeze.bench`: `fromEdgeArrays` identity ids at 10k / 100k / 1M / 10M
   edges (Watts-Strogatz and R-MAT generators in `datasets.ts`, plus SNAP
   `com-LiveJournal` when present on disk); builder with numeric and string
   ids (`addNode` x n + `addEdge` x m + `freeze`); directed and
   undirected; `duplicateEdges: "sum"`; 0 / 4 / 16 attribute columns;
   `weightDtype: "f64"`; compaction after 10% removals.
2. `views.bench`: `reverse`, `coo`, degrees, `mate`, `degreeOrder`,
   `isSymmetric`, `toUndirected`, `inducedSubgraph` (50%), `contract`
   (1000 blocks).
3. `ids.bench`: `indexOf` throughput per kind; `toMap`; `entries`;
   `idsSlice`.
4. `wire.bench`: `toWire` / `fromWire` copy vs transfer through
   `worker_threads`; `toBytes` / `fromBytes` at each validation level.
5. `pipeline.bench` (in graph-io at IO1): CSV 1M edges, node-link JSON 1M,
   GEXF 100k: parse -> builder -> freeze end to end (the user-visible
   number; text parsing dominates).
6. `algorithms/benchmarks/` (existing harness, after A2): BFS, PageRank,
   connected components, Louvain on the legacy `Graph` path vs `indexed`.

CI gate: an opt-in `perf` vitest project (not in the default shard)
asserts freeze(1M) <= 3x the checked-in baseline for the runner class (a
3x threshold catches algorithmic regressions, not shared-runner noise);
the default suite includes one 1M-edge `fromEdgeArrays` + `reverse` +
`toBytes` smoke test under a 2 s ceiling; the full benchmark runs on the
pre-push hook when `BENCH=1` and results are committed alongside changes
that touch `freeze.ts`.

### 15.6 Measured corrections to 15.4 (2026-09-16, F1 landing)

The 15.4 table said every row but the 20 ms CSR build was "a target
extrapolated from it and must be confirmed by `benchmarks/freeze.bench.ts`
before 1.0". This is the first such confirmation. It corrects one row; the
rest of 15.4 stands or is better than budgeted.

Measured on the F1 landing tree (`graph-format` in graphty-monorepo, Node
22.22.1, i9-14900KF, single thread) with `freezeWithReport({ profile:
true })`, 100k nodes / 1M directed edges, median of 5, the removal case
tombstoning 99,930 of 1,000,000 edges before the freeze:

| Phase | No removals | After 10 percent removed |
| --- | --- | --- |
| `compact` | 0.02 ms | 31.78 ms |
| `sort` | 20.57 ms | 17.77 ms |
| `weights` | 0.01 ms | 0.01 ms |
| `ids` | 0.29 ms | 0.29 ms |
| `columns` | 0.03 ms | 0.02 ms |
| `snapshot` | 0.05 ms | 0.05 ms |
| total | 21.04 ms | 52.50 ms |

The correction: **compaction after removals costs about 32 ms, not the
10-15 ms of 15.4 and 6.7.** The design's estimate was wrong, not the code.
The estimate assumed "one gather pass"; the pass is a gather, but the
dominant term is the incidence-list rebuild, which is four random accesses
per surviving edge (`firstOut` / `firstIn` heads plus the `nextOut` /
`nextIn` links) into arrays far larger than L2. That is cache-miss bound
in the same way the counting sort is, so it lands in the same order as the
sort it precedes rather than in the memcpy class the estimate assumed.

Two independent measurements agree: `benchmarks/freeze.bench.ts` reports
40.9 ms for the whole re-freeze, and the phase profile above attributes
31.8 ms of its own 52.5 ms total to `compact` (the two totals differ
because the harness and this profile build the removal case differently;
the phase attribution, which is what 15.4 budgets, is the number that
matters and reproduces).

Not optimised further at F1, deliberately. Compaction runs only after
removals, the 1M-edge re-freeze remains inside the one-dropped-frame
budget 15.4 argues for, and the floor is structural: any rebuild of the
incidence lists pays those four random accesses. Revisit only if a
consumer shows removal-heavy editing as a hot path.

Everything else measured at the same time was at or better than 15.4:
freeze total 21.04 ms directed against a 25-30 ms budget, 38.5 ms
undirected against 45-55 ms.

---

## 16. Testing strategy

### 16.1 Invariant and property tests

`test/invariants.test.ts` implements I1-I18 as functions over any
`GraphSnapshot` (the same helpers `validate()` uses) and runs them on
hand-written fixtures (empty graph, one node, one self-loop, an
undirected graph whose edges are all self-loops (`arcCount ===
edgeCount`, identity permutation, `arcToEdgeIsIdentity === false`),
parallel edges, an expanded mixed graph with a `pair` column, a
`setDirected(true, { expand: true })` conversion, karate, a grid, the
research-note-07 corpus loaded through `fromRecords`) and on generated
graphs. `fast-check` (hoisted from graphty-element) drives model-based
tests: an arbitrary sequence of builder commands (`addNode` / `addEdge`
with random ids of both types, weights including 0 / negative / Infinity,
duplicates, self-loops, `removeNode`, `removeEdge`, `setEdgeWeight`,
column writes, `freeze` with random options) is applied both to a
`GraphBuilder` and to `test/helpers/model-graph.ts` (a ~150-line
Map-of-Maps reference with the same policies); after every freeze the
snapshot's neighbour sets, degrees, edge list, self-loop count, multigraph
flag, id map and attribute values must equal the model's and `validate({
level: "full" })` must pass. Every policy enum (`duplicateEdges`,
`selfLoops`, `directed`, `weightDtype`, `addMissingNodes`) is a fast-check
dimension; shrinking gives minimal counterexamples. Named properties:

- P1 I1-I18 hold after every freeze.
- P2 node index equals first-seen order of live ids; edge index equals
  `addEdge` order minus removed / merged edges.
- P3 `edgeRemap` / `nodeRemap` map every previous live index to an index
  whose endpoints and id match (or to `INVALID_INDEX` for removed, or to
  the survivor for merged), and each is `null` exactly when its index
  space was not renumbered (I16), independently of the other; the first
  freeze after a removal reports a remap over the builder's own index
  space.
- P4 undirected pairing: `mate(mate(a)) === a`; `arcToEdge[a] ===
  arcToEdge[mate(a)]`; for parallel edges the k-th / k-th pairing holds.
- P5 `arcCount` formula; `edgeCount` equals the number of arcs with `a ===
  edgeToArc[arcToEdge[a]]`.
- P6 `findArc` agrees with a linear scan; `arcsBetween` / `multiplicity`
  with counting; `edgeSource` / `edgeTarget` with the model.
- P7 duplicate policies: `"error"` throws iff a duplicate exists; merge
  modes yield `flags.multigraph === false` and the reduced weight;
  survivor rows carry the documented edge's attributes; `edgeRemap`
  names the survivors.
- P8 views agree with brute force: `reverse()` vs the transposed edge
  list; `edgeList()` vs the model's edges in insertion order and
  orientation; degrees vs counts; `isSymmetric()` vs a set comparison.
- P9 derived graphs: `toUndirected` is idempotent; `transpose` twice is
  identity; `contract` with the identity partition equals the source;
  `inducedSubgraph` of all nodes equals the source; `filterEdges` with all
  bits set is a copy; `relabel` with the identity is a copy; `refersTo`
  columns (including the `u32` child of a `refersTo` list column) are
  rewritten consistently; every same-node-space derived graph's `nodes`
  IS the source's `AttributeTable` object and `withColumns()` is the only
  operation that returns a different table.
- P9b remap / origin consistency: for every edge-merging operation
  (`toUndirected` reciprocal pairs, `simplified`, `contract`, a merging
  freeze) `edgeRemap[edgeOrigin[d]] === d` for every derived edge `d`,
  every source edge maps to a survivor or to `INVALID_INDEX` (dropped),
  and no merged edge maps to `INVALID_INDEX`.
- P9c contraction: `contract(identity)` preserves `weightedDegree()` and
  `totalWeight()`; an intra-block undirected edge contributes weight `w`
  to its self-loop (never `2w`); non-dense labels give the same result as
  their `renumberPartition` image; `blockSizes` sums to `nodeCount`.
- P10 id map: `indexOf(idOf(i)) === i`; `indexOf(missing) ===
  INVALID_INDEX`; kind selection follows section 4.2; `1` and `"1"` are
  distinct; `-0` and `NaN` per SameValueZero; a lone-surrogate id is
  `E_INVALID_ID`; the shared builder Map never exposes indices `>=
  nodeCount`; `"canonical"` coercion is injective on text.
- P11 determinism (I15): the same command log yields byte-identical
  `toBytes()` output twice (modulo `producer`), and the output does not
  change when `arcToEdge` / `edgeToArc` getters or any view are touched
  between the two calls; mutating the builder after a freeze does not
  change the snapshot (checked by checksum, I18); views are unchanged
  after every `indexed.*`-style consumer call (checksum).
- P12 alignment (I10): every public 4-byte array, view and GPU-bound
  column array is a view over a plain `ArrayBuffer` with `byteOffset % 4
  === 0`, `byteLength % 4 === 0`; `f64` arrays have `byteOffset % 8 ===
  0`; arena segments are 256-aligned relative to `arena.byteOffset` and
  zero-length arrays have `null` segments; `paddedU32View()` covers the
  `u8` column's byte range; a `bool` column's `data` is
  `ceil(rows / 32)` words; `gpuView()` of an f64 column is a
  `Float32Array` of the right length; `set()` of a 4-byte array of ANY
  length attaches by reference (`column.data === input`).

### 16.2 Differential tests against the legacy Graph class

`test/differential.test.ts` builds the same random graphs with a copy of
the legacy `Graph` class (`test/helpers/legacy-graph.ts`, so the format
has no dependency on algorithms) and with `GraphBuilder`, and compares
node sets, neighbour sets (order-insensitive), degrees (with the self-loop
convention), edge multisets with weights and `hasEdge` for random pairs.
In `@graphty/algorithms` (phase A2) every ported algorithm runs both ways
on the same inputs and results are compared after facade conversion
(exact for discrete results, `1e-9` relative for f64 scores -- honest for
weighted algorithms because the facade passes the f64 shadow through the
per-arc `weights` override, section 14.1 -- `1e-5` for f32 GPU parity,
order-agnostic for component lists); every snapshot in the suite is
frozen with `checksum: true` and `validate({ checksum: true })` runs
after each call so a write into a shared view fails the test; the
result-type table of research note 01 section 8 is the checklist of
adapters to write.

### 16.3 Serialisation and transfer round trips

`toWire -> structuredClone -> fromWire`; `toWire({ transfer: true }) ->
worker_threads postMessage -> fromWire` (asserting `E_DETACHED` on the
source, on a `withColumns()` sibling only when its buffers were
exclusively owned, that shared buffers were COPIED and listed in
`manifest.copied`, and validation on the receiver);
`structuredClone(snapshot)` throws `DataCloneError`; `toBytes ->
fromBytes` at every validation level with `bytes.byteOffset` of 0, 4 and
8 (4 takes the copy path, 0 and 8 adopt) and from a `SharedArrayBuffer`
(copied); `toByteChunks -> fromByteChunks`; a `default: Infinity` on an
`f64` `end` column and a `fill: NaN` survive; a manifest carrying `arena`
gives the receiver `arena !== null`; all asserting `equalsTopology`,
id-map equality, column equality including validity, dictionaries, lists,
json, defaults, extension tables and `meta`. Corruption tests enumerate
every `validate` branch: flip a `colIdx` byte, unsort a row, break a
permutation, truncate the buffer, change the magic, set a wrong major or
minor, a `formatVersion` mismatch with an unchanged layout, patch the
probe bytes to `01 02 03 04`, a `WireBufferRef` with an odd `byteOffset`
or one that overlaps another segment, a manifest with a `__proto__` key,
an unknown column dtype (refused, then skipped with `unknownColumns:
"skip"`), an unknown id-map kind (refused), an unknown view name
(ignored), an unknown manifest field (accepted), invalid UTF-8 in a
string store (refused); each asserts the documented code and invariant
number. Golden `.gsnp` fixtures under `test/fixtures/` guard against
accidental wire changes; the comparison masks `producer`.

### 16.4 Alignment, order and unit tests

Alignment is P12 above, run on every snapshot the suites produce. Order
goldens (`test/order-golden.test.ts`): fixtures with known insertion order
assert node index order, logical edge order, the exact `colIdx` layout,
`edgeToArc` orientation, and the remap arrays after removals, against
checked-in JSON, so any change to sort stability or numbering fails
loudly; these protect the five order-sensitive layouts and the exporters
(karate.gml edge order). Unit tests per module: builder (tombstones,
compaction, revival before freeze, widening, record inference, incidence
lists and `outEdgesOf` / `findEdges`, `setDirected` on empty and
non-empty builders including in-place expansion and `lockDirected`,
`weightSet` tracking, `addNodeRecord` / `addGraph` merge semantics), id
map kinds and fast paths (GEXF `"0.0"` strings, 1-based identity, dense
SNAP ids, `"canonical"` coercion), columns (every dtype including
bit-packed `bool`, validity, `fill` = `default`, `gpuView` caching and
`markDirty`, `mutableValidity` / `setAll`, `paddedU32View` over a
subarray, unconditional 4-byte adoption, `slice` of packed stores,
`remapColumn` with `refersTo` and list children), views (sharing and
`.slice()` copies, both `degreeOrder` orientations, `weightedDegree`
identity), derived graphs (`contract` with non-dense labels and
`blockSizes`, `edgeRemap` survivor semantics, table identity), queries,
errors (every code reachable by a test), `validate` levels and
checksums.

### 16.5 Corpus round trips (graph-io, IO1)

For every file in the corpus: import -> export -> import yields an equal
snapshot (topology, ids, orientation, columns within declared types,
extension tables) and `exporter.check()` lists exactly the documented
losses of the fidelity matrix; mixed-direction files round-trip through
the `pair` column; `airlines-sample.gexf` and `got-network.graphml`
round-trip their double weights through the shadow column;
`csv/gephi-format.csv` with a `Weight` of `0.1` and a KONECT-style
`16777217` round-trip exactly (f64 default); `lesmiserables.gexf` (edge 0
has no `weight`, the rest do) re-exports without inventing `weight="1"`
on edge 0 and loads through graphty-element under `directed: "auto"` as
`directed === false` with `edgeCount === 254`; karate / polbooks /
dolphins GML survive a DOUBLE round trip with unchanged dtypes
(`_networkx_list_start`, decimal points, `int` / `real` origin types);
`"01"` / `"1"` / `"1.0"` CSV ids stay distinct under `"canonical"`.

### 16.6 Type-level tests

`test/types/*.test-d.ts` with vitest `expectTypeOf`: public field types,
`ColumnOf<D>` narrowing, `typed()` / `requireTyped()` / `clone()` /
`slice()` return types, `DtypeValue`, `DerivedGraph` shape, branded
handles rejecting a plain number, `Loose` patches accepting explicit
`undefined`, `GraphBuilder` assignable to `GraphSink`, `GraphSnapshot` and
`ReverseView` assignable to `AdjacencyView`. A CI step `tsc -p
tsconfig.strict-consumer.json` compiles a consumer-shaped sample against
`dist/graph-format.d.ts` with `noUncheckedIndexedAccess: true` and
`exactOptionalPropertyTypes: true` and `@webgpu/types` 0.1.68: the
section 12.3 accessor example, a flag-neutral BFS, and LITERALLY
`queue.writeBuffer(buf, 0, snapshot.colIdx)`, `queue.writeBuffer(buf, 0,
snapshot.nodes.gpuView("position"))`, `queue.writeBuffer(buf, 0,
colIdx.subarray(start, end))` and `queue.writeBuffer(buf, 0, new
Uint8Array(arena.buffer, arena.byteOffset, arena.hotByteLength))` with no
cast, proving the `ArrayBuffer`-parameterised surface is what
`@webgpu/types` accepts and that an external consumer with either flag
can use the package. `@ts-expect-error` is used only in these negative
type tests.

### 16.7 CI budget

The default vitest project (unit + property tests, fast-check `numRuns`
capped at 200 with sizes up to 500 nodes / 2,000 edges) finishes in under
60 s on the CI runner and under 20 s locally; property seeds are logged so
failures reproduce; 1,000 runs nightly. The 1M-edge smoke test runs once
(~1 s including generation). Coverage thresholds 80/80/75/80; `wire/` and
`validate.ts` are expected near 100% because the corruption tests
enumerate every branch. Cross-package integration: the algorithms / layout
/ element shards download the graph-format build artifact (note 06 CI
edits); no consumer tests run inside the graph-format shard. No browser
project.

---

## 17. Decision log

### 17.1 Contradictions C1-C22

| Id | Decision | Rationale (one line) | Section |
| --- | --- | --- | --- |
| C1 | Rows sorted by `(target, edge)` as hard invariant I4 via two stable counting sorts; no flag, no unsorted mode; logical edge index = insertion order, orientation kept in `edgeToArc` | one kernel path, O(log d) `findArc`, merge intersections and adjacent dedupe at O(n + m) freeze cost; file order, layout stability and edge identity live in the logical edge index | 3.9, 6.3 |
| C2 | Parallel edges kept by default; `flags.multigraph` exact; `findArc` = first arc, `arcsBetween` range; `duplicateEdges` reducer policy at freeze with survivor rules; `simplified()`; k-th/k-th pairing proof | flow residuals and multigraph files need parallels; sorted rows make every multigraph question O(log d) or O(m) | 3.5, 6.4, 6.5 |
| C3 | `directed: boolean` on the snapshot; the builder's direction follows the file through `setDirected()` (empty builder) or `setDirected(true, { expand: true })` (in-place expansion) unless the owner `lockDirected()`; mixed files expanded at import into a directed snapshot with `graphty.directed` (bool) and `graphty.pair` (u32, refersTo edge) columns; `onMixedDirection: expand \| directed \| undirected \| error`; mirror rows unset in every other column | no third branch in ~24 algorithms or any kernel; I6/I7 statable; expansion reversible for exporters; single-pass importers with no staging | 3.6, 6.6, 8.4 |
| C4 | Declared types map exactly; inference widens `bool -> i32 -> f64 -> string -> json` with a fixed lexical grammar, never f32; arc `weights` is the one f32 mandate; every importer stages weights as f64 and the role-`weight` column is kept when values are not f32-exact OR when some edges had no explicit weight (then with validity, f32 data); `gpuView()` converts f64 once and caches; CPU algorithms take an optional per-arc f64 override | round trips must not corrupt doubles, timestamps or "weight absent"; GPU conversion paid once per snapshot, zero bytes when the doubles are exact | 3.7, 5.1, 14.1 |
| C5 | `edgeCount` = logical edges, `arcCount` = `colIdx.length`; directed `arcCount === edgeCount`, undirected `2 * edgeCount - selfLoopCount` | one vocabulary and one formula for four packages; the WebGPU `numEdges` ambiguity disappears by renaming | 2 |
| C6 | `arcToEdge` and `edgeToArc` always present as non-null properties, lazily materialised when identity (outside the arena, never on the wire, never in `byteLength()`), `flags.arcToEdgeIsIdentity` defined as `directed && identity`; `reverse().fwdArc`; the GPU binds a dummy under `override USE_PERM` | null-free CPU contract at zero bytes for identity inputs; the flag is all the GPU needs; serialisation independent of getter touches | 3.1, 10.1 |
| C7 | Long-lived builder; `freeze()` does not reset; tombstones with O(degree) removal via incidence lists (also exposed as `outEdgesOf` / `inEdgesOf` / `findEdges`); compacting freeze renumbers builder indices to equal the snapshot's; `freezeWithReport` remaps relative to the previous freeze (or the builder's own index space on the first), node and edge remaps independent, `null` when not renumbered; `release` / `dispose` for one-shot use | graphty-element's ownership model; one remap per removal burst, no permanent handle indirection; Arrow flush semantics on demand | 4.4, 6.1, 6.6 |
| C8 | `toUndirected()` / `transpose()` are explicit derived graphs returning `DerivedGraph`, never cached by the format; graphty-element owns the ONE cache per source snapshot and hands the same object to adapters and layouts; same-node-space derived graphs share the node `AttributeTable` instance | a memoised second CSR is memory the owner did not ask for; one copy, never two; columns attached later are visible on both | 5.11, 7.3, 14.4 |
| C9 | `indexOf` returns `INVALID_INDEX`; `has()`; `requireIndex()` throws `E_UNKNOWN_NODE` | one sentinel everywhere, total function, no `undefined` under strict flags | 4.3 |
| C10 | Index-valued result vectors are `Uint32Array` with `INVALID_INDEX`; the WebGPU `parents: Int32Array` becomes `Uint32Array` | bit-identical, type-compatible across CPU and GPU, no `bitcast` noise in WGSL | 4.3, 10.7 |
| C11 | CPU results `Float64Array`, GPU results `Float32Array`; format helpers generic over `NumericVector`; the weighted-degree views are `F64` (the GPU recomputes the normaliser on the device) | Bellman-Ford, modularity and KK are f64-sensitive; the CPU gains nothing from f32; a segmented reduce is one kernel the GPU package needs anyway | 7.2, 10.1, 10.7, 14.1 |
| C12 | Snapshots never alias builder staging (I18); arena default for freeze and `fromBytes`; `fromCsr` adopts by default with `validate: "full"` and detects an already-aligned shared buffer as the arena; `fromBytes` adopts a plain `ArrayBuffer` at an 8-aligned offset, else copies; `toWire({ transfer })` transfers exclusively owned buffers and copies shared ones; `detached` is derived from the array state | GraphBLAS pack semantics keep the 20 ms path zero-copy; full validation catches corrupt input; ownership is explicit; a sibling snapshot is never silently emptied | 8.1, 9.1, 9.2, 9.4 |
| C13 | Validity bitmaps, `bool` column data and `NodeMask` / `EdgeMask` are one layout: `Uint32Array` words, LSB-first, `ceil(rows / 32)` words, `nullCount` stored | bit-identical to Arrow on little-endian hosts (Arrow booleans are bit-packed), always a 4-byte multiple, uploads unchanged, one WGSL read pattern for `fixed`, `hidden`, validity and selections | 5.1, 5.3, 7.4 |
| C14 | Canonical role `position` column is `f32`, `components: 3`, `mutable: true`, in SCENE units, OWNED by the element and attached by reference after every freeze; `LayoutResult` keeps `dim` 2 or 3 in layout units; `toPositionColumn(result, scale, center, out)` / `fromPositionColumn` convert once at store time; importers map file coordinates into a seed column, no separate x/y/z roles | branch-free renderer and kernels; note 03's "do not force dim = 3 in the result" honoured at the result level; one representation, one unit, no precedence rule; positions survive every freeze | 5.2, 14.3, 14.4 |
| C15 | Concrete `NodeId = string \| number`; no generic; the id-keyed facade stays in algorithms' legacy `Graph`; root `CLAUDE.md` convention rewritten | every consumer uses the union; single-use generics trip lint; the numeric fast path needs the type | 4.1 |
| C16 | Core: `fromEdgeArrays` / `fromCsr` / `fromRecords` + `GraphSink`; the io contract TYPES live in `@graphty/graph-io` with the importers (they need `ReadableStream` / `AbortSignal`); `@graphty/graph-io` (separate, initially on fast-xml-parser / papaparse, per-format subpath exports) lands at IO1 after the element already owns a builder; JSON dialect sniffing in io | zero-dep, DOM-free core with a meaningful version; parsers move once; smallest first element landing; remote-logger precedent for subpaths | 8.2, 12.4, 14.6 |
| C17 | Builder interns eagerly; snapshot shares the builder's `Map` and id array by reference guarded by `index < nodeCount`; fresh builder structures only on a compacting freeze; typed-array and wire loaders build the reverse map lazily | zero per-freeze cost for string ids, correct because indices are append-only between compactions | 4.2 |
| C18 | Insertion order only (I14); no `sorted-id`, no physical `degree-desc`; `relabel(degreeOrder().perm)` covers the cuGraph case | no surveyed library sorts ids; layouts require insertion order; one fewer flag for kernels | 3.9, 7.3 |
| C19 | Doubled undirected storage, self-loops once, both arcs share the logical edge and weight; stated as invariant I7; `edgeList()` is the each-edge-once binding for edge-parallel kernels (the "canonical COO" of research note 09 is superseded by it) | consensus of all prior art; contiguous rows; `reverse()` free; one binding that is correct on directed and undirected snapshots | 3.3, 10.1 |
| C20 | `outDegree()` counts a loop once (rowPtr difference); `degree()` is the NetworkX convention; `selfLoopsPerNode()` / `selfLoopArcs()` are the building blocks | two named views, no hidden adjustment; layout keeps parity with its test | 3.4 |
| C21 | Final names `nodeCount`, `edgeCount`, `arcCount`, `rowPtr`, `colIdx`, `weights`, `arcToEdge`, `edgeToArc`, `fwdArc`; the WebGPU package renames on move-in; GPU entry points take `GraphSnapshot` (they need `flags` / `arena`), CPU row-walkers take `AdjacencyView` (which carries `directed`) | one type across packages; renaming the unshipped consumer is cheaper than a permanent alias | 7.2, 10.1 |
| C22 | `json` dtype in core, `gpu: "none"`, `unknown[]` in memory, JSON text on the wire | lossless nested payloads without a dependency; the GPU simply cannot bind it | 5.1 |

### 17.2 Gaps G1-G18

| Id | Decision | Section |
| --- | --- | --- |
| G1 | Five id-map kinds (`identity` with offset, `dense`, `numeric`, `string`, `mixed`) detected in O(n); SameValueZero; `NaN` / non-finite / `bigint` / lone-surrogate strings rejected; dual decoded / typed representations materialised lazily in either direction (numeric and mixed too); shared builder Map; append-only prefix stability with remaps on compaction; edge ids as a `unique` role column with a lazy index; `"canonical"` text coercion for CSV-class sources; `toStringMap` / `stringIndex` for legacy string-keyed shapes; no namespaces in core | 4 |
| G2 | Arrow-shaped columns: ten dtypes (`bool` bit-packed), `components` / `itemComponents`, u32 validity words, `fill` = `default` when representable, dictionary interning, Utf8 strings, one-level lists, `json`, `refersTo` (list children too), per-column `mutable` + `markDirty` / `mutableValidity` / `setAll`, `ColumnDecl` vs `ColumnMeta`, dotted names and roles with a collision rule, 4-byte padding only, unconditional by-reference adoption of 4-byte arrays, graph table, extension tables, propagation table | 5 |
| G3 | `findArc` first, `arcsBetween`, `multiplicity`, exact `multigraph` flag, reducer policy with survivor rows and `edgeRemap`, `simplified()` with per-column reducers, pairing proof | 3.5, 6.4, 6.5 |
| G4 | Cost model per phase with the one measured number; builder-phase costs itemised separately; re-freeze per mutation accepted (25-55 ms); no incremental freeze in v1 | 6.7, 15.4 |
| G5 | Byte tables for core, views, id map, columns, staging and freeze peak; mobile 100k/1M, desktop 1M/10M, batch 10M/100M with `arena: false`; engine ceilings listed for verification | 15.1-15.3 |
| G6 | `WireSnapshot` (manifest + `ArrayBuffer[]`) and the `GSNP` container: magic, u16 major/minor written little-endian, host-order endianness probe with a big-endian writer refusal, JSON manifest with tagged non-finite numbers and an `arena` descriptor, 256-aligned buffer region, validation levels with per-ref checks and a prototype-pollution reviver; 8-aligned adoption; `toByteChunks` for the tiers above the per-allocation ceiling; IndexedDB as one buffer or chunks; `contentHash()` | 9 |
| G7 | `toWire({ transfer })` + `transferables()` over exclusively owned buffers, shared buffers copied and listed; `detached` derived from the array state, `E_DETACHED` on every holder; `structuredClone(snapshot)` throws; single-receiver transfer, `structuredClone(wire)` for fan-out; views optional via `prepare` + `includeViews`; id map and strings rebuilt lazily; per-realm caches; `SharedArrayBuffer` deferred to a later minor (D-SAB) | 9.1, 9.4 |
| G8 | Three version numbers; invariants are API with an enumerated MAJOR list; `formatVersion` checked by every reader; enum forward-compatibility rules (dtype skippable, view ignorable, id-map kind never); `dependencies` + `peerDependencies`; structural `isGraphSnapshot`; 1.0.0 cut before the first dependent merges, enforced by a CI check | 13.5 |
| G9 | Typed arrays parameterised over `ArrayBuffer` (`U32 = Uint32Array<ArrayBuffer>`; verified with tsc 5.9.3 + `@webgpu/types` 0.1.68: the buffer parameter, not `Readonly`, is what `writeBuffer` checks), no `Readonly*` aliases, no index brands but branded builder handles, `T \| null` outputs (wire types included), `Loose<T>` patches with `?: T \| undefined`, explicit `ResolvedBuilderOptions`, `noUncheckedIndexedAccess` off in every consumer, DOM-free core, strict-consumer compile test with literal `writeBuffer` calls | 12.1, 16.6 |
| G10 | `GraphFormatError` with a closed code union (including `E_NO_DEFAULT`, `E_INVALID_PERMUTATION`, `E_MASK_LENGTH`) and a situation table; builder throws first error; snapshot index methods unchecked, id methods checked; `validate()` exhaustive; importers aggregate into `ImportReport` (graph-io) | 11, 8.6 |
| G11 | Invariant suite, fast-check model-based tests with P1-P12, differential tests vs a copied legacy `Graph`, wire round trips and corruption tests, alignment and order goldens, type-level tests, CI budget | 16 |
| G12 | Six-benchmark suite with recorded results, opt-in perf gate at 3x baseline, one smoke ceiling in the default shard | 15.5 |
| G13 | Phases F1 -> A1 (branch: `toSnapshot` + harness, signatures unchanged) -> F2 (1.0.0) -> A1 -> A2 (widening + `indexed`) / L1 / E1 -> W1 -> D1 -> IO1 -> 2.0; `no-deprecated` ordering; Chromatic re-baseline commits; helper ownership table | 14.6 |
| G14 | Frozen = core arrays, counts, flags, id map, immutable columns; view caches populate-once and SHARED (copy before mutating); column set is a mutable side table; contents mutable only when declared and never carried across a freeze unless re-attached; `Object.freeze` + private fields; opt-in checksums (`freeze({ checksum: true })`) covering views; `serial` = core identity | 5.8 |
| G15 | Four-part criterion with explicit lists on each side; `degreeOrder` (both orientations), `weightedDegree`, `selfLoopWeight` and `isSymmetric` in; APSP, generators, `children`, Stoer-Wagner / Karger contraction out | 7.1, 7.2 |
| G16 | No masks in the contract; `inducedSubgraph` / `filterEdges` + remaps, `scatterArray` back; edge-level alive masks for undirected algorithms; packed-bitmap helpers exported; composition via `GraphBuilder.from()` and `addGraph()` with dictionary re-interning and last-write-wins merge | 6.6, 7.3, 7.4 |
| G17 | `GraphSnapshot`, `GraphBuilder`, `NodeIdMap`, `AttributeTable`, `Column`, `EdgeId`, "arc" / "edge" / "node index"; no exported `Graph`, `Node`, `Edge`, `CSRGraph`; the banned-word list applies to synonyms for arc / edge / node, not to data-structure names | 2 |
| G18 | Deterministic freeze (I15, modulo `producer` on the wire); little-endian only with a probe and a big-endian writer refusal; full validation of untrusted bytes; resizable `ArrayBuffer` feature-detected with a local d.ts; no `Float16Array`; no `SharedArrayBuffer` in v1; per-realm caches; freezes above ~10M edges in a worker; cancellation via importer `signal` | 3.2, 6.2, 9 |

### 17.3 Q-register items (research note 10 section 4)

Q1 once + named `degree()` (C20); Q2 sorted (C1); Q3 keep (C2); Q4 f32 arcs, f64 shadow only when needed, NaN rejected, Infinity allowed, zero valid, default 1 (3.7); Q5 index-aligned typed arrays in `indexed.*`, facades keep id-keyed shapes (14.2); Q6 `contract` / `inducedSubgraph` / `filterEdges` / `simplified` / `toUndirected` in the format (7.3); Q7 Map overloads kept one major inside algorithms (14.2); Q8 canonical `position` column, `LayoutResult.dim` free (C14); Q9 generators stay in layout, `LayoutGraph` wrapper, no duck type on the snapshot (14.3); Q10 APSP in algorithms / webgpu (7.1); Q11 keep, distinct, importer coercion option (4.1); Q12 tombstone-then-compact with remaps, prefix stability (4.4); Q13 element edge identity = element-assigned stable id, `edgesByIndex` re-keyed on compaction (14.4); Q14 explicit `weight` argument + role (3.7); Q15 `addMissingNodes` true (6.6); Q16 once per load (14.4); Q17 0.1.0, 1.0.0 before dependents (13.5); Q18 two-step build, one-line d.ts shim (13.1); Q19 `noUncheckedIndexedAccess` off in the core AND in every consumer, tests in tsconfig (12.1, 13.4); Q20 typedoc with graph-io, build-order line updated (13.6); Q21 `json` in core (C22); Q22 GEXF undirected default with importer override (8.4); Q23 one list level (5.1); Q24 identity offset (4.2); Q25 separate `@graphty/graph-io` (C16); Q26 `sanitizeIds: "error"` (8.5); Q27 `origin.namespace` / `idSpace` column, no core namespaces (4.6); Q28 hyperedges `"skip"` with report (8.4); Q29 always present, lazily materialised (C6); Q30 weights per arc plus `edgeList().weights` (3.3); Q31 `edgeCount` / `arcCount`, GPU binds `arcCount` (C5); Q32 no masks in the contract (G16); Q33 ten dtypes, declared types exact, f64 for undeclared numbers (5.1); Q34 alias (7.2); Q35 `E_TOO_LARGE` above `0xFFFFFFFE` (I3); Q36 keep-first (7.3); Q37 reverse weights materialised (7.2); Q38 no physical degree order, `relabel()` (C18); Q39 arena default, optional (`arena: false`) (10.3); Q40 f64 allowed, not GPU-eligible, converted copy (10.4); Q41 no `Float16Array` (5.1); Q42 Node-side WebGPU is a WebGPU-package decision (10.8); Q43 layout Option B (14.3); Q44 f64 scratch, f32 output (14.3); Q45 facade stays in algorithms (C15); Q46 full re-freeze accepted for now (15.4); Q47 boolean (C3); Q48 explicit, uncached (C8); Q49 `INVALID_INDEX` (C9); Q50 `Uint32Array` (C10).

### 17.4 Decisions from the adversarial reviews

Six reviews (WebGPU memcpy contract, algorithms port feasibility, layout
and element integration, import / export losslessness, TypeScript strict
compilation, internal consistency) were applied in full for every
critical and major finding and for every minor finding that did not
conflict with an owner decision. Where two reviews conflicted, the
decision and the reason:

| Id | Conflict | Decision | Section |
| --- | --- | --- | --- |
| D-WDEG | WebGPU review: `weightedOutDegree()` must be `Float32Array` so it uploads as memcpy. Algorithms review: modularity and PageRank normalisation need f64 and a loop-twice `weightedDegree()`. | The three weighted-degree views (and `selfLoopWeight()`) are `F64` (CPU-precise; C11); the 7.2 memcpy promise excludes the four explicitly; the GPU package computes the normaliser on the device with a segmented reduce (a kernel it needs regardless) and guards zero sums. | 7.2, 10.1 |
| D-OUTARCS | TypeScript review: use `outArcs(u)` tuples as the flag-neutral row-bound idiom under `noUncheckedIndexedAccess`. Algorithms review: `outArcs` allocates a tuple per call and must not appear in hot loops. | Every format consumer compiles with `noUncheckedIndexedAccess: false` (the WebGPU package switches on move-in), so no flag-neutral hot-loop idiom is needed; `outArcs` / `arcsBetween` are documented as allocating boundary conveniences; only the strict-consumer compile sample uses flag-neutral code. | 3.9, 12.1, 14.5 |
| D-PAD | I12's 16-byte padding versus unconditional by-reference adoption of GPU readbacks. | 4-byte rule only (what WebGPU needs); 4-byte and `f64` arrays are adopted by reference unconditionally; `u8` uses the exact "padded view constructible" predicate. | 5.7 |
| D-BOOL | Byte-packed `bool` columns versus bit-packed validity / masks (two boolean layouts). | `bool` columns are bit-packed `Uint32Array` words (Arrow layout): one bitmap layout for `fixed`, `hidden`, validity and selections. | 5.1, 5.3 |
| D-TRANSFER | Transfer must either copy shared buffers (owner count) or refuse when storage is shared. | Copy shared buffers, tracked conservatively in a `WeakMap<ArrayBuffer, number>`; `detached` derived from the array state so untracked holders still fail loudly. Refusing would make every `toUndirected()` result untransferable while its source lives. | 9.1 |
| D-SAB | Four reviews found `SharedArrayBuffer` half-specified (typing, transfer, gating, fan-out). | Removed from v1 (`shared` option, `flags.shared`, SAB-typed buffers); reserved as a later minor with a separate typed surface; section 18 decision 3 covers the deployment side. | 1.4, 9.4 |
| D-DIR | Importers cannot honour a file's direction against a caller-fixed sink; graphty-element's always-directed builder doubles every undirected file. | `setDirected()` / `lockDirected()` on the builder with in-place expansion; single-pass importers; graphty-element `data.directed: boolean \| "auto"` (default `"auto"`) and one `EdgeObject` per primary half. | 3.6, 6.6, 8.4, 14.4 |
| D-POS | Layout / drag positions lost on every append-only freeze. | Positions are element-owned and re-attached by reference after every freeze; the builder holds only the importer seed column; unit is scene units. | 5.2, 5.8, 14.4 |
| D-A1 | Phase A1 required legacy algorithms to accept a snapshot before any indexed implementation existed. | A1 = `toSnapshot` + harness with signatures unchanged; the widening moves to A2. | 14.2, 14.6 |
| D-CONTRACT | `contract()` unusable as specified (dense labels, unweighted reducers, `nodeOrigin`, `edgeOrigin`, per-phase use by Stoer-Wagner / Karger). | Non-dense labels accepted (kept when already `0..k-1`, else renumbered), logical-edge semantics, unweighted reducer rule, `blockSizes`, `nodeOrigin` = lowest source index, `edgeOrigin` = survivor; Stoer-Wagner / Karger use union-find over the original rows; `renumberPartition` exported. | 7.3, 7.5, 14.2 |
| D-WEIGHTS-F64 | f32 arc weights versus the `1e-9` differential gate. | Per-arc `weights` override on every weighted `indexed.*` function; the facade passes the f64 shadow; importers and `toSnapshot(Graph)` stage weights as f64. | 3.7, 8.4, 14.1 |
| D-ABSENT | Three "absent" conventions on one surface. | `null` for absent columns / data (`get`, `typed`, `byRole`, wire members); `INVALID_INDEX` for id, name and handle lookups; `undefined` only for an unset row from `value()`; handles branded. | 12.1 |
| D-IO-TYPES | Core public types referenced DOM globals. | The io contract types move to `@graphty/graph-io`; the core references only ES2020 globals. | 8.2, 12.4 |
| D-SERIAL | `serial` on `withColumns()` snapshots would re-upload identical cores. | `serial` is the identity of the core; upload caches key on the typed-array object; `snapshot-replaced` + `release(snapshot)` free GPU memory. | 5.8, 14.4, 14.5 |
| D-NAMES | Format-owned columns named `directed` / `pair` collide with user attributes; GEXF title versus id ambiguity. | `graphty.*` names for format-owned columns; `name` = title / `attr.name` with id fallback; deterministic `#id` suffix on collision. | 3.6, 5.6 |
| D-COO | Research note 09's canonical COO versus the design's `edgeList()`. | Superseded by `edgeList()`, now in the GPU binding table. | 3.3, 10.1 |
| D-VERSION | `formatVersion` carried but not checked; enum values had no forward-compatibility rule. | Readers refuse a `formatVersion` mismatch; unknown dtype refused unless `unknownColumns: "skip"`; unknown id-map kind refused; unknown view ignored. | 9.1, 13.5 |
| D-CSV-IDS | `ids: "keep"` loses the SNAP fast path for text sources; `"number"` merges `"01"` and `"1"`. | `"canonical"` (injective integer-text rule) is the default for text-cell sources. | 4.1, 8.4 |
| D-WSET | "weight absent" and "weight 1" indistinguishable after import. | Builder `weightSet` bitmap becomes the validity of the role-`weight` column, kept whenever any edge had no explicit weight. | 3.7 |
| D-CHECKSUM | 5.8 said checksums are recorded at every freeze; 6.3 / 12.2 said only under `profile`. | Opt-in `checksum: true` freeze option, covering views at first materialisation; `validate({ checksum: true })` without records throws. | 5.8, 11.4 |
| D-ARENA | Arena order interleaved a cold array; rule (1) ignored the per-segment binding limit; `& ~63` window math; 65,535 x 256 miscounted. | Hot-to-cold order with `hotByteLength`; per-segment condition; `% 64` formula on arc ranges; 16,776,960. | 10.3, 10.6 |
| D-FIRST-FREEZE | First freeze reported `null` remaps even after removals. | The old index space of the first freeze is the builder's own; remaps are `null` iff nothing was renumbered; node and edge remaps independent. | 3.2, 6.6 |
| D-MISC | `keepOrder` undefined; three throw sites without codes; `remapColumn` name used for two shapes; `E_DIRECTED` "vice versa"; `producer` churn; `Q: none needed` leftover; G16 section reference; `totalWeight` in `includeViews`; `edgeIndexOf(id: NodeId)`; numeric id map wire allocation; `shared` in the freeze table. | `keepOrder` removed; `E_NO_DEFAULT` / `E_INVALID_PERMUTATION` / `E_MASK_LENGTH` added; `remapColumn` / `remapArray` / `gatherColumn` / `gatherArray` / `scatterArray`; `E_DIRECTED` covers `setDirected`; goldens mask `producer`; leftover deleted; `6.6, 7.3, 7.4`; scalar views ignored; `EdgeId`; lazy typed id arrays; SAB row removed. | various |

### 17.5 Post-implementation decisions (F1 landing, 2026-09-16)

Decisions taken after both packages were implemented and audited, while
landing them in graphty-monorepo as workspace members (section 14.6 phase
F1 plus the IO1 package landing). The eleven owner decisions consolidated
in the packages' STATUS.md were all answered "keep what is implemented"
and stay open for a later pass; they are deliberately NOT recorded here,
because nothing changed.

| Id | Conflict | Decision | Section |
| --- | --- | --- | --- |
| D-COMPACT | 15.4 and 6.7 budget compaction after removals at 10-15 ms; it measures ~32 ms at 100k / 1M. | The estimate was wrong, not the code: both tables corrected to the measured number and the phase profile recorded in 15.6. Not optimised -- the floor is the incidence-list rebuild, four random accesses per surviving edge, and compaction runs only after removals. | 6.7, 15.4, 15.6 |
| D-GEXF-STREAM | The F1 landing prompt carried a pre-1.0 gap saying GEXF parses the whole document instead of streaming through the shared XML tokenizer. | Stale: GEXF was converted to the shared streaming tokenizer in graph-io audit round 1. Measured at F1, GEXF imports at 1.64 us/edge against GraphML's 2.51, with doubling ratios 1.93-2.04 and bounded peak memory. The gap is closed, not deferred. | 8.4 |
| D-HOTLOOP | The streaming audit recorded three remaining per-element allocations (GEXF node frame, DOT scope-defaults copy, Pajek per-line tokens), to be removed "only where the change is local". | Recorded, not removed, where the allocation is genuinely held past the element that makes it; all three measure 2-3 us per edge, in line with every other importer. | 8.4 |
| D-PAJEK-FILL | The Pajek vertex section was quadratic in the vertex count: `vertexLine`'s gap-fill restarted at position zero on every line, and the defaults (`nodeIdFrom: "id"`, `restoreMangledIds: true`) send every file down that branch, so ascending vertex numbers -- the order Pajek writes -- cost n(n-1)/2. | Fixed with a `filledBelow` high-water mark: 100k vertices 2355 ms -> 49 ms, the 1M-arc benchmark 3340 ms -> 790 ms, with no change to any id, node order, issue or option. The gap-fill's ORDER-INDEPENDENCE rule (index order is vertex-number order whatever the line order) is unchanged and now pinned by a test. | 8.4 |
| D-STAGING-COPY | The move checklist says `mv` the two package directories out of the staging workspace. | Copied instead: the staging repository was in use by another session at landing time. The staging copies remain as the record; they are no longer the source of truth for either package. | 13.3 |
| D-RECORD-MOVES | STATUS.md and CONFORMANCE.md lived in the staging workspace, outside this repository, and cite paths relative to it. | Both copied to `design/graph-format/` beside this document, so the implementation record travels with the code it describes. The staging originals are left untouched and are now historical. | 13.1 |

---

## 18. Owner decisions (confirmed 2026-09-13)

These items needed a product decision. The owner reviewed the list on
2026-09-13 and confirmed the position this document proposes for every
item; the original question text is kept for context, and each item ends
with the decision as it now binds the implementation.

1. Release mechanics for the 0.x window: this document cuts `1.0.0` before
   the first consumer merges (F2, enforced by a CI dependency check) and
   validates the algorithms widening on a branch beforehand. The
   alternative is to let consumers merge against 0.x and accept that
   external npm users of `@graphty/algorithms` transitively pin a 0.x
   format for the duration. Confirm the branch-first mechanism. Also
   confirm the npm trusted-publisher entries for `@graphty/graph-format`
   and `@graphty/graph-io` are created on npmjs.com before their first
   release.

    DECIDED: cut `1.0.0` on a branch before the first consumer merges (F2), with the CI dependency check enforcing it. Placeholder packages `@graphty/graph-format@0.0.0` and `@graphty/graph-io@0.0.0` were published on 2026-09-13 so the trusted-publisher entries can be configured on npmjs.com against `.github/workflows/release.yml`; the first real CI release replaces them.

2. `@graphty/graph-io` as a separate package with that name, initially
   depending on `fast-xml-parser` and `papaparse` moved from
   graphty-element, and adopting per-format subpath exports (which needs a
   multi-entry vite build for that package). Confirm.

    DECIDED: `@graphty/graph-io` is a separate package under that name, initially depending on `fast-xml-parser` and `papaparse` moved from graphty-element, with per-format subpath exports and the multi-entry vite build that requires.

3. `SharedArrayBuffer` support is deferred out of v1 (D-SAB, section
   9.4): worker hand-off uses transfer (O(1) per exclusively owned
   buffer) and every public array is typed over a plain `ArrayBuffer`.
   Confirm the deferral, and decide whether graphty.app will adopt
   cross-origin isolation (`Cross-Origin-Opener-Policy: same-origin`,
   `Cross-Origin-Embedder-Policy: require-corp`; COEP constrains
   third-party assets) at all; if not, the shared-snapshot minor need
   never be scheduled.

    DECIDED: `SharedArrayBuffer` is out of v1; worker hand-off uses transfer and every public array is typed over a plain `ArrayBuffer`. graphty.app does not adopt cross-origin isolation for this work; the shared-snapshot minor is not scheduled unless a concrete shared-memory use case appears.

4. Root `CLAUDE.md` prescribes `algorithmName<TNodeId = unknown>(graph:
   ReadonlyGraph<TNodeId>)`; this design uses `algorithmName(snapshot:
   GraphSnapshot, options?)` with a concrete `NodeId`. Confirm the
   convention is rewritten when A2 lands.

    DECIDED: the root `CLAUDE.md` algorithm-signature convention is rewritten to `algorithmName(snapshot: GraphSnapshot, options?)` with a concrete `NodeId` when A2 lands.

5. Behaviour changes graphty-element users will see after E1 / IO1:
   parallel edges are kept (today silently dropped); incident edges are
   removed with their node (today left dangling); edge weights reach
   Kamada-Kawai and ForceAtlas2 (today ignored); `runAlgorithmsOnLoad`
   runs once per load; `Edge.id` in events becomes the string form of an
   element-assigned stable counter rather than `${src}:${dst}`; raw
   centrality values change for the adapters that today feed a mirrored
   directed graph (betweenness is halved and normalised with the
   undirected factor, closeness / eigenvector / Katz use the undirected
   convention; the `*Pct` fields do not change); the default edge weight
   field becomes `weight` (the io importers' default; the converter's
   `value` default was never read); an all-undirected GEXF / GML /
   GraphML now loads as an undirected graph with one edge per file edge
   under `data.directed: "auto"` (today: directed with mirrored edges);
   ids from text sources are coerced by the `"canonical"` rule (a CSV
   `"1"` becomes the number `1`, matching a JSON `1`; `"01"` stays a
   string); and `topPageRankNodes` keeps returning `String(id)` for
   numeric ids until 2.0, when it returns the original id. Are all of
   these acceptable as unflagged improvements in a minor release, or
   should any be gated by an option?

    DECIDED: every behaviour change listed above ships as an unflagged improvement in a minor release; none is gated by an option.

6. Chromatic and Storybook re-baselining for layout (`bfsLayout` /
   `planarLayout` neighbour order, weights reaching KK / FA2, f32 output,
   FR single-RNG fix) and for graphty-element is accepted as a one-time
   cost.

    DECIDED: the one-time Chromatic and Storybook re-baselining for layout and graphty-element is accepted.

7. MST totals on unweighted graphs change from `0` (Kruskal / Prim `?? 0`)
   to `edgeCount - 1` under the all-ones convention. Confirm the change or
   ask the algorithms package to special-case `weights === null`.

    DECIDED: MST totals on unweighted graphs follow the all-ones convention (`edgeCount - 1`); the algorithms package does not special-case `weights === null`.

8. The append-only incremental freeze fast path is deferred until the
   benchmark suite shows interactive expand (M3) dropping frames at the
   target sizes. Confirm the deferral.

    DECIDED: the append-only incremental freeze fast path is deferred until the benchmark suite shows interactive expand (M3) dropping frames at the target sizes.

9. Generators stay in `@graphty/layout` behind a `LayoutGraph` wrapper
   rather than moving to a new `@graphty/graph-generators` package.
   Confirm (a separate package is one more release unit and npm name to
   bootstrap).

    DECIDED: generators stay in `@graphty/layout` behind the `LayoutGraph` wrapper; no `@graphty/graph-generators` package.

10. Static layouts after an interactive add (section 14.4): the design
    re-runs the layout seeded from the current positions with existing
    nodes pinned, which is a full layout run (seconds at 100k nodes) even
    for one added node. The alternative is to place new nodes at the
    centroid of their neighbours (or at the origin) without a re-run and
    let the user trigger a re-layout. Choose the default; both are
    implementable on the same engine contract.

    DECIDED: after an interactive add, static layouts re-run seeded from the current positions with existing nodes pinned (the design as written). Centroid placement without a re-run is not the default.

11. `data.directed` on graphty-element defaults to `"auto"` (the builder
    follows the first loaded file's header; later disagreeing sources are
    expanded). The conservative alternative is `true` (today's behaviour,
    every file expanded into a directed graph). Confirm `"auto"`.

    DECIDED: `data.directed` on graphty-element defaults to `"auto"`.

12. `fromWire` / `fromBytes` refuse a container with an unknown column
    dtype by default (`unknownColumns: "error"`) so a newer producer's
    data is never silently dropped; graphty's IndexedDB cache reader will
    pass `"skip"` and re-fetch. Confirm the default.

    DECIDED: `fromWire` / `fromBytes` default to `unknownColumns: "error"`; graphty's IndexedDB cache reader passes `"skip"` and re-fetches.

### 17.7 The 1.0.0 cut (F2, 2026-09-18)

Section 17's decision log continues here, appended after section 18 so the
log stays append-only. Section 17 numbers are reserved in the order the
entries were WRITTEN, not the order they land: 17.6 belongs to the L1-sim
amendments prepared on `feat/layout-simulation` and arrives with that
branch; 17.8 is reserved for the WebGPU W1 amendments (integration plan
Task M5b-T4). 13.5 rule 3 is the one place this document is edited IN
PLACE rather than amended here, because rule 3 states a protocol the
packages must obey and a wrong protocol cannot be left standing beside its
own correction; 17.6's D-PEER-0X already directs that the rule-3 text is
corrected in the F2 PR. The edit is held to the same eight lines, because
this file is cited by line range from the WebGPU design and from two of the
GPU package's research documents.

17.7 (2026-09-18): `@graphty/graph-format` is `1.0.0` on master and the
invariants I1-I18 are frozen; graph-io's and webgpu-graph-algorithms' peer
ranges become `^1.0.0` and graph-io's `dependencies` entry becomes
`workspace:^`; 13.5 rule 3 is corrected in place; and 14.6's F2 gate "A1
branch green", with section 18 item 1's "validates the algorithms widening
on a branch beforehand", is DEVIATED FROM -- A1 has not started.
`FORMAT_VERSION` stays 1 and the wire stays `[1, 0]`: 13.5's implication
runs invariant change -> npm major, never back.

| Id | Conflict | Decision | Section |
| --- | --- | --- | --- |
| D-F2-GATE | 14.6 gates F2 on "A1 branch green" and section 18 item 1 confirms the branch-first mechanism. A1 has not started: `algorithms/package.json` declares no `@graphty/graph-format` and no `toSnapshot` exists in `algorithms/src`. | Cut `1.0.0` anyway, on three consumer ports that already exercise the format rather than the one 14.6 named: graph-io (released, the eight-format corpus through `GraphSink` and back out through the wire form), webgpu-graph-algorithms (released 0.2.0, the CSR arena and the section 10 GPU upload contract) and layout's L1-sim on PR #12 (the position column, role resolution and the stride-3 owner array of 14.3; its functional shards are green and its Chromatic baselines are accepted). Rule 5 already prices the residual risk: what the ports find later lands as a 1.x minor or the scheduled 2.0. A1 keeps its 14.6 content; only its ORDER relative to F2 changes. | 14.6, 18 item 1 |
| D-PEER-1X | Rule 3 gave the dependency as `workspace:*` "published as a caret range", the peer as `^<major>`, and the lock-step mechanism as `updateDependents: "auto"`. All three are wrong: pnpm publishes `workspace:*` as an EXACT pin, so rule 3's own one-copy promise fails as written; during 0.x the owner's `6b4777df` installed the MINOR pin `^0.<minor>.0`, because `nx release` keeps a dependent's range only while the new version satisfies it and otherwise ABORTS; and nx.json nests `updateDependents` under `version.generatorOptions`, a key nx 22 does not read (the effective value is the default `always`). | Rule 3 corrected in place to `workspace:^`, `^<major>` from 1.0.0 on and `^0.<minor>.0` during 0.x, with the dead mechanism claim dropped; 13.2's repetition corrected with it. The manifests follow at the same push: graph-io `workspace:*` -> `workspace:^` and peer `^0.2.0` -> `^1.0.0`, webgpu-graph-algorithms peer `^0.2.0` -> `^1.0.0`. This executes the branch entry 17.6's D-PEER-0X (integration plan D-6, D-18, DEP-G, DEP-I; WebGPU design Q-31). | 13.5 rule 3, 13.2 |
| D-RULE5-CHECK | Rule 5 calls the pre-1.0 merge ban mechanical and attributes it to "a CI check compares the two `package.json` files"; 14.6's A1 gate, G8, section 18 item 1 and its DECIDED line all assert the same check. No such check exists in `.github/workflows/` or `tools/`. The ban was never enforced either: it was consciously departed from on both landings that put the format in a consumer's `dependencies` -- graph-io on 2026-09-16 and webgpu-graph-algorithms at 0.2.0 -- because both are themselves 0.x (integration plan D-5, DEP-H). It bound only the 1.x consumers. | The check is not written. With the format at `1.0.0` its condition is permanently true and the ban has no further work. The live hazard was never rule 5 but the `nx release` range abort, and both peers now state `^1.0.0`, which a caret satisfies for every 1.x minor; it recurs only at the deliberate 2.0 of rule 4. If a guard is wanted later it is a peer-range SATISFACTION check (every declared `@graphty/graph-format` range admits the version in `graph-format/package.json`), not rule 5's letter. The five assertions above stay as the record of how the 0.x window was meant to be policed. | 13.5 rule 5, 14.6, 18 item 1 |
