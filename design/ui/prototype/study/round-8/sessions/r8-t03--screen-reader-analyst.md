# Session: import miserables.gexf and check nothing was dropped -- Morgan Reyes (screen-reader analyst)

Task as given by the moderator: "You have never used this program before. A colleague sent you a
network file of the characters in Les Miserables and the chapters they share; you saved it as
miserables.gexf in your Downloads folder. Bring it into the program and, before you do anything
else with it, check that all of it arrived: how many characters, how many connections, and that
nothing was dropped on the way in."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t03--screen-reader-analyst/.

## 01 -- the start screen (shots/tasks/r8-t03/01.png)

Think-aloud: Title says graphty. Headings, if they are headings: "Start", "Recent projects",
"Samples". Good, the parts are named. First thing I listen for is where my file goes: "Files are
read on this computer and never uploaded", and "Local only" at the top. Fine, I'll take it at its
word for now. There is a usage-data banner at the bottom, "Your data is yours, but please help
us." I say no to that by reflex. Under Start: "Open project or file..." with Ctrl+O. That is the
one. I am not touching the Les Miserables sample -- my colleague's file is the point, and I want
to know the file arrived, not the program's copy of it.

## 02 -- dismiss the banner, open the file picker

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--screen-reader-analyst/02.png task:r8-t03 --click "No thanks" --click "Open project or file..."

Think-aloud: A dialog, "Choose files", in Downloads. Four files: miserables-edited.graphml,
miserables.gexf (22 KB, Sep 27), Patent citations 1999-2001.graphty, and chapter-notes.docx which
is grayed out -- presumably not something it can open. Two miserables files with near-identical
names; I would have to listen carefully to the extension at my speed. I want the .gexf. Checkboxes
on each row, so it takes several files at once. Open is disabled until I pick one, which is fine
as long as it says why.

## 03 -- pick miserables.gexf, Open

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--screen-reader-analyst/03.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open"

Think-aloud: It didn't just load it; it put me in a preview, "Open as a new graph, Esc to leave".
I like that for this job -- I get to check before I commit. The line at the top: "Makes Les
Miserables: 77 nodes, 254 edges." That is the summary first, which is what I ask every tool for.
On the left: a tree, miserables.gexf, then "nodes 77" and "edges 254", each with a check mark --
I hope the check mark has a text name, because a green tick read as "graphic" tells me nothing.
The table shows id, label, group; "Showing the first 8 of 77 rows". At the bottom, "Match report:
nodes -- 77 rows; every id is unique." So no duplicate characters under two ids. Good, that is
one of my standard checks done for me, and in words.

Note: it calls them nodes. The moderator said characters. Fine, I know the word.

## 04 -- look at the edges table

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--screen-reader-analyst/04.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges"

Think-aloud: Edges: source, target, value. "Match report: edges -- 254 rows; every edge has both
ends." So no edge points at a character that is not in the node table. That is the dangling-edge
check I would otherwise do in pandas. Two things bother me:

- The header line says "Weight: none (each edge counts 1)", and yet there is a column called
  value with numbers in it -- 1, 8, 10, 6. In this dataset value is the number of chapters two
  characters share. If the tool is about to throw that away as a weight, I want to know, and I do
  not see how to change it from here.
- "254 rows" is what the tool read. It does not say "the file has 254 edges and 254 were kept, 0
  skipped". I am inferring "nothing dropped" from "every edge has both ends". It is a reasonable
  inference, but the task is literally "did anything get dropped" and nothing says "dropped: 0".

Direction at the bottom says "As the file says". Fine, I'll see what it says after.

## 05 -- Load

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--screen-reader-analyst/05.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load"

Think-aloud: A progress box, "Reading miserables.gexf, 77 nodes, 254 edges...", with Cancel. The
right side has "Co-appearances, Graph, from miserables.gexf", a Summary section that says
"Reading...". Left side says "Reading the data...". For 22 KB this should be instant. I wait.
Nothing tells me when it finishes; I want to hear "loaded" once.

## 06 -- try the Summary heading

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--screen-reader-analyst/06.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Summary"

Think-aloud: That collapsed the Summary section; it is a disclosure, not a thing that refreshes.
Still "Reading...". Same dialog. One dead end. If the next thing does nothing I start looking for
the exit.

## 07 -- try "Everything" in the left list

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--screen-reader-analyst/07.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything"

