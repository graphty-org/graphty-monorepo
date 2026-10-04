# Reading the graph

Every load function returns the graph as a `snapshot`, a `GraphSnapshot` from
[`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format). This page shows the
parts of it you need to use a graph you loaded. The graph-format README documents the rest.

## Nodes and ids

Nodes are numbered `0` to `snapshot.nodeCount - 1` in the order the file lists them. Every function
on the snapshot takes and returns these numbers (node indexes); the ids from the file are kept in
`snapshot.ids`:

- `snapshot.ids.idOf(i)` gives the id of node `i`: a string, or a number when the file's id was an
  integer (see the `ids` option on [Options](./options.md#every-importer)).
- `snapshot.ids.has(id)` checks an id. `snapshot.ids.requireIndex(id)` gives its index, and throws
  `E_UNKNOWN_NODE` for an id the graph does not have. (`indexOf(id)` returns `4294967295` for a
  missing id instead of throwing.)
- `snapshot.ids.toArray()` gives every id, in index order.

## Attributes

Node attributes are in `snapshot.nodes`, edge attributes in `snapshot.edges`, and attributes of the
whole graph in `snapshot.graph` (one row). Each is a table of columns, one column per attribute
name:

- `names()` lists the attribute names.
- `value(name, i)` reads one value. It returns `undefined` for a node or edge that has no value
  for that attribute, and throws `E_UNKNOWN_COLUMN` for a name the table does not have.
- `has(name)` checks a name; `get(name)` returns the column, or `null`.
- `byRole(role)` returns the column that has a role, or `null`. Importers mark the columns a file
  gives a meaning: `"label"` for the node or edge label, `"weight"`, `"position"`, `"color"`, `"id"`
  for edge ids, and so on. Its name is `column.meta.name`, its type `column.meta.dtype`.

<!-- generated:begin example:reading/attributes -->

```ts
import { readFile } from "node:fs/promises";

import { importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-nodes.csv"), { filename: "got-nodes.csv" });

console.log(snapshot.nodes.names()); // the node attributes, by name
console.log(snapshot.nodes.value("Label", 0)); // one value: attribute name, node index
console.log(snapshot.nodes.byRole("label")?.meta.name); // the attribute that labels the nodes
console.log(snapshot.ids.requireIndex("Arya")); // a node's index from its id
```

<!-- generated:end -->

<!-- generated:begin output:reading/attributes -->

```text
[ 'Label' ]
Aemon
Label
12
```

<!-- generated:end -->

The attribute names are the file's. The label column is called `Label` here because the CSV header
says so, `label` in a GraphML file and `name` in some JSON files, so use `byRole("label")` when you
want the label whatever the file calls it.

## Edges

Edges are numbered `0` to `snapshot.edgeCount - 1`. `snapshot.edgeSource(e)` and
`snapshot.edgeTarget(e)` give the node indexes at the ends of edge `e`, in the direction the file
gave. `snapshot.directed` says whether the graph is directed. An undirected edge is still one edge,
with its two ends in the order the file listed them.

Whether a graph is directed comes from the file. A CSV table without a `Type` column does not say,
so graph-io reads it as directed unless you pass `defaultDirected: false`, as this example does for
the Game of Thrones edges, which are undirected.

<!-- generated:begin example:reading/edges -->

```ts
import { readFile } from "node:fs/promises";

import { importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-edges.csv"), {
    filename: "got-edges.csv",
    defaultDirected: false, // the table has no Type column; these edges are undirected
});
const weights = snapshot.edgeList().weights; // one per edge; null when the graph has no weights

for (let e = 0; e < 3; e++) {
    const source = snapshot.ids.idOf(snapshot.edgeSource(e));
    const target = snapshot.ids.idOf(snapshot.edgeTarget(e));
    console.log(`${String(source)} - ${String(target)}: ${weights ? weights[e] : 1}`);
}
console.log(snapshot.directed ? "directed" : "undirected", snapshot.edges.names());
```

<!-- generated:end -->

<!-- generated:begin output:reading/edges -->

```text
Aemon - Grenn: 5
Aemon - Samwell: 31
Aerys - Jaime: 18
undirected []
```

<!-- generated:end -->

## Weights

`snapshot.edgeList().weights` holds one weight per edge, in edge order, or is `null` when the graph
has no weights. Which attribute becomes the weight depends on the format (`weight` for most,
`value` for GML and Pajek); the [`weightFrom`](./options.md#every-importer) option changes it. A d3
JSON file usually keeps its link strengths in `value`: read it with `weightFrom: "value"`, or the
graph has no weights and `value` is a plain edge attribute.

These weights are 32-bit floats, which hold integers up to 16,777,216 and most decimals only
approximately: `0.1` is stored as `0.10000000149011612`. When a file has a weight that 32-bit floats
cannot hold exactly, the exact values are also kept in an edge attribute named `graphty.weight`,
which `byRole("weight")` finds. Read that attribute when you need the exact numbers, for example to
sum them:

<!-- generated:begin example:reading/exact-weights -->

```ts
import { importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph("source,target,weight\na,b,0.1\nb,c,2\n", { format: "csv" });

// the per-edge weights are 32-bit floats: 0.1 is not exact
console.log(snapshot.edgeList().weights?.[0]);

// when a weight does not fit exactly, the exact values are also in the weight attribute
const exact = snapshot.edges.byRole("weight");
console.log(exact?.meta.name, exact ? snapshot.edges.value(exact.meta.name, 0) : null);
```

<!-- generated:end -->

<!-- generated:begin output:reading/exact-weights -->

```text
0.10000000149011612
graphty.weight 0.1
```

<!-- generated:end -->

`snapshot.weights` is a different array: one weight per adjacency entry, which an undirected graph
has two of for each edge. Use `edgeList().weights` unless you walk the adjacency yourself.

## Degree

`snapshot.degree()` gives the number of edges at each node, as an array indexed by node.
`outDegree()` and `inDegree()` count outgoing and incoming edges of a directed graph, and
`weightedDegree()` sums the weights instead of counting.

<!-- generated:begin example:reading/degree -->

```ts
import { readFile } from "node:fs/promises";

import { importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-network.graphml"), {
    filename: "got-network.graphml",
});
const label = snapshot.nodes.byRole("label");
const degree = snapshot.degree(); // edges at each node, by node index

const top = Array.from(degree.keys())
    .sort((a, b) => degree[b] - degree[a])
    .slice(0, 5);
for (const i of top) {
    const name = label ? snapshot.nodes.value(label.meta.name, i) : snapshot.ids.idOf(i);
    console.log(`${String(name)}: ${degree[i]} edges`);
}
```

<!-- generated:end -->

<!-- generated:begin output:reading/degree -->

```text
Tyrion: 36 edges
Jon: 26 edges
Sansa: 26 edges
Robb: 25 edges
Jaime: 24 edges
```

<!-- generated:end -->

## The file's own details

`snapshot.meta` keeps what the file said about itself: `name`, `description`, `creator` and the
like, `sourceFormat` (the format it was read from) and, under `extra`, details a format keeps so it
can write the file back the same way. For a JSON file, `jsonShapeOf(snapshot)` from
`@graphty/graph-io/json` reads that record with its type, including the dialect that was read.

## Renaming an attribute before you save

The attribute tables of a loaded snapshot can be changed: `rename(from, to)`, `remove(name)`, and
`set(name, values)` to add a column. Renaming is how you put a value where another tool looks for
it. vis.js, for example, shows each node's `label`:

<!-- generated:begin example:reading/rename -->

```ts
import { readFile } from "node:fs/promises";

import { exportGraphToString, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-nodes.csv"), { filename: "got-nodes.csv" });

// vis.js shows a node's `label`; this file calls it `Label`
snapshot.nodes.rename("Label", "label");
const json = await exportGraphToString(snapshot, "json", { dialect: "vis", indent: 2 });
console.log(json.slice(0, json.indexOf("},") + 2));
```

<!-- generated:end -->

<!-- generated:begin output:reading/rename -->

```text
{
  "nodes": [
    {
      "id": "Aemon",
      "label": "Aemon"
    },
```

<!-- generated:end -->
