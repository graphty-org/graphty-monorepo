# Grade: session r3-s11 -- Jordan (returning), bus stops (T22 A), point out every link of 10 minutes or more

**Grade: S** (success). The last screen (`06.png`) shows the three links of 10 minutes or more
drawn with blue bands on the full map of 10 stops and 17 links, with no filter step (the Data
page's Filters section is empty). The count was read from the screen at `04.png`: the line under
the find box reads "3 edges selected", the inspector header "3 edges selected", Summary "Edges 3",
the Selection row "3", and the "Selected edges" table lists School -> Harbor 12, Depot -> Station
15, Station -> Harbor 14 -- every value in the answer key. Jordan's final answer (3 links, those
three, with their minutes) matches. The two steps after `04.png` went to the Data page to check
the count and left the selection in place (the bands are still drawn in `05.png` and `06.png`).

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: `bus-stops-ranked.txt`; `01.png` matches the ranked start (Size
"1 to 3", key with a Size row and a Color row, PageRank inspector on its Style tab). Tool commit
`acf3894e2c56`, no uncommitted changes. `setup.log` shows only the file chooser, no failed click.

## The answer against the key

- **Marked (right).** `04.png` and `06.png`: three blue bands, matching the three edges in the
  "Selected edges" table; no other edge is banded.
- **Everything still drawn (right).** 10 stops and 17 links on the canvas in every screenshot;
  `work.json` shows no steps (filters) at start or end and nothing gone; the Data page reads
  "10 nodes, 17 edges" with no filter listed (`05.png`).
- **Count (right).** 3, read from four places on `04.png`, as above. Not a count from a filter,
  not counted by eye.
- **Not a failure kind.** Not `hid-the-rest`, not `not-marked` (the selection survives to the end),
  not a wrong count, not `false-done`.

## Measures

- **Route:** a rule in the find box, by the bare-number correction. `minutes` typed alone got
  "Start with = to select by a value:" and the option "=minutes" (`02.png`); Jordan selected the
  text and typed `=minutes >= 10`, which got the red "Put numbers in backticks:" and the corrected
  option "=minutes >= `10`" over "Select its matches" (`03.png`); a click on that option selected
  the three edges and rewrote the box (`04.png`). He clicked the correction instead of retyping it.
- **Typed "=" without being shown:** no. He typed it after the hint in `02.png` showed it.
- **Where he looked for `minutes`:** the find box (the hint offered the column at once); later the
  Data page's Attributes list, only to check the count.
- **Steps:** 5 `real.mjs` steps after the start. 3 reached the end state (`02.png` to `04.png`),
  the same as the success path (3) and the bare-number route (3). The other 2 (`05.png`, `06.png`)
  were a check on the Data page after the task was done; they changed nothing. 5 against 3 is
  about 1.7x, within the median <= 2x bar.
- **Wrong turns:** 0. The Data page visit came after the answer was on screen, to check it, and
  did not undo anything.
- **False "done":** none. "I'm done" at `06.png` is true: the three links are marked and the
  count was on screen at `04.png`. truth-on-screen: holds (the bands are drawn on the last screen;
  the count itself is on `04.png`, not `06.png`, because the right panel now shows the minutes
  attribute).
- **Places looked for a separate "select by condition" dialog:** none; he went straight to the
  find box.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Broken habit:** none. His first move, the find box he knew from looking up customers, led on
  to the task.
- **Lost earlier styling (Control+Z or Escape):** no.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; `leaks.json` shows no
  leaks.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                       |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 2        | language        | A rule with a plain number (`=minutes >= 10`) is answered in red with "Put numbers in backticks:", worded as a refusal, though the option under it works. "Backticks" is programmer vocabulary; the participant says he could not have typed the correction himself and asks why the box, which knows `minutes` is a number, does not just accept 10. | `03.png`; transcript step 3 and debrief: "Backticks? That's a coder thing, I'd never have guessed that."                       |
| 2   | 2        | persistence     | The result of the condition is only a selection. The participant fears one stray click on the canvas clears it and that it will not survive to share or present, and finds no way from the selection's panel to keep it as a color ("color these", "keep this highlight").                                                       | `04.png` (inspector offers Style, Values and a "..." menu, no keep action named); debrief, second bullet                        |
| 3   | 2        | verification    | No place lists every link with its minutes, so the count cannot be checked against the data. The Data page's `minutes` attribute shows only a summary (Edges, Amount, 100%, 10 distinct values, range 2 to 15); the participant accepted the 3 as "plausible", not checked.                                                     | `05.png`, `06.png`; transcript step 6: "It's not a sortable table of all 17 links, which is what I'd really want"               |
| 4   | 1        | wording         | Plain `minutes` in the find box offers "=minutes" with "Select its matches" -- a rule that would match every edge carrying a minutes value -- as the marked option. It shows the column is known but does not suggest a comparison; the participant had to invent the `>=` himself (the "=" alone lists "Type a rule, such as minutes > `9`", which this route never shows). | `02.png`                                                                                                                       |

## Notes for the round

- This is the third route the key accepts that ends in 3 steps; the session confirms the
  bare-number correction works as a click as well as with Enter.
- Problem 2 echoes the earlier rounds' "a selection does not last" finding (criteria change log).
