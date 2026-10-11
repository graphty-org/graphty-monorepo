# Session r4-s44 -- Jordan, returning user

Session folder (screenshots): /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s44

Task: replace team.csv with team-v2.csv without losing work, redo the ranking, report team size, who was first before, who is first now.

## Step 01 -- start
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start <session> setup:team-ranked.txt`

Sees: project "team", Graph team.csv, a PageRank run (12 nodes) with color and size, legend top left. Right panel shows PageRank Style / Values tabs. Plan: before swapping anything, read Values to write down who is first today.

## Step 02
`--click "Values"`

Sees: Top 10 list. Hal is first at 0.1293, then Ida 0.1224, Di 0.1177. 12 of 12 have a value, so 12 people now. Made with: PageRank, weight read as closer, damping 0.85. Noted: Hal was first before. Plan: the left rail has a "Data" icon -- that is where I would expect to swap the source file.

## Step 03
`--click "Data"`

Sees: Sources lists team.csv, 12 nodes, 16 edges. Filters with a +, Attributes. No obvious "replace" button next to the source. Plan: right-click the team.csv row to see if it offers replace / reload.

## Step 04
`--rclick-at 140,141` (the team.csv source row)

Sees: a menu with "Edit source..." and "Replace with file...". That is exactly the word I wanted. Plan: click "Replace with file..." and give it team-v2.csv.

## Step 05
`--click "Replace with file..." --upload team-v2.csv`

Sees: a full-page "Replace: team-v2.csv" screen. Header says "Was 12 nodes, 16 edges; now 14, 21" -- good, that is the before/after I need, and it matches "two new people". Columns mapped From/To/Weight automatically. Weight "Higher means" is Not set, which the note says PageRank reads as closer -- same as the old run assumed, so I leave it so the ranking is comparable. Plan: click Replace.

## Step 06
`--click "Replace"`

Sees: Graph now says team-v2.csv. My PageRank run is still there, with a history icon, the legend says "PageRank, out of date", and the right panel says "Data changed since this run" with a blue Rerun button. Two blue balls are the two new people (no score yet). Old Top 10 still shows Hal first. Nice -- my work survived and it tells me it's stale instead of pretending. Plan: click Rerun.

## Step 07
`--click "Rerun"`

Sees: run now 14, ran 3:36:05, "14 of 14 have a value", no more out-of-date warning. New Top 10: Di 0.1339, Hal 0.1305, Ed 0.1245, Ida 0.1217, Jo 0.1141. The two new nodes are colored now. Same settings (weight read as closer, damping 0.85), so it's apples to apples. I have my three answers. Plan: end the session.

## Step 08
`--end` -- session ended, no further request.

## Debrief (in character)

Did I finish? Yes.
- The team has 14 people now (it was 12; the replace screen said "was 12 nodes, 16 edges; now 14, 21").
- First before: Hal (PageRank 0.1293).
- First now: Di (0.1339); Hal dropped to second (0.1305).

Ease: 6 out of 7.

What worked: right-clicking the source gave me "Replace with file...", which is the exact thing I wanted. The before/after counts at the top of the replace screen are what I'd put in a status email. My ranking run stayed put, said "out of date" in the legend and "Data changed since this run" with a Rerun button -- so I never wondered whether the old numbers were the new ones. That's the dashboard-vs-download problem I hate, handled.

What confused me:
- Replace wasn't visible until I right-clicked. There's no button on the Sources row; if I hadn't tried a right-click I'd have gone hunting in the main menu or dragged the file in and probably ended up with two sources.
- The replace screen's "Higher means: Not set" for weight -- I left it because the note said PageRank would read it as closer, which matches what the old run said. But I had to read the fine print to be sure leaving it alone wouldn't change my ranking. Fine, not great.
- After Rerun nothing tells me what moved. I had to remember Hal was first and compare by eye. A "was #1, now #2" or the previous run kept side by side would save me the screenshot-and-squint I'll do for the deck. Honestly, the VP will only read the first slide anyway, so I need the change in one line.
