# Session r1-s01 -- Dev (returning student), task T20, dataset A (bus-stops.csv)

Build: 946256efb876, served from the frozen copy named in the tier 2 criteria. Start: empty.
Commands run through `real.mjs` with `REAL_DIST` set to that build; `S` is this session folder.

## Steps

### 01 -- start
Command: `with-browser.sh node real.mjs --start $S empty`

Dev: "Okay, the start screen again. Same as last time: Open project or file, New from data, samples
on the right. There's the usage-data box at the bottom; I'll say no thanks like before. Then I'll
open the file the way I opened the class spreadsheet -- Open project or file."

### 02 -- dismiss the usage box
Command: `--step $S --click "No thanks"`

Dev: "Start screen is clean now. Open project or file, like I did with the class spreadsheet."

### 03 -- open the file
Command: `--step $S --click "Open project or file" --upload bus-stops.csv`

Result: the drawing opened right away: 10 dots, 17 arrows, Overview on the right says Nodes 10,
Edges 17, Directed. No question about my columns.

Dev: "Oh, it just opened it. Wait -- it never asked me about the minutes. Same as my first
spreadsheet, it didn't ask about the third column then either. So does it even know there are
minutes in here? Before I go to the toolbar I want to see if the minutes came in at all. I'll
click Data on the left."

### 04 -- Data
Command: `--step $S --click "Data"`

Result: Data shows Sources (bus-stops.csv, 10 nodes, 17 edges), Filters, and Attributes: Nodes
"id", Edges "minutes" with a # mark.

Dev: "Okay good, minutes is there, with a little number sign, so it read it as a number. But
reading it isn't the same as knowing bigger minutes means a longer trip. Let me click on
minutes and see if it says anything about it."

### 05 -- click minutes
Command: `--step $S --click "minutes"`

Result: the right side shows "minutes, Attribute": Table Edges, Kind Amount, Origin From the
file, Has a value 100%, Distinct values 10, Range 2 to 15.

Dev: "Kind: Amount. Hmm. Amount of what, though? Range 2 to 15, that matches my sheet. But
nothing here says whether 15 is a long trip or a strong link. Is 'Amount' something I can
change? Let me click on it."

### 06 -- click "Amount"
Command: `--step $S --click "Amount"`

Result: nothing changed; it is just text.

Dev: "Nope, it's just a label. There's a little three-dot thing up in the corner next to
minutes. Maybe the options are hiding in there, like in every other program."

### 07 -- the three-dot menu on minutes
Command: `--step $S --click-at 1419,73` (button "Attribute actions")

Result: a menu with only "Filter to..." and "Show in table".

Dev: "Filter, show in table. Nothing about what the number means. That's two tries here, so
I'll stop poking at the column. Maybe it asks when I actually run something, like the ranking
did last time. Toolbar: the flask, that's Analyze, where I ran the ranking. I'll close this
menu and click the flask."

### 08 -- Escape, then Analyze
Command: `--step $S --key Escape --click-at 680,864` (button "Analyze")

Result: the Analyze list opens with a "Filter analyses" box: "Rank nodes and edges" -- Degree,
Betweenness, Edge betweenness, Closeness, PageRank (Start here), Eigenvector, Katz, HITS,
All-pairs distance, Depth-first order (grayed, "Select a node first"), Most flow...

Dev: "Right, this is the list I ranked from. These are all rankings though. I want the quickest
way from Depot to Harbor. There's a filter box, it's already blinking. I'll type 'quickest'."

### 09 -- type "quickest"
Command: `--step $S --type "quickest"`

Result: `No analysis matches "quickest"`.

Dev: "Nothing. Okay, it doesn't know 'quickest'. What would a program call it... 'route'? I'll
try route."

### 10 -- type "route"
Command: `--step $S --key Control+a --type "route"`

Result: "Find paths and edge sets": "Shortest path (Start here) -- The fewest steps, or the
shortest route by weight, between two nodes." and "Guided route" (grayed, "Select 2 nodes first").

Dev: "There it is. Shortest path, 'or the shortest route by weight'. Weight -- is that my
minutes? It says 'by weight', and my column is called minutes, so I'm not sure it's the same
thing. Let's click it and see what it asks."

### 11 -- Shortest path
Command: `--step $S --click "Shortest path"`

Result: a Shortest path form: From ("Where the path starts"), To ("Where the path ends"),
Follow Out / All (All looks picked), Weight: None, Advanced (closed), Find path.

