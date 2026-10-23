# Grade: session r2-s10 -- Nadia (returning), Les Miserables (T22 B), make the ties of 10 or more chapters stand out

**Grade: SD** (success with difficulty). The last screen (`09.png`) matches the answer key: the line
under the find box reads "13 edges selected", the left list shows "Selection 13", the inspector
header reads "13 edges selected" with Summary "Edges 13" and a "Selected edges" table of the 13 ties
with their shared_chapters (MmeMagloire -- Myriel 10, Thenardier -- MmeThenardier 13, Thenardier --
Valjean 12, Cosette -- Valjean 31, Javert -- Valjean 17, Marius -- Gillenormand 12, Marius --
Cosette 21, Marius -- Valjean 19, Combeferre -- Enjolras 15, Courfeyrac -- Enjolras 17, Courfeyrac
-- Combeferre 13, Bossuet -- Courfeyrac 12, Bossuet -- Enjolras 10). Every character and tie is
still drawn, the 13 ties carry thick blue bands, and there is no filter step (`work.json`: steps
empty at start and end). Nadia said "13". The difficulty: one dead end (">=10", "No match") before
the round 2 hint showed her the rule.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `lesmis-ranked.txt`; `01.png` is the start the setup should leave (the
PageRank run's Style tab, Size "1 to 3", the key has Size and Color rows), so the start counts.

## The answer against the key

- **Count and set (right).** 13, and the table lists exactly the key's 13 ties, both 10s included.
- **Nothing taken off the drawing (right).** `09.png`: all 77 characters and the other ties still
  drawn; the 13 stand out as blue bands. No filter step.
- **Not a wrong answer.** Not `read-wrong`: she never typed 16, and her count came from the line
  under the box, the Selection row and the table, which agree.
- **Route.** The round 2 route: plain text that the find box turned into the rule
  ("shared_chapters >= 10" -> "Start with = to select by a value: =shared_chapters >= `10`",
  `07.png`), then the rule copied whole, backticks included (`08.png`, "Rule: press Enter to select
  matches"), then Enter (`09.png`). She copied the hint's own line.

## Measures

- **Steps:** 8 `real.mjs` steps after the start (`02.png` to `09.png`); 7 that did something, since
  step 1's click never happened (see "Tool events"). The round 2 route is 4 (success path 3), so
  about 1.75x the route. The extra steps: the click by position that replaced the lost click, the
  bare "10", a hover to read a cut-off line, and ">=10".
- **Wrong turns:** 1. ">=10" (`06.png`) got "No match" with no hint and led nowhere. The bare "10"
  before it is not counted: it was the right place and it gave her the column name
  ("shared_chapters", `04.png`), which she used two steps later.
- **First move:** the find box, which her history names; it led on to the task. **Broken habit:**
  none.
- **False "done":** none. "13 ... Done" is what `09.png` shows. truth_on_screen: holds.
- **Silent commit (bar 4):** none; Enter drew the bands and wrote the count in three places.
- **Numbers that disagree (bar 5):** none; "13 edges selected", "Selection 13", "Edges 13" and the
  13 table rows agree.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no (below). **Scripted exit:** not applicable; she finished.

## Tool events (not app findings)

- Step 1: `--click "Find nodes, edges, values"` printed "Could not click: elementHandle.click:
  Timeout 3000ms exceeded" and the box did not take focus (`02.png` differs from `01.png` only in a
  2 x 22 px strip at x 70 to 72, y 145 to 167). The next step clicked the same box by position
  (`--click-at 170,90`, "combobox Find") and it took focus at once (`03.png`), so nothing in the app
  covers the box. This is the click timeout the answer key lists as the tool's ("Tool faults seen in
  the round 1 pilots"): the machine's load average was about 73 to 87 when this session ended, the
  same range in which earlier pilots' clicks timed out. Its cause is not traced in the tool. The
  session is not void: the participant re-did the click by position and every later step ran, as in
  r2-s06. The transcript's observer note that this is "an implementation issue" in the app, and
  Nadia's debrief complaint "the first click on the search box did nothing", come from this tool
  event and are not counted as app problems.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                         | Evidence                                                                                          |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | A comparison typed without a column (">=10") gets only "No match", with no hint that a rule needs "=" and a column name. The round 2 hint appears only once the text already names the column. Nadia reached it only because a bare "10" had shown her the column's name; "the spreadsheet way" (>=10) is a natural first try. | `06.png`; transcript step 5 and debrief                                                          |
| 2   | 2        | wording         | The rule's required backticks around the number look like a typo to a reader. Nadia typed them only because the hint showed them and asked "Do I need them? It didn't say." The leading "=" was also something she "would never have guessed".                                                                                | `07.png`, `08.png`; debrief                                                                       |
| 3   | 1        | legibility      | With "10" typed, the Values suggestion is cut off ("Select where shared_chapters is 1...") so "is 10" and "is 10 or more" cannot be told apart without a hover. Cost one step.                                                                                                                                                  | `04.png`; `05.png` (tooltip "Select where shared_chapters is 10 (2)")                            |
| 4   | 1        | feedback        | "Rule: press Enter to select matches" gives no count before Enter; she wanted to know how many before committing. Enter is reversible, so held at 1.                                                                                                                                                                           | `08.png`; transcript step 7                                                                       |
| 5   | 1        | comprehension   | She was unsure whether the blue marking lasts (a click on the drawing, the export for the case file) and whether "selected" changes the data or only the view; "selected" is not her word "marked". Not tested in the session, opinion only.                                                                                   | debrief                                                                                           |

No severity 3 or 4: the answer is right, nothing was removed from the drawing, and every difficulty
was on a path she completed.
