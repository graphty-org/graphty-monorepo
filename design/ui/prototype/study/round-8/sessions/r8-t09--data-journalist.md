# Session: size characters by how much the network depends on them -- Ruth, the reporter

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Make the drawing show which characters the network depends on most: the more it depends on a
character, the bigger that character's dot. Leave the colors as they are."

Start screen: shots/tasks/r8-t09/01.png. Renders: tmp/round-8-sessions/r8-t09--data-journalist/.
All commands were run from design/ui/prototype; P below stands for
`tmp/round-8-sessions/r8-t09--data-journalist`.

## Step 1 -- start screen, open the sample

Thinking aloud: "Usage data banner. No, thanks -- I don't let anything phone home. Samples on the
right, Les Miserables is first. Fine."

    timeout 120 node app-b/study.mjs --try P/01.png task:r8-t09 --click "No thanks" --click "Les Miserables"

Saw: the graph, all dots the same size, all orange. A long list on the left: PageRank, Louvain,
Shortest paths, Density, ... and under "For the report" a row called Betweenness with a crossed-out
eye. A legend top left says "Color: PageRank". Right panel shows PageRank, "Paints 77 nodes".

"So somebody already did work here. 'Depends on most' -- for me that is the person who sits in the
middle of many chains, the go-between. Of these words, 'Betweenness' sounds most like that. I'll
look at it."

## Step 2 -- open the existing Betweenness row

    timeout 120 node app-b/study.mjs --try P/02.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness"

Saw: right panel "Betweenness, Measure from Analyze", "Covered by PageRank for Color", a "Move
above" button, "Paints 77 nodes, none visible", Fill Color "Yellow to orange", then Shape,
Effects, Label, Tooltip each with a plus.

"Good, it already says it doesn't touch the color because PageRank covers it -- so I won't break
the colors. I need size. Size is probably under Shape."

## Step 3 -- try Shape

    timeout 120 node app-b/study.mjs --try P/03.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Shape"

Saw: nothing changed. "Clicking the word does nothing. The plus, then."

    timeout 120 node app-b/study.mjs --try P/04.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Add shape"
    -> nothing on screen is called "Add shape"
    timeout 120 node app-b/study.mjs --try P/04.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "+"
    -> nothing on screen is called "+"
    timeout 120 node app-b/study.mjs --try P/04.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Size"

Saw (04): the right panel jumped back to the whole graph's Data summary and a black toast said
"Selection cleared (Betweenness)" with "Bring it back". "What did I do? I clicked something called
Size and lost my place. Not reassuring."

## Step 4 -- detour through Analyze

"Maybe the old Betweenness row is something someone left behind. Let me find where these measures
come from -- the flask at the bottom."

    timeout 120 node app-b/study.mjs --try P/05.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Analyze"

Saw: an Analyze menu. Under "Rank nodes and edges": PageRank (marked "Start here"), Degree, Total
value, Betweenness "Which nodes sit on the most shortest paths between others", Closeness,
Eigenvector.

"There it is in plain words: sits on the most shortest paths between others. That is my
go-between. PageRank says 'Start here' but 'connected to other well-connected nodes' is
popularity, not dependence. I'll take Betweenness."

    timeout 120 node app-b/study.mjs --try P/06.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Which nodes sit on the most shortest paths"

Saw: a form. Weight "value (loaded weight)", "Higher means Stronger / Farther / Capacity", three
explanation lines, "Betweenness reads a weight as distance: it uses 1/value", "Under a second",
Run.

"I don't know what any of this weight business means for my answer, and nothing tells me which to
pick for 'depends on'. I'll leave the defaults and run it."

    timeout 120 node app-b/study.mjs --try P/07.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Which nodes sit on the most shortest paths" --click "Run"
    timeout 120 node app-b/study.mjs --try P/08.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Which nodes sit on the most shortest paths" --click "Run" --click "Betweenness 2"
    timeout 120 node app-b/study.mjs --try P/09.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Which nodes sit on the most shortest paths" --click "Run" --click "Betweenness 2" --click "Style"

Saw: a new row "Betweenness 2" near the top with a spinner and a progress line. Clicking it
selected it but the right panel stayed on the whole graph; Style showed canvas settings. The
spinner never finished in what I saw. "It said under a second. It's still spinning. And now I have
two Betweenness rows -- which one is mine? I'll go back to the old one, which at least has
numbers."

