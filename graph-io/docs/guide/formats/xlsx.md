# Excel workbooks

An Excel workbook (`.xlsx`, or `.xlsm` with macros) holds one or more sheets of rows. graph-io reads
one sheet as a table, by exactly the rules it reads a CSV file by: the header row names the columns,
`source` and `target` columns make an edge table, an `id` column a node table, and every other column
becomes an attribute. Pass the file's bytes (a `Uint8Array`, a stream or a `File`); text cannot hold a
workbook.

## Which sheet is read

`sheet` names the sheet to read, matched exactly. Left out, the first sheet in tab order is read
(hidden sheets count), and when the workbook has several, the report warns `W_XLSX_SHEET_CHOSEN`
with the sheet's name in its params. `report.resolved.sheet` always holds the name of the sheet that
was read. A name no sheet has stops the import with `E_SHEET_NOT_FOUND`; its params are
`{ sheet, sheets }`, every sheet's name in tab order. `listGraphs()` lists the sheets without reading
their cells, and `graphIndex` chooses one by position.

## How cells are read

- Text cells are text: `007` stays `007`, and an empty text cell is the empty string.
- Number cells keep the digits the workbook saved; a column of them is typed as a CSV column is.
- A number formatted as a date or time becomes ISO 8601 text, the workbook's wall-clock time with no
  zone: `2023-03-15`, or `2023-03-15T12:00:00` when it has a time. Workbooks that count from 1904
  are read in their own system.
- Booleans are `true` or `false`.
- Formulas are never computed: the value Excel saved is read. A formula saved without a value, and
  an error cell (`#N/A`, `#DIV/0!`), are unset, counted in `W_XLSX_NO_CACHED_VALUE` and
  `W_XLSX_CELL_ERROR`.
- Merged cells keep their value in the top-left cell only.
- `missing` names cell texts read as unset, such as `["N/A"]`, as it does for CSV.

## What is refused

A legacy binary `.xls` workbook (`E_XLSX_LEGACY_XLS`) and a password-protected one
(`E_XLSX_ENCRYPTED`) are refused: save them as `.xlsx` without a password first. A zip that holds no
workbook, such as a Word document, is `E_XLSX_NOT_WORKBOOK`. A workbook that would unpack to more than
`maxUncompressedBytes`, or one compressed more than 1000 to 1, is `E_TOO_LARGE`, and a sheet whose
used range would fill more empty cells than `maxEmptyCells` is `E_TOO_MANY_EMPTY_CELLS`.

The workbook reader is loaded the first time a workbook is read, so registering the format costs
nothing until then.

## At a glance

<!-- generated:begin glance:xlsx -->

