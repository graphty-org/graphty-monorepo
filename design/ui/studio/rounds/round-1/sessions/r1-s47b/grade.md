# Grade: session r1-s47b -- Tom, stop for the day and come back (Les Miserables)

**Grade: S** (success). Tom saved the work under a name he chose, put it away, reopened that save
from Recent projects, and his account of what came back matches the screen.

## The success definition, part by part

1. **Saved under his own name.** `05.png`: the toast "Saved as Les Mis characters Tom", and the
   title bar reads "Les Mis characters Tom". The file is in `saved/Les Mis characters
Tom.graphty.json` (29,860 bytes).
2. **The project put away.** Step 6 closed the tab and opened the app again in the same browser
   storage (`--reopen`). The task accepts this route because the tool reopens the same storage.
   `06.png` shows the start page with "Les Mis characters Tom, 77 nodes" under Recent projects.
3. **Reopened from Recent projects, not the sample.** Step 7 clicked his entry under Recent
   projects; he said aloud that the plain "Les Miserables" under Samples would not hold his work.
   `07.png`: the toast "Opened Les Mis characters Tom".
4. **The run, its colors and the names are back.** `07.png` and `09.png` (the last screenshot):
   the Influence row is in the outline, the key reads "Color: Influence, 0.003299 to 0.07543" as
   before, the nodes are colored the same, the names are drawn, and the layout is the same.
   `08.png`: the label line on Everything reads "Above, Abc name" and "77 labels, 7 hidden to
   avoid overlap", the same as `01.png`. `09.png`: Influence shows "77 of 77 have a value" and
   the Top 10 starts Valjean 0.07543.
5. **His "did everything come back" matches the screen.** He said the names, the colors and the
   "who matters most" list all came back, and he named the one thing that did not: the count
   "77" beside Influence in the outline. That is exactly what the screen shows, and the task
   counts it as a correct reading.

## Measures

- **Steps:** 6 `real.mjs` steps to the reopened project (`02.png` to `07.png`) against a success
  path of 5, plus 2 checks (`08.png`, `09.png`). The extra step is opening Save through the main
  menu instead of Control+S.
- **Wrong turns:** 0. In step 4 his "Save#2" guess matched nothing and no click happened; the
  next step clicked the one Save button. That is a guessed target, not a turn off the path.
- **False "done":** none. Every claim matches the screen; he did not call the reopen complete
  until he had checked the missing count against the Influence panel (`09.png`).
- **Build-decided:** no. **Void:** no. `real.mjs` did nothing a person could not do. The session
  waited about 25 minutes for a free browser slot before it began; that delayed it but changed
  nothing in it.

## Problems

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Evidence                           |
| --- | -------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | 3        | build-defect | After a saved project is reopened, the Influence row in the outline loses its count "77" and shows only its color bar, though the run came back whole (77 of 77 values). Tom thought work had been lost and said that without clicking the row he would have told his PI the work was incomplete. This is a graphty-element defect: a restored run has no summary. Reproduced on build 452285142099: `repro/r1-s47b/run.sh`, "77" beside Influence in `02.png`, gone in `04.png`. | step 7 `07.png` (compare `01.png`) |
| 2   | 1        | behavior     | After the reopen the inspector shows the Graph overview, not the Everything panel Tom left open, so he had to find his place again.                                                                                                                                                                                                                                                                                                                                               | step 7 `07.png`                    |
| 3   | 1        | wording      | Nothing on the screen says in plain words what "Influence" means ("which characters matter most"); he took it on trust.                                                                                                                                                                                                                                                                                                                                                           | `01.png`, `09.png`                 |
| 4   | 0        | opinion      | He skipped the save dialog's grey line "Choose where the file goes next..." and could not say where the file is on his computer. Recent projects found it, so it did not matter today.                                                                                                                                                                                                                                                                                            | step 3 `03.png`                    |
