# Pilot: T65 B (gauges + flows, tidied), targeted re-pilot

Build: ff17391bb1 (frozen, served from .study-builds/tier4-r1d2-ff17391bb1). Start: the setup
`rounds/tier-4/setups/gauges-tidy.txt` (gauges.csv joined with flows.csv, Stone Weir's bad depth
made blank, `installed` read as dates). Screenshots under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T65B/ (folders named
`v...`; git ignores them). Every walk below was replayed step by step from the newest walk of the
same route on this build and compared at every check point. The data stayed the task's own on
every walk: 12 gauges, 14 edges, the table's dates and depths as in the file.

## Result

Reached. The screen gives the answer key's counts: **5 of 12** gauges in the picture (G01, G02,
G04, G09, G11) and **"3 nodes selected"** (G01, G02, G09), with 3 rings and 3 highlighted table
rows; a screen reader hears "5 of 5 rows, 3 selected" and "3 nodes selected". Nothing crashed,
blocked the task or gave a wrong count on any walk.

## Route 1: success path by pointer (v1-path, 14 screenshots, every step matched)

- Add filter > telemetry > yes; Add a condition > depth_cm; "from" 70, Enter: "5 of 12 nodes, 2
  of 14 edges" (v1-path/06.png).
- Add filter > installed: the card opens on Before with the box focused; 2005, Enter: 3 of 12
  while the card hides (v1-path/08.png).
- Select on the installed card: "5 of 12 nodes", inspector "3 nodes selected", G01, G02, G09
  ringed and highlighted (v1-path/09.png).
- Tab and Escape in the date box behave as decided (Escape keeps the card, focus to its on box)
  (v1-path/10.png, 11.png). Keep card off selects 5, back on gives 3 (v1-path/13.png, 14.png).
- Also matched end to end: the other pointer variants of the path, v-p2-path, v-p3-path and
  v-w1-path (v-w1-path/14.png ends on "3 nodes selected").

## Route 2: detours

- A style layer's Which nodes (v2-detour-which-nodes): installed, 2005, Enter: "installed before
  2005, 5 nodes", "5 of 12 nodes", layer row counts 5, all 12 gauges stay drawn
  (v2-detour-which-nodes/08.png). Matches the key; not success, as the key says.
- The fixed detour set (toolbar magnifier, Filters picker search, toolbar Filters button, Graph
  find box, node right-click menu, style layer, table header menu): v-p2-detours, v-p3-detours and
  v-w2-detours matched every step.

## Route 3: keyboard only

- v3-keys-sr (screen-reader mode) matched every step and ends with the Inspector reading "3 nodes
  selected" and its Summary (v3-keys-sr/11.png). Focus never fell to the page body.
- v-w3-keys (60 steps), v-p2-keys-sr and v-p2-keys matched every step.
- v-p3-keys matched to step 12; at step 13 a "Selection cleared: 3 nodes" notice with Dismiss was
  still on screen (v-p3-keys/14.png). It is the notice for the Escape the route pressed in the
  canvas two steps earlier (decided: a hand selection change switches select conditions off); the
  replay ran slower than the original walk, so the 6-second notice had not gone yet. Carried on by
  hand: F6, F6, Tab reaches "Apply installed is at most 1104537599999"; Space off, Space on: "5 of 5
  rows, 3 selected", "3 nodes selected", as recorded (v-p3-keys/17.png).

## Mismatches with the answer key

None.

## Defects

None that crash, block the task or spoil its grading. Carried from earlier passes, unchanged and
not grading-relevant: picking a number field in Add a condition returns focus to "Add a condition";
the live status says "1 edges"; the collapsed date card and its on box read a raw number
("installed is at most 1104537599999") instead of "before 2005" (v-p3-keys/15.png); the effect
control reads "Select | Hide", not the decided "Filter to | Filter out" (v1-path/09.png).

## Skipped

None for this task. The other routes in the fix list (T60 to T64, T65 A, T66 to T68) belong to
other tasks' pilots.
