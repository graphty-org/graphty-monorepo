# Grade: session r3-s12 -- Dana (regular analyst), Les Miserables (T22 B), point out every tie of 10 or more shared chapters

**Grade: S** (success). The last screen (`04.png`) shows exactly the end state the answer key asks
for: the line under the find box reads "13 edges selected", the inspector header "13 edges
selected" with Summary "Edges 13", the Selection layer row reads 13, and the "Selected edges"
table lists the 13 ties of the key with their shared_chapters (MmeMagloire -- Myriel 10,
Thenardier -- MmeThenardier 13, Thenardier -- Valjean 12, Cosette -- Valjean 31, Javert -- Valjean
17, Marius -- Gillenormand 12, Marius -- Cosette 21, Marius -- Valjean 19, Combeferre -- Enjolras
15, Courfeyrac -- Enjolras 17, Courfeyrac -- Combeferre 13, Bossuet -- Courfeyrac 12, Bossuet --
Enjolras 10). The 13 ties are drawn as thick blue bands, every character and every other tie is
still drawn, and no filter step exists (`work.json`: `steps` empty at start and end, `gone` empty).
Dana gave the count 13, read from the screen. No detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `lesmis-ranked.txt` (PageRank run, size and color by
PageRank). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **Marked ties (right).** `04.png`: 13 blue bands on the full drawing; the table's 13 rows match
  the key row for row, smallest 10, largest 31.
- **Nothing taken off the drawing (right).** All characters and grey ties still drawn; the
  PageRank row still reads 77; `work.json` shows no filter step and nothing removed. The setup's
  PageRank layer is intact (start and end `layers` lists are the same).
- **Count (right).** "13", read from the line under the box and the table.
- **Not a wrong answer.** Not `hid-the-rest`, not `not-marked`, not `read-wrong` (16 never typed),
  not `false-done`.

## Measures

- **Route:** a rule in the find box, through the no-"=" route. Dana typed "10" (`02.png`: two
  edges at exactly 10 and a cut "Select where shared_chapters is 1..." row), learned the column
  name from those results, selected the text and typed "shared_chapters >= 10" (`03.png`: "Start
  with = to select by a value:" over the marked row "=shared_chapters >= `10`" / "Select its
  matches"), then clicked that row (`04.png`).
- **Typed "=" unprompted:** no. She never typed "="; the hint supplied it. She typed a comparison
  ">=" on her own, as she would in a spreadsheet; nothing on screen had said a comparison works.
- **Where she looked for the column name:** the find box's own results for "10" (an edge's value
  line "shared_chapters: 10"). Not the "=" list, not the Data page.
- **Where she looked for a "select by condition" dialog:** nowhere; the find box was her first
  and only place.
- **Steps:** 3 `real.mjs` steps after the start, the same as the success path (`/`, type, Enter)
  and the no-"=" route on this build (3). Clicking the option row in place of Enter is the same
  step.
- **Wrong turns:** 0. The plain "10" search was a probe that found the column name she then used;
  it cost no extra step against the success path's count.
- **Copied the hint:** not applicable on this build; the option row selected directly. She did
  not retype after the hint.
- **False "done":** none. "That's it. Thirteen" (`04.png`) is true. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Lost earlier styling (Control+Z):** no; no Escape or undo used.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; `leaks.json` shows no
  leaks.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem | Evidence |
| --- | -------- | --------------- | ------- | -------- |
| 1   | 2        | discoverability | A plain number in the find box lists only exact matches ("shared_chapters: 10") and says nothing about "10 or more" or that a comparison can be typed. Dana got to the comparison by guessing spreadsheet syntax. | `02.png`; transcript debrief: "nothing on screen said I could" |
| 2   | 2        | legibility      | The "Values" suggestion under the "10" results -- the only row that offers to select by value -- is cut off at "Select where shared_chapters is 1...", so what it would do cannot be read. | `02.png`; transcript step 1 and debrief |
| 3   | 1        | wording         | The rule syntax: the 10 shown in backticks ("=shared_chapters >= `10`") and "Start with = to select by a value" read as a formula language she was never taught. It did not stop her: the marked option worked on the first click. | `03.png`; transcript step 2 and debrief |
| 4   | 1        | legibility      | The "Selected edges" table, the part she would take to a meeting, is small grey text on a dark panel, and she found no way to take it to a spreadsheet. | `04.png`; transcript debrief |
| 5   | 0        | feedback        | After the click the box is rewritten to the rule ("=shared_chapters >= `10`"); she accepted it but would not have typed it. Cosmetic. | `04.png`; transcript debrief |

No severity 3 or 4: the count and the marked ties were right, nothing was removed, and every
doubt she raised was about discoverability or wording on a path she completed in the minimum
number of steps.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
