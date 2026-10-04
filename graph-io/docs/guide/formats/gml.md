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

What a saved file can hold:

| Capability        | Value                        | Meaning                                                                                                                            |
| ----------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `mixedDirection`  | no                           | Directed and undirected edges in one file.                                                                                         |
| `multiEdges`      | yes                          | Parallel edges.                                                                                                                    |
| `selfLoops`       | yes                          | Self-loops.                                                                                                                        |
| `edgeIds`         | optional                     | Edge ids: "required" (generated when the graph has none), "optional", or "none" (not stored).                                      |
| `idCharset`       | integer                      | Which node ids are written unchanged: "any", "nmtoken" (XML name tokens), "integer", or "dense-1-based" (1 to N).                  |
| `dtypes`          | i32, f64, string, dict, json | The column types the format keeps exactly.                                                                                         |
| `components`      | no                           | Columns with several numbers per row, such as a position.                                                                          |
| `lists`           | yes                          | List columns.                                                                                                                      |
| `json`            | yes                          | Nested JSON values.                                                                                                                |
| `defaults`        | no                           | Columns' declared default values.                                                                                                  |
| `options`         | no                           | Declared lists of allowed values (GEXF options).                                                                                   |
| `hierarchy`       | no                           | Nesting: nodes inside other nodes (parent columns).                                                                                |
| `temporal`        | none                         | Time: "none", "intervals", "spells" (several intervals per element), or "dynamic-values" (attribute values that change over time). |
| `graphAttributes` | yes                          | Graph-level attributes.                                                                                                            |
| `positions`       | yes                          | Node positions.                                                                                                                    |
| `viz`             | no                           | Visual columns: color, size, shape and thickness.                                                                                  |

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

