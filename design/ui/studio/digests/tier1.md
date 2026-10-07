# Tier 1 of the graphty app: what it is, what was built, what is left

A context digest for the design studio. It condenses the tier 1 design and plan, the
2026-10-04 comparison of the build against the clickable mock, and the pull request that merged
the build (#942, 2026-10-06). Every claim names its source. Short names used below:

- **DESIGN** = `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/tier1-design.md` (the
  spec to build; it wins over the plan and over the mock).
- **PLAN** = same folder, `plan.md` (pull requests, order, tests, ship, study tooling).
- **SHIP** = same folder, `ship-and-study.md` (deploy behind the release; driving the real app
  in a study).
- **API** = same folder, `element-api-decisions.md` (graphty-element API shapes, second version,
  and the owner's 2026-10-03 rulings at its end).
- **GAPS** = same folder, `element-gaps.md` (85 element capabilities checked against 3.5.5).
- **TODAY** = same folder, `app-today.md` (the old shell measured against tier 1, master 8a48b2f71).
- **REVIEW** = same folder, `review/` (adversarial reviews of the first API version:
  `item-N.md` verdicts, `blind-N.md` blind-author tests, `personas-N.md`, `security-N.md`,
  `perf-1.md`). Their conclusions are folded into API; read them only for evidence.
- **CMP** = `tmp/tier1-vs-mock/` (main checkout): `build-page.py` holds every mock-route vs
  built-story pair with a verdict (MATCH, INTENDED, SPEC GAP, BUILD DRIFT, NO STORY);
  `index.html` renders it with screenshots under `shots/`; `pairs.txt` maps routes to stories.
- **PR942** = `gh pr view 942` body ("feat(graphty): the tier 1 app", merged 2026-10-06 12:13Z).
- **The mock** = refined B, `prototype/app-b/` on the design branch
  (`.worktrees/ux-storyboards-mocks-and-study/design/ui/`), served at
  http://dev.ato.ms:9825/app-b/ ; `#/map` lists every state. Its spec is
  `prototype/study/structure-comparison/structure-b-refined.md` (version 5).

---

## 1. What tier 1 is

The owner's priority (2026-10-02, `prototype/owner-feedback.md`, "Priorities: the average
first-time user first"): **a first-time user's core path, tested from an empty app with no
project open** (DESIGN section 1). The target is the tier 1 slice of refined B, which eight
rounds of SIMULATED user studies shaped; the real app has never been studied (PLAN section 8,
Risks).

### The fifteen tasks and their bars (DESIGN section 1 table; round 8 results)

| Task | What the user does | Round 8 (on the mock) |
| --- | --- | --- |
| T1 | First launch and the usage-data question | 100% |
| T2 | Pick a sample and say what it is | 100% |
| T3 | Bring in your own graph file and check it all arrived | 100%, graded only up to Load |
| T4 | Two spreadsheets (nodes, edges) as one network | 100%, graded only up to Load |
| T5 | A file that will not read | 100%, on a refusal with line numbers the element cannot yet produce |
| T6 | Read what loaded: size, ties, reachability, recorded facts | 100% |
| T7 | Run an analysis that ranks nodes; read the top three | 100% |
| T8 | Run an analysis that finds groups; read them | 100% |
| T9 | Color or size by a value or a result | not measured (mock never applied it) |
| T10 | Labels from an attribute | 42% FAIL |
| T11 | A readable layout | 100% |
| T12 | Find a node by name, read about it, see its neighbors | 0% FAIL |
| T13 | Save a picture with its key, and the numbers for a spreadsheet | 100% |
| T14 | Save the project under your own name and reopen it | 100% |
| T15 | One whole first session, T2-T13 chained | 0% FAIL (the names/labels step in 19 of 21, plus mock defects) |

Key caveats (DESIGN section 1 and "Adversarial review changes"): the round 8 fixes (Label "+",
neighbor list, find box) are UNTESTED on working wiring and are "the first things the next round
tests"; the path after Load (T3, T4) is unmeasured; T15 failed on a design defect, not mostly on
mock defects.

### The acceptance bar

- **T15, the chained walk, is the build's acceptance walk** (DESIGN 5.T15): open Les Miserables
  (nothing run), read the Overview, run an analysis that paints on top, size by it, add a label
  line bound to the name, Export > Image with the legend, and the picture matches the screen.
  "Every step's change must be visible on the canvas and the legend the moment it commits."
- PLAN section 5 turns each task into one browser test from the empty state on the real element
  (asserting on element reports, never pixels) plus the chained walk: PageRank, then Louvain
  (`runs.painting()` reports `painted`, Louvain wins color in `styles.explain()`), size by
  PageRank, label line, find Javert and read neighbors by name, Export Image and Data, Save as,
  Close, reopen from Recent, rows/styles/labels/selection back. Negative test: with a reader-set
  Everything color, Louvain reports `suppressed` and the notice offers Show anyway.
- **The study gate** (PLAN section 7, "When the round runs"): as soon as every task test and the
  chained walk pass at `/?next` on one commit, run the round on a LOCAL PRODUCTION BUILD of that
  commit, without waiting for the switch-over, release, GPU lane or deploy.

### Design rules a tester should hold the build to (DESIGN sections 2-4, 9)

- graphty-element owns every piece of graph logic; the app only shows what the element
  publishes; every look on the canvas is a style layer; controls are compact-mantine only.
- An unbuilt item is NOT drawn (no "Coming" tags, no disabled promises); a message whose count is
  not computed from live state is removed (round 8 wording rule, DESIGN section 3 item 16).
- One selection shared by canvas, table and inspector; counts are links that select what they
  count; Esc closes the innermost thing first.
- Words: American spelling; "attribute", never "field"/"column" outside the table and Data
  page grid (and "attribute" itself is to be re-tested: 5 of 12 did not use it); every door uses
  its command's one label word for word; no two reachable controls share an accessible name
  (inspector tab renamed **Values** for this reason).
- Tooltip: one component, name plus key chip; DESIGN says 500 ms, compact-mantine ships
  1000 ms (open owner question, PLAN section 4).

### The shell in one paragraph (DESIGN section 2)

At 1366 x 768: header (main menu, project name with its menu, Undo/Redo, privacy chip); a rail
with only **Graph** and **Data**; a left panel (Graph place = title line, find box, paint tree,
footer; Data place = Sources and Attributes); the canvas (legend card top left, one notice slot,
state cards, no buttons) with a floating toolbar **Analyze | Layout, View, Legend | Quick
actions** and a selection bar holding only **Neighborhood (G)**; the inspector (two-line header,
optional state bar, tabs **Style** then **Values**; a single node always opens on Values); a table
dock (Shift+T). Two full pages: the **Data page** (every data door; clean single file = one Enter)
and the **start screen** (Open project or file..., New from data..., Recent projects, four
samples, usage-data card). One Export dialog (Image, Data). Settings: General, Privacy,
Accessibility and input.

### Round 7/8 decisions that tier 1 ships (DESIGN section 3, all untested on the real app)

Label "+" always adds a label line and opens its attribute list (Show checkbox sits on the Label
header); a label line states "77 labels, 64 hidden to avoid overlap" from live state; a node opens
on Values and its Degree selects its neighbors; a neighborhood is listed by name and tie value
("Javert's 17 connections"); the find box is one live list over the project; samples open with
nothing run; Export > Data opens on the showing table (Nodes by default); one Export dialog; runs
land on top, visible and listed, and hiding/showing repaints canvas and legend; one legend switch
shared by canvas and Export; Layout is its own group with an "arranging" glyph; the legend says in
one sentence what a higher value means; Analyze's box is "Filter analyses"; bind icon at rest on
Color and Size; one attribute menu (Add label line, Show in table).

### Sample set (DESIGN 2.11, PLAN section 1 "Samples")

Les Miserables, Zachary's karate club, College football, Florentine families. The mock's Protein
interactions and March transfers were dropped (no such datasets). Les Miserables and Florentine are
generated GML (`graphty/scripts/write-sample-gml.ts`, `npm run samples:write`) with a readable
`name` attribute and the Les Miserables edge value named `shared chapters`. The list lives in
`graphty/src/data/sampleManifest.ts`, a temporary workaround until the element lists samples
(#796, open).

### Explicitly not in tier 1 (DESIGN section 7)

Tier 2: filters, shortest path, notes, joins beyond one node table plus one edge table, weight
meaning at load, Select where dialog, neighborhood distance, edge selection beyond the table.
Later: sets, compare, recipes/style files, version history, views/present/video, report, SVG/PDF
figures, assistant, VR/AR, several graphs per project, Overrides, renaming rows, and more.

---

## 2. What #942 built (PR942)

#942 folded every tier 1 screen pull request into one merge with one screenshot review: #887
start screen, samples, usage card; #889 toolbar, Analyze popover, Layout group; #941 canvas
(legend card, state cards, held-back-run notice); #943 table dock; #948 Data place; #950 Graph
place; #953 Style tab; plus the project package (save, close, reopen) and two graphty-element
renderer changes (#490 and #617: every edge, arrow cap and line style drawn as instances of shared
meshes; ceilings raised to 100,000 nodes and 1,000,000 edges; large frame-time wins). The Data
page and Export dialog were already on master (PR942 keeps `20261004T052442Z-pr942.json` for 30
Data page baselines; the Export dialog is compared in CMP). The owner accepted 324 images
(`visual-baselines/reviews/20261006T065852Z-pr942.json`). All new code is under
`graphty/src/workspace/` (PLAN section 3).

Per screen (PR942):

- **Start screen**: three columns; samples imported through the element's ordinary import with
  nothing run; the usage card in the owner's words; Sentry now starts only after Share usage data
  (replay masks all text, inputs, media) and stops after a later No; privacy chip; Settings
  (General, Privacy, Accessibility and input). Test:
  `graphty/src/workspace/start/__tests__/StartScreen.real-element.test.tsx`.
- **Toolbar**: one Tab stop with arrow keys; nothing drawn disables all but Quick actions with a
  reason. Analyze (Shift+A): filter box, Recent, the element's catalog under the APP's headings,
  key options, a cost line from the element's estimate, Run; picking again offers "Update <name>
  row". Layout: element layouts, recommendation marked, Re-run and Reshuffle seed. View: Fit,
  Frame selection, Front/Side/Top, Isometric, 2D/3D. Legend (L), Quick actions (Ctrl+K), selection
  bar with Neighborhood (G).
- **Canvas**: legend card from `styles.legend()` (ramps, categories, "Other", "N more"); "Reading
  <project>" card while loading; "No nodes to draw" with Add data...; "Hidden by your layer <name>"
  with Show anyway, from `runs.painting()`.
- **Table dock**: Nodes, Edges, one tab per group run, paged and sorted by the element
  (`nodePage`, `edgePage`, run-result columns); Columns chooser; caption follows sort; group row
  menu narrows Nodes to members; row clicks select; Export... for the showing table.
- **Data place**: Sources and Attributes; source opens the Data page; attribute opens its
  inspector; menus Edit source..., Add label line (via `styles.encode`), Show in table; find past
  15 attributes.
- **Graph place**: title line; find box ("/") listing elements and "Select where <attribute> is
  <value>" rows; paint tree (Selection, runs and the reader's layers in paint order, Everything)
  with state, ramp or groups, counts, an eye that hides a row's paint as one undo step, Delete with
  Undo. All read from the session (`session.find`, `runs.list()`, `styles.list()`,
  `styles.legend()`, `selection`, `history`).
- **Style tab**: Nodes | Edges switch; fixed sections (Fill, Shape, Effects, Label, Tooltip;
  Line, Arrows, Label), each listing only what it sets, "+" and "-" with Undo; bind icon on Color
  and Size opens the From data list; Binding popover (Source, Scale, Palette, Reverse, Values from,
  No value, Detach); validity from `styles.validate`; one label line per row with the element's
  label counts.
- **Project**: Save (Ctrl+S) and Save as... (first Save opens Save as with the name selected);
  Chromium writes the same file again, other browsers download a copy ("Downloaded <name>"); Close
  project asks "Discard unsaved changes?" when dirty; Recent projects on the start screen and under
  Open recent (name, node count, time; Locate... and Remove from list for an unreadable file);
  header rename is one undoable element step; save failures give a notice. Uses
  `session.project.save/.open/.rename/.name/.dirty`, `project:status`, `element.downloadProject`.
- **Fixes made by putting screens together**: a reader's layer row now opens its Style tab (it
  showed the graph overview); a group row shows its values alone (a group is not a layer); the
  empty canvas card offers Add data..., not Open project or file...

### What PR942 itself says is NOT done

- **Open project or file... does not reopen a `.graphty.json` as a project**: it imports it as
  data. Reopen works only from Recent projects or Locate.... Was waiting on #913 (now closed in
  the element; app adoption not confirmed).
- **The legend switch is not saved with the project** (DESIGN T14 says it should be).
- **Undo can leave a stale project name in the header** when undo clears the element's name.
- **The Selection row's Style tab draws an empty body**: the element keeps the selection's look in
  `config.selectionStyle`, not in a style layer.
- Start screen: no sample thumbnails (#878, open); a failed open shows the element's own English
  after the app's sentence (#879, open); a sample's description is not in its screen-reader name;
  Ctrl+O while a new project's element is starting replaces that project.
- At the time, a reopened undirected graph came back directed and the reopen notice said "1 part
  did not come back" (#909, since closed in the element).

---

## 3. Build vs mock (CMP, 2026-10-04, on a worktree merging master with the 11 open tier 1 branches)

Each mock route was paired with a built Storybook story, light and dark, 1200 x 900. Verdicts are
in `tmp/tier1-vs-mock/build-page.py` (the `P` list). Some drift was fixed later in #942 (marked
FIXED); spot checks on origin/master on 2026-10-06 are marked "still on master".

**Matches** (selected): usage-card disclosure/answer/decline; Recent projects and missing-file
row; Save as dialog; toolbar at rest; Analyze filter ("brokers" finds Betweenness via the element)
and "Update <name> row"; Louvain run row with group children; failed row; find no-match; size
binding with legend range; measure row Values (histogram, Top 10, Made with); run row Values;
"Settings changed since the run -- Rerun | Revert"; Why this look; every Style-tab picker
(plus menu, color, shape, bind, binding, palette, unknown path, Label "+" adds an empty line and
opens the list, "Pick an attribute"); table group tab, members chip, options -> Export; Data page
two-table load (`node (4) --transfers (3)--> node`, Add | Leave out), unmatched rows, file
settings, URL, refusals (unknown format, empty, endpoints, fetch); Export > Data.

**Build drift (the build departs from DESIGN)**:

- Empty canvas card ran Open project or file... instead of Add data... -- FIXED in #942.
- Measure/group run row showed an EMPTY Style tab in the merged app (tree put the run id where
  the Style tab looked for a layer id) -- the Style tab now resolves a run row through
  `session.runs.bindings(id)` (`graphty/src/workspace/style/StyleTab.tsx:44`); verify live.
- Tree footer "Add data to start" is plain text, not a link (`GraphPlace.tsx:23`).
- Running row has a spinner but no progress bar (`PaintTree.tsx:44`).
- Legend has no reading sentence under the title (`LegendCard.tsx:85`; element #912 now closed,
  app adoption unverified).
- Data place Sources "+" never drawn: commands `data.add-file`, `data.add-url`, `data.add-paste`
  are read (`DataPlace.tsx:52`) but no package registers them -- still on master.
- Attribute role tags and "In use" grouping missing (element #893, #923 now closed); attribute
  inspector has no values histogram (#897 closed).
- Graph Overview: no degree histogram (#896 closed); isolated nodes, self-loops, repeats are text,
  not selecting links (#931, #899 closed).
- Canvas section lacks Show all labels and Reframe when data changes (#903, #900 closed).
- Layout Method is a plain dropdown select (`layout/LayoutGroup.tsx:34`), not a method popover
  with engine/options/pacing folded; no "Layout" heading -- still on master.
- Analyze short form has no Weight line for PageRank: the build shows only options the element
  marks essential (`AnalyzePopover.tsx:296`; element #882, open: PageRank's weight is marked
  advanced).
- View flyout reads "Switch between 2D and 3D" not "Switch to 2D/3D"
  (`toolbar/commands.ts:105`) -- still on master.
- Main menu: Open recent vanishes with no recent projects instead of showing disabled
  (`RecentMenu.tsx:41`).
- No "Waiting to capture the image" disabled reason on Layout during an export wait
  (`layout/commands.ts:25`).
- Nodes named by id ("n0", "n4") in find hits, node header, neighborhood title and group members
  (`Inspector.tsx:291`, `NodeValues.tsx:180`; element #895 closed, app still cites it).
- Group Members reads "First 10" in load order (`inspector/RunValues.tsx:429`), not the top 10 by
  ranking -- still on master.
- Table: every attribute shown by default including raw `position` JSON (`table/columns.ts:79`,
  #923); no type glyph in headers (`RecordTable.tsx:95`); Columns is a dark tick menu, not the
  field list with checkboxes (`TableDock.tsx:139`).
- Data page: roles are a row of selects above the grid, not under each column header
  (`DataPage.tsx:685` comments that the compact-mantine grid header cannot hold a menu -- an app
  workaround of a component limit); Direction is a dropdown, not three choices; the weight line is
  the generic "Every edge counts 1. To weigh edges, give a number column the Weight role."
  instead of "value is a number: use it as the weight?" (`DataPage.tsx:607-609`, element #926
  closed) -- still on master.
- Everything row's Color line shows a truncated "#63..." with no opacity percent
  (`style/SetLine.tsx:417`).
- Export > Image: the legend is NOT drawn into the image (element #133, OPEN); the callout says
  so. DESIGN calls this a tier 1 blocker: T13 and T15 cannot pass without it.
- Too-large refusal card not drawn (`CanvasOverlays.tsx:127`, #902).
- CMP also found that a build merging the inspector and Data place branches threw at startup (both
  registered inspected kind "attribute"); #942's combined branch passed its suites, so treat as
  resolved but watch for it.

**Spec gaps (the mock shows something DESIGN never stated)**: no empty legend card "Nothing is
colored or sized by a row" when nothing is bound (`CanvasOverlays.tsx:262`); usage card narrow, not
full width; Settings has a Done button and no Find settings box; dark 1 px frame around the canvas;
no collapsed table strip at the canvas foot; Quick actions lacks Recent, home paths and key-hint
footer; Analyze popover has no title bar with X; find results listed above the tree rather than
replacing it, and the mock's "Rows" group is absent; tooltip delay 1000 ms.

**Intended differences**: rail with 2 places; no filter chip, Notes row, graph switcher; tabs
Style | Values; no Motion line; loading card without Cancel; one label line; no GPU-lost card; no
Shift+Arrow walk; four samples; parse refusal without row numbers; Paints/paint-order lines absent.

**Not captured (no story)**: Analyze costly (Exact | Sampled), partial row, Overview computed and
components-selected, layout-slow, Overview reading, table column menu, Data page detect-several,
unsupported-format, too-large, ids, reading, one-at-a-time, edge-disabled, and four Export image
error states (code exists in `ImageOutput.tsx`). These are untested surfaces.

---

## 4. Switch-over: how the new shell becomes graphty.app

- **Today on master**, `graphty/src/App.tsx` renders the old `AppShell` at `/`; `?next` renders
  the tier 1 `Workspace`; `?demo` is the component gallery. Comment: `?next` is "built beside this
  shell until the Switch-over makes it the default and removes the parameter".
- **Conditions** (PLAN section 3 "Order" item 5, section 5): the Switch-over is the last package;
  it requires every tier 1 task test and the chained walk green on the new shell, the Data page and
  Project packages merged (so it cannot release without bring-your-own-file or save/reopen), and
  the owner's review of every package's stories; before it, an agent serves a production build and
  the owner walks it beside the mock (`#/map`).
- **What it deletes** (PLAN section 1, "Today's app"; TODAY section 4): the six rail places and
  panels, result cards and `ResultInspector`, old inspector bodies, insights strip, minimap,
  filter strip, status bar, History popover, Share and Compare, the load-time label layer and
  `loadDefaults`, `LoadDataModal`, `RunAlgorithmModal`, `RunLayoutsModal`, `ComingTag`, the app's
  own `neighborsOf`, and the old legend (`Legend.tsx`, `legendChannels.ts`,
  `legendAvailability.ts`, `CanvasRegion.tsx` and tests). `?demo` and AI panel code stay,
  unreachable. The new shell never calls `loadDefaults` or adds a label layer.
- **Deploy** (PLAN section 6, SHIP section 1): graphty.app should go live only after a successful
  build AND release: `deploy-pages.yml` becomes a reusable workflow called by a `deploy` job in
  `release.yml` with the gate's CI run id; artifact check extended; skip if the commit was already
  deployed. Consequence: the whole Pages site (docs, Storybooks) goes live 40-60 minutes after a
  merge and a red GPU lane holds the app back. A build stamp `<meta name="graphty-build">` (commit,
  plus release tag added at assembly) shows in Help > About. NOT adopted as of 2026-10-06: the
  repository's CLAUDE.md ("CI/CD Pipeline") says `deploy-pages.yml` still deploys graphty.app after
  every green CI run on master, and releases go out on a daily train (14:00 UTC) as a release pull
  request merged by Mergify. So a merge reaches graphty.app's `/?next` after master CI, not after
  the release.
- The study does not wait for any of this: test on a local production build at `/?next`
  (PLAN section 7).

---

## 5. Element dependencies and known gaps

### The plan's element item list (PLAN section 2; API) and the owner's rulings

Items: 0 shared types; 1 load preview and column mapping (`data.prepare()`, #781); 2 what a
column measures and the legend's Other row (#782); 3 find without selecting (`session.find`,
#783); 4 a node's neighbors with tie values (`data.neighbors`, #784); 5 result values as table
columns (#785); 6 what Analyze shows per algorithm (#786); 7 labels the overlap rule hid
(`nodeLabelCounts`, #787); 8 what a run's suggested style did (`runs.painting`, #788); 9 style
channel groups (#789); 10 the project file (#301); 11 readable run names (PR #726).

**Owner rulings 2026-10-03** (API, "The owner's decisions"): all approved as recommended except:
item 9 DROPPED (arranging the Style tab is presentation, which the app owns; it groups by the
existing `ChannelDescriptor.group`); item 11 released as built (no rework, releases resumed); item 2
keeps minimal inference (strings/booleans categorical, numbers quantitative; a declaration always
wins). **New rule: graphty-element is neutral about presentation** -- it returns facts and
`{ code, params }` with no default English; the app writes every word, heading and grouping. This
SUPERSEDES the DESIGN/PLAN text that has the element compose the legend's reading sentence, the
Analyze headings, "Start here" or a `CatalogGroup`. Analyze headings and the legend sentence are
app words (e.g. `graphty/src/workspace/canvas/legendWords.ts`; master commit 638fc4e10 "words for
the five algorithms the element added").

### Status of the tier 1 element issues (GitHub, checked 2026-10-06)

Still OPEN (each blocks or hides a tier 1 piece):

- **#133** legend drawn into exported images -- the named tier 1 BLOCKER for T13 and T15.
- **#296** load cancel and exact progress (loading card's Cancel and running count hidden).
- **#790** per-layer match and paint counts (Paints line, paint-order line "Covered by ...",
  layer-row counts hidden).
- **#791** layout motion state (Layout popover's Motion line, Pause/Resume hidden).
- **#796** samples listed and imported by the element (app keeps `sampleManifest.ts` + generated
  GML as a marked workaround); **#878** sample thumbnails.
- **#879** `data.import()` rejects with plain Errors.
- **#880** cost estimate reason is English with no code; **#881** no verb to re-run the current
  layout; **#882** PageRank's weight option marked advanced (no Weight line in Analyze);
  **#883** option descriptors carry English.
- **#828** several graphs in one project.

CLOSED in the element (app adoption NOT verified; app files on master still cite them):
#893/#923 attribute roles and in-use (`data-place/DataPlace.tsx`, `inspector/NodeValues.tsx`,
`table/columns.ts`), #894 rename a source, #895 node names (`inspector/Inspector.tsx`,
`NodeValues.tsx`, `RunValues.tsx`), #896 degree distribution and #897 value histogram,
#899/#931 select self-loops, repeats, isolated nodes (`inspector/GraphValues.tsx`), #900 reframe
switch, #902 load progress start/end, #903 Show all labels door, #904 text-filtered pages (table
search), #906/#907 group value type and per-group hide (`graph-place/rows.ts`), #909 undirected
reopen, #912 legend reading facts and bound size range (`canvas/LegendCard.tsx`), #913 one intake
verb (Open project or file... reopening a project), #915 default range when sizing by a run
result, #918 `project.save` dirty timing (`project/actions.ts` workaround), #919 project file
name/extension/media type (`project/files.ts` copy), #926 load draft roles (weight line), #933
partial flag at iteration cap; compact-mantine #908 tree rows, #920 PageList rows
(`project/RecentProjects.tsx` built from Mantine parts), #934 QuickActions. Also #301 (project
file), #788 (`runs.painting`), #803, #409 (compact-mantine Figma redraw) are closed/merged.
**This adoption backlog -- deleting app workarounds and drawing what the element now provides --
is the largest cheap win before the next study round.**

### Not-at-first-release items (DESIGN, marked; PLAN section 1 table)

Loading card Cancel and running count (#296); GPU-lost card; Shift+Arrow walk with announcement and
camera keys ignoring modified keys (today Shift+A / Shift+Arrow also move the camera,
`cameras/OrbitInputController.ts:52`); Paints and paint-order lines (#790); edge picking on the
canvas and a selection mark on edges (an edge is reached from the Edges table); Layout Motion line
(#791); image background switch; joins on any column; find's Rows group; reduced motion; SVG
export (owner question against "SVG figure export now"); a second label line and number formatting
on labels.

### Study-tooling element needs (PLAN section 2 "Issues"; SHIP section 2)

A node's screen position in CSS pixels with visibility (blocks canvas-click steps), the node or
edge under a point, a node's displayed label text, an accessible representation of the graph
(#800), and a seeded default layout. The studio worktree (`design/studio-tier1`) already merges
`feat/element-element-at-point` and `feat/element-seeded-default-layout` and adds the real-app
study tool at `design/ui/studio/tool/real.mjs` (with `with-browser.sh`).

---

## 6. Open owner decisions (PLAN section 8; API "The owner decisions")

Settled 2026-10-03: hold/one-minor (superseded: #726 released as built), the API direction, item 9
dropped, presentation neutrality. #409 merged. Still open per the sources (verify before asking):

- Usage-data card wording: round 8, 6 of 6 read "the author ... and his Claude Code sessions" as
  an unexplained second recipient and 4 said it drove their No; round 7, 3 of 3 declined on the
  session replay. A tightened draft keeping every commitment goes to the owner (DESIGN 2.11).
- Tooltip delay 500 ms (studio) vs 1000 ms (shipped).
- Whether a run's suggested style lands above a hand-written layer that colors everything (today
  suppressed with a "Hidden by your layer" notice; the real cause of round 8's missing
  communities).
- Whether the project saves the selection (decided on the owner's behalf) and whether Show all
  labels travels with it (DESIGN says it does not).
- SVG export in tier 1.
- Size under Shape vs its own heading (left for a re-test on working wiring; the "12 of 12"
  figure for moving it is untraceable).
- Analyze headings: they failed round 8's tree test (betweenness 29% direct; "Measure the graph"
  made 16 of 21 pause); the heading comparison has not run; acceptance uses PageRank meanwhile.

---

## 7. What the plan says comes next

1. **Pass the task tests and chained walk at `/?next`** on one commit (PLAN sections 5, 7); then
   run the next study round on a local production build of that commit, live sessions through the
   real-app tool (`empty` start for every tier 1 task; `setup` and `project` starts for mid-path
   states; downloads saved; build stamp recorded). The first things to test are the untested round
   8 fixes: the Label "+" line, the neighbor list, the find box (DESIGN section 1).
2. **Close the element blocker #133** (legend in the image) -- T13 and T15 cannot pass without it.
3. **Adopt the closed element issues** in the app and delete the marked workarounds (section 5).
4. **Fix the build drift** listed in section 3, especially the ones a first-time user meets on
   the core path: node names shown as ids, the generic weight line, Sources "+" missing, Layout
   method as a bare select, the Analyze Weight line (#882), group Members order.
5. **Finish what PR942 left**: Open project or file... reopening a project file (#913 adoption),
   saving the legend switch, the stale-name-after-undo bug, the Selection row's empty Style tab.
6. **Switch-over** (delete the old shell, remove `?next`), then release and deploy behind the
   release so graphty.app serves the shell that was studied (PLAN sections 3, 6).
7. **Then tier 2** (DESIGN section 7): filters, shortest path, notes, joins, Select where.
