# Session: two spreadsheets in as one network -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (study/personas/knowledge-engineer.md).
Task as given: "You have never used this program before. Two spreadsheets from your team are in
your Downloads folder: one lists the machines on the office network, one lists which machine talks
to which. You want them in as one network and you want to know that every machine and every
connection arrived."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t04--knowledge-engineer/.

## Step 0 -- start screen (shots/tasks/r8-t04/01.png)

Think-aloud: "Start page. 'Open project or file...' reads as one file. I have two, a node list and
an edge list. 'New from data...' sounds like the builder. 'Files are read on this computer and
never uploaded' -- good, that is the first thing my compliance people ask. I ignore the samples."

## Step 1 -- New from data...

    timeout 120 node app-b/study.mjs --try .../01.png task:r8-t04 --click "New from data..."

Screen: a file chooser, Downloads > it-estate, checkboxes for hosts-2026-03.csv,
connections-2026-03.csv, and a grayed-out estate-diagram.png.

Think-aloud: "Checkboxes, so I can take both at once. The PNG is grayed out; it knows that is not
data. Fine."

## Step 2 -- pick both files, Open

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t04 --click "New from data..." \
      --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

Screen: an import view titled "Open as a new graph". Left: Tables -- hosts 300, connections 1,105,
each with a check. Top line: "Makes host (300) --connections (1,105)--> host (300)". The hosts
table: "Each row is a node", type "host", id column marked Key (auto), hostname marked Name, the
other columns "Attribute", 69 columns. Match report: "300 rows; every key is unique."

Think-aloud: "Now this I can read. Before it builds anything it tells me the shape it will build:
host to host over connections, with counts. That is the one line I would want from any importer.
It found the key column on its own and says every key is unique -- which is the first thing I
would have checked. It calls the columns 'Attribute'; I would say datatype property, but for an
IT spreadsheet 'attribute' is honest. What I really want is the edge side: did every source and
target resolve to a host?"

## Step 3 -- open the connections table

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t04 --click "New from data..." \
      --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections"

Screen: "Each row is an edge, host to host", "One edge per Row". Columns: id = Edge id,
source = From -> host, target = To -> host, bytes_total_24h = Weight ("Higher means Stronger").
Match report:
- 1,105 rows; every row has both ends.
- 1,105 of 1,105 source found in hosts.
- 1,105 of 1,105 target found in hosts.
- bytes_total_24h is each edge's weight; every row has a value. A row without one would weigh 1.
- 1,105 rows became 1,105 edges.

Think-aloud: "This is the known-answer check I normally do in a notebook with a join and a count.
Every source and every target matched, rows in equals edges out, nothing merged. I believe these
numbers because it shows me both sides of each one.

"One objection, and I would raise it with the vendor: it chose bytes_total_24h as the edge weight
without asking me. That is an interpretation, not data. It is visible and labeled, so it is not
hidden, but a default that changes what 'stronger' means should be a question, not a decision.
Directed is selected and 'As the file says' is grayed; fine for network flows, I would have
picked directed anyway."

## Step 4 -- Load

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t04 --click "New from data..." \
      --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" \
      --click "connections" --click "Load"

Screen: a canvas with the network. Right panel, Data tab, Summary: Nodes 300 nodes, Edges 1,105
connections, Attributes 69 node / 26 edge, Direction Directed, Weight bytes_total_24h, stronger,
Isolated nodes 7, average total degree 7.37, highest 25, "4 more readings not computed". Header
"Hosts -- Graph from 2 tables". A legend card floats over the canvas: "Size:
vu....iated_over_30_days", circles 0 to 6, linear radius scale.

Think-aloud: "300 nodes, 1,105 edges -- the same as the import report, so nothing was lost between
the preview and the graph. 7 isolated hosts; that is a real finding about the data, not the tool,
and it is good that it says so up front.

"Two things I did not ask for. First, node size is mapped to some vulnerability count. Who decided
that? There is a legend, which is more than Neo4j gives me, but an encoding I did not request
implies meaning, and on a 'did my data arrive' task I want a neutral drawing. The legend title is
also truncated in the middle ('vu....iated_over_30_days'), so I cannot even read which column it
is without guessing. Second, the graph is called 'Hosts' in the panel and 'IT estate, March 2026'
in the title bar. Which is its name? Small, but a tool that names one thing two ways makes me
check everything twice. And 'Edges: 1,105 connections' -- it is the edge table's name, I see why,
but I would rather the count said edges."

## Step 5 -- check provenance ("from 2 tables")

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t04 --click "New from data..." \
      --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" \
      --click "connections" --click "Load" --click "from 2 tables"

Screen: the same mapping view, now titled "Edit: hosts-2026-03.csv", with Apply grayed ("Apply is
off: Nothing has changed yet").

Think-aloud: "Good. The mapping is not thrown away after load; I can get back to it and see
exactly how each column was read. That is what I mean by the tool not hiding what it did on
import. I am done."

## Outcome

- Succeeded? Yes. Both files came in as one network, and I can state with evidence that all 300
  machines and all 1,105 connections arrived: every key unique, every source and target matched,
  rows in equals edges out, and the loaded graph's summary repeats the same counts.
- Single Ease Question: 6 of 7. The path was obvious and the checks were exactly the ones I would
  run by hand. One point off for the defaults I did not ask for: an edge weight chosen for me, and
  a node-size encoding by a vulnerability column on a plain import, with a truncated legend title.
- Would I use this instead of my current tool? For this kind of job -- two CSVs, a node list and
  an edge list, and a need to prove nothing was dropped -- yes, over a pandas notebook plus Gephi:
  the match report replaces the join-and-count I write every time, and nothing leaves the machine.
  For my own knowledge graph, no, not yet: I would still have to flatten Turtle to CSV and lose
  datatypes, language tags and named graphs, and nothing on this screen suggested RDF import.

## Problems noted, in her words

1. "It picked bytes_total_24h as the weight without asking." (import, connections table)
2. "Why are the nodes sized by vulnerabilities? I did not ask for any encoding." (graph after load)
3. "The legend title is cut in the middle; I cannot read which column it is." (graph after load)
4. "Is it 'Hosts' or 'IT estate, March 2026'?" (title bar versus panel header)
5. "'Edges: 1,105 connections' -- say edges." (Summary)

## What worked for her

- The one-line shape preview "host (300) --connections (1,105)--> host (300)" before loading.
- The match report: per-end resolution counts and "1,105 rows became 1,105 edges".
- Key detection with "every key is unique".
- Summary after load repeats the counts and surfaces 7 isolated nodes.
- The import mapping stays reachable after load ("from 2 tables").
- "Files are read on this computer and never uploaded" on the start page.
