# Grade: session r3-s16 -- Tom (tier 1 graduate), Les Miserables (T22 B), point out every tie of 10 or more shared chapters

**Grade: SD** (success with difficulty). The last screen (`07.png`) shows exactly the end state
the answer key asks for: the line under the find box reads "13 edges selected", the inspector
header "13 edges selected" with Summary "Edges 13", the Selection layer row reads 13, and the
"Selected edges" table lists the 13 ties of the key with their shared_chapters (MmeMagloire --
Myriel 10, Thenardier -- MmeThenardier 13, Thenardier -- Valjean 12, Cosette -- Valjean 31, Javert
-- Valjean 17, Marius -- Gillenormand 12, Marius -- Cosette 21, Marius -- Valjean 19, Combeferre --
Enjolras 15, Courfeyrac -- Enjolras 17, Courfeyrac -- Combeferre 13, Bossuet -- Courfeyrac 12,
Bossuet -- Enjolras 10). The 13 ties are drawn as thick blue bands, every character and every
other tie is still drawn, and no filter step exists (`work.json`: `steps` empty at start and end,
`gone` empty). Tom gave the count 13, read from the screen. Graded SD, not S: he reached it in 6
steps against the success path's 3, through two wrong turns (below).

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `lesmis-ranked.txt` (PageRank run, size and color by
PageRank). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **Marked ties (right).** `07.png`: 13 blue bands on the full drawing; the table's 13 rows match
  the key row for row, smallest 10, largest 31.
- **Nothing taken off the drawing (right).** All characters and grey ties still drawn; the
  PageRank row still reads 77; `work.json` shows no filter step and nothing removed, and the start
  and end `layers` lists are the same.
- **Count (right).** "13", read from the line under the box and the table.
- **Not a wrong answer.** Not `hid-the-rest`, not `not-marked`, not `read-wrong` (he copied the
  hint's form but used 10, not its example 16), not `false-done`.

## Measures

- **Route:** a rule in the find box, typed by hand after copying the form of the "No match" hint.
  Click the box (`02.png`), type "10" (`03.png`: two ties at exactly 10 and a cut "Select where
  shared_chapters is 1..." row), click that row (`04.png`: 2 edges selected), type ">=10"
  (`05.png`: 'No match for ">=10". To select by a value, type a rule such as =shared_chapters >
  `16`'), clear and type "=shared_chapters >= `10`" (`06.png`: "Rule: press Enter to select
  matches"), Enter (`07.png`).
- **Typed "=" unprompted:** no. He typed "=" and the backticks only after the "No match" hint
  showed them.
- **Where he looked for the column name:** the find box's own results for "10" and the hint's
  example; not the "=" list, not the Data page.
- **Where he looked for a "select by condition" dialog:** nowhere; the find box was his first and
  only place.
- **Steps:** 6 `real.mjs` steps after the start, against 3 for the success path. The opening click
  into the box is the success path's `/` and is not counted against him.
- **Wrong turns: 2.**
  1. Step 3: clicked "Select where shared_chapters is 1..." and selected only the 2 ties of exactly
     10 (`04.png`). He noticed at once that 2 was too few.
  2. Step 4: typed the spreadsheet form ">=10", which got "No match" (`05.png`). Unlike text that
     names the column ("shared_chapters >= 10"), a bare ">=10" is not offered as a corrected rule,
     so he had to retype.
  Both were recovered without undo; nothing he did had to be taken back.
- **Copied the hint:** yes, its form, with his own operator and number; he did not copy the line
  whole.
- **False "done":** none. "Thirteen, every one of them 10 or above ... nothing has gone"
  (`07.png`) is true. truth-on-screen: holds.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Lost earlier styling (Control+Z):** no; no Escape or undo used. PageRank size and color intact.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; `leaks.json` shows no
  leaks. The tool reported the click into the box at step 5 as slow (over 3 s); the click landed
  and the screen shows the typed rule, so the run was not affected.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem | Evidence |
| --- | -------- | --------------- | ------- | -------- |
| 1   | 2        | discoverability | A plain number in the find box lists only exact matches and offers only "Select where shared_chapters is 1..." (exactly 10); nothing says a comparison such as "10 or more" can be typed. Tom took that row, selected 2 ties, and had to start again. Same finding as r3-s12, so confirmed (2 participants). | `03.png`, `04.png`; transcript steps 2 and 3 |
| 2   | 2        | legibility      | The "Values" row under the "10" results is cut off at "Select where shared_chapters is 1...", so whether it means "is 10", "is 1..." or something else cannot be read before clicking. Same as r3-s12: confirmed. | `03.png`; transcript debrief |
| 3   | 2        | error recovery  | A spreadsheet-style condition with no column name (">=10") gets "No match" and a generic example, not the participant's own condition made into a rule, as "shared_chapters >= 10" does on this build. The user who only knows the number has to rebuild the rule by hand. | `05.png`; transcript step 4 |
| 4   | 1        | wording         | The example rule's backticks ("=shared_chapters > `16`") and its small grey monospace text read as code he would never have guessed; he copied them only because they were shown. It did not stop him. | `05.png`; transcript step 5 and debrief |
| 5   | 0        | feedback        | The selected-edges list after "is 10" (`04.png`) shows only the tie names with no shared_chapters column, while the 13-tie list (`07.png`) shows the values; the value is what told him the first selection was wrong. Cosmetic. | `04.png`, `07.png` |

No severity 3 or 4: the count and the marked ties were right, nothing was removed, and both wrong
turns were seen and recovered by the participant himself.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
