# Session: Les Miserables sample, find Javert and who he shares chapters with

Participant: the reporter with a contacts sheet (Ruth), first time in the program.

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Go to the police inspector Javert, read what the program knows about him, and see which
characters he shares chapters with."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t12--data-journalist/.

## Start screen (shots/tasks/r8-t12/01.png)

"OK, a start page. Samples on the right, Les Miserables is the first one, 77 characters. Good.
There's a box at the bottom asking to collect usage data. 'We will never see the data you
analyze' -- fine, but I'm not sharing anything from a newsroom machine. No thanks. And I like
'Files are read on this computer and never uploaded' and the 'Local only' lock up top. That's the
first thing I'd check."

## Step 1 -- decline, open the sample

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t12 --click "No thanks" --click "Les Miserables"

"Whoa. That's a lot at once. A network in the middle, labels on maybe fifteen of the dots. Javert
is right there, squeezed next to Valjean, the label half on top of Valjean's. On the left a long
list: PageRank, Louvain, Shortest paths, Density, Link prediction, Watchlist, 'For the report'...
I don't know what most of those are and the task doesn't need them. There's a search box at the
top left, 'Find rows and notes'. I start with a name -- that's what I always do."

## Step 2 -- click the search box

    ... --click "Find rows and notes"   -> 03.png

"Cursor's in it."

## Step 3 -- type Javert

    ... --type "Javert"   -> 04.png

"Typed it. Nothing happened. The list didn't filter, no dropdown. Hm. Maybe it needs Enter."

## Step 4 -- press Enter

    ... --key Enter   -> 05.png

"There we go. Nodes: Javert, 17 neighbors. Then some 'Rows' -- Valjean to Javert, Myriel to
Javert, Watchlist -- and two notes someone already wrote: 'Javert follows Valjean through the
whole book'. Nice that notes are searchable, that's how I'd use it. But why did I have to press
Enter? In every other search box things show up while you type. Also the right side changed to a
summary of the whole graph -- density, components, a log-log chart -- I didn't ask for that.
Anyway: Javert, 17 neighbors. That's my person."

## Step 5 -- click the Javert result

    ... --click "Javert"   -> 06.png  (the tool said five things on screen contained "Javert"; it took the node row, which is what I meant)

"He's selected, there's a ring around him on the map and a little label 'Javert, 17
connections'. The right panel says Javert, Node, and 'Why this look' -- Notes: Label, PageRank:
Color, 'Covers Louvain, Shortest paths, Top 9 by degree...' -- that's about how the dot is
colored. I don't care how the dot is colored, I want to know about HIM. There's a Data tab next
to Style. Let me click Data."

## Step 6 -- click Data

    ... --click "Data"   -> 07.png  (two things are called Data; the tool took the left-hand "Data" button)

"Oops, that took me somewhere else entirely -- the left side is now 'Data Les Miserables', sources,
filters, attributes, and the right is back to the whole-graph summary. My Javert is gone. That's
not what I meant: I meant the Data tab right under his name. Two things called 'Data' on the
same screen."

    ... --click "tab Data"   -> 08.png  ("nothing on screen is called tab Data")
    ... --click "Javert, 17 connections"   -> 09.png  (nothing happened; it is just a label)

"I clicked on the '17 connections' label hoping it would list them. It's just a label."

## Step 7 -- get to the Data tab under Javert's name

    ... --click "Style" --key ArrowRight   -> 10.png

"Got it -- Data tab under Javert. This is what the program knows: from miserables.gexf, id 27,
label Javert, group 4. PageRank 0.0303, number 5 of 77. Degree 17, number 4 of 77. Betweenness
0.0543. Memberships: Watchlist, Valjean to Javert, Myriel to Javert, Top 9 by degree, Group 4.
One note. OK, I can read that. I like '#5 of 77' -- that tells me what it was counted over. I
don't know what PageRank or betweenness mean, and nothing tells me here. And 'group 4' versus
'Group 4' under memberships -- same thing? A different thing? I can't tell.

What I don't see is the actual list of the 17 people he shares chapters with. 'Degree 17'. Fine.
WHO?"

## Step 8 -- try the table

    ... --click "Javert 17 neighbors" --click "Edges"   -> 12.png

"A table opened at the bottom. 254 edges, sorted by value. Cosette-Valjean 31, Marius-Cosette 21...
Javert-Valjean 17, with a note. But it's ALL the edges, not Javert's. I have him selected and the
table ignores that. In a spreadsheet I'd just filter the source column for Javert. I don't see a
way to do that here."

## Step 9 -- hunt through the little toolbar under the selection

