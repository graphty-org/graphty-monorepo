# Session: add April transfers alongside March -- Nadia, level-1 alert reviewer

Task as given: "Bring the April transfers you were just sent into this project alongside March's.
The data on screen is a sample: one month of card and bank transfers between accounts."

Start screen: shots/tasks/t28/01.png. The project is "Transfers, March 2026": two sources
(accounts-2026-03.csv, transfers-2026-03.csv), one filter (amount at least 1,000, 812 of 3,000
nodes shown).

Renders are in tmp/round-7-sessions/t28--alert-reviewer/. Every command was run from
design/ui/prototype as
`timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t28--alert-reviewer/NN.png task:t28 ...`
(the full output path was given as an absolute path).

## Steps

1. `--hover "Add source"` -> 01.png. Output: nothing on screen is called "Add source".
   Nadia: "I just want the plus next to Sources. Whatever it is called."
2. `--hover "Add"` -> 02.png. Tooltip on the Sources plus: "Add data to this graph".
   Nadia: "That's what I want."
3. `--click "Add data to this graph"` -> 03.png. Menu: File..., From a URL..., Paste...,
   Set collection....
   Nadia: "File. It's an attachment I saved."
4. `--click "Add data to this graph" --click "File..."` -> 04.png. A stand-in file chooser
   lists "Data file: CSV, JSON, GEXF or GraphML", "Recipe: mule-ring-triage.graphty" and
   "Style file: risk-review-look.json".
   Nadia: "Mine's a CSV, so the data file."
5. `... --click "Data file: CSV, JSON, GEXF or GraphML"` -> 05.png. Import screen headed
   "Open as a new graph". The file is transfers-2026-03.csv, and every timestamp is in March.
   The top bar changed from "812 of 3,000 nodes" to "Full graph". Footer: Cancel / Load.
   Nadia: "Hold on. I clicked 'add data to THIS graph' and it says 'open as a new graph'. And
   that's the March file, the one I already have. Did it pick the wrong file? And where did my
   812 go? Did my filter just get switched off?"
6. `... --click "Open as a new graph"` -> 06.png. No change. The heading is just a label.
   Nadia: "Not a choice, just a title."
7. `--hover "More"` -> 07.png. The tooltip was for the graph's own dots ("More actions",
   Shift+F10) at top right, not for the dots on the source row.
8. `--hover "transfers-2026-03.csv"` -> 08.png. The row highlights, and no tooltip appears.
9. `--click "transfers-2026-03.csv"` -> 09.png. "Edit: transfers" screen: the March file's
   setup, a Tables list (accounts, transfers) with a plus, Cancel / Apply (Apply is off).
   Nadia: "This is March's setup. The plus by Tables might put another file into this same graph."
10. `... --hover "Add table"` -> 10.png. Nothing on screen is called "Add table".
11. `... --hover "Add"` -> 11.png. Tooltip: "Add a table".
12. `... --click "Add a table"` -> 12.png. Menu: File..., From a URL..., Paste....
13. `... --click "File..."` -> 13.png. A toast at the bottom says "Opens the file picker".
    Nothing else changes.
    Nadia: "And then nothing. No April anywhere."
14. `--click "Add data to this graph" --click "Set collection..."` -> 14.png. Same "Open as a
    new graph" screen with the same March file as step 5.
    Nadia: "I don't know what 'set collection' means, and it took me to the same place anyway."
15. `--click "Transfers, March 2026"` -> 15.png. Project menu: Rename, Save, Save as...,
    Export..., Apply recipe or style file..., Version history, Close project.
    Nadia: "Save, export, history. Nothing about adding a month."

Gave up here. That took about as long as one alert, which is all the patience she gives a new tool.

## Afterwards, in her words

**Did I succeed?** No. I never saw April. Every way in to "add" showed me March's file again
and offered to make a new graph. I did not press Load, because I did not know whether I would end
up with March twice, lose the graph I had, or lose my filter. The top bar going from 812 to
"Full graph" scared me off. I could not tell whether that changed my data or only the view.

**Single Ease Question: 2 of 7.** Finding the plus was easy. After that, nothing on the screen
said "this goes next to March" or "April". The heading said the opposite of the button I pressed.

**Would I use this instead of what I use now?** No. In the case system I just widen the date range.
In a spreadsheet I paste April under March. Here I could not tell whether April would become
more rows in the same transfers table or a separate graph, and nothing showed me the difference
before I committed. QA would ask me which months the picture covers, and I could not have told
them. I'd send the April CSV up to level 2 and let them deal with it.

## What got in her way

- The menu item says "Add data to this graph", but the screen it opens is headed "Open as a new
  graph". The heading contradicts the button she pressed.
- The file chooser offered only one data file, and it opened as the March transfers file she
  already had. She could not find April at all. Whether this is a stand-in limitation or not,
  what she saw was "it gave me March again".
- The top-bar count went from "812 of 3,000 nodes" to "Full graph" the moment the import
  screen opened, and nothing explained it. She read that as her filter being dropped.
- "Add a table" inside the March edit screen showed only a toast ("Opens the file picker") and
  went no further.
- "Set collection..." means nothing to her, and it led to the same screen as File....
- Nowhere on screen does it say "append these rows to transfers" or "another month of the same
  table", which is how she thinks about it.
