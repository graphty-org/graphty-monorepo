# Grade: session r3-s43 -- Grace (nonprofit operations analyst), who matters most, running club file

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mouse
session at 1440 x 900. The session starts with `friends.csv` already open (setup: "No thanks",
"Open project or file...", upload `friends.csv`). Graded from the last screenshot (06.png) and the
transcript. No files were saved, and the task needs none. Not graded from the participant's rating
(5 of 7, "Did I finish? Yes").

## Grade: S (success)

All three parts hold.

1. **A ranking run from Analyze.** Steps 2-4 (02.png-04.png): Analyze, PageRank, Run, with the
   defaults (damping factor 0.85, weight None). A "PageRank 20" row appeared in the outline and the
   dots were colored by the result. PageRank is an accepted ranking.
2. **The top three in the order the app shows, matching the reference.** Steps 5-6 (05.png,
   06.png): she selected the PageRank row, which opened on its Style tab, and then chose Values.
   06.png shows the Top 10: Farah 0.06608, Ava 0.06423, Hana 0.05883. That matches the reference
   for PageRank on `friends.csv` (directed, unweighted): Farah 0.06608, Ava 0.06423, Hana 0.05883,
   range 0.04382 to 0.06608. Her answer gives the same three in the same order, read from the Top
   10, not from a sorted table. The names were on screen (06.png) before she stated them.
3. **The measure named.** "The order was based on PageRank", with its defaults. Holds.

- **Build-decided:** no.
- **Void:** no. Every command was a click a person could make.
- **Failure codes:** none.
- **Activation measure:** yes. She chose PageRank and ran it with no help. She picked it because of
  the "Start here" tag, not because she understood it (problem 1), but it is an accepted ranking.

## Counts

|                         | This session | Reference                                                                                                           |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| Steps (after the start) | 5            | 6 from the setup start (the round 3 path of 7 minus opening the sample; typing the filter is optional, so 5 clicks) |
| Wrong turns             | 0            | --                                                                                                                  |

- She clicked "Analyze" instead of pressing Shift+A, and clicked PageRank in the list without
  typing a filter. Both are equivalent routes, not detours.
- Selecting the run row opened Style first (05.png). The round 3 path includes the Values step, so
  this is not counted as a wrong turn. It is recorded as problem 3.

## False "done"

None. She said "I'm done" at 06.png, and the screen shows the Top 10 with the three names and
values she reported. Her claim "20 of 20 have a value, so everyone is counted" matches the text
under the Values chart.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. No build defect was found,
so no scripted repro was needed.

| #   | Sev | Kind     | Problem                                                                                                                                                                                                                                                                                                                    | Evidence                                          |
| --- | --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | 2   | wording  | The Analyze list names methods (Betweenness, Closeness, Eigenvector, Katz, HITS), each with a technical one-line description. Nothing matches her question "who the club depends on". She hesitated between PageRank and Betweenness and chose only by the "Start here" tag. She left unsure the measure fit the question. | Step 2, 02.png; debrief point 1.                  |
| 2   | 2   | behavior | After Run, only the dot colors change. No ranked list or names appear where she is looking. She had to guess that the "PageRank 20" row, and then a tab inside it, held the order.                                                                                                                                         | Step 4, 04.png; debrief point 2.                  |
| 3   | 2   | behavior | Selecting a ranking run opens its Style tab (Fill, Color, Shape, Effects), not its Values with the Top 10. For a "who is on top" question, the answer is one more tab away.                                                                                                                                                | Step 5, 05.png; debrief point 3.                  |
| 4   | 1   | opinion  | The Top 10 shows raw PageRank scores (0.06608) with no rank number or plain-words meaning. She said she could not explain them to a board.                                                                                                                                                                                 | Step 6, 06.png; debrief point 4.                  |
| 5   | 1   | opinion  | No names are drawn on the dots by default, so the drawing alone cannot answer "who".                                                                                                                                                                                                                                       | Steps 1 and 4, 01.png, 04.png; transcript step 1. |
| 6   | 1   | wording  | "Damping factor" on the PageRank settings is unexplained jargon. She left it alone with no harm.                                                                                                                                                                                                                           | Step 3, 03.png; debrief point 5.                  |

**What worked:** the start-screen hint "Analyze ... (Shift+A) to add results here" led her straight
to Analyze. The "Start here" tag gave a newcomer a reasonable default. The run row and the color key
both name PageRank. The Values tab gives a named Top 10, a coverage line ("20 of 20 have a value")
and a "Made with" record of the settings. She liked the "Local only" indicator.
