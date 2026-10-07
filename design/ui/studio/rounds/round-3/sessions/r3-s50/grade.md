# Grade: session r3-s50 -- Nadia (alert reviewer), circles of characters (Les Miserables)

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), 1440 x 900, sighted
mode, empty start. Graded from the last screenshot (08.png) and the transcript; the task saves no
file and `downloads/` does not exist. Not graded from the participant's rating (6 of 7).

## Grade: S (success)

The success definition asks for a grouping run, the number of groups and the largest group's size
as the screen shows them, and three members of the largest group, each on screen before stated.

- **Grouping run:** Louvain, run at step 6 with the default resolution 1 (06.png).
- **Number of groups: 6.** Stated at step 6; the outline reads "Louvain 6" with six group rows, and
  the color key lists Group 1 to Group 6 (06.png, 08.png).
- **Largest group: 20.** Group 1 reads 20 in the outline (06.png); the group's Values tab reads
  "Size 20" (08.png). The six sizes (20, 17, 11, 11, 10, 8) add to 77, the node count.
- **Three members: Valjean, Fauchelevent, Bamatabois.** All three are in Group 1's Members list,
  "First 10", on 08.png, the screen on which she named them.

**Why S and not SD:** no wrong turn, no help, no tooltip. She hesitated twice (the Analyze list
opened on ranking methods; Group 1 opened on its Style tab) and each time took the next path step
herself. She never selected the run row, so she did not read the run's own Summary and Sizes; the
outline rows carry the same numbers, which the definition accepts ("as the screen shows them").

- **Build-decided:** no.
- **Void:** no. At step 7 the tool printed `ambiguous` for "Group 1" and took the outline row;
  answers.md expects that print and the row is what a person clicks.
- **Failure codes:** none.

## Counts

| | This session | Success path (round 3) |
|---|---|---|
| Steps | 7 after the start (steps 2-8) | 9 |
| Wrong turns | 0 | -- |

- Step 2 sends "No thanks" and the sample click in one command; the card is not a path step.
- She opened Analyze by clicking the flask (the hint in the outline points at it) instead of
  Shift+A, and typed "group" instead of "Louvain"; both reach the same list and form.
- She skipped the run row ("Louvain 6") and its Values, two path steps, because the outline rows
  already show the count and sizes. 7 steps for a 9-step path, 0.8x.
- Group 1 opening on Style (07.png) is on the path by the task's own rule: reading Style and going
  to Values for the members is not a wrong turn.

## False "done"

None. "There they are ... I have what I was asked for" (step 8) and the debrief answer (6 circles,
largest 20, Valjean, Fauchelevent, Bamatabois) match 08.png.

## Problems

| # | Problem | Severity | Kind | Evidence |
|---|---|---|---|---|
| 1 | The Analyze popover opens on "Rank nodes and edges" with PageRank tagged "Start here"; nothing about groups is on the first screen. She found the grouping methods only by typing "group" in the filter, and says a person who does not type would scroll or take PageRank. | 2 | behavior | step 3, 03.png; debrief |
| 2 | Clicking a group row opens its Style tab (a color field, "E69F00") instead of who is in it. She feared she might change the color by accident; the members are one tab over under Values. | 2 | behavior | step 7, 07.png; step 8, 08.png |
| 3 | Selecting Group 1 changes nothing on the drawing (no highlight of its 20 nodes), and no names are drawn, so she cannot tell which yellow node is Valjean. For a case file she wants the picture with names on it. | 2 | opinion | step 7, 06.png vs 07.png (identical canvas); debrief |
| 4 | The Members list reads "First 10" with no visible way to see the other ten members of a group of 20. | 1 | behavior | step 8, 08.png; debrief |
| 5 | Seven grouping methods with unexplained names; she chose Louvain only for its "Start here" tag and could not say why the answer is six or whether another method would differ. "Resolution 1" on the form means nothing to her. | 1 | opinion | steps 4-5, 04.png, 05.png; debrief |
| 6 | "Components 1" in the graph Overview, before any run, made her wonder briefly whether that was the circle count. | 1 | wording | step 2, 02.png |

No build defect: every control she used did what it showed, and the counts on screen agree with
each other and with the drawing (six key colors, six rows, sizes summing to 77). No repro was
written.
