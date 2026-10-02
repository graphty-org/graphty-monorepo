# Session: look up Valjean, then narrow the picture to him and his neighbors -- Gephi holdout

Participant: Dr. Mara Lindqvist (fictional), associate professor, Gephi user since 0.8.
Task as given: "Look up the character Valjean: what is recorded about him, how he stands on the
measures already worked out, and who appears right around him. Then narrow the whole picture to
him and the characters directly around him, so that every number describes only them."

All commands were run from design/ui/prototype. O stands for
tmp/round-7-sessions/t04--gephi-holdout (full path in each command).

## Start screen (shots/tasks/t04/01.png)

"Les Miserables, 77 nodes, colored by PageRank, sized by degree -- the legend says so, good, and
the size scale even says square root of area. There's a tree on the left with PageRank, Louvain,
shortest paths, sets... it's like the Appearance panel and the Filters panel were stacked into one
list. There's a search box, 'Find rows and notes'. Valjean is the big dark node in the middle. In
Gephi I'd just click him, so I click him."

## Step 1 -- click Valjean (01.png)

    timeout 120 node app-b/study.mjs --try O/01.png task:t04 --click "Valjean"

"Right panel now says Valjean, Node, with a Style tab open showing 'Why this look': Notes label
below, PageRank color, Degree size, Group 2 label above, Selection. That's the appearance stack
for this one node, not his data. Fine, but I asked for what's recorded about him. A small strip
says 'Valjean, 36 connections'. 36, that's his degree, matches what I remember. There's a Data
tab next to Style. That's what I want."

## Step 2 -- the Data tab (02.png)

    timeout 120 node app-b/study.mjs --try O/02.png task:t04 --click "Valjean" --click "Data"

"No. That took me to a whole 'Data' screen for the dataset -- sources, filters, attributes -- and
the right panel now describes the whole graph, 77 nodes, 254 edges, density 0.0868. Valjean is
gone from the panel. I wanted his attributes, not the file. Two things on screen are called
Data and I got the wrong one."

## Step 3 -- click Valjean again (03.png)

    timeout 120 node app-b/study.mjs --try O/03.png task:t04 --click "Valjean" --click "Data" --click "Valjean"

"Back on the Graph screen, Valjean selected, Style tab again. I still can't get to his Data tab.
Forget it, I'll do what I'd do in Gephi: go to the table."

## Step 4 -- the table (04.png)

    timeout 120 node app-b/study.mjs --try O/04.png task:t04 --click "Valjean" --click "Table"

"Now this I understand. Data Laboratory at the bottom. label, group, Degree (full graph), PageRank
(full graph), Rank by PageRank, Betweenness (full graph). Valjean: group 2, degree 36, PageRank
0.0754, rank 1, betweenness 0.570. The column headers say 'full graph' -- I like that very much,
that's exactly the thing Gephi never tells you. A line above says Valjean is first on all three
measures. OK, that's the 'how he stands' part.

What's recorded about him: I see label and group. The panel earlier said there's a note on him
('Notes, label below') but I never got to read it. I'll count that as not found."

## Step 5 -- who is around him (05.png)

    timeout 120 node app-b/study.mjs --try O/05.png task:t04 --click "Valjean" --hover "Neighbors"
    -> nothing on screen is called "Neighbors"
    timeout 120 node app-b/study.mjs --try O/05.png task:t04 --click "Valjean" --hover "Ego network"
    -> nothing on screen is called "Ego network"
    timeout 120 node app-b/study.mjs --try O/05.png task:t04 --click "Valjean" --hover "Select neighbors"
    -> nothing on screen is called "Select neighbors"
    timeout 120 node app-b/study.mjs --try O/05.png task:t04 --click "Valjean" --hover "Neighborhood"

"There's a little floating bar of five icons above the bottom toolbar, all icons, no words. In
Gephi this is the Ego Network filter. I guessed three names before 'Neighborhood' turned out to be
the bullseye icon. Icon-only buttons are a guessing game."

## Step 6 -- Neighborhood (06.png)

    timeout 120 node app-b/study.mjs --try O/06.png task:t04 --click "Valjean" --click "Neighborhood"

"A popover: Neighborhood of Valjean, Hops 1 2 3, Direction: undirected graph, 'Selected: Valjean
and his 36 neighbors.' That's depth 1 in the ego filter. More labels showed up on the canvas --
Bamatabois, Mlle. Gillenormand, Thenardier, Claquesous, Montparnasse, Gillenormand. But where is
the list? I want 36 names in a column I can sort, not labels I have to read off a hairball. Also
the tree on the left still says 'Selection 1', while the popover says 37 selected. Which is it?

