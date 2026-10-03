# Session: Fantine to Gavroche, fewest go-betweens -- Expert Emma

Task as given: "The Les Miserables network is open (example data, not your own). Work out how
Fantine and Gavroche are connected through the smallest number of go-betweens: say who the
go-betweens are, in order, and how many links it takes."

Start screen: shots/tasks/r8-t21/01.png. Renders: tmp/round-8-sessions/r8-t21--expert-emma/.
All commands run from design/ui/prototype; `P=tmp/round-8-sessions/r8-t21--expert-emma`.

## Think-aloud

**Start (shots/tasks/r8-t21/01.png).** Les Mis co-appearance, 77 nodes. "Local only" at the
top -- fine, it is example data anyway. The left list already has a "Shortest paths" group
with two old paths (Valjean to something, Myriel to something). So the tool exists. Not
Fantine to Gavroche though. The flask icon at the bottom probably means analyze; no label.

**Step 1.** Tried to rest on the flask icon -- I do not know its name.

    timeout 120 node app-b/study.mjs --try $P/01.png task:r8-t21 --hover "flask"
    -> nothing on screen is called "flask"

Fine. Clicked the "Shortest paths" row in the list instead -- that is my job.

    timeout 120 node app-b/study.mjs --try $P/01.png task:r8-t21 --click "Shortest paths"

The row highlighted, and the right panel says... "Louvain"? With "Run from Louvain, Sep 28"
and a Louvain color. I clicked shortest paths. Either the right panel did not follow my
click or I do not understand what it shows. No "new path" button on that row either. Moving on.

**Step 2.** The PageRank panel earlier said "Measure from Analyze", so I guessed the flask is
"Analyze".

    timeout 120 node app-b/study.mjs --try $P/02.png task:r8-t21 --click "Analyze"

A command list: Recent (Louvain, PageRank, Shortest path), then "Rank nodes and edges". Recent
items show their last parameters ("Resolution 1.0, weight value", "Damping 0.85") -- good,
that is the thing I usually have to go hunting for. "Shortest path: The fewest steps, or the
lightest route, between two nodes." That is the one.

**Step 3.**

    timeout 120 node app-b/study.mjs --try $P/03.png task:r8-t21 --click "Analyze" --click "Shortest path"

"Path between" form: From, To, Weight = "value (set at load)", with the note "Shortest path
reads a weight as distance: it uses 1/value." Credit where due: it says the transform out
loud. networkx would silently use value as distance if you passed weight="value", and people
get that wrong constantly. But I was asked for fewest go-betweens, so hop count, unweighted.
The weight has to go.

**Step 4.**

    timeout 120 node app-b/study.mjs --try $P/04.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "value (set at load)"

Options: "value (set at load)" and "None (fewest steps)". Exactly the right wording.

**Step 5.** Picked None, then tried to click the Fantine and Gavroche labels on the canvas,
since the pill at the top says "Click a node for From".

    timeout 120 node app-b/study.mjs --try $P/05.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "value (set at load)" --click "None (fewest steps)" --click "Fantine" --click "Gavroche"
    -> nothing on screen is called "Fantine" / "Gavroche"

Weight now reads "None (fewest steps)" with "This path only. Set at load: value, stronger" --
so it is a per-run override and the graph default is untouched. Good. But clicking the names
on the picture did nothing for me. Text field then.

**Step 6.**

    timeout 120 node app-b/study.mjs --try $P/06.png task:r8-t21 ... --click "Type a name"
    -> nothing on screen is called "Type a name"
    timeout 120 node app-b/study.mjs --try $P/06.png task:r8-t21 ... --click "From"

Field focused. No dropdown of names appears on focus. I would have liked a list.

**Step 7.** Just typed.

    timeout 120 node app-b/study.mjs --try $P/07.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "value (set at load)" --click "None (fewest steps)" --click "From" --type "Fantine"

