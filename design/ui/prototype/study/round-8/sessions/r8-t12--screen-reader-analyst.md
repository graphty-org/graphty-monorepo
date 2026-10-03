# Session: Javert in Les Miserables -- screen-reader analyst (Morgan)

Task as given by the moderator: "You have never used this program before. You will practice on
the ready-made network of characters from the novel Les Miserables that comes with the program,
not on your own data. Go to the police inspector Javert, read what the program knows about him,
and see which characters he shares chapters with."

Participant: Morgan Reyes, blind analyst, NVDA and keyboard, NetworkX at work.
Renders: design/ui/prototype/tmp/round-8-sessions/r8-t12--screen-reader-analyst/NN.png
All commands run from design/ui/prototype. Every run replays from the start screen.

## Start screen (shots/tasks/r8-t12/01.png)

Morgan: "Page says graphty. Start, Recent projects, Samples. Good -- there is a line saying files
are read on this computer and never uploaded, and a 'Local only' item at the top. That is the
first thing I ask, and it answered before I asked. There is a usage-data box at the bottom. It
says nothing is collected until I answer. I'll say no thanks. Samples: Les Miserables, 77
characters. That's the one."

## Step 1 -- open the sample

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t12--screen-reader-analyst/02.png task:r8-t12 --click "No thanks" --click "Les Miserables"

Morgan: "It opened. A tree on the left: Selection, Notes 4 items, PageRank, Louvain 6 groups,
Shortest paths, and a lot more someone already ran. A color legend for PageRank. On the right, a
PageRank panel. The drawing is in the middle and I am not going to start there. There is a
'Table' control at the bottom. I'm a table person. Going there."

## Step 2 -- the table

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table"

(tool note: "Table" matched a button and a section; it took the button.)

Morgan: "77 nodes, sorted by degree. Column headers have names: label, Notes, group, Degree (full
graph), Rank by degree (full graph), PageRank (full graph). There's a summary sentence over the
table: Valjean is first on all three measures. Javert is the fourth row: group 4, degree 17,
rank number 4 of 77, PageRank 0.0303, and 1 note. Already more than most tools give me in five
minutes."

## Step 3 -- pick Javert

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert"

Morgan: "Row is selected, the right panel now says Javert, Node. There's a status that says
'Javert, 17 connections', said in words, good. The right panel opens on 'Style' and 'Why this
look' -- which layer paints his color. I did not ask why he is orange. I want his data. There is
a 'Data' tab next to Style."

## Step 4 -- try the Data tab (dead end)

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "Data"

(tool note: "Data" matched a button and a tab; it took the button -- the left-hand section button.)

Morgan: "That was not his data. That moved the whole left side to a 'Data' section about the
file, and the right panel now describes the whole graph: 77 nodes, 254 edges, undirected, density
0.0868, one connected component, average degree 6.60. Honestly, that summary is the overview I
always ask for and nobody gives me. But it's not what I pressed for. There are two things called
'Data' and I cannot tell them apart by name. And Javert is no longer the thing on the right."

## Step 5 -- re-pick Javert

    timeout 120 node app-b/study.mjs --try .../06.png ... --click "Data" --click "Javert"

Morgan: "Clicking Javert again put me back in the Graph section with Javert on the right -- on
Style again. Same wall. Next I'll find the action icons by hovering."

## Step 6 -- learn the tab order, and the icon names

    timeout 120 node app-b/study.mjs --try .../07.png ... --click "Javert" --key Tab
    timeout 120 node app-b/study.mjs --try .../08.png ... --click "Javert" --hover-at 659,520   -> tooltip "Neighborhood G"
    timeout 120 node app-b/study.mjs --try .../09.png ... --click "Javert" --hover-at 700,520   -> tooltip "Path between P"
    timeout 120 node app-b/study.mjs --try .../10.png ... --click "Javert" --hover-at 748,520   -> tooltip "Create set Ctrl+G"
    timeout 120 node app-b/study.mjs --try .../11.png ... --click "Javert" --hover-at 838,520   -> tooltip "Add note N"

Morgan: "Tab from the row jumps to his name in the right panel. Fine, that's predictable. The
icon bar under the drawing has names: Neighborhood, Path between, Create set, Add note. Real
names with keys. 'Neighborhood' is the word I want."

## Step 7 -- Neighborhood

    timeout 120 node app-b/study.mjs --try .../12.png ... --click "Javert" --click "Neighborhood"

Morgan: "A box: 'Neighborhood of Javert', Distance 1, 2 or 3 edges away, Direction undirected,
'Covers: Javert and 17 neighbors.' Two buttons, 'Add as steps' and 'Filter to neighbors'. But the
table I was reading closed when this box opened. I didn't ask for that. I'll take 'Filter to
neighbors'."

## Step 8 -- Filter to neighbors

    timeout 120 node app-b/study.mjs --try .../13.png ... --click "Neighborhood" --click "Filter to neighbors"

