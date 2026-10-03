# Session: first look at the Les Miserables sample, played as the reporter with a contacts sheet (Ruth)

Task as given: "You have never used this program before. You will practice on the ready-made network
of characters from the novel Les Miserables that comes with the program, not on your own data. Get
it on screen and work out what you have: how many characters there are, how many connections
between them, whether every character can be reached from every other, and what facts are recorded
about each character."

Renders: design/ui/prototype/tmp/round-8-sessions/r8-t06--data-journalist/ (01 is the start screen,
shots/tasks/r8-t06/01.png).

All commands were run from design/ui/prototype.

## Step 1 -- start screen (shots/tasks/r8-t06/01.png)

Think-aloud: "OK, a home page. Samples on the right, and Les Miserables is the first one, '77
characters'. So that's one answer before I've even opened it, assuming it's true. There's a big
box at the bottom asking for usage data. 'Local only' at the top is nice to see. I'll say no
thanks and click Les Miserables."

## Step 2 -- open the sample (02.png)

```
timeout 120 node app-b/study.mjs --try .../r8-t06--data-journalist/02.png task:r8-t06 --click "No thanks" --click "Les Miserables"
```

Saw: the network, orange dots with some names (Valjean, Javert, Cosette, Marius...). Left list full
of things: PageRank, Louvain 6 groups, Shortest paths, Density, Link prediction, Watchlist, For the
report. Right side says "Paints 77 nodes (every node with a value)".

Think-aloud: "It's up. But it's already full of things somebody else did -- shortest paths, a
watchlist, a 'for the report' folder. I didn't make any of that and I don't know which of it is the
book and which is somebody's homework. 77 nodes on the right matches 77 characters. I can't find a
count of connections anywhere on this screen. 'Data' on the left edge sounds like where the facts
would be."

## Step 3 -- the Data section (03.png)

```
timeout 120 node app-b/study.mjs --try .../r8-t06--data-journalist/03.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data"
```

Saw: Sources -- miserables.gexf, 77 nodes, 254 edges. Right side Summary: Nodes 77, Edges "254
edges, each a distinct pair", Undirected, Weight "value, stronger", Density 0.0868, Connected
components 1, Average degree 6.60, Highest degree 36. Attributes list: In use -- label, group; Other
attributes -- betweenness, degree; Edges -- value; Results -- Louvain, PageRank.

Think-aloud: "This is the page I wanted. 77 characters, 254 connections, and it says each is a
distinct pair, so no double counting -- good, that's the kind of thing a fact-checker asks.
'Connected components: 1.' I think that means it's all one web, nobody cut off, but that's a term I
would have to look up before I printed it. It's blue, so I'll click it and see if it explains
itself. On the facts: label and group are 'in use', betweenness and degree are 'other'. Did the
novel's file come with betweenness, or did the program make it up? I need to know before I quote
it."

## Step 4 -- click the connected components "1" (04.png)

```
timeout 120 node app-b/study.mjs --try .../r8-t06--data-journalist/04.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "1"
```

Saw: the left panel jumped back to the Graph list, and a table opened at the bottom: "77 nodes,
sorted by degree", every row highlighted, columns label, Notes, group, Degree (full graph), Rank by
degree, PageRank, Rank by PageRank. A line says "Valjean is first on all three measures".

Think-aloud: "Hm. It moved me somewhere else. I expected it to tell me what a component is, or
'all 77 characters can reach each other'. Instead it highlighted all 77 rows. I suppose that's the
answer -- the one piece has all 77 in it -- so yes, everyone can reach everyone. But I'm working
that out myself from the highlighting; nothing says it in words. The table is useful but it mixes
things: label and group, then degree and PageRank. I still don't know which of those came with
the book."

## Step 5 -- rest the pointer on "betweenness" (05.png)

```
timeout 120 node app-b/study.mjs --try .../r8-t06--data-journalist/05.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --hover "betweenness"
```

Saw: no tooltip.

Think-aloud: "Nothing. Click it, then."

## Step 6 -- click "betweenness" (06.png)

```
timeout 120 node app-b/study.mjs --try .../r8-t06--data-journalist/06.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "betweenness"
```

Saw: right side: betweenness, Node attribute, Read as Number, From "miserables.gexf (imported, not
computed)", On 77 nodes, Fill 100%: 77 of 77 nodes have a value, In use: Nothing uses it, Range 0
to 0.57, Median 0.

Think-aloud: "There it is, in plain words: imported, not computed. So the file itself carries
betweenness and degree for every character, along with label and group. Louvain and PageRank sit
under 'Results', so those are the program's. On the connections, the only fact is 'value', and the
sources box says a higher value is a stronger tie. I've got what I came for."

## My answers

- Characters: 77.
- Connections: 254, each a distinct pair, undirected, with a strength called "value".
- Everyone reachable from everyone: yes, I believe so -- "Connected components 1", and clicking it
  highlighted all 77. I would not print it without someone confirming what "connected component"
  means.
- Facts recorded about each character in the file: label (the name), group, degree, betweenness.
  The program has added PageRank and Louvain groups on top.

## Did I succeed?

Mostly yes. Counts and the recorded facts I am sure of. The "everyone reachable" answer I am
reasonably sure of, but by inference from jargon, not because the screen said it.

Single Ease Question: 5 of 7. Once I found the Data section it was quick. Losing points for the
sample opening crowded with someone else's analyses, for "connected components" with no plain
explanation, and for the "1" link sending me to a different panel instead of telling me what it
means.

Would I use this instead of what I use now (a spreadsheet, and Gephi if forced)? For this kind of
first look, probably yes: it told me which numbers came from the file and which it computed, which
is exactly the question my editor asks, and it says local only. I'd want to see it with my own
messy sheet before I trusted it more.

## Problems seen

1. "Connected components 1" is the only answer to "can everyone reach everyone", and it is graph
   jargon with no plain-words meaning on hover or click.
2. Clicking the "1" switched the left panel from Data to Graph and opened a table with all rows
   highlighted; it never states "all 77 nodes are in one component".
3. The sample opens crowded with prebuilt analyses (shortest paths, watchlist, a report folder);
   a newcomer cannot tell what is the dataset and what is someone's prior work.
4. The edge count is not visible on the first screen after opening; it lives in the Data section.
5. No tooltip on the attribute names; whether an attribute was imported or computed needs a click.
6. The data-sharing banner covers the lower part of the start screen on first visit.
