# Session: weights before loading -- the Gephi holdout (Dr. Mara Lindqvist)

Task as given: "The badge-swipe spreadsheets are open on the import page (example data if you do
not work with building access). In every analysis from now on, a person and a building that appear
together many times should count as more tightly tied than a pair seen once, and a taller building
should count for more than a small one. Set that up before you load, then check it took."

Start screen: shots/tasks/r8-t25/01.png. Renders: tmp/round-8-sessions/r8-t25--gephi-holdout/NN.png.
All commands run from design/ui/prototype.

## 01 -- start screen (shots/tasks/r8-t25/01.png)

Think-aloud: "Right, an import screen with three tables. entries is selected, person_id From, building_id
To. Good, I can read that. Top right of the toolbar strip: 'Weight: none (each edge counts 1)'.
That's the problem in one line. And 'One edge per: Row | Pair'. In Gephi the CSV importer has 'merge
strategy' for parallel edges -- sum, count, whatever -- and I always forget where it is. This looks
like that. A pair seen many times should be tighter, so I want one edge per pair with the count as
the weight. Pair."

## 02 -- One edge per Pair

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--gephi-holdout/02.png task:r8-t25 --click "Pair"

Think-aloud: "OK. It made a derived 'count' column, already tagged Weight, Higher means Stronger.
Time got split into earliest and latest -- sensible, I didn't have to choose. 'Makes' line went from
4,180 edges to 1,306 edges from 4,180 of 4,212 rows. 1001-B1 is 22 swipes. The 'left out' rows are
the people and buildings that don't exist, it already told me that. The toast spells it out and
has an Undo. Fine. 'Stronger / Farther / Capacity' is an odd trio of words but the meaning is
clear enough: stronger is a weight, not a distance. Half the tools I've used never ask, and then
shortest path treats my tie strength as a length. Credit for asking."

## 03 -- buildings table

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--gephi-holdout/03.png task:r8-t25 --click "Pair" --click "buildings"

Think-aloud: "Now 'taller counts for more'. buildings has a floors column and -- it's already
marked Weight. I didn't do that; it guessed. I'm not sure I like it guessing, but it's the right
guess and it's visible in the column header, and the report says 'floors is each building's node
weight'. B9 has no floors value and 'its weight reads 1', with a 1 / 0 toggle. One floor for an
unknown building is a choice I'd want in the methods footnote. Zero would make it vanish from
anything weighted by node, which is worse. I'll leave 1 and remember it."

"What does a node weight even do here, though? Gephi has no such thing. I'll find out after loading."

## 04 -- people table

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--gephi-holdout/04.png task:r8-t25 --click "Pair" --click "people"

Think-aloud: "Checking the person side doesn't have something weighted by accident. 'person has no
weight column: each person weighs 1.' Good. It also flagged a repeated key (1188 twice, kept the
first) and 14 people with no entries. That's the sort of thing Gephi's importer just swallows."

## 05 -- Load

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--gephi-holdout/05.png task:r8-t25 --click "Pair" --click "Load"

Think-aloud: "Loaded. Summary on the right: 420 nodes, 411 person, 9 building, 1,306 edges,
Directed, Weight 'count, stronger', Node weight 'floors (building)', 14 isolated. Counts match what
the import page promised. That's my check, mostly. 420 = 411 + 9, and the 14 isolated are the
people with no entries. Good."

"Directed, person to building. For a bipartite swipe network I'd usually go undirected. Not what
I was asked, so I leave it, but I note it."

## 06 -- the edge table

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--gephi-holdout/06.png task:r8-t25 --click "Pair" --click "Load" --click "Table"

Think-aloud: "I don't trust a summary without the table. 1,306 edges, 'one per person and building',
count column sorted descending, 1001-B1 at 22. That's what I set. Fine. Only four rows on screen,
which is a toy view, but it's sorted on the column I care about."

## 07 -- does an analysis pick it up?

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--gephi-holdout/07.png task:r8-t25 --click "Pair" --click "Load" --click "Analyze"

Think-aloud: "'In every analysis' is the real claim. A list: Louvain, PageRank, shortest path,
'Links total (count)', 'Total count in and out' -- so weighted degree exists, named after my
column. 'Links' for degree is a new word I'll have to translate for students. Let me open
PageRank and see whether it actually uses the weight."

## 08 -- PageRank settings

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--gephi-holdout/08.png task:r8-t25 --click "Pair" --click "Load" --click "Analyze" --click "PageRank"

Think-aloud: "Weight: 'count (loaded weight)', Stronger. Node weight: 'floors (building, loaded)'
-- and the help says 'Restart weights: each building weighs its floors; each person weighs 1'. So
the node weight becomes the teleport vector. That's personalized PageRank. Defensible for 'taller
counts for more', but that's a real methodological choice made by default, and I'd want to be
asked rather than inherit it. Mixing people at 1 with a 12-floor building in the same restart
vector skews everything toward B4. At least it tells me, in plain words, on the dialog itself,
with damping 0.85 showing. Gephi's PageRank doesn't even tell me whether it used edge weights
unless I tick the box."

"So yes, it took: the analysis defaults to my weights."

## 09 -- revisit the node weight from the summary link

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--gephi-holdout/09.png task:r8-t25 --click "Pair" --click "Load" --click "floors (building)"

Think-aloud: "The link takes me back to an 'Edit: buildings' screen, same table, Apply greyed until
I change something. So it's editable after load without re-importing. Good. I'm done."

## Verdict

- Succeeded? Yes. Edges merged per person-building pair with the swipe count as a stronger-is-
  closer weight; buildings weighted by floors; the summary, the edge table and the PageRank dialog
  all show both weights in force.
- Single Ease Question: 6 of 7. Two clicks to set it, and the floors weight was already set,
  which I only found because I went looking.
- Would I use this instead of Gephi? Not instead. For this job -- aggregating a raw swipe log into
  weighted ties at import -- it's better than Gephi's importer, which hides the merge strategy and
  never asks whether a weight is a strength or a distance. But it guessed the node weight without
  asking, and it quietly turns that node weight into PageRank restart weights, which is a methods
  decision I would have to defend to a reviewer. And none of my coauthors can open what it saves.
  I'd use it to prepare and check the data; the paper figure stays in Gephi for now.

## Problems noticed

- The floors column was marked as node weight automatically; nothing on the entries page said a
  node weight had been set, so a user who never opens the buildings table would not know.
- Node weight is used as PageRank restart weights by default -- a personalized PageRank the user
  did not ask for. The dialog says so, but only if you open it.
- A missing floors value defaults to 1, silently mixing "unknown" with "one floor".
- "Higher means: Stronger / Farther / Capacity" and "Links" for degree are new vocabulary.
- Import defaults to Directed for a two-mode person-building network.
