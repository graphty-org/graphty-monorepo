# Session: bring in two wide spreadsheets (hosts and connections), knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (persona file study/personas/knowledge-engineer.md).
Task as given: "The configuration database exported two spreadsheets: one line per host, with 69
things recorded about each, and one line per network connection, with 26 things recorded about
each. They are in your Downloads folder and graphty has never seen them. Bring them in so each
connection is drawn between the two hosts it runs between, with busier connections tying hosts
more tightly. Before you bring them in, find which of the 69 things recorded about each host tells
how many serious security holes it has."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t23--knowledge-engineer/.

## Step 1 -- start screen (shots/tasks/t23/01.png)

Thinking aloud: "Start screen. Samples I skip. Two CSV files, not Turtle -- fine, this is a
property-graph job, not RDF, so I will not hold that against it today. 'Open project or file' or
'New from data'. My files are data, not a project, so New from data. 'Files are read on this
computer and never uploaded' -- good, that is the first thing my security people would ask."

## Step 2 -- New from data (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:t23 --click "New from data..."

"A file chooser on Downloads > it-estate. hosts-2026-03.csv, connections-2026-03.csv, and a PNG
that is grayed out -- correct, it is not data. Checkboxes, so I can pick both at once. Good."

## Step 3 -- pick both files, Open (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:t23 --click "New from data..." \
      --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

"Now this is what I want to see before anything is drawn. A line at the top that says what it
thinks the result is: host (300) --connections (1,105)--> host (300). That is a schema statement,
and the counts are labeled. hosts: 300 rows, each row is a node, type host, id is the key,
'auto' -- it guessed, and it says it guessed. hostname is the name. 'An edge needs exactly two
linking columns; this table has none' -- clear about why hosts is not an edge table. Match
report: 300 rows, every key unique. That is the known-answer check done for me. 69 columns, 8 of
300 rows shown."

"Now the column. I am not scrolling through 69 headers. There is 'Find a column'."

## Step 4 -- find the vulnerability column (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:t23 --click "New from data..." \
      --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" \
      --click "Find a column" --key v --key u --key l --key n

"Typed 'vuln'. Seven matches: vuln_count_critical, _high, _medium, _low, one truncated
'vuln_count_critical...iated_over_30_days', the scan timestamp and the scan policy. 'Serious'
means critical to me -- if they meant critical plus high they would have to say so. The
truncated one annoys me; I cannot read its middle. Probably 'unremediated over 30 days'. I will
guess, but I should not have to."

## Step 5 -- jump to it (05.png)

    ... --click "vuln_count_critical"

"It scrolled the table to the column and outlined it. Type '#', so it read it as a number, not
text. Values are mostly 0 in this sample, with vuln_count_high next to it in the 1 to 14 range,
which is plausible for real scan data. Answer: vuln_count_critical. If the moderator means
'critical or high', it is the pair vuln_count_critical and vuln_count_high."

## Step 6 -- check the connections mapping (06.png)

    ... --click "Open" --click "connections"

"This is the part I care about. Each row is an edge, host to host. source mapped 'From -> host',
target mapped 'To -> host'. id is the edge id. And it already chose bytes_total_24h as the
Weight, with 'Higher means: Stronger / Farther / Capacity', Stronger selected. That is exactly
'busier connections tie hosts more tightly', and the choice is spelled out instead of hidden.
Whether busier means bytes or flow_count_24h is debatable; I accept bytes. The match report says
1,105 rows, every row has both ends, every row has a weight, and what a row without one would
weigh. 1,105 rows became 1,105 edges -- nothing silently merged. That sentence is the one I would
quote to a colleague. Direction is Directed; a connection from source to target is directed, so
I leave it."

"I did not have to change anything. I am a little suspicious of that -- it guessed everything
right -- but every guess is labeled 'auto' or shown, so I could have overruled it."

## Step 7 -- Load (07.png)

    ... --click "connections" --click "Load"

"Graph: 300 nodes, 1,105 edges, Directed, Weight bytes_total_24h, stronger. Counts match the
preview. 7 isolated nodes -- I would want to know which, that is a quality question, and the 7 is
a link so presumably it shows me. 'Nothing is colored or sized by a row' -- honest, it is not
implying meaning with color. 'Columns: 8 of 69' at the bottom, so the rest are still there, not
dropped. The layout is a force layout; position is not meaningful except clustering, which is
what the weights do. Done."

## Outcome

- Succeeded: yes. The serious-security-holes column is vuln_count_critical (with vuln_count_high
  beside it if "serious" includes high). Both files loaded as 300 host nodes and 1,105 directed
  connection edges weighted by bytes_total_24h, higher = stronger.
- Single Ease Question: 6 of 7. Lost a point for the truncated column name in the search list
  (vuln_count_critical...iated_over_30_days) that I could not read in full.
- Would I use this instead of my current tool? For tabular exports like this, yes over Gephi's
  import wizard: the preview states the schema in one line, labels every guess, and the match
  report counts rows in and edges out, which is what I check first. It is still not for RDF -- it
  reads CSV, so my Turtle work stays in GraphDB.

## Problems noted

1. Truncated column name in the Find a column results (middle elided), severity 2.
2. Weight was chosen automatically as bytes_total_24h; flow_count_24h is an equally plausible
   reading of "busier". It is shown and changeable, so minor, severity 1.
