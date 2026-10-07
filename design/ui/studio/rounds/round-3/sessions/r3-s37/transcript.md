# Session r3-s37: Tom, task T6 (Les Miserables) -- "What did I get?"

Participant: Tom, 52, lab manager of a cell biology lab. Not a network builder; opens what the
postdoc sends. Reading glasses, trackpad, small grey text is hard for him.

Task in his words: get the Les Miserables sample on screen; find how many characters, how many
connections, whether everyone can reach everyone, and what facts are recorded about each
character and each connection.

All commands run from design/ui/studio with S=rounds/round-3/sessions/r3-s37.

## Step 1 -- start

    node tool/real.mjs --start $S empty   -> 01.png

Seen: a dark start page. "Start" (Open project or file, New from data), "Recent projects" (empty),
and "Samples" on the right: Les Miserables "77 characters", Zachary's karate club, College football,
Florentine families. A box at the bottom asks to share usage data.

Tom: "Good, it's right there. 77 characters -- that answers one question already, I think. The
usage-data box first: I'm the one who answers for where lab data goes, so No thanks."

## Step 2 -- decline usage data, open the sample

    node tool/real.mjs --step $S --click "No thanks" --click "Les Miserables"   -> 02.png

Seen: the network drawn in blue balls on a light canvas. Right panel "Graph / From Les Miserables",
tabs Style and Values (Values is on), "Overview": Nodes 77, Edges 254, a line "Undirected, from the
file: directed 0", Density 0.08681, Components 1, "Edges per ..." (cut off) "1 to 36, mean 6.597".
Left panel: Graph, a search box, "Selection", "Everything". Left rail has a "Data" icon.

Tom: "So 77 nodes -- the characters -- and 254 edges, the connections. 'Components 1': I'm fairly
sure that means it's all one piece, so everyone can be reached. I'd want to be sure of that before
I said it in lab meeting. The 'directed 0' line I don't understand -- zero what? It runs off the
edge of the panel. Now what's recorded about each character. 'Data' on the left looks like a table.
I'll try that."
Hesitation: "Components" is a word he half-knows; "Undirected, from the file: directed 0" reads as
a puzzle and is clipped at the right edge; "Edges per ..." is truncated.

## Step 3 -- the Data tab

    node tool/real.mjs --step $S --click "Data"   -> 03.png

