# Pilot: T4, two spreadsheets as one network

Build `ca8b3b916c22 graphty@0.8.55` (served from `graphty/dist` of this worktree), 2026-10-07.
Both datasets walked on the answer key's success path with `tool/real.mjs`, starting empty.
Screenshots: `A/01.png` to `A/11.png` (office), `B/01.png` to `B/07.png` (football team).

## Result

Reached on both datasets. Every value in the answer key is on screen exactly as written.

|                    | A: people.csv + messages.csv                                                             | B: players.csv + passes.csv                                                              |
| ------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Report before Load | "12 node rows and 23 edge rows read; the load makes 12 nodes and 22 edges." (`A/06.png`) | "10 node rows and 18 edge rows read; the load makes 10 nodes and 17 edges." (`B/04.png`) |
| Unmatched row      | "Show the 1 unmatched row": line 24, p11 to p13, 6 (`A/07.png`)                          | line 17, s04 to s11, 3 (`B/05.png`)                                                      |
| Choice shown       | "Leave out" chosen, "Add" offered                                                        | the same                                                                                 |
| After Load         | "From 2 files", Nodes 12, Edges 22 (`A/08.png`)                                          | "From 2 files", Nodes 10, Edges 17 (`B/06.png`)                                          |
| Sources (Data)     | "people.cs... 12 nodes, 22 edges", people.csv and messages.csv under it (`A/09.png`)     | "players.cs... 10 nodes, 17 edges", players.csv and passes.csv (`B/07.png`)              |

The files agree: people.csv line 12 is `p11,Kemi Bello,Operations` and no row holds p13;
players.csv line 5 is `s04,Dina Moss,Defender` and no row holds s11.

## Steps as walked

```
--start <dir> empty
--click "No thanks"
--click "New from data..."
--click "choose a file..." --upload people.csv        (players.csv)
--click "Add a table"                                 (the "+" beside Tables)
--click "File..." --upload messages.csv               (passes.csv)
--click "Show the 1 unmatched row"
--click "Load"
--click "Data"
```

No script errors, console errors or failed requests were printed at any step, and the drawing
settled every time.

## Notes for the answer key

- The "+" beside Tables answers to its name, "Add a table", so the success path does not need
  `--click-at 271,107`. Its position on this build is still 271,107.
- Part B can cite the line of the unmatched row as part A does: line 17 of passes.csv.

## Observations (not blockers)

- **The unmatched row is reported only before Load.** After Load, nothing on the Graph or Data
  page says one email row (or one pass) was left out: the Sources row reads "12 nodes, 22 edges"
  and selecting messages.csv under it changes nothing in the right panel (`A/10.png`). A
  participant who presses Load without reading the report has no later place to find the row,
  and "Tell us anything that did not fit" then depends on comparing 22 with a count of the file's
  rows. Expect `false-done` failures from participants who load at once; this is the likeliest
  failure on this task.
- **The unmatched row shows ids, not names.** The row reads `p11, p13, 6`; finding that p11 is
  Kemi Bello means going back to the people.csv table. The answer key accepts the row without the
  name, so this does not affect grading.
- **The combined source's name is cut** to "people.cs..." / "players.cs..." with no tooltip on
  hover (`A/11.png`); its accessible name is "people.csv and messages.csv". Cosmetic.
- **"Weight: none (each edge counts 1)"** on the edge table although the third column (emails,
  passes) is a whole number. Not part of this task.
- **Grammar slip in the report:** the screen reads "1 edge row name 1 node no node row holds."
  ("name" for "names"); `graphty/src/workspace/data-page/__tests__/DataPage.real-element.test.tsx`
  line 157 pins that text. The answer key quotes it as "names"; correct the key or the app.

## Task wording

The prompt names no control on the path ("New from data...", "choose a file...", "Add a table",
"File...", "Add", "Leave out", "Load" do not appear in it). No change needed.

## Re-walk, 2026-10-07 (after the tier 2 fixes)

Walked again with `tool/real.mjs` on a frozen copy of the served build (graphty 0.8.55 at commit 75cbc3a9a plus the tree-row checkbox fix for A; graphty 0.8.55 at commit 4c8d9eb2a plus the uncommitted fixes then in the worktree for B), both datasets,
from the same setups. Screenshots and the printed steps are in `rewalk/A/` and `rewalk/B/`
(`steps.log`); `../rewalk.sh T4A T4B` repeats it. No step printed a script error, a console
error, a failed request or "the drawing is still moving".

**Result: reached on both datasets**, with the answer key's counts: A "12 node rows and 23 edge
rows read; the load makes 12 nodes and 22 edges", line 24 `p11, p13, 6` (`rewalk/A/07.png`); B
"10 node rows and 18 edge rows read; the load makes 10 nodes and 17 edges", line 17 `s04, s11, 3`
(`rewalk/B/07.png`). After Load: "From 2 files", 12 / 22 and 10 / 17.

| Earlier observation                              | Now                                                                                                                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The left-out row was recorded nowhere after Load | Selecting the source opens it in the inspector: Added Nodes 12, Edges 22, "1 edge row was left out: it names 1 node no node row holds.", and "Show the left-out row" (`rewalk/A/11.png`) |
| The cut source name had no tooltip               | Hovering the row shows "people.csv and messages.csv" (`rewalk/A/10.png`); B "players.csv and passes.csv" (`rewalk/B/10.png`)                                                             |
| "1 edge row name 1 node ..."                     | "1 edge row names 1 node no node row holds." (`rewalk/A/07.png`, `rewalk/B/07.png`)                                                                                                      |

Still so: the Sources row's quiet counts are cut to "12 no..." at this panel width, so "1 row left
out" on the row itself is not readable without selecting it; the source's tooltip stays open over
the first child row after the click (`rewalk/A/11.png`).
