# Grade: session r2-s35 -- Nadia (alert reviewer), stop for the day and come back

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Graded from the last screenshot (12.png),
the downloaded file `downloads/LesMis key characters 2026-10-07.graphty.json` (29,870 bytes,
`"name": "LesMis key characters 2026-10-07"`, members graphty-data, graphty-session and
graphty-results), the transcript and one scripted re-run on the same build.

## Grade: SD (success with difficulty)

- **Success definition met.** Saved under her own name, "LesMis key characters 2026-10-07" (05.png:
  header shows the name, "Saved LesMis key characters 2026-10-07 in this browser."). Closed with
  Main menu > Back to start (06.png). Closed the tab and came back in a new one (`--reopen`, the
  accepted path), then opened the project from Recent projects (09.png, 10.png "Opened ...").
  The last screenshot (12.png) shows the Influence row, the orange color ramp and its key
  "Color: Influence 0.003299 -- 0.07543", names drawn on the characters, and the Values tab
  "77 of 77 have a value", Top 10 led by Valjean 0.07543, "Made with: PageRank, Ran Oct 7".
- **Her "did everything come back" matches the screen.** She said the drawing, names, colors and
  all 77 scores came back, and noticed the missing "77" beside Influence; the answer key counts
  that reading as a match.
- **Why SD, not S:** the start page's grey line "This browser can clear projects kept here. Save a
  local copy of any project you need to keep." made her doubt the save she had just made, so she
  reopened the project and ran Save local copy as well (steps 6-8), and the missing "77" made her
  doubt the scores until she clicked through to Values (steps 11-12). She finished, but only after
  two moments where the app left her unsure whether her work was safe.
- **Failure codes:** none. **Build-decided:** no. **Void:** no.

## Counts

|                  | This session       | Reference           |
| ---------------- | ------------------ | ------------------- |
| Steps (real.mjs) | 11 after the start | 6 (round 2's build) |
| Wrong turns      | 0                  | --                  |

Her route was Main menu > Save as... instead of Control+s; both open the same "Save Les Miserables
as" dialog, so it is on the path. The extra reopen and Save local copy (steps 7-8) are allowed by
the answer key ("a participant who also does that has not taken a wrong turn"). Steps 11-12
(Influence, Values) are checking, not wrong turns.

## False "done"

None. Every claim in the wrap-up is true of 12.png. She did not claim every name was drawn.

## Problems

Severity 0-4 (Nielsen). Build defects were reproduced by `rounds/round-2/repro/r2-s35/repro.sh`
(same setup, Save as, Save local copy, Back to start, reopen; output in `run/` and `run.log`).

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                                 | Evidence                                                                                                                                                |
| --- | --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3   | wording      | The save message "Saved <name> in this browser." does not say that the browser can clear it; the only warning is small grey text on the start page. Nadia said that without that line she "would have gone home thinking it was safe" -- a wrong belief about her own work, with data loss as the cost. | Step 5, 05.png; step 6, 06.png. One participant; wording, unconfirmed until a second.                                                                   |
| 2   | 2   | build-defect | Save local copy... writes the .graphty.json file but the app shows nothing: no message, no announcement, unlike Save ("Saved ... in this browser."). Nadia could not tell from the app that anything happened.                                                                                          | Step 8, 08.png. Repro: `run.log` step 06 ("a file was saved: Repro save.graphty.json"), `run/06.png` shows no message; compare `run/04.png` after Save. |
| 3   | 2   | build-defect | After reopening, the Influence row in the outline has lost its count "77" (a restored run has no summary, a known graphty-element defect). It made her doubt the scores came back and cost two extra steps.                                                                                             | Steps 7, 10, 11; 07.png, 10.png, 11.png vs 01.png. Repro: `run/01.png` (77) vs `run/08.png` (no count).                                                 |
| 4   | 2   | wording      | "Local only" beside the lock in the header never explained itself and did not change after saving; she could not tell whether it meant "not saved" or "private".                                                                                                                                        | Steps 1 and 5, 01.png, 05.png.                                                                                                                          |
| 5   | 2   | wording      | Three saves in the main menu (Save, Save as..., Save local copy...) with no hint which keeps the work and where; she hesitated and chose by analogy with Word.                                                                                                                                          | Step 2, 02.png.                                                                                                                                         |
| 6   | 1   | opinion      | Recent projects lists only the in-browser copy, not the downloaded file, so she did not know how she would find the file again.                                                                                                                                                                         | Step 9, 09.png.                                                                                                                                         |
| 7   | 1   | behavior     | After reopening, the inspector shows the Graph overview instead of the Everything style she had open (a selection, not lost work).                                                                                                                                                                      | Step 7, 07.png.                                                                                                                                         |

What worked: Save as asked for a name at once with the old name selected; the header took the new
name; Back to start read as "close" to her; the project was the first item under Recent projects
after the tab was closed; the Values tab's "Made with: PageRank, Ran Oct 7" told her exactly what
the scores were.
