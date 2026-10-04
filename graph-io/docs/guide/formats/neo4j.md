# Neo4j CSV

These are the CSV files the [`neo4j-admin database import`](https://neo4j.com/docs/operations-manual/current/tutorial/neo4j-admin-import/)
command reads: node files with `:ID` and `:LABEL` columns, and relationship files with
`:START_ID`, `:END_ID` and `:TYPE`. Their headers carry property types (`born:int`).

## At a glance

<!-- generated:begin glance:neo4j -->

|                         |                                         |
| ----------------------- | --------------------------------------- |
| Import from             | `@graphty/graph-io/neo4j`               |
| Format name             | `neo4j`                                 |
| Extensions              | `.csv`, `.tsv`                          |
| MIME types              | `text/csv`, `text/tab-separated-values` |
| Reads                   | yes                                     |
| Writes                  | yes                                     |
| Several graphs per file | no                                      |
| Lists its graphs        | no                                      |

What a saved file can hold (the [capabilities](./index.md#what-the-capabilities-mean) explain each row):

| Capability                                      | Value                       |
| ----------------------------------------------- | --------------------------- |
| [`mixedDirection`](./index.md#mixeddirection)   | no                          |
| [`multiEdges`](./index.md#multiedges)           | yes                         |
| [`selfLoops`](./index.md#selfloops)             | yes                         |
| [`edgeIds`](./index.md#edgeids)                 | none                        |
| [`idCharset`](./index.md#idcharset)             | any                         |
| [`dtypes`](./index.md#dtypes)                   | f32, f64, i32, bool, string |
| [`components`](./index.md#components)           | no                          |
| [`lists`](./index.md#lists)                     | yes                         |
| [`json`](./index.md#json)                       | no                          |
| [`defaults`](./index.md#defaults)               | no                          |
| [`options`](./index.md#options)                 | no                          |
| [`hierarchy`](./index.md#hierarchy)             | no                          |
| [`temporal`](./index.md#temporal)               | none                        |
| [`graphAttributes`](./index.md#graphattributes) | no                          |
| [`positions`](./index.md#positions)             | no                          |
| [`viz`](./index.md#viz)                         | no                          |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/neo4j -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToBytes, importGraph } from "@graphty/graph-io";

// Node files first, then relationship files, as neo4j-admin import takes them
const { snapshot, report } = await importGraph(await readFile("movies-nodes.csv"), {
    format: "neo4j",
    relationships: await readFile("movies-rels.csv"),
});
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} relationships, ${report.warningCount} warnings`);
console.log(`node columns: ${snapshot.nodes.names().join(", ")}`);

await writeFile("movies-nodes-out.csv", await exportGraphToBytes(snapshot, "neo4j", { part: "nodes" }));
await writeFile("movies-rels-out.csv", await exportGraphToBytes(snapshot, "neo4j", { part: "relationships" }));
```

<!-- generated:end -->

<!-- generated:begin output:formats/neo4j -->

```text
7 nodes, 6 relationships, 0 warnings
node columns: labels, idSpace, originalId, movieId, title, released, personId, name, born
```

<!-- generated:end -->

Pass the node files as the input (or with the `nodes` option) and the relationship files with
the `relationships` option; each option takes one input or an array. When saving, `part` writes the
node sections, the relationship sections, or both into one file (the default).

## How graph-io reads it

- A header with `:ID`, `:START_ID` or `:END_ID` is recognized as Neo4j even in a `.csv` file, so
  you rarely need `format: "neo4j"`. Pass it when the input has no header graph-io can see, such as
  a relationships-only string.
- One file can hold several sections, each starting with its own header row.
- Property columns get the type their header declares: `int` an integer column, `long` and
  `double` 64-bit floats, `float` a 32-bit float, `boolean` booleans, `string` text, date and time
  types milliseconds (with the original text kept in a `<name>.text` column when it is not in
  canonical form), `point` JSON, and `type[]` a list. A column without a type is text.
- `:LABEL` becomes the `labels` list column and `:TYPE` the edge column `type`.
- An id space (`movieId:ID(Movie)`) keeps the same id in two spaces apart: a node of a space is
  stored under the id `Movie:m1`, with its id text in the `originalId` column and its space in
  `idSpace`. `:START_ID(Movie)` and `:END_ID(Movie)` look ids up in their space.
- A `weight` property is the edge weight.
- Every relationship is directed, as in Neo4j. Pass `onMixedDirection: "undirected"` to read the
  file as an undirected graph.
- An unquoted empty cell means "no value"; a quoted empty cell is an empty string.
- `:IGNORE` columns are skipped, and the report's `lossy` list says how many.

## What a saved file keeps and loses

What does not survive:

- Direction. Every relationship is directed, so an undirected graph is written as directed
  relationships (`W_NEO4J_UNDIRECTED_AS_DIRECTED`).
- Edge ids, nesting, time columns other than Neo4j's own date and time types, and graph
  attributes.
- JSON values other than points, and dictionary columns, which read back as text.
- A position or visual column is written as a plain property.
- A list item containing the array delimiter (`;` by default; `arrayDelimiter` changes it).
- A text id that looks like a number reads back as a number (`W_ID_TEXT_TYPE`).

The id spaces, labels, types and declared property types a Neo4j import read are written back,
so a file read from Neo4j CSV saves as the same file.

<!-- generated:begin reference:neo4j -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option           | Type                                                                                                                                                                                                  | Default  | Meaning                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodes`          | `string \| Uint8Array \| ReadableStream<Uint8Array> \| AsyncIterable<string \| Uint8Array> \| readonly (string \| Uint8Array \| ReadableStream<Uint8Array> \| AsyncIterable<string \| Uint8Array>)[]` |          | More node files, each a string, bytes or a stream with its own header row; read after the main input.                                                          |
| `relationships`  | `string \| Uint8Array \| ReadableStream<Uint8Array> \| AsyncIterable<string \| Uint8Array> \| readonly (string \| Uint8Array \| ReadableStream<Uint8Array> \| AsyncIterable<string \| Uint8Array>)[]` |          | Relationship files, each a string, bytes or a stream with its own header row; read after the node files.                                                       |
| `delimiter`      | `string`                                                                                                                                                                                              | detected | The field delimiter, one character (neo4j-admin's `--delimiter`). The default is to detect "," or a tab from the first rows, so a `.tsv` file needs no option. |
| `arrayDelimiter` | `";" \| "," \| "\|"`                                                                                                                                                                                  | `";"`    | The delimiter inside list values and `:LABEL` cells (neo4j-admin's `--array-delimiter`).                                                                       |
| `quote`          | `string`                                                                                                                                                                                              | `'"'`    | The quote character, one character (neo4j-admin's `--quote`).                                                                                                  |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option           | Type                                  | Default    | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `part`           | `"nodes" \| "all" \| "relationships"` | `"all"`    | Which tables to write: "all" (the node sections, then the relationship sections), "nodes" or "relationships".                                                                                                                                                                                                                                                                                                                   |
| `delimiter`      | `string`                              | `","`      | The field delimiter, one character.                                                                                                                                                                                                                                                                                                                                                                                             |
| `arrayDelimiter` | `";" \| "," \| "\|"`                  | `";"`      | The delimiter inside list values and `:LABEL` cells.                                                                                                                                                                                                                                                                                                                                                                            |
| `quote`          | `string`                              | `'"'`      | The quote character, one character. Cells that hold the delimiter, the quote character or a line break are quoted with it. Pass the same value as the `quote` import option to read the file back.                                                                                                                                                                                                                              |
| `weightColumn`   | `null \| string`                      | `"weight"` | The relationship property that holds the edge weights, written as `<name>:double`; null writes no weights (checkExport() then returns `W_WEIGHTS_DROPPED`). graph-io reads the "weight" property back as the weight; for any other name, pass the same name as the `weightFrom` import option to read the weights back (`weightColumn: "strength"` with `weightFrom: "strength"`), or they come back as a plain edge attribute. |
| `idColumn`       | `null \| string`                      | `null`     | The property name of the `:ID` column (`<name>:ID`) for nodes that have no id property of their own; null writes a bare `:ID`.                                                                                                                                                                                                                                                                                                  |

## Import issue codes

The codes this format's import report can hold, also exported as `NEO4J_ISSUE` from `@graphty/graph-io/neo4j`.

| Code                            | Key                     | Severity | Meaning                                                                                                                                                                                               |
| ------------------------------- | ----------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_INVALID_UTF8`                | `INVALID_UTF8`          | error    | The input is not valid UTF-8. The import stops.                                                                                                                                                       |
| `E_INVALID_ENCODING`            | `INVALID_ENCODING`      | error    | Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the `encoding` option). The import stops.                                                   |
| `W_ENCODING_FALLBACK`           | `ENCODING_FALLBACK`     | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                                                                                                                           |
| `W_UNKNOWN_ENCODING`            | `UNKNOWN_ENCODING`      | warning  | A declared encoding the platform cannot decode was ignored.                                                                                                                                           |
| `E_CSV_UNCLOSED_QUOTE`          | `CSV_UNCLOSED_QUOTE`    | error    | A quoted field is never closed. The import stops.                                                                                                                                                     |
| `E_CSV_QUOTE`                   | `CSV_QUOTE`             | error    | There is text after a closing quote, such as `"a"b`. Inside a quoted field, write a quote as two quotes. The import stops.                                                                            |
| `E_NEO4J_HEADER`                | `HEADER`                | error    | The file has no header, or a header neo4j-admin would refuse. The import stops.                                                                                                                       |
| `E_NEO4J_COLUMN_COUNT`          | `COLUMN_COUNT`          | error    | A row with a different field count than the header.                                                                                                                                                   |
| `E_MISSING_ID`                  | `MISSING_ID`            | error    | A node row without an id.                                                                                                                                                                             |
| `E_MISSING_ENDPOINT`            | `MISSING_ENDPOINT`      | error    | A relationship row without a start or end id.                                                                                                                                                         |
| `W_DUPLICATE_NODE`              | `DUPLICATE_NODE`        | warning  | A node id repeated in one id space (last write wins).                                                                                                                                                 |
| `E_NEO4J_ID_SPACE_COLLISION`    | `ID_SPACE_COLLISION`    | error    | A spaced node id `Space:id` that equals the text of an id declared without a space.                                                                                                                   |
| `E_NEO4J_ENDPOINT_SPACE`        | `ENDPOINT_SPACE`        | error    | A spaced relationship endpoint `Space:id` that names a node declared without a space; the row is skipped.                                                                                             |
| `W_ID_MERGED`                   | `ID_MERGED`             | warning  | Two different id texts became the same number because `ids` is "number", so their nodes were merged.                                                                                                  |
| `W_NEO4J_HEADER_OPTION_IGNORED` | `HEADER_OPTION_IGNORED` | warning  | A header brace option the importer does not apply.                                                                                                                                                    |
| `W_UNKNOWN_ATTR_TYPE`           | `UNKNOWN_ATTR_TYPE`     | warning  | A declared type the format does not define (kept as string).                                                                                                                                          |
| `W_PRECISION`                   | `PRECISION`             | warning  | An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.                                                                                             |
| `W_COLUMN_RENAMED`              | `COLUMN_RENAMED`        | warning  | An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a repeated column header.                                                                      |
| `W_ROLE_TAKEN`                  | `ROLE_TAKEN`            | warning  | You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.                                                                   |
| `W_OPTION_IGNORED`              | `OPTION_IGNORED`        | warning  | You set an option this format does not use; it had no effect. The message names the option.                                                                                                           |
| `W_SINK_OPTION`                 | `SINK_OPTION`           | warning  | You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies. |
| `W_NEO4J_MISSING_TYPE`          | `MISSING_TYPE`          | warning  | A relationship with an empty :TYPE cell (neo4j-admin requires one); kept without a type.                                                                                                              |
| `W_NEO4J_SECTION_KIND`          | `SECTION_KIND`          | warning  | A file under the nodes option holds a relationship header, or the reverse; read by its header.                                                                                                        |
| `W_DANGLING_REFERENCE`          | `DANGLING_REFERENCE`    | warning  | Relationship endpoints no node row declares became nodes (neo4j-admin refuses them).                                                                                                                  |

Like every format, it can also record the codes for unreadable input: [`E_EMPTY_INPUT`](../codes.md#E_EMPTY_INPUT), [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED).

## Loss codes

The codes `checkExport(snapshot, "neo4j", options)` can return before a save, also exported as `NEO4J_LOSS` from `@graphty/graph-io/neo4j`. An `E_` code means the save throws unless you change the graph or the options. A save can also return the [shared loss codes](../codes.md#shared-loss-codes) that any format can.

| Code                             | Key                      | Severity            | Meaning                                                                                                                                                    |
| -------------------------------- | ------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `W_NEO4J_IGNORED_COLUMNS`        | `IGNORED_COLUMNS`        | warning             | `:IGNORE` columns skipped on import.                                                                                                                       |
| `W_NEO4J_UNDIRECTED_AS_DIRECTED` | `UNDIRECTED_AS_DIRECTED` | warning             | Neo4j relationships are always directed, so the edges of an undirected graph, and the undirected edges of a mixed graph, read back as directed.            |
| `W_MUTUAL_EXPANDED`              | `MUTUAL_EXPANDED`        | warning             | A mutual pair written as two directed relationships without its mark.                                                                                      |
| `W_ROLE_DROPPED`                 | `ROLE_DROPPED`           | warning             | An attribute with a role the format has no place for is written as a plain attribute; the role is lost.                                                    |
| `W_WEIGHT_KEY_CLASH`             | `WEIGHT_KEY_CLASH`       | warning             | An attribute named `weight` without the weight role reads back as the edge weight, because GEXF reads weights from `weight` by default.                    |
| `W_ID_TEXT_TYPE`                 | `ID_TEXT_TYPE`           | warning             | A node id that reads back as a different type, such as the text "7" as the number 7. Read the file with `ids: "string"` or `ids: "keep"` to keep the type. |
| `E_ID_TEXT_COLLISION`            | `ID_TEXT_COLLISION`      | error (save throws) | Two node ids would be written as the same text (the number 5 and the text "5"); the save fails with `E_INVALID_ID`.                                        |
| `E_NEO4J_WEIGHT_COLUMN_TAKEN`    | `WEIGHT_COLUMN_TAKEN`    | error (save throws) | The `weightColumn` name is already an edge attribute; the save fails.                                                                                      |
| `E_NEO4J_ID_COLUMN_TAKEN`        | `ID_COLUMN_TAKEN`        | error (save throws) | The `idColumn` name is already a node attribute; the save fails.                                                                                           |
| `W_NEO4J_MULTIPLE_ID_PROPERTIES` | `MULTIPLE_ID_PROPERTIES` | warning             | Several stored-id properties; one becomes the `:ID` column.                                                                                                |
| `W_NEO4J_DECLARED_TYPE_CHANGED`  | `DECLARED_TYPE_CHANGED`  | warning             | An integer-typed column with non-integral values written as double.                                                                                        |
| `W_NEO4J_ARRAY_DELIMITER`        | `ARRAY_DELIMITER`        | warning             | A list item containing the array delimiter, which Neo4j cannot escape.                                                                                     |

<!-- generated:end -->
