# Session: weight repeated person-building pairs and building height, before loading

Participant: Dr. Chen, computational biologist (persona: study/personas/bioinformatics-researcher.md)
Task as given: "The badge-swipe spreadsheets are open on the import page (example data if you do not
work with building access). In every analysis from now on, a person and a building that appear
together many times should count as more tightly tied than a pair seen once, and a taller building
should count for more than a small one. Set that up before you load, then check it took."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t25--bioinformatics-researcher/.

## 01 -- start screen (shots/tasks/r8-t25/01.png)

Import page, three tables: people 412, buildings 9, entries 4,212. Entries is selected. Header line:
"person (411) --entries (4,180 edges from 4,212 rows)--> building (9)". Good, it tells me what it
will build before I build it.

Think-aloud: Not my data, but it is a bipartite network, person to building. What I want is the
multi-edge collapsed into one edge with a multiplicity count, and that count used as the weight.
Right now it says "Weight: none (each edge counts 1)" and "One edge per: Row | Pair". So 4,180 rows
become 4,180 parallel edges. That is the thing I always have to fix in igraph with simplify(g,
edge.attr.comb = "sum"). "Pair" looks like exactly that. The match report is good, by the way: 25
person ids not in people, 7 building ids not in buildings, it tells me the examples, and the
leading-zero warning (0007 vs 7) is the kind of thing that silently ruins a STRING join. I am
leaving those out; that is not my task.

## 02 -- collapse rows into pairs

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--bioinformatics-researcher/02.png task:r8-t25 --click "Pair"

Header now: "1,306 edges from 4,180 of 4,212 rows". Weight reads "count, the number of rows per
pair". A derived "count" column appears marked Weight, with "Higher means: Stronger | Farther |
Capacity", Stronger already chosen. Time became earliest and latest. Toast: "rows with the same two
ends make one edge ... the number of rows per pair, count, is the Weight."

Think-aloud: That is the simplify-with-sum I wanted, done in one click, and it says what it did. 1001
to B1 is 22 rows. "Stronger" is the right reading for a co-occurrence count -- if it had defaulted to
"Farther" (distance) every shortest-path and closeness number would be inverted and nobody would
notice. I like that the choice is spelled out. The left-out rows show "left out" in count rather
than vanishing. Fine.

## 03 -- building height

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--bioinformatics-researcher/03.png task:r8-t25 --click "Pair" --click "buildings"

buildings.csv: bldg (Key), site (Name), floors (Weight). The floors column is already tagged Weight.
B9 has no floors value: "No floors value: its weight reads 1", and the report offers 1 or 0.

Think-aloud: So "taller" means floors, and it had already guessed floors is the node weight. I did
not choose that; it did. That is the kind of thing I am suspicious of, but here it is stated in the
report ("floors is each building's node weight"), so I can see it and could change it. B9 with no
height getting 1 is a judgment call -- 1 floor is the smallest building, which is defensible, and 0
would drop it out of any weighted restart entirely. I leave it at 1 but I would want that in the
methods. I did not need to touch anything on this table.

## 04 -- load and check

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--bioinformatics-researcher/04.png task:r8-t25 --click "Pair" --click "buildings" --click "Load"

Graph view. Summary panel: Nodes 420 (person 411, building 9), Edges 1,306, Direction Directed,
Weight "count, stronger", Node weight "floors (building)", Isolated nodes 14.

Think-aloud: 1,306 matches the import page. 411 + 9 = 420. Both weights are on the summary, so it
took at the graph level. 14 isolated nodes -- presumably people whose only rows were the left-out
ones; I would click that later. Directed, person to building. For a bipartite co-occurrence network I
would normally want undirected, and I did not notice the Direction switch at the bottom of the import
page until now. Not what I was asked, so I leave it, but it would matter for PageRank.

## 05, 06 -- does an analysis actually pick it up?

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--bioinformatics-researcher/05.png task:r8-t25 --click "Pair" --click "buildings" --click "Load" --click "Analyze"
    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--bioinformatics-researcher/06.png task:r8-t25 --click "Pair" --click "buildings" --click "Load" --click "Analyze" --click "PageRank"

(The tool reported two controls called "Analyze" and two called "PageRank"; it clicked the first of
each, which is what I meant.)

The Analyze list already offers "Total count in and out -- the sum of count over each node's edges",
so it knows the column. PageRank opens with Weight "count (loaded weight)", Higher means "Stronger",
"Loaded weight: count, stronger", Node weight "floors (building, loaded)", "Restart weights: each
building weighs its floors; each person weighs 1 (no weight column)". Direction Follow, damping 0.85.

Think-aloud: This is what "check it took" means to me: the algorithm dialog shows the parameters it
will run with, and both of mine are there as defaults, labeled "loaded". I can quote that in a
methods section: personalized PageRank, damping 0.85, edge weight = swipe count, restart vector
proportional to floors. I did not press Run; the task was to set it up and check.

## Verdict

Succeeded: yes. Pair collapse made count the edge weight, read as stronger; floors was already the
building node weight; both show on the graph summary after loading and as the defaults in PageRank.

Single Ease Question: 6 of 7. Two clicks did the work. I lose a point because floors was made the
node weight without my asking, and I only learned it by opening the buildings table -- if I had loaded
straight from entries I would not have known. And the direction default (Directed) is a trap for a
bipartite network that the task did not ask me to look at.

Would I use this instead of my current tool? For this step, it beats what I do now -- in igraph it is
simplify() with an edge.attr.comb argument I look up every time, and Cytoscape has no clean way to
collapse duplicate edges into a weight at import. But I still need to know I can get the node table
with the PageRank column back out as a TSV and rerun it from a script. Until then it is a nicer place
to set up and look, not my pipeline.

## Problems noticed

- The building node weight (floors) was assigned automatically and is only visible if you open the
  buildings table or read the summary after loading; the entries page I started on did not mention
  it.
- A building with no floors value silently reads 1. It is disclosed in the report with a 1/0 choice,
  which is good, but it should travel into the analysis description so it ends up in the methods.
- Direction defaulted to Directed for a person-to-building network; the switch is at the very bottom
  of the import page, easy to miss, and changes PageRank.
