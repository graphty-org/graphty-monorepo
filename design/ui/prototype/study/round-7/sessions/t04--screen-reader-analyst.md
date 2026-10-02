# Session: look up Valjean, then narrow the picture to him and his neighbors -- screen-reader analyst (Morgan Reyes)

Task as given by the moderator: "Look up the character Valjean: what is recorded about him, how he
stands on the measures already worked out, and who appears right around him. Then narrow the whole
picture to him and the characters directly around him, so that every number describes only them."

Participant: Morgan Reyes, a blind analyst who works by screen reader and keyboard (persona file
study/personas/screen-reader-analyst.md). The renders stand in for what the screen reader would
read out. All commands were run from design/ui/prototype; renders are in
tmp/round-7-sessions/t04--screen-reader-analyst/.

Start screen: shots/tasks/t04/01.png.

## Think-aloud

**Start.** Title area says "Les Miserables", then "Local only" -- good, that is my first question
answered before I asked it: the file stays here. "Full graph". A rail with Graph, Data, Views, Notes,
Assistant. A tree of rows: Selection, Notes 4, PageRank, Louvain 6 groups, Shortest paths, Watchlist,
For the report, Everything. A legend: "Color: PageRank 0.0033 to 0.0754, Size: Degree". At the
bottom, "Table", "Nodes", "Edges", "Louvain". I'll find Valjean. There is a search box, "Find rows
and notes".

    timeout 120 node app-b/study.mjs --try .../01.png task:t04 --click "Find rows and notes"

Focus lands in the search field. "Rows and notes" -- rows of what? The tree rows, I think, not
characters. I am not betting my one search on that. I do better with tables. There is a "Table".

    timeout 120 node app-b/study.mjs --try .../02.png task:t04 --click "Table"

Now this is more like it. "77 nodes". Then a sentence: "Valjean is first on all three measures;
Gavroche is in the top 3 on all three". Columns: label, group, "Degree (full graph)", "PageRank
(full graph)", "Rank by PageRank", "Betweenness (full graph)". The "(full graph)" in the header is
useful -- it tells me what the number was computed over, which means somebody has thought about it
being computed over something smaller. Valjean row: group 2, degree 36, PageRank 0.0754, rank 1,
betweenness 0.570. Sorted by degree, descending. Is that betweenness normalized? 0.570 looks
normalized. It does not say. I'd want that stated.

    ... --click "Table" --click "Valjean"   (03.png)

Clicking his row selects him. The tree now says "Selection 1". The right-hand panel says "Valjean,
Node" with two tabs, Style and Data, and under Style a list "Why this look": Notes, Label below;
PageRank, Color; Degree, Size; Group 2, Label above; Selection; Everything. That is how he is
painted, not what is recorded about him. I want Data.

    ... --click "Table" --click "Valjean" --click "Data"   (04.png)

Wrong Data. It took me to the Data section of the whole app -- sources, filters, attributes -- and
the right panel now describes the graph, not Valjean. There are two things on this screen both called
"Data" and I cannot tell them apart by name. Valjean is no longer selected either. Sighted people
would see which one is a tab. I would hear "Data" twice.

Actually the graph summary is welcome: 77 nodes, 254 edges, undirected, density 0.0868, 1 connected
component, average degree 6.6, highest degree 36. "Undirected" said in words. That is the overview
I always ask for. But it is not what I came for.

    ... --click "Table" --click "Valjean" --click "Data" --click "Valjean"   (05.png)

Selecting him again puts me back on the Style tab. Fine. I'll do it the way I would with the keys:
focus the Style tab, arrow right.

    ... --click "Table" --click "Valjean" --click "Style" --key ArrowRight   (07.png)

(06.png was a botched Tab-then-arrow attempt; ignored.) Arrow keys move between the tabs, as a
proper tab list should. Data for Valjean: "From miserables.json", id 11, label Valjean, group 2.
Results: PageRank 0.0754, #1 of 77. Betweenness 0.419, "#1-#2 on 60 of 77". Degree 36, #1 of 77.
Bridges: on 5 bridge edges, to Labarre, Mme.deR, Isabeau, Gervais, Scaufflaire. Memberships:
Community 1, Valjean to Javert, Watchlist, Group 2. 2 notes.

Three things I do not accept:
- Betweenness is 0.570 in the table and 0.419 here. Same character, same graph, same word. One of
  them is not what it says, and nothing next to either explains it. "On 60 of 77" -- computed on
  60 nodes? Which 60? Why? That is the normalized-versus-raw argument all over again, except I can't
  even tell which is which.
- "From miserables.json". The source in the Data section is "miserables.gexf". Which file is it?
- "#1-#2" is a range for a rank. Tied? Uncertain? Say which.

