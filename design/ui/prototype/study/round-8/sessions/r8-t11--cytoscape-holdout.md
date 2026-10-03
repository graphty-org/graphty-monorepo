# Session: re-arrange the Les Miserables sample so clusters separate -- Renata (Cytoscape holdout)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. The drawing looks crowded in the middle. Try a different way of arranging the dots so the
clusters are easier to tell apart."

Renders are in design/ui/prototype/tmp/round-8-sessions/r8-t11--cytoscape-holdout/. Every command
was run from design/ui/prototype; D stands for that render folder.

## Step 1 -- start screen (shots/tasks/r8-t11/01.png)

"Start, Recent projects, Samples. Les Miserables, 77 characters -- the classic. There's a usage
data banner over the bottom. 'Files are read on this computer and never uploaded' -- good, that's
the first thing I'd ask. I'm saying No thanks to the usage data and opening the sample."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t11 --click "No thanks" --click "Les Miserables"

"OK. A lot already on it -- PageRank coloring, Louvain, shortest paths, notes. Someone's been busy.
It's the usual force-directed hairball, Valjean in the middle. Now, in Cytoscape I go to the
Layout menu in the menu bar. There's no menu bar. There's a hamburger at top left, a 'Full graph'
dropdown, and a little floating toolbar at the bottom with icons I can't read. I'll try the
hamburger first -- that's where File lives."

## Step 3 -- main menu

    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Menu"

(The tool reported "Menu" matched two controls and clicked "Main menu".)

"New project, Open, Save, Export, 'Apply recipe or style file', Version history, Select where,
Settings, Help. No Layout. Fine, it's not a File thing. But the panel on the right changed behind
the menu -- Co-appearances, Graph, and tabs: Style, Layout, Data. There's a Layout tab. I'll close
the menu and click Layout."

## Step 4 -- clicking "Layout"

    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Layout"

"Hm, I got a small Layout box popping up over the canvas from the bottom toolbar, not the tab. The
play icon is apparently 'layout'. Motion: Settled, Resume layout. Method: Spread Out. Seed: 7. A
seed -- that's nice, I can reproduce it. 'Spread Out' is not a name I know. Is that Prefuse? I'll
click it and see what else there is."

## Step 5 -- the method list

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Layout" --click "Spread Out"

"Now there's a proper dialog. Methods with a size limit and whether they use weights: Spread Out
(Recommended), Spread Out Flat, Ring, Rings from a Node, Grid, Concentric Rings, Spiral, Natural
Grouping, No Crossings, Scattered, Tree, Two Columns, Columns by Group, Keep Positions. On the right
the engine for Spread Out is 'NGraph Force', with spring length, gravity, theta, drag -- that's a
Barnes-Hut force layout, Prefuse in my vocabulary. Parameters I can actually read. Good.

But the method names are cute. 'Natural Grouping'? 'No Crossings'? In Cytoscape I'd go for an
edge-weighted spring embedded or yFiles Organic, or Group Attributes if I had a cluster column.
'Columns by Group' might be the group-attributes one. For 'make clusters easier to see' I'd guess
Natural Grouping. Let me rest the pointer on it first."

## Step 6 -- tooltip on Natural Grouping

    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Layout" --click "Spread Out" --hover "Natural Grouping"

(Tooltip: "Rated for up to 2,000 nodes, ignores edge weights, flat".)

"That tells me the size limit, which is already in the column. It doesn't tell me what it does.
I'll just click it."

## Step 7 -- choose Natural Grouping

    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Layout" --click "Spread Out" --click "Natural Grouping"

"Engine: Spectral. 'The only engine for Natural Grouping. Ignores edge weights.' Ah -- so it's a
spectral layout. Should have said so in the list; I'd have found it in one look. It ran straight
away, no Apply button, and a message at the bottom: 'Laid out again: Natural Grouping -- Undo'. An
Undo on a layout. That I want to test. The dialog is covering the canvas, though."

## Step 8 -- try to close the dialog with Escape

    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Layout" --click "Spread Out" --click "Natural Grouping" --key Escape

"Escape does nothing. The dialog stays. There's an X."

## Step 9 -- close with the X

    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Layout" --click "Spread Out" --click "Natural Grouping" --click "Close"

"There. Six or seven tight knots around a ring: the students with Marius and Enjolras on the left,
Myriel's group at the top, Valjean and Cosette right, Fantine's group, the Thenardier/Javert/
Eponine bunch at the bottom, and a little one below. Long edges between the knots, which is what a
spectral layout does. The clusters are easy to tell apart now -- that's the task. Labels still
overlap inside the knots, of course, same as Cytoscape. The right panel now says Method: Natural
Grouping, Seed 7, so the layout is recorded with the graph. Good.

Now my test: Ctrl+Z after a layout."

## Step 10 -- Ctrl+Z

    timeout 120 node app-b/study.mjs --try D/10.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Layout" --click "Spread Out" --click "Natural Grouping" --click "Close" --key Control+z

"'Nothing to undo.' Two screens ago it offered me an Undo button for this exact layout. So the
little message had an Undo, but the real Undo doesn't know about the layout? Either that message
lied or Ctrl+Z is broken. That's the one place you could have beaten Cytoscape, and right now I'd
still save before every layout. I'm stopping here; the arrangement itself is done."

## Wrap-up

- Succeeded? Yes. The Natural Grouping (spectral) layout separates the clusters clearly.
- Single Ease Question: 5 of 7. Finding the layout took a detour (no Layout in the main menu; it is
  an unlabeled play icon on the bottom toolbar, also a tab on the right), the method names hide the
  algorithm until you pick one, and Escape does not close the dialog.
- Would she use this instead of Cytoscape? "Not for client work. The layout dialog is honestly
  better than mine -- parameters visible, a seed, size limits stated. But undo told me 'nothing to
  undo' right after offering me an Undo, and I haven't seen my Node Table or a session file yet.
  For the first hour of the workshop, maybe."

## Observations (her words, condensed)

1. No Layout entry in the main menu; the layout control is an icon-only play button on the canvas
   toolbar. She found it by accident while aiming for the Layout tab.
2. Method names (Natural Grouping, No Crossings, Spread Out) do not name the algorithm; the engine
   (Spectral, NGraph Force) is shown only after choosing. The hover tooltip repeats the size and
   weights columns instead of saying what the method does.
3. Choosing a method runs it immediately -- she liked that, and liked the seed and visible
   parameters.
4. Escape does not close the Layout dialog.
5. Ctrl+Z after a layout says "Nothing to undo", although the toast right after the layout offered
   Undo. Severe for her: undo across layout is her named trust test.
6. The right-hand panel switched from the PageRank row to the graph's own properties when she
   opened the main menu, without her selecting anything -- noticed, not confusing, but unexplained.
