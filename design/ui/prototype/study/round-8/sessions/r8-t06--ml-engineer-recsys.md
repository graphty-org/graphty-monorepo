# Session: Les Miserables first look -- Chris, ML engineer (recommendation systems)

Task as given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Get it on screen and work out what you have: how many characters there are, how many
connections between them, whether every character can be reached from every other, and what facts
are recorded about each character."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t06--ml-engineer-recsys/.

## Step 1 -- start screen (shots/tasks/r8-t06/01.png)

Think-aloud: "OK, start page. Open project or file, Ctrl+O, drop a file -- fine, normally I'd drag
my edge list in right here, but the moderator said practice data. 'Files are read on this computer
and never uploaded' -- good, that's the first thing privacy review asks. And 'Local only' in the
header. Samples on the right: Les Miserables, 77 characters. So I already have the node count off
the card before I even open it. There's a big usage-data banner at the bottom -- I'm saying no to
that before anything else."

## Step 2 -- dismiss banner, open the sample

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t06 --click "No thanks" --click "Les Miserables"

Think-aloud: "Loaded straight to a picture, no wizard, good. It's not a hairball at 77 nodes, fine.
But this thing is already heavily decorated -- colored by PageRank, Louvain with 6 groups, two
shortest-path rows, link prediction, a watchlist, a 'For the report' folder. I didn't ask for any of
that. The card did say 'opens with worked examples', so OK, but I need to know what's raw data versus
what somebody computed. Right panel says 'Paints 77 nodes (every node with a value)' -- that
confirms 77. Edge count nowhere on this screen. 'Data' in the left rail is the obvious place to
look for counts."

## Step 3 -- Data view

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data"

(The tool reported "Data" matched two controls -- the rail button and a tab -- and clicked the rail
button, which is what I meant.)

Think-aloud: "This is the screen I wanted. Source: miserables.gexf, 77 nodes, 254 edges. Right
panel summary: 77 nodes, 254 edges, 'each a distinct pair' -- so no multi-edges, good, I'd have
asked. Undirected. Weighted by 'value', higher is stronger. Density 0.0868, average degree 6.60,
max degree 36. Connected components: 1. So yes, everyone is reachable from everyone. Sanity check:
2*254/77 = 6.597, matches 6.60. 254 / (77*76/2) = 254/2926 = 0.0868, matches. Numbers are honest.
There's even a log-log degree CCDF -- that's what I'd plot first in a notebook. '4 more readings not
computed' -- at least it tells me it didn't compute them, rather than hiding it.

Attributes per character: label, group in use; betweenness and degree under 'other attributes';
edges carry 'value'; under Results there's Louvain and PageRank. The question is whether
betweenness and degree came in the file or were computed by the app -- they have the same stacked
icon as the Results rows, which makes me think computed."

## Step 4 -- node table

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "Table"

Think-aloud: "Table: 77 nodes, rows 1 to 77 of 77. Columns: label, Notes, group, Degree (full graph),
Rank by degree, PageRank (full graph), rank by PageRank... 'Columns: 9 of 9'. Valjean degree 36,
which matches the highest degree in the summary. Fine. There's a sentence over the table, 'Valjean is
first on all three measures', that's somebody's annotation, not data -- I'd ignore it. The table
mixes file columns and computed columns, so the table alone doesn't answer 'what is recorded'."

## Step 5 -- click betweenness to see where it came from

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "betweenness"

Think-aloud: "'From: miserables.gexf (imported, not computed)', 77 of 77 nodes have a value, range
0 to 0.57, median 0, nothing uses it. That's exactly the provenance line I want. So betweenness is
precomputed in the file -- which means I'd never trust it without knowing how it was normalized,
but at least the app is honest that it didn't compute it. My guess from the icon was wrong; the
stacked icon apparently doesn't mean 'computed'. And the Graph tree on the first screen had a
'Betweenness' row under 'For the report', while this says 'Nothing uses it' -- mildly confusing,
but I'm not chasing it. I'm assuming degree is the same story as betweenness; I didn't click it."

## Answers I would give the moderator

- Characters: 77.
- Connections: 254 undirected edges, each a distinct pair, weighted by 'value' (co-appearance
  strength).
- Reachability: yes, one connected component.
- Facts recorded per character: label (name) and group from the file, plus betweenness and degree
  that were also in the file. Edges record 'value'. Louvain and PageRank are results the sample
  added, not recorded facts.

## Wrap-up

- Succeeded? Yes, I think so. The only thing I'm not 100% on is whether 'degree' is from the file
  like betweenness; I inferred it.
- Single Ease Question: 6 of 7. The Data view answered everything in one screen. It loses a point
  because the opening screen is buried in someone else's analysis (PageRank coloring, Louvain,
  paths, a watchlist, a report folder) and I had to work out what's raw data, and because the
  icon next to the attributes doesn't distinguish imported from computed -- I had to click one to
  find out.
- Would I use this instead of my current tool? Not yet. For this I'd do nx.read_gexf, G.number_of_nodes(),
  G.number_of_edges(), nx.is_connected(G) and look at G.nodes(data=True) -- four lines. What the app
  did better than the notebook: the summary panel with density, components and the log-log degree
  CCDF in one place, and the 'imported, not computed' provenance line. That's genuinely nice. But
  the real test is my own bipartite edge list, ideally Parquet, at tens of millions of rows, and a
  2-hop ego graph around one user id. A 77-node sample tells me nothing about that.

## Problems noted

1. Opening the sample lands on a heavily pre-analyzed project (PageRank color, Louvain, shortest
   paths, link prediction, watchlist, report folder). For a "what do I have" task it buries the raw
   data; edge count is not on the first screen at all.
2. Imported attributes (betweenness, degree) carry the same stacked icon as computed results
   (Louvain, PageRank); provenance is only visible after clicking one.
3. Graph tree shows a "Betweenness" layer under "For the report" while the betweenness attribute
   says "Nothing uses it" -- unclear whether these are the same thing.
4. The table mixes file columns with computed columns ("Degree (full graph)", ranks) and carries a
   prose sentence above the rows; not a clean view of "what is recorded".
