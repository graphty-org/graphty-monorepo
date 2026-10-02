# Session: door-swipe weights at import -- Min-ji Kim, knowledge graph engineer

Task as given: "In the door-swipe data, a person who went into a building 40 times should be
treated as more tightly tied to it than someone who went in once, in every later analysis. Also,
taller buildings matter more. Set that up as you bring the data in."

All commands were run from design/ui/prototype. Renders are in tmp/round-7-sessions/t20--knowledge-engineer/.

## Start screen (shots/tasks/t20/01.png)

"An import mapping screen with three tables: people, buildings, entries. The entries table is set up as
an edge from person_id to building_id, with a 'Makes' line in plain text: person (412) --entries
(4,180 edges from 4,212 rows)--> building (9). I like that line. It is the nearest thing to a
schema statement I have seen in a viewer. The match report says what it is leaving out: 25 people
and 7 buildings not found, 32 rows. It also shows the leading-zero key mismatch and says it is NOT
merging those keys. Good. That is the honesty I look for.

On the right it says 'Weight: none (each edge counts 1)'. So right now every swipe is its own
edge, and someone who went in 40 times has 40 parallel edges. That is not a weight, it is a
multigraph. There is a toggle, 'One edge per Row / Pair'. Pair is what I want."

## Step 1 -- collapse to one edge per pair

    timeout 120 node app-b/study.mjs --try .../t20--knowledge-engineer/01.png task:t20 --click "Pair"

"Now it says 1,306 edges from 4,180 of 4,212 rows, 'each is one edge, its count the rows it
merged'. A derived 'count' column appeared, already mapped to Weight, with 'Higher means:
Stronger / Farther / Capacity' and Stronger selected. That is precisely the distinction I care
about. A count of co-occurrences is a strength, not a distance, and most tools never ask. Time is
combined as earliest and latest, and that is shown too. The rows it dropped read 'left out' in the
count column, not zero. Correct.

I did nothing to choose 'Stronger'. It was the default. Here the default is right, but I'd want to
know it is a default and not a guess about my data."

## Step 2 -- the buildings table, for height

    timeout 120 node app-b/study.mjs --try .../02.png task:t20 --click "Pair" --click "buildings"

"buildings: bldg as Key, site as Name, floors as Weight. Taller means more floors, which is a
proxy. Nobody gave me heights in meters, so floors it is. It was already mapped to node weight, so
there was nothing for me to do. The report says 'floors is each building's node weight', in words.

Two complaints. First, B9 has no floors value and the tool says its weight 'reads 1', with a 1/0
toggle. That is imputation. Neither 1 nor 0 means 'unknown'. I'd rather leave the node unweighted
or have it flagged in every analysis. I left it at 1 because there was no third option, and
I am not happy about it. Second, 'site' is the Name, so three labels cover nine buildings. It
warns me about that, which is honest, but it is a bad default when 'bldg' is right there."

## Step 3 -- load

    timeout 120 node app-b/study.mjs --try .../03.png task:t20 --click "Pair" --click "buildings" --click "Load"

"Progress dialog: 421 nodes, 1,306 edges. 412 + 9 = 421, and 1,306 matches the preview. The counts
agree with what it promised."

## Step 4 -- does 'every later analysis' see it?

    timeout 120 node app-b/study.mjs --try .../04.png task:t20 --click "Pair" --click "buildings" --click "Load" --click "Analyze"

"The graph summary on the right reads Weight: count, stronger and Node weight: floors (building).
That is the statement I wanted: a property of the graph, not a setting buried in a dialog.
The Analyze list has 'Total count -- the sum of count over each node's edges', so it knows my
weight column by name. 'Isolated nodes 14' -- I'd click that next to find out whether those are the
people whose swipes were all left out. A number like that should come with a reason."

    timeout 120 node app-b/study.mjs --try .../05.png task:t20 --click "Pair" --click "buildings" --click "Load" --click "Analyze" --click "PageRank"

"PageRank opens with Weight = count (loaded weight), Stronger, and the line 'Loaded weight:
count, stronger.' Node weight = floors (building, loaded), used as restart weights: each
building weighs its floors, each person weighs 1. So 'matters more' becomes a personalized-
PageRank teleport vector. That is a defensible reading, and it says so in a sentence rather than
hiding it. But it puts persons at 1 and buildings at 1 to 12 on the same scale, which I did not
ask for. A 1-floor building and a person now count the same. I'd want to say 'persons: no
restart weight' explicitly. Direction is Follow, person to building, so rank pools in buildings.
That is fine for this question, and I can change it.

I did not run it. The setup is done and it is visibly carried into the analysis."

## Verdict

- Succeeded: yes. One edge per person-building pair, weighted by swipe count as a strength, and
  building floors as node weight, both shown in the graph summary and picked up by PageRank as the
  loaded defaults.
- Single Ease Question: 6 of 7. One click did the main thing. The rest was already right,
  which is suspicious and convenient in equal measure. I knocked a point off for the forced 1-or-0
  on the missing floors value and for person nodes silently getting weight 1 in PageRank.
- Would I use it instead of my current tool? For this kind of tabular source, yes, over
  pandas plus Gephi. The import says what it merged, what it dropped and why, and the weight
  semantics (stronger vs farther) are explicit, which Gephi never asks. For my actual knowledge
  graph, no, not until it reads Turtle or at least a subject-predicate-object CSV with literals
  kept off the canvas. This was a property-graph task, and it handled it like one.

## Problems noted

1. Missing node-weight value is imputed as 1 or 0. There is no "unknown / leave unweighted" choice
   (buildings table, match report).
2. Person nodes get a node weight of 1 in PageRank's restart weights alongside buildings' floors,
   so the two types share one scale that nobody set (PageRank dialog).
3. Name defaults to 'site', which repeats, instead of the unique key 'bldg' (buildings table).
4. 'Higher means: Stronger' was preselected with no sign that it was a default rather than read
   from the data (entries table, Pair mode).
5. 'Isolated nodes 14' after load comes with no reason on the summary (graph summary).
