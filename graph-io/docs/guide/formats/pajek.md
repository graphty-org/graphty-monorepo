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

What a saved file can hold:

| Capability        | Value                  | Meaning                                                                                                                            |
| ----------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `mixedDirection`  | yes                    | Directed and undirected edges in one file.                                                                                         |
| `multiEdges`      | yes                    | Parallel edges.                                                                                                                    |
| `selfLoops`       | yes                    | Self-loops.                                                                                                                        |
| `edgeIds`         | none                   | Edge ids: "required" (generated when the graph has none), "optional", or "none" (not stored).                                      |
| `idCharset`       | dense-1-based          | Which node ids are written unchanged: "any", "nmtoken" (XML name tokens), "integer", or "dense-1-based" (1 to N).                  |
| `dtypes`          | f64, i32, bool, string | The column types the format keeps exactly.                                                                                         |
| `components`      | no                     | Columns with several numbers per row, such as a position.                                                                          |
| `lists`           | no                     | List columns.                                                                                                                      |
| `json`            | no                     | Nested JSON values.                                                                                                                |
| `defaults`        | no                     | Columns' declared default values.                                                                                                  |
| `options`         | no                     | Declared lists of allowed values (GEXF options).                                                                                   |
| `hierarchy`       | no                     | Nesting: nodes inside other nodes (parent columns).                                                                                |
| `temporal`        | spells                 | Time: "none", "intervals", "spells" (several intervals per element), or "dynamic-values" (attribute values that change over time). |
| `graphAttributes` | no                     | Graph-level attributes.                                                                                                            |
| `positions`       | yes                    | Node positions.                                                                                                                    |
| `viz`             | no                     | Visual columns: color, size, shape and thickness.                                                                                  |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/pajek -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

// Pajek numbers vertices 1..N; with sanitizeIds: "mangle" the file also keeps the original ids ("Myriel", ...)
const { snapshot } = await importGraph(await readFile("miserables.json"), { filename: "miserables.json" });
const options = { sanitizeIds: "mangle" } as const;
for (const note of checkExport(snapshot, "pajek", options)) {
    console.log(`${note.code}: ${note.message}`);
}
const bytes = await exportGraphToBytes(snapshot, "pajek", options);
await writeFile("miserables.net", bytes);

