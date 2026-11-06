# Repolish round 2: correctness review of the rebuilt selection editor

Build 1b8c1045bc (graphty@0.8.92), a frozen copy of `graphty/dist` built after that commit, driven
with `real.mjs`. Sessions (main checkout, git-ignored) under
`tmp/design-studio/tier5/repolish-2/correctness/`: `v2` (volunteers.graphml, 24 nodes, 63 undirected
edges: a two-group style layer, Louvain steps, filter cards, save and reopen, undo and redo), `n2`
(the round 1 saved projects from before the rebuild, neighbors.csv, 16 nodes, 30 directed edges) and
`m1` (`mid-4k.graphml`, a generated graph of 4,000 nodes and 7,996 edges, `py/mid.py`: So far, save
and reopen, pending runs). Independent numbers come from networkx 2.8.8 (`py/*.py`). Screenshot
paths below are relative to that folder.

## What held up

Every count below agreed with networkx in the outline, the preview key, the layer row, the table's
Group column and the canvas:

- Keep Degree By position top 10 keeps 10 (degree 6 and up); top 5 keeps 6, the ties at 7 kept
  together (`v2/04.png`, `v2/05.png`).
- A = Keep Degree top 5 (6), B = Add role staff (5, draws 2), total 8 (`v2/07.png`). A + Keep
  Louvain Group 1 gives A = 3 (v02, v05, v06), total 7, B draws 4 (`v2/10.png`). Undo gives 8, redo
  7 (`v2/11.png`, `v2/12.png`). Save and reopen: the layer row reads 7 at once, the picture is the
  same (`v2/15.png`, `v2/16.png`).
- Filter card All nodes / Except role volunteer: 8 of 24 nodes, 9 of 63 edges; the layer then reads
  5 of 8 with A = 1 (v02), B = 5, key A 1, B 4, No match 3 (`v2/18.png`, `v2/20.png`). A second card,
  Keep Louvain (full graph) Group 3: the Filters header reads 4 of 24, the top bar 4 of 63 edges
  (networkx: v17, v21, v23, v24 and 4 edges) (`v2/28.png`). The table lists A = v17, v23 and B = v21,
  v24 (`v2/32.png`).
- 4,000 nodes: Keep Degree min 20 = 59; Keep Betweenness min 200,000 on the filtered graph = 22, max
  1,332,603 as networkx; the same step on So far with min 50 = 21 of the 59, max 457; min 200,000 on
  So far reads "Passes none" and 0 of 4,000 (`m1/03.png` to `m1/07.png`). After save and reopen the
  layer row reads 21 at once (`m1/09.png`): round 1's carried row-count finding did not recur here.
- Round 1's blocker is fixed: the tier 4 Filter to card on an edge value opens read-only, 12 of 16
  nodes and 8 of 30 edges, and turning it off and on again keeps 12 and 8 (`n2/11.png` to
  `n2/13.png`). Round 1's finding 3 is fixed: the removing selection card counts 15 of 16
  (`n2/17.png`). The converted tier 4 Filter out card (A: All / Except Degree min 4, B: Add Degree
  min 5) reads 4, 1 and 5 of 16 as networkx (`n2/05.png`).
- A step whose run waits for Run ("Run (about 6 seconds)") changes no count: the card, the key and
  the header stay at 4,000 (`m1/11.png`).

## Findings, most severe first

### 1. Blocker: "Run (about 6 seconds)" froze the tab for more than seven minutes

On `mid-4k.graphml`, a filter card step Keep Girvan-Newman: Community reads "Run (about 6
seconds)" (`m1/11.png`). Pressing Run froze the page: the step never returned, no screenshot could
be taken, and `real.mjs --end` timed out after 2 minutes; the browser had to be killed after 7
minutes 30 seconds, losing the unsaved project. The estimate is the confident wrong number the spec
forbids for a pending step, and nothing could cancel the run.

