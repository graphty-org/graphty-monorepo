# Session: rank the characters by how much the network depends on them -- supply chain risk analyst (Dana)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program put the characters in order of how much the whole network depends on them,
and tell us the top three, in order, and what the order was based on."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t07--supply-chain-analyst/.

## Step 1 -- start screen (shots/tasks/r8-t07/01.png)

Dana: "OK. Start page. Open, New from data, and on the right some samples. Les Miserables, 77
characters, there it is. Before anything, there's a big box at the bottom asking to collect usage
data. 'Files are read on this computer and never uploaded' -- good, that's the line I'd show IT.
I'm saying no thanks to the usage thing; I don't want to explain that to security either."

## Step 2 -- dismiss the banner, open the sample

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t07 --click "No thanks" --click "Les Miserables"

Dana: "That's a lot already. A network in the middle, colored orange to brown by something called
PageRank. A list on the left with PageRank, Louvain, Shortest paths, Density, a 'Betweenness' row
down under 'For the report' with a crossed-out eye. Somebody has already done stuff here.

'How much the whole network depends on them' -- in my world that's a chokepoint. The webinar word
for chokepoint was betweenness. I see it in the list but it's somebody else's, hidden, and I was
asked to have the program do it, so I'm not just going to trust a pre-made row. The flask icon at
the bottom -- let me see what that is."

## Step 3 -- the flask button

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze"

Dana: "It's called Analyze. A search box, recent ones, then 'Rank nodes and edges'. PageRank has a
little 'Start here' tag on it -- that's pushy, but 'connected to other well-connected nodes' is
popularity, not dependence. Betweenness: 'Which nodes sit on the most shortest paths between
others.' That's the chokepoint idea -- if everything has to route through you, you're the one
that hurts when you go down. I'm taking Betweenness. There's a little clock icon next to it; no
idea what that means. Closeness and Eigenvector I'm skipping, I don't know those words."

## Step 4 -- pick Betweenness

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness"
    (the tool clicked the hidden Betweenness row in the left list instead, and timed out)
    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most"

Dana: "Settings. Weight: value, loaded weight. 'Higher means' Stronger, Farther, Capacity. Three
lines explaining those. Then 'Betweenness reads a weight as distance: it uses 1/value.' I read the
first line and skipped the rest -- I don't know what the weight even is in a novel. Defaults are
probably fine. 'Under a second.' Run."

## Step 5 -- Run

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run"

Dana: "A new row at the top of the list, 'Betweenness 2', with a spinner and a blue bar under it.
The picture didn't change -- still colored by PageRank, the legend still says PageRank. So where's
my answer? I don't want a picture anyway, I want a list. There's a 'Table' at the bottom."

## Step 6 -- open the table

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t07 ... --click "Run" --click "Table"

Dana: "Now we're talking, a table. 77 nodes, sorted by degree. Valjean, Gavroche, Marius, Javert.
There's a sentence 'Valjean is first on all three measures; Gavroche is in the top 3 on all
three' -- which three? Degree, PageRank and ... I can't see the third. The columns run off the
right edge. And 'Betweenness 2' is still spinning on the left. 'Under a second,' it said."

## Step 7 -- click the spinning row

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t07 ... --click "Table" --click "Betweenness 2"

Dana: "Selected it. Still spinning. Nothing in the panel on the right about it. Fine, I'll find the
column myself."

## Step 8 -- the column chooser

    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t07 ... --click "Table" --click "Columns: 9 of 9"

Dana: "Columns list: label, group, betweenness, degree. So betweenness IS a column, I just can't see
it. And now that the box is open, my 'Betweenness 2' row has gone from the left list. Did it
finish? Did it fail? Nobody told me. I'll hide degree to make room -- in Excel I'd just hide the
column."

## Step 9 -- hide degree

    timeout 120 node app-b/study.mjs --try .../09.png task:r8-t07 ... --click "Columns: 9 of 9" --click "degree" --key Escape

Dana: "That only hid the raw degree number; 'Rank by degree' is still there. Whatever -- at the far
right edge I can now see '# Betw...'. Click it to sort, like a spreadsheet."

## Step 10 -- sort by betweenness

    timeout 120 node app-b/study.mjs --try .../10.png task:r8-t07 ... --key Escape --click "Betweenness (full graph)"

Dana: "Betweenness (full graph), arrow down. Valjean 0.570, Myriel 0.177, Gavroche 0.165, Marius
0.132. Myriel jumped from 18th by degree to second -- that's exactly the point of a chokepoint
measure, the bishop is the bridge to his little cluster. That I believe.

But the line above the table still says 'sorted by degree', and it's sorted by betweenness. And I
can't tell whether this column is the one I just ran or the one that was already sitting hidden
in 'For the report'. My run row vanished without a word. If this were my supplier list, that's
the question my VP asks first: is this today's number? The numbers are also cut off at the right
edge -- 0.57 and something."

## Answer

Top three, in order: Valjean, Myriel, Gavroche (Marius fourth). The order is by betweenness: how
many of the shortest routes between other characters pass through that character -- the
"chokepoint" score. It counted the connection weight as a distance (I left the default).

## Verdict

- Did I succeed? I think so -- I got a ranked list with a named basis. I'm not fully sure the
  column I sorted was from my own run rather than the pre-made one, because my run's row spun and
  then disappeared.
- Single Ease Question: 4 of 7. Finding Betweenness in Analyze was quick because I already knew the
  word. After Run, nothing told me it was done or where the result went; I had to hunt for the
  column off the right edge of the table, and the heading still said "sorted by degree".
- Would I use this instead of my current tool? Not instead. Next to Excel, maybe: a sortable
  chokepoint ranking on my own supplier links, with data that stays in the browser, is something I
  can't do in a pivot. But it has to tell me when a run is finished and which run a column came
  from, and I need that table out into Excel or Power BI -- I didn't see an export here. And on
  my real data the Tier 2 links are mostly missing, so a chokepoint score would mostly tell me
  which Tier 1s have lots of parts, which I already know.
