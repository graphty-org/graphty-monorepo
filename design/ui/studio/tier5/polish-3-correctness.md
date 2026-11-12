# Polish round 3: correctness review of the selection editor

Build 7ca4cae647dd (graphty@0.8.92), a frozen copy of `graphty/dist` driven with `real.mjs`. Sessions
(main checkout, git-ignored) under `tmp/design-studio/tier5/polish-3/correctness/`: `v1` and `v2`
(volunteers.graphml, 24 nodes, 63 undirected edges), `n1` (neighbors.csv, 16 nodes, 30 directed
edges, Desmond filtered out), `y1` (yeast-galactose.graphml, 331 nodes, to look for a pending run).
Independent numbers come from networkx 2.8.8 (`.../correctness/py/calc.py`, `nb3.py`, and round 2's
`nb.py`). Two element behaviors were confirmed with a throwaway vitest probe against
`session.scope.watchSteps` on Les Miserables (kept as `.../correctness/py/so-far-shared.probe.ts`,
not in the tree). Screenshot paths below are relative to that folder.

## What held up

Every count below agreed with networkx in the editor, the preview key, the table's Group column and
the canvas:

- Two groups on the full graph: A = Add Degree 6 or more (10), Keep trained yes (7); B = Add role
  staff (5, draws 2); total 9; the table lists the same 9 with the right letters (`v1/08.png`,
  `v1/09.png`). B off: 7 (`v1/10.png`).
- Reorder: Keep trained moved above Add Degree gives A = 10, total 12, order icon moved to the Add
  (`v1/11.png`); undo gives 9, redo 12 (`v1/12.png`, `v1/13c.png`); the red fill paints exactly 12
  (`v1/14.png`).
- So far with a test: Keep Betweenness 1 or more on So far of the 10 high-degree nodes: domain 0 to
  12 (networkx: v02 12.0 on the induced subgraph), A = 6, total 8 (`v1/25.png`). On neighbors, the
  same over the filtered graph: domain 0 to 5 (Kurt 5.0), B = 2, total 6 (`n1/10.png`).
- Edge side: Keep role staff, Both ends 3, Either end 26 of 63 (`v1/27.png`, `v1/28.png`); the
  edge table lists 26 (`v1/29.png`). Under the filter it reads 13, networkx 13.
- Round 2's fixes hold: kind = coworkers with Desmond filtered out is Gwen, Ian, Kurt, Lila, Nils;
  the checklist counts the filtered graph (15 / 8 / 3 edges) (`n1/06.png`, `n1/07.png`).
- Group order: B moved above A, first group wins: 5 and 4, total 9 unchanged (`n1/08.png`).
- Import filter, Filter out, A = role volunteer Except trained yes (7), Or B = Degree 8 or more (2):
  9 removed, 15 nodes and 24 edges left, filtered degree 1 to 5, as networkx (`v1/45.png`). Under
  it the style layer reads 4 of 15 and paints 4 (A empty, B = the four staff left) (`v1/48.png`).
- Undo of turning the filter off restores 6 of 15 in the row, the legend and the paint
  (`n1/13.png`). Save and reopen keeps the filter card, its groups, steps and 15 of 24
  (`v2/06.png`), and the edge layer's Either end (26) (`v1/33.png`).
- Pending: no run on these datasets, yeast included, stayed pending long enough to see; the step and
  group code paths for "Waits" were read, not observed.

## Findings, most severe first

### 1. Blocker: a So far step with no test yet shows an empty card, so its test cannot be set

Add a Keep step, pick Betweenness (card: Between, 0 to 77.3), then "..." > So far before typing a
bound: the card keeps its title and count and loses every control, 6 seconds later and after
closing and reopening it (`v1/19.png`, `v1/20c.png`, `v1/22c.png`). The row says "No test". The
reader cannot write the threshold; the only way through is to switch back to Filtered graph, type a
bound, and switch to So far again (`v1/23.png` to `v1/25.png`).

Cause (element): the step's own computation does finish and `StepReading.values` becomes numeric,
but `watchSteps` never calls back. The probe: an untested So far degree step on Les Miserables read
`SEEN []` (no `onChange` at all in 1.5 s) while `watch.current` held `inert test-unset numeric`.
`digestOf` (`graphty-element/src/session/scope/steps.ts:980`) digests counts, states, reasons and
`run`, not `values`, and an inert step's computation landing changes none of those, so the digest
is equal and the change is dropped. The app keeps rendering the reading it had, where `values` was
null, and `ownCard` (`graphty/src/workspace/selection/values.ts`) returns no card.

