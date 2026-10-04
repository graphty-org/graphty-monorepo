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

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/csv -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

// An edge table, with the node table passed alongside it
const { snapshot } = await importGraph(await readFile("got-edges.csv"), {
    filename: "got-edges.csv",
    defaultDirected: false, // the table has no Type column; these edges are undirected
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

### Two files the user picks

In a browser, let the user pick both tables in one `<input type="file" multiple>` and pass the node
table's `File` as `nodes`. The `nodes` option takes a `File` or `Blob` as well as a string, bytes or
a stream.

<!-- generated:begin example:formats/csv-two-files -->

```js
import { GraphFormatError, loadFromFile } from "@graphty/graph-io";

// <input type="file" id="tables" accept=".csv" multiple>: the user picks the edge and node tables together
const input = document.querySelector("#tables");
input.multiple = true;

input.addEventListener("change", async () => {
    const files = [...input.files];
    // tell the tables apart by name; a node table has no source and target columns
    const nodes = files.find((f) => /node/i.test(f.name));
    const edges = files.find((f) => f !== nodes);
    if (!edges) {
        console.error("pick the edge table");
        return;
    }
    try {
        // the node table goes in the `nodes` option, as a File like the edge table
        const { snapshot } = await loadFromFile(edges, { nodes, defaultDirected: false });
        const label = snapshot.nodes.byRole("label");
        console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges, first label ${label?.value(0)}`);
    } catch (err) {
        if (err instanceof GraphFormatError) {
            console.error(`Could not read the tables: ${err.message}`);
        } else {
            throw err;
        }
    }
});
```

<!-- generated:end -->

### Adjacency tables

`table: "adjacency"` writes each node with its neighbors on one line, `node,neighbor,neighbor`,
with `neighbor:2.5` for a weighted edge. The table keeps every node and the node order: when the
lines with neighbors would bring the nodes in a different order, lines that hold only a node id
come first, in the graph's order, and a node with no edges gets a line of its own. Nothing in the
file says that it is an adjacency table or whether it is directed, so read it back with
`table: "adjacency"` and, for an undirected graph, `defaultDirected: false`. Without
`table: "adjacency"`, each line longer than the first is an `E_CSV_FIELD_COUNT` error, and the
first error's message suggests the option.

<!-- generated:begin example:formats/csv-adjacency -->

```ts
import { checkExport, exportGraphToString, importGraph } from "@graphty/graph-io";

// Four people, declared in this order; Cleo knows Ana and Ben, and Dev knows nobody
const { snapshot } = await importGraph("graph { Ana; Ben; Cleo; Dev; Cleo -- Ana; Cleo -- Ben }", { format: "dot" });

// An adjacency table: each line is a node and its neighbors
const options = { table: "adjacency" } as const;
console.log(checkExport(snapshot, "csv", options).map((n) => n.code));
const text = await exportGraphToString(snapshot, "csv", options);
console.log(text);

// The file says neither that it is an adjacency table nor that it is undirected: pass both
const back = await importGraph(text, { format: "csv", table: "adjacency", defaultDirected: false });
console.log(back.snapshot.ids.toArray(), `${back.snapshot.edgeCount} edges, directed: ${back.snapshot.directed}`);
```

<!-- generated:end -->

<!-- generated:begin output:formats/csv-adjacency -->

```text
[ 'W_CSV_DIRECTION_DROPPED' ]
Ana
Ben
Cleo
Cleo,Ana,Ben
Dev

[ 'Ana', 'Ben', 'Cleo', 'Dev' ] 2 edges, directed: false
```

<!-- generated:end -->

## How graph-io reads it

- The delimiter is detected from the first rows (`,`, tab, `;`, `|` or space) unless you pass
  `delimiter`. Excel's `sep=;` first line is understood. A space delimiter reads the format of SNAP
  and KONECT files: runs of spaces and tabs are one separator.
- The first row is a header when it names known columns or is all text above a row of numbers
  (`header` overrides this). The column names decide what each column is; the next section lists
  every name graph-io recognizes. A header whose names it does not recognize (`s,t,weight`) fails
  with `E_CSV_NO_ENDPOINT_COLUMNS`: pass `sourceColumn` and `targetColumn` to name the columns.
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
  (KONECT), otherwise from `defaultDirected` (directed). A `Type` column that holds both
  `Directed` and `Undirected` makes a graph with both kinds of edge: each undirected edge is stored
  as two edges, and the edges get the `graphty.directed` and `graphty.pair` columns
  ([Columns graph-io adds](../reading.md#columns-graph-io-adds)).
- Lines starting with `#` or `%` before the first row are comments.
- The `nodes` option takes a node table to read alongside the edge list (a string, bytes, a stream,
  or a `File` or `Blob`); its ids become nodes and its other columns node attributes. A node table
  on its own is read when the header has an id column but no source and target.
