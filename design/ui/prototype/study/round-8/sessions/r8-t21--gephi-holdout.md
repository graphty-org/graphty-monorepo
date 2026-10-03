# Session: Fantine to Gavroche, fewest go-betweens -- the Gephi holdout (Dr. Mara Lindqvist)

Task as given by the moderator: "The Les Miserables network is open (example data, not your own).
Work out how Fantine and Gavroche are connected through the smallest number of go-betweens: say
who the go-betweens are, in order, and how many links it takes."

Start screen: shots/tasks/r8-t21/01.png. Renders: tmp/round-8-sessions/r8-t21--gephi-holdout/01.png to 11.png.
All commands were run from design/ui/prototype. `K` is a shell helper that turns a word into one
`--key <letter>` per character (the tool has no typing step, so typing is key presses).

## Transcript

**Start (shots/tasks/r8-t21/01.png).** "Les Mis, the 77-node co-appearance graph. I know it. Left
list has a 'Shortest paths' group with two paths already in it -- Valjean to something, Myriel to
something. Somebody's been here before me. In Gephi I'd do this with the Shortest Path tool in the
toolbar: click one node, click the other. Let me see if that group is where I make a new one."

**Step 1.**
`timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t21--gephi-holdout/01.png task:r8-t21 --click "Shortest paths"`

"The row highlights, and the right-hand panel shows... Louvain? I clicked Shortest paths and the
inspector says Louvain, 'Paints 77 nodes'. That's confusing -- either it's showing the thing that
covers this layer or it didn't follow my click. Whatever. There's no 'new path' anywhere I can
see on this row. Try the flask in the bottom toolbar, that looks like the statistics panel."

**Step 2.**
`timeout 120 node app-b/study.mjs --try .../02.png task:r8-t21 --click "Analyze"`

"Right, Analyze. This is my Statistics panel. Shortest path is right there under Recent: 'The
fewest steps, or the lightest route, between two nodes.' Good -- it says up front there are two
meanings. And the right panel now shows the graph summary: 77 nodes, 254 edges, undirected,
weighted by 'value'. Counts match what I remember. Fine."

**Step 3.**
`timeout 120 node app-b/study.mjs --try .../03.png task:r8-t21 --click "Analyze" --click "Shortest path"`

"'Path between' dialog. From, To, Weight, Scope. And the weight is set to 'value (set at load)'
and it says it reads weight as distance, 1/value. No. The question is go-betweens, that's hops.
If I'd just hit Find path I'd get the strongest route, not the shortest one -- that's a trap for
my students. At least it tells me, which Gephi wouldn't. Scope is 'Whole graph, 77 nodes' -- good,
it says what it runs on. Banner on top says 'Click a node for From'."

**Step 4.**
`timeout 120 node app-b/study.mjs --try .../04.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "Fantine" --click "Gavroche" --click "value (set at load)"`

"Clicking the labels didn't do anything (nothing on screen is called Fantine/Gavroche -- the
canvas labels aren't targets). But the weight menu opened: 'None (fewest steps)'. That's the one."

**Step 5.**
`timeout 120 node app-b/study.mjs --try .../05.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "value (set at load)" --click "None (fewest steps)" --click "Type a name"`

"Weight is None now, and it says 'This path only' -- so it won't change the graph's weight
setting for everything else. Good. Clicking the placeholder text did nothing."

**Step 6.**
`timeout 120 node app-b/study.mjs --try .../06.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "value (set at load)" --click "None (fewest steps)" --click "From" --click "Click to pick"`

"Clicking From focused it, then To. So I just type."

**Step 7.**
`timeout 120 node app-b/study.mjs --try .../07.png task:r8-t21 ... --click "From" --key F --key a --key n`

"Typed 'Fan'. No suggestion list drops down. With 77 characters I'd expect an autocomplete --
with Mme.Thenardier and Thenardier both in here, I want to see what it'll match before I commit.
The tooltip says 'Click a node on the canvas, or type a name'. Type the whole thing then."

