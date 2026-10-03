# Session: find the circles of characters in Les Miserables -- Grace, nonprofit operations analyst

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program pick out the circles of characters who keep turning up together. Tell us
how many circles it came up with, how big the largest one is, and which character is at its
center."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t08--nonprofit-operations-analyst/.

## Step 1 -- start screen (shots/tasks/r8-t08/01.png)

Think-aloud: "Start, Recent projects, Samples. Les Miserables is right there: 77 characters, 'good
for a first look at communities'. Communities -- I guess that's what they mean by circles. Also
good: 'Files are read on this computer and never uploaded.' I'd want that for donor names. A
usage-data banner covers the bottom. I'll say no and open the sample."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t08 --click "No thanks" --click "Les Miserables"

Render 02: the graph opens, all nodes orange, a "Color: PageRank" box at the top. The left list
already holds a lot: PageRank, "Louvain 6 groups", Shortest paths, Density, Link prediction,
"Top 9 by de...", Watchlist, a "For the report" folder with Group 2 and Group 8, and Betweenness.

Think-aloud: "Whoa, someone's already done a lot here. This is the overload thing. 'Louvain 6
groups' -- I don't know what Louvain is, but '6 groups' sounds like the answer. Then again there's
also 'Group 2' and 'Group 8' under 'For the report'. So are there 6 or 8? They said have the
PROGRAM pick them out, so I want to find the button that does it. The right side says 'Measure
from Analyze', so there's an Analyze somewhere. The toolbar at the bottom is just icons. The first
one looks like a lab flask."

## Step 3 -- try to point at the flask

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t08 --click "No thanks" --click "Les Miserables" --hover "flask"

Result: "nothing on screen is called flask".

Think-aloud: "OK, it's not called flask. The panel said 'Analyze', so I'll guess the flask is
Analyze."

## Step 4 -- open Analyze

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze"

Render 04: an Analyze box with "Search, or say what to find". Under Recent: Louvain, PageRank and
Shortest path. Under "Rank nodes and edges": PageRank (Start here), Degree, Total value,
Betweenness, Closeness, Eigenvector.

Think-aloud: "A box where I can 'say what to find' -- I'd type 'groups' or 'clusters' if I could.
Everything I can see is about ranking, and 'Rank nodes and edges' isn't what I want. Louvain shows
up again under Recent, so whatever Louvain is, it's what made those 6 groups. I'll click it."

## Step 5 -- click Louvain (the first match)

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain"

Result: four things are called Louvain (a tab at the bottom, the row in the left list, the Recent
entry, and one further down the Analyze list saying "Which nodes form densely connected ...").
The click failed.

Think-aloud: "Four things called Louvain. The one lower in the list says 'which nodes form densely
connected' -- that's the one that sounds like what I want. In real life I'd have had to scroll
past the ranking stuff to find it."

## Step 6 -- open the grouping tool

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain Which nodes form densely connect"

Render 06: a Louvain box. "Which nodes form densely connected groups." Weight "value (loaded
weight)", "Higher means: Stronger / Farther / Capacity" with an explanation of each, Resolution
1.0, "Under a second", and two buttons: "Run as copy" and "Update Louvain row".

Think-aloud: "OK, 'densely connected groups', that's my circles. I'm leaving Weight and
Resolution alone. I don't know what they do and nobody asked. The explanations of
Stronger/Farther help a little: bigger number means closer tie, fine. Two buttons. 'Run as copy'
or 'Update Louvain row' -- I don't really care, I just want it to run. The blue one."

## Step 7 -- run it

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain Which nodes form densely connect" --click "Update Louvain row"

Render 07: the right panel says "Updated just now: 6 communities, the same as before". Summary:
"6 communities and no unconnected nodes", Modularity 0.565, "Strong grouping: far more links fall
inside the communities than between them." A Sizes bar chart and a list: Community 1, Hub
Gavroche, 25; Community 2, Hub Valjean, 17; Community 3, Hub Myriel, 10; Community 4, Hub Fantine,
10; Community 5, Hub Thenardier, 9; Community 6, Hub Gillenormand, 6. The left list opened up into
the same six communities with their counts.

Think-aloud: "There it is. Six communities. The biggest is Community 1 with 25 characters, and its
'hub' is Gavroche. I'm taking hub to mean the one at the center. Let me check the counts like I
would against Excel: 25+17+10+10+9+6 = 77, and the sample said 77 characters, plus it says no
unconnected nodes. Good, nobody fell out. The 'strong grouping' sentence is nice, something I
could say to the board. 'Modularity 0.565' I'd ignore.

What bugs me: the map didn't change. It's still all orange, the box still says 'Color: PageRank',
and I can't see the six circles on the picture. For a slide that's the whole point. Also I can't
tell how 'Group 2 14 nodes' and 'Group 8 13 nodes' in 'For the report' relate to these, which
made me doubt the count earlier."

## Answer

- Circles found: 6
- Largest circle: 25 characters (Community 1)
- At its center: Gavroche (listed as the "Hub")

## Wrap-up

- Did I succeed? Yes, I think so. The numbers add up to the whole cast. I'm a little unsure
  whether "hub" means "center" the way you meant it, but I'd bet on it.
- Single Ease Question (1-7): 4. Once I found the right box it was quick and the results panel was
  clear. Getting there meant guessing an unlabeled icon, getting past a screen full of someone
  else's work and a list of ranking tools, and picking between four things called "Louvain". The
  word "groups" or "communities" never showed up as the thing to click; I had to work out that
  Louvain was it.
- Would I use this instead of what I use now (Excel, and wishing for NodeXL)? Maybe, for this part.
  Excel can't do circles at all, the results came with sizes and a center person, and it says
  files never leave my computer. But I'd want the tool listed under a plain name like "Find
  groups" instead of a surname, and the map colored by group so I can put it on a slide. As it
  stands I'd have the numbers and still no picture to show the board.

## Problems noticed

1. The grouping tool is named only "Louvain", with no plain "find groups" label to click. Four
   different controls share that name.
2. The Analyze list opens on ranking tools, and the grouping entry is lower down.
3. The bottom toolbar icons have no visible words; "Analyze" was a guess.
4. After running, the map stayed colored by PageRank, so the groups were not visible on the graph.
5. The sample opens full of earlier work, including "Group 2" and "Group 8" rows that look like a
   competing answer to "how many groups".
6. "Hub" is not explained as "the most central member".