- `header` and `delimiter` apply to both tables, the input and the `nodes` table. A node table whose
  shape differs (an edge list without a header next to a node table with one) cannot be read in one
  call: load the node table yourself, or add the missing header line to the edge list first. With
  `header: false`, `rowNumberIds` is ignored (`W_OPTION_IGNORED`), because a node table without a
  header takes its ids from its first column.
- Numbers use a decimal point. A spreadsheet saved in a locale that writes decimal commas (`2,5`)
  needs `decimal: ","`, which reads such cells as numbers and never takes the comma as the
  delimiter. Without it, a weight such as `2,5` is not a number and the edge is skipped with
  `E_INVALID_WEIGHT`.

<!-- generated:begin example:formats/csv-decimal-comma -->

```ts
import { importGraph } from "@graphty/graph-io";

// A spreadsheet saved in a locale that writes 2,5 for two and a half
const text = "source;target;weight\nAnna;Ben;2,5\nBen;Cleo;1,25\n";

const { snapshot, report } = await importGraph(text, { format: "csv", decimal: "," });
console.log(snapshot.edgeList().weights, report.errorCount);
```

<!-- generated:end -->

<!-- generated:begin output:formats/csv-decimal-comma -->

```text
Float32Array(2) [ 2.5, 1.25 ] 0
```

<!-- generated:end -->

- An empty weight cell (`bob,carol,,2020`) gives the edge the default weight 1, with no issue; a
  save writes no weight for it.
