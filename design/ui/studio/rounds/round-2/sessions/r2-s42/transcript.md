# Session r2-s42 -- Dr. Mara Lindqvist (Gephi holdout), task T11 "Untangle the drawing"

Dataset: Les Miserables sample. Start: empty.

## Step 1

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s42 empty` -> 01.png

Saw: a start page. Start column (Open project or file, New from data), Recent projects empty, Samples on the right with Les Miserables (77 characters). A usage-data consent box at the bottom.
In character: "77 -- that's the Knuth graph, 77 nodes, 254 edges. I'll dismiss the data box and open it."
Next: click "No thanks", then the Les Miserables sample.

## Step 2

Command: `--step --click "No thanks" --click "Les Miserables"` -> 02.png

Saw: the graph drawn, 77 nodes and 254 edges, undirected, density 0.08681, 1 component. Counts match the Knuth data I know (254/2926 = 0.0868, checks out). The drawing is a hairball in the middle with one fan at the bottom (that's Myriel and his visitors, I'd bet). No labels. Nothing tells me which layout made this. A "3D" switch in the bottom toolbar -- it says 3D, which I distrust. Toolbar icons: a flask, a chart-like icon, "3D", a magnifier.
In character: "Counts are right. Good. Now -- what spatialized this? It doesn't say. Where is my Layout panel?"
Hesitation: no word "Layout" anywhere on screen.
Next: hover the second toolbar icon (the chart-like one) to see if it is layout.

## Step 3

Command: `--step --hover-at 728,864` -> 03.png

Saw: tooltip "Layout" on the second toolbar icon.
In character: "There it is. An icon of a chart for layout -- I'd never have guessed, but fine."
Next: click it.

## Step 4

Command: `--step --click "Layout"` -> 04.png

Saw: a menu. "Force" is checked and tagged "Recommended". Then Circle, Rings around a node (select a node first), Grid, Rings by group (needs a node attribute to group by), Spiral, Spectral, No crossings (greyed: "G is not planar" -- raw error text, but at least honest), Random, Tree (select a node first), Two columns and Columns by group (need an attribute), Keep positions.
In character: "'Force.' Which force? Fruchterman-Reingold? ForceAtlas2? There is no ForceAtlas2 by name, and 'Recommended' by whom? No parameters visible -- no gravity, no scaling, no LinLog." Disappointed. "Rings by group" and "Columns by group" are interesting -- that's a partition-driven layout, but I have no modularity class yet.
Hesitation: what the current layout actually is.
Next: hover "Force" to see if it tells me the algorithm.

## Step 5

Command: `--step --hover-at 594,446` -> 05.png

Saw: no tooltip on "Force". Nothing names the algorithm.
In character: "Nothing. I'd write 'spatialized with Force in graphty' in a methods section? No."
Next: click "Force" anyway, to see whether choosing it opens its settings (that's where Gephi puts them).

## Step 6

Command: `--step --click-at 594,446` -> 06.png

Saw: a "Force" settings page in the menu: "Pulls connected nodes together and pushes unconnected ones apart until the shape stops moving, in three dimensions or, with 'dim: 2', flat." Shape 3D/2D (3D selected), Spring length 30, Gravity -1.2, an "Advanced" section, "Under a second", button "Applied" (greyed).
In character: "So it IS a 3D drawing. That's my first problem -- the hairball is partly occlusion, nodes stacked behind each other. And 'dim: 2' in a sentence for users is someone's config key leaking. Spring length and gravity -- a spring-electrical model, so not ForceAtlas2. Negative gravity? In what units? Still no name I could cite."
Next: switch Shape to 2D -- that alone should untangle part of it -- and apply.

## Step 7

Command: `--step --click "2D"` -> 07.png

Saw: 2D selected, Apply button now blue. Drawing unchanged until applied. Fine -- explicit apply is what I like.
Next: click Apply.

## Step 8

Command: `--step --click "Apply"` -> 08.png

Saw: the graph redrawn flat. Much clearer. I can now see distinct groups: a dense clique top right, a clique on the left, a clique at the bottom, Myriel's fan of visitors on the far left, a few pendants on the right, and the busy core in the middle where Valjean sits. The menu closed by itself. The bottom toolbar still says "3D" even though the drawing is now flat -- confusing: is that the camera, or the layout?
In character: "That's already better than what it opened with. 3D was the hairball. Now I want to tune -- ForceAtlas2 with LinLog would pull those cliques apart more. Let's see what 'Advanced' holds."
Next: open Layout again, go into Force, open Advanced.

## Step 9

Command: `--step --click "Layout"` -> 09.png

Saw: same menu, Force checked. Still only one force layout in the list; no ForceAtlas2, no Fruchterman-Reingold by name.
Next: into Force, then Advanced.

## Step 10

Command: `--step --click-at 594,446 --click "Advanced"` -> 10.png

Saw: Advanced opened: Spring Coefficient 0.0008, Theta 0.8, Drag Coefficient 0.02, Time Step 20, Seed 1 with an x and "Reshuffle". "Applied" greyed.
In character: "Theta 0.8 -- Barnes-Hut approximation, so this is a classic spring-electrical simulation; 'gravity' here is the charge, negative means repulsion. That's not ForceAtlas2 and nothing says which implementation, but at least there is a seed and it is shown. I can write the seed down. That's more than Gephi gives me." No LinLog, no prevent overlap, no dissuade hubs.
Next: push the groups apart: stronger repulsion (Gravity -1.2 -> -4) and shorter springs (30 -> 20), so cliques stay tight and separate. Then Apply.

## Step 11

Command: `--step --click "Gravity" --key Control+a --type "-4" --click "Spring length" --key Control+a --type "20"` -> 11.png

Saw: Spring length 20, Gravity -4 (with a small x to reset it, I assume), Apply blue again.
Next: Apply.

## Step 12

Command: `--step --click "Apply"` -> 12.png

Saw: worse. The whole graph spread into an even mesh filling the canvas; the cliques I could see before are gone, Myriel's fan dissolved, every edge crosses the middle. A hairball again, just a wider one.
In character: "Well, that was the wrong direction -- more repulsion with this model just inflates everything evenly. In ForceAtlas2 I'd know what each knob does; here 'gravity -4' means nothing to me. Fine. This is exactly where Gephi fails me: can I get back?"
Next: Ctrl+Z, the moment I made a mistake -- does undo cover a layout run?

## Step 13

Command: `--step --key Control+z` -> 13.png

Saw: the earlier flat drawing is back -- the same shape as after my first 2D apply (cliques top right, left, bottom; Myriel's fan on the left). Redo arrow is now active. The view is a bit more zoomed in than before, so Myriel's fan and one pendant on the right are cut off at the edges, but the positions are the old ones.
In character: "Undo covers a layout run. A decade of asking Gephi for that. Noted -- grudgingly."
Next: I want to know whether the visual clusters are real communities. Spatialize first, then modularity -- my usual order. Open the flask (Analyze) and look for modularity / Louvain.

## Step 14

Command: `--step --click-at 680,864` -> 14.png

Saw: an Analyze menu with a "Filter analyses" box focused. Section "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank ("Start here"), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order... No modularity in view.
In character: "There's a filter box. I'll type the word I use."
Next: type "modularity".

## Step 15

Command: `--step --type "modularity"` -> 15.png

Saw: "modularity" found two entries under "Find groups": Louvain ("Start here") and Leiden. The search understood my word even though the list says "groups".
In character: "Louvain. Named. Good -- that I can cite."
Next: click Louvain.

## Step 16

Command: `--step --click "Louvain"` -> 16.png

Saw: Louvain settings: Resolution 1 (the parameter I'd want), an Advanced section, Run.
In character: "Resolution 1.0 -- same as Gephi's default. Run it."
Next: Run.

## Step 17

Command: `--step --click "Run"` -> 17.png

Saw: nodes colored by six communities. Left panel now lists "Communities 6" with Group 1 (20), Group 2 (17), Group 3 (11), Group 4 (11), Group 5 (10), Group 6 (8) -- ordered by size, which is what I tell students to look at instead of the ids. A legend box "Color: Communities" appeared on the canvas itself. Palette looks like Okabe-Ito -- colorblind-safe, though Group 2 light blue and Group 4 dark blue are close.
Reading the map against the colors: the 2D force drawing already separates three of them cleanly -- light blue top right, orange clique top left, yellow at the bottom -- and Myriel's group (pink) sits on the far left. Green and dark blue interleave in the middle; that's the Valjean core, where the spatialization can't separate them.
In character: "So the spatialized clusters are real, mostly. A legend on the canvas -- if that survives export, Inkscape just lost a customer. I didn't check whether the color stays put on rerun."
Next: the menu said "Rings by group" needs an attribute -- now I have one. Try it as the alternative arrangement and compare.

## Step 18

Command: `--step --click "Layout"` -> 18.png

Saw: "Rings by group" and "Columns by group" are still greyed with "Needs a node attribute to group by" -- even though I just computed a community for every node and the panel shows it.
In character: "I have a partition. It's right there. Why doesn't the layout see it? Does the Louvain result not count as an attribute?"
Hesitation: is it really disabled, or just styled grey?
Next: click "Rings by group" anyway.

## Step 19

Command: `--step --click-at 619,558` -> 19.png

Saw: nothing happened; the row only highlighted. It is genuinely disabled. The tool does not count the Louvain communities as something to group by.
In character: "Dead end. In Gephi a modularity class is just a column and every layout plugin can read it. Here the community result lives somewhere the layout can't reach."
Next: one more alternative for comparison -- Spectral. I don't expect much from spectral for community separation on this graph, but it's a different arrangement and cheap to try.

## Step 20

Command: `--step --click "Spectral"` -> 20.png

Saw: Spectral settings: "Places nodes from the graph's own structure, so densely connected groups land near each other without any grouping being named." "Draws flat." Scale 1, Advanced, Apply.
Next: Apply.

## Step 21

Command: `--step --click "Apply"` -> 21.png

Saw: as I feared. Spectral collapsed almost everything into a knot in the top corner, with two long spikes: two pendant chains (a light-blue pair and a yellow-pink chain) stretched to the far edges. The communities are unreadable. Also the view doesn't refit sensibly -- the knot is half under the legend box.
In character: "Textbook spectral on a graph with pendants: the low eigenvectors find the dangling nodes, not the communities. Not the tool's fault, but the description promised 'densely connected groups land near each other'. They land on top of each other."
Next: Ctrl+Z back to the 2D force drawing.

## Step 22

Command: `--step --key Control+z` -> 22.png

Saw: undo put the force positions and the community colors back, but the camera stayed where Spectral left it: the drawing sits in the top-left corner, half off the canvas and half under the legend box, with most of the canvas empty.
In character: "Undo restored the positions but not the view. Annoying, not fatal. Where's 'center on graph'? Gephi has the magnifier-with-a-square button."
Hesitation: no obvious "fit" button; the bottom toolbar has Analyze, Layout, 3D and a magnifier (search, I assume).
Next: pan the drawing back to the middle by dragging the empty canvas.

## Step 23

Command: `--step --drag 900,600 1150,850` -> 23.png

Saw: the drag did not pan -- it ROTATED the camera. The flat drawing is now seen tilted in perspective, stretched diagonally across the canvas, near nodes bigger than far ones, the top running off the right edge. The communities are still in their places but the picture is distorted.
In character: "I laid it out in 2D and the camera is still a 3D orbit camera. That's the 'occlusion with extra steps' I warned my students about, and I didn't even ask for it. So that '3D' button at the bottom is the camera, not the layout."
Next: open the "3D" control at the bottom and switch it to 2D.

## Step 24

Command: `--step --click-at 767,864` -> 24.png

Saw: the "View" menu: 2D (key 5), 3D (checked), VR / AR (no device), Fit (0), Frame selection (F), Front/Side/Top/Isometric, Show Legend (L, checked), Table (Shift+T). So the fit button exists, it just lives under "3D".
In character: "There's the 'center on graph' -- hidden under a button labeled '3D'. And a Table. Fine. 2D camera, then Fit."
Next: click 2D, then Fit.

## Step 25

Command: `--step --click "2D"` -> 25.png

Saw: a proper flat map, refitted to the canvas, flat discs instead of shaded balls, bottom button now reads "2D". Reading it with the Louvain colors: light-blue clique top right, orange clique top left, pink fan (Myriel and his visitors) far left, yellow group at the bottom around the big hub in the middle, and green and dark-blue interleaved in the core. Three or four communities are clearly separated in space; the core two are not.
In character: "That's a map I can read. That's the answer."
Next: stop -- task done.

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s42`