**Step 8.**
`timeout 120 node app-b/study.mjs --try .../08.png task:r8-t21 ... --click "From" $(K Fantine) --key Enter`

"Fantine is in From, focus jumped to To. Fine."

**Step 9.**
`timeout 120 node app-b/study.mjs --try .../09.png task:r8-t21 ... --click "From" $(K Fantine) --key Enter $(K Gavroche) --key Enter --click "Find path"`

"There. Fantine - Valjean - Gavroche, green on the canvas. '2 steps. 3 routes tie. Route 1 of 3.'
Right panel: 3 nodes, 2 edges, in path order, start / hop 1 / end, and 'Made with: Weight None,
fewest steps (this run's override)'. That's exactly what I want a methods note to say. A new row
'Fantine t... 3 nodes' appeared under Shortest paths. And there's an Undo on the toast, which
Gephi has never given me. Three routes tie -- I want to see the other two, because 'the' shortest
path is only one of them."

**Step 10.**
`timeout 120 node app-b/study.mjs --try .../10.png task:r8-t21 ... --click "Find path" --click "Next route"`

"Route 2: Fantine - Thenardier - Gavroche. On the canvas the middle node sits right on top of the
'Javert' label and Thenardier himself has no label -- if I only looked at the picture I'd have
said Javert. The panel list is what I trust."

**Step 11.**
`timeout 120 node app-b/study.mjs --try .../11.png task:r8-t21 ... --click "Find path" --click "Next route" --click "Next route"`

"Route 3: Fantine - Javert - Gavroche. That's all three. Done."

## Answer

Fantine and Gavroche are two links apart, with one go-between. Three routes tie for shortest:
- Fantine - Valjean - Gavroche
- Fantine - Thenardier - Gavroche
- Fantine - Javert - Gavroche

(Computed with weight set to none, fewest steps, on the whole graph of 77 nodes.)

## Debrief

- **Succeeded?** Yes. Two links, one go-between, and three equally short choices: Valjean,
  Thenardier or Javert.
- **Single Ease Question:** 5 of 7.
- **Would I use this instead of Gephi?** "For this, honestly, yes -- it's better than Gephi's
  shortest-path tool, which shows you one path and never tells you there's a tie or what weight
  it used. This one said '3 routes tie', let me step through them, and wrote down 'fewest steps,
  whole graph' next to the result. That's a number I can check against NetworkX
  (all_shortest_paths). But one shortest-path query isn't why I'm on Gephi. Show me my 23k-node
  retweet GEXF and ForceAtlas2 with my parameters before I talk about switching."

## Problems she ran into

1. **Weight defaults to the loaded 'value' column.** The dialog opened ready to compute the
   lightest route, not the fewest steps, though the task (and most people's 'shortest path') is
   hops. It is stated plainly, which is why she caught it; a student would press Find path and
   report a weighted route. Severity: moderate.
2. **No autocomplete when typing a name.** Typing 'Fan' showed no list of matches; she had to type
   the full name and press Enter blind. With Thenardier and Mme.Thenardier both present, she wants
   to see the match first. Severity: minor to moderate.
3. **Canvas label confusion on route 2.** The Thenardier node is unlabeled and sits under the
   'Javert' label, so the picture alone suggests the wrong go-between. Severity: minor (the panel
   is right).
4. **Clicking the 'Shortest paths' row showed Louvain in the inspector.** She expected the group
   or a way to add a new path there; there was neither. Severity: minor.
5. **Canvas labels are not clickable targets by name.** She tried clicking Fantine and Gavroche on
   the map first, as in Gephi's path tool; nothing happened through labels. Severity: minor.

## What she liked

- "3 routes tie" with a stepper -- Gephi never admits a tie.
- The result says what it was made with: weight none, fewest steps, this run's override, whole graph.
- The weight override is scoped to "this path only" and does not change the graph-wide setting.
- Undo right on the result toast.
- The path is kept as a named row in the list, not a transient highlight.
