# Grade: session r2-s09 -- Ruth (returning), bus stops (T22 A), make the slow links stand out

**Grade: SD** (success after a detour). The last screen (`10.png`) is the answer key's end state:
the find box holds "=minutes >= `10`", the line under it reads "3 edges selected", the Selection
row reads 3, the inspector header reads "3 edges selected" with Summary Edges 3 and a "Selected
edges" table listing School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14, and the three
lines are drawn with blue bands among the gray ones on the full map of 10 stops. No filter step is
on (`work.json`: `steps` empty at start and end, nothing gone). Ruth's count, 3, matches. It is SD,
not S, for two detours: her first entry, the column name "minutes" alone, was a dead end ("No
match", `02.png`), and after the first correct selection she replaced it with the opposite rule
("=minutes < `10`", 14 edges, `09.png`) and had to make the 10-or-more selection again
(`10.png`), which the key lists as a detour ("a selection lost ... and made again").

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `bus-stops-ranked.txt` (PageRank run, size and color by PageRank).

## The answer against the key

- **Marked, nothing hidden (right).** `10.png` as above; every one of the 10 stops and 17 links is
  still drawn. `work.json` start and end are identical: one run, three layers, no notes, no
  filter steps, source `bus-stops.csv`.
- **Count (right).** 3, read from the line under the box and the inspector, with the three links
  named by the "Selected edges" table and their minutes (12, 15, 14).
- **Her cross-check is true.** The opposite rule gave "14 edges selected" (`09.png`, highest 9,
  Depot -> School), and the Data page reads "10 nodes, 17 edges" (`07.png`); 3 + 14 = 17, so no
  link sits at exactly 10.
- **Not a failure code.** Not `hid-the-rest` (no filter), not `not-marked` (the selection is on at
  the end), not `read-wrong` (she did not use the example's 9 or 16; the key's B-only note about 16
  does not apply).

## Route

The round 2 route, reached by her own habit (the find box): "minutes" gave "No match" (`02.png`);
a bare "10" gave the hint "Start with = to select by a value:" with "=`10`" (`03.png`); she wrote
"=minutes >= 10" from that hint, got the bare-number refusal "Put numbers in backticks:" with
"minutes >= `10`" (`04.png`); she retyped it with backticks (not copied from the screen), got
"Rule: press Enter to select matches" (`05.png`) and pressed Enter (`06.png`, "3 edges selected").
The key counts the hint and the refusal as the path. She went to the Data page to find the
column's values (`07.png`, `08.png`): that is where she looked for `minutes` beyond the find box.

## Measures

- **Steps:** 9 screenshots after the start, 21 `real.mjs` actions. To the first correct count
  (`06.png`): 9 actions against the key's 5 for the "=" then bare-number route. The extra 4 are the
  "minutes" dead end (2) and the bare "10" (2). Everything after `06.png` (12 actions) was
  verification: the Data page, the column summary, the opposite rule, and remaking the selection.
- **Wrong turns:** 2. (1) "minutes" alone in the find box, "No match". (2) Replacing the right
  selection with the opposite rule to cross-check, which cleared the marks she needed and forced
  her to make them again. The Data page visit is not counted as a wrong turn: it changed nothing
  and gave her the 17-link total.
- **False "done":** none. Every claim in her end summary (3 links, their names and minutes, blue
  and thick, nothing removed, 14 under 10, 17 in all) is on screen in `09.png` and `10.png`.
  truth_on_screen: holds.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Enter showed "3 edges selected" under the box and in the
  inspector at once.
- **Numbers that disagree (bar 5):** none. Under the box, the Selection row, the inspector Summary
  and the table all say 3 (later 14).
- **Broken habit:** none. Her history's first move, typing into the find box, led to the task.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; setup.log shows the file
  chooser answered; no tool error.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind             | Problem                                                                                                                                                                                                                                                                                                                             | Evidence                                                                                           |
| --- | -------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability  | The find box placeholder says it finds "values", but typing the edge column's own name, "minutes", gives only "No match" -- no hint that "minutes" is a column a rule can use, and no pointer to "=". Ruth reached the rule only because she happened to type a bare number next.                                                     | `02.png`; transcript step 1 and end: "I only learned the = trick because I happened to type a bare number next" |
| 2   | 2        | comprehension    | The hint for a bare "10" offers "=`10`" -- a rule with no column and no comparison, whose result was not checked (the key notes the suggestion is not checked). It teaches neither naming a column nor "10 or more", and shows backquotes with no reason given. Ruth did not run it; a participant who copies it gets an unknown result. | `03.png`; transcript step 2 and end ("shows only 'equal to', with backquotes I had no reason to expect") |
| 3   | 2        | error-recovery   | A number without backquotes is refused in red, although the same line shows the exact corrected rule; there is no way to accept it, so the user retypes it. The backquote demand matches no spreadsheet habit.                                                                                                                       | `04.png`, `05.png`; transcript step 3 and end ("if it can write the corrected rule for me, why make me type it again?") |
| 4   | 2        | verification     | Nothing on screen lists every link with its minutes: the Data page's column summary gives only kind, coverage, distinct count and range (2 to 15). To prove none sat at exactly 10, Ruth ran the opposite rule, which replaced her answer's selection and cost a remake.                                                               | `08.png`; `09.png`, `10.png`; transcript step 7 and end                                            |
| 5   | 2        | persistence      | The marks are a selection with no sign of how to keep them; Ruth suspected one stray click would clear them before her colleague sees them. On this build Escape outside the box does clear it, and the box keeps the rule text, giving no sign (answer key, "Known on this build").                                                  | `10.png`; transcript end ("Nothing told me how to keep it")                                        |
| 6   | 1        | feedback         | Before Enter, an accepted rule says only "Rule: press Enter to select matches", not how many it would match.                                                                                                                                                                                                                         | `05.png`; transcript step 4                                                                        |
| 7   | 1        | legibility       | No stop names are drawn on the map, so the three bands can be tied to stops only through the "Selected edges" table.                                                                                                                                                                                                                 | `06.png`, `10.png`                                                                                 |

No severity 3 or 4: the answer was right, nothing was hidden, and every problem cost steps or
confidence on a path she completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