// Reading the file back restores the original ids
const back = await importGraph(bytes, { filename: "miserables.net" });
console.log(`first id after the round trip: ${String(back.snapshot.ids.idOf(0))}`);
```

<!-- generated:end -->

<!-- generated:begin output:formats/pajek -->

```text
W_ID_RENUMBERED: 77 node id(s) are not their 1-based index; nodes are numbered 1..N, the originals kept in the exporter's originalId attribute (restored by restoreMangledIds) and as labels of the nodes without a label value
W_PAJEK_LABEL_GAINED: 77 vertex line(s) carry coordinates, a shape or parameters and need a label; the id text is written there and reads back as a label
first id after the round trip: Myriel
```

<!-- generated:end -->

Pajek numbers vertices 1 to N, so the string ids of this graph cannot be written as they are.
With `sanitizeIds: "mangle"` each vertex also gets a `graphty_originalId` parameter, and reading
the file back gives the original ids.

## How graph-io reads it

- The file is streamed line by line.
- `*Vertices N` declares vertices 1 to N. A file numbered from 0, as some scripts write, is
  detected from its first vertex line (`firstVertex` sets this yourself). A vertex line's label,
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

<!-- generated:begin reference:pajek -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option        | Type               | Default  | Meaning                                                                                                                                                                  |
| ------------- | ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `firstVertex` | `0 \| "auto" \| 1` | `"auto"` | The number of the first vertex: 1 (Pajek's rule), 0 (files written by zero-based scripts), or "auto" (default): 0 when the first vertex line is numbered 0, 1 otherwise. |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option          | Type      | Default | Meaning                                                                                                                                                                  |
| --------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `networkHeader` | `boolean` | `false` | Write a `*Network <name>` header line (the .paj project-file convention) when the snapshot's meta.name is set; default false, since plain .net readers do not expect it. |

## Import issue codes

The codes this format's import report can hold, also exported as `PAJEK_ISSUE` from `@graphty/graph-io/pajek`.

| Code                             | Key                      | Severity | Meaning                                                                                                                                              |
| -------------------------------- | ------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_EMPTY_INPUT`                  | `EMPTY_INPUT`            | error    | The input is empty or holds only whitespace (fatal).                                                                                                 |
| `E_TOO_LARGE`                    | `TOO_LARGE`              | error    | The input is longer than one JavaScript string, or holds a line that is (fatal).                                                                     |
| `W_ENCODING_CONFLICT`            | `ENCODING_CONFLICT`      | warning  | A byte order mark, the encoding option and the declared encoding disagree.                                                                           |
| `W_CONTROL_CHARACTER`            | `CONTROL_CHARACTER`      | warning  | A control character or a stray U+FEFF in the text, or an ignored trailing Ctrl-Z.                                                                    |
| `E_FOREIGN_FORMAT`               | `FOREIGN_FORMAT`         | error    | The input is an HTML page, a PDF, compressed or archived data or an image (fatal).                                                                   |
| `W_ISSUES_SUPPRESSED`            | `ISSUES_SUPPRESSED`      | warning  | Warnings of one code beyond the number a report keeps, counted in one warning.                                                                       |
| `E_INVALID_UTF8`                 | `INVALID_UTF8`           | error    | The input holds invalid UTF-8 (fatal).                                                                                                               |
| `E_INVALID_ENCODING`             | `INVALID_ENCODING`       | error    | Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal).                                                             |
| `W_ENCODING_FALLBACK`            | `ENCODING_FALLBACK`      | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                                                                          |
| `W_UNKNOWN_ENCODING`             | `UNKNOWN_ENCODING`       | warning  | A declared encoding the platform cannot decode was ignored.                                                                                          |
| `E_PAJEK_NO_VERTICES`            | `NO_VERTICES`            | error    | Fatal: no `*Vertices` section (an empty file, or not a Pajek network).                                                                               |
| `E_PAJEK_VERTICES_COUNT`         | `VERTICES_COUNT`         | error    | Fatal: `*Vertices` without a vertex count, one the sink cannot hold, or a first-mode count outside 0..N.                                             |
| `W_MULTIPLE_GRAPHS`              | `MULTIPLE_GRAPHS`        | warning  | A project file holds several networks; import() reads the first, importAll() reads every one.                                                        |
| `E_PAJEK_OUTSIDE_SECTION`        | `OUTSIDE_SECTION`        | error    | A data line before the first section header.                                                                                                         |
| `E_SYNTAX`                       | `SYNTAX`                 | error    | A section header the importer cannot parse.                                                                                                          |
| `E_PAJEK_UNTERMINATED_QUOTE`     | `UNTERMINATED_QUOTE`     | error    | A double quote not closed before the end of the line.                                                                                                |
| `E_PAJEK_VERTEX_LINE`            | `VERTEX_LINE`            | error    | A vertex line the grammar does not accept.                                                                                                           |
| `E_PAJEK_VERTEX_RANGE`           | `VERTEX_RANGE`           | error    | A vertex number outside the declared range.                                                                                                          |
| `W_PAJEK_VERTEX_COUNT`           | `VERTEX_COUNT`           | warning  | Fewer vertex lines than `*Vertices` declares, which the Pajek manual allows (vertices without a line have no label).                                 |
| `W_DUPLICATE_NODE`               | `DUPLICATE_NODE`         | warning  | A second line for the same vertex; the later values overwrite.                                                                                       |
| `E_PAJEK_LINE`                   | `LINE`                   | error    | A line (arc, edge, list, matrix row, partition or vector value) the grammar does not accept.                                                         |
| `E_UNKNOWN_NODE`                 | `UNKNOWN_NODE`           | error    | A line endpoint outside the declared vertex range (the core's code, forwarded).                                                                      |
| `E_PAJEK_INTERVAL`               | `INTERVAL`               | error    | A malformed time interval token.                                                                                                                     |
| `E_PAJEK_MATRIX_ROWS`            | `MATRIX_ROWS`            | error    | A `*Matrix` section with the wrong number of rows (N, or N1 in a two-mode network).                                                                  |
| `W_PAJEK_MATRIX_EXTRA`           | `MATRIX_EXTRA`           | warning  | `*Matrix` rows longer than the column count; the extra values are ignored.                                                                           |
| `E_PAJEK_OBJECT_COUNT`           | `OBJECT_COUNT`           | error    | A `*Partition` or `*Vector` whose value count differs from the network's vertex count; values beyond it are dropped, vertices without one are unset. |
| `W_PAJEK_UNSUPPORTED_SECTION`    | `UNSUPPORTED_SECTION`    | warning  | A project-file section (`*Events`, `*Permutation`, ...) the importer does not read; its lines are skipped.                                           |
| `W_PAJEK_HEADER_EXTRA`           | `HEADER_EXTRA`           | warning  | Tokens after a section header the grammar does not account for.                                                                                      |
| `W_PAJEK_NO_LINES`               | `NO_LINES`               | warning  | The file declares vertices but no line section.                                                                                                      |
| `W_PAJEK_ZERO_BASED`             | `ZERO_BASED`             | warning  | Vertex numbering starts at 0 rather than 1.                                                                                                          |
| `W_PAJEK_COORD_DIMS`             | `COORD_DIMS`             | warning  | Vertex lines mix two and three coordinates.                                                                                                          |
| `W_PAJEK_LABEL_MERGED`           | `LABEL_MERGED`           | warning  | Two vertices share a label under nodeIdFrom "label" and became one node.                                                                             |
| `W_ID_MERGED`                    | `ID_MERGED`              | warning  | Two distinct label texts became one numeric id under ids "number".                                                                                   |
| `W_WIDENING_UNSUPPORTED`         | `WIDENING_UNSUPPORTED`   | warning  | A parameter column of `2.0`-style text kept at the value-inferred dtype (the sink cannot widen).                                                     |
| `W_COLUMN_RENAMED`               | `COLUMN_RENAMED`         | warning  | A structural column (label, position, shape, spells, relation) renamed `<name>#<id>` because the name was taken.                                     |
| `W_ROLE_TAKEN`                   | `ROLE_TAKEN`             | warning  | A structural column declared without its role because the sink already holds it.                                                                     |
| `W_PAJEK_ORIGINAL_ID_MERGED`     | `ORIGINAL_ID_MERGED`     | warning  | Two vertices carry the same `graphty_originalId` under restoreMangledIds and became one node.                                                        |
| `W_PAJEK_ORIGINAL_ID_UNRESTORED` | `ORIGINAL_ID_UNRESTORED` | warning  | A vertex line's `graphty_originalId` came after a later vertex's line had created it under its number.                                               |
| `W_OPTION_IGNORED`               | `OPTION_IGNORED`         | warning  | A common option the importer has no use for (weightFrom naming a parameter and restoreMangledIds are honored; long, hyperedges are not).             |
| `W_SINK_OPTION`                  | `SINK_OPTION`            | warning  | A builder-policy option the caller passed that the caller's sink does not use (the shared W_SINK_OPTION).                                            |
| `W_PAJEK_QUOTE_IN_TOKEN`         | `QUOTE_IN_TOKEN`         | warning  | A double quote inside a token (a CSV-style doubled quote, a quote mid-word): removed and the parts joined.                                           |
| `W_DUPLICATE_ATTRIBUTE`          | `DUPLICATE_ATTRIBUTE`    | warning  | The same parameter twice on one line; the later value stands.                                                                                        |
| `W_PAJEK_REFERENCE_RANGE`        | `REFERENCE_RANGE`        | warning  | A character reference beyond U+10FFFF in a label; kept as written.                                                                                   |
| `W_PAJEK_TWO_MODE_LINE`          | `TWO_MODE_LINE`          | warning  | A line of a two-mode network whose endpoints are both in one mode.                                                                                   |
| `W_PAJEK_NUMERIC_LABEL`          | `NUMERIC_LABEL`          | warning  | A bare non-integer number read as a vertex label before two coordinates (`1 0.1 0.2 0.3`); it may be an x y z line without a label.                  |
| `W_PAJEK_RELATION_RENAMED`       | `RELATION_RENAMED`       | warning  | A relation number given a second name by a later `*Arcs :k "name"` header.                                                                           |
| `W_PAJEK_NEGATIVE_LIST_ENTRY`    | `NEGATIVE_LIST_ENTRY`    | warning  | A negative vertex number in an adjacency list, read as its absolute value.                                                                           |
| `W_PRECISION`                    | `PRECISION`              | warning  | A coordinate the f32 position column cannot hold exactly (warned once).                                                                              |

## Loss codes

The codes `check()` can return before a save, also exported as `PAJEK_LOSS` from `@graphty/graph-io/pajek`. An `E_` code means the save throws unless you change the graph or the options.

| Code                         | Key                    | Severity            | Meaning                                                                                                                |
| ---------------------------- | ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `E_PAJEK_TEXT`               | `TEXT`                 | error (save throws) | A label or text value holds a double quote or a line break; export() will throw E_UNSUPPORTED.                         |
| `W_PAJEK_KEY_DROPPED`        | `KEY_DROPPED`          | warning             | A column whose name cannot be a parameter key (whitespace, a quote, numeric, a shape keyword); skipped.                |
| `W_PAJEK_LABEL_AS_TEXT`      | `LABEL_AS_TEXT`        | warning             | A label role column that is not text; its values are written as text and re-import as string.                          |
| `W_PAJEK_NONFINITE_AS_TEXT`  | `NONFINITE_AS_TEXT`    | warning             | A non-finite f64 value; written as Infinity / NaN text, which re-imports as string.                                    |
| `W_MUTUAL_AS_UNDIRECTED`     | `MUTUAL_AS_UNDIRECTED` | warning             | A mutual pair; written as one undirected edge, the mark lost.                                                          |
| `W_TEMPORAL_DROPPED`         | `TEMPORAL_DROPPED`     | warning             | A start / end / timestamp role column; Pajek intervals are written from the spells role only.                          |
| `W_PAJEK_POSITION_STRIDE`    | `POSITION_STRIDE`      | warning             | A position column with a stride other than 2 or 3.                                                                     |
| `W_PAJEK_FIRST_MODE_DROPPED` | `FIRST_MODE_DROPPED`   | warning             | meta.extra.pajek.firstMode is not a count within 0..N; the two-mode header is not written.                             |
| `W_ROLE_DROPPED`             | `ROLE_DROPPED`         | warning             | A role column Pajek has no slot for (kind, ...) written as a plain parameter; the role is lost.                        |
| `W_PAJEK_SHAPE_AS_PARAMETER` | `SHAPE_AS_PARAMETER`   | warning             | A `shape` column with a value outside the shape keywords is written as a parameter (a string on re-import).            |
| `W_PAJEK_LABEL_GAINED`       | `LABEL_GAINED`         | warning             | A vertex line with coordinates, a shape or parameters needs a label: the id text is written and reads back as a label. |
| `W_ROLE_ASSUMED`             | `ROLE_ASSUMED`         | warning             | A role-less node column named `label` reads back with the label role (its values become the vertex labels).            |
| `W_ID_TEXT_TYPE`             | `ID_TEXT_TYPE`         | warning             | Under sanitizeIds "mangle": an original id whose text reads back as the other type under ids "canonical".              |
| `W_TEXT_INFERRED`            | `TEXT_INFERRED`        | warning             | Parameter text that looks like a number or a boolean reads back as one (parameters are untyped).                       |

<!-- generated:end -->
