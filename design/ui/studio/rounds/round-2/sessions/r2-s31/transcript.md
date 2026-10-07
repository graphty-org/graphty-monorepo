# Session r2-s31 -- Grace (nonprofit operations analyst), task T9 prompt B (Florentine families)

Task as given: practice on the ready-made network of the leading families of Renaissance Florence
and the marriages between them. Make the drawing show which families the network depends on most:
the more it depends on a family, the bigger that family's dot. Then say what the sizes and colors
on the drawing now stand for.

## Step 1 -- start
Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s31 empty`
Saw (01.png): a start page. Start: "Open project or file...", "New from data...", "Files are read on
this computer and never uploaded" (good -- that's what I'd want for donor names). Samples on the
right: Les Miserables, Zachary's karate club, College football, Florentine families (15 families,
"Good for finding who brokers between groups"). A usage-data box at the bottom.
Next: say "No thanks" to the usage data, then open Florentine families.

## Step 2 -- decline usage data, open the sample
Command: `--step --click "No thanks" --click "Florentine families"`
Saw (02.png): a drawing of 15 blue dots, all about the same size, no names on them. Right panel:
Nodes 15, Edges 20, Components 1 -- okay, 15 families, matches the sample card. A hint bottom left:
"Analyze (flask icon) in the toolbar (Shift+A) to add results here". Toolbar at bottom: flask,
a chart-ish icon, 3D, search.
Hesitation: no names on the dots, so I can't tell which family is which yet.
Next: the hint says Analyze is the flask, so click the flask.

## Step 3 -- open Analyze
Command: `--step --click-at 679,863` (printed: button "Analyze")
Saw (03.png): a list "Rank nodes and edges": Degree (how many edges each node has), Betweenness
(which nodes sit on the most shortest paths between others), Edge betweenness, Closeness,
PageRank with a "Start here" badge (connected to other well-connected nodes), Eigenvector, Katz,
HITS, All-pairs distance, more below.
Hesitation: "PageRank -- Start here" pulls me, but the task says "depends on most". Betweenness's
line, "sit on the paths between others", reads like "everyone has to go through them", which is
what "the network depends on" means to me. The sample card also said "who brokers between groups".
I'd not put "betweenness" on a slide, but the description is plain enough.
Next: click Betweenness.

## Step 4 -- choose Betweenness
Command: `--step --click "Betweenness"`
Saw (04.png): a small card "Betweenness -- Which nodes sit on the most shortest paths between
others", a closed "Advanced", "Under a second", and a blue Run button. Nothing about sizes yet.
Next: press Run and see what it does to the drawing.

## Step 5 -- Run
Command: `--step --click "Run"`
Saw (05.png): the dots turned orange, from light orange to almost black-brown; the middle one is the
darkest. A key top left: "Color: Bridges, 0 ... 47.5". In the left list a new row "Bridges 15".
Nice: "Bridges" is a word I could put on a slide. But the dots are all still the same size, and
the key box covers the top-left dot. Colors are done, sizes are not.
Next: click the "Bridges" row on the left to see if it lets me use it for size.

## Step 6 -- open the Bridges row
Command: `--step --click "Bridges"`
Saw (06.png): the right panel is now "Bridges -- Measure from Bridges, Oct 6", tab Style, Nodes.
Fill: Color = Bridges. Then Shape +, Effects +, Label +, Tooltip +. No "Size" word anywhere.
Hesitation: size is probably part of "Shape"? Guessing.
Next: click the + next to Shape.

## Step 7 -- + next to Shape
Command: `--step --click-at 1419,234` (printed: button "Add to Shape")
Saw (07.png): a little menu: "Size" (highlighted), "Shape". There it is.
Next: click Size.

## Step 8 -- Size
Command: `--step --click "Size"`
Saw (08.png): a Size row with a box "1" and a little chain-link icon next to it. Dots unchanged.
Hesitation: typing a number would make every dot the same size; I want it to follow Bridges like
Color does. The chain link might be "connect to a value". Not sure.
Next: hover the chain-link icon to see what it says.

## Step 9 -- hover the chain link
Command: `--step --hover-at 1380,264`
Printed: tooltip "Size by attribute". "Attribute" is a database word, but I get it: size by a value.
Next: click it.

## Step 10 -- Size by attribute
Command: `--step --click-at 1380,264`
Saw (10.png): a picker "Size by attribute": Bridges, Bridges rank, Bridges percentile; greyed out
"id" and "name" ("Cannot be used: Holds groups, not amounts" -- clear enough).
Next: pick plain "Bridges", same as the color.

## Step 11 -- size by Bridges
Command: `--step --click-at 1188,372` (printed: option "Bridges")
Saw (11.png): now the dots really differ in size. One big dark dot in the middle, two
medium-big ones to its right, many small light ones. The key top left now has two rows:
"Size: Bridges 0 ... 47.5" and "Color: Bridges 0 ... 47.5". The Size box says "1 to 3".
So the sizing part is DONE. Size and color both say the same thing: Bridges.
Hesitation: what is 47.5? Not a count of anything I know. And I still can't see which family is
the big dot -- no names on the dots.
Next: hover the big dot to find out who it is.

## Step 12 -- hover the big dot
Command: `--step --hover-at 700,378` (the tool says: node with id "Medici"; tooltip null)
Saw (12.png): nothing changes on screen -- no name pops up when I rest on the dot. (The tool tells
me it's Medici, but the screen itself didn't.) Hesitation: on a slide I'd need the names.
Next: try the "Values" tab on the right for the Bridges result -- maybe it lists the families
and their numbers, which would also tell me what 47.5 is.

## Step 13 -- Values tab
Command: `--step --click "Values"`
Saw (13.png): a little bar chart (one tall bar at 0, the rest spread out; "15 of 15 have a value,
0 to 47.5, median 8.5"), then "Top 10": Medici 47.5, Guadagni 23.17, Albizzi 19.33, Salviati 13,
Ridolfi 10.33, Bischeri 9.5, Strozzi 9.333, Barbadori 8.5, Tornabuoni 8.333, Castellani 5. Then
"Made with: Analysis Betweenness, Ran Oct 6". 15 of 15 -- everyone is counted. So the big dark dot
is the Medici, about twice the next family. That's my answer; I'm done.

## End
Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s31`

