# Getting started

## Install

```bash
npm install @graphty/graph-format
```

graph-format is an ES module: import it with `import`, not `require`. It runs in Node 18.19 or
later and in any browser with ES2020 support.

## Your first snapshot

A **snapshot** is a read-only graph. You make one with a `GraphBuilder`: add nodes and edges by
your own ids, then `freeze()` it. Inside the snapshot every node has an **index** from 0 to
`nodeCount - 1`, and the neighbours of node `u` are the entries of `colIdx` from `rowPtr[u]` up to
(not including) `rowPtr[u + 1]`. This layout is called compressed sparse rows (CSR); it is what
makes walking a large graph fast, and what lets a GPU read it without conversion.

<<< ../examples/getting-started.ts

Three counts appear above. `edgeCount` is the number of edges you added. `arcCount` is the number
of neighbour entries: in an undirected graph each edge is stored once from each end, so two edges
give four arcs. Everything indexed by edge (edge attributes, `edgeIndexOf()`) uses edge indices;
everything stored per neighbour entry (`colIdx`, `weights`) uses arc indices. See
[Invariants and vocabulary](./invariants) for the full rules.

## Read next

- If you already hold node and edge objects, [`fromElements()`](./building#from-your-own-objects)
  builds a snapshot from them in one call.
- To read a file, use [graph-io](/graph-io/): it returns a snapshot.
- To run an algorithm or a layout on a snapshot, see [algorithms](/algorithms/) and
  [layout](/layout/).
