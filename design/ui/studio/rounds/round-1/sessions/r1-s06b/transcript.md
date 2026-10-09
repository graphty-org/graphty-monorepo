# Session r1-s06b -- Grace (nonprofit operations analyst), task T15 prompt B, friends.csv

Participant: Grace, the one person at a small nonprofit who "does the data". Lives in Excel, has
never used a network tool. Today's file: a running-club list a friend kept, `friends.csv` (41 rows
in Excel, 20 people).

All commands run from the studio worktree as
`node design/ui/studio/tool/real.mjs <args> design/ui/studio/rounds/round-1/sessions/r1-s06b ...`.

---

## Start

**Command:** `--start <session> empty` -> `01.png`

**Saw:** a dark start page. Left: "Start" with "Open project or file..." (Ctrl+O), "New from
data...", "or drop a file anywhere in this window", and "Files are read on this computer and never
uploaded." Middle: an empty "Recent projects". Right: four samples (Les Miserables, Zachary's
karate club, College football, Florentine families). Bottom: a box "Your data is yours, but please
help us" with "Share usage data" / "No thanks".

**Think-aloud:** "OK, first thing I look for is whether my file goes anywhere. 'Files are read on
this computer and never uploaded' -- good, that's the sentence I want, and it's right next to the
open button. The usage-data box: no thanks, I'm not sharing anything from a work laptop."

## Step 1 -- dismiss the usage prompt

**Command:** `--step --click "No thanks"` -> `02.png`

**Think-aloud:** "Now open my file. 'Open project or file...' is the most obvious door."

## Step 2 -- open friends.csv

**Command:** `--step --click "Open project or file..." --upload friends.csv` -> `03.png`

**Saw:** it opened straight into the drawing -- no import wizard, no column-mapping step. Blue
balls joined by arrows. Top bar says "friends". Right panel "Graph, From friends.csv", Overview:
Nodes 20, Edges 41, Direction Directed, Density 0.1079, Components 1, Edges per node "3 to 6, mean
4.1". Left panel: search box, "Selection", "Everything", and at the bottom "Analyze (Shift+A) to
add results here". A small toolbar at the bottom center with five icons (a flask, a move arrow, a
cube, a list, a command key).

**Think-aloud:** "Oh -- it just drew it. I didn't have to tell it which column is which. Let me
check the counts: 41 edges, that's my 41 rows in Excel. 20 nodes -- the task said 20 people.
Good, everyone arrived. 'Density' and 'Components' don't mean anything to me but I can ignore
them. 'Directed' -- my friend's list isn't really one-way, knowing someone goes both ways, so the
arrows are a bit odd, but fine. No names on the balls yet. Part one, getting it on screen: done."

**Hesitation:** none on opening. A small puzzle over arrows on what she thinks of as a two-way
relationship.

## Step 3 -- look for "who matters most"

**Think-aloud:** "Now 'which people matter most'. The left panel literally says 'Analyze' at the
bottom, and the flask at the bottom looks like science-y analysis. I'll click the flask."

**Command:** `--step --click-at 659,864` (the flask) -> `04.png` (reported `button "Analyze"`)

**Saw:** a popup with a filter box and a list under "Rank nodes and edges": Degree ("How many edges
each node has"), Betweenness, Edge betweenness, Closeness, PageRank with a blue "Start here" tag
("Which nodes are connected to other well-connected nodes"), Eigenvector, Katz, HITS, All-pairs
distance, and greyed ones (Depth-first order "Select a node first", Most flow).

**Think-aloud:** "That's a lot of words I don't know. Betweenness, Eigenvector, Katz, HITS...
jargon. But each has one plain line under it, which helps, and one says 'Start here'. 'Degree --
how many edges each node has' -- that's 'most connected', which is what I'd have picked if I knew
what an edge was. But the program says 'Start here' on PageRank, and I'm new, so I'll trust it."

**Hesitation:** a few seconds reading the list. Would have preferred a plain heading like "Who is
most connected" over the algorithm names.

## Step 4 -- choose PageRank

**Command:** `--step --click-at 536,600` -> `05.png`

**Saw:** a small panel "PageRank -- Which nodes are connected to other well-connected nodes",
"Damping factor 0.85", "Under a second", and a blue "Run".

**Think-aloud:** "Damping factor? No idea. I'm leaving it alone. 'Under a second' is reassuring.
Run."

## Step 5 -- run it

**Command:** `--step --click "Run"` -> `06.png`

**Saw:** the balls turned orange, a few dark brown. A box at the top-left of the drawing: "Color:
Influence, 0.04382 [orange-to-brown bar] 0.06608". Left panel gained a row "Influence" with a
little color bar and "20".

**Think-aloud:** "It colored them. Darker means more, I suppose, from the bar. But wait -- I ran
'PageRank' and it's called 'Influence' now. I guess that's the plain-English name; I actually like
'Influence' better, I just wasn't sure they were the same thing at first. The numbers 0.04 to 0.07
mean nothing to me -- I'd never put those on a slide. I still can't tell who is who, no names.
Let me click 'Influence' on the left to see more."

**Hesitation:** the rename from PageRank to Influence; the key's decimal numbers.

## Step 6 -- open the Influence result

**Command:** `--step --click "Influence"` -> `07.png`

**Saw:** the right panel became "Influence, Measure from Influence, Oct 6" with Style / Values.
Values: a small bar chart, "20 of 20 have a value, 0.04382 to 0.06608, median 0.04736". "Top 10":
Farah 0.06608, Ava 0.06423, Hana 0.05883, Ivan 0.05575, Gus 0.0547, Jada, Theo, Sana, Ravi, Quinn.
"Made with": Analysis Influence, Ran Oct 6, Damping Factor 0.85.

**Think-aloud:** "Now this is useful -- a Top 10 list with names. Farah and Ava matter most, then
Hana and Ivan. Part two, 'work out who matters most': done -- Farah. I'd love to copy this list
into Excel. Now I need the dots bigger. There's a 'Style' tab, let's try that."

## Step 7 -- Style tab

**Command:** `--step --click "Style"` -> `08.png`

**Saw:** Nodes / Edges switch; rows Fill (+), Color = "Influence" chip (-), Shape (+), Effects
(+), Label (+), Tooltip (+).

**Think-aloud:** "Color is already set to Influence. No 'Size' row. Bigger is a shape thing, I
guess? I'll try the plus next to Shape."

**Hesitation:** no visible "Size" row; she had to guess it lives under Shape.

## Step 8 -- plus next to Shape

**Command:** `--step --click-at 1419,226` -> `09.png` (reported `button "Add to Shape"`)

**Saw:** a small menu: "Size", "Shape".

**Think-aloud:** "There it is, Size."

## Step 9 -- choose Size

**Command:** `--step --click "Size"` -> `10.png`

**Saw:** a new row "Size [1 v]" with a chain-link icon and a minus. Drawing unchanged.

**Think-aloud:** "Size 1. That makes everyone the same size, which isn't what I want. How do I say
'bigger for more influence'? Color has the word 'Influence' in its box; this one has a number. The
little chain icon beside it -- let me hover."

**Hesitation:** the main snag of the session. A fixed number appeared instead of "by Influence",
and the link icon is unlabelled until hovered.

## Step 10 -- hover the chain icon

**Command:** `--step --hover-at 1381,256` -> `11.png`; tooltip "Size by attribute".

**Think-aloud:** "'Size by attribute'. 'Attribute' is database-speak, but I know it means a column.
That's the one."

## Step 11
