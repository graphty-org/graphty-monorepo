# CSV and TSV

CSV and TSV files hold one table per file. graph-io reads three kinds of table: an edge list
(one edge per row), a node table (one node per row), and an adjacency list (a node and its
neighbors per row). It understands the column names Gephi, NetworkX, SNAP and KONECT use.

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

What a saved file can hold (the [capabilities](./index.md#what-the-capabilities-mean) explain each row):

| Capability                                      | Value                        |
| ----------------------------------------------- | ---------------------------- |
| [`mixedDirection`](./index.md#mixeddirection)   | yes                          |
| [`multiEdges`](./index.md#multiedges)           | yes                          |
| [`selfLoops`](./index.md#selfloops)             | yes                          |
| [`edgeIds`](./index.md#edgeids)                 | optional                     |
| [`idCharset`](./index.md#idcharset)             | any                          |
| [`dtypes`](./index.md#dtypes)                   | bool, i32, f64, string, dict |
| [`components`](./index.md#components)           | no                           |
| [`lists`](./index.md#lists)                     | no                           |
| [`json`](./index.md#json)                       | no                           |
| [`defaults`](./index.md#defaults)               | no                           |
| [`options`](./index.md#options)                 | no                           |
| [`hierarchy`](./index.md#hierarchy)             | no                           |
| [`temporal`](./index.md#temporal)               | none                         |
| [`graphAttributes`](./index.md#graphattributes) | no                           |
| [`positions`](./index.md#positions)             | no                           |
| [`viz`](./index.md#viz)                         | no                           |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/csv -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

// An edge table, with the node table passed alongside it
const { snapshot } = await importGraph(await readFile("got-edges.csv"), {
    filename: "got-edges.csv",
    nodes: await readFile("got-nodes.csv"),
});
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);

// One CSV file holds one table: write the edges and the nodes separately
console.log(checkExport(snapshot, "csv").map((n) => n.code));
await writeFile("edges.csv", await exportGraphToBytes(snapshot, "csv"));
await writeFile("nodes.csv", await exportGraphToBytes(snapshot, "csv", { table: "nodes" }));
```

<!-- generated:end -->

<!-- generated:begin output:formats/csv -->

```text
107 nodes, 352 edges
[ 'W_CSV_NODE_TABLE' ]
```

<!-- generated:end -->

A CSV file holds one table, so the example writes the edges and the nodes to two files.
The default export is the edge table, which has no room for node attributes (`W_CSV_NODE_TABLE`);
`table: "nodes"` writes the node table. To read the pair back, pass the edge table as the input
and the node table as the `nodes` option, as the example does when loading.

## How graph-io reads it

- The delimiter is detected from the first rows (`,`, tab, `;`, `|` or space) unless you pass
  `delimiter`. Excel's `sep=;` first line is understood. A space delimiter reads the format of SNAP
  and KONECT files: runs of spaces and tabs are one separator.
- The first row is a header when it names known columns or is all text above a row of numbers
  (`header` overrides this). The column names decide what each column is: `source` / `target`,
  `from` / `to`, or Gephi's `Source` / `Target` for the ends of an edge; `id` / `Id` for a node or
  edge id; `label` / `Label` for the label; `weight` for the weight; Gephi's `Type` for the direction
  of each row. `sourceColumn`, `targetColumn`, `idColumn` and `typeColumn` name columns yourself.
- A file without a header is read as source, target, weight, then `column4`, `column5`, ... as
  attributes.
- Every other column is an attribute. Its type comes from its values: a column of whole numbers is
  an integer column, `2.0` stays a floating-point number, `true` / `false` make a boolean column,
  and anything else is text. A whole number beyond 2^53 (9007199254740993) cannot be held exactly
  by a JavaScript number: it is stored as the nearest one, with a `W_PRECISION` warning. A CSV
  file cannot mark a column as text (quoting a cell does not), so to keep every digit use a format
  that declares 64-bit integers, such as GraphML or GEXF, and read it with `long: "string"`.
- A quoted empty cell (`""`) is an empty string; a bare empty cell has no value.
- The direction comes from Gephi's `Type` column (`Directed`, `Undirected`, `Mutual`) when there is
  one, otherwise from a leading `# Directed graph` comment (SNAP) or `% sym` / `% asym` line
  (KONECT), otherwise from `defaultDirected` (directed).
- Lines starting with `#` or `%` before the first row are comments.
- The `nodes` option takes a node table to read alongside the edge list; its ids become nodes and
  its other columns node attributes. A node table on its own is read when the header has an id
  column but no source and target.
- `table: "adjacency"` reads an adjacency list: each row is a node followed by its neighbors, and
  `neighbor:2.5` gives that edge a weight. graph-io never guesses this table, because its rows look
  like an edge list.
- A file that is really XML, JSON, GML, DOT or Pajek is refused (`E_CSV_OTHER_FORMAT`) rather than
  read as a table of nonsense.
- Guesses graph-io had to make are reported once each: a stray quote, an id with spaces around it,
  two columns that both look like the source, and others. See the codes below.

## What a saved file keeps and loses

A CSV file is one table, so one file cannot hold everything:

- The edge table (the default) holds the edges and their attributes, but no node attributes
  (`W_CSV_NODE_TABLE`), no node without edges (`W_CSV_ISOLATED_NODES`), and not the node order
  (`W_CSV_NODE_ORDER`). Write the node table as a second file with `table: "nodes"`.
- `table: "adjacency"` keeps the ids, the node order, nodes without edges, the edge order and the
  weights, but no direction and no attribute columns.
- The Gephi dialect (the default) writes a `Type` column with each edge's direction. The generic
  dialect (`dialect: "generic"`) has no direction column, so an undirected graph reads back as
  directed (`W_CSV_DIRECTION_DROPPED`).
- Booleans, integers, floating-point numbers and text read back with the same type. Lists and JSON
  values are written as text, and `NaN` and infinities read back as text.
- An id that is text but looks like a number (`"7"`) reads back as a number (`W_ID_TEXT_TYPE`).
- Nesting, positions, visual columns, time columns and graph attributes are not written.

<!-- generated:begin reference:csv -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option         | Type                                                                                        | Default         | Meaning                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `delimiter`    | `string`                                                                                    | detected        | The field delimiter. The default is to detect it from the first rows: `,`, tab, `;`, `\|` or space.                                                                                                                                                                                                                                                                                                   |
| `header`       | `boolean \| "auto"`                                                                         | `"auto"`        | Whether the first row is a header; "auto" decides from its content (a header names columns, a data row holds ids and numbers).                                                                                                                                                                                                                                                                        |
| `table`        | `"adjacency" \| "auto" \| "nodes" \| "edges"`                                               | `"auto"`        | What the input is: "edges" (one edge per row), "nodes" (one node per row), "adjacency" (a node and its neighbors per row, `node,neighbor[:weight],...`, with no header unless you pass `header: true`), or "auto": an edge table when source and target columns can be found, a node table when only an id column can. An adjacency table is never detected, because its rows look like an edge list. |
| `sourceColumn` | `string \| number`                                                                          | from the header | The source column, by name or 0-based position. The default is the column the header names `source` (or `src`, `from`, ...); in a file without a header, the first column.                                                                                                                                                                                                                            |
| `targetColumn` | `string \| number`                                                                          | from the header | The target column, by name or 0-based position. The default is the column the header names `target` (or `dst`, `to`, ...); in a file without a header, the second column.                                                                                                                                                                                                                             |
| `typeColumn`   | `null \| string \| number`                                                                  | Gephi's Type    | The column that gives each edge's direction (Directed / Undirected / Mutual), by name or position. The default is the `Type` column of a Gephi table (one whose header has exactly `Source` and `Target`); null reads no such column.                                                                                                                                                                 |
| `idColumn`     | `string \| number`                                                                          | from the header | The id column of a node table, by name or position. The default is the column the header names `id` (or `node`, `name`, `key`).                                                                                                                                                                                                                                                                       |
| `nodes`        | `string \| Uint8Array \| ReadableStream<Uint8Array> \| AsyncIterable<string \| Uint8Array>` |                 | A node table to read before the edges, as a string, bytes or a stream: its ids become nodes and its other columns node attributes.                                                                                                                                                                                                                                                                    |
| `rowNumberIds` | `boolean`                                                                                   | `false`         | Give the nodes of a node table without an id column the row number as id (0 for the first data row, turned into an id by `ids`), instead of failing with E_CSV_NO_ID_COLUMN. It applies to the `nodes` table when you pass one, else to the input; that table's first row is then always a header.                                                                                                    |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option      | Type                                | Default   | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------- | ----------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dialect`   | `"gephi" \| "generic"`              | `"gephi"` | The header spelling: "gephi" writes `Source,Target,Type,...,Weight`, with each edge's direction in `Type`; "generic" writes `source,target,...,weight` and no direction column.                                                                                                                                                                                                                                                                                                           |
| `table`     | `"adjacency" \| "nodes" \| "edges"` | `"edges"` | Which table to write. "edges": one edge per row, with the edge attributes; isolated nodes and node attributes are not in it. "nodes": one node per row, with the node attributes and no edges. "adjacency": a node and its neighbors per row, which keeps every node and the node order but no attributes (read it back with `table: "adjacency"`). To keep both nodes and edges, write the node table and the edge table to two files and read them back with the `nodes` import option. |
| `delimiter` | `string`                            | `","`     | The field delimiter.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `newline`   | `"\n" \| "\r\n"`                    | `"\n"`    | The line terminator.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `header`    | `boolean`                           | `true`    | Whether to write the header row (an adjacency table never has one).                                                                                                                                                                                                                                                                                                                                                                                                                       |

## Import issue codes

The codes this format's import report can hold, also exported as `CSV_ISSUE` from `@graphty/graph-io/csv`.

| Code                              | Key                         | Severity | Meaning                                                                                                                                                                                                                                      |
| --------------------------------- | --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `W_PRECISION`                     | `PRECISION`                 | warning  | An integer beyond 2^53 was stored as the nearest 64-bit float; reported once per column.                                                                                                                                                     |
| `E_INVALID_UTF8`                  | `INVALID_UTF8`              | error    | The input holds invalid UTF-8 (fatal).                                                                                                                                                                                                       |
| `E_INVALID_ENCODING`              | `INVALID_ENCODING`          | error    | Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal).                                                                                                                                                     |
| `W_ENCODING_FALLBACK`             | `ENCODING_FALLBACK`         | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                                                                                                                                                                  |
| `W_UNKNOWN_ENCODING`              | `UNKNOWN_ENCODING`          | warning  | A declared encoding the platform cannot decode was ignored.                                                                                                                                                                                  |
| `E_CSV_NO_ENDPOINT_COLUMNS`       | `NO_ENDPOINT_COLUMNS`       | error    | The header names neither endpoint columns nor an id column (fatal).                                                                                                                                                                          |
| `E_CSV_NO_ID_COLUMN`              | `NO_ID_COLUMN`              | error    | A node table without an id column (fatal).                                                                                                                                                                                                   |
| `E_CSV_FIELD_COUNT`               | `FIELD_COUNT`               | error    | A row with a different field count than the header.                                                                                                                                                                                          |
| `E_MISSING_ENDPOINT`              | `MISSING_ENDPOINT`          | error    | An edge row with a blank source or target.                                                                                                                                                                                                   |
| `E_MISSING_ID`                    | `MISSING_ID`                | error    | A node row with a blank id.                                                                                                                                                                                                                  |
| `E_CSV_BAD_TYPE`                  | `BAD_TYPE`                  | error    | A Type cell outside Directed / Undirected / Mutual.                                                                                                                                                                                          |
| `E_CSV_UNCLOSED_QUOTE`            | `UNCLOSED_QUOTE`            | error    | An unterminated quoted field (fatal).                                                                                                                                                                                                        |
| `E_CSV_QUOTE`                     | `QUOTE`                     | error    | Text after a closing quote (fatal).                                                                                                                                                                                                          |
| `W_CSV_NO_DATA_ROWS`              | `NO_DATA_ROWS`              | warning  | A header and no data rows.                                                                                                                                                                                                                   |
| `W_DUPLICATE_NODE`                | `DUPLICATE_NODE`            | warning  | A node table row repeating an id.                                                                                                                                                                                                            |
| `E_DUPLICATE_EDGE_ID`             | `DUPLICATE_EDGE_ID`         | error    | An edge row repeating an edge id (skipped).                                                                                                                                                                                                  |
| `W_ID_MERGED`                     | `ID_MERGED`                 | warning  | Two id cells merged into one number under ids "number".                                                                                                                                                                                      |
| `W_CSV_COLUMN_MISSING`            | `COLUMN_MISSING`            | warning  | An explicitly named weight column the file does not have.                                                                                                                                                                                    |
| `W_ROLE_TAKEN`                    | `ROLE_TAKEN`                | warning  | You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.                                                                                                          |
| `W_COLUMN_RENAMED`                | `COLUMN_RENAMED`            | warning  | An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a repeated column header.                                                                                                             |
| `W_OPTION_IGNORED`                | `OPTION_IGNORED`            | warning  | You set an option this format does not use; it had no effect. The message names the option.                                                                                                                                                  |
| `W_SINK_OPTION`                   | `SINK_OPTION`               | warning  | You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.                                        |
| `W_DIRECTION_REFUSED`             | `DIRECTION_REFUSED`         | warning  | You read into a graph builder whose direction is already set, or which already holds edges, so the file is read with the builder's direction instead of its own.                                                                             |
| `W_DIRECTION_FORCED`              | `DIRECTION_FORCED`          | warning  | Edges forced to the policy's direction.                                                                                                                                                                                                      |
| `E_MIXED_DIRECTION`               | `MIXED_DIRECTION`           | error    | The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a format that holds one direction per file fails with E_DIRECTED. Pass "directed" or "undirected" to read or write it anyway. |
| `W_WIDENING_UNSUPPORTED`          | `WIDENING_UNSUPPORTED`      | warning  | Your graph builder cannot change an attribute's type after its first value, so a text column keeps the type of its first values.                                                                                                             |
| `E_CSV_OTHER_FORMAT`              | `OTHER_FORMAT`              | error    | The input opens like another format (XML / HTML, JSON, GML, DOT, Pajek) (fatal).                                                                                                                                                             |
| `W_CSV_STRAY_QUOTE`               | `STRAY_QUOTE`               | warning  | A quote inside an unquoted field, kept as text (once per import).                                                                                                                                                                            |
| `W_CSV_COMMENT_DIRECTION`         | `COMMENT_DIRECTION`         | warning  | A leading comment's direction disagrees with defaultDirected or an earlier comment.                                                                                                                                                          |
| `W_CSV_TYPE_COLUMN_IGNORED`       | `TYPE_COLUMN_IGNORED`       | warning  | A column named like Type holds direction words but is a plain attribute (once per import).                                                                                                                                                   |
| `W_CSV_TRAILING_HEADER_DELIMITER` | `TRAILING_HEADER_DELIMITER` | warning  | The header ends in a delimiter; rows without the empty last cell are complete.                                                                                                                                                               |
| `W_CSV_SINGLE_COLUMN`             | `SINGLE_COLUMN`             | warning  | Every row is one cell another delimiter would split (a likely wrong delimiter option).                                                                                                                                                       |
| `W_CSV_AMBIGUOUS_COLUMN`          | `AMBIGUOUS_COLUMN`          | warning  | Several header columns name one role; the one not chosen is a plain attribute.                                                                                                                                                               |
| `W_CSV_PADDED_ID`                 | `PADDED_ID`                 | warning  | An unquoted id with leading or trailing whitespace, kept as written (once per import).                                                                                                                                                       |
| `W_CSV_COMMENT_LIKE_RECORD`       | `COMMENT_LIKE_RECORD`       | warning  | A leading # / % line skipped as a comment has the fields of a record.                                                                                                                                                                        |
| `W_CSV_TRAILING_DELIMITER`        | `TRAILING_DELIMITER`        | warning  | Data rows end in one extra empty cell (a trailing delimiter); dropped (once per import).                                                                                                                                                     |
| `W_CSV_WEIGHT_AS_ATTRIBUTE`       | `WEIGHT_AS_ATTRIBUTE`       | warning  | A headerless three-column table's text third column is an attribute, not the weight (once per import).                                                                                                                                       |

Like every format, it can also record the codes for unreadable input: [`E_EMPTY_INPUT`](../codes.md#E_EMPTY_INPUT), [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED).

## Loss codes

The codes `checkExport(snapshot, "csv", options)` can return before a save, also exported as `CSV_LOSS` from `@graphty/graph-io/csv`. An `E_` code means the save throws unless you change the graph or the options. A save can also return the [shared loss codes](../codes.md#shared-loss-codes) that any format can.

| Code                      | Key                     | Severity            | Meaning                                                                                                                                                                                                    |
| ------------------------- | ----------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_ID_TEXT_COLLISION`     | `ID_TEXT_COLLISION`     | error (save throws) | Two node ids would be written as the same text (the number 5 and the text "5"); the save fails with E_INVALID_ID.                                                                                          |
| `W_ID_TEXT_TYPE`          | `ID_TEXT_TYPE`          | warning             | Ids whose text reads back as the other type under the canonical rule.                                                                                                                                      |
| `W_CSV_DIRECTION_DROPPED` | `DIRECTION_DROPPED`     | warning             | The generic dialect has no direction column; an undirected or mixed graph reads back as directed. The Gephi dialect loses the direction of an undirected graph without edges (no row carries a Type cell). |
| `W_MUTUAL_EXPANDED`       | `MUTUAL_EXPANDED`       | warning             | Mutual pairs are written as two directed rows.                                                                                                                                                             |
| `W_CSV_RESERVED_NAME`     | `RESERVED_NAME`         | warning             | An attribute column named like a reserved header is not written.                                                                                                                                           |
| `W_ROLE_ASSUMED`          | `ROLE_ASSUMED`          | warning             | An attribute without a role is written where the format keeps a role (a `name` column as the label, say), and reads back with that role.                                                                   |
| `W_CSV_ROLE_NAME`         | `ROLE_NAME`             | warning             | A role column (id, label) whose name the importer does not recognize; the role is lost.                                                                                                                    |
| `W_CSV_TEXT_ROLE`         | `TEXT_ROLE`             | warning             | An id or label attribute that is not text reads back as text.                                                                                                                                              |
| `W_CSV_NONFINITE`         | `NONFINITE`             | warning             | NaN / Infinity in a numeric column read back as text.                                                                                                                                                      |
| `W_TEXT_INFERRED`         | `TEXT_INFERRED`         | warning             | A text value that reads back as a number or a boolean, because the format does not record that it was text (the text "42" reads back as the number 42).                                                    |
| `W_STORAGE_CLASS_CHANGED` | `STORAGE_CLASS_CHANGED` | warning             | A text attribute reads back as a dictionary attribute, or the reverse, because the importer chooses by how often its values repeat. The values are the same.                                               |
| `W_CSV_NODE_TABLE`        | `NODE_TABLE`            | warning             | Node attributes are written by a `table: "nodes"` export only.                                                                                                                                             |
| `W_CSV_ISOLATED_NODES`    | `ISOLATED_NODES`        | warning             | The edge table carries no node without an edge: isolated nodes vanish on re-import.                                                                                                                        |
| `W_CSV_NODE_ORDER`        | `NODE_ORDER`            | warning             | The edge table lists nodes by first appearance; the node order (and indices) change on re-import.                                                                                                          |
| `W_CSV_EDGE_COLUMNS`      | `EDGE_COLUMNS`          | warning             | An adjacency table holds no edge column but the weight: edge ids, labels and attributes are not written.                                                                                                   |

<!-- generated:end -->
