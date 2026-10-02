# Session: swap March's transfers for April's -- supply chain analyst (Dana Okafor)

Task as given: "April's transfers have arrived as a new export. You want everything you built on
March -- the rings, the rankings, the colors -- to run again on April's numbers in place of
March's, without rebuilding anything."

Renders are in design/ui/prototype/tmp/round-7-sessions/t13--supply-chain-analyst/.
Every command was run from design/ui/prototype; D below stands for that render folder.

## Transcript

**01 (start screen, shots/tasks/t13/01.png).** "Transfers, March 2026 is the file name up top,
with a little arrow. If I want to swap the month I'd click the name first."

**02.** `timeout 120 node app-b/study.mjs --try D/02.png task:t13 --click "Transfers, March 2026"`
Menu: Rename, Save, Save as, Export, Apply recipe or style file, Version history, Close project.
"Nothing says replace data or new month. 'Apply recipe' sounds like the opposite -- bringing
settings in, not data. I'll try the Data tab on the left."

**03.** `... --try D/03.png task:t13 --click "Data"`
"Sources: accounts-2026-03.csv and transfers-2026-03.csv. That's March. In Power BI I'd do
'change source'. There are three dots next to each file." Also noticed: a filter, "amount is at
least 1,000, 812 of 3,000 nodes". "So that's part of what I built too."

**04.** `... --try D/04.png task:t13 --click "Data" --hover "transfers-2026-03.csv"`
No tooltip, just a highlight.

**05.** `... --try D/05.png task:t13 --click "Data" --click "transfers-2026-03.csv actions"` ->
"nothing on screen is called ...". Then `... --click "Data" --click "More"` -- that opened the
right-hand panel's menu (Select all, Re-run layout, Clear graph data...). "Wrong dots. 'Clear graph
data' -- no thanks."

**06.** `... --try D/06.png task:t13 --click "Data" --click "transfers-2026-03.csv"`
Clicking the file opened "Edit: transfers", the column mapping screen. "From, to, amount,
timestamp -- fine, but I don't want to remap. I want a different file in the same slot."

**07.** `... --try D/07.png task:t13 --click "Data" --click "transfers-2026-03.csv" --click "CSV, comma"`
File settings: format, separator, ids, stop reading. "No 'choose another file'. Wrong place."

**08-10.** Guessed names for the row's dots:
`--hover "Source actions"` (nothing called that), `--hover "Options"` (the table's options at the
bottom), `--hover "Actions"` -> tooltip "Actions for accounts-2026-03.csv", `--hover "More actions"`
(right panel again). "There -- so the one I want is 'Actions for transfers-2026-03.csv'." It took
me four guesses to find the menu on the row I was looking at.

**11.** `... --try D/11.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv"`
Menu: Rename, Replace with file..., Edit source..., Refresh. "'Replace with file' -- exactly it."

**12.** `... --click "Replace with file..."`
Screen "Replace: transfers-2026-03.csv", file transfers-2026-04.csv, 8,370 rows. Match report: "all
4 columns of transfers-2026-03.csv are here, so every role carried over." "That's the sentence I
want." But: "the preview rows say 2026-03-29, 2026-03-25, 2026-03-11 -- March dates, and they look
like the exact same rows I saw before. Is this April's file or the old one? The count changed, so
I'll trust the count." Pressed Load.

**13.** `... --click "Replace with file..." --click "Load"`
Back on Data. "The source still says transfers-2026-03.csv, 9,113 rows, 9,113 edges. Summary says
9,113 edges. The preview said 8,370. Did it load April or not? And worse -- my filter, 'amount is
at least 1,000', is gone. Filters now says 'No filters'. That was part of what I built. It changed
something without telling me, and now I don't trust any number after it."

**14.** `... --click "Load" --hover "transfers-2026-03.csv"` -- the line ends in "r..." and the
hover did not show the rest.

**15.** `... --click "Load" --click "Graph"`
"Louvain, 35 groups, Community 1 is 297 -- the exact same numbers as March. 'Run from Louvain,
Sep 28' is the old date. The title still says March 2026. With 743 fewer transfers I'd expect the
group sizes to move at least a little. Nothing tells me these colors are April's."

**16.** `... --click "Graph" --click "More actions"`
Louvain menu: Rerun, Run as copy, Restore the suggested look, ... "So I have to rerun each thing by
hand? That's not what I asked for, but let's see."

**17.** `... --click "More actions" --click "Rerun"`
The screen switched to a different project: "Les Miserables", Co-appearances, Valjean, Javert, 77
nodes. "That's not my file at all. I pressed Rerun on my groups and it threw me into somebody
else's project. My accounts are gone. That's the crash moment -- I close the tab and go back to
Excel."

## Outcome

- Succeeded? No. I found "Replace with file" and it promised my column roles carried over, but
  after Load nothing on screen said April: same file name, same 9,113 count, same Louvain sizes and
  date, title still March. My amount filter silently disappeared. Rerun dropped me into an
  unrelated project.
- Single Ease Question: 2 of 7.
- Would I use this instead of my current tool? No. In Power BI, change source then Refresh redoes
  every visual and the page tells me the refresh time. Here I can't tell whether my rings and
  colors are on April's numbers, one of my steps vanished without a word, and one click lost my
  data. Before anything else I'd still ask the usual questions -- does IT approve it, and can the
  ranked tables go to Power BI -- but this never got that far.

## What hurt most (in my words)

1. After Load, nothing says "April" anywhere: file name, row count, title, run date all still March.
2. The amount filter was dropped without a message.
3. Rerun on Louvain opened a different project (Les Miserables).
4. The replace preview showed March-dated rows next to the April file name.
5. The three dots on the source row have no visible name; I needed four guesses to open them.
6. Even if it had worked, "rerun each layer by hand" is rebuilding. I want one "refresh
   everything on the new file" with a list of what got recomputed.

## What was good

- "Replace with file..." sits right on the file, where I'd expect it.
- The match report line "all 4 columns ... are here, so every role carried over" is exactly the
  reassurance I want before pressing Load.