Dev: "Okay! From, To, and Weight says None. So right now it would NOT use my minutes -- good
thing I looked. I'll fill in From first: Depot."

### 12 -- type Depot in From
Command: `--step $S --click "From" --type "Depot"`

Result: a suggestion "Depot" drops down under the box.

Dev: "It found Depot. I'll pick it from the list."

### 13 -- pick Depot
Command: `--step $S --click-at 555,627` (option "Depot")

Dev: "Now To: Harbor."

### 14 -- type Harbor in To
Command: `--step $S --click "To" --type "Harbor"`

Result: From shows Depot; the Harbor suggestion drops down.

Dev: "Pick Harbor."

### 15 -- pick Harbor
Command: `--step $S --click-at 557,681` (option "Harbor")

Dev: "Depot to Harbor. Now Weight, it says None. I'll open it and look for minutes."

### 16 -- open Weight
Command: `--step $S --click "Weight"`

Result: two choices: "None" (checked) and "minutes (farther)".

Dev: "Oh, 'minutes (farther)'. So it does think bigger minutes means farther. Where did it get
that from? I never told it. It's right, though -- that's what I want. But my instructor will
ask how it knew. I'll pick it."

### 17 -- choose minutes (farther)
Command: `--step $S --click "minutes (farther)"`

Result: Weight now reads "minutes (farther)".

Dev: "Depot, Harbor, minutes (farther). Follow says All -- buses, hmm, I'll leave it, I don't
know what Out does. Find path."

### 18 -- Find path
Command: `--step $S --click "Find path"`

Result: the path is drawn in black with a key "Shortest path -- On the path". The right side:
Summary -- Path 5 nodes, 4 edges; Total distance 14. Nodes in order -- Depot 1, Market 2,
Park 3, Clinic 4, Harbor 5. Made with -- Analysis Shortest path, Ran Oct 8 11:06:30 PM, From
Depot, To Harbor, Follow All, Weight minutes (farther); Advanced run settings (closed).

Dev: "Oh nice, that's it! Depot, Market, Park, Clinic, Harbor, total 14. Let me check it
against the sheet myself: Depot-Market 4, Market-Park 3, Park-Clinic 4, Clinic-Harbor 3.
4 + 3 + 4 + 3 = 14. Agrees! And the straight way Depot-Market-Library-Harbor is 4 + 6 + 5 = 15,
so 14 really is quicker. And 'Made with ... Weight: minutes (farther)' -- that's the proof for my
instructor that it used the minutes. Although it says 'Total distance 14', not 14 minutes;
I'd have to explain that distance means minutes here.

But wait. The question said EVERY calculation should treat more minutes as longer. I only told
this one run. If I rank stops next, will it use minutes, and which way? Let me look at
Advanced run settings first in case there's something there."

### 19 -- Advanced run settings
Command: `--step $S --click "Advanced run settings"`

Result: one more line: Method "Dijkstra, chosen automatically".

Dev: "Dijkstra -- we heard that name in the lecture, okay. Nothing about other calculations
though. Quick test: open Analyze again and pick Closeness, the 'nearest to all the others' one,
which should also care about minutes. If its Weight already says minutes (farther), then the
program remembers it for everything. If it says None, I only set it for the route."

### 20 -- Analyze again
Command: `--step $S --click-at 680,864` (button "Analyze")

Result: the list now starts with Recent: Shortest path, then the rankings.

Dev: "Closeness."

### 21 -- Closeness
Command: `--step $S --click "Closeness"`

Result: a small Closeness form: the one-line description, Advanced (closed), "Under a second",
Run. No Weight line showing.

Dev: "Hm, no Weight here at all. Does that mean it ignores minutes, or that it uses them
already? Maybe it's in Advanced."

### 22 -- Closeness Advanced
Command: `--step $S --click "Advanced"`

Result: only "Sample size: Every node".

Dev: "Just sample size. So I can't tell it to use minutes for closeness. I'll run it anyway
and look at its 'Made with' part, like on the route, to see if it says minutes."

### 23 -- Run Closeness
Command: `--step $S --click "Run"`

Result: the dots turn shades of orange; the key adds "Color: Closeness 0.05263 to 0.07692"
above the Shortest path key. The right side still shows the Shortest path result.

