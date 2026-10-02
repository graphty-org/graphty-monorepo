# Round 7 grades: a note on Ana Ruiz's visits to building B1

The task: in a sample of a company's door swipes (412 people, 9 buildings, one edge per person and
building with a count of entries), keep a remark on Ana Ruiz's visits to building B1 -- the
connection, not her or the building alone -- saying the visits need checking against her badge
record.

What counts as success: the inspector of the edge Ana Ruiz -> B1 is open, and a note is saved on
that edge, shown in Notes with a chip naming the pair and the time it was written. Success with
difficulty: the edge is reached through the table or through Ana Ruiz's own inspector after first
trying to click the line on the canvas, or the end is reached after a wrong turn, a long search or
a hover hint. Failure: the note is attached to Ana Ruiz alone, to B1 alone (or, by the same logic,
to the whole graph), or the participant ends somewhere else.

The designed path is: the graph at rest -> the edge's inspector (Ana Ruiz -> B1, count 22, March 2
to March 27) -> Add note -> the Notes list with the new note.

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating.

## A limit of the test harness, stated once

The click-through tool can click, hover and press keys, but it cannot type text into a field. So
no participant could write the remark, and the Save button stayed disabled for all four. The
designed path's own last render (the Notes list) cannot show a newly saved note either. "Saved"
is therefore unobservable in this round for everyone. The grades below treat a composer that is
open and tagged with the right subject, plus the participant's stated intent to type and save, as
the end of the observable task. Studio decision: grade on the subject of the note, which is what
the failure condition is about, rather than fail every session on a step the harness cannot run.
Reason: the alternative records a tool limit as a design result.

Two other things the participants met are skeleton gaps, not design behavior, and are graded as
what the participant saw but reported separately below: clicking an edge row in the table shows
"Selects the edge 1001 - B1" but selects nothing (the row click is a stand-in that is not wired),
and the table's note-count badge jumps to the notes of a different sample file.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Cybersecurity analyst | success with difficulty | **success with difficulty** | Last screen (14.png): the edge inspector "Ana Ruiz -> B1, Edge, entries" with count 22 and 2026-03-02 to 2026-03-27, and a note composer tagged "Ana Ruiz -> B1". Got there on the fourth route: search box (no effect), table row click (selected nothing), N (composer tagged to the whole graph, which she caught by reading the chip), note-count badge (jumped to another file), then the chip on an existing note in the Notes list. Concluded correctly that the composer was on the connection and not on Ana Ruiz or B1. Could not type the text. |
| Intelligence analyst | success with difficulty | **success with difficulty** | Same end screen (10.png): edge inspector open, composer tagged "Ana Ruiz -> B1", Save gray only because no text went in. Same detours in nearly the same order: search, table and the Nodes tab to decode 1001 as Ana Ruiz, row click, N on the whole graph (caught), note badge into another file, then the existing note's chip. Concluded correctly. |
| Supply chain analyst | success with difficulty | **success with difficulty** | Same end screen (11.png). Same detours, plus a look at Selection ("Paints 0 nodes") that confirmed the row click had selected nothing. Caught the whole-graph tag on the N composer only because the existing note under it carried a different tag. Concluded correctly. |
| Alert reviewer | success with difficulty | **success with difficulty** | Same end screen (10.png): composer tagged "Ana Ruiz -> B1" on the edge's inspector. Same detours: search, table, Nodes tab, row click twice, the note badge into another file, N on the whole graph (caught). Concluded correctly, and said plainly that without the existing note she would have saved the remark on the whole graph and not noticed. |

**Tally: 0 success, 4 success with difficulty, 0 failure, 0 gave up (4 sessions).** Ease ratings
were 2, 3, 3 and 3 out of 7.

None of the four attached the note to the wrong subject. All four came within one keystroke of
doing so, and all four were saved by the subject chip at the top of the composer.

