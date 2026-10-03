# Session: find Javert, read about him, see who he shares chapters with

Participant: the nonprofit operations analyst ("Grace"), first time using the program.
Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Go to the police inspector Javert, read what the program knows about him, and see which
characters he shares chapters with."

All commands were run from design/ui/prototype. `S` below stands for
`timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t12--nonprofit-operations-analyst/NN.png task:r8-t12`
(the full absolute paths were used). Every run starts again from the start screen.

## Start screen (shots/tasks/r8-t12/01.png)

> OK, a home screen. "Files are read on this computer and never uploaded" -- good, I look for
> that. There's a box at the bottom asking to share usage data. I'll say no thanks, I don't
> share anything from the work laptop. On the right, Samples, and Les Miserables is the first
> one, "77 characters". That's the one he said.

## 01 -- open the sample

    S --click "No thanks" --click "Les Miserables"

> Whoa. That's a lot. A big list on the left -- PageRank, Louvain, Shortest paths, Density,
> Link prediction, "For the report"... I don't know what half of that is. The description did
> say "opens with worked examples already added", so I guess someone else's homework is already
> in here. The picture has names on some dots. I can see "Javert" right in the middle, squashed
> against "Valjean". I'll click on Javert.

## 02 -- click "Javert"

    S --click "No thanks" --click "Les Miserables" --click "Javert"

(The tool reported that "Javert" matched two rows in the left list, "Valjean to Javert" and
"Myriel to Javert", and clicked the first. The name on the picture was not something I could
click.)

> Hmm, that's not him. The right side says "Valjean to Javert -- Path -- from Shortest paths".
> 2 nodes, 1 edge, "17 shared chapters". OK, that's actually kind of interesting, those two
> share 17 chapters. But I wanted Javert himself. There's a blue "Javert" link next to "To".
> I'll click that.

## 03 -- click the "To Javert" link

    S ... --click "Valjean to Javert" --click "Javert"

> Wait. It says Valjean now. I clicked Javert and it took me to Valjean? Degree 36, PageRank,
> Betweenness... this is Valjean's page. That's wrong, or I'm misreading it.

## 04 -- try the other Javert link, "Javert ... end"

    S ... --click "Valjean to Javert" --click "Javert end"

> Same thing. Valjean again. Both "Javert" links in that panel take me to Valjean. I'd be
> second-guessing myself at this point. Forget the picture. In Excel I'd just find the row.
> There's a "Table" at the bottom.

## 05 -- open the table

    S --click "No thanks" --click "Les Miserables" --click "Table"

> There we go, a table. 77 nodes -- matches "77 characters" on the start screen, good. Sorted
> by degree. Valjean, Gavroche, Marius, Javert. Javert is 4th, 17 in the degree column.
> There's a little note bubble with a 1 next to him.

## 06 -- click Javert's row

    S ... --click "Table" --click "Javert"

> Now the right side says Javert at the top. Good. And a little label in the picture, "Javert,
> 17 connections". But the panel is showing "Why this look" -- Notes, Label, PageRank, Color,
> "Covers Louvain, Shortest paths...", Size, Opacity. That's about how the dot is drawn. I don't
> care how he's drawn, I want what it knows about him. There's a "Data" tab next to "Style".
> Funny, when I clicked on Valjean before it opened straight to Data.

## 07 -- click "Data" (meant the tab)

    S ... --click "Table" --click "Javert" --click "Data"

(The tool reported two things called "Data": the "Data" button in the left strip and the Data
tab, and clicked the left button.)

> That swapped the whole left side to some Sources/Filters/Attributes thing and Javert is gone
> from the right. Not what I wanted. Two things called "Data" on the same screen.

## 08 -- try to reach the Data tab by name

    S ... --click "Table" --click "Javert" --click "tab Data"

> (Nothing on screen is called that.) This was me trying to be more specific; not something a
> real person would do -- I would just have clicked the tab with the mouse.

## 09 -- click the "Javert, 17 connections" label under the picture

    S ... --click "Table" --click "Javert" --click "Javert, 17 connections"

> I hoped "17 connections" would list the 17. Nothing happened. It's just a label.

## 10 -- go through the path row first so the panel is on Data, then pick Javert

    S ... --click "Valjean to Javert" --click "Table" --click "Javert"

> Still opens on Style. So it doesn't remember which tab I was on.

## 11 -- click the Style tab and arrow over to Data

    S ... --click "Table" --click "Javert" --click "Style" --key ArrowRight

