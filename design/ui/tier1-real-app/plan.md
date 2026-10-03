# Building tier 1 as the real graphty app: the plan

Tier 1 is a first-time user's core path through the graphty app, tested from an empty app: open
a sample or your own file, read what loaded, rank nodes and find groups, color or size by a value,
labels from a field, a readable layout, find a node and see its neighbors, save a picture and the
numbers, save the project and reopen it, and all of it chained in one session. The target is the
refined B design that eight rounds of simulated user studies shaped; this plan builds the tier 1
slice of it as the real app, ships it to graphty.app after a successful build and release, and
points the next study round at it.

The design to build, word for word, is `tier1-design.md` in this folder. What the app does today is
`app-today.md`; what graphty-element lacks is `element-gaps.md`; the deploy and study changes are
`ship-and-study.md`. This plan turns those into pull requests and an order.

Two repository rules shape every package below. graphty-element owns all graph functionality, so
every gap is fixed in the element first and the app never computes, sniffs, counts or works around
anything. And the app uses compact-mantine components only: a control compact-mantine lacks is
added to compact-mantine, never drawn by hand in the app.

---

## 0. The shortest path

1. **One owner sitting** (section 8 lists it): PR #409's visuals and the tooltip delay; one
   decision document holding every new graphty-element API shape, the project file format (#301)
   and #726's run names; the fate of the breaking PR #676; Mergify (PR #777).
2. **In parallel, at once:** merge #726; the deploy pull request; the two missing sample files;
   fixed node positions for stories, with PR #519 merged or replaced.
3. **graphty-element:** the ten new items of section 2 in parallel; the load preview and the
   project file start on the day of the decision.
4. **App:** the Frame on #409, then the other packages on the Frame; the Data page and Project
   when their element items land.
5. **Study:** when every tier 1 task test and the chained walk pass at `/?next`, the round runs on
   a local production build of that exact commit.
6. **Ship:** the Switch-over, the release and the deploy run alongside the study, so graphty.app
   ends up serving the shell that was studied.

---

## 1. Scope

### What ships

Everything in `tier1-design.md` sections 2 to 5, with the exceptions in the next tables. By surface:

| Surface       | Ships in tier 1                                                                                                                                                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header        | Main menu, project name (rename with double-click or F2), project-name menu, Undo and Redo, privacy chip. The File list (Open project or file..., Save, Export...) is one command list shared by both menus, filled by registrations from the packages that own each command |
| Rail          | Graph and Data only                                                                                                                                                                                                                                                          |
| Graph place   | Graph title line, find box, the paint tree (Selection, run, measure, group, Everything rows; eye, swatch, states, and a count where the element publishes one), footer line                                                                                                  |
| Data place    | Sources and Attributes, with the tier 1 menus (Rename, Edit source...; Add label line, Show in table)                                                                                                                                                                        |
| Toolbar       | Analyze, Layout, View, Legend, Quick actions; the selection bar with Neighborhood only                                                                                                                                                                                       |
| Canvas        | Legend card (with the method sentence and size range), the loading, empty and too-large state cards, one notice slot (including the notice a run gives when it lands: "Louvain now colors the drawing; PageRank moved below")                                                |
| Inspector     | The one frame (header, state bar, Style and Values tabs) and the nine tier 1 kinds: the graph (Canvas, Layout, Overview), one node, a neighborhood or several elements, measure row, run row, group row, Everything, Selection, attribute                                    |
| Style tab     | Nodes and Edges switch, fixed sections (Size its own section beside Fill), set lines, "+" menus, the bind icon at rest on Color and Size, the From data list, the Binding popover, the Color and Shape popovers, one label line                                              |
| Table dock    | Nodes, Edges and one tab per group run; Columns chooser; sort caption; Export... opening the Export dialog                                                                                                                                                                   |
| Data page     | One graph file, one edge list, or one node table plus one edge table; roles; model strip; match report; the typed refusals                                                                                                                                                   |
| Start screen  | Open project or file..., New from data..., Recent projects, four samples, the usage data card in the owner's exact words                                                                                                                                                     |
| Export dialog | Image (size and scale presets) and Data                                                                                                                                                                                                                                      |
| Project       | Save, Save as..., Open, Close project, Recent projects                                                                                                                                                                                                                       |
| Settings      | General, Privacy, Accessibility and input                                                                                                                                                                                                                                    |

The inspector's tab is named **Values**, not Data (decision, reversible). In round 8, 12 of 12
participants confused the Data tab with the Data rail place and lost their selection; the design
kept the word and qualified only the accessible names. A test checks that no two reachable controls
share an accessible name.

### Shipped later, or hidden until the element provides it

The design's rule is that an unbuilt item is not drawn (no "Coming" tags), and the round 8 wording
rule is that a message whose count is not computed from live state is removed. So these are left
out of the first release and appear when their element piece lands, with no other app change:

| Left out at first                                                                                                 | Appears when                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The loading card's Cancel button                                                                                  | the element can cancel a load (#296, raised to high). Until then Close project and Esc stay live during a load, so a reader who drops a large file is never stuck on the card            |
| The GPU-lost card and Restart viewer                                                                              | the element reports a lost graphics device and can restart (new issue)                                                                                                                   |
| Shift+Arrow walking from node to node with its announcement                                                       | the element walks nodes from the keyboard (new issue). Until then a keyboard user reaches a node through the find box, and the Degree link and the neighbor names are keyboard reachable |
| The Paints line, the paint-order line ("Covered by PageRank for Color on 77 of 77") and a layer row's match count | the element counts what each layer matches and paints (new issue; the tier 1 tree rows depend on it)                                                                                     |
| Edge picking on the canvas                                                                                        | the element picks edges (new issue); an edge is reached from the Edges table                                                                                                             |
| The Layout popover's Motion line (Pause and Resume)                                                               | the element reports layout motion state (new issue). The popover still chooses a layout and runs it again                                                                                |
| The Export image's legend and background switches                                                                 | #133 is decided and built. Export > Image ships with the size and scale presets                                                                                                          |
| A second label line ("name above, degree below") and number formatting on labels                                  | the element has per-position label channels (new issue). Tier 1 ships one label line, bound through today's `node.label`                                                                 |

### Samples

The mock's four samples include Protein interactions and March transfers, and neither dataset
exists in graph-samples. Decision (reversible): tier 1 ships four samples that exist, each opened by
URL through the element's ordinary import, so the import report and Undo work as for any file:

- **Les Miserables** (first, the studies' dataset), with the round 8 sentence.
- **Zachary's karate club**, with the design's sentence.
- **College football**: "Teams and the games they played in one season. Good for checking whether
  a community measure finds the conferences."
- **Florentine families**: "Marriages between the leading families of Renaissance Florence. Good for
  finding who brokers between groups."

Only `karate.gml` and `football.gml` exist in `graphty/public/samples/`. Les Miserables and
Florentine families exist only as bundled graph-samples modules, so package 2 owns a script,
`graphty/scripts/write-sample-gml.ts`, that writes `les-miserables.gml` and `florentine.gml` into
`graphty/public/samples/` with graph-io's GML writer. Each node gets a `name` attribute with its
readable name, and the Les Miserables edge value is written under a name that says what it counts
(`shared chapters`), so the neighbor list reads "Valjean, 17 shared chapters", not "weight 17". The
generated files carry the auto-generated warning naming the script.

The sample list (`data/sampleManifest.ts`: a name, a sentence and a URL built from
`import.meta.env.BASE_URL`) is a temporary workaround: the list belongs in the element, and the
file carries a comment naming the issue "samples listed and imported through the element"
(section 2). Its exported shape is kept, because today's `WelcomeSampleList.tsx` also reads it.

### Today's app

The new shell is built beside today's shell, not inside the 5,244-line `AppShell.tsx`, so packages
can be built in parallel without touching one file. Until the Switch-over, graphty.app keeps
serving today's shell at `/`, and the new one is reachable at `/?next`. The new shell never calls
`loadDefaults` or adds the load-time label layer, so every sample opens bare. The last package makes
the new shell the default and deletes everything `app-today.md` section 4 lists as replaced: the six
rail places and their panels, result cards and `ResultInspector`, the obsolete inspector bodies, the
insights strip, minimap and filter strip, the status bar, the History popover, Share and Compare,
the load-time label layer and `loadDefaults`, `LoadDataModal`, `RunAlgorithmModal`,
`RunLayoutsModal`, `ComingTag`, the app's own `neighborsOf`, and today's canvas legend
(`Legend.tsx`, `legendChannels.ts`, `legendAvailability.ts`, `CanvasRegion.tsx` and their tests).
The `?demo` gallery and the AI panel code are kept for later tiers but not reachable from the new
shell.

---

## 2. graphty-element work that blocks tier 1

Each item is one pull request in graphty-element. Every one is additive, so each releases as a
minor version. The app builds against the element's source (`workspace:*`), so an app package can
start as soon as its element pull request merges, without waiting for npm.

Every new public name below is an owner decision (a published API is a one-way door). They are not
decided one pull request at a time: every shape below goes into one document,
`element-api-decisions.md` in this folder, written before element work starts and approved by the
owner in one sitting (section 8). Per the repository's "easy things easy" rule, each pull request
also adds its documentation page and a canonical example of about 15 lines, compiled by an author
who reads only the published docs.

### Already open

- **Readable run names: PR #726** (`fix/readable-run-ids`). Without it, the tree rows, the legend,
  selectors and the exported spreadsheet's column headers show hashed ids
  (`degree_0bkzd1n0p2dnik`). It adds `suggestedName(options)` returning `{ id, label }`; the names
  are confirmed in the decision document. Merge now. Blocks the Graph place, the legend, the
  inspector and Export.
- **Read every source as bytes: PR #770**, which is stacked on PR #765 (graph-io XGMML and
  Cytoscape sessions) and whose build is red. It does **not** block tier 1: the load preview (item
  1 below) is built on master over the inputs the element already takes (a URL, a `File`, text).
  The chain lands in its own time, #765 first and then #770 with its build fixed, and the preview
  then reads bytes through it.

### Open breaking pull requests: hold them

PR #676 ("draw bound label values as written") and PR #702 are breaking. Merging either during the
build would turn the additive tier 1 releases into a major partway through. #676 also changes the
label code the label report (item 7) touches. The owner decides #676's fate before any label work
starts; both are held until the tier 1 element items have released, and then grouped into one major
with any other planned breaking change.

### New, blocking tier 1

1. **Load preview and column mapping.** Blocks the Data page (the bring-your-own-file,
   two-spreadsheets and will-not-read tasks). Recommended shape:
   `session.data.preview(source)` returns `{ format, tables: [{ name, role: "nodes" | "edges",
rowCount, columns: [{ name, type, level, role, suggested }], sample }], keys, weight, report }`,
   where `report` is the same shape `data.lastImport()` returns, filled in before anything loads;
   `session.data.import(source, { mapping })` takes the reader's role edits. Typed refusals stay the
   element's existing error codes. The same pull request makes load progress a session event (today
   it is only the `data-loading-progress` DOM event) and gives the `E_TOO_LARGE` refusal the limit
   in its payload, so the loading card's running count and the too-large card's sentence are read
   from the element. Effort high; starts on the decision day and sets when the Data page lands.
