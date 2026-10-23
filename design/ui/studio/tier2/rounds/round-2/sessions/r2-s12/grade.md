# Grade: session r2-s12 -- Jordan (regular analyst), Les Miserables (T22 B), ties of 10 or more shared chapters

**Grade: SD** (success after detours). The last screen (`23.png`) shows the 13 ties of 10 or more
shared chapters drawn thick and red by a style layer named "13 edges", with every character and
every other tie still drawn in gray, no filter step (`work.json`: `steps` empty at the end), and a
legend entry "Edge color: 13 edges" with a red swatch. The count, 13, was read from the screen at
`14.png` ("13 edges selected" under the find box, inspector header "13 edges selected", Summary
Edges 13, Selection 13, and a "Selected edges" table listing the 13 ties the answer key names),
and the layer row "13 edges" carries it to the end. Jordan reached the rule only after two
unanswered tries in the find box, a trip to the Data page, the column's menu and the edge table,
and then needed three more attempts before the marking showed without the selection's blue.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: `lesmis-ranked.txt`; `01.png` shows the expected ranked start (PageRank run,
Size "1 to 3", the key's Size row), so the setup landed.

## The answer against the key

- **Count (right).** 13, stated in the debrief, with the range "Cosette -- Valjean at 31 down to
  MmeMagloire -- Myriel and Bossuet -- Enjolras at 10". `14.png`'s "Selected edges" table lists
  exactly the key's 13 ties with their shared_chapters values.
- **Marked (right).** `23.png`: the 13 ties are red and wide (layer "13 edges", Line Color
  D62828, Width 30). The marking is a style layer, not a selection, so it survives the selection
  being cleared (`19.png` onward). The key's "other routes" accept a color that separates exactly
  the 10-or-more ties; this layer was made from the selection the rule produced, so it holds
  exactly those 13.
- **Nothing hidden (right).** 77 characters and every other tie still drawn in `23.png`; no
  filter step at any point.
- **Not a wrong answer.** Not `hid-the-rest`, not `not-marked` (the selection was cleared at
  `19.png`, but the "13 edges" layer keeps the ties marked and was made visible at `22.png` and
  `23.png`), not a count from 16.

Why SD and not S: the round 2 route is 4 steps (find box, the hint, the rule, Enter). Jordan got
the hint only on the third find-box attempt, after detours to the Data page, the attribute's
"..." menu and the edge table's column options, and then took four more steps to make a marking
that stayed visible. Each was a detour that ended right.

## Measures

- **Route:** a rule in the find box (`=shared_chapters >= \`10\``, `14.png`), then the
  selection's Style tab, "Add to Line" (which made a separate layer "13 edges"), a typed red and a
  typed width of 30.
- **Typed "=" without being shown it:** no. Jordan first typed "chapters 10" and ">= 10", both
  answered only "No match" (`03.png`, `04.png`). The hint "Start with = to select by a value:"
  appeared once the text named the real column, "shared_chapters >= 10" (`13.png`).
- **Copied the hint whole:** yes, backticks included ("I'll copy it exactly", step 14). The rule
  was accepted on the first Enter.
- **Where `shared_chapters` was found:** the Data page's Attributes list (`05.png`), then the
  attribute's summary (`06.png`, range 1 to 31). Not the "=" list.
- **Places looked for a "mark by condition" control:** the find box (three times), the attribute's
  "..." menu (`07.png`: only "Filter to..." and "Show in table"), the edge table's column options
  (`11.png`: only "Move left" and "Move right"), the selection's Style tab (`15.png`).
- **Steps:** 22 `real.mjs` steps after the start (`02.png` to `23.png`); the count was on screen
  after 13 (`14.png`). The round 2 route is 4. Two steps changed nothing because of the tool or
  the participant's own aim (step 2's click timeout, step 9's `shared_chapters#2` that hit no sort
  control). T22 is not one of bar 11's core four.
- **Wrong turns:** 6. (1) "chapters 10" in the find box; (2) ">= 10" in the find box; (3) the
  attribute's "..." menu looking for a way to mark; (4) the table column's options caret;
  (5) "Clear search" expecting it to drop the selection (`18.png`); (6) Width 8, then a Color
  that started as the same gray as every tie, neither visible (`19.png` to `21.png`). The trip to
  Data and the sorted table found the column name and a cross-check of the count, so they are
  counted as exploration that paid, not wrong turns.
