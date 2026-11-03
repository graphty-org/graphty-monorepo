# Pilot: T71 A (volunteers, either of two things) -- targeted re-pilot

Build: 47c95a09fc (frozen, `/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d2-47c95a09fc`).
Start: setup `volunteers.txt` (volunteers.graphml, PageRank run). Every walk began at that start and
went by clicks, typing and keys only. The data stayed the volunteers network (24 nodes, 63 edges)
the whole way. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T71A/ (not in git).

This pass walks only the pointer success path and the routes the latest fixes touched that apply to
this task: the keyboard route that opens a new filter card from Quick actions and leaves it with
Cancel and with Escape. The other touched routes in the list belong to other tasks and datasets.

Result: **reached** by pointer (10 of 24, 9 path steps, as the answer key says). Nothing crashed,
blocked the task or would spoil its grading.

## Success path, pointer (success/)

Replayed from the previous pass's walk; all 9 steps matched their screens.

| Step | Action           | What the screen showed                                                          | Shot   |
| ---- | ---------------- | ------------------------------------------------------------------------------- | ------ |
| 1    | Data             | Data place, Filters with "+"                                                    | 02.png |
| 2    | Add filter       | Workspace "New filter -- Filters 24 of 24", value picker open                   | 03.png |
| 3    | role             | Checklist volunteer 16, staff 5, board 3                                        | 05.png |
| 4    | board            | 3 of 24                                                                         | 06.png |
| 5    | Or...            | Group B added, picker open                                                      | 07.png |
| 6    | hours            | Range card, Min box focused, "0 so far"                                         | 08.png |
| 7-8  | type 30, Enter   | Outline "A 3 / role board / or B 7 / hours min 30", top bar "10 of 24 nodes, 14 of 63 edges" | 09.png |
| 9    | Done             | One card "role board" with A 3 / or B 7 / hours min 30; Values "Nodes showing 10 of 24" | 10.png |

Matches the answer key: path, 9 steps, final outline and the count. Only one filter card exists.
The step script still has to say `role=option:role` (the strip's column header is also named
"role"); a person is not affected.

## Quick actions new card, then Cancel and Escape (touched-8/, started --keys --sr)

- Ctrl+K focuses "Search commands"; typing "filter" highlights "Filters" (03.png); Enter opens the
  workspace on a new card, focus in "Find attributes, results", "Editing New filter, Filters" spoken
  (04.png).
- Shift+Tab from the picker: "Condition..." (spoken "No step added"), "id", "Fit", the card row
  "New filter, 24 of 24 nodes", Done, Cancel, Clear, "Table of matches". Tab back to Cancel, Enter:
  "Filter not added" spoken, focus on "Add filter", the Filters section empty, no count in the top
  bar (15.png). No empty card is left behind.
- Again from Quick actions, Escape in the open picker: "Filter not added", focus on "Add filter";
  a second Escape does nothing further.
- Again, Shift+Tab out of the picker, then Escape: focus moves to the card row (decided: Escape
  closes the innermost), a second Escape removes the card, "Filter not added" (21.png). Filters
  empty, all 24 nodes drawn.

Focus never fell to the page body.

## Defects

None that crash, block T71 A or change its grade. The card count T71 grades stays right on every
route: Cancel and Escape on a new card both take it away.
