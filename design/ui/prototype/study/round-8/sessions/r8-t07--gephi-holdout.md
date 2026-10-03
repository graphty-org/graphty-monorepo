# Session: rank the Les Miserables characters by how much the network depends on them

Participant: the Gephi holdout (Dr. Mara Lindqvist, fictional). Viewport 1440x900.

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program put the characters in order of how much the whole network depends on them,
and tell us the top three, in order, and what the order was based on."

All commands were run from `design/ui/prototype`. `S` below stands for
`tmp/round-8-sessions/r8-t07--gephi-holdout`.

## Step 1 -- the start screen

Screen: `shots/tasks/r8-t07/01.png`.

> A start page and a consent banner. "Share usage data" or "No thanks". No thanks -- I am not
> agreeing to anything before I have seen a number. Samples on the right, Les Miserables, 77
> characters. Good, that is the Knuth graph, 77 nodes and 254 edges, I know it. "Opens with worked
> examples already added" -- so somebody has already done the homework. We'll see.

## Step 2 -- open the sample

```
timeout 120 node app-b/study.mjs --try S/02.png task:r8-t07 --click "No thanks" --click "Les Miserables"
```

> It opened with PageRank already painting everything orange to brown. There is a tree on the left
> -- PageRank, Louvain, Shortest paths, a "Betweenness" row down at the bottom with a crossed-out
> eye. "How much the whole network depends on them" -- that is not PageRank, that is brokerage.
> Remove the node and how many shortest paths break: betweenness. PageRank is "who is endorsed by
> the endorsed", which on a co-appearance graph is basically degree with extra steps.
> First thing I want is the table. There is a "Table" at the bottom. That's my Data Lab, I hope.

## Step 3 -- the table

```
timeout 120 node app-b/study.mjs --try S/03.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table"
```

> A table, sorted by degree, with Degree, Rank by degree, PageRank, Rank by PageRank, and it says
> "(full graph)" in every header. Good. That answers my usual question before I ask it -- these
> were computed on everything, not on a filtered subset. "Columns: 9 of 9", so presumably there
> is a betweenness column off to the right. There is a sentence above the table, "Valjean is first
> on all three measures" -- I skip that, I want the numbers.

## Step 4 -- sort by betweenness

```
timeout 120 node app-b/study.mjs --try S/04.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --click "Betweenness (full graph)"
```

> Clicked the column header. It scrolled across and sorted descending. Valjean 0.570, Myriel 0.177,
> Gavroche 0.165, Marius 0.132. Those are the NetworkX numbers for this graph, normalized and
> unweighted -- I have seen 0.57 for Valjean on a slide more than once. Fine.
> But the line above the table still says "sorted by degree". It is not sorted by degree, it is
> sorted by betweenness. Small thing, but it is exactly the kind of label I would screenshot for a
> handout and then have to explain.

## Step 5 -- what is that Betweenness row on the left?

```
timeout 120 node app-b/study.mjs --try S/05.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --click "Betweenness (full graph)" --click "Betweenness"
```

> I clicked the Betweenness row in the tree to see its parameters. The right side shows color
> settings -- "yellow to orange", "covered by PageRank" -- that is its paint, not how it was
> computed. And clicking it threw away my sort: the table is back on degree. I did not ask for
> that.

```
timeout 120 node app-b/study.mjs --try S/06.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Data"
```

> I meant the Data tab on the right; I got the Data page on the left instead. Two things called
> "Data" side by side. But this is useful anyway: under Attributes, "betweenness" and "degree" are
> under "Other attributes" -- they came in with the GEXF file. PageRank and Louvain are under
> "Results". So the betweenness column was not computed by this program at all, it is whatever
> was in the file. The moderator said "have the program" do it. And I cannot see whether the file's
> numbers are weighted. The graph has weights ("value, stronger"). I want to run it myself.

## Step 6 -- run betweenness from Analyze

```
timeout 120 node app-b/study.mjs --try S/07.png task:r8-t07 --click "No thanks" --click "Les Miserables" --hover "Analyze"
timeout 120 node app-b/study.mjs --try S/08.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze"
```

> The flask at the bottom is "Analyze, Shift+A". It opens a list: PageRank with a "Start here"
> badge -- no, thank you -- Degree, Total value, Betweenness, Closeness, Eigenvector. Plain names.
> Good. These are my Statistics panel.

```
timeout 120 node app-b/study.mjs --try S/09.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness"
```

> (Clicking "Betweenness" hit the tree row behind the menu and did nothing.)

```
timeout 120 node app-b/study.mjs --try S/09.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most"
```

> Now the betweenness form. Weight: "value (loaded weight)". Higher means: Stronger / Farther /
> Capacity. And then the line I actually wanted: "Betweenness reads a weight as distance: it uses
> 1/value." That is the correct thing to do with a tie-strength weight, and it is the thing Gephi
> never tells you. I would cite that sentence. "Under a second". Run.

```
timeout 120 node app-b/study.mjs --try S/10.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run"
timeout 120 node app-b/study.mjs --try S/11.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2"
timeout 120 node app-b/study.mjs --try S/12.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Table"
```

> A row "Betweenness 2" appeared at the top of the tree with a spinner and a progress line. "2",
> because the file's column already took the name. I clicked it: the right panel did not change, it
> still shows the graph summary. I opened the table: still 9 of 9 columns, no new column. It said
> under a second. It is still spinning. On 77 nodes. I'd have been done in Gephi by now.
> I am not waiting on it. I have the file's betweenness, it matches what I know NetworkX gives for
> the unweighted graph, and the column says full graph. That is my answer, with the caveat that it
> is unweighted and it is the file's number, not this program's.

## Answer given to the moderator

1. Valjean (betweenness 0.570)
2. Myriel (0.177)
3. Gavroche (0.165)

Based on betweenness centrality -- the share of shortest paths between other characters that run
through each one -- over the full graph, normalized. As far as I can tell it is unweighted, and
it is the betweenness column that came with the sample file; my own weighted run never finished.

## After the task

- **Succeeded?** Partly. I have the right top three for unweighted betweenness and I can say
  exactly what it was based on. But the program did not compute it for me -- the run I started
  never produced a column -- so strictly I read a number off the file.
- **Single Ease Question:** 4 of 7. Finding the table and sorting it was quick and the "(full
  graph)" in the headers is exactly right. Then three dead ends: the sort reset when I touched the
  tree, two "Data"s, and a run that sat spinning with no result.
- **Would I use it instead of Gephi?** No. Not on this. The weight sentence in the betweenness form
  and the "full graph" labels are better than anything Gephi does, and I noticed. But a statistic
  I start has to come back, land as a column, and tell me its parameters in the table, or I can't
  publish it. And all of this is on someone else's 77 nodes; show me my 23k-node retweet network
  first.

## Problems seen

- The run started from Analyze, promised "Under a second", never completed: the tree row kept
  spinning, no column appeared, and clicking the row did not open it in the right panel.
- After sorting by Betweenness, the line above the table still read "sorted by degree".
- Clicking a row in the left tree reset the table's sort back to degree.
- The betweenness column that ships with the sample is a file attribute ("Other attributes"),
  not a result; nothing in the table says whether it is weighted or how it was computed. The
  column header "(full graph)" suggests the program computed it.
- Two different controls called "Data" (the left rail and the right panel's tab).
- The sample opens already colored by PageRank with a "Start here" badge on PageRank in Analyze,
  which nudges toward the wrong measure for a "depends on" question.
- The new run was named "Betweenness 2" because the file's attribute already holds the name.
