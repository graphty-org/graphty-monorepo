# Session: add April transfers alongside March (fraud analyst)

Participant: Sarah, level-2 fraud investigator (persona: study/personas/fraud-analyst.md).
Mode: own initiative, not mandated (about five minutes of patience).
Task as given: "Bring the April transfers you were just sent into this project alongside March's.
The data on screen is a sample: one month of card and bank transfers between accounts."
Start screen: shots/tasks/t28/01.png. Renders: tmp/round-7-sessions/t28--fraud-analyst/NN.png.
All commands run from design/ui/prototype.

## Think-aloud

**Start (shots/tasks/t28/01.png).** "OK, project is called 'Transfers, March 2026'. Left side has
Sources: accounts-2026-03.csv and transfers-2026-03.csv. So April's file goes in next to those.
There's a plus by Sources. Let me see what it says."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t28--fraud-analyst/01.png task:t28 --hover "Add source"
    -> nothing on screen is called "Add source"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t28--fraud-analyst/02.png task:t28 --hover "Add"

**02.** "'Add data to this graph.' Good, that's what I want. Add, not replace."

    timeout 120 node app-b/study.mjs --try .../03.png task:t28 --click "Add data to this graph"

**03.** "File, From a URL, Paste, Set collection. File. I've got the April CSV on my desktop."

    timeout 120 node app-b/study.mjs --try .../04.png task:t28 --click "Add data to this graph" --click "File..."

**04.** "Choose a file: data file, a recipe, a style file. Data file."

    timeout 120 node app-b/study.mjs --try .../05.png task:t28 --click "Add data to this graph" --click "File..." --click "Data file: CSV, JSON, GEXF or GraphML"

**05.** "Wait. This says transfers-2026-03.csv. That's March. I wanted April. And the header says
'Open as a new graph' -- I clicked 'Add data to this graph'. Which one is it? And it says
'3,000 ids ... become nodes of type node', not accounts. So it doesn't know these are the same
accounts I already have. If I load this I get a second graph with nothing joined. No."

"Let me go at it from the March transfers file itself. Maybe there's an 'append' on it."

    timeout 120 node app-b/study.mjs --try .../06.png task:t28 --hover "transfers-2026-03.csv"
    timeout 120 node app-b/study.mjs --try .../07.png task:t28 --click "transfers-2026-03.csv"

**07.** "'Edit: transfers'. This is the March mapping: from_account, to_account, amount as weight,
timestamp as time. That's right for March. No 'add more rows' or 'add April' anywhere. There's a
plus by Tables."

    timeout 120 node app-b/study.mjs --try .../08.png task:t28 --click "transfers-2026-03.csv" --hover "Add"
    -> tooltip "Add a table"
    timeout 120 node app-b/study.mjs --try .../09.png task:t28 --click "transfers-2026-03.csv" --click "Add a table"
    timeout 120 node app-b/study.mjs --try .../10.png task:t28 --click "transfers-2026-03.csv" --click "Add a table" --click "File..."

**10.** "'Opens the file picker' -- and then nothing. Still just accounts and transfers. Also, a
second *table*? I don't want a separate April table, I want April's transfers in with March's
so I can see the money move across the month end."

    timeout 120 node app-b/study.mjs --try .../11.png task:t28 --click "transfers-2026-03.csv" --click "CSV, comma"

**11.** "File settings: separator, ids, stop after 100 errors. Nothing about which file. Not here."

"The three dots next to the file in the sources list -- I'd click that. What's it called?"

    timeout 120 node app-b/study.mjs --try .../12.png task:t28 --hover "More"
    -> showed "More actions (Shift+F10)" on the graph panel at top right, not the file's dots
    timeout 120 node app-b/study.mjs --try .../13.png task:t28 --click "More actions for transfers-2026-03.csv"
    -> nothing on screen is called "More actions for transfers-2026-03.csv"
    (also tried "transfers-2026-03.csv actions", "Options", "Source options": no menu appeared)

"I can't get the dots next to the file to tell me what they are. Back to the plus. What is
'Set collection'? Maybe that's 'a set of monthly files'."

    timeout 120 node app-b/study.mjs --try .../14.png task:t28 --click "Add data to this graph" --click "File..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Open as a new graph"
    -> nothing changed
    timeout 120 node app-b/study.mjs --try .../15.png task:t28 --click "Add data to this graph" --click "Set collection..."

**15.** "Same screen again. March's file, 'Open as a new graph'. Every road leads here."

    timeout 120 node app-b/study.mjs --try .../16.png task:t28 --click "Transfers, March 2026"

**16.** "Project menu: Rename, Save, Export, Apply recipe, Version history, Close. No import. Fine."

    timeout 120 node app-b/study.mjs --try .../17.png task:t28 --click "Transfers"

**17.** "Transfers, or 'Compare graphs'. Comparing isn't combining. Not that."

"Last try. Just press Load on that import screen and see what it does."

    timeout 120 node app-b/study.mjs --try .../18.png task:t28 --click "Add data to this graph" --click "File..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load"

**18.** "It cleared my picture. 'Reading transfers-2026-03.csv, 3,000 nodes, 9,113 edges.' It's
reloading March over the top of what I had, and my 'amount at least 1,000' filter is gone from the
top bar -- it says 'Full graph' now. That's the opposite of what I asked for. I'm stopping. I'd
hit undo and go put the two months together in Excel, then bring one file in."

## Outcome

- Did I succeed? No. I never saw April's file, and the one path that loaded anything replaced
  March with March again.
- Single Ease Question: 2 of 7. Finding the plus was easy; after that every option either brought
  back March's file or did nothing.
- Would I use this instead of my current tool? Not for this. In Excel I paste April under March
  and the pivot picks it up; in i2 I run the same import spec on the new file and it merges on
  account number. Here I couldn't tell whether "add" means a new graph, a new table, or more rows
  on the transfers I already have, and the import screen didn't know the April accounts were the
  same accounts as March's ("nodes of type node", not "account"). If it had said "April file
  matches your transfers table: 9,000-odd new rows, 2,800 accounts already in the case, 200 new",
  with one button to append, I'd have been done in a minute.

## Problems noted

1. "Add data to this graph" leads to a screen titled "Open as a new graph". The words contradict
   each other and I lost trust in what Load would do.
2. The file the import shows is March's (transfers-2026-03.csv), not the April file I was sent.
   There is no visible way to pick a different file.
3. The import does not recognize that the incoming file has the same columns as my existing
   transfers table: it maps ids to a generic "node" type instead of "account", and offers no
   "append to transfers" choice.
4. "Add a table" in the edit screen implies April becomes a separate table, not more transfers.
5. The three-dots menu next to each source file has no name I could find, so I never learned
   what it offers (append? replace?).
6. "Set collection..." gave no hint of what it is and led to the same March import screen.
7. Pressing Load replaced the whole picture, dropped my amount filter, and gave no warning first.
