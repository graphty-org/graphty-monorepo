# Session: transactions layout -- Chris, ML engineer (recommendation systems)

Task as given: "With 3,000 accounts the drawing is a smear. Try another way of arranging it that
will not freeze your laptop. The data on screen is a sample: one month of card and bank transfers
between accounts. If that is not your line of work, treat the accounts as your own things
(suppliers, customers, hosts, genes) and the transfers as what passes between them."

All commands were run from design/ui/prototype. D below is
tmp/round-7-sessions/t08-transactions--ml-engineer-recsys (absolute path used in the real runs).

## Start screen (shots/tasks/t08-transactions/01.png)

"A gray hex-binned blob. 3,000 nodes, 9,113 edges, directed, one weak component, max degree 907.
For me these are items and users, and the transfers are interactions. 3,000 isn't even big. The
right panel has real numbers, which I like: density, a log-log degree CCDF. Nothing tells me how
to change the arrangement, though. There's an icon strip at the bottom with no labels."

## Step 1 -- guessing the toolbar

    timeout 120 node app-b/study.mjs --try $D/01.png task:t08-transactions --hover "Run"
    -> nothing on screen is called "Run"

"Okay, not 'Run'."

    timeout 120 node app-b/study.mjs --try $D/02.png task:t08-transactions --hover "Layout"

"The play icon is 'Resume layout'. So the layout is paused. Resuming the same force sim just
wiggles the same blob. I want a *different* layout, not more of this one."

## Step 2 -- Style tab

    timeout 120 node app-b/study.mjs --try $D/03.png task:t08-transactions --click "Style"

"Layout: Method 'Spread Out', Seed 7. A seed field. Somebody here cares about reproducibility,
nice. 'Spread Out' is presumably force-directed. I'll click it."

## Step 3 -- the layout picker

    timeout 120 node app-b/study.mjs --try $D/04.png task:t08-transactions --click "Style" --click "Spread Out"

"This is good. It's a table of methods with Size and Weights columns. Spread Out is 'Any' size,
weights 'By engine', and it's marked Recommended. Spread Out Flat, Natural Grouping and No Crossings
are capped at 2,000 with a clock icon, and I have 3,000, so those are the ones that would freeze
me. I didn't have to read a paragraph to work that out; the column told me. The options pane
on the right has spring length, gravity, theta: Barnes-Hut. Fine."

## Step 4 -- what is Natural Grouping?

    timeout 120 node app-b/study.mjs --try $D/05.png task:t08-transactions --click "Style" --click "Spread Out" --hover "Natural Grouping"

Tooltip: "Rated for up to 2,000 nodes; this graph has 3,000. The canvas stops responding while it
computes, ignores edge weights, flat."

"That's an honest warning with my actual number in it. Respect. But it doesn't say what the method
*is*. Is it spectral? Community-aware force? 'Natural Grouping' is a marketing name. If I knew it
was modularity-based I might filter down to 2,000 and run it. As it is, I'm skipping it."

## Step 5 -- engines

    timeout 120 node app-b/study.mjs --try $D/06.png task:t08-transactions --click "Style" --click "Spread Out" --click "NGraph Force"

"Engines: NGraph Force, D3 Force, ForceAtlas2, Spring, Kamada-Kawai, Spring Electrical. NGraph
says 'Ignores edge weights'. ForceAtlas2 I know from Gephi; it separates communities better. Note
that Kamada-Kawai is all-pairs shortest paths, O(n^2) memory, and on 3,000 nodes that's the one
that would actually hang. Nothing in this menu warns about it, even though the method table
warned about everything else. Inconsistent."

## Step 6 -- pick ForceAtlas2

    timeout 120 node app-b/study.mjs --try $D/07.png task:t08-transactions --click "Style" --click "Spread Out" --click "NGraph Force" --click "ForceAtlas2"

Toast: "Laid out again: ForceAtlas2  [Undo]". Engine note now: "Honors edge weights."

"Good, there's a confirmation and an undo. 'Honors edge weights': which weight? The summary says
'amount, stronger', so I'll assume amount. But the options didn't change. Spring length, theta,
drag coefficient, time step are exactly NGraph's fields. FA2 has scaling ratio, gravity,
LinLog, prevent overlap, edge weight influence. Either those are fake or they're stale from the
last engine. That makes me trust the rest less. And no timing, nothing saying whether this ran on the GPU or the
CPU."

## Step 7 -- closing the dialog to see the result

    timeout 120 node app-b/study.mjs --try $D/08.png task:t08-transactions --click "Style" --click "Spread Out" --click "NGraph Force" --click "ForceAtlas2" --key Escape
    timeout 120 node app-b/study.mjs --try $D/09.png task:t08-transactions --click "Style" --click "Spread Out" --click "NGraph Force" --click "ForceAtlas2" --key Escape --click "Style"
    timeout 120 node app-b/study.mjs --try $D/10.png task:t08-transactions --click "Style" --click "Spread Out" --click "NGraph Force" --click "ForceAtlas2" --click "Close"

"Escape and Close both bring me back to the identical hex blob. It's the same hexes, same shading,
same outliers, and the right panel has jumped back to the Data tab. The Style tab still just says
'Method: Spread Out'. The engine isn't shown, so I can't confirm FA2 stuck. Did Escape cancel it?
Did the layout run and the hexbin just hide it? At this density the picture is a hexbin either way,
so I'm not sure a force layout *can* look different here. It's still a smear."

## Step 8 -- what would undo do?

    timeout 120 node app-b/study.mjs --try $D/11.png task:t08-transactions --click "Style" --click "Spread Out" --click "NGraph Force" --click "ForceAtlas2" --click "Close" --hover "Undo"

"Tooltip: 'Undo Ctrl+Z'. It doesn't say 'Undo layout change', so that's no help."

## Step 9 -- GPU?

    timeout 120 node app-b/study.mjs --try $D/12.png task:t08-transactions --hover "GPU"
    -> nothing on screen is called "GPU"

"The lightning icon might be acceleration, but I'm not going to play twenty questions with unlabeled
icons. I'm done."

## Verdict

Succeeded? Partly. I chose a different, weight-aware layout (ForceAtlas2) that the app rates for
any size, and it confirmed "Laid out again". So I think I did what was asked without freezing
anything. But I can't see a difference on the canvas, the panel doesn't show which engine is
active, and the options looked like they belonged to the previous engine. I'd call it a probable
success that I can't verify.

Single Ease Question: 5 / 7. Finding the picker took one wrong turn (the play button). The picker
itself is the best part of this app so far: the Size and Weights columns and the warning that
quotes my actual node count are exactly the denominator-first honesty I want. I lose points on
everything after the click: no visible change, no record of which engine is active, stale options,
no timing.

Would I use this instead of my current tool? Not for this job. In a notebook I'd run FA2 or UMAP
on embeddings in a few lines and I'd *see* the result. What would win me over is the size and
weight table, plus a "this will freeze" warning that fires for Kamada-Kawai too. Then a
before/after I can actually see, a line like "ForceAtlas2, weights = amount, 3,000 nodes, 1.2 s on
GPU", and a "Natural Grouping" that says what it computes. And honestly, for a smear the right move
is to group or filter first and lay out second. Nothing here suggested that.
