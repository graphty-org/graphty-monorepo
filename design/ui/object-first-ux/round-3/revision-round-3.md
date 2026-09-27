# Round 3: the key functions, drawn

Round 2 of the object-first design (`../round-2/revision.md`, fifteen screens in
`../mocks/v2/`) drew the layout, the object tree, the inspector, the toolbar and the timeline.
It left out much of what the app needs in order to work at all, and many of the analysis and
drawing features a reader relies on. The plainest case: once a graph was loaded, no screen
showed how to open another file. The file menu was described in words but never drawn.

This part of the design closes those gaps. Each function now has a drawn way in (the button,
menu row or key, called the _entry point_) and a drawn _main state_ (what the reader sees once
there). It is written for an engineer who is not a designer; design words are defined in
section 1. Nothing here changes code.

Where the detail lives:

| Area                                  | Design document           | Screens           |
| ------------------------------------- | ------------------------- | ----------------- |
| Files, projects and sessions          | `file-project.md`         | 13, 16-21         |
| Getting data in                       | `import.md`               | 1, 14, 22-32, 101 |
| Editing and joining data              | `data-editing.md`         | 33-42             |
| Undo, history, errors and recovery    | `history-errors.md`       | 43-48, 102        |
| Finding, moving around and selecting  | `navigate-select.md`      | 49-58             |
| Filters, sets and paths               | `filters-sets.md`         | 59-68             |
| Analysis results, time and comparison | `analysis-results.md`     | 69-82             |
| Layout, look, export, Present and VR  | `visualization-export.md` | 83-100            |

The gap register, with every gap's source and resolution, is `gaps.md`. The mocks are
`../mocks/v2/screen-N.png`, grouped by area in `../mocks/v2/index.html`.

---

## 1. Words used here

- **Object**: a row of the left panel's tree (a Set of nodes or edges, a Measure giving every
  node a value, a Grouping and its Groups, or the Dataset at the root).
- **Inspector**: the right panel; it shows the selected thing's header block and tabs.
- **Popover**: a 240 px light panel of options opened from a button. **Dialog**: a centred panel
  over a grey veil (the _scrim_) that waits for an answer. **Menu**: the dark list that drops
  from a button or opens on a right-click.
- **Secondary bar**: the dark one-line sentence above the toolbar while a tool is armed.
- **Dock**: the drawer under the canvas with the Table, Assistant and History tabs.
- **Status bar**: the 24 px strip at the bottom; a **chip** is one item on it.
- **Stale**: a result whose inputs changed since it ran; it keeps its old values, dims its
  name and carries an amber dot until re-run.
- **Inset** (in the mocks only): a second moment of the same screen drawn as a card with a dark
  tag above it, for example the failure beside the normal case. A dark tag above a menu, "A
  moment before", means the menu led to the state drawn beside it.

## 2. What was missing

The review looked for every function that is either needed for the app to work end to end
(getting data in and out, saving and reopening work, undo, finding things, moving around,
selecting, settings, errors and recovery, large data) or is an analysis or drawing feature
(algorithms, filters, paths, comparison, time, layouts, styling, labels, legends, 3D and VR,
export, notes). Onboarding, wizards, suggestion cards and tips were left out on purpose. A
function counted as missing when no mock drew both its entry point and its main state.

It found 99 such gaps:

| Area                                  | Gaps | The ones that most stopped the app from working                                                                                                                      |
| ------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files, projects and sessions          | 8    | the file menu after a load (Open..., Open recent, Open sample); unsaved-work warning; save and reopen a project; recovery after a closed tab                         |
| Getting data in                       | 14   | a drop on a loaded graph and what it does to the current graph; paste; load from a URL or a database; a load that fails; progress with Cancel; files too big to draw |
| Editing and joining data              | 11   | the import report's rejected rows; editing a value; joining a table; removing and merging nodes                                                                      |
| Undo, history, errors and recovery    | 6    | undo and the History dock; a failed run with Retry; stale results; a lost graphics context                                                                           |
| Finding, moving around and selecting  | 15   | Find (Ctrl+F); right-click menus; 3D framing; box selection; Focus; keyboard-only navigation                                                                         |
| Filters, sets and paths               | 10   | filter by values, range and rule; edge filters; neighbours; combining Sets                                                                                           |
| Analysis results, time and comparison | 16   | a result's values and histogram; the record of how it was made; over-time charts; side-by-side comparison                                                            |
| Layout, look, export, Present and VR  | 19   | choosing and running a layout; labels; the Export menu and image, data, report and video export; Present mode                                                        |

