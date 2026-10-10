# Session r1-s08 -- Tom (returning), task T20 prompt B (hiking trails, trails.csv)

Build: tier2-r1d4-946256efb (946256efb876). Tool: real.mjs, session folder r1-s08.

Commands are run from design/ui/studio/tool with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ ; S = this session folder.

## Step 1 -- start

`node real.mjs --start $S empty` -> 01.png
Tom: The start screen I know. "Open project or file..." is where I always go. There's a box at the bottom asking about usage data -- I don't share anything from the lab, so "No thanks" first.

## Step 2

`--step $S --click "No thanks"` -> 02.png
Tom: Box gone. Now the club's file. I'll do what I always do: "Open project or file..." and pick trails.csv from Downloads.

## Step 3

`--step $S --click "Open project or file..." --upload trails.csv` -> 03.png
Tom: It opened straight away, no questions. 9 nodes, 13 edges -- I'll count the rows later. The dots have no names on them, so I can't see which one is the Trailhead. And it never asked me about the kilometers. The club said each row has a length. Where did those numbers go? I'll look under "Data" on the left.

## Step 4

`--step $S --click "Data"` -> 04.png
Tom: There it is -- "km" under Edges. So it kept the kilometers. Whether it will use them for working out a walk, nothing says. I'll click "km" and see what it tells me.

## Step 5

`--step $S --click "km"` -> 05.png
Tom: On the right: Edges, Kind "Amount", From the file, range 1 to 6. Fine, those look like kilometers. But nothing here says what a bigger number means to the program. There are three dots at the top right of that panel; I'll see what's under them.

## Step 6

`--step $S --click-at 1419,73` -> 06.png (button "Attribute actions")
Tom: "Filter to..." and "Show in table". Neither is what I want. I'll close it. Maybe "Amount" next to Kind is something I can change -- I'll click it, but I won't pick anything I don't understand.

## Step 7

`--step $S --key Escape --click "Amount"` -> 07.png
Tom: Nothing happened. That's just a label. So far nothing here lets me say "these are kilometers, more is longer". Maybe it's on the file itself -- "trails.csv" under Sources. I'll click that.

## Step 8

`--step $S --click-at 136,141` -> 08.png (treeitem "trails.csv")
Tom: A table came up at the bottom: Trailhead to Pine Fork 3, Pine Fork to Summit 6, Trailhead to Creek 1.5... That's the club's list, good, the numbers came in right. The panel on the right just says Added: 9 nodes, 13 edges. Still nothing about kilometers meaning longer. That's my second try at finding it. I'll go to the analysis button in the toolbar -- that's what the colleague showed me -- and see whether it asks about the kilometers when I work out the walk.

## Step 9

`--step $S --click-at 679,624` -> 09.png (button "Analyze")
Tom: A long list of names I don't know -- Betweenness, Katz, HITS. I'm not learning these. There's a search box at the top. I want the shortest walk, so I'll type "shortest".

## Step 10

`--step $S --type "shortest"` -> 10.png
Tom: "Shortest path -- Start here. The fewest steps, or the shortest route by weight, between two nodes." "Weight" -- I don't know if my kilometers are a weight. But it's the one that says start here. Clicking it.

## Step 11

`--step $S --click "Shortest path"` -> 11.png
Tom: From, To, Follow (Out / All), and "Weight: None". None! So it is NOT using my kilometers right now. That's exactly what I was worried about. First I'll fill in From -- Trailhead.

## Step 12

`--step $S --click "Where the path starts" --type "Trailhead"` -> 12.png
Tom: It offers "Trailhead". I'll pick it, then put Summit in "Where the path ends".

## Step 13

`--step $S --click-at 563,387 --click "Where the path ends" --type "Summit"` -> 13.png
Tom: Trailhead is in, Summit is offered. Picking Summit. Then the "Weight: None" box -- I'll open it and see if km is in there.

## Step 14

`--step $S --click-at 559,441 --click-at 679,514` -> 14.png (option "Summit", then the Weight combobox)
Tom: Two choices: "None" and "km (farther)". Farther -- more kilometers, farther. That's what I want. Odd that it knows "farther" but still started on None. Picking km (farther), then Find path.

## Step 15

`--step $S --click "km (farther)" --click "Find path"` -> 15.png
Tom: There it is. The walk is drawn in black, and the right side lists it in order: Trailhead, Creek, Meadow, Ridge, Summit. 5 nodes, 4 edges, "Total distance 7.5". It doesn't say "km" after the 7.5, but under "Made with" it says "Weight: km (farther)", so that's where it says it used the kilometers. Checking against the table: Trailhead to Creek 1.5, Creek to Meadow 2 -- those say "Yes". The straight way, Trailhead to Pine Fork 3 then Pine Fork to Summit 6, would be 9, so 7.5 being shorter makes sense. I'll take that.

But the club asked for the file to be brought in so EVERY calculation uses the kilometers. I didn't do that. I looked twice when the file opened -- the km column, its "..." menu, the file itself -- and nothing let me say what the kilometers mean. I only told this one calculation, here. If I run something else tomorrow, I don't know whether it will start on "None" again. I'm stopping here.

`--end $S`

## End of session (in character)

**Did I finish?** Partly. I got the shortest walk: Trailhead, Creek, Meadow, Ridge, Summit, 7.5 in total, and the screen shows it used the kilometers ("Weight: km (farther)" under "Made with", and "Total distance 7.5" in the summary). I did not get the part the club asked for first: bringing the file in so every calculation counts more kilometers as a longer walk. The file opened with no questions, and I could not find anywhere to say that afterwards. I only set it for this one calculation.

**Ease:** 4 out of 7. The walk itself was quick once I found "Shortest path". Getting the kilometers counted for everything, I never managed.

**What confused me:**

- The file opened straight away and never asked about the kilometers. I went looking under Data: the "km" column says Kind "Amount", From the file, range 1 to 6, but nothing says what a bigger number means and nothing there can be changed. Its "..." menu only has "Filter to..." and "Show in table". Clicking the file under Sources just showed the table.
- "Shortest path" started on "Weight: None". If I had not opened that box, it would have ignored the kilometers and I would never have known. It offered "km (farther)", so it seems to know more kilometers is farther, yet it did not use that unless I picked it.
- "Weight" is not my word. I only picked it because "km" was inside the box.
- "Total distance 7.5" has no unit. I had to trust that it means kilometers because of the line further down.
- The dots have no names on the picture, so I could not find the Trailhead by looking. I only knew where it was once the walk was drawn in black.
- The search list in the analysis button is full of names I don't know (Betweenness, Katz, HITS). Typing "shortest" was the only way I found the right one.
