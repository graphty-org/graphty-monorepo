# Grades: find Javert, read about him, see who he shares chapters with (round 8, task r8-t12)

Task given to participants: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Go to the police inspector Javert, read what the program knows about him, and see
which characters he shares chapters with."

Success state: open the Les Miserables sample, find Javert with Quick actions (Ctrl+K) or the
search box above the list (results appear after Enter), select him, read his Data tab (17
connections, group 4, PageRank #5 of 77, his memberships), then open the selection bar's
Neighborhood ("Neighborhood of Javert", "Covers: Javert and 17 neighbors") or right-click >
Neighborhood..., and name some of the 17 characters around him.

Success with difficulty: found him by clicking the drawing instead of searching, or read his ties
from the table or the drawing instead of Neighborhood, or more than two wrong turns. Failure: the
wrong character, or cannot say who he is tied to. Gave up: stopped before reaching the
neighborhood controls at all.

Each grade was checked against the participant's last renders, not only their own account.

## Result

| Participant | Their own grade | Graded | Read Javert's Data tab | Opened Neighborhood of Javert | Characters named, and from where |
|---|---|---|---|---|---|
| explorer-elena | failure | failure | yes | yes | Valjean only (path row) |
| recipe-recipient | gave-up | gave-up | no (lost him on the left-rail Data) | no | Valjean only (path row) |
| alert-reviewer | failure | failure | no (read his table row instead) | yes | Valjean only (path row, edge table) |
| class-project-student | failure | failure | yes | yes | Valjean only (a note) |
| nonprofit-operations-analyst | failure | failure | yes | yes | Valjean only (path row) |
| data-journalist | failure | failure | yes | yes | Valjean only (note, edge table) |
| intelligence-analyst | failure | failure | yes | yes | Valjean (edge table); Gavroche and Marius guessed from an unfiltered table |
| fraud-analyst | failure | failure | yes | yes | Valjean (edge table); Gavroche and Marius guessed from an unfiltered table |
| screen-reader-analyst | gave-up | failure | yes (by keyboard) | yes | Valjean only (note, edge table) |
| cybersecurity-analyst | failure | failure | no (never reached it) | yes | Valjean only (path row, edge table) |
| knowledge-engineer | gave-up | failure | yes | yes | Valjean only (edge table) |
| marketing-analyst | failure | failure | yes | yes | Valjean only (path row) |

Totals: 0 success, 0 success with difficulty, 11 failure, 1 gave up (12 participants).
Single Ease Question: 2 for ten participants, 3 for two (median 2 of 7).

Nobody completed the task. Two parts of it went reasonably: 9 of 12 read Javert's Data tab in the
end, and 11 of 12 found and opened "Neighborhood of Javert". The third part, naming the characters
he shares chapters with, failed for all 12. Every participant could name Valjean, and every one of
them got that name from somewhere other than the neighborhood: the "Valjean to Javert" path in the
list, a note, or the full edge table. Two participants named Gavroche and Marius as well, but they
read those names off the top of a table that still held all 77 characters sorted by degree, so
they were guessing, not reading an answer.

Where my grade differs from the participant's own: screen-reader-analyst and knowledge-engineer
called themselves "gave up". Both reached Neighborhood, used Filter to neighbors and then stopped
because they could not get the names. That matches the task's failure condition ("cannot say who
he is tied to"), so I graded them failure. I kept "gave up" only for recipe-recipient, who stopped
at the edge table without ever finding Javert's Data tab or the Neighborhood control.

## The main finding: the success state cannot deliver the answer

The designed end point of this task cannot answer the question the task asks. Even a participant
who followed the success path perfectly would have ended with a count and no names:

- The Neighborhood popover says "Covers: Javert and 17 neighbors" and lists no one. Nothing on
  the drawing changes while it is open: no rings on the 17, no labels, and the list's Selection
  row stays at 1 node (checked in alert-reviewer 15.png). The spec says Neighborhood "selects one
  hop", which would ring the 17 and let the reader see them or send them to the table. The
  skeleton does not draw that selection, so the payoff the task depends on is missing.
- Javert's Data tab gives "Degree 17, #4 of 77" and no list of neighbors. Valjean's degree is a
  blue link and Javert's is plain text (class-project-student 11.png against the reference
  render 04.png), so even the one way in that exists for Valjean is missing for Javert.
