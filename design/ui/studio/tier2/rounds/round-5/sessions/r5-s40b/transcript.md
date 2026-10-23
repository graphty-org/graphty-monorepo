# Session r5-s40b -- Dana Okafor (returning user)

Task: replace team.csv with team-v2.csv without losing the work, redo the ranking, report the team size now, who was first before and who is first now.

Command prefix used for every step:
`cd /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 && REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs --step tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s40b ...`

## Step 01 (start, already done)
I see my old team.csv open, a PageRank ranking colored and sized, 12 next to it. Before I swap anything I want the old number one written down. The right panel has a "Values" tab -- that sounds like the table.
Command: `--click "Values"` -> 02.png

## Step 02
Good, a Top 10 table. Before: Hal is first at 0.1293, then Ida 0.1224. 12 of 12 have a value, so the old team is 12 people. Now I need to swap the file. Last months I went to the Data place on the left; I'll look there for a replace option.
Command: `--click "Data"` -> 03.png

## Step 03
Data place shows Sources: team.csv, 12 nodes, 16 edges. No visible "replace" button. In Excel I'd right-click the thing; I'll right-click the team.csv row.
Command: `--rclick "team.csv"` -> 04.png

## Step 04
A menu: "Edit source..." and "Replace with file...". Replace with file is exactly what I want. Clicking it and picking team-v2.csv from Downloads.
Command: `--click "Replace with file..." --upload team-v2.csv` -> 05.png

## Step 05
A Replace screen: "Was 12 nodes, 16 edges; now 14, 21". That matches "two people joined". It guessed From/To/Weight correctly and shows the rows -- I can check them like a spreadsheet, good. There's a "Higher means: Not set" choice; I've never set that and the old ranking was made the same way, so I leave it alone to keep it comparable. Clicking Replace.
Command: `--click "Replace"` -> 06.png

## Step 06
Graph now says team-v2.csv. My PageRank ranking is still there but flagged "Data changed since this run" with a blue Rerun button, and the legend says "out of date". Two new blue dots -- the new people, no score yet. Nice that it tells me instead of silently showing old numbers. Clicking Rerun.
Command: `--click "Rerun"` -> 07.png

## Step 07
Rerun done: "14 of 14 have a value", ran 10:37:29. Top 10 now: Di 0.1339 first, Hal 0.1305 second, Ed 0.1245, Ida 0.1217. The colors and sizes on the picture kept my old setup and updated. That's everything I needed. Ending.
Command: `--end` -> session ended.

## Wrap-up (in character)

**Did I finish?** Yes. The team has 14 people now (was 12). Before, Hal was first (PageRank 0.1293). Now Di is first (0.1339); Hal dropped to second (0.1305).

**Ease: 6 of 7.** Seven steps, no dead ends. "Replace with file..." on a right-click of the source, a preview that told me "Was 12 nodes, 16 edges; now 14, 21" before I committed, and the old ranking kept with an out-of-date flag and a one-click Rerun. That beats rebuilding it by hand every month, which is what I've been doing.

**What confused me / what I'd change:**
- Replace is only on a right-click of the source row. I found it because I right-click everything; a colleague who doesn't would look for a button on the Data page and not see one.
- The "Higher means: Not set / Closer / Farther / Capacity" choice on the replace screen. I don't know what it changes for my ranking and the sentence under it mentions "PageRank and communities". I left it alone so this month matches last month, but I'm not sure that was right.
- Before rerunning, the Top 10 still showed the old numbers (Hal first) under a small "Data changed since this run" line. I almost copied the old list; the warning should be harder to miss.
- Labels in the right panel and the legend are small and grey-ish; on my laptop screen I'd be leaning in.
- Still no answer to my usual questions: does this go into Power BI, and where does the file go when I load it ("Local only" in the top bar suggests it stays on my machine, which is what IT will ask).
