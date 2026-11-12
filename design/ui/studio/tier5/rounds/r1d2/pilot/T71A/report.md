# Pilot: T71 A (volunteers, either of two things) -- targeted re-pilot

Build: d3fda9f2b6 (frozen, `/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d2-d3fda9f2b6`).
Start: setup `volunteers.txt` (volunteers.graphml, PageRank run). Every walk began at that start and
went by clicks, typing and keys only. The data stayed the volunteers network (24 nodes, 63 edges)
the whole way. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T71A/ (not in git). The
walks of this folder's earlier build (47c95a09fc) were moved to `prev-47c95a09fc/` there.

This pass walks the pointer success path, the keyboard success path, and the two routes the latest
fixes touched that belong to this half: Cancel on a new filter card then Control+Z (touched-4), and
the setup start's empty undo history (touched-8). The other routes in the list belong to other tasks.

Result: **reached** by pointer and by keyboard (10 of 24, 9 path steps, as the answer key says).
Nothing crashed, blocked the task or would spoil its grading.

## Success path, pointer (success/)

Replayed from the previous pass's walk (f0a9a014cb); all 9 steps matched their screens.

| Step | Action         | What the screen showed                                                                        | Shot   |
| ---- | -------------- | --------------------------------------------------------------------------------------------- | ------ |
| 1    | Data           | Data place, Filters with "+"                                                                  | 02.png |
| 2    | Add filter     | Workspace "New filter -- Filters 24 of 24", value picker open                                 | 03.png |
| 3    | role           | Checklist volunteer 16, staff 5, board 3                                                      | 05.png |
| 4    | board          | 3 of 24                                                                                       | 06.png |
| 5    | Or...          | Group B added, picker open                                                                    | 07.png |
| 6    | hours          | Range card, Min box focused, "0 so far"                                                       | 08.png |
| 7-8  | type 30, Enter | Outline "A 3 / role board / or B 7 / hours min 30", top bar "10 of 24 nodes, 14 of 63 edges"  | 09.png |
| 9    | Done           | One card "role board" with A 3 / or B 7 / hours min 30; Values "Nodes showing 10 of 24"       | 10.png |

Matches the answer key: path, 9 steps, final outline and the count. Only one filter card exists.

## Cancel on a new filter card, then Control+Z (touched-4/)

Data, Add filter, role, board (02.png: "3 of 24"), Cancel (03.png): the card is gone, Filters is
empty, 24 nodes, and both Undo and Redo are off. Control+Z (04.png) and Control+Shift+Z (05.png)
change nothing: no card comes back, the PageRank colors stay, 24 of 24. Hovering Undo reads "Nothing
to undo" (06.png). On the previous build Control+Z here undid the setup's PageRank run ("Redo running
PageRank" appeared); the start now has no history, as decided.

## Setup start has no undo history (touched-8/)

At the start, Undo's tooltip reads "Nothing to undo" (02.png) and Redo's "Nothing to redo" (03.png);
a click on Undo is refused as disabled (04.png); Control+Z and Control+Shift+Z leave the PageRank
layer and its colors in place (05.png, 06.png: Style layers Hovered, Selected, Pinned, PageRank 24,
Everything 24).

## Keyboard only (keyboard/, started --keys --sr)

Replayed the previous pass's 94-step keyboard route. The only change is the expected one at step 3:
the third Tab stop is now `button "Undo" disabled` where it was "Undo running PageRank"
(`keyboard-diverged/04.png`). With that step's expected line updated, every other step matched
(`keyboard/`): Add filter, "role", board ticked ("3 of 24 nodes" spoken), Or..., "hours", 30,
Enter ("10 of 24 nodes" spoken), Escape to Done ("Done, 10 of 24"), the edit to 31 and its
Control+Z ("Undid editing the filter ..."), final card "role board / A 3 / or B 7 / hours min 30",
top bar 10 of 24 (94.png). Focus never fell to the page body. The disabled Undo keeps its Tab stop,
named "Undo" with its disabled state, which a screen reader reads correctly.

The keyboard findings recorded in the round's first pilot of this half (rounds/r1/pilot/T71A,
"Defects" 8 to 11: three Escapes to close from the properties column, the 1 px page scroll, three
slider stops for one range, nothing spoken when Or... adds group B) are unchanged; none blocks the
task or its grade.

## Defects

None new. No crash, no script error, no step that blocks the task, no wrong count.
