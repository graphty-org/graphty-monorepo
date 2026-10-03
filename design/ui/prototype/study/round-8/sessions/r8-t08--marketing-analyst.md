# Session: find the circles of characters (Les Miserables sample) -- Jordan, marketing network analyst

Task as given: "You have never used this program before. You will practice on the ready-made network of
characters from the novel Les Miserables that comes with the program, not on your own data. Have the
program pick out the circles of characters who keep turning up together. Tell us how many circles it
came up with, how big the largest one is, and which character is at its center."

All commands run from design/ui/prototype. O = tmp/round-8-sessions/r8-t08--marketing-analyst.

## Step 1 -- start screen (shots/tasks/r8-t08/01.png)

"OK. Big privacy box at the bottom asking for usage data. I'm saying no thanks, reflexively. I do like
'Files are read on this computer and never uploaded' and the 'Local only' chip up top -- that's the
legal question answered before I asked it. Fine. Samples on the right, Les Miserables, 77 characters,
'good for a first look at communities'. That's literally my task. Clicking it."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try $O/02.png task:r8-t08 --click "No thanks" --click "Les Miserables"

"Whoa, OK, a lot already here. The map is all orange -- the little box says 'Color: PageRank'. The list on
the left has PageRank, Louvain '6 groups', shortest paths, density, link prediction, a watchlist, 'For the
report'... someone's already done the homework. Louvain I know from Gephi, that's the clustering. It
says 6 groups. But the map isn't colored by the clusters, it's colored by PageRank, so I can't SEE the
circles. That's the first thing I'd want."

"Also 'For the report' has 'Group 2, 14 nodes' and 'Group 8, 13 nodes'. Are those clusters too? Different
numbers from the 6. Parking that."

## Step 3 -- click Louvain

    timeout 120 node app-b/study.mjs --try $O/03.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain"

(The tool noted "Louvain" matched both a bottom tab and the list row; it clicked the tab.)

"A table opened at the bottom: '6 communities', Community 1 is 25, Community 2 is 17, then 10, 10, 9, 6.
Sorted by size, good. So: 6 circles, biggest is 25. Density and edges inside/leaving -- I don't need
those, but fine. Nothing here tells me who's at the middle of each one, though. And 'Community 1' is not a
name I can put in a messaging doc. Map still all orange."

## Step 4 -- click the biggest community

    timeout 120 node app-b/study.mjs --try $O/04.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain" --click "Community 1"

"Right panel: Community 1, Size 25 nodes, Hub: 'Gavroche, 16 links inside'. OK -- that's the answer to
'who's at the center'. And it says HOW: 16 links inside the group. I can say that sentence to someone.
Good."

"But hang on. The table below flipped to all the characters, and there's a 'group' column: Valjean is
'2' with an orange dot, Gavroche is '8' with a BLUE dot. Community 1's dot is orange. So is Gavroche in
the orange one or the blue one? Which 'group' is this column? This is exactly the 'dashboard says 4,000,
download says 3,100' thing. And Valjean -- the main character, top by degree -- if he's the obvious
center of the story, why isn't he the hub of the biggest circle? Maybe he's in a different one. I can't
tell from here."

"'Louvain ranks no members. Show in table.' Let me see who the 25 are."

## Step 5 -- Show in table

    timeout 120 node app-b/study.mjs --try $O/05.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain" --click "Community 1" --click "Show in table"

"That... unselected my community. The right panel went back to the whole graph, the left list collapsed
Louvain, and the table is all 77 nodes, sorted by degree. I wanted the 25 members. That didn't do what
it said."

## Step 6 -- did the program actually pick these out, or did someone type them in?

"The task says have the PROGRAM pick out the circles. This sample came pre-loaded. I want to run it myself
so I know the 6 isn't somebody's hand-made list. There's a flask icon in the little toolbar at the bottom."

    timeout 120 node app-b/study.mjs --try $O/06.png task:r8-t08 --click "No thanks" --click "Les Miserables" --hover "Analyze"

(tooltip: "Analyze Shift+A")

    timeout 120 node app-b/study.mjs --try $O/07.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze"

"A menu. 'Recent: Louvain, last run: Resolution 1.0, weight value'. OK, so it WAS run by the program,
with defaults. That actually reassures me more than anything else on screen. There's no 'Communities'
or 'Find groups' heading I can see -- I see 'Rank nodes and edges' with PageRank, Degree, Betweenness.
If Louvain weren't in Recent I'd have had to search. I'd have typed 'cluster'. Let me open it."

    timeout 120 node app-b/study.mjs --try $O/08.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Last run: Resolution 1.0, weight value"

"'Which nodes form densely connected groups.' Plain enough. Weight, Stronger/Farther/Capacity -- skipping
that, defaults. Resolution 1.0, default. 'Under a second' -- nice, it tells me how long. Two buttons:
'Run as copy' and 'Update Louvain row'. I'm not overwriting somebody's work. Run as copy."

    timeout 120 node app-b/study.mjs --try $O/09.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Last run: Resolution 1.0, weight value" --click "Run as copy"

"A black banner: 'Would add Louvain as a copy at the top of the list, running'. WOULD? So it didn't run.
Nothing new in the list. OK, I'm going with the one that's there -- same settings anyway, it said so."

## Stopping

My answer: **6 circles; the largest has 25 characters; its center is Gavroche (16 links inside the
group).**

Did I succeed? Probably. I'd say 70 percent sure. The numbers came straight off the screen and the hub
came with a reason. What makes me hesitate: the 'group' column said Gavroche is 8, blue, while the big
community is orange; the 'For the report' groups are numbered 2 and 8 with different sizes; and I never
saw the circles on the map, because the map stayed colored by PageRank the whole time. I also couldn't
get the list of 25 members.

Single Ease Question: **4 of 7.** Finding the count and size was fast -- one click. The center was one
more click and nicely explained. Everything after that cost me trust instead of building it.

Would I use this instead of what I use now? "Not yet. Honestly the 'Hub: Gavroche, 16 links inside' line
is better than Brandwatch, which just gives me 'cluster 7' and no why. And 'Local only, never uploaded'
on the first screen is the thing legal would ask about. But I need three things before I switch: the
map colored by the clusters with a key I can paste in a deck, a one-click list of who is IN a cluster
that I can export, and ONE numbering for groups -- not 'Community 1' here and 'group 8' there. Also,
we already pay for Brandwatch; 'a better sentence about the hub' isn't a budget line yet."

Off-topic, said while waiting on step 4: "This is the thing with every tool since Twitter killed the
free API -- half my job now is figuring out which of two numbers is the real one."
