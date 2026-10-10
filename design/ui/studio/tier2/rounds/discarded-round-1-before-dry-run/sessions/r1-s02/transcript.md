# Session r1-s02 -- Grace (returning), task T20 B (hiking trails, trails.csv)

Build: 16dcf3494700, served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1-16dcf3494/ (REAL_DIST).
All commands run from design/ui/studio with REAL_DIST set.

Task as given: "You have used this program a few times. Your hiking club sent trails.csv, in your Downloads folder: each row is a trail between two junctions and its length in kilometers. Bring it into the program so that every calculation treats more kilometers as a longer walk, then work out the shortest walk from the Trailhead to the Summit: which junctions, in order, and how many kilometers in all. Show us where the program says it used the kilometers."

```
node tool/real.mjs --start tier2/rounds/round-1/sessions/r1-s02 empty
commit 34bfb1177289b3e485470d136042c8cd2218bd43, build 16dcf3494700 graphty@0.8.56
.../r1-s02/01.png
```

Step 1 (01.png): The start screen I remember. Recent projects is empty -- this is a fresh browser, fine. There's the usage-data question at the bottom; I'll say no thanks first, like always.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click No\ thanks
nothing on screen is called "No thanks"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/03.png
```

(Tool note, not in character: a helper-script mix-up made the first "No thanks" click land as 02.png without being logged here; my own logged click then found nothing called "No thanks" because the notice was already gone, giving 03.png, identical to 02.png. The session state is exactly what one "No thanks" click gives.)

Step 2 (03.png): The usage notice is gone, "Usage data stays off." Good. Now my file. Last time I used "Open project or file..." for the running club list, so I'll do the same with trails.csv.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click Open\ project\ or\ file --upload trails.csv
a file chooser is open (answer it with --upload <file>)
chose the file trails.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/04.png
```

Step 3 (04.png): It opened straight away. Right side says Nodes 9, Edges 13 -- the club said 13 trails between 9 junctions, so everyone arrived. It says "Directed", which is odd for trails (you can walk both ways), but I'll come back to that. No names on the dots. The task wants the kilometers counted as "longer", so first I'll look at Data on the left, which I remember lists my columns.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click Data
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/05.png
```

Step 4 (05.png): Data shows "trails.csv 13 rows, 13 edges" -- matches. Under Edges there's "km", with a # sign, so it knows it's a number. I want to tell it what km means. I'll click on "km" and see what it offers.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click km
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/06.png
```

Step 5 (06.png): The right side now shows "km", Attribute, Table Edges, two blue tags "Amount" and "From the file", 100% have a value, range 1 to 6. "Amount" looks like what the program thinks the column is. Nothing says "longer" or "farther" yet. The blue tag looks clickable -- I'll try "Amount".



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click Amount
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/07.png
```

Step 6 (07.png): Nothing changed -- "Amount" is just a label. There's a "..." in the corner of the km panel; maybe the options are in there. I'll click it.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click-at 1419\,74
at 1419,74: button "Attribute actions"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/08.png
```

Step 7 (08.png): The menu only has "Filter to..." and "Show in table". Neither is about what the number means. I'll close it and click the file itself, "trails.csv" under Sources -- maybe how it was read in can be changed there.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --key Escape --click trails.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/09.png
```

Step 8 (09.png): A table opened at the bottom with From / To / km -- Trailhead to Pine Fork 3, Pine Fork to Summit 6, Trailhead to Creek 1.5, Creek to Meadow 2. That's my spreadsheet, good. The right side for trails.csv only says Added 9 nodes, 13 edges; nothing about how it was read. Maybe the km column heading in the table has options. I'll click it.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click-at 1158\,742
at 1158,742: button "km"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/10.png
```

Step 9 (10.png): It just sorted the table, "Sorted by km, highest first". There's a little down arrow at the right of the km heading -- maybe a column menu. I'll click it.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click-at 1183\,742
at 1183,742: button "Options for km"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/11.png
```

Step 10 (11.png): Only "Move left" and "Move right", both grayed. Not it. The start screen had a second door I never used, "New from data...". Maybe bringing a file in that way asks what the columns mean. I'll close this and look in the main menu (top-left lines) to find it.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --key Escape --click-at 23\,20
at 23,20: button "Main menu"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/12.png
```

Step 11 (12.png): The menu has "Back to start", New project, Open project or file..., samples, Save, Export... No "New from data..." here. I'll go "Back to start" and use "New from data..." from there.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click Back\ to\ start
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/13.png
```

Step 12 (13.png): Back at the start. (It didn't ask about my unsaved trails project -- noted.) Now "New from data...".



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click New\ from\ data
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/14.png
```

Step 13 (14.png): "Open as a new graph", with Tables, a Direction setting ("As the file says") and "choose a file...". This looks like the careful way in. I'll choose trails.csv.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click choose\ a\ file --upload trails.csv
ambiguous: "choose a file" matches 2 controls (button "choose a file...", p "Choose a file first"); took the first
a file chooser is open (answer it with --upload <file>)
chose the file trails.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/15.png
```

Step 14 (15.png): Now this is what I wanted. It shows my rows: Trailhead to Pine Fork 3, etc., "13 edge rows read; the load makes 9 nodes and 13 edges." And it says "Weight: none (each edge counts 1)" -- so right now every trail would count as 1, not its kilometers. Over the km column there's a drop-down saying "Attribute". I'll open it.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click-at 728\,225
at 728,225: combobox
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/16.png
```

