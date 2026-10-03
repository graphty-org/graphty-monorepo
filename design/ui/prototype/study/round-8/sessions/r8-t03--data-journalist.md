# Session: data journalist ("Ruth") -- import miserables.gexf and check nothing was dropped

Task as given by the moderator: "You have never used this program before. A colleague sent you a
network file of the characters in Les Miserables and the chapters they share; you saved it as
miserables.gexf in your Downloads folder. Bring it into the program and, before you do anything
else with it, check that all of it arrived: how many characters, how many connections, and that
nothing was dropped on the way in."

Start screen: shots/tasks/r8-t03/01.png. Renders: tmp/round-8-sessions/r8-t03--data-journalist/.
All commands were run from design/ui/prototype.

## Step 1 -- start screen (shots/tasks/r8-t03/01.png)

Think-aloud: "OK, a usage-data banner first. No thanks -- I don't want anything about my story
leaving this machine, and it says files are read here and never uploaded, good. There's a Les
Miserables sample on the right, but that's not my file; my colleague's file is what I have to
vouch for. 'Open project or file...' is the obvious one."

## Step 2 -- open the file picker (01.png)

    timeout 120 node app-b/study.mjs --try .../r8-t03--data-journalist/01.png task:r8-t03 --click "No thanks" --click "Open project or file..."

Sees a "Choose files" box on Downloads: miserables-edited.graphml, miserables.gexf, a
Patent citations .graphty, and a grayed-out chapter-notes.docx.

Think-aloud: "There's an 'edited' graphml too -- not the one I was sent. I want the .gexf, 22 KB."

## Step 3 -- choose miserables.gexf and Open (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open"

Sees "Open as a new graph": a strip saying "Makes Les Miserables: 77 nodes, 254 edges", a table
list on the left (nodes 77, edges 254, both with green checks), the first 8 node rows
(Myriel, Napoleon, ...), and at the bottom "Match report: nodes -- 77 rows; every id is unique."

Think-aloud: "Good, before it commits to anything it's showing me what it read. 77 characters.
'Nodes' and 'edges' -- I'd say characters and connections, but fine. 'Every id is unique' --
so no character got merged with another. That's the kind of line I can repeat to an editor.
Let me check the connections."

## Step 4 -- look at the edges table (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges"

Sees source / target / value columns, "Showing the first 8 of 254 rows", "Match report: edges --
254 rows; every edge has both ends." Top strip: "Weight: none (each edge counts 1)".

Think-aloud: "254 connections, and every one has both ends -- so none point at a character who
isn't there. That's what I'd worry about being dropped. But wait: there's a 'value' column with
8, 10, 6 in it -- that must be how many chapters they share -- and it says 'Weight: none, each
edge counts 1'. So it's ignoring the number of chapters? I didn't touch anything. I'll note that
and come back. What I don't see anywhere is a plain 'the file had 254, we kept 254, skipped 0'.
'254 rows' is what it read -- is that everything in the file, or everything it could read?"

## Step 5 -- Load (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load"

Sees "Reading miserables.gexf -- 77 nodes, 254 edges..." with a progress bar about half full and
Cancel. Right panel: "Summary -- Reading...". Left: "Reading the data...".

Think-aloud: "Same numbers again. Waiting."

## Step 6 -- try to see the summary while it reads (05.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Summary"

Clicking "Summary" only collapsed it; still "Reading...", progress bar unchanged.

Think-aloud: "It's still at half. Did it stall? I don't know what it's doing."

## Step 7 -- click the "from miserables.gexf" link (06.png)

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "from miserables.gexf"

Back on the table screen, now titled "Edit: miserables.gexf", with "Apply is off: Nothing has
changed yet". Same 77 rows / every id unique.

Think-aloud: "So that link goes back to the file. Reassuring that it's the same file, but I
wanted to see the finished thing, not edit it. Leaving."

