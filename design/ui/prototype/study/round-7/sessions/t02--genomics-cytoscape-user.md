# Session: find the five characters a teammate's work ranks highest

Participant: Maren, genomics postdoc who uses Cytoscape (simulated persona)
Task given: "Someone on your team already worked on this project. Work out which five characters their work says matter most to the whole story, in order, and how the drawing shows it."
Start screen: shots/tasks/t02/01.png
Renders: tmp/round-7-sessions/t02--genomics-cytoscape-user/

All commands were run from design/ui/prototype. "P" below stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-7-sessions/t02--genomics-cytoscape-user

## Step 1 -- the start screen (01.png, given)

"OK, a network, all orange. The legend box up top says Color: PageRank, 0.0033 to 0.0754, and Size: Degree. Good, there is a legend, and it has a range. Valjean is the big dark brown one in the middle. On the left there's a list -- PageRank, Louvain with six communities, Shortest paths, a Watchlist with 5 in it and a padlock, a folder called 'For the report' with Group 2, Group 8 and a Betweenness that's crossed out. So the teammate ran a few things. Which one is 'their answer'? The thing the drawing is colored by is PageRank, so I'll start there. In Cytoscape this would be cytoHubba's results table."

## Step 2 -- click PageRank

    timeout 120 node app-b/study.mjs --try P/02.png task:t02 --click "PageRank"

"Right panel says PageRank, 'Measure from Analyze', paints 77 nodes, every node with a value. Color 'Orange to brown'. So darker is higher. Fine, but I want a ranked list, not shades of orange -- I can't tell the third darkest from the fifth by eye."

## Step 3 -- try for the data

    timeout 120 node app-b/study.mjs --try P/03.png task:t02 --click "PageRank" --click "Data"

"That took me to a whole Data page about the file -- 77 nodes, 254 edges, one connected component. Not what I wanted; I meant the Data tab next to Style on the PageRank panel. Nice that it says one connected component though, I don't have to go find the largest component. Under Results it lists Louvain and PageRank. No list of who's on top."

## Step 4 -- open the table

    timeout 120 node app-b/study.mjs --try P/04.png task:t02 --click "Table"

"There. A node table. It's sorted by degree: Valjean 36, Gavroche 22, Marius 19, Javert 17, Thenardier 16. And there's a 'Rank by PageRank' column already, and a line above it: 'Valjean is first on all three measures; Gavroche is in the top 3 on all three.' Three measures -- degree, PageRank, betweenness I guess. The rank column says Gavroche is 3 by PageRank, so somebody is 2 who isn't in this degree order. Let me sort by it."

## Step 5 -- sort by PageRank rank

    timeout 120 node app-b/study.mjs --try P/05.png task:t02 --click "Table" --click "Rank by PageRank"

"Sorted. By PageRank: 1 Valjean 0.0754, 2 Myriel 0.0428, 3 Gavroche 0.0358, 4 Marius 0.0309, 5 Javert 0.0303. Myriel is second with a degree of only 10 -- so this isn't just 'most connections'. I'd have said hubs are the highest degree ones. Here degree would put Thenardier in and Myriel out. Javert and Marius are almost tied, 0.0309 versus 0.0303; I'd want to know if that difference means anything before I put an order on it."

## Step 6 -- is the Watchlist their answer instead?

    timeout 120 node app-b/study.mjs --try P/06.png task:t02 --click "Watchlist"

"Watchlist, five nodes, locked, pink. Five is suspicious -- maybe that's the teammate's top five. But it says 'Covered for Color by PageRank', so the pink isn't showing anywhere. It doesn't tell me who's in it."

## Step 7 -- check the notes for what the teammate concluded

    timeout 120 node app-b/study.mjs --try P/07.png task:t02 --click "Notes"

"Notes: 'Highest betweenness in the book, 0.57. Next is Myriel at 0.177.' And 'Javert follows Valjean through the whole book. Check whether PageRank ranks them side by side.' Nobody wrote 'here are the top five'. The note asks me to check PageRank, which points me back at PageRank. Betweenness is in the report folder but hidden, so I take it the teammate settled on PageRank for the picture."

## Step 8 -- who is in the Watchlist?

    timeout 120 node app-b/study.mjs --try P/08.png task:t02 --click "Watchlist" --click "Paints 5 nodes"

"Clicked 'Paints 5 nodes'. Panel now says '5 nodes', with a 'Why this look' table -- PageRank color 5 of 5, Notes label below 2 of 5, Group 2 label above 1 of 5. But the network doesn't look any different. I can't see which five are selected. Nothing is highlighted."

## Step 9 -- table with that selection

    timeout 120 node app-b/study.mjs --try P/09.png task:t02 --click "Watchlist" --click "Paints 5 nodes" --click "Table"

"Still all 77 rows, still sorted by degree, nothing marked as selected. So I can't tell who the five watchlist characters are. I'll stop chasing it. 'Notes on 2 of 5' fits Valjean and Javert, and 'one in Group 2' fits Valjean, so it's probably the same five as PageRank, but I'm guessing."

## My answer

By the teammate's PageRank, in order: Valjean, Myriel, Gavroche, Marius, Javert.

How the drawing shows it: the color is PageRank -- darker brown means higher. Valjean is the darkest, in the center. Size is degree, not PageRank, which is why Myriel looks small but is dark. That mix confused me at first: the biggest circles aren't the same as the darkest ones.

## Debrief

Succeeded? Probably, for the ranking. I'm sure of the PageRank order because I read it from a sorted column. I'm less sure it's "their" answer: there's also a locked Watchlist of five that I never managed to see, and a hidden Betweenness in the report folder. If the Watchlist is the teammate's real pick, I didn't check it.

Single Ease Question: 4 of 7. The table got me there fast once I found it. Telling apart what the teammate *decided* from what they only *ran* was the hard part, and the five-node selection showed nothing on screen.

Would I use this instead of Cytoscape? For poking around, maybe. The table that already has PageRank, a rank column and betweenness side by side, plus the one-line summary, is more than cytoHubba gives me. Seeing "one connected component" on the data page without having to go looking was nice too. But:
- Selecting five nodes and seeing nothing light up on the network is the sort of thing that makes me stop trusting what's on screen.
- Color by one measure and size by another, with no warning, is a mixed message. I'd have to explain it in a figure legend.
- The PageRank gradient is orange to brown, and the light end blends into the default orange. I can't read ranks off it by eye.
- For the paper figure, it's still Cytoscape. Reviewers know it, and I don't know how I'd cite this.
