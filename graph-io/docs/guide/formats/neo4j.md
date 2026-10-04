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

What a saved file can hold:

| Capability        | Value                       | Meaning                                                                                                                            |
| ----------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `mixedDirection`  | no                          | Directed and undirected edges in one file.                                                                                         |
| `multiEdges`      | yes                         | Parallel edges.                                                                                                                    |
| `selfLoops`       | yes                         | Self-loops.                                                                                                                        |
| `edgeIds`         | none                        | Edge ids: "required" (generated when the graph has none), "optional", or "none" (not stored).                                      |
| `idCharset`       | any                         | Which node ids are written unchanged: "any", "nmtoken" (XML name tokens), "integer", or "dense-1-based" (1 to N).                  |
| `dtypes`          | f32, f64, i32, bool, string | The column types the format keeps exactly.                                                                                         |
| `components`      | no                          | Columns with several numbers per row, such as a position.                                                                          |
| `lists`           | yes                         | List columns.                                                                                                                      |
| `json`            | no                          | Nested JSON values.                                                                                                                |
| `defaults`        | no                          | Columns' declared default values.                                                                                                  |
| `options`         | no                          | Declared lists of allowed values (GEXF options).                                                                                   |
| `hierarchy`       | no                          | Nesting: nodes inside other nodes (parent columns).                                                                                |
| `temporal`        | none                        | Time: "none", "intervals", "spells" (several intervals per element), or "dynamic-values" (attribute values that change over time). |
| `graphAttributes` | no                          | Graph-level attributes.                                                                                                            |
| `positions`       | no                          | Node positions.                                                                                                                    |
| `viz`             | no                          | Visual columns: color, size, shape and thickness.                                                                                  |

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

| Option           | Type                                    | Default | Meaning                                                                                                                                                                |
| ---------------- | --------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodes`          | `ImportInput \| readonly ImportInput[]` |         | Further node files, each with its own header row(s); read after the primary input.                                                                                     |
| `relationships`  | `ImportInput \| readonly ImportInput[]` |         | Relationship files, each with its own header row(s); read after the node files.                                                                                        |
| `delimiter`      | `string`                                |         | The field delimiter (neo4j-admin `--delimiter`); one character. When absent it is sniffed from the first rows between "," and a tab, so a `.tsv` file needs no option. |
| `arrayDelimiter` | `";" \| "," \| "\|"`                    | `";"`   | The array delimiter of list values and `:LABEL` cells (neo4j-admin `--array-delimiter`); ";" by default.                                                               |
| `quote`          | `string`                                |         | The quote character (neo4j-admin `--quote`); one character; a double quote by default.                                                                                 |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option           | Type                                  | Default    | Meaning                                                                                                                                                |
| ---------------- | ------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `part`           | `"nodes" \| "all" \| "relationships"` |            | Which tables to write: both (node sections first; default), the node sections or the relationship sections.                                            |
| `delimiter`      | `string`                              | `","`      | The field delimiter; one character; "," by default.                                                                                                    |
| `arrayDelimiter` | `";" \| "," \| "\|"`                  | `";"`      | The array delimiter of list values and `:LABEL` cells; ";" by default.                                                                                 |
| `quote`          | `string`                              |            | The quote character; one character; a double quote by default.                                                                                         |
| `weightColumn`   | `string`                              | `"weight"` | The property that receives explicit edge weights (`<name>:double`); "weight" by default (the importer's `weightFrom` default); null writes no weights. |
| `idColumn`       | `string`                              | `null`     | The property name of the `:ID` column for nodes that have no stored-id column of their own (`<name>:ID`); null (default) writes a bare `:ID`.          |

## Import issue codes

The codes this format's import report can hold, also exported as `NEO4J_ISSUE` from `@graphty/graph-io/neo4j`.

| Code                            | Key                     | Severity | Meaning                                                                                                   |
| ------------------------------- | ----------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `E_EMPTY_INPUT`                 | `EMPTY_INPUT`           | error    | The input is empty or holds only whitespace (fatal).                                                      |
| `E_TOO_LARGE`                   | `TOO_LARGE`             | error    | The input is longer than one JavaScript string, or holds a line that is (fatal).                          |
| `W_ENCODING_CONFLICT`           | `ENCODING_CONFLICT`     | warning  | A byte order mark, the encoding option and the declared encoding disagree.                                |
| `W_CONTROL_CHARACTER`           | `CONTROL_CHARACTER`     | warning  | A control character or a stray U+FEFF in the text, or an ignored trailing Ctrl-Z.                         |
| `E_FOREIGN_FORMAT`              | `FOREIGN_FORMAT`        | error    | The input is an HTML page, a PDF, compressed or archived data or an image (fatal).                        |
| `W_ISSUES_SUPPRESSED`           | `ISSUES_SUPPRESSED`     | warning  | Warnings of one code beyond the number a report keeps, counted in one warning.                            |
| `E_INVALID_UTF8`                | `INVALID_UTF8`          | error    | The input holds invalid UTF-8 (fatal).                                                                    |
| `E_INVALID_ENCODING`            | `INVALID_ENCODING`      | error    | Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal).                  |
| `W_ENCODING_FALLBACK`           | `ENCODING_FALLBACK`     | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                               |
| `W_UNKNOWN_ENCODING`            | `UNKNOWN_ENCODING`      | warning  | A declared encoding the platform cannot decode was ignored.                                               |
| `E_CSV_UNCLOSED_QUOTE`          | `CSV_UNCLOSED_QUOTE`    | error    | An unterminated quoted field (fatal).                                                                     |
| `E_CSV_QUOTE`                   | `CSV_QUOTE`             | error    | Text after a closing quote (fatal).                                                                       |
| `E_NEO4J_HEADER`                | `HEADER`                | error    | No header or a malformed header (fatal).                                                                  |
| `E_NEO4J_COLUMN_COUNT`          | `COLUMN_COUNT`          | error    | A row with a different field count than the header.                                                       |
| `E_MISSING_ID`                  | `MISSING_ID`            | error    | A node row without an id.                                                                                 |
| `E_MISSING_ENDPOINT`            | `MISSING_ENDPOINT`      | error    | A relationship row without a start or end id.                                                             |
| `W_DUPLICATE_NODE`              | `DUPLICATE_NODE`        | warning  | A node id repeated in one id space (last write wins).                                                     |
| `E_NEO4J_ID_SPACE_COLLISION`    | `ID_SPACE_COLLISION`    | error    | A spaced node id `Space:id` that equals the text of an id declared without a space.                       |
| `E_NEO4J_ENDPOINT_SPACE`        | `ENDPOINT_SPACE`        | error    | A spaced relationship endpoint `Space:id` that names a node declared without a space; the row is skipped. |
| `W_ID_MERGED`                   | `ID_MERGED`             | warning  | Two id texts merged into one number under ids "number".                                                   |
| `W_NEO4J_HEADER_OPTION_IGNORED` | `HEADER_OPTION_IGNORED` | warning  | A header brace option the importer does not apply.                                                        |
| `W_UNKNOWN_ATTR_TYPE`           | `UNKNOWN_ATTR_TYPE`     | warning  | A declared type the format does not define (kept as string).                                              |
| `W_PRECISION`                   | `PRECISION`             | warning  | A long value beyond 2^53 rounded.                                                                         |
| `W_COLUMN_RENAMED`              | `COLUMN_RENAMED`        | warning  | A column renamed `<name>#<id>` because the name was taken.                                                |
| `W_ROLE_TAKEN`                  | `ROLE_TAKEN`            | warning  | A role the caller's sink already holds.                                                                   |
| `W_OPTION_IGNORED`              | `OPTION_IGNORED`        | warning  | A common option the importer has no use for (nodeIdFrom, defaultDirected, ...).                           |
| `W_SINK_OPTION`                 | `SINK_OPTION`           | warning  | A builder-policy option the sink does not honor.                                                          |
| `W_NEO4J_MISSING_TYPE`          | `MISSING_TYPE`          | warning  | A relationship with an empty :TYPE cell (neo4j-admin requires one); kept without a type.                  |
| `W_NEO4J_SECTION_KIND`          | `SECTION_KIND`          | warning  | A file under the nodes option holds a relationship header, or the reverse; read by its header.            |
| `W_DANGLING_REFERENCE`          | `DANGLING_REFERENCE`    | warning  | Relationship endpoints no node row declares became nodes (neo4j-admin refuses them).                      |

