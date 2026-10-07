# Session r1-s44b: Alex, task T11 "Untangle the drawing" (Les Miserables)

Participant: Alex, an operations data analyst who uses NetworkX and Gephi. He has never seen this
app. He knows the names ForceAtlas 2 and Fruchterman-Reingold from Gephi tutorials.

Task as given: practice on the Les Miserables sample that comes with the program. Try a different
way of arranging the dots so the clusters of characters are easier to tell apart, and say whether
it helped.

Commands are run from `design/ui/studio` with `S=rounds/round-1/sessions/r1-s44b`.

## Step 1 -- the empty app

`node tool/real.mjs --start $S empty` (waited several minutes for a free browser slot first)
-> 01.png

What I saw: a start page with "Open project or file...", "New from data...", recent projects
(empty) and a Samples column; Les Miserables is first, "77 characters". A box at the bottom asks
to share usage data. "Local only" with a lock in the top bar, and "Files are read on this computer
and never uploaded."

Think-aloud: "Good, the data-stays-here line is right where I would look. I don't share usage data
with tools I haven't vetted. No thanks. Les Miserables is right there, click it."

## Step 2 -- decline usage data, open the sample

`--step $S --click "No thanks" --click "Les Miserables"` -> 02.png

What I saw: the graph drawn in the middle as blue spheres with gray lines. Right panel: Nodes 77,
Edges 254, Undirected, Density 0.08681, Components 1, Edges per node 1 to 36, mean 6.597. A
toolbar at the bottom center with five icons and no labels.

Think-aloud: "77 and 254 -- that matches what I remember from the NetworkX copy, nice. The drawing
is not a complete hairball: I can see a tight group top left, a star bottom left, a clump on the
right. The middle is dense. Now where is the layout? There is no Layout menu in the top bar. The
bottom toolbar has icons only, let me hover them."

## Step 3 -- hover the bottom toolbar

`--step $S --hover-at 659,864`, then 709,864, 749,864, 789,864, 838,864 -> 03.png to 07.png

What was printed:

- 659,864: button "Analyze", tooltip "Analyze Shift+A"
- 709,864: button "Layout", tooltip "Analyze Shift+A"
- 749,864: button "View", tooltip "Layout"
- 789,864: button "Legend", tooltip "View"
- 838,864: button "Quick actions", tooltip "Legend L"

Hesitation: the tooltip I read each time was the one for the icon before. While moving left to
right it looked like the tooltips were one step behind. The button names themselves were right, so
I found "Layout" (the four-arrows icon), but I had to hover all five to be sure.

## Step 4 -- open Layout

`--step $S --click "Layout"` -> 08.png

What I saw: a small popover above the toolbar: "Method: Force - Recommended" and "Seed: 1" with an
x to clear it.

Think-aloud: "OK, a seed, that's reassuring -- same picture every time. It's already on a force
layout. Let's see what else there is."

## Step 5 -- open the Method list

`--step $S --click "Method"` -> 09.png (the tool noted the name matched the label and the select;
it opened the list)

What I saw: Force - Recommended (checked), Force, flat, Circle, Grid, Spectral, No crossings,
Random, Keep positions.

Think-aloud: "No ForceAtlas 2, no Fruchterman-Reingold by name. 'Force, flat' -- I guess the
current one is 3D, the spheres look 3D. A flat force layout is what I'd get in Gephi, try it.
There is no description next to any of these, so I'm guessing."

## Step 6 -- Force, flat

`--step $S --click "Force, flat"` -> 10.png, then `--step $S --wait 5000` -> 11.png

What I saw: the whole graph spread into a big round disc that fills the canvas. Nodes are spaced
almost evenly and every edge crosses the middle. 11.png after waiting 5 seconds is identical, so it
has settled.

Think-aloud: "That's worse. Much worse. It looks like a random layout inside a circle -- the group
at the top left and the star at the bottom are gone, I can't see a single cluster. If this is what
'force' does flat, I don't trust it. Is it still running? No, it stopped. Try something else."

## Step 7 -- Spectral

`--step $S --click "role=combobox:Force, flat" --click "Spectral"` -> 12.png: both missed
("nothing on screen is called ...") -- my mistake naming the select by its value.

`--step $S --click-at 708,768 --click "Spectral"` -> 13.png

What I saw: almost every node piled into one small clump at the bottom center, mostly hidden
behind the layout popover and the toolbar. A few nodes strung out on long lines: one at the very
top, one at mid-left, two to the right. The Seed field disappeared from the popover.

Think-aloud: "Spectral usually separates communities along the eigenvectors, but this is a
pile-up with a couple of outliers flung off. The bit I'd want to see is under the popover. I could
zoom in, but honestly two tries, two worse pictures. Go back to what it started with."

## Step 8 -- back to Force - Recommended

`--step $S --click-at 708,820 --click "Force - Recommended"` -> 14.png

What I saw: exactly the starting drawing again, Seed 1.

Think-aloud: "Good -- at least going back gives me the same drawing, the seed does its job. That
original one was the best of the three. I'm stopping here."

`--end $S`

## Debrief (in character)

- **Did I finish?** Partly. I tried two other arrangements (Force, flat and Spectral) and could
  say whether they helped: neither did, both were worse than the default. I did not find an
  arrangement that made the clusters easier to tell apart than the one it opened with.
- **Difficulty: 4 out of 7.** Finding the layout control took hovering five unlabeled icons, with
  tooltips that seemed to belong to the previous icon. Once the popover was open, switching was
  quick.
- **What confused me:**
  - The method names give no hint of what each is for. I don't know what "Recommended" force is
    against "Force, flat", or whether either is like ForceAtlas 2. One line under each name would
    have saved me two dead ends.
  - "Force, flat" gave what looked like an evenly spread random disc, not a force layout. That made
    me doubt the tool, not the data.
  - Spectral piled the graph under the layout popover and the toolbar, so the result I asked for
    was hidden by the control I used to ask for it.
  - The Seed box appeared for force layouts and vanished for Spectral without saying why.
  - Toolbar icons have no labels; hover tooltips appeared one icon late.
  - Nothing suggested "to see the groups, color by community" -- which is what I would really do
    in Gephi instead of changing the layout. The task asked for layouts, so I didn't go looking.
- **Would I use it for this?** The default drawing was decent and the seed made it repeatable,
  which I like. But if my first try at changing the layout had happened in front of my manager, the
  flat force result would have embarrassed me.
