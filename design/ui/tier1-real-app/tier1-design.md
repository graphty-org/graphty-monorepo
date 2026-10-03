# Tier 1 of the graphty app: the design to build

This page is the design for the first real build of the graphty app: the path a first-time user
takes from an empty app to a saved, exported, reopened project. It is cut from the refined B
design, which eight rounds of simulated user studies shaped, and it states that design as it stands
after round 8's decisions. Every screen, control, word and state a builder needs for tier 1 is
here; everything else in refined B is listed in "Not in tier 1" and left out of the build.

Sources, read-only, on the design branch (`.worktrees/ux-storyboards-mocks-and-study/design/ui/`):

- the full design: `prototype/study/structure-comparison/structure-b-refined.md` (version 5;
  cited below as "spec" with a section number)
- the clickable mock: `prototype/app-b/`, served at http://dev.ato.ms:9825/app-b/ ; a route below
  is written `#/<section>/<state>` and opens at that address plus the route; `#/map` lists every
  state
- the decisions: `prototype/study/decision-log.md`, rounds 7 and 8
- the owner's decisions: `prototype/owner-feedback.md`
- what graphty-element must add: `prototype/study/structure-comparison/element-requirements-5.md`

**Precedence.** Where round 7 or round 8 decided something the spec text still says otherwise,
the round decision wins, and this page states the decided version. The overrides are collected in
section 3. The mock is ahead of the spec on most of them but not all (the start screen's sample
text still promises worked examples, for one); where the mock and this page disagree, this page
wins. This page also states what ships at the first release: where a piece of graphty-element is
not built yet, the screen it would serve is marked **[not at first release]** with what shows
instead. `plan.md` builds this page and does not override it.

**Two project rules govern every line below** (`CLAUDE.md`): graphty-element owns every piece
of graph logic and the app only shows what the element publishes, never working around it; and
every look on the canvas is a style layer handed to the element, never a mesh or material edit.
Controls are compact-mantine components only. Where tier 1 needs something the element does not
have, this page marks it **[element]**, and section 8 lists them all.

---

## 1. What tier 1 is

The owner's priority (2026-10-02, `owner-feedback.md`, "Priorities: the average first-time user
first"): tier 1 is a first-time user's core path, tested from an empty app with no project open.
These are its tasks, in the order a first session meets them, with the round 8 study task that
measures each:

| #   | Tier 1 task                                                    | Round 8 task | Round 8 result                 |
| --- | -------------------------------------------------------------- | ------------ | ------------------------------ |
| T1  | First launch and the usage-data question                       | r8-t15       | 100%                           |
| T2  | Pick a sample and say what it is                               | r8-t02       | 100%                           |
| T3  | Bring in your own graph file and check it all arrived          | r8-t03       | 100% (graded up to Load only)  |
| T4  | Bring in two spreadsheets (nodes and edges) as one network     | r8-t04       | 100% (graded up to Load only)  |
| T5  | A file that will not read                                      | r8-t05       | 100% (on a refusal the element cannot yet produce) |
| T6  | Read what loaded: size, ties, reachability, recorded facts     | r8-t06       | 100%                           |
| T7  | Run an analysis that ranks nodes, read the top three           | r8-t07       | 100%                           |
| T8  | Run an analysis that finds groups, read them                   | r8-t08       | 100%                           |
| T9  | Color or size by a value or a result                           | r8-t09       | not measured (the mock never applied the choice) |
| T10 | Labels from an attribute                                       | r8-t10       | 42% (fail)                     |
| T11 | A readable layout                                              | r8-t11       | 100%                           |
| T12 | Find a node by name, read about it, see its neighbors          | r8-t12       | 0% (fail)                      |
| T13 | Save a picture with its key, and the numbers for a spreadsheet | r8-t13       | 100%                           |
| T14 | Save the project under your own name and reopen it             | r8-t14       | 100%                           |
| T15 | One whole first session, T2 through T13 chained                | r8-t01       | 0% (fail: the names step, a design defect, in 19 of 21; plus mock defects) |

All results are from simulated participants. The failures each have a round 8 decision
(section 3), and those decisions are what this build ships. They are untested: the Label "+" fix,
the neighbor list and the find box never ran on working wiring, and they are the first things the
next round tests. T3 and T4 were graded at the Load button (the mock's reading card never
finished), so the path after Load is unmeasured. T5 passed on a mock refusal with line numbers,
which graphty-element does not produce yet (section 2.10).

---

## 2. The shell

The frame at 1366 x 768 and up: a **header** across the top; under it, left to right, the
**rail**, the **left panel**, the **canvas** with the **toolbar** floating at its bottom center,
and the **inspector** on the right; the **table dock** opens along the bottom of the canvas. Two
full-workspace pages replace the panels while the header and rail stay: the **Data page** and
(outside a project) the **start screen**, which replaces everything.

Route of the whole frame at rest: `#/graph-place/karate` (a sample just opened, nothing run).

### 2.1 Header

Left to right (spec 9):

- **Main menu** button (32 px, immediately left of the project name).
- **Project name**, the only bold title; click opens the project-name menu; double-click or F2
  renames it.
- **Undo** and **Redo** buttons (Mod+Z, Shift+Mod+Z). Every tier 1 change is one undo step in
  graphty-element's history (`session.undo`); the app keeps no history of its own.
- **Privacy chip**: "Local only", or "Usage data on, content masked"; opens Settings > Privacy.

Not drawn in tier 1: the filter chip (filters are tier 2).

**Main menu** (spec 10.1, cut to tier 1): New project; Open recent >; the File list (Open project
or file... Mod+O, Save Mod+S, Export... Mod+E); Settings... Mod+,; Keyboard shortcuts ?;
Help > (Documentation, Report a problem, About). Route: `#/main-menu/open`.

**Project-name menu** (spec 10.2): Rename F2 | the File list, word for word the same as the main
menu's | Save as... Shift+Mod+S, Close project. Route: `#/project-menu/open`.

The File list's intake is labeled **Open project or file...**, tooltip "A data, recipe or style
file is added to this project; a project file opens in its place." (round 7). In tier 1 a recipe
or style file is refused with one problem block, "Recipes and style files are not supported yet."

### 2.2 Rail

Tier 1 draws two places: **Graph** (the default; the paint tree) and **Data** (Sources and
Attributes). Views, Notes and Assistant are not drawn until they are built: a disabled rail button
would promise a place that does not exist (studio decision, reversible). Rail buttons are icons
with the shared tooltip; they have no hotkeys.

### 2.3 Toolbar

