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

What a saved file can hold (the [capabilities](./index.md#what-the-capabilities-mean) explain each row):

| Capability                                      | Value                  |
| ----------------------------------------------- | ---------------------- |
| [`mixedDirection`](./index.md#mixeddirection)   | no                     |
| [`multiEdges`](./index.md#multiedges)           | yes                    |
| [`selfLoops`](./index.md#selfloops)             | yes                    |
| [`edgeIds`](./index.md#edgeids)                 | optional               |
| [`idCharset`](./index.md#idcharset)             | any                    |
| [`dtypes`](./index.md#dtypes)                   | bool, i32, f64, string |
| [`components`](./index.md#components)           | no                     |
| [`lists`](./index.md#lists)                     | no                     |
| [`json`](./index.md#json)                       | no                     |
| [`defaults`](./index.md#defaults)               | no                     |
| [`options`](./index.md#options)                 | no                     |
| [`hierarchy`](./index.md#hierarchy)             | yes                    |
| [`temporal`](./index.md#temporal)               | none                   |
| [`graphAttributes`](./index.md#graphattributes) | yes                    |
| [`positions`](./index.md#positions)             | yes                    |
| [`viz`](./index.md#viz)                         | no                     |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/dot -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToString, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("teams.gv"), { filename: "teams.gv" });
console.log(`${snapshot.nodeCount} nodes (the two clusters are nodes too), ${snapshot.edgeCount} edges`);
// A node's cluster is in the attribute with the "parent" role, as the cluster's node index
const parent = snapshot.nodes.byRole("parent");
const ana = snapshot.ids.requireIndex("ana");
console.log(`ana is inside ${String(snapshot.ids.idOf(Number(parent?.value(ana))))}`);

const dot = await exportGraphToString(snapshot, "dot");
console.log(dot.split("\n").slice(0, 6).join("\n"));
await writeFile("teams-copy.gv", dot);
```

<!-- generated:end -->

<!-- generated:begin output:formats/dot -->

```text
9 nodes (the two clusters are nodes too), 7 edges
ana is inside cluster_design
digraph handoffs {
    graph [label="Who hands work to whom"];
    subgraph cluster_design {
        graph [label=Design, style=filled, color=lightgrey];
        ana;
        ben;
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

| Option                   | Type                                | Default      | Meaning                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | ----------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mismatchedEdgeOperator` | `"error" \| "operator" \| "header"` | `"operator"` | What an edge operator that contradicts the graph keyword means (`--` in a digraph, `->` in a graph; Graphviz refuses such a file): "operator" reads the edge with the operator's direction, so the graph has both directions and `onMixedDirection` decides, with a warning; "header" reads it with the graph's direction, with a warning; "error" stops the import, as Graphviz does. |
| `positions`              | `boolean`                           | `true`       | Read a node's `pos` attribute as its position (a trailing `!` becomes a `pin` attribute); false keeps `pos` as the text the file wrote, like any other attribute.                                                                                                                                                                                                                      |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option   | Type             | Default          | Meaning                                                                                                                                                 |
| -------- | ---------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `indent` | `string`         | four spaces      | The indentation of one nesting level.                                                                                                                   |
| `name`   | `null \| string` | the graph's name | The graph name to write, or null for an anonymous graph. The default is the graph's name (`snapshot.meta.name`), which a DOT, GML or GEXF import keeps. |
| `strict` | `boolean`        | as read          | Whether to write the `strict` keyword. The default is to write it when the graph was read from a strict DOT file.                                       |

## Import issue codes

The codes this format's import report can hold, also exported as `DOT_ISSUE` from `@graphty/graph-io/dot`.

| Code                                | Key                           | Severity | Meaning                                                                                                                                                                                                                                        |
| ----------------------------------- | ----------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_SYNTAX`                          | `SYNTAX`                      | error    | The text breaks DOT's syntax; the message says where. The import stops.                                                                                                                                                                        |
| `E_INVALID_UTF8`                    | `INVALID_UTF8`                | error    | The input is not valid UTF-8. The import stops.                                                                                                                                                                                                |
| `E_INVALID_ENCODING`                | `INVALID_ENCODING`            | error    | Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the `encoding` option). The import stops.                                                                                            |
| `W_ENCODING_FALLBACK`               | `ENCODING_FALLBACK`           | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                                                                                                                                                                    |
| `W_UNKNOWN_ENCODING`                | `UNKNOWN_ENCODING`            | warning  | A declared encoding the platform cannot decode was ignored.                                                                                                                                                                                    |
| `E_DOT_NESTING`                     | `NESTING`                     | error    | Subgraphs or braces are nested deeper than graph-io reads. The import stops.                                                                                                                                                                   |
| `W_DOT_EDGE_OPERATOR`               | `EDGE_OPERATOR`               | warning  | An edge operator contradicting the graph keyword (warning under "operator" / "header").                                                                                                                                                        |
| `W_MULTIPLE_GRAPHS`                 | `MULTIPLE_GRAPHS`             | warning  | The file holds several graphs and only one was read: the first, or the one `graphIndex` or `graphName` chose. `importAllGraphs()` reads every one.                                                                                             |
| `W_DOT_NUMERAL_AMBIGUITY`           | `NUMERAL_AMBIGUITY`           | warning  | A badly delimited numeral (`1e3`) split into two tokens, as Graphviz does with a warning.                                                                                                                                                      |
| `W_DOT_SUBGRAPH_ATTRIBUTES_DROPPED` | `SUBGRAPH_ATTRIBUTES_DROPPED` | warning  | Attributes of a subgraph that is not a cluster (rank=same and the like) cannot be represented.                                                                                                                                                 |
| `W_DOT_NODE_PORT_DROPPED`           | `NODE_PORT_DROPPED`           | warning  | A port on a node statement has no meaning and was dropped.                                                                                                                                                                                     |
| `W_DOT_CLUSTER_NODE_MERGED`         | `CLUSTER_NODE_MERGED`         | warning  | A plain node and a cluster share a name and were merged into one container node.                                                                                                                                                               |
| `W_DOT_CLUSTER_CONFLICT`            | `CLUSTER_CONFLICT`            | warning  | A node mentioned in two unrelated clusters keeps the first.                                                                                                                                                                                    |
| `W_DOT_BAD_POS`                     | `BAD_POS`                     | warning  | A node's `pos` is not a point, or is too large for a 32-bit float position; the value was dropped.                                                                                                                                             |
| `W_DOT_POS_DIMS`                    | `POS_DIMS`                    | warning  | Node `pos` values mix two and three coordinates; the position column records the first's.                                                                                                                                                      |
| `W_PRECISION`                       | `PRECISION`                   | warning  | An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.                                                                                                                                      |
| `W_DUPLICATE_ATTRIBUTE`             | `DUPLICATE_ATTRIBUTE`         | warning  | The same attribute twice in one statement's attribute lists; the last value stands, as in Graphviz.                                                                                                                                            |
| `W_DOT_COMPASS_POINT`               | `COMPASS_POINT`               | warning  | The second part of a port (`a:p:zz`) is not a compass point; kept as written, as Graphviz warns.                                                                                                                                               |
| `W_DOT_LATE_CHARSET`                | `LATE_CHARSET`                | warning  | A `charset` attribute beyond the head the decoder reads it from; the input was decoded without it.                                                                                                                                             |
| `W_DOT_STRICT_MERGED`               | `STRICT_MERGED`               | warning  | A parallel edge merged into an earlier one under `strict`.                                                                                                                                                                                     |
| `W_DOT_KEY_MERGED`                  | `KEY_MERGED`                  | warning  | An edge merged into an earlier one with the same endpoints and `key`.                                                                                                                                                                          |
| `W_ROLE_TAKEN`                      | `ROLE_TAKEN`                  | warning  | You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.                                                                                                            |
| `W_COLUMN_RENAMED`                  | `COLUMN_RENAMED`              | warning  | An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a repeated column header.                                                                                                               |
| `W_OPTION_IGNORED`                  | `OPTION_IGNORED`              | warning  | You set an option this format does not use; it had no effect. The message names the option.                                                                                                                                                    |
| `W_ID_MERGED`                       | `ID_MERGED`                   | warning  | Two different id texts became the same number because `ids` is "number", so their nodes were merged.                                                                                                                                           |
| `W_SINK_OPTION`                     | `SINK_OPTION`                 | warning  | You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.                                          |
| `W_DIRECTION_REFUSED`               | `DIRECTION_REFUSED`           | warning  | You read into a graph builder whose direction is already set, or which already holds edges, so the file is read with the builder's direction instead of its own.                                                                               |
| `W_DIRECTION_FORCED`                | `DIRECTION_FORCED`            | warning  | Edges of the other direction were read with the direction `onMixedDirection` chose.                                                                                                                                                            |
| `E_MIXED_DIRECTION`                 | `MIXED_DIRECTION`             | error    | The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a format that holds one direction per file fails with `E_DIRECTED`. Pass "directed" or "undirected" to read or write it anyway. |
| `W_WIDENING_UNSUPPORTED`            | `WIDENING_UNSUPPORTED`        | warning  | Your graph builder cannot change an attribute's type after its first value, so a text column keeps the type of its first values.                                                                                                               |

Like every format, it can also record the codes for unreadable input: [`E_EMPTY_INPUT`](../codes.md#E_EMPTY_INPUT), [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED).

## Loss codes

The codes `checkExport(snapshot, "dot", options)` can return before a save, also exported as `DOT_LOSS` from `@graphty/graph-io/dot`. An `E_` code means the save throws unless you change the graph or the options. A save can also return the [shared loss codes](../codes.md#shared-loss-codes) that any format can.

| Code                       | Key                    | Severity            | Meaning                                                                                                                                                 |
| -------------------------- | ---------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_DOT_TRAILING_BACKSLASH` | `TRAILING_BACKSLASH`   | error (save throws) | An id, name or text with a backslash before a quote or a line break, or at its end, cannot be written as a DOT quoted string; the save fails.           |
| `W_DOT_NON_FINITE`         | `NON_FINITE`           | warning             | NaN or an infinity has no DOT number spelling; it is written as text and reads back as text.                                                            |
| `W_TEXT_INFERRED`          | `TEXT_INFERRED`        | warning             | A text value that reads back as a number or a boolean, because the format does not record that it was text (the text "42" reads back as the number 42). |
| `W_DOT_ATTRIBUTE_CLASH`    | `ATTRIBUTE_CLASH`      | warning             | A plain column named like an attribute the exporter writes for a role (weight, key, pos) is not written.                                                |
| `W_MUTUAL_EXPANDED`        | `MUTUAL_EXPANDED`      | warning             | A mutual pair is written as two directed edges.                                                                                                         |
| `W_PARENTS_DROPPED`        | `PARENTS_DROPPED`      | warning             | A parents (multi-parent) column cannot be written; DOT clusters nest.                                                                                   |
| `W_DOT_POSITION_SHAPE`     | `POSITION_SHAPE`       | warning             | A position column that is not a node column of 2 or 3 components is not written.                                                                        |
| `W_ID_TEXT_TYPE`           | `ID_TEXT_TYPE`         | warning             | An id that reads back as a different type, such as the decimal 1.5 as text or the text "1" as the number 1.                                             |
| `W_EMPTY_COLUMN_DROPPED`   | `EMPTY_COLUMN_DROPPED` | warning             | A declared column whose every row is unset is not written (DOT writes cells, never declarations).                                                       |
| `W_ROLE_ASSUMED`           | `ROLE_ASSUMED`         | warning             | An attribute without a role is written where the format keeps a role (a `name` column as the label, say), and reads back with that role.                |
| `W_DOT_CLUSTER_MARKED`     | `CLUSTER_MARKED`       | warning             | A parent that is a plain node is written as a node and a cluster of one name; it reads back marked as a cluster.                                        |

<!-- generated:end -->
