# Session: swap March's transfers for April's -- genomics Cytoscape user (Maren)

Task as given: "April's transfers have arrived as a new export. You want everything you built on March -- the rings, the rankings, the colors -- to run again on April's numbers in place of March's, without rebuilding anything."

Renders are in design/ui/prototype/tmp/round-7-sessions/t13--genomics-cytoscape-user/. Every command was run from design/ui/prototype.

## 01 -- start screen (shots/tasks/t13/01.png)

"OK, 'Transfers, March 2026', a network colored by Louvain -- 35 communities, 297 in the biggest. On the left a list: Louvain, Links in (count), Everything. In my world this is the same as getting a new DESeq2 run on the next batch: same network style, new table. In Cytoscape I'd import the new table onto the network and pray the key column matches. Here I don't see a 'new data' button anywhere obvious. The title has a little arrow, that's usually where the file stuff is."

## 02 -- title menu

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--genomics-cytoscape-user/02.png task:t13 --click "Transfers, March 2026"

"Rename, Save, Save as, Export, 'Apply recipe or style file...', Version history, Close project. 'Apply style file' is the other way round -- that's taking my style to new data, and I'd have to export it first. Maybe, but that sounds like rebuilding. Let me look at Data first, that's where a file would live."

## 03 -- Data

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--genomics-cytoscape-user/03.png task:t13 --click "Data"

"Sources: accounts-2026-03.csv, 3,000 nodes; transfers-2026-03.csv, 9,113 rows, 9,113 edges. Good -- it tells me rows and what they became, I like that. There's also a filter, 'amount is at least 1,000', 812 of 3,000 nodes. So the transfers file is what I want to swap. There's a little three-dot thing next to it."

## 04, 05 -- clicking the file name

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--genomics-cytoscape-user/04.png task:t13 --click "Data" --click "transfers-2026-03.csv"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--genomics-cytoscape-user/05.png task:t13 --click "Data" --click "transfers-2026-03.csv" --click "transfers-2026-03.csv"

"That opened 'Edit: transfers' -- the column mapping. from_account, to_account, amount is Weight. There's a match report at the bottom: 9,113 rows, every row has both ends. That's the thing Cytoscape never gives me, honestly. But there's no 'choose a different file' here. Clicking the file name at the top does nothing. Back out."

## 06 to 09 -- finding the dots menu

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--genomics-cytoscape-user/06.png task:t13 --click "Data" --hover "More"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--genomics-cytoscape-user/07.png task:t13 --click "Data" --click "More actions"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--genomics-cytoscape-user/08.png task:t13 --click "Data" --hover "Source actions"
    (09: three hovers in one loop -- "More actions for transfers-2026-03.csv", "transfers-2026-03.csv actions", "Actions")

"I went for the dots and got the wrong ones -- the menu on the right side panel: select all, re-run layout, add node, and 'Clear graph data' at the bottom, which I'm not touching. Then I fumbled around the dots beside the files; resting on the first one says 'Actions for accounts-2026-03.csv'. Fine, so the transfers one is the one under it."
(Moderator note: the first two tries and the three guessed names are the tool's naming mechanics, not her pointer; in the real app she would have hit the right dots on the second try.)

## 10 -- transfers source menu

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--genomics-cytoscape-user/10.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv"

"Rename, 'Replace with file...', Edit source, Refresh. 'Replace with file' -- yes, that is literally what I want. Good."

## 11 -- replace preview

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--genomics-cytoscape-user/11.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..."

"It picked transfers-2026-04.csv. 8,370 rows. 'All 4 columns of transfers-2026-03.csv are here, so every role carried over.' OK, that's the key-column problem answered before I hit it -- nice. 8,370 rows became 8,370 edges.
But wait. The preview rows all say 2026-03-29, 2026-03-25, 2026-03-11... these are March dates. Same account numbers as the March preview, same amounts, 5.04, 8.97. Is this actually the April file or is it showing me the old one? That makes me nervous.
And it says every row has an amount, but it doesn't say anything this time about whether the account IDs in April all exist in the 3,000 accounts. In March it said 'every row has both ends'. If April has new accounts that aren't in the March accounts file, where do those transfers go? It doesn't say. That's exactly my 'how many matched' question.
Nothing on this screen says what happens to the Louvain coloring or the rankings either. I'll press Load and see."

## 12, 13 -- after Load

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--genomics-cytoscape-user/12.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "Load"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--genomics-cytoscape-user/13.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "Load" --hover "transfers-2026-03.csv"

"Hm. The source still says transfers-2026-03.csv, 9,113 rows, 9,113 edges, and then something cut off with 'r...'. Summary: Edges 9,113. The preview just told me 8,370. So did it load April or not? The title still says 'Transfers, March 2026'.
And my filter is gone. Before, there was 'amount is at least 1,000, 812 of 3,000 nodes'. Now Filters says 'No filters', Nodes 3,000. I didn't touch that. That's the kind of thing that ends it for me -- something I set up disappeared and nothing said so. Resting on the file name gives me nothing, so I can't read the cut-off part."

## 14 -- back to Graph

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--genomics-cytoscape-user/14.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "Load" --click "Graph"

"It looks exactly like when I started. Community 1 is 297, Community 2 is 182, 35 communities, modularity 0.688, 'Run from Louvain, Sep 28'. If this had run on April's 8,370 transfers the sizes would surely have moved at least a little. Either it didn't load April, or it loaded April and didn't re-run, and the colors are March's results painted on April's network -- which would be worse, because the picture would look right and be wrong. There's no 'out of date' marker, no date change, nothing."

## 15 -- the Louvain run link

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--genomics-cytoscape-user/15.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "Load" --click "Graph" --click "from Louvain, Sep 28"

"I clicked 'from Louvain, Sep 28' hoping it would say what data it ran on, or offer to run again. It opened the whole Analyze picker -- Louvain, PageRank, shortest path. That's starting over. That is the rebuilding I was told not to do. I'm stopping here."

## Wrap-up

Did I succeed? "I don't know, and that's the answer. I found 'Replace with file', it read April, it told me the columns all carried over -- that part was better than Cytoscape. But after Load the counts are March's, the communities are March's, the run is still dated Sep 28, and my amount filter vanished. I can't tell whether anything ran on April. I'd say no."

Single Ease Question: 3 of 7. "Finding the replace was fine once I found the right dots. Knowing whether it worked was impossible."

Would I use this instead of Cytoscape? "For this, not yet. The match report on the replace screen is genuinely what I always want and never get. But a tool that silently drops a filter and then shows me last month's numbers with no word about whether they're stale -- I can't trust any number on that screen now. In Cytoscape it's ugly, but when I re-import a table I can at least see the column values changed. And my PI still wants the figure from the tool people cite."

## Observations (moderator)

- Found "Replace with file..." in the per-source menu; the label matched her goal word for word.
- The replace preview's "all 4 columns ... every role carried over" was well received.
- The replace preview rows show March timestamps under an April file name; she read it as possibly the wrong file.
- The replace match report dropped the "every row has both ends" line, so she could not tell whether April's accounts all matched the existing 3,000.
- After Load: the source row still read transfers-2026-03.csv, 9,113 rows/edges; summary Edges 9,113; title still "March 2026". The tail of the source line was truncated and had no tooltip.
- After Load the "amount is at least 1,000" filter was gone with no message. She treated this as silent data loss.
- Graph view after Load was identical to the start (same community sizes, "Run from Louvain, Sep 28"); no stale or re-run indication.
- "from Louvain, Sep 28" opened the Analyze picker rather than the run's details or a re-run.
