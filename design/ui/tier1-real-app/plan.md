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

0. **Hold graphty-element releases** (the first owner decision). PR #726 (readable run names) is
   merged on master but not released; the next release would publish it as 3.6.0 with a shape the
   review rejected. The rework (decisions item 11) is the first element pull request, before any
   other element merge.
1. **Element bug fixes start today** (section 2, "Bug fixes first"). They need no API decision and
   release as patches.
2. **One owner sitting** (section 8): PR #409's visuals and the tooltip delay; the second version of
   `element-api-decisions.md` (direction and one-way doors); the project file as a graphty document;
   the fate of PR #676; Mergify (PR #777).
3. **In parallel, at once:** the deploy pull request; the two missing sample files; fixed node
   positions for stories (PR #519, which settles Storybook on the element, is already merged).
4. **graphty-element, in dependency order** (section 2, "Order"), on one integration branch: the
   shared types first, then the items. Each item gets its docs page and a second blind author
   before it merges into the branch.
5. **App:** the Frame on #409, then the other packages on the Frame, building against the
   integration branch through `workspace:*`; the Data page and Project when their element items
   land.
6. **Study:** when every tier 1 task test and the chained walk pass at `/?next`, the round runs on
   a local production build of that exact commit.
7. **Ship:** the integration branch merges to master (one graphty-element minor), then the
   Switch-over, the release and the deploy, so graphty.app ends up serving the shell that was
   studied.

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
| Canvas        | Legend card (with the reading sentence and size range), the loading, empty and too-large state cards, one notice slot (including the notice a run gives when its style was held back: "Hidden by your layer <name>" with Show anyway, from `runs.painting()`)                  |
| Inspector     | The one frame (header, state bar, Style and Values tabs) and the nine tier 1 kinds: the graph (Canvas, Layout, Overview), one node, a neighborhood or several elements, measure row, run row, group row, Everything, Selection, attribute                                    |
| Style tab     | Nodes and Edges switch, fixed sections from the element's channel groups (Size under Shape), set lines, "+" menus, the bind icon at rest on Color and Size, the From data list, the Binding popover, the Color and Shape popovers, one label line                          |
| Table dock    | Nodes, Edges and one tab per group run; Columns chooser; sort caption; Export... opening the Export dialog                                                                                                                                                                   |
| Data page     | One graph file, one edge list, or one node table plus one edge table, joined on the node id only; roles; model strip; match report with the unmatched rows; the typed refusals                                                                                           |
| Start screen  | Open project or file..., New from data..., Recent projects, four samples, the usage data card in the owner's exact words                                                                                                                                                     |
| Export dialog | Image (size and scale presets, and the legend, which needs #133) and Data                                                                                                                                                                                                    |
| Project       | Save, Save as..., Open, Close project, Recent projects                                                                                                                                                                                                                       |
| Settings      | General, Privacy, Accessibility and input                                                                                                                                                                                                                                    |

The inspector's tab is named **Values**, not Data (decision, reversible; now in `tier1-design.md`).
In round 8, participants confused the Data tab with the Data rail place and lost their selection. A
test checks that no two reachable controls share an accessible name.

### Shipped later, or hidden until the element provides it

The design's rule is that an unbuilt item is not drawn (no "Coming" tags), and the round 8 wording
rule is that a message whose count is not computed from live state is removed. So these are left
out of the first release and appear when their element piece lands, with no other app change:

| Left out at first                                                                                                 | Appears when                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The loading card's Cancel button and running count                                                               | the element can cancel a load (#296, raised to high) and publishes its progress event. Until then the card shows the file name and an indeterminate bar, and Close project and Esc stay live during a load |
| The GPU-lost card and Restart viewer                                                                              | the element reports a lost graphics device and can restart (new issue)                                                                                                                   |
| Shift+Arrow walking from node to node with its announcement                                                       | the element walks nodes from the keyboard and its camera keys ignore modified keys (new issues; today Shift+Arrow would also orbit, and Shift+A spins the camera). Until then a keyboard user reaches a node through the find box |
| The Paints line, the paint-order line ("Covered by PageRank for Color on 77 of 77") and a layer row's match count | the element counts what each layer matches and paints (new issue; the tier 1 tree rows depend on it)                                                                                     |
| Edge picking on the canvas                                                                                        | the element picks edges (new issue); an edge is reached from the Edges table                                                                                                             |
| The Layout popover's Motion line (Pause and Resume)                                                               | the element reports layout motion state (new issue). The popover still chooses a layout and runs it again                                                                                |
| The Export image's background switch                                                                              | #133 is built. The legend in the image is not on this list: it is a tier 1 blocker, because T13 and T15 cannot pass without it. If it is late, the Export dialog's status callout says the legend is not in the image |
| Joining tables on a column other than the node id (the owner's door entries joined to people and buildings)      | graph-io and the element can join on any column (high-priority issue, linked from #781); the load mapping is designed so the join adds fields without a break                          |
| The find box's Rows group (runs, groups, layers)                                                                  | the element's find searches those kinds                                                                                                                                                   |
| Reduced motion in Settings                                                                                        | the element honors reduced motion                                                                                                                                                        |
| SVG in the Export dialog                                                                                          | the owner answers whether "SVG figure export now" holds for tier 1                                                                                                                       |
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

Every new public name is an owner decision (a published API is a one-way door). The shapes are in
`element-api-decisions.md` in this folder, second version, after an adversarial review that
rejected every shape of the first. The owner approves its direction and one-way doors in one
sitting (section 8); each item then needs its docs page and an author who reads only those docs
writing and compiling its canonical example, before it merges.

**How it releases.** Master releases on every merge, so an item merged to master publishes to npm
before anything has used it. The element items therefore merge into one integration branch,
`tier1/element`, which the app packages build against through `workspace:*`. The branch merges to
master, as one graphty-element minor, once the tier 1 task tests pass on it.

### Already merged, and must change before it releases

- **Readable run names: PR #726.** Merged on master 2026-10-03, not released: 3.5.6 was published
  from a commit before it. It puts setting values into run ids, so tuning a setting starts a new
  run instead of revising the old one, against the design's "Rerun revises the same row". The
  rework (decisions item 11: values out of ids, re-run in place, `separate: true`, minted ids kept
  in the project) is the first element pull request, and graphty-element releases are held until it
  merges.
- **Read every source as bytes: PR #770.** Its base, #765, is merged. If #770 is green by the
  decision day, item 1 builds on its byte reads, so the load draft's read path is written once;
  otherwise item 1 builds on master with a note to port. Check first whether #770's "choose one
  graph of a file" adds public API that belongs in the decision document.

### Bug fixes first (no decision needed)

Found by the review; each is one issue (labeled `bug`, a priority and an effort) and one pull
request, released as a patch, starting today:

1. Naming the endpoint columns of a CSV loads 0 edges and reports success (blocks T3, T4).
2. Past about 125,000 edges a load fails with an uncoded `RangeError` instead of `E_TOO_LARGE`
   (blocks the too-large card).
3. A session with no renderer refuses loads under the limit, because edge-created nodes are counted
   twice (blocks the load draft's counts).
4. Paired-file and too-many-errors failures throw plain `Error` with no code (blocks T5).
5. The attribute cache goes stale after attribute writes (blocks T9).
6. The legend can drop its Other row at the 12-row cap, and orders categories by size (blocks T9).
7. A layer with a huge `bins` value hangs `legend()` (9.3 s, 2.5 GB); the style document reader has
   no caps. Both must be fixed before a project file from someone else is opened (blocks T14).
8. The label pass leaves stale "hidden" flags and its label list leaks across loads (blocks T10).
9. `zoomToSelection` frames nodes only, not selected edges (blocks T12).
10. The `graphty-*` DOM events are not typed for `addEventListener` (blocks every example that
    listens).
11. The guide's run examples (`run.result`, `(await element.run(...)).id`) do not compile.
12. Camera keys act on keys pressed with Shift (blocks Shift+A and the Shift+Arrow walk).

### Next graphty-element major

These changes are not additive and wait for one grouped major, with the held breaking PRs #676 and
#702: the `styles.add()` default decided from a column's measurement (item 2); removing
`ChannelDescriptor.group` (item 9); retiring `AttributeDescriptor.type`'s `"category"` and
`"time"` values (item 2); removing the CSV source's `idColumn`, `edgeSource` and `edgeTarget`
(item 1); and any change to what `selection.apply({ text })` selects (item 3, which must first prove
there is none). #676 also changes the label code item 7 touches; its fate is decided before label
work starts.

### The items

Each is one pull request into the integration branch. Effort is after the review.

0. **Shared types, no behavior.** The rules every item follows (decisions document, "Rules every
   item follows"): `ColumnRef`, `CatalogGroup`, the `{ run, field? }` form, the widened `ids`
   target, the text and error-code rules, the `progress:changed` event, the per-revision cache and
   the node and edge name rule. Effort medium. Blocks every other item.
1. **Load preview and column mapping** (#781): `data.prepare()` returns a held load draft. Blocks
   the Data page. Effort high.
2. **What a column measures, and the legend's Other row** (#782): `measurement`, `data.declare()`,
   `styles.encode({ column })`, decided once and stored. Blocks color or size by a value. Effort
   medium.
3. **Find without selecting** (#783): `session.find()`. Blocks the find box. Its index is measured
   at the load limit before the signature freezes. Effort medium.
4. **A node's neighbors** (#784): `data.neighbors()`. Blocks "Javert's 17 connections". Effort
   medium (was low).
5. **Result values as table columns** (#785): run-addressed `columns` and `ResultSort`. Blocks the
   table's result columns. Effort medium.
6. **What Analyze shows per algorithm** (#786): `catalog.algorithmGroups()`,
   `catalog.searchAlgorithms()`, `higherMeans`, the legend's reading. Blocks the Analyze headings
   and filter, and the legend sentence. Effort medium (was low). #786 must be rewritten first.
7. **Labels the overlap rule hid** (#787): `element.nodeLabelCounts` and `graphty-label-change`;
   the switch stays `layoutBehavior.labels.declutter`. Blocks the label line's count. Effort low.
8. **What a run's suggested style did** (#788): `runs.painting(id)`. Blocks the run notice. Effort
   medium (was low: it gains stored, undoable records).
9. **Style channel groups** (#789): `catalog.channelGroups()`. Blocks the Style tab's sections.
   Effort low.
10. **The project file** (#301), in three ordered steps: (a) the graphty document's open and save
    verbs, which no code has yet, for the existing `.graphty.json` notes and styles documents;
    (b) a measured project-open size limit at 50,000 nodes and 100,000 edges with 40 runs, and the
    owner's edge-identity decision; (c) the three new member kinds, `session.project` and
    `element.downloadProject()`. Blocks save and reopen, and Recent projects. Effort high; the long
    pole.
11. **Readable run names rework** (PR #726), above. Effort low, mostly deletion.

The legend parts of items 2, 6 and 8 are built as one change with one owner, with #790's
per-channel painted counts.

### Order

- First: item 11 (release hold) and the bug fixes, in parallel, today.
- After the sitting: item 0. Then, in parallel: items 3, 4 and 5; item 2, then items 6 and 8 for
  the legend; item 1 after item 2; item 10 (a) at once and (c) after item 2; items 7 and 9 on
  their own.

### Issues

Rewrite #781 to #789 and #301 to the second version's shapes before any branch starts; their
titles still carry the rejected shapes. File each bug fix above as its own issue. Raise #301 and
#296 to high. Close #149, #297 and #144 after checking that master does what they ask (#145 stays
open for the journal).

The owner also asked for the needs of later releases to be filed now, so the element can build
them before the app asks. Filed at high priority, each as one issue:

- **Hidden in tier 1 until built** (section 1): per-layer match and paint counts (#790; the tier 1
  tree rows' count slot and the Paints line depend on it); layout motion state with Pause and
  Resume; per-position label channels with number formatting; a lost-graphics-device report and
  restart; keyboard walking from node to node with an announcement; edge picking on the canvas and
  a selection mark on edges; joining tables on any column; reduced motion; samples listed and
  imported through the element (graph-samples as an optional peer; `sampleManifest.ts` and the
  generated sample files are the workaround it retires).
- **Needed by the study tooling** (section 7): a node's screen position in CSS pixels with whether
  it is visible (this one blocks canvas-click steps in the study); the node or edge under a point; a
  node's displayed label text; an accessible representation of the graph for screen readers (#800);
  a seeded default layout, so one file draws the same way each time (a default a consumer sees: the
  owner confirms).
- **Needed by tier 2 and later** (from `element-gaps.md`, "Later releases"): canceling any run;
  ordered filter steps; hiding on the canvas only; exporting a filter, set or selection;
  reader-facing error text with the file line; composite saved views and renaming a view; top N in
  a layer selector; explaining several elements at once; path ties, direction and weight meaning on
  shortest path; partition agreement and seed stability; computed attributes; vector figures;
  recipes; collapsing a group; version history; compare; merging nodes; several graphs in one
  project; a selection mark that meets 3:1 contrast on nodes and edges; renaming a run; Shift and
  Mod clicks adding to the selection.

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
| 3   | **Canvas**                                | `workspace/canvas/` (a new legend card that lays out the blocks `styles.legend()` returns, the state cards, the notice view). It imports nothing from today's `components/shell/canvas/`                                                                                                                                                                                                          | `styles.legend()` with the Other row (2); the legend reading (6); `progress:changed` (0) and the too-large report (1); `runs.painting` (8)       | ChartRow, RampRow                                                     |
| 4   | **Toolbar, Analyze and Layout**           | `workspace/toolbar/` (toolbar, selection bar, View flyout, Quick actions), `workspace/analyze/` (the Analyze popover, Run, revise), `workspace/layout/` (replaces the `LayoutGroup` stub)                                                                                                                                                                                                         | catalog, `estimate`, `runs.start` (exist); `algorithmGroups` and `searchAlgorithms` (6); `selection.apply({ neighborsOf })` (exists)              | ToolButton, ToolGroup, QuickActions, SearchInput, SplitButton         |
| 5   | **Graph place**                           | `workspace/graph-place/` (title line, find box and its result list, the paint tree, footer line)                                                                                                                                                                                                                                                                                                  | run names (11); `session.find` (3); `styles` layer list and visibility (exist); group `sizes` and run row counts from `RunResult` (exist)         | Tree, ResultRow, SearchInput, ToggleIconButton                        |
| 6   | **Data place**                            | `workspace/data-place/` (Sources, Attributes, their menus)                                                                                                                                                                                                                                                                                                                                        | `data.attributes()`, `data.source()` (exist); `measurement` (2)                                                                                  | Tree, ContextMenu                                                     |
| 7   | **Inspector**                             | `workspace/inspector/` (the frame, state bar, Style and Values tabs, every kind's Values tab and Why this look)                                                                                                                                                                                                                                                                                   | `styles.explain()`, `RunResult` reads, `data.statistics()` (exist); `data.neighbors` (4)                                                         | DataRow, ChartRow, Tabs                                               |
| 8   | **Style tab**                             | `workspace/style/` (the Style tab, set lines, "+" menus, the From data list replacing its stub, the Binding popover, Color and Shape popovers, the label line)                                                                                                                                                                                                                                    | `catalog.channelGroups` (9); `styles.encode({ column })` and `proposeEncoding` (2); `nodeLabelCounts` (7)                                       | VariablePill, ComboInput, ColorPickerPanel, AlignmentMatrix, FieldRow |
| 9   | **Table dock**                            | `workspace/table/` (adapted from `DataTableDrawer.tsx`: tabs, Columns, sort caption, Export...)                                                                                                                                                                                                                                                                                                   | `nodePage`, `edgePage` (exist); run-addressed result columns (5)                                                                                 | DataTable, MenuCheckItem                                              |
| 10  | **Export dialog**                         | `workspace/export/` (Image with the size and scale presets, and Data; registers Export...)                                                                                                                                                                                                                                                                                                        | `captureScreenshot` presets (exist); `exportGraph("csv")` with result columns and `lossNotes` (exists); run names (11); legend in the image (#133) | ModalFooter, SegmentedControl                                         |
| 11  | **Data page**                             | `workspace/data-page/`                                                                                                                                                                                                                                                                                                                                                                            | `data.prepare` and the load draft (1); `progress:changed` (0)                                                                                     | DataTable, StyleSelect                                                |
| 12  | **Project**                               | `workspace/project/` (registers Save, Save as..., Close project and Ctrl+S; the Save as dialog, Open, Close, the Recent projects store and list; File System Access handles where the browser has them, so Recent reopens a file (no browser reports its folder); elsewhere Save downloads a copy and the entry asks for the file with Locate...; the confirm-and-discard flow for `E_UNSAVED_CHANGES`) | `session.project`, `element.downloadProject` (10)                                                                                               | PageList, InlineRename, ModalFooter                                   |
| 13  | **Switch-over**                           | `App.tsx`; deletes the replaced code (section 1, "Today's app"), including today's legend files and their tests; removes `?next`                                                                                                                                                                                                                                                                  | --                                                                                                                                               | --                                                                    |

**Counts come only from the element.** No package counts nodes against a selector. A tree row
shows a count only where the element publishes one: group member counts (`RunResult`'s `sizes`
table) and a run row's count. A layer row's match count stays hidden until the per-layer counts
issue lands. The loading card's running count comes from the element's progress event, and the too-large
card's limit from the load draft's report (item 1).

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
3. **Table dock** in parallel with the Style tab: its Columns chooser lists runs (item 5 takes
   runs, not attributes), and the shared From data list is a stub until the Style tab fills it. The
   Inspector's graph kind shows the Layout stub until the Toolbar package merges; its task tests
   need both.
4. **Data page** when the load draft lands, and **Project** when the project file lands.
5. **Switch-over** last, once every tier 1 task test and the chained walk (section 5) pass on the
   new shell and the owner has reviewed every package's stories. The Data page and Project are its
   prerequisites, so it cannot release without bring-your-own-file or save and reopen.

Each package pull request is stacked on the Frame (not on #409 directly), opened as soon as it
holds finished work, and merged when its checks pass and the owner has approved its stories.
Mergify (PR #777) is settled before the first app pull request opens, so all of them merge under
one set of rules. If the owner defers it, app pull requests merge under the current ruleset (merge
commits, two required checks), and adopting Mergify later changes nothing in the packages.

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
  the Frame is rebased onto it, and #409 continues on its own. The agent leading tier 1 checks
  #409's state that day and starts the extraction; packages stacked on the Frame follow with one
  rebase each.
- **One conflict to settle:** #409's tooltips open after 1000 ms, as Figma's do; the design's
  toolbar tooltips open after 500 ms, an owner rule from an earlier round. One number has to win,
  and it belongs in compact-mantine's Tooltip so every caller gets it (owner decision, same sitting).
- **Anything else missing** from compact-mantine when a package is built (the inspector's
  histogram, if ChartRow does not cover it) is added to compact-mantine in its own pull request,
  never drawn in the app.

---

## 5. Tests

**graphty-element pull requests.** Node unit tests in the `default` project for every session API
(the load draft, find, neighbors, pages by result column, measurement and the stored default
binding, the legend's Other row, groups and search, `runs.painting`, project save and open round
trip, including "reopen, run pagerank, still `pagerank` with one layer"). Browser
tests for what draws: labels hidden by overlap. Every pull request keeps the 80 / 75 coverage
thresholds, adds its docs page, and its new API passes the developer review with the personas in
`design/designloom/personas/`. Its canonical example is written by an author who sees only that
docs page and compiled against that pull request's built types, not against review stubs.

**App packages.** For each package:

- **Unit tests** (graphty's `browser` Vitest project) for its logic: command registrations, the find
  list's keyboard rules, the label line's rules (one empty line at a time, dropped on selection
  change), the usage data gate. Fixed tests named by the reviews:
    - the Label "+" always adds a label line and opens its attribute list, and clicking the Label
      heading word does the same; Show sits on the Label section header;
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
  the element, pinning the label font) is already merged.
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
| T7 Rank nodes                | PageRank's `runs.painting()` reports `painted`, and the row is on top                                                                                                                                                                                                                         |
| T8 Find groups               | after Betweenness, Louvain's `runs.painting()` reports `painted` and `styles.explain()` names it the color winner; and a negative test: with a reader-set Everything color, Louvain reports `suppressed` with `byLayerId`, and the notice offers Show anyway |
| T9 Color or size             | size by a result stores the chosen scale and the range [1, 3] in the binding; a declared code column colors one color per group                                                                                                                                                             |
| T10 Labels                   | a label line bound to the name; the hidden count comes from `nodeLabelCounts`                                                                                                                                                                                                                  |
| T11 Layout                   | choosing a layout runs it and the inspector's Layout group shows it                                                                                                                                                                                                                         |
| T12 Find and neighbors       | typing a label that differs from the id (karate's ids are numbers) fills the result list while typing, before Enter; picking a result opens the node on its Values tab with its neighbors by name. Also a keyboard-only version: find box, the Degree link and the neighbor names, no mouse |
| T13 Picture and numbers      | Export > Image saves a file that contains the legend; Export > Data's result headers equal `results.path()` for readable run ids                                                                                                                                                           |
| T14 Save and reopen          | Save as, Close, reopen from Recent projects; rows, styles, the bound label line and the selection come back (Show all labels is a reader preference and is not checked)                                                                                                                    |

**The chained walk (T15).** One end-to-end test of the whole first session from an empty app: open
Les Miserables (nothing run); read the Overview; Analyze > PageRank, which paints;
Analyze > Louvain, whose `runs.painting()` reports `painted` and which wins color in
`styles.explain()`; size by PageRank; add a label line bound to the name; find Javert and read
his neighbors by name; Export > Image (with the legend) and Export > Data; Save as; Close; reopen from Recent
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
  job asks GitHub's deployments API for the last commit deployed to `github-pages` and skips when it
  is the same one; nothing new is stored.

Consequences: GitHub Pages publishes the whole site as one artifact, so the docs and Storybooks also
go live after the release, about 40 to 60 minutes after a merge instead of about 15. A red GPU lane
holds graphty.app back too; that is accepted, and the study does not wait on it (section 7).

Two app changes go with it: the Frame adds a build stamp (`<meta name="graphty-build">` with the
commit, stamped at build time; the deploy job adds the release tag when it assembles the site with
`tools/assemble-pages-site.sh`, because the tag is created after CI built the artifacts; shown in
Help > About), and package 2 gates Sentry on the usage data answer (section 3),
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
  sessions replace the mock's replays. The `setup` start state picks a seeded layout through the
  app's own Layout popover (the element already takes a seed for some engines), so every
  participant sees the same drawing without a study-only route.
- **Canvas steps:** `--click-at x,y` (and right-click, double-click, hover at a point), `--drag` and
  `--wheel`. Clicking a node by its name works once the element publishes a node's screen position
  (section 2's study issues); until then the pilot walks have no canvas-click steps.
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

**Owner decisions, in one sitting before element and app work start.** Each is a one-way door; the
second version of `element-api-decisions.md` gives the evidence.

| #  | Decision                                                                                                                          | Why now                                                                         |
| -- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1  | Hold graphty-element releases until the run-name rework merges                                                                    | the next release publishes #726's rejected shape as 3.6.0                        |
| 2  | Release the tier 1 element work as one minor from an integration branch                                                          | otherwise each shape publishes before anything uses it                           |
| 3  | PR #409's visual review, and the tooltip delay: 500 ms (a studio number) or 1000 ms (#409, Figma's)                              | the Frame and so every app package waits on it                                   |
| 4  | The decision document's direction and one-way doors, including the measurement names and the algorithm group ids                | the element items cannot start without them                                     |
| 5  | Whether graphty-element ships English text, and in what form (#803)                                                             | six items produce reader-facing text                                            |
| 6  | Whether a run's suggested style lands above a hand-written layer that colors everything                                          | today it is silently suppressed; changing it changes every consumer's drawing   |
| 7  | The project file as a graphty document; how an edge is identified in it; its open-size limit; one session or several graphs (#828) | the longest element item waits on it                                            |
| 8  | Whether the project file saves the selection (decided on the owner's behalf so far) and whether Show all labels travels with it   | both become part of the file format                                             |
| 9  | The usage-data card's wording: the round 7 and 8 evidence and a tightened draft that keeps every commitment                      | it is the owner's text, and it drives a No                                      |
| 10 | Whether SVG export ships in tier 1 ("SVG figure export now")                                                                      | the design leaves it out                                                        |
| 11 | The fate of PR #676, and holding #676 and #702 for the next major with the deferred changes in section 2                        | #676 touches the label code                                                     |
| 12 | Mergify (PR #777): merge or close it before the first app pull request                                                           | otherwise app pull requests merge under the current ruleset                     |

Not needed for tier 1 and decided later: a seeded default layout in the element (it changes what
every consumer sees on a load; stories use fixed positions instead).

**Decided here (reversible):** four existing samples instead of the mock's two invented ones, two
of them generated as GML from graph-samples; the inspector tab named Values; the new shell under
`graphty/src/workspace/` reachable at `?next` until the Switch-over; unbuilt items hidden rather
than disabled; layout Pause and Resume, the image background switch and positioned labels left out
of tier 1; item 1 built on #770 if it is green, otherwise on master; only the Frame stacked on #409,
with the 2026-10-09 extraction deadline; task tests run in CI only; the study run on a local build
of the tested commit; the sample sentences as written in `tier1-design.md`.

**Risks:**

- **The element is the critical path.** About 27 element pull requests come before the app is
  complete: the run-name rework, about twelve bug fixes, the shared types, ten items, and the
  project file's three steps. The project file's container verbs are the long pole. The app
  packages that need no new element item (Frame, Start screen, Settings, Export dialog) finish
  first; the Data page unlocks T3 to T5, Project unlocks T14.
- **Nothing is reviewed until the second blind pass.** Every revised shape was compiled only against
  reviewers' stubs, on a worktree 91 commits behind master. Each item's docs page and blind author
  come before its merge; a shape that fails there changes before it ships.
- **The owner sitting gates everything.** Until the decision document and #409 are settled, no
  element item and no app package can merge.
- **The deploy waits for the GPU lane.** Every app release reaches graphty.app only after a green
  GPU lane, about 40 minutes; a red GPU lane holds the app back too. The study does not wait on it.
- **Review volume.** About 90 new stories; reviewing package by package keeps each batch small, and
  fixed positions keep the captures stable.
- **The studies were simulated.** Eight rounds of simulated participants shaped the design; the
  next round is the first on the real app. Round 8's failures were mostly design defects, not mock
  defects (the names step failed 19 of 21 first sessions), and the fixes are untested.
- **Deleting the old shell** removes a large amount of tested code at once. The Switch-over waits for
  every task test and the chained walk, and the old shell stays reachable until it merges.

---

## Review changes

The first review of this plan, kept as a record. Where it disagrees with "Adversarial review
changes" below or with section 2, those win.

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
- **Runs land visibly** moved from "later" into the blocking element list (item 8).
- **Inspector tab renamed Values**, with a test that no two controls share an accessible name.
- **Tests:** one browser test per tier 1 task from the empty state, a keyboard-only find and
  neighbors test, the find-while-typing test on non-name ids, the Show labels trap tests, Export >
  Data's default table, and the footer wording. The chained walk now finds Javert and runs Louvain.
  The Switch-over requires them all, which makes the Data page and Project its prerequisites. They
  run in CI only, not in pre-push.
- **Fewer element pull requests and decisions:** layout Pause and Resume, the screenshot legend and
  background, and positioned labels are hidden in tier 1 and filed at high priority. Every API
  shape, #301's format and #726's names go into one decision document approved in one owner sitting.
- **#770** was judged not to block (superseded below).
- **Breaking pull requests held:** #676's fate is decided before label work; #676 and #702 wait
  until the tier 1 element items have released.
- **#409:** its review comes first; only the Frame stacks on it; a 2026-10-09 deadline triggers
  extracting the needed components into a non-breaking pull request.
- **Stable stories:** fixed node positions from a fixture.
- **Large files:** Close project and Esc stay live during a load until cancel (#296) lands.
- **Deploy:** the `github-pages` environment check comes first; the deploy skips a commit it
  already deployed; the build stamp shows the commit and release tag. Mergify is settled before the
  first app pull request.
- **Study timing:** the round runs on a local production build of the commit where every task test
  passes, alongside the Switch-over, release and deploy rather than after them.

---

## Adversarial review changes

The plan was reviewed adversarially on 2026-10-03 against the repository's state that day and
against the second version of `element-api-decisions.md`. What changed:

- **Release hold and one minor.** #726 is merged but unreleased; releases are held until its rework
  merges, and the element items go to an integration branch that merges as one minor once the app
  has used them. "Merge #726 now" and "#519 merged or replaced" are gone: both were merged on
  2026-10-03.
- **Bug fixes first.** About twelve element bugs that block tier 1 tasks need no API decision and
  start today as patches.
- **Not everything is additive.** The deferred breaking changes are listed for the next grouped
  major with #676 and #702.
- **Order by dependency.** A shared-types pull request comes first; items that share the legend,
  the page shape or the attribute declarations are ordered, not run blind in parallel.
- **Item 10 in three steps**: the graphty document's container verbs, a measured size limit with
  the edge-identity decision, then the project members. Section 8's "one JSON document with
  `format: graphty-project`" is replaced by "project members inside the graphty document".
- **The owner decisions** are one table of the one-way doors the review found, not five.
- **Size under Shape**, as `tier1-design.md` states; the three "12 of 12" citations are removed,
  because no round 8 record carries them.
- **The package table** describes the second version's shapes; the Table dock starts with the Style
  tab; Project handles `E_UNSAVED_CHANGES`; nothing claims a browser shows a saved file's folder.
- **Tests** assert what the element will do: `runs.painting()` outcomes with a negative test for a
  reader-set Everything color, not "lands on top"; the stored range [1, 3], not a level's default;
  T14 excludes the Show all labels preference; T13 checks the legend in the image and headers equal
  to `results.path()`. Export > Data needs no new element item: `data/export.ts` already writes
  result columns.
- **#770** is re-decided: its base is merged, and item 1 builds on it if it is green.
- **Joins on any column** are listed as left out of tier 1 with a high-priority issue.
- **Deploy**: the build stamps the commit only, the deploy adds the release tag, and the last
  deployed commit comes from GitHub's deployments API.
- **Study**: a seeded layout through the Layout popover in the `setup` state; no canvas-click steps
  until the element publishes screen positions.
- **Gates**: fallbacks stated for Mergify and for the #409 deadline.
- **Risks**: about 27 element pull requests, not eleven; the second blind pass; round 8's failures
  were mostly design defects.
