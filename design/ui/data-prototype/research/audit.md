# Data prototype: audit of the app and graphty-element

What exists today for every data job the prototype must do, what the graphty app does itself that
belongs in graphty-element, and what is missing. Paths are relative to the repository root. "This
branch" is `feat/data-prototype` (golden plus the data mocks). Read-only audit, 2026-10-19.

## 0. The first finding: the condition cards are not on this branch

The condition cards the owner wants filters built from (the Style tab's `WhichPicker`, its card
model, filter steps made of condition cards, Replace with file, the sources list) exist only on
the branch `design/studio-tier3`, which is 1,190 commits ahead of the merge base with this branch
and is not in `golden` or `master` yet.

On `design/studio-tier3` and not here:

- App: `graphty/src/workspace/style/WhichPicker.tsx` (2,391 lines) and `style/cards.ts`,
  `data-place/Filters.tsx`, `data-place/filterSteps.ts`, `data-place/filterWords.ts`,
  `data-place/SourceValues.tsx`, `data-place/sourceActions.ts`, `data-place/attributeActions.ts`,
  `data-page/__tests__/Replace.real-element.test.tsx`, the `canReplace` / `replaceSource` doors in
  `data-page/request.ts`.
- graphty-element: `session/visibility/steps.ts` (filter steps: `visibility.steps`, `setSteps`,
  `previewSteps`, each step `{ id, on, rule }` combined with AND), `data.sources()` returning
  `LoadedSource[]` (every load still in the graph, with its tables, table kinds, added counts and
  left-out rows), `data.loadedWeight()`, `data.valueCounts(path)`, `data.setValueLabel` /
  `valueLabels`, `session/styles/tree.ts` and `rows.ts` (the layer tree the cards write), and about
  13,000 changed lines under `graphty-element/src/session`.

Consequence: the prototype must start from a merge of `design/studio-tier3` (or from golden once
that branch lands). Building filters, sources or Replace on this branch would make a second copy of
work that already exists. Everything below says which branch a thing is on when it differs.

## 1. Job by job

### 1.1 Load a file (drop, open, paste, URL)

Exists:

- Element: `session.data.import(source, choices)` detects the format (name, then bytes), one undo
  step (`graphty-element/src/session/types.ts`, `SessionDataApi.import`). `session.data.prepare()`
  returns a `LoadDraft` (`types.ts` line 1117; `session/draft.ts`): tables, columns with type,
  completeness, unique count, samples and a suggested role; `resolve`, `missing`, `report`,
  `rows(table, { only: "unmatched" | "rejected" | "loaded" })`, `load`. `LOAD_ROLES` is exported
  from `./session` (`session/draft.ts` line 82). `DraftTable.weightCandidate` and
  `DraftTable.delimiter` exist.
- App: drop anywhere on the start screen (`graphty/src/workspace/start/StartScreen.tsx` line 717),
  `openFile` / `openUrl` (`start/open.ts`), the Data page (`data-page/DataPage.tsx`,
  `useLoadDraft.ts`, `choices.ts`), the Sources "+" with File, From a URL, Paste
  (`data-place/DataPlace.tsx` line 54).

App work that belongs in the element, or is stale:

- `data-page/choices.ts` line 55: `ROLES_BY_KIND` is a private copy of the role list "until #926".
  `LOAD_ROLES` is now exported. Delete the copy (requirement 2).
