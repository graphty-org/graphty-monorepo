# Session r1-s16 -- Analyst Alex, river gauges task

Task: put the three gauges that the most journeys go through in orange, and say which three.

## Step 1 (start)
Command: REAL_DIST=... REAL_TIER=5 node design/ui/studio/tool/real.mjs --start <session> setup:gauges-clean.txt
Screenshot 01.png: gauges project open. 11 nodes, 13 edges, directed, 1 component. Table of gauges below the graph.
Alex: "Most journeys go through" -- that's betweenness, the bottleneck question. Counts look sane. I'll look for the algorithm, the flask icon on the toolbar looks like the run-an-algorithm button.

## Step 2
Command: --step <session> --hover-icon 1
Result: tooltip "Main menu" (02.png). Not what I wanted.

## Step 3
Command: --step <session> --click-at 615,391  (button "Analyze")
Result 03.png: list of analyses with a filter box. Betweenness is right there: "Which nodes sit on the most shortest paths between others." That's the journeys question.

## Step 4
Command: --step <session> --click "Betweenness"
Result 04.png: Betweenness card, "Under a second", a gear icon, Run. Nice that it tells me how long. Clicking Run.

## Step 5
Command: --step <session> --click "Run"
Result 05.png: every node is now colored on a 0-25 orange-to-brown betweenness scale, a "Betweenness" layer appeared, and the table has 9 columns now. But this colors all of them in shades of orange -- the council wants just three in orange. First I need the top three by name. The new column must be off to the right; I'll scroll the table.

## Step 6
Command: --step <session> --drag 760,868 1150,868  (table horizontal scrollbar)
Result 06.png: Betweenness column visible. Cedar Bend 25, Fox Creek 24, Mill Pond 21, Upper Falls 16, Heron Marsh 12.5 ... but only 10 of 11 rows on screen. I'll sort the column so I don't miss the last one.

## Step 7
Command: --step <session> --click-at 1114,509  (Betweenness header)
Result 07.png: "Sorted by Betweenness, highest first". Top three: Cedar Bend 25, Fox Creek 24, Mill Pond 21. Then Upper Falls 16 -- clear gap, no tie at third. Graph is directed, which suits a river (journeys go downstream).
Now the hard part: only those three in orange. Right now everything is on an orange-brown gradient, which won't do. There's a "..." on the column header; in Gephi I'd look for a top-N filter. Trying that menu.

## Step 8
Command: --step <session> --click-at 1167,509  (Options for Betweenness)
Result 08.png: only Hide / Sort / Move. No top-N, no color. Closing it and opening the Betweenness layer on the left instead.

## Step 9
Command: --step <session> --key Escape --click-at 132,248  (Betweenness layer)
Result 09.png: right panel shows the layer: "Which nodes 11 of 11 -- Betweenness has a value", and Fill color by Betweenness 0-25. If I narrow "Which nodes" to the top three and make the color plain orange, the rest should drop back to blue. Clicking "Which nodes".

## Step 10
Command: --step <session> --click "Which nodes"
Result 10.png: a big editor -- condition "Betweenness" / "By value", Except toggle, Done/Cancel. There's a "By value" dropdown; hoping it has a "top N" option.

## Step 11
Command: --step <session> --click-at 1040,190  (combobox "Betweenness test")
Result 11.png: options "By value" and "By position". By position sounds like rank -- top N. Picking it.

## Step 12
Command: --step <session> --click "role=option:By position"
Result 12.png: an empty text box with "of all nodes" after it, focused. No hint what to type, no top/bottom choice. I'll try "top 3" and see what it makes of it.

## Step 13
Command: --step <session> --type "top 3"
Result 13.png: "top 3" sits in the box, still "11 of 11", graph all highlighted, no error. Maybe it needs Enter.

## Step 14
Command: --step <session> --key Enter
Result 14.png: red message: '"top 3" is not a number. Type a number, like 10. The count and drawing still use the highest 10.' OK, so it's already "highest" -- just a number. (Odd: header still says 11 of 11 though it claims highest 10.) Replacing with 3.

## Step 15
Command: --step <session> --key Control+a --type "3" --key Enter
Result 15.png: "Betweenness top 3", 3 of 11, "No match 8". The matches list Mill Pond, Cedar Bend, Fox Creek -- same three as my sorted table. Clicking Done.

## Step 16
Command: --step <session> --click "Done"
Result 16.png: only three nodes colored now, the rest back to blue; legend says "3 of 11 nodes". But the three are dark brown, because they're the top of the 0-25 gradient. That is not orange -- the council said orange. I need one plain color. Clicking the color swatch in Fill.

