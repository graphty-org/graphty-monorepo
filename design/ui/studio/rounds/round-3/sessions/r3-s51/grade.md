# Grade: session r3-s51 -- Dana (supply chain risk analyst), circles of characters (Les Miserables)

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), 1440 x 900, sighted
mode, empty start. Graded from the last screenshot (08.png) and the transcript; the task saves no
file and `downloads/` does not exist. Not graded from the participant's rating (5 of 7).

## Grade: S (success)

The success definition asks for a grouping run, the number of groups and the largest group's size
as the screen shows them, and three members of the largest group, each on screen before stated.

- **Grouping run:** Louvain, run at step 5 with the default resolution 1 (05.png, 06.png).
- **Number of groups: 6.** Stated at step 5; the outline reads "Louvain 6" with six group rows,
  and the color key lists Group 1 to Group 6 (06.png, 08.png).
- **Largest group: 20.** Group 1 reads 20 in the outline (06.png); its Values tab reads "Size 20"
  (08.png). The six sizes (20, 17, 11, 11, 10, 8) add to 77, the node count.
- **Three members: Valjean, MlleBaptistine, MmeMagloire.** All three are in Group 1's Members list,
  "First 10", on 08.png, the screen on which she named them.

**Why S and not SD:** no wrong turn, no help, no tooltip, all three members named. She hesitated
at "Components 1", at the ranking-only Analyze list and at Group 1 opening on Style, and each time
took the next path step herself. She never selected the run row, so she did not read the run's own
Summary and Sizes; the outline rows carry the same numbers, which the definition accepts ("as the
screen shows them").

- **Build-decided:** no.
- **Void:** no tool fault; every command did what was asked.
- **Failure codes:** none.

## Counts

|             | This session  | Success path (round 3) |
| ----------- | ------------- | ---------------------- |
| Steps       | 7 (steps 1-7) | 9                      |
| Wrong turns | 0             | --                     |

- Step 1 sends "No thanks" and the sample click in one command; the card is not a path step.
- She opened Analyze by clicking the flask (the outline hint points at it) instead of Shift+A, and
  typed "group" instead of "Louvain"; both reach the same list and form.
- She skipped the run row ("Louvain 6") and its Values, two path steps, because the outline rows
  already show the count and sizes. 7 steps for a 9-step path, about 0.8x.
- Group 1 opening on Style (07.png) is on the path by the task's own rule: reading Style and going
  to Values for the members is not a wrong turn.

## False "done"

None. "That's my answer" (step 7) and the debrief answer (6 circles, largest 20, Valjean,
MlleBaptistine, MmeMagloire) match 08.png. She also noted, correctly, that only 10 of the 20
members are listed.

## Problems

Problems 1-6 match what the other participant on this task met (r3-s50), so they are confirmed.

| #   | Problem                                                                                                                                                                                                                                                                                    | Severity | Kind          | Evidence                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------- | ---------------------------------------------------- |
| 1   | The Analyze popover opens on "Rank nodes and edges" with PageRank tagged "Start here"; nothing about groups is on the first screen. She found the grouping methods only by typing "group" in the filter, and says that without typing she would have been scrolling math terms. Confirmed. | 2        | behavior      | step 2, 03.png; step 3, 04.png; debrief              |
| 2   | Clicking a group row opens its Style tab (a color field, "E69F00") instead of who is in it ("I asked who's in the group and it offers me a color picker"); the members are one tab over under Values, which she had to guess. Confirmed.                                                   | 2        | behavior      | step 6, 07.png; step 7, 08.png                       |
| 3   | Selecting Group 1 changes nothing on the drawing (no highlight of its 20 nodes) and no names are drawn, so the picture did not help her answer anything. Confirmed.                                                                                                                        | 2        | opinion       | step 6, 06.png vs 07.png (identical canvas); debrief |
| 4   | The Members list reads "First 10" with no visible way to see the other ten members of a group of 20, or to copy the list out to a spreadsheet. Confirmed.                                                                                                                                  | 1        | behavior      | step 7, 08.png; debrief                              |
| 5   | Seven grouping methods with unexplained names; she took Louvain only for its "Start here" tag and asks which number goes in front of a VP if another method gives 5. "Resolution" on the form means nothing to her ("like screen resolution?"). Confirmed.                                 | 1        | opinion       | steps 3-4, 04.png, 05.png; debrief                   |
| 6   | "Components 1" in the graph Overview, before any run, made her wonder whether that was the circle count -- two different words for group-like things. Confirmed.                                                                                                                           | 1        | wording       | step 1, 02.png                                       |
| 7   | Small gray secondary text (method descriptions, "Under a second", "First 10") is hard to read without glasses. Seen in this participant only.                                                                                                                                              | 1        | accessibility | 03.png, 05.png, 08.png; debrief                      |

No build defect: every control she used did what it showed, and the counts on screen agree with
each other and with the drawing (six key colors, six rows, sizes summing to 77). No repro was
written.

**What worked:** "Files are read on this computer and never uploaded" on the start page answered
her IT question before she asked it; the filter box found the grouping methods from a plain word;
the run came back as a sorted list with counts.