Bottom center of the canvas, five 32 px icon buttons, **icons only, tooltips after a hover
delay** (owner; 500 ms is a studio number, and PR #409's 1000 ms competes with it): **Analyze | Layout, View, Legend | Quick actions** (spec 2.3).

| Button        | Icon                                           | Click                                                                                                                                           | Tooltip              |
| ------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Analyze       | flask                                          | opens the Analyze popover (section 5.T7). Shift+A also spins the camera on a focused canvas today **[element: camera keys ignore modified keys]**  | Analyze Shift+A      |
| Layout        | move (arranging; never play or pause, round 8) | opens the Layout popover: a Motion line ("Running", "Paused", "Settled" with a Pause or Resume button) **[not at first release: the element does not report motion]**, then the graph's Layout group (round 7) | Layout               |
| View          | cube in 3D, square in 2D                       | opens the View flyout                                                                                                                           | View                 |
| Legend        | list                                           | shows or hides the legend card; pressed while shown                                                                                             | Legend L             |
| Quick actions | command                                        | opens the palette                                                                                                                               | Quick actions Ctrl+K |

- **View flyout**, tier 1: Fit (0); Frame selection (F); in 3D the standard views Front (1),
  Side (3), Top (7), Isometric; in 2D Zoom in and Zoom out; **Switch to 2D 5** or **Switch to 3D
  5**. Your views, Save view, Enter VR and Enter AR are not in tier 1. Routes: `#/view-flyout/3d`,
  `#/view-flyout/2d`.
- **Quick actions** lists every tier 1 command by name, grouped by its home (Go to, Graph tree,
  Analyze, Data, View, Layout, Selection, Project, Settings and help), and is how a keyboard user
  reaches Add data with nothing drawn. Typing a node's name offers one handoff, "Find '<text>' in
  the graph", which moves to the tree's find box. Route: `#/commands-and-search/quick-actions`.
- **States.** Nothing drawn: Analyze, Layout, View and Legend disabled with "Nothing is drawn";
  Quick actions stays live (`#/toolbar/nothing-drawn`). While an export waits for the layout to
  settle, Layout is disabled with "Waiting to capture the image" (`#/toolbar/export-waiting`).
  Open popover = gray fill; blue = Legend on. Routes: `#/toolbar/at-rest`,
  `#/toolbar/tooltip-hover`, `#/toolbar/layout-open`, `#/toolbar/legend-off`.

**The selection bar** attaches directly above the toolbar while a node is selected, raised by the
one place a selection is set (canvas click, Shift+Arrow, the table, find). Tier 1 holds one verb:
**Neighborhood** (concentric circles, key G), which selects the node's one-hop neighbors and lands
on the neighborhood list (section 5.T12). Path between, Create set, Hide on canvas and Add note
are tier 2 and not drawn. Route: `#/selection-bar/one-node`.

**Keys** (spec 2.3): graphty-element owns W A S D Q E, the arrows, = and - on a focused canvas;
app keys never use them. **Shift+Arrow** walks to the next node and announces it ("Valjean, 36
connections"); plain arrows orbit in 3D and pan in 2D (owner). **[not at first release; element:
the walk, and camera keys that ignore keys pressed with Shift. Today the camera reads the key
without its modifiers (`cameras/OrbitInputController.ts:52`), so Shift+ArrowLeft would both walk
and orbit.]** Until then a keyboard user reaches a node through the find box. Esc closes the innermost open thing
first, then clears the selection and leaves the graph's panel open (round 7, shared rule 2).

### 2.4 Canvas

The drawing, the **legend card** (top left), one notice slot and the state cards. **The canvas has
no buttons** (spec 9).

- **Legend card**: read from graphty-element's `styles.legend()`; read-only. Shown by default,
  remembered per project, shown or hidden only by the Legend button and L. Each section is titled
  "<Property>: <row>" ("Color: PageRank", "Size: Degree"). When a row bound to a run paints, the
  card adds **one plain sentence** saying what a higher value means on this drawing (round 8;
  e.g. "Darker means more central.") **[element: `LegendBlock.reading`, composed by the element as a
  keyed message `{ code, params, text }`]**, names every channel in use including size, and states
  the bound size range in the element's size units ("1 to 3"; never "px": node size is unitless and
  drawn in perspective). It lists only what paints. With nothing bound it reads nothing extra.
- **State cards**, one pattern (icon, title, one sentence, at most two buttons):
    - Loading: one progress bar with a running count, "Reading miserables.gexf: 77 nodes, 120
      edges...", and Cancel (`#/canvas-and-states/loading`). **[not at first release: Cancel waits
      for the element's load cancel (#296), and the running count for its progress event; until
      then the card shows the file name and an indeterminate bar, and Close project and Esc stay
      live.]**
    - Empty: "No nodes to draw", [Add data...] (`#/canvas-and-states/empty`).
    - Load refused, too large: one sentence with the limits, [Choose another file...] and a Details
      link (`#/canvas-and-states/refused-too-large`).
    - GPU lost: "The graphics device was lost. The rows, table and inspector are unchanged."
      [Restart viewer] (`#/canvas-and-states/gpu-lost`). **[not at first release: the element does
      not report a lost device yet.]**
- **Notices** (spec 2.5): one at a time, centered 8 px above the lowest bar, 6 s, paused on hover,
  one message and at most one action (Undo). A started run shows no notice.