- **False "done":** none. "13 ties ... red and thick, nobody taken off the map" is true on
  `23.png`. truth-on-screen holds.
- **Earlier work kept (bar 2):** yes. `work.json` start and end hold the same run, layers, notes,
  steps and source; the end adds the participant's own layer "13 edges"; `gone` is empty. The
  setup's Size by PageRank is still drawn in `23.png`.
- **Silent commit (bar 4):** none of the listed kinds. The rule's Enter drew the blue bands, the
  count and the table (`14.png`). The style change at step 17 (Width 8) is not in bar 4's list,
  but it committed with no visible change once the selection was cleared; recorded as problem 2.
- **Numbers that disagree (bar 5):** none. "13 edges selected", Selection 13, the 13 table rows
  and the sorted edge table agree.
- **Wrong weight reading without a sign (bar 7b):** not applicable; no run used the weight.
- **Ease (from the transcript):** 3 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. The first click on the find box timed out in the tool
  (`elementHandle.click: Timeout 3000ms exceeded`, step 2, no change on `02.png`) -- the untraced
  click timeout the answer key's "Tool faults" section records; it cost one step, the retry by
  point worked, and nothing was lost, so the session stands.
- **Scripted exit:** not applicable; Jordan finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                                                   | Evidence                                                                                                         |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 3        | discoverability | The find box answers a condition that does not name a column ("chapters 10", ">= 10") with only "No match", no hint that "=" starts a rule and no list of the columns a rule can use. The hint appears only once the participant has already found the column's exact name elsewhere. It cost Jordan two wrong tries, a trip through Data, the column menu and the table. | `03.png`, `04.png`, then `13.png`; transcript debrief: "If it had said that the first time ... five minutes"     |
| 2   | 3        | feedback        | A Line Width added from the selection's Style tab starts at 8, and 8 draws no wider than the default tie once the selection is cleared. The box gives no sense of scale; Jordan concluded "the width I set did nothing" and "that width box is lying to me" until 30 showed. A user who stopped at 8 would have nothing visibly marked.                                    | `17.png` (Width 8 under selection blue), `19.png` (all ties hairlines), `22.png`, `23.png` (Width 30 visible)    |
| 3   | 2        | feedback        | A Line Color added to the new layer starts at A9A9A9, the same gray as every other tie, so adding it changes nothing on the drawing. The legend gains a gray "13 edges" swatch indistinguishable from the rest.                                                                                                                                                           | `21.png`; transcript step 21                                                                                     |
| 4   | 2        | discoverability | The attribute's "..." menu on the Data page offers "Filter to..." and "Show in table", but nothing that marks or selects by the column's value, where Jordan looked first. "Filter to" was rightly avoided because it hides the rest.                                                                                                                                      | `07.png`; transcript debrief: "There's no 'make these stand out' next to the column"                             |
| 5   | 1        | comprehension   | The rule syntax needs backticks around the number. Jordan copied the hint's backticks without knowing whether they mattered and said "I'd never remember to type it."                                                                                                                                                                                                    | `13.png`, `14.png`; transcript debrief                                                                           |
| 6   | 1        | expectation     | The find box's clear button empties the box but keeps the selection; Jordan had to click empty canvas to drop it.                                                                                                                                                                                                                                                        | `18.png`, `19.png`                                                                                               |
| 7   | 1        | discoverability | The edge table's column options caret offers only "Move left" and "Move right" (both grayed); sorting is on the heading itself.                                                                                                                                                                                                                                         | `11.png`                                                                                                         |
| 8   | 1        | layout          | At 1440 x 900 the edge table shows only four rows and halves the canvas.                                                                                                                                                                                                                                                                                                 | `10.png`, `23.png`; transcript debrief                                                                           |
| 9   | 0        | tool            | The tool's first click on "Find nodes, edges, values" timed out with the box visible, enabled and stable; nothing changed. The known untraced click timeout, not a participant miss.                                                                                                                                                                                       | `02.png`; transcript step 2                                                                                      |

No severity 4: the count was right, nothing was hidden, and no wrong conclusion was reached. The
two severity 3 problems are where a participant would most likely stop: a find box that says only
"No match" to a plain condition, and a width that looks applied but draws nothing different.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
