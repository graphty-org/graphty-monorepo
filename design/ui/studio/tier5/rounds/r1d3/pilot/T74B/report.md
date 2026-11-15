# T74 B pilot -- dry run 3 (targeted re-pilot)

Build: c3100058ab (served from `.study-builds/tier5-r1d3-c3100058ab`). Start: setup
`gauges-clean.txt` (the gauges project, 11 gauges, 13 routes, no layer of the participant's own).

## Scope

This pass re-walks only the pointer success path and any route the latest fixes touched that
belongs to this task. Every touched route on the list belongs to another task (new or existing
filter cards with Cancel, Undo and Done, the Quick actions card, the 50,000-node graphs); none is
on T74 B's route, which builds a style layer's Which nodes step and its Fill and never opens a
filter card. So the success path is the only walk.

## Success path by pointer

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T74B/success
(replayed from the previous pass's walk; all 15 steps matched, and every screenshot was looked at).

1. + > Layer; Which nodes; type "between"; Enter: the step reads Betweenness: Bridging, By value,
   0 to 25, 11 of 11 (05.png).
2. The mode select; By position; type 3; Enter: "Betweenness: Bridging top 3", 3 of 11, the table
   of matches lists G02 Mill Pond, G03 Cedar Bend, G04 Fox Creek; "No match 8" (09.png).
3. Done: Layer 1 shows 3 in the list, the step reads "Betweenness: Bridging top 3" (10.png).
4. Fill +; type FF8C00; Enter: the three gauges are drawn orange, the others keep their color,
   key card "Color: Layer 1, 3 of 11 nodes" (12.png).
5. Field checks in the hex box: Ctrl+A, 00FF00, Escape puts FF8C00 back (13.png); Tab moves on
   (14.png); reopening Which nodes and Escape leaves it at 3 of 11 (16.png).

The data stayed the gauges' own data throughout (11 nodes, 13 edges, the same stations).

Result: reached, by the answer key's route step for step.

## Mismatches with the answer key

None. The answer key's own notes still hold: the mode select is named "Betweenness test", not by
what it shows, so it is opened by clicking the box (step 6, at 1040,190); and the third orange
gauge sits partly under the canvas toolbar (12.png), as already recorded.

## Defects

None that crashes, blocks the task or spoils its grading.