Seen: left panel now "Les Miserables": Sources -- "Les Mis... 77 nodes, 254 edges", "Node t... 77
rows, 77 nodes", "Ed... 254 rows, 254 edges" (names cut off). Attributes -- Nodes: id, name.
Edges: shared_chapters (with a # icon).

Tom: "That's the list I wanted. Each character has an id and a name; each connection has
'shared_chapters', a number by the look of the # sign -- the chapters two characters share, as the
start page said. And the counts agree: 77 and 254. Before I trust 'Components 1' I want the program
to tell me what it means. I'll rest the pointer on it."
Hesitation: the source names are truncated ("Node t...", "Ed...") so he guesses they are a node
table and an edge table.

## Step 4 -- hover "Components"

    node tool/real.mjs --step $S --hover "Components"   -> 04.png
    (tool: ambiguous, took the group "Components 1"; tooltip: null)

Seen: nothing changed; no explanation appeared.

Tom: "No help there. I'll go with 'one component means one connected piece'. Let me click one of
the balls and see what it actually holds -- the one at the bottom with all the spokes."
Hesitation: no definition of "Components" anywhere he could find.

## Step 5 -- click a character

    node tool/real.mjs --step $S --click-at 632,676   -> 05.png  (tool: node "Myriel")

Seen: the ball turned yellow-ringed. Right panel: "Myriel", "Node", Summary: id Myriel, name Myriel,
Degree 10 with a little arrow.

Tom: "Myriel -- the bishop. So a character carries its id and its name, which here are the same
word, and the program adds 'Degree 10', which I take to be his ten connections. Now a connection.
I'll try to click one of the thin lines, the one from Myriel up to the lone ball on the left."

## Step 6 -- try to click a line

    node tool/real.mjs --step $S --click-at 575,660   -> 06.png  (tool: empty canvas)

Seen: Myriel was deselected and the panel went back to the whole-graph Overview. No connection got
picked.

Tom: "Missed it, or lines can't be clicked -- they're hairline thin and I can barely see them
anyway. I'll come at it from the other side: the 'Ed...' line under Sources says 254 rows. That
must be the table of connections. I'll click it."
Hesitation: lines are too thin to aim at; no feedback whether lines are clickable at all.

## Step 7 -- open the connections table

    node tool/real.mjs --step $S --click-at 148,200   -> 07.png  (tool: treeitem "Edge table")

Seen: a table opened under the drawing: tabs Nodes / Edges (on), "254 edges", "In the order loaded",
"Columns: 3 of 3". Columns From, To, shared_chapters: Napoleon - Myriel 1, MlleBapt... - Myriel 8,
MmeMa... - Myriel 10, MmeMa... - MlleBaptis... 6. A tooltip "Edge table" on the source row.

Tom: "Now that's a spreadsheet I understand. Each connection is two characters plus how many
chapters they share. 'Columns: 3 of 3' -- so that's all there is; nothing hidden. Names are chopped
off ('MlleBapt...') but I can live with that. Let me look at the Nodes tab of the same table to be
sure the characters really only have id and name."

## Step 8 -- the Nodes tab of the table

    node tool/real.mjs --step $S --click-at 330,681   -> 08.png  (tool: tab "Nodes")

Seen: "77 nodes", "Columns: 2 of 2", columns Id and name: Napoleon/Napoleon, Myriel/Myriel,
MlleBapt.../Mlle Baptistine, MmeMa.../Mme Magloire.

Tom: "Right: the id is a short tag and the name is the proper spelled-out name. Two facts per
character, three per connection counting the two ends. One thing still nags me -- that line
'Undirected, from the file: directed 0'. I'll rest the pointer on it once; if nothing, I'll stop."

## Step 9 -- hover the "directed 0" line

    node tool/real.mjs --step $S --hover-at 1330,236   -> 09.png
    (tool: group "Direction Undirected, from the file: directed 0"; tooltip: null)

Seen: no change, no tooltip. The row's own label ("Direction", per the tool) is not visible on
screen; the value text has pushed it out and still runs off the panel's right edge.

Tom: "Nothing. I'll read it as 'the connections have no direction', and ignore the 'directed 0'.
I have what I came for. Stopping."

## End

    node tool/real.mjs --end $S

## Debrief (in character)

**Did I finish?** Yes.
- Characters: 77 (start page said "77 characters"; Overview says Nodes 77; table says 77 nodes).
- Connections: 254 (Overview Edges 254; edge table 254 rows).
- Can everyone reach everyone: yes, I believe so -- "Components 1". I am fairly but not fully sure
  of that word; nothing on screen explained it, and I would want the postdoc to confirm before I
  said it to the PI.
- Facts per character: id and name (Columns: 2 of 2). The program also shows a Degree when I click
  one (Myriel: 10), which I take to be counted by the program, not stored in the file.
- Facts per connection: which two characters (From, To) and shared_chapters, a number
  (Columns: 3 of 3).

**Rating:** 6 out of 7 (easy). The sample was one click away and the counts were on screen at once.
The Data tab and its table were plain and familiar, like a spreadsheet.

**What confused me:**
- "Components 1" -- no explanation when I pointed at it. This was the one question I could not
  answer with full confidence.
- "Undirected, from the file: directed 0" -- I do not know what "directed 0" means, its label is
  not visible, and the text runs off the right edge of the panel. No tooltip.
- "Edges per ..." is cut off, so I could not tell what "1 to 36, mean 6.597" is about.
- Source names cut to "Node t..." and "Ed..." in the left panel; I had to guess, and only the
  tooltip confirmed "Edge table".
- Clicking a line did nothing (or I missed it -- they are hairline thin); a click on the canvas
  also dropped my selected character without warning.
- Small grey text throughout (the "In the order loaded" and "254 edges" captions) is hard on my
  eyes.
