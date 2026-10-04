# DOT (Graphviz)

DOT is the language of [Graphviz](https://graphviz.org/doc/info/lang.html). graph-io reads the
graph structure and the attributes; it does not lay out or draw the graph.

## At a glance

<!-- generated:begin glance:dot -->

|                         |                         |
| ----------------------- | ----------------------- |
| Import from             | `@graphty/graph-io/dot` |
| Format name             | `dot`                   |
| Extensions              | `.dot`, `.gv`           |
| MIME types              | `text/vnd.graphviz`     |
| Reads                   | yes                     |
| Writes                  | yes                     |
| Several graphs per file | yes (`importAllGraphs`) |
| Lists its graphs        | no                      |

What a saved file can hold:

| Capability        | Value                  | Meaning                                                                                                                            |
| ----------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `mixedDirection`  | no                     | Directed and undirected edges in one file.                                                                                         |
| `multiEdges`      | yes                    | Parallel edges.                                                                                                                    |
| `selfLoops`       | yes                    | Self-loops.                                                                                                                        |
| `edgeIds`         | optional               | Edge ids: "required" (generated when the graph has none), "optional", or "none" (not stored).                                      |
| `idCharset`       | any                    | Which node ids are written unchanged: "any", "nmtoken" (XML name tokens), "integer", or "dense-1-based" (1 to N).                  |
| `dtypes`          | bool, i32, f64, string | The column types the format keeps exactly.                                                                                         |
| `components`      | no                     | Columns with several numbers per row, such as a position.                                                                          |
| `lists`           | no                     | List columns.                                                                                                                      |
| `json`            | no                     | Nested JSON values.                                                                                                                |
| `defaults`        | no                     | Columns' declared default values.                                                                                                  |
| `options`         | no                     | Declared lists of allowed values (GEXF options).                                                                                   |
| `hierarchy`       | yes                    | Nesting: nodes inside other nodes (parent columns).                                                                                |
| `temporal`        | none                   | Time: "none", "intervals", "spells" (several intervals per element), or "dynamic-values" (attribute values that change over time). |
| `graphAttributes` | yes                    | Graph-level attributes.                                                                                                            |
| `positions`       | yes                    | Node positions.                                                                                                                    |
| `viz`             | no                     | Visual columns: color, size, shape and thickness.                                                                                  |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/dot -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToString, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("cluster.gv"), { filename: "cluster.gv" });
console.log(`${snapshot.nodeCount} nodes (the two clusters are nodes too), ${snapshot.edgeCount} edges`);
// A node's cluster is in the column with the "parent" role, as the cluster's node index
const parent = snapshot.nodes.byRole("parent");
const a0 = snapshot.ids.requireIndex("a0");
console.log(`a0 is inside ${String(snapshot.ids.idOf(Number(parent?.value(a0))))}`);

