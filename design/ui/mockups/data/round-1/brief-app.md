# Data mocks, round 1: the app as it is today

What the graphty app does with data today, where it falls short of the data management
requirements, and the frame every new mock must fit. Read this before drawing a data screen.

See `design/data/data-management-requirements.md` for the requirements and their ranks.

## Which build to draw from

Two builds of the app exist, and they differ on data:

- **The study build** (worktree `.worktrees/design-studio-tier3`, app 0.8.68 and later) is the
  newest look. It has a Filters section in the Data place, a filter step editor in the inspector,
  a Table and a Filter button on the canvas toolbar, and a Notes place on the rail. Every real
  screenshot below comes from it.
- **The integration build** (this worktree, app 0.8.90) has none of those yet: no filters, no
  Notes, and the toolbar holds only Analyze, Layout, View, Legend and Quick actions. Its start
  page is the newer landing page.

**Draw mocks on the study build's frame and the integration build's start page.** That is what
the owner will see once both land, and it is what the studio's readers have been testing.

## The frame a mock must fit (1440 x 900)

Measured from the study build at 1440 x 900, dark theme.

| Region        | Size and place                                                                                                                                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header        | 40px high, full width. Main menu, project name (renamable), undo, redo, "Local only" lock. The study build adds a filter chip here when a filter is on.                                                                                                                    |
| Rail          | About 56px wide, left. Graph, Data, Notes on top; Settings at the foot. Icon plus a word under it.                                                                                                                                                                         |
| Left panel    | 240px by default, resizable 240 to 480. Shows the Graph place or the Data place, whichever the rail picked.                                                                                                                                                                |
| Canvas        | About 904px wide at the default panel widths. The toolbar floats centered, 12px above the canvas foot, about 48px high. Notices sit above the toolbar.                                                                                                                     |
| Table dock    | Opens along the canvas foot, inside the canvas column only (not under the panels). 240px by default, resizable 120 to 480. Tabs Nodes, Edges and one per group result; row count; "Columns: N of M"; an options menu holding only Export...; close X.                      |
| Inspector     | 240px by default, resizable 240 to 480, right. Title row with icon, name, kind word under it, and a "..." menu; a Style / Values tab pair where the inspected thing has both; then collapsible sections of label-value rows.                                               |
| Data page     | Takes everything right of the rail; the graph stays mounted underneath. Title row ("Open as a new graph" or "Add to <project>"), a 240px Tables list on the left, the table view on the right, a one-line load report strip, and a footer with Direction, Cancel and Load. |
| No status bar | The retired shell had a 24px status bar and 280px panels. Ignore those numbers in `design/ui/mockups/system/VOCAB.md` section 3; its colors, type and control snippets still hold.                                                                                         |

## Every place and control that touches data today

### Start page (integration build, `graphty/src/workspace/start/`)

- Hero: "Analyze any network. Free and open source." with a live demo graph on the right.
- Launcher card: **Open a file** (big, primary; "CSV, GraphML, GEXF, Cytoscape, or a saved
  project"), **Open network data**, **Samples**, **New project**, and "Or drop a file anywhere. It
  never leaves your computer."
- Returning reader: "Welcome back." with Recent projects in the hero.
- Below the fold: Sample library (search, grid or list, a filter by field) and "Generate a
  graph".
- **Open network data** is a dialog listing NDEx, Neo4j and Web API as "on the way"; only "paste
  a web address of a graph file" works (`start/NetworkDataDialog.tsx`).
- A dropped file anywhere opens the Data page as a new graph.

### Data page (`graphty/src/workspace/data-page/DataPage.tsx`)

The loading screen. Opened by Open a file, a drop, the start page, or **Add data...** inside a
project.

- Title: "Open as a new graph", or "Add to <project>" when adding.
- **Tables list** (240px): each file, then its Nodes and Edges tables with row counts and a
  ready check. "+" adds a table: File..., From a URL..., Paste.... At most two files (a node
  table and an edge table).
- **Model strip**: "volunteers: 24 nodes, 63 edges", or `node (120) --ships_to (400)--> node` for
  tables the reader maps.
- **Each row is**: a node / an edge (segmented; disabled with "Set by the file" for graph
  formats).
- **File settings** popover: Format, Separator (CSV), Error limit.
- **Weight line** (edge tables): "Weight: confidence auto", or "Every edge counts 1. To weigh
  edges, give a number column the Weight role."
- **Column roles**: one select per column across the top -- Key, Name, From -> node, To -> node,
  Weight, Time, Edge id, Attribute -- with the column's type word under it (text, category, whole
  number, yes / no). Shown for every column, even when every guess is confident.
