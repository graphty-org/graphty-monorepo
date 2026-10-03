# Session: add April's transfers to the March transfers table -- Nadia, level-1 alert reviewer

Task as given: "March's card transfers are open (example data if you do not work in banking).
April's transfers have arrived as a second file with the same columns. You want the one table of
transfers to hold both months from now on, keeping everything you have built."

Start screen: shots/tasks/r8-t30/01.png -- graph "Transfers, March 2026", Louvain communities
colored, a "Links in (count)" layer, Graph tree on the left.

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t30--alert-reviewer/. Every command below starts with
`timeout 120 node app-b/study.mjs --try <render> task:r8-t30`.

## Steps, thinking aloud

1. `01.png --click "Data"`
   "March transfers, I want April in the same table. Data on the left, obviously."
   Data panel: Sources lists accounts-2026-03.csv and transfers-2026-03.csv, each with dots;
   a filter "amount is at least 1,000"; attributes; Louvain under Results.

2. `02.png --click "Data" --click "More actions for transfers-2026-03.csv"` -- nothing on screen
   has that name. Then `--click "Data" --click "transfers-2026-03.csv"`.
   "There's my file. I'll click it." Opens "Edit: transfers" -- the column mapping screen with a
   match report. "This is the table. Maybe I add the second file here. The + next to Tables
   would make a new table and I do not want two."

3. `03.png ... --click "transfers-2026-03.csv"` (the file name on the edit screen)
   Nothing happened. "Not clickable."

4. `04.png ... --click "CSV, comma"`
   A "File settings" popover: format, separator, ids, stop reading. "Separator stuff. No 'add
   another file' in here."

5. `05.png --click "Data" --hover "More"`
   Tooltip "More actions" -- but it was the dots on the right panel, not the one by my file.

6. `06.png --click "Data" --hover "Add source"` -- nothing called that. Then
   `--hover "Add"` -> tooltip "Add to Transfers" on the + next to Sources.
   "Add to Transfers. That sounds exactly right."

7. `07.png --click "Data" --click "Add to Transfers"`
   Menu: File..., From a URL..., Paste..., Set collection... "No idea what a collection is.
   April is a file."

8. `08.png ... --click "File..."`
   "Choose a file": transfers-bank-export.csv, "Data file: CSV, JSON, GEXF or GraphML",
   a recipe, a style file. "No 2026-04 in the list. The bank export isn't mine. The generic one
   I'll pretend is April."

9. `09.png ... --click "Data file: CSV, JSON, GEXF or GraphML"`
   Screen titled "Open as a new graph", and the file it shows is transfers-2026-03 again.
   "A NEW graph? No. I'd lose my communities. And it's March, not April. Cancel."

10. `10.png --click "Data" --click "Add to Transfers" --click "Set collection..."`
    "Maybe a collection is a set of files." It quietly added "review-sets.json, 3 sets, in the
    Graph tree as one folder" to Sources and the graph header went to "from 3 tables".
    "That added something I didn't ask for. Not April. I'd undo that."

11. Looking for the dots by the transfers file: `--hover` tried "Actions for
    transfers-2026-03.csv" (tooltip shown), "transfers-2026-03.csv actions" and "More actions
    for transfers" (nothing called those).
    `11.png --click "Data" --click "Actions for transfers-2026-03.csv"`
    Menu: Rename, Replace with file..., Add rows from file..., Edit source..., and a grayed
    Remove with a long note. "THERE. Add rows from file. Not Replace -- I want both months."
    "Why was this hidden in the dots and the big + went somewhere else?"

12. `12.png ... --click "Add rows from file..."`
    "Add to transfers" screen with transfers-2026-04.csv: dates are April, 8,370 rows.
    Header: "account (3,000 + 132 added) --transfers (9,113 + 8,370 added)--> account".
    Match report: same 4 columns as transfers; "Add these rows to transfers" chosen over "Load
    as its own table"; 8,370 rows to add, 0 repeated rows, 132 new accounts; or replace March.
    "Good. 0 repeated rows and 132 new accounts is the kind of line QA likes. But the left list
    shows 'transfers-202...' as its own row under Tables, which makes me think it's a second
    table anyway. The report says add to transfers, so I trust that. Add."

13. `13.png ... --click "Add"`
    Back on the Graph tab. Louvain and "Links in (count)" are gone from the tree, which now only
    offers "Analyze (Shift+A) to add results here". Graph is gray hexagons, "Nothing is colored
    or sized by a row". Summary still 3,000 nodes, 9,113 transfers.
    "My colors are gone. And it should be around 17,000 transfers. Did it throw everything away?"

14. `14.png ... --click "Add" --click "Data"`
    Sources: still only transfers-2026-03.csv, 9,113 rows. Filters: "No filters". Results:
    Louvain gone. "No April. My filter's gone. My Louvain's gone. It wiped what I built and
    added nothing."

15. `15.png ... --click "Add" --hover "Undo" --click "Undo"`
    Toast: "Nothing to undo." "So I can't even get it back. I'm done. I'd stack the two CSVs
    in Excel and reload."

Gave up at step 15.

## Outcome

- Did I succeed? No. I found the right control ("Add rows from file..." in the dots by the
  transfers file) and the preview looked exactly right, but pressing Add left the table at
  March's 9,113 rows with no April, and removed the filter and the Louvain result and its colors.
  Undo said there was nothing to undo.
- Single Ease Question: 2 of 7. Finding the option took eleven tries; the end was worse than not
  trying.
- Would I use this instead of what I have? No. Today I'd append the two files in a spreadsheet;
  that takes two minutes and never deletes my work. A tool that loses my filter and my results
  when I add a month, and can't undo it, is one I'd stop trusting for anything QA might see.
  The preview screen with "0 repeated rows, 132 new accounts" was the best thing I saw -- if
  Add had actually done what it said, I'd have been happy.

## What got in my way, in my words

- The big + by Sources says "Add to Transfers" but every choice under it either opens a new
  graph or adds something else. The real "add rows" is in the small dots on the file row.
- "Data file: CSV, JSON..." opened "Open as a new graph" showing March's file again -- not an
  add at all, from a button that said "Add to Transfers".
- "Set collection..." changed my sources with no question asked.
- Clicking the file name opened an edit screen with no way to add a file to it.
- On the add screen, the April file showed as its own row under Tables while the report said it
  would be added into transfers -- two answers to "is this a second table?".
- After Add: no April rows, the filter and Louvain result gone, colors gone, and "Nothing to
  undo".