- "Filter to neighbors", which all 11 participants who opened the popover pressed, is where
  trust broke for every one of them. That collapse comes from how the skeleton was built, not from
  the design (see the next section).

All 12 sessions therefore end in failure, but this round cannot tell us whether the designed
neighborhood flow works. It shows that the skeleton does not show a neighborhood. Before this
task is run again, the skeleton should draw the one-hop selection (Javert plus 17 ringed,
Selection reading 18 after commit) and apply Filter to neighbors to the drawing and the table.

## Where the trouble comes from: design problems and skeleton defects

**Skeleton defects** (the skeleton falls back to a fixed state; a real build would not do this):

- After "Filter to neighbors" the top chip says "18 of 77 nodes", but the drawing still shows all
  77, the node table says "18 of 77 nodes" and "Rows 1 to 77 of 77" on the same line, and the
  edge table stays at 254. Seen by 11 of 11 who pressed it (for example data-journalist 16.png).
- In the same step the inspector switches from Javert to Valjean. 11 of 11 noticed it, and several
  called it the moment they stopped trusting the program (explorer-elena 19.png).
- Opening the "18 of 77 nodes" chip shows "40 of 77 nodes" and three degree and group filter steps
  the participant never made, with no "Neighbors of Javert" step. 6 participants opened it
  (alert-reviewer 19.png): alert-reviewer, class-project-student, nonprofit-operations-analyst,
  data-journalist, intelligence-analyst and cybersecurity-analyst.
- In the "Valjean to Javert" path details, the "To Javert" link and the "Javert end" member row
  both open Valjean. 5 participants hit this (explorer-elena, recipe-recipient,
  class-project-student, nonprofit-operations-analyst, intelligence-analyst); the Valjean page
  shows up because the inspector state is fixed on Valjean.
- Clicking a row of the filtered table, or visiting the Data section, silently drops the filter
  (screen-reader-analyst, marketing-analyst).
- The reference renders for this task's last two steps (shots/tasks/r8-t12/04.png and 05.png)
  show Valjean, not Javert. A live click-through does carry Javert through, but the reference
  pictures do not match the task.

**Design problems** (these would survive a faithful build):

- Two controls are called "Data": the left-rail section and the inspector tab. All 12 hit the
  rail first, which replaced the left panel and dropped Javert. The study tool always picks the
  first of two same-named controls, so it pushed participants onto the rail. But every participant
  reported the name clash on their own, and the rail button is larger and has an icon. Nielsen
  severity 3.
- Selecting a person opens the inspector on Style ("Why this look"), not on Data. All 12 said they
  wanted what is known about him, not why he is orange. One noticed that a node reached through a
  link opens on Data, so the tab the inspector opens on is also inconsistent. Severity 3.
- The selection bar's five icons have no labels. All 11 who found Neighborhood did so by hovering
  or guessing names; one needed more than fifteen guesses. Nobody used G, right-click or Ctrl+K.
  Severity 3.
- Neither the Neighborhood popover nor the Data tab names the neighbors (see the main finding).
  Several participants said a plain list of the 17 with shared-chapter counts is what would make
  them switch from a spreadsheet. Severity 4.
- The search box shows nothing until Enter. 8 participants typed and waited (explorer-elena,
  alert-reviewer, data-journalist, intelligence-analyst, fraud-analyst, knowledge-engineer,
  marketing-analyst, cybersecurity-analyst), and all 8 found Enter by trying it. The task's
  grading note asked for this to be logged. Severity 2.
- Clicking "Javert" on the opening screen selected the "Valjean to Javert" path row. 9
  participants did this. Part of it comes from the study tool: a click by name cannot reach a
  label drawn on the canvas, so it matched the list rows. Even so, the path row was the only
  "Javert" anyone could click on the opening screen. Severity 2; it needs checking by mouse.
- The edge table ignores the selection: with Javert selected it still lists all 254 edges. 9
  participants opened it hoping for his ties. Severity 3, given that most of them treated it as
  their fallback for the names.
- "group 4" (a file attribute) against "Group 4" (a membership), degree shown twice, and
  betweenness ranked for Valjean but folded under "2 more attributes" for Javert. 6 participants
  asked about one of these. Severity 2.

## Logged for the grading notes