|                         |                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Import from             | `@graphty/graph-io/xlsx`                                                                                              |
| Format name             | `xlsx`                                                                                                                |
| Extensions              | `.xlsx`, `.xlsm`                                                                                                      |
| MIME types              | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel.sheet.macroEnabled.12` |
| Reads                   | yes                                                                                                                   |
| Writes                  | no (read only)                                                                                                        |
| Several graphs per file | no                                                                                                                    |
| Lists its graphs        | yes (`listGraphs`)                                                                                                    |

<!-- generated:end -->

## What a saved file keeps and loses

<!-- generated:begin capabilities:xlsx -->

This format is read only.

<!-- generated:end -->

## Styles

<!-- generated:begin styles:xlsx -->

|               |                                  |
| ------------- | -------------------------------- |
| Reads styles  | no: the format has no styles     |
| Writes styles | no (this format has no exporter) |

<!-- generated:end -->

<!-- generated:begin reference:xlsx -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).
A file can hold several graphs: pick one with the `graphIndex` or `graphName` option of [importGraph()](../options.md#importgraph-and-importallgraphs), as [Files that hold several graphs](../loading.md#files-that-hold-several-graphs) shows.

| Option                                                 | Type                                          | Default                               |
| ------------------------------------------------------ | --------------------------------------------- | ------------------------------------- |
| [`sheet`](#import-sheet)                               | `string`                                      | the first sheet                       |
| [`maxUncompressedBytes`](#import-maxuncompressedbytes) | `number`                                      | `2147483648`                          |
| [`header`](#import-header)                             | `boolean \| "auto"`                           | `"auto"`                              |
| [`table`](#import-table)                               | `"adjacency" \| "auto" \| "nodes" \| "edges"` | `"auto"`                              |
| [`sourceColumn`](#import-sourcecolumn)                 | `string \| number`                            | from the header                       |
| [`targetColumn`](#import-targetcolumn)                 | `string \| number`                            | from the header                       |
| [`typeColumn`](#import-typecolumn)                     | `null \| string \| number`                    | Gephi's Type                          |
| [`idColumn`](#import-idcolumn)                         | `string \| number`                            | from the header                       |
| [`labelColumn`](#import-labelcolumn)                   | `string \| number`                            | from the header                       |
| [`rowNumberIds`](#import-rownumberids)                 | `boolean`                                     | `false`                               |
| [`blankIdPrefix`](#import-blankidprefix)               | `string`                                      | undefined (blank-id rows are skipped) |
| [`missing`](#import-missing)                           | `readonly string[]`                           | undefined (no placeholder texts)      |

- <a id="import-sheet"></a>`sheet`: The name of the sheet to read, matched exactly after Unicode NFC normalization. Left out, the first sheet in tab order (hidden sheets included) is read, unless `graphIndex` or `graphName` chooses one. A name no sheet has stops the import with `E_SHEET_NOT_FOUND`, whose params list every sheet.
- <a id="import-maxuncompressedbytes"></a>`maxUncompressedBytes`: The most bytes one import may unpack from the workbook archive, in total (2 GiB). A file that would unpack to more, or one compressed more than 1000 to 1, fails with `E_TOO_LARGE`, as does a sheet whose cells add up to more characters than this (or than about 536 million), which a small sheet can when many cells repeat one long shared string.
- <a id="import-header"></a>`header`: Whether the first row is a header; "auto" decides from its content (a header names columns, a data row holds ids and numbers). It applies to the `nodes` table too.
- <a id="import-table"></a>`table`: What the input is: "edges" (one edge per row), "nodes" (one node per row), "adjacency" (a node and its neighbors per row, `node,neighbor[:weight],...`, with no header unless you pass `header: true`), or "auto": an edge table when source and target columns can be found, a node table when only an id column can. An adjacency table is never detected, because its rows look like an edge list.
- <a id="import-sourcecolumn"></a>`sourceColumn`: The source column, by name or 0-based position. The default is the column whose header is a recognized source name (`source`, `from`, `src` and others; the CSV format page lists them all); in a file without a header, the first column. A header with no recognized source and target names needs this option and `targetColumn`.
- <a id="import-targetcolumn"></a>`targetColumn`: The target column, by name or 0-based position. The default is the column whose header is a recognized target name (`target`, `to`, `dst` and others; the CSV format page lists them all); in a file without a header, the second column.
- <a id="import-typecolumn"></a>`typeColumn`: The column that gives each edge's direction (Directed / Undirected / Mutual), by name or position. The default is the `Type` column of a Gephi table (one whose header has exactly `Source` and `Target`); null reads no such column.
- <a id="import-idcolumn"></a>`idColumn`: The id column of a node table, by name or position. The default is the first of these whose values are all present and distinct: the column named `id`, a column whose name ends in `id` (`person_id`, `personId`), then `node`, `key`, `name`. When none is, the nodes are numbered by row (`W_CSV_NO_UNIQUE_ID`). A node table passed as `nodes` beside an edge table is keyed by the column named `id` (or `node`, `name`, `key`), since the edges name its nodes by it.
- <a id="import-labelcolumn"></a>`labelColumn`: The label column of a node table, by name or position. The default is the column the header names `label` (in any case). With `nodeIdFrom: "label"`, the node ids come from this column, and the edge table must name its nodes by these labels too.
- <a id="import-rownumberids"></a>`rowNumberIds`: Give the nodes of a node table without an id column the row number as id (0 for the first data row, turned into an id by `ids`), instead of failing with `E_CSV_NO_ID_COLUMN`. It applies to the `nodes` table when you pass one, else to the input. Under `header: "auto"` that table's first row is then read as a header; under `header: false` the option is ignored with a warning, because a table without a header takes its ids from its first column.
- <a id="import-blankidprefix"></a>`blankIdPrefix`: Keep a node row whose id cell is blank, as a node whose id is this prefix followed by the row's number (0 for the first data row), instead of skipping it with `E_MISSING_ID`. Choose a prefix no id in the file starts with: a minted id that repeats one is merged like any repeated id.
- <a id="import-missing"></a>`missing`: Cell texts read as unset, such as `["N/A", "null"]`. A data cell whose text equals an entry (both compared after Unicode NFC normalization, never trimmed: `" N/A"` stays text) is read as an empty cell before anything else reads it, so a key cell becomes blank, an endpoint missing, and a numeric column stays numeric. A quoted cell matches too; the header row is never compared.

## Import issue codes

The codes this format's import report can hold. They are also exported as `XLSX_ISSUE` from `@graphty/graph-io/xlsx`, keyed by the code without its `E_` / `W_` and `XLSX_` prefixes.

- `E_DUPLICATE_EDGE_ID` (error): An edge row repeating an edge id (skipped).
- `W_PRECISION` (warning): An integer beyond 2^53 was stored as the nearest 64-bit float; reported once per column.
- `E_INVALID_UTF8` (error): The input is not valid UTF-8. The import stops.
- `E_INVALID_ENCODING` (error): Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the `encoding` option). The import stops.
- `W_ENCODING_FALLBACK` (warning): Bytes that are not UTF-8 and declare no encoding were read as windows-1252.
- `W_UNKNOWN_ENCODING` (warning): A declared encoding the platform cannot decode was ignored.
- `E_CSV_NO_ENDPOINT_COLUMNS` (error): The header names no source and target columns and no id column. Pass `sourceColumn` and `targetColumn` to name the columns. The import stops.
- `E_CSV_NO_ID_COLUMN` (error): The node table has no id column. Pass `idColumn` to name it, or `rowNumberIds: true` to number the rows. The import stops.
- `W_CSV_NO_UNIQUE_ID` (warning): Every id-like column of a node table's header (`id`, `person_id`, `node`, `key`, `name`) repeats a value or leaves one blank, so the nodes are numbered by row (0 for the first data row). Pass `idColumn` to key the table by one of them anyway.
- `E_CSV_FIELD_COUNT` (error): A row with a different number of fields than the header; the row is skipped. An adjacency list read without `table: "adjacency"` gives one per long row, and the first one's message suggests the option.
- `E_MISSING_ENDPOINT` (error): An edge row with a blank source or target.
- `E_MISSING_ID` (error): A node row with a blank id.
- `E_CSV_BAD_TYPE` (error): A Type cell outside Directed / Undirected / Mutual.
- `E_CSV_UNCLOSED_QUOTE` (error): A quoted field is never closed. The import stops.
- `E_CSV_QUOTE` (error): There is text after a closing quote, such as `"a"b`. Inside a quoted field, write a quote as two quotes. The import stops.
- `W_CSV_NO_DATA_ROWS` (warning): A header and no data rows.
- `W_DUPLICATE_NODE` (warning): A node table row repeating an id.
- `W_ID_MERGED` (warning): Two different id cells became the same number because `ids` is "number", so their nodes were merged.
- `W_CSV_COLUMN_MISSING` (warning): An explicitly named weight column the file does not have.
- `W_ROLE_TAKEN` (warning): You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.
- `W_COLUMN_RENAMED` (warning): An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a repeated column header.
- `W_OPTION_IGNORED` (warning): You set an option this format does not use; it had no effect. The message names the option.
- `W_SINK_OPTION` (warning): You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.
- `W_DIRECTION_REFUSED` (warning): You read into a graph builder whose direction is already set, or which already holds edges, so the file is read with the builder's direction instead of its own.
- `W_DIRECTION_FORCED` (warning): Edges of the other direction were read with the direction `onMixedDirection` chose.
- `E_MIXED_DIRECTION` (error): The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a format that holds one direction per file fails with `E_DIRECTED`. Pass "directed" or "undirected" to read or write it anyway.
- `W_WIDENING_UNSUPPORTED` (warning): Your graph builder cannot change an attribute's type after its first value, so a text column keeps the type of its first values.
- `E_CSV_OTHER_FORMAT` (error): The input starts like another format (XML or HTML, JSON, GML, DOT or Pajek), not CSV. The import stops.
- `W_CSV_STRAY_QUOTE` (warning): A quote inside a field that does not start with a quote is kept as part of the text. Reported once per import.
- `W_CSV_COMMENT_DIRECTION` (warning): A leading comment's direction disagrees with defaultDirected or an earlier comment.
- `W_CSV_TYPE_COLUMN_IGNORED` (warning): A column named like `Type` holds direction words (Directed, Undirected), but graph-io reads direction only from a `Type` column beside `Source` and `Target`, or from the `typeColumn` option. Reported once per import.
- `W_CSV_TRAILING_HEADER_DELIMITER` (warning): The header ends in a delimiter; rows without the empty last cell are complete.
- `W_CSV_SINGLE_COLUMN` (warning): Every row is one cell another delimiter would split (a likely wrong delimiter option).
- `W_CSV_AMBIGUOUS_COLUMN` (warning): Several header columns name one role; the one not chosen is a plain attribute.
- `W_CSV_PADDED_ID` (warning): An id that is not quoted starts or ends in whitespace other than spaces and tabs (a no-break space); it is kept, so it is a different id from the trimmed text. Spaces and tabs around an id that is not quoted are trimmed. Reported once per import.
- `W_CSV_COMMENT_LIKE_RECORD` (warning): A leading # / % line skipped as a comment has the fields of a record.
- `W_CSV_TRAILING_DELIMITER` (warning): Every data row ends in one extra delimiter; the empty last cell is dropped. Reported once per import.
- `W_CSV_WEIGHT_AS_ATTRIBUTE` (warning): In a file without a header, the third column holds text, so it is read as an attribute, not as the edge weight. Reported once per import.
- `W_CSV_POSSIBLE_HEADER` (warning): The first row was read as data, but every cell is a word of three or more characters that no other row repeats, so it may be a header of names graph-io does not know. Pass `header: true` if it is one.
- `E_XLSX_NOT_ZIP` (error): The input is not a zip archive (or is text). The import stops.
- `E_XLSX_CORRUPT` (error): The archive or one of its parts is damaged, or a part names a path outside the archive. The import stops.
- `E_XLSX_NOT_WORKBOOK` (error): A zip that holds no workbook (`xl/workbook.xml`), such as a Word document. The import stops.
- `E_XLSX_UNSUPPORTED` (error): A zip feature the reader does not support: a compression method, a split archive. The import stops.
- `E_XLSX_LEGACY_XLS` (error): A legacy binary `.xls` workbook; save it as `.xlsx` to read it. The import stops.
- `E_XLSX_ENCRYPTED` (error): A password-protected (encrypted) workbook. The import stops.
- `E_SHEET_NOT_FOUND` (error): The `sheet` option names no sheet; params `{ sheet, sheets }`. The import stops.
- `E_GRAPH_NOT_FOUND` (error): `graphIndex` or `graphName` names no sheet. The import stops.
- `E_AMBIGUOUS_GRAPH_NAME` (error): `graphName` names two sheets. The import stops.
- `E_NO_GRAPH` (error): The workbook lists no sheet. The import stops.
- `W_XLSX_SHEET_CHOSEN` (warning): No sheet was chosen and the workbook has several; the first, named in params `{ sheet }`, was read.
- `W_XLSX_CELL_ERROR` (warning): Cells holding an error value (`#N/A`, `#DIV/0!`) were read as unset; params `{ count }`.
- `W_XLSX_NO_CACHED_VALUE` (warning): Formula cells saved without a computed value were read as unset; params `{ count }`.
- `E_TOO_MANY_EMPTY_CELLS` (error): The sheet's used range would fill more empty cells than `maxEmptyCells` allows. The import stops.

Like every format, it can also record the codes for unreadable input and for elements the graph refuses: [`E_EMPTY_INPUT`](../codes.md#E_EMPTY_INPUT), [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED), [`E_INVALID_ID`](../codes.md#E_INVALID_ID), [`E_UNKNOWN_NODE`](../codes.md#E_UNKNOWN_NODE), [`E_INVALID_WEIGHT`](../codes.md#E_INVALID_WEIGHT), [`E_DUPLICATE_EDGE`](../codes.md#E_DUPLICATE_EDGE), [`E_SELF_LOOP`](../codes.md#E_SELF_LOOP).

<!-- generated:end -->
