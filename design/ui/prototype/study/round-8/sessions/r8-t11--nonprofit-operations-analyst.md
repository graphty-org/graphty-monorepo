# Session: rearrange the Les Miserables network so clusters separate

Participant: the nonprofit operations analyst (Grace), first-time user.
Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. The drawing looks crowded in the middle. Try a different way of arranging the dots so the
clusters are easier to tell apart."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t11--nonprofit-operations-analyst/ (D below).

## Start screen (shots/tasks/r8-t11/01.png)

"OK, start page. There's a box at the bottom asking about usage data. I'll say no thanks -- I'm
not sharing anything with anybody until I know what this is. Good that it says files are read on
this computer and never uploaded; I'd need that for donor names. Les Miserables is right there
under Samples. Click."

## Step 1 -- dismiss the banner, open the sample

    timeout 120 node app-b/study.mjs --try D/01.png task:r8-t11 --click "No thanks" --click "Les Miserables"

"Whoa. A lot on the left: PageRank, Louvain, Shortest paths, Density, Link prediction... I don't
know most of these words. The picture is orange dots with a knot in the middle around Valjean,
yes, crowded. I'm looking for something that says 'arrange' or 'layout'. Nothing on the left says
that. There's a row of icons at the bottom with no words on them -- a flask, a play button, a
cube, a list, a lightning bolt. No idea. Let me try the word 'Graph' up top."

## Step 2 -- try "Graph"

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Graph"

"Nothing changed. (It seems I clicked the Graph icon on the far left, which I was already on.)
Next to 'Graph' there's 'Co-appearanc...' with a little arrow. Maybe that's the settings for the
drawing."

## Step 3 -- open the "Co-appearances" dropdown

    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Co-appearance"

"A dark menu: Compare graphs, and a grayed-out paragraph about a 'transform API' that means
nothing to me. Not what I want. BUT -- the right side changed. Now it has three tabs: Style,
Layout, Data. Layout! That's the word I was looking for. Shame I only found it by accident; when I
first opened the sample the right side only had Style and Data."

## Step 4 -- close the menu, click "Layout"

    timeout 120 node app-b/study.mjs --try D/04.png --click "No thanks" --click "Les Miserables" --click "Co-appearance" --key Escape --click "Layout"
    (task:r8-t11 was included in every command)

"A small box popped up over the bottom of the drawing called Layout: Motion 'Settled', a 'Resume
layout' button, Method 'Spread Out', Seed 7. I'm not sure if that came from the tab on the right
or from the play icon at the bottom -- the play icon looks pressed now. Anyway. 'Method: Spread
Out' -- that's the current arrangement, I guess. 'Seed'? No idea, leaving it. Click Spread Out to
see what else there is."

## Step 5 -- open the method list

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Co-appearance" --key Escape --click "Layout" --click "Spread Out"

"A big list. Spread Out (Recommended), Ring, Grid, Spiral, Natural Grouping, No Crossings, Tree,
Columns by Group... These are mostly plain words, I appreciate that. On the right a wall of
settings -- Spring coefficient, Theta, Drag coefficient, Batches in flight -- that is way more
than I want, I'm ignoring all of it. Also the drawing vanished behind this box, which made me
nervous for a second. The task says clusters. 'Natural Grouping' sounds exactly like that.
'Columns by Group' might be too but sounds like a spreadsheet. Going with Natural Grouping."

## Step 6 -- choose Natural Grouping

    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Co-appearance" --key Escape --click "Layout" --click "Spread Out" --click "Natural Grouping"

"A message at the bottom: 'Laid out again: Natural Grouping' with Undo. Good, I like an Undo. I
can see clumps of dots behind the box on the left. The box is in the way though."

## Step 7 -- try Escape to close the box

    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Co-appearance" --key Escape --click "Layout" --click "Spread Out" --click "Natural Grouping" --key Escape

"Escape did nothing. The box is still there. Fine, the little X in its corner."

## Step 8 -- close the box with its X

    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Co-appearance" --key Escape --click "Layout" --click "Spread Out" --click "Natural Grouping" --click "Close"

"There it is. Now I can see separate bunches: one around Myriel at the top, one around Valjean
and Cosette on the right, Fantine's group below that, Javert/Eponine/Thenardier at the bottom
right, another at the bottom middle, and the Marius/Gavroche/Enjolras gang on the left. Lines
running between them, but the clusters are clearly apart now. That's what I was asked for. The
dots are all the same orange though, so for a board slide I'd want each group in its own color --
I see 'Louvain 6 groups' on the left with colored dots, maybe that's it, but that wasn't the task
and I don't know what Louvain means."

## Outcome

- Did I succeed? Yes, I think so. The drawing is now in separate bunches instead of one knot.
- Single Ease Question (1 = very difficult, 7 = very easy): 4. Picking the arrangement was easy
  once I found it; finding it was luck. The word "Layout" was nowhere I could see at first; it
  only showed up on the right after I opened an unrelated menu, and the bottom icons have no
  words. The settings wall and a box that Escape would not close cost me more time.
- Would I use this instead of my current tool? Not yet for this. In Excel I can't do this at all,
  so in principle yes -- the list of arrangements in plain words ("Natural Grouping", "Columns by
  Group") is better than anything I've seen. But I'd have to remember the path I stumbled on, and
  I'd need the groups in colors with plain names before it goes on a slide.

## Problems noticed

- No visible "Layout" or "Arrange" control on first open: the right panel showed only Style and
  Data; the bottom toolbar is icons only.
- The Layout tab appeared only after opening the graph-name dropdown, which itself offered
  nothing about arranging and contained a technical grayed-out paragraph ("transform API").
- It was unclear whether the Layout box came from the right tab or the bottom play icon.
- The method list hides the drawing while open, so I could not preview the result.
- Escape did not close the Layout box.
- The settings column (Theta, Drag coefficient, Batches in flight, Seed) is jargon to me.
