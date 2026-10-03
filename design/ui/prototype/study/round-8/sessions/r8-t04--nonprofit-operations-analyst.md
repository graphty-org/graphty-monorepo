# Session: bring in two spreadsheets as one network and check everything arrived

Participant: Grace, the nonprofit operations and data coordinator (persona file
study/personas/nonprofit-operations-analyst.md). First time using the program.

Task as given: "You have never used this program before. Two spreadsheets from your team are in
your Downloads folder: one lists the machines on the office network, one lists which machine talks
to which. You want them in as one network and you want to know that every machine and every
connection arrived. If you do not work in IT, these two files are example data, not your own:
treat them as your list of things and your list of links between them."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t04--nonprofit-operations-analyst/.

## Step 1 -- the start screen (shots/tasks/r8-t04/01.png)

Think-aloud: "OK, a start page. 'Open project or file...' and 'New from data...'. I don't have a
project, I have data, so 'New from data' sounds like me. Also good: 'Files are read on this
computer and never uploaded' -- that's the first thing I'd check if these were donor names. And
'Local only' up top. The samples on the right I'll ignore, I have my own files."

## Step 2 -- New from data

    timeout 120 node app-b/study.mjs --try $S/02.png task:r8-t04 --click "New from data..."

Saw: a "Choose files" box showing Downloads > it-estate with hosts-2026-03.csv,
connections-2026-03.csv and a grayed-out png. Checkboxes next to each.

Think-aloud: "Checkboxes, so I can take both at once. Nice, I was worried I'd have to do one,
then figure out how to add the second. The picture is grayed out, fine, it's not data. Hosts is
my list of things, connections is my list of links."

## Step 3 -- tick both, Open

    timeout 120 node app-b/study.mjs --try $S/03.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

Saw: a screen titled "Open as a new graph". Left: "Tables" with hosts 300 (green check) and
connections 1,105 (green check). Middle: the hosts sheet as a grid, 69 columns, the id column
tagged "Key", hostname tagged "Name". A line at the top: "host (300) --connections (1,105)-->
host (300)". At the bottom: "Match report: hosts -- 300 rows; every key is unique." Buttons
Cancel and Load.

Think-aloud: "Wait, it already named it 'IT estate, March 2026' at the top. I didn't name
anything. I suppose it took that from the folder? Fine, but a bit odd.
300 rows -- my spreadsheet would say 301 in Excel with the header row, so 300 machines is right.
It guessed the id column is the key and hostname is the name, without me telling it. That's the
part I'd normally have to rename columns for. Green checks next to both tables, so it's happy.
The little arrow line at the top I sort of get -- hosts, connected to hosts. Bit
programmer-looking, but readable."

## Step 4 -- look at the connections table

    timeout 120 node app-b/study.mjs --try $S/04.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections"

Saw: the connections grid, 26 columns; "Each row is: an edge, host to host"; source tagged
"From -> host", target tagged "To -> host", bytes_total_24h tagged "Weight" with "Higher means:
Stronger / Farther / Capacity". Match report: "1,105 rows; every row has both ends. 1,105 of
1,105 source found in hosts. 1,105 of 1,105 target found in hosts. bytes_total_24h is each
edge's weight... 1,105 rows became 1,105 edges."

Think-aloud: "This is the bit I actually came for. 1,105 of 1,105 found, both columns, and
'1,105 rows became 1,105 edges.' That's exactly the sentence I'd want to copy into my email to
the director. It matched the source and target to the machine list by itself.
Then there's this 'Weight' thing on a bytes column, with 'Stronger, Farther, Capacity'. I have
no idea what that is asking me. I didn't ask for a weight. I'm going to leave it alone and hope
the default is harmless. Same with 'Directed / Undirected' at the bottom -- I'd leave it.
'One edge per Row / Pair' -- also leaving that. Too many knobs on a screen whose job is to tell
me my rows came in, but at least none of them is red."

## Step 5 -- Load

    timeout 120 node app-b/study.mjs --try $S/05.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load"

