# Session: shortest path from Fantine to Gavroche -- Dr. Chen (computational biologist)

Task as given: "Which characters link Fantine to Gavroche through as few others as possible? Show it
in the drawing. The data on screen is a sample: characters of the novel Les Miserables, linked when
they appear in the same chapter. If that is not your line of work, treat them as your own people or
things."

Renders are in design/ui/prototype/tmp/round-7-sessions/t12--bioinformatics-researcher/.
All commands were run from design/ui/prototype; `$D` is that render folder.

## Start screen (shots/tasks/t12/01.png)

"Les Miserables, co-appearances, 77 nodes. Colored by PageRank, sized by degree -- fine, there's a
legend. On the left there's already a 'Shortest paths' group with Valjean to Javert and Myriel to
Javert, so someone has done this kind of thing here. I want a new one: Fantine to Gavroche. The flask
icon at the bottom is probably analysis. I'll rest my pointer on it."

## Step 1 -- what is the flask?

    timeout 120 node app-b/study.mjs --try $PWD/$D/02.png task:t12 --hover "Analyze"

02.png: tooltip "Analyze  Shift+A". "Good."

## Step 2 -- open Analyze

    timeout 120 node app-b/study.mjs --try $PWD/$D/03.png task:t12 --click "Analyze"

03.png: a searchable list. Under Recent: Louvain, PageRank, "Shortest path -- The fewest steps, or
the lightest route, between two nod...". "That's it. The graph's weight is listed on the right as
'value, stronger'. The question is fewest intermediaries, so I want hops, not weights. I'll watch
which one it uses."

## Step 3 -- Shortest path

    timeout 120 node app-b/study.mjs --try $PWD/$D/04.png task:t12 --click "Analyze" --click "Shortest path"

04.png: a "Path between" card -- From "Type a name", To "Click to pick", Weight "value (loaded
weight)" with Stronger / Farther / Capacity, "Shortest path reads a weight as distance: it uses
1/value", Scope "Whole graph, 77 nodes", and a grayed "Find path". A banner at the top: "Click a node
or set for From".

"So by default it would give me the strongest-tie path, not the fewest-steps path. Defensible, but not
my question, and I like that it says 1/value out loud. First the endpoints. The banner says click a
node."

## Step 4 -- click the characters in the drawing

    timeout 120 node app-b/study.mjs --try $PWD/$D/05.png task:t12 --click "Analyze" --click "Shortest path" --click "Fantine" --click "Gavroche"

Output: nothing on screen is called "Fantine"; nothing on screen is called "Gavroche". 05.png
unchanged.

"Clicking the names in the picture did nothing."

## Step 5 -- the From field itself

    timeout 120 node app-b/study.mjs --try $PWD/$D/06.png task:t12 --click "Analyze" --click "Shortest path" --click "Type a name"

06.png: unchanged. No list of names drops down.

"I'd expect a list of characters to pick from, the way Cytoscape's node search autocompletes.
Nothing."

## Step 6 -- the "From" label and the banner

    timeout 120 node app-b/study.mjs --try $PWD/$D/07.png task:t12 --click "Analyze" --click "Shortest path" --click "From"
    timeout 120 node app-b/study.mjs --try $PWD/$D/08.png task:t12 --click "Analyze" --click "Shortest path" --click "Click a node or set for From"

07.png unchanged. For 08: nothing on screen is called "Click a node or set for From" -- the banner is
not a control.

## Step 7 -- how was the existing Myriel to Javert path made?

    timeout 120 node app-b/study.mjs --try $PWD/$D/09.png task:t12 --click "Myriel to Javert"

09.png: right panel "Myriel to Javert -- Path from Shortest paths. Paints 3 nodes, 2 edges. Covered
for Color by PageRank." Fill 0072B2.

"So the blue path exists but I can't see it in the drawing because PageRank sits on top of it. Good
that it tells me; bad that a path I asked for wouldn't show by default. I'll remember that if I ever
get mine made. There's no From/To shown here, so I can't edit the endpoints from this."

## Step 8 -- the "from Shortest paths" link

    timeout 120 node app-b/study.mjs --try $PWD/$D/10.png task:t12 --click "Myriel to Javert" --click "from Shortest paths"

