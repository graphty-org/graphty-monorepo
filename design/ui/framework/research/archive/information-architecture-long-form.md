# information-architecture, long form (superseded 2026-09-27)

This is the long form of `information-architecture.md` before it was split. **It is a record and
binds nothing.** Every decision in it that still holds has been copied, as text, into the live
document named below; anything not copied is withdrawn. Its section numbers are the ones older
citations use. This table is the only migration map for it.

| Section here | Now |
|---|---|
| Intro | `information-architecture.md` 1 |
| 1, rules 1, 2, 3, 7, 8, 10 | `information-architecture.md` 2; rule 10's follow-and-hold: `conceptual-model.md` 7.2 |
| 1, rule 4 (Shift+click, "Select"), rule 9's keeping verbs | `interaction-patterns.md` |
| 1, rules 5, 6 and 9 (rows, verb cap, popover width) | `interface-specification.md` |
| 2, the frame | places: `information-architecture.md` 4; widths, positions and Preferences contents: `interface-specification.md`; notices: `content-design.md`; Minimize UI, autosave, Delete never asks, focus regions: `interaction-patterns.md`; autosave storage and the GPU policy: `element-contract.md` |
| 3, the rail | collections and schemes: `information-architecture.md` 3; panel anatomy: `interface-specification.md`; row behaviour and running from the catalogue: `interaction-patterns.md`; run-state marks: `state-matrix.md`; argument and parameter rows: `options-and-encodings.md` |
| 4, the inspector | the per-selection table, the result editor's per-kind table, Appearance, Used by and the other editors: `interface-specification.md`; the style-layer editor: `options-and-encodings.md`; pairs and candidate edges: `interaction-patterns.md` |
| 5, the table | tabs, columns, menus and the histogram: `interface-specification.md`; the aggregate list: `element-contract.md` |
| 6, export | output homes: `output-homes.md`; the Export section, dialog and formats: `interface-specification.md`; report and methods text: `element-contract.md` |
| 7, secondary homes | `output-homes.md` 1; Manage views is replaced by the Graph panel's Views section, reorderable (`information-architecture.md` 3); "Duplicate, then Replace data" as the only reuse route is withdrawn (`information-architecture.md` 11) |
| 8, comparison and time | `task-flows.md` |
| 9, the filter chip | where scope is stated: `information-architecture.md` 8; width arithmetic: `interface-specification.md`; steps over items: `conceptual-model.md` 4.4; legend clicks, now selecting rather than filtering: `interaction-patterns.md` |
| 10, prominence and wayfinding | the prominence rule and wayfinding: `information-architecture.md` 2 and 5; steps per task: `task-flows.md`; mark priority: `content-design.md`; the view menu: `interface-specification.md`; the secondary outline: `visual-language.md` |
| 11, one home per output | `output-homes.md` 2; key matching: `element-contract.md`; the paste rule: `interaction-patterns.md` |
| 12, what the element must publish | `element-contract.md` 13 and "Further element needs"; the fields it adds to the file: `element-contract.md` 11 and `one-way-doors.md` 38 |
| 13, counted states | word counts: `content-design.md`; heights and targets: `interface-specification.md`; the method: `research/study-schedule.md` |
| 14, what is open | owner decisions: `one-way-doors.md` 4 and 5; the tests: `information-architecture.md` 12 and `research/study-schedule.md` |
| Appendix, gap register | rejections and deferrals still held: `output-homes.md` 5, "Rejected and deferred", which also names the ones withdrawn; the rest of the register is superseded by `output-homes.md` 2 |

---

# Information architecture

This document places every part of the graphty app. It names each surface and the one question
that surface answers, gives every output exactly one home, and states the few rules that generate
those homes. It settles what the nav rail holds, what the inspector shows for each kind of
selection, where results and their items are read, where secondary objects live, where a reading
lives before it is kept, and how the analyst knows where they are.

graphty is laid out like the Figma editor: a nav rail and left panel, the canvas, a right-hand
inspector, a small floating toolbar at the bottom centre, a command palette. That layout is already
decided. This document decides what goes in it. Every placement follows from three sources, in this
order:

- **The ontology** in `conceptual-model.md`. The primary objects are the graph, nodes, edges, sets,
  paths, and the items of a result that are subgraphs: groups and found paths. Pairs and
  saved comparisons are items too, but they fail the primary-object test and are table rows, never
  selected objects (`conceptual-model.md` 1). Results, style layers, notes and views are secondary,
  and are never listed or selected as if they were graph objects (`principles.md` 3).
- **The top-task ranking** in `top-tasks.md`. Rank decides how close a task sits to the analyst's
  attention. It does not buy a task its own chrome.
- **Figma's placement rules** (`research/figma.md` 4.1, 4.2, 4.14, 4.15). Where Figma has solved a
  placement problem, graphty solves it the same way. Every departure is a row in the departures
  table in `principles.md`, with the reason that forces it.

The graphty app only draws what graphty-element publishes. Every surface reads one collection or
one piece of state from the element's session and never assembles it itself. Where a surface
needs something the element does not yet publish, that is an element change, listed in section
12, and never app code.

Every word this document puts on screen is a row in `glossary.md` or a value. A new screen string
enters here only with its glossary row.

## 1. The rules that generate the homes

Ten rules produce almost every placement below. A placement that no rule produces is either a
recorded departure or a mistake.

1. **One output, one home; many routes.** An output is something the analyst reads: a table, a
   figure, a count, a list, a chart. Each has one home. A capability file that bundles several
   outputs is split, and each part names its output (section 11). Where one output takes
   different inputs, each case names its home once ("one home per case"). The context menu, the
   main menu, the command palette, keyboard shortcuts and Find are routes, never second homes; so
   is a surface that shows the home's rows filtered to one target, as an object's Notes section
   shows that object's rows of the Notes panel.
2. **An output's home is where it is read.** Where it is launched is a route. The catalogue
   launches betweenness; the betweenness result editor is its home. A command with no object to
   start from follows the same rule: a load's home is the import report it produces, a
   transform's home is the new graph, and the main menu that launched either is a route.
3. **One surface for one thing, one surface for many.** The inspector shows one thing (or one
   selection). The table in the bottom dock shows many rows of any collection graphty-element
   publishes: nodes, edges, and the items of a result.
4. **A count opens the table on the tab of the thing it counts**, and keeps the selection. A bar
   or point of a chart that counts elements is a count too (a histogram bar, a window's arrivals
   in a series). Shift+click adds the counted elements to the selection, Figma's meaning of Shift;
   "Select" in the count's menu replaces the selection with them. A node's degree counts edges, so
   it opens the Edges tab on its incident edges, with the other endpoint as a column; its neighbor
   count opens the Nodes tab on its distinct neighbors. A set's cut-edge count lists the cut
   edges, the component count opens the Components result, the isolates count lists the isolates.
   The **number** is that route; a click anywhere else on the row, its name included, opens the
   reading's editor (a departures row in `principles.md`). Under an active filter, every count of
   a kept object reads "shown of total" ("12 of 40"), because the object is defined on the full
   graph and the filter only narrows what is shown.
5. **Lists of other things show 3 or 4 rows, then "N more"**, which opens the table (for many
   elements or items) or expands in place (for style layers). A Members list is sorted by the most
   recently run metric, or by degree before any run; its heading's tooltip names the order, and
   "N more" opens the table sorted the same way. An object's **own** attributes are not such a
   list: computed values first (what the analyst just ran), then imported ones, about 10 at rest,
   then "N more", which expands in place under a filter field. The inspector scrolls as one panel
   and never nests a scrolling region, as Figma's does.
6. **Type rows carry at most three verbs**, chosen by top-task rank, as icon buttons with
   tooltips, the way Figma's type row does. The rest are in the type row's "..." overflow, the
   context menu and the palette. Destructive and tail verbs (Merge nodes, Remove, Delete) are never
   among the three. **Additional labels**, Figma's view-menu toggle, adds the three verbs' names.
7. **Results are edited, never selected.** Every row in the Results panel opens an editor as a
   popover and the canvas selection stays, as editing a Figma style or variable leaves the frame
   selected. Items are selected; results are not.
8. **Attributes belong to what is selected; members are reached by selecting them.** An Attributes
   section shows the selected thing's own attributes: an element's, the shared values of several
   selected elements, or an item's own (a group's name, a match's verdict). "+" writes to exactly
   that: each selected element, or the item. A set has no attributes beyond its name and rule, so
   writing to its members is Select members, then "+", as Figma changes children by selecting
   them. **An item that is a subgraph acts like a set**: a group, a found path or a match has the
   set's type-row verbs, the boolean operations, a place in a multi-selection and the set's section
   tail (Appearance, Notes, Used by, Export). Its kind adds only its reading (size, length, match
   number) and at most one verb of its own. **An item that is not a subgraph is a table row**: a
   pair's row selects its two nodes, and a saved comparison's row reopens it where it was asked.
   Neither is selected, noted or exported as an object. Nothing is built for one item kind.
9. **A transient reading appears where it was asked; keeping it is a named verb.** An unsaved
   comparison, a what-if, a statistic's baseline and the input of a command ending in "..." appear
   in the editor popover beside the thing they started from; two selected objects are compared in
   their inspector. The popover is Figma's: 240 px wide, a column of property rows with at most one
   chart. A reading with two value columns shows its headline rows there and "N more" opens the
   table with A, B and difference columns; a reading that needs more room than that (a scatter
   plot, an import report) is read in the table or in Version history. The comparison surface is
   the only surface of its own, for two whole drawings (section 8.1). Anything that changes
   **which elements are counted** goes through the filter chip; display state (Collapse, an eye,
   labels, note markers) changes only the drawing, and a view captures it, except the note
   markers: a view carries its own list of the notes it shows. Keeping is always a
   verb from one family: Create set (a fixed set), Save as rule set, Save comparison, Create path,
   Save view.
10. **The project is live; an export is frozen.** Style layers, views and the object list
    follow the current run of each result (`conceptual-model.md` 7.2), as Figma's pages show the
    file as it is now. An export freezes what it wrote. A note holds the runs it cites and marks
    them "Earlier run" when they are no longer current. So the evidence for one investigation is
    its export, written before the pipeline is re-seeded for the next (section 9).

## 2. The frame: every surface and its purpose

Figma gives each side of the screen one fixed question: the left side answers "what exists?", the
right side answers "what is this?", the toolbar answers "what can I make by pointing?", and the
header answers "what do I do with the whole file?". graphty keeps all four.

