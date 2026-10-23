# Session r5-s42b -- Ruth, returning: replace team.csv with team-v2.csv and redo the ranking

Command prefix for every step:
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs --step tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s42b ...`

## 01 (start, already open)
The team map is open: "Graph team.csv", a PageRank run with "12" beside it, right panel shows PageRank with Style and Values tabs. Twelve on the run row -- twelve people, I take it. First I want the old top name written down before I touch anything: I'll open Values.
Command: `--click "Values"` -> 02.png

## 02
Values: "12 of 12 have a value, 0.03273 to 0.1293, median 0.06565". Top 10: Hal 0.1293 first, Ida 0.1224, Di 0.1177. Written down: before, 12 people, Hal first. "Made with" shows PageRank, weight read as closer, damping 0.85 -- good, I can tell the editor how it was counted. Now to swap the list. I'll try the "Data" tab on the left, which is where the sheet should live.
Command: `--click "Data"` -> 03.png

## 03
Data panel: Sources -- "team.csv, 12 nodes, 16 edges". Matches the 12 from before. There's no visible "replace" button. I'll click the source row and see whether it offers anything.
Command: `--click "team.csv"` -> 04.png

## 04
Right side now shows "team.csv, Source", Loaded: Nodes 12, Edges 16, and a table of edges opened at the bottom. There's a "..." at the top right of the source panel. That's the likeliest place for "replace". Clicking it.
Command: `--click-at 1419,73` ("Source actions") -> 05.png

## 05
Menu: "Edit source..." and "Replace with file...". That's exactly the words I wanted. Clicking "Replace with file..." and giving it team-v2.csv from Downloads.
Command: `--click "Replace with file..." --upload team-v2.csv` -> 06.png

## 06
"Replace: team-v2.csv. Was 12 nodes, 16 edges; now 14, 21." Twelve plus the two new hires is fourteen -- matches my manager's note. "21 edge rows read; the load makes 14 nodes and 21 edges" -- nothing dropped. Weight meaning "Not set"; the line under it says PageRank reads higher as closer until I choose, which is what the old run did too, so I'll leave it alone and the two rankings stay comparable. Clicking "Replace".
Command: `--click "Replace"` -> 07.png

## 07
Graph now "team-v2.csv"; Overview says Nodes 14, Edges 21, 1 component. The legend says "PageRank, out of date" and the PageRank row still says 12, with a little clock/rerun icon in front. Two dots are blue -- the two newcomers, I'd guess, with no rank yet. My ranking was kept, but it's stale. I'll click the PageRank row to see how to rerun it.
Command: `--click "PageRank"` -> 08.png

## 08
"Data changed since this run" with a blue "Rerun" button. The old values are still shown -- 12 of 12, Hal 0.1293 on top -- and it's honest that they're old. Clicking "Rerun".
Command: `--click "Rerun"` -> 09.png

## 09
Reran at 10:38:17. "14 of 14 have a value, 0.02333 to 0.1339, median 0.04819." Row now says 14, the blue dots are colored. Top 10: Di 0.1339, Hal 0.1305, Ed 0.1245, Ida 0.1217, Jo 0.1141. Made with: same PageRank, weight read as closer, damping 0.85 -- same settings as the first run, so the comparison is fair. Di is now first; Hal slipped to second. Before I call it done I'll save the project so the new list sticks -- opening the main menu.
Command: `--click "Main menu"` -> 10.png

## 10
Menu has "Save  Ctrl+S". Clicking Save.
Command: `--click "Save"` -> 11.png

## 11
Plain "Save" asked me "Save team as", name "team". Slightly odd -- I thought this project was already saved -- but the name is right. Clicking the dialog's "Save".
Command: `--click "Save"` (dialog) -> 12.png

## 12
"Saved team in this browser." The run still reads 14, Di first. That's the job done. Ending.
Command: `--end` -> session ended.

## Outcome (in character)

**Finished: yes.**

- The team now has **14 people** (was 12; the replace screen said "Was 12 nodes, 16 edges; now 14, 21", and the rerun says "14 of 14 have a value").
- **First before: Hal** (PageRank 0.1293, run of Oct 11, 10:37:01 AM, on team.csv).
- **First now: Di** (PageRank 0.1339, rerun of Oct 11, 10:38:17 AM, on team-v2.csv). Hal is second at 0.1305.
- Both runs used the same settings ("Made with": PageRank, weight read as closer, damping 0.85), so the two lists are comparable. Saved in the browser afterward.

**Ease: 6 of 7.**

What helped: "Replace with file..." said exactly what I wanted, and the replace screen told me the before-and-after counts and "the load makes 14 nodes and 21 edges" before I committed -- no silent drop. After the swap, the ranking was kept but marked "out of date" in the legend and "Data changed since this run" with a Rerun button; it didn't pretend the old numbers were current.

What confused me:
- Replacing the sheet is hidden behind an unlabeled "..." on the source's own panel; I had to click the source row first to find it. Nothing on the Graph tab or the stale run pointed me there.
- On the stale run, the old Top 10 stays on screen with no "old" mark on the list itself -- only the banner above the tabs says so. If I'd scrolled past the banner I could have copied stale numbers.
- Two dots turned blue right after the swap with no word on what blue meant; I guessed "not ranked yet".
- Plain "Save" opened a "Save team as" name box, as though the project had never been saved. It saved fine, but I wasn't sure whether it was overwriting my old "team" or making a second one.