## Step 17
Command: --step <session> --click-at 1273,435  ("Node color: Betweenness, 0 to 25, Orange to brown")
Result 17.png: "Color by Betweenness" panel -- scale, palette, value range. All about mapping data to a gradient. I just want one flat orange. Closing this; the little "<>" icon next to the swatch might switch it to a plain color. Hovering it first.

## Step 18
Command: --step <session> --click-at 1179,443 --hover-at 1381,435
Result 18.png: closed the panel; tooltip on the icon: "Stop varying node color by data". That's it. Clicking it.

## Step 19
Command: --step <session> --click "Stop varying node color by data"
Result 19.png: color is now a plain "6366F1" -- the same blue as everything else, so the three vanished back into the crowd. Fine, now pick orange. Clicking the little swatch to get a picker rather than guessing a hex code.

## Step 20
Command: --step <session> --click-at 1268,435  ("Pick node color")
Result 20.png: a color picker. The preset swatches are blue, grays, a darker blue, yellow, black -- no orange. I'll just type an orange hex into the Hex box; our slide template uses FF8000 for highlights anyway.

## Step 21
Command: --step <session> --click-at 1084,772 --key Control+a --type "FF8000" --key Enter
Result 21.png: color is FF8000, three nodes on the graph are orange, the rest stay blue, legend reads "Color: Betweenness, 3 of 11 nodes" with an orange chip. (Orange next to the blue I can tell apart fine.) Closing the picker.

## Step 22
Command: --step <session> --click "Close"
Result 22.png: ambiguous, nothing happened. I'll just press Escape.

## Step 23
Command: --step <session> --key Escape
Result 23.png: picker closed. Three nodes orange (FF8000), eight still blue, layer "Betweenness top 3", legend "3 of 11 nodes". Autosave: saved. I'm done.

## Wrap-up (in character, Alex)

Did I finish? Yes. The three gauges the most journeys go through, by betweenness (the share of shortest routes that pass through a gauge), are:
1. Cedar Bend (0057) -- 25
2. Fox Creek (0063) -- 24
3. Mill Pond (0042) -- 21
Next is Upper Falls at 16, so there's no tie at third. Those three are now plain orange on the graph; everything else stays blue.

Ease: 5 out of 7.

What went well: Analyze -> Betweenness -> Run was quick, it told me "Under a second" up front, and the scores landed as a sortable table column -- I could check the top three in a list, not by squinting at colors. The "top 3" filter on the layer is the top-N I wanted from Gephi.

What took longest / confused me:
- Running betweenness colors EVERY node on an orange-to-brown gradient. The task said orange, and after narrowing to the top three they came out dark brown (top of the scale), not orange. I had to find "Stop varying node color by data" -- a tiny icon with no label -- to get a single flat color.
- After switching to a flat color it fell back to the same blue as all the other nodes, so for a moment it looked like the highlight was gone.
- "By value" / "By position" -- "position" didn't say "top N" to me; I guessed. Then the box gave no hint what to type; I typed "top 3" and only after Enter got told to type a number. Also, while that error showed, the header still said "11 of 11" though the message said it was using "the highest 10".
- The color picker's presets have no orange; I typed a hex code. Fine for me, not for everyone.
- The new Betweenness column was off-screen to the right; I had to scroll the table to see it.
- Click count for the coloring part (layer -> Which nodes -> dropdown -> By position -> type -> Done -> unlink -> swatch -> hex) is a lot for something I'd do weekly.

## Follow-up

Facilitator: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen."

Alex: "3. Finding and running betweenness was calm. Analyze, type the name, Run, and it told me 'Under a second' first, so I wasn't sitting there wondering. The coloring half is where it got harder.

The moment I was least sure was right after I picked 'By position' in the layer's 'Which nodes' editor (screenshot 12). The screen showed the condition row: 'Betweenness', the dropdown now saying 'By position', and next to it an empty, focused text box followed by 'of all nodes'. There was an Except toggle and Done/Cancel at the bottom, the header still said '11 of 11', and the whole graph was still highlighted. There was no example in the box and no top-or-bottom choice, so I couldn't tell whether it wanted '3', '3%', 'top 3' or a range. I guessed 'top 3'. Nothing happened until I pressed Enter, and then it told me to type a number and said it was using 'the highest 10', even though the header still read 11 of 11. After that I knew what it wanted, but for those few steps I was guessing.

A close second was when I clicked 'Stop varying node color by data' (screenshot 19). My three nodes went back to the same blue as everything else, and for a second I thought I'd thrown the filter away."
