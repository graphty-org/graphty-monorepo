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
the parent column, so `snapshot.nodeCount` counts the clusters too. Saving writes the clusters
back as `subgraph cluster_...` blocks.

## How graph-io reads it

- The whole file is read as text and parsed with the same grammar as Graphviz. A syntax error
  stops the import (`E_SYNTAX`), as it does in Graphviz.
- `graph` makes an undirected graph and `digraph` a directed one. `strict` is kept, and parallel
  edges are merged the way Graphviz merges them.
- Default attribute statements (`node [...]`, `edge [...]`) apply to the nodes and edges that
  follow them in the same subgraph, as in Graphviz. Each node and edge gets the attributes that
  apply to it as its own values.
- Edge chains (`a -> b -> c`) and subgraph endpoints (`{a b} -> c`) become one edge per pair.
- A subgraph whose name starts with `cluster` becomes a node, marked `true` in the
  `graphty.cluster` column, and its members point at it through the `graphty.parent` column. So the
  sample `teams.gv`, with 7 people in 2 clusters, reads as 9 nodes; [Columns graph-io
  adds](../reading.md#columns-graph-io-adds) shows how to leave the clusters out. Other subgraphs
  only group statements; their attributes are reported and left out.
- `label` is the label, `weight` the edge weight, `key` the edge id, and a node's `pos` its
  position (a trailing `!` sets `pin`). Pass `positions: false` to keep `pos` as text.
- Ports on edge endpoints (`a:n -> b:s`) are kept in the `graphty.sourcePort` and
  `graphty.targetPort` edge columns.
- Every other attribute value is text in DOT; graph-io reads a column whose every value is a
  number as numbers, and the rest as text.
- `1` and `"1"` are the same node, as the DOT language says.
- A file can hold several graphs; see [Files that hold several graphs](../loading.md#files-that-hold-several-graphs).

## What a saved file keeps and loses

DOT keeps any node id, parallel edges, graph attributes, clusters and positions. The graph's
name is written after `graph` or `digraph`: the `name` export option sets it, and by default it is
the name the graph was read with (see [Naming the graph](../reading.md#naming-the-graph)). What
does not survive:

- One direction per file. A graph with both kinds of edges needs `onMixedDirection`.
- DOT has no types. Booleans, integers, floating-point numbers and text are written so they read
  back with the same type; other column types read back as the type their values look like.
- Lists, JSON values, defaults, options, time columns and visual columns other than the position
  are not written.
- A text holding a backslash right before a quote or a line break, or at its end, cannot be spelled
  in DOT (`E_DOT_TRAILING_BACKSLASH`).

<!-- generated:begin capabilities:dot -->

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

<!-- generated:begin reference:dot -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).
A file can hold several graphs: pick one with the `graphIndex` or `graphName` option of [importGraph()](../options.md#importgraph-and-importallgraphs), as [Files that hold several graphs](../loading.md#files-that-hold-several-graphs) shows.

| Option                   | Type                                | Default      | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ----------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mismatchedEdgeOperator` | `"error" \| "operator" \| "header"` | `"operator"` | What an edge operator that contradicts the graph keyword means (`--` in a digraph, `->` in a graph; Graphviz refuses such a file): "operator" reads the edge with the operator's direction, so the graph has both directions and `onMixedDirection` decides, with a warning; "header" reads it with the graph's direction, with a warning; "error" stops the import with an ImportError whose `issue.code` is `E_SYNTAX`, as Graphviz does. |
| `positions`              | `boolean`                           | `true`       | Read a node's `pos` attribute as its position (a trailing `!` becomes a `pin` attribute); false keeps `pos` as the text the file wrote, like any other attribute.                                                                                                                                                                                                                                                                           |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option                     | Type               | Default          | Meaning                                                                                                      |
| -------------------------- | ------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `indent`                   | `string \| number` | `4`              | The indentation of one nesting level: a number of spaces, or the text itself (spaces or tabs, such as "\t"). |
| [`name`](#export-name)     | `null \| string`   | the graph's name | The graph name to write, or null for an anonymous graph.                                                     |
| [`strict`](#export-strict) | `boolean`          | as read          | Whether to write the `strict` keyword.                                                                       |

- <a id="export-name"></a>`name`: The graph name to write, or null for an anonymous graph. The default is the graph's name (`snapshot.meta.name`), which a DOT, GML or GEXF import keeps.
- <a id="export-strict"></a>`strict`: Whether to write the `strict` keyword. The default is to write it when the graph was read from a strict DOT file.

## Import issue codes

The codes this format's import report can hold. They are also exported as `DOT_ISSUE` from `@graphty/graph-io/dot`, keyed by the code without its `E_` / `W_` and `DOT_` prefixes.

- `E_EMPTY_INPUT` (error): The input holds no graph: it is empty or only comments. The import stops.
- `W_ENCODING_CONFLICT` (warning): A declared encoding the byte order mark contradicts (the mark wins).
- `E_SYNTAX` (error): The text breaks DOT's syntax; the message says where. The import stops.
- `E_INVALID_UTF8` (error): The input is not valid UTF-8. The import stops.
- `E_INVALID_ENCODING` (error): Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the `encoding` option). The import stops.
- `W_ENCODING_FALLBACK` (warning): Bytes that are not UTF-8 and declare no encoding were read as windows-1252.
- `W_UNKNOWN_ENCODING` (warning): A declared encoding the platform cannot decode was ignored.
- `E_DOT_NESTING` (error): Subgraphs or braces are nested deeper than graph-io reads. The import stops.
- `W_DOT_EDGE_OPERATOR` (warning): An edge operator contradicting the graph keyword, read under mismatchedEdgeOperator "operator" or "header". Under "error" the import stops with `E_SYNTAX` instead.
- `W_MULTIPLE_GRAPHS` (warning): The file holds several graphs and only the first was read. It is not added when `graphIndex` or `graphName` chose the graph. `importAllGraphs()` reads every one.
- `W_DOT_NUMERAL_AMBIGUITY` (warning): A badly delimited numeral (`1e3`) split into two tokens, as Graphviz does with a warning.
- `W_DOT_SUBGRAPH_ATTRIBUTES_DROPPED` (warning): Attributes of a subgraph that is not a cluster (rank=same and the like) cannot be represented.
- `W_DOT_NODE_PORT_DROPPED` (warning): A port on a node statement has no meaning and was dropped.
- `W_DOT_CLUSTER_NODE_MERGED` (warning): A plain node and a cluster share a name and were merged into one container node.
- `W_DOT_CLUSTER_CONFLICT` (warning): A node mentioned in two unrelated clusters keeps the first.
- `W_DOT_BAD_POS` (warning): A node's `pos` is not a point, or is too large for a 32-bit float position; the value was dropped.
- `W_DOT_POS_DIMS` (warning): Node `pos` values mix two and three coordinates; the position column records the first's.
- `W_PRECISION` (warning): An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.
- `W_DUPLICATE_ATTRIBUTE` (warning): The same attribute twice in one statement's attribute lists; the last value stands, as in Graphviz.
- `W_DOT_COMPASS_POINT` (warning): The second part of a port (`a:p:zz`) is not a compass point; kept as written, as Graphviz warns.
- `W_DOT_LATE_CHARSET` (warning): A `charset` attribute beyond the head the decoder reads it from; the input was decoded without it.
- `W_DOT_STRICT_MERGED` (warning): A parallel edge merged into an earlier one under `strict`.
- `W_DOT_KEY_MERGED` (warning): An edge merged into an earlier one with the same endpoints and `key`.
- `W_ROLE_TAKEN` (warning): You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.
- `W_COLUMN_RENAMED` (warning): An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example two attributes declared with the same name.
- `W_OPTION_IGNORED` (warning): You set an option this format does not use; it had no effect. The message names the option.
- `W_ID_MERGED` (warning): Two different id texts became the same number because `ids` is "number", so their nodes were merged.
- `W_SINK_OPTION` (warning): You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.
- `W_DIRECTION_REFUSED` (warning): You read into a graph builder whose direction is already set, or which already holds edges, so the file is read with the builder's direction instead of its own.
- `W_DIRECTION_FORCED` (warning): Edges of the other direction were read with the direction `onMixedDirection` chose.
- `E_MIXED_DIRECTION` (error): The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a format that holds one direction per file fails with `E_DIRECTED`. Pass "directed" or "undirected" to read or write it anyway.
- `W_WIDENING_UNSUPPORTED` (warning): Your graph builder cannot change an attribute's type after its first value, so a text column keeps the type of its first values.

Like every format, it can also record the codes for unreadable input and for elements the graph refuses: [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED), [`E_INVALID_ID`](../codes.md#E_INVALID_ID), [`E_UNKNOWN_NODE`](../codes.md#E_UNKNOWN_NODE), [`E_INVALID_WEIGHT`](../codes.md#E_INVALID_WEIGHT), [`E_DUPLICATE_EDGE`](../codes.md#E_DUPLICATE_EDGE), [`E_SELF_LOOP`](../codes.md#E_SELF_LOOP), [`E_DUPLICATE_EDGE_ID`](../codes.md#E_DUPLICATE_EDGE_ID).

## Loss codes

The codes `checkExport(snapshot, "dot", options)` can return before a save, also exported as `DOT_LOSS` from `@graphty/graph-io/dot`. An `E_` code means the save throws unless you change the graph or the options.

- `E_DOT_TRAILING_BACKSLASH` (error, the save throws): An id, name or text with a backslash before a quote or a line break, or at its end, cannot be written as a DOT quoted string; the save fails.
- `W_DOT_NON_FINITE` (warning): NaN or an infinity has no DOT number spelling; it is written as text and reads back as text.
- `W_TEXT_INFERRED` (warning): A text value that reads back as a number or a boolean, because the format does not record that it was text (the text "42" reads back as the number 42).
- `W_DOT_ATTRIBUTE_CLASH` (warning): A plain column named like an attribute the exporter writes for a role (weight, key, pos) is not written.
- `W_MUTUAL_EXPANDED` (warning): A mutual pair is written as two directed edges.
- `W_PARENTS_DROPPED` (warning): A parents (multi-parent) column cannot be written; DOT clusters nest.
- `W_DOT_POSITION_SHAPE` (warning): A position column that is not a node column of 2 or 3 components is not written.
- `W_ID_TEXT_TYPE` (warning): An id that reads back as a different type, such as the decimal 1.5 as text or the text "1" as the number 1.
- `W_EMPTY_COLUMN_DROPPED` (warning): A declared column whose every row is unset is not written (DOT writes cells, never declarations).
- `W_ROLE_ASSUMED` (warning): An attribute without a role is written where the format keeps a role (a `name` column as the label, say), and reads back with that role.
- `W_DOT_CLUSTER_MARKED` (warning): A parent that is a plain node is written as a node and a cluster of one name; it reads back marked as a cluster.

When the graph has something this format cannot hold, it can also return the [shared loss codes](../codes.md#shared-loss-codes): [`E_ID_CHARSET`](../codes.md#E_ID_CHARSET), [`E_ID_TEXT_COLLISION`](../codes.md#E_ID_TEXT_COLLISION), [`E_MIXED_DIRECTION`](../codes.md#E_MIXED_DIRECTION), [`E_XML_ILLEGAL_CHAR`](../codes.md#E_XML_ILLEGAL_CHAR), [`W_COLUMN_DROPPED`](../codes.md#W_COLUMN_DROPPED), [`W_COLUMN_NAME_CHANGED`](../codes.md#W_COLUMN_NAME_CHANGED), [`W_COMPONENTS_FLATTENED`](../codes.md#W_COMPONENTS_FLATTENED), [`W_DEFAULT_DROPPED`](../codes.md#W_DEFAULT_DROPPED), [`W_DTYPE_UNSUPPORTED`](../codes.md#W_DTYPE_UNSUPPORTED), [`W_DYNAMIC_VALUES_DROPPED`](../codes.md#W_DYNAMIC_VALUES_DROPPED), [`W_EDGE_IDS_DROPPED`](../codes.md#W_EDGE_IDS_DROPPED), [`W_EDGE_IDS_GENERATED`](../codes.md#W_EDGE_IDS_GENERATED), [`W_EXTENSION_TABLE_DROPPED`](../codes.md#W_EXTENSION_TABLE_DROPPED), [`W_GRAPH_ATTRIBUTES_DROPPED`](../codes.md#W_GRAPH_ATTRIBUTES_DROPPED), [`W_HIERARCHY_DROPPED`](../codes.md#W_HIERARCHY_DROPPED), [`W_ID_MANGLED`](../codes.md#W_ID_MANGLED), [`W_ID_RENUMBERED`](../codes.md#W_ID_RENUMBERED), [`W_INTEGRAL_F64_AS_I32`](../codes.md#W_INTEGRAL_F64_AS_I32), [`W_JSON_UNSUPPORTED`](../codes.md#W_JSON_UNSUPPORTED), [`W_LIST_UNSUPPORTED`](../codes.md#W_LIST_UNSUPPORTED), [`W_MIXED_DIRECTION`](../codes.md#W_MIXED_DIRECTION), [`W_MULTI_EDGES`](../codes.md#W_MULTI_EDGES), [`W_MUTUAL_AS_UNDIRECTED`](../codes.md#W_MUTUAL_AS_UNDIRECTED), [`W_NONFINITE_AS_NULL`](../codes.md#W_NONFINITE_AS_NULL), [`W_OPEN_INTERVAL`](../codes.md#W_OPEN_INTERVAL), [`W_OPTIONS_DROPPED`](../codes.md#W_OPTIONS_DROPPED), [`W_OPTIONS_GAINED`](../codes.md#W_OPTIONS_GAINED), [`W_POSITIONS_DROPPED`](../codes.md#W_POSITIONS_DROPPED), [`W_ROLE_DROPPED`](../codes.md#W_ROLE_DROPPED), [`W_SELF_LOOPS`](../codes.md#W_SELF_LOOPS), [`W_SPELLS_DROPPED`](../codes.md#W_SPELLS_DROPPED), [`W_STORAGE_CLASS_CHANGED`](../codes.md#W_STORAGE_CLASS_CHANGED), [`W_TEMPORAL_DROPPED`](../codes.md#W_TEMPORAL_DROPPED), [`W_TEMPORAL_TEXT_DROPPED`](../codes.md#W_TEMPORAL_TEXT_DROPPED), [`W_VIZ_DROPPED`](../codes.md#W_VIZ_DROPPED), [`W_WEIGHTS_DROPPED`](../codes.md#W_WEIGHTS_DROPPED), [`W_WEIGHT_KEY_CLASH`](../codes.md#W_WEIGHT_KEY_CLASH).

<!-- generated:end -->
