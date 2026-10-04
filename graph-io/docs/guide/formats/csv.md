# CSV and TSV

## At a glance

<!-- generated:begin glance:csv -->

|                         |                                                       |
| ----------------------- | ----------------------------------------------------- |
| Import from             | `@graphty/graph-io/csv`                               |
| Format name             | `csv`                                                 |
| Extensions              | `.csv`, `.tsv`, `.edges`, `.edgelist`                 |
| MIME types              | `text/csv`, `text/tab-separated-values`, `text/plain` |
| Reads                   | yes                                                   |
| Writes                  | yes                                                   |
| Several graphs per file | no                                                    |
| Lists its graphs        | no                                                    |

What a saved file can hold:

| Capability        | Value                        | Meaning                                                                         |
| ----------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| `mixedDirection`  | yes                          | Directed and undirected edges in one file.                                      |
| `multiEdges`      | yes                          | Parallel edges.                                                                 |
| `selfLoops`       | yes                          | Self-loops.                                                                     |
| `edgeIds`         | optional                     | Whether edge ids are required (generated when absent), optional or unsupported. |
| `idCharset`       | any                          | Which node ids can be written unchanged.                                        |
| `dtypes`          | bool, i32, f64, string, dict | The column dtypes the format keeps as declared.                                 |
| `components`      | no                           | Multi-component (stride) columns.                                               |
| `lists`           | no                           | List columns.                                                                   |
| `json`            | no                           | Nested json columns.                                                            |
| `defaults`        | no                           | Declared defaults.                                                              |
| `options`         | no                           | Declared enumerations (GEXF options).                                           |
| `hierarchy`       | no                           | Containment (parent / parents roles).                                           |
| `temporal`        | none                         | Temporal support level.                                                         |
| `graphAttributes` | no                           | Graph-level attributes.                                                         |
| `positions`       | no                           | The position role.                                                              |
| `viz`             | no                           | The visual roles (color, size, shape, thickness).                               |

<!-- generated:end -->

## Loading

## Saving

## How graph-io reads it

## What a saved file keeps and loses

