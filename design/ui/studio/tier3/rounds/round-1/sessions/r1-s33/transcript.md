# Session r1-s33 -- Maren (genomics Cytoscape user)

Task: bring volunteers.graphml in, size people by hours given this quarter, say who gave the most.

## Step 0 -- start

Command:
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3 node .../design/ui/studio/tool/real.mjs --start <session folder> empty

(Waited for a free browser slot.)
01.png: landing page. A spinning 3D ball network as decoration (suspicious, but fine). Big "Open a file" button lists GraphML.

## Step 1
Notes: "Open a file, it says GraphML. Good."
Command: --step --click "Open a file" --upload volunteers.graphml
02.png: "Open as a new graph" preview. Says "volunteers: 24 nodes, 63 edges" and at the bottom "24 node rows and 63 edge rows read; the load makes 24 nodes and 63 edges." -- Oh, it actually tells me the count and that nothing was dropped. Good. Columns id, name, role, hours (whole number), trained, phone. Hours has values (12, 48, 22...), not empty headers.

## Step 2
Notes: "Counts match, hours has numbers. Load."
Command: --step --click "Load"
03.png: network drawn, 24 nodes 63 edges, three clusters, all blue balls, no labels. Says 3D on the bottom toolbar. Right panel has Style / Values tabs. Left has Style layers (Hovered, Selected, Everything). In Cytoscape I'd now go to the Style panel and map node size to the hours column, continuous mapping.

## Step 3
Notes: "Style tab on the right, like Cytoscape's Style panel."
Command: --step --click "role=tab:Style"
04.png: that Style tab is only canvas stuff (background, lighting, outline width, labels toggles). No node size here. The left side has "Style layers" with a row "Everything 24". Maybe that's the default node style.

## Step 4
Notes: "Everything = all nodes, presumably the default style."
Command: --step --click "Everything"
05.png: right panel now "Everything, node and edge layer". Shape: Icosphere, Size: 1, Fill color 6366F1. Next to Size there's a little chain-link icon. In Cytoscape that's where I'd pick "Mapping: continuous" from the column dropdown. I'm guessing the link icon means "link to a column".

## Step 5
Command: --step --hover-at 1380,320
Tooltip: "Node size by attribute". Good, that's the mapping.

## Step 6
Command: --step --click "Node size by attribute"
07.png: popover "Node size by attribute": Fixed size; Data: "# hours 2 to 52"; "Does not fit: 5 attributes, Show why". Nice -- it shows the range of the column and even says which columns don't fit instead of hiding them. That's the opposite of Cytoscape's "Name, Selected" only list.

## Step 7
Command: --step --click "hours"
08.png: nodes are now different sizes, and a legend box appeared top-left of the canvas: "Size: hours  2 [wedge] 52". Under Size it says "hours, From 1 to 3". A legend that appears on its own -- good, that's what I always fight for. Now: who gave the most? No names on the nodes. In Cytoscape I'd sort the node table by the column. There's a table-looking icon in the bottom toolbar.

## Step 8
Command: --step --hover-at 793,864  -> tooltip "Table Shift+T"
Command: --step --click "Table"
10.png: node table at the bottom, "In the order loaded", 24 nodes, columns id/name/role/hours/trained/phone. Hannah Weiss 52 is visible; James Carter 48. I want it sorted to be sure. Clicking the hours header.

## Step 9
Command: --step --click-at 583,533  (the "hours" header button)
11.png: "Sorted by hours, highest first". Top: v09 Hannah Weiss, staff, 52 hours. Then James Carter 48, Ken Ito 44, Ben Adler 40, Zara Ahmed 38. Matches the legend's 52 maximum. The canvas shows the bigger balls for these.

Stopping here: task done.

## End of session (in character)

Did I finish? Yes. The roster loaded, node size is mapped to hours (legend on the canvas says "Size: hours 2 to 52"), and the person who gave the most is Hannah Weiss, 52 hours (staff), followed by James Carter at 48.

Ease: 6 out of 7.

What worked: the import told me straight away "24 node rows and 63 edge rows read; the load makes 24 nodes and 63 edges" -- an actual count, so I knew nothing was dropped. The size-by-attribute picker listed hours with its range (2 to 52) and said which columns did not fit and offered "Show why" instead of silently hiding them. The legend appeared on its own. Sorting the table by clicking the header just worked.

What confused me / complaints:
- The right-hand "Style" tab first showed only canvas settings (background, lighting); node size lives in the "Everything" layer on the left. I had to guess that "Everything" meant "all nodes". In Cytoscape the node style is right there.
- The "map to a column" control is a tiny chain-link icon with no label; I only clicked it after hovering it. I would not click an unlabelled icon otherwise.
- "From 1 to 3" under Size: three times what? It doesn't say the unit or that 2 hours -> 1 and 52 -> 3. Is it linear? Can I change the range so the busiest stand out more?
- There are no names on the nodes, so on the picture alone I cannot tell who the big ball is; I had to go to the table. For an annual report I'd want labels on at least the big ones.
- It opened as 3D balls with shading. For a report figure I'd want a flat 2D view; I saw a "3D" switch but did not need it for this task.
- Haven't checked whether the legend comes out in an exported image -- that's what I'd test next.
