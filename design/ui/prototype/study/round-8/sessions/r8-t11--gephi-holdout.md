# Session: rearrange Les Miserables so clusters separate -- the Gephi holdout

Participant: Dr. Mara Lindqvist (Gephi holdout persona), 1440x900.
Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. The drawing looks crowded in the middle. Try a different way of arranging the dots so the
clusters are easier to tell apart."

Start screen: shots/tasks/r8-t11/01.png. All commands were run from
design/ui/prototype; D = tmp/round-8-sessions/r8-t11--gephi-holdout.

## Step 1 -- open the sample

Start screen. Usage-data banner along the bottom; I say no to that before anything else. Les
Miserables is under Samples. "77 characters" -- yes, the Knuth graph, 77 nodes, 254 edges. I know
those numbers.

    timeout 120 node app-b/study.mjs --try $D/01.png task:r8-t11 --click "No thanks" --click "Les Miserables"

Render 01: the graph is up, already colored by PageRank, and the left list is crowded with things
someone else made -- Louvain, shortest paths, watchlists, a folder "For the report". I did not ask
for any of this. Where is the layout? In Gephi it is the Layout panel at the lower left. Nothing
in this left list says layout. Bottom of the canvas has five icon buttons, no words. One is a
play triangle -- in Gephi the Run button is a play triangle, so that is my guess.

## Step 2 -- look for "Layout"

Rather than guess an icon I try the word.

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout"

Render 02: the play button was it. A small popover: Motion "Settled" with "Resume layout", Method
"Spread Out", Seed 7. The right panel also switched to a graph summary -- 77 nodes, 254 edges,
undirected. Counts match. Good.

"Spread Out." What algorithm is that? That is not a name. A seed is shown, which I respect.

## Step 3 -- open the method

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out"

Render 03: a big picker. Methods in plain-English names: Spread Out (Recommended), Spread Out
Flat, Ring, Grid, Natural Grouping, No Crossings, Tree, Columns by Group ... with Size and Weights
columns. To the right: Engine "NGraph Force", spring length, gravity -1.2, theta, drag. Ah -- so
"Spread Out" is a family and the engine is the real algorithm. Fine, but I had to dig to learn
that. No ForceAtlas2 in sight yet.

The task is clusters. "Natural Grouping" sounds like the one that groups.

## Step 4 -- try Natural Grouping

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping"

Render 04: it applied right away -- toast "Laid out again: Natural Grouping" with Undo. Engine
reads "Spectral, the only engine for Natural Grouping. Ignores edge weights." So Natural Grouping
is a spectral layout. Calling spectral "natural grouping" is a stretch, but at least it tells me.
And there is an Undo on a layout change, which Gephi never gave me.

The dialog covers the canvas. I press Escape.

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping" --key Escape

Render 05: Escape did nothing except show a tooltip. Annoying. The X then.

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping" --key Escape --click "Close"

Render 06: now I can see it. Five or six tight knots -- the Marius/Enjolras/Courfeyrac students on
the left, Valjean and Cosette on the right, Fantine's group below that, Myriel's group up top, the
Thenardiers and Javert lower right. Long edges between them. The clusters ARE easier to tell
apart. That is the task done, strictly.

## Step 5 -- but where is ForceAtlas2?

For a figure I would not use spectral; reviewers know ForceAtlas2. The force method had an
engine dropdown, so I check it.

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "NGraph Force"

Render 07: NGraph Force, D3 Force, ForceAtlas2, Spring, Kamada-Kawai, Spring Electrical. There it
is -- hidden one level under a method called "Spread Out". I would never have found it if I had not
been looking for it by name.

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "NGraph Force" --click "ForceAtlas2"

Render 08: toast "Laid out again: ForceAtlas2", "Honors edge weights." But the options did not
change: spring length, spring coefficient, theta, drag coefficient, time step. Those are the
other engine's knobs. Where are scaling, gravity, LinLog, prevent overlap, dissuade hubs? Either
these fields are wrong or the parameters are not ForceAtlas2's. I cannot tell which.

    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "NGraph Force" --click "ForceAtlas2" --click "Close"

Render 09: the picture is identical to the one I started with. "Laid out again" -- did it? The right
panel says Method Spread Out, no engine shown. I try to start it running.

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "NGraph Force" --click "ForceAtlas2" --click "Close" --click "Resume layout"

Tool: nothing on screen is called "Resume layout" -- right, it lives in the popover. Open it first.

    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "NGraph Force" --click "ForceAtlas2" --click "Close" --click "Layout"

Render 11: popover again, "Settled", Method Spread Out. No mention of ForceAtlas2 here either.

    timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "NGraph Force" --click "ForceAtlas2" --click "Close" --click "Layout" --click "Resume layout"

Render 12: "Running", Pause layout. The drawing has not moved at all. Same hairball in the middle.
In Gephi I would watch ForceAtlas2 pull it apart. Here, nothing. I stop. For this task I would go
back to Natural Grouping, which visibly worked.

## Verdict

- Succeeded? Yes, by the letter: Natural Grouping (spectral) separated the clusters, with undo.
  The ForceAtlas2 attempt I do not count -- it said it ran and showed me nothing different, and
  its settings were not ForceAtlas2's settings.
- Single Ease Question: 5 of 7. Finding the layout took one guess; picking a method was quick. It
  loses points for names like "Spread Out" and "Natural Grouping" hiding the algorithm, Escape not
  closing the picker, and ForceAtlas2 being buried under another engine with the wrong knobs.
- Would I use this instead of Gephi? No. Undo on a layout is genuinely nice and the seed is shown.
  But "Spread Out" is not a method I can cite, and ForceAtlas2 is three clicks deep with no
  scaling, gravity or LinLog, and changing to it did nothing I could see. I'd stay on Gephi.

## Problems noted, in her words

1. "There is no Layout in the list on the left. I found it only because the play icon is called
   Layout when you ask for it by name." Icon-only bar at the canvas bottom.
2. "Spread Out, Natural Grouping -- what algorithm is that?" The real name (spectral, NGraph,
   ForceAtlas2) is only visible after you pick the method.
3. ForceAtlas2 is an engine under "Spread Out", not a method of its own; a Gephi user hunting for
   it by name has to know to open the engine dropdown.
4. After switching the engine to ForceAtlas2 the options still showed spring length, spring
   coefficient, theta and drag -- not scaling, gravity, LinLog, prevent overlap, dissuade hubs.
5. Toast says "Laid out again: ForceAtlas2" but the drawing did not change, even after Resume
   layout reported Running.
6. The right panel and the popover both say "Method Spread Out" with no engine, so after choosing
   ForceAtlas2 nothing says which algorithm the current positions came from.
7. Escape does not close the layout picker; only the X does.
8. Clicking the play button also flipped the right panel to a graph summary, which I did not ask
   for.

## Delights

- Undo right in the toast after a layout change. Gephi has never had that.
- Seed shown next to the method.
- Node and edge counts (77, 254) visible and correct on first open.
- The method list says the size each is rated for and whether it uses edge weights.
