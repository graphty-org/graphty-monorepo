# Session r1-s41 -- Analyst Alex

## Step 1 (start)
Command: `REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <session> empty`
Screenshot 01.png: landing page. "Free and open source", "It never leaves your computer" under the drop line -- good, that answers my first question. Buttons: Open a file, Open network data, Samples, New project. Les Mis is a sample, so I'll click Samples.

## Step 2
Command: `--step --click "Samples"` -> ambiguous (button and top-nav link). Nothing happened. Clicking the big Samples button in the card instead (point at 455,540).

## Step 3
Command: `--step --click-at 455,540` -> button "Samples". Screenshot 03.png: Sample library. First card "Who holds the novel together -- Les Miserables -- 77 nodes, 254 edges". Counts shown up front, I like that. Clicking it.

## Step 4
Command: `--step --click-at 168,472` -> "Open the Les Miserables sample". Screenshot 04.png: graph loaded, all blue. Right panel: Nodes 77, Edges 254, 1 component -- matches the card. Good. Now I need communities. No obvious "Run algorithm" button; the bottom toolbar has a flask icon, which smells like "analysis". Hovering it first.

## Step 5
Command: `--step --hover-at 615,864` -> tooltip "Analyze Shift+A". That's the one. Clicking Analyze.

## Step 6
Command: `--step --click "Analyze"`. Screenshot 06.png: a list of analyses with a "Filter analyses" box, centrality first. One-line descriptions, nice. I want communities -- typing "louvain" like I would in Gephi.

## Step 7
Command: `--step --type "louvain"`. Screenshot 07.png: one hit, "Louvain -- Which nodes form densely linked groups" under "Find groups". Clicking it.

## Step 8
Command: `--step --click-at 615,455` -> option "Louvain". Screenshot 08.png: Louvain settings: Resolution 1, Weight None, a little gear icon, "Under a second" estimate (good, I know it won't hang), Run. No seed visible -- the gear may hide it, but the task doesn't need it. Hitting Run with defaults.

## Step 9
Command: `--step --click "Run"`. Screenshot 09.png: done instantly. Six groups colored, a legend "Color: Louvain, Group 1..6" (no counts in the legend though), and a "Louvain" layer appeared in Style layers. Blue vs light blue vs green are a bit close for me but distinguishable. Now: which group is Javert in? No labels drawn. Typing Javert in the "Find nodes, edges, values" box.

## Step 10
Command: `--step --click "Find nodes, edges, values" --type "Javert"`. Screenshot 10.png: Nodes 1 -> Javert, Edges 17. Clicking the Javert node row to see its details and which group it's in.

## Step 11
Command: `--step --click-at 114,153` -> option "Javert". Screenshot 11.png: right panel shows Javert, Degree 17, Memberships: Louvain -> Group 3. Group 3 is the green one. Now I want Group 3 red. First guess: click the green swatch for Group 3 in the legend, like a Gephi partition palette.

## Step 12
Command: `--step --click-at 338,151` -> img "green". Screenshot 12.png: nothing happened, the legend is just a picture. Next guess: the "Louvain" folder in Style layers on the left. Clicking it.

## Step 13
Command: `--step --click-at 118,216` -> treeitem "Louvain, folder, 6 layers". Screenshot 13.png: right panel shows the Louvain folder's style. Fill Color "<<Layer>>" with six little swatches under it (orange, light blue, green, blue, dark orange, pink). "Which nodes", "Louvain: <<Layer>>" -- a bit developer-speak. The third swatch is the green one = Group 3. Clicking it.

## Step 14
Command: `--step --click-at 1291,475` -> group "Fill Color <<Layer>>". Screenshot 14.png: nothing changed. The swatches are just a preview. It says the folder holds 6 layers -- probably one per group. Expanding the folder with the little arrow next to "Louvain".

## Step 15
Command: `--step --click-at 64,216`. Screenshot 15.png: folder opened, one layer per group with counts: Group 1 20, Group 2 17, Group 3 11, Group 4 11, Group 5 10, Group 6 8 -- adds to 77, good. So Javert's circle (Group 3) has 11. These counts should be in the floating legend too. Clicking the Group 3 layer to change its color.

## Step 16
Command: `--step --click-at 160,312` -> treeitem "Group 3, node layer, 11 nodes". Screenshot 16.png: right panel "Group 3", "Louvain: Group 3, 11 nodes" confirms 11. Fill Color 009E73 as a hex box. Bright red = FF0000. Clicking the hex box, selecting all, typing FF0000, Enter.

## Step 17
Command: `--step --click-at 1320,415 --key Control+a --type "FF0000" --key Enter` -> input "Node color, set here, green". Screenshot 17.png: Group 3's nodes are now bright red on the canvas, the layer swatch and the legend both say red for Group 3, and the other five groups kept their colors. Javert (the selected node) is red. Done.

## End of session (in character)

**Did I finish?** Yes. Les Miserables opened from Samples (77 nodes, 254 edges, matched the card), Louvain ran in under a second and colored six groups, Javert is in Group 3, I set Group 3 to FF0000 and the others stayed as they were. **Javert's circle has 11 characters.**

**Ease: 5 out of 7.** Loading and running were quick: search box in Analyze found "louvain" straight away, and it told me "Under a second" before I clicked, which I appreciate. Finding Javert by typing his name and seeing "Memberships: Louvain Group 3" was good. What took longest was recoloring a group.

**What confused me / what took longest:**
- "Samples" was two things with the same name (a top-nav link and the big button); minor.
- The floating legend (Color: Louvain, Group 1..6) looks clickable but isn't, and it doesn't show how many nodes are in each group. I had to go find the counts elsewhere.
- In the Louvain folder's style panel the six little swatches under "<<Layer>>" look like a palette I can click; they aren't. "<<Layer>>" and "Which nodes / Louvain: <<Layer>>" read like developer-speak.
- The real answer was hidden behind a tiny expand arrow next to the "Louvain" folder in Style layers. Once open it was fine: one row per group with counts, click one, change the hex. But I only found it on my third guess. That's 4 clicks for something I'd do every week.
- Groups are just "Group 1..6" -- I'd have to rename them for a deck, and I didn't see whether a rerun keeps the same numbering, or any seed setting (maybe behind the little gear in the Louvain panel).
- Colour: the new red sits next to Group 5's dark orange; with my eyes those two are close. Fine for the task, but I'd probably pick a different contrast for a slide.
