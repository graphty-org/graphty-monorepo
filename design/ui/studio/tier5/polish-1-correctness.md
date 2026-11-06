# Polish round 1: correctness review of the selection editor

Build 7225138fd378 (graphty@0.8.92), frozen copy driven with `real.mjs`. Sessions (main checkout,
git-ignored): `tmp/design-studio/tier5/polish-1/correctness/s1` (florentine.gml, 15 nodes, 20
edges) and `.../s2` (volunteers.graphml, 24 nodes, 63 edges). Independent numbers come from
networkx 2.8.8 (`.../correctness/py/ref.py`, `ref2.py`, `vol.py`). Screenshot paths below are
relative to `tmp/design-studio/tier5/polish-1/correctness/`.

## What held up

Every count checked against networkx agreed, in both hosts, on both datasets, unless a finding
below says otherwise:

- Union of groups and steps: Add degree 3..4 (8), Add betweenness >= 20 (9), Keep degree 3..3
  (6), Start with All (9), Or group B degree 2..3 (8, total 11), B alone with A off (8). The
  table's Matches only rows and its Group column matched the drawn colors every time
  (`s1/09`..`s1/33`). Unnormalized betweenness matched networkx to the second decimal.
- Reorder: moving a Keep above two Adds took the group to 0 and back up to 9; no move changed Start
  with; the order icon showed exactly on the steps whose result depends on their place (`s1/22`,
  `s1/23`).
- Undo and redo walked the start change and both moves back and forth, one step each (`s1-undo.png`,
  `s1/30`).
- An inert step ("No test") changed no count (`s1/19`).
- Save and reopen kept both groups, every step, Start with, the layer's 11 and its paint
  (`s1/38`, `s1/41`); a Filter out card reopened with 21 of 24 nodes and 42 of 63 edges, matching
  networkx (`s2/12`).
- Import filter: category pick counts (16 / 5 / 3), staff Keep degree 7..8 = 3, Filter out leaves
  21 nodes and 42 edges, and the edited card holds what it removes faint until Done (`s2/05`..`s2/07`).
- A betweenness step re-read the new filtered-graph run after a filter changed (Bischeri 16.5,
  Guadagni 24.5, as networkx gives with Medici removed) (`s1/54`).

## Findings, most severe first

### 1. Blocker: "Within k hops of" walks through nodes the filter removed