Two buttons: 'Add as steps' and 'Filter to neighbors'. Filter is what the task says."

## Step 7 -- Filter to neighbors (07.png)

    timeout 120 node app-b/study.mjs --try O/07.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors"

"Top bar now says '37 of 77 nodes', and a message: 'Added filter step: Neighbors of Valjean,
1 hop', with Undo. Good, an Undo -- that I notice. The others are gone, positions stayed put. But
the legend still says PageRank 0.0033 to 0.0754 and size 1 to 36. Are those the old numbers or
the new ones? The task is that every number describes only these 37."

## Step 8 -- check the table after filtering (08.png)

    timeout 120 node app-b/study.mjs --try O/08.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors" --click "Table"

"The table says '77 nodes' while the top bar says 37 of 77. The columns still say 'full graph'.
Gavroche still has degree 22 -- in Valjean's ego network he can't have 22 neighbors, there are
only 37 nodes and he isn't linked to all of them... actually he could, but the header says full
graph, so these are the old values. So nothing was recomputed. At least it's honest about it,
which is more than Gephi, but it didn't do what I need, and the '77 nodes' over the table
contradicts the 37 in the top bar."

## Step 9 -- look for the filter in Data (09.png)

    timeout 120 node app-b/study.mjs --try O/09.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors" --click "Data"

"The Data screen says 'No filters.' and the top bar says 'Full graph' again. 77 nodes. My filter
is gone. I just added it and the moment I look at the Filters list it isn't there. That's
alarming."

## Step 10 -- try the other button, Add as steps (10.png)

    timeout 120 node app-b/study.mjs --try O/10.png task:t04 --click "Valjean" --click "Neighborhood" --click "Add as steps"

"Message: 'Added Neighbors of Valjean, 1 hop: one group per hop.' Group? Steps? Nothing new in
the tree that I can see, Full graph, all 77 back. I don't know what that did."

## Step 11 -- click the '37 of 77 nodes' chip (11.png)

    timeout 120 node app-b/study.mjs --try O/11.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors" --click "37 of 77 nodes"

"What is this? 'Transfers, March 2026', 812 of 3,000 nodes, accounts and transfers CSV, a filter
'amount is at least 1,000'. That's not my data. I clicked my filter and it opened somebody else's
project. If this happened with my own data I would close the tab."

## Step 12 -- re-run the measures with Analyze (12.png, 13.png)

    timeout 120 node app-b/study.mjs --try O/12.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors" --hover "Analyze"
    timeout 120 node app-b/study.mjs --try O/13.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors" --click "Analyze"

"In Gephi I'd re-run Statistics on the filtered graph. The flask is 'Analyze, Shift+A'. It opens a
list: PageRank, Links (count), Betweenness, Closeness, Louvain. Fine. But the top bar says 'Full
graph' again and the right panel says 77 nodes. My filter vanished again. If I run PageRank now
it runs on all 77. Nothing tells me how to run it on the 37."

## Step 13 -- build the filter the long way (14.png, 15.png)

    timeout 120 node app-b/study.mjs --try O/14.png task:t04 --click "Data" --click "Add filter step"
    timeout 120 node app-b/study.mjs --try O/15.png task:t04 --click "Valjean" --click "Data" --click "Add filter step" --click "Neighbors of the selection"

"Filters, plus. The menu has 'Neighbors of the selection -- select one or more nodes first', grayed
out. So I select Valjean first, go to Data, add a step -- still grayed. Going to the Data screen
drops my selection. The two halves of this filter live on two screens that can't see each other."

## Step 14 -- one last look (16.png)

    timeout 120 node app-b/study.mjs --try O/16.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors" --key Escape

"Escape does nothing. I'm stopping. I'd have been done in Gephi by now: Ego Network filter, depth 1,
run Statistics, Data Lab."

## Outcome

Did I succeed? Partly. I found Valjean's standing (degree 36, PageRank 0.0754, rank 1,
betweenness 0.570, group 2) and I got the canvas down to him and his 36 neighbors. I never read
what is recorded about him beyond label and group (the note I never found), I never got the
neighbors as a list, and no number was recomputed for the 37 -- the table still says full graph
and 77 nodes. Every time I went to check the filter or run a measure, the filter was gone, and once
I landed in a different dataset entirely.

Single Ease Question: 2 out of 7.

Would I use this instead of Gephi? No. Two good things: the column headers say "full graph" -- the
one thing I've wanted from Gephi's statistics for ten years -- and filtering has an Undo. But I
couldn't get a single statistic computed on the subset, the filter didn't survive a look at the
Filters list, and clicking the filter count took me to someone else's data. I'd stay on Gephi.
