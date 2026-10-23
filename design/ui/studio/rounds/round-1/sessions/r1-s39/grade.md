# Grade: session r1-s39 -- Elena, task T8 "Circles of characters"

**Grade: S** (success). No false "done".

## Evidence for the grade

The task's success definition: a grouping run (Louvain or another community method); the number of
groups and the largest group's size as the screen shows them; three characters named who are in
the largest group, each shown in a screenshot before it is stated.

- 09.png: Louvain ran. The left panel shows "Communities 6" with Group 1 (20), Group 2 (17),
  Group 3 (11), Group 4 (11), Group 5 (10), Group 6 (8); the canvas legend "Color: Communities"
  lists the same six groups.
- 10.png (the last screenshot): Group 1 selected; the right panel reads "Group 1 -- from
  Communities", Size 20, and Members "First 10": MlleBaptistine, MmeMagloire, Valjean, Labarre,
  Marguerite, MmeDeR, Isabeau, Gervais, Fauchelevent, Bamatabois.
- Answer given: 6 circles; the largest is Group 1 with 20; Valjean, Fauchelevent and
  MlleBaptistine are in it. Count and size match 09.png and 10.png, and all three names are in
  10.png's Members list, which was on screen before the answer was stated. Valjean's membership
  was also shown earlier in 09.png (Memberships: Communities -- Group 1).
- No files were saved (the task asks for none).

The participant's "Done" matches the screen, so it is not a false "done".

## Steps and wrong turns

- Success path: 7 steps (open the sample; Analyze; filter; Louvain; Run; the run row; Group 1).
- Participant: 9 actions after the start (No thanks on the usage card; Les Miserables; click on
  the busiest node; hover on a toolbar icon; click Analyze; type "group"; Louvain; Run; Group 1).
  The run row ("Communities") was never selected; Summary and Sizes were read from the left panel's
  tree instead, which carries the same numbers. Within 2x the path.
- Wrong turns: 1.
    - Step 4 (04.png): clicked Valjean on the canvas hoping for groups; it showed one node's values.
      Abandoned.
- Step 5 (hover to learn what the unlabeled toolbar icons do) was a search, not a wrong turn.

## Problems

| #   | Severity | Kind     | Problem                                                                                                                                                                                                                                                           | Evidence                                        |
| --- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | 2        | behavior | Selecting a group in the left panel changes nothing on the canvas: its members are not highlighted, the rest are not dimmed, and the earlier selection (Valjean, "Selection 1") stays. The reader has to trust the legend color to know which dots are the group. | Step 10; 09.png and 10.png show the same canvas |
| 2   | 2        | behavior | The Analyze list opens on "Rank nodes and edges" (Degree, Betweenness, Katz, HITS...); the grouping methods are below the fold. The participant found them only by typing "group" into the filter.                                                                | Step 6, 06.png; step 7, 07.png                  |
| 3   | 2        | behavior | The bottom toolbar's icons carry no words; Analyze was found only by hovering for its tooltip. The left panel's hint "Analyze (Shift+A) to add results here" was on screen and not read.                                                                          | Steps 3 and 5, 03.png, 05.png, 06.png           |
| 4   | 1        | behavior | The group's Members list shows "First 10" of 20 with no visible way to see the rest. Enough for this task, not for a reader who wants the whole circle.                                                                                                           | Step 10, 10.png                                 |
| 5   | 1        | opinion  | No names on the dots, so characters cannot be read off the picture; only the side panel names them.                                                                                                                                                               | 03.png through 10.png                           |
| 6   | 1        | wording  | Words outside a newcomer's vocabulary: Louvain, Resolution, Degree, Density, Components; "Start here" was the only reason Louvain was picked, and Resolution was left alone because nothing says what it does.                                                    | 03.png, 04.png, 07.png, 08.png                  |
| 7   | 1        | behavior | The participant read the small pink group hanging off the bottom as "the less important characters". Nothing on screen says what a group's position means, and nothing corrects the guess. It did not enter the answer.                                           | Step 9 think-aloud, 09.png                      |

## Notes

- Usage card: declined ("No thanks") at step 2 without a detour; no belief about what is sent was
  stated.
- Ease (participant, 1-7 with 7 = very hard): 3, i.e. 5 on the studio's 7 = very easy scale.
- Build: 9d6598eea3e9, graphty@0.8.53.
