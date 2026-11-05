# Pilot: T65 B (gauges + flows, tidied), targeted re-pilot

Build: 79ed770292 (frozen, served from .study-builds/tier4-r1d3-79ed770292). Start: the setup
`rounds/tier-4/setups/gauges-tidy.txt` (gauges.csv joined with flows.csv, Stone Weir's bad depth
made blank, `installed` read as dates); w1-path starts from `gauges-joined.txt` and makes those two
changes by hand. Screenshots under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T65B/ (git ignores them).
The data stayed the task's own on every walk: 12 gauges, 14 edges, the table's dates and depths as
in the file.

## Result

Reached, and the screen gives the answer key's counts: **5 of 12** gauges in the picture (G01, G02,
G04, G09, G11) and **"3 nodes selected"** (G01, G02, G09), with 3 rings and 3 highlighted rows. The
installed (Select) card's chip now reads **3 of 5** and the keep card's **5 of 12**, in either card
order; a screen reader hears "Node 3 of 5" for the installed card, "5 of 5 rows, 3 selected" and
"3 nodes selected". Keep card off: the installed chip reads 5 of 12 and 5 are selected; on again:
3 of 5 and 3. Nothing crashed, blocked the task or gave a wrong count on any walk.

## Route 1: success path by pointer (k1-path, replay of g1-path)

Matched the earlier walk to step 9; step 10 differed only where the fix landed: the installed card's
chip now reads "Node 3 of 5" (was "Node 5 of 12"). Carried on by hand.

- 06-08: keep card 5 of 12; the installed card opens on Before with the box focused; 2005, Enter:
  3 of 12 while it hides.
- 09-10: Select: top bar "5 of 12 nodes, 2 of 14 edges", inspector "3 nodes selected", chips 5 of 12
  and 3 of 5 (k1-path/09.png).
- 11-13: in the date box Tab moves to Add a condition (11.png); Escape keeps the card and puts focus
  on its on box (decided) (12.png); Enter applies.
- 14-15: keep card off: 5 selected, installed chip 5 of 12, all 12 drawn (14.png); back on: 3 of 5,
  "3 nodes selected" (15.png).
- 16-17: Undo and Redo of turning the keep card on: 5 selected, then 3 again, chip 3 of 5 (16.png,
  17.png).

## Route 2: the other card order, with Undo and Redo of the depth edit (k2-order, replay of f2-order)

Every check point matched. installed first (Select), then telemetry + depth_cm 70: chips 3 of 5 and
5 of 12, "3 nodes selected", top bar 5 of 12 (k2-order/06.png). Undo of the depth edit: depth back
to 48, 6 of 12, installed chip 3 of 6, still 3 selected (07.png). Redo: 70, 5 of 12, 3 of 5, 3
selected (08.png).

## Route 3: keyboard and screen-reader walk (k3-keys-sr, replay of f3-keys-sr)

Matched to step 11; step 12 differed only by the fix: `--read` of the Filters now gives "Node 3 of
5" for the installed card. Focus never fell to the page body after the start. Live messages: "Filter
on: 7 of 12 nodes, 3 edges", "6 of 12", "5 of 12 nodes, 2 edges", "3 of 12 nodes, 1 edges" while
hiding, then on Select "Filter on: 5 of 12 nodes, 2 edges", "5 of 5 rows, 3 selected", "3 nodes
selected". F6 to the Inspector reads "3 nodes selected" and its Summary (k3-keys-sr/11.png).
Tabbing through the installed card by hand afterwards: Remove, header, radio Select, on box, how to
match, date box, in order; Escape on the how-to-match box goes to the on box (k3-keys-sr/14.png).

## Route 4: detour, a style layer's Which nodes (k4-which-nodes, replay of f4-which-nodes)

Every check point matched: "installed before 2005, 5 nodes", Which nodes "5 of 12 nodes", the layer
row counts 5, every gauge stays drawn (k4-which-nodes/08.png). As the key says; not success.

## Earlier walks that diverged on this build, walked again

All six diverged where `installed` now opens as a date (Before / After) instead of text (Contains /
Starts with), and where the top bar now names edges. Each was replayed to that point and carried on
by hand to the end of the task.

- p2-path: how to match lists Before, After, Between, Has a value, Has no value (p2-path/10.png);
  2005, Enter: 3 of 12 (11.png); Select: 5 of 12, 3 of 5, "3 nodes selected" (12.png).
- p3-path: the same to Select (10.png); a click on the empty canvas clears the selection and turns
  the installed card off, as decided (11.png); the Graph inspector's "Time: installed > Set in
  Data" adds the time window button and the column's Time tag, counts unchanged (12.png).
- w1-path (from gauges-joined, Make blank and Type > date by hand first): installed opens as a date,
  2005, Select: 5 of 12, 3 of 5, "3 nodes selected" (w1-path/14.png).
- p2-keys-sr: the date box, 2005, Enter; Shift+Tab to Hide, ArrowLeft to Select: "5 of 5 rows, 3
  selected", "3 nodes selected"; the card reads "Node 3 of 5"; F6 reads "3 nodes selected"
  (p2-keys-sr/09.png, 11.png).
- p3-keys: the same to Select (p3-keys/08.png); then F6, Escape in the Inspector: "Selection
  cleared: 3 nodes" (09.png); see Defects.
- w3-keys (one key per step): matched 53 steps; the date box, 2005, Enter (56.png); Tab to Add a
  condition, Shift+Tab, Escape to the on box (57.png, 58.png); Select by ArrowLeft: "3 nodes
  selected"; the card reads "Node 3 of 5" (60.png, 61.png).

The other walks of the earlier pass (p2-detours, p2-keys, p3-detours, w2-detours) were replayed on
this build and matched every check point, so their findings stand.

## Mismatches with the answer key

None.

## Defects

None that crash, block the task or spoil its grading.

- Escape that clears the selection leaves the select card on. After "3 nodes selected", F6 to the
  Inspector and Escape: "Selection cleared: 3 nodes", no rings, but the installed card stays on with
  Select chosen and its chip at 3 of 5 (p3-keys/09.png, 12.png). A click on the empty canvas turns
  the card off (p3-path/11.png), as the decided rule says both should. The same screen was on build
  71230abff1 (r1d1 v-p3-keys/14.png). Not grading-spoiling: the counts a participant reads before
  pressing Escape are right, but after it the card says 3 are marked while none are.
- The Redo notice names the state before the edit: Undo reads "Undid editing the filter ...
  between 70 and 210", Redo reads "Redid editing the filter ... between 48 and 210" though it
  restores 70 (k2-order/07.png, 08.png). Wording only.
- Carried, unchanged and not grading-relevant: the live status says "1 edges"; the collapsed date
  card and its names read "installed is at most 1104537599999"; the effect control reads "Select |
  Hide", not the decided "Filter to | Filter out".

## Skipped

None for this task. The other routes in the fix list (T64 A/B, T65 A, T66 A/B, T68 A/B) belong to
other tasks' pilots.