Saw: the network drawn as a big ring of gray dots and lines. A floating box at top left "Size:
vu....iated_over_30_days" with a dot-size legend. Right panel "Hosts -- Graph from 2 tables",
Summary: Nodes 300 nodes, Edges 1,105 connections, 69 node attributes, 26 edge attributes,
Direction Directed, Weight bytes_total_24h stronger, Isolated nodes 7, average/highest total
degree, "4 more readings not computed".

Think-aloud: "There's my network. And the right side repeats it: 300 nodes, 1,105 connections.
Matches. Good.
Two things bug me. One, why are the dots sized by something called 'vu....iated_over_30_days'?
I didn't ask for that, and I can't even read the whole name. If I put this on a slide someone
will ask what the big dots mean and I won't know. Two, 'Isolated nodes 7'. Does that mean 7 of
my machines didn't come in properly? It said 300 nodes, so I think they're there, just with no
links. But that word 'isolated' makes me nervous. Let me click it."

## Step 6 -- click the isolated count

    timeout 120 node app-b/study.mjs --try $S/06.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load" --click "7"

Saw: a table opened under the picture: "300 nodes from hosts-2026-03.csv", id and hostname
columns, starting with CI0100003, CI0100062...

Think-aloud: "Hm. I clicked 7 and got all 300. I wanted to see which 7. Either it's not
filtered, or I'm missing how to filter. I can't tell from this which machines have no
connections. Not a deal-breaker for today's job -- every machine is in, the 300 is right there --
but if this were people, the 7 with no ties are exactly who I'd want to name."

## Step 7 -- can I get the check back later? Click "from 2 tables"

    timeout 120 node app-b/study.mjs --try $S/07.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load" --click "from 2 tables"

Saw: back in the table screen, now titled "Edit: hosts-2026-03.csv", same match report, Apply
grayed out with "Apply is off: Nothing has changed yet".

Think-aloud: "Good, the link takes me back to the report. So next quarter, or when the
director asks 'are you sure everything is in?', I can come back here. I'm done."

## Outcome

Did I succeed? Yes. Both files came in as one network, and I saw in plain numbers that 300
machines and 1,105 connections arrived, with every connection's two ends found in the machine
list. I'm sure of it.

Single Ease Question (1 = very difficult, 7 = very easy): 6. Picking both files at once, the
automatic key and from/to guesses, and "1,105 of 1,105 found" made it easy. It loses a point
for the jargon I had to ignore (Weight, Stronger/Farther/Capacity, Directed, One edge per
Row/Pair), the unrequested dot sizing by a column I can't read, and the "Isolated nodes 7" click
that showed all 300 instead of the 7.

Would I use this instead of my current tool? For getting the export in and proving it's
complete, yes -- it's quicker than building a node list and edge list by hand for an Excel
add-in I can't install anyway, and the "read on this computer, never uploaded" line matters for
donor data. Whether I keep using it depends on the next part: whether I can get a clean slide
picture with readable names and colors I can explain, and whether next quarter's export goes in
as easily. Today's part, though, I'd use.

## Problems noted

1. The dots arrive sized by a vulnerability-count column the participant never chose, and the
   legend cuts its name to "vu....iated_over_30_days". A slide-maker cannot explain it.
2. Clicking "Isolated nodes 7" opened all 300 nodes rather than the 7 unconnected ones.
3. The import screen asks about weight ("Stronger / Farther / Capacity"), direction and "One
   edge per Row / Pair" with no plain explanation; the participant left them all at defaults
   out of uncertainty.
4. The graph was named "IT estate, March 2026" without the participant naming it; she did not
   know where the name came from.
5. "Isolated" read as "possibly failed to arrive" to a non-technical user.

## What worked

- "Files are read on this computer and never uploaded" visible on the start screen.
- Both files chosen in one picker with checkboxes.
- Key, name, from and to columns guessed with no setup.
- The match report's plain counts: "1,105 of 1,105 source found in hosts" and "1,105 rows
  became 1,105 edges".
- The summary after loading repeats 300 nodes / 1,105 connections, and "from 2 tables" returns
  to the report.