## Step 5 -- back to the old Betweenness row, find the plus

    timeout 120 node app-b/study.mjs --try P/10.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Options for Betweenness"

Saw: the row's menu -- Rename, Select top N, Compare with another row, Lock, Remove from list
view, Show only this row, Filter to, Add note, Show in table, Delete. "Nothing about size."

    timeout 120 node app-b/study.mjs --try P/11.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --hover "Add"
    -> tooltip: "Add to Shape"
    timeout 120 node app-b/study.mjs --try P/12.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Add to Shape"

Saw (12): a little menu: Shape, Size. "Size! Finally."

    timeout 120 node app-b/study.mjs --try P/13.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Add to Shape" --click "Size"

Saw (13): a new line "Size [1]" with a small cylinder icon and a minus. The dots did not change.

"Size 1. For everyone. That's not 'bigger the more it depends', that's one number. The cylinder
probably means 'use the data' -- the color line had something like that. Let me see what it says."

    (probing the cylinder's tooltip; each was a hover)
    --hover "data"   -> clicked the Data tab instead, tooltip none
    --hover "Size"   -> the size box, tooltip none
    --hover "value"  -> nothing on screen is called "value"
    --hover "column" -> tooltip none
    --hover "Bind"   -> nothing on screen is called "Bind"
    --hover "Use", "From", "Map", "Link", "Remove" -> nothing useful; "From" showed the color
       chip's tooltip "From Betweenness"; "Remove" is the minus, "Remove Size"
    timeout 120 node app-b/study.mjs --try P/15.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Add to Shape" --click "Size" --click "Size"

Saw (14, 15): the cylinder icon shows no tooltip when I rest on it, and clicking in the box just
puts the cursor next to "1". "So the color knows it comes 'From Betweenness', but the size has no
way that I can find to come from Betweenness. Or the cylinder is the way and it won't tell me."

## Step 6 -- maybe it is hidden

"The panel says 'none visible'. Maybe I have to switch the row on."

    timeout 120 node app-b/study.mjs --try P/16.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --hover "Show"
    -> tooltip: "Show Betweenness Alt-click or Alt+Space: show only this row"
    timeout 120 node app-b/study.mjs --try P/16.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Show Betweenness" --click "Add to Shape" --click "Size"

Saw (16): the eye is open now, but the panel still says "Paints 77 nodes, none visible", Size is
still 1, every dot is the same size. "Still nothing."

## Step 7 -- Assistant, then stop

    timeout 120 node app-b/study.mjs --try P/17.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Assistant"

Saw: "Off. Nothing is sent. Turn on in Settings." "Good that it's off. I'm not turning on something
that sends my data out to ask how to make a dot bigger. I'm done."

## Outcome

- Did I succeed? No. I found the right measure (the menu's plain description of Betweenness was
  the best moment), found where Size lives (a plus with no label, only a tooltip, under "Shape"),
  but every dot stayed the same size. I could not make Size follow Betweenness; the only thing I
  could set was a single number. The colors were left alone, which was the easy part.
- Single Ease Question: 2 out of 7.
- Would I use this instead of my current tool? Not yet. I liked that it says in plain words what
  a measure counts ("sits on the most shortest paths") and that it tells me another row "covers"
  the color -- that is the kind of "how do I know" I need. But I spent most of the time guessing
  at unlabeled plus signs and an icon with no name, a fresh run spun forever while promising
  "under a second", and clicking a word called Size threw away my selection. If I can't make a dot
  bigger, I can't hand a picture to the graphics desk.

## What got in the way, in her words

1. "Shape" is the heading that hides Size; clicking the word does nothing, only an unlabeled plus.
2. After adding Size, it is a single number. Nothing visible says how to make it follow the
   measure; the cylinder icon beside it has no tooltip.
3. The second Betweenness run ("Betweenness 2") kept spinning; the form had said "Under a second".
4. Two rows called Betweenness, one hidden in a folder, one new: unclear which is "mine".
5. Clicking something named "Size" (from the graph view) cleared my selection with a toast.
6. The weight options on the Betweenness form (Stronger / Farther / Capacity) give no hint which
   one fits "depends on".
7. After showing the hidden row, the panel still said "none visible".
