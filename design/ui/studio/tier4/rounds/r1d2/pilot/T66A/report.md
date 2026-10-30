# T66 A pilot: leave out the site that only the delivery log names (targeted re-walk)

Build: ff17391bb1 (frozen, `.study-builds/tier4-r1d2-ff17391bb1`). Start: `pantries-joined.txt`
(pantries.csv with deliveries.csv joined onto it; 13 nodes, 18 edges). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T66A/ (not in git).

Of the routes the latest fixes touched, only the T68 start belongs here: it is the state this task
leaves (a Data source card that keeps pantries.csv). The others belong to T64 and T65. This pass
walked the success path by pointer, the detour walk, the keyboard walk and the T68 start, each its
own session, each replayed from the newest earlier walk of the same route on this build. Every
check point of every route matched to the end, and the key screenshots were looked at again.

## Result

Reached, and the result matches the answer key. A Data source filter card with pantries.csv ticked
reads "12 of 13" on its chip; the top bar and the inspector read 12 of 13 nodes and 17 of 18 edges;
the routes between the kept sites stay drawn; P13 stays in the network (Full graph: 13 nodes, 18
edges). The data stayed the task's own data the whole way.

## 1. Success path by pointer (c1-path/)

All 17 steps matched.

1. 02.png to 04.png: Filters "+" (Add filter), type "source", Enter adds the Data source card.
2. 05.png: ticking pantries.csv: chip "12 of 13", top bar "12 of 13 nodes, 17 of 18 edges",
   inspector "Nodes showing 12 of 13, Edges showing 17 of 18".
3. 07.png to 10.png: hover checks on the card.
4. 11.png to 13.png: Edges tab; ticking deliveries.csv shows 13 of 13 and 18 of 18; unticked again.
5. 14.png to 18.png: Graph place and back; the state stays 12 of 13 nodes, 17 of 18 edges (18.png).

## 2. Detours (c2-detours/)

All 44 steps matched: removing deliveries.csv from Sources and undoing it; an id card for P13
(leaves P13 alone, 1 of 13, as the key says); a `site` "Has a value" card; a style layer hiding
P13; the table's "Filter to..." on id and on site, with Enter, Tab and Escape in its text field
(43.png to 45.png). No script errors.

## 3. Keyboard only (c3-keys/)

All 56 steps matched: Tab to Filters "+", Enter, type "source", ArrowDown, Enter, Space on
pantries.csv, then Tab and Shift+Tab through the card and Enter / Escape on its controls. 27.png:
after Space the screen reads 12 of 13 nodes, 17 of 18 edges. Focus never fell to the page body
after the start (where nothing has focus by design).

## 4. T68 start (c4-t68-start/)

Matched: the narrowed start shows one Data source card (pantries.csv ticked, Hide on), no select
card, 12 of 13 nodes and 17 of 18 edges, routes drawn (02.png).

## Mismatches between the answer key and the screen

- The card's effect control reads "Select | Hide" with Hide on (c1-path/05.png). The binding
  decision of 2026-10-29 names a filter card's effects "Select | Filter to | Filter out". The route
  still reaches the right counts; only the words differ from the decision.

## Defects

None that crash, block the task or spoil its grading.

## Not walked

- The touched routes for T64 and T65 listed for this pass: they belong to those tasks, not T66.
