# Round 3: editing and joining data

This document closes the eleven "editing and joining data" gaps in the gap register
(`design/ui/object-first-ux/round-3/gaps.md`, cluster 3): the functions a reader needs to
correct, extend and reshape the data after it is loaded, which the second round of the
object-first design (`design/ui/object-first-ux/round-2/revision.md`) either did not mention or
described without drawing. For each gap it gives the design (where the reader starts, what they
see, the rows, the keys, the errors), what graphty-element must provide, and the mock that draws
it. The mocks are `design/ui/object-first-ux/mocks/v2/screen-33.png` to `screen-42.png`, built from
the specs in `design/ui/object-first-ux/gen/screens/screen-33.mjs` to `screen-42.mjs`.

Paths are under `/home/apowers/Projects/graphty-monorepo/`. `#NNN` is an issue in
graphty-org/graphty-monorepo. `session.xxx` is a member of graphty-element's session API
(`graphty-element/src/session/`).

## Words used here

- **Data edit**: any change to the nodes, edges or attribute values the reader loaded, as
  opposed to a change to an object (a Set, a Measure, a Grouping) made from them. Removing a
  node, fixing a value, adding a column and joining a table are data edits. Hiding a node or
  painting it is not.
- **The journal** (drawn as the History tab of the bottom dock): the element's list of every
  change with what undoes it (settled decision 1 in `round-2/revision.md`). Ctrl+Z pops it.
- **Stale**: an object whose members or values were computed from data that has since changed.
  It keeps its old result, shows an amber dot, and has a Re-run button in its row
  (`round-2/revision.md` section 4).
- **Dry run**: asking the element what an action would do (how many rows match, how many
  edges survive) without doing it, so the dialog can show the count before the reader commits.
