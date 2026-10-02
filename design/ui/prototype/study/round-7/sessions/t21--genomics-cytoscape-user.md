# Session: two-line labels on the bishop's circle -- genomics Cytoscape user (Maren)

Task as given: "Have each character in the circle around the bishop carry two pieces of text in the drawing: what they are called on top, and underneath it how many remarks have been written about them."

Start screen: shots/tasks/t21/01.png. All commands run from design/ui/prototype. Renders are in tmp/round-7-sessions/t21--genomics-cytoscape-user/.

## Think-aloud

**Reading the start screen.** The bishop is Myriel, top right, with a little fan of nodes around him. In Cytoscape I'd click him, do First Neighbors, then set a label passthrough on name. Two lines would mean building a combined column by hand. Let's see.

**01 -- click Myriel.**
`timeout 120 node app-b/study.mjs --try .../01.png task:t21 --click "Myriel"`
It opened "Myriel to Javert", a shortest path row. Not the bishop. Annoying -- I clicked his name and got a path.

**02 -- Selection row.**
`--click "Selection"`
That's only how a selection looks (yellow, 1.45, 40%), and it says "Paints 0 nodes". Nothing here selects neighbors.

**03 -- Table.**
`--click "Table"`
Node table, sorted by degree. Myriel not in view. Columns: label, group, degree, PageRank, rank, betweenness. No notes-per-character column. Javert and Thenardier show a green swatch under "group".

**04 -- Label section.**
`--click "Label"`
Clicking the word does nothing. The plus is the button.

**05 -- guess the plus.**
`--click "Add label"` -> "nothing on screen is called Add label".

**06 -- hover to learn names.**
`--hover "Add"` (06-Add.png) shows "Add to Shape"; `--hover "More"` (06-More.png) shows "More actions". So the plus I want is "Add to Label".

**07 -- Add to Label (on PageRank, just to look).**
`--click "Add to Label"`
Menu: "Label line", "Show labels". "Label line" suggests more than one line is possible. Good. But PageRank paints all 77; I only want the bishop's people.

**08 -- Louvain.**
`--click "Louvain"`
Community table. Community 3: 10 members, 3 edges leaving, 2 notes. That smells like the bishop's household -- a tight little group hanging off Valjean. There is a Notes column, but it counts notes on communities, not on people.

**09, 11, 14, 16 -- hunting for a way to select his neighbors.**
Hovered "New row", "Add row", "Graph actions", "Row actions", "Layer actions", "Neighbors", "Selection tools", "Canvas menu", "Graph tree actions": none exist. "Select" only showed a tooltip "Built-in rows keep their names". "Analyze" is the flask, "Quick actions" is the lightning, "Options" turned out to be "List options" (the ... by the search).

**10 -- search box.**
`--click "Find rows and notes"` -- focuses it; I can't type here, so no use.

**12 -- Data rail.**
`--click "Data"` -- node attributes are label, group, degree, betweenness. No note count as an attribute.

**13 -- what can a label line hold?**
`--click "Add to Label" --click "Label line"`
Field picker: label, group, degree, betweenness, Louvain, PageRank, and under Notes: "Latest note" and "Note count". So the content exists. Now I need the right nodes.

**15 -- Quick actions.**
`--click "Quick actions"` -- a command palette, "Type a command or a place". Recent: Re-run layout, PageRank, Data: Attributes. Nothing about neighbors. It mentions a "Canvas menu", which I never found.

**17 -- List options.**
`--click "List options"` -- New folder, Show hidden rows, Collapse all. Nothing for selecting.

**18 -- try Myriel again after collapsing.**
`--click "List options" --click "Collapse all" --click "Myriel"` -- the path row is still there and I get "Myriel to Javert" again. I cannot get the bishop node itself.

**19 -- settle for Community 3.**
`--click "Louvain" --click "Community 3"`
Panel: "Community 3, Group from Louvain, Paints 10 nodes, Covered for Color by PageRank". I can't see green on the drawing, so I'm trusting this is Myriel's group. I don't like trusting.

**20, 21, 22 -- first label line.**
`... --click "Add to Label" --click "Label line" --click "label"` -- "label" hit the table's column header and sorted it. Line shows "Above: Pick a field".
Adding `--click "Pick a field"` before "label" just closed the picker (it was already open). `--click "Name, Label"` -> nothing called that. The table at the bottom is in my way.

**23 -- find the table's close control.**
`--hover "Collapse"` -> "Collapse the table (Shift+T)".

**24 -- first line, table collapsed.**
`--click "Louvain" --click "Community 3" --click "Collapse the table" --click "Add to Label" --click "Label line" --click "label"`
"Above: Abc label". But no new names appear around Myriel on the drawing.

**25 -- second line.**
`... --click "Add to Label" --click "Label line" --click "Note count"`
Tool said nothing is called "Label line" the second time -- the plus went straight to a new "Below" line with the picker open. Result: "Above: label", "Below: # Note count". That's the arrangement asked for. The drawing still shows no labels on the fan around Myriel.

**26 -- check who is in Community 3.**
`... --click "Data"` -- went to the Data rail (whole dataset), not the row's Data tab. Still no member list.

## Where I stopped

The panel says what I wanted: name on top, note count underneath, on Community 3. But:
- I never got a selection of the bishop and his neighbors. Clicking "Myriel" always gave me the shortest-path row. I used a Louvain community as a stand-in and never confirmed its members. The green in the node table's "group" column on Javert and Thenardier made me doubt it -- maybe a different grouping, maybe not.
- Nothing appeared on the drawing. If I set a label in Cytoscape and the network didn't change, I'd assume I did it wrong.

## Verdict

- Succeeded? Not sure -- probably partly. The label setup is right; whether it is on the right people, and whether it shows, I could not see.
- Single Ease Question: 2 of 7.
- Would I use this instead of Cytoscape? No. "Note count" as a label field without building a column is genuinely nice -- in Cytoscape I'd be concatenating columns in the table. But I couldn't select a node and its first neighbors, which is the most basic thing I do, and the drawing didn't confirm my change. Two silent things in one task; I'd stop trusting it. I'd go back to select-node, First Neighbors, passthrough mapping.
