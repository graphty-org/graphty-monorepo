# Joining Data

A second table often describes the graph you already loaded: an expression table with one row
per gene, a log of door entries naming a person and a building, a list of the phones and devices
each account used. Joining reads that table ONTO the graph: its rows become values on the nodes
or edges they name, new edges between nodes, or links between nodes that share a value.

```ts
const element = document.querySelector("graphty-element")!;
const { data } = element.session;

// Read the table onto the graph already loaded; nothing changes yet
const draft = await data.prepare({ config: { file } }, { onto: "graph" });
const suggestion = draft.suggestJoin(); // { shape: "node-values", keys: [{ file: "symbol", graph: "id" }], ... }
console.log(draft.joinReport(suggestion)); // { matched: 2, notInGraph: 1, extraIgnoringCase: 1, ... }
await draft.load({ join: suggestion }); // one undo step

// Later: join it again with other choices, or take it back
const join = data.joins().at(-1); // the newest join
if (join) {
    await data.editJoin(join.source, { ...join.choices, ignoreCase: true });
    await data.removeSource(join.source);
}
```

- **`prepare(source, { onto: "graph" })`** reads the file once and holds it. It takes the same
  source `import` does (see [Previewing a Load](./load-preview)).
- **`suggestJoin()`** reads what the rows are and which column matches which graph value.
- **`joinReport(choices)`** counts what a join would do without changing anything, so a picker
  can show the counts while the reader changes the choices.
- **`load({ join })`** joins, as one undoable step. The table stays a source:
  `data.sources()` lists it with `kind: "join"`, `data.joins()` lists the join with its choices,
  and the join is saved with the project.
- **`editJoin(source, choices)`** takes the join back and joins the table again, as one step.
  `editJoinReport(source, choices)` counts that first.
- **`removeSource(source)`** takes the join back completely: the values it wrote are put back as
  they were, and the edges and nodes only it made are removed.

## Keys

A key pairs a column of the table (`file`) with a graph value (`graph`): `"id"` for the node id
(or edge id), or `"data.<column>"` for one of the graph's own columns. A join matches on any graph
column, not only the id: a door log's `person_id` matches the people's `person_id` column.

```ts
const choices = {
    keys: [{ file: "person_id", graph: "data.person_id" }],
    ignoreCase: true, // tp53 matches TP53
    ignoreSpaces: true, // "TP53 " matches TP53
};
```

Two keys on a values join make a compound key. An `"edges"` join takes exactly two: the source
end, then the target end, each on its own graph value.

## What a join does: its shape

`choices.shape` says what the rows are. Absent, the suggestion's shape is used.

| Shape           | One row is                | The join                                                                |
| --------------- | ------------------------- | ----------------------------------------------------------------------- |
| `"node-values"` | values for one node       | writes the row's columns onto the node its key names                    |
| `"edge-values"` | values for one edge       | writes the row's columns onto the edge its key names                    |
| `"edges"`       | an edge between two nodes | adds an edge; an end the graph lacks becomes a new node                 |
| `"link"`        | the values one node holds | links the nodes that share a value in the columns you name              |
| `"merge"`       | a node of a second list   | merges the row into the node it names; a row naming none becomes a node |

### Values onto nodes or edges

| Choice      | What it does                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `columns`   | The columns to bring; every column but the keys by default                                                            |
| `clash`     | Per column the graph already has: `"keep"`, `"overwrite"` or `"both"` (default, written as `<column> (<table name>)`) |
| `repeated`  | Several rows with one key: `"first"` (default), `"last"`, or `"both"` (a list of values)                              |
| `aggregate` | Reduce a key's rows to one value per column (see below)                                                               |

### Edges from rows naming two ends

A door log names a person and a building on each row. `suggestJoin()` finds the two columns whose
values name different nodes in each row, on whichever graph value they match:

