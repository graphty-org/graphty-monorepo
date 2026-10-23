# Grade: session r2-s49 -- Elena (returning), Florentine families (T23 B), who is a step or two away

**Grade: S** (success). The last screen (`08.png`) shows the right neighborhood and the drawing
narrowed to it: the right panel is headed "Medici and 11 connections within 2 hops" (wrapped onto
two lines, not cut), Hops 2 chosen, with the 11 names Acciaiuoli, Albizzi, Barbadori, Castellani,
Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni; "Filter to neighbors" is pressed
(filled blue); the top bar chip reads "12 of 15 nodes" after a filter icon; Selection reads 12; the
three outlying dots drawn in `07.png` (right of center at about 958,408, and two at the bottom at
about 719,557 and 697,715) are gone. Elena reported 11 families not counting the Medici, with the
same 11 names. No detour: Hops 1 is where the list opens, not a step she chose and undid.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: the Florentine families sample, PageRank run and drawn as size and color
(`01.png`; `work-start.json`: one run, layers Node defaults, Edge defaults, Influence).

## The answer against the key

- **Count (right).** 11 besides the Medici, read from the heading and checked against Selection 12
  (`07.png`). The names match the key's list exactly; Peruzzi, Lamberteschi and Bischeri are the
  three left out.
- **Drawing narrowed (right).** Chip "12 of 15 nodes" (`08.png`). `work.json` end state adds one
  step, `{"kind":"neighborhood","seeds":["Medici"],"depth":2}`, and leaves runs, layers and notes
  as they were.
- **Not a wrong answer.** Not 6 (Hops 1), not one step only.

## Measures

- **Steps:** 6 participant steps after the start (`02.png`, `04.png` to `08.png`), plus one tool
  retry (`03.png`, see below). The key's route is 5 or 6 (find, type, Enter, `g`, Hops 2,
  Filter). Elena clicked the find result, then the "Node actions" menu and Neighborhood -- a route
  the key accepts. About 1.0x to 1.2x.
- **Wrong turns:** 0. Every click moved forward; opening the three-dots menu was a search that led
  straight to Neighborhood.
- **False "done":** none. "Done" (`08.png`) is true: the count, the names and the narrowed drawing
  are on screen. truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. The filter showed its effect at once (the chip, the pressed
  button, three dots gone).
- **Numbers that disagree (bar 5):** noticed, not acted on. Under the filter the legend reads
  "Size: PageRank on 15 nodes" / "Color: PageRank on 15 nodes" and the PageRank row gains a history
  icon while still reading 15 (`08.png`; before the filter the titles read plain "Size: PageRank",
  `07.png`). This is the known state on this build, and the key says the ranking is not stale for
  this task. Elena could not tell whether it was out of date and said she "would wonder about it
  before putting this picture on a slide"; she did not rerun it. Recorded as a problem below.
- **Broken habit:** none. Her history's first move (the find box, then the person's list of
  connections on the right) led on to the task; the habit was extended, not broken.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot and the start state
  matches `work-start.json`.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                  | Evidence                                                                                                  |
| --- | -------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Nothing on the Medici panel (Summary with "Degree 6 >") hints that a wider neighborhood exists; Elena found "Neighborhood" only by opening the "Node actions" three-dots menu on a guess.                                                                                                                 | `04.png` (no hint), `05.png` (menu); transcript step 3 and debrief                                        |
| 2   | 2        | comprehension   | After the filter, the PageRank row's history icon (meaning only on its tooltip, not seen) and the legend's new "on 15 nodes" left her unable to tell whether the ranking was now stale for the 12 shown; she says she would hesitate before putting the picture on a slide. The key says it is not stale here. | `07.png` against `08.png` (legend title, row icon); transcript step 7 and debrief                         |
| 3   | 1        | wording         | "Neighborhood" and "Hops" are not her words; she guessed 2 = two marriages away only because Hops 1 matched the six families she had already seen in the find results.                                                                                                                                    | `05.png`, `06.png`; transcript steps 5 and 6, debrief                                                     |
| 4   | 1        | comprehension   | "Medici and 11 connections" does not say whether the Medici are among the 11; she checked it against "Selection 12" to be sure.                                                                                                                                                                           | `07.png`; transcript debrief                                                                              |
| 5   | 1        | visual noise    | After the filter every remaining dot still carries the yellow selection halo, which she found busy for a picture she would share.                                                                                                                                                                        | `08.png`; transcript step 7                                                                               |

No severity 3 or 4: the count and the narrowed drawing were right, and every doubt she raised was
about finding the feature, naming its controls, or reading the ranking's state on a path she
completed.

## Dry-run check: implementation fault or user need

Nothing in this session was a build fault. No click the build received was refused, nothing failed
to draw, and the counts on screen agree with each other (heading 11, Selection 12, chip 12 of 15).
One hiccup belongs to the study tool, not the app: `--click "Medici"` matched more than one element
(the node row and the six "Medici -- ..." edge rows in the find results, `02.png`), so the tool did
nothing (`03.png` is identical to `02.png`) and the step was retried with `Medici#1`. A real person
clicking the name would not meet this; it is not counted as a wrong turn. The known trap on this
build (the ranking marked under the filter) did cost her confidence (problem 2), and that is a
presentation question, not a defect. Problems 1, 3 and 4 are about what she could find and
understand -- the kind of finding the study is meant to produce.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
