# Refined structure B: the complete specification (version 2)

This page specifies the app structure that round 7 tests: one tree of paint rows on the left,
the canvas in the middle, an inspector on the right with Style and Data tabs, a table dock at the
bottom, and a floating toolbar. It is the reference for the clickable skeleton the owner reviews
before any focus group or flow study.

Version 2 answers the owner's review of the version 1 skeleton (2026-09-30). The answers, one
per question, are in `owner-questions-2.md`.

**Changed in version 2:**

- **Style tab** generated from graphty-element's 35 style properties, showing only what a row
  sets, "+" per section, bind-to-data on every property, label style in a popover (section 16).
- **Everything** is the element's own default layers shown as one row, not a user layer; the
  canvas background, label declutter and camera reframing move to the graph's Canvas section.
- **Notes paint through a built-in Notes row** under Selection; the app's HTML note markers are
  deleted (sections 2.1, 3.7).
- **Rename by double-click** (and F2) everywhere a name appears (section 3.10).
- **Data > Sources is the one home for bringing data in**, with a "Load into" choice, a URL door,
  a catalog-generated load dialog and refusal states (sections 2.4, 7, 11.3).
- **"Why this look"** lists only the layers painting the element (section 5).
- **Toolbar**: four controls, fixed at the bottom, hideable labels; Path leaves the toolbar for
  the selection bar and Analyze; Hand dropped; keys moved off graphty-element's canvas keys
  (section 2.3).
- **Views is a rail place** holding saved views only; the zoom chip becomes a Camera menu, the
  one home of built-in views and camera moves (sections 4, 9).
- **Export** gains Image and Video; SVG figure and data formats drawn as needing graphty-element
  (section 12).
- **One-home rule made enforceable**, main menu reduced to File, Edit, Settings, Help (sections 10,
  17).
- **Preferences renamed Settings**, per-person only, completed (section 12).
- **One inspector frame for every kind**: properties in the body, verbs in the "..." menu, one
  state bar for costly commits; Re-run layout leaves the inspector, pause/resume is a canvas chip
  (section 5).
- **Capability register**: every graphty-element capability in the audit has one disposition
  (section 18); every element gap is listed once (section 19).
- The skeleton opens in 3D, graphty-element's default.

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

- No separate Note tool for now. Add note's existing entry points cover it. Reversible after the
  several-notes-in-a-row test.
- After undoing a filter step, a one-line notice names the step.
- The project file saves the selection when it closes, so a case resumes where it stopped.

From the owner's review of the skeleton (2026-09-30):

- **Owner principle: styling should be unopinionated and left to the user.** The studio applies
  it as "the app adds no look of its own" (section 16.5).
- **Owner: renaming a row is a double-click, as in Figma, without a right-click.**
- The owner's other ten items were questions; the studio's answers are in `owner-questions-2.md`
  and are labeled studio decisions below.

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

**Revised in version 2** (owner's review: "maybe notes should have a style layer rather than
being a callout"). Individual notes still do not become rows. But how noted elements look on the
canvas is now **one built-in Notes row**, pinned directly under Selection (section 3.7). Its eye
is the only switch for note markers; the app's HTML callouts are deleted. Reason 1 below ("a
note cannot paint") is true of a note, not of a layer that marks noted elements, so it no longer
rules out that one row. The paragraph on the Note markers switch is replaced accordingly.

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
| a node or an edge | the Notes row's paint on the canvas; the table's Notes column | the element's Data tab |
| the graph | the graph's entry in the Graphs switcher | the inspector with nothing selected |
| a filter step | the step in Data > Filters | the step's editor |

A note that cites a run cites that exact run. If a rerun replaces it, the new row does not
inherit the note; the note reads "cites an earlier run" with a link to that run's settings.

**Note markers (version 2):** the **Notes row's eye** is the only switch. The Notes panel header
eye, the zoom menu's Note markers toggle, Shift+N and the hand menu's separate switch are
removed; in a headset the Notes row appears on the hand menu's Rows page like any row. The Notes
row paints an element whose other paint is hidden (the element is still laid out and the note is
still true), and stops when a filter removes its target; the Notes panel then lists that note as
"about elements not in this filter step".

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

- **Analyze** (key **Shift+A** in version 2: graphty-element takes A on a focused canvas) is a
  labeled toolbar button, and the toolbar is its one home. Quick actions (Mod+K), the empty
  tree's prompt, the selection bar's "Analyze these..." and a row's context menu ("Analyze these
  members...") are doors to the same catalog. Version 2 removes the main menu's Analyze submenu
  and the Analyze icons in the tree bar and the graph overview.
- **The catalog is generated from graphty-element** (`session.catalog.algorithms()` and
  `catalog.metrics()`), never typed. That adds Katz, HITS, Girvan-Newman, breadth-first levels
  ("Steps away"), depth-first order, Prim, bipartite matching, min-cut and all-pairs distance,
  and removes what the element does not have (edge betweenness, clustering coefficient, all
  shortest paths, K shortest paths, graph statistics as a run, modularity of a grouping,
  assortativity, node similarity). Each entry shows the element's cost estimate, its requirements
  (direction, weight, accelerator, connected) and its complexity text. Examples below that name a
  removed algorithm stand for "an algorithm of that kind", pending the element.
- **The popover** (about 400 x 480, above the toolbar, focus in its search field) shows Recent
  (the last five, each rerunnable with its last settings), then groups by **what the run adds to
  the tree**: Rank nodes and edges (a measure row), Find groups (a run with group children),
  Find paths (a path), Measure the graph (a reading only). Each entry shows the element's family,
  the type icon of the row it will add, and its marks: needs direction, needs a weight, cost.
  Algorithms whose answer is a list of pairs (link prediction, node similarity) sit in Measure
  the graph: they add a run row with no eye, their top pairs are on its Data tab and all of them
  in the run's item tab in the table. Algorithms that make a new graph (bipartite projection,
  quotient graph, a null-model sample) are not in this catalog: they add a graph, not a row, so
  they live in the Graphs switcher's New graph from menu (section 3). (Version 2 removes the
  pointer entry that was here: one home.)
  An entry whose precondition fails is shown disabled with its reason ("Needs a weight: this
  graph has none"). Search matches names and the element's aliases ("brokers" finds
  betweenness). **All algorithms...** widens the same popover into a two-column sheet with a
  description, inputs and cost for each entry. It is still anchored to the toolbar.
