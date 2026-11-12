# T66 B pilot: leave out the gauge that only the stretch list names (targeted re-walk)

Build: 037e96e9bb (frozen, `.study-builds/tier4-r1d1-037e96e9bb`). Start: `gauges-joined.txt`
(gauges.csv with flows.csv joined onto it; 12 nodes, 14 edges). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T66B/ (not in git).

This pass walked only the success path by pointer and the task's own start, the routes the latest
fixes touched for this task. The detours and the keyboard walk were not repeated.

## Result

Reached, and the result matches the answer key. A Data source filter card with gauges.csv ticked
reads "11 of 12" on its chip; the top bar and the inspector read 11 of 12 nodes and 13 of 14 edges;
the stretches between the kept gauges stay drawn; G12 stays in the network (the table's All view
lists it). The data stayed the task's own data the whole way.

## 1. The start (start-3/)

- 01.png, 02.png: Data place; Sources lists gauges.csv (11) and flows.csv (12 nodes, 14 edges, 1
  issue); inspector Nodes 12, Edges 14, Components 1. The Edges table lists G09 -> G12 (4 km), the
  one stretch that reaches the gauge only flows.csv names.

## 2. Success path by pointer (success-3/)

Replayed the earlier walk of this build's success path; every one of its 17 steps matched the screen.

1. 03.png, 04.png: Filters "+" (Add filter) opens the attribute picker; Data source is in it.
2. 05.png: Data source adds a card with one box per source (gauges.csv 11, flows.csv 12).
3. 07.png: ticking gauges.csv: chip "11 of 12", top bar "11 of 12 nodes, 13 of 14 edges", inspector
   "Nodes showing 11 of 12, Edges showing 13 of 14"; the drawing keeps every stretch but G09 -> G12.
4. 15.png: the Edges table (Shown) reads 13 of 14 edges.
5. 16.png: ticking flows.csv too shows 12 of 12 and 14 of 14 (top bar "12 of 12 nodes").
6. 17.png, 18.png: flows.csv unticked again; the Nodes table's All view lists G12 with no values, so
   it is still in the network: the success state.

Hover checks (unchanged from the earlier walk of this build): the issue chip "1 issue in flows.csv"
has no tooltip (02.png); the card's name has no tooltip (10.png); the Hide segment's tooltip is
"Hide nodes that do not match" (13.png); the on box's is "Apply from gauges.csv" (12.png).

## Mismatches between the answer key and the screen

- The card's effect control reads "Select | Hide" with Hide on (07.png). The binding decision of
  2026-10-29 names a filter card's effects "Select | Filter to | Filter out", a new card starting on
  Filter out. The route still reaches the right counts; only the words differ from the decision.

## Defects

None that crash, block the task or spoil its grading on this route.

## Not walked

The task's detours (removing the second source, a card on the id column, a style layer that fades
the node) and the keyboard-only walk: this targeted pass covers only the routes the fixes touched.
