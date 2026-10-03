# Session: Expert Emma -- rearrange the Les Miserables network so clusters separate

Task as given by the moderator: "You have never used this program before. You will practice on
the ready-made network of characters from the novel Les Miserables that comes with the program,
not on your own data. The drawing looks crowded in the middle. Try a different way of arranging
the dots so the clusters are easier to tell apart."

Participant: Expert Emma (network scientist; notebook user; Gephi for final figures).
Starting screen: shots/tasks/r8-t11/01.png. All renders are in
tmp/round-8-sessions/r8-t11--expert-emma/. All commands were run from design/ui/prototype.

## Step 1 -- start screen, open the sample

Think-aloud: "Top right says 'Local only', and the left column says files are read on this
computer and never uploaded. Good, that is the first thing I look for. A usage-data banner: No
thanks. I would never open a sample normally, but I am told to. Les Miserables, 77 characters."

    timeout 120 node app-b/study.mjs --try .../01.png task:r8-t11 --click "No thanks" --click "Les Miserables"

Saw (01.png): the graph, PageRank coloring, a long left list of prefilled analysis rows
(Louvain, shortest paths, density, watchlists...), a right panel, and a floating icon-only
toolbar at the bottom.

"This is already full of someone else's work. Where is 'Layout'? Nothing in the left list says
layout. The bottom toolbar is five unlabeled icons. I will rest the pointer on them."

## Step 2 -- find the layout control

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t11 --click "No thanks" --click "Les Miserables" --hover "Layout"
    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t11 --click "No thanks" --click "Les Miserables" --hover "Run"

Saw (02.png): the play-triangle icon has the tooltip "Layout". "Run" does not exist.

"Layout is the play triangle. I would have read a play button as 'restart the simulation',
not 'choose a layout'. I only found it because I guessed the word."

## Step 3 -- open Layout

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout"

Saw (04.png): a small popover above the toolbar: Motion "Settled" with "Resume layout",
Method "Spread Out", Seed 7. The right panel switched to the graph summary (77 nodes, 254
edges, undirected, density 0.0868, one component, degree distribution log-log).

"Seed is shown. Good, that is how I get the same picture twice. 'Spread Out' is a marketing
name -- which algorithm is it? Side note: the summary on the right is the first minute of my
usual checks, done for me. Fine."

## Step 4 -- open the method list

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out"

Saw (05.png): a larger Layout dialog: a table of 14 methods with Size and Weights columns
(Spread Out "Recommended", Spread Out Flat, Ring, Rings from a Node, Grid, Concentric Rings,
Spiral, Natural Grouping, No Crossings, Scattered, Tree, Two Columns, Columns by Group, Keep
Positions), and for the current one: Engine "NGraph Force", "Ignores edge weights.", every
parameter (spring length, gravity, theta, drag, time step) and pacing fields.

"Now we are talking. Engine named, parameters exposed, and it admits it ignores edge weights.
This is a weighted co-appearance graph, so I note that -- and the Weights column says 'No' for
almost everything. The names are still cute: I want 'ForceAtlas2', 'Kamada-Kawai',
'spectral', and I have to pick a row to find out what it actually is. For separating
communities I would reach for ForceAtlas2 with LinLog. Nothing is called that. 'Natural
Grouping' sounds like the one meant for clusters. 'Columns by Group' would just put Louvain
groups in columns, which is circular -- the layout would show me what the algorithm already
decided. Natural Grouping first."

## Step 5 -- choose Natural Grouping

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping"

Saw (06.png): the engine field now says "Spectral -- the only engine for Natural Grouping.
Ignores edge weights." with scaling factor, scale, dimensions. A toast at the bottom: "Laid
out again: Natural Grouping" with Undo. The graph behind the dialog has already moved.

"So 'Natural Grouping' is a spectral embedding. Honest once you look, but the name oversells
it -- spectral is not 'natural', it is eigenvectors of the Laplacian. Applied at once, with an
Undo. Good. The dialog covers the picture, though; close it."

## Step 6 -- close the dialog and look

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping" --key Escape
    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping" --click "Close"

Saw (07.png): Escape did NOT close the dialog; a row tooltip ("Rated for up to 2,000 nodes,
ignores edge weights, flat") appeared instead. (08.png): the Close button did. The graph now
shows distinct, well separated blocks: Marius and the students (Courfeyrac, Gavroche,
Enjolras, Bossuet), Valjean and Cosette, Fantine's group, Javert / Eponine / the Thenardiers,
Myriel's group, and a small group at the bottom. The right panel's Layout tab shows Method
Natural Grouping, Seed 7.

"Escape should close a dialog. Every desktop app does that. Annoying, not fatal. The picture:
yes, the blocks are clearly apart now; the middle is no longer soup. I would still not let
anyone read the distances between blocks as meaning anything, and I would want the weighted
version. But the task is done."

## Outcome

- Succeeded: yes. The clusters are clearly separated with the spectral ("Natural Grouping")
  layout, and the method and seed are recorded in the right panel.
- Single Ease Question (1-7): 5. Once I found the Layout button everything was transparent;
  finding it took a guess at a play icon, the method names hide the algorithm until you pick
  one, and Escape did not close the dialog.
- Would I use this instead of my current tool? For this job -- a quick, cleaner picture of a
  small network for a deck -- possibly yes, instead of Gephi: it named the engine, showed every
  parameter and the seed, admitted it ignores weights, and was undoable. Not instead of the
  notebook, and not until a layout respects edge weights, because the graphs I am paid to draw
  are weighted.

## Problems noted (in her words)

1. "The layout button is a play triangle. I read that as 'run the simulation'." (01-02.png)
2. "Method names are marketing: Spread Out, Natural Grouping. Put the algorithm name in the
   list -- ForceAtlas2, spectral -- not only after I choose one." (05-06.png)
3. "Nearly every method ignores edge weights, on a weighted sample. No weighted option for
   cluster separation." (05.png)
4. "Escape does not close the Layout dialog." (07.png)
5. "The dialog sits over the graph, so I cannot see the result of the method I just picked
   without closing it." (06.png)

## What she liked

- "Local only" and "never uploaded" visible on the very first screen.
- Seed shown next to the method; engine named; every parameter visible; "Ignores edge weights"
  stated plainly.
- Applying a method is immediate and comes with Undo.
- The graph summary (counts, density, components, degree distribution) appeared without asking.
