# Session r4-s42 -- Tom, returning user: replace team.csv with team-v2.csv and redo the ranking

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s42 in the studio worktree.
All commands run from the studio worktree with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ and
S=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s42

## Step 1 -- start
`node design/ui/studio/tool/real.mjs --start $S setup:team-ranked.txt` -> 01.png

Tom: OK, this is the lab map, "team", same as last time. Brown balls of different sizes, a PageRank row on the left with 12, the legend says Size and Color are PageRank. That's the ranking I did. Now I need to swap in the new list. I've never done that. "Data" on the left looks like where files live -- I'll try that.

## Step 2
`--step $S --click "Data"` -> 02.png

Tom: Sources: team.csv, 12 nodes, 16 edges. That's the old list. Before I touch anything I want to write down who's first now, because once I swap the file I'll lose it. The panel on the right says PageRank with a "Values" tab -- I'll look there.

## Step 3
`--step $S --click "Values"` -> 03.png

Tom: Good, a plain list. Top 10: Hal 0.1293 first, then Ida, Di, Jo, Ed. "12 of 12 have a value." So before: 12 people, Hal first. Writing that down. Now the swap. The only place that names the file is "team.csv, 12 nodes, 16 edges" under Sources. I'll click on it and see what it offers.

## Step 4
`--step $S --click "team.csv"` -> 04.png

Tom: It opened a table of the links at the bottom and the right side now says "team.csv, Source, Loaded: Nodes 12, Edges 16". No "replace" button anywhere I can see. There's a "..." by the file name on the right. That's the only thing left that might have more in it; I'll open it.

## Step 5
`--step $S --click-at 1420,73` (button "Source actions") -> 05.png

Tom: Two choices: "Edit source..." and "Replace with file...". "Replace" makes me nervous -- normally I would not touch a Replace button -- but that is literally what my manager asked for: new list in place of the old one. The top bar says "Local only", so at least the list stays on this laptop. I'll click it and pick team-v2.csv from Downloads, then read whatever it asks before I say yes.

## Step 6
`--step $S --click "Replace with file" --upload team-v2.csv` -> 06.png

Tom: Big heading "Replace: team-v2.csv -- Was 12 nodes, 16 edges; now 14, 21". That I understand: two more people, five more links, matches what my manager said. The middle has a question "Higher means: Not set / Closer / Farther / Capacity" -- I don't know, and nobody set it last time either, so I leave it alone. Bottom says "21 edge rows read; the load makes 14 nodes and 21 edges" -- I count 21 rows in the spreadsheet too. Nothing here says my ranking will be thrown away, so I press the blue "Replace".

## Step 7
`--step $S --click "Replace"` -> 07.png

Tom: It took it. Top says "Graph team-v2.csv", right side Nodes 14, Edges 21. My PageRank row is still there with 12 and the colours are still on, so I didn't lose my work. The legend now says "PageRank, out of date", and there are two small blue balls -- I'd guess those are Mo and Nia, the new ones, not ranked yet. Small blue vs brown I can tell apart fine. Now "redo the ranking": I'll click my PageRank row and see if it offers to run again.

## Step 8
`--step $S --click "PageRank"` -> 08.png

Tom: There it is: "Data changed since this run" with a blue "Rerun" button. The list underneath is still the old one (Hal first, 12 of 12). Rerun is exactly what I was asked to do, so I press it.

## Step 9
`--step $S --click "Rerun"` -> 09.png

Tom: The "out of date" is gone from the legend, the row says PageRank 14, "ran Oct 11, 3:35:07 AM", and the right side says "14 of 14 have a value". The two blue balls are brown now. Top 10: Di 0.1339 first, Hal 0.1305 second. So Hal slipped to second. I have my three answers; I'm done.

## End
`node design/ui/studio/tool/real.mjs --end $S`
-> "session ended", copied to this folder.

## Debrief (in character)

**Did I finish?** Yes. The team has 14 people now. Before, Hal was first (0.1293). After the rerun, Di is first (0.1339) and Hal is second (0.1305).

**Ease: 6 out of 7.**

**What went well:** The replace screen said "Was 12 nodes, 16 edges; now 14, 21" in big letters, which matched my manager's email (two new people). After replacing, my ranking was still there and the legend said "out of date", so I knew it hadn't been redone yet and I hadn't lost it. "Data changed since this run -- Rerun" was right where I clicked. "Local only" at the top meant I wasn't worried about the list going anywhere.

**What confused me or slowed me down:**
- Finding the replace took three clicks: Data, then the file name, then the "..." menu. Nothing on the first screen said "you can swap the file", and I only found it because "..." was the last thing left. If that menu had been a right-click I'd have given up.
- The button is called "Replace". I'd normally never press a Replace button with lab work open; I only did because "replace" was the word my manager used. Nothing before I pressed it told me the ranking would survive -- I found that out afterwards.
- The replace screen asked "Higher means: Not set / Closer / Farther / Capacity". I don't know what that means for us and left it. The old ranking said it "assumed a higher weight means closer", so I hope leaving it is the same as last time, but I couldn't tell for sure.
- To get "who was first before" I had to remember to write it down before replacing. After the rerun the old top list is gone; if I hadn't looked first I couldn't have answered that part.
- The two new people showed up as small blue balls after the replace, with nothing on the legend saying what blue means. I guessed "not ranked yet". Rerun turned them brown, so I guessed right.