## 3. What the design now does, area by area

Each paragraph states the rule; the area's document has every row, key and error.

### 3.1 Files, projects and sessions (screens 13, 16-21)

The dataset name at the top left opens the **file menu** (screen 16): Open... (Ctrl+O), Open
recent, Open sample, Add data..., Open as a second graph..., Save project (Ctrl+S), Save
project as..., Close dataset, Run a recipe..., Import styles..., Present, Settings...,
Keyboard shortcuts, Help. Unsaved work shows as a dot after the name. One rule decides every
prompt: no unsaved work, no prompt; otherwise one dialog lists what would be lost, counted
(screen 17). A **project file** (`.graphty`) holds the objects, Views, notes and positions, with
the data included or linked (screen 18). **Autosave** restores the session after a reload
without asking and says so in the status bar with Start empty and Undo restore (screen 19); the
Welcome sheet's Recent list shows sessions and projects. A **recipe** replays last week's steps
on new data, checking each step first (screen 20). **Two graphs** in one session appear as two
Dataset roots, matched by a column and combinable by union, intersection or difference (screen
21). **Settings** is one dialog of folding sections (screen 13).

### 3.2 Getting data in (screens 1, 14, 22-32, 101)

Every way in opens **one Import dialog**: a file, a URL, pasted text (Ctrl+V on the canvas), a
database or service (Neo4j, STRING), a drop, Ctrl+O. Its four tabs are File, URL, Paste and A
source. With a graph already open it asks **Into**: Replace, Add to current graph, Add
attributes to its nodes, or Open beside to compare; Add runs a dry run and applies a rule for
ids that already exist (screen 26). Dragging a file over the canvas outlines the stage and loads
nothing until the drop (screen 101). Column roles are selects of the file's real columns;
parsing options and unreadable rows are shown before the load (screen 25); a nodes file joins an
edges file (screen 24). A load that fails says why where it started and changes nothing (screen
27); a long load shows progress and Cancel in three places (screen 28). A file larger than this
machine can draw asks for a subset first (screen 29), and a graph drawn over the ceiling says so
with an amber chip and turns off what it must (screen 30). A URL reload that fails keeps the
last good copy (screen 32).

### 3.3 Editing and joining data (screens 33-42)

Every data edit follows the same rules: one undo step; the status bar reports it with Undo;
results that read the changed data re-run if cheap or turn stale if not; the file on disk is
never written; a reload re-applies the edits; Delete on the canvas or in the table removes data
and always asks first. The import report lists rejected rows in a Rejected tab of the table
(screen 33); load rules can be changed after a load (screen 34). A column's menu (screen 35)
colours, sizes, filters, sets roles and edits (change type, fill, rename; screen 36). Tables join
by a key column, with identifier mapping when the key systems differ (screen 37). A formula
makes a new column (screen 38). Values edit in place in the table and on a node's Attributes tab
(screen 39). Nodes can be removed (screen 40), merged (screen 41), expanded from a server and
added by hand (screen 42).

### 3.4 Undo, history, errors and recovery (screens 43-48, 102)

Ctrl+Z and Ctrl+Shift+Z undo and redo; the **History** tab of the dock lists every step with who
made it and offers Restore to here (screen 43). An object's right-click or "..." menu renames
(F2), duplicates, re-runs, focuses, exports, moves and deletes; delete asks only when other
objects depend on it (screen 44; rename and drag to reorder, screen 102). A **failed run** shows
a red dot, the cause and Retry, and a separate "Retry on the CPU" that states its cost, so
nothing falls back to the CPU without the reader choosing it (screen 45). **Stale** results say
what changed and offer Re-run (screen 46). A lost graphics context blanks the canvas with Reload
view while the tree and inspector keep working (screen 47). A tool that finds nothing says so
and offers the next step, and stays armed (screen 48).

### 3.5 Finding, moving around and selecting (screens 49-58)

Right-click opens, for whatever is under the pointer, the same list as the inspector's "..."
with select and route verbs added (screen 49). **Find** (Ctrl+F) turns the Objects header into a
search field and lists objects, nodes and matching values; a value match can become a Set
(screen 50). The **framing menu** under the zoom pill fits, zooms and picks the 3D views (screen
51). A **minimap** appears on request (screen 52); **saved Views** keep camera, mode and what is
showing (screen 53); **Follow** keeps a moving node centred (screen 54). A Shift+drag box
selects many; the several-elements inspector selects all, none, inverts, adds the edges between
and hides (screen 55). Edges are reached through the table's Edges tab and have their own
inspector (screen 56). **Focus** shows only a Set's members and runs tools inside it (screen 57).
The keyboard alone can walk the graph with a focus ring and a spoken caption (screen 58). The key
set is settled in `navigate-select.md` ("The key set, settled").

