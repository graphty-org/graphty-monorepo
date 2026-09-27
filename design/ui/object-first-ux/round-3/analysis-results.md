# Round 3: analysis results, time and comparison

This document closes sixteen gaps in the object-first design of the graphty app: places where a
reader can start an analysis but the design never showed what the result looks like, or never
gave the analysis a door at all. Each gap is listed in
`design/ui/object-first-ux/round-3/gaps.md` (cluster 7). For every one it gives the design (the
entry point, the states, the rows, the keys and the errors), the graphty-element work it needs,
and the mock that draws it. The mocks are
`design/ui/object-first-ux/mocks/v2/screen-69.png` to `screen-82.png`, generated from
`tmp/object-first/gen/screens/screen-69.mjs` to `screen-82.mjs`.

The design it extends is `design/ui/object-first-ux/round-2/revision.md`; section numbers below
("revision 2.4") refer to it. Nothing here changes code.

## Words used here

- **Object**: a row in the left panel's tree (a Set, a Measure, a Grouping, a Group, the
  Dataset). The **inspector** is the right panel; it shows the selected object with a fixed
  header and three or four **tabs**.
- **Measure**: an object with one number per node (a centrality). **Grouping**: an object that
  puts every node in one **Group** (communities). **Set**: an object that is a list of nodes or
  edges (a path, a filter result).
- **Finding**: a result that has no members to paint, such as the graph's diameter, a list of
  node pairs, a table of values per month. It is not a tree row; it is a row in the **Findings**
  section of the object it was computed on, usually the Dataset (revision 2.4 and
  `object-model.md` section 4.10).
- **Table dock**: the drawer under the canvas. This document gives it a third tab,
  **Findings**, beside Nodes and Edges; its "Showing" select picks which Finding the tab shows.
- **Popover**: a 240 px light panel that opens beside the control that asked for it and closes
  on Escape or a click outside. A **menu** is the dark list behind a "+" or a "...".
