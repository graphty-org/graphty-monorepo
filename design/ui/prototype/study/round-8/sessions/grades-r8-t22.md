# Grades: a note on a character and a note on a tie, with no name set

Task given to participants: "The Les Miserables network is open (example data, not your own).
Leave yourself two reminders for later: one on Valjean (why he matters to your reading) and one on
the tie between Javert and Valjean. Then check that each reminder sits with the right thing and say
when it was written."

What counts as success: the participant selects Valjean and uses Add note (the N key, the floating
selection bar, the menu, or the plus at the top of the Notes panel); the writing box shows "Note on:
Valjean"; once saved, the note is listed with its Valjean chip, date and time; the participant then
selects the Javert -- Valjean edge, adds a second note to it, reads the date and time on both, and
says whether a name is recorded. Writing the first note with nothing selected and then moving it,
or hunting for a name box, is success with difficulty. A note filed on the wrong thing without
noticing, or no second note, is failure.

Expected path: start screen -> Valjean selected -> writing box "Note on: Valjean" -> saved note in
the list -> Javert -- Valjean edge selected -> second note saved. Reference renders:
shots/tasks/r8-t22/01.png to 06.png.

## Results

| Participant | Their own call | Grade | How they selected the edge | Read date and time | Said whether a name is recorded | SEQ |
|---|---|---|---|---|---|---|
| Criminal intelligence analyst | success with difficulty | **success with difficulty** | chip on an older example note, after 4 misses in the Edges table | yes | yes: "no author", wants it on by default | 4 |
| Data journalist | success with difficulty | **success with difficulty** | Edges table row, after switching the left panel back to Graph (4 misses first) | yes | yes: "No name on either note" | 5 |
| Recipe recipient (lab manager) | success with difficulty | **success with difficulty** | chip on an older example note, after 2 misses | yes | yes: "saved without a name -- will anyone know which are mine?" | 4 |
| Genomics postdoc (Cytoscape user) | success with difficulty | **success with difficulty** | Edges table row, after switching the left panel back to Graph (3 misses first) | yes | yes: "saved without a name" | 5 |
| Screen-reader analyst | success with difficulty | **success with difficulty** | chip on an older example note, after 3 misses | yes | **no** (never said) | 4 |
| Explorer (dashboard user) | success with difficulty | **success with difficulty** | chip on an older example note, after 2 misses | yes | yes, while writing: "saved without a name ... fine, it's just for me" | 5 |

Totals: 0 success, 6 success with difficulty, 0 failure, 0 gave up. Six of six ended with two
notes, one on the node Valjean and one on the edge Javert -- Valjean, each confirmed by its chip
and by a count that went up (the edge's own count went from 1 to 2 in all six; the node table's
Valjean count went to 3 where they looked). Nobody filed a note on the wrong thing without
noticing. Mean Single Ease Question 4.5 of 7 (4, 5, 4, 5, 4, 5).

All six grades agree with the participants' own calls. The difficulty is the same in every
session: selecting the edge. Selecting Valjean and writing his note was first-try for four of six
and second-try for the other two.

## Why each grade

- **Criminal intelligence analyst -- success with difficulty.** Valjean, hover, Add note, save:
  clean ("Oct 2, 2026, 19:28", chip Valjean). The edge took four failed tries in the Edges table
  (one landed on Javert the person, one on the Courfeyrac -- Enjolras row, one did nothing he
  could see) before he clicked the "Javert -- Valjean" chip on an older example note. His final
  render (09.png) shows both of his notes at the top of the list with their chips and times, and
  the edge's Data tab reading "2 notes". He named the gap himself: "I got here through somebody
  else's old note, which is luck, not design."
- **Data journalist -- success with difficulty.** Valjean note first try. The edge: clicking
  "Javert" in the Edges table first grabbed a Javert chip in the Notes list beside it, then three
  misses; she switched the left panel back to Graph and the table row selected the edge. Final
  render (11.png): both notes listed with chips and "Oct 2, 2026, 19:29", the Javert -- Valjean
  row's Notes cell at 2, inspector on the edge. She said plainly that no name is on either note.
- **Recipe recipient -- success with difficulty.** Opened Notes first and pressed the plus with
  nothing selected: the box read "Note on: PageRank". He caught it ("I didn't choose PageRank")
  and started over by clicking Valjean first -- the case the criteria name. Two misses on the edge
  row, then the chip on an older note. Final render (14.png) is the success state: both notes,
  chips, "Oct 2, 2026, 19:31", the edge's Data tab at "2 notes". His later attempt to see the note
  count on Valjean's own panel sent him to the Data section instead of the inspector's Data tab;
  that does not change the grade.
- **Genomics postdoc -- success with difficulty.** Valjean note clean. Three misses on the edge
  row while the Notes panel was open, then the row worked once the left panel was back on Graph.
  Final render (10.png) matches the success state, and she cross-checked in both tables (Valjean
  3 notes, Javert still 1, the edge row 2), which is the most thorough check of the six.