## Step 8 -- click "Everything" in the left list (07.png)

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything"

Now the graph is drawn: orange dots, names on the big ones (Valjean, Javert, Marius...). A legend
says "Color: PageRank 0.00330 to 0.0754". Bottom tabs: Table, Nodes, Edges, Louvain. Right panel
"Everything -- Paints 77 nodes, 254 edges -- Covered by PageRank for Color on 77 of 77 nodes".
The left still says "Reading the data...".

Think-aloud: "Hold on. I told it to bring the file in and do nothing else. Why is it already
colored by PageRank, and what's 'Louvain'? Did the program run those, or were they in my
colleague's file? Either way, that's something I didn't ask for and can't explain yet. And it
still says 'Reading the data...' on the left while the picture is finished -- which is it?
At least 'Paints 77 nodes, 254 edges' matches."

## Step 9 -- the Data view (08.png)

    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything" --click "Data"

(The tool reported two controls named "Data" and clicked the left-rail one.) Left: Sources --
miserables.gexf, 77 nodes, 254 edges; nodes 77; edges "254 rows, one edge per row, Weight: value,
a higher value is a stronger tie". Attributes list label, group, betweenness, degree, value, and
under Results "Louvain" and "PageRank". Right Summary: Nodes 77; Edges "254 edges, each a
distinct pair"; Direction Undirected; Weight "value, stronger"; Density 0.0868; Connected
components 1; Average degree 6.60; Highest degree 36. Notes: "1 note -- Open in Notes".

Think-aloud: "This is the page I wanted. 77 characters, 254 connections, each a distinct pair --
so no duplicates collapsed -- and one connected piece, so nobody is floating off on their own
by accident. Numbers agree with the import screen and the loading box. Three places, same count.
But now the weight says 'value, a higher value is a stronger tie', and two screens ago it said
'Weight: none, each edge counts 1'. Which is it? I changed nothing. If I quote the strongest tie
in the story I need to know which one the program is using. And betweenness, PageRank, Louvain
are already there. I've never run anything."

## Step 10 -- open the note (09.png)

    timeout 120 node app-b/study.mjs --try .../09.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything" --click "Data" --click "Open in Notes"

Notes panel: "About this graph . 1 of 7 notes -- Co-appearances counted per chapter, from Knuth's
list. -- the whole graph -- Sep 28, 2026, 10:14".

Think-aloud: "Seven notes, dated Sep 28 -- before I opened anything today. Either my colleague's
file carried notes and results with it, or I've just opened that built-in sample and not my file.
The header keeps saying 'from miserables.gexf', so I'll believe it's mine, but nothing told me
'this file also brought in 7 notes and 3 computed columns'. That would be the first thing I'd
want in an import report."

Stopping here.

## Wrap-up

Did I succeed? Mostly. I can say: 77 characters, 254 connections, every character id unique,
every connection has both ends, each connection a distinct pair, one connected piece. The same
77 and 254 showed up on the import preview, the loading box and the summary. What I could not
get is a plain sentence that the file held exactly this many and none were skipped -- the reports
say what was read, not what was in the file versus what was kept. And two things undercut my
confidence: the weight is "none" on the import screen and "value" on the summary, and the graph
arrived already carrying PageRank, Louvain, betweenness and seven old notes that nothing explained.

Single Ease Question: 4 of 7. Finding the counts was easy; trusting them took detective work, and
the load box sat at half-full with "Reading the data..." even after the graph was up.

Would I use this instead of my current tool? Not yet, but I'm closer than with Gephi. The
before-you-load table with "every id is unique" and "every edge has both ends" is exactly what a
fact-checker wants, and "files are never uploaded" matters for unpublished names. I'd switch if
the import ended with one line saying "file had X nodes and Y edges; loaded X and Y; skipped 0",
if the weight said the same thing everywhere, and if it told me what came in with the file
(results, notes) instead of letting me discover them.
