# Session r1-s44 -- Grace (nonprofit operations analyst)

Task: open the ready-made college football network, have the program find its own clusters (not the conferences), color Nebraska's cluster bright red, leave others alone, count teams in it.

## Step 1 -- start
Command: real.mjs --start <folder> empty -> 01.png
Notes: A landing page. "Open a file", "Open network data", "Samples". Ready-made network = Samples, I think. I'll click Samples.

## Step 2
Command: --click-at 455,540 (Samples) -> 02.png
Notes: Sample library. "Conferences fall out of who played whom -- College football, 115 nodes, 613 edges". Clicking that card.

## Step 3
Command: --click-at 711,480 (College football card) -> 03.png
Notes: Loaded. 115 nodes, 613 edges, all nodes one blue. Need clusters. Bottom toolbar has a flask icon; hovering to see what it is.

## Step 4
Command: --hover-at 615,864 -> 04.png
Notes: Tooltip "Analyze Shift+A". Clicking it.

## Step 5
Command: --click "Analyze" -> 05.png
Notes: A menu "Filter analyses" with "Rank nodes and edges" (Degree, Betweenness...). Plain descriptions under each, nice. I want groups; typing "cluster" in the filter.

## Step 6
Command: --type "cluster" -> 06.png
Notes: "Find groups" section: Louvain ("Which nodes form densely linked groups"), Leiden, Label propagation, Markov, Spectral, Hierarchical. Names are jargon but descriptions are plain. Picking Louvain - first and simplest description.

## Step 7
Command: --click-at 520,516 (Louvain) -> 07.png
Notes: Louvain panel: Resolution 1, Weight None, "Under a second", Run. Leaving defaults, clicking Run.

## Step 8
Command: --click "Run" -> 08.png
Notes: Teams colored in 10 groups, legend "Color: Louvain" Group 1..10. A "Louvain" layer appeared in Style layers. No names on dots. Searching for Nebraska in the top-left find box.

## Step 9
Command: --click "Find nodes, edges, values" --type "Nebraska" -> 09.png
Notes: Nodes 1: Nebraska, plus 11 edges (Iowa, Kansas, Colorado, Oklahoma...). Clicking the Nebraska node row to see its group.

## Step 10
Command: --click-at 123,153 (Nebraska) -> 10.png
Notes: Right panel: Nebraska, id 74, Memberships: Louvain Group 4 (light blue in the legend). Now to recolor Group 4. Trying the legend swatch for Group 4.

## Step 11
Command: --click-at 338,183 (legend swatch) -> 11.png
Notes: Nothing. Legend is not clickable. Expanding the "Louvain" folder in Style layers via its arrow.

## Step 12
Command: --click-at 64,216 (expand Louvain) -> 12.png
Notes: Louvain folder has Group 1..10 rows with counts: 16,15,14,12,11,10,10,9,9,9 = 115. Group 4 (light blue) = 12. Clicking the Group 4 row to change its color.

## Step 13
Command: --click-at 165,344 (Group 4 row) -> 13.png
Notes: Right panel shows Group 4 node layer, "Louvain: Group 4, 12 nodes", Fill Color A1CAF1. Clicking the color text, select all, type FF0000, Enter.

## Step 14
Command: --click-at 1320,415 --key Control+a --type "FF0000" --key Enter -> 14.png
Notes: Group 4's teams turned bright red, in the drawing and in the legend. Other groups look unchanged. Done. Not ending: the facilitator ends the session.

## Wrap-up (in character, Grace)
- Finished? Yes. I opened College football from Samples (115 teams). Analyze, filter "cluster", "Find groups", Louvain, Run gave 10 groups. Searching "Nebraska" showed it is in Louvain Group 4. I opened the Louvain folder in Style layers, clicked Group 4 and set Fill Color to FF0000. **Nebraska's cluster has 12 teams.** The group counts add up to 115 (16+15+14+12+11+10+10+9+9+9).
- Ease: 6 out of 7.
- What confused me:
  - The group finders have technical names (Louvain, Leiden, Markov). I chose by the plain one-line description, which helped. Still, "Louvain" is not a word I would put on a slide, and the legend title says "Color: Louvain".
  - I clicked a color square in the floating legend first, expecting to recolor the group there. It did nothing. The place to change it was the folder arrow in Style layers, which I only found by poking around.
  - The node panel said "Louvain: Group 4", but nothing linked from there to that group's color setting.
  - Group 5 is already a dark crimson, close to my new bright red. A board might not tell the two groups apart.
  - Color is a hex box. I know FF0000 from Excel, but most of my colleagues would not. I did not see a plain color picker.
- Good: nothing to install, "Local only" with a lock (my data stays put), counts shown on every group, plain descriptions in the Analyze list.