- Typed and waited before pressing Enter: 8 participants (listed above).
- Expected the Selection row to read 18 while the Neighborhood popover was open: none said so.
  What they expected was that "Filter to neighbors" would visibly filter. That is a separate
  problem, listed above.
- One participant typed the name a key at a time (j, a, v, e). After Enter the box showed "Jav"
  and the results had no node row for Javert, only paths and notes (cybersecurity-analyst 14.png).
  This could be a study-tool artifact or a skeleton defect; it needs checking before it counts as
  a finding.

## Per participant

**explorer-elena -- failure.** Clicked the canvas name and got the path row, then the "To Javert"
link, which opened Valjean. Searched, waited, pressed Enter, selected Javert, hit the rail Data,
then reached his Data tab by keyboard. Found Neighborhood by guessing tooltip names, pressed
Filter to neighbors and saw the drawing unchanged and Valjean in the inspector. Ended on the
unfiltered table (20.png). Names only Valjean.

**recipe-recipient -- gave up.** Path row, then two Javert links that opened Valjean. Clicked the
search box but never typed. Selected Javert from the table, hit the rail Data and lost him. Never
found Neighborhood, never read his Data tab. Quit at the full edge table (13.png): "I'm done."

**alert-reviewer -- failure.** Path row, then searched, waited and pressed Enter. Rail Data lost
him, and the tool never reached his Data tab; she read his facts from the table row instead.
Hovered every icon, opened Neighborhood and filtered. Ended on the filter chip showing "40 of 77"
and three steps that were not hers (19.png). Names only Valjean.

**class-project-student -- failure.** Path row, then two Javert links that opened Valjean. Table,
rail Data, then his Data tab by keyboard, which she read in full. Opened all seven notes and found
Valjean, 17 chapters. Neighborhood, then filter, then the chip showing "40 of 77" (17.png). Would
"ask the TA." Names only Valjean.

**nonprofit-operations-analyst -- failure.** Path row, then two Javert links that opened Valjean.
Table, rail Data, then his Data tab by keyboard. Neighborhood, then filter, then the chip showing
"40 of 77", then the unfiltered edges (17.png). "I give up on getting the names." Names only
Valjean.

**data-journalist -- failure.** The cleanest search: box, type, wait, Enter, the node result. Rail
Data, then his Data tab by keyboard, read in full. Many guesses to find Neighborhood, then filter,
then the "18 of 77" table showing "Rows 1 to 77", then the chip showing "40 of 77" (18.png). Names
only Valjean.

**intelligence-analyst -- failure.** Path row, then three Javert links that opened Valjean.
Searched with Enter, reached his Data tab by going through a path first. Neighborhood, filter, the
table, the edges, then the chip showing "40 of 77" (19.png). Named Valjean from the edges and
guessed Gavroche and Marius from the top of the unfiltered table.

**fraud-analyst -- failure.** Searched with Enter, rail Data, then his Data tab by keyboard.
Neighborhood, filter, then the unfiltered node and edge tables (17.png). Named Valjean, plus
"maybe" Gavroche and Marius read off a table sorted by degree over all 77 characters. Said she
could not write down the 17 with any confidence.

**screen-reader-analyst -- failure.** Went to the table first, selected Javert, hit the rail Data,
reselected him. Found the icon names by hovering, opened Neighborhood and filtered, then lost the
filter twice (once through the Data section, once by clicking a row). Reached his Data tab with
Tab, arrow and Enter and read it in full (16.png to 18.png). Names only Valjean.

**cybersecurity-analyst -- failure.** Path row, table, rail Data, and never reached his Data tab.
Neighborhood, filter, unfiltered edges. Her search ("jave", typed a key at a time) came back
without a node row. Ended on the chip showing "40 of 77" (15.png). Names only Valjean.

**knowledge-engineer -- failure.** Path row, searched with Enter, rail Data, then his Data tab by
keyboard, with sharp questions about provenance. Found Neighborhood on the fifth name she guessed,
filtered, and stopped at the "18 of 77" table showing "Rows 1 to 77" (16.png). Names only Valjean.

**marketing-analyst -- failure.** Path row, searched with Enter, rail Data, then his Data tab by
keyboard. Neighborhood, then filter. Clicked a table row and the filter dropped back to "Full
graph", with Marius selected (16.png). Names only Valjean.
