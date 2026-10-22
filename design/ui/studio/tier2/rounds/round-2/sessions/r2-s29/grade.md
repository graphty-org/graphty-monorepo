# Grade: session r2-s29 -- Dev (returning student), running club (T18 A), the fewest people in between

**Grade: S** (success). The main prompt's answer was read off the run's Values (`08.png`): Summary
"Path 5 nodes, 4 edges"; Nodes in order Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; Made with From
"Chloe", To "Milo", Follow "All", Weight "None" with "Each edge counts as 1. A path needs a
distance, and "weight" has no meaning set." Dev reported Chloe - Ava - Ivan - Kofi - Milo, three
people in between, four introductions, which is the key's only chain of that length. The
follow-up was also right on the last screen (`13.png`): Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5,
"Path 5 nodes, 4 edges", From "Ben", To "Nora", Follow "All", Weight "None"; Dev reported Ben -
Theo - Ravi - Pia - Nora, four introductions. No detour.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `friends-ranked.txt` (PageRank run, nodes sized and colored by it, no
names drawn).

## The answer against the key

- **Main chain (right).** `08.png`, as above. Not `meaning-wrong`: Follow stayed "All" and Weight
  stayed "None", so ties count once each and both ways, as the task needs.
- **Follow-up chain (right).** `13.png`, as above. Dev did not name Quinn (the node the Ravi to
  Pia tie passes through on the drawing); the chain was read from Nodes in order.
- **Not a guess from the drawing.** Names were never put on the nodes; every name came from the
  Values list, which the key accepts for S.

## Measures

- **Steps:** main prompt 7 `real.mjs` steps after the start (`02.png` to `08.png`) against the
  success path's 4, about 1.75x. The extra 3 are not detours: the analysis button plus a typed
  filter plus a click on Shortest path in place of `p` (3 for 1), and From typed then picked as a
  separate step. Follow-up 5 steps (`09.png` to `13.png`).
- **Wrong turns:** 0. Opening the analysis list on a remembered habit and filtering it by "chain"
  led straight to Shortest path.
- **False "done":** none. Both "done" claims match the screen. truth_on_screen: holds.
- **Earlier work kept (bar 2):** yes. `work.json` start and end both hold the PageRank run
  "Influence" and its layer; the end adds the Shortest path run and its two layers. Nothing in the
  start list is gone. The Chloe chain being replaced by the Ben chain is work made in this session,
  not earlier work, and the key records that the second run replaces the first; it is listed as a
  problem below, not as `not-kept`.
- **Silent commit (bar 4):** none. Each Find path drew the black path, the legend's "On the path"
  key and the run's Values.
- **Numbers that disagree (bar 5):** none. "4 hops" in the Graph tree and "5 nodes, 4 edges" both
  match the drawn path.
- **Wrong weight reading without a sign (bar 7b):** no; Weight None, as the task needs.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot. The first `--end`
  printed the follow-up as the next step after the participant had already done it (it read the
  follow-up from the task sheet); a second `--end` closed the session. The follow-up time in
  session.json is recorded and the screens are intact, so this did not affect the grade.
- **Scripted exit:** not applicable; Dev finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                         | Evidence                                                                                          |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | 2        | work-replaced   | Running a second shortest path silently replaced the first: the Graph tree keeps one "Shortest path 4 hops" row and the Chloe chain is gone from the drawing and the inspector. Dev wanted both for the write-up and had to have noted the first by hand. | `13.png` (one row, Ben chain only); transcript step 13 and debrief                                |
| 2   | 1        | legibility      | No names are drawn on the nodes, so the black path cannot be matched to people without the Nodes in order list; Dev said a figure would need names turned on.                                                                                    | `08.png`, `13.png`; debrief "I can't see any names on the map"                                    |
| 3   | 1        | comprehension   | "Follow: Out / All" -- Dev only guessed that All means "either direction" and did not know what Out would do to people who run together. It was already on All, so the answer was unaffected.                                                       | `04.png`; debrief                                                                                 |
| 4   | 1        | wording         | The answer is said two ways, "4 hops" in the Graph tree and "5 nodes, 4 edges" in the Summary, and neither says "introductions" or "people in between"; Dev worked out edges = introductions and nodes minus 2 = go-betweens himself.              | `08.png`; debrief                                                                                 |
| 5   | 1        | wording         | The Weight line "A path needs a distance, and "weight" has no meaning set." went over Dev's head; he skipped it because he did not need a weight. It did not lead him to set one.                                                                 | `04.png`, `08.png`; debrief                                                                       |
| 6   | 0        | tool            | The first `--end` re-issued the follow-up request already completed; a second `--end` closed. No effect on the screens or the grade.                                                                                                          | transcript "End"                                                                                  |

No severity 3 or 4: both answers were right and read from the screen, nothing from the start was
lost, and every problem Dev raised was about wording, legibility or the replaced first chain on a
path he completed. None of the problems is an implementation failure (no error, no refused
action, no wrong number); they are presentation and design questions.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
