# T65 A pilot, round 1 dry run 1: only the trained volunteers with 10 hours or more in the picture, staff marked

## Targeted re-pilot on build ff17391bb1

Build: ff17391bb1 (frozen, `.study-builds/tier4-r1d2-ff17391bb1`). Start: `volunteers.txt` (volunteers.graphml
open, 24 nodes and 63 edges). Every walk below was replayed from the newest walk of the same route on this
build, each in its own session, under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T65A/.
Every step of every walk matched its recording to the end, and each session was ended. The data stayed the
task's own throughout: one source, volunteers.graphml, 24 nodes and 63 edges; the filters only took nodes out
of the picture.

Of the routes on the fix list, only "T65A success path (number and yes/no cards unchanged)" belongs to this
task; the others belong to other tasks and were not walked here.

- **Success path by pointer** (`y1-path/`, 24 steps, from `x1-path/`): Data > Add filter > trained > Yes;
  Add a condition > hours, "from" 10, Enter; Add filter > role > staff; Select. The top bar reads "14 of 24
  nodes, 22 of 63 edges" and the inspector "4 nodes selected" with 4 rings (y1-path/17.png). The yes/no card
  (trained: Yes) and the number card (hours: Between, 10 to 52, slider, "from" written on Enter) look and
  behave as before (y1-path/13.png). Hours "to" 40 then Tab, 52 then Escape, the table and the keep card off
  and on behave as before: off, all 24 drawn and "5 nodes selected" (y1-path/24.png); on, 14 and 4 again.
- **The other card order** (`y2-order/`, 11 steps, from `x2-order/`): role on Select first, then trained Yes
  and hours from 10: 14 of 24 and 4 selected, as before.
- **Detours** (the set walked in round 1): the find box typing a rule, the toolbar's filter button with the
  cards in the other order, a style layer's Which nodes (`y5-detours/`, 25 steps; `y6-find/`, 16;
  `y7-style/`, 6). All matched; the earlier findings for them stand.
- **Keyboard only** (`y4-keys/`, 130 steps, from `v4-keys/`): reached the end. Moving the role card to
  Select announces "Filter on: 14 of 24 nodes, 22 edges" and "4 nodes selected" (y4-keys/111.png); the
  attribute picker opens on "Find an attribute", "ho" highlights "hours, 2 to 52", Escape returns focus to
  "Add filter" (y4-keys/129.png to 131.png). Focus fell to the page body only at the start, before the first
  key.

Result: reached on both card orders, by pointer and by keyboard; 14 in the picture and 4 marked, as the
answer key says.

Mismatches between the answer key and the screen: none.

Defect still open (would spoil grading): the role card's count chip reads "5 of 24" while the card is on
Select and the screen says "4 nodes selected"; the team's settled behavior is "4 of 14". A participant who
reads the marked count off the card answers 5, not 4 (y1-path/17.png, y4-keys/111.png).

## Earlier walks in this round

Build: 037e96e9bb (frozen, `.study-builds/tier4-r1d1-037e96e9bb`). Start: `volunteers.txt` (volunteers.graphml
open, 24 nodes and 63 edges, ranked by PageRank). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T65A/ (not in git). The data stayed
the task's own the whole way: one source, volunteers.graphml, 24 nodes and 63 edges; filters only hid nodes.

## How this build was walked

Every route of the round 1 pilot of this task was replayed on this build, step by step, comparing what each
step printed and the controls on each screen:

- Matched to the end, so the round 1 findings for them stand: the success path by pointer (`s1-path/`, 21
  steps, and `w1-path/`, 20), the detours walked in round 1 (`s2-detours/`, 25 steps: the find box typing a
  rule, the toolbar's filter button with the cards in the other order, a style layer's Which nodes;
  `w2-find/`, 16; `w3-style/`, 6), and the keyboard-only walk `s3-keys/` (127 steps).
- Diverged: the second keyboard walk, at its step 120 of 130. Replayed again into `w4-keys/` and carried on
  by hand to its end (131.png), then ended.

## Result

Reached, with the same wrong mark count as round 1. Two cards leave 14 of 24 in the picture, as the answer
key says, but Select on role = staff selects 5 nodes, not 4: the inspector says "5 nodes selected" (trained
Yes 4, No 1) while 4 rings show on the canvas (s1-path/17.png, w4-keys/121.png, w4-keys/131.png). The number
card (hours) and the yes/no card (trained) behave as in round 1: the yes/no card starts empty, Yes writes
it with Hide on, the hours card opens Between 2 to 52 and the "from" box writes on Enter.

## Keyboard walk, where it diverged (w4-keys/)

The divergence is not a defect. Step 119 (Control+Z, undoing the deleted first card) now leaves the undo
notice up with a "Dismiss" button through the next step, and the top bar's filter button is now named
"Filter: 14 of 24 nodes, 22 of 63 edges" (it was "Filter: 14 of 24 nodes"; the visible text already read
"14 of 24 nodes, 22 of 63 edges"). w4-keys/121.png.

From there by hand, every focus line matched the round 1 walk: Shift+Tab from "Select" (role card) to
"Remove role is staff", "role" expanded, "Apply trained is Yes and hours is between 10 and 52",
"Hide nodes that do not match", "Remove trained is Yes and hours is between 10 and 52", "trained, hours"
collapsed, "Add filter" (122-128.png). Enter opens the picker with "Find an attribute" focused (129); typing
"ho" highlights "hours, 2 to 52" (130); Escape closes it with nothing added and returns focus to "Add filter"
(131). The undo restored the first card and its count (14 of 24). No step left focus on the page body.

## Mismatches between the answer key and the screen (unchanged from round 1)

1. The hours condition has no "at least": Between, with the "from" box set to 10 (the "to" box stays 52).
2. A new card is written with Hide already on; the role card has to be switched to Select.
3. The marked count is 5, not 4: Select selects the staff member the first card hid (trained No).
4. Names: Filters "+" is "Add filter"; the second field is added with "Add a condition"; the role card's
   operator reads "Is any of".

## Defects

Every defect of the round 1 report still stands on this build, since its routes matched. The one that
spoils grading: Select marks a node another card took out of the picture ("5 nodes selected", 4 rings).
(success, s1-path/17.png; keyboard, w4-keys/121.png, w4-keys/131.png)

No new defect on the re-walked keyboard route.
