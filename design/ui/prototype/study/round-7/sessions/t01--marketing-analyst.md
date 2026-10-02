# Session: t01 -- marketing analyst (Jordan)

Task, as read by the moderator: "A colleague handed you this network and you are about to build on it. Before you trust anything in it, work out what you actually have: how many characters and connections, whether it all hangs together as one piece, and whether anything about how it came in looks wrong."

All commands run from design/ui/prototype. D = tmp/round-7-sessions/t01--marketing-analyst.

## Step 0 -- start screen (shots/tasks/t01/01.png)

Okay. Orange map, a legend box top left, a long list on the left with PageRank, Louvain, Shortest paths, Watchlist, "For the report"... my colleague has clearly already been busy. That's exactly why I don't trust it yet. Right panel says "Paints 77 nodes (every node with a value)" -- so maybe 77 characters? But that's a sentence about the color, not a count of the data. I don't see edges anywhere. No "summary" or "overview" button that jumps out. Left rail: Graph, Data, Views, Notes, Assistant. "Data" is the obvious word for "what did I get".

## Step 1 -- click Data

    timeout 120 node app-b/study.mjs --try $D/01.png task:t01 --click "Data"

Oh, nice, this is actually the thing. Left: Sources -> miserables.gexf, "77 nodes, 254 edges". Then "nodes . 77 nodes" and "edges . 254 rows, 254 edges" -- so 254 rows in, 254 edges out, nothing got thrown away. That's the kind of check I usually do by hand in Excel (count rows in the export vs what Gephi says it loaded). Right panel, "Summary": Nodes 77, Edges 254, Undirected, Weight "value, stronger", Density 0.0868, Connected components 1, average degree 6.6, highest 36.

So: 77 characters, 254 connections, one piece. Connected components = 1 means everything hangs together -- I know that one from Gephi tutorials. Good, that was under a minute.

The little degree chart -- fine, I skim it. It says "0 / degree 0" to the right of the chart, which, um, I don't know what that's pointing at. Nobody has degree 0 if it's one connected piece, right? Slightly odd but I'll let it go.

Attributes list: label, group, degree "in use", and betweenness under "Other attributes" -- so the file came with a betweenness column already? Someone pre-computed that. I'd want to know who and how before I put it in a deck. Results: Louvain, PageRank -- those were run in here, not in the file. Fine, that separation is actually useful.

## Step 2 -- "4 more readings not computed"

    timeout 120 node app-b/study.mjs --try $D/03.png task:t01 --click "Data" --click "4 more readings not computed"

Wanted to see what the other readings are. Instead the whole left side flipped back to the Graph list and a menu popped open on the right with "Re-run layout", "Unpin all", "Compute the overview", "Add node..." (highlighted!), "Clear graph data". Whoa. I did not ask for that. "Clear graph data" one row away from where I clicked -- no thanks. I'm pressing Escape and backing off. I still don't know what the four readings are. Maybe "Compute the overview" is it, but I'm not clicking things in a menu that also has "Clear graph data" in it.

## Step 3 -- open the source file itself

    timeout 120 node app-b/study.mjs --try $D/02.png task:t01 --click "Data" --click "miserables.gexf"

"Edit: miserables.gexf". Hmm, "Edit" -- I wanted to look, not edit, but there's Cancel and "Apply is off: Nothing has changed yet", so I'm not going to break anything. Good that it says that. Table of nodes: id, label, group. Bottom: "Match report: nodes -- 77 rows; every id is unique." That's the reassurance I want. No duplicates.

Group is typed "Abc" but the values are numbers (1, 1, 1...). Whatever, it's a category.

## Step 4 -- edges in the same screen

    timeout 120 node app-b/study.mjs --try $D/04.png task:t01 --click "Data" --click "miserables.gexf" --click "edges"

"Match report: edges -- 254 rows; every edge has both ends." Good, no dangling connections to characters that don't exist. That's the thing that bites me with vendor CSVs.

BUT. Up top it says "Weight: none (each edge counts 1)". And the value column has 1, 8, 10, 6... The Summary panel I was just on said "Weight: value, stronger". So which is it? Is the value column being used as weight or not? This is the exact dashboard-says-4,000-download-says-3,100 thing. If PageRank was run with weights and this screen says there are none, I don't know what the colors on the map mean. That's the one thing that "looks wrong about how it came in", and I found it by accident, the tool didn't flag it.

Also "Direction: As the file says" at the bottom, with the source/target columns saying "From -> node" and "To -> node", while the summary says Undirected. Probably fine -- the file says undirected -- but the arrows made me double-take.

I'm stopping here.

## Wrap-up

Did I succeed? Mostly yes. 77 characters, 254 connections, one connected component, every id unique, every edge has both ends, 254 rows in = 254 edges loaded. What looks off: the weight -- Summary says it's weighted by "value", the source screen says no weight, each edge counts 1. And a betweenness column came in from the file with no say on where it came from. I'd go ask my colleague about both before building anything.

Single Ease Question: 5 out of 7. The counts were genuinely fast once I guessed "Data". Lost points for the "4 more readings" link throwing me into a menu with "Clear graph data" in it, and for the two screens disagreeing on weight -- I had to spot that myself.

Would I use this instead of my current tool? For this check, honestly, yes over Gephi -- in Gephi I'd be running "Connected Components" from the statistics panel and counting rows in the Data Laboratory, and nothing tells me "every edge has both ends". The match report is the part I'd actually miss. But I wouldn't trust the analysis numbers until the weight thing is consistent; two screens disagreeing is exactly how I end up with the wrong number in a VP deck. And I still need to know what it costs and whether IT has to sign off -- "Local only" up top is a good sign, I'd want that spelled out before I load customer data.
