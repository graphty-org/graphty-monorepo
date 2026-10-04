# Previewing a Load

`session.data.import()` loads a file in one call. When a reader should see the file first --
its tables, its columns, which column the element will use as the node id or the edge weight,
and how many nodes and edges the load will make -- read it with `session.data.prepare()`
instead. Nothing is added to the graph until you call `draft.load()`, and the file is read only
once, however many times you ask what the load would do.

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const input = document.querySelector<HTMLInputElement>("#file")!;

input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    const draft = await element.session.data.prepare({ config: { file } });
    for (const table of draft.tables) {
        const firstRows = await draft.rows(table.id, { limit: 20 });
        console.table(firstRows.records.map((row) => row.values));
    }
    const report = await draft.report();
    console.log(report.counts.nodes, report.counts.edges, report.unmatched.rows);
    if (report.tooLarge) draft.dispose();
    else await draft.load();
});
```

`prepare` takes the same source `import` does: `{ config: { file } }` for a file the reader
picked, `{ config: { url } }` for a URL, `{ config: { nodeFile, edgeFile } }` for a pair of CSV
files, and `type: "csv"` (or any format name) beside `config` when the file's name does not say
what it is. [Data Sources](./data-sources) lists every format and its options.

`report()` is a dry run: it changes nothing, and `report.counts.nodes` and `report.counts.edges`
are the nodes and edges the graph would hold after the load -- the two numbers to show a reader.
(`counts.nodeRecords` and `counts.edgeRecords` count the records the file handed over, which
differ when edges create nodes or a record is rejected.) Every type on this page --
`LoadDraft`, `LoadChoices`, `LoadReport` and the rest -- is exported from
`@graphty/graphty-element/session`, along with the `isGraphtyError` guard.

When you already know which columns to use, skip the draft:

```ts
await element.session.data.import({ config: { file } }, { mapping: { source: "from", target: "to", weight: "trips" } });
```

## What a draft holds

| Member             | What it is                                                                     |
| ------------------ | ------------------------------------------------------------------------------ |
| `type`             | The format that read the file (`"csv"`, `"graphml"`, ...)                      |
| `tables`           | The file's tables: an `id`, the file `name`, `rowCount`, `fixed` and `columns` |
| `mapping`          | The element's own reading of every table's roles                               |
| `missing(choices)` | The roles each table still needs under those choices                           |
| `report(choices)`  | What `load(choices)` would do to the graph as it is now                        |
| `rows(id, page)`   | The rows of one table as the file holds them, a page at a time                 |
| `load(choices)`    | Loads the held rows as one undoable step                                       |
| `dispose()`        | Lets go of the held rows                                                       |

Table ids are assigned by the element and are the same for every file of the same shape:
`"rows"` for a single CSV file (so its rows are read with `draft.rows("rows")`), and `"nodes"`
then `"edges"`, in that order, for a pair of CSV files (`config: { nodeFile, edgeFile }`) and for
every other format. A single CSV file is therefore always `draft.tables[0]`.

`fixed: true` means the format, not the reader, decides each column's role: a GraphML, GEXF, GML,
DOT, Pajek or JSON file says which fields are node ids and edge endpoints, so a mapping for its
tables is refused. Only CSV tables have `fixed: false`.

Each column is described the way `session.data.attributes()` will describe it after the load:
`name`, `type`, `completeness` (the fraction of rows with a value), `uniqueCount` and
`sampleValues`. A column the element gives a role by itself carries it in `suggested`: `"key"`
(the node id), `"label"`, `"source"`, `"target"`, `"weight"`, `"time"` or `"edgeId"`. These are
the same names a mapping uses.

## Choosing the columns

A mapping names columns exactly as `column.name` spells them, never as an expression, so a column
called `shared chapters` or `a.b` is written as it is. A role left out is the element's own
reading; `null` means none.

```ts
// One table: a bare mapping.
await draft.report({ mapping: { source: "from", target: "to", weight: null } });

// Several tables: name each by id.
await draft.report({
    mapping: { tables: { nodes: { key: "badge" }, edges: { weight: "shared chapters" } } },
});
```

| Role      | Table | Meaning                                       |
| --------- | ----- | --------------------------------------------- |
| `rowsAre` | any   | `"nodes"` or `"edges"`: what each row becomes |
| `key`     | nodes | The node id column; `null` numbers the rows   |
| `label`   | nodes | The column that names a node                  |
| `source`  | edges | The column holding the node an edge leaves    |
| `target`  | edges | The column holding the node an edge enters    |
| `weight`  | edges | The weight column; `null` weighs every edge 1 |
| `time`    | any   | A time column                                 |
| `edgeId`  | edges | The edge's own id column                      |

The same list is published as `LOAD_ROLES` from `@graphty/graphty-element/session`, so a role
menu never keeps its own copy: `LOAD_ROLES.nodes.takes` and `LOAD_ROLES.edges.takes` are the roles
a table of each kind takes (beside `rowsAre`), and `requires` the ones a load cannot do without --
`source` and `target` for an edge table, nothing for a node table.

```ts
import { LOAD_ROLES } from "@graphty/graphty-element/session";

