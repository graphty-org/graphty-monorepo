# Result Columns

A table of nodes or edges often needs an algorithm's result beside each record -- a PageRank
score, a community, an edge's betweenness -- and needs to sort by it. `session.data.nodePage()`
and `edgePage()` do both. You name the run; graphty-element reads the values and sorts them.

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const run = await element.run("pagerank");

const page = element.session.data.nodePage({
    columns: [run],
    sort: { run, descending: true },
    limit: 10,
});
const [rank] = page.columns ?? [];

page.records.forEach((node, i) => {
    console.log(node.id, rank?.values[i]);
});
```

That prints the ten highest-ranked nodes, highest first. You never write a run id, a field name or
a path. `element.run()` can be called before the graph has loaded: the run waits for the data.

## Naming a column

Each entry in `columns` names a run, either on its own or with one of its fields:

| You pass                      | It reads                                                        |
| ----------------------------- | --------------------------------------------------------------- |
| `run`                         | the run's primary field (see below)                             |
| `{ run, field: "groupSize" }` | that field                                                      |
| `"pagerank"` (a string)       | the run with that id; a string is always a run id, never a path |

`run` can be the handle `element.run()` returns, its awaited result, or its id. `sort` takes the
same `{ run, field? }`, plus `descending`.

`sort` has two forms, and which one you write decides what is read:

- `{ run }` or `{ run, field }` sorts by a run's result.
- `{ key: "weight" }` sorts by one of the records' own attributes, and only that. A key is never
  read as a result: `{ key: "results.pagerank.value" }` sorts by an imported attribute that happens
  to have that name, and by nothing when there is none. To sort by a result, name the run.

The primary field comes from the run's `shape` (`run.shape`, or `shape` on the algorithm's entry
in `session.catalog.algorithms()`):

| `shape`                      | Primary field |
| ---------------------------- | ------------- |
| `node-metric`, `edge-metric` | `value`       |
| `community`                  | `group`       |
| `layered-grouping`           | `level`       |
| `category-table`             | `category`    |
| `path`                       | `onPath`      |
| `node-set`, `edge-set`       | `in`          |
| `pair-list`                  | `pairs`       |
| `temporal`                   | `series`      |
| `fact`                       | none          |

`pairs` and `series` are not one value per record, so a column of them is refused with
`E_BAD_COMMAND`, as is a `fact` run with no field named; read those from `results.get(run)`.

## What comes back

`page.columns` is present only when you asked for `columns`, and holds one entry per column in the
order you asked:

| Member    | What it holds                                                                  |
| --------- | ------------------------------------------------------------------------------ |
| `run`     | the run's id, a string, whatever form you named the run in                     |
| `field`   | the field read, after the primary-field default                                |
| `path`    | the field's path, `results.<run>.<field>`, as a style layer or filter reads it |
| `type`    | `"number"`, `"integer"`, `"boolean"` or `"string"`                             |
| `pending` | `true` while the run has no result yet; every cell is then `undefined`         |
| `values`  | one cell per record, aligned with `page.records`                               |

`pending` only matters for a run you have not awaited: a column on a still-running handle comes
back pending, and an awaited run never is.

A cell is `undefined` where the run has no value for that record (it was outside the run's scope,
say). The records themselves are unchanged. graphty-element gives you values, not words: a header,
a number format, or a name for a community is your table's decision.

## Order

- Records the run measured come first, in value order. Equal values keep the graph's order, so a
  page boundary can split a tie; `results.get(run).top(field, n)` and the `{ top }` selection keep
  ties together instead.
- Records with no value are kept, not dropped: they sort after every record with a value, in
  either direction. A top-ten page over a run that measured six records holds those six first,
  then four with `undefined` cells.
- A grouping field (a community's `group`, a hierarchy's `level`) sorts by group size, largest group
  first when `descending`, not by the group's id.

## Keeping a table current

A page carries a `revision`. It belongs to the session, not to the page: every page read at the
same moment has the same `revision`, whatever its options, so `nodePage({ limit: 0 })` is a cheap
way to ask whether anything changed. It moves when a run publishes or clears its result, or is
removed, and on every edit; it does not move when a run starts or reports progress.

```ts
const options = { columns: [run], sort: { run, descending: true }, limit: 20 };
let page = element.session.data.nodePage(options);

function reread(): void {
    if (element.session.data.nodePage({ limit: 0 }).revision === page.revision) {
        return;
    }
    page = element.session.data.nodePage(options);
    // redraw
}
const stopRuns = element.session.on("run:changed", reread);
const stopEdits = element.session.on("project:changed", reread);
// later: stopRuns(); stopEdits();
```

`session.on()` returns the function that removes the listener. A page with `columns` sorts once
per revision and then serves every read of that revision from the same order, so rereading on
every event costs one revision check until something actually changed.

A run's handle names that one run for as long as it exists. Running the algorithm again with a
setting the name does not carry (the seed, the iteration cap) re-runs it in place: the page keeps
showing its previous values until the new ones publish. Running it with a setting the name does
carry (PageRank's damping, say) starts a different run with its own id, `pagerank_damping_0_9`,
and leaves the first one alone; put the new handle in `columns` to show it.

Once a run is removed -- by `session.runs.remove()`, or by an undo of the run -- naming it throws
`E_UNKNOWN_RUN`. Both change the revision, so check `session.runs.get(run.id)` in your reread and
drop the column when it returns `undefined`.

## Errors

| Code                  | When                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_UNKNOWN_RUN`       | the session holds no such run; `details.candidates` lists the nearest ids                                                                                                                                     |
| `E_UNKNOWN_ATTRIBUTE` | the run publishes no field of that name; `details.candidates` lists the nearest                                                                                                                               |
| `E_BAD_COMMAND`       | the call is malformed, because the field has no value per record here: a graph-level number such as modularity, a table, or an edge field on `nodePage` (and the reverse). Read those from `results.get(run)` |
