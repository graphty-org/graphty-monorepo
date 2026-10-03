# Session: rank the Les Miserables characters by how much the network depends on them

Participant: Analyst Alex (intermediate graph analyst, Gephi and NetworkX user)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program put the characters in order of how much the whole network depends on them,
and tell us the top three, in order, and what the order was based on."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t07--analyst-alex/.

## Step 0 -- the start screen (shots/tasks/r8-t07/01.png)

Think-aloud: "OK. First thing -- 'Files are read on this computer and never uploaded', and a
'Local only' chip up top. Good, that's where I'd want it. There's a usage-data banner at the
bottom, I'm saying no thanks to that on principle. Les Miserables is right there in Samples, 77
characters, that matches what I remember from the NetworkX tutorial."

## Step 1 -- dismiss the banner, open the sample

    timeout 120 node app-b/study.mjs --try .../01.png task:r8-t07 --click "No thanks" --click "Les Miserables"

Saw: the graph, already colored by PageRank (legend "PageRank 0.00330 to 0.0754"), a long tree on
the left: PageRank, Louvain, Shortest paths, Density, Link prediction, Top 9 by degree, Watchlist,
a "For the report" folder with Betweenness (with a crossed-out eye), and so on.

Think-aloud: "Huh, it opens with a lot of stuff already done. That's someone else's homework, I
don't know what of this I should trust. 'How much the whole network depends on them' -- to me
that's betweenness, the bottleneck question. Who sits on the routes between everybody else. Not
degree, not PageRank. There's a Betweenness row down in 'For the report'. Let me click that."

## Step 2 -- click the existing Betweenness row

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Betweenness"

Saw: right panel "Betweenness, Measure from Analyze", "Paints 77 nodes, none visible", "Covered by
PageRank for Color", a "Move above" button. The picture did not change.

Think-aloud: "So it's there but PageRank is painted on top. I don't want to fix colors, I want a
list. There's a Data tab -- maybe that's the numbers."

## Step 3 -- try "Data"

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Data"

Saw: I ended up on the whole Data page (left rail), not the Data tab of the row. Sources,
miserables.gexf, 77 nodes, 254 edges, Summary on the right. Under "Other attributes":
"betweenness" and "degree" -- so the file itself carries a betweenness column.

Think-aloud: "Wrong Data -- there are two things called Data on screen. Anyway: 77 nodes, 254
edges, one component. That matches the NetworkX version, fine. But a 'betweenness' that came in
the file is not the program doing it. The task says have the program put them in order. I don't
trust a number someone baked into a file. Let me look at the table."

## Step 4 -- open the table

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table"

Saw: table of 77 nodes "sorted by degree", Valjean 36, Gavroche 22, Marius 19, Javert 17; a
sentence "Valjean is first on all three measures; Gavroche is in the top 3 on all three"; columns
Degree, Rank by degree, PageRank, Rank by PageRank, cut off at the right edge. "Columns: 9 of 9".

Think-aloud: "Sorted by degree. Not what I asked. 'All three measures' -- which three? I can only
see two. The rest is off the edge."

## Step 5 -- find how to run something

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t07 --click "No thanks" --click "Les Miserables" --hover "Analyze"
    (tooltip: "Analyze Shift+A")
    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze"

Saw: an Analyze box with a search field, Recent (Louvain, PageRank, Shortest path), then "Rank
nodes and edges": PageRank ("Start here"), Degree, Total value, Betweenness ("Which nodes sit on
the most shortest paths between o..."), Closeness, Eigenvector.

Think-aloud: "OK, this is what I wanted -- a list by name with a one-liner. Betweenness, 'sits on
the most shortest paths between others'. That's the one. PageRank says 'Start here', which I'd
ignore; PageRank answers a different question."

## Step 6 -- pick Betweenness

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness"
    (clicked the tree row instead; timed out)
    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most"