- `table: "adjacency"` reads an adjacency list: each row is a node followed by its neighbors, and
  `neighbor:2.5` gives that edge a weight. graph-io never guesses this table, because its rows look
  like an edge list; see [Adjacency tables](#adjacency-tables).
- A file that is really XML, JSON, GML, DOT or Pajek is refused (`E_CSV_OTHER_FORMAT`) rather than
  read as a table of nonsense.
- Guesses graph-io had to make are reported once each: a stray quote, an id with spaces around it,
  two columns that both look like the source, and others. See the codes below.

## Recognized column names

graph-io finds each column by its header name. It tries the names in the order listed, each first
exactly and then ignoring case, so `Source`, `SOURCE` and `source` all work. A column with another
name is an ordinary attribute; name it with `sourceColumn`, `targetColumn`, `idColumn` or
`labelColumn` instead. With `nodeIdFrom: "label"` the node ids come from the label column, so a node
table headed `key;name` needs `labelColumn: "name"`, and the edge table must name its nodes by
those labels.

<!-- generated:begin headers:csv -->

| Column               | Header names                                                                                     | To name another column |
| -------------------- | ------------------------------------------------------------------------------------------------ | ---------------------- |
| Edge source          | `source`, `src`, `from`, `start`, `source_id`, `sourceid`, `fromnodeid`, `start_id`, `:start_id` | `sourceColumn`         |
| Edge target          | `target`, `dst`, `dest`, `to`, `end`, `target_id`, `targetid`, `tonodeid`, `end_id`, `:end_id`   | `targetColumn`         |
| Node id (node table) | `id`, `node`, `name`, `key`                                                                      | `idColumn`             |
| Edge id (edge table) | `id`                                                                                             |                        |
| Label                | `label`                                                                                          |                        |
| Edge weight          | `weight`, or the name you pass as `weightFrom`                                                   | `weightFrom`           |
| Edge direction       | `Type`, only in a Gephi table (a header with exactly `Source` and `Target`)                      | `typeColumn`           |

<!-- generated:end -->

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
- Booleans, integers, floating-point numbers and text read back with the same type. A
  floating-point column is written with a decimal point (`2.0`) so it reads back as floating point,
  which is why the edge ids of a CX2 file, read as 64-bit floats, are written `0.0`, `1.0`, ...
  Lists and JSON values are written as text, and `NaN` and infinities read back as text.
- An id that is text but looks like a number (`"7"`) reads back as a number (`W_ID_TEXT_TYPE`).
- Nesting, positions, visual columns, time columns and graph attributes are not written.
- `header: false` writes no header row, and a file without one is read back by position: source,
  target, weight, then unnamed columns. Any other column (the Gephi `Type` column, an edge id, a
  label) then lands in the weight's place or loses its name, and `checkExport()` returns
  `W_CSV_HEADERLESS`. For a plain headerless edge list, pass `dialect: "generic"` and save a graph
  whose edges carry only weights.
- In the Gephi dialect the id column is written `Id`, Gephi's spelling, while every other column
  keeps its own name, so a node table can start `Id,label,team`. graph-io and Gephi read both
  spellings.

<!-- generated:begin capabilities:csv -->

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

<!-- generated:begin reference:csv -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option                                 | Type                                                                                                | Default         | Meaning                                                                                                                                                                                                                                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`delimiter`](#import-delimiter)       | `string`                                                                                            | detected        | The field delimiter.                                                                                                                                                                                                                                                                                                   |
| [`decimal`](#import-decimal)           | `"." \| ","`                                                                                        | `"."`           | The decimal separator of numbers.                                                                                                                                                                                                                                                                                      |
| [`header`](#import-header)             | `boolean \| "auto"`                                                                                 | `"auto"`        | Whether the first row is a header; "auto" decides from its content (a header names columns, a data row holds ids and numbers).                                                                                                                                                                                         |
| [`table`](#import-table)               | `"adjacency" \| "auto" \| "nodes" \| "edges"`                                                       | `"auto"`        | What the input is: "edges" (one edge per row), "nodes" (one node per row), "adjacency" (a node and its neighbors per row, `node,neighbor[:weight],...`, with no header unless you pass `header: true`), or "auto": an edge table when source and target columns can be found, a node table when only an id column can. |
| [`sourceColumn`](#import-sourcecolumn) | `string \| number`                                                                                  | from the header | The source column, by name or 0-based position.                                                                                                                                                                                                                                                                        |
| [`targetColumn`](#import-targetcolumn) | `string \| number`                                                                                  | from the header | The target column, by name or 0-based position.                                                                                                                                                                                                                                                                        |
| [`typeColumn`](#import-typecolumn)     | `null \| string \| number`                                                                          | Gephi's Type    | The column that gives each edge's direction (Directed / Undirected / Mutual), by name or position.                                                                                                                                                                                                                     |
| [`idColumn`](#import-idcolumn)         | `string \| number`                                                                                  | from the header | The id column of a node table, by name or position.                                                                                                                                                                                                                                                                    |
| [`labelColumn`](#import-labelcolumn)   | `string \| number`                                                                                  | from the header | The label column of a node table, by name or position.                                                                                                                                                                                                                                                                 |
| [`nodes`](#import-nodes)               | `string \| Uint8Array \| ReadableStream<Uint8Array> \| AsyncIterable<string \| Uint8Array> \| Blob` |                 | A node table to read before the edges: its ids become nodes and its other columns node attributes.                                                                                                                                                                                                                     |
| [`rowNumberIds`](#import-rownumberids) | `boolean`                                                                                           | `false`         | Give the nodes of a node table without an id column the row number as id (0 for the first data row, turned into an id by `ids`), instead of failing with `E_CSV_NO_ID_COLUMN`.                                                                                                                                         |

- <a id="import-delimiter"></a>`delimiter`: The field delimiter. The default is to detect it from the first rows: `,`, tab, `;`, `|` or space. It applies to the `nodes` table too.
- <a id="import-decimal"></a>`decimal`: The decimal separator of numbers. With ",", a cell such as `2,5` (digits, a comma, digits) is read as the number 2.5, for weights and attributes alike, and the delimiter is detected among the others (`;`, tab, `|`, space), so a spreadsheet saved in a locale that writes decimal commas reads as it is. A thousands separator is not read.
- <a id="import-header"></a>`header`: Whether the first row is a header; "auto" decides from its content (a header names columns, a data row holds ids and numbers). It applies to the `nodes` table too.
- <a id="import-table"></a>`table`: What the input is: "edges" (one edge per row), "nodes" (one node per row), "adjacency" (a node and its neighbors per row, `node,neighbor[:weight],...`, with no header unless you pass `header: true`), or "auto": an edge table when source and target columns can be found, a node table when only an id column can. An adjacency table is never detected, because its rows look like an edge list.
- <a id="import-sourcecolumn"></a>`sourceColumn`: The source column, by name or 0-based position. The default is the column whose header is a recognized source name (`source`, `from`, `src` and others; the CSV format page lists them all); in a file without a header, the first column. A header with no recognized source and target names needs this option and `targetColumn`.
- <a id="import-targetcolumn"></a>`targetColumn`: The target column, by name or 0-based position. The default is the column whose header is a recognized target name (`target`, `to`, `dst` and others; the CSV format page lists them all); in a file without a header, the second column.
- <a id="import-typecolumn"></a>`typeColumn`: The column that gives each edge's direction (Directed / Undirected / Mutual), by name or position. The default is the `Type` column of a Gephi table (one whose header has exactly `Source` and `Target`); null reads no such column.
- <a id="import-idcolumn"></a>`idColumn`: The id column of a node table, by name or position. The default is the column the header names `id` (or `node`, `name`, `key`).
- <a id="import-labelcolumn"></a>`labelColumn`: The label column of a node table, by name or position. The default is the column the header names `label` (in any case). With `nodeIdFrom: "label"`, the node ids come from this column, and the edge table must name its nodes by these labels too.
- <a id="import-nodes"></a>`nodes`: A node table to read before the edges: its ids become nodes and its other columns node attributes. Pass it as a string, bytes, a stream, or a `File` or `Blob` (the second file a user picked, say).
- <a id="import-rownumberids"></a>`rowNumberIds`: Give the nodes of a node table without an id column the row number as id (0 for the first data row, turned into an id by `ids`), instead of failing with `E_CSV_NO_ID_COLUMN`. It applies to the `nodes` table when you pass one, else to the input. Under `header: "auto"` that table's first row is then read as a header; under `header: false` the option is ignored with a warning, because a table without a header takes its ids from its first column.

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option                           | Type                                | Default   | Meaning                                                                                                                                                                         |
| -------------------------------- | ----------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`dialect`](#export-dialect)     | `"gephi" \| "generic"`              | `"gephi"` | The header spelling: "gephi" writes `Source,Target,Type,...,Weight`, with each edge's direction in `Type`; "generic" writes `source,target,...,weight` and no direction column. |
| [`table`](#export-table)         | `"adjacency" \| "nodes" \| "edges"` | `"edges"` | Which table to write.                                                                                                                                                           |
| [`delimiter`](#export-delimiter) | `string`                            | `","`     | The field delimiter.                                                                                                                                                            |
| [`newline`](#export-newline)     | `"\n" \| "\r\n"`                    | `"\n"`    | The line terminator.                                                                                                                                                            |
| [`header`](#export-header)       | `boolean`                           | `true`    | Whether to write the header row (an adjacency table never has one).                                                                                                             |

- <a id="export-dialect"></a>`dialect`: The header spelling: "gephi" writes `Source,Target,Type,...,Weight`, with each edge's direction in `Type`; "generic" writes `source,target,...,weight` and no direction column.
- <a id="export-table"></a>`table`: Which table to write. "edges": one edge per row, with the edge attributes; isolated nodes and node attributes are not in it. "nodes": one node per row, with the node attributes and no edges. "adjacency": a node and its neighbors per row, which keeps every node and the node order but no attributes (read it back with `table: "adjacency"`). To keep both nodes and edges, write the node table and the edge table to two files and read them back with the `nodes` import option.
- <a id="export-delimiter"></a>`delimiter`: The field delimiter.
- <a id="export-newline"></a>`newline`: The line terminator.
- <a id="export-header"></a>`header`: Whether to write the header row (an adjacency table never has one). A file without a header is read back by position: source, target, weight, then unnamed columns. checkExport() returns `W_CSV_HEADERLESS` when the table has other columns; for a plain headerless edge list, pass `dialect: "generic"` and write a graph whose edges have only weights.

## Import issue codes

The codes this format's import report can hold. They are also exported as `CSV_ISSUE` from `@graphty/graph-io/csv`, keyed by the code without its `E_` / `W_` and `CSV_` prefixes.

- `E_EMPTY_INPUT` (error): The input is empty. The import stops.
- `E_DUPLICATE_EDGE_ID` (error): An edge row repeating an edge id (skipped).
- `W_PRECISION` (warning): An integer beyond 2^53 was stored as the nearest 64-bit float; reported once per column.
- `E_INVALID_UTF8` (error): The input is not valid UTF-8. The import stops.
- `E_INVALID_ENCODING` (error): Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the `encoding` option). The import stops.
- `W_ENCODING_FALLBACK` (warning): Bytes that are not UTF-8 and declare no encoding were read as windows-1252.
- `W_UNKNOWN_ENCODING` (warning): A declared encoding the platform cannot decode was ignored.
- `E_CSV_NO_ENDPOINT_COLUMNS` (error): The header names no source and target columns and no id column. Pass `sourceColumn` and `targetColumn` to name the columns. The import stops.
- `E_CSV_NO_ID_COLUMN` (error): The node table has no id column. Pass `idColumn` to name it, or `rowNumberIds: true` to number the rows. The import stops.
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
- `W_CSV_PADDED_ID` (warning): An id that is not quoted has spaces at its start or end; they are kept, so it is a different id from the trimmed text. Reported once per import.
- `W_CSV_COMMENT_LIKE_RECORD` (warning): A leading # / % line skipped as a comment has the fields of a record.
- `W_CSV_TRAILING_DELIMITER` (warning): Every data row ends in one extra delimiter; the empty last cell is dropped. Reported once per import.
- `W_CSV_WEIGHT_AS_ATTRIBUTE` (warning): In a file without a header, the third column holds text, so it is read as an attribute, not as the edge weight. Reported once per import.

Like every format, it can also record the codes for unreadable input and for elements the graph refuses: [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED), [`E_INVALID_ID`](../codes.md#E_INVALID_ID), [`E_UNKNOWN_NODE`](../codes.md#E_UNKNOWN_NODE), [`E_INVALID_WEIGHT`](../codes.md#E_INVALID_WEIGHT), [`E_DUPLICATE_EDGE`](../codes.md#E_DUPLICATE_EDGE), [`E_SELF_LOOP`](../codes.md#E_SELF_LOOP).

## Loss codes

The codes `checkExport(snapshot, "csv", options)` can return before a save, also exported as `CSV_LOSS` from `@graphty/graph-io/csv`. An `E_` code means the save throws unless you change the graph or the options.

- `E_ID_TEXT_COLLISION` (error, the save throws): Two node ids would be written as the same text (the number 5 and the text "5"); the save fails with `E_INVALID_ID`.
- `W_ID_TEXT_TYPE` (warning): Ids that read back as a different type, such as the text "7" as the number 7.
- `W_CSV_DIRECTION_DROPPED` (warning): The generic dialect has no direction column; an undirected or mixed graph reads back as directed. The Gephi dialect loses the direction of an undirected graph without edges (no row carries a Type cell).
- `W_MUTUAL_EXPANDED` (warning): Mutual pairs are written as two directed rows.
- `W_CSV_RESERVED_NAME` (warning): An attribute column named like a reserved header is not written.
- `W_ROLE_ASSUMED` (warning): An attribute without a role is written where the format keeps a role (a `name` column as the label, say), and reads back with that role.
- `W_CSV_ROLE_NAME` (warning): A role column (id, label) whose name the importer does not recognize; the role is lost.
- `W_CSV_TEXT_ROLE` (warning): An id or label attribute that is not text reads back as text.
- `W_CSV_NONFINITE` (warning): NaN / Infinity in a numeric column read back as text.
- `W_TEXT_INFERRED` (warning): A text value that reads back as a number or a boolean, because the format does not record that it was text (the text "42" reads back as the number 42).
- `W_STORAGE_CLASS_CHANGED` (warning): A text attribute reads back as a dictionary attribute, or the reverse, because the importer chooses by how often its values repeat. The values are the same.
- `W_CSV_NODE_TABLE` (warning): Node attributes are written by a `table: "nodes"` export only.
- `W_CSV_ISOLATED_NODES` (warning): The edge table has no row for a node without edges, so isolated nodes are missing when the file is read back. Write the node table too (`table: "nodes"`).
- `W_CSV_NODE_ORDER` (warning): The edge table lists nodes in the order they first appear in an edge, so the node order changes when the file is read back.
- `W_CSV_EDGE_COLUMNS` (warning): An adjacency table holds no edge column but the weight: edge ids, labels and attributes are not written.
- `W_CSV_HEADERLESS` (warning): `header: false` with columns a file without a header cannot name: graph-io reads such a file by position (source, target, weight, then columns it names column4, column5, ...), so these columns read back under other names or in the wrong place (an edge id in the weight's place, say). Write the header, or write only source, target and weight with `dialect: "generic"`.

When the graph has something this format cannot hold, it can also return the [shared loss codes](../codes.md#shared-loss-codes): [`E_ID_CHARSET`](../codes.md#E_ID_CHARSET), [`E_MIXED_DIRECTION`](../codes.md#E_MIXED_DIRECTION), [`E_XML_ILLEGAL_CHAR`](../codes.md#E_XML_ILLEGAL_CHAR), [`W_COLUMN_DROPPED`](../codes.md#W_COLUMN_DROPPED), [`W_COLUMN_NAME_CHANGED`](../codes.md#W_COLUMN_NAME_CHANGED), [`W_COMPONENTS_FLATTENED`](../codes.md#W_COMPONENTS_FLATTENED), [`W_DEFAULT_DROPPED`](../codes.md#W_DEFAULT_DROPPED), [`W_DTYPE_UNSUPPORTED`](../codes.md#W_DTYPE_UNSUPPORTED), [`W_DYNAMIC_VALUES_DROPPED`](../codes.md#W_DYNAMIC_VALUES_DROPPED), [`W_EDGE_IDS_DROPPED`](../codes.md#W_EDGE_IDS_DROPPED), [`W_EDGE_IDS_GENERATED`](../codes.md#W_EDGE_IDS_GENERATED), [`W_EMPTY_COLUMN_DROPPED`](../codes.md#W_EMPTY_COLUMN_DROPPED), [`W_EXTENSION_TABLE_DROPPED`](../codes.md#W_EXTENSION_TABLE_DROPPED), [`W_GRAPH_ATTRIBUTES_DROPPED`](../codes.md#W_GRAPH_ATTRIBUTES_DROPPED), [`W_HIERARCHY_DROPPED`](../codes.md#W_HIERARCHY_DROPPED), [`W_ID_MANGLED`](../codes.md#W_ID_MANGLED), [`W_ID_RENUMBERED`](../codes.md#W_ID_RENUMBERED), [`W_INTEGRAL_F64_AS_I32`](../codes.md#W_INTEGRAL_F64_AS_I32), [`W_JSON_UNSUPPORTED`](../codes.md#W_JSON_UNSUPPORTED), [`W_LIST_UNSUPPORTED`](../codes.md#W_LIST_UNSUPPORTED), [`W_MIXED_DIRECTION`](../codes.md#W_MIXED_DIRECTION), [`W_MULTI_EDGES`](../codes.md#W_MULTI_EDGES), [`W_MUTUAL_AS_UNDIRECTED`](../codes.md#W_MUTUAL_AS_UNDIRECTED), [`W_NONFINITE_AS_NULL`](../codes.md#W_NONFINITE_AS_NULL), [`W_OPEN_INTERVAL`](../codes.md#W_OPEN_INTERVAL), [`W_OPTIONS_DROPPED`](../codes.md#W_OPTIONS_DROPPED), [`W_OPTIONS_GAINED`](../codes.md#W_OPTIONS_GAINED), [`W_PARENTS_DROPPED`](../codes.md#W_PARENTS_DROPPED), [`W_POSITIONS_DROPPED`](../codes.md#W_POSITIONS_DROPPED), [`W_ROLE_DROPPED`](../codes.md#W_ROLE_DROPPED), [`W_SELF_LOOPS`](../codes.md#W_SELF_LOOPS), [`W_SPELLS_DROPPED`](../codes.md#W_SPELLS_DROPPED), [`W_TEMPORAL_DROPPED`](../codes.md#W_TEMPORAL_DROPPED), [`W_TEMPORAL_TEXT_DROPPED`](../codes.md#W_TEMPORAL_TEXT_DROPPED), [`W_VIZ_DROPPED`](../codes.md#W_VIZ_DROPPED), [`W_WEIGHTS_DROPPED`](../codes.md#W_WEIGHTS_DROPPED), [`W_WEIGHT_KEY_CLASH`](../codes.md#W_WEIGHT_KEY_CLASH).

<!-- generated:end -->
