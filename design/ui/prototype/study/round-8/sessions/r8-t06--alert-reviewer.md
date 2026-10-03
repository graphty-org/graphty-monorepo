# Session: r8-t06, alert reviewer (Nadia, level-1 transaction monitoring analyst)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Get it on screen and work out what you have: how many characters there are, how many
connections between them, whether every character can be reached from every other, and what
facts are recorded about each character."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t06--alert-reviewer/.

## Step 1 -- start screen (shots/tasks/r8-t06/01.png)

"OK. Start, Recent projects, Samples. Les Miserables is right there at the top of Samples, '77
characters'. So that's one answer already, before I've opened anything. There's a big privacy
box at the bottom asking to collect usage data. Our IT would kill me if I said yes to anything
on a work laptop, so No thanks. Then click the Les Miserables one."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t06 --click "No thanks" --click "Les Miserables"

"Whoa. OK, that's a lot. A dot picture in the middle, all orange, a list on the left with
PageRank, Louvain, Shortest paths, Density, Link prediction, Watchlist, 'For the report'... I
didn't do any of that. The start screen did say it opens with worked examples already added, so
I guess that's those. Still, for a first look it's busy -- I don't know which of this is the
data and which is somebody's homework. Right side says 'Paints 77 nodes' -- nodes, so characters
are nodes, 77 again. I don't see the number of connections anywhere on this screen. There's a
'Density' row on the left but I don't know what density means here and I'm not clicking things
that might change something. Left rail has 'Data'. Data is what I want. Click that."

## Step 3 -- Data

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data"

(The tool noted "Data" matched two controls, a button and a tab; it clicked the rail button,
which is what I meant.)

"There we go. This is the page I wanted first. Left: the file, miserables.gexf, '77 nodes, 254
edges'. Right side, Summary: Nodes 77, Edges 254 'each a distinct pair', Undirected, Connected
components 1. Connected components 1 -- I'm reading that as 'it's all one piece', so yes,
everyone can reach everyone. I'd want someone to confirm that's what it means, it's not worded
the way I'd say it, but one piece is one piece.

Facts about each character: Attributes, Nodes. 'In use (2)': label, group. Then 'Other
attributes': betweenness, degree. Then for edges, 'value', which it says is the weight, higher
is a stronger tie. Then 'Results': Louvain, PageRank. So I'm guessing Results are things the
program worked out and label and group came in the file. But betweenness and degree have the
same little stack icon as Louvain and PageRank. Are they in the file or did the program make
them? It doesn't say. If QA asked me 'what did the source record about each person' I'd say
name and group, and maybe betweenness and degree, and I'd have to hedge on those two. Let me
look at the actual rows."

## Step 4 -- the table

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "Table"

"OK, '77 nodes', Valjean at the top with degree 36, which matches 'Highest degree 36' on the
right. Columns: label, Notes, group, Degree (full graph), Rank by degree, PageRank... 'Columns:
9 of 9'. So label and group are the facts on each person; everything else looks like the
program's math. Notes column shows Valjean has 2 notes, Javert 1 -- someone wrote stuff on them,
that's the worked examples again.

That's what I was asked. 77 characters, 254 connections, one connected piece so everyone is
reachable, and each character has a name and a group number, with the program adding degree,
PageRank and the rest. Connections carry a 'value' for how strong the tie is. I'm stopping
here."

## Wrap-up

- Did I succeed? I think so. 77 characters, 254 connections, all one connected piece, and the
  facts per character are label (name) and group, plus a strength value on each connection. I
  am not sure whether betweenness and degree were in the file or worked out by the program --
  the screen puts them under "Other attributes", not "Results", but gives them the same icon.
- Single Ease Question: 5 of 7. The character count was on the very first screen and the Data
  page had every number in one box. Lost points because opening the sample drops me into a
  screen full of somebody else's analysis with no number of connections on it, and because I
  could not tell recorded facts from calculated ones with confidence.
- Would I use this instead of my current tool? No. I do not have a graph tool, and nothing here
  is about one alert. For the few alerts where counterparties matter, the Data summary is the
  kind of thing I'd screenshot into the alert file -- if I could tell QA which numbers came from
  the source and which the program made up.

## Commands run (full form)

    cd /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype
    D=tmp/round-8-sessions/r8-t06--alert-reviewer (absolute path used in each run)
    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t06 --click "No thanks" --click "Les Miserables"
    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data"
    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "Table"
