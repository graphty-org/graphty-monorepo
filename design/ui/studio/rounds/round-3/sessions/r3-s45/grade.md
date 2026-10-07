# Grade: session r3-s45 -- Ruth (reporter with a contacts sheet), stop for the day and come back

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mode at
1440 x 900. Graded from the last screenshot (10.png), the saved file
`downloads/Les Mis key characters.graphty.json` (29,860 bytes) and the transcript, plus one
scripted re-run on the same build. Not from the participant's rating (6 of 7).

## Grade: S (success)

Every part of the task's success definition holds.

1. **Saved under a name she chose.** Steps 1-3: Main menu, "Save as...", typed "Les Mis key
   characters", Save. 04.png shows the header renamed and the message "Saved Les Mis key characters
   in this browser."
2. **The project closed.** Step 5: she closed the tab and opened the app again (`--reopen`, the same
   browser storage). The answers accept this path. 06.png is the start page.
3. **Reopened from Recent projects.** 06.png lists "Les Mis key characters -- In this browser - 77
   nodes - Oct 7, 2026". Step 6 clicked it; 07.png shows "Opened Les Mis key characters".
4. **The run, its colors and the names are back.** 07.png and 10.png: the PageRank row is in the
   outline, the key reads "Color: PageRank 0.003299 -- 0.07543", the nodes keep their orange ramp
   and the same places, and the names are drawn. Step 8 (09.png, the same panel as 10.png) shows the
   run's values intact: "77 of 77 have a value", the Top 10 starting Valjean 0.07543, Damping
   factor 0.85.
5. **Her "did everything come back" matches the screen.** She said everything came back, and
   noticed the missing "77" beside PageRank. The answers name that as a correct reading, not
   `lost-state`. The inspector showing the Graph overview after the reopen is a selection, not
   lost work.

- **Build-decided:** no.
- **Void:** no. The tool did nothing a person could not.
- **Failure codes:** none.
- **Extra step, not a detour:** "Save local copy..." at step 9 downloaded the file in `downloads/`.
  The answers say a participant who also does this has not taken a wrong turn. It came after the
  task was already done, so it is not a detour that makes the grade SD.

## Counts

| | This session | Reference |
|---|---|---|
| Commands (real.mjs, after the start) | 9 | 6 (round 2 and 3 path) |
| Commands up to the reopened project | 6 (07.png) | 6 |
| Wrong turns | 0 | -- |

- She used Main menu > "Save as..." instead of Control+s; both reach the same Name dialog, so the
  count up to the save is the same (menu, Save as, type and Save, against Control+s, type, Enter).
- Closing the tab replaced Main menu > "Back to start": one command instead of two.
- **Exploration (not counted):** hovering "Local only" to read its tooltip (step 4); clicking the
  PageRank row and its Values tab to check that the numbers came back (steps 7-8).

## False "done"

None. Each claim matches the screen. "My name, there" (06.png), "names still on the balls, the
PageRank color key still at top left" (07.png), "My work is all back" (09.png) and the debrief's
"All of my work was there" are all true of the screen. She did not claim every name was drawn
("77 labels, 7 hidden" in 04.png is the same state as before the save). She noticed the one
difference, the missing count, herself.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. The build defects were
reproduced by `rounds/round-3/repro/r3-s45/repro.sh`, which runs the session's route as a script
on the same build; output in `run/` and `run.log`. The re-run gave the same result as the session.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | The warning "This browser can clear projects kept here. Save a local copy of any project you need to keep." appears only on the start page, the next time it is opened. Saving says "Saved ... in this browser." and nothing more. A user who clears browser data before coming back loses the work without ever being told. She said this was the one thing she needed to know at the moment of saving. Seen in one participant. | Step 3, 04.png (saved message, no warning); step 5, 06.png (the warning). Repro: `run/03.png` against `run/04.png`. |
| 2 | 2 | build-defect | "Save local copy..." downloads the file but the app shows nothing: no message, nothing changes on screen, and nothing says where the file went. "Save as..." on the same menu does show "Saved ... in this browser.". | Step 9, 10.png; `downloads/Les Mis key characters.graphty.json`. Repro: step 6, `run/06.png` against the download `run/downloads/Repro key characters.graphty.json` (29,858 bytes); same on every run. |
| 3 | 2 | wording | "Save", "Save as..." and "Save local copy..." sit side by side and nothing tells which one writes a file she can find later. She picked the right one from the start page's warning, not from the menu. Seen in one participant. | Step 1, 02.png; debrief. |
| 4 | 1 | build-defect | After a reopen the PageRank row in the outline has lost its count "77", though all 77 values are back. She had to open Values to be sure the numbers survived. Already known as a graphty-element defect: a restored run has no summary. | 04.png ("PageRank 77") against 07.png ("PageRank"). Repro: `run/03.png` against `run/05.png` and `run/06.png`. |
| 5 | 1 | wording | "Saved ... in this browser" left her unsure whether the work stays on her computer or goes somewhere; she hovered "Local only" ("Nothing is sent") to settle it. Held one level down as one participant's reading. | Steps 3-4, 04.png, 05.png. |

**What worked:** "Save as..." is where a word-processor user looks and asks for a name with the old
name selected. The header takes the new name at once. Recent projects lists the save by her name
with its node count and date, and reopening is one click that brings back the drawing, the color
key, the names and every value with the settings it ran with.