So the "what is recorded" and "measures" parts I got, with those reservations. Now who is around
him. I'll Tab from the row and listen.

    ... --click "Table" --click "Valjean" --key Tab   (08.png)

Focus goes into the drawing, on Valjean: "Valjean, group 2, degree 36". The drawing says something
on the first key. I am mildly surprised.

    ... --click "Table" --click "Valjean" --key Tab --key Tab   (10.png)

(I tried hovering a control I guessed was called "Neighbors" in 09.png; nothing is called that.)
Next stop is a button named "Neighborhood". Good name, and it is a real button in the tab order.

    ... --click "Table" --click "Valjean" --key Tab --key Tab --key Enter   (11.png)

A dialog: "Neighborhood of Valjean". Hops 1, 2, 3. Direction: Undirected graph. "Selected: Valjean
and his 36 neighbors." Buttons: "Add as steps", "Filter to neighbors". Two complaints. The table I
was reading is gone -- the bottom panel collapsed when this opened. I did not ask for that. And it
tells me there are 36 neighbors but not who they are. "Who appears right around him" is a list of
names, and I don't have it. The tree still says "Selection 1" while the dialog says 37 are
selected. Which is it?

The task says narrow the whole picture. "Filter to neighbors" sounds like it.

    ... --key Enter --click "Filter to neighbors"   (12.png)

A message: "Added filter step: Neighbors of Valjean, 1 hop", with Undo. Top bar now says "37 of 77
nodes" instead of "Full graph". That is the state, in words, somewhere I can find it again -- good.
The message, I assume, will vanish; I hope the top bar is where it lives.

But the table came back and it still says "77 nodes", and every column still says "(full graph)":
Valjean 36, Gavroche 22, Marius 19, betweenness 0.570. The legend still says PageRank 0.0033 to
0.0754 and degree 1 to 36. If the picture is narrowed, these numbers are not about it. They are
about the 77.

Let me see what the filter is. The top bar item:

    ... --click "Filter to neighbors" --click "37 of 77 nodes"   (13.png)

That took me to a completely different project. "Transfers, March 2026", 3,000 accounts, a filter
"amount is at least 1,000". Where did Les Miserables go? I pressed the thing that said "37 of 77
nodes" and landed in someone's bank data. That is the kind of thing that makes me close a tool.

Start again, filter again, and this time go to the Data section where filters live:

    ... --click "Filter to neighbors" --click "Data"   (14.png)

Back in Les Miserables, but the top bar says "Full graph" and Filters says "No filters". The step
I just added is gone. The help text there is exactly what I wanted to hear -- "Filters change what
is computed; the eye in the Graph tree only hides" -- but my filter isn't in it.

All right, the slow way: build the step by hand.

    ... --click "Data" --click "Add filter step"   (15.png)

A menu: "By an attribute or computed value", "Top of a computed value", "Largest component",
"k-core", and "Neighbors of the selection -- select one or more nodes first" (unavailable). Clear
reason given for why it is unavailable. Good. So select first.

    ... --click "Table" --click "Valjean" --click "Data" --click "Add filter step" --click "Neighbors of the selection"   (16.png)

Still unavailable. Going to the Data section dropped my selection. So the only way to select him is
in Graph, and the only place to build a filter is in Data, and moving from one to the other throws
the selection away.

Last check: with the "Filter to neighbors" step in place, does Valjean's own Data tab change?

    ... --click "Filter to neighbors" --click "Style" --key ArrowRight   (17.png)

No. "PageRank 0.0754, #1 of 77", "Degree 36, #1 of 77", "Betweenness 0.419 #1-#2 on 60 of 77".
Still out of 77. The top bar says 37. The numbers say 77. Nothing tells me whether they will be
recomputed, or whether I have to run something again.

That is three dead ends in a row (lost filter, wrong project, lost selection). I'm stopping.

## Result

- **Succeeded?** Partly. I found what is recorded about Valjean (id, group, notes, memberships) and
  his ranks, with the betweenness contradiction unresolved. I got a count of his neighbors but not
  their names. I narrowed the drawing to 37 of 77, but not one number on screen describes only
  those 37. The second half of the task failed.
- **Single Ease Question:** 2 of 7.
- **Would I use this instead of my scripts?** No, not now. In NetworkX this is
  `G.subgraph([v] + list(G[v]))` and then the same three measures again, and every number I print is
  about the subgraph and says so. Here the narrowing changes the picture but not the numbers, the
  narrowing disappears when I move to the place where filters are listed, and two betweenness values
  for the same character disagree with no explanation. What I would keep: the graph summary in
  words (nodes, edges, undirected, components), the "(full graph)" wording in the column headers,
  "Local only" said up front, the arrow keys working in the tab list, and the drawing speaking on the
  first key press. Fix the rest and I'd look again.
