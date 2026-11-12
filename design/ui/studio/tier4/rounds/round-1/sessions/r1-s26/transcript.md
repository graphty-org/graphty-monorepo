# Session r1-s26 transcript (Tom)

Task: make a GraphML file of the whole network for the river council colleague, and say where it ended up.

## Step 0
Command: real.mjs --start <folder> setup:gauges-narrowed.txt
Screenshot 01.png. The gauge project is open, with a table under the drawing. Up top it says "11 of 12 nodes, 13 of 14 edges", which is odd, but I didn't do that. I need to save a GraphML file. I usually go to File, so I'll try the menu button at the top left (three lines).

## Step 1
Command: --step --click "Main menu"
Screenshot 02.png. A menu opened: Save, Save as, Save local copy, Export. "Export..." sounds like making a file for someone else. I'll click Export.

## Step 2
Command: --step --click "Export..."
Screenshot 03.png. An Export window, on "Data". Format says CSV, Table Nodes, Scope "All 12". He wants GraphML, so I'll open the Format box.

## Step 3
Command: --step --click "Format"
Screenshot 04.png. A long list. Under "Network files" there's GraphML. That's what he asked for.

## Step 4
Command: --step --click "role=option:GraphML"
Screenshot 05.png. GraphML is picked. Scope reads "All 12 nodes, 14 edges" -- that matches the "Full graph" numbers on the right (12 and 14), so it's the whole thing, not the 11 the top bar shows. There's a yellow line "Lost in GraphML: node visible not written" -- not sure what that means, but nothing about missing gauges, so I'll leave it. Press Export.

## Step 5
Command: --step --click "Export"
Screenshot 06.png. It stopped me with an orange box: "Styles lost in GraphML". He uses another program anyway, he wants the gauges and the links, not our look. It doesn't say any gauges go missing, and the scope still says all 12 and 14. I'll press "Save anyway".

## Step 6
Command: --step --click "Save anyway"
Tool output: a file was saved: gauges_graph.graphml, 14,093 bytes (downloads/gauges_graph.graphml in the session folder).
Screenshot 07.png. Black notice: "Exported gauges_graph.graphml". The window closed, the project looks the same as before, top bar still says 11 of 12. I'm done.

## End (in character)

Did I finish? Yes. The file is called gauges_graph.graphml (about 14 KB) and the browser put it in my downloads folder (in this session: downloads/gauges_graph.graphml). I'll attach that to the email for him. It should have all 12 gauges and 14 links -- the Export window said "All 12 nodes, 14 edges", even though the top of the screen says only 11 of 12 are showing.

Ease: 6 out of 7. Menu, Export, pick GraphML, Export, Save anyway. Five clicks.

What confused me:
- The notice only said "Exported gauges_graph.graphml". It didn't say where it went; I'm assuming my Downloads folder because that's where the browser puts things. I'd have liked it to say.
- The top bar says "11 of 12 nodes" and I don't know why one is hidden -- I didn't hide it. I had to compare the Export "Scope" number with the "Full graph" numbers on the right to be sure he gets all 12. If the Scope box had said 11 I wouldn't have known what to pick.
- "Lost in GraphML: node visible not written" and then "Styles lost in GraphML ... Reopened: layers as layers". I don't know what "node visible" or "layers as layers" means. It sounded like the look gets lost, not the gauges, so I pressed Save anyway, but I'd probably ask her about that bit.
- The format list is long (Gephi CSV, Neo4j, Cytoscape, vis.js, d3...). GraphML was there, I just had to find it.
- I didn't change the lab's project as far as I can tell: it still says Autosave: saved and looks the same.