> There. Javert, from miserables.gexf, id 27, label Javert, group 4. Results: PageRank 0.0303,
> "#5 of 77". Degree 17, "#4 of 77". Then "2 more attributes": betweenness 0.0543 and degree 17
> -- degree again? Why is it listed twice? He's in a Watchlist, two shortest paths, "Top 9 by
> degree" and Group 4. One note -- "Open in Notes".
>
> So what does it "know about him"? Honestly, numbers. Nothing in words like "police inspector".
> I don't know what PageRank 0.0303 means. I can tell he's the 4th most connected, which is
> the plain-English one I care about. That part I'd call done.
>
> Now: who does he share chapters with. It says 17 connections, but not who. I'd expect a list
> right here under his name. Next try: the Edges tab in the table.

## 12 -- Edges tab with Javert selected

    S ... --click "Table" --click "Javert" --click "Edges"

> 254 edges, all of them, sorted by value. It didn't narrow down to Javert even though he's
> selected. I can see "Javert -- Valjean 17" in row 5 and that's it. I'd have to go through 254
> rows by hand -- 13 pages of 20. In Excel I'd just filter the column. Let me try the little
> buttons that popped up over the picture when I picked him.

## 13 -- hover the first round button

    S ... --click "Table" --click "Javert" --hover "Neighborhood"

(Tooltip: "Neighborhood G". I had to guess names to find this tooltip. With a real mouse I would
have rested on the bullseye icon and read it.)

> "Neighborhood". OK, that sounds like his circle.

## 14 -- click Neighborhood

    S ... --click "Table" --click "Javert" --click "Neighborhood"

> A box: "Neighborhood of Javert", Distance 1 2 3 "edge away", "Covers: Javert and 17
> neighbors." Buttons "Add as steps" and "Filter to neighbors". Still no names! It knows there
> are 17 -- just show me them. The table also closed on me. "Filter to neighbors" sounds like
> what I want.

## 15 -- Filter to neighbors

    S ... --click "Neighborhood" --click "Filter to neighbors"

> A message: "Added filter step: Neighbors of Javert, 1 edge away". The top button now says
> "18 of 77 nodes" -- 17 plus him, that adds up. But the picture looks exactly the same, every
> dot still there. And now the right side says Valjean, not Javert. The table says "18 of 77
> nodes" in one spot and "Rows 1 to 77 of 77" in another. Which is it? The first four rows are
> the same as before: Valjean, Gavroche, Marius, Javert. Is that the 18 or the 77? I can't tell.

## 16 -- click "18 of 77 nodes" at the top

    S ... --click "Filter to neighbors" --click "18 of 77 nodes"

> Now it says "40 of 77 nodes"! And the filter list has "Degree 2 or more", "Degree 5 or more",
> "group is not 0" -- nothing about Javert. Where did my filter go? I didn't make any of those.
> This is the point where I'd close the laptop.

## 17 -- one last try: Edges tab after the filter

    S ... --click "Filter to neighbors" --click "Edges"

> 254 edges again. The filter did nothing to the edge list. I give up on getting the names.

## Wrap-up

**Did I succeed?** Half. I found Javert (through the table, not the picture) and read his
numbers: 4th most connected with 17 connections, group 4, one note. I could not get a list of
the 17 characters he shares chapters with. The only one I can name is Valjean (17 shared
chapters), and I only know that because I clicked the wrong thing first.

**Single Ease Question (1 = very difficult, 7 = very easy): 2.**

**Would I use this instead of what I use now?** No, not from this. In Excel I'd filter the
source and target columns for "Javert" and have the 17 names in ten seconds. Here the program
told me three times that there are 17 ("17 connections", "17 neighbors", "18 of 77 nodes")
and never once who they are. Clicking a name took me to a different person, and a filter I
made seemed to vanish and get replaced by filters I never made. Things I did like: it said
up front that my files stay on my computer, the node count matched, and "4th of 77" is a
ranking I could explain to my board.

## What got in the way, most serious first

1. The program never lists a character's neighbors by name. The details panel, the
   "Neighborhood" box and the "17 connections" label all give the count only.
2. Clicking "Javert" in the "Valjean to Javert" details (the "To" link and the end of the
   member list) opened Valjean instead.
3. After "Filter to neighbors": the top button says 18 of 77, but the picture still shows
   all 77, the table says "18 of 77 nodes" and "Rows 1 to 77 of 77" at once, the selection
   jumps to Valjean, and opening the filter list shows "40 of 77 nodes" and three degree and
   group filters with no Javert step.
4. Selecting a node in the table did not narrow the Edges tab to that node's edges.
5. A node picked from the table opens on Style ("Why this look"), not on Data. A node reached
   by a link opened on Data. The left strip has a "Data" button next to the "Data" tab.
6. The names on the picture are not clickable, and Javert's label overlaps Valjean's.
7. The sample opens with a long list of prepared analyses (PageRank, Louvain, Link
   prediction...). For a first look, that is a wall of jargon.
8. Degree appears twice in Javert's data, once under Results and again under
   "2 more attributes".
