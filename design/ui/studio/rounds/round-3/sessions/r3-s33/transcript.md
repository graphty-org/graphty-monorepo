# Session r3-s33 -- Ruth (reporter), task T11: untangle the drawing (Les Miserables)

Task as given: practice on the ready-made Les Miserables network; try a different way of arranging
the dots so the clusters of characters are easier to tell apart, and say whether it helped.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s33 empty` -> 01.png

Saw: a dark start page. Start (Open project or file, New from data), Recent projects (empty), and
Samples on the right: Les Miserables (77 characters) is the first one, "Good for a first look at
communities". At the bottom a box asking to share usage data. I am privacy-minded, so I will say
"No thanks" first, then open Les Miserables.

## Step 2 -- decline usage data

Command: `--step ... --click "No thanks"` -> 02.png
Now I click the Les Miserables sample.

## Step 3 -- open Les Miserables

Command: `--step ... --click "Les Miserables"` -> 03.png

Saw: the network drawn as blue dots and gray lines, no names on the dots. A left panel with a
search box, "Selection" and "Everything". A right panel with Overview numbers (77 nodes, 254
edges). The drawing already has some loose groups (a fan at the bottom, a group at the top left,
one on the right) but the middle is a dense knot. Nothing says "arrange" or "layout" in words.
At the bottom there is a small toolbar with four icons: a flask, a little chart-like icon, "3D"
and a magnifier. The second icon might be the arrangement. I will hover it to see what it is.

## Step 4 -- hover the second toolbar icon

Command: `--step ... --hover-at 728,864` -> 04.png
Printed: button "Layout", tooltip "Layout".

"Layout" -- I think that is the arrangement of the dots. I will click it.

## Step 5 -- open the Layout menu

Command: `--step ... --click "Layout"` -> 05.png

Saw: a menu. "Force" is ticked and marked "Recommended". Others: Circle, Grid, Spiral, Spectral,
Random, Keep positions. Grayed out: "Rings around a node" (select a node first), "Rings by group"
and "Two columns" and "Columns by group" (needs a node attribute to group by), "Tree" (select a
node first), and "No crossings" with a line I do not understand: 'the layout "planar" cannot draw
this graph without crossings: G is not planar.' Who is G? That reads like an error message for
programmers.

Hesitation: "Rings by group" sounds exactly like what I want -- clusters apart -- but it is gray
and says it needs "a node attribute to group by". I do not know if this data has one. I do not know
what "Spectral" is. The plainest choice is "Circle", so I will try that first and see if the
groups separate.

## Step 6 -- pick Circle

Command: `--step ... --click "Circle"` -> 06.png

Saw: nothing moved yet; the menu turned into a small "Circle" panel: "Places every node on one
circle, in the order the nodes were loaded." Shape 3D / 2D, Scale 1, "Advanced", "Under a second"
and an Apply button. Good that it explains itself before doing anything. But "in the order the
nodes were loaded" means it will not put friends next to each other -- that will not separate
clusters. I will go back (the little arrow next to "Circle") and read what Spectral says.

## Step 7 -- back to the list

Command: `--step ... --click-at 555,632` (button "Back to layouts") -> 07.png
Now Spectral, just to read what it is.

## Step 8 -- read Spectral

Command: `--step ... --click "Spectral"` -> 08.png

Saw: "Places nodes from the graph's own structure, so densely connected groups land near each
other without any grouping being named." "Draws flat." That is exactly what I asked for --
groups near each other. I will press Apply.

## Step 9 -- apply Spectral

Command: `--step ... --click "Apply"` -> 09.png

Saw: this is much worse. Almost every dot is crushed into one tiny clump in the upper left, and a
handful of dots are flung far away on long lines (three to the right, two far down). I cannot see
any groups at all now; I cannot even count the dots in the clump. The description promised groups
"near each other", and they are -- all of them, on top of one another. No message told me
anything was off. I will undo (the curved arrow at the top) to get the old drawing back.

## Step 10 -- hover the curved arrow

Command: `--step ... --hover-at 165,20` -> 10.png. Tooltip "Undo Ctrl+Z". Clicking it.

## Step 11 -- undo

Command: `--step ... --click "Undo"` -> 11.png

Saw: the old arrangement came back, but it is no longer framed: the drawing sits in the top half
of the canvas and its top is cut off at the edge, with empty space below. Annoying, but the shape
is the original one.

Thinking: "Rings by group" needed "a node attribute to group by", and the sample's own blurb said
it is "good for a first look at communities". The bottom-left corner says "Analyze (flask) in the
toolbar (Shift+A) to add results here". Maybe Analyze can find the groups, and then "Rings by
group" will unlock. I will click the flask.

## Step 12 -- open Analyze

Command: `--step ... --click-at 679,864` (button "Analyze") -> 12.png

Saw: a long list with a "Filter analyses" box at the top. Under "Rank nodes and edges": Degree,
Betweenness, Edge betweenness, Closeness, PageRank ("Start here"), Eigenvector, Katz, HITS,
All-pairs distance... each with a one-line plain description, which I like. None of these says
"groups". Rather than scroll, I will type "group" into the filter box.

## Step 13 -- filter for "group"

Command: `--step ... --type "group"` -> 13.png

Saw: a "Find groups" section: Louvain ("Start here", "Which nodes form densely linked groups"),
Leiden, Label propagation, Girvan-Newman, Markov clustering, Spectral clustering, Hierarchical
clustering. Names I have never heard of, but "Start here" on Louvain is a helpful nudge. I will
take Louvain.

## Step 14 -- Louvain panel

Command: `--step ... --click "Louvain"` -> 14.png

Saw: a Louvain panel, "Resolution 1" (I do not know what that does; leaving it), Advanced, "Under
a second", Run. Clicking Run.

## Step 15 -- run Louvain

Command: `--step ... --click "Run"` -> 15.png

Saw: the dots are now colored, and the left panel lists "Louvain 6" with Group 1 (20), Group 2
(17), Group 3 (11), Group 4 (11), Group 5 (10), Group 6 (8). A color key box "Color: Louvain" sits
on top of the drawing in the upper left and covers part of it. The pink fan at the bottom is
clearly its own group. But in the middle the groups are still mixed together, and Group 2 (light
blue) and Group 4 (dark blue) are hard to tell apart at this size. The drawing is still pushed up
and cut off at the top.

Now that there are groups, I will go back to Layout and see if "Rings by group" works.

## Step 16 -- Layout menu again

Command: `--step ... --click "Layout"` -> 16.png

Saw: "Rings by group" and "Columns by group" are now available -- running the groups unlocked
them. Nice; that connection was a guess on my part, nothing told me Analyze was the way to get "a
node attribute to group by". "Two columns" is still gray with another programmer line: 'the layout
"bipartite" needs exactly two groups, and "results.louvain.group" names 6'. Clicking "Rings by
group".

## Step 17 -- Rings by group panel

Command: `--step ... --click "Rings by group"` -> 17.png

Saw: "Places each group of nodes on its own ring, around a shared centre." Draws flat. "Group by:
Communities". Small hesitation: the left panel calls my groups "Louvain", here it says
"Communities" -- I assume they are the same thing, since I only made one set of groups. Apply.

## Step 18 -- apply Rings by group

Command: `--step ... --click "Apply"` -> 18.png

Saw: the whole canvas is now a big web of nested rings, one ring per color: pink in the very
middle, gold around it, orange, green, then the two blues on the outer rings. The dots got much
smaller and the gray lines now cross the whole picture in every direction, like a spider web. So
each group is "together" in the sense that it shares a ring, but the rings are inside each other,
so the groups are not side by side; I can only tell them apart by color, which I already could
before. Who is tied to whom is now harder to read than in the first drawing. The color key box
still covers the upper left. This did not help; it is a different kind of mess.

I will try one more: "Columns by group", which might put each group in its own column side by
side.

## Step 19 -- Columns by group panel

Command: `--step ... --click "Layout" --click "Columns by group"` -> 19.png

Saw: "Puts each group of nodes in its own column, in the order the groups are given." Group by
Communities, Direction Vertical. Apply.

## Step 20 -- apply Columns by group

Command: `--step ... --click "Apply"` -> 20.png

Saw: now the six groups stand in six separate vertical columns, side by side: pink (8), gold (20,
the tallest), orange, green, dark blue, light blue. This is the first arrangement where I can
tell the groups apart at a glance and roughly see how big each one is. The lines between columns
show which groups talk to each other -- a lot of lines fan out from one gold dot near the bottom,
which must be a central character. Downsides: the dots inside a column sit on a straight line, so
ties inside a group are hidden along that line, and still no names on any dot, so I do not know
which characters are in which group without hovering each one. The color key still covers the
upper left of the canvas, though here it covers nothing. The two blue columns are next to each
other and similar in color, but being in separate columns makes up for that.

I will stop here: I found an arrangement that separates the clusters.

## End

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s33`