Dev: "It colored the stops. But the right side still shows the route, so I can't see what
closeness was made with. Last time results showed up on the left under Graph -- it even says
'Analyze ... to add results here'. I'll go to Graph."

### 24 -- (tool miss) Graph by tab role
Command: `--step $S --click "role=tab:Graph"`

Result: the tool printed `nothing on screen is called "Graph"` (my wrong guess at how the rail
button is named; the screen did not change). Not a participant action.

### 25 -- Graph in the left rail
Command: `--step $S --click-at 27,75` (button "Graph")

Result: the left list now reads Selection, Closeness (10), Shortest path (4 hops, highlighted),
Everything.

Dev: "There they are, both results. Click Closeness to see what it was made with."

### 26 -- select Closeness
Command: `--step $S --click-at 156,156` (treeitem "Closeness")

Result: the right side shows Closeness on its Style tab (Fill: Color Closeness; Shape, Effects,
Label, Tooltip). A Values tab sits next to it.

Dev: "This is the coloring part. The route showed 'Made with' under Values, so: Values."

### 27 -- Closeness Values
Command: `--step $S --click "Values"`

Result: a bar chart 0.05263 to 0.07692, Top 10 (Harbor 0.07692, Library 0.07143, Clinic
0.06667, Market 0.0625, Depot/School/Station 0.05882, Park/Stadium 0.05556, Museum 0.05263),
and Made with: Analysis Closeness, Ran 11:08:09 PM, Advanced run settings: Sample size Every
node. No Weight line.

Dev: "Made with says Closeness and the time. That's it. No minutes, no 'farther'. So did it use
my minutes or not? I can't tell from this, and I can't show my instructor either way. That's
two tries on the 'every calculation' part.

The question said to bring the file IN so that it treats minutes as longer. When I opened it,
it never asked me anything. On the start screen there was a second way in, 'New from data...'.
Maybe that one asks about the columns. I'll look in the main menu, top left."

### 28 -- main menu
Command: `--step $S --click-at 23,20` (button "Main menu")

Result: Back to start, New project, Open project or file..., Open sample, Save, Save as..., Save
local copy..., Export..., Rename, Settings..., Keyboard shortcuts, Help.

Dev: "No 'New from data' in here. 'New project' maybe, but the one I saw was on the start
screen. Back to start -- I hope it doesn't throw away my route... there's undo up top at least."

### 29 -- Back to start
Command: `--step $S --click "Back to start"`

Result: "Discard unsaved changes? bus-stops has changes that are not saved. They are lost if
you continue." Cancel / Discard.

Dev: "Good, it warns me. I wrote the route down already: Depot, Market, Park, Clinic, Harbor,
14 -- and it took like five clicks, I can redo it. It's only my test run. Discard."

### 30 -- Discard
Command: `--step $S --click "Discard"`

Dev: "Start screen. 'New from data...' -- let's see if this one asks about my columns."

### 31 -- New from data
Command: `--step $S --click "New from data"`

Result: a full page "Open as a new graph": Tables (+), "Drop a file here, or choose a file...",
Direction "As the file says", "Choose a file first", Cancel, Load (grayed).

Dev: "Oh, this is a whole setup page. Much more like the Gephi import the tutorial showed.
Choose a file..."

### 32 -- choose the file
Command: `--step $S --click "choose a file" --upload bus-stops.csv`

Result: "bus-stops: 10 nodes, 17 edges". Each row is: a node / an edge (picked) / CSV auto.
Column choices: from -> From (text), to -> To (text), minutes -> Attribute (whole number).
Then the line "Weight: none (each edge counts 1)" and a preview of all rows. Bottom: "17 edge
rows read; the load makes 10 nodes and 17 edges", Direction "As the file says", Cancel, Load.

Dev: "THERE it is. 'Weight: none (each edge counts 1)'. So when I just opened it, every bus
link counted as 1 -- that's exactly what I was worried about. And minutes is set to
'Attribute'. Let me open that minutes box and see what else it can be."

### 33 -- open the minutes role
Command: `--step $S --click-at 728,203` (combobox "Role of minutes")

Result: From, To, Weight, Date or time, Edge id, Attribute (checked).

Dev: "Weight! The line above said Weight: none, so minutes should be the Weight."

### 34 -- minutes as Weight
Command: `--step $S --click-at 691,131` (option "Weight")

Result: "Weight: minutes", then "Higher means": Not set (picked) / Closer / Farther / Capacity,
and the line "Choose what a higher weight means. Until you do, a path counts every edge as one
step, and PageRank and communities read a higher weight as closer."

