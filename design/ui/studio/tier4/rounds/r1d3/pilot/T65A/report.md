# T65 A pilot, round 1 dry run 3: only the trained volunteers with 10 hours or more in the picture, staff marked

## Targeted re-pilot on build 79ed770292 (the Select card's count)

Build: 79ed770292 (frozen, `.study-builds/tier4-r1d3-79ed770292`, the first line of `criteria.md`). This build
makes a Select card's chip count what it marks, among what the keep card leaves in the picture. Every route
on the fix list, and every earlier walk of this task that no longer matched this build, was walked again in
its own session from its real start, one browser at a time, by replaying the newest walk of the same route;
where the screen differed the walk was carried on by hand to the old route's end. Every session was ended.
Walk folders are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T65A/.
The data stayed each task's own on every walk: volunteers.graphml 24 nodes and 63 edges; gauges + flows 12
and 14; pantries + deliveries 13 and 18. Nothing crashed and no script error was printed.

| Route | Walk | Result |
| ----- | ---- | ------ |
| T65A success path (pointer) | v01-T65A-path | 24 of 24 steps matched |
| T65A, the other card order | v02-T65A-order | 11 of 11 |
| T65A keyboard walk (the card's count; the live "4 nodes selected") | v03-T65A-keys | 127 of 127 |
| T65A redo route (undo and redo of the keep card) | v04-T65A-redo | 28 of 28 |
| T65B success path | v05-T65B-path | 8 of 15, then by hand to the end (step 9's screen-reader read now says "Node 3 of 5") |
| T65B, the other card order (undo and redo of the depth edit) | v06-T65B-order | 7 of 7 |
| T65B keyboard and screen-reader walk (the card's spoken count) | v07-T65B-keys-sr | 11 of 12; the last read now says "Node 3 of 5" |
| T65B detour: a style layer's Which nodes | v08-T65B-whichnodes | 7 of 7 (unchanged) |
| T66A, T66B: the Data source card's count | v09-T66A-sourcecard, v10-T66B-sourcecard | 15 of 15, 17 of 17 (unchanged) |
| T68A, T68B starts: the narrowed Hide card's count | v11-T68A-start, v12-T68B-start | 4 of 4, 3 of 3 (unchanged) |
| T64A success path | v13-T64A-path | 21 of 21 (unchanged) |
| T64A detours (Analyze's weight) | v14-T64A-detours | 31 of 31 (unchanged) |
| T64B detour: the table role, then the reading | v15-T64B-rerun | 5 of 5 (unchanged) |
| First round's success path, both walks | s1-path, w1-path | 15 of 21 and 15 of 20, then by hand to the end |
| First round's detours: find box, toolbar filter button, style layer | s2-detours, w2-find | 13 of 25 and 14 of 16, then by hand to the end |
| First round's keyboard walks | s3-keys, w4-keys | 109 of 127 and 109 of 130, then by hand to the end |

Every replay that stopped, stopped where the old walk recorded the count this build fixed: "5 nodes
selected" with 4 rings, or a role chip of "5 of 24". Nothing else differed.

### What the screens show

- **Success path** (v01): Data > Filters "+" > trained > Yes; Add a condition > hours > from 10 > Enter: "14
  of 24 nodes, 22 of 63 edges". Add filter > role > staff, then Select: the role card reads **4 of 14**,
  the inspector "4 nodes selected" with 4 rings, role staff (4), trained Yes (4), hours 40 to 52
  (v01-T65A-path/17.png). With the keep card off: all 24 drawn, the role card reads 5 of 24 and "5 nodes
  selected" (v01-T65A-path/24.png); on again: 14 of 24, 4 of 14, 4 selected, the table on Shown lists 14
  rows with the 4 staff highlighted (v01-T65A-path/25.png).
- **Other order** (v02): role on Select first, then trained Yes and hours from 10: 14 of 24, role card 4 of
  14, "4 nodes selected" (v02-T65A-order/08.png). The order makes no difference.
- **Undo and redo** (v04): undoing the keep card's switch shows 5 of 24 and 5 selected; redo shows 14 of 24,
  4 of 14 and 4 selected, with "Redid turning on the filter ..." (v04-T65A-redo/26.png, 27.png, 29.png).
- **Editing the keep card recounts the role card** (s1-path): hours "to" 40 gives 11 of 24 and the role
  card 1 of 11 with 1 selected (s1-path/19.png); back to 52: 14 of 24, 4 of 14, 4 selected
  (s1-path/21.png).
- **Keyboard** (v03, s3-keys): ArrowLeft onto Select announces "Filter on: 14 of 24 nodes, 22 edges" and
  "4 nodes selected" (v03-T65A-keys/111.png, s3-keys/111.png). Focus never fell to the page body after the
  start (the start has nothing focused, as every setup ends). Escape in the hours "to" box keeps the value
  and puts focus on the card's on box, as decided. Deleting the keep card by keyboard (Enter on "Remove
  trained is Yes and hours is between 10 and 52") puts focus on the role card and announces "Filter off"
  and "5 nodes selected"; the role card reads 5 of 24 (w4-keys/113.png). Control+Z announces "4 nodes
  selected", "Filter on: 14 of 24 nodes, 22 edges" and the undo; the role card reads 4 of 14
  (w4-keys/116.png).
- **T65B** (v05, v06, v07): "5 of 12 nodes, 2 of 14 edges", the installed card **3 of 5**, "3 nodes
  selected", G01, G02 and G09 highlighted (v05-T65B-path/09.png); a screen reader hears "Node 3 of 5" for
  the installed card (v05 step 9, v07 step 12). Keep card off: 5 of 12 and 5 selected; on again: 3 of 5 and
  3 (v05-T65B-path/13.png, 14.png); undo and redo of that switch show the same pair (15.png, 16.png).
  Other order: 3 of 5, 3 selected (v06-T65B-order/06.png); undoing the depth edit shows depth from 48, 6 of
  12 and the installed card 3 of 6; redo restores 70, 5 of 12 and 3 of 5 (v06-T65B-order/07.png, 08.png).
- **Unchanged routes**: the style layer's Which nodes reads "installed before 2005, 5 nodes"
  (v08-T65B-whichnodes/06.png); the Data source card reads 12 of 13 with "12 of 13 nodes, 17 of 18 edges"
  (v09-T66A-sourcecard/09.png) and 11 of 12 with "11 of 12 nodes, 13 of 14 edges"
  (v10-T66B-sourcecard/07.png); the T68 starts read the same (v11-T68A-start/05.png,
  v12-T68B-start/02.png); T64A's label is site and its weight trips, closer, P05 is Harbor Market
  (v13-T64A-path/13.png, 22.png); a weight set from the table leaves Higher means empty and Shortest path
  lists "trips (loaded, not read)" (v14-T64A-detours/27.png); with closer set it lists "trips (closer,
  loaded, not read)" and opens on None (32.png); T64B's table route ends on km, farther
  (v15-T64B-rerun/06.png).
- **Detours** (s2-detours, w2-find): the find box still offers no way to combine two conditions or to take
  anything out of the picture; the toolbar's filter button opens Filters, and the other order through it
  gives 14 of 24, 4 of 14 and 4 selected (s2-detours/16.png, w2-find/17.png). A style layer's Which nodes
  with Hide hides the 15 trained nodes, leaves their edges drawn and the selected nodes as flat yellow
  discs (s2-detours/23.png); undo restores it (24.png). Not success, as the key says.

### Mismatch between the answer key and the screen

None. The key's "Card counts" (4 of 14 and 4 selected for A, 3 of 5 and 3 for B, in either order; 5 of 24
and 5 with A's keep card off; "Node 3 of 5" spoken for B) is what the screen shows. The key's sentence
"On a53beb7179 and every earlier build the Select card's chip counted over the whole graph" is history and
still true.

### Defects

Nothing on these routes crashes, blocks the task or gives a wrong result that would spoil its grading.
Known and unchanged, none new:

1. The role card's count chip is not in the focus order and no focus line names it on A, so a
   keyboard-only screen-reader user hears "4" from the live status and the inspector heading, not from the
   card; a browse-mode read does say it on B ("Node 3 of 5") (v03-T65A-keys/111.png).
2. B's live status reads "Filter on: 3 of 12 nodes, 1 edges" (v07-T65B-keys-sr, step 7).
3. B's collapsed date card reads "installed is at most 1104537599999" (v05-T65B-path/13.png).
4. Deleting A's keep card announces "Filter off" while the role card still selects 5 (w4-keys/113.png).

### Not walked

Nothing on the list. The first round's style-layer walk (w3-style) matched this build to its end in the
earlier replay of this pass, so it was not walked again.

## Targeted re-pilot on build a53beb7179 (partial)

Build: a53beb7179 (frozen, `.study-builds/tier4-r1d3-a53beb7179`). Start: `volunteers.txt`. Each route was
walked in its own session from its real start by replaying the newest walk of the same route on the
previous build. Walk folders are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T65A/. The data stayed the task's
own throughout: one source, volunteers.graphml, 24 nodes and 63 edges.

| Route | Walk | Result |
| ----- | ---- | ------ |
| T65A success path | r01-T65A-path | 24 of 24 steps matched, ended |
| T65A, the other card order | r02-T65A-order | 11 of 11 matched, ended |
| T65A redo route (undo and redo of the keep card) | r04-T65A-redo | 28 of 28 matched, ended |
| T65A keyboard walk (the chip's spoken count) | r03-T65A-keys | still replaying when this report was written; steps 1 to 70 of 127 matched |

What the screens show:

- Success path: "14 of 24 nodes, 22 of 63 edges", "4 nodes selected", 4 rings; the role card on Select
  reads "5 of 24" (r01-T65A-path/17.png). Keep card off: all 24 drawn, "5 nodes selected"
  (r01-T65A-path/24.png).
- Other order: role on Select first, then trained Yes and hours from 10: 14 of 24 and 4 selected; role chip
  "5 of 24" (r02-T65A-order/08.png); Escape after typing 12 keeps 12, as decided (r02-T65A-order/12.png).
- Redo: "Redid turning on the filter ...", 14 of 24 and 4 selected, 4 staff rows highlighted
  (r04-T65A-redo/29.png).

The Select card count fix is not in this build (it was reverted before the freeze), so the screens are
the same as on bccf8fe47f.

## Mismatch between the answer key and the screen

`decided.md` "A Select card's count counts what it marks" expects the role card to read "4 of 14"; the
build reads "5 of 24" (r01-T65A-path/17.png, r02-T65A-order/08.png). The answer key's own "Card counts"
paragraph (5 of 24 while 4 selected) matches the screen.

## Defects

1. The Select card's chip counts over the whole graph: "5 of 24" while "4 nodes selected". A participant
   who reads the marked count off the card answers 5. Would spoil grading unless graded per the key's
   note (r01-T65A-path/17.png).

## Not walked

T65A keyboard walk past step 70; T65B success path; T65B other order; T65B keyboard and screen-reader
walk; T65B style layer Which nodes detour; T66A/T66B Data source card; T68A/T68B starts; T64A success
path, T64A detours and T64B table role re-run; the first round's T65A detour set. The replays were queued
behind the keyboard walk and the pass was stopped before they ran.
