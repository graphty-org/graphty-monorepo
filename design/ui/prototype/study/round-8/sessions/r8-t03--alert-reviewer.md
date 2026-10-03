# Session: bring in miserables.gexf and check it all arrived -- Nadia (level-1 alert reviewer)

Task as given: "You have never used this program before. A colleague sent you a network file of
the characters in Les Miserables and the chapters they share; you saved it as miserables.gexf in
your Downloads folder. Bring it into the program and, before you do anything else with it, check
that all of it arrived: how many characters, how many connections, and that nothing was dropped on
the way in."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t03--alert-reviewer/. Every --try replays from the start screen.

## Step 1 -- the start screen (shots/tasks/r8-t03/01.png)

"OK, a start page. There's a big cookie-style banner at the bottom asking to share usage data.
Bank laptop, I'm saying no to that on reflex. Top left: 'Open project or file...'. That's the one.
There's also a 'Les Miserables 77 characters' sample on the right -- I'm not clicking that, my
colleague sent me a file, I want HIS file, not their demo. If I compared against the sample I'd
be checking their copy, not mine."

## Step 2 -- open the file picker (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t03 --click "No thanks" --click "Open project or file..."

"A 'Choose files' box, Downloads. miserables-edited.graphml, miserables.gexf, a patent thing,
and a greyed-out docx. Two miserables files -- careful, I want the .gexf, 22 KB, Sep 27. Not the
'edited' one."

## Step 3 -- pick it and open (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open"

"It didn't just dump it in, it shows me what it's about to make: 'Les Miserables: 77 nodes, 254
edges'. On the left: nodes 77 with a green tick, edges 254 with a green tick. The table shows id,
label, group. Myriel, Napoleon... At the bottom: 'Match report: nodes -- 77 rows; every id is
unique.' Good, that's the kind of line I'd copy into an alert file. 'Nodes' is characters, I
assume. Let me check the other table."

## Step 4 -- the edges table (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges"

"'254 rows; every edge has both ends.' So no connection points at a character that isn't there.
That's my 'nothing dropped' check, I think. Though it says 254 ROWS -- does that mean 254 edges
made it in, or 254 rows were in the file? Same number in 'Makes ... 254 edges' at the top, so I'll
take it as the same.

One thing bugs me: up top it says 'Weight: none (each edge counts 1)' but there's a column right
there called 'value' with 8, 10, 6 in it. Is it ignoring that? For me that would be like dropping
the amount off a transfer. I'd want to know. I don't know what to click to change it, and the task
says don't do anything else, so I leave it. Direction says 'As the file says'. Fine. Load."

## Step 5 -- Load (05.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load"

"'Reading miserables.gexf -- 77 nodes, 254 edges...' with a progress bar about two-thirds.
Summary on the right says 'Reading...'. I'll wait."

## Step 6 -- still waiting (06.png)

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Summary"

"I clicked 'Summary' and it just collapsed. Still 'Reading...'. Bar hasn't moved. For a 22 KB file?
Our case system is slow but not this slow."

## Step 7 -- try the file link (07.png)

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "from miserables.gexf"

"Clicked 'from miserables.gexf' on the right. Now it says 'Edit: miserables.gexf' -- same tables,
77 and 254, 'every id is unique'. So it remembers what it read. But 'Edit'? I don't want to edit
anything. Get me out."

## Step 8 -- Escape back (08.png)

    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "from miserables.gexf" --key Escape

"'Edit canceled: nothing changed'. Good, I didn't break it. But the spinner is STILL there,
'Reading the data...' in the left list too. Is it stuck? If this were a real alert I'd be back in
the case system by now."

## Step 9 -- click 'Everything' (09.png)

    timeout 120 node app-b/study.mjs --try .../09.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything"

"Oh -- now there's a picture. Valjean in the middle, everyone orange. Right side: 'Paints 77
nodes, 254 edges'. Counts match. But wait. 'Color: PageRank' up top, 'Covered by PageRank', and a
'Louvain' thing at the bottom bar. I didn't run anything. The task said before I do anything else.
Did it do something to my data on its own? Did I somehow open the sample? And 'Reading the data...'
is still sitting in the left list even though the graph is drawn. I don't trust that."

## Step 10 -- the Data side (10.png)

    timeout 120 node app-b/study.mjs --try .../10.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything" --click "Data"

(The tool reported "Data" matched two controls and clicked the left-rail one.)

"This is the screen I wanted. Left: 'miserables.gexf -- 77 nodes, 254 edges', 'edges . 254 rows,
one edge per row'. Right, Summary: Nodes 77, Edges '254 edges, each a distinct pair', Undirected,
Connected components 1. So 254 rows in, 254 edges out, one row each -- nothing merged, nothing
dropped. That's my answer: 77 characters, 254 connections.

But now it says 'Weight: value, a higher value is a stronger tie.' Before I pressed Load it said
'Weight: none (each edge counts 1)'. Which is it? I didn't change anything. And under Results:
Louvain, PageRank, plus betweenness and degree, and '1 note'. A fresh file from a colleague
shouldn't come with a note and two results I never asked for. Either the file had them in it --
which nobody told me -- or this is the sample. If QA asked me 'is this the colleague's file
untouched', I couldn't say yes with a straight face.

I'm stopping. I have the numbers."

## Wrap-up

**Did I succeed?** Mostly. I'm fairly sure it's 77 characters and 254 connections, and the lines
'every id is unique' and 'every edge has both ends' plus '254 rows, one edge per row' tell me
nothing was dropped. What I am NOT sure of: whether the weight is being used or not (the screen
said both), and why PageRank, Louvain and a note were there when I'd done nothing.

**Single Ease Question:** 4 of 7. Opening it and seeing the counts before loading was easy -- that
preview is good. Then the loading box never went away, I had to click around to find the graph,
and the finished screen showed me things I didn't do.

**Would I use this instead of my current tool?** I don't have a graph tool; I'd do this check in a
spreadsheet by counting rows. This was quicker than that for the counts, and the 'every edge has
both ends' line is something a spreadsheet won't tell me. But I would not put it in an alert file
yet: a check whose screen says 'weight none' and then 'weight value', and that adds results on its
own, is a check QA would pick apart. I'd want one line I can copy: 'file had X rows, Y loaded, Z
dropped, and here's why.'

## Problems seen

1. After Load, the "Reading miserables.gexf" box and "Reading the data..." never cleared on their
   own; the graph only appeared after clicking "Everything" in the left list (05, 06, 08, 09).
   "Reading the data..." stayed in the left list even with the graph drawn.
2. Weight reads "none (each edge counts 1)" on the import screen but "value, a higher value is a
   stronger tie" in the loaded summary, with no change made in between (04 vs 10).
3. A freshly imported file shows PageRank coloring, a Louvain result, betweenness and degree
   columns, and "1 note" that the reader never created (09, 10). Looks like the sample, not the
   file; undermines "check nothing changed".
4. No explicit "dropped: 0" line. "Nothing dropped" has to be inferred from "254 rows" matching
   "254 edges" and "every edge has both ends".
5. The file link on the loaded graph ("from miserables.gexf") opens a screen titled "Edit:" --
   alarming for someone who only wants to look.
6. The word "nodes" is used everywhere; nothing says "characters". Fine for this file, but she had
   to assume nodes = characters.