There is a row of five icons that appeared under the map when Javert was selected. None have words.
I rested the pointer on them one by one.

    ... --hover "Neighbo"   -> tooltip "Neighborhood G"
    ... --hover "Path"      -> tooltip "Path between P"
    ... --hover "Hide"      -> "Hide Notes" (a list row, not the icon), and "Hide on canvas"
    ... --hover "Add"       -> tooltip "Add note N"
    (several other guesses found nothing: "neighbors", "Select neighbors", "Focus", "Expand selection",
     "Around", "Ego", "Hop", "Connected", "Center", "Isolate", "Within", "Grow", "Step", "Save",
     "Keep", "Pin", "Zoom"; "Select", "Show" and "Group" hit other things on screen)

"That took far too long. Five icons, no words, and the one I needed -- the target one -- is
'Neighborhood'. Fine. Neighbors is what I want."

## Step 10 -- Neighborhood

    ... --click "Neighborhood"   -> 14.png

"A box: 'Neighborhood of Javert. Distance 1 2 3 edge away. Direction: Undirected graph. Covers:
Javert and 17 neighbors.' Two buttons, 'Add as steps' and 'Filter to neighbors'. 'Add as steps' --
no idea. 'Filter to neighbors' sounds like what I want."

## Step 11 -- Filter to neighbors

    ... --click "Filter to neighbors"   -> 15.png

"A message: 'Added filter step: Neighbors of Javert, 1 edge away. Undo.' The top button now says
'18 of 77 nodes'. Javert plus 17, good, that adds up. BUT the map hasn't changed at all -- every
dot is still there, Fantine, Myriel's little cluster, all of it. And the right panel now says
VALJEAN, not Javert. I didn't click Valjean. What just happened?"

## Step 12 -- open the table to read the 18 names

    ... --click "Table"   -> 16.png

"The node table says '18 of 77 nodes' on the left and 'Rows 1 to 77 of 77' on the right. Which
is it? I can see four rows -- Valjean, Gavroche, Marius, Javert -- and the columns say 'Degree
(full graph)'. Is Fantine in this list or not? I can't see more than four rows and it claims 77."

    ... --click "Table" --click "Edges"   -> 17.png

"Edges: 254 edges, rows 1 to 20 of 254. So the edge table is not filtered at all."

## Step 13 -- open the '18 of 77 nodes' button to see what the filter is

    ... --click "18 of 77 nodes"   -> 18.png

"Now it says '40 of 77 nodes'. The left lists filters: 'Degree 2 or more', 'Degree 5 or more',
'group is not 0'. Javert's neighbors aren't in that list at all. The number went from 18 to 40 by
me clicking on it. I have no idea what is filtered any more.

I'm stopping here. If I can't explain to my editor what the number 18 or 40 means, I can't use it."

## Outcome

- Found Javert: yes, through search (after discovering I had to press Enter).
- Read what the program knows about him: yes, eventually -- the Data tab under his name. I could
  read id, group, PageRank rank, degree 17, betweenness, memberships and that there is one note.
- Which characters he shares chapters with: NO. I know there are 17 of them and that Valjean is
  one (17 shared chapters, with a note). I never saw the list of the other names. The neighbor
  filter said 18 nodes, the map still showed everyone, the table said 77 rows, and then the
  filter button said 40.

Did I succeed? Partly. Two thirds. The part that mattered -- the names -- I did not get.

Single Ease Question (1 = very difficult, 7 = very easy): 2.

Would I use this instead of what I use now (a spreadsheet, and I'd been told to try Kumu or
Gephi)? Not as it stands. The search on notes and the 'Local only' / 'never uploaded' promise are
exactly what I want, and '#5 of 77' next to a number is the kind of thing I can put in a story.
But the simplest question I have about any person -- who are they connected to, by name -- took me
a dozen tries and I still don't have the answer, and the numbers on screen contradicted each
other. In a spreadsheet I'd filter one column and have the 17 names in ten seconds.

## Problems I hit (in my words)

1. Search waits for Enter; typing alone shows nothing (04.png).
2. After choosing a search result, the right panel opens on how the dot is colored ("Why this
   look"), not on what is known about the person (06.png).
3. Two different things are called "Data" -- the left-hand Data section and the Data tab under the
   person's name -- and the first one throws away my selection (07.png).
4. "Degree 17" and "17 neighbors" but no list of the 17 names anywhere in the person's panel (10.png).
5. The selection toolbar is five unlabeled icons; finding "Neighborhood" took many tries (step 9).
6. The table ignores the selection: with Javert selected, the edge table still shows all 254 ties
   (12.png).
7. "Filter to neighbors" changed the top count to 18 but the map still shows every character, and
   the selected person silently switched from Javert to Valjean (15.png).
8. Node table header says "18 of 77 nodes" and "Rows 1 to 77 of 77" at once; edge table stays at
   254 (16.png, 17.png).
9. Opening the "18 of 77 nodes" button shows "40 of 77 nodes" and three degree filters, with no
   sign of the Javert neighbor filter I had just added (18.png).
10. PageRank and betweenness are given with no plain explanation of what they count.
