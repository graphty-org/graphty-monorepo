# Session: bring in a coauthor network and look at one person -- Chris, ML engineer (recommendation systems)

Task as given: "A colleague sent a small, ready-made network of who wrote papers with whom. Bring it
in and look at one person in it."

Renders are in design/ui/prototype/tmp/round-7-sessions/t26--ml-engineer-recsys/. All commands
were run from design/ui/prototype.

## Step 1 -- the start screen (shots/tasks/t26/01.png)

Think-aloud: "OK, so the file is already in front of me as a preview -- coauthors.json, JSON
node-link, sniffed automatically. 'Coauthors: 12 nodes, 16 edges' up top, which is the first thing
I want: the denominator. The id column is marked Key and kept as res_0001 etc, so it did not
rename my ids. Good. 'Every key is unique.' Direction 'As the file says'. Fine. 12 rows, I am not
going to fiddle with anything. Load."

## Step 2 -- Load

    timeout 120 node app-b/study.mjs --try .../02.png task:t26 --click "Load"

Saw: the graph view, 12 gray dots in a ring, no labels. Right panel says Nodes 12, Edges 16,
Undirected, Weight "weight, stronger". "Local only" in the top bar.

Think-aloud: "Counts match the preview, good. 'Local only' -- I'd hover that later, that's the
thing my privacy review would ask about. But the canvas is twelve unlabeled dots. Which one is a
person I care about? I'd normally just search the id. There's a 'Find rows and notes' box, but
I'd rather see the rows. There's a 'Table' toggle at the bottom."

## Step 3 -- open the table

    timeout 120 node app-b/study.mjs --try .../03.png task:t26 --click "Load" --click "Table"

Saw: a node table under the canvas: id, name, field, h_index. "12 nodes from coauthors.json".

Think-aloud: "That's what I want. Rows with my columns. I'll take the first one, Wei Diallo,
machine learning, h-index 47 -- closest to my world."

## Step 4 -- click the row

    timeout 120 node app-b/study.mjs --try .../04.png task:t26 --click "Load" --click "Table" --click "Wei Diallo"

Saw: the top node got a ring, a label "Wei Diallo, 3 connections" on the canvas, the right panel
switched to the node: id res_0001 (Key), name Wei Diallo, field machine learning, h_index 47. A
row of five icon buttons appeared above the bottom toolbar.

Think-aloud: "Good -- row to node and node back to its attributes, that is the round trip I always
check. 3 connections is degree, fine. Strictly this is 'looking at one person' already. But what I
actually want is the ego graph. Those icons have no text. First one looks like a target. Hover."

## Step 5 -- hover the first icon

    timeout 120 node app-b/study.mjs --try .../05.png task:t26 --click "Load" --click "Table" --click "Wei Diallo" --hover "Neighborhood"

Saw: tooltip "Neighborhood". It sits on top of the "Wei Diallo, 3 connections" label so both are
half unreadable.

Think-aloud: "Neighborhood. That's my k-hop button. Tooltip collides with the node label, minor."

## Step 6 -- click Neighborhood

    timeout 120 node app-b/study.mjs --try .../06.png task:t26 --click "Load" --click "Table" --click "Wei Diallo" --click "Neighborhood"

Saw: a popover "Neighborhood of Wei Diallo": Hops 1 / 2 / 3, Direction "Undirected graph", text
"Selected: Wei Diallo and every node within 1 hop.", buttons "Add as steps" and "Filter to
neighbors". The table closed.

Think-aloud: "Hops 1-2-3, that's exactly the knob. It says it SELECTED Wei and her 1-hop
neighbors, but the left panel still says Selection 1 and I can't see anything highlighted on the
canvas -- so did it select 4 nodes or 1? It should show me 'Selection 4'. Also why did my table
close? I'll go 2 hops and filter, that's the ego graph I'd pull in networkx."

## Step 7 -- 2 hops, Filter to neighbors

    timeout 120 node app-b/study.mjs --try .../07.png task:t26 --click "Load" --click "Table" --click "Wei Diallo" --click "Neighborhood" --click "2" --click "Filter to neighbors"