## Debrief (in character, Ruth)

**Did I finish?** Yes, partly by luck. "Columns by group" made the clusters easy to tell apart,
so yes, a different arrangement helped -- but only after I first found the groups myself with
Louvain. Of the arrangements that work without groups, none helped: Circle explained up front that
it ignores who knows whom, so I skipped it, and Spectral crushed nearly every dot into one clump
with a few flung far away, the opposite of what its description promised.

**Ease: 4 out of 7.** Finding "Layout" took one hover. Each arrangement explains itself before it
runs, with an Apply button, and Undo worked. What cost me time was the detour.

**What confused me:**

1. "Rings by group -- needs a node attribute to group by" did not tell me how to get one. I
   guessed that the flask (Analyze) might make groups. Nothing in the Layout menu points there.
2. Spectral promised "densely connected groups land near each other" and gave me one unreadable
   clump plus a few far-away dots, with no warning or hint that it went wrong.
3. After Undo, the old drawing came back but pushed up and cut off at the top of the canvas.
4. Two grayed-out choices show programmer messages: 'the layout "planar" cannot draw this graph
   without crossings: G is not planar' and 'the layout "bipartite" needs exactly two groups, and
   "results.louvain.group" names 6'. I do not know what G, planar or bipartite mean.
5. My groups are called "Louvain" in the left panel and "Communities" in the Layout panel's
   "Group by" box. I assumed they were the same.
6. "Rings by group" put the groups on rings inside each other, not next to each other. The groups
   were only separated by color, which I already had, and the lines turned into a web.
7. The color key box sits on top of the drawing in the upper left and covered dots in the Force
   and Rings drawings.
8. Group 2 (light blue) and Group 4 (dark blue) are hard to tell apart as small dots.
9. No names on any dot, so even with clean columns I cannot say who is in which group without
   hovering each one.