Cause: Girvan-Newman runs on the page's thread (`OFF_THREAD_MEMBERS` in
`graphty-element/src/algorithms/offThread.ts` lists only louvain, kCoreDecomposition and
labelPropagation), with `maxIterations` 1,000 edge removals, each an edge betweenness of O(n m)
(about 32 million steps here). The catalog says `complexity: "O(n * m^2)"`
(`graphty-element/src/catalog/algorithms.ts`, girvan-newman), yet `estimateCommand`
(`graphty-element/src/session/planning.ts:503`) returned about 6 s.

Fix (graphty-element): estimate Girvan-Newman from its real cost (iterations times an edge
betweenness on the scope), so the step asks with an honest figure or refuses above a cap; run it in
the Worker like Louvain, so the page keeps drawing and Cancel works. Element test: on a 4,000-node,
8,000-edge graph the estimate is within a factor of 3 of the measured run, and a run in progress
can be cancelled.

### 2. Major: a filter card's name drops its verb and says the opposite of what it does

A card named by its first step leaves out the verb, so every card that starts with Except reads as
the thing it removes:

- All nodes / Except role volunteer is called "role volunteer"; the preview key reads "role
  volunteer 8", although the 8 are the nodes that are not volunteers (`v2/18.png`).
- The converted tier 4 Filter out card (All / Except Degree min 4, then Add Degree min 5) is called
  "Degree min 4"; it removes the 11 nodes of degree 4 (`n2/02.png`, `n2/05.png`).
- The read-only removing card of `old/nb-union-out.graphty.json` is called "Degree min 5", and its
  body reads "Degree min 5", although it removes Joy, the one node of degree 5 (`n2/19.png`).

Spec 3.3 says a card is named by its first step "as its row says it", and the row says "Except role
volunteer". Fix (`cardName`, `graphty/src/workspace/data-place/Filters.tsx`, about line 605): put
the verb before the value whenever it is not Keep ("Except role volunteer"), and for a removing card
no editor reads, write "Except" before the rule's words. App test (real input): an Except card's
name, its "Use ..." box and the preview key's title start with "Except".

### 3. Major: a saved Select card shows "Keep Degree min 4, 12 of 16" while it hides nothing

`old/nb-select.graphty.json` (a tier 4 Select degree min 4, on, and a Filter out). The first card
opens as All nodes / Keep Degree min 4, box on, "12 of 16" (`n2/06.png`): the card claims to keep 12. Untick the other card: all 16 nodes are drawn and 12 are selected, while the first card still
reads "Keep Degree min 4", on, "12 of 16" (`n2/07.png`, `n2/08.png`). The box now matches the
element, as round 1 asked, but the outline and the count say the card filters, and a card's count
means what stays. Both cards are also called "Degree min 4" (finding 2).

Fix (graphty-element, as round 1 proposed): convert a saved select condition when the project is
read, into a keep condition turned off (and, if the select is to be kept, one Select N on open),
so the box, the outline and the count agree. Until then, show it read-only in its own words and
count what stays (16 of 16). Spec 3.3's "on while it still selects" needs that change too.

### 4. Major: a checked community is saved as a raw id, so its meaning changes when the run reruns

Spec 5: "A checked group of an unstable result is saved as 'the group of X' ... following X across
re-runs". The build saves the raw value (`"test": { "kind": "categories", "values": ["2"] }` in
`v2/downloads/volunteers.graphty.json`). In the style layer, Keep Louvain Group 1 kept v02, v05,
v06, a part of the v01 to v08 community (`v2/10.png`). Adding a filter card reruns Louvain on the
filtered graph, and the same step now reads "Group 3" (`v2/20.png`); with a second card it reads
"Group 1" again and keeps v17 and v23, from the other end of the graph (`v2/29.png`, table in
`v2/32.png`). Nothing says the step's meaning changed.

