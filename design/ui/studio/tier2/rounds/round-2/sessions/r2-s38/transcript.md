# Session r2-s38 -- Jordan (returning regular analyst), task T21 prompt B (team)

Task as given: "You have used this program a few times. Two months ago you had the program rank who
matters most on your team, from team.csv; that work is open. Your manager has sent the updated list,
team-v2.csv, in your Downloads folder: two people joined since. Put the new list in place of the old
one without losing your work, redo the ranking on the new list, and tell us how many people the team
has now, who was first before, and who is first now."

All commands run from `design/ui/studio/tier2` with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`.

## Start

`node ../tool/real.mjs --start rounds/round-2/sessions/r2-s38 setup:team-ranked.txt`

The start waited for a free browser slot (all four machine-wide slots were held).

01.png: My team graph from last time is open: "team", the file team.csv, a PageRank run in the left
list (12), nodes sized and colored by it. Before I swap anything I want to write down who was first,
so I'll open the run's Values like I always do.

## Step 2
`node ../tool/real.mjs --step rounds/round-2/sessions/r2-s38 --click "Values"`
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s38/02.png

02.png: Values shows Top 10 -- Hal is first at 0.1293, then Ida 0.1224. 12 of 12 have a value, so
the team was 12 people. Writing that down: before = Hal, 12 people. Now I need to bring in
team-v2.csv in place of team.csv. The "Data" icon on the left rail is where files live, I think.

## Step 3
`node ../tool/real.mjs --step rounds/round-2/sessions/r2-s38 --click "Data"`
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s38/03.png

03.png: Data shows "Sources" with team.csv, 12 nodes, 16 edges. That's the file I want to swap. I'll
click on it to see what it offers.

## Step 4
`node ../tool/real.mjs --step rounds/round-2/sessions/r2-s38 --click "team.csv"`
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s38/04.png

04.png: The right side now shows team.csv as a "Source", loaded 12 nodes and 16 edges, and a table of
links opened at the bottom. No button that says anything about a newer file. There's a "..." menu
up top next to team.csv -- that's usually where file options hide. Trying it.

## Step 5
`node ../tool/real.mjs --step rounds/round-2/sessions/r2-s38 --click-at 1419,73`
at 1419,73: button "Source actions"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s38/05.png

05.png: The menu has "Edit source..." and "Replace with file...". "Replace with file" is exactly what
I want. Clicking it and picking team-v2.csv from Downloads.

## Step 6
`node ../tool/real.mjs --step rounds/round-2/sessions/r2-s38 --click "Replace with file..." --upload team-v2.csv`
a file chooser is open (answer it with --upload <file>)
chose the file team-v2.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s38/06.png

06.png: A full-page "Replace: team-v2.csv" screen. It says "Was 12 nodes, 16 edges; now 14, 21" --
nice, that's the two new people. It already guessed From/To/Weight. There's a "Higher means: Not set"
row; last time it said it assumed closer, and I didn't set it then either, so I'll leave it alone to
keep the ranking comparable. Pressing Replace.

## Step 7
`node ../tool/real.mjs --step rounds/round-2/sessions/r2-s38 --click "Replace"`
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s38/07.png

07.png: Replaced. Graph now says team-v2.csv, Overview shows 14 nodes, 21 edges. Two blue balls --
the new people, not colored because the ranking hasn't seen them. The legend says "PageRank, out of
date" and the PageRank row in the list has a little clock/redo icon and still says 12. My coloring is
still there, good. I'll click the PageRank row to find a way to redo it.

## Step 8
`node ../tool/real.mjs --step rounds/round-2/sessions/r2-s38 --click "PageRank"`
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s38/08.png

08.png: The run panel has a banner, "Data changed since this run", with a blue "Rerun" button. Easy.
Old Values are still there (Hal first, 12 of 12). Clicking Rerun.

## Step 9
`node ../tool/real.mjs --step rounds/round-2/sessions/r2-s38 --click "Rerun"`
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s38/09.png

09.png: Rerun done -- "ran Oct 9, 8:52:36 PM", PageRank row now says 14, "14 of 14 have a value", and
the "out of date" note is gone from the legend. The two new people are colored like everyone else.
Top 10: Di is first now at 0.1339, Hal dropped to second at 0.1305. That's my answer. Ending.

## End
`node ../tool/real.mjs --end rounds/round-2/sessions/r2-s38`
session ended: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s38

## Debrief (Jordan, in character)

**Did I finish?** Yes. The team has 14 people now (it was 12). Hal was first before (PageRank 0.1293);
Di is first now (0.1339), with Hal second (0.1305). My coloring and sizing by the ranking stayed on
through the swap.

**Ease:** 6 out of 7.

**What went well:** Data -> the file row -> "..." -> "Replace with file..." was where I'd expect it.
The replace screen telling me "Was 12 nodes, 16 edges; now 14, 21" before I committed was great --
that's the sanity check I always do by hand. After the swap, the legend said "out of date" and the
run had a "Data changed since this run" banner with a Rerun button right there. Two clicks.

**What confused me or slowed me down:**
- The "..." next to the file name is the only way in; I had to open the file row and then the menu.
  Clicking the file row first popped open a big table at the bottom I didn't ask for.
- The replace screen asked "Higher means: Not set / Closer / Farther / Capacity". I didn't know if
  I needed to answer that to keep things the same as last time. I left it alone because the old run
  said it "assumed a higher weight means closer", but I wasn't sure leaving it unset would give the
  same reading. A line saying "same as your current file" would have reassured me.
- After Rerun, the old Top 10 was simply gone. I only know Hal was first before because I opened
  Values and noted it before swapping. If I hadn't, I couldn't answer "who was first before" --
  there's no before/after or "moved up/down" view. For a monthly re-run that is the thing my VP
  actually asks about.
- Small: the PageRank row's icon changed to a clock while it was out of date; I only understood it
  because the legend also said "out of date".
