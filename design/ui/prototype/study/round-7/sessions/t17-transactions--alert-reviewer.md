# Session: t17-transactions, alert reviewer (Nadia)

Task as given: "Last month you sent the flagged accounts to the case team as a spreadsheet. Send
the case team this month's version of it. The data on screen is a sample: one month of card and
bank transfers between accounts."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t17-transactions--alert-reviewer/. D below stands for that folder.

## Start screen (shots/tasks/t17-transactions/01.png)

"OK. 'Transfers, March 2026'. A big gray blob of hexagons, 812 of 3,000 nodes. Left side has the
two files, accounts and transfers, both 2026-03. There's a 'flagged' attribute in the accounts
list, good, that's the column I'd filter on. A spreadsheet means a table, so I'm going for the
table first."

## 01 -- open the table

    timeout 120 node app-b/study.mjs --try D/01.png task:t17-transactions --click "Table"

"Table opened at the bottom. It says 3,000 nodes 'before the filter', which is all the accounts,
not the flagged ones. Columns are links in, links out... I don't see flagged in the first columns.
There's a three-dot menu next to 'Columns: 10 of 12'. Before that, last month's thing -- maybe it's
saved somewhere. Views?"

## 02 -- Views

    timeout 120 node app-b/study.mjs --try D/02.png task:t17-transactions --click "Table" --click "Views"

"'No saved views.' So whatever I did last month isn't saved as a view. Fine."

## 03 -- the three dots (wrong one)

    timeout 120 node app-b/study.mjs --try D/03.png task:t17-transactions --click "Table" --click "More"

"That opened a menu on the right, the graph one: select all, layout, add node, clear graph data.
Nothing about saving out a file. Not this one."

## 04 -- the hamburger menu

    timeout 120 node app-b/study.mjs --try D/04.png task:t17-transactions --click "Menu"

"New project, open, select where, settings, help. No export, no download. Weird that 'Export'
isn't in the main menu."

## 05 -- just look for Export

    timeout 120 node app-b/study.mjs --try D/05.png task:t17-transactions --click "Export"

Result: nothing on screen is called "Export".

## 06 -- the table's own dots

Tried names for the dots by the table: "Table actions", "Table options", "More table actions",
"Table menu". Only "Table options" existed.

    timeout 120 node app-b/study.mjs --try D/06.png task:t17-transactions --click "Table" --click "Table options"

"There it is: 'Export table as CSV...'. And 'Time slider'. Took me five tries to find a download
button. In the case system it's a button that says Export."

## 07 -- Export table as CSV

    timeout 120 node app-b/study.mjs --try D/07.png task:t17-transactions --click "Table" --click "Table options" --click "Export table as CSV..."

"Hold on. It says 'Full graph, 77 nodes, 254 edges' and the preview is 'Myriel, Napoleon,
Mlle.Baptistine'. That's not my data. My table had 3,000 accounts with ACC numbers. If I sent
this to the case team I'd be in trouble. I don't trust this preview at all.
But there's 'Recent exports' on the left. Last month's file might be in there."

## 08 -- Recent exports

    timeout 120 node app-b/study.mjs --try D/08.png task:t17-transactions --click "Table" --click "Table options" --click "Export table as CSV..." --click "Recent exports"

"Yes: 'case-acc-233575_ring-pagerank_2026-03.csv -- Data, CSV, 14 accounts of the Mule ring and
the methods file -- Sep 28 -- made from March data.' That has to be last month's. It says 'mule
ring' and not 'flagged', but 14 accounts to the case team, that's it. And there's a button,
'Export again, on April data'. That's exactly what I want... except, April? Everything on my
screen says March. The title says March, both files say 2026-03. Which month is 'this month'?
I'll press it and see what it tells me."

## 09 -- Export again

    timeout 120 node app-b/study.mjs --try D/09.png task:t17-transactions --click "Table" --click "Table options" --click "Export table as CSV..." --click "Recent exports" --click "Export again, on April data"

"A black bar: 'Export again on the current data: the same settings, a new file named for the
month, the earlier file kept.' Is that it saying it did it, or describing what the button would
do? The list still says '1 file'. No new April file in it. No 'saved to Downloads'."

## 10 -- press it again

    timeout 120 node app-b/study.mjs --try D/10.png task:t17-transactions --click "Table" --click "Table options" --click "Export table as CSV..." --click "Recent exports" --click "Export again, on April data" --click "Export again, on April data"

"Same thing. Still one file in the list. Nothing changed."

## 11-13 -- the other way in

    timeout 120 node app-b/study.mjs --try D/11.png task:t17-transactions --click "Transfers, March 2026"
    timeout 120 node app-b/study.mjs --try D/12.png task:t17-transactions --click "Transfers, March 2026" --click "Export..."
    timeout 120 node app-b/study.mjs --try D/13.png task:t17-transactions --click "Transfers, March 2026" --click "Export..." --click "Recent exports" --click "Export again, on April data"

"Oh, so Export lives under the project name at the top, not the menu. Ctrl+E. The image preview
there is again some other graph with orange dots and names, not my accounts. Recent exports, same
file, same button, same black bar. Nothing new in the list."

## 14 -- did it at least set things up?

    timeout 120 node app-b/study.mjs --try D/14.png task:t17-transactions --click "Transfers, March 2026" --click "Export..." --click "Recent exports" --click "Export again, on April data" --click "Data"

"If 'export again opens the output with the same settings', the Data page should now show the 14
accounts. It shows 'Full graph, 77 nodes, 254 edges' again, edges table, 'source,target,value'.
So no, it didn't load last month's settings, or if it did I can't see it. I'm stopping here.
I'm not sending the case team a file when I can't tell what's in it or whether it was made."

## Verdict

- Succeeded? No, or at least I can't say I did. I found last month's file and pressed the button
  that should redo it, but I got no file, no new entry in the list, and nothing that showed me
  the 14 accounts. And the button says April while everything else on screen says March.
- Single Ease Question: 2 out of 7.
- Would I use this instead of what I do now? No. Today I filter the alert list on flagged, export,
  done, two minutes. Here it took me five guesses to find the export, the preview showed somebody
  else's data, and the one button that looked right didn't visibly do anything. QA would ask me
  which month that file was built from and I couldn't answer.
