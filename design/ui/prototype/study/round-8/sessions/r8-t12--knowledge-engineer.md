# Session: find Javert, read what is known about him, see whom he shares chapters with

Participant: Dr. Min-ji Kim, knowledge graph engineer (persona in study/personas/knowledge-engineer.md)
Task given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Go to the police inspector Javert, read what the program knows about him, and see
which characters he shares chapters with."
Start screen: shots/tasks/r8-t12/01.png. Renders: tmp/round-8-sessions/r8-t12--knowledge-engineer/01.png to 16.png.
All commands were run from design/ui/prototype; P below stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t12--knowledge-engineer

## Think-aloud

**Start screen.** Start, recent projects, samples. Fine. A banner asks to collect usage data. On a
work laptop, no. "No thanks". Les Miserables, 77 characters. That is the one.

**01** `timeout 120 node app-b/study.mjs --try P/01.png task:r8-t12 --click "No thanks" --click "Les Miserables"`

That is a lot already on the left: PageRank, Louvain, shortest paths, density, link prediction,
watchlist, "For the report". Someone else's analysis, not a clean graph. Everything is colored by
PageRank, orange to brown. Not red-green, at least. Javert is labeled on the canvas next to Valjean.
I click the label.

**02** `... --click "No thanks" --click "Les Miserables" --click "Javert"`

That opened "Valjean to Javert", a stored shortest path, not Javert. The click matched a row in the
tree, not the label on the canvas. Not what I wanted. The panel says "Edge value 17 shared chapters",
which is at least an honest unit. I use the search box instead.

**03** `... --click "Find rows and notes" --type "Javert"`

Typed "Javert". Nothing happened. No results, no filtering.

**04** `... --type "Javert" --key Enter`

With Enter: results grouped into Nodes, Rows and Notes. "Javert, 17 neighbors" as a node, the two
paths as rows, two notes. Good that the node is kept apart from derived records. But I had to
press Enter, and nothing told me to.

**05** `... --key Enter --click "17 neighbors"`

Javert selected, ring on the canvas, caption "Javert, 17 connections". The search said 17
neighbors; connections and neighbors are not the same thing in a multigraph. The right panel
opened on Style, "Why this look". I did not ask why he looks orange. I want his data.

**06** `... --click "17 neighbors" --click "Data"`

Wrong "Data": the left rail, which replaced the whole left panel and dropped my selection; the
right panel went back to the graph summary. Two controls named Data, side by side. One good thing:
"254 edges, each a distinct pair". So neighbors equal connections here. Fine.

**07** `... --click "17 neighbors" --click "Style" --key ArrowRight`

