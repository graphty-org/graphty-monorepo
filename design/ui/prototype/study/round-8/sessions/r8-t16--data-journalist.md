# Session: data journalist ("Ruth") -- get a list of connections into a blank project

Task as given: "A coworker started a new, blank project for you in this program and then left for
the day. It has nothing in it yet. Get your list of connections into it."

Renders: tmp/round-8-sessions/r8-t16--data-journalist/02.png ... 07.png (start screen:
shots/tasks/r8-t16/01.png). All commands ran from design/ui/prototype.

## Step 1 -- start screen (01.png)

Think-aloud: "Empty canvas, a card in the middle that says 'No nodes to draw -- This graph is
empty' and a big blue 'Add data...' button. That's obviously where I start. There are three other
'Add data' links on the screen too, but they're probably all the same thing."

## Step 2 -- Add data (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t16 --click "Add data..."

Seen: the left panel switched to "Data" (Sources, Attributes), and a dark menu called "Choose a
file" opened: "Data file: CSV, JSON, GEXF or GraphML", "Recipe: mule-ring-triage.graphty",
"Style file: risk-review-look.json".

Think-aloud: "My sheet exports as CSV, so the first one. I don't know what a recipe or a style
file is, and the 'mule ring' one belongs to somebody else's case. That's odd to see in MY blank
project."

## Step 3 -- Data file (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML"

Seen: no file dialog. A file, "transfers-2026-03.csv", was already chosen (account-to-account
transfers, not my sheet). The project name at the top changed by itself from "Untitled project"
to "Transfers, March 2026". The header says "Open as a new graph -- Esc to leave". A preview table
shows from_account (From -> node), to_account (To -> node), amount (Attribute) and timestamp
(Attribute). The settings bar reads "Each row is an edge, node to node, One edge per Row,
Weight: none". At the bottom is a "Match report" with "9,113 rows", "The data stays on this
computer: nothing is uploaded", "3,000 nodes of type node ... none is unconnected or dropped",
"9,113 rows became 9,113 edges", and the buttons Cancel and Load.

Think-aloud: "I never got to pick my file. I'll pretend this is mine. The match report is exactly
what I want: it tells me nothing was dropped and nothing leaves my computer, and it gives me row
counts I can check against the sheet. But 'Open as a new graph'? My coworker already made a
project. Is this going somewhere else? And it renamed the project without asking. 'Nodes of type
node' -- my sheet has people AND companies. Where do I say which is which?"

## Step 4 -- column dropdown (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "From -> node"

Seen: a menu with "From ->", "To ->", "Subtype", "Name", Time (disabled, "Reads as Category;
needs Time, or a Number of seconds since 1970"), Weight (disabled), "Edge id", Position
(disabled), "Attribute".

Think-aloud: "This is graph-tool language. Maybe 'Subtype' is people versus companies, but I'm
guessing. Seconds since 1970? No. It already says it matched fine, so I'm not touching it. I
won't press Escape either, because the top says 'Esc to leave' and I bet that throws away the
whole import."

## Step 5 -- Load (05.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load"

Seen: back on the Graph screen. A gray cloud of hexagons, no labels. A chip reads "Nothing is
colored or sized by a row". The right panel says "Transfers -- Graph from 2 tables", 3,000
nodes, 9,113 transfers, Directed, Weight "None (each edge counts 1)", density, components,
degrees, and a degree chart.

Think-aloud: "It's in. 3,000 and 9,113 match the preview, so nothing went missing. But 'from 2
tables'? I gave it one file. And there are no names on the picture, so I can't show my editor
anything yet."

## Step 6 -- is it in my coworker's project? (06.png)

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load" --click "Transfers"

Seen: the graph list holds only "Transfers, 3,000 nodes" and "Compare graphs...". A grayed-out
line reads "New graph from... This version has no transform API: extract, bipartite projection,
quotient, combine and null-model sample would each make a new graph here".

Think-aloud: "Only one graph, so it went into the project my coworker made and didn't create a
second one. Good. That gray paragraph is gibberish to me."

## Step 7 -- "from 2 tables" (07.png)

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load" --click "from 2 tables"

Seen: "Edit: transfers". Two tables are listed: "accounts 3,000" and "transfers 9,113". The
banner reads "account (3,000) --transfers (9,113)--> account (3,000)". The amount column is now
Weight ("Higher means Stronger"), timestamp is Time, and the bar says "Weight: amount". The
match report reads "9,113 of 9,113 from_account found in accounts". Apply is off.

Think-aloud: "Now I'm confused. Before I hit Load it said nodes of type 'node', amount was just
an Attribute, and weight was none. The summary on the right STILL says weight none. This screen
says amount IS the weight, there's an 'accounts' table I never gave it, and they're called
'account'. Which one did it actually build? If I compute 'who sits in the middle' on this, I
need to know if the money amounts were counted. I can't explain this to an editor." Stopped
here.

## Outcome

- Did I succeed? Yes, I think so. The data is in the project my coworker made, and the counts
  match what the preview promised. I am not sure what the program decided about weights and node
  types, though.
- Single Ease Question: 5 of 7. Getting it in took three clicks and was easy. Then the
  unexplained "2 tables" and the weight contradiction cost me my confidence.
- Would I use this instead of my current tool? Maybe, for this step. The match report ("none is
  unconnected or dropped", "nothing is uploaded") is better than anything I've seen in Gephi.
  But I'd need (a) a place to say people versus companies in my own words, (b) one consistent
  story about the weights, and (c) not having my project renamed and a "new graph" announced when
  I just wanted to fill the one I had.

## Problems noticed (participant's words)

1. Clicking "Data file" did not let me choose my file (prototype limitation, or a missing file
   dialog).
2. The project renamed itself to the file's name without asking.
3. "Open as a new graph" made me think it would not go into my coworker's project.
4. The column role menu ("Subtype", "Edge id", "Attribute", "seconds since 1970") gives me no
   way to say people versus companies.
5. "Esc to leave" scared me off pressing Escape to close a menu.
6. "Graph from 2 tables" after I gave it one file is unexplained.
7. The import preview said weight none, amount Attribute, type "node". The edit screen says
   weight amount, amount Weight, type "account", plus an extra "accounts" table. The summary
   still says weight none. These contradict each other.
8. Developer text in the graph menu: "This version has no transform API...".
9. Someone else's recipe ("mule-ring-triage") shows up in the file menu of a blank project.
