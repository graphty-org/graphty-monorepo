# Refined structure B: the complete specification (version 3)

This page specifies the app structure that round 7 tests: one tree of paint rows on the left,
the canvas in the middle, an inspector on the right with Style and Data tabs, a table dock at the
bottom, and an icon-only toolbar. It is the reference for the clickable skeleton the owner reviews
before any focus group or flow study.

Version 3 answers the owner's third review (2026-09-30) and carries the studio's streamlining
pass. The answers are in `owner-questions-3.md`; every adopted change, by screen, with its reason,
is in `streamline-3.md`. Earlier answers are in `owner-questions-2.md`. Where this page and the section
"Corrections after the skeleton review" at the end of `streamline-3.md` disagree, that section wins.

**Changed in version 3:**

- **One pattern per job** (section 2.5): unset values, adding, popovers, tooltips, rename,
  delete, notices, empty states, disabled controls, on/off controls.
- **Style tab rebuilt on it** (section 16): no counts; sections always open with "+"; one line per
  set property; detail and binding in popovers; Everything uses the same tab as every row.
- **Toolbar**: icons only with delayed tooltips (owner); Analyze | Layout, View, Legend | Quick
  actions; the Camera menu, Legend chip, layout chip and "?" leave the canvas; Select leaves until
  lasso ships (section 2.3, 9).
- **"Why this look"** is collapsible (owner) and lists only the winning rows (section 5.4).
- **Paths**: one Path popover; pick mode deleted (section 2.3).
- **Data place**: Sources, Filters, Attributes only; one load dialog opened by "Edit source...";
  each fact about a column has one home; what to take from Tableau (sections 2.4, 7, 11.3).
- **Labels from fields and notes** (section 16.6); **notes on every target**, edges included
  (section 2.1).
- **Menus flattened**; the main menu button moves into the header (section 10).
- **Settings**: six sections plus Diagnostics (section 12.3). **Export**: five outputs (12.1).
- The review-change appendices of versions 1 and 2 are removed; their outcomes are in the body.

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
- **Owner: the skeleton comes back to the owner for review before any user testing.**

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

| The note is about | Its count shows on | It is read in |
|---|---|---|
| a group, set, path, measure or other style-layer row | that row | the row's Data tab, Notes section |
| a run | the run row | the run's Data tab |
| a node or an edge | the Notes row's paint; the table's Notes column | the element's Data tab |
| the graph | the graph's entry in the Graphs switcher | the graph's Data tab |
| a filter step | the step in Data > Filters | the step's inspector |

A note that cites a run cites that exact run. If a rerun replaces it, the note's run chip carries
a history icon whose tooltip reads "cites an earlier run"; the chip opens that run's settings.

**Needs graphty-element:** graphty-element has no notes store. Notes live in the app's project
file meanwhile, with one needs-graphty-element mark at the Notes place header. Whether notes join
the element's public session API is **open for the owner** (a one-way door); the studio
recommends yes, with one target type for all the kinds above and a `notes.*` path a style binding
can read (section 16.6).

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
- **Picking an entry** shows its essentials only: **Weight** (a dropdown of None and the numeric
  attributes, with its meaning as one segmented control, "Higher = stronger | Higher = farther",
  defaulted from the catalog's weight kind) and the **one key option** (resolution, damping, From
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
2.1.4). Esc closes a popover or bar first and never clears the selection. The toolbar is one Tab
stop with arrow keys between buttons; Alt+Down, Enter or Space opens a flyout; F6 cycles the
regions (rail, left panel, canvas, toolbar, table, inspector).

**The selection bar.** While something is selected, a bar attaches directly above the toolbar,
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

### 2.4 The Data place, and what to take from Tableau

**Studio decision: the rail place stays "Data" and holds three sections: Sources, Filters,
Attributes. Bringing data in and fixing how a file is read happen in one load dialog. Each fact
about a column has one home.**

The owner asked (third review) whether the Data sidebar tries to do too much, and how much of
Tableau's data loading to copy. Yes, it did too much: five sections in 240 px, source rows four
lines tall, attribute rows with six marks, and how a column is read editable in four places.

**One home for each fact about a column:**

- **Structure** -- which column is the node id, the edge start, the edge end, the edge id, and
  the positions -- is read at load by graph-io, and changing it replaces the data. Its home is
  the source: the load dialog, opened by **Edit source...**.
- **Interpretation** -- an attribute's type (Category, Number, Time) and its role
  (**Name**, Time) -- applies without a reload. Position is chosen once, under the load dialog's
  sample columns. Its home is the attribute's inspector.
  Name is graphty-element's `nodeLabelPath`: what a node is called in the inspector title, the
  table, search and path results. It draws nothing on the canvas (labels are style, section
  16.6).
- **The weight is not a role.** Each run asks for its weight, and what the weight means, in the
  Analyze popover, where graphty-element records it per run (`caveats.weight.meaning`). The
  element's graph-wide `edgeWeightPath` is left at its default (section 18.9).

**What graphty takes from Tableau** (the research is summarized here; its key finding is that a
graph source already is a Tableau relationship -- edge ends point at node ids, fixed by the
format -- so there is nothing for a reader to model):

