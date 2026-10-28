# Session r1-s21 -- Dev (student), first-time user

Task: bring volunteers.graphml in, find the circles of people who do shifts together (each in its own color), then keep the circle color only for people who finished food-safety training; everyone else looks like when the file opened. Report how many still have a circle's color.

## Step 0 -- start

Command:
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3 node .../design/ui/studio/tool/real.mjs --start <session folder> empty

Output: "waiting for a free browser slot ..." (the tool waited for a browser before opening the app)

01.png: Landing page. "Analyze any network." Big green "Open a file" button (CSV, GraphML, GEXF...). Also Open network data, Samples, New project. A demo graph on the right already colored with "Communities".
Dev: "Okay, I read everything... the big button says Open a file and lists GraphML, that's my file. Clicking that."

## Step 1
Command: --step <folder> --click "Open a file" --upload volunteers.graphml
Output: file chooser opened, chose volunteers.graphml -> 02.png
02.png: "Open as a new graph" preview. volunteers: 24 nodes, 63 edges. Columns id, name, role, hours, trained (yes/no), phone. Bottom: "24 node rows and 63 edge rows read; the load makes 24 nodes and 63 edges." Load button bottom right.
Dev: "Oh nice, it shows me it worked, 24 nodes, 63 edges. And there's a 'trained' column with Yes/No -- that must be the food-safety training. Clicking Load."

## Step 2
Command: --step <folder> --click "Load"
03.png: The graph is drawn: three clumps of blue-purple balls. Left panel "Style layers" (Hovered, Selected, Everything 24). Right panel Graph > Values: 24 nodes, 63 edges, Undirected, density, degree chart. A toolbar at the bottom with icons (flask, a chart icon, 3D, list, table, filter, search). A notice: "This browser may clear what it keeps for this site. Save a copy to a file to be sure."
Dev: "Oh nice, there's the drawing, and I can already see three groups. Now in the tutorial I'd go to Statistics and run Modularity. Where are the statistics? Wait, there's a little flask at the bottom, that looks like 'analysis'. Trying that."

## Step 3
Command: --step <folder> --click-at 615,864   (the flask: button "Analyze")
04.png: A list of analyses with a "Filter analyses" box. "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank... long list, scrolls.
Dev: "Okay, Analyze, that's the Statistics. The tutorial calls it Modularity, so I'll type that in the filter box."

## Step 4
Command: --step <folder> --type "modularity"
05.png: Filter shows "Find groups": Louvain ("Which nodes form densely linked groups.") and Leiden.
Dev: "Wait, it found it even though I typed modularity -- 'Find groups', Louvain. I think the slides said Gephi's modularity is Louvain. Clicking Louvain."

## Step 5
Command: --step <folder> --click "Louvain"
06.png: Louvain settings: Resolution 1, Weight None, "Under a second", Run button.
Dev: "Resolution 1, like Gephi's default. Leaving it. Run."

## Step 6
Command: --step <folder> --click "Run"
07.png: Three colors now: Group 1 orange (bottom), Group 2 light blue (top right), Group 3 green (top left). A legend "Color: Louvain". In the left panel a new style layer "Louvain" (a folder) between Selected and Everything.
Dev: "Oh nice, that's it, three circles, each its own color! Essay sentence: 'The community detection found 3 groups.' Now the hard part -- only people who did food-safety training keep the color. In Gephi I'd use a filter... but filter would hide the others, and the task says the others should look like they did at the start, not vanish. Wait. The Louvain thing is a 'style layer'. Maybe I can tell that layer to only apply to trained people. Clicking the Louvain layer."

## Step 7
Command: --step <folder> --click "Louvain"
08.png: Right panel now shows "Louvain, Folder". "3 layers in Louvain. Layers added later are not changed." Node / Edge tabs. "Style nodes" checked. "Which nodes  24 of 24 nodes" with a chip "Louvain: <<Layer>>". Fill > Color shows the three swatches.
Dev: "Wait, 'Which nodes -- 24 of 24'. That's it! I want it to be only the trained ones. Opening 'Which nodes'."

## Step 8
Command: --step <folder> --click "Which nodes"
09.png: "Which nodes -- Nodes that pass every condition. 24 of 24 nodes." One condition card "Louvain <<Layer>> 3 layers Group 1, Group 2, Group 3". "+ Add a condition" and a Done button.
Dev: "Nodes that pass every condition -- so I add a second condition, trained is Yes. Add a condition."

## Step 9
Command: --step <folder> --click "Add a condition"
10.png: A list "Find an attribute": Data: name, role (3 values), hours (2 to 52), trained (2 values), phone. Results: Louvain (already a condition).
Dev: "trained, 2 values. That's the one."

## Step 10
Command: --step <folder> --click-at 1275,539   (option "trained, 2 values")
11.png: New condition card "trained -- 15 nodes" with a dropdown already set to "Yes". "Which nodes 15 of 24 nodes". Legend says "15 of 24 nodes". On the canvas, some balls went back to the original blue-purple; the rest keep orange/blue/green.
Dev: "Oh nice, it already picked Yes for me. And the untrained ones went back to that purple-blue they had when I opened the file. 15 of 24. Clicking Done."

## Step 11
Command: --step <folder> --click "Done"
12.png: Which nodes collapsed to two chips: "Louvain: <<Layer>>" and "trained: yes, 15 nodes". "15 of 24 nodes" shown in the panel and under the legend. Canvas: orange, light-blue and green balls for trained people; the untrained ones are the original blue-purple. Autosave: saved.
Dev: "That's it, I think I'm done. The legend even says 15 of 24 nodes. Essay sentence: 'Louvain community detection found 3 shift circles; of the 24 volunteers, 15 have finished food-safety training and are shown in their circle's color.'"

## End (in character)

Did I finish? Yes. Answer: 15 people still have a circle's color (15 of 24).

Ease: 6 out of 7 (easy).

What went well: the big "Open a file" button took the GraphML straight away and the preview told me it read 24 nodes and 63 edges, so I knew the import worked. Typing my tutorial word "modularity" into the analysis filter still found Louvain under "Find groups", and Run colored three groups with a legend right away. Picking "trained" as a condition defaulted to "Yes" and the count (15 of 24) showed right on the panel and under the legend.

What confused me: 
- I was looking for "Statistics" (the tutorial's word); here it is a flask icon with no label until I clicked it ("Analyze"). I guessed from the icon.
- I only found the "only trained people keep the color" step because I clicked the Louvain style layer on a hunch; I was expecting a "Filter", and the bottom bar also has a filter icon, so I was not sure which one was right. "Which nodes" inside a "Folder" with "<<Layer>>" chips is jargon I did not fully understand.
- I was not 100% sure the untrained balls were back to "exactly how they were" -- they look like the purple-blue from the start, but nothing said so in words.
- The notice "This browser may clear what it keeps for this site" made me nervous about losing work.