"Fantine" in the box, tooltip "Click a node on the canvas, or type a name". No autocomplete
or match confirmation, so I cannot tell whether it resolved to a node or is just text. The top
pill still says "Click a node for From". Slightly nervous.

**Step 8.**

    timeout 120 node app-b/study.mjs --try $P/08.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "value (set at load)" --click "None (fewest steps)" --click "From" --type "Fantine" --key Enter --click "To" --type "Gavroche" --key Enter

Both filled and "Find path" turned blue, so it did accept them. That is the only confirmation
I got that the names matched.

**Step 9.**

    timeout 120 node app-b/study.mjs --try $P/09.png task:r8-t21 ... --click "Find path"

Result: "2 steps. 3 routes tie. Route 1 of 3." Right panel: Fantine (start), Valjean (hop 1),
Gavroche (end); "3 nodes, 2 edges"; "Made with: Weight None: fewest steps (this run's
override)"; "All options..." link. Path drawn in green on the canvas, a new "Fantine t... 3
nodes" row in the Shortest paths group. It tells me there are ties instead of handing me one
arbitrary path -- networkx's shortest_path does not, you have to call all_shortest_paths.
That is the honest answer.

**Step 10 / 11.** Stepped through the ties.

    timeout 120 node app-b/study.mjs --try $P/10.png task:r8-t21 ... --click "Find path" --click "Next route"
    timeout 120 node app-b/study.mjs --try $P/11.png task:r8-t21 ... --click "Find path" --click "Next route" --click "Next route"

Route 2: Fantine, Thenardier, Gavroche. Route 3: Fantine, Javert, Gavroche. On the canvas the
route-2 middle node sits next to the "Mme.Thenardier" and "Javert" labels and has no label of
its own, so on the picture alone I could not have told it was Thenardier (not Madame). The
list in the right panel is what I trust.

Sanity check against what I know of this dataset: Fantine co-occurs with Valjean, Thenardier
and Javert; Gavroche with all three as well. No direct Fantine-Gavroche edge. Distance 2 is
right.

## Answer

Fantine and Gavroche are two links apart, with one go-between. Three routes tie:

1. Fantine -> Valjean -> Gavroche
2. Fantine -> Thenardier -> Gavroche
3. Fantine -> Javert -> Gavroche

Unweighted (fewest steps); the default 1/value weighting was switched off for this run.

## Debrief

- **Succeeded?** Yes. The result agrees with what networkx all_shortest_paths would give.
- **Single Ease Question:** 5 of 7. The form itself is good; getting to it was guesswork.
- **Would I use this instead of my current tool?** For this question, no -- in a notebook it
  is one line, `list(nx.all_shortest_paths(G, "Fantine", "Gavroche"))`, faster than nine
  clicks. But for handing this to a non-coder it is a yes-leaning maybe: it states the
  weighting, offers "fewest steps" in plain words, reports ties instead of hiding them, and
  records the parameters on the result. That is more than Gephi does. I would want the path
  list exportable, and I would want the person I hand it to to find the Analyze button.

Problems I hit:

1. The flask button has no visible label; I found it only by guessing the word "Analyze"
   from another panel's "from Analyze" link.
2. Clicking the "Shortest paths" row on the left showed a Louvain panel on the right. Either
   a bug or the panel is not showing what I selected. And that row offers no obvious "find a
   new path" action, which is where I looked first.
3. Clicking node names on the canvas did not pick From/To for me, despite the "Click a node
   for From" hint.
4. The From field gives no autocomplete or match confirmation; I only knew the names resolved
   because Find path enabled. With "Mme.Thenardier" and "Thenardier" both in this graph, a
   name box without a match list is risky.
5. The weight dropdown starts on "value" for a task described as "the fewest steps"; you
   have to know to change it. The note under it is honest, at least.
6. Tied route 2's middle node has no label on the canvas.

What worked: per-run weight override clearly labeled; "1/value" stated; ties reported with a
route stepper; parameters shown on the result ("Made with"); Recent list shows last-run
parameters.
