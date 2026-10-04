# Formats

graph-io reads and writes every format below. The first table lists them; the second shows what a
saved file of each format can hold, with one row per JSON dialect. When a graph holds something a
format cannot, `checkExport()` tells you before you save; see [Saving graphs](../saving.md).

In the `dtypes` column, `i32` and `u32` are 32-bit integers (signed and unsigned), `u8` a byte,
`f32` and `f64` 32- and 64-bit floating-point numbers (`f64` is a JavaScript number), `bool` true or
false, `string` text, `dict` text stored once per distinct value, and `list` and `json` lists and
nested JSON values. "none" means the format keeps no attribute types: every value reads back as
text or a guessed number.

The examples on the format pages read files by name, such as `karate.gml`. Use any file of that
format, or the [sample files](../quick-start.md#sample-files).

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

| Format                         | `mixedDirection` | `multiEdges` | `selfLoops` | `edgeIds` | `idCharset`   | `dtypes`                                         | `components` | `lists` | `json` | `defaults` | `options` | `hierarchy` | `temporal`     | `graphAttributes` | `positions` | `viz` |
| ------------------------------ | ---------------- | ------------ | ----------- | --------- | ------------- | ------------------------------------------------ | ------------ | ------- | ------ | ---------- | --------- | ----------- | -------------- | ----------------- | ----------- | ----- |
| [json](./json.md) (node-link)  | no               | yes          | yes         | none      | any           | f64, i32, bool, string                           | no           | no      | yes    | no         | no        | no          | none           | yes               | no          | no    |
| [json](./json.md) (d3)         | no               | yes          | yes         | none      | any           | f64, i32, bool, string                           | no           | no      | yes    | no         | no        | no          | none           | no                | no          | no    |
| [json](./json.md) (jgf)        | yes              | yes          | yes         | optional  | any           | f64, i32, bool, string                           | no           | no      | yes    | no         | no        | no          | none           | yes               | no          | no    |
| [json](./json.md) (cytoscape)  | no               | yes          | yes         | required  | any           | f64, i32, bool, string                           | no           | no      | yes    | no         | no        | yes         | none           | yes               | yes         | no    |
| [json](./json.md) (graphology) | yes              | yes          | yes         | optional  | any           | f64, i32, bool, string                           | no           | no      | yes    | no         | no        | no          | none           | yes               | no          | no    |
| [json](./json.md) (vis)        | no               | yes          | yes         | optional  | any           | f64, i32, bool, string                           | no           | no      | yes    | no         | no        | no          | none           | no                | no          | no    |
| [json](./json.md) (obographs)  | no               | yes          | yes         | none      | any           | none                                             | no           | no      | no     | no         | no        | no          | none           | no                | no          | no    |
| [graphml](./graphml.md)        | yes              | yes          | yes         | optional  | nmtoken       | bool, i32, f32, f64, string                      | no           | no      | no     | yes        | no        | yes         | none           | yes               | no          | no    |
| [gexf](./gexf.md)              | yes              | yes          | yes         | optional  | any           | f32, f64, i32, bool, dict, string                | no           | yes     | no     | yes        | yes       | yes         | dynamic-values | no                | yes         | yes   |
| [csv](./csv.md)                | yes              | yes          | yes         | optional  | any           | bool, i32, f64, string, dict                     | no           | no      | no     | no         | no        | no          | none           | no                | no          | no    |
| [gml](./gml.md)                | no               | yes          | yes         | optional  | integer       | i32, f64, string, dict, json                     | no           | yes     | yes    | no         | no        | no          | none           | yes               | yes         | no    |
| [dot](./dot.md)                | no               | yes          | yes         | optional  | any           | bool, i32, f64, string                           | no           | no      | no     | no         | no        | yes         | none           | yes               | yes         | no    |
| [pajek](./pajek.md)            | yes              | yes          | yes         | none      | dense-1-based | f64, i32, bool, string                           | no           | no      | no     | no         | no        | no          | spells         | no                | yes         | no    |
| [neo4j](./neo4j.md)            | no               | yes          | yes         | none      | any           | f32, f64, i32, bool, string                      | no           | yes     | no     | no         | no        | no          | none           | no                | no          | no    |
| [xgmml](./xgmml.md)            | yes              | yes          | yes         | optional  | any           | string, dict, f64, f32, i32, u32, u8, bool, list | no           | yes     | no     | no         | no        | yes         | none           | yes               | yes         | no    |
| [cx2](./cx2.md)                | no               | yes          | yes         | required  | integer       | string, f64, i32, bool                           | no           | yes     | no     | yes        | no        | no          | none           | yes               | yes         | no    |
| [cx](./cx.md)                  | no               | yes          | yes         | required  | integer       | string, f64, i32, bool                           | no           | yes     | no     | no         | no        | yes         | none           | yes               | yes         | no    |
| [obo](./obo.md)                | no               | yes          | yes         | none      | any           | none                                             | no           | no      | no     | no         | no        | no          | none           | no                | no          | no    |
| [cys](./cys.md)                | yes              | yes          | yes         | required  | integer       | string, dict, f64, i32, bool, list               | no           | yes     | no     | no         | no        | no          | none           | yes               | yes         | no    |

### What the capabilities mean

#### mixedDirection

Directed and undirected edges in one file.

#### multiEdges

Parallel edges.

#### selfLoops

Self-loops.

#### edgeIds

Edge ids: "required" (generated when the graph has none), "optional", or "none" (not stored).

#### idCharset

Which node ids are written unchanged: "any", "nmtoken" (XML name tokens), "integer", or "dense-1-based" (1 to N).

#### dtypes

The attribute types the format keeps exactly: "bool", "i32" (32-bit integer), "u32" (unsigned 32-bit integer), "u8" (byte), "f32" (32-bit float), "f64" (64-bit float, a JavaScript number), "string" (text), "dict" (text stored as a dictionary of repeated values), "list" and "json". An attribute of another type is written as the nearest one the format has, with a W_DTYPE_UNSUPPORTED note.

#### components

Columns with several numbers per row, such as a position.

#### lists

List columns.

#### json

Nested JSON values.

#### defaults

Columns' declared default values.

#### options

Declared lists of allowed values (GEXF options).

#### hierarchy

Nesting: nodes inside other nodes (parent columns).

#### temporal

Time: "none", "intervals", "spells" (several intervals per element), or "dynamic-values" (attribute values that change over time).

#### graphAttributes

Graph-level attributes.

#### positions

Node positions.

#### viz

Visual columns: color, size, shape and thickness.

<!-- generated:end -->

## Which format should I use

- Between desktop tools: GEXF with Gephi, GraphML with most others (yEd, igraph, NetworkX). Both
  keep typed attributes, mixed direction and parallel edges.
- In a web page: JSON. The `node-link` dialect suits NetworkX and d3, `cytoscape` Cytoscape.js, and
  `graphology` graphology and sigma.js.
- In a spreadsheet, a database or a script: CSV, with the node table and the edge table written as
  two files.
- In Cytoscape: CX2 or XGMML to add a network to an open session, a Cytoscape session to hand over
  a whole session, and CX2 for NDEx.
- In Neo4j: Neo4j CSV, loaded with `neo4j-admin database import`.
- Ontologies: OBO, or the `obographs` dialect of JSON.
- Graphviz, Pajek, and tools that read GML: DOT, Pajek and GML.
