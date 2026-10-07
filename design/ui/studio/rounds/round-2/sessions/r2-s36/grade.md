# Grade: session r2-s36 -- Alex (analyst), stop for the day and come back, Les Miserables

Graded from the last screenshot (10.png), the screenshots before it and the transcript. No files
were downloaded (the task needs none: the project is kept in the browser). The participant's own
rating (6 of 7) was not used.

## Grade: S (success)

- **Saved under a name he chose.** Main menu > "Save as..." opened "Save Les Miserables as" with a
  Name field (03.png); he typed "LesMis influence 2026-10-07" and pressed Save. The header took the
  name and the message read "Saved LesMis influence 2026-10-07 in this browser." (05.png).
- **Put away and reopened.** He closed the tab (`--reopen`), which the answer key accepts because
  the tool reopens the same browser storage. The start screen listed the project under Recent
  projects, "In this browser - 77 nodes" (06.png). Clicking it showed "Opened LesMis influence
  2026-10-07" (07.png).
- **Everything came back.** 07.png to 10.png: the orange Influence ramp with the same key (0.003299
  to 0.07543), names drawn on the nodes, the same arrangement as 01.png, the Everything row's Label
  line "Above / name" with "77 labels, 7 hidden to avoid overlap" (08.png), and the Influence run
  with all 77 values, the same Top 10 and its settings (PageRank, damping factor 0.85) (10.png).
- **His reading matches the screen.** He said everything came back and noticed, unprompted, that
  the number "77" beside Influence was gone after the reopen (07.png). The answer key counts
  "everything came back except the number beside Influence" as a correct reading.
- **Why S, not SD:** no detour and no wrong turn. Choosing "Save as..." from the menu instead of
  Control+S is the same dialog reached by pointer.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no.

## Counts

| | This session | Reference (round 2's build) |
|---|---|---|
| Steps to the end state | 6 (menu, Save as..., name, Save, close and reopen the tab, the project under Recent projects) | 6 |
| Steps in all | 9 (3 more to check the labels and the run's values) | -- |
| Wrong turns | 0 | -- |

The three checking steps (Everything, Influence, the Values tab) are verification of his own
work, not wrong turns.

## False "done"

None. "Saving part done" (step 4) matched the header and the message in 05.png. "Putting away
done" (step 5) matched the start screen in 06.png. "Task done" (step 9) and the wrap-up's "all my
work was there" match 07.png to 10.png; the one missing item he saw (the count beside Influence)
he named himself rather than claiming it was there.

## Problems

| # | Problem | Severity | Kind | Evidence |
|---|---|---|---|---|
| 1 | After a reopen the Influence row in the outline no longer shows its count "77" (shown before the save). The run, its colors and its values are back, so nothing was lost, but the participant briefly thought something had been dropped. Known graphty-element defect: a restored run has no summary. | 2 | build-defect | 01.png (row "Influence 77") vs 07.png (row "Influence", no count), step 6. Reproduced on every run by `rounds/round-2/repro/r2-s36/repro.sh` (its `run/06.png`); the same as `rounds/round-2/repro/r2-s35/`. |
| 2 | The "Save ... as" dialog does not say where the project will be kept; only the message after Save says "in this browser". He hesitated on that before saving. | 1 | behavior | Step 2, 03.png; step 4, 05.png. |
| 3 | The main menu offers three saves (Save, Save as..., Save local copy...) with no hint which one asks for a name or where each one puts the project; he stopped to choose. | 1 | behavior | Step 1, 02.png. |
| 4 | Browser-only storage worries an analyst: with the start screen's "This browser can clear projects kept here", he wanted a file on disk to be the obvious save, not the third option. | 1 | opinion | Step 5, 06.png; wrap-up. |
| 5 | The row and the key say "Influence"; the word PageRank appears only under Values > Made with, so he had to hunt to name the measure correctly to his director. | 1 | opinion | Step 8, 09.png; step 9, 10.png. |

Opinion findings are held one level down. Problems 2 to 5 did not slow the task beyond a pause
and are not confirmed until a second participant meets them.
