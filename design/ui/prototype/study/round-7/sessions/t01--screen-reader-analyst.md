# Session: t01, screen-reader analyst (Morgan Reyes)

Task as given: "A colleague handed you this network and you are about to build on it. Before you trust anything in it, work out what you actually have: how many characters and connections, whether it all hangs together as one piece, and whether anything about how it came in looks wrong."

All commands run from design/ui/prototype. Renders are in tmp/round-7-sessions/t01--screen-reader-analyst/.

## Start screen (shots/tasks/t01/01.png)

Morgan: "Page is called Les Miserables. Top bar says 'Local only' -- good, that is my first question answered before I asked it: the file is not going anywhere. Left rail: Graph, Data, Views, Notes, Assistant. Those are names, not icons with nothing on them. The Graph panel is a long list of layers -- PageRank, Louvain, shortest paths, a watchlist, 'For the report' -- that is my colleague's work, not the data. I don't want their conclusions, I want the counts. The right panel is talking about PageRank paint. Not what I asked. Data sounds like where counts live."

## Step 1 -- Data

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t01--screen-reader-analyst/01.png task:t01 --click "Data"

Morgan: "Now we're talking. Source: miserables.gexf, 77 nodes, 254 edges. And the right side has a Summary: Nodes 77, Edges 254, Direction Undirected, Weight 'value, stronger', Density 0.0868, Connected components 1, Average degree 6.6, Highest degree 36. That is the overview I want, in text, without running anything. Nodes and edges are said as numbers, not a badge. One component, so it hangs together. NetworkX gives me 77 and 254 and one component for this graph, so far so good. There is a picture of the degree distribution under it; the caption below it says what it is in words, which is the part I can use.

Then: '4 more readings not computed'. Fine, I'll ask for them."

## Step 2 -- "4 more readings not computed"

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t01--screen-reader-analyst/02.png task:t01 --click "Data" --click "4 more readings not computed"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t01--screen-reader-analyst/06.png task:t01 --click "Data" --click "4 more readings"

(Run twice, because the first result surprised me.)

Morgan: "That did not do what it said. I pressed a link about readings and the whole left side switched from Data back to Graph, and a menu opened with focus sitting on 'Add node...'. Add node. I am checking data I don't trust yet and the tool has its finger on 'add a node'. If I'd pressed Enter out of habit I'd have edited my colleague's graph. This is exactly the 'screen changes without warning' thing. I had to go down the menu to find 'Compute the overview', which I guess is what the link meant. The link should have just computed them, or at least put me on that item. Ran it twice: same both times, so it is at least consistent."

## Step 3 -- Compute the overview

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t01--screen-reader-analyst/07.png task:t01 --click "Data" --click "4 more readings" --click "Compute the overview"

Morgan: "Now the summary has Average clustering 0.573, Transitivity 0.499, Diameter 5, Degree assortativity -0.165. Those match what NetworkX prints for this graph -- average_clustering 0.573, transitivity 0.499, diameter 5, assortativity -0.165. Good. I would still want to know whether that clustering is weighted or unweighted, because the summary just told me there IS a weight. It doesn't say. NetworkX's number is unweighted, so I assume this is too, but I'm assuming.

Note the panel is still labeled Graph on the left even though I came in through Data. I'm not sure where I am anymore. The summary is still on the right, so the fact did stay put -- that I like."

## Step 4 -- How did it come in? The source file

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t01--screen-reader-analyst/03.png task:t01 --click "Data" --click "miserables.gexf"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t01--screen-reader-analyst/04.png task:t01 --click "Data" --click "miserables.gexf" --click "edges"

Morgan: "'Edit: miserables.gexf, Esc to leave'. It tells me how to get out on the way in. Thank you. Format GEXF, auto-detected. Nodes table: id is the Key, label is the Name. Bottom: 'Match report: nodes. 77 rows; every id is unique.' That is the sentence I wanted. Edges table: source 'From -> node', target 'To -> node', a value column. 'Match report: edges. 254 rows; every edge has both ends.' So no dangling references. Also good: 'Apply is off: Nothing has changed yet'. I haven't broken anything by looking.

Now here is what looks wrong. Up at the top of the edges table: 'Weight: none (each edge counts 1)'. And value is marked as a plain Attribute. But the graph Summary I read two minutes ago said Weight: 'value, stronger'. Those two can't both be true. Either the import ignored the value column and something later decided to use it as weight, or the summary is wrong. That is precisely the thing I'd get burned on: the shortest paths and betweenness my colleague left in this file -- were they weighted or not? I can't tell from here, and the tool doesn't explain the difference.

Also, the group column is typed Abc, text, though every value I can see is a number. Probably harmless for a group code. I'd note it.

What the match report does NOT tell me: self-loops, or duplicate edges between the same pair. 'Every edge has both ends' is not the same as 'no edge appears twice'. Les Mis doesn't have either, from my NetworkX runs, but I'd only know because I already know this graph. On my referral data, those are the two things I check first."

## Step 5 -- clicking the Weight link

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t01--screen-reader-analyst/05.png task:t01 --click "Data" --click "value, stronger"

Morgan: "Pressed 'value, stronger' hoping it would explain itself. It dropped me in the source editor -- on the NODES table. The weight is a property of edges. So the link goes to the right file and the wrong table, where nothing mentions weight at all. Second time in this session a link put me somewhere other than where it said. I'll count that against it."

## Step 6 -- The edge table itself

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t01--screen-reader-analyst/08.png task:t01 --click "Edges"

Morgan: "Bottom tab, Edges. '254 edges', columns source, target, value, Notes, sorted by value descending -- Cosette and Valjean 31, Marius and Cosette 21. Names, not ids, which I appreciate. It's a table, so I'd try Ctrl+Alt+arrows and expect headers read out. It agrees with 254. Nothing here says weight either. I stop here."

## Verdict

- What I found: 77 characters, 254 connections, undirected, one connected component. The import report says every node id is unique and every edge has both ends. The overview numbers match NetworkX.
- What looks wrong: the graph summary says the edges are weighted by 'value', but the import screen says 'Weight: none (each edge counts 1)'. The tool shows both and explains neither. I would ask my colleague which one their results used before building on anything.
- Not checked, because nothing offered it: self-loops and duplicate edges.

Did I succeed? Mostly. Counts and one piece: yes, fast, and in text. 'Anything wrong': I found a contradiction, but only by reading two screens and comparing them myself. I can't tell whether that contradiction is the problem or a bug in the tool.

Single Ease Question: 5 of 7. The summary was easy. The '4 more readings' link that switched panels and parked focus on 'Add node...', and the weight link that opened the nodes table, cost me most of the effort.

Would I use this instead of my scripts? For this job, maybe as a first look. Summary first, a match report in plain sentences, 'Local only' up top, Esc said on entry -- that is more than Gephi ever gave me, and it agreed with NetworkX. But my scripts tell me about self-loops and duplicates and they never contradict themselves about weight. Until the tool says in one place whether my edges are weighted and why, I'd still run `nx.info` beside it.
