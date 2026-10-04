# GML

GML, the [Graph Modelling Language](https://networkx.org/documentation/stable/reference/readwrite/gml.html),
is a text format of nested `key value` records. graph-io reads and writes it the way NetworkX and
igraph do.

## At a glance

<!-- generated:begin glance:gml -->

|                         |                            |
| ----------------------- | -------------------------- |
| Import from             | `@graphty/graph-io/gml`    |
| Format name             | `gml`                      |
| Extensions              | `.gml`                     |
| MIME types              | `text/x-gml`, `text/plain` |
| Reads                   | yes                        |
| Writes                  | yes                        |
| Several graphs per file | yes (`importAllGraphs`)    |
| Lists its graphs        | no                         |

What a saved file can hold (the [capabilities](./index.md#what-the-capabilities-mean) explain each row):

| Capability                                      | Value                        |
| ----------------------------------------------- | ---------------------------- |
| [`mixedDirection`](./index.md#mixeddirection)   | no                           |
| [`multiEdges`](./index.md#multiedges)           | yes                          |
| [`selfLoops`](./index.md#selfloops)             | yes                          |
| [`edgeIds`](./index.md#edgeids)                 | optional                     |
| [`idCharset`](./index.md#idcharset)             | integer                      |
| [`dtypes`](./index.md#dtypes)                   | i32, f64, string, dict, json |
| [`components`](./index.md#components)           | no                           |
| [`lists`](./index.md#lists)                     | yes                          |
| [`json`](./index.md#json)                       | yes                          |
| [`defaults`](./index.md#defaults)               | no                           |
| [`options`](./index.md#options)                 | no                           |
| [`hierarchy`](./index.md#hierarchy)             | no                           |
| [`temporal`](./index.md#temporal)               | none                         |
| [`graphAttributes`](./index.md#graphattributes) | yes                          |
| [`positions`](./index.md#positions)             | yes                          |
| [`viz`](./index.md#viz)                         | no                           |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/gml -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

// got.gml was saved with sanitizeIds: "mangle": its ids are numbers, and the names are restored on reading
const { snapshot } = await importGraph(await readFile("got.gml"), { filename: "got.gml" });
console.log(`${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);
console.log(`node 0: id ${JSON.stringify(snapshot.ids.idOf(0))}, label ${String(snapshot.nodes.value("label", 0))}`);

// Saving it again needs the same option, because the ids are text once more
const options = { sanitizeIds: "mangle" } as const;
console.log(checkExport(snapshot, "gml", options).map((n) => n.code));
await writeFile("got-copy.gml", await exportGraphToBytes(snapshot, "gml", options));
```

<!-- generated:end -->

<!-- generated:begin output:formats/gml -->

```text
107 nodes; node columns: label
node 0: id "Aemon", label Aemon
[ 'W_ID_MANGLED' ]
```

<!-- generated:end -->

GML node ids are integers, so `got.gml` was saved with `sanitizeIds: "mangle"`: the file numbers
the nodes and keeps each character's name in a `graphty_originalId` key, and graph-io reads the
names back as the ids. Saving the graph to GML again needs the same option, and the only note is
`W_ID_MANGLED`.

## How graph-io reads it

- The whole file is read as text before it is parsed.
- Node and edge keys become columns. GML values carry their own type, so a column of `int` values
  is an integer column, `real` values make a floating-point column, quoted strings make text, a
  nested `[ ]` record is kept as JSON, and a key repeated within one node is a list. NetworkX's
  `_networkx_list_start` marker and its `"[]"` empty list are understood.
- `directed 1` makes a directed graph; a file without `directed` is undirected. The `directed` key
  as the file wrote it is kept in `snapshot.meta.extra.gml.directed` (absent when the file has
  none), so you can tell `directed 0` from a file that relies on the default.
- An edge's `value` key is its weight (the `weightFrom` option changes the key).
- A node's `graphics [ x y z ]` becomes its position; the other `graphics` keys are kept as JSON.
  Pass `positions: false` to keep the whole `graphics` record as JSON.
- The GML specification makes node ids integers. NetworkX and Gephi also write text ids; graph-io
  reads them under the `ids` option with one `W_GML_STRING_ID` warning per file.
- `nodeIdFrom: "label"` or `"index"` takes node ids from the labels or from the node order, for
  files whose `id` keys are meaningless numbers. Every node still needs its `id` key, because edges
  name their ends by it: a node without one is skipped with `E_MISSING_ID`.
- `#` comments, `+INF`, `-INF` and `NAN` are read. A file can hold several `graph [ ]` blocks; see
  [Files that hold several graphs](../loading.md#files-that-hold-several-graphs).
- Text columns with many repeated values are stored as dictionaries to save memory; pass
  `dictionaries: false` to store them as plain text.

## What a saved file keeps and loses

What does not survive:

- One direction per file. A graph with both kinds of edges needs `onMixedDirection`.
- Node ids must be integers. Other ids need `sanitizeIds: "mangle"`, which numbers the nodes and
  keeps each original id in a `graphty_originalId` key that graph-io restores.
- Column names must be GML keys: a letter followed by letters, digits or underscores, and not one
  of GML's own keys. Other names make the export throw (`E_GML_INVALID_KEY`,
  `E_GML_RESERVED_KEY`) unless you pass `sanitizeKeys: "mangle"`, which rewrites them.
- Inside a JSON record, GML cannot tell integers from reals, writes booleans as 1 and 0, and has no
  null (`W_GML_RECORD_NUMBER_TYPE` and related notes).
- Edge ids are kept; time columns, visual columns other than the position, and nesting are not.

<!-- generated:begin reference:gml -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).
A file can hold several graphs: pick one with the `graphIndex` or `graphName` option of [importGraph()](../options.md#importgraph-and-importallgraphs), as [Files that hold several graphs](../loading.md#files-that-hold-several-graphs) shows.

| Option                                 | Type      | Default | Meaning                                                                                                                                                        |
| -------------------------------------- | --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `positions`                            | `boolean` | `true`  | Read a node's `graphics [ x y z ]` record as its position; false keeps the whole record as a JSON attribute named `graphics`.                                  |
| [`dictionaries`](#import-dictionaries) | `boolean` | `true`  | Store a text attribute whose values repeat a lot (fewer distinct values than half the rows) as a dictionary column, which uses less memory and reads the same. |

- <a id="import-dictionaries"></a>`dictionaries`: Store a text attribute whose values repeat a lot (fewer distinct values than half the rows) as a dictionary column, which uses less memory and reads the same. Such a column reports `meta.dtype` "dict" instead of "string". A column with a role, such as the `label` column, always stays "string".

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option                           | Type                  | Default               | Meaning                                                                                                                                                                                                                                                                                                                     |
| -------------------------------- | --------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`weightKey`](#export-weightkey) | `string`              | as read, else "value" | The edge key the weights are written under.                                                                                                                                                                                                                                                                                 |
| `sanitizeKeys`                   | `"error" \| "mangle"` | `"error"`             | What to do with an attribute name or record key that GML cannot write (GML keys are `[A-Za-z][0-9A-Za-z_]*`, and `id`, `source`, `target` and the like are taken): "error" makes the save fail, "mangle" rewrites it (`.` and other characters become `_`, a clash gets a `_2` suffix) and checkExport() lists each rename. |

- <a id="export-weightkey"></a>`weightKey`: The edge key the weights are written under. The default is the key a GML import read them from, else `value`.

## Import issue codes

The codes this format's import report can hold. They are also exported as `GML_ISSUE` from `@graphty/graph-io/gml`, keyed by the code without its `E_` / `W_` and `GML_` prefixes.

- `E_SYNTAX` (error): The text breaks GML's syntax: a word that is not a key or a value, an unclosed string or `[`, a stray `]`, or a key without a value. The import stops.
- `E_INVALID_UTF8` (error): The input is not valid UTF-8. The import stops.
- `E_INVALID_ENCODING` (error): Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the `encoding` option). The import stops.
- `W_ENCODING_FALLBACK` (warning): Bytes that are not UTF-8 and declare no encoding were read as windows-1252.
- `W_UNKNOWN_ENCODING` (warning): A declared encoding the platform cannot decode was ignored.
- `E_NO_GRAPH` (error): There is no `graph [` block. The import stops.
- `W_MULTIPLE_GRAPHS` (warning): The file holds more than one `graph` block; the first was read, or the one `graphIndex` or `graphName` chose.
- `E_MISSING_ID` (error): A node without an `id`.
- `E_GML_MISSING_LABEL` (error): A node without a `label` under nodeIdFrom "label".
- `E_MISSING_ENDPOINT` (error): An edge without `source` or `target`.
- `E_GML_ID_TYPE` (error): A node id, source or target that is neither an integer nor a string.
- `W_GML_STRING_ID` (warning): Node ids, sources or targets are text, where GML expects integers. They are read under the `ids` option. Reported once per file.
- `W_DUPLICATE_NODE` (warning): A node id declared twice (later keys overwrite).
- `E_GML_REPEATED_KEY` (error): A structural key repeated in one element.
- `E_GML_ELEMENT_TYPE` (error): A `node` / `edge` key whose value is not a record.
- `E_GML_FLAG_TYPE` (error): A `directed` / `multigraph` flag that is not an integer.
- `W_GML_FLAG_VALUE` (warning): A `directed` / `multigraph` flag outside 0 / 1, or repeated.
- `W_GML_UNKNOWN_ENTITY` (warning): A named entity no table decodes, or a numeric reference beyond U+10FFFF; kept as written.
- `W_PRECISION` (warning): An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.
- `W_GML_GRAPHICS` (warning): A node's graphics value that cannot give a position as written; kept in the graphics json column.
- `W_GML_NESTED_ELEMENT` (warning): A graph, node or edge record nested in a node or edge; kept as json, not read as structure.
- `W_GML_GROUPS` (warning): YEd's isGroup / gid keys, kept as plain columns; the hierarchy is not read as containment.
- `W_WIDENED` (warning): An attribute's type was widened because a later value did not fit: an integer above 2^31 in an integer column, or two declared types for one attribute.
- `W_COLUMN_RENAMED` (warning): An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a repeated column header.
- `W_ROLE_TAKEN` (warning): You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.
- `W_ID_MERGED` (warning): Two different id texts became the same number because `ids` is "number", so their nodes were merged.
- `W_OPTION_IGNORED` (warning): You set an option this format does not use; it had no effect. The message names the option.
- `W_SINK_OPTION` (warning): You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.
- `W_DIRECTION_REFUSED` (warning): You read into a graph builder whose direction is already set, or which already holds edges, so the file is read with the builder's direction instead of its own.
- `W_DIRECTION_FORCED` (warning): Edges of the other direction were read with the direction `onMixedDirection` chose.
- `E_MIXED_DIRECTION` (error): The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a format that holds one direction per file fails with `E_DIRECTED`. Pass "directed" or "undirected" to read or write it anyway.
- `W_GML_ID_DROPPED` (warning): Under nodeIdFrom "label" / "index" the integer ids are not kept (a loss note).

Like every format, it can also record the codes for unreadable input and for elements the graph refuses: [`E_EMPTY_INPUT`](../codes.md#E_EMPTY_INPUT), [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED), [`E_INVALID_ID`](../codes.md#E_INVALID_ID), [`E_UNKNOWN_NODE`](../codes.md#E_UNKNOWN_NODE), [`E_INVALID_WEIGHT`](../codes.md#E_INVALID_WEIGHT), [`E_DUPLICATE_EDGE`](../codes.md#E_DUPLICATE_EDGE), [`E_SELF_LOOP`](../codes.md#E_SELF_LOOP), [`E_DUPLICATE_EDGE_ID`](../codes.md#E_DUPLICATE_EDGE_ID).

## Loss codes

The codes `checkExport(snapshot, "gml", options)` can return before a save, also exported as `GML_LOSS` from `@graphty/graph-io/gml`. An `E_` code means the save throws unless you change the graph or the options.

- `W_GML_RECORD_NUMBER_TYPE` (warning): A json column holds numbers; GML records cannot keep int versus real.
- `W_GML_RECORD_BOOLEAN` (warning): A json column holds booleans, written 1 / 0.
- `W_GML_RECORD_NULL` (warning): A json column holds nulls, omitted.
- `E_GML_NESTED_ARRAY` (error, the save throws): An attribute holds an array inside an array, which GML cannot write; the save fails.
- `W_GML_JSON_ARRAY` (warning): A json row that is an array, written as repeated keys.
- `E_GML_INVALID_KEY` (error, the save throws): An attribute name GML cannot use as a key (keys are letters and digits, starting with a letter). The save fails unless `sanitizeKeys` is "mangle".
- `E_GML_RESERVED_KEY` (error, the save throws): A column named like a structural key.
- `W_GML_KEY_MANGLED` (warning): A key rewritten under sanitizeKeys "mangle".
- `W_GML_POSITION_COMPONENTS` (warning): A position column with more than three components.
- `W_GML_GRAPHICS_OVERRIDDEN` (warning): A graphics record whose x / y / z the position column overrides.
- `E_GML_GRAPHICS_CONFLICT` (error, the save throws): A graphics record that cannot hold the position.

When the graph has something this format cannot hold, it can also return the [shared loss codes](../codes.md#shared-loss-codes): [`E_ID_CHARSET`](../codes.md#E_ID_CHARSET), [`E_ID_TEXT_COLLISION`](../codes.md#E_ID_TEXT_COLLISION), [`E_MIXED_DIRECTION`](../codes.md#E_MIXED_DIRECTION), [`E_XML_ILLEGAL_CHAR`](../codes.md#E_XML_ILLEGAL_CHAR), [`W_COLUMN_DROPPED`](../codes.md#W_COLUMN_DROPPED), [`W_COLUMN_NAME_CHANGED`](../codes.md#W_COLUMN_NAME_CHANGED), [`W_COMPONENTS_FLATTENED`](../codes.md#W_COMPONENTS_FLATTENED), [`W_DEFAULT_DROPPED`](../codes.md#W_DEFAULT_DROPPED), [`W_DTYPE_UNSUPPORTED`](../codes.md#W_DTYPE_UNSUPPORTED), [`W_DYNAMIC_VALUES_DROPPED`](../codes.md#W_DYNAMIC_VALUES_DROPPED), [`W_EDGE_IDS_DROPPED`](../codes.md#W_EDGE_IDS_DROPPED), [`W_EDGE_IDS_GENERATED`](../codes.md#W_EDGE_IDS_GENERATED), [`W_EMPTY_COLUMN_DROPPED`](../codes.md#W_EMPTY_COLUMN_DROPPED), [`W_EXTENSION_TABLE_DROPPED`](../codes.md#W_EXTENSION_TABLE_DROPPED), [`W_GRAPH_ATTRIBUTES_DROPPED`](../codes.md#W_GRAPH_ATTRIBUTES_DROPPED), [`W_HIERARCHY_DROPPED`](../codes.md#W_HIERARCHY_DROPPED), [`W_ID_MANGLED`](../codes.md#W_ID_MANGLED), [`W_ID_RENUMBERED`](../codes.md#W_ID_RENUMBERED), [`W_ID_TEXT_TYPE`](../codes.md#W_ID_TEXT_TYPE), [`W_INTEGRAL_F64_AS_I32`](../codes.md#W_INTEGRAL_F64_AS_I32), [`W_JSON_UNSUPPORTED`](../codes.md#W_JSON_UNSUPPORTED), [`W_LIST_UNSUPPORTED`](../codes.md#W_LIST_UNSUPPORTED), [`W_MIXED_DIRECTION`](../codes.md#W_MIXED_DIRECTION), [`W_MULTI_EDGES`](../codes.md#W_MULTI_EDGES), [`W_MUTUAL_AS_UNDIRECTED`](../codes.md#W_MUTUAL_AS_UNDIRECTED), [`W_MUTUAL_EXPANDED`](../codes.md#W_MUTUAL_EXPANDED), [`W_NONFINITE_AS_NULL`](../codes.md#W_NONFINITE_AS_NULL), [`W_OPEN_INTERVAL`](../codes.md#W_OPEN_INTERVAL), [`W_OPTIONS_DROPPED`](../codes.md#W_OPTIONS_DROPPED), [`W_OPTIONS_GAINED`](../codes.md#W_OPTIONS_GAINED), [`W_PARENTS_DROPPED`](../codes.md#W_PARENTS_DROPPED), [`W_POSITIONS_DROPPED`](../codes.md#W_POSITIONS_DROPPED), [`W_ROLE_ASSUMED`](../codes.md#W_ROLE_ASSUMED), [`W_ROLE_DROPPED`](../codes.md#W_ROLE_DROPPED), [`W_SELF_LOOPS`](../codes.md#W_SELF_LOOPS), [`W_SPELLS_DROPPED`](../codes.md#W_SPELLS_DROPPED), [`W_STORAGE_CLASS_CHANGED`](../codes.md#W_STORAGE_CLASS_CHANGED), [`W_TEMPORAL_DROPPED`](../codes.md#W_TEMPORAL_DROPPED), [`W_TEMPORAL_TEXT_DROPPED`](../codes.md#W_TEMPORAL_TEXT_DROPPED), [`W_TEXT_INFERRED`](../codes.md#W_TEXT_INFERRED), [`W_VIZ_DROPPED`](../codes.md#W_VIZ_DROPPED), [`W_WEIGHTS_DROPPED`](../codes.md#W_WEIGHTS_DROPPED), [`W_WEIGHT_KEY_CLASH`](../codes.md#W_WEIGHT_KEY_CLASH).

<!-- generated:end -->
