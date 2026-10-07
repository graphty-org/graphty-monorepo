# Grade: session r3-s46 -- Grace (nonprofit operations analyst), stop for the day and come back

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de22b, session.json), 1440 x 900,
sighted mode. Started from the T14 setup: Les Miserables open, a PageRank run coloring the nodes,
a name label line on Everything ("77 labels, 7 hidden"). Graded from the last screenshot (07.png),
the reopen screenshots (05.png, 06.png) and the transcript. No files were downloaded, and the task
asks for none (the project is kept in the browser). Not graded from the participant's rating (6 of
7).

## Grade: S (success)

Each part of the success definition holds:

1. **Saved under a name she chose.** Steps 1-3 (02.png-04.png): Main menu, "Save as...", typed
   "Characters ranked - Grace", Save. The header shows the name and the toast reads "Saved
   Characters ranked - Grace in this browser." (04.png).
2. **The project closed.** Step 4: she closed the tab and opened the app again (`--reopen`, the
   same browser storage). The answer key accepts closing the tab. 05.png shows the start page.
3. **Reopened from Recent projects.** Step 5: "Characters ranked - Grace -- In this browser - 77
   nodes - Oct 7, 2026, 5:01 AM" under Recent projects (05.png), clicked; toast "Opened Characters
   ranked - Grace" (06.png).
4. **The run, its colors and the names are back.** 06.png and 07.png: the PageRank row in the
   outline, the same orange ramp on the nodes, the key "Color: PageRank 0.003299 ... 0.07543",
   names drawn over the nodes, and on Everything's Style tab the label line "Above / Abc name" with
   "77 labels, 7 hidden".
5. **Her "did everything come back" matches the screen.** She said all her work came back and
   named the one thing that did not: the "77" beside PageRank. The answer key counts "everything
   came back except the number beside the run" as a correct reading. She also noted the inspector
   opened on the Graph overview instead of Everything, which the key says is a selection, not lost
   work.

- **Build-decided:** no. The two defects she met (problems 3 and 5) did not affect the outcome.
- **Void:** no. Every command was one a person could do.
- **Failure codes:** none.

## Counts

| | This session | Success path (round 3) |
|---|---|---|
| Commands after the start | 6 (steps 1-6) | 6 (Control+s, type the name, Enter, Main menu, Back to start, click the project) |
| Wrong turns | 0 | -- |

- She saved through Main menu > "Save as..." (2 clicks) where the path uses Control+s (1 key), and
  closed the tab (1) where the path uses Main menu > Back to start (2). Both are accepted routes.
- Step 6 (clicking Everything) verified the labels after the work was already back. It is a check,
  not part of finding the answer, so it is not a wrong turn. Without it: 5 commands against 6.
- Steps against the path: 6 / 6, 1.0x.
- **Recovery:** no wrong turn to recover from.

## False "done"

None. "Did I finish? Yes" and "all my work is there" match 06.png and 07.png: the run row, the
colors and key, and the names are on screen. Her one exception (the missing "77") is also what the
screen shows.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. Build defects were
reproduced with the scripted path `rounds/round-3/repro/r3-s46/repro.sh` (output in `run/`): setup,
Save as "Repro r3-s46", reopen, click the project. It gave the same result on the build.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | The save toast says only "Saved ... in this browser." The warning that the browser can clear projects kept there, and the advice to save a local copy, appears only on the start page after she had left. She wanted it at the moment of saving and would now also download a copy. | Step 3, 04.png; step 4, 05.png; debrief. |
| 2 | 1 | behavior | The main menu has "Save", "Save as..." and "Save local copy..."; she could not tell which one keeps the work "on this computer" and hesitated before picking "Save as...". | Step 1, 02.png; transcript. |
| 3 | 1 | build-defect | After the reopen the PageRank row in the outline shows no count; before the save it read "PageRank 77". A restored run has no summary (a graphty-element defect the answer key already records). She noticed it; it did not change her answer. Reproduced: repro run/03.png shows "PageRank 77", run/05.png shows "PageRank" with no count. | Step 3, 04.png against step 5, 06.png; repro run/03.png, run/05.png. |
| 4 | 1 | behavior | After the reopen the inspector shows the Graph overview, not the Everything style she left open, so she clicked Everything to confirm her labels were still set. | Step 5, 06.png; step 6, 07.png. |
| 5 | 1 | build-defect | In the Graph overview, the line "Undirected, from the file: "directed": f..." is cut off at the right edge of the panel, with no way to read the rest. Reproduced the same on every run. | Step 5, 06.png; repro run/05.png. |
| 6 | 1 | wording | The header shows the project name "Characters ranked - Grace" while the outline header still says "Graph Les Miserables": two names for what she reads as one thing. | Step 3, 04.png; 06.png. |
| 7 | 1 | behavior | Grader observation, not raised by the participant: Everything's Style tab shows a Fill color of 6366F1 (purple) while every node is drawn orange by the PageRank run above it. The panel and the drawing disagree with nothing on the panel saying the run overrides it. She read the panel as "fill color" and moved on. | Step 6, 07.png. |

**What worked:** the main menu reads like a File menu and she found "Save as..." at once. The save
dialog preselects the old name so typing replaces it. The toast and the header confirm the new name.
Recent projects lists the project with its node count and time, and one click brings back the run,
its key, its colors and the names exactly as drawn before.
