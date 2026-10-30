# T65 A pilot, round 1 dry run 2: only the trained volunteers with 10 hours or more in the picture, staff marked

## Targeted re-pilot, second walk of every fix-list route on build bccf8fe47f

Build: bccf8fe47f (frozen, `.study-builds/tier4-r1d2-bccf8fe47f`), the same build as the section below. Every
route on the fix list was walked again, each in its own session from its own real start, by replaying the
walk of the same route below (z01 to z17) into new folders b01 to b17 under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T65A/. Every session was ended. The
data stayed each task's own on every walk (volunteers.graphml 24 nodes, 63 edges; gauges + flows 12 and 14;
pantries + deliveries 13 and 18). No script error was printed on any walk.

| Route | Walk | Result |
| ----- | ---- | ------ |
| T65A success path | b01-T65A-path | 24 of 24 steps matched |
| T65A, the other card order | b02-T65A-order | 11 of 11 |
| T65A keyboard walk (the chip's spoken count) | b03-T65A-keys | 127 of 127 |
| T65B success path | b04-T65B-path | 15 of 15 |
| T65B, the other card order | b05-T65B-order | 7 of 7 |
| T65B detour: a style layer's Which nodes | b06-T65B-whichnodes | 7 of 7 |
| T66A/T66B: the Data source card's count, and the source row's issue chip after it | b07-T66A-sourcecard, b08-T66B-sourcecard | 15 of 15, 17 of 17 |
| T68A/T68B starts: the narrowed Hide card's count | b09-T68A-start, b10-T68B-start | 4 of 4, 3 of 3 |
| T61A success path (Edges > With issues 1) | b11-T61A-path, b17-T61A-path-issues | 18 of 18, 18 of 18 |
| T61B success path (Edges > With issues) | b12-T61B-path | 23 of 23 |
| T61A detour: deliveries.csv first | b13-T61A-delivfirst | 7 of 7 |
| T61A keyboard walk (the Edges header's spoken issue) | b14-T61A-keys | 112 of 115, then by hand to the end |
| T67A/T67B: column issue marks in the table header | b15-T67A-header, b16-T67B-header | 5 of 5, 13 of 13 |

Every matched route shows what the walk it replayed showed, so the findings below stand unchanged. The
key screens were looked at again:

- T65A success path: "14 of 24 nodes, 22 of 63 edges", "4 nodes selected", 4 rings, the 4 staff rows
  highlighted; the role card's chip reads "5 of 24" (b01-T65A-path/25.png).
- T65A keyboard: ArrowLeft onto Select announces "Filter on: 14 of 24 nodes, 22 edges" and "4 nodes
  selected" (b03-T65A-keys/111.png); no focus line names the role card's own count. Focus never fell to the
  page body.
- T65B success path: "5 of 12 nodes, 2 of 14 edges", "3 nodes selected" (G01, G02, G09); the installed card's
  chip reads "5 of 12" (b04-T65B-path/09.png).
- T61A keyboard: the walk differed only at step 113, where browse mode still read the "Redid joining
  deliveries.csv." notice and its Dismiss button (the notice had not yet gone); the screen and focus were
  otherwise the same. Carried on by hand: Escape returns focus to "Target, sorted ascending", ArrowDown to
  rowheader "P13" (b14-T61A-keys/114.png to 116.png).

Mismatch between the answer key and the screen: T65 "Card counts" says A's role card reads "4 of 14" and B's
installed card "3 of 5" while on Select; the build reads "5 of 24" and "5 of 12" (b01-T65A-path/25.png,
b02-T65A-order/08.png, b04-T65B-path/09.png, b05-T65B-order/06.png).

Defects (unchanged): 1. the Select card's chip counts over the whole graph, not what it marks (would spoil
grading for a participant who reads the count off the card); 2. that chip has no accessible name and is not
in the focus order (b03-T65A-keys/111.png); 3. focus on the Edges table's Target header does not speak its
issue (b14-T61A-keys/111.png).

Skipped: nothing on the list.


## Targeted re-pilot: every route on the fix list, build bccf8fe47f

Build: bccf8fe47f (frozen, `.study-builds/tier4-r1d2-bccf8fe47f`). Every route on this pass's fix list was
walked, each in its own session from that route's own real start, by replaying the newest walk of the same
route on this build. Walk folders are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T65A/ (z01 to z17). Every
replay but one matched every check point to its end (exit 0) and ended, so the build behaves on each route as the
walk it replayed recorded; the key screenshots below were looked at again. The data stayed each task's own
on every walk (volunteers.graphml 24 nodes, 63 edges; gauges + flows 12 and 14; pantries + deliveries 13
and 18).

| Route | Walk | Replayed from | Result |
| ----- | ---- | ------------- | ------ |
| T65A success path | z01-T65A-path | T65A/v1-path | 24 of 24 steps matched |
| T65A, the other card order | z02-T65A-order | T65A/v2-order | 11 of 11 |
| T65A keyboard walk (the chip's spoken count) | z03-T65A-keys | T65A/v3-keys | 127 of 127 |
| T65B success path | z04-T65B-path | T65B/a1-path | 15 of 15 |
| T65B, the other card order | z05-T65B-order | T65B/a4-order | 7 of 7 |
| T65B detour: a style layer's Which nodes | z06-T65B-whichnodes | T65B/a2-detour-which-nodes | 7 of 7 |
| T66A/T66B: the Data source card's count | z07-T66A-sourcecard, z08-T66B-sourcecard | T66A/w1-path, T66B/success | 15 of 15, 17 of 17 |
| T68A/T68B starts: the narrowed Hide card's count | z09-T68A-start, z10-T68B-start | T68A/w4-start, T68B/r5-start | 4 of 4, 3 of 3 |
| T61A success path (Edges > With issues 1) | z11-T61A-path, z17-T61A-path-issues | T61A/w1-success, T61A/w2-success | 18 of 18, 18 of 18 |
| T61B success path (Edges > With issues) | z12-T61B-path | T61B/e1-success | 23 of 23 |
| T61A detour: deliveries.csv first | z13-T61A-delivfirst | T61A/d9-deliveries-first | 7 of 7 |
| T61A keyboard walk (the Edges header's spoken issue) | z14-T61A-keys | T61A/k3-keyboard | 105 of 113 matched, then by hand to the end |
| T67A/T67B: column issue marks in the table header | z15-T67A-header, z16-T67B-header | T67A/x2c-header, T67B/x2a-detour-table-marks | 5 of 5, 13 of 13 |
| T66A/T66B: the source row's issue chip after the Data source card | z07, z08 (their last steps) | as above | matched |

### What the screens show

- **T65A success path** (z01): "14 of 24 nodes, 22 of 63 edges", "4 nodes selected", 4 rings; the table
  highlights the 4 staff rows (z01-T65A-path/25.png). The role card's chip reads "5 of 24".
- **T65A, other order** (z02): role on Select first, then trained Yes and hours from 10: 14 of 24 and 4
  selected (z02-T65A-order/08.png); the role card's chip again "5 of 24".
- **T65A keyboard** (z03): ArrowLeft onto Select announces "Filter on: 14 of 24 nodes, 22 edges" and "4
  nodes selected" (step 110, z03-T65A-keys/111.png). The role card's count chip is not in the focus order
  and has no name of its own in the accessibility tree, so no count is spoken for the card itself; a
  screen reader hears 4 only from the live status and the inspector heading. Focus did not fall to the
  page body after the first step (the start has nothing focused, as setups end).
- **T65B success path** (z04): "5 of 12 nodes, 2 of 14 edges", "3 nodes selected", G01, G02, G09
  highlighted (z04-T65B-path/09.png). The installed card's chip reads "5 of 12" while it marks 3.
- **T65B, other order** (z05): installed on Select first, then telemetry yes and depth_cm from 70: 5 of 12
  and "3 nodes selected" (z05-T65B-order/06.png); installed chip "5 of 12".
- **T65B style layer detour** (z06): Which nodes "installed before 2005, 5 nodes", "5 of 12 nodes", every
  gauge stays drawn (z06-T65B-whichnodes/06.png). Unchanged, as listed.
- **T66A Data source card** (z07): "12 of 13 nodes, 17 of 18 edges", card chip "12 of 13", inspector 12 of
  13 and 17 of 18; the Nodes table on All still lists P13 (z07-T66A-sourcecard/09.png, 16.png). The
  source row's issue chip after the card: named "1 issue in deliveries.csv", drawn whole after the counts
  13 and 18 (z07-T66A-sourcecard/16.png).
- **T66B Data source card** (z08): "11 of 12 nodes, 13 of 14 edges", chip "11 of 12"
  (z08-T66B-sourcecard/07.png); issue chip "1 issue in flows.csv".
- **T68A start** (z09): "12 of 13 nodes, 17 of 18 edges", Data source card on Hide, chip "12 of 13",
  nothing selected (z09-T68A-start/01.png). **T68B start** (z10): "11 of 12 nodes, 13 of 14 edges", chip
  "11 of 12" (z10-T68B-start/01.png). As the answer key says.
- **T61A success path** (z11, z17): the join screen, Join, Overview 13 nodes and 18 edges, "From 2 files";
  the deliveries.csv row reads 13 and 18 with the issue chip "1" (z11-T61A-path/12.png). Edges >
  With issues 1 leaves one row, P05 -> P13, 4 trips, with the warning mark on Target and P13 drawn in
  the warning color; the mark is named "Issues in Target" (z17-T61A-path-issues/17.png). Nodes > With
  issues 2 (19.png).
- **T61B success path** (z12): Overview 12 nodes, 14 edges (z12-T61B-path/13.png); Edges > With issues 1
  leaves one row, G09 -> G12, with the warning mark on Target and G12 drawn in the warning color
  (z12-T61B-path/23.png), as decided ("An issue's mark is on what has the problem").
- **T61A, deliveries.csv first** (z13): 13 nodes, 19 edges, "1 repeated edge"; Edges > With issues 1 shows
  P03 -> P10 with the mark on "from", and the mark opens "1 repeated edge" with Keep, Merge, Ignore, Show
  rows, Ignore all (z13-T61A-delivfirst/05.png, 06.png). The counts are that network's own, as the key
  says.
- **T61A keyboard** (z14, screen-reader mode): steps 1 to 105 matched (join by keyboard, the issue chip's
  list, undo and redo of the join). Step 106 differed: the "Redid joining deliveries.csv." notice was still
  on screen, so its "Dismiss" button took one of the 15 Tabs and the walk stopped one control short, on
  "With issues 1" instead of "Columns: 3 of 3" (z14-T61A-keys/107.png). That is the notice's own button in
  the tab order while it shows, not a defect. Carried on by hand: Space checks "With issues 1" (one row,
  P05 -> P13); Tab from the table's controls runs Columns, Table options, Maximize, Close, "Key Source",
  then leaves the table for "From 2 files"; Shift+Tab and ArrowRight reach the Target header, whose name
  is "Target, sorted ascending" and whose description is empty: focus on it says nothing about the issue
  (`--expect described=issue` failed, z14-T61A-keys/111.png). Browse mode reads the header row as "...
  Target, sorted ascending Issues in Target Options for Target ...", and Shift+F10 on the header opens a
  menu headed "1 unknown end" with Add nodes (checked), Leave out, Ignore, Show rows, then Hide, Hide
  others, Sort (113.png). Escape returns focus to the header; ArrowDown goes to the row (rowheader "P13",
  116.png). Reached; the session was ended.
- **T67A header marks** (z15): warning marks on families and site; site's mark opens "1 value with padded
  spaces" with Trim, Ignore, Show rows, Ignore all (z15-T67A-header/03.png); after Trim the site mark is
  gone and the chip reads 1 (06.png).
- **T67B header marks** (z16): depth_cm's mark opens "1 not a number" with Make blank, Ignore, Show rows,
  Ignore all (z16-T67B-header/03.png); the route matched to its end.

### Mismatches between the answer key and the screen

- T65 "Card counts": the key says A's role card reads "4 of 14" and B's installed card "3 of 5" while on
  Select; this build reads "5 of 24" (A) and "5 of 12" (B), in both card orders (z01-T65A-path/25.png,
  z02-T65A-order/08.png, z04-T65B-path/09.png, z05-T65B-order/06.png). The selected counts, 4 and 3,
  match.

### Defects

1. The Select card's chip counts over the whole graph, not what it marks: "5 of 24" with "4 nodes
   selected" (A), "5 of 12" with "3 nodes selected" (B). A participant who reads the marked count off the
   card answers 5, not 4 (or 3). Would spoil grading. (T65A and T65B success paths and other orders;
   screenshots above.)
2. The Select card's count chip has no accessible name and is not reachable by keyboard, so a screen
   reader never hears the card's own count (T65A keyboard walk, z03-T65A-keys/111.png).
3. Focus on the Edges table's Target header does not speak its issue: the header's name is "Target,
   sorted ascending" and its description is empty, so a screen-reader user tabbing or arrowing through the
   header row hears no "1 unknown end" until opening its menu (Shift+F10) or reading the row in browse
   mode. Does not block T61: the issue chip on the source row names "1 unknown end" by keyboard. (T61A
   keyboard walk, z14-T61A-keys/111.png.)

Nothing crashed or blocked on any route; no script errors were printed. The T61, T66, T67 and T68 routes
give the answer key's counts.

Skipped: nothing on the list. The detour set and keyboard walk of T65A were walked as the listed routes
(other card order, keyboard); the find-box and toolbar-filter detours of the earlier pass were not on this
list and were not walked again.

## Targeted re-pilot on build bccf8fe47f

Build: bccf8fe47f (frozen, `.study-builds/tier4-r1d2-bccf8fe47f`). Start: `volunteers.txt`. Walks under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T65A/, each its own session. The
data stayed the task's own throughout: one source, volunteers.graphml, 24 nodes and 63 edges.

On this build the change that made the Select card's chip count only what is in the picture is NOT
present: it was reverted before the freeze (see `rejected-fixes.md`). The build's one new change makes a
redone filter change select among what it leaves visible.

- **Success path by pointer** (`v1-path/`, replayed from `u1-path/`): all 24 steps matched, ended. The top
  bar reads "14 of 24 nodes, 22 of 63 edges" and the inspector "4 nodes selected" with 4 rings
  (v1-path/17.png). Keep card off: "5 nodes selected", all 24 drawn (v1-path/24.png); on again: 14 of 24
  and 4 selected (v1-path/25.png).
- **Success path, the other card order** (`v2-order/`, replayed from `u2-order/`): all 11 steps matched,
  ended. Role on Select first, then trained Yes and hours from 10: 14 of 24 and "4 nodes selected"
  (v2-order/08.png); keep card off 5, on 4 (v2-order/11.png, 12.png). The order makes no difference.
- **Keyboard only** (`v3-keys/`, replayed from `u3-keys/`): all 127 steps matched, ended. Moving the role
  card to Select announces "Filter on: 14 of 24 nodes, 22 edges" and "4 nodes selected" (v3-keys/111.png).
  The role card's count chip has no name of its own in the accessibility tree, so a screen reader hears
  the selection count (4) only from the live status and the inspector heading. Focus never fell to the
  page body after the first step.
- **Undo and redo of the keep card** (`v4-redo/`, the success path replayed and carried on by hand):
  Control+Z turns the keep card off ("5 nodes selected"); Control+Shift+Z turns it back on: "Redid turning
  on the filter", 14 of 24 and "4 nodes selected", 4 rings (v4-redo/27.png). Undo twice and redo twice
  land on 14 of 24 and 4 selected again (v4-redo/29.png). The redo fix holds on this route.

Result: reached on both card orders, by pointer and by keyboard; the screen's counts, 14 in the picture
and 4 selected, match the answer key.

Mismatch between the answer key and the screen: the key's "Card counts" says the role card's chip reads
"4 of 14" while on Select; on this build it reads "5 of 24", and its value list "staff 5", in both orders
(v1-path/17.png, v1-path/25.png, v2-order/08.png, v4-redo/27.png). With the keep card off the chip reads
"5 of 24", as the key says (v1-path/24.png).

Defect still open (would spoil grading): a participant who reads the marked count off the role card
answers 5, not 4, while the inspector says "4 nodes selected" (same screenshots).

Seen on the keyboard walk, also on every earlier keyboard walk: Control+A pressed while focus is on the
hours range slider selects every node in the picture ("15 nodes, 25 edges selected", v3-keys/73.png);
the role card on Select replaces that selection later, so the result is not affected.

The other routes on the fix list (T65B, T66A/B, T67A/B, T68A/B, T61A/B) belong to other tasks and were
not walked here.

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