## Verdict (in character)

**Did I finish?** Yes. I rearranged the drawing and it helped -- a lot, once I found the right two switches.

**Did it help?** Yes. The default drawing is a 3D force layout seen through a 3D camera, and most of the "hairball" was occlusion: nodes stacked behind each other. Switching the Force layout's Shape to 2D (Layout > Force > 2D > Apply) gave a flat map where the cliques separate. Coloring by Louvain communities confirmed three or four of them are spatially distinct (the top-right clique, the top-left clique, Myriel's fan, the bottom group); the two core communities around the main hub stay interleaved, which no force layout would fully fix on this graph. Turning up repulsion made it worse (an even mesh), and Spectral made it much worse (everything in one knot with two pendant chains flung to the edges). So: "flat force" helped; "more force" and "spectral" did not.

**Ease: 4 out of 7.** Fast where it counted, but I had to find three separate "2D" switches-in-spirit: the layout's Shape, and then the camera hidden under a button that still said "3D" after my layout was flat. I only found the camera because a drag rotated my flat map into a tilted perspective.

**What confused me:**

- The layout is called "Force", "Recommended", with no algorithm name. Advanced shows Theta and a drag coefficient, so it's a Barnes-Hut spring-electrical simulation, but I could not write it in a methods section. No ForceAtlas2, no LinLog, no prevent overlap.
- "Gravity" is negative and behaves like repulsion; no units, no hint which direction separates clusters. My first guess (more repulsion) made it worse.
- The Force description says "with 'dim: 2'" -- a config key in user-facing text.
- Two different "3D"s: the layout's Shape and the camera. After a 2D layout the camera stays 3D, and dragging the canvas rotates the flat map into perspective instead of panning it.
- "Fit" (center the graph) lives inside the "3D" camera menu; I'd never have looked there.
- Undo restored positions but not the view, leaving the graph half off-screen under the legend.
- "Rings by group" and "Columns by group" stay disabled ("Needs a node attribute to group by") even after Louvain gave every node a community. My partition was right there and the layouts couldn't use it.
- Spectral's description promises that densely connected groups land near each other; on this graph they land on top of each other.

**What I liked, grudgingly:** the counts matched (77/254, density checks out); undo covers a layout run (Gephi never had that); the seed is visible and editable; Louvain is named, with resolution shown; the analysis search understood "modularity"; communities are listed by size; a legend appears on the canvas; colorblind-friendly palette.

"Better than the five-minute test I expected to fail. I still can't cite 'Force'. For teaching, maybe. For a paper figure, I'd stay on Gephi until it tells me what the layout is."
