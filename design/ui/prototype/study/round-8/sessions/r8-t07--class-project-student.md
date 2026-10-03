# Session: rank the Les Miserables characters by how much the network depends on them

Participant: the student with a class project ("Dev"), first time using the program.

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program put the characters in order of how much the whole network depends on them,
and tell us the top three, in order, and what the order was based on."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t07--class-project-student/ (written D below).

## Start screen (shots/tasks/r8-t07/01.png)

"Start, Recent projects, Samples. A big box at the bottom asking about usage data -- I'll say no
thanks. Les Miserables, 77 characters, 'good for a first look at communities and who holds the
story together.' That's exactly my practice set. Click it."

## Step 1 -- open the sample

    timeout 120 node app-b/study.mjs --try D/01.png task:r8-t07 --click "No thanks" --click "Les Miserables"

"Whoa, it opened with a lot already done. Nodes are orange to brown and a box says 'Color:
PageRank 0.00330 to 0.0754'. The left list has PageRank, Louvain, Shortest paths, Density, Link
prediction, and further down 'Betweenness' with a crossed-out eye. My Gephi tutorial said
Betweenness is for the connectors, the people the network depends on. In Gephi I'd go to
'Statistics'. I don't see a Statistics anywhere."

## Step 2 -- what is the flask, and is there a table?

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t07 --click "No thanks" --click "Les Miserables" --hover "Analyze"
    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table"

(Note: I rested on the flask icon at the bottom; its tooltip read "Analyze Shift+A".)

"The flask is Analyze. Good, that's my 'Statistics'. The Table at the bottom opens a list of 77
nodes 'sorted by degree': Valjean 36, Gavroche 22, Marius 19, Javert 17. There's a sentence above
it: 'Valjean is first on all three measures; Gavroche is in the top 3 on all three.' Which three?
I can see Degree and PageRank columns; the rest is cut off on the right. Degree isn't really 'how
much the network depends on them' though, it's just how many friends. I want betweenness."

## Step 3 -- Analyze, then Betweenness

    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze"
    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most"

"'Rank nodes and edges' -- that's the Ranking word from my tutorial. PageRank has a 'Start here'
badge, but the description of Betweenness, 'Which nodes sit on the most shortest paths between
others', sounds like 'the network depends on them'. I picked Betweenness."

"Now a box: Weight 'value (loaded weight)', Higher means Stronger / Farther / Capacity. I have no
idea. 'Betweenness reads a weight as distance: it uses 1/value.' I don't know what that means for
me. I'll leave the defaults. 'Under a second.' Run."

## Step 4 -- Run

    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run"
    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2"

"A new row 'Betweenness 2' appeared near the top with a spinner and a little blue bar. 'Under a
second', it said, but it's still spinning. The picture didn't change at all, it's still PageRank
colors. I clicked the row: it gets highlighted but the right side still shows the whole-graph
summary, no betweenness numbers, no ranking. Why is it '2'? Is there already a betweenness?"

## Step 5 -- look in the table after running

    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Table"

"Table is still 'sorted by degree'. No betweenness column that I can see. The spinner on
'Betweenness 2' is still going. That's two misses."

## Step 6 -- try the Betweenness row that was already there

    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Table"

"The old 'Betweenness' row in 'For the report' opens on the right: 'Measure from Analyze',
'Covered by PageRank for Color', a 'Move above' button, 'Paints 77 nodes, none visible', 'Yellow
to orange'. So it exists but it's hidden under PageRank. It tells me about colors, not who's
first. The table is still by degree."

## Step 7 -- try the Data tab

    timeout 120 node app-b/study.mjs --try D/10.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Data"

"I meant the 'Data' tab next to 'Style' on the right, but I got a whole Data page on the left
instead (two things are called Data). It lists 'betweenness' under 'Other attributes', with a
number sign, so the numbers are in the file somewhere. But no list of who is highest."

## Step 8 -- 'Move above' and the table again

    timeout 120 node app-b/study.mjs --try D/11.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Move above" --click "Table"

"I pressed 'Move above' so betweenness wouldn't be covered. Nothing changed that I could see:
still 'Covered by PageRank', still 'none visible', the box on the graph still says 'Color:
PageRank', the table still sorted by degree. I give up on betweenness."

## Answer given

"Top three: Valjean, Gavroche, Marius. The order is by degree -- how many other characters each
one appears with (36, 22, 19). The table also said Valjean is first on all three measures and
Gavroche is top 3 on all three, so I think it's about the same for betweenness, but I couldn't
get the program to show me betweenness, so honestly what I'm handing in is degree."

## After the task

- Did I succeed? "Partly. I got a top three, but by degree, which I don't think is what 'the
  whole network depends on them' means. I wanted betweenness and never saw it ranked."
- Single Ease Question (1 = very difficult, 7 = very easy): **3**.
- Would I use this instead of my current tool (Gephi from the class tutorial)? "Maybe for looking
  around -- the sample opened already colored and labeled, and the table sorted things for me
  without a Statistics panel, which is nicer than Gephi. But for the assignment, no, not yet: I
  ran Betweenness and it just spun, the picture never changed, and the one that was already
  there was 'covered' and 'Move above' did nothing. In Gephi I at least get a column I can sort."

## What tripped me up, in my words

1. Running Betweenness said "Under a second" and then kept spinning; no ranking, no new colors,
   no column appeared.
2. A second "Betweenness" row already existed, hidden ("covered by PageRank"), so I had two and
   didn't know which was real.
3. "Move above" didn't visibly do anything.
4. The table only offered "sorted by degree"; I couldn't see how to sort by betweenness, and the
   columns past PageRank were cut off.
5. The Weight / "Higher means" choices (Stronger, Farther, Capacity, "uses 1/value") meant nothing
   to me.
6. Two different things are called "Data" (left rail and right tab).
7. Good: Analyze with "Rank nodes and edges" and one-line descriptions made it easy to find the
   measure I'd heard of; the table's summary sentence told me who led.