## Loss codes

The codes `check()` can return before a save, also exported as `NEO4J_LOSS` from `@graphty/graph-io/neo4j`. An `E_` code means the save throws unless you change the graph or the options.

| Code                             | Key                      | Severity            | Meaning                                                                                                       |
| -------------------------------- | ------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `W_NEO4J_IGNORED_COLUMNS`        | `IGNORED_COLUMNS`        | warning             | `:IGNORE` columns skipped on import.                                                                          |
| `W_NEO4J_UNDIRECTED_AS_DIRECTED` | `UNDIRECTED_AS_DIRECTED` | warning             | Undirected edges (an undirected snapshot, the folded pairs of a mixed one) written as directed relationships. |
| `W_MUTUAL_EXPANDED`              | `MUTUAL_EXPANDED`        | warning             | A mutual pair written as two directed relationships without its mark.                                         |
| `W_ROLE_DROPPED`                 | `ROLE_DROPPED`           | warning             | A role column Neo4j has no slot for (label, ...) written as a plain property.                                 |
| `W_WEIGHT_KEY_CLASH`             | `WEIGHT_KEY_CLASH`       | warning             | A plain `weight` edge column reads back as THE weight (the importer's weightFrom default).                    |
| `W_ID_TEXT_TYPE`                 | `ID_TEXT_TYPE`           | warning             | A node id whose text re-imports as another type under the canonical rule.                                     |
| `E_ID_TEXT_COLLISION`            | `ID_TEXT_COLLISION`      | error (save throws) | A number and a string id with the same text; export() throws.                                                 |
| `E_NEO4J_WEIGHT_COLUMN_TAKEN`    | `WEIGHT_COLUMN_TAKEN`    | error (save throws) | The weight column name is taken by an edge column; export() throws.                                           |
| `E_NEO4J_ID_COLUMN_TAKEN`        | `ID_COLUMN_TAKEN`        | error (save throws) | The id column name is taken by a node column; export() throws.                                                |
| `W_NEO4J_MULTIPLE_ID_PROPERTIES` | `MULTIPLE_ID_PROPERTIES` | warning             | Several stored-id properties; one becomes the `:ID` column.                                                   |
| `W_NEO4J_DECLARED_TYPE_CHANGED`  | `DECLARED_TYPE_CHANGED`  | warning             | An integer-typed column with non-integral values written as double.                                           |
| `W_NEO4J_ARRAY_DELIMITER`        | `ARRAY_DELIMITER`        | warning             | A list item containing the array delimiter, which Neo4j cannot escape.                                        |

<!-- generated:end -->
