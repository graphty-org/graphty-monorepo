# Session: door swipes, one link per pair, then each swipe as its own thing

Participant: Chris, ML engineer on recommendations (persona file study/personas/ml-engineer-recsys.md)

Task as given: "You are bringing in the door swipes, and as things stand every single swipe would
be drawn as its own line between a person and a building, which will make a mess. Change it so
each person is linked to each building once, with how often they went in kept on that link. Then
try making each swipe something you can click on by itself, and see what that does to the
picture."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t19--ml-engineer-recsys/.

## Start screen (shots/tasks/t19/01.png)

Think-aloud: "OK, this is an import preview, not the graph yet. Good, I would rather fix this
before it draws anything. The header line reads like a schema: person (412) --entries (4,180
edges from 4,212 rows)--> building (9). That is exactly the hairball they warned me about, 4k
parallel edges onto nine buildings. In my world this is the interaction table: user, item,
timestamp, and I always aggregate to (user, item, count) before I build the adjacency. There is a
row of toggles: 'Each row is  a node | an edge', and 'One edge per  Row | Pair'. 'Pair' is the
groupby. 'Weight: none (each edge counts 1)' -- noted, I want that to become the count."

## Step 1: one edge per pair

    timeout 120 node app-b/study.mjs --try .../t19--ml-engineer-recsys/01.png task:t19 --click "Pair"

Think-aloud: "That is the groupby. Header now says 1,306 edges from 4,180 of 4,212 rows, and the
match report says 4,180 entries became 1,306 person-building edges. Denominators are there, which
I appreciate -- 32 rows dropped because one end is not in the people or buildings table, and it
tells me which. A banner says 'one row per pair: each is one edge, its count the rows it merged.'
It added a derived 'count' column, already tagged as Weight, with 'Higher means Stronger'
selected, so it will not treat 22 visits as a long distance. Good, that is the default I would
have to otherwise remember to flip. It also split time into earliest and latest with a Combine
dropdown -- nice, I did not ask for that but I would have lost the timestamp otherwise. That is
the first half done; I did not even need to look for an aggregate function."

Small gripes: "the weight chip says 'Weight: none' before, and now the count column header says
Weight, but the top bar no longer repeats it, so I had to find the column to confirm. And
'left out' in the count cell for the bad rows is fine but I had to read the report to know why."

## Step 2: each swipe as its own clickable thing

    timeout 120 node app-b/study.mjs --try .../t19--ml-engineer-recsys/02.png task:t19 --click "Pair" --click "a node"

Think-aloud: "'Something you can click on by itself' -- an edge you can click is still an edge,
so I read this as making the swipe an entity, i.e. the event as a node, the bipartite-to-tripartite
trick. 'Each row is a node' is the obvious switch. Header now: person (412) <--person_id-- entry
(4,212) --building_id--> building (9). The id columns turned into 'Links to -> person' and 'Links
to -> building'. Match report: 4,212 entries became 4,212 entry nodes; 4,180 have both edges.
Key is the row number since there is no id column, and it warns that notes on entries will move
if the row order changes. Fair warning, that is the same thing that bites me when I key on a
DataFrame index."

"Note: the Pair setting vanished when I switched to nodes. That makes sense -- you cannot merge
rows that are each their own node -- but it did not say so. If I flip back to 'an edge' I would
want to know whether it remembers Pair."

## Step 3: see what that does to the picture

    timeout 120 node app-b/study.mjs --try .../t19--ml-engineer-recsys/03.png task:t19 --click "Pair" --click "a node" --click "Load"
    timeout 120 node app-b/study.mjs --try .../t19--ml-engineer-recsys/04.png task:t19 --click "Pair" --click "Load"

Think-aloud: "Loading with swipes as nodes: 'Reading 3 tables ... 4,633 nodes, 8,392 edges' with
a progress bar and a Cancel. Loading the pair version instead: '421 nodes, 1,306 edges'. So
swipes-as-nodes is roughly 11x the nodes and 6x the edges -- 412 + 9 + 4,212 nodes, and two edges
per swipe (8,392 = 2 x 4,180 plus 32 one-ended rows). That is the honest answer to 'what does it do
to the picture': it is a much bigger, mostly-leaf graph, every person now a star of swipe nodes
hanging off them. Progress with numbers, not a bare spinner -- that is what I want to see."

"What I did not get is the actual picture. Both loads stayed on the progress card in what I saw,
so I am reasoning from the counts, not from a render. I also had to load twice and compare the
two numbers in my head; the import screen could have shown 'this choice: 4,633 nodes / 8,392
edges' next to the toggle before I committed, the way it did for the pair count in the header
line."

## Outcome

Did I succeed? Yes on the first part, clearly: one edge per person-building pair, with the visit
count kept as a weight, and the time range kept too. Mostly on the second: I made each swipe a
node and I can see from the counts what it does to the graph size, but I never saw the rendered
picture, so "see what that does to the picture" is half-answered.

Single Ease Question: 6 of 7. The groupby was one click and the denominators were all there. Lost
a point for not seeing the result render and for the Pair setting silently disappearing when I
switched to nodes.

Would I use this instead of my current tool? For this step, maybe. In pandas this is
`df.groupby(['person_id','building_id']).agg(count=('time','size'), first=('time','min'),
last=('time','max'))`, one line, and I would still do it there for anything going into a
pipeline. What this does better than my notebook is the match report -- the 25 unknown people,
7 unknown buildings and the leading-zero key mismatch are things I would only find after the join
silently dropped them. If it reads Parquet and lets me export the aggregated edge table back out
with my ids intact, I would use it for the look-before-you-load step. If not, it is a nice
preview of a groupby I already know how to write.
