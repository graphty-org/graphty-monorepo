# Grade: session r2-s14 -- Grace (returning), Les Miserables (T22 B), ties of 10 or more shared chapters

**Grade: SD** (success with difficulty). The last screen (`17.png`) shows the 13 ties of 10 or
more shared chapters drawn red and wider than the rest by a style layer named "13 edges" (Line
Color D62828, Width 20), every character and every other tie still drawn, no filter step
(`work.json`: `steps` empty at start and end), and a key entry "Edge color: 13 edges" with a red
swatch. The count, 13, was read from the screen at `08.png`: "13 edges selected" under the find
box, the inspector header "13 edges selected", Summary Edges 13, Selection 13, and a "Selected
edges" table listing exactly the 13 ties the answer key names, with their shared_chapters (10,
13, 12, 31, 17, 12, 21, 19, 15, 17, 13, 12, 10). The find-box half was clean; the difficulty came
after, in making the marking stay once the selection was let go: a Color that started as the
ties' own gray and a Width of 8 that drew no wider than a plain tie.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: `lesmis-ranked.txt`; `01.png` shows the ranked start (PageRank row 77, the
key's "Size: PageRank" and "Color: PageRank"), so the setup landed.

## The answer against the key

- **Count (right).** 13, stated at step 7 and in the debrief. Grace counted the table's rows and
  checked that both 10s were in and nothing was under 10 (`08.png`).
- **Marked (right).** At `08.png` the 13 ties carry the selection's thick blue bands, which is the
  key's end state. Grace then made a style layer from the selection ("Add to Line" on the
  selection's Style tab), which holds exactly those 13 ties, and colored it red. The selection was
  cleared at step 12 (`13.png`); the layer keeps the ties marked to the end (`17.png`). The key's
  "other routes" accept a color that separates exactly the 10-or-more ties.
- **Nothing hidden (right).** All 77 characters and every other tie are still drawn in `17.png`;
  no filter step at any point. Grace looked at the Data page's Filters section (`02.png`) and
  rightly left it alone because "filters are for taking things away".
- **Not a wrong answer.** Not `hid-the-rest`, not `not-marked`, not a count from 16 (the rule used
  10).

Why SD and not S: the find box, the hint, the bare-number refusal and its correction are the path
(answer key, "Round 2 route"), and the Data trip found the column name, so the count was on screen
with no wrong turn. But the marking Grace delivered at the end took four more steps of trial: the
new layer's Color started at A9A9A9, the gray every tie already is (`11.png`); after red, the ties
were hairlines once the selection went (`13.png`); a Width of 8 changed nothing visible and Enter on
it did nothing (`15.png`, `16.png`); only 20 showed (`17.png`).

## Measures

- **Route:** Data page and the attribute summary for the column name (`02.png`, `03.png`), then
  the find box: plain condition, the hint, "=" without backticks, the refusal, the corrected rule,
  Enter (`05.png` to `08.png`); then the selection's Style tab, "Add to Line", Color, a typed red,
  clicking empty canvas, the "13 edges" layer, Width, 20.
- **Typed "=" without being shown it:** no. Grace typed "shared_chapters >= 10"; the line under
  the box answered "Start with = to select by a value:" and `=shared_chapters >= \`10\`` (`05.png`).
- **Copied the hint whole:** no. She added the "=" but left the backticks off on purpose ("in
  Excel you don't quote a number"), got "Put numbers in backticks:" in red (`06.png`), then typed
  the rule as shown and it was accepted ("Rule: press Enter to select matches", `07.png`).
- **Used 16:** no.
- **Where `shared_chapters` was found:** the Data page's columns and its summary (range 1 to 31,
  `03.png`). Not the "=" list.
- **Places looked for a "mark by condition" control:** the Data attribute's summary (`03.png`,
  "nothing to color them"), the find box, the selection's Style tab (`09.png`).
- **First move:** the Data place, which Grace's history names. It led on: it gave the exact column
  name that made the find box's hint appear. Not a broken habit.
- **Steps:** 16 `real.mjs` steps after the start (`02.png` to `17.png`); the count and the key's end
  state were on screen after 7 (`08.png`). The round 2 route with the bare-number refusal is 5 from
  the find box; Grace's find-box part was 5 (steps 3 to 7), plus 2 on the Data page. T22 is not one
  of bar 11's core four.
