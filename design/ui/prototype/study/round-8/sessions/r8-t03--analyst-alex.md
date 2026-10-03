# Session: bring in miserables.gexf and check that all of it arrived -- Analyst Alex

Task as given by the moderator: "You have never used this program before. A colleague sent you a
network file of the characters in Les Miserables and the chapters they share; you saved it as
miserables.gexf in your Downloads folder. Bring it into the program and, before you do anything
else with it, check that all of it arrived: how many characters, how many connections, and that
nothing was dropped on the way in."

What I know going in: this is the classic Les Mis co-appearance network. In NetworkX
(`nx.les_miserables_graph()`) it is 77 nodes and 254 edges, one component, and Valjean is the hub
with degree 36. Those are my reference numbers.

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-8-sessions/r8-t03--analyst-alex/`.

## Step 0 -- start screen (shots/tasks/r8-t03/01.png)

First thing I look for: does my file go anywhere. Top right says "Local only", and under the Open
button: "Files are read on this computer and never uploaded." Good, that is where I wanted to see
it, right next to the load button. There is also a usage-data banner at the bottom. It says "we
will never see the data you analyze" but wants usage info -- no, thanks. I am not opting into
anything on day one.

There is a Les Miserables sample on the right with "77 characters" on it. Tempting, but the task is
MY file, and I want to check the file my colleague sent, not their copy.

## Step 1 -- dismiss the banner, Open

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--analyst-alex/01.png task:r8-t03 --click "No thanks" --click "Open project or file..."

A file chooser on Downloads. miserables.gexf, 22 KB. There is also a "miserables-edited.graphml"
-- not that one, my colleague said gexf. Fine.

## Step 2 -- pick the file, Open

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--analyst-alex/02.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open"

Oh, it does not just load, it shows me a preview first. Header line: "Les Miserables: 77 nodes,
254 edges". That is my number on both. Left side: nodes 77, edges 254, green checks. The node
table shows id, label, group. At the bottom, "Match report: nodes -- 77 rows; every id is unique."
OK, so no duplicate ids. That is actually the thing I would check in pandas first. I like that it
is right there and it is one line.

"Each row is a node: set by the file" with a lock -- fine, I am not touching that.

## Step 3 -- look at the edges before I commit

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--analyst-alex/03.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges"

254 rows. "Match report: edges -- 254 rows; every edge has both ends." Good, no dangling edges
pointing at a node that does not exist. There is a value column, 1, 8, 10, 6... that is the
co-appearance count.

But up top it says "Weight: none (each edge counts 1)". Hmm. There is a column literally called
value with numbers in it and it is telling me weight is none? In Gephi the weight comes through
from a gexf. I am noting that. It is not "dropped" exactly, the column is there, but if I ran a
weighted shortest path later I would get the wrong answer and not know why.

I do not see a line that says "0 rows skipped" or similar. "Every edge has both ends" sort of
implies it. I'll take it for now. Load.

## Step 4 -- Load

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--analyst-alex/04.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load"

"Reading miserables.gexf -- 77 nodes, 254 edges..." with a progress bar and a Cancel. Good, it
tells me it is doing something and I can kill it. Summary on the right says "Reading...". For a 22
KB file I would expect this to be instant, but fine.

## Step 5 -- try to see the summary

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--analyst-alex/05.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Summary"

Clicked Summary and it just collapsed. Still "Reading...", bar still at about 60 percent. Is it
doing anything? For 254 edges? This is the bit where I start getting nervous.

## Step 6 -- click something else in the left list

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--analyst-alex/06.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything"

There it is, the graph showed up. Valjean in the middle, Myriel's little cluster, the barricade
students at the bottom. Right panel: "Paints 77 nodes, 254 edges". Matches.

But wait -- the nodes are colored by "PageRank 0.00330 to 0.0754", and the strip at the bottom has
a "Louvain" tab. I did not run PageRank. I did not run Louvain. The task said before I do anything
else -- and something already ran things on my data? Did it load MY file or the sample with the
"worked examples already added"? And the left panel still says "Reading the data..." even though
the picture is up. That does not inspire confidence.

## Step 7 -- the Data section

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--analyst-alex/07.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything" --click "Data"

(The tool said "Data" matched two controls and it clicked the left-rail one. Fine, that is the one
I would have gone for.)

This is the screen I wanted. Source: miserables.gexf, 77 nodes, 254 edges. Summary on the right:
- Nodes 77
- Edges 254, "each a distinct pair" -- so no duplicate edges collapsed
- Undirected
- Connected components 1
- Average degree 6.60, highest degree 36

All of that matches NetworkX. 254 x 2 / 77 = 6.597, so 6.60 is right; 36 is Valjean. One
component, so no orphans. I would put this in an email.

Things that bother me:
1. Weight now says "value, stronger", and the source says "Weight: value, a higher value is a
   stronger tie". The preview before loading said "Weight: none (each edge counts 1)". Which is
   it? Probably it figured it out after loading, but the two screens disagree and I had to notice.
2. Attributes list "betweenness" and "degree" as node attributes -- those might be in the
   colleague's gexf, fine. But under "Results" it shows Louvain and PageRank, and there is "1 note".
   I did not make a note. Either my colleague's file carries those (can gexf even carry a note?) or
   the program added them. Nowhere does it say which.
3. Still no explicit "nothing was skipped / 0 rows dropped" line. I am inferring it from 77 = 77,
   254 = 254, every id unique, every edge has both ends. That is enough for me because I know the
   numbers. If I did not know them, I would want it said in plain words.

## Step 8 -- click the file to see if there is an import report

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--analyst-alex/08.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything" --click "Data" --click "miserables.gexf"

Takes me back to the same table preview, now titled "Edit: miserables.gexf". Same match report.
Nothing new. "Apply is off: Nothing has changed yet." OK. I am stopping here.

## Wrap-up

Did I succeed? Yes. 77 characters, 254 connections, every id unique, every edge has both ends,
each edge a distinct pair, one component. Those match what I get in NetworkX, so nothing was
dropped.

Single Ease Question: 5 out of 7. Finding the numbers was easy -- they were on the preview before I
even pressed Load, which is better than Gephi's import report that I usually click past. What cost
me: the loading box that sat at 60 percent and "Reading the data..." that never went away, the
weight saying "none" before load and "value" after, and PageRank and Louvain already on my graph
when I had not run anything.

Would I use this instead of my current tool? For the "did it all come in" check, yes -- it is
faster than opening the Data Laboratory in Gephi and counting, and the "never uploaded" line at the
Open button is what I would need to show IT. But I would not trust it yet with the supplier file
until I know why it computed things on my data without me asking, and which numbers came from the
file versus from the program. If it does things on its own, I need to see that it did.