const menu = LOAD_ROLES[draft.mapping.tables[table.id].rowsAre].takes; // the roles to offer
const ready = draft.missing(choices)[table.id].length === 0; // a per-table check mark
```

`draft.missing(choices)` names, for every table, the required roles those choices leave unset;
an empty list means the table is ready. `report` and `load` refuse a CSV table that is not ready
with `E_EDGE_ENDPOINTS_UNRESOLVED`, whose `details.table` names the table and `details.missing`
the roles, so with two tables you can mark only the one at fault.

When a table read as edges has no weight column, `table.weightCandidate` names a column that
could be one -- the first column holding a number on every row that no other role reads. It is an
offer, not a choice: nothing is weighted until the mapping names it (`{ weight: table.weightCandidate }`).

The load records the label, weight, time and edge id columns in the graph's settings
(`session.config.data.knownFields`), so every later read of a node's label or an edge's weight
uses the column the reader chose. You do not write those settings yourself.

`draft.mapping` always reads back in the full form: every table by id, `rowsAre` set, and `source`
and `target` as `{ column }`. It and each column's `suggested` are the same reading seen from two
sides, so they always agree, and a role your mapping leaves out falls back to it. To find the
column the element picked for a role, read either:

```ts
import type { ColumnRole, DraftTable } from "@graphty/graphty-element/session";

const suggestedFor = (table: DraftTable, role: ColumnRole): string | undefined =>
    table.columns.find((column) => column.suggested === role)?.name;
```

`report(choices)` and `load(choices)` each take their own choices; `load()` does not reuse the
ones the last `report()` was given. Hold them in one `LoadChoices` value and pass it to both.
Typing the value as `LoadChoices` keeps `"leave-out"` and `"merge"` from widening to `string`:

```ts
import type { LoadChoices } from "@graphty/graphty-element/session";

const choices: LoadChoices = { mapping: { source: "from", target: "to" }, unmatched: "leave-out" };
const report = await draft.report(choices);
if (report.tooLarge === null) await draft.load(choices);
```

Other choices `report`, `load` and `import` take:

- `mode`: `"replace"` (the default) empties the graph first; `"merge"` adds to it, and the report
  counts against the graph already there. This is the session's own default; the element's
  `loadFromFile` and `loadFromUrl` methods add to the graph unless they are passed
  `replace: true` (see [Data Sources](./data-sources#replacing-the-graph)).
- `unmatched`: an edge naming a node no node row holds. `"add"` (the default) makes the node;
  `"leave-out"` drops the edge.
- `duplicateIds`: a node row repeating an id an earlier node row gave. `"first"` (the default)
  keeps the first row's node; `"merge"` also writes the later row's values onto it, later rows
  winning; `"refuse"` refuses the load with `E_DUPLICATE_ID`, whose `details.id` names the id.
- `directed`: writes `data.directed` in the same undoable step as the load.
- `layout`: `"recommended"` also picks a layout for what was loaded.

## The report

`draft.report(choices)` returns the same `LoadReport` that `session.data.lastImport()` returns
after the load, so the numbers before and after cannot disagree. Beside the import report's
`counts`, `weights` and `endpoints` it has:

- `unmatched`: `{ rows, values }`: `rows` is the number of edge rows naming a node no node row
  holds (nor the graph, for a merge), and `values` the number of distinct node ids those rows
  name -- the nodes `unmatched: "add"` would create. A load with no node rows into an empty
  graph has none: every node comes from the edges.
  `draft.rows("edges", { only: "unmatched", choices })` lists those rows.
- `duplicates`: `{ rows, ids }`: how many node rows repeat an id an earlier node row gave, and
  the distinct ids. A report counts them under every `duplicateIds` choice, `"refuse"` included,
  so you can say "2 rows repeat an id" before the load refuses.
- `counts.rejected`: rows that become nothing -- a node row with no usable id (an empty or
  missing id cell) and an edge row whose ends cannot be node ids. A load never refuses for
  them; `draft.rows(id, { only: "rejected" })` lists them.
- `tooLarge`: `null` when the load fits; otherwise the `details` the load would refuse with as
  `E_TOO_LARGE`: `{ limit, count, of, graph }` -- the limit, the count that passed it, whether
  that count is of `"nodes"` or `"edges"`, and the nodes and edges the graph held when the batch
  that passed the limit arrived. Nodes an edge creates count too. A draft that is too large can
  still fit with other choices: when the load has node rows, `unmatched: "leave-out"` drops the
  edges to nodes the file never declared, and the nodes they would have created. Call `report()`
  again with them; if nothing fits, `dispose()` the draft.

`draft.rows(id, { offset, limit, only, choices })` pages through a table as
`{ records, offset, total }`, each record `{ line, values }`. For a CSV file `line` is the line the
row starts on (the header is line 1); for other formats it is the row's position. `only` picks
which rows:

| `only`        | The rows                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------- |
| `"unmatched"` | Edge rows naming a node no node row holds (nor the graph, for a merge)                   |
| `"rejected"`  | Rows whose key or endpoints cannot be a node id                                          |
| `"loaded"`    | Rows the load makes into nodes or edges: not rejected, nor unmatched under `"leave-out"` |

Pass the same `choices` you passed `report()`, so the rows listed are the rows it counted. Without
`choices` the rows are read with the draft's own mapping, replacing the graph; a draft never
reuses the choices an earlier call was given.

```ts
const choices = { mode: "merge", unmatched: "leave-out" } as const;
const report = await draft.report(choices);
const unmatched = await draft.rows("edges", { only: "unmatched", choices, limit: Infinity });
// unmatched.total === report.unmatched.rows
```

A rejected row here is one the mapping cannot turn into a node or an edge; it is not a row the
format's own schema refused, which `data-loading-error-summary` reports after a load.

## Errors

Every failure is a `GraphtyError` with a `code` and a `details` object. `isGraphtyError` narrows a
caught value to it:

```ts
import { isGraphtyError } from "@graphty/graphty-element/session";

