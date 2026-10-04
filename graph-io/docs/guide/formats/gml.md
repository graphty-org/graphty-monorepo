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

const { snapshot } = await importGraph(await readFile("polbooks.gml"), { filename: "polbooks.gml" });
console.log(`${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);
console.log(`node 0: ${String(snapshot.nodes.value("label", 0))}, ${String(snapshot.nodes.value("value", 0))}`);

console.log(checkExport(snapshot, "gml"));
await writeFile("polbooks-copy.gml", await exportGraphToBytes(snapshot, "gml"));
```

<!-- generated:end -->

<!-- generated:begin output:formats/gml -->

```text
105 nodes; node columns: label, value
node 0: 1000 Years for Revenge, n
[]
```

<!-- generated:end -->

The node labels and the `value` key of every node came back as columns, and the file
saves back to GML with nothing lost.

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
  files whose `id` keys are missing or meaningless.
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

| Option         | Type      | Default | Meaning                                                                                                                                                        |
| -------------- | --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `positions`    | `boolean` | `true`  | Read a node's `graphics [ x y z ]` record as its position; false keeps the whole record as a JSON attribute named `graphics`.                                  |
| `dictionaries` | `boolean` | `true`  | Store a text attribute whose values repeat a lot (fewer distinct values than half the rows) as a dictionary column, which uses less memory and reads the same. |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option         | Type                  | Default               | Meaning                                                                                                                                                                                                                                                                                                                     |
| -------------- | --------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weightKey`    | `string`              | as read, else "value" | The edge key the weights are written under. The default is the key a GML import read them from, else `value`.                                                                                                                                                                                                               |
| `sanitizeKeys` | `"error" \| "mangle"` | `"error"`             | What to do with an attribute name or record key that GML cannot write (GML keys are `[A-Za-z][0-9A-Za-z_]*`, and `id`, `source`, `target` and the like are taken): "error" makes the save fail, "mangle" rewrites it (`.` and other characters become `_`, a clash gets a `_2` suffix) and checkExport() lists each rename. |

## Import issue codes

The codes this format's import report can hold, also exported as `GML_ISSUE` from `@graphty/graph-io/gml`.

| Code                   | Key                 | Severity | Meaning                                                                                                                                                                                                                                      |
| ---------------------- | ------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_SYNTAX`             | `SYNTAX`            | error    | A grammar violation: an untokenizable bare token, an unclosed string or `[`, a stray `]`, a key without a value (fatal).                                                                                                                     |
| `E_INVALID_UTF8`       | `INVALID_UTF8`      | error    | The input holds invalid UTF-8 (fatal).                                                                                                                                                                                                       |
| `E_INVALID_ENCODING`   | `INVALID_ENCODING`  | error    | Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal).                                                                                                                                                     |
| `W_ENCODING_FALLBACK`  | `ENCODING_FALLBACK` | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                                                                                                                                                                  |
| `W_UNKNOWN_ENCODING`   | `UNKNOWN_ENCODING`  | warning  | A declared encoding the platform cannot decode was ignored.                                                                                                                                                                                  |
| `E_NO_GRAPH`           | `NO_GRAPH`          | error    | No `graph [` block (fatal).                                                                                                                                                                                                                  |
| `W_MULTIPLE_GRAPHS`    | `MULTIPLE_GRAPHS`   | warning  | More than one `graph` block (fatal).                                                                                                                                                                                                         |
| `E_MISSING_ID`         | `MISSING_ID`        | error    | A node without an `id`.                                                                                                                                                                                                                      |
| `E_GML_MISSING_LABEL`  | `MISSING_LABEL`     | error    | A node without a `label` under nodeIdFrom "label".                                                                                                                                                                                           |
| `E_MISSING_ENDPOINT`   | `MISSING_ENDPOINT`  | error    | An edge without `source` or `target`.                                                                                                                                                                                                        |
| `E_GML_ID_TYPE`        | `ID_TYPE`           | error    | A node id, source or target that is neither an integer nor a string.                                                                                                                                                                         |
| `W_GML_STRING_ID`      | `STRING_ID`         | warning  | String node ids, sources or targets (outside the spec's integers), kept under the ids rule; warned once.                                                                                                                                     |
| `W_DUPLICATE_NODE`     | `DUPLICATE_NODE`    | warning  | A node id declared twice (later keys overwrite).                                                                                                                                                                                             |
| `E_GML_REPEATED_KEY`   | `REPEATED_KEY`      | error    | A structural key repeated in one element.                                                                                                                                                                                                    |
| `E_GML_ELEMENT_TYPE`   | `ELEMENT_TYPE`      | error    | A `node` / `edge` key whose value is not a record.                                                                                                                                                                                           |
| `E_GML_FLAG_TYPE`      | `FLAG_TYPE`         | error    | A `directed` / `multigraph` flag that is not an integer.                                                                                                                                                                                     |
| `W_GML_FLAG_VALUE`     | `FLAG_VALUE`        | warning  | A `directed` / `multigraph` flag outside 0 / 1, or repeated.                                                                                                                                                                                 |
| `W_GML_UNKNOWN_ENTITY` | `UNKNOWN_ENTITY`    | warning  | A named entity no table decodes, or a numeric reference beyond U+10FFFF; kept as written.                                                                                                                                                    |
| `W_PRECISION`          | `PRECISION`         | warning  | An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.                                                                                                                                    |
| `W_GML_GRAPHICS`       | `GRAPHICS`          | warning  | A node's graphics value that cannot give a position as written; kept in the graphics json column.                                                                                                                                            |
| `W_GML_NESTED_ELEMENT` | `NESTED_ELEMENT`    | warning  | A graph, node or edge record nested in a node or edge; kept as json, not read as structure.                                                                                                                                                  |
| `W_GML_GROUPS`         | `GROUPS`            | warning  | yEd's isGroup / gid keys, kept as plain columns; the hierarchy is not read as containment.                                                                                                                                                   |
| `W_WIDENED`            | `WIDENED`           | warning  | An attribute's type was widened because a later value did not fit: an integer above 2^31 in an integer column, or two declared types for one attribute.                                                                                      |
| `W_COLUMN_RENAMED`     | `COLUMN_RENAMED`    | warning  | An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a repeated column header.                                                                                                             |
| `W_ROLE_TAKEN`         | `ROLE_TAKEN`        | warning  | You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.                                                                                                          |
| `W_ID_MERGED`          | `ID_MERGED`         | warning  | Two id texts merged into one number under ids "number".                                                                                                                                                                                      |
| `W_OPTION_IGNORED`     | `OPTION_IGNORED`    | warning  | You set an option this format does not use; it had no effect. The message names the option.                                                                                                                                                  |
| `W_SINK_OPTION`        | `SINK_OPTION`       | warning  | You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.                                        |
| `W_DIRECTION_REFUSED`  | `DIRECTION_REFUSED` | warning  | You read into a graph builder whose direction is already set, or which already holds edges, so the file is read with the builder's direction instead of its own.                                                                             |
| `W_DIRECTION_FORCED`   | `DIRECTION_FORCED`  | warning  | Edges forced to the policy's direction.                                                                                                                                                                                                      |
| `E_MIXED_DIRECTION`    | `MIXED_DIRECTION`   | error    | The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a format that holds one direction per file fails with E_DIRECTED. Pass "directed" or "undirected" to read or write it anyway. |
| `W_GML_ID_DROPPED`     | `ID_DROPPED`        | warning  | Under nodeIdFrom "label" / "index" the integer ids are not kept (a loss note).                                                                                                                                                               |

Like every format, it can also record the codes for unreadable input: [`E_EMPTY_INPUT`](../codes.md#E_EMPTY_INPUT), [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED).

## Loss codes

The codes `checkExport(snapshot, "gml", options)` can return before a save, also exported as `GML_LOSS` from `@graphty/graph-io/gml`. An `E_` code means the save throws unless you change the graph or the options. A save can also return the [shared loss codes](../codes.md#shared-loss-codes) that any format can.

| Code                        | Key                   | Severity            | Meaning                                                                              |
| --------------------------- | --------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| `W_GML_RECORD_NUMBER_TYPE`  | `RECORD_NUMBER_TYPE`  | warning             | A json column holds numbers; GML records cannot keep int versus real.                |
| `W_GML_RECORD_BOOLEAN`      | `RECORD_BOOLEAN`      | warning             | A json column holds booleans, written 1 / 0.                                         |
| `W_GML_RECORD_NULL`         | `RECORD_NULL`         | warning             | A json column holds nulls, omitted.                                                  |
| `E_GML_NESTED_ARRAY`        | `NESTED_ARRAY`        | error (save throws) | An attribute holds an array inside an array, which GML cannot write; the save fails. |
| `W_GML_JSON_ARRAY`          | `JSON_ARRAY`          | warning             | A json row that is an array, written as repeated keys.                               |
| `E_GML_INVALID_KEY`         | `INVALID_KEY`         | error (save throws) | A column name or record key outside the GML key grammar.                             |
| `E_GML_RESERVED_KEY`        | `RESERVED_KEY`        | error (save throws) | A column named like a structural key.                                                |
| `W_GML_KEY_MANGLED`         | `KEY_MANGLED`         | warning             | A key rewritten under sanitizeKeys "mangle".                                         |
| `W_GML_POSITION_COMPONENTS` | `POSITION_COMPONENTS` | warning             | A position column with more than three components.                                   |
| `W_GML_GRAPHICS_OVERRIDDEN` | `GRAPHICS_OVERRIDDEN` | warning             | A graphics record whose x / y / z the position column overrides.                     |
| `E_GML_GRAPHICS_CONFLICT`   | `GRAPHICS_CONFLICT`   | error (save throws) | A graphics record that cannot hold the position.                                     |

<!-- generated:end -->
