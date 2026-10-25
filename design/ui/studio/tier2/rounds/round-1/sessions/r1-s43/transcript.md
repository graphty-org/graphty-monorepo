# Session r1-s43 -- Nadia (returning), T22 prompt A, bus stops

Build: tier2-r1d4-946256efb (served with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/).
Command prefix: `cd .../design/ui/studio/tier2 && REAL_DIST=... node ../tool/real.mjs`; session folder `rounds/round-1/sessions/r1-s43`.

## Start

`--start rounds/round-1/sessions/r1-s43 setup:bus-stops-ranked.txt` -> 01.png

01.png: bus-stops.csv is open. Eleven orange balls, sized and colored by PageRank (a key top left).
Left list: Selection, PageRank (10), Everything. Right panel: PageRank, Style tab, Nodes / Edges toggle.
The links are thin gray arrows; nothing tells me which ones are slow.

## Steps

### Step 1 -- 02.png

Thought: "My colleague cares about the links. The right panel has an Edges button, so I'll start there."
Command: `--step ... --click "Edges"`
Saw: the right panel now lists Line, Arrows, Label, each with a plus. Still under the PageRank heading, which I don't quite get -- is this styling PageRank's links or all links?

### Step 2 -- 03.png

Thought: "Line is the link itself. Plus next to Line."
Command: `--step ... --click-at 1419,168` (tool: button "Add to Line")
Saw: a menu: Color, Width, Opacity, Pattern, Curved. Color is what I want -- slow links in a different color.

### Step 3 -- 04.png

Thought: "Color, so the slow ones can be a different color."
Command: `--step ... --click "Color"`
Saw: the menu closed, but nothing appeared under Line in the right panel -- still just Line, Arrows, Label with plus signs. The key at top left gained a new entry, "Edge color: Everything", with a gray swatch. So something got added somewhere, to "Everything", not to the PageRank panel I was in. The links look the same gray. Confusing: I clicked in PageRank's panel and it landed on Everything?

### Step 4 -- 05.png

Thought: "The key says Everything. Let me open Everything and see what I added."
Command: `--step ... --click "Everything"`
Saw: Everything's panel, Edges tab, Line now has Color A9A9A9 at 100 percent, Width 8, Pattern Solid. So the Color I added from PageRank's panel went here. I didn't expect that, but fine -- this is where the links' color lives. There is a little chain-link icon next to Color and Width. Maybe that ties the color to a column?

### Step 5 -- 06.png

Thought: "What does the chain icon do?"
Command: `--step ... --hover-at 1381,192`
Saw: tooltip "Color by attribute". Minutes is an attribute of each link, I think. Try it.

### Step 6 -- 07.png

Thought: "Click it."
Command: `--step ... --click-at 1381,192`
Saw: a "Color by attribute" popup with one choice: minutes. Good, that's the column.

### Step 7 -- 08.png

Thought: "minutes."
Command: `--step ... --click "minutes"`
Saw: the links turned shades of orange and brown, key "Edge color: Everything, 2 to 15". It's a sliding scale, and it is the same orange as the stops, so the links blend in. I can sort of see a few darker links up top, but I can't tell which are 10 or more and which are 9, and I can't count them. My colleague asked for a cut at 10, not a shade. Maybe the color box ("min...") has settings.

### Step 8 -- 09.png

Thought: "Open the color control."
Command: `--step ... --click-at 1334,174` (tool: button "minutes, Orange to brown")
Saw: "Color from data": Source minutes, Scale Linear, Palette Orange to brown, Reverse, Values from the data, No value, Detach. Maybe Scale has something like "above / below a value".

### Step 9 -- 10.png

Thought: "Scale options."
Command: `--step ... --click-at 1180,276`
Saw: Linear, Logarithmic, Negative logarithmic, Square root, Power, Equal bins, Quantiles, One color per value, As written. None of these words means "10 and up" to me. Equal bins might split somewhere, but not at 10 that I can control. This is a color-scale tool, not what I need. I'll back out and try the search box on the left -- that's where I always start.

### Step 10 -- 11.png

Thought: "Close these."
Command: `--step ... --key Escape --key Escape`
Saw: popups closed; links stay shaded by minutes. (Side note: Width says 8 but the links are hairline-thin. Eight what?) Now the search box: "Find nodes, edges, values". Values -- minutes are values. I'll type 10.

### Step 11 -- 12.png

Thought: "Type 10 in the find box."
Command: `--step ... --click "Find nodes, edges, values" --type "10"`
Saw: "No match for "10"". Either nothing is exactly 10 minutes, or it doesn't search the minutes. I want 10 or more anyway. In a spreadsheet I'd write minutes >= 10. Let me try that.

### Step 12 -- 13.png

Thought: "minutes >= 10."
Command: `--step ... --key Control+a --type "minutes >= 10"`
Saw: "No match for "minutes >= 10"". No hint how to write it otherwise. Maybe it needs Enter.

### Step 13 -- 14.png

Thought: "Enter."
Command: `--step ... --key Enter`
Saw: nothing changed, still "No match". The search box finds names, I guess, not conditions. At least I can count them the old way: the Data button on the left probably has the table. Sort by minutes and count.

