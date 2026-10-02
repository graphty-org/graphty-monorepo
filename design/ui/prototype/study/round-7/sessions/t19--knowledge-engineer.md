# Session: door swipes, pair edges then swipes as nodes -- knowledge engineer (Dr. Min-ji Kim)

Task as given: "You are bringing in the door swipes, and as things stand every single swipe would
be drawn as its own line between a person and a building, which will make a mess. Change it so
each person is linked to each building once, with how often they went in kept on that link. Then
try making each swipe something you can click on by itself, and see what that does to the
picture."

All commands run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t19--knowledge-engineer/.

## Start screen (shots/tasks/t19/01.png)

Thinking aloud: "OK, an import preview for entries.csv, and it already knows the shape:
`person (412) --entries (4,180 edges from 4,212 rows)--> building (9)`. That header line is the
thing I want from every importer -- what goes in, what comes out. It has flagged 25 unknown
person ids and 7 unknown buildings, and it tells me it matched a Number column against a
Category column as text and that 3 keys differ only by leading zeros and were NOT merged. Good.
Not silently de-duplicating is the right default.

What I am asked to do is aggregate the rows per (person, building). In SPARQL I would GROUP BY
?p ?b with COUNT(*). There is a toggle in the toolbar: 'One edge per  Row | Pair'. Pair is
exactly what I mean. And 'Weight: none (each edge counts 1)' next to it -- I expect that to
change once I pick Pair."

## Step 1 -- one edge per pair

    timeout 120 node app-b/study.mjs --try .../t19--knowledge-engineer/01.png task:t19 --click "Pair"

Seen: header becomes `person (412) --entries (1,306 edges from 4,180 of 4,212 rows)--> building
(9)`. A blue note: "One row per pair: each is one edge, its count the rows it merged." The time
column became "time (earliest)" with a "Combine: Earliest and latest" picker, plus a derived
"time (latest)" column, and a derived "count" column already assigned as Weight, "Higher means
Stronger". Report footer: "4,180 entries became 1,306 person-building edges."

Thinking aloud: "That is the GROUP BY, and it shows its work: 4,180 rows that have both ends,
1,306 pairs, the count is on the edge as the weight, and it did not quietly throw away the
timestamps -- it asks me how to combine them and keeps both ends of the range. 1001 to B1, 22
times, first 07:58 on the 2nd, last on the 27th. That is what I would get from my query.

Two quibbles. The footer under the table still says 'Showing the first 7 of 4,212 rows' when
what I am looking at are pairs, not rows -- which number is it, 7 pairs of 1,306? And the
rows with an unknown end show 'left out' in the count column, which is honest, but they
are still listed in the preview among the pairs. I can live with it; it is consistent with the
'Leave out' choice above.

'Higher means Stronger' for a swipe count: fine. I would not have known what 'Farther' or
'Capacity' was for without trying, but I do not need them."

First half done.

## Step 2 -- each swipe as its own thing

Thinking aloud: "'Something I can click on by itself' means the swipe becomes an individual, not
an edge. Reification: the event is a node, with a link to the person and a link to the building.
The toolbar says 'Each row is  a node | an edge'. That is the switch."

    timeout 120 node app-b/study.mjs --try .../02.png task:t19 --click "Pair" --click "a node"

Seen: header `person (412) <--person_id-- entry (4,212) --building_id--> building (9)`. Type
"entry", Key "row number (no Key column)". Column roles changed to "Links to -> person" and
"Links to -> building". The unmatched choices now read "Leave out the link". Footer: "4,212
entries became 4,212 entry nodes; 4,180 have both edges." A warning that without a Key column
notes on entries may move if the row order changes.

Thinking aloud: "Right, this is the event pattern I would model in OWL: an Entry class with two
object properties. The header shows it in one line, which I like. It names the links after the
columns, person_id and building_id -- I would rename those to something like 'by' and 'at', but
that is cosmetic.

What bothers me: the Pair setting just vanished. It is not wrong -- you cannot aggregate rows you
are also keeping as individuals -- but nothing told me my pair edges and their counts were
dropped. If I flip back to 'an edge', do I get Pair back or Row? And I cannot have both: the
aggregate link person-to-building WITH the count, and the individual swipes I can open. That is
the thing I would actually want for an investigation -- summary edges on top, the events
underneath.

Also note: in edge mode an unknown person dropped the whole row; here the entry node still
exists and only the dangling link is left out. So 32 entry nodes are attached to one side only.
It says so ('4,180 have both edges'), so I accept it, but it is a different rule from the edge
mode and that is easy to miss."

## Step 3 -- what it does to the picture

    timeout 120 node app-b/study.mjs --try .../03.png task:t19 --click "Pair" --click "a node" --click "Load"

Seen: graph view, loading card "Reading 3 tables ... 4,633 nodes, 8,392 edges...", progress bar,
Cancel.

    timeout 120 node app-b/study.mjs --try .../04.png task:t19 --click "Pair" --click "Load"

Seen: same card, "421 nodes, 1,306 edges...".

Thinking aloud: "Let me check the arithmetic, because that is where I stop trusting tools.
412 + 9 + 4,212 = 4,633 nodes. Edges: 4,180 entries with both ends times two is 8,360, plus 32
entries with one side, 8,392. Correct. Pair mode: 412 + 9 = 421 nodes, 1,306 edges. Correct.

So the answer to 'what does it do to the picture': ten times the nodes and more than six times
the edges, and the 9 buildings become hubs with hundreds of little entry dots each. I know that
from the counts, not from the canvas -- I never saw the drawing, only the loading card. It did
tell me the size before drawing, and it has a Cancel, which is more than Neo4j Browser does.
What it did not do is warn me before I pressed Load that I was about to go from 421 to 4,633
nodes. At ten million rows that difference matters."

Stopped here: both halves of the task are done and I have the counts to judge the effect.

## Verdict

- Succeeded? Yes. Pair gave one edge per person-building with the count as the weight;
  "Each row is a node" made each swipe its own node linked to its person and building.
- Single Ease Question: 6 of 7. Both switches were in the toolbar in words I would use, and the
  header line told me the result before loading. Lost a point for Pair being silently discarded
  when I switched to nodes, for "first 7 of 4,212 rows" when the table shows pairs, and for no
  side-by-side size warning before Load.
- Would I use it instead of my current tool? For this kind of event data, over writing the
  GROUP BY in SPARQL and then hand-building a CSV for Gephi -- yes, probably, because it shows
  what each choice does to the counts and it does not merge or drop anything without saying so.
  It does not replace my triple store: it still reads CSV, not Turtle, so my types and datatypes
  are flattened before I get here. And I want both views at once -- the counted pair edges and
  the individual swipes underneath -- which this made me choose between.