| Option         | Type      | Default | Meaning                                                                                                                                                            |
| -------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `positions`    | `boolean` | `true`  | Map a node's `graphics [ x y z ]` record to a `position` column with the position role (default true); false keeps the whole record in the `graphics` json column. |
| `dictionaries` | `boolean` | `true`  | Store a string column whose values repeat a lot (fewer distinct values than half the rows) as a dictionary column (default true).                                  |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option         | Type                  | Default   | Meaning                                                                                                                                                                                                                                                                                |
| -------------- | --------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weightKey`    | `string`              |           | The edge key explicit weights are written under; by default the key the GML importer read them from (`meta.weightOrigin.id` when the snapshot came from GML), else `value`.                                                                                                            |
| `sanitizeKeys` | `"error" \| "mangle"` | `"error"` | "error" (default): a column name or record key that is not a GML key (`[A-Za-z][0-9A-Za-z_]*`) or collides with a structural key makes export() throw; "mangle": such keys are rewritten (`.` and other characters become `_`, collisions get a `_2` suffix) and check() reports them. |

## Import issue codes

The codes this format's import report can hold, also exported as `GML_ISSUE` from `@graphty/graph-io/gml`.

| Code                   | Key                 | Severity | Meaning                                                                                                                  |
| ---------------------- | ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `E_EMPTY_INPUT`        | `EMPTY_INPUT`       | error    | The input is empty or holds only whitespace (fatal).                                                                     |
| `E_TOO_LARGE`          | `TOO_LARGE`         | error    | The input is longer than one JavaScript string, or holds a line that is (fatal).                                         |
| `W_ENCODING_CONFLICT`  | `ENCODING_CONFLICT` | warning  | A byte order mark, the encoding option and the declared encoding disagree.                                               |
| `W_CONTROL_CHARACTER`  | `CONTROL_CHARACTER` | warning  | A control character or a stray U+FEFF in the text, or an ignored trailing Ctrl-Z.                                        |
| `E_FOREIGN_FORMAT`     | `FOREIGN_FORMAT`    | error    | The input is an HTML page, a PDF, compressed or archived data or an image (fatal).                                       |
| `W_ISSUES_SUPPRESSED`  | `ISSUES_SUPPRESSED` | warning  | Warnings of one code beyond the number a report keeps, counted in one warning.                                           |
| `E_SYNTAX`             | `SYNTAX`            | error    | A grammar violation: an untokenizable bare token, an unclosed string or `[`, a stray `]`, a key without a value (fatal). |
| `E_INVALID_UTF8`       | `INVALID_UTF8`      | error    | The input holds invalid UTF-8 (fatal).                                                                                   |
| `E_INVALID_ENCODING`   | `INVALID_ENCODING`  | error    | Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal).                                 |
| `W_ENCODING_FALLBACK`  | `ENCODING_FALLBACK` | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                                              |
| `W_UNKNOWN_ENCODING`   | `UNKNOWN_ENCODING`  | warning  | A declared encoding the platform cannot decode was ignored.                                                              |
| `E_NO_GRAPH`           | `NO_GRAPH`          | error    | No `graph [` block (fatal).                                                                                              |
| `W_MULTIPLE_GRAPHS`    | `MULTIPLE_GRAPHS`   | warning  | More than one `graph` block (fatal).                                                                                     |
| `E_MISSING_ID`         | `MISSING_ID`        | error    | A node without an `id`.                                                                                                  |
| `E_GML_MISSING_LABEL`  | `MISSING_LABEL`     | error    | A node without a `label` under nodeIdFrom "label".                                                                       |
| `E_MISSING_ENDPOINT`   | `MISSING_ENDPOINT`  | error    | An edge without `source` or `target`.                                                                                    |
| `E_GML_ID_TYPE`        | `ID_TYPE`           | error    | A node id, source or target that is neither an integer nor a string.                                                     |
| `W_GML_STRING_ID`      | `STRING_ID`         | warning  | String node ids, sources or targets (outside the spec's integers), kept under the ids rule; warned once.                 |
| `W_DUPLICATE_NODE`     | `DUPLICATE_NODE`    | warning  | A node id declared twice (later keys overwrite).                                                                         |
| `E_GML_REPEATED_KEY`   | `REPEATED_KEY`      | error    | A structural key repeated in one element.                                                                                |
| `E_GML_ELEMENT_TYPE`   | `ELEMENT_TYPE`      | error    | A `node` / `edge` key whose value is not a record.                                                                       |
| `E_GML_FLAG_TYPE`      | `FLAG_TYPE`         | error    | A `directed` / `multigraph` flag that is not an integer.                                                                 |
| `W_GML_FLAG_VALUE`     | `FLAG_VALUE`        | warning  | A `directed` / `multigraph` flag outside 0 / 1, or repeated.                                                             |
| `W_GML_UNKNOWN_ENTITY` | `UNKNOWN_ENTITY`    | warning  | A named entity no table decodes, or a numeric reference beyond U+10FFFF; kept as written.                                |
| `W_PRECISION`          | `PRECISION`         | warning  | An integer beyond 2^53 rounded to f64, or a real literal beyond the f64 range stored as an infinity.                     |
| `W_GML_GRAPHICS`       | `GRAPHICS`          | warning  | A node's graphics value that cannot give a position as written; kept in the graphics json column.                        |
| `W_GML_NESTED_ELEMENT` | `NESTED_ELEMENT`    | warning  | A graph, node or edge record nested in a node or edge; kept as json, not read as structure.                              |
| `W_GML_GROUPS`         | `GROUPS`            | warning  | yEd's isGroup / gid keys, kept as plain columns; the hierarchy is not read as containment.                               |
| `W_WIDENED`            | `WIDENED`           | warning  | A key whose values mix numbers and strings; the column is string.                                                        |
| `W_COLUMN_RENAMED`     | `COLUMN_RENAMED`    | warning  | A column renamed `<name>#<key>` because the sink held the name with another shape.                                       |
| `W_ROLE_TAKEN`         | `ROLE_TAKEN`        | warning  | A column declared without its role because the sink already holds it.                                                    |
| `W_ID_MERGED`          | `ID_MERGED`         | warning  | Two id texts merged into one number under ids "number".                                                                  |
| `W_OPTION_IGNORED`     | `OPTION_IGNORED`    | warning  | A common option the importer has no use for was given.                                                                   |
| `W_SINK_OPTION`        | `SINK_OPTION`       | warning  | A builder-policy option the sink does not honor.                                                                         |
| `W_DIRECTION_REFUSED`  | `DIRECTION_REFUSED` | warning  | The sink refused the file's direction.                                                                                   |
| `W_DIRECTION_FORCED`   | `DIRECTION_FORCED`  | warning  | Edges forced to the policy's direction.                                                                                  |
| `E_MIXED_DIRECTION`    | `MIXED_DIRECTION`   | error    | A mixed file under onMixedDirection "error" (fatal).                                                                     |
| `W_GML_ID_DROPPED`     | `ID_DROPPED`        | warning  | Under nodeIdFrom "label" / "index" the integer ids are not kept (a loss note).                                           |

## Loss codes

The codes `check()` can return before a save, also exported as `GML_LOSS` from `@graphty/graph-io/gml`. An `E_` code means the save throws unless you change the graph or the options.

| Code                        | Key                   | Severity            | Meaning                                                               |
| --------------------------- | --------------------- | ------------------- | --------------------------------------------------------------------- |
| `W_GML_RECORD_NUMBER_TYPE`  | `RECORD_NUMBER_TYPE`  | warning             | A json column holds numbers; GML records cannot keep int versus real. |
| `W_GML_RECORD_BOOLEAN`      | `RECORD_BOOLEAN`      | warning             | A json column holds booleans, written 1 / 0.                          |
| `W_GML_RECORD_NULL`         | `RECORD_NULL`         | warning             | A json column holds nulls, omitted.                                   |
| `E_GML_NESTED_ARRAY`        | `NESTED_ARRAY`        | error (save throws) | An array inside an array; export() throws.                            |
| `W_GML_JSON_ARRAY`          | `JSON_ARRAY`          | warning             | A json row that is an array, written as repeated keys.                |
| `E_GML_INVALID_KEY`         | `INVALID_KEY`         | error (save throws) | A column name or record key outside the GML key grammar.              |
| `E_GML_RESERVED_KEY`        | `RESERVED_KEY`        | error (save throws) | A column named like a structural key.                                 |
| `W_GML_KEY_MANGLED`         | `KEY_MANGLED`         | warning             | A key rewritten under sanitizeKeys "mangle".                          |
| `W_GML_POSITION_COMPONENTS` | `POSITION_COMPONENTS` | warning             | A position column with more than three components.                    |
| `W_GML_GRAPHICS_OVERRIDDEN` | `GRAPHICS_OVERRIDDEN` | warning             | A graphics record whose x / y / z the position column overrides.      |
| `E_GML_GRAPHICS_CONFLICT`   | `GRAPHICS_CONFLICT`   | error (save throws) | A graphics record that cannot hold the position.                      |

<!-- generated:end -->
