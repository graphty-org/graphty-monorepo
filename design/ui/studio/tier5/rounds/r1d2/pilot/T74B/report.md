# T74 B pilot -- dry run 2 (targeted re-pilot)

Build: d3fda9f2b6 (served from `.study-builds/tier5-r1d2-d3fda9f2b6`). Start: setup
`gauges-clean.txt` (the gauges project, 11 gauges, 13 routes, no layer of the participant's own).

## Scope

This pass re-walks the pointer success path and the routes the latest fixes touched that belong to
this task. The fixes changed how Cancel and Undo treat new and existing filter cards and how a
setup start leaves the undo history. T74 B builds a style layer's Which nodes step and its Fill and
never opens a filter card, so of the touched routes only the setup start is on its route. Walks
from an earlier build that sat in this pass's folder were moved to `old-47c95a09fc`.

## Success path by pointer

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T74B/success (replayed from the previous pass's walk: all 15 steps matched; the start, the
Which nodes step, the finished fill and the reopened step were looked at).

1. + > Layer; Which nodes; type "between"; Enter: Betweenness: Bridging, By value.
2. The mode select; By position; type 3; Enter: "Betweenness: Bridging top 3", 3 of 11, the
   table of matches lists G02 Mill Pond, G03 Cedar Bend, G04 Fox Creek; "No match 8"
   (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T74B/success/09.png).
3. Done; Fill +; type FF8C00; Enter: the three gauges are drawn orange, the others keep their
   color, key card "Color: Layer 1, 3 of 11 nodes" (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T74B/success/12.png).
4. Field checks in the hex box: Ctrl+A, 00FF00, Escape puts FF8C00 back; Tab moves on; reopening
   Which nodes and Escape leaves it at 3 of 11 (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T74B/success/16.png).

The data stayed the gauges' own data throughout (11 nodes, 13 edges, the same stations).

Result: reached, by the answer key's route step for step.

## Setup start (touched route 9)

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T74B/touched-9.

- After the setup the Undo button is off and its tooltip reads "Nothing to undo"
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T74B/touched-9/02.png).
- Ctrl+Z, then Ctrl+Shift+Z, on the canvas change nothing: still 11 gauges by station, Stone
  Weir's depth blank, installed read as dates (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T74B/touched-9/04.png).
- The participant's own step still undoes: + > Layer, then Undo, says "Undid adding Layer 1." and
  Undo is off again ("Nothing to undo"), with the setup's work intact (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T74B/touched-9/06.png).

## Mismatches with the answer key

None. The answer key's notes still hold: the mode select is named "Betweenness test", not by what
it shows, so it is opened by clicking the box; the third orange gauge sits partly under the canvas
toolbar.

## Defects

None that crashes, blocks the task or spoils its grading. The setup's log records one failed
request, a sample thumbnail (venice-transit.webp) from graphty.app blocked by the browser while the
empty start screen showed before the setup opened the file; the participant never sees that screen.
