# Building a snapshot

There are two ways to make a snapshot: a `GraphBuilder`, which you fill one node and one edge at a
time, and the factories, which take arrays or objects you already have and return a snapshot in one
call.

## The builder

```ts
import { GraphBuilder } from "@graphty/graph-format";

const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
builder.addNode("a"); // returns the node's index, 0
builder.addEdge("a", "b", 0.5); // "b" is added on first mention
const snapshot = builder.freeze();
```

The options you are most likely to set:

| Option            | Default    | Meaning                                                                                                                     |
| ----------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| `directed`        | (required) | whether an edge runs one way; an undirected edge is stored from both ends                                                   |
| `weightDtype`     | `"f32"`    | `"f32"` or `"f64"`: the precision of edge weights                                                                           |
| `weighted`        | `"auto"`   | `"auto"` stores weights only when some `addEdge` call gave one                                                              |
| `duplicateEdges`  | `"keep"`   | a second edge between the same two nodes: `"keep"`, `"error"`, or merge it (`"first"`, `"last"`, `"sum"`, `"min"`, `"max"`) |
| `selfLoops`       | `"keep"`   | an edge from a node to itself: `"keep"`, `"drop"` or `"error"`                                                              |
| `addMissingNodes` | `true`     | whether `addEdge` creates an endpoint it has not seen; `false` throws `E_UNKNOWN_NODE`                                      |

The [API reference](../api/) lists every option of `GraphBuilderOptions`.

Node ids are strings or numbers and are never converted: `1` and `"1"` are two different nodes. A
node's index is the order in which it first appeared, and an edge's index is the order in which it
was added. Nothing is ever sorted by id, so the same calls give the same snapshot, byte for byte,
on every run and every machine.

### Freezing more than once

`freeze()` does not use the builder up: you can keep adding nodes and edges and freeze again. If
you only added, the earlier snapshot's indices are still valid in the later one (node 3 is still
node 3). `freezeWithReport()` returns the snapshot together with a `FreezeReport` that says
whether that held, and which columns had to change dtype to fit the values given.

### Attributes while building

Declare a column first, then give values per node or per edge:

```ts
builder.declareNodeColumn({ name: "label", dtype: "string", role: "label" });
builder.addNodeRecord("a", { label: "Alpha" });
builder.declareEdgeColumn({ name: "since", dtype: "i32" });
builder.addEdgeRecord("a", "b", { since: 2024 });
```

[Ids and columns](./columns) covers the dtypes and how to read the values back.

## From your own objects

`fromElements()` builds a snapshot from the node and edge objects you already hold, and hands them
back in index order, so a result indexed by node or by edge maps straight back to your objects.
Node `i` is the `i`-th node you gave and edge `e` the `e`-th edge. Parallel edges and self-loops
are always kept.

<<< ../examples/from-elements.ts

## From arrays

`fromEdgeArrays()` takes two arrays of node indices, one for the source and one for the target of
each edge, plus optional weights and ids. It is the fastest way in when your data is already
numeric, and it is what the graph-samples generators produce:

```ts
import { fromEdgeArrays } from "@graphty/graph-format";

const snapshot = fromEdgeArrays({
    directed: false,
    nodeCount: 3,
    src: new Uint32Array([0, 1]),
    dst: new Uint32Array([1, 2]),
    weights: new Float32Array([1, 2]), // optional
    ids: ["a", "b", "c"], // optional: without it a node's id is its index
});
```

Two more factories cover other shapes:

- `fromRecords({ directed, nodes, edges })` takes node-link JSON (`{ id, ... }` and
  `{ source, target, ... }`), turns the other fields into columns, and returns
  `{ snapshot, report }`.
- `fromCsr(input)` adopts CSR arrays you built yourself, after checking them.

## Errors

Every failure is a `GraphFormatError` with a stable `code` (`E_INVALID_ID`, `E_DUPLICATE_EDGE`,
`E_COLUMN_TYPE`, ...) and a `details` record naming the index, column or rule involved. A call that
throws leaves the builder or snapshot as it was.
