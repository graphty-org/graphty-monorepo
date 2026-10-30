# T65 A pilot, round 1 dry run 3: only the trained volunteers with 10 hours or more in the picture, staff marked

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
