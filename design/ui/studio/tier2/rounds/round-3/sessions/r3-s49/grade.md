# Grade: session r3-s49 -- Elena (tier 1 graduate), office (T4 A), two spreadsheets as one network

**Grade: S** (success). Both files are in one drawn network, the counts are stated, and the row
that did not fit is named. Before Load, Elena read the report ("12 nodes, 22 edges" against her 23
message rows, `06.png`), opened "Show the 1 unmatched row" and named it: line 24, Kemi (p11) to
p13, who has no node row (`07.png`). She chose Add, which the key accepts when the participant says
which row did not fit; the import page then read "13 nodes, 23 edges" (`08.png`). After Load the
Overview reads Nodes 13, Edges 23, Directed, Density 0.1474, Components 1, "Edges per node 1 to 6,
mean 3.538", under "From 2 files" (`09.png`), the key's "With Add" counts (13 and 23). The last
screen (`13.png`) shows the line-24 edge itself selected: "p11 -> p13", From p11, To p13, emails 6.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty, no setup. Tool commit `acf3894e2c56`, no uncommitted
changes.

## The answer against the key

- **Both files in (right).** `08.png`: Tables list "Nodes: people.csv 12 rows" and "Edges:
  messages.csv 23 rows", both with green checks. `work.json` agrees: one source, "people.csv and
  messages.csv"; no runs, no notes, nothing gone.
- **Counts (right, for Add).** `09.png`: Nodes 13, Edges 23. Density 23 / (13 x 12) = 0.1474 and
  mean 46 / 13 = 3.538 agree with those counts.
- **Unmatched row named (right).** Transcript steps 7 and 13 and the closing account: "messages.csv
  names somebody, p13, who isn't in people.csv ... line 24, Kemi to p13". `07.png` shows
  `24 | p11 | p13 (no node row) | 6`. The sender is named both by id and by the name looked up
  from people.csv (Kemi Bello, `11.png`); the key accepts either.
- **The joined data checked on the drawing.** `11.png`: p11 shows name "Kemi Bello", team
  "Operations" from people.csv; `13.png`: the edge carries "emails 6" from messages.csv.
- **Not a wrong answer.** Not `false-done`: her "every link arrived" is true here, because Add
  loaded all 23 rows, and she says p13 is not on the staff list rather than claiming 13 staff.
  Not `never-found`: the "+" beside Tables was found on the first try (`05.png`).

## Measures

- **Steps:** 12 `real.mjs` steps after the start (`02.png` to `13.png`). The success path reaches
  Load in 7 (`No thanks` to `Load`, with the unmatched-row view); the 4 after Load (`10.png` to
  `13.png`) were her own checks that the names and email counts came through, not detours. The
  key's Data-page check was not needed because she read the report before Load.
- **Wrong turns:** 1, minor. Step 10 clicked the top node expecting Lars, the director, and found
  p13 (`10.png`); she recovered at once. Step 12 (the arrow beside Degree) opened the neighborhood
  and selected 5 nodes when she wanted only to read the list (`12.png`); it did no harm and is
  counted as a surprise, not a wrong turn.
- **False "done":** none. "Done" at step 13 is true; truth-on-screen holds (`09.png` counts,
  `13.png` the kept row).
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none on this path. Leave out was the preselected choice; she caught it only
  because she knew her row count (problem 1).
- **Numbers that disagree:** none.
- **Broken habit:** none.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; leaks.json shows no
  leaks and no calls.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                         | Evidence                                                                                          |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | 2        | silent-default  | "Leave out" is preselected and Load is enabled, so a user who presses Load at once drops the line-24 link. The choice is marked only by a white fill on "Leave out". Elena caught it only by comparing the heading's 22 with the 23 rows she knew her file had.                                  | `06.png` (heading "12 nodes, 22 edges", Leave out filled); transcript end: "if I had just pressed Load I'd have lost a link without noticing" |
| 2   | 2        | legibility      | No names are drawn on the nodes, so the drawing alone cannot show that every person arrived; she clicked node by node. She guessed the top node was the director and it was p13, the person with no node row, drawn like any other person.                                                     | `09.png`, `10.png`; transcript steps 9 and 10                                                     |
| 3   | 1        | perception      | In the 3D view, p13 at the top looks larger than the other nodes (nearer the camera), and she read size as importance.                                                                                                                                                                       | `09.png` (node at about 895,118); transcript step 10: "It looked big because... I don't know"    |
| 4   | 1        | legibility      | The neighborhood list names neighbors only by id (p09, p10, p12, p13) although people.csv supplies a name for each.                                                                                                                                                                           | `12.png`; transcript step 12                                                                       |
| 5   | 1        | unexpected-state | The arrow beside Degree opens the neighborhood and also selects the node and its 4 neighbors (Selection 5, highlighted on the drawing); she wanted only to read the list.                                                                                                                       | `12.png` (Selection 5); transcript end                                                             |
| 6   | 1        | comprehension   | "Weight: none (each edge counts 1)" gives no hint whether the emails column should be the weight or how to make it one. She left it; not part of this task.                                                                                                                                    | `06.png`, `08.png`; transcript step 8 and end                                                      |
| 7   | 1        | wording         | After Add, the edge row still shows the red "(no node row)" mark and the caption "1 unmatched row: p13 has no node row", although the summary now reads 13 nodes and 23 edges, so the screen does not say the row will now load.                                                               | `08.png`                                                                                           |

No severity 3 or 4: the row that did not fit was found, named and kept on purpose, and every count
on screen agrees with the files.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
