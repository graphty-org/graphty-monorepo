# Session r1-s26 -- Ruth, the reporter

Command prefix used for every step (abbreviated below as `real.mjs`):
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 node design/ui/studio/tool/real.mjs` with folder `.../sessions/r1-s26`

## Step 01 -- start
Command: `real.mjs --start <folder> empty`
Seen: a landing page. Big green "Open a file" button, "CSV, GraphML, GEXF, Cytoscape, or a saved project". Below it, "Or drop a file anywhere. It never leaves your computer." Good -- that's the first thing I wanted to know. A sample graph spins on the right.
Next: click "Open a file" and give it sources.graphml.

## Step 02 -- open the file
Command: `real.mjs --step <folder> --click "Open a file" --upload sources.graphml`
Seen: "Open as a new graph" preview. Header: "sources: 24 nodes, 59 edges". Footer: "24 node rows and 59 edge rows read; the load makes 24 nodes and 59 edges." That is exactly the check I wanted: rows read vs. things made, and they agree. Nothing dropped. Table shows id, name, kind (company / person / agency), donations, on_record, email. The "kind" column is what I'll need for the coloring.
Answer so far: 24 sources, 59 ties.
Next: click "Load".

## Step 03 -- load
Command: `real.mjs --step <folder> --click "Load"`
Seen: the graph, all purple-blue dots, no names drawn. Right panel "Values": Nodes 24, Edges 59, Direction Undirected. Matches the preview. So: 24 sources, 59 ties. Written down.
Left: "Style layers" with Hovered, Selected, Everything (24) and a "+" button. A notice that the browser may clear what it keeps -- noted, not now.
Next: the "+" next to Style layers, to make a layer for companies and agencies.

## Step 04 -- the plus button
Command: `real.mjs --step <folder> --click-at 276,122` (button "Add a layer or a folder")
Seen: menu: Layer, Folder, Select layers..., Analyze... "Layer" sounds right.
Next: click "Layer".

## Step 05 -- new layer
Command: `real.mjs --step <folder> --click-at 178,158` (menuitem "Layer")
Seen: "Layer 1" with its name selected for editing; it covers 24 nodes. Right panel: "Which nodes: 24 of 24 nodes. All 24 nodes: add a condition to narrow". Then Shape, Visibility, Text, Fill...
Next: name it "Organizations" and press Enter.

## Step 06 -- rename
Command: `real.mjs --step <folder> --type "Organizations" --key Enter`
Seen: layer is "Organizations", still 24 nodes. It must be narrowed to company and agency.
Next: open "Which nodes".

## Step 07 -- Which nodes
Command: `real.mjs --step <folder> --click "Which nodes"`
Seen: "Nodes that pass every condition" and "+ Add a condition". "Every" worries me: I need company OR agency. Let's see what a condition offers.
Next: "Add a condition".

## Step 08 -- Add a condition
Command: `real.mjs --step <folder> --click "Add a condition"`
Seen: attribute list: name, kind (3 values), donations, on_record, email, Node id. "kind, 3 values" -- company, person, agency.
Next: click "kind".

## Step 09 -- kind
Command: `real.mjs --step <folder> --click-at 1268,372` (option "kind, 3 values")
Seen: "kind / Is any of" with checkboxes: person 14 nodes, company 6 nodes, agency 4 nodes. 14 + 6 + 4 = 24. Everything accounted for. "Is any of" answers my OR worry.
Next: tick company and agency.

## Step 10 -- tick company and agency
Command: `real.mjs --step <folder> --click "company, 6 nodes" --click "agency, 4 nodes"`
Seen: both ticked; "10 of 24 nodes", layer list says Organizations 10. 6 + 4 = 10. Correct.
Next: "Done", then Fill.

## Step 11 -- Done
Command: `real.mjs --step <folder> --click "Done"`
Seen: summary "kind: company, agency, 10 nodes". Nothing on the picture changed yet (no style set). Odd point: every dot is already a blue-purple, so "blue" needs to be clearly a different blue from the people.
Next: the "+" beside Fill.

## Step 12 -- Fill +
Command: `real.mjs --step <folder> --click-at 1404,381` (button "Add to node fill")
Seen: "Color 6366F1" with the code selected. That's the same purple-blue every dot already has -- so the default IS that color. I want a plain blue. I don't know codes by heart; I'll try typing the word.
Next: type "blue", Enter.

## Step 13 -- type "blue"
Command: `real.mjs --step <folder> --type "blue" --key Enter`
Seen: it took the word and turned it into 0000FF. Ten dots are now a deep pure blue; the rest keep the default purple-blue. I count the deep blue ones: 10. A legend appeared top left: "Color: Organizations, 10 of 24 nodes". Matches 6 companies + 4 agencies.
Complaint: the people's default is itself a blue-violet, so the contrast is weaker than I'd like for a graphics desk. But the task says leave the people as they are.
Next: hover one deep blue dot to check it really is an organization (no names are drawn, so I can't tell by looking).

## Step 14 -- hover a blue dot
Command: `real.mjs --step <folder> --hover-at 1151,199`
Seen: nothing told me who it is -- no tooltip, no name. Only "Hovered 1" in the layer list. Says who?
Next: click it to see its details.

## Step 15 -- click the blue dot
Command: `real.mjs --step <folder> --click-at 1151,199`
Seen: right panel: s15, name "Zoning Board", kind "agency", Degree 3. So the deep blue dot is an agency -- checked one, it holds. The whole picture slid left and shrank when I clicked (the camera moved on its own); not what I expected, but nothing was lost. Still 10 deep blue dots, 14 default ones; legend still "10 of 24 nodes".
Stopping here: the task is done.

## End of session (in character)

Did I finish? Yes.
- sources.graphml holds 24 sources (nodes) and 59 ties (edges). The preview said "24 node rows and 59 edge rows read; the load makes 24 nodes and 59 edges", and the Values panel after loading said Nodes 24, Edges 59. Two places agree.
- Companies (6) and agencies (4) are blue (0000FF) through a layer I called "Organizations"; the 14 people keep the default color. The layer's "kind / Is any of" checkboxes showed counts per value, 14 + 6 + 4 = 24, so I know nobody fell through.

Ease: 6 out of 7.

What helped: the import preview reporting rows read against nodes made -- that is the check I always do by hand. The condition list showed how many nodes each value covers before I committed. Typing the word "blue" worked.

What confused me / what I'd fix:
- "Nodes that pass every condition" made me fear I couldn't say company OR agency; it turned out "Is any of" inside one condition does that, but the wording up top sent me the wrong way first.
- The default dot color is already a blue-violet (6366F1). "Make organizations blue" leaves blue next to slightly-different blue. For a graphics desk that's a weak contrast; I'd want the people's default to not be blue, but the task said leave them.
- No names drawn on the dots, and hovering shows nothing. I had to click a dot to learn who it is. To check all ten, I'd have to click ten times.
- Clicking a dot moved the whole picture. Unasked-for movement makes me nervous that something else changed.