- **Picking an entry** expands it in place to its essentials, with defaults filled in: scope
  (Filtered graph, 77 nodes; or Selection, 5 nodes), direction, weight and **what the weight
  means** ("higher = farther" or "higher = stronger", with Invert), one key option (resolution,
  damping), estimated cost with the sampled variant offered, never swapped in silently, and **Stop
  after...** (the element's time box; a run stopped early is marked partial on its row). Enter
  runs. Esc steps back one level; a second Esc closes and returns focus to the button.
- **An algorithm that needs canvas input** (a path, a neighborhood around a seed) uses the
  current selection. With nothing suitable selected, it arms the click-From-then-To pick mode
  (section 2.3; the Path toolbar button is gone in version 2).
- **Running** closes the popover and adds the row at the top of the tree at once, with progress
  and Cancel on the row. A screen reader hears "PageRank added, running". The row paints when the
  run finishes (owner). It takes the selection only if the selection has not changed since
  Analyze was pressed; otherwise it arrives unselected, briefly highlighted, and is announced.
- **After the run**, the row's Data tab holds every option under Made with (section 5). Editing
  one shows the state bar under the header, "Settings changed since the run -- Rerun | Revert".
  Rerun with changed settings revises the run in place; the row's "..." menu offers Restore an
  earlier result (needs graphty-element: a rerun replaces the result and the element keeps no
  earlier one) and **Run again as copy**, which runs under a new id (the element's `as`
  option) and leaves this row as it was, so two partitions can be painted and compared
  (owner: results stay available to compare). The state bar offers it too: "Rerun | Run as
  copy | Revert". Version 2 merges "Keep as separate run" into it: both were the same element
  call, so they were one command with two names.
- **Analyzing with an entry that already has a row on this graph revises that row** (conceptual
  model 4.3: running an algorithm that already has a result re-runs it, and the earlier run stays
  as the baseline). The popover says so before Enter: "Updates the PageRank row; its earlier
  result is replaced; use As a new row to keep both", with **As a new row** beside Run. The revised row keeps
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
  as well as "came from", breaking the owner's rule for nesting. Run again as copy gives the
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

**Studio decision (version 2): four controls, fixed at the bottom center of the canvas, each with
a text label that can be hidden. A control belongs on the toolbar only if it changes what the
next click or drag on the canvas does, or if it starts from the canvas and adds a row to the
tree. Everything else is a thing (it lives in a place), a setting (it lives on what it configures)
or a verb on a selection (it lives with the selection).**

| Group | Control | Key | Flyout |
|---|---|---|---|
| Pointer | **Select** | V | none until Lasso ships (skeleton review: a flyout with one live entry is not worth the caret's width; Lasso returns with its caret when graphty-element supports area selection) |
| Make | **Analyze** | Shift+A | the catalog popover (section 2.2) |
| Commands | **Quick actions** | Mod+K (already bound) | none; every command by name, each entry naming its home |
| Mode | **View mode** (shows "2D" or "3D") | 5 toggles 2D/3D | 2D, 3D; a divider; Enter VR, Enter AR |

**Quick actions is the one exception to the membership rule (skeleton review).** It neither
changes what the next canvas click does nor adds a row. It stays because it is the index of every
command, and the toolbar is where a Figma user looks for "do something"; moving it to the header
as a search field was weighed and rejected for now, because the header's right side already holds
undo and redo and the round 7 first-click tasks need one stable place to find it.

**Position (the owner asked about the left side or a movable toolbar).** It stays at the bottom
center and cannot be moved. The left edge already holds the rail and the tree; a third vertical
strip would make places and tools read as one column. The selection bar, the path bar and every
flyout attach directly above the toolbar, and the headset hand menu mirrors its order, so each
extra position would multiply all of them. Figma moved its tools to a fixed bottom bar in 2024
for this reason; Blender and Photoshop put tools on the left because no rail and tree live there.

**Labels.** Settings > Appearance > **Toolbar labels: Auto / Always / Never**. Auto drops the text
(icons, tooltips and key hints stay) when the labeled bar would take more than about 60% of the
canvas width -- about 650 px of canvas for this bar, which is about 390 px wide with labels.

**Space is not the limit, and more space would not add tools.** The studio checked all 349
graphty-element capabilities in the audit against the membership rule. Camera jumps change
nothing about a click; capture is output; layout, pin on drag and declutter are settings;
expanding a neighborhood, pinning and adding a note are verbs on a selection. None qualifies.

**Path leaves the toolbar (owner asked whether it belongs under Select).** Not under Select:
Select's flyout holds modes you stay in, while Path is two clicks that produce one row and drop
you back into Select; in the flyout it would also hide behind a caret, which is the round 6
failure (five participants missed the unlabeled Path icon). Its homes now:

- **The selection bar.** With exactly two nodes (or a node and a set) selected, it offers **Path
  between: Shortest path, Most flow, Weakest cut** -- graphty-element's shortest-path (Dijkstra or
  Bellman-Ford, the element's choice shown), max-flow and min-cut. Direction and weight, with
  what the weight means, show before it runs. With one node selected it offers **Steps away**
  (breadth-first levels).
- **Analyze > Find paths**, and the **P** key (not an element key), arm the pick mode: click
  From, then To. While armed, a bar above the toolbar shows From, To, Direction, Weight, Scope and
  Run, replacing the selection bar.
- "All shortest paths" and "K shortest paths" are deleted: graphty-element has neither.
- Results land as before: a path row on top of the tree that paints; later queries with the same
  settings collect under one path run row, one child per query (top task 11).

**Hand is dropped.** A plain drag already pans in 2D and orbits in 3D, and graphty-element has
no pointer-mode API, so Hand did nothing. Space-drag is not needed either.

**Keys.** When the canvas has focus, graphty-element uses W, A, S, D, Q, E and the arrows (3D:
arrows orbit, W/S zoom, A/D spin; 2D: W/A/S/D and arrows pan, Q/E rotate, +/= and - zoom). App
keys never use them:

| Command | Version 1 key | Version 2 key |
|---|---|---|
| Analyze | A | Shift+A |
| Expand | E | none; Expand is withdrawn until a source can fetch neighbors (see below) |
| Zoom in, zoom out (2D) | =, - | none of the app's: these are graphty-element's own 2D keys, shown as hints only |
| Lasso | Q | none until the element supports area selection |
| Hand | H | removed |
| Path | P (toolbar) | P (arms the pick mode) |

The shortcuts panel lists the element's own keys first, as "Canvas (graphty-element)", marked
not changeable (the element publishes no keymap; filed). Settings > Accessibility can turn every
single-letter app key off (WCAG 2.1.4). Esc disarms a tool first, then closes a bar, and never
clears the selection. The toolbar is one Tab stop with arrow keys between buttons; Alt+Down opens
a flyout; the selection bar is its own stop in the F6 region cycle.

- **View mode** writes the graph's view mode (one undo step) and is its **only** home: the main
  menu's View submenu and the inspector's Dimension field are removed; key 5 and Quick actions
  are doors that show the same enabled state and reason. **Enter VR** and **Enter AR** read the
  element's `isVRSupported()` and `isARSupported()`; when unavailable they are disabled with the
  element's reason. The element's own Enter VR/AR overlay buttons are always turned off, because
  this flyout is their home. The skeleton has a "headset present" switch so both states can be
  reviewed. The skeleton opens in **3D**, graphty-element's default.
- **Expand is withdrawn (API review).** With the data already loaded, Expand selected the
  one-hop neighbors, which is exactly Neighborhood (G) at one hop: one command with two names.
  Its real meaning, fetching neighbors that are not loaded yet, is graphty-element's
  `layoutBehavior.fetchNodes` / `fetchEdges`, which needs a connector the element does not have.
  It returns, as Expand, when a source can fetch; until then it is not drawn.
- **The selection bar.** While something is selected and no tool is armed, a row attaches
  directly above the toolbar: Create set (Mod+G), Neighborhood (G), Path between or
  Steps away (above), Hide on canvas (Mod+Shift+H), Add note (N), Analyze these.... Neighborhood
  selects one hop; its popover offers 1 to 3 hops, in, out or both ways, and **Filter to
  neighbors** (one undoable filter step, top task 4). Verbs only.
- **In VR and AR** the same controls, in the same order, become the hand menu. Lasso and the
  option forms are left out: Analyze and Path run with each entry's last settings (or its
  defaults), named before it runs. The hand menu's **Rows** page lists the tree's top-level rows
  with swatches and eyes, including Notes. **Needs graphty-element:** DOM panels are not visible
  inside a headset and the element has no in-headset menu API, so the hand menu is drawn as a
  design target with that mark, not as buildable app chrome. No view jumping in a headset until
  the element publishes AR placement and scale.

Where everything else lives:

| Not on the toolbar | Where it lives | Why |
|---|---|---|
| Fit (0), frame selection (F), reset (Shift+0), zoom in and out (2D only; the element's own = and - keys), built-in views (Front 1, Side 3, Top 7, Isometric, plugin views) | the **Camera menu** at the top right of the canvas (section 9) | moving the camera changes nothing about a click |
| Saved views, Present, tours | the **Views** place (section 4) | a saved view is a named thing the user made; Present is a verb on views |
| Legend | its own card on the canvas (close); a Legend chip brings it back; L | reader display, one home |
| Labels, arrows | style properties on rows (section 16) | owner: styling is left to the user |
| Note markers | the Notes row's eye | section 2.1 |
| Minimap | nowhere; filed as a graphty-element feature | the element has none; the app may not compute one |
| Layout: method, options, scope, seed | the graph's Layout section (nothing-selected inspector) | a setting lives on what it configures |
| Pause and resume the layout | the layout chip on the canvas (section 9) | live canvas state, visible whatever is selected |
| Re-run layout | the canvas right-click menu, Quick actions | a command, not a property |
| Filters | Data > Filters, opened by the header's filter chip | owner: filters belong with the data |
| Styling | a row's Style tab | styling goes only through style layers |
| Compare with... | a row's "..." menu | it starts from a result |
| Find | / and the tree's search field | navigation, not a canvas mode |
| Undo and redo | Mod+Z, Shift+Mod+Z, Edit menu, header buttons | global |
| Export | the Export dialog (section 12) | owner: Export... in the project-name menu |
| Table and time slider | the bottom dock (Shift+T, T) | places, not tools |
| Add note | the selection bar, context menus, N | owner: no separate Note tool for now |

Rejected: a left or movable toolbar (above); Path under Select (above); a Camera tool (not a
pointer mode); a Layout button (a setting; tested with "untangle this"); digit keys for saved
views (reordering the list would silently change which key opens which view); binding app keys
only while the canvas lacks focus (the canvas has focus after almost every click, so the keys
would seem broken).

Round 7 first-click tasks, each worded without the button labels: "how is A connected to B?"
(selection bar or Analyze; if fewer than about half of first clicks land on either, the Path
button returns), "untangle this", "go back to the picture you kept on Monday" (Views place or
the Camera menu's jump list), "stop the graph from moving" with a node selected (the layout chip).

### 2.4 Is "Data" really "Sources"? What to borrow from Tableau

**Studio decision: the rail place stays "Data". Sources is its first section. The panel takes
Tableau's Data pane layout (typed rows, a compact source header, drag or menu to encode) in
graphty's own words, and leaves out Tableau's dimensions, measures and shelves.**

Contents, top to bottom (section 7 has the details): **Sources** (compact, joins nested),
**Filters**, **Attributes** (Nodes and Edges), **Versions**, **Sent and saved** (folded).

**Version 2 (owner's review: "should the data nav link become the equivalent of Tableau's Data
Sources?").** Studio decision: yes, within what graphty-element backs. Data > Sources becomes
the **one home for bringing data into a graph**; File loses Add data and Paste data; the Graphs
switcher loses Add as another graph. The mapping that decides it: a Tableau workbook holds many
data sources, and a graphty project holds many graphs; the tables inside one Tableau source are
the files that build one graph. So "several sources" means several loads feeding one graph, and
"a new data source" is a new graph -- one load dialog, ending with "Load into: this graph (add) /
replace this graph / a new graph". Taken from Tableau: several sources in one list, a URL source
with its read time and Refresh, the data-source page as the load dialog, filters beside the data.
Not taken, because graphty-element cannot do them yet (drawn with "needs graphty-element"):
joins, live connections, removing one source, filter at import. Not taken at all: an extract or
live toggle (the project always keeps a copy and says where it came from). Derived graphs are not
sources: they stay in the switcher's New graph from menu, and a derived graph's Sources section
shows a read-only origin line. Details in sections 7 and 11.3.

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
with the **list menu**, and the **tree**. (Version 2 removes the folded Views footer: saved views
have their own rail place, section 4.)

The Graphs switcher's menu also holds **New graph from**: Selection (Extract as graph), Bipartite
projection..., Quotient by groups..., Combine graphs..., Null-model sample.... Each makes a derived
graph (conceptual model 4.7), a new entry in the switcher with its own tree and positions, never a
row. Studio decision: a transform's output is a graph, and the graph is what the switcher lists.
**Every item is marked "needs graphty-element"**: the element has no transform API, and
computing a projection in the app is forbidden. This menu is their one home; the main menu's and
the Analyze popover's copies are removed. The several-elements context menu's Extract as graph is
a door to it.

The same menu holds the rest of what acts on whole graphs: each graph's Move up and Move down,
**Compare with...** (two graphs, or two time windows; a door). Version history is not here: its
one home is the project-name menu (section 17). A graph is renamed by
double-clicking its name (the pencil buttons go). Loading a file as a new graph is the load
dialog's "Load into: a new graph" (section 11.3), not an item here.

### 3.1 The central rule

**Every row in the tree can paint the graph. Reading the tree top to bottom is paint order, and
a higher row wins, property by property.** Selection is pinned at the top and Everything at the
bottom (owner). Notes (version 2) is pinned directly under Selection, and Overrides under Notes.

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
| **Notes** (built in, version 2, pinned under Selection) | a speech bubble | "Notes, 4 nodes" | none |
| **Overrides** (built in, just below Notes, shown only once it holds something) | a pencil | "Overrides, 3 nodes" | none |
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
- **Every result shape the element publishes has a row (API review, from `RESULT_SHAPES`).** An
  **edge set** (Kruskal's or Prim's spanning tree, a bipartite matching, a min-cut) is a group
  row whose members are edges, its icon carrying the edge mark, its Style tab opening on Edges.
  A **node set** is a group row. A **layered grouping** (breadth-first "Steps away") is a group
  run with one child per level. A **category table** has no picture of its own and is read on
  the run's Data tab and item tab. **Temporal** is the series row below. The row kind is chosen
  from the shape the element's catalog declares, never from the algorithm's name.
- **A hierarchical partition** (Louvain's levels, a dendrogram cut) is one run row whose children
  are the groups of one level at a time; a **Level** control on the run row's Style tab (its one
  home; the row menu does not repeat it) chooses which level the children are and paint. Run again as copy fixes a
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
  without a home). Edge measures, hierarchical partitions and series are covered by the bullets
  above; the rest:
  - a **cover** (overlapping communities) is a group run whose children may share members;
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
- **Selection, Overrides and Everything cannot move**, be deleted, be renamed, or go into
  a folder. **Notes** keeps its name and cannot be deleted, but drags like any other row
  (studio decision, skeleton review 2: pinned under Selection, a look given to noted elements
  would beat every analysis row, which is an opinion the app imposes; where it sits in the paint
  order is the reader's choice).
- **Lock** (row menu) freezes a row's position and its style. A locked row can still be hidden.

### 3.5 Precedence

**Paint order is the tree read top to bottom, depth first. A parent's own style sits just below
its last child.**

- Whatever is higher on screen always wins, so position and paint cannot disagree.
- Groups overlap freely. A node in two rows takes each property from the higher row. The lower
  row's Style tab says so in its paint-order line: "9 of 40 members show Watchlist's color"
  (the name selects Watchlist). Reordering is dragging in the tree (section 5.1); the version 1
  "Move above" button in the body is removed, because the inspector holds no verbs.
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
- **Eye on Everything**: hiding it switches off graphty-element's own default layers, leaving
  only what other rows paint. Nodes no row paints are then drawn however the element draws an
  unstyled node (version 2 removes the app-invented "faint outlines"). **Needs graphty-element**:
  the default layers are locked today and the `addDefaultStyle` flag is parsed but never read, so
  this eye is drawn with that mark. A line under the tree reads "Everything is hidden. Unpainted
  nodes still take part in the layout. To leave them out, filter." with a Filter... link that
  opens Data > Filters (owner).
- **Hide from list** (row menu): removes the row from the list only. Its paint is unchanged,
  which the menu item says: "Hide from list (keeps painting)". **Show hidden** in the list menu
  shows hidden-from-list rows dimmed and italic, with Unhide.
- **Hide on canvas** (a verb on elements, Mod+Shift+H) is different: it stops drawing chosen
  elements. Hidden elements are counted on the canvas's "not drawn" line with Show hidden
  elements (the same command as Edit > Show hidden elements, same label).
  **Needs graphty-element:** the element has no draw-only hide. Filtering
  (`visibility.set`) changes what is computed, which Hide must not; no style property makes a
  node invisible, and node opacity 0 would leave its edges drawn, while hiding them too would
  need the app to look up neighbors (forbidden). The element needs a `visible` style property
  (or a hidden set it honors) that also hides incident edges; hidden elements would then be the
  Overrides row's property, visible and clearable like any other. Until then Hide on canvas and
  the "not drawn" count are drawn with the mark.

### 3.7 The built-in layers

- **Selection** is always the top row. It is not a style layer: it edits graphty-element's
  `selectionStyle`, whose only fields are **highlight color, scale and opacity**, so its Style
  tab shows exactly those three and has no "+" (version 2 removes outline width, the two-color
  bands and "Dim everything else", none of which the element draws; dimming what is not selected
  is a layer the reader adds). The value is saved with the project; Settings > Accessibility >
  "My selection look on this device" replaces it on one device with three values the person
  chooses (the app ships no high-contrast values of its own). Its eye can be turned off for
  screenshots. Its name is always "Selection"; its member count follows the selection and is
  empty when nothing is selected (skeleton review: a row that renames itself reads as two rows). Clicking the row selects the row itself (to style it), not the elements. **Needs
  graphty-element**: the default gold (#FFD700) on the default whitesmoke canvas measures about
  1.3:1, under the 3:1 of WCAG 1.4.11; the element's default must pass.
- **Notes** (version 2) starts directly under Selection and can be dragged like any row (3.4). It is a style layer that paints **only the
  nodes and edges that notes are about**; notes about a row or the whole graph paint nothing. Its
  Style tab is the same component as every row (section 16). **Its default look is
  graphty-element's, not the app's** (owner principle: styling is left to the user). Once the
  element produces its reserved notes layer, that layer ships a default the way its node and
  edge defaults do; the element issue proposes an outline (`node.outline`), because it collides
  with nothing, while a count badge would overwrite the node's one label slot until
  `node.marker` draws. Until then the row starts with nothing set, and its Paints line reads
  "Noted elements: 4 nodes. Not marked -- + to add a look". The user chooses an outline, a
  glow, a color, the note's first line as a label with a speech-bubble pointer, or nothing. Its eye is the only switch for note
  markers. **Needs graphty-element**: the element's reserved notes layer
  (`source: {by: 'element', reason: 'notes'}`, produced by nothing today), a drawable
  `node.marker`, and a pick event for labels. Until notes live in the element, the real app may
  paint this row with a temporary user layer selecting the noted ids, commented with its issue
  (the project rules allow a labeled temporary workaround); the app's HTML callouts are deleted,
  not kept beside it. Whether notes join the element's session API is **open for the owner**
  (a one-way door: public element API).
- **Everything** is always the bottom row. It **is graphty-element's own default layers** ("Node
  defaults" and "Edge defaults") shown as one row, because the owner decided that hiding it
  "shows only what other layers show"; a user layer stacked above the defaults could not do that.
  Its Style tab lists **every** style property, each with its effective value, all sections
  collapsed to their one-line summaries (section 16; owner question 1). The effective value of a
  property the defaults do not set comes from the descriptor's default, which graphty-element
  does not publish yet (section 19); the app never types the values in. Editing or hiding it **needs graphty-element** (the default layers are
  locked; `addDefaultStyle` is parsed and never read), so until then it is drawn with that mark;
  the app never copies the default values into a layer of its own. Its Data tab shows only what
  it covers ("77 nodes, 254 edges"); the graph overview lives only in the nothing-selected
  inspector. The **Look** (Default, Print) moves to the graph's **Canvas** section (skeleton
  review: it swaps every palette for the whole project, so it is project configuration, not a
  property of the base layer): the Print look keeps its grayscale check (owner decision), and
  both the shipped looks (element issue #331) and the grayscale check **need graphty-element**;
  the app's own lightness computation is removed. The canvas background is in the same section.
- **Overrides** holds one-off edits to single elements: changing a property through a node's or
  edge's "Why this look" writes here, never to the mesh. It appears just below Notes once it holds
  something, so a hand edit wins over every analysis row and is still a layer that can be hidden,
  cleared or saved. Studio decision: the conceptual model's Overrides layer needs a visible row,
  and the style-layer rule forbids any other route.
- **Collapse on canvas** (row menu of a group or set) draws the members as one node. It is paint
  state on that row, not a filter step; the row shows a collapsed glyph, and numbers still count
  every member (conceptual model 4.4). **Needs graphty-element (API review):** the element has
  no aggregate or collapsed-node drawing; drawing one node in place of many is rendering, which
  the app may not do. Drawn with the mark.

### 3.8 Folders and list organization

- **New folder** (list menu, or Mod+G on selected rows in the tree). Mod+G is one command,
  "group what is selected": selected rows make a folder, selected canvas elements make a set, and
  its menu label names the result. Folders nest one level only.
- The **list menu** holds: New folder, Show hidden rows, Rows with notes, Show kind (All, Runs,
  Groups and sets, Paths, Measures), Sort inside a run (paint order, size, name, date), Collapse
  all.
- A set collection loaded from a file arrives as one folded folder with its unmatched
  identifiers counted. Loading it is bringing data in, so its one home is Data > Sources "+" >
  Set collection... (section 7); the tree's list menu no longer has its own Load set collection...
  item. (Review, version 2: two homes for one load.)

### 3.8a Making and combining sets

- **Create set** (Mod+G on canvas elements, a group row's Keep as set) makes a set row on top.
- **Keep top N as set** on a measure row turns the top of a ranking into a set in one step.
- **Combine sets**: with two or more group, set or path rows selected, the row menu (which is
  also the several-rows inspector's "...") offers Union, Intersect, Subtract and Exclude; each makes a new set row
  on top and leaves its inputs as they are (top task 9).
- **Create rule set...** on an attribute, and on Find's menu, makes a set defined by a condition.
  It follows the data and says so in its row (a small rule mark) and its Provenance. It is still a
  set: it paints and never filters. To compute on it, use Filter to....

### 3.9 Hundreds of groups

A run row with many groups arrives collapsed (owner). Expanded, it lists groups by size with
their own colors for as many as the palette tells apart (about ten), then one "274 more groups"
row with a shared swatch. The run's own search field (appears when expanded past 20 children)
filters its children by name or member. **Show members in table** (the run's "..." menu) opens
the run's item tab in the dock. Recoloring or renaming a group edits a slot in the run's own layer; it never adds a
layer.

### 3.10 Selecting and renaming rows

Clicking a row selects it: the inspector shows that row and its members are marked in the table.
Outlining its members on the canvas **needs graphty-element** (the element's hover layer taking a
set of elements, section 19); until then nothing is drawn, because an app-drawn outline would be
styling outside the layer system. Shift-click and Mod-click select several rows. Arrow keys move, Left and
Right collapse and expand, Space toggles the eye, Enter opens the inspector, Shift+F10 the row
menu. Selecting a row never moves keyboard focus into the inspector.

**Rename (owner: a double-click, like Figma, without a right-click):**

- Double-clicking the row's **name** turns it into a text field with the text selected (the first
  click has already selected the row in place: the tree is not redrawn, so the second click lands
  on the same row at normal double-click speed). Nothing is drawn above the tree while a rename
  runs; the field's tooltip and the announcement carry "Enter saves, Tab next, Esc cancels".
- Enter or clicking away saves; Esc cancels; an empty name restores the old one. **Tab** saves and
  moves to renaming the next row, **Shift+Tab** the previous, each announced ("Renaming Community
  4"); Esc ends the chain and returns focus to that row. Each rename is one undo step. After it,
  focus is on the row and a polite announcement says "Renamed to X".
- **F2** renames the focused row. Figma's Cmd+R is not used: Ctrl+R reloads a browser tab.
- Double-clicking the eye, disclosure arrow, swatch, count or note badge does what a click there
  does.
- Touch: double-tap renames; long-press opens the row menu.
- Duplicate names are allowed; names are labels and the element keys rows by id.
- Right-click > Rename stays as a door to the same command (shown with its F2 hint).
- Selection, Notes, Overrides and Everything keep their names: double-click does nothing, F2
  announces "Built-in rows keep their names".
- The same gesture renames the project name, graphs in the switcher, folders and sets (a
  Combine result is a set). Saved views, runs and attributes take it once graphty-element can
  rename them (table below). A measure row's name is its legend title (the legend block
  carries the layer id and the app reads the name), so the separate Legend label field is removed.

What a rename writes, and what needs graphty-element:

| Row | Element call | Status |
|---|---|---|
| Group, measure or other style-layer row | `styles.update(id, {name})` | exists |
| Set, kept path | `sets.rename(id, name)` | exists |
| Run | none (`label` is read-only) | needs graphty-element; rename drawn disabled with the reason |
| One group of a run ("Community 3") | none; groups renumber on rerun | needs graphty-element (a per-group label tied to a stable identity); double-click shows a notice with one action, **Keep as set**, and the name is not edited |
| Attribute | none | needs graphty-element (a display name); drawn disabled |
| Saved view | none (no rename or remove for a camera preset) | needs graphty-element; drawn disabled |
| Folder, project, graph; the order of saved views | app state | works |

The app keeps no name table of its own for any element object.

Framework consequence to record: the conceptual model says definitions are never selected.
The owner's refined B makes a paint row selectable so its inspector can style it; the model
gains "one tree row" as a selection kind.

### 3.11 Empty and first states

- Before any run or set: Selection, Notes, a prompt row "Analyze to add results here" (opens the
  Analyze popover), and Everything.
- A **queued** row (the element's run queue) shows "Queued, 2nd" in place of the progress bar. A
  run the element reports as not cancellable shows its progress with no Cancel and the tooltip
  "This step cannot be stopped".
- A running row shows progress. A failed run stays as a row with an error icon and the
  element's message. A GPU run that fails is never quietly finished on the CPU. **The status
  line under a row is text only** (skeleton review, accessibility and owner question 11): Cancel,
  Retry, Remove, Rerun, "Rerun on 60" and Unhide are in the row's menu and, for a run, in the
  inspector's state bar. The row's accessible name carries its state ("Betweenness, running").
- **A row hidden from the list that still paints** is counted in one line at the foot of the
  tree ("1 hidden row still paints. Show hidden rows"), so every paint on the canvas has a row
  the reader can find (section 16.5).
- The tree is one Tab stop (roving focus: the selected row); arrows, Home and End move; Left
  from a child goes to its parent; Alt+Space solos the focused row's eye.

---

## 4. The rail

Top to bottom: **Main menu**, **Graph** (the tree, the default), **Data**, **Views**, **Notes**,
**Assistant**. Rail places have no hotkeys; Quick actions reaches each by name.

| Place | Question it answers | Contents |
|---|---|---|
| Graph | What paints the graph, and in what order? | Graphs switcher, the tree |
| Data | What is the data, how is it read, and what is it computed on? | "Data: <graph name>": Sources, Filters, Attributes, Versions, Sent and saved |
| Views | What have I framed, and in what order will I show it? | saved views, Present, tours |
| Notes | What has been written, and about what? | every note, newest first |
| Assistant | What can I ask? | conversations |

Results and Algorithms places are retired: runs are tree rows (owner) and the catalog is the
Analyze popover (section 2.2). The information architecture's clause that "Graph and Results
never leave" the rail is superseded and must be recorded as a framework change.

**Views returns (studio decision, version 2, from the owner's "maybe we should bring back views
or present or export to the nav rail?").** A rail button names a collection, never an activity.
Saved views are a collection: named, ordered, and each is the input to an image, a video tour or a
presentation. A view belongs to the project and can span graphs (conceptual model 5.3), so it
does not belong in one graph's paint tree, where it sat folded and unfound. Views sits after Data
(a view is made from the graph and its data) and before Notes (notes can cite views). Present and
Export are activities and get no rail button.

### 4.1 The Views place

- **Built-in views are not listed here (API review).** Fit, Front, Side, Top, Isometric and
  plugin views (graphty-element's camera catalog, `camerasForMode`) are camera commands with
  keys, and their one home is the Camera menu (section 9). Listing them here too made two lists
  of the same jumps. The Views place holds only what the user made. A built-in angle becomes a
  saved view by jumping to it and pressing Save view.
- **Saved views**, in an order the user drags. That one order is the findings report's page
  order, the presentation order and the tour order. Each row: a thumbnail (the element's
  thumbnail capture from that view's camera, taken on save and on update, never live), the name,
  and an **In tour** checkbox (not an eye: an eye means paint). Whether the camera has left the
  current view is shown once, on the Camera menu's face.
- **Header:** **Save view** (the element's `saveCameraPreset`) and **Present**, each a labeled
  button (Present is the owner's named ask, so never an unlabeled icon); **Record tour...** is in
  the header's "..." menu.
- **Row menu:** Update to current camera (works today: saving under the same name overwrites),
  Export image of this view... and Record video from this view... (doors to the Export dialog
  with the view filled in), **Rename** and **Delete** (drawn, "needs graphty-element": the
  element has no remove or rename for a camera preset, and adding a preset under a used name is
  skipped). Rename is a double-click once the element supports it.
- **Order** and **In tour** are held by the app as a labeled temporary workaround, drawn with the
  "needs graphty-element" mark: `exportCameraPresets` returns an unordered record with no tour
  membership, and an ordered preset collection is filed (section 19), because a third party
  building a report order needs the same thing. A saved view may not reuse a built-in view's
  name ("Top"); the element's check for that is filed too.
- **A view's inspector** (no tab strip) is read-only except its one property, the caption:
  its mode, the camera (read from the element), the thumbnail, the caption field, and what it
  keeps. Today a view keeps **the camera
  only**, and the inspector says so. The rest of what the conceptual model says a view captures
  -- which layers are on, filter steps, hidden elements, the Look, stored positions, the notes it
  shows -- is listed disabled with "needs graphty-element: a view snapshot". Assembling that
  snapshot in the app would be the forbidden workaround; the model does not shrink to fit today's
  element.
- **Present** is a full-canvas mode: arrow keys step through the saved views in order, Esc
  leaves. A **Lock the canvas** switch (the element's `setInputEnabled(false)`) is off by default,
  because an audience asks to turn the graph around, and it is remembered per project.
- **Record tour...** opens Export > Video with "Tour" chosen and the checked views as the camera
  path in list order. Per-stop durations are set there. Disabled in 2D with the reason until the
  element accepts 2D waypoints (a waypoint is a 3D position and target; to be confirmed and filed).
- Views and presets travel in the project file through the element's
  `exportCameraPresets` / `importCameraPresets`.

---

## 5. The inspector (right panel)

**Studio decision (version 2, from the owner's "we need common interaction patterns for the
right sidebars"): one frame for every kind of selected thing, and one rule for what it holds.**

**The rule: the right side shows the properties of the selected thing, read and edited in place.
It holds no verbs.** The earlier "the right side is for reading" was too strict: a style is a
property and must be editable where it is read. The line is between a property and a verb.
Figma's Design panel and Blender's Properties editor draw it the same way; Gephi's layout panel,
whose parameters do nothing until you remember Run, is the counter-example. The recorded
exception "the graph's Layout row carries Run" (`figma-crosswalk.md`) is deleted.

### 5.1 The frame

1. **Header, two lines, on every kind.** Line 1 (24 px): type icon and name; double-click or F2
   renames (section 3.10); the name takes focus. A status sentence ("Finished: 6 communities...")
   opens the body, never a third header line, so the tab strip sits at the same height for
   every kind. Line 2 (20 px): the kind word, a provenance link ("from Louvain, Sep 28") and **"..."**.
   The "..." menu is word for word the object's right-click menu: one verb list per kind, reached
   two ways (Shift+F10 or the context-menu key from the keyboard). No eye in the header:
   visibility's one home is the tree.
2. **The state bar**, only when the thing's properties changed and need a costly commit: one
   line directly under the header, visible on both tabs. For a run: "Settings changed since the
   run -- Rerun | Run as copy | Revert" (Mod+Enter reruns, Esc reverts); the header shows a small changed mark.
   The graph has no state bar at rest (skeleton review 2): readings not yet computed read "Not
   computed" as plain text, and Compute the overview is in the graph's "..." and Quick actions.
   Its bar appears only when a filter changed the scope under computed readings ("4 readings
   are for all 77 nodes -- Compute on 60"). It is the **only button in any body**. **Changing a
   setting in a body is editing a property, not running a verb**: a layout method or option,
   like a style value, applies at once (the element's `setLayout`); Re-run layout is a verb and
   lives on the layout chip and the canvas menu.
3. **Tabs: Style, then Data**, 32 px. A kind with one body -- nothing to paint (Data only), or the Selection and Everything rows (Style only) -- has
   **no tab strip**, and its
   body starts at the height the tab bodies start, so nothing moves. The tab last chosen stays
   chosen as the selection changes; a kind without it shows its only body and leaves the choice
   alone.
4. **Style tab** (section 16): a **Paints** line saying in plain words what the layer's selector
   covers, with a count link ("Members of Community 3: 25 nodes, 44 edges"); the generated
   property sections; a **paint-order** line ("Covered by PageRank for color") that selects the
   covering row. Reordering happens only by dragging in the tree.
5. **Data tab, always in this order, any empty section left out:**
   - **Summary**: readings (three to six key/value rows); never editable fields.
   - **Members** or **Values**: distribution, the top 10 (ties kept whole, as the element's
     `top()` returns them); the count is a link.
   - **Made with**: settings and provenance merged, so scope, data version, direction, weight
     meaning, seed, precision (GPU single, CPU double) and engine versions appear once. Editable
     only on runs and layout, generated from the element's option schema (an attribute's "Read
     as" is its own editable section, below); editing a run option raises the
     state bar.
   - **Notes**: a count and "Open in Notes". The ten "+ Add note" buttons of version 1 go; adding
     a note stays on N, the selection bar and the context menu.
6. **Counts are links that select what they count** (the Figma crosswalk's rule); the table
   follows the selection when it is open. Every "Show in table" and "Select members" button in a
   body is removed; both are in the "..." menu.
7. **Density**: rows 24 px, section headers 32 px, 16 px inset, at most two levels of disclosure,
   section open or closed remembered per kind in this browser, swatches with a 1 px theme border.

### 5.2 Kinds

What differs by kind is only what fills a property's value and which Data sections exist:

| Selection | Tabs | Style: how a value is filled | Data sections |
|---|---|---|---|
| **Nothing** (the graph) | Style, Data | **Canvas**, then **Layout**: how the graph is drawn and arranged | Overview; Statistics; Made with; Notes (5.3) |
| **One node** | Style, Data | **Why this look** (5.4); editing a value writes to Overrides | Summary (attributes, results with rank), Memberships, Neighbors (a count link), Notes |
| **One edge** (opened from the table, a row, or Tab through a node's edges; graphty-element cannot pick edges on the canvas) | Style, Data | Why this look | Summary (attributes, weight, results), Memberships, Notes |
| **Several elements** | Style, Data | Why this look with coverage ("Louvain: color, 14 of 20") | Summary (count, induced and cut edges from the element's selection statistics, shared attributes), Memberships, Notes |
| **Group, set, path row** | Style, Data | fixed values | Summary (size, density, share of graph), Members (top 10 by the run's ranking, or by degree within the group), Made with ("Created from Louvain, Sep 28", scope, data version), Notes |
| **Measure row** | Style, Data | the bound property: scale, domain, range, palette, clamp, reverse, "no value" (default: nothing, so rows beneath show through) | Values (histogram; brushing selects), top 10, Made with (and the attribute it writes), Notes |
| **Run row** | Style, Data | the shared component with Fill color bound to the run's groups; the binding block under that line holds the palette the children share, per-child exceptions, overflow ("other", shape, extend) and, for a hierarchy, the Level | Summary (readings: modularity, number of groups, edges within and between groups, pair lists), Sizes (a size distribution: every group is already a child row in the tree beside it; the top-items list only when there are more groups than child rows), Made with (every option, Rerun through the state bar), Notes. Earlier results, Check, Compare are in "..." |
| **Readings-only run** | none | -- | Summary, Made with, Notes |
| **Selection row** | none (one body: Style) | the element's three highlight fields, drawn as Style tab lines without bind or "-" | -- |
| **Notes row** | Style, Data | fixed values (none until graphty-element ships a notes default) | Summary (noted elements), Notes |
| **Everything row** | none (one body: Style) | every property with the element's defaults, sections collapsed to name-and-value summaries of what is not none or off; no "+" | -- (its Paints line says what it covers) |
| **Overrides row** | Style, Data | fixed values per element | Members |
| **Folder** | none (one body) | -- | its rows' swatches and counts, Notes |
| **Several rows** | Style, Data | shared properties, or "Mixed" | Summary side by side (Combine and Compare are in "...") |
| **Attribute** (from Data) | none (one body) | -- | **Read as** (level and role; editable here; what a weight means is chosen per run, not here; the level icon in Data and Change level in the menu are doors; an ordinal level and a type override need graphty-element), Summary (origin, completeness), Values (distribution, distinct values), the rows that paint from it (links) |
| **Filter step** (from Data) | none (one body) | -- | the step's editor: attribute, condition, count before and after, Notes |
| **Saved view** (from Views) | none (one body) | -- | section 4.1 |

The verbs that left the bodies (Keep as set, Keep top N as set, Compare with..., Check, Restore
an earlier result, Run again as copy, Lay out members, Analyze these
members, Combine, Show in table, Select members, Delete) are in each kind's "..." menu, which is
its context menu (section 10.3).

### 5.3 Nothing selected: the graph's inspector

**Studio decision (skeleton review 2): the same frame as every kind.** The Style tab holds
**Canvas** and **Layout** (how the graph is drawn and arranged, both settings); the Data tab holds
**Overview**, **Statistics**, **Made with** and **Notes**. Version 2 drew six sections with no
tabs, the settings below about thirty read-only lines, and the Canvas section was the only styling
outside a Style tab.

- **Overview**: nodes, edges, direction (with where it was settled: the file, or "as loaded"),
  density, components and isolates, self-loops, repeated edges and the degree distribution. The
  source appears once, as the header's "From <file>" link (skeleton review: the weight attribute,
  the attribute count and the Last import row were second homes of Data > Attributes and Data >
  Sources). Readings not yet computed read "Not computed"; Compute the overview is in the
  graph's "..." and Quick actions, never a button at rest (section 5.1). Clustering, transitivity, diameter and assortativity are filed as part of the
  element's `data.statistics()` (section 19); the overview still adds no rows (section 3.2).
- **Made with**: the overview recipe's name as a field (the recipe maps to graphty-element's
  algorithms-on-load, so it runs when the project opens); a setting, so not in the read-only
  Overview.
- **Statistics**: the readings no run owns (the overview recipe's), and one link line per run
  ("Louvain: 2 readings") that selects the run's row. A run's modularity and group count live on
  its row only: a second place showing the same value is a defect (section 17). The "modularity
  of a grouping" reading is gone (section 2.2).
- **Layout**: method (the element's layout catalog, each with its size rating and whether it
  honors weights, and a "Recommended" mark from the element's `recommendLayout`), its options (generated), scope, seed (an editable field; Reshuffle
  layout seed is in the graph's "..." menu, since a body holds no verbs), pinned nodes (a count link that selects them; Unpin all is in "..."), and **Advanced**:
  pre-steps, steps per frame, stop threshold, refit interval, and for GPU layouts iterations per
  step and batches in flight (all six of the element's `layoutBehavior.layout` fields; version 2
  listed four). Changing a property lays the graph
  out again at once, as the element's `setLayout` does. When the element's own estimate says the
  change will block the frame (`session.estimate(...).blocksFrame`), a small confirmation
  anchored to the field asks first; the app computes nothing itself. **Needs graphty-element**:
  saving and restoring positions as a document, without which a method change cannot be undone.
- **Canvas** (element configuration, labeled "not a layer"): the project's **Look** (Default,
  Print; section 3.7); **Filtered-out nodes** drawn faintly or not (the element's
  `visibility.showContext`, a public get and set; moved from Data > Filters: filters change the
  data, and how removed nodes are drawn is drawing);
  background, a color or a 360-degree
  skybox image (the element's `background`); **Hide overlapping labels** (the element's label
  declutter, replacing the "up to N names in view" budget); **Reframe when data changes** (on by
  default; off sets the element's starting camera distance, so a composed figure is not reframed
  by a reload). Figma shows page color in the same place: the panel when nothing is selected.
- **Notes** about the graph: a count and Open in Notes.
- "..." is the empty canvas's right-click menu, word for word (section 10.3).

### 5.4 "Why this look" (version 2)

Owner's review: "has a lot of layers and uses a lot of real estate. maybe it should just list the
active layers". Studio decision: yes.

```
[ramp]   PageRank     color
[gray]   Degree       size
[scan]   Selection    highlight
[square] Everything   shape
3 more rows match but are covered   (open)
```

- One line per layer that wins at least one property on this element, highest first: a 12 px
  swatch or ramp, the layer's name (a link that selects the row), and a token per property it
  wins.
- Layers that match but win nothing collapse into one closed line. Layers whose eye is off are
  not listed.
- Clicking a property token opens that value's popover anchored to the token; an edit writes to
  the Overrides row and the selection stays on the element. Hovering a token shows the resolved
  value ("#662506, 0.0754, highest").
- Several elements: the same list with coverage counts. **Needs graphty-element (API review):**
  `explain()` takes one node or one edge; counting coverage across twenty elements would be the
  app aggregating element answers. An `explain` over a set, returning coverage, is filed; until
  then the several-elements list is drawn with the mark.
- The list comes whole from graphty-element's `session.styles.explain()`; the app computes
  nothing. It covers every property a layer painted, not six hand-picked ones. The Selection
  line is the one exception: selection is not a style layer, so `explain()` does not report it;
  the line is read from the element's selection state and `selectionStyle`, and appears only
  while the element is selected. `selectionStyle` (color, scale, opacity) applies to nodes only, so an
  edge's list never has a Selection line. The list has one heading, "Why this look", on every
  kind; layer names read as text and underline on hover.
- Element-owned layers the tree does not show (the element's hover layer) appear in the list
  when they win a property, marked with a lock and not selectable.
- Hovering a layer line does not outline its members on the canvas unless graphty-element's
  hover layer can take a set of elements (filed); the app painting an outline would be styling
  outside the layer system.

Precedents: the Computed pane in browser developer tools; Figma's Selection colors. Grouped by
layer rather than by property because it grows with the number of layers painting the element
(two to five), not the number of properties (up to 35).

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
| Members | never more than the top 10; the count is a link that selects them all | all members, sortable and filterable |
| Editing | the thing's own settings (a run's options in Made with, an attribute's Read as) | node cell values (the element's `updateNodes`); edge cells, New attribute... and Merge nodes are drawn "needs graphty-element" (no edge update, computed column or merge API) |
| Comparing | one thing against another by Compare with... | many things by sorting a column |

- The dock's own toggle is the table's home (Shift+T is a door); the time slider's home is the
  dock's options menu (T is a door). Version 2 removes both from the main menu.
- Deleting nodes from the data (the element's `removeNodes`) is a verb in the node and
  several-elements context menus and the table's row menu, distinct from Hide on canvas.
- "Show members in table" (a row's "..." menu) sets the table's Nodes tab to that row's members, with a chip
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

The header reads **"Data: <graph name>"** (version 2): filters, attributes and sources belong to
one graph, and with two graphs in a project an unnamed panel is ambiguous.

1. **Sources** (compact). **The one home for bringing data into this graph** (version 2).
   - One line per load: "transfers-march.csv, 3,000 nodes, 9,113 edges, directed, read Sep 28".
     The counts are the ones the element reported when that load finished (its
     `data-loading-complete` report, kept per source and labeled "at load"), never counts that
     imply the element knows each source's share of today's graph. A paired node file sits
     nested under its edge file. A URL source shows when it was read and its fingerprint; on
     reopen, a changed fingerprint reads "The data at this address changed since you last opened
     it".
   - **Header "+" menu:** File... (one file, or a node file and an edge file together, which the
     element loads as one paired load), From a URL..., Paste..., **Set collection...** (lands as a
     folder of set rows in the tree), and **Table matched by key...**
     ("needs graphty-element": the element has no join; joining in the app is forbidden).
   - **Header menu:** Clear graph data... (the element's `clearData`; the confirmation says it
     clears every source). There is no per-source Remove until the element records which source
     each record came from ("needs graphty-element").
   - **Row menu:** Replace data... (a file source) or Refresh (a URL source) -- both the element's
     atomic replace, which leaves the graph untouched if the new data fails, keeping the column
     settings; Re-map columns...; Show import report (the report stored at load time). "Update
     with new data", "Add a table..." and "Join..." as separate items are gone: the element only
     adds or replaces, and a node table is part of the paired load.
   - **No extract or live toggle.** The project always keeps a copy of each source (its bytes or
     its URL, plus the read options) and replays the same load on open; that is app persistence
     of the user's file, not graph logic. Live connections (databases, Neo4j) need
     graphty-element and are not drawn.
   - **After a Replace**, rows whose values came from the old data show "out of date" (section
     3.3). What a replacing load does to runs and the layers bound to them is undefined in the
     element today ("needs graphty-element"); the skeleton draws the state.
   - **A derived graph** (from New graph from) has no "+" menu; its Sources section shows one
     read-only origin line, "Derived from Transfers: bipartite projection on kind, Sep 28".
   - Declared graph properties sit on the source line (directed, repeated edges kept).
2. **Filters.** The ordered filter steps in evaluation order, each with a checkbox, its outcome
   ("amount >= 1,000: 3,000 to 812 nodes"), a menu and drag to reorder. The caption says once:
   "Filters change what is computed and laid out. To stop drawing something, use the eye in the
   Graph tree." Add filter step... at the foot offers the step kinds top task 6 names: by an
   attribute or a computed value, a weight threshold, the largest component, a k-core, and to
   the neighbors of a selection. The steps are one "all" rule tree to graphty-element (switched-off
   steps left out), and each step's count comes from the element's `plan()` on the steps above
   it; that is building the element's documented input, not working around it. OR and NOT
   between steps need graphty-element. The header's filter chip ("Full graph", "2 filter
   steps") stays visible from every place and opens this section. After undoing a step, the
   one-line notice names it (owner). How filtered-out nodes are drawn (faintly or not, the
   element's `visibility.showContext`, off by default) is a drawing setting, in the graph's
   Canvas section (5.3).
3. **Attributes**, in two groups, **Nodes** and **Edges**. Inside each, subheads by origin: From
   runs (first, because they change most), From the node file (the paired node file of the same
   load; a join by key needs graphty-element), From the file, Expression. Each row: level
   icon, name, role badge (weight, label, node type, time, position; see Roles below), a small distribution sparkline, a paint dot when a tree row paints from it
   (clicking the dot selects that row), and a run result's scope mark ("on 3,000 nodes; now
   812") or out-of-date mark, as on its tree row (section 3.3). A search field appears past one screen. **New attribute...** at the foot.
   - Clicking a row opens it in the inspector (Data tab only).
   - The level icon and role badge are marks here. Clicking either opens the attribute's
     inspector at **Read as**, the one home where level and role change (the list, the
     inspector and the menu's Change level and Declare role... were three places editing one
     value; the menu items are now doors to Read as). A role that is an element read setting
     -- label, weight, time, position -- writes the element's `nodeLabelPath`,
     `edgeWeightPath` and the like at once, with no reload. Node ids and edge endpoints need a
     reload, so they change only through the source row's Re-map columns.... Changing a level
     (integer community ids read as `#` becoming `Abc`) is the "read
     as" override below, so the click is drawn with "needs graphty-element" until it lands.
   - **Roles (API review).** The weight role and the label role are graphty-element settings
     (`edgeWeightPath`, `nodeLabelPath`); the load dialog sets them first, and afterwards their
     one home is the attribute's Read as section (Declare role... in its menu is the door).
     What a weight means is **not** a graph-wide element setting: the element reads it per run
     (`caveats.weight.meaning`: distance or strength). So the role badge shows only "weight";
     the meaning is chosen in the Analyze popover and shown in each run's Made with. A graph-wide
     weight meaning, and "capacity" as a meaning, need graphty-element and are drawn with the mark.
   - A run's result attribute reads its scope in its second line: "from PageRank, on 812 nodes,
     March data".
   - Layout coordinates and imported positions are attributes with the position role.
   - The list, types, completeness, ranges and samples come from the element's
     `session.data.attributes()`. **Needs graphty-element:** an ordinal level and a "read as"
     override (the element's attribute type has neither), a display name (rename), and computed
     columns (New attribute...). These are drawn with that mark.
4. **Versions** (folded). Data versions newest first, current marked. Each opens Version history.
   Beyond a list of the element's fingerprints, versions and "what changed" **need
   graphty-element** (it keeps no history and computes no diff).
5. **Sent and saved** (folded). Every export and send: what, when, where, what was masked. The
   telemetry state is shown here too: "Usage data: off" or "Usage data: on, graph content
   masked", with a link to change it in Settings.

Applied recipes move to Version history, where the operation log already is.

Graph-level readings (density, modularity) are not attributes; they stay on the run's Data tab
and in the nothing-selected Statistics. Group-level values (a community's size and density) stay
on the group row and the item tab.

---

## 8. Notes place

- Every note, newest first. Each entry shows its text, author (only when the project has more
  than one), time, targets as chips, and citations.
- Filter: All notes, About the selection, About this graph. A search field (Find over notes).
- Header: Add note. (Version 2 removes the Note markers eye here: the Notes row's eye in the tree
  is the one switch, section 3.7.)
- Clicking a note selects its targets: target rows scroll into view with a focus outline (never
  paint), and the camera flies to element targets.
- Notes about elements removed by a filter step are listed under "About elements not in this
  filter step", never dropped.
- Writing: Add note from the selection bar, a context menu or "..." menu, or N. (Version 2
  removes the "+" from the inspectors' Notes sections; each shows a count and Open in Notes.) The new note's targets are whatever is selected, rows or
  elements; with nothing selected, the graph. Mod+Enter saves, Esc cancels.

---

## 9. Header, canvas, cameras, views and modes

**Header** (above the left panel and canvas):

- Top left: the **project name** with its menu (section 10.2). Double-click renames it.
- Undo and redo buttons.
- The **privacy line**: "Local only" or "Usage data on, content masked".
- The **filter chip**.
- Top right of the canvas: the **Camera menu** and, while a live layout runs, the **layout
  chip**. There is no Export button and no avatar in the top right.

**The Camera menu (version 2; replaces the zoom-and-view menu).** Owner's review: "maybe camera
management is already at the bottom of the graph and it's just not explained well?" -- yes: the
chip read "100%", and "100%" has no graphty-element source in 3D (the element has a camera
distance there, not a zoom percentage).

- **The face**: a camera icon and the current view's name ("Front" after load, a saved view's
  name, or "Unsaved view"; never "Fit", which is a command inside the menu), named "Camera
  menu, <view>" for a screen reader,
  with "moved" in secondary text once the reader navigates ("Front, moved"), driven by the
  element's `camera-state-changed` event. In 2D a zoom percentage follows in secondary text,
  read from the element's 2D zoom. Same 32 px height, icon-then-label order and caret as the
  toolbar.
- **The menu, top to bottom:** Fit (0) (the element's `zoomToFit`); Frame selection (F) -- also
  frames a selected row's members through the element's camera-view scope option; Reset
  (Shift+0); in 2D, Zoom in and Zoom out (the element's `setCameraZoom`; the hints show the
  element's own = and - canvas keys, and the app binds neither, or a focused canvas would zoom
  twice); the **built-in views** read from the element's camera catalog for the current mode
  (Front 1, Side 3, Top 7, Isometric, plugin views) -- this menu is their one home. **In 2D the
  menu lists no built-in views** (studio decision, skeleton review 2: 2D looks straight at the
  plane, so Front, Side and Top do nothing useful; Fit and zoom cover it). Save camera view...
  (a door to the Views place's Save view; the new view lands there with a toast linking to it);
  and the **saved views as a jump list**, names only, in the Views place's order, read from the
  one list every door reads. **A saved view keeps its view mode** (studio decision): in 2D, a 3D
  view says "Switches to 3D" and jumping to it switches.
- **The jump list is a door, not a second home** (section 17's rule for lists): like Open
  recent, it names the objects it acts on and never shows their state (no thumbnails, no In tour
  marks) or edits them (no rename, reorder or delete). What version 1's zoom menu lost
  was a second managed list; managing views is the Views place only.
- **No display toggles.** Labels and arrows are style properties; the legend closes from its own
  card; note markers are the Notes row's eye; the minimap is dropped.
- "Frame" also appears in the context menus of group, set and path rows.
- Rejected: an orientation gizmo in 3D (it needs no element change, but adds canvas clutter;
  deferred until after round 7).

**The layout chip (version 2).** While a live layout runs, a chip beside the Camera menu reads
"Laying out... Pause"; paused, "Paused -- Resume"; settled, it fades to "Settled" and then away.
It reads the element's `isRunning()` and the `graph-settled` event and pauses and resumes with
`setRunning`. It is visible whatever is selected, which is the point: a reader pauses the layout
because nodes slide under the node they are trying to click, and a node is selected then. It is
also where a still-camera video of the layout settling starts: Resume, then Record. Quick actions
lists Pause layout and Resume layout as doors.

**Modes:** 2D and 3D are the graph's view mode, set only from the toolbar's View mode (section
2.3); the project reopens in the mode it was saved in. VR and AR are sessions entered from the
same flyout; a state covers a session that ended unexpectedly (the element's session events).
Version history, the comparison surface and Present are full-canvas modes with a back arrow.

**Canvas:** the drawing; one **legend** read from the element's `styles.legend()` (clicking an
entry selects the row that paints it; its own close button; when closed, a small Legend chip in
the canvas corner brings it back; L toggles); the "not drawn" line; and the state cards:

- loading, with progress by records from the element's progress events;
- empty (its buttons are doors to Data > Sources);
- **load refused: too large** (version 2): the element refuses a load past its drawing limits
  (50,000 nodes, 100,000 edges) and holds nothing, so the card says the load was refused and
  offers "Filter at import..." (needs graphty-element). Version 1's "loaded but not drawn" state
  contradicted the element and is removed;
- **less detail above 10,000 nodes** (the element's large-graph threshold): a one-line notice;
- waiting for the layout to settle (before an export);
- **selection is full** (the element's 5,000-element selection cap): a one-line notice naming
  the cap;
- GPU lost, with the element's reason.

The app's HTML note markers are removed (section 3.7).

---

## 10. Menus

Every menu item is drawn from one command record, so its label, key and disabled reason match
every other door to the same command (section 17).

### 10.1 Main menu (rail, top)

Version 2 keeps only what has no other home; Quick actions is the complete index of commands.

**The rule between the two top-left menus (studio decision, skeleton review 2): the main menu
is the app; the project-name menu is this project.** Version 2 split project commands across
both (Save in File, Export in both).

- **File**: New project, Open... (Mod+O), Open recent, Apply recipe or style file... (opens the apply dialog, which asks "on top" or "replace"; the
  element's `applyTemplate` reports layers it cannot bind)
- **Edit**: Undo, Redo, Select all visible (Mod+A), Invert selection (I), Previous selection,
  Select same value, Select where..., Select by ids..., Select edges between, Copy ids, Show
  hidden elements
- **Settings...** (Mod+,)
- **Help**: Keyboard shortcuts (?), Documentation, Report a problem, About

Removed in version 2, each with its one home: the **View** submenu (view mode: the toolbar; table
and time slider: the dock; Toggle panels: Mod+B and Quick actions; display toggles: rows, the
legend card, the Notes row); the **Analyze** submenu (the toolbar's Analyze; Re-run layout: the
canvas context menu; New graph from: the Graphs switcher); the **Recipes** submenu (saving a
recipe or a style: Export dialog formats; applying: File > Apply recipe or style file...; Use as
overview: the graph overview's recipe); File > Add data and Paste data (Data > Sources); Edit >
Undo history (renamed Version history, in the project-name menu); Edit > Create set, Filter to
neighbors and Hide on canvas (the selection bar is their home; context menus and keys are doors);
Edit > Show all, split into Show hidden elements (here) and Show hidden rows (the tree's list
menu).

### 10.2 Project-name menu (top left)

Rename (a door to the double-click), Save (Mod+S), Save as... (Mod+Shift+S), Export... (owner;
Mod+E), Version history, Show file location, Close. Duplicate is removed (review, version 2): it made the same copy as File > Save as.... Version 2
removes Author... (the name is in Settings).

### 10.3 Context menus (and the inspector's "...", which is the same list)

| Target | Items |
|---|---|
| A node | Neighborhood (G), Filter to neighbors, Path between (with another node selected) / Steps away, Analyze these..., Create set, Add to set..., Remove from set..., Frame, Pin position / Unpin, Hide on canvas, Remove from data..., Add note, Show in table |
| An edge (from the table or a row; edges cannot be picked on the canvas) | Select endpoints, Hide on canvas, Add note, Show in table |
| Several elements | Create set, Analyze these..., Neighborhood, Filter to neighbors, Lay out members..., Extract as graph (needs graphty-element), Frame, Pin / Unpin, Hide on canvas, Remove from data..., Add note, Show in table, Merge nodes... (needs graphty-element), Keep as path (when edges are selected) |
| The graph: the empty canvas's right-click and the nothing-selected "..." (one list) | Select all visible, Zoom to fit, Re-run layout, Pause layout / Resume layout, Unpin all, Compute the overview, Add node..., Paste data... (a door to Data > Sources, when the clipboard holds text), Add note |
| A group, set or path row | Rename (F2), Keep as set (run children), Select members, Show members in table, Frame, Analyze these members..., Lay out members..., Collapse on canvas, Compare with..., Combine with selected rows (Union, Intersect, Subtract, Exclude), Add note, Move to folder, Lock, Hide from list (keeps painting), Delete |
| A measure row | Rename (F2), Keep top N as set..., Select top N, Show in table, Filter to..., Compare with..., Add note, Lock, Hide from list, Delete |
| A run row | Rerun, Run again as copy, Restore an earlier result (needs graphty-element), Check (null model, stability across seeds; needs graphty-element), Restore the suggested look, Show members in table, Lay out by these groups (group runs), Compare with another run... (needs graphty-element), Add note, Lock, Hide from list, Delete (asks, naming how many style layers go with it, from the element's `runs.bindings`) |
| A folder | Rename (F2), Ungroup, Lock, Hide from list, Delete folder (keeps rows) |
| An attribute | Color by, Size by (Width by for edges), Show as groups, Place by (position attributes, through the element's `fixed` layout; any other attribute as
an axis, and longitude and latitude, need graphty-element and are drawn disabled), Filter to..., Create rule set..., Show in table, Change level... and Declare role... (doors to the inspector's Read as), Rename (needs graphty-element), Add note |
| A saved view | Update to current camera, Export image of this view..., Record video from this view..., Rename, Delete (both need graphty-element) |
| A note | Edit, Select targets, Copy link to note, Delete |

Rename's primary route is the double-click (section 3.10); the menu item is its door. No command
exists only in a context menu: Pin and Unpin also have the node's Summary (a pinned mark) and the
graph's Layout section (the pinned count), and Remove from data has the table's row menu.

## 11. First use

### 11.1 Start screen

Shown when no project is open. Left: Open..., New project, Drop a file anywhere, Paste data,
Open from URL... (version 2: "Connect to a data source..." opened the file loader and is renamed
to what graphty-element can do; connectors need the element). These are the empty state of Data >
Sources, not a second home: no project exists yet. Middle: Recent projects. Right: Samples (Les Miserables, Zachary's
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
is off. The choice can be changed in Settings and is shown in Data > Sent and saved and the
header's privacy line.

### 11.3 Loading a file (the load step)

Every data door -- the Sources "+" menu, a source row's Replace or Re-map, the start screen, a
drop, Ctrl+V with text on the clipboard, the empty-canvas card, Quick actions -- opens the one
load dialog. Version 2:

- **Its fields are generated from graphty-element's format catalog** (`FORMAT_DESCRIPTORS` and
  each format's `options`, with their plain names), never typed by hand: all seven formats (CSV
  and its extensions .tsv, .tab, .edges, .edgelist; GraphML; GEXF; GML; DOT; Pajek; JSON), the
  CSV shapes the element detects (edge list, node list, adjacency list, Neo4j, Gephi, Cytoscape,
  generic) and delimiters (comma, tab, semicolon, pipe), the JSON array paths (where the nodes and
  edges live) and dialects, and dynamic GEXF time data kept on each record.
- **How the graph is read**: node id column; **label column** (the element's node label path);
  source and target columns (auto-resolved, showing which spelling it found); **edge id column**
  (which also decides what counts as a repeat); weight column (the element's edge weight path; what a weight means -- distance or strength --
  is chosen per run, where the element records it, because a graph-wide meaning needs
  graphty-element; "capacity" is not an element meaning and is dropped); **position
  columns** and position scale, for files that carry coordinates; direction, including **"As the
  file says"** and the mixed outcome, with where it was settled; **repeated pairs**, all seven of
  the element's policies (keep, first, last, sum, min, max, error); id coercion (1 and "1" as one
  node or two); **Stop after N errors** (the element's error limit, default 100).
- **Format detection** shows the element's guess, and a state for several candidates and for
  none. A format the catalog knows but no reader serves (SIF, CX2) shows the element's reason.
- **Load into** (last step): **this graph (add)**, **replace this graph**, or **a new graph**.
  The first two are the element's `replace` flag (a replace is atomic); the third creates another
  element instance (one element holds one graph). The default follows the door (Sources "+":
  this graph; the start screen: a new project); a drop or Ctrl+V asks, as Gephi's import does.
- **Refusal and failure states**, one per typed element error, each worded with the element's
  details: empty file (E_EMPTY_LOAD); could not be read, with row numbers and the element's
  suggested fix (E_PARSE_FAILED, the error summary); unknown format (E_UNKNOWN_FORMAT); no
  endpoint columns found, naming the columns the file does have (E_EDGE_ENDPOINTS_UNRESOLVED);
  missing or duplicate ids; fetch failed after three tries (E_FETCH_FAILED); too large to draw,
  refused before the graph is touched (E_TOO_LARGE), offering "Filter at import..." (needs
  graphty-element).
- **One source at a time.** The element rejects a load that a newer load overtakes, so a second
  drop while the first reads is refused with "One source at a time: the first is still reading",
  and two CSVs dropped together are offered as the paired node and edge load. The app does not
  queue loads around the element (filed). Cancel on the loading card clears only what the element
  can clear today; a per-load cancel needs graphty-element.
- **After the load**, the import report is the element's report of what happened (which endpoint
  spelling it used, rejected records, what happened to repeats, where the weight came from, the
  load's duration, warnings and errors), stored per source and opened from the source row's Show
  import report and the overview's Last import row. It is not a pre-load preview.

Load lands on the Graph place with the tree holding Selection, Notes, the prompt row and
Everything, the canvas drawn in 3D, and the inspector showing the graph overview with the Last
import row.

---

## 12. Dialogs

### 12.1 Export (version 2)

The Export dialog is the **one home of every output**. Its doors: the project-name menu's
Export... (owner decision), File > Export..., and a row's, view's or table's menu with the target
filled in. Every export is recorded in Data > Sent and saved. It opens on **Image** (skeleton
review: it opened on Figure, which needs graphty-element); an output the element cannot write yet
is drawn disabled in the list with its mark, not only after it is picked. The line naming rows
whose eye is off is "Not drawn", never "Masked", which is the privacy word. The list on the left:

- **Image** (new; graphty-element's `captureScreenshot`):
  - format PNG, JPEG or WebP, with quality for the lossy two;
  - size as a multiplier (1x, 2x, 4x) or exact pixels with an aspect lock, and a **print-width
    helper** ("174 mm at 300 dpi" fills in the pixels; arithmetic on the reader's own numbers);
  - transparent background (PNG only; choosing it switches the format);
  - smooth edges (the element's quality enhancement);
  - the element's presets, labeled by what they produce so the capture preset is never confused
    with the project's Print look: "For print (PNG, 4x)", "To share (PNG, 2x, clipboard)",
    "Thumbnail (JPEG, 400 x 300)", "For documentation (PNG, 2x, transparent)" (studio decision);
  - **View**: the current camera or any built-in or saved view, captured without moving the
    reader's camera;
  - **Destination**: download, copy to clipboard, or both, with the element's reason when the
    clipboard refuses (permission denied, not a secure context, not supported);
  - sizes the element's pre-check refuses (`canCaptureScreenshot`) are disabled with its reason,
    and its warning and memory estimate replace the fixed "Under 1 MB";
  - a **"waiting for the layout to settle"** state with Cancel (the capture's settle option), and
    a failure state for each element error code (including the settle timeout);
  - the preview shows the canvas only, because the element draws no legend into an image.
- **Video** (new; `captureAnimation`):
  - **Still camera** (records what happens on screen, such as the layout settling) or **Tour**
    (flies through the checked saved views in list order, with a duration per stop and easing;
    disabled in 2D until confirmed);
  - format (automatic, WebM, MP4), frame rate, bitrate, size, transparent background;
  - **before recording**, the element's estimate; when it predicts dropped frames, the button
    reads "Record at 24 fps (recommended)" and the original settings are one click away;
  - **while recording**, progress and Cancel replace the dialog's buttons;
  - **after**, the frames captured and dropped, with "Record again at the recommended settings".
- **Figure (SVG now, PDF later)** -- owner decision. graphty-element produces raster images only
  today, so Figure is drawn with "needs graphty-element", and so is a legend drawn into an
  exported picture.
- **Findings report**: one self-contained HTML file (owner decision), its figures from the saved
  views in list order. Its methods text is written from the element's run records; a run-record
  methods writer belongs in the element (filed), with the element's plain-language `reading()` as
  today's building block.
- **Methods text** alone (same source). Both Findings report and Methods text are drawn with
  "needs graphty-element" until that writer exists: writing the text in the app would be the app
  describing the graph.
- **Project**: carries the sources' copies, the style stack, saved views
  (`exportCameraPresets`) and runs to replay. Restoring runs, sets and positions without
  recomputing needs graphty-element (a session document).
- **Recipe**: the same limit.
- **Style**: the element's `styles.toDocument()`, with any custom palettes it needs.
- **Data** (GraphML, GEXF, CSV, GML, DOT, Pajek, JSON): drawn disabled with "needs
  graphty-element": every format the element lists reports that it cannot export, and the app
  may not call graph-io itself.
- **Table as CSV**: each column header carries its value's scope. Turning results into rows is
  filed for the element; the app writes the CSV text from what the element returns.

Each output shows what it contains, the scope (filtered graph or full), what is masked, and a
size estimate. The dialog remembers the last choices per output; there are no export defaults in
Settings.

### 12.2 Apply recipe or style file

File > Apply recipe or style file..., or a dropped file: the binding step. It lists each attribute
the file needs with its level icon and the matching attribute in this data, mismatches confirmed,
never silently skipped; the runs and paint rows it will add; for a style file, **On top** or
**Replace my style** (replacing is today a removal plus an apply; an element option on
`applyTemplate` is filed); and where it fetches from, if anywhere, confirmed first. Layers that
cannot bind arrive switched off and are listed from the element's report. An **older (1.x)
style file** gets its own state: the element ignores its layers, and the dialog lists the
settings it carries (view mode, layout, id paths, background) with where each now lives. Applying adds the rows
on top of the tree, marked "from recipe <name>" in their Made with.

### 12.3 Settings (version 2; replaces Preferences)

Owner's review: "is the 'preferences' window the same as 'settings' in most apps? is it complete?"
Studio decision: the same thing, renamed **Settings** (Mod+, stays), because macOS since version
13, Windows, Chrome and VS Code say Settings. And it now holds **only what belongs to the person,
kept in this browser**. Anything the project carries lives on the object it configures (the
graph's Canvas and Layout sections, a row, a source), and anything that paints is a row.

One dialog, `aria-modal`, a section list down the left, real headings, each segmented control one
Tab stop with arrow keys inside it, and a labeled search field that announces its result count
("4 settings match"). Choice lists are read from graphty-element.

| Section | Settings |
|---|---|
| You | Your name, stamped on each note and recipe you write (owner: the author shows only when a project holds more than one). **Open for the owner:** the decision says "the project's author setting"; this reads it as a per-person name stamped per item, so one project can hold several authors |
| Privacy | Usage data (the owner's opt-in and text, unchanged), with a link to Data > Sent and saved |
| Appearance | Theme (the app's chrome; the canvas cannot follow it until graphty-element takes a color scheme); Number format (defaults to the system locale); Toolbar labels: Auto / Always / Never |
| Accessibility | Reduced motion: On / Off / System (reaches only the app's camera calls until graphty-element has a reduced-motion setting); **Single-key shortcuts: On / Off** (WCAG 2.1.4); **My selection look on this device**: off, or the Selection row's three fields with values the person chooses (the app ships no values of its own) |
| Canvas input | Pin a node when I drag it (the element's pin-on-drag, on by default) |
| Performance | GPU use: When available / Never / Required (the element's three acceleration policies, read from its list); Advanced: "Use the GPU from N nodes" (the element's threshold; blank uses its per-algorithm floors); a live status line from the element's capabilities -- probing, running on the GPU (device name), idle below the threshold, unavailable with the element's reason, or error; the element's limits, read-only and read from its exported `DEFAULT_LIMITS` (never typed): draws up to 50,000 nodes and 100,000 edges, less detail above 10,000, selections up to 5,000, sampled above 2,000 nodes where an algorithm allows |
| Assistant | Provider: OpenAI, Anthropic, Google, or "In this browser" (WebLLM, no key); model; a key per provider; Remember keys on this device (local or session storage); Forget all keys; voice input language. The one home for provider setup: the Assistant's no-provider state links here, and nothing links back |
| Headset | Always shown, with a status line ("No headset connected; these apply when one is"): hand tracking, controllers, near-touch, teleport, seated or room-scale (reference space), depth boost when dragging. The element's own Enter VR/AR buttons are always off; the toolbar is their home |
| Keyboard | Opens the shortcuts panel, which lists graphty-element's canvas keys first, marked not changeable |
| Projects | Default overview for new projects: the recipe a new project's overview uses. It is yours, not a project's, so it lives here; the graph overview's "Use for new projects" is a door |
| Diagnostics (collapsed) | Logging on or off, level, modules; detailed profiling; frame rate and frame time readout |

Left out on purpose: export defaults (the dialog remembers); the opening view mode (a project
reopens as saved); canvas background, label declutter, reframing (the graph's Canvas section);
runs on open (the overview recipe); layout pacing (the Layout section, Advanced); the selection
look (the Selection row).

Entry points: the main menu, Mod+,, the start-screen gear, Quick actions, and links that open a
named section ("Change in Settings"). The shortcuts panel's footer button is removed.

### 12.4 Others

- **Compare with...**: opens the comparison surface with the two things chosen. Agreement between
  two partitions, stability across seeds and a null-model test need graphty-element.
- **Keyboard shortcuts** (?): "Canvas (graphty-element)" first, then the app's keys grouped by
  region.

---

## 13. What the clickable skeleton shows

Built on Les Miserables, with the transfers data for Data and paths, so every label meets two
domains. The skeleton is layout, not function: states are switched by clicks, not computed.
Every "needs graphty-element" item is drawn disabled or marked with that phrase and the reason.

1. Start screen with the usage-data card and "Open from URL..."; the load dialog with a CSV, a
   JSON file, a URL, pasted text with several candidate formats, "Load into", and each refusal.
2. Graph place: Selection, Notes, a PageRank measure row (selected, painting), a Louvain run
   (collapsed and expanded), a path row, a folder, a row hidden from the list, Everything. Eye,
   solo, Everything hidden; **a row being renamed**, Tab moving to the next, the built-in tooltip.
3. The inspector frame for every kind in section 5.2, including the state bar, the compact "Why
   this look", and the graph's Canvas and Layout sections.
4. **The Style tab** (section 16): Everything collapsed to summaries; a group row with two
   properties set; the "+" menu open with search; a bound property expanded; the label-style
   popover; Nodes | Edges with counts.
5. Analyze popover generated from the element's catalog; a running row; a finished row.
6. Toolbar at rest (four controls), labels hidden, the selection bar with one node (Steps away)
   and two nodes (Path between), the pick mode armed, View mode with and without a headset.
7. The Camera menu in 2D and 3D, "moved"; the layout chip running, paused and settled.
8. **The Views place**: saved views with thumbnails and In tour, a view's
   read-only inspector with its disabled "keeps" lines, Present.
9. Data place on transfers: "Data: Transfers", the Sources "+" menu, a paired source, a URL source
   with Refresh, Filters with two steps, Attributes, Versions, Sent and saved; a derived graph's
   origin line.
10. Notes place; one note with two targets; the Notes row unmarked, then with an outline the user added.
11. Table dock with Nodes, Edges and "Communities: Louvain".
12. Main menu (File, Edit, Settings, Help), project-name menu, context menus.
13. Export with Image, Video (before, during, after recording) and the disabled Figure and Data;
    Apply recipe or style file; Settings with search.
14. Canvas states: load refused (too large), less detail, waiting to settle, GPU lost, legend
    closed with its chip.

Skeleton files this changes, in `../../app-b/sections/`: `inspector-selection-and-everything.js`,
`inspector-group-set-path-row.js`, `inspector-measure-row.js`, `inspector-run-row.js`,
`inspector-node.js`, `inspector-edge.js`, `inspector-several-elements.js`,
`inspector-several-rows.js`, `inspector-nothing-selected.js`, `inspector-folder.js`,
`inspector-attribute-and-filter-step.js` (one shared frame module replaces the per-kind layouts);
`graph-place.js` (Notes row, rename state, Views footer removed); `canvas-and-states.js` (HTML
markers removed, layout chip, refusal and less-detail states, legend chip); `camera-menu.js`
(was the zoom-and-view menu); `toolbar.js`; `selection-bar.js`; `path-tool.js`;
`commands-and-search.js` (keys, the element's key group); `main-menu.js`; `project-menu.js`;
`context-menus.js`; `data-place.js`; `load-step.js`; `graphs-switcher.js`; `start-screen.js`;
`notes-place.js`; `analyze-popover.js`; `export-dialog.js`; `recipe-apply.js`; `settings.js`
(was Preferences; old Preferences links redirect); `table-dock.js`; and a new `views-place.js`.

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

Added in version 2:

- The rail becomes Graph, Data, Views, Notes, Assistant; saved views get their own place.
- The inspector rule changes from "the right side is for reading" to "properties of the
  selected thing, read and edited in place; no verbs". The crosswalk's exception "the graph's
  Layout row carries Run" is deleted. One inspector frame for every kind (section 5.1).
- The one-home rule gains its enforcement: one command record per command, doors drawn from it,
  disabled reasons read from graphty-element (section 17). The main menu stops being an index.
- A built-in Notes row joins the tree (section 3.7). Individual notes still are not rows.
- Everything is the element's default layers, not an app layer.
- **The conceptual model changes, flagged for the owner** (conceptual-model.md is outside the
  studio's write area): its sections 1.1 and 5.3 list Labels, Arrows and the minimap as display
  toggles a view captures. Under the owner's styling principle, labels and arrows are style
  properties of rows and the minimap is dropped. The model's list of what a view captures stays,
  with every part except the camera marked as needing graphty-element.
- Preferences is renamed Settings and holds only per-person settings.
- The skeleton's default view mode is 3D, the element's default.

---

## 15. Every top task has a home

Each task in `../../../framework/top-tasks.md`, with where it starts and where its answer is read.
A task with no row here has no home in this structure.

| Task | Starts from | Answer read in |
|---|---|---|
| 1 Characterize the whole graph | nothing selected; Compute the overview | nothing-selected Data tab; Data > Attributes (level icons, profiles); import report from Sources |
| 2 Rank nodes | Analyze > Rank nodes and edges | the measure row (paints); its Data tab histogram and top 10 |
| 3 Communities | Analyze > Find groups | the run row and its group children (paint); Readings (count, sizes, modularity, edges between groups); item tab |
| 4 Find, inspect, explore a neighborhood | Find (/); Neighborhood, Filter to neighbors; Previous selection | the node's Data tab; the table |
| 5 Take a note | Add note (N) from the selection bar and menus | the Notes place; note counts on rows; the Notes row's paint |
| 6 Filter, then characterize | Data > Filters; the filter chip; Filter to... on attributes, rows and selections | the nothing-selected Data tab, now over the filtered graph; stale marks on older runs |
| 7 Make the layout readable | nothing-selected Layout section; the layout chip (pause); Lay out members... on a set, group or run; Place by on an attribute | the canvas |
| Load a graph | Data > Sources "+"; the start screen; drop; paste | the load dialog; Data > Sources and its import report |
| Start from a recipe | File > Apply recipe or style file... | the binding step; rows marked "from recipe" |
| Export (image, video, figure, report, files) | project-name menu > Export...; File > Export...; a view's or row's menu | the file; Data > Sent and saved |
| 8 Color or size by a value | a row's Style tab; an attribute's Color by / Size by | the measure or group row; the legend |
| 9 Create and combine sets | Create set (Mod+G); Keep as set; Keep top N as set; Combine | set rows |
| 10 Compare with... | a row's "..." menu (the same list as its context menu) | the comparison surface; Save comparison makes a run row |
| 11 Shortest path | the selection bar's Path between (two nodes selected); P or Analyze > Find paths (pick mode) | path children under one path run row |
| 12 Reuse an analysis | Data > Sources > Replace data... | the same rows, each marked where a number changed |
| Tail: time | the time slider (T) | a series measure row, one window at a time |
| Tail: combine, project, extract | Graphs switcher > New graph from | a new graph in the switcher |
| Tail: null model, seed stability | a run's "..." > Check (needs graphty-element) | a reading on that run |
| Tail: clean and merge | the table (cell edits, Merge nodes) | Data > Versions |
| Tail: bridges, link prediction, the rest of the catalog | Analyze (All algorithms...) | a group or edge measure row; a pair run's item tab |
| Tail: save a view; 2D, 3D, VR, AR | the Views place (+); the Camera menu's Save view...; View mode | the Views place; the canvas |
| Tail: present, record a tour | the Views place header | Present mode; Export > Video |
| Tail: rename what was found | double-click or F2 on a row | the tree, the legend |

---

## 16. The Style tab: every styling option, organized (version 2)

Owner's review: "displaying all the styling options is important, but it is also complex because
there are so many of them (and likely more in the future)". Studio decision: one Style tab
component for every row that paints, generated from graphty-element's list of style properties.

### 16.1 Where the options come from

graphty-element publishes 35 style properties (14 node, 13 of them drawn -- `node.marker` is
not; 21 edge) with a plain name,
a value kind (color, number, text, boolean, choice, label style), a range, allowed values and a
caveat (`channelsFor('node' | 'edge')`), and a 47-field label style for every label-like property.
The Style tab is built from that list. A property the element adds later appears with no app
change. Hand-typing a subset per row type is what made the version 1 rows disagree (7, 7 and 6
properties) and show values the element does not have.

### 16.2 Layout of the tab

1. **Nodes | Edges switch**, each side with a count of what the row sets ("Nodes 3 | Edges 1"), on
   **every** row (skeleton review 2): any row can style its edges as well as its nodes, because
   styling is left to the user. The side that opens first is the one the row paints.
2. **Sections in a fixed order:**
   - Nodes: **Fill** (color, opacity), **Shape** (shape, size), **Effects** (outline, glow, glow
     strength, wireframe, flat shading), **Label** (text, label style), **Tooltip** (text, style;
     shown on hover).
   - Edges: **Line** (color, width, opacity, pattern, pattern count, curve, flow speed), **Arrow
     head** (type, size, color, opacity, caption and its style), **Arrow tail** (the same), **Label**
     (text, style).
   - A **More** section catches any property the list does not place. **Needs graphty-element:**
     the descriptors have no section field, so the section list is a temporary app list with a
     comment naming the issue (a `section` and `order` on each descriptor).
3. **Only what the row sets is shown.** A section with nothing set is a header with "+"; the "+"
   menu lists the section's unset properties and filters as you type. A collapsed section that
   holds values shows them as a one-line summary of name and value pairs ("Pattern dash . Width 2
   . Curve on"); bare values ("#6366F1, 1") cannot be read. The "+" is named "Add to <section>".
4. **One line per property, 24 px**: name; value control; a **bind** button (Figma's
   variable-binding icon); "-" to remove it. Binding turns the value into an attribute or run
   result; the line expands in an indented block (1 px left rule) to scale (the element's nine),
   domain (with Fit to data), range, palette (the element's eighteen, each with its color-blind
   safety and capacity), clamp, reverse, midpoint, bins or exponent where the scale takes them,
   category values and an "other" threshold, and what "no value" draws as (default: nothing).
   Unbinding offers to keep the current value as a fixed one (the element's `resolveToStatic`).
5. **Inherited values**: an unset property shows the value from the row beneath in secondary text
   with a link glyph whose tooltip names that row ("icosphere, from Everything"). Removing a
   property returns it to inherited.
6. **Label style in a popover**: the Label line's swatch is an "Aa" drawn with the label's own
   font, color and panel. It opens one popover with six tabs -- Text (font, size, weight, color,
   line height, alignment, outline, shadow), Panel (background, gradient, padding, corner radius,
   border, margins), Placement (location, offset, depth fade), Pointer (the speech-bubble tail),
   Effects (animation and speed), Badge (badge kind, icon, progress, overflow cap). The same
   popover serves node label, node tooltip, edge label and both arrow captions. **Needs
   graphty-element:** full descriptors for the label fields (today only their names are
   published).
7. **Search**: a search icon in the Style tab header opens a filter field over set and unset
   properties and label fields; no always-visible search line, because the tab is mostly empty
   by design.
8. **Choice pickers** use the element's lists with previews: 25 node shapes (names in the field,
   32 px thumbnails in the open list), 14 arrow types and 9 line patterns (16 px glyphs, drawn in
   the current text color so they work in light and dark).
9. **Invalid values** show the element's validation message on the line (`styles.validate`);
   a misspelled or unknown property is never silently ignored.

### 16.3 By row

| Row | What the Style tab holds |
|---|---|
| Everything | every style property with its effective value, all sections collapsed to name-and-value summaries of the values that are not none or off, and no "+" (every property is already listed); one mark at the top says the values are stand-ins and editing needs graphty-element (descriptor defaults, section 19); an empty More section is hidden. One body, no tabs |
| Group, set, path, Overrides, Notes | only the properties the row sets, fixed values |
| Measure | the same component, with the painting property bound to the result |
| Run | the same component, Fill color bound to the run's groups; the binding block holds the palette its children share, per-child exceptions, the overflow rule and the Level for a hierarchy, each explanation a tooltip |
| Selection | the element's three highlight fields only (color, scale, opacity), as Style tab lines without bind or "-"; no "+" |
| Node, edge, several elements | "Why this look" (section 5.4); values read-only, token clicks edit through Overrides |

### 16.4 Removed in version 2

"Circle" as a shape; the "up to N names in view" label budget (replaced by the element's label
declutter, in the graph's Canvas section); arrows disabled on an undirected graph (the element
draws arrows on any graph); opacity on a whole layer (a layer has none); the app's grayscale
computation for the Print look; the Selection row's outline width, two-color bands and "Dim
everything else"; the canvas background on Everything (moved to the graph's Canvas section); the
Labels and Arrows display toggles (they are properties here).

### 16.5 The unopinionated rule

Owner principle: "styling should be unopinionated and left to the user". Studio decision: **the
app adds no look of its own.** Every paint on the canvas is a row the user can see, restyle, hide
or delete, or an element setting the user can change. The only paint that arrives unasked is the
element's defaults (shown and editable as Everything) and a run's suggested style (owner
decision: runs paint when they finish; it is an ordinary row, and "Restore the suggested look" in
the run's menu brings it back after the user clears it). Dimming, fading or graying what is not
selected is a layer the reader adds, never a built-in control. The Notes row has no app default:
its default look is graphty-element's once the element owns notes, and until then it starts
with nothing set (section 3.7).

Precedents: Figma's Fill, Stroke and Effects sections with "+" and its variable binding;
Tableau's Marks card (any field on any channel); Gephi's Appearance panel (the same layout for
every attribute). Counter-example: Cytoscape's Style panel, which lists every property always.

Round 7 first-click tasks: "make the edges dashed" from a group row; "make the noted characters
stand out" (Notes row); 85% target.

---

## 17. One home per feature (version 2)

Owner's review: "I think we had a design principle that every element has one home ... review the
app for duplicative locations for features and decide if we should simplify."

**The rule (studio decision):** every object and every piece of state has one home, where it is
read and changed. Commands have no home; they have **doors**: keys, Quick actions, context menus
scoped to the clicked object (and the inspector's "...", which is the same list), the selection
bar, and links from reasons and empty states. A door never shows or holds state; it may name the objects it acts on (Open recent names
files, the Camera menu names saved views) but never shows their state or edits them. Every door is
drawn from one command record, so its label, key and disabled reason match the home, and the
disabled reason is read from graphty-element (for example `isVRSupported()`). Quick actions is the
complete index; each entry names its home ("Toolbar > View mode"). A second place that shows or
edits the same value is a defect -- including a display toggle for something a style layer paints,
and a style field for something that is element configuration.

**The test:** if deleting a route leaves nothing unreachable and nothing unconfigurable, it was a
door. If it has something the home lacks, it is a second home and one of the two goes.

**Exempt:** the start screen (no project exists yet) and the headset hand menu (the only surface
inside a headset).

| Feature | Its one home | Doors kept | Removed in version 2 |
|---|---|---|---|
| View mode 2D / 3D / VR / AR | toolbar View mode | key 5, Quick actions | main menu View submenu; inspector Dimension field; zoom menu footer link |
| Camera: fit, frame, reset, zoom, built-in views | Camera menu | keys 0, F, Shift+0, 1, 3, 7 (2D zoom keys = and - are graphty-element's own); Quick actions; Frame in node and row menus; Zoom to fit in the canvas menu | the Views place's built-in list (API review) |
| Saved views (list, rename, reorder, delete, update) | Views place | Camera menu jump list (names only) and Save camera view...; Quick actions ("Go to view: <name>"); Export and Present read the same one list | Graph place Views footer; zoom menu views list; "Reorder views" link in Export |
| Present, tours | Views place header | Quick actions | -- |
| Labels, arrows | style properties on rows (section 16) | -- | display toggles in the main menu and zoom menu |
| Legend | the legend card (close; chip to reopen) | L | display toggles in two menus |
| Minimap | none (dropped; graphty-element feature request) | -- | two display toggles and key M |
| Note markers | the Notes row's eye | Space on the focused row | Notes header eye; zoom menu and View menu toggles; Shift+N; hand-menu switch |
| Label declutter, background, reframing, the Look, filtered-out nodes drawn faintly | graph's Canvas section | Quick actions | Everything's Background and Look; the label budget; the Filters header switch |
| Table | the dock's own toggle | Shift+T, Quick actions, "Open the table" on the too-large card | main menu View > Table |
| Time slider | the dock's options menu | T | main menu View > Time slider |
| Toggle panels | none (no state to show) | Mod+B, Quick actions | main menu View > Toggle panels |
| Bringing data in | Data > Sources "+" | start screen, empty-canvas card, Ctrl+V with text, drop, Quick actions | File > Add data, Paste data; canvas menu Paste data as its own flow; switcher's Add as another graph |
| Add node (typing one node by hand: editing, not a source) | the empty canvas's menu (the graph's "...") | Quick actions | Data > Sources "+" Add node... (skeleton review 2) |
| New graph from (derived graphs) | Graphs switcher | several-elements menu Extract as graph | main menu Analyze > New graph from; Analyze popover "Make a new graph" |
| Analyze (the catalog) | toolbar Analyze | Shift+A, Quick actions, selection bar "Analyze these...", row menus, the empty tree prompt | main menu Analyze submenu; tree bar icon; overview Statistics icon; edge inspector's "Rank nodes and edges..."; path bar's "More in Analyze" |
| Paths | selection bar Path between; the pick mode | P, Analyze > Find paths, node menu | toolbar Path; main menu Find paths; several-elements inspector's path buttons |
| Rerun, run settings | the run's Made with and the state bar | row menu Rerun, Run again as copy | Settings buttons in bodies; overview's and attribute inspector's "Rerun on current filter" (the scope mark on the row is the door) |
| Layout method, options, scope, seed | graph's Layout section | -- | -- |
| Re-run layout | (a command) on the layout chip ("Settled -- Re-run") | canvas menu, graph "...", Quick actions | main menu; inspector button |
| Pause and resume layout | layout chip | Quick actions, canvas menu | -- |
| Pin, unpin | node's pinned mark and graph's Layout pinned count | node menu, canvas menu Unpin all | -- |
| Filters | Data > Filters | filter chip, Filter to... in menus, Neighborhood popover | -- |
| Neighborhood | selection bar (popover: 1 to 3 hops, in, out, both) | G, node and several-elements menus, Quick actions | Expand (X) as a second name for one hop (API review; returns when a source can fetch neighbors) |
| Selection commands (select all visible, invert, where, by ids, same value, edges between, previous) | Edit menu | Mod+A, I, canvas menu, Quick actions | -- |
| Attribute roles (weight, label, time, position) and level | the attribute inspector's Read as | Declare role... in the attribute and column menus; the load dialog sets the first value | -- |
| Attribute list | Data > Attributes | Quick actions, the node inspector's link, column menu Show in Data | -- |
| Create set | selection bar | Mod+G, context menus, Quick actions | Edit > Create set; several-elements inspector button |
| Keep as set, Keep top N | row "..." menu | row context menu (same list) | body buttons |
| Hide on canvas; show hidden elements (needs graphty-element: a draw-only hide) | selection bar; Edit > Show hidden elements | Mod+Shift+H, context menus, the "not drawn" line | Edit > Show all (split) |
| Hide rows; show hidden rows | row menu; tree list menu | -- | Edit > Show all |
| Add note | the selection bar | N, context menus and "..." menus (including the graph's, for a note about the whole graph), the Notes place header, Quick actions | ten inspector "+" buttons |
| Find (rows, notes, nodes, edges) | the tree's search field | /, Quick actions' "Find ... in rows and notes" hand-off; the table's Find icon focuses the same field | -- |
| Show members in table | the row's "..." menu (the context menu) | a Communities table row opens its community | the tree's link under a run; the table's per-row button; the legend's link |
| New attribute (expression column) | Data > Attributes "New attribute..." (needs graphty-element) | the table's options menu, same label and mark | the table's separately named "New column..." |
| Open notes | Notes place | row note counts, Open in Notes links, Quick actions | -- |
| Rename | double-click the name | F2, context menu Rename | several-rows result Rename button; switcher pencils; Project menu Rename as a separate field |
| Save, Save as | project-name menu | Mod+S, Mod+Shift+S, Quick actions | File > Save, Save as (skeleton review 2: the main menu is the app, the project menu is this project) |
| Export (every output) | Export dialog | project-name menu Export... (owner), Mod+E, view, row and table menus; File > Export... removed (skeleton review 2) | Everything's "Export a figure..."; Recipes > Save as recipe and Export style as separate flows |
| Apply recipe or style file | the apply dialog | File > Apply recipe or style file..., a dropped file, Quick actions | Recipes submenu; version history's Apply recipe button |
| Overview recipe (this project) | the graph overview's recipe line | -- | Recipes > Use as overview |
| Default overview for new projects | Settings > Projects (a per-person default; no project carries it) | the graph overview's recipe menu, "Use for new projects" | -- |
| Version history (one screen, one name) | project-name menu | Quick actions, Data > Versions rows, run "..." | Edit > Undo history (renamed); switcher's Version history |
| Undo, redo | header buttons | Mod+Z, Shift+Mod+Z, Edit menu, notices' Undo links | -- |
| Compare with... | row "..." menu | Graphs switcher (two graphs), Data > Versions | body buttons |
| Settings | the Settings dialog | Mod+,, main menu, start-screen gear, Quick actions, "Change in Settings" links | shortcuts panel footer button |
| Author (your name) | Settings > You | -- | project-name menu Author... |
| AI provider and keys | Settings > Assistant | the Assistant's no-provider link (one way) | the Assistant's own "AI provider..." |
| Usage data | Settings > Privacy | the header privacy line and Sent and saved (links) | -- |
| Keyboard shortcuts panel | Help > Keyboard shortcuts | ?, Settings > Keyboard, Quick actions, the canvas "?" button | -- |
| Quick actions | toolbar | Mod+K | -- |
| Graph overview | nothing-selected inspector | -- | Everything's Data tab copy |
| Show in table | row or element "..." menu | count links select, and the table follows | about twenty body buttons |
| Select members | the count link | "..." menu | body buttons |

**Personal display settings are not styling (skeleton review).** Settings > Accessibility's "My
selection look on this device" and similar per-device overrides change how one person's screen
draws, and are kept in that browser; the project's look has one home, its rows and the graph's
Canvas section. A per-device override is therefore not a second home of the Selection row or of
the Look, the same way a browser's zoom is not a second home of a page's font size.

**Keys resolved:** Mod+G is one command, "group what is selected" (a folder for rows, a set for
elements); key 5 is one toggle, shown once; app keys never use W, A, S, D, Q, E or the arrows (the
element's canvas keys, nor = and -, which are its 2D zoom keys): Analyze Shift+A, Expand withdrawn, Lasso none, Hand removed; L stays with the
legend; single-letter app keys can be switched off (Settings > Accessibility).

---

## 18. Capability register: every graphty-element capability and its home

Owner's review: "review all the graphty-element functionality and make sure we have it all
accounted for in the skeleton." The studio's audit listed 349 capability entries (many listed
more than once from different angles). Each has exactly one disposition:

- **Home** -- a place in the UI, with its states drawn in the skeleton;
- **Catalog** -- the UI list is generated from the element's catalog, never typed;
- **Plumbing** -- no UI, with the reason;
- **Gap** -- needs graphty-element; filed, drawn disabled with "needs graphty-element", never built
  in the app (section 19).

### 18.1 View modes and headsets

| Capability (element API) | Disposition | Where |
|---|---|---|
| View mode 2D / 3D / VR / AR (`viewMode`, `setViewMode`, `VIEW_MODE_VALUES`, default 3D) | Home | toolbar View mode; the skeleton opens in 3D |
| Deprecated 2D flag (`layout2d`) | Plumbing | never exposed; the app uses `viewMode` only |
| VR and AR support checks (`isVRSupported`, `isARSupported`) | Home | Enter VR / Enter AR enabled state and reason |
| Exit a session (`exitXR`) | Home | hand menu Exit; switching to 3D on the desktop |
| Camera mode spelling (`setCameraMode('orbit' \| '2d' \| 'xr')`) | Plumbing | the app writes `viewMode` only; the camera mode follows it |
| In-headset menu | Gap | the hand menu is drawn as a target, marked |
| The element's own Enter VR/AR overlay (`xr.ui.*`) | Plumbing | always off; stated in Settings > Headset |
| Session configuration: VR or AR offered, reference space, optional features (`xr.vr`, `xr.ar`) | Home | Settings > Headset (seated or room-scale); optional features stay element defaults |
| Hand tracking, controllers, near-touch, physics, depth amplification (`xr.input.*`) | Home | Settings > Headset |
| Teleportation (`xr.teleportation.*`) | Home | Settings > Headset |
| Session events (started, ended, controller connected) | Home | "headset session ended" state; otherwise plumbing |
| AR placement and scale in the room | Gap | not published; nothing designed until it is |

### 18.2 Camera and navigation

| Capability | Disposition | Where |
|---|---|---|
| Camera state read (`getCameraState`) | Home | the Camera menu face; a saved view's inspector |
| Camera state write, animated (`setCameraState`) | Home | view jumps, Present; animation follows Reduced motion |
| Camera position and target (`setCameraPosition`, `setCameraTarget`) | Plumbing | used through views and tours; no numeric editor (no task asks for one) |
| 2D zoom (`setCameraZoom`) | Home | Camera menu Zoom in / out, 2D only, with the percentage on the face |
| 2D pan (`setCameraPan`) | Home | the element's own drag and keys; no Hand tool |
| 2D rotation (Q/E) | Home | the shortcuts panel's graphty-element group |
| Reset (`resetCamera`) | Home | Camera menu Reset (Shift+0) |
| Zoom to fit (`zoomToFit`, `zoom-to-fit-complete`) | Home | Camera menu Fit (0) |
| Frame a scope (`applyCameraView(id, {scope})`) | Home | Frame selection (F); Frame in node and row menus |
| Built-in views (fitToGraph, topView, sideView, frontView, isometric) | Catalog | Camera menu, read from `camerasForMode` |
| Registered camera views (`registerCameraView`, `cameraDescriptor`) | Catalog | appear in the same lists |
| Saved views (`saveCameraPreset`, `loadCameraPreset`, `getCameraPresets`) | Home | Views place |
| Views in the project file (`exportCameraPresets`, `importCameraPresets`) | Plumbing | carried by the Project export and open |
| Remove or rename a saved view | Gap | Views row menu, drawn disabled |
| A view snapshot (layers on, filters, positions) | Gap | a view's inspector, "keeps" lines disabled |
| Starting camera distance (auto-framing) | Home | graph Canvas section, "Reframe when data changes" |
| Camera changed event | Home | "moved" on the Camera menu face |
| Keyboard, mouse and touch navigation | Home | the shortcuts panel's "Canvas (graphty-element)" group; app keys moved off |
| A configurable keymap, and navigation speeds (orbit, zoom, yaw, inertia, pinch; today reachable only through `getCameraController()`) | Gap | keys listed as not changeable; no speed settings |
| Input on/off (`setInputEnabled`) | Home | Present > Lock the canvas |
| Coordinate transforms (`worldToScreen`, `screenToWorld`) | Plumbing | no app overlays on nodes (the note markers were removed) |
| A zoom reading in 3D | Gap | the Camera menu shows a view name, not a number, in 3D |
| Reduced motion for every animation | Gap | Settings > Accessibility reaches only the app's calls meanwhile |

### 18.3 The scene

| Capability | Disposition | Where |
|---|---|---|
| Background color or skybox (`background`, `skybox-loaded`) | Home | graph Canvas section |
| Selection look (`selectionStyle` color, scale, opacity) | Home | Selection row; the default's contrast is a gap |
| The element's hover highlight (a locked element layer, source `hover`) | Gap | not a tree row; shown locked in Why this look when it wins; its look is not configurable (filed) |
| Draw-only hide of chosen elements, with their edges | Gap | Hide on canvas and the "not drawn" count, drawn with the mark (section 3.6) |
| Collapsed or aggregate drawing of a group | Gap | Collapse on canvas, drawn with the mark (section 3.7) |
| Label declutter (`layoutBehavior.labels.declutter`) | Home | graph Canvas section |
| Legend (`styles.legend()`, including literal and highlight blocks and its departures) | Home | the legend card |
| Legend drawn into an exported image | Gap | Export preview shows canvas only |
| Minimap | Gap | dropped |
| Direction and arrowheads (`directed`; `edge.arrowHead` in layers) | Home | the load dialog's Direction; arrowheads are Style properties |
| A color scheme the canvas follows | Gap | Settings > Appearance > Theme covers the app's chrome only |
| Default style on or off (`addDefaultStyle`) | Gap | the Everything row's eye |
| Render settings (`setRenderSettings`, a no-op) | Plumbing | nothing to expose until the element implements it |
| Which graphics API draws (always WebGL) | Plumbing | not selectable; Settings' GPU status speaks of computing only |
| Renderer lifecycle (`shutdown`, render events) | Plumbing | closing a graph |

### 18.4 Image and video capture

| Capability | Disposition | Where |
|---|---|---|
| Raster screenshot (`captureScreenshot`): format, quality, multiplier, pixels, aspect, transparency, enhancement, presets, destination, file name, camera, timing | Home | Export > Image |
| Pre-flight check (`canCaptureScreenshot`) | Home | Export > Image disables refused sizes with the reason and memory estimate |
| Screenshot errors (`ScreenshotErrorCode`) | Home | Export failure states |
| Clipboard result and reasons | Home | Export > Image destination |
| Wait for a stable frame (`waitForSettled`, `waitForStableFrame`, `graph-frame-stable`) | Home | the "waiting for the layout to settle" state |
| Thumbnail preset | Home | saved view thumbnails |
| Video, still camera or tour (`captureAnimation`) | Home | Export > Video |
| Video estimate, progress, cancel, status (`estimateAnimationCapture`, `animation-progress`, `cancelAnimationCapture`, `isAnimationCapturing`) | Home | Export > Video before, during and after |
| Video quality report (frames captured and dropped) | Home | Export > Video after |
| 2D tour waypoints | Gap (to confirm) | Record tour disabled in 2D |
| SVG figure (owner decision), PDF later | Gap | Export > Figure, drawn disabled |
| AI screenshot command | Home | the Assistant (through `aiCommand`) |

### 18.5 Layout

| Capability | Disposition | Where |
|---|---|---|
| Pause and resume (`setRunning`, `isRunning`, `graph-settled`) | Home | the layout chip |
| Layout catalog and engines (`catalog.layouts()`) | Catalog | graph Layout section's method list, with size rating and weights flag |
| Set layout and options (`setLayout`, `layout`, `layoutConfig`) | Home | graph Layout section |
| Layout scope (`layoutScope`) | Home | Layout section Scope; Lay out members... |
| Layout by structure (a node, a grouping, an ordering) | Home | Lay out by these groups (run menu); Place by (attribute menu), position attributes only; an attribute axis is a gap |
| Recommend a layout (`recommendLayout`) | Home | a "Recommended" mark in the method list |
| Pacing (`layoutBehavior.layout.*`: all six fields, including GPU iterations per step and batches in flight) | Home | Layout section > Advanced |
| Pin, unpin, pinned list (`pin`, `unpin`, `isPinned`, `pinnedNodes`) | Home | node menu and pinned mark; Layout pinned count; Unpin all in the graph's menu |
| Pin on drag (`layoutBehavior.node.pinOnDrag`) | Home | Settings > Canvas input |
| Transition time (`transitionMs`) | Plumbing | follows Reduced motion |
| Positions saved and restored as a document | Gap | a method change cannot be undone meanwhile |

### 18.6 Performance, acceleration and diagnostics

| Capability | Disposition | Where |
|---|---|---|
| Acceleration policy auto / off / required (`acceleration`, `ACCELERATION_POLICIES`) | Catalog | Settings > Performance > GPU use |
| GPU node threshold (`accelerationMinNodes`) | Home | Settings > Performance > Advanced |
| Acceleration status and device (`session.capabilities.acceleration`) | Home | Settings > Performance status line; GPU lost card; failed run row |
| Per-run precision (`caveats.precision`) | Home | a run's Made with |
| Accelerator injection (`setAccelerator`) | Plumbing | developer-level |
| Limits (drawing ceiling, edges drawn, large-graph threshold, selection cap, sampled-above) | Home | Settings > Performance, read-only; the refusal, less-detail and selection-cap states |
| Cost gate per run (`RunOptions.limits`, `estimate`, `plan`) | Home | the Analyze popover's cost line and blocked state |
| Statistics and profiling (`enable-detailed-profiling`, `getStatsManager`) | Home | Settings > Diagnostics |
| Logging configuration and sinks | Home | Settings > Diagnostics |
| The documented but missing `debug` attribute | Gap | an element documentation defect |

### 18.7 Styling

| Capability | Disposition | Where |
|---|---|---|
| The 35 style properties (`CHANNEL_DESCRIPTORS`, `channelsFor`) | Catalog | the Style tab (section 16) |
| Node color, size, shape (25), label, opacity, outline, glow, glow strength, wireframe, flat shading, tooltip | Catalog | Style tab, Nodes sections |
| The 47-field label style (enabled, text, panel, border, gradient, placement, margins, pointer, outline, shadow, animation, depth fade, badge, icon, progress, overflow) | Catalog | the label-style popover; field descriptors are a gap |
| `node.marker` (declared, not drawn) | Gap | not offered; wanted for the Notes badge |
| Node gradient fill (unreachable) | Plumbing | not offered: no property reaches it |
| Edge color, width, opacity, pattern (9), pattern count, curve, flow speed | Catalog | Style tab, Line |
| Arrow head and tail: type (14), size, color, opacity, caption and style | Catalog | Style tab, Arrow head and Arrow tail |
| Edge label and its style | Catalog | Style tab, Edge Label |
| Edge tooltip (withdrawn; edges not pickable) | Plumbing | not offered |
| Style layer (`LayerSpec`, `styles.add`) | Home | the tree's rows |
| Selectors: everything, expression, has, ids, top N, member | Home | each row's Paints line; Keep or Select top N; the Notes and Overrides rows |
| List, reorder, enable, update, remove | Home | the tree (drag, eye, Delete) |
| Validation (`styles.validate`) | Home | a property line's error state |
| Provenance (`LayerSource`) | Home | Made with; element-owned layers show a lock |
| Element base layers | Home | the Everything row; editing them is a gap |
| Encode a run result (`styles.encode`) | Home | a bound property on a measure row |
| Encode from an attribute (`LayerSpec.encode`) | Home | a bound property on any row |
| Scales (9) and their options | Catalog | the binding block |
| Missing values, category map, "other" threshold, overflow (other, shape, extend) | Home | the binding block; a run's Style |
| Palettes (18) with capacity and color-blind safety | Catalog | the palette picker |
| Custom palettes (`registerPalette`; saved with a style) | Home | "+" in the palette picker |
| Custom scales (`ScaleRegistry`) | Catalog | plugin scales appear in the list; no creation UI |
| Highlights (`styles.highlight`, exclusive) | Home | path rows paint; a new highlight replaces the previous, shown on the older row |
| Suggested styles (`getSuggestedStyles`, `applySuggestedStyles`, the run's style option) | Home | runs paint on finish (owner); "Restore the suggested look" in the run menu; size range in the run's Style |
| Explain a look (`styles.explain`) | Home | Why this look |
| Explain over several elements (coverage) | Gap | the several-elements Why this look, drawn with the mark |
| Freeze a bound value (`resolveToStatic`) | Home | unbinding a property keeps its value |
| Style document save and apply (`toDocument`, `applyTemplate`, unbound report) | Home | Export > Style; Apply recipe or style file |
| Replace the style with a document | Gap | today a removal plus an apply; an element option is filed |
| Themes (`catalog.themes()`, issue #331) | Gap | the Look on Everything |
| Grayscale and color-blind check | Gap | the Print look (owner decision) |
| Legacy 1.x style template | Home | the apply dialog's "older style file" state: layers ignored, settings listed |
| Style changed and settled | Plumbing | -- |
| Style problem event (`style:problem`) | Home | a run row's "its look could not be applied" state |
| AI style commands | Home | the Assistant; its layers land as rows marked from the assistant |

### 18.8 Data in

| Capability | Disposition | Where |
|---|---|---|
| Inline records (`nodeData`, `edgeData`, `setData`) | Plumbing | developer path; Paste is the reader's equivalent |
| Load from file (`loadFromFile`) | Home | Sources + File... |
| Load from URL (`loadFromUrl`, retries) | Home | Sources + From a URL...; start screen Open from URL... |
| Load by source type and config (`addDataFromSource`, `dataSource`) | Home | Paste... uses it; otherwise plumbing |
| Replace versus add (`replace`) | Home | Load into; Replace data...; Refresh |
| Add records (`addNodes`, `addEdges`, per-call repeat policy) | Home | Add node... (empty canvas menu); a file added to this graph |
| Neighborhood fetched on demand (`layoutBehavior.fetchNodes`) | Gap | needs a connector; Expand is withdrawn (section 2.3) and Neighborhood selects loaded neighbors |
| Superseded loads (`E_SUPERSEDED`) | Home | the "one source at a time" refusal; queuing is a gap |
| Clear data (`clearData`) | Home | Sources header Clear graph data... |
| Per-load cancel | Gap | the loading card's Cancel |
| Remove nodes (`removeNodes`, `elements-removed`) | Home | Remove from data... in node menus and the table |
| Edit node data (`updateNodes`) | Home | the table's node cells |
| Edit edge data | Gap | edge cells drawn disabled |
| Progress (`data-loading-progress`) | Home | the loading card |
| Completion and report events | Home | the import report, per source |
| Import report (`data.lastImport()`) | Home | Show import report; the overview's Last import |
| Per-record errors and the error summary, error limit | Home | "could not be read" state with rows and the suggestion; the load dialog's "Stop after N errors" |
| Typed load failures | Home | one state each (section 11.3) |
| Size ceiling and refusal (`E_TOO_LARGE`) | Home | the refusal card |
| Filter at import; hold without drawing | Gap | "Filter at import..." drawn disabled |
| Formats (`FORMAT_DESCRIPTORS`, `formatsForExtension`) | Catalog | the load dialog and file pickers |
| Unserved formats (SIF, CX2) | Home | the load dialog's "not supported, because" state |
| Format detection (`detectFormats`) | Home | the load dialog's detected, several and none states |
| CSV options, paired node and edge files | Catalog | the load dialog; File... takes two files |
| JSON paths and dialects | Catalog | the load dialog |
| Endpoints, node id, id coercion, label, weight, edge id, repeated edges, direction, position scale | Catalog | the load dialog's "How the graph is read" |
| Time attribute config slots (read by nothing) | Gap | an element defect; the time slider uses the working time window |
| Dynamic GEXF time data | Home | kept on records by the load; windowing by spells is a gap |
| Custom data sources (`DataSource.register`) | Catalog | registered formats appear in the load dialog |
| Joins | Gap | Table matched by key..., drawn disabled |
| What a weight means for the whole graph | Gap | chosen per run (the Analyze essentials and the run's Made with), where the element records it (`caveats.weight.meaning`) |
| An attribute as a layout axis; longitude and latitude | Gap | Place by offers position attributes only |
| Live connections | Gap | not drawn |
| Which source a record came from; remove one source | Gap | no per-source Remove |
| What a replacing load does to runs and bound layers | Gap | the "after Replace" state is drawn |
| Graph data export (`canExport: false`) | Gap | Export > Data, drawn disabled |
| Data events and batching | Plumbing | -- |

### 18.9 Data read, filters, selection and sets

| Capability | Disposition | Where |
|---|---|---|
| Attribute catalog (`data.attributes()`) | Home | Data > Attributes |
| Ordinal level, "read as", display name | Gap | drawn with the mark |
| Graph statistics (`data.statistics()`) | Home | the graph overview (including self-loops, repeated edges, where direction was settled) |
| Status counts (`session.status`) | Home | the filter chip; the Graphs switcher line |
| Record lookup | Home | the inspectors; the table |
| Edge weight path and node label path after load (`edgeWeightPath`, `nodeLabelPath`) | Home | the attribute inspector's Read as; the load dialog sets the first value |
| A graph-wide weight meaning (distance, strength) | Gap | meaning is per run (`caveats.weight`), chosen in the Analyze popover |
| Snapshot and fingerprint | Home | the source row's fingerprint |
| Versions and diffs | Gap | Data > Versions beyond a fingerprint list |
| Filters (`visibility.set`, `plan`) | Home | Data > Filters (steps compiled to one "all" tree; counts from `plan`) |
| OR and NOT between filter steps | Gap | -- |
| Time window (`visibility.setWindow`) | Home | the time slider |
| Filtered-out nodes drawn faintly (`visibility.showContext`) | Home | a switch in the graph's Canvas section |
| Visibility queries and event | Plumbing | -- |
| Scopes (`scope.resolve`, `count`) | Home | the Scope control (Visible, Whole graph, Selection, Largest component, a set, a rule) and its counts |
| Saved scopes (`scope.save`, `list`, `remove`) | Plumbing | sets are the reader's named kind; saved scopes are not surfaced |
| Query validation (unresolved paths with suggestions) | Home | the error state of Select where..., filter and rule-set fields |
| Table data | Home | the table dock (app chrome over element reads) |
| Selection by ids and set operations (replace, add, remove, toggle, intersect) | Home | click, Shift-click add, Mod-click toggle, Alt-click remove; intersect in Select where... "within the selection" |
| Neighborhood (1 to 3 hops, in, out, both) | Home | the Neighborhood popover |
| Select where, by text, by pasted ids | Home | Edit > Select where...; Find (/) lists matching nodes and edges; Edit > Select by ids... |
| Select a scope or set; top N; above a threshold | Home | Select members; Select top N (measure menu); histogram brush |
| Edges between, invert, select all | Home | Edit menu |
| Selection statistics (induced and cut edges) | Home | several elements' Summary |
| Selection cap (5,000) | Home | a "selection is full" notice |
| Selection changed event | Plumbing | -- |
| Create a fixed set, with its edge reading | Home | Create set; the reading in the set's Made with |
| Rule set | Home | Create rule set... |
| Keep a scope, selection or offer as a set, following reruns | Home | Keep as set; "Follow reruns" in the set's Made with |
| Path set from selected edges, path kind | Home | "Keep as path" in the several-elements menu; the kind in the path's Summary |
| Combine sets | Home | Combine in the row menu |
| Rename, redefine, add and remove members | Home | double-click; rule edit in Made with; Add to set... and Remove from set... in the node menu |
| Remove and restore a set | Home | Delete; Undo restores |
| Set freshness (current, out of date, cannot rerun, detached) | Home | marks on set rows with the element's verbs |
| Set used by | Home | the Delete confirmation; the set's Data "Used by" |
| Memberships of an element | Home | Memberships in node and edge inspectors |
| Set changed event | Plumbing | -- |
| Multiple graphs per project (one element each) | Home | the Graphs switcher |
| Derived graphs (projection, quotient, sample, combine, extract) | Gap | New graph from, drawn disabled |

### 18.10 Analysis

| Capability | Disposition | Where |
|---|---|---|
| Algorithm catalog (`catalog.algorithms()`), the 21 built-ins and registered ones | Catalog | the Analyze popover |
| Metric availability (`catalog.metrics()`: available, reason, cost, estimated seconds, already run) | Catalog | each entry's marks and disabled reason |
| Requirements (directed, weighted, accelerator, connected) | Catalog | entry marks |
| Options (`OptionDescriptor`) | Catalog | the popover's essentials and a run's Made with |
| Result fields and shapes | Catalog | "Publishes" in Made with; row kinds (section 3.2) |
| Start a run (`run`, `runs.start`) | Home | Analyze; the selection bar; row menus; the Assistant |
| Legacy 1.x method spellings (`runAlgorithm`, `selectNode`, `getSelectedNode`, ...) | Plumbing | the app uses the 2.x session API only |
| Run scope | Home | the Scope control |
| Scoped-run caveat | Home | Made with |
| Seed; exact or sampled; named run (`as`) | Home | Made with; the popover's Cost; As a new row, Run again as copy |
| Rerun in place | Home | the state bar |
| Style on completion | Home | runs paint (owner) |
| Time box and partial results (`timeBoxMs`, `partial`) | Home | the popover's "Stop after..." and a partial mark on the row |
| Dry run | Plumbing | used for previews |
| Queue and queue policy | Home | a "queued" row state with its position |
| Progress with phase and time left | Home | the row's progress bar |
| Cancel; runs that cannot be cancelled | Home | Cancel on the row; a "cannot be stopped" state |
| Status and failure codes | Home | the failed row with the element's message and Retry |
| Caveats (converged, iterations, direction, weight, precision, method, component scope) | Home | Made with |
| Run record and engine versions | Home | Made with |
| Stale run (`Run.stale`) | Home | the scope mark |
| List, get, remove runs; bindings | Home | the tree; Delete names how many layers go |
| Batch runs | Home | recipe apply runs as one batch with one progress line |
| Run on load (`algorithmsOnLoad`) | Home | the graph overview's recipe |
| Cost estimate and plan, cost gate | Home | the popover's cost line; a blocked state with the reason |
| Result reading per element | Home | node and edge Summary |
| Column, ranking, top N with ties | Home | Members and Values |
| Histogram | Home | measure Values |
| Summary | Home | Summary |
| Plain-language reading (`reading()`) | Home | the first line of a run's Summary; the methods text |
| Result paths and terms | Plumbing | used by selectors, filters and Select where |
| Sets a result offers (`sets.offers`) | Home | a run's children, including breadth-first levels and edge sets |
| Earlier results of a run | Gap | "Restore an earlier result" drawn disabled |
| Compare runs, stability, null model | Gap | Compare and Check drawn disabled |
| Run changed event | Plumbing | -- |
| Register algorithms, layouts, palettes, camera views, data sources, log sinks, accelerators (`./extend`) | Catalog | registrations appear in the lists; no extension UI |
| AI commands (`aiCommand` and its commands) | Home | the Assistant |
| AI enable, provider, model, keys and key persistence | Home | Settings > Assistant |
| AI status, cancel, retry, streaming | Home | the Assistant composer: Stop, Retry, tool calls shown as they stream |
| Voice input | Home | a microphone button in the composer; language in Settings > Assistant |
| Undo and redo over graph state | Gap | the app's Undo is drawn; an element command history is filed (issue #337) |

App-only preferences with no element counterpart (author name, usage data, number format,
theme, toolbar labels) live in Settings and are not in this register.

---

## 19. What graphty-element needs (to file, not to build in the app)

Each is filed as a graphty-element issue with type, priority and effort labels before its
skeleton state ships, and each skeleton state carries "needs graphty-element" until then.

- **Styling:** a section and order on each style descriptor; full label-style field descriptors;
  editable and hideable base layers (read `addDefaultStyle`); a drawable `node.marker`; themes
  (issue #331) and a grayscale and color-blind check (for the Print look); a replace option on
  `applyTemplate`; a selection highlight default that passes 3:1; a hover layer that can take a
  set of elements (also used to outline a selected row's members); a drawing-only hide that also
  hides incident edges (Hide on canvas); collapsed drawing of a set as one node (Collapse on
  canvas); a configurable hover highlight look; `explain` over a set of elements with coverage
  counts (several elements' Why this look); a `default` on each style descriptor (the Everything
  row's effective values). (Drawing filtered-out nodes faintly was listed here; the element has
  it as `visibility.showContext`.)
- **Picking:** click, hover and right-click on an edge on the canvas (edge meshes are created with
  `isPickable = false`); until then the edge inspector and menu open from the table and a click
  on a canvas edge says so.
- **Notes:** a notes store in the session that produces the reserved notes layer (open for the
  owner: public API); a pick event for labels and badges.
- **Naming:** rename a run; per-group labels on a run tied to an identity that survives a rerun;
  a display name for an attribute.
- **Cameras and views:** remove and rename a camera preset; an ordered preset collection with
  tour membership; rejecting a saved-view name that matches a built-in view; a view
  snapshot (camera, layers on, filters, positions); 2D tour waypoints (to confirm); a zoom
  reading in 3D; a reduced-motion setting; a canvas color scheme; a published, configurable
  keymap and public navigation speeds; area (lasso) selection; an in-headset menu; AR placement and scale; a minimap if still
  wanted.
- **Output:** SVG figure export (owner decision), PDF later; a legend drawn into images; graph
  data export (connect graph-io's exporters to the format catalog, whose `canExport` is false for
  every format); a results-to-rows writer and a run-record methods writer.
- **Data:** join by key; which source each record came from, and removing one; live connectors
  (Neo4j is in graph-io but not wired); filter at import, or holding a graph without drawing it;
  queuing additive loads; a per-load cancel; import reports kept per load; what a replacing load
  does to runs and bound layers; data versions and diffs; the dead time-attribute config slots;
  windowing dynamic GEXF spells; a graph-wide weight meaning; an attribute as a layout axis
  (Place by, including longitude and latitude); edge data updates; computed columns; merging nodes; an ordinal
  level and a "read as" override; OR and NOT between filter steps; derived-graph transforms
  (projection, quotient, sample, combine, a scoped snapshot for extract).
- **Analysis:** clustering, transitivity, diameter and degree assortativity in
  `data.statistics()` (the overview's readings); reading a weight as strength in the path
  options (the element reads a path weight only as distance).
- **Session:** a whole-session document (runs, sets, positions) for projects and recipes;
  positions saved and restored; undo over graph state (issue #337); earlier results of a run;
  comparing runs, stability across seeds and null-model tests.
- **Documentation:** the documented `debug` attribute that does not exist.

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

---

## Review changes (version 2)

The ontology and generality review of version 2, against the conceptual model, the owner's
eleven questions, the capability audit, the one-home rule and the owner's styling principle.
All are studio decisions. Several overlap the API review made at the same time; where both
touched a line, the two were reconciled into one statement.

- **One command with two names.** "Keep as separate run" and "Run again as copy" were the same
  element call (a run under a new id, the element's `as`). Only Run again as copy remains, in the
  run's menu and as "Run as copy" in the state bar (sections 2.2, 3.2, 5.1, 5.2, 10.3).
- **Built-in views had two homes.** The Views place and the Camera menu both listed Fit, Front,
  Side, Top and Isometric. They are camera commands, so the Camera menu is their one home and the
  Views place lists only saved views (sections 4, 4.1, 18.2; answer 8). The "moved" mark was
  also shown twice (a dot on the Views row and the Camera menu face); it is on the face only.
- **The rule for doors, stated for lists.** A door may name the objects it acts on, as Open
  recent names files and the Camera menu names saved views; it never shows their state
  (thumbnails, marks, order) or edits them. The Camera menu's saved-view jump list is a door
  under that reading.
- **The graph's "..." matched its right-click menu only in name.** The empty-canvas menu and the
  nothing-selected "..." held different lists, against section 5.1's rule. They are now one list
  (sections 5.3, 10.3).
- **The Selection row's tab strip.** It has only a Style body; section 5.1 now says any kind with
  one body has no tab strip, not only kinds with nothing to paint.
- **An attribute's level and role had three editing places** (the level icon in Data, the
  inspector, the menu). Read as, in the attribute's inspector, is the one home; the icon and the
  menu items are doors (sections 5.1, 5.2, 6, 7, 10.3).
- **What a weight means is not graph state.** graphty-element records the meaning per run
  (`caveats.weight.meaning`, distance or strength) and has no graph-wide meaning, and "capacity"
  is not one of its meanings. The load dialog, the attribute list, the edge and graph inspectors
  no longer show a graph-wide meaning; it is chosen per run. A graph-wide meaning is in the
  register and section 19 as a gap (sections 5.2, 5.3, 7, 11.3, 18.8, 19).
- **Place by had no element route** except position attributes, which the element's `fixed`
  layout reads. An arbitrary attribute axis, and longitude and latitude, are drawn disabled and
  filed (sections 10.3, 18.5, 18.8, 19).
- **Rename claimed more than works.** Saved views and attributes cannot be renamed until
  graphty-element can; section 3.10 and answer 2 now say so, and the rename table gains a saved
  view row.
- **The Notes row had an app-chosen default look**, the one exception section 16.5 allowed,
  against the owner's principle that styling is left to the user. Its default is now the
  element's (the element issue proposes an outline); until the element ships one, the row starts
  with nothing set and reads "Not marked -- + to add a look" (sections 3.7, 5.2, 13, 16.5;
  answer 4).
- **"Use a high-contrast selection"** would have shipped app-chosen colors. It becomes "My
  selection look on this device": the Selection row's three fields with values the person
  chooses (sections 3.7, 12.3; answer 10).
- **Default overview for new projects** is a per-person choice, so by section 12.3's own rule it
  lives in Settings > Projects; the graph overview's "Use for new projects" is a door (sections
  12.3, 17; answer 10).
- **Stale routes to removed homes**: the top-task table's "Recipes > Apply recipe...", "a run's
  Data tab > Check" and "menu and Data tab" for Compare; the Graphs switcher's Version history;
  the register's "Expand selects loaded neighbors" (Expand is withdrawn).
- **Legend blocks** named in full: literal and highlight blocks and the legend's departures
  (section 18.3).

Pattern-consistency review (the Design Professor: best practice, one job per panel, one home per
thing). Studio decisions:

- **Bodies hold no verbs, and the tab strip means the same thing everywhere.** The kinds with one
  body (folder, attribute, filter step, saved view, Selection row) showed a one-tab strip in
  section 5.2; they now show none, as section 5.1 says. A saved view's inspector was called
  read-only while holding an editable caption; it now says the caption is its one property.
- **Selecting a row outlined its members on the canvas.** Nothing in the layer system draws that
  outline, so it was app-drawn paint. It now waits on the element's hover layer taking a set
  (section 3.10, 19); the table still marks the members.
- **Hide on canvas and Collapse on canvas have no element backing.** Both are drawn with the mark
  and listed in section 19. The canvas's "Show all" is renamed Show hidden elements, the Edit
  menu's label for the same command (sections 3.6, 3.7).
- **Second homes removed:** Load set collection... in the tree's list menu (its home is Data >
  Sources "+" > Set collection..., because it brings a file in); the Level choice in a run's row
  menu (the Style tab holds it); Duplicate in the project-name menu (the same copy as File > Save
  as...); the table's "New column..." (a door to Data > Attributes' New attribute..., same label).
- **Section 17 was missing rows** for Find, New attribute and the faint filtered-out switch, and
  Add note's doors left out the Notes place header and the graph's "...", the only routes to a
  note about the whole graph (nothing is selected, so there is no selection bar).
- **Register items with no home in the body of the spec** now have one: the time box ("Stop
  after..." in the Analyze popover, 2.2), the faint filtered-out switch (Filters header, 7), the
  selection-cap notice (canvas states, 9), the error limit (load dialog, 11.3), the 1.x style
  file state (apply dialog, 12.2), queued and cannot-be-stopped run rows (3.11), and the
  element's layout recommendation (Layout method list, 5.3).
- **The empty tree** listed Selection, the prompt and Everything, leaving out the always-present
  Notes row (3.11). The result-kind list in 3.2 repeated three bullets from just above it; the
  repeats are removed. The top-task table still offered Expand, which is withdrawn.

Checked and left as they are: every one of the owner's eleven questions has an answer in
`owner-questions-2.md` and a section here; every capability in the audit has one disposition in
section 18 (plumbing items named with their reason); the style tab is generated from the
element's property list with no app-chosen values; the run's suggested style is the only paint
that arrives unasked besides the element's defaults, as the owner decided.

graphty-element API review (every capability in the audit checked against the spec for one
disposition and one home). Studio decisions; where the parallel reviews above already made the
same fix, it is not repeated here.

- **Expand withdrawn.** With loaded data it selected one hop, which is Neighborhood (G): one
  command with two names. Its real meaning, fetching unloaded neighbors, is the element's
  `layoutBehavior.fetchNodes` / `fetchEdges` and needs a connector. It is not drawn until a
  source can fetch; X is freed (sections 2.3, 10.3, 17, 18.8).
- **The app no longer binds = and -.** They are graphty-element's own 2D zoom keys on a focused
  canvas, so an app binding would zoom twice. The Camera menu shows them as hints only
  (sections 2.3, 9, 17).
- **The Camera menu's saved-view jump list** is kept as a door under the rule for lists above
  (names only, in the Views place's order, no thumbnails, marks or edits), and section 9 now
  says so; the round 7 test accepts either first click (sections 2.3, 9, 17).
- **Layout pacing** listed four of the element's six `layoutBehavior.layout` fields; the GPU
  batch fields (iterations per step, batches in flight) are added under Advanced (5.3, 18.5).
- **Why this look**: the Selection line is not from `explain()` (selection is not a style layer)
  and is read from the element's selection state; element-owned layers the tree does not show
  (hover) appear locked; the several-elements coverage count needs an `explain` over a set, filed
  (5.4, 18.7, 19; answer 5).
- **Result shapes**: every shape in the element's `RESULT_SHAPES` now has a row kind -- edge sets
  (spanning tree, matching, min-cut) as edge group rows, layered groupings (breadth-first levels)
  as a group run, category tables on the Data tab -- chosen from the catalog's declared shape,
  never the algorithm's name (3.2).
- **Precedence**: the lower row's "Move above" button was a verb in the body; reordering is
  dragging in the tree (3.5).
- **Combine sets** was offered in the several-rows inspector body; it is in that inspector's
  "..." (3.8a).
- **Capture presets** are labeled by what they produce ("For print (PNG, 4x)"), so the
  element's `print` capture preset is not confused with the Everything row's Print look (12.1).
- **Settings > Performance** reads the limits from the element's exported `DEFAULT_LIMITS`,
  never typed numbers (12.3).
- **One-home table** gains Neighborhood, the Edit menu's selection commands, and attribute roles
  and levels (home: Read as) (17).
- **Register rows added**: `setCameraMode` (plumbing: `viewMode` only); navigation speeds behind
  `getCameraController()` (gap, with the keymap); the element's hover highlight (gap: not
  configurable); draw-only hide and collapsed drawing (gaps); the weight and label paths after
  load (home: Read as); a graph-wide weight meaning (gap); legacy 1.x method spellings
  (plumbing); explain over several elements (gap) (18.1, 18.2, 18.3, 18.7, 18.9, 18.10, 19).

## Review changes (skeleton review, version 2)

Six studio reviews of the clickable skeleton (Figma interaction, information architecture, the
graphty-element API, visual design, accessibility, ontology) and a crawl of every route. All are
studio decisions unless marked as the owner's. What changed, by the owner's questions:

- **Every styling option (question 1).** The Everything row lists all 35 properties with their
  effective values, collapsed to one-line summaries; other rows still show only what they set,
  with "+" and search. The Look moved to the graph's Canvas section (sections 3.7, 5.3, 16.3).
- **Rename by double-click (question 2).** One click selects the row in place without redrawing
  the tree, so a double-click at normal speed renames. A run's group ("Community 3") offers Keep
  as set instead of a field. No banner is drawn above the tree (section 3.10).
- **Why this look (question 5).** Built from `styles.explain()`: the Everything line wins only
  what the defaults still win (the shape, icosphere), and the Selection line is a halo, shown on
  nodes only (section 5.4).
- **Toolbar (question 6).** The Select caret is hidden until Lasso ships; Quick actions is named
  as the one exception to the membership rule (section 2.3).
- **Cameras and views (questions 7 and 8).** The Camera menu's face names the current view
  ("Unsaved view", "Front"), never the Fit command; Views has labeled Save view and Present
  buttons, Record tour... in "...", and the order and In tour marks carry the element mark
  (sections 4.1, 9).
- **One home (question 9).** "Show members in table" is only in the row menus; filtered-out
  nodes drawn faintly moved from Filters to the Canvas section; the graph inspector no longer
  repeats Data's attributes and last import; the legend shows only the element's legend entries,
  starts as its chip when three or more rows paint, and has no prose or verb (section 17).
- **Settings (question 10).** Per-device display settings are stated not to be styling
  (section 17); Diagnostics is an ordinary section.
- **Right sidebars (question 11).** Every kind keeps a two-line header; status sentences open the
  body; the Selection row uses the same Paints line and property section as every row; long
  explanations became one-line marks with tooltips; the paint-order line is one sentence; the
  measure binding block starts closed; the seed's Reshuffle moved to "..."; the path row's body
  holds no command link; tree status lines lost their verbs to the row menu and state bar
  (sections 3.11, 5.1, 5.3).
- **Money is not special (owner, 2026-09-29).** Amounts are plain numbers named after their
  column; the attribute's type is Number; no column total (the element reports ranges, not sums).
- **Keyboard and screen readers.** The tree, tabs and toolbar are single Tab stops with arrow
  keys; overlays return focus to their opener; Settings keeps Tab inside it; single-letter app
  keys fire only from the page or the canvas and obey the Settings switch; the inspector's name
  takes F2; collapsible section heads are headings holding a toggle.
- **Design notes.** "Open question" and "needs graphty-element" share one dashed annotation chip,
  and the review bar can hide them all for the persona build.

Not taken, with the reason:

- **Readings-only runs out of the tree** (information architecture). The owner decided every run
  is a row; a readings-only run keeps its gauge row (section 3.2). The at-rest tree no longer
  shows a Density row, because density at load is an Overview reading, not a run.
- **"New graph from" moved to Data > Sources** (information architecture). Section 17 keeps the
  Graphs switcher as its home: a derived graph is a graph, and the owner's Tableau question is
  answered for sources in section 2.4.
- **Compute leaves the graph's state bar** (information architecture). The state bar is the
  documented one verb in a body (section 5.1); the canvas menu's entry is a door.
- **Readings as one readings-only run row** (ontology). Section 3.2 keeps "the overview adds no
  rows"; the four readings are filed as element statistics instead (section 19).

## Review changes (skeleton review 2)

A second round of the same six studio reviews and a crawl of the skeleton after version 2. All
are studio decisions; none is the owner's. By the owner's questions:

- **Every styling option (question 1).** Everything is one body with no tabs: a Paints line, one
  mark that its values are stand-ins until the element publishes descriptor defaults, and every
  section collapsed to name-and-value summaries of what is not none or off ("Color #6366F1 .
  Shape icosphere"). Its "+" is gone (every property is already listed) and an empty More section
  is hidden. Every row now shows the Nodes | Edges switch with counts, so any row can style edges
  (sections 5.2, 16.2, 16.3). The run row's Style tab is the shared component with Fill color
  bound to its groups; palette, order, exceptions, overflow and Level sit in the binding block.
- **Rename (question 2).** Double-clicking "Myriel to Javert" now renames: it opened a transfers
  frame that redrew the tree between the two clicks; it has its own Les Miserables state. A
  refused rename's notice no longer lingers on the next screen.
- **Notes (question 4).** Notes starts under Selection but drags like any row, so a look on noted
  elements does not outrank the analysis rows unless the reader puts it there (sections 3.4, 3.7).
- **Why this look (question 5).** One component on every kind (heading "Why this look", winning
  rows, the covered line, then any mark); the Selection token is "highlight" (color, scale,
  opacity), not the app word "halo"; layer names read as text and underline on hover (5.4).
- **Cameras and views (questions 7 and 8).** One saved-view list feeds the Views place, the
  Camera menu jump list, Export, Present and Quick actions (the doors had used other names). The
  face names the view ("Front"); in 2D the menu lists no built-in views; a saved view keeps its
  mode. "Save camera view..." is the command's name everywhere, so Quick actions finds it by
  "camera" (section 9). The Views place's order and In tour marks are labeled a temporary
  workaround in the code, pending the element's ordered preset collection (section 19).
- **One home (question 9).** The main menu is the app and the project-name menu is this project:
  Save, Save as and Export left File (10.1, 10.2). Add node's home is the canvas menu, not Sources
  "+" (17). The graph's Statistics links to each run's readings instead of repeating them, and the
  "modularity of group" reading is gone (5.3). A group row names its source once, in the header.
  The run's Data tab shows community sizes, not the list the tree already shows. Group 2 and Group
  8 in the folder are kept sets (the set icon, "(kept)"), since a group is locked to its parent.
- **Settings (question 10).** "Your name" sits under its label; the single-key switch in
  Accessibility now also stops the toolbar's V key (WCAG 2.1.4).
- **Right sidebars (question 11).** The graph's inspector has Style (Canvas, Layout) and Data
  (Overview, Statistics, Made with, Notes) tabs like every kind, and no button at rest: Compute
  the overview is in "..." and Quick actions, and the state bar appears only when a filter changed
  the scope under computed readings (5.1, 5.3). This reverses the previous round's "not taken":
  four of six reviews found a standing button on the default screen contradicts "the right side
  shows properties, not verbs". Changing a layout setting is editing a property; Re-run layout is
  a verb on the layout chip. One Paints line component (icon, sentence, count link) opens every
  painting row. Provenance that does not fit shows whole in a tooltip. Prose left in bodies became
  tooltips (Resolution, Level, several rows' Mixed).
- **The element.** Filtered-out nodes drawn faintly is a working switch: the element has it as
  `visibility.showContext` (removed from section 19). Findings report and Methods text carry the
  needs mark (no run-record methods writer yet). Export > Figure's labels read "As on the canvas
  (Hide overlapping labels: Off)", not the removed label budget. Section 16.1's count is 14 node
  properties (13 drawn) and 21 edge.
- **Keyboard and screen readers.** F6 and Shift+F6 cycle rail, left panel, canvas, toolbar,
  table and inspector in visual order; a "Skip to app" link passes the review bar; tabs are linked
  to their panel; the eye is "Show <row> on the canvas", pressed while shown; rename announces
  "Renamed to", "Name unchanged" or "Rename cancelled"; menu key hints are hidden from speech and
  given as `aria-keyshortcuts`; saved views and Analyze's recent entries have no control nested
  inside another; the View mode caret is named "More view modes: VR and AR"; a menu opened from a
  direct link focuses its first item. A click on empty canvas clears the selection.

Not taken, with the reason:

- **Move Transfers into a second graph of the Les Miserables project** (ontology). The header
  already names the Transfers project whenever the Data place shows it; the two data sets are two
  projects.
- **Show which graph each saved view frames** (ontology). Right when a project holds two graphs;
  the fixtures' projects hold one, so nothing would show. The rule is recorded here for the build.
- **A first-use hint for the Camera menu** (API review). The face now carries the view's name and
  a screen-reader name, and Quick actions finds "Save camera view"; a first-use hint is left to
  the first-use pass (section 11) so hints are designed together.
- **Resize Settings to its content** (visual review). One fixed size keeps the section list from
  jumping as sections change; only the You field moved.
