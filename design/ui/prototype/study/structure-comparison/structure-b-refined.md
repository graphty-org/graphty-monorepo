# Refined structure B: the complete specification (version 5)

This page specifies the app structure that round 7 tests: one tree of paint rows on the left,
the canvas in the middle, an inspector on the right with Style and Data tabs, a table dock at the
bottom, and an icon-only toolbar. It is the reference for the clickable skeleton that goes to the
owner and, without waiting for the owner's review, to the user studies (owner, 2026-10-01).

Version 5 carries the owner's decision of 2026-10-01: before the next user study, a state matrix
for the skeleton, a design that holds up with dozens of attributes per node and per edge, and a
design for loading nested JSON. The studio's decisions are in `owner-questions-5.md`; the matrix is
`state-matrix.md`; what graph-io and graphty-element must add is in `element-requirements-5.md`.

Version 4 carries the owner's decisions after reviewing version 3: notes become part of
graphty-element's API; a note's time and target are required and its author's name is optional
and usually empty; the "+" next to Label starts empty and a node can carry several labels;
several data sources load and join on any key column; and weight is a field chosen when the
data is loaded. The studio's decisions on them, with reasons, are in `owner-questions-4.md`; the
notes API is `element-notes-api.md`; every graphty-element capability the design waits on is in
`element-requirements-5.md`. Earlier answers are in `owner-questions-3.md` and
`owner-questions-2.md`; the version 3 streamlining is `streamline-3.md`, whose correction sections
win over this page where they disagree, except on a line version 4 changes.

**Changed in version 5:**

- **One field list** shows and picks attributes everywhere: Data > Attributes, every field picker
  (bind, Label, Color by, Size by, Width by, a filter step, a link's "by" column, Go to column),
  the inspectors' "N more attributes" and the table's column chooser. Search past 15 items,
  matching the start of words; groups by table, open; "In use" first as an order, never a toggle;
  folders only from the data's nesting; a middle ellipsis on every attribute name (sections 2.5,
  7).
- **The table** freezes its key column and shows the key and the in-use attributes by default;
  "Columns: 8 of 69" opens the field list with checkboxes, replacing "Show columns..." (section 6).
- **The inspectors' Data tab** shows the in-use attributes, then "N more attributes" with empty
  values counted (section 5.2).
- **The Data page at width**: roles stay under the column headers; the default role reads in
  quiet text; columns with a role pin left; Go to column (section 11.3).
- **Nested JSON** loads on the Data page: the document's arrays of records are tables, proposed by
  graphty-element; sub-objects become dotted columns at every depth; an array becomes One value,
  Several values, Several edges or Several rows; links may point at several types; plain graph
  JSON still loads in one step (section 11.4).
- **One path reader** after the load, and a path that reads nothing is an error (section 11.4).
- **The state matrix** (`state-matrix.md`) holds every surface against ten states, checked by
  `study.mjs --matrix`; the skeleton gains the wide and nested projects, a `@1024` window suffix
  and the problem block (section 13).
- **Made explicit**: Shift+Arrow selects the next node on any dataset, and the selection bar is
  raised by the one place a selection is set, so every door shows it (section 2.3; the last check
  found the skeleton did neither).
- **Removed**: Data > Attributes' "Find attribute only when the list is longer than the panel";
  the "+" menu's own search field (a list past 15 items is the field list); "Show columns...".

**Changed in version 4:**

- **Notes are graphty-element API** (owner): the element stores, stamps, undoes, saves and
  publishes notes, one graph's notes per session (studio); every note control version 3 drew as "needs graphty-element" is enabled; a
  note whose target is gone is kept and shown as missing (sections 2.1, 8).
