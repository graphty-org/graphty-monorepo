# Session: two spreadsheets into one network -- Nadia, level-1 alert reviewer

Task as given: "You have never used this program before. Two spreadsheets from your team are in
your Downloads folder: one lists the machines on the office network, one lists which machine
talks to which. You want them in as one network and you want to know that every machine and
every connection arrived." Nadia does not work in IT; she treats the files as a list of things
and a list of links between them.

Renders are in tmp/round-8-sessions/r8-t04--alert-reviewer/ (01.png to 06.png). Every command was
run from design/ui/prototype; D = tmp/round-8-sessions/r8-t04--alert-reviewer.

## Start screen (shots/tasks/r8-t04/01.png)

"OK. Start, recent projects, samples. I'm not opening a sample, I have my own files. 'Open
project or file' or 'New from data'. I don't have a project. I have data. New from data."

## Step 1 -- New from data

    timeout 120 node app-b/study.mjs --try $PWD/$D/01.png task:r8-t04 --click "New from data..."

"A file picker, Downloads, it-estate folder. hosts-2026-03.csv and connections-2026-03.csv --
that's my two. The PNG is grayed out, fine, don't want it. Checkboxes, so I can take both at
once. Good. That's one less trip."

## Step 2 -- tick both, Open

    timeout 120 node app-b/study.mjs --try $PWD/$D/02.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

"Whoa, OK, it's a spreadsheet view. Left side: 'hosts 300' and 'connections 1,105', both with a
little green check. Top line says 'host (300) --connections (1,105)--> host (300)'. That reads
like code, the arrows with dashes, but I get it: 300 things, 1,105 links between them. At the
bottom 'Match report: hosts -- 300 rows; every key is unique.' Key, Name, Attribute under the
column names -- I don't know what I'd change there, so I'm not touching it. 69 columns. I skim
past all that."

"Is 300 right? I'd check the spreadsheet row count. Let's say the file has 300 machines. Fine."

## Step 3 -- look at the connections table

    timeout 120 node app-b/study.mjs --try $PWD/$D/03.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections"

"This is the part I actually care about. Match report: 1,105 rows; every row has both ends.
1,105 of 1,105 source found in hosts. 1,105 of 1,105 target found in hosts. 1,105 rows became
1,105 edges. That's the reconciliation. That's what I'd want to paste into a file: in equals
out, nothing dropped. I like that it's in plain numbers and not a progress bar."

"There's a line about weight -- bytes_total_24h is each edge's weight, a row without one would
weigh 1 or 0. No idea, and it says every row has a value so I don't care. 'Stronger / Farther /
Capacity' -- don't know, leaving it. Directed or undirected at the bottom -- don't know, leaving
it at whatever it is. 'Edge' -- I'd have said 'link', but fine."

"Two buttons, Cancel and Load. Load."

## Step 4 -- Load

    timeout 120 node app-b/study.mjs --try $PWD/$D/04.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load"

"Picture. Right panel says Nodes 300, Edges 1,105 connections. Same as the report. Good, that's
my answer."

"But: Isolated nodes 7. Hm. Seven machines with no connections. Does that mean seven didn't get
their links? The report said every link found both ends, so I think it means these seven just
don't appear in the connections file. But I'd want to see them before I said 'everything
arrived' to anyone. Also there's a box top-left about 'Size: vu....iated_over_30_days' with dots
-- I didn't ask for sizes. Something chose that for me. Whatever, ignore it."

## Step 5 -- click the 7

    timeout 120 node app-b/study.mjs --try $PWD/$D/05.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load" --click "7"

"The 7 is a link, so I clicked it. A table opened at the bottom -- '300 nodes from
hosts-2026-03.csv'. That's all of them, not the seven. So where are the seven? I can't tell
which ones they are from this. I'd have to sort or filter something and I don't know how here.
That's annoying -- the one number that worried me, and clicking it didn't tell me anything
new."

## Step 6 -- 'from 2 tables'

    timeout 120 node app-b/study.mjs --try $PWD/$D/06.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load" --click "from 2 tables"

"'from 2 tables' takes me back to the import screen, now titled 'Edit: hosts-2026-03.csv', with
Apply grayed out and 'Nothing has changed yet'. OK, so the report is still there if QA asks.
Good that it says nothing changed -- I was worried clicking around had changed the data. I'm
done. Both files in, 300 and 1,105, every link matched."

## Wrap-up

- Succeeded? Yes. Both files in as one network; the counts on the import screen and the graph
  panel agree (300 machines, 1,105 links, 1,105 of 1,105 matched at both ends). The one loose end
  is the seven isolated machines: I could not see which ones they were, so I am taking it on
  trust that "isolated" means "not in the links file" and not "lost".
- Single Ease Question: 6 of 7. Picking both files at once and the match report made it quick.
  It loses a point for the seven: clicking the number showed all 300 rows, not the seven, and
  for a minute I was not sure whether something had been dropped.
- Would I use this instead of my current tool? For this job my current tool is a spreadsheet
  and a COUNTIF, and that takes me longer than this did. The match report is the bit I would
  actually use -- "1,105 of 1,105 found" is a line I can put in a file. But I do not choose
  tools, and I would not open this for an ordinary alert; most alerts do not need a picture.
  Export test: the match report lines would paste fine; I did not see a way to get them out as
  text, but I did not look.
