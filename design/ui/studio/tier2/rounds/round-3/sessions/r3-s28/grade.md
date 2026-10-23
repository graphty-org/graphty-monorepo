# Grade: session r3-s28 -- Alex (regular analyst), Florentine families (T18 B), the fewest people in between

**Grade: S** (success), prompt and follow-up both. The main answer is on screen in `08.png`: the
run's Values read Summary "Path 5 nodes, 4 edges"; Nodes in order Strozzi 1, Ridolfi 2, Medici 3,
Salviati 4, Pazzi 5; Made with Analysis "Shortest path", Ran "Oct 10, 5:42:41 PM", From "Strozzi",
To "Pazzi", Weight "None" with "Each edge counts as 1." under it. The Graph tree row reads
"Shortest path 4 hops". Alex reported Strozzi, Ridolfi, Medici, Salviati, Pazzi, 4 hops, passing
through Ridolfi, Medici and Salviati -- the key's answer, read off the Values. The last screenshot
(`13.png`) holds the follow-up: Nodes in order Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4,
Ginori 5, "5 nodes, 4 edges", From "Peruzzi", To "Ginori", Weight "None", Ran "Oct 10, 5:43:48
PM"; he reported the same chain, which is the key's follow-up answer.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `florentine-ranked.txt` (PageRank run, nodes colored and
sized by PageRank, no names drawn). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **Main chain and count (right).** `08.png`, as above. No weight was set (Weight "None"); the
  Florentine graph is undirected, so there is no Follow row and none was expected.
- **Follow-up chain and count (right).** `13.png`, as above. Ran moved from "5:42:41 PM"
  (`08.png`) to "5:43:48 PM" (`13.png`), so the run on screen is the new one.
- **No drawing-overlap error.** He named nobody from the drawing; Castellani, whom the
  Peruzzi-Bischeri tie crosses on the drawing, appears nowhere in his answers. He said outright
  he trusted only the Nodes in order list because no names are drawn.
- **`work.json`:** one new run, `shortest_path` (label "Shortest route"), with its two layers;
  nothing gone; the source is still Florentine families. The PageRank run and its layer are
  untouched.

## Measures

- **Steps, main prompt:** 7 `real.mjs` steps after the start (`02.png` to `08.png`). The key's
  success path is 4 with the `p` key; the Analyze route he took costs 3 steps in place of 1
  (Analyze, filter "shortest path", click), and he typed and picked From and To as separate
  steps (the key's own B pilot took 5 for the same reason). Under 2x the success path.
- **Wrong turns, main prompt:** 0. The analysis button is the place his history names, and every
  step led straight on.
- **Steps, follow-up:** 5 (`09.png` to `13.png`): Analyze, Recent "Shortest path", From,
  pick plus To, pick plus Find path. Within the follow-up target (success path 4 + 1).
- **Wrong turns, follow-up:** 0. Recent put Shortest path at the top (`09.png`) and the form came
  back empty (`10.png`).
- **False "done":** none. Both "done" claims (end of `08.png`, end of `13.png`) are true: chain,
  order and count are on screen each time. truth-on-screen: holds. His remark that the second
  run replaced the first is also true (one "Shortest path 4 hops" row in `13.png`; the Strozzi
  to Pazzi chain no longer drawn).
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. Find path drew the path, added the legend row and opened the Values.
- **Numbers that disagree:** none; "4 hops" and "5 nodes, 4 edges" describe the same chain.
- **Broken habit:** none. His first move (the analysis button) led on.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; `session.log` is empty;
  `leaks.json` shows no leaks.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                   | Evidence                                                                 |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | 2        | repeat-work     | A second Shortest path run replaces the first: the Graph tree keeps one "Shortest path 4 hops" row and the Strozzi to Pazzi chain is no longer drawn or listed. Nothing warned him before Find path; to show both routes he would have to redo one. | `08.png` against `13.png` (one row each, different Values); transcript step 12 and end |
| 2   | 1        | legibility      | No names are drawn on the nodes, so the black path on the drawing cannot be read on its own; only Nodes in order says which family is which. Picking ends on the canvas would have been guessing.                                           | `01.png`, `08.png`, `13.png`; transcript step 0 and end                  |
| 3   | 1        | comprehension   | Nothing says whether the chain shown is the only shortest one or one of several of the same length. Here it is the only one (key), so no harm, but he could not tell.                                                                       | `08.png`, `13.png` Values; transcript wrap-ups                           |
| 4   | 1        | naming          | Both runs are called "Shortest path" in the Graph tree with no From or To in the row, so even if both had stayed they could not be told apart without opening each.                                                                        | `13.png` left row; transcript follow-up wrap-up                          |
| 5   | 1        | discoverability | The popover reopened over the drawing covers the lower end of the earlier highlighted path while the new ends are chosen.                                                                                                                  | `10.png` (popover over the path's lower half)                            |
| 6   | 0        | feedback        | After Find path the popover closes and the result opens in the right panel; for a moment he looked at the canvas, not the panel. Cost nothing.                                                                                              | `08.png`; transcript step 7 wrap-up                                      |

No severity 3 or 4: both answers were right, read from the Values, and every complaint was about a
path he completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
