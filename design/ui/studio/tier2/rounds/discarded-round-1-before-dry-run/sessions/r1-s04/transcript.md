# Session r1-s04 -- Jordan (returning marketing analyst), task T20, dataset B (hiking trails, trails.csv)

Build 16dcf3494700, started empty.

```
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1-16dcf3494/ node design/ui/studio/tool/real.mjs --start design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 empty
commit 34bfb1177289b3e485470d136042c8cd2218bd43, build 16dcf3494700 graphty@0.8.56
.../r1-s04/01.png
```

## Steps

01.png: the start screen I know. Usage-data banner at the bottom; I will say no thanks first, then open the file.

Step 2. Dismiss the usage banner.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click No\ thanks
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/02.png
```

Step 3. Banner gone (I assume). I always open files with 'Open project or file...', so I click it and pick trails.csv from Downloads.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click Open\ project\ or\ file --upload trails.csv
a file chooser is open (answer it with --upload <file>)
chose the file trails.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/03.png
```

Step 4. 03.png: it opened straight away -- 9 junctions, 13 trails, 'Directed'. No names on the balls and nothing asked me about the km column. I want to check what it did with km, so I open Data in the left rail, where I used to look at columns.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click Data
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/04.png
```

Step 5. 04.png: Data shows Sources (trails.csv, 13 rows) and Attributes, with 'km' under Edges as a number. Nothing says what the program does with km. I click 'km' to see if it tells me more.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click km
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/05.png
```

Step 6. 05.png: the km panel says Table Edges, a blue 'Amount' tag, 'From the file', range 1 to 6. 'Amount' is not what I'd call kilometers -- it's a length. The tag looks clickable, so I click 'Amount' to see what else it could be.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click Amount
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/06.png
```

Step 7. 06.png: nothing changed; the 'Amount' tag is just a label. There's a three-dot menu at the top right of the km panel -- I'll try that.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click-at 1419\,74
at 1419,74: button "Attribute actions"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/07.png
```

Step 8. 07.png: only 'Filter to...' and 'Show in table'. Not what I want. I close it and click the source 'trails.csv' -- maybe that's where the import settings live.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --key Escape --click trails.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/08.png
```

Step 9. 08.png: a table opened at the bottom with From, To, km -- nice, Trailhead to Pine Fork 3, Pine Fork to Summit 6, Trailhead to Creek 1.5... The source panel only says 9 nodes, 13 edges added; no import settings. I right-click the 'km' column header to see if it offers anything about how the column is used.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --rclick-at 1158\,742
at 1158,742: button "km"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/09.png
```

Step 10. 09.png: right-click just put a little sort arrow on km, no menu. The table has its own three-dot button next to 'Columns: 3 of 3'; I try that.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click-at 1148\,681
at 1148,681: button "Table options"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/10.png
```

Step 11. 10.png: the table menu only has 'Export...'. I can't find any place on the loaded data that says how km is used. I'll go to the analysis button (the flask in the toolbar) where I always run things, and look for something like a shortest route -- maybe it asks which column to use.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --key Escape --click-at 679\,624
at 679,624: button "Analyze"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/11.png
```

Step 12. 11.png: the analysis list I know, with a filter box. I type 'shortest' to look for a shortest route.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --type shortest
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/12.png
```

Step 13. 12.png: 'Shortest path -- the fewest steps, or the lightest route, between two nodes.' 'Lightest' is an odd word for kilometers, but this is clearly it. I click it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click Shortest\ path
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/13.png
```

Step 14. 13.png: From, To, and 'Weight: None'. So right now it would ignore the km column. I'll fill in From first: Trailhead.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click From --type Trailhead
ambiguous: "From" matches 2 controls (button "From", combobox ""); took the first
nothing that takes text has focus (focus is on button "From"); typed nothing, not "Trailhead"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/14.png
```

(Note: my click landed on the table's 'From' column header instead of the From box, which sorted the table and closed the popover. A person would have clicked the box itself; I redo it by pointing.)

Step 15. 14.png: the popover closed and the table sorted by From. Reopen Analyze, type 'shortest', pick Shortest path again.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click Analyze --type shortest --click Shortest\ path
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/15.png
```

