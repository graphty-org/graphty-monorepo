# Grade: session r3-s09 -- Nadia (returning), bus stops (T22 A), point out every link of 10 minutes or more

**Grade: S** (success). The last screen (`04.png`) shows the three links of 10 minutes or more
drawn with blue bands on the full map of 10 stops, with no filter step. The count is on screen in
four places: the line under the find box reads "3 edges selected", the inspector header "3 edges
selected", Summary "Edges 3", and the Selection row "3"; the "Selected edges" table lists
School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14 -- every value in the answer key.
Nadia's final answer (3 links, those three, with their minutes) matches.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: `bus-stops-ranked.txt`; `01.png` matches the ranked start (Size
"1 to 3", key with a Size row and a Color row, PageRank inspector on its Style tab). Tool commit
`acf3894e2c56`, no uncommitted changes. `setup.log` shows only the file chooser, no failed click.

## The answer against the key

- **Marked (right).** `04.png`: three blue bands, matching the three rows of the "Selected edges"
  table; no other link is banded.
- **Everything still drawn (right).** The same 10 stops and their links are on the canvas in
  every screenshot; `work.json` shows no steps (filters) at start or end and nothing gone.
- **Count (right).** 3, read from the screen (`04.png`), not from a filter and not counted by eye.
- **Not a failure kind.** Not `hid-the-rest`, not `not-marked` (the session ends with the
  selection in place), not a wrong count, not `false-done`.

## Measures

- **Route:** a rule in the find box, by the bare-number correction. `minutes` typed alone got
  "Start with = to select by a value:" and the option "=minutes" over "Select its matches"
  (`02.png`); she selected the text and typed `=minutes >= 10`, which got the red "Put numbers in
  backticks:" and the corrected option "=minutes >= `10`" (`03.png`); a click on that option
  selected the three links and rewrote the box (`04.png`). She clicked the correction instead of
  retyping it.
- **Typed "=" without being shown:** no. She typed it after the hint in `02.png` showed it.
- **Where she looked for `minutes`:** nowhere else; she guessed the column name and the find box's
  hint confirmed it. She never opened the "=" column list, the Data page or an edge's values.
- **Places looked for a separate "select by condition" dialog:** none; she went straight to the
  find box because its placeholder says "values".
- **Steps:** 3 `real.mjs` steps after the start, the same as the success path (3) and the
  bare-number route (3). 1.0x.
- **Wrong turns:** 0. Typing `minutes` first was the probe that surfaced the "=" hint, and the
  bare number was corrected by the app's own option; the key counts neither as a detour.
- **False "done":** none. "Done" at `04.png` is true: the three links are marked and the count is
  on screen. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Broken habit:** none. Her habit of trying the find box first led on to the task.
- **Lost earlier styling (Control+Z or Escape):** no. PageRank's size and color are unchanged at
  the end (`04.png`; `work.json` keeps the three layers).
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; `leaks.json` shows no
  leaks.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                       | Evidence                                                                                                         |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | language        | A rule with a plain number (`=minutes >= 10`) is answered in red with "Put numbers in backticks:", worded as a refusal, though the option under it works. "Backticks" is programmer vocabulary; she says she would have been stuck had the app not rewritten it, and asks why 10 cannot just be 10. | `03.png`; debrief: "if it had only told me off I would have been stuck. Why can't 10 just be 10?"               |
| 2   | 2        | discoverability | The find box's placeholder, "Find nodes, edges, values", says nothing about conditions; the "=" rule syntax showed only because she typed a column name first. A user who types a number or a phrase gets no route to it.                                    | `01.png` placeholder; `02.png` hint; debrief, second bullet                                                     |
| 3   | 2        | persistence     | The result is only a selection. She does not know whether it survives a click elsewhere, or whether it changed the data or only the view, and plans to screenshot it at once to share it. Nothing on the selection's panel names a way to keep it as a color. | `04.png` (inspector offers Style, Values and a "..." menu, no keep action named); debrief, third bullet         |
| 4   | 1        | legibility      | The bus-stops drawing shows no stop names, so the three bands can be tied to stops only through the "Selected edges" table, not on the drawing itself.                                                                                                        | `04.png`                                                                                                         |
| 5   | 1        | wording         | Plain `minutes` offers "=minutes" with "Select its matches" as the marked option -- a rule that matches every link carrying a minutes value -- rather than suggesting a comparison; she had to invent `>=` herself.                                         | `02.png`                                                                                                         |

No severity 3 or 4: the answer was right and complete, nothing was hidden, and every doubt she
raised was about wording, discoverability or what happens after the task.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