Think-aloud: Now the graph is there, and on the right "Everything, built-in row: Paints 77 nodes,
254 edges." So the counts held through the load. But: "Covered by PageRank for Color on 77 of 77
nodes", and a legend "Color: PageRank 0.00330 to 0.0754", and at the bottom a tab called Louvain.
I did not run PageRank. I did not run Louvain. I opened a file and asked for nothing. Either my
colleague's file carries those, or the program ran them on its own, or -- and this is what I
actually suspect -- I am looking at the program's built-in Les Miserables sample and not my file.
Nothing on screen tells me which. And the left list still says "Reading the data..." while
everything else says it is done. Two parts of the screen disagree about whether it is loaded.

## 08 -- the Data view

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--screen-reader-analyst/08.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything" --click "Data"

Tool output: ambiguous: "Data" matches 2 controls (button "Data", tab "Data"); clicked the first

Think-aloud: There are two things called "Data" -- a button on the far left and a tab on the
right. My screen reader would say "Data button" and "Data tab" and I have no way to know which is
which without trying both. I got the button. It happened to give me both, as it turns out: the
left shows Sources, and the right switched to Data too.

What I can now read:

- Sources: miserables.gexf, "77 nodes, 254 edges". nodes: "77 nodes". edges: "254 rows, one edge
  per row. Weight: value, a higher value is a stronger tie."
- Summary on the right: Nodes 77. Edges "254 edges, each a distinct pair". Direction Undirected.
  Weight "value, stronger". Density 0.0868. Connected components 1. Average degree 6.60. Highest
  degree 36. "4 more readings not computed".
- A degree-distribution chart with a text caption. Thank you for the caption.

That is the answer to the task: 77 characters, 254 connections, each connection a distinct pair
(so no duplicates collapsed into one), one connected piece. 254 rows went in and 254 edges came
out; 77 rows went in and 77 nodes came out. Average degree 6.60 times 77 over 2 is 254.1, so the
numbers agree with each other. That I can check in my head, and I did.

But now the weight contradicts what the preview told me. The preview said "Weight: none (each edge
counts 1)". After loading it says "Weight: value, a higher value is a stronger tie". I did not
touch anything. One of those two is wrong, and the one I was shown when I was deciding to load was
the wrong one, or the program changed it behind my back.

Also under Attributes: betweenness and degree on the nodes, and under Results: Louvain and
PageRank. And "1 note -- Open in Notes". On a file I just opened for the first time. Same
question as before: is this my file?

## 09 -- open the source to look for an import report

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--screen-reader-analyst/09.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything" --click "Data" --click "miserables.gexf"

Think-aloud: This takes me back to the same preview, now called "Edit: miserables.gexf", with the
same match report: "77 rows; every id is unique." There is no line anywhere that says "file had N
rows, N loaded, 0 skipped, 0 self-loops, 0 duplicates merged". The pieces are there in three
different places -- the match report, the "every edge has both ends" line, and "each a distinct
pair" in the summary -- and I had to assemble them. "Apply is off: Nothing has changed yet" --
good, it tells me I have not broken anything. I leave with Esc.

I stop here.

## Verdict

Did I succeed? Mostly, yes. 77 characters, 254 connections, all ids unique, every connection has
both ends, each connection a distinct pair, one connected component. I believe nothing was dropped,
but I believe it by inference, not because the program said "nothing dropped". If my manager asked
"are you sure nothing was skipped?" I would want one sentence from the tool that says so, and I
would want it in the place I go back to, not only in the preview I already left.

What I would hold against it:

- The weight said "none" in the preview and "value" after loading. Contradicting itself on the
  one setting that changes every weighted number I compute later is serious.
- PageRank coloring, a Louvain result, betweenness, degree and a note appeared on a file I had
  just opened. Nothing tells me whether they came from the file or the program ran them. Until I
  know, I do not trust that I am looking at my colleague's file.
- The load did not tell me it finished. The progress box sat there, Summary said "Reading...", and
  the left panel still said "Reading the data..." after the graph was clearly loaded.
- Two controls named "Data" a few tab stops apart.
- Upside: the preview before loading, the counts in words at the top, "every id is unique" and
  "every edge has both ends", a summary with component count without running anything, and a
  caption under the chart. Those are the checks I do by hand in pandas, and it did them first.

Single Ease Question: 5 of 7.

Would I use this instead of my current tool? Not instead of NetworkX. For a first look at a file
somebody sent me -- counts, uniqueness, dangling edges, components -- it is quicker than writing
the pandas, and it said those in words. I would use it for that, the day it stops contradicting
itself about the weight and tells me plainly where the PageRank and Louvain results came from.
