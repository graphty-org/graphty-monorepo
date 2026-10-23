# Grade: session r2-s15 -- Tom (returning), bus stops (T22 A), make the slow links stand out

**Grade: SD** (success after a detour). The last screen (`09.png`) is the answer key's end state:
the find box holds "=minutes >= `10`", the line under it reads "3 edges selected", the Selection
row reads 3, the inspector header reads "3 edges selected" with Summary Edges 3 and a "Selected
edges" table listing School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14, and three lines
are drawn with blue bands among the gray ones on the full map of 10 stops. No filter step is on
(`work.json`: `steps` empty at start and end, nothing gone). Tom's answer, "3 links take 10 minutes
or more", with the three links and their minutes, matches the key. It is SD, not S, for one dead
end: his first entry, the column name "minutes" alone, got "No match for "minutes"" (`03.png`) and
no hint. Everything after it -- the "Start with = to select by a value" hint (`04.png`), then the
bare-number refusal "Put numbers in backticks" (`06.png`) and the corrected rule (`08.png`) -- is
the round 2 route, which the key counts as the path, not a detour.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `bus-stops-ranked.txt` (PageRank run, Size by PageRank); the start
state in `work-start.json` (one PageRank run, the Influence layer, no steps) is the one the setup
should leave, so the start counts.

## The answer against the key

- **Count and set (right).** 3, and the table lists exactly the key's three links with their
  minutes (`09.png`).
- **Everything else still drawn (right).** All 10 stops and every other line are on the canvas;
  no filter step (`work.json`).
- **Not a wrong answer.** Not `hid-the-rest`, not `not-marked` (the selection is on the last
  screen), not `read-wrong` (he never typed 16 or another threshold).

## Measures

- **Route:** a rule in the find box. Tom did not type "=" unprompted: he typed it only after the
  hint "Start with = to select by a value" (`04.png`). He did not copy the hint's whole line
  (which already had the backticks); he put "=" in front of his own text (`05.png`, `06.png`), got
  the bare-number refusal, cleared the box and typed the refusal's example with "=" in front
  (`08.png`).
- **Where he looked for the column:** nowhere; he knew "minutes" from the task and his colleague's
  file. He never opened the "=" column list, the Data page or an edge's values.
- **Where he looked for a separate "select where" dialog:** none; he went straight to the find box
  because its placeholder says "values".
- **Steps:** 8 `real.mjs` steps after the start (`02.png` to `09.png`): click the box, "minutes",
  " >= 10", Home, "=", Clear, the rule, Enter. The round 2 route is 4 (5 when the participant puts
  "=" in front and meets the refusal). The extra 3: the click on the box in place of "/" (1 for 1,
  not extra), the dead-end "minutes" (1), and Home plus Clear as cursor work (2).
- **Wrong turns:** 1 -- "minutes" alone, expecting the column name to offer something (`03.png`).
- **False "done":** none. "Done" (`09.png`) is true: the three links are marked, the count is on
  screen in three places, nothing is hidden. truth_on_screen: holds.
- **Ease (from the transcript):** 4 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Enter drew the bands, the count and the table at once.
- **Numbers that disagree (bar 5):** none. "3 edges selected" (box line, inspector header),
  Edges 3, Selection 3 and the three table rows agree.
- **Broken habit:** none.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; no tool refusal.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                          | Evidence                                                                                                       |
| --- | -------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | A bare column name that exists on the edges ("minutes") gets only "No match for "minutes"", with no sign that it is a column a rule can use. Tom: "That's the column -- how is there no match?" The round 2 hint appears only once a comparison is typed. Ruth hit the same dead end on the same task this round (session r2-s09, `02.png`), so confirmed. | `03.png`; transcript end, first bullet                                                                          |
| 2   | 2        | comprehension   | "Put numbers in backticks" assumes the reader knows what a backtick is. Tom had never typed one and found the key only by matching the example's "little slanted ticks"; he said without the example he "would have stopped and emailed her". The example line saved the task.             | `06.png`; transcript: "I don't know what a backtick is"                                                        |
| 3   | 1        | wording         | The hint and the refusal show the rule in monospace with the backticks but do not say "copy this"; Tom put "=" in front by hand (Home, then "=") instead of copying the hint's whole line, which cost the refusal and a retype.                                                       | `04.png`, `05.png`, `06.png`, `07.png`                                                                         |
| 4   | 1        | trust           | "Rule: press Enter to select matches" did not tell Tom whether Enter would change his colleague's file; he pressed it only because it did not say "Delete".                                                                                                                       | `08.png`; transcript: "I hope that doesn't remove anything"                                                     |
| 5   | 1        | wording         | The result says "edges"; Tom's word is "links". He read it correctly.                                                                                                                                                                                                            | `09.png`; transcript end                                                                                        |
| 6   | 1        | comprehension   | Nothing on screen says whether the blue selection survives a click elsewhere or a save, which Tom needs for a slide. The key records that Escape outside the box clears it and that it is not in the undo history; Tom did not meet either.                                          | transcript end, last bullet; answers.md "Known on this build"                                                   |
| 7   | 0        | legibility      | No stop names are drawn on the bus-stops setup, so the bands can be tied to stops only through the "Selected edges" table. Tom read the table and called it "the best part".                                                                                                       | `09.png`                                                                                                       |

No severity 3 or 4: the answer was right and complete, and every difficulty was on a path he
finished. Problem 2 is the one that came closest to stopping him.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
