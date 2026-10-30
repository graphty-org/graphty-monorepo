# T66 A pilot: leave out the site that only the delivery log names (targeted re-walk)

Build: a53beb7179 (frozen, `.study-builds/tier4-r1d3-a53beb7179`). Start: `pantries-joined.txt`
(pantries.csv with deliveries.csv joined onto it; 13 nodes, 18 edges). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T66A/ (not in git):
`q/` holds this task's own walks, `x/` the walks of the other routes in the re-walk list.

Every route was replayed from its newest recorded walk on this build. All 23 matched every check
point to their last step (exit 0, session ended): no divergence, no script error, no notice that
was not recorded before, and focus never fell to the page body on the keyboard walks.

## Result

Reached, and the result matches the answer key. A Data source filter card with pantries.csv ticked
reads "12 of 13" on its chip; the top bar and the inspector read 12 of 13 nodes and 17 of 18 edges;
the routes between the kept sites stay drawn; P13 stays in the network (Full graph: 13 nodes, 18
edges) (q/p1-path/05.png). The data stayed the task's own data the whole way.

## 1. Success path by pointer

q/p1-path (15 steps), q/s1-path (19), q/w1-path (13): all matched. Filters "+" (Add filter), type
"source", Enter, tick pantries.csv: chip "12 of 13", "12 of 13 nodes, 17 of 18 edges" (05.png);
ticking deliveries.csv gives 13 of 13 and 18 of 18, unticking returns 12 of 13 and 17 of 18; Graph
place and back keeps the card (p1-path/16.png). In fields: Escape closes the attribute picker,
"dat" then Tab adds an unfinished Data source card, Escape drops it and returns focus to "+"
(s1-path/15.png, 16.png). The edge table lists the 17 kept routes; Nodes, All lists P13
(w1-path/12.png, 13.png).

## 2. Detours (the same set as earlier passes)

q/p2-detours (44 steps), q/s2-detours (44), q/w2-detours (32): all matched. Removing deliveries.csv
from Sources and undoing it; an id card for P13 (leaves P13 alone, as the key says); a style layer
"Node id contains P13" with Visibility Hidden; a `site` "Has a value" card (12 of 13, 17 of 18,
success per the key) and its undo; the id column's "Filter to..." (does nothing, as the key notes);
the site column's "Filter to..." card with "Pan" typed and Enter (2 of 13); Tab, Shift+Tab and
Escape in its box (p2-detours/45.png).

## 3. Keyboard only

q/p3-keys (98 steps), q/s3-keys (18), q/s4-keys (46), q/w3-keys (74): all matched, to the end
(p3-keys/99.png, s4-keys/47.png, w3-keys/75.png). Focus names along the route: "Add filter",
combobox "Find an attribute", option "Data source", checkbox "pantries.csv, 12 nodes" (live region
"Filter on: 12 of 13 nodes, 17 edges"), checkbox "Apply from pantries.csv", radio "Hide nodes that
do not match", button "Remove from pantries.csv", button "Data source", checkbox "deliveries.csv,
13 nodes", "Add a condition"; the card's chip reads "Node 12 of 13". Enter on a checkbox does
nothing, Space toggles it, Escape leaves the list.

## 4. Routes the fixes touched

- T66A/T66B success path, the Data source card's count: unchanged, as above (q/p1-path/05.png).
- T68A/T68B starts, the narrowed card's count: q/t68-start (A, 02.png: chip "12 of 13", 12 of 13
  nodes, 17 of 18 edges, routes drawn), x/T68A_w4-start (4 steps), x/T68B_start (3 steps): matched.
- T65A success path x/T65A_r01-T65A-path (24 steps, ends 14 of 24 nodes, 25.png), the other card
  order x/T65A_r02-T65A-order (11), the keyboard walk with the chip's spoken count
  x/T65A_r03-T65A-keys (92, screen-reader mode), the undo and redo route x/T65A_r04-T65A-redo (28):
  matched.
- T65B success path x/T65B_e1-path (16 steps, ends 5 of 12 nodes with the Redo notice, 17.png), the
  keyboard and screen-reader walk x/T65B_p2-keys-sr-diverged (6), the style layer Which nodes detour
  x/T65B_w2-detours (27): matched.
- T64A success path x/T64A_s1-pointer (14 steps, edge table with trips as Weight, 15.png), the
  T64A detour x/T64A_w3-detours (31) and the T64B table role re-run detour
  x/T64B_detour-style-table (28): matched.

## Mismatches between the answer key and the screen

- None against the key's counts. Against the binding decision of 2026-10-29 (a filter card's
  effects are "Select | Filter to | Filter out"), the card's effect control still reads "Select |
  Hide" with Hide on, and its screen-reader name is "Hide nodes that do not match"
  (q/p1-path/05.png). The answer key itself still says "Select | Hide". Unchanged from the last pass.

## Defects

None that crash, block the task or spoil its grading.

## Not walked

- T65B success path in the other card order (Undo and Redo of the depth edit): the T65B pilot has
  not recorded it yet (its walk folder holds no route), so there was nothing to replay; it belongs to
  T65B's own pilot.
