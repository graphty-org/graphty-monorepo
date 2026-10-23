# Grade: session r5-s55b (task T12R A, Ruth, tier 1 graduate)

Task T12R, dataset A (Les Miserables, with a PageRank run sized and colored on the drawing).
Build 8c015b806086 graphty@0.8.65 (`session.json` buildStamp), the round 5 frozen build. The
question: go to Javert, read what the program knows about him, and list the characters he shares
chapters with, and how many.

**Grade: S**

## Why

The answer key (tier 1's T12 key, which T12R uses): Javert selected; one fact about him read
(degree 17, or a value); his neighbors listed on screen by name, at least three of them named
from that list, and 17 given.

- **Selected and a fact read.** `04.png`: Selection 1, Javert's inspector ("Javert / Node",
  Values tab) with id, name, Degree 17 and PageRank "0.0303, #5 of 77". Ruth reported Degree 17
  and PageRank 0.0303, #5 of 77; both match the screen.
- **Neighbors on screen (last screenshot, `05.png`).** The panel reads "Javert and 17
  connections" with Hops 1 chosen, and lists Babet, Bamatabois, Claquesous, Cosette, Enjolras,
  Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier,
  Toussaint, Valjean, Woman1, Woman2; Selection reads 18. Ruth named all 17, in the list's order
  and spelling, and said 17. Every name and the count match the key.
- **Saved state.** `work.json` end equals its start: the PageRank run, its three style layers and
  the source are unchanged. Nothing was lost.

Route: find box, the node row of the find list, then the Degree row. That is the key's success
path (the Degree route), reached by pointer instead of Enter. The names were read from the
Neighborhood list, not from the find box's list of ties, so S rather than SD.

## Counts

- False "done" claims: 0. "Finished: yes" was claimed once, after `05.png`, and the screen bears
  out every name and the count.
- Wrong turns: 0. Ruth went to the node, not a tie (no "picks a tie instead of the node" detour),
  and opened Degree directly.
- Tool refusals: 1. Step 2's `--click "Javert"` matched 18 elements (the node and its 17 ties) and
  was refused with no change in the app (`03.png` is byte-identical to `02.png`). The study
  tool's selector, not an app step; the next step named the option row.
- Broken habit: none. Find box, then the right-hand list of connections, is exactly what Ruth's
  history names, and it led to the task.
- Steps: 3 actions in the app (type Javert, pick the node row, open Degree).

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 1 | Nothing on the node's screens says what a tie means ("shares a chapter"); the tie's attribute `shared_chapters` shows only in a tie's inspector, which Ruth never opened. She took the meaning from the task and said she could not confirm it from the program. No wrong conclusion. | `04.png`, `05.png`; transcript "What confused me" item 1 |
| 1 | The route to the names is the row labeled "Degree", a term a reporter does not use; Ruth found it only because it is the one row with a chevron, and said "Connections" would have told her sooner. | `04.png` (Degree row with chevron at 1411,242); transcript step 3 and item 2 |
| 1 | Typing a name lists the person and every tie that names them (18 rows for Javert, 6 visible plus a scrollbar); the node row is first under "Nodes 1", which helped, but the list is long. | `02.png`; transcript step 1 and item 3 |
| 1 | PageRank's "#5 of 77" does not say what was ranked or what 77 counts; Ruth assumed everyone. Right assumption, no wrong conclusion. | `04.png` (Results, 1371,327); transcript item 4 |
| 0 | In the Neighborhood view the first neighbor (Babet) carries a gray fill while Hops "1" is outlined, so a row looks lit with no reason (the resting pointer's hover, as the key records). Ruth did not remark on it. | `05.png` (Babet row at 1325,240) |

Positive, recorded for the round: three counts on screen agreed (the find list's "Edges 17",
Degree 17, "Javert and 17 connections") and Ruth used them to check the count without counting
dots; the task took three app steps.

Participant's ease rating (6 of 7) is not used in this grade.