- **Dialog**: the 480 px modal box centred on the canvas over a dimmed backdrop, used for a
  decision with several fields (screen 14's Import dialog is one). **Popover**: the 240 px light
  panel anchored to the control that opened it, used for a short task that does not block the
  rest of the window. **Menu**: a list of verbs anchored to a "..." button or a right-click.

## Rules every data edit follows

These rules are what make ten different edits feel like one feature. Each section below relies
on them instead of repeating them.

1. **One undo step each.** A data edit is one journal entry, named by what it did ("Edit value
   of BrighamYoung: 7 -> 9", "Remove 3 nodes and 7 edges", "Join genes.csv: 3 columns, 318
   rows"). Ctrl+Z restores the data and every object result the edit changed.
2. **It says what it did, once, where the reader is looking.** The status bar's computing slot
   (priority 3 in `round-2/revision.md` section 1.6) carries a one-line report with Undo for a
   few seconds: "Edited value of BrighamYoung: 7 -> 9  [Undo]". The same text is the History
   step. Nothing pops up.
3. **Consequences follow the cost rule.** After a data edit, every object whose definition
   reads the changed data is re-run at once if it is cheap and turns stale if it is not, exactly
   as after a Define edit (`round-2/revision.md` section 4). Every dialog that commits a data edit
   has a line naming what will re-run and what will turn stale, before the reader presses the
   button.
4. **The file on disk is never written.** Edits live in the session and the project file (#301).
   Export data (cluster 8's screen 96) writes the edited graph. The Dataset's summary row, which
   today reads "karate.gml, GML", gains the edit count: "karate.gml, GML, 3 edits", and the Data
   tab's "Made by" disclosure lists them (its last row, "Edited: 1 node added, 1 value changed
   [Show in History]").
5. **A reload re-applies the edits.** Reload, Import options (below) and the column-role
   reloads of screen 15 replay the journal's data edits on the new load, in order, before the
   objects re-run. An edit that no longer applies (its node is gone) is skipped and listed in the
   report line ("2 of 14 edits no longer apply [Show]"). The reload dialog of screen 15 gains one
   row when edits exist: "Your edits  14  [Re-apply | Discard]", Re-apply by default.
6. **Delete means what the focus holds.** On a tree row, Delete removes the object (a Set, a
   Measure) and never data. On the canvas or in the table, Delete removes the selected nodes or
   edges from the data, and always asks first (screen 40), because a novice may mean "hide".
7. **Every verb has two doors at most, and they read the same rows.** A column verb is in the
   column's "..." menu on the Data tab and in the table's column-header menu; a node verb is in
   the node inspector's "..." menu and in the right-click menu on the canvas (cluster 5's screen
   49 draws that menu; this document adds its data rows, listed under each gap).

## Where each function lives

| Function | Entry point | Main surface | Screen |
|---|---|---|---|
| Read the import report, fix rejected rows | Dataset > Overview: the Import report disclosure; its "See in table" | the disclosure, open; the Table dock's Rejected tab | 33 |
| Change how the file is read after a load | Dataset "..." > Import options...; the report's "Import options..." button | the Import options dialog | 34 |
| Colour, size, shape, label, filter or group by a column; set a column's role | the column's "..." on Dataset > Data; the table's column header | the column menu | 35 |
| Rename, change type, fill empties, find and replace, split, delete a column | the column menu's Edit group | a popover per operation, anchored to the column's row | 35, 36 |
| Join a table of node attributes, mapping identifiers when needed | Dataset > Data: the ATTRIBUTES "+" > Join a table... | the Join dialog with its Map identifiers section | 37 |
| New column from a formula | Dataset > Data: the ATTRIBUTES "+" > New from formula... | the formula dialog | 38 |
| Edit one value | double-click a value on a node's (or edge's) Attributes tab, or a table cell | the value in place, the consequence line, the status report | 39 |
| Remove nodes or edges from the data | Delete on a canvas or table selection; "Remove from data..." on the node and several-elements inspectors | the confirmation dialog | 40 |
| Merge duplicate nodes, one pair or in bulk | "Merge into one node..." on the several-elements inspector | the Merge dialog | 41 |
| Expand a node from its server | double-click the node (server-backed data only); node "..." > Expand from server | the added nodes outlined, the status report, the node's About tab | 42 |
| Add a node or an edge by hand | right-click empty canvas > Add node here...; right-click a node > Connect to...; the table's "+ Row" | the Add node popover; the Connect line and its popover | 42 |

No new panel, dock tab or toolbar button is added. The one new surface is a third tab of the
Table dock, **Rejected**, which appears only while the last load rejected rows; it is a tab
rather than a dialog because the reader fixes rejected rows by editing cells, which is what the
table already does.

---

## 1. The import report, opened (screen 33)

**Gap.** The Overview tab's "Import report" disclosure was drawn collapsed on screens 2 and 15;
nothing showed what was in it or what a reader could do about rejected rows.

**Entry points.** The disclosure on Dataset > Overview. It opens by itself after a load that
rejected any row, and its summary says so in place of "read 80, kept 78": "2 rejected". The
status bar's load report ("Loaded karate.gml: 78 edges, 2 rows rejected [See]") is the second
door.

**The open disclosure** (seven rows, which keeps the Overview tab at 14):

| Row | Content |
|---|---|
| Read \| Kept | "Read 80 edges \| Kept 78" (records handed over and edges now in the graph) |
| Rejected | "Rejected 2  [See in table]" |
| Repeated \| Weights | "Repeated 0 \| Weights none"; with repeats, "Repeated 214 (kept each)"; weights read the column name or "none" |
| Endpoints | "source, target  detected" (or "declared" when the reader chose them) |
| up to 3 rejected lines | "line 412  source is empty"; then "and N more" |
| Fix row | [Add fixed rows] [Import options...] |

**The Rejected tab.** "See in table" opens the Table dock on a third tab, "Rejected 2", beside
"Nodes 34" and "Edges 78". Columns: line (the file line or record number), the raw source and
target exactly as read, any other columns of the record, the reason, and the fix the element
suggests. Selecting a row locates its known endpoint on the canvas (screen 33 halos node 7).
The raw cells are editable (section 5's editing rules); once a row's cells are corrected its
reason reads "ready", and [Add fixed rows] in the report adds every ready row to the graph as
one undo step, without reloading. A row whose fix is structural ("target '1;4' is two ids") has
a fix link that applies it ("Split into two edges"). Closing the disclosure is how the reader
keeps the data as it is; nothing nags.

**Keyboard.** Enter on "See in table" opens the tab; in the tab, arrows move, Enter edits a
cell, Escape reverts.

**Errors.** A load with thousands of rejects lists the first 1,000 in the tab and says "first
1,000 of 12,400 shown"; the reasons are grouped in the report ("12,390 source is empty") so the
pattern is visible without scrolling. When every edge was rejected the load has failed and
cluster 2's failed-load screen (27) takes over.

**Element API.** `lastImport()` (`graphty-element/src/data/report.ts`) exists and already
carries the counts, the repeat policy, the endpoint expressions and where weights came from.
**Gap, small:** it counts rejected records (`counts.rejected`) but keeps none of them. It needs
`rejectedRecords: { index, line?, record, reason, fix? }[]` capped at 1,000, plus
`rejectedByReason` counts. Adding fixed rows uses `addEdges` (exists) through the journaled
session call of section 5.

## 2. Import options after a load (screen 34)

**Gap.** `round-2/revision.md` section 6.12 named an "Import options..." sheet with four rows;
it was never drawn and listed fewer rules than the element has.

**Entry points.** Dataset "..." > Import options...; the Import report's [Import options...]
button (screen 33); the Direction row's "Change..." keeps opening screen 15's smaller dialog.

**The dialog** ("Import options: email.csv", 480 px), one row per rule the element applies
while reading, each a select whose current value is the one in force, with the old value beside
a changed one:

| Row | Values | Element setting |
|---|---|---|
| Repeats | Keep each, Keep first, Keep last, Sum into one, Smallest, Largest, Stop with an error | `knownFields.repeatedEdges` (keep, first, last, sum, min, max, error) |
| Missing end | Create the node, Reject the edge | new, see below |
| Self-loops | [Keep \| Drop] | new, see below |
| Node ids | 7 and "7" are one, Keep text and numbers apart | `knownFields.idCoercion` (canonical, keep) |
| Endpoints | the file's columns, "detected" first | `knownFields.edgeSrcIdPath`, `edgeDstIdPath` |
| Scale | a number, times | `knownFields.positionScale` |
| [format] options | a disclosure with one row per option the format declares (separator, header row, encoding for CSV) | the format descriptor's options (cluster 2's screen 25 draws the same rows before a load) |

Then the live line from a dry run: "Will keep 2,412 edges and 1,204 nodes (now 5,830 edges)";
"Objects [Keep and re-run | Remove]" and the re-run list with its cost, exactly as screen 15;
one line on what the change means ("Each kept edge's weight is the sum of its repeats"); and
[Cancel] [Apply and reload]. Apply is one undo step and re-applies the reader's data edits (rule
5).

**Keyboard.** Tab moves between rows; Enter presses Apply and reload once the dry run has
answered; Escape cancels.

**Errors.** A dry run that fails ("Endpoints: column 'src' is not in this file") shows its
reason in place of the live line and disables Apply. "Stop with an error" as the repeat rule
shows, in the live line, the first repeated pair it would stop at.

**Element API.** The settings exist in `DataConfig` (`graphty-element/src/config/DataConfig.ts`)
except two. **Gaps:** a missing-endpoint policy (`missingEndpoints: "create" | "reject"`; today
the element always creates the node), small; a self-loop policy (`selfLoops: "keep" | "drop"`),
small; a dry run of a re-read with changed options returning the counts
(`session.data.peek(source, options)`, the call screen 14 already asks for, extended to take
options and return kept counts), small; the reload that keeps objects and re-applies edits
(`round-2/revision.md` section 9.3, extended by rule 5), small.

## 3. The column menu, drawn open (screen 35)

**Gap.** Every column row on Dataset > Data had a "..." with Colour by, Size by and the rest,
drawn closed. It is the only way to encode by a raw column rather than by an algorithm's
result.

**Change to the Data tab.** ATTRIBUTES now separates node columns from edge columns under two
32 px secondary labels, "On nodes" and "On edges", because what a column can do depends on
which it belongs to: a node column sizes nodes, an edge column sets edge width. (Screen 10 mixed
them; the rows are otherwise unchanged.)

**The menu**, four groups; an item that cannot apply stays in place, disabled, with the reason
in the row (so the reader learns why rather than wondering where it went):

| Group | Items (node column) | Items (edge column) |
|---|---|---|
| Show | Colour by, Size by, Shape by, Label by | Colour by, Width by, Pattern by, Label by |
| Pick out | Filter by values... or Filter by range... (by type), Group by (category or text) or Group by ranges... (numbers) | the same, filtering edges |
| Role | Set as label, Set as type, Set as time (dates only) | Set as weight (numbers only), Set as time, Set as type |
| Edit | Rename..., Change type..., Fill N empty values..., Find and replace..., Split column... (text only), Delete column... | the same |

What each Show item makes: Colour by and Size by on a number create a Measure over the column
(a tree row with its encoding, selected, opening on its Values tab: the state screen 6 already
draws); on a category they create a Grouping (screen 7's state). Filter by opens the Filter
tool armed on that column (cluster 6's screens 59 and 60). A role that still reloads the file
says so in the row ("Set as type (reloads the file)") and opens screen 15's dialog; when the
element re-maps in place (`round-2/revision.md` section 8, last row) the words go away.

**Doors.** The row's "..."; a right-click on the row; the table's column-header "...", which
opens the same menu anchored to the header.

**Keyboard.** Shift+F10 or the context-menu key on a focused row opens it; arrows move; Enter
chooses; typing a letter jumps to the item.

**Element API.** Creating a Measure or Grouping from an attribute is the objects API's create
(settled decision 1) with an attribute definition; the element already builds encoding layers
from an attribute. The disabled reasons come from the attribute descriptor
(`session.data.attributes()`: type, distinct count, completeness). **No new gap** beyond the
objects API itself and re-mapping in place (both already listed in `round-2/revision.md`
section 8).

## 4. Column operations (screens 35 and 36)

**Gap.** Absent: no way to rename a column, correct a detected type, fill empties, find and
replace, split, or delete. A date read as text breaks the timeline; numbers read as text break
sizing.

**Entry point.** The column menu's Edit group (screen 35).

**Each operation is a popover anchored to the column's row** (240 px, caret on the row), with a
preview and a consequence line, then one filled button:

| Operation | Rows |
|---|---|
| Rename... | Name [field]; "Used by: Conference (Grouping), 1 rule" (objects follow the new name) |
| Change type... | To [Text, Number, Whole number, Yes/no, Date and time, Category]; Format [detected v] (for dates and numbers with separators); a five-row before-and-after preview; "Read 886 of 1,204"; "318 could not be read and become empty. 301 of them look like DD/MM/YYYY [Also read DD/MM/YYYY]"; what reads the column now |
| Fill N empty values... | With [a value \| the column's median \| the most common value \| 0]; preview; "Fills 36 nodes" |
| Find and replace... | Find [field]; Replace with [field]; [Match case] [Whole value] [Pattern]; "12 values in 9 nodes" |
| Split column... | On [; v]; Into [2 columns v] named [joined_1] [joined_2], or "one edge per part" when the column is an endpoint (the Rejected tab's fix) |
| Delete column... | "Used by 2 objects: they will fail with 'column deleted'"; [Cancel] [Delete] |

Screen 36 draws Change type, the hardest: the type is the popover's first row as a select, so
the menu needs no submenu.

**Errors.** A conversion that would empty every value disables the button and says so. A
rename to an existing name is refused inline ("a column called 'dept' exists").

**Element API. Gap, medium:** a column command set on the session, each journaled and each with
a dry run: `session.data.columns.rename(col, to)`, `.retype(col, type, { formats })` returning
`{ converted, failed, samples }`, `.fill(col, { value | strategy })`, `.replace(col, find, with,
{ matchCase, whole, pattern })`, `.split(col, sep, into)`, `.remove(col)`. The element already
classifies types (`ATTRIBUTE_TYPES` in `graphty-element/src/catalog/types.ts`: string, number,
integer, boolean, time, category, mixed), so retype names that list.

## 5. Edit a value (screen 39)

**Gap.** Absent: no surface edited a node's or edge's attribute value (#297, "update attributes
after load").

**Entry points.** Double-click a value on a node's (or edge's) Attributes tab; double-click a
cell in the Table dock; Enter on a focused cell. The value becomes an input in place.

**The state** (screen 39, committed a moment ago): the Attributes tab shows the value as an
input with the file's value kept under it ("in file 7  [Revert]"); a consequence line in
secondary text ("Conference re-ran (instant): BrighamYoung moved from group 7 to group 9.
Nothing else reads value."); the table row reads the new value in the attribute column and in
every object column that changed; the canvas repaints (the node takes conference 9's colour);
the status bar carries "Edited value of BrighamYoung: 7 -> 9  [Undo]". Several cells can be
edited in a row; each is its own undo step. Pasting a column of values from a spreadsheet into
the table fills the cells below the focused one as one step.

**Keyboard.** Enter keeps and moves down (in the table) or stays (on the tab); Tab keeps and
moves right; Escape reverts the cell.

**Errors.** A value of the wrong type is refused inline with the type ("value is a whole number;
'nine' is not"), the input keeps its red outline, and nothing is written. An edit to an id
column is refused ("ids cannot be edited; Merge or Remove instead").

**Element API.** `Graph.updateNodes` exists (`graphty-element/src/Graph.ts`) but writes
`node.data` directly, is not on the session, is not journaled, has no edge counterpart and does
not validate types. **Gap, small:** `session.data.update(target, id, { col: value })` for nodes
and edges, validated against the column's type, journaled, and followed by the stale rule (#297).

## 6. Remove nodes or edges from the data (screen 40)

**Gap.** The node inspector's "Remove from data..." was a row in an undrawn menu; no Delete
key, no confirmation, and nothing for a multi-selection.

**Entry points.** Delete or Backspace with nodes or edges selected on the canvas or in the table;
"Remove from data...  Delete" in the several-elements inspector's new Data section (with Merge
into one node... and Hide these); the node's "..." > Remove from data...; the right-click menu's
"Remove from data..." (cluster 5, screen 49).

**The confirmation** ("Remove 3 nodes from the data?", a dialog, because it changes the data
every object is computed from): the nodes and the edge count; "Their 7 edges go with them",
drawn dashed on the canvas behind; which Groups and Sets lose members; "Re-run at once:
Connections, Communities (instant)"; "Turn stale: Bridges (about 2 s)"; "One undo step. The file
on disk is not changed."; then [Hide instead] [Cancel] [Remove]. Hide instead is there because
the reader who pressed Delete may have wanted the picture changed, not the data.

**Keyboard.** Enter presses Remove; Escape cancels; H is not used (it is the Hand tool).

**Errors.** Removing every member of a hand-made Set leaves the Set empty and says so in the
dialog ("Hand-picked 1 becomes empty"). An edge-only selection names the edges and says no node
is removed.

**Element API.** `Graph.removeNodes` and `removeEdge` exist. **Gap, small:** a journaled session
call `session.data.remove({ nodes, edges })` with a dry run `planRemove` returning the incident
edge count, the objects whose membership changes, and which re-run or turn stale (the objects
API's staleness digest already knows the last part).

## 7. Merge duplicate nodes (screen 41)

**Gap.** "Merge into one node..." was a proposed row; no dialog, no rule for conflicting
attributes, no bulk merge.

**Entry points.** "Merge into one node..." in the several-elements inspector (drawn on screens
40 and 41) when two or more nodes are selected; the right-click menu on a multi-selection.

**The dialog** ("Merge 2 nodes into one"): Keep id as a two-way (or n-way) choice showing id and
label; "Values that differ  2" with one select per differing attribute listing each node's
value ("name [Alice Smith v]  or A. Smith"); a numeric column adds "Sum" and "Mean" to its
select; "Same in both: email, joined"; the edge line ("10 of A. Smith's edges re-attach to
Alice Smith; 0 duplicate an edge she has"), and that duplicates follow the dataset's repeat
rule, changeable in Import options; then **All pairs** [switch] "that share [email v]" with its
dry run ("37 pairs, 74 nodes into 37. Each keeps the lower id."); what re-runs; [Cancel]
[Merge]. With the switch on, the per-attribute rule shown becomes the rule for every pair, and
the button reads "Merge 37 pairs".

**Keyboard.** Enter merges; Escape cancels.

**Errors.** Merging nodes in two different datasets is refused (cluster 1's two-dataset
session). A bulk merge whose attribute matches more than two nodes in a group merges the whole
group and says so ("4 groups have 3 or more nodes").

**Element API. Gap, medium:** the element has no merge. It needs `session.data.merge(ids, { keep,
values: { col: "first" | id | "sum" | "mean" }, repeated })`, journaled, and
`session.data.duplicates({ by: col })` returning the groups as a dry run.

## 8. Join a table of node attributes, and map identifiers (screen 37)

**Gap.** The Data tab's ATTRIBUTES "+" was drawn closed (#298, "join an attribute table");
identifier mapping, without which a join between two id systems matches nothing, was absent.

**Entry point.** ATTRIBUTES "+" on Dataset > Data opens a two-row menu: Join a table...,
New from formula... (section 9). A file dropped on a loaded graph whose rows have no endpoint
columns offers "Add attributes" (cluster 2's screen 26), which opens the same dialog.

**The dialog** ("Join a table: genes.csv"): the file's size and a three-row preview; Match
[column v] To node [column v], both selects of real columns (edges have their own To edge
select when the table has two endpoint columns); the live dry-run line; when the plain match
finds fewer than half the rows, the **Map identifiers** section opens by itself with its summary
("symbol to UniProt, 0 matched without it"): Species [Human v], From [Gene symbol v] (detected
from the values), To [UniProt accession v] (detected from the node ids), Using [a mapping file
v] (a two-column file the reader supplies, or a mapping service when one is registered); then
"Matched 318 of 340 rows after mapping (0 before)"; Unmatched [Skip 22 rows v] (Skip, Add as new
nodes, Show in table); Columns to add as checkboxes; "Adds 3 node columns, empty on 886 nodes.
One undo step."; [Cancel] [Join].

A column that already exists is offered as "Replace" or "Keep both (log2fc_2)". After the join
the new columns appear in ATTRIBUTES; the Import report gains a "Joined genes.csv: 318 of 340"
row; the 22 unmatched rows are a table tab like Rejected.

**Keyboard.** Enter joins once the dry run has answered; Escape cancels.

**Errors.** A table with no column whose values look like node ids says so and opens Map
identifiers. A mapping that is one-to-many ("TP53 maps to 2 accessions") shows the count and a
rule: [First v | Every one].

**Element API. Gaps:** the join itself (#298), medium:
`session.data.join(table, { key, to, columns, unmatched, collisions })` with a dry run returning
matched and unmatched counts; identifier mapping, medium: an **identifier mapper registry** in
the element (`IdMapperRegistry.register(name, mapper)`) with one built-in mapper that reads a
two-column mapping file, and optional mappers for services (UniProt, STRING) registered by a
plugin, so a third-party consumer gets the same capability without writing it. The app ships no
dictionary of its own.

## 9. New column from a formula (screen 38)

**Gap.** "New from formula..." was a menu row name only. It is how an analyst builds a combined
score of two results.

**Decision.** The result is always a **column** (a row in ATTRIBUTES with a formula glyph), never
a tree object; its "..." makes a Measure from it in one click, like any column. One thing, one
home (`round-2/coverage.md`, the "Computed attributes" row, proposed this; it is adopted here).
The column **follows its inputs**: when a result it reads re-runs, it re-computes, and objects
reading it follow the stale rule. A formula is data derived from data, so a stale formula would
be a silent lie.

**The dialog** ("New column from a formula"): Name [field]; On [Nodes | Edges]; the expression, a
one-line code field with completion; "Insert" chips for every result and column (clicking one
inserts its name); the function list (norm, rank, log, abs, min, max, if); a five-row live
preview (the top five by the new value, with its inputs beside it); the missing-input rule ("a
missing input gives an empty value"); what the column is; [Cancel] [Create]. Editing a formula
later is its column's "..." > Edit formula..., the same dialog.

**Keyboard.** Ctrl+Space completes; Enter in the field previews; Ctrl+Enter creates; Escape
cancels.

**Errors.** A syntax or type error replaces the preview with the message and a caret at the
column where it failed ("Unknown column 'Brdges' at 6. Did you mean Bridges?"); Create is
disabled. A formula that reads its own column is refused.

**Element API. Gap, medium:** the `data.compute` command named in `round-2/coverage.md`: an
expression evaluator over node or edge columns and run results, with a validate call (the
element's `styles.validate` is the pattern) and dependency tracking so the column re-computes
when an input re-runs.

## 10. Expand a node from its server (screen 42)

**Gap.** Expansion existed only as a double-click inside the element and a text row; no state
showed it happening, succeeding or failing.

**Entry points.** On a dataset whose source can fetch neighbours (a graph-database query, a
service): double-click a node (decision T6 in `round-2/decisions.md`: elsewhere double-click
selects neighbours); the node's "..." > Expand from server; the right-click menu. The inspector
header of such a dataset says where it comes from ("bolt://lab, Neo4j query").

**States.**
- **Fetching:** the status bar's computing slot reads "Fetching neighbours of 34...  [Cancel]"
  and the node shows the progress ring used for a computing object.
- **Done** (screen 42): the nodes the graph did not hold are outlined; "Added 14 nodes  40 edges
  from server  [Undo]" in the status bar; the node's About tab carries "Server  14 added just now
  [Undo]" and [Expand again] [Select new]; cheap objects re-ran and the others turned stale
  rather than re-running, because a reader who is expanding will expand again (the stale chip
  "2 stale  [Re-run all]" is one click away); the layout settles the new nodes around their
  source.
- **Nothing new:** "34 has no neighbours the graph does not hold" in the same slot.
- **Failed:** "Server did not answer (timeout after 10 s)  [Retry]" in the slot, and the node
  unchanged.

**Keyboard.** E is the Neighbours tool, so expansion has no letter; Enter on a focused node
opens its menu where Expand from server is the first data row.

**Element API.** The fetch hooks exist (`fetchNodes`, `fetchEdges` in
`graphty-element/src/config/GraphBehavior.ts`) and are called only from the node's double-click
action in `graphty-element/src/NodeBehavior.ts`. **Gap, small:** a session call
`session.data.expand(id, { signal })` that runs the same fetch, reports progress and failure
as events, returns what was added, and records it as one journal entry; and
`capabilities.canExpand` so the app knows whether to draw the verb.

## 11. Add a node or an edge by hand (screen 42)

**Gap.** Absent: no way to add a known missing link or a hypothesis node.

**Entry points.** Right-click on empty canvas > Add node here...; right-click on a node >
Connect to...; the Table dock's "+ Row" at the end of the Nodes and Edges tabs.

**States.**
- **Add node** (screen 42): a popover at the click point: Id [the next free id], Label [field],
  then one field per node column of the dataset (at most five, then "and N more"); "Placed where
  you clicked and pinned"; [Cancel] [Create]. The node appears pinned at that point, is selected,
  and the status bar says "Added node Coach  [Undo]".
- **Connect to...:** the pointer draws a line from the node that follows it; clicking a second
  node (or typing its name, the same name field as the Path bar's) opens a popover at the new
  edge: Direction [one way \| both] on directed data, Weight [field] when the data is weighted,
  the edge columns, [Create]. Escape cancels the line.
- **+ Row** appends an empty row to the table with the cursor in its first cell; Enter creates
  the node or edge; an edge row's source and target cells complete node names.

**Errors.** An id that exists is refused inline ("34 exists; Connect to... adds an edge to it").
An edge that repeats an existing pair follows the repeat rule and says so ("a second edge 1 - 34
is kept, as Import options say").

**Element API.** `addNodes` and `addEdges` exist on the Graph. **Gap, small:** journaled session
calls for one node and one edge (`session.data.add`), a seed position for a node placed by hand
(the element's position seed column already exists for file positions), and the next free id.

---

## The element work this document adds

Smallest first. "Exists" means the capability is in graphty-element today and only needs to be
reached through the journaled session API; the others are new.

| Item | Size | Needed by |
|---|---|---|
| Journaled session calls for data edits: `session.data.update`, `.remove`, `.add` (nodes and edges), each one undo step and followed by the stale rule | small (the Graph methods exist; the journal is settled decision 1) | sections 5, 6, 11 |
| `lastImport().rejectedRecords` and `rejectedByReason` | small | section 1 |
| `missingEndpoints` and `selfLoops` load policies | small each | section 2 |
| `session.data.peek(source, options)` returning kept counts (extends screen 14's peek) | small | section 2 |
| Reload re-applies the journal's data edits | small, on the objects API | rule 5 |
| `session.data.expand(id)` with progress, failure and a journal entry; `capabilities.canExpand` | small | section 10 |
| `session.data.planRemove` (incident edges, affected objects) | small | section 6 |
| Column commands (`rename`, `retype`, `fill`, `replace`, `split`, `remove`) with dry runs | medium | section 4 |
| `session.data.merge` and `duplicates({ by })` | medium | section 7 |
| `session.data.join` (#298) with a dry run | medium | section 8 |
| An identifier mapper registry with a mapping-file mapper built in | medium | section 8 |
| The `data.compute` command: an expression evaluator over columns and results, with validation and dependency tracking | medium | section 9 |

Nothing here asks the app to compute over nodes and edges, parse a file, match identifiers or
evaluate an expression: every count a dialog shows is a dry run the element answers.

## Changes to the round-2 documents

| Document and section | Change |
|---|---|
| `round-2/revision.md` 2.4, Dataset > Data | ATTRIBUTES splits into "On nodes" and "On edges"; the column "..." menu has four groups (Show, Pick out, Role, Edit) with disabled items and reasons; the "+" menu is Join a table..., New from formula...; Made by ends with the edit count |
| `round-2/revision.md` 2.4, Dataset > Overview | the Import report disclosure's open rows and its two buttons; it opens by itself after a load with rejects |
| `round-2/revision.md` 2.4, Several elements | a Data section: Remove from data...  Delete, Merge into one node..., Hide these |
| `round-2/revision.md` 2.4, Node | Attributes tab values edit in place; the About tab gains the server row on server-backed data; the "..." gains Connect to... |
| `round-2/revision.md` 6.12, Import options | the dialog has seven rows plus the format's options, not four |
| `round-2/screens.md`, screen 15 | the reload dialog gains "Your edits  N  [Re-apply \| Discard]" when edits exist |
| Table dock | a Rejected tab while the last load rejected rows; "+ Row" at the end of Nodes and Edges; cells edit in place |

## Screens

| Screen | Shows | Gaps it draws |
|---|---|---|
| 33 | Import report opened; the Rejected tab | import report opened |
| 34 | Import options dialog | import options after a load |
| 35 | the column menu open, four groups | column menu drawn open; the entry to column operations |
| 36 | Change type popover | column operations |
| 37 | Join dialog with Map identifiers open | join a table; map identifiers |
| 38 | Formula dialog | new column from a formula |
| 39 | a value being typed in the table cell and the Attributes tab; the committed result and a wrong-type error as insets | edit a value |
| 40 | Remove-from-data confirmation; the several-elements Data section | remove from data |
| 41 | Merge dialog, one pair and the all-pairs switch | merge duplicate nodes |
| 42 | six nodes expanded from the server; a node added by hand and being connected; Add node here as an inset | expand from a server; add a node by hand |

The gap register planned remove and merge together on screen 40 and add-by-hand alone on 41.
Remove is screen 40, merge 41, and add-by-hand joins expansion on 42 (both add nodes on the
canvas). Every state specified above is now drawn: the ATTRIBUTES "+" menu (screen 37, tagged
as the moment before), the Connect to... line from the new node to the pointer (42), a table cell
in edit mode with the typing and a wrong-type error (39, the error in an inset), and the formula
error with its completion list (38, inset). Screen 39 now draws the moment of typing, with the
committed result as an inset.
