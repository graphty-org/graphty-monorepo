Participant model: claude default via claude -p, second attempt (the first ended on a model API error after 14 steps); re-run of void session r1-s04

# Session r1-s04b -- Jordan, marketing network analyst (returning user)

Task: load trails.csv (from,to,km) so every calculation treats more km as a longer walk; find the
shortest walk Trailhead -> Summit (junctions in order, total km); show where the program says it
used the km.

All commands run from design/ui/studio with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/
and session folder S=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-1/sessions/r1-s04b

## Step 0 -- start

Jordan: "Hiking club. Not exactly an influencer map, but fine, it's a CSV with a number column. Let's open it."

    node tool/real.mjs --start $S empty

(Had to wait for a free browser slot.)

## Step 1 -- 01.png -> 02.png

Jordan: "Same start screen as before. Top right says 'Local only' and the start column says files are
read on this computer and never uploaded. Good, no legal call needed. Saying no thanks to the usage data box."

    node tool/real.mjs --step $S --click "No thanks"        # 02.png

## Step 2 -- open the file

Jordan: "Open project or file, pick trails.csv."

    node tool/real.mjs --step $S --click "Open project or file..." --upload trails.csv   # 03.png

Result: it opened straight away, no import questions. 9 nodes, 13 edges, "Direction: Directed".
Jordan: "Huh. It just took it. It never asked me which column is what -- so does it even know km is
the length? Also it says Directed, but a trail goes both ways. And none of the dots have names on
them. Let me check the Data tab, that's where I'd expect the columns."

## Step 3 -- Data tab

    node tool/real.mjs --step $S --click "Data"     # 04.png

Sources: trails.csv, 9 nodes, 13 edges. Attributes: Nodes > id, Edges > km.
Jordan: "OK, km is there as an edge column. Let me click it and see if it lets me say what it means."

## Step 4 -- click km

    node tool/real.mjs --step $S --click "km"       # 05.png

Right panel: km, Attribute. Table Edges, Kind Amount, Origin From the file, Has a value 100%,
Distinct values 9, Range 1 to 6.
Jordan: "It knows it's a number, 1 to 6. 'Amount'. Nothing saying 'this is the length' or 'use as
weight'. Maybe the source itself has import settings. Clicking trails.csv under Sources."

## Step 5 -- click the source

    node tool/real.mjs --step $S --click "trails.csv"   # 06.png

A table opened under the map: Edges, 13 edges, From / To / km (Trailhead-Pine Fork 3, Pine Fork-Summit 6,
Trailhead-Creek 1.5, Creek-Meadow 2 ...). Right panel only says Added: 9 nodes, 13 edges.
Jordan: "Oh nice, a table -- that's the thing Gephi Lite never gave me. But there's still no 'treat km as
length' switch anywhere. Fine. I'll go the way I always go: the analysis button in the toolbar. Maybe
the shortest-path thing asks which column."

## Step 6 -- Analyze button

    node tool/real.mjs --step $S --click-at 679,624     # "Analyze" -> 07.png

A list with a "Filter analyses" box: Degree, Betweenness, Edge betweenness, Closeness, PageRank (Start here),
... Depth-first order "Select a node first" (greyed), Most flow ...
Jordan: "Long list. I'll type 'shortest' instead of scrolling."

## Step 7 -- filter "shortest"

    node tool/real.mjs --step $S --type "shortest"      # 08.png

Under "Find paths and edge sets": Shortest path (Start here) -- "The fewest steps, or the shortest route by
weight, between two nodes."
Jordan: "'Shortest route by weight' -- there we go, that's the km hopefully. Clicking it."

## Step 8 -- Shortest path form

    node tool/real.mjs --step $S --click-at 565,566     # 09.png

Form: From "Where the path starts", To "Where the path ends", Follow Out / All (All picked),
Weight: None, Advanced (collapsed), Find path.
Jordan: "Weight says None. So it did NOT pick up km by itself. And this is just for this one run -- the
club wants 'every calculation' to use km. I'll do this run first and look for a global setting after.
From: Trailhead."

## Step 9 -- type Trailhead

    node tool/real.mjs --step $S --click "Where the path starts" --type "Trailhead"   # 10.png

Suggestion list shows "Trailhead". Jordan: "Pick it."

## Step 10 -- pick Trailhead

    node tool/real.mjs --step $S --click-at 563,387     # option "Trailhead" -> 11.png

From now shows Trailhead.

## Step 11 -- To: Summit

    node tool/real.mjs --step $S --click "Where the path ends" --type "Summit"   # 12.png

Suggestion "Summit" shown. Jordan: "Pick Summit, then set Weight."

## Step 12 -- pick Summit

    node tool/real.mjs --step $S --click-at 559,441     # option "Summit" -> 13.png

## Step 13 -- open Weight

    node tool/real.mjs --step $S --click "Weight"       # 14.png

Options: None (checked), "km (farther)".
Jordan: "'km (farther)'. OK, so somebody already decided bigger km means farther -- which is right for
trails. Where did it decide that? I never told it. I'll take it."

## Step 14 -- weight km (farther)

    node tool/real.mjs --step $S --click-at 553,540     # option "km (farther)" -> 15.png

