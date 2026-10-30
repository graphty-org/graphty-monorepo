# T66 A pilot: leave out the site that only the delivery log names (targeted re-walk)

Build: bccf8fe47f (frozen, `.study-builds/tier4-r1d2-bccf8fe47f`). Start: `pantries-joined.txt`
(pantries.csv with deliveries.csv joined onto it; 13 nodes, 18 edges). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T66A/ (not in git).

Of the routes the latest fixes touched, three belong to this task: the Data source card's count on
the success path, the source row's issue chip after the Data source card (also on the success
path), and the T68 start (the narrowed card this task leaves). The others belong to the T61, T65,
T67 and T68 pilots. This pass walked the success path by pointer, the detour walk, the keyboard
walk and the T68 start, each its own session (g1 to g4), each replayed from the newest earlier walk
of the same route. Every check point of every route matched to the end, no script errors, and the
key screenshots were looked at again.

## Result

Reached, and the result matches the answer key. A Data source filter card with pantries.csv ticked
reads "12 of 13" on its chip; the top bar and the inspector read 12 of 13 nodes and 17 of 18 edges;
the routes between the kept sites stay drawn; P13 stays in the network (Full graph: 13 nodes, 18
edges). The data stayed the task's own data the whole way.

## 1. Success path by pointer (g1-path/)

All 17 steps matched.

1. 02.png to 04.png: Filters "+" (Add filter), type "source", Enter adds the Data source card.
2. 05.png: ticking pantries.csv: card chip "12 of 13" (nodes only, unchanged), top bar "12 of 13
   nodes, 17 of 18 edges", inspector "Nodes showing 12 of 13, Edges showing 17 of 18". The
   deliveries.csv source row keeps its issue chip "1" (warning mark) after the card is added
   (unchanged); pantries.csv's row shows only its node count "12".
3. 07.png to 10.png: hover checks on the card.
4. 11.png to 13.png: Edges tab; ticking deliveries.csv shows 13 of 13 and 18 of 18; unticked again.
5. 14.png to 18.png: Graph place and back; the state stays 12 of 13 nodes, 17 of 18 edges (18.png).

## 2. Detours (g2-detours/)

All 44 steps matched: removing deliveries.csv from Sources and undoing it; an id card for P13
(leaves P13 alone, 1 of 13, as the key says); a `site` "Has a value" card (12 of 13, 36.png); a
style layer hiding P13 (Which nodes "Node id contains P13, 1 node", Visibility Hidden); the table's
"Filter to..." on id and on site, with Enter, Tab and Escape in its text field (43.png to 45.png).

## 3. Keyboard only (g3-keys/)

All 56 steps matched: Tab to Filters "+", Enter, type "source", ArrowDown, Enter, Space on
"pantries.csv, 12 nodes", then Tab and Shift+Tab through the card and Enter / Escape on its
controls. After Space (27.png) the live region says "Filter on: 12 of 13 nodes, 17 edges" and the
screen reads 12 of 13 nodes, 17 of 18 edges. The source row's issue chip is reached by Tab as "1
issue in deliveries.csv" (12.png). Focus never fell to the page body after the start (where nothing
has focus by design).

## 4. T68 start (g4-t68-start/)

Matched: the narrowed start shows one Data source card (pantries.csv ticked, Hide on), chip "12 of
13", no select card, 12 of 13 nodes and 17 of 18 edges, routes drawn (02.png).

## Mismatches between the answer key and the screen

- None against the key. Against the binding decision of 2026-10-29 (a filter card's effects are
  "Select | Filter to | Filter out"), the card's effect control still reads "Select | Hide" with
  Hide on (g1-path/05.png); the key itself still says "Select | Hide". The route reaches the right
  counts; only the words differ from the decision.

## Defects

None that crash, block the task or spoil its grading.

## Not walked

- The touched routes for T61, T65, T67 and T68 itself: they belong to those tasks, not T66.