Dev: "Whoa, okay, this is the question I wanted it to ask me! 'Higher means' -- more minutes
means the stops are farther apart. And look what it says if I leave it Not set: PageRank would
read a higher weight as CLOSER. That's backwards for bus minutes. Glad I came here. Farther."

### 35 -- Farther
Command: `--step $S --click "Farther"`

Result: "Weight: minutes (farther)" and "A higher weight means farther apart, such as a longer
distance or travel time; a path takes the smallest total."

Dev: "'Such as a longer distance or travel time' -- yes, travel time, that's my minutes. 'A
path takes the smallest total.' Perfect. Direction 'As the file says' -- I'll leave it, same as
before. Load."

### 36 -- Load
Command: `--step $S --click "Load"`

Result: the same drawing. Overview now has a new line: "Loaded weight: minutes (farther)".

Dev: "Look -- 'Loaded weight: minutes (farther)' right on the Graph overview. That wasn't there
the first time. That's the proof for the whole file, not just one run. Now redo the route:
Analyze, Shortest path."

### 37 -- Analyze, type "route"
Command: `--step $S --click-at 680,864 --type "route"`

Dev: "Shortest path is there again."

### 38 -- Shortest path, second time
Command: `--step $S --click "Shortest path"`

Result: the same form, but Weight already reads "minutes (farther, loaded)".

Dev: "This time Weight already says 'minutes (farther, loaded)' without me touching it. So
that's the 'every calculation' part working. Depot..."

### 39 -- From Depot, To Harbor
Command: `--step $S --click "From" --type "Depot" --click-at 555,627 --click "To" --type "Harbor" --click-at 557,681`
(options "Depot" and "Harbor", picked the same way as the first time)

Dev: "Find path."

### 40 -- Find path, second time
Command: `--step $S --click "Find path"`

Result: the same route as before: Path 5 nodes, 4 edges; Total distance 14; Nodes in order
Depot 1, Market 2, Park 3, Clinic 4, Harbor 5; Made with ... Weight minutes (farther).

Dev: "Same answer, 14. Good -- and now the setting is on the file, not just on this run. I'm
done."

### end
Command: `--end $S`

## At the end (in character)

**Did I finish?** Yes. The quickest way from Depot to Harbor is Depot, Market, Park, Clinic,
Harbor: 14 minutes in all (4 + 3 + 4 + 3, which I added up from the sheet myself; the other way
through Library is 15). Where the program says it used the minutes: on the Graph overview,
"Loaded weight: minutes (farther)", and on the route's own result under "Made with", "Weight:
minutes (farther)". The essay sentence: "Using travel time as the weight (more minutes =
farther), the quickest route from Depot to Harbor is Depot - Market - Park - Clinic - Harbor,
14 minutes."

**Ease:** 4 out of 7. The route itself was easy once I found it. Getting the minutes counted
for everything was the hard part, and I only found it on my second way in.

**What confused me:**

- When I opened the file the normal way (Open project or file), it never asked about the
  minutes. Everything looked fine, and it was only on the other page that I learned each link
  had counted as 1 and that PageRank would have read more minutes as CLOSER. If I hadn't been
  told "every calculation", I would never have gone looking.
- On the minutes column in Data it said "Kind: Amount" and nothing I could change; the
  three-dot menu only had Filter and Show in table. That's where I expected to say what the
  number means.
- On the route, the Weight list already offered "minutes (farther)" before I'd told it anything.
  It was right, but I didn't know where "farther" came from, so I couldn't explain it to my
  instructor.
- Closeness has no Weight choice at all, and its "Made with" says nothing about minutes, so I
  couldn't tell whether it used them (its numbers changed nothing in my head; I couldn't check).
- I couldn't find "quickest" when I searched Analyze; "route" found Shortest path.
- To get to the import page with the "Higher means" question I had to go back to the start
  screen and throw away my work. The main menu has no "New from data".
- The result says "Total distance 14", not 14 minutes.
- I never knew what "Follow: Out / All" meant for buses and left it on All.

## Notes for the studio (out of character)

- Step 24 was a driver error (wrong name for the rail button), not a participant action.
- Dev reached the import page's "Higher means" control by reading the prompt's "bring it into
  the program" after his column and closeness checks failed; on the plain Open path nothing
  pointed him there.
