# Grade: session r3-s41 -- Elena (first-time graph user), who matters most, running club (friends.csv)

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json). Start: the setup
start, with friends.csv already drawn (20 nodes, 41 edges, directed). Graded from the last
screenshot (07.png) and the transcript. No files were saved, and none are needed for this task.
Not from the participant's rating (5 of 7).

## Grade: S (success)

The three parts of the task's success definition hold:

1. **A ranking run from Analyze.** Steps 2-4 (03.png-05.png): Analyze, PageRank, Run. The outline
   gained "PageRank 20" and the key "Color: PageRank 0.04382 to 0.06608".
2. **Top three in the app's order, matching the reference.** Step 6 (07.png): the run row's Values
   tab shows Top 10: Farah 0.06608, Ava 0.06423, Hana 0.05883. She stated "Farah, Ava, Hana" after
   that screenshot. The reference for friends.csv PageRank is Farah 0.06608, Ava 0.06423, Hana
   0.05883.
3. **The measure named.** "PageRank", with the app's description ("connected to other
   well-connected people").

- **Failure codes:** none.
- **Build-decided:** no. **Void:** no. The transcript notes that the setup file was found under
  `rounds/round-3/setups/` rather than at the path the task names. The tool still ran the right
  setup (session.json: No thanks, Open project or file..., upload friends.csv), so this is not a
  tool fault, but the task's setup path should be corrected.
- **Partial:** 3 of 3 parts reached. Not SD: the order was read from the Top 10, not a sorted
  table, and there was no detour.

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs, after the start) | 6 | 6 on the round 3 route from the setup start (Analyze, PageRank, Run, the run row, Values, read); 7 counting "open the sample" |
| Wrong turns | 0 | -- |

- One step off the route: step 1 selected Ava to look at her. It was exploration, not an attempt
  at a task part, and it does not count as a wrong turn. Ava stayed selected, which did no harm.
- Step 5, where the run row opened on Style, is on the success path (answers.md: the row opens on
  Style, then Values). She called it a "small dead end", but it cost no extra step beyond the
  route's.

## False "done"

None. When she said "Farah, Ava, Hana", 07.png showed exactly that list, and "PageRank" was named
on screen in the run row, the key and "Made with".

## Problems

| # | Problem | Severity | Kind | Evidence |
|---|---|---|---|---|
| 1 | The Analyze list does not tell a newcomer which method answers "how much the whole club depends on them". She picked PageRank only because of the "Start here" tag and remained unsure whether it fit the question ("one of the others might have been closer"). The grey description lines were too small for her to compare. On this dataset, every other ranking puts Ava first (betweenness, closeness, eigenvector, Katz, HITS), so the answer depends on which method a newcomer picks, and nothing in the list helps with that choice. | 2 | behavior | Step 2, 03.png; debrief |
| 2 | The run row opens on Style (fill, shape, label settings), and the ranking she was looking for is on the second tab, Values. She found it only by guessing that "values sounds like numbers". | 2 | behavior | Step 5, 06.png; step 6, 07.png |
| 3 | After Run, the only visible result is a color ramp, and the dots have no names. She could not tell who was first from the drawing ("twenty shades of orange"). | 1 | opinion | Step 4, 05.png |
| 4 | The scores carry no meaning she can state ("0.066 -- is that a lot?"), and she read Farah and Ava as a tie without knowing whether the gap matters. | 1 | opinion | Step 6, 07.png; debrief |
| 5 | "Damping factor" is shown before Run with no explanation, and it made her nervous. She left the default. | 1 | opinion | Step 3, 04.png |

There is no build defect to reproduce. Every control did what it should on the first click, so no
repro script was written.
