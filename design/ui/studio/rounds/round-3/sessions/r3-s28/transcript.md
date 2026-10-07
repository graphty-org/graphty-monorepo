# Session r3-s28 -- Dev (student with a class project), task T9 B (Florentine families)

Task as given: practice on the ready-made network of the leading families of Renaissance Florence
and the marriages between them. Make the drawing show which families the network depends on most:
the more it depends on a family, the bigger that family's dot. Then say what the sizes and the
colors on the drawing now stand for.

Start: empty. Commands run from design/ui/studio with S=rounds/round-3/sessions/r3-s28.

## Step 1 -- start
Command: `node tool/real.mjs --start $S empty` -> 01.png
Saw: a start page. "Start" (Open project or file, New from data), "Recent projects" (empty), and
"Samples": Les Miserables, Zachary's karate club, College football, Florentine families ("Marriages
between the leading families of Renaissance Florence. Good for finding who brokers between
groups."). A usage-data box at the bottom with "Share usage data" / "No thanks".
Thinking (Dev): I read everything. "Who brokers between groups" -- that sounds like what my class
calls betweenness. First I'll say No thanks to the data box, then open Florentine families.

## Step 2 -- No thanks, open the sample
Command: `--step $S --click "No thanks" --click "Florentine families"` -> 02.png
Saw: the drawing of 15 blue dots, all about the same size, no names on them. Left panel: a search
box, "Selection", "Everything", and at the bottom "Analyze (flask icon) in the toolbar (Shift+A) to
add results here". Right panel: Graph overview -- Nodes 15, Edges 20, Density 0.1905, Components 1,
"Edges per n..." 1 to 6, mean 2.667. A small toolbar at the bottom: flask, a chart-ish icon, "3D",
a magnifier.
Thinking (Dev): No names on the dots, which bugs me, but the task is sizes. In my tutorial this is
"Statistics" then "Ranking". The hint at the bottom left says Analyze is the flask in the toolbar.
That's my "statistics" button. Clicking the flask.

## Step 3 -- open Analyze
Command: `--step $S --click-at 680,864` (printed: button "Analyze") -> 03.png
Saw: a list popped up, "Filter analyses", heading "Rank nodes and edges": Degree, Betweenness
("Which nodes sit on the most shortest paths between others"), Edge betweenness, Closeness,
PageRank with a blue "Start here" tag, Eigenvector, Katz, HITS, All-pairs distance, Depth-first
order (grayed, "Select a node first"), Most flow...
Thinking (Dev): The sample said "who brokers between groups", and my tutorial says Betweenness
centrality is how you find the connectors -- the ones the network depends on. PageRank says "Start
here", which made me hesitate for a second, but the task is about depending on someone, and
"sit on the most shortest paths between others" is exactly that. Clicking Betweenness.

## Step 4 -- choose Betweenness
Command: `--step $S --click "Betweenness"` -> 04.png
Saw: the list shrank to a small card: "Betweenness -- Which nodes sit on the most shortest paths
between others.", a collapsed "Advanced", "Under a second", and a blue "Run" button.
Thinking (Dev): Easy. I won't touch Advanced. Run.

## Step 5 -- Run
Command: `--step $S --click "Run"` -> 05.png
Saw: every dot turned orange, and one in the middle is almost black-brown. A legend box top left
of the drawing: "Color: Betweenness", a bar from 0 (light orange) to 47.5 (dark). The left panel now
has a row "Betweenness 15" with an orange swatch, between Selection and Everything. The dots are
still all the same size.
Thinking (Dev): OK, so it colored them, not sized them. That's half. In my tutorial the next step
is "size proportional to" something. Maybe clicking the Betweenness row on the left gives me
options for it.

## Step 6 -- click the Betweenness row
Command: `--step $S --click-at 165,156` (printed: treeitem "Betweenness") -> 06.png
Saw: the row is highlighted with an eye icon. The right panel became "Betweenness -- Measure from
Betweenness, Oct 7", tabs Style / Values, Nodes / Edges, then: Fill (+), Color "Betweenn..." (-),
Shape (+), Effects (+), Label (+), Tooltip (+).
Thinking (Dev): No "Size" anywhere. Color is set to Betweenness already. Size of a dot... I guess
that lives under Shape? Clicking the plus next to Shape.

