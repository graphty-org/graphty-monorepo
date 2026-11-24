# Experiments

Some features land in graphty-element before they are finished. Each one is an **experiment**,
switched off unless the page switches it on. With an experiment off, the element behaves exactly
as it would without that experiment's code.

## Switching experiments on

```html
<graphty-element features="file-styles location-map"></graphty-element>
```

- `features` takes space-separated ids. `all` switches on every experiment this build has except
  `source-steps`, which is switched on only by its own id.
- From a framework, set the property: `element.features = ["file-styles"]`.
- Without a browser: `createGraphSession({ features: ["file-styles"] })` from
  `@graphty/graphty-element/session`.
- For every element and session on the page that names none of its own, call
  `setDefaultFeatures(["file-styles"])` from `@graphty/graphty-element/extend` before they are created.

The element reads `features` once, when it first renders. A later change applies to the next
session it creates.

## From the page address

The element never reads the page's address itself. To let readers switch experiments on with a
link such as `?features=file-styles`, pass the address to the parser:

```ts
import { featuresFromUrl } from "@graphty/graphty-element/catalog";

document.querySelector("graphty-element").features = featuresFromUrl(location.href);
```

## What was switched on

```ts
element.addEventListener("graphty-features", (event) => {
    console.log(event.detail.enabled, event.detail.unknown);
});
```

`element.enabledFeatures` (or `session.features`) holds the same object: `enabled` lists the
experiments switched on and `unknown` lists the requested ids this build does not have. An unknown
id never throws, so a link made for a newer build still opens on an older one. An id that has
graduated to a normal feature is accepted and changes nothing.

`FEATURES` in `@graphty/graphty-element/catalog` lists the experiments this build has, each with
its id, a default name and the issue that tracks it. `GRADUATED_FEATURES` lists the ids that have
shipped.

### Graduated

- `timeline`: the [Timeline](./timeline) is a normal feature. `session.time` and the time
  attributes work with no `features` set, and `features="timeline"` is accepted and changes
  nothing.
- `assistant`: the [AI assistant](./ai-assistant) is a normal feature. A message's `scope`,
  `session.selection.peek`, `voice.review` and what a message did (effects, targets, durations,
  provenance) work with no `features` set, and `features="assistant"` is accepted and changes
  nothing.

## The experiments in this build

### `file-styles`

Drawing the styles other programs write into graph files, and writing a graph's styles into one: a
load with `styles: "file"`, an export with `styles: true`, and every style channel and value added
to draw those files (flat node shapes, borders, widths and heights, more arrowheads and line
patterns, label boxes and positions, and the rest). See [Styles from Files](./file-styles).

```html
<graphty-element features="file-styles"></graphty-element>
```

With it off:

- A load that asks for `styles: "file"`, by its options or by the source's, refuses with
  `E_FEATURE_OFF` (`{ feature: "file-styles", key: "styles" }`) before reading anything, and an
  export with `styles: true` refuses the same way. `dataSourceConfig: { styles: "file" }` on the
  element loads the data without its styles and lists `styles` in `element.refusedFeatures`.
- A draft's `styles` is null, `lastImport()` has no `styles`, the formats in `session.catalog`
  carry no `styles` and no `styles` writer option, and an export notes no style loss.
- `session.catalog.channels(target)` leaves out the channels the experiment added and the values it
  added to the rest, and a binding that spreads over a channel's values (a number onto node
  shapes, groups onto line patterns) spreads over the values that are left.
- The fixed layout's `edgeRoutes` and `graphvizAttributes` options are left out of
  `session.catalog`, and the recommended layout no longer asks Graphviz to route a placed DOT
  file's edges.
- `data.setStyleValues`, sent through `session.execute` or inside `session.transaction`, refuses with
  `E_FEATURE_OFF`.

A layer that writes one of the experiment's channels or values directly is still accepted and
drawn, and a project saved with the experiment on opens with the styles it was saved with.

### `source-steps`

Several data sources in one graph: each source keeps its rows as read, and the graph is rebuilt
from an ordered list of steps that add, merge and connect them. Work in progress. With it on:

- every load (`import`, `generate`, `loadDataset`, `loadExample`, `importColumns`, a draft's
  `load()` without a join, a network source) becomes one source plus a step that adds it; a
  replacing load takes every source out first, so opening a file works as before;
- each source's keys live in an id space: its own unless the load names `space` or `type`, so two
  loads with no options never merge their nodes. A NodeId is the key when one space holds it, else
  `<space>:<key>`;