- Opens in 3D (graphty-element's default) and reopens in the mode the project saved.

### 2.5 Left panel: the Graph place (the paint tree)

Top to bottom (spec 3): the **graph title line** (a quiet "Graph" prefix and the graph's name;
the Graphs switcher's menu is not in tier 1, because a tier 1 project holds one graph); the
**treebar** with the find box; the **tree**; one **footer line**.

- **The find box** is the one find over the whole project (round 8; section 5.T12). Placeholder
  "Find nodes, edges, values"; "/" focuses it.
- **The tree's central rule** (spec 3.1): every row can paint the graph; top to bottom is paint
  order and a higher row wins property by property. **Selection** is pinned at the top,
  **Everything** at the bottom. A new run lands at the top, under Selection, **visible and
  listed** (round 8).
- **Row kinds in tier 1** (spec 3.2): Selection (dashed box), Run (icon by what it produced: bar
  chart for a measure run, layers for a group run), Measure (`#`, or the run's measure icon), Group
  (filled circle in its color), Everything (base-layer glyph). A measure run with one value per
  node is a single row ("PageRank"). A group run is a run row with its groups as children,
  collapsed when there are many.
- **A row, left to right** (spec 3.3): disclosure triangle (parents), kind slot (type icon, or
  spinner while running, warning when partial, error when failed), swatch (a ramp for a measure, a
  color for a group), name, then right-aligned slots: member count, and the eye. The only line
  under a row is a running progress bar; every other state is the kind-slot icon with its sentence
  in the tooltip and the inspector's state bar.
- **The eye** shows or hides that row's paint; it never removes nodes from the layout or changes
  what is computed. Undoable, saved. A hide or show repaints the canvas and the legend at once
  (round 8 fix).
- **Clicking a row** selects it and shows it in the inspector; Space toggles its eye; Delete
  deletes it with an Undo notice ("Deleted Louvain and 6 groups. Undo").
- **Footer line**, one message: with no graph, "Add data to start"; with a graph and nothing run,
  "Analyze (Shift+A) to add results here" with Analyze as a link.
- **Empty and first state** (spec 3.11): Selection and Everything only, and the footer line.
  (Notes is a built-in row in the full design; it is not drawn in tier 1.)

Routes: `#/graph-place/karate`, `#/graph-place/ppi`, `#/graph-place/file-loaded`,
`#/graph-place/empty`, `#/graph-place/running`, `#/graph-place/finished`,
`#/graph-place/louvain-open`, `#/graph-place/failed`, `#/graph-place/partial`,
`#/graph-place/find`, `#/graph-place/find-no-match`.

### 2.6 Left panel: the Data place

Header: the graph's name. Then two collapsible sections (spec 7), each with a one-line summary
when closed:

1. **Sources**: one row per table, its kind glyph (node table or edge table), its name and one
   quiet line ("les miserables . 77 nodes"; "edges.csv . 254 rows, 254 edges"). A graph file is
   one row that expands to its node table and edge table. Clicking a row opens the Data page at
   that table ("Edit: <table>"). "+" offers File..., From a URL..., Paste..., each opening the Data
   page with the new table. The row menu in tier 1: Rename, Edit source.... (Replace with file,
   Refresh and Remove are tier 2.)
2. **Attributes**: Nodes and Edges subheads; computed attributes first, marked by their run icon,
   then by name. A row: type glyph (Abc Category, # Number, calendar Time), name, a role tag
   (Key, Name, Weight). A row shows its fill ("20%") when not every element has a value. Clicking a
   row opens the attribute's inspector. Find appears past 15 attributes. Its menu, in tier 1:
   **Add label line**, Show in table (round 7: Color by and Size by are not on the attribute menu;
   the bind icon on a Color or Size line is their one door).

Not drawn in tier 1: Filters (tier 2).

Routes: `#/data-place/graph-file`, `#/data-place/plain-json`, `#/data-place/attributes`.

### 2.7 Inspector

**Rule** (spec 5): the right side shows the properties of the selected thing, read and edited in
place. It holds no verbs except the state bar's one or two buttons. Verbs live in the thing's
"..." menu, which is the same list as its context menu.

**Frame** (spec 5.1), every kind:

1. Header, two lines: kind icon and swatch, the name; then the kind word, a lowercase provenance
   link ("from Louvain, Oct 3"), and "...".
2. **State bar**, only when needed, at most two buttons: "Settings changed since the run --
   Rerun | Revert"; "Running -- Cancel"; for a slow layout, "Laying out -- Stop".
3. Tabs **Style** then **Values** (renamed from Data: in round 8, 12 participants confused the
   Data tab with the Data rail place and lost their selection; studio decision, reversible). A kind
   with one body has no tabs. The tab last chosen stays chosen per kind, **except that a single
   node always opens on Values** (round 8).
4. Style tab: the **Paints line** (a count that selects: "Paints 77 nodes (every node with a
   value)"), the **paint-order line** ("Covered by PageRank for Color on 77 of 77"), then the
   property sections (section 2.8). **[not at first release: both lines wait for the element's
   per-layer painted counts (#790); until then the Style tab starts at its sections.]**
5. Values tab, in this order, empty sections left out, each collapsible with a one-line summary:
   Summary, Members or Values (one histogram component; Top 10 with ties kept whole, each name
   selecting what it names), Made with (runs only).
6. **Counts are links that select what they count**; the table follows the selection.

**Kinds in tier 1** (spec 5.2, cut):

| Selection                         | Tabs                  | Style                                       | Values                                                                                                                                                     |
| --------------------------------- | --------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nothing (the graph)               | Style, Values         | Canvas; Layout                              | Overview                                                                                                                                                   |
| One node                          | Style, **Values first** | Why this look                               | Summary (the file's attributes in use, then Results with rank, never mixed; Degree is a link that selects the neighbors), "N more attributes", Memberships |
| Several elements (a neighborhood) | Style, Values         | Why this look                               | the neighborhood list when the selection is a neighborhood (section 5.T12); otherwise Summary and Memberships                                              |
| Measure row                       | Style, Values         | the bound property                          | Values (histogram, caption "77 of 77 have a value, 0.0033 to 0.0754, median 0.0124"), Top 10, Made with                                                    |
| Run row (groups)                  | Style, Values         | Fill color bound to the run's groups        | Summary (modularity, number of groups), Sizes (histogram of group sizes), Made with                                                                        |
| Group row (one community)         | Style, Values         | its fixed values                            | Summary, Members (top 10)                                                                                                                                  |
| Everything row                    | Style, Values         | the element's base style as lines, editable | Summary (what it covers)                                                                                                                                   |
| Selection row                     | none                  | Color, Size, Opacity                        | --                                                                                                                                                         |
| Attribute (from Data)             | none                  | --                                          | Summary (its table, its roles as read-only tags, completeness), Values (histogram)                                                                         |

**Nothing selected** (spec 5.3, round 7):

- Style > **Canvas**: Background (one color field), **Show all labels** (a checkbox; help "Off: a
  label that would overlap another is hidden until you zoom in. On: every label is drawn."; round
  8 made this the one name for the overlap switch), Reframe when data changes. (Print-safe colors
  and Show filtered-out nodes faintly are not in tier 1.)
- Style > **Layout** group (its own group, not under Style's colors, round 7): **Method** (from
  the element's layout catalog, each with its size rating and a "Recommended" mark from
  `recommendLayout`) and **Seed**. Clicking Method opens one popover: the method list, then its
  engine, options and pacing under small headings, folded. Changing a property lays out again at
  once, one undoable step. A method rated for fewer nodes than the graph holds says "slow" in
  words and, while running, the state bar offers Stop. No confirm dialog. Esc closes the popover
  (round 8).
- Values > **Overview**: nodes, edges, direction (with where it was settled), density, components,
  the degree distribution; isolated nodes, self-loops and repeated edges only when not 0. Each
  count says what it means and selects those elements ("7 nodes with no edges"). Readings not yet
  computed are one line, "4 more readings not computed", whose link **computes them in place**,
  with its cost stated as on a measure row (round 7: the old link opened the graph's "..." menu
  with Clear graph data under the pointer). No menu reached from a read-only link holds a command
  that deletes; in tier 1 the graph's "..." holds Compute the overview, Re-run layout and Reshuffle
  layout seed only. The source is named once, in the header's "From miserables.gexf" link.

Routes: `#/inspector-nothing-selected/file-loaded`, `#/inspector-nothing-selected/overview`,
`#/inspector-nothing-selected/computed`, `#/inspector-nothing-selected/canvas`,
`#/inspector-nothing-selected/layout`, `#/inspector-nothing-selected/layout-method`,
`#/inspector-nothing-selected/layout-slow`, `#/inspector-nothing-selected/reading`,
`#/inspector-nothing-selected/empty-graph`.

**Why this look** (spec 5.4; owner: collapsible). One line per row that wins at least one property
on this element, highest first: a 12 px swatch, the row's name (a link that selects the row), the
property tokens (Color, Size, Shape, Label...). Closed, it shows its winners in one line. It comes
whole from graphty-element's `session.styles.explain()`. (The earlier "label hidden" note with a
Show all labels link is dropped: a selected node's label is always drawn, so the note could never
show.)
Editing a single node's look from a token (the Overrides row) is not in tier 1: tokens are
read-only links.

### 2.8 The Style tab (every row that paints)

One component for every row, generated from graphty-element's style descriptors (`channelsFor`),
never typed (spec 16):

- **Nodes | Edges** switch with no numbers; a side that sets something carries a small dot.
- **Sections in a fixed order**, always shown, read from graphty-element's channel groups
  (`session.catalog.channelGroups()`), never listed in the app: Nodes: Fill, Shape (shape, size),
  Effects, Label, Tooltip. Edges: Line, Arrows, Label. Size stays under Shape until a re-test on
  working wiring decides otherwise; moving it is a change in the element's table, not the app's.
- **A row lists only what it sets.** A section with nothing set is its header and "+". "+" adds
  the one property left, or opens a dark menu of the unset ones.
- **A set property is one 24 px line**: name (88 px column) and value. Colors show a swatch, the
  hex and the opacity percent. "-" removes the line, with Undo.
- **The bind icon shows at rest on the Color and Size lines** (round 7), tooltips "Color by
  attribute" and "Size by attribute". It opens the **From data list**: the field list, menu size,
  with the element's attributes, then run results under their row names. Attributes the property
  cannot take are listed last, disabled with the reason, never hidden.
- **A bound line** shows the ramp and palette name for a color, the range for a size ("1 to 3",
  the element's size units), the field for text. Clicking it opens the **Binding popover**: Source, Scale, Palette with
  reverse, Values from, No value, and Detach. Esc and the X both keep the choice (it applies live).
- **Click a value to edit it**, in a light popover: Color (hex, opacity percent, the document's
  colors), Shape (the 25 shapes with names and a filter field).
- **The field list** (spec 2.5): search past 15 items, matching the start of words; "In use" first;
  a middle ellipsis on attribute names, the full name in the tooltip.

Routes: `#/inspector-selection-and-everything/everything`, `#/style-tab-same-panel/nodes`,
`#/style-pickers/plus-menu`, `#/style-pickers/color`, `#/style-pickers/shape`,
`#/style-pickers/binding`, `#/style-pickers/bind-prop`, `#/style-pickers/palette`.

### 2.9 Table dock

Toggled by Shift+T and Quick actions (spec 6). Tabs **Nodes**, **Edges**, and one item tab per
open group run ("Louvain"). Canvas, table and inspector share one selection.

- The scope line is the count ("77 nodes"). The key column is frozen on the left; by default the
  table shows the key and the attributes in use. **Columns: 8 of 69** at the end of the tab strip
  opens the field list with a checkbox per column.
- Column header: type glyph, name, sort arrow, a menu caret on hover; the column's profile ("77
  values, 1 to 36") is the header's tooltip. The caption follows the sort (round 8).
- Column menu: the attribute's one menu (section 2.6). Row menu: the node's context menu.
- **Export...** (the table's options menu) opens the one Export dialog on Data with the table that
  is showing (round 8). There is no table-only CSV path.
- Ctrl+F searches the table when it has focus.
- Group run item tab: one row per group with its size and readings; "Show members in table" (a
  group row's "...") sets the Nodes tab to that group's members with a removable chip naming it.

Routes: `#/table-dock/nodes`, `#/table-dock/edges`, `#/table-dock/communities`,
`#/table-dock/members-of-row`, `#/table-dock/column-menu`, `#/table-dock/columns`,
`#/table-dock/table-options`, `#/table-dock/closed`.

### 2.10 The Data page

Every data door opens one page (spec 11.3): the start screen's New from data..., Open project or
file... with a data file, a drop, Ctrl+V with text, the empty canvas card, Sources "+", and Quick
actions. It takes the workspace; the header and rail stay, Data lit. Its title says the act: "Open
as a new graph" from the start screen; "Add to <project>" from a door inside an open project (the
empty canvas card, Sources "+", a drop or Open project or file... with a project open); "Edit:
edges.csv" from a source row. Inside a project the page never says "Open as a new graph" and never
renames the project (round 7 decision, round 8 finding 22). A new graph loaded from a file is named
after the file without its extension until the reader renames it or saves it under another name. Load returns to the Graph place; Cancel or Esc returns to
where the reader came from. **A single clean file opens with every check green and focus on Load,
so a clean drop is one Enter.**

Top to bottom, left to right, in tier 1:

1. **Tables** (left): one row per table, kind glyph, name, row count, a status check (green when
   every required role is set and its report has no unresolved line). "+" offers File..., From a
   URL..., Paste...; a second file dropped on the page lands here. A graph file (GEXF, GraphML,
   GML, DOT, Pajek, JSON, Neo4j) is one row that expands to its node and edge tables, their
   structural roles shown locked, "Set by the file".
2. **Model strip** (read-only): one line from the chosen roles, "Les Miserables: 77 nodes, 254
   edges" for a graph file, `node (77) --edges (254)--> node` for two tables.
3. **Table header strip**: **Each row is: a node | an edge**; for an edge table, the weight line
   (below); **File settings** from the format line ("CSV, comma"): Format, Separator, id handling,
   the error limit; a detected value carries an "auto" mark.
4. **Sample grid**: under each column header its **role** (a menu): Key; From -> [type] and To ->
   [type] in an edge table, Links to -> [type] in a node table; Name; Weight; Attribute (the
   default, shown as quiet text). Beside it the column's type glyph, read-only. With no node table,
   From and To default to one new type, "node", so a plain edge list loads with one Enter. Keys are
   suggested by graphty-element (a column with "id" in its name and unique values), shown as set
   only when unique and fully matched.
5. **Match report** (bottom, always visible), rendered from the element's report object; the app
   counts nothing. Before Load everything shown comes from the element's load
   draft (`session.data.prepare()`), after Load from `data.lastImport()`; the two are one report
   shape. It answers "did it all arrive" before Load: rows read, edges made,
   unmatched values with **Add | Leave out** (Leave out is the default), and each count is a link
   that filters the sample grid to those rows. "Show the 32 unmatched rows" shows all of them, not
   a sample (round 8).
6. **Footer**: Direction (As the file says | Directed | Undirected); Cancel; **Load**, disabled with
   its reason until every table has its check.

**The weight line in tier 1** (round 8 finding 11: 10 of 10 read "Weight: none" beside a number
column as that column being dropped). When an edge table has no Weight and holds a number column,
the line names it: "value is a number: use it as the weight?" with one click, which sets the role
and marks it "auto". A file format that declares its weight (GML, GEXF, GraphML attribute kinds)
sets the Weight whatever the column is called. With no number column the line reads "Every edge
counts 1". The Direction footer says what the file declared ("As the file says: undirected"). Choosing a weight's meaning (Higher
means: Stronger | Farther | Capacity), node weight and the full weight-at-load design are tier 2.

**Refusals** (T5), one per typed element error, shown on the table it concerns as one problem
block (what happened, what to do): empty file; could not be read (with the row number and the
element's suggested fix when the element reports them; **[not at first release: `E_PARSE_FAILED`
carries neither yet, so the block names the file and the format it was read as]**); unknown format; no endpoint columns found (naming the columns the file
has); missing or duplicate ids; fetch failed after three tries; too large to draw. **Choose another
file...** is the primary button when no setting can fix it. One load at a time.

Routes: `#/data-page/graph-file`, `#/data-page/edge-list`, `#/data-page/json-plain`,
`#/data-page/transfers` (two tables), `#/data-page/role-menu`, `#/data-page/file-settings`,
`#/data-page/url`, `#/data-page/detect-several`, `#/data-page/detect-none`,
`#/data-page/unsupported-format`, `#/data-page/refused-empty`, `#/data-page/refused-parse`,
`#/data-page/refused-endpoints`, `#/data-page/refused-fetch`, `#/data-page/refused-too-large`,
`#/data-page/refused-ids`, `#/data-page/reading`, `#/data-page/one-at-a-time`,
`#/data-page/unmatched-rows`.

### 2.11 The start screen

Shown whenever no project is open (spec 11.1). It replaces the whole frame.

- **Left**: **Open project or file...** (Mod+O); **New from data...** (the Data page with File,
  URL and Paste as its "+" choices); the hint "or drop a file anywhere in this window", beside
  "Files are read on this computer and never uploaded." A dragged file shows "Drop to open".
- **Middle**: **Recent projects**, each with its name, size ("77 nodes") and time. A browser does
  not tell a page which folder a file is in, so no folder is shown. Empty: "Projects you open or
  create appear here. They are kept in this browser." Where the browser keeps a file handle
  (Chromium), a click reopens the file and a file the browser can no longer read says so, its menu
  offering Locate... and Remove from list; elsewhere every entry asks for the file with
  Locate....
- **Right**: **Samples**, each with a thumbnail, its size and one line saying what it is good for.
  Tier 1 ships four, and **every sample opens with nothing run** (round 8):
    - Les Miserables: "Characters who share a chapter of the novel. Good for a first look at
      communities and who holds the story together." (The mock's "Opens with worked examples..."
      sentence is withdrawn by round 8.)
    - Zachary's karate club: "Members of a club and who met outside it. Good for finding who
      connects the club and which members group together."
    - College football: "Teams and the games they played in one season. Good for finding groups of
      teams that play each other most."
    - Florentine families: "Marriages between the leading families of Renaissance Florence. Good for
      finding who brokers between groups."
  Each sentence names only tier 1 jobs. (Protein interactions and March transfers are dropped:
  neither dataset exists. Karate and football also carry a recorded grouping column; a file
  column's swatches never reuse a run's palette, so the recorded grouping cannot be read as a
  rival answer to Louvain, round 8 finding 8. **[element: palette assignment]**)
- A gear opens Settings; the privacy chip opens Settings > Privacy.

**Usage data card** (spec 11.2; owner decision, owner's words kept whole): shown the first time
the app opens, as a non-blocking card at the foot of the start screen, and again on each launch
until it is answered; a sample can be opened before answering and nothing is sent until the answer
is yes. **Owner decision needed before shipping:** in round 8, 6 of 6 read "the author ... and his
Claude Code sessions" as an unexplained second recipient and 4 said it drove their No; in round 7,
3 of 3 declined on the session replay. The owner allowed the wording to be tightened if every
commitment is kept; a tightened draft goes to the owner, and the text below stays until the owner
chooses.

> Your data is yours, but please help us. We will never see the data you analyze, but we would
> like to collect information about how you use the app so that we can improve the user
> experience. This data will only ever be used by the author of the application and his Claude
> Code sessions.

Buttons **Share usage data** and **No thanks**, equal weight, no default. A **What is collected**
disclosure lists: a replay of each session with every node name, attribute value, label and file
content masked; anonymous task events with their timings (file loaded, first graph drawn, measure
run, result read, style added, export, undo); errors and performance; a feedback widget. It ends
"No file contents ever leave your computer." After an answer: "Thank you. Usage data is on, with
content masked." or "Usage data stays off.", then "Change this in Settings > Privacy".

Routes: `#/start-screen/first-run`, `#/start-screen/disclosure`, `#/start-screen/answered`,
`#/start-screen/declined`, `#/start-screen/returning`, `#/start-screen/drop-target`,
`#/start-screen/recent-missing`, `#/start-screen/open-choose`.

### 2.12 Settings (tier 1 sections)

One dialog, a section list down the left, closed with X or Esc, Mod+, (spec 12.3). Tier 1 builds:

- **General**: Theme (System, Light, Dark; the app's chrome only); Number format.
- **Privacy**: Usage data (a switch, with the owner's text and the "What is collected" list);
  **Where your data goes**, read-only lines: files are read on this computer; the project is saved
  where you save it; usage data, masked, is sent only while Usage data is on.
- **Accessibility and input**: Single-key shortcuts (on/off, WCAG 2.1.4). Reduced motion is not
  drawn until graphty-element honors it (an unbuilt item is not drawn).

Routes: `#/settings/general`, `#/settings/privacy`, `#/settings/privacy-on`,
`#/settings/accessibility`.

---

## 3. Round 7 and 8 decisions that change tier 1

Each is decided (`decision-log.md`); each overrides older spec text.

1. **The Label "+" adds a label line** (round 8, revised by the adversarial review). The Label "+"
   has one behavior everywhere: it adds an empty label line at the next free position and opens its
   attribute list. Its tooltip is "Add label line". The Label heading word runs the same command.
   **There is no "Show labels" trap**: the Show checkbox (graphty-element's label `enabled: false`)
   sits on the Label section header, shown only when a row beneath this one sets a label. (Round 7
   confirmed that a "+" which behaves differently the second time confuses readers.) The new line
   still starts empty (owner, 2026-09-30). No notice or Undo for adding an empty line; its own "-"
   removes it. Untested: the next round tests it first.
2. **A label line states its result from live state**, e.g. "77 labels, 64 hidden to avoid
   overlap", read from the element's `nodeLabelCounts`; shown only while Show all labels is off. **Show all labels** is the one name for the overlap switch (round 8).
3. **A node opens on its Values tab, and its degree selects its neighbors** (round 8). The degree on
   the Values tab and the "N connections" chip both select the one-hop neighbors and move to the
   several-elements inspector. Focus never jumps to another node.
4. **A neighborhood is listed by name and tie strength** (round 8). Titled "Javert's 17
   connections" (the count is the number of distinct neighbors, `neighbors(id).total`, not the
   degree, which counts repeated edges), every member by name with its tie value, strongest first; Esc returns to the
   single node. This is the one home for "who is this node tied to": no table filter, no
   Connections list on the Values tab.
5. **The list's box is one live find over the project** (round 8). Section 5.T12.
6. **The sample opens with nothing run** (round 8): no pre-run layer, no "worked examples" group.
7. **Export > Data opens on the table that is showing**, Nodes by default, with the line "One row
   per node, with every computed value" (round 8). The hidden-label warning is dropped: the data
   export does not depend on labels.
8. **One Export dialog** (round 8): the table's "Export..." opens the same dialog on Data; any
   table-only CSV path is removed.
9. **Runs land visible and listed** (round 8): every run finishes, its row lands on top, visible,
   and the canvas and legend repaint; hiding or showing a row repaints both. A run's suggested
   style lands on top unless a hand-written layer drives the same channel; when such a layer
   colors everything, the suggestion is suppressed and the notice says so with **Show anyway**,
   read from the element's `runs.painting()`. The app never creates a hand-written layer that colors
   everything by default. Whether runs should land above such a layer is an owner decision.
10. **One legend state** (round 7): the canvas, Export and (later) Present read one shared legend
    switch; Export has no "Include legend" switch of its own. graphty-element draws the legend into
    the exported image **[element: #133, a tier 1 blocker]**; the image preview shows it exactly as
    drawn. Round 7 confirmed at severity 4 that a picture without the legend shown on screen
    misleads; T13 and T15 cannot pass without it.
11. **Layout has its own group**, out of Style's colors; the toolbar's Layout button opens that
    group as a popover; its glyph reads as arranging (rounds 7 and 8).
12. **The legend says what a higher value means in one plain sentence**, every channel in use and
    the size range in the element's units (round 8).
13. **Analyze's box filters the list**: placeholder and accessible name "Filter analyses"; at most
    one "Start here" per heading (round 8). Its matching is the same as the find box's.
14. **Bind at rest** (round 7): the bind icon shows at rest on Color and Size lines.
15. **One attribute menu** (round 7): Color by and Size by are not on it; Add label line is.
16. **Every count and claim in a message is computed from the state it describes, or the message
    is removed** (round 8 wording rule).

---

## 4. Shared states, words and patterns

The interaction rules of spec 2.5 hold on every tier 1 screen; the ones a builder meets most:

- **Add**: "+" in the header of the list or section it adds to, nowhere else.
- **Rename**: double-click or F2. Tier 1 renames the project only.
- **Delete**: acts at once with an Undo notice; nothing in tier 1 asks first.
- **Surfaces**: dark menu (pick a command), light popover (edit a value, applies live, Esc or a
  click outside closes), page (the Data page), modal (Export, Settings, shortcuts).
- **Tooltip**: one component for every icon-only control: name plus key chip; 500 ms delay;
  immediate on keyboard focus; Esc dismisses; no native `title`.
- **Empty states**: one gray line naming what goes here with the add verb as a link.
- **Disabled**: grayed, `aria-disabled`, still focusable, reason in the tooltip (in a menu, on the
  item's second line).
- **Problem**: one block, what happened and what to do, at most one action.
- **Truncation**: middle ellipsis on attribute names, end ellipsis on prose; full text in the
  tooltip and the accessible name.
- **Duplicate accessible names** (round 8 finding 5; studio decision, reversible): no two reachable
  controls share an accessible name; the inspector's tab is named Values so it no longer shares
  "Data" with the Data place, and any other pair carries a qualifier.
- **Words**: American spelling. The screen says "attribute", never "field" or "column" except in
  the table and the Data page's grid (round 7 removed "field"; round 8 found 5 of 12 do not use
  "attribute" either, so the next round re-tests the term); Find and Quick actions accept "field" and "column" as
  aliases. Every door uses its command's one label word for word.

---

## 5. Task by task

Each task gives the path, the exact controls and words, its states and the mock routes. Examples
use Les Miserables; every label must read correctly on a second dataset too (owner, 2026-09-29).

### T1. First launch

1. The app opens on the start screen with the usage data card at its foot (`#/start-screen/first-run`).
2. "What is collected" opens the disclosure (`#/start-screen/disclosure`).
3. Share usage data or No thanks; the card is replaced by its one-line answer
   (`#/start-screen/answered`, `#/start-screen/declined`). The header's privacy chip shows the
   answer from then on.

States: unanswered (usage data off); answered on; answered off. Error: none.

### T2. Pick a sample

1. Start screen > Samples > a card. The project opens on the Graph place, nothing run: Selection
   and Everything in the tree, the footer "Analyze (Shift+A) to add results here", the plain
   drawing, the legend card empty, the graph's inspector on Values > Overview
   (`#/graph-place/karate`, `#/canvas-and-states/karate`, `#/inspector-nothing-selected/file-loaded`).
2. The reader reads what it is from the Overview and the header's "From ..." link.

States: loading (the loading card, `#/canvas-and-states/loading`); loaded. Error: a sample that
fails to load shows the load refusal card with Choose another file....

### T3. Your own graph file

1. Open project or file... (start screen or File list, Mod+O) > the browser's file picker, or a
   drop (`#/start-screen/open-choose`, `#/start-screen/drop-target`).
2. The Data page, "Open as a new graph", one row expanding to its node and edge tables, roles
   "Set by the file", every check green, the model strip "Les Miserables: 77 nodes, 254 edges", the
   match report, focus on **Load** (`#/data-page/graph-file`, `#/data-page/json-plain`).
3. Enter: the loading card with its running count, then the Graph place as in T2
   (`#/graph-place/file-loaded`).

States: reading (`#/data-page/reading`); ready; loaded. Errors: T5.

### T4. Two spreadsheets as one network

1. Pick or drop both files at once (or the second with the Tables "+").
2. The Data page lists both. The nodes table: **Each row is: a node**, Key suggested ("id"), a
   name-like column proposed as **Name**. The edges table: **Each row is: an edge**, From -> node
   and To -> node on its two linking columns, the weight line. Each table's check turns green; the
   model strip reads `account (3,000) --transfers (9,113)--> account`; the match report counts
   unmatched ends with Add | **Leave out** (`#/data-page/transfers`, `#/data-page/role-menu`,
   `#/data-page/unmatched-rows`).
3. Load lands on the Graph place.

States: a table not ready (its check gray, Load disabled with its reason in the footer); ready;
loaded. Errors: T5; "An edge needs exactly two linking columns; this table has three"
(`#/data-page/edge-disabled`).

### T5. A file that will not read

The Data page shows one refusal on the table it concerns, naming every fault (with row numbers
and the element's suggested fix once the element reports them; section 2.10), with **Choose another file...** as the primary button when no
setting can fix it; Load is disabled with the reason (`#/data-page/refused-parse`,
`#/data-page/refused-endpoints`, `#/data-page/refused-empty`, `#/data-page/refused-ids`,
`#/data-page/unsupported-format`, `#/data-page/detect-none`). A file too large to draw is refused
before the graph is touched (`#/data-page/refused-too-large`).

### T6. Read what loaded

- **The graph's inspector, Values > Overview** (nothing selected): nodes, edges, direction and where
  it was settled, density, components, the degree distribution; isolated nodes, self-loops and
  repeated edges when not 0, each a link that selects them. "4 more readings not computed" computes
  them in place (`#/inspector-nothing-selected/overview`,
  `#/inspector-nothing-selected/computed`, `#/inspector-nothing-selected/components-selected`).
- **Data > Attributes**: every attribute with its type glyph, role tag and fill
  (`#/data-place/attributes`); an attribute's inspector shows its values histogram
  (`#/inspector-attribute-and-filter-step/lesmis-field`).
- **The table**: Shift+T (`#/table-dock/nodes`, `#/table-dock/edges`).
- **Where a value came from** (round 8 finding 8, not yet a decision): a node's Summary lists the
  file's attributes first and the computed results after them, never mixed; computed attributes
  carry their run's icon in Data > Attributes.

States: reading ("Reading..." in the Overview, `#/inspector-nothing-selected/reading`); loaded;
computed.

### T7. Rank nodes

1. Toolbar > Analyze (Shift+A, or the tree footer's Analyze link). The popover opens above the
   toolbar: a **Filter analyses** box, **Recent** (the last three), then the catalog by what the
   run adds: **Rank nodes and edges**, **Find groups**, **Find paths and edge sets**, **Measure the
   graph** (`#/analyze-popover/open`), read from the element's `catalog.algorithmGroups()`. A
   heading with no entries is hidden (Measure the graph, in tier 1). These headings failed round 8's
   tree test (running betweenness: 29% direct; "Measure the graph" made 16 of 21 pause), and the
   comparison of headings has not run; the acceptance walk uses PageRank, under a heading that
   tested well, until it does. Each entry: the type icon of the row it adds, its name,
   and the element's one-line "what this answers" **[element: the algorithm's `description`,
   as a keyed message, never typed]**. At most one "Start here" per heading. An entry
   whose precondition fails is disabled with its reason. The box searches through the element
   (`catalog.searchAlgorithms`; "brokers" finds Betweenness) (`#/analyze-popover/search`).
2. Pick PageRank: its short form only, the options the element does not mark advanced
   (`#/analyze-popover/essentials`): **Weight** ("Every edge counts 1" or the loaded weight) and
   damping (PageRank has no direction option; Direction waits for #313), a cost line beside **Run** ("Under a second"). Enter runs. Esc steps back one
   level; a second Esc closes and returns focus to Analyze.
3. **Running**: the popover closes; a "PageRank" row appears at the top of the tree with its
   progress bar, briefly highlighted. No notice; a screen reader hears "PageRank added, running"
   (`#/analyze-popover/running`, `#/graph-place/running`). Cancel is in the row's menu and the
   inspector's state bar.
4. **Finished**: the row paints at once with its suggested color ramp, on top and visible (or,
   under a hand-written layer that colors everything, the notice "Hidden by your layer <name>" with
   Show anyway; section 3, item 9); the legend reads "Color: PageRank" with its reading sentence (`#/graph-place/finished`,
   `#/inspector-measure-row/style`).
5. **Read the top three**: select the row; its Values tab shows Values (histogram, "77 of 77 have a
   value, 0.0033 to 0.0754, median 0.0124") and **Top 10**, each name selecting its node
   (`#/inspector-measure-row/data`). Or sort the table's PageRank column; the caption follows the
   sort.

Other states: queued (clock icon, "Queued, 2nd"); a costly entry offers **Exact | Sampled** and
names itself "Betweenness, sampled 500" (`#/analyze-popover/costly`); partial (stopped at the time
limit, warning icon, `#/graph-place/partial`); failed (error icon, the element's message in the
tooltip and state bar, `#/graph-place/failed`); a GPU run that fails is never finished quietly on
the CPU. Picking an entry that already has a row: the footer reads **Update PageRank row**
(primary), and the revised row keeps its place (`#/analyze-popover/revise`).

### T8. Find groups

1. Analyze > Find groups > Louvain; essentials (resolution) > Run.
2. A "Louvain" run row lands on top with its groups as children, collapsed when many, painted with
   the group palette; the legend reads "Color: Louvain" with its sentence and one line per group,
   overflow "28 more communities" (`#/graph-place/louvain-open`).
3. Read them: the run row's Values tab, Summary (number of groups, modularity in a sentence), Sizes
   (a histogram of group sizes), Made with (`#/inspector-run-row/data`); a group row's Members
   (top 10) (`#/inspector-group-set-path-row/community-3`); the table's "Louvain" item tab
   (`#/table-dock/communities`).
4. Retuning: change resolution in Made with; the state bar reads "Settings changed since the run
   -- Rerun | Revert" (`#/inspector-run-row/settings-changed`). Rerun revises the same row.

When two runs both paint color, the newer covers the older; the older row's paint-order line says
"Covered by Louvain for Color on 77 of 77" **[not at first release; element: #790]** and its eye
still works. Hiding the newer row shows the older at once.

### T9. Color or size by a value or a result

Two equal doors, both on a row's Style tab:

- **By a result**: select the measure row (PageRank). Its Fill > Color line is already bound. For
  size, Shape "+" > **Size** adds a Size line; its bind icon (at rest, "Size by attribute") opens
  the From data list; pick PageRank under results. The line reads "Size PageRank 1 to 3"; the
  legend adds "Size: PageRank" and the range (`#/inspector-measure-row/style`,
  `#/style-pickers/bind-prop`, `#/style-pickers/binding`).
- **By an attribute from the file**: on the Everything row (or any row), the Color line's bind icon
  ("Color by attribute") > the From data list > an attribute. **A bind edits the row it is on**:
  Everything stays Everything, now colored by the attribute; no new row is made. A door that is not
  on a row (an attribute's menu) makes a new row on top instead, the one rule both label doors also
  follow. A number gets a sequential ramp; text gets a categorical palette; a number column that
  holds codes needs its measurement declared once (the element draws numbers as a ramp unless told) (`#/graph-place/painted`,
  `#/inspector-measure-row/painted-color`, `#/inspector-measure-row/painted-size`).
- **The Binding popover** (click a bound value): Source, Scale, Palette with reverse, Values from,
  No value, Detach. Changes apply live; Esc, the X and a click outside all keep them.

States: unbound (bind icon at rest); bound (icon pressed, ramp or range shown); a binding that
reads nothing shows graphty-element's error on the line and in Why this look
(`#/style-pickers/binding-unknown-path`). The canvas must repaint on every commit (round 8 fixed a
mock defect where it did not).

Open (not decided): Size as its own heading beside Fill. Round 8 kept Size under Shape pending a
re-test on working wiring; tier 1 ships Size under Shape. The "12 of 12" figure cited for moving it
cannot be traced to a round 8 record.

### T10. Labels from an attribute

1. Select the row whose members should carry labels (Everything for every node). Style tab >
   **Label** section.
2. Click the Label "+" (tooltip "Add label line") or the word "Label". An empty line is added at
   the next free position (Above first) and the **From data list opens on it at once**, focus on its
   first item (`#/style-pickers/label-new-line`, `#/inspector-group-set-path-row/label-empty`).
3. Pick "label" (or "name"). The line reads "Above Abc label" and states its result from live
   state, "77 labels, 64 hidden to avoid overlap"; the canvas draws the labels
   (`#/inspector-group-set-path-row/label-two`).
4. To see every label: the graph's Canvas > **Show all labels** (`#/inspector-nothing-selected/canvas`).
5. A second "+" adds the next position (Below), e.g. degree below the name. The owner's example is
   name above, degree below. **[not at first release: one label line per row until the element has
   labels keyed by position and number formatting.]**

Other door: an attribute's menu (Data > Attributes, the attribute inspector, a table column) >
**Add label line**, which makes a row whose Above line is already bound to that attribute; it
lands at the top of the tree, selected, and the canvas draws it.

Rules: Esc on the open list leaves the line empty: it reads "Pick an attribute" and draws nothing
(its accessible name "Label, Above: no attribute, draws nothing"); while an empty line exists, "+"
adds no second one; an empty line writes nothing and is dropped when the selection
changes. Position has one home, the Label popover's grid (click the "Aa" swatch). One label per
position per row. **[element: labels keyed by position; number formatting on text bindings; which
labels the overlap rule hid.]**

### T11. A readable layout

1. Toolbar > Layout (the move glyph). The popover: **Motion** "Running" with **Pause**, or
   "Paused" / "Settled" with **Resume**; then the Layout group, Method and Seed
   (`#/toolbar/layout-open`, `#/toolbar/layout-paused`, `#/toolbar/layout-settled`).
2. Click Method's value: the method list with size ratings and "Recommended", engine options folded
   (`#/inspector-nothing-selected/layout-method`). Picking one lays out again at once, one undoable
   step; the notice offers Undo. A slow method says "slow" and the state bar offers Stop while it
   runs (`#/inspector-nothing-selected/layout-slow`). Esc closes the popover.
3. The same Layout group is on the graph's inspector when nothing is selected
   (`#/inspector-nothing-selected/layout`). **Re-run layout** and **Reshuffle layout seed** are
   commands in the graph's "..." menu (the empty canvas's right-click) and Quick actions.

### T12. Find a node by name, read about it, see its neighbors

1. **Find**: the tree's box (or "/"), placeholder "Find rows, elements, values". It is one live
   list: results appear as you type; focus stays in the box; Down enters the list, Enter picks,
   Esc clears and then closes; the selection changes only on a pick. Results come in groups:
   **Elements** (nodes and edges matched by name, id or attribute value over the full graph,
   from the element's `session.find()`), and at most three **value** rows, each "Select where <attribute> is <value>
   (<count>)", which in tier 1 selects those nodes directly (the Select where dialog is tier 2).
   No match reads `No match for "x"` (`#/graph-place/find`, `#/graph-place/find-no-match`,
   `#/commands-and-search/find-exact`).
2. **Pick a node**: it is selected and framed, the selection bar appears, and the inspector opens
   on its **Values** tab: Summary (the file's attributes in use, then Results with rank, e.g.
   "PageRank 0.0754, #1 of 77"; **Degree 17** is a link), "N more attributes", Memberships
   (`#/inspector-node/data`, `#/inspector-node/why-this-look`).
3. **See the neighbors**: Degree on the Values tab, the "17 connections" chip, or the selection bar's
   Neighborhood (G) selects the one-hop neighbors and the inspector lists them: "Javert's 17
   connections", each by name with its tie value, strongest first (the mock's example reads
   "Valjean, 17 shared chapters") (`#/inspector-several-elements/neighborhood`). Each name selects
   that node. Esc returns to Javert.

Tie wording (studio decision, reversible, from the owner's rule against one-domain wording,
2026-09-29): the tie value is the edge's loaded weight, labeled with its attribute's name ("value
17") unless the data declares a unit; with no weight, the list orders by name and shows no value.
**[element: the neighbor lookup with each tie's value comes from graphty-element; the app only
reads and shows it.]**

Keyboard: Shift+Arrow walks to the next node and announces "Valjean, 36 connections"
(`#/canvas-and-states/walked`) **[not at first release; section 2.3]**. Edges cannot be picked on
the canvas yet **[element]**; an edge is reached from the Edges table, where clicking a row selects
that edge and opens its inspector. The element marks a selected node only, so a selected edge shows
no mark on the canvas until it marks edges too **[element]**. (Round 8: 6 of 6 could not select the
Javert-Valjean tie.)

Not in tier 1: Filter to neighbors, Add as steps, the 1-to-3 hop distance choice (tier 2).

### T13. Save a picture and the numbers

**One Export dialog** (spec 12.1), about 760 x 560 so the canvas stays visible; doors: the File
list's Export... (Mod+E) and the table's Export.... The list on the left (one Tab stop): **Image**
and **Data** in tier 1. Every output: a summary line under its title, the settings grid, one
status callout above the preview, the preview, and the footer note "Saved to this computer only;
nothing is uploaded."

- **Image** (graphty-element's `captureScreenshot`): Preset ("To share -- PNG, 2x", "For print --
  PNG, 4x, sharper", "Thumbnail -- JPEG, 400 x 300", "For documentation -- PNG, 2x, transparent";
  "Custom" after any edit); Size (1x, 2x, 4x with pixels); Format (PNG, JPEG, WebP; SVG is not drawn in
  tier 1, against the owner's "SVG figure export now", which goes to the owner as a question); View (the current camera or a standard view, captured without moving
  the reader's camera); Background (Canvas color, White, Transparent, disabled with the reason
  when the format cannot hold it). The preview sits above the fold and shows **the legend exactly
  as it will be drawn**, read from the one legend switch **[element: the legend drawn into the
  image]**. A size the element's pre-check refuses is disabled with its reason. Footer: Cancel,
  Copy, **Export** (`#/export-dialog/image`, `#/export-image/image`).
    - Waiting for the layout to settle: progress in the footer, "Capture now" and Stop waiting
      (`#/export-image/waiting-to-settle`); a settle timeout keeps "Capture now" and Try again
      (`#/export-image/failed`); a refused size (`#/export-image/size-refused`); a refused copy
      (`#/export-image/clipboard-refused`).
- **Data**: opens on the table that is showing, Nodes by default, first line "One row per node,
  with every computed value". **Format** from the element's catalog (CSV first). From the table's
  Export... the file carries the table's visible columns and each visible run's results (round 7:
  "Table export defaults to the visible columns"); from the File list it carries every attribute and
  every run's results; a group run's item tab exports one row per group. The first line says which.
  What the format cannot hold is the warning callout, worded from the element's `lossNotes`
  (`#/export-dialog/data`). Column headers are the runs' result paths, so they read well only with
  readable run ids. **[element, to confirm: column headers that carry each value's
  scope.]**
- After Export the dialog closes where the reader was, with one notice: "Exported
  les-miserables_front.png" (name pattern `<project>_<view>.<ext>`). A browser does not report where
  a download went, so the notice names no folder.
- The dialog remembers the last choices per output.

Not in tier 1: Video, Report, Recipe, Recent exports, Export from a row's menu.

### T14. Save and reopen

1. **Save** (Mod+S, the File list). The first Save of a project that has no file (a sample or a new
   load) opens **Save as**: the dialog titled with the project's name, the name a field with its
   text selected (`#/project-menu/save-as`). Enter saves; the header shows the new name; the
   notice names the file, e.g. "Saved as Les Miserables, my copy". A later Save writes the same
   file with the notice "Saved <name>" where the browser keeps a file handle (Chromium); in other
   browsers each Save downloads a new copy and the notice says "Downloaded <name>".
2. **Reopen**: Close project (project-name menu) returns to the start screen, where the project is
   first in Recent projects (`#/start-screen/returning`); a click opens it. Open project or
   file... with the `.graphty.json` file does the same.
3. The project reopens as it was saved: the rows with their eyes and order, every style, the
   bound label line, positions, view mode, the legend switch and the selection (decided on the
   owner's behalf, reversible: the selection is an optional view part of the file and never marks
   the project unsaved). The Show all labels choice is the reader's preference, not the project's,
   and does not travel with the file.

Wording (round 8 finding 13; studio decision, reversible): the start screen separates the two
things it lists, "Recent projects are remembered in this browser; each project is a file saved
where you chose." A web build shows the folder only when the browser tells it; otherwise it shows
the file name alone.

**[element: a whole-session document (data, runs, styles, positions, notes) that saves and opens;
the history is not saved.]**

### T15. One whole first session

T2, T6, T7 (or T8), T9, T10 and T13 chained, from an empty app, with no step resetting another:
open Les Miserables (nothing run); read the Overview; Analyze > Betweenness, which finishes and
paints on top; size by it; add a label line bound to the name; Export > Image with the legend (needs #133); the
picture matches the screen. Every step's change must be visible on the canvas and the legend the
moment it commits. This is the build's acceptance walk.

---

## 6. State summary by surface

| Surface                       | Empty                                                          | Loading                    | Loaded / at rest                 | Running                             | Finished                      | Error                                            |
| ----------------------------- | -------------------------------------------------------------- | -------------------------- | -------------------------------- | ----------------------------------- | ----------------------------- | ------------------------------------------------ |
| Start screen                  | no recent projects: the gray line                              | --                         | recent projects and samples      | --                                  | --                            | a file the browser cannot read: Locate...        |
| Data page                     | --                                                             | "Reading", row count       | every check green, focus on Load | --                                  | Load lands on the Graph place | one refusal on its table, Choose another file... |
| Canvas                        | "No nodes to draw" [Add data...]                               | file name and a bar        | the drawing and legend           | layout moving                       | --                            | too large                                        |
| Tree                          | Selection, Everything, "Analyze (Shift+A) to add results here" | --                         | rows in paint order              | spinner and progress bar on the row | the row on top, painting      | error or warning icon on the row                 |
| Inspector, nothing selected   | "No nodes to draw" Overview                                    | "Reading..."               | Overview, Canvas, Layout         | "Laying out -- Stop" (slow method)  | --                            | --                                               |
| Inspector, run or measure row | --                                                             | --                         | Style and Data                   | state bar "Running -- Cancel"       | Values, Top 10, Made with     | the element's message in the state bar           |
| Analyze popover               | `No match for "x"`                                             | --                         | catalog                          | closes on Run                       | --                            | an entry disabled with its reason                |
| Find box                      | `No match for "x"`                                             | --                         | Elements, value rows             | --                                  | --                            | --                                               |
| Table                         | closed                                                         | --                         | Nodes, Edges, item tabs          | --                                  | --                            | a refused cell edit: the element's reason        |
| Export                        | --                                                             | waiting for the layout     | Image or Data with preview       | capturing                           | notice "Exported ..."         | refused size or copy; settle timeout             |

The full matrix for every surface is `prototype/study/structure-comparison/state-matrix.md`.

---

## 7. Not in tier 1

Left out of this build. Each is designed in refined B and comes after tier 1 passes; adding it
later is additive.

**Tier 2 (common repeat work, next):** filters (Data > Filters, the filter chip, Filter to
neighbors, Add as steps); shortest path (the Path popover, Path between, P); notes (the Notes place,
the Notes row, Add note, N, note counts); several tables joined on any key column beyond one node
table plus one edge table (the door-entries example, Links to, Subtype, Type naming, One edge per
Pair with Combine); weight chosen at load with its meaning, node weight, run weight overrides;
adding rows to a loaded table; Replace with file and rerunning on new data; Select where (the
dialog, rule queries in Find, Select where <attribute> is... on the attribute menu); the Neighborhood
distance choice; edge selection beyond the table.

**Specialized (after tier 1 and tier 2 pass):** sets (Create set, Keep as set, Select top N,
Combine); Compare; recipes and style files (Apply file, Export > Recipe); Version history; the
Views place, saved views, Present, tours and Export > Video; Export > Report; SVG figures (the owner decided SVG "now": open question) and PDF figures;
very wide data (Go to column, the hosts sample); nested JSON documents; the Assistant; VR and AR
and the hand menu; the time slider; derived graphs and the Graphs switcher; folders, Lock, Hide
in list and solo; Hide on canvas; the Overrides row and editing one node's look from Why this
look; Print-safe colors and Show filtered-out nodes faintly; the Everything and Selection eyes;
Collapse on canvas; Run as copy; renaming rows; Read as; computed attributes; Settings > Your
name, Performance (GPU policy), Assistant, Headset, Diagnostics; the IT estate and research
network samples.

---

## 8. What tier 1 needs from graphty-element

Built in graphty-element, never in the app (`CLAUDE.md`). Each line is from
`element-requirements-5.md` or a round decision; the ones marked "confirm" may already exist.

| Capability                                                                                                                                                       | Tier 1 task        | Source                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------ |
| The algorithm catalog: groups, search terms and search, the short form of options, cost, preconditions, progress and cancel; the legend's reading sentence | T7, T8, legend     | spec 2.2; round 8; decisions item 6              |
| A run's suggested style that paints only its own result, and a report of what it painted or why not (`runs.painting`) | T7, T8             | spec 16.7; `CLAUDE.md`; decisions item 8         |
| The legend (`styles.legend()`) drawn into exported images (#133; a tier 1 blocker)                                                                              | T13, T15           | element-requirements 5, Output                   |
| Labels keyed by position; plain position names; declutter by node; empty text draws nothing                                                                      | T10                | element-requirements 2                           |
| A report of which labels the overlap rule hid, so the label line and Export can count them                                                                       | T10, T13           | round 8 (the mock's stand-in is marked ponytail) |
| Number formatting on text bindings                                                                                                                               | T10 (degree below) | element-requirements 2                           |
| Style channel groups in display order (`catalog.channelGroups`)                                                                                                   | Style tab          | element-requirements 5, Styling; decisions item 9 |
| `styles.explain()` for one node (exists)                                                                                                                         | Why this look      | spec 5.4                                         |
| A neighbor lookup returning each neighbor with its tie value                                                                                                     | T12                | round 8 finding 2                                |
| Find over every element by label, id and attribute value, with counts per value                                                                                  | T12                | round 8                                          |
| `session.data.prepare()` (a held load draft) and the match report object; key suggestions; one node table plus one edge table in one load; typed refusals, with the row number | T3, T4, T5 | element-requirements 3; decisions item 1 |
| A per-load cancel                                                                                                                                                | loading card       | element-requirements 5, Data                     |
| `exportGraph` with each run's results as columns (confirm scope-carrying headers)                                                                                | T13                | spec 12.1                                        |
| `captureScreenshot` with a chosen background color                                                                                                               | T13                | element-requirements 5, Output                   |
| A whole-session document that saves and reopens runs, styles, positions and the selection                                                                        | T14                | element-requirements 5, Session                  |
| Resuming a settled layout from current positions (confirm); `recommendLayout`; size ratings                                                                      | T11                | element-requirements 5, Layout                   |
| Edge picking on the canvas, and a selection mark on edges                                                                                                        | T12 (later)        | element-requirements 5, Picking                  |
| Camera keys that ignore keys pressed with Shift, Ctrl or Alt                                                                                                     | Shift+A, Shift+Arrow | `cameras/OrbitInputController.ts:52`           |
| Reduced motion honored by the renderer                                                                                                                           | Settings           | element-gaps                                      |

Filing these as high-priority graphty-element issues is a separate step; this page only names them.

---

## 9. Calls made on this page

Each is a studio decision, reversible with an edit, made where the design sources left a gap:

- The rail draws only Graph and Data in tier 1.
- The selection bar holds only Neighborhood in tier 1, and Neighborhood selects one hop directly.
- The find box's value row selects matching nodes directly until the Select where dialog ships.
- The Notes built-in row is not drawn in tier 1.
- A neighborhood tie is labeled with its weight attribute's name unless the data declares a unit.
- Accessible names carry a qualifier where two reachable controls share visible words.
- A web build shows no folder for a saved project: no browser reports one.
- A label line has no separate bind icon; its value is its field picker (spec 16.6). Round 7's
  "Label by attribute" bind-at-rest wording is read as the Label "+" and heading, which round 8
  made the one door.
- Recipe and style files dropped or opened in tier 1 are refused with one problem block.
- The inspector's second tab is named Values, not Data.
- A bind on a row's line edits that row; a door that is not on a row makes a new row.
- The Label "+" always adds a line; Show sits on the Label section header.
- The usage-data card returns on each launch until it is answered.

---

## Adversarial review changes

The tier 1 design, the plan and the graphty-element API decisions were put through an adversarial
review on 2026-10-03. These changes came from it and are made in the text above; this list is the
record of what moved and why.

- **This page is the source of truth again.** The plan's tier 1 cuts are folded in, each marked
  **[not at first release]** with what shows instead: the loading card's Cancel and running count,
  the GPU-lost card, the Layout popover's Motion line, the Shift+Arrow walk, the Paints and
  paint-order lines, the second label line. The plan no longer overrides this page.
- **Results restated.** T9 was not measured (the mock never applied the choice); T15 failed on a
  design defect (the names step) in 19 of 21 sessions, not mostly on mock defects; T3 and T4 were
  graded at Load; T5 passed on a refusal the element cannot yet produce.
- **Export > Image without the legend is not acceptable.** The legend drawn into the image (#133)
  is a tier 1 blocker; round 7 confirmed the failure at severity 4, and T13 and T15 depend on it.
- **Facts a browser cannot know are gone**: the folder of a saved project, a moved file detected
  by its path, "to Downloads". Save in browsers without file handles downloads a new copy and says
  so.
- **The weight line** follows round 8 finding 11: it offers a number column as the weight instead of
  reading "none" beside it, and a format's declared weight is used whatever its name.
- **"4 more readings not computed" computes in place**, and no menu reached from a read-only link
  holds a command that deletes (round 7 finding 17).
- **Usage-data card**: the round 7 and 8 evidence and a tightened draft go to the owner, whose words
  they are; the card returns on each launch until answered.
- **Attribution fixed.** "The project saves the selection" was decided on the owner's behalf, not by
  the owner; the 500 ms tooltip delay is a studio number.
- **Style tab sections** come from graphty-element's channel groups, not an app list; Size stays
  under Shape (the "12 of 12" figure for moving it cannot be traced).
- **Key conflicts.** Shift+A and Shift+Arrow also move the camera on a focused canvas today, because
  the element reads keys without their modifiers; filed as an element need.
- **One bind rule**: a bind edits the row it is on; a door that is not on a row makes a new row.
  The Label "+" has one behavior.
- **Units**: sizes are stated in the element's units ("1 to 3"), never "px". Reduced motion is not
  drawn until the element honors it.
- **Samples**: Protein interactions and March transfers (no datasets) replaced by College football
  and Florentine families; every sentence names only tier 1 jobs; a file's recorded grouping never
  shares a run's palette.
- **Data page title**: "Add to <project>" from inside a project; the project is never renamed by a
  load.
- **Words**: "Pick an attribute", "Labels from an attribute"; the "attribute" term is re-tested.
- **SVG** is not drawn rather than drawn disabled, and the deferral goes to the owner against the
  "SVG now" decision.
- **Data export scope**: visible columns from the table's door, everything from the File list.
- **Analyze headings** are flagged as a tree-test failure; the acceptance walk uses PageRank until
  the heading comparison runs.
- **Edges**: an Edges-table row selects that edge; the canvas does not mark a selected edge until
  the element does.
- **Method sentence**: the legend's sentence is the element's reading of what a higher value means,
  published as a keyed message.
- **Find** lists nodes, edges and value rows; the "Rows" group (runs, groups, layers) waits for the
  element to search them.
- **Dropped**: the inspector's "label hidden" note (a selected node's label is always drawn) and the
  data export's hidden-label warning (a data file does not depend on labels).
- **Filenames**: "les-miserables_front.png", not the "*" a formatter left in place of "_".
