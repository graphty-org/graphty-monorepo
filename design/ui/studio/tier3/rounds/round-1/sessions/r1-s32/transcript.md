# Session r1-s32 -- Analyst Alex

Task: bring sources.graphml into the program; make red every source who agreed to speak on the record AND has no email address; leave everyone else as is; report their names.

## Step 0 -- start

Command:
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3 node .../design/ui/studio/tool/real.mjs --start <session folder> empty

Alex: Before I put anything in here I want to know where the file goes. Let's see what opens.

01.png: landing page. "Free and open source", "Or drop a file anywhere. It never leaves your computer." next to the Open button. Good -- that is the line I look for. Free, so no purchase request.

## Step 1
Alex: OK, it says the file never leaves my computer, right where I load it. I'll click "Open a file" and give it sources.graphml.
Command: --step --click "Open a file" --upload sources.graphml
Output: file chooser answered, 02.png.

02.png: "Open as a new graph" preview. "sources: 24 nodes, 59 edges" and "24 node rows and 59 edge rows read; the load makes 24 nodes and 59 edges." Counts up front -- that's what I want. Columns: id, name, kind, donations, on_record (yes/no), email. I can already see some on_record Yes with blank email (Della Whitfield, Ines Moreau) but I'm not doing this by eye.

## Step 2
Alex: Counts are there, columns look right. Load it.
Command: --step --click "Load"
03.png: graph loaded, 24 nodes / 59 edges / 1 component on the right. Matches the preview. All nodes same blue. Left panel "Style layers": Hovered, Selected, Everything, with a + button. Toolbar at bottom with icons. A notice about the browser clearing storage.

## Step 3
Alex: Counts match. Now I need to colour a subset by a rule -- in Gephi that's Appearance + a filter. Here the left panel has "Style layers" with a plus. "Layer" is a bit developer-speak but it's the only thing that looks like colouring. I'll try the + .
Command: --step --hover-icon / --click on the + next to Style layers
Output: button "Add a layer or a folder". 04.png: menu Layer / Folder / Select layers... / Analyze...

## Step 4
Alex: "Layer" with a paintbrush. Fine, that's the paint one.
Command: --step --click "Layer"
05.png: "Layer 1" added (name box editing). Right panel: Node/Edge, "Which nodes 24 of 24 nodes", "All 24 nodes: add a condition to narrow", then Shape, Visibility, Text, Fill, ... Good, "which nodes" is exactly my filter question.

## Step 5
Alex: I need to narrow it to on_record = yes and no email. Open "Which nodes".
Command: --step --click "Which nodes"
06.png: "Nodes that pass every condition", "+ Add a condition", Done. "Every condition" = AND, which is what I need.

## Step 6
Command: --step --click "Add a condition"
07.png: attribute list: name, kind (3 values), donations, on_record (2 values), email (62% have a value), Node id. Nice that it tells me 62% have email.

## Step 7
Command: --step --click "on_record"
08.png: condition "on_record" = Yes, 12 nodes; layer now 12 of 24. It picked Yes by itself -- that's what I wanted, but I note it chose for me.

## Step 8
Alex: Now the email one. Add a condition, email.
Command: --step --click "Add a condition" --click "email"
09.png: email condition added, operator "Contains", text box. I need "is empty"/"missing", not contains.

## Step 9
Alex: Contains isn't it. Let me open that dropdown and look for empty or missing.
Command: --step --click-at 1316,320
Output: combobox "email: how to match". 10.png: Contains / Starts with / Ends with / Is exactly / Has a value / Has no value.

## Step 10
Alex: "Has no value" -- there it is.
Command: --step --click "Has no value"
11.png: email "Has no value" 9 nodes; together "4 of 24 nodes". 9 missing matches the 62%-have-email hint (15 of 24). Four people. Now the colour.

## Step 11
Alex: Colour should be under "Fill". Click the + on Fill.
Command: --step --click-at 1404,543
Output: button "Add to node fill". 12.png: conditions collapsed into chips "on_record: yes, 12 nodes", "email: no value, 9 nodes". Fill > Color with hex 6366F1 already selected in the box.

## Step 12
Alex: The hex is highlighted, so I'll just type red over it.
Command: --step --type "FF0000" --key Enter
13.png: four nodes red on the canvas, a legend "Color: Layer 1, 4 of 24 nodes". Everyone else unchanged blue. Now I need names -- no labels on the canvas.

## Step 13
Alex: Picture's done, but I need the names. There's a table icon in the bottom bar -- that's what I'd trust anyway.
Command: --step --click-at 793,864
Output: button "Table". 14.png: table of all 24 nodes (id, name, kind, donations, on_record, email). It does not show which rows are in my red layer -- no colour column, no "only these 4" option I can see. I could scroll and eyeball, but that's how mistakes end up in a report.

## Step 14
Alex: I want just the four. Maybe the layer's "Values" tab on the right lists who's in it.
Command: --step --click "role=tab:Values"
15.png: Values tab: "Matched nodes 4", "Node color on 4 of 4 nodes", Members: s05, s11, s17, s19. Ids, not names -- annoying, the name column is right there. From the table: s05 = Della Whitfield, s11 = Ines Moreau. Need s17 and s19.

## Step 15
Alex: Scroll the table down to s17 and s19.
Command: --step --wheel 740,750,600
16.png: bottom of the table. s17 = Friends of the Waterfront (company, Yes, no email), s19 = Tomas Varga (person, Yes, no email). Cross-checked by eye against the rest: every other Yes row has an email (Rita Vance, Marcus Lee, Eileen Park, City Planning Office, Lena Fischer, Keith Ramos, Rhoda Adeyemi, State Ethics Commission). 12 Yes rows, 8 with email, 4 without -- matches the 4 the layer matched.

Stopping here: the four are red, everyone else is untouched.

## Wrap-up (in character)

Did I finish? Yes. Red, and only them: four sources who agreed to be on the record and have no email address:
- Della Whitfield (s05)
- Ines Moreau (s11)
- Friends of the Waterfront (s17) -- an organization, not a person, but it is one of the sources in the file
- Tomas Varga (s19)

Ease: 6 out of 7.

What took longest / what confused me:
- Getting the names back out. The layer's Values tab lists "Members" as s05, s11, s17, s19 -- ids, not names -- and the table below shows all 24 rows with no way I could see to show only the red ones or a colour column. I had to scroll and match ids by eye. For a list I'm going to hand to someone, that's the step where I'd make a mistake. Gephi isn't better here, but I'd want "show only these" or names in that member list.
- "Style layers" / "Layer" is developer-speak; I only clicked it because nothing else looked like colouring. Once inside, though, "Which nodes" with "Nodes that pass every condition" was clear, and the per-condition counts (on_record yes 12, email no value 9, together 4 of 24) let me check the logic as I built it. That's the bit I liked.
- The email condition started on "Contains"; I had to open the dropdown to find "Has no value". Fine once found.
- on_record defaulted to "Yes" on its own -- right this time, but it chose for me without asking.
- Good: "It never leaves your computer" right next to Open, and the node/edge counts before I hit Load. That's what got me to load the file at all.
- The red is a plain FF0000; I typed it as hex. A colour picker with named colours would be friendlier for most people, but hex suits me.