**Every success depended on seeded data.** All four reached the edge only by clicking the chip of
a note someone had already left on that edge ("The busiest pair: 22 entries, March 2 to March
27", tagged "Ana Ruiz -> B1 . entries"). No one found a way to the edge that would still exist if
that note were absent. Read the 4 of 4 as "found the edge because a colleague had already been
there", not as evidence that the edge is findable.

## What the sessions show

Counts are out of 4.

1. **Pressing N after picking a table row opens a note on the whole graph.** 4 of 4 did it. The
   row looked selected (blue, plus a confirmation popup), the composer opened, and its chip read
   "Door entries" -- the graph -- not the pair. All 4 caught it by reading the chip; 3 of 4 said
   that in a hurry they would have saved it there. Nielsen severity 4 (catastrophe): a remark
   filed on the wrong subject without any warning is exactly the failure the task names, and
   nothing but a small chip stands between the user and it. Part of this is the unwired row click
   (below); but the design question stands on its own: when the inspector and the table disagree
   about what is selected, which one does N follow, and does the composer say so loudly enough?

2. **The table row says it selects the edge and does not.** 4 of 4 clicked the 1001 -> B1 row
   (two of them twice) and saw "Selects the edge 1001 - B1" while the right panel stayed on the
   whole graph; two checked Selection and read "Paints 0 nodes". In the skeleton this row click
   is an unwired stand-in, so this is a fidelity gap, not a tested design. It still decided the
   session for everyone: the table was the first place all four went for the pair. Wiring the row
   click to open the edge's inspector is the single change that would most likely turn these four
   into plain successes. Severity 3 if the shipped design behaves the same way; not gradable as
   design until it is wired.

3. **The edge table shows ids, not names.** 4 of 4 had to open the Nodes tab to learn that 1001
   is Ana Ruiz, and 3 of 4 objected in their own words ("an XLOOKUP I shouldn't have to do in my
   head", "one wrong digit and I have papered the wrong person"). Severity 3 (major): this is a
   records-of-people dataset, and a note on the wrong pair is the risk the task is about. The
   edge table could show each end's label next to its id.

4. **The note-count badge in a table row opens a different file.** 4 of 4 clicked the "1" on the
   1001 -> B1 row to read its note and landed in the Les Miserables sample. All 4 read it as their
   data being swapped out; two said that at work they would have closed the tab. The badge sends
   to the general Notes list of another sample, which is a skeleton wiring bug, not a design
   choice. Severity 4 as experienced (loss of trust in the file); a one-line fix.

5. **"Find rows and notes" took no name.** 4 of 4 started by typing "Ana Ruiz" there. The
   harness cannot type, so this is mostly a tool limit, not a design result. It is still worth
   recording that the search box is everyone's first move for a named person: the designed path
   starts from the canvas, which no one tried. Not graded.

6. **No one tried the canvas.** 0 of 4 tried to click the line between Ana Ruiz and B1. With 421
   unlabeled gray nodes and 1,306 edges, every participant dismissed the picture as a hairball
   before doing anything. The rubric's expected stumble (click the line, fail, go to the table)
   never happened; the designed first step is not one these users would take.

7. **Ana Ruiz's own inspector was never used as a way to the pair.** 0 of 4 opened her node's
   inspector. The rubric's other recovery route went untested.

8. **The subject chip and the edge inspector worked.** 4 of 4 named the composer chip as the
   thing that kept them from a mistake, and 3 of 4 praised the edge inspector once they reached
   it (names, count, first and last date, "Add note" on it). This is the part of the design the
   round supports.

9. **An unlabeled strip of four icons appeared over the canvas when the edge was selected.** 1 of
   4 remarked on it ("no idea what they do"). Single voice; recorded, not weighted.

## What would change the grades

- Wire the table row click to open the edge's inspector, and fix the note badge's destination.
  Then rerun this task with the seeded note on the pair removed, so a success cannot come from a
  colleague's note.
- Give the harness a way to type into a field, so "saved, shown in Notes with the pair and its
  time" can be observed rather than assumed.
