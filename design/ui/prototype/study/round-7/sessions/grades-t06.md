# Grades: two reminders, one on the Javert -- Valjean tie, one on Myriel's circle

The task: "Leave two reminders for next week: one about the tie between Javert and Valjean
itself (the two share many chapters), and one about the whole circle of characters around the
bishop Myriel. You have never typed your name into this program."

The intended path: select the Javert -- Valjean edge (from a node's panel, the Edges table at the
bottom, or a node's menu -- edges cannot be clicked on the canvas), add a note to it, then select
Community 3 (the Louvain group that holds Myriel) and add a note to it. Both notes then show at
the top of the Notes panel with their chips and "Just now".

Grading rule: success means both notes were saved on the right subjects, the edge itself and
Community 3. Success with difficulty means one of them reached its subject only after a detour.
Failure means the edge note was attached to the two people rather than their tie without the
participant noticing, or the group note was attached to the whole Louvain run. Grades go by what
was on screen at the end and what they concluded, not by how they rated themselves.

## A caveat that applies to four of the five sessions

The study tool has no command for typing text. It types only one key per step. Four participants
tried a typing command that does not exist, so their note boxes stayed empty and Save stayed
gray. They never saved a note, and each of their click-throughs started again from the opening
screen, so the two notes never appeared together in one list. The fifth participant, the
first-time explorer, typed one key at a time and saved both notes (30.png: "Bishop circle" on
Community 3 and "Recheck chapters" on Javert -- Valjean, both "Just now"). That proves the box
takes focus when it opens and that Save works. The other four were graded on the subject chip
of the note box they had open at the end, because the unsaved text was the tool's limit, not the
design's. Counted strictly, the full end state was seen in 1 session of 5.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Expert data scientist | success with difficulty | success with difficulty (save not seen) | Edge: the Edges table, then the row, then N; the note box is tagged "Javert -- Valjean" (06.png). Group: she wanted Myriel's direct neighbors, guessed seven names before finding "Neighborhood", and it opened "Neighborhood of Valjean" while Myriel was selected (16.png), so she dropped it. Her first group note went on the whole Louvain run; she noticed and corrected it to Community 3 through the Louvain table (20.png). Concluded correctly that the second note sits on a Louvain group number, which she called a stand-in for what she meant. |
| Marketing analyst | success with difficulty | success with difficulty (save not seen) | First Add note went on the whole graph; he noticed. Reached the edge only through the "Javert -- Valjean" chip on someone else's note (05.png, box tagged with the edge). Clicking "Myriel" selected the "Myriel to Javert" path. Picked Community 3 because an older note said so, not because the tool showed Myriel in it; N on the group gave a box tagged "Community 3" (13.png). |
| Genomics Cytoscape user | success with difficulty | success with difficulty (save not seen) | The same route as the marketing analyst: whole-graph tag first and noticed, then the old note's edge chip (05.png), then the old note's "Community 3" chip and Add note (12.png). Could not find Myriel's own row, and would not click the unlabeled icons. Concluded, rightly, that she was only "fairly sure" Community 3 is his circle. |
| First-time explorer | success with difficulty | success with difficulty | The only one who saved both (30.png). Edge: Edges table, row, the "Add note" icon on the bar over the canvas (09.png, tagged "Javert -- Valjean"). Group: the three-dots menu on Myriel opened a "Community 3" menu; one try tagged a note "Myriel" alone while the panel said "Valjean" (26.png), so she cancelled it; then the Louvain table, Community 3, N, typed, Save. Picked Community 3 because an old note said so and the count matched (10 connections, 10 members). |
| Knowledge engineer | success with difficulty | success with difficulty (save not seen) | Edge through the old note's chip (05.png). Selected Community 3 in the Louvain table, but opening the Notes panel dropped the selection and the note box was tagged with the whole graph (13.png); she noticed. Recovered with the old note's "Community 3" chip (15.png). Concluded correctly that the group is an algorithm's partition, not Myriel's neighbors. |

Totals: 0 success, 5 success with difficulty, 0 failure, 0 gave up. All five agree with their
own verdicts. Nobody left the edge note on the two people, and nobody left the group note on the
whole Louvain run without noticing. One participant did each of the wrong-subject mistakes the
failure rule describes and corrected it: the expert on the Louvain run, the knowledge engineer on
the whole graph. The design's guard against a wrong subject is the chip in the note box, and it
worked every time.

## Findings

1. **Nobody could see who is in Community 3 (5 of 5).** Selecting the group says "Paints 10
   nodes" and "Covered for Color by PageRank", and the canvas stays all orange. All five chose
   Community 3 because an older note said "Myriel's household", and three also matched the
   count of 10 to Myriel's 10 connections. Without that note, nothing on screen ties Myriel to
   Community 3. The success path is reached by trusting a stranger's note. Severity 3 (major).
   The fix belongs to selection, not to Notes: a selected group should outline or list its
   members even when another layer owns the color, and Myriel's own panel should name his group.
2. **"The circle around Myriel" meant his direct neighbors to 3 of 5, and the task's target is a
   Louvain group (5 of 5 questioned it).** The expert, the knowledge engineer and the genomics
   user each said the circle should be his neighbors, not a modularity partition. The other two
   doubted that "community" means "everyone around him". The task wording points at a
   neighborhood and the grading points at a group. Either reword the task ("the group the
   clustering put Myriel in") or accept a note on Myriel's neighborhood as a success. Severity 2
   as a study-design issue. The product question is whether a neighborhood can be a note's
   subject at all; nobody found a way.
3. **Add note with nothing selected attaches to the whole graph (5 of 5 hit it; once more for the
   knowledge engineer after her selection was lost).** The plus in the Notes header gave "Co-appearances" every time. All
   noticed the chip and cancelled, so this cost time rather than causing wrong notes. The chip
   has only an x; there is no way to pick a different subject from inside the box. Severity 2.
4. **Opening the Notes panel dropped the selection (1 of 1 who tried it, the knowledge
   engineer).** She selected Community 3, opened Notes, and the box was tagged with the whole
   graph. Select first and then go to Notes is the natural order, and it silently changes the
   subject. Severity 3: this is how a note lands on the wrong subject unnoticed.
5. **Three of five reached the edge only through an older note's chip.** The marketing analyst
   and the knowledge engineer both said that without it they would not have known how to pick an
   edge. The two who used the Edges table found it quickly. In a file with no notes yet, the
   Edges table is the only route anyone tried. Severity 2.
6. **Neighborhood answered for the wrong node (1 of 1 who opened it, the expert).** With Myriel
   selected, the popover said "Neighborhood of Valjean ... Valjean and his 36 neighbors"
   (16.png). This is most likely a fixed popover in the skeleton rather than a design choice, but
   it cost the only participant who tried the route the task wording suggests. Fix the skeleton
   before the next round; until then it is a fidelity defect, not a finding about the design.
7. **What is selected disagreed between panels (1 of 5).** The explorer's three-dots menu on
   Myriel opened a "Community 3" menu, and a later note box was tagged "Myriel" while the panel
   on the right said "Valjean" (24.png, 26.png). Likely the skeleton's fixed states again; note
   it, check it, do not count it as design evidence.
8. **"Myriel" in the left list selected the "Myriel to Javert" path (3 of 5).** The expert, the
   marketing analyst and the knowledge engineer all clicked the name expecting the person.
   Severity 2.
9. **No author and no date on notes (4 of 5 mentioned it).** The task said "you have never typed
   your name", and nothing asked. Four wondered whose name the note would carry; the explorer
   added that a reminder with no date is just a note. No one was blocked. Severity 1 for this
   task; it matters more for shared files.
10. **The left list's "group" swatches and Louvain's community colors share one palette (2 of 5:
    the explorer and the knowledge engineer).** Javert's file group 4 is the same green as
    Community 3, which made both doubt whether Javert is in Myriel's circle. Severity 2.
11. **Add note sits in different places for an edge and a group (1 of 5, the knowledge
    engineer).** It is under the edge's Data tab; a group's panel opens on Style, where there is
    none. The keyboard shortcut N worked for everyone who tried it. Severity 1.
12. **Choosing "Data" while something was selected went to the Data section
    on the left and dropped the selection (3 of 5).** This is the same two-controls-named-Data
    problem seen in an earlier task's grades, and partly the study tool's first-match click.

## For the next round

- Give the study tool a way to type text, or tell every participant to type one key at a time,
  so the save step is observed in every session.
- Remove the older notes on Javert -- Valjean and Community 3 from this task's starting state, or
  run a variant without them. Three participants found the edge, and all five found the group,
  by clicking those notes. With them present, this task measures following a breadcrumb, not
  finding a subject.
