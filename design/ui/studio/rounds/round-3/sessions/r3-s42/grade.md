# Grade: session r3-s42 -- Tom (lab manager), "Who matters most", running club (friends.csv)

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), 1440 x 900, sighted
mouse session. The session started with friends.csv already loaded (setup: "No thanks", "Open
project or file...", upload friends.csv). Graded from the last screenshot (06.png) and the
transcript. No files were saved, and the task needs none. Not graded from the participant's
rating (5 of 7).

## Grade: S (success)

All three parts hold, read from 06.png:

1. **A ranking run from Analyze.** Steps 2-4: the Analyze (flask) button, PageRank, Run. The
   drawing recolored, the key reads "Color: PageRank 0.04382 to 0.06608", and the outline gained
   the row "PageRank 20" (04.png).
2. **Top three in the order the app shows, matching the reference.** The PageRank row's Values
   tab shows Top 10: Farah 0.06608, Ava 0.06423, Hana 0.05883 (06.png). The reference for
   friends.csv PageRank (directed, unweighted) is Farah 0.06608, Ava 0.06423, Hana 0.05883. He
   stated "1. Farah, 2. Ava, 3. Hana" after the names were on screen. Holds.
3. **The measure named.** "The order is based on PageRank", which also appears on screen as the
   panel title and under "Made with: Analysis PageRank". Holds.

- He read the order from the Top 10 list, not a sorted table, and took no detour. So S, not SD.
- His doubt in the debrief, whether PageRank means "how much the club depends on them", does not
  lower the grade: PageRank is an accepted ranking for this task.
- **Build-decided:** no. **Void:** no; every command did what a person could do.
- **Failure codes:** none.

## Counts

| | This session | Reference (round 3 path, after the file is open) |
|---|---|---|
| Steps | 5 (Analyze, PageRank, Run, the PageRank row, Values) | 6 (Shift+A, type "PageRank", PageRank, Run, the PageRank row, Values) |
| Wrong turns | 0 | -- |

He clicked the flask instead of pressing Shift+A and did not type a filter, which saved one step.
Selecting the run row opened its Style tab (05.png). The reference path expects that and includes
the Values click, so it is not a wrong turn.

## False "done"

None. His "Yes, I have an answer and I can say what it was based on" matches 06.png. He also said
plainly that he was unsure whether PageRank was the right measure. That is doubt, not a false
claim.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. Each was seen in this one
session. None is a build defect, so there is no scripted repro.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | After Run, the only result on the canvas is a color change from orange to dark brown with no names. The ranked list is two clicks away: the run's row in the outline, then the Values tab. Selecting the row lands on Style ("colors and pluses"), which he did not want. He found Values only because the tab name suggested numbers. | Steps 4-6, 04.png, 05.png, 06.png; debrief, "What confused me", point 2. |
| 2 | 1 | wording | The Analyze list gives no way to match a question to a measure. He did not know Betweenness, Katz, HITS or Eigenvector. He picked PageRank only because of its "Start here" tag, and the one-line descriptions are small and gray, so he did not read them. He left unsure whether the measure fit "depends on". | Step 2, 02.png; step 6 remark; debrief point 1. |
| 3 | 1 | wording | The Run box shows "Damping factor 0.85" and "Weight: None" with no plain explanation. He could not judge them and left the defaults alone without knowing whether that was right. | Step 3, 03.png; debrief point 3. |
| 4 | 1 | opinion | Nodes carry no names on the drawing, so he cannot point at Farah in the picture. Held one level down as opinion; the task does not ask for names on the drawing. | 01.png-06.png; debrief point 4. |
| 5 | 1 | opinion | Several of the darkest dots look like the same shade to him, so the drawing alone cannot give an order. The range is narrow (0.04382 to 0.06608). Held one level down as opinion. | Step 4, 04.png. |

**What worked:** the hint "Analyze (flask) in the toolbar (Shift+A) to add results here" sent him
straight to the flask. "Start here" on PageRank gave a first-time user a safe default. Run worked
with the defaults, and the recolor plus the new "PageRank 20" row showed it had run. The Values tab
lists names and values in order, and "Made with" names the measure, so he did not have to remember
it. "Local only" reassured him that the club's list stayed on his machine.
