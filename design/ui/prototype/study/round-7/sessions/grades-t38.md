# Round 7 grades: rename the two report groups (Les Miserables)

Task as given: "The group of 14 characters in your report folder is called something meaningless.
Call it something meaningful, then do the same for the next group."

Grading bar:

- Success: a double-click (or F2) on the row's name opens it for editing, Enter saves, and Tab
  moves to the next row's name.
- Success with difficulty: does it through the right-click menu (or reaches the same screens after
  a wrong turn or a long search).
- Failure: cannot change the name, or changes the run's name (a Louvain community) instead of the
  group's.

The target end screen: "Group 2" in the "For the report" folder renamed, and the "Group 8" row
below it open as a name box with its old name selected.

Grades go by what ended on screen and what the participant concluded, not by how sure they felt.

## Grades

| Participant | Their own call | Grade | Where they ended | How they found the rename |
|---|---|---|---|---|
| Curious first-timer (Elena) | success with difficulty | success with difficulty | Group 8 open as a name box, old name selected | F2, read off a "More actions" menu that opened for Community 3 |
| Genomics postdoc (Maren) | success with difficulty | success with difficulty | Group 8 open as a name box, old name selected | the same: F2 from the menu that opened for Community 3 |
| Intelligence analyst (Marcus) | success with difficulty | success with difficulty | Group 8 open as a name box, old name selected | the same: F2 from the menu that opened for Community 3 |

Totals: 0 success, 3 success with difficulty, 0 failure, 0 gave up. All three opened both report
groups for renaming with F2 and none touched a Louvain community's name. None found the rename
on the row itself: nobody tried a double-click, nobody saw a Rename control on the row or in the
right panel, and all three learned the F2 key only from the grayed Rename item in a menu that
opened for a different row. None used Tab to move to the next name; all three closed the first
box and clicked Group 8 instead, which reaches the same end screen.

## Why each grade

**Curious first-timer -- success with difficulty.** Looked for a Rename button (none), clicked the
selected row a second time (nothing happened; this was a single click, not a double-click), then
opened "More actions". The menu was for Community 3, its Rename grayed out, but it showed "F2".
Back on Group 2, F2 opened the name box (render 07); the final render (12) shows Group 8 open with
its name selected. She chose "Valjean's circle" and "Barricade students" from the node table's
group column and her memory of the story, not from anything the app showed about the group.
Search through the wrong row's menu is the long-search case of the middle grade.

**Genomics postdoc -- success with difficulty.** Same route: hover on the dots, menu for Community
3, F2 learned there, F2 on Group 2 (render 05), Group 8 open at the end (render 09). Her typed name
never appeared (see the evidence limit below), and she said she was "not fully sure it saved".
She also named the first group by guessing who was in it. Neither changes the grade: she ended on
the target screen and did not conclude wrongly.

**Intelligence analyst -- success with difficulty.** Read the members off the full node table
first, then the same menu detour to F2, then F2 on Group 2 (render 06) and Group 8 (render 11).
He correctly read the grayed Rename as "computed groups can't be named; mine are a different
kind", the one participant to make sense of that note. He raised a real question nobody on screen
answered: the group is "set from the attribute group", so does renaming it rename only the row,
or rewrite the "group" value on fourteen records?

## Evidence limits

- The click-through tool does not type text. Every participant's "type, then Enter" left the old
  name in place (Elena 10, Maren 06, Marcus 09). So the "Enter saves" step of the success path was
  never observed by anyone; the grades count an open box with the old name selected as reaching
  the rename, as the moderator notes in two transcripts say. The intended result is shown in
  shots/tasks/t38/03.png ("Valjean's family" saved, Group 8 open).
- Tab does work in the skeleton: a grader check (F2 on Group 2, then Tab) moves the name box to
  Group 8. It was never tried, so the study says nothing about whether people expect it.

## Problems seen, with counts

1. **No visible way to rename a row (3 of 3).** No Rename on the row or in the right panel; a
   second single click does nothing; F2 is shown only inside a menu. Every participant found it by
   accident. Severity 3 (major): it turned a two-second job into the hardest step.
2. **The row's menu opens for the wrong row (3 of 3).** "More actions" for the selected Group 2
   opened a menu titled Community 3, expanded the Louvain folder and switched the right panel to
   Community 3. A grader check shows a right-click on the Group 2 row does the same. Two
   participants pointed out that Delete sits in that menu. Severity 4 in a real build (an action
   could hit the wrong object). In the skeleton this is most likely a wiring shortcut -- the menu
   state is a fixed Community 3 screen -- so it is a fidelity defect to fix before the next round
   rather than a design finding; but as long as it stands, it is also the only reason anyone found
   F2, so this round cannot measure how discoverable the right-click route is.
3. **Nothing shows who is in the group before naming it (3 of 3).** The group's color is
   "Covered for Color by PageRank", so selecting it lights nothing on the picture, and the table
   does not narrow to the selected group. All three named the groups from the full 77-row table or
   memory. Severity 3. Outside the rename itself, but it is what makes a name "meaningful".
4. **"Paints 14 nodes" selected 5 (2 of 3).** Elena and Marcus clicked it and the selection read
   5 nodes. Severity 3 if real; unverified whether the tool's click landed on the link or on another
   control, so check before acting on it.
5. **Two controls called "Data" (3 of 3).** The left rail's Data, hit when they meant the right
   panel's Data tab, left the graph view. Severity 2. The tool picks the first visible match, so
   this is partly a tool effect, but the duplicate label is real.
6. **Unclear whether renaming an attribute-set group rewrites the data (1 of 3).** Severity 2;
   single voice, worth one line of copy next to the name box rather than a design change.
7. **The grayed Rename note is jargon (1 of 3 confused, 1 of 3 decoded it).** "A run's groups
   renumber when it reruns; Keep as set to name one". Severity 1.

Single Ease Question: 3, 4, 3 of 7 (median 3). All three said renaming is easy once you know F2,
and that knowing F2 was the hard part.
