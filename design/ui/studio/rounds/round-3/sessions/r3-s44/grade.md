# Grade: session r3-s44 -- Jordan (marketing network analyst), who matters most, running club (friends.csv)

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), 1440 x 900, sighted
mode. Started from the setup for this prompt: the usage card declined and `friends.csv` opened, 20
people and 41 ties drawn. Graded from the last screenshot (09.png), the Top 10 screenshot (08.png)
and the transcript. No files were saved, and the task asks for none. Not graded from the
participant's rating (5 of 7).

## Grade: SD (success with difficulty)

Each part of the success definition holds:

1. **A ranking run from Analyze.** Steps 2-4 (02.png-04.png): the flask button, Betweenness, Run.
   Betweenness is one of the accepted rankings. The key read "Color: Betweenness, 2.583 ... 51.27"
   and a "Betweenness 20" row appeared in the outline.
2. **Top three, in the order the app shows, matching the reference.** Step 8 (08.png): the run
   row's Values tab shows Top 10 "Ava 51.27, Ivan 40.02, Sana 21.35, Kofi 18.31 ...". The
   reference for friends.csv's Betweenness is Ava 51.27, Ivan 40.02, Sana 21.35. The participant
   stated Ava, Ivan, Sana in that order, with those values. The names were on screen (08.png)
   before she stated them. Step 9 (09.png) also shows Ava's own card, "Betweenness 51.27, #1 of
   20".
3. **The measure named.** "The order is based on Betweenness", described as "who sits on the most
   shortest paths between the others". The Values tab names it under "Made with: Analysis
   Betweenness" (08.png). Correct.

**Why SD and not S:** the success definition gives SD when the order needed a detour. After Run
she did not know where the ranked list was. She opened the Data page expecting a table (step 5),
found only the sources and the column names, and went back (step 6). The list was read from the
Top 10, not from a sorted table.

- **Build-decided:** no. No build defect affected the outcome.
- **Void:** no. At step 6 the tool printed that "Graph" matched 3 controls and took the rail
  button. That is the button she meant, and a person could click it the same way. It is not a
  tool fault and not a wrong turn.
- **Failure codes:** none.
- **Measure choice:** she deliberately passed over the "Start here" tag on PageRank and chose
  Betweenness, reasoning that "how much the club depends on them" means connectors, not
  popularity. Both are accepted. On this file the two give different top threes (PageRank: Farah,
  Ava, Hana), so the tag decides what a less sure participant reports (problem 4).
- **Run naming:** the run row, the key, the inspector and Ava's card all read "Betweenness". She
  never paused over the run's name.

## Counts

| | This session | Success path |
|---|---|---|
| Commands after the start | 8 (steps 2-9) | 6 from the setup start (Analyze, pick, Run, select the run row, Values tab, read); the round 3 path counts 7 with the sample opened |
| Wrong turns | 1 | -- |

- **The wrong turn:** steps 5-6, the Data page and back to Graph. The detour was abandoned, so it
  counts as one wrong turn.
- **Not counted as wrong turns:** opening Analyze with a click on the flask instead of Shift+A
  (the same step); clicking "Ava" in the Top 10 at step 9 to check her place on the drawing. The
  answer was already on screen at step 8, so that click verified the answer and was not part of
  finding it.
- Steps against the path: 8 / 6, about 1.3x, inside the 2x measure. Excluding the verification
  click it is 7 / 6.
- **Recovery:** she had a wrong turn and still succeeded.

## False "done"

None. "Done" at step 9 and "Did I finish? Yes" in the debrief match the screen. The Top 10 in
08.png and Ava's card in 09.png show the three names and values she reported, and the measure she
named.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. Each is seen in this one
participant; confirmation needs a second participant, because none is a build defect.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | After Run, the result appears only as a color ramp on unlabeled dots and a new outline row. Nothing says where the ranked list is. She went looking for a table and opened the Data page, the one wrong turn of the session. | Steps 4-6, 04.png, 05.png; transcript "Nothing said 'your ranking is over here'". |
| 2 | 2 | behavior | The run row opens on its Style tab. The ranked values are on the second tab, Values. For a result she just asked for, she expected the numbers first, and found them only by trying the second tab. | Steps 7-8, 07.png, 08.png. |
| 3 | 1 | behavior | The Data page's Attributes list shows only the file's columns (`id`, `weight`), not the Betweenness values just computed. She read it as "Betweenness isn't even listed", which made the detour feel like a dead end rather than the wrong place. | Step 5, 05.png. |
| 4 | 1 | opinion | "Start here" on PageRank steers toward a measure that, on this file, gives a different top three (Farah, Ava, Hana) from the dependence measure she chose. She thought a less sure user would report a popularity order for a dependence question. PageRank is an accepted answer for this task, so this changes no grade. Held one level down as an opinion. | Step 2, 02.png; debrief. |
| 5 | 1 | opinion | No names are drawn on the dots, so the drawing cannot be checked against the list until a name is clicked. | Steps 1-4, 01.png-04.png; step 9, 09.png. |
| 6 | 1 | opinion | The Values tab shows only a Top 10 and offers no export of the full ranking beside it. Not needed for this task. | Step 8, 08.png; debrief. |
| 7 | 1 | wording | Ava's card lists "Degree 6" under Results although no Degree run was made, and nothing says where that value comes from. | Step 9, 09.png. |

**What worked:** the outline's empty-state hint pointed at Analyze. The Analyze list gives each
measure a plain one-line description. The run form says "Under a second" before Run. The Top 10
names the method under "Made with". A node's card states its place in the ranking ("#1 of 20"),
and selecting a name in the Top 10 rings the matching dot on the drawing.
