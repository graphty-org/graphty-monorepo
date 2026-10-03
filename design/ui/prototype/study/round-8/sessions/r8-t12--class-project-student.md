# Session: the student with a class project, task r8-t12

Participant: Dev, third-year history student, first time with this program (persona file:
study/personas/class-project-student.md).

Task as given by the moderator: "You have never used this program before. You will practice on
the ready-made network of characters from the novel Les Miserables that comes with the program,
not on your own data. Go to the police inspector Javert, read what the program knows about him,
and see which characters he shares chapters with."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t12--class-project-student/. The prefix
`timeout 120 node app-b/study.mjs --try <dir>/NN.png task:r8-t12` is written as `TRY NN` below.

## Step by step, thinking aloud

### 01 -- start screen (shots/tasks/r8-t12/01.png)

"OK, Start, Recent projects, Samples. Les Miserables is right there at the top of Samples, 77
characters, 'opens with worked examples'. Good, that's what I want. There's a big privacy box at
the bottom asking me to share usage data. I don't want to deal with that, No thanks."

### 02 -- open the sample

    TRY 02 --click "No thanks" --click "Les Miserables"

"Whoa. That's a lot. A picture of dots in the middle, and a long list on the left: Selection,
Notes, Labels, PageRank, Louvain, Shortest paths, Density, Link prediction, Top 9 by degree,
Watchlist, For the report, Group 2, Group 8, Betweenness, Everything. I recognize PageRank and
Betweenness from the Gephi tutorial, so I guess somebody already ran the statistics. I can see
'Javert' written on the picture right next to Valjean. I'll click Javert."

### 03 -- click "Javert"

    TRY 03 --click "No thanks" --click "Les Miserables" --click "Javert"
    (tool: "Javert" matched "Valjean to Javert" and "Myriel to Javert"; clicked the first)

"Hmm, the right side now says 'Valjean to Javert -- Path from Shortest paths'. That's not what I
wanted, I clicked Javert, not a path. But fine, it says 'To Javert' in blue, so that's a link. Also
it says 17 shared chapters between them. Let me click the Javert link."

### 04 -- click the Javert link on the path

    TRY 04 --click "No thanks" --click "Les Miserables" --click "Valjean to Javert" --click "Javert"
    (tool: matched link "To Javert" and link "Javert end"; clicked the first)

"Wait, now it says Valjean. Node. id 11, PageRank 0.0754, Degree 36. I clicked JAVERT. Why is it
showing me Valjean? Did I click the wrong thing?"

### 05 -- try the other Javert link

    TRY 05 --click "No thanks" --click "Les Miserables" --click "Valjean to Javert" --click "Javert end"

"Same thing. Javert down in the Members list, I click it, and I get Valjean again. That's two
tries. What does it want from me? Is Javert even a person here or only part of this path thing?"

### 06 -- open the table

    TRY 06 --click "No thanks" --click "Les Miserables" --click "Table"

"OK, forget the picture. There's a 'Table' button at the bottom. Gephi has the Data Laboratory,
this is probably that. Yes -- a spreadsheet of characters sorted by degree: Valjean 36, Gavroche
22, Marius 19, Javert 17. There he is, fourth."

### 07 -- click Javert in the table

    TRY 07 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert"

"Finally, the right side says Javert, Node. But it is on a 'Style' tab, 'Why this look', with
PageRank Color, Degree Size, Selection, Everything... I don't care why he looks orange. I want to
know about him. There's a 'Data' tab next to Style."

### 08 -- click "Data"

    TRY 08 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "Data"
    (tool: matched the "Data" button on the left rail and the "Data" tab; clicked the first)

"Oops, that changed the whole left side to 'Data Les Miserables', Sources, Filters, Attributes, and
Javert is gone from the right; now it shows the whole graph (77 nodes, 254 edges, density). There
are two things called Data and I hit the wrong one."

Note for the moderator: I meant the Data tab beside Style. The tool cannot pick the second of two
same-named controls, so in 09 to 11 I reached it with the keyboard instead.

### 09, 10 -- trying to get to the tab

    TRY 09 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "tab Data"
    (tool: nothing on screen is called "tab Data")
    TRY 10 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "Javert, 17 connections"

"Clicking the little 'Javert, 17 connections' tag on the picture does nothing."

### 11 -- the Data tab for Javert

    TRY 11 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "Style" --key ArrowRight

"There. Javert: from miserables.gexf, id 27, label Javert, group 4. Results: PageRank 0.0303, #5 of
77. Degree 17, #4 of 77. Two more attributes: betweenness 0.0543, degree 17. Memberships:
Watchlist, Valjean to Javert, Myriel to Javert, Top 9 by degree, Group 4. One note.

Some things confuse me. The table said rank #4 and here PageRank says #5, so I guess PageRank and
degree are different ranks, OK. Valjean had a 'Betweenness #1-#2' row in Results but Javert does
not, the betweenness is hidden under '2 more attributes' instead. And what is 'group 4' -- is that
the same as 'Group 4' in Memberships, and is that the Louvain thing or something from the file? I'd
probably write 'he is in group 4' in my essay and hope."

