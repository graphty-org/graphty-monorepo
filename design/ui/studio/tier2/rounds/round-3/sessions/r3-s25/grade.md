# Grade: session r3-s25 -- Ruth (returning), running club (T18 A), the fewest people in between

**Grade: S** (success). The main answer is on screen in `08.png`: the run's Values read Summary
"Path 5 nodes, 4 edges"; Nodes in order Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; Made with
Analysis "Shortest path", From "Chloe", To "Milo", Follow "All", Weight "None" with "Each edge
counts as 1; "weight" has no meaning set." under it. Ruth reported Chloe, Ava, Ivan, Kofi, Milo,
four introductions, three people in between: the key's chain and count, read off the Values. The
follow-up was also right on the last screen (`15.png`): Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5,
"5 nodes, 4 edges", From "Ben", To "Nora", Follow "All", Weight "None". No detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (PageRank run, nodes sized and colored
by it). Tool commit `acf3894e2c56`, no uncommitted changes. `session.log` is empty (no script,
console or request errors); `leaks.json` shows no leaks.

## The answer against the key

- **Main chain (right).** `08.png`, as above. Follow was left on All, which counts a tie both ways,
  as running together does; not `meaning-wrong` (no Out run, no weight set as a distance).
- **Follow-up chain (right).** `14.png` and `15.png`, as above; matches the key's Ben, Theo, Ravi,
  Pia, Nora.
- **Overlap traps.** Ruth did not name Jada (on the Ivan to Kofi tie) or Quinn (on the Ravi to Pia
  tie); she read both chains from the list, not the drawing.
- **Her own checks held.** The find box's tie lists for Ava (`09.png`: Ava -> Chloe, Ivan -> Ava)
  and Theo (`15.png`: Theo -> Ben, Ravi -> Theo) agree with the chains.
- **Arrow doubt (recorded, as the key asks).** She noticed Ivan -> Ava points against the chain and
  accepted it only because Made with said Follow "All" (transcript step 09 and end).

## Measures

- **Steps:** main prompt 7 `real.mjs` steps after the start to the answer (`02.png` to `08.png`:
  Analyze, filter "path", Shortest path, From typed, Chloe picked, Milo typed, Milo picked plus
  Find path), plus 1 voluntary check (`09.png`). The key's success path is 4; the extra steps are
  the analysis button and filter in place of `p`, and typing and picking as separate steps, not
  detours. Follow-up 5 steps to the answer (`10.png` to `14.png`: Analyze, Shortest path from
  Recent, From typed, Ben picked plus Nora typed, Nora picked plus Find path), plus 1 check
  (`15.png`). Follow-up target (success path + 1, about 5): met.
- **Wrong turns:** 0 on the main prompt, 0 on the follow-up.
- **False "done":** none. Both "done" claims are true on screen (`08.png`, `14.png`).
  truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Earlier work kept:** yes. `work.json` start and end both hold the PageRank run and its
  Influence layer; nothing gone. The first Shortest path run (made in this session) was replaced by
  the second; that is the app's known behavior and not earlier work, but see problem 1.
- **Broken habit:** none. Her first move, the analysis button, led on to the task.
- **Build-decided:** no. **Void:** no. **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                   | Evidence                                                              |
| --- | -------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | 2        | work-replaced | A second shortest path silently replaced the first: the Graph tree keeps one "Shortest path 4 hops" row, and the Chloe to Milo chain is gone from the drawing and the inspector, with no message. Ruth had written it down; had she not, it was lost. | `08.png` against `14.png` (one row, Ben chain only); transcript step 15 and end |
| 2   | 1        | wording       | The answer is said as "4 hops" in the Graph tree and "5 nodes, 4 edges" in the Summary; neither says introductions or people in between, so she did the sum herself. "hops" read as jargon to her.                                                  | `08.png`, `14.png`; transcript end                                    |
| 3   | 1        | comprehension | The ties carry arrows in the file's direction, and the chain runs against one (Ivan -> Ava); only the Follow "All" row says a path counts ties both ways. She trusted it because the form said so, but the arrows made her doubt the chain at first glance. | `08.png`, `09.png`; transcript step 09 and end                         |
| 4   | 1        | legibility    | No names are drawn on the nodes, so the black path on the drawing cannot be matched to people without the Nodes in order list.                                                                                                             | `08.png`, `14.png`; transcript end                                    |

No severity 3 or 4: both answers were right and complete, and every doubt she raised was on a path
she finished.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
