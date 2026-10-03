# Session: two spreadsheets into one network -- the recipe recipient (Tom, lab manager)

Task as given: "You have never used this program before. Two spreadsheets from your team are in
your Downloads folder: one lists the machines on the office network, one lists which machine talks
to which. You want them in as one network and you want to know that every machine and every
connection arrived." Tom does not work in IT, so for him these are "a list of things and a list of
links between them".

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t04--recipe-recipient/.

## Step 1 -- the start screen (shots/tasks/r8-t04/01.png)

Think-aloud: "OK, a web page, nothing to install. Good. Left side says Start: 'Open project or
file' and 'New from data'. I don't have a project, I have two spreadsheets, so 'New from data'.
There's a line under it: 'Files are read on this computer and never uploaded.' And 'Local only' up
in the corner. Fine -- that's the thing I would have asked first, and it's answered before I ask.
I'm not going near the samples on the right, those aren't mine."

## Step 2 -- New from data

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t04--recipe-recipient/02.png task:r8-t04 --click "New from data..."

Result (02.png): a "Choose files" box showing my Downloads folder: hosts-2026-03.csv,
connections-2026-03.csv, and a grayed-out picture file.

Think-aloud: "There they are. Checkboxes, so I can pick both at once. I'll tick both and press
Open."

## Step 3 -- tick both, Open

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t04--recipe-recipient/03.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

Result (03.png): a big table screen. Left: "Tables", hosts 300 with a green check, connections
1,105 with a green check. Across the top: "Makes host (300) --connections (1,105)--> host (300)".
Columns with blue tags (Key, Name, Attribute), "Each row is a node / an edge", "Directed /
Undirected" at the bottom. Bottom panel: "Match report: hosts. 300 rows; every key is unique."
Cancel and a blue Load button.

Think-aloud: "That's a lot of screen. 69 columns. 'Key', 'Name', 'Attribute', 'a node', 'an edge',
'Directed' -- I don't know what half of that wants from me, and I'm not going to touch it. But I
read the numbers: 300 and 1,105, both with green ticks. I'd open the spreadsheet and check the row
count, but 300 machines sounds right for a list like this. The title at the top says 'IT estate,
March 2026' -- I didn't name it that; I suppose it took it from somewhere. The report at the bottom
only talks about hosts. What about the links? Did they all hook up? Let me click 'connections' on
the left."

## Step 4 -- look at the connections table

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t04--recipe-recipient/04.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections"

Result (04.png): the connections table. Match report: "1,105 rows; every row has both ends. 1,105
of 1,105 source found in hosts. 1,105 of 1,105 target found in hosts. bytes_total_24h is each
edge's weight ... 1,105 rows became 1,105 edges."

Think-aloud: "This is the bit I wanted. 1,105 of 1,105, both sides found. Nothing dropped. That's a
number I can repeat to someone. There's a sentence about 'weight' and a little 1 / 0 switch -- I
don't know what that is and I'm leaving it alone; 'every row has a value' sounds like it doesn't
matter anyway. I'd have liked that check without having to click the second table, I nearly
pressed Load from the first screen. Right. Big blue button: Load."

## Step 5 -- Load

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t04--recipe-recipient/05.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load"

Result (05.png): a gray network picture in the middle, a size legend at top left titled "Size:
vu....iated_over_30_days", and on the right a summary: Nodes 300 nodes, Edges 1,105 connections,
"from 2 tables", Isolated nodes 7, plus averages.

Think-aloud: "There it is, and the panel on the right repeats the numbers: 300 and 1,105. Same as
the spreadsheets. 'From 2 tables' -- yes, my two files. So that's done.

Two things bother me. One: 'Isolated nodes 7'. Does that mean seven machines didn't come in
properly? It said every connection found both ends, so I think it means seven machines just have
no links in the list -- but it doesn't say that, and that's the line I'd get asked about. Two: the
picture's dots are sized by something called 'vu....iated_over_30_days' -- I didn't ask for that,
it's cut off, and I couldn't tell you in English what it is. And it's a hairball. But I wasn't asked
to read the picture, only to get it in and check it all arrived."

Stopped here: I believe I am done.

## Wrap-up

- Succeeded? Yes. Both files went in as one network; 300 machines and 1,105 connections, and the
  load screen told me 1,105 of 1,105 connections found both ends.
- Single Ease Question: 5 of 7. Getting in was easy and the "never uploaded" line saved me a
  worry. Docked for: the screen after Open is full of words I do not understand (Key, Attribute,
  Directed, weight); the full "everything arrived" check for the links was only on the second
  table, which I had to think to click; "Isolated nodes 7" read like something might be missing;
  and the dots got sized by a cut-off column name I never chose.
- Would I use this instead of my current tool? For this job, probably yes over asking the postdoc:
  no install, it says my files stay on my computer, and it gave me the counts. But I would not
  have trusted it without the "1,105 of 1,105" line, and if that had been missing I'd have gone
  back to Excel and counted rows myself.