2. **Default binding from what a column measures, and one legend rollup.** Blocks color or size by
   a value and the legend. Today a group column (integers) draws a ramp and a bound size defaults to
   0 to 1. Recommended shape: `AttributeDescriptor.level` (`"category" | "quantity" | "time" |
"text" | "id"`) with `levelSource` (`"inferred" | "declared"`); `data.declare(path, { level })`
   as one undoable step; a binding with no scale or range takes the default for its level and
   channel (one color per category; a readable px range for size, 2 to 12 px); and
   `styles.defaultBinding(path, channel)` returns `{ scale, range, palette, suitable, reason }`, so
   the From data list disables an unsuitable attribute with the element's reason. The category cap
   and the Other row live in one place, `styles.legend({ maxCategories })`, which returns the capped
   categories, the Other row with the swatches it rolls up, and the ramp stops. The canvas legend
   only lays those blocks out, and any later exported legend draws the same blocks, so the two can
   never disagree. Effort medium.
3. **Find without selecting.** Blocks the find box. Recommended shape:
   `session.data.find(text, { limit, kinds })` returns `{ elements: [{ kind, id, label, matched:
{ path, value } }], values: [{ path, value, count }], total }`, exact name or id first, matching
   a label as well as an id. The selection changes only when the app passes a pick to
   `selection.apply`. Effort medium.
