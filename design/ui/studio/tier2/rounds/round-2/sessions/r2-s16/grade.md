# Grade: session r2-s16 -- Alex (regular analyst), Les Miserables (T22 B), ties of 10 or more shared chapters

**Grade: SD** (success after detours). The last screen (`21.png`) shows the 13 ties of 10 or more
shared chapters drawn in blue (1F77B4) by a style layer named "13 edges", with every character and
every other tie still drawn in gray, no filter step (`work.json`: `steps` empty at the end), and a
legend entry "Edge color: 13 edges" with a blue swatch. The count, 13, was read from the screen at
`13.png`: "13 edges selected" under the find box, inspector header "13 edges selected", Summary
Edges 13, Selection 13, and a "Selected edges" table listing exactly the 13 ties the answer key
names, down to the two at 10 (MmeMagloire -- Myriel, Bossuet -- Enjolras). Alex reached the rule
only after two "No match" answers in the find box and a trip to the Data page and its "Filter
to..." form, then spent five more steps making the marking survive the end of the selection.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: `lesmis-ranked.txt`; `01.png` shows the expected ranked start (PageRank run,
77 in its row, Size and Color by PageRank in the key), so the setup landed.

## The answer against the key

- **Count (right).** 13, stated in the debrief, read from the line under the box, the inspector and
  the table at `13.png`. Not `read-wrong`: Alex never typed 16.
- **Marked (right).** The selection's blue bands were dropped by a click on empty canvas
  (`17.png`), but the "13 edges" layer created from the selection's Style tab still marks the same
  ties: at `21.png` (zoomed) the blue lines sit on the Valjean hub, the Enjolras / Courfeyrac /
  Combeferre / Bossuet group and the long tie down to the lower hub, the ties `13.png` banded. The
  key accepts "a color ... that separates exactly the 10-or-more ties", so this is not
  `not-marked`. The marking is thin: at Width 20 the blue lines are about 2 px against 1 px gray
  ties; they stand out by color, not by width.
- **Nothing taken off.** 77 characters and every tie still drawn; no filter step was added. Alex
  opened "Filter to...", typed 10, and left without pressing Add step (`08.png`, `09.png`).

## Measures

- **Steps:** 20 `real.mjs` steps after the start (`02.png` to `21.png`). The round 2 route is 4
  (focus, type the condition, copy the hint, Enter); Alex reached the count at step 12 and spent
  8 more making the mark stay (Style tab, Add Line, Width, clear selection, reopen layer, Add
  Color, type blue, raise Width to 20).
- **Route:** a rule in the find box, reached through the "Start with = to select by a value" hint.
  Alex typed "shared_chapters >= 10" by SQL habit, not "=": the "=" came from the hint. He copied
  the hint's whole line, backticks included ("I copied them blind").
- **Wrong turns:** 3. (1) "weight" in the find box: "No match" (`03.png`). (2) The Data page, the
  attribute's "..." menu and the "Filter to..." form, opened to look for a count and abandoned
  (`04.png` to `08.png`). (3) "shared" in the find box: "No match" (`10.png`). The width and color
  steps after the count are extra cost the build imposed (problems 2 and 3), not wrong places.
- **Places looked for "select where":** the find box (by column name), the Data page's attribute
  summary and its "..." menu ("Filter to...", "Show in table"), the filter step form.
- **False "done":** none. "Done" (`21.png`) is true: the ties are marked, nothing is removed, the
  count was read. "Drawn thick" in the debrief overstates the width, but the claim that the ties
  stand out holds by color. Earlier, at `16.png`, Alex said the new layer made the mark "a saved
  style, not just a highlight" and found at `17.png` that it showed nothing; he did not claim the
  task was done there, so it is a wrong belief corrected on screen, not a false "done".
  truth_on_screen: holds.
- **Ease (from the transcript):** 4 of 7. Not used for the grade.
- **Earlier work kept (bar 2):** yes. `work.json` start and end both hold the PageRank run and the
  Influence layer; the only difference is the added "13 edges" layer, Alex's own choice; `gone` is
  empty.
- **Broken habit:** none counted. The first move (the find box) did lead on, through the hint, once
  he typed a condition. The Data page is not named in Alex's history.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; nothing the tool did was
  beyond a person.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                       | Evidence                                                                                          |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | 3        | feedback        | A Line Width added from the selection's Style tab starts at 8, and 8 draws no wider than the default tie once the selection is cleared; even 20 draws about 2 px. The selection's own band (size 2.5 per the answer key) looks far thicker than the layer's 8, so the two width controls do not share a scale. Also seen in r2-s12 (Jordan): confirmed. | `16.png`, `17.png`, `18.png`, `20.png` (Width 8, hairline blue), `21.png` (Width 20)              |
| 2   | 3        | expectation     | Adding a style from the selection's Style tab creates a new layer "13 edges" that does not carry the selection's blue band, so the ties look marked until the selection ends and then look like every other tie. Alex believed the mark was saved ("that's a saved style") and found it gone after one click on the canvas. A user who stops at `16.png` ends `not-marked`. | `13.png` vs `16.png`, `17.png`; transcript step 16                                                |
| 3   | 2        | feedback        | A Line Color added to the layer starts at A9A9A9, the same gray as every other tie, so adding it changes nothing on the drawing; the legend gains a gray "13 edges" swatch. Alex had to know a hex code (1F77B4) to make it show. Also seen in r2-s12: confirmed.                                                                                  | `19.png`, `20.png`                                                                                |
| 4   | 2        | discoverability | The find box answers a column name ("weight", "shared") with only "No match", with no sign that a rule over a column exists or which columns it can use. Alex found "=" only because he typed a SQL-style condition by habit. Also seen in r2-s12 and r2-s15: confirmed.                                                                           | `03.png`, `10.png`, `11.png`                                                                      |
| 5   | 2        | stability       | Adding Color to the "13 edges" layer changed the drawing: it shrank and the clusters moved (the top-left group went from about x 560, y 90 to x 620, y 285), with no layout control touched. Alex: "That would worry me if I'd already arranged it for a slide." One participant; not reproduced by script.                                         | `18.png` vs `19.png`                                                                              |
| 6   | 1        | feedback        | The "Filter to..." form gives no count of what it would keep before Add step, so it cannot be used to answer "how many" without removing ties. Alex rightly backed out.                                                                                                                                                                     | `08.png`                                                                                          |
| 7   | 1        | comprehension   | The backticks around the number in the hint looked like something to get wrong; Alex copied them without knowing whether they mattered.                                                                                                                                                                                                     | `11.png`; transcript step 10                                                                      |
| 8   | 1        | feedback        | The "13 edges" layer row shows no count beside it, unlike Selection 13 and PageRank 77, so once the selection is gone the count is visible only in the layer's name.                                                                                                                                                                       | `17.png`, `21.png`                                                                                |
| 9   | 1        | discoverability | The Data page's attribute summary (range 1 to 31, 17 distinct values) gives no count above a value and no way to mark by it; its "..." menu offers only "Filter to..." and "Show in table". Opinion held one level down.                                                                                                                    | `05.png`, `06.png`                                                                                |

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