- **Sample grid**: every row of the table with a Line column.
- **Load report strip**: "24 node rows and 63 edge rows read; the load makes 24 nodes and 63
  edges." Unknown ends: Add / Leave out. Rows that could not be read, with a link to show them.
- **Footer**: Direction (As the file says / Directed / Undirected), "Import styles from the file"
  when the format carries styles, the reason Load is blocked, Cancel, Load.
- **Inside a project**, the same page adds a warning ("63 edges in this file are already in
  volunteers. Load adds them a second time.") and a second primary button, "Replace
  <file>", beside Load.
- Refusals show a red problem block with what happened and what to do.

### Data place (`graphty/src/workspace/data-place/DataPlace.tsx`, study build adds `Filters.tsx`)

- Graph name as the title.
- **Sources**: one row per load, "volunteers.graphml, 24 nodes, 63 edges", with Node table and
  Edge table children ("24 rows, 24 nodes"). Right-click: Edit source... (reopens the Data page).
  The "+" (File / URL / Paste) is coded but its commands are not registered, so it is not drawn
  in the integration build. The study build shows Sources without "+".
- **Filters** (study build only): "+" adds a step; the step editor opens in the inspector:
  Keep (an attribute's value), Attribute, "Is any of", value checkboxes with counts, "24 to 8
  nodes", Add step.
- **Attributes**: a find box, then Nodes and Edges groups. Each row: type glyph, name, and
  "Number, all have a value" / "Text, 70% have a value". Click opens the attribute in the
  inspector; right-click: Add label line, Show in table.
- Style notes from the file under Sources.

### Inspector, for data (`graphty/src/workspace/inspector/`)

- **Graph, Values tab**: Overview -- Nodes, Edges, Direction, Density, Components, Edges per node;
  then nodes joined to no other node, self-loops and repeated edges when nonzero.
- **Attribute**: Summary -- Table, Value type, Origin ("From the file"), Has a value (100%),
  Distinct values, and the top values with counts. Read-only: no way to change the type or role.
- **Node / edge, Values tab**: Summary and Memberships; read-only values.

### Graph place, toolbar and table dock

- **Find box** sits in the Graph place's top bar ("Find nodes, edges, values"), not on the
  toolbar. The study build also has a search button on the toolbar.
- **Toolbar** (study build): Analyze, Layout, 2D/3D, Legend, Table, Filter, Find. Quick actions
  (Ctrl+K) lists Add data... among its commands.
- **Table dock**: read-only rows; sort; choose columns; Export... from its options menu (always
  every column and every row of that table).
- **Main and project menus**: New, Open, Save, Save as, Close, Export, Settings. No Replace data
  command, no data step list.

## Gaps against the requirements

Requirement numbers are those in `design/data/data-management-requirements.md`. "Not drawn"
means no screen in either build shows it.

### First layer (primary)

| Requirement                           | Today                                                                                                                      | What a mock must add                                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 4 Load by any door                    | Drop, picker, URL, paste all exist; paste and URL only from the Tables "+".                                                | Nothing new; keep the "stays in this browser" line on each door.                                                          |
| 5 Clean file is one Enter             | Load is focused, but every column's select is always drawn.                                                                | The confident state: preview plus ONE mapping line with Change, focus on Load.                                            |
| 6 Dropped file goes where it belongs  | Studio found it broken; no "Read as..." offer.                                                                             | "Read as..." on an unrecognized file; recipe or project files route away from the Data page.                              |
| 7 Column roles at load                | Roles exist; no kind, no skip, no name column guess shown as such; all columns always shown.                               | Kind and Skip roles; per-column choices only for uncertain columns; flip nodes and edges in one action.                   |
| 8 Load report, only real problems     | Counts line always shown; unknown ends and refused rows only.                                                              | Repeated edges, repeated ids, decimal commas, refused row with number and reason, Skip these rows; nothing when clean.    |
| 9 Weight's meaning                    | "Weight: x auto" only.                                                                                                     | Distance / similarity / capacity / unknown on the weight line, never blocking.                                            |
| 10 What loaded, in plain words        | Inspector Overview has numbers, not a sentence; Data place shows counts per source.                                        | "3 separate groups; 214 with no links" and per-attribute fill, after load, in the Data place.                             |
| 12 One condition card: Select or Hide | Study build: filter steps in Data place plus inspector editor (Keep only). No Select verb, no "X of Y" on the card itself. | One card, conditions that all hold, Select or Hide, "140 of 900", reachable from the toolbar.                             |
| 13 Add a second file                  | "Add to <project>" page with Load and Replace; no verb choice, no added / updated / unchanged counts.                      | Three verbs (Add, Add columns to nodes, Replace), pre-chosen, with the match line before committing.                      |
| 14 Join a table onto nodes            | Not drawn.                                                                                                                 | Key suggestion, matched / not in graph / no value / repeated keys, "19 more match ignoring case [Use]".                   |
| 15 Node file plus edge file           | Works: two tables in the Tables list.                                                                                      | Nothing new.                                                                                                              |
| 16 Replace data, keep the analysis    | Only as a second button on the Add page; no report of what changed.                                                        | A visible Replace control; "+12 / -3 / 40 changed" and what no longer binds; one undo.                                    |
| 17 See and fix a column's type        | Type shown as a word under each role select and in the attribute inspector; cannot be changed; no count of misfits.        | Type with "1 blank" style misfit count, changeable in one action with a preview of what will not convert.                 |
| 18 Autosave and reopen                | Autosave and recovery offer exist.                                                                                         | Name anything that did not reload.                                                                                        |
| 19 Known file shapes map themselves   | Not drawn.                                                                                                                 | "Used your mapping from sept.csv. Change" line; new columns listed.                                                       |
| 20 Export everything                  | Export dialog and table Export....                                                                                         | Loss warning before writing (export is mostly out of scope for this round).                                               |
| 21 Open a sample                      | Start page Samples and Generate.                                                                                           | Nothing new.                                                                                                              |
| 22 Apply a recipe                     | Not drawn. The adversarial review says retier it as secondary.                                                             | Defer.                                                                                                                    |
| 23 to 27 Server sources               | Dialog says "on the way".                                                                                                  | Source picker, descriptor-drawn fields, Test, browse or query, Expand / Collapse on a node, Load more, approve on reopen. |

### One step in (secondary), and where it would live

| Requirement                 | Natural home in today's frame                                                  |
| --------------------------- | ------------------------------------------------------------------------------ |
| 28 Ordered filter steps     | Data place Filters section (exists in the study build)                         |
| 29 Sources list per load    | Data place Sources (one row today; needs one per load and a "+" that is drawn) |
| 30 Cleanup offers           | Data page load report strip, only when found                                   |
| 34 Saved filters and sets   | Data place, beside Filters                                                     |
| 35 Export a scope           | Export dialog and table dock options                                           |
| 36 Data step list           | Not placed yet: Data place section or a history popover from the header undo   |
| 37 Rename, delete, fill     | Attribute row menu and attribute inspector                                     |
| 38 Hide and reorder columns | Table dock Columns chooser (exists, not remembered)                            |
| 39 Change a role after load | Attribute inspector (studio: 6 of 7 readers went to the column first)          |
| 40 Edit a cell              | Table dock (read-only today)                                                   |
| 43 Gene list to STRING      | Open network data dialog                                                       |
| 48 Refresh a source load    | Source row menu (review says first layer for server readers)                   |

### What the adversarial priority review moves

`tmp/data-priority-review/` (competitor check and studio evidence) recommends, for this round:

- Tolerant number loading from 17 ("N/A" becomes a blank with a count) belongs in the first
  build, and the type shows on the column itself.
- The condition card needs an entry point that is always visible (the toolbar's Filter button
  in the study build is that entry).
- Expand (25) before Load more (26) for server readers; Refresh (48) beside reopen approval (27).
- Replace (16), Add a second file (13), dropped-file routing (6), the name column in 7 and column
  types (17) are ranked too low by observed behavior: the studio watched readers need them.
- Apply a recipe (22) is secondary.

The requirements document no longer names build slices; use its tier order with these moves.

## Constraints every mock must respect

1. **Look like the study build**, dark theme first: `#2b2b2b`-ish panels, a light canvas, compact
   12-13px text, ControlSection headers with a chevron, tree rows with a glyph, a name and a
   quiet second line. Light theme is a later pass.
2. **Panel widths 240** for the left panel and the inspector; the canvas keeps about 904px.
   A design that needs more room says so and shows the panel resized, never wider by default.
3. **One home per capability.** Loading and mapping happen on the Data page; what is loaded
   lives in the Data place; one thing's details live in the inspector; rows live in the table
   dock; the toolbar holds canvas-wide verbs. A new control goes in one of these.
4. **The Data page is a full page, not a dialog.** It keeps the rail visible and returns with
   Esc or Cancel. A second file inside a project uses this page, not a new surface.
5. **The toolbar is full.** Seven buttons in the study build. A data verb that wants the toolbar
   replaces or joins an existing button (the Filter button can open the condition card).
6. **The first screen shows** no later-tier control, no default-valued setting (Direction "As the
   file says", Error limit), no zero-count line, no internal word (no "draft", "mapping table",
   "recipe command", "source descriptor").
7. **The app words, the element counts.** Every number on a mock is something graphty-element
   returns (counts, `{ code, params }`); the mock decides the words and the order. A mock that
   needs the app to compute something is flagging an element gap -- name it in the note.
8. **Fixtures**: use the study's real files where they exist (`volunteers.graphml`, 24 nodes,
   63 edges; attributes hours, id, name, phone, role, trained) or the requirement test fixtures
   (`bait_prey.tsv`, `suppliers.csv` plus `ships_to.csv`, a 340-row symbol table).
   `design/ui/mockups/system/FIXTURES.md` covers the older cat social network.
9. **Artboard format**: one self-contained `.dc.html` per screen, 1440 x 900, inline styles and
   inline SVG icons, plain ASCII (`design/ui/mockups/system/ARTBOARD-FORMAT.md`).
10. **Row shapes**: use the closed set of row types in `design/ui/mockups/system/COMPACTION-1.6.md`
    (one 24px field with its label inside, not label above field above help line).

## Components to reuse (compact-mantine)

All in `compact-mantine/src/components/`:

- **Places and panels**: `ControlSection` (collapsible section with header actions), `Tree`
  (Sources, Filters, Attributes), `SearchInput` (find attribute), `ContextMenu` (row menus),
  `ResizeHandle`.
- **Rows**: `DataRow` (label-value, inspector Overview), `FieldRow`, `ToggleRow`, `ActionRow`,
  `CompoundRow`, `ChartRow` (value bars), `ProseBlock` (one sentence of plain words).
- **Inputs**: `ComboInput`, `SegmentedControl`, Mantine `Select`, `NumberInput`, `Checkbox`,
  `VariablePill`.
- **Overlays**: `Popout` family (pop-out panels anchored to a row, as the column role pop-out),
  `ModalFooter`, `Toast`, `MenuCheckItem`.
- **Table**: `DataTable` (the dock's grid and the Data page's sample grid).
- **Shell**: `Toolbar`, `ToolButton`, `ToolGroup`, `NavRail`, `QuickActions`.
- **Buttons**: `SplitButton` (Load with a menu: Add / Add columns / Replace is a candidate),
  `ToggleIconButton`.

Earlier data artboards worth mining for parts, all retired-shell style, so restyle them:
`design/ui/mockups/artboards/TableJoin.dc.html` (join preview), `ColumnRolePopout.dc.html`,
`DataPanelLoaded.dc.html`, `DataTableDrawer.dc.html`, `FilterBuilderExpert.dc.html`,
`FilterExpression.dc.html`, `CategoryTable.dc.html`.

## Real screenshots of each screen

All 1440 x 900, dark, from the study build. Root:
`/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/r1/pilot/`

| Screen                                          | Best shot                             |
| ----------------------------------------------- | ------------------------------------- |
| Data page, empty ("Drop a file here")           | `T48A/e3c-detour-start/02.png`        |
| Data page, graph file loaded, new graph         | `T38A/detour-data/03.png`             |
| Data page, adding to a project (Load / Replace) | `T48A/e3c-detour-start/43.png`        |
| Data place with an attribute open               | `T38A/detour-data/10.png`             |
| Data place, filter step editor in the inspector | `T38A/detour-data/16.png`             |
| Filtered graph, filter step on                  | `T38A/detour-data/17.png` to `20.png` |
| Table dock open with a selection                | `T38A/detour-data/31.png`, `35.png`   |
| Graph place and Values inspector                | `T38A/detour-data/04.png`             |
| Old start page (superseded)                     | `T48A/e3c-detour-start/01.png`        |

Integration build pictures (light theme, Storybook baselines, 2400 x 1800 at scale 2) in
`/home/apowers/Projects/graphty-monorepo/.worktrees/design-data-mocks/visual-baselines/graphty/`:
`workspace-data-page--*.png` (17 Data page states: empty, edge-list, role-menu, file-settings,
unmatched-rows, add-to-project, every refusal), `workspace-data-place--*.png`,
`workspace-table-dock--*.png`, `workspace-frame--data-page.light.png`. The start-screen baselines
there still show the older start page; the current landing page is
`/home/apowers/Projects/graphty-monorepo/tmp/landing-empty.png`.

## Element gaps a mock will hit

Each of these shows up as a comment in the app or a missing call, and the mock should mark the
fact as "needs graphty-element":

- The role list is the app's own copy (`data-page/choices.ts`), not the element's.
- The element names no default weight column (the "use it as the weight?" offer cannot be drawn
  from real data yet).
- The load report cannot list the nodes and edges it will make.
- Export cannot be limited to visible columns or a group.
- No call to change a column's measurement or type, no join, no Replace report, no step list.
- Sources has no Rename door, and the "+" commands are unregistered.