```ts
const draft = await data.prepare({ config: { file: doorEntries } }, { onto: "graph" });
const suggestion = draft.suggestJoin();
// { shape: "edges", keys: [{ file: "person_id", graph: "data.person_id" }, { file: "building_id", graph: "id" }] }
await draft.load({ join: { ...suggestion, aggregate: { time: ["count", "first", "last"] } } });
// one edge per person and building, with "time (count)", "time (first)" and "time (last)"
```

| Choice        | What it does                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `unknownEnds` | A row with an end the graph lacks: `"add"` the end as a new node (default) or `"leave-out"` the row |
| `repeated`    | Several rows for one pair: `"first"` (default) or `"both"` (one edge per row)                       |
| `aggregate`   | One edge per pair, with its rows reduced (below)                                                    |
| `endKinds`    | The `kind` of the nodes the join makes, by end: `{ target: "go-term" }`                             |
| `kindIds`     | With `endKinds`: `"scoped"` matches an end only to nodes of its kind                                |

A membership table (gene, GO term) is an edges join whose second end names things the graph
lacks: `{ shape: "edges", keys, endKinds: { target: "go-term" } }` makes one node per term and an
edge from each gene to its terms.

### Reducing repeated rows: `aggregate`

`aggregate` names, per column, how a key's rows (for edges, a pair's rows) become one value:
`"count"`, `"sum"`, `"min"`, `"max"`, `"mean"`, `"first"`, `"last"` or `"list"`. One reduction is
written under the column's name; several are written as `<column> (<reduction>)`. A key column
may be named, to count the rows; its reduction is always written as `<column> (<reduction>)`, so
the key keeps its own value.

```ts
await draft.load({ join: { keys, aggregate: { amount: "sum" } } }); // amount = the sum of the rows
await draft.load({ join: { keys, aggregate: { amount: ["count", "max"] } } }); // "amount (count)", "amount (max)"
```

### Linking nodes that share a value

A list of the phones and devices each account used links the accounts that share one. Each row
maps to its node through the key; a value held by 2 to `maxShared` nodes links them.

```ts
const draft = await data.prepare({ config: { file: identifiers } }, { onto: "graph" });
const suggestion = draft.suggestJoin();
// { shape: "node-values", keys: [{ file: "account", graph: "id" }], link: { columns: ["phone", "device"] } }
if (suggestion.link) {
    await draft.load({ join: { ...suggestion, shape: "link" } });
}
// one edge per linked pair; its "shared" value is how many values the pair shares

// or name the columns yourself
await draft.load({ join: { keys: [{ file: "account", graph: "id" }], shape: "link", link: { columns: ["phone"] } } });
```

`suggestJoin()` names the columns that fit in `link` when a few nodes share their values (an
identifier, not a measurement or a category held by most nodes). It still suggests the values
join; linking is your choice. When no column fits, `link` is absent and a link join needs
`link.columns` of your own.

| `link` field | What it does                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `columns`    | The columns whose shared values link nodes (required)                                               |
| `as`         | `"edges"` (default): one edge per pair. `"nodes"`: one node per shared value, linked to each holder |
| `maxShared`  | A value more nodes hold than this links none of them; default 10                                    |
| `minShared`  | For `"edges"`: the values a pair must share to be linked; default 1                                 |
| `kind`       | The `kind` of the new edges (and, with `"nodes"`, the new nodes)                                    |

The report counts `pairsLinked`, `valuesOverCap` (shared too widely, skipped) and
`pairsBelowMin`.

### Merging a second list of the same things

Two systems list the same suppliers under different ids. Merge on the column they agree on:

```ts
await draft.load({ join: { keys: [{ file: "name", graph: "data.name" }], shape: "merge", ignoreCase: true } });
```

A matched row is written onto its node as a values join is; a row naming no node becomes a new
node (`unmatchedFrom: "drop"` leaves it out). `data.sourcesOf(id)` names both loads for a merged
node, and removing the join splits them back. The report counts `merged`, `onlyFrom`,
`onlyOnto` and `fanOut` (rows matching more than one node).