Form: Trailhead -> Summit, Follow All, Weight km (farther). Jordan: "Find path."

## Step 15 -- Find path

    node tool/real.mjs --step $S --click "Find path"    # 16.png

Result panel "Shortest path": Summary -- Path 5 nodes, 4 edges; Total distance 7.5.
Nodes in order: Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5.
Made with: Analysis Shortest path, From Trailhead, To Summit, Follow All, Weight km (farther).
The map has the path in black, with an "On the path" key at top left. The table gained a "Shortest path"
Yes/No column (Trailhead-Pine Fork 3 No, Trailhead-Creek 1.5 Yes, Creek-Meadow 2 Yes).
Jordan: "Trailhead, Creek, Meadow, Ridge, Summit, 7.5 km. Quick sanity check against the table:
going straight through Pine Fork is 3 + 6 = 9, so 7.5 beats it, which makes sense. And 'Made with...
Weight km (farther)' is the program saying it used the kilometers. That's the receipt I'd screenshot.
But this only covers this one run. The club said 'every calculation'. Let me see whether the graph has
a setting for that, under the Graph tab."

## Step 16 -- looking for a graph-wide km setting

    node tool/real.mjs --step $S --click "role=tab:Graph"   # missed: nothing called "Graph" -> 17.png
    node tool/real.mjs --step $S --click-at 28,75           # button "Graph" -> 18.png

Left panel: Selection, "Shortest path 4 hops", Everything. Right panel still shows the run.
Jordan: "'4 hops' -- fine, it's 4 trails. Nothing here says 'weight' for the whole graph. The graph's own
panel had a '...' menu at the top right when I first loaded. Clicking the graph name to get back to it."

## Step 17 -- click the graph name

    node tool/real.mjs --step $S --click-at 135,61      # span "trails.csv" -> 19.png

Nothing changed; the right panel still shows the path run.
Jordan: "Clicking the name does nothing. I'll try Everything -- that's where I always went for color."

## Step 18 -- Everything

    node tool/real.mjs --step $S --click "Everything"   # 20.png

Right panel: Everything, Style (Nodes / Edges, Fill color, Size, Shape, Effects, Label, Tooltip). No weight.
Jordan: "That's just looks. Last try: the km column itself had a '...' menu in the corner. Data tab, km,
then that menu."

## Step 19 -- the km column's own menu

    node tool/real.mjs --step $S --click-at 28,130 --click "km" --click-at 1419,74
        # Data opened; "km" ambiguous (km#1 button, km#2 treeitem) so that click did nothing;
        # third click hit the Style/Values tabs -> 21.png
    node tool/real.mjs --step $S --click "km#2"          # 22.png, km attribute summary again
    node tool/real.mjs --step $S --click-at 1419,74      # button "Attribute actions" -> 23.png

Menu: "Filter to...", "Show in table". Nothing about weight or length.
Jordan: "No. There's no 'this is the length, use it everywhere' switch I can find. I've looked in the
column, the source, the graph and Everything. I'm stopping here."

    node tool/real.mjs --end $S

Session ended (no further request from --end).

## Debrief (in character)

**Did I finish?** Mostly. The shortest walk from Trailhead to Summit is Trailhead -> Creek -> Meadow ->
Ridge -> Summit, 7.5 km in total (4 trails). The program says it used the kilometers in the result panel
under "Made with": "Weight: km (farther)". I'd screenshot that panel as proof. What I could NOT do is set
km once so that _every_ calculation uses it. I only found it as a per-run choice ("Weight", which
started at None) inside the Shortest path form. So the "every calculation" part of the request is not
done, or at least I can't show that it is.

**Ease: 5 / 7.** Opening the file was instant, and filtering the analysis list by "shortest" took me
straight to the right thing. The result is good: path in order, a total, a "Made with" list, and a
Yes/No column in the table. I lost points on the hunt for a graph-wide setting, which went nowhere.

**What confused me**

- It never asked about my columns on import, so I didn't know whether km meant anything to it until I
  opened the Weight dropdown. The dropdown then offered "km (farther)", which is right. But who
  decided "farther", and where would I change it if a column meant "closer"?
- Weight defaulted to None even though km is the only number column. If I hadn't opened that dropdown,
  I'd have got the fewest-trails answer and might not have noticed.
- I couldn't find anywhere to say "km is the length for everything". The column's summary ("Kind:
  Amount") and its "..." menu (Filter to..., Show in table) say nothing about weight, and neither do the
  Graph and Everything panels.
- The overview said "Direction: Directed" with arrows on the trails, but trails go both ways. "Follow:
  All" seems to handle it, but the arrows made me nervous.
- The left list says "Shortest path 4 hops" while the result says "Total distance 7.5". "Hops" is a
  word I'd have to explain to the club, and the distance has no "km" after it.
- Clicking the graph's name at the top of the Graph panel did nothing.
- No labels on the dots by default, so the map alone doesn't tell you which dot is the Summit.
- Off-topic: this is the kind of thing my data-science colleague would knock out in two lines of
  networkx. The only reason I'd use this is that the picture plus the "Made with" panel is something I
  can paste into a slide without explaining code. Same as with Brandwatch, though: the moment a number
  has no unit on it, someone in the meeting asks "7.5 what?"
