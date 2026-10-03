# Session: swap March's transfers for April's (participant: Maren, genomics postdoc, Cytoscape user)

Task as given: "Last month you built groups, rankings and colors on March's card transfers, which are open now (example data if you do not work in banking). April's export has arrived as transfers-2026-04.csv. You want everything you built to run again on April's numbers in place of March's, without rebuilding it."

All commands were run from design/ui/prototype. Renders are in tmp/round-8-sessions/r8-t26--genomics-cytoscape-user/. `$D` below is that folder.

## 01 -- start screen (shots/tasks/r8-t26/01.png)

"OK, not my data, but fine -- it's a network colored by Louvain, 35 groups, and there's a 'Links in (count)' thing under it, which I guess is the ranking. Title says 'Transfers, March 2026'. In Cytoscape the equivalent is: import the new table, then redo the style and rerun clustering by hand, which is exactly what I'd hate. Bottom right says 'Data version: March', which is a hint that the data is a swappable thing. Where's the data? There's a 'Data' icon on the left."

## 02 -- Data panel

    timeout 120 node app-b/study.mjs --try $PWD/$D/02.png task:r8-t26 --click "Data"

"Sources: accounts-2026-03.csv and transfers-2026-03.csv. Good, it remembers the files. I want to swap the transfers one. I'll just click the file name."

## 03, 04 -- clicked the file name

    timeout 120 node app-b/study.mjs --try $PWD/$D/03.png task:r8-t26 --click "Data" --click "transfers-2026-03.csv"
    timeout 120 node app-b/study.mjs --try $PWD/$D/04.png task:r8-t26 --click "Data" --click "transfers-2026-03.csv" --click "transfers-2026-03.csv"

"That opened an editor for the table: columns, From/To, weight, and a match report -- '9,113 of 9,113 from_account found in accounts'. I like that, that's the number Cytoscape never gives me. But I don't see a way to point it at a different file. The file name up top isn't clickable (clicked it, nothing). The 'CSV, comma' dropdown is the format, not the file. Back out."

## 05, 06 -- looking for a menu

    timeout 120 node app-b/study.mjs --try $PWD/$D/05.png task:r8-t26 --click "Data" --hover "More"
    timeout 120 node app-b/study.mjs --try $PWD/$D/06.png task:r8-t26 --click "Data" --click "More actions"
    timeout 120 node app-b/study.mjs --try $PWD/$D/06.png task:r8-t26 --click "Data" --click "More actions for transfers-2026-03.csv"   (nothing on screen is called that)

"There are three-dot buttons next to each file. The first one I hit was actually the whole network's menu over on the right -- select all, re-run layout, 'Clear graph data'. Not touching that. I want the dots on the transfers row."

## 07 -- the transfers row's menu

    timeout 120 node app-b/study.mjs --try $PWD/$D/07.png task:r8-t26 --click "Data" --click "Actions for transfers"
    (also tried "transfers-2026-03.csv actions" and "transfers actions": nothing on screen is called that)

"Rename, 'Replace with file...', 'Add rows from file...', 'Edit source...'. Replace with file -- that's literally it. 'Add rows' would have stacked April on March, which is what I'd have done by mistake in Cytoscape. Good that they're separate."

## 08 -- Replace with file

    timeout 120 node app-b/study.mjs --try $PWD/$D/08.png task:r8-t26 --click "Data" --click "Actions for transfers" --click "Replace with file..."

"'Replace: transfers-2026-03.csv'. A picker offers transfers-2026-04.csv. The warning says choose the file, its columns are matched and the setup carries over. Load is grayed out until I pick. Fine."

## 09 -- picked April

    timeout 120 node app-b/study.mjs --try $PWD/$D/09.png task:r8-t26 --click "Data" --click "Actions for transfers" --click "Replace with file..." --click "transfers-2026-04.csv"

