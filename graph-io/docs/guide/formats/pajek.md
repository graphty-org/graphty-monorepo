# Pajek

[Pajek](http://mrvar.fdv.uni-lj.si/pajek/) is a program for large network analysis. Its `.net`
files list numbered vertices, then arcs (directed edges) and edges (undirected). A `.paj` project
file bundles several networks with partitions and vectors.

## At a glance

<!-- generated:begin glance:pajek -->

|                         |                              |
| ----------------------- | ---------------------------- |
| Import from             | `@graphty/graph-io/pajek`    |
| Format name             | `pajek`                      |
| Extensions              | `.net`, `.paj`               |
| MIME types              | `text/x-pajek`, `text/plain` |
| Reads                   | yes                          |
| Writes                  | yes                          |
| Several graphs per file | yes (`importAllGraphs`)      |
| Lists its graphs        | no                           |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/pajek -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

// Pajek numbers vertices 1..N; with sanitizeIds: "mangle" the file also keeps the original ids ("Aemon", ...)
const { snapshot } = await importGraph(await readFile("got-network.graphml"), { filename: "got-network.graphml" });
const options = { sanitizeIds: "mangle" } as const;
for (const note of checkExport(snapshot, "pajek", options)) {
    console.log(`${note.code}: ${note.message}`);
}
const bytes = await exportGraphToBytes(snapshot, "pajek", options);
await writeFile("got-mangled.net", bytes);

// Reading the file back restores the original ids
const back = await importGraph(bytes, { filename: "got-mangled.net" });
console.log(`first id after the round trip: ${String(back.snapshot.ids.idOf(0))}`);

// got.net was saved without "mangle": its ids are the numbers 1..107 and the names are labels
const plain = await importGraph(await readFile("got.net"), { filename: "got.net" });
console.log(
    `got.net: id ${String(plain.snapshot.ids.idOf(0))}, label ${String(plain.snapshot.nodes.value("label", 0))}`,
);
```

<!-- generated:end -->

<!-- generated:begin output:formats/pajek -->

```text
W_PAJEK_KEY_DROPPED: edge column "Edge Label" cannot be a Pajek parameter key; it is not written
W_EDGE_IDS_DROPPED: edge id column "id" cannot be written
W_ID_RENUMBERED: 107 node ids are not their 1-based index; nodes are numbered 1..N, the original ids are written too, and an import with restoreMangledIds: true reads them back as the ids; they are also the labels of nodes without a label value
first id after the round trip: Aemon
got.net: id 1, label Aemon
```

<!-- generated:end -->

Pajek numbers vertices 1 to N, so the string ids of this graph cannot be written as they are.
Unlike the other formats, a Pajek save does not refuse such ids: it renumbers them and warns
`W_ID_RENUMBERED`, keeping each old id as the label of a node that has none. With
`sanitizeIds: "mangle"` each vertex also gets a `graphty_originalId` parameter, and reading the
file back gives the original ids.

## How graph-io reads it

- The file is streamed line by line.
- `*Vertices N` declares vertices 1 to N. A file numbered from 0, as some scripts write, is
  detected from its first vertex line, with the warning `W_PAJEK_ZERO_BASED`. Pass `firstVertex: 0`
  or `1` to say how the file is numbered; then nothing is guessed and nothing is reported. A vertex line's label,
  coordinates, shape and `key value` parameters become columns; the coordinates are the position.
- `*Arcs` sections are directed and `*Edges` sections undirected, so a file with both is a mixed
  graph. `*Arcslist`, `*Edgeslist` and `*Matrix` sections are read too.
- The number after the two ends of an arc or edge is its weight.
- Time intervals such as `[1-5,7-*]` become a time column.
- A `.paj` project's `*Partition` and `*Vector` objects become the node columns `partition` and
  `vector` (`partition#2`, ... for further ones). Other project sections, such as `*Events`, are
  skipped with a warning. A project with several networks is a file with several graphs; see
  [Files that hold several graphs](../loading.md#files-that-hold-several-graphs).
- Pajek files are often in windows-1252 rather than UTF-8; graph-io detects this. See
  [Text encodings](../loading.md#text-encodings).

## What a saved file keeps and loses

Pajek keeps mixed direction, parallel edges, weights, positions and time intervals. What does
not survive:

- Node ids. Vertices are always written 1 to N in node order (`W_ID_RENUMBERED`). The original id
  is written as the label of a node that has no label. With `sanitizeIds: "mangle"` it is also
  written as a `graphty_originalId` parameter, and graph-io restores it.
- Edge ids, lists, JSON values, nesting and graph attributes.
- A label holding a double quote or a line break cannot be written.
- A mutual pair of edges becomes one undirected edge (`W_MUTUAL_AS_UNDIRECTED`).
- When a vertex line needs a label to carry coordinates or parameters, the id is written there and
  reads back as a label (`W_PAJEK_LABEL_GAINED`).

A `.paj` project file starts each network with a `*Network <name>` line. Pass `networkHeader: true`
to write one, with the graph's name (see [Naming the graph](../reading.md#naming-the-graph)), or
pass `name` to choose the name, which also writes the line. A graph without a name, such as one
read from CSV, gets a bare `*Network` line.

<!-- generated:begin capabilities:pajek -->

What a saved file can hold (the [capabilities](./index.md#what-the-capabilities-mean) explain each row):

| Capability                                      | Value                  |
| ----------------------------------------------- | ---------------------- |
| [`mixedDirection`](./index.md#mixeddirection)   | yes                    |
| [`multiEdges`](./index.md#multiedges)           | yes                    |
| [`selfLoops`](./index.md#selfloops)             | yes                    |
| [`edgeIds`](./index.md#edgeids)                 | none                   |
| [`idCharset`](./index.md#idcharset)             | dense-1-based          |
| [`dtypes`](./index.md#dtypes)                   | f64, i32, bool, string |
| [`components`](./index.md#components)           | no                     |
| [`lists`](./index.md#lists)                     | no                     |
| [`json`](./index.md#json)                       | no                     |
| [`defaults`](./index.md#defaults)               | no                     |
| [`options`](./index.md#options)                 | no                     |
| [`hierarchy`](./index.md#hierarchy)             | no                     |
| [`temporal`](./index.md#temporal)               | spells                 |
| [`graphAttributes`](./index.md#graphattributes) | no                     |
| [`positions`](./index.md#positions)             | yes                    |
| [`viz`](./index.md#viz)                         | no                     |

<!-- generated:end -->

<!-- generated:begin reference:pajek -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).
A file can hold several graphs: pick one with the `graphIndex` or `graphName` option of [importGraph()](../options.md#importgraph-and-importallgraphs), as [Files that hold several graphs](../loading.md#files-that-hold-several-graphs) shows.

| Option                               | Type               | Default  |
| ------------------------------------ | ------------------ | -------- |
| [`firstVertex`](#import-firstvertex) | `0 \| "auto" \| 1` | `"auto"` |

- <a id="import-firstvertex"></a>`firstVertex`: The number of the first vertex: 1 (Pajek's rule), 0 (files written by zero-based scripts), or "auto": 0 when the first vertex line is numbered 0, 1 otherwise.

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option                                   | Type      | Default                             |
| ---------------------------------------- | --------- | ----------------------------------- |
| [`networkHeader`](#export-networkheader) | `boolean` | false, or true when `name` is given |
| [`name`](#export-name)                   | `string`  | the graph's name                    |

- <a id="export-networkheader"></a>`networkHeader`: Write a `*Network <name>` line first, as Pajek project files (.paj) have. The name is the `name` option, else the graph's name (`snapshot.meta.name`); a graph with neither gets a bare `*Network` line. Plain .net readers do not expect the line. An explicit `false` wins over `name`: `{ networkHeader: false, name: "x" }` writes no line.
- <a id="export-name"></a>`name`: The network name written on the `*Network` line. Giving one writes the line, unless `networkHeader` is `false`. The default is the graph's name (`snapshot.meta.name`), which a Pajek, DOT, GML or GEXF import keeps; a graph read from CSV has none.

## Import issue codes

The codes this format's import report can hold. They are also exported as `PAJEK_ISSUE` from `@graphty/graph-io/pajek`, keyed by the code without its `E_` / `W_` and `PAJEK_` prefixes.

- `E_UNKNOWN_NODE` (error): An edge names a vertex number outside the range `*Vertices` declared; the edge is skipped.
- `E_INVALID_UTF8` (error): The input is not valid UTF-8. The import stops.
- `E_INVALID_ENCODING` (error): Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the `encoding` option). The import stops.
- `W_ENCODING_FALLBACK` (warning): Bytes that are not UTF-8 and declare no encoding were read as windows-1252.
- `W_UNKNOWN_ENCODING` (warning): A declared encoding the platform cannot decode was ignored.
- `E_PAJEK_NO_VERTICES` (error): There is no `*Vertices` section: the file is empty or not a Pajek network. The import stops.
- `E_PAJEK_VERTICES_COUNT` (error): `*Vertices` without a vertex count, with a count too large to hold, or with a first-mode count outside 0 to N; the import stops.
- `W_MULTIPLE_GRAPHS` (warning): The file holds several graphs and only the first was read. It is not added when `graphIndex` or `graphName` chose the graph. `importAllGraphs()` reads every one.
- `E_GRAPH_NOT_FOUND` (error): `graphIndex` or `graphName` names no graph of the file; the message lists the graphs it holds. The import stops.
- `E_AMBIGUOUS_GRAPH_NAME` (error): `graphName` matches more than one graph; pass `graphIndex`. The import stops.
- `E_PAJEK_OUTSIDE_SECTION` (error): A data line before the first section header.
- `E_SYNTAX` (error): A section header the importer cannot parse.
- `E_PAJEK_UNTERMINATED_QUOTE` (error): A double quote not closed before the end of the line.
- `E_PAJEK_VERTEX_LINE` (error): A vertex line that is not in Pajek's vertex syntax; the vertex is skipped.
- `E_PAJEK_VERTEX_RANGE` (error): A vertex number outside the declared range.
- `W_PAJEK_VERTEX_COUNT` (warning): Fewer vertex lines than `*Vertices` declares, which the Pajek manual allows (vertices without a line have no label).
- `W_DUPLICATE_NODE` (warning): A second line for the same vertex; the later values overwrite.
- `E_PAJEK_LINE` (error): A line that is not in Pajek's syntax for its section (an arc, edge, list, matrix row, partition or vector value); it is skipped.
- `E_PAJEK_INTERVAL` (error): A malformed time interval token.
- `E_PAJEK_MATRIX_ROWS` (error): A `*Matrix` section with the wrong number of rows (N, or N1 in a two-mode network).
- `W_PAJEK_MATRIX_EXTRA` (warning): `*Matrix` rows longer than the column count; the extra values are ignored.
- `E_PAJEK_OBJECT_COUNT` (error): A `*Partition` or `*Vector` whose value count differs from the network's vertex count; values beyond it are dropped, vertices without one are unset.
- `W_PAJEK_UNSUPPORTED_SECTION` (warning): A project-file section (`*Events`, `*Permutation`, ...) the importer does not read; its lines are skipped.
- `W_PAJEK_HEADER_EXTRA` (warning): A section header has extra words Pajek does not define; they are ignored.
- `W_PAJEK_NO_LINES` (warning): The file declares vertices but no line section.
- `W_PAJEK_ZERO_BASED` (warning): Vertex numbering starts at 0 rather than 1, found by `firstVertex: "auto"` (passing `firstVertex: 0` says so and gives no warning).
- `W_PAJEK_COORD_DIMS` (warning): Vertex lines mix two and three coordinates.
- `W_PAJEK_LABEL_MERGED` (warning): Two vertices share a label under nodeIdFrom "label" and became one node.
- `W_ID_MERGED` (warning): Two different labels became the same number because `ids` is "number", so their vertices were merged.
- `W_WIDENING_UNSUPPORTED` (warning): Your graph builder cannot change an attribute's type after its first value, so a text column keeps the type of its first values.
- `W_COLUMN_RENAMED` (warning): A structural column (label, position, shape, spells, relation) renamed `<name>#<id>` because the name was taken.
- `W_ROLE_TAKEN` (warning): You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.
- `W_PAJEK_ORIGINAL_ID_MERGED` (warning): Two vertices carry the same `graphty_originalId` under restoreMangledIds and became one node.
- `W_PAJEK_ORIGINAL_ID_UNRESTORED` (warning): A vertex line's `graphty_originalId` came after a later vertex's line had created it under its number.
- `W_OPTION_IGNORED` (warning): You set an option this format does not use; it had no effect. The message names the option.
- `W_SINK_OPTION` (warning): You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.
- `W_PAJEK_QUOTE_IN_TOKEN` (warning): A double quote inside a token (a CSV-style doubled quote, a quote mid-word): removed and the parts joined.
- `W_DUPLICATE_ATTRIBUTE` (warning): The same parameter twice on one line; the later value stands.
- `W_PAJEK_REFERENCE_RANGE` (warning): A character reference beyond U+10FFFF in a label; kept as written.
- `W_PAJEK_TWO_MODE_LINE` (warning): A line of a two-mode network whose endpoints are both in one mode.
- `W_PAJEK_NUMERIC_LABEL` (warning): A bare non-integer number read as a vertex label before two coordinates (`1 0.1 0.2 0.3`); it may be an x y z line without a label.
- `W_PAJEK_RELATION_RENAMED` (warning): A relation number given a second name by a later `*Arcs :k "name"` header.
- `W_PAJEK_NEGATIVE_LIST_ENTRY` (warning): A negative vertex number in an adjacency list, read as its absolute value.
- `W_PRECISION` (warning): An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.

Like every format, it can also record the codes for unreadable input and for elements the graph refuses: [`E_EMPTY_INPUT`](../codes.md#E_EMPTY_INPUT), [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED), [`E_INVALID_ID`](../codes.md#E_INVALID_ID), [`E_INVALID_WEIGHT`](../codes.md#E_INVALID_WEIGHT), [`E_DUPLICATE_EDGE`](../codes.md#E_DUPLICATE_EDGE), [`E_SELF_LOOP`](../codes.md#E_SELF_LOOP), [`E_DUPLICATE_EDGE_ID`](../codes.md#E_DUPLICATE_EDGE_ID).

## Loss codes

The codes `checkExport(snapshot, "pajek", options)` can return before a save, also exported as `PAJEK_LOSS` from `@graphty/graph-io/pajek`. An `E_` code means the save throws unless you change the graph or the options.

- `E_PAJEK_TEXT` (error, the save throws): A label or text value holds a double quote or a line break, which Pajek cannot write; the save fails with `E_UNSUPPORTED`.
- `W_PAJEK_KEY_DROPPED` (warning): A column whose name cannot be a parameter key (whitespace, a quote, numeric, a shape keyword); skipped.
- `W_PAJEK_LABEL_AS_TEXT` (warning): The node label attribute holds numbers or other values that are not text; they are written as text and read back as text.
- `W_PAJEK_NONFINITE_AS_TEXT` (warning): NaN or an infinity is written as the text Infinity or NaN, which reads back as text.
- `W_MUTUAL_AS_UNDIRECTED` (warning): A mutual pair; written as one undirected edge, the mark lost.
- `W_TEMPORAL_DROPPED` (warning): A start / end / timestamp role column; Pajek intervals are written from the spells role only.
- `W_PAJEK_POSITION_STRIDE` (warning): A position with other than 2 or 3 coordinates is not written.
- `W_PAJEK_FIRST_MODE_DROPPED` (warning): The graph's two-mode vertex count (`meta.extra.pajek.firstMode`) is not between 0 and the number of nodes, so the file is written as a one-mode network.
- `W_ROLE_DROPPED` (warning): An attribute with a role the format has no place for is written as a plain attribute; the role is lost.
- `W_PAJEK_SHAPE_AS_PARAMETER` (warning): A `shape` attribute whose value is not one of Pajek's shape names is written as a parameter, and reads back as a plain text attribute.
- `W_PAJEK_LABEL_GAINED` (warning): A vertex line with coordinates, a shape or parameters needs a label: the id text is written and reads back as a label.
- `W_ROLE_ASSUMED` (warning): An attribute without a role is written where the format keeps a role (for example, a `name` column as the label), and reads back with that role.
- `W_ID_TEXT_TYPE` (warning): With `sanitizeIds: "mangle"`: an original id that reads back as a different type, such as the text "7" as the number 7.
- `W_TEXT_INFERRED` (warning): A text value that reads back as a number or a boolean, because the format does not record that it was text (the text "42" reads back as the number 42).

When the graph has something this format cannot hold, it can also return the [shared loss codes](../codes.md#shared-loss-codes): [`E_ID_CHARSET`](../codes.md#E_ID_CHARSET), [`E_ID_TEXT_COLLISION`](../codes.md#E_ID_TEXT_COLLISION), [`E_MIXED_DIRECTION`](../codes.md#E_MIXED_DIRECTION), [`E_XML_ILLEGAL_CHAR`](../codes.md#E_XML_ILLEGAL_CHAR), [`W_COLUMN_DROPPED`](../codes.md#W_COLUMN_DROPPED), [`W_COLUMN_NAME_CHANGED`](../codes.md#W_COLUMN_NAME_CHANGED), [`W_COMPONENTS_FLATTENED`](../codes.md#W_COMPONENTS_FLATTENED), [`W_DEFAULT_DROPPED`](../codes.md#W_DEFAULT_DROPPED), [`W_DTYPE_UNSUPPORTED`](../codes.md#W_DTYPE_UNSUPPORTED), [`W_DYNAMIC_VALUES_DROPPED`](../codes.md#W_DYNAMIC_VALUES_DROPPED), [`W_EDGE_IDS_DROPPED`](../codes.md#W_EDGE_IDS_DROPPED), [`W_EDGE_IDS_GENERATED`](../codes.md#W_EDGE_IDS_GENERATED), [`W_EMPTY_COLUMN_DROPPED`](../codes.md#W_EMPTY_COLUMN_DROPPED), [`W_EXTENSION_TABLE_DROPPED`](../codes.md#W_EXTENSION_TABLE_DROPPED), [`W_GRAPH_ATTRIBUTES_DROPPED`](../codes.md#W_GRAPH_ATTRIBUTES_DROPPED), [`W_HIERARCHY_DROPPED`](../codes.md#W_HIERARCHY_DROPPED), [`W_ID_MANGLED`](../codes.md#W_ID_MANGLED), [`W_ID_RENUMBERED`](../codes.md#W_ID_RENUMBERED), [`W_INTEGRAL_F64_AS_I32`](../codes.md#W_INTEGRAL_F64_AS_I32), [`W_JSON_UNSUPPORTED`](../codes.md#W_JSON_UNSUPPORTED), [`W_LIST_UNSUPPORTED`](../codes.md#W_LIST_UNSUPPORTED), [`W_MIXED_DIRECTION`](../codes.md#W_MIXED_DIRECTION), [`W_MULTI_EDGES`](../codes.md#W_MULTI_EDGES), [`W_MUTUAL_EXPANDED`](../codes.md#W_MUTUAL_EXPANDED), [`W_NONFINITE_AS_NULL`](../codes.md#W_NONFINITE_AS_NULL), [`W_OPEN_INTERVAL`](../codes.md#W_OPEN_INTERVAL), [`W_OPTIONS_DROPPED`](../codes.md#W_OPTIONS_DROPPED), [`W_OPTIONS_GAINED`](../codes.md#W_OPTIONS_GAINED), [`W_PARENTS_DROPPED`](../codes.md#W_PARENTS_DROPPED), [`W_POSITIONS_DROPPED`](../codes.md#W_POSITIONS_DROPPED), [`W_SELF_LOOPS`](../codes.md#W_SELF_LOOPS), [`W_SPELLS_DROPPED`](../codes.md#W_SPELLS_DROPPED), [`W_STORAGE_CLASS_CHANGED`](../codes.md#W_STORAGE_CLASS_CHANGED), [`W_TEMPORAL_TEXT_DROPPED`](../codes.md#W_TEMPORAL_TEXT_DROPPED), [`W_VIZ_DROPPED`](../codes.md#W_VIZ_DROPPED), [`W_WEIGHTS_DROPPED`](../codes.md#W_WEIGHTS_DROPPED), [`W_WEIGHT_KEY_CLASH`](../codes.md#W_WEIGHT_KEY_CLASH).

<!-- generated:end -->