try {
    await draft.load(choices);
} catch (error) {
    if (isGraphtyError(error) && error.code === "E_UNKNOWN_ATTRIBUTE") console.log(error.details.candidates);
}
```

| Code                          | When                                                                        |
| ----------------------------- | --------------------------------------------------------------------------- |
| `E_UNKNOWN_FORMAT`            | `prepare` cannot tell what the file is                                      |
| `E_UNKNOWN_ATTRIBUTE`         | A mapping names a column the table does not have; `details.candidates`      |
| `E_BAD_COMMAND`               | A role the table's rows cannot have, an unknown table, a `fixed` table      |
| `E_EDGE_ENDPOINTS_UNRESOLVED` | `report` or `load` finds no endpoint columns; name `source` and `target`    |
| `E_PARSE_FAILED`              | The file cannot be read as its format; `details.format`, `details.line`     |
| `E_EMPTY_LOAD`                | The file was read and holds nothing to load (empty, or a header only)       |
| `E_TOO_LARGE`                 | `load` passes the element's limit; `report` puts it in `tooLarge`           |
| `E_DUPLICATE_ID`              | `load` with `duplicateIds: "refuse"` meets a repeated node id; `details.id` |
| `E_DISPOSED`                  | The draft was loaded or disposed                                            |

`details` is typed `Readonly<Record<string, unknown>>` for every code, so check a value's type
before using it (`Array.isArray(error.details.candidates)`).

Only one draft is held at a time. A new `prepare`, and any `import`, disposes the one before it,
and a successful `load` disposes its own. Disposing lets go of the rows only: `draft.type`,
`draft.tables` and `draft.mapping` stay readable, and only the methods refuse with `E_DISPOSED`.

## Showing progress

Reading a large file takes a while, and so does loading it. Both report on the
`progress:changed` session event (`graphty-progress-change` on the element): `prepare` with
`task: "prepare"`, and the load with `task: "load"`. Each sends `phase: "start"` before anything
is read, then the rows or records read so far in `completed`, then `phase: "end"` with an
`outcome` of `"succeeded"`, `"failed"` or `"cancelled"`. `source.name` names the file.

```ts
session.on("progress:changed", (change) => {
    if (change.task !== "prepare") return;
    status.textContent =
        change.phase === "end" ? "" : `Reading ${change.source?.name ?? "data"}: ${change.completed} rows`;
});
const draft = await session.data.prepare({ config: { file } });
```

A file's size is not known as rows, so `total` and `fraction` are `null`: show a count, not a
bar. A CSV file is parsed in one pass, so its row count arrives once the file is read; a graph
file's arrives a chunk at a time. See [Columns, Runs & Progress](./vocabulary) for the fields.
