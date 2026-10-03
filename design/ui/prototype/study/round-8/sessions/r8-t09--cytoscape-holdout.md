# Session: size the Les Miserables characters by how much the network depends on them

Participant: Renata, the Cytoscape holdout (staff scientist, daily Cytoscape user, workshop teacher).

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Make the drawing show which characters the network depends on most: the more it depends on
a character, the bigger that character's dot. Leave the colors as they are."

Outcome: gave up. The drawing never changed size.

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t09--cytoscape-holdout/. Every command below is prefixed with
`timeout 120 node app-b/study.mjs --try <render> task:r8-t09`.

## Steps and think-aloud

**01 (start screen, shots/tasks/r8-t09/01.png).** "Start, Recent, Samples. A consent banner at
the bottom -- no, I don't share usage data. Les Miserables is right there, 77 characters."

**02** `--click "No thanks" --click "Les Miserables"`
"It opened into somebody's finished workspace, not a clean network. Left side is a stack of rows:
PageRank, Louvain, Shortest paths, a folder 'For the report'. PageRank is selected and its panel
says Fill Color, orange to brown, painting 77 nodes. So these rows are Styles -- or mappings? A
row is both a computation and a mapping, apparently. 'Depends on most' is betweenness to me: the
bottleneck characters. There's a Betweenness row in the folder with a crossed-out eye."

**03** `... --click "Betweenness"`
"Betweenness is a Fill mapping, yellow to orange, hidden ('Paints 77 nodes, none visible'), and
PageRank covers it for Color on 77 of 77. Good, that's actually clear -- if I turn it on, the
colors stay PageRank's. So I just need to add Size to this one. In Cytoscape Size is its own
property. Here I see Fill, Shape, Effects, Label, Tooltip."

**04** `... --click "Shape"`
"Clicking the word Shape did nothing."

**05** `... --hover "Add Shape"` -> "nothing on screen is called 'Add Shape'".

**06** `... --click "Size"`
"I tried to click Size directly. Something got clicked and I got a toast: 'Selection cleared
(Betweenness)', and the right panel jumped to the graph summary. I didn't ask to clear anything."

**07** `... --hover "Add"` -> the plus is "Add to Shape".

**08** `... --click "Add to Shape"`
"A small menu: Shape, Size. So Size lives under Shape. Not where I'd look, but OK."

**09** `... --click "Add to Shape" --click "Size"`
"Size: 1. That's a constant -- a bypass, in my words. I need a continuous mapping. There's a
little cylinder icon next to it, probably 'from a column'."

**10-15** Hovering the cylinder under guessed names: "Use data", "Map", "column", "data",
"From a column", "Bind to data", "Link to data", "Size from data", "Use a column", "Map to data",
"Vary", "Bind", "value", "measure", "Set from", "Scale", "Calculate", "per node", "Connect" --
none of them was the icon ("column" landed on the Columns counter in the bottom bar, "data" on the
Data tab). "attribute" and "Size by" finally found it: **"Size by attribute"**.
"Attribute. In Cytoscape it's a column, and in this app's own bottom bar it's 'Columns'. Two words
for one thing."

**16** `... --click "Size by attribute"`
"Now that's a column picker. nodes: # betweenness, # degree, 'Not a number (2)'; Results:
# PageRank; Notes: # Note count. Typed, and it tells me which columns aren't numeric. Good. Odd
that PageRank is a 'Result' while betweenness is a plain node column."

**17** `... --click "betweenness"`
"'Size by betweenness': Linear, sizes 0.5 to 3 px, values from 'Fit to data', clamp on, smallest
mark 2 px, print 1 pt. That's a continuous mapping I can read. Fine. But this row is hidden, so
nothing will change on the canvas until I turn it on."

**18** `... --click "betweenness" --key Escape --hover "Show"` -> "Show Betweenness".

**19** `... --key Escape --click "Show Betweenness"`
"Eye is open. But every dot is still the same size, the Size box still says 1, and the panel still
says 'none visible'. Did Escape throw away my mapping?"

**20** `... --click "betweenness" --click "Show Betweenness"` -> could not click; the popup was in
the way.

**21** `... --click "betweenness" --click "Close"`
"Closed it with the X instead. Size still says 1. Nothing anywhere says Size is mapped to
betweenness."

**22** `... --click "Close" --click "Show Betweenness" --click "Size by attribute"`
"I reopened the mapping and it says 'Pick an attribute'. It forgot. I built a mapping, closed the
dialog, and it's gone, with no message. That's the thing I don't forgive in a style editor."

**23** `--click "No thanks" --click "Les Miserables" --click "Analyze"`
"One more route. The flask in the bottom bar is Analyze. Recent: Louvain, PageRank, Shortest
path. Rank nodes and edges: PageRank ('Start here'), Degree, Total value, Betweenness ('Which
nodes sit on the most shortest paths between others'), Closeness, Eigenvector. PageRank is
influence, not dependence. Betweenness."

**24** `... --click "Which nodes sit on the most shortest paths"`
"This is good. Weight: value (loaded weight), Higher means: Stronger / Farther / Capacity, with a
line for each. 'All 254 edges have value set; none is left out.' 'Betweenness reads a weight as
distance: it uses 1/value.' That's my methods paragraph, written for me. Under a second, Run."

**25** `... --click "Run"`
"A new row at the top, 'Betweenness 2', with a progress bar. Now there are two Betweenness rows."

**26** `... --click "Run" --click "Betweenness 2"`
"Still spinning, after it promised under a second. Selecting it shows me the graph summary, not
the result. No sizes changed. I don't see where I'd say 'size by this' from here either. I'm
done."

## Verdict

**Did I succeed?** No. I never got a single dot to change size. The colors are untouched, but only
because nothing I did took effect.

**Single Ease Question (1 = very difficult, 7 = very easy):** 2.

**Would I use this instead of Cytoscape?** No. Some of it is better than what I have: the Analyze
dialog states how the weight is read and that no edge was left out, and the Betweenness panel told
me straight away that PageRank covers it for Color. That's more honest than Cytoscape ever is.
But the core of my job is a column-to-property mapping that sticks, and here the mapping I built
vanished when I closed the dialog, with no message. Size is hidden under Shape, the control that
makes it data-driven is an unlabeled cylinder called "attribute" while the rest of the app says
"Columns", and running betweenness gave me a second "Betweenness" row next to the hidden one
instead of telling me one already existed. Client work stays in Cytoscape.