### 3.6 Filters, sets and paths (screens 59-68)

Filter by values (checklist with counts), by range over a histogram, or by rule (built as lines
or typed as an expression, with inline errors), on nodes or on edges; every filter previews
before Create and its Set keeps the rule editable on its Define tab (screens 59-62). Pattern
search and All routes each make one Set, stepped through with Tab (screens 63, 67). The
Neighbours tool shows the size at 1 and 2 steps before it runs (screen 64). Combining two Sets
shows each result's size before choosing, and Subtract states its order in words (screen 65). A
Set's Members tab reads a path or group result (screen 66); a hand-made Set's members are
edited in place (screen 68).

### 3.7 Analysis results, time and comparison (screens 69-82)

A result opens on what it found: a Measure's values and histogram, from which a Top N or a band
becomes a Set (screen 69); two Measures plotted against each other in a floating panel (screen
70); a Grouping's modularity and group names from a column (screen 71), and groups collapsed
into a summary graph (screen 72). The **Record** tab says how a result was made and exports it
(screen 73). Several runs and parameter sweeps (screen 74) and runs on part of the graph
(screen 75) are chosen in the secondary bar. Results with no members (distances, likely missing
links) land in a Findings list and in the table's **Findings** tab, which is also the one home
for charts over time (screens 76, 79, 80). What breaks if a node is removed is a preview (screen
77). Two objects compare side by side in two panes with one camera (screen 78). Notes attach to
anything and can show on the canvas (screen 81). The Assistant tab shows the conversation, the
commands it ran and the objects it made (screen 82).

### 3.8 Layout, look, export, Present and VR (screens 83-100)

The Dataset's **Layout** tab chooses the layout, pauses, steps and re-runs it, and can arrange
one Group alone (screens 83-85); dragging a node pins it (screen 86). The **Canvas** tab sets the
look, labels, tooltips and whether hidden nodes show faintly (screens 87-89). Styling by values
covers diverging palettes, edge widths, shapes and single nodes, and styles can be saved and
imported (screens 90-94). The Export button opens a menu and the **Export sheet**, which takes the
right panel's place with tabs for Image, Data, Report and Video (screens 95-98). **Present**
hides every panel and steps through saved Views (screen 99). VR asks what to take into the
headset and marks what was made there (screen 100).

## 4. New surfaces

Nearly everything above lives in places round 2 already had. The additions:

| Surface                                                | Why it could not live elsewhere                                               | Screens            |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------ |
| The Export sheet (replaces the right panel while open) | a popover would hide the graph being framed; a dialog would freeze the camera | 95-98              |
| The scatter-plot panel (480 x 360, floating)           | a plot needs a near-square area with the canvas visible for brushing          | 70                 |
| The minimap card                                       | it must stay visible while the reader pans                                    | 52                 |
| The table's Rejected and Findings tabs                 | tables and charts wider than 240 px need the dock's width                     | 33, 74, 76, 79, 80 |
| A second Dataset root in the tree                      | two graphs in one session                                                     | 21                 |
| Two canvas panes                                       | comparing two objects or two time windows                                     | 78                 |
| The drop outline on the stage                          | the moment before a drop, which loads nothing by itself                       | 101                |

## 5. Amendments to round 2

These round-2 sections are amended by this part; where they disagree, this part wins.