Fix (element): put the step's values in the digest (for example `values === null ? null :
[values.of, values.min, values.max, values.missing]` per step). Element test: an untested
`computedOn: "so-far"` measure's `watchSteps` hears one reading whose step has numeric `values`.
App test (real input): pick Betweenness, So far, then the card shows its two boxes.

### 2. Major: identical So far steps in two groups read one group's values

Duplicate a group whose last step is Keep Betweenness 1 or more on So far (Mod+D), then change the
copy's first step (Degree 4 or more becomes 2 to 3). The original's card now says "7 nodes have no
value and are left out" with no range (`n1/18.png`, crop `n1/18c.png`), while its count (2) is
right and its own computation gave values 0 to 5 for all 7 nodes. The copy's card shows 0 to 0, its
own values (`n1/17.png`). The probe gives the same over the API: two groups with the same So far step
over staff (26) and guests (51) report, for the staff group's step, `of 26, missing 26` (every node
"no value"), and for the guests' the real 0 to 25.

Cause (element): `stepRuns.ownResult` (`graphty-element/src/session/scope/stepRuns.ts:437`) looks the
result up by `localKeys.get(definitionKey(step, within))`, and `definitionKey` is the rule, So far
and the base only. `localState` (line 293) sets that one slot for every group whose step has that
definition, so the last group evaluated wins and every other group's card reads its values. The
counts are right because the union reads `local.get(key)` with the input in the key.

Fix (element): look the result up by the step's own input as `localState` does (pass the step's
input to `ownResult`, or keep `localKeys` per definition and input). Element test: the probe's two
groups, each step's `values` read over its own input with no "missing".

### 3. Major: the legend's count is stale after the filter changes, for a layer with a So far step

With the volunteers filter applied (15 nodes left), Layer 1's row reads 4 and the canvas paints 4,
while the legend reads "6 of 24 nodes" and stays there (`v1/46.png`, `v1/47k.png`; the editor reads
4 of 15, `v1/48.png`). On neighbors, turning the Desmond filter off: the header reads 12 of 16 and
12 nodes are painted, the legend "8 of 16 nodes" (`n1/12.png`). A plain Degree layer under the same
filter change keeps its legend right (`n1/05.png`), so the So far step is what leaves it behind. Any
edit that recompiles the layer (B off and on) brings the legend to 4 (`v1/49k.png`).

Cause (element): `legendSources.selects` (`graphty-element/src/session/styles/StylesApi.ts:2890`)
counts with the compiled layer's `selector.test`, a different evaluation from the one `counts`
and the painter use, and nothing re-reads that test when the visibility base moves or a step's own
computation lands for the new base.

Fix (element): take the legend's count from `api.counts(id)` (the painted set within the drawn
elements), so the key, the row and the paint share one reading; or invalidate the rule's compiled
test on a visibility change and on a step computation's completion. Element test: a layer with a
So far step, a filter added and removed; the legend's `scope.count` equals `counts(id).painted`
after each.

### 4. Major (carried from round 2, still open): after reopening, the row and legend count 5 while 8 are painted

Saved with A (Degree, Keep Betweenness on So far) and B (staff), reopened: the row and legend read
5, the canvas paints 8 (`v1/33.png`; still 5 after 6 s, `v1/34c.png`). Opening the editor brings the
row to 8, the legend stays at 5 (`v1/35.png`). 5 is B alone: the never-ready So far group counts as
nothing while the painter paints it, and no "Waits" or tooltip says a group is missing. Same cause
and fix as round 2 finding 3 (restore step-owned computations with the project; emit counts when
they land). Listed again because it is a confident wrong number at rest.

### 5. Major: in a filter, a group chip opens the table on "Shown" rows the filter removed

Filter out card, group A's chip "7 of 24": the table opens on Matches only with Shown pressed and
lists v04, v06, v08, v12, v15, v19, v22, all seven removed from the drawing (`v2/10.png`). With
Matches All it lists the 15 drawn, none in a group (`v2/11.png`). The table says these rows are
shown; the canvas does not show them.

Cause (app): `TableDock.tsx:706-709` replaces the shown scope by the picked group's members, so the
Shown | All segment stays pressed but is ignored.

Fix (app): in the filter host, where members are read over the Full graph, open the table with
Shown | All on All (or disable Shown while Matches only is on, its reason in the tooltip); in the
style host the base already is the filtered graph, so nothing changes there.

### 6. Minor: an edge step's Either end is not on its row or its folded chip

"role staff" reads the same for Both ends (3) and Either end (26) on the step row and on the folded
chip (`v1/28.png`, `v1/30.png`). Spec 1 puts the choice on the row. Fix: the row and chip add the
short word ("either end") when `step.ends === "either"`.

### 7. Minor: moving a group renames it

Moving B (coworkers, orange) above A renames it A and the green group B (`n1/07.png`, `n1/08.png`);
the table's Group column and the spoken names follow. Colors stay with the group, letters do not,
so "B" names a different group after a move. Fix: write the letter into the group when it is made,
as its color is (`branch.name`), so a move never renames.
