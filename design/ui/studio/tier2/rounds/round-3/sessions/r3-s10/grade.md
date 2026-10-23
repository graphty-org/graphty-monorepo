# Grade: session r3-s10 -- Ruth (tier 1 graduate), Les Miserables (T22 B), point out every tie of 10 or more shared chapters

**Grade: SD** (success with difficulty). The end state is the one the answer key grades: "13 edges
selected" under the find box and in the inspector header, Summary "Edges 13", the Selection row
"Selection 13", a "Selected edges" table listing exactly the key's 13 ties with their
shared_chapters, the 13 ties drawn with blue bands, all 77 characters and every tie still drawn,
and no filter step (`05.png`; `work.json` end state has no steps, nothing gone). Ruth reported 13.
It is SD rather than S because her first attempt was a detour that gave a wrong set: she typed a
plain "10", which finds only the ties of exactly 10 (2 ties), and she reached the comparison by
guessing at spreadsheet syntax, not from anything on screen that offered it.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900, no screen-reader mode, no uncommitted changes. The start matches the setup: PageRank
run, color and size by PageRank, nothing selected (`01.png`, `work-start.json`).

## The answer against the key

- **Count (right).** 13, read from the line under the box, the inspector header and Summary, and
  the Selection row (`05.png`), all four places the key lists.
- **The ties (right).** The table in `05.png` reads MmeMagloire -- Myriel 10, Thenardier --
  MmeThenardier 13, Thenardier -- Valjean 12, Cosette -- Valjean 31, Javert -- Valjean 17, Marius --
  Gillenormand 12, Marius -- Cosette 21, Marius -- Valjean 19, Combeferre -- Enjolras 15,
  Courfeyrac -- Enjolras 17, Courfeyrac -- Combeferre 13, Bossuet -- Courfeyrac 12, Bossuet --
  Enjolras 10: the key's 13, value for value.
- **Pointed out on the full drawing (right).** The 13 ties carry blue bands; the layout and every
  node and tie are unchanged from `01.png`; no filter step was added.
- **Not a wrong answer.** Not 2 (the exact-10 set from `02.png` was not taken as the answer), not a
  count from 16 (the "=" list's example was never opened), not `read-wrong`.

## Route

Reconstructed from the screenshots; `transcript.md` holds only the end section and `session.log`
is empty, so the per-step commands are not on disk.

1. `01.png` start. The find box opened (by "/" or a click; not recorded).
2. `02.png` typed "10": the list shows "Edges 2" (MmeMagloire -- Myriel 10, Bossuet -- Enjolras 10)
   and a Values row "Select where shared_chapters is 1..." cut at the panel edge.
3. `03.png` hover on that row: the tooltip "Select where shared_chapters is 10 (2)". Ruth read this
   as "equal to" only after the hover.
4. `04.png` replaced the text with "shared_chapters >= 10" (no "="): the line "Start with = to
   select by a value:" and the marked option "=shared_chapters >= `10`" over "Select its matches".
5. `05.png` Enter: the matches selected, the box rewritten to "=shared_chapters >= `10`".

## Measures

- **Steps:** about 5 to 6 (open box, type "10", hover, replace text, Enter; the replace may have
  been a clear and a type) against 3 for the success path. The extra steps are the "10" detour and
  the hover to read the cut row. From step 4 she followed the round 2 route as the key describes
  it: Enter on the marked option, no retyping, so the correction itself cost no step.
- **Wrong turns:** 1 -- searching for the plain number "10", which answers a different question
  (exactly 10) than the task's (10 or more).
- **Copied the hint:** not applicable on this build; Enter took the marked option directly.
- **False "done":** none. "13 ties of 10 or more shared chapters, shown in blue on the full
  drawing, with nothing taken off it" is true on `05.png`. Her side claim that the two exact-10
  ties are in the selection is also true (rows 1 and 13). truth_on_screen: not applicable.
- **Ease (from the transcript, not used for the grade):** 6 of 7.
- **Silent commit (bar 4):** none. Enter changed the selection, the bands, the inspector and the
  box text at once.
- **Numbers that disagree (bar 5):** none. 13 in four places and 13 table rows.
- **Wording echo:** none. She brought ">=" from spreadsheets herself; the prompt says "10 or more".
- **Build-decided:** no. **Void:** no. Every step produced a screenshot and the end state is
  complete; the missing step log is a gap in the record, not a fault in what the tool did.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                           | Evidence                                                                       |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | 3        | discoverability | A plain number in the find box offers only "equal to" (2 ties of exactly 10) and nothing that leads toward "10 or more". A returning user who takes that row reports 2, a wrong count, without knowing it. Ruth avoided it only by guessing a spreadsheet comparison; the comparison syntax is reachable only by knowing to type it. | `02.png`, `03.png`; transcript: "I only found it by guessing"                  |
| 2   | 2        | legibility      | The Values row's label is cut at the panel edge ("Select where shared_chapters is 1..."), hiding the very word ("is 10") that tells the reader it means "equal to" and the match count; it reads in full only in a hover tooltip.                                                                                                  | `02.png`, `03.png`; transcript: "cut off ... until I hovered it"              |
| 3   | 1        | wording         | The accepted rule is rewritten with backquotes around the number ("=shared_chapters >= `10`"), a notation Ruth says she would never type; it worked, but it reads as code, not as her condition. Opinion-only, held one level down.                                                                                                 | `04.png`, `05.png`; transcript                                                 |
| 4   | 1        | feedback        | Nothing on screen says the rule was checked against every tie in the book; Ruth could not confirm the scope and checked it herself against the two exact-10 ties. Opinion-only, held one level down.                                                                                                                               | `05.png`; transcript: "I can't confirm from the screen that ... every tie"     |

Problem 1 is the one that would turn this task into a failure (`read-wrong`-shaped: a wrong count
reported with confidence) for a user who does not guess the comparison syntax.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
