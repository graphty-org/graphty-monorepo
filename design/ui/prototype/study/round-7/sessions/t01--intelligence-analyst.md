# Session: first look at an inherited network -- Marcus, criminal intelligence analyst

Task as given: "A colleague handed you this network and you are about to build on it. Before you
trust anything in it, work out what you actually have: how many characters and connections,
whether it all hangs together as one piece, and whether anything about how it came in looks
wrong."

All commands ran from design/ui/prototype. Renders are in
tmp/round-7-sessions/t01--intelligence-analyst/.

## Start screen (shots/tasks/t01/01.png)

"Somebody already colored this by 'PageRank' and sized it by degree. That is my colleague's
opinion, not the data. I want counts first. There's a 'Data' button on the left -- that's where
I'd expect the numbers."

## Step 1 -- Data

    timeout 120 node app-b/study.mjs --try .../01.png task:t01 --click "Data"

"Good. Right side: Nodes 77, Edges 254, Undirected, Connected components 1. Left side: the
source is miserables.gexf, 77 nodes, and the edges file is '254 rows, 254 edges' -- so nothing
got thrown out on the way in. That's three of my four questions in one click. There's a little
stair-step chart with '0 / degree 0' next to it -- no idea what the 0 is telling me. There's also
'betweenness' sitting under 'Other attributes'. Somebody computed that before it got to me. With
what? On which version of the data? And '4 more readings not computed' -- what's missing?"

## Step 2 -- "4 more readings not computed"

    timeout 120 node app-b/study.mjs --try .../02.png task:t01 --click "Data" --click "4 more readings not computed"

"That is not what I clicked for. The left side flipped back to the Graph list and a menu popped
open with 'Add node...' highlighted. I don't want to add anything. 'Compute the overview' might
be the missing readings, but it's in the same menu as 'Clear graph data', so I'm not touching it
until I know what it does. Escape."

## Step 3 -- "from miserables.gexf"

    timeout 120 node app-b/study.mjs --try .../03.png task:t01 --click "Data" --click "from miserables.gexf"

"This is the import screen. Better. 'Match report: nodes -- 77 rows; every id is unique.' No
duplicate entities -- in my world that's the first thing that goes wrong, same guy under three
spellings. Group came in as text, fine. 'CountessdeLo' looks squashed but that's the file, not
the tool."

## Step 4 -- edges table

    timeout 120 node app-b/study.mjs --try .../04.png task:t01 --click "Data" --click "from miserables.gexf" --click "edges"

"'254 rows; every edge has both ends.' No dangling links. Good. But up top it says 'Weight: none
(each edge counts 1)'. The summary on the main screen said 'Weight: value, stronger'. And there's
a 'value' column right here with 8s and 10s in it -- how many chapters two characters share. So
is the tool using those counts or not? Side panel says one thing, this says another. Which one's
lying? Also the columns say 'From -> node' and 'To -> node' with arrows, and the summary says
undirected. Probably fine -- 'As the file says' -- but the arrows made me look twice."

## Step 5 -- click the weight note

    timeout 120 node app-b/study.mjs --try .../05.png task:t01 --click "Data" --click "from miserables.gexf" --click "edges" --click "Weight: none (each edge counts 1)"

"Nothing. It's just text. Can't change it, can't ask it."

## Step 6 -- click "value, stronger" in the summary

    timeout 120 node app-b/study.mjs --try .../06.png task:t01 --click "Data" --click "value, stronger"

"Took me to the same edit screen, on the nodes table. Doesn't answer the question."

## Step 7 -- hover "value, stronger"

    timeout 120 node app-b/study.mjs --try .../07.png task:t01 --click "Data" --hover "value, stronger"

"Tooltip: 'Set when the data was loaded: a higher value means a stronger tie. Every run uses it
unless it picks another. Change it on the Data page.' I was just on the Data page and it said
weight none. Two screens, two answers about the same setting. If I run 'find the middleman' on
this, I need to know whether ten shared chapters counts more than one. I'm stopping here."

## What I'd tell the sergeant

- 77 characters, 254 associations, undirected.
- All one piece: one connected component.
- Import looks clean: every id unique, every link has both ends, 254 rows in and 254 links out.
- Things I don't trust yet: (1) the tool contradicts itself on whether the link strength (the
  'value' column, shared chapters) is being used -- summary says yes, import screen says 'Weight:
  none'; (2) there's a betweenness column that came in with the file, computed by somebody, with
  nothing telling me how or when; (3) the chart was handed to me already colored by PageRank,
  which is somebody's choice, not a fact about the data.

## Debrief

Did I succeed? Mostly. The counts and the "is it one piece" answer were on the first screen I
opened -- that part was quick and I'd repeat those numbers. The import check was good once I
found it behind a link. But the one thing that "looks wrong" might be the tool, not the data,
and I couldn't settle it.

Single Ease Question: 5 out of 7. The numbers were easy. The weight contradiction, and the
"readings not computed" link that opened an unrelated menu with "Add node" lit up, cost me
trust.

Would I use this instead of what I use now? For this job -- checking what a colleague handed me
-- it beats Excel: the match report ("every id is unique", "every edge has both ends") is
exactly what I do by hand with pivots and VLOOKUPs. But I would not build on it until the
weight question has one answer. If two screens disagree about how the links are counted, I
can't defend any score that comes out of it on the stand. And before any real case goes in, I
still need someone to tell me "Local only" means what I hope it means.
