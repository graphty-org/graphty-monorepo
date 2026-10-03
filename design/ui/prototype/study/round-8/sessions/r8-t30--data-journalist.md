# Session: add April's transfers to the March table -- reporter with a contacts sheet

Task as given: "March's card transfers are open (example data if you do not work in banking).
April's transfers have arrived as a second file with the same columns. You want the one table of
transfers to hold both months from now on, keeping everything you have built."

Participant: the reporter persona (study/personas/data-journalist.md). Renders are in
tmp/round-8-sessions/r8-t30--data-journalist/. Every command was run from design/ui/prototype
with D=tmp/round-8-sessions/r8-t30--data-journalist.

## Start screen (shots/tasks/r8-t30/01.png)

"OK, the March graph. Colored by Louvain, 35 groups, plus something called Links in (count). That
is the stuff I 'built', I guess -- I need that to survive. The left rail has Graph, Data, Views,
Notes, Assistant. A new file is data, so Data."

## Step 1 -- Data

    timeout 120 node app-b/study.mjs --try $D/01.png task:r8-t30 --click "Data"

"Sources: accounts-2026-03.csv and transfers-2026-03.csv, each with three dots. A filter, 'amount
is at least 1,000'. There's a plus by Sources but that sounds like a NEW source, and I don't want a
second table, I want the one table to grow. I'll look at the March transfers file itself."

## Step 2 -- looking for the file's menu

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t30 --click "Data" --hover "transfers-2026-03.csv"
    (no tooltip)
    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t30 --click "Data" --click "..."
    (nothing on screen is called "...")
    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t30 --click "Data" --hover "More"
    (landed on the More actions button at the top right, not the file's dots)

"I just wanted the dots next to the file. Pointing at them is fiddly."

## Step 3 -- clicking the file name

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t30 --click "Data" --click "transfers-2026-03.csv"

"An 'Edit: transfers' screen with the columns and a match report. Nice that it tells me every
from_account was found -- that's what I'd check. But nothing says 'add a file' here. Tables has a
plus, but again that's a new table."

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t30 --click "Data" --click "transfers-2026-03.csv" --click "CSV, comma"

"File settings: format, separator. Not it. Back out."

## Step 4 -- the file's own menu

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t30 --click "Data" --hover "actions"
    (tooltip: Actions for accounts-2026-03.csv -- so the dots are 'Actions for <file>')
    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv"

"Rename, Replace with file..., Add rows from file..., Edit source... -- 'Add rows from file' is
exactly what I'd have said. Good. And 'Replace' sitting right above it is a little scary; one slip
and March is gone."

## Step 5 -- Add rows from file

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..."

"'Add to transfers'. Top line: 9,113 + 8,370 added transfers, 3,000 + 132 added accounts. The
report says same 4 columns, 'Add these rows to transfers' is chosen over 'Load as its own table',
0 repeated rows, 132 new accounts. That's the kind of receipt I want.

Two things bother me. One: on the left, April shows up as its own line, 'transfers-202...', under
Tables, which looks like a separate table even though I picked 'add to transfers'. Two: the first
six April rows are the same accounts and the same amounts as the first six March rows, only the
dates moved -- in real life I'd stop and ask if somebody re-sent March. It says 0 repeated rows,
so I suppose it compares the time too. And the 132 new accounts -- what do they get for country,
risk score? Nothing, presumably. It doesn't say. Still, this is what I want. Add."

## Step 6 -- Add

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add"

"...What? The colors are gone. The graph is a gray honeycomb. 'Nothing is colored or sized by a
row'. Louvain and the Links in layer are gone from the list. And the summary still says 3,000 nodes
and 9,113 transfers -- not 3,132 and 17,483. The title still says March 2026. So it threw away what
I built AND didn't add April?"

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add" --click "Data"

"Data: still only transfers-2026-03.csv, 9,113 rows. No April file anywhere. My 'at least 1,000'
filter is gone too -- 'No filters'. The Louvain result is gone from Attributes."

## Step 7 -- trying to get my work back

    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add" --hover "Undo"
    (tooltip: Undo Ctrl+Z -- doesn't say what it would undo)
    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add" --click "Undo"

"'Nothing to undo.' So whatever just happened can't be taken back. That is the worst message I
could see right now."

## Step 8 -- one more go, being explicit

    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add these rows to transfers" --click "Add"

"Same thing. Gray blob, 3,000 / 9,113, Louvain gone, filter gone. I give up. If this were my story
data I'd now be reloading from my spreadsheet and redoing the analysis by hand."

## Verdict

- Succeeded? No. Finding the right command was fine; the result was not. After Add, April's rows
  are not in the counts or the sources, and the Louvain grouping, the Links in layer and the
  amount filter all vanished, with nothing to undo.
- Single Ease Question: 2 of 7. Getting to 'Add rows from file' and its preview was a 5 -- the
  preview with its counts was exactly right. What came after Add drags it down.
- Would I use this instead of my current tool? Not on this evidence. A spreadsheet would let me
  paste April under March in a minute and nothing I'd built would disappear. The preview screen is
  better than anything I have -- it tells me what will be added and what's new -- but a tool that
  wipes my work on the confirm button, and then says there is nothing to undo, I cannot trust with
  a story.

## Problems observed

1. After Add, nothing on screen shows April was added (counts stay 3,000 nodes / 9,113 edges, no
   April source, title still March) while the Louvain layer, the Links in layer and the filter
   disappear. Whether this is the prototype not modeling the outcome or the intended result, to a
   participant it reads as data loss. Severity: critical.
2. Undo after Add says "Nothing to undo". Severity: critical (follows from 1).
3. In the Add preview the April file is listed under Tables as its own row ("transfers-202...")
   even with "Add these rows to transfers" chosen, which reads as a second table. Severity: medium.
4. The preview says 132 new accounts but not what attributes they will have (empty country, risk
   score?) or how they affect existing results such as Louvain. Severity: medium.
5. "Replace with file..." sits directly above "Add rows from file..." in the file menu; one
   mis-click would drop March. Severity: low (the Add screen does name the replace path and its
   cost).
6. The three-dot button on a source row has no visible label and was hard to reach by pointing;
   its name is "Actions for <file>". Severity: low.
7. The Undo tooltip does not say what would be undone. Severity: low.

## What worked

- "Add rows from file..." uses the user's own words and is on the file it applies to.
- The Add preview's top line (9,113 + 8,370 added; 3,000 + 132 added) and its match report
  (same 4 columns, 0 repeated rows, 132 new accounts, the replace path and what it drops) are the
  checkable receipt a reporter wants before committing.
