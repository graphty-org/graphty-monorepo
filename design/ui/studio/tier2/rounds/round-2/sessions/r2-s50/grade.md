# Grade: session r2-s50 -- Ruth (returning), running club (T23 A), who is a step or two away

**Grade: S** (success). The last screen (`09.png`) shows the neighbor list headed "Ava and 14
connections within 2 hops" with Hops 2 and Follow All chosen, the 14 names Ben, Chloe, Dev, Eli,
Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo under it, "Filter to neighbors" pressed
(filled blue), the left panel's Selection row 15, and the header chip "15 of 20 nodes" after a
filter icon. The five nodes at the upper right are gone from the drawing. Ruth answered "14 people,
not counting Ava", read from the heading and checked against Selection 15. `work.json` agrees: one
step at the end, `{"kind":"neighborhood","seeds":["Ava"],"depth":2}`, switched on. No detour: the
list opened at Hops 1, as it does on every route, and she went straight to 2.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `friends-ranked.txt` (friends.csv, PageRank run, Size by PageRank).

## The answer against the key

- **Count (right).** 14 besides Ava, the same 14 names as the key; the five left out (Lena, Milo,
  Nora, Omar, Pia) are not in the list.
- **Drawing narrowed (right).** Chip "15 of 20 nodes" (`09.png`), the key's end state. Follow All,
  so not the `meaning-wrong` Follow Out answer; Hops 2, so not the one-step answer of 6.
- **Route.** Find box, Ava's node row, the inspector's Degree row (the key's "Degree row's route"),
  Hops 2, a check of one name (Eli) through the find box, then Filter to neighbors.

## Measures

- **Steps:** 8 `real.mjs` steps after the start (`02.png` to `09.png`); 6 that did something, since
  steps 3 and 6 were refused by the tool as ambiguous and changed nothing. The success path is 6.
  The one extra effective step is the Eli check, a verification she chose, not a detour.
- **Wrong turns:** 0. Every move went forward. The two refused clicks were aiming slips on text
  that appears in more than one place ("Ava" in the find results and on the canvas; "2" in Hops
  and in Dev's weight row), not wrong places; the key already names the "2" collision.
- **False "done":** none. "I'm done" (`09.png`) is true: the count is on screen and the drawing is
  narrowed. truth_on_screen: holds. Her claim "The drawing shows only those 15" matches the chip.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Out-of-date mark:** after the filter she read the PageRank row's history icon and the key's
  "PageRank on 20 nodes" as "the sizes were worked out on the whole club, not on these 15" --
  the correct reading. She did not rerun PageRank and did not treat it as a problem.
- **Hops 1 to Hops 2 table change:** recorded as the key asks. She noticed the weights and the
  one-step / two-step distinction disappear at Hops 2; she did not read it as another feature.
- **Broken habit:** none. Her history's habits (find box, the right-hand list of who someone is
  tied to) led straight to the control the task needs.
- **Implementation defects met:** none. No control failed, no count disagreed, no error appeared.
  Every problem below is about wording or what the list shows.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, and the tool named the
  ambiguous matches it refused (a person would have clicked the intended target).
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                         | Evidence                                                                                     |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | 2        | information     | At Hops 2 the list becomes a plain list of names: the weights go, and nothing says who is a direct tie and who is two away, or through whom. Ruth wanted to be sure the list was right and had to search Eli by hand to confirm he links through Ben and Dev. | `05.png` against `07.png`; transcript step 7 and debrief: "I'd want each name marked..."     |
| 2   | 1        | wording         | "Hops" is not her word; she guessed its meaning from the 1 / 2 / 3 beside "Ava and 6 connections". It did not change the answer.                                                                                                                              | `05.png`; debrief: "'Hops' is jargon"                                                       |
| 3   | 1        | wording         | "Filter to neighbors" at Hops 2 names people who are not all neighbors in her sense; she clicked it as "the only thing there". It did the right thing.                                                                                                       | `07.png`, `09.png`; debrief                                                                  |
| 4   | 1        | legibility      | No names are drawn on the nodes, so she could not confirm by looking that the 15 dots left are the 15 in the list; she trusted the chip and the list instead.                                                                                                | `09.png`; transcript step 9                                                                  |
| 5   | 0        | target-ambiguity| The same visible text appears in two places ("Ava": find result and canvas; "2": Hops segment and Dev's weight), so the tool refused two clicks. A person aiming with a pointer would not be affected; cost two steps in this session only.             | `03.png` and `06.png` unchanged from the step before; transcript steps 3 and 6               |

No severity 3 or 4: the answer and the narrowed drawing were right, and every doubt she raised was
about wording or about what the 2-hop list leaves out on a path she completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
