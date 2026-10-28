# Data mocks, round 2: the app as it is today, and the frame every mock must fit

What the graphty app does with data today, where it falls short, and the places, sizes and
components a round 2 data mock must respect. Read this before drawing a data screen. Round 2
converges on one structure (option B's look, a data configuration panel that owns all data
configuration, a view-only table), so this brief also says which existing surface each job
belongs to under that structure.

See `design/data/data-management-requirements.md` for the requirements and their ranks.

## Which build to draw from

- **The study build** (worktree `.worktrees/design-studio-tier3`, app 0.8.68) is the newest look
  and the one readers were tested on. It has the Data place's Filters section with a step editor
  in the inspector, Edit source... and Replace with file... on a source's menu, a Notes place, and
  a toolbar with Table, Filters and Find buttons. Every real screenshot below comes from it.
- **The integration build** (this worktree, app 0.8.90) has none of those yet, but has the newer
  start page.

**Draw on the study build's frame and the integration build's start page.**

## Words the app already uses

- **Edges, never links.** Every screen says "Nodes" and "Edges": "34 nodes, 78 edges", "Node
  table", "Edge table", the table dock's Nodes and Edges tabs, the Export dialog's Table
  Nodes / Edges. "Link" appears only inside the algorithm name "Link prediction".
- **Attribute** is the word for a column after loading (Data place "Attributes", inspector kind
  word "Attribute"). On the Data page, before loading, the word is "column". Keep that split.
- **Source** is one load (a file, a URL, a paste). **Filters** and **step** are the filter words.
- Menu verbs today: New project, Open, Save, Save as..., Export..., Add data..., Close project,
  Table, Filters.

## The frame (1440 x 900, dark first)

| Region       | Size and place                                                                                                                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header       | 40px, full width. Main menu, project name (renamable), undo, redo, "Local only" lock. A filter chip appears here while a filter step is on.                                                                                                   |
| Rail         | About 56px, left. Graph, Data, Notes on top; Settings at the foot. Icon with a word under it.                                                                                                                                                 |
| Left panel   | 240px default, resizable 240 to 480. The Graph place or the Data place.                                                                                                                                                                       |
| Canvas       | About 904px wide at default widths, light even in dark mode. Floating toolbar centered 12px above the foot, about 48px high. Notices sit above the toolbar.                                                                                   |
| Toolbar      | Analyze, Layout, 2D/3D, Legend, Table, Filters, Find. Full: a new data verb replaces or joins one of these, never adds an eighth.                                                                                                             |
| Table dock   | Along the canvas foot, inside the canvas column only. 240px default, 120 to 480. Tabs Nodes, Edges and one per group result; row count ("12 of 41 edges" under a filter); "Columns: N of M"; an options menu holding only Export...; close X. |
| Inspector    | 240px default, 240 to 480, right. Title row (icon, name, kind word, "..."), Style / Values tabs where both apply, then collapsible sections of label-value rows.                                                                              |
| Data page    | Everything right of the rail, graph still mounted underneath. Title row, 240px Tables list, the table preview, a load report strip, a footer with Direction, Cancel, Load.                                                                    |
| No statusbar | The retired shell's 24px status bar and 280px panels are gone; ignore those numbers in `design/ui/mockups/system/VOCAB.md` section 3 (its colors, type and control snippets still hold).                                                      |

## Every place and control that touches data today

### Start page (integration build, `graphty/src/workspace/start/`)

- Hero with a live demo graph. Launcher: **Open a file** (CSV, GraphML, GEXF, Cytoscape, or a
  saved project), **Open network data**, **Samples**, **New project**; "Or drop a file anywhere".
- **Open network data** (`start/NetworkDataDialog.tsx`) lists NDEx, Neo4j and Web API as "on the
  way"; only "paste a web address of a graph file" works. No Test, no preview, no expand.
- Sample library and Generate a graph below the fold.

### Data page (`data-page/DataPage.tsx`) -- the loading screen

Opened by Open a file, a drop, the start page, **Add data...** (Quick actions) and a source's
Edit source....

- Title "Open as a new graph" or "Add to <project>".
- **Tables list** (240px): each file and its Nodes / Edges tables with row counts; "+" adds File...,
  From a URL..., Paste.... At most one node table and one edge table.
