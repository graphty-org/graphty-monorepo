# Grade: session r3-s23 -- Grace, "Bigger dots for the ones that matter", Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted, 1440 x 900.
Graded from the last screenshot (10.png) and the transcript. The task saves no file, and the
session has no downloads folder. Not graded from the participant's rating (5 of 7).

## Grade: S (success)

1. **A ranking run.** Steps 4-6 (04.png-06.png): the Analyze flask, PageRank (the "Start here"
   entry), Run with the defaults. The key read "Color: PageRank 0.003299 -- 0.07543" and a
   "PageRank 77" row was added on the left. Holds.
2. **Node sizes bound to the result.** Steps 7-10 (07.png-10.png): the PageRank row (opened on
   Style), the + beside Shape (the "Add to Shape" control, clicked by position), Size. The
   from-data list opened at once (09.png), and she chose "PageRank". In 10.png the Size line reads
   "1 to 3", the key reads "Size: PageRank 0.003299 -- 0.07543" above "Color: PageRank", and the
   dots differ plainly in size: the largest is in the middle, the second largest at the lower left.
   Holds. Sizing record: the list was used, not closed, and "Fixed size" was not chosen. She said
   the sizes had not changed after the run (step 6, "the dots did not get bigger").
3. **Meaning stated from the screen.** Step 10 and the debrief: "bigger and darker the dot, the
   more the network leans on that character" and "the colors stand for the same PageRank score:
   light orange is low, dark brown is high". She named PageRank for both size and color, as the
   key shows. Holds.

- **Build-decided:** no.
- **Void:** no. Both coordinate clicks (the flask at step 4 and the Shape + at step 8) hit controls
  a person could see and click.
- **Failure codes:** none.
- **Activation measure:** yes. She chose and ran PageRank with no help, guided by the "Start here"
  badge.
- **Usage card:** declined ("No thanks", step 2) without a detour.

## Counts

| | This session | Reference (round 3 path) |
|---|---|---|
| Commands (real.mjs, after the start) | 9, of which 1 dismissed the usage card | 10 |
| Steps on the success path | 8 | 8 |
| Wrong turns | 0 | -- |

She opened Analyze with the flask instead of Shift+A and clicked PageRank in the list instead of
typing its name, so ranking took 3 commands instead of the path's 4. Every command after the usage
card is on the path.

## False "done"

None. At step 10 she said "That's it", and 10.png shows the sizes bound, the key reading "Size:
PageRank" and "Color: PageRank", and visibly different dots. Her debrief ("Finished: yes") matches
the screen.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. No build defect was seen,
so no scripted repro was made.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | No "Size" line is visible in the row's Style tab. Size sits behind the + beside "Shape", and she found it only by guessing that size belongs to shape. | Step 7 (07.png, "No 'Size' anywhere"), step 8 (08.png, menu "Size, Shape"). |
| 2 | 2 | wording | The Analyze list gives no plain-language route from "who does the network depend on most" to a measure. She hesitated between Betweenness and PageRank and chose PageRank only because of the "Start here" badge, and left unsure that it was the right one. | Step 4 (04.png); debrief. |
| 3 | 2 | wording | The key shows only raw scores (0.003299 to 0.07543). She could not say what the numbers mean beyond "higher is more central". | 06.png, 10.png; debrief. |
| 4 | 1 | wording | The size list offers "PageRank", "PageRank rank" and "PageRank percentile" with nothing saying how they differ. She hesitated before picking the plain score. | Step 9 (09.png). |
| 5 | 1 | opinion | The ranking colored the dots but did not size them. She expected the run to make important dots bigger and had to look for size herself. Held one level down as opinion; the path expects the user to add the size. | Step 6 (06.png); debrief. |
| 6 | 0 | opinion | Nothing on the drawing names the biggest dot. Labels are outside this task. | 10.png; debrief. |