## Step 7 -- plus next to Shape
Command: `--step $S --click-at 1419,234` (printed: button "Add to Shape") -> 07.png
Saw: a little menu: "Size" (highlighted) and "Shape".
Thinking (Dev): There it is. Size.

## Step 8 -- Size
Command: `--step $S --click-at 1355,270` (printed: menuitem "Size") -> 08.png
Saw: a box "Size by attribute": "Find an attribute", "Fixed size", a group "Betweenness" with
Betweenness, Betweenness rank, Betweenness percentile, and grayed out under "Cannot be used: Holds
groups, not amounts": id, name.
Thinking (Dev): "Size by attribute" = my tutorial's "size proportional to". Plain Betweenness is the
number itself, so I'll pick that one. (Rank and percentile -- not sure what difference that makes
for the picture; I'll skip them.)

## Step 9 -- size by Betweenness
Command: `--step $S --click-at 1207,416` (printed: option "Betweenness") -> 09.png
Saw: the dots changed size right away. One dot in the middle is now huge and darkest; two or three
others are medium-big (one to its right, one lower right, one at the top); several are small. The
legend box now has two rows: "Size: Betweenness 0 ... 47.5" (a gray wedge) and "Color: Betweenness
0 ... 47.5" (the orange bar). In the right panel a new row "Size 1 to 3".
Thinking (Dev): That's the picture I wanted -- big dot = family the network depends on most. But
there are no names, so I can't say WHICH family in my essay. I'll hover the big one to see if it
tells me.

## Step 10 -- hover the big dot
Command: `--step $S --hover-at 700,378` (tool printed: node with id "Medici", tooltip: null) -> 10.png
Saw: nothing changed on screen. No tooltip, no name.
Thinking (Dev): Hovering shows me nothing. I'll click it -- maybe the right panel tells me who it is.

## Step 11 -- click the big dot
Command: `--step $S --click-at 700,378` -> 11.png
Saw: the dot got a yellow ring (selected). The right panel: "Medici -- Node", Summary: id Medici,
name Medici, Results: Betweenness "47.5, #1 of 15", Degree 6. The left panel "Selection 1".
Thinking (Dev): The biggest, darkest dot is the Medici, number 1 of 15 on betweenness. That's my
answer and matches what we were told in class. Done.

## End
Command: `node tool/real.mjs --end $S`

## In character, at the end (Dev)

**Did I finish?** Yes. The dots are now sized by Betweenness: the more the network depends on a
family (the more shortest paths between other families run through it), the bigger its dot. The
Medici dot is by far the biggest (47.5, number 1 of 15).

**What the sizes and colors stand for now:** both stand for the same thing, Betweenness, on the
same scale from 0 to 47.5. Bigger dot = higher betweenness; darker (brown-black) dot = higher
betweenness, light orange = 0. The legend box at the top left of the drawing says so: "Size:
Betweenness 0-47.5" and "Color: Betweenness 0-47.5".

**How easy, 1 (very difficult) to 7 (very easy):** 6.

**What went well:** the flask hint at the bottom left told me where Analyze was; Betweenness had a
plain description; Run colored the drawing by itself and added a legend; "Size" under Shape and the
"Size by attribute" list with Betweenness already at the top made the sizing quick. The legend
answered the "what do sizes and colors mean" question without me having to guess.

**Where I hesitated / what confused me:**
- PageRank had a "Start here" tag. For a task about who the network depends on, I went with
  Betweenness because of my tutorial and the sample's "who brokers between groups" line, but a
  student without that tutorial might just take "Start here".
- After Run, only the color changed. I expected sizing to be part of it, or a "size by this"
  button right on the result. I had to click the Betweenness row and then guess that Size lives
  under "Shape" -- there's no Size row until you press the plus next to Shape.
- "Size 1 to 3" in the panel -- 1 to 3 of what? I didn't need it, but it's a number I can't
  explain.
- Betweenness vs. Betweenness rank vs. Betweenness percentile in the size list -- not sure what
  changes in the picture between them.
- No names on the dots, and hovering a dot shows nothing. I only found out the big one is the
  Medici by clicking it. For my figure I'd want names on at least the big ones.
- The color legend's light-to-dark direction is clear on the bar, but on the 3D shaded balls the
  mid-range oranges all look alike; the size difference is much easier to read than the color.
