# Session: bring in a saved network and check it arrived whole -- Gephi holdout (Dr. Mara Lindqvist)

Task as given: "A colleague saved the network of characters onto your computer for you. Bring it
into graphty, starting from the screen you see, and check it arrived whole."

Start screen: shots/tasks/t14/01.png. All commands run from design/ui/prototype; renders in
tmp/round-7-sessions/t14--gephi-holdout/.

## Step 1 -- the start screen

Think-aloud: "Start, Recent projects, Samples. I ignore the samples; the file is on my disk.
'Open project or file...', Ctrl+O. Good, that is File > Open. 'Files are read on this computer
and never uploaded' -- that is the first thing I would have asked, so fine, noted. I click Open."

    timeout 120 node app-b/study.mjs --try .../01.png task:t14 --click "Open project or file..."

## Step 2 -- what opened (01.png)

"Wait. I did not pick anything. It went straight to a graph called Les Miserables, and it is
already painted: PageRank color, size by degree, Louvain with 6 groups, two shortest paths, a
Watchlist, a folder 'For the report', four notes. A colleague's GEXF does not contain shortest
paths and a watchlist. Is this my colleague's file or somebody's old project? In Gephi, opening a
.gexf gives me the import report and a gray hairball, nothing computed. Here I cannot tell what
came from the file and what the tool -- or someone -- added."
(In the real app a file picker would presumably sit between these; even so, nothing on this
screen says 'just imported from X'.)

The legend does at least say 'Square root scale (area), 1 to 36' -- I like that it states the scale.

## Step 3 -- what file is this? (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:t14 --click "Open project or file..." --click "Les Miserables"

"The title menu: Rename, Save, Export, Version history, Close project. That is a project menu,
not an import report. But the right panel now says 'Co-appearances, Graph from miserables.gexf'.
Summary: Nodes 77, Edges 254, Undirected, Weight 'value, stronger', Density 0.0868, 1 connected
component, average degree 6.6, highest degree 36. 77 and 254 -- that is the Les Mis graph I know.
Density 254 / (77*76/2) = 0.0868, checks. Average degree 2*254/77 = 6.6, checks. Valjean at 36,
checks. Good, those numbers I can verify in my head."

## Step 4 -- the Data section (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:t14 --click "Open project or file..." --click "Data"

"Sources: miserables.gexf, 77 nodes, 254 edges. Attributes: label, group, degree, betweenness on
nodes; value on edges. Results: Louvain, PageRank. So degree and betweenness are listed as
attributes, as if they came from the file, while PageRank and Louvain are 'results'. Fine if
true, but who computed betweenness, and on what? I'll leave it; the task is the import."

## Step 5 -- the table (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:t14 --click "Open project or file..." --click "Table"

"There is my Data Lab, under the map. 77 nodes. Columns say '(full graph)' -- Degree (full graph),
PageRank (full graph). That is exactly what Gephi never tells me. Good. Valjean 36. Sorted by
degree, I can see the arrow."

## Step 6 -- the import itself (05.png, 06.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:t14 --click "Open project or file..." --click "Data" --click "miserables.gexf"
    timeout 120 node app-b/study.mjs --try .../06.png task:t14 --click "Open project or file..." --click "Data" --click "miserables.gexf" --click "edges"

"Now this is the import report. GEXF, auto-detected. Nodes: id as Key, label as Name, group as an
attribute. 'Match report: 77 rows; every id is unique.' Edges: source, target, value. 'Match
report: 254 rows; every edge has both ends.' Direction 'As the file says'. That is what I wanted
to see first, and I had to dig three levels for it.

But: up here it says 'Weight: none (each edge counts 1)'. The panel on the graph screen said
'Weight: value, stronger'. Which is it? In this file value IS the co-appearance count -- Myriel
and Mme.Magloire share 10 chapters. If my weighted degree and PageRank were computed unweighted I
need to know. Two screens, two answers. That is the kind of thing I would write in a review.

Also 'group' comes in as text (Abc), not a number. It is a category, so fine, but Gephi reads it
as an integer."

## Stop

"77 nodes, 254 edges, ids unique, every edge has both ends, label, group and value are there.
It arrived whole. I'm done."

## Verdict

- Succeeded? Yes, I believe so: the counts match what I know of the Les Mis graph and the import
  report says no rows were dropped.
- Single Ease Question: 4 of 7. Opening was one click; checking was not. The proof that nothing
  was dropped lives three clicks deep in an editor called 'Edit: miserables.gexf', while the first
  screen showed me a fully painted project with paths, a watchlist and notes I never made, and the
  weight is described two different ways.
- Would I use this instead of Gephi? Not on the strength of this. The counts check, the import
  report is honest, the table says 'full graph' on its columns, and 'never uploaded' is said up
  front -- all better than I expected. But I opened a file and got someone's finished project,
  and the tool contradicts itself on whether 'value' is the weight. I can't publish a number when
  I don't know whether it was weighted. I'd stay on Gephi.

## Problems seen

1. Opening a file lands on a fully styled project (PageRank, Louvain, paths, watchlist, notes)
   with no import summary; it is unclear what came from the file. (01.png)
2. The import check (match report: 77 unique ids, 254 edges with both ends) is only reachable via
   Data > source row > Edit view; nothing on arrival says "77 nodes, 254 edges, nothing dropped".
   (05.png, 06.png)
3. Weight contradicts itself: graph summary says "value, stronger"; import view says "Weight:
   none (each edge counts 1)". (02.png vs 06.png)
4. Degree and betweenness listed as file attributes while PageRank and Louvain are "Results"; no
   indication where betweenness came from or what it ran on. (03.png)
5. group imported as text where Gephi reads an integer (minor). (05.png)

## Delights

- "Files are read on this computer and never uploaded" on the start screen.
- Summary numbers (density, average degree, components) I could check in my head, and they check.
- Table columns labeled "(full graph)".
- Match report wording: "every id is unique", "every edge has both ends".
- Legend states its scale: "Square root scale (area), 1 to 36".