Step 16. 15.png: Shortest path is back. I click the From box and type Trailhead.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click-at 665\,408 --type Trailhead
at 665,408: combobox
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/16.png
```

Step 17. 16.png: it suggests Trailhead. I pick it, then click the To box and type Summit.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click-at 563\,439 --click-at 665\,462 --type Summit
at 563,439: option "Trailhead"
at 665,462: combobox
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/17.png
```

Step 18. 17.png: Summit suggested; I pick it. Then I open the Weight dropdown, which says None, to look for km.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click-at 559\,493 --click Weight
at 559,493: option "Summit"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/18.png
```

Step 19. 18.png: Weight offers 'None' or 'km (farther)'. 'Farther' is what I want -- more km is a longer walk. Odd that it didn't pick it for me. I choose km (farther) and press Find path.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click km\ \(farther\) --click Find\ path
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/19.png
```

Step 20. 19.png: there it is -- orange route, and the right panel says 'Nodes in order: Trailhead, Creek, Meadow, Ridge, Summit', 'Total distance 7.5', and under 'Made with': 'Weight: km (farther)'. That last line is where it admits it used the kilometers. 7.5 has no 'km' after it, though. I want to check the sum myself, so I scroll the table to see the Meadow and Ridge rows.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --wheel 750\,820\,400
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/20.png
```

Step 21. 20.png: Ridge to Summit 1.5 yes, Trailhead to Creek 1.5 yes, and earlier Creek to Meadow 2 yes -- so Meadow to Ridge must be 2.5, adds to 7.5. I believe it. But the hiking club wants every calculation to count km, and I only told this one run. Let me see whether another analysis picks km up on its own: Analyze, type 'closeness', open it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click Analyze --type closeness --click Closeness
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/21.png
```

Step 22. 21.png: Closeness shows no weight at all, just 'Advanced'. I'll open Advanced -- I normally wouldn't, but I need to know if km counts here.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click Advanced
ambiguous: "Advanced" matches 2 controls (button "Expand Advanced", button "Expand Advanced"); took the first
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/22.png
```

(Note: the click opened the right panel's 'Advanced' (an empty Method box) instead of the one in the Closeness popover, and the popover closed. Two controls share the name. I redo it by pointing.)

Step 23. 22.png: wrong Advanced -- the right panel's opened and shows an empty 'Method' box; the Closeness box went away. I reopen Closeness and click its own Advanced line.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click Analyze --type closeness --click Closeness --click-at 524\,548
at 524,548: button "Expand Advanced"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/23.png
```

Step 24. 23.png: Closeness's Advanced has only 'Sample size 0'. No mention of km at all, so I can't tell if closeness counts kilometers. The club asked that EVERY calculation treat km as length; picking it per run isn't that. Maybe it's something you set when bringing the file in. I close this and open the main menu (top-left three lines) to look for an import option.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --key Escape --click-at 23\,20
at 23,20: button "Main menu"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/24.png
```

Step 25. 24.png: menu has New project, Open, Save, Export, Settings... nothing about import options. The start screen had 'New from data...', which I've never used -- maybe that one asks about columns. I go Back to start.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click Back\ to\ start
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/25.png
```

Step 26. 25.png: 'Discard unsaved changes?' I've noted the route (Trailhead, Creek, Meadow, Ridge, Summit, 7.5), so I'll discard and start over the other way.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click Discard
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/26.png
```

Step 27. 26.png: back on the start screen. I click 'New from data...'.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click New\ from\ data
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/27.png
```

Step 28. 27.png: 'Open as a new graph' with Tables, a Direction box and 'choose a file...'. This looks like the setup page I wanted. I choose trails.csv.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click choose\ a\ file --upload trails.csv
ambiguous: "choose a file" matches 2 controls (button "choose a file...", p "Choose a file first"); took the first
a file chooser is open (answer it with --upload <file>)
chose the file trails.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/28.png
```

Step 29. 28.png: now we're talking. A preview of the rows (Meadow to Ridge really is 2.5) and a line 'Weight: none (each edge counts 1)'. Each column has a dropdown; km is set to 'Attribute'. I open the km dropdown.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click-at 728\,225
at 728,225: combobox
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/29.png
```