- **Screen-reader analyst -- success with difficulty.** Like the recipe recipient, the first Add
  note (from the Notes panel) aimed at PageRank; caught and redone after selecting Valjean in the
  table. Three dead ends on the edge row, then the chip on an older note. Final renders (14.png
  for the notes, 17.png for Valjean's Data tab reading "3 notes") are correct, and the stated
  dates and times are right. The one part of the criteria missed: never said whether a name is
  recorded. With the rest done, that is a gap in the answer, not a failure.
- **Explorer -- success with difficulty.** Valjean note clean. Two misses on the edge row, then the
  chip on an older note. Final render (12.png) is the success state. She read the no-name line
  while writing the first note and accepted it.

## Findings, with evidence counts

Nielsen severity: 0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe.

1. **No dependable way to select one particular edge. Severity 3. Seen in 6 of 6.** On the canvas
   Javert sits almost on top of Valjean, so the line between them is a few pixels long; all six
   refused to try clicking it. In the Edges table, every participant's first click on the row
   failed. Two got the row to work after closing the Notes panel; the other four reached the edge
   only through a chip on an example note that happened to be about this tie. Four said they would
   have been stuck without that note. Caveat about the mock: some of these misses come from the
   study tool, which clicks by visible text and hit the Javert chip in the Notes list before the
   table row. The part that is the product: the table row has no name that assistive technology
   (or the tool) can reach ("Javert Valjean 1 17" matched nothing for three participants), and the
   same name is a different clickable thing in three places. The explorer asked for "add a note
   about the connection between these two" when two people are selected; that idea comes from one
   participant only.
2. **The plus at the top of Notes, pressed with no node or edge selected, files the note on
   whatever was highlighted (PageRank). Severity 2. Seen in 2 of 2 who started from the Notes
   panel.** Both caught it because "Note on: PageRank" is printed above the writing box, which is
   that line doing its job; both called it a trap. Four of six started from the node and never
   met it.
3. **Notes are unsigned by default. Severity 2. Raised by 4 of 6.** Not a usability failure -- the
   line under the writing box says so and everyone who read it understood. But the analyst wants
   an author stamped by default for case files, and the recipe recipient asked how anyone would
   tell whose notes are whose when a file is passed around; the genomics postdoc could tell hers
   from the example notes only by date. One (the analyst) also wants a time zone on the timestamp.
4. **Two notes "about both people" and "about the tie" look nearly the same. Severity 2. Raised by
   2 of 6.** The example note tagged with two person chips (Valjean, Javert) and the one tagged
   with the edge chip (Javert -- Valjean) differ only by a small icon. Both who noticed said they
   would not see the difference when skimming.
5. **Same words for different controls. Severity 2. 3 of 6 affected.** "Data" is both the left
   rail section and the inspector's tab: the explorer and the recipe recipient clicked it to see
   Valjean's note count and were taken to the Data section instead. The screen-reader analyst also
   listed "Notes" twice, "Add note" twice and "Valjean" six times as names a screen-reader user
   cannot tell apart.
6. **"Open in Notes" shows every note, not the selected thing's notes. Severity 2. Seen by 1 of
   6** (tried twice: count says 3, list says 9). Single voice; worth checking in another task.
7. **Two different note counts with no explanation. Severity 2. 1 of 6.** The Graph panel's
   "Notes 4 items" next to the Notes panel's "9 notes in this graph" made the genomics postdoc
   doubt the count. Single voice.
8. **The edge's Notes summary shows a date with one note and none with two. Severity 1. 1 of 6.**
9. **The floating selection bar's icons have no words. Severity 1. 5 of 6 hovered before
   clicking.** The tooltip "Add note N" settled it every time; nobody misclicked.

What worked, by count: "Note on: <thing>" shown before typing was praised by 6 of 6 and caught the
wrong-target case 2 of 2 times. The chip on each saved note, with a line icon for an edge and a
dot icon for a node, was how 6 of 6 checked the attachment. The Notes column in the tables was
the check three participants said they trust most.

## Not graded: comments on the current skeleton

- **The inspector tab after saving.** With the edge selected from the table (journalist,
  genomics), the inspector stayed on Style and the bottom table stayed on Edges. With the edge
  selected from a note chip (the other four), the inspector showed Data and the bottom table had
  gone back to Nodes. After Valjean was selected again following a save, the inspector opened on
  Style: the explorer looked for Valjean's note count there and did not find it, and the
  screen-reader analyst had to arrow over to Data to read "3 notes". The Nodes snap-back cost
  three participants their place in the Edges table during the search.
- **The Selection row reading "1 node" while an edge is selected.** No participant saw it: every
  one had the left panel on Notes whenever the edge was selected. It went untested here, not
  unconfirmed.
- **The Notes column counts notes saved in the session.** Six of six saw the edge row go from 1 to
  2, and those who looked saw Valjean go from 2 to 3; nobody read a stale count.
- **Timestamps that move.** Every replay re-saves the notes, so times changed between looks
  (19:26 to 19:31). Four participants noticed. This is a property of the study tool, not of the
  product, and is not a finding.
