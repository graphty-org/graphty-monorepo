# Session: send this month's flagged-accounts spreadsheet -- fraud analyst (Sarah)

Task as given: "Last month you sent the flagged accounts to the case team as a spreadsheet. Send
the case team this month's version of it. The data on screen is a sample: one month of card and
bank transfers between accounts."

Mode: first impression, not mandated. Renders are in
tmp/round-7-sessions/t17-transactions--fraud-analyst/. All commands were run from
design/ui/prototype.

Outcome: gave up. No file sent.

## Start screen (shots/tasks/t17-transactions/01.png)

"Transfers, March 2026". Gray blob of hexagons, 812 of 3,000 accounts, a filter "amount is at
least 1,000". Left side has the source files and an attribute list including "flagged" and
"riskScore". Right side is a column of stats I don't use -- density, reciprocity, a log-log
chart. Where's my spreadsheet from last month? If I saved it here, it's under something like
"Views".

## Step 1 -- Views

    timeout 120 node app-b/study.mjs --try .../01.png task:t17-transactions --click "Views"

"No saved views." Nothing there.

## Step 2 -- the title menu

    timeout 120 node app-b/study.mjs --try .../02.png task:t17-transactions --click "Transfers, March 2026"

Rename, Save, Save as, Export..., Apply recipe or style file, Version history, Close project.
Export is what I want in the end.

## Step 3 -- Export...

    timeout 120 node app-b/study.mjs --try .../03.png task:t17-transactions --click "Transfers, March 2026" --click "Export..."

It opens on Image. I don't want a picture. Down the left: Image, Video, Report (grayed out),
Recipe, Data, and "Recent exports". Footer says "Saved to this computer only; nothing is
uploaded." Good -- that's the first thing compliance would ask.

## Step 4 -- Recent exports

    timeout 120 node app-b/study.mjs --try .../04.png task:t17-transactions --click "Transfers, March 2026" --click "Export..." --click "Recent exports"

There it is: "case-acc-233575_ring-pagerank_2026-03.csv -- Data, CSV, 14 accounts of the Mule
ring and the methods file -- Sep 28 -- made from March data". Button: "Export again, on April
data". That is exactly the idea I want: same file, new month.

But: the title bar says March 2026 and both source files end in -03. The button says April.
Which month is actually loaded? I would not send anything until I knew. And "pagerank" in a
file name going to the case team -- they'll ask me what that is.

## Step 5 -- Export again, on April data

    timeout 120 node app-b/study.mjs --try .../05.png task:t17-transactions --click "Transfers, March 2026" --click "Export..." --click "Recent exports" --click "Export again, on April data"

A tooltip appears: "Export again on the current data: the same settings, a new file named for
the month, the earlier file kept". That describes what it would do. Nothing else changed. No
new file in the list, no "saved", no new file name.

## Step 6 -- clicked it again

    timeout 120 node app-b/study.mjs --try .../06.png task:t17-transactions --click "Transfers, March 2026" --click "Export..." --click "Recent exports" --click "Export again, on April data" --click "Export again, on April data"

Same screen. The line under it says "Export again opens the output with the same settings".
Opens where? Nothing opened.

## Step 7 -- went to Data myself

    timeout 120 node app-b/study.mjs --try .../07.png task:t17-transactions --click "Transfers, March 2026" --click "Export..." --click "Recent exports" --click "Export again, on April data" --click "Data"

Not last month's settings. "Full graph, 77 nodes, 254 edges". The screen behind it says 812 of
3,000 accounts and 9,113 transfers. Where does 77 come from? I can't trace that number to
anything. It's set to the Edges table, which is transfers, not accounts. A yellow box talks
about betweenness, PageRank, Louvain community -- not my words, skipped it.

## Step 8 -- Scope

    timeout 120 node app-b/study.mjs --try .../08.png task:t17-transactions --click "Transfers, March 2026" --click "Export..." --click "Data" --click "Full graph"

Choices: "Full graph" or "Watchlist, 5 nodes". Last month was 14 accounts of the Mule ring. Five
is not fourteen, and there's no ring here. So the one-click "do it again" didn't work, and the
manual route doesn't know about the ring.

## Step 9 -- plan B: filter on "flagged"

    timeout 120 node app-b/study.mjs --try .../09.png task:t17-transactions --click "flagged"

The task said flagged accounts; there's a "flagged" field. Clicked it. The right panel shows
"amount" -- the transfer amounts, not flagged. Wrong thing.

## Step 10 -- add a filter

    timeout 120 node app-b/study.mjs --try .../10.png task:t17-transactions --click "Add filter"

A "New step" appears, "Kept all 812 nodes", with a menu: by an attribute or computed value, top
of a computed value, largest component, k-core, neighbors of the selection.

## Step 11 -- by an attribute

    timeout 120 node app-b/study.mjs --try .../11.png task:t17-transactions --click "Add filter" --click "By an attribute or computed value"

A field picker with flagged in it.

## Step 12 -- pick flagged

    timeout 120 node app-b/study.mjs --try .../12.png task:t17-transactions --click "Add filter" --click "By an attribute or computed value" --click "flagged"

Back to the "amount" panel again. The step still says "Kept all 812 nodes". Second time
clicking "flagged" gave me "amount". I can't filter on it.

## Step 13 -- the table

    timeout 120 node app-b/study.mjs --try .../13.png task:t17-transactions --click "Table"

An account table: id, links in, links out, links total, kind, country. "Columns: 10 of 12" --
flagged is not one of the ones showing. Header says "3,000 nodes (before the filter)".

## Step 14 -- export the whole account table and filter in Excel

    timeout 120 node app-b/study.mjs --try .../14.png task:t17-transactions --click "Transfers, March 2026" --click "Export..." --click "Data" --click "Nodes"

Tool output: nothing on screen is called "Nodes". It is right there, next to "Edges", and it
won't take. The only thing I could export is the transfers table. I'm not sending the case team
transfers when they expect a list of accounts. Stopped.

## Debrief

Did I succeed? No. Nothing went to the case team.

Single Ease Question: 2 of 7.

What went right: "Recent exports" is exactly where I'd look, and it found last month's file with
a plain description ("14 accounts of the Mule ring"). "Export again" is the right idea. "Nothing
is uploaded" is the right promise.

What went wrong, in order of how much it cost me:

1. "Export again, on April data" did nothing I could see -- no new file, no confirmation, no
   settings opened. Only a tooltip describing what it would do.
2. It says April, but everything else on screen says March (title, both file names). I can't
   send a monthly file when I'm not sure which month it was made from.
3. The manual Data export didn't carry last month's settings: wrong table (transfers, not
   accounts), "Full graph, 77 nodes" (a number I can't match to 812 or 3,000), and no Mule ring
   to choose, only a 5-account "Watchlist".
4. Clicking "flagged" -- in the attribute list or in the filter's field picker -- showed me
   "amount" instead. I could not filter on flagged at all.
5. "Nodes" in the export dialog couldn't be selected, so even the dump-everything-to-Excel
   workaround was closed.
6. Words: "nodes", "edges", "PageRank", "Louvain", "k-core". The file name going to the case team
   has "pagerank" in it. The case team says accounts and transactions.

Would I use this instead of my current tool? No. For a monthly flagged-accounts list my current
tool is a statement export and a filter in Excel -- ten minutes, and the reviewer can see every
row. This couldn't produce the file at all. If "Export again" actually wrote the April file,
told me its name and showed me the 14 (or however many) accounts in it before saving, that
would beat Excel for a recurring report, because I wouldn't have to rebuild the ring by hand
every month. That's the one thing here worth coming back for.