- **Model strip**: "volunteers: 24 nodes, 63 edges", or `node (120) --ships_to (400)--> node`.
- **"Each row is"**: a node / an edge (segmented; disabled "Set by the file" for graph formats).
- **File settings** popover: Format, Separator, Error limit.
- **Column roles**: one select per column across the top (Key, Name, From -> node, To -> node,
  Weight, Time, Edge id, Attribute) with a type word under it. Always drawn for every column.
  This header row is the closest thing today to round 2's compact property rows, but it lives on
  the preview grid; round 2 moves configuration into panel rows and keeps the grid for viewing.
- **Weight line** on edge tables ("Weight: confidence auto" or "Every edge counts 1...").
  A sentence today; round 2 makes it a property row.
- **Sample grid**: every row with a Line column.
- **Load report strip**: a counts sentence, unknown ends (Add / Leave out), unreadable rows.
  Sentences today; round 2 makes them warning rows with counts.
- **Footer**: Direction (As the file says / Directed / Undirected), "Import styles from the file",
  the reason Load is blocked, Cancel, Load. Inside a project, a duplicate warning and a second
  primary button "Replace <file>".

### Data place (`data-place/DataPlace.tsx`; study build adds `Filters.tsx`, `SourceValues.tsx`)

The left-panel place for "what is the data and how is it read". This is round 2's **data
configuration panel**; it exists, it is just thin.

- Graph name as the title.
- **Sources**: one row per load ("volunteers.graphml / 24 nodes, 63 edges"), Node table and Edge
  table children ("24 rows, 24 nodes"). Clicking a source opens it in the inspector: Loaded
  (Nodes, Edges) and Left out sections. Menu: **Edit source...** (reopens the Data page) and
  **Replace with file...** -- offered only while the graph has exactly one source of one table.
  No "+" is drawn (its commands exist but are not registered).