### Step 14 -- 15.png

Thought: "Data."
Command: `--step ... --click "Data"`
Saw: bus-stops.csv, 10 nodes, 17 edges. Filters with a plus -- but a filter takes things off the map, and I was told not to. Attributes: Nodes id, Edges minutes. Click minutes and see what it shows.

### Step 15 -- 16.png

Thought: "The minutes column."
Command: `--step ... --click "minutes"` (tool: ambiguous, took the tree item "minutes, edge attribute")
Saw: a summary: Edges, Amount, From the file, 100 percent have a value, 10 distinct values, range 2 to 15. No list of the links, no count above 10. Earlier there was a "Values" tab next to Style in the layer panel. Back to Graph, Everything, Values.

### Step 16 -- 17.png

Thought: "Back to the graph."
Command: `--step ... --click "Graph"`
Saw: the right panel shows "Graph", Values: 10 nodes, 17 edges, Directed, density, components, edges per node. No list of links. My search text is gone from the box. Try Everything, then Values.

### Step 17 -- 18.png

Thought: "Everything, Values."
Command: `--step ... --click "Everything" --click "role=tab:Values"`
Saw: "Covers every node and edge: 10 nodes, 17 edges." Nothing per link. I'm now about ten minutes in, which is longer than an alert. The magnifier at the bottom of the map -- maybe that's a bigger search.

### Step 18 -- 19.png

Thought: "The magnifier."
Command: `--step ... --click-at 818,864` (tool: button "Quick actions")
Saw: a command list, "Search commands": Go to Graph/Data/Notes, Find, Rename, Move up... Let me ask it about minutes.

### Step 19 -- 20.png

Thought: "minutes."
Command: `--step ... --type "minutes"`
Saw: "No results". These are commands, not data. What would the command be called -- highlight?

### Step 20 -- 21.png

Thought: "highlight."
Command: `--step ... --key Control+a --type "highlight"`
Saw: "No results". I give up on asking the program to do it. Old way: put the minutes on every link as a label, then I read them and count, like I do with connection lists. Seventeen links, I can count that.

### Step 21 -- 22.png

Thought: "Close that, back to Style."
Command: `--step ... --key Escape --click "role=tab:Style"`
Saw: Everything, Edges: Line color minutes, Width, Pattern; Arrows; Label with a plus. Add a label.

### Step 22 -- 23.png

Thought: "Plus next to Label."
Command: `--step ... --click-at 1419,310` (tool: button "Add label line")
Saw: a Label popup, Attributes: minutes. Pick it.

### Step 23 -- 24.png

Thought: "minutes as the label."
Command: `--step ... --click-at 1125,448` (tool: option "minutes")
Saw: every link now has its minutes written on it. Reading them off: 15, 4, 14, 6, 9, 5, 12, 4, 5, 3, 3, 6, 4, 5, 7, 4, 2 -- seventeen, which matches the 17 edges. Two 3s near the middle overlap each other and I had to squint. Ten or more: 15 (top left), 14 (top, into the big stop), 12 (left, into the big stop). Three. Nothing is exactly 10, which explains the "No match for 10" earlier.
The 15, 14 and 12 links are darker brown than the rest, so they sort of stand out, but so does the 9, nearly as dark. If QA asked "which links are 10 or more" from this picture, the honest answer is "read the numbers", not "the colored ones". It's not the cut my colleague asked for.
I'm stopping here: I have a count and a picture with the numbers on it, and I've spent far longer than an alert.

`--end rounds/round-1/sessions/r1-s43`

## Debrief (in character)

**Did I finish?** Partly. My answer is 3 links of 10 minutes or more (15, 14 and 12 minutes). Nothing was taken off the drawing. But I did not make those three stand out from the rest: I colored every link on a sliding scale by minutes and wrote the minutes on every link, so they're darker and they have big numbers, and a 9-minute link looks almost the same. I counted them by reading labels, the same way I read lists of connections.

**Ease:** 2 out of 7.

**What confused me:**

- I added a line color from the PageRank panel, and it showed up under "Everything" instead, with nothing appearing in the panel I was looking at. I only found it because the key at the top left changed.
- The search box says it finds "values", but typing 10 and "minutes >= 10" both said "No match", with no hint of how it wants a condition written. If it can do this, it never told me.
- The color-by-data options are all kinds of scales (linear, logarithmic, bins, quantiles). There is no "10 and up one color, the rest another" that I could see. I want a line drawn at a number I choose.
- The minutes column's summary tells me the range and how many distinct values, but not how many links are above a number, and there's no list of the links I could sort.
- The command search at the bottom found nothing for "minutes" or "highlight".
- Width says 8 but the links are hairline-thin; I don't know what 8 means.
- Two link labels sit on top of each other in the middle (two 3s).

**What QA would say:** "Show me the three." I'd have to point at numbers on a picture full of numbers. For an alert file I need one picture where the three are obviously different, and a line of text saying "3 links of 10+ minutes". I'd get the line of text by counting by hand, not from the program.