Inspector Data tab for Javert. What it knows:
- From miserables.gexf: id 27, label Javert, group 4.
- Results: PageRank 0.0303 (#5 of 77), Degree 17 (#4 of 77).
- 2 more attributes: betweenness 0.0543, degree 17.
- Memberships: Watchlist, two stored paths, Top 9 by degree, Group 4.

Questions it does not answer: two "degree" entries, one under Results and one under attributes.
Which came from the file and which was computed? If they ever differ, which one do I believe?
Betweenness: normalized or raw? "Group 4" under memberships, green dot, and the file attribute
group = 4. Is the membership the file's group or a Louvain community? Louvain is a result column
on the left, but no Louvain value is listed for him. Sloppy.

**08** `... --key ArrowRight --click "Javert, 17 connections"`

The caption is only a caption. Nothing happened.

**09** `... --key ArrowRight --hover "Neighbors"`, result: nothing on screen is called "Neighbors".
**10** `... --key ArrowRight --hover "Focus"`, result: nothing on screen is called "Focus".

Five icons with no labels above the toolbar. I cannot read them.

**11** `... --key ArrowRight --click "Edges"`

Edge table: all 254 edges sorted by value, 13 pages. Selecting Javert does not filter it to his
edges. He appears sometimes as source, sometimes as target, in a graph the program itself calls
undirected; source and target columns on undirected edges invite wrong readings. I do see "Javert,
Valjean, 17". Seventeen shared chapters with Valjean.

**12** `... --key ArrowRight --hover "Select"`: it hit the "Selection" row in the tree. Its tooltip,
"Built-in rows keep their names", tells me nothing.

**13** `... --key ArrowRight --hover "Neighborhood"`: tooltip "Neighborhood G". Found it on my
fifth guess.

**14** `... --key ArrowRight --click "Neighborhood"`

Good dialog: distance 1, 2 or 3 edges away, "Undirected graph", "Covers: Javert and 17
neighbors." That agrees with degree 17 and the distinct-pair statement. But it does not list them.
Buttons: "Add as steps", "Filter to neighbors". Earlier the Data panel said "Filters change what
is computed". Will PageRank be recomputed on 18 nodes? I click Filter and watch the numbers.

**15** `... --click "Neighborhood" --click "Filter to neighbors"`

Header chip "18 of 77 nodes", toast "Added filter step: Neighbors of Javert, 1 edge away", with
Undo. But the canvas still shows the full graph. Nothing removed, nothing dimmed. And the right
panel now says Valjean, on Style. I never selected Valjean. My selection moved by itself. First
unexplained failure.

**16** `... --click "Filter to neighbors" --click "Table"`

Node table: "18 of 77 nodes", and on the same line "Rows 1 to 77 of 77". Which is it? The columns
say "Degree (full graph)" and "PageRank (full graph)", which honestly answers my recompute
question. But the first rows are Valjean, Gavroche, Marius, Javert, sorted by degree. Top of 77
or top of 18? I cannot tell. Second unexplained failure. I stop.

## Outcome

Did I succeed? Half. I found Javert and read what the program holds on him (id, label, group,
PageRank and rank, degree and rank, betweenness, memberships). I know he shares chapters with 17
characters, and that Valjean is one of them with 17 chapters. I could not get the list of the 17
names out of it in a form I can defend. The filter said 18 and showed 77.

Single Ease Question: 2 of 7.

Would I use this instead of my current tool? No. For this question I would run one SPARQL query,
`SELECT ?other ?chapters WHERE { :Javert :coappears ?e . ... }`, and have 17 rows in a second. What
worked: search grouped nodes, rows and notes apart, the neighborhood dialog said "undirected" and
"17 neighbors" plainly, and the table columns say "(full graph)". What lost me: the canvas click
opened a stored path instead of the character, the search needed an Enter nobody mentioned, two
controls called Data, unlabeled icons I could only find by guessing names, a filter whose count
says 18 while the canvas and pager say 77, and a selection that jumped to Valjean on its own.
Fine for a demo. Not something I would hand a number from.

## Problems, in my words

1. The filter claims 18 of 77 nodes; the canvas still draws all 77 and the table pager says rows 1
   to 77 of 77 on the same line as "18 of 77 nodes". Severe: I stopped trusting every count.
2. After "Filter to neighbors" the selection switched from Javert to Valjean without my doing
   anything, and the inspector went back to Style.
3. Neighbors are not listed anywhere I could find: not in the inspector, not in the neighborhood
   dialog, and the edge table is not filtered by the selection.
4. The selection icon row has no labels; "Neighborhood" was found only by guessing names.
5. Two controls named "Data" (left rail and inspector tab); the wrong one drops the selection.
6. Search did nothing until Enter, with no hint that Enter is needed.
7. Clicking "Javert" opened the stored path "Valjean to Javert" instead of the node.
8. Inspector opens on Style ("Why this look"), not Data, for a person who asked what is known.
9. Two "degree" values with no provenance; betweenness with no normalization stated; "Group 4"
   membership vs file attribute group = 4 ambiguous; his Louvain value missing from Results.
10. Edge table shows source and target for an undirected graph.
