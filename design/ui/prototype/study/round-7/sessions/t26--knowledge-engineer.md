# Session: bring in a coauthor network and look at one person -- knowledge engineer (Dr. Min-ji Kim)

Task as given: "A colleague sent a small, ready-made network of who wrote papers with whom. Bring
it in and look at one person in it."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t26--knowledge-engineer/. In every command below, S stands for
`timeout 120 node app-b/study.mjs --try <that folder>/NN.png task:t26`.

## Start screen (shots/tasks/t26/01.png)

An import preview is already open: "Open as a new graph", file coauthors.json, format "JSON,
node-link" marked auto, "Makes Coauthors: 12 nodes, 16 edges". It shows a table with id as Key,
name as Name, and field and h_index as Attribute. Match report: "12 rows; every key is unique."
At the bottom: Direction (As the file says, Directed, Undirected), Cancel and Load.

Think-aloud: "Good. It tells me what it thinks the file is before it does anything. It says
'node-link', which is a real JSON convention, not an invented one. id is the key, name is the
label, and the other columns are attributes, not nodes. That is the right reading. It says 12
nodes and 16 edges up front. I want to see the edges table before I believe the 16."

## Step 1 -- expand the file

`S --click "coauthors.json"` -> 01.png

The file expands to two tables: nodes 12 and links 16, each with a green check.

"Two tables, with counts. Fine."

## Step 2 -- look at the edges

`S --click "coauthors.json" --click "links"` -> 02.png

The columns are source (From -> node), target (To -> node) and weight (Weight, auto) with "Higher
means: Stronger / Farther / Capacity". Match report: "16 rows; every row has both ends ... 16 rows
became 16 edges."

"Now this I like. 'Sixteen rows became sixteen edges.' That is the sentence every importer owes
me: what went in and what came out. And it asks what the weight MEANS, stronger or farther,
instead of assuming. I would call that column a predicate weight, but fine. Coauthorship is
symmetric. 'As the file says' -- I cannot see what the file says, so I will set it explicitly to
Undirected."

## Step 3 -- load as undirected

`S --click "coauthors.json" --click "links" --click "Undirected" --click "Load"` -> 03.png

The graph view opens. The canvas shows 12 gray dots and 16 lines in a ring, with no labels. The
right panel reads: Nodes 12, Edges 16, Direction Undirected, Weight "weight, stronger",
"Readings not computed". A chip says "Nothing is colored or sized by a row".

"Counts match the preview, and it kept my direction choice. Good. The canvas has no labels at
all, so I cannot tell which dot is a person. Is position meaningful here? It looks like a circle
layout, so I assume not. To look at one person I need to find her, so I will go through the
table."

## Step 4 -- open the table

`... --click "Load" --click "Table"` -> 04.png

The node table opens under the canvas with id, name, field and h_index.

## Step 5 -- pick one person

`... --click "Table" --click "Maya Novak"` -> 05.png

The row turns blue. A dark label floats above the toolbar: "Selects Maya Novak". The canvas does
not change: no dot is marked. The right panel still shows the whole graph.

"It says it selects her. Which dot is she? Nothing is highlighted. The inspector still talks
about the whole graph. Maybe I clicked the wrong cell."

`... --click "Table" --click "res_0005"` -> 06.png

The result is identical.

## Step 6 -- check what is selected

`... --click "Maya Novak" --click "Selection"` -> 07.png

The right panel shows the "Selection" row (Built-in row): "Paints 0 nodes", color FFD700, size
1.45, opacity 40%.

"Zero. It told me 'Selects Maya Novak' and the selection holds zero nodes. That is a tool saying
one thing and doing another. This is exactly what I do not tolerate."

## Step 7 -- two last attempts

`... --click "Maya Novak" --key Enter` -> 08.png

The row gets a focus outline. Nothing else happens.

`... --click "Maya Novak" --click "Selects Maya Novak"` -> 09.png

Nothing changes.

"Two unexplained failures. I stop here. Importing was honest. Looking at a person was not:
there are no names on the canvas, the row click claims to select her and does not, and I never
saw her coauthors, her attributes in a card, or her place in the graph."

## Outcome

- **Succeeded?** Only half. The data came in correctly, and the counts checked out at every
  step (12 nodes, 16 edges, undirected, weight read as strength). I never managed to look at
  one person: the canvas never showed which dot was Maya Novak, and the Selection row said
  it painted 0 nodes.
- **Single Ease Question:** 3 out of 7. Importing alone would be a 6. Looking at one person
  was a 1.
- **Would I use this instead of my current tool?** Not yet. For RDF it is not even a
  candidate, because it takes JSON node-link and CSV, not Turtle. For a small property-graph
  export, the import preview is better than anything in Gephi or Neo4j Browser. The
  match-report sentence "16 rows became 16 edges" is what I want from every loader. But a
  viewer that says "Selects Maya Novak" and then selects nothing has lied to me once. After
  that, I would check every highlight it shows me against SPARQL, and then I may as well stay
  in SPARQL.

## Problems seen

1. Clicking a row in the node table shows "Selects Maya Novak", but nothing is selected. The
   canvas marks no dot, the inspector stays on the whole graph, and the Selection row says
   "Paints 0 nodes". This is the reason the task failed.
2. The canvas has no node labels, so the only way to find a person is the table.
3. "As the file says" for direction does not show what the file actually says.
4. The "Selects Maya Novak" label floats above the toolbar, far from the row. It reads like a
   button but does nothing.

## Liked

- The import preview names the format, the key and the name columns, and keeps attributes as
  attributes instead of turning them into nodes.
- The per-table counts and the match report ("16 rows became 16 edges") make the numbers easy
  to check.
- The import asks what the weight means (stronger, farther or capacity) instead of guessing.
- After loading, the summary repeats the same counts and the direction chosen.
