# Session r3-s56 -- Ruth (reporter with a contacts sheet), task T16 "First look"

Start: empty. File offered: friends.csv (running club, who knows whom).

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s56 empty`

Saw (01.png): a dark start page. Left: "Open project or file...", "New from data...", "or drop a file
anywhere in this window", "Files are read on this computer and never uploaded." Middle: Recent
projects (empty). Right: four samples (Les Miserables, Zachary's karate club, College football,
Florentine families), each with a one-line "good for". Top right a lock with "Local only". Bottom:
a box asking to share usage data.

Ruth: "Good -- 'never uploaded' and 'Local only' are the first things I check. I'm not sharing usage
data, whatever they promise. No thanks. Then I'll try my own kind of thing: a spreadsheet. The
running club list is closest to my contacts sheet."

## Step 2

Command: `--step --click "No thanks"`

Saw (02.png): the banner is gone; a quiet line "Usage data stays off. Change this in Settings >
Privacy". Reassuring.

Ruth: "Two ways in: 'Open project or file...' and 'New from data...'. My sheet isn't a project, it's
data, so 'New from data...' sounds right. Small hesitation -- I don't know what a 'project' is here."

## Step 3

Command: `--step --click "New from data..."`

Saw (03.png): a page "Open as a new graph". Left a "Tables" list with a +, right "Drop a file here, or
choose a file...". A "Direction" dropdown set to "As the file says". Load is greyed, "Choose a file
first".

Ruth: "OK, a place for tables -- that's how I think. I'll choose the file. 'Direction... as the file
says' -- my file doesn't say anything about direction; I'll leave it."

## Step 4

Command: `--step --click "choose a file..." --upload friends.csv`

Output: "a file chooser is open ... chose the file friends.csv".

Saw (04.png): "Edges: friends.csv, 41 rows" with a green check. Header "node (20) --friends (41)--> node".
"Each row is: a node / an edge" (edge selected), "CSV auto". Column mapping: source -> "From -> node",
target -> "To -> node", weight -> "Weight (whole number)". A preview table with line numbers (line 2 Ava
-> Ben 3 ...). Footer: "0 node rows and 41 edge rows read; the load makes 20 nodes and 41 edges."

Ruth: "This is exactly what I want to see before anything happens: 41 rows read, 41 ties made, 20
people. Nothing dropped. Line numbers match my spreadsheet. The arrow header is a bit cryptic
('--friends (41)-->') but the sentence at the bottom says it plainly. Load."

## Step 5

Command: `--step --click "Load"`

Saw (05.png): a drawing -- 20 blue balls joined by grey arrows on a light canvas. NO names on any ball.
Right panel "Graph, From friends.csv", Values tab, Overview: Nodes 20, Edges 41, Direction Directed,
Density 0.1079, Components 1, Edges per node 3 to 6, mean 4.1. Left: a find box "Find nodes, edges,
values", "Selection", "Everything", and at the bottom "Analyze (flask icon) in the toolbar (Shift+A)
to add results here". Bottom toolbar: flask, a chart icon, "3D", a magnifier.

Ruth: "Four clicks to a picture, that's quick. But it's a picture of balls -- who is who? I can't
show an editor anonymous dots. And 'Directed' -- knowing someone goes both ways, my file just has two
columns; I'd want to ask about that. 'Density 0.1079' means nothing to me. First, a name: Ava."

## Step 6

Command: `--step --click "Find nodes, edges, values" --type "Ava"`

Output: tool miss -- the box is not named by its placeholder text; typed nothing. (Tool naming, not
something Ruth would notice; 06.png unchanged.)

## Step 7

Command: `--step --click-at 176,90 --type "Ava"`

Output: "at 176,90: combobox Find".

Saw (07.png): the box says "Ava"; under it "Elements" with one hit, "Ava". The drawing is unchanged --
nothing lights up yet.

Ruth: "It found her. Let me click Ava and see where she is."

## Step 8

Command: `--step --click "Ava"`

Saw (08.png): the drawing moved; one ball has a yellow ring (Ava). Right panel now "Ava, Node",
Summary: id Ava, Degree 6 with a ">" arrow. Selection shows 1. Still no names on the balls.

Ruth: "There she is, ringed in yellow. Degree 6 -- six what? My sheet has her in three rows as the
first name... she must be in other rows too. The little arrow next to it might explain."

## Step 9

Command: `--step --click-at 1411,204`

Saw (09.png): right panel "Ava, Neighborhood -- Ava's 6 connections": Chloe 5, Ben 3, Dev 2, Ivan 1,
Sana 1, Theo 1 (Neighbor / weight). Seven balls ringed on the drawing; Selection says 7.

Ruth: "Now THAT I can check line by line: six names, with the numbers from my weight column. Degree 6
= six people she's tied to. Good, it answers 'how do I know'. Still no names on the drawing though.
Next, the thing I'd really use it for: who sits in the middle. The hint at the bottom says Analyze,
the flask. Let's try it."

## Step 10

Command: `--step --click-at 680,864`

Output: "at 680,864: button Analyze".

Saw (10.png): a list "Filter analyses", heading "Rank nodes and edges": Degree, Betweenness ("Which
nodes sit on the most shortest paths between others"), Edge betweenness, Closeness, PageRank (tagged
"Start here"), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order, Most flow... more below.

Ruth: "Lots of jargon names, but each has a plain line under it -- thank goodness. PageRank says
'Start here', but I know what I'm after: who sits in the middle of the chains. Betweenness says
exactly that. I'll ignore the 'Start here' badge."

## Step 11

Command: `--step --click "Betweenness"`

Saw (11.png): a small card "Betweenness -- Which nodes sit on the most shortest paths between others",
a closed "Advanced", "Under a second", and a blue Run button. My 7 people are still ringed.

Ruth: "It tells me how long it'll take -- nice. Does it run on everybody or only my 7 selected? It
doesn't say. I'll just run it and see."

## Step 12

Command: `--step --click "Run"`

Saw (12.png): all balls turned shades of orange/brown. A key top-left "Color: Betweenness 2.583 [orange
bar] 51.27". Left list gained "Betweenness 20" between Selection and Everything. My 7 yellow rings are
still on and muddy the colors.

Ruth: "It ran on all 20, good. But the shades are nearly the same orange to me; I can't tell who is
darkest, and still no names. 2.583 to 51.27 -- 51 of what? I need a ranked list with names. The new
'Betweenness 20' line on the left looks like a list -- let me open it."

## Step 13

Command: `--step --click "Betweenness"`

Saw (13.png): right panel now "Betweenness -- Measure from Betweenness, Oct 7", Style tab open:
Nodes/Edges, Fill: Color = Betweenn..., and +'s for Shape, Effects, Label, Tooltip. A "Values" tab
next to Style.

Ruth: "This is the styling of it, not the numbers. 'Label +' -- maybe that's how to put names on.
But first the numbers: Values."

## Step 14

Command: `--step --click "Values"`

Saw (14.png): Values: a strip of bars 2.583 to 51.27, "20 of 20 have a value, 2.583 to 51.27, median
11.2". "Top 10": Ava 51.27, Ivan 40.02, Sana 21.35, Kofi 18.31, Jada 16.1, Theo 15.71, Ravi 14.28,
Lena 13.37, Quinn 12.55, Hana 11.95. "Made with: Analysis Betweenness, Ran Oct 7, Advanced".

Ruth: "So Ava is the one most chains run through, then Ivan, well ahead of everyone else. That's a
real finding, with names. But what is 51.27? Paths? A percentage? If I can't say it to my editor I
can't print it. 'Advanced' under 'Made with' might say how it was counted."

## Step 15

Command: `--step --click "Advanced"`

Saw (15.png): Advanced opens to one box: "Sample size 0".

Ruth: "Sample size zero?! Did it sample nobody? That reads like it counted nothing. It doesn't tell
me what the number counts, whether it used my weights, or whether the arrows mattered. I'd have to
look up 'betweenness' elsewhere before I printed 51.27. The ranking I believe; the number I can't
explain. Now the thing I need for the editor: names on the picture. Back to Style, 'Label +'."

## Step 16

Command: `--step --click "Style"`

Saw (16.png): back to the Style tab of Betweenness (Fill/Color, Shape, Effects, Label +, Tooltip +).

Ruth: "Label, plus. I hope this means names. (Slight worry: I'm styling 'Betweenness', not the whole
graph -- will names only show up with this colouring? I'll try anyway.)"

## Step 17

Command: `--step --click-at 1419,298`

Output: "at 1419,298: button Add label line".

Saw (17.png): a "Label" chooser: "Find an attribute"; Attributes: id; Betweenness: Betweenness,
Betweenness rank, Betweenness percentile.

Ruth: "'id' -- not 'name'. But earlier Ava's card said 'id Ava', so id is the name. Pick id."

## Step 18

Command: `--step --click "id"`

Saw (18.png): names appear above the balls: Quinn, Ravi, Nora, Milo, Lena, Sana, Kofi, Theo, Jada,
Ivan, Ava, Hana, Gus, Ben, Chloe, Dev, Eli... Panel: "Aa Above -- Abc id", "20 labels, 1 hidden",
checkbox "Show all labels". Ava sits in the middle of the drawing, Ivan out to the right.

Ruth: "Finally -- people with names. Ava is literally in the middle with lines in every direction,
and Ivan is the bridge to the right-hand group. That matches the Top 10. One name is hidden (someone
behind Milo's top neighbour?), but it tells me so and offers 'Show all labels' -- fair. Last thing
before I decide: can I get this picture and a table out? Where is export? I'll try the menu at top
left."

## Step 19

Command: `--step --click-at 24,20`

Saw (19.png): main menu: Back to start, New project, Open project or file..., Open sample, Save,
Save as..., Save local copy..., Export... (Ctrl+E), Rename, Settings..., Keyboard shortcuts, Help.

Ruth: "Export, there it is. I just want to see what it offers -- picture and table."

## Step 20

Command: `--step --click "Export..."`

Saw (20.png): Export dialog. Left: Image, Data. Image: "A picture of the drawing, 2x, PNG", Preset "To
share -- PNG, 2x", View "Current view", sizes 1x/2x/4x/400x300, PNG/JPEG/WebP, background Canvas
color/Transparent, a preview thumbnail. Footer: "Saved to this computer only; nothing is uploaded."
Buttons Cancel, Copy, Export.

Ruth: "A picture for the editor, and again 'nothing is uploaded' -- good. The preview names are tiny
though; I'd want 4x. Now the table for the fact-checker: 'Data'."

## Step 21

Command: `--step --click "Data"`

Saw (21.png): Data: "The whole project: graph, styles, results and layout - Graphty JSON". Format
dropdown "Graphty JSON", and below it a box of code: {"kind":"graphty-document",... "nodes":[{"id":
"Ava"},...

Ruth: "Whoa -- that's computer code, not a table. My fact-checker won't open that. Maybe the Format
list has a spreadsheet option."

## Step 22

Command: `--step --click "Format"`

Saw (22.png): a long list of formats: Graphty JSON, Node-link JSON (NetworkX), Cytoscape.js JSON, JSON
Graph Format, graphology JSON, vis.js JSON, d3 JSON, OBO Graphs JSON, CSV, Gephi CSV, Neo4j CSV,
GraphML, GEXF, GML, DOT, Pajek NET, XGMML, CX2.

Ruth: "Eighteen formats and I know one word: CSV. Let me see whether CSV gives me the names with the
betweenness numbers in it."

## Step 23

Command: `--step --click "CSV"`

Saw (23.png): "One row per edge, with every edge attribute and computed value - CSV". Format CSV,
Table "Edges", Advanced. A big yellow box "CSV cannot hold everything": node column "position"
cannot be written, "style.color", "style.size", ... "7 graph attributes cannot be written", "the edge
table has no room for node attributes: 3 node columns ("results.betweenness.value", ...) are written
only by a second export with table: "nodes"". Preview: source,target,weight / Ava,Ben,3 ...

Ruth: "That yellow box scared me for a second -- 'cannot be written' sounds like data loss -- but most
of it is colours and positions I don't care about. The last line is the one that matters: the
betweenness numbers are only in the nodes table. It's written in programmer ('table: \"nodes\"'),
but I get it. Switch Table to Nodes."

## Step 24

Command: `--step --click "Table"`

Saw (24.png): Table options: Edges, Nodes, Adjacency List.

## Step 25

Command: `--step --click "Nodes"`

Saw (25.png): "One row per node, with every computed value - CSV". The yellow warning remains (now
only the colour/position/graph-attribute lines). Preview:
id,results.betweenness.value,results.betweenness.rank,results.betweenness.percentile /
Ava,51.273881673881675,1,1.0 / Ben,9.753968253968255,14,0.35 / Chloe,7.08333...,17,0.2 / ...

Ruth: "There's my fact-checker's table: every name with the number and its rank. The headers are ugly
('results.betweenness.value') and the numbers have fifteen decimals, but it opens in a spreadsheet
and she can check it row by row. That's enough for me to decide. I won't actually save anything --
I've seen what I came to see."

## End

Command: `--end`

Output: "session ended".

## Debrief (in character, Ruth)

**Did I finish?** Yes. I loaded my own kind of sheet (friends.csv), confirmed nothing was dropped,
found a person by name, saw her ties with the weights, ran one analysis (Betweenness) and read it
correctly -- Ava is the person most chains between others run through, Ivan a clear second -- put
names on the drawing, and saw that I can export both a picture and a spreadsheet of the numbers.
Steps to the first drawing: 4 (No thanks, New from data..., choose a file, Load).

**Verdict:** I would keep using it -- for the first pass on a story, to see who sits in the middle --
with reservations about explaining its numbers. What sold me: it said "never uploaded" and "Local
only" up front and again on export; the load screen told me 41 rows read, 20 people, 41 ties, with
line numbers I could match to my sheet; Ava's card turned "Degree 6" into six names with my weights;
the analysis list had a plain sentence under every jargon name.

**Ease: 5 out of 7.** Getting in and getting a picture was easy. Getting a picture an editor can use
and numbers I can stand behind took hunting.

**What confused me or slowed me down:**

1. The first drawing has no names at all. A reporter's first question is "who is that?". I had to
   find Label under the Style of an analysis result and pick "id" (not "name") to get them.
2. "Sample size 0" under Advanced on the betweenness result read as "it counted nobody". Nothing
   told me what 51.27 counts (paths? a share?), whether my weight column was used, or whether the
   arrows (it said "Directed", though knowing someone is mutual) changed the answer. I trust the
   ranking; I could not explain the number to my editor.
3. PageRank was badged "Start here" when the plain-language line for Betweenness was the one that
   matched my question. I ignored the badge, but a hurried user might not.
4. After Betweenness ran, everyone turned a similar orange; with my earlier selection's yellow rings
   still on, I could not tell darker from lighter. The Top 10 list was what actually answered me.
5. Export -> Data opened on a box of code (Graphty JSON). CSV was one of eighteen formats, defaulted
   to an edges table, and the betweenness numbers only appeared after I switched Table to Nodes. The
   yellow "CSV cannot hold everything" box looks like data loss at first glance and speaks
   programmer ('table: "nodes"'). Column headers like results.betweenness.value and fifteen decimals
   need tidying before a fact-checker sees them.
6. Small: the arrow header on the load screen ("node (20) --friends (41)--> node") was cryptic; the
   sentence under the table said it plainly.
7. Did not try: notes on a tie (my other must-have), or the shortest chain between two people.
