# graphty-element gaps against the refined B design

**What this is.** The refined B design (the clickable mock `app-b/` on the design branch, its
specification `structure-b-refined.md`, and the framework's `element-needs.md`) assumes a long
list of graph capabilities. By the repository's rule, every one of them belongs to
graphty-element: the graphty app only draws the window around the element and may not compute,
probe or work around anything. This document checks each capability the design's screens assume
against graphty-element 3.5.5 on master (2026-10-03), says whether it exists, exists in part, or
is missing, and says whether the tier 1 build needs it now or a later release does.

**Tier 1** is the first-time user's core path the owner set on 2026-10-02: bring in a file or pick
a sample, read what loaded, rank nodes and find groups, color or size by a value, labels from a
field, a readable layout, find a node and see its neighbors, save a picture and send the numbers
to a spreadsheet, save the project and reopen it, and one whole first session end to end.

**How to read the Tier 1 column.** "Now" means the tier 1 build cannot finish that task without
it, or would have to work around the element to do it (which the repository forbids). "Later"
means a later release of the design needs it. "Now (part)" means tier 1 can ship the task with
what exists, but a confirmed round 8 finding on that task needs the missing part.

**API names.** Every API shape below is a proposal, marked as such. Public names, file formats
and anything published to consumers are one-way doors and the owner's call.

## Summary

- 85 capabilities checked: 29 exist, 21 partial, 35 missing. Most of what is missing is later
  work; the tier 1 path is mostly covered.
- Tier 1 needs 15 element changes. Three are covered by an open issue or pull request (#301
  project file, #133 legend in exports, PR #726 readable run names); twelve have no issue and
  should be filed as high priority ("Issues to file now" below).
- Four open issues ask for things master already does (#149, #297, #144, and #145 for notes),
  and should be checked and closed.

## The table

Status: **Exists**, **Partial**, **Missing**. A quoted phrase in the later-release list is the
opening words of the matching row in `design/ui/framework/element-needs.md` on the design branch.

### Bring data in and read what loaded

| Capability                                                                                                                             | Status on master                                                                                                                                                                                                                                            | Tier 1     | Issue or PR                        |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------- |
| Load a file, URL or text with format detection, one undoable step                                                                      | Exists: `session.data.import({ type?, config, name? }, { mode, layout })`; detection by name, extension and first bytes; `E_UNKNOWN_FORMAT` names the readable formats                                                                                      | Now        | --                                 |
| Two spreadsheets as one graph (a node table and an edge table)                                                                         | Exists: the CSV source takes `nodeFile`/`edgeFile` (or URLs); `mode: "merge"` adds to a loaded graph                                                                                                                                                        | Now        | --                                 |
| Binary sources (zip archives, byte-order marks, several graphs per file)                                                               | Partial: every source is read as text today                                                                                                                                                                                                                 | Later      | PR #770                            |
| Sample datasets a picker lists and loads as an ordinary import                                                                         | Partial: `@graphty/graph-samples` holds 14+ datasets with metadata (`DATASETS`, `fetchDataset`), but the element neither lists samples nor imports a sample; loading one through `addNodes`/`addEdges` leaves `data.source()` and `data.lastImport()` empty | Now        | none (#288, #289 are app issues)   |
| A sample that opens with worked examples already added                                                                                 | Missing: needs the project file                                                                                                                                                                                                                             | Later      | #301                               |
| Load preview before commit (detected format, which rows are nodes or edges, key, weight and roles, a sample, the expected match count) | Missing: a load commits at once                                                                                                                                                                                                                             | Now        | #185 (app issue; no element issue) |
| Import report: read, kept and skipped counts, repeated edges, weight column, declared direction                                        | Exists: `data.lastImport()` (`counts.nodeRecords`, `edgeRecords`, `rejected`, `repeated`, `policy`, `weights`), `store.directionSettledBy`, self-loop and parallel counts in `data.statistics()`                                                            | Now        | --                                 |
| The rejected and unmatched rows themselves, not only their count                                                                       | Missing                                                                                                                                                                                                                                                     | Later      | none                               |
| Graph summary: counts, components and their sizes, density, degree range                                                               | Exists: `data.statistics()` (`ComponentStatistics.sizes`)                                                                                                                                                                                                   | Now        | --                                 |
| Attribute profile: type, completeness, samples                                                                                         | Exists: `data.attributes()`                                                                                                                                                                                                                                 | Now        | --                                 |
| A declared measurement level per attribute (category, quantity, time, text)                                                            | Partial: "category" is inferred from the count of distinct values, so one column changes level with file size; no declaration                                                                                                                               | Now (part) | none                               |
| Weight role chosen at load, with a meaning (distance, strength, capacity)                                                              | Partial: `knownFields` weight path and `lastImport().weights`; the meaning lives only on a run (`WeightMeaning`)                                                                                                                                            | Later      | #313                               |
| Add rows to a loaded table, with added, updated and unchanged counts                                                                   | Partial: `import(..., { mode: "merge" })` adds; no counts                                                                                                                                                                                                   | Later      | #298                               |
| Join an attribute table by key                                                                                                         | Missing                                                                                                                                                                                                                                                     | Later      | #298                               |
| Re-map columns after a load                                                                                                            | Missing                                                                                                                                                                                                                                                     | Later      | none                               |
| Load progress and cancel                                                                                                               | Partial: `data-loading-progress` DOM event; a load cannot be canceled                                                                                                                                                                                       | Later      | #296                               |
| Reader-facing error text, with the file line on a parse error                                                                          | Partial: developer `message` only; `E_PARSE_FAILED` carries no line                                                                                                                                                                                         | Later      | none                               |

### Analyze

| Capability                                                                                        | Status on master                                                                                                                                | Tier 1         | Issue or PR                 |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------- |
| Run a ranking measure and a grouping (degree, PageRank, betweenness, Louvain, Leiden, components) | Exists: `session.runs.start(key, params, { scope, seed, as, style })`, `session.run(command)`; 23 catalog entries                               | Now            | --                          |
| Progress and cancel of a run                                                                      | Partial: `Run.cancel()`, `signal`, progress phases; the estimate says `cancellable: false` for any unchunked algorithm, which cannot be stopped | Later          | none                        |
| Cost estimate before a run                                                                        | Exists: `session.estimate(command)`, `session.plan(command)`                                                                                    | Now            | --                          |
| Readable names for runs and their result paths                                                    | Partial: a run unnamed by `as` gets a hashed id (`degree_0bkzd1n0p2dnik`), which shows in selectors, legends and exported column headers        | Now            | PR #726                     |
| Rename a run                                                                                      | Missing                                                                                                                                         | Later          | none                        |
| A plain sentence per method, and aliases a search can match ("brokers", "groups")                 | Partial: `AlgorithmDescriptor.plainName` and `description`; no aliases, no legend-length sentence                                               | Now (part)     | none                        |
| Top N, ranking and histogram of a result                                                          | Exists: `RunResult.ranking(field, limit)`, `top(field, n)`, `histogram(field)`, `summary()`, `reading()`, `band(field)`                         | Now            | --                          |
| A result's values as table columns, sortable and paged                                            | Missing: `data.nodePage({ sort })` sorts only by imported record keys; a result column cannot be a column of the page or its sort key           | Now            | none (#168 is the app half) |
| Run records a methods paragraph or a rerun reads (algorithm, options, seed, scope)                | Partial: `runs.list()`, `runs.get(id)`, each run's `params`, `seed`, `scope`; the seed is unrecorded for most stochastic entries                | Later          | none                        |
| Shortest path between two nodes                                                                   | Exists: catalog `shortest-path`, scoped by `StartOptions.scope`                                                                                 | Later (tier 2) | --                          |
| Path ties counted, direction option, weight meaning, time order                                   | Missing                                                                                                                                         | Later          | none                        |
| Partition agreement (AMI, ARI) and seed stability                                                 | Missing                                                                                                                                         | Later          | none                        |
| Computed attribute (an expression column)                                                         | Missing                                                                                                                                         | Later          | none                        |

### Paint, labels and the legend

| Capability                                                                                                             | Status on master                                                                                                                                                                                                                       | Tier 1     | Issue or PR                    |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------ |
| Color or size by an imported value or a result, as a style layer                                                       | Exists: `styles.add({ selector, encode: { "node.color": { by: "data.x", scale } } })`; `styles.encode({ run, field, channel })` for a run                                                                                              | Now        | --                             |
| A sensible default scale and range from the column (categories get one color per value; sizes get a readable px range) | Partial: a layer binding with no scale is `linear` for every color and number channel (`defaultScaleFor`, `src/session/styles/encoding.ts:943`), so a group column draws a ramp; `encode()` defaults size `range` to the unit interval | Now        | none                           |
| A run the reader starts lands visible, on top, and says what it took over                                              | Partial: a run's suggested layers are appended (last wins) and listed by `runs.bindings(runId)`; a withheld suggestion is dropped silently (`autoApply.ts`)                                                                            | Now (part) | none (#551 closed)             |
| Per-layer counts: elements matched, painted, and with no value                                                         | Missing: `StyleChange` carries how many were repainted, not how many a layer covers                                                                                                                                                    | Now (part) | #167 (app half, blocked)       |
| Labels from a field                                                                                                    | Exists: `node.label` bound with `by: "data.name", scale: "passthrough"`; `node.labelStyle`                                                                                                                                             | Now        | --                             |
| Labels hidden to avoid overlap, counted and listable                                                                   | Partial: `layoutBehavior.labels.declutter` hides overlapping labels (off by default); nothing publishes how many it hid or which                                                                                                       | Now (part) | none                           |
| Label only the top N by a value                                                                                        | Partial: a selection can take `{ top: { run, field, n } }`; a layer selector cannot                                                                                                                                                    | Later      | none                           |
| Several label lines per node (name above, degree below)                                                                | Missing                                                                                                                                                                                                                                | Later      | #294 (wrapping only)           |
| The legend model                                                                                                       | Exists: `styles.legend()` returns blocks, swatches, domains, departures                                                                                                                                                                | Now        | --                             |
| An on-canvas legend the element draws                                                                                  | Missing: nothing is drawn; the app may render the model, which is reading a published property                                                                                                                                         | Later      | #292                           |
| The legend in an exported image or video                                                                               | Missing                                                                                                                                                                                                                                | Now        | #133 (blocked, needs-decision) |
| Why one element looks as it does                                                                                       | Exists: `styles.explain({ node })` per element                                                                                                                                                                                         | Now        | --                             |
| Why several elements look as they do, in one read                                                                      | Missing: `explain` takes one element                                                                                                                                                                                                   | Later      | none                           |
| Canvas follows the light or dark theme                                                                                 | Missing (the owner accepts a light canvas in dark mode for now)                                                                                                                                                                        | Later      | #291                           |
| A selection mark that meets 3:1 contrast, on nodes and edges                                                           | Missing: the default gold halo measures about 1.3:1 on the default canvas and marks nodes only                                                                                                                                         | Later      | none                           |
| Reduced motion                                                                                                         | Missing                                                                                                                                                                                                                                | Later      | none                           |
| Print-safe check (which colors fall on the same gray)                                                                  | Missing                                                                                                                                                                                                                                | Later      | none                           |

### Find, select and neighbors

| Capability                                                                                                                        | Status on master                                                                                                                                                                                                      | Tier 1 | Issue or PR                 |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------- |
| Select by ids, a rule or typed text                                                                                               | Exists: `selection.apply({ ids } or { where } or { text, mode })`; the query engine is attached (`GraphSession.ts:2253`)                                                                                              | Now    | -- (#149 is stale)          |
| Find without selecting: hits listed by name, id or value, with the attribute that matched and whether a filter leaves the hit out | Partial: the engine's `find(text, mode)` exists but is reached only through a selection, which selects every hit at once                                                                                              | Now    | none (#173 is the app half) |
| Count of a rule's matches before selecting ("group is 2 (14 nodes)")                                                              | Exists: `scope.count({ where })`                                                                                                                                                                                      | Now    | --                          |
| A node's neighbors by name, with each tie's value                                                                                 | Partial: `selection.apply({ neighborsOf, depth, direction })` selects them; `data.edgePage({ touching, sort })` lists incident edges; nothing returns neighbors with summed tie strength, so the app would compute it | Now    | none                        |
| Frame a node or a selection on the canvas                                                                                         | Exists: `zoomToNodes(ids)`, `zoomToSelection()`, `zoomToFit()`, `zoomStep()`, `resetCamera()` on the element                                                                                                          | Now    | --                          |
| Shift and Mod clicks add to the selection                                                                                         | Missing: a node click always replaces                                                                                                                                                                                 | Later  | none                        |
| Bring back the selection a clear removed                                                                                          | Missing                                                                                                                                                                                                               | Later  | none                        |
| Paged node and edge tables                                                                                                        | Exists: `data.nodePage`, `data.edgePage` (#575)                                                                                                                                                                       | Now    | --                          |
| Statistics of a selection                                                                                                         | Partial: `selection.statistics()` counts; per-scope attribute statistics are missing                                                                                                                                  | Later  | #322 (app half)             |

### Layout and camera

| Capability                                                                                         | Status on master                                                                                        | Tier 1     | Issue or PR |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- | ----------- |
| Choose a layout, 2D or 3D, as undoable steps                                                       | Exists: `session.layout.set(id, { options })`, `setDimension`; `import(..., { layout: "recommended" })` | Now        | --          |
| Layout state (running, paused, settled) as a read and an event, with Pause and Resume              | Partial: the `graph-settled` DOM event only; no session read, no pause or resume                        | Now (part) | none        |
| Pin and place nodes as undoable steps                                                              | Exists: `session.positions.set`, `pin`, `unpin`                                                         | Later      | #542        |
| Saved camera views                                                                                 | Exists: `session.views.save`, `remove`                                                                  | Later      | --          |
| Rename a saved view; a view that also keeps filters, layers, hidden elements and the legend switch | Missing                                                                                                 | Later      | none        |
| A minimap                                                                                          | Missing                                                                                                 | Later      | #293        |
| Presentation tour stops with hold times and saved views                                            | Partial: `CameraWaypoint` takes a position, a target and a duration                                     | Later      | none        |

### Save, open and export

| Capability                                                                        | Status on master                                                                                                                                                            | Tier 1 | Issue or PR                   |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------- |
| Save the whole project to one file and reopen it, with a report of what came back | Missing: only parts serialize (`styles.toDocument()`, `notes.toDocument()`, `exportCameraPresets()`); nothing saves data, runs, positions, filters, sets and views together | Now    | #301 (medium, needs-decision) |
| Project name, identity and unsaved-changes state                                  | Partial: `session.history.version` moves on every step; no project id or name                                                                                               | Now    | #301                          |
| Autosave and one writer per project across tabs                                   | Missing                                                                                                                                                                     | Later  | none                          |
| Save a picture with print, share, thumbnail and documentation presets             | Exists: `captureScreenshot({ preset, multiplier, transparentBackground, destination, timing: { waitForSettle } })`                                                          | Now    | --                            |
| Vector figure (SVG or PDF)                                                        | Missing                                                                                                                                                                     | Later  | none                          |
| Video                                                                             | Exists: `captureVideo`; no legend in the frames                                                                                                                             | Later  | #133                          |
| Numbers to a spreadsheet: the node table with every computed value                | Exists: `exportGraph("csv", { table: "nodes" })` writes data and result columns; readable headers wait on PR #726                                                           | Now    | PR #726                       |
| Export only a filter's, a set's or the selection's elements                       | Missing: `exportGraph` writes the whole graph                                                                                                                               | Later  | none                          |
| Graph file export (GraphML, GEXF, GML, DOT, Pajek, JSON)                          | Exists: `exportGraph(format)` with `lossNotes`                                                                                                                              | Later  | --                            |
| Apply a style file                                                                | Exists: `styles.applyTemplate(document)`                                                                                                                                    | Later  | --                            |
| Apply a recipe (runs plus styles), and export a project as one                    | Missing                                                                                                                                                                     | Later  | none                          |

### History, notes, sets and filters

| Capability                                                      | Status on master                                                                | Tier 1 | Issue or PR          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------ | -------------------- |
| Undo and redo of every project change                           | Exists: `session.undo()`, `redo()`, `canUndo`, `history.steps`, `transaction()` | Now    | #582, #583 (defects) |
| Notes on the graph, nodes, edges, sets and results              | Exists: `session.notes` (add, update, remove, `toDocument`, `mergeDocument`)    | Later  | #705 (done state)    |
| Kept sets and combining them                                    | Exists: `session.sets`, `sets.combine` (fixed sets)                             | Later  | --                   |
| A filter and a time window                                      | Exists: `visibility.set(rule)`, `visibility.setWindow(window)`                  | Later  | --                   |
| Ordered filter steps, each naming what it leaves out            | Missing: one filter for all steps                                               | Later  | none                 |
| Hide on canvas only (drawing state, not a filter)               | Missing                                                                         | Later  | none                 |
| Collapse a group to one node                                    | Missing                                                                         | Later  | none                 |
| Version history and data versions                               | Missing                                                                         | Later  | none                 |
| Compare two results, groups or graphs                           | Missing                                                                         | Later  | #186 (app half)      |
| Merge nodes                                                     | Missing                                                                         | Later  | none                 |
| Several graphs in one project, and a new graph from a selection | Missing                                                                         | Later  | none                 |

## The missing and partial capabilities

Each section states what the design assumes, what master does, and an API shape the design
implies. Every shape is a **proposal**; the names are the owner's call.

### Tier 1, needed now

#### Sample datasets

**The design.** The start screen lists samples, each with a size and one line on what it is good
for, and picking one opens it like any import: the Data page shows what loaded, Undo takes it
back, and the project names the sample.

**Master.** `@graphty/graph-samples` has the datasets and their metadata, but the element cannot
list or import them. The app would have to pick a loader, convert a snapshot to records and lose
the import report, which is wiring a third-party consumer would also need.

**Proposal.** `@graphty/graph-samples` becomes an optional peer of graphty-element, the way
`@graphty/webgpu-graph-algorithms` is: `session.catalog.samples()` returns
`{ id, name, description, nodes, edges, hosting }[]`, and `session.data.import({ sample: "karate" })`
loads one as an ordinary import, so `data.source()` and `lastImport()` describe it. With the
package absent, `samples()` returns an empty list.

#### Load preview

**The design.** New from data opens the Data page: the file's format, which rows read as nodes
and which as edges, the key column, the weight column and a few sample rows, all before Load.

**Master.** `data.import` commits at once. Reading a CSV header in the app to fill the page is
format sniffing, which belongs to the element.

**Proposal.** `session.data.preview(source)` returns
`{ format, tables: [{ role: "nodes" | "edges", columns: [{ name, type, level, role }], sample: rows, rowCount }], keys, weight, expectedMatches }`,
and `data.import(source, { mapping })` takes the reader's edits to it. No load happens until
`import`.

#### A sensible default scale and size range

**The design.** Color by a group column gives one color per group; size by a measure draws
"2 to 12 px" and the legend says so.

**Master.** A binding with no scale is linear for every color and number channel, so a group
column (an integer) draws a ramp; `encode()` defaults the size range to 0 to 1.

**Proposal.** A binding with no scale or range takes the element's default for the column's
measurement level and the channel: categorical gets `ordinal` with overflow to Other; a quantity
gets linear or log by the column's shape; `node.size` gets a default px range. The chosen scale
is readable before writing: `styles.defaultBinding(path, channel)` returns
`{ scale, range, palette, reason }`. A declared level, `data.declare(path, { level })`, overrides
the inference.

#### Readable run names

**The design.** "Louvain now colors the drawing"; the legend reads "Color: Communities"; the
exported CSV's header says "pagerank", not a hash.

**Master.** An unnamed run gets a hashed id. **PR #726** adds `suggestedName(options)` returning
`{ id, label }`. Tier 1 needs it merged. Renaming a run afterwards is a later need:
`runs.rename(id, label)` as one undoable step (proposal).

#### Result columns in the table

**The design.** After a ranking run, the node table shows the measure as a column, sorted by it,
and paged.

**Master.** `nodePage` sorts only by imported record keys; result values are read separately per
run, so a sort by a result column would have to happen in the app.

**Proposal.** `RecordSort.key` and a new `RecordPageOptions.columns` accept a result path
(`results.<run>.<field>`), so `data.nodePage({ columns: ["results.pagerank.value"], sort: { key: "results.pagerank.value", descending: true } })`
returns records carrying those values and sorts on them in the element.

#### Find without selecting

**The design.** One find box lists hits as you type: elements by name, id or value (with the
attribute that matched, and "left out by" a filter when one excludes the hit), then one row per
matched value ("Select where group is 2, 14 nodes"). The selection changes only on a pick.

**Master.** The query engine's `find` is reachable only through `selection.apply({ text })`,
which selects every hit.

**Proposal.** `session.data.find(text, { limit, scope, kinds })` returns
`{ elements: [{ kind, id, label, matched: { path, value }, excludedBy?: "filter" }], values: [{ path, value, count }] , total }`,
ranked with an exact name or id first.

#### Neighbors with tie strength

**The design.** Select a node and the inspector lists its neighbors by name, each with its tie
("Valjean, 17 shared chapters"); the degree is a link to that list. Round 8 found no screen that
names a neighbor (severity 4).

**Master.** Neighbors can be selected, and incident edges listed, but nothing sums parallel edges
into one tie per neighbor or orders neighbors by it; doing that in the app is a neighbor lookup,
which the repository forbids.

**Proposal.** `session.data.neighbors(id, { direction, weight, sort, offset, limit })` returns a
page of `{ node: NodeRecord, edges: EdgeId[], tie: number }` with `total`.

#### The legend in exported images and video

**The design.** Export > Image has a legend switch, and the image carries the legend at the
image's scale. The framework's rule is that no figure leaves without its legend.

**Master.** `captureScreenshot` renders the scene only. **#133** tracks it and is blocked on a
decision; it should be raised to high and decided now.

**Proposal.** `captureScreenshot({ legend: true | "auto" | false })` (and the same on
`captureVideo`), drawn from `styles.legend()` at the capture's pixel ratio; `"auto"` draws it
whenever a layer binds a value.

#### Project save and reopen

**The design.** Save and Save as write one project file; Open reads it back with data, results,
layers, positions, filters, sets, notes, views, the selection and the camera, and says what came
back. The start screen's samples open with worked examples, which is a project file too.

**Master.** Only parts serialize. **#301** is open at medium priority with needs-decision. It
blocks tier 1 and should be raised to high; the file format is a one-way door for the owner.

**Proposal.** `session.project.save(): Promise<Blob>` and
`session.project.open(source): Promise<OpenReport>` (one undoable step, or the start of a fresh
history), with `session.project.id`, `name`, and `dirty` (true once `history.version` moves past
the saved version). The report lists what could not be restored, by kind. Results are kept as
columns so a reopen does not recompute.

### Tier 1, a confirmed finding needs the missing part

#### Measurement level

Partial. `data.attributes()` infers "category" by distinct-value count. Proposal:
`AttributeDescriptor.level` (`"category" | "quantity" | "time" | "text" | "id"`) with `levelSource`
(`"inferred" | "declared"`), and `data.declare(path, { level, role })` as one undoable step. It
feeds the default-scale proposal above.

#### Method sentences and aliases

Partial. The legend's "darker = more central; PageRank" line and Analyze's search for "brokers"
or "groups" need words the catalog owns. Proposal: `AlgorithmDescriptor.sentence` (one plain
line per result field) and `aliases: string[]`.

#### A run lands visible and says what it took over

Partial. Suggested layers append on top; a suggestion withheld because an authored layer holds the
channel is dropped silently. Proposal: `Run.styleOutcome` lists each suggested channel as
`applied`, `withheld { byLayer }`, or `refused`, and names the layer it now paints over, so the app
can say "Louvain now colors the drawing; PageRank moved below".

#### Per-layer counts

Partial. Proposal: `styles.counts(layerId)` returns `{ matched, painted: { [channel]: number }, noValue }`,
with `painted` counting only elements where this layer wins the channel, and a revision that moves
with `style:changed`.

#### Labels hidden to avoid overlap

Partial. Declutter exists but is silent. Proposal: `session.labels` read
`{ requested, drawn, hiddenByOverlap }` and `hiddenIds()`, with a `labels:changed` event; the
declutter switch becomes a project setting the app's "show all" writes.

#### Layout state, Pause and Resume

Partial. Proposal: `session.layout.state` (`"running" | "paused" | "settled"`), `pause()` and
`resume()`, and a `layout:changed` event. Not undoable: motion is not project state.

### Later releases

Each of these is missing or partial and not needed by tier 1. The proposal is one line; where a
quoted phrase appears, the element-needs row it opens gives the full need.

- **Binary sources and choosing one graph of a file.** PR #770.
- **Rejected and unmatched rows.** `lastImport().rejected` as a page of rows with the reason
  (element-needs: "The import and restore reports").
- **Reader-facing error text and file positions.** `GraphtyError.details.line`, `column` on
  `E_PARSE_FAILED`, and `text` beside the developer `message` ("Reader-facing text for graph facts").
- **Load cancel and true progress.** #296.
- **Weight meaning chosen at load.** `data.declare(path, { role: "weight", meaning })` (#313).
- **Join, add rows with counts, re-map.** #298; `import` reports added, updated, unchanged.
- **Cancel any run.** Every catalog run chunked or off the main thread ("Every catalog run chunked").
- **Run records for a methods paragraph and Rerun.** Record the seed on every stochastic run.
- **Path ties, direction, weight meaning, time order.** Options on `shortest-path`; the result
  reports `tiedRoutes`.
- **Partition agreement and seed stability.** A `compare` run kind reporting AMI and ARI.
- **Computed attribute.** `data.derive(name, expression)` as one undoable step.
- **Top N in a layer selector.** A selector form `{ top: { run, field, n } }`, as selection has.
- **Several label lines.** Per-position label channels (#294 covers wrapping only).
- **On-canvas legend drawn by the element.** #292.
- **Explain across several elements.** `styles.explain({ nodes: ids })` returning agreement or
  Mixed per channel.
- **Theme, selection-mark contrast, reduced motion, print-safe check.** `colorScheme` (#291),
  a two-tone selection mark on nodes and edges at 3:1, `reducedMotion`, and a palette gray-collision
  read.
- **Shift and Mod clicks; previous selection.** In the element's click handling;
  `selection.previous()`.
- **Pin defects.** #542.
- **Composite saved views and rename.** `views.rename(from, to)`; a view that also keeps filters,
  layers, hidden elements and the legend switch.
- **Minimap.** #293.
- **Tour stops with holds and views.** `CameraWaypoint.hold` and `view`.
- **Autosave and one writer per project.** A storage adapter with a lease.
- **Vector figures.** `exportFigure("svg" | "pdf", { legend })`.
- **Export a scope.** `exportGraph(format, { scope })`.
- **Recipes.** Apply a recipe (runs and styles) and export a project as one.
- **Ordered filter steps; hide on canvas; collapse a group; version history; compare; merge
  nodes; several graphs per project.** Each is a row of element-needs; none has an issue.

## Issues to file now (high priority)

Tier 1 needs these and no open issue covers them. Each is element work, labeled
`enhancement`, `priority:high`, with effort as given.

1. graphty-element: list and import sample datasets through the element (effort:medium)
2. graphty-element: preview a load before committing it (effort:high)
3. graphty-element: default scale and size range from the column's measurement level (effort:medium)
4. graphty-element: page and sort node and edge records by result columns (effort:medium)
5. graphty-element: find nodes and values without selecting them (effort:medium)
6. graphty-element: list a node's neighbors with tie strength (effort:low)
7. graphty-element: report what a run's suggested style applied, withheld or took over (effort:low)
8. graphty-element: count what each style layer matches and paints (effort:medium)
9. graphty-element: publish how many labels declutter hid, and which (effort:low)
10. graphty-element: layout state, Pause and Resume on the session (effort:medium)
11. graphty-element: declared measurement level on attributes (effort:medium)
12. graphty-element: plain sentence and aliases on catalog algorithm entries (effort:low)

Existing issues to raise or decide for tier 1: **#301** (project file: raise to high; the file
format is the owner's one-way door), **#133** (legend in exports: raise to high and decide the
blocked question), **PR #726** (readable run names: merge).

The owner's request also asks for high-priority issues for later-release needs, so the element
can build them ahead of the app. The later-release list above without an issue number is that
set; the ones the design leans on most are composite saved views, ordered filter steps, hide on
canvas, cancel any run, export a scope, several label lines, and the selection mark at 3:1.

## Open issues that master has closed

Check and close these; master already does what they ask:

- **#149** says `{ where }` and text search throw `E_UNSUPPORTED`. The session attaches the query
  engine (`src/session/GraphSession.ts:2253`).
- **#297** asks for `getEdges()` and attribute updates: `data.edges()`, `edgePage`, `updateNodes`,
  `updateEdges` exist.
- **#144** asks for a session layout API and positions verbs: `session.layout` and
  `session.positions` exist. Only a layout event is still missing (the layout-state proposal above).
- **#145** asks for notes and a journal: notes shipped in 3.4.0; the journal is still missing.
- **#173** is the app's search; its element half (search over nodes) is the find proposal above.