| Surface | Question it answers | What it holds |
|---|---|---|
| **Nav rail** (left edge) | Which collection is the left panel listing? | The main menu, a separator, then **Graph** (Alt+1), **Results** (Alt+2), **Notes** (Alt+3) and, when an AI provider is configured, **Assistant** (section 3) |
| **Left panel** (240 px) | What exists? | The collection the rail chose. A project opens on **Graph**, as Figma opens on Layers, unless it has no kept sets or paths: then it opens on **Results**, because the object list would be blank and the every-session tasks 2 and 3 start there (a departures row in `principles.md`). Find (Ctrl+F) temporarily replaces the list, as Figma's Find does |
| **Canvas** | The work | The drawing, selection and hover outlines, note markers (Shift+C hides them all), one legend, and the status line only while something counted is not drawn. Nothing else floats on it except the toolbar and the Help button; the legend and the status line are departures rows in `principles.md` |
| **Header, row 1** (above the inspector) | What do I do with the whole project? | **Export...**, the one filled button. It opens the Export dialog (Ctrl+Shift+E) over the whole project, every row checked, as Figma's does. An object's own export is the button in its Export section, which names what it exports ("Export selection"), so the two never share a label (section 6) |
| **Header, row 2** | What is the whole canvas showing? | The **filter chip** in the slot where Figma has its Design and Prototype tabs, then the **zoom and view menu** (section 10) |
| **Inspector** (240 px, right) | What is this? | The selection's properties; with nothing selected, the graph's (section 4). Two modes change it until Done |
| **Editor popover** (240 px) | Detail for one row, or the inputs of one command | One device for every editor: a type row with its menu, a state line, property and input rows, the cost word and Run, then a body with at most one chart. It edits a result, a Statistics reading, a style layer, a note, the filter steps and layout settings; it takes the inputs of every command that ends in "..."; it shows the transient readings of rule 9. Opened from a row of the inspector or the chip, it sits left of the inspector, aligned to that row, as Figma's right-panel popovers do (`design/ui/figma/popovers-and-menus/README.md`, placement); from a left-panel row, right of the panel; from a menu or the palette, docked left of the inspector. One open at a time, with one nested picker (colour, palette) inside it |
| **Floating toolbar** (bottom centre) | What can I make by pointing? | **Select** (V; its flyout holds Select, **Lasso** (Q) and **Hand** (H), and Space is a temporary Hand; dragging on empty canvas with Select draws a box, as in Figma), **Path** (P), **Note** (C), the **command palette** (Ctrl+K), and the **view-mode button** showing its value ("3D"), which expands to 2D, 3D, VR and AR. Like Figma's toolbelt, it holds pointing tools plus the palette and the mode control |
| **Secondary bar** (8 px above the toolbar) | What does the armed tool need? | Only while a tool is armed, at most 546 px wide, the width of Figma's widest secondary bar (vector edit). Path: **From** and **To** (each takes a click, a typed name, a set or a group; a To equal to From finds the cycles through that node), one **Options** dropdown, as Figma's bar folds tools into "More" (the variant with its bound: shortest; k shortest with k; all paths up to N hops, 5 by default; the weight and its role; on a directed graph the direction, along edges, against edges or ignoring direction, the graph's declared direction by default), then Run, with its cost word at 10 s or more. The outcome is read where the query is kept (section 4), never in the bar |
| **Bottom dock** | Many rows, with the canvas kept visible | The **table** with its Between groups and Scatter views (section 5), the **time slider** (section 8.2) and the **keyboard shortcuts** panel. Closed at rest. It pushes the canvas up, and the toolbar rides above it, as Figma's does over the Motion timeline |
| **Comparison surface** | How do two drawings differ? | A focused view, as Figma's branch review is, for two graphs, two data versions, two windows, or two scopes of one graph (section 8.1). Its header holds Save comparison, Export and Done |
| **Chevron menu** (beside the project name) | The project as a file | A first line saying when a copy was last downloaded and what a copy would hold (graphs, results, style layers, views and notes, each counted), then Rename, Duplicate, Project details..., Export..., Download project file, **Version history**, Close |
| **Main menu** (top of the rail) | The complete inventory | Command palette... (Ctrl+K), then File (Open..., Open recent, Open sample, Connect to data source..., Export...), Edit (Undo, Redo, Copy as PNG, Find, then Select all, Select none, Invert selection, Select edges between), View, Data (routes to the data operations, section 11), Analyze (the catalogue by family), Preferences (a submenu of toggles), Help. File, Edit and View lead and Preferences and Help close, as in Figma; Data and Analyze take the slots of Figma's Object, Text and Arrange |
| **Command palette** (Ctrl+K) | Anything, by name | Every command, algorithm, layout and kept object, with recents. Rejected synonyms are aliases ("brokers" finds betweenness). It keeps Figma's 529 x 354 px panel, centred over the toolbar, and never shrinks to the toolbar's width. It is never a home |
| **Context menu** (right-click, Shift+F10 or the Menu key) | What applies to the thing under the pointer or the focused row? | The selection's type-row verbs and its overflow; a list row's commands; on the empty canvas, view commands, Run layout and Add node here |
| **Toast** (one) | Something finished elsewhere | A run finished or failed ("Go to result", "Re-run"); a load's progress with how the file is being read and Cancel ("Reading edges.csv as an edge list: source = from, target = to", with Re-map); the counts that end a load, Add data, Join or Combine, with Details, which opens the import report; after Use selection as start, "N results out of date" with Re-run all; after a Delete, how many objects it detached, with Undo; after Open, how many references could not be reconnected, with Details, which opens the restore report (section 4) |
| **Dialog** | A step that leaves the canvas | Only three: Connect to data source (a Neo4j server, a STRING query), the Export dialog, and the AI provider credential. Loading commits at once with detected defaults and is corrected afterwards, with undo |
| **Help button** (bottom right) | Aids for every user | Docs (including graphty-element's session API, the scripting surface), keyboard shortcuts, samples, and a route to Additional labels in the view menu |
| **Empty canvas** (no data loaded) | How do I start? | Open, Connect to data source..., recent projects, samples, and a drop target that also accepts pasted text (the paste rule is in section 11) |

Above the toolbar, surfaces stack in one order: the secondary bar, then the toast. The palette
takes the secondary bar's place while it is open. **Minimize UI** (Ctrl+Shift+\), a 32 px icon
button beside the project name with that shortcut in its tooltip, collapses both panels into two
floating pills, as in Figma, for a large graph or for capturing a figure
(`design/ui/figma/left-sidebar/README.md` 2).

**There is no status bar.** Figma has none, and every job one would do already has an owner: the
scope is on the filter chip, the selection count is the inspector's type row, run progress is on
the result's row and in the toast, and "not drawn" is said where the drawing would be.

**There are no inspector tabs.** Figma adds a tab only for a whole domain with its own verbs
(Prototype, Dev Mode). graphty has no such domain; a Data / Appearance split would be an activity
split pushed into the inspector.

**The project autosaves.** There is no Save command and no unsaved-changes prompt; Ctrl+S shows
when the project was last saved and when a copy was last downloaded. "Download project file"
writes a copy; the chevron menu's first line says what the copy will hold before it is written,
and the toast repeats it. graphty-element keeps the autosave in the browser's storage for the site and asks the browser to
make it persistent, so it is not evicted under storage pressure; clearing site data still loses
it, which a downloaded copy covers (section 14).

**Delete never asks**, because undo covers it, as in Figma. Deleting an object that others use
leaves each of them **Detached** (the glossary's state: it keeps resolving through the deleted
object's kept record, so nothing it painted or filtered changes, and offers Restore); a note whose targets are all gone is Detached in the same way and keeps their stored
ids and labels. The toast says how many were detached and offers Undo. **Selection is not an undo entry**, as in Figma; the way back to where
the analyst was is a kept object or a view (section 10).

## 3. The nav rail, and why it holds what it holds

Figma's rule: a rail button is **a collection of things in the file or available to it, never an
activity**. Figma's rail is the main menu, a separator, File, Agents, Assets and Tools, then a
second separator before Variables, which opens a full-screen view
(`design/ui/figma/left-sidebar/README.md` 1). graphty v1 had a rail of activities (Data, Explore,
Analyze, Style, Present, AI; `research/graphty-today.md` 2); every one fails the rule. The rail
below is derived from the collections the ontology defines.

| Collection | Test | Home |
|---|---|---|
| Graphs, and the kept sets and paths | the file's own contents (Figma's File panel: Pages above Layers) | **Rail: Graph** |
| The tree of analysis results, and the catalogue that fills it | a long, growing list of definitions the analyst returns to | **Rail: Results** |
| Notes | the only list of every note, and the only one whose rows select their targets | **Rail: Notes**, an exception stated below |
| The assistant's conversations | Figma's Agents panel | **Rail: Assistant**, only when configured, last in the rail |
| Style layers | applied definitions, like Figma's local styles | the graph's inspector (section 4) |
| Views | a saved way of looking at the canvas | Manage views, from the zoom and view menu (section 7) |
| Filter steps | working state that changes the whole canvas | the filter chip's popover (section 9) |
| Rows of values and of items | too many columns for a side panel | the table in the bottom dock (section 5) |
| Data versions, their import reports and the operations between them | history | Version history, from the chevron menu |
| Undo | history | Ctrl+Z and the Edit menu, with no visible list, as in Figma |

The separator under the main-menu button is Figma's. There is no second one: nothing in graphty's
rail opens a full-screen view, so the reason for Figma's second separator never arises. There is
no Data, Explore, Analyze, Style, Layout or Present button: each is an activity. Graph, Results
and Notes are the 240 px list form.

**List rows follow Figma's Pages and Layers rows.** A row's commands are on its context menu;
double-click or Ctrl+R renames; hovering shows only the row's own toggle (the eye, where a row has
one) and outlines what the row stands for on the canvas. No row carries a visible "..." button. The
context menu is reachable from the keyboard (Shift+F10 or the Menu key on a focused row), which
answers the right-click-only weakness `principles.md` 0 refuses to copy. Selecting from any list
row never moves the camera; Shift+2 frames the selection, as in Figma.

### Graph panel

- **Header:** the project name with the chevron menu, and the Minimize UI button.
- **Graphs section**, always shown, in the shape of Figma's Pages. With one graph it is collapsed
  and its header reads the graph's name, as a collapsed Pages section reads the current page's
  name. Its header holds Find (Ctrl+F) and "+" (Add as another graph), as Pages holds Find and Add
  new page. A graph row's context menu holds Compare with..., Version history, Rename and Delete
  (disabled for the only graph). One of the 25 workflows ("Condition Comparison - Disease vs
  Control Networks") loads two graphs; derived graphs (section 11) add more.
- **Object list** below it: the kept **sets** (each with a swatch, a fixed or rule icon and a
  count) and **paths**. Hovering a row outlines its members; clicking selects the object; the
  context menu holds Rename, Duplicate and Delete. With nothing kept, the object list is blank,
  with no title and no command, as a new Figma file's Layers panel is (`principles.md` 5).
- It never lists nodes, groups, found paths or results. A tree of 300,000 nodes is not browsable,
  and items live with the result that made them (`principles.md` 3).
- **Find (Ctrl+F)** replaces the list. It accepts a name, a query ("degree > 10"), or a pasted list
  of names or ids (one per line, or comma separated), and searches node names and attribute
  values, and the names of sets, paths, groups, results, notes and views, with hits grouped by
  kind. A pasted list follows the key rules of section 11 and reads "187 of 200 found", listing
  the ids not found. A hit that the filter chip's scope leaves out carries the mark "filtered
  out", naming the step that removed it; choosing it offers Include found nodes rather than
  selecting something undrawn (`conceptual-model.md` 4.5). "Select all" ends as a selection, and
  Ctrl+G then makes a fixed set; the query field's "..." offers Save as rule set, which makes a
  rule set without filtering the canvas. A node or item hit ends as a selection; any other hit
  opens that object's home.

### Results panel

The Results panel has the shape of **Figma's Assets panel**: one search field over everything, the
file's own items first, the library below (`design/ui/figma/left-sidebar/README.md` 6).

- **Search field** over both parts. A result hit reads "in this project"; an algorithm hit names
  its family; "degree", "core number", "k-core" and "transitivity" route to where those are read
  (the attribute histogram opened on degree or on core number, Statistics).
- **In this project**: the tree of analysis results that graphty-element owns, one collapsed row
  per result, named by algorithm and the parameter that distinguishes it ("Louvain (resolution
  1.0)"). One disclosure down are its runs or queries. Every row, at every level, opens the result
  editor at that run or query (rule 7). Items are never rows here; they are read in the editor
  and the table.
  - **Connected components** is the one permanent row, with no run: its groups need a parent
    result, and "select the giant component" is asked constantly. On a directed graph it carries
    both partitions as two variants, weak and strong; the weak count in Statistics opens the weak
    variant and the strong count the strong one. A categorical attribute read as groups ("Group
    by" on its column header) joins it as a partition with no run.
  - Run state shows on the row: Queued, a progress bar with Cancel, Failed, Out of date. Two runs
    can be in flight at once. The header's "..." holds "Re-run all out of date".
- **The catalogue** below, grouped by family, every family closed in every state; the panel
  remembers the last family opened. The families are the element's own categories (centrality,
  community detection, paths and flow, structure, similarity and link prediction, time). The
  structure family includes the **neighborhood aggregate** (which opens unrun because it needs an
  attribute), the **participation coefficient** (the share of a node's edges that leave its own
  group, the bridge reading of "Community Analysis") and **Burt's constraint**. The time family is
  absent unless the data has a time attribute; its rows are arrival and departure (nodes),
  creation and dissolution (edges) and community evolution (a partition series), each a series
  result read in the series editor. Each row has its (i), which always states the cost, and any
  precondition mark ("disconnected" on closeness), shown before anything runs. A cost word shows
  on the row only for 10 s or more (`principles.md`, departures), so no word means fast, as Figma
  shows no badge in the ordinary case. A row whose algorithm has already run goes to its result.
- Degree, core number and the graph statistics are not catalogue rows: they are always available
  (`conceptual-model.md` 3.4, 4.6). Layouts are not either: a layout makes positions, not a result
  (`conceptual-model.md` 5.2).
- **"+"** on the panel header scrolls to the catalogue and focuses its search.

**Running from the catalogue.** Clicking a row runs it at once, with default parameters, on the
chip's scope, and opens its editor, as Figma's "+" adds first and configures afterwards. Two
kinds of row open the editor **unrun** instead, with its argument or parameter rows and a Run
button, and Enter runs it: a row whose algorithm cannot run without an argument (source nodes, a
pattern, endpoints, an attribute), and a row whose cost word is "a few minutes" or longer, so that
nobody pays for an expensive default by accident. Ctrl+click selects several rows; Run then shows
their combined cost word before it starts, runs the rows that need nothing, and leaves unrun every
selected row that needs an argument or costs "a few minutes" or longer, opening their editors
afterwards (`conceptual-model.md` 7.3).

Why results and the catalogue share one panel: the analyst thinks "the betweenness I ran" and "run
betweenness" in one breath, and every run lands in the list it was started from. Figma's Tools
panel holds plugins from outside the file; graphty's catalogue produces the file's own contents,
which is the Assets shape.

### Notes panel

- **The home of notes.** Every note in the project, grouped by target, with the graph's own notes
  first, and a search field. Marks: Detached when every target is gone, and a citation mark
  when a cited run is no longer current or belongs to earlier data.
- **Clicking a note selects its targets, and the inspector stays visible beside the list.**
  Double-click or Enter on a note opens the **Note editor** popover beside it, as a Figma comment
  opens its thread; a click on a canvas marker, or on a note in any object's Notes section, does
  the same.
- Writing happens elsewhere, in one step: the Note tool (C) on the canvas (a click on empty canvas
  writes a note on the graph), or Add note in a selected object's overflow, in the graph's name-row menu (nothing selected)
  or in a result editor's menu.


**Why Notes breaks the rail rule.** The rule admits a secondary collection only when it has no
other findable home. An object's Notes section shows only that object's notes, and canvas markers
only point at them; both are routes. The panel is the one place to read every note at once, and
reading a note means reading its targets' live values. In the four note-reading steps of "Fraud
Ring Investigation" (the determination) and "Criminal Network Analysis" (data integration,
vulnerability assessment, intelligence production), three need a value the writer could not have
quoted when writing: a fraud case confirmed later, a conflicting source merged in later, a
removal-impact result computed later. Figma's comment mode hides the inspector, and its comment
list neither filters by target nor selects on click. A first-click test settles whether the
exception holds (section 14).

### Assistant

Shown only when graphty-element reports a configured AI provider. That is a fact about the setup,
not a persona-specific feature. It holds the conversation and a composer, acts only through
commands that already exist, and creates no object kind of its own. Its panel is 280 px, as
Figma's Agents panel is, because a conversation is prose. It is the last rail button, where
Figma's Agents is second, so that a button that comes and goes never moves Graph, Results or
Notes; the departures table records it.

## 4. The inspector

The inspector has two identities: **the selection**, or **the graph** when nothing is selected
(`research/figma.md` 4.13). Esc returns to the graph. Two modes change it until Done, and Esc
leaves neither: **Version history** replaces it, as Figma's version history does, and the
**comparison surface** turns each value into A, B and the difference, as the details of a change
in Figma's branch review list it before and after.

### One fixed order for every object

Sections run from the most specific to the most generic, as Figma's do. Every object shows only
the parts that apply to it:

1. **Type row**: kind icon and name (or "N selected"), up to three verb icons, and "..."
2. **Property rows**: Layout, Rule, Scope, Created from, endpoints
3. **Statistics**
4. **Attributes**
5. **Members**
6. **Memberships**
7. **Appearance** (on the graph: **Style layers**, the stack itself)
8. **Notes**
9. **Used by**, one counted row
10. **Export**

The headings are the glossary's nouns. **A section with nothing in it is absent**, as Figma draws
no section a selection does not have: Notes appears once the object has a note, Memberships once
the element belongs to something, Used by once something depends on it. Export alone keeps its
heading and "+" at rest, as Figma's does.

**Statistics is one component for every scope** (`conceptual-model.md` 4.6): the graph, a set, a
group, a subgraph item, a selection. A kept object shows its size against its parent and its cut
edges at rest; conductance and the other boundary readings are behind "N more", as is the whole
boundary of an ad hoc selection. Behind "N more", every reading of a subset shows the graph's
value beside it. Its **Attributes** row opens the table scoped to that scope, where each column
header shows the attribute's profile against the parent: completeness ("missing 38%"), then value
counts for a categorical attribute, or range and median for a numeric one. When any attribute has
missing values, the row carries one mark ("Attributes: 3 incomplete"), which opens the table
sorted by completeness. By rule 4, a reading's number routes to what it counts and the rest of its
row opens the reading in the editor popover (the graph-statistic kind in the table below), where
its scope, parameters, Over time... and Compare with randomized baseline... are; Statistics stays
the place the value is read. The section's "..." holds **Export table**, which writes the
section's readings as a table (section 6).

**Values in Attributes.** Degree and the neighbor count are always present; every other metric
appears once it is computed or opened, core number included. A metric value shows its rank as a
bare number ("#3"); its tooltip gives the denominator, the deviation and the scope of the run that
wrote it ("rank 3 of 5,310; 3.4 SD above the mean; on: full graph"; "rank 2 of 40 in type: bank"
for a run within each group). An imported numeric column shows no rank, because a year or a zip
code has none that means anything. Each value's menu offers Select same value, Save as rule set
(attribute = this value), Correct, the attribute histogram and, on a metric, New column, Rank. A
value written by a series result shows its value at the time slider's window, and clicking it
opens the series editor with that element's line drawn. The degree row reads the variant chosen in
the degree histogram (total, in, out, weighted).

**"+" on Attributes** writes an authored value (a triage status, a determination) by rule 8, as one
undoable step ("Add attribute"). A verdict is data that colours, filters and exports, not prose in
a note.

### Nothing selected: the graph

```
<graph name>                      [swatch] ...
Layout          ForceAtlas2            [run]
Statistics                                 ...
  five or six headline readings, mark rows, "N more", Attributes row
Style layers                               +
  at most 2 rows, "N more"
Export                                     +
```

- **Name row.** The background colour swatch (Figma's page colour row, as a swatch) and "...":
  Add note, Compare with..., Combine graphs..., Rename. A derived graph adds a **Created from** row, whose
  editor reopens the transform's inputs.
- **Layout row.** The method's name as its value, a Run icon, and the settings (method,
  parameters, seed, Fresh layout, Stop, Unpin all) in a popover. Figma's page section is the
  precedent: it holds the page's own property rows at the top of the resting inspector. One method,
  **Positions from columns**, sets x and y from numeric columns (longitude and latitude, or a tier
  as one axis with the other left to a force layout), so a map-like or layered arrangement needs no
  feature of its own. "Run layout" on the empty-canvas context menu is a route with no Figma
  precedent; Figma's nearest command, Tidy up, sits with a selection's alignment controls
  (`design/ui/figma/components.md`, the alignment row's "More actions").
- **Statistics.** The headline readings fixed in `principles.md`: nodes; edges, named with their
  direction; density; the components; and the degree distribution, a sparkline of total degree
  whose row opens the attribute histogram on degree (section 5), where in, out and weighted are
  chosen. On an undirected graph the components are one row, "Connected components" with its
  isolates, so five readings show. On a directed graph they are two rows, weakly connected
  components with isolates and strongly connected components, so six show. A components row's
  tooltip gives the largest component's share of the nodes ("largest: 94% of nodes"), the "is it
  connected?" of top task 1. Then the mark rows, each present only while its count is non-zero
  (`principles.md` 1): "weight: unknown", which opens the Edges reading's editor; the self-loop,
  parallel-edge and negative-weight counts, each opening the Edges tab on the edges it counts
  (rule 4); an import-count mark, which opens that load's import report; "Attributes: N
  incomplete". Then "N more": first the largest component's share, which follows the filtered
  graph like the rows above it; then the graph statistics: transitivity, average clustering,
  diameter, radius, average path length, assortativity, reciprocity; and last **Last import**,
  naming the latest load, which opens its import report in Version history, where Re-map
  columns... is. Each graph statistic is a graph-statistic result with a record (`conceptual-model.md` 4.6):
  its cost word shows before it runs, its state line after, and its row opens its editor. None of
  them is listed in the Results panel. The Edges reading's tooltip says directed or undirected
  and weighted or unweighted; its editor holds the graph's **Direction** row (directed or
  undirected, and how an imported per-edge "directed" attribute is read) and its **Weight** row
  (the weight attribute and its role: distance, similarity or capacity), which is where a wrong
  declaration is corrected. The section's "..." holds Export table and, when the data has a time
  attribute, Over time..., which makes one series of the headline readings (section 8.2).
- **Style layers.** The one ordered stack, top wins each channel, as Figma lists local styles on the
  page. At rest it shows 2 rows; "N more" expands the stack in place, where covered automatic
  layers collapse into one "N covered" row. Two rows are graphty-element's own. **Overrides** is at
  the top, present only once something has been overridden; it collects every Override and offers
  Select overridden and Clear all. **Default look** is always the bottom row, shown only when "N
  more" expands the stack; it cannot be deleted, and its editor holds the default channels (node
  colour, size and shape, edge colour and width, labels). Each row's eye shows on hover and stays
  while the layer is hidden, as in Figma; hovering outlines what it paints and shows
  a **Select painted** icon beside the eye, which replaces the selection with what the layer
  paints, as a Figma Selection colors row selects the layers using a colour; clicking opens its
  editor; its context menu holds Rename, Duplicate and Delete. A row's state shows as its result's
  mark icon, with the word in the tooltip.
