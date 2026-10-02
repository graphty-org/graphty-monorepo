# Session: t01, Explorer Elena

Task as given: "A colleague handed you this network and you are about to build on it. Before you
trust anything in it, work out what you actually have: how many characters and connections,
whether it all hangs together as one piece, and whether anything about how it came in looks
wrong."

All commands run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t01--explorer-elena/.

## Start screen (shots/tasks/t01/01.png)

"OK, a picture of dots and lines, orange. There's a legend box about PageRank and Degree -- I
don't know what PageRank is for people in a book, so I'm ignoring that. The left side is a long
list: Selection, Notes, PageRank, Louvain, Shortest paths, Watchlist, 'For the report'... that's a
lot of somebody else's stuff. My colleague clearly did things to this already. That's exactly why
I want to see the raw numbers first. Nothing here says 'how many'. The left rail has Graph, Data,
Views, Notes, Assistant. 'Data' is the word I'd look for."

## Step 1 -- Data

    timeout 120 node app-b/study.mjs --try .../01.png task:t01 --click "Data"

"Oh nice, that's the thing. The right side now says Summary: Nodes 77, Edges 254, Undirected,
Connected components 1. And on the left the file: miserables.gexf, 77 nodes, 254 edges. The two
agree, good. 'Nodes' and 'edges' -- I'd say dots and lines, but fine, I know what they mean from
context. 'Connected components 1' -- I'm guessing that means it's all one piece. Nobody's off on an
island. The little chart says '0 degree 0', which I think means zero dots with no lines? It took me
a second; it reads like a typo.

There's 'Weight: value, stronger'. Hmm. So the lines have a strength. And '4 more readings not
computed' -- I'll come back to that. Density 0.0868, I have no idea if that is high or low."

## Step 2 -- look at the file that came in

    timeout 120 node app-b/study.mjs --try .../02.png task:t01 --click "Data" --click "miserables.gexf"

"Whoa, it says 'Edit: miserables.gexf'. I just wanted to look, not edit. There's an Apply button,
greyed out, and 'Apply is off: Nothing has changed yet', so at least I haven't broken anything.
It's a table: id, label, group. Myriel, Napoleon, Mlle.Baptistine... Down the bottom: 'Match report:
nodes. 77 rows; every id is unique.' That's actually what I wanted -- no duplicate people. I like
that it says it in a sentence.

The 'group' column is marked as text (Abc) but it's all numbers. Probably doesn't matter."

    timeout 120 node app-b/study.mjs --try .../03.png task:t01 --click "Data" --click "miserables.gexf" --click "edges"

"Edges table: source, target, value. Match report: '254 rows; every edge has both ends.' Good, no
lines pointing at nobody. But wait -- at the top it says 'Weight: none (each edge counts 1)'. The
summary on the other screen said 'Weight: value, stronger'. And the value column clearly has 1, 8,
10, 6 in it. So which is it? Is the strength being used or not? That's exactly the kind of thing
that makes me not trust a tool -- two screens telling me different things about the same data. If I
were reporting this, I'd flag it: 'the weights might not have come in'."

## Step 3 -- try to clear up the weight thing

    timeout 120 node app-b/study.mjs --try .../05.png task:t01 --click "Data" --click "value, stronger"

"Clicking 'value, stronger' just dropped me into the same edit-the-file screen, on the nodes table,
not even the edges one. It didn't explain anything. So I still don't know which screen is right."

## Step 4 -- the '4 more readings'

    timeout 120 node app-b/study.mjs --try .../04.png task:t01 --click "Data" --click "4 more readings not computed"

"Huh. That opened a menu full of things -- Select all visible, Re-run layout, Reshuffle layout
seed, Add node, Clear graph data. And the left rail jumped back to 'Graph'. That's scary, 'Clear
graph data' is right there. I see 'Compute the overview'; I guess that's what it wants."

    timeout 120 node app-b/study.mjs --try .../06.png task:t01 --click "Data" --click "4 more readings not computed" --click "Compute the overview"

"OK, four more lines appeared: Average clustering 0.573, Transitivity 0.499, Diameter 5, Degree
assortativity -0.165. I don't know those words except 'diameter', and I'm guessing that's the
longest trip from one character to another, 5 steps. Fine, it didn't hurt anything. But I'd rather
the link had just computed them than opened a big menu."

## Step 5 -- confirm 'one piece'

    timeout 120 node app-b/study.mjs --try .../07.png task:t01 --click "Data" --click "Connected components"

"Clicking the '1' opened a table under the picture: 77 nodes, all highlighted, Valjean at the top
with 36 connections. And there's a helpful line, 'Valjean is first on all three measures'. So yes,
the one piece is all 77. That's convincing enough for me."

## Where I stopped

"I think I have what I was asked for:
- 77 characters, 254 connections (the file screen and the summary agree).
- It's all one piece: 1 connected component, and no character with zero connections.
- Every id is unique and every connection has both ends, so nothing got dropped or doubled.
- The one thing that looks wrong: the import screen says the connections have no weight ('each
  edge counts 1') while the summary says they're weighted by 'value'. The file does have a value
  column. I can't tell from the app which one is true, and that bothers me.

Also, my colleague has a lot of layers on here already (PageRank coloring, Louvain groups, one
hidden row that 'still paints') -- I'd want to know what that means before I build anything, but
that wasn't the question."

## Verdict

- Succeeded? Mostly yes. I got counts, the one-piece answer and the import checks. I found a
  weight contradiction but couldn't resolve it.
- Single Ease Question: 5 of 7. Finding the numbers was easy once I clicked Data; the 'Edit'
  screen, the menu that popped up for '4 more readings', and the weight disagreement cost me.
- Would I use this instead of my current tool? For this kind of check, probably yes over a
  spreadsheet -- I'd have to build a pivot table to get 'every id is unique' and 'every edge has
  both ends', and here it's one sentence. But I wouldn't hand a number to my boss until someone
  tells me which weight answer is right.
