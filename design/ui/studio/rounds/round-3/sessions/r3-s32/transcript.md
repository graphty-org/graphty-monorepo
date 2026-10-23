# Session r3-s32 -- Dev (student with a class project), task T11: untangle the drawing (Les Miserables)

Task as given: practice on the ready-made Les Miserables network that comes with the program, try a
different way of arranging the dots so the clusters of characters are easier to tell apart, and say
whether it helped.

## Start

`node tool/real.mjs --start rounds/round-3/sessions/r3-s32 empty` -> 01.png

Saw: a dark start screen. Three columns: Start (Open project or file..., New from data...), Recent
projects (empty), Samples (Les Miserables 77 characters, Zachary's karate club, College football,
Florentine families). A box at the bottom asks to share usage data. I read it all. Les Miserables is
right there under Samples -- good, that is what the assignment told me to use.

## Step 2

Thinking: first get rid of the usage-data box ("No thanks"), then open the Les Miserables sample.

`node tool/real.mjs --step $S --click "No thanks" --click "Les Miserables"` -> 02.png

Saw: the drawing loaded -- blue balls and gray lines on a light canvas, no names on the dots. Left:
"Graph Les Miserables", a find box, Selection, Everything. Right: Graph panel with Style / Values
tabs, Overview: 77 nodes, 254 edges, density, 1 component. At the bottom a small toolbar with four
icons: a flask, a chart-like icon, "3D", and a magnifier. A note says "Analyze ... in the toolbar
(Shift+A)".

The middle is a dense knot; there is a fan of dots at the bottom and a little group top-left. In my
tutorial the step for this is "Layout" (ForceAtlas 2). I do not see the word Layout anywhere.
Hesitation: which icon is layout? The flask is Analyze (the note says so). The second one looks like
a chart with dots -- maybe that is it.

## Step 3

Thinking: hover the second toolbar icon to see what it is called.

`node tool/real.mjs --step $S --hover-at 728,864` -> 03.png

Saw: tooltip "Layout". Good, that is my tutorial word.

## Step 4

Thinking: click Layout and see what arrangements it offers.

`node tool/real.mjs --step $S --click "Layout"` -> 04.png

Saw: a menu of arrangements. "Force -- Recommended" is ticked (so that is what I am looking at now).
Then Circle, Rings around a node (gray, "Select a node first"), Grid, Rings by group (gray, "Needs a
node attribute to group by"), Spiral, Spectral, No crossings (gray, with a line I did not understand:
'the layout "planar" cannot draw this graph without crossings: G is not planar.' -- what is "planar",
and who is G?), Random, Tree (gray), Two columns (gray), Columns by group (gray), Keep positions.

Hesitation: my tutorial says ForceAtlas 2, which is not listed; I guess "Force" is the same family
and it is already on. "Rings by group" and "Columns by group" sound exactly like what I want
(clusters), but they are grayed out and want "a node attribute to group by" -- I do not have one.
Circle, Grid, Spiral and Random sound like they would mix everybody up. "Spectral" I have never heard
of, but it is the only one that sounds like it might be about structure.

## Step 5

Thinking: try Spectral and see if the groups separate.

`node tool/real.mjs --step $S --click "Spectral"` -> 05.png

Saw: the menu turned into a small Spectral panel: "Places nodes from the graph's own structure, so
densely connected groups land near each other without any grouping being named." "Draws flat".
Scale: 1. Advanced (collapsed). "Under a second". A blue Apply button. The drawing has not changed
yet.

That description is exactly my goal -- "densely connected groups land near each other". Nice that it
explains itself. Scale = 1, no idea what to change, so I leave it.

## Step 6

Thinking: press Apply.

`node tool/real.mjs --step $S --click "Apply"` -> 06.png

Saw: that made it much worse. Almost every dot is now squashed into one tiny ball in the top right
corner, with a short tail of 3 dots going left and 2 dots far down at the bottom. I cannot tell any
groups apart at all; I cannot even see individual dots in the ball. The description promised groups
would "land near each other" -- they landed on top of each other. No message saying anything went
wrong. Maybe the "Scale" number was the problem, but I would not know what to put there.

First wrong try. There is an undo arrow at the top next to the title -- at least there is an undo
(my tutorial warned the other program had none).

## Step 7

Thinking: undo back to the old picture, then think about the "by group" options again.

`node tool/real.mjs --step $S --click-at 165,20` -> 07.png

Saw: the old Force shape came back, but the view did not follow it: the drawing now sits in the top
half and its top is cut off by the edge of the window; the bottom half is empty. Undo worked, but now
I would have to fix the view myself. Hesitation: is this the same drawing as before or a new one?
Looks the same shape (the fan of dots at the bottom is there).

Thinking about the gray options: "Rings by group" / "Columns by group" "need a node attribute to
group by". In my tutorial the step after layout is "detect communities (Modularity) and color by
them". Maybe if I find the communities first, those options will light up. The note at bottom left
says Analyze (the flask) adds results.

## Step 8

Thinking: click the flask (Analyze) and look for communities / modularity.

`node tool/real.mjs --step $S --click-at 680,864` -> 08.png

Saw: a list with a "Filter analyses" box at the top. Heading "Rank nodes and edges": Degree,
Betweenness, Edge betweenness, Closeness, PageRank ("Start here"), Eigenvector, Katz, HITS, All-pairs
distance, Depth-first order (gray), Most flow... it keeps going below. Each has a one-line
explanation, which helps. No "communities" in sight yet; the list scrolls.

## Step 9

Thinking: type my tutorial word "modularity" in the filter box.

`node tool/real.mjs --step $S --type "modularity"` -> 09.png

