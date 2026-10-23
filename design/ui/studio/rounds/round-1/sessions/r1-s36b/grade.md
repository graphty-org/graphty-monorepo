# Grade: session r1-s36b -- Grace, who matters most (running club, friends.csv)

- **Grade:** SD (success with difficulty)
- **Failure codes:** none
- **False "done":** no. Grace said she finished with Ava, Ivan and Sana from "Bridges"
  (Betweenness), and the last screenshot (07.png) shows exactly that Top 10.
- **Steps:** 6 commands after the setup start (Analyze button, PageRank, Back to analyses,
  Betweenness, Run, the Bridges row), against a success path of 5 from the same start (Analyze,
  type the name, pick it, Run, select the row).
- **Wrong turns:** 1. She opened PageRank (03.png), judged that "connected to well-connected
  people" was about popularity, not dependence, and went back (04.png).
- **Ease (from the transcript):** 3 of 7 difficulty.
- **Build-decided:** no. **Void:** no. The 40-minute wait for a browser slot happened before the
  start and did not change what she saw.

## Why SD

The last screenshot (07.png) shows the "Bridges" run row selected and its Values tab with a Top 10
of Ava 51.27, Ivan 40.02, Sana 21.35, Kofi 18.31, and so on. Those match the reference
Betweenness values for friends.csv (Ava 51.27, Ivan 40.02, Sana 21.35). The names appeared in a
screenshot before she stated them, and she named the measure both ways ("Bridges", listed as
"Betweenness") with a correct meaning: how often a person sits on the shortest paths between
others. It is SD rather than S because she needed a detour: she opened PageRank, the run marked
"Start here", then backed out of it before choosing Betweenness. The detour was a reasoned
choice and the session counts toward recovery (a wrong turn that still succeeded).

## Problems

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                                                                                                                                            | Evidence                                                                                                             |
| --- | -------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | build-defect | The Values histogram draws 20 bars of the same height for 20 different values (2.583 to 51.27, median 11.2), so it shows nothing about the spread; Ava and Ivan stand far above the rest and the chart hides it. Also seen in r1-s38b. Reproduced on the build by `rounds/round-1/repro/r1-s36b/run.sh` (its 05.png shows the same 20 equal bars). | step 6, 07.png; repro 05.png. "The bar chart under 'Values' showed bars all the same height, which told me nothing." |
| 2   | 2        | behavior     | The "Start here" badge on PageRank pulls a newcomer toward a measure she judged did not fit "how much the club depends on them"; she had to open it, read it and go back.                                                                                                                                                                          | steps 2-4, 02.png, 03.png, 04.png                                                                                    |
| 3   | 1        | wording      | The run is picked as "Betweenness" and shown everywhere after as "Bridges"; she stopped to check the result was hers.                                                                                                                                                                                                                              | step 5-6, 05.png, 06.png                                                                                             |
| 4   | 1        | opinion      | The analysis list is algorithm jargon (Betweenness, Eigenvector, Katz, HITS, Damping factor); she had to translate "depends on" into "sits on shortest paths" herself from the one-line descriptions.                                                                                                                                              | step 2, 02.png; step 3, 03.png                                                                                       |
| 5   | 1        | behavior     | No names on the dots, so the colored drawing alone could not answer "who"; names appear only after selecting the run row.                                                                                                                                                                                                                          | step 1, 01.png; step 5, 06.png                                                                                       |
| 6   | 0        | opinion      | She wanted to copy the whole ranked list into a spreadsheet; she did not look for a way.                                                                                                                                                                                                                                                           | step 6, 07.png                                                                                                       |
