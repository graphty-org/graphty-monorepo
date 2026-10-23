# Grade: session r5-s04b (T22 B, Dana, regular analyst)

**Grade: S** -- the 13 ties of 10 or more shared chapters are marked on the drawing, nothing is
taken off it, no filter step is on, and the participant read the count, 13, from the screen.

Build: 8c015b806 (graphty@0.8.65), the frozen round 5 build (`session.json` buildStamp
"8c015b806086 graphty@0.8.65"). The setup ran in full: PageRank colors and sizes are on (layers
"Node defaults", "Edge defaults", "Influence" in `work-start.json`; the size and color legend on
every screenshot). No briefing leaks (`leaks.json`, "leaks": []).

## End state (05.png)

- Inspector header "13 edges selected", Summary "Edges 13", and the Selection layer row in the
  left list reads 13.
- The "Selected edges" table lists exactly the 13 ties in the answer key, with the same
  shared_chapters values: MmeMagloire -- Myriel 10, Thenardier -- MmeThenardier 13,
  Thenardier -- Valjean 12, Cosette -- Valjean 31, Javert -- Valjean 17, Marius -- Gillenormand 12,
  Marius -- Cosette 21, Marius -- Valjean 19, Combeferre -- Enjolras 15, Courfeyrac -- Enjolras 17,
  Courfeyrac -- Combeferre 13, Bossuet -- Courfeyrac 12, Bossuet -- Enjolras 10.
- The 13 ties are drawn as thick blue bands; every character and every gray tie is still drawn
  (PageRank row still reads 77).
- No filter step: the layer list holds only Selection, PageRank and Everything, and `work.json`
  shows the same runs and layers at the end as at the start ("gone": {}).
- The participant's answer: "13 ties of 10 or more shared chapters, shown thick blue on the
  drawing, nothing taken off". Correct.

## Route

A route the answer key does not describe on this build: typing a plain number into the find box.

1. Click on the find box (02.png): focus, no list and no hint of what to type.
2. Type "10" (03.png): under "Edges 2" the two ties with exactly 10, and under "Values" two rows,
   "shared_chapters is 10 (2)" and "shared_chapters is 10 or more (13)", each with a funnel icon.
3. Hover the "10 or more" row (04.png): the row highlights; no tooltip, drawing unchanged. A check
   before acting, not a wrong turn.
4. Click the row (05.png): the 13 ties are selected.

Four actions, three of them needed (click, type, click), the same count as the success path
(`/`, type the rule, Enter). The participant never typed "=" and never saw a rule; the
"Values" row is the place they found "select where". They did not look for a separate dialog.
They found `shared_chapters` from the find list itself, not the Data page or an edge's values.
They did not use 16.

## Claims

- False "done" claims: 0. The participant said "done" only at 05.png, where the end state is right.
- Wrong turns: 0.

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 2 | The "Values" rows in the find list carry a funnel icon, the same glyph as the Filters tool on the canvas toolbar (about 833,864). A participant told not to take anything off the drawing read it as "filter, hide the rest" and nearly did not click the one row that does the task. The row selects; nothing on it says so. | 03.png and 04.png (funnel beside "shared_chapters is 10 or more (13)"; funnel on the toolbar); transcript step 03 "the icon next to it looks like a filter funnel, and I must not take anything off the drawing", wrap-up "I nearly didn't click it" |
| 1 | Hovering a "Values" row shows no tooltip or other sign of what a click will do (select, not filter). The participant could only find out by clicking and relying on undo. | 04.png (row highlighted, no tooltip); transcript step 04 |
| 1 | Focusing the empty find box shows no list and no hint of what can be typed (names, values or rules). | 02.png; transcript step 02 "nothing drops down, no hint about what to type" |
| 1 | The small gray sub-labels under each result ("shared_chapters: 10") are hard to read. | 03.png; wrap-up "hard to read without my glasses" |
| 1 | The app's word is "edges" ("Edges 2", "13 edges selected"); the participant's word is ties or links. The table made the meaning clear. | 03.png, 05.png; wrap-up |
| 0 | Wants to know whether the selected list exports to a spreadsheet. Outside the task; not tested. | wrap-up, "So what for my job" |

## Notes for the report

- This participant is simulated, briefed as returning; a pass is weak evidence until real people
  confirm it. The route used here was not in the history, so the speed is not from memory.
- The answer key for T22 does not yet describe the find list's "Values" rows (a typed number
  offering "<column> is N" and "<column> is N or more" with counts). It should, with what a click
  and Enter on each row do.