Step 15 (16.png): The choices are From -> node, To -> node, Weight, Date or time, Edge id, Attribute. "Weight" is the one that matches "Weight: none" above. I'm not sure yet whether weight means "bigger is stronger" or "bigger is longer", but let's pick it and see what it says.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click Weight
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/17.png
```

Step 16 (17.png): Now it says "Weight: km" and a new row "Higher means: Not set / Closer / Farther / Capacity", with the note "paths ignore it; PageRank and communities read it as larger = closer". That's exactly my worry -- left alone it would treat a long trail as a close one. More kilometers is a longer walk, so "Farther". I'll click it and read what the note says then.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click Farther
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/18.png
```

Step 17 (18.png): "Farther" is selected and the note now reads "smaller = closer". That's the plain sentence I wanted. Before I press Load: last time the right side said "Directed", and trails go both ways. There's a "Direction: As the file says" drop-down at the bottom. I'll open it.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click Direction
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/19.png
```

Step 18 (19.png): As the file says / Directed / Undirected. You can walk a trail either way, so "Undirected" -- I think that's the both-ways one. Picking it.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click Undirected
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/20.png
```

Step 19 (20.png): Direction now "Undirected". (The line at the top still draws "node (9) --trails (13)--> node" with an arrow, which doesn't match, but fine.) Weight: km, Higher means Farther, smaller = closer, 9 nodes 13 edges. Pressing Load.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click Load
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/21.png
```

Step 20 (21.png): Loaded. Right side: Nodes 9, Edges 13 (still everyone), Direction "Undirected, set in the..." (cut off), and a new line "Loaded weight: km (farther)". That's one place it says it took the kilometers. No arrows on the lines now. Next the shortest walk: last time I ran things from the analysis button in the toolbar (the flask), so I'll start there.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click-at 680\,624
at 680,624: button "Analyze"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/22.png
```

Step 21 (22.png): The analysis list I remember, with a "Filter analyses" box. Lots of ranking ones. I want the shortest walk between two places -- I'll type "shortest" in the box.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --type shortest
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/23.png
```

Step 22 (23.png): Under "Find paths and edge sets" there's "Shortest path -- The fewest steps, or the lightest route, between two nodes." "Lightest" is a funny word for kilometers, but this is clearly it. Clicking it.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click Shortest\ path
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/24.png
```

Step 23 (24.png): A small form: From, To, and "Weight: km (farther, loaded)" already filled in -- so it's using what I set at load. I'll click the From box and type Trailhead.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click-at 668\,408 --type Trailhead
at 668,408: combobox
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/25.png
```

Step 24 (25.png): It suggests "Trailhead" below the box. I'll pick it.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click-at 563\,439
at 563,439: option "Trailhead"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/26.png
```

Step 25 (26.png): From says Trailhead. Now the To box: Summit.



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click-at 668\,462 --type Summit
at 668,462: combobox
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/27.png
```

Step 26 (27.png): "Summit" suggested. Pick it, then press "Find path".



```
node tool/real.mjs --step tier2/rounds/round-1/sessions/r1-s02 --click-at 559\,493 --click Find\ path
at 559,493: option "Summit"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02/28.png
```

Step 27 (28.png): There it is. The route is drawn in orange, with a key in the corner ("Shortest route"). Right side: "Path: 5 nodes, 4 edges", "Total distance 7.5", and "Nodes in order": Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5. Let me check it against my rows: Trailhead-Creek 1.5, Creek-Meadow 2, Meadow-Ridge 2.5, Ridge-Summit 1.5 -- that adds up to 7.5. The obvious way, Trailhead-Pine Fork-Summit, would be 3 + 6 = 9, so this really is shorter in kilometers, not just in steps (both are a handful of steps; the 2-step one lost, so it went by km). Under "Made with" it says "Weight: km (farther)" and the Weight box says "km (farther, loaded)" -- that's where it says it used the kilometers, along with "Loaded weight: km (farther)" on the graph's overview. The left list also has a "Shortest path 4 hops" entry. I have my answer, so I'm done.

```
node tool/real.mjs --end tier2/rounds/round-1/sessions/r1-s02
session ended: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s02
```

## At the end (in character)

**Did I finish?** Yes. Shortest walk from the Trailhead to the Summit: Trailhead, Creek, Meadow, Ridge, Summit -- 7.5 km in all. The program says it used the kilometers in three places: the graph overview ("Loaded weight: km (farther)"), the Shortest path form's Weight box ("km (farther, loaded)"), and the result's "Made with" section ("Weight: km (farther)").

**Ease: 5 out of 7.** Once I found the right door it was quick and the words were plain ("Higher means ... Farther", "smaller = closer"). What cost me was finding that door.

**What confused me:**
- The way I always open files, "Open project or file...", brought the trails in with no question about the km column, and afterwards I couldn't find anywhere to say what km means. The km panel in Data had an "Amount" tag that does nothing when clicked, and its "..." menu only offered "Filter to..." and "Show in table". The table's column menu only had grayed "Move left / Move right". I had to go back to the start and use "New from data..." -- a door I'd never used -- to get the "Weight" and "Higher means" choices. If I'd only ever used the first door I might have given up or got a wrong answer counting every trail as 1.
- "Back to start" left my first trails project without asking whether I wanted to keep it.
- The first load said "Directed" for trails, which you can walk both ways; in "New from data..." I could change it to "Undirected", but the line at the top of that screen still drew an arrow ("--trails (13)--> node") after I changed it.
- Before I picked "Farther", the note said "paths ignore it" -- I wasn't sure what that meant, and "Shortest path" describes itself as "the lightest route", which is an odd word for kilometers.
- "Total distance 7.5" has no unit; I knew it was km only because I'd set it up myself.
- The Direction line on the overview is cut off ("Undirected, set in the...").
