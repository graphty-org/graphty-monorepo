# T65 A pilot, round 1 dry run 2: only the trained volunteers with 10 hours or more in the picture, staff marked

## Targeted re-pilot after the fix pass

Three sessions were walked again on the frozen build ff17391bb1, each in its own session from the task's real
start (volunteers.txt), under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T65A/. The data stayed the task's
own throughout: one source, volunteers.graphml, 24 nodes and 63 edges.

- **Success path by pointer** (`u1-path/`, replayed from `t1-path/`): all 24 steps matched, ended. Data > Add
  filter > trained > Yes; Add a condition > hours, "from" 10, Enter; Add filter > role > staff; Select. The
  top bar reads "14 of 24 nodes, 22 of 63 edges" and the inspector "4 nodes selected" with 4 rings
  (u1-path/17.png). Hours "to" 40 then Tab, 52 and Escape, the table (shown rows 14 of 24, the 4 staff rows
  highlighted) and the keep card off and on all behave as before (u1-path/20.png to 25.png).
- **Success path, the other card order** (`u2-order/`, replayed from `t2-order/`, then by hand): role > staff
  on Select first, then trained Yes and hours from 10: "14 of 24 nodes, 22 of 63 edges" and "4 nodes
  selected" (u2-order/08.png). Typing 12 in "from" and pressing Escape keeps 12 (u2-order/10.png), as
  decided ("Escape keeps edits in a card"); the counts stay 14 and 4. The keep card's on box off: all 24
  drawn, "5 nodes selected", trained Yes (4), No (1) (u2-order/11.png); on again: 14 of 24 and 4 selected
  (u2-order/12.png). The order makes no difference.
- **Selection inspector** (both walks above): unchanged. A Summary only (Nodes 4, Edges joining these
  nodes 2, Degree 3 to 8, role staff (4), hours 40 to 52, trained Yes (4)) and no node list
  (u1-path/17.png, u2-order/08.png).
- **Keyboard only** (`u3-keys/`, replayed from `s3-keys/`): all 127 steps matched, ended. Moving the role
  card to Select announces "Filter on: 14 of 24 nodes, 22 edges" and "4 nodes selected" (u3-keys/111.png).
  Focus never fell to the page body after the first step.

The other routes on the fix list (T65B, T68A/B, T64A/B) belong to other tasks and were not walked here.

Result: reached on both card orders, by pointer and by keyboard; counts 14 and 4 match the answer key.

Defect still open (would spoil grading): the role card's count chip reads "5 of 24" and its value list
"staff 5" while the card is on Select and the screen says "4 nodes selected"; a participant who reads the
marked count off the card answers 5, not 4 (u1-path/17.png, u2-order/08.png, u2-order/12.png).

## Earlier walks in this round

Build: ff17391bb1 (frozen, `.study-builds/tier4-r1d2-ff17391bb1`). Start: `volunteers.txt` (volunteers.graphml
open, 24 nodes and 63 edges, colored by PageRank). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T65A/ (not in git). The data stayed
the task's own the whole way: one source, volunteers.graphml, 24 nodes and 63 edges; the filters only took
nodes out of the picture.

## How this build was walked

Every route of the dry run 1 pilot was replayed on this build. The style layer detour (`w3-style/`, 6 steps)
matched every check point to its end, so its earlier findings stand. The other six diverged at the same
place: where the role card is switched to Select, the screen now reads "4 nodes selected" (it read 5) and the
top bar's filter button also names the edges. Each was replayed again into its own folder from the dry run 1
recording and carried on by hand to its end:

- `s1-path/` and `w1-path/`: the success path by pointer (trained card, hours condition, role card on Select).
- `s2-detours/`: the find box typing a rule, then the toolbar's filter button with the cards in the other
  order (role on Select first, then the trained and hours card), then a style layer's Which nodes that hides.
