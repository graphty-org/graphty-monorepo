# Interface checks: roles, geometry, composition, second view

Checks run against compact-mantine's Storybook in the Figma rebuild (PR #409) and against
graphty-element's source, to settle open questions in `interface-specification.md`. Each check
says what was measured, what it shows, and what it changes. Checks that need participants or a
real screen reader are listed at the end with what is still owed.

## 1. The style-layer list's role

**Question.** Can the style-layer list be a `Tree` (role `tree`) or a `PageList` (role `grid`)
with an eye and Select painted on each row, and still be one Tab stop?

**Measured** (Chromium accessibility tree through the DevTools protocol, and a 20-press Tab walk,
on the `Tree` States, Default and FlatReorderableList stories and the `PageList` Default and
States stories):

- `Tree` rows are `treeitem`s named by `aria-label` (the layer name alone), with level, position
  in set and selected state. Arrow keys, Home, End and type-ahead move among rows; there is no key
  that moves focus into a row.
- The row's trailing toggles (`ToggleIconButton`, "Hide layer", "Lock layer") are exposed as
  `button` children of the `treeitem` -- ARIA does not make a treeitem's children presentational
  (the editor's draft lists no "Children Presentational" for `treeitem`; it does for `option`),
  and axe-core 4.13 agrees -- but each one is a native button at tabindex 0. The Tab walk landed
  on every toggle of every row in turn. A 12-row stack with an eye per row is therefore 1 + 12
  Tab stops, not one; with Select painted as a second control, 25.
- Every toggle has the same name ("Hide layer"). Reached by Tab, a screen reader hears "Hide
  layer, toggle button" twelve times with no layer name. Its state (pressed when hidden) is not
  part of the treeitem's name, so arrowing through the tree does not say which layers are off.
- `PageList` is a one-column `grid` of `row` > `gridcell`, one Tab stop, and its `PageRow` has no
  slot for a second cell. It cannot carry an eye at all without a component change.
- Neither story has 12 rows; the role structure does not change with count, so the 12-row
  outcome above follows from the 4-row stories.

**What it shows.** The list is hierarchical (source folds), interactive per row, and reorderable.
That is the WAI-ARIA APG Treegrid pattern: "a hierarchical data grid consisting of tabular
information that is editable or interactive". In a treegrid, Right Arrow on a row without
children moves into its cells, and Tab moves to the next input in the row or leaves the widget,
so the stack keeps one Tab stop and every eye is reachable from the arrow keys. A `listbox`
(named in the specification's screen-reader pass) is wrong: `option` children are
presentational, so the eye would vanish from the accessibility tree.

**Changes.**

- `interface-templates.md` 9, "Tab order: header; the list (one stop)" is false for `Tree`
  with actions today. The style-layer list needs a `Tree` variant with role `treegrid`: rows as
  `row`, the name, chit, count, eye and Select painted as `gridcell`s, the eye and trailing
  controls at tabindex -1 under the row's roving focus. The same variant serves Sets and paths
  (swatch and eye) and filter steps. It is a compact-mantine change, so every list with row
  controls gets it.
- Each toggle's accessible name includes the row: "Hide Degree color", or the row name via
  `aria-labelledby`.
- The screen-reader pass in the specification's validation list targets the treegrid variant,
  not a listbox.

## 2. One-node inspector and two-set comparison: targets and height

**Measured row geometry** (Storybook, 240 px panel): `DataRow` 216 x 32; `ActionRow` 216 x 32;
section header 40 (`PANEL_GRID.SECTION_HEADER`), 12 below a section's last row; three-way
`CompoundRow` segments are `PANEL_GRID.TRIPLE` (61.3 px) with 8 px padding each side; values are
set in Roboto Mono 11 px at 6.69 px per character.

**One node, attributes capped at 4 plus "N more"** (sections from `interface-specification.md`
4.1, caps from `interface-specification.md` 4.1a):

| Block | Rows | Height (px) | Targets |
|---|---|---|---|
| Type row | 1 `ActionRow` | 32 | 4 |
| Position | 1 row | 44 | 1 |
| Attributes | header, 4 + "N more" | 212 | 5 |
| Connections | header, 2 | 116 | 2 |
| Memberships | header, 1 | 84 | 1 |
| Appearance | header, 4 + "N more" | 212 | 5 |
| Export | header with "+" | 40 | 1 |
| **Total** | | **740** | **19** (22 with the Export button and header row 2's filter chip and zoom menu, matching `interface-specification.md` 4.1a) |

**The same node with all 60 attributes listed:** Attributes grows to 40 + 60 x 32 + 12 = 1972 px,
the column to 2500 px, and targets to 77 plus the filter field, three times the budget of 24 in
`principles.md` 5. The cap is doing real work.

**At a 1366 x 768 laptop.** The browser leaves roughly 640 px of viewport (an estimate: 40 px
taskbar and about 88 px of browser chrome); the inspector's two header rows take 80, leaving
about 560. The capped node's first four blocks (488 px) fit; Appearance's lower rows and Export
fall below the fold. So "which color" is a scroll away at the laptop size -- relevant to the
section-order first-click test, which should be run at this size.

**At 280 px.** Heights and target counts do not change: rows have fixed pitch and truncate rather
than wrap. Only text room grows. The inspector at 280 stays not offered (a second grid
identity); these numbers are for the comparison side, which is not bound to the grid.

**Two-set comparison difference list** (rows from `interface-templates.md` 18 and
`element-needs.md`'s comparison entry): a size row (A | B | difference, a `CompoundRow`, no
target); A only, both, B only (3 `ActionRow`s that select); shared numeric attributes as
`CompoundRow` A mean | B mean | difference, capped at 4 plus "N more"; Done.

| | Height (px) | Targets |
|---|---|---|
| Membership section: header, size, 3 rows | 180 | 3 |
| Attributes section: header, 4 + "N more" | 212 | 1 |
| Done | 32 | 1 |
| **Total** | **424** | **5** |

It fits the laptop column without scrolling. **The width is the constraint:** a three-way
segment at 240 holds 45 px of text, 6 characters; at a 280 column (224 / 3 = 74.7) it holds 8.
"-12,345.67" needs 67 px and fits neither. The difference list needs compact number forms (three
significant figures, "12.3k", signed difference) at 240, which `content-design.md`'s number rules
should state for comparison cells.

## 3. `ActionRow` as "N more" and as the type row

Checked from `rows/ActionRow.tsx` and `buttons/SplitButton.tsx` props and measured widths; no new
story was written (compact-mantine is outside this folder), so a story remains owed.

- **"N more" in an inspector section: works as is.** `state="56 more"` with `onClick` turns the
  reading into a full-row button of 32 px (WCAG 2.5.8), named by the reading. Pass
  `stateTitle="56 more attributes"` so the name says what is hidden.
- **"N more" in the style-layer list: cannot be an `ActionRow`.** Every child of a `tree` or
  `treegrid` must be a `treeitem` or `row`; an `ActionRow` (role `group`) inside breaks the
  structure. The fold's "N more" is a row of the list.
- **The type row composes, with two gaps.** `state` takes markup (kind glyph and title, with
  `stateTitle` for the full title); `actions` takes any nodes, so three `ActionIcon`s, a
  `SplitButton` and an overflow `Menu` fit. Widths at 240: `SplitButton` small is 41 x 24; three
  verbs with one split plus overflow is 24 + 41 + 24 + 24 + 3 x 4 gap = 125 px, leaving 216 - 125
  - 8 = 83 px, of which 24 is the kind glyph: **about 59 px of title, 8 or 9 characters.** Node
  labels will truncate. The gaps: `ActionRow` always draws its reading in secondary ink, where
  Figma's title is primary, and it has no leading-glyph slot. That is the `ActionRow` variant
  the specification already lists (8.2); it should add a `tone="title"` (primary ink) and a
  leading glyph slot.

## 4. A second viewport over one session (graphty-element)

**Read:** `graphty-element/src/Graph.ts` (session construction), `session/GraphSession.ts`,
`managers/RenderManager.ts`, `managers/DataManager.ts`.

- A `Graph` builds its own session from its own `DataManager` (`createElementSession({ store:
  this.dataManager, ... })`). There is no constructor path that takes an existing session.
- The session reads node and edge attributes back from the first graph's render objects
  (`this.dataManager.getNode(id)?.data`) until attribute columns land in the store. A second view
  would read its attributes through the first view's renderer, so closing the first breaks the
  second. That seam has to close first.
- Selection, visibility and the style stack (`session.paint`) are per session. Two views of one
  session share selection -- which is what brushing across views needs -- but also share paint,
  so the comparison's per-side membership marks must be drawn as marks, not style layers, which
  `canvas-drawing.md` 11 already requires.
- Renderer cost is per view: each `RenderManager` creates its own `Engine`, `Scene` and meshes, so
  GPU memory and per-element scene costs (see the scene-size note in the memory index) double;
  the graph data, positions and results do not.
- Comparing two graph versions is two sessions, not one; only comparing two sets of one graph is
  one session in two views.

**Estimate of the change.** Additive: a `Graph` option (or element attribute) that attaches to a
given session and store; the attribute seam moved into the store; per-view marks. It is a new
published option on graphty-element, so its name is a one-way door (recorded in
`one-way-doors.md` if the comparison surface goes ahead). Measured memory and frame cost need a
two-view prototype; none exists.

## 5. Not run: studies that need participants or a real screen reader

These cannot be measured from code or Storybook. Method and bars are in
`research/study-schedule.md`; nothing here replaces them.

| Study | What is owed | Prediction from the checks above |
|---|---|---|
| NVDA and VoiceOver walkthrough of 12-row `PageList` and `Tree` | a session on Windows (NVDA with Chrome and Firefox) and macOS (VoiceOver with Safari) | the Tab and naming defects in 1 will be heard; retest on the treegrid variant |
| First-click: what the pill means ("what data drives this color" vs "which layer colors this"), detach expectation, section order per kind | grayscale wireframes, 13 per condition | at 1366 x 768 Appearance is below the fold for one node (2), which biases section-order answers; run at that size |
| Closed card sort of the 34 style channels | 15 to 20 analyst participants, categories from `options-and-encodings.md` 3 | -- |
| Brushing a selection while a non-modal layer editor is open | task test counting edits applied to the wrong target | the editor's header names its target (5.10); the risk is an edit made after the selection changed while the header still names the old layer, which the count will measure |

## 6. What graphty-element infers from a file without asking

**Run.** `research/scripts/inference-misreadings.ts` feeds each file through graphty-element's own
readers (`src/data/`: format detection, the seven readers, endpoint resolution, and
`resolveEdgeWeight` in `src/data/ingest.ts`) with no host configuration, as a dropped file gets.
The element's rules, read from that code: direction is the file's declaration, else directed
(`data.directed: "auto"`); the endpoints are source/target, src/dst or from/to; the weight is a
numeric `weight` key, else a numeric `value` key, else 1; no weight role is inferred at all, since
a run records the meaning its algorithm assumes (`src/session/runs/types.ts`, `WeightMeaning`).
A **silent misreading** is a file read without error whose graph differs from what the file says.
Direction is checked by reciprocity: a file read as directed whose ordered pairs are returned 95%
of the time or more is a symmetric list read as one-way.

**Corpus.** 56 fixture files (`graphty-element/test/helpers/corpus/` without its malformed
folder, `test/data/`, the loose files in `test/helpers/`, and graph-io's Neo4j corpus) and 22 real
files: five of Newman's GML sets (lesmis, polblogs, celegansneural, netscience, adjnoun), Gephi's
lesmiserables GML, Netzschleuder's dolphins and residence_hall GraphML, lesmis GML and karate and
residence_hall CSV, sigma.js's arctic GEXF, Gephi's Java GEXF, graphology's celegans GEXF, three
Graphviz graphs (unix, world, process), SNAP's ca-GrQc and email-Eu-core as `.edgelist`, a STRING
network TSV, D3's miserables JSON and a Cytoscape.js elements JSON.

| Misreading | Fixtures | Real files |
|---|---|---|
| Direction: read directed with reciprocity at or above 0.95 | 0 | 0; ca-GrQc has reciprocity 1.00 but fails loudly (space-delimited), and would be the first once delimiters are sniffed |
| Direction the reciprocity test cannot see: an undirected network, stored once per pair, with no declaration, read as directed | 2 (got-edges.csv, whose GraphML twin says undirected; karate-neo4j.csv) | 0 |
| Edges or nodes lost with no error: node-link JSON under `links`, a Cytoscape `elements` document, a typed Neo4j header | 7 (d3, networkx, karate-d3, miserables and cytoscape JSON; movies-rels and movies-nodes CSV) | 2 (miserables.json: 77 nodes, 0 of 254 edges; the Cytoscape.js file: nothing) |
| Weight present but not read | 6 (a Gephi `Weight` column in four CSVs; `weight:double` in two Neo4j CSVs) | 1 (residence_hall GraphML: `attr.type="short"` is read as text, so 2,672 friendship levels of 1 to 5 become 1) |
| **Silent misreadings, total** | **15 of 56** | **3 of 22** |
| Weight role, counted apart: a weight read and meaning strength, which a path or closeness run reads as a distance with no question | 3 real networks among the fixtures (got-network, lesmiserables GEXF, karate Pajek) | 5 (Newman's lesmis, celegansneural and netscience `value`; Gephi's lesmiserables; graphology's celegans); none of the 22 carries a distance |

Loud failures, which are not misreadings: a `.tsv` (format not recognised), a space-delimited edge
list (no endpoint columns), and Netzschleuder's CSV headers written as `# source` (one error per
row). **What it shows.** The direction rule is not where the risk is today; key spelling is.
Every silent loss comes from a key the element does not look for (`links`, `elements`, `Weight`,
`weight:double`) or a type it does not parse (`short`), and in each case the element already
reports nothing it could not read. These are element needs, not app work: a `links` and
`elements` probe, case-insensitive and typed-header weight keys, GraphML's `short` and `byte`
types, and a load-report line naming the weight key used. The weight role needs the question the
binding step already asks, because no file in either set says whether its weight is a distance.

## Sources

- compact-mantine in `.worktrees/compact-mantine-figma/compact-mantine`: `src/components/tree/Tree.tsx`,
  `tree/PageList.tsx`, `rows/ActionRow.tsx`, `buttons/SplitButton.tsx`, `src/constants/panel.ts`,
  `src/theme/css/tree.css.ts`; stories `lists/Tree`, `lists/PageList`, `data/DataRow`,
  `data/ActionRow`, `panels/CompoundRow`, `panels/ControlSection`, `actions/SplitButton`.
- WAI-ARIA editor's draft, `treeitem` and `option` role characteristics,
  https://github.com/w3c/aria (index.html).
- WAI-ARIA Authoring Practices, Treegrid pattern, https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/;
  Tree View pattern, https://www.w3.org/WAI/ARIA/apg/patterns/treeview/ (says nothing about
  controls inside tree items).
- axe-core 4.13.0 role standards (`treeitem` not children-presentational).
- graphty-element: `src/Graph.ts`, `src/session/GraphSession.ts`, `src/managers/RenderManager.ts`,
  `src/managers/DataManager.ts`.
- `interface-specification.md` 4.1, 4.2; `interface-templates.md` 9, 10, 18; `interface-specification.md` 4.1a; `state-matrix.md` 8;
  `research/study-schedule.md`.
- Section 6: graphty-element `src/data/` (`DataSource.ts`, `CSVDataSource.ts`, `csv-variant-detection.ts`,
  `GraphMLDataSource.ts`, `JsonDataSource.ts`, `endpoints.ts`, `ingest.ts`), `src/config/DataConfig.ts`,
  `src/session/runs/types.ts`; real files from https://websites.umich.edu/~mejn/netdata/ (lesmis,
  polblogs, celegansneural, netscience, adjnoun), https://networks.skewed.de/ (dolphins, residence_hall,
  lesmis, karate), https://snap.stanford.edu/data/ (ca-GrQc, email-Eu-core), https://string-db.org/api/
  (a ten-gene human network), https://gitlab.com/graphviz/graphviz/ `graphs/` (unix, world, process),
  the sigma.js 1.2.1 examples (arctic), the gephi-toolkit-demos resources (Java, lesmiserables),
  graphology's GEXF test resources (celegans), D3's miserables gist (mbostock 4062045) and the
  Cytoscape.js cose-layout demo data
