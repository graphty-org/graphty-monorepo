# Refined structure B: the complete specification

This page specifies the app structure that round 7 tests: one tree of paint rows on the left,
the canvas in the middle, an inspector on the right with Style and Data tabs, a table dock at the
bottom, and a floating toolbar. It is the reference for the clickable skeleton the owner reviews
before any focus group or flow study.

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
- The findings report is one self-contained HTML file. Figures export as SVG now, PDF later.
- Notes record their author and time, and a recipe records who saved it and when. The author
  shows only when a project has more than one.
- Shift+Arrow walks nodes. Plain arrows orbit in 3D and pan in 2D.
- American spelling everywhere.
- Weighted measures are named from the data in every domain ("Total amount in"), never with a
  currency special case, and every label is tested on two domains.

Decided on the owner's behalf (reversible; `owner-feedback.md` labels them so):

- No separate Note tool for now. Add note's existing entry points cover it. Reversible after the
  several-notes-in-a-row test.
- After undoing a filter step, a one-line notice names the step.
- The project file saves the selection when it closes, so a case resumes where it stopped.

Studio decision carried from earlier rounds: the "M" avatar goes and nothing replaces it. The
owner asked what it was; with no accounts it implies multiplayer, and the author setting already
shows on notes, so a top-right author chip would add nothing.

---

## 2. The four questions: the studio's decisions

The owner asked four questions and asked the studio to decide them. All four are studio
decisions, reversible with an edit, and each has a round 7 test that could reverse it.

### 2.1 Should notes also show up in the tree?

**Studio decision: no. Notes do not become rows. The tree shows that notes exist, the Notes
place stays on the rail, and one switch shows the note markers on the canvas.**

What the tree shows:

- **A note count on a row** that a note is about: a speech-bubble glyph and a number, after the
  member count. It counts only notes about that row itself, never notes about its members. A row
  with no notes shows nothing and keeps no empty slot.
- **A hollow "N inside" mark** on a collapsed run or folder whose children carry notes. It looks
  different from the count, never adds to it, and disappears when the row is expanded, because
  the children then show their own counts. This keeps a note on community 37 findable inside a
  collapsed run of 212 communities.
- **Clicking the count** selects the row and opens its Data tab at the Notes section. Hovering
  shows the first line of the newest note. For keyboard users the row's accessible name ends
  ", 2 notes", and the row's context menu has Open notes; the count is not a separate arrow-key
  stop, so the tree keeps standard tree keys.
- **"Rows with notes"** in the tree's list menu narrows the list to noted rows. It changes the
  list, never the paint.
- **Find** (the tree's search field) lists matching notes in their own group after the matching
  rows. Picking a note selects its targets.

Where each kind of note is shown:

| The note is about | Its count shows on | It is read in |
|---|---|---|
| a group, a path, a measure row, a folder | that row | the row's Data tab, Notes section |
| a run | the run row | the run's Data tab |
| a node or an edge | its canvas marker; the table's Notes column | the element's Data tab |
| the graph | the graph's entry in the Graphs switcher | the inspector with nothing selected |
| a filter step | the step in Data > Filters | the step's editor |

A note that cites a run cites that exact run. If a rerun replaces it, the new row does not
inherit the note; the note reads "cites an earlier run" with a link to that run's settings.

The **Note markers** switch is one preference with two controls: the eye in the Notes panel
header, and Note markers in the zoom-and-view menu's display toggles (Shift+N, already bound).
It also appears in the XR hand menu, because in a headset the tree is only the hand menu's
compact Rows page (section 2.3). A marker stays on an element
whose paint is hidden (the element is still laid out and the note is still true) and goes away
when a filter removes its target; the Notes panel then lists that note as "about elements not in
this filter step".

Reasons:

1. **A note cannot paint.** The owner defined the tree as rows that each can paint the graph,
   and the tree's order is paint order. A note row would have an eye that paints nothing and a
   position that means nothing, and it would teach readers that some eyes are not paint.
2. **One note has many targets, and most targets are not rows.** A note about Community 3 and
   the PageRank run would appear twice or pick one home falsely. Most notes analysts write are
   about nodes and edges, which are never rows, so a tree of notes would look complete while
   missing most of them. The information architecture already rejected "notes grouped by target"
   because a note with three targets is listed three times.
3. **Space.** Taking a note is top task 5, every session. At 1366 x 768 the tree shows about
   nine rows. Note rows would push paint rows, the tree's reason to exist, off screen.
4. **Notes are read in time order** to review evidence and build a findings report. That needs
   the Notes list anyway.
5. **Precedents.** Figma comments are not layers; they have their own list and canvas pins.
   Figma Dev Mode annotations attach to a layer and show in its inspector and on the canvas,
   never as layer rows. Tableau keeps annotations on the view and out of the Data pane. Cytoscape
   gives annotations their own panel. Gephi has no notes, which is the gap top task 5 exists to
   close.

Rejected:

- **Note rows under their targets**: duplicates multi-target notes and cannot hold notes about
  nodes.
- **A pinned Notes folder at the bottom of the tree**: brings in exactly the non-paint row
  rejected above, and it stays "outside paint order" only until someone drags a row below it.
- **An eye per note**: no task asks to hide one note's marker.
- **Graph notes counted on the Everything row**: Everything is the base paint layer, not the
  graph. A count there would read as notes about the default style.
- **A rolled-up number on parents**: one number with two meanings double counts. The hollow mark
  replaces it.
- **A new default key for Add note, and Alt-click solo on the markers eye**: a default key has
  the same removal cost as a tool, and solo is a paint gesture.

Round 7 test: the task "find out why the analyst cared about this cluster of characters", with
Community 3 inside a
collapsed Louvain run, worded without "note". Record the first click: the count or hollow mark,
the Notes place, Find, or a miss inside the tree. If more than a third of first clicks go into
the tree and miss, "Rows with notes" moves from the list menu to a visible chip above the tree.

### 2.2 Algorithms: nav rail or toolbar?

**Studio decision: the toolbar. A labeled Analyze button opens the catalog in a popover anchored
to the toolbar. The result lands as a row on top of the tree and paints when the run finishes.
Full settings and Rerun live on that row's Data tab. The rail has no Algorithms place.**

How it works:

- **Analyze** (key A, currently free) is a labeled toolbar button. Quick actions (Mod+K), the main
  menu's Analyze submenu, the empty tree's prompt, the Statistics links in the graph overview and
  a row's context menu ("Analyze these members...") open the same catalog.
- **The popover** (about 400 x 480, above the toolbar, focus in its search field) shows Recent
  (the last five, each rerunnable with its last settings), then groups by **what the run adds to
  the tree**: Rank nodes and edges (a measure row), Find groups (a run with group children),
  Find paths (a path), Measure the graph (a reading only). Each entry shows the element's family,
  the type icon of the row it will add, and its marks: needs direction, needs a weight, cost.
  Algorithms whose answer is a list of pairs (link prediction, node similarity) sit in Measure
  the graph: they add a run row with no eye, their top pairs are on its Data tab and all of them
  in the run's item tab in the table. Algorithms that make a new graph (bipartite projection,
  quotient graph, a null-model sample) are not in this catalog: they add a graph, not a row, so
  they live in the Graphs switcher's New graph from menu (section 3), with a pointer entry here.
  An entry whose precondition fails is shown disabled with its reason ("Needs a weight: this
  graph has none"). Search matches names and the element's aliases ("brokers" finds
  betweenness). **All algorithms...** widens the same popover into a two-column sheet with a
  description, inputs and cost for each entry. It is still anchored to the toolbar.
- **Picking an entry** expands it in place to its essentials, with defaults filled in: scope
  (Filtered graph, 77 nodes; or Selection, 5 nodes), direction, weight and **what the weight
  means** ("higher = farther" or "higher = stronger", with Invert), one key option (resolution,
  damping), estimated cost with the sampled variant offered, never swapped in silently. Enter
  runs. Esc steps back one level; a second Esc closes and returns focus to the button.
- **An algorithm that needs canvas input** (a path, a neighborhood around a seed) uses the
  current selection. With nothing suitable selected, it arms the Path tool's pick mode.
