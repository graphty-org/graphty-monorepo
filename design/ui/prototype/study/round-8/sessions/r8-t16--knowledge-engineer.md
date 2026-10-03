# Session: knowledge engineer -- get a list of connections into a blank project

Participant: Dr. Min-ji Kim, knowledge graph engineer (study/personas/knowledge-engineer.md).
Task as given: "A coworker started a new, blank project for you in this program and then left for
the day. It has nothing in it yet. Get your list of connections into it."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t16--knowledge-engineer/.

## Step 1 -- the start screen (shots/tasks/r8-t16/01.png)

"Untitled project, empty canvas, a card that says 'No nodes to draw -- This graph is empty' and an
'Add data...' button. There is a second 'Add data...' link in the right panel and an 'Add data to
start' in the left. Three ways to the same door; fine, at least the door is obvious. 'Local only'
up top -- good, I want to know nothing leaves the machine. I go straight to import, as I always do."

## Step 2 -- Add data

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t16--knowledge-engineer/02.png task:r8-t16 --click "Add data..."

(Tool note: "Add data..." matched a button and a link; the button was clicked.)

Saw: the left panel switched to Data, with Sources, a filter section and Attributes, and a dark
"Choose a file" menu: "Data file: CSV, JSON, GEXF or GraphML", "Recipe: mule-ring-triage.graphty",
"Style file: risk-review-look.json".

"CSV, JSON, GEXF or GraphML. No Turtle, no N-Triples, no JSON-LD, no SPARQL endpoint. So it is
not an RDF tool -- I note that and move on, because today's file is a plain edge list anyway. I
do not know what a 'recipe' is and I am not clicking it. Data file."

## Step 3 -- pick the data file

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t16--knowledge-engineer/03.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML"

Saw: a full-width preview, "Open as a new graph". transfers-2026-03.csv, CSV comma (auto).
"Makes: node --transfers-2026-03 (9,113)--> node". "Each row is: a node / an edge" with edge
selected; from_account mapped "From -> node", to_account "To -> node", amount and timestamp as
Attribute. A match report: 9,113 rows, 3,000 nodes, every row has both ends, none dropped, no
duplicate pairs, "9,113 rows became 9,113 edges". "The data stays on this computer: nothing is
uploaded." Direction: Directed. Cancel / Load.

"Now this I like. It tells me which column it took as the source and which as the target, it tells
me what is an attribute and not a node -- amount and timestamp are NOT going to become nodes,
which is exactly the Gephi failure I expect -- and it gives me counts I can check: 9,113 in,
9,113 edges out, 3,000 distinct ids, nothing dropped. That is the 'how many went in, how many
came out' sentence I always ask for. I would check 3,000 against a SELECT COUNT(DISTINCT ...)
and I would be satisfied."

"Two things bother me. 'Open as a new graph' -- my coworker made me a project; am I adding to it
or making a new graph somewhere else? And the project name at the top already changed from
'Untitled project' to 'Transfers, March 2026' before I pressed anything. I did not rename it.
Also '3,000 nodes of type node' -- type node. A class called 'node'. Fine, it is a default, but
I would rather it said 'no class given'."

## Step 4 -- Load

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t16--knowledge-engineer/04.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load"

Saw: a gray hexagon blob on the canvas, "Nothing is colored or sized by a row". Right panel
Summary: 3,000 nodes, 9,113 transfers each a distinct pair, Directed, Weight None, density
0.00101, 1 weak component, reciprocity 0, average degree 6.08, highest 907, a log-log degree
plot. Header: "Graph from 2 tables".

"Counts match the preview: 3,000 and 9,113, highest degree 907 matches the 'top node in 907
transfers' line. Good, the numbers are consistent between the preview and the result. One weak
component, it says which kind. The hairball is a hairball, but nothing is colored, and it says so
-- I appreciate a tool that admits position and color mean nothing yet."

"But: 'from 2 tables'. I loaded ONE file. Where is the second table?"

## Step 5 -- what are the two tables?

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t16--knowledge-engineer/05.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load" --click "from 2 tables"

Saw: "Edit: transfers". Tables: "accounts 3,000" and "transfers 9,113". Makes: "account (3,000)
--transfers (9,113)--> account (3,000)". from_account now "From -> account". amount is now
"Weight", Higher means Stronger. timestamp is now "Time". "Weight: amount" at the top. Match
report: "9,113 of 9,113 from_account found in accounts."

"So it made an 'accounts' table out of the distinct ids. I can live with that -- it is just the
node list -- but nobody told me. More serious: in the preview I approved, amount was an
attribute, timestamp was an attribute, weight was 'none, each edge counts 1', and the class was
'node'. Now amount is the weight, timestamp is a time, the class is 'account'. And the summary I
just looked at on the graph still says Weight: None. Which one is true? Either the summary is
wrong or this screen is. That is an unexplained mismatch in the first two minutes, and I stop
trusting the summary panel until someone explains it. In my world, a viewer that quietly
reinterprets a column after I approved the mapping is a viewer whose numbers I cannot defend."

## Step 6 -- did it go into the coworker's project?

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t16--knowledge-engineer/06.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load" --click "Transfers, March 2026"

Saw: project menu -- Rename (F2), Open project or file, Save, Export, Apply recipe or style file,
Version history, Save as, Close project.

"There is only one project open and it is the one I started in, just renamed after my file. So I
think the data is in the coworker's project, not a separate one; 'Open as a new graph' must mean
a new graph inside the project. The rename is presumptuous -- my coworker may have meant a name --
but it is reversible with Rename. Nothing says it is saved; I would press Ctrl+S before leaving.
I stop here."

## Verdict

- Succeeded? Yes, I think so. The 9,113 connections are in the project, with counts that match
  the file. I am fairly but not fully sure they are in the coworker's project rather than a new
  one, because the preview said "Open as a new graph" and the project was renamed under me.
- Single Ease Question: 5 of 7. Getting the file in was three clicks and the preview is the best
  import preview I have seen in a graph viewer. Points off for the two things I could not explain:
  "from 2 tables" when I gave it one file, and the mapping changing (amount from attribute to
  weight, "node" to "account") after I approved it, while the summary still says no weight.
- Would I use it instead of my current tool? For an edge list like this, over Gephi -- yes,
  probably, because it shows me what it will do before it does it and counts in and out, and it
  stays local. For my actual work, no: there is no Turtle, JSON-LD, N-Triples or SPARQL import, so
  for RDF it is the same lossy CSV export I already resent. And until the weight/attribute
  mismatch is explained, I would not quote any number from that summary panel to anyone.

## Problems noted

1. After Load, the table editor shows amount as Weight, timestamp as Time, and the node class as
   "account", but the import preview the participant approved showed amount and timestamp as
   attributes, weight none and class "node"; the graph summary still says Weight: None.
   Unexplained mismatch between three screens (severity high for this persona -- trust).
2. "Graph from 2 tables" after loading one file; the derived "accounts" table appears without a
   word in the preview or the result (medium).
3. The project title changed from "Untitled project" to "Transfers, March 2026" during the preview,
   before Load, without asking; together with the heading "Open as a new graph" this made it
   unclear whether the data went into the coworker's project (medium).
4. "3,000 nodes of type node" -- a default class literally named "node" (low).
5. No RDF formats in the file menu (expected for this product; recorded as the persona's standing
   "not for RDF" verdict, not softened).
6. Three "Add data" entry points on the empty screen, two with identical text (low; harmless, but
   the tool could not tell them apart either).