| Round-2 place                                      | Change                                                                                                                   | Specified in                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `revision.md` 1.3, the file menu                   | rows, groups and shortcuts of screen 16; the unsaved dot                                                                 | `file-project.md` 1, 3                            |
| `revision.md` 1.5, 3.3                             | the framing menu, 3D, Find, selection verbs and the settled key set                                                      | `navigate-select.md`                              |
| `revision.md` 2.4, Dataset > Overview              | a Project row first; the Import report opens to its rows and "See in table"                                              | `file-project.md` 3; `data-editing.md` 1          |
| `revision.md` 2.4, Dataset > Data                  | attributes split into "On nodes" and "On edges"; the column menu's four groups; the ATTRIBUTES "+" menu                  | `data-editing.md` 3, 4, 8, 9                      |
| `revision.md` 2.4, Dataset > Layout and Canvas     | the rows of screens 83 and 87; Apply to; Show hidden faintly                                                             | `visualization-export.md` 1, 2                    |
| `revision.md` 2.4, several elements, Node and Edge | the Data verbs; Select all, none, invert, edges between, hide; the edge inspector                                        | `data-editing.md` 6, 7; `navigate-select.md` 9-12 |
| `revision.md` 2.4, Set, Measure, Grouping tabs     | Define and Members of screens 59-68; Values, Groups and Record of 69-73                                                  | `filters-sets.md`; `analysis-results.md`          |
| `revision.md` 3.4, 3.5                             | the Filter, Neighbours and Path bars; a run's scope as a select; the bar's filled button dims while a popover carries it | `filters-sets.md`; `analysis-results.md` 8        |
| `revision.md` section 4                            | failed and stale states and their actions                                                                                | `history-errors.md` 3, 4                          |
| `revision.md` 5.6, 6.3, 6.8                        | saved styles at the foot of every Style tab; the Export sheet                                                            | `visualization-export.md` 3.5, 4                  |
| `revision.md` 6.1                                  | the over-time chart lives in the table's Findings tab only                                                               | `analysis-results.md` 13                          |
| `revision.md` 6.12, Settings and Import options    | Settings as one folding dialog; the import rules dialog                                                                  | `file-project.md` 8; `data-editing.md` 2          |
| `screens.md` screens 1, 13, 14                     | four ways in and a Recent list; Settings drawn; the Import dialog's tabs, Options, Node id and Label                     | `import.md`; `file-project.md`                    |
| `object-model.md` section 9, Import                | four sources; Into is a four-way choice                                                                                  | `import.md` 1                                     |
| Keys                                               | Rename is F2 (Ctrl+R reloads the browser page); Ctrl+I inverts; Shift+1 fits                                             | `navigate-select.md`; `history-errors.md` 2       |

## 6. graphty-element work this needs

Everything a screen shows is read from graphty-element; the app computes nothing over nodes and
edges. Sizes are rough: small is days, medium one to two weeks, large more. Items already in
round 2's list (`../round-2/revision.md` sections 8 and 9.3) are not repeated.

**Large**

