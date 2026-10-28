# Session r5-s44b -- Nadia (returning), replace team.csv with team-v2.csv and redo the ranking

Commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ and
S=tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s44b

## 01 (start, already run)
Project "team" open, graph team.csv, a PageRank run in the left list (12), legend top left, right panel shows PageRank Style. 12 people. Before I swap anything I want to write down who is first now. There is a "Values" tab on the right -- I'll look there.

## 02 `--click "Values"`
Values tab: Top 10 -- Hal 0.1293 first, then Ida 0.1224, Di 0.1177. "12 of 12 have a value." So before: 12 people, Hal first. Writing that down. Now to swap the file. The left rail has "Data" -- that's where the file should live. Clicking it.

## 03 `--click "Data"`
Data panel: Sources -- team.csv, 12 nodes, 16 edges. No visible button next to it. I'll right-click the source to see if there's a "replace" option.

## 04 `--rclick "team.csv"`
A menu: "Edit source..." and "Replace with file...". That is exactly what I want. Clicking Replace with file and giving it team-v2.csv.

## 05 `--click "Replace with file..." --upload team-v2.csv`
A Replace screen: "Was 12 nodes, 16 edges; now 14, 21." So 14 people -- the two new joiners. Columns already matched (From, To, Weight). Weight meaning "Not set" -- the old run said the same thing (assumed higher means closer), so I leave it as before so the ranking is comparable. Clicking Replace.

## 06 `--click "Replace"`
Graph now says team-v2.csv. Two new blue dots (the joiners, no value yet). The PageRank run is still there, legend says "out of date", and the right panel says "Data changed since this run" with a Rerun button. Good -- my work is kept. Clicking Rerun.

## 07 `--click "Rerun"`
Ran at 10:39:36. Legend no longer "out of date", run shows 14, "14 of 14 have a value". Top 10 now: Di 0.1339, Hal 0.1305, Ed 0.1245, Ida 0.1217. Same weight setting as before (read as closer), damping 0.85. Done. Ending.

## End `--end`
Session ended normally.

## Wrap-up (in character)
- Finished: yes. The team has 14 people now. Before, Hal was first (0.1293). Now Di is first (0.1339), and Hal is second (0.1305).
- Ease: 6 of 7. It took about six clicks, well under one alert's worth of time. Right-clicking the file gave me "Replace with file..." straight away. The replace screen told me "was 12, now 14" before I committed. Afterwards the run said "Data changed since this run" with a Rerun button, so I didn't have to set the ranking up again.
- What confused me: nothing on the screen said "Replace" until I right-clicked the source. A plain click or a visible button would be faster to find. On the replace screen, "Higher means: Not set" made me stop and think whether to change it. I left it alone because the old run said it had assumed closer, but I'd want it to say that the old run used that setting. Also, right after the replace, the Top 10 still showed the old numbers with no notice. Only the small "out of date" text and the banner told me they were stale. If I had copied them into the file then, QA would have caught it.
