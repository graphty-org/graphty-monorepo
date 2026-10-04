# Formats

graph-io reads and writes every format below. The first table lists them; the second shows what a
saved file of each format can hold, with one row per JSON dialect. When a graph holds something a
format cannot, `checkExport()` tells you before you save; see [Saving graphs](../saving.md).

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
| [json](./json.md) (obographs)  | no               | yes          | yes         | none      | any           |                                                  | no           | no      | no     | no         | no        | no          | none           | no                | no          | no    |
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
| [obo](./obo.md)                | no               | yes          | yes         | none      | any           |                                                  | no           | no      | no     | no         | no        | no          | none           | no                | no          | no    |
| [cys](./cys.md)                | yes              | yes          | yes         | required  | integer       | string, dict, f64, i32, bool, list               | no           | yes     | no     | no         | no        | no          | none           | yes               | yes         | no    |

- `mixedDirection`: Directed and undirected edges in one file.
- `multiEdges`: Parallel edges.
- `selfLoops`: Self-loops.
- `edgeIds`: Edge ids: "required" (generated when the graph has none), "optional", or "none" (not stored).
- `idCharset`: Which node ids are written unchanged: "any", "nmtoken" (XML name tokens), "integer", or "dense-1-based" (1 to N).
- `dtypes`: The column types the format keeps exactly.
- `components`: Columns with several numbers per row, such as a position.
- `lists`: List columns.
- `json`: Nested JSON values.
- `defaults`: Columns' declared default values.
- `options`: Declared lists of allowed values (GEXF options).
- `hierarchy`: Nesting: nodes inside other nodes (parent columns).
- `temporal`: Time: "none", "intervals", "spells" (several intervals per element), or "dynamic-values" (attribute values that change over time).
- `graphAttributes`: Graph-level attributes.
- `positions`: Node positions.
- `viz`: Visual columns: color, size, shape and thickness.

<!-- generated:end -->

## Which format should I use

- To move a graph between tools without losing anything, use **GEXF** when the other tool is Gephi,
  and **GraphML** for most other desktop tools (yEd, igraph, NetworkX). Both keep typed attributes,
  mixed direction and parallel edges.
- For a web page, use **JSON**: the `node-link` dialect for NetworkX and d3, `cytoscape` for
  Cytoscape.js, `graphology` for graphology and sigma.js.
- For a spreadsheet, a database or a script, use **CSV**, and write the node table and the edge
  table as two files.
- For Cytoscape, use **CX2** or **XGMML** to add a network to an open session, and a **Cytoscape
  session** to hand over a whole session. Use **CX2** for NDEx.
- For a Neo4j database, use **Neo4j CSV** and load it with `neo4j-admin database import`.
- For ontologies, use **OBO** or the `obographs` dialect of JSON.
- For Graphviz, use **DOT**; for Pajek, **Pajek**; for tools that read GML, **GML**.
