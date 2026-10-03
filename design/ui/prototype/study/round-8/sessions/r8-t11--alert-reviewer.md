# Session: rearrange the Les Miserables drawing -- Nadia, level-1 alert reviewer

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. The drawing looks crowded in the middle. Try a different way of arranging the dots so the
clusters are easier to tell apart."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t11--alert-reviewer/. D below stands for that folder's absolute path.

## Step 1 -- start screen (shots/tasks/r8-t11/01.png)

"OK, a start page. Les Miserables is on the right under Samples, 77 characters. There is a big
box at the bottom asking about usage data. I say no to these at work by reflex."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t11 --click "No thanks" --click "Les Miserables"

"That is a lot at once. A long list on the left -- PageRank, Louvain, Shortest paths, Density,
Watchlist, Group 2, Group 8 -- I don't know what half of those are. Panel on the right says
PageRank, Orange to brown. The drawing is in the middle, and yes, it is a knot around Valjean.
Nothing on the screen says 'arrange'. There is a little toolbar at the bottom with icons and no
words. I'll rest the mouse on them."

## Step 3 -- reading the icons

    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t11 --click "No thanks" --click "Les Miserables" --hover "Graph"

(Hovered the word Graph on the left first, hoping it explained itself. Nothing useful came up.)

    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t11 --click "No thanks" --click "Les Miserables" --hover-at 660,822
    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t11 --click "No thanks" --click "Les Miserables" --hover-at 708,822
    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t11 --click "No thanks" --click "Les Miserables" --hover-at 748,822
    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t11 --click "No thanks" --click "Les Miserables" --hover-at 789,822
    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t11 --click "No thanks" --click "Les Miserables" --hover-at 838,822

Tooltips: flask = "Analyze", play button = "Layout", cube = "View", list = "Legend",
lightning = "Quick actions".

"The play button is 'Layout'? I would have thought play means start something, like a video. I
only found it because I went across every icon. 'Layout' is close enough to 'arranging' -- I'll
try it."

## Step 4 -- open Layout

    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout"

"Small box: Motion Settled, a Resume layout button, Method 'Spread Out', Seed 7. Seed? No idea.
The Method is the thing that sounds like 'the way it's arranged'. Click it."

## Step 5 -- the method list

    timeout 120 node app-b/study.mjs --try D/10.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out"

"Now there is a big list: Spread Out (Recommended), Ring, Grid, Spiral, Natural Grouping, No
Crossings, Tree, Columns by Group... and on the right a wall of numbers -- Spring length, Gravity,
Theta, Drag coefficient, Batches in flight. I am not touching any of those. The list on the left
I can read. They want the clusters easier to tell apart -- 'Natural Grouping' sounds like exactly
that. 'Columns by Group' maybe too, but 'natural' sounds less like I have to set something up."

## Step 6 -- pick Natural Grouping

    timeout 120 node app-b/study.mjs --try D/11.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping"

"A black message at the bottom: 'Laid out again: Natural Grouping', with Undo. Good, I can take
it back. But the box is sitting on top of the drawing so I can only see the edges of it. I want
it out of the way."

## Step 7 -- try to close it with Escape

    timeout 120 node app-b/study.mjs --try D/12.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping" --key Escape

"Escape did nothing -- the box is still there, and now a little gray note popped over the list
('Rated for up to 2,000 nodes, ignores edge weights, flat'). Whatever. There is an X top right."

## Step 8 -- close with the X

    timeout 120 node app-b/study.mjs --try D/13.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping" --click "Close"

"There. Now it is several tight bunches around the edge: Valjean and Cosette's bunch on the right,
Myriel's at the top, the Courfeyrac / Gavroche / Marius one on the left, Javert and Eponine at the
bottom right, another bunch at the bottom. You can tell them apart now. Lots of long lines across
the middle, but the bunches are clearly separate. The right side says Method: Natural Grouping,
so it stuck. I stop here."

"One thing I would want to know before using it for real: did this change the data, or only the
picture? The message said 'laid out again', which sounds like only the picture, but nothing told
me outright. Also everything is still the same orange, so the bunches are only told apart by
where they sit, not by color."

## Outcome

- Succeeded? Yes, I think so. The bunches are clearly apart now.
- Single Ease Question: 5 of 7. Picking the arrangement was easy once I was in the list; finding
  it was not -- the only way in was an unlabeled play-button icon, and I had to hover every icon
  to find it. Escape not closing the box was a small annoyance.
- Would I use this instead of my current tool? Not instead -- I don't have a graph tool, and most
  of my alerts don't need a picture. For the odd alert where the counterparties matter, maybe,
  if it can go into the alert file as one picture. But I would not want to set this up per
  alert: four clicks plus a hover hunt is a minute I don't have, so it would need to open already
  arranged like this.

## Observations (for the moderator)

- Layout lives behind an icon-only play button; "play" reads as "start/run", not "arrange". Found
  only by hovering every toolbar icon.
- Escape did not close the Layout panel; the X did. The panel covered most of the drawing after
  the change was made, so the result could not be seen until it was closed.
- The method list's plain names (Natural Grouping, Columns by Group) were enough to pick from; the
  numeric options beside them were ignored entirely.
- The "Laid out again ... Undo" message was reassuring, but it did not answer whether the data or
  only the view changed.