- **Running** closes the popover and adds the row at the top of the tree at once, with progress
  and Cancel on the row. A screen reader hears "PageRank added, running". The row paints when the
  run finishes (owner). It takes the selection only if the selection has not changed since
  Analyze was pressed; otherwise it arrives unselected, briefly highlighted, and is announced.
- **After the run**, the row's Data tab holds every option under Settings, with Rerun. Rerun
  with changed settings revises the run in place; the previous settings and results are listed
  under Earlier results on the Data tab with Restore and **Keep as separate run**, which makes a sibling
  run row so two partitions can be painted and compared (owner: results stay available to
  compare). **Run again as copy** in the row menu does the same in one step.
- **Analyzing with an entry that already has a row on this graph revises that row** (conceptual
  model 4.3: running an algorithm that already has a result re-runs it, and the earlier run stays
  as the baseline). The popover says so before Enter: "Updates the PageRank row; its earlier
  result is kept under Earlier results", with **As a new row** beside Run. The revised row keeps
  its place in the tree, because its place is paint order the analyst chose. Studio decision;
  without it, retuning the resolution (top task 3) would stack a new partition row per try.
- **A sampled or approximate run names itself** in its row ("Betweenness, sampled 500"), so an
  approximation never looks exact. So does a corrected variant ("Closeness, per component" on a
  disconnected graph), as top task 2 requires.
- **Past runs are the tree's run rows**, found with the tree's kind filter (Runs) and "Show
  hidden". There is no second history list.

Reasons:

1. **The owner's worry settles it.** With a rail place, choosing an algorithm replaces the tree
   with the catalog, and the analyst switches back to see and style the result. The toolbar
   keeps the tree in view the whole time, and the owner's rule that runs are tree rows means a
   rail place would be a second list of the same runs.
2. **What is left for a rail place is only the catalog, a list of verbs.** The information
   architecture's rule is that a rail button names a collection, never an activity; verbs go to
   devices such as Quick actions.
3. **Room for configuration exists on the right.** The inspector is full height and already
   holds the run's settings for Rerun. The popover holds only what changes the answer.
4. **Top tasks.** Ranking (task 2) happens several times a session with a 45-second target;
   communities (task 3) has 90 seconds, and "retuning the resolution revises the same result".
   The toolbar route is three actions with the eyes on the canvas and tree.
5. **Precedents.** Figma's Actions button opens a searchable popover of plugins from the toolbar,
   and whatever is made lands in Layers. Gephi is the warning: Statistics in one panel, values
   in Data Laboratory, painting in Appearance. Cytoscape splits the same way through Tools >
   Analyze Network and the Style panel. Tableau's Analytics pane sits beside Data on the left,
   but it holds about fifteen view-level items, not a catalog of configurable algorithms.
6. **XR.** A headset has no rail. The toolbar becomes the hand menu, and results still land in
   the tree, shown there as the hand menu's Rows page (section 2.3).

Why "Analyze", not "Run": Rerun is already a command on a run row, and "Run" names the mechanism
rather than the goal. Studio decision; changing a label is an edit.

What graphty-element must publish, so the app writes none of it (element requirements, not app
code): the catalog with each entry's inputs (direction, weight and what it means, endpoints), the
kind of output it produces, a one-line "what this answers", aliases, a settings schema from which
both the popover and the Data tab are generated, cost estimates, run progress and cancel, and
paintable outputs kept apart from graph-level readings. If the element does not publish one of
these, that is an element issue to file.

Rejected:

- **An Algorithms rail place**: two homes for every run, and a round trip away from the tree.
- **Draft settings in the inspector before a run**: the inspector follows the selection, and a
  draft has no row, so clicking a node would discard it.
- **A "not yet run" row created by More options**: fills the tree with rows that paint nothing.
- **Earlier versions as child rows under the new run**: nesting would then mean "replaced by"
  as well as "came from", breaking the owner's rule for nesting. Keep as separate run gives the
  same comparison with a sibling row.
- **Grouping by academic family only**: the analyst should know before running what kind of row
  arrives. The family still shows on every entry.
- **A separate full-screen catalog dialog**: takes the analyst away from the tree again.

Round 7 test: two builds with the same catalog, one on the toolbar and one in a rail place.
Tasks worded without "run", "algorithm", "analyze" or any algorithm name: "which characters hold
the story together?" (Les Miserables), "sort the characters into the circles they move in, then into
finer circles, and show both", "which proteins bridge clusters?". Record first clicks and time to a painted result,
for weekly analysts and explorers. The rail wins only if its first-click rate beats the
toolbar's by more than 15 points for both kinds of persona.

### 2.3 The complete toolbar

**Studio decision: five controls, each with a visible text label. A control belongs on the
toolbar only if it changes what the next click or drag on the canvas does, or if it starts from
the canvas and adds a row to the tree. Everything else is a thing (it lives in a place), a
setting (it lives on the row it configures) or a verb on a selection (it lives with the
selection).**

| Group | Control | Key | Flyout |
|---|---|---|---|
| Pointer | **Select** (face shows the last pointer tool) | V | Select V, Lasso Q, Hand H; hold Space to pan |
| Make | **Path** | P (already bound) | every catalog entry that takes two endpoints: Shortest path, All shortest paths, K shortest paths, Flow between two nodes |
| Make | **Analyze** | A | the catalog popover (section 2.2) |
| Commands | **Quick actions** | Mod+K (already bound) | none; every command by name |
| Mode | **View mode** (shows "2D" or "3D") | 5 (already bound) toggles 2D/3D | 2D, 3D; a divider; Enter VR, Enter AR |

- **Path** is a one-shot pointer mode: click From, then To (a node or a set). While it is armed,
  a bar above the toolbar shows From, To, Direction, Weight (with what it means), Scope and Run.
  The found path lands as a path row on top of the tree and paints, and the tool returns to
  Select. With two nodes already selected, Path runs directly. Later queries with the same
  settings collect under one path run row ("Shortest paths, weighted by amount"), one child per
  query, each with its own scope, so a session of path questions stays one result (top task 11)
  instead of a column of loose rows. Studio decision.
- **View mode** writes the graph's Layout dimension (one undo step). **Enter VR** and **Enter AR**
  are listed in the flyout; when graphty-element reports no session available, they are
  disabled with the element's reason. The app reads the element's property and never probes a
  device. The skeleton has a "headset present" switch so both states can be reviewed.
- **The selection bar.** While something is selected and no tool is armed, a second row attaches
  directly above the toolbar (not beside the selection, so it never covers the selected nodes):
  Create set (Mod+G), Expand (E), Neighborhood (G), Hide on canvas (Mod+Shift+H), Add note (N),
  Analyze these.... Neighborhood selects one hop; its small popover offers k hops and **Filter to
  neighbors**, which makes the neighborhood the investigation's boundary as one undoable filter
  step (top task 4). It carries verbs only; the same verbs are in the selection's context menu
  and inspector. When Path is armed, Path's bar replaces it.
- **Keys.** Every existing binding in the shell is kept. New: V, Q, H, A, Mod+G, Mod+Shift+H, all
  currently unbound. Esc disarms a tool first, then closes a bar, and never clears the
  selection. The toolbar is one Tab stop with arrow keys between buttons; Alt+Down opens a
  flyout; the selection bar is its own stop in the F6 region cycle.
- **In VR and AR** the same controls, in the same order, become the hand menu. Lasso and the
  option forms are left out there: Analyze and Path run with each entry's last settings (or its
  defaults), and the entry names them before it runs. The hand menu's **Rows** page lists the
  tree's top-level rows with their swatches and eyes, so a result that lands in a headset can be
  shown, hidden and soloed there; reordering and styling wait for the desktop. Studio decision:
  without it a run started in XR paints over everything with no way to turn it off.
- **Size.** About 440 px with labels, which fits the canvas at 1366 x 768 with both side panels
  open.

