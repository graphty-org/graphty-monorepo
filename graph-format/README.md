<img src="https://raw.githubusercontent.com/graphty-org/brand/main/guide/on-white/png/graphty-graph-format-lockup-color-on-light-800w.png" alt="graphty graph-format" width="395">

# @graphty/graph-format

[![CI](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/graphty-org/graphty-monorepo/badge.svg?branch=master)](https://coveralls.io/github/graphty-org/graphty-monorepo?branch=master)
[![npm version](https://img.shields.io/npm/v/@graphty/graph-format.svg)](https://www.npmjs.com/package/@graphty/graph-format)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Frozen CSR graph data format over typed arrays, shared by CPU and WebGPU graph algorithms.

@graphty/graph-format is a zero-runtime-dependency, framework-agnostic graph DATA FORMAT: a frozen
compressed-sparse-row (CSR) representation over typed arrays, a mutable builder that produces frozen
snapshots, columnar typed node/edge attribute storage, and an id-to-index map kept outside the CSR.
It contains no graph algorithms, no rendering and no parsers (see @graphty/graph-io).

## Features

- **Frozen CSR snapshot** (`GraphSnapshot`): `rowPtr` / `colIdx` / `weights` / `arcToEdge` /
  `edgeToArc` as 4-byte-aligned typed arrays in one 256-byte-aligned arena, so the whole core uploads
  to a GPU with one `writeBuffer`. Topology, counts, flags and id map never change after `freeze()`.
- **Builder** (`GraphBuilder`): long-lived, mutable, repeatedly freezable; ids or indices; directed
  or undirected (with expansion); duplicate-edge and self-loop policies; f32 or f64 weights; two
  stable counting sorts (never a comparator sort) so every freeze is deterministic and prefix-stable.
  Column names resolve through an index (declaring and looking up 100k columns is linear), and
  an inferred column can be widened by name through `widenNodeColumn()` / `widenEdgeColumn()`
  (also on the `GraphSink` contract, optional) so a text importer can give a `2.0`-style column its
  f64 dtype whatever its values imply.
- **Typed attribute columns** (`AttributeTable`, `Column`): `f32 f64 i32 u32 u8 bool dict string
list json`, multi-component strides, Arrow-style validity bitmaps, roles, provenance, mutable
  columns for layouts, extension tables for temporal attributes, and `gpuView()` for what the GPU
  binds.
- **Id map** (`NodeIdMap`): five storage kinds (`identity`, `dense`, `numeric`, `string`, `mixed`)
  chosen at freeze; zero bytes for the common `0..n-1` case; lazy reverse map.
- **Views** (lazy, cached, shared): `reverse()`, `coo()`, `edgeList()`, degrees, weighted degrees,
  self-loops, `mate()`, `degreeOrder()`, `isSymmetric()`.
- **Derived graphs** (new snapshots with index maps back): `toUndirected()`, `transpose()`,
  `simplified()`, `withoutSelfLoops()`, `filterEdges()`, `inducedSubgraph()`, `contract()`,
  `relabel()`, `withColumns()`.
- **Wire form and GSNP container**: `toWire()` / `fromWire()` for `postMessage` and IndexedDB
  (transfer-aware: shared buffers are copied, exclusive ones transferred), `toBytes()` / `fromBytes()`
  / `fromByteChunks()` for files and the network, with `none` / `structure` / `full` validation of
  untrusted input.
- **Factories**: `fromEdgeArrays()` (with optional `ids` and `edgeIds`), `fromCsr()` (adopts caller
  arrays with validation), `fromRecords()` (node-link JSON shapes), `fromElements()` (your own node
  and edge objects, handed back in index order).
- **Node references**: `NodeRef` (an index or `{ id }`) and `NodeSet` (an index array, `{ mask }` or
  `{ ids }`), resolved by `resolveNode()`, `resolveNodeSet()` and `resolveNodeMask()`; every
  algorithm in @graphty/algorithms and every layout in @graphty/layout accepts them.

## Documentation

The full documentation is at **https://graphty.app/docs/graph-format/**: a getting-started guide,
guides to building snapshots, ids and columns, views and derived graphs, and the wire form, the
invariants every snapshot keeps, and the API reference.

## Installation

```bash
npm install @graphty/graph-format
```

ESM only. Node >= 18.19.0 or any browser with ES2020 support. No runtime dependencies.

## Quick Start

```typescript
import { fromBytes, GraphBuilder } from "@graphty/graph-format";

// 1. Build. Ids are strings or numbers; indices are assigned in first-appearance order.
const builder = new GraphBuilder({ directed: false, weightDtype: "f32" });
builder.declareNodeColumn({ name: "label", dtype: "string", role: "label" });
builder.addNodeRecord("alice", { label: "Alice" });
builder.addNodeRecord("bob", { label: "Bob" });
builder.addEdge("alice", "bob", 2.5);
builder.addEdge("bob", "carol", 1); // "carol" is added on first mention

// 2. Freeze: a frozen CSR snapshot; the builder stays usable and can be frozen again.
const snapshot = builder.freeze();
console.log(snapshot.nodeCount, snapshot.edgeCount, snapshot.arcCount); // 3 2 4 (undirected: two arcs per edge)

// 3. Walk rows. Every out-arc of node u lives in [rowPtr[u], rowPtr[u + 1]).
const { rowPtr, colIdx, weights } = snapshot;
const strength = new Float64Array(snapshot.nodeCount);
for (let u = 0; u < snapshot.nodeCount; u++) {
    for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
        const v = colIdx[a];
        strength[u] += weights === null ? 1 : weights[a];
        void v; // the neighbour index
    }
}

// 4. Map results back to ids only at the boundary.
const byId = snapshot.ids.toMap(strength); // Map<NodeId, number>: "alice" -> 2.5, "bob" -> 3.5, "carol" -> 1
const labels = snapshot.nodes.requireTyped("label", "string");
console.log(labels.valueAt(snapshot.ids.requireIndex("bob"))); // "Bob"

// 5. Views are lazy, cached and shared (call .slice() for scratch); derived graphs are new snapshots.
const degree = snapshot.degree(); // Uint32Array(nodeCount)
const { snapshot: simple, edgeRemap } = snapshot.simplified();
void degree;
void simple;
void edgeRemap;

// 6. Serialise: one contiguous GSNP container (or toWire() for postMessage / IndexedDB).
const bytes = snapshot.toBytes();
const back = fromBytes(bytes); // validates fully by default
console.log(back.ids.idOf(0), byId.get("bob")); // "alice" 3.5
```

## License

MIT