- **Secondary bar**: the one-line dark sentence above the toolbar while a tool is armed ("Rank
  by [Bridges] on what is showing, 115 nodes, about 2 s [Run] Cancel").
- **Transport bar**: the 40 px strip under the canvas while a time window is on; its **gear**
  opens the time settings popover.
- **Scope**: the part of the graph a run covers. **Mask**: what the canvas draws (Focus and the
  time window are masks); a scope never changes the mask.

## Decisions this document makes

Each is reversible (an edit to this document and the mocks), so each is decided here.

| Decision                                                                                                                                                                                                                                                 | Why                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The Table dock's Findings tab is the one home for every result that is a table or a chart**: pair lists, sweeps, per-month series, community events. The Findings section on the Dataset (or on an object) holds the one-line row with "Open in table" | the 240 px inspector cannot show a table with more than three columns or a chart wider than 208 px; the dock is as wide as the canvas and already sits beside the tree. It settles the disagreement in round 2 about where the over-time chart lives: in the dock, never in the gear popover |
| **The two-metric scatter plot is a floating panel over the canvas**, 480 x 360 px, movable, closed by Escape. It is the only new surface in this document                                                                                                | the plot needs a roughly square area for two axes; the dock is 240 px tall and a popover 240 px wide. It must float over the canvas, not replace it, because brushing the plot halos the same nodes on the canvas                                                                            |
| **"How groups connect" is a BETWEEN GROUPS section on the Grouping's Groups tab**, not a fifth tab                                                                                                                                                       | revision 2.6 rule 2 (never five tabs); the section is three to six rows and collapses                                                                                                                                                                                                        |
| **"Show the largest" lives only on the Groups tab**, drawn "Largest [8 v] rest as Other"                                                                                                                                                                 | it decides which Group rows exist in the tree and the legend, which is what the Groups tab is about; the Style tab keeps only the Other colour                                                                                                                                               |
| **Collapsing groups is a way of drawing**, stored on the Grouping and remembered by a View, never a data edit                                                                                                                                            | the data stays whole, undo is one step, and a View called "How groups connect" can bring the summary back                                                                                                                                                                                    |
| **Unusual nodes is a Measure under Rank**, not a Finding                                                                                                                                                                                                 | it gives every node a score, so it paints and ranks like any Measure; its per-node reason shows on the node's About tab                                                                                                                                                                      |
| **"What breaks if removed" is a preview, not an object**, until the reader presses "Keep as set"                                                                                                                                                         | most readers look and move on; an object per look would litter the tree                                                                                                                                                                                                                      |
| **A run's scope is a select inside the secondary bar**, not a separate step                                                                                                                                                                              | the bar already states "on what is showing, 115 nodes"; making those words the control means the scope is read before every run, which is the point of the bar                                                                                                                               |

---

## 1. Measure Values tab

**What was missing.** The Values tab (revision 2.4, Measure) was a tab label. No mock showed
the numbers, the histogram, the top list or how to turn a ranking into a Set.

**Design.** The tab a Measure opens on after a run (revision 2.5). Rows, top to bottom:

| Row                 | Content                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Field               | a select, shown only when the run publishes several fields (Connections on directed data: total, in, out; Hubs and authorities: hub, authority); greyed with the one field otherwise                                                                                      |
| Min \| Max          | two values                                                                                                                                                                                                                                                                |
| Mean \| Median      | two values                                                                                                                                                                                                                                                                |
| Widest \| Narrowest | only for graph-level fields such as eccentricity's diameter and radius                                                                                                                                                                                                    |
| Histogram           | 208 x 40, 12 bins, with a lin/log switch. Dragging across it selects the nodes in that band; the status bar shows "N selected"; release keeps the selection, Escape drops it                                                                                              |
| TOP header          | the count select [10 v] and a "+" menu: Top N set..., Above threshold set..., Bottom N set... Each makes a Set linked to this Measure: it re-runs when the Measure does and turns frozen (a grey snowflake, members kept) if the Measure is deleted (revision 4, step 14) |
| Five ranked rows    | rank, node label, value; a click selects and frames the node                                                                                                                                                                                                              |
| See all 34 in table | opens the Table dock on Nodes, sorted by this Measure                                                                                                                                                                                                                     |

Keys: Up and Down move through the ranked rows; Enter frames the node. Errors: a Measure with no
finite values shows "No values: every node was unreachable" in place of the histogram and the
TOP section, with the reason from the run's caveats.

**Element API.** Exists: `RunResult.summary()` (min, max, mean, median), `.histogram(field)`,
`.ranking(field, limit)` and `.reading()` in `graphty-element/src/session/results/types.ts`.
Named gaps: the `{between: {run, field, min, max}}` selection target for the band drag (small,
already in revision 8); a top-N and a threshold scope kind usable as a linked Set (small, in
revision 8 as "a top-N scope kind").

**Screen.** 69: Influence (PageRank) on Karate Club with every number computed from the data,
the "+" menu open.

## 2. Two metrics as a scatter plot

**What was missing.** Absent. The previous app plan's "Compare two metrics" had no home.

**Design.** Entry: select two Measures in the tree (Ctrl+click) and press "Plot against each
other", the primary button of the several-objects inspector; or a Measure's "..." menu > "Plot
against...". The floating panel (the one new surface, see Decisions) opens at the canvas's top
left:

- X and Y selects (every Measure and numeric column), Log X and Log Y, Swap, Colour by (any
  Grouping, or none);
- the plot: one dot per node, axes with their end values, dots in the Grouping's colours;
- a rank correlation readout with an (i) explaining it (1: same order, 0: unrelated);
- a drag on the plot draws a rectangle (a **brush**); the nodes inside are selected, halo on
  the canvas, and the footer reads "38 nodes selected [Make a Set] [Combine into a score]".
  "Combine into a score" makes a formula Measure (the two values scaled 0 to 1 and added), whose
  Define tab shows the formula.

Hovering a dot halos the node on the canvas and shows its label; hovering a node on the canvas
rings its dot. Escape clears the brush, then closes the panel. Errors: fewer than three nodes
with both values reads "Too few nodes carry both values to plot".

**Element API.** Exists: `RunResult.column(field)` for both axes (the app plots columns, it
computes nothing). Named gaps: a rank correlation between two columns
(`session.results.correlate(a, b)`, small); a formula Measure from two runs (the `data.compute`
command already proposed in `round-2/coverage.md` section 13, small).

**Screen.** 70: Influence against Bridges on Karate Club; the brush (Bridges above 0.05,
Influence below 0.06) is computed and haloed. The plot draws the 34 real values, Bridges on a
log scale, with the brush as a dashed rectangle.

## 3. Grouping Groups tab

**What was missing.** The first tab after every community run was a label.

**Design.** Rows:

| Row                                    | Content                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modularity                             | the value and a word: "a clear split" above 0.3, "a weak split" below; its tooltip defines modularity (how much more the groups are joined inside than chance would give: 0 is chance). Other Groupings show their own quality word: Parts, Levels, Shells                                                                                                  |
| Sizes                                  | the group sizes, largest first, cut with "..."                                                                                                                                                                                                                                                                                                              |
| Largest [8 v] rest as Other            | how many groups get their own tree row, colour and legend row; the rest fold into one "Other" row (see Decisions)                                                                                                                                                                                                                                           |
| Names from [none v]                    | none (Group 1, Group 2 ...), or any text column: each group takes the most common value among its members; a name that repeats gets a number ("Officer 2"). A popover previews every name with the share of the group that carries it. Double-click a Group row to type a name; a typed name survives a re-run when the group still matches its predecessor |
| Sort groups by [Size v]                | Size, Name, Found order                                                                                                                                                                                                                                                                                                                                     |
| BETWEEN GROUPS                         | "21 edges cross" and a door to section 4 below                                                                                                                                                                                                                                                                                                              |
| "6 of 6 matched to their predecessors" | only after a re-run                                                                                                                                                                                                                                                                                                                                         |
| FINDINGS "+"                           | per-group profiles (#193)                                                                                                                                                                                                                                                                                                                                   |

The Group rows themselves are the tree's children and are not repeated here.

**Element API.** Exists: modularity in the Louvain and Leiden results. Named gaps: group names
from a column (#191 "community groups have numbers but no names", small: the most common value
per group is a `scope.statistics` call per group); names that follow a group across re-runs
(the matching of section 14 below, medium).

**Screen.** 71: Communities on Karate Club, names from the real `club` column (Officer, Mr. Hi,
Officer 2, Mr. Hi 2); modularity 0.42 and the 21 crossing edges are computed.

## 4. How groups connect: collapse and the summary graph

**What was missing.** Absent; `analysis.md` deferred it.

**Design.** Two parts on the Grouping:

1. **BETWEEN GROUPS** (Groups tab): one row per pair of groups that share edges, ranked by
   count, with the count and the share of all crossing edges ("1 and 2 7 33%"). A row click
   selects the crossing edges. "Open the group-by-group table" shows the full matrix in the
   Table dock's Findings tab.
2. **Collapse** (Grouping's "..." > Collapse groups, or Collapse all on the Groups tab; a Group
   row's "..." > Collapse this group): each collapsed group is drawn as one large node at the
   centre of its members, sized by member count and labelled "Group 1 12"; its edges merge into
   one line per pair of groups, width by count. Double-click a collapsed node to expand it in
   place; the others stay collapsed. The legend gains "Collapsed groups" (size) and "Merged
   edges" (width) blocks. The status bar shows "3 groups collapsed (23 nodes) [Expand all]" in
   the mask slot; Escape expands all.

Collapsing changes nothing in the data: counts, runs and exports see every node. It is saved on
the Grouping and a View records it, so a View "How groups connect" restores the summary. Ctrl+Z
undoes a collapse. Errors: collapsing a Grouping with more than 500 groups asks first ("500
groups would draw 500 nodes; collapse the largest 50?").

**Element API.** Named gaps: a between-groups count (`scope.statistics` over two scopes, or
`grouping.between()`, small); **collapsed rendering** (a meta-node per group at its centroid,
merged edges with a count, expand in place, hit-testing on the meta-node): large, new element
work with no issue yet. Until it lands, BETWEEN GROUPS and the table work and Collapse is
absent from the menu.

**Screen.** 72: Communities with three groups collapsed and Group 2 expanded. Each collapsed
group is drawn at its members' centre, and every merged edge is drawn with its width.

## 5. Record tab

**What was missing.** A tab label; the provenance of every result was undrawn.

**Design.** The last tab on every object, one shape everywhere (revision 2.6 rule 6):

| Row                                              | Content                                                                                                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MADE BY                                          | header                                                                                                                                                                 |
| Method                                           | the plain and technical name, with an (i) that explains the algorithm in two sentences                                                                                 |
| Parameters                                       | a disclosure whose summary is the non-default parameters ("unweighted, both directions"); open, one row per parameter as run                                           |
| Scope                                            | "What was showing, 34 nodes", "Within Group 2, 11 nodes" (section 8)                                                                                                   |
| Engine                                           | "algorithms 2.0.1, CPU" or "on the GPU (single precision)"                                                                                                             |
| Time                                             | duration, the date and time, the seed when there is one                                                                                                                |
| Caveats                                          | a disclosure with the count; open, one row per caveat ("4 routes of 2 hops tie; this is the first found", "sampled 2,000 of 50,000", "computed on 2019-01 to 2019-12") |
| Assistant: "the request" or Recipe: name, step 3 | only when the assistant or a recipe made it                                                                                                                            |
| [Copy methods] [Copy command]                    | methods text (a sentence for a paper's methods section, with version, parameters, seed, scope) and the JSON command that reproduces the run                            |
| Export                                           | section 6 below                                                                                                                                                        |
| NOTES "+"                                        | up to two notes, then "All N notes"                                                                                                                                    |

**Element API.** Exists: `run.record`, `run.caveats`, `run.engine`, `durationMs` (`Run.ts`,
`RunResult`). Named gaps: the `backend` field (small, revision 8); methods text generation
(`RunResult.methods()`, small, templates like `reading()`); the command form of a run (#337
"publish the command vocabulary", in progress).

**Screen.** 73: Path: 1 -> 34 on Karate Club, a real shortest route whose caveat (four routes
tie) is computed.

## 6. Export one result

**What was missing.** Described on the undrawn Record tab only.

**Design.** One row on every Record tab: Export [Members, CSV v] [Export]. The select lists only
what this kind of object can export: a Set offers Members CSV (one row per node and edge, in
route order for a path, with every attribute), Subgraph GraphML (the members and the edges
between them) and Framed image PNG (the canvas framed on the members); a Measure offers Ranked
list CSV (node, value, rank); a Grouping offers Membership CSV (node, group, group name). The
file downloads; a large export shows "Exporting 30% [Cancel]" in the status bar. The Export
button in the right header stays the home for whole-graph exports (revision 6.8). Errors: an
exporter that fails reads "Export failed: <reason> [Copy details]" in the status bar.

**Element API.** Exists: `RunResult.ranking()` feeds Ranked list. Named gaps: the per-object
export (#178 in the app is the request; the element needs `objects.export(id, format)` over the
graph-io exporters, small).

**Screen.** 73, the select open beside the row.

## 7. Batch runs and parameter sweeps

**What was missing.** The flyout rows existed; what they open did not.

**Design.**

- **Several...** (the last row of the Rank and Groups flyouts): a popover beside the row with
  the scope line, one checkbox per algorithm with its cost, the total ("3 chosen, about 4 s in
  all") and one button "Create 3". After it, three rows appear at once: the first computing, the
  others "queued, 2nd" and "queued, 3rd" in their count slot; the status bar reads "Computing 1
  of 3 [Cancel all]". The first paints; the rest arrive with their eye off (revision 3.4). One
  undo step removes all three.
- **Sweep...** (the last row of the Groups flyout; Rank gets it when a Measure has a numeric
  parameter): a popover with Algorithm [Communities v], Parameter [resolution v], From, To,
  Steps, the cost ("5 runs, about 1 s") and Run. The result is a Finding on the Dataset ("Sweep
  5 values [Open in table]") whose table, in the dock's Findings tab, has one row per value
  (groups, modularity, largest and smallest group) with the best-scoring row highlighted and
  "Make an object" on each row, which creates a normal Grouping with that parameter. A sweep
  never adds tree rows by itself.

Errors: a batch member that fails turns its own row red and the others go on; the status chip
ends as "2 done, 1 failed".

**Element API.** Exists: `runs.batch` (`session/runs/types.ts`). Named gaps: the sweep (#194
"no parameter sweep for an algorithm", medium: a batch over one parameter whose result is a
table Finding); the eye-off rule for batch members (revision 5.7, small).

**Screen.** 74: College football, the Several... checklist open beside the Rank flyout, and the
dock's Findings tab showing an earlier resolution sweep (plausible values, not computed).

## 8. Run on a Set or the selection

**What was missing.** Absent: scope was fixed text in the secondary bar.

**Design.** The scope words in every secondary bar ("on what is showing") are a select. Its list:
Everything, What is showing, The selection (greyed when nothing is selected), then every Set
and every Group in tree order with its size. The count and the cost in the bar update when the
scope changes. The parameters popover's scope line is the same select. A run on a scope:

- computes only inside it; nodes outside get no value and are not painted (no Focus, nothing
  hidden: the status bar still reads the whole graph's counts);
- is named by its scope until renamed ("Connections (Group 2)");
- says so on the Record tab ("Scope: Within Group 2, 11 nodes") with a sentence explaining it;
- turns stale if its scope object changes (a Set's members change), under the cost rule.

Keys: while the bar is open, S opens the scope select. Errors: a scope with no nodes disables
Run with the reason ("Group 5 is empty").

**Element API.** Exists: a run's `scope`; the set vocabulary of settled decision 2 makes a Set or
Group a scope. Named gap: none beyond decision 2 (a Group's membership as a scope, #149).

**Screen.** 75: Connections scoped to Group 2 painting only its eleven members (within-group
counts computed); Rank armed again with the scope list open.

## 9 and 10. Distances, likely missing links, unusual nodes, and the Findings rows

**What was missing.** The Structure flyout's Distances and Likely missing links rows, and the
Dataset's FINDINGS section, had no drawn result.

**Design.**

- The Dataset Overview's FINDINGS header "+" opens a menu: Distances, Likely missing links,
  Pattern..., each with its cost. These are the same rows as the Structure flyout's Finding
  rows; either door runs the same thing.
- A Finding row is one line: a fact ("Diameter 5 | Radius 3", "Mean path 2.41") or a list
  ("Missing links 25 pairs [Open in table]"). It carries the state glyphs of any object
  (computing ring, stale amber dot and "Re-run", failed red dot). Its "..." has Re-run, Export
  CSV and Delete. Up to three rows show, then "and N more".
- "Open in table" opens the Table dock's Findings tab on that Finding. For a pair list: Node,
  Node, Shared neighbours, Score, and two actions per row, "Select both" and "Make a path".
  Hovering a row halos both nodes and draws a dashed line between them on the canvas.
- **Unusual nodes** is a Measure under Rank (see Decisions): its Values tab ranks nodes by
  score, and a node's About tab shows "Unusual 0.91 rank 2 of 34" with its reason ("links two
  groups that share no other edge").

**Element API.** Named gaps: registration of link prediction (in `KNOWN_ALGORITHMS`,
unregistered, small); distances (#310 "no diameter, eccentricity or average shortest path
length", small); the anomaly score with a per-node reason (#312, research); a pair-list result
shape the dock can page through (exists as `pair-list` in the result shapes).

**Screen.** 76: Karate Club with its real diameter, radius and mean path, the 25 most likely
missing links by Adamic-Adar score (computed), and the "+" menu open.

## 11. What breaks if a node is removed

**What was missing.** A row in an undrawn menu.

**Design.** Entry: a node's "..." menu, or the canvas right-click menu, "What breaks if
removed". The canvas enters a preview: the node is drawn faint, its edges dashed, and every
piece that would break off is tinted. A result card beside the node reads: Pieces 3 (was 1);
Cut off 6 nodes (their ids); Largest piece 27 nodes (was 34); Longest route 5 hops (was 5);
Mean route 2.28 (was 2.41). Buttons: Keep as set (a Set of the nodes that break off, named
"Cut off by removing node 1"), Remove... (the one data-removal confirmation, revision 2.4),
Close. The status bar shows "Previewing removal of node 1 [Exit]"; the node's About tab carries
the same line. Escape ends the preview. Selecting several nodes offers "What breaks if these
are removed" in the several-elements inspector.

**Element API.** Named gap: #311 "no articulation points, bridges or node-removal impact"
(small: components and path statistics on the graph minus a node set, without mutating it).

**Screen.** 77: node 1 on Karate Club; all numbers computed (removing node 1 really cuts off
six nodes: 5, 6, 7, 11, 17 and 12).

## 12. Compare two objects or two time windows

**What was missing.** Text only (revision 6.7 and 9.1).

**Design.** Entry: select two objects (Ctrl+click) and switch on Compare in the several-objects
inspector, or an object's "..." > "Compare with...". The canvas splits into two panes, left
painted only by the first object and right only by the second; the other objects' eyes are not
touched. Rows on the inspector:

- Compare [on];
- Right pane [Same v]: Same, or any saved View, so March beside September is two Views with
  two time windows;
- Cameras [linked] (off lets each pane move alone);
- FINDINGS: for two Groupings, "Agree on 33 of 34 nodes" and "Adjusted Rand 0.46" (with an (i):
  1 is identical, 0 is chance), "Select the 1 that differs", "Make a set"; for two Measures,
  "Rank correlation 0.86" and "Difference", which makes a linked Measure of the per-node change
  whose TOP list is the biggest movers.

A click in either pane halos the node in both. The legend names both panes. The status bar
reads "Comparing Communities with Club [Exit]"; Escape closes the right pane.

**Element API.** Named gaps: a second renderer with per-pane layer visibility and its own mask
(#186 "the Compare toggle does nothing", large); agreement between two Groupings and a
difference of two Measures (small, revision 8).

**Screen.** 78: Communities against the file's club column on Karate Club, the agreement and the
adjusted Rand index computed. The canvas is drawn as two panes with one camera and a legend each.

## 13. Over-time results and biggest movers

**What was missing.** An empty "Over time +" header; round 2 put the chart in two places.

**Design.** Entry: the transport gear's OVER TIME "+", which lists every Measure and Grouping
with its cost times the number of steps ("Communities, about 4 s x 12"). The run computes the
metric once per step. Results:

- the gear's OVER TIME section gains a row "Connections 12 steps [Open in table]";
- the Dataset's FINDINGS gains the same row, and under it BIGGEST MOVERS for the current window
  (node, value before, value after) with "Make a Measure" (a Measure of each node's change,
  which paints and ranks like any other);
- the Table dock's Findings tab is the chart's one home (see Decisions): a line chart of the
  series across the full width, the current window shaded, a click on a month moves the window
  there; below it, one row per month (active nodes, the metric's mean, edges changed, the node
  that moved most, "Go to this time").

The gear's CHANGES disclosure keeps only the per-step change counts, as a bar per step with
the peak and "Go to". Errors: a step that fails marks its month red in the chart and the row
reads "failed: <reason> [Retry]"; the other steps stand.

**Element API.** Named gaps: per-step runs as one temporal result (#300 "no time-series
playback over a time attribute", medium); per-step change counts (#300, medium, already in
revision 8).

**Screen.** 79: the Email network with the March to May window (monthly figures invented,
shaped to screen 10's change peaks). The dock draws the series as a line with the window
shaded, above the rows.

## 14. Community evolution

**What was missing.** Absent; a named phase of the temporal workflow (W19).

**Design.** Entry: a Grouping's "..." > "Communities over time...", or the gear's OVER TIME "+"
choosing a Grouping. Settings popover: Steps (from the window's unit), Match by [Largest
overlap v], At least [30] % (below it a group counts as new), Colours [kept stable], the cost,
Run. Results:

- the Grouping's Groups tab gains OVER TIME: "12 steps" and "Events: 1 forms, 2 split, 1 merge,
  1 ends", with "Make a Grouping from this month";
- the Table dock's Findings tab draws a flow chart (an alluvial chart: one band per group per
  month, splits and merges as forks, bands' widths by members, the window's months shaded)
  above an events list (month, event, groups, members moved, "Make a Grouping");
- the transport bar marks the event months; with Colours kept, a group keeps its colour across
  months while playing, so a split shows as a new colour peeling off.

**Element API.** Named gap: group matching across runs (largest-overlap matching with a
threshold, returning stable ids and events; medium, no issue yet). It is also what makes a typed
Group name survive a re-run (section 3).

**Screen.** 80: the Email network (event figures invented). The flow chart of groups across
months is drawn above the events in the dock's Findings tab.

## 15. Notes, the note list and canvas callouts

**What was missing.** The Note tool and empty "Notes +" headers only.

**Design.** Entry: the Note tool (N), then a click on a node, an edge, a point on the canvas or
a tree row; or any Notes "+" (a node's About tab, every Record tab, the Dataset Overview). The
note opens in edit mode where it lives (the node's About tab, the object's Record tab): a
multi-line text field with the cursor, Tags, By (the author from Settings, and the time),
Callout [on] (show the text on the canvas), Done (Ctrl+Enter) and Delete. On the canvas a noted
node carries a small speech-bubble marker; with Callout on, the marker expands into a box with a
leader line. Canvas > Note markers (Shift+N) hides all markers.

The note list is the Dataset Overview's NOTES disclosure (and the status bar's "4 notes" opens
it): every note grouped by what it is about, then an **Orphaned** group for notes whose node or
object is gone, each with Reattach... (click the new target) and Delete. A click on a note
selects and frames its target.

**Element API.** Named gaps: notes stored with the objects and anchored to ids (#145 "the
session has no notes or journal", small once the objects API exists); the marker and callout
drawing (#295 "no node image or icon channel", small).

**Screen.** 81: node 34's note in edit mode, its callout and node 1's marker (speech-bubble glyphs), the note list with its Orphaned group.

## 16. Assistant tab

**What was missing.** The Ask button and the dock label only.

**Design.** Entry: Ask (backtick) or Ctrl+K's last row "Ask: <sentence>". The dock opens on
Assistant:

- the dock head's scope select ("What is showing, 34 nodes") is what the assistant runs on;
  its replies name it;
- turns alternate You / Assistant; under a turn that ran something, a collapsed row "> Ran Rank >
  Bridges (Betweenness), 3 ms" that expands to the command JSON with "Copy command", and a
  "Made: Bridges (Betweenness)" row with the assistant glyph that selects the tree row it made;
- a run over the cost gate lands waiting ("Made: How far from everything (waiting) [Run (4
  min)]") and the reply says so;
- the composer: a text field, a microphone, Send; above it, always, "Questions send a sample of
  up to 50 nodes and their attributes to Anthropic" with a Settings link (#326);
- before a provider is set the tab is one row, "Choose a provider", which opens Settings >
  Assistant.

Every row the assistant made carries the assistant glyph in the tree and its Record tab reads
"Assistant: <the request>". One request is one undo step. Escape while a reply streams cancels
it and any run it started. Errors: a provider error shows as the reply ("The provider refused
the request: <reason> [Retry]").

**Element API.** Exists: `el.aiCommand`, `cancelAiCommand`, `retryLastAiCommand`, the `ai-*`
events. Named gaps: the command vocabulary as the tool set and object ids in
`ai-stream-tool-result` (#337, in progress).

**Screen.** 82: two turns on Karate Club, the made row selected with its Record tab. The dock
draws the transcript, the tool-call rows, the Made links, the privacy line and the composer.

---

## Element work this document adds

| Item                                                                            | Size                   | Sections |
| ------------------------------------------------------------------------------- | ---------------------- | -------- |
| Rank correlation between two columns                                            | small                  | 2, 12    |
| Formula Measure from two runs (`data.compute`)                                  | small                  | 2        |
| Group names from a column (#191)                                                | small                  | 3        |
| Between-groups edge counts                                                      | small                  | 4        |
| Collapsed rendering of groups (meta-nodes, merged edges, expand in place)       | large                  | 4        |
| Methods text (`RunResult.methods()`)                                            | small                  | 5        |
| Per-object export over graph-io exporters (#178)                                | small                  | 6        |
| Parameter sweep as a table Finding (#194)                                       | medium                 | 7        |
| Link prediction registered; distances (#310); anomaly score with reasons (#312) | small, small, research | 9        |
| Removal impact without mutating the graph (#311)                                | small                  | 11       |
| Second renderer for Compare (#186)                                              | large                  | 12       |
| Per-step runs as one temporal result (#300)                                     | medium                 | 13       |
| Group matching across runs, with events                                         | medium                 | 3, 14    |
| Notes anchored to ids (#145) and markers (#295)                                 | small                  | 15       |

The app computes nothing in any of these: every number on the fourteen screens comes from a
session call or a catalogue.

## What the mocks draw

All of these are now drawn: the screen generator was extended once for every cluster (dark menus anchored to any control, insets for a second moment, text fields, radios, charts, the History and Assistant docks, coloured status chips, canvas marks, a split canvas, Present mode). A dark tag above a card or a menu marks a second moment on the same screen. The generator's spec keys are listed in `tmp/object-first/gen/README.md`, "Round 3 additions".

Screen 69 draws the dragged band and the TOP "+" menu; 70 the scatter plot in its 480 px panel; 72 the summary graph at the groups' centres; 73 and 76 dark menus with an inset each; 75 the scope select in the bar; 78 two panes with one camera; 79 and 80 the line and alluvial charts in the dock's Findings tab; 81 note markers, a callout and the note field; 82 the Assistant transcript and composer.

## Rows elsewhere that now point here

`round-2/coverage.md` rows for `node-metric` Values, `temporal`, Temporal analysis, Group names
(#191), Caveats, Engine versions, Run record, Export a result (#178), Linked cameras (#186),
the AI assistant rows, Notes and annotations, Comparison (#186), Batch operations, and section
13's `pair-list` and `temporal` rows move from "none" to screens 69 to 82; the Resolution column
of cluster 7 in `round-3/gaps.md` reads the section numbers above.
