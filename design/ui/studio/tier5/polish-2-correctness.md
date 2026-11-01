# Polish round 2: correctness review of the selection editor

Build d231869fd585 (graphty@0.8.92), frozen copy driven with `real.mjs`. Sessions (main checkout,
git-ignored) under `tmp/design-studio/tier5/polish-2/correctness/`: `n1` (neighbors.csv, 16 nodes,
30 directed edges, with Desmond filtered out and later a second Filter to card), `v1`
(volunteers.graphml, 24 nodes, 63 edges), `y1` (yeast-galactose.graphml, 331 nodes, to look for a
pending run). Independent numbers come from networkx 2.8.8 (`.../correctness/py/nb.py`, `nbb.py`,
`nb2.py`, `vol.py`). Screenshot paths below are relative to that folder.

## What held up

Every count below agreed with networkx in the editor, the preview key, the table's Group column
and the canvas:

- Filtered-graph structure (round 1's two blockers are fixed): In-degree 1 to 1 on the graph with
  Desmond removed is Bruno, Esther, Gwen, Ian (4 of 15, `n1/11.png`); after a second filter left 7
  nodes it is Nils alone, and Degree 1 to 1 gives Esther, Gwen, Nils (`n1/37.png`, `n1/41.png`).
  Upstream of Ian walks only the filtered graph (8 of 15, `n1/15.png`).
- A filtered-graph betweenness run matches networkx's undirected unnormalized values on the filtered
  graph (Bruno 5.325, Joy 22.625; `n1/18.png`), and a filter card's pick starts a full-graph run
  (domain ends at 22.07 = Kurt on the full graph, 7 of 16 at 10 or more; `n1/35.png`, `n1/36.png`).
- So far: Keep betweenness 5 or more computed on So far (the 8 upstream nodes) keeps Bruno 5.0 and
  Hugo 7.0, group 2, total 8 (`n1/20.png`). Moving it above the Add makes it pass none, total 11,
  Start with unchanged, order icons on both steps (`n1/30.png`). Undo and redo walk the move both
  ways (`n1/31-32.png`).
- Two base Keep steps swapped (trained, hours 20 or more) keep 15 / 10 and draw no order icon
  (`v1/12c.png`). A group switched off leaves the key and the total (`v1/14.png`).
- Edge side, Keep role staff (both ends) = 3 of 63 (`v1/04.png`).
- Import filter: "Neighbors of selection" froze to v09 (8 of 24); selecting v22 left it at 8
  (`v1/06.png`, `v1/07.png`).
- Save and reopen kept every group, step, on box, Start with and the frozen reference
  (`v1/17.png`, `v1/18c.png`).

## Findings, most severe first

### 1. Blocker: a node step reading an edge value still counts edges the filter removed

Round 1 named this third path; it is not fixed. Desmond filtered out, a style layer's Add "kind:
coworkers" (under "Edges (nodes touching)") reads 6 of 15 and paints Bruno (`n1/08.png`: table
row Bruno, group A). Bruno's only coworker edge goes to Desmond, which is not in the filtered
graph; the right answer is 5 (Gwen, Ian, Kurt, Lila, Nils).

Cause: `onSide` (`graphty-element/src/session/visibility/union.ts:205-212`) turns the edge test
into nodes with `endsOf(graph, bytesOf(halves.edge, ...))` over every edge; `apply` then masks only
the node base, so the node stays.

Fix (element): pass the base's edge bytes into `onSide` and AND them into the edge bytes before
`endsOf` (and for the edge side, AND the result with the base edges as Add already does). Element
test: neighbors.csv, filter out Desmond, node side Add kind = coworkers on `within: "visible"` is
{Gwen, Ian, Kurt, Lila, Nils}.

### 2. Blocker: a So far step's card says "Computing" forever and its test cannot be edited

Switching a betweenness step to Computed on: So far applies the right result (finding list above),
but the card loses its range, boxes and slider and shows only "Computing", 4 seconds later and
indefinitely (`n1/20.png`, `n1/22-card.png`). The folded chip loses its test too ("C: Betweenness:
Bridging", `n1/23.png`). A reader cannot read or change the threshold of a So far step: the
task is impossible without switching back to the filtered graph.

Cause: `stepCard` (`graphty/src/workspace/selection/values.ts:346-348`) returns no card when
`reading.run` is null, which it always is for a step-owned So far computation (spec 6: not a run);
`StepCard.tsx` then treats `card === null` on a measure as pending, and `RunLine` prints
"Computing" for a null reason.

Fix: the element reports the step's own values the way it reports a run (an additive @beta field on
`StepReading`, for example the computed field's path or a `scope.histogram` over the step's
computation), and `stepCard` builds the card from it and `rule.test`. "Computing" shows only for a
`computing` reason.

