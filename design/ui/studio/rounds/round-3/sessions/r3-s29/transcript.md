# Session r3-s29 -- Tom (the recipe recipient), task T9 prompt B (Florentine families)

Task as given: "You have never used this program before. You will practice on the ready-made
network of the leading families of Renaissance Florence and the marriages between them that comes
with the program, not on your own data. Make the drawing show which families the network depends
on most: the more it depends on a family, the bigger that family's dot. Then tell us what the
sizes and the colors on the drawing now stand for."

Tool: `S=design/ui/studio/rounds/round-3/sessions/r3-s29`; commands run from design/ui/studio as `node tool/real.mjs ...`.

## Step 1 -- start

Command: `node tool/real.mjs --start $S empty` -> 01.png
Saw: a dark start page. Left: "Open project or file...", "New from data...", "Files are read on
this computer and never uploaded." Right: Samples -- Les Miserables, Zachary's karate club,
College football, Florentine families (15 families, "Good for finding who brokers between
groups"). A usage-data box at the bottom. "Local only" with a lock in the top corner -- good, that
answers my first question before I asked it.

## Step 2

Thinking (Tom): "I'm not sharing usage data. No thanks. Then the Florentine families one -- that's
what they told me to use."
Command: `--step $S --click "No thanks" --click "Florentine families"`
Saw (02.png): 15 blue dots joined by grey lines, no names on any of them, all the same color and
roughly the same size (the top ones look bigger, probably just closer -- there's a "3D" button).
Right panel: Nodes 15, Edges 20, Density 0.1905, Components 1, "Edges per n..." cut off. Left
panel: a find box, "Selection", "Everything", and at the bottom in small grey text "Analyze [flask]
in the toolbar (Shift+A) to add results here". A small toolbar at the bottom middle: flask, a
chart-ish icon, "3D", magnifier.
Tom: "No names. I can't tell who is who. Fine, the job is sizes. Nothing says 'size'. The grey line
at the bottom says Analyze is the flask in the toolbar. That bottom bar is the only thing that
looks like buttons, so I'll press the flask."

## Step 3

Command: `--step $S --click-at 680,864` (the flask in the bottom toolbar)
Saw (03.png): a list popped up over the drawing: "Filter analyses", heading "Rank nodes and
edges", then Degree, Betweenness, Edge betweenness, Closeness, PageRank (with a blue "Start here"
tag), Eigenvector, Katz, HITS, All-pairs distance, a greyed "Depth-first order -- Select a node
first", "Most flow", and more below.
Tom (hesitating): "Algorithm names. I don't know what Katz or HITS is and I'm not learning it at
4 pm. Nothing here says 'depends on'. Betweenness -- 'which nodes sit on the shortest paths between
others' -- maybe, but I'm not sure that's 'depends on'. One of them says 'Start here'. When in
doubt I do what the sign says. PageRank."

## Step 4

Command: `--step $S --click "PageRank"`
Saw (04.png): the list turned into a small PageRank box: "Which nodes are connected to other
well-connected nodes.", "Damping factor 0.85", "Weight: None", a collapsed "Advanced", "Under a
second" and a blue "Run" button. Drawing unchanged.
Tom: "Damping factor. Don't know, don't care -- I'm leaving the numbers she'd leave. Not touching
Advanced. Run."

## Step 5

Command: `--step $S --click "Run"`
Saw (05.png): the dots went from blue to shades of orange-brown; one in the middle is nearly black.
A box top-left says "Color: PageRank", 0.03066 [orange bar] 0.1458. The box sits on top of where
the top-left dot was -- that dot is hidden now. Left panel has a new row "PageRank 15". Dot sizes
look the same as before.
Tom: "So it did something -- colors. Darker means more, I guess, the bar goes light to dark. But
I was told bigger dots, not darker dots. And orange-to-brown, I can just about tell them apart.
There's a new line on the left that says PageRank. Maybe that's where I change what it does."

## Step 6

Command: `--step $S --click "PageRank"` (the new row in the left panel)
Saw (06.png): the PageRank row is highlighted with an eye icon. The right panel changed to
"PageRank -- Measure from PageRank, Oct 7", tabs Style / Values, Nodes / Edges, and a list: Fill
(+), Color "PageRank" (-), Shape (+), Effects (+), Label (+), Tooltip (+). Drawing unchanged.
Tom: "Here's where it decides how it looks. Color is PageRank -- that's the orange. There's no
'Size' line. Fill, Shape, Effects, Label, Tooltip. A dot's size... I'd guess that's under Shape.
I'll press the plus next to Shape and see -- if it's wrong I'll back out."

## Step 7

Command: `--step $S --click-at 1420,234` (the + beside Shape)
Saw (07.png): a little menu under the Shape plus: "Size" (highlighted) and "Shape".
Tom: "There it is. Size. Good guess."

## Step 8

Command: `--step $S --click "Size"`
Saw (08.png): a box "Size by attribute": a find box, "Fixed size", a heading "PageRank" with three
choices -- PageRank, PageRank rank, PageRank percentile -- then greyed "Cannot be used: Holds
groups, not amounts" with id and name.
Tom (brief hesitation): "Three PageRanks. Rank, percentile... I don't know which one she'd pick.
The color says plain 'PageRank', so I'll pick the same one, then size and color say the same
thing."

## Step 9

Command: `--step $S --click "PageRank#2"` first tried as plain name; see output
Tool note: the plain name "PageRank" matched 5 controls and the tool took the first one, the
PageRank row in the LEFT panel, not the option in the open box. That is a slip of the tool, not
something Tom did (he would have clicked the option he was looking at). Finding for graders: the
same word "PageRank" names the analysis row, the color chip, the group heading and the option.
Saw (09.png): the box closed. The right panel now has a "Size" row with a field showing "1", a
chain-link icon and a minus. Dots unchanged in size.
Tom: "It closed and it just says 1. That's not what I picked. The little chain icon next to it is
lit up the same way as when the box opened -- I'll press it to get the list back."

## Step 10

Command: `--step $S --click-at 1381,264` (the link icon beside Size)
Saw (10.png): the same "Size by attribute" box again.
Tom: "Right. PageRank, the plain one."

## Step 11

Command: `--step $S --click-at 1195,416` (the "PageRank" option in the box)
Saw (11.png): the dots are now different sizes. One in the middle is much bigger than the rest and
nearly black; a few mid-sized ones; several small light-orange ones at the edges. The box top-left
now has two lines: "Size: PageRank 0.03066 [grey wedge] 0.1458" and "Color: PageRank 0.03066
[orange bar] 0.1458". The Size row on the right reads "1 to 3". The legend box still covers the
top-left dot (only a sliver of it shows at its right edge).
Tom: "That's it -- bigger dots. And the box says both size and color are PageRank, so they're
telling me the same thing twice: big and dark means more PageRank. I'd still like to know who the
big one is. No names on anything. I'll point at it and see if it says."

## Step 12

Command: `--step $S --hover-at 700,378` (the big dark dot)
Saw (12.png): nothing changed on screen. No name, no popup on hover. (The tool reports the dot is
the node "Medici", but nothing on screen said so -- Tom does not know that.)
Tom: "Nothing. It won't tell me who it is just by pointing. I'm not going digging for that; it
wasn't the job. The dots are sized, I'm stopping."

## End

Command: `node tool/real.mjs --end $S`

## In character: debrief (Tom)

**Did I finish?** Yes, I think so. The dots are different sizes now, and the box in the corner
says the size is PageRank. I would not bet my lab meeting on PageRank being what "depends on most"
means -- I picked it because it said "Start here", not because I knew. If she meant Betweenness I
wouldn't have known the difference.

**What do the sizes and colors stand for now?** Both stand for the same thing: the family's
PageRank. Bigger dot and darker brown means a higher PageRank, from about 0.03 for the smallest to
about 0.15 for the biggest. The program's own one-liner was "which nodes are connected to other
well-connected nodes" -- so a big dark dot is a family married into other well-married families.
The colors are not telling me anything the sizes don't already say.

**Rating:** 5 out of 7. Getting it to work out the numbers was quick once I found the flask. Then
it colored the dots when I'd asked for sizes, and I had to go find size myself under "Shape",
which I only got because I guessed.

**What confused me:**

- After Run the dots went orange, not bigger. I had to find size myself. Nothing on that screen
  said "size".
- Size was hiding under "Shape". No line called Size until I pressed the plus.
- Then there were three PageRanks to choose from: plain, rank and percentile. I don't know the
  difference and nothing told me which one to pick.
- The word PageRank is everywhere -- the row on the left, the color button, the heading in the
  box, the choice. (My pointer slipped onto the wrong one once and the box just closed and said
  "1".)
- The legend box in the top corner sits on top of one of the families' dots. That dot is gone
  from the picture.
- No names on the dots, and pointing at the biggest one told me nothing. I can say "the big one in
  the middle", not which family it is. The PI will ask.
- Orange to dark brown is fine for me; at least it's light to dark, not red and green.
- The analysis list was a wall of algorithm names (Katz, HITS, Eigenvector). Nothing on it said
  "depends on". I'd have asked the postdoc which one if there hadn't been a "Start here".