const dot = await exportGraphToString(snapshot, "dot");
console.log(dot.split("\n").slice(0, 6).join("\n"));
await writeFile("cluster-copy.gv", dot);
```

<!-- generated:end -->

<!-- generated:begin output:formats/dot -->

```text
12 nodes (the two clusters are nodes too), 13 edges
a0 is inside cluster_0
digraph G {
    graph [fontname="Helvetica,Arial,sans-serif"];
    subgraph cluster_0 {
        graph [style=filled, color=lightgrey, label="process #1"];
        a0 [fontname="Helvetica,Arial,sans-serif", style=filled, color=white];
        a1 [fontname="Helvetica,Arial,sans-serif", style=filled, color=white];
```

<!-- generated:end -->

The clusters of the file became nodes, and each member points at its cluster through
the parent column. Saving writes the clusters back as `subgraph cluster_...` blocks.

## How graph-io reads it

- The whole file is read as text and parsed with the same grammar as Graphviz. A syntax error
  stops the import (`E_DOT_SYNTAX`), as it does in Graphviz.
- `graph` makes an undirected graph and `digraph` a directed one. `strict` is kept, and parallel
  edges are merged the way Graphviz merges them.
- Default attribute statements (`node [...]`, `edge [...]`) apply to the nodes and edges that
  follow them in the same subgraph, as in Graphviz. Each node and edge gets the attributes that
  apply to it as its own values.
- Edge chains (`a -> b -> c`) and subgraph endpoints (`{a b} -> c`) become one edge per pair.
- A subgraph whose name starts with `cluster` becomes a node, and its members point at it through a
  parent column. Other subgraphs only group statements; their attributes are reported and left
  out.
- `label` is the label, `weight` the edge weight, `key` the edge id, and a node's `pos` its
  position (a trailing `!` sets `pin`). Pass `positions: false` to keep `pos` as text.
- Ports on edge endpoints (`a:n -> b:s`) are kept in edge columns.
- Every other attribute value is text in DOT; graph-io reads a column whose every value is a
  number as numbers, and the rest as text.
- `1` and `"1"` are the same node, as the DOT language says.
- A file can hold several graphs; see [Files that hold several graphs](../loading.md#files-that-hold-several-graphs).

## What a saved file keeps and loses

DOT keeps any node id, parallel edges, graph attributes, clusters and positions. What does
not survive:

- One direction per file. A graph with both kinds of edges needs `onMixedDirection`.
- DOT has no types. Booleans, integers, floating-point numbers and text are written so they read
  back with the same type; other column types read back as the type their values look like.
- Lists, JSON values, defaults, options, time columns and visual columns other than the position
  are not written.
- A text holding a backslash right before a quote or a line break, or at its end, cannot be spelled
  in DOT (`E_DOT_TRAILING_BACKSLASH`).

<!-- generated:begin reference:dot -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option                   | Type                                | Default      | Meaning                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | ----------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mismatchedEdgeOperator` | `"error" \| "operator" \| "header"` | `"operator"` | What an edge operator that contradicts the graph keyword means (`--` in a digraph, `->` in a graph; a syntax error for Graphviz): "operator" (default) reads the edge with the operator's direction and resolves it per onMixedDirection, with a warning; "header" reads it with the graph's direction, with a warning; "error" aborts the import as Graphviz does. |
| `positions`              | `boolean`                           | `true`       | Map a node's `pos` to a `pos` column with the position role and a trailing `!` to `pin` (default true); false keeps `pos` as the text the file wrote, like any other attribute.                                                                                                                                                                                     |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option   | Type      | Default | Meaning                                                                       |
| -------- | --------- | ------- | ----------------------------------------------------------------------------- |
| `indent` | `string`  |         | The indentation of one nesting level; four spaces by default.                 |
| `name`   | `string`  |         | The graph name to write; `meta.name` by default, null for an anonymous graph. |
| `strict` | `boolean` |         | Whether to write `strict`; by default when `meta.extra.dot.strict` is true.   |

## Import issue codes

The codes this format's import report can hold, also exported as `DOT_ISSUE` from `@graphty/graph-io/dot`.

| Code                                | Key                           | Severity | Meaning                                                                                                          |
| ----------------------------------- | ----------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `E_EMPTY_INPUT`                     | `EMPTY_INPUT`                 | error    | The input holds no graph at all (empty or only comments); fatal.                                                 |
| `E_TOO_LARGE`                       | `TOO_LARGE`                   | error    | The input is longer than one JavaScript string, or holds a line that is (fatal).                                 |
| `W_ENCODING_CONFLICT`               | `ENCODING_CONFLICT`           | warning  | A declared encoding the byte order mark contradicts (the mark wins).                                             |
| `W_CONTROL_CHARACTER`               | `CONTROL_CHARACTER`           | warning  | A control character or a stray U+FEFF in the text, or an ignored trailing Ctrl-Z.                                |
| `E_FOREIGN_FORMAT`                  | `FOREIGN_FORMAT`              | error    | The input is an HTML page, a PDF, compressed or archived data or an image (fatal).                               |
| `W_ISSUES_SUPPRESSED`               | `ISSUES_SUPPRESSED`           | warning  | Warnings of one code beyond the number a report keeps, counted in one warning.                                   |
| `E_SYNTAX`                          | `SYNTAX`                      | error    | A grammar violation; fatal.                                                                                      |
| `E_INVALID_UTF8`                    | `INVALID_UTF8`                | error    | The input holds invalid UTF-8 (fatal).                                                                           |
| `E_INVALID_ENCODING`                | `INVALID_ENCODING`            | error    | Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal).                         |
| `W_ENCODING_FALLBACK`               | `ENCODING_FALLBACK`           | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                                      |
| `W_UNKNOWN_ENCODING`                | `UNKNOWN_ENCODING`            | warning  | A declared encoding the platform cannot decode was ignored.                                                      |
| `E_DOT_NESTING`                     | `NESTING`                     | error    | Subgraphs or braces nested deeper than the parser's limit; fatal.                                                |
| `W_DOT_EDGE_OPERATOR`               | `EDGE_OPERATOR`               | warning  | An edge operator contradicting the graph keyword (warning under "operator" / "header").                          |
| `W_MULTIPLE_GRAPHS`                 | `MULTIPLE_GRAPHS`             | warning  | A second graph in the same input; only the first is read.                                                        |
| `W_DOT_NUMERAL_AMBIGUITY`           | `NUMERAL_AMBIGUITY`           | warning  | A badly delimited numeral (`1e3`) split into two tokens, as Graphviz does with a warning.                        |
| `W_DOT_SUBGRAPH_ATTRIBUTES_DROPPED` | `SUBGRAPH_ATTRIBUTES_DROPPED` | warning  | Attributes of a subgraph that is not a cluster (rank=same and the like) cannot be represented.                   |
| `W_DOT_NODE_PORT_DROPPED`           | `NODE_PORT_DROPPED`           | warning  | A port on a node statement has no meaning and was dropped.                                                       |
| `W_DOT_CLUSTER_NODE_MERGED`         | `CLUSTER_NODE_MERGED`         | warning  | A plain node and a cluster share a name and were merged into one container node.                                 |
| `W_DOT_CLUSTER_CONFLICT`            | `CLUSTER_CONFLICT`            | warning  | A node mentioned in two unrelated clusters keeps the first.                                                      |
| `W_DOT_BAD_POS`                     | `BAD_POS`                     | warning  | A node `pos` that is not a point, or one beyond the f32 range of the position column; the value was dropped.     |
| `W_DOT_POS_DIMS`                    | `POS_DIMS`                    | warning  | Node `pos` values mix two and three coordinates; the position column records the first's.                        |
| `W_PRECISION`                       | `PRECISION`                   | warning  | A `pos` coordinate the f32 position column cannot hold exactly (warned once).                                    |
| `W_DUPLICATE_ATTRIBUTE`             | `DUPLICATE_ATTRIBUTE`         | warning  | The same attribute twice in one statement's attribute lists; the last value stands, as in Graphviz.              |
| `W_DOT_COMPASS_POINT`               | `COMPASS_POINT`               | warning  | The second part of a port (`a:p:zz`) is not a compass point; kept as written, as Graphviz warns.                 |
| `W_DOT_LATE_CHARSET`                | `LATE_CHARSET`                | warning  | A `charset` attribute beyond the head the decoder reads it from; the input was decoded without it.               |
| `W_DOT_STRICT_MERGED`               | `STRICT_MERGED`               | warning  | A parallel edge merged into an earlier one under `strict`.                                                       |
| `W_DOT_KEY_MERGED`                  | `KEY_MERGED`                  | warning  | An edge merged into an earlier one with the same endpoints and `key`.                                            |
| `W_ROLE_TAKEN`                      | `ROLE_TAKEN`                  | warning  | A role (label, id, position, ...) was already taken in the caller's sink; the column was declared without it.    |
| `W_COLUMN_RENAMED`                  | `COLUMN_RENAMED`              | warning  | A column of another shape exists in the caller's sink under a name the importer declares; renamed `<name>#<id>`. |
| `W_OPTION_IGNORED`                  | `OPTION_IGNORED`              | warning  | A common option the format has no use for was given a non-default value.                                         |
| `W_ID_MERGED`                       | `ID_MERGED`                   | warning  | Two distinct id texts merged under ids: "number".                                                                |
| `W_SINK_OPTION`                     | `SINK_OPTION`                 | warning  | A builder-policy option the sink does not honor.                                                                 |
| `W_DIRECTION_REFUSED`               | `DIRECTION_REFUSED`           | warning  | The sink refused the file's direction.                                                                           |
| `W_DIRECTION_FORCED`                | `DIRECTION_FORCED`            | warning  | Edges forced to the policy's direction.                                                                          |
| `E_MIXED_DIRECTION`                 | `MIXED_DIRECTION`             | error    | A mixed file under onMixedDirection "error" (fatal).                                                             |
| `W_WIDENING_UNSUPPORTED`            | `WIDENING_UNSUPPORTED`        | warning  | A text column the sink could not widen to the dtype its cells imply.                                             |

## Loss codes

The codes `check()` can return before a save, also exported as `DOT_LOSS` from `@graphty/graph-io/dot`. An `E_` code means the save throws unless you change the graph or the options.

| Code                       | Key                    | Severity            | Meaning                                                                                                                                        |
| -------------------------- | ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_DOT_TRAILING_BACKSLASH` | `TRAILING_BACKSLASH`   | error (save throws) | An id, name or text with a backslash before a quote or a line break, or at its end, cannot be written as a DOT quoted string; export() throws. |
| `W_DOT_NON_FINITE`         | `NON_FINITE`           | warning             | A non-finite f32 / f64 cell has no numeric DOT spelling and reads back as text.                                                                |
| `W_TEXT_INFERRED`          | `TEXT_INFERRED`        | warning             | Text cells that look like numbers or booleans read back as such (DOT attribute values are untyped).                                            |
| `W_DOT_ATTRIBUTE_CLASH`    | `ATTRIBUTE_CLASH`      | warning             | A plain column named like an attribute the exporter writes for a role (weight, key, pos) is not written.                                       |
| `W_MUTUAL_EXPANDED`        | `MUTUAL_EXPANDED`      | warning             | A mutual pair is written as two directed edges.                                                                                                |
| `W_PARENTS_DROPPED`        | `PARENTS_DROPPED`      | warning             | A parents (multi-parent) column cannot be written; DOT clusters nest.                                                                          |
| `W_DOT_POSITION_SHAPE`     | `POSITION_SHAPE`       | warning             | A position column that is not a node column of 2 or 3 components is not written.                                                               |
| `W_ID_TEXT_TYPE`           | `ID_TEXT_TYPE`         | warning             | An id whose text reads back as the other type under ids: "canonical" (1.5 as text, "1" as 1).                                                  |
| `W_EMPTY_COLUMN_DROPPED`   | `EMPTY_COLUMN_DROPPED` | warning             | A declared column whose every row is unset is not written (DOT writes cells, never declarations).                                              |
| `W_ROLE_ASSUMED`           | `ROLE_ASSUMED`         | warning             | A role-less column named `label` reads back with the label role.                                                                               |
| `W_DOT_CLUSTER_MARKED`     | `CLUSTER_MARKED`       | warning             | A parent that is a plain node is written as a node and a cluster of one name; it reads back marked as a cluster.                               |

<!-- generated:end -->
