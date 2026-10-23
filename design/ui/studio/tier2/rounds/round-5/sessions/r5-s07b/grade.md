# Grade: session r5-s07b

Task T22, dataset A (bus stops, bus-stops.csv, ranked, colored and sized by PageRank at the start),
persona Tom (tier 1 graduate). Build 8c015b806086 (graphty@0.8.65), the frozen round 5 build
(`session.json`), at 1440 x 900.

**Grade: S** -- the three links of 10 minutes or more are selected and drawn with a blue band on
the full map, nothing was taken off the drawing, no filter step is on, and the participant gave the
right count, 3, read from the screen.

## Evidence from the last screenshot (04.png) and the saved files

- The inspector header reads "3 edges selected" (subtitle "Selection"), Summary "Edges 3", and the
  left list shows "Selection 3". The PageRank row still reads 10.
- The inspector's "Selected edges" table (Edge, minutes) lists School -> Harbor 12, Depot -> Station
  15, Station -> Harbor 14 -- exactly the answer key's three links.
- All 10 stops and every gray link are still drawn; the three selected links carry the thick blue
  band. The PageRank size and color key is still shown.
- `work.json`: no filter step at the start or the end (`"steps": []`), the PageRank run and all
  three layers kept, nothing under "gone".
- The participant's final answer: "There are 3 links of 10 minutes or more: School -> Harbor (12),
  Depot -> Station (15) and Station -> Harbor (14)", matching the key.

## Route and counts

- Steps: 3 (click the find box; type "10"; click the offered "minutes is 10 or more (3)" under a
  "Values" heading, 03.png). The same count as the key's 3-step success path, by a different
  route: the find box offered a ready-made condition from a bare number, with its match count, so
  the participant never typed "=", a column name or backticks. The answer key does not describe
  this suggestion row; it is graded by the end state, which is the key's.
- Where the participant found `minutes`: nowhere before typing. The column name first appeared in
  the find box's suggestion after a bare "10" (03.png).
- Wrong turns: 0.
- False "done" claims: none. "Done" was said with the correct selection and count on screen.
- Scripted exit: not applicable (no give-up).

## Problems

1. **Severity 1 -- the suggestion "minutes is 10 or more (3)" carries a funnel icon** (03.png), the
   same mark as the toolbar's filter, while the task forbids taking anything off the drawing. The
   participant said: "I thought clicking it would hide the other stops ... I didn't know that until
   after I clicked." He clicked anyway, ready to undo, and it only selected. No wrong conclusion
   followed, but a more cautious person could decline the one control that does the job. Also
   seen as a remark (severity 0) in r5-s05b, so the icon reading as "filter" is confirmed by two
   participants.
2. **Severity 1 -- nothing on the main screen says the links carry minutes** (01.png, 02.png).
   The participant guessed at the find box ("it says values") and typed a bare number to discover
   the column. It worked on the first try; it cost no steps, only certainty.
3. **Severity 0 -- whether the blue marks persist** ("it says 'Selection', which sounds like it
   goes away when I click somewhere else") was raised and not tested. Opinion only, held down from
   1; outside the question the task asks. The key notes that Escape outside the find box does clear
   the selection, so the worry has a basis, but the participant did not meet it.

## Notes on the method

- The participant is simulated and briefed as a returning user; a pass is weak evidence until real
  people confirm it. Keyboard and screen-reader access were not studied in this session.
- The tool ran cleanly: the start setup completed (`setup.log`, `work-start.json`), every step
  produced its screenshot, `leaks.json` lists no leaks, and the session ended with `--end`.
