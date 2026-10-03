# Session: recipe recipient (Tom), task r8-t26

Task as given: "Last month you built groups, rankings and colors on March's card transfers, which
are open now (example data if you do not work in banking). April's export has arrived as
transfers-2026-04.csv. You want everything you built to run again on April's numbers in place of
March's, without rebuilding it."

Renders are in tmp/round-8-sessions/r8-t26--recipe-recipient/ (paths below are relative to
design/ui/prototype/). Every command was run from design/ui/prototype.

## Start screen (shots/tasks/r8-t26/01.png)

"OK, this is March. Title says 'Transfers, March 2026'. Colored dots, a list of Community 1 to 7
with counts. 'Local only' up top, I like that. I've got the April file, so I want to put April
where March is. First thing I do with a file is File. There's no File menu, but the name at the top
has a little arrow. That's usually where the file stuff is."

## Step 1 -- the title menu

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t26--recipe-recipient/01.png task:r8-t26 --click "Transfers, March 2026"

"Rename, Open project or file, Save, Export, Apply recipe or style file, Version history. 'Apply
recipe' -- no, that's for when she sends me her colors; I've got the colors, I need the numbers.
'Open project or file', that's the one for a file."

## Step 2 -- Open project or file

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t26--recipe-recipient/02.png task:r8-t26 --click "Transfers, March 2026" --click "Open project or file..."

"It opened a bigger menu, New project, Open recent... and a list: there's transfers-2026-04.csv.
Good, that's April. I'm a bit nervous that opening it closes March, but there's nothing else
offering me April, so let's see."

## Step 3 -- pick the April file

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t26--recipe-recipient/03.png task:r8-t26 --click "Transfers, March 2026" --click "Open project or file..." --click "transfers-2026-04.csv"

"First line at the top: 'Open as a new graph'. I don't want a new graph. A new graph is going to be
grey dots, and I'll have to do the groups and colors all over again, which is exactly what I said I
didn't want.

And hang on -- I picked the April file and this says transfers-2026-03.csv, and the dates in the
rows are 2026-03-29, 2026-03-25... those are March. Did it open the wrong file? Or the same March
again? I can't tell if it's me or the file.

The bottom part does say 'The data stays on this computer: nothing is uploaded.' Fine, that I
read. But I'm not pressing Load on something that says 'new graph' and shows March dates. That's
one strike. Maybe I went in the wrong door."

(Did not press Load. Pressed nothing further on this screen; started again.)

## Step 4 -- second try, the Data button on the left

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t26--recipe-recipient/04.png task:r8-t26 --click "Data"

"Data. Sources: accounts-2026-03.csv and transfers-2026-03.csv. There's the March file. So I
need to swap that one. A lot of stuff under it, Filters, Attributes, I'm not reading all that."

## Step 5 -- click the March transfers file

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t26--recipe-recipient/05.png task:r8-t26 --click "Data" --click "transfers-2026-03.csv"

"'Edit: transfers'. A table of the March rows again, From, To, Weight, Stronger, Farther,
Capacity... I don't know what I'm meant to change here. The file name is written up there next to
'CSV, comma'. Maybe I click the name and it lets me pick another file."

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t26--recipe-recipient/06.png task:r8-t26 --click "Data" --click "transfers-2026-03.csv" --click "transfers-2026-03.csv"

"Nothing happened. It just sits there. 'Apply is off: Nothing has changed yet.' Right, nothing has."

## Step 6 -- the dots next to the March file

"Back on the list, there are three dots next to the file. Let me try those."

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t26--recipe-recipient/07.png task:r8-t26 --click "Data" --click "More"

"That opened a menu on the right side about the whole graph -- Select all, Re-run layout, Clear
graph data. Wrong dots. I'm not touching 'Clear graph data'."

(Moderator note: I aimed for the dots on the file row; the first two names I tried for them were
not on screen, the third was.)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t26--recipe-recipient/08.png task:r8-t26 --click "Data" --click "Actions for transfers-2026-03.csv"

"OK, this menu is about the March file. Rename. 'Replace with file...'. 'Add rows from file...'.
'Edit source...'. Then a grayed-out Remove with a paragraph I'm not reading.

'Add rows' -- no, then I'd have March and April mixed together, and the PI asks why the numbers
doubled.

'Replace with file'. Replace. Replace what -- just the rows, or everything I built on top? It
doesn't say the groups and the colors stay. The last time something said 'replace' to me I lost a
whole session. Nothing here tells me my Louvain groups and colors will come back after. That's
my second go and I still don't know if the next click wipes March's work. I'm stopping."

## Outcome

Gave up at the file's menu, without clicking "Replace with file...".

- Did I succeed? No. April is not in. I found where the March file lives and a menu that might be
  it, but I would not press Replace without knowing my groups and colors survive.
- Single Ease Question: 2 of 7.
- Would I use this instead of what I do now? "Not for this. What I'd do is email her: 'April's in,
  can you rerun it and send me the picture.' She could have just sent me a PNG and an Excel file.
  The bit I liked is it kept saying the data stays on this computer. But the first file button
  wanted to make a new graph, and it showed March dates when I'd picked April, and the second one
  says Replace. Nobody told me the stuff I built would still be there afterward."

## What I noticed (in my words)

- "Open project or file" with the April file led to "Open as a new graph". Not what I wanted, and
  it gave no other choice up front.
- After picking transfers-2026-04.csv, the screen said transfers-2026-03.csv and showed March
  dates. I couldn't tell which file it had actually read.
- The file name in the edit screen looks like it's the file, but clicking it does nothing.
- There are two sets of three dots, one for the file and one for the graph; the first one I hit
  was the graph's, with "Clear graph data" in it.
- "Replace with file..." is probably the answer, but the word Replace stops me, and nothing near it
  says the groups, rankings and colors will be kept and rerun.
- "Data stays on this computer: nothing is uploaded" -- that I believed and was glad to see.
