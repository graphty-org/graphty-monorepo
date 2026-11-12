# Session r5-s33b -- Dev, returning (bus-stops.csv, quickest Depot to Harbor)

Build: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/
Session folder: tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s33b

## Step 01 (already started)
01.png: the start page. Start: "Open project or file...", "New from data...". Samples on the right. A usage-data box at the bottom.
Dev: "Okay, same start page as last time. First I'll say no thanks to the data thing, then open the file like I did with the class sheet."

## Step 02
Command: `real.mjs --step <session> --click "No thanks"` -> 02.png (the box went away).

## Step 03
Dev: "Now open the file the way I did before."
Command: `real.mjs --step <session> --click "Open project or file" --upload bus-stops.csv` -> 03.png
03.png: "Open as a new graph". bus-stops: 10 nodes, 17 edges. Each row is an edge. Columns from / to / minutes; minutes is set to "Attribute", whole number. A line under it says "Weight: none (each edge counts 1)". Direction: "As the file says".
Dev: "Wait -- 'Weight: none, each edge counts 1'. That's exactly what I don't want. The minutes column is just an 'Attribute'. I'll open that dropdown over minutes and see if I can make it the weight."

## Step 04
Command: `--click "minutes"` -> 04.png. Refused: ambiguous between the column header button and the combobox "Role of minutes". Nothing changed.

## Step 05
Command: `--click "Role of minutes"` -> 05.png
05.png: a list opened: From, To, Weight, Date or time, Edge id, Attribute (checked).
Dev: "Weight! That's the one. Picking Weight."

## Step 06
Command: `--click "role=option:Weight"` -> 06.png
06.png: minutes is now "Weight". The line reads "Weight: minutes". Under it "Higher means": Not set (picked), Closer, Farther, Capacity. Explanation: "Choose what a higher weight means. Until you do, a path counts every edge as one step, and PageRank and communities read a higher weight as closer."
Dev: "Oh nice, it actually asks. More minutes is a longer trip, so higher means Farther. Clicking Farther."

## Step 07
Command: `--click "Farther"` -> 07.png
07.png: "Weight: minutes (farther)". Text: "A higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total."
Dev: "That's exactly what I mean -- travel time, smallest total. Direction says 'As the file says'; I don't know if buses go both ways, I'll leave it. Load."

## Step 08
Command: `--click "Load"` -> 08.png
08.png: the drawing, 10 dots with arrows, no names on them. Right panel, Values, Overview: Nodes 10, Edges 17, Direction Directed, "Loaded weight: minutes (farther)", Density 0.1889, Components 1. Bottom-left hint: "Analyze (flask) in the toolbar (Shift+A) to add results here".
Dev: "Okay, it says 'Loaded weight: minutes (farther)' -- that's my proof for the import part. No names on the dots though. Wait, it says Directed... the file only had one row per link, hope that's fine. Now the route: the flask is where I ran the ranking last time, so Analyze."

## Step 09
Command: `--click-at 615,864` (the flask, "Analyze") -> 09.png
09.png: a list with "Filter analyses" box. "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (Start here), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order, Most flow...
Dev: "Lots of ranking stuff. I want a route. There's a filter box -- I'll type 'route'."

## Step 10
Command: `--type "route"` -> 10.png
10.png: "Find paths and edge sets": "Shortest path (Start here) -- The fewest steps, or the shortest path by weight, between two nodes." and "Guided route -- Select 2 nodes first".
Dev: "Shortest path, 'by weight' -- that's the one. Clicking it."

## Step 11
Command: `--click-at 501,768` (Shortest path) -> 11.png
11.png: a "Shortest path" form: From ("Where the path starts", focused), To ("Where the path ends"), Follow: Out / All (All picked), Weight: "minutes (farther, loaded)", Advanced, "Find path".
Dev: "Weight already says minutes, farther, loaded -- good, it remembered. From box is ready, typing Depot."

## Step 12
Command: `--type "Depot"` -> 12.png
12.png: a suggestion "Depot" under the From box.
Dev: "There it is, clicking the Depot suggestion."

## Step 13
Command: `--click-at 490,627` (option Depot) -> 13.png
13.png: From = Depot; the To box now has focus.
Dev: "Nice, it jumped to To. Typing Harbor."

## Step 14
Command: `--type "Harbor"` -> 14.png
14.png: suggestion "Harbor".
Dev: "Clicking Harbor."

## Step 15
Command: `--click-at 492,681` (option Harbor) -> 15.png
15.png: From Depot, To Harbor, Follow All, Weight minutes (farther, loaded). "Find path" has focus.
Dev: "'Follow: All' -- I guess that means it can ride a link either way. Fine for buses. Find path."

## Step 16
Command: `--click "Find path"` -> 16.png
16.png: the path is drawn in black with thick arrows. Left list: "Shortest path  minutes 14". Right panel: Summary -- Path 5 nodes, 4 edges; Total minutes 14. Nodes in order: Depot 1, Market 2, Park 3, Clinic 4, Harbor 5. Made with: Analysis Shortest path, From Depot, To Harbor, Follow All, Weight minutes (farther).
Dev: "Oh nice, that's it. Let me check it against the sheet: Depot-Market 4, Market-Park 3, Park-Clinic 4, Clinic-Harbor 3 -- 4+3+4+3 = 14. Agrees. And the other obvious way, Depot-Market-Library-Harbor, is 4+6+5 = 15, so 14 really is quicker. The 'Made with' box says 'Weight: minutes (farther)' -- that's where it says it used the minutes, plus the Overview said 'Loaded weight: minutes (farther)' right after import. That's my proof."
Essay sentence: "The quickest route from Depot to Harbor is Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes in total; the program's shortest-path run lists its weight as minutes (farther)."
Dev: "I'm done. Ending."

## End
Command: `real.mjs --end <session>` -> session ended.

## In character, at the end
- Finished: yes. Minutes read as a weight where higher means farther; quickest route Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes, matching my own sum from the sheet.
- Where it says it used the minutes: the open screen ("Weight: minutes (farther)"), the Overview after loading ("Loaded weight: minutes (farther)"), and the route's "Made with" box ("Weight: minutes (farther)"), plus the shortest-path form's Weight box ("minutes (farther, loaded)").
- Ease: 6 of 7.
- What confused me:
  - The minutes column came in as just "Attribute" with "Weight: none (each edge counts 1)". I only caught it because I was looking for it; if I hadn't read that grey line I'd have loaded it as plain counts. The dropdown sitting over the column wasn't obviously a "what is this column" control until I opened it.
  - After loading, the Overview said "Direction: Directed" with arrows, though I never chose that ("As the file says"). The route form's "Follow: All" seemed to cover it, but I'm not sure whether a bus can go Harbor to Depot on the same link -- I'd ask a classmate.
  - The dots have no names on the map, so I could only read the route from the side panel, not the picture.
  - Finding the route: the Analyze list opens on ranking; typing "route" found "Shortest path" right away, which was easy.
