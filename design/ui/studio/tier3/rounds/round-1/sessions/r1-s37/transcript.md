# Session r1-s37 -- Analyst Alex

Task: bring neighbors.csv in; make family ties thick and red; leave people and other ties as they are.

## Step 1 (start)
Command: real.mjs --start <folder> empty -> 01.png
Notes: Landing page. "Free and open source" and "It never leaves your computer" under the open box -- good, that answers my first two questions (data stays local, no purchase request). Big "Open a file" button. Next: Open a file, give it neighbors.csv.

## Step 2
Command: --step --click "Open a file" --upload neighbors.csv -> 02.png
Notes: Preview: "neighbors: 16 nodes, 30 edges", each row an edge, source/target mapped, kind (category: family/neighbors/coworkers), years_known, close. Header says "Local only". Counts shown up front -- good. Next: Load.

## Step 3
Command: --step --click "Load" -> 03.png
Notes: Loaded. Right panel: Nodes 16, Edges 30 -- matches the preview. Left: "Style layers" list (Hovered, Selected, Everything) with a "+". "Style layer" is a bit developer-ish, but it is the only styling thing I see. There is a find box "Find nodes, edges, values" too. Next: click the "+" by Style layers to add a rule for family ties.

## Step 4
Command: --step --click-at 276,122 (button "Add a layer or a folder") -> 04.png
Notes: Menu: Layer, Folder, Select layers..., Analyze... Next: Layer.

## Step 5
Command: --step --click "Layer" -> 05.png
Notes: New "Layer 1" with its name selected for editing. Right panel: Node / Edge toggle, "Style nodes" ticked, "Which nodes: All 16 nodes: add a condition to narrow". I want edges. Name it first so I can find it next month. Next: type "Family ties", Enter.

## Step 6
Command: --step --type "Family ties" --key Enter -> 06.png
Notes: Layer renamed to "Family ties".

## Step 7
Command: --step --click "role=radio:Edge" -> 07.png (missed: nothing called "Edge" by that role)
Notes: My guess at the control's kind was wrong; nothing changed. The Node / Edge switch is at the top of the right panel. Next: point at "Edge" directly.

## Step 8
Command: --step --click-at 1292,142 (tab "Edge") -> 08.png
Notes: Edge side: "Style edges" ticked, "Which edges 30 of 30 edges: add a condition to narrow", then Visibility, Text, Line, Arrowheads, Effects. Next: open "Which edges" to limit to kind = family.

## Step 9
Command: --step --click-at 1260,201 (Which edges) -> 09.png
Notes: "Edges that pass every condition", "+ Add a condition", Done. Next: Add a condition.

## Step 10
Command: --step --click "Add a condition" -> 10.png
Notes: Attribute list: years_known (1 to 40), close (2 values), kind (3 values). Next: kind.

## Step 11
Command: --step --click-at 1268,400 (option "kind, 3 values") -> 11.png
Notes: "kind Is any of" with checkboxes: neighbors 16, family 8, coworkers 6 edges. Counts per value -- nice, 8 family ties. Next: tick family.

## Step 12
Command: --step --click-at 1229,315 (family checkbox) -> 12.png
Notes: family ticked; "8 of 30 edges", layer now says "Edge layer", "Node not styled" -- so people are left alone. Good. Next: Done, then Line.

## Step 13
Command: --step --click "Done" -> 13.png
Notes: Condition collapsed to chip "kind: family, 8 edges". Next: "+" next to Line.

## Step 14
Command: --step --click-at 1404,340 (button "Add to edge line") -> 14.png
Notes: Menu: Color, Width, Pattern, Pattern count, Curved. Next: Color.

## Step 15
Command: --step --click-at 1296,376 (menuitem "Color") -> 15.png
Notes: Color row with hex box "A9A9A9" selected for typing. I know hex. Next: type FF0000, Enter.

## Step 16
Command: --step --type "FF0000" --key Enter -> 16.png
Notes: Family ties now red; a legend popped up top-left "Edge color: Family ties, 8 of 30 edges". Other edges still grey. Still thin though. Next: Line "+" again -> Width.

## Step 17
Command: --step --click-at 1404,340 (Add to edge line) -> 17.png
Notes: Menu now: Width, Pattern, Pattern count, Curved. Next: Width.

## Step 18
Command: --step --click-at 1296,376 (menuitem "Width") -> 18.png
Notes: Width row shows "8", selected. No units. The red lines look exactly as thin as before, so I am not sure if 8 is applied or just a placeholder. Next: press Enter to commit it and see whether lines thicken.

## Step 19
Command: --step --key Enter -> 19.png
Notes: Nothing changed. Width still "8", red lines still hairline-thin like the grey ones. Is 8 already the normal width? No units, no hint. Next: try a bigger number, 30, to see if anything moves.

## Step 20
Command: --step --type "30" --key Enter -> 20.png
Notes: Now the 8 family ties are clearly thick and red. Neighbor and coworker ties are still thin grey, the people (blue balls) are unchanged, and the layer says "Nodes: not styled". Layer "Family ties" sits in the list, autosave says saved. Done -- stopping here.

## Wrap-up (in character)
- Finished: yes. neighbors.csv loaded (16 nodes, 30 edges, shown before and after load -- matched), and the 8 family ties are thick red; everything else left alone.
- Ease: 5 of 7.
- What took longest / confused me:
  - Width. Adding Width filled in "8" and nothing on screen changed, even after Enter. No units, no hint whether 8 is the current default or a new value, so I could not tell if it had applied. I had to guess a bigger number (30) to see any change. Gephi at least shows you the line getting thicker as you drag.
  - Styling lives under "Style layers" -> "+" -> "Layer", then switch Node to Edge, then "Which edges" -> "Add a condition" -> kind -> tick family -> Done, then Line "+" -> Color, and Line "+" again -> Width. That is around ten clicks for "make these edges red and thick". For a one-off it is fine; weekly I would count them.
  - A new layer starts as "Node and edge layer" with "Style nodes" ticked, which made me worry it would touch the people too; it only switched to "Edge layer / Nodes: not styled" once I set the edge condition.
  - The legend that popped up only says "Edge color: Family ties" -- nothing about the thickness.
  - Good: "It never leaves your computer" right under the open button and "Local only" in the header answered my data question before I asked. The per-value counts in the condition (family, 8 edges) are exactly the check I want.
  - Red on grey is fine for my eyes; red against green would not have been.
