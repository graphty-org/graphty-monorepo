# Grade: session r4-s09 -- Ruth (tier 1 graduate), bus stops (T22 A), point out every link of 10 minutes or more

**Grade: S** (success). The last screen (`07.png`) shows the end state the answer key asks for:
the line under the find box reads "3 edges selected", the inspector header "3 edges selected" with
Summary "Edges 3", the Selection layer row reads 3, and the "Selected edges" table lists the three
links of the key with their minutes (School -> Harbor 12, Depot -> Station 15, Station -> Harbor
14). The three lines are drawn with blue bands on the full map of 10 stops (the PageRank row still
reads 10), every other link is still drawn, and no filter step exists (`work.json`: `steps` empty
at start and end, `gone` empty, same layers at start and end). Ruth gave the count 3, read from the
screen, and named the three links correctly. She reached the selection in 3 steps, the success
path's count, with no wrong turn; her last three steps were a check in the table, not a detour.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `bus-stops-ranked.txt` (PageRank run, size and color by
PageRank). Tool commit `71ed347b39a5`, no uncommitted changes.

## The answer against the key

- **Marked links (right).** `07.png`: three blue bands on the full drawing; the inspector's
  "Selected edges" table and the three shaded rows of the data table match the key row for row.
- **Nothing taken off the drawing (right).** All 10 stops and the grey links still drawn; the data
  table reads "17 edges"; `work.json` shows no filter step and nothing removed.
- **Count (right).** "Three links take 10 minutes or more", read from the line under the box, the
  inspector and the table.
- **Not a wrong answer.** Not `hid-the-rest`, not `not-marked`, not `read-wrong`, not `false-done`.

## Measures

- **Route:** a rule in the find box, reached through its own hints. Click the box and type
  "minutes" (`02.png`: "Start with = to select by a value:" over "=minutes  Select its matches");
  Control+a and type "=minutes >= 10" (`03.png`: red "Put numbers in backticks:" over the corrected
  rule "=minutes >= `10`  Select its matches"); click the corrected rule (`04.png`: 3 edges
  selected). Then, to check: open the table (`05.png`), its Edges tab (`06.png`), sort by minutes
  (`07.png`: the three selected rows on top, the next link down Depot -> School 9).
- **Typed "=" unprompted:** no. She typed it after the "Start with =" hint; she added the
  comparison herself.
- **Retyped instead of taking the offered correction:** no. On the bare-number refusal she clicked
  the offered rule at once. The earlier retype (step 2) was needed: the step 1 suggestion was only
  "=minutes", not a rule.
- **Where she looked for the column name:** her own memory of the briefing ("minutes" is in the
  prompt); then the table to confirm.
- **Where she looked for a "select by condition" dialog:** nowhere; the find box was her first and
  only place.
- **Steps:** 3 `real.mjs` steps to the selection, against 3 for the success path (the opening
  click into the box stands for the success path's `/`). 6 steps in all; steps 4 to 6 open and sort
  the table to check the answer and changed nothing.
- **Wrong turns: 0.** Following the "Start with =" hint and then the backtick correction is the
  path, not a detour (answer key, T22).
- **False "done":** none. "Three links ... drawn thick and blue on the map, and every stop and link
  is still there" (`07.png`) is true. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Lost earlier styling:** no; no Escape or undo used. PageRank size and color intact.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; `leaks.json` shows no
  leaks; `setup.log` shows the setup loaded `bus-stops.csv`.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind         | Problem | Evidence |
| --- | -------- | ------------ | ------- | -------- |
| 1   | 1        | wording      | A rule with a plain number gets a red "Put numbers in backticks:", worded as a refusal and in a programmer's syntax, although the option under it works. Ruth called it a syntax she "would never have guessed"; it cost her nothing because she clicked the offered rule. Same wording finding as earlier T22 sessions. | `03.png`; transcript step 2 and debrief |
| 2   | 1        | persistence  | The marking is a selection only: Ruth saw that one stray click on the map clears it and found no way, from where she was, to keep the slow links marked for her colleague. The task did not ask for a lasting mark, so it did not affect the grade. | `07.png`; transcript debrief |
| 3   | 1        | legibility   | The stops carry no names on the drawing, so which blue line is which link can be read only from the inspector or the table, not from the map itself. | `04.png`, `07.png`; transcript debrief |
| 4   | 1        | layout       | Opening the table shrinks the map so that the lowest stop sits against the top right corner of the floating toolbar (about x 900, y 590 against the toolbar's top edge at y 600). Nothing is lost, but the drawing looks cramped. | `05.png`, `07.png`; transcript debrief |

No severity 2 to 4: the count and the marked links were right, nothing was removed, and the route
had no wrong turn.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