| Tableau | Call | Reason |
|---|---|---|
| Data Source page | Adapt, as the one load dialog for now | its value is building joins, which graphty-element cannot do; without them a page would hold a dialog's content and a second copy of Attributes. The dialog grows into a page, by moving its content, when the element ships a join |
| Connect pane (File, URL, Paste) | Copy | the load dialog's three source choices |
| Roles set in the data grid's column headers | Copy | structural roles under each sample column's header (Cytoscape's import does the same) |
| Typed fields | Copy | one glyph and one word per type everywhere: Abc Category, # Number, calendar Time (no Ordered until graphty-element has an ordinal level) |
| Data source filters | Copy (already in place) | filters run before anything is computed; the eye is the drawing-only hide |
| A filter written as a sentence | Copy | a step reads [amount] [is at least] [1,000] |
| Refresh, warning about removed fields | Copy | before Apply: "region is gone; Community 3 colors from it" |
| Calculated fields | Copy, needs graphty-element | "+" on Attributes; the element removed its expression evaluator on purpose, and an app evaluator would be graph logic in the app |
| Data Interpreter | Adapt (mostly exists) | graph-io's detection and the import report; the source's Made with lists warnings first |
| Joins | Adapt to one case, later | **Add columns by key**: keep every node, match one key, report "matched 2,811 of 3,000; 40 table rows matched nothing". Needs graphty-element (a join-by-key load option); hidden from the user-test build. Inner joins are filters; full outer joins would create nodes from a non-graph table; non-equality and cross-database joins fit no graph task |
| Relationships (drawn links between tables) | Skip the drawing | one match line instead: "9,113 edges; 0 with an unknown end" |
| Unions | Skip as a feature | "Add to this graph" already appends; "only March" is a time filter step |
| Dimension and measure | Skip | that split is about aggregation, which a node-link drawing does not do; "measure" already names a paint row |
| Blending; live vs extract; extract filters; pivot; split | Skip | one graph per view; the project always keeps a copy; one filter home; no task asks for them |
| The word "field" on screen | Skip | the screen word is "attribute"; Find and Quick actions accept "field" as an alias |

Rejected: a full-page Data source mode now (a new route, header and state set to hold dialog
content); Versions and Sent and saved in the Data place (each had another home); a declared
weight role (a second home for each run's weight).

Round 7 checks, worded without "join", "source", "attribute" or "field": "make the account names
come from the second file" (do testers reach Sources and read the match line?), "amount looks
wrong" (do they reach the attribute's type, not the dialog?), "only March" (Filters?), "use
transfer amounts as distances for the shortest path" (Analyze, not Data). If more than half try
to fix a type inside the load dialog, its column header gains a read-only type glyph that links to
the attribute -- not a second editor.

### 2.5 One pattern per job

The owner's third review asked where interaction patterns can be the same. These rules hold on
every screen; a screen that breaks one is a defect.

| Job | The one pattern |
|---|---|
| Show an unset value | A property not set is not drawn. Its section's "+" adds it. Inside a popover only, an unset field shows its effective value in gray, its source in the tooltip ("Verdana, graphty-element default"); typing sets it. |
| Add | "+" in the header of the list or section it adds to, nowhere else. One possible item: "+" adds it. Several: "+" opens a dark menu (searchable only past 15 items). None left: the "+" disappears. The new item gets a default name and opens into rename, its value focused. |
| Edit a value | Numbers and text in the field (drag the name to scrub a number; Enter commits, Esc reverts). Colors and choices: click the value to open its picker. |
| Advanced options | In the popover the value opens, never an accordion in anything editable. A line whose value is typed in place (Label text) has a swatch that opens its popover. |
| Read-only blocks | Collapsible, with a chevron, a one-line summary when closed, and the state remembered per kind ("Why this look", Data tab sections, Notes). |
| Surfaces | **Dark menu**: choose a command or one item; no title; closes on the pick; one line per item, a second line only for why an item is disabled. **Light popover**: edit a value; a title and an X; applies each change live; Esc or a click outside closes it; a footer button only when it creates something. **Modal**: takes over the screen (load, export, apply a file, settings, shortcuts) or confirms what cannot be undone. |
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
transform API), hidden in the user-test build. Loading a file as a new graph is the load dialog's
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
  attribute's type glyph, whose Label Text is bound to it and which paints every element that has
  a value (a measure row in kind: one bound property).
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
- **Notes** paints **only the nodes and edges notes are about**. Its Style tab is the shared
  component, with a Nodes and an Edges side. Its default look is graphty-element's, not the
  app's (owner principle); until the element ships one, the row starts with nothing set and its
  Paints line reads "Paints 4 nodes (noted). Nothing set -- + to add a look". Its eye is the only
  switch for note markers. **Needs graphty-element**: the element's reserved notes layer and a
  notes store (2.1); until then the real app may paint it with a temporary user layer selecting
  the noted ids, commented with its issue.
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
     editable fields, except an attribute's Read as and Role (5.2).
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
| **One node** | Style, Data | **Why this look** (5.4) | Summary (attributes, then results with rank; Degree is the link that selects the neighbors), Memberships, Notes |
| **One edge** (from the table, a row, or a node's inspector; edges cannot be picked on the canvas) | Style, Data | Why this look | Summary (Direction, attributes with the weight marked by a small icon, results once there are any), Memberships, Notes |
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
| **Attribute** (from Data) | none | -- | Summary (From the file -- named in the header's provenance link --, **Read as** and **Role** as two dropdown rows, completeness), Values (the shared histogram), Painted by (the rows that paint from it, as links) |
| **Filter step** (from Data) | none | -- | the condition as one sentence row ([amount] [is at least] [1,000]), an **Apply this step** checkbox, the count before and after, Notes |
| **Source** (from Data) | none | -- | Summary, Made with (7) |
| **Saved view** (from Views) | none | -- | section 4.1 |

- **Read as**: Category, Number, Time (the type glyph's word everywhere). Changing it
  needs graphty-element (no attribute type override yet); drawn with the mark. Ordered is not
  offered until graphty-element has an ordinal level.
- **Role**: None, Name, Time. Name writes the element's `nodeLabelPath`, Time its time
  path, at once with no reload. Position is chosen once, in the load dialog. **To confirm with graphty-element**:
  that changing a known field after load re-derives what depends on it.
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

1. **Sources** -- the one home for bringing data into this graph.
   - **A row**: the name, then one quiet line, "3,000 nodes, 9,113 edges . Sep 28" (counts as the
     element reported them when that load finished). A changed URL or a replaced file shows the
     shared out-of-date mark in the trailing slot. A paired node file is a label line under its
     source ("accounts-2026-03.csv, node file") with no menu: the pair is one load.
   - **"+"**: File..., From a URL..., Paste..., Set collection... (a folder of set rows), and Add
     columns by key... (needs graphty-element; hidden in the user-test build).
   - **Row menu** (section 10.3's order): Rename, **Replace with file...** (the file picker
     first, then the load dialog titled "Replace: transfers-2026-03.csv" with every read setting
     carried over; when every column matches, focus is on Load, so top task 12 is the command,
     the file and Load), **Edit source...** (the load dialog on the current file, to change how it
     is read), **Refresh** (a URL source). There is no per-source
     Remove until the element records which source each record came from (needs graphty-element).
     **Clear graph data** is in the graph's "..." menu (it acts on the graph).
   - **Clicking a row** opens the source inspector:
     - **Summary**: Nodes at load, Edges at load, "Read Sep 28, replaced Sep 30" (a link to
       Version history, the one home of data versions), Kept (a copy of the file, or the
       address), and for a URL, "Changed since last read: Yes (Sep 29)" (the fingerprint in its
       tooltip). Direction is not here: it is one setting of the whole graph (the element's
       `data.directed`), set in the load dialog and read in the graph's Overview, which names the
       source that settled it; with two sources a per-source Direction would show one value twice.
     - **Made with**: warnings first, then the match line ("9,113 edges; 0 with an unknown end"),
       then the read settings that are not at their default, in the load dialog's words (both
       generated from the element's catalog). Each value is a link that opens Edit source... at
       that field.
     - The **state bar** carries the button: "The data at this address changed since Sep 29 --
       Refresh"; "Refresh failed after 3 tries -- Try again".
   - **No extract or live toggle.** The project keeps a copy of each source and replays the load
     on open. Live connections need graphty-element and are not drawn.
   - **A derived graph** has no "+"; its Sources section shows one read-only origin line.
2. **Filters** -- the ordered steps, evaluated top to bottom.
   - **A row**: the rule ("amount is at least 1,000"), the outcome only while the step is on
     ("3,000 to 812 nodes"), the note count when the step has notes (the tree's slot and badge),
     and an **Apply this step** checkbox in the trailing slot (a checkbox,
     not the eye: the owner decided the eye only stops drawing, and a filter changes what is
     computed). An off step is grayed with no sentence. Drag the row to reorder.
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
3. **Attributes**, in two groups, **Nodes** and **Edges**, computed attributes first (marked by
   their run icon), then by name.
   - **A row**: type glyph (a mark, not a button; tooltip "Read as: Number"), name, role tag on the
     right (Name, Time), and the shared out-of-date or scope mark.
   - **Clicking a row** opens the attribute's inspector (5.2). Its menu: Color by, Size by (Width by
     for edges), Label by, Show as groups, Place by (position attributes only; any other attribute
     as an axis needs graphty-element), Filter to..., Create set where this is..., Read as..., Show
     in table.
   - **"+"** is New attribute (an expression column), drawn disabled: needs graphty-element.
   - **Find attribute** appears only when the list is longer than the panel.
   - The list, types, completeness and ranges come from the element's `session.data.attributes()`.

Graph-level readings are not attributes: they are on the run's Data tab and the graph's Overview.

---

## 8. Notes place

- **Header**: the title and **+** (Add note, N). **Treebar**: "Find in notes" and a filter icon
  that opens All notes, About the selection, About this graph; when a filter is on, the icon is
  pressed and the list heading names it ("About Valjean").
- **Each note**: its text, author (only when the project has more than one), time, and **chips** --
  its targets and the runs it cites, each a kind icon plus name. A cited run that was replaced
  shows a history icon in its chip. The hover actions ("...") sit in the meta line's trailing slot.
- **Clicking a note selects all its targets**: several give the several-elements inspector; target
  rows scroll into view; the camera flies to element targets.
- **Editing**: double-click a note's text, or Edit in its menu, turns that note into the editor in
  place. A new note's editor opens at the top of the list, its targets from the selection as chips
  with an x. Mod+Enter saves (in Save's tooltip), Esc cancels.
- **Note menu**: Edit, Copy link to note, Delete (immediate, with Undo). Its heading is the note's
  first words.
- Notes about elements removed by a filter step are listed under "About elements not in this
  filter step", never dropped.
- Empty: "No notes. Select something and press N, or Add note about the whole graph."
- One fixture note is about the edge "Valjean - Javert" (edge icon chip).
- Counts count notes, everywhere; the fixtures show the same number in every place.

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
(the load dialog, with File, URL and Paste as its source choices; "Start with no data" is in it),
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

### 11.3 The load dialog

Every data door -- Sources "+", Edit source..., the start screen's New from data..., a drop, Ctrl+V
with text on the clipboard, the empty-canvas card, Quick actions -- opens **one load dialog**. Its
title says the act ("Add to Transfers", "Open as a new graph", "Edit source: transfers-2026-03.csv").

- **Source**: File, URL or Paste (Tableau's Connect choices). A URL is fetched with the element's
  default of three tries.
- **Left column**: **Format** (the element's detected guess; when several formats match, the
  candidates first under "Matches this text"; a format the catalog knows but no reader serves
  shows the element's reason), **Separator**, **Direction** (including "As the file says"), and
  **More options** -- a popover holding edge id, positions and position scale (shown once
  positions are chosen), repeated pairs (the element's seven policies), id handling (1 and "1" as
  one node or two) and the error limit. A field with only one possible value is plain text; a
  value that was detected carries a small "auto" mark (its provenance in the tooltip).
- **Right column**: the **sample grid**. Under each column header is its **structural role**: node
  id, edge start, edge end, edge id, position, or attribute (Cytoscape's pattern). Clicking a role
  opens a menu of the others. Name, Time and type are not set here: they belong to the attribute
  (section 2.4).
- **Field labels and values are generated from graphty-element's format catalog**
  (`FORMAT_DESCRIPTORS`, each option's `plainName`), never typed, so the dialog and the source
  inspector cannot drift into two vocabularies.
- **Load into** appears only on a drop or paste into an open graph: **This graph | New graph**
  (a segmented control; the description in its tooltip). Otherwise the door decides and the title
  says it. "Replace" means one source, through Edit source....
- **When nothing needs a choice**, the dialog opens with every section showing its summary and
  focus on Load, so a clean drop is one Enter. Otherwise focus goes to the first field that needs
  a choice.
- **Problems** appear in two places only: under the field that fixes it, and as the footer's reason
  for a disabled Load. A line under a field is only ever a warning.
- **Before Apply on an Edit source or Refresh**, the footer lists lost attributes and what paints
  from them ("region is gone; Community 3 colors from it").
- **Refusals**, one per typed element error, worded with the element's details: empty file;
  could not be read (with row numbers and the element's suggested fix); unknown format; no
  endpoint columns found (naming the columns the file has); missing or duplicate ids; fetch failed
  after three tries; too large to draw. A refusal no setting can fix makes **Choose another
  file...** the primary button; one a setting can fix keeps Load again.
- **One source at a time**: the element rejects a load that a newer load overtakes, so a second
  drop while the first reads is refused with the notice "transfers-2026-04.csv was not loaded:
  transfers-2026-03.csv is still reading". Two CSVs dropped together are offered as the paired
  node and edge load.
- **After the load**, the element's import report is kept per source and read in the source's Made
  with. Load lands on the Graph place with Selection, Notes and Everything in the tree and the
  canvas drawn in 3D.

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
- **A run's weight** is listed with the bindings ("Weight: amount, higher = stronger"), matched by
  name like any binding; its meaning control shows only when the weight is unmatched. The weight
  is chosen per run, not by an attribute role, so a recipe confirms it here.
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
| General | Your name, stamped on each note and recipe you write (**open for the owner**, carried: per person, so one project can hold several authors); Theme (System, Light, Dark; the app's chrome only, until graphty-element takes a color scheme); Number format |
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
   label style popover; Label Text bound to Name; the From data list with its disabled Notes group.
3. **The inspector frame** for every kind in section 5.2, including "Why this look" open and
   closed, the state bar, the folder's Paints line, the Overrides list.
4. **Graph place**: Selection, Notes, a PageRank row, a Louvain run (collapsed and expanded), a path,
   a folder, Everything; status icons; the footer line's four messages; rename and its refusal
   tooltip.
5. **Analyze popover**: open, an entry's essentials, revising a row, a running row.
6. **Views place** with In tour checkboxes, Save view's naming row, a view's inspector, Present.
7. **Data place** on transfers: Sources, Filters, Attributes; the source inspector; the load
   dialog with a CSV (clean drop), pasted text with several formats, Edit source with lost fields,
   each refusal; the attribute inspector's Read as and Role.
8. **Notes place**: a note about two targets, a note about the edge Valjean - Javert, editing in
   place, the empty state.
9. **Table dock**: Nodes, Edges, "Louvain"; members of a row; the time slider.
10. **Menus**: the main menu (one level), the project-name menu, every context menu.
11. **Export** (Image, Video before, during and after, disabled outputs), Apply file, Settings.
12. **Canvas states**: loading, empty, refused, GPU lost; the notices.
13. **Full-canvas modes**: Version history and Compare.

Skeleton files this changes, in `../../app-b/`: `lib.js` (the tooltip, popover and menu helpers;
`section`, `styleTab` and `whyThisLook`; the notice slot; the field-row grid), `app.js` (the header
and canvas furniture), and in `sections/`: every inspector, `style-pickers.js`, `toolbar.js`,
`camera-menu.js` (becomes the View flyout), `selection-bar.js`, `path-tool.js` (becomes the Path
popover), `canvas-and-states.js`, `graph-place.js`, `graphs-switcher.js`, `main-menu.js`,
`project-menu.js`, `context-menus.js`, `commands-and-search.js`, `select-where.js`, `data-place.js`,
`inspector-source.js`, `load-step.js`, `table-dock.js`, `notes-place.js`, `assistant-place.js`,
`views-place.js`, `present-mode.js`, `full-canvas-modes.js`, `analyze-popover.js`,
`export-dialog.js`, `export-image.js`, `export-video.js`, `recipe-apply.js`, `settings.js`,
`start-screen.js`.

---

## 14. Framework changes this structure requires

To be recorded with their reasons in `information-architecture.md`, `figma-crosswalk.md`,
`interface-specification.md` and, where marked, `conceptual-model.md` (outside the studio's write
area; flagged for the owner):

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
  targets); the attribute role "label" is named **Name** on screen; the weight is chosen per run
  and is not a role; the roles color and size (values a file brings to be drawn as they are) are
  bindings on a row's Style tab, not roles, and the node-type and edge-type roles wait until a
  task needs them, so the screen offers Name and Time only (Position is chosen under the load dialog's sample columns). Folders are app
  organization, not model objects, and are not note targets.
- The glossary gains "measure row" as a document-only word beside the screen word "metric".
- **Top tasks** (`top-tasks.md`): the recipe bookend's "the analyst confirms only weight roles"
  becomes "each run's weight" (section 12.2), since the weight is no longer an attribute role.

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
| Load a graph | Data > Sources "+"; the start screen; drop; paste | the load dialog; the source's inspector |
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
   element publishes one; empty if neither exists), its value focused.
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

- **The bind icon opens the From data list** (a dark menu with a filter field): the element's own
  attributes in their file spelling, then run results under their row names, then a **Notes**
  group (section 16.6), each with its type glyph. The list is filtered by what the property can
  take (a text property lists everything; a color lists everything with a scale).
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

### 16.6 Labels from fields and from notes

- **A label from a field works today.** Label "+" adds the Text line, **already bound to the
  attribute whose role is Name** (a convenience: nothing is drawn until the reader adds the line,
  so the owner's styling principle holds). The bind icon picks any other field or result. graphty-
  element binds `node.label` or `edge.label` to `data.<field>` or `results.<run>.<field>` with the
  passthrough scale; writing the label text is what turns a label on.
- **Scope follows the row**: on Everything every node is labeled (works today: Everything's edits
  go into an ordinary `match: "everything"` layer, section 3.7); on a "Top 10 by PageRank" set row
  only the hubs are. **Label by** on the Name attribute (below) is the other route, a row of its
  own. The skeleton shows Everything, the set row and the Label by row.
- **Label by** in an attribute's menu (beside Color by and Size by) makes a row whose Label Text is
  bound to that attribute.
- **One field per label.** "Name (degree)" needs label templates (needs graphty-element, low
  priority). A number bound to a label draws unformatted until the element formats text bindings
  (needs graphty-element, ranked above templates). The old `textPath` is never offered (the element
  withdrew it).
- **Notes in labels: designed, not possible today.** The From data list's **Notes** group holds
  **Note count** (notes whose targets include this element directly -- the same rule as row note
  counts) and **Latest note** (its first line), drawn disabled with one needs-graphty-element mark.
  Note count is a number, so it can drive size and color too. The app never copies notes into
  `data.*`. The element request: a notes store with a `notes.*` path a binding can read (`count`,
  `latest`), followed by the dependency tracker so a label repaints when a note is added. The
  natural place to use it is the Notes row: Notes > Label > Note count gives a count on every
  noted node, with no new feature.
- Edges have no tooltip (`edge.tooltip` was withdrawn in 2.0), so a note shows on an edge only as
  paint or a bound label.

### 16.7 The unopinionated rule

Owner principle: "styling should be unopinionated and left to the user". Studio decision: **the
app adds no look of its own.** Every paint on the canvas is a row the user can see, restyle, hide
or delete, or an element setting the user can change. The only paint that arrives unasked is the
element's defaults (Everything) and a run's suggested style (owner: runs paint when they finish;
"Restore the suggested look" in the run's menu brings it back). Dimming what is not selected is a
layer the reader adds. The Notes row starts with nothing set until the element ships a default.

Precedents: Figma's Fill, Stroke and Effects sections with "+", its settings popovers and its
variable binding; Tableau's Marks card (an empty shelf until a field is dropped on it); Gephi's
Unique / Partition / Ranking split, which is the Value or From data choice. Counter-example:
Cytoscape's Style panel, which lists every property with a default column.

Round 7 first-click tasks: "make the edges dashed" from a group row; "make the noted characters
stand out"; "show each character's name" (Label by on the name attribute, or Label on a row's
Style tab -- not the attribute's Role); 85% target.

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
| Bringing data in | Data > Sources "+" | start screen, empty-canvas card, drop, Ctrl+V with text, Quick actions |
| How a file is read (structure) | the load dialog | Edit source..., the source's Made with values |
| Replacing a source's data | the load dialog | Replace with file... on the source row, Quick actions |
| An attribute's type and role | the attribute's inspector | Read as... in the attribute and column menus |
| A run's weight and its meaning | the run's Made with | the Analyze and Path popovers (chosen before the run) |
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
| Direction and arrowheads | Home | the load dialog's Direction; arrows are Style properties |
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
| Label from a field (`node.label` / `edge.label` with `by: "data.*"` or `"results.*"`) | Home | Label Text, pre-bound to Name; Label by |
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
| Load from file, URL, source config | Home | the load dialog's File, URL, Paste |
| Replace versus add (`replace`) | Home | Load into; Replace with file...; Edit source...; Refresh |
| Add records (`addNodes`, `addEdges`) | Home | Add node... (the graph's "..."); a file added to this graph |
| Neighborhood fetched on demand | Gap | Neighborhood selects loaded neighbors only |
| Superseded loads (`E_SUPERSEDED`) | Home | the "one source at a time" notice; queuing is a gap |
| Clear data (`clearData`, one undoable step) | Home | Clear graph data in the graph's "...", acting at once with the Undo notice |
| Per-load cancel | Gap | the loading card's Cancel |
| Remove nodes (`removeNodes`) | Home | Remove from data in node menus and the table, with Undo |
| Edit node and edge data (`updateNodes`, `updateEdges`); remove edges (`removeEdges`) | Home | the table's cells; Remove from data in the edge menu and the Edges tab |
| Progress, completion, import report (`data.lastImport()`) | Home | the loading card; the source's Made with |
| Per-record errors, error limit, typed load failures, size refusal | Home | the load dialog's refusals and More options |
| Filter at import | Gap | in the spec only |
| Formats, detection, CSV and JSON options, paired files (`FORMAT_DESCRIPTORS`, `detectFormats`) | Catalog | the load dialog, labels from `plainName` |
| Unserved formats (SIF, CX2) | Home | the load dialog's "not supported, because" |
| Endpoints, node id, edge id, id coercion, repeated edges, direction, position scale | Catalog | the load dialog: roles under the sample columns, More options |
| Time attribute config slots (read by nothing) | Gap | an element defect |
| Dynamic GEXF time data | Home | kept on records; windowing by spells is a gap |
| Custom data sources (`DataSource.register`) | Catalog | registered formats appear in the load dialog |
| Join by key | Gap | Add columns by key..., hidden in the user-test build |
| Which source a record came from; remove one source | Gap | no per-source Remove |
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
| Node label path, time paths, positions after load (`nodeLabelPath`, time paths) | Home | the attribute's Role (Name, Time); positions in the load dialog |
| Edge weight path (`edgeWeightPath`) | Plumbing | left at the element's default; each run chooses its weight (`caveats.weight`) |
| Re-deriving values when a known field changes after load | Gap (to confirm) | Role changes |
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
| App-owned state in the same history (folders, the Views order, notes until the element stores them) | Gap (to confirm) | one Undo for both; never a second app stack interleaved by hand |

App-only preferences with no element counterpart (your name, usage data, number format, theme)
live in Settings and are not in this register.

---

## 19. What graphty-element needs (to file, not to build in the app)

Each is filed as a graphty-element issue with type, priority and effort labels before its skeleton
state ships, and each skeleton state carries "needs graphty-element" until then.

- **Styling:** a `section`, `order` and `default` on each style descriptor; switching the
  element's default layers off (read `addDefaultStyle`, today parsed and never read: the
  Everything row's eye) -- editing every node or edge already works through a `match:
  "everything"` layer (3.7); a switch to stop drawing the selection highlight (the Selection row's
  eye); a label maximum width with wrapping and a "same size at any distance" option; full label-style field descriptors; a
  drawable `node.marker`; themes (issue #331) and a grayscale and color-blind check (Print-safe
  colors); a replace option on `applyTemplate`; a selection highlight default that passes 3:1; a
  hover layer that can take a set of elements; a draw-only hide that also hides incident edges;
  collapsed drawing of a set as one node; a configurable hover highlight look; `explain` over a set
  of elements with coverage; **label templates** (several fields in one label, low priority);
  **number formatting on text bindings** (higher priority); confirmation that Overrides maps to an
  id-keyed binding.
- **Picking:** click, hover and right-click on an edge on the canvas.
- **Notes:** a notes store in the session keyed by target (node, edge, set, run, style layer,
  filter step, graph -- the conceptual model's targets; folders, attributes and sources are not
  targets) that produces the reserved notes layer; a `notes.*` path a binding can read (`count`,
  `latest`) with dependency tracking (open for the owner: public API); a pick event for labels.
- **Naming:** rename a run; per-group labels tied to an identity that survives a rerun; a display
  name for an attribute.
- **Cameras and views:** rename a saved view (remove and the name-collision refusal already
  exist); an ordered preset collection with tour membership; a view snapshot; 2D tour
  waypoints (to confirm); a zoom reading in 3D; a reduced-motion setting; a canvas color scheme; a
  configurable keymap and navigation speeds; area (lasso) selection; an in-headset menu; AR
  placement and scale; a minimap if still wanted.
- **Layout:** confirmation that resuming a settled layout continues from the current positions;
  positions saved and restored as a document.
- **Output:** SVG figure export (owner decision), PDF later; a legend drawn into images; column
  headers that carry each value's scope and export of the filtered graph only (both to confirm
  against `exportGraph`); a run-record methods writer.
- **Data:** join by key with match counts; which source each record came from, and removing one;
  live connectors; filter at import; queuing additive loads; a per-load cancel; import reports
  kept per load; what a replacing load does to runs and bound layers; data versions and diffs; the
  dead time-attribute config slots; windowing dynamic GEXF spells; an attribute type override and
  an ordinal level (in `knownFields` or the schema); re-deriving what depends on a known field
  changed after load; an attribute as a layout axis; computed columns; merging
  nodes; OR and NOT between filter steps; derived-graph transforms.
- **Analysis:** clustering, transitivity, diameter and degree assortativity in `data.statistics()`;
  reading a weight as strength in the path options.
- **Session:** a whole-session document (runs, sets, positions); app-owned steps (folders, the
  Views order) recorded in the element's undo history, to confirm; earlier results of a run; comparing runs, stability across seeds and null-model tests.
- **Documentation:** the documented `debug` attribute that does not exist.

---

## Review changes (version 3)

### Ontology and generality review

Checked against the conceptual model, both datasets, the one-home rule, the owner's decisions and
graphty-element's current source. All are studio decisions, reversible with an edit.

- **Note targets now match the conceptual model** (2.1, 5.1, 5.2, 7, 10.3, 19). Folders,
  attributes and sources are no longer note targets: a folder is app organization, so a note about
  it could never reach the element's notes store; an attribute or a source is a value or a load
  setting, not a definition. Add note leaves their menus and Notes leaves their inspectors.
  Style-layer rows (Label by and Show as groups rows) are named as targets, and the element's notes
  store request now lists the style layer.
- **Filter steps show their note count** in the row (7), as 2.1's table already promised.
- **Comparison is transient until kept** (3.2, 9, 15). Saving every comparison as a row broke the
  conceptual model's "looking leaves nothing behind" and top task 10's "transient until saved".
  One **Keep as row** button in the panel replaces it; leaving asks nothing, so the removed badge
  and dialog stay removed.
- **"Select where this is..." is renamed "Create set where this is..."** (3.8, 7, 10.3, 18.9). It
  keeps a rule-set row, and a command named "Select" must leave nothing behind.
- **Direction leaves the source inspector** (7). It is one setting of the whole graph
  (`data.directed`), set in the load dialog and read in the Overview; with two sources a
  per-source line showed one value twice.
- **A run's weight has one home**, the run's Made with; the Analyze and Path popovers are doors
  that set it before the run (17).
- **Deleting a saved view works today** (4.1, 10.3, 18.2, 19): graphty-element has
  `removeCameraPreset`, one undoable step, and refuses a name that matches a camera view
  (`E_PROTECTED`). Only Rename remains an element gap; save-new-then-remove would be an app
  wrapper over the missing call.
- **Labeling every node** (16.6, 16.7, owner-questions-3 answer 8): the spec said Label on the
  Everything row labels every node, but Everything's values and "+" are disabled until the
  element's base style is writable. Today's route is Label by on the name attribute; the round 7
  task wording and expected path are corrected. The writable base style is raised to high
  priority in section 19, because without it no fixed look reaches every node or edge.
  (Superseded by the API review below: Everything is editable today through a `match:
  "everything"` layer, so labeling every node from Everything works and the high-priority request
  is withdrawn. Label by stays as a second route.)
- **Label by rows have a defined kind** (3.2): named after the attribute, with its type glyph, a
  measure row in kind.
- **The inspector's "no verbs" rule names its one exception**, the state bar's buttons (5).
- **Conceptual model edits recorded** (14): the color and size roles become bindings, node-type
  and edge-type roles wait for a task; folders are not note targets.

Not changed, checked: every owner question in the third review has an answer; no owner decision
is reopened; "your name, per person or per project" stays open because the owner's words ("the
project's author setting") and "more than one author" admit two readings; every top task still
has a home in section 15.

Skeleton follow-ups (for whoever rebuilds `../../app-b/`): drop Add note and Notes from the folder,
attribute and source; the source inspector's Direction rows (`sections/inspector-source.js`);
enable Delete on a saved view; Keep as row in Compare; rename the attribute menu item; the
Everything Label example becomes a Label by row.

### Simplicity and consistency review

Checked every section against the pattern table (2.5), the one-home rule (17), the top tasks (15)
and graphty-element's current master. All are studio decisions, reversible with an edit.

- **The View button's tooltip loses its key chip** (2.3; owner-questions-3 answer 4). "View: Front
  5" read as though Front's key were 5 (it is 1), and 5 does not open the flyout. The flyout's
  2D and 3D items become one two-state line, "Switch to 2D  5" or "Switch to 3D  5", so the key
  sits on one fixed row and the label names the action, as section 2.5 asks.
- **Four element gaps had already closed on master and are now homes** (5.3, 6, 10.3, 12.1, 18,
  19):
  - graph data export: `exportGraph` writes CSV, JSON, GraphML, GEXF, GML, DOT and Pajek with
    results as columns and `lossNotes` for what a format cannot hold. Export > Data is one Format
    list from the catalog, and the app no longer writes a CSV of its own (that was graph logic in
    the app);
  - undo and redo over graph state (`session.undo`, `redo`, `history`): the header's Undo calls
    it. Folding the app's own state (folders, the Views order) into that one history is the new
    request, to confirm;
  - `layout.set` and `clear` are single undoable steps that put the previous positions or data
    back. So **only Forget all keys still asks first**: Clear graph data acts at once with Undo
    and loses its ellipsis, and the slow-layout confirmation is replaced by the cost mark in the
    Method list;
  - `updateEdges` and `removeEdges`: edge cells are editable and the edge menu gains Remove from
    data.
- **Top task 12 is three steps again** (7, 10.3, 15, 17). Folding "Replace data..." into "Edit
  source..." made reusing an analysis on new data take five (rail, menu, Edit source, Choose
  another file, Load). A source's **Replace with file...** opens the file picker first, then the
  load dialog with every setting carried and focus on Load. It is a door to the load dialog, not a
  second home.
- **The source inspector's History section goes** (5.2, 7, 17). Its one row repeated the
  Summary's Read line, which now reads "Read Sep 28, replaced Sep 30" and links to Version history.
- **Menus follow 10.3's section order** (4.1, 7, 10.3): Rename comes first on the source and
  saved-view menus.
- **A recipe confirms each run's weight** (12.2, 14). With the weight role gone, the recipe
  bookend's "the analyst confirms weight roles" had no place to happen.
- **Settings > Privacy says where data goes** (12.3, 17). Its link called the Export dialog's
  Recent exports "what has been sent", but exports are saved, never sent. Privacy now holds the
  owner's opt-in with "What is collected" and four "Where your data goes" lines (the page the
  owner's telemetry decision asked to update), and the link reads "Files you exported".

Not changed, checked: the state bar stays the one place a body shows a button, as the review above
records; every owner question still has its answer; nothing simplified away leaves a top task
without a home.

Skeleton follow-ups for `../../app-b/`: the View tooltip and the "Switch to 2D" line
(`sections/toolbar.js`, `sections/camera-menu.js`); Export > Data's Format list
(`sections/export-dialog.js`); no confirmation on Clear graph data or a layout change
(`sections/context-menus.js`, `sections/inspector-nothing-selected.js`); editable edge cells and
Remove from data on edges (`sections/table-dock.js`, `sections/context-menus.js`); Replace with
file... and the History row (`sections/data-place.js`, `sections/inspector-source.js`); the
Privacy section (`sections/settings.js`).

### graphty-element API review

Checked against graphty-element's current source (master): the style channels and their
descriptors, the label vocabulary, the session API (styles, views, layout, positions, history,
data), capture and export. All are studio decisions, reversible with an edit.

- **Everything is editable today; it was drawn disabled for a gap that does not exist** (3.7,
  5.2, 16.4, 16.6, 18.3, 18.7, 19; owner-questions-3 answers 3 and 8; streamline-3). The element
  locks its own two default layers by design (`source.by === "element"`, `E_PROTECTED`), and its
  intended way to restyle every node or edge is an ordinary layer with `selector: { match:
  "everything" }`, placed with `styles.add(spec, { above: <default layer id> })`. The Everything
  row is the locked defaults plus that layer: unchanged lines show the element's value with no
  "-"; a change writes only that value; "-" brings the default back. No defaults are copied into
  the app. This answers the owner's second-review complaint (Everything lacked styling options)
  with every option live, makes "label every node" work on Everything again, and withdraws the
  high-priority "writable base style" request. What stays a gap is only Everything's eye
  (switching the defaults off; `addDefaultStyle` is parsed and never read).
- **Turning labels off is a value, not a removal** (16.2; owner-questions-3 answer 2;
  streamline-3). Version 3 made "-" on the Label line the off switch. In a stack that only stops
  this row supplying words: labels painted by a row beneath still show. graphty-element's way to
  hide them on part of a graph is the label style's `enabled: false` (words switch a label on;
  `enabled` exists to switch it back off). Label's and Tooltip's "+" now offer **Show**, a
  checkbox line.
- **Two label fields the spec promised do not exist** (16.2, 19): the label vocabulary has no
  maximum width and no "same size at any distance". The "+" list now leads with Placement and
  depth fade (which exist); the two are filed.
- **The Selection row's eye is an element gap** (3.7, 18.3, 19): the highlight is drawn outside
  the layer stack with no on/off switch; writing opacity 0 would be an app workaround that
  overwrites the reader's Opacity. Drawn with the mark.
- **Version history reads the element's undo history** (9): `session.history.steps` (label, time,
  slices, provenance) is the log of edits and `history.restoreTo(step)` is Restore, so the app
  keeps no second log. Keeping that history in the project file joins the whole-session document
  request.
- **Row organization can live on the layer** (18.7): `LayerSpec.userData` is the element's
  documented place for consumer state, so a style-layer row's folder, Lock and Hide in list are
  written through `styles.update` -- undone with the element's history and saved with the style
  document. This shrinks the "app state in the same history" request to folders of set and path
  rows.

Not changed, checked: every channel the Style tab names exists (35: 14 node with `node.marker`
not drawn, 21 edge, including arrow captions, pattern count, curvature and flow speed); outline
takes a color only, and the tab offers no width; the selection style is color, scale and opacity;
the camera, view, capture, video, layout and pin calls the spec cites all exist; app keys avoid
the element's canvas keys (W, A, S, D, Q, E, arrows, =, -); edges still cannot be picked
(`isPickable` is false), so the edge routes in 2.1 stand.

Skeleton follow-ups for `../../app-b/`: Everything's lines enabled, with "-" only on changed lines
(`lib.js` `styleTab`, `sections/inspector-selection-and-everything.js`), and the Everything Label
example kept beside the Label by row; Label's and Tooltip's "+" menu gains Show
(`sections/style-pickers.js`, which still draws a "Show label" switch); the Selection row's eye
carries the needs mark.
