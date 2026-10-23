# Grade: session r3-s55 -- Tom (the recipe recipient), T16 "First look", friends.csv

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), 1440 x 900, sighted
mode. Graded from the last screenshot (14.png), the transcript and the screenshots it names. No
files were downloaded (no `downloads/` folder). Not from the participant's rating (5 of 7).

## Grade: none (T16 is not graded)

The answer key gives T16 no grade; it asks for five records instead. They are below. The required
grade field of the tally carries S only because the field cannot be empty: Tom reached a drawing,
ran an analysis on his own and read it correctly.

- **Void:** yes, by the "Tool fault" rule. At step 6 Tom asked for the Degree entry of the open
  Analyze list. The tool printed `ambiguous`, took the first match, the "Degree 6" row in Ava's
  panel, and opened Ava's neighbor list instead. A person pointing at the list would have hit the
  list. This is not one of the two known `ambiguous` prints ("PageRank", "Group 1"). The misfire
  added six selected neighbors (yellow rings) that stayed on screen for the rest of the session and
  fed problem 2. Tom recovered in two commands (steps 7-8). Every record below stands on its own
  evidence; whether to re-run is the orchestrator's call.
- **Build-decided:** no. No build defect was met, so there is no scripted repro.
- **False "done":** none. At the end Tom said the names were on and named the gap himself ("'1
  hidden', so somebody's name isn't showing at all"), which matches "20 labels, 1 hidden" in 14.png.
  His reading of the result (below) matches the screen.

## T16 records

| Record                                    | This session                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Data used                                 | `friends.csv` (his own file), dropped on the window                                                                                                                                                                                                                                        |
| Steps from the start to the first drawing | 2 commands: "No thanks" on the usage card (step 2), then the drop (step 3). The drop alone would have done it; the card was optional. Drawn at once with no questions: 20 nodes, 41 edges (03.png)                                                                                         |
| Analysis run without being asked          | yes: Degree, from Analyze, Run (steps 5-9, 09.png)                                                                                                                                                                                                                                         |
| Result read correctly                     | yes. He said "Ava's the best connected in the club, Ivan's next, and everyone else knows three or four people", from Values (11.png: Ava 6, Ivan 5, median 4, range 3 to 6). Reference: Ava 6, Ivan 5, then a tie at 4. He also read the short Top 10 as two names, which is what it shows |
| Verdict                                   | would keep using it, for opening files the postdoc sends him: "it opened first time, nothing to install, and it says on the front page the files stay on this computer". He would not explore analyses on his own ("that list of analyses is her world, not mine")                         |

Beyond the task he put the names on the drawing (Style, Label +, `id`, steps 12-14).

## Counts

|                                      | This session                                          |
| ------------------------------------ | ----------------------------------------------------- |
| Commands (real.mjs, after the start) | 13                                                    |
| Wrong turns                          | 1                                                     |
| Tool misfires (not counted)          | 1 (step 6, above) and its re-open of Analyze (step 7) |

- **The wrong turn:** at step 10 he clicked the Degree row in the outline to get "a list of who's
  got what" and got the Style tab (Fill, Color, Shape, Effects, Label). He found the list under
  "Values" one step later (step 11).
- **Exploration (not counted):** clicking Ava at step 4 to learn who a dot is.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. One participant each unless
noted.

| #   | Sev | Kind          | Problem                                                                                                                                                                                                                                                                                                             | Evidence                       |
| --- | --- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | 2   | wording       | Values' "Top 10" lists two people (Ava 6, Ivan 5). The list stops before the four-way tie at 4, as the answer key says it does, but nothing on screen says so. Tom: "I'd count, and that's two, not ten. If I put that on a slide somebody would ask where the rest are."                                           | Step 11, 11.png                |
| 2   | 2   | behavior      | After Run, nodes selected earlier keep their yellow rings over the new Degree color, and the ringed dots read as the "high" ones. Tom could not tell whether they were high or just selected. Part of this selection came from the tool misfire at step 6; his own click on Ava at step 4 would have left one ring. | Step 9, 09.png                 |
| 3   | 2   | accessibility | The Degree color ramp runs dark brown (3) to orange (6). Tom, who has mild red-green color weakness, could not tell 3 from 6 by shade, and nothing in the drawing says who has 6. Only the key ("Color: Degree, 3 to 6") and the Values tab gave him the numbers.                                                   | Step 9, 09.png                 |
| 4   | 2   | behavior      | Clicking a finished run in the outline opens its Style tab, not its values. A newcomer who wants "who has what" lands on fill, shape and effects.                                                                                                                                                                   | Step 10, 10.png                |
| 5   | 2   | behavior      | The drawing shows no names until a label line is added under Style, and the attribute list offers "id" with no hint that it holds the names. Tom picked it only because clicking Ava at step 4 had shown "id: Ava".                                                                                                 | Steps 3 and 13, 03.png, 13.png |
| 6   | 2   | accessibility | Small gray text he had to lean in to read: the sample descriptions (01.png), "20 of 20 have a value, 3 to 6, median 4" (11.png), "20 labels, 1 hidden" (14.png).                                                                                                                                                    | 01.png, 11.png, 14.png         |
| 7   | 1   | opinion       | Some name labels are drawn very small (Hana, Jada, Lena), Dev and Eli overlap at the bottom, and the one hidden name (Farah, beside Chloe) is not named anywhere.                                                                                                                                                   | Step 14, 14.png                |
| 8   | 1   | opinion       | Analyze opens as a list of method names (Katz, HITS, Eigenvector...). Tom chose Degree only because he had just seen the word on Ava, and "Start here" on PageRank did not tell him what it would answer about a running club.                                                                                      | Step 5, 05.png                 |
| 9   | 1   | opinion       | A "who knows whom" file is drawn with arrows and the Overview says "Directed". That is the expected import (answer key), but nothing says why or how to change it, and Tom wondered whether the file was read wrong.                                                                                                | Step 3, 03.png                 |
| 10  | 1   | wording       | The neighbor table's "weight" (Chloe 5, Ben 3) has no explanation; the file's own column is not described.                                                                                                                                                                                                          | Step 6, 06.png                 |
| 11  | 0   | opinion       | Overview's "Density 0.1079" and "Edges per node 3 to 6, mean 4.1" meant nothing to him.                                                                                                                                                                                                                             | Step 3, 03.png                 |

**What worked:** "Files are read on this computer and never uploaded" and "Local only" answered his
first question. Dropping the CSV drew it at once with every row (41 edges, 20 people) and no setup.
The usage card's refusal was confirmed in place. Degree said "Under a second" before Run. The key
named what the color means. Values gave names and numbers with a median and "20 of 20 have a
value".