**Does Path deserve a top-level spot? Yes, conditionally.** It is the only analysis whose input
is two clicks on the canvas, which is what a toolbar tool is for. Finding the shortest path is
top task 11 ("most sessions") and central to four workflows (path investigation, fraud ring,
criminal network, drug target), and to the search-first investigators, who ask it many times a
session. Gephi puts a shortest-path tool in its canvas palette for this reason. Round 6 found five
participants missed the unlabeled Path icon, a labeling failure rather than a lack of demand.
Researchers rarely use it, so round 7 tests it with both an investigator and a researcher; if
fewer than about half of first clicks for "how is this account connected to that one?" (transfers)
or "how does Cosette know Javert?" (Les Miserables) land on
Path (or on the selection bar with two nodes selected), Path folds into Analyze's Find paths
group.

Where everything else lives:

| Not on the toolbar | Where it lives | Why |
|---|---|---|
| Fit (0), zoom to selection (F), reset (Shift+0), zoom in and out (=, -), 3D camera presets front 1, side 3, top 7 | the zoom-and-view menu at the top right of the canvas, which shows the zoom level; the presets section appears only in 3D | moving the camera changes nothing and does not change what a click does; existing keys are kept |
| Saved views | the Views section at the foot of the Graph place; the zoom-and-view menu lists them and has Save view... | a view is a named thing, not a verb |
| Display toggles: labels, arrows, legend (L), minimap (M), note markers (Shift+N) | the zoom-and-view menu | reader display settings |
| Layout: method, rerun, pin, dimension | the graph's Layout section, nothing-selected inspector; Re-run layout in Quick actions; **Lay out members...** on a group, set or run row and on several selected elements (per community, a set within the graph) | a setting with options lives on what it configures |
| Filters | Data > Filters, opened by the header's filter chip | owner: filters belong with the data |
| Color by, size by, styling | a row's Style tab | styling goes only through style layers |
| Compare with... | a row's or run's Data tab and menu | it starts from a result |
| Find | / and the tree's search field | navigation, not a canvas mode |
| Undo and redo | Mod+Z, Shift+Mod+Z, Edit menu | global |
| Export, share | the project-name menu; Data > Sent and saved lists what left | owner: Export in the project-name menu; data management is one area |
| Table and time slider | the bottom dock (Shift+T, T) | places, not tools |
| Add note | the selection bar, context menus, the inspector's Notes section, N | owner: no separate Note tool for now |
| One button per measure, painter and sizer tools, node and edge pencils | nowhere; data edits go through the table | ranking never buys its own control; hand-painting outside a style layer is forbidden |

Rejected: a Note button or C-key note mode (owner decision), a Layout button (a setting, not a
pointer mode; tested with "untangle this"), a 2D/3D/Immersive three-way switch (VR and AR are
sessions, not dimensions), hiding VR and AR entirely (the flyout is closed at rest, so listing
them costs nothing and keeps the capability discoverable), rebinding cameras to Shift+1 and
Shift+2 (would cost current keys for a Figma habit).

Round 7 first-click tasks, each worded without the button labels: "how is A connected to B?"
(Path or Analyze?), "untangle this" (does anyone look for a Layout button?), "return to the picture
you kept earlier" (zoom menu or Views section?), and a weighted-transfers path task that records
whether the weight meaning is noticed.

### 2.4 Is "Data" really "Sources"? What to borrow from Tableau

**Studio decision: the rail place stays "Data". Sources is its first section. The panel takes
Tableau's Data pane layout (typed rows, a compact source header, drag or menu to encode) in
graphty's own words, and leaves out Tableau's dimensions, measures and shelves.**

Contents, top to bottom (section 7 has the details): **Sources** (compact, joins nested),
**Filters**, **Attributes** (Nodes and Edges), **Versions**, **Sent and saved** (folded).

Reasons for the name:

1. **The place holds more than sources.** It holds where data came from, which attributes it
   has and how each is read, the filter steps (the owner put filters here), which version is
   current, and where copies went. A label that names one section fails the task "where do I
   change how this column is read?".
2. **Evidence.** In round 6, four of four focus-group participants guessed "Data" for where a
   file goes, and tree-test participants ended at Data > Sources.
3. **Precedent.** Tableau's always-visible pane is called Data, with the source named at its
   top; connecting and joining happen on a separate Data Source page. Gephi calls its place the
   Data Laboratory. None names the everyday place after the connection.

What is borrowed from Tableau:

- **Typed rows.** Each attribute carries an icon for its measurement level: `Abc` categorical, a
  stepped icon ordinal, `#` quantitative, a calendar for time. The same icon appears on any tree
  row that paints from it. A weight read as text shows as `Abc` at a glance, which top task 1
  asks for before any algorithm runs.
- **The data source page**, as graphty's existing load step: a dialog opened from a source row,
  with the preview rows, a type per column, the join key and the match count.
- **Calculated fields**, as graphty's expression attributes: "New attribute...", with the tooltip
  "Tableau calls this a calculated field".
- **Drag onto encoding**, as dragging an attribute onto the tree. The attribute's menu is the
  main route; the drag is an accelerator.
- **Filters beside the fields they read.**

What is not borrowed:

- **"Dimension" and "Measure" headings.** Tableau's split is about aggregation, which a
  node-link drawing does not do. The owner uses "measure" for a paint row, so a "Measures"
  heading would give one word two meanings on one screen. The measurement level already decides
  which encodings are offered ("community ids never get a color ramp", top task 8).
- **Blue and green pill tints.** The icon already says discrete or continuous, a second color
  code would compete with the graph's own colors, and blue against green is a weak pair for
  color-blind readers.
- **Shelves and the Marks card.** The tree is graphty's shelf and a row's Style tab is its Marks
  card. A second styling surface would break the style-layer rule.
- **A join canvas.** A graphty load is one or two tables; a join is one indented row with its key
  and match count.
- **The word "field" on screen.** The glossary's screen word is "attribute"; "field" and
  "calculated field" are aliases that Find and Quick actions accept.

Rejected: renaming the place "Sources" (names one of five sections); a fourth tree row kind for
an imported attribute that paints (the owner's three kinds cover it: section 3.2); dropping an
attribute on the canvas (no visible target and no order; the tree has position, which is paint
order); keeping Applied recipes in Data (a recipe brings runs and paint, not data; it moves to
Version history).

Round 7 test, worded without "attribute", "field" or "source": "amount looks wrong", "change how
amount is read", "go back to March", "only accounts in Spain". Also check whether a PageRank row
in the tree and a PageRank attribute in Data read as a duplicate, and whether analysts notice
that PageRank was computed on a different graph after adding a filter step.

---

## 3. The paint tree (Graph place)

The Graph place is the rail's default. Top to bottom: the **Graphs switcher** (one line: the
current graph's name, its note count, a menu listing the project's graphs), a **search field**
with the **list menu**, the **tree**, and **Views** (folded).

The Graphs switcher's menu also holds **New graph from**: Selection (Extract as graph), Bipartite
projection..., Quotient by groups..., Combine graphs..., Null-model sample.... Each makes a derived
graph (conceptual model 4.7), a new entry in the switcher with its own tree and positions, never a
row. Studio decision: a transform's output is a graph, and the graph is what the switcher lists.

The same menu holds the rest of what acts on whole graphs: each graph's Rename, Move up and Move
down, **Add as another graph...**, **Compare with...** (two graphs, or two time windows) and
Version history.

### 3.1 The central rule

**Every row in the tree can paint the graph. Reading the tree top to bottom is paint order, and
a higher row wins, property by property.** Selection is pinned at the top and Everything at the
bottom (owner).

One exception, from the owner's other rule that every run is a row: a run whose outputs are only
graph-level readings or a list of pairs has nothing to paint, so its row has no eye and takes no
part in paint order (section 3.2).

### 3.2 Row kinds and icons

| Kind | Type icon | Example | Children |
|---|---|---|---|
| **Selection** (built in, pinned top) | a dashed box | "Selection, 5 nodes" | none |
| **Run** | the kind of what it produced: a bar chart for a measure run, stacked circles for a group run, a route line for a path run, a gauge for a readings-only run | "Louvain, resolution 1.0" | its paintable outputs |
| **Measure** | `#` (quantitative), a calendar (time), or the run's measure icon | "PageRank", "riskScore" | none |
| **Group** | a filled circle in the group's color | "Community 3", "kind is merchant" | none, or its own groups when it came from a categorical attribute |
| **Path** | a route line | "Valjean to Javert" | none |
| **Set** | a circle with a check | "Watchlist" (kept by Create set) | none |
| **Folder** | a folder | "For the report" | any rows the analyst puts in it |
| **Overrides** (built in, just below Selection, shown only once it holds something) | a pencil | "Overrides, 3 nodes" | none |
| **Everything** (built in, pinned bottom) | a filled square | "Everything" | none |

