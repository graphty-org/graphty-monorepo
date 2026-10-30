# T66 A pilot: leave out the site that only the delivery log names (targeted re-walk)

Build: a53beb7179 (frozen, `.study-builds/tier4-r1d3-a53beb7179`). Start: `pantries-joined.txt`
(pantries.csv with deliveries.csv joined onto it; 13 nodes, 18 edges). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T66A/ (not in git).

Of the routes the latest fixes touched, two belong to this task: the Data source card's count on
the success path, and the T68 start (the narrowed card this task leaves). The T64, T65 routes in the
list belong to those tasks' pilots. Every earlier walk of this task was replayed on this build. The
detour walks s2-detours and w2-detours and the keyboard walk s3-keys matched every check point to
the end, so their earlier findings stand. The seven that diverged were replayed into a fresh folder
of the same name, stopped where the build differs, and were carried on by hand to the end of the
recorded route: p1-path, s1-path and w1-path (success path by pointer), p2-detours (detours), and
p3-keys, s4-keys and w3-keys (keyboard). Every divergence is an expected change, not a defect:
details per walk below. No script errors, and focus never fell to the page body.

## Result

Reached, and the result matches the answer key. A Data source filter card with pantries.csv ticked
reads "12 of 13" on its chip; the top bar and the inspector read 12 of 13 nodes and 17 of 18 edges;
the routes between the kept sites stay drawn; P13 stays in the network (Full graph: 13 nodes, 18
edges; table "All" lists P13). The data stayed the task's own data the whole way.

## 1. Success path by pointer (p1-path/, s1-path/, w1-path/)

- p1-path: steps 1 to 7 matched (02.png to 08.png): Filters "+" (Add filter), type "source", Enter,
  tick pantries.csv. 05.png: chip "12 of 13", top bar "12 of 13 nodes, 17 of 18 edges", inspector
  "Nodes showing 12 of 13, Edges showing 17 of 18". Step 8 diverged only in what the pointer is
  over: the card's title strip at 168,456 is now the button "Data source" (it was an unnamed group).
  By hand: hover Hide shows the tooltip "Hide nodes that do not match" (10.png); Edges tab shows the
  P01-P02 routes (12.png); ticking deliveries.csv gives 13 of 13 and the inspector 18 of 18
  (13.png); unticking gives 12 of 13 and 17 of 18 again; Graph place and back keeps it, the card
  collapsed to "from pantries.csv" (15.png, 16.png).
- s1-path: same divergence at step 8 (09.png). By hand: the same toggles (10.png to 12.png); the
  attribute picker opens from "+" (13.png); Escape closes it; "dat" then Tab adds an unfinished
  Data source card (15.png); Escape drops the unfinished card and returns focus to "+" (16.png);
  "Remove from pantries.csv" removes the card and the counts go back to 13 and 18 (18.png); a fresh
  Data source card with pantries.csv gives 12 of 13 and 17 of 18 again (20.png).
- w1-path: matched to step 10; step 11 (Edges tab) diverged because the edge table now lists the 17
  kept routes ("17 of 18 edges") instead of none, which is the answer key's expected state
  (12.png). By hand: Nodes tab, All lists P13 (13.png); the source row's chip is "1 issue in
  deliveries.csv" (14.png).

## 2. Detours (p2-detours/, plus s2-detours and w2-detours, which matched)

p2-detours matched to step 32: removing deliveries.csv from Sources and undoing it; an id card for
P13 (Contains, leaves P13 alone, as the key says); a style layer "Node id contains P13, 1 node" with
Visibility Hidden. Step 33 diverged because a notice "Dropped the Data source condition: it was not
finished" now shows over the canvas when the Data place opens (33.png; the layer's Which nodes held
an unfinished Data source condition), and the recorded click on empty canvas landed on its Dismiss
button (34.png). By hand: a `site` "Has a value" card gives 12 of 13 and 17 of 18 (36.png, success
per the key); Control+Z undoes it with the notice "Undid adding the filter "site has a value""
(37.png); the id column's "Filter to..." (right click and the Options menu) still does nothing
(39.png, 41.png, as the key notes); the site column's "Filter to..." adds a site card; typing "Pan"
and Enter filters to 2 of 13 (43.png); Tab moves on; Shift+Tab and Escape close the suggestion list
and leave the text (45.png).

## 3. Keyboard only (p3-keys/, s4-keys/, w3-keys/, plus s3-keys, which matched)

All three diverged at the same step, Space on "pantries.csv, 12 nodes": the live region now says
"Filter on: 12 of 13 nodes, 17 edges" (it said 0 edges on the build that dropped the routes). That
is the expected state. Carried on by hand, every later step printed exactly what was recorded except
the card's chip, which `--read` now gives as "Node 12 of 13" (nodes only, as the key says) instead
of "Node 12 of 13 Edge 0 of 18" (p3-keys step 75; s4-keys step 46). Focus names along the route:
"Add filter", combobox "Find an attribute" with options named with their value ranges ("Data
source", "site, 92% have a value"), checkbox "pantries.csv, 12 nodes", checkbox "Apply from
pantries.csv", radio "Hide nodes that do not match", button "Remove from pantries.csv", button
"Data source" (expanded/collapsed), checkbox "deliveries.csv, 13 nodes", "Add a condition". Arrow
keys move the effect between Select and Hide (s4-keys/44.png selects the 12 nodes; ArrowRight back
to Hide). Enter on the checkbox does nothing, Escape leaves the card's list, Enter and Escape on the
attribute picker open and close it. Last screens: p3-keys/99.png, s4-keys/47.png, w3-keys/75.png.

## 4. T68 start (t68-start/)

Matched to the end: the narrowed start shows one Data source card (pantries.csv ticked, Hide on),
chip "12 of 13", 12 of 13 nodes and 17 of 18 edges, routes drawn (02.png).

## Mismatches between the answer key and the screen

- None against the key's counts. Against the binding decision of 2026-10-29 (a filter card's
  effects are "Select | Filter to | Filter out"), the card's effect control still reads "Select |
  Hide" with Hide on, and its screen-reader name is "Hide nodes that do not match" (p1-path/05.png,
  p3-keys route step 53). The answer key itself still says "Select | Hide". Unchanged from the last
  pass.

## Defects

None that crash, block the task or spoil its grading.

## Not walked

- The touched routes for T64, T65 and T68's own task: they belong to those tasks, not T66.