### 12 -- read the note

    TRY 12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "Style" --key ArrowRight --click "Open in Notes"

"It opened ALL the notes, seven of them, not just Javert's. I have to read through. Here: 'Javert
follows Valjean through the whole book. Check whether PageRank ranks them side by side.' And 'They
share 17 chapters. This is the edge to keep in the pursuit figure.' OK, so Valjean shares 17
chapters with him. That's one character. Now I need the rest."

### 13 -- try the Edges table

    TRY 13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "Edges"

"Edges: source, target, value. 254 edges, 20 per page, sorted by value. 'Javert -- Valjean 17' is
on the first page. But it's every edge in the book, not just Javert's. I'm not paging through 13
pages."

### 14 -- hovering the little toolbar over the picture

    TRY 14 (hover attempts) --hover "Neighbors"   -> nothing on screen is called "Neighbors"
                           --hover "Connections" -> no tooltip
                           --hover "Focus"       -> nothing on screen is called "Focus"
                           --hover "Neighborhood" -> tooltip "Neighborhood G"
                           --hover "Expand"      -> nothing
                           --hover "Path"        -> tooltip "Path between P"

"When Javert is picked there's a little row of icons above the bottom bar. No words, just icons.
Resting on them: one is 'Neighborhood'. That sounds like who is next to him."

### 15 -- Neighborhood

    TRY 15 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "Neighborhood"

"A box: Neighborhood of Javert. Distance 1, 2, 3 edge away. Direction: Undirected graph. 'Covers:
Javert and 17 neighbors.' Good, 17 again. But it doesn't TELL me the 17. Buttons: 'Add as steps'
and 'Filter to neighbors'. Filter to neighbors sounds like it shows only them."

### 16 -- Filter to neighbors

    TRY 16 ... --click "Neighborhood" --click "Filter to neighbors"

"It says 'Added filter step: Neighbors of Javert, 1 edge away. Undo.' The top button says 18 of 77
nodes, and the table says 18 of 77 nodes -- but the table also says 'Rows 1 to 77 of 77', and the
picture still has every dot on it. And the right panel suddenly says Valjean again, not Javert. I
can only see four rows of the table: Valjean, Gavroche, Marius, Javert. I can't tell which 18 these
are."

### 17 -- click the "18 of 77 nodes" button

    TRY 17 ... --click "Filter to neighbors" --click "18 of 77 nodes"

"Now it says 40 of 77 nodes?! The left side shows Filters, '3 steps, 3 on': Degree 2 or more,
Degree 5 or more, group is not 0. My 'Neighbors of Javert' filter isn't in the list at all. I
didn't make any of these. Somebody's filters were already there? And the count went from 18 to 40
just by clicking the button. I have no idea what I'm looking at now."

I stop here. I'd give up and ask the TA.

## Outcome

- Did I succeed? Half. I found Javert and read his card (id 27, group 4, PageRank 0.0303 #5,
  degree 17 #4, betweenness 0.0543, on the Watchlist, in Group 4, one note). I know he shares
  chapters with 17 characters, and the note told me one of them is Valjean (17 shared chapters).
  I never got a list of the other 16 names.
- Single Ease Question: 2 out of 7.
- Would I use this instead of what I use (Gephi from the tutorial)? Not yet. Opening the sample was
  easy and the Javert card is nicer than Gephi's Data Laboratory, because it tells me his rank
  in words. But clicking Javert's name twice gave me Valjean, there are two different things called
  Data, the neighbor filter said 18 then showed me 40 and somebody else's filters, and the picture
  never changed. In Gephi I'd right-click, pick 'select neighbors', and see them light up. If
  'Neighborhood' just listed the 17 names, I'd switch.

## Problems I hit, in my words

1. Clicking "Javert" on the screen picked a Valjean-to-Javert path, not Javert. (03)
2. Clicking the Javert link ("To Javert" / "Javert end") inside the path opened Valjean. (04, 05)
3. Selecting a person opens on the Style tab ("Why this look"), not on what is known about them. (07)
4. Two controls called "Data" (left rail and the tab); I hit the wrong one and lost Javert. (08)
5. "Open in Notes" showed all seven notes, not only Javert's. (12)
6. Edges table is not narrowed to the selected person. (13)
7. The way to see neighbors is an unlabeled icon; I found "Neighborhood" only by hovering. (14)
8. Neighborhood says "17 neighbors" but never names them. (15)
9. After "Filter to neighbors": counts disagree (18 of 77 vs rows 1 to 77 of 77), the picture is
   unchanged, and the right panel jumps to Valjean. (16)
10. Clicking the "18 of 77 nodes" button changed it to 40 of 77 and showed three filters I never
    made; my neighbors filter was not in the list. (17)
11. Betweenness is listed under Results for Valjean but hidden under "2 more attributes" for Javert;
    "group 4" vs "Group 4" vs Louvain is unclear. (04, 11)
