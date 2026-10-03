# Session: weights on badge-swipe data, before loading -- Dr. Min-ji Kim (knowledge engineer)

Task as given: "The badge-swipe spreadsheets are open on the import page (example data if you do
not work with building access). In every analysis from now on, a person and a building that
appear together many times should count as more tightly tied than a pair seen once, and a
taller building should count for more than a small one. Set that up before you load, then
check it took."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t25--knowledge-engineer/.

## 01 -- start screen (shots/tasks/r8-t25/01.png)

"I do not work with building access, so example data it is. Three tables: people 412,
buildings 9, entries 4,212. The entries table is selected. Good: there is a header line that
actually states what it will make -- person (411) --entries (4,180 edges from 4,212 rows)-->
building (9). That is the kind of statement I want before an import, not after.

Two things jump out. 'Weight: none (each edge counts 1)' -- that is exactly my problem: right
now a pair seen 22 times is 22 separate edges, each worth 1, which is not the same thing as one
tie of strength 22. And next to it, 'One edge per: Row | Pair'. Pair is the aggregation I want.
I would do this in SPARQL with a GROUP BY and COUNT; let us see if Pair is that."

## 02 -- One edge per: Pair

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--knowledge-engineer/02.png task:r8-t25 --click "Pair"

"Yes. It is a GROUP BY. 1,306 edges from 4,180 of 4,212 rows. A banner: 'One row per pair:
each is one edge, its count the rows it merged.' It added a derived 'count' column, marked
derived, mapped as Weight, with 'Higher means Stronger | Farther | Capacity' and Stronger
already picked. That is the right default for co-occurrence, and I appreciate that it asks
the question at all -- half the tools I have used silently treat a weight as a distance in
shortest path and a strength in community detection. The time column became earliest and
latest, also marked derived. The toast says the old one-edge-per-row setting is set aside, with
Undo. Fine.

Rows with an unmatched end show 'left out' in count. That is consistent with the match report:
32 rows dropped, named, with examples. I can defend that number."

## 03 -- buildings table

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--knowledge-engineer/03.png task:r8-t25 --click "Pair" --click "buildings"

"Height. There is no 'height' column; there is 'floors'. Floors is a reasonable proxy for taller,
I will take it. And it is ALREADY mapped as Weight. I did not do that. Somebody -- the tool --
decided floors is the node weight because it is the only numeric column. Here it happens to be
right, but I want to know when the tool has guessed for me; nothing on the column says
'auto' the way the CSV dialect chip does. The match report does say 'floors is each building's
node weight', so at least it is stated.

B9 has no floors value and 'its weight reads 1', with a 1 / 0 choice. I do not like either.
1 means 'a one-story building', which is a fact I do not have; 0 means it does not count at
all. What I want is 'unknown' -- leave it out of the weighting, or flag it. I leave it at 1
because that is the less destructive of the two, and I note it."

## 04 -- Load

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--knowledge-engineer/04.png task:r8-t25 --click "Pair" --click "buildings" --click "Load"

"Loaded. The right panel, Data tab, Summary: Nodes 420 (person 411, building 9), Edges 1,306,
Direction Directed, Weight 'count, stronger', Node weight 'floors (building)', Isolated nodes 14.
So both settings took and are visible as properties of the graph, not buried in some
algorithm dialog. That is the check I was asked for.

Known-answer check, though: the people table says 412 and the graph says 411 person. Where is
the 412th person? The import header said 411 from the start and I did not see a line in the
match report explaining it -- maybe a duplicate key, maybe a blank id. One unexplained count.
I would go looking before I trusted anything downstream. And 14 isolated nodes -- people
who never swiped, presumably, but it does not say.

Also 'Directed'. A person enters a building; I would not run anything where direction between
a person and a building matters. Not my task, but the default is a choice someone made."

## 05 -- clicking 'floors (building)' in the summary

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--knowledge-engineer/05.png task:r8-t25 --click "Pair" --click "buildings" --click "Load" --click "floors (building)"

"It takes me back into the buildings table editor ('Edit: buildings', Apply off, 'Nothing has
changed yet'). Good: the same screen I set it up in, so I can see the source of the setting.
I expected a read-only explanation, but this is fine."

## 06 / 07 -- does an analysis actually use it?

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--knowledge-engineer/06.png task:r8-t25 --click "Pair" --click "buildings" --click "Load" --click "Analyze"
    (tool note: "Analyze" matched 2 controls; clicked the first)
    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--knowledge-engineer/07.png task:r8-t25 --click "Pair" --click "buildings" --click "Load" --click "Analyze" --click "PageRank"
    (tool note: "PageRank" matched 2 controls; clicked the first)

"'Every analysis from now on' -- a summary line is a promise; I want to see an algorithm honor
it. Analyze list: there are now 'Total count in and out' and 'Total count in' entries next to
'Links total (count)'. Careful: 'count' is now both my weight column's name and the word the
tool uses for unweighted degree. 'Links total (count)' versus 'Total count in and out' -- I had to
read the descriptions to tell degree from weighted degree. Name collision; my fault for
accepting the derived name, but the tool chose it.

PageRank: Weight is pre-filled 'count (loaded weight)', Higher means Stronger, 'Loaded weight:
count, stronger.' Node weight is pre-filled 'floors (building, loaded)', explained as restart
weights: each building weighs its floors, each person weighs 1 because people have no weight
column. That is personalized PageRank, correctly described, and it tells me what it did with the
nodes that have no value. That is the honest version. I did not run Louvain to check it too;
one algorithm showing 'loaded' is enough for me to believe the setting is graph-wide."

## Result

- Succeeded? Yes. Pair aggregation with count as a 'stronger' weight, floors as building node
  weight, both set before Load, both visible after Load in the graph summary and pre-filled in
  PageRank labeled 'loaded'.
- Single Ease Question: 6 of 7. It was almost too easy -- the node weight was already set for
  me, which is why it is not a 7: I did not choose it, the tool did, and it did not mark the
  guess.
- Would I use this instead of my current tool? For this job -- tabular access logs, counts, a
  weight that means strength -- yes, over a notebook with pandas GROUP BY and networkx, because
  it states what it did at every step and carries the weight's meaning into the analysis. For
  my knowledge graph, no: this is still CSV tables, not RDF. And before I trusted it I would
  need the 412-versus-411 people discrepancy explained.
