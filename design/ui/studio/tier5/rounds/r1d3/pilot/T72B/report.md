# Pilot: T72 B (gauges -- readings sent by itself, not installed in the 1990s), targeted re-pilot

Build: c3100058ab, served from `.study-builds/tier5-r1d3-c3100058ab`. Every walk started from the
task's real start, `setup:gauges-clean.txt` (11 gauges, 13 stretches, station as the label, the
node table open). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T72B/ (below, `<walk>/NN.png`).
The data stayed the task's own on every walk: 11 nodes and 13 edges; the five gauges reached are
G02 Mill Pond, G04 Fox Creek, G06 Willow Run, G07 Stone Weir and G11 Quarry Pool.

Result: **reached** by pointer. Nothing walked crashes, blocks the task or gives a wrong count.

## Success path by pointer (`success/`)

Replayed the earlier pass's success walk; all 11 steps matched.

- + > Layer, Which nodes, telemetry, tick yes: 7 of 11 (05.png).
- Condition... > installed, 2000, Enter, Except: "Except installed before 2000", 5 of 11 (08.png).
- Done, Add to node fill, E4572E, Enter: five orange nodes, key "Color: Layer 1, 5 of 11 nodes",
  inspector "telemetry yes / Except installed before 2000", Layer 1 row count 5 (10.png).
- Hex box: a new value then Escape put back E4572E (11.png); Tab kept it (12.png).

## Touched routes that belong to this task

The fix list holds 14 routes; two are this task's. Walk folders are named by their place in that
list: entry 3 ("Cancel on a new card then Ctrl+Z") is `touched-3`, entry 5 ("Cancel on a new card,
announcements") is `touched-5`. The other twelve are other tasks' walks on other starts and datasets.

### touched-3: Data > Add filter, telemetry yes, Cancel, then Control+Z

- Cancel: card gone, Filters section empty, no filter mark in the top bar, 11 nodes drawn (03.png).
- Control+Z: no card comes back. Undo undoes the step before the card, the start's own change of
  `station` to the label column (toast "Undid changing a column's role.", the table header loses
  its Label tag) (04.png). This is the decided behavior (decided.md, dry run pass 3: Undo names and
  undoes what came before the card).
- Control+Shift+Z: "Redid changing a column's role.", Label back, Redo greyed, still no card (05.png).
- A real card built after it: "telemetry yes / Except installed before 2000", 5 of 11 nodes, top bar
  "5 of 11 nodes, 1 of 13 edges" (06.png).

### touched-5: keys only with the screen reader (`--keys --sr`)

Replayed the earlier walk; steps 1-19 matched. Step 20 differs only as the fix intends:

- Enter on Cancel: focus to button "Add filter", said "Filter not added" and nothing more (the
  earlier "Filter off" is gone); the card is gone (21.png).
- Tab: separator "Resize left panel"; Shift+Tab back to "Add filter" (22-23).
- Control+K, "filter", Enter: "Editing New filter, Filters"; Escape on the empty picker: focus to
  "Add filter", "Filter not added", no card (24-25).
- Control+K, "filter", Enter, "tele", Enter, Space: checkbox "yes, 7 nodes" checked, "7 of 11 nodes";
  Escape: treeitem kept; Escape: "Done, 7 of 11"; Escape: focus on the card's button
  "telemetry yes, 7 of 11 nodes" (26-29, 29.png shows the card and "7 of 11 nodes").

Focus never fell to the page body. Every control met had a name.

## Defects (all walks)

None that crash, block or spoil the grade. Still seen, unchanged: one orange node half under the
canvas toolbar with the node table open, so a count of the picture finds four (success/10.png).

Note for graders: Control+Z after Cancel on this start undoes the start's own label change, which
the participant never saw happen; station names leave the table header's Label tag until Redo. It
does not change the count.

## Answer key against the screen

- Path B: "type 2000; Enter" -- the count updates as the digits are typed; Enter changes nothing
  visible. Otherwise the route and its final outline match the screen.
