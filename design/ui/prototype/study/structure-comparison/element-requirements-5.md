# What graph-io and graphty-element must add for refined structure B, version 5

graphty-element owns all graph functionality, including loading data, which it does through
graph-io; the graphty app only draws what the element publishes (`/CLAUDE.md`, "Architectural
Principles"). So every capability the design needs and the element or graph-io lacks is listed
here, with a proposed API and the screens that wait on it. None of it is built in the app. In the
skeleton, a screen that waits on a row below is drawn as designed; where the lack would change
what a reader sees, the screen carries the "needs graphty-element" design note, which the
user-test build hides.

The design these rows serve is `structure-b-refined.md` (version 5); the decisions behind the new
rows are in `owner-questions-5.md`. Sections 1 to 6 are version 4's list, unchanged (a "new" mark there means new in version 4). Sections 7
and 8 are new in version 5: what wide data and nested JSON need. Section 9 lists what stays in the
app because it is presentation, and what is deferred.

Each row is filed as an issue against its package (type, priority and effort labels) before its
screen ships. Routes are named as in `state-matrix.md`.

---

## 1. Notes (new; owner decision: notes are part of graphty-element's API)

| Capability | Proposed API | Screens that wait on it |
|---|---|---|
| A notes store saved with the project, undoable | A `notes` project slice (saved as records, the issued-id counter and removed ids); `notes.add`, `notes.update`, `notes.remove` as undoable commands in the register of undoable operations | Notes place (write, edit, delete, undo); every inspector's Notes section; note counts on tree rows, filter steps and the table's Notes column; the status-bar notes count |
| Reading and watching notes | `session.notes.get`, `list({ about, cites, missing })` (newest first; `about` matches the target itself, never its members), `authors()`; event `note:changed` shaped like `set:changed`; typed errors `E_NOTE_EMPTY`, `E_NOTE_NO_TARGET`, `E_NOTE_UNKNOWN_TARGET`, `E_NOTE_AMBIGUOUS_TARGET` (a bare node id two types hold, on `add`, `update` and `list({ about })`), `E_NOTE_UNKNOWN_CITE` (a cite of a result that does not exist or has no finished run, or of a filter step that does not exist), `E_UNKNOWN_NOTE`; a node target always reads back as `{ type, key }`; `note:changed` also fires, with `change: "updated"` and `fields` naming the part, when a target goes missing or a cited result is rerun (cause `load` or `command`); one graph's notes per session (`element-notes-api.md` 2.4) | Notes place list, filter and Find; row and step counts; "cites an earlier run" chip |
| The author name as a project setting (owner: "the project's author setting", entered in Settings and stored) | `session.author` (a string or null), and the element's `author` attribute; saved with the project in the existing `config` part (notes and recipes both read it), not a step in the undo history (it says who is writing, not what the graph is); stamped on a note at `add`, and on a recipe when it is written (section 5, Output), only when set. One setting for both, because the owner's decision takes both from the same author setting | Settings > General > Your name; the note meta line (a name shows only when `authors()` holds two or more) |
| Recipe authorship | A recipe the element writes (its runs and its style document) carries `savedAt` and, only when `author` is set, `savedBy`, stamped by the element the way a note is; the app writes neither | Export > Recipe; Apply recipe, which shows when a recipe was saved and, under the same two-or-more rule as notes, by whom |
| Targets that survive a reload | Node targets stored as `{ type, key }` (a bare node id refused with `E_NOTE_AMBIGUOUS_TARGET` when two types hold it), edge targets as `EdgeMember` with two new optional members, `sourceType` and `targetType` (additive: `EdgeMember` is open to optional members); targets rewritten when a node type is renamed; a missing target read as `missing: true` with its last `name`; a target the filter leaves out read as `filtered: true`; notes with a missing target counted in the import report | Note chips (a missing target struck through, "Not in the current data"); the Data page's match report line "2 notes are about nodes no longer in the graph" |
| Citing a result, not only a run | Cites and group targets use the element's existing `ResultItem` vocabulary, so there is one way to address a result: a cite is `{ result, run }` (the result pinned to the run the note was written against, the same opaque token a pinned `ResultItem` holds) or `{ step, at }`; a group target is `{ item: ResultItem }`; an unpinned item follows the result's current run by overlap (documented reading rule, `conceptual-model.md` 7.3). A read sets `replaced: true` once the pinned run is no longer current, or no item matches by overlap | The "cites an earlier run" history icon on a run chip; the same icon on a group chip after a rerun |
| Notes in styles | A `notes.*` path kind beside `results.*`: `notes.count` (0 on an element with none), `notes.latest`, `notes.latestTime`, usable in selectors, bindings and filters; repaint of every element whose value changed when a note changes | The Notes row (an ordinary layer selecting ``notes.count > `0` ``); the From data list's Notes group (Note count, Latest note) on Label, Size and Color |
| Filter steps as note targets | Stable ids for the steps of the filter's rule tree (`FilterStepId`), kept across edits and saved; part of the notes proposal, not a later addition | Add note on a filter step's menu (enabled in the skeleton like every other note control); the step inspector's Notes section; the step's note count in Data > Filters |
| Notes in a consumer's own file until the project file exists | `session.notes.export()` and `import(saved)` in the saved form above (import is one undoable step) | The app's project save and open, until the element writes project files |

Removed from the list: the reserved notes layer that version 3 asked for. An ordinary layer that
selects ``notes.count > `0` `` replaces it. No element change is needed for a Notes row with no look:
the element refuses a layer that writes nothing (`E_BAD_LAYER`), so the app's Notes row holds no
layer until the reader gives it one, then adds one per side, as its Everything row does
(`element-notes-api.md`, section 6).

---

## 2. Labels: several per node (new)

| Capability | Proposed API | Screens that wait on it |
|---|---|---|
| Labels keyed by position | **Studio:** `node.label` is documented as shorthand that the element translates into the slot its `location` names, the way a one-table import is shorthand for a table list, so there is one way to put a label above a node and no collision rule between the two. `NodeStyle.labels: Partial<Record<Exclude<LabelLocation, "automatic">, LabelStyle>>` (`LabelLocation` is the element's public type, `catalog/label-style.ts`); flat channel pairs `node.labelTop` / `node.labelTopStyle`, and the same for Bottom, Left, Right, TopLeft, TopRight, BottomLeft, BottomRight, Center. Today's `node.label` / `node.labelStyle` are unchanged: `labelStyle.location` already takes any of the ten `LabelLocation` values (default `"top"`, `config/RichTextStyle.ts`), and `node.label` keeps its own `location` and holds the position that location names. So nothing breaks (a minor release under the channel rules). Layers merge per position, last writer wins: two rows writing Top and Bottom both show; two rows writing Top override; `node.label` at `location: "top"` is the Top slot, so it merges the same way | Style tab > Label section (one line per position); the Label popover; Why this look (one token per position); Label by |
| A slot's position is fixed by its key | On the new slot channels only, a `location` written inside the slot's style is ignored and reported as a binding issue; `node.labelStyle.location` keeps today's meaning | The Label popover's Position grid (the one place position is set) |
| Plain names for label positions | `channelsFor("node")` gives each label channel `family: "label"`, `position` and `plainName` ("Label above", "Label below"; position words Above, Below, Left, Right, Center, Above left, Above right, Below left, Below right) | Label line names; the Position grid's cell names and tooltips; screen-reader names ("Label, Below: name") |
| Several label meshes on one node | One label mesh per filled slot, built, updated and disposed per slot, stacked clear of the node and of each other; measured at 10,000 nodes with two labels each before release | The canvas |
| Declutter by node | "Hide overlapping labels" hides or shows all of a node's labels together, so a node never shows its size without its name | The canvas; the graph's Canvas section |
| Automatic avoids taken positions | A node with positioned labels places its Automatic label in a free position | The canvas |
| Empty text draws nothing | A slot whose text is unbound or reads absent draws no text, panel or background | Latest note on a node with no notes; any label field absent on some nodes. (The empty "Pick a field" line the "+" adds writes nothing at all, so it waits on nothing.) |
| Number formatting on text bindings (priority raised) | A format on a text binding (decimals, thousands, percent), with `zero: "hide"` so a count label such as Note count draws nothing where the count is 0 (a 0 is a value, not an absent one, so "Empty text draws nothing" does not cover it) | "Sizes below" (the owner's example); Note count; any number in a label |
| Label width with wrapping (carried) | A maximum width and wrapping on `LabelStyle` | Latest note in a label |
| Labels a screen reader can reach | Each node's label texts, by position, as text the page can read (an accessible description per node, or columns the table can show) | The table dock's label columns |

Deferred, not requested: several labels on an edge (edges keep their middle label plus head and
tail captions until a reader asks).

---

## 3. Several tables, joined on any key column (new; owner decision: a primary task)

One load description covers one file and many. It is saved with the project and replayed on open,
so a third-party consumer loads the door-entries example with the same call the app makes.

```ts
await el.session.data.import({
    tables: [
        { name: "people",    source: { config: { file: peopleFile } },    rowsAre: "nodes",
          type: "person", key: "id", displayName: "name" },
        { name: "buildings", source: { config: { file: buildingsFile } }, rowsAre: "nodes",
          type: "building", key: "bldg", displayName: "site", weight: { column: "floors" } },
        { name: "entries",   source: { config: { file: entriesFile } },   rowsAre: "edges",
          links: [ { column: "person_id", type: "person" },        // From, matched on person's key
                                                                    // (or on another unique column: on: "badge")
                   { column: "building_id", type: "building" } ],  // To
          time: { column: "time" }, weight: { derived: "count", meaning: "strength" },
          onePer: "pair", combine: { time: ["min", "max"] },
          missingEnds: "leave-out" },
    ],
    directed: true,
}, { mode: "replace" });                 // ImportOptions, unchanged
const report = el.session.data.lastImport();   // the match report, as today
```

Before the load, the same description goes to `session.data.preview(description)`, which loads
nothing and returns each table's columns, types, sample rows, unique columns, suggested key and
the same `ImportReport` (the "Reading the tables before the load" row below). The Data page draws
everything it shows before Load from that one call, so the app parses and joins nothing.

Each table's `source` is the element's existing `DataSourceInput` (`{ type?, config: { file | url
| data }, name? }`), so there is one way to say "this file".

`displayName` is the Name role (not `name`, which names the table): it sets the existing `nodeLabelPath` for that type, what inspectors,
result cards and the legend call a node. It is not the drawn label, which the owner decided is
picked in styling (section 2).


| Capability | Proposed API | Screens that wait on it |
|---|---|---|
| One load entry point for any number of tables | `DataSourceInput` gains a `{ tables, directed? }` form beside today's `{ type?, config, name? }`, which becomes shorthand for a one-table list, translated inside the element, so there is one way in. `mode` and `layout` stay in `ImportOptions`; `import` still resolves to nothing and the report is still read from `data.lastImport()`. `data.source()` stays and returns the first table's descriptor | The Data page (every load); start screen New from data; drop; paste |
| A link matches any unique column of its type | A link may name the column it matches: `{ column, type, on?: "<column>" }`, defaulting to the type's key. `on` must be unique in that type (refused with a typed error otherwise); a matched row resolves to the node's `{ type, key }`, so identity stays one key per type. Example: entries carry `badge_no` while people are keyed by `id`; `{ column: "badge_no", type: "person", on: "badge" }` | The role menu's "From -> person by badge"; the match report's line per link names the column matched |
| Two table roles | `rowsAre: "nodes"` (a `type`, a `key` column, any number of `links`) or `"edges"` (exactly two `links`, the first From and the second To; refused with a typed error otherwise) | The page's "Each row is: a node, an edge" control; "an edge" disabled with its reason when a table has other than two link columns |
| Rows that become nodes | With `rowsAre: "nodes"`, each row is a node of the table's type (key: the `key` column, or the row number when none is set, in which case the report says "Notes on entries may move if the row order changes", as for an edge table without an id), and each filled `links` column adds one edge to a node of that column's type, the edge typed by the column's name | Door entries as nodes ("Each row is: a node"); the model strip |
| Node types and type-qualified identity | Every node table has a `type` (default: the table name). Two tables of the same type merge on the key and add columns (the old "add columns by key"). A column may carry the Subtype role (`subtype: "<column>"`): an attribute of the node, read at `table.subtype`, that the legend, Color by type and Show as groups use. (Version 4's drafts called this role Type, which clashed with the table's Type, the node's identity, and then Category, which clashed with the existing `"category"` attribute type in `ATTRIBUTE_TYPES`; `subtype` is the conceptual model's own word and means one thing.) It is never part of identity, and links still point at the table's type, so editing that column or re-reading the file never moves a note, a set member or a pin (`element-notes-api.md` 3.1). Node identity is `{ type, key }` everywhere it is stored (sets, notes, pins, positions); "person 17" and "building 17" never collide. **One-way door, to confirm on the element pull request:** kept sets publish `nodes: NodeId[]` today, so returning `{ type, key }` from their getters is a breaking change (a major release). The additive alternative keeps bare ids for a graph with one node type and returns `{ type, key }` only where two types share a key | The page's type field; Attributes grouped by type; inspector titles ("Ann . person") |
| Type and table as paths | Built-in paths `table.type` (a node's type; an edge's table type), `table.subtype` (the Subtype-role column's value, absent without one) and `table.name` (the table it came from), in the reserved `table.*` kind, so a data column named `type` or `kind` never shadows them. Only those three exact paths are reserved; `data.table.type` still reads an attribute of that name, as with `notes.*` | "Color by type" and "Show as groups" on the type; the From data list |
| Graph files are tables too | A GEXF, GraphML, GML, DOT, Pajek, JSON or Neo4j file is one source holding a node table and an edge table whose structural roles the format fixes (shown locked); Neo4j's `labels` column offers itself as the Subtype role | The Data page's one row for a graph file, expanding to its two tables; one Enter to load |
| An edge table with no node table | Ends whose type has no node table create bare nodes of that type; `missingEnds` defaults to `"add"` for such a type and to `"leave-out"` when a node table exists. With no node table at all, both links default to one type, `node`, so a plain edge list (source, target) loads as one node type, as it does today | The report line "No people table: 412 people made from entries"; a lone edge-list CSV loading with one Enter |
| One edge per row, or per pair | `onePer: "row"` (default; every row an edge) or `"pair"` (rows with the same two ends become one edge). In an undirected graph, (a, b) and (b, a) are the same pair: the rule follows `directed`. This subsumes today's `repeatedEdges` setting (`repeated-edges`: keep, first, last, sum, min, max, error): `keep` is Row, and `first`, `last`, `sum`, `min`, `max` are Pair with that reducer on the weight; `error` stays as a check. The element translates the old setting into the new one, so there is one way to say it, and the old name is retired in the next major | The page's "One edge per: Row, Pair" control (it replaces version 3's Repeated pairs field) |
| Combining columns of merged rows | `combine: { <column>: ColumnReducer or ColumnReducer[] }` using graph-format's existing `ColumnReducer` names at load; one column may yield two outputs ("time (earliest)", "time (latest)"). Time's "Earliest and latest" is `["min", "max"]`, never `first` and `last`, which follow row order. The first output keeps the column's role (time (earliest) holds Time; time (latest) is an attribute). A Category column combines by a new reducer `"mode"` (the most common value; ties go to the earliest row), which graph-format's `ColumnReducer` lacks today, or `"drop"`. The row count of each merged edge is a derived column named `count`, or `rows` when the table already has a column named `count`; the preview and the report name the rename | The combine choice under each Number, Time and Category column header when One edge per is Pair |
| Count as the weight | `weight: { derived: "count", meaning }` on an edge table makes the derived row count the weight. The derived column is the output of graph-format's existing `ColumnReducer` `"count"` over each pair's rows, so there is one row-count concept; `{ column: "count" }` always names a file column, so a real column called `count` stays unambiguous. Under `onePer: "pair"` the element defaults the weight to the derived count only when the table names no weight; a weight column the description names keeps its role and combines by its reducer (`sum` by default) | The Weight role's "count" choice (its default under Pair when no Weight is set) |
| A Number column read as Time (new) | `time: { column, unit?: "s" or "ms" }` on a table, always in this object form (one way to say it): `unit` is required on a Number column, which holds seconds or milliseconds since 1970 and becomes a Time attribute at load, and left out on a column that already reads as Time. Without it, Time is offered only on a column that reads as Time | The role menu's Time item on a Number column, with its unit choice (no detour through the attribute inspector, which exists only after a load) |
| An edge id column per edge table | `id: "<column>"` on an edge table; it becomes `EdgeMember.id`, so a note or a kept edge stays on one row's edge across a reload; without one the element falls back to the ordinal and the report says so | The Edge id role; the report line "Notes on entries may move if the row order changes" |
| The match report | `ImportReport.tables[<name>]`: rows read and kept; for each link column, unmatched values with their count, sample rows and the decision taken; repeated keys and which was kept; type mismatches matched as text; near misses (keys that differ only by leading zeros, read through the existing `idCoercion` setting, its first reader); a table that merged into an existing type and how many rows matched; rows merged into pair edges; notes left with a missing target, and notes that a change of edge identity would leave so (switching an edge table from Row to Pair: "3 notes on entries will read 'Not in the current data'"); what a type rename carried along ("12 notes and 1 set follow people -> staff"); the nodes added per type by an Add choice ("person: 412 + 25 added"), which the Tables list, the model strip and the Sources row read; rows kept against rows read under Pair ("1,306 edges from 4,180 of 4,212 rows"); a Name column whose values repeat ("site repeats: 3 names cover 9 buildings"); any table's rows with no weight value and the value they read (`missingWeight: 1 or 0`, default 1, on node and edge tables alike: "1 building has no floors value: its weight reads 1"); a node type with no weight column ("each person weighs 1"). Each entry carries a typed key and parameters so the app words it from the published message catalog | The Data page's match report (always visible); the Sources rows' status mark |
| Reading the tables before the load (new) | `session.data.preview(description): Promise<ImportPreview>` parses the same load description `import` takes and loads nothing. Per table it returns the columns with their detected types, sample rows (under `onePer: "pair"`, one sample row per pair, with the combined columns and the derived count), which columns are unique, `suggestedKey` (a column whose name contains "id" and whose values are unique, else the first unique column, else none; set only when unique and fully matched), and an `ImportReport` built exactly as `lastImport()` builds one. Each choice on the page (a role, Add or Leave out, Row or Pair) calls `preview` again with the changed description. It replaces the separate `data.suggestKeys(table)`, which took a table object no API returns before a load | The Data page before Load: column types, sample grid, uniqueness checks, the model strip's "Makes" line and its counts, the match report and each table's check; one Enter to load a clean file |
| The sources record, saved and replayed | The whole load description kept as a `sources` record in the project (the `graph` slice or a new `sources` slice), readable as `data.sources()`, replayed when the project opens | Sources rows in the Data place; Edit source; reopening a project |
| Where each node and edge came from | `table.name` on every node and edge; `data.removeSource(name)` as one undoable step | Per-source Remove on the Data page and the Sources row menu |
| Renaming a type forwards what points at it | Renaming a type rewrites stored `{ type, key }` references in notes, sets, pins and positions in the same undoable step; a re-import returns what it forwarded and what it could not | The Data page's Type field (Rename type...) and the New type name field in a link's submenu, the two places a type is named; the report's forwarding line; notes and sets keep working after a rename |

---

## 4. Weight, defined when the data is loaded (new; owner decision)

| Capability | Proposed API | Screens that wait on it |
|---|---|---|
| Edge weight per edge table | Each edge table names its weight as one object, `weight: { column: "<name>" } or { derived: "count" }`, each with its `meaning`, or no weight (each edge reads 1); the meaning cannot be set without a weight. The element keeps a weight per edge type (its one weight column today becomes one per edge type). `edgeWeightPath` becomes this per-table setting inside the load description | The Weight role in an edge table's column header; the attribute inspector's "Weight (set when loaded)" tag; the model strip's tooltip |
| Node weight per type, and something that reads it (blocks the success criterion "every run uses the loaded weight" for node weight: until one catalog entry carries `nodeWeighted`, a node weight is defined at load and read by no run) | `weight: { column }` on a node table (per type). A type with no weight column, and a row with a blank weight under `missingWeight: 1`, read 1, so a mixed graph (weighted buildings, unweighted people) has one answer for every node. Today `nodeWeightPath` is declared and read by nothing. A catalog flag `nodeWeighted` on each algorithm and layout that reads node weight (candidates: weighted degree, personalized PageRank seeds, ForceAtlas2 node mass) | The Weight role on a node table; Analyze's PageRank restart weights (personalized PageRank), the one candidate the skeleton draws with its node-weight line ("Node weight: floors (building, loaded)", "each person weighs 1"), marked as needing graphty-element; the floors inspector's "No measure reads node weight yet. PageRank's restart weights would", with the same mark |
| What an edge weight means, per edge table | `meaning: "strength" or "distance" or "capacity"` inside each edge table's `weight` object, in the load description and saved with it (the meaning belongs to the weight, `conceptual-model.md` 3.4). Node weight has no meaning. The element stores a weight and its meaning per edge type, and a run reads them per edge type, so an entries table counted as strength and a distances table can share a graph | The "Higher means" choice beside an edge table's Weight role on the Data page; the attribute inspector's Weight tag |
| Every run uses the loaded weight unless it overrides | Built-in algorithms take `weight?: { column?: Path or "loaded" or "none"; meaning?: ... }`, defaulting to the loaded weight and meaning, as plugin algorithms already can through `defineAlgorithm`'s `weights`. An algorithm that reads the opposite meaning converts (1/w) and says so. The run's existing `caveats.weight` (`{ attribute, meaning }`, which Dijkstra already writes) gains `source: "loaded" or "run"` and `converted`. `defineAlgorithm`'s `weights.meaning` (today `"distance"` or `"strength"`) gains `"capacity"` | Analyze's Weight line ("Loaded weight: count, as strength"; with two or more edge tables, one entry per edge type: "Loaded weights: entries count, stronger; routes km, farther"); the graph inspector's Weight line, likewise per edge type; the Path popover's Weight; a run's Made with ("Dijkstra used 1/count"); a recipe's weight confirmation |

---

## 5. Carried from version 3

These were listed in version 3's section 19 and are unchanged unless noted.

| Area | Capability | Proposed API (where one was proposed) | Screens that wait on it |
|---|---|---|---|
| Styling | Section, order and default on each style descriptor | `section`, `order`, `default` on `CHANNEL_DESCRIPTORS` | The Style tab's section grouping (an app list meanwhile, commented) |
| Styling | Switching the element's default layers off | read `addDefaultStyle` (parsed, never read) | The Everything row's eye |
| Styling | A switch to stop drawing the selection highlight; a default that passes 3:1 | a `selectionStyle.enabled`; a new default color | The Selection row's eye |
| Styling (new) | An edge side for the selection style: the selection style paints selected nodes only today | `selectionStyle.edge` (an `EdgeStyle`: color, width, opacity), beside the node side, under the same `enabled` switch | The Selection row's Style tab, Edges side (`#/inspector-selection-and-everything/selection`); Settings > Override selection highlight on this device |
| Styling | Full label-style field descriptors; a "same size at any distance" option | descriptors for the 47 label fields | The label style fields in the Label popover |
| Styling | Plain names for every choice value | `plainName` per allowed value | Shape, pattern, arrow and font-weight pickers |
| Styling | A drawable `node.marker` | -- | not offered until drawn |
| Styling | Themes (issue #331); a grayscale and color-blind check | -- | Print-safe colors in the Canvas section |
| Styling | Replace the style with a document | a replace option on `applyTemplate` | Apply file (a file always lands on top meanwhile) |
| Styling | A hover layer that takes a set; a configurable hover look | -- | Outlining a selected row's members |
| Styling | A draw-only hide that also hides incident edges | -- | Hide on canvas; the tree footer's hidden count |
| Styling | Collapsed drawing of a set as one node | -- | Collapse on canvas |
| Styling | `explain` over a set of elements with coverage | `styles.explain(elements)` | Why this look for several elements |
| Styling | Label templates (low priority) | -- | "Name (degree)" in one label |
| Styling | Confirm Overrides as one id-keyed binding per property | `encode` with a per-value `map` | The Overrides row |
| Picking | Click, hover and right-click on an edge on the canvas | edges pickable | Selecting and noting an edge on the canvas |
| Naming | Rename a run; per-group names that survive a rerun; a display name for an attribute | -- | Rename on run rows, group rows and attributes |
| Cameras and views | Rename a saved view; an ordered collection with tour membership; a view snapshot (rows on, filters, positions, legend) | -- | Views place Rename, order and In tour; a view's "Keeps" line; Present |
| Cameras and views (new) | The reason a device cannot enter VR or AR: `isVRSupported()` and `isARSupported()` return only true or false | Both return `{ supported: boolean; reason?: "no-webxr" or "no-device" or "insecure-context" or "permission-denied" }` (a new pair, `xrSupport("vr" or "ar")`, keeps the boolean pair as shorthand) | The View flyout's VR and AR items, disabled with the reason in words (`#/view-flyout/3d`) |
| Cameras and views | 2D tour waypoints (to confirm); a zoom reading in 3D; reduced motion; a canvas color scheme; a configurable keymap; lasso selection; an in-headset menu; AR placement and scale | -- | Export > Video tour in 2D; Settings; the toolbar's Select; the hand menu |
| Layout | Confirm that resuming a settled layout continues from current positions; positions saved as a document | -- | The toolbar's Layout button; project files |
| Output (new) | A chosen background color for an image: `captureScreenshot` draws the canvas background or none (transparent) | A `background?: "canvas" or "transparent" or <color>` option on `captureScreenshot` | Export > Image, Background: White (`#/export-image`) |
| Output (new) | Writing only a set's nodes, and the edges among them | A `scope?: { set: SetId }` option on `exportGraph`, beside the filtered-only option already asked for | Export > Data, Scope: Watchlist (`#/export-dialog/from-row`) |
| Output (new) | Run records a recipe can restore without computing again | `exportRecipe({ results: true })` writes each run's result columns with its record (algorithm, options, weight, data fingerprint), and `applyRecipe` restores them when the fingerprint matches instead of rerunning | Export > Recipe, "Restoring the results without running again" (`#/export-dialog`, Recipe) |
| Output | SVG figure export (owner decision), PDF later; the legend drawn into images; a run-record methods writer; confirm scope-carrying column headers and filtered-only export in `exportGraph` | -- | Export > Image SVG; Export > Image and Export > Video (the legend in a captured frame); Export > Report; Export > Data |
| Data | Live connectors (issue #643); filter at import; queuing additive loads; a per-load cancel; import reports kept per load; what a replacing load does to runs and bound layers; data versions and diffs; the dead time-attribute config slots; windowing dynamic GEXF spells | -- | Data page; loading card's Cancel; Version history |
| Data | An attribute type override and an ordinal level; re-deriving what depends on a known field changed after load; an attribute as a layout axis; computed columns; merging nodes; OR and NOT between filter steps; derived-graph transforms | -- | Read as; Data page Apply without reload; Place by; Attributes "+"; Merge nodes; New graph from...; Extract as graph (context menus) |
| Analysis (new) | A direction option on shortest path: follow edges as directed, or read every edge both ways. graphty-element's shortest path reads every graph as undirected today | `direction: "follow" or "either"` on the shortest-path algorithms (Dijkstra, A*, Bellman-Ford), defaulting to "follow" on a directed graph | The Path popover's "Follow edges" choice on the transfers (`#/path-popover/transfers-directed`) |
| Cameras and views (new) | A video tour stop that names a saved view and a hold time | A tour stop (`CameraWaypoint`, today a 3D position, a target and the time to reach it) may instead name a saved view (`view`) and carry a `hold` time; the same stop works in 2D | Export > Video, View: Tour of saved views ("tour stop takes no saved view and has no hold time") |
| Analysis | Clustering, transitivity, diameter and degree assortativity in `data.statistics()`; earlier results of a run; comparing runs, stability across seeds, null-model tests | -- | The graph's Summary; Restore an earlier result; Check; Compare with another run |
| Analysis (new) | Louvain's run options beyond resolution, max iterations, tolerance and optimized: which hierarchy level to keep, a time limit, a seed, and running on a set | `level?: "final" or "first" or number`, `maxTime?: ms`, `seed?: number` and `scope?: { set: SetId }` on Louvain's options | The Louvain row's Level, Stop after, Seed and scope fields (`#/inspector-run-row/style`, its settings) |
| Analysis (new) | How many hierarchy levels a Louvain run found | The run result carries `levels: number` and each level's partition, readable as `results.louvain.level(n)` | The Louvain row's "Levels in between" choice (`#/inspector-run-row/hierarchy-level`) |
| Analysis (new) | Agreement between two partitions, and the range reruns of one method give | A `compare(runA, runB)` returning a partition agreement score (adjusted mutual information), and `rerun(run, { seeds })` returning the score range across seeds | Compare two months (`#/full-canvas-modes`), the agreement bar and its gray rerun band |
| Session | A whole-session document (runs, sets, notes, positions, history); app-owned steps (folders of set rows, the Views order) in the element's undo history, to confirm | -- | Save and open; one Undo for everything |
| Documentation | The documented `debug` attribute that does not exist | -- | -- |

Withdrawn since version 3: "join by key with match counts" (replaced by section 3, which does
more); "reading a weight as strength in the path options" (replaced by section 4's per-run weight
and meaning); "a notes store keyed by target that produces the reserved notes layer" (replaced by
section 1).

---

## 6. Not graphty-element, but blocking a screen

- **compact-mantine's secondary text color is 3.9:1 on white** (`--cm-text-secondary`,
  `#00000080`), under WCAG's 4.5:1 for text that is a line's only content. The empty label
  line's "Pick a field" depends on it. The fix belongs in compact-mantine's token, so every
  caller gets it; the skeleton's copy of the kit tokens shows the fixed value.
- **The graphty app's "open notes" issues badge** (`graphty/src/components/shell/types.ts`)
  promises a status that notes do not have. It is deleted, and the status-bar chip shows a plain
  count read from `notes.list()`.

---

## 7. Wide data: dozens of attributes per node and per edge (new in version 5)

`session.data.attributes()` already returns, per attribute, its path and names, kind, type,
origin, completeness, distinct count (capped at 256), range and up to five sample values
(`graphty-element/src/catalog/types.ts`, `AttributeDescriptor`). That is enough to search, group
and describe 69 attributes, and the field list is built on it. What it lacks:

| Package | Capability | Proposed API | Routes that wait on it |
|---|---|---|---|
| graphty-element | What uses each attribute ("In use") | `AttributeDescriptor.usedBy: Array<{ kind: "style" or "label" or "filter" or "role" or "join" or "run"; ref; channel? }>`, where `ref` names the style layer, filter step, table role or run (a run whose weight override reads it) that reads it and `channel` names the style channel (`node.color`) or role (`weight`) it feeds, so the field list's tag ("Color", "Weight", "Filter") is read from the element, never worked out from the app's copy of the layers; recomputed on `style:changed`, `filter:changed` and a load. Only the element knows every layer, label, filter and role, so an app that worked this out from its own state would be reimplementing the element. The same data drives the existing "Painted by" links, so it replaces nothing and adds one field | `data-place/attributes-wide`; `style-pickers/wide-color-by`, `wide-size-by`, `wide-bind`, `wide-label`; `inspector-node/wide-data`; `inspector-edge/wide-data`; `table-dock/wide`, `wide-columns`; `data-page/wide-find-column` (columns with a role first) |
| graphty-element | Which node type or edge table an attribute belongs to (review, version 5) | `AttributeDescriptor.elementType: string`: the node type or edge table type whose elements carry it. With two or more types, `attributes()` returns one descriptor per type that carries a path (people and buildings each with an `id` give two), each with its own completeness, range and samples; a graph with one node type and one edge table returns what it returns today plus the field. `kind` stays "node" or "edge". Without it, the field list's "groups by table" would have the app guess which type a column came from | `data-place/attributes-wide`; `data-place/attributes-nested`; every `style-pickers/wide-*` route; `table-dock/wide-columns`; the door-entries Attributes list |
| graphty-element | Where a nested attribute sits | `AttributeDescriptor.parent: string or null`: the path of the sub-object a flattened attribute came from (`attributes.profile.contact` for `attributes.profile.contact.email`), set only for columns graph-io flattened (section 8), never guessed from a name, so a CSV column literally named `address.city` has no parent | `data-place/attributes-nested`; `inspector-node/nested-data`; `data-page/json-researchers` (the grid's parent headers) |
| graphty-element | A short name | `plainName` becomes the last segment of a flattened path (`email`); `path` and `name` keep the full path inside the record, which is what is stored and bound. Today `plainName` is the raw name | every field list on the nested sample |
| graphty-element | List attributes | `type: "list"` with `itemType` (`"string"`, `"number"`, ...) in the descriptor, for a column graph-io stored with the `list` data type; `completeness` counts a record with an empty list as having no value; `uniqueCount` and `sampleValues` count items. Show as groups on a list attribute makes overlapping groups (the conceptual model's cover) | `inspector-attribute-and-filter-step/list-attribute`; `data-place/attributes-nested` |
| graphty-element | Kept-whole values described honestly | A column holding objects or arrays kept whole reports `type: "json"`, not `"mixed"`; `"mixed"` stays for a column whose values really differ in type. With the List attributes row, the exported `ATTRIBUTE_TYPES` gains `"list"` and `"json"`, so a consumer's exhaustive switch over `AttributeType` stops compiling: additive at run time, released in a minor with the change named in its notes, to confirm on the element pull request | `inspector-node/nested-data` (a value kept whole drawn as a collapsed tree, read through `session.data.node(id)`, which already returns it deep-frozen) |
| graphty-element | Which attributes a style channel can take | `AttributeDescriptor.domainKind: "numeric" or "categorical" or "boolean" or null`, the same words `ScaleDescriptor.domainKind` already uses, so a typed picker (Size by, Color by, Width by, the Weight line) lists the attributes no scale accepts as unsuitable, with the reason, without the app mapping attribute types to scales. `null` for a `list` or `json` attribute ("tags holds several values; use Show as groups"). Without it the app would be copying the element's type-to-scale rules | `style-pickers/wide-size-by`; `style-pickers/wide-color-by`; `analyze-popover/wide-weight` |
| graphty-element | The keyboard node walk (owner decision) | With focus on the canvas, Shift+Right or Shift+Down selects the next node in the snapshot's node order and Shift+Left or Shift+Up the previous one; plain arrows keep orbiting in 3D and panning in 2D. The walk starts after the node last selected (a click on a node moves its cursor there), raises the same selection event as a click, and announces "<name>, <n> neighbors" through the element's live region. The element reports the neighbor count; the skeleton counts it from its fixture rows only as a stand-in (`app.js` `walkNodes`) | `canvas-and-states/walked`; `inspector-node/plain-data`; every node inspector state the walk opens |
| graphty-element | Source order | `AttributeDescriptor.order`: the column's position in its source, so a list can offer "source order" later without the app re-reading the file. Low priority: no route sorts by it yet | -- |

Not requested: a column limit or a keep-and-drop column option at import. Wide data is handled by
the descriptors and the field list, and no sample is too large to load whole.

---

## 8. Nested JSON (new in version 5)

### What exists today

- **graph-io** reads eight JSON dialects and finds the node and edge arrays through `nodesPath`
  and `edgesPath`, dotted object keys only: no array steps, no wildcards
  (`graph-io/src/formats/json/importer.ts`). A nested object or array in a record becomes one
  opaque `json` column, and one such value turns the whole column `json`
  (`graph-format/src/columns/infer.ts`). There is no flatten step.
- **graphty-element's** JSON source evaluates `node.path` and `edge.path` as JMESPath, but has
  graph-io read only a stub of each record with the dialect forced to node-link, so it cannot read
  JGF, Cytoscape, graphology or vis files and never uses graph-io's dialect sniffing
  (`graphty-element/src/data/JsonDataSource.ts`). The format catalog advertises only `nodeIdPath`.
- **Paths after the load**: style bindings, the "has" selector and filters look up a path as one
  column key, so `data.address.city` reads the key "address.city" and paints nothing, with no
  error. Labels alone read their `textPath` with full JMESPath over the raw record. That is two
  path dialects in one element.

### The design these rows serve

A nested document is a source of tables (`owner-questions-5.md`, section 3). An array of records is
a table, found by a path through arrays. Sub-objects are flattened into dotted columns at every
depth when the file loads. An array inside a record becomes One value, Several values, Several
edges or Several rows. After the load every value is an ordinary column, read by one path reader.

The load description is version 4's (section 3 above) with three new table fields:

```ts
const doc = { config: { file } };                    // one source; parsed once
await el.session.data.import({ tables: [
  { name: "researchers", source: doc, at: "data.researchers[*]", rowsAre: "nodes",
    type: "researcher", key: "id", displayName: "attributes.name.family",
    keep: ["attributes.profile.contact"],                    // Keep as one value
    arrays: { "tags": "values" },                            // Several values
    links: [ { column: "relationships.coauthor_ids[*]", type: "researcher", onePer: "pair" },  // Several edges
             { column: "relationships.advisor_id", type: "researcher" } ] },
  { name: "affiliations", source: doc, at: "data.researchers[*].attributes.affiliations[*]",
    rowsAre: "edges",                                         // Several rows, read as edges
    links: [ { column: "parent" }, { column: "institution_id", type: "institution" } ] },
  { name: "institutions", source: doc, at: "data.institutions[*]", rowsAre: "nodes",
    type: "institution", key: "id" },
  { name: "links", source: doc, at: "links[*]", rowsAre: "edges",
    links: [ { column: "source", type: "researcher" },
             { column: "target", type: ["researcher", "institution"] } ],  // Any of these types
    weight: { column: "weight", meaning: "strength" } },
] });
```

### graph-io

| Capability | Proposed API | Routes that wait on it |
|---|---|---|
| Describe a document's structure | `describeJson(input, { sampleRecords = 1000 }): JsonShape`, a tree of `{ path, kinds, count, itemShape: "value" or "id" or "record" or "mixed", maxItems, sample, children }` over objects and arrays (leaves carried as each record array's columns). `maxItems` is the largest array length, which decides whether One value can store a plain value. The element passes it on as `preview().structure` | `data-page/json-tree`; `data-page/json-researchers`; `data-page/json-no-records` |
| Paths that step through arrays | `at`, `nodesPath` and `edgesPath` accept names, `.`, `[*]` (every item of an array), `.*` (every value of an object, for records keyed by id) and quoted names (`"address.city"` for a key that contains a dot). A table whose `at` ends in `.*` gets its object key as a column, named by `keyAs` (default `key`). This is graphty-element's own grammar, named as such in its docs, and it matches neither standard: every `[*]` and `.*` flattens (`a[*].b[*]` is one row per inner item, where JMESPath gives a list of lists), no leading `$` is needed, a quoted name may follow a `.` (RFC 9535 accepts it only in brackets), and `[*]` applies only to arrays and `.*` only to objects. Indexes, filters, slices, recursive descent and functions are refused with `E_PATH_SYNTAX`. A path that finds nothing gives `E_JSON_PATH_EMPTY` on the table that names it | `data-page/json-tree`; `data-page/json-path-gone` |
| Flatten sub-objects at load | On by default for every record table, including the node and edge records of a graph file graph-io recognizes (graphology's `attributes`, Cytoscape's `data`, node-link's own fields), so a plain graph JSON with nested attributes still loads in one step and reads `address.city` as a column: every object leaf at any depth becomes a dotted column relative to the record (`attributes.profile.metrics.citations.total`), stopping at arrays; `keep: string[]` names sub-objects stored whole as one `json` value. A nested leaf whose dotted name equals a literal key gives `W_JSON_PATH_COLLISION`; the literal key keeps the plain name and the nested leaf is reachable by its quoted path | `data-page/json-researchers`; `data-page/json-keep-value`; every nested attribute route |
| What an array of values becomes | `arrays: { <path>: "one" or "values" }`. `"one"` keeps the array as one value, stored as its single item when no record holds more than one; `"values"` stores a `list` column (graph-format below). Several edges and Several rows are expressed through `links` and `at`, not here, so there is one way to say each | `data-page/json-array-menu` |
| Child tables | A table whose `at` lies inside another table's records gets a `parent` column holding the parent row's key (its row number when the parent table has no key, which the report names, as for an edge table without an id), so it can link back with an ordinary link; this holds at any depth (a grandchild links to its child-table parent) | `data-page/json-affiliations` |
| Other document shapes | `describeJson` marks an object whose values share one record shape as `keyed: true` (records keyed by id, the JGF form generalized) and an object of scalar values keyed by ids inside a record as `keyedValues: true`; a top-level array, and JSON Lines (`.jsonl`, `.ndjson`, read as one array, detected by the existing sniffing), are tables at the root path; an array of equal-length arrays is a table whose columns are `column1` ... `columnN`, the names the CSV reader already gives a headerless file. A keyed object of values takes `arrays: { <path>: "one" or "values" }` and a link on `<path>.*` like an array's `[*]` link: its key is the linked id and its value is stored on the edge as `value` | `data-page/json-keyed` |
| What was not read | The existing `W_JSON_UNREAD_KEY` reported for any top-level block no table reads (`meta`), with its entry count, in the element's report | `data-page/json-report` |
| Issues for nesting | `E_JSON_NO_RECORDS` (valid JSON with no array of records), `W_JSON_ITEM_SHAPE` (an array whose items differ in shape, for example an object in 3 records and a list in 167), plus the codes above; each with a typed key and parameters for the published message catalog | `data-page/json-no-records`; `data-page/json-report`; `data-page/json-invalid` (the existing parse error, with line and column) |

### graph-format

| Capability | Proposed API | Routes that wait on it |
|---|---|---|
| Lists inferred, not only declared (corrected in review, version 5) | graph-format already has the `list` dtype (offsets plus one non-list child column, `graph-format/src/types/columns.ts`), and graph-io already writes one for Cytoscape's `classes`, so no new data type and no one-way door. What is missing is inference: `inferValuesDtype` turns any array into `json` (`graph-format/src/columns/infer.ts`). It gains a `list` result when every non-empty value is an array of scalars of one inferred type, so `arrays: { tags: "values" }` and the default for arrays of scalars produce `list<string>` (or `list<i32>`, `list<f64>`) | `inspector-attribute-and-filter-step/list-attribute`; `data-place/attributes-nested` |

### graphty-element

| Capability | Proposed API | Routes that wait on it |
|---|---|---|
| The JSON source reads every dialect | `JsonDataSource` loads through graph-io with its dialect sniffing, so node-link, d3, JGF, Cytoscape, graphology, vis and the NetworkX forms load in one step as a graph file (version 4's "Graph files are tables too"). Today it forces node-link: an element defect, not something for the app to work around | `data-page/json-plain` |
| Nested tables in the load description | Table fields `at` (a path through arrays to the records), `keep` and `arrays` as above; a link whose column ends in `[*]` makes one edge per item (Several edges); `node.path` and `edge.path` become shorthand for `at` on a two-table description, translated inside the element, so there is one way to say it. A `node.path` or `edge.path` a consumer already wrote keeps its JMESPath reading whenever the two grammars differ on it (a filter, a function, or nested wildcards such as `a[*].b[*]`, which JMESPath reads as nested lists), deprecated with a warning, until the next major release, so no existing load breaks | `data-page/json-tree`; `json-researchers`; `json-keep-value`; `json-array-menu`; `json-affiliations` |
| Suggested tables | `preview()` returns `structure` (graph-io's shape) and `suggestedTables`: arrays of records (and objects of records keyed by id, their key as Key) whose items carry a unique field chosen by version 4's `suggestedKey` rule as node tables; arrays whose records carry two fields whose values match the keys of proposed node tables as edge tables, matched by value, not by field name, so `from`/`to`, `src`/`dst` or `person`/`org` are found as readily as `source`/`target`; arrays of ids inside a record whose values match a proposed node table's keys as proposed Several edges; and on an edge table a numeric column named `weight` (or `value`, graph-io's GEXF and GML name) as its proposed Weight, so a weight is set at load as the owner decided, in nested and plain JSON alike. So the common case is one review and Load on any document, not only the sample | `data-page/json-tree`; `data-page/json-keyed` |
| A count for every pending choice | `preview().tables[n].arrays[<path>].counts = { values, rows, edges }`, so each item of an array's role menu shows what it would produce ("Several edges (514 edges)") from one call, not one preview per item | `data-page/json-array-menu` |
| Links to several types | A link's `type` may be a list (`["researcher", "institution"]`): each value is matched against those types' keys; a value that matches two is refused as `E_LINK_AMBIGUOUS`, counted in the report with sample rows; the report counts the matches per type ("118 to researcher, 42 to institution"). Reading the target type from a column stays out of scope | `data-page/json-any-type`; `data-page/json-report` |
| Pairs listed from both sides | On a list link (Several edges), `onePer: "pair"` (the default on an undirected graph) makes one edge for a pair the two records both list, and the report counts such pairs ("4 co-author pairs are listed by both researchers") so the reader's One edge per: Item or Pair choice (version 4's control, `onePer: "row"` meaning one edge per item) is informed | `data-page/json-report` |
| Lists in selectors and filters | `contains(data.tags, 'PI')` in selector expressions and a "contains" condition in filter steps, for `list` attributes | `inspector-attribute-and-filter-step/list-attribute`; Select where on the nested sample |
| One path reader | Labels read `textPath` through the same column reader as style bindings, selectors and filters, so `attributes.profile.h_index` reads the same everywhere; JMESPath `textPath` over the raw record is kept as a deprecated fallback until the next major release | `style-pickers/binding-long`; Label on any nested attribute |
| A path that reads nothing is an error | A binding, selector, filter or label path that matches no column, or reaches into a value kept whole, is reported as `E_UNKNOWN_ATTRIBUTE` with the path, instead of painting nothing. It is reported per line through `styles.explain`, not thrown when the binding is set, and only for a path that is neither a column nor a path graphty-element itself declares: catalogued algorithm result paths (`algorithmResults.*`, which have no column until the algorithm runs, so `applySuggestedStyles` never trips it) and `notes.*` are never unknown | `style-pickers/binding-unknown-path`; `inspector-node/why-unknown-path` |
| Quoting literal dotted names | Paths quote a name that contains a dot (`data."address.city"`), the JMESPath way; documented with the selector grammar | a CSV column named with dots; `W_JSON_PATH_COLLISION`'s report line |
| The catalog advertises it | The JSON entry in `catalog/formats.ts` lists `at`, `keep` and `arrays` (and `node.path`, `edge.path` as their shorthand), each with its `plainName`, so a third party discovers nested loading without this repository | a third party's discovery; the Data page's File settings |
| The load description is saved | The new fields are part of the saved sources record (section 3 above) and are replayed on open and Refresh; a Refresh whose document gained or lost a sub-object field reports the columns added and lost before Apply, as version 4's lost-attribute line does | `data-page/json-path-gone`; Edit source on the nested sample |

---

## 9. Kept in the app, and deferred

**Kept in the app**, because it is presentation and a third party building its own screen would
choose differently, so nothing is reimplemented:

- Searching a list of attributes on screen, and its word-start matching. (The accessibility
  specialist proposed a `matches(query)` in the element; the studio keeps matching in the app.)
- The order of a list (In use first, then computed, then by name), grouping by table and by the
  element's `parent`, and truncation.
- Which columns a table view shows ("Columns: 8 of 69"): a view setting, never a data change.
- Drawing a typed picker's unsuitable fields last and disabled: which fields suit a channel, and
  the reason, come from the element (`AttributeDescriptor.domainKind`, section 7); the app only
  orders and draws them.

**Deferred**, each to be added when a study or a file needs it:

- Ranking a link's "by" columns by how many values the two tables share. Meanwhile the list uses
  version 4's `unique` and `suggestedKey` from `preview()`.
- Array indexes (`[0]`) in stored paths, filters in paths, and recursive descent.
- A column limit, or keeping and dropping columns, at import.
- Reading a link's target type from a column (a polymorphic link), carried from version 4.
