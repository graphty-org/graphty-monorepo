# Pilot: T71 A (volunteers, either of two things), targeted re-pilot

Build: 1e123d7d33 (frozen, `/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33`).
Start: setup `volunteers.txt` (volunteers.graphml, PageRank run). Every walk began at that start and
went by clicks, typing and keys only. The data stayed the volunteers network (24 nodes, 63 edges)
the whole way. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T71A/ (not in git).

Result: **reached** by pointer (10 of 24, 9 path steps, as the answer key says) and by keyboard.

## Routes walked

This pass re-walks only the success path and the routes the latest fixes touched. Every touched
route on the list belongs to another task (T70, T72, T73, T74, T79: Fill and the style layer's
Done), none to T71 A, so none was walked here. The keyboard walk was replayed as well, since it
cost one command.

## Success path, pointer (success/)

Replayed step by step from the previous pass's route; every check point matched (9 of 9).

| Step | Action           | What the screen showed                                                                  | Shot   |
| ---- | ---------------- | --------------------------------------------------------------------------------------- | ------ |
| 1    | Data             | Data place, Filters with "+"                                                            | 02.png |
| 2    | Add filter       | Workspace "New filter -- Filters", value picker open                                    | 03.png |
| 3    | role             | Checklist of role values                                                                | 05.png |
| 4    | board            | 3 of 24                                                                                 | 06.png |
| 5    | Or...            | Outline "A 3 / role board / or B 0", picker open                                        | 07.png |
| 6    | hours            | Range card, Min box focused, "0 so far"; top bar "3 of 24 nodes, 1 of 63 edges"         | 08.png |
| 7-8  | type 30, Enter   | "10 of 24", B 7, outline "hours min 30", "No match 14", "7 so far"; top bar "10 of 24 nodes, 14 of 63 edges" | 09.png |
| 9    | Done             | Card outline "A 3 / role board / or B 7 / hours min 30"; Values "Nodes showing 10 of 24" | 10.png |

Matches the answer key: path, 9 steps, final outline and the count 10 of 24. The `role` name is
still two controls while the workspace is open (option and the strip's column header), so the
step script says `role=option:role` (04.png); a person is not affected.

## Keyboard only (keyboard/)

Replayed from the previous pass's keyboard route (42 steps, started `--keys --sr`); every check
point matched, so focus order, names and field behavior are as that pass recorded them: the filter
built by keys alone reaches 10 of 24, Escape closes the workspace as Done, Enter, Tab and Escape in
the Min box do what decided.md says, and focus never fell to the page body. Final screen 43.png:
10 of 24 nodes, 14 of 63 edges.

## Defects

None new, and none that crashes, blocks the task or spoils its grading.

One leftover worth noting, unchanged from the previous build (keyboard/43.png, same as the
previous pass's 43.png): after the field probes (Or..., type "ho", Tab, Escape, Escape) and then
Ctrl+Z, the card still shows an empty third group "or C 0" while the undo notice reads "Undid
editing the filter "role board or hours 30 or more or hours any value"". The count stays 10 of 24,
so the answer is unaffected.

## Skipped

None.
