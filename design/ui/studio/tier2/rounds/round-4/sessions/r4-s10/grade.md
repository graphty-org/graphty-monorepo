# Grade: session r4-s10 -- Grace (tier 1 graduate), Les Miserables (T22 B), ties that meet a condition

**Grade: S** (success). The last screen (`05.png`) matches the answer key's B end state exactly:
the inspector reads "13 edges selected" (subtitle "Selection"), Summary Edges 13, and a "Selected
edges" table listing the key's 13 ties with their shared_chapters (MmeMagloire -- Myriel 10,
Thenardier -- MmeThenardier 13, Thenardier -- Valjean 12, Cosette -- Valjean 31, Javert -- Valjean
17, Marius -- Gillenormand 12, Marius -- Cosette 21, Marius -- Valjean 19, Combeferre -- Enjolras
15, Courfeyrac -- Enjolras 17, Courfeyrac -- Combeferre 13, Bossuet -- Courfeyrac 12, Bossuet --
Enjolras 10). The left panel's Selection row reads 13, the PageRank row still reads 77, and every
character and every gray tie is still drawn, with the 13 ties drawn as thick blue bands. No filter
step exists (`work.json`: steps empty at start and end). Grace answered "13 ties of 10 or more
shared chapters", read from the table and the header, and checked the lowest row (10) to confirm
"10 or more" rather than "more than 10".

Build seen: `5277e2cbe1bd graphty@0.8.64` (`session.json`), the frozen build named at the top of
the criteria, at 1440 x 900. Start: setup `lesmis-ranked.txt` (PageRank run, nodes sized and
colored by PageRank). Tool commit `71ed347b39a5`, no uncommitted changes.

## The answer against the key

- **Marked (right).** `05.png`: exactly the 13 key ties selected and drawn in blue; nothing
  hidden.
- **Count (right).** 13, read from the screen (inspector header, Summary, table rows; the
  Selection row also reads 13).
- **Route not in the key.** Grace did not type a rule. She typed "10" into the find box, which
  listed two edges with shared_chapters 10 and, under a "Values" heading, two suggestion rows,
  "shared_chapters is 10 (2)" and "shared_chapters is 10 or more (13)" (`03.png`). Clicking the
  second selected the 13 ties (`05.png`). The key grades other routes by the end state, and the end
  state is right. The key's T22 entry does not describe this Values suggestion on 5277e2cbe; it
  should be added for later graders.
- **Work kept.** `work.json`: start and end lists identical (one PageRank run, three style layers,
  no notes, no steps, one source); nothing gone.

## Measures

- **Route:** a value suggestion in the find box (neither a typed rule, Shift-clicks, a color nor a
  filter). "=" was never typed and never needed; no separate select-by-condition dialog was looked
  for.
- **Steps:** 4 `real.mjs` steps after the start: click the find box, type "10", hover the
  suggestion, click it. The success path is 3 (`/`, type the rule, Enter). The hover changed
  nothing on screen (`04.png`) and is exploration, not a wrong turn.
- **Wrong turns:** 0.
- **False "done":** none. "Finished: yes, 13 ties ... shown in blue on the full drawing" is true on
  `05.png`. truth-on-screen holds.
- **Silent commit:** none. The click on the suggestion drew the bands, set Selection to 13 and
  switched the inspector (`04.png` to `05.png`).
- **Numbers that disagree:** none. 13 in the suggestion, the header, the Summary, the Selection
  row and the table agree with each other and with the key; 13 blue bands are drawn.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot and `leaks.json` shows
  no leaks over 21 calls.
- **Scripted exit:** not applicable; Grace finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                     | Evidence                                                                                                                                       |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | trust           | The Values suggestion rows carry a funnel icon, the common sign for a filter that hides rows, but clicking one selects and hides nothing. Hovering gives no tooltip, so the reader cannot tell before clicking whether characters will vanish; Grace clicked "half expecting characters to vanish". | `03.png`, `04.png` (funnel icons on both Values rows; hover shows only a row highlight); transcript step 3 and end: "No hint whether it hides things" |
| 2   | 1        | discoverability | The "is N or more" suggestion appears only after a number is typed into the find box; nothing on the rest screen says the box answers "at least" questions. Grace found it only because she typed "10" first. Opinion, held one level down.                                                    | `01.png` (placeholder "Find nodes, edges, values" only); transcript end: "I would not have guessed that the find box does 'at least' questions" |
| 3   | 1        | missing feature | The marking is only a selection, so the next click clears it; there is no visible way to keep the marked ties for a later view or a slide. Did not affect the task.                                                                                                                          | transcript end: "it goes away on my next click ... for a board slide I'd want to keep it"                                                      |

All three rest on one participant and are not confirmed by this session alone.
