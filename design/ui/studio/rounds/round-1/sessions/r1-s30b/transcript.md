# Session r1-s30b -- Mara (the Gephi holdout), Florentine families: bigger dots for the families that matter

Participant: Dr. Mara Lindqvist, associate professor, ten years of Gephi.
Dataset: the ready-made Florentine families network. Start: empty app.
Prompt: make the drawing show which families the network depends on most (the more it depends
on a family, the bigger its dot), then say what the sizes and the colors stand for.

Commands are run from `design/ui/studio` with `T=tool/real.mjs` and `S=rounds/round-1/sessions/r1-s30b`.

Note on timing: the start waited about 40 minutes for a free browser slot before 01.png appeared.

## Steps

**01** `node $T --start $S empty`
Start screen: Open project or file, New from data, Recent projects (empty), Samples on the right
(Les Miserables, Zachary's karate club, College football, Florentine families, 15 families).
A "Your data is yours, but please help us" box at the bottom.
> Mara: "A consent box. No. And there's my sample, Florentine families, 15 families. That's
> Padgett's marriage network without Pucci, same as NetworkX."

**02** `--step $S --click "No thanks"` -- the box closes.

**03** `--step $S --click "Florentine families"`
The graph opens: 15 blue balls, 20 gray lines, no labels. Right panel "Graph", Values tab:
Nodes 15, Edges 20, "Undirected, from the file: directed 0", Density 0.1905, Components 1,
Edges per node 1 to 6, mean 2.667. Left panel: Selection, Everything, and at the bottom
"Analyze (Shift+A) to add results here". A toolbar at the bottom center with five icons.
> Mara: "Fifteen and twenty. Counts match what I know. Density 0.1905 -- 20 over 105, right.
> No labels on the dots, which I would want, but fine. 'Depends on most' in a marriage network
> is brokerage: betweenness. That's the whole point of Padgett's Medici paper. Where are the
> statistics? The flask, presumably."

**04** `--step $S --click-at 659,864` -- the button is "Analyze".
A list opens, "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank
(tagged "Start here"), Eigenvector, Katz, HITS, All-pairs distance, and more below.
> Mara: "PageRank 'start here'? Not for this question. Betweenness, by name -- good, I can find it."

**05** `--step $S --click "Betweenness"`
A small card: "Betweenness. Which nodes sit on the most shortest paths between others. Under a
second." and a Run button. No parameters shown.
> Mara: "Normalized or not? Weighted? Nothing to set. I'll check the numbers instead."
Hesitation: no visible parameters (normalization, endpoints).

**06** `--step $S --click "Run"`
The dots turn orange, one central dot dark brown. A legend appears top left: "Color: Bridges,
0 to 47.5". The left panel gains a row "Bridges 15". All dots are still the same size.
> Mara: "It colored them; I asked nothing about color. And it's called 'Bridges' now, not
> betweenness. 47.5 at the top -- that's the Medici's unnormalized betweenness in NetworkX. So
> the number is right, the name is new. The legend box also sits on top of the node in the
> top-left corner."
Confusion: the analysis was chosen as "Betweenness" but every label afterwards says "Bridges".

**07** `--step $S --click "Style"`
The right panel's Style tab for the whole graph: Canvas background, layout Method
"Force - Recommended", Seed 1. Nothing about node size.
> Mara: "This is the graph's style, not node appearance. Dead end. Maybe the result row."
Dead end 1.

**08** `--step $S --click "Bridges"`
The right panel now shows "Bridges, Measure from Bridges, Oct 6". Values tab: a histogram 0 to
47.5, "15 of 15 have a value, median 8.5"; Top 10: Medici 47.5, Guadagni 23.17, Albizzi 19.33,
Salviati 13, Ridolfi 10.33, Bischeri 9.5, Strozzi 9.333, Barbadori 8.5, Tornabuoni 8.333,
Castellani 5. "Made with: Analysis Bridges, Ran Oct 6".
> Mara: "That is the NetworkX order and the NetworkX values, unnormalized. Good. A sortable top
> ten is the first thing that earns trust. 'Made with: Bridges' still doesn't say betweenness."

**09** `--step $S --click "Style"`
Style for this result, Nodes / Edges switch. Fill, Color = Bridges (with a minus), Shape (+),
Effects (+), Label (+), Tooltip (+).
> Mara: "Size isn't listed. Probably under Shape."

**10** `--step $S --click-at 1419,226` -- "Add to Shape". A menu: Size, Shape.

**11** `--step $S --click "Size"`
A Size row appears with a value "1" and a chain-link icon next to it.
> Mara: "A constant 1. The chain icon is presumably 'by attribute'."

**12** `--step $S --hover-at 1380,256` -- tooltip "Size by attribute".

**13** `--step $S --click-at 1380,256`
A picker: "Find an attribute"; under Bridges: Bridges, Bridges rank, Bridges percentile; then
"Cannot be used: Holds groups, not amounts": id, name.
> Mara: "That's the ranking panel. And it tells me why name and id are grayed out. Good."

**14** `--step $S --click-at 1189,324` -- picks "Bridges".
The central Medici dot becomes much larger, the next brokers larger, the leaf families small.
The Size control reads "1 to 3". The legend now has two rows: "Size: Bridges 0 to 47.5" and
"Color: Bridges 0 to 47.5".
> Mara: "Done. Medici dominates, then Guadagni and Albizzi, as expected. Size 1 to 3, which is a
> modest range, but readable. The legend still covers the dot in the top-left corner."

**--end** `node $T --end $S`

## Debrief, in character

- **Finished?** Yes. The sizes now follow how many shortest paths run through each family.
- **What the sizes and colors stand for:** both stand for the same measure, the one the app calls
  "Bridges", which is betweenness: Medici highest at 47.5, then Guadagni 23.17 and Albizzi 19.33,
  down to 0. Bigger and darker means more of the network's shortest paths pass through that
  family. The legend says so, Size: Bridges and Color: Bridges, both 0 to 47.5.
- **Difficulty:** 3 of 7. About ten actions, one dead end (the graph-level Style tab).
- **What confused me:**
  1. I chose "Betweenness" and everything afterwards says "Bridges", including "Made with". I
     had to check the values against NetworkX to be sure it was the same thing.
  2. The run colored the nodes without being asked. Fine here, but I didn't choose that.
  3. No parameters on the run card: normalized or not, weighted or not. The values tell me
     unnormalized, but the card should say.
  4. Size is filed under "Shape", behind a plus. In Gephi it is its own tab next to color.
  5. The legend box covers a node in the top-left corner of the drawing.
  6. Still no family names on the dots, so the picture alone does not say which dot is the Medici.
