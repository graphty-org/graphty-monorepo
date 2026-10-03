# Session: r8-t11 -- Explorer Elena

Task given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not
on your own data. The drawing looks crowded in the middle. Try a different way of arranging the
dots so the clusters are easier to tell apart."

Renders are in design/ui/prototype/tmp/round-8-sessions/r8-t11--explorer-elena/.
All commands were run from design/ui/prototype. D below stands for that renders folder.

## Step 1 -- start screen (shots/tasks/r8-t11/01.png)

Think-aloud: "OK, a start page. There is a big privacy box at the bottom asking me to share usage
data -- I'm saying no thanks, I don't want to think about that now. On the right are samples,
Les Miserables is the first one. Easy, I'll click it."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t11 --click "No thanks" --click "Les Miserables"

Saw (02.png): the network, orange dots, a dense knot around Valjean and another down by Marius and
Enjolras. A long list on the left: Selection, Notes, PageRank, Louvain, Shortest paths, Density,
Link prediction, groups... A panel on the right about "PageRank", fill color, shape.

Think-aloud: "Whoa, that's a lot of stuff already in here. PageRank, Louvain -- I don't know what
those are. Yes, the middle is a tangle. I want to rearrange it, but nothing on the left says
'arrange' or 'layout'. There's a little floating toolbar at the bottom with icons only. Let me
rest my pointer on them."

## Step 3 -- hover the toolbar icons

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t11 --click "No thanks" --click "Les Miserables" --hover "Layout"

Saw (03.png): the second icon, a play triangle, shows the tooltip "Layout".

Think-aloud: "Huh. The play button is called Layout. I'd have thought play means 'animate' or
'start a presentation'. I would not have clicked that by myself without the tooltip. But Layout is
the word I want, so let's go."

## Step 4 -- click Layout

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout"

Saw (04.png): a small box over the drawing: "Layout -- Motion: Settled, Resume layout -- Method:
Spread Out -- Seed: 7". The right panel switched to a summary of the network (77 nodes, 254 edges,
density, a degree chart).

Think-aloud: "Method: Spread Out. That's the current way it's arranged, I guess. 'Seed 7' I don't
know and won't touch. 'Resume layout' -- resume what? It says settled. I'll click on 'Spread Out'
to see what else there is."

## Step 5 -- open the method list

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out"

Saw (05.png): a wide box with a list of methods: Spread Out (Recommended), Spread Out Flat, Ring,
Rings from a Node, Grid, Concentric Rings, Spiral, Natural Grouping, No Crossings, Scattered, Tree,
Two Columns, Columns by Group, Keep Positions. Columns Size and Weights. On the right a pile of
fields: Engine "NGraph Force", Spring length, Gravity -1.2, Spring coefficient, Theta, Drag
coefficient, Time step, Pre-steps, Steps per frame, Stop threshold, Batches in flight...

Think-aloud: "OK, the left list I can read -- most of these names make sense to me. The right half
is physics homework. Gravity is negative? Theta? I'm not touching any of that; that's the bit that
makes me feel this tool isn't for me. But 'Natural Grouping' -- that literally sounds like 'put the
groups together', which is what I was asked. 'Columns by Group' is maybe also it, but natural
sounds less weird. Trying Natural Grouping."

## Step 6 -- pick Natural Grouping

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping"

Saw (06.png): the checkmark moved to Natural Grouping, a message at the bottom "Laid out again:
Natural Grouping -- Undo". The right side changed to Engine "Spectral", Scaling factor, Scale,
Dimensions. Behind the box I could see the dots had moved -- a clump on the left with Courfeyrac,
Gavroche, Marius.

Think-aloud: "Good, it did something right away and it tells me I can undo. Nice. But the box is
sitting on top of my drawing so I can't actually see the result. Let me get rid of it."

## Step 7 -- try to close with Escape

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping" --key Escape

Saw (07.png): the box is still there. Escape did nothing except a tooltip appeared over the list
("Rated for up to 2,000 nodes, ignores edge weights, flat").

Think-aloud: "Escape didn't close it. Annoying. Fine, there's an X in the corner."

## Step 8 -- close with the X

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping" --click "Close"

Saw (08.png): the drawing now shows about seven separate clumps spread around a big circle: Marius,
Gavroche, Courfeyrac and the students on the left; Myriel at the top right; Valjean and Cosette on
the right; Fantine's group below that; Javert, Eponine and the Thenardiers at the bottom; another
small clump at the bottom; a few loners. Long gray lines cross the middle between the clumps. The
right panel says Layout, Method: Natural Grouping.

Think-aloud: "Oh, now that's much better. I can actually see bunches: the students, Valjean's
people, the Thenardiers. The middle is empty except for lines between groups. That's what I was
asked for. The lines crossing the middle are a bit of a spider web, but the clusters are clearly
apart. I'm done."

## After the task

- Did I succeed? Yes. The clusters are clearly separate now and I could tell which characters are
  in which bunch.
- Single Ease Question (1 = very difficult, 7 = very easy): 5. Finding it took a hover because the
  button for arranging is a play icon with no word on it, and the method box is half full of
  scary physics settings and covered my drawing; Escape did not close it. But once I found the
  list, "Natural Grouping" was an obvious name and it worked in one click with an Undo.
- Would I use this instead of what I use now? Maybe, for this kind of thing. I don't have a real
  tool for networks -- I gave up on Gephi at the installer -- and this ran in the browser and
  rearranged the picture in one click, which beats anything I've tried. What holds me back is how
  much is on the screen when it opens (PageRank, Louvain, Link prediction, Seed, Theta, Drag
  coefficient...). It feels built for someone else, and I'd worry I'd break something. If the
  first screen were calmer and the arrange button said "Arrange" I'd be much more comfortable.

## Notable moments (participant's words)

- "The play button is called Layout. I'd have thought play means animate."
- "The right half is physics homework. Gravity is negative? Theta?"
- "'Natural Grouping' literally sounds like 'put the groups together'."
- "The box is sitting on top of my drawing so I can't see the result." / "Escape didn't close it."
- "Resume layout -- resume what? It says settled."