Saw: the filter understood "modularity" even though neither result has that word in it: under "Find
groups" -- Louvain ("Start here", "Which nodes form densely linked groups.") and Leiden. Great, that
is what I need. I pick the one marked "Start here".

## Step 10

Thinking: click Louvain.

`node tool/real.mjs --step $S --click "Louvain"` -> 10.png

Saw: a Louvain panel: Resolution 1, Advanced, "Under a second", Run. Same pattern as the layout
panel. Leave the number alone.

## Step 11

Thinking: click Run.

`node tool/real.mjs --step $S --click "Run"` -> 11.png

Saw: the dots are colored now -- yellow, light blue, green, dark blue, orange, pink. A key at the top
left of the drawing ("Color: Louvain", Group 1 to Group 6) and in the left list "Louvain 6" with
Group 1 (20), Group 2 (17), Group 3 (11), Group 4 (11), Group 5 (10), Group 6 (8). This is what my
tutorial picture looks like. The pink fan at the bottom is clearly its own group. But in the middle
the colors are all mixed together -- light blue and dark blue sit on top of each other, green is
sprinkled in among yellow. Still cut off at the top of the window.

## Step 12

Thinking: now that I have groups, open Layout again and see if "Rings by group" or "Columns by group"
are available.

`node tool/real.mjs --step $S --click "Layout"` -> 12.png

Saw: my guess was right -- "Rings by group" and "Columns by group" are now white (available). "Two
columns" is still gray with a message in computer language: 'the layout "bipartite" needs exactly
two groups, and "results.louvain.group" names 6'. I get the gist (I have 6 groups, it wants 2), but
"bipartite" and "results.louvain.group" are not words I would use. Same with the "planar"/"G" line.

## Step 13

Thinking: "Rings by group" -- one ring per group sounds like the clusters would be separate. Try it.

`node tool/real.mjs --step $S --click "Rings by group"` -> 13.png

Saw: "Rings by group -- Places each group of nodes on its own ring, around a shared centre." Group
by: "Communities" (already picked for me -- I assume that means the Louvain groups I just made),
Scale 1, Apply. Small thing: "centre" is spelled the British way.

Hesitation: "around a shared centre" -- rings inside rings? Not sure that separates them, but try.

## Step 14

Thinking: Apply.

`node tool/real.mjs --step $S --click "Apply"` -> 14.png

Saw: a big round target. Each color is its own ring: pink in the very middle, then yellow, then
orange, then green, then dark blue, and light blue on the outside. The whole thing fits the window
now (nothing cut off). So yes, the groups are "easier to tell apart" in the sense that each color
sits in its own place. But the lines are a total spiderweb crossing through the middle, the dots got
very small, and the rings are just the order the groups come in -- the drawing no longer shows me
who is close to whom. The pink fan, which used to be an obvious little cluster, is now a tiny circle
hidden under all the lines. Honestly this looks less like my tutorial picture than the first one.

Second try that only half-worked. I will try the one other "by group" option before deciding.

## Step 15

Thinking: Layout -> Columns by group -> Apply.

`node tool/real.mjs --step $S --click "Layout" --click "Columns by group"` -> 15.png

Saw: "Columns by group -- Puts each group of nodes in its own column, in the order the groups are
given." Group by: Communities, Direction: Vertical, Scale 1, Apply.

## Step 16

Thinking: Apply and compare.

`node tool/real.mjs --step $S --click "Apply"` -> 16.png

Saw: six neat vertical columns, one per color: pink (8) on the left, then yellow (the longest), then
orange, green, dark blue, light blue. Lines run between the columns, and a bunch of them fan out of
one yellow dot near the bottom. This is the clearest so far for "which character is in which group":
you can count each group at a glance. Small puzzle: the panel said "in the order the groups are
given", but the columns go pink, yellow, orange, green, dark blue, light blue, while the key goes
Group 1 (yellow) to Group 6 (pink) -- so pink comes first even though it is Group 6. Also there are
still no names on any dot, so I cannot say WHO is in a group without hovering one by one.

I am stopping here: I tried three different arrangements and can answer the question.

`node tool/real.mjs --end $S`

## At the end (in character)

**Did I finish?** Yes, mostly. I found the Layout button, tried Spectral, Rings by group and Columns
by group, and I can say whether it helped: Spectral made it worse (everything collapsed into one
ball), Rings by group put each group in its own ring but turned the lines into a spiderweb, and
Columns by group made the groups easiest to tell apart -- one tidy column per group -- though it
looks more like a chart than a network and you lose who-is-close-to-whom. The thing that actually
made the clusters visible was coloring by groups (Louvain), not the arrangement on its own. For my
essay figure I would probably go back to the first (Force) drawing with the colors on.

**How easy was it, 1 (very difficult) to 7 (very easy):** 4.

**What confused me:**

- The layout I was taught (ForceAtlas 2) is not named; I had to guess "Force" is the same, and it was
  already the one in use, so "a different way" meant picking from words like Spectral that mean
  nothing to me.
- Spectral's description promised groups landing near each other; instead every dot piled into one
  corner with no warning, and nothing told me why.
- The two options that obviously fit "clusters" (Rings by group, Columns by group) were grayed out
  until I had run a community analysis -- the gray note ("Needs a node attribute to group by") did
  not say how to get one. I only knew because my tutorial does communities next.
- Gray notes in computer language: 'the layout "planar" cannot draw this graph without crossings: G
  is not planar' and 'the layout "bipartite" needs exactly two groups, and "results.louvain.group"
  names 6'.
- After Undo the drawing came back cut off at the top of the window and stayed that way.
- Columns came out in an order (pink first) that does not match the Group 1-6 order in the key.
- Good: undo exists, the analysis filter found Louvain when I typed "modularity", every option has a
  plain one-line explanation, and the colors plus the group key appeared on their own.
