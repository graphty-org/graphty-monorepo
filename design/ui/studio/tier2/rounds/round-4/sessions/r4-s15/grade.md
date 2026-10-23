# Grade: session r4-s15 -- Dev (returning), running club (T18 A), the fewest people in between

**Grade: S** (success). On the main prompt's last screen (`09.png`) the run's Values read Summary
"Path 5 nodes, 4 edges"; Nodes in order Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; Made with
Analysis "Shortest path", From "Chloe", To "Milo", Follow "All", Weight "None" with "Each edge
counts as 1; "weight" has no meaning set." under it. Dev reported "Chloe -> Ava -> Ivan -> Kofi ->
Milo. 4 introductions, 3 people in between", which is the key's chain and count, read off the
Values. The follow-up's last screen (`15.png`) reads "Path 5 nodes, 4 edges"; Nodes in order Ben 1,
Theo 2, Ravi 3, Pia 4, Nora 5; Made with From "Ben", To "Nora", Follow "All", Weight "None"; Dev
reported "Ben -> Theo -> Ravi -> Pia -> Nora, 4 introductions, 3 people in between", the key's
follow-up answer. No detour.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (PageRank run, colored and sized, no
names drawn, `01.png`). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **Chain and count (right).** `09.png`, as above; Dev's count "4 introductions, 3 people in
  between" matches the key. Not a longer chain, not a guess from the drawing: no names were on the
  drawing, and Dev said he read the chain "from the side panel, not from the picture".
- **Not `meaning-wrong`.** Weight stayed "None" (each tie counts 1) and Follow stayed "All", so the
  ties count both ways, as running together does. Dev chose None on purpose: "I want fewest
  people, not anything about the numbers" (step 4).
- **Overlap traps not taken.** Jada (on the Ivan-Kofi tie in `09.png`) and Quinn (on a tie of the
  Ben-Nora chain in `15.png`) appear in neither answer.
- **Follow-up (right).** `15.png`, as above. Ran changed from 3:10:09 AM to 3:11:06 AM.
- **work.json:** start one run (PageRank) and three layers; end adds one `shortest_path` run and
  its two layers; nothing gone.
- **Words avoided.** Dev went to the From field after the form opened (`04.png`, focus already in
  From), not straight from reading the prompt; he reached it through the analysis list.

## Measures

- **Steps:** main prompt 8 `real.mjs` steps after the start (`02.png` to `09.png`): the analysis
  button, a typed filter and a click on Shortest path (3 steps) where the key's success path uses
  `p` (1 step), and typing and picking each name as separate steps (the key's count stays 4 with
  them combined). Follow-up 5 steps (`10.png` to `15.png`), one of them refused by the tool.
- **Wrong turns:** 0. Every move went forward. The `--click "Shortest path#1"` in step 10 was
  refused by the tool as ambiguous (`11.png` is byte for byte `10.png`) and changed nothing; it was
  an aiming slip caused by the same name appearing twice in the list (problem 5), not a wrong
  place.
- **False "done":** none. Both "done" claims are true; the chain, its order and its length are on
  screen in `09.png` and `15.png`. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** the second Find path replaced the first run with no message (problem 3).
  Nothing Dev needed was lost; he had written the first chain down.
- **Numbers that disagree:** none. "5 nodes, 4 edges", the five numbered names and the tree's
  "4 hops" agree.
- **Broken habit:** none. His history's first move (the flask, Analyze) led on to the task.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, `session.log` is empty,
  the tool named the ambiguous match it refused, and `leaks.json` shows no leaks.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind               | Problem                                                                                                                                                                                                                       | Evidence                                                                                          |
| --- | -------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | 2        | comprehension      | The result counts "5 nodes, 4 edges" and the tree row "4 hops"; nothing translates that into people in between or introductions. Dev had to work out that 4 edges is 4 introductions and 3 people between. He got it right, but the step is the reader's alone. | `09.png` Summary and tree row; transcript end, "the words 'introductions' or 'people in between' never appear" |
| 2   | 2        | legibility         | No names are drawn on the nodes, so the black chain on the drawing cannot be read or shown as a figure; the chain is readable only through Nodes in order.                                                                     | `09.png`, `15.png`; transcript end                                                                |
| 3   | 2        | silent-commit      | Running a second path replaces the first with no message: the Chloe-Milo chain leaves the drawing, the tree keeps one "Shortest path 4 hops" row, and nothing says how to keep both.                                           | `15.png` against `09.png`; transcript step 13, "if I'd wanted both on the figure I'm not sure how I'd keep them" |
| 4   | 1        | comprehension      | Analyze lists "Shortest path" twice on reopening, under Recent and in its own section, and Dev was briefly unsure which to pick.                                                                                                | `10.png`; transcript end                                                                          |
| 5   | 1        | accessibility-name | The two "Shortest path" rows share one accessible name; the tool refused the click as ambiguous and nothing happened. Cost one step.                                                                                           | `11.png` (identical to `10.png`); transcript step 10                                              |
| 6   | 1        | discoverability    | The analysis list's first screen shows only rankings; Dev reached Shortest path by typing "path" into the filter.                                                                                                             | `02.png`, `03.png`; transcript steps 1-2                                                          |

No severity 3 or 4: both answers were right, and every doubt Dev raised was about wording, the
drawing or keeping two runs, on a path he completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
