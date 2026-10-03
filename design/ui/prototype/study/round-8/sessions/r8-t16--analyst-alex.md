# Session: getting a list of connections into a blank project -- Analyst Alex

Participant: Analyst Alex (intermediate graph analyst, Gephi and NetworkX user, cautious about where company data goes).

Task as given: "A coworker started a new, blank project for you in this program and then left for the day. It has nothing in it yet. Get your list of connections into it."

All commands were run from `design/ui/prototype`. D below stands for
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t16--analyst-alex`.

## Step 1 -- the start screen (shots/tasks/r8-t16/01.png)

"OK, 'Untitled project'. Empty canvas, a card in the middle that says 'No nodes to draw, this graph
is empty' and a big blue 'Add data...' button. There's also 'Add data to start' on the left and an
'Add data...' link on the right. Three of the same thing, fine, I can't miss it.

Before I put anything in: there's a chip up top that says 'Local only'. That's what I want to hear,
but I want to know what it means before I put a real file in here."

## Step 2 -- hover the "Local only" chip

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t16 --hover "Local only"

Tooltip: "Privacy settings".

"That's... the tooltip just tells me it's a settings button. It doesn't tell me 'your files don't
leave this computer'. Let me click it."

## Step 3 -- click "Local only"

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t16 --click "Local only"

A Settings dialog opens on Privacy. The section "Where your data goes" says: Files you open --
"Read on this computer. Never uploaded." Usage data -- "Off. Nothing is sent."

"Good. That is the sentence I need, and 'a plain statement you can forward to whoever asks' --
yes, I would forward that to IT.

But hang on. Behind the dialog the project is now called 'Les Miserables', with 77 nodes, Louvain,
PageRank, shortest paths, a bunch of stuff in it. Where did my blank project go? Did clicking the
privacy chip open somebody else's project? That is not what a settings button should do. If I
weren't in a hurry I'd stop here and wonder whether I just broke my coworker's project. I'm going
to start over and not touch that chip again."

(Each replay starts fresh from the blank project, so I went back to the start.)

## Step 4 -- click "Add data..."

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t16 --click "Add data..."

The left panel switches to "Data" with Sources, Filter and Attributes sections, and a dark menu
"Choose a file" pops up with: "Data file: CSV, JSON, GEXF or GraphML", "Recipe:
mule-ring-triage.graphty", "Style file: risk-review-look.json".

"OK, a file picker. CSV is listed first, good. The recipe and style file I don't need. Data file."

## Step 5 -- choose the data file

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML"

A preview of transfers-2026-03.csv: from_account, to_account, amount, timestamp. from_account is
tagged "From -> node", to_account "To -> node", both "auto". "Each row is: an edge", "Directed".
Below, a "Match report": 9,113 rows, 3,000 nodes, "The data stays on this computer: nothing is
uploaded", "9,113 rows became 9,113 edges." Load and Cancel at the bottom right.

"This is the part I actually like. It figured out source and target on its own, it shows me the
first rows, and it tells me 9,113 rows and 3,000 nodes before I commit. I can check those against
my SQL count. And there it is again, 'nothing is uploaded', right where I load the file. That's
where it should be.

Two things bother me. One: the top bar now says 'Transfers, March 2026' instead of 'Untitled
project', and the header says 'Open as a new graph'. A new graph? I wanted it in the project my
coworker made. Is this replacing it, or making a second one? Two: it says 'Weight: none (each edge
counts 1)' but I have an amount column right there. For now I'll take the defaults, I can fix the
weight later. Load."

## Step 6 -- Load

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load"

The canvas shows a gray hexagon blob. Right panel Summary: Nodes 3,000, Edges 9,113 transfers,
Directed, Weight "None (each edge counts 1)", 1 weak component, highest total degree 907, a
degree chart. A note at top left: "Nothing is colored or sized by a row."

"Counts match: 3,000 and 9,113. That's the first thing I check and it passes. And of course the
picture is a hairball -- a gray honeycomb this time -- but I didn't ask for a picture yet.

It says 'Graph: from 2 tables'. I gave it one file. What's the second table?"

## Step 7 -- check the project menu

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load" --click "Transfers, March 2026"

Menu: Rename, Open project or file..., Save, Export..., Apply recipe or style file..., Version
history, Save as..., Close project.

"Normal file menu. Save is there with Ctrl+S, so I'd hit that before I leave. It doesn't tell me
whether this is still the project my coworker made, though -- it just has a new name now. I
assume it renamed itself after the file. I'd rather it hadn't; my coworker might be looking for
'Untitled project' tomorrow. Probably harmless."

## Step 8 -- check "from 2 tables"

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load" --click "from 2 tables"

"Edit: transfers". Tables list: "accounts 3,000" and "transfers 9,113". The columns now say "From
-> account", "To -> account", amount is "Weight" (Higher means Stronger), timestamp is "Time".
The bar says "Weight: amount". Match report: "9,113 of 9,113 from_account found in accounts."

"OK so it made an accounts table out of the ids. Fine, that's like Gephi's nodes table. But now
this screen says Weight: amount and the summary on the graph said Weight: None. Before I loaded it
said none too. So which is it? Did it weight my edges by amount or not? If I run betweenness and
it used amount as a distance I'm going to get a different answer from NetworkX and not know why.
That's the kind of thing I'd have to go and check every time.

Also, before I loaded it called the ends 'node', now it calls them 'account'. Not a big deal, just
one more thing that changed under me.

I'm done -- the list is in, the counts are right. I'd press Ctrl+S and go home."

## Outcome

- Did I succeed? Yes, I think so. 3,000 nodes and 9,113 edges, matching the file. I'm not 100%
  sure it's in my coworker's project rather than a new one, because the name changed and the
  import screen said "Open as a new graph".
- Single Ease Question: 5 of 7. Loading itself was quick: Add data, pick the file, Load. What
  took longest was the privacy chip throwing me into some other project full of Les Miserables
  stuff, and then working out whether the weight was amount or none.
- Would I use this instead of my current tool? For getting a CSV in, yes -- it's better than
  Gephi's import wizard: it guessed the columns, showed counts before I committed, and told me
  the data stays on my machine right on the import screen. I'd still want to know for sure what
  it did with the amount column before I trusted any number it gives me.

## What went wrong, in my words

1. Clicking "Local only" opened Settings over a different, full project ("Les Miserables"). My
   blank project disappeared behind it.
2. The "Local only" tooltip only says "Privacy settings" -- it doesn't say the data stays local.
3. The project renamed itself from "Untitled project" to "Transfers, March 2026", and the import
   header said "Open as a new graph", so I can't tell if I filled my coworker's project or made a
   new one.
4. Weight: the import preview and the graph summary say "none (each edge counts 1)"; the edit
   screen for the same table says "Weight: amount".
5. The graph says "from 2 tables" when I loaded one file; the second (accounts) was made for me
   without saying so on the load screen.
6. The ends were called "node" before loading and "account" after.

## What I liked

- The match report before loading: row, node and edge counts I can check against SQL.
- "The data stays on this computer: nothing is uploaded" on the import screen itself.
- Source and target columns detected automatically.
- The Privacy page's "Where your data goes" table, written to forward to IT.
