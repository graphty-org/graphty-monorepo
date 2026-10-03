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
a path.

## Naming a column

Each entry in `columns` names a run, either on its own or with one of its fields:

| You pass                      | It reads                                                        |
| ----------------------------- | --------------------------------------------------------------- |
| `run`                         | the run's primary field (`value`, or `group` for a community)   |
| `{ run, field: "groupSize" }` | that field                                                      |
| `"pagerank_1a2b"` (a string)  | the run with that id; a string is always a run id, never a path |

`run` can be the handle `element.run()` returns, its awaited result, or its id. `sort` takes the
same `{ run, field? }`, plus `descending`. A sort by one of the records' own keys is still
`{ key: "weight" }`, and a key is always read literally: an imported column that happens to be
named `results.x.value` is just that column.

## What comes back

`page.columns` is present only when you asked for `columns`, and holds one entry per column in the
order you asked:

| Member    | What it holds                                                                  |
| --------- | ------------------------------------------------------------------------------ |
| `run`     | the run's id                                                                   |
| `field`   | the field read, after the primary-field default                                |
| `path`    | the field's path, `results.<run>.<field>`, as a style layer or filter reads it |
| `type`    | `"number"`, `"integer"`, `"boolean"` or `"string"`                             |
| `pending` | `true` while the run has no result yet; every cell is then `undefined`         |
| `values`  | one cell per record, aligned with `page.records`                               |

A cell is `undefined` where the run has no value for that record (it was outside the run's scope,
say). The records themselves are unchanged. graphty-element gives you values, not words: a header,
a number format, or a name for a community is your table's decision.

## Order

- Records the run measured come first, in value order. Equal values keep the graph's order, so a
  page boundary can split a tie; `results.get(run).top(field, n)` and the `{ top }` selection keep
  ties together instead.
- Records with no value come last, in either direction.
- A grouping field (a community's `group`, a hierarchy's `level`) sorts by group size, largest group
  first when `descending`, not by the group's id.

## Keeping a table current

A page carries a `revision`. It changes when a run publishes or clears its result, or is
removed, as well as on every edit. Listen for `run:changed` and `project:changed`, and read the
page again when `revision` differs from the one you hold; `run:changed` also fires on progress
ticks, which do not move it. A rerun keeps showing its previous values until the new ones publish.

## Errors

| Code                  | When                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `E_UNKNOWN_RUN`       | the session holds no such run; `details.candidates` lists the nearest ids                                                                                                      |
| `E_UNKNOWN_ATTRIBUTE` | the run publishes no field of that name; `details.candidates` lists the nearest                                                                                                |
| `E_BAD_COMMAND`       | the field has no value per record here: a graph-level number such as modularity, a table, or an edge field on `nodePage` (and the reverse). Read those from `results.get(run)` |