- `data-page/useLoadDraft.ts` line 70: pick order decides which of two files is the node file
  (#911). The element should decide which table is nodes and which is edges from their columns.
- `data-page/DataPage.tsx` line 154: the app decides whether a second dropped file becomes the
  second table of the draft or replaces it (#930). Element: `LoadDraft.add(file)` or a
  `prepare([a, b])` that reads several files and assigns tables.
- `data-page/DataPage.tsx` lines 341, 615, 629, 707, 850 cite #926, #911, #927 as "the element does
  not say yet"; `weightCandidate`, `delimiter.detected`, `resolve()` and `rows({ only })` now say
  it. Recheck and delete each comment that is stale.
- `start/open.ts` line 123: a file opened inside a project is merged silently with
  `existing: "keep"` (requirement 13's defect), and the error's English `message` is shown to the
  reader instead of words from its `code`.

Missing:

- "Read as..." for a file nothing recognizes (requirement 6): the element rejects with
  `E_UNKNOWN_FORMAT` and lists formats; the app offers no picker.
- A dropped recipe, style file or project routed to its own door (requirement 6).

### 1.2 Special fields (id, label, source, target, weight, time, kind)

Exists: `ColumnRole = "key" | "label" | "source" | "target" | "weight" | "time" | "edgeId"`
(`session/types.ts`); `TableMapping` per table with `rowsAre`; `AttributeDescriptor.roles`
(`catalog/types.ts` line 1071) says which role each column plays after a load;
`data.knownFields` holds `nodeIdPath`, `nodeLabelPath`, `nodeTimePath`, `edgeTimePath`,
`edgeIdPath`.

Missing (element):

- A `kind` role. Neither `ColumnRole` nor `AttributeRole` has it, and nothing writes a node or edge
  kind. See 1.12 for why it is a data feature.
- Change a role after loading as one undo step (requirement 39). Today roles are set only at load
  time; afterwards only `data.declare(column, { measurement })` exists.

### 1.3 Column type, rename, hide, unhide, hide others

Exists:

- Element: `AttributeDescriptor.type` (`string | number | integer | boolean | time | category |
mixed`), `completeness`, `uniqueCount`, `min`, `max`, `sampleValues`, `origin` (`imported |
joined | computed | result`), `measurement` and `data.declare` to set what it measures,
  `data.histogram(column)`, `usedBy` (layers and runs that read it). `data.resultColumns(kind)`
  lists run result columns.
- compact-mantine `DataTable` (`compact-mantine/src/components/DataTable/types.ts`) already takes
  per column `icon`, `headerTooltip`, `menu` (a header menu), `hideable`, `pinned`, and
  `hiddenColumns`, `columnOrder`, `setColumnHidden`, `moveColumn`. The header pieces the owner
  asked for (type icon, warning icon with hover details, context menu) need no new component.
- App: `table/TableDock.tsx` hides columns through a checklist menu, kept in a module `WeakMap`
  per workspace (not saved with the project); `table/columns.ts` builds the column list.

App work that belongs in the element, or is stale:

- `table/columns.ts` line 56: WORKAROUND #922 probes each run with a zero-row page read to learn
  whether it has a per-node column. `data.resultColumns(kind)` now answers it. Delete the probe.
- `table/columns.ts` line 84: "every attribute starts shown ... the element does not publish the
  attributes in use (#923)". `roles` and `usedBy` now publish it.

Missing:

- Element: change a column's type (requirement 17): `data.retype(column, type)` as one undo step,
  with a dry-run count of values that will not convert and what becomes of them, saved in the
  columns schema. Nothing like it exists (`grep retype|setType|convert` finds nothing).
- Element: rename a column so styles, filters and runs that read it follow (requirement 37):
  `data.renameColumn(column, name)`. Only `data.renameSource` exists.
- Element: "how many values do not fit this type" per column, as a count with the row numbers
  (`DraftColumn` and `AttributeDescriptor` carry `type: "mixed"` but no count of misfits).
- App: the header type icon, warning icon, context menu (Type, Role, Rename, Hide, Unhide, Hide
  others) in `table/RecordTable.tsx` through the `DataTable` column props; hidden columns saved in
  the project file's `extensions` member (`session/projectFile.ts` line 100, `ProjectSaveOptions.
extensions`) so they are remembered (requirement 38). Hiding a column from the table is the
  reader's view choice, so it is the app's; it must not delete data.

### 1.4 Warnings and "ignore"

Exists: `LoadReport` (`graphty-element/src/data/report.ts`): `unmatched` rows and values,
`duplicates` rows and ids, `repeated` edges (seen, kept, dropped, merged), `counts.rejected`,
`errors: LoadError[]` as `{ code, params, line, field }`, `tooLarge`. Choices that act on them:
`unmatched: "add" | "leave-out"`, `duplicateIds: "first" | "merge" | "refuse"`.

Missing (element):

- Column-level findings as facts: decimal-comma numbers, padded spaces, case-only id variants,
  blank ids, mixed types, missing weights, self-loops (requirements 8 and 30). Each as `{ code,
params, column, rows }` with its offered fixes as data (`fixes: [{ id, code }]`), so the app can
  draw one fix list with no nested menu.
- An "ignore" that is a recorded choice: `draft.report(choices)` taking `ignore: [findingId]`, kept
  in the project so the warning does not come back on reopen or replace. Today nothing can be
  dismissed, and the app's words say it cannot fix rows (`data-page/words.ts` line 111, #803).
- Cleanup steps as commands with one undo each (trim, merge case variants, fill blanks).

App work: a warning icon per column header with the facts on hover, one flat list of fixes plus
Ignore per warning.

### 1.5 Multiple sources, and which source an element came from

Exists:

- This branch: `data.source()` (the last load only), `data.renameSource`, `data.loads()` (network
  source loads only, `session/sources/ledger.ts`), and each node or edge a network load brought
  carries `_source.loads` (`session/sources/ids.ts`, `SOURCE_ATTR`).
- `design/studio-tier3`: `data.sources()` lists every file and network load still in the graph,
  with tables, table kinds and added counts, moved by undo, saved with the project.

Missing (element):

- Per-element provenance for FILE loads. A node from `people.csv` carries nothing that says so;
  only network rows are stamped, and a merge does not union the keys
  (`session/sources/load.ts` line 193, a `ponytail:` note). Needed for "an edge names its source"
  (requirement 29) and for the data-source condition (1.8).
- Remove one source, keeping elements another source also supplied (requirement 54).

### 1.6 Joins: a table onto nodes by key, matching ids, merging graphs

Exists:

- `import(..., { mode: "merge", existing: "keep" | "update" })` adds a second file to the graph,
  matching nodes by id exactly. `existing` is reachable through `import` (it takes
  `SourceLoadOptions`) and through `data.ts` line 655, but NOT through `LoadDraft.load(choices)`,
  whose `LoadChoices` has no `existing`.
- `AttributeDescriptor.origin` already has the value `"joined"`, and the ledger lists `joinOn` and
  `columnPrefix` among the load options it records (`session/sources/ledger.ts` line 13). Nothing
  reads either: there is no join. `session/draft.ts` line 716: "several of a kind wait for joins".

Missing (element), the largest gap:

- `data.join(table, { on: { table: column, graph: path }, kind: "node" | "edge", columns,
clash: "keep" | "replace" | "prefix", match: "exact" | "loose" })` as one undo step and one
  recipe command naming its key columns, with the table saved as a source (requirements 14, 45).
- `data.planJoin(...)` (or `draft.report` with a join choice) returning neutral counts: matched
  rows, table rows not in the graph, nodes with no value, repeated keys with examples, how many more
  match ignoring case and spaces, and the clashing column names (requirement 14's test: 318
  matched, 22 not in the graph, TP53 on 2 rows, 19 more ignoring case).
- A key suggestion: which table column best matches which graph column (unique-count overlap).
- Matching across graphs by a key column or a mapping table, stored as a rule and recomputed on
  open (requirement 58); union, intersection and difference of two named graphs (requirement 56);
  merge of case or space variant duplicates (requirement 31). Advanced tier; the key match is the
  shared core and should be built once for all of them.

App work: a join configuration (full screen is acceptable) that draws the plan's counts, offers
the key, and commits; "Add columns to nodes" as one of the three verbs for a second file.

### 1.7 Replace with a newer copy, keep the work

Exists:

- This branch: a replacing `import` empties the graph in the same step; styles and layers are
  session state and survive; the project boundary fires (`session/project/boundary.ts`) so
  autosave keeps the old work; one undo restores the old data.
- `design/studio-tier3`: Replace with file in the app (`data-page/request.ts` `canReplace`,
  `replaceSource`), offered only when the graph came from one load of one table; runs go out of
  date with a reason and do not rerun by themselves.

Missing (element):

- A diff report for the replace: nodes added, removed and changed, attributes changed, and
  anything that no longer binds (layers, sets, filters, joins naming a column or id that is gone)
  (requirement 16's "+12 / -3 / 40 changed").
- Reapply joins and the column mapping onto the new copy (needs 1.6), and a mapping remembered by
  header name (requirement 19).
- Replace of one source among several, keeping the others (needs per-element provenance, 1.5).

### 1.8 Filters through the condition cards, with a data-source condition

Exists:

- Element (this branch): `session.visibility.set(ruleTree)`, `setWindow`, `summary` ("X of Y"),
  `showContext`, `plan({ op: "visibility.set" })` for a count without applying
  (`session/visibility/VisibilityApi.ts`). `RuleTree` (`catalog/types.ts` line 1197): expression,
  range, categories, degree, component, neighborhood, isolated, self-loop, repeated-edge, edges,
  member, and AND / OR / NOT.
- Element (`design/studio-tier3`): filter steps (`visibility.steps`, `setSteps`, `previewSteps`).
- App (`design/studio-tier3` only): `style/WhichPicker.tsx` and `style/cards.ts` (the condition
  cards), `data-place/Filters.tsx` where "a filter step is a condition card" (commit 844a29f46).

Missing:

- Element: a source condition. Either a rule leaf `{ kind: "source", loads: [key] }` or a
  queryable per-element attribute; both need file-load provenance (1.5). A leaf is the better
  shape: it survives a source rename and does not put a reserved column in the reader's table.
- Element: requirement 3 (one shape for "which elements"): style layers still take `Selector`
  while filters take `RuleTree`; the tier3 tree work narrows this, check it before adding more.
- App: the "Data source" card in the card picker, shown only when `data.sources().length >= 2`
  (reading the element's list is consuming it, which is allowed).

### 1.9 The table dock and full screen

Exists: `table/TableDock.tsx` (Nodes, Edges and per-run group tabs, sort, column checklist, a
members chip), opened by `table.toggle` (Shift+T, `table/commands.ts`) and from the Data place
(`data-place/DataPlace.tsx` line 286). Rows come from `data.nodePage` / `edgePage` (paged, with
result columns).

Missing (app only): a Table button on the bottom-center canvas toolbar
(`toolbar/WorkspaceToolbar.tsx` has Analyze, Layout, View, Legend, Quick actions and no Table);
maximize to full screen with the configuration (roles, special fields, sources) beside the table,
and minimize back; the header configuration in 1.3. Mantine's Pill workaround in `TableDock.tsx`
line 191 (#925) belongs in compact-mantine.

### 1.10 Common export (styles, recipes, data, image, video)

Exists:

- Data: `element.exportGraph(format, options)` (`graphty-element/src/graphty-element.ts` line
  3602; `data/export.ts`) through graph-io's writers: JSON, GraphML, GEXF, CSV (nodes or edges
  table), GML, DOT, Pajek, Neo4j CSV, XGMML, CX, CX2, Cytoscape session; carries positions,
  results, styles where the format can; every loss as `{ code, params }`; `notes: true`.
- Image: `captureScreenshot`, `canCaptureScreenshot`, presets (`screenshot/`).
- Video: `captureAnimation`, `estimateAnimationCapture`, `cancelAnimationCapture` (`video/`). The
  app does not use it.
- Project: `session.project.save({ leaveOut: ["graphty-style" | "graphty-notes" |
"graphty-view-state"] })`, `element.downloadProject()`.
- App: `export/ExportDialog.tsx` with Image and Data outputs only (`ImageOutput.tsx`,
  `DataOutput.tsx`); prior design: `design/ui/tier1-real-app/tier1-design.md` section T13 and the
  object-first decisions (`design/ui/object-first-ux/round-2/decisions.md` I5, P8: per-object
  export rows, an Export menu with two groups).

App work that belongs in the element:

- `export/choices.ts` line 58: a TEMPORARY copy of the element's private `SCREENSHOT_PRESETS`
  (`graphty-element/src/screenshot/presets.ts`). Element: export the presets as catalog data.
- `project/files.ts` lines 9 and 50: the app copies `downloadProject`'s file naming rule (#919).

Missing (element):

- Export a scope: only what is shown, a set or the selection, and leaving out chosen columns
  (requirement 35). `exportGraph` has no `scope` or `columns` option.
- A styles-only file (the layers without data) and a recipe file (the data steps as commands that
  name columns by role or name, requirement 49). `project.save` cannot leave out the data, and the
  journal (`session/journal.ts`: `entries`, `get`, `subscribe`, `clear`) has no export.
- App: Video and Styles and Recipe outputs in the Export dialog; Project stays under Save.

### 1.11 Timeline

Exists: `visibility.setWindow({ attribute, from, to, step })` (`session/visibility/filter.ts` line
88): a half-open window on one instant attribute, composed with the filter, one undo step, never
re-layouts. `knownFields.nodeTimePath` / `edgeTimePath` and the `time` load role. Prior design:
`design/ui/object-first-ux/round-2/decisions.md` "The timeline" (L1 to L6: a transport bar, two
doors, nodes follow their edges, an interval form, snapping, non-overlapping steps).

Missing (element):

- Nodes follow their edges (L3): today a window over an edge-only time column hides no node.
- The time extent and counts per step for the bar's sparkline: `data.histogram` bins numbers;
  time columns need a time-binned histogram (`{ from, to, bins: [{ start, count }] }`).
- An interval window (`start`/`end` or spells) (L4) and a count of unreadable times (requirement
  33).
- App: the timeline tool at the bottom of the canvas (play, step, window handles), driving
  `setWindow`. Playback timing is the app's.

### 1.12 Several kinds of node from one event table

Decision: a data feature in graphty-element, not styling.

Why: an auth log row `user, host, time` makes two kinds of node whose ids share one column space.
User `admin` and host `admin` are different nodes; styling cannot split one node into two after
the load has merged them, and any id collision silently joins unrelated things. The kind must be
fixed when ids are made. The element should:

- take a kind per endpoint in the mapping (`source: { column: "user", kind: "user" }`, `target:
{ column: "host", kind: "host" }`) or a `kind` column role on a node table;
- namespace ids by kind only when two kinds would collide, and report that it did;
- write the kind as an ordinary node attribute (with the `kind` role in `roles`), so the app colors
  and filters by it through the usual style layers and condition cards.

Styling then does what styling is good at: a layer per kind. Requirement 42.

### 1.13 Server sources

Exists (element and graph-io): `data.testSource` (returns `SourceProbe`: ok, server facts and
counts; no rows), `data.listSource` (browse a repository), `data.import({ source, config })` with
`limits`, `cursor`, `credential`, `endpoint`; `data.more()` for the next page; `data.expand(ids,
{ depth, direction, limit })` and `data.collapse(id)`; `behavior.expand.trigger: "none" | "click"
| "double-click"` (`session/sources/types.ts` line 56); `data.pendingSourceLoads()` /
`runPendingSourceLoad` for a reopened project; `loadSample`. Built-in sources in
`graph-io/src/sources/`: Cypher (Neo4j, Neptune), NDEx, REST mapping; `registerSource` in
`./extend`.

Missing:

- Element: `testSource` returning a few sample rows ("Test returns live sample data") as well as
  counts.
- Element / graph-io: Refresh (requirement 48): re-run a load and its expansions and apply only the
  difference as one undo step; nothing named refresh exists.
- graph-io: a SPARQL source.
- App: `start/NetworkDataDialog.tsx` lists these sources as "on the way" and opens only a graph
  file at a URL; there is no form, Test, query, Load more or Refresh in the app.
- Detail of paging per server kind: `design/ui/data-prototype/research/servers.md`.

### 1.14 Other jobs from the requirements

- Find by name or value (requirement 11): `session.find(text)` exists.
- What loaded (requirement 10): `data.statistics()` exists; the inspector still names nodes by id
  "until #895" (`inspector/Inspector.tsx` line 294, `NodeValues.tsx` line 180, `RunValues.tsx` line
  423), but `data.name(id)` now exists. Stale comments and missing use.
- AI commands cannot load or join (requirement 1): `graphty-element/src/ai/commands/builtin.ts`
  has no data command.
- Edit a cell (requirement 40): `data.updateNodes` / `updateEdges` exist; the table has no editing.

## 2. Gap list

### 2.1 graphty-element additions (all additive)

| #   | Addition                                                                                                       | Files                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| E1  | Merge `design/studio-tier3` first: filter steps, `data.sources()`, value counts, the layer tree                | `graphty-element/src/session/visibility/steps.ts`, `session/types.ts`, `session/data.ts`, `session/styles/tree.ts`             |
| E2  | Per-element provenance for file loads (union of load keys on merge)                                            | `session/sources/load.ts`, `session/sources/ids.ts`, `session/commands/data.ts`, `session/data.ts`                             |
| E3  | `RuleTree` leaf `{ kind: "source", loads }`                                                                    | `catalog/types.ts` (RuleTree), `session/visibility/filter.ts`, `session/styles/predicate.ts`                                   |
| E4  | `data.join` and a join plan with counts, key suggestion, loose match, clash rule; recorded as a recipe command | new `session/join.ts`, `session/commands/data.ts`, `session/types.ts`, `session/projectFile.ts`                                |
| E5  | `existing` on `LoadChoices` so a draft merge can update existing nodes                                         | `session/types.ts` (LoadChoices), `session/draft.ts`                                                                           |
| E6  | Several files in one draft, the element choosing node and edge tables                                          | `session/draft.ts`, `session/data.ts` (`prepare`)                                                                              |
| E7  | `kind` role and kind per endpoint, ids namespaced on collision                                                 | `session/types.ts` (ColumnRole, TableMapping), `catalog/types.ts` (AttributeRole), `session/draft.ts`, `data/CSVDataSource.ts` |
| E8  | Change a role after loading, one undo step                                                                     | `session/data.ts`, `session/commands/data.ts`                                                                                  |
| E9  | `data.retype(column, type)` with a dry-run misfit count; misfit counts per column                              | `session/data.ts`, `session/attributes.ts`, `session/commands/data.ts`                                                         |
| E10 | `data.renameColumn(column, name)`; layers, filters, sets and runs follow                                       | `session/data.ts`, `session/styles/StylesApi.ts`, `session/visibility/filter.ts`, `session/sets/`                              |
| E11 | Column findings with fix offers and a recorded `ignore`                                                        | `data/report.ts`, `session/draft.ts`, `session/projectFile.ts`                                                                 |
| E12 | Cleanup commands (trim, case-variant merge, fill blanks)                                                       | `session/commands/data.ts`                                                                                                     |
| E13 | Replace diff report (added, removed, changed, no longer binds) and reapplying joins and mappings               | `session/commands/data.ts`, `data/report.ts`                                                                                   |
| E14 | `exportGraph` `scope` and `columns`; a styles-only file; a recipe file from the journal                        | `data/export.ts`, `graphty-element.ts`, `session/journal.ts`, `session/projectFile.ts`                                         |
| E15 | Export the screenshot presets and the project file naming rule as data                                         | `screenshot/presets.ts`, `catalog/`                                                                                            |
| E16 | Time histogram and extent; nodes follow their edges in a window; interval window                               | `session/data.ts` (`histogram`), `session/visibility/filter.ts`                                                                |
| E17 | `testSource` sample rows; `refresh(loadKey)` applying the difference                                           | `session/sources/load.ts`, `session/sources/types.ts`, `graph-io/src/sources/run.ts`                                           |
| E18 | SPARQL source                                                                                                  | `graph-io/src/sources/` (new `sparql/`)                                                                                        |
| E19 | AI data commands (load, join, filter)                                                                          | `graphty-element/src/ai/commands/builtin.ts`                                                                                   |

### 2.2 App work

| #   | Work                                                                                                                                             | Files                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Delete stale copies and workarounds: `ROLES_BY_KIND`, the #922 probe, the #923 note, #895 node-name notes, the #911 pick order, the presets copy | `graphty/src/workspace/data-page/choices.ts`, `data-page/useLoadDraft.ts`, `data-page/DataPage.tsx`, `table/columns.ts`, `inspector/*.tsx`, `export/choices.ts`, `project/files.ts` |
| A2  | Table button on the bottom-center toolbar; dock maximize with configuration beside it, minimize back                                             | `toolbar/WorkspaceToolbar.tsx`, `table/TableDock.tsx`, `table/commands.ts`, `state/store.ts`                                                                                        |
| A3  | Header configuration: type icon, warning icon with hover details, context menu (Type, Role, Rename, Hide, Unhide, Hide others)                   | `table/RecordTable.tsx`, `table/columns.ts` (uses compact-mantine `DataTable` `icon`, `headerTooltip`, `menu`)                                                                      |
| A4  | Remember hidden and ordered columns in the project's `extensions`                                                                                | `table/TableDock.tsx`, `project/actions.ts`                                                                                                                                         |
| A5  | Special fields sidebar (id, label, source, target, weight, time, kind, or none) on load and after; no "other fields" list                        | `data-page/DataPage.tsx`, `data-place/DataPlace.tsx`                                                                                                                                |
| A6  | Sources in the left sidebar with counts; node and edge chips with one color and icon used everywhere                                             | `data-place/DataPlace.tsx`, `data-place/SourceValues.tsx` (tier3), a shared chip in compact-mantine                                                                                 |
| A7  | Filters as condition cards; a Data source card when two or more sources are loaded                                                               | `data-place/Filters.tsx`, `style/WhichPicker.tsx`, `style/cards.ts` (all tier3)                                                                                                     |
| A8  | Join flow (full screen if better): key choice, the plan's counts, commit; "Add columns to nodes" verb for a second file                          | new `graphty/src/workspace/join/`, `data-page/request.ts`                                                                                                                           |
| A9  | Second file in a project goes through the three verbs, not a silent merge; error words from codes                                                | `start/open.ts`, `data-page/DataPage.tsx`                                                                                                                                           |
| A10 | Replace with Undo afterwards, drawing the element's diff report                                                                                  | `data-page/request.ts` (tier3), `data-page/words.ts`                                                                                                                                |
| A11 | Warnings with one flat fix list and Ignore                                                                                                       | `data-page/DataPage.tsx`, `data-page/words.ts`                                                                                                                                      |
| A12 | Common Export: Image, Video, Data (scope, columns), Styles, Recipe                                                                               | `export/ExportDialog.tsx`, new `export/VideoOutput.tsx`, `export/choices.ts`                                                                                                        |
| A13 | Timeline tool at the bottom of the canvas driving `setWindow`                                                                                    | new `graphty/src/workspace/timeline/`, `frame/Frame.tsx`                                                                                                                            |
| A14 | Server source form drawn from the descriptor: Test with sample rows, query, expand on double-click option, Load more, Refresh                    | `start/NetworkDataDialog.tsx`, `data-place/sourceActions.ts` (tier3)                                                                                                                |
| A15 | Move the Pill remove-button workaround (#925) into compact-mantine                                                                               | `table/TableDock.tsx`, `compact-mantine/src/`                                                                                                                                       |