Morgan: "Message: 'Added filter step: Neighbors of Javert, 1 edge away', with Undo. Top bar now
says 18 of 77 nodes. The table says '18 of 77 nodes' at the top -- and 'Rows 1 to 77 of 77' on the
right. Which is it? And the right panel now says VALJEAN, not Javert. I did not pick Valjean. Did
the filter change my selection? I've lost who I was on. The rows I can reach: Valjean, Gavroche,
Marius, Javert. That's four of eighteen."

## Step 9 -- try to read the rest of the 18 (two dead ends)

    timeout 120 node app-b/study.mjs --try .../14.png ... --click "Filter to neighbors" --hover-at 1179,633   -> tooltip "Collapse the table Shift+T"
    timeout 120 node app-b/study.mjs --try .../15.png ... --click "Filter to neighbors" --click "Data"
    timeout 120 node app-b/study.mjs --try .../19.png ... --click "Filter to neighbors" --click "Gavroche" --key ArrowDown (x6)
    timeout 120 node app-b/study.mjs --try .../20.png ... --click "Filter to neighbors" --key Shift+T --key Shift+T --key Tab --key ArrowDown (x8)

Morgan: "Going to the Data section to look at the filter: it says 'No filters' and the top bar is
back to 'Full graph'. My filter step is gone. I came back to the Graph side, picked Gavroche in the
list, and arrowed down: the table moves row by row, good, but it's the full 77 again -- picking a
row in the filtered list dropped the filter. Last try: collapse and reopen the table and Tab into
it. Tab went to the 'Analyze' button under the drawing, not into the table. That's two dead ends
in a row. I'm stopping the neighbor list here."

## Step 10 -- what the program knows about Javert (found by keyboard)

    timeout 120 node app-b/study.mjs --try .../16.png ... --click "Javert" --key Tab --key Tab --key Tab --key ArrowRight --key Enter
    timeout 120 node app-b/study.mjs --try .../17.png ... --key Enter --click "Open in Notes"
    timeout 120 node app-b/study.mjs --try .../18.png ... --click "Javert" --click "Edges"

Morgan: "Going back to the Data tab by keyboard instead of by name: Tab three times, right arrow,
Enter, and it's his Data tab. That's how tabs should work. From miserables.gexf: id 27, label
Javert, group 4. Results: PageRank 0.0303, number 5 of 77; Degree 17, number 4 of 77.
Betweenness 0.0543 -- normalized or not? It doesn't say. In my world that is the first question.
Memberships: Watchlist, Valjean to Javert, Myriel to Javert, Top 9 by degree, Group 4. One note.

'Open in Notes' opened all seven notes in the graph, not just his. His is 'Javert follows Valjean
through the whole book. Check whether PageRank ranks them side by side.' Another one on the
Javert--Valjean edge says 'They share 17 chapters.' So the edge 'value' is the shared chapter
count -- I inferred that from a note, the column itself only says 'value'.

The Edges tab gives all 254 edges sorted by value, not just Javert's. Javert--Valjean, 17, is
there. I'd have to page through 254 rows to find his other sixteen."

## Outcome

Did I succeed? Half. I read what the program knows about Javert: his id, group, degree 17,
PageRank and its rank, betweenness, the sets he's in and his note. I know he shares chapters with
17 characters and that Valjean is one of them, 17 chapters. I could not get the list of the other
neighbors read out to me: the filter gave a count, showed four rows I could reach, and disappeared
as soon as I touched anything else. So, no, I did not finish the second half.

Single Ease Question: 2 of 7.

Would I use this instead of my NetworkX scripts? Not yet. `list(G.neighbors("Javert"))` with the
weights is one line and prints all seventeen. What I'd take from here: the whole-graph summary
(nodes, edges, direction, density, components) on the graph's Data tab, the table with ranks in
words, and 'Local only' stated up front. What I'd still take away: two controls both called
'Data'; Javert's panel opening on why he's orange instead of what he is; a betweenness with no
definition; a filter that says 18 and 77 at the same time, changes my selection to Valjean, and
vanishes when I click a row or change section.

## Problems noted (Morgan's words, for the record)

1. Two controls named "Data": the section button and the node's Data tab. By name you get the
   wrong one and lose the node you were on. (severity high)
2. Filter to neighbors: list header says 18 of 77, pager says rows 1 to 77 of 77. (medium)
3. Filter to neighbors switched the right panel from Javert to Valjean without my asking. (high)
4. The filter is gone after clicking a row in the filtered table or visiting the Data section;
   no message said so. (high)
5. No plain list of a node's neighbors with the shared-chapter count; Edges table is not limited
   to the selected node. (high)
6. Opening the Neighborhood box closed the table I was reading. (medium)
7. Node panel opens on Style ("Why this look"), not on the node's data. (medium)
8. Betweenness 0.0543 shown with no statement of normalization; edge column named only "value".
   (medium)
9. "Open in Notes" opens every note in the graph, not the node's one note. (low)