### 3. Major: after reopening, a layer with a So far step counts one thing and paints another

Reopened `n1`: the layer row reads 7 and the canvas legend "7 of 16 nodes", while 8 nodes are
painted red (`n1/27.png`; before saving all three read 8, `n1/24.png`). Opening the editor brings
the row and the editor to 8, but the legend stays at 7 after Done (`n1/28.png`, `n1/29.png`), and
only an undo / redo refreshed it.

Cause: the So far computation runs only once the editor watches the steps, while the painter has
its own result; the legend's count is not refreshed when that computation lands.

Fix (element): restore step-owned computations with the project so the painter, `styles.counts`
and the editor read one reading at load; emit the counts change when a step computation completes.

### 4. Major: the Degree card's domain is the full graph's in a style layer

With 7 of 16 nodes showing, a Degree step's card offers 2 to 5 (the full graph) while the filtered
graph's degrees run 1 to 4; typing 1 to 1 gives the right 3 nodes, but the slider thumb sits off
its track and the placeholders name values no shown node has (`n1/40.png`, `n1/41.png`).

Cause: `stepFields` (`graphty/src/workspace/selection/values.ts:78`) calls
`session.scope.histogram(value.path)` with no base, so the round 1 element fix (histogram with
`within`) is never asked for.

Fix (app): pass `within: "visible"` in the style host and `within: "graph"` in the import filter.

### 5. Major: a category checklist counts the full graph

Same filtered graph: the "kind" checklist reads neighbors 16, family 8, coworkers 6 edges
(`n1/07.png`), the full graph's 30 edges. The filtered graph has 15 / 8 / 3. Spec 5: members in
the step's input.

Fix: the element gives per-value counts over the step's input (or at least its base), as it does
for the histogram; the app renders those.

### 6. Major: an edge step reading a node value cannot be set to "either end passes"

Spec 1 puts a "both ends / either end" chip on the row. Edge side, Keep role = staff reads both
ends (3 of 63, right) but neither the row nor the card has the chip (`v1/04.png`); `StepCard.tsx`
only offers ends for the Relative to `touching` forms (line 232). "Edges touching a staff member"
(26 of 63) cannot be written from a node value.

Fix (app): on an edge step whose value is a node value, a segmented "Both ends | Either end" in the
card, writing `step.ends`, shown short on the row.

### 7. Major: the picker lists the same run twice, one stale, under one name

After the filter changed from 15 to 7 nodes, the style picker lists "Betweenness 0 to 22.62" and
"Betweenness 0 to 22.07" (`n1/38.png`). The first is the old filtered-graph run (its maximum is
the 15-node graph's Joy), the second the filter card's full-graph run; nothing tells them apart.
In the import filter the filtered-graph run is listed as an ordinary entry, not greyed and with no
tooltip (`n1/33.png`, `n1/34.png`; hover prints `tooltip: null`). Round 1 finding 3 in another form.

Fix: name Results by the run's exact title with its scope ("Betweenness, Filtered graph" /
"Full graph"), grey filtered-graph runs in the filter host with the element's reason, and rerun a
stale run in place so its summary is never the old graph's.

### 8. Minor: the legend's denominator is the full graph (round 1 finding 6, unfixed)

The legend reads "8 of 16 nodes" while the editor reads 8 of 15 (`n1/24.png`), and "5 of 16" with
7 nodes showing (`n1/37.png`). Fix: the legend's "of" is the layer's base.

### 9. Minor: "1 node has no value" counts a node outside the base (round 1 finding 8, unfixed)

The betweenness card on the filtered graph says "1 node has no value and is left out"
(`n1/16.png`); every node shown has a value, the one counted is the filtered-out Desmond. It is also
a sentence at rest; spec 5's "Not measured: K" chip is the form. Fix: count over the step's input.

### 10. Minor: a new layer's row counts the full graph under a filter

With 15 of 16 nodes showing, a new layer's row reads 16 while its editor reads 15 of 15
(`n1/05.png`). Fix: the row counts what the layer paints, over the filtered graph.

### 11. Minor (from the code): a pending group's chip shows a confident number

`SelectionEditor.tsx:555` renders `branchRead.count` whatever the branch state, so a group that was
never ready reads "0 of N" with no short word (spec 1: the chip shows the short word, the total
counts ready groups). Steps are right (`waiting` hides their number). Not reproduced on screen: no
run on these datasets, yeast included, took long enough to stay pending (`y1/04.png`). Fix: for
`state === "pending"` show the reason's short word, the held count in the tooltip.