<!-- generated:begin reference:csv -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option         | Type                                          | Default  | Meaning                                                                                                                                                                                                                                                                                                                                                                            |
| -------------- | --------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `delimiter`    | `string`                                      |          | The field delimiter; sniffed from the first rows when omitted (`,`, tab, `;`, `\|`, space).                                                                                                                                                                                                                                                                                        |
| `header`       | `boolean \| "auto"`                           | `"auto"` | Whether the first row is a header; "auto" (default) decides from its content.                                                                                                                                                                                                                                                                                                      |
| `table`        | `"adjacency" \| "auto" \| "nodes" \| "edges"` | `"auto"` | What the input is: an edge table, a node table, an adjacency table (`node,neighbour[:weight],...` per row, no header by default), or "auto" (default): an edge table when source and target columns resolve, a node table when only an id column does. An adjacency table is never guessed: nothing in its rows tells it from an edge list.                                        |
| `sourceColumn` | `CsvColumnRef`                                |          | The source column, by name or 0-based position; resolved from the header by default.                                                                                                                                                                                                                                                                                               |
| `targetColumn` | `CsvColumnRef`                                |          | The target column, by name or 0-based position; resolved from the header by default.                                                                                                                                                                                                                                                                                               |
| `typeColumn`   | `CsvColumnRef`                                |          | The per-row direction column (Directed / Undirected / Mutual); by default the exact `Type` column of a Gephi table (exact `Source` and `Target` headers); null reads no such column.                                                                                                                                                                                               |
| `idColumn`     | `CsvColumnRef`                                |          | The id column of a node table, by name or position; resolved from the header by default.                                                                                                                                                                                                                                                                                           |
| `nodes`        | `ImportInput`                                 |          | A node table read before the edges: its ids become nodes and its other columns node attributes.                                                                                                                                                                                                                                                                                    |
| `rowNumberIds` | `boolean`                                     | `false`  | A node table whose header has no id column gets its ids from the row numbers (0 for the first data row), coerced by `ids`, instead of failing with E_CSV_NO_ID_COLUMN. The node table is the `nodes` input when one is given (the edge table is then read as without this option), else the input itself; its first row is a header even under `header: "auto"`. False by default. |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option      | Type                                | Default   | Meaning                                                                                                                                                                        |
| ----------- | ----------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dialect`   | `"gephi" \| "generic"`              | `"gephi"` | The header spelling: "gephi" (default) writes `Source,Target,Type,...,Weight` with the per-row direction; "generic" writes `source,target,...,weight` and no direction column. |
| `table`     | `"adjacency" \| "nodes" \| "edges"` |           | Which table to write: the edge table (default), the node table, or an adjacency table (a node and its neighbours per row; read back with the importer's `table: "adjacency"`). |
| `delimiter` | `string`                            | `","`     | The field delimiter; "," by default.                                                                                                                                           |
| `newline`   | `"\n" \| "\r\n"`                    | `"\n"`    | The line terminator; "\n" by default.                                                                                                                                          |
| `header`    | `boolean`                           | `true`    | Whether to write the header row; true by default (an adjacency table never has one).                                                                                           |

## Import issue codes

The codes this format's import report can hold, also exported as `CSV_ISSUE` from `@graphty/graph-io/csv`.

| Code                        | Key                    | Severity | Meaning                                                                                                |
| --------------------------- | ---------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `E_EMPTY_INPUT`             | `EMPTY_INPUT`          | error    | The input is empty (fatal).                                                                            |
| `E_INVALID_UTF8`            | `INVALID_UTF8`         | error    | The input holds invalid UTF-8 (fatal).                                                                 |
| `E_INVALID_ENCODING`        | `INVALID_ENCODING`     | error    | Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal).               |
| `W_ENCODING_FALLBACK`       | `ENCODING_FALLBACK`    | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                            |
| `W_UNKNOWN_ENCODING`        | `UNKNOWN_ENCODING`     | warning  | A declared encoding the platform cannot decode was ignored.                                            |
| `E_CSV_NO_ENDPOINT_COLUMNS` | `NO_ENDPOINT_COLUMNS`  | error    | The header names neither endpoint columns nor an id column (fatal).                                    |
| `E_CSV_NO_ID_COLUMN`        | `NO_ID_COLUMN`         | error    | A node table without an id column (fatal).                                                             |
| `E_CSV_FIELD_COUNT`         | `FIELD_COUNT`          | error    | A row with a different field count than the header.                                                    |
| `E_MISSING_ENDPOINT`        | `MISSING_ENDPOINT`     | error    | An edge row with a blank source or target.                                                             |
| `E_MISSING_ID`              | `MISSING_ID`           | error    | A node row with a blank id.                                                                            |
| `E_CSV_BAD_TYPE`            | `BAD_TYPE`             | error    | A Type cell outside Directed / Undirected / Mutual.                                                    |
| `E_CSV_UNCLOSED_QUOTE`      | `UNCLOSED_QUOTE`       | error    | An unterminated quoted field (fatal).                                                                  |
| `E_CSV_QUOTE`               | `QUOTE`                | error    | Text after a closing quote (fatal).                                                                    |
| `W_CSV_NO_DATA_ROWS`        | `NO_DATA_ROWS`         | warning  | A header and no data rows.                                                                             |
| `W_DUPLICATE_NODE`          | `DUPLICATE_NODE`       | warning  | A node table row repeating an id.                                                                      |
| `E_DUPLICATE_EDGE_ID`       | `DUPLICATE_EDGE_ID`    | error    | An edge row repeating an edge id (skipped).                                                            |
| `W_ID_MERGED`               | `ID_MERGED`            | warning  | Two id cells merged into one number under ids "number".                                                |
| `W_CSV_COLUMN_MISSING`      | `COLUMN_MISSING`       | warning  | An explicitly named weight column the file does not have.                                              |
| `W_ROLE_TAKEN`              | `ROLE_TAKEN`           | warning  | A column whose role another column of the sink already holds.                                          |
| `W_COLUMN_RENAMED`          | `COLUMN_RENAMED`       | warning  | A column renamed `<name>#<position>` (a repeated header, or a name the sink holds with another shape). |
| `W_OPTION_IGNORED`          | `OPTION_IGNORED`       | warning  | A common option the importer has no use for was given.                                                 |
| `W_SINK_OPTION`             | `SINK_OPTION`          | warning  | A builder-policy option the sink does not honour.                                                      |
| `W_DIRECTION_REFUSED`       | `DIRECTION_REFUSED`    | warning  | The sink refused the file's direction.                                                                 |
| `W_DIRECTION_FORCED`        | `DIRECTION_FORCED`     | warning  | Edges forced to the policy's direction.                                                                |
| `E_MIXED_DIRECTION`         | `MIXED_DIRECTION`      | error    | A mixed file under onMixedDirection "error" (fatal).                                                   |
| `W_WIDENING_UNSUPPORTED`    | `WIDENING_UNSUPPORTED` | warning  | A text column the sink could not widen to the dtype its cells imply.                                   |

