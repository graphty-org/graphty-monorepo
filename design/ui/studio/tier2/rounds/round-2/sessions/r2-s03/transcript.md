# Session r2-s03 -- Jordan (returning marketing analyst), task T20 A (bus stops)

Build: the frozen build named on the first line of criteria.md (8f0d5a6f7791).

## Step 1 -- start

Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/ node real.mjs --start <session> empty`

Screenshot 01.png: the start screen I know. Open project or file..., New from data..., samples on the
right, the usage-data question at the bottom, and "Files are read on this computer and never
uploaded" -- good, that is my laptop question answered. Bus stops are not customer data anyway.

## Step 2

Command: `--step --click "No thanks"`

Not sharing usage data. Next I open the file the way I always do: Open project or file..., pick bus-stops.csv.

## Step 3

Command: `--step --click "Open project or file" --upload bus-stops.csv`

Screenshot 03.png: an "Open as a new graph" preview. Each row is an edge, from/to are From and To,
and the minutes column is set to "Attribute". Under it: "Weight: none (each edge counts 1)". That
is exactly what I don't want -- the minutes should count. The dropdown over the minutes column
looks like where I tell it what the column is.

## Step 4

Command: `--step --click-at 728,211` (the dropdown over the minutes column, "Role of minutes")

Screenshot 04.png: the list is From, To, Weight, Date or time, Edge id, Attribute. "Weight" -- I say
"weighted" loosely, but here it is the thing that makes the minutes count. I'll pick Weight.

## Step 5

Command: `--step --click "Weight"`

Screenshot 05.png: "Weight: minutes", then "Higher means: Not set / Closer / Farther / Capacity" and a
line saying that until I choose, a path counts every edge as one step. Good that it warns me. More
minutes is a longer trip, so higher means farther.

## Step 6

Command: `--step --click "Farther"`

Screenshot 06.png: "Weight: minutes (farther)" and "A higher weight means farther apart, such as a
longer distance or travel time; a path takes the smallest total." That reads right. Direction says
"As the file says" -- I'm not sure whether buses go both ways, but I'll leave the default. Load.

## Step 7

Command: `--step --click "Load"`

Screenshot 07.png: the map is drawn, 10 dots with arrows, no names on the dots (annoying -- which
one is Depot?). The right panel's Overview says Nodes 10, Edges 17, Directed, and "Loaded weight:
minutes (farther)". So that's one place it admits it has the minutes. Now the quickest route. I
always go to the analysis button (the flask) in the toolbar for anything computed.

## Step 8

Command: `--step --click-at 680,864` (the flask button in the bottom toolbar)

Screenshot 08.png: the analysis list I know -- Degree, Betweenness, Closeness, PageRank... all
ranking stuff. Nothing about a route in what I can see. There's a "Filter analyses" box with focus,
so I'll type the word I'd use: "route".

## Step 9

Command: `--step --type "route"`

Screenshot 09.png: two hits. "Shortest path -- The fewest steps, or the shortest path by weight,
between two nodes" and "Guided route -- Select 2 nodes first" (greyed). Shortest path it is.

## Step 10

Command: `--step --click "Shortest path"`

Screenshot 10.png: a Shortest path box: From, To, "Follow: Out / All" (All is on), and "Weight:
minutes (farther, loaded)" already filled in. Nice, I didn't have to tell it twice. I'll accept the
defaults. From = Depot: click the box and type it.

## Step 11

Command: `--step --click "Where the path starts" --type "Depot"`

Screenshot 11.png: a suggestion "Depot" drops down under the box. Pick it.

## Step 12

Command: `--step --click-at 555,627` (the Depot suggestion)

Screenshot 12.png: From says Depot, and the To box now has the focus outline. Type Harbor.

## Step 13

Command: `--step --type "Harbor"`

Screenshot 13.png: "Harbor" suggestion. Pick it.

## Step 14

Command: `--step --click-at 557,681` (the Harbor suggestion)

Screenshot 14.png: Depot to Harbor, weight minutes, focus jumped to "Find path". Go.

## Step 15

Command: `--step --click "Find path"`

Screenshot 15.png: the answer is on the right. Summary: Path 5 nodes, 4 edges; Total minutes 14.
Nodes in order: Depot 1, Market 2, Park 3, Clinic 4, Harbor 5. "Made with": Analysis Shortest path,
From Depot, To Harbor, Follow All, Weight minutes (farther). The path is drawn in black on the map
with a little key "On the path" in the corner.

Sanity check against the rows I saw in the preview: Depot-Market 4, Market-Park 3, Park-Clinic 4,
Clinic-Harbor 3 = 14. The obvious alternative, Depot-Market-Library-Harbor, is 4+6+5 = 15, and
Depot-School-Harbor is 9+12 = 21. So 14 checks out -- and it is not the fewest-stops route, which
tells me it really used the minutes. I believe it.

One niggle: the left list says "Shortest path -- 4 hops" while the right says 14 minutes. "Hops" is
not my word, and for a second I wondered if it had counted stops instead of minutes. The right panel
cleared that up. Also the dots on the map still have no names, so on the picture alone I can't tell
which black dot is Depot -- for a slide I'd have to fix that.

## Step 16 -- end

Command: `--end`

## Wrap-up (in character)

**Did I finish?** Yes. Quickest way from Depot to Harbor: Depot, Market, Park, Clinic, Harbor --
14 minutes in all. Where the program says it used the minutes: when loading, the preview said
"Weight: minutes (farther)"; the Graph overview says "Loaded weight: minutes (farther)"; the
Shortest path box had "minutes (farther, loaded)" preselected; and the result panel shows "Total
minutes 14" plus "Weight: minutes (farther)" under "Made with".

**Ease: 6 out of 7.** Sixteen steps, no dead ends. The load screen did the heavy lifting: the column
dropdown had "Weight", and the "Higher means" choice with Farther spelled out what it would do.
After that I never had to repeat myself -- the path tool already knew about the minutes.

**What confused me or slowed me down:**
- The "Higher means: Not set / Closer / Farther / Capacity" row only appears after picking Weight.
  If I had just hit Load with the minutes left as "Attribute", I'd have had a fewest-stops answer;
  the small "Weight: none (each edge counts 1)" line was the only warning before that.
- The analysis list is all ranking measures at the top; I only found Shortest path by typing
  "route" in the filter. Scrolling, I might have given up on it.
- "4 hops" next to the result in the left list made me doubt for a moment whether it counted stops
  or minutes.
- No names on the dots, so the map alone doesn't tell me which stop is which. For a deck that's a
  problem.
- "Follow: Out / All" with All preselected on a directed file -- I didn't touch it, but I don't
  know whether a bus that only runs one way would be taken backwards.
- And honestly, same as always: our listening suite would never let me do any of this with the
  data it exports, so at least here the numbers are mine to check.