4. **A node's neighbors with tie strength.** Blocks "Javert's 17 connections". Recommended shape:
   `session.data.neighbors(id, { direction, weight, sort, offset, limit })` returns a page of
   `{ node, edges, tie }` with `total`; parallel edges are summed into one tie. Effort low.
5. **Result values as table columns.** Blocks the table's result columns and the sort caption.
   Recommended shape: `data.nodePage` and `edgePage` accept result paths
   (`results.<run>.<field>`) in a new `columns` option and as `sort.key`, sorting in the element.
   Effort medium.
6. **What the Analyze popover shows about each algorithm.** Blocks the legend's method sentence,
   the Analyze filter finding "brokers", the popover's key options and its two headings. Recommended
   shape: `AlgorithmDescriptor.sentence` (one plain line per result field, worded to fit any
   dataset), `aliases: string[]`, and `OptionDescriptor.essential: boolean` (PageRank marks Weight,
   damping and Direction), so the app keeps no per-algorithm list of key options. The "Ranks nodes"
   and "Finds groups" headings come from the descriptor's existing `category` (`centrality`,
   `community`), with a plain heading per category in the catalog (`categoryLabel`), so the app
   holds no mapping either. Effort low.
7. **How many labels the overlap rule hid.** Blocks the label line's "77 names, 64 hidden to avoid
   overlap", the node's "label hidden" note and Export's hidden-label warning. Without it the
   wording rule drops that count, and with it the only explanation of the "Show labels" trap.
   Recommended shape: `session.labels` with `{ requested, drawn, hiddenByOverlap }`, `hiddenIds()`
   and a `labels:changed` event; the overlap switch becomes a project setting the app's Show all
   labels writes. Effort low. First wave.
8. **What a run's suggested style applied, held back or took over.** Blocks the landing notice and
   the "runs land visibly" fix. Round 8 rated this severity 4: 12 of 12 never saw the communities,
   because an earlier run already covered color on all 77 nodes. Today a withheld suggestion is
   dropped silently (`autoApply.ts`). Recommended shape: `runs.start` resolves with
   `{ applied, withheld, tookOver: [{ channel, from: runId }] }`, also available from
   `runs.landing(runId)`, and the run's layers land on top. Effort low. First wave.
9. **Style channel descriptors carry their section and order.** Blocks the Style tab's fixed
   sections. Recommended shape: `ChannelDescriptor.section` and `order`, read through the existing
   `channelsFor`. The section names become published API, so they are decided before this merges.
   Recommended (design question T9, round 8's recommendation, 12 of 12 clicked Shape first looking
   for size): **Size is its own section beside Fill**: Fill, Size, Shape, Effects, Label, Tooltip
   for nodes; Line, Arrows, Label for edges. Effort low.
10. **The project file: save and reopen a whole session (#301).** Blocks save and reopen, and
    Recent projects. Raise #301 to high. The file format is the owner's one-way door. Recommended
    shape: `session.project.save({ app }): Promise<Blob>` and `session.project.open(source):
Promise<OpenReport>`, with `session.project.name` and `dirty` (true once `history.version` passes
    the saved version). One JSON document with a `format: "graphty-project"` and `version: 1`
    header, holding the data, results as columns (so a reopen does not recompute), style layers in
    order with their visibility, positions, layout, view mode and camera, the selection, and an
    `app` slot the element stores untouched for the consumer's own chrome state (the legend switch,
    the inspector tab). The report lists by kind anything that did not come back. Effort high;
    starts on the decision day; with the preview, it sets the end date.