10.png: the left list expands Louvain into Community 1-6, and the right panel shows Louvain (6
communities, modularity 0.565, seed 7).

"I clicked the source of a shortest path and got the community run. That's wrong, or at least I can't
tell why."

## Step 9 -- the Shortest paths group row

    timeout 120 node app-b/study.mjs --try $PWD/$D/11.png task:t12 --click "Shortest paths"

11.png: the Shortest paths row is highlighted on the left, but the right panel still says "Louvain --
Run from Louvain, Sep 28, Paints 77 nodes, Eight distinct".

"The left says one thing is selected, the right describes another. I'd trust neither."

## Step 10 -- pick from the node table instead

    timeout 120 node app-b/study.mjs --try $PWD/$D/12.png task:t12 --click "Table"

12.png: node table, 77 nodes, sorted by degree: Valjean 36, Gavroche 22, Marius 19, Javert 17,
Thenardier 16. Fantine is not in the visible rows.

    timeout 120 node app-b/study.mjs --try $PWD/$D/13.png task:t12 --click "Table" --click "Analyze" --click "Shortest path" --click "Gavroche"

Output: nothing on screen is called "Gavroche". 13.png: opening the path tool closed the table.

    timeout 120 node app-b/study.mjs --try $PWD/$D/14.png task:t12 --click "Table" --click "Gavroche" --click "Analyze" --click "Shortest path"

14.png: From still "Type a name". "Selecting a row first isn't taken as From either."

## Step 11 -- the To field, and the Weight list

    timeout 120 node app-b/study.mjs --try $PWD/$D/15.png task:t12 --click "Analyze" --click "Shortest path" --click "Click to pick"
    timeout 120 node app-b/study.mjs --try $PWD/$D/16.png task:t12 --click "Analyze" --click "Shortest path" --click "value (loaded weight)"

15.png: the banner now says "Click a node or set for To"; From became "Click to pick" and To "Type a
name". "It just moved the pick to the other field." 16.png: the Weight list holds None and, under
edges, value. "None -- I assume that means count steps."

## Step 12 -- unweighted, then Find path

    timeout 120 node app-b/study.mjs --try $PWD/$D/17.png task:t12 --click "Analyze" --click "Shortest path" --click "value (loaded weight)" --click "None" --click "Find path"

Output: nothing on screen is called "Find path". 17.png: Weight None, note "This path only. Loaded
weight: value, stronger". Find path still grayed out.

"Weight None is set, and the note says the graph keeps its weight, so this choice is only for this
run. That's the right idea. But it never says 'counts steps', and that's the phrase I'd want for a
methods line. Find path stays gray because I can't get either character into From or To. I'm
stopping. Squinting at the edges, I'd guess Fantine to Valjean to Gavroche, one character between
them. But that's me reading a hairball, not the tool, and nothing is shown in the drawing."

## Outcome

- Succeeded? No. I found the right tool in under a minute and set it to unweighted, but I could
  not set either endpoint, so no path was computed and nothing was shown in the drawing. My guess
  of Valjean as the one link is unverified.
- Single Ease Question: 2 of 7.
- Would I use this instead of my current tool? Not on this showing. In igraph,
  `shortest_paths(g, "Fantine", "Gavroche", weights = NA)` is one line. The parts I liked are the
  explicit "uses 1/value" note, a run-only weight choice, and the "Covered for Color by PageRank"
  warning. Those are the kind of honesty I need for a reviewer. But a path tool where I can't name
  the two endpoints is no use to me. And a list where the left and right panels describe different
  things makes me doubt every other number on the screen.

## Problems I hit, in my words

1. I could not put a character into From or To. Clicking the name in the drawing, clicking the
   field, and selecting the row in the table first all failed. The only hint was the banner "Click
   a node or set for From".
2. "Type a name" offers no list of matching names when clicked.
3. Opening the path tool closes the node table, so I can't pick from the table while the tool is
   open.
4. By default the tool ranks routes by the loaded weight (1/value). For "as few others as possible"
   I had to know to switch Weight to "None". "None" doesn't say it means counting steps.
5. An existing path is "Covered for Color by PageRank", so a path made here would not show in the
   drawing unless I also deal with the layer above it.
6. Clicking "from Shortest paths" on a path opened the Louvain run. With the Shortest paths row
   selected, the right panel still described Louvain.
