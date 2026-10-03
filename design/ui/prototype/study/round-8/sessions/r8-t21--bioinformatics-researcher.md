# Session: shortest connection Fantine to Gavroche -- Dr. Chen (computational biologist)

Task given by the moderator: "The Les Miserables network is open (example data, not your own). Work out how
Fantine and Gavroche are connected through the smallest number of go-betweens: say who the go-betweens are,
in order, and how many links it takes."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t21--bioinformatics-researcher/.

## 01 -- start screen (shots/tasks/r8-t21/01.png)

"OK, Les Mis co-appearance, 77 nodes. Colored by PageRank, which I didn't ask for. There's already a row on
the left called 'Shortest paths' with two runs under it, Valjean-to-something and Myriel-to-something.
Neither is mine. In igraph this is one line: shortest_paths(g, 'Fantine', 'Gavroche'). Let's see if the row
is the way in."

## 02 -- click the "Shortest paths" row

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t21 --click "Shortest paths"

"The row highlights, but the panel on the right says Louvain -- 'Run from Louvain, Sep 28', fill color
Louvain communities. I clicked Shortest paths. Why am I looking at Louvain? Either the right panel didn't
follow my click or it's showing the last thing I touched. That's the kind of thing that makes me distrust
what the panel tells me. No 'new path' button here either. Moving on."

## 03 -- the flask button at the bottom ("Analyze")

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t21 --click "Analyze"

"An Analyze list. Recent: Louvain with resolution 1.0 and weight value, PageRank damping 0.85 -- good, it
states parameters. 'Shortest path -- the fewest steps, or the lightest route, between two nodes.' That's it."

## 04 -- choose Shortest path

    ... --click "Analyze" --click "Shortest path"

"'Path between': From, To, Weight, Scope. And here's the catch: Weight defaults to 'value (set at load)',
'reads a weight as distance: it uses 1/value'. So by default it gives me the lightest route by inverse
co-appearance count, not the fewest hops. The task is the fewest go-betweens, so I have to change that.
Credit where due: it says plainly what it does with the weight. A student would just press Find path and
report the weighted route. The banner says 'Click a node for From'."

## 05 -- click the names on the drawing, open the weight menu

    ... --click "Fantine" --click "Gavroche" --click "value (set at load)"

"Clicking the labels Fantine and Gavroche on the drawing did nothing that I could see -- the fields are
still empty. The weight menu has two choices: 'value (set at load)' and 'None (fewest steps)'. That second
one is what I want."

## 06-07 -- weight to None, try to get into From

    ... --click "None (fewest steps)" --click "Type a name"     (nothing is called that)
    ... --click "None (fewest steps)" --click "From"

"Weight now says None (fewest steps), with a note 'This path only. Set at load: value, stronger.' Fine --
it's an override for this run, not a change to my data. Good. The From box is outlined but I can't tell if
I'm in it."

## 08 -- type into From

    ... --click "From" --key F --key a --key n --key t

"'Fant' is in the box. The tooltip says 'Click a node on the canvas, or type a name.' No suggestion list
dropping down, though. With gene symbols I'd want autocomplete -- I'm not typing TP53BP1 blind."

## 09 -- finish Fantine, Enter

    ... --key i --key n --key e --key Enter

"From = Fantine, focus jumped to To, banner now says 'Click a node for To'. OK."

## 10 -- Gavroche, Find path

    ... --type "Fantine" --key Enter --type "Gavroche" --key Enter --click "Find path"
    (same steps as typed one key at a time in the first run)

"Result. Green path Fantine - Valjean - Gavroche. Bottom bar: '2 steps. 3 routes tie. Route 1 of 3.' Right
panel: 3 nodes, 2 edges, members in path order with 'start', 'hop 1', 'end', and 'Made with: Weight None:
fewest steps (this run's override)'. That's what I'd want in a methods line. And it tells me about ties
instead of silently picking one -- igraph's get.shortest.paths gives you one unless you ask for
all_shortest_paths, so this is actually better than my default. Let me see the other two."

## 11 -- Next route

    ... --click "Find path" --click "Next route"

"Route 2: Fantine - Thenardier - Gavroche. But on the drawing the highlighted middle node sits right on the
'Javert' label, and 'Mme.Thenardier' is a separate node above it. Thenardier and Mme. Thenardier are two
different characters -- for genes this is exactly the paralog-symbol mix-up I worry about. The list says
Thenardier; I'll trust the list, but the picture is ambiguous because the labels overlap."

## 12 -- Next route again

    ... --click "Next route" --click "Next route"

"Route 3: Fantine - Javert - Gavroche. So three tied shortest routes, each with exactly one go-between."

## Answer

Fantine and Gavroche are 2 links apart, with one go-between. There are three equally short routes:
- Fantine - Valjean - Gavroche
- Fantine - Thenardier - Gavroche
- Fantine - Javert - Gavroche
This is unweighted (fewest steps). I changed the weight to "None"; the default would have used the
co-appearance weights as 1/value.

## Debrief

- Do I think I succeeded? Yes, and I'm confident. I'd check the tie count against igraph's
  all_shortest_paths, but the panel recorded what it ran with, so I could write it up.
- Single Ease Question: 5 of 7. Once I found Analyze it was easy. Points off for: the Shortest paths row
  opening Louvain in the right panel; clicking the names on the drawing not filling From/To; no
  autocomplete when typing a name; the default weight quietly answering a different question than "fewest
  go-betweens" (it is stated, but a default of "lightest route" for a tool called shortest path will catch
  students); and overlapping labels making route 2's middle node look like Javert.
- Would I use this instead of my current tool? For this, no -- it's one line in igraph and I'd get a table I
  can join. As a viewer to show a collaborator the path, maybe: the tie reporting and the "Made with" record
  are better than Cytoscape's path plugins. Whether it goes further depends on whether I can get the path
  and the members out as a table, or script it, which I didn't see here.
