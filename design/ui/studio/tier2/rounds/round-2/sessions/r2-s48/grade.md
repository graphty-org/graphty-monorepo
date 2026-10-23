# Grade: session r2-s48 -- Nadia (returning), running club (T23 A), who is a step or two away

**Grade: S** (success). The last screen (`07.png`) shows the right neighborhood and the drawing
narrowed to it: the right panel is headed "Ava and 14 connections within 2 hops", Hops 2 and
Follow All chosen, with the 14 names Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada, Kofi,
Quinn, Ravi, Sana, Theo; "Filter to neighbors" is pressed (filled blue); the top bar chip reads
"15 of 20 nodes" after a filter icon; Selection reads 15; 15 dots are drawn, all haloed. Nadia
reported 14 people not counting Ava, with the same 14 names. No detour: Hops 1 is where the list
opens, not a step she chose and undid.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: friends.csv loaded, PageRank run and drawn as size and color (`01.png`;
`work-start.json`: one run, layers Node defaults, Edge defaults, Influence).

## The answer against the key

- **Count (right).** 14 besides Ava, read from the heading and checked against Selection 15
  (`06.png`). The names match the key's list exactly; the five left out (Lena, Milo, Nora, Omar,
  Pia) are gone from the drawing in `07.png` (`06.png` showed 20 dots, `07.png` 15).
- **Follow (right).** Left on All, with the reason "running together goes both ways"; not the
  `meaning-wrong` Follow Out answer.
- **Drawing narrowed (right).** Chip "15 of 20 nodes" (`07.png`). `work.json` end state adds one
  step, `{"kind":"neighborhood","seeds":["Ava"],"depth":2}`, and leaves runs, layers and notes as
  they were.
- **Not a wrong answer.** Not 6 (Hops 1), not one-step-only, not Follow Out.

## Measures

- **Steps:** 6 `real.mjs` steps after the start (`02.png` to `07.png`). The key's route is 5 or 6
  (find, type, Enter, `g`, Hops 2, Filter). Nadia used the canvas-panel route instead of Enter and
  `g`: a click on the result, the "Node actions" menu, then Neighborhood -- the key accepts it.
  About 1.0x to 1.2x.
- **Wrong turns:** 0. Every click moved forward; opening the three-dots menu was a search, and it
  led straight to Neighborhood.
- **False "done":** none. "Done" (`07.png`) is true: the count, the names and the narrowed drawing
  are on screen. truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. The filter showed its effect at once (the chip, the pressed
  button, 15 dots).
- **Numbers that disagree (bar 5):** none she acted on. The legend still reads "PageRank on 20
  nodes" and the PageRank row 20 with a history icon under the filter; this is the known state on
  this build, the key says it is not stale for this task, and she read it correctly ("the ranking
  still counts everyone; fine, I'm not using it here"). She did not rerun it.
- **Broken habit:** none. Her history's first move (type the name into the find box, read the
  connections on the right) led on to the task; the habit was extended, not broken.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; the setup log shows the
  file chooser answered, and the start state matches `work-start.json`.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                       | Evidence                                                                                                       |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Neither the find results nor the node's own panel show that a neighborhood view exists; Nadia found "Neighborhood" only by opening the "Node actions" three-dots menu on a guess, and says she would otherwise have gone back to reading lists one by one.      | `02.png`, `03.png` (no hint), `04.png` (menu); transcript end: "I only found it in the three-dots menu by poking" |
| 2   | 2        | comprehension   | "Filter to neighbors" does not say before the click whether it removes nodes from the file or only hides them; the "15 of 20 nodes" chip answered it only afterwards. For a reviewer working on evidence, a possibly destructive button is a hesitation.         | `05.png`, `06.png` (outlined button, no hint); `07.png` chip; transcript step 6 and end                         |
| 3   | 1        | wording         | "Hops" is not her word; she guessed 1 = direct ties and 2 = their ties, and only the heading change to "within 2 hops" confirmed it.                                                                                                                          | `05.png`, `06.png`; transcript step 5 and end                                                                   |
| 4   | 1        | comprehension   | "Follow Out / In / All" left her unsure what Out or In would drop; All was right here, but she flags it would matter for money flows (her own domain).                                                                                                        | `05.png`; transcript end                                                                                        |
| 5   | 1        | consistency     | The list changes form between Hops 1 (names with weights) and Hops 2 (names only). She noticed and judged it harmless.                                                                                                                                        | `05.png` against `06.png`; transcript step 6                                                                    |
| 6   | 1        | legibility      | No names are drawn on the dots, so the drawing alone cannot be copied into a case file; the names must be taken from the panel list.                                                                                                                         | `07.png`; transcript end                                                                                        |

No severity 3 or 4: the count and the narrowed drawing were right, and every doubt she raised was
about finding the feature or naming its controls on a path she completed.

## Dry-run check: implementation fault or user need

Nothing in this session was a build fault. No click was refused, nothing failed to draw, no number
on screen disagreed with another, and the known traps on this build (PageRank on 20 nodes under the
filter, merged halos) did not mislead her. All six problems are about what she understood or could
find -- the kind of finding the study is meant to produce.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