## Debrief (in character)
- **Finished?** Yes. The dots are now sized by how much the network depends on each family, and
  I can say what the drawing means.
- **What the sizes and colors stand for:** both stand for the same thing, "Bridges" (the app's
  Betweenness analysis): how often a family sits on the shortest path between two other families,
  i.e. how much the other families go through it to reach each other. Bigger dot = more of a
  bridge; darker orange = more of a bridge (light orange 0 up to dark brown 47.5). The Medici are
  the biggest and darkest by far (47.5, about double Guadagni at 23.17, then Albizzi 19.33).
  Families at 0 sit on nobody's path -- the small light dots at the edges.
- **Rating:** 5 of 7 (fairly easy). Running the analysis was easy and colored the dots on its
  own. Making the sizes follow it took a small hunt.
- **Where I hesitated / what confused me:**
  1. Picking the analysis: "PageRank -- Start here" was the suggested one, but its description
     ("connected to other well-connected nodes") did not match "depends on". I went with
     Betweenness because its one-line description did. Nothing told me which one answers
     "who does the network depend on".
  2. Size was hidden under "Shape +". I'd have looked for a "Size" row straight away; I guessed.
  3. After adding Size, it showed a plain "1" box. Making it follow the result needed the small
     chain-link icon, whose tooltip says "Size by attribute" -- "attribute" is a database word.
  4. The number 47.5 means nothing to me as a unit; the key gives no plain sentence for it.
     I can only say "higher = more of a bridge".
  5. No names on the dots and hovering a dot shows nothing, so I had to find the Values tab to
     learn the big dot is the Medici. For a board slide I'd still need to put names on.
  6. The key box at top left covers the top-left dot.
  Good: "Bridges" is a word I can put on a slide; "Files are read on this computer and never
  uploaded" and "Local only" reassured me; "15 of 15 have a value" let me check nobody was lost.
