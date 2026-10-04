# Reading the graph

Every load function returns the graph as a `snapshot`, a `GraphSnapshot` from
[`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format). This page shows the
parts of it you need to use a graph you loaded. The graph-format README documents the rest.

## Nodes and ids

Nodes are numbered `0` to `snapshot.nodeCount - 1` in the order they are first seen in the file.
In a format that lists its nodes, that is the order of the list; in an edge list such as CSV, a
node is numbered when it first appears in an edge. Every function
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
- A column read from the table reads its own values: `column.value(i)` is the same as
  `value(column.meta.name, i)`.

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
says so, `label` in a GraphML file and `name` in a CX file, so use `byRole("label")` when you want
the label whatever the file calls it.

`byRole("label")` finds the label in every format that has a place for one: GraphML, GEXF, GML,
DOT, Pajek, CSV, XGMML, CX, CX2, Cytoscape sessions, OBO, and the JGF and OBO Graphs JSON
dialects. The other JSON dialects (node-link, d3, Cytoscape.js, graphology, vis) and Neo4j CSV have
no such place: a `label` or `name` key there is an ordinary attribute and `byRole("label")` is
`null`. Read it by name instead, for example
`snapshot.nodes.get("label") ?? snapshot.nodes.get("name")`. In a d3 file whose nodes have a
`name` and no `id`, the names are the node ids.

## Columns graph-io adds

Some imports add attributes the file does not have, to keep what the file said in a form the
snapshot can hold. Their names start with `graphty.`, so you can tell them apart:

- `graphty.directed` (edges): In a graph with both directed and undirected edges: `true` for an edge the file made directed, `false` for an undirected one. An undirected edge is stored as two edges, one each way.
- `graphty.pair` (edges): Which two edges are the halves of one undirected edge, so a save writes them back as one.
- `graphty.mutual` (edges): A GEXF `mutual` edge.
- `graphty.weight` (edges): The exact weights, when the 32-bit `edgeList().weights` cannot hold them (see [Weights](#weights)).
- `graphty.cluster` (nodes): `true` for a node that stands for a DOT cluster (`subgraph cluster_x { }`). Each cluster becomes a node, so `nodeCount` includes them.
- `graphty.parent` (nodes): The cluster a DOT node belongs to.
- `graphty.sourcePort`, `graphty.targetPort` (edges): DOT ports (`a:n -> b:s`).
- `graphty.hyperedge` (nodes): `true` for a hub node made for a GraphML hyperedge under `hyperedges: "star"`.
- `graphty.placeholder` (nodes): `true` for a node made for an OBO term that is referred to but never declared.
- `graphty.originalId` (nodes): The original ids of a GraphML file saved with `sanitizeIds: "mangle"`, read with `restoreMangledIds: false`.

Leave them in the snapshot when you save it again with graph-io: the exporters use them to write the
file back the same way. When you copy attributes into another library or count nodes, skip them:

<!-- generated:begin example:reading/added-columns -->

```ts
import { readFile } from "node:fs/promises";

import { importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("teams.gv"), { filename: "teams.gv" });

// Columns whose names start with "graphty." were added by graph-io, not by the file
const own = snapshot.nodes.names().filter((name) => !name.startsWith("graphty."));
console.log(own);

// Each DOT cluster is a node too, marked in graphty.cluster
const people = Array.from({ length: snapshot.nodeCount }, (_, i) => i).filter(
    (i) => snapshot.nodes.value("graphty.cluster", i) !== true,
);
console.log(`${snapshot.nodeCount} nodes, ${people.length} of them not clusters`);
```

<!-- generated:end -->

<!-- generated:begin output:reading/added-columns -->

```text
[ 'label', 'style', 'color', 'shape' ]
9 nodes, 7 of them not clusters
```

<!-- generated:end -->

Groups in other formats add nodes too: in a CX file, a `cyGroups` group whose id is not a node
becomes one. So `snapshot.nodeCount` of a DOT file with clusters, or a CX file with groups, is
larger than the number of nodes the file draws.

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

An edge whose weight cell is empty, or that has no weight attribute in a weighted graph, gets
the default weight 1. Its weight is recorded as missing, so a save writes no weight for it.

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
console.log(exact?.meta.name, exact?.value(0));
```

<!-- generated:end -->

<!-- generated:begin output:reading/exact-weights -->

```text
0.10000000149011612
graphty.weight 0.1
```

<!-- generated:end -->

Exact here means exact as a JavaScript number. An integer weight above 2^53, such as
9007199254740993, is stored as the nearest number (9007199254740992), and the report says so with
the warning `W_PRECISION`.

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

## Naming the graph

DOT, GEXF, GML and Pajek files can name their graph, and an import keeps the name in
`snapshot.meta.name`. A graph read from a format without one, such as CSV, has the name `null`.
The snapshot cannot be changed, so to name it, copy it into a `GraphBuilder` (from
`@graphty/graph-format`, which you add to your own dependencies for this), set the name and
freeze a new snapshot:

<!-- generated:begin example:reading/name -->

```ts
import { readFile } from "node:fs/promises";

import { GraphBuilder } from "@graphty/graph-format";
import { exportGraphToString, importGraph } from "@graphty/graph-io";

// A CSV file has no graph name
const { snapshot } = await importGraph(await readFile("got-edges.csv"), { filename: "got-edges.csv" });
console.log(snapshot.meta.name);

// A snapshot never changes: copy it into a builder, set the name, and freeze a new snapshot
const builder = GraphBuilder.from(snapshot);
builder.setMeta({ name: "got" });
const named = builder.freeze();
console.log(named.meta.name);

// Formats that write a graph name now use it; Pajek writes it on its *Network line
const pajek = await exportGraphToString(named, "pajek", { networkHeader: true });
console.log(pajek.split("\n")[0]);
```

<!-- generated:end -->

<!-- generated:begin output:reading/name -->

```text
null
got
*Network got
```

<!-- generated:end -->

To name only the saved file, pass the name to the save instead: `name` for DOT and Pajek, and
`ontology` for OBO.

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
