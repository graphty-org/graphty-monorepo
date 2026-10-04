# Formats

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
- `edgeIds`: Whether edge ids are required (generated when absent), optional or unsupported.
- `idCharset`: Which node ids can be written unchanged.
- `dtypes`: The column dtypes the format keeps as declared.
- `components`: Multi-component (stride) columns.
- `lists`: List columns.
- `json`: Nested json columns.
- `defaults`: Declared defaults.
- `options`: Declared enumerations (GEXF options).
- `hierarchy`: Containment (parent / parents roles).
- `temporal`: Temporal support level.
- `graphAttributes`: Graph-level attributes.
- `positions`: The position role.
- `viz`: The visual roles (color, size, shape, thickness).

<!-- generated:end -->

## Which format should I use