Saw: a Betweenness form. Weight "value (loaded weight)", Higher means Stronger / Farther /
Capacity, "Betweenness reads a weight as distance: it uses 1/value." Footer: "Under a second",
Run.

Think-aloud: "'Under a second.' Good, that's the thing I always want to know before I click. And
it's telling me how it treats the weight, which NetworkX never does -- in NetworkX I'd have
forgotten the weight was a strength and gotten it backwards. I'll leave it as is. Run."

## Step 7 -- run it

    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run"
    timeout 120 node app-b/study.mjs --try .../09.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2"

Saw: a new row "Betweenness 2" near the top of the tree with a spinner and a progress line. The
picture did not change. Clicking the row did not change the right panel either; it still shows
the graph summary.

Think-aloud: "'Betweenness 2' -- because there's already one. Spinning. It said under a second.
Is it doing anything? Clicking it shows me nothing about it. This is the bit where I start to
wonder. Let me go to the table and see if a column shows up."

## Step 8 -- table again, look for the column

    timeout 120 node app-b/study.mjs --try .../10.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Table"
    timeout 120 node app-b/study.mjs --try .../11.png ... --click "Table" --click "Columns: 9 of 9"
    timeout 120 node app-b/study.mjs --try .../12.png ... --click "Columns: 9 of 9" --click "group" --click "degree" --key Escape

Saw: still sorted by degree. The Columns picker lists only label, group, betweenness, degree --
not the PageRank or rank columns that are actually taking up the room. Unticking "degree" (the
file's degree) freed a column and "# Betw..." peeked in at the far right. The "Betweenness 2" row
was gone from the tree by now, with no message.

Think-aloud: "The column chooser doesn't list the columns I'd want to hide. I unticked degree just
to shove things over. And my 'Betweenness 2' row disappeared. Did it finish? Did it fold into the
old one? Nothing told me. There's a Betweenness column at the edge now, let's sort by it."

## Step 9 -- sort by betweenness

    timeout 120 node app-b/study.mjs --try .../13.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Table" --click "Columns: 9 of 9" --click "degree" --key Escape --click "Betweenness (full graph)"

Saw: column "Betweenness (full graph)", sorted descending: Valjean 0.570, Myriel 0.177, Gavroche
0.165, Marius 0.132. The values were partly clipped at the right edge.

Think-aloud: "There. Valjean 0.570, Myriel 0.177, Gavroche 0.165. Those are the numbers I remember
from the NetworkX Les Mis example, so I believe them. Myriel being second is the interesting one
-- he's rank 18 by degree, so a degree ranking would have hidden him. That's exactly the 'why
betweenness and not degree' line for a director. One nagging thing: the form said it uses the
weight as 1/value, and these look like the plain unweighted numbers I know. Either the weight
didn't change the order or it didn't use it. I'd check that before putting it in a deck."

## Answer

Top three, by betweenness centrality (the share of shortest paths between other characters that
pass through each one), highest first:

1. Valjean (0.570)
2. Myriel (0.177)
3. Gavroche (0.165)

## Debrief

- Succeeded? Yes, I think so. The numbers match what I know from NetworkX. I am less sure whether
  the column I sorted was the run I just did or the betweenness that came in the file -- the new
  row vanished and nothing said "done".
- Single Ease Question: 4 of 7. Finding Betweenness in Analyze was quick and the "under a second"
  and weight explanation were good. What took longest: getting a sorted betweenness column. The
  table opens sorted by degree, the column was off the right edge, the column chooser doesn't list
  the computed columns, and running the measure didn't show me anything -- no recolor, no panel,
  the row just spun and then went away. Also two different things called "Data" and two called
  "Betweenness" on the same screen.
- Would I use it instead of my current tool? Not yet for the real supplier file. The local-only
  promise right at the start is the best thing here, and if running a measure dropped me straight
  into "here's the ranked list, here's the color" I'd drop the Gephi half of my routine for this.
  Today I'd still sort it in pandas -- that's one line and I know which number it is.