### Order

#726 merges now. Items 4, 6, 7, 8 and 9 are small and independent; they start the day the decision
document is approved, in parallel. Items 2, 3 and 5 start the same day, also in parallel. Items 1
and 10 are the long ones and start that day too. Nothing waits on #770.

### Issues to file at high priority

For items 1 to 9, one issue each, labeled `enhancement`, `priority:high` and an effort label, before
its pull request opens. Raise #301 and #296 to high. Close #149, #297 and #144 after checking that
master does what they ask (#145 stays open for the journal).

The owner also asked for the needs of later releases to be filed now, so the element can build
them before the app asks. Filed at high priority, each as one issue:

- **Hidden in tier 1 until built** (section 1): per-layer match and paint counts (the tier 1 tree
  rows' count slot and the Paints line depend on it); layout motion state with Pause and Resume;
  per-position label channels with number formatting; a lost-graphics-device report and restart;
  keyboard walking from node to node with an announcement; edge picking on the canvas; samples
  listed and imported through the element (graph-samples as an optional peer; `sampleManifest.ts`
  and the generated sample files are the workaround it retires). #133 (the legend and background in
  exported images) is already open at high.
- **Needed by the study tooling** (section 7): a node's screen position in CSS pixels with whether
  it is visible; the node or edge under a point; a node's displayed label text; an accessible
  representation of the graph for screen readers; a seeded default layout, so one file draws the
  same way each time (a default a consumer sees: the owner confirms).
- **Needed by tier 2 and later** (from `element-gaps.md`, "Later releases"): canceling any run;
  ordered filter steps; hiding on the canvas only; exporting a filter, set or selection; rejected
  and unmatched rows; reader-facing error text with the file line; composite saved views and
  renaming a view; top N in a layer selector; explaining several elements at once; path ties,
  direction and weight meaning on shortest path; partition agreement and seed stability; computed
  attributes; vector figures; recipes; collapsing a group; version history; compare; merging nodes;
  several graphs in one project; a selection mark that meets 3:1 contrast on nodes and edges;
  reduced motion; renaming a run; Shift and Mod clicks adding to the selection.

---

## 3. App work packages

All new app code lives under `graphty/src/workspace/` (the reader's workspace: the new shell).
Each package is one pull request and owns only the files listed; no two packages edit one file.

The Frame makes that possible. It creates every directory and a stub at the final path of every
component another package uses (one gray line, so the frame renders whole), including the shared
ones: `workspace/style/FromDataList.tsx` (used by the Style tab and the table's Columns chooser)
and `workspace/layout/LayoutGroup.tsx` (used by the Layout popover and the graph inspector). Its
command registry, key map and state store take registrations: each package registers its commands,
keys, inspected kinds and tab memory from a file in its own directory (`export/commands.ts`,
`project/commands.ts`, ...), and the Frame lists the command ids it expects, so a missing
registration fails a test. Stories and tests live beside the code they cover.

| #   | Package                                   | Owns                                                                                                                                                                                                                                                                                                                                                                                              | Needs from the element                                                                                                                           | Needs from compact-mantine                                            |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 1   | **Frame**                                 | `workspace/Workspace.tsx`; `workspace/frame/` (header, main menu, project-name menu, rail, the regions and their resize, notice slot); `workspace/state/`, `workspace/commands/registry.ts` and `workspace/keys/`, each taking registrations; every stub; the `?next` switch in `App.tsx`; the build stamp in `vite.config.ts` and `index.html`                                                   | Undo and Redo, `history` (exist)                                                                                                                 | NavRail, Toolbar, Tooltip with TooltipShortcut, ContextMenu, Toast    |
| 2   | **Start screen, Settings and usage data** | `workspace/start/` (registers Open project or file... and New from data...), `workspace/settings/`, `workspace/privacy/`, `data/sampleManifest.ts` (exported shape kept), `scripts/write-sample-gml.ts`, `public/samples/les-miserables.gml`, `public/samples/florentine.gml`, `lib/sentry.ts` (exports kept for `FeedbackModal.tsx`), `main.tsx` (the unconditional `initSentry()` call removed) | `data.import` by URL (exists)                                                                                                                    | PageList, ModalFooter                                                 |
| 3   | **Canvas**                                | `workspace/canvas/` (a new legend card that lays out the blocks `styles.legend()` returns, the state cards, the notice view). It imports nothing from today's `components/shell/canvas/`                                                                                                                                                                                                          | `styles.legend({ maxCategories })` (2); sentences (6); load progress as a session event and the too-large limit (1); landing report (8)          | ChartRow, RampRow                                                     |
| 4   | **Toolbar, Analyze and Layout**           | `workspace/toolbar/` (toolbar, selection bar, View flyout, Quick actions), `workspace/analyze/` (the Analyze popover, Run, revise), `workspace/layout/` (replaces the `LayoutGroup` stub)                                                                                                                                                                                                         | catalog, `estimate`, `runs.start` (exist); sentences, aliases, essentials and category headings (6); `selection.apply({ neighborsOf })` (exists) | ToolButton, ToolGroup, QuickActions, SearchInput, SplitButton         |
| 5   | **Graph place**                           | `workspace/graph-place/` (title line, find box and its result list, the paint tree, footer line)                                                                                                                                                                                                                                                                                                  | run names (#726); find (3); `styles` layer list and visibility (exist); group `sizes` and run row counts from `RunResult` (exist)                | Tree, ResultRow, SearchInput, ToggleIconButton                        |
| 6   | **Data place**                            | `workspace/data-place/` (Sources, Attributes, their menus)                                                                                                                                                                                                                                                                                                                                        | `data.attributes()`, `data.source()` (exist); levels (2)                                                                                         | Tree, ContextMenu                                                     |
| 7   | **Inspector**                             | `workspace/inspector/` (the frame, state bar, Style and Values tabs, every kind's Values tab and Why this look)                                                                                                                                                                                                                                                                                   | `styles.explain()`, `RunResult` reads, `data.statistics()` (exist); neighbors (4); label report (7)                                              | DataRow, ChartRow, Tabs                                               |
| 8   | **Style tab**                             | `workspace/style/` (the Style tab, set lines, "+" menus, the From data list replacing its stub, the Binding popover, Color and Shape popovers, the label line)                                                                                                                                                                                                                                    | `channelsFor` (exists); section and order (9); default binding (2); label report (7)                                                             | VariablePill, ComboInput, ColorPickerPanel, AlignmentMatrix, FieldRow |
| 9   | **Table dock**                            | `workspace/table/` (adapted from `DataTableDrawer.tsx`: tabs, Columns, sort caption, Export...)                                                                                                                                                                                                                                                                                                   | `nodePage`, `edgePage` (exist); result columns (5)                                                                                               | DataTable, MenuCheckItem                                              |
| 10  | **Export dialog**                         | `workspace/export/` (Image with the size and scale presets, and Data; registers Export...)                                                                                                                                                                                                                                                                                                        | `captureScreenshot` presets (exist); `exportGraph("csv")` with `lossNotes` (exists); run names (#726)                                            | ModalFooter, SegmentedControl                                         |
| 11  | **Data page**                             | `workspace/data-page/`                                                                                                                                                                                                                                                                                                                                                                            | preview, mapping, progress (1)                                                                                                                   | DataTable, StyleSelect                                                |
| 12  | **Project**                               | `workspace/project/` (registers Save, Save as..., Close project and Ctrl+S; the Save as dialog, Open, Close, the Recent projects store and list; File System Access handles where the browser has them, so Recent reopens a file and shows its folder; elsewhere the entry asks for the file with Locate...)                                                                                      | project file (10)                                                                                                                                | PageList, InlineRename, ModalFooter                                   |
| 13  | **Switch-over**                           | `App.tsx`; deletes the replaced code (section 1, "Today's app"), including today's legend files and their tests; removes `?next`                                                                                                                                                                                                                                                                  | --                                                                                                                                               | --                                                                    |

**Counts come only from the element.** No package counts nodes against a selector. A tree row
shows a count only where the element publishes one: group member counts (`RunResult`'s `sizes`
table) and a run row's count. A layer row's match count stays hidden until the per-layer counts
issue lands. The loading card's running count and the too-large card's limit come from item 1.

**The usage data gate.** Today `main.tsx` starts Sentry in every production build with no consent.
Package 2 removes that startup call and starts Sentry only after Share usage data (and stops it
after a later No), with session replay on and every text and input masked, matching the card's
"What is collected" list. `FeedbackModal.tsx` keeps working because `lib/sentry.ts` keeps its
exports.

### Order

1. **Frame** first, stacked on PR #409 (section 4).
2. Then on the Frame, in parallel, each as soon as its element items merge: **Start screen**,
   **Canvas**, **Toolbar**, **Graph place**, **Data place**, **Inspector**, **Style tab**,
   **Export dialog**.
3. **Table dock** after the Style tab, whose From data list its Columns chooser uses. The
   Inspector's graph kind shows the Layout stub until the Toolbar package merges; its task tests
   need both.
4. **Data page** when the preview lands, and **Project** when the project file lands.
5. **Switch-over** last, once every tier 1 task test and the chained walk (section 5) pass on the
   new shell and the owner has reviewed every package's stories. The Data page and Project are its
   prerequisites, so it cannot release without bring-your-own-file or save and reopen.

Each package pull request is stacked on the Frame (not on #409 directly), opened as soon as it
holds finished work, and merged when its checks pass and the owner has approved its stories.
Mergify (PR #777) is settled before the first app pull request opens, so all of them merge under
one set of rules.

---

## 4. compact-mantine and PR #409

PR #409 (`feat/compact-mantine-figma`) redraws compact-mantine to match the Figma editor and adds
most of the components tier 1 is drawn from: Tree and ResultRow (the paint tree), NavRail, Toolbar,
ToolButton and QuickActions (rail, toolbar, palette), SearchInput (the find box and Filter
analyses), ComboInput and VariablePill (the From data list and a bound line), ColorPickerPanel,
AlignmentMatrix (the label position grid), ContextMenu and MenuCheckItem (row menus, Columns),
TooltipShortcut (the key chip in every tooltip), ModalFooter (Export, Save as, Settings), Toast
(notices) and ToggleIconButton (the eye, Legend). It is a breaking change (35 commits, 100 files)
waiting on the owner's visual review, so it never auto-merges.

- **What depends on it:** every app package except the Switch-over. Building the panels on master's
  compact-mantine would mean either hand-drawing these controls in the app, which the repository
  forbids, or drawing them twice.
- **How to proceed:** its visual review is the first item of the owner sitting. Only the Frame is
  stacked on #409; every other package stacks on the Frame, so a change the owner asks for on #409
  means one rebase, not twelve. Changes land inside compact-mantine's components and every export
  keeps its name and props.
- **Deadline (decision, reversible):** if #409 is not approved by 2026-10-09, the roughly 15
  components tier 1 uses are extracted into a smaller, non-breaking compact-mantine pull request,
  the Frame is rebased onto it, and #409 continues on its own.
- **One conflict to settle:** #409's tooltips open after 1000 ms, as Figma's do; the design's
  toolbar tooltips open after 500 ms, an owner rule from an earlier round. One number has to win,
  and it belongs in compact-mantine's Tooltip so every caller gets it (owner decision, same sitting).
- **Anything else missing** from compact-mantine when a package is built (the inspector's
  histogram, if ChartRow does not cover it) is added to compact-mantine in its own pull request,
  never drawn in the app.

---

## 5. Tests

**graphty-element pull requests.** Node unit tests in the `default` project for every session API
(preview, find, neighbors, pages by result column, levels and default binding, the legend's cap and
Other row, sentences and essentials, the landing report, project save and open round trip). Browser
tests for what draws: labels hidden by overlap. Every pull request keeps the 80 / 75 coverage
thresholds, adds its docs page, and its new API passes the developer review with the personas in
`design/designloom/personas/`.

**App packages.** For each package:

- **Unit tests** (graphty's `browser` Vitest project) for its logic: command registrations, the find
  list's keyboard rules, the label line's rules (one empty line at a time, dropped on selection
  change), the usage data gate. Fixed tests named by the reviews:
    - with no label line, the Label "+" runs Add label line directly and offers no "Show labels"
      item, and clicking the Label heading word does the same;
    - the new shell never calls `loadDefaults` and adds no label layer on load;
    - Export > Data opens on Nodes when no table is showing (round 8: 8 of 8 landed on Edges);
    - the footer reads "Analyze (Shift+A) to add results here" with a graph and nothing run, with
      Analyze a link that opens the Analyze popover (`tier1-design.md` section 2.5);
    - no two reachable controls share an accessible name.
- **Browser tests against the real element**, as `AppShell.real-element.test.tsx` does today,
  asserting on what the element reports (a row exists after a run, a binding is on the layer, the
  CSV holds the result column), never on canvas pixels.
- **Stories**: one story per tier 1 state the package owns, named after the mock route it matches
  (`#/graph-place/louvain-open` becomes a Graph place story "Louvain open"), built on a real element
  with a small sample. Every story uses the element's `fixed` layout with node positions from a
  checked-in fixture, so no layout runs and each capture is stable. PR #519 (settling Storybook on
  the element, pinning the label font) is merged or replaced before the first package story lands.
  About 90 states in all, spread across the packages.

**One browser test per tier 1 task**, each starting from the `empty` state (no project, nothing
run) on the real element, owned by the package that delivers the task:

| Task                         | Test                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1 First launch              | the usage data card shows the owner's words; Share and No set the gate                                                                                                                                                                                                                      |
| T2 Pick a sample             | each of the four samples opens with nothing run and no label layer, and its node and edge counts match the source                                                                                                                                                                           |
| T3 Your own graph file       | a GML file opens through the Data page                                                                                                                                                                                                                                                      |
| T4 Two spreadsheets          | a node CSV and an edge CSV load as one network with the match report                                                                                                                                                                                                                        |
| T5 A file that will not read | the typed refusal appears and the app stays usable                                                                                                                                                                                                                                          |
| T6 Read what loaded          | the Overview shows the element's counts                                                                                                                                                                                                                                                     |
| T7 Rank nodes                | Betweenness lands on top and paints                                                                                                                                                                                                                                                         |
| T8 Find groups               | Louvain lands on top; `styles.explain()` names Louvain as the color winner and the landing notice appears                                                                                                                                                                                   |
| T9 Color or size             | size by a result binds with the level's default range                                                                                                                                                                                                                                       |
| T10 Labels                   | a label line bound to the name; the hidden count comes from the element                                                                                                                                                                                                                     |
| T11 Layout                   | choosing a layout runs it and the inspector's Layout group shows it                                                                                                                                                                                                                         |
| T12 Find and neighbors       | typing a label that differs from the id (karate's ids are numbers) fills the result list while typing, before Enter; picking a result opens the node on its Values tab with its neighbors by name. Also a keyboard-only version: find box, the Degree link and the neighbor names, no mouse |
| T13 Picture and numbers      | Export > Image saves a file; Export > Data holds the result columns with readable names                                                                                                                                                                                                     |
| T14 Save and reopen          | Save as, Close, reopen from Recent projects; rows, styles, labels and the selection come back                                                                                                                                                                                               |

**The chained walk (T15).** One end-to-end test of the whole first session from an empty app: open
Les Miserables (nothing run); read the Overview; Analyze > Betweenness, which lands on top and
paints; Analyze > Louvain, which lands on top, names itself in the landing notice and wins color in
`styles.explain()`; size by Betweenness; add a label line bound to the name; find Javert and read
his neighbors by name; Export > Image and Export > Data; Save as; Close; reopen from Recent
projects; check that rows, styles, labels and the selection came back.

The task tests and the chained walk run in CI with the graphty shard and are excluded from the
pre-push gate, so a push stays fast. The Switch-over requires all of them green.

**The owner's visual review.** Every new story goes through the visual review gate: CI captures it,
and the owner accepts or rejects it in the review page, package by package, as each pull request
arrives, so no one review holds 90 images. Before the Switch-over, an agent serves a production
build of the new shell through servherd and the owner walks it beside the mock (`#/map` lists every
state) to judge the whole.

---

## 6. Ship

Today the app reaches graphty.app when CI goes green on master, before the GPU lane and before the
release, so graphty.app can serve a commit the release later refuses. One pull request, independent
of the app work and landable first, changes that:

- First, check that the `github-pages` environment's branch policy allows a deploy from a reusable
  workflow called by `release.yml` (a one-line check, done before the pull request is written).
- `deploy-pages.yml` becomes a reusable workflow (`on: workflow_call` with a `run-id` input); its
  `workflow_run: CI` trigger is removed.
- `release.yml` gains a `deploy` job after `release` that calls it with the gate's `ci_run_id`, so
  the site is built from exactly the artifacts of the released commit. The job holds `pages: write`,
  `id-token: write` and `actions: read`.
- The gate's `artifacts_ok` check also requires the artifacts the deploy needs: the five
  Storybooks, `build-docs`, the two example pages and `build-graph-format`.
- A release with no version to bump still succeeds and still deploys. Because `release.yml` runs
  on every CI, GPU and Hosts completion and its floor moves only with a release commit, the deploy
  job records the commit it deployed and skips when the commit to deploy is the same one.

Consequences: GitHub Pages publishes the whole site as one artifact, so the docs and Storybooks also
go live after the release, about 40 to 60 minutes after a merge instead of about 15. A red GPU lane
holds graphty.app back too; that is accepted, and the study does not wait on it (section 7).

Two app changes go with it: the Frame adds a build stamp (`<meta name="graphty-build">` with the
commit and the latest release tag, not the `package.json` version, which the deployed artifacts
predate; shown in Help > About), and package 2 gates Sentry on the usage data answer (section 3),
so nothing is sent without consent and study sessions can be told apart from real use.

Until the Switch-over merges and releases, graphty.app serves today's shell at `/` and the new one
at `/?next`. After it, the tier 1 app is graphty.app.

---

## 7. Study tooling for the next round

The next round runs against the real app. The method stays as it was (personas, coverage keys, the
no-UI-words prompt rule, graders, skeptics, focus groups, the four-slot browser gate, the tree
test); the tool participants act through changes. Built on the design branch beside `study.mjs`:

- **`real.mjs`**, with the same participant steps as `study.mjs` (click, right-click, double-click,
  modifier clicks, hover, key, type, wait, expect), driving a live browser per session:
  `--start <session dir> task:<id>` opens Chromium inside a browser slot and saves the first
  screenshot; `--step` connects to that browser, acts, waits for the element's
  `waitForStableFrame()`, and saves the next screenshot; `--end` closes it and frees the slot. Live
  sessions replace the mock's replays because layouts are not seeded and a replay moves the nodes.
- **Canvas steps:** `--click-at x,y` (and right-click, double-click, hover at a point), `--drag` and
  `--wheel`. Clicking a node by its name works once the element publishes a node's screen position
  (section 2's study issues); until then participants point at the screenshot.
- **Files:** `--upload` answers the file picker and `--drop` drops a file; every download is saved
  to the session folder and printed. A small participant file set: a links spreadsheet as CSV, a
  node and edge CSV pair, a GML file, and a file that will not read.
- **Start states:** `empty` (every tier 1 task), `setup` (hidden steps before the first screenshot)
  and `project` (a saved project opened through the app's own Open). No study-only routes in the app.
- **What it serves:** a production build, without Sentry, through servherd; each transcript records
  the build stamp. graphty.app itself is used only to check that the deployed build is the one
  studied.
- **Pilot walks** of every tier 1 task's success path through `real.mjs` before any session, written
  as steps plus `--expect` checks that graders also use.
- **Tree test and first click:** the outline is taken from the real app's accessibility tree and
  edited; a first-click screen is a real screenshot in a start state.

**When the round runs.** As soon as every tier 1 task test and the chained walk pass at `/?next`
on one commit, the round runs on a local production build of that commit, opened at `/?next`. It
does not wait for the Switch-over, the release, the GPU lane or the deploy; those run alongside it.
The Switch-over changes no file under `graphty/src/workspace/`, so the shell graphty.app serves
afterwards is the shell that was studied, and a transcript's build stamp names the commit.

---

## 8. Risks and owner decisions

**Owner decisions, in one sitting before element and app work start:**

1. **PR #409's visual review**, which the Frame and so every app package waits on; with it, the
   **tooltip delay**: 500 ms (the design) or 1000 ms (#409, Figma's).
2. **The graphty-element API decision document** (`element-api-decisions.md`): every new public
   shape in section 2 (preview, mapping and load progress; levels, default binding and the legend's
   cap and Other row; find; neighbors; result columns; sentences, aliases, essentials and category
   headings; the label report; the landing report; channel sections, with Size beside Fill), plus
   #726's run names.
3. **The project file format (#301)**, in the same document: one JSON document, versioned, results
   as columns, an `app` slot. The longest element item waits on it.
4. **The fate of PR #676** (breaking, touches label code), and holding #676 and #702 until the tier
   1 element items have released.
5. **Mergify (PR #777)**: merge or close it before the first app pull request.

Not needed for tier 1 and decided later: #133's open question (the legend and background in
exported images) and a seeded default layout in the element (it changes what every consumer sees
on a load; stories use fixed positions instead).

**Decided here (reversible):** four existing samples instead of the mock's two invented ones, two
of them generated as GML from graph-samples; the inspector tab named Values; the new shell under
`graphty/src/workspace/` reachable at `?next` until the Switch-over; unbuilt items hidden rather
than disabled; layout Pause and Resume, the export legend and background, and positioned labels
left out of tier 1; the load preview built on master, not on #770; only the Frame stacked on #409,
with the 2026-10-09 extraction deadline; task tests run in CI only; the study run on a local build
of the tested commit; Florentine families and College football sentences as written in section 1.

**Risks:**

- **The element is the critical path.** Eleven element pull requests (#726 and ten new) come before
  the app is complete, and the preview and the project file are each large. Both start on the
  decision day; the app packages that do not need them ship first.
- **The owner sitting gates everything.** Until the decision document and #409 are settled, no
  element item and no app package can merge. Writing the document is the first task.
- **The deploy waits for the GPU lane.** Every app release reaches graphty.app only after a green
  GPU lane, about 40 minutes; a red GPU lane holds the app back too. The study does not wait on it.
- **Review volume.** About 90 new stories; reviewing package by package keeps each batch small, and
  fixed positions keep the captures stable.
- **The studies were simulated.** Eight rounds of simulated participants shaped the design; the
  next round is the first on the real app, and it may overturn decisions the mock could not test
  (most of round 8's failures were mock defects).
- **Deleting the old shell** removes a large amount of tested code at once. The Switch-over waits for
  every task test and the chained walk, and the old shell stays reachable until it merges.

---

## Review changes

- **Analyze popover:** the key options per algorithm (`OptionDescriptor.essential`) and the "Ranks
  nodes" and "Finds groups" headings (from `category` with a catalog `categoryLabel`) are now
  element work (item 6), so the app holds no algorithm knowledge.
- **One legend rollup:** the category cap and the Other row moved into `styles.legend({
maxCategories })` (item 2). The Canvas package writes a new legend card that lays out the
  element's blocks; it no longer moves `Legend.tsx` or `legendChannels.ts`, and the Switch-over
  deletes the old legend files and their tests.
- **Disjoint files:** the Frame's command registry, key map and state store take registrations from
  each package's own directory; shared components (`FromDataList`, `LayoutGroup`) are stubbed at
  their final paths; package 2 owns `main.tsx` for the Sentry startup call; the Table dock is
  ordered after the Style tab.
- **Samples:** Les Miserables and Florentine families had no file to open. Package 2 generates both
  as GML with readable names and a named edge value; `sampleManifest.ts` carries a comment naming
  its tracking issue.
- **Counts and load state come only from the element:** load progress becomes a session event and
  the too-large refusal carries its limit (item 1); tree rows show counts only where the element
  publishes them.
- **Runs land visibly** moved from "later" into the blocking element list (item 8), with a test that
  Louvain wins color after Betweenness and the notice appears.
- **Size beside Fill** is the recommended section layout, decided before the section names become
  API (item 9).
- **Inspector tab renamed Values**, with a test that no two controls share an accessible name.
- **Tests:** one browser test per tier 1 task from the empty state, a keyboard-only find and
  neighbors test, the find-while-typing test on non-name ids, the Show labels trap tests, Export >
  Data's default table, and the footer wording. The chained walk now finds Javert and runs Louvain.
  The Switch-over requires them all, which makes the Data page and Project its prerequisites. They
  run in CI only, not in pre-push.
- **Fewer element pull requests and decisions:** layout Pause and Resume, the screenshot legend and
  background, and positioned labels are hidden in tier 1 and filed at high priority. Every API
  shape, #301's format and #726's names go into one decision document approved in one owner sitting.
- **#770 no longer blocks:** it is stacked on #765 with a red build; the preview is built on master.
- **Breaking pull requests held:** #676's fate is decided before label work; #676 and #702 wait
  until the tier 1 element items have released.
- **#409:** its review comes first; only the Frame stacks on it; a 2026-10-09 deadline triggers
  extracting the needed components into a non-breaking pull request.
- **Stable stories:** fixed node positions from a fixture, and #519 merged or replaced first.
- **Large files:** Close project and Esc stay live during a load until cancel (#296) lands.
- **Deploy:** the `github-pages` environment check comes first; the deploy skips a commit it
  already deployed; the build stamp shows the commit and release tag. Mergify is settled before the
  first app pull request.
- **Study timing:** the round runs on a local production build of the commit where every task test
  passes, alongside the Switch-over, release and deploy rather than after them.