In a style layer (base: the filtered graph), "Within 2 hops of Salviati", with Medici filtered out,
selects Acciaiuoli, Barbadori, Ridolfi, Tornabuoni and Albizzi. On the filtered graph Salviati
reaches only Pazzi: Medici was the only bridge. Acciaiuoli is drawn with no edges at all and still
turns group color (`s1/59.png`: 9 of 14; the correct answer is 4 of 14: Salviati, Pazzi, plus the
betweenness step's Bischeri and Guadagni).

Cause: `compileOne` case `"hops"` (`graphty-element/src/session/visibility/filter.ts:1831`) calls
`hopsFrom(context.graph, ...)` (`union.ts:549`) on the whole snapshot; the Add step only masks the
result to the base afterwards (`union.ts`, `apply`). `"touching"` (filter.ts:1835) and the node
side's reading of an edge value (`endsOf`, `union.ts:177`, used by `onSide`) have the same gap:
they count edges outside the base.

Fix (element): give `StepFrame` the base's node and edge bytes and make `hopsFrom` skip any arc
whose far node (or the edge itself) is outside the base; restrict `touchingTest` and `endsOf` to
base edges the same way. Add an element test: florentine, filter out Medici, "within 2 hops of
Salviati" on `within: "visible"` is {Salviati, Pazzi}.

### 2. Blocker: Degree in a style step is the full graph's degree, not the filtered graph's

Under a filter the base is the filtered graph and every other surface reads it there, but a Degree
step reads the unfiltered degree:

- florentine, Medici filtered out: Keep degree 3..3 counts 6 (`s1/50.png`); on the filtered graph
  only Castellani, Peruzzi and Bischeri have degree 3. Salviati and Barbadori (degree 1 once
  Medici is gone) stay in "Degree 2 to 3".
- volunteers, three staff filtered out: "Degree 7 to 8" selects 3 of 21 (Priya Nair, Leo Novak,
  Seun Okoro) while the Values tab of the same graph says the highest degree is 6 (`s2/09.png`
  against `s2/07.png`). The slider's domain also ends at 8.

Cause: `structureReaders` (`filter.ts:1233`) reads `graph.degree()` of the snapshot whatever the
step's base. The histogram behind the card (`filter.ts:1414`) does the same.

Fix (element): when the step's frame is `within: "visible"`, compute degree, in-degree and
out-degree over base edges only (count each base edge at its two base ends), in both the step
reader and the histogram; the import filter (`within: "graph"`) keeps the snapshot's degree.

### 3. Major: one step's run is listed two or three times after save and reopen

After saving and reopening a project whose layer holds a betweenness step, the value picker lists
"Betweenness" twice with the same name and the same "0 to 45" (`s2/17.png`, reproduced on a clean
project). In s1, after a reopen and then a filter change, the picker listed three identical
"Betweenness" entries, two of them summarized "0 to 47.5" from the unfiltered runs (`s1/52.png`),
the node's Values tab listed "Betweenness (visible)" twice (`s1/45.png`) and the table grew three
"Betweenness (visible)" columns, two of them stale full-graph values under a "visible" title
(`s1/51.png`). The step itself read the fresh run (the last item under "What held up"),
so the duplicates are what a reader picks from and reads in the table.

Spec 6: one run per algorithm, settings and scope, shared. Fix (element): when a project is
restored, match the step's saved algorithm, settings and base to the restored run before starting
one (the step-run registry in `graphty-element/src/session/scope/stepRuns.ts` must be filled from
the restored runs, not only from runs it started); when a base change makes a run stale, rerun that
run in place instead of adding a new one; the picker then has one entry per run, named by its exact
title with the scope (spec 4 item 2).

### 4. Major: a pending step's chip shows a count it does not have

A step that waits on a run (computing, Run, paused, failed, stale) or waits for an earlier step is
read with `members: input` (`union.ts:427`), and its count is `ones(step.members)`
(`steps.ts:555`), so the row shows the group's count BEFORE the step as the count after it
(`SelectionEditor.tsx:591` renders `read.count` for every state, next to "Computing"). For a pending
Keep or Except this is a confident number that is too high; every later "Waits for step N" row
repeats it. Spec 1: a pending step shows its short word; only the group keeps its last ready result.

Fix: the element reports `count: null` (or a `held` flag) for a pending or waits-for step; the app
renders no number for it (the short word only), and the tooltip says the step is waiting. Verified
from the code; this build gave no way to make a florentine or volunteers run slow enough to
screenshot the state.

### 5. Minor: the preview key's counts double-count overlapping groups and keep switched-off groups

With A 9 and B 8 sharing six nodes, the key reads A 9, B 8, No match 4 (21 rows for 15 nodes),
while only two nodes are drawn in B's color, since the first group wins (`s1/32.png`). With A
switched off, the key still lists A 9 with its swatch while nothing is drawn in A's color
(`s1/33.png`). Cause: `PreviewKey.tsx:55` takes each branch's own count and ignores its state.

Fix: count, per group, the members drawn in its color (members whose `branchOf` is that group), and
drop or mark the groups that are off, so the key's rows add up to the base.

### 6. Minor: denominators disagree under a filter

With Medici filtered out, the editor reads "10 of 14" (the base) while the canvas legend for the
same layer reads "10 of 15 nodes" (`s1/50.png`). Fix: the legend's "of" is the layer's base, as the
count chip's is (spec 1: "the result, out of the base").

### 7. Minor: a new layer shows 15 in the layer list before it has a selection

A just-added layer lists 15 in the style tree while its editor reads 0 of 15 (`s1/04.png`); the
list drops to 0 only after the first step (`s1/06.png`). Fix: the new layer is written with its
None-start selection at creation, so the tree reads its count from the start.

### 8. Minor: "1 node has no value" counts a node outside the base

On the filtered graph (Medici removed) a betweenness card says "1 node has no value and is left
out" although every one of the 14 nodes in the base has a value (`s1/53.png`). The missing count is
taken over the full graph. Fix: count missing values over the step's base (or its input when
computed on So far). The sentence itself also breaks the owner's no-sentences rule; the
"Not measured: K" chip of spec 5 is the intended form.

## Not verified

- One canvas frame (`s1/10.png`) drew Salviati in group color while the count was already 9; four
  repeats of the same edit drew correctly, so it is not reported.
- The ask-limit path (Run, Cancel) and the frozen Selected (N) reference in a filter were not
  reached in this round.
