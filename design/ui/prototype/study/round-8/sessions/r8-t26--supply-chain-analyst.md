# Session: swap March's transfers for April's and rerun what was built

Participant: Dana Okafor, supply chain risk analyst (simulated persona, study/personas/supply-chain-analyst.md)

Task as given: "Last month you built groups, rankings and colors on March's card transfers, which
are open now (example data if you do not work in banking). April's export has arrived as
transfers-2026-04.csv. You want everything you built to run again on April's numbers in place of
March's, without rebuilding it."

Start screen: shots/tasks/r8-t26/01.png
Renders: tmp/round-8-sessions/r8-t26--supply-chain-analyst/NN.png
All commands run from design/ui/prototype. Each one is
`timeout 120 node app-b/study.mjs --try <render> task:r8-t26 <steps>`; only the steps are listed below.

## Think-aloud

**01 (start screen).** Not my data -- card transfers -- but fine, this is my quarterly supplier
refresh in different clothes. Title says "Transfers, March 2026". Big hairball, colored dots,
legend "Color: Louvain, Community 1..7, 28 more". I don't know what Louvain is; I assume that is
"the groups". Left list: Selection, Notes, Louvain, Links in (count), Everything. Right side
bottom says "Data version: March". So the thing knows it is March. I want to swap the file.
I look for "import" or a data area. There is a "Data" button in the left strip. Clicking that.

**02** `--click "Data"`. Good, this is what I expected: "Sources" with accounts-2026-03.csv and
transfers-2026-03.csv. Each has a "..." next to it. First I just click the file name itself.

**03** `--click "Data" --click "transfers-2026-03.csv"`. This opened "Edit: transfers", a
column-mapping screen with a preview and a "Match report". Looks like the import screen from
last month. Nothing here says replace or new file. The file name at the top is just text. Not
what I want; I would press Esc. Back to the dots.

**04** `--click "Data" --click "More actions"`. I was aiming for the dots next to the file, and
got a menu for the whole graph instead (Select all, Re-run layout, Clear graph data...). "Clear
graph data" -- no, I am not wiping last month's work. Wrong menu.

**05/06** Pointer resting on the dots next to the transfers file. Tooltip says "Actions for
transfers-2026-03.csv". OK, that is the one. (Commands tried, in order:
`--click "Data" --click "More actions for transfers-2026-03.csv"` -> nothing called that;
then hovering "Actions for transfers-2026-03.csv" showed the tooltip.)

**07** `--click "Data" --click "Actions for transfers-2026-03.csv"`. Menu: Rename, Replace with
file..., Add rows from file..., Edit source..., and a grayed-out Remove with a paragraph I did
not read. "Replace with file..." is exactly my words. "Add rows from file" would have stacked
April on top of March, which I do NOT want -- glad they are separate items.

**08** `... --click "Replace with file..."`. Screen "Replace: transfers-2026-03.csv". A little
picker pops up: "Replace transfers-2026-03.csv with transfers-2026-04.csv". It is covering the
yellow message behind it, so I could not read that. The bottom bar says "Load is off: choose the
file that replaces transfers-2026-03.csv". Clear enough.

**09** `... --click "transfers-2026-04.csv"`. Now the preview shows April dates (2026-04-29
etc.), 8,370 rows. The match report: "all 4 columns of transfers-2026-03.csv are here, so every
role carried over", "8,370 of 8,370 from_account found in accounts", same for to_account. This
is the bit I care about: it did not make me redo the column mapping, and it tells me every row
matched. That is better than my Excel refresh, where the XLOOKUP silently returns N/A. One
question though: the accounts file is still accounts-2026-03.csv. Nobody gave me an April
accounts file, and it says every account was found, so I let it go. Clicking Load.

**10** `... --click "Load"`. Title now says "Transfers, April 2026". The source reads
"transfers-2026-04.csv, 8,370 rows, was 9,113". "27 components, was 1. 26 new single-node
groups: accounts with no transfers in April". I don't know what a component is, but "was / now"
I understand. Then a yellow box: "Louvain and the other runs used March's transfers. They show
March's results until you rerun them." with a button "Open Louvain". Good that it warns me --
the picture still shows March's groups, which would have been embarrassing on a slide. But
"the other runs" -- which other runs? It only gives me a button for one of them.

**11** `... --click "Open Louvain"`. Right panel: "Louvain used March data. It is now April:
794 transfers added, 1,537 removed." with a "Rerun" button. Louvain in the list has a warning
triangle. Links in (count) does not. So I guess Louvain is the only stale thing? Or the colors
are computed live? It doesn't say. Clicking Rerun.

**12** `... --click "Rerun"`. "Rerunning" with a progress bar and Cancel. Numbers on screen are
still the old ones (35 communities, Community 1 = 297) while it runs. I can't wait any longer in
this setup, so I don't get to see April's groups come out.

**13** `... --click "Links in (count)"`. I wanted to check whether the colors/ranking were
redone too. A tooltip says "Opens Links in (count) in the inspector (not available yet)". Dead
end. I also never found anything I would call "rankings" -- maybe "Links in (count)" is the
ranking and the coloring at the same time, I'm guessing.

**14** `... --click "Expand Louvain"` -> nothing on screen is called that. I was trying to open
the little arrow next to Louvain to see what hangs off it. Stopping here.

## Outcome

Did I succeed? Mostly, I think. April's file is in place of March's, the mapping carried over,
the title says April, and the one result flagged as stale is rerunning. What I cannot confirm:
(1) that "the other runs" the warning mentioned all got redone -- only Louvain had a flag and a
button; (2) whether the colors and whatever counts as my ranking are on April numbers now --
nothing told me either way and the one place I tried was "not available yet"; (3) I never saw
the rerun finish. If I had to present on Thursday I would want one line that says "everything
is now April" or a list of what is still March.

Single Ease Question: 5 of 7. Replace-with-file and the match report were easy and reassuring.
Finding the right "..." took a wrong turn into the graph menu, and the end state left me unsure.

Would I use this instead of my current tool? For this job, it beats my quarterly Excel refresh:
swapping the export and having the mapping and every row checked automatically is the thing I
redo by hand today. But "Louvain and the other runs" without naming them is the same trust
problem I have with my workbook -- I don't know which tabs are stale. And the usual questions
stand before I'd switch: it says "Local only", which helps with IT, but I still need to get the
results into Power BI for my VP. Side tool for now.

## Problems noted (participant's words)

- The "..." next to the file and the "..." in the top-right panel look the same; I opened the
  wrong one first and it offered "Clear graph data".
- The file picker covered the yellow message on the replace screen.
- "Louvain and the other runs" -- which others? Only one button, only one warning icon.
- No clear "everything is now April" confirmation after the rerun; old numbers stay on screen
  while it runs.
- Couldn't tell whether the colors/ranking (Links in) were refreshed; opening it said "not
  available yet".
- Accounts file still says 2026-03; nothing asked whether I wanted to replace that too.
- "27 components, was 1" -- I don't know what components are.
