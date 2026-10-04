# Formats

## Which format should I use

- Between desktop tools: GEXF with Gephi, GraphML with most others (yEd, igraph, NetworkX). Both
  keep typed attributes, mixed direction and parallel edges.
- In a web page: JSON. The `node-link` dialect suits NetworkX and d3, `cytoscape` Cytoscape.js, and
  `graphology` graphology and sigma.js.
- In a spreadsheet, a database or a script: CSV, with the node table and the edge table written as
  two files.
- In Cytoscape: CX2 or XGMML to add a network to an open session, a Cytoscape session to hand over
  a whole session, and CX2 for NDEx. CX, CX2 and session node ids are integers, so pass
  `sanitizeIds: "mangle"` when you save a graph with text ids, including one you read from a
  session or a CX file, whose ids come back as the original names.
- In Neo4j: Neo4j CSV, written with `exportNeo4jFiles()` and loaded with
  `neo4j-admin database import`; see [Files for neo4j-admin](./neo4j.md#files-for-neo4j-admin).
- Ontologies: OBO, or the `obographs` dialect of JSON.
- For a picture: DOT, which Graphviz lays out and draws.
- For Pajek, UCINET or igraph: Pajek `.net` or GML. Both number their nodes, so `checkExport()`
  tells you how your ids will be written.

## Every format

graph-io reads and writes every format below. The first table lists them; the second shows what a
saved file of each format can hold, with one row per JSON dialect. A capability every format has
the same value for (none of them writes connected components, say) has no column there; each
format page lists all of them. When a graph holds
something a format cannot, `checkExport()` tells you before you save; see
[Saving graphs](../saving.md).

In the `dtypes` column, `i32` and `u32` are 32-bit integers (signed and unsigned), `u8` a byte,
`f32` and `f64` 32- and 64-bit floating-point numbers (`f64` is a JavaScript number), `bool` true or
false, `string` text, `dict` text stored once per distinct value, and `list` and `json` lists and
nested JSON values. "none" means the format keeps no attribute types: every value reads back as
text or a guessed number.

The examples on the format pages read the [sample files](../quick-start.md#sample-files); each
file they name is there.

<!-- generated:begin matrix -->

| Format                  | Subpath                     | Extensions                            | Reads | Writes | Several graphs per file |
| ----------------------- | --------------------------- | ------------------------------------- | ----- | ------ | ----------------------- |
| [json](./json.md)       | `@graphty/graph-io/json`    | `.json`                               | yes   | yes    | yes                     |
| [graphml](./graphml.md) | `@graphty/graph-io/graphml` | `.graphml`, `.xml`                    | yes   | yes    | no                      |
| [gexf](./gexf.md)       | `@graphty/graph-io/gexf`    | `.gexf`                               | yes   | yes    | no                      |
| [csv](./csv.md)         | `@graphty/graph-io/csv`     | `.csv`, `.tsv`, `.edges`, `.edgelist` | yes   | yes    | no                      |
| [gml](./gml.md)         | `@graphty/graph-io/gml`     | `.gml`                                | yes   | yes    | yes                     |
| [dot](./dot.md)         | `@graphty/graph-io/dot`     | `.dot`, `.gv`                         | yes   | yes    | yes                     |
| [pajek](./pajek.md)     | `@graphty/graph-io/pajek`   | `.net`, `.paj`                        | yes   | yes    | yes                     |
| [neo4j](./neo4j.md)     | `@graphty/graph-io/neo4j`   | `.csv`, `.tsv`                        | yes   | yes    | no                      |
| [xgmml](./xgmml.md)     | `@graphty/graph-io/xgmml`   | `.xgmml`, `.xml`                      | yes   | yes    | yes                     |
| [cx2](./cx2.md)         | `@graphty/graph-io/cx2`     | `.cx2`                                | yes   | yes    | no                      |
| [cx](./cx.md)           | `@graphty/graph-io/cx`      | `.cx`                                 | yes   | yes    | yes                     |
| [obo](./obo.md)         | `@graphty/graph-io/obo`     | `.obo`                                | yes   | yes    | no                      |
| [cys](./cys.md)         | `@graphty/graph-io/cys`     | `.cys`                                | yes   | yes    | yes                     |

### What each writer keeps

| Format                         | `mixedDirection` | `edgeIds` | `idCharset`   | `dtypes`                                         | `lists` | `json` | `defaults` | `options` | `hierarchy` | `temporal`     | `graphAttributes` | `positions` | `viz` |
| ------------------------------ | ---------------- | --------- | ------------- | ------------------------------------------------ | ------- | ------ | ---------- | --------- | ----------- | -------------- | ----------------- | ----------- | ----- |
| [json](./json.md) (node-link)  | no               | none      | any           | f64, i32, bool, string                           | no      | yes    | no         | no        | no          | none           | yes               | no          | no    |
| [json](./json.md) (d3)         | no               | none      | any           | f64, i32, bool, string                           | no      | yes    | no         | no        | no          | none           | no                | no          | no    |
| [json](./json.md) (jgf)        | yes              | optional  | any           | f64, i32, bool, string                           | no      | yes    | no         | no        | no          | none           | yes               | no          | no    |
| [json](./json.md) (cytoscape)  | no               | required  | any           | f64, i32, bool, string                           | no      | yes    | no         | no        | yes         | none           | yes               | yes         | no    |
| [json](./json.md) (graphology) | yes              | optional  | any           | f64, i32, bool, string                           | no      | yes    | no         | no        | no          | none           | yes               | no          | no    |
| [json](./json.md) (vis)        | no               | optional  | any           | f64, i32, bool, string                           | no      | yes    | no         | no        | no          | none           | no                | no          | no    |
| [json](./json.md) (obographs)  | no               | none      | any           | none                                             | no      | no     | no         | no        | no          | none           | no                | no          | no    |
| [graphml](./graphml.md)        | yes              | optional  | nmtoken       | bool, i32, f32, f64, string                      | no      | no     | yes        | no        | yes         | none           | yes               | no          | no    |
| [gexf](./gexf.md)              | yes              | optional  | any           | f32, f64, i32, bool, dict, string                | yes     | no     | yes        | yes       | yes         | dynamic-values | no                | yes         | yes   |
| [csv](./csv.md)                | yes              | optional  | any           | bool, i32, f64, string, dict                     | no      | no     | no         | no        | no          | none           | no                | no          | no    |
| [gml](./gml.md)                | no               | optional  | integer       | i32, f64, string, dict, json                     | yes     | yes    | no         | no        | no          | none           | yes               | yes         | no    |
| [dot](./dot.md)                | no               | optional  | any           | bool, i32, f64, string                           | no      | no     | no         | no        | yes         | none           | yes               | yes         | no    |
| [pajek](./pajek.md)            | yes              | none      | dense-1-based | f64, i32, bool, string                           | no      | no     | no         | no        | no          | spells         | no                | yes         | no    |
| [neo4j](./neo4j.md)            | no               | none      | any           | f32, f64, i32, bool, string                      | yes     | no     | no         | no        | no          | none           | no                | no          | no    |
| [xgmml](./xgmml.md)            | yes              | optional  | any           | string, dict, f64, f32, i32, u32, u8, bool, list | yes     | no     | no         | no        | yes         | none           | yes               | yes         | no    |
| [cx2](./cx2.md)                | no               | required  | integer       | string, f64, i32, bool                           | yes     | no     | yes        | no        | no          | none           | yes               | yes         | no    |
| [cx](./cx.md)                  | no               | required  | integer       | string, f64, i32, bool                           | yes     | no     | no         | no        | yes         | none           | yes               | yes         | no    |
| [obo](./obo.md)                | no               | none      | any           | none                                             | no      | no     | no         | no        | no          | none           | no                | no          | no    |
| [cys](./cys.md)                | yes              | required  | integer       | string, dict, f64, i32, bool, list               | yes     | no     | no         | no        | no          | none           | yes               | yes         | no    |

### What the capabilities mean

#### mixedDirection

Whether one file can hold directed and undirected edges together. When false, a graph with both needs `onMixedDirection` ("directed" or "undirected") to be saved.

#### multiEdges

Whether the file can hold two edges between the same pair of nodes. When false, the extra edges are not kept as separate edges.

#### selfLoops

Whether the file can hold an edge from a node to itself. When false, such edges are lost.

#### edgeIds

Whether edges carry ids. "required": every edge has one, and ids are made up (e0, e1, ...) for a graph without them. "optional": edge ids are written when the graph has them. "none": edge ids are lost.

#### idCharset

Which node ids the format can write as they are: "any"; "nmtoken" (XML name tokens: letters, digits and `. - _ :`, no spaces); "integer"; or "dense-1-based" (the nodes are always numbered 1 to N). Other ids need `sanitizeIds: "mangle"`, which writes the original ids too.

#### dtypes

The attribute types the format keeps exactly: "bool", "i32" (32-bit integer), "u32" (unsigned 32-bit integer), "u8" (byte), "f32" (32-bit float), "f64" (64-bit float, a JavaScript number), "string" (text), "dict" (text stored as a dictionary of repeated values), "list" and "json". An attribute of another type is written as the nearest one the format has, with a `W_DTYPE_UNSUPPORTED` note.

#### components

Whether an attribute other than the node position can hold several numbers per node or edge (a vector). When false, such an attribute does not read back as one attribute. Positions are covered by `positions`.

#### lists

Whether an attribute can hold a list per node or edge. When false, list attributes are lost or flattened.

#### json

Whether an attribute can hold nested JSON objects and arrays. When false, such attributes are written as text or lost.

#### defaults

Whether the file can declare a default value for an attribute. When false, declared defaults are lost.

#### options

Whether the file can declare the allowed values of an attribute (GEXF `options`). When false, those declarations are lost; the values themselves are kept.

#### hierarchy

Whether nodes can sit inside other nodes (groups or clusters). When false, the nesting is lost.

#### temporal

What the file can say about time: "none" (time attributes are lost), "intervals" (one start and end per element), "spells" (several intervals per element), or "dynamic-values" (attribute values that change over time, as well).

#### graphAttributes

Whether the file can hold attributes of the graph itself. When false, graph attributes are lost.

#### positions

Whether the file can hold node positions. When false, the layout is lost.

#### viz

Whether the file can hold node and edge color, size, shape and thickness. When false, they are lost.

<!-- generated:end -->
