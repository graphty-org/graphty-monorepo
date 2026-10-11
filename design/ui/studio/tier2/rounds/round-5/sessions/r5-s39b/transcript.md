# Session r5-s39b -- transcript (Alex, returning user)

Task: replace friends.csv with friends-v2.csv without losing work, redo the ranking, say who was first before and who is first now.

Commands use:
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs --step tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s39b <step>`

## 01 (start)
Last month's friends.csv is open with a PageRank run (20 nodes), sized and colored by PageRank, legend 0.03779 to 0.06394. No labels on the dots, so I can't tell who is first from the picture. Before swapping files I want the old top name: I'll try the Values tab of the PageRank panel.
- Command: `--click "Values"` -> 02.png

## 02
Values tab gives a Top 10: Farah first at 0.06394, then Hana 0.05941, Milo 0.05648. Good, that's the "before" -- Farah. Also shows the run used weight read as closer, damping 0.85. Now to swap the file. The left panel header says "Graph friends.csv"; I'll click the file name and see if it lets me replace the source.
- Command: `--click "friends.csv"` -> 03.png

## 03
Graph panel: 20 nodes, 41 edges, directed, one component, "From friends.csv". No replace button in sight. There's a "..." in the corner of this panel; I'll try that before digging in the main menu.
- Command: `--click-at 1419,73` (Graph actions) -> 04.png

## 04
Menu has Re-run layout, Reshuffle layout seed, Add note. Nothing about the file. Escape, then try "Data" in the left rail -- sounds like where sources live.
- Command: `--key Escape --click "Data"` -> 05.png

## 05
Data panel: Sources -> friends.csv, 20 nodes, 41 edges. That's the thing to swap. Click it and look for a replace option.
- Command: `--click-at 160,141` (source row friends.csv) -> 06.png

## 06
Source panel on the right: friends.csv, Loaded 20 nodes, 41 edges, and the edge table opened at the bottom. There's a "..." on the source panel -- that's where I'd expect "Replace".
- Command: `--click-at 1419,73` (Source actions) -> 07.png

## 07
"Replace with file..." -- exactly what I want. Click it and give it friends-v2.csv.
- Command: `--click "Replace with file..." --upload friends-v2.csv` -> 08.png

## 08
Replace screen: "Was 20 nodes, 41 edges; now 20, 41." Counts I can check -- nice. Weights changed (Ava-Chloe was 5, now 1). Weight meaning is "Not set" like last time, and it says PageRank reads higher as closer, same assumption the old run used, so I leave it alone to keep it comparable. Click Replace.
- Command: `--click "Replace"` -> 09.png

## 09
Swapped: header says friends-v2.csv, edge table shows the new weights, PageRank run is still in the list with a little clock icon, and the legend says "PageRank, out of date". Good that it tells me rather than silently showing old numbers. Click the PageRank run to rerun it.
- Command: `--click-at 155,156` (PageRank, out of date) -> 10.png

## 10
Banner: "Data changed since this run" with a Rerun button. The old Top 10 (Farah first) is still listed. Click Rerun.
- Command: `--click "Rerun"` -> 11.png

## 11
Reran instantly: "ran Oct 11, 10:37:10 AM", range now 0.02872 to 0.08012, legend updated, out-of-date tag gone, same damping 0.85 and same weight reading. New Top 10: Ava 0.08012, Farah 0.06556, Hana 0.06428. So Farah was first, Ava is first now. Styling (size + color by PageRank) carried over without me redoing it. I'll save the project like every week -- main menu.
- Command: `--click "Main menu"` -> 12.png

## 12
Menu with Save (Ctrl+S). Click Save.
- Command: `--click "Save"` -> 13.png

## 13
Save asks for a name ("Save friends as", prefilled "friends"). Bit odd that plain Save asks me every time, but fine -- keep "friends" and click Save in the dialog.
- Command: `--click "Save"` (dialog) -> 14.png

## 14
Toast: "Saved friends in this browser." Done. Ran `--end`; it ended the session with no further request.
- Command: `--end`

## Wrap-up (in character)

**Did I finish?** Yes. Before: Farah was first (PageRank 0.06394). Now, on friends-v2.csv: Ava is first (0.08012), Farah second (0.06556), Hana third (0.06428). Run, sizing and coloring all survived the swap; counts stayed 20 nodes, 41 edges.

**Ease:** 6 out of 7.

**What took longest / confused me:**
- Finding where to swap the file. I clicked the "friends.csv" name in the Graph panel first, then its "..." menu (only layout and note options), before finding "Replace with file..." under Data -> Sources -> the source's "...". That's three or four clicks of hunting for something I'd do every month; the file name at the top of the Graph panel looks like the obvious place and it doesn't offer it.
- The old Top 10 stays on screen after the swap until I rerun. The "Data changed since this run" banner and "out of date" in the legend made that clear, so no harm, but I had to read the old names off before replacing because nothing keeps "last month's" list for side-by-side.
- The Replace screen told me "was 20 nodes, 41 edges; now 20, 41" -- that's the count check I always do, good.
- Weight meaning "Not set" with a note that PageRank reads higher as closer: fine, it matches the old run, but I'd want to set it once and have it stick rather than see "not set" every month.
- Plain "Save" opened a "Save friends as" name box. I expected Ctrl+S on an already-named project to just save.
