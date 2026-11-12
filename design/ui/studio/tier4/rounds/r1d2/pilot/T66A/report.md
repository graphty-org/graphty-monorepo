# T66 A pilot: leave out the site that only the delivery log names (targeted re-walk)

Build: a53beb7179 (frozen, `.study-builds/tier4-r1d3-a53beb7179`). Start: `pantries-joined.txt`
(pantries.csv with deliveries.csv joined onto it; 13 nodes, 18 edges). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T66A/ (not in git).

Of the routes the latest fixes touched, two belong to this task, and both lie on its success path:
the Data source card's count, and the source row's issue chip after the Data source card is added.
The T68 start (the narrowed Hide card, the state this task leaves) was replayed as well. The other
routes in the list belong to the T61, T65, T67 and T68 pilots. Each walk was its own session,
replayed from the newest recorded walk of the same route on this build, and both matched every
check point to their last step (exit 0, session ended).

## Result

Reached, and the result matches the answer key. A Data source filter card with pantries.csv ticked
reads "12 of 13" on its chip; the top bar reads "12 of 13 nodes, 17 of 18 edges"; the inspector
reads Nodes showing 12 of 13, Edges showing 17 of 18; the routes between the kept sites stay drawn;
P13 stays in the network (Full graph: 13 nodes, 18 edges). The data stayed the task's own data the
whole way.

## 1. Success path by pointer (i1-path/)

All 15 steps matched.

1. 02.png to 04.png: Filters "+" (Add filter), type "source", Enter adds the Data source card.
2. 05.png: tick pantries.csv. Card chip "12 of 13" (nodes only), top bar "12 of 13 nodes, 17 of 18
   edges", inspector 12 of 13 and 17 of 18. The deliveries.csv source row keeps its warning mark
   and issue count "1" after the card is added; pantries.csv's row shows its node count "12".
3. 06.png to 11.png: hover checks on the card and its controls.
4. 12.png to 14.png: Edges tab; ticking deliveries.csv shows every node and edge; unticking it
   returns 12 of 13 and 17 of 18.
5. 15.png, 16.png: Graph place and back to Data; the card is kept (collapsed, "from
   pantries.csv"), the state stays 12 of 13 nodes, 17 of 18 edges, and the edge table lists the
   kept routes with "With issues 1".

## 2. T68 start (i4-t68-start/)

Matched (02.png): one Data source card (pantries.csv ticked, Hide on), chip "12 of 13", no select
card, 12 of 13 nodes and 17 of 18 edges, routes drawn, the deliveries.csv row's issue count "1".

## Mismatches between the answer key and the screen

- None against the key's counts. Against the binding decision of 2026-10-29 (a filter card's
  effects are "Select | Filter to | Filter out"), the card's effect control still reads "Select |
  Hide" with Hide on (i1-path/05.png); the answer key itself still says "Select | Hide". Unchanged
  from the last pass.

## Defects

None that crash, block the task or spoil its grading.

## Not walked

- The touched routes for T61A, T61B, T65A, T65B and T67A/T67B: they belong to those tasks' pilots,
  not to T66.
- The detour and keyboard walks: a targeted re-walk walks only the success path and the touched
  routes of this task; the last pass's detour and keyboard walks of this task on this build matched
  to the end.
