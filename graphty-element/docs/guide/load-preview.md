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
    const report = await draft.report();
    const firstRows = await draft.rows(draft.tables[0].id, { limit: 20 });
    console.table(firstRows.records.map((row) => row.values));
    console.log(report.counts.nodes, report.counts.edges, report.unmatched.rows);
    if (report.tooLarge) return draft.dispose();
    await draft.load();
});
```

When you already know which columns to use, skip the draft:

```ts
await element.session.data.import(
    { config: { file } },
    { mapping: { source: "from", target: "to", weight: "trips" } },
);
```

## What a draft holds

| Member            | What it is                                                                     |
| ----------------- | ------------------------------------------------------------------------------ |
| `type`            | The format that read the file (`"csv"`, `"graphml"`, ...)                      |
| `tables`          | The file's tables: an `id`, the file `name`, `rowCount`, `fixed` and `columns` |
| `mapping`         | The element's own reading of every table's roles                               |
| `report(choices)` | What `load(choices)` would do to the graph as it is now                        |
| `rows(id, page)`  | The rows of one table as the file holds them, a page at a time                 |
| `load(choices)`   | Loads the held rows as one undoable step                                       |
| `dispose()`       | Lets go of the held rows                                                       |

Table ids are assigned by the element and are the same for every file of the same shape:
`"rows"` for a single CSV file, `"nodes"` and `"edges"` for a pair of CSV files
(`config: { nodeFile, edgeFile }`) and for every other format. A GraphML, GEXF, GML, DOT, Pajek or
JSON file sets its own roles, so its tables are `fixed: true` and a mapping for them is refused.

Each column is described the way `session.data.attributes()` will describe it after the load:
`name`, `type`, `completeness` (the fraction of rows with a value), `uniqueCount` and
`sampleValues`. A column the element gives a role by itself carries it in `suggested`: `"key"`,
`"label"`, `"source"`, `"target"`, `"weight"`, `"time"` or `"edgeId"`.

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

| Role      | Table | Meaning                                                                        |
| --------- | ----- | ------------------------------------------------------------------------------ |
| `rowsAre` | any   | `"nodes"` or `"edges"`: what each row becomes                                  |
| `key`     | nodes | The node id column; `null` numbers the rows                                    |
| `label`   | nodes | The column that names a node; written to `data.knownFields.nodeLabelPath`      |
| `source`  | edges | The column holding the node an edge leaves                                     |
| `target`  | edges | The column holding the node an edge enters                                     |
| `weight`  | edges | The weight column; `null` weighs every edge 1; written to `edgeWeightPath`     |
| `time`    | any   | A time column; written to `nodeTimePath` or `edgeTimePath`                     |
| `edgeId`  | edges | The edge's own id column; written to `edgeIdPath`                              |

`draft.mapping` always reads back in the full form: every table by id, `rowsAre` set, and `source`
and `target` as `{ column }`.

Other choices `report`, `load` and `import` take:

- `mode`: `"replace"` (the default) empties the graph first; `"merge"` adds to it, and the report
  counts against the graph already there.
- `unmatched`: an edge naming a node no node row holds. `"add"` (the default) makes the node;
  `"leave-out"` drops the edge.
- `directed`: writes `data.directed` in the same undoable step as the load.
- `layout`: `"recommended"` also picks a layout for what was loaded.

## The report

`draft.report(choices)` returns the same `LoadReport` that `session.data.lastImport()` returns
after the load, so the numbers before and after cannot disagree. Beside the import report's
`counts`, `weights` and `endpoints` it has:

- `unmatched`: `{ rows, values }`, the edge rows naming a node no node row holds (nor the graph,
  for a merge), and how many distinct names they used. A load with no node rows into an empty
  graph has none: every node comes from the edges. `draft.rows("edges", { only: "unmatched" })`
  lists those rows.
- `tooLarge`: `null` when the load fits; otherwise the `details` the load would refuse with as
  `E_TOO_LARGE`: `{ limit, count, of, graph }`.

`draft.rows(id, { offset, limit, only })` pages through a table as `{ records, offset, total }`,
each record `{ line, values }`. For a CSV file `line` is the line the row starts on (the header is
line 1); for other formats it is the row's position. `only: "unmatched"` and `only: "rejected"`
(rows whose key or endpoints cannot be a node id) read with the choices the last `report()` was
given.

## Errors

| Code                          | When                                                                     |
| ----------------------------- | ------------------------------------------------------------------------ |
| `E_UNKNOWN_FORMAT`            | `prepare` cannot tell what the file is                                   |
| `E_UNKNOWN_ATTRIBUTE`         | A mapping names a column the table does not have; `details.candidates`   |
| `E_BAD_COMMAND`               | A role the table's rows cannot have, an unknown table, a `fixed` table   |
| `E_EDGE_ENDPOINTS_UNRESOLVED` | `report` or `load` finds no endpoint columns; name `source` and `target` |
| `E_EMPTY_LOAD`                | The file holds nothing to load                                           |
| `E_TOO_LARGE`                 | `load` passes the element's limit; `report` puts it in `tooLarge`        |
| `E_DISPOSED`                  | The draft was loaded or disposed                                         |

Only one draft is held at a time. A new `prepare`, and any `import`, disposes the one before it,
and a successful `load` disposes its own.

Progress for the load itself arrives on the `progress:changed` session event, with
`task: "load"`; see [Columns, Runs & Progress](./vocabulary).
