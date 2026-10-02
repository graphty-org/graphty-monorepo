# Session: bring the newest nested export in alongside the earlier one -- Dr. Chen (computational biologist)

Task as given: "Bring the newest export from the research database into this project alongside the
earlier one. The data on screen is a sample: one export from a research database, researchers and
institutions with records inside records. If that is not your line of work, treat it as your own
nested export."

Renders: design/ui/prototype/tmp/round-7-sessions/t28-nested--bioinformatics-researcher/NN.png.
All commands were run from design/ui/prototype; `S` is the renders folder above.

Outcome: gave up. Every load path I found opened a bank-transfers dataset (or a Les Miserables paste)
instead of a second research export, and none offered "keep the earlier one".

## Start (shots/tasks/t28-nested/01.png)

"Research network, March 2026". 200 nodes, 170 researchers, 30 institutions, 670 edges. Fine. The
graph header says "from network-expor..." -- truncated, so I cannot read the file name or its date,
which is exactly what I need to tell two exports apart. In Cytoscape this would be File > Import >
Network from File, and it would ask me whether to add to the current collection. Here I see a rail
with Graph, Data, Views, Notes, Assistant. Data is where an import would live.

## 1. Data rail -- 02.png

    timeout 120 node app-b/study.mjs --try $S/02.png task:t28-nested --click "Data"

Good: a "Sources" list. network-export-2026-0... (truncated again), "200 nodes, 670 edges from 3
tables", then researchers / institutions / links underneath. There is a plus next to Sources. That is
where the second export goes, I assume.

## 2. Plus next to Sources -- 03.png

    timeout 120 node app-b/study.mjs --try $S/03.png task:t28-nested --click "Data" --click "Add source"
    -> nothing on screen is called "Add source"
    timeout 120 node app-b/study.mjs --try $S/03.png task:t28-nested --click "Data" --click "Add data"
    (also tried "Add" and "Import": "Import" -> nothing on screen is called "Import")

The icon has no visible label, so I guessed its name; "Add data" worked. Menu: File..., From a URL...,
Paste..., Set collection... I have a file on disk. File...

## 3. File... -- 04.png

    timeout 120 node app-b/study.mjs --try $S/04.png task:t28-nested --click "Data" --click "Add data" --click "File..."

"Choose a file": "Data file: CSV, JSON, GEXF or GraphML", a recipe, a style file. The export is JSON,
so the first one.

## 4. The data file -- 05.png

    timeout 120 node app-b/study.mjs --try $S/05.png task:t28-nested --click "Data" --click "Add data" --click "File..." --click "Data file: CSV, JSON, GEXF or GraphML"

This is not my file. transfers-2026-03.csv: from_account, to_account, amount -- bank transfers. And the
project title in the top bar changed to "Transfers, March 2026" and the header says "Open as a new
graph". I did not ask for a new graph, I asked to add a source to this one. The match report is nice
(9,113 rows, 3,000 ids, no duplicate pairs) -- that is the kind of count I would read -- but it is the
wrong data and the wrong destination. Cancel.

## 5. Cancel; look at the existing source's menu -- 06.png, 07.png, 08.png

    timeout 120 node app-b/study.mjs --try $S/06.png task:t28-nested --click "Data" --click "Add data" --click "File..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Cancel"
    timeout 120 node app-b/study.mjs --try $S/07.png task:t28-nested --click "Data" --hover "network-export"
    timeout 120 node app-b/study.mjs --try $S/08.png task:t28-nested --click "Data" --click "Actions for network-export-2026-03.json"

Cancel was clean: "Load cancelled: nothing was loaded" with Undo. Good. The hover finally told me the
full name: network-export-2026-03.json. So the earlier one is March and I want the newer one. Its
menu: Rename, Replace with file..., Edit source..., Refresh. "Replace" is the opposite of "alongside";
I do not want to lose March. Nothing says "add a newer version" or "keep both".

## 6. Set collection... -- 09.png

    timeout 120 node app-b/study.mjs --try $S/09.png task:t28-nested --click "Data" --click "Add data" --click "Set collection..."

I thought "collection" might mean a set of exports, like a Cytoscape network collection. It opened the
same transfers CSV as a new graph. Same dead end.

