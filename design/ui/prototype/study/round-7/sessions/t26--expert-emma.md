# Session: bring in a coauthor network and look at one person -- Expert Emma

Task as given: "A colleague sent a small, ready-made network of who wrote papers with whom. Bring it in and look at one person in it."

Renders: design/ui/prototype/tmp/round-7-sessions/t26--expert-emma/NN.png. Every command was run from design/ui/prototype.

## Start screen (shots/tasks/t26/01.png)

"OK, so it has already opened the file and is showing me a preview. coauthors.json, read as JSON node-link, 'Coauthors: 12 nodes, 16 edges'. Good, it tells me the counts before I commit. There is a 'Local only' chip in the top bar, which is the first thing I look for. Node table: id is the key, name is the label, field and h_index are attributes. 'Showing the first 8 of 12 rows.' Match report says every key is unique. Fine. Bottom bar: Direction 'As the file says'. What does the file say? It does not tell me. Coauthorship is undirected. I want to see the edges and the weights before I press Load."

## Step 1 -- what does "Local only" mean

    timeout 120 node app-b/study.mjs --try .../02.png task:t26 --hover "Local only"

"Tooltip: 'Privacy settings'. That is a link to settings, not a statement. I would rather it said 'processed in this browser, nothing uploaded'. I will click it later if I care; for a colleague's sample I will let it go."

## Step 2 -- open the file in the tables list

    timeout 120 node app-b/study.mjs --try .../03.png task:t26 --click "coauthors.json"

"It expands to 'nodes 12' and 'links 16', both with check marks. Good."

## Step 3 -- look at the edges

    timeout 120 node app-b/study.mjs --try .../04.png task:t26 --click "coauthors.json" --click "links"

"source, target, weight. Weight was detected automatically, and it asks me what higher means: Stronger, Farther or Capacity. That is the right question; most tools never ask it. Stronger is correct for coauthorship strength. 'A row without one would weigh 1 / 0' -- sensible. '16 rows became 16 edges.' Still no word on what direction the file declares. I will set Undirected myself rather than trust 'As the file says'."

## Step 4 -- set undirected and load

    timeout 120 node app-b/study.mjs --try .../05.png task:t26 --click "coauthors.json" --click "links" --click "Undirected" --click "Load"

"Loaded. Circle layout, 12 dots, no labels at all. The inspector on the right says Nodes 12, Edges 16, Direction Undirected, Weight 'weight, stronger'. That is the honest summary I wanted, and it agrees with the import. 'Readings not computed' -- so it has not run anything behind my back. Good. But I cannot tell who anyone is from the picture. I want the node table."

## Step 5 -- open the table

    timeout 120 node app-b/study.mjs --try .../06.png task:t26 --click "coauthors.json" --click "links" --click "Undirected" --click "Load" --click "Table"

"Table under the graph: id, name, field, h_index. I will look at Maya Novak, highest h-index."

## Step 6 -- click Maya Novak's row

    timeout 120 node app-b/study.mjs --try .../07.png task:t26 --click "coauthors.json" --click "links" --click "Undirected" --click "Load" --click "Table" --click "Maya Novak"

"The row turns blue and a dark box says 'Selects Maya Novak' near the bottom of the circle. But the right panel still shows the whole graph. Nothing on the graph looks selected either -- the box covers the bottom node, so maybe that is her, but I cannot see it. Did it select her or not?"

## Step 7 -- check the Selection row

    timeout 120 node app-b/study.mjs --try .../08.png task:t26 ... --click "Maya Novak" --click "Selection"

"'Selection, built-in row. Paints 0 nodes.' So no, she is not selected. Zero."

## Step 8 -- try the id cell instead

    timeout 120 node app-b/study.mjs --try .../09.png task:t26 ... --click "Table" --click "res_0005"

"Same thing. Row highlighted, 'Selects Maya Novak' box, inspector unchanged."

## Step 9 -- press Enter on the row

    timeout 120 node app-b/study.mjs --try .../10.png task:t26 ... --click "Maya Novak" --key Enter

"Row gets a focus ring. Still nothing in the inspector."

## Step 10 -- click the dark box

    timeout 120 node app-b/study.mjs --try .../11.png task:t26 ... --click "Table" --click "Selects Maya Novak"

"'Nothing on screen is called Selects Maya Novak.' So it was a tooltip telling me what the click would do -- and the click did not do it."

## Step 11 -- try another person, and without my direction change

    timeout 120 node app-b/study.mjs --try .../12.png task:t26 --click "Load" --click "Table" --click "Wei Diallo"
    timeout 120 node app-b/study.mjs --try .../13.png task:t26 --click "Load" --click "Table" --click "Maya Novak"
    timeout 120 node app-b/study.mjs --try .../14.png task:t26 --click "Undirected" --click "Load" --click "Table" --click "Wei Diallo"

"Wei Diallo works: the node at the top gets a ring, Selection shows 1, the inspector switches to 'Wei Diallo, Node', with id, name, field machine learning, h_index 47, and a label on the graph 'Wei Diallo, 3 connections'. A small toolbar appears for the selection. Maya still does nothing, with or without my direction change, so it is not my Undirected that broke it. Some rows select and some do not. That is the kind of thing that makes me stop trusting a tool: I would write it up as 'row 5 of the node table does not select, row 1 does, 12-node coauthor file'."

## Step 12 -- hover the selected node

    timeout 120 node app-b/study.mjs --try .../15.png task:t26 --click "Undirected" --click "Load" --click "Table" --click "Wei Diallo" --hover "Neighbors"

"There is no 'Neighbors' control by name; the five icons on the selection toolbar have no labels I can read. But a tooltip on her node says 'Wei Diallo, 3 neighbors', and the label under the graph says '3 connections'. Neighbors or connections -- pick one. In an undirected simple graph they are the same, but if there were multi-edges they would not be, and I would want to know which one this counts. And I do not see who the three are, or the edge weights to them, in the inspector. For 'look at one person' in a coauthor network the first thing I want is her coauthors and how strong each tie is."

## Stopping

"I have looked at one person: Wei Diallo, her attributes, and her degree. I wanted Maya Novak and could not get to her, so I settled for the one that worked."

## Verdict

- Succeeded? Partly. I brought the network in correctly and inspected one person, but not the person I chose; clicking Maya Novak's row did not select her and gave no error.
- Single Ease Question: 4 of 7. Import was a 6 -- counts, weight detection and the "higher means" question are better than Gephi. Selecting a person was a 2.
- Would I use this instead of my current tool? For this job, not yet. The import preview is genuinely better than Gephi's import dialog, and the summary panel is honest. But selection that silently fails on some rows, no list of a node's neighbors with weights, and "Local only" being a link to settings rather than a plain statement are each enough to keep me in the notebook. If a selected node showed its ego network -- neighbors, edge weights, degree and weighted degree, clearly named -- this would be a reasonable view to hand a colleague who does not code.