- A measure run that produces one value per node, or one per edge, is shown as a single row:
  the run and its measure are the same row ("PageRank", "Edge betweenness"). An edge measure's
  icon carries a small edge mark and its Style tab offers edge color and width, not node
  channels. A run that produces several paintable outputs is a run row with them as children
  (HITS gives Hub score and Authority score; in-degree and out-degree on a directed graph).
- **A run that finds one set of elements** (bridges, articulation points, a k-core, the largest
  clique, the diameter's endpoints and path) adds a single group or path row in the Find groups
  or Find paths catalog group; it paints only those elements. Studio decision: one found set
  needs no parent.
- **A hierarchical partition** (Louvain's levels, a dendrogram cut) is one run row whose children
  are the groups of one level at a time; a **Level** control on the run row's Style tab and in
  its row menu chooses which level the children are and paint. Keep as separate run fixes a
  level as its own sibling row, so two levels can be shown together. Studio decision: nesting
  stays one deep and still means "came from this run".
- **A run over time windows** (a series, conceptual model 4.7) is one run row. Which window it
  paints follows the time slider in the dock; the row shows the current window ("PageRank, week
  12 of 20"). Studio decision, from the model's rule that the painted window is working state,
  not a run.
- **A graph-level reading with a per-element counterpart offers it.** Transitivity's run also
  offers local clustering as a measure child; average shortest path length offers eccentricity.
  The reading stays on the Data tab; the child paints. Studio decision: it gives more readings a
  picture, as the owner's "not visualizing results defeats the purpose" asks.
- A readings-only run (density, modularity alone) is still a run row, with the gauge icon and no
  eye, because it has nothing to paint; its readings are on its Data tab. This keeps "every run
  is a row" (owner) and gives every run one home.
- **Painting an imported attribute adds no new row kind.** Color by or Size by on a quantitative
  or time attribute adds a **measure** row named after the attribute, with the attribute's level
  icon where a run's row shows the run icon, and no run parent. Show as groups on a categorical
  attribute adds a **group** row with one child per value, folded by default ("kind" gives
  merchant, person, bank). Studio decision: the owner's row kinds stay as the owner listed them.
- **Every result kind in the conceptual model has a row** (studio decision, so no result is left
  without a home):
  - a measure may be over nodes or over edges ("Edge betweenness" paints edge color or width);
    the row's icon carries a small node or edge mark;
  - a **hierarchical partition** (Leiden or Louvain levels) is one run row; its Style tab chooses
    which level paints, and its children are that level's groups. Levels never nest as rows,
    because nesting means "came from this run", not "inside that group";
  - a **cover** (overlapping communities) is a group run whose children may share members;
  - a **series** (one value per node per time window) is one measure row; the time slider
    chooses which window paints, which is working state, not a new row;
  - a **flow** is a run row with an edge measure child (flow per edge) and the value on its Data
    tab;
  - a run whose answer is **a list of pairs** (link prediction, similarity) has no eye and a
    pair icon (two linked dots); selecting a pair in its item tab selects its two nodes.
- **A saved comparison is a run row.** Compare with... stays transient until saved (top task
  10). Saved, it becomes a run row marked as a comparison: its per-element difference (rank
  change, which community a node moved to) is a measure or group child that paints, and its
  statistic (correlation, agreement) is a reading on its Data tab. Studio decision: it keeps
  "every run is a row" and needs no new kind.
- **The overview adds no rows.** Compute the overview (nothing-selected inspector) fills graph
  readings into Statistics and per-node values such as degree and core number into Data >
  Attributes, where Color by makes a measure row on request. Studio decision: the owner's rule
  is that a run the analyst starts paints; the overview is a sweep nobody chose item by item, and
  painting six values over each other on load is the color fight at its worst. Top tasks'
  "an overview never paints" is kept.
- The row kind is never printed as a word on screen. The row is named after its metric or
  group. "Measure row" is a word for documents. (Studio decision, because the glossary's screen
  word is "metric" while the owner writes "measure"; not printing the kind keeps both answers one
  edit away. The glossary gets a one-line entry.)

### 3.3 A row, left to right

Disclosure triangle (parents only), type icon, swatch (a ramp for a measure, a color for a
group, empty when the row currently paints nothing), name, member count (groups, sets, paths),
note count or hollow "N inside" mark, a progress bar with Cancel while running, a lock glyph when
the row is locked, the **eye**.

Scope and freshness marks (conceptual model 4.5 and 7.2: a different scope is not out of date):

- When the filter steps change after a run, its row and its attribute show a small **scope
  mark** reading "on 3,000 nodes; now 812", with **Rerun on current filter**. The result is
  still correct for the graph it names, so it is not called out of date, and it keeps painting
  the elements that carry its values.
- Only when the data it read changed (a new data version, a Replace data) does the row show
  **out of date**, with Rerun. It keeps painting until rerun, and the mark says the values are
  from the earlier data.

### 3.4 Nesting and lock rules

- **Nesting means "came from this run".** A run's children are its outputs. A folder's children
  are what the analyst put in it. Nothing else nests.
- **Run children are locked to their run.** They reorder only within it and cannot be dragged
  out. **Keep as set** on a child makes an independent set row on top of the tree that can go
  anywhere and survives a rerun.
- **Kind rules for drops.** Rows can be dropped into folders and at the top level. A path cannot
  be dropped under a group run, and nothing can be dropped into a run. An invalid drop target
  shows the no-drop cursor and a one-line reason.
- **Selection, Overrides and Everything cannot move**, be deleted, or go into a folder.
- **Lock** (row menu) freezes a row's position and its style. A locked row can still be hidden.

### 3.5 Precedence

**Paint order is the tree read top to bottom, depth first. A parent's own style sits just below
its last child.**

- Whatever is higher on screen always wins, so position and paint cannot disagree.
- Groups overlap freely. A node in two rows takes each property from the higher row. The lower
  row's Style tab says so: "9 of 40 members show Watchlist's color", with Move above.
- A row that loses a property on every member reads "Covered by Leiden: fill".
- A folder's rows stay adjacent, so dragging the folder moves the block.
- The groups of one partition do not overlap, so their order among themselves changes no paint;
  it is list order only (sortable by size, name or a value). A cover is the exception: its groups
  share members, so a shared member takes the higher group's color, and the run's Style tab
  offers "Shared members: higher group, or a mixed mark" (studio decision).
- **Several runs fighting over color** is expected (owner). The newest run lands on top and wins.
  The eye hides the loser's paint or the winner's; solo shows one.

### 3.6 The eye, solo and hiding rows

- **Eye** (click): shows or hides that row's paint on the canvas. It never hides members, never
  removes them from the layout and never changes what is computed. Undoable. Saved.
- **Solo** (Alt-click an eye): only that row paints, plus Everything if its eye is on. Alt-click
  again restores the previous eyes. The soloed eye is filled and the others are shown struck.
- **Eye on Everything**: hiding it leaves only what other rows paint; nodes no row paints are
  drawn as faint outlines, and a line under the tree reads "Everything is hidden. Unpainted
  nodes still take part in the layout. To leave them out, filter." with a Filter... link that
  opens Data > Filters (owner).
- **Hide from list** (row menu): removes the row from the list only. Its paint is unchanged,
  which the menu item says: "Hide from list (keeps painting)". **Show hidden** in the list menu
  shows hidden-from-list rows dimmed and italic, with Unhide.
- **Hide on canvas** (a verb on elements, Mod+Shift+H) is different: it stops drawing chosen
  elements. Hidden elements are counted on the canvas's "not drawn" line with Show all.

### 3.7 The built-in layers

- **Selection** is always the top row. Its Style tab sets the selection's look (outline color,
  width, halo, dim others: off by default). Its eye can be turned off for screenshots. Its
  member count follows the selection; when nothing is selected it reads "Nothing selected".
  Clicking the row selects the row itself (to style it), not the elements.
- **Everything** is always the bottom row. Its Style tab is the default look for every node and
  edge (color, size, shape, label, edge width, arrows), the graph's background, and the
  project's **Look** (Default, Print; Print keeps its grayscale check, owner). Its Data tab is the
  graph overview.
- **Overrides** holds one-off edits to single elements: changing a property on a node's or
  edge's Style tab ("Set this node's color") writes here, never to the mesh. It appears just
  below Selection once it holds something, so a hand edit wins over every analysis row and is
  still a layer that can be hidden, cleared or saved. Studio decision: the conceptual model's
  Overrides layer needs a visible row, and the style-layer rule forbids any other route.
- **Collapse on canvas** (row menu of a group or set) draws the members as one node. It is paint
  state on that row, not a filter step; the row shows a collapsed glyph, and numbers still count
  every member (conceptual model 4.4).

### 3.8 Folders and list organization

- **New folder** (list menu, or Mod+G on selected rows in the tree, which is a different target
  from Mod+G on canvas elements). Folders nest one level only.
- The **list menu** holds: New folder, Show hidden, Rows with notes, Show kind (All, Runs,
  Groups and sets, Paths, Measures), Sort inside a run (paint order, size, name, date), Collapse
  all.
- A set collection loaded from a file (the list menu's **Load set collection...**, or File > Add
  data...) arrives as one folded folder with its unmatched identifiers counted.

### 3.8a Making and combining sets

- **Create set** (Mod+G on canvas elements, a group row's Keep as set) makes a set row on top.
- **Keep top N as set** on a measure row turns the top of a ranking into a set in one step.
- **Combine sets**: with two or more group, set or path rows selected, the row menu and the
  several-rows inspector offer Union, Intersect, Subtract and Exclude; each makes a new set row
  on top and leaves its inputs as they are (top task 9).
- **Create rule set...** on an attribute, and on Find's menu, makes a set defined by a condition.
  It follows the data and says so in its row (a small rule mark) and its Provenance. It is still a
  set: it paints and never filters. To compute on it, use Filter to....

### 3.9 Hundreds of groups

A run row with many groups arrives collapsed (owner). Expanded, it lists groups by size with
their own colors for as many as the palette tells apart (about ten), then one "274 more groups"
row with a shared swatch. The run's own search field (appears when expanded past 20 children)
filters its children by name or member. **Show members in table** opens the run's item tab in
the dock. Recoloring or renaming a group edits a slot in the run's own layer; it never adds a
layer.

### 3.10 Selecting rows

Clicking a row selects it: the inspector shows that row, its members are outlined on the canvas
and marked in the table. Shift-click and Mod-click select several rows. Double-click renames.
Arrow keys move, Left and Right collapse and expand, Space toggles the eye, Enter opens the
inspector, Shift+F10 the row menu.

Framework consequence to record: the conceptual model says definitions are never selected.
The owner's refined B makes a paint row selectable so its inspector can style it; the model
gains "one tree row" as a selection kind.

### 3.11 Empty and first states

- Before any run or set: Selection, a prompt row "Analyze to add results here" (opens the Analyze
  popover), and Everything.
- A running row shows progress and Cancel. A failed run stays as a row with an error icon and
  the element's message, with Retry and Remove. A GPU run that fails is never quietly finished
  on the CPU.

---

## 4. The rail

Top to bottom: **Main menu**, **Graph** (the tree, the default), **Data**, **Notes**,
**Assistant**. Rail places have no hotkeys; Quick actions reaches each by name.

| Place | Question it answers | Contents |
|---|---|---|
| Graph | What paints the graph, and in what order? | Graphs switcher, the tree, Views |
| Data | What is the data, how is it read, and what is it computed on? | Sources, Filters, Attributes, Versions, Sent and saved |
| Notes | What has been written, and about what? | every note, newest first |
| Assistant | What can I ask? | conversations |

Results and Algorithms places are retired: runs are tree rows (owner) and the catalog is the
Analyze popover (section 2.2). The information architecture's clause that "Graph and Results
never leave" the rail is superseded and must be recorded as a framework change.

---

## 5. The inspector (right panel)

One inspector whose content is chosen by the selection's kind. Every kind has a **header**
(icon, name, count, provenance link), then a **Style** tab and a **Data** tab, except where noted.
Style is first, as the owner asked for rows. The tab last used for each kind is remembered.

| Selection | Style tab | Data tab |
|---|---|---|
| **Nothing** | (no tabs) | Overview: nodes, edges, direction, density, components and isolates, degree distribution, weight and what it means, attributes, the Last import row (opens the import report), the overview recipe's name with Change..., and **Compute the overview** (fills the costly readings in one click; nothing costly runs at Load); **Layout** (method, dimension, scope, pins, Re-run); **Statistics**, the graph-wide readings of every run, each linked to its run row; the graph's Notes |
| **One node** | **Why this look**: each property with the row that wins it ("Color from Community 3", "Size from PageRank", "Outline from Selection"), each a link that selects that row; rows that also match but lose are listed below, grayed; editing a property here writes to the Overrides row | Attributes (the file's own), Results (every computed value with its rank), Memberships (every group, set and path row it belongs to), Neighbors (count, Show in table), Notes |
| **One edge** | Why this look, as for a node | Attributes, weight and what it means, Results, Memberships, Notes |
| **Several elements** | Why this look, summarized ("color from 3 rows") | Count, shared attributes, the rows they belong to, Create set, Show in table, Notes (Add note targets all of them) |
| **A group, set or path row** | Node color, size, shape, label, edge color and width, opacity, with the color picker's Custom and Libraries tabs and "+" for a library style; Overlap ("9 of 40 members show Watchlist's color", Move above) | Summary (size, density, share of graph), Membership (the top 10 by the ranking the run used, or by degree within the group when the run ranks nothing, Show members in table, Select members), Provenance ("Created from Louvain, Sep 28", the scope and data version it was computed on), Keep as set, Compare with..., Notes |
| **A measure row** | The encoding: color ramp or size range, scale (linear, log, rank, diverging, with the element's default for the value's shape), domain, legend label, and what "no value" draws as: by default **nothing**, so rows beneath show through on elements the run did not score (the project's algorithm-style rule); a reader may pick a color, which is then the analyst's choice and is labeled so | Distribution with a histogram (brushing it selects those nodes), top 10, Provenance, the attribute it writes (link to Data > Attributes), Settings and Rerun when a run made it, Notes |
| **A run row** | The run's palette or ramp for all its children; per-child overrides listed | **Settings** (every option, generated from the element's schema, with Rerun), **Readings** (modularity, number of groups, edges within and between groups with a link to the group-by-group count in the item tab, pair lists, other non-paintable outputs), Top items, **Earlier results** (Restore, Keep as separate run), Provenance (scope, data version, direction and weight meaning, how repeated edges and self-loops were read, seed, time), Compare with another run..., **Check** (Test against a null model..., Stability across seeds... for group runs), Notes |
| **A folder** | Nothing of its own; lists its rows' swatches | Rows inside, their counts, Notes |
| **Selection row** | The selection's look | (no Data tab) |
| **Everything row** | The default look for all nodes and edges | Same as Nothing selected |
| **Several rows** | Only properties they share; a change applies to each | Overlap and statistics side by side, Compare with..., Combine (Union, Intersect, Subtract, Exclude) when they are group, set or path rows |
| **An attribute** (from Data) | (no Style tab: style belongs to a row) | Level (editable), role and what the weight means, origin, profile (distribution, missing count, distinct values), the rows that paint from it, Color by / Size by / Show as groups / Filter to... |
| **A filter step** (from Data) | (no Style tab) | The step's editor: attribute, condition, count before and after, Notes |

"Why this look" is the owner's requirement for a node; the studio extends it to edges and
multi-selections because the same question is asked of them.

---

## 6. The table dock, and how it differs from the Data tab

The bottom dock holds the **table** (Shift+T) and the **time slider** (T, shown only when the data
has a time attribute). Its tabs are **Nodes**, **Edges**, and one **item tab** per open run
("Communities: Louvain", one row per community with size, density, edges inside, edges leaving, and color). Canvas, table and
inspector share one selection.

**The line (studio decision): the Data tab describes one thing; the table lists many things side
by side.**

| | Data tab | Table |
|---|---|---|
| Unit | the selected thing (one node, one row, one run) | many nodes, edges or items |
| Shows | a summary: counts, distribution, top 10, provenance, notes | every value of every attribute as a column |
| Members | never more than the top 10, then "Show members in table" | all members, sortable and filterable |
| Editing | the thing's own settings (a run's options, an attribute's level) | cell values, New column, Merge nodes |
| Comparing | one thing against another by Compare with... | many things by sorting a column |

- "Show members in table" on a row sets the table's Nodes tab to that row's members, with a chip
  naming the row, removable. It is a view of the table, not a filter step: it changes nothing
  that is computed.
- Column header menu: Color by, Size by, Show as groups, Filter to..., Show in Data. These are the
  same verbs as an attribute's menu in Data.
- The table's Notes column shows a count per element.

---

## 7. The Data place

Top to bottom (studio decision on order: the short, frequent Filters section sits above the
long, scrolling Attributes list, and the order reads as computation: source, then what counts,
then the values computed on it).

1. **Sources** (compact). One line per file or connection: "transfers-march.csv, 3,000 nodes,
   9,113 edges, directed, read Sep 28". A joined table is an indented child: "accounts.csv, joined
   on id, 3,000 of 3,000 matched". The source's menu: Update with new data..., Replace data...,
   Add a table..., Join..., Re-map columns..., Show import report. Each opens the **load step**
   dialog. Declared graph properties sit on the source line (directed, parallel edges kept).
2. **Filters.** The ordered filter steps in evaluation order, each with a checkbox, its outcome
   ("amount >= 1,000: 3,000 to 812 nodes"), a menu and drag to reorder. The caption says once:
   "Filters change what is computed and laid out. To stop drawing something, use the eye in the
   Graph tree." Add filter step... at the foot offers the step kinds top task 6 names: by an
   attribute or a computed value, a weight threshold, the largest component, a k-core, and to
   the neighbors of a selection. The header's filter chip ("Full graph", "2 filter
   steps") stays visible from every place and opens this section. After undoing a step, the
   one-line notice names it (owner).
3. **Attributes**, in two groups, **Nodes** and **Edges**. Inside each, subheads by origin: From
   runs (first, because they change most), Joined, From the file, Expression. Each row: level
   icon, name, role badge (weight with its meaning: distance, strength or capacity; node type;
   time; position), a small distribution sparkline, a paint dot when a tree row paints from it
   (clicking the dot selects that row), and a run result's scope mark ("on 3,000 nodes; now
   812") or out-of-date mark, as on its tree row (section 3.3). A search field appears past one screen. **New attribute...** at the foot.
   - Clicking a row opens it in the inspector (Data tab only).
   - Clicking the level icon changes the level (for example integer community ids read as `#`
     become `Abc`); every row that reads the attribute updates.
   - A run's result attribute reads its scope in its second line: "from PageRank, on 812 nodes,
     March data".
   - Layout coordinates and imported positions are attributes with the position role.
4. **Versions** (folded). Data versions newest first, current marked. Each opens Version history.
5. **Sent and saved** (folded). Every export and send: what, when, where, what was masked. The
   telemetry state is shown here too: "Usage data: off" or "Usage data: on, graph content
   masked", with a link to change it in Preferences.

Applied recipes move to Version history, where the operation log already is.

Graph-level readings (density, modularity) are not attributes; they stay on the run's Data tab
and in the nothing-selected Statistics. Group-level values (a community's size and density) stay
on the group row and the item tab.

---

## 8. Notes place

- Every note, newest first. Each entry shows its text, author (only when the project has more
  than one), time, targets as chips, and citations.
- Filter: All notes, About the selection, About this graph. A search field (Find over notes).
- Header: the **Note markers** eye (section 2.1) and Add note.
- Clicking a note selects its targets: target rows scroll into view with a focus outline (never
  paint), and the camera flies to element targets.
- Notes about elements removed by a filter step are listed under "About elements not in this
  filter step", never dropped.
- Writing: Add note from the selection bar, a context menu, a row's menu, a row's note count,
  the inspector's Notes section, or N. The new note's targets are whatever is selected, rows or
  elements; with nothing selected, the graph. Mod+Enter saves, Esc cancels.

---

## 9. Header, canvas, cameras, views and modes

**Header** (above the left panel and canvas):

- Top left: the **project name** with its menu (section 10.2).
- The **privacy line**: "Local only" or "Usage data on, content masked".
- The **filter chip**.
- Top right of the canvas: the **zoom-and-view menu**, showing the zoom level. There is no Export
  button and no avatar in the top right.

**Zoom-and-view menu:** Zoom in (=), Zoom out (-), Zoom to fit (0), Zoom to selection (F), Reset
view (Shift+0); in 3D only, Camera: Front (1), Side (3), Top (7); Views: the saved views to jump
to, and Save view...; Display: Labels, Arrows, Legend (L), Minimap (M), Note markers (Shift+N).

**Saved views** live at the foot of the Graph place, folded. A view captures positions, the
camera, the eyes and the display toggles it names. Its order is the findings report's page
order.

**Modes:** 2D and 3D are a Layout setting reached from the toolbar's View mode. VR and AR are
sessions entered from the same flyout. Version history and the comparison surface are full-canvas
modes with a back arrow, opened from the project-name menu and from Compare with....

**Canvas:** the drawing, one legend (clicking an entry selects the row that paints it), note
markers, the "not drawn" line, and the state cards (loading, empty, too large to draw, GPU lost).

---

## 10. Menus

### 10.1 Main menu (rail, top)

- **File**: New project, Open... (Mod+O), Open recent, Save (Mod+S), Save as..., Add data...,
  Paste data (Mod+V), Export...
- **Edit**: Undo, Redo, Undo history, Select all visible (Mod+A), Invert selection (I), Previous
  selection, Select same value, Select edges between, Copy ids, Create set (Mod+G), Filter to
  neighbors, Hide on canvas (Mod+Shift+H), Show all
- **View**: 2D / 3D (5), Enter VR, Enter AR, Toggle panels (Mod+B), Table (Shift+T), Time slider
  (T), the display toggles
- **Analyze**: the catalog groups as submenus (Rank nodes and edges, Find groups, Find paths,
  Measure the graph), All algorithms..., Re-run layout
- **Recipes**: Apply recipe..., Apply style file on top..., Replace style with style file...,
  Save as recipe..., Export style..., Use as overview...
- **Help**: Keyboard shortcuts (?), Documentation, Report a problem, About
- **Preferences...**

### 10.2 Project-name menu (top left)

Rename, Author..., Export... (owner), Version history, Duplicate, Show file location, Close.

### 10.3 Context menus

| Target | Items |
|---|---|
| A node | Inspect, Expand (E), Neighborhood (G), Filter to neighbors, Shortest path from here, Analyze these..., Create set, Add to set..., Hide on canvas, Add note, Show in table, Pin position |
| An edge | Inspect, Select endpoints, Hide on canvas, Add note, Show in table |
| Several elements | Create set, Analyze these..., Neighborhood, Filter to neighbors, Lay out members..., Extract as graph, Hide on canvas, Add note, Show in table, Merge nodes... |
| Empty canvas | Select all visible, Zoom to fit, Paste data, Re-run layout, Add node (tail task) |
| A group, set or path row | Rename, Keep as set (run children), Select members, Show members in table, Analyze these members..., Lay out members..., Collapse on canvas, Compare with..., Combine with selected rows (Union, Intersect, Subtract, Exclude), Add note, Open notes, Move to folder, Lock, Hide from list (keeps painting), Delete |
| A measure row | Rename, Keep top N as set..., Show in table, Filter to..., Compare with..., Add note, Lock, Hide from list, Delete |
| A run row | Rerun, Run again as copy, Settings, Show members in table, Lay out by these groups (group runs), Compare with another run..., Add note, Lock, Hide from list, Delete (asks, since it removes its attribute too) |
| A folder | Rename, Ungroup, Lock, Hide from list, Delete folder (keeps rows) |
| An attribute | Color by, Size by (Width by for edges), Show as groups, Place by (a layout axis, or longitude and latitude), Filter to..., Create rule set..., Show in table, Change level, Declare role..., Rename, Add note |
| A note | Edit, Select targets, Copy link to note, Delete |

---

## 11. First use

### 11.1 Start screen

Shown when no project is open. Left: Open..., New project, Drop a file anywhere, Paste data,
Connect to a data source.... Middle: Recent projects. Right: Samples (Les Miserables, Zachary's
karate club, a protein interaction sample, a card and transfer sample), each with one line saying
what it is good for. Opening a project or a sample never passes the load step.

### 11.2 Usage data opt-in (owner's decision and words)

Shown once, the first time the app opens, as a non-blocking card at the foot of the start screen
(studio decision: the person can open a sample before answering; nothing is sent until they
answer yes). The text is the owner's, kept whole:

> Your data is yours, but please help us. We will never see the data you analyze, but we would
> like to collect information about how you use the app so that we can improve the user
> experience. This data will only ever be used by the author of the application and his Claude
> Code sessions.

Buttons: **Share usage data** and **No thanks**, equal weight, no default. A "What is collected"
disclosure lists, from the owner's decision: a session replay with every node name, attribute
value, label and file content masked; anonymous task events (file loaded, first graph drawn,
measure run, result read, style added, export, undo) with timings; errors and performance; a
feedback widget. It ends: "No file contents ever leave your computer." Until answered, usage data
is off. The choice can be changed in Preferences and is shown in Data > Sent and saved and the
header's privacy line.

### 11.3 Loading a file (the load step)

Any data door (Open, drop, paste, connect, Add data, Replace, Join, Update) opens the load step
dialog: a preview of the first rows, one type per column (editable), which columns are the
source, target and id, direction, how repeated pairs are read, the weight column and what it
means, and checks (weight read as text, many isolates, direction guessed). Load lands on the
Graph place with the tree holding Selection, the prompt row and Everything, the canvas drawn, and
the inspector showing the graph overview with the Last import row.

---

## 12. Dialogs

- **Export...** (project-name menu, File menu, a row's or view's menu with that target filled
  in). One dialog with a list on the left: Figure (SVG now; PDF later), Findings report (one
  self-contained HTML file, with the methods text written from the run records), Methods text
  alone, Project, Recipe, Style, Data (CSV, GraphML and the other graph-io formats), Table as CSV
  (each column header carries its value's scope). Each shows what it contains, the scope (filtered graph or full), what is
  masked, and a file-size estimate. Every export is recorded in Data > Sent and saved.
- **Apply recipe...** (Recipes menu, or a dropped recipe): the binding step. It lists each
  attribute the recipe needs with its level icon and the matching attribute in this data,
  mismatches confirmed, never silently skipped; the runs and paint rows it will add; and where it
  fetches from, if anywhere, confirmed first. Applying adds the rows on top of the tree, marked
  "from recipe <name>" in their Provenance.
- **Preferences...**: Author (name shown on notes and recipes), Theme, Usage data (on or off, with
  the owner's text), Default overview, Keyboard shortcuts (opens the shortcuts panel), GPU use
  (the element's policy), Number format, Reduced motion, AI provider... (for the Assistant).
- **Compare with...**: opens the comparison surface with the two things chosen.
- **Keyboard shortcuts** (?): the element's and the app's chords, grouped by region.

---

## 13. What the clickable skeleton shows

Built on Les Miserables, with the transfers data for Data and Path, so every label meets two
domains. The skeleton is layout, not function: states are switched by clicks, not computed.

1. Start screen with the usage-data card; the load step dialog.
2. Graph place: Selection, a PageRank measure row (selected, painting), a Louvain run
   (collapsed, with a note count of 1 and a hollow "2 inside" mark; expanded, Community 3 with a
   count of 2 and "274 more groups" on a larger variant), a path row, a folder, a row hidden from
   the list, Everything. Eye, solo, and Everything hidden with its layout line.
3. Inspector for each selection kind in section 5, including a node's "Why this look".
4. Analyze popover: closed, open with groups and a disabled entry, PageRank essentials,
   All algorithms sheet; a running row with Cancel; a finished row.
5. Toolbar at rest; selection bar with two nodes selected; Path armed with its bar; View mode
   flyout with and without a headset reported.
6. Zoom-and-view menu in 2D and in 3D.
7. Data place on transfers: Sources with a join, Filters with two steps, Attributes (`# amount`
   with "weight: capacity", `Abc kind` with node type, a date attribute, `# PageRank` from a run
   with its paint dot and its scope mark after a filter step), Versions, Sent and saved.
8. Notes place with its filter and markers eye; one note with two targets reached from both
   rows.
9. Table dock with Nodes, Edges and "Communities: Louvain"; "Show members in table" from a row.
10. Main menu, project-name menu, the context menus of a node, a row, a run and an attribute.
11. Export, Apply recipe and Preferences dialogs.

---

## 14. Framework changes this structure requires

To be recorded with their reasons in `information-architecture.md`, `figma-crosswalk.md` and
`interface-specification.md`:

- Results and Algorithms places are retired; the rail is Graph, Data, Notes, Assistant (the
  owner's rule that runs are tree rows, and the studio's toolbar decision).
- The style stack moves into the Graph place as the paint tree, and paint rows become
  selectable (owner).
- A measure run paints on finish (owner), reversing structure B's "a measure adds no row".
- The inspector gains Style and Data tabs (owner), replacing structure B's single scrolling
  inspector.
- Filter steps move from the chip's popover into Data > Filters; the chip opens them (owner).
- Analyze on the toolbar maps to Figma's Actions button; the Note tool stays off the toolbar.
- Applied recipes move from Data to Version history.
- The glossary gains an entry for "measure row" as a document-only word beside the screen word
  "metric".
- The conceptual model's 4.6 ("a graph statistic ... kept in the Results panel") becomes "kept
  as a run row with no eye, its value on the run's Data tab and in Statistics".
- The conceptual model's Overrides layer gains a visible built-in row (section 3.7).

---

## 15. Every top task has a home

Each task in `../../../framework/top-tasks.md`, with where it starts and where its answer is read.
A task with no row here has no home in this structure.

| Task | Starts from | Answer read in |
|---|---|---|
| 1 Characterize the whole graph | nothing selected; Compute the overview | nothing-selected Data tab; Data > Attributes (level icons, profiles); import report from Sources |
| 2 Rank nodes | Analyze > Rank nodes and edges | the measure row (paints); its Data tab histogram and top 10 |
| 3 Communities | Analyze > Find groups | the run row and its group children (paint); Readings (count, sizes, modularity, edges between groups); item tab |
| 4 Find, inspect, explore a neighborhood | Find (/); Expand, Neighborhood, Filter to neighbors; Previous selection | the node's Data tab; the table |
| 5 Take a note | Add note (N) from the selection bar, menus, inspector | the Notes place; note counts on rows; canvas markers |
| 6 Filter, then characterize | Data > Filters; the filter chip; Filter to... on attributes, rows and selections | the nothing-selected Data tab, now over the filtered graph; stale marks on older runs |
| 7 Make the layout readable | nothing-selected Layout section; Lay out members... on a set, group or run; Place by on an attribute | the canvas |
| Load a graph | start screen; File > Add data; drop; paste | the load step; Data > Sources |
| Start from a recipe | Recipes > Apply recipe... | the binding step; rows marked "from recipe" |
| Export | project-name menu > Export...; a row's or view's menu | the file; Data > Sent and saved |
| 8 Color or size by a value | a row's Style tab; an attribute's Color by / Size by | the measure or group row; the legend |
| 9 Create and combine sets | Create set (Mod+G); Keep as set; Keep top N as set; Combine | set rows |
| 10 Compare with... | a row's or run's menu and Data tab | the comparison surface; Save comparison makes a run row |
| 11 Shortest path | the Path tool (P); Shortest path from here; Analyze > Find paths | path children under one path run row |
| 12 Reuse an analysis | Data > Sources > Replace data... | the same rows, each marked where a number changed |
| Tail: time | the time slider (T) | a series measure row, one window at a time |
| Tail: combine, project, extract | Graphs switcher > New graph from | a new graph in the switcher |
| Tail: null model, seed stability | a run's Data tab > Check | a reading on that run |
| Tail: clean and merge | the table (cell edits, Merge nodes) | Data > Versions |
| Tail: bridges, link prediction, the rest of the catalog | Analyze (All algorithms...) | a group or edge measure row; a pair run's item tab |
| Tail: save a view; 2D, 3D, VR, AR | Views, Save view...; View mode | the Views list; the canvas |

---

## Review changes (information architecture)

Each fix below gives a task, object or rule a single home; all are studio decisions unless marked.

- **Owner labels corrected (section 1).** "The M avatar goes" is now labeled a studio decision:
  the owner asked what the avatar was, and did not decide to remove it. The undo notice and the
  Note tool are listed under "decided on the owner's behalf", as `owner-feedback.md` records them.
  Added the owner's decisions that were missing: recipes record who saved them, weighted measures
  are named from the data with no currency special case, and the project saves its selection.
- **Pair-list algorithms (section 2.2).** Link prediction and similarity had no stated home.
  They go in Measure the graph, as a run with no eye; the pairs are on the Data tab and in the
  run's item tab.
- **Graph-making algorithms (sections 2.2 and 3).** Bipartite projection, quotient graph,
  null-model sample, combine graphs and extract-as-graph make a graph, not a row. They live in
  the Graphs switcher's New graph from menu, with a pointer entry in the catalog. The same menu
  now holds Add as another graph and Compare with for two graphs or two time windows.
- **Word clash: "Versions" (sections 2.2 and 5).** Data > Versions and a run's Versions section
  meant different things on the same screen. The run's section is now called Earlier results.
- **The "Layout row" (section 2.3).** Layout is a setting in the graph's inspector, not a tree
  row. The text now says "the graph's Layout dimension".
- **Repeated path queries (section 2.3).** Top task 11 asks for every path query to be kept
  under one result. Queries made with the same settings now collect under one path run row, one
  child per query.
- **Neighborhood and Filter to neighbors (sections 2.3, 7, 10).** Top task 4's k hops and its
  "neighborhood as the boundary" had no home. Both are now on the Neighborhood popover, the node
  and several-elements context menus, the Edit menu, and as a filter-step kind.
- **Layout of a set or a partition (sections 2.3, 10.3).** Top task 7 reaches layout "from the
  graph, a set or a partition". Lay out members... is now on group, set and run rows and on
  several selected elements.
- **Set operations and rule sets (new section 3.8a, sections 5 and 10.3).** Top task 9 had no
  Union, Intersect, Subtract or Exclude, no one-step "top of a ranking as a set", and no rule
  set. All three now have homes. Load set collection... now has an entry point.
- **Saved comparisons and the overview (section 3.2).** A saved comparison had no row. It is now
  a run row with the per-element difference as a paintable child and its statistic as a reading.
  Compute the overview is stated to add no rows. Top tasks says the overview never paints. The
  owner's rule that a run paints applies to runs the analyst starts, so the two rules do not clash.
- **The nothing-selected overview (section 5).** Isolates, the degree distribution, the import
  report, the overview recipe and Compute the overview (top task 1) were missing from it.
- **Null-model test and stability across seeds (section 5).** These tasks from the tail of the
  top-task list had no home. They are now under a Check section on a run's Data tab.
- **Filter step kinds (section 7).** The filter step kinds that top task 6 names are now listed:
  by attribute or computed value, weight threshold, largest component, k-core, and neighbors.
- **Menus (section 10).** Edit gains Undo history, Select same value, Select edges between and
  Copy ids. Recipes gains the two style-file commands. Merge nodes and Extract as graph are added
  to the several-elements context menu. All of these were in `information-architecture.md` with
  no home here.
- **Preferences (section 12).** "Units" is removed from Preferences, because columns carry no
  unit concept (the owner's decision against the money-specific fix). Reduced motion and an AI
  provider for the Assistant are added.
- **Export (section 12).** Top task "Export" asks for the methods text and for scope in table
  headers. The methods text is now a separate export, and table headers carry their scope.

---

## Review changes (network science)

A network scientist's review of the analyses this structure must carry. Each change is a studio
decision unless it restates a rule from the conceptual model or the project's rules.

- **XR contradiction removed.** Section 2.1 said a headset has no tree while 2.2 said results
  land in the tree in XR. The hand menu now has a Rows page (top-level rows, swatches, eyes,
  solo), and XR runs use each entry's last settings because the option forms are left out.
- **"Out of date" corrected.** A filter step made earlier runs read "out of date", which the
  conceptual model forbids (a different scope is not out of date). Rows and attributes now show
  a scope mark ("on 3,000 nodes; now 812") with Rerun on current filter; "out of date" is kept
  for a data change. The Tableau test task and the skeleton's Data place follow.
- **"No value" no longer paints by default.** A measure row's "what no value draws as" would have
  painted elements the run did not score, against the rule that an algorithm's style paints only
  its own results. The default is now nothing; a chosen color is the reader's.
- **Result kinds that had no row:** edge measures (edge betweenness), runs with several measure
  outputs (HITS, in- and out-degree), runs that find one set (bridges, articulation points, a
  k-core, a clique, the diameter path), hierarchical partitions (a Level control, one level of
  children at a time), series over time windows (the time slider picks the painted window), and
  graph readings with a per-element counterpart (transitivity offers local clustering).
- **Top task 3 gaps:** the run's Readings now include the number of groups and edges within and
  between groups, and the item tab lists each community's edges inside and leaving. A partition
  with no ranking lists its top members by degree within the group.
- **How a result read the edges** (top tasks: stays visible regardless of rank) is now in a
  run's Provenance: direction, weight meaning, repeated edges and self-loops.
- **Test wording that reused screen words:** "split the characters into groups" (Find groups),
  "go back to the view you saved" (Save view...) and "why the analyst kept this group" (Keep as
  set, group) were reworded so round 7 does not measure word matching.

---

## Review changes (ontology and generality)

Against the conceptual model, top tasks and owner feedback:

- **Rerunning revised in place.** Analyze on an entry that already has a row now revises that row
  (earlier result kept) with "As a new row" offered, matching the conceptual model's rule that
  running an algorithm again re-runs its result; without it, retuning communities stacked rows.
- **Corrected variants name themselves** ("Closeness, per component"), as top task 2 requires.
- **Derived graphs got a home**: the Graphs switcher's New graph from menu (Extract as graph,
  projection, quotient, Combine graphs, null-model sample), which section 2.2 pointed to but no
  section defined.
- **The no-eye exception is stated** in the central rule: readings-only and pair runs are rows
  with nothing to paint, per the owner's "every run is a row".
- **Result kinds with no row got one**: edge measures, hierarchical partitions (one row, level
  chosen on its Style tab), covers, series (one row, the time slider picks the window), flow, and
  pair runs (pair icon, no eye).
- **Covers break "groups of one partition do not overlap"**; the precedence rule now says how a
  shared member is painted.
- **Overrides row added.** The conceptual model has an Overrides style layer; without a row, a
  one-off color on one node had no legal route. The node's Style tab now writes to it.
- **The Look and background** placed on Everything's Style tab, keeping the owner's grayscale
  check on the Print look.
- **Collapse on canvas** (a collapsed set, model state 1.1) added to group and set rows.
- **Place by** on attributes, for top task 7's layout from attributes.
- **Domain-neutral example**: the folder "Suspects" became "For the report"; the Path test gained
  a Les Miserables wording beside the transfers one, per the owner's two-domain rule.
- **Framework changes** gained the conceptual model's two edits (graph statistics as run rows,
  the Overrides row).
- **Section 15** maps every top task, bookend and tail task to where it starts and is read.