Fix: the checklist writes a checked group of an unstable result as `same-value` of its named member
(`element-api.md` section 3, the histogram's member per value), and the row shows "Community of
<member>". Element test: on volunteers.graphml, a step saved as the group of v02 keeps v02's
community before and after a filter removes the volunteers.

### 5. Major: reruns pile up as identical "Louvain (visible)" runs, and the stale ones are offered as current

After two filter changes the project holds five Louvain runs: `louvain` and `louvain_2` (scope
visible, 24 nodes), `louvain_3` (visible, 8 nodes), `louvain_4` (graph) and `louvain_5` (visible, 4
nodes) (`v2/downloads/volunteers.graphty.json`, graphty-results). Spec 6 says one run per
algorithm, settings and scope, a stale run rerun by the element. The stale ones stay visible:

- The filter card's value picker offers three identical "Louvain, 3 values" entries, tooltip
  "Louvain", none greyed, although spec 2 greys filtered-graph runs in the import filter
  (`v2/22.png`, `v2/23.png` to `v2/26.png`).
- The table shows three "Louvain (visible)" tabs and a "Louvain (visible)" column that reads Group 3
  for v17, v21, v23 and v24 (the stale 24-node run), while the step's current run keeps v17 and v23
  and leaves v21 and v24 (`v2/32.png`).

Fix (graphty-element): a rerun of a step's run on a changed scope replaces the stale run under the
same id, so one visible run per algorithm and settings remains; the app greys visible-scope runs in
the filter's picker. Element test: two filter changes under a style step on Louvain leave one
visible Louvain run.

### 6. Major: Undo undoes the element's rerun before the reader's edit, and the waiting group loses members

With the two filter cards of finding 5, the reader's last action was ticking Group 3 in the second
card. Undo instead says "Undid running Louvain": the rerun graphty-element started for the style
step is removed, the step reads "Run", A reads "Waits", and the layer drops to 3 of 4. The table
lists A = v17 only, so A did not keep its last ready result (v17, v23) as spec 1 requires
(`v2/35.png`). A second Undo undoes the reader's edit (`v2/36.png`); one Redo brings back 4 of 4
and then "Nothing to redo" (`v2/38.png`).

Fix (graphty-element): a run the element starts or reruns for a step writes no undo entry (as So
far computations already do), and a pending group keeps its last ready members. App test (real
input): tick a value in a filter card under a style layer on Louvain, press Undo once, and the tick
is gone and the layer's count is unchanged.

### 7. Minor: a category checklist counts the base, not the step's input

After Keep Degree top 5 (6 nodes), the Louvain checklist reads Group 1, 2 and 3 with 8 each
(`v2/09.png`); the step's input holds 3, 2 and 1 of them. Spec 5 counts "members in the step's
input". Ticking Group 3 promises 8 and keeps 1. Fix: `CategoryCard`
(`graphty/src/workspace/style/WhichPicker.tsx`, about line 2730) asks `scope.histogram` with the
step's input as `within`, and sorts by that count.

### 8. Minor: "top 5" keeps 6 and nothing says why

Degree By position top 5 keeps 6 (the four nodes of degree 7 tie) and the row reads "Degree top 5",
the pane only "5" (`v2/05.png`). Spec 5 asks for the tie chip ("5 asked, 6 kept: tied at 7"). Fix:
draw the chip from the element's tie facts beside the box, and add the kept count to the row's
tooltip.

### 9. Minor: the step pane draws no "N so far"

Spec 3.2 puts "138 so far" in the step pane; the build has it only in the pane's accessible name
(`graphty/src/workspace/selection/StepPane.tsx:464`), so the pane shows no count (`v2/04.png`,
`m1/04.png`). Fix: draw the count beside the verb segment, as the spec's pane row lists it.

### 10. Minor: a long test is cut with no ellipsis, and a pending step's value shrinks to one letter

"Keep Louvain: Community G" (`v2/10.png`) and "Keep Betweenness: Bridging m" (`m1/04.png`) end
mid-word with no ellipsis, hiding "Group 1" and "min 200000"; with "Run (about 6 seconds)" the value
is cut to "G" (`m1/11.png`). Spec 3.1: the test truncates first, at its tail, with an ellipsis, then
the value; tags and state never. Fix: give the test cell `min-width: 0` and
`text-overflow: ellipsis`, and keep at least the value's first word before the state word.