"8,370 rows. 'All 4 columns of transfers-2026-03.csv are here, so every role carried over.' 8,370 of 8,370 found in accounts on both ends. That's exactly what I want to see before I commit: the count, and that nothing dropped. Dates are April now. Hm -- the first six amounts are identical to March's, to the cent. Probably example data, but with my own data that would make me check I didn't load the same file twice. Load."

## 10 -- after Load

    timeout 120 node app-b/study.mjs --try $PWD/$D/10.png task:r8-t26 --click "Data" --click "Actions for transfers" --click "Replace with file..." --click "transfers-2026-04.csv" --click "Load"

"Title says April now. The source line says '8,370 rows, was 9,113', '27 components, was 1', and '26 new single-node groups: accounts with no transfers in April'. That's honest, I like being told that. Then a yellow box: 'Louvain and the other runs used March's transfers. They show March's results until you rerun them.' Important -- so the colors on screen right now are STILL March. If I'd exported a figure at this point it would be wrong, and the canvas legend itself doesn't say so. 'The other runs' -- which ones? Only Louvain is named. Open Louvain."

## 11 -- Louvain opened

    timeout 120 node app-b/study.mjs --try $PWD/$D/11.png task:r8-t26 --click "Data" --click "Actions for transfers" --click "Replace with file..." --click "transfers-2026-04.csv" --click "Load" --click "Open Louvain"

"Warning triangle on Louvain in the list. 'Louvain used March data. It is now April: 794 transfers added, 1,537 removed.' and a Rerun button. Same seed (11), same weight. The ranking layer 'Links in (count)' has no warning icon -- does that mean it already updated, or that nobody checked? I can't tell. Rerun."

## 12, 13 -- Rerun

    timeout 120 node app-b/study.mjs --try $PWD/$D/12.png task:r8-t26 --click "Data" --click "Actions for transfers" --click "Replace with file..." --click "transfers-2026-04.csv" --click "Load" --click "Open Louvain" --click "Rerun"
    timeout 120 node app-b/study.mjs --try $PWD/$D/13.png task:r8-t26 --click "Data" --click "Actions for transfers" --click "Replace with file..." --click "transfers-2026-04.csv" --click "Load" --click "Open Louvain" --click "Rerun" --hover "Links in (count)"

"'Rerunning', progress bar, Cancel. The numbers underneath are still March's (297, 182, ...). I waited; it never finished while I was looking. Hovering gave me a tooltip about why the run's name can't be changed, which I didn't ask about."

## 14 -- checking the ranking

    timeout 120 node app-b/study.mjs --try $PWD/$D/14.png task:r8-t26 --click "Data" --click "Actions for transfers" --click "Replace with file..." --click "transfers-2026-04.csv" --click "Load" --click "Open Louvain" --click "Rerun" --click "Links in (count)"

"'Opens Links in (count) in the inspector (not available yet).' So I can't check whether the ranking moved to April. I'll stop here."

## Wrap-up

Did I succeed? Partly, I think. The April file is in, every row matched, the title says April, and I started the Louvain rerun without rebuilding anything -- same seed, same weight, same colors layer. But I never saw the April communities land, and I don't know whether the ranking is on April or still March. The note said "Louvain and the other runs", and only Louvain was flagged, so I am not sure I caught everything.

Single Ease Question: 5 of 7. The swap itself was easy once I found the row's three dots; the hard part was knowing when everything was really on April.

Would I use this instead of my current tool? For this kind of "same analysis, new month" job, yes, over Cytoscape -- in Cytoscape I'd re-import the table, pray the key column matches, and redo clustering and style by hand. Here it kept the setup and gave me the counts ("8,370 of 8,370 found", "was 9,113", "26 accounts with no transfers"). What would stop me trusting it: the canvas keeps showing March's colors after the load with nothing on the legend saying so, and there's no single "everything is now on April" check. If I can't see that, I'd be re-checking every number by hand before it goes in a figure.