- `w2-find/`: the find box, then the cards in the other order; this replay matched to its end (16 steps).
- `s3-keys/` and `w4-keys/`: the success path by keyboard only.

## Result

Reached, on both card orders, by pointer and by keyboard. The screen matches the answer key: "14 of 24
nodes, 22 of 63 edges" in the top bar and "4 nodes selected" in the inspector, with 4 rings on the canvas
(s1-path/17.png, s2-detours/16.png, s3-keys/111.png, w4-keys/131.png). The selection inspector is unchanged:
a Summary (Nodes 4, Edges joining these nodes 2, role staff (4), trained Yes (4)) and no node list.

The selection follows the picture both ways:
- Turning the keep card off selects the fifth staff member again: "5 nodes selected", trained Yes (4), No (1),
  all 24 drawn (s1-path/24.png); turning it back on returns to 4 (s1-path/25.png).
- Deleting the keep card by keyboard announces "Filter off" and "5 nodes selected"; Control+Z announces
  "4 nodes selected" and "Filter on: 14 of 24 nodes, 22 edges" (w4-keys, steps 116 and 119).
- Narrowing hours to 10 to 40 leaves 11 of 24 and one staff member in the picture; the inspector switches
  to that one node, v21 (s1-path/20.png). Putting 52 back returns to 14 of 24 and 4 selected (21.png).

## 1. Success path by pointer (s1-path/, w1-path/)

Steps 1 to 18 matched the dry run 1 recording (Data, Add filter > trained > Yes; Add a condition > hours,
"from" 10, Enter; Add filter > role > staff; Select). From there by hand: the hours "to" box at 40 then Tab
(20.png), 52 and Escape (21.png), the table (22.png: shown rows 14 of 24, the 4 staff rows highlighted), the
keep card's on box off and on (24-25.png). Every step did what a person expects.

## 2. Detours (s2-detours/, w2-find/)

- **The find box, typing a rule**, and **the toolbar's filter button**: matched the recording, so the
  earlier findings stand.
- **The other card order** (role on Select first, then trained and hours): 14 of 24 and "4 nodes selected"
  (s2-detours/16.png, w2-find/17.png). The order makes no difference, as the answer key says.
- **A style layer's Which nodes**: "Add a layer or a folder" > Layer > Add a condition > trained (Yes, 15
  nodes) (23.png); Visibility > Hide (25.png) hides the trained nodes' spheres, leaving their edges drawn
  and the selected ones drawn as bare yellow rings; Control+Z undoes it (26.png). Not a filter; as in the
  earlier pass.

## 3. Keyboard only (s3-keys/, w4-keys/)

Every focus line after the divergence matched the earlier walk: Tab through the role card ("Apply role is
staff", "role: how to match", "volunteer, 16 nodes", "staff, 5 nodes", "board, 3 nodes", "Add a condition",
"Resize left panel"); the attribute picker ("Find an attribute"; "ho" highlights "hours, 2 to 52"); F6
cycling "Selection actions", the canvas, "Analyze", the left panel; Shift+Tab back through both cards to "Add
filter"; Escape closing the picker with focus back on "Add filter". No step left focus on the page body.

## Mismatches between the answer key and the screen

None that changes the counts. The key's wording "Hide" matches the build; `decided.md` (tier 4 data
management questions) names the effects "Select | Filter to | Filter out", and this build still shows
"Select | Hide" (s1-path/17.png). That wording does not change the result.

## Defects

1. The role card's count chip reads "5 of 24" while it is on Select and the screen says "4 nodes selected";
   its value list also reads "staff 5". A participant who reads the marked count off the card answers 5,
   not 4. (success, s1-path/17.png, s1-path/21.png; keyboard, w4-keys/131.png)

The earlier pass's other defects stand where their routes matched (the find box zoom, the table moving the
drawing, Tab in the attribute picker taking the highlighted option, s3-keys/122.png). Its defect "Select
marks nodes another card took out of the picture" is fixed on this build.
