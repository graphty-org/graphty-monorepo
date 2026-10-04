# Neo4j CSV

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

| Capability        | Value                       | Meaning                                                                         |
| ----------------- | --------------------------- | ------------------------------------------------------------------------------- |
| `mixedDirection`  | no                          | Directed and undirected edges in one file.                                      |
| `multiEdges`      | yes                         | Parallel edges.                                                                 |
| `selfLoops`       | yes                         | Self-loops.                                                                     |
| `edgeIds`         | none                        | Whether edge ids are required (generated when absent), optional or unsupported. |
| `idCharset`       | any                         | Which node ids can be written unchanged.                                        |
| `dtypes`          | f32, f64, i32, bool, string | The column dtypes the format keeps as declared.                                 |
| `components`      | no                          | Multi-component (stride) columns.                                               |
| `lists`           | yes                         | List columns.                                                                   |
| `json`            | no                          | Nested json columns.                                                            |
| `defaults`        | no                          | Declared defaults.                                                              |
| `options`         | no                          | Declared enumerations (GEXF options).                                           |
| `hierarchy`       | no                          | Containment (parent / parents roles).                                           |
| `temporal`        | none                        | Temporal support level.                                                         |
| `graphAttributes` | no                          | Graph-level attributes.                                                         |
| `positions`       | no                          | The position role.                                                              |
| `viz`             | no                          | The visual roles (color, size, shape, thickness).                               |

<!-- generated:end -->

## Loading

## Saving

## How graph-io reads it

## What a saved file keeps and loses

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
| `W_SINK_OPTION`                 | `SINK_OPTION`           | warning  | A builder-policy option the sink does not honour.                                                         |

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
