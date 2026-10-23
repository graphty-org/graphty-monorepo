# Session r2-s01 -- Grace (returning), T20 prompt A (bus stops)

Build: 8f0d5a6f7791, served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/. Start: empty. File: bus-stops.csv.

Commands run from design/ui/studio/tier2 with REAL_DIST set to the frozen build.

## Step 1 -- start

`node ../tool/real.mjs --start rounds/round-2/sessions/r2-s01 empty` -> 01.png

Grace: "Okay, the start screen, same as before. There's that usage-data box again -- no thanks, these are a colleague's bus times but I'd rather nothing leaves the laptop. Then I'll open the file the way I always do, Open project or file."

## Step 2 -- decline usage data

`--step ... --click "No thanks"` -> 02.png

## Step 3 -- open the file

Grace: "Open project or file, pick bus-stops.csv."

`--step ... --click "Open project or file" --upload bus-stops.csv` -> 03.png

Grace (looking at 03): "A preview. 10 nodes, 17 edges, 17 rows -- that's 17 bus links and the 10 stops my colleague said. Good. But right under the columns it says 'Weight: none (each edge counts 1)'. That's exactly what I don't want; the minutes have to count. The minutes column has a box that says 'Attribute'. I'll open that and see what else it can be."

## Step 4 -- (tool) ambiguous name

`--step ... --click "minutes"` -> 04.png. The tool refused: "minutes" names both the column header button and the combobox "Role of minutes". Nothing happened on screen. I meant the box under the heading.

## Step 5 -- open the minutes box

`--step ... --click "Role of minutes"`
-> 05.png

Grace (looking at 05): "A list: From, To, Weight, Date or time, Edge id, Attribute. The line underneath said 'Weight: none', so Weight must be the one that makes the minutes count. I'll pick Weight and see what that line says then."

## Step 6 -- choose Weight

`--step ... --click "Weight"`
-> 06.png

Grace (looking at 06): "Now it says 'Weight: minutes' and a new row, 'Higher means: Not set, Closer, Farther, Capacity'. The sentence under it is clear enough: until I choose, a path counts every edge as one step. That's the trap. More minutes is a longer ride, so the bigger number means farther apart. Farther."

## Step 7 -- choose Farther

`--step ... --click "Farther"`
-> 07.png

Grace (looking at 07): "'Weight: minutes (farther)' and 'a higher weight means farther apart ... a path takes the smallest total.' That's what I want. Direction at the bottom says 'As the file says' -- the bus goes both ways, I think, but I'll leave it, I don't know what a CSV 'says' about direction and I'm not going to fiddle. Still 10 nodes and 17 edges. Load."

## Step 8 -- load

`--step ... --click "Load"`
-> 08.png

Grace (looking at 08): "There's the map. Right side: Nodes 10, Edges 17 -- matches the sheet. 'Loaded weight: minutes (farther)', good, it kept my choice. Direction says Directed and there are little arrows; buses run both ways in real life, but every line in the sheet goes outward from Depot anyway, so I'll not worry yet. No names on the dots, which is annoying, but first the quickest way. The analysis button in the toolbar is the flask, that's where I ranked people before."

## Step 9 -- open the analysis button

`--step ... --click-at 680,864`
-> 09.png

Grace (looking at 09): "A long list -- Degree, Betweenness, Closeness, PageRank... these are all ranking things. I don't want a ranking, I want a route. There's a filter box with the cursor in it. I'll type my own word: quickest."

## Step 10 -- filter the list

`--step ... --type "quickest"`
-> 10.png

Grace (looking at 10): "Oh nice, it understood 'quickest'. One result: 'Shortest path -- the fewest steps, or the shortest path by weight, between two nodes.' By weight is my minutes. Clicking it."

## Step 11 -- choose Shortest path

`--step ... --click "Shortest path"`
-> 11.png

Grace (looking at 11): "A small form: From, To, Follow (Out / All -- All is on, so it can ride both ways, which answers my arrow worry), and Weight already says 'minutes (farther, loaded)'. Lovely, it picked up what I chose at the start. From: Depot."

## Step 12 -- type the start

`--step ... --click "Where the path starts" --type "Depot"`
-> 12.png

Grace (looking at 12): "It offers 'Depot' underneath. Click that."

## Step 13 -- pick Depot from the suggestion

`--step ... --click-at 555,627`
-> 13.png

## Step 14 -- type the end

Grace: "Now To: Harbor."

`--step ... --click "Where the path ends" --type "Harbor"`
-> 14.png

Grace (looking at 14): "Depot stayed in From. Harbor offered under To. Click it."

## Step 15 -- pick Harbor

`--step ... --click-at 557,681`
-> 15.png

## Step 16 -- find the path

Grace: "Depot to Harbor, All, minutes. Find path."

`--step ... --click "Find path"`
-> 16.png

Grace (looking at 16): "There it is. Right side: 'Path 5 nodes, 4 edges', 'Total minutes 14', and 'Nodes in order: Depot, Market, Park, Clinic, Harbor'. Let me check it against the sheet the way I'd check in Excel: Depot-Market 4, Market-Park 3, Park-Clinic 4, Clinic-Harbor 3 -- that's 14. And the obvious other one, Depot-Market-Library-Harbor, is 4+6+5 = 15, so 14 really is quicker; it didn't just count stops. Where it says it used the minutes: the 'Total minutes' line itself, and under 'Made with' it says 'Weight: minutes (farther)'; the graph overview said 'Loaded weight: minutes (farther)' before that. On the left the run is listed as 'Shortest path 4 hops' -- 'hops' is a funny word, I'd have said 4 rides, but it's right. Done."

## End

`--end rounds/round-2/sessions/r2-s01`

## Grace, at the end

- **Did I finish?** Yes. The quickest way from Depot to Harbor is Depot, Market, Park, Clinic,
  Harbor: 14 minutes in all. I checked the sum against the rows myself.
- **Where it says it used the minutes:** before loading, "Weight: minutes (farther)" with "a higher
  weight means farther apart ... a path takes the smallest total"; after loading, the Graph overview
  line "Loaded weight: minutes (farther)"; on the result, "Total minutes 14" and, under Made with,
  "Weight: minutes (farther)". The path form also showed "minutes (farther, loaded)" before I ran it.
- **Ease:** 6 of 7.
- **What confused me or slowed me down:**
  - The minutes column started as "Attribute" with "Weight: none (each edge counts 1)" under it. I
    only knew to change it because that line was there; "Attribute" by itself would not have told
    me. I had to open the box to see that "Weight" was one of the choices.
  - "Higher means: Not set / Closer / Farther / Capacity" -- Farther was clear once I read the
    sentence under the row. "Capacity" I didn't understand and didn't need.
  - The map came in as "Directed" with arrows, though buses run both ways. The path form's
    "Follow: All" was already on, so it didn't hurt, but I only guessed that "All" meant "either
    way along a line".
  - No stop names on the dots, so the picture alone told me nothing until the list on the right.
  - The analysis list is all ranking words; I found the route only because I typed my own word
    ("quickest") into the filter. The run is listed on the left as "4 hops", which is not my word.