Saw: toast "Added filter step: Neighbors of Wei Diallo, 1 to 2 hops" with Undo; the top bar chip
now reads "Filtered: neighbors of Wei Diallo". The canvas still shows what looks like the same 12
dots and 16 edges.

Think-aloud: "OK it says filtered. But I count the same twelve dots. Either her 2-hop
neighborhood is basically the whole graph -- plausible at 12 nodes -- or nothing happened. The
chip doesn't tell me 'N of 12 nodes'. That's the denominator I need. Let me try 1 hop, which
can't be the whole graph with degree 3."

## Step 8 -- 1 hop, Filter to neighbors

    timeout 120 node app-b/study.mjs --try .../08.png task:t26 --click "Load" --click "Table" --click "Wei Diallo" --click "Neighborhood" --click "Filter to neighbors"

Saw: toast "Added filter step: Neighbors of Wei Diallo, 1 hop". Canvas: still all 12 dots and all
the edges, identical to before.

Think-aloud: "That's wrong. Degree 3, one hop, should be 4 nodes. Still twelve on screen. So the
filter isn't doing anything I can see. Let me click the filter chip to see what it thinks it did."

## Step 9 -- click the filter chip

    timeout 120 node app-b/study.mjs --try .../09.png task:t26 --click "Load" --click "Table" --click "Wei Diallo" --click "Neighborhood" --click "2" --click "Filter to neighbors" --click "Filtered: neighbors of Wei Diallo"

Saw: a completely different graph. Title "Transfers, March 2026", chip "812 of 3,000 nodes",
sources accounts-2026-03.csv and transfers-2026-03.csv, a hex-binned blob, filters "amount is at
least 1,000" and "kind is not merchant", a table of ACC-... accounts.

Think-aloud: "...What? Where are my coauthors? This is someone's bank transfers. I clicked my
filter and got a different dataset. That's the kind of thing that makes me close the tab -- if it
can swap my data under me I can't trust anything it shows. Interesting that THIS chip says '812
of 3,000 nodes' -- that's exactly what my coauthor chip should have said. I'm stopping here."

## Outcome

- Did I succeed? Partly. I brought the file in (one click, ids kept, counts shown) and I looked at
  one person: Wei Diallo, res_0001, machine learning, h-index 47, 3 connections, from the table
  and the side panel. That part worked and was quick. What I really wanted -- her ego graph -- I
  could not see: the neighborhood filter claimed to apply but the canvas did not change for 1 or
  2 hops, and clicking the filter chip dropped me into an unrelated transfers dataset.
- Single Ease Question: 4 / 7. Import and select were a 6; the neighborhood step dragged it down.
- Would I use it instead of my current tool (networkx + matplotlib in a notebook)? Not yet. For
  12 nodes, `nx.ego_graph(G, "res_0001", radius=2)` is one line and I can trust what it returns.
  What would make me switch is what this almost had: row-to-node-to-attributes, a hops knob, local
  only. But the filter has to show me "N of 12 nodes" and actually redraw, and the chip must never
  take me somewhere else.

## What stood out

- Good: preview before load with counts, sniffed format, Key column kept as my original id,
  "every key is unique" check.
- Good: clicking a table row selects the node and the side panel shows its row; "3 connections" on
  the canvas label.
- Good: the Neighborhood popover -- hops 1/2/3 and direction are the right controls.
- Bad: nodes have no labels on the canvas, so I had to go through the table to pick a person.
- Bad: "Selected: Wei Diallo and every node within 1 hop" while the Selection count stays at 1 and
  nothing is highlighted.
- Bad: opening Neighborhood closed my table.
- Bad: after "Filter to neighbors" (1 or 2 hops) the canvas looks unchanged and the chip has no
  count.
- Severe: the "Filtered: neighbors of Wei Diallo" chip opened a different graph (Transfers, March
  2026).
- Minor: the "Neighborhood" tooltip overlaps the node's label.
