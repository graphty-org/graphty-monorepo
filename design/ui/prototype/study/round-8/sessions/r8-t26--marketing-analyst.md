# Session: swap March's transfers for April's (marketing analyst, Jordan)

Task as given: "Last month you built groups, rankings and colors on March's card transfers, which are open now (example data if you do not work in banking). April's export has arrived as transfers-2026-04.csv. You want everything you built to run again on April's numbers in place of March's, without rebuilding it."

Start screen: shots/tasks/r8-t26/01.png. Renders: tmp/round-8-sessions/r8-t26--marketing-analyst/NN.png.
All commands were run from design/ui/prototype as `timeout 120 node app-b/study.mjs --try <render> task:r8-t26 ...`; only the steps are listed below.

## Steps and think-aloud

**01 (start screen).** "OK, March is open. Louvain groups, something called 'Links in (count)', the colors. I need to get April's file in. Down the right panel it says 'Data version: March', so the app knows which month this is. First instinct: the Data tab on the left."

**02** `--click "Data"`
Sources list: accounts-2026-03.csv and transfers-2026-03.csv, each with a three-dot menu. "That's the file I want to swap."

**03** `--click "Data" --click "transfers-2026-03.csv"`
Opened "Edit: transfers", which is the column-mapping screen. "Useful, but where is 'replace file'?"

**04** `... --click "transfers-2026-03.csv"` (again, on the file name in the edit view)
Nothing happened. "The file name isn't a button."

**05** `--click "Data" --click "..."` -> "nothing on screen is called '...'". Then `--click "Data" --click "More"` -> opened the whole graph's menu (Select all, Re-run layout, Clear graph data...). "Wrong menu. 'Clear graph data' -- not touching that."

**06** `--hover "transfers-2026-03.csv more"` -> nothing by that name. Then `--click "Data" --click "Actions for transfers"` -> the file's menu: Rename, Replace with file..., Add rows from file..., Edit source..., Remove (disabled, with an explanation). "'Replace with file...' -- exactly the words I'd use. Not 'Add rows'; I don't want March and April mixed." (Note: I only found the dots' name by guessing. On a real screen I'd just click the dots, so this was the tool, not the app.)

**07** `... --click "Replace with file..."`
"Replace: transfers-2026-03.csv" screen, with a picker already offering transfers-2026-04.csv. The yellow banner behind the picker is half hidden ("Its columns are m... carries over").

**08** `... --click "transfers-2026-04.csv"`
Preview with April dates. Match report: "8,370 rows; all 4 columns of transfers-2026-03.csv are here, so every role carried over", every from/to account found, 8,370 rows became 8,370 edges. "That's the check I'd do in Excel anyway. Good." Then: "Weird -- the first six amounts are identical to March's (5.04, 8.97, 44.63...), only the dates moved. Probably example data." "The accounts file is still the March one. Nobody sent me a new one, so I guess that's fine."

**09** `... --click "Load"`
Title changed to "Transfers, April 2026" on its own. Source now reads "8,370 rows, was 9,113", "27 components, was 1", "26 new single-node groups: accounts with no transfers in April". Yellow box: "Louvain and the other runs used March's transfers. They show March's results until you rerun them." with one button, "Open Louvain". "Thank god it warns me. Presenting March's colors as April's is exactly how I'd get burned. But 'the other runs' -- which ones? I had a ranking too. There's only a button for Louvain. I want 'rerun everything'."

**10** `... --click "Open Louvain"`
Louvain shows a warning triangle in the layer list, and the right panel says: "Louvain used March data. It is now April: 794 transfers added, 1,537 removed." with a Rerun button. "Nice -- that's a number I'd actually put in a note."

**11** `... --click "Rerun"`
"Rerunning" with a thin progress bar and Cancel. The numbers underneath (35 communities, 297 in the largest) are unchanged.

**12** `... --click "Links in (count)"`
Toast: "Opens Links in (count) in the inspector (not available yet)". "That's my ranking, I think. No warning on it. Is it one of 'the other runs' or does it update itself? Can't tell."

**13** `... --click "Expand Louvain"` -> nothing by that name. "The little arrow next to Louvain -- I thought the other runs might be under it. Couldn't open it."

**14** `... --click "Rerun" --hover "Cancel" --hover "Seed" ...` (waiting)
Still "Rerunning", bar hasn't visibly moved, no time estimate. "Are these March's numbers or April's below it? No idea while it runs."

**15** `... --click "Rerun" --click "Data"`
The yellow warning is gone. Under Results there is only Louvain. "So maybe 'the other runs' meant just Louvain, and 'Links in (count)' is a plain count that keeps itself up to date? Nothing told me that. The legend still says Community 1 is 297 nodes, which is March's exact number, and I never saw the rerun finish."

## Wrap-up (in Jordan's words)

**Did I succeed?** Mostly, I think. April is in, the file replaced cleanly, the title says April, and the groups are rerunning. What I'm not sure of: whether my ranking reran or needed to, and whether the rerun ever finished -- the legend still shows March's exact counts. I'd look up one account I know before this goes in a deck.

**Single Ease Question:** 4 of 7. The swap itself was a 6 -- "Replace with file", the match report and the "was 9,113" notes are great. It lost points on finding the file's dots menu, on "the other runs" pointing at only one thing, and on a rerun with no estimate and no clear "done".

**Would I use this instead of my current tool?** For the monthly refresh, yes, probably. In Gephi I re-import, redo the partition, redo the colors and the sizes every month, and half the time I forget a step. Here the colors, groups and filter all survived the swap and it told me what was stale. But I'd want one "rerun everything that used March" button and a clear "this is April's result now" before I trust it with the VP deck. And honestly, the VP only reads slide one anyway -- if the colors move between months she'll ask why, and I need the "794 added, 1,537 removed" line on the slide to answer that.

## Problems observed

1. The stale-results warning says "Louvain and the other runs" but offers only "Open Louvain"; no way to rerun all stale results at once, and no list of which ones are stale. (severity 3)
2. "Links in (count)" carries no stale or fresh marker after the swap, so I could not tell if my ranking updated itself or still showed March. (severity 3)
3. Rerunning shows a thin bar with no time estimate and no visible finish; the numbers beneath stay at March's values while it runs, so old and new look the same. (severity 3)
4. The yellow banner on the Replace screen was half covered by the file picker. (severity 1)
5. The file-level menu was a small icon; my first click on the file name opened the column editor instead, and the panel's other dots opened the whole-graph menu with "Clear graph data" in it. (severity 2)
6. The accounts file is still the March one after the swap; nothing says whether that matters. (severity 1)