## 7. From a URL... -- 10.png

    timeout 120 node app-b/study.mjs --try $S/10.png task:t28-nested --click "Data" --click "Add data" --click "From a URL..."

The research database might hand out a URL. Instead: "Add to Transfers", a bank alerts URL,
"structuring alerts". At least this one says "Add to" -- that is the wording I wanted -- but it is
adding to a project I never opened. I am now unsure which project I am even in.

## 8. Replace with file... (just to see) -- 11.png

    timeout 120 node app-b/study.mjs --try $S/11.png task:t28-nested --click "Data" --click "Actions for network-export-2026-03.json" --click "Replace with file..."

"Replace: transfers-2026-03.csv" with transfers-2026-04.csv. So the app thinks my March research
export is a transfers CSV. Whatever is behind this button, it is not my data. Not pressing Load.

## 9. Graph switcher -- 12.png, 13.png

    timeout 120 node app-b/study.mjs --try $S/12.png task:t28-nested --click "Research network"
    timeout 120 node app-b/study.mjs --try $S/13.png task:t28-nested --click "Research network" --click "Compare graphs..."

The graph dropdown lists "Research network, 200 nodes" and "Compare graphs...". Two exports side by
side is what I would eventually want to compare, so I tried it. Louvain communities of March vs April
transfers, 3,000 accounts. The panel itself is the kind of thing I want (an agreement score with a
rerun band, "Descriptive only; no statistical test", matched/new/gone counts) -- but again for bank
accounts, and it does not help me get the second research export in.

## 10. Paste..., project menu, main menu -- 14.png, 15.png, 16.png, 18.png

    timeout 120 node app-b/study.mjs --try $S/14.png task:t28-nested --click "Data" --click "Add data" --click "Paste..."
    timeout 120 node app-b/study.mjs --try $S/15.png task:t28-nested --click "Research network, March 2026"
    timeout 120 node app-b/study.mjs --try $S/16.png task:t28-nested --hover "Menu"
    timeout 120 node app-b/study.mjs --try $S/18.png task:t28-nested --click "Main menu"

Paste: Les Miserables GraphML, project renamed "Les Miserables", "Open as a new graph" again. The
project menu (Save, Export, Apply recipe, Version history, Close) and the main menu (New project, Open,
Open recent, Select where, Settings) have nothing for adding a second file to this project.

## 11. Refresh -- 17.png

    timeout 120 node app-b/study.mjs --try $S/17.png task:t28-nested --click "Data" --click "Actions for network-export-2026-03.json" --click "Refresh"

"Refreshing network-export-2026-03.json". That re-reads March. If the database overwrote the file in
place it would replace March, not sit next to it. And it does not tell me whether anything changed.

At this point I would stop and do it in R: read both JSONs with jsonlite, flatten, rbind with a
release column.

## Verdict

- Succeeded? No. I never got a second research export on screen, and nothing offered to keep the March
  one next to it. Every load path turned into a different project (Transfers, Les Miserables).
- Single Ease Question: 2 of 7.
- Would I use this instead of my current tool? Not for this. What I saw that I liked -- the match
  report with row and id counts, "Load cancelled: nothing was loaded" with Undo, a comparison panel
  that says it is descriptive and shows a rerun band -- is better than Cytoscape's merge dialog. But
  the basic act of "add a second file to this project, do not replace the first" was not findable, the
  source name is truncated until you hover, and the plus button has no label. In Cytoscape I would
  import into the same collection; in R it is three lines.

## Problems, specifically

1. Every file, URL, paste and "set collection" path opened a different dataset and silently renamed
   the project in the top bar ("Transfers, March 2026", "Les Miserables"). I could not tell whether my
   research network was still open.
2. "Open as a new graph" is the only destination offered from File and Paste; no "add to this
   project" / "keep the earlier export" choice appears.
3. The source's own menu offers Replace and Refresh, both of which would lose or overwrite March.
   Nothing for "add a newer release of this source".
4. The source and graph-header file names are truncated ("network-export-2026-0...") -- the date, the
   one part that distinguishes two exports, is the part cut off. Only a hover shows it.
5. The plus next to Sources has no visible label; I had to guess its name.
6. "Set collection..." is jargon I could not map to anything; I guessed it meant a set of exports and
   was wrong.