- **Export.** Heading and "+", as Figma's resting Export section is. "+" adds export settings with
  defaults, and the section's button then names what it exports ("Export <graph name>"), as
  Figma's reads "Export Frame 1" (section 6).

The graph's notes are read in the Notes panel, not here, so the resting inspector keeps to the
four-section cap in `principles.md`. Its word, target and height counts are in section 13.

### Each kind of selection

The type row's three verbs are listed first; the rest are in its "..." overflow and the context
menu. An item's Created from row names its query or run and carries a stepper through its
siblings ("12 of 40", with Previous and Next), so the type row keeps three verbs. The set's
section tail (Appearance, Notes, Used by, Export) applies to every object below that has members.

| Selected | Type row: verbs; overflow | Property rows and sections, in the fixed order |
|---|---|---|
| **One node** | its label; Select neighbors (split button: hops, direction, edge type, **Filter to neighbors**, and "Select neighbors from server" when a source is connected), Find path from..., Create set; overflow: Filter to selection, Filter out selection, Compare with... ("Without this" preset), Add note, Pin or Unpin, Remove | Attributes (rule 5; degree and the neighbor count each route by rule 4); Memberships (kept sets and result groups, "Louvain (resolution 1.0): community 4 of 212"); Appearance; Notes; Export |
| **One edge** | "source -> target", each end a link; Create set, Filter to selection, Select neighbors; overflow: Filter out selection, Add note, Remove | Attributes (the weight with its declared role); Memberships (sets and paths); Appearance; Notes; Export |
| **Several elements** | "N selected"; Create set (Ctrl+G), Select neighbors, Filter to selection; overflow: Filter out selection, Create path (when the selected edges chain end to end), Compare with..., Merge nodes, Remove, Add note | Statistics of the induced subgraph (nodes, edges, density, cut edges, then "N more", which holds the rest of the boundary and each reading beside the graph's value); this is where a neighborhood that Select neighbors made is read; Attributes: the shared values only, then one "N differ" row that opens the table scoped to the selection, and "+" writing to each; Memberships, one row per result or set with the share inside it ("Louvain (resolution 1.0): 7 of 10 in community 4"; "Drivers: 4 of 10"), 3 or 4 rows, each row selecting that subset; Appearance with a count per kind; Notes; Export |
| **Mixed** (for example a set plus some nodes) | "N selected", as Figma titles any multi-selection; Create set, Filter to selection | Statistics of the union of their elements; Notes; Export. As Figma shows only the shared properties of mixed layers |
| **A set** | kind icon (fixed or rule) and size ("412 nodes"); Select members (Enter), Filter to, Compare with...; overflow: Add selection, Take out of set (fixed sets), Collapse or Expand, Remove (the data operation), Add note, Rename, Duplicate, Delete | Layout row; Rule row (the edge reading, induced or listed, or clipped for a rule set, and a rule set's expression, scope and population); Created from; Statistics with size against the parent and cut edges; Members (3 or 4, "N more"); Appearance; Notes; Used by; Export |
| **A path** | "Path", endpoints and length or cost; Select members, Create set, Filter to; overflow: Collapse, Add note, Rename, Delete | Created from; Statistics with size against the parent and cut edges, as for any scope (rule 8); Members (the ordered hops, each with its edge's label and cost under the weight reading); Appearance; Notes; Used by; Export |
| **A group** (community 4) | its name attribute, or "Community 4" when it has none; Select members, Create set, Filter to; overflow: Rename (edits the name attribute; double-clicking the name does the same), Compare with..., Collapse or Expand, Add note | Created from (its result and run, with the stepper "4 of 212"); Layout row; Statistics with size against the parent and cut edges; Attributes (its name and any group columns, section 5); Members; Appearance; Notes; Used by; Export |
| **A found path** | "Found path", its length or cost; Create path, Select members, Filter to; overflow: Create set, Add note | Created from (its query, direction and weight reading, the query's outcome, and the stepper "1 of 4"); Statistics; Attributes; Members (the ordered hops, as a path's); Appearance; Notes; Used by; Export |
| **Two sets, paths or subgraph items** | "2 selected"; Union, Intersect, Subtract, Exclude as one split button (Figma's boolean operations); overflow: Compare with... (the two side by side on the comparison surface) | **The home of comparing two selected objects.** Statistics of both side by side, with their Jaccard overlap and **Save comparison** on the section's header; then the 3 or 4 attributes whose profiles differ most, then "N more", which opens the table scoped to the two with A, B and difference columns (`conceptual-model.md` 4.7); Notes; Export |
| **Three or more of them** | the same split button | Statistics of the union, with two counts, "in all N" and "in 2 or more", each a count by rule 4; Notes; Export |

The last row is how "Hub Gene Identification and Ranking" reads which hubs are in the top 10 of
more than one method: five top-10 sets selected, then "in 2 or more". Two found paths selected
(Shift+click in the Paths tab) and Intersect give the intermediaries they share, which "Path
Investigation" asks for.

A **pair** is a row of the Pairs tab and of the pair-list editor, never an object. Clicking it
selects its two nodes; its context menu holds Paths between its ends, Add edge, and Merge nodes
(disabled, with the reason in its tooltip, when the two ends carry different declared node types).
A note about a pair is a note on its two nodes. On the canvas, a pair list's automatic layer draws
candidate edges; a click on one selects its two nodes, as the pair's row does, and its context
menu holds the row's commands. A candidate is never selected as an edge, because no such edge is
in the data. A **saved comparison** is a row of the Comparisons
tab; clicking it reopens it where it was asked (section 8.1), and its export settings are in that
editor (`conceptual-model.md` 8).

Finishing a query selects its first finding: the Path tool selects the found path, a pattern
search selects its first match, as Figma selects what a tool just drew. A query's outcome is read
on its row in the result editor and on its findings' Created from row: "No path: in components 3
and 17", "0 matches", or, for a query cut at its cap, "first 100" with "N more" opening the Paths
tab.

**Appearance** rows show the value and the name of the style layer that paints it, as Figma's bound
style rows do. Clicking a row opens a **style-layer picker** over the whole stack, with "Add style
layer", the built-in looks (Print, Colorblind safe, High contrast, Dark), each of which adds its
own set of style layers to the stack, and Override, which writes to the Overrides row; the
selection stays. This is Figma's "Apply styles" picker, and each of its rows has Edit, which opens
that layer's editor, as Figma's picker has Edit style. An overridden Appearance row is marked, and
its menu holds **Reset**, which removes the selection's override of that channel; the type row's
overflow holds **Reset all changes**, which removes all of the selection's overrides. These are
Figma's two grains of override reset. Seven of the 25 workflows restyle while
something is selected, among them "Findings Communication", "Gene List to Interaction Network
with Expression Overlay" and "Hub Gene Identification and Ranking".

**Used by** is one row with a count ("Used by 3"); its click lists the sets, views, rule sets,
comparisons and citing notes that depend on the object, leaving out the style layers and notes
already shown above it. It is how the analyst sees what a Delete would detach.

### The result editor

One template serves every result kind. Figma's variable editor is the device: a popover beside
the list, with the selection kept.

1. **Type row**: the kind and its (i), the name, and a menu: Re-run, Run as new result, Sweep
   parameter..., Compare with..., Compare with randomized baseline..., Add note (on the selection, or the graph
   when nothing is selected, citing this run), and by kind Quotient
   graph... and Collapse all (a partition) or Merge nodes... (a pair list), then Rename, Delete.
2. **State line**, with Details for the full record (method, engine, seed, sampler, direction,
   the weight attribute and its role, caveats, "Copy as methods text"). A failed GPU run's Details
   offers "Re-run on CPU", never an automatic fallback.
3. **Property rows**:
   - **Scope**: the chip's scope by default; the full graph, a set, "without" a set, and the two
     list forms **Each of...** and **Without each of...**, whose list is the groups of a partition
     or categorical attribute, the members of a set or of the selection, the windows of the time
     attribute, the graphs of the project, or the two sides of an open comparison; one run over
     each item of the list (`conceptual-model.md` 4.5). Where the items do not overlap (the groups
     of a partition), the run writes one column. Where they overlap (sets, sides, graphs), it
     writes one column per item, named by the item ("betweenness (tumor)"), and over exactly two
     items a difference column ("betweenness (tumor - normal)"); on two graphs the columns land on
     the elements matched across them (section 11, Keys). Windows make a series (section 8.2).
     These are ordinary columns: Filter to, Color by, New column and Export table all read them.
   - **The arguments** the algorithm needs. Every argument that takes nodes accepts a click, the
     current selection, a set, a group, a found path, a match or a pasted list of ids. A pair
     list has **Sources** and **Targets** rows (every unconnected pair by default, with its cost
     word). A pattern argument has two forms: **From selection**, where the selected nodes and
     edges become the pattern with their node and edge types as the role constraints (query by
     example), and a text form in graphty-element's expression language.
   - **Direction**, on a directed graph, and **Weight**, when the algorithm reads a weight: the
     graph's declared direction, and its declared weight attribute read in the role the algorithm
     needs, by default; Weight also offers "unweighted". A run that overrides either names it on
     the state line.
   - **Parameters**, folded to one row that expands in place.

   Changing a row and pressing Run adds a run (`conceptual-model.md` 4.3); the Run line says
   first what stays on the earlier run ("3 group names and 2 notes stay on the earlier run"), and
   once the run is done it offers **Carry over to new run**, which moves every one-to-one matched
   group name, note, group attribute and style layer in one undoable step and lists the rest. A
   list scope shows its combined cost word first.
4. **Summary readings, then the items**: the top 5 items, each row selecting its item, then "N
   more", which opens the result's items in the table.
5. **Appearance** (its automatic layer) and **Used by**. A result has no Notes section, because a
   note never targets a result (`conceptual-model.md` 6).

What each kind puts in part 4:

| Kind | Summary readings | Items and chart |
|---|---|---|
| **Metric** | the attribute histogram (log axes, a band that selects), with n, mean, standard deviation and median as its axis caption | top 5 elements by value |
| **Partition** | group count, modularity, singletons; the size distribution; a Layout row (a per-group layout) | groups largest first; "N more" opens the Groups tab, with its "Between groups" view |
| **Series** | a line chart per metric or statistic, one point per window, change points marked, a mark at every window a note cites, and the trend in the caption ("growing, R^2 = 0.95", its method in the (i)); the window in view follows the time slider; a point that counts elements is a count by rule 4 | a metric series: the biggest movers; a partition series: the splits and joins between windows |
| **Path family, flow, match list** | the queries, latest first, each with its eye and outcome ("4 shortest paths, length 3"; "6 cycles through ACC-17"); for each element, the number of the chosen query's items it is on, written as a result attribute ("on 3 of 4 paths") with its histogram | the chosen query's paths or cycles, flow edges and value, or matches |
| **Pair list** | the candidate count and its cap (k per source node, a Parameters row) | top 5 pairs by score |
| **Node list, edge list** | the count | top 5, then the table |
| **Comparison** | the statistic for the kind compared, with its (i) | the saved comparisons; for a "without" baseline, the scenario table (section 8.1) |
| **Graph statistic** | the value with its method, and for a sampled method its sample count and seed under Parameters; it opens from its Statistics row | -- |

**Merge nodes...** on a pair list takes the pairs that pass the Pairs tab's item step (section 9;
for example "score > 0.9") or the selected pair rows, and merges each pair separately, never all of
them into one node, as one undoable data edit with the attribute-conflict choice made once
(`interaction-patterns.md`). It skips, and counts, pairs whose ends carry different declared node
types. **Collapse all** collapses every group of the partition; Collapse on several selected Groups
rows collapses each.

The editor stays open while the selection changes from inside it or from the table, so the
analyst can click through groups and read each one's Statistics; a click on the canvas or Esc
closes it. At a short window it gives way in this order: the top items drop from 5 to 3, the chart
folds to a one-row toggle, then the body scrolls under a fixed header; the name, state line and
marks never collapse. Its ordinary heaviest case measured about 608 px at 240 px wide and fits an
800 px window (`research/figma.md`, follow-up); the heaviest transient readings are measured in
section 13.

### The other editors

| Definition | Its editor holds |
|---|---|
| **Style layer** | Selector (the rule editor of section 9, so "not in the working set" is its ordinary NOT), channels (colour, size, shape, **outline** colour and width and **opacity** for nodes, **width** and opacity for edges, label, arrow, and group marks for a layer that applies to groups), the palette or scale drawn over the bound attribute's histogram with draggable endpoints and midpoint, legend, the count of what it paints, and for a bound channel a **No value** row: how many elements have no value and the look they keep from the layers beneath, with its legend entry on by default. The No value look can be set only on a layer the analyst made, never on an automatic layer, so an algorithm's layer never paints what its result says nothing about. Fading what lies outside a working set or an ego network is such an analyst layer; nothing faded leaves the counts |
| **Default look** | The default channels; no selector, because it paints everything beneath every other layer |
| **Edges reading** | Direction (directed or undirected, and how a per-edge "directed" attribute is read); Weight (the attribute and its role, distance, similarity or capacity, with the similarity's conversion) |
| **View** | Title, caption, the notes it shows in their order, its export settings; "Changed since applied" with Update view (Revert view is in its menu) |
| **Note** | The text, its targets, the runs and filter steps it cites (a note written while the time slider is open cites its window), and the attribute values it quotes, each marked when the live value differs |
| **Filter steps** | The ordered steps, each with its eye, "Working set" on a working-set step, and "+"; the rule editor for each step (section 9); Save as rule set on the popover's header and on each step's menu |

The **import report** is not a popover: it is read in its data version's entry in Version history,
which replaces the inspector at full height (section 7). It is reached from where the analyst
already is: the graph's Statistics (the Last import row under "N more", and each import-count
mark row) and the load toast's Details. Its first line says how the source was
read ("Read as edge list (CSV): source = from, target = to; 5,310 nodes, 20,112 edges"), or for a
query by ids "187 of 200 ids found", and, when endpoint columns declare different node types, how
many ids occur under both ("412 ids occur as both user and item; kept as separate nodes", pending
the owner's decision in section 14). Then rows read, kept and rejected, with the rejected lines;
endpoints not found; the key report of section 11 for Add data, Join and Combine; completeness
per attribute, read on the column headers it links to; and **Re-map columns...** (id and label
columns, the node type of each endpoint column, direction, the weight column and its role,
separator, header row, encoding, parse options, repeated edges, unknown endpoints, self-loops),
which reloads the same source with the corrected mapping. After Replace data it also lists what
stays on the earlier runs, with **Carry over to new run**.

The **restore report** is the same device for Open. When a project file opens with references
that cannot be reconnected (a run whose values were not kept and cannot be recomputed under this
version, a set member or note target missing from the data), the Open entry in Version history
lists them grouped by what each lost, with counts, as Figma's list of missing libraries does. Each
row selects the item, whose own Detached mark offers its Restore. The toast after Open counts them
and its Details opens the report.


## 5. The table: the surface for many

The table is to many rows what the inspector is to one thing. It lives in the bottom dock, is
closed at rest, and opens from any "N more", any count (rule 4), the Attributes row, or the view
menu.

- **Tabs:** **Nodes**, **Edges**, and one tab for the items of the result that last opened it,
  named for them: Groups, Paths, Matches, Pairs, or Comparisons. A partition's Groups tab has a
  **Between groups** view: edge counts between every pair of groups, each cell split by edge type
  when an edge type is declared, so grouping by node type gives the schema of a typed graph.
- **Rows** select their element or subgraph item and follow the canvas selection; a Pairs row
  selects its two nodes and a Comparisons row reopens its comparison (rule 8). A scope line above
  the rows says what they are when narrower than the tab ("Neighbors of TP53, 12").
- **Item rows** carry the item's reading and its own attributes as columns. Group rows add the
  group Statistics (size, internal density, cut edges, conductance). Path rows carry length, cost
  under the weight reading, hops and intermediates. Pair rows carry source, target, score and rank
  within source, so Export table writes the top k per source node directly.
- **The Scatter view** plots two numeric columns of the tab against each other; a box drag
  selects. "Compare with..." from a numeric column header opens it with the other column chosen,
  and the popover keeps the statistic (section 8.1).
- **The aggregates**, one list for every place that summarizes values over many elements (group
  columns here, and the neighborhood aggregate): count, sum, mean, median, minimum, maximum, share
  where a condition holds, most common value with its share, and number of distinct values; most
  frequent words for a text attribute. The menu shows only the ones that apply to the attribute's
  type. A group column is written by New column, From expression on the Groups tab over each
  group's members (`conceptual-model.md` 4.3). So "profile every community" is this tab with one
  such column, sorted, and the column feeds Use as group names, group marks and Export table.
- **Column headers** show the attribute's profile with its completeness. The menu shows only the
  entries that apply to the tab and the column's type: sort; Filter to (a step in the chip's
  popover, with a value checklist or a range over the histogram); Color by and Size by (a new
  style layer); the attribute histogram (numeric); Group by (categorical); Join... and Use as group
  names (Groups tab); Compare with... (another column, section 8.1); then two submenus. **New
  column**: From expression..., Rank (metric), Aggregate over neighbors... (Nodes tab: the
  neighborhood aggregate with this attribute filled in). **Column**: type, role (weight with its
  role, time, node type; on the Edges tab, node type on the source or target column declares it for
  those endpoints), Correct values, Bipartite projection... (categorical or list-valued), rename,
  fill empty, find and replace, split, delete. The worst case, a categorical column on the Groups
  tab, shows 8 entries above the submenus; a numeric metric on the Nodes tab shows 7.
- **Cells** are edited in place, as one Correct step.
- **Export table** on the tab header writes the visible columns, sort and scope as CSV or TSV, with
  each column's scope and edge reading in its header (section 6).

**The attribute histogram** is one popover for any numeric attribute over any scope: log axes, a
band that selects the elements in it (or, from the chip, filters), the top 5, and n, mean,
standard deviation and median in its caption. Each bar is a count by rule 4. It opens from a
column header, from any numeric Attributes value, and from the degree distribution in Statistics.
The metric result editor embeds the same component. A band is set by range, percentile or top N,
and its menu holds Create set and **Save as rule set**, which keeps the band's rule ("betweenness
in top 5%") so it re-applies to new data. Every numeric histogram's menu holds preset bands "above
mean + 3 SD" and "below mean - 3 SD", which select the outliers of any measure; Fit power law,
which writes the exponent, the lower cutoff and a goodness-of-fit p-value into the caption with its
method (maximum likelihood) in the (i); and, when the data has a time attribute, Over time...,
which makes a series of that attribute, so a hub's degree over time is one command. Opened on
degree it is **the home of degree**: a variant row (total, in, out, and weighted when a weight is
declared; normalized as a toggle) that the node's degree row also reads, and average, minimum and
maximum degree in the caption, where each extreme selects its nodes. Opened on core number, a band
from k upward selects the k-core.

## 6. Export

What is written decides the home:

- **A table of values** (rows of elements or items): a tab's Export table (section 5). A ranked
  hub table, a cluster membership CSV, the candidate pairs, a comparison's differences.
- **A table of readings** (reading, value, the graph's value beside it for a subset, scope,
  method): Export table in a Statistics section's "...". The same command serves the graph, a
  set, a group, a subgraph item and a selection.
- **The operation log**: Export (CSV or JSON: time, graph, author, operation, record, undone) on
  Version history's header. It is the one table with a home of its own, because its rows are
  operations, not elements or readings.
- **Figures and graph files**: an object's Export section.
- **The whole project**: the Export dialog.

**An object's Export section** exports that object as it looks now: the selection, a set, a path,
a subgraph item, the graph. "+" adds export settings, and the section's button names what it exports ("Export selection",
"Export Drivers"): format (PNG, SVG, PDF, video, or a graph
file in GraphML, GEXF, GML, DOT, Pajek or JSON, the formats graph-io writes), scale, the legend and
its placement, and a **Notes** row choosing which notes draw as callouts (none by default). A graph
file carries each attribute's declared role and the project metadata. "Copy as PNG"
(Ctrl+Shift+C) is its route to the clipboard. A view and a saved comparison have no Export
section, because neither is selected; their export settings are in their editors.

**The Export dialog** (the header's Export... button, Ctrl+Shift+E, the chevron menu, main menu File)
lists every exportable in the project with a checkbox: the graph, every object with export
settings, views as pages in their order, saved comparisons, the operation log, the methods text,
and a report. It acts on the whole project and opens with every row checked under an "N of N
selected" header checkbox, as Figma's Export dialog does for every frame with export settings
(`design/ui/figma/buttons-and-controls/README.md`, the Export dialog). Its command is
"Export..."; a section's button always names its object, so one word never means two targets
unnamed.

**The report** is PDF or HTML. Its title and authors come from Project details. Each checked view
is a figure page, in the views' order, followed by its findings: the notes that view shows, in the
view's note order. Its tables are each checked result's summary readings and top 10. The **methods
text** covers everything behind the checked pages: their loads and data versions (with a source
query's parameters, such as a STRING species and confidence cutoff), the transforms that made
their graph, their filter steps and their runs. The narrative a findings report needs (context,
findings, implications) is the order of the views and of their notes, so the report adds no list
of its own.

By rule 10, an export is frozen and the project is live. An investigator who re-applies a
pipeline to the next alert exports the current alert's evidence first; to keep two alerts live
side by side, the second is run with Run as new result.

**Video** is a format of the graph's or a view's export settings: its camera path runs through
the saved views in order, or plays the time slider.

**The project file** has one home, "Download project file" in the chevron menu. It is also the
interactive deliverable: opened in graphty-element, it is the graph a reader can explore. Project
metadata (title, authors, licence), which GraphML carries, is in "Project details...".

## 7. Homes for the secondary objects

| Object | Home | Routes to it | Figma precedent |
|---|---|---|---|
| **Result** and its runs | its editor | its Results panel row; a computed attribute's name; a bound Appearance row, then its layer; the toast's "Go to result"; Find; the palette | Assets ("Created in this file") |
| **Style layer**, including Default look and Overrides | the graph's inspector, Style layers | every Appearance row's picker; a column's Color by and Size by; a result editor's Appearance; a path's Appearance; a query row's eye | local styles in the page inspector; the "Apply styles" picker |
| **Note** | Notes panel; its text in the Note editor | the Note tool (C); Add note in an object's overflow; an object's Notes section; markers on the canvas; Find | comments, and Dev Mode annotations, which show chosen property values |
| **View** | Manage views, a popover list opened from the view menu's Views submenu: each row's editor, Update view, Revert view, rename, delete, reorder | the Views submenu (jump to a view, Save view); Find; "Go to view..." in the palette; the Export dialog | how the canvas is seen sits with zoom |
| **Filter step** | the filter chip's popover | Filter to and Filter out on type rows and context menus; Filter to neighbors; column headers; histogram bands; legend entries; the time slider's Window step | canvas-wide state in the header (`research/figma.md` 4.15) |
| **Comparison** | one home per case: two selected objects, their inspector; a reading or a what-if, the editor popover where it was asked; two columns, the table's Scatter view; two drawings, the comparison surface; saved, a row of the Comparisons tab that reopens it where it was asked | "Compare with..." wherever it appears (section 8.1) | Dev Mode compare; branch review |
| **Import report** | its data version's entry in Version history, one per load, Add data, Join or Combine | the Last import row under Statistics' "N more"; the import-count mark rows; the load toast's Details | version history: a named version's details |
| **Restore report** | the Open entry in Version history | the toast after Open; each reported item's Detached mark | the list of missing libraries on opening a file |
| **Version history** | chevron menu; replaces the inspector until Done. The project's one log in time order, each entry tagged by its graph, opened filtered to the current graph (the filter is a route, rule 1). Each data version is a named entry with Compare with... and its import report; the operations since it expand beneath it, undone ones struck through, each opening its record. Export on its header (section 6). It is the home of analysis history and the chain of custody | a graph row's context menu; Details on any run; Details on a load's toast; Replace data | version history: named versions with autosaves expanding beneath them |
| **Undo** | Ctrl+Z and the Edit menu, no list; selection is not an entry | -- | Figma shows no undo list and does not undo selection |
| **Preferences** | main menu, Preferences submenu: theme, GPU policy, cost limit, reduced motion, headset, Performance mode, "AI provider..." (a dialog, because it takes a credential) | the palette | Figma's Preferences submenu |

Views are not in the graph's inspector. Of the four workflows that use saved views, three use them
mainly to navigate ("Visual Exploration - Overview to Detail", "Iterative Analysis Cycle", "Threat
Hunting") and one mainly as output ("Reproducible Session and Network Publication"). A menu jumps
to a view in two clicks; the rows that need actions (update, revert, rename) sit in a popover list,
because a dark Figma menu holds commands and toggles, never rows with their own menus.

**Style layers and rule sets across graphs.** Today each graph holds its own; whether they belong
to the project instead is an open file-format question (section 14). **Across projects**, no
definition is imported or exported one by one. The supported route is a project used as a
template: Duplicate it from the chevron menu, then Replace data. A library across projects is
deferred for every kind of definition alike (`conceptual-model.md` 4.7).

## 8. Two end-to-end routes: comparison and time

### 8.1 Comparison and what-if

Every "Compare with..." shows its answer where it was asked (rule 9), and Save comparison keeps it.
Its home is one per case.

1. **Two readings.** "Compare with..." from a result editor or a Statistics reading asks for the
   other side and shows the comparison in that editor popover: the statistic with its (i)
   (`conceptual-model.md` 4.7) and the missing and unmatched counts. From a numeric column header,
   the other side is a column: the popover shows the correlation with its (i), and the table's
   Scatter view draws the two. "Compare with randomized baseline..." adds the null distribution
   (the popover's one chart), the z-score and the p-value.
2. **Two selected objects** (two sets, paths or subgraph items) are compared in their inspector
   (section 4), which is the home of that comparison; Save comparison is on its Statistics header.
3. **From a set or group,** "Compare with..." opens a picker listing, in this order: its graph
   (the comparison surface, step 7), "Without this" (the what-if, step 4), and another set or
   group (both are selected, and step 2 applies).
4. **A what-if.** "Compare with..." with the "Without this" preset opens the editor popover
   beside the inspector: a **Sources** row that accepts the selection, a set or a group and, on a
   directed graph, a direction control defaulting to the graph's declared direction; a **Cut
   off** count; then the headline readings with the baseline and the scenario as two value
   columns, and "N more", which opens the table with A, B and difference columns for every graph
   statistic already run. With no sources, Cut off counts the nodes that leave the largest
   connected component; with sources, it counts those no longer reachable from them in that
   direction (the "cut off by S" rule, `conceptual-model.md` 4.1), and its tooltip and the saved
   record name the direction. By rule 4 it lists them, and Save as rule set keeps the rule.
5. **Every scenario at once.** Scope "Without each of..." runs the leave-one-out sweep: one
   scenario per group of a partition or categorical attribute, or per member of a set or the
   selection (every tier-1 supplier, or the top 20 by betweenness, removed in turn), with the
   combined cost word shown first. It carries the same Sources and Direction rows as step 4. Its
   result is a comparison whose scenario table has a Cut off column and is sorted by the change in
   what it was launched from: Cut off from a set's picker; a Statistics reading from that reading;
   from a per-element metric, the largest change of any element's value. The sort is named in the
   column's tooltip and the saved record. "Top 5 disruption scenarios" ("Supply Chain Risk
   Assessment") is its top 5.
6. **Keeping.** Save comparison lands the comparison as an item of the comparison result for its
   baseline, a row of the Comparisons tab. Only a saved comparison can be cited or exported; the
   Comparisons tab exports them as a table.
7. **Two drawings.** Two graphs, two data versions, two windows, or two scopes of one graph (two
   sets or groups, or one beside its graph) open the **comparison surface**. Elements are matched
   by the key rules of section 11, and the header counts those that did not match, so a case
   mismatch shows as a count and not as phantom additions. Positions are aligned (shared, for two
   scopes of one graph) and selection is linked across the sides. Both sides are drawn with side
   A's style stack, named in the legend title, so one colour means one thing on both; each layer
   is rebound on side B by attribute name and marked where B lacks the attribute, whichever way the
   ownership question of section 14 is settled. It leads with the list of differences: elements
   added, elements removed, then **Changed**, one row per numeric attribute and per reading
   present on both sides, ordered by the size of the change, top 5 then "N more", which opens the
   table with A, B and difference columns. A partition run on both sides adds a row reading AMI and
   ARI, with the splits and joins between its groups, drawn by the same component as the partition
   series. A metric is run on both sides as an ordinary run whose Scope is "Each of..." the two
   sides, so its per-side and difference columns (section 4) are its Changed row. While the
   surface is open, the inspector shows the selected element with each value as A, B and the
   difference; the left panel and the table stay live, scoped to the side last clicked. Its header
   holds Save comparison, Export and Done.

### 8.2 Time

Nothing about time appears unless the data has a time attribute (`conceptual-model.md` 4.7). It
is the owner's key use case and a tail task for the average analyst, so it costs nothing at rest.

1. **Declare the role** on the column header (Column, role: time), or it is detected on load.
2. **The time slider** in the bottom dock opens from the view menu's "Time slider" toggle, which
   exists only when a time attribute does. Its controls: range handles, Play and Pause with speed,
   Step, and a "..." holding Compare with previous window. Opening it adds one live **Window** step
   to the filter pipeline, so the chip reads "Window: Mar 2024, 812 of 5,310 nodes". The step's
   **Nodes** row says which nodes the window keeps: the ends of the edges active in it (the default
   when times are on edges) or the nodes' own times. Statistics read the window; a new run defaults
   to it; an existing run keeps its recorded scope, and its state line says so. Dragging and
   playing edit that step and record no undo entries, because scrubbing is looking, as Figma's
   prototype playback edits nothing; closing the slider removes the step. A time range that should
   outlast the slider is an ordinary range step from the time column's header. A view captures the
   Window step.
3. **Runs over windows**: Scope "Each of..." the windows, on any result or Statistics reading,
   makes a series result (window size, step, cumulative, in its parameters). The Statistics
   section's Over time... makes one series of the headline readings, the size, density and
   components per window that "Network Evolution Analysis" tracks; the attribute histogram's Over
   time... makes a series of one attribute, such as degree. The time family's rows (arrival,
   departure, creation, dissolution, community evolution) are series results too.
4. **Reading it**: the series editor draws the line chart with change points and the trend, the
   biggest movers and, for a partition, splits and joins (section 4). A point that counts
   elements lists them by rule 4, so the nodes that arrived in March are one click. "N more" opens
   the per-window table. A note written while the slider is open cites its window, and the chart
   marks that window, which records an outside event against the timeline.
5. **Adjacent windows**: Compare with previous window, in the slider's "...", opens the comparison
   surface on the previous window (section 8.1).
6. **Output**: the video format plays the slider (section 6); views saved at successive windows
   export as pages, which are the small multiples.

## 9. The filter chip

The chip sits in header row 2, directly above the Statistics it qualifies, in the slot where Figma
has its Design and Prototype tabs, beside the zoom button. It is **always present**, because every
number on screen is computed on something and the chip is where that is stated: "All nodes" at
rest, "Filtered: 1,204 of 5,310 nodes" with a filter on, "Working set: 40 of 5,310 nodes" inside a
working set, "Window: Mar 2024, 812 of 5,310 nodes" while the time slider is open. At rest it
carries no count, because the Nodes row carries it one line below.

At 11 px Inter the longest reading is about 190 px; the row is 240 px with a 55 px zoom button, so
a reading too wide first drops "nodes", then abbreviates counts ("1.2k"), with the full reading in
its tooltip.

Clicking it opens the filter steps, which is **the only home of filtering**, left of the
inspector and aligned to the chip, as Figma places every right-panel popover, so the Statistics it
qualifies stay visible while steps are edited. The longest pipeline in the workflows ("Fraud Ring
Investigation": a two-hop neighborhood, a time window, a risk score and optionally a community)
fits the 240 px popover at about 328 px tall.

- **One rule editor** serves a filter step, a rule set's Rule row, a style layer's selector and
  Find's query. It holds the predicate (with AND, OR and NOT, and membership in a set or the
  selection), a **Scope** row (the graph the rule reads) and a **Population** row (what a relative
  threshold is measured against: the elements that carry the value by default, or "each group of"
  a partition or categorical attribute, for "top 3 by degree within each community";
  `conceptual-model.md` 4.1).
- **The command that adds a step decides its kind** (`conceptual-model.md` 4.4): Filter to
  selection and Filter to neighbors make a working set; every other way of adding a step makes a
  data step, whatever it names. There is no toggle: to change a step's kind, remake it with the
  other command.
- **A neighborhood or path step names its start nodes** as an editable row. **Filter to
  neighbors**, on Select neighbors' split button, makes such a step from the selection with the
  split button's hops, direction and edge type, and the step is a working set; Filter to on a
  found path makes a path step. Filter to selection stays a plain member step (also a working
  set), because a selection carries no memory of how it was made. The step's menu offers **Use
  selection as start**, so the same pipeline is re-applied to the next alert or hub in two steps:
  re-seed, then Re-run all from the toast "N results out of date". Export the current alert's
  evidence first (rule 10).
- **A step made on an item column is a step over items.** The chip names it ("Matches: verdict is
  not false positive, 28 of 40"), the tab lists only the passing items, and the canvas keeps an
  element if at least one passing item contains it, so Filter out never removes an element a kept
  item still holds. Merge nodes... reads the same step (section 4).
- **The legend is a route.** Clicking a legend entry adds a Filter to step on that value;
  Shift+click adds or removes the value in that same step.
- **Save as rule set** keeps a rule while it is on screen: a step (its predicate, with the steps
  before it as scope; on the popover's header the last step, and so the whole pipeline), a
  histogram band, a value's menu (attribute = this value), and Find's query. Create set is never
  used for this: it always makes a fixed set (`interaction-patterns.md`). A view captures the
  pipeline too.

Hiding has one route: Filter out. Opacity is a style-layer channel for fading, never a way to
hide: nodes at opacity 0 still count in degree, density and every centrality while the chip reads
"All nodes", and the layer's row counts what it took to opacity 0.

## 10. Prominence and wayfinding

Rank buys closeness to attention, not chrome (`top-tasks.md`). Steps are counted from rest, with the left panel a project opens on: Results while nothing is
kept, Graph after (section 2).

| Task (rank) | Route | Steps |
|---|---|---|
| 1. Characterize the whole graph | the graph's inspector, shown at open with nothing selected | 0 |
| 2. Rank nodes by a centrality metric | the family, then the row, in the Results panel a fresh project opens on; the result paints itself and its editor shows the top 5 and the histogram. From the Graph panel, Results first. By the palette: Ctrl+K, type, Enter | 2 (3 from the Graph panel) |
| 3. Detect and characterize communities | the same route; a group row in the editor selects the group and its Statistics show; "N more" opens the Groups tab | 2 to 3 |
| 4. Find a node and explore its neighborhood | Ctrl+F, type, Enter; Select neighbors, or the neighbor count | 2 |
| 5. Take a note | C then a click on the target; or Add note in the selection's overflow | 1 to 2 |
| 6. Filter, then characterize what is left | Filter to selection on any type row, a column header, a histogram band, a legend entry, or the chip; Statistics updates in place beside the popover | 1 to 2 |
| 7. Make the layout readable | the Run icon on the Layout row of the graph, a set, a group or a partition | 1 |
| 8. Colour or size by a value | automatic on a run; a column header's Color by; an Appearance row's picker | 1 to 2 |
| 9. Create and combine sets | Ctrl+G; the boolean split button on several sets | 1 |
| 10. Compare with... | two selected objects' inspector; a result editor's menu, a column header, a set's type row, a node's overflow, a graph's context menu | 0 to 2 |
| 11. Find the shortest path | Find path from... on a node arms the Path tool with the start filled in; or P | 2 |
| 12. Re-run an analysis on new data | Data, Replace data | 2 |
| Bookends: load, export | the empty canvas, File, a dropped or pasted file; an Export section's button, or Export... in the header | 1 |
| Tail tasks | the catalogue, the palette, overflow and context menus, the main menu | -- |

**The Path tool** keeps its toolbar slot, although shortest path ranks 11th: it is the only
operation whose input is pointing at two things on the canvas, the shape of Figma's Comment tool,
and three investigation workflows start from an unselected node ("Path Investigation", "Fraud
Ring Investigation", "Criminal Network Analysis"). It obeys the catalogue's cost rule: every
variant is bounded, Run shows the cost word, and the output is cut at a declared cap. A usage check
decides whether it stays (section 14).

**A list row carries at most one mark**, the most urgent, in this order: Failed, running, Out of
date, scope differs, approximate. Every other mark is under Details or in the row's editor. With
every mark on, a result row counted 17 to 20 words.

**No capability gets a surface because one persona needs it.** Novices are served by defaults,
undo, (i), tooltips, the palette, samples and Additional labels. Verbs follow the object's kind
and its data, never the persona: a pair has the same row commands whoever produced it, and Merge
nodes is disabled, with the reason in its tooltip, when the pair's ends carry different declared
node types.

Wayfinding:

- **What is selected.** The inspector's type row, the canvas outline in the one reserved
  selection colour, the highlighted row in the object list and in the table: four views of one
  selection. A selected set's or group's members get Figma's fainter secondary outline.
- **What mode I am in.** The view-mode button shows its value. An armed tool shows its secondary
  bar; Esc disarms it. The comparison surface and Version history have their own Done.
- **What the numbers are computed on.** The filter chip, always. A result whose scope differs
  says so on its state line ("on: without Supplier X, 5,290"); the legend title names its scope
  when it differs.
- **Where a value came from.** Three clicks at most: a node's Colour row names its style layer;
  the layer names its result; the result editor's state line and Details give the record. Sets,
  paths, items and derived graphs carry a Created from row.
- **Where I put it.** Find (Ctrl+F) searches every kind of kept thing by name, grouped by kind.
- **Where I was.** Selecting never moves the camera and is not undone. Exploring hop by hop keeps
  its trail as a Filter to neighbors step, a Create path or a saved view; there is no selection
  history.

**The zoom and view menu** holds: zoom, fit and zoom to selection (Shift+2); camera presets and
Follow selection; the **Views** submenu; display toggles: Show labels, Show arrows, the legend and the minimap (off by default), which a
view captures, and note markers, which it does not, because a view shows its own list of notes; the table and time slider toggles;
and Additional labels. Labels and arrows themselves (which elements, which column, what style)
are style-layer channels; the menu only shows or hides them, as Figma separates a fill from "Show
outlines". The one legend covers the channels that are visible and not covered, in the canvas
corner away from the toolbar and the Help button.

## 11. One home for every output

The 61 capability files in `design/designloom/capabilities/`, each split by output where it
bundles several (rule 1), with each output's one home and its routes.

| Capability: output | Home | Routes |
|---|---|---|
| algorithm-progress | the result's row in the Results panel (state, progress, Cancel) | the toast |
| all-paths-finding | the path family's result editor | the Path tool, "all paths" variant; Find path from... |
| analysis-history | Version history | the result editor's runs and queries; Details |
| animated-transitions | the canvas | reduced motion in Preferences |
| annotation: notes | the Notes panel | the Note tool (C); Add note; each object's Notes section; canvas markers; the palette |
| annotation: free text, shapes, canvas anchors | rejected (appendix) | -- |
| anomaly-detection | its result editor (a node list or a metric) | the catalogue; the palette; the SD bands of any histogram |
| basic-statistics: headline readings and counts | the graph's inspector, Statistics | Esc returns to it |
| basic-statistics: average, minimum and maximum degree | the degree histogram's caption | the degree distribution in Statistics |
| centrality-betweenness, -closeness, -eigenvector, -pagerank | the metric result editor | the catalogue; the palette |
| centrality-degree | the attribute histogram on degree, with its variant row | a node's degree row; the degree column; the degree distribution in Statistics |
| clustering-coefficient: local clustering | its metric editor | the catalogue; catalogue search |
| clustering-coefficient: transitivity, average clustering | their Statistics readings | catalogue search |
| community-detection | the partition result editor | the catalogue; the palette |
| community-profiling | the Groups tab, with its Between groups view and group columns | a partition editor's "N more"; a group's inspector |
| comparison-view: two selected objects | their inspector | Shift+click; the set picker's "another set or group" |
| comparison-view: a reading or what-if | the editor popover where it was asked | "Compare with..." on a result, reading, node or set |
| comparison-view: two columns | the table's Scatter view, with the statistic in the popover | "Compare with..." on a column header |
| comparison-view: two drawings | the comparison surface | "Compare with..." on a graph, data version, window, set or group, or two selected objects |
| component-analysis | the permanent Components result (weak and strong variants on a directed graph) | the component counts in Statistics |
| computed-attributes: per-element formulas | New column, From expression..., on a column header | the palette |
| computed-attributes: aggregates over neighbor values | the neighborhood aggregate's metric editor; an expression reads its column and never aggregates over edges itself | New column, Aggregate over neighbors... |
| data-export: tables of values | a tab's Export table | the palette |
| data-export: tables of readings | Export table in a Statistics section's "..." | the palette |
| data-export: figures and graph files | an object's Export section | the Export dialog; Copy as PNG |
| data-import | the import report, in its Version history entry | File, Open... (a file, a URL, pasted text, or a nodes file and an edges file together); the empty canvas; dropping or pasting; the Data submenu; the load toast |
| data-preview | the import report's first line; the preview gate itself is rejected (appendix) | the load toast, which shows that line while it loads, with Re-map |
| data-validation: rejected rows, endpoints not found, keys | the import report | the mark rows in Statistics; Last import under its "N more" |
| data-validation: completeness per attribute | the column header | "Attributes: N incomplete" in Statistics; the import report |
| degree-analysis | the attribute histogram on degree (variants, bands, Fit power law) | the degree distribution in Statistics |
| details-on-demand | the selection's inspector | hover label on the canvas |
| ego-network | the several-elements Statistics that Select neighbors lands on (size, density, cut edges) | Select neighbors; Filter to neighbors; the context menu |
| export-image | an object's Export section | the Export dialog; Copy as PNG |
| filtering | the filter chip's popover | Filter to and Filter out on type rows and context menus; column headers; histogram bands; legend entries |
| graph-rendering | the canvas | -- |
| guided-onboarding | no surface of its own | samples, (i), the palette, docs, Additional labels |
| hover-highlight | the canvas | -- |
| keyboard-shortcuts | the shortcuts panel in the dock | the Help button |
| large-graph-rendering | the canvas, with its status line while something is not drawn | Performance mode in Preferences |
| layout-force-directed, -hierarchical, -radial | the Layout row (graph, set, group or partition), whose popover holds its settings; a root or centre accepts the selection | "Run layout" on the empty canvas; the palette |
| legend-display | the canvas legend | its toggle in the view menu |
| link-prediction | the pair-list result editor | the catalogue; the palette |
| metric-histograms | the attribute histogram popover | column headers; Attributes values; the metric editor |
| neighborhood-expansion | the several-elements Statistics that Select neighbors lands on | Select neighbors' split button (hops, direction, edge type, from server); the context menu |
| node-merging | the merged node's inspector | Merge nodes in the several-elements overflow; a Pairs row's context menu; Merge nodes... in the pair-list editor; the palette |
| node-selection | the inspector's type row ("N selected") | the canvas outline; the Select tool; Find; the table; the Edit menu; list rows |
| overview-minimap | the minimap on the canvas | its toggle in the view menu |
| path-highlighting | the path's row in Style layers | the path's Appearance; the eye on its query row |
| pattern-search | not placed: pattern search is outside the model until a catalogue algorithm exists (`conceptual-model.md` 1.5) | -- |
| progressive-loading | the load toast | -- |
| removal-impact-analysis: one scenario | the what-if in the editor popover | "Compare with..." with "Without this" |
| removal-impact-analysis: every scenario | the scenario table of the comparison result | Scope "Without each of..." |
| report-generation | the Export dialog's report | the header's Export...; Ctrl+Shift+E |
| sample-datasets | the empty canvas | File, Open sample; the Help button |
| saved-filters | the object list, as rule sets | Save as rule set in the filter popover, a histogram band, a value's menu and Find's query |
| search | Find (Ctrl+F) in the left panel | the palette |
| selection-statistics | the several-elements inspector, Statistics, each reading beside the graph's behind "N more" | Export table in its "..." for a CSV |
| shortest-path | the path family's result editor | the Path tool; Find path from... |
| statistics-panel | the graph's inspector, Statistics and its "N more" | Export table in its "..." for a CSV |
| style-presets | the built-in looks in the style-layer picker, each adding its style layers to the stack | Add style layer |
| temporal-analysis | the series result editor | Scope "Each of..." the windows; Over time... in Statistics and in the attribute histogram; the time family |
| temporal-navigation | the time slider in the dock | the view menu toggle |
| tooltip-display | the canvas | -- |
| view-bookmarks | Manage views | the Views submenu; Find; the palette |
| visual-encoding-edges, -nodes | the Style layers section | Appearance rows; column headers; the result editor |
| zoom-pan | the canvas | the zoom and view menu |

**Outputs no capability file names**, placed by the same rules:

| Output | Home | Routes |
|---|---|---|
| The neighborhood aggregate (an account's exposure to flagged neighbors, a supplier's concentration by region) | its metric result editor | the catalogue's structure family; New column, Aggregate over neighbors... |
| A graph's declared direction and weight | the Edges reading's editor | Re-map columns; the "weight: unknown" mark; each result's Direction and Weight rows (a per-run override) |
| Group columns from member statistics | the Groups tab column | New column, From expression... on the Groups tab |
| Per-scope and difference columns of a list-scope run | the Nodes or Edges tab | the result editor's Scope row; the comparison surface's Changed list |

**Data operations.** By rule 2 each is homed where its output is read. The Data submenu, the drop
point, the empty canvas, paste and the palette are routes to all of them. Every one that ends in
"..." takes its inputs in the editor popover (section 2).

| Operation | Home | Object routes |
|---|---|---|
| Add data..., Add as another graph..., Replace data..., Join... | the import report | a file dropped on a loaded graph offers these four at the drop point; "+" on the Graphs section (Add as another graph) |
| Replace data on a URL- or server-backed graph | the import report | it re-queries the source with the same parameters (`conceptual-model.md` 3.2); a failure keeps the current data and says so in the toast |
| Re-map columns... | the import report | the load toast |
| Add node, Add edge | the new element's inspector | "Add node here" on the empty canvas; Add edge on a Pairs row |
| **New graph from**: Combine graphs..., Bipartite projection..., Quotient graph..., Sample from null model... | the new graph, whose Created from row reopens the inputs; Combine's key report is its import report | the graph's "..." (Combine, with a key row); a categorical or list-valued column's Column submenu (Bipartite projection); a partition editor's menu (Quotient graph, which keeps one meta-edge per edge type between two groups when an edge type is declared) |
| Merge nodes | the merged node's inspector | as node-merging above |
| Remove | its Version history entry, which lists what was removed | the several-elements and set overflows |

**Keys.** Every operation that matches keys uses the same rules and reports in the same device:
Join..., Add data, Combine graphs..., Find's pasted list, and the comparison surface's matching of
two graphs. Keys are matched with whitespace trimmed and a **Match case** toggle, off by default;
the key row also offers **via mapping table** for identifiers in two namespaces. The report, in
the import report (or, for Find, under the list and, for the comparison surface, in its header),
reads: matched ("12 matched ignoring case" when that was needed), unmatched (listed), and
duplicate keys with how each was resolved (the first row kept, or the values joined as a list, the
choice made on the key row). Combine's report adds the counts of nodes and edges in A only, B only
and both, the attributes kept twice (suffixed by graph name) and the parallel edges it merged; its
membership attribute ("A only", "B only", "both") is an ordinary categorical column, so Color by on
the Edges tab gives the three-state legend and Group by gives the counts. The toast carries the
same headline numbers.

**The paste rule.** Pasted text that parses as a graph loads as one. A single column of ids on the
empty canvas loads as nodes, and when a registered data source accepts an id list, the load toast
offers "Connect to data source..." with the list filled in; the app never guesses which the analyst
meant. Connect started from a graph of pasted ids is **Replace data** on that graph: one data
version, the query and its ids in the record, and undo returns to the pasted list. The dialog's id
argument offers "the node ids of this graph" whenever a graph is open, so the route does not
depend on the toast. On a loaded graph a single column of ids is a one-column Join, whose "true"
group makes the set (`conceptual-model.md` 3.2). Pasted into Find, the same list selects what it
names.

## 12. What graphty-element must publish

Each item is published API or part of the project file. None may be built in the app, which only
reads and draws.

1. **The tree of analysis results**: result, run or query, item; change events; the permanent
   Components result with its weak and strong variants.
2. **Items of every result kind as sortable, pageable columns**: group Statistics per group, the
   edge counts between groups (split by edge type), paths with length, cost and hops, matches,
   pairs with scores and rank within source, saved comparisons, each item's own attributes, and
   group columns from member statistics over the aggregate list of section 5, stored as their
   expression, as every expression column is.
3. **Memberships and neighbors**: `memberships(id)`, a selection's memberships summarised per
   result or set, and `neighbors(id, hops, direction, edgeType)`, with incident edges and distinct
   neighbors told apart.
4. **Rank with its denominator and deviation over the scope of the run that wrote the value**, for
   metric values, degree and core number included (`element-contract.md` 12), and a rank column on
   request.
5. **A dependency graph** between results, sets, style layers, views and notes, for Used by, "N
   covered", citation marks and what a Delete detaches.
6. **Session state read the same way by every surface**: the filter pipeline, including the time
   slider's live Window step with its Nodes row, neighborhood and path steps with their start
   nodes, and steps over items; the object selection; the filtered graph.
7. **`find(query)`**, accepting a name, a query or an id list (with the key options of section
   11), with hits grouped by kind, the ids not found, and for each hit outside the filtered graph
   the step that excludes it.
8. **Quoted values in notes**: target, attribute key, the run and the value when written, and
   whether the live value differs.
9. **The views collection**, with "changed since applied" state, each view's note order and its
   export settings.
10. **Catalogue metadata**: family, (i) text, a cost band, whether arguments are required, and
    precondition marks that can be read before a run. Family and description exist
    (`graphty-element/src/catalog/types.ts`); the rest do not.
11. **Statistics of any scope**, including a subset's boundary, each reading of a subset beside
    the graph's, two scopes side by side with Jaccard overlap, the "in all N" and "in k or more"
    counts of several scopes, the largest component's share, the self-loop, parallel-edge and
    negative-weight counts, each attribute's profile against the parent, each attribute's
    missing count, the count of incomplete attributes, and a scope's readings as an exportable
    table.
12. **Histogram bins** for any numeric attribute over any scope, linear or log; the mean and SD
    bands; bands by range, percentile or top N as set definitions; the degree variants, extremes
    and power-law fit.
13. **Authored attribute writes**: one value across many elements, or onto an item, as one undo
    step.
14. **The import report and Re-map**: how a load, Add data, Join or Combine read its source
    (format and mapping, available while it runs), the query ids found and not found, what it
    rejected, the key report of section 11 (matched, unmatched, duplicates and their resolution,
    case-insensitive matches), and a reload with a corrected mapping including endpoint node
    types, direction and the weight role; the restore report on Open, grouped by what each
    reference lost.
15. **Series**: values per window, change points, the trend with its method, partition splits and
    joins across windows, the elements each count point counts, and the time family's rows.
16. **Transforms** that produce derived graphs with their derivation maps, including a quotient
    graph with one meta-edge per edge type and Combine's membership attribute and key report.
17. **Version history**: data versions, each with its import report, and the operation log
    between them, readable in order, each entry tagged by graph, with undone operations marked,
    and exportable as CSV or JSON.
18. **Whether an AI provider is configured.**
19. **Comparisons**: two readings; a "without" scope with its Cut off count, its sources and its
    direction; the list scopes "each of" and "without each of" over groups, members, windows,
    graphs and the two sides of a comparison, writing one column per overlapping item and a
    difference column over two; the scenario table with its declared sort; the difference list of
    two states (added, removed, changed per attribute and reading, and AMI and ARI with splits and
    joins for a partition run on both sides); two scopes of one graph as a comparison; drawing
    side B with side A's style stack, rebinding each layer by attribute name and marking any layer
    whose attribute B lacks.
20. **Queries**: pattern arguments from a selection; the per-element count of the items of a query
    it is on; path queries bounded by k or a hop limit, with a cost band and a declared cap;
    cycles through a node under the same bounds; a pair list's sources and targets.
21. **Merge of many pairs**, one merge per pair, as one undoable data edit, skipping pairs across
    declared node types.
22. **A graph's declared direction and weight** (attribute and role), each with a per-run override
    recorded on the run.
23. **The neighborhood aggregate** as a run: an attribute, an aggregate from the list of section 5,
    hops, direction and an edge predicate.
24. **Style layers**: the No value count, and the No value look on analyst layers only; the opacity
    and outline channels; the Default look as the stack's bottom row and the Overrides layer as its
    top row, both published as rows of the stack.
25. **Graph-file export** of the graph or a scope through graph-io's exporters (GraphML, GEXF, GML,
    DOT, Pajek, JSON), with each attribute's declared role and the project metadata block.
    Today the element registers no exporter (`graphty-element/src/catalog/formats.ts`). CX is not
    written by graph-io and is not offered.
26. **Two catalogue metrics** in the structure family: the participation coefficient over a chosen
    partition, and Burt's constraint.

**What changes the project file.** Items 1, 2, 5 (what a Delete detaches), 6 (the filter pipeline,
which views capture), 8, 9, 13, 16, 17, 19 (saved comparisons), 21 (forwarding maps), 22 and 24
are stored in the file (`element-contract.md` 11). This document adds to the file: item
attributes, group columns from member statistics, the start row of a neighborhood or path step,
the step over items, the Window step's Nodes row as views capture it, saved comparisons over list
scopes, per-scope and difference columns, the declared direction and weight with their per-run
overrides, a view's note order, a style layer's No value look, and the Default look and Overrides
rows. Each is a new field under the file's version number and tolerant reader, so none of them
fixes a shape the reader cannot absorb. Two file questions are one-way doors: who owns style
layers and rule sets, and whether node identity includes the node type (section 14).

## 13. Counted states

Counted by `principles.md` 5: app words only; names, values and counts are data; standard terms
count; each (i) visible at rest counts one. Targets are everything that answers a click at rest:
a button, a link, a swatch, a chart, a number that routes; a control that shows only on hover is
not counted.

**The graph's inspector at rest**, nothing selected, one run painted, no filter, no marks (budget
32):

| Part | Directed | Undirected |
|---|---|---|
| "Statistics" 1; Nodes 1; "Directed edges" or "Undirected edges" 2; Density and its (i) 2 | 6 | 6 |
| Components: weak row (the term 3, "isolates", (i)) 5 and strong row (the term 3, (i)) 4; or one "Connected components" row with "isolates" and (i), 4 | 9 | 4 |
| "Degree distribution" and its (i) 3; "more" 1; "Attributes" 1 | 5 | 5 |
| Layout row: "Layout" and the method name 2; "Style layers" 2; its "more" 1; "Export" 1 | 6 | 6 |
| **Total** | **26** | **21** |

Each addition counts once: an active filter's "of" on the Edges row 1; "weight: unknown" 2;
"Attributes: N incomplete" 1; an import-count mark row 1 or 2; a derived graph's Created from row 2;
"self-loops" 1, "parallel edges" 2 and "negative weights" 2, each only while non-zero. The heaviest
ordinary case, a directed graph under a filter with an unknown weight role and incomplete
attributes, is 30; with all three edge counts non-zero as well it is 35, within the about 37 that
`principles.md` allows in the open (worked conflict on the graph's inspector at rest, and the
ledger row on import-count rows). Each is a principle-1 caveat, and each count is also a target.

**The whole screen at rest**, a graph loaded, nothing selected, one run painted (budget 50):

| Place | App words |
|---|---|
| Rail labels: Graph, Results, Notes (Assistant adds 1) | 3 |
| Left panel: Results, which a project with nothing kept opens on (counted below) | 17 |
| The graph's inspector, directed | 26 |
| Header: Export; the chip "All nodes"; zoom is a value | 3 |
| Toolbar: icons; the view-mode value "3D" | 1 |
| The legend title's channel word | 1 |
| **Total** | **51** (46 on an undirected graph; 50 before the first run paints; 34 once something is kept and the project opens on Graph, whose names and rows are data) |

The 51 is one word over the budget of 50, and the word is the legend title that a painted run
adds, which principle 1 requires (a legend names the result it encodes); the conflict ledger
records it. The Graph panel adds no words: project name, graph name and object rows are data, and
an empty object list is blank.

**The same, filtered, above the drawing limit**: the chip becomes "Filtered: of nodes" (1 more
than "All nodes"), the Edges row's "of" 1, and the status line "2,100 not drawn" with its (i) 3
(the reason is in the (i)). Total **39**. The header, toolbar, chip, legend and status line come
to 9, within their sub-budget of 10.

**Targets at rest**, the same screen, directed graph, against Figma's resting editor. Figma's
right column with nothing selected carries 24 targets: the Design and Prototype tabs, zoom, the
variable-mode button, the page colour's swatch, hex, opacity and visibility, Show in exports, the
Styles header and Create style, Add export settings, two export rows of five controls each, the
Export button and Preview (`design/ui/figma/right-sidebar-selection/dump-nothing-selected.txt`,
Help and the agents prompt excluded). Its toolbelt carries 17 (six tool groups of tool and
chevron, one action, four modes; `design/ui/figma/bottom-toolbar/README.md` 1) and its rail 6.

| Place | graphty | Figma |
|---|---|---|
| Right column: header Export 1, chip 1, zoom 1; name row swatch and "..." 2; Layout row method and Run 2; Statistics 18 (its "..."; a number and a row for Nodes and for Edges; a row and (i) for Density; the weak row's number, isolates number, row and (i); the strong row's number, row and (i); the degree row and its (i); "N more"; the Attributes row); Style layers "+", 2 rows and "N more" 4; Export "+" 1 | 30 (27 undirected) | 24 |
| Toolbar: Select and its flyout, Path, Note, palette, view mode | 6 | 17 |
| Rail: main menu, Graph, Results, Notes | 4 | 6 |
| Left panel header: project name, Minimize UI, the Graphs header, its Find and "+" | 5 | the same controls in the same places |

Outside Statistics, graphty's right column carries 12 targets to Figma's 24; the Statistics
section is the recorded departure and accounts for the rest. The cap is in `principles.md` 5.

**Height of the graph's inspector** at an 800 px window, rows about 24 px, headings and the type
row 32 to 40, under the 81 px of the two header rows: name row 40; Layout row 32; Statistics
heading 32, six readings 144 (the degree sparkline sits inside its 24 px row), "N more" 24 and the
Attributes row 24; Style layers heading 32, two rows 48 and "N more" 24; Export heading 32.
About **432 px**, leaving room for every mark row and a Created from row without scrolling.

**The Results panel at rest**, every family closed, no time attribute (left-panel budget 8):
"Search" 1, "In this project" 3, "Connected components" 2, and the five family names (centrality 1,
community detection 2, paths and flow 3, structure 1, similarity and link prediction 4) 11: **17**.
This is over the budget of 8, recorded in the open in `principles.md`'s conflict ledger: the
families are the only way to find an algorithm without its name, the terms are the field's own and
are never shortened, and the whole screen at open still comes to 50 before a run paints (above).
Cost words add nothing at rest,
because families are closed and a fast row carries none.

Selected objects (budget 40 each; a Notes, Memberships or Used by section appears only when it has
something in it):

| State | Count | Total |
|---|---|---|
| **One node**, a gene with 30 imported columns and four centralities run, no notes | headings Attributes, Memberships, Appearance, Export 4; the filter field 1; "degree", "neighbors" 2; four metric names 4; "more" 1; two Memberships rows ("resolution", "community", "of" in each) 6; Appearance channels (Color, Size, Label) 3 | **21** |
| **40 nodes selected** | "selected" 1; headings Statistics, Attributes, Memberships, Appearance, Export 5; "nodes", "edges", "density", "cut edges", "more" 6; "differ" 1; three Memberships rows 6; Appearance channels 3 | **22** |
| **A rule set under an active filter**, nothing depending on it | size unit "nodes" 1; Layout row 2; Rule row: "Rule", "induced", Scope, Population 4; "Created from" 2; Statistics: heading, nodes, edges, density, two "of", "cut edges", "more" 9; Members heading and "more" 2; Appearance heading and Color 2; Export 1 | **23** |
| **A named Louvain group** | "Created from" and the stepper's "of" 3; Layout row 2; Statistics: heading, nodes, edges, density, "of", "cut edges", "more" 8; Attributes heading and "name" 2; Members 2; Appearance 2; Export 1 | **20** (21 unnamed, titled "Community 4") |
| **Two selected sets with 10 attributes** | "selected" 1; Statistics heading, nodes, edges, density, "Jaccard overlap", "Save comparison" 8; "more" 1; Export 1 (the three attribute names shown are data) | **11** |
| **Five selected top-10 sets** | "selected" 1; Statistics heading, nodes, edges, density 4; "in all", "in 2 or more" 5; Export 1 | **11** |

**Height of the one-node inspector** at an 800 px window: type row 40; Attributes heading, filter
field, 10 values and "N more" about 300; Memberships heading and 2 rows 72; Appearance heading and
3 rows 96; Export heading 32. About **540 px**, so every section is reachable without scrolling. At
a shorter window it gives way in this order: Attributes drops to 7 values before "N more", then the
inspector scrolls as one panel; the type row never scrolls away.

**The heaviest transient readings at 240 px** (208 px of content), set against the device rule of
rule 9:

| Reading | Rows | Height | Where it is read |
|---|---|---|---|
| A what-if on a directed graph with 6 statistics run | type row 40; Sources and direction 64; Cut off 24; six headline readings as a label of about 96 px and two value columns of 56 px, 144; "N more" 24; Save comparison and Run 32 | about 330 px | the popover; the 6 run statistics are behind "N more", in the table with A, B and difference columns |
| Two numeric columns compared | a scatter plot needs about 300 x 300 px to separate points | -- | the table's Scatter view; the popover keeps the correlation and the missing and unmatched counts |
| An import report with rejected lines and Re-map open | the first line, 5 count rows, a list of rejected lines, 13 Re-map rows | over 700 px | its Version history entry, at full height |

## 14. What is still open

**The owner's open decisions** are listed in one place, `one-way-doors.md`, each with a
recommendation. Two of them shape this document, because each fixes a storage shape, not a
layout; the opening view mode on a desktop (2D, recommended) is another, and the view-mode button
shows whichever it is.

1. **Whether style layers and rule sets belong to the project or to each graph.** Today each graph
   entry holds its own in its session part (`element-contract.md` 11), so nothing carries a
   style from one graph to another in the same project. "Condition Comparison - Disease vs Control
   Networks" needs one encoding on both conditions, and "Gene List to Interaction Network with
   Expression Overlay" names rebuilding the same style for a second list as a pain point.
   **Recommendation:** follow Figma, whose local styles belong to the file and are used on every
   page (`research/figma.md` 4, the nothing-selected inspector's "Styles" section). Style-layer
   definitions belong to the project, and each graph's Style layers section is its own ordered
   stack of references to them; "Add style layer" then lists the project's layers from every
   graph. Sets, rule sets among them, stay with their graph, because a fixed set's members and a
   rule's result paths name one graph; "Copy to graph..." copies a rule set to another graph
   (`one-way-doors.md` 5). Views and notes stay with their graph. If the owner keeps them per graph, the
   fallback is "Copy to graph..." on a style layer's context menu, with the same rebinding the
   comparison surface uses (section 8.1).
2. **Whether a node's identity includes its node type.** In a two-mode table (users and items,
   authors and papers, genes and pathways), user "123" and item "123" are either two nodes or one
   node that silently carries both kinds of edge, which makes bipartite density and Bipartite
   projection wrong with no warning. Node identity is part of graphty-element's published contract
   and of every saved project, so changing it later re-keys saved projects.
   **Recommendation:** once endpoint columns declare different node types, a node's identity is
   its type plus its id, and the import report's first line counts the ids that occur under more
   than one type. With no declared types, identity stays the id alone (`element-contract.md` 2).

**Where the autosave keeps the project** is not an owner decision. graphty-element keeps it in the
browser's storage for the site and asks for persistent storage (section 2). The project file's
shape does not depend on where it is kept, so a file-system or server location can be added later
without changing anything saved. The interim cost is real: clearing site data loses the work, and
"Reproducible Session and Network Publication" (reopen in six months) then fails, so the chevron
menu's first line and Ctrl+S say when a copy was last downloaded; nothing prompts.

The rest are settled by a test or a count, and undoing any of them is an edit.

| Question | What settles it | If it fails |
|---|---|---|
| Is the catalogue findable below 30 results? | A first-click test, "run Louvain", palette hidden, on a project with 30 results; pass at 80% within two clicks | a fixed "Algorithms" row under the search field that drills into the catalogue |
| Is opening on Results while nothing is kept right? | A first-click test, "run a centrality", from a fresh load, against a build that opens on Graph | open on Graph always, as Figma does |
| Do returning analysts review notes from the rail? | A first-click test, "what did you conclude last week?" | Notes opens from the Note tool's flyout and from Find, with no rail button |
| Does the Path tool earn its slot? | Count, over the investigation workflows, how often the first endpoint is not already selected | drop it; P and Find path from... arm the same secondary bar |
| Is the table open most of a session? | Measure it over "Hub Gene Identification and Ranking" | the dock opens on the first run |
| Is Run layout on a row found? | A first-click test, "tidy this graph", nothing selected | add Run layout to the graph's type row |
| Is the import report found after a load? | A first-click test, "how many rows were rejected?", after the toast has gone | move Last import from "N more" to rest, as a row under the headline readings |
| Is the Assistant in scope? | Decided: kept. graphty-element already publishes the assistant (`./ai`), and its rail button appears only when a provider is configured, so it costs nothing at rest | removing it later deletes one rail button and the palette's "Ask..." |

## Appendix: the earlier gap register, placed

Every gap in `design/ui/object-first-ux/round-3/gaps.md`, and every workflow output the walks found
unplaced, with its home. "Rejected" gives the reason the model refuses it.

| Gap | Home |
|---|---|
| File menu after a load; Ctrl+O | main menu File; chevron menu for the project as a file |
| Close with a confirmation of what is lost | chevron menu, Close; no confirmation, because the project autosaves |
| Unsaved-changes marker and prompt | rejected: autosave |
| Save as a project file, reopen, missing data | Download project file; Open, whose restore report lists what could not be reconnected; the autosave (section 14) |
| What a session file contains before saving | the chevron menu's first line; the Download toast repeats it |
| Restore after a reload or crash | the autosave, in persistent browser storage; a downloaded copy survives clearing site data (section 14) |
| Export a recipe and replay it on a new file | Replace data on the project (task 12); a project as template |
| An executable script export of the history, or restoring a state by double-clicking the log | rejected: a project as template, then Replace data, replays the analysis |
| An in-app script console | rejected: graphty-element's session API is the scripting surface, documented under Help, Docs |
| Two graphs, switch, combine by node id | Add as another graph; the Graphs section; Combine graphs... with its key row |
| One network's history among several | Version history opened from the graph's row, filtered to it |
| Settings sheet | the Preferences submenu |
| Drop a file on a loaded graph and choose | the four data operations offered at the drop point |
| Add data with a rule for existing ids and a match count | Data, Add data...; the key report |
| Load from a URL | File, Open... |
| Paste graph data; Ctrl+V on the canvas | the paste rule (section 11) |
| Start from a list of ids, then query a source | the paste rule (Connect is Replace data on the pasted graph); Find with a pasted list; argument rows that accept a list |
| A nodes file and an edges file together | File, Open... with both chosen |
| Choose id and label columns; declare endpoint node types, direction or weight | detected; corrected by Re-map columns..., and direction and weight in the Edges reading's editor |
| The same id under two node types | counted in the import report; identity rule pending (section 14) |
| A preview gate before import | rejected: loading commits at once and is corrected with Re-map columns... and undo; the toast states the reading while it loads, so a wrong guess is cancelled in the first second |
| Parsing options; unreadable rows | Re-map columns... and the rejected lines in the import report |
| A load that fails entirely | the toast with Details; the canvas keeps its state |
| Progress with Cancel | the load toast |
| A file above the drawing limit: choose a subset first | rejected: the load commits and analysis sees every node; the status line says what is not drawn and Filter to draws a part |
| Large-graph state and Performance mode | the status line; Performance mode in Preferences |
| Load from a server | File, Connect to data source... |
| Reload a URL-backed dataset, recover on failure | Replace data, which re-queries a source-backed graph |
| Import report after the toast is gone; import options after a load | Last import under Statistics' "N more", which opens its Version history entry with Re-map columns...; completeness on column headers |
| Join a table by key with a match report, duplicates included | Data, Join...; the key report (section 11) |
| Map identifiers before a join; case and spacing of keys | the key row, "via mapping table"; Match case, with whitespace always trimmed |
| Condition membership after a combine (A only, B only, both); attribute collisions | Combine's key report and its membership column |
| Edit one value | a table cell or an Attributes value, as Correct |
| Column operations | the column header menu and its New column and Column submenus |
| Computed column; rank as a column | New column, From expression... and Rank |
| Remove and merge nodes; resolve many duplicates | the several-elements overflow; Merge nodes... in the pair-list editor |
| Split a merged node after later work | rejected: undo, or Replace data from a corrected source; the forwarding map keeps the option open |
| Add a node or edge by hand | "Add node here"; Data, Add node and Add edge; Add edge on a Pairs row |
| Expand neighbors from a server | "Select neighbors from server" in the split button |
| A node's edges in time order | the degree count, which opens its incident edges; sort by the time column |
| Undo and a History dock | Ctrl+Z; Version history is the readable history, as Figma shows no undo list |
| Selection history; losing context on deep exploration | rejected: selection is not undone, as in Figma; the trail is kept as a Filter to neighbors step, a Create path or a saved view |
| Two lists of history (data versions, the operation log) | one Version history |
| Object menu: rename, duplicate, delete, reorder | the row's context menu; double-click or Ctrl+R renames; drag to reorder; Delete never asks and detaches dependents (section 2) |
| A failed run and Retry on the CPU | the Failed mark with Re-run; "Re-run on CPU" in Details |
| Out-of-date objects and Re-run all | the Out of date mark; "Re-run all out of date" in the Results header; the toast after Use selection as start |
| The whole component fails | a message on the canvas with Details and Restart viewer, which restarts graphty-element on the saved project and re-opens no data |
| A tool that finds nothing | the query's outcome where it is kept |
| Right-click menus | the context menu, also on Shift+F10 and the Menu key |
| Find by name or id; search inside attribute values | Find (Ctrl+F), with a value query |
| The framing menu | the zoom and view menu |
| The 3D state | the view-mode button; camera presets in the view menu |
| Minimap | view menu toggle |
| Save and switch camera views | Views submenu and Manage views |
| Follow a node with the camera | Follow selection in the view menu |
| Selecting a row moves the camera | rejected: selection never moves the camera; Shift+2 frames it, as in Figma, so stepping through groups is a click then Shift+2 |
| Select many and the several-elements inspector | a box drag with Select, Lasso, Shift+click; section 4 |
| Select all, none, invert, edges between | main menu Edit; the context menu |
| Hide chosen nodes and show them again | Filter out, and turning its step's eye off; rejected as a display-only hide |
| Select an edge and read it | the one-edge inspector |
| The Edges tab | the table's Edges tab |
| Focus on a set | Filter to, which makes a data step; for a working set, Select members then Filter to selection |
| Fade everything outside the focus | an analyst layer with the opacity channel and a selector of NOT the working set |
| Keyboard-only exploration | with the canvas focused, arrow keys move to a neighbor and Enter selects; the inspector reads the focused node |
| Filter by values with counts | a column header's Filter to, a value checklist step; a legend entry |
| Filter by a range over a histogram | a histogram band |
| Filter by expression, AND, OR, NOT | the rule editor (section 9) |
| Filter edges; filter items | steps apply to nodes or to edges; a step on an item column is a step over items (section 9) |
| Segments without filtering the canvas; a top N or band that re-applies to new data | Save as rule set on Find's query, a histogram band or a value's menu |
| Repeat one investigation per alert | Filter to neighbors; the step's start row, Use selection as start, then Re-run all; the previous alert's evidence exported first |
| A selection that remembers how it was made, and Convert to rule | rejected: hidden state would make one visible selection behave two ways; Save as rule set sits wherever the rule is still on screen |
| Pattern search and stepping through matches | not placed (`conceptual-model.md` 1.5) |
| Cycles through a node (round-tripping) | the Path tool with To equal to From; each cycle is a found path |
| The neighbors tool: steps, direction, edge types, preview | Select neighbors' split button |
| An ego network's size and density; the star of edges to the ego | the several-elements Statistics after Select neighbors; the degree count opens the incident edges, then Ctrl+A and Create set |
| Burt's constraint (structural holes) | the catalogue's structure family |
| What a node's neighbors are like (exposure, share of churned contacts, which audiences it reaches) | the neighborhood aggregate over the aggregate list (share where, most common value, number of distinct values) |
| Share of a node's edges into other communities (bridges) | the participation coefficient in the structure family |
| Combine sets | the boolean split button |
| Members of a set, group or path | the Members section; the Groups and Paths tabs |
| Attributes on a set itself | rejected: a set's name and rule are its properties; writing to its members is Select members, then "+" |
| Notes on a found path or match | its Notes section, Add note in its overflow |
| Notes on a pair | a note on its two nodes; a pair is a row, not an object |
| Top nodes per community | Members sorted by the last metric; a rule with population "each group of" |
| "Top member by" a group column | the Members order |
| Group profiles: "most common", mean, sum, most frequent words | New column, From expression... on the Groups tab, over the aggregate list (section 5) |
| Functional enrichment per cluster | an ordinary registered algorithm in the catalogue; otherwise Export table on the Nodes tab with the community column, then Join... on the Groups tab by group key |
| A heat map of member values | rejected as a view: the table scoped to the selection, with its numeric columns, is the reading, and Export table feeds heat-map tools |
| Pie or donut charts on nodes for membership | rejected: Memberships reads a node's several memberships, and a categorical colour channel and group marks draw them; a pie is not legible at the node sizes drawn |
| All routes between two nodes; typed endpoints; direction; bounded enumeration | the Path tool's Options (variant with k or a hop limit, weight, direction); the cap "first N" |
| Common intermediaries of several paths | Intersect on selected found paths; the "on N of M paths" attribute |
| Hop numbers along a path | the Members section's ordered hops |
| Dim everything off the path | rejected in the path's automatic layer (`CLAUDE.md`, Algorithm Styles); a reader adds an analyst layer with the opacity channel, or uses Filter to on the path |
| Animate along a path | deferred; the video format's camera path runs through saved views |
| Add or remove members of a hand-made set | Add selection and Take out of set in the set's overflow |
| Empty results inside tools | the query's outcome; an empty section is absent |
| Values of a metric, Top N or threshold set | the metric editor; a histogram band, then Create set or Save as rule set |
| Which nodes are in the top 10 of more than one method | several selected sets: "in all N" and "in 2 or more" |
| Two metrics as a scatter plot | the table's Scatter view, from Compare with... on a column header |
| A metric in each condition and its difference as a column | Scope "Each of..." the two sides: per-side and difference columns |
| Modularity and group names from an attribute | the partition editor; Use as group names |
| Name a community | the group's Rename |
| How groups connect; a summary graph; a schema of a typed graph | the Between groups view, split by edge type; Quotient graph...; Collapse and Collapse all |
| The record | Details on the state line |
| Weighted or unweighted per run; which weight a run used | the result editor's Weight row; Details |
| Export one result | "N more", then Export table |
| Several algorithms at once; a parameter sweep | several catalogue rows, then Run; Sweep parameter... |
| Run on a set, the selection, each graph, or both sides of a comparison | the Scope row, including "Each of..."; Filter to, then run |
| Diameter, radius, mean path; self-loops and parallel edges; missing links; unusual nodes | Statistics "N more"; self-loop, parallel-edge and negative-weight counts as mark rows when non-zero; link prediction; anomaly detection |
| How far a value is from typical | the rank tooltip's deviation ("3.4 SD above the mean") |
| Distribution fit and outliers on any measure | Fit power law and the SD bands in every numeric histogram's menu |
| A CSV of the degree distribution's bins | rejected: Export table writes the degree column, and binning is a drawing choice |
| A p-value on a selection's statistics, or a highlight past 1 SD from the graph | rejected: a hand-picked selection is not a sample, so a p-value there reads as a finding it is not; the graph's value beside each reading is shown |
| A CSV of the graph's or a selection's statistics | Export table in the Statistics section's "..." |
| A Findings row on the dataset | rejected as a list of suggestions; the mark rows in Statistics carry what must be seen |
| Missing values on a clean load | "Attributes: N incomplete" in Statistics |
| What breaks if a node is removed; the most damaging single failures | Compare with... "Without this"; Scope "Without each of..." with Sources and direction (section 8.1) |
| Compare two objects, two sets side by side, or two windows; a subnetwork beside its parent | section 8.1 |
| Over-time results and biggest movers; a hub's growth | the series editor; Over time... in the attribute histogram; a series value in the node's Attributes |
| Arrival, departure, creation and dissolution rates; growth trend; who arrived when | the time family's series; the trend in the caption; a point's count lists its elements |
| Density and size over time | Over time... in Statistics |
| Community evolution | the partition series: splits and joins |
| Events on the timeline | a note written with the slider open cites the window and marks the chart |
| Notes, the note list, markers and callouts | Notes panel; Note tool; the Note editor; a view's or Export's Notes row |
| Free text at a canvas position; callout boxes; circles, rectangles and freeform shapes; anchor to canvas | rejected: a note anchors to its targets, and a label on a region is a group mark or a note on a set or group (`conceptual-model.md` 5.3) |
| The Assistant | the Assistant rail panel |
| Layout choice, settings, pause, re-run, keep file positions | the Layout row's popover (Preset keeps stored positions) |
| Positions from attributes (a map, a layered supply chain, a timeline) | the Positions from columns layout method |
| Layouts that need an input | the layout's parameters accept the selection or a partition |
| Lay out only a selection or one cluster | the Layout row on a set, group or partition |
| Drag to move and pin; Unpin all | dragging pins; the node's overflow; Unpin all in the Layout popover |
| Background, look presets, default look, arrows, legend | the background swatch on the graph's name row; built-in looks add their style layers to the stack; the default look is the Default look row at the bottom of the stack; arrow channel and Show arrows; legend toggle |
| Moving or collapsing the legend | rejected: no workflow step needs it; the legend's toggle and its fixed corner cover the need |
| Draw filtered-out elements faintly | rejected: a filtered-out element is not in the graph being read |
| Label control | the label channel of a style layer; Show labels in the view menu |
| Hover: tooltip and neighbor highlight | the canvas |
| A diverging palette on a midpoint | the style-layer editor's scale |
| Grey for elements with no value | the style-layer editor's No value row and legend entry |
| A thicker border on a few nodes | the outline channel of a style layer |
| Edge width or colour by an attribute | a style layer that applies to edges |
| Node shape by attribute; channel menus | style-layer channels |
| Style one node | the Appearance picker's Override, collected in the Overrides row |
| Save a style, apply elsewhere, export and import | style layers live with their graph until the ownership question is settled (section 14); a project as template; a library is deferred |
| The export panel; Copy image | an object's Export section; Copy as PNG |
| Export data | Export table; graph files in an Export section |
| A report and an evidence bundle; chain of custody | the Export dialog's report (PDF or HTML) and the operation log; one investigation is exported before the pipeline is re-seeded (rule 10) |
| A report in Markdown | rejected: HTML carries the same text with its figures, and PDF covers print |
| An interactive page as a deliverable | the project file, opened in graphty-element |
| Upload to a public repository (NDEx) with a reviewer link | deferred; GraphML is the collaborator format, and CX is not written until graph-io writes it |
| Node embeddings (Node2Vec, GraphSAGE) | rejected (`conceptual-model.md` 1.5): no surface reads a vector; scalar features export through Export table on the Nodes tab |
| Recommendation evaluation (precision, recall, A/B results) | rejected (`conceptual-model.md` 1.5): Export table writes the pair list with rank within source for the analyst's own pipeline |
| Video with a camera path; small multiples over time | the video format; views at successive windows as pages (section 8.2) |
| Present mode | rejected: presenting is Export |
| Enter and leave VR or AR | the view-mode button; the toast on return |

## Sources

- `design/ui/framework/principles.md` (sections 0, 3 and 5; "The graph's inspector at rest";
  conflict ledger; departures)
- `design/ui/framework/conceptual-model.md` (sections 1, 2.2, 2.4, 3.1-3.3, 5.2, 5.3, 5.4, 5.5, 6.1,
  6.2, 6.3, 7.1, 7.3, 7.5, 7.6, 8, 10, 11, 13)
- `design/ui/framework/top-tasks.md`, `design/ui/framework/glossary.md`,
  `design/ui/framework/element-contract.md` (sections 2, 9, 11 and 12)
- `design/ui/framework/research/figma.md` (4.1, 4.2, 4.8-4.16, 5.4, 5.5, local styles, Selection
  colors, branch review, and the follow-ups on the nothing-selected state, the result editor
  height, the view editor and comment mode)
- `design/ui/framework/research/design-method.md`, `design/ui/framework/research/graphty-today.md`
- `design/ui/figma/left-sidebar/README.md` (sections 1, 2, 3 and 6, and the main menu),
  `design/ui/figma/flows.md`, `design/ui/figma/components.md` (the alignment row; Zoom to
  selection, Shift+2),
  `design/ui/figma/right-sidebar-selection/README.md` (multi-selection; the view menu's Additional
  labels) and `dump-nothing-selected.txt`,
  `design/ui/figma/header-and-modes/README.md` (sections 2 to 4),
  `design/ui/figma/bottom-toolbar/README.md` (sections 1, 2, 5, 7, 8 and 9),
  `design/ui/figma/buttons-and-controls/README.md` (the Export dialog),
  `design/ui/figma/popovers-and-menus/README.md` (section 5 and the placement table)
- `graphty-element/src/catalog/formats.ts` (no exporter registered; CX unserved);
  `graph-io/src/formats/` (exporters for CSV, DOT, GEXF, GML, GraphML, JSON, Neo4j and Pajek)
- `design/designloom/capabilities/*.yaml`, `design/designloom/workflows/*.yaml`,
  `design/designloom/personas/*.yaml`
- `design/ui/object-first-ux/round-3/gaps.md`
- Figma help: https://help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotations-in-Dev-Mode,
  https://help.figma.com/hc/en-us/articles/360041547593-View-and-manage-comments,
  https://help.figma.com/hc/en-us/articles/360042553434-View-and-adjust-colors-in-a-mixed-selection