### Comparing two graphs

`compare: true` on a merge compares the table, read as a second graph's nodes, with the graph, and
writes each node's region to a membership column: `"both"`, `"only-from"` (the table alone holds
it) or `"only-onto"` (no row names it). Every node is kept; a filter on the membership column
keeps the union (every node), the intersection (`"both"`) or a difference (`"only-from"` or
`"only-onto"`).

```ts
await draft.load({ join: { keys, shape: "merge", compare: true, membership: "in" } });
// a filter on in == "both" keeps the intersection
```

A clashing column of the table is written as `<column> (<table name>)`, so both graphs' values
sit side by side. The report's `regions.nodes` counts each region, by the same codes.

### Translating keys through a mapping table

When the table's keys are another naming of the graph's (gene symbols against Ensembl ids), read
the mapping table with `lookup()` and pass it as `lookup`. It is held apart from the graph: none of
its rows becomes a node or an edge, and it is saved with the join.

```ts
const crosswalk = await data.prepare({ config: { file: symbolToEnsembl } });
const lookup = crosswalk.lookup(); // { name, columns: ["symbol", "ensembl"], rows }
crosswalk.dispose();

const expression = await data.prepare({ config: { file } }, { onto: "graph" });
await expression.load({ join: { keys: [{ file: "symbol", graph: "id" }], lookup, mapping: { many: "first" } } });
```

When the mapping table is a load already in the graph, pass its key (`data.sources()`) as `via`
instead; it is read as its rows. A join takes one or the other: both together is refused
(`E_BAD_COMMAND`, reason `"via-and-lookup"`).

`mapping.columns` names its two columns (by default, the ones whose values meet the table's keys
and the graph's most). The report counts `unmapped` and `mappedToMany` keys.

## Several joins at once: a recipe

`prepareJoins()` holds an ordered list of joins and runs them on a copy of the graph, so every
step's counts, each row's fate and the graph they leave can be shown before anything changes. A
step reads a loaded source (by its `sources()` key) or a table the recipe holds, and matches the
graph the steps before it leave. `commit()` joins them all as one undo step, leaving out a step that changes nothing.

```ts
const recipe = data.prepareJoins();
const read = await data.prepare({ config: { file: doorEntries } });
const entries = recipe.hold(read.lookup()); // held apart from the graph
read.dispose();

const step = recipe.add({ from: entries, choices: recipe.suggest(entries) });
recipe.outcome(step).report; // { matched: 240, newNodes: 12, ... }
recipe.rows(step, { offset: 0, limit: 50 }); // the rows, each with its fate
recipe.preview().nodes; // the graph the recipe leaves, each element's fate: "added", "updated", ...
recipe.undo(); // the recipe keeps its own history
await recipe.commit(); // or recipe.discard()
```

`fuse` combines a clashing column's two values (`{ rating: "max" }`), `flag` marks what a
reference list names (`{ columns: [], flag: "watchlisted" }`), and `split` reads a cell holding
several values (`{ tags: ";" }`). `recipe.clashes(step, column)` lists the clashes of a column.

## Naming what a join writes

A join derives some names: a reduction's `<column> (<reduction>)`, a clashing column's
`<column> (<table name>)` and a link edge's `shared`. `names` replaces them, by the derived name:

```ts
await draft.load({ join: { keys, aggregate: { amount: ["count", "sum"] }, names: { "amount (count)": "orders" } } });
```

## What happened to each row

`joinReport(choices).rowFates` gives each row's fate, in table order: `"joined"`, `"new-end"`,
`"repeat"`, `"left-out"`, `"merged"`, `"linked"` or `"over-cap"`. They are codes; your
application writes the words. `clashes` lists the incoming columns the graph already has, each
with the code `"clash"`.
