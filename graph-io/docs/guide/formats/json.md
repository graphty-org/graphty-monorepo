# JSON

Several programs write graphs as JSON, each in its own shape. graph-io calls these shapes dialects
and reads and writes all of these:

| Dialect      | Written by                                                                                                 | Looks like                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `node-link`  | [NetworkX](https://networkx.org/documentation/stable/reference/readwrite/json_graph.html) `node_link_data` | `{ "nodes": [...], "edges": [...] }`                 |
| `d3`         | d3 force examples                                                                                          | `{ "nodes": [...], "links": [...] }`                 |
| `jgf`        | [JSON Graph Format](https://jsongraphformat.info/)                                                         | `{ "graph": { "nodes": {...}, "edges": [...] } }`    |
| `cytoscape`  | [Cytoscape.js](https://js.cytoscape.org/#notation/elements-json)                                           | `{ "elements": { "nodes": [...], "edges": [...] } }` |
| `graphology` | [graphology](https://graphology.github.io/serialization.html)                                              | `{ "nodes": [{ "key": ... }], "edges": [...] }`      |
| `vis`        | [vis-network](https://visjs.github.io/vis-network/docs/network/)                                           | edges with `from` and `to`                           |
| `obographs`  | [OBO Graphs](https://github.com/geneontology/obographs), the JSON of the Gene Ontology                     | `{ "graphs": [{ "nodes": [...], "edges": [...] }] }` |
| `adjacency`  | NetworkX `adjacency_data` (read only)                                                                      | `{ "nodes": [...], "adjacency": [[...]] }`           |
| `tree`       | NetworkX `tree_data` (read only)                                                                           | nested `{ "id": ..., "children": [...] }`            |

## At a glance

<!-- generated:begin glance:json -->

|                         |                          |
| ----------------------- | ------------------------ |
| Import from             | `@graphty/graph-io/json` |
| Format name             | `json`                   |
| Extensions              | `.json`                  |
| MIME types              | `application/json`       |
| Reads                   | yes                      |
| Writes                  | yes                      |
| Several graphs per file | yes (`importAllGraphs`)  |
| Lists its graphs        | yes (`listGraphs`)       |

What a saved file can hold (the [capabilities](./index.md#what-the-capabilities-mean) explain each row):

| Capability                                      | `node-link`            | `d3`                   | `jgf`                  | `cytoscape`            | `graphology`           | `vis`                  | `obographs` |
| ----------------------------------------------- | ---------------------- | ---------------------- | ---------------------- | ---------------------- | ---------------------- | ---------------------- | ----------- |
| [`mixedDirection`](./index.md#mixeddirection)   | no                     | no                     | yes                    | no                     | yes                    | no                     | no          |
| [`multiEdges`](./index.md#multiedges)           | yes                    | yes                    | yes                    | yes                    | yes                    | yes                    | yes         |
| [`selfLoops`](./index.md#selfloops)             | yes                    | yes                    | yes                    | yes                    | yes                    | yes                    | yes         |
| [`edgeIds`](./index.md#edgeids)                 | none                   | none                   | optional               | required               | optional               | optional               | none        |
| [`idCharset`](./index.md#idcharset)             | any                    | any                    | any                    | any                    | any                    | any                    | any         |
| [`dtypes`](./index.md#dtypes)                   | f64, i32, bool, string | f64, i32, bool, string | f64, i32, bool, string | f64, i32, bool, string | f64, i32, bool, string | f64, i32, bool, string | none        |
| [`components`](./index.md#components)           | no                     | no                     | no                     | no                     | no                     | no                     | no          |
| [`lists`](./index.md#lists)                     | no                     | no                     | no                     | no                     | no                     | no                     | no          |
| [`json`](./index.md#json)                       | yes                    | yes                    | yes                    | yes                    | yes                    | yes                    | no          |
| [`defaults`](./index.md#defaults)               | no                     | no                     | no                     | no                     | no                     | no                     | no          |
| [`options`](./index.md#options)                 | no                     | no                     | no                     | no                     | no                     | no                     | no          |
| [`hierarchy`](./index.md#hierarchy)             | no                     | no                     | no                     | yes                    | no                     | no                     | no          |
| [`temporal`](./index.md#temporal)               | none                   | none                   | none                   | none                   | none                   | none                   | none        |
| [`graphAttributes`](./index.md#graphattributes) | yes                    | no                     | yes                    | yes                    | yes                    | no                     | no          |
| [`positions`](./index.md#positions)             | no                     | no                     | no                     | yes                    | no                     | no                     | no          |
| [`viz`](./index.md#viz)                         | no                     | no                     | no                     | no                     | no                     | no                     | no          |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/json -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToString, importGraph } from "@graphty/graph-io";
import { jsonShapeOf } from "@graphty/graph-io/json";

// got.json is a d3 file whose link strengths are in "value"; weightFrom reads them as the edge weights
const { snapshot } = await importGraph(await readFile("got.json"), { filename: "got.json", weightFrom: "value" });
console.log(`${jsonShapeOf(snapshot)?.dialect}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(`first weight: ${String(snapshot.edgeList().weights?.[0])}`);

// Pick another dialect with the dialect option
const cytoscape = await exportGraphToString(snapshot, "json", { dialect: "cytoscape", indent: 2 });
console.log(cytoscape.split("\n").slice(0, 8).join("\n"));
await writeFile("got.cyjs", cytoscape);
```

<!-- generated:end -->

<!-- generated:begin output:formats/json -->

```text
d3: 107 nodes, 352 edges
first weight: 5
{
  "elements": {
    "nodes": [
      {
        "data": {
          "id": "Aemon",
          "label": "Aemon"
        }
```

<!-- generated:end -->

The dialect is detected from the document, and `jsonShapeOf(snapshot).dialect` says which one was
read, whether you passed `format: "json"` or not. Saving to JSON without a `dialect` writes the same
dialect back, with the same keys. Pass `dialect` to write another one. The adjacency and tree
dialects are written as node-link.

The sample keeps its link strengths in `value`, as d3's examples do. graph-io reads the weight from
`weight` unless you pass `weightFrom`. Without `weightFrom: "value"` the graph would have no weights,
and `value` would be a plain edge attribute: an analysis that sums weights would quietly count every
edge as 1.

## How graph-io reads it

- The whole document is read as text before it is parsed. A document longer than the longest
  JavaScript string (about 512 MB) fails with `E_TOO_LARGE`.
- The dialect is detected from the document's shape; pass `dialect` to choose it.
- JSON values keep their types, so ids are read as they are (`ids: "keep"`): `1` is a number and
  `"1"` is text. Attribute columns take the type of their values.
- The edge attribute `weight` (or whatever `weightFrom` names) is the edge weight. A d3 file's
  `value` is not read as the weight unless you pass `weightFrom: "value"`.
- In a document with a `graphs` array (JSON Graph Format, OBO Graphs), `graphName` matches a
  graph's `id`, not its `label`; a graph without an `id` is matched by its `label`.
  `listGraphs()` shows the names.
- `nodesPath` and `edgesPath` point at node and edge arrays nested anywhere in the document, as
  dotted paths (`{ nodesPath: "data.nodes", edgesPath: "data.relationships" }`), for the node-link,
  d3, vis and graphology dialects.
- Python writes `NaN`, `Infinity` and `-Infinity`, which strict JSON does not allow; graph-io reads
  them as numbers with a warning (`W_JSON_NONSTANDARD_NUMBER`). An integer beyond 2^53 keeps its
  exact digits as text (`W_JSON_BIG_INTEGER`), so two large ids never round to the same number.
- A repeated node id is merged (`W_DUPLICATE_NODE`); a repeated edge id is an error and that edge is
  skipped (`E_DUPLICATE_EDGE_ID`).

## The dialects

### node-link and d3

NetworkX's node-link shape: a `nodes` array and an `edges` (or older `links`) array, with
`directed`, `multigraph` and `graph` at the top. d3's examples use the same shape with `links`,
`name` as the node id, and edges that point at nodes by their position in the array.
`indexLinks` says whether edge ends are positions; by default graph-io decides from the data.

### JSON Graph Format (jgf)

Nodes keyed by id, a `directed` flag per graph and per edge, so one file can mix directions, and a
`graphs` array for several graphs. Hyperedges follow the
[`hyperedges`](../options.md#import-hyperedges) option: under `"star"` the hyperedge's first node
is joined to each other end and no node is added, under `"clique"` every pair of ends is joined,
and each edge made this way carries the hyperedge's id, label, relation and metadata.

### Cytoscape.js (cytoscape)

An `elements` object, or array, of `{ data, position, classes }`. `data.parent` becomes the parent
column and `position` the position. Cytoscape's y axis points down; graph-io stores y pointing up,
so it negates y when it reads and again when it writes. The dialect has no undirected edges:
every edge is written directed.

### graphology

`nodes` of `{ key, attributes }`, `edges` that can each be `undirected`, and an `options` object.
A file written back keeps only the options it declared.

### vis.js (vis)

`nodes` and `edges` arrays whose edges use `from` and `to`. Like Cytoscape.js, it has no undirected
edges. Attributes are written under their own names, and vis-network shows a node's `label`. When
the label attribute has another name, rename it before you save, as
[Reading the graph](../reading.md#renaming-an-attribute-before-you-save) shows.

`checkExport()` returns `W_ROLE_DROPPED` for the label in the vis and d3 dialects even when the
attribute is already named `label`. The note means that graph-io, reading the file back, gives
`label` no label role; the values are written, and vis-network shows them. If you only open the
file in vis-network, you can ignore it.

### OBO Graphs (obographs)

The JSON the Gene Ontology and the OBO Foundry publish: `graphs` of nodes and `sub` / `pred` /
`obj` edges. It is read into the same columns as the [OBO](./obo.md) format: an IRI becomes the id
an `.obo` file uses (`http://purl.obolibrary.org/obo/GO_0008150` becomes `GO:0008150`; `oboIds:
"iri"` keeps the IRIs), and a relation is named by its short name (`part_of`). Property nodes and
axioms are kept in `snapshot.meta.extra.obographs` (`typedefs: "nodes"` makes the properties
nodes), and an edge to a node the file does not list creates a placeholder node with a warning.
Writing OBO Graphs turns the OBO columns back into `lbl`, `type` and `meta`, and prefixed ids back
into IRIs (`GO:0008150` becomes `http://purl.obolibrary.org/obo/GO_0008150`). An id without a
prefix is written as it is, because that is the form graph-io reads back as the same id. A graph
read from OBO Graphs keeps its own graph id; the `ontologyIri` option is the graph id only for a
graph that has none.

### adjacency and tree (read only)

NetworkX's `adjacency_data` (`nodes` plus an `adjacency` list per node; an undirected file lists
each edge from both ends, and graph-io reads it once) and `tree_data` (nested `id` / `children`,
read as a directed tree). They are written back as node-link.

## What a saved file keeps and loses

What survives depends on the dialect; the [All formats](./index.md) table has one row per
dialect. In every dialect:

- JSON declares no types, so a column comes back with the type its values suggest: smaller number
  types come back as 64-bit floats or integers, a floating-point column whose values are all whole
  numbers comes back as integers, and dictionary, list and vector columns come back as text or JSON.
  `checkExport()` names each such column.
- `NaN` and the infinities are written as `null` and reported.
- An integer beyond 2^53 is written in exponent form (`1e+20`) so it reads back as a number.
- Edge ids exist in JGF, Cytoscape.js, graphology and vis only; positions in Cytoscape.js only;
  graph attributes in node-link, JGF, Cytoscape.js and graphology.
- Columns that a dialect has no slot for are written as plain attributes under their names, and a
  column with a role the dialect cannot express (a position in node-link, say) loses the role
  (`W_ROLE_DROPPED`).

<!-- generated:begin reference:json -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).
A file can hold several graphs: pick one with the `graphIndex` or `graphName` option of [importGraph()](../options.md#importgraph-and-importallgraphs), as [Files that hold several graphs](../loading.md#files-that-hold-several-graphs) shows.

| Option                           | Type                                                                                                                     | Default            | Meaning                                                                                                                                                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`dialect`](#import-dialect)     | `"node-link" \| "d3" \| "jgf" \| "cytoscape" \| "graphology" \| "vis" \| "obographs" \| "adjacency" \| "tree" \| "auto"` | `"auto"`           | The dialect to read; "auto" detects it from the document.                                                                                                                                                                                                              |
| [`nodeIdKey`](#import-nodeidkey) | `string`                                                                                                                 | `"id"`             | node-link, d3, vis, adjacency and tree documents: the node key that holds the id.                                                                                                                                                                                      |
| [`edgesKey`](#import-edgeskey)   | `string`                                                                                                                 | "edges" or "links" | node-link and d3 documents: the top-level key that holds the edges.                                                                                                                                                                                                    |
| [`sourceKey`](#import-sourcekey) | `string`                                                                                                                 | `"source"`         | node-link, d3 and vis documents: the edge key that holds the source.                                                                                                                                                                                                   |
| [`targetKey`](#import-targetkey) | `string`                                                                                                                 | `"target"`         | node-link, d3 and vis documents: the edge key that holds the target.                                                                                                                                                                                                   |
| `indexLinks`                     | `boolean \| "auto"`                                                                                                      | `"auto"`           | node-link and d3 documents: whether edge ends are positions in the node array rather than ids; "auto" says yes when every end is an integer below the number of nodes and no node id is a number.                                                                      |
| `oboIds`                         | `"curie" \| "iri"`                                                                                                       | `"curie"`          | OBO Graphs documents: "curie" reads `http://purl.obolibrary.org/obo/GO_0008150` as `GO:0008150` and `.../obo/go#regulates` as `regulates`, the ids the `.obo` file of the same ontology uses; "iri" keeps every IRI as written.                                        |
| `typedefs`                       | `"metadata" \| "nodes"`                                                                                                  | `"metadata"`       | OBO Graphs documents: "metadata" keeps the relation definitions (PROPERTY nodes, with their subPropertyOf and inverseOf edges) in `snapshot.meta.extra.obographs`, the way the OBO importer keeps `[Typedef]` frames; "nodes" makes them nodes and edges of the graph. |
| [`nodesPath`](#import-nodespath) | `string`                                                                                                                 | `"nodes"`          | node-link, d3, vis and graphology documents: where the node array is, as a dotted path of keys and array positions from the top of the document (`"data.nodes"`, `"graphs.0.nodes"`).                                                                                  |
| [`edgesPath`](#import-edgespath) | `string`                                                                                                                 | next to the nodes  | node-link, d3, vis and graphology documents: where the edge array is, as a dotted path (`"data.links"`).                                                                                                                                                               |

- <a id="import-dialect"></a>`dialect`: The dialect to read; "auto" detects it from the document. `jsonShapeOf(snapshot).dialect` is the dialect that was read.
- <a id="import-nodeidkey"></a>`nodeIdKey`: node-link, d3, vis, adjacency and tree documents: the node key that holds the id. The default is "id" (for node-link and d3, "name" when no node has an "id").
- <a id="import-edgeskey"></a>`edgesKey`: node-link and d3 documents: the top-level key that holds the edges. The default is "edges" when the document has it, else "links".
- <a id="import-sourcekey"></a>`sourceKey`: node-link, d3 and vis documents: the edge key that holds the source. The default is the first of "source", "src" and "from" the edges use (vis: "from").
- <a id="import-targetkey"></a>`targetKey`: node-link, d3 and vis documents: the edge key that holds the target. The default is the first of "target", "dst" and "to" the edges use (vis: "to").
- <a id="import-nodespath"></a>`nodesPath`: node-link, d3, vis and graphology documents: where the node array is, as a dotted path of keys and array positions from the top of the document (`"data.nodes"`, `"graphs.0.nodes"`). The object that holds the array is read as the graph (its `directed`, `multigraph`, `graph` and edge keys). A path that leads nowhere is reported as `E_MISSING_SECTION` and the graph has no nodes.
- <a id="import-edgespath"></a>`edgesPath`: node-link, d3, vis and graphology documents: where the edge array is, as a dotted path (`"data.links"`). The default is the edges or links key next to the node array. A path that leads nowhere is reported as `E_MISSING_SECTION` and the graph has no edges.

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option                               | Type                                                                                  | Default                    | Meaning                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| [`dialect`](#export-dialect)         | `"node-link" \| "d3" \| "jgf" \| "cytoscape" \| "graphology" \| "vis" \| "obographs"` | as read, else "node-link"  | The dialect to write.                                                            |
| `indent`                             | `number`                                                                              | `0`                        | Spaces per indentation level; 0 writes compact JSON.                             |
| [`edgesKey`](#export-edgeskey)       | `string`                                                                              | as read, else "edges"      | node-link and d3: the key of the edge array.                                     |
| [`nodeIdKey`](#export-nodeidkey)     | `string`                                                                              | as read, else "id"         | node-link, d3 and vis: the node id key.                                          |
| [`indexLinks`](#export-indexlinks)   | `boolean`                                                                             | as read, else false        | node-link and d3: write edge ends as positions in the node array instead of ids. |
| [`sourceKey`](#export-sourcekey)     | `string`                                                                              | as read, else "source"     | node-link, d3 and vis: the source key.                                           |
| [`targetKey`](#export-targetkey)     | `string`                                                                              | as read, else "target"     | node-link, d3 and vis: the target key.                                           |
| [`weightKey`](#export-weightkey)     | `string`                                                                              | as read, else "weight"     | The key the weight is written under.                                             |
| [`ontologyIri`](#export-ontologyiri) | `string`                                                                              | the ontology's OBO address | OBO Graphs: the graph id written when the graph has none.                        |

- <a id="export-dialect"></a>`dialect`: The dialect to write. The default is the dialect a JSON import read, else "node-link". Attributes are written under their own names; vis.js shows the `label` attribute, so rename the attribute you want shown to `label` first (`snapshot.nodes.rename("name", "label")`).
- <a id="export-edgeskey"></a>`edgesKey`: node-link and d3: the key of the edge array. The default is the key a JSON import read, else "edges" ("links" for d3).
- <a id="export-nodeidkey"></a>`nodeIdKey`: node-link, d3 and vis: the node id key. The default is the key a JSON import read, else "id".
- <a id="export-indexlinks"></a>`indexLinks`: node-link and d3: write edge ends as positions in the node array instead of ids. The default is what a JSON import read, else false.
- <a id="export-sourcekey"></a>`sourceKey`: node-link, d3 and vis: the source key. The default is the key a JSON import read, else "source" ("from" for vis). graph-io finds "source", "src" and "from" by itself; for another key, read the file back with the same `sourceKey` import option, or every edge is skipped.
- <a id="export-targetkey"></a>`targetKey`: node-link, d3 and vis: the target key. The default is the key a JSON import read, else "target" ("to" for vis). graph-io finds "target", "dst" and "to" by itself; for another key, read the file back with the same `targetKey` import option.
- <a id="export-weightkey"></a>`weightKey`: The key the weight is written under. The default is the key a JSON import read the weights from, else "weight". For another key, read the file back with `weightFrom` set to it, or the weights come back as a plain edge attribute.
- <a id="export-ontologyiri"></a>`ontologyIri`: OBO Graphs: the graph id written when the graph has none. A graph read from an OBO Graphs document keeps its own graph id, which this option does not change. Node ids are written in the form graph-io reads back as the same id: an IRI as it is, a prefixed id such as `GO:0008150` as its OBO address, and an id without a prefix (`a`) as it is, not under this IRI. The default is `http://purl.obolibrary.org/obo/<ontology>.owl`.

## Import issue codes

The codes this format's import report can hold. They are also exported as `JSON_ISSUE` from `@graphty/graph-io/json`, keyed by the code without its `E_` / `W_` and `JSON_` prefixes.

- `E_EMPTY_INPUT` (error): The text is empty or whitespace. The import stops.
- `E_TOO_LARGE` (error): The document is longer than a JavaScript string can hold. The import stops.
- `E_DUPLICATE_EDGE_ID` (error): An edge id (Cytoscape data.id, graphology key, vis id) repeated by a later edge; the edge is skipped.
- `E_SYNTAX` (error): The text is not valid JSON. The import stops.
- `E_JSON_DIALECT` (error): No dialect matches the document's top-level shape.
- `E_JSON_SHAPE` (error): A section (nodes, edges, elements, graph) has the wrong JSON type.
- `E_MISSING_SECTION` (error): A node-link document lacks its nodes or its edges array, or a Cytoscape document its elements.
- `E_BAD_ELEMENT` (error): A node record or an element is not an object.
- `E_MISSING_ID` (error): A node record has no id.
- `E_UNSUPPORTED_ID` (error): A node id is a JSON boolean or null, which graph-io cannot use as an id; the node is skipped. With `ids: "string"` it is read as the text "true", "false" or "null".
- `E_MISSING_ENDPOINT` (error): An edge record has no source or no target.
- `E_BAD_INDEX` (error): An index endpoint is not an integer below the node count, or names a skipped node.
- `E_BAD_VALUE` (error): A declared field has the wrong JSON type (JGF label / relation / metadata, Cytoscape position / classes).
- `W_BAD_FLAG` (warning): A graph-level flag (`directed`, `multigraph`, graphology `options`) has the wrong type; the default is used.
- `E_UNKNOWN_PARENT` (error): A Cytoscape `data.parent` names an unknown node.
- `W_DUPLICATE_NODE` (warning): A node id repeated by a later record; the records are merged (the later attributes win).
- `W_ID_MERGED` (warning): Two different id texts became the same number because `ids` is "number", so their nodes were merged.
- `W_EDGE_ID_STRINGIFIED` (warning): Edge ids of mixed JSON types were stored as text.
- `W_MULTIPLE_GRAPHS` (warning): The file holds several graphs and only one was read: the first, or the one `graphIndex` or `graphName` chose. `importAllGraphs()` reads every one.
- `E_GRAPH_NOT_FOUND` (error): `graphIndex` is past the end of the `graphs` array, or `graphName` matches none of its graphs. The import stops.
- `E_AMBIGUOUS_GRAPH_NAME` (error): `graphName` matches more than one graph of the `graphs` array. The import stops.
- `W_JSON_OBOGRAPHS_SUBJ` (warning): Obographs: an edge uses the outdated `subj` key of the OBO Graphs README; it is read as `sub`.
- `W_DANGLING_REFERENCE` (warning): Obographs: an edge endpoint missing from `nodes` (a placeholder node is made, or the edge dropped under addMissingNodes false).
- `E_HYPEREDGE` (error): A JGF hyperedge (an edge with more than two ends) while `hyperedges` is "error".
- `W_HYPEREDGES_SKIPPED` (warning): JGF hyperedges were skipped, because `hyperedges` is "skip" (the default). Pass "star" or "clique" to keep them.
- `E_HYPEREDGE_SHAPE` (error): A JGF hyperedge with neither a nodes array nor source / target arrays.
- `W_POSITIONAL_NODES` (warning): The nodes have no id key at all; array positions became the ids.
- `W_JSON_UNREAD_KEY` (warning): A node-link / d3 top-level key the importer does not read (the other of edges / links, an unknown key); it is dropped.
- `W_SINK_OPTION` (warning): You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.
- `W_OPTION_IGNORED` (warning): You set an option this format does not use; it had no effect. The message names the option.
- `E_INVALID_UTF8` (error): The input is not valid UTF-8. The import stops.
- `E_INVALID_ENCODING` (error): Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the `encoding` option). The import stops.
- `W_ENCODING_FALLBACK` (warning): Bytes that are not UTF-8 and declare no encoding were read as windows-1252.
- `W_JSON_NONSTANDARD_NUMBER` (warning): The document uses the non-standard tokens NaN / Infinity / -Infinity (Python's json writes them); read as numbers.
- `W_JSON_BIG_INTEGER` (warning): Integer literals beyond 2^53 were read as their exact digits (strings), not as rounded numbers.
- `W_UNKNOWN_ENCODING` (warning): A declared encoding the platform cannot decode was ignored.
- `W_PRECISION` (warning): An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.
- `W_JSON_INCONSISTENT` (warning): The document contradicts itself: a declared option its edges break (multigraph false with parallel links, graphology's options), a record whose section disagrees with its shape, a JGF inner id other than its key, the two listings of one adjacency edge.
- `W_JSON_INDEX_LINKS` (warning): IndexLinks "auto" read integer endpoints as array positions although they also name node ids.
- `E_PARENT_CYCLE` (error): A Cytoscape parent link that would close a cycle; that link is dropped.
- `W_EMPTY_COLUMN_DROPPED` (warning): An attribute key that is null on every element makes no column (NetworkX writes None as null).
- `W_UNKNOWN_ELEMENT` (warning): OBO Graphs: a node type or synonym predicate outside the schema's set; kept as written, once per name.
- `W_DUPLICATE_ATTRIBUTE` (warning): A key repeated in one JSON object (JSON.parse keeps the last value, the earlier is dropped), or, in OBO Graphs, a single-valued OBO tag given twice in basicPropertyValues (the first is kept).
- `W_COLUMN_RENAMED` (warning): An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a repeated column header.
- `W_ROLE_TAKEN` (warning): You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.

Like every format, it can also record the codes for unreadable input and for elements the graph refuses: [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED), [`E_INVALID_ID`](../codes.md#E_INVALID_ID), [`E_UNKNOWN_NODE`](../codes.md#E_UNKNOWN_NODE), [`E_INVALID_WEIGHT`](../codes.md#E_INVALID_WEIGHT), [`E_DUPLICATE_EDGE`](../codes.md#E_DUPLICATE_EDGE), [`E_SELF_LOOP`](../codes.md#E_SELF_LOOP).

## Loss codes

The codes `checkExport(snapshot, "json", options)` can return before a save, also exported as `JSON_LOSS` from `@graphty/graph-io/json`. An `E_` code means the save throws unless you change the graph or the options.

- `W_NONFINITE_AS_NULL` (warning): Non-finite numbers (columns, weights) are written as null.
- `W_DIRECTION_DROPPED` (warning): The file cannot record direction: an undirected graph's edges read back as directed, or the whole graph reads back with the importer's default direction.
- `W_MUTUAL_EXPANDED` (warning): GEXF mutual pairs are written as two directed edges.
- `W_NUMERIC_IDS_STRINGIFIED` (warning): JGF keys its nodes by text, so number ids read back as text, unless you read the file with `ids: "canonical"`.
- `E_ID_TEXT_COLLISION` (error, the save throws): Two node ids would be written as the same text (the number 5 and the text "5"); the save fails with `E_INVALID_ID`.
- `W_NODE_ORDER` (warning): The nodes read back in a different order.
- `W_RESERVED_KEY` (warning): A column named like a reserved key of the dialect (id, source, target, ...) is skipped.
- `W_WEIGHT_KEY_CLASH` (warning): An attribute without the weight role is named like the key weights are written under; it reads back as the edge weight, or is not written when the graph has weights of its own.
- `W_POSITIONS_DROPPED` (warning): A position column without a slot (every dialect but Cytoscape) is a plain array attribute; the role is lost.
- `W_POSITION_Z_DROPPED` (warning): Cytoscape positions are 2D; non-zero z values are dropped.
- `W_PARENTS_DROPPED` (warning): Cytoscape has a single parent; a `parents` list column cannot be written.
- `W_EDGE_IDS_DROPPED` (warning): Node-link / d3 have no edge id slot; the id column is written as a plain attribute.
- `W_INTEGRAL_F64_AS_I32` (warning): A number attribute whose values are all whole numbers reads back as integers, because the format does not record the type.
- `W_ROLE_DROPPED` (warning): An attribute with a role the format has no place for is written as a plain attribute; the role is lost.
- `W_EMPTY_COLUMN_DROPPED` (warning): A column without a set cell is not written (JSON declares no columns).
- `W_OBOGRAPHS_EDGE_COLUMN_AS_META` (warning): Obographs: an edge column (or the explicit weights) is written into each edge's meta and reads back inside the meta column.
- `W_OBOGRAPHS_ID_CHANGED` (warning): Obographs: a node id or relation is written as an IRI the importer's default oboIds "curie" reads back as another id.
- `W_OBOGRAPHS_DATATYPE_DROPPED` (warning): Obographs: a property_value's xsd datatype has no place in basicPropertyValues and reads back unset.
- `W_COLUMN_AS_PROPERTY_VALUE` (warning): Obographs: a node column outside the OBO vocabulary reads back inside the property_value column.
- `W_RELATION_ASSUMED` (warning): Obographs: an edge without a relation is written with the pred is_a.
- `W_TYPEDEF_NODES` (warning): Obographs: Typedef nodes are written as PROPERTY nodes, which read back as nodes only under typedefs: "nodes".
- `W_GRAPH_COLUMN_AS_METADATA` (warning): OBO Graphs: a graph attribute is written into the graph's `meta` and reads back in `snapshot.meta.extra.obographs`.
- `W_ID_TEXT_TYPE` (warning): Obographs: numeric node ids are written as text and read back as strings.
- `W_ROLE_ASSUMED` (warning): An attribute without a role is written where the format keeps a role (a `name` column as the label, say), and reads back with that role.
- `W_COLUMN_NAME_CHANGED` (warning): An attribute with a role (the label, say) is written where the format keeps that role, and reads back under the name the format's importer gives it.
- `W_DTYPE_UNSUPPORTED` (warning): OBO Graphs: an OBO attribute stored as text where graph-io uses a dictionary (or the other way round); it reads back with graph-io's usual type. The values are the same.

When the graph has something this format cannot hold, it can also return the [shared loss codes](../codes.md#shared-loss-codes): [`E_ID_CHARSET`](../codes.md#E_ID_CHARSET), [`E_MIXED_DIRECTION`](../codes.md#E_MIXED_DIRECTION), [`E_XML_ILLEGAL_CHAR`](../codes.md#E_XML_ILLEGAL_CHAR), [`W_COLUMN_DROPPED`](../codes.md#W_COLUMN_DROPPED), [`W_COMPONENTS_FLATTENED`](../codes.md#W_COMPONENTS_FLATTENED), [`W_DEFAULT_DROPPED`](../codes.md#W_DEFAULT_DROPPED), [`W_DYNAMIC_VALUES_DROPPED`](../codes.md#W_DYNAMIC_VALUES_DROPPED), [`W_EDGE_IDS_GENERATED`](../codes.md#W_EDGE_IDS_GENERATED), [`W_EXTENSION_TABLE_DROPPED`](../codes.md#W_EXTENSION_TABLE_DROPPED), [`W_GRAPH_ATTRIBUTES_DROPPED`](../codes.md#W_GRAPH_ATTRIBUTES_DROPPED), [`W_HIERARCHY_DROPPED`](../codes.md#W_HIERARCHY_DROPPED), [`W_ID_MANGLED`](../codes.md#W_ID_MANGLED), [`W_ID_RENUMBERED`](../codes.md#W_ID_RENUMBERED), [`W_JSON_UNSUPPORTED`](../codes.md#W_JSON_UNSUPPORTED), [`W_LIST_UNSUPPORTED`](../codes.md#W_LIST_UNSUPPORTED), [`W_MIXED_DIRECTION`](../codes.md#W_MIXED_DIRECTION), [`W_MULTI_EDGES`](../codes.md#W_MULTI_EDGES), [`W_MUTUAL_AS_UNDIRECTED`](../codes.md#W_MUTUAL_AS_UNDIRECTED), [`W_OPEN_INTERVAL`](../codes.md#W_OPEN_INTERVAL), [`W_OPTIONS_DROPPED`](../codes.md#W_OPTIONS_DROPPED), [`W_OPTIONS_GAINED`](../codes.md#W_OPTIONS_GAINED), [`W_SELF_LOOPS`](../codes.md#W_SELF_LOOPS), [`W_SPELLS_DROPPED`](../codes.md#W_SPELLS_DROPPED), [`W_STORAGE_CLASS_CHANGED`](../codes.md#W_STORAGE_CLASS_CHANGED), [`W_TEMPORAL_DROPPED`](../codes.md#W_TEMPORAL_DROPPED), [`W_TEMPORAL_TEXT_DROPPED`](../codes.md#W_TEMPORAL_TEXT_DROPPED), [`W_TEXT_INFERRED`](../codes.md#W_TEXT_INFERRED), [`W_VIZ_DROPPED`](../codes.md#W_VIZ_DROPPED), [`W_WEIGHTS_DROPPED`](../codes.md#W_WEIGHTS_DROPPED).

<!-- generated:end -->