- `addNodes` and the other direct edits are the reader's own edits (`data.edits()`,
  `data.removeEdit(id)`); `mergeNodes` is refused with `E_UNSUPPORTED` (`reason: "later"`);
- `data.stage`, `data.steps`, `data.spaces`, `data.types`, `data.declareType` and `data.ref` read
  and write the sources and steps.

```ts
await session.data.import(
    { type: "csv", config: { data: accounts }, name: "accounts.csv" },
    { key: "id", type: "account" },
);
await session.data.import({ type: "csv", config: { data: more } }, { mode: "merge", key: "id", type: "account" });
session.data.sources()[1].issues; // [{ code: "W_SPACE_OVERLAP", params: { space: "account", count: 12, of: 40 } }]
```

Removing a source gives back the graph without it, and lists the steps that went with it
(`W_STEP_REMOVED` in the result's `issues`). `replaceSource`, `reloadSource` and a network
`refresh` keep the source's id and swap its rows; the same rows again record no undo step. A step
reading a column the new rows lack is held (`E_COLUMN_MISSING`, or `E_READ_ROLE_MISSING` for a
weight, time or location role) until `data.resolveStep` names a column for it or the column comes
back. A reader edit whose value moved underneath reads `state: "source-changed"` in `data.edits()`
(`W_EDIT_SOURCE_CHANGED`), and `data.settleEdit(id, "follow" | "keep" | "drop")` settles it. A
note, pin or reader edit on an element a removal, replace or refresh left out is kept and listed
as `W_REFERENCE_UNBOUND` with the element's `ref`; Undo binds it again. A replace's `unbound`
lists the style layers, filter and joins that read a column no node or edge carries any more:

```ts
const report = await session.data.replaceSource(key, { type: "csv", config: { data: newer } });
for (const issue of report.issues ?? []) {
    if (issue.code === "W_EDIT_SOURCE_CHANGED") {
        await session.data.settleEdit(issue.params.edit, "keep");
    }
}
```

To bring a second source in on purpose, stage it (`data.stage` reads it but builds nothing yet),
then `data.merge` it into the nodes it names or `data.connect` it to them as edges. Where both
sources hold a value for the same cell, the first one held is kept unless the merge's `clash`
names another rule per column (`overwrite`, `both`, `min`, `max`, `mean`, `vote`); `min`, `max`
and `mean` on a column whose values are not numbers (or dates, for `min` and `max`) are refused
with `E_CLASH_RULE_TYPE`. `data.conflicts()` lists each cell that differs, each `data.steps()` row
counts them per column (`W_VALUES_DIFFER` in `valuesDiffer`), and `data.pick` settles one cell as
a reader edit naming the source:

```ts
await session.data.import({ type: "csv", config: { data: crm }, name: "crm.csv" }, { key: "id", type: "person" });
const erp = await session.data.stage({ type: "csv", config: { data: more }, name: "erp.csv" }, { key: "id" });
await session.data.merge({
    from: { source: erp, field: "id" },
    into: { space: "person" },
    clash: { amount: "max" },
});
for (const conflict of session.data.conflicts({ only: "open" })) {
    await session.data.pick(conflict.ref, conflict.column, erp);
}
```

`expand`, `more` and `collapse` work only while the network source is the only source. Saving
keeps the sources (their rows, or where a referenced one is read from) and the steps in the
project file's `graphty-sources` member, and opening the file rebuilds the same graph. With it
off, loads, joins, removal, refresh and saved files are as before.

#### Drafts and preview

A draft tries acts on a copy of the sources and steps, so a reader can see what they would do
before the graph changes. `data.draft()` opens one; it takes the same acts as the data doors
(`stage`, `add`, `merge`, `connect`, `extract`, `pick`, `editStep`, `removeSource`, ...) and its
own `undo()`. `commit()` applies all of them as one undo step, and `dispose()` leaves nothing.

```ts
const session = createGraphSession({ features: ["source-steps"] });
const people = await session.data.stage(peopleCsv, { key: "badge", type: "person" });
await session.data.add(people);
const entries = await session.data.stage(entriesCsv, { key: "entry", type: "entry" });

const draft = session.data.draft();
const byBadge = { from: { source: entries, field: "badge" }, into: { source: people } };
draft.matchCounts(byBadge); // { matched, only1, only2, repeated1, repeated2, ... }
draft.connect({ ...byBadge, edgeType: "entered" });

const preview = draft.preview();
console.log(preview.after.edges - preview.before.edges); // edges the commit adds
await draft.commit(); // one undo step: Undo puts the entries back to staged
```

`matchCounts` (also `data.matchCounts`) hashes the two fields without building anything:
`matched`, `only1`, `only2`, `repeated1`, `repeated2`, `fanOut`, `textVersusNumber`, and how many
more would match with `ignoreCase` or `ignoreSpaces` on. `matchValues` lists the values behind
them, a page at a time.

Before a join, a staged source can be read and set up without building anything:

- `data.sourceTable(source).summary()` gives its tables (rows and columns each), size, format,
  origin and read time, and its mapping as it stands; `profile(column, { table })` profiles one
  column: `kind`, `valid`, `empty`, `distinct`, repeated keys and rows, and a few `samples`.
  `data.profile({ space })` profiles the keys already in an id space the same way. A draft has the
  same two, reading the draft's sources.
- `data.setMapping(source, patch)` sets what a staged source's rows are (`rows: "nodes" | "edges"
| "both"`), its key, `space` and `type`, and for edge rows their end columns, end spaces and end
  types (`endTypes`). Like staging, it joins the undo step before it; a source already built
  refuses it (`E_BAD_COMMAND`, reason `not-staged`).
- A staged source named like a committed one lists that source's key in `sameName`.
- `data.staged()` lists the staged sources, oldest first. They are no part of the graph, so
  `data.sources()` leaves them out; `data.sources({ staged: true })` lists them too, in their place.
- `data.nodeRef(id)` gives a node's id space and key (`{ space, key }`), the inverse of `data.ref`:
  what a join on the node's type, or a reader edit naming it, takes.
- A `data.spaces()` row of a source's own space (its rows keyed with no space named) names that
  source in `ownedBy`; a space a load named has none.
- `connect` and `merge` take `ignoreSpaces` beside `ignoreCase`; `editStep` also takes
  `unmatchedFrom: "keep" | "drop"` (whether a merge adds the rows that met no node) and
  `aggregate` (fold a key's repeated rows per column: `count`, `sum`, `min`, `max`, `mean`,
  `first`, `last` or `list`), and each
  `steps()` row's `act` reads back what the step does.

```ts
const visitors = await session.data.stage(visitorsCsv);
session.data.sourceTable(visitors).profile("badge"); // { kind, distinct, repeated, samples, ... }
session.data.staged().map((each) => each.key); // [visitors]
session.data.sources({ staged: true }).length; // the loads in the graph, and the staged ones
await session.data.setMapping(visitors, { nodes: { key: "badge" }, type: "person" });
session.data.nodeRef("B1"); // once added: { space: "person", key: "B1" }
session.data.spaces().filter((row) => row.ownedBy !== undefined); // spaces no load named
```

`preview()` compares the draft's graph with the committed one, counted over every row: totals and
counts per type `before` and `after`; nodes and edges added, removed and changed; and for each
step its counts (`buckets`) and their change from the committed ones:

| Count                                                  | What it counts                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `merged`                                               | nodes a merge folds into the node they matched                           |
| `matched`, `unmatched`                                 | rows whose key found the element they write to, or none                  |
| `fanOut`                                               | rows whose key names several elements, so they are left out              |
| `untouched`                                            | nodes of the merged space no row reached                                 |
| `typeDiffers`                                          | elements given another type than an earlier step gave them               |
| `newNodes`, `newEdges`, `newNodeTypes`, `newEdgeTypes` | what the step makes, in all and per type                                 |
| `namedOnly`                                            | nodes a source's edges name that its own node rows lack                  |
| `valuesDiffer`                                         | cells, per column, where another source wrote a different value          |
| `repeated1`, `repeated2`, `rowsDiffer`                 | keys repeated on either side, and those whose rows differ                |
| `groups`                                               | how many nodes each merged node was made from, largest first             |
| `parallelPairs`, `selfLoops`                           | end pairs an earlier edge already joins, and edges from a node to itself |
| `endsMeet`, `endsMissing`                              | edge ends that found a node, or none, per id space                       |

`preview.rows({ step, bucket })` lists the rows behind a count, with each row as read and the
element's values before and after; `draft.exclude(step, keys)` leaves those rows out of the step.
`preview.cells({ column })` lists the cells where sources disagree, each source's value, the value
shown and whether a pick decided it; `editStep(step, { clash })` changes a column's rule and
`pick` or `pickAll` decide cells. `draft.display(true)` draws the draft, where every element reads
`graphty.draft` (`"merged"`, `"new"`, `"changed"`, `"removed"` or `"unchanged"`) for a style layer
to show, and `draft.show("before" | "after")` switches between the graph as it is and as the
commit would leave it. `session.styles.showDraft({ merged, new })` draws the join preview in the
two colors you pass: a ring on each node the commit would merge, a dashed border on each node it
would add, and each edge it would add dashed. It suspends the style layers while it is drawn (they
stay listed, and it is no undo step), is never saved, and its `end()` takes it off. Each change fires `data:draft-changed` with a `reason` (`"opened"`,
`"changed"`, `"committed"`, `"discarded"`).

While a draft is open every other data write and `session.undo()` / `redo()` are refused with
`E_DRAFT_OPEN { draft }`; views, styles, filters, selection and notes go ahead. A save writes the
committed project and leaves the draft open; opening a project or `data.clear()` discards it.
`data.draft({ askOverlap: true })` makes an add whose keys meet existing nodes ask instead of
keeping the source separate: the question is in `preview().questions` (`W_SPACE_OVERLAP`), and
`commit()` throws `E_OVERLAP_UNANSWERED { space, source }` until `answerOverlap(source, "merge" |
"separate")`. The preview's `issues` report `W_FAN_OUT`, `W_UNMATCHED`, `W_UNTOUCHED`,
`W_VALUES_DIFFER`, `W_ROWS_DIFFER`, `W_PARALLEL_EDGES`, `W_SELF_LOOPS`, `W_NODE_NAMED_ONLY`,
`W_EDGE_END_MISSING`, `W_STEP_REMOVED`, `W_REFERENCE_UNBOUND` and `W_FILTER_HELD`, each with its
parameters. With the experiment off, `data.draft()`, `data.matchCounts()`, `data.matchValues()`
and `data.currentDraft()` throw `E_FEATURE_OFF`.

### `source-references`

Saving a load as a **reference** instead of a copy: the project file says where to read the load
again, and an open reads it again, instead of holding its rows. A URL load, a network source's load
(by its source, endpoint and params) and a generated graph or sample dataset can be a reference; a
file the page holds no path to, pasted rows, a joined table and a load that needed a credential or a
secret parameter stay copies.

```ts
const session = createGraphSession({ features: ["source-references"] });
await session.data.import({ type: "json", config: { url: "https://example.com/graph.json" } });
const [load] = session.data.sources();
session.data.setCopy(load.key, "reference"); // load.copy === "reference" from now on
const saved = await session.project.save();

// Later, anywhere:
const report = await other.project.open(saved.text); // reads the URL again, after the page allows its host
report.problems; // W_SOURCE_UNAVAILABLE or W_SOURCE_CHANGED with { source }, when it could not or it changed
```

- `session.data.copies()` lists how a save keeps each load; a load that cannot be a reference
  carries `refused`, `W_SOURCE_NO_PATH` with `{ source, reason }`. `setCopy` publishes
  `source:copy` and marks the project unsaved.
- A save keeps in the file every row of a referenced load that a reader edited or another load
  also supplied; only the rows the load reads as they are now are left out. A save that cannot read
  the load keeps it as a copy and lists `W_SOURCE_UNAVAILABLE` in `report.leftOut`.
- An open asks the page before fetching (`network:pending` with `kind: "data"`). A reference that
  cannot be read opens with its rows held bare in their places (ids and edge ends, no values), so
  positions, runs, notes and edges that name them stay; the next save writes them and the
  reference back unchanged, and an open that can read it again fills them.
- With `save-files-v2` too, a version 2 save keeps a load chosen as a reference referenced, and
  reports a load that cannot be one as `W_SOURCE_NO_PATH` with the same reason `copies()` gives. A
  version 2 file's referenced sources open kept as references; one that cannot be read opens held,
  with no elements, until `session.data.refresh(load.key)` reads it again.
- Autosave and exports always write every row.

With it off, `setCopy` refuses with `E_FEATURE_OFF` (`{ feature: "source-references", key:
"setCopy" }`) and every save is what it was before. A file saved with references opens either way.

## What `@experimental` promises

API marked `@experimental` in the reference may change or disappear in a minor release of
graphty-element. The rule that breaking changes wait for a major release applies only to API that
is not marked.
