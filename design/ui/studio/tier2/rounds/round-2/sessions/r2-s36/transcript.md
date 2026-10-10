# Session r2-s36 -- Alex (returning analyst), task T21 prompt B (team.csv to team-v2.csv)

Build: 8f0d5a6f7791 (frozen, /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/)

```
REAL_DIST=<frozen build> node real.mjs --start rounds/round-2/sessions/r2-s36 setup:team-ranked.txt
-> 01.png
```

**01.png.** OK, my team project from two months back is open: "team", source team.csv, a PageRank result with 12 next to it, dots sized and colored by PageRank. Before I swap anything I want to know who was first. I'll open the PageRank "Values" tab on the right -- that should list the scores.



```
node real.mjs --step rounds/round-2/sessions/r2-s36 --click Values
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36/02.png
```

**02.png.** Values tab shows a Top 10: Hal 0.1293 first, then Ida 0.1224, Di 0.1177. So Hal was first before. "12 of 12 have a value" -- 12 people, matches what I remember. Now I need to put team-v2.csv in where team.csv is. The top of the left panel says "Graph team.csv" -- I'll click on team.csv and see if it lets me swap the file.



```
node real.mjs --step rounds/round-2/sessions/r2-s36 --click team.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36/03.png
```

**03.png.** Clicking team.csv gave me a Graph overview: 12 nodes, 16 edges, 1 component. Good, counts match the old file. No swap button here though. There's a "..." menu at the top right of this panel -- that's where I'd expect file actions. Trying it.



```
node real.mjs --step rounds/round-2/sessions/r2-s36 --click-at 1419,73
at 1419,73: button "Graph actions"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36/04.png
```

**04.png.** Menu only has Re-run layout, Reshuffle layout seed, Add note. Nothing about the file. Closing it. The little blue "From team.csv" under Graph looks like a link -- I'll try that next.



```
node real.mjs --step rounds/round-2/sessions/r2-s36 --key Escape
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36/05.png
```



```
node real.mjs --step rounds/round-2/sessions/r2-s36 --click From team.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36/06.png
```

**05.png / 06.png.** Escape closed the menu. The link took me to the Data tab: Sources lists team.csv, 12 nodes, 16 edges. That's the file. I'll click the team.csv row and hope it offers to swap it.



```
node real.mjs --step rounds/round-2/sessions/r2-s36 --click-at 150,141
at 150,141: treeitem "team.csv"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36/07.png
```

**07.png.** Right panel now says "team.csv -- Source", loaded 12 nodes, 16 edges, and a table of the edges opened at the bottom. There's a "..." at the top right of the source panel. That's my best bet for swapping the file.



```
node real.mjs --step rounds/round-2/sessions/r2-s36 --click-at 1419,73
at 1419,73: button "Source actions"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36/08.png
```

**08.png.** "Replace with file..." -- that's exactly it. Clicking it and picking team-v2.csv from Downloads.



```
node real.mjs --step rounds/round-2/sessions/r2-s36 --click Replace with file... --upload team-v2.csv
a file chooser is open (answer it with --upload <file>)
chose the file team-v2.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36/09.png
```

**09.png.** Nice -- "Replace: team-v2.csv. Was 12 nodes, 16 edges; now 14, 21." That's the two new people and five new ties, exactly what my manager said. It wants to know what a higher weight means; last time the run said it "assumed higher means closer" and the note here says PageRank reads it as closer anyway, so leaving it as is to keep the same setup as last time. Clicking Replace.



```
node real.mjs --step rounds/round-2/sessions/r2-s36 --click Replace
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36/10.png
```

**10.png.** Replaced. Graph now says team-v2.csv, 14 nodes, 21 edges. My PageRank styling survived, and the legend honestly says "PageRank, out of date" -- the two new people show up blue because they have no score yet. Good, it's not pretending. The PageRank row on the left still says 12 and has a little clock icon. I'll click that row and look for a way to run it again.



```
node real.mjs --step rounds/round-2/sessions/r2-s36 --click PageRank
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36/11.png
```

**11.png.** "Data changed since this run" with a blue Rerun button. Same settings as before (damping 0.85, weight read as closer). Clicking Rerun.



```
node real.mjs --step rounds/round-2/sessions/r2-s36 --click Rerun
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36/12.png
```

**12.png.** Done in about a second. PageRank now 14 of 14 have a value, ran 8:40:49 PM, legend no longer says out of date, the blue dots are colored in. New Top 10: Di 0.1339, Hal 0.1305, Ed 0.1245, Ida 0.1217. So Di is first now, Hal dropped to second. Before I walk away I save like I always do -- opening the main menu at top left.



```
node real.mjs --step rounds/round-2/sessions/r2-s36 --click-at 23,20
at 23,20: button "Main menu"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36/13.png
```

**13.png.** Main menu: Save, Ctrl+S. Clicking Save.



```
node real.mjs --step rounds/round-2/sessions/r2-s36 --click Save
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36/14.png
```

**14.png.** Huh, Save asks me for a name ("Save team as", name "team"). I thought this project was already saved -- I've been saving it every time. Slightly odd but fine, keeping the name and clicking Save in the dialog.



```
node real.mjs --step rounds/round-2/sessions/r2-s36 --click-at 922,500
at 922,500: button "Save"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36/15.png
```

**15.png.** "Saved team in this browser." Done. Ending the session.



```
node real.mjs --end rounds/round-2/sessions/r2-s36
session ended: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s36
```

## Wrap-up (Alex, in character)

**Finished?** Yes. The team has 14 people now (12 before; the replace preview said "Was 12 nodes, 16 edges; now 14, 21"). Hal was first before (PageRank 0.1293). Di is first now (0.1339), with Hal second (0.1305).

**Ease: 5 of 7.** Once I found it, it was the best version of this I've used: the replace screen showed me old and new counts before committing, my PageRank sizing and colors stayed put, the legend said "out of date" instead of lying, and Rerun was one button with the same settings as last time. That's the Gephi half of my month gone. It loses two points for finding the swap.

**What confused me:**
- Finding where to swap the file took four tries. The file name "team.csv" at the top of the Graph panel looks like a file control but only opens an overview; the "..." on that overview has layout things, not file things. I had to go through the small blue "From team.csv" link to the Data tab, click the source row, and then open a second "..." to find "Replace with file...". That's about five clicks for something I'll do every month, and the only route I found was by poking around.
- The weight question on the replace screen ("Higher means: Not set / Closer / Farther / Capacity") made me stop. The old run said it "assumed a higher weight means closer", so I left it alone to match. I'd rather it just carried over what the last run used, or said so.
- Save asked me for a name ("Save team as") even though this is my existing project. I wasn't sure if it was making a copy or overwriting the one I had. It said "Saved team in this browser", so I think it overwrote, but I'd like it to just save.