## Loss codes

The codes `check()` can return before a save, also exported as `CSV_LOSS` from `@graphty/graph-io/csv`. An `E_` code means the save throws unless you change the graph or the options.

| Code                      | Key                     | Severity            | Meaning                                                                                                                                                                                                    |
| ------------------------- | ----------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_ID_TEXT_COLLISION`     | `ID_TEXT_COLLISION`     | error (save throws) | Two node ids share one text (a number and a string); export() throws E_INVALID_ID.                                                                                                                         |
| `W_ID_TEXT_TYPE`          | `ID_TEXT_TYPE`          | warning             | Ids whose text reads back as the other type under the canonical rule.                                                                                                                                      |
| `W_CSV_DIRECTION_DROPPED` | `DIRECTION_DROPPED`     | warning             | The generic dialect has no direction column; an undirected or mixed graph reads back as directed. The Gephi dialect loses the direction of an undirected graph without edges (no row carries a Type cell). |
| `W_MUTUAL_EXPANDED`       | `MUTUAL_EXPANDED`       | warning             | Mutual pairs are written as two directed rows.                                                                                                                                                             |
| `W_CSV_RESERVED_NAME`     | `RESERVED_NAME`         | warning             | An attribute column named like a reserved header is not written.                                                                                                                                           |
| `W_ROLE_ASSUMED`          | `ROLE_ASSUMED`          | warning             | A column without a role that the importer gives one back by its name.                                                                                                                                      |
| `W_CSV_ROLE_NAME`         | `ROLE_NAME`             | warning             | A role column (id, label) whose name the importer does not recognise; the role is lost.                                                                                                                    |
| `W_CSV_TEXT_ROLE`         | `TEXT_ROLE`             | warning             | A role column (id, label) that is not string / dict reads back as string.                                                                                                                                  |
| `W_CSV_NONFINITE`         | `NONFINITE`             | warning             | NaN / Infinity in a numeric column read back as text.                                                                                                                                                      |
| `W_TEXT_INFERRED`         | `TEXT_INFERRED`         | warning             | A text column whose every value reads back as a number or boolean.                                                                                                                                         |
| `W_STORAGE_CLASS_CHANGED` | `STORAGE_CLASS_CHANGED` | warning             | A dict column whose cardinality makes the importer read it back as string, or the reverse.                                                                                                                 |
| `W_CSV_NODE_TABLE`        | `NODE_TABLE`            | warning             | Node attributes are written by a `table: "nodes"` export only.                                                                                                                                             |
| `W_CSV_ISOLATED_NODES`    | `ISOLATED_NODES`        | warning             | The edge table carries no node without an edge: isolated nodes vanish on re-import.                                                                                                                        |
| `W_CSV_NODE_ORDER`        | `NODE_ORDER`            | warning             | The edge table lists nodes by first appearance; the node order (and indices) change on re-import.                                                                                                          |
| `W_CSV_EDGE_COLUMNS`      | `EDGE_COLUMNS`          | warning             | An adjacency table holds no edge column but the weight: edge ids, labels and attributes are not written.                                                                                                   |

<!-- generated:end -->
