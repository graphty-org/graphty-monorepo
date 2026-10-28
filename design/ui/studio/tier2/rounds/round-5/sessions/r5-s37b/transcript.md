# Session r5-s37b -- Grace, returning

Task: replace friends.csv with friends-v2.csv without losing work, redo the ranking, say who was first before and who is first now.

All commands use:
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tool/real.mjs <cmd> /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s37b ...`

## 01 (session started for me)
Okay, my running club map is open: friends.csv, a PageRank ranking row with 20 next to it, bigger and darker dots. Before I swap anything I want to write down who is first now. The right panel has a "Values" tab next to Style -- that sounds like the list.

## 02 `--step --click "Values"`
Good, a Top 10 list. Farah is first, 0.06394, then Hana, Milo. "20 of 20 have a value" -- 20 people, matches. Noted: BEFORE = Farah.
Now to swap the file. I remember Data listed my file's columns, so I'll try the Data place on the left first.

## 03 `--step --click "Data"`
Sources: friends.csv, 20 nodes, 41 edges. That's my file. I'd expect a "replace" on it. No visible button, so I'll right-click the row.

## 04 `--step --rclick-at 160,141` (the friends.csv row)
A menu: "Edit source..." and "Replace with file...". Exactly what I want. Clicking Replace and giving it friends-v2.csv.

## 05 `--step --click "Replace with file..." --upload friends-v2.csv`
A Replace page: "Was 20 nodes, 41 edges; now 20, 41". 41 rows read, makes 20 nodes and 41 edges. Same people and same ties, so it's the weights (this month's numbers) that changed. The weight meaning says "Not set" -- last time's run also had it not set and read higher as closer, so I'll leave it alone to keep it comparable. Pressing Replace.

## 06 `--step --click "Replace"`
Graph now says friends-v2.csv, PageRank row still there with 20, colors kept. The key says "PageRank, out of date" and the panel says "Data changed since this run" with a Rerun button. Nice -- it told me. The list still shows the old numbers (Farah first). Pressing Rerun.

## 07 `--step --click "Rerun"`
Ran 10:35:54. "20 of 20 have a value" -- still 20 people. New Top 10: Ava 0.08012 first, then Farah 0.06556, Hana 0.06428. The key updated to 0.02872-0.08012 and the "out of date" is gone; my size and color styling stayed on. Ava wasn't even in last month's top 10, so that's a real change worth telling the director. That's the job done; ending.

## 08 `--end`
Session ended.

## Wrap-up (Grace)
- Finished: yes. First before: Farah (0.06394). First now: Ava (0.08012); Farah is second (0.06556).
- Ease: 6 of 7.
- What went well: "Replace with file..." on the source row did what it said; the Replace page told me was 20 nodes, 41 edges, now 20, 41 before I committed, so I could check against Excel. My ranking, colors and sizes stayed, and the program said plainly the ranking was out of date and gave me one Rerun button.
- What confused me: Replace was only on a right-click -- I guessed. Nothing on the row says it's there. The "Higher means: Not set" weight choice on the Replace page made me stop and think; I left it so the numbers stay comparable with last month, but I'd want one line saying "same as last time". After Rerun, nothing told me the top person changed -- I had to remember Farah myself; a before/after would help the board slide. And "PageRank" is still the name I have to translate for the board.
