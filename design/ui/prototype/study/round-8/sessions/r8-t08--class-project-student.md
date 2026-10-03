# Session: the class-project student finds the circles of characters in Les Miserables

Participant: the class-project student (Dev), first time in the program.
Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program pick out the circles of characters who keep turning up together. Tell us
how many circles it came up with, how big the largest one is, and which character is at its
center."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t08--class-project-student/.

## Step 1 -- the start screen (shots/tasks/r8-t08/01.png)

Think-aloud: "OK, reading all of it. Start: Open project or file, New from data. Recent projects
is empty. Samples on the right -- Les Miserables, 77 characters, 'Good for a first look at
communities and who holds the story together.' Communities -- that's the word from the Gephi
tutorial, good sign. There's a big privacy box at the bottom asking to share usage data. I'll say
No thanks, then click Les Miserables."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t08 --click "No thanks" --click "Les Miserables"

Think-aloud: "Whoa, lots going on. A network in the middle, all orange, a key that says 'Color:
PageRank'. On the left there's a list: Selection, Notes, Labels, PageRank, Louvain 6 groups,
Shortest paths, Density, Link prediction, Top 9 by degree, Watchlist, For the report with Group 2
and Group 8... The blurb said it opens with worked examples already added, so I guess someone
already did stuff. I don't know what 'Louvain' is. But it says '6 groups' and groups is what I
want. Is that already the answer? The task says to have the program pick them out -- I'm not sure
if I'm allowed to just read somebody else's. Let me look at it first. There's a 'Louvain' at the
bottom too, next to Nodes and Edges."

## Step 3 -- the Louvain tab at the bottom

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain"

(The tool noted the name matched both the bottom tab and the left list row; the bottom tab opened.)

Think-aloud: "A table: '6 communities'. Community 1 size 25, Community 2 size 17, then 10, 10, 9,
6. Density, edges inside, edges leaving. So 6 circles and the biggest is 25. But nothing says who
is at the center. Maybe clicking Community 1 tells me."

## Step 4 -- click Community 1

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain" --click "Community 1"

Think-aloud: "The right side changed: Community 1, Size 25 nodes, Hub: 'Gavroche, 16 links
inside'. Hub, I guess that's the center? But wait, the table at the bottom flipped to all the
characters, and there's a 'group' column where Valjean is group 2 with an orange dot and Gavroche
is group 8 with a BLUE dot. Community 1 is orange. So is Gavroche in the orange one or the blue
one? And on the left 'For the report' has Group 2 and Group 8 too. Now I have communities AND
groups with different numbers and the colors don't line up. That's confusing. Also the picture is
still all orange -- nothing is colored by circle, which is what I expected from the tutorial."

## Step 5 -- click the hub name

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Gavroche, 16 links inside"
    (forgot the earlier steps -- "nothing on screen is called ..."; reran with all steps:)
    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain" --click "Community 1" --click "Gavroche, 16 links inside"

Think-aloud: "It selected Gavroche in the picture, down at the bottom near Marius and Enjolras.
'Gavroche, 22 connections.' 22? It said 16 a second ago. Oh, 16 inside the circle, 22 total I
guess. Fine. But I still don't trust that I 'had the program pick out' anything -- it was all
there already. My tutorial says you run Modularity yourself under Statistics. Let me find where
you run things."

## Step 6 -- the flask button

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t08 --click "No thanks" --click "Les Miserables" --hover "Analyze"
    (tooltip: "Analyze Shift+A")

Think-aloud: "The little flask at the bottom says Analyze. That's like Statistics."

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze"

Think-aloud: "A list: Recent -- Louvain, PageRank, Shortest path. Then 'Rank nodes and edges':
PageRank (Start here), Degree, Total value, Betweenness, Closeness, Eigenvector. No 'Modularity'
that I can see. There's a search box, 'Search, or say what to find'. I'll type modularity."

## Step 7 -- search "modularity"

    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "modularity"

Think-aloud: "It found it! 'Find groups -- Louvain -- Which nodes form densely connected groups.'
So Louvain is the modularity thing. Good that searching my tutorial word worked; I wouldn't have
guessed the name Louvain."

## Step 8 -- open Louvain

    timeout 120 node app-b/study.mjs --try .../09.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "modularity" --click "Which nodes form densely connected groups."

Think-aloud: "Options: Weight 'value (loaded weight)', Higher means Stronger / Farther / Capacity,
Resolution 1.0. I don't know what any of that means really, so I'll leave the defaults -- my
tutorial left Resolution at 1.0 too. Two buttons: 'Run as copy' and 'Update Louvain row'. Hmm,
'row'? I just want to run it. The blue one is the big one, so: Update Louvain row."

## Step 9 -- run it

    timeout 120 node app-b/study.mjs --try .../10.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "modularity" --click "Which nodes form densely connected groups." --click "Update Louvain row"

Think-aloud: "'Updated just now: 6 communities, the same as before.' OK so I ran it and got the
same as the worked example -- that makes me trust it more. Summary: 6 communities, Modularity
0.565, 'Strong grouping'. I can quote that in the essay. Sizes: a little bar chart and a list --
Community 1, Hub Gavroche, 25. Community 2 Hub Valjean 17. Community 3 Hub Myriel 10, Community 4
Hub Fantine 10, Community 5 Hub Thenardier 9, Community 6 Hub Gillenormand 6. That's exactly what
I need, all in one place.

Weird though: Valjean is the main character and the darkest dot, but he isn't the center of the
biggest circle -- Gavroche is. I'd double-check that with my professor, but the program says it
plainly, so I'll go with it.

What bugs me is the picture. It's STILL all orange, 'Color: PageRank'. In Gephi you run
modularity and then color by it. I can't screenshot this for my report because you can't see
the circles. I don't know how to switch the coloring to the communities -- I'm stopping here
because the question was the numbers, not the figure."

## Answer given

6 circles. The largest has 25 characters. Gavroche is at its center (the program calls him the
"hub", 16 links inside the circle).

## Debrief

- Succeeded? Yes, I think so. Running it myself gave the same 6 as the example, and the hub list
  answers the "center" part directly.
- Single Ease Question: 5 of 7. Finding the numbers was easy once I found the right panel; what
  cost me was not knowing the word Louvain, the "group" column and "Group 2 / Group 8" that use
  different numbers and colors from the communities, and the picture not changing color.
- Would I use this instead of my current tool (Gephi, from the tutorial)? Maybe. Searching
  "modularity" and getting the right thing, plus a plain list of hubs and sizes, is nicer than
  Gephi's statistics report. But I judge things by the figure, and after running communities the
  figure still showed PageRank colors. If I can't get a colored-by-circle picture for my report
  easily, I'd go back to Gephi for that part.