- **Filters** (study build): "+" adds a step; the editor opens in the inspector: Keep (an
  attribute's value / the largest component / the neighbors of the selection), Attribute, "Is any
  of" with value checkboxes and counts, "24 to 8 nodes", Add step. Each step has an on/off
  checkbox. Header chip "Filter on: 9 of 22 nodes, 14 edges". No Select verb, no saved sets, no
  numeric range or text condition, no AND/OR beyond stacking steps.
- **Attributes**: find box, then Nodes and Edges groups. Row: type glyph, name, quiet line
  "Number, all have a value" / "Text, 70% have a value". Click opens it in the inspector;
  menu: Add label line, Show in table. **No rename, retype, role change, delete or warning count.**

### Inspector, for data (`inspector/`)

- **Graph, Values tab**: Overview (Nodes, Edges, Direction, Density, Components, Edges per node);
  isolated nodes, self-loops and repeated edges only when nonzero. Already compact label-value
  rows -- the model round 2 wants everywhere.
- **Attribute**: Summary (Table, Value type, Origin, Has a value, Distinct values, top values with
  counts). **Read-only.**
- **Source**: Loaded and Left out sections (study build).
- **Filter step editor** (study build): see Filters above.
- **Node / edge, Values tab**: Summary and Memberships, read-only values.

### Graph place, toolbar, table dock, menus

- **Find** sits in the Graph place's top bar ("Find nodes, edges, values"); the study build adds a
  Find button on the toolbar. Find selects; it does not filter.
- **Toolbar Filters** opens Data > Filters with a new step (a door, not a second home).
- **Table dock**: read-only rows, sort, Columns chooser, Export... in its options menu (every
  column and every row of that table). Under round 2's rule the dock is view-only: its Export...
  should become the common Export dialog opened on Data, not a separate export.
- **Export dialog** (`export/ExportDialog.tsx`, main menu Export...): "What to export" Image or
  Data; Data has Format, Table (Nodes / Edges, CSV only), a preview, and loss warnings ("<format>
  cannot hold everything"). This is the common Save/Export that owner point 9 asks to reuse. No
  scope choice (filtered / selected / all) yet.
- **Main menu**: New, Open, Save, Save as..., Close, Export..., Settings. No Replace data, no
  Refresh, no Join, no history of data steps (Undo only).

## Gaps against the owner's round 2 rules

| Job                                | Today                                                                                                        | Where it belongs in round 2's structure                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean file opens in one Enter      | Every column's role select always drawn; counts and weight as sentences.                                     | Data page: preview grid (view only) plus a compact property panel; only uncertain columns show a control; focus on Load.                                      |
| Column type, role, name            | Set only on the Data page before load; read-only after.                                                      | Data place Attributes row: right-click / "..." for Type, Role, Rename; the inspector's Attribute summary becomes editable rows. No special flow.              |
| Warnings                           | Load report sentences on the Data page; nothing after load.                                                  | A Warnings section in the Data place (and the same rows on the Data page before load), one row per kind with a count and an action; absent when clean.        |
| Join a table onto nodes            | Not possible.                                                                                                | Data place Sources "+" > Join a table..., then the Data page in a join mode (key match rows: matched, not in graph, no value); result is a source row.        |
| Second file into a graph           | "Add to <project>" page: Load (adds) or Replace; no join; no match counts.                                   | Same Data page; default verb is Join when the ids match, chosen from match counts; Add and Replace stay as the other choices.                                 |
| Replace / newer copy, keep my work | Replace with file... (single-source graphs only) and the "Replace <file>" button; no report of what changed. | Manual, on the source's menu: Replace with file... / Refresh from source, with keep styles and analysis on by default and a +/-/changed count before commit.  |
| Filter                             | Steps in Data > Filters, one kind of condition per step, editor in the inspector.                            | Stays in Data > Filters (decided studio home); round 2 adds conditions (range, text, missing), Select vs Hide, saved sets. Entry: toolbar Filters, row menus. |
| Find                               | Graph place top bar and toolbar; selects matches.                                                            | Unchanged home. A precise use-case definition is needed before drawing anything new here.                                                                     |
| Export data                        | Export dialog (Data) and the table's own Export....                                                          | The Export dialog only; the table's menu item opens it on Data with the showing table. Add a scope row (all / filtered / selected).                           |
| Server sources                     | Dialog "on the way".                                                                                         | Open network data: source picker, property rows per source, Test that returns a live preview of rows or nodes, then Load; Expand / Load more on the canvas.   |
| Second source shown                | One source row; "+" unregistered.                                                                            | Sources list with one row per load and a drawn "+" (File, URL, Paste, Network data, Join a table).                                                            |

## Constraints every mock must respect

1. **Look like the study build**, dark first: about `#2b2b2b` panels, a light canvas, 12-13px
   text, ControlSection headers with a chevron and header actions ("+", "..."), tree rows with a
   glyph, a name and a quiet second line.
2. **Panels are 240px.** A design that needs more draws the panel resized, never wider by default.
   The canvas keeps about 904px.
3. **One home per capability.** Loading and mapping on the Data page; everything about the loaded
   data (sources, attributes and their type / role / name, warnings, joins, filters) in the Data
   place, with details in the inspector; rows in the table dock, **view only**; canvas-wide verbs
   on the toolbar; saving and exporting in the main menu's Save / Export.
4. **The table dock configures nothing.** No conditions, joins, export controls, column fixes or
   warnings inside it. Sort, choose columns and read are all it does.
5. **No sentences as UI.** Property rows (label left, value or control right), chips, counts,
   status icons, dropdowns, context menus, pop-overs for advanced settings, "+" on section
   headers. One quiet line per tree row is the existing pattern and stays.
6. **The Data page is a full page, not a dialog.** Rail stays visible; Esc or Cancel returns. A
   second file, a join and a replace use this page, not a new surface.
7. **The toolbar is full** (seven buttons).
8. **The first screen shows** no later-tier control, no default-valued setting (Direction "As the
   file says", Error limit), no zero-count line, no internal word.
9. **The app words, the element counts.** Every number on a mock is something graphty-element
   returns; a mock that needs the app to compute something names the element gap.
10. **Fixtures**: `volunteers.graphml` (24 nodes, 63 edges; hours, id, name, phone, role,
    trained), `bait_prey.tsv`, `suppliers.csv` plus `ships_to.csv`, a 340-row gene symbol table.
11. **Artboards**: one self-contained `.html` per screen, 1440 x 900, inline styles and SVG, plain
    ASCII (`design/ui/mockups/system/ARTBOARD-FORMAT.md`), row shapes from
    `design/ui/mockups/system/COMPACTION-1.6.md` (one 24px field with its label inside).

## Components to reuse (compact-mantine, `compact-mantine/src/components/`)

- **Panels**: `ControlSection` (header actions "+" and "...", `summary`), `Tree`, `SearchInput`,
  `ContextMenu`, `ResizeHandle`.
- **Property rows**: `DataRow` (label-value, the inspector Overview), `FieldRow`, `ToggleRow`,
  `ActionRow`, `CompoundRow`, `ChartRow` (value bars). Avoid `ProseBlock` this round.
- **Inputs**: `ComboInput`, `SegmentedControl`, Mantine `Select`, `NumberInput`, `Checkbox`,
  `VariablePill`.
- **Overlays**: `Popout` family (anchored to a row: the advanced settings pop-over), `ModalFooter`,
  `Toast`, `MenuCheckItem`.
- **Table**: `DataTable` (the dock and the Data page preview).
- **Shell**: `Toolbar`, `ToolButton`, `ToolGroup`, `NavRail`, `QuickActions`.
- **Buttons**: `SplitButton` (Load with Join / Add / Replace in its menu), `ToggleIconButton`.

Parts worth mining (retired-shell style, restyle them): `design/ui/mockups/artboards/TableJoin.dc.html`
(join match preview), `ColumnRolePopout.dc.html` (per-column pop-over), `DataPanelLoaded.dc.html`,
`FilterBuilderExpert.dc.html`, `FilterExpression.dc.html`. Round 1 option B
(`design/ui/mockups/data/round-1/B/`) is the look to start from: its column header (type icon,
name, role, fullness bar) is good on the Data page preview; its summary sentence, "things to
check" lines and condition card above the table are what the owner rejected.

## Real screenshots

All 1440 x 900, dark, study build. Root:
`/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tier3/rounds/r1/pilot/`

| Screen                                                                       | Best shot                             |
| ---------------------------------------------------------------------------- | ------------------------------------- |
| Data page, empty                                                             | `T48A/e3c-detour-start/02.png`        |
| Data page, graph file loaded                                                 | `T38A/detour-data/03.png`             |
| Data page, adding to a project (Load / Replace)                              | `T48A/e3c-detour-start/43.png`        |
| Data place (Sources, Filters, Attributes) with an attribute in the inspector | `T38A/detour-data/10.png`             |
| Filter step editor in the inspector                                          | `T38A/detour-data/16.png`             |
| Filtered graph, header chip                                                  | `T38A/detour-data/17.png` to `20.png` |
| Table dock open                                                              | `T38A/detour-data/31.png`, `35.png`   |
| Graph place and graph Values inspector                                       | `T38A/detour-data/04.png`             |

Integration build Storybook baselines (dark and light, 2400 x 1800):
`/home/apowers/Projects/graphty-monorepo/.worktrees/design-data-mocks/visual-baselines/graphty/`
`workspace-data-page--*.png` (empty, edge list, role menu, file settings, unmatched rows, add to
project, refusals), `workspace-data-place--*.png` (attribute menu, attribute picked, graph file,
many attributes, nothing loaded), `workspace-frame--table-open.*.png`, `workspace-export--data.*.png`. Current start page: `/home/apowers/Projects/graphty-monorepo/tmp/landing-empty.png`.

## Element gaps a mock will hit

Mark each as "needs graphty-element" where drawn:

- The role list is the app's own copy (`data-page/choices.ts`), not the element's.
- No call to change a column's type, role or name after loading, and no per-type count of values
  that would not convert.
- No join, and no match counts (matched / not in graph / no value / matches ignoring case).
- No Replace or Refresh difference (+added / -removed / changed, styles and runs that no longer
  apply), and Replace is limited to single-source graphs.
- The load report cannot list the nodes and edges it will make; no warnings after load.
- Export cannot be limited to the filtered or selected rows or the visible columns.
- No network source descriptors with a Test that returns preview rows; no Expand or Load more.
- Filter steps hold one kind of condition each; no range, text match, missing value, Select verb
  or saved set.
- Sources has no Rename and its "+" commands are unregistered.