- **No name is the normal case**: a note's meta line is its time; nothing asks for a name; Your
  name is entered only in Settings and saved with the project, as the project's author setting
  (owner, 2026-09-28: "the project's author setting"; 2026-10-01: "enters it in settings and we
  store it") (sections 8, 12.3).
- **The Notes row is ordinary style layers** that select noted elements, added only when the
  reader gives the row a look; the
  reserved notes layer is no longer requested (sections 3.7, 16.7).
- **Labels**: "+" adds an empty line that shows nothing until a field is picked (owner); a node
  carries several labels, one per position, such as names above and sizes below (section 16.6).
- **The Data page replaces the load dialog** for every load, one table or many: two kinds of
  table (each row is a node, or an edge), roles under each column header, links on any key
  column, rows that become edges or nodes, one edge per row or per pair with a combine choice per
  column, and a match report (sections 2.4, 7, 11.3).
- **Weight is chosen when the data is loaded** (owner), per table; each edge table sets its
  weight's meaning; every run uses it unless the run overrides it (sections 2.2, 2.4, 12.2).
- **Roles move to the Data page**; an attribute's inspector keeps Read as and shows its roles as
  read-only tags (sections 5.2, 7).
- **Removed**: version 3's Tableau finding that a graph file leaves the reader nothing to model;
  "the weight is not a role"; the Repeated pairs field; the source inspector; Add columns by
  key... as its own command; the reserved notes layer; a Label line pre-bound to Name; the
  appendix of version 3 review changes (their outcomes are in the body). Section 19 now points to
  `element-requirements-5.md`.

Each decision below is labeled with its author:

- **Owner** -- decided by the owner and recorded in `../../owner-feedback.md`. Quoted or
  restated exactly; the studio does not reopen these.
- **Studio** -- decided by the design studio, reversible with an edit, stated with its reason.
  The owner reviews these.

Two project rules shape every choice. graphty-element owns all graph logic, and the app only
draws what the element publishes. An algorithm's style paints only the nodes and edges that
carry its own result.

Examples use two datasets from `../../kit/fixtures.json`: Les Miserables (77 characters, 254
co-appearance links, undirected, a categorical `group` and an edge `value`) and the March
transfers (3,000 accounts, 9,113 directed transfers, `kind`, `country`, `riskScore`, `flagged`,
edge `amount` and `timestamp`). Every label is checked against both, so none of them depends on
money.

---

## 1. The owner's decisions this structure carries

From `owner-feedback.md`, "the owner chooses refined structure B for round 7":

1. Round 7 tests refined structure B.
2. **A run paints as soon as it finishes.** "Measures don't paint on their own" was rejected as a
   fatal flaw: this is graph visualization software, and not visualizing results defeats the
   purpose. Several runs may fight over color; the eye on each row shows and hides, and the
   results stay available to compare.
3. One tree of rows on the left, each row something that can paint the graph: a group, a path,
   or a measure (a "PageRank" row whose inspector offers the styling for PageRank's values).
   Rows carry a type icon, in the spirit of Tableau's typed fields.
4. The tree holds rows, not nodes. Nesting means "came from this run", not membership.
   Parent/child can be locked: a run's children reorder only within it, and a path cannot be
   dropped under a community.
5. Every run is a row marked by its kind. Its paintable outputs are its children. Its
   non-paintable outputs (a graph-level reading such as modularity, a pair list) are on the
   run's Data tab.
6. Hundreds of communities are fine when they are what the researcher studies: collapsed by
   default, sortable, searchable, "Show members in table".
7. The inspector has a Style tab and a Data tab (summary, membership, provenance). The table dock
   lists many rows. The line between the two is defined so they do not duplicate (section 6).
8. Filters belong with the data, because they change what is computed and laid out. Hiding is
   the eye, and it changes drawing only.
9. A built-in **Everything** base layer draws the default style. Hiding it shows only what other
   layers show. Hidden nodes still take part in the layout, and the screen says so; to leave
   them out, filter.
10. **Selection** is a built-in layer with its own styling, pinned at the top.
11. A node's inspector answers "why this look": "color from Community 3, size from PageRank".
12. The tree is organized with folders, and with "hide" and "show hidden" for the list, which are
    separate from the eye (paint on the canvas).
13. Welcome: **solo** (Alt-click an eye shows only that row) and **note counts on rows**.

Earlier owner decisions this structure also keeps:

- Export... is in the project-name menu at the top left, as in Figma.
- Structure comes from graphty's ontology; Figma supplies controls and gestures only.
- Data management is one designed area, not an Export button in the top right.
- Telemetry is off until the person opts in at first use, graph content is always masked, and
  the opt-in keeps every commitment in the owner's text (section 11.2).
- The findings report is one self-contained HTML file. Figures export as SVG now, PDF later. The
  Print look keeps a grayscale check.
- Notes record their author and time, and a recipe records who saved it and when. The author
  shows only when a project has more than one.
- Shift+Arrow walks nodes. Plain arrows orbit in 3D and pan in 2D.
- American spelling everywhere.
- Weighted measures are named from the data in every domain ("Total amount in"), never with a
  currency special case, and every label is tested on two domains.

Decided on the owner's behalf (reversible; `owner-feedback.md` labels them so):

- No separate Note tool for now. Add note's existing entry points cover it.
- After undoing a filter step, a one-line notice names the step.
- The project file saves the selection when it closes, so a case resumes where it stopped.

From the owner's second review (2026-09-30):

- **Owner principle: styling should be unopinionated and left to the user.** The studio applies
  it as "the app adds no look of its own" (section 16.7).
- **Owner: renaming a row is a double-click, as in Figma, without a right-click.**

From the owner's third review (2026-09-30):

- **Owner: the toolbar carries icons only, no text, with tooltips shown after a hover delay.**
- **Owner: "Why this look" is collapsible.**
- **Owner: the skeleton comes back to the owner for review before any user testing.** (For
  version 4 the owner chose otherwise: the study runs without waiting for that review.)

From the owner's notes on the data design (2026-09-30):

- **Loading several data sources and joining them on any key column, not only the node id, is a
  primary task.** Worked example: a door-entries table (person_id, building_id, time) joined to a
  people table and a buildings table.
- **Weight (node and edge) is a field defined when the data source is loaded.**
- **A label is a variable picked in styling**, not a predefined field; several labels per node
  (some above, some below) are wanted; **"+" next to Label starts empty**.
- Blending is out of scope for now. Live sources versus snapshots is a future enhancement (issue
  #643).

From the owner's decisions after reviewing version 3 (2026-10-01):

- **Notes are part of graphty-element's public API.**
- **A note's author name comes only from Settings, is optional, and will usually be empty**; the
  design must work well without it.
- **A note's time and its target are required; everything else is optional.**
- The next study round runs on this skeleton without waiting for the owner's review.

From the owner on scale, nested data and states (2026-10-01):

- **Before the next user study: a state matrix for the skeleton, a design that holds up with
  dozens of attributes per node and per edge, and a design for loading nested JSON** (paths
  through several layers of sub-objects and arrays).

Studio decision carried from earlier rounds: no avatar in the top right. With no accounts it
implies multiplayer, and the author name already shows on notes.

---

## 2. The studio's decisions on the owner's questions

The owner's first review asked four questions (2.1 to 2.4). Section 2.5 is the pattern table the
third review asked for. All are studio decisions, reversible with an edit.

### 2.1 Notes: in the tree, as paint, and on which targets

**Studio decision: individual notes do not become rows. One built-in Notes row paints the
elements notes are about (section 3.7), rows show note counts, and the Notes place on the rail is
where notes are read, found and written.**

What the tree shows:

- **A note count on a row** that a note is about: a speech-bubble glyph and a number, in its own
  fixed slot. It counts only notes about that row itself, never notes about its members. A row
  with no notes shows nothing.
- **A hollow "N inside" mark** on a collapsed run or folder whose children carry notes. It never
  adds to a count and disappears when the row is expanded.
- **Clicking the count** selects the row and opens its Data tab at Notes. The row's accessible
  name ends ", 2 notes"; the row menu has Open notes.
- **Find** (the tree's search field) lists matching notes after the matching rows; picking a note
  selects its targets.

**What a note can be about (studio decision, version 3):** a node, an edge, any row that is a
model object (group, set, path, measure, run, or any other style-layer row), a filter step, or the
whole graph -- the targets the conceptual model lists (section 6: primary objects, items, the
graph, a definition). Three things in the UI are not note targets: a saved view (its Caption is
its note, and a second text field on one object would break the one-home rule); a folder (app
organization, not a model object, so a note about it could never reach graphty-element's notes
store -- note the rows inside it); and an attribute or a source (values and load settings, not
definitions -- a note about what a column means is a note about the graph). Their menus have no
Add note and their inspectors no Notes section. **One gesture for every target:** Add note
(N, the selection bar, any context menu) writes about the subject the inspector shows; with
nothing selected, the graph. The editor shows the targets as chips, each with an x to remove it;
to add a target, change the selection.

**Edges:** graphty-element cannot pick an edge on the canvas yet, so an edge is selected from the
table's Edges tab, a path's members or a node's inspector, and noted from there. One fixture note
in the skeleton is about the edge "Valjean - Javert".

Where each kind of note is counted and read:

Notes are read in one place, the Notes place. Every inspector's Notes section is a count that
links there, filtered to that subject ("2 notes" opens Notes > About the selection); it does not
repeat the notes. Studio decision: one place to read a note, so a note has one look and one menu.

| The note is about | Its count shows on | Its count links from |
|---|---|---|
| a group, set, path, measure or other style-layer row | that row | the row's Data tab, Notes section |
| a run | the run row | the run's Data tab |
| a node or an edge | the Notes row's paint; the table's Notes column | the element's Data tab |
| the graph | the graph's entry in the Graphs switcher | the graph's Data tab |
| a filter step | the step in Data > Filters | the step's inspector |

A note that cites a run cites that exact run. If a rerun replaces it, the note's run chip carries
a history icon whose tooltip reads "cites an earlier run"; the chip opens that run's settings.
A rerun keeps the run's id, so the element, not the app, marks the cite as replaced
(`element-notes-api.md`, section 2.3). A note about one group of a run ("Community 3") gets the
same icon after a rerun ("about an earlier result"), because a rerun may number groups
differently.

**Notes are graphty-element API (owner, 2026-10-01).** The element stores notes, issues their
ids, stamps their time and author, keeps them with the project, makes every change undoable and
publishes `note:changed`; the app only draws what it publishes (`element-notes-api.md`). Every
note control version 3 drew as "needs graphty-element" is enabled in the skeleton, including Add
note on a filter step (stable step ids are part of the notes proposal). One keeps the mark:
noting an edge picked on the canvas, because edges cannot be picked on the canvas, which is a
separate capability.

**What a note records.** Required (owner): its time, stamped by the element, and one or more
targets. Required by the studio: its text, because a note with no text only marks something, and
marking is a set's job. Optional: the author, present only when Your name is set in Settings
(usually it is not); an edited time; and the runs it cites. Rejected: tags, a status, replies,
canvas pins and colors.

**A target that is gone keeps its note.** After a reload, a target the data no longer has shows
as a struck-through chip ("Not in the current data"), and the Data page's match report counts
such notes. A note is never dropped.

Reasons notes are not rows: a note cannot paint, and the tree's order is paint order; one note
has many targets, most of them nodes and edges, which are never rows; at 1366 x 768 the tree
shows about nine rows; notes are read in time order. Precedents: Figma comments are not layers;
Tableau keeps annotations out of the Data pane; Cytoscape gives annotations their own panel.

Round 7 test: "find out why the analyst cared about this cluster of characters", with Community 3
inside a collapsed Louvain run, worded without "note". Record the first click. If more than a
third of first clicks miss inside the tree, a "Rows with notes" chip returns above the tree.

### 2.2 Algorithms: the Analyze popover

**Studio decision: the toolbar's Analyze opens the catalog in a popover anchored to the toolbar.
The result lands as a row on top of the tree and paints when the run finishes. Full settings and
Rerun live on that row's Data tab. The rail has no Algorithms place.**

- **Analyze** (Shift+A: graphty-element takes A on a focused canvas). Doors: Quick actions, the
  empty tree's footer link, a row's "Analyze..." (which selects the row's members first).
- **Scope follows the selection.** With something selected, the popover's first line reads "On: 5
  selected nodes", with a way back to the whole graph; with nothing selected there is no scope
  line, because the filter chip in the header already names the graph it runs on.
- **The catalog is generated from graphty-element** (`session.catalog.algorithms()` and
  `catalog.metrics()`), never typed. Each entry shows the type icon of the row it will add, its
  name, and as its second line the element's one-line "what this answers". The family is in the
  tooltip. Marks (needs direction, needs a weight, cost) are bare icons with tooltips. An entry
  whose precondition fails is disabled with its reason. Search matches names and the element's
  aliases ("brokers" finds betweenness).
- **Groups by what the run adds to the tree**: Rank nodes and edges (a measure row), Find groups
  (a run with group children; breadth-first levels and depth-first order sit together here),
  Find paths and edge sets (a path, a spanning tree, a min-cut), Measure the graph (a reading
  only; pair-list algorithms add a run row with no eye). **Recent** lists the last three entries;
  a click opens them prefilled with their last settings. Prim is not a separate entry: it is a
  Method value of Minimum spanning tree.
- **Picking an entry** shows its essentials only: **Weight**, which reads the weight chosen when
  the data was loaded ("Loaded weight: count, stronger", the Data page's words, as in the graph's inspector; owner: every run uses it by default).
  Its dropdown lists the loaded weight first, then None and the numeric attributes, with the
  meaning beside it (Stronger | Farther | Capacity, defaulted from the loaded meaning); changing
  either overrides this run only and is recorded in its Made with, never written back to the data.
  With two or more edge tables the line names each edge type's weight ("Loaded weights: entries
  count, stronger; routes km, farther"), and so does the graph inspector's Weight line.
  A node-weight line appears only on entries the catalog marks as reading node weight; the
  skeleton draws one candidate, PageRank's restart weights, with "each person weighs 1" for the
  type with no weight column, and the floors inspector names the same candidate ("No measure
  reads node weight yet. PageRank's restart weights would"), both marked as needing graphty-element. Then the
  **one key option** (resolution, damping, From
  and To). **Direction** appears only on a directed graph. Cost is one line beside Run ("Under a
  second"); **Exact | Sampled** appears only on entries marked costly, never swapped silently.
  Stop after (the element's time box) is in the run's Made with. Enter runs (its key is in Run's
  tooltip). Esc steps back one level; a second Esc closes and returns focus to the button.
- **Running** closes the popover and adds the row at the top of the tree with its progress bar,
  briefly highlighted. No notice: the row is the feedback, and Cancel lives on the row's menu and
  the inspector's state bar. A screen reader hears "Betweenness added, running". The row paints
  when the run finishes (owner).
- **After the run**, the row's Data tab holds every option under Made with. Editing one shows the
  state bar, "Settings changed since the run -- Rerun | Revert". **Run as copy** (the row's "...")
  runs under a new id (the element's `as` option) and leaves this row as it was, so two
  partitions can be painted and compared.
- **Analyzing an entry that already has a row revises that row**: the footer reads **Update
  Louvain row** (primary) and **Run as copy**. The revised row keeps its place in the tree.
- **A sampled or corrected run names itself** ("Betweenness, sampled 500", "Closeness, per
  component").
- **Past runs are the tree's run rows.** There is no second history list.

Reasons: with a rail place, choosing an algorithm replaces the tree and the analyst switches back
to see the result; runs are tree rows (owner), so a rail place would be a second list of the
same runs. Precedents: Figma's Actions popover; Gephi's split of statistics, values and
appearance into three panels is the warning.

What graphty-element must publish so the app writes none of it: the catalog with each entry's
inputs, output kind, one-line answer, aliases, settings schema, cost estimates, progress and
cancel, and paintable outputs kept apart from readings.

Round 7 test: the toolbar build against a rail-place build, tasks worded without "run",
"algorithm" or "analyze". The rail wins only if its first-click rate beats the toolbar's by more
than 15 points for both kinds of persona.

### 2.3 The toolbar

**Studio decision (version 3): the toolbar holds every command that acts on the canvas as a
whole. The canvas itself carries no controls -- only the drawing, the legend card and state
cards. Things live in places, settings live on what they configure, and verbs on a selection
live with the selection.**

**Owner decision: icons only, with tooltips after a hover delay.** Five 32 px icon buttons at the
bottom center of the canvas, about 190 px wide:

**Analyze | Layout, View, Legend | Quick actions**

| Button | Icon | Click | Tooltip | Accessibility |
|---|---|---|---|---|
| Analyze | flask | opens the catalog popover (2.2) | Analyze  Shift+A | `aria-haspopup="dialog"`, `aria-expanded` |
| Layout | pause while running; play when paused or settled | pause, or resume from the current positions (the element's `setRunning`) | Pause layout / Resume layout | the name swaps; a polite announcement "Layout paused", "Layout running", "Layout settled" |
| View | cube in 3D, square in 2D | opens the View flyout | View, or "View: Front" while the camera is exactly on a view; no key chip (5 switches the mode and belongs to the flyout's mode line, not to opening the flyout) | `aria-haspopup="menu"` |
| Legend | list | shows or hides the legend card | Legend  L | `aria-pressed` |
| Quick actions | command | opens the palette | Quick actions  Ctrl+K | `aria-haspopup="dialog"` |

**The View flyout** (most frequent first; key 5 toggles 2D and 3D without opening it):

1. Fit (0); Frame selection (F) -- also frames a selected row's members.
2. Standard views, 3D only: Front (1), Side (3), Top (7), Isometric, plugin views (the element's
   camera catalog, `camerasForMode`). In 2D: Zoom in and Zoom out, showing the element's own =
   and - keys as hints (the app binds neither).
3. Your views (names only, in the Views place's order; a 3D view in 2D carries a "3D" tag and
   switches mode when chosen); Save view.
4. **Switch to 2D  5** in 3D, **Switch to 3D  5** in 2D (one two-state line whose label names
   the action, section 2.5, so the key sits on one fixed row); Enter VR, Enter AR (enabled from
   the element's `isVRSupported()` and `isARSupported()`, disabled with the element's reason
   otherwise).

The flyout opens with focus on its first item. One noun everywhere: **view** (Save view, Standard
views, Your views).

Why each call:

- **Camera folds into View**: 2D/3D and the camera both answer "how am I looking at it", as in
  Figma's zoom and view menu. The modes come last because the 5 key covers them.
- **Legend has its own button**: a frequent one-key toggle whose state must be visible at rest.
  The card has no X, so the button and L are its only doors and the pressed state is always true.
- **Layout is one button whose icon is its state**: pausing is wanted mid-motion, in one click,
  in a fixed place. **Re-run layout** stays in the canvas menu and Quick actions, because a
  status icon should only pause and resume, never rearrange (a re-run is one undo step in
  graphty-element's history, which puts the previous positions back). Under
  reduced motion the icon does not animate. While an export waits for the layout to settle, the
  button is disabled with "Waiting to capture the image". **To confirm with graphty-element**:
  resuming after the layout settled continues from the current positions.
- **Select is not on the toolbar** until graphty-element supports area selection; it then returns
  with a caret holding Select and Lasso. It was the only pointer tool, always pressed, so with no
  label it told the reader nothing.
- **No "?" on the canvas**: the ? key and Help > Keyboard shortcuts open the shortcuts panel.
- **Quick actions** is the index of every command, and the toolbar is where a Figma user looks
  for "do something".

**Tooltips** follow the one component in section 2.5. **Open and pressed look different**: a
button whose flyout or popover is open shows the gray open fill; blue means only that Legend is
on. With no graph drawn (a state card shows), Analyze, Layout, View and Legend are disabled with
"Nothing is drawn"; Quick actions stays live, because it is how a keyboard user reaches Add data.

**Position**: fixed at the bottom center. The left edge holds the rail and the tree; the selection
bar and every flyout attach directly above the toolbar; Figma uses the same fixed bottom bar.

**Keys.** When the canvas has focus, graphty-element uses W, A, S, D, Q, E, the arrows, = and -.
App keys never use them. The shortcuts panel lists the element's keys first, as "Canvas
(graphty-element)", marked not changeable. Settings can turn every single-letter app key off (WCAG
2.1.4). **A single-letter app key fires wherever focus is** -- a tree row, the inspector, the
canvas -- except in a text field, an open menu, popover or dialog, or a list box (they own their
letters), and on the Data page (nothing is selected there to write about); so N writes about
what the inspector shows whatever holds focus. Esc closes a popover or bar first and never clears the selection. The toolbar is one Tab
stop with arrow keys between buttons; Alt+Down, Enter or Space opens a flyout; F6 cycles the
regions (rail, left panel, canvas, toolbar, table, inspector).

**The selection bar.** While something is selected -- by a click on the canvas, Shift+Arrow, the
table, Select where or any other door -- a bar attaches directly above the toolbar. It is raised
by the one place a selection is set, never by each door. **Shift+Arrow** selects the next
node in that direction on any dataset, through that same place, and announces it ("Valjean, 36
connections"); plain arrows keep orbiting and panning (owner). The bar is
drawn with the same 32 px icon buttons, tooltip and separators, in the node menu's order
(explore, organize, visibility, notes):

| Verb | Icon | Key |
|---|---|---|
| Neighborhood | concentric circles | G |
| Path between (two nodes, or a node and a set) | route | P |
| Create set | circle-check with a plus | Mod+G |
| Hide on canvas / Show on canvas | eye-off / eye | Mod+Shift+H |
| Add note | message-square with a plus | N |

- **Neighborhood** selects one hop; its popover offers 1 to 3 hops and Out, In or Both (hidden on
  an undirected graph, where a one-line "Undirected graph" stands in), and two commits: **Filter
  to neighbors** (one undoable filter step) and **Add as steps** (one group row per hop, the
  breadth-first levels). "Steps away" is no longer a separate verb.
- **Path between** opens the **Path popover** with From and To filled from the selection.

**The Path popover** is the one interface for a path. It opens from the selection bar, from P, and
from Analyze > Find paths. Fields: **From**, **To** (pick fields: filled from the selection, or
click the field and then a node or set on the canvas), **Direction** (Follow edges | Either way;
hidden on an undirected graph), **Weight** (the same dropdown and meaning control as Analyze),
**Scope**. It runs graphty-element's shortest path; Most flow and Weakest cut are Analyze entries.
Results land as a path row on top of the tree that paints; later queries with the same settings
collect under one path run row, one child per query (top task 11). The selected row and its
inspector confirm the result; the notice offers only Undo.

**In VR and AR** the toolbar becomes the hand menu, with text labels (a pointing ray has no
reliable hover) and the same order: Analyze, Layout, View, Legend, Quick actions, Exit. Its Rows
page lists the tree's top-level rows with swatches and eyes, Notes included; the per-row solo
control is named "Show only this row", as the desktop's Alt-click is. **Needs graphty-element:**
the element has no in-headset menu API, so the hand menu is drawn as a design target with that
mark.

Where everything else lives:

| Not on the toolbar | Where it lives | Why |
|---|---|---|
| Saved views, Present, tours | the Views place (section 4) | a saved view is a named thing the user made |
| Labels, arrows | style properties on rows (section 16) | owner: styling is left to the user |
| Note markers | the Notes row's eye | section 3.7 |
| Minimap | nowhere; filed as a graphty-element feature | the element has none |
| Layout method, options, seed | the graph's Layout section | a setting lives on what it configures |
| Re-run layout, Reshuffle seed, Unpin all | the canvas menu (the graph's "..."), Quick actions | commands, not properties |
| Filters | Data > Filters, opened by the header's filter chip | owner: filters belong with the data |
| Styling | a row's Style tab | styling goes only through style layers |
| Find | / and the tree's search field | navigation, not a canvas command |
| Undo and redo | header buttons, Mod+Z, Shift+Mod+Z | global |
| Export | the Export dialog (section 12) | owner: Export... in the project-name menu |
| Table and time slider | the bottom dock (Shift+T) | places, not tools |
| Add note | the selection bar, context menus, N | owner: no separate Note tool |

Rejected: a left or movable toolbar; a Camera button separate from View (two buttons for "how am
I looking"); a Layout flyout (pause must take one click); Legend as a checked item in View (its
state would be hidden at rest); keeping Select (a mode with one possible value); text labels.

Round 7 first-click tasks, worded without the button names: "how is A connected to B?", "stop the
graph from moving" (with a node selected), "go back to the picture you kept on Monday", "show what
the colors mean". If fewer than about half of first clicks find the Layout or View icon, a label
experiment comes back to the owner.

### 2.4 The Data place, the Data page, and what to take from Tableau

**Studio decision: the rail place stays "Data", with three sections: Sources, Filters,
Attributes. Bringing data in, joining tables and choosing how they are read happen on one Data
page, which replaces the load dialog for every load, one table or many (section 11.3). Each fact
about a column has one home.**

Owner decisions this carries: loading several sources and joining them on any key column is a
primary task; weight is defined when the data is loaded; blending is out of scope; live sources
are later (issue #643).

**One home for each fact about a column:**

- **Roles** -- which rows are nodes and which are edges, the key, the links (From, To, Links to),
  the type, Name, Time, Weight, the edge id and the positions -- are chosen on the Data page,
  under each column's header. A change that alters the graph's structure reloads; Name, Time and
  Weight apply without a reload where graphty-element allows. **Name may be one or more columns**
  (studio, `owner-questions-5.md` section 3, item 12): each column given Name joins it, in column
  order, with a space, and every such column shows one role chip, "Name: given + family". The
  page proposes it when it finds name-like columns (`attributes.name`, or its `given` and `family`
  parts). Every surface that names a node -- the inspector title, the canvas walk, the table's
  Name column, a set's members, search and note targets -- shows that one Name, never one part.
- **Read as** -- an attribute's data type (Category, Number, Time) -- belongs to the attribute and
  is changed in its inspector, with no reload. The Data page shows the type glyph under each
  header, read-only. While a loaded source is edited it links to the attribute; before Load it
  is a mark only (the attribute does not exist yet, and leaving would drop the load), its tooltip
  saying Read as is changed in the attribute after Load.
- The attribute's inspector shows its roles as read-only tags ("Weight, set when loaded"; "Name
  for person"), each a link that opens the Data page at that column.
- **A run's weight** defaults to the loaded weight. A run may override it in Analyze; the
  override is that run's own setting, recorded in its Made with, and never writes back.

**What graphty takes from Tableau.** Version 3 concluded that a graph file leaves the reader
nothing to model. That is withdrawn: as the owner pointed out, the reader must say which field
holds the ids, and several tables need their keys and links chosen.

| Tableau | Call | Reason |
|---|---|---|
| Data Source page | Copy, as the Data page for every load | joining is now a primary task (owner); one page whether it holds one table or six, as in Tableau and Neo4j's Data Importer, so the job has one home |
| Connect pane (File, URL, Paste) | Copy | the page's "+" offers File..., From a URL..., Paste... |
| Roles set in the data grid's column headers | Copy | Key, From, To, Links to, Type, Name, Time, Weight, Edge id, Position, or Attribute (Cytoscape's import does the same) |
| Typed fields | Copy | one glyph and one word per type everywhere: Abc Category, # Number, calendar Time (no Ordered until graphty-element has an ordinal level) |
| Relationships on fields of any name | Copy the meaning, skip the drawing | a link column names the type it points at, whatever the columns are called; the read-only model strip shows the result, each line's tooltip naming its keys |
| Join types (inner, left, full) | Skip | every link is "some records match"; the match report's Add / Leave out choice decides unmatched rows, so the reader never meets a join type |
| Cardinality and level of detail | Adapt | "One edge per: Row, Pair", with a combine choice per column |
| Unmatched values kept, not dropped | Adapt | the match report counts them; Leave out is the default (Neo4j), Add is one click (Gephi's "Create missing nodes") |
| Data source filters | Copy (already in place) | filters run before anything is computed; the eye is the drawing-only hide |
| A filter written as a sentence | Copy | a step reads [amount] [is at least] [1,000] |
| Refresh, warning about removed fields | Copy | before Apply: "region is gone; Community 3 colors from it" |
| Calculated fields | Copy, needs graphty-element | "+" on Attributes; the element removed its expression evaluator on purpose |
| Data Interpreter | Adapt (mostly exists) | graph-io's detection; the match report lists warnings first |
| Unions | Skip as a feature | "Add to this graph" already appends; "only March" is a time filter step |
| Dimension and measure | Skip | that split is about aggregation; "measure" already names a paint row |
| Blending | Skip | owner: out of scope for now |
| Live versus extract | Skip for now | owner: a future enhancement (issue #643); the project keeps a copy of each source |
| Pivot, split | Skip | no task asks for them |
| The word "field" on screen | Skip | the screen word is "attribute"; Find and Quick actions accept "field" as an alias |

From other tools: Neo4j's Data Importer (a key guessed from "id" in the column name; a check on
every table before Load; empty keys left out by default); Gephi (creating missing nodes as an
explicit choice); Kumu (one type per sheet); PyGraphistry's hypergraph (an event row as a node).

Rejected: a drawn relationship canvas (the link column already says what links to what, so
drawing would be a second way to set a role); join types; the word "join" on screen; a dialog for
one file beside the page; a third kind of table ("columns by key" is a node table whose type
already exists); a rail place of its own for sources; projection at load (people linked through
shared buildings is a derived graph, made through New graph from...).

Round 7 checks, worded without "join", "table", "key", "source", "attribute", "field" or
"weight": "each entry should connect the person to the building"; "how many entries pointed at
nobody?"; "show how often each person used each building"; "make each door entry something you
can click"; "find the shortest chain of shared buildings between Ann and Bo" (does the tester read
how often a building was used as closeness, not distance?); and on the transfers data, "make the
account names come from the second file", "amount looks wrong" (Read as), "only March" (Filters).

### 2.5 One pattern per job

The owner's third review asked where interaction patterns can be the same. These rules hold on
every screen; a screen that breaks one is a defect.

| Job | The one pattern |
|---|---|
| Show an unset value | A property not set is not drawn. Its section's "+" adds it. Inside a popover only, an unset field shows its effective value in gray, its source in the tooltip ("Verdana, graphty-element default"); typing sets it. |
| Add | "+" in the header of the list or section it adds to, nowhere else. One possible item: "+" adds it. Several: "+" opens a dark menu; past 15 items it is the field list's menu size instead. None left: the "+" disappears. The new item gets a default name and opens into rename, its value focused. |
| Edit a value | Numbers and text in the field (drag the name to scrub a number; Enter commits, Esc reverts). Colors and choices: click the value to open its picker. |
| Advanced options | In the popover the value opens, never an accordion in anything editable. A line whose value is typed in place (Label text) has a swatch that opens its popover. |
| Find or pick an attribute | **The field list**, one component in two sizes: panel (Data > Attributes, the inspectors' "N more attributes", the table's columns) and menu (bind, Label, Color by, Size by, Width by, a filter step, a link's "by" column, Go to column, the Weight line of Analyze, the Path popover and a run's Made with, a recipe's binding choice, and Select where's Insert attribute). An attribute picker is the field list at every length, drawn as a dark menu with its groups, so it never changes form when the data grows. Search past 15 items, matching the start of words (names split at `_`, `.`, `-`, spaces and case changes; "vu cr", "cpu p95"); groups by table, open; inside each, "In use (n)" first (painted by a row, in a label, filtered on, read by a run, or holding a role) with what uses each, from graphty-element's `usedBy`, then computed, then by name; folders only from the data's nesting; a typed picker lists unsuitable attributes last, disabled with the reason, suitability coming from graphty-element (a list or a value kept whole is not one value, so Color by and Size by list it as unsuitable: "tags holds several values; use Show as groups"). Focus stays in the find field over a listbox (the Quick actions pattern). Any other list past 15 items (Shape's 25 shapes, the label style's fields) uses the same find field and word-start matching over its own items; other menus of 15 or fewer stay dark menus. |
| Truncation | A middle ellipsis on every attribute name and path (`cpu_util...p95_pct`); an end ellipsis on prose (node names, notes, source names, row names). The full text is always in the tooltip and the accessible name. |
| A problem | One block, what happened and what to do, with at most one action: the Data page's refusals, a failed save, a binding that reads nothing. |
| Read-only blocks | Collapsible, with a chevron, a one-line summary when closed, and the state remembered per kind ("Why this look", Data tab sections, Notes). |
| Surfaces | **Dark menu**: choose a command or one item; no title; closes on the pick; one line per item, a second line only for why an item is disabled. **Light popover**: edit a value; a title and an X; applies each change live; Esc or a click outside closes it; a footer button only when it creates something. **Page**: takes the workspace while the rail and header stay (the Data page, Version history, Compare). **Modal**: takes over the screen (export, apply a file, settings, shortcuts) or confirms what cannot be undone. |
| Popover placement | One helper: left of the inspector (or above the toolbar for toolbar popovers), level with the anchor; focus to the first field; on close, focus back to the anchor without redrawing the panel. |
| Tooltip | One component for every icon-only control in the app. Name plus key as a key chip ("Analyze  Shift+A"); a second line only for a disabled reason or a modifier gesture; never a sentence or a menu's contents. 500 ms of hover before the first; immediate for a neighbor within 1 s of the last one hiding; immediate on keyboard focus (`:focus-visible`); Esc dismisses; the pointer can rest on it (WCAG 1.4.13). Touch: a tap acts; a 500 ms long press shows the tooltip without acting, and it stays until the next tap. The bubble is hidden from speech; the name is the control's label and the key its `aria-keyshortcuts`. Nothing needed to finish a task lives only in a tooltip. Native `title` attributes are not used. |
| Rename | Double-click or F2, on every name (rows, project, graphs, folders, sets, sources, saved views). Enter or click away saves; Esc cancels; Tab renames the next. A name that cannot change ignores the gesture and gives its reason in its tooltip. |
| Delete | Acts at once (Delete or Backspace on a focused row, "Delete  Del" in menus) and shows the notice "Deleted Louvain and 6 groups. Undo". Only what cannot be undone asks first, and today that is only Forget all keys: Clear graph data and a layout change are single steps in graphty-element's undo history (`session.undo`), so they act at once with the Undo notice. A confirmation is "[Verb] [thing]?", one sentence on what is lost, Cancel and the verb. |
| Two-state commands | The label names the action it will perform: Pin / Unpin, Lock / Unlock, Hide in list / Show in list. Both show only for a mixed selection. |
| On and off | **Eye**: a row is drawn or not (tree rows only). **Checkbox**: a thing applies, or membership (a filter step, a view in the tour, a boolean property in a panel or dialog). **Switch**: Settings only. |
| Choices | A segmented control for 2 to 4 short options, System first where it appears; a dropdown for 5 or more or long labels. Every segmented control and single-select list is one Tab stop; arrow keys move and select. |
| Menus (keyboard) | One model, built once: Up and Down move, Home and End jump, typing a letter jumps; Right or Enter opens a submenu and Left closes it; Esc closes one level and returns focus to the opener; hovering a submenu item opens it after 200 ms. |
| Lists (left panel) | Click selects; double-click or F2 renames; right-click, Shift+F10 or a "..." shown on hover, focus and the selected row open the same menu; drag the whole row or Mod+] and Mod+[ to reorder; Space toggles the row's one on/off control; Delete deletes. |
| Notices | One notice, owned by the shell: centered 8 px above the lowest bar (the toolbar, or the selection bar), 6 s, paused while hovered, one message and at most one action (Undo). A started run shows no notice. |
| Empty states | One gray line naming what goes here, with the add verb as a link: "No notes. Add note (N)". No buttons, icons or footnotes. A filter with no matches reads `No match for "x"`. |
| Disabled | Grayed, `aria-disabled` (still focusable), does nothing on click, reason in the tooltip; in a menu, the reason on the item's second line. A control that needs graphty-element is drawn this way with that reason. |
| Ellipsis | Only on a command that asks for more input before it acts. |
| Selected and open | Blue fill: a toggle that is on, or the selected item. Gray fill: a button whose flyout or popover is open. Focus ring only on `:focus-visible`; a state's initial focus goes to what it opened. |
| Icons | One meaning per icon: bookmark = views; circle-check = sets (Create set adds a plus); layers = community runs; list = legend; message-square = notes; funnel = data filters only; ellipsis = list options; arrow-left-right = swap sides; cube and square = view mode; eye and eye-off = drawn or hidden. Tree rows and inspector headers use the same kind icon. |
| Field rows | Label column 88 px in the inspector and 96 px in popovers; 24 px rows; 8 px row gap; labels top-aligned to their control; long labels are shortened, never truncated. |
| Design notes | "Open question" and "needs graphty-element" share one annotation chip, placed after the control it qualifies, its text in the tooltip. The review bar's "Hide design notes" hides every annotation **and every menu item that needs graphty-element**; the owner reviews with notes showing, user tests run with them hidden. |

---

## 3. The paint tree (Graph place)

The Graph place is the rail's default. Top to bottom: the **Graphs switcher** (the panel's title
line: a quiet "Graph" prefix, the current graph's name, its note count, a chevron), the
**treebar** (the search field "Find rows and notes" and the list-options button, an ellipsis),
the **tree**, and one **footer line**.

The Graphs switcher's menu lists the project's graphs, one line each (name and node count; how it
was made is in the tooltip). A click switches at once; a double-click renames. It also holds
**Compare graphs...** and **New graph from...** (derived graphs: extract, bipartite projection,
quotient, combine, null-model sample) -- one item, needs graphty-element (the element has no
transform API), hidden in the user-test build. Loading a file as a new graph is the Data page's
"Load into: New graph".

### 3.1 The central rule

**Every row in the tree can paint the graph. Reading the tree top to bottom is paint order, and
a higher row wins, property by property.** Selection is pinned at the top and Everything at the
bottom (owner). Notes starts directly under Selection and Overrides under Notes.

One exception, from the owner's rule that every run is a row: a run whose outputs are only
graph-level readings or a list of pairs has nothing to paint, so its row has no eye and takes no
part in paint order.

### 3.2 Row kinds and icons

| Kind | Type icon | Example | Children |
|---|---|---|---|
| **Selection** (built in, pinned top) | a dashed box | "Selection" | none |
| **Run** | the kind of what it produced: a bar chart for a measure run, layers for a group run, a route line for a path run, a gauge for a readings-only run | "Louvain" | its paintable outputs |
| **Measure** | `#` (number), a calendar (time), or the run's measure icon | "PageRank", "riskScore" | none |
| **Group** | a filled circle in the group's color | "Community 3", "kind is merchant" | none, or its own groups when it came from a categorical attribute |
| **Path** | a route line | "Valjean to Javert" | none |
| **Set** | circle-check | "Watchlist", "Group 2" | none |
| **Folder** | a folder | "For the report" | any rows the analyst puts in it |
| **Notes** (built in) | message-square | "Notes" | none |
| **Overrides** (built in, shown once it holds something) | a pencil | "Overrides" | none |
| **Everything** (built in, pinned bottom) | a base-layer glyph (stacked layers, bottom marked) | "Everything" | none |

- **A run is named by its algorithm** ("Louvain"); a second run of the same algorithm beside it
  is "Louvain 2". Parameters live in the inspector's kind line ("Run, resolution 1.0") and Made
  with.
- A measure run that produces one value per node, or per edge, is a single row: the run and its
  measure are the same row ("PageRank", "Edge betweenness"). An edge measure's icon carries an
  edge mark and its Style tab opens on Edges. A run with several paintable outputs is a run row
  with them as children (HITS: Hub score and Authority score).
- **A run that finds one set of elements** (bridges, articulation points, a k-core, the largest
  clique, the diameter path) adds a single group or path row.
- **Every result shape the element publishes has a row**, chosen from the catalog's declared
  shape, never the algorithm's name: an edge set (spanning tree, matching, min-cut) is a group
  row of edges; a node set is a group row; a layered grouping (breadth-first levels) is a group
  run with one child per level; a category table is read on the run's Data tab and item tab.
- **A hierarchical partition** is one run row whose children are the groups of one level; the
  **Level** is a run setting in its Made with (it decides which child rows exist). Run as copy
  fixes a level as its own sibling row.
- **A run over time windows** is one run row; which window it paints follows the time slider
  ("PageRank, week 12 of 20").
- **A graph-level reading with a per-element counterpart offers it** (transitivity offers local
  clustering as a measure child).
- **A readings-only run** is still a run row, with the gauge icon and no eye.
- **Painting an imported attribute adds no new row kind.** Color by or Size by on a number or
  time attribute adds a measure row named after the attribute; Show as groups on a category adds
  a group row with one child per value; Label by adds a row named after the attribute, with the
  attribute's type glyph, whose Above label line is bound to it and which paints every element
  that has a value (a measure row in kind: one bound property).
- **Covers, flows and pair lists**: a cover is a group run whose children may share members; a
  flow is a run row with an edge measure child; a pair-list run has no eye and a pair icon.
- **A comparison is transient until it is kept** (conceptual model 1.4, "looking leaves nothing
  behind"; top task 10). **Keep as row** in the comparison panel makes it a run row (section 9,
  full-canvas modes), with its per-element difference as a paintable child and its statistic on
  its Data tab.
- **The overview adds no rows.** Compute the overview fills readings into the graph's Overview
  and per-node values into Data > Attributes, where Color by makes a measure row on request.
- The row kind is never printed as a word on screen; "measure row" is a word for documents.

### 3.3 A row, left to right

Disclosure triangle (parents only), **kind slot** (the type icon, or a status icon: spinner while
running, clock while queued, warning when partial or out of date, error when failed, funnel when
computed before the current filter), swatch (a ramp for a measure, a color for a group, empty when
the row paints nothing), name, then **fixed right-aligned slots**: member count (groups, sets,
paths, the Notes row), note count, and one 16 px slot shared by the lock and the eye.

- The **count column always counts members**. The Notes row's count is its noted elements, with
  the tooltip "3 nodes notes are about"; it never shows a speech-bubble count of its own. A count
  is blank when empty. A collapsed run shows its group count ("6 groups").
- The lock shows always on a locked row; on an unlocked row it shows on hover, where the eye then
  appears.
- **The only line under a row is a running progress bar.** Every other state is the kind-slot
  icon, with the sentence in the row's tooltip, its accessible name ("Betweenness, running") and
  the inspector's state bar, which holds the verbs (Cancel, Retry, Rerun on current filter).
- **Scope and freshness** (conceptual model 4.5 and 7.2: a different scope is not out of date):
  when filter steps change after a run, the funnel status reads "Ran on 3,000 nodes; a filter now
  leaves 812"; the result keeps painting. Only when the data it read changed is a row **out of
  date** (warning icon).

### 3.4 Nesting and lock rules

- **Nesting means "came from this run".** A folder's children are what the analyst put in it.
  Nothing else nests. Folders nest one level only.
- **Run children are locked to their run.** They reorder only within it. **Keep as set** on a
  child makes an independent set row on top, named after the child ("Group 2"), that survives a
  rerun.
- **Kind rules for drops.** Rows drop into folders and at the top level; nothing drops into a run.
  An invalid target shows the no-drop cursor and a one-line reason under the pointer (the one
  inline reason the tree keeps, because the pointer is busy).
- **Selection, Overrides and Everything cannot move**, be deleted, be renamed or go into a
  folder. **Notes** keeps its name and cannot be deleted, but drags like any row.
- **Lock / Unlock** (row menu, Mod+Shift+L) freezes a row's position and style. A locked row can
  still be hidden.

### 3.5 Precedence

**Paint order is the tree read top to bottom, depth first. A parent's own style sits just below
its last child.** Whatever is higher wins, so position and paint cannot disagree. A node in two
rows takes each property from the higher row; the lower row's paint-order line says so ("Covered
by Watchlist for Color on 9 of 40"). Reordering is dragging in the tree. A folder's rows stay
adjacent. The groups of one partition do not overlap, so their order is list order only; a cover
is the exception, and its run's Style tab offers "Shared members: higher group, or a mixed mark".
Several runs fighting over color is expected (owner); the newest lands on top.

### 3.6 The eye, solo and hiding

- **Eye**: shows or hides that row's paint on the canvas. It never hides members, never removes
  them from the layout and never changes what is computed. Undoable. Saved.
- **Solo** (Alt-click an eye, or Alt+Space): only that row paints, plus Everything if its eye is
  on. Alt-click again restores the previous eyes. Its tooltip line: "Alt-click: show only this row".
- **Eye on Everything**: hiding it switches off graphty-element's own default layers. **Needs
  graphty-element** (`addDefaultStyle` is parsed and never read), drawn with the mark. The footer
  line reads "Everything is hidden. Unpainted nodes still take part in the layout. To leave them
  out, filter." with a Filter link (owner).
- **Hide in list** (row menu): removes the row from the list only; its paint is unchanged (the
  tooltip says so). **Show hidden rows** in the list menu shows them dimmed, with Show in list.
- **Hide on canvas** (selection bar, Mod+Shift+H) stops drawing chosen elements. It is reported in
  the tree's footer line, "4 nodes hidden on canvas. Select, Show", whether or not the legend is
  open. **Show hidden elements** is the same command in the main menu. **Needs graphty-element:**
  a draw-only hide that also hides incident edges; drawn with the mark.

**The footer line.** One line under the tree, one style; the most specific message wins: Everything
hidden; elements hidden on canvas; "1 hidden row still paints. Show hidden rows"; the empty tree's
"Analyze (Shift+A) to add results here" (with no graph: "Add data to start").

### 3.7 The built-in layers

- **Selection** is always the top row. It edits graphty-element's `selectionStyle`, whose only
  fields are color, scale and opacity, shown as three lines: **Color, Size, Opacity** (percent),
  with no "+", bind or "-". The values are project settings (`session.config.set({selectionStyle})`,
  one undoable step). Its count follows the selection and is blank when nothing is selected.
  Its eye, for screenshots, **needs graphty-element**: the element draws the selection highlight
  outside the layer stack and has no switch to stop drawing it, and the app must not fake one by
  writing opacity 0 (that would overwrite the reader's own Opacity). Drawn with the mark. **Needs
  graphty-element**: the default gold on the default canvas is about 1.3:1, under WCAG 1.4.11's 3:1.
- **Notes** paints **only the nodes and edges notes are about**. It is ordinary style layers
  whose selector reads graphty-element's note count (``notes.count > `0` ``), with no look of
  the app's own (owner principle: styling is left to the user). Because graphty-element refuses
  a layer that writes nothing and a layer paints nodes or edges, not both, the row holds no layer
  until the reader adds a look: the first look on its Nodes side adds the node layer, the first on
  its Edges side the edge layer -- the Everything row's pattern (studio decision, API review). Its Style tab is the
  shared component, with a Nodes and an Edges side; its Paints line reads "Paints 4 nodes, 1 edge
  (noted). Nothing set -- + to add a look". Its eye is the only switch for note markers. It keeps
  its name and cannot be deleted. Version 3's request for a reserved notes layer is withdrawn: an
  ordinary layer does the job, the same way for the app and any other consumer.
- **Everything** is always the bottom row. It **is graphty-element's own default layers** shown as
  one row, so hiding it "shows only what other layers show" (owner). It uses **the same Style tab
  as every row** (section 16): its set lines are the element's base style (nodes: shape icosphere,
  size 1, color #6366F1; edges: line solid, the default width, color darkgrey, arrow head normal),
  every other property behind "+". **Editing it works today (studio decision, API review):** the
  element's two default layers are locked (`source.by === "element"`, edits refused with
  `E_PROTECTED`) by design, and the element's intended door for "restyle every node" is an
  ordinary layer with `selector: { match: "everything" }`. So the Everything row is the element's
  locked defaults plus one such layer per side, created on the first edit and kept directly above
  the defaults, under every other row. A line the reader has not changed shows the element's value
  and has no "-" (tooltip: "graphty-element's default; change it to override"); changing it, or
  adding a property with "+", writes only that value into the Everything layer; "-" on a changed
  line removes the reader's value and the element's default shows again. The app never copies
  the defaults into its layer: the layer holds only what the reader changed. **Still needs
  graphty-element**: hiding the defaults (the eye, 3.6). Its Data tab says only what it covers.
- **Overrides** holds one-off edits to single elements, written from a node's or edge's "Why this
  look". It appears below Notes once it holds something. Its inspector is one body, a list of
  edits: one line per element and property ("Valjean  Color  #E41A1C"), the value editable, "-"
  on hover to remove it. A shared Style tab cannot describe it, because each element carries its
  own value. **To confirm with graphty-element**: one id-keyed binding per property
  (`encode` with a per-value `map`) as the element form of Overrides.
- **Collapse on canvas** (group or set row menu) draws the members as one node. **Needs
  graphty-element** (no aggregate drawing); drawn with the mark.

### 3.8 Folders, the list menu and sets

- **Mod+G is one command, "group what is selected"**: selected rows make a folder, selected canvas
  elements make a set; its menu label names the result ("New folder  Mod+G", "Create set  Mod+G").
  Ungroup (Mod+Shift+G) dissolves a folder and keeps its rows.
- **The list menu** (the treebar's ellipsis): New folder, Show hidden rows (with a check when on),
  Collapse all.
- **Sort** (paint order, size, name, date) is on a run's own find line, which appears when the run
  is expanded past 20 groups.
- A set collection loaded from a file arrives as one folded folder; its home is Data > Sources "+".
- **Create set** (Mod+G, selection bar) makes a set row on top. **Keep as set** turns a group
  child into a set. **Select top N...** on a measure row selects the top of a ranking (ties kept
  whole); Create set then keeps it.
- **Combine**: with two or more group, set or path rows selected, the row menu offers Union,
  Intersect, Subtract and Exclude; each makes a new set row and leaves its inputs.
- **Create set where this is...** (an attribute's menu, Find's menu) makes a rule set that follows
  the data, marked with a small rule glyph. It is not named "Select where...": selecting leaves
  nothing behind (conceptual model 1.4), and this command keeps a row; its label names the result,
  as Mod+G's does. It paints and never filters; to compute on it, use Filter
  to....

### 3.9 Hundreds of groups

A run row with many groups arrives collapsed (owner). Expanded, it lists groups by size with
their own colors for as many as the palette tells apart (about ten), then one "274 more
communities" row with a shared swatch -- the same wording in the legend and the inspector. The
run's find line filters its children by name or member. **Show members in table** (the run's
"...") opens the run's item tab. Recoloring a group edits a slot in the run's layer; it never adds
a layer.

### 3.10 Selecting and renaming rows

Clicking a row selects it: the inspector shows that row and its members are marked in the table.
Outlining its members on the canvas **needs graphty-element** (the hover layer taking a set). The
tree is one Tab stop (roving focus on the selected row, refocused after every redraw); arrows,
Home and End move; Left and Right collapse and expand; Space toggles the eye; Enter opens the
inspector; Shift+F10 opens the row menu; Delete deletes with Undo; Mod+] and Mod+[ move a row up
and down.

**Rename (owner: double-click, like Figma):** the first click selects the row in place without
redrawing the tree, so a double-click at normal speed turns the name into a field with the text
selected. Enter or click away saves; Esc cancels; an empty name restores the old one; Tab saves
and renames the next row, Shift+Tab the previous. Each rename is one undo step, announced
("Renamed to X"). F2 renames the focused row (Ctrl+R would reload the tab). Touch: double-tap.
Duplicate names are allowed. A name that cannot change ignores the gesture; its tooltip says why.

| Row | Element call | Status |
|---|---|---|
| Group, measure or other style-layer row | `styles.update(id, {name})` | works |
| Set, kept path | `sets.rename(id, name)` | works |
| Run | none (`label` is read-only) | needs graphty-element; the tooltip gives the reason |
| One group of a run ("Community 3") | none; groups renumber on rerun | needs graphty-element; the tooltip says "Keep as set to name it" (Keep as set is in the row's "...") |
| Attribute | none | needs graphty-element |
| Saved view | none | named once, before it is saved (section 4.1); renaming later needs graphty-element |
| Folder, project, graph, source | app state | works |
| Selection, Notes, Overrides, Everything | -- | built-in rows keep their names |

A measure row's name is its legend title. The app keeps no name table of its own for any element
object.

### 3.11 Empty and first states

- Before any run or set: Selection, Notes, Everything, and the footer line "Analyze (Shift+A) to
  add results here", with Analyze as a link.
- A queued row shows the clock icon ("Queued, 2nd" in its tooltip). A run the element reports as
  not cancellable shows progress with no Cancel and the tooltip "This step cannot be stopped".
- A failed run stays as a row with the error icon and the element's message in its tooltip and
  state bar. A GPU run that fails is never quietly finished on the CPU.

---

## 4. The rail

Top to bottom: **Graph** (the tree, the default), **Data**, **Views**, **Notes**, **Assistant**.
The rail holds only places; the main menu button is in the header (section 9). Rail places have
no hotkeys; Quick actions reaches each by name.

| Place | Question it answers | Contents |
|---|---|---|
| Graph | What paints the graph, and in what order? | Graphs switcher, the tree |
| Data | What is the data, how is it read, and what is it computed on? | the graph switcher row, Sources, Filters, Attributes |
| Views | What have I framed, and in what order will I show it? | saved views, Present, tours |
| Notes | What has been written, and about what? | every note, newest first |
| Assistant | What can I ask? | one conversation at a time |

A rail button names a collection, never an activity; Present and Export are activities and get no
rail button.

### 4.1 The Views place

- **Header**: the title, then icon buttons with tooltips: **+** (Save view), **play** (Present),
  **...** (Export tour video...).
- **Saved views**, in an order the user drags. That one order is the findings report's page order,
  the presentation order and the tour order. Each row: a thumbnail (the element's thumbnail
  capture, taken on save and on update), the name, and an **In tour** checkbox in the trailing
  slot. The order and In tour are held by the app as a labeled temporary workaround, drawn with
  the mark: the element's `exportCameraPresets` returns an unordered record with no tour
  membership (an ordered collection is filed).
- **Save view** (this "+", or the View flyout) opens the Views place with a new row whose name
  field is already open ("View 4", selected). Enter saves the name and the camera together (the
  element's `saveCameraPreset`); Esc saves as "View 4". No popover and no notice: the new row is
  the feedback. A name that matches a standard view ("Top") shows the inline error in place,
  worded from the element's own refusal (`E_PROTECTED`).
  Built-in views are not listed here: they are the View flyout's Standard views.
- **Row menu**: Rename, Update to current camera, Delete (section 10.3's order). Delete works today (the element's
  `removeCameraPreset`, one undoable step) and shows the Undo notice like every delete. Rename
  needs graphty-element (no rename for a saved view; saving under a new name and removing the old
  one would be an app wrapper over a missing call), drawn disabled with the reason.
  Exporting a view goes through Export, where the view is a choice in the View field.
- **A view's inspector** (one body): the thumbnail (the camera's numbers in its tooltip), **Mode**,
  **Caption** (its one editable property, edited in place: Enter saves, Shift+Enter a new line,
  Esc cancels; "Shown under the view in Present and the findings report" as its placeholder), and
  **Keeps: Camera** with one needs-graphty-element mark. The conceptual model says a view captures
  the working state (rows on, filter steps, hidden elements, the Look, positions); today the
  element stores only the camera, and the model does not shrink to fit. The mark's tooltip names
  the missing view snapshot.
- **Present** is a full-canvas mode (section 9): arrow keys step through the views checked In tour,
  in order; Esc leaves. The caption shows the view's name and caption. **Lock the canvas** (a
  checkbox, the element's `setInputEnabled(false)`) is off by default and remembered per project.
  On the last view, Next is disabled. Present shows the current rows' paint until the element
  stores a view snapshot. With no saved views, Present is disabled with "Save a view first".
- **Export tour video...** opens Export > Video with View set to "Tour of saved views".
  Disabled in 2D with the reason until the element accepts 2D waypoints (to confirm).
- With no saved views: "No saved views. Save view (+)".

---

## 5. The inspector (right panel)

**Studio decision: one frame for every kind of selected thing, and one rule for what it holds.
The right side shows the properties of the selected thing, read and edited in place. It holds no
verbs, with one exception: the state bar's one or two buttons, which commit or undo a pending
property edit (Rerun, Revert) or answer the lasting state the bar reports (Refresh, Try again,
Rerun on the current filter).** A style is a property and is edited where it is read. Re-run layout, Keep as set, Show
in table and every other verb live in the thing's "..." menu, which is its context menu.

### 5.1 The frame

1. **Header, two lines, on every kind.** Line 1 (24 px): the same kind icon and swatch as the
   thing's tree row, the name (double-click or F2 renames), and a lock when locked. Line 2 (20 px):
   the kind word, a lowercase provenance link ("from Louvain, Sep 28"), and **"..."**.
2. **The state bar**, only when the thing needs a costly commit or reports a lasting state: one
   line under the header with at most two buttons, visible on both tabs ("Settings changed since
   the run -- Rerun | Revert"; "Ran on 77 nodes; a filter now leaves 60 -- Rerun on 60";
   "The data at this address changed since Sep 29 -- Refresh"). It is the **only button in any
   body**. A link elsewhere is an inline link in the sentence, never a button. The reason, when
   long, is in its tooltip.
3. **Tabs: Style, then Data**, 32 px. A kind with one body has no tab strip, and its body starts
   right under the header. The tab last chosen stays chosen as the selection changes, remembered
   per kind.
4. **Style tab**: the **Paints line** (count first, a link that selects: "Paints 10 nodes";
   "Paints 77 nodes (every node with a value)"; "Paints the selection (none yet)"), directly under
   it the **paint-order line** in one grammar ("Covered by PageRank for Color on 10 of 10";
   "Covers Louvain and 3 more for Color", the extra rows in a popover), then the property sections
   (section 16).
5. **Data tab, always in this order, any empty section left out**, every section collapsible with
   a one-line summary:
   - **Summary**: Size first ("10 nodes, 14 edges", a link that selects them), then readings. Never
     editable fields, except an attribute's Read as (5.2).
   - **Members** or **Values**: the distribution (one histogram component: an axis, drag across
     bars to select) and **Top 10** (ties kept whole), each name selecting what it names.
   - **Made with**: settings that differ from the default as editable fields (runs and layout
     only), "All options..." (a light popover listing every option from the element's schema),
     then provenance as read-only rows in a fixed order (Created from, Scope and Data version only
     when they differ from the current graph, Ran).
   - **Notes** (on every kind that can be a note's subject, section 2.1): "2 notes -- Open in
     Notes", or "No notes. Add note (N)" with Add note as a link.
6. **Counts are links that select what they count**; the table follows the selection.
7. **Density**: 24 px rows, 32 px section headers, 16 px inset, at most two levels of disclosure.

### 5.2 Kinds

| Selection | Tabs | Style | Data sections |
|---|---|---|---|
| **Nothing** (the graph) | Style, Data | Canvas, Layout (5.3) | Overview, Notes |
| **One node** | Style, Data | **Why this look** (5.4) | Summary (the attributes in use, then results with rank; Degree is the link that selects the neighbors; then one disclosure, "67 more attributes", that opens the field list in place, with attributes that have no value on this node counted, "10 empty", not listed; a value kept whole shows as a collapsed tree), Memberships, Notes |
| **One edge** (from the table, a row, or a node's inspector; edges cannot be picked on the canvas) | Style, Data | Why this look | Summary (Direction, the attributes in use with the weight marked by a small icon, results once there are any, then "N more attributes" as on a node), Memberships, Notes |
| **Several elements** | Style, Data | Why this look with coverage | Summary (the names list as the Size row's tooltip, induced and cut edges, the same rows in the same order as a node's), Memberships ("3 of 5"), Notes |
| **Group, set, path row** | Style, Data | fixed values | Summary, Members (top 10 by the run's ranking or by degree), Made with, Notes |
| **Measure row** | Style, Data | the bound property (section 16.5) | Values (histogram with the caption "77 of 77 have a value, 0.0033 to 0.0754, median 0.0124"), Top 10 (Show all in table is in "..."), Made with, Notes |
| **Run row** | Style, Data | Fill color bound to the run's groups | Summary (readings: modularity, number of groups), Sizes (a histogram of group sizes for any number of groups), Made with (including Level), Notes |
| **Readings-only run** | none | -- | Summary, Made with, Notes |
| **Selection row** | none | Color, Size, Opacity | -- |
| **Notes row** | Style, Data | fixed values | Members (the noted elements, each selecting itself; the header links to the Notes place) |
| **Everything row** | Style, Data | the element's base style as lines, editable (3.7) | Summary (what it covers) |
| **Overrides row** | none | a list of edits (3.7) | -- |
| **Folder** | none | -- | Paints line "Paints nothing itself; each row inside paints its own members", Members (its rows with swatches and eyes) |
| **Several rows** | Style, Data | the shared component, differing values shown as "Mixed" with both swatches (tooltip: "A change applies to both rows") | Summary side by side, with short column headers |
| **Attribute** (from Data) | none | -- | Summary (From the table -- named in the header's provenance link --, **Read as** as a dropdown row, its **roles** as read-only tags that open the Data page at that column, completeness), Values (the shared histogram), Painted by (the rows that paint from it, as links) |
| **Filter step** (from Data) | none | -- | the condition as one sentence row ([amount] [is at least] [1,000]), an **Apply this step** checkbox, the count before and after, Notes |
| **Saved view** (from Views) | none | -- | section 4.1 |

- **Read as**: Category, Number, Time (the type glyph's word everywhere). Changing it
  needs graphty-element (no attribute type override yet); drawn with the mark. Ordered is not
  offered until graphty-element has an ordinal level.
- **Roles** (Key, a link, Type, Name, Time, Weight, Edge id, Position) are tags here, chosen on
  the Data page (section 2.4). The weight tag reads "Weight, set when loaded -- every run uses it
  unless the run picks another"; a node-weight tag that no measure reads adds "No measure reads
  node weight yet". **To confirm with graphty-element**: that changing Name or Time after load
  re-derives what depends on it.
- A run's result attribute (PageRank in Data > Attributes) opens its measure row's inspector.

### 5.3 Nothing selected: the graph's inspector

- **Style > Canvas** (element configuration): **Print-safe colors** (a checkbox; the Print look,
  with its grayscale check: owner decision; the shipped looks and the check need graphty-element),
  **Background** (one color field whose picker has a Color | Image tab, Image being a 360-degree
  skybox, the element's `background`), **Hide overlapping labels** (the element's declutter),
  **Show filtered-out nodes faintly** (`visibility.showContext`), **Reframe when data changes**.
  Booleans are checkboxes right-aligned in one control column.
- **Style > Layout**: **Method** (the element's layout catalog, each with its size rating, whether
  it honors weights, and a "Recommended" mark from `recommendLayout`) and **Seed** as lines.
  Clicking Method's value opens one popover: the method list, then its engine, its options and the
  six pacing fields of `layoutBehavior.layout`, under small headings. **Pinned nodes** appears only
  when some nodes are pinned (a count link that selects them). Changing a property lays the graph
  out again at once (the element's `session.layout.set`, one undoable step: undo puts back the
  method, its options and the positions it left, `session.positions` being recorded at rest). No
  confirmation: a method rated for fewer nodes than the graph holds carries Analyze's cost mark in
  the list, with the element's estimate in its tooltip ("Rated for up to 2,000 nodes; the canvas
  stops responding while it computes"), and the notice after the change offers Undo.
- **Data > Overview**: nodes, edges, direction (with where it was settled), density, components,
  the degree distribution, and isolated nodes, self-loops and repeated edges only when not 0.
  Readings not yet computed are one line, "4 more readings not computed", whose link opens the
  graph's "..." at **Compute the overview**. A run's readings live on its row only. The source is
  named once, in the header's "From miserables.json" link.
- When a filter changed the scope under computed readings, the state bar reads "4 readings are for
  all 77 nodes -- Compute on 60". That is the only filtered mark in this inspector.
- "..." is the empty canvas's right-click menu, word for word (section 10.3).

### 5.4 "Why this look"

**Owner: collapsible.** Built with the shared collapsible section; open or closed is remembered
per kind (node, edge, several elements); closed, it shows its winners in one line ("PageRank,
Degree, Selection, Everything").

```
v Why this look
  [ramp]   PageRank     Color
  [gray]   Degree       Size
  [scan]   Selection    Color  Size  Opacity
  [square] Everything   Shape
```

- One line per layer that wins at least one property on this element, highest first, on one grid:
  a 12 px swatch, the layer's name (a link that selects the row), tokens right-aligned, and for
  several elements a fixed coverage column ("14 of 20").
- **Tokens use the Style tab's property names** (Color, Size, Shape, Width, Pattern). The Selection
  line shows Color, Size and Opacity, and appears only while the element is selected; it is read
  from the element's selection state, because selection is not a style layer.
- **A token opens the popover its property opens on a Style tab**, applied live, with one header
  line "Valjean only -- writes to Overrides". Hovering a token shows the resolved value.
- An **Overrides** line has "-" on hover, which clears that property on this element (with Undo).
- A row hidden from the list that still paints is marked with the tree's eye-off glyph.
- Its length follows the rows that win a property, at most one per property, never the number of
  attributes; attribute names in its values take the middle ellipsis.
- Rows that match but win nothing are not listed: the Data tab's **Memberships** is the one home
  for "which rows contain this element".
- The list comes whole from graphty-element's `session.styles.explain()`. Element-owned layers the
  tree does not show (hover) appear locked when they win. **Needs graphty-element:** `explain` over
  a set of elements with coverage (several elements), drawn with the mark.

---

## 6. The table dock, and how it differs from the Data tab

The bottom dock holds the **table** (Shift+T) and the **time slider** (its home is the dock's
options menu; no single-letter key). Its tabs are **Nodes**, **Edges**, and one **item tab** per
open run, named with the run row's name and icon. Canvas, table and inspector share one selection.

**The line: the Data tab describes one thing; the table lists many things side by side.**

| | Data tab | Table |
|---|---|---|
| Unit | the selected thing | many nodes, edges or items |
| Shows | Summary, distribution, Top 10, Made with, Notes | every value of every attribute as a column |
| Members | at most the top 10; the count selects them all | all members, sortable and filterable |
| Editing | the thing's own settings | node and edge cell values (the element's `updateNodes` and `updateEdges`, each one undoable step) |

- **The scope line is the count** ("77 nodes"). Usage hints are in the table's tooltip.
- **Columns** (version 5). The key column is frozen on the left. By default the table shows the key
  and the attributes in use. One button at the end of the tab strip, "Columns: 8 of 69", opens the
  field list (panel size) with a checkbox per row; the key cannot be unchecked. Which columns show
  belongs to this table view and never changes data. It is the only place an attribute can be
  hidden. It replaces "Show columns...".
- **Column headers are one line**: type glyph, name, sort arrow (arrow up or down), and a menu
  caret on hover. The column's profile ("77 values, 1 to 36") is the header's tooltip.
- **Column menu**: the attribute's own menu, minus Show in table: Color by, Size by, Label by, Show
  as groups, Filter to..., Read as..., Show in Data.
- **Row menu**: the node's context menu, word for word, minus Show in table.
- **Remove from data** (the element's `removeNodes`, or `removeEdges` on the Edges tab) acts at
  once with the Undo notice, distinct from Hide on canvas.
- **Show members in table** (a row's "...") sets the Nodes tab to that row's members, with a chip
  naming the row and "10 of 77 nodes"; the row is selected in the tree; removing the chip shows
  every node. It is a view of the table, not a filter step.
- **The Notes column** shows only when at least one row has a note, blank at zero, with the tree's
  note badge.
- **Find** (Ctrl+F) searches the table when the table has focus; there is no separate search icon.
- **The time slider**: play, the track (drag to move the window, drag an end to resize, arrow keys
  step), the window readout, the window-length dropdown, close. Rows inside the window carry an
  accent bar, never the selection tint.

---

## 7. The Data place

The header is the **graph switcher row** (the same component as the Graph place's): filters,
attributes and sources belong to one graph. Then three sections, each built with the shared
collapsible section (a one-line summary when closed: "3 sources", "2 steps, 1 on", "10
attributes") and each with a **"+"** at the right of its header. Rows follow the left-panel list
rules (section 2.5).

1. **Sources** -- the doors to the Data page, one row per table.
   - **A row**: the table's kind glyph (node table or edge table), its name, and one quiet line:
     "person . 412 nodes"; "entries . 4,212 rows, 1,306 edges". A graph file (GEXF, GraphML) is
     one row that expands to its node table and edge table. The trailing slot shows the shared
     warning mark when the table's match report holds an unresolved line or the data at its
     address changed, its reason in the tooltip.
   - **Clicking a row** opens the Data page ("Edit: entries") with that table selected, after
     waiting out the double-click interval, the Notes place's rule, so a double-click on the name
     still renames; Enter opens at once. There is no source
     inspector: the page is the one home of every fact about a source (counts in its tables list,
     the match report, read settings, refresh state).
   - **"+"**: File..., From a URL..., Paste..., Set collection... (a folder of set rows). Each
     opens the Data page with the new table added. Add columns by key... is gone: a node table
     whose type already exists does that job.
   - **Row menu** (section 10.3's order): Rename, **Replace with file...** (the file picker first,
     then the Data page titled "Replace: transfers-2026-03.csv" with every role carried over; when
     every column matches, focus is on Load, so top task 12 is the command, the file and Load),
     **Edit source...** (the Data page at this table), **Refresh** (a URL source), **Remove**
     (this table and what it added; needs graphty-element: which table each record came from).
     **Clear graph data** is in the graph's "..." menu (it acts on the graph).
   - **No extract or live toggle.** The project keeps a copy of each source and replays the load
     on open. Live sources are a future enhancement (owner, issue #643).
   - **A derived graph** has no "+"; its Sources section shows one read-only origin line.
2. **Filters** -- the ordered steps, evaluated top to bottom.
   - **A row**: the rule ("amount is at least 1,000"), the outcome only while the step is on
     ("3,000 to 812 nodes"), the note count when the step has notes (the tree's slot and badge),
     and an **Apply this step** checkbox in the trailing slot (a checkbox,
     not the eye: the owner decided the eye only stops drawing, and a filter changes what is
     computed). An off step is grayed with no sentence. Drag the row to reorder.
   - **A condition on an edge attribute** ("amount is at least 1,000") keeps the edges that pass
     and the nodes at their ends; a node with no passing edge is left out (studio decision: the
     reader of "big transfers" wants the accounts in them, and it is what the fixture's "3,000 to
     812 nodes" shows). The step's inspector says so in one line under the condition.
   - **"+"** opens the step editor (in the inspector) directly; its first field, **Keep**, lists the
     kinds: by an attribute or computed value, the largest component, a k-core, the neighbors of
     the selection. Kinds that compute carry Analyze's cost mark.
   - **Row menu**: Move up, Move down, Add note, Delete. Enter edits, Space applies or not, Delete
     deletes.
   - With no steps: "No filters. Filters change what is computed; the eye in the Graph tree only
     hides." Once a step exists, that sentence is the section header's tooltip.
   - The steps are one "all" rule tree to graphty-element (steps that do not apply left out), and
     each step's count comes from the element's `plan()`. OR and NOT between steps need
     graphty-element. The header's filter chip reads "Full graph" or "812 of 3,000 nodes" with the
     funnel (the steps off are in its tooltip), stays visible from every place and opens this
     section. After undoing a step, the notice names it (owner).
3. **Attributes**, grouped by node type ("person", "building") and then by edge table
   ("entries"), each a plain subhead; a graph with one type keeps the plain Nodes and Edges
   subheads. Computed attributes first (marked by their run icon), then by name. With two or more
   types, each group starts with the built-in **type** attribute (graphty-element's `table.type`),
   so "Color by type" and "Show as groups" need nothing new.
   - **A row**: type glyph (a mark, not a button; tooltip "Read as: Number"), name, role tag on the
     right (Key, Name, Time, Weight), and the shared out-of-date or scope mark.
   - **Clicking a row** opens the attribute's inspector (5.2). Its menu: Color by, Size by (Width by
     for edges), Label by, Show as groups, Place by (position attributes only; any other attribute
     as an axis needs graphty-element), Filter to..., Create set where this is..., Read as..., Edit
     on the Data page, Show in table.
   - **"+"** is New attribute (an expression column), drawn disabled: needs graphty-element.
   - **The list is the field list, panel size** (section 2.5): Find past 15 attributes; inside
     each group "In use (6)" first, each row tagged with what uses it, then computed, then by name;
     a row shows its fill ("20%") when not every element has a value; a nested attribute sits under
     its parent's subhead, named by the full stored path (`attributes.profile.contact` > `email`; Find matches the stored name, `attributes.orcid`), collapsed unless something under it is in
     use. No toggle, no hiding, no hand-made folders.
   - The list, types, completeness and ranges come from the element's `session.data.attributes()`;
     what uses each attribute, its parent and the node type or edge table it belongs to need
     graphty-element (`element-requirements-5.md` section 7).

Graph-level readings are not attributes: they are on the run's Data tab and the graph's Overview.

---

## 8. Notes place

- **Header**: the title and **+** (Add note, N). **Treebar**: "Find in notes" and a filter icon
  that opens All notes, About the selection, About this graph; when a filter is on, the icon is
  pressed and the list heading names it ("About Valjean").
- **Each note**: its text, its **target chips** (a kind icon, or a group's color swatch, plus
  the name), then a **"Cites" line** of dashed chips for the runs it cites, so a cite never reads
  as a target (a cite does not count on the run's row), and one **meta line**: the time ("2 h ago", the full date in its tooltip), ", edited"
  when the note was changed after it was written, and "..." in its trailing slot on hover. **No name is the normal case**
  (owner): the author shows, before the time ("Ada, 2 h ago"), only when the project holds notes
  from two or more named people (graphty-element's `notes.authors()`). There is no "Anonymous",
  no "You", no avatar and no empty slot. A cited run that was replaced shows a history icon in its
  chip ("cites an earlier run"). A target the current data no longer has is struck through
  ("Not in the current data").
- **Clicking a note selects all its targets** and keeps the Notes place open, with the note marked
  and focused: several give the several-elements inspector; the camera flies to element targets.
  A chip selects only its own target. A single click waits out the double-click interval, so a
  double-click can edit. Keyboard: the list is one Tab stop; Up and Down move between notes;
  Right moves into a note's chips and Left back; Enter selects; N adds a note.
- **Editing**: double-click a note's text, or Edit in its menu, turns that note into the editor in
  place. A new note's editor opens at the top of the list, its targets the subject the inspector
  shows (every door -- N, "+", the selection bar, any menu's Add note -- writes about that
  subject, and the inspector stays as it was), as chips with an x. Removing the last chip makes
  the note about the whole graph, said aloud; that graph chip's x is disabled, its tooltip
  "Select something to change what this note is about". A saved note appears at the top of the
  list, focused. Nothing asks for a name. Save stays disabled until something is typed; Mod+Enter
  saves (in Save's tooltip); Esc cancels, and an editor left empty is discarded.
- **Note menu**: Edit, Copy link to note, Delete (immediate, with Undo). Its heading is the note's
  first words.
- **After a delete** (Delete on a focused note, or Delete in its menu) focus moves to the next
  note, or to the previous one when it was the last, or to the empty state's "Add note (N)" when
  the list is empty, so a keyboard user reaches Undo with one Tab from there, not from the top
  of the page.
- **Which notes the place lists** (studio): the notes of the graph the graphs switcher shows.
  graphty-element keeps one graph's notes per session (`element-notes-api.md` 2.4), so "All
  notes" means all of this graph's notes, "About this graph" the notes whose target is the graph
  itself, and switching graphs switches the list. A derived graph starts with no notes; its
  "Made from" line leads back to the graph whose notes it was made from.
- Notes about elements the filter leaves out are listed under "About elements the filter
  leaves out", never dropped; graphty-element marks each such target `filtered`, so the app asks
  nothing of the filter itself.
- Empty: "No notes. Add note (N)", the empty-state pattern of section 2.5; with nothing
  selected, Add note writes about the whole graph.
- One fixture note is about the edge "Valjean - Javert" (edge icon chip).
- Counts count notes, everywhere; the fixtures show the same number in every place.
- **The fixtures show the normal case**: no note has an author, so the meta line is the time
  alone. Two more states show the rule: two people named their notes (names shown), and only one
  did (names hidden). Fixture names are made up.

**Assistant place** (for completeness): with no provider, only the empty state and its link to
Settings > Assistant. With a provider: a switcher row at the top (the current conversation and a
chevron listing the others, with New conversation), the conversation, and the composer pinned at
the bottom (microphone and Send; Send's key in its tooltip). A tool line is one sentence with the
object as a chip ("Added Size by betweenness"). A failed answer shows Retry inside it; the composer
stays empty. Its layers land as rows marked "from the assistant" in their Made with.

---

## 9. Header, canvas and full-canvas modes

**Header** (above the left panel and canvas), left to right:

- The **main menu** button (Figma's place: immediately left of the project name, 32 px).
- The **project name**, the only bold title, with its menu (section 10.2). Double-click or F2
  renames it.
- Undo and redo buttons.
- The **privacy chip**: "Local only" or "Usage data on, content masked"; it opens Settings >
  Privacy, from every screen.
- The **filter chip**.

**Canvas**: the drawing; the **legend card**, top left, read from the element's `styles.legend()`
(read-only: the tree row is the one way from a legend entry to the row that paints it, so the card
carries no links); one notice slot; and the state cards. The
canvas has no buttons.

- **Legend**: shown or hidden only by the toolbar's Legend button and L; open by default,
  remembered per project; no state opens or closes it. Each section is titled "<Property>: <row>"
  ("Color: Louvain", "Edges: Shortest paths"); overflow reads "28 more communities". It lists only
  what paints. **Needs graphty-element** to appear in exported images.
- **State cards**, one pattern (icon and title, one sentence, at most one primary and one
  secondary button, no route text that repeats a button):
  - **Loading**: one progress bar with a running count ("Reading miserables.json: 77 nodes, 120
    edges...") and Cancel; the inspector's Overview reads "Reading..." until the load finishes.
    Cancel clears only what the element can clear today; a per-load cancel needs graphty-element.
  - **Empty**: "No nodes to draw", [Add data...].
  - **Load refused, too large** (the element's E_TOO_LARGE, before the graph is touched): one
    sentence with the limits, [Choose another file...] and a Details link. Filtering at import
    needs graphty-element and is in the spec, not the card.
  - **GPU lost**: "The graphics device was lost. The rows, table and inspector are unchanged."
    [Restart viewer]. A run's own failure stays on its row.
- **Notices** (section 2.5) carry the one-line states: less detail above 10,000 nodes; waiting for
  the layout to settle before an export (with the only Cancel); the selection is full at 5,000;
  one source at a time.

**Modes**: 2D and 3D are the graph's view mode, set only from the View flyout and key 5; the
project reopens as saved; the skeleton opens in 3D, graphty-element's default. VR and AR are
sessions entered from the same flyout; a state covers a session that ended unexpectedly.

**Full-canvas modes** (Version history, Compare, Present) share one header: a back arrow, the
mode's name, an "Esc" hint. Present auto-hides it while presenting.

- **Version history**: two columns. The left is the drawing of the chosen version. The right is
  one log: each data version is a heading row (click it to view that version; its change summary
  under it), with the runs, recipes applied and edits made on it; a segmented filter (All, Data,
  Runs, Recipes, Exports). It is the one home of data versions. A version's actions (Restore,
  Compare with current) are in the banner over its drawing. The edits in the log are
  graphty-element's undo history (`session.history.steps`: each step's label, time, the slices it
  changed and its provenance, such as `{ via: "assistant" }`), and Restore on an edit is
  `history.restoreTo(step)`; the app keeps no second log of its own. Data versions and "what
  changed" beyond a fingerprint list need graphty-element, and so does keeping the history in the
  project file (the whole-session document, section 19).
- **Compare**: opened by Compare with... on a row ("Compare with another row...") or Compare
  graphs... in the switcher. Two drawings side by side, each with the shared legend card; a
  panel with **Agreement** (the number, a bar, one sentence against the rerun range),
  **Communities** (counts), **Grew the most**, and one button, **Keep as row**, which saves the
  comparison as a run row (one undo step). The comparison is transient until then: the back arrow
  or Esc leaves without asking and leaves nothing behind (conceptual model 1.4; top task 10 asks
  for "transient until saved"), and returns to the graph with the kept row selected if there is
  one. No "Not saved" badge and no leave-without-saving dialog: looking is free, keeping is one
  click.
  Agreement between partitions, stability across seeds and null-model tests need graphty-element.
- **Present**: section 4.1.

---

## 10. Menus

Every menu item is drawn from one command record, so its label, key and disabled reason match
every other door to the same command (section 17). Every menu follows section 2.5's menu rules:
one line per item, a heading naming the target, the menu keyboard model.

**The rule between the two header menus: the main menu is the app; the project-name menu is this
project.**

### 10.1 Main menu (header, left of the project name)

One level, with separators; only Open recent and Help open submenus:

New project; Open... (Mod+O); Open recent > | Select where...; Select edges between; Show hidden
elements | Settings... (Mod+,); Keyboard shortcuts (?); Help > (Documentation, Report a problem,
About)

- Undo and Redo: the header buttons and keys. Select all visible (Mod+A), Invert selection (I) and
  Reselect previous: keys and the canvas menu.
- **Select where...** opens a popover anchored above the toolbar (the canvas stays visible and
  highlights matches as you type). Title "Select"; tabs **Query** and **Ids**; both end with one
  row, "Selection: Replace | Add | Remove | Within"; the match count updates live; the primary
  button carries it ("Select 2,610"). Pressing it lands on the usual picture of a selection (the
  Selection row's count, the selection bar, the several-elements inspector).
  The Query tab's hint names no attributes (with 69 it would be a wall); its one link, **Insert
  attribute...**, opens the field list, menu size, and inserts the picked attribute's stored path
  at the cursor (quoted when a name holds a dot). Version 5.

### 10.2 Project-name menu (header)

Rename (F2), Save (Mod+S), Save as... (Mod+Shift+S), Export... (Mod+E; owner), Apply recipe or
style file..., Version history, Close project.

### 10.3 Context menus (and the inspector's "...", which is the same list)

Every menu uses one section order, leaving out sections that do not apply: **heading** (the
target's name only) | Rename | select and explore | Analyze... | organize (sets, folders, keep as)
| Frame selection | visibility and data | Add note, Show in table | Delete.

| Target | Items |
|---|---|
| A node | Neighborhood... (Filter to neighbors and Add as steps are in its popover), Path between... (with another node selected) | Analyze... (Shift+A) | Create set (Mod+G), Add to set..., Remove from Watchlist | Frame selection (F) | Pin / Unpin, Hide on canvas, Delete (Del) | Add note (N), Show in table |
| An edge | Select endpoints | Hide on canvas, Delete (Del; the element's `removeEdges`) | Add note (N), Show in table |
| Several elements | Neighborhood... | Analyze... | Create set, Keep as path (only when edges are selected), Lay out members..., Extract as graph (needs graphty-element), Merge nodes... (needs graphty-element) | Frame selection | Pin / Unpin (both only when mixed), Hide on canvas, Delete (Del), Copy ids | Add note, Show in table |
| The graph (the empty canvas's right-click and the nothing-selected "..."; one list) | Select all visible, Invert selection, Reselect previous | Fit (0) | Re-run layout, Reshuffle layout seed, Unpin all, Compute the overview, Add node... | Add note | Clear graph data |
| A group, set or path row | Rename (F2) | Select members, Show members in table | Analyze... | Keep as set (run children), Combine with selected rows >, Move to folder >, Collapse on canvas (needs graphty-element) | Frame members | Lock / Unlock, Hide in list / Show in list | Add note, Compare with another row... | Delete (Del) |
| A measure row | Rename | Select top N... | Show in table, Filter to... | Lock / Unlock, Hide in list / Show in list | Add note, Compare with another row... | Delete |
| A run row | Rename (needs graphty-element) | Rerun, Run as copy, Restore the suggested look, Show members in table, Lay out by these groups (group runs), Restore an earlier result, Check, Compare with another run (the last three need graphty-element) | Lock / Unlock, Hide in list / Show in list | Add note | Delete (the notice names how many style layers go with it, from the element's `runs.bindings`) |
| A folder | Rename | Ungroup (Mod+Shift+G) | Lock / Unlock, Hide in list / Show in list | Delete |
| An attribute | Color by, Size by (Width by), Label by, Show as groups, Place by | Filter to..., Create set where this is... | Read as... | Show in table |
| A source | Rename | Replace with file..., Edit source..., Refresh (URL) |
| A filter step | Move up (Mod+]), Move down (Mod+[) | Add note | Delete |
| A saved view | Rename (needs graphty-element) | Update to current camera | Delete (the element's `removeCameraPreset`, one undoable step) |
| A note | Edit, Copy link to note | Delete |

- Items that need graphty-element are hidden in the user-test build (section 2.5).
- An item's explanation is its tooltip; its second line only says why it is disabled.
- No command exists only in a context menu: Pin also has the node's pinned mark and the Layout
  section's pinned count; Remove from data has the table's row menu.

---

## 11. First use

### 11.1 Start screen

Shown when no project is open. Left: **Open project or file...** (Mod+O), **New from data...**
(the Data page, with File, URL and Paste as its "+" choices; "Start with no data" is in it),
then a hint line, "or drop a file anywhere in this window", beside "Files are read on this
computer". Middle: Recent projects (kept in this browser). Right: Samples (Les Miserables,
Zachary's karate club, a protein interaction sample, a card and transfer sample), each with one
line saying what it is good for. A gear opens Settings; the privacy chip opens Settings > Privacy.

### 11.2 Usage data opt-in (owner's decision and words)

Shown once, the first time the app opens, as a non-blocking card at the foot of the start screen
(the person can open a sample before answering; nothing is sent until they answer yes). The text
is the owner's, kept whole:

> Your data is yours, but please help us. We will never see the data you analyze, but we would
> like to collect information about how you use the app so that we can improve the user
> experience. This data will only ever be used by the author of the application and his Claude
> Code sessions.

Buttons: **Share usage data** and **No thanks**, equal weight, no default. A "What is collected"
disclosure lists, from the owner's decision: a session replay with every node name, attribute
value, label and file content masked; anonymous task events (file loaded, first graph drawn,
measure run, result read, style added, export, undo) with timings; errors and performance; a
feedback widget. It ends: "No file contents ever leave your computer." Until answered, usage data
is off. The choice can be changed in Settings > Privacy and is shown in the header's privacy chip.

### 11.3 The Data page

Every data door -- Sources "+" and its rows, Edit source..., Replace with file..., the start
screen's New from data..., a drop, Ctrl+V with text on the clipboard, the empty-canvas card,
Quick actions -- opens **one Data page**. It takes the workspace; the rail and the header stay, and
Data stays lit (the way Version history does). Its title says the act ("Add to Entries", "Open as
a new graph", "Edit: entries"). Load (or Apply) returns to the Graph place; Cancel or Esc returns
to where the reader came from. A single clean file is the same page with one table: it opens with
every check green and focus on Load, so a clean drop is still one Enter.

**The page, top to bottom and left to right:**

1. **Tables** (left). One row per table: its kind glyph, its name, its row count and a status
   check (green when every required role is set and its match report has no unresolved line,
   Neo4j's pattern). "+" in the header: File..., From a URL..., Paste...; a second file dropped on
   the page lands here. A graph file (GEXF, GraphML, GML, DOT, Pajek, JSON, Neo4j) is one row that
   expands to its node table and edge table; their structural roles are fixed by the format and
   shown locked ("Set by the file"). Remove a table with Delete on its focused row, or with Remove
   in its context menu (Shift+F10); the "-" that shows on hover is the pointer's way to the same
   command and is hidden from assistive technology, since a button inside a list option is not
   announced as a button.
2. **Model strip** (top, read-only). One line drawn from the chosen roles: `person (412)
   --entries (4,212)--> building (9)`. Each line's tooltip names its keys and weight
   ("entries.person_id = people.id; weight: count"). A lone graph file reads "Les Miserables: 77
   nodes, 254 edges". It cannot be drawn on or dragged.
3. **Table header strip** (above the grid), for the selected table:
   - **Each row is: a node | an edge** (a segmented control). "An edge" is offered only when
     exactly two columns link to a type; otherwise it is disabled with its reason ("An edge needs
     exactly two linking columns; this table has three").
   - For a node table, **Type**: a dropdown listing the existing types first, then "New type:
     <table name>" (the default), then **Rename type...**. Choosing an existing type adds this
     table's columns to those nodes by key, keeping every node (version 3's "add columns by key"),
     and the match report says so ("adds 3 columns to person: 409 of 412 matched"). **Studio: this
     field is the one home of a type's name.** Rename type... opens a name field; the rename runs
     graphty-element's forwarding step, so notes, sets and pins follow it. A type that no table
     makes (one made from a link column) is named in its link's submenu: **New type...** opens a
     name field prefilled with the column's name without "_id" ("person" from person_id), and
     choosing New type... again on that link renames it. Reason: the model strip is read-only, so
     a name typed anywhere else would have no screen.
   - For an edge table, **One edge per: Row | Pair**. Row (the default) loses nothing; Pair makes
     rows with the same two ends one edge, and in an undirected graph (a, b) and (b, a) are the
     same pair. It replaces version 3's Repeated pairs field.
   - **File settings** (a popover from the table's format line, "CSV, comma"): Format (the
     element's detected guess, candidates first when several match), Separator, id handling (1
     and "1" as one node or two), the error limit, position scale once positions are chosen. A
     value that was detected carries a small "auto" mark.
4. **Sample grid**. Under each column header, its **role** (a menu, Cytoscape's pattern): Key;
   From -> [type] and To -> [type] in an edge table, Links to -> [type] in a node table; Subtype;
   Name; Time; Weight; Edge id; Position (x, y, z); or Attribute (the default). Weight is
   disabled on a Key, From, To or Links to column, its reason in the tooltip ("person_id links
   each row to person; a weight needs a column of its own"). A link's submenu
   lists each type, then "New type..."; under each type, the column it matches on, its Key first
   and then its other unique columns ("person by id (Key)", "person by badge"), so a link joins on
   any unique column of any name without changing that type's Key. When the page holds no node
   table, From and To both default to one new type, "node", so a plain edge list loads with one
   Enter as it does today. Beside the role, the column's type glyph, read-only, linking to the attribute once it exists (editing a loaded source; before Load it is a mark); it is not a Tab
   stop (the keyboard reaches the attribute from Data > Attributes). Weight works like a radio button
   within a table: choosing it on a second column moves it there, and a notice says so. On an
   **edge** table the Weight role carries its meaning beside it, **Higher means: Stronger |
   Farther | Capacity** (a segmented control under that column's header), because the meaning
   belongs to the weight (`conceptual-model.md` 3.4) and two edge tables may mean different
   things. A node weight has no meaning control. **Time** is offered on a Time column and on a
   Number column; on a Number column it asks for the unit (Seconds since 1970 | Milliseconds
   since 1970), so a timestamp stored as a number becomes Time before the load, in the role menu
   itself. **Subtype** on a node table's column makes that column a subtype of the table's
   nodes (used by the legend, Color by type and Show as groups). **Studio:** the role is called
   Subtype, the conceptual model's own word, not Type, because the table's Type field is the
   node's identity, and not Category, because Category is already a column's data type (the Abc
   glyph, graphty-element's `"category"` attribute type); one word must not mean two things in a
   published API. `conceptual-model.md` 3.4 still lists node type as a role on an
   attribute and needs the same change (a node type is the table's type; an edge type is the edge
   table, or the link column for rows read as nodes; the subtype role is an attribute). Identity stays the table's
   type plus its Key, and links still point at the table's type, so editing the column never
   moves a note. A node table with no Key column is keyed by row number; the header strip says
   "Key: row number (no Key column)" and the match report says "Notes on entries may move if the
   row order changes", as for an edge table without an Edge id. With
   **Pair**, a derived **count** column appears and each Number and Time column also gets
   **Combine**:
   - Number: Sum (default), Mean, Min, Max, Leave out.
   - Time: Earliest and latest (two columns, the default), Earliest, Latest, Leave out. Never
     first or last: those follow file order, and a log is rarely sorted. **Studio:** the owner
     asked for "first and last"; the page reads that as earliest and latest, graph-format's `min`
     and `max` reducers over time, because `first` and `last` depend on row order. The first
     output, time (earliest), keeps the Time role (Time-dependent features read it); time
     (latest) is an attribute.
   - Category: Most common (default), Leave out. Never First, for the same reason as Time; Most
     common needs a new `mode` reducer (`element-requirements-5.md` section 3).
   - **Under Pair, count becomes the Weight only when the table has no Weight yet.** A Number
     weight the reader set keeps its role and combines by its Combine (Sum by default), so the
     transfers keep amount, summed. Choosing Weight on count afterwards moves it there, with the
     usual notice. The derived column is named count, or rows when the table already has a column
     named count.
   - **Under Pair the sample grid shows one row per pair** (from `data.preview`): the two ends,
     each combined column (time (earliest), time (latest)) and count, so the grid's grain matches
     the model strip's "1,306 edges from 4,180 of 4,212 rows" (the rows kept, of the rows read,
     from the same report object). A pair whose end is not matched and is left out stays in the
     grid, grayed, with "left out" in its count cell, so the grid agrees with the report.
   - **The weight is always visible in the header strip.** An edge table with no Weight column
     shows one quiet line, "Weight: none (each edge counts 1)", whose tooltip says the Weight role
     is chosen under a column header.
   Keys are suggested by graphty-element (a column with "id" in its name and unique values, else
   the first unique column); a suggestion shows as set only when it is unique and fully matched.
5. **Match report** (bottom, always visible) for the selected table, rendered from the element's
   report object; the app counts nothing. Before Load the page reads everything it shows -- column
   types, sample rows, unique columns, suggested keys, the model strip's counts and this report --
   from `session.data.preview(description)`, which parses without loading and is called again
   after each choice; after Load the same report comes from `data.lastImport()`. A sample cell
   whose value is not matched carries a warning glyph and the words "Not in people" (tooltip and
   accessible description), not color alone. The Sources row's status mark reads the same report
   as the table's check here: a line resolved by Leave out or Add counts as resolved in both.
   Switching an edge table that already has notes from Row to Pair (or back) changes edge
   identity, and the report says what it would leave: "3 notes on entries will read 'Not in the
   current data'". Each choice sits on the line it qualifies as a
   segmented control. Each row count is a link that filters the sample grid to those rows. Its
   first line is also the Sources row's tooltip, from the same object. A choice re-reads the
   report: Add as people raises "have both ends", the edge count and the strip's person count,
   and drops the matched rows from the unmatched rows. Under Pair with Undirected, a line says
   how many pairs merge ("(a, b) and (b, a) now merge: 9,113 edges become 9,087"), or that none
   can when every edge runs from one type to another (a person to a building).
6. **Footer**: **Direction** (As the file says | Directed | Undirected); **Load into** (This graph | New graph, only
   on a drop or paste into an open graph); Cancel; **Load** (or Apply), disabled with its reason
   in the footer until every table has its check.

**Worked example: door entries (the owner's).** `people.csv` (id, name, dept), `buildings.csv`
(bldg, site, floors), `entries.csv` (person_id, building_id, time).

- people: Each row is a node; Type "person"; id is Key; name is Name.
- buildings: a node; Type "building"; bldg is Key; site is Name; floors is Weight (node weight).
- entries: an edge; person_id is From -> person; building_id is To -> building; time is Time;
  One edge per: Pair; time combines to earliest and latest; Weight is count, Higher means
  Stronger.
- The model strip: `person (412) --entries (4,212)--> building (9)`; under Pair, `person (412)
  --entries (1,306 edges from 4,180 of 4,212 rows)--> building (9)`. After Add as people the
  people row in the Tables list, the strip and, after Load, the Sources row read "412 + 25
  added", from the report's added-node count per type.
- The match report for entries:
  > 4,212 rows; 4,180 have both ends. 25 person_id values (25 rows) are not in people (Add as
  > people | **Leave out**). 7 building_id values (7 rows) are not in buildings (Add | **Leave
  > out**). Show the 32 rows. 4,180 entries became 1,306 person-building edges. person_id is Number here and
  > Category in people: matched as text; 3 keys differ only by leading zeros (not merged).
- For people: "412 rows, 1 repeated key (kept the first). 14 people have no entries (kept,
  unconnected)."
- For buildings: "9 rows. 1 building has no floors value: its weight reads 1 | 0" (a segmented
  choice on the line, default 1), with "1 building" a link that filters the grid to that row. A
  second line warns that the Name repeats: "site, the Name, repeats: 3 names cover 9 buildings,
  so labels and inspector titles repeat". The worked example keeps site as Name to show the
  warning; a reader who wants unique names sets site back to Attribute, and each building
  is then called by its Key.
- **A type with no weight column weighs 1** (studio). People have no weight column, so every
  person reads node weight 1; the people report says so ("person has no weight column: each
  person weighs 1"), and a run that reads node weight (an entry flagged `nodeWeighted`) shows the
  same words. Reason: a mixed graph needs one answer for the types without a weight, and 1 is
  what an unweighted node already means.
- **An edge table's weight with blank cells** gets the same line as a node table's:
  "N transfers have no amount value: its weight reads 1 | 0" (`missingWeight`, default 1), and
  the attribute inspector shows the same count and choice.
- **Each entry as its own node**: on entries, Each row is: a node, Type "entry". The two link columns read
  "Links to -> person" and "Links to -> building", and an unmatched value's choice reads "Leave
  out the link" (the entry node stays); the header strip reads "Key: row number (no Key
  column)"; One edge per disappears; the strip reads
  `person (412) <--person_id-- entry (4,212) --building_id--> building (9)`; each entry node has two edges
  and its time as an attribute.

**Second domain: the March transfers** (already a fixture). `accounts-2026-03.csv` (id, kind,
country, riskScore, flagged) and `transfers-2026-03.csv` (from_account, to_account, amount,
timestamp).

- accounts: a node table, Type "account", id is Key.
- transfers: an edge table; from_account is From -> account and to_account is To -> account (both
  ends the same type); amount is Weight, Higher means Stronger.
- With One edge per: Pair, amount would combine to Sum and timestamp to earliest and latest; on
  this file the report says "No two transfers share both ends: One edge per Pair changes nothing",
  which is the honest answer for March. Nothing in the design names money: the same controls
  served people and buildings.
- `kind` stays an attribute: the reader may give it the Subtype role, which makes merchant,
  business and personal subtypes of account (for the legend and groups). The accounts stay
  type "account", and the links still point at account.

Two more cases checked in text only, each needing no new control: co-authorship, where a
citations table links papers to papers and One edge per Pair removes scraping duplicates; and an
org chart, one employees table whose manager_id is "Links to -> employee" on its own type, so a
node table with no edge table still makes edges.

**Out of scope for this version** (studio; each is a later addition, not a gap):

- **A polymorphic link**, where a row's target type sits in its own column (`object_type` beside
  `object_id`, as in audit logs). A link names one type; reading the type from a column would
  make a link's target depend on each row, which the match report, the model strip and the role
  menu cannot show as one line. Meanwhile the reader splits such a table into one table per
  type before loading.
- **A composite key** (building plus room). A Key is one column; a two-column key would need a
  key editor on the page and a two-part stable node form in every saved reference
  (`{ type, key }`). Meanwhile the reader adds one column that joins the two values.

**Unchanged from version 3:** a URL is fetched with the element's default of three tries;
problems appear under the field that fixes them and as the footer's reason for a disabled Load;
before Apply on an Edit source or Refresh the footer lists lost attributes and what paints from
them ("region is gone; Community 3 colors from it"); one refusal per typed element error (empty
file; could not be read, with row numbers and the element's suggested fix; unknown format; no
endpoint columns found, naming the columns the file has; missing or duplicate ids; fetch failed
after three tries; too large to draw), shown on the table it concerns, with **Choose another
file...** as the primary button when no setting can fix it; one load at a time ("transfers-
2026-04.csv was not loaded: transfers-2026-03.csv is still reading"); labels and values generated
from graphty-element's format catalog (`FORMAT_DESCRIPTORS`, each option's `plainName`). After
Load, the Graph place shows Selection, Notes and Everything and the canvas is drawn in 3D.

**At width (version 5; the wide sample: hosts with 69 columns, connections with 26).** Roles stay
under the column headers, their one home. Three changes keep 69 headers from reading as 69
controls:

- A column whose role is the default reads "Attribute" in quiet text, not drawn as a dropdown; it
  is the same role control (Enter or a click opens the role menu).
- Columns with a role pin to the left, after the frozen Key column, so Key, Name, From, To and
  Weight are seen without scrolling.
- **Go to column** above the grid, shown past 15 columns: the field list, menu size, with the
  columns that have a role first; picking one scrolls to its header and focuses it.

A link's "by" submenu is the field list too: the type's Key first, then its other unique columns.
Rejected: a strip of role slots above the grid (it would replace the header control, and with
eleven roles and "Links to" on any number of columns it grows per column); a role control shown
only on hover (a keyboard user cannot find it).

**Keyboard.** The tables list is one Tab stop (arrows move). The column-header roles are one Tab
stop: Left and Right move between columns; Enter or Alt+Down opens the role menu. Each segmented
control is one Tab stop.

**Needs graphty-element** (`element-requirements-5.md`, "Several tables" and "Weight"): the
multi-table load description, types and links, rows as nodes, One edge per Pair with combining,
the match report object and key suggestions, the saved sources record, which table each record
came from, and the weight per table with each edge table's meaning. The page is drawn in full in the skeleton,
with one design note after its Load button, the control that waits on it.

---

### 11.4 Nested JSON on the Data page (version 5)

**Studio decision: a nested JSON document is a source of tables. An array of records inside it is
a table; from there every choice uses a control the Data page already has.** Precedents: Tableau's
JSON connector (tick the levels of a schema tree), Power Query's expand, Neo4j's UNWIND (an array
is often edges, not rows). The example is the nested sample, a research-network API response:
`meta`, then `data.researchers` (170), `data.institutions` (30) and `links` (160), with sub-objects
four levels deep and arrays of values, ids and records.

- **Plain graph JSON loads in one step.** A file graph-io recognizes (node-link, d3, JGF,
  Cytoscape, graphology, vis, the NetworkX forms) is a graph file: one row, roles set by the file
  and shown locked, every check green, focus on Load. graphty-element's JSON source must read
  through graph-io's dialect detection for this (`element-requirements-5.md` section 8). A
  sub-object inside a graph file's node or edge records is flattened by the same rule as below,
  with no question asked, so a nested attribute never costs plain graph JSON a second step.
- **Any other document: the structure in Tables.** Its row expands into a tree of its objects and
  arrays only, each array with its item count (`data.researchers [170]`), never its leaf values,
  which are the grid's columns once their table is in use. Paths are shown dotted with `[]` and a
  middle ellipsis, never typed. The tree is the tables list's own tree: one Tab stop, arrows move,
  Right and Left expand and collapse, Space toggles.
- **graphty-element proposes the tables**, already ticked: arrays of records with a unique id-like
  field as node tables, and arrays whose records carry two fields whose values match those node
  tables' keys as edge tables. The match is on values, not field names, so `from` and `to`,
  `src` and `dst` or `person` and `org` are found as readily as `source` and `target`. An array of
  records outside every used table has a **Use as table** checkbox on its tree row. What the load
  leaves unread (`meta`) is one line in the match report.
- **Nodes and edges** are picked with the header strip the page has: Each row is: a node | an
  edge, Type, Key, and the roles under the column headers.
- **Sub-objects become columns at every depth**, named by their full path inside the record
  (`attributes.profile.metrics.citations.total`) and grouped in the grid under a header for their
  parent. The parent header's menu has the one alternative, **Keep as one value**, which stores the
  sub-object whole (shown in a cell as `{3 fields}`, its contents in the tooltip, and in the
  inspector as a collapsed tree). Flattening an object never multiplies rows, so nothing asks
  before it. Stored names are never shortened: a shortened name would change when a column is
  added and break saved bindings and notes.
- **An array in a record becomes one of four things**, in its column's role menu, each item
  showing the count it produces, from graphty-element's preview:

  | Choice | What it makes | Offered when the items are | Default for |
  |---|---|---|---|
  | One value | the array kept as one value; stored as its single item when no record holds more than one | values or records | arrays of records |
  | Several values | a list attribute; a filter step matches when any item does; on a list of categories Show as groups makes overlapping groups (a cover); a list of numbers is kept, shown and exported, never drawn (the conceptual model's numeric vectors) | values | arrays of values whose items match no node table's keys (`tags`) |
  | Several edges | the Links to role on a list column: "Links to -> researcher, each item (514 edges)"; the link submenu's New type... makes each distinct value a node (`tags` as tag nodes) | values | arrays of ids whose items match a proposed node table's keys (`coauthor_ids`), as `element-requirements-5.md` section 8 proposes |
  | Several rows | a child table under its parent in Tables, its first column "researcher (parent)" locked and linked to the parent's type | records | -- |

  A choice that does not fit is disabled with its reason ("Several rows needs records; these
  items are single values"). `affiliations` as Several rows has two linking columns (the parent
  and `institution_id`), so its header strip offers "Each row is: an edge": researcher to
  institution edges, `role` and `since` as edge attributes, the door-entries pattern again. A
  child table's one home is its column's role menu: its row in Tables has no checkbox, and Remove
  on it is disabled with "Choose another outcome under affiliations in researchers".
  Rejected: "first item" (it drops data without saying so and depends on file order; 59
  researchers in the sample have two or more addresses); a confirmation dialog before a large
  expansion (the count is on the item; a load too large to draw is refused as today).
- **Other shapes, the same controls** (the sample shows one shape; these are the others the design
  must take, each read by graph-io and proposed by graphty-element, never walked by the app):
  - **Records keyed by id** (`"packages": { "lodash": {...}, "react": {...} }`, the JGF way): an
    object whose values share one record shape is a table on the tree, `packages {1,204}`, its
    object key the table's Key column, named `key`.
  - **A document that is one array, or JSON Lines** (`.jsonl`, `.ndjson`, one record per line):
    the tree's root is the table.
  - **Arrays of arrays** (`[["a", "b", 3], ...]`): a table whose columns are named `column1`,
    `column2`, ..., as graph-io names a headerless CSV's; From and To are set under the headers
    as for any edge list.
  - **An object of values keyed by ids inside a record** (`"dependencies": { "react": "^18" }`): the
    same four-way role menu as an array, with Several edges to the key's type, the value becoming
    the edge's `value` attribute.
  - **A reference held in a sub-object** (`author: { id, name }`): `author.id` is an ordinary
    flattened column and takes Links to like any column.
  - **Arrays inside a child table** get the same role menu, at any depth.
  - **An array whose items differ in shape** offers One value only; the report names how many
    records hold each shape.
  Route: `data-page/json-keyed`, a package registry (records keyed by name, `dependencies` as an
  object keyed by package name, `maintainers` as an array of records), a second domain beside the
  research network.
- **Links to more than one type.** A link's submenu gains **Any of these types...**, which ticks
  the types a column may point at. In `links`, `target` is a researcher in 118 records and an
  institution in 42; the report counts each and refuses a value that matches two types. Reading the
  target type from a column stays out of scope (section 11.3).
- **Pairs listed from both sides.** When two records list each other in an id array, the report
  says so ("4 co-author pairs are listed by both researchers") with version 4's control for
  repeated links on the line, **One edge per: Item | Pair** (Item is Row's counterpart for a list
  column), Pair by default on an undirected graph, so degree is not counted twice. It is the same
  control as the edge table's One edge per, not a second one with new words.
- **The match report** gains the lines above and the unread block; **the model strip** reads
  `researcher (170) --coauthor (510)--> researcher; institution (30); researcher --links (160)-->
  researcher | institution` with the defaults, and gains `researcher --affiliations (242)-->
  institution (30)` or `address (179) --addresses--> researcher` when those arrays are made
  Several rows. An edge table always reads with its ends. Everything shown before Load comes from
  `session.data.preview()`.
- **Weight is proposed at load** (the owner's decision: weight is defined when a source is
  loaded). A numeric column named `weight` on an edge table, nested or plain, is proposed as the
  table's Weight, marked "auto", like a proposed Key.
- **Where Load lands is one rule for every format.** Load on "Open as a new graph" lands on the
  new project's Graph place (a CSV, a graph file, nested or plain JSON alike; a large file shows
  the loading canvas first). Apply after Edit source or Replace returns to the Data place it was
  opened from.
- **Load leaves what the reader chose.** The loaded project's Data place lists the tables the load
  made (a child table among them), its field lists hold the columns those choices made (a
  sub-object kept as one value is one field; an array made Several edges or Several rows is no
  longer an attribute), and the graph inspector counts the nodes and edges they make.
- **Refusals**, one per typed error, on the tree row they concern: not valid JSON (line and
  column); no array of records found (the tree still shows; Choose another file... is primary); a
  ticked array that no longer exists after Edit source.
- **After the load** every value is an ordinary column, read by one path reader in bindings,
  selectors, filters and labels. Stored paths use names, `.`, `[*]` (every item of an array), `.*` (every value of an object keyed by id) and quoted names
  (`"address.city"`). This is graphty-element's own path grammar, not JMESPath or RFC 9535 JSONPath:
  every `[*]` and `.*` flattens, so `a[*].b[*]` is one row per inner item. A path that reads
  nothing raises graphty-element's error, shown on the Binding popover and in Why this look,
  instead of painting nothing.

Routes: `data-page/json-plain`, `json-tree`, `json-researchers`, `json-keep-value`,
`json-array-menu`, `json-affiliations`, `json-any-type`, `json-report`, `json-invalid`,
`json-no-records`, `json-path-gone`, `json-keyed` (`state-matrix.md`). Needs graph-io and graphty-element:
`element-requirements-5.md` section 8.

---

## 12. Dialogs

### 12.1 Export

The Export dialog is the **one home of every output**, about 760 x 560 so the canvas stays
visible. Doors: the project-name menu's Export... (owner), Mod+E, and a row's or table's menu with
the target filled in (a door only fills a field). It opens on **Image**. Every output has the same
body: a **summary line** under its title in one form ("Full graph - legend not drawn - 3 MB",
size only when over 10 MB; "Masked" is used only for privacy redaction), the settings grid (a
row always holds a control), one **status callout** above the preview (info, warning or error),
and the **Preview** ("No preview for this file type" when there is none). The footer note, the
same on every output: "Saved to this computer only; nothing is uploaded."

The list on the left is one Tab stop (arrow keys), one line per entry, the name only:

- **Image** (graphty-element's `captureScreenshot`):
  - **Preset**: a dropdown ("For print -- PNG, 4x, sharper", "To share -- PNG, 2x", "Thumbnail --
    JPEG, 400 x 300", "For documentation -- PNG, 2x, transparent"), reading "Custom" after any edit.
  - **Size**: 1x, 2x, 4x (each with its pixels) and Custom.... A size the element's pre-check
    (`canCaptureScreenshot`) refuses is disabled with its reason; a preset that asks for one picks
    the largest allowed size and says so in the callout.
  - **Format**: PNG, JPEG, WebP, and SVG (the owner's figure format) disabled with
    needs-graphty-element. The pane title shows the extension.
  - **View**: the current camera, a standard view or a saved view, captured without moving the
    reader's camera.
  - **Background**: Canvas color, White, Transparent (disabled, with the reason, when the format
    cannot hold it).
  - **Advanced** (a popover): quality for JPEG and WebP, sharper rendering ("renders larger, then
    scales down; slower"), custom pixels with the aspect lock and the print-width helper ("174 mm
    at 300 dpi" fills in the pixels).
  - **Footer**: Cancel, **Copy** (disabled with the element's reason when the clipboard refuses),
    **Export**.
  - **Waiting for the layout to settle**: progress in the footer, "Capture now" and Stop waiting;
    a settle timeout keeps "Capture now" and Try again. Cancel always closes the dialog.
  - The memory estimate appears only in the callout, when the element's pre-check warns.
- **Video** (`captureAnimation`), in the same frame:
  - **View**: the same dropdown, plus **Tour of saved views** as its last choice, which shows the
    stops: the views checked In tour, in the Views order, as name plus **Hold** (seconds). Tour is
    disabled in 2D with its reason.
  - **Length**, **Size** (the canvas at 1x and 2x, 1080p, 4K, Custom...), **Frame rate** (24 | 30 |
    60). **Advanced** (a popover): format (Automatic, WebM, MP4), bitrate, transparency, easing.
  - The element's estimate: when it predicts dropped frames, a warning callout with a **Use 24 fps**
    button that changes the Frame rate field.
  - Recording: one progress bar in the footer with frame and stop text, every control disabled,
    Cancel. Done: one callout ("Recorded 8 s; 3 of 480 frames dropped"), and Close, Record again at
    24 fps, Export.
- **Report**: one self-contained HTML file (owner decision), its figures from the views in tour, in
  order, with a **Methods text only** choice. Needs graphty-element (a run-record methods writer).
- **Recipe**: the runs and paint rows, with an **Only the style** choice (the element's
  `styles.toDocument()` and any custom palettes it needs). Restoring runs without recomputing needs
  graphty-element.
- **Data**: one **Format** dropdown generated from the element's catalog (every format with
  `canExport`: CSV first, then JSON, GraphML, GEXF, GML, DOT, Pajek, and any writer registered
  with `registerFormatWriter`), its settings from that format's writer options, the file written
  by the element's `exportGraph`. The file carries every attribute, the current positions, each
  run's results as columns named by their result path, and the color and size each element is
  drawn with. What the format cannot hold is the warning callout, worded from the element's
  `lossNotes`. The app writes no file format of its own. **To confirm with graphty-element**:
  column headers that carry each value's scope (the Export bookend), and writing only the
  filtered graph.
- An output that is disabled shows its title, one sentence about what it will produce, and the
  mark, with no settings and no preview.
- **Recent exports**, under the list: what, when and where, with Export again.
- After Export the dialog closes where the reader was, with one notice, "Exported
  les-miserables_front.png to Downloads" (the name pattern is `<project>_<view>.<ext>`).

The dialog remembers the last choices per output; there are no export defaults in Settings.

### 12.2 Apply recipe or style file

The project-name menu's Apply recipe or style file..., or a dropped file, opens one **Apply file**
dialog, titled "Apply <kind>: <name>":

- **Header**: the file's name, and who saved it and when.
- **Rows it adds**: one list of the runs and paint rows, each with its type icon, what it paints,
  and its binding inline -- "riskScore -> riskScore" when matched, or a picker ("Choose an
  attribute", category attributes first, then Leave unbound) when the data lacks it. Matched
  bindings collapse to one line, "3 of 4 matched by name and type", with Show all. Mismatches are
  confirmed, never silently skipped; **Apply** stays off until each has a choice.
- **A run's weight**: a run that used the loaded weight reads "Weight: loaded weight" and needs
  nothing; a run that overrode it lists its column with the bindings, matched by name like any
  binding, its meaning control shown only when the column is unmatched.
- **Fetches from** appears only when the file fetches something, confirmed first.
- A file always lands **on top of the tree**, as one undo step; to drop the old look, hide or
  delete rows. (Replacing a style needs an element option on `applyTemplate`, filed.)
- **An older (1.x) style file** is one notice: "Older style file: its layers cannot be applied. It
  also sets view mode 2D, layout ngraph and background #101820." with **Apply these settings**.
- Applied rows are marked "from recipe <name>" in their Made with. Batch runs show one progress
  line.

### 12.3 Settings

Settings holds **only what belongs to the person, kept in this browser** (Mod+,). Anything the
project carries lives on the object it configures. One dialog, a section list down the left,
real headings, a labeled search field that announces its result count, closed with X or Esc.
Switches are used for on/off settings here and nowhere else; segmented controls put System first.

| Section | Settings |
|---|---|
| General | **Your name** (optional; most people leave it empty), help text "Optional. Shown on notes only when a project has notes from more than one person." It is the project's author setting (owner, 2026-09-28 and 2026-10-01: "enters it in settings and we store it"): it is saved with the project, writes graphty-element's `session.author`, and is stamped on each note and recipe written afterwards. The field says so ("Saved with this project"), and its preview uses the note meta line's form ("Ada, 2 h ago"). Risk, not a decision: the name travels with the file, so the next person to open it writes under it until they change it. Nothing else asks for a name; Theme (System, Light, Dark; the app's chrome only, until graphty-element takes a color scheme); Number format |
| Privacy | Usage data (a switch, with the owner's opt-in text and the "What is collected" list of section 11.2); **Where your data goes**, four read-only lines: files are read on this computer; the project is saved where you save it; Assistant keys stay in this browser only while Remember keys is on; usage data, masked, is sent only while Usage data is on. A link, "Files you exported", opens the Export dialog's Recent exports (exports are saved, never sent) |
| Accessibility and input | Reduced motion: System, On, Off (reaches only the app's camera calls until graphty-element has a setting); Single-key shortcuts (WCAG 2.1.4); **Override selection highlight on this device** (off, or the Selection row's Color, Size and Opacity with the Style tab's own fields; "The project's selection style: Graph > Selection"); Pin a node when I drag it (the element's pin-on-drag) |
| Performance | GPU use: When available, Never, Required (the element's three policies); Advanced: "Use the GPU from N nodes"; a status line from the element's capabilities; the element's limits, read-only, from its exported `DEFAULT_LIMITS` |
| Assistant | Provider (OpenAI, Anthropic, Google, or "In this browser"); model; a key per provider; Remember keys on this device; **Forget all keys** (asks first: keys cannot be restored); voice input language |
| Headset | A status line ("No headset connected; these apply when one is"); hand tracking, controllers, near-touch, teleport, seated or room-scale, depth boost when dragging |
| Diagnostics (collapsed, last) | Logging, level, modules; detailed profiling; frame rate readout |

Left out on purpose: export defaults (the dialog remembers); the opening view mode; the canvas
background, declutter and reframing (the graph's Canvas section); layout pacing (the Layout
popover); the selection look (the Selection row); a keyboard section (the shortcuts panel is
Help > Keyboard shortcuts and ?); a default overview recipe (the overview is one General overview).

### 12.4 Keyboard shortcuts panel

Opened by ? and Help > Keyboard shortcuts; closed with X or Esc. "Canvas (graphty-element)" first,
marked not changeable, then the app's keys grouped by home: Toolbar, View (0, F, 1, 3, 7, 5, L),
Selection, Tree (rename, reorder Mod+] and Mod+[, delete, lock, solo), Panels.

---

## 13. What the clickable skeleton shows

Built on Les Miserables, with the transfers data for Data and paths, so every label meets two
domains. States are switched by clicks, not computed. Every "needs graphty-element" item is drawn
disabled with that phrase and the reason; "Hide design notes" hides them all for user testing.

1. **Toolbar and canvas**: the five-button toolbar at rest, a tooltip showing (hover and keyboard
   focus), the View flyout in 3D and 2D, Layout running, paused and settled, Legend on and off; a
   canvas with no buttons; the selection bar with one and two nodes; the Neighborhood and Path
   popovers.
2. **The Style tab**: Everything and Group 2 side by side (one panel); a section's "+" menu; the
   color popover (opacity as a percent); the Arrows section; the Binding popover with Detach; the
   label style popover; the Label section with one empty line ("Pick a field") and with two lines
   (Above: name, Below: Note count); the From data list with its Notes group enabled.
3. **The inspector frame** for every kind in section 5.2, including "Why this look" open and
   closed, the state bar, the folder's Paints line, the Overrides list.
4. **Graph place**: Selection, Notes, a PageRank row, a Louvain run (collapsed and expanded), a path,
   a folder, Everything; status icons; the footer line's four messages; rename and its refusal
   tooltip.
5. **Analyze popover**: open, an entry's essentials, revising a row, a running row.
6. **Views place** with In tour checkboxes, Save view's naming row, a view's inspector, Present.
7. **Data place and Data page**: Sources rows (one per table) opening the page; the door-entries
   example end to end (three tables; roles under the headers; the model strip; One edge per Pair
   with Combine; the match report with Add and Leave out; each entry as a node); the transfers as
   the second domain; a GEXF as one row; Edit source with lost fields; each refusal; Filters;
   Attributes grouped by type; the attribute inspector's Read as and role tags (Weight).
8. **Notes place**: notes mostly with no author (the time alone), a note about two targets, a
   note about the edge Valjean - Javert, a note whose target is missing, editing in place, the
   empty state; Settings > General's Your name.
9. **Table dock**: Nodes, Edges, "Louvain"; members of a row; the time slider.
10. **Menus**: the main menu (one level), the project-name menu, every context menu.
11. **Export** (Image, Video before, during and after, disabled outputs), Apply file, Settings.
12. **Canvas states**: loading, empty, refused, GPU lost; the notices.
13. **Full-canvas modes**: Version history and Compare.

**Added in version 5** (every state is a route in `state-matrix.md`):

14. **The state matrix**: each surface's Empty, Loading, Error, Partial, One, Typical, Many, Long
    text, Narrow and Waiting routes. `study.mjs` reads a `@1024` suffix and sizes the window to
    1024 x 768, and `study.mjs --matrix` checks the whole matrix (one browser, a fresh context per
    25 routes).
15. **The wide and nested projects**: frames with `dataset: "wide"` and `"nested"` get their own
    canvas, graph inspector, table and paint tree, as the door entries do. `fromDataItems` stops
    offering Les Miserables attributes on every dataset: every field picker reads the project on
    screen through the field list.
16. **Two helpers in `lib.js`**: `AB.fieldList` (the field list, both sizes) and `AB.problem`
    (what happened, what to do). `openMenu` loses its search mode.
17. **Wide data** on every attribute surface and **nested JSON** on the Data page (sections 7,
    11.3, 11.4), with a small package-registry document built in `data-page.js` for the other
    document shapes (`data-page/json-keyed`).

Skeleton files this changes, in `../../app-b/`: `lib.js` (the tooltip, popover and menu helpers;
`section`, `styleTab` and `whyThisLook`; the notice slot; the field-row grid), `app.js` (the header
and canvas furniture), and in `sections/`: every inspector, `style-pickers.js`, `toolbar.js`,
`camera-menu.js` (becomes the View flyout), `selection-bar.js`, `path-tool.js` (becomes the Path
popover), `canvas-and-states.js`, `graph-place.js`, `graphs-switcher.js`, `main-menu.js`,
`project-menu.js`, `context-menus.js`, `commands-and-search.js`, `select-where.js`, `data-place.js`,
`inspector-source.js` (removed: the Data page holds what it showed), `load-step.js` (becomes the
Data page), `table-dock.js`, `notes-place.js`, `assistant-place.js`,
`views-place.js`, `present-mode.js`, `full-canvas-modes.js`, `analyze-popover.js`,
`export-dialog.js`, `export-image.js`, `export-video.js`, `recipe-apply.js`, `settings.js`,
`start-screen.js`.

---

## 14. Framework changes this structure requires

To be recorded with their reasons in `information-architecture.md`, `figma-crosswalk.md`,
`interface-specification.md` and, where marked, `conceptual-model.md` (outside the studio's write
area; flagged for the owner):

- Notes cite results and filter steps, as `conceptual-model.md` section 6 says
  (`element-notes-api.md`, `cites`): a cite names one result pinned to the run it was read from,
  or one filter step stamped with its rule's last change. A filter step can also be a note's
  target. No change to the conceptual model. In version 4 a cite is made through the API only:
  no screen adds one (the note editor edits text and subjects), and the fixture notes show how
  cites read. How a reader makes one (for example, Add note from a run row citing that run, with
  an x on the chip to drop it) is open for the next version.
- **Notes belong to one graph** (studio): graphty-element's session holds one graph, and a note's
  targets are that graph's elements, so each graph keeps its own notes (`element-notes-api.md`
  2.4). The Notes place lists the notes of the graph the switcher shows. `conceptual-model.md`
  places notes on the project; flagged for it: notes are per graph, inside the project.
- The rail is Graph, Data, Views, Notes, Assistant; Results and Algorithms places are retired (runs
  are tree rows, owner; the catalog is the Analyze popover).
- The style stack is the Graph place's paint tree, and paint rows are selectable (owner); the
  conceptual model gains "one tree row" as a selection kind.
- A measure run paints on finish (owner). The inspector has Style and Data tabs (owner).
- The inspector rule: properties of the selected thing, read and edited in place; no verbs.
- The toolbar rule: every command that acts on the canvas as a whole; the canvas carries no
  controls (version 3).
- The one pattern per job table (section 2.5) is the interaction standard for every screen.
- The one-home rule's enforcement: one command record per command, doors drawn from it.
- Built-in Notes and Overrides rows join the tree; individual notes are not rows.
- Everything is the element's default layers, drawn with the shared Style tab.
- Filter steps live in Data > Filters; the chip opens them (owner).
- **Conceptual model**: graph statistics are run rows with no eye or the graph's Overview; the
  Overrides layer has a visible row; labels and arrows are style properties, not display toggles,
  and the minimap is dropped; a saved view's Caption is its note (saved views are not note
  targets); the attribute role "label" is named **Name** on screen; **weight is a role chosen when
  data is loaded (owner), per table; each edge table sets its weight's meaning, a node weight has
  none, and a run may override it**; the roles color and size are bindings on a row's Style tab,
  not roles; **a node type is the type of the table its rows came from (its identity, with the
  Key), and an edge type is its edge table, or the link column for rows read as nodes**; a
  subtype is an attribute given the **Subtype** role on the Data page; every role is chosen on the
  Data page.
  Folders are app organization, not model objects, and are not note targets. **Notes are
  graphty-element objects** whose time and targets are required and whose author is optional.
- **Conceptual model (version 5)**: an attribute may hold a list. A list of categories is the
  model's existing cover and a list of numbers its existing numeric vector (kept and exported,
  never analyzed or encoded), so neither is new. A **value kept whole** (a sub-object the reader
  chose not to flatten) is new: flagged for section 3.4 as an opaque value, shown and exported,
  never encoded, like a numeric vector. A child table is an ordinary node type or edge table,
  and a link to several types is still one edge table whose ends are matched by value, so
  neither changes the model.
- The glossary gains "measure row" as a document-only word beside the screen word "metric".
- **Top tasks** (`top-tasks.md`): loading several tables joined on any key column becomes a top
  task (owner: a primary task); the recipe bookend confirms only a run's overridden weight
  (section 12.2).

---

## 15. Every top task has a home

Each task in `../../../framework/top-tasks.md`, with where it starts and where its answer is read.

| Task | Starts from | Answer read in |
|---|---|---|
| 1 Characterize the whole graph | nothing selected; Compute the overview | the graph's Data tab; Data > Attributes; the source's Made with |
| 2 Rank nodes | Analyze > Rank nodes and edges | the measure row (paints); its histogram and Top 10 |
| 3 Communities | Analyze > Find groups | the run row and its group children (paint); Summary; Sizes; item tab |
| 4 Find, inspect, explore a neighborhood | Find (/); Neighborhood, Filter to neighbors; Reselect previous | the node's Data tab; the table |
| 5 Take a note | Add note (N) from the selection bar and menus | the Notes place; note counts on rows; the Notes row's paint |
| 6 Filter, then characterize | Data > Filters "+"; the filter chip; Filter to... | the graph's Data tab over the filtered graph; funnel marks on older runs |
| 7 Make the layout readable | the graph's Layout section; the toolbar's Layout (pause); Lay out members...; Place by | the canvas |
| Load a graph | Data > Sources "+"; the start screen; drop; paste | the Data page and its match report |
| Load several tables and join them on any key column (owner: primary task) | the Data page's "+" | the model strip and the match report; the Graph place |
| Start from a recipe | project-name menu > Apply recipe or style file... | the Apply file dialog; rows marked "from recipe" |
| Export (image, video, report, files) | project-name menu > Export...; Mod+E; a row's or table's menu | the file; Recent exports |
| 8 Color, size or label by a value | a row's Style tab; an attribute's Color by, Size by, Label by | the measure or group row; the legend |
| 9 Create and combine sets | Create set (Mod+G); Keep as set; Select top N; Combine | set rows |
| 10 Compare with... | a row's "..." menu; Compare graphs... | the comparison mode; a run row once kept (Keep as row) |
| 11 Shortest path | the selection bar's Path between; P; Analyze > Find paths | the Path popover; path children under one path run row |
| 12 Reuse an analysis | a source's Replace with file... (Data > Sources, or Quick actions "Replace"): the command, the file, Load | the same rows, each marked where a number changed |
| Tail: time | the dock's time slider | a series measure row, one window at a time |
| Tail: combine, project, extract | Graphs switcher > New graph from... (needs graphty-element) | a new graph in the switcher |
| Tail: null model, seed stability | a run's "..." > Check (needs graphty-element) | a reading on that run |
| Tail: clean and merge | the table (cell edits, Merge nodes) | Version history |
| Tail: bridges, link prediction, the rest of the catalog | Analyze | a group or edge measure row; a pair run's item tab |
| Tail: save a view; 2D, 3D, VR, AR | the View flyout (Save view, modes); Views "+" | the Views place; the canvas |
| Tail: present, record a tour | the Views place header | Present mode; Export > Video |
| Tail: rename what was found | double-click or F2 on a row | the tree, the legend |

---

## 16. The Style tab

Owner's second review: show every styling option but keep the panel organized. Owner's third
review: what are the numbers, how do unset values work, popovers rather than accordions, and why
Everything looks different. **Studio decision: one Style tab component for every row that paints,
Everything included, generated from graphty-element's list of style properties and built on the
pattern table (section 2.5).**

### 16.1 Where the options come from

graphty-element publishes 35 style properties (14 node, 13 of them drawn -- `node.marker` is not;
21 edge) with a plain name, a value kind (color, number, text, boolean, choice, label style), a
range, allowed values and a caveat (`channelsFor('node' | 'edge')`), and a 47-field label style for
every label-like property. The Style tab is built from that list; a property the element adds
later appears with no app change.

A style layer's literal values are a partial map: a property it does not list means "this layer
does not paint it", and the layers beneath show through. There is no explicit "unset" value. **So
a row lists only what it sets.**

### 16.2 Layout of the tab

1. **Paints line and paint-order line** (section 5.1).
2. **Nodes | Edges switch** on every row (any row can style its edges as well as its nodes), with
   **no numbers**. A side that sets something carries a small dot (tooltip "This row sets edge
   properties"). The side that opens first is the one the row paints. An element layer paints
   nodes or edges, never both, so one row with both sides set is two element layers; this is
   deliberate.
3. **Sections in a fixed order, always shown, never collapsed, no counts:**
   - Nodes: **Fill** (color with opacity), **Shape** (shape, size), **Effects** (outline, glow with
     strength, wireframe, flat shading), **Label** (text and its style), **Tooltip** (text and its
     style).
   - Edges: **Line** (color with opacity, width, pattern with its count, curve, flow speed),
     **Arrows** (Head, Tail), **Label** (text and its style).
   - A **More** section catches any property the list does not place; hidden when empty.
   - **Needs graphty-element:** the descriptors carry no section or order, so this grouping is a
     temporary app list with a comment naming the issue. Its needs mark is a design note on the
     section headers, not a line in the panel.
4. **A section with nothing set is its header and "+"** ("Add to Line" as its name). "+" adds the
   property directly when one is left, opens a dark menu of the section's unset properties when
   several are (property names only; caveats in each item's tooltip), and disappears when none are
   left. The new line is pre-filled from the base style (or the descriptor's default once the
   element publishes one; empty if neither exists), its value focused. **The one exception is a
   label line, which starts empty** (owner; section 16.6).
5. **A set property is one 24 px line**: the name (88 px column) and the value. Numbers and text
   are edited in the field (drag the name to scrub). Colors show a swatch, the hex and the percent.
   Choices show their glyph and name. Booleans are a checkbox. On hover or focus within the line,
   and on the selected line: **bind** (tooltip "Use a field or result for Color") and **"-"**
   (removes it, with Undo). A bound line keeps its bind icon pressed and visible.
6. **Click the value to get everything about it** (light popovers, section 2.5):
   - **Color**: Custom | Libraries; hex (six digits) and opacity as a percent, which writes the
     opacity property, never a hex alpha; the document's colors. On a single-color row, Libraries
     lists single swatches only.
   - **Glow**: the color and the strength.
   - **Pattern**: the nine patterns (16 px glyphs) and the pattern count, shown only for patterns
     that use it.
   - **Arrow Head and Tail**: the type (14 glyphs), size, color with opacity, and the caption with
     its style. The line that opened it decides the end; the popover is titled "Arrow head" or
     "Arrow tail".
   - **Shape**: the 25 shapes in three columns with their names, a filter field (the list is longer
     than 15). Choosing one closes it.
   - **Label and Tooltip**: the text is typed in the line; the "Aa" swatch at the start of the line
     (drawn in the label's own font and panel) opens the **label style popover**: a preview, the
     fields this row sets, and a "+" listing the unset fields under the headings Text, Outline and
     shadow, Panel, Placement, Pointer, Effects, Badge (searchable; Placement and depth fade first,
     because they make a bound label readable in 3D and in a headset). **Needs graphty-element:**
     full descriptors for the label fields; a maximum width with wrapping and a "same size at any
     distance" option, which the 47 fields do not have (not drawn until they exist).
   - **Turning labels off is a value, not a removal.** In a stack, "-" only stops this row
     supplying words; labels painted by a row beneath still show. graphty-element's way to hide
     them on this row's members is the label style's `enabled: false` (writing words switches a
     label on; `enabled` is only ever written to switch one off). So Label's and Tooltip's "+"
     also offer **Show**, a checkbox line; unchecked, it hides labels on this row's members
     whatever the rows beneath say. With a Text line present, Show is not offered (words already
     switch the label on).
   - Inside every popover, an unset field shows its effective value in gray with its source in the
     tooltip; typing sets it.
7. **Inherited values are not drawn on the tab.** "Why this look" on an element is where inheritance
   is read.
8. **Invalid values** show the element's validation message on the line (`styles.validate`).

### 16.3 Binding a value to data

- **The bind icon opens the From data list**, which is the field list, menu size (section 2.5):
  the element's own attributes in their file spelling, then run results under their row names,
  then a **Notes** group (section 16.6), each with its type glyph. Attributes the property cannot
  take are listed last, disabled with the reason, never hidden; which ones suit a property comes
  from graphty-element (`AttributeDescriptor.domainKind`, `element-requirements-5.md` section 7).
- **A bound line shows what the reader needs**: the ramp and the palette's name for a color
  ("Orange to Brown"), the range for a size ("0.5 to 6 px"), the field for text ("name"). The
  bound field's name is shown only when it differs from the row's own name.
- **Clicking a bound value opens the Binding popover** (the same on measure, run and any row):
  Source (the field or result), Scale, Palette with a reverse button beside it, **Values from**
  (Fit to data | Percentiles | Typed, the typed range shown only for Typed), Clamp, Midpoint (only
  for a diverging palette), **No value** (a color field whose unset state reads "Nothing" in gray,
  the default, so rows beneath show through), and **Detach**, which keeps the current values as
  fixed ones (the element's `resolveToStatic`). Scale and Palette open the shared dropdown and the
  shared palette popover; nothing opens inline.
- **The palette popover** is one picker for every palette field, pre-filtered by the binding's
  type (categorical palettes for a category; sequential and diverging for a number), grouped by
  heading, marking only the palettes that are not color-blind safe. "Custom palette" (its footer
  button, the one popover that creates something) adds a palette; there is no "safe" switch to
  claim.
- **A run row** binds Fill color to its groups: Palette, Order by, Overflow ("other", shape,
  extend) and per-child exceptions in its Binding popover, each opening its real picker or a plain
  menu. Its Level is a run setting in Made with.

### 16.4 By row

| Row | What the Style tab holds |
|---|---|
| Everything | the element's base style as lines (no "-" until the reader changes one); everything else behind "+"; edits go into the Everything layer (`match: "everything"`) just above the element's locked defaults (3.7) |
| Group, set, path, Notes | only the properties the row sets |
| Measure | the same component, the painting property bound to the result |
| Run | the same component, Fill color bound to the run's groups |
| Several rows | the same component; differing values read "Mixed" with both swatches |
| Selection | Color, Size, Opacity; no "+", bind or "-" |
| Overrides | not a Style tab: a list of edits (section 3.7) |
| Node, edge, several elements | "Why this look" (section 5.4) |
| Folder | no Style tab: its Paints line says it paints nothing itself |

### 16.5 Measure rows

A measure row is a row whose painting property is bound to its result. Its Style tab has the
Paints line ("Paints 77 nodes (every node with a value)"), the paint-order line, and the bound line
in its section. Unbinding is Detach in the Binding popover; "-" removes the property, like on every
line.

### 16.6 Labels: several per node, starting empty

**Owner: a label is a variable picked in styling; "+" next to Label starts empty; several labels
per node (some above, some below) are wanted.**

**Studio decision: the Label section is a list of label lines, one per position.** A line's
position is what tells it apart, so the name column shows the position and the value shows the
field.

```
Label                                  +
  Above     [Abc] name                  -
  Below     [#]   degree                -
  Right     Pick a field                -
```

- **A line has one way to pick its field** (studio): clicking its value opens the Label popover,
  whose Text field is the From data list. A label line carries no bind icon; a second door to
  the same list would be a second way to do one job. The popover edits the line that was clicked
  (its title, Text, the checked grid cell and the preview's full-strength line all follow it),
  and the inspector stays on the row it was opened from.

- **"+" adds a line and opens the From data list on it** at once, focus on its first item. Esc
  closes the list and leaves the line empty: it reads "Pick a field", draws nothing, and its
  accessible name is "Label, Right: no field, draws nothing". The "+" stays until every position
  is used. While an empty line exists, "+" returns to it and reopens its list instead of adding
  a second empty line, as the Notes "+" returns to an open draft. The Label "+" is the one "+" on the Style tab that opens a menu after adding, and a
  label line is the one new line not pre-filled (recorded in the skeleton README). With no lines
  yet, "+" holds two items, Label and Show, and opens its menu as every "+" with two items does.
- **An empty line is a draft in the panel, not a write.** It writes nothing to the row's layer
  until a field is picked, so it cannot hide a label painted by a row beneath. A draft still
  empty when the selection changes is dropped; it held nothing to lose.
- **A new line takes the first free position** in the order Above, Below, Right, Left, the four
  corners, Center. The owner's example (names above, sizes below) is "+" name, "+" size, with no
  placement step.
- **Position has one home: the Label popover's position grid**, moved to the top of the popover
  beside Text. A position this row already uses is drawn `aria-disabled` (still focusable), its
  tooltip naming the line that holds it ("Used by this row's Below label"). Moving a line writes
  both positions in one undo step. The name column shows the position and is not a control.
- **One label per position per row.** Lines are not reordered (order has no meaning); they stay
  in the order added.
- **The Label popover** (one, as in version 3): Text and Position on top; a preview of the node
  with every line of this row in place, the one being edited at full strength and the others
  faded; then the style fields with their "+".
- **Across rows, positions stack like every property**: a row writing Above and a row writing
  Below both show; two rows writing Above follow paint order. "Why this look" names each
  position's row as its own token.
- **The From data list**: Typed text; the attributes, grouped by type once there are several;
  run results under their row names; and **Notes** -- **Note count** (notes whose targets include
  this element itself, the same rule as row note counts; 0 on an element with none) and **Latest
  note** -- now enabled, read from graphty-element's `notes.count` and `notes.latest`. Note count
  is a number, so it can drive size and color too. No name or author appears anywhere on this
  path.
- **To label only noted elements**, put the label on the Notes row (Notes > Label > + > Note
  count). Note count on Everything draws "0" on every node; that is the reader's choice, and a
  number format that hides zero (`element-requirements-5.md`, number formatting) lets the reader
  turn the zeros off. The skeleton's worked example is the owner's own: name above, degree
  below.
- **Show** stays one checkbox for the whole section, offered only while the row has no label line
  (it writes graphty-element's label `enabled: false` for this row's members).
- **Label by** in an attribute's menu makes a row with one Above line already bound to that
  attribute: the reader has picked the field, so it does not conflict with "starts empty". The
  new row lands at the top of the tree, under the built-in rows, selected, and the canvas draws
  the attribute above every node.
- **Edges keep one middle label** plus the head and tail captions in Arrows; several edge labels
  wait until a reader asks.
- **One field per label line.** "Name (degree)" needs label templates (low priority); a number
  draws unformatted until graphty-element formats text bindings, whose priority rises because
  "sizes below" is the owner's own example.
- The words Above, Below, Left, Right, Center and the corners come from graphty-element's
  descriptors, never typed by the app. **Needs graphty-element**: labels keyed by position and the
  rest of `element-requirements-5.md`, "Labels"; until then the skeleton's position table carries a
  comment naming the missing channels.
- Edges have no tooltip (`edge.tooltip` was withdrawn in 2.0), so a note shows on an edge only as
  paint or a bound label.

### 16.7 The unopinionated rule

Owner principle: "styling should be unopinionated and left to the user". Studio decision: **the
app adds no look of its own.** Every paint on the canvas is a row the user can see, restyle, hide
or delete, or an element setting the user can change. The only paint that arrives unasked is the
element's defaults (Everything) and a run's suggested style (owner: runs paint when they finish;
"Restore the suggested look" in the run's menu brings it back). Dimming what is not selected is a
layer the reader adds. The Notes row starts with nothing set and holds no layer until the reader
gives it a look (section 3.7).

Precedents: Figma's Fill, Stroke and Effects sections with "+", its settings popovers and its
variable binding; Tableau's Marks card (an empty shelf until a field is dropped on it); Gephi's
Unique / Partition / Ranking split, which is the Value or From data choice. Counter-example:
Cytoscape's Style panel, which lists every property with a default column.

Round 7 first-click tasks: "make the edges dashed" from a group row; "make the noted characters
stand out"; "show each character's name" (Label by on the name attribute, or Label on a row's
Style tab); "show each character's name over it and how many notes they have under it" (two
"+" presses, no placement step, no name prompt); 85% target.

---

## 17. One home per feature

**The rule:** every object and every piece of state has one home, where it is read and changed.
Commands have no home; they have **doors**: keys, Quick actions, context menus (and the inspector's
"...", the same list), the selection bar, links from reasons and empty states. A door never shows or
holds state; it may name the objects it acts on (Open recent names files, the View flyout names
saved views). Every door is drawn from one command record. Quick actions is the complete index;
its groups are named after the homes (Go to, Graph tree, Analyze, Data, View, Layout, Selection,
Project, Settings and help), and an entry shows a hint only when it teaches a place, written "Place
> Control". Quick actions finds commands and places; Find (/) finds rows and notes. A second place
that shows or edits the same value is a defect.

**The test:** if deleting a route leaves nothing unreachable and nothing unconfigurable, it was a
door. **Exempt:** the start screen and the headset hand menu.

| Feature | Its one home | Doors |
|---|---|---|
| View mode 2D, 3D, VR, AR | the View flyout | key 5, Quick actions |
| Camera: fit, frame, zoom (2D), standard views | the View flyout | 0, F, 1, 3, 7 (= and - are the element's own); Frame selection in menus; Fit in the canvas menu |
| Saved views (list, order, rename, delete, update, tour membership) | the Views place | the View flyout's jump list and Save view; Quick actions; Export and Present read the same list |
| Present | the Views place header | Quick actions |
| Legend | the toolbar's Legend button | L |
| Layout pause and resume | the toolbar's Layout button | Quick actions |
| Re-run layout, Reshuffle seed, Unpin all | (commands) the canvas menu / graph "..." | Quick actions |
| Layout method, options, seed | the graph's Layout section | -- |
| Labels, arrows | style properties on rows | Label by on attributes |
| Note markers | the Notes row's eye | Space on the focused row |
| Background, declutter, reframing, Print-safe colors, filtered-out drawn faintly | the graph's Canvas section | Quick actions |
| Table | the dock's toggle | Shift+T, Quick actions |
| Time slider | the dock's options menu | Quick actions |
| Bringing data in | the Data page | Data > Sources "+" and its rows, start screen, empty-canvas card, drop, Ctrl+V with text, Quick actions |
| Tables, types, keys, links and roles (Name, Time, Weight, Edge id, Position) | the Data page, under each column header | Edit source..., a Sources row, the attribute inspector's role tags |
| Unmatched rows, repeated pairs and how they combine | the Data page's match report and header strip | the Sources row's warning mark (only for a line still unresolved; Leave out and Add resolve one) |
| Replacing a source's data | the Data page | Replace with file... on the Sources row, Quick actions |
| An attribute's data type (Read as) | the attribute's inspector | Read as... in the attribute and column menus; the type glyph under a Data page header |
| The loaded weight and what it means | the Data page (Weight role; an edge weight's Higher means) | the attribute inspector's Weight tag, Analyze's Weight line |
| A run's weight override | the run's Made with | the Analyze and Path popovers (chosen before the run) |
| Your name on notes | Settings > General | -- |
| Several labels on a node | a row's Style tab, Label section | Label by on attributes |
| Clear graph data | the graph's "..." | Quick actions |
| Add node | the graph's "..." | Quick actions |
| New graph from (needs graphty-element) | the Graphs switcher | Extract as graph in the several-elements menu |
| Analyze | the toolbar's Analyze | Shift+A, Quick actions, row menus' Analyze..., the empty tree's link |
| Paths | the Path popover | P, the selection bar, Analyze > Find paths, node menu |
| Rerun, run settings | the run's Made with and state bar | row menu Rerun, Run as copy |
| Filters | Data > Filters | the filter chip, Filter to... in menus, Neighborhood's Filter to neighbors |
| Neighborhood | the selection bar's popover | G, node and several-elements menus |
| Selection commands | (commands) the canvas menu and the main menu's Select where... | Mod+A, I, Quick actions |
| Create set | the selection bar | Mod+G, context menus |
| Hide on canvas; show hidden elements | the selection bar; the main menu | Mod+Shift+H, context menus, the footer line's Show |
| Hide in list; show hidden rows | the row menu; the list menu | the footer line's link |
| Add note | the selection bar | N, every context menu, the Notes place "+", Quick actions |
| Find (rows, notes) | the tree's search field | /, Quick actions' hand-off; Ctrl+F in the table searches the table |
| Show members in table | the row's "..." | -- |
| New attribute (needs graphty-element) | Data > Attributes "+" | -- |
| Rename | double-click the name | F2, context menu Rename |
| Save, Save as | the project-name menu | Mod+S, Mod+Shift+S |
| Export (every output) | the Export dialog | the project-name menu's Export... (owner), Mod+E, row and table menus |
| Recent exports | the Export dialog | Settings > Privacy's "Files you exported" |
| Apply recipe or style file | the Apply file dialog | the project-name menu, a dropped file, Quick actions |
| Version history and data versions | the Version history mode | the project-name menu, the source's Read line |
| Undo, redo | the header buttons | Mod+Z, Shift+Mod+Z, the notice's Undo |
| Compare | the comparison mode | Compare with another row... (row menus), Compare graphs... (switcher) |
| Settings | the Settings dialog | Mod+,, the main menu, the start-screen gear, "Change in Settings" links |
| Usage data | Settings > Privacy | the privacy chip (start screen and app) |
| AI provider and keys | Settings > Assistant | the Assistant's no-provider link |
| Keyboard shortcuts panel | Help > Keyboard shortcuts | ? |
| Quick actions | the toolbar | Mod+K |
| Graph overview | the nothing-selected inspector | -- |
| Select members | the count link | the row's "..." |

**Personal display settings are not styling.** Settings' "Override selection highlight on this
device" changes how one person's screen draws; the project's look has one home, its rows and the
graph's Canvas section.

**Keys resolved:** Mod+G is one command, "group what is selected"; key 5 toggles 2D and 3D; the
time slider has no single-letter key; app keys never use W, A, S, D, Q, E, the arrows, = or -;
Analyze is Shift+A; single-letter app keys can be switched off.

---

## 18. Capability register: every graphty-element capability and its home

Each capability has exactly one disposition:

- **Home** -- a place in the UI, with its states drawn in the skeleton;
- **Catalog** -- the UI list is generated from the element's catalog, never typed;
- **Plumbing** -- no UI, with the reason;
- **Gap** -- needs graphty-element; filed, drawn disabled with "needs graphty-element", never built
  in the app (section 19).

### 18.1 View modes and headsets

| Capability (element API) | Disposition | Where |
|---|---|---|
| View mode 2D / 3D / VR / AR (`viewMode`, `setViewMode`, `VIEW_MODE_VALUES`, default 3D) | Home | the View flyout; the skeleton opens in 3D |
| Deprecated 2D flag (`layout2d`) | Plumbing | never exposed; the app uses `viewMode` only |
| VR and AR support checks (`isVRSupported`, `isARSupported`) | Home | Enter VR / Enter AR enabled state and reason |
| Exit a session (`exitXR`) | Home | the hand menu's Exit; switching to 3D on the desktop |
| Camera mode spelling (`setCameraMode`) | Plumbing | the camera mode follows `viewMode` |
| In-headset menu | Gap | the hand menu is drawn as a target, marked |
| The element's own Enter VR/AR overlay (`xr.ui.*`) | Plumbing | always off; the View flyout is its home |
| Session configuration (`xr.vr`, `xr.ar`) | Home | Settings > Headset (seated or room-scale) |
| Hand tracking, controllers, near-touch, physics, depth amplification (`xr.input.*`) | Home | Settings > Headset |
| Teleportation (`xr.teleportation.*`) | Home | Settings > Headset |
| Session events | Home | the "headset session ended" state |
| AR placement and scale in the room | Gap | nothing designed until it is published |

### 18.2 Camera and navigation

| Capability | Disposition | Where |
|---|---|---|
| Camera state read (`getCameraState`) | Home | the View tooltip's view name; a saved view's thumbnail tooltip |
| Camera state write, animated (`setCameraState`) | Home | view jumps, Present; animation follows Reduced motion |
| Camera position and target (`setCameraPosition`, `setCameraTarget`) | Plumbing | used through views and tours |
| 2D zoom (`setCameraZoom`) | Home | the View flyout's Zoom in and Zoom out, 2D only |
| 2D pan (`setCameraPan`), 2D rotation (Q/E) | Home | the element's own drag and keys; the shortcuts panel |
| Reset (`resetCamera`) | Plumbing | not offered: Fit and Front cover it |
| Zoom to fit (`zoomToFit`) | Home | the View flyout's Fit (0) |
| Frame a scope (`applyCameraView(id, {scope})`) | Home | Frame selection (F); Frame members on rows |
| Built-in and registered camera views (`camerasForMode`, `registerCameraView`) | Catalog | the View flyout's Standard views |
| Saved views (`saveCameraPreset`, `loadCameraPreset`, `getCameraPresets`, `session.views`) | Home | the Views place |
| Remove a saved view (`removeCameraPreset`, undoable) | Home | the Views row menu's Delete |
| A saved-view name that matches a camera view is refused (`E_PROTECTED`) | Home | the naming row's inline error |
| Views in the project file (`exportCameraPresets`, `importCameraPresets`) | Plumbing | carried by the project |
| Rename a saved view | Gap | the Views row menu's Rename, disabled |
| An ordered preset collection with tour membership | Gap | the app holds order and In tour meanwhile, marked |
| A view snapshot (rows on, filters, positions) | Gap | a view's "Keeps: Camera" mark |
| Starting camera distance | Home | the graph's Canvas section, Reframe when data changes |
| Camera changed event | Home | the View tooltip names a view only while the camera is on it |
| Keyboard, mouse and touch navigation | Home | the shortcuts panel's "Canvas (graphty-element)" group |
| A configurable keymap and navigation speeds | Gap | keys listed as not changeable |
| Input on/off (`setInputEnabled`) | Home | Present > Lock the canvas |
| Coordinate transforms | Plumbing | no app overlays on nodes |
| A zoom reading in 3D | Gap | none shown |
| Reduced motion for every animation | Gap | Settings reaches only the app's calls meanwhile |

### 18.3 The scene

| Capability | Disposition | Where |
|---|---|---|
| Background color or skybox (`background`) | Home | the graph's Canvas section, Background |
| Selection look (`selectionStyle`) | Home | the Selection row; the default's contrast is a gap |
| The element's hover highlight | Gap | not a tree row; shown locked in Why this look when it wins |
| Draw-only hide of chosen elements, with their edges | Gap | Hide on canvas and the footer count, marked |
| Collapsed drawing of a group | Gap | Collapse on canvas, marked |
| Label declutter | Home | the graph's Canvas section |
| Legend (`styles.legend()`) | Home | the legend card, toggled from the toolbar |
| Legend drawn into an exported image | Gap | Export's summary line says "legend not drawn" |
| Minimap | Gap | dropped |
| Direction and arrowheads | Home | the Data page's Direction; arrows are Style properties |
| A color scheme the canvas follows | Gap | Settings' Theme covers the app's chrome only |
| Restyling every node or edge (a layer with `selector: { match: "everything" }`) | Home | the Everything row's edits, kept just above the element's locked defaults |
| Default style on or off (`addDefaultStyle`, parsed and never read) | Gap | the Everything row's eye, marked |
| Selection highlight on or off | Gap | the Selection row's eye, marked; never faked with opacity 0 |
| Render settings (a no-op), graphics API, renderer lifecycle | Plumbing | nothing to expose |

### 18.4 Image and video capture

| Capability | Disposition | Where |
|---|---|---|
| Raster screenshot (`captureScreenshot`) | Home | Export > Image |
| Pre-flight check (`canCaptureScreenshot`) | Home | Export > Image's disabled sizes and callout |
| Screenshot errors (`ScreenshotErrorCode`) | Home | Export's error callout |
| Clipboard result and reasons | Home | Export > Image's Copy button |
| Wait for a stable frame | Home | Export's "waiting for the layout to settle" |
| Thumbnail preset | Home | saved view thumbnails |
| Video, still camera or tour (`captureAnimation`) | Home | Export > Video |
| Video estimate, progress, cancel, status, quality report | Home | Export > Video before, during and after |
| 2D tour waypoints | Gap (to confirm) | Tour disabled in 2D |
| SVG figure (owner decision), PDF later | Gap | Export > Image's SVG format, disabled |
| AI screenshot command | Home | the Assistant |

### 18.5 Layout

| Capability | Disposition | Where |
|---|---|---|
| Pause and resume (`setRunning`, `isRunning`, `graph-settled`) | Home | the toolbar's Layout button |
| Layout catalog and engines (`catalog.layouts()`) | Catalog | the Layout section's Method popover |
| Set layout and options (`setLayout`, `layout`, `layoutConfig`) | Home | the graph's Layout section |
| Layout scope (`layoutScope`) | Home | Lay out members... |
| Layout by structure | Home | Lay out by these groups (run menu); Place by (position attributes); an attribute axis is a gap |
| Recommend a layout (`recommendLayout`) | Home | a "Recommended" mark in the Method popover |
| Pacing (`layoutBehavior.layout.*`, six fields) | Home | the Method popover |
| Pin, unpin, pinned list | Home | node menu and pinned mark; Layout's pinned count; Unpin all in the canvas menu |
| Pin on drag | Home | Settings > Accessibility and input |
| Transition time | Plumbing | follows Reduced motion |
| A layout change undone with its positions (`layout.set` is one undoable step) | Home | Undo after a method change; no confirmation |
| Positions saved and restored as a document | Gap | -- |

### 18.6 Performance, acceleration and diagnostics

| Capability | Disposition | Where |
|---|---|---|
| Acceleration policy (`acceleration`, `ACCELERATION_POLICIES`) | Catalog | Settings > Performance |
| GPU node threshold (`accelerationMinNodes`) | Home | Settings > Performance, Advanced |
| Acceleration status and device | Home | Settings' status line; GPU lost card; failed run row |
| Per-run precision (`caveats.precision`) | Home | a run's Made with |
| Accelerator injection (`setAccelerator`) | Plumbing | developer-level |
| Limits (`DEFAULT_LIMITS`) | Home | Settings > Performance, read-only; refusal and notice states |
| Cost gate per run (`RunOptions.limits`, `estimate`, `plan`) | Home | the Analyze popover's cost line and blocked state |
| Statistics and profiling; logging | Home | Settings > Diagnostics |
| The documented but missing `debug` attribute | Gap | an element documentation defect |

### 18.7 Styling

| Capability | Disposition | Where |
|---|---|---|
| The 35 style properties (`CHANNEL_DESCRIPTORS`, `channelsFor`) | Catalog | the Style tab (section 16) |
| The 47-field label style | Catalog | the label style popover; field descriptors are a gap |
| `node.marker` (declared, not drawn) | Gap | not offered |
| Node gradient fill (unreachable) | Plumbing | not offered |
| Edge tooltip (withdrawn) | Plumbing | not offered |
| Style layer (`LayerSpec`, `styles.add`); list, reorder, enable, update, remove | Home | the tree's rows |
| Selectors | Home | each row's Paints line |
| Validation (`styles.validate`) | Home | a property line's error state |
| Provenance (`LayerSource`) | Home | Made with; element-owned layers show a lock |
| Consumer state kept on a layer (`LayerSpec.userData`) | Home | a style-layer row's folder, Lock and Hide in list, written with `styles.update` so they are undone with the element's history and saved in `toDocument`; only folders of non-layer rows (sets, kept paths) stay in the app-state request (18.10) |
| Element base layers (locked, `source.by === "element"`) | Home | the Everything row's unchanged lines; edits go into the Everything layer above them |
| Labels switched off on some elements (label style `enabled: false`) | Home | the Show checkbox line in Label and Tooltip (16.2) |
| Encode a run result or an attribute (`styles.encode`, `LayerSpec.encode`) | Home | the bind icon and the Binding popover |
| Label from a field (`node.label` / `edge.label` with `by: "data.*"` or `"results.*"`) | Home | a label line, starting empty; Label by |
| Several labels per node, keyed by position | Gap | the Label section's lines (16.6) |
| Labels from notes (`notes.count`, `notes.latest`) | Gap | the From data list's Notes group |
| `textPath` (withdrawn in the 2.x schema) | Plumbing | never offered |
| Label templates; number format on text bindings | Gap | one field per label; numbers unformatted |
| Scales (9) and their options | Catalog | the Binding popover |
| Missing values, category map, overflow | Home | the Binding popover |
| Palettes (18) with capacity and color-blind safety | Catalog | the palette popover |
| Custom palettes (`registerPalette`) | Home | the palette popover's Custom palette |
| Custom scales (`ScaleRegistry`) | Catalog | plugin scales appear in the list |
| Highlights (`styles.highlight`) | Home | path rows paint |
| Suggested styles | Home | runs paint on finish (owner); Restore the suggested look |
| Explain a look (`styles.explain`) | Home | Why this look |
| Explain over several elements | Gap | several elements' Why this look, marked |
| Freeze a bound value (`resolveToStatic`) | Home | Detach in the Binding popover |
| Style document save and apply (`toDocument`, `applyTemplate`) | Home | Export > Recipe (Only the style); Apply file |
| Replace the style with a document | Gap | a file always lands on top |
| Themes (issue #331); grayscale and color-blind check | Gap | Print-safe colors in the Canvas section |
| Legacy 1.x style template | Home | the Apply file dialog's older-file notice |
| Style problem event | Home | a run row's "its look could not be applied" state |
| AI style commands | Home | the Assistant; its layers land as rows |

### 18.8 Data in

| Capability | Disposition | Where |
|---|---|---|
| Inline records (`nodeData`, `edgeData`, `setData`) | Plumbing | developer path; Paste is the reader's equivalent |
| Load from file, URL, source config | Home | the Data page's "+": File, URL, Paste |
| Replace versus add (`replace`) | Home | Load into; Replace with file...; Edit source...; Refresh |
| Add records (`addNodes`, `addEdges`) | Home | Add node... (the graph's "..."); a file added to this graph |
| Neighborhood fetched on demand | Gap | Neighborhood selects loaded neighbors only |
| Superseded loads (`E_SUPERSEDED`) | Home | the "one source at a time" notice; queuing is a gap |
| Clear data (`clearData`, one undoable step) | Home | Clear graph data in the graph's "...", acting at once with the Undo notice |
| Per-load cancel | Gap | the loading card's Cancel |
| Remove nodes (`removeNodes`) | Home | Remove from data in node menus and the table, with Undo |
| Edit node and edge data (`updateNodes`, `updateEdges`); remove edges (`removeEdges`) | Home | the table's cells; Remove from data in the edge menu and the Edges tab |
| Progress, completion, import report (`data.lastImport()`) | Home | the loading card; the source's Made with |
| Per-record errors, error limit, typed load failures, size refusal | Home | the Data page's refusals and File settings |
| Filter at import | Gap | in the spec only |
| Formats, detection, CSV and JSON options, paired files (`FORMAT_DESCRIPTORS`, `detectFormats`) | Catalog | the Data page's File settings, labels from `plainName` |
| Unserved formats (SIF, CX2) | Home | the Data page's "not supported, because" |
| Endpoints, node id, edge id, id coercion, direction, position scale | Catalog | the Data page: roles under the sample columns, File settings |
| Repeated edges (`DuplicatePolicy`) and column reducers (`ColumnReducer`) | Home | One edge per Row or Pair, and Combine (applying a reducer per column at load is a gap) |
| Time attribute config slots (read by nothing) | Gap | an element defect |
| Dynamic GEXF time data | Home | kept on records; windowing by spells is a gap |
| Custom data sources (`DataSource.register`) | Catalog | registered formats appear on the Data page |
| Several tables: types, keys and links on any column, rows as nodes or edges, the match report | Gap | the Data page, drawn in full (`element-requirements-5.md`) |
| Which table a record came from; remove one table | Gap | Remove on the Sources row and the Data page, marked |
| What a replacing load does to runs and bound layers | Gap | the out-of-date state is drawn |
| An attribute as a layout axis | Gap | Place by offers position attributes only |
| Live connections | Gap | not drawn |
| Graph data export (`exportGraph`, `canExport`, writer options, `lossNotes`, `registerFormatWriter`) | Catalog | Export > Data's Format list and its warning callout |

### 18.9 Data read, filters, selection and sets

| Capability | Disposition | Where |
|---|---|---|
| Attribute catalog (`data.attributes()`) | Home | Data > Attributes |
| An attribute type override ("read as"), an ordinal level, a display name | Gap | Read as, marked |
| Graph statistics (`data.statistics()`) | Home | the graph's Overview |
| Status counts (`session.status`) | Home | the filter chip; the Graphs switcher |
| Node label path, time paths, positions after load (`nodeLabelPath`, time paths) | Home | the Data page's Name, Time and Position roles |
| Edge weight path (`edgeWeightPath`) | Home | the Data page's Weight role; per table and with a meaning is a gap |
| Node weight path (`nodeWeightPath`, read by nothing) | Gap | the Weight role on a node table; "No measure reads node weight yet. PageRank's restart weights would" (needs graphty-element) on the attribute, and the node-weight line in Analyze |
| Re-deriving values when a known field changes after load | Gap (to confirm) | Name and Time changes on the Data page |
| Snapshot and fingerprint | Home | the source's "Changed since last read" |
| Versions and diffs | Gap | Version history beyond a fingerprint list |
| Filters (`visibility.set`, `plan`) | Home | Data > Filters |
| OR and NOT between filter steps | Gap | -- |
| Time window (`visibility.setWindow`) | Home | the time slider |
| Filtered-out nodes drawn faintly (`visibility.showContext`) | Home | the Canvas section |
| Scopes (`scope.resolve`, `count`) | Home | the Analyze and Path popovers' Scope |
| Saved scopes | Plumbing | sets are the reader's named kind |
| Query validation | Home | the error state of Select where..., filter and rule fields |
| Selection by ids and set operations | Home | click, Shift-click, Mod-click; Select where... (Replace, Add, Remove, Within) |
| Neighborhood | Home | the Neighborhood popover |
| Select where, by pasted ids | Home | the main menu's Select where... (Query, Ids) |
| Top N, threshold, edges between, invert, select all | Home | Select top N; histogram brush; the main menu and canvas menu |
| Selection statistics | Home | several elements' Summary |
| Selection cap (5,000) | Home | the "selection is full" notice |
| Fixed sets, rule sets, kept sets, path sets | Home | Create set; Create set where this is...; Keep as set; Keep as path |
| Combine, rename, redefine, membership edits, remove and restore | Home | Combine; double-click; Add to set..., Remove from <set>; Delete with Undo |
| Set freshness; set used by | Home | marks on set rows; the Delete notice |
| Memberships of an element | Home | Memberships in node and edge inspectors |
| Multiple graphs per project | Home | the Graphs switcher |
| Derived graphs | Gap | New graph from..., hidden in the user-test build |

### 18.10 Analysis

| Capability | Disposition | Where |
|---|---|---|
| Algorithm catalog, metric availability, requirements, options, result shapes | Catalog | the Analyze popover; Made with; row kinds |
| Start a run (`run`, `runs.start`) | Home | Analyze; the Path popover; the selection bar; the Assistant |
| Legacy 1.x method spellings | Plumbing | the app uses the 2.x session API only |
| Run scope; scoped-run caveat | Home | Analyze's scope line; Made with |
| Seed; exact or sampled; named run (`as`) | Home | Made with; Exact or Sampled; Run as copy |
| Rerun in place | Home | the state bar; Update <row> |
| Time box and partial results | Home | Stop after in Made with; the partial status icon |
| Dry run | Plumbing | used for previews |
| Queue, progress, cancel, cannot-cancel, failure codes | Home | the row's status icon, progress bar and state bar |
| Caveats, run record, engine versions | Home | Made with |
| Stale run (`Run.stale`) | Home | the funnel status |
| List, get, remove runs; bindings | Home | the tree; Delete names how many layers go |
| Batch runs | Home | Apply file runs as one batch |
| Run on load (`algorithmsOnLoad`) | Home | a recipe's runs replay on open |
| Result reading, column, ranking, top N, histogram, summary, plain-language reading | Home | Summary, Values, Top 10 |
| Result paths and terms | Plumbing | used by selectors, filters and Select where |
| Sets a result offers (`sets.offers`) | Home | a run's children |
| Earlier results; compare runs, stability, null model | Gap | Restore an earlier result, Check, Compare with another run, disabled |
| Register algorithms, layouts, palettes, views, sources, sinks, accelerators | Catalog | registrations appear in the lists |
| AI commands, enable, provider, keys, status, streaming, voice | Home | the Assistant; Settings > Assistant |
| Undo and redo over graph state (`session.undo`, `redo`, `canUndo`, `history` with step labels) | Home | the header's Undo and Redo, Mod+Z, the notice's Undo (its text from the step's label) |
| Notes (store, targets, author, `note:changed`, `notes.*` paths) | Gap | the Notes place and every note screen, drawn enabled against `element-notes-api.md` |
| App-owned state in the same history (folders of set rows, the Views order) | Gap (to confirm) | one Undo for both; never a second app stack interleaved by hand |

App-only preferences with no element counterpart (usage data, number format, theme)
live in Settings and are not in this register.

---

## 19. What graphty-element needs (to file, not to build in the app)

The complete list -- each capability, its proposed API and the screens that wait on it -- is
`element-requirements-5.md`. It holds the version 5 rows (wide data and nested JSON, for graph-io,
graph-format and graphty-element), the version 4 rows (notes, several labels, several tables,
weight at load) and every row carried from version 3. Each is filed as a graphty-element issue
with type, priority and effort labels before its screen ships, and nothing on it is built in the
app.

---

## Review changes (version 4)

Changes from the ontology and generality review, each a studio decision, reversible with an edit.

- **A cite names a result, not only a run.** graphty-element's `run.rerun()` keeps the run's id,
  so a cite stored as a run id alone could never show "cites an earlier run". The element now
  stamps each cite with the cited result's `startedAt` and reads it back with `replaced: true`
  after a rerun or removal (`element-notes-api.md` 2 and 2.3; `element-requirements-5.md`
  section 1, new row; section 2.1 here).
- **A note about one group of a run survives a rerun honestly.** A rerun may number groups
  differently, so a `{ run, group }` target is stamped the same way and reads `replaced` instead of
  silently moving to whatever group now has that number (`element-notes-api.md` 3.1, 3.2).
- **Notes about filtered-out elements are marked by the element.** Version 4 listed them under a
  heading the app could only fill by asking the filter about each target, which is graph logic in
  the app. A target now reads `filtered: true` (`element-notes-api.md` 3.2). The heading reads
  "About elements the filter leaves out" (section 8, and the skeleton's Notes place).
- **Notes on a filter step are enabled.** Version 4 kept them disabled, which broke "every note
  control is enabled". Stable step ids are part of the notes proposal, so the `E_UNSUPPORTED`
  refusal is withdrawn (section 2.1; `owner-questions-4.md` section 1; `element-notes-api.md`
  4.1; `element-requirements-5.md` section 1). Only noting an edge picked on the canvas keeps the
  mark, since edge picking is a separate capability.
- **The `note:changed` cause** was typed as the history cause, which has no `load` and has
  `restore` and `rollback`. It is now the same open union as `set:changed`: command, load, undo,
  redo (`element-notes-api.md` 4.3).
- **The notes worked example uses only notes API and today's channels.** It bound
  `node.labelBottom`, a proposed label channel defined in another document, so a third party
  reading the notes page alone could not run it. It now binds `node.label`
  (`element-notes-api.md` 1).
- **A link can match any unique column of its type, not only the type's Key.** With one Key per
  type, two tables that refer to the same people by different columns (an id and a badge number)
  could not both link. The link role's submenu lists each type's unique columns ("person by
  badge"); the load description gains `on` (section 11.3; `element-requirements-5.md` section 3,
  new row; `owner-questions-4.md` section 4).
- **A plain edge list still loads with one Enter.** Version 4 did not say what type From and To
  take when no node table exists. Both default to one new type, "node" (section 11.3;
  `element-requirements-5.md` section 3).
- **A node table that links to its own type** (an org chart's manager_id) is added to the
  generality cases checked in text (section 11.3).
- **The Notes place empty state** now follows section 2.5's pattern ("No notes. Add note (N)"),
  which the skeleton already drew (section 8).

Changes from the design professor's review (simplicity, one pattern per job, a notes API usable
from its own page), each a studio decision, reversible with an edit:

- **The notes example compiles.** It imported `GraphtyElement` as a value, but graphty-element
  exports it only as a type. It now registers the element (`import "@graphty/graphty-element"`)
  and reads `el` through the tag name (`element-notes-api.md` 1).
- **Note ids follow the kept sets' rule**: element-minted, starting `note_`, otherwise opaque, so
  no consumer parses a counter (`element-notes-api.md` 2).
- **A bare node id that two types share is refused** with a new `E_NOTE_AMBIGUOUS_TARGET`. The page
  said the element "converts" a node id to `{ type, key }`, which it cannot do once "person 17"
  and "building 17" both exist (`element-notes-api.md` 3.1, 4.1).
- **Edge targets carry their ends' types.** graphty-element's `EdgeMember` stores its ends as bare
  node ids, so "stored in the stable node form" was not true. Two optional members,
  `sourceType` and `targetType`, are added; `EdgeMember` is open to optional members, so no
  reader breaks (`element-notes-api.md` 3.1; `element-requirements-5.md` section 1).
- **Editing a note about a deleted node is not refused.** An `update` may keep a target the note
  already has while it reads missing; only new targets must exist (`element-notes-api.md` 4.1).
- **Who keeps the author name between visits** is now stated: the project. The name is the
  project's author setting, saved with the project and restored when it opens; the risk that it
  travels with the file is recorded in section 12.3 (`element-notes-api.md` 5).
- **`ProjectSlice` gains `"notes"`**, so `project:changed` names the slice (`element-notes-api.md` 7).
- **Type-qualified identity in kept sets is marked as a one-way door.** Kept sets publish
  `nodes: NodeId[]` today, so returning `{ type, key }` there is a breaking change; the row gives
  the additive alternative and asks for confirmation on the graphty-element pull request
  (`element-requirements-5.md` section 3).
- **The empty label line waits on nothing.** "Empty text draws nothing" listed the "+" line's
  "Pick a field" as waiting on it, but that line writes nothing (16.6). The rows that wait are a
  Latest note label on an unnoted node and any field absent on some nodes
  (`element-requirements-5.md` section 2).
- **", edited" marks any change to a note**, as the API sets `edited` on every update, not only
  when the text changes (section 8; `element-notes-api.md` 2.3).
- **Door entries as nodes set Type "entry".** Without it the type defaults to the table name
  "entries", and the model strip's `entry` would not match (section 11.3).

Checked and unchanged: required note metadata is time and target (owner) with text required by
the studio and reasoned; the author name appears only from Settings and only when two or more
names exist, and nothing asks for one; the Label "+" starts empty and several labels are keyed by
position; weight is chosen at load, shown on the Data page and the attribute inspector, and used
by every run unless overridden; no new second way to do a job was found; every computation the
screens show (counts, match report, key suggestions, authors, staleness) comes from
graphty-element.

Changes from the graphty-element API review (checked against graphty-element 3.1.1's source),
each a studio decision, reversible with an edit:

- **The Notes row no longer asks for a layer with no look.** graphty-element refuses a layer that
  writes nothing (`E_BAD_LAYER`) and a layer paints nodes or edges, never both. The Notes row now
  holds no layer until the reader gives it a look, and its first look on a side adds that side's
  layer -- the Everything row's existing pattern, so no new pattern and no element change (section
  3.7, 16.7; `element-notes-api.md` 6; `element-requirements-5.md` section 1). The element's
  existing `LayerSource` value `reason: "notes"` stays published and unused.
- **One author property for notes and recipes: `author`, not `noteAuthor`.** The owner's decision
  takes a note's author and a recipe's "saved by" from the same setting; a note-only property would
  have left the app stamping recipes itself. `session.notes.setAuthor` is replaced by
  `session.author`, and a "Recipe authorship" row is added (`element-notes-api.md` 1, 5, 9;
  `element-requirements-5.md` section 1; section 12.3 here). The name is saved with the project:
  the owner's 2026-09-28 words say "the project's author setting" and the 2026-10-01 words say
  "enters it in settings and we store it", and section 12.3, `element-notes-api.md` 5 and the
  skeleton's Settings > General all say the same.
- **Element conventions followed:** the missing-note error is `E_UNKNOWN_NOTE`, like
  `E_UNKNOWN_RUN` and `E_UNKNOWN_LAYER`; the exempt author setting is named in `COMMANDS`; the
  notes example starts the run it cites (`runs.start`) instead of a made-up run id.
- **Why targets need a stable form, stated correctly.** A node id does not change on a reload (kept
  sets store it as is); edges' session ids do, and several node types make a bare node id
  ambiguous (`element-notes-api.md` 3.1).
- **Reserved paths are exact.** Only `notes.count`, `notes.latest`, `notes.latestTime`,
  `table.type` and `table.name` are reserved; a bare `notes` or any other `notes.<x>` still reads
  an attribute, and the one reader whose result changes is named (`element-notes-api.md` 6;
  `element-requirements-5.md` section 3).
- **`ProjectSlice` gaining `"notes"`** is flagged: the union is not marked OPEN today, so the
  release must mark it or be a major (`element-notes-api.md` 7).
- **The load description matches today's API.** `data.import` keeps `mode` in `ImportOptions`,
  still resolves to nothing, and its report is still `data.lastImport()`; the tables form is a new
  shape of `DataSourceInput`. The Name role's key is `displayName` (it collided with the table's
  `name`) and is documented as `nodeLabelPath` per type, not the drawn label (owner: labels are
  picked in styling) (`element-requirements-5.md` section 3).
- **One way to say "repeated links".** One edge per Row or Pair now explicitly subsumes the
  element's existing `repeated-edges` setting (keep, first, last, sum, min, max, error), translated
  inside the element (`element-requirements-5.md` section 3).
- **Weight extends what exists.** A run's existing `caveats.weight` (`{ attribute, meaning }`) gains
  `source` and `converted` instead of a new shape, and `defineAlgorithm`'s weight meaning gains
  `"capacity"` (`element-requirements-5.md` section 4).
- **Label style type named correctly**: `LabelStyle`, the element's public type, not the internal
  `RichTextStyle` (`element-requirements-5.md` section 2).

Changes from the second review of the version 4 skeleton (graphty-element API, ontology,
accessibility, interaction, Figma and Tableau readings), each a studio decision, reversible with
an edit. Where a line below contradicts an earlier review line in this appendix, this one wins.

- **Cites and group targets use graphty-element's existing `ResultItem`.** The first draft added
  a `{ run, group }` target, a `startedAt` stamp on cites and its own overlap rule, a second way
  to name an object the element already names. A cite is now `{ result, run }` (the result
  pinned to the run the note was written against, the opaque token a pinned `ResultItem`
  holds) or `{ step, at }`; a group target is `{ item: ResultItem }`; a whole result is
  `{ result }`. Following a group by overlap after a rerun is the documented reading rule for an
  unpinned item (`element-notes-api.md` 2, 3, 3.1; `element-requirements-5.md` section 1).
- **`{ layer, group }` is withdrawn.** It tied a note about a data value ("group 2") to a style
  layer's id, so deleting and remaking "Show as groups" orphaned the note. Such a note now
  stores the rule, `{ where: Query }`, the form rule sets already use (`element-notes-api.md` 3).
- **The Category role is renamed Subtype** (`subtype: "<column>"`, `table.subtype`). Category is
  already a column's data type (graphty-element's `"category"` attribute type and the Abc glyph),
  and a published API must not use one word for two things. Subtype is the conceptual model's own
  word (section 11.3; `element-requirements-5.md` section 3; the skeleton's role menu).
- **Notes belong to one graph.** graphty-element's session holds one graph, so each graph keeps
  its notes and the Notes place lists the current graph's (section 8, section 14;
  `element-notes-api.md` 2.4). Flagged for `conceptual-model.md`, which puts notes on the project.
- **The author name lives in the `config` part**, not the notes part, because notes and recipes
  both read it. `SavedNotes.author` and the import option `author: "keep" | "replace"` are gone
  (`element-notes-api.md` 5, 7).
- **`note:changed` also fires when what a note reads changes** (a target goes missing, a cited
  result is rerun), with `change: "updated"`, `fields` naming the part and `cause` saying why
  (`element-notes-api.md` 4.3).
- **A weight is one object**: `weight: { column } or { derived: "count" }`, with its `meaning`
  inside, so a meaning cannot exist without a weight. The derived count is graph-format's
  existing `"count"` reducer (`element-requirements-5.md` sections 3 and 4).
- **`node.label` is shorthand for the slot its location names**, so there is one way to put a
  label above a node and no collision rule (`element-requirements-5.md` section 2).
- **Section 14 now matches the body** on cites (results and filter steps), the weight's meaning
  (per edge table) and node type (the table's type; subtype is a role).
- **Node weight has one truth.** Analyze and the floors inspector name the same candidate reader,
  PageRank's restart weights, both marked as needing graphty-element, and a type with no weight
  column weighs 1, said in the people report and the Analyze line (section 11.3, 2.2).
- **The Data page's counts agree with the loaded graph**: Load from Row lands on the Row result;
  the Pair strip counts the rows kept ("1,306 edges from 4,180 of 4,212 rows"); Add as people
  shows "412 + 25 added" in the Tables list, the strip, the Sources row and the graph's
  inspector; unmatched pairs are grayed "left out" in the grid; an edge table with no weight says
  "Weight: none (each edge counts 1)"; an edge weight has the same missing-value line as a node
  weight; a repeated Name is reported; the "needs graphty-element" mark sits after Load.
- **Two edge tables, two weight lines**: Analyze and the graph inspector name each edge type's
  weight when there are several (section 2.2).
- **Out of scope, stated**: polymorphic links and composite keys (section 11.3).
- **Labels**: the Label popover edits the line clicked and keeps the inspector it came from; a
  label line has no bind icon (its value is the one door to its field); "+" returns to an empty
  line instead of adding a second; Label by adds its row on top of the tree and draws the
  attribute on the canvas; the worked example is name above, degree below (section 16.6).
- **Notes place**: Delete moves focus to the next note (section 8); the filter icon is pressed
  while a filter is on; a saved note counts in every Notes section at once; the editor is a list
  item; a marked note uses `aria-current`; each note declares its keys; and every shortcut's
  `aria-keyshortcuts` is written in valid form ("Control+Enter Meta+Enter" for Mod+Enter).
- **Two more graphty-element rows**: a direction option on shortest path, and a tour stop that
  names a saved view and a hold time (`element-requirements-5.md` section 5).

---

## Review changes (version 5)

Changes from the method review of version 5 against this round's criteria (one wide-data pattern
everywhere, nested JSON that is general, plain graph JSON in one step, a complete state matrix,
nothing in the app that graph-io or graphty-element should do). Each is a studio decision,
reversible with an edit.

- **Every attribute picker is the field list, at every length.** Four pickers that choose an
  attribute were outside the field list's list and would have stayed plain menus at 26 or 69
  attributes: the Weight line (Analyze, the Path popover, a run's Made with), a recipe's binding
  choice, and Select where. They are now in it (section 2.5). The rule "menus of 15 or fewer stay
  dark menus" no longer applies to attribute pickers: Color by is the same component with 4 rows
  on Les Miserables and 69 on the hosts, drawn as a dark menu with its groups, Find shown past 15.
  Otherwise one picker would change form as the data grew, two patterns for one job.
- **Select where stops listing attributes in its hint.** With 69 attributes the hint would be a
  wall; its one link, Insert attribute..., opens the field list and inserts the stored path at the
  cursor (section 10.1).
- **Typed pickers take suitability from graphty-element.** A `list` or kept-whole attribute is not
  one value, so Color by and Size by list it as unsuitable with the reason; which attributes a
  scale accepts comes from a new `AttributeDescriptor.domainKind`, matching the element's
  `ScaleDescriptor.domainKind`, so the app does not copy the element's type-to-scale rules
  (`element-requirements-5.md` section 7).
- **Nested JSON is not the sample's shape.** Section 11.4 gains the other common shapes, each
  handled by an existing control: records keyed by id, a document that is one array and JSON
  Lines, arrays of arrays (`column1` ... as a headerless CSV), an object of values keyed by ids
  inside a record (the array role menu), a reference in a sub-object, arrays inside a child table,
  and arrays whose items differ in shape. The stored path syntax gains `.*` (the values of an
  object), in graphty-element's own path grammar (every wildcard flattens; it matches neither
  JMESPath nor JSONPath exactly). graph-io's `describeJson` reports these
  shapes (`element-requirements-5.md` section 8). A second domain, a package registry, shows them
  on `data-page/json-keyed`.
- **Plain graph JSON stays one step when its records are nested**: a sub-object in a graph file's
  node or edge records is flattened with no question asked (section 11.4).
- **The state matrix gains five surfaces it missed**: the note editor, the Data page's role menu,
  the Layout popover, the time slider and the Neighborhood popover, each with its existing routes
  and three new routes to build (`notes-place/editing-long`, `analyze-popover/wide-weight`,
  `data-page/json-keyed`).
- **Regression (a) is checked on two datasets**, Les Miserables and the door entries, because the
  defect was a walk that worked on one dataset only.
- **Confirmed in the skeleton source, before the build**: (a) Shift+Arrow still jumps to Valjean on
  Les Miserables only (`app.js`, the canvas key handler), so it is not fixed; (b), (c) and (d)
  stand as `state-matrix.md` records them, each to be confirmed on its route. 85 routes named in
  the matrix (88 with this review's three) and every Narrow cell still wait on the build and on
  `study.mjs` reading the `@1024` suffix, so criterion 1 does not yet hold; the matrix says so
  cell by cell.

Changes from the API review of version 5 against graphty-element's, graph-io's and graph-format's
current source:

- **graph-format already has a `list` data type** (offsets plus one child column), and graph-io
  already writes one for Cytoscape's `classes`. The requirement for a new, one-way-door data type
  is withdrawn; what remains is inference, so an array of scalars becomes a `list` column instead
  of an opaque `json` one (`element-requirements-5.md` section 8, graph-format;
  `owner-questions-5.md` sections 6 and "Still open").
- **Grouping by table needs the element to say which table an attribute belongs to.**
  `AttributeDescriptor` has `kind` (node or edge) but no node type or edge table, so the field
  list's "groups by table" would have made the app guess. New row: `elementType`, with one
  descriptor per type that carries a path (section 7 above; `element-requirements-5.md` section 7).
- **"In use" tags come from the element.** `usedBy` entries gain `channel`, so "Color",
  "Weight" or "Filter" is read from graphty-element, not worked out from the app's copy of the
  layers.
- **One pattern for picking a field.** The bind icon's From data list was still "a dark menu with
  a filter field" that hid the fields a property cannot take; it is now the field list, with
  those fields listed last and disabled with the element's reason (section 16.3). Section 2.5's
  "any list past 15 items" now says how the non-attribute lists past 15 (Shape, the label style's
  fields) search: the same find field and matching, over their own items.
- **Nested JSON is general, not tied to the sample.** Edge tables are proposed when two fields'
  values match node tables' keys, not when their names look like ids, so `from` and `to` or
  `person` and `org` are found (section 11.4). Child tables carry their parent's row number when
  the parent has no key, at any depth. A consumer's existing `node.path` written in fuller
  JMESPath keeps working, deprecated, until the next major release.
- **The exported `AttributeType` gains `"list"` and `"json"`**, which breaks a consumer's
  exhaustive switch at compile time: named in `element-requirements-5.md` section 7 and in
  `owner-questions-5.md`'s list of names to confirm on the pull request.
- **The state matrix gains two shared components**: the "+" menu (one item, a few, and past 15
  the field list) and the design-note chip.
- **Not changed, to build**: `app-b/README.md` still documents `plus()` as "a dark menu, with a
  filter field past 15", and `lib.js` has no `AB.fieldList` yet; the menu past 15 must become the
  field list, menu size, for one pattern per job to hold in the skeleton.

Changes from the ontology and generality review of version 5 (the conceptual model, every
domain, and the one-home rule). Each is a studio decision, reversible with an edit.

- **Repeated links keep one control.** Pairs that two records both list in an id array were
  offered as "One edge | Two edges", new words for a job version 4 already gives one control: the
  edge table's **One edge per: Row | Pair**. The report line now carries that control, **One edge
  per: Item | Pair** (Item is Row's counterpart for a list column), Pair by default on an
  undirected graph (section 11.4; `owner-questions-5.md` section 3; `element-requirements-5.md`
  section 8, where `onePer` already used these values).
- **A list of values can become nodes with no new control.** Several edges uses version 4's link
  submenu, so New type... turns `tags` into tag nodes, one edge per item (section 11.4). This is
  the general case behind "an array of values that names things".
- **Lists and values kept whole are placed in the conceptual model.** A list of categories is the
  model's cover (Show as groups); a list of numbers is its numeric vector, kept, shown and
  exported, never drawn; a value kept whole is new and flagged for the model as an opaque value
  (sections 11.4 and 14). Typed pickers list both last, disabled with the element's reason, so no
  picker invents a way to draw them.
- **"In use" counts runs.** An attribute read by a run's weight override is in use, tagged with
  the run's name; `usedBy` gains the kind `"run"`, and section 2.5 now says what "in use" means
  and that it comes from graphty-element (`element-requirements-5.md` section 7).
- **Every N/A in the state matrix has its reason.** 102 cells in 20 rows (the menus, the dialogs
  and the shared components) read a bare "N/A", which criterion 1 does not allow; each now says
  why the state does not apply. Eight cells named a route that does not exist yet without the
  BUILD mark; they now carry it, so `study.mjs --matrix` cannot read them as built.
- **The field list on nested data has a route**: `style-pickers/nested-color-by` shows the parent
  subheads and `tags` and a sub-object kept whole listed last and disabled with their reasons
  (`state-matrix.md`).

Status after the build (2026-10-01): every route `state-matrix.md` names is built, the matrix
carries no BUILD mark, and `study.mjs --matrix` passes all 312 of its routes, Narrow ones at
1024 x 768 included. Regressions (a) to (d) are confirmed fixed on their routes. The bind
icon's old From data menu helper, which had no caller left, is removed, so the field list has
one entry point (`AB.openFieldList`).
