# Session: Maren (genomics Cytoscape user), task t34

Task as given: "Valjean is drawn dark brown and large. Work out what makes him dark and large. Then a ranking you made earlier seems to change nothing when you switch it on -- work out what is going on."

All commands were run from design/ui/prototype. Renders are in tmp/round-7-sessions/t34--genomics-cytoscape-user/. In the commands below, D stands for that folder's absolute path.

## Step 1: start screen (shots/tasks/t34/01.png)

Okay. Orange network, legend top left: "Color: PageRank, 0.0033 to 0.0754" and "Size: Degree, 1 to 36". So the legend already half answers it -- dark brown is high PageRank, big is high degree. Fine, but I want to see that on Valjean himself, not trust a legend. Left list: PageRank, Louvain, Shortest paths, Watchlist, a folder "For the report", Betweenness with a crossed-out eye, Everything. Then "1 hidden row still paints." Hidden but still paints? That sentence makes no sense to me yet. I don't see a "Degree" row anywhere, but the legend says size is degree. In Cytoscape I would just open the style panel and see the size mapping.

## Step 2: click Valjean

    timeout 120 node app-b/study.mjs --try $D/02.png task:t34 --click "Valjean"

Right panel now says "Why this look": Notes - Label below, PageRank - Color, Degree (gray, italic) - Size, Group 2 - Label above, Selection - Color Size, Everything - Shape. Good, that is actually the thing I wanted -- per node, which mapping gives which property. So dark = PageRank, large = Degree. And down by the network: "Valjean, 36 connections". 36 is the top of the size scale, matches.

Two things bug me. Degree is grayed and italic and is not in the left list -- why? And "Selection - Color Size": is the selection ring making him look darker right now? If clicking a node changes its color I would not trust what I am measuring.

## Step 3: click Degree in that list

    timeout 120 node app-b/study.mjs --try $D/03.png task:t34 --click "Valjean" --click "Degree"

A "Degree" row appeared in the left list, dimmed, between Watchlist and the report folder. Inspector: "Measure from the graph", Size 0.5 to 3, paints 77 nodes. Footer now says "1 hidden row still paints; it shows dimmed here." So someone hid the Degree row from the list but it still drives the size. Okay, I get it now, but "hidden" for me means "switched off". In Cytoscape a mapping is either there or not. A mapping that is hidden from the list and still sizing every node is exactly the kind of silent thing I hate.

First half answered: dark brown from PageRank (highest, 0.0754), large from Degree (36, highest).

## Step 4: click the Betweenness row

    timeout 120 node app-b/study.mjs --try $D/04.png task:t34 --click "Betweenness"

The row highlighted but the right panel still shows PageRank. Huh. I clicked Betweenness, I expected Betweenness settings. Did my click not register?

## Step 5: hover the eye on Betweenness

    timeout 120 node app-b/study.mjs --try $D/05.png task:t34 --click "Betweenness" --hover "Show"

Tooltip "Show Betweenness. Alt-click or Alt+Space: show only this row". Fine.

## Step 6: switch Betweenness on

    timeout 120 node app-b/study.mjs --try $D/06.png task:t34 --click "Show Betweenness"

Eye is open now. Network: identical. Legend: still "Color: PageRank". So this is the "changes nothing" thing. My guess: PageRank is higher in the list and also does Color, so it wins. The PageRank panel says "Covers Louvain for Color" -- but it does not say it covers Betweenness, even though Betweenness is now on and also below it. So the one hint that would confirm my guess does not mention Betweenness.

## Step 7: select Betweenness after switching it on

    timeout 120 node app-b/study.mjs --try $D/07.png task:t34 --click "Show Betweenness" --click "Betweenness"

Again highlighted, again the right panel stays on PageRank. I cannot get at Betweenness's own settings at all. I want to see "what do you color, and are you being covered" and I can't.

## Step 8: Betweenness on, then click Valjean

    timeout 120 node app-b/study.mjs --try $D/08.png task:t34 --click "Show Betweenness" --click "Valjean"

"Why this look" lists the same six rows -- no Betweenness. And the Betweenness eye in the list is crossed out again. Did clicking a node switch my ranking back off? That's alarming. Either way Betweenness is not contributing to Valjean.

## Step 9: Betweenness on, hide PageRank

    timeout 120 node app-b/study.mjs --try $D/09.png task:t34 --click "Show Betweenness" --click "Hide PageRank"

PageRank eye is crossed out now, but the nodes are still orange and the legend still says "Color: PageRank". So hiding the top one did not let Betweenness through either. Now I don't know what to believe -- either my theory is wrong or the screen did not update.

## Step 10: hover Betweenness row

    timeout 120 node app-b/study.mjs --try $D/10.png task:t34 --click "Show Betweenness" --hover "Betweenness"

Nothing. No warning, no "covered by PageRank" note on the row.

## Step 11-12: PageRank's menu

    timeout 120 node app-b/study.mjs --try $D/11.png task:t34 --click "Show Betweenness" --hover "More"
    timeout 120 node app-b/study.mjs --try $D/12.png task:t34 --click "Show Betweenness" --click "More actions"

Rename, Select top N, Show in table, Filter to, Lock, Hide in list, Add note, Compare with another row, Delete. Nothing like "move down" or "put below". If the order decides who wins, how do I change the order? Drag, maybe; nothing says so.

## Step 13: Compare with another row

    timeout 120 node app-b/study.mjs --try $D/13.png task:t34 --click "Show Betweenness" --click "More actions" --click "Compare with another row..."

Wait -- this is a different dataset. "Transfers, March 2026", 3,000 accounts, Louvain March vs April. Where did my Les Miserables go? Getting thrown into someone else's data from a menu item is the kind of thing that makes me close a tool. Backing out.

## Step 14: "Paints 77 nodes" link on PageRank

    timeout 120 node app-b/study.mjs --try $D/14.png task:t34 --click "Show Betweenness" --click "Paints 77 nodes (every node with a value)"

Table opened under the network: Degree, PageRank, Rank by PageRank, Betweenness columns, with "Valjean is first on all three measures". Good -- that table is useful, Valjean betweenness 0.570. So Betweenness exists and has values. But Betweenness's eye is crossed out again in the list. Every time I do something else it seems to switch itself back off.

## Where I stop

First part: done. Dark brown = PageRank color mapping (he has the top value, 0.0754). Large = Degree size mapping (36 connections), which is a row hidden from the list that still paints.

Second part: my best guess is that PageRank sits above Betweenness and also colors nodes, so PageRank wins and Betweenness never shows. But I could not confirm it: I could not open Betweenness's settings, the PageRank panel's "Covers ..." line names Louvain and not Betweenness, hiding PageRank did not change the colors, and Betweenness kept switching back off. I'd give up here.

## Verdict

- Succeeded? Half. First part yes, confidently. Second part only a guess the app never confirmed.
- Single Ease Question: 3 of 7.
- Would I use it instead of Cytoscape? No. "Why this look" on a node is genuinely better than anything in Cytoscape -- I'd like that. But a mapping that is hidden and still paints, a ranking I switch on that silently does nothing and then turns itself back off, and a menu item that dropped me into a different dataset -- that is three silent things in ten minutes. I can't put a figure in a paper when I'm not sure which mapping is coloring it. And there's still no paper to cite.