Step 30. 29.png: choices are From, To, Weight, Date or time, Edge id, Attribute. 'Weight' is the closest to 'this number matters for every calculation', even if I'd call it length. I pick Weight.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click-at 691\,153
at 691,153: option "Weight"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/30.png
```

Step 31. 30.png: 'Weight: km' and a new row 'Higher means: Not set | Closer | Farther | Capacity', with a note that with Not set, paths ignore it and PageRank and communities read bigger as closer. That's exactly the trap -- for trails a bigger number is a longer walk. I click 'Farther'.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click Farther
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/31.png
```

Step 32. 31.png: 'Farther' is selected and the note now reads 'smaller = closer'. Good. I leave Direction alone and press Load.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click Load
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/32.png
```

Step 33. 32.png: loaded, and the Overview now has a new line 'Loaded weight: km (farther)' -- the program says the graph itself carries the km. Now I run Shortest path again to see if it picks km up by itself.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click Analyze --type shortest --click Shortest\ path
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/33.png
```

Step 34. 33.png: Weight now starts as 'km (farther, loaded)' without me touching it. That's what the club asked for. I fill From = Trailhead, To = Summit and press Find path.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/tier2/rounds/round-1/sessions/r1-s04 --click-at 665\,408 --type Trailhead --key ArrowDown --key Enter --click-at 665\,462 --type Summit --key ArrowDown --key Enter --click Find\ path
at 665,408: combobox
at 665,462: combobox
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04/34.png
```

34.png: same route -- Trailhead, Creek, Meadow, Ridge, Summit -- 'Total distance 7.5', and under 'Made with': 'Weight: km (farther)', with the Weight box reading 'km (farther, loaded)'. The left list says 'Shortest path 4 hops', which is steps, not km, but the panel has the km total. I'm done.

```
node design/ui/studio/tool/real.mjs --end design/ui/studio/tier2/rounds/round-1/sessions/r1-s04
session ended: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04
```

## At the end, in character

**Did I finish?** Yes. The shortest walk from the Trailhead to the Summit is Trailhead, Creek,
Meadow, Ridge, Summit: 1.5 + 2 + 2.5 + 1.5 = 7.5 km. I checked the sum against the table myself.
The program shows that it used the kilometers in three places: the graph's Overview line "Loaded
weight: km (farther)", the Shortest path box's Weight starting as "km (farther, loaded)", and the
result's "Made with" section, "Weight: km (farther)".

**Ease: 4 out of 7.** The route itself took two minutes. Making km count for "every calculation"
took most of the session, because the way I always open files ("Open project or file...") loaded
the CSV with no questions and quietly treated km as a plain "Amount". Nothing on the loaded graph
-- the km attribute panel, its three-dot menu, the source panel, the table menu -- let me change
that afterwards. I only found the "Higher means: Farther" setting by guessing that "New from
data...", which I had never used, was a different door, and that cost me my first result
("Discard unsaved changes?").

**What confused me:**

- "Open project or file..." and "New from data..." both take a CSV, but only one asks how to read
  it. Nothing tells me the first one guessed, or how to go back and fix the guess.
- After the quick open, km is labelled "Amount" with no way to change it. If I hadn't run a path I
  would never have known the numbers were being ignored.
- In the Shortest path box, the Weight list did offer "km (farther)" even on the quick open, so the
  program clearly knew km could be a length -- then why was the default "None"?
- "Shortest path -- the fewest steps, or the lightest route": "lightest" is a strange word for a
  longer walk.
- Closeness has no Weight box at all, only "Sample size" under Advanced. I can't tell whether
  closeness used the km or not, which is the whole point of "every calculation".
- "Total distance 7.5" has no unit. The left list says "4 hops", which is a different number for
  the same route.
- Two "Advanced" sections (one in the analysis box, one in the right panel) and a table column
  called "From" right under a "From" box -- easy to hit the wrong one.
- I'm not a hiker, but this is the same as "how strong is this tie" in my customer data: I need to
  set it once, at the door, and see it stated on every result. Today it's stated on the result but
  hidden at the door.
