# Session r1-s15 -- Explorer Elena

Task: open the ready-made Les Miserables network, have the program find the circles of characters
who appear together (each circle its own color), then draw every circle's characters as cubes
while keeping each circle's color.

## Start

Command:

    REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3 node /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/design/ui/studio/tool/real.mjs --start /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s15 empty

Output so far: "waiting for a free browser slot ..." (the start queued for a browser).

## Step 1 (01.png -> 02.png)

Saw: a landing page with a big "Open a file" button, "Open network data", "Samples", and a colorful
wiggling picture on the right. "Ooh, pretty dots." Tried the Samples button.

    --step <session> --click "Samples"

Result: "ambiguous: Samples matches 2 controls" -- nothing happened. "Two Samples? I meant the green one."

## Step 2 (03.png)

    --step <session> --click-at 455,540

Result: the Sample library opened. First card: "Who holds the novel together -- Les Miserables -- 77 nodes, 254 edges".
"There it is, top left."

## Step 3 (04.png)

    --step <session> --click-at 183,400

Opened "Les Miserables": 77 blue dots, all the same color. Left panel "Style layers", right panel
numbers (Nodes 77, Density...). A toolbar of icons at the bottom. "OK, it loaded. All blue, though."

## Step 4 (05.png)

    --step <session> --hover-at 615,864

Tooltip "Analyze Shift+A". "That sounds like figuring things out."

## Step 5 (06.png)

    --step <session> --click "Analyze"

A long list opened: Degree, Betweenness, Edge betweenness, Closeness, PageRank, Eigenvector, Katz,
HITS... "Yikes, I don't know any of these words. There's a filter box, I'll type what I want."

## Step 6 (07.png)

    --step <session> --type "group"

The list narrowed to a heading "Find groups": Louvain, Leiden, Label propagation, Markov clustering...
First one already highlighted: "Which nodes form densely linked groups." "Just take the top one."

## Step 7 (08.png)

    --step <session> --click-at 600,455

A small panel "Louvain" with Resolution 1, Weight None, a gear, "Under a second" and a green Run.
"I'm not touching Resolution."

## Step 8 (09.png)

    --step <session> --click "Run"

The dots turned six colors and a legend popped up "Color: Louvain -- Group 1 ... Group 6". A
"Louvain" folder appeared in the left list. "Ooh, OK! The pink ones hanging off the bottom are clearly
the outcasts -- the poor characters, I bet." (my guess; nothing says that)

## Step 9 (10.png)

    --step <session> --click-at 643,612

Clicked the pink dot in the middle of the bottom bunch: it is "Myriel", Group 6, Degree 10. The
whole picture slid over to the right when I clicked. "Why did everything move?"

## Step 10 (11.png)

    --step <session> --click "role=tab:Style"

Style tab for Myriel: Shape +, Visibility +, Text +, Fill +, Effects +, Rendering +. Note on top:
"The first style you set makes a layer for the selected node." Under "Why this look": Selected --
Glow, Halo; Louvain / Group 6 -- Color; Everything -- Size, Shape. "Just this one node? I want all of
them as cubes. 'Everything -- Shape' -- so the shape comes from 'Everything', which is also in the
list on the left. Let me click that."

## Step 11 (12.png)

    --step <session> --click-at 125,248

Right panel now "Everything -- Node and edge layer": "Everything styles all 77 nodes: it is the base
layer, under every other layer." Shape: Icosphere, Size 1. Fill Color 6366F1 "Covered by Group 1,
Group 2, Group 3 and 3 more on 77 of 77". "Icosphere -- that must be the ball."

## Step 12 (13.png)

    --step <session> --click-at 1312,292

A huge list of shapes opened: Pentagonal prism, Square pyramid, Elongated pentagonal cupola, Goldberg
polyhedron, Icosphere (ticked), Rectangle, Diamond, Star... "No cube that I can see."

## Step 13 (14.png)

    --step <session> --type "cube"

Footer of the list: "No option starts with "cube"". The list jumped up to Cylinder, Cone, Capsule,
Torus, Tetrahedron... "No cube?! It has a torus knot but no cube? Maybe it's further up."

## Step 14 (15.png)

    --step <session> --wheel 1300,150,-600

Scrolled the list to the top: "Box" is the very first one, with a little cube icon, then Sphere.
"Oh -- they call it Box. That's a cube."

## Step 15 (16.png)

    --step <session> --click-at 1237,26

Every dot turned into a little square block, and they kept their colors: orange, light blue, green,
dark blue, red-orange, pink, same as the legend. Shape now reads "Box". "There we go. Cubes, and the
groups are still colored."

Stopped here: the task is done. I did not end the session (the facilitator ends it).

## Wrap-up (in character)

- Did I finish? Yes. The Les Miserables network is open, the program found 6 groups ("Louvain",
  Group 1 to Group 6, each its own color), and every character is now a cube with its group color kept.
- Ease: 5 out of 7.
- What confused me:
  - Clicking "Samples" first did nothing because there were two of them (the top link and the green button).
  - The Analyze list is a wall of words I don't know (Betweenness, Katz, HITS). Typing "group" saved me;
    I just took the first one, "Louvain", and left Resolution and Weight alone because I had no idea.
  - Clicking a dot slid the whole picture over. I hadn't asked it to move.
  - The Style tab on a clicked dot said it would only style that one dot. I only found where to change
    ALL of them because the "Why this look" list said "Everything -- Size, Shape", and "Everything"
    was also in the left list.
  - The shape list is enormous (cupolas, bipyramids, Goldberg polyhedron) and it opened scrolled to
    the middle. I typed "cube" and it said "No option starts with cube" -- it's called "Box", at the very
    top, which I only saw after scrolling up.
  - I thought the pink bunch hanging off the bottom were the "outcasts" -- nothing actually told me that.
