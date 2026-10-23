# Grade: session r2-s30 -- Grace (returning), Florentine families (T18 B), the fewest families in between

**Grade: S** (success). The main prompt's answer is on screen in `11.png`: Summary "Path 5 nodes,
4 edges"; Nodes in order Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5; Made with Analysis
"Shortest path", From "Strozzi", To "Pazzi", Weight "None", "Each edge counts as 1." That is the
answer key's only chain of that length. The last screenshot (`21.png`) holds the follow-up, also
right: Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5, "5 nodes, 4 edges", From
"Peruzzi", To "Ginori", Weight "None". Both chains were read off the run's Values, not guessed from
the drawing, so this is S, not SD. Her look-ups in the find box before the run were
orientation: she checked who the Strozzi and Pazzi are tied to, and she used that afterward to
check the chain. They were not a detour to a wrong place.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `florentine-ranked.txt` (PageRank run, nodes sized and colored by it,
no names drawn, `01.png`). `session.log` is empty: no script, console or request errors.

## The answer against the key

- **Main prompt (right).** `11.png`, as above. Grace gave "Strozzi -> Ridolfi -> Medici ->
  Salviati -> Pazzi, through three families in between", and checked both ends against the find
  box (Ridolfi is one of the Strozzi's four ties, `02.png`; Salviati is the Pazzi's only tie,
  `04.png`).
- **Follow-up (right).** `21.png`: "Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori, three
  families in between." The Ran time changed from 8:21:38 PM to 8:22:54 PM, so the screen shows a
  new run.
- **Not a wrong answer.** No weight was set; Weight stayed "None" both times. Castellani, which the
  highlighted Peruzzi-Bischeri tie passes through on the drawing (about 713,604, `21.png`), was not
  named.
- `work.json` agrees: one new run, `shortest_path`, with its two layers; nothing gone.

## Measures

- **Steps, main prompt:** 10 `real.mjs` steps after the start (`02.png` to `11.png`). The key's
  count is 4 (5 with typing and picking split). The extra steps: three find-box look-ups for
  orientation (2-4), Escape plus a hover to find the analysis button (5), the analysis button plus
  a typed filter in place of the `p` key (6-8), and To typed then picked (9-10). About 2x.
- **Steps, follow-up:** 10 (`12.png` to `21.png`), of which 3 were lost to the tool's aiming slip
  in step 13 (problem 7) and 2 to clearing the From box that was filled with the old selection
  (problem 3).
- **Wrong turns:** 0 by the participant. Step 13 was the driver's click landing on the left list's
  "Shortest path" row instead of the menu entry of the same name; Grace's intent (the menu entry)
  was right. Counted as a tool aiming slip under problem 7, not a wrong turn.
- **False "done":** none. Both "done" claims (`11.png`, `21.png`) are true; truth_on_screen holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** one. The second Find path replaced the first chain on the drawing and
  in the left list (still one "Shortest path 4 hops" row) with no message (`21.png`). The answer
  key documents this behavior. Grace noticed and had written the first chain down, so no answer
  was lost.
- **Numbers that disagree (bar 5):** none. "4 hops" in the left list and "5 nodes, 4 edges" in
  the Values agree; Grace reconciled them.
- **Wrong weight reading without a sign (bar 7b):** no.
- **"From" field straight after reading the prompt:** no. She went to the find box first.
- **Broken habit:** none. Her history's moves (the find box to look someone up, the analysis button
  in the toolbar) both led on to the task.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot. The first `--end` printed
  the follow-up after it had already been carried out, and a second `--end` closed the session.
  That is an ordering quirk in the tester's run, and it changed no screen.
- **Scripted exit:** not applicable; she finished.

## Screens that differ from the answer key

- The key's B walk opens the Path form with `p` and shows empty From and To, both times. Grace
  opened it from the analysis list while Strozzi was selected, and From came filled with
  "Strozzi" both times (`08.png`, `15.png`). The second time that was the wrong family.
- In `11.png` the Made with row From "Strozzi" has no pick button beside it, while To "Pazzi" has
  one. In `21.png` both From and To have one. Not explained by anything on screen; it changed
  nothing for Grace.

## Problems

| #   | Severity | Kind               | Problem                                                                                                                                                                                                                                                                                                                                     | Evidence                                                                                              |
| --- | -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability    | The analysis list opens on "Rank nodes and edges" (Degree, Betweenness, Closeness...) with nothing near the top about how two nodes are linked. Grace found Shortest path only by typing her own word, "between", into the filter. A user who scans instead of typing sees only rankings.                                                          | `06.png`, `07.png`; transcript: "I only found Shortest path because I typed 'between'"              |
| 2   | 2        | silent-replace     | Running Shortest path a second time replaced the first chain on the drawing, in the left list and in the Values with no message. Grace expected both to stay for her slide and kept the first only because she had written it down.                                                                                                                | `21.png` (one "Shortest path 4 hops" row; only Peruzzi to Ginori shown); transcript step 21          |
| 3   | 2        | stale-default      | Reopening the Path form filled From with the node still selected from the first task (Strozzi), not the new start. Grace caught it and cleared it; a user who did not would have run Strozzi to Ginori and got a wrong chain. The yellow selection halo also stayed on Strozzi beside a path that does not include it.                                       | `15.png` (From "Strozzi"); `21.png` (halo at about 586,614; "Selection 1" in the left list)          |
| 4   | 1        | comprehension      | "Guided route -- Select 2 nodes first" sat grayed out under Shortest path. Nothing says how it differs from Shortest path; Grace left it alone.                                                                                                                                                                                                     | `07.png`; transcript end                                                                              |
| 5   | 1        | wording            | The left list says "4 hops"; the Values say "5 nodes, 4 edges". Neither is Grace's word ("four handoffs", "three families in between"). She read both correctly.                                                                                                                                                                                  | `11.png`, `21.png`                                                                                    |
| 6   | 1        | legibility         | No names are drawn on the nodes, so the black chain on the drawing could be checked only against Nodes in order. On the follow-up the highlighted Peruzzi-Bischeri tie passes straight through Castellani, an orange node not on the path; Grace did not misread it.                                                                                | `21.png` (about 713,604); transcript end: "No names on the dots"                                    |
| 7   | 1        | accessibility-name | The run's row in the left list and the analysis list's entry share the accessible name "Shortest path". The tool's "#1" took the left-list row, which closed the analysis list. Cost three steps (13-15).                                                                                                                                          | `13.png` (list closed, row selected); transcript step 13 note                                        |

No severity 3 or 4: both chains were right, read from the Values, and every doubt Grace raised was
about finding the analysis, wording, or a replacement she noticed. Problem 3 could become a wrong
chain for a less careful user, but it did not here, so it stays at 2.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
