# Grade: session r3-s30 -- Dev (tier 1 graduate, returning), Florentine families (T18 B), the fewest people in between

**Grade: S** (success) on the prompt; the follow-up is right too. Dev's answer, "Strozzi ->
Ridolfi -> Medici -> Salviati -> Pazzi: five families and four marriages", matches the key: 4
marriages, 3 families in between, the only chain of that length. He read it off the Shortest path
run's Values ("Nodes in order", `09.png`), which is the key's S route, and named the count.

Last screenshot (`15.png`): the follow-up run's Values -- Path "5 nodes, 4 edges"; Nodes in order
Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5; Made with Analysis "Shortest path", Ran
"Oct 10, 5:52:58 PM", From "Peruzzi", To "Ginori", Weight "None" with "Each edge counts as 1."
under it. The Graph tree holds one "Shortest path 4 hops" row above PageRank; the drawing shows
the Peruzzi-to-Ginori chain in black on the orange PageRank drawing, and the first chain is no
longer drawn. `work.json` end: the PageRank run and its layers kept, plus one Shortest path run
and its two layers; nothing gone.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900, no uncommitted changes. Start: setup `florentine-ranked.txt`.

## The answer against the key

- **Prompt chain (right).** Strozzi, Ridolfi, Medici, Salviati, Pazzi, "5 nodes, 4 edges", read
  from the Values (`09.png`). Made with reads From "Strozzi", To "Pazzi", Weight "None", "Each
  edge counts as 1.", as the key says; no Follow row (the graph is undirected).
- **Follow-up (right).** Peruzzi, Bischeri, Guadagni, Albizzi, Ginori, four marriages, read from
  the Values (`15.png`), matching the key.
- **Weight.** Left at None on both runs, with the right reason ("a marriage is a marriage, no
  numbers here"); no `meaning-wrong`.
- **Overlap trap (Castellani on the drawn Peruzzi-Bischeri tie).** Not met: he read both chains
  from the list, never from the drawing.

## Measures

- **Steps:** prompt, 8 screenshots after the start to the answer (`02.png` to `09.png`: Analyze,
  type "path", Shortest path, From, pick, type To, pick, Find path), plus one hover check
  (`10.png`). He took the Analyze route rather than the key's `p`; typing and picking were
  separate steps. The key's success path is 4 (its pilot took 5 screenshots with typing and
  picking split), so the prompt took 2x the key's count. Follow-up, 5 screenshots (`11.png` to
  `15.png`), with "Shortest path" first under Recent in the Analyze list (`11.png`); the
  follow-up target (success path + 1, 0 wrong turns) is met at 5.
- **Wrong turns:** 0. The Analyze button is in his history and led straight to the task (the
  filter box found "Shortest path" at once, `03.png`). The hover at step 10 was a check on a done
  answer, not a detour.
- **Broken habit:** none. His first move (the flask, Analyze) offered the way on.
- **False "done":** none. Both "done" claims named the right chain. His wrap-up claims hold on
  screen: hovering a node shows nothing (`10.png` is byte-identical to `09.png`); the second run
  replaced the first (`15.png`: one "Shortest path 4 hops" row, the Strozzi chain no longer
  black). truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** the second Find path replaced the first run without a word (problem
  2). It did not touch the answer or any earlier work the participant needed, and it is the key's
  documented behavior on this build.
- **Numbers that disagree (bar 5):** none. "5 nodes, 4 edges" matches 5 rows in Nodes in order on
  both runs, and the tree's "4 hops".
- **Earlier work:** `work.json` lists nothing gone; the PageRank run and its layers are kept.
- **Build-decided:** no. Every control behaved as the key describes this build.
- **Void:** no. Every step printed its screenshot; `session.log` is empty (no script, console or
  request errors); `leaks.json` lists no leaks; the follow-up was given by the tool at the first
  `--end` (session.json `followUp`).

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                         | Evidence                                                  |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | 2        | feedback        | The drawing cannot confirm the chain: no names are drawn, and hovering a node changes nothing on screen though the pointer turns into a hand. Dev wanted to check which end of the black line was Strozzi and could not; he had to trust the list. The key records the same on this build (hover shows no tooltip), so with this session it is confirmed. | `10.png` identical to `09.png`; wrap-up item 1            |
| 2   | 2        | silent commit   | A second Shortest path run replaces the first with no message: the tree keeps one "Shortest path 4 hops" row and the first chain disappears from the drawing. Dev noticed, said "Nothing told me it would", and that he would have to rerun the first to show both. Matches the key's note for this build.                                                | `09.png` against `15.png`; transcript step 15; wrap-up 2  |
| 3   | 1        | wording/clutter | In the Analyze list "PageRank" appears twice (under Recent and under "Rank nodes and edges"), and the grayed "Guided route -- Select 2 nodes first" sits right under Shortest path, leaving him unsure whether he needed it. Cosmetic; it cost no step.                                                                                            | `02.png`, `03.png`; wrap-up item 3                        |

No severity 3 or 4: both answers were right on the first route taken. None is an implementation
fault of the build; all three are design questions already described in the answer key for this
build.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