- The project document: save and reopen with a restore report (#301).
- Several datasets in one session, and combining two by a match column (combine alone is medium).
- Collapsed rendering of groups (summary nodes, merged edges, expand in place).
- A second renderer for side-by-side comparison (#186).
- Pattern matching as a run (`data.match`; needs an issue).
- Subset loading (busiest N, largest part, neighbourhood, time window) with a memory estimate
  (medium to large).

**Medium**

- A staging load, so a failed or cancelled load never damages the open graph.
- Autosave and its list, restore and remove.
- The recipe: export, check against new data, apply.
- Enforcing the render ceiling and reporting what is drawn; performance mode (#302).
- Neo4j and STRING readers (#303 to #308).
- Column commands (rename, retype, fill, replace, split, remove) with dry runs; merge and
  duplicate finding; join (#298); an identifier-mapper registry; the formula evaluator
  (`data.compute`).
- The history journal with undo, redo and restore (#145); reloading a lost view.
- Text search with the matching field (#149); box and lasso selection; the minimap (#293);
  edge picking (#319); filters evaluated within a Focus; a keyboard navigation mode.
- Parameter sweeps (#194); per-step runs over time (#300); matching groups across runs.
- A public layout controller and layout over a scope (#144); looks (#331); graph-io's
  exporters wired into the format catalogue; the report (#187); layout and time as video
  sources; the legend drawn by the element (#292).

**Small** (each a day or two): cancel through `AbortSignal` (#296); the same-id rule and dry run
for Add (#337, #297); reader options and a connection test in the format descriptor; reasons on
fetch failures; `data.reload()`; journaled data edits; the rejected-records list; missing-end and
self-loop load rules; `expand(id)`; a change counter since the last save; restore-a-result;
per-object style reset; stale through parameters and links; `element.diagnostics()`; an empty
path's reason; `zoomToNodes`; the camera's framing name; follow (#183); a hide list; edge lists
by id (#297); value distributions; a transient preview; rule parse and format; edge filters and
the neighbourhood options; name lookup without selecting; editing a fixed Set's members; rank
correlation; group names (#191); between-group counts; methods text; per-object export (#178);
distances (#310); removal impact (#311); notes and markers (#145, #295); pins; label text from a
column; the hover-highlight layer; edge encodings and legend blocks; shape lists; framing a
capture by a View; entering XR with a scope.

## 7. Decisions for the owner

Most choices in this part are reversible and are made in the area documents with their reasons.
These are not:

1. **The project file format** (one-way door: a published data format). Recommendation: a JSON
   document that is the objects API's saved form plus Views, notes and positions, with the data
   either embedded or linked by a fingerprint, saved as `.graphty`. Confirm before #301 starts.
2. **The recipe format** (one-way door: a published data format). Recommendation: the project
   document's steps without data or positions (`.recipe.json`), so one schema serves both.
3. **The new public session calls** (one-way door: published API). About thirty new members
   (for example `data.distribution`, `data.find`, `data.update`, `data.join`, `data.compute`,
   `data.expand`, `data.reload`, `data.export`, the autosave and layout controllers).
   Recommendation: review their names and shapes together in one pass before the first is
   built, and ship each behind the objects API rather than as element attributes.
4. **Two datasets in one session** (a large change to the session model, costly to undo).
   Recommendation: build "combine two files into a new graph" first, which needs no second live
   root, and decide on two live roots after readers use it.
5. **Autosave keeps data files up to 50 MB in the browser** (reversible, but it stores the
   reader's data locally). Recommendation: keep it, with the limit in Settings and a line in the
   Recent list when a file was too large to keep.

## 8. The screens

| Screen | Shows                                                                                    |
| ------ | ---------------------------------------------------------------------------------------- |
| 16     | the file menu open, Open recent beside it                                                |
| 17     | save changes before replacing; Close dataset                                             |
| 18     | Save project; reopening one whose data is missing; the saved state                       |
| 19     | the session restored after a reload; the Recent list                                     |
| 20     | a recipe checked and run on a new file                                                   |
| 21     | two datasets in one session                                                              |
| 13     | Settings                                                                                 |
| 1, 14  | the Welcome sheet's four ways in; the Import dialog                                      |
| 22     | import from a URL, and its failures                                                      |
| 23     | paste, and a line that does not parse                                                    |
| 24     | an edges file and a nodes file                                                           |
| 25     | import options and unreadable rows                                                       |
| 101    | a file dragged over a loaded graph                                                       |
| 26     | a file dropped on a loaded graph: Into and the same-id rule                              |
| 27     | a load that fails                                                                        |
| 28     | a load in progress                                                                       |
| 29     | a file above the render ceiling: choose a subset                                         |
| 30     | a graph drawn over the ceiling                                                           |
| 31     | import from Neo4j; STRING                                                                |
| 32     | a URL reload that failed                                                                 |
| 33     | the import report and the Rejected tab                                                   |
| 34     | import rules after a load                                                                |
| 35     | a column's menu                                                                          |
| 36     | change a column's type                                                                   |
| 37     | join a table, with identifier mapping                                                    |
| 38     | a new column from a formula                                                              |
| 39     | editing a value                                                                          |
| 40     | remove nodes from the data                                                               |
| 41     | merge two nodes                                                                          |
| 42     | expand from a server; add and connect a node by hand                                     |
| 43     | the History dock after an undo                                                           |
| 44     | the object menu and the delete that confirms                                             |
| 102    | rename in place and drag to reorder                                                      |
| 45     | a failed run                                                                             |
| 46     | stale results after new data                                                             |
| 47     | the graphics context lost                                                                |
| 48     | a tool that finds nothing                                                                |
| 49     | right-click menus                                                                        |
| 50     | Find                                                                                     |
| 51     | 3D and the framing menu                                                                  |
| 52     | the minimap                                                                              |
| 53     | saved Views                                                                              |
| 54     | following a node                                                                         |
| 55     | box selection and the several-elements inspector                                         |
| 56     | the Edges table and the edge inspector                                                   |
| 57     | Focus                                                                                    |
| 58     | the keyboard on the canvas                                                               |
| 59-62  | filter by values, range, rule; edges                                                     |
| 63     | pattern search                                                                           |
| 64     | the Neighbours tool                                                                      |
| 65     | combining Sets                                                                           |
| 66     | a path's Members tab                                                                     |
| 67     | all routes, the end typed by name                                                        |
| 68     | editing a hand-made Set                                                                  |
| 69-73  | a Measure's values; a scatter plot; a Grouping's groups; a summary graph; the Record tab |
| 74-77  | batches and sweeps; run scope; findings; what breaks if removed                          |
| 78-82  | comparison; over time; communities over time; notes; the Assistant                       |
| 83-86  | the Layout tab; Tree; arranging one group; pinning                                       |
| 87-89  | the Canvas tab; labels; hover                                                            |
| 90-94  | diverging palette; edge width; shapes; one node; saved styles                            |
| 95-98  | Export: image, data, report, video                                                       |
| 99     | Present mode                                                                             |
| 100    | entering and leaving VR                                                                  |
