# Grade: session r1-s32 -- Ruth, task T3 "Your own list of ties"

**Grade: S** (success). No false "done".

## Evidence for the grade

The task's success definition: the graph from friends.csv drawn (20 nodes, 41 edges), the
participant states 20 people and 41 ties, and checks that nothing was dropped against a rows count
on screen (Data > Sources: "41 rows, 41 edges").

- 03.png: opening friends.csv drew the graph at once; Overview reads Nodes 20, Edges 41.
- 04.png: Data > Sources reads "friends.csv 20 nodes, 41 edges", "Node ... 20 rows, 20 nodes" and
  "Edge t... 41 rows, 41 edges". She read it as "41 rows, 41 edges. Rows in, ties out -- that's the
  check I wanted."
- Closing statement: "The program says 20 people and 41 ties, and the Data tab says 41 rows became
  41 edges." That is the rows-count check the task asks for, read correctly. Her "nothing was
  dropped" rests on the on-screen rows count, not on the Overview counts alone, and no roles were
  changed, so neither SD condition applies.
- Last screenshot (11.png): the same friends graph still drawn, Ava selected, Degree 6. Nothing was
  changed or lost. No files were saved (the task asks for none); the downloads directory does not
  exist.
- She also counted rows in her own spreadsheet outside the app. That is something a real user can
  do and does not change the grade, which rests on the counts the app showed.

## Measures

- **Steps:** 9 actions after the start (No thanks; Open project or file... with the upload; From
  friends.csv; two hovers; Node table; Cancel; the find box, twice; a click on Ava). The success
  path is 3; the answer was on screen at her 3rd action (04.png). The rest was looking for a list of
  the 20 people.
- **Wrong turns:** 1. Step 6 (07.png): clicked "Node table" expecting the list of names; it opened
  "Add to friends", an empty import form, and she cancelled. Reaching Sources through the "From
  friends.csv" link instead of the Data rail button is a different route to the same screen, not a
  wrong turn.
- **False "done":** none. "20 and 41", "41 rows, 41 edges", "Nothing seems dropped" and "Ava ...
  Degree 6 ... matches" are all true on screen. truth_on_screen: not applicable.
- **Usage card:** declined with "No thanks" at step 2, no detour.
- **Tool prints:** at step 5 the tool printed the tooltip "Node table" for the second hover while
  the screenshot (06.png) shows "Edge table". The participant went by the screen, so it did not
  change what she did. At step 7 `--click "Find nodes, edges, values"` did not find the find box by
  its placeholder; a click on the box's position worked. Neither made her do something a person
  could not, so the session is not void, but both are worth a look in the tool and in the find
  box's accessible name.
- **Build-decided:** no. **Void:** no.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | Clicking the node table row under Data > Sources opens "Add to friends", an empty import form, instead of showing the 20 people. She expected the list and was alarmed at being asked for another file. The same row-opens-import finding appears in other sessions, so it is confirmed. | step 6 `07.png`, step 6 `08.png` |
| 2 | 2 | behavior | No list of the people (or the 41 rows) anywhere she could find; she could check one person only by searching and selecting her. | step 6, step 7 `10.png`, step 8 `11.png` |
| 3 | 2 | behavior | Nothing after loading says how many rows were read or whether any were skipped; the "41 rows, 41 edges" check sits behind a small "From friends.csv" link she found by guessing. | step 3 `03.png`, step 4 `04.png` |
| 4 | 1 | opinion | The file was read as Directed and drawn with arrows; for a who-knows-whom list she reads that as wrong, and the import form's "As the file says" made it more puzzling, since her file says nothing about direction. Nothing on screen says how to change it. | step 3 `03.png`, step 6 `07.png` |
| 5 | 1 | behavior | No names on the dots after loading; she cannot tell who is who without clicking. | `03.png`, `11.png` |
| 6 | 1 | wording | "Node ..." and "Edge t..." are cut off in the narrow Sources column; she had to hover to read them. | step 4 `04.png`, step 5 `05.png`, `06.png` |
| 7 | 1 | wording | "Density", "Components", "Degree": words she cannot explain to her editor. | `03.png`, `11.png` |
| 8 | 0 | accessibility | The find box was not reachable by the name "Find nodes, edges, values" (its placeholder); its accessible name may differ from what a sighted user reads. Not reproduced here. | step 7 `09.png` |

No problem in this session is a build defect under the criteria (no crash, dead control, wrong
count or keyboard block). Problem 1 is a control doing something other than what its label
suggests rather than nothing, so it counts as behavior, confirmed across participants.
