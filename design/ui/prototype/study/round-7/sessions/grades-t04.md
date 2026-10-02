# Grades: look up Valjean, then narrow to him and his neighbors

The task: "Look up the character Valjean: what is recorded about him, how he stands on the
measures already worked out, and who appears right around him. Then narrow the whole picture to
him and the characters directly around him, so that every number describes only them."

The intended path: click Valjean (or find him with the search box), open the Data tab of his
panel on the right and read his values and his rank on each measure, open Neighborhood from the
bar that appears over the canvas when he is selected, and press Filter to neighbors, so the
count in the top bar reads "37 of 77 nodes".

Grading rule: success means his panel's Data tab was read, Neighborhood was opened from that bar,
and Filter to neighbors was applied. Success with difficulty means the end state was reached
after a wrong turn, a long search or a hover hint. Failure means they ended somewhere else, or
hid the others and reported that the counts now describe only his neighborhood. Grades go by what
was on screen at the end and what they concluded, not by how they rated themselves.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Criminal intelligence analyst | failure | success with difficulty | Filter applied, top bar "37 of 77 nodes" (07.png). Never read his panel's Data tab: "Data" took him to the Data section on the left rail twice, so he read the measures from the Table instead. Found Neighborhood only after guessing four names for the unlabeled icon. Concluded correctly that the table and legend still describe the full graph. |
| Gephi user | failure | success with difficulty | Same end state (07.png), same Data mix-up, same guesswork on the icon (three wrong names first). Read the measures from the Table. Concluded correctly that nothing was recomputed. Then lost time trying to rebuild the filter in the Data section and to re-run the measures. |
| Screen-reader analyst | failure | success with difficulty | The only one who read his panel's Data tab (07.png: id, group, PageRank #1 of 77, betweenness, degree, bridges, memberships, 2 notes), after first landing in the left-rail Data section. Reached Neighborhood by keyboard, by tabbing from the canvas, and applied the filter (12.png, "37 of 77 nodes"). Concluded correctly that every number is still out of 77. |
| First-time explorer | failure | success with difficulty | Filter applied (09.png). Hit the wrong "Data" twice, read the measures from the Table, found Neighborhood only by guessing names while resting on the icons. Concluded correctly that the numbers were not redone. |
| Recipe recipient | failure | success with difficulty | Filter applied (09.png, "37 of 77 nodes"). Hit the wrong "Data", read the measures from the Table, never found the icon bar's Neighborhood; reached "Neighborhood..." through the three-dots menu on his panel instead. Concluded correctly that the table still says 77 nodes and full graph. |

Totals: 0 success, 5 success with difficulty, 0 failure, 0 gave up. Every participant rated it a
failure (ease scores 2, 2, 2, 3, 3 out of 7), and every one gave the same reason. That reason is
a design finding, not a participant error (first finding below).

## Findings

1. **The end state does not do what the task promises, and all five noticed (5 of 5).** The task
   says "every number describes only them". After Filter to neighbors, the top bar says 37 of 77,
   but the legend ranges (PageRank 0.0033 to 0.0754, size 1 to 36), the table ("77 nodes",
   columns "(full graph)") and his panel ("#1 of 77") are unchanged. The intended final screen
   (shots/tasks/t04/06.png) looks the same. Nothing says whether these numbers will be
   recomputed, or how to recompute them on the 37. Either the task wording overpromises or the
   design is missing a "recompute on this subset" step and a scope label on the legend. Severity
   3 (major). Every participant marked themselves as failed for this reason alone, so it decides
   whether the task feels finished at all.
2. **Two controls named "Data" (5 of 5).** The left-rail section and the tab on his panel share
   the name. Choosing "Data" while Valjean was selected opened the Data section, cleared the
   selection and replaced his panel with the whole-graph summary. Four of five never got back to
   his panel's Data tab, so they never saw his id, notes, memberships or bridges. Severity 3.
   Caveat: the study tool's --click picks the first control with that name, so part of this is
   down to the tool. Even so, a screen reader announces "Data" twice, and the screen-reader
   analyst said exactly that.
3. **The icons on the selection bar have no visible labels (4 of 4 who used it; the fifth never
   found it).** Three participants guessed between two and four names before "Neighborhood"
   matched. The recipe recipient gave up on the icons and used the three-dots menu, where
   "Neighborhood..." sits in the same list as Delete. Severity 3.
4. **The Neighborhood preview does not show who the neighbors are (4 of 5).** "Selected: Valjean
   and his 36 neighbors" gives a count but no names, and the non-neighbors are not dimmed, so
   "who appears right around him" cannot be answered without squinting at labels. Severity 2.
5. **The left tree says "Selection 1" while the popover says 37 are selected (2 of 5).**
   Severity 2.
6. **Betweenness is 0.570 in the table and 0.419 "#1-#2 on 60 of 77" in his panel (1 of 5, the
   screen-reader analyst; the others never reached his panel).** The panel also says the data
   comes "From miserables.json" while the source is miserables.gexf. One participant, but this is
   a factual contradiction anyone who reads both places will meet. Severity 2.
7. **"Add as steps" means nothing to anyone (4 of 4 who read it).** "One group per hop" produced
   no visible change. Severity 2.

## Prototype fidelity, not design findings

These come from the prototype jumping to a fixed screen for each route, and they say nothing
about the design. They should still be fixed in the prototype, because they cost every
participant trust and time:

- Opening the Data section, Analyze, or a tree row after filtering showed "Full graph" and "No
  filters": the filter appeared to vanish (5 of 5).
- Clicking the "37 of 77 nodes" chip opened a different example dataset ("Transfers, March 2026",
  812 of 3,000 nodes) (4 of 5). Each of the four said that on real data they would have closed
  the tab. The chip should open the Les Miserables filter list with "Neighbors of Valjean, 1 hop"
  in it.
- In the Data section, "Neighbors of the selection" stayed unavailable because going to that
  section clears the selection (2 of 5). This may also be a real design problem: if selection
  does not carry across sections, this filter step can never be built from the Data section.
  Retest once the prototype keeps state.

## What worked (4 or more of 5)

- The sentence above the table, "Valjean is first on all three measures; Gavroche is in the top 3
  on all three", was the most quoted thing in the round (5 of 5).
- "(full graph)" in the column headers was praised by the Gephi user and the screen-reader
  analyst. It is also what let all five see that the filter had not changed the numbers.
- "Filter to neighbors" was understood at first reading, and the Undo on its message was noticed
  (5 of 5).