- **Wrong turns:** 1. Width 8 accepted and Enter pressed on it expecting it to apply, with no
  change on the drawing (steps 14 and 15, `15.png`, `16.png`). The gray Color was caught at once
  and replaced in the next step, so it is counted as a cost of the default (problem 2), not a
  wrong turn. The Data trip paid and is not counted.
- **False "done":** none. "The 13 ties are now clearly red and thicker than the gray ones,
  everyone and every other tie is still on the drawing, and the key says red = '13 edges'" is true
  on `17.png`; "The red stayed" at `13.png` is true. truth-on-screen holds.
- **Earlier work kept (bar 2):** yes. `work.json` start and end hold the same run, layers, notes,
  steps and source; the end adds the participant's own layer "edges_1 13 edges"; `gone` is empty.
  Size and Color by PageRank are still drawn and keyed in `17.png`.
- **Silent commit (bar 4):** none of the listed kinds. The rule's Enter drew the bands, the count
  and the table (`08.png`). The Width 8 at step 14 committed with no visible change on the drawing
  (`15.png` against `13.png`); a style change is not in bar 4's list, recorded as problem 1.
- **Numbers that disagree (bar 5):** none. "13 edges selected", Selection 13, Summary Edges 13 and
  the 13 table rows agree.
- **Script errors, console errors, failed requests:** none in the logs (`session.log` empty,
  `setup.log` empty but for a newline).
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no; every tool step did what the transcript asked.
- **Scripted exit:** not applicable; Grace finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                         | Evidence                                                                                              |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | 3        | feedback        | A Line Width added to the new layer starts at 8, and 8 draws no wider than a plain tie once the selection is cleared. Enter on it does nothing visible. The box gives no scale and no hint of what the plain ties are set to. A user who stopped at 8 would think the ties were thickened when they are hairlines. Seen also in r2-s12 (Width 8, then 30). | `13.png`, `15.png`, `16.png` (hairlines at 8), `17.png` (visible at 20); debrief "Width started at 8" |
| 2   | 2        | feedback        | A Line Color added to the layer made from the selection starts at A9A9A9, the gray every tie already is, so it marks nothing once the selection goes; the key gains a gray swatch. Seen also in r2-s12.                                                                                             | `11.png`; transcript step 11; debrief                                                                 |
| 3   | 1        | comprehension   | The rule needs backticks around a number. The hint showed them; Grace left them off as in a spreadsheet, and the red refusal told her exactly what to change, fixed in one step. She "couldn't explain it to a colleague." Seen also in r2-s12.                                                    | `05.png`, `06.png`, `07.png`; debrief                                                                 |
| 4   | 1        | expectation     | The selection's thick blue marking is what the task asks for, but nothing on screen says it lasts only until the next click; Grace guessed it would go and had to find out that a style layer is what stays.                                                                                    | `08.png`, `13.png`; transcript steps 7 and 12; debrief                                                |
| 5   | 1        | feedback        | Making the "13 edges" layer zooms and moves the drawing (the graph shrinks from about x 490-1045 to about x 560-960). Nothing was lost, but Grace "had to look twice".                                                                                                                         | `10.png` against `11.png`                                                                             |
| 6   | 1        | discoverability | Focusing the empty find box shows nothing about what it takes; Grace typed a condition on a guess because the placeholder says "values". Opinion; held one level down.                                                                                                                       | `04.png`; debrief                                                                                     |
| 7   | 1        | feedback        | "Rule: press Enter to select matches" gives no count before Enter; Grace wanted to see "13 edges" before committing. Opinion; held one level down.                                                                                                                                            | `07.png`; debrief                                                                                     |

No severity 4: the count was right, nothing was hidden, no wrong conclusion was reached and Grace
did not leave. The severity 3 is the width that looks applied and draws nothing different, the
place a user marking for a colleague would most likely stop with an unmarked picture.

What worked: the Data page gave the column name and its range at once; typing the condition in
plain words got the "Start with =" hint on the first try; the bare-number refusal named the fix in
one line; and the "Selected edges" table let Grace count and check the 13 ties.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
