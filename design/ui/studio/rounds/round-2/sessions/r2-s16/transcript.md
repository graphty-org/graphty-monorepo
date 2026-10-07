# Session r2-s16 -- Elena, task T10 Prompt B (College football)

Participant: Elena, product manager, first time with this app. Goal: get every team's name written next to its dot on the ready-made College football network.

## Step 1 -- start
Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s16 empty` -> 01.png
Saw: a dark start page. "Start" (Open project or file, New from data), "Recent projects" (empty), "Samples" on the right: Les Miserables, Zachary's karate club, College football (115 teams), Florentine families. A "Your data is yours" usage-data box at the bottom.
Elena: "OK, there it is -- College football, 115 teams. I'll just click that. I'll ignore the data popup for now."

## Step 2 -- open College football
Command: `--step --click "College football"` -> 02.png
Saw: a big square-ish web of blue dots and grey lines on a light canvas, no names anywhere. Left panel: search box "Find nodes, edges, values", "Selection", "Everything". Right panel: Graph, Style / Values tabs, Overview with Nodes 115, Edges 613, Density, Components... Toolbar at the bottom with a flask icon, a chart icon, "3D" and a magnifier.
Elena: "Ooh, OK, that's a lot of dots. No names though. Maybe if I click one it tells me which team it is -- let me try the big one near the middle."

## Step 3 -- click a dot
Command: `--step --click-at 768,602` -> 03.png (tool: node with id 23)
Saw: the dot turned grey with a yellow ring. The right panel now says "23 / Node" and under Summary: id 23, label Utah, value 7, Degree 11. Still no name on the drawing itself.
Elena: "Utah. OK, so the name is in there, it's just not on the picture. And the panel header says '23', not Utah, which is weird. There's a 'Style' tab next to 'Values' -- names on the picture sounds like a look thing, so I'll try Style."

## Step 4 -- Style tab
Command: `--step --click "role=tab:Style"` -> 04.png
Saw: Style shows rows Fill, Shape, Effects, Label, Tooltip, each with a "+" on the right, then "Why this look: Node defaults (Color, Size, Shape)". Header still "23 / Node" -- Utah is still picked.
Elena: "Label! That's it. I'll hit the plus next to Label." (She does not stop to think about whether this is for Utah only or for all of them.)

## Step 5 -- plus next to Label
Command: `--step --click-at 1419,232` (tool: button "Add label line") -> 05.png
Saw: a "Label" popup with "Find an attribute" and a list: id, label, value. Behind it a row "Pick an attribute" with a minus.
Elena: "id, label, value. When I clicked Utah it said 'label: Utah', so 'label' is the team name. Picking label."

## Step 6 -- pick "label"
Command: `--step --click "label"` -> 06.png
Saw: a tiny "Utah" appeared above the picked dot, and only that one. The right panel header changed to "23 / Layer" with Nodes / Edges buttons; the Label row now reads "Aa Above | Abc label | -" and under it "1 label, 0 hidden to avoid overlap". The left panel grew a new row "23" (with a brush icon) between Selection and Everything.
Elena (hesitates): "Only Utah. Oh -- because I had Utah clicked. My fault. '1 label', yeah. And now there's a thing called '23' on the left... I don't know what that is. There's 'Everything' on the left -- that sounds like all of them. Let me click Everything and do the label thing again."

## Step 7 -- click "Everything"
Command: `--step --click "Everything"` -> 07.png
Saw: right panel header "Everything", Style tab, Nodes selected; Fill Color 6366F1, Shape Size 1, Icosphere, then Effects, Label, Tooltip with plus buttons. Utah's little label is still on the drawing.
Elena: "OK, 'Everything', and there's a Label plus here too. Same thing as before -- plus, then label."

## Step 8 -- plus next to Label (Everything)
Command: `--step --click-at 1419,362` (tool: button "Add label line") -> 08.png
Saw: the same Label popup: id, label, value.
Elena: "Same list. label again."

## Step 9 -- pick "label" for Everything
Command: `--step --click "label"` -> 09.png
Saw: names appeared all over the drawing in small dark serif text: Florida, Georgia, Tennessee, Arkansas, GeorgiaTech, Maryland, Virginia, NewMexicoState, UtahState, Arizona, California, Stanford... Many are tiny and some overlap. Under the Label row: "115 labels, 14 hidden to avoid overlap".
Elena: "Ooh, there they are! OK that's most of them. But it says 14 hidden -- the question was every team. Maybe if I zoom in they have room. I'll scroll in on the crowded middle-bottom part."

## Step 10 -- zoom in
Command: `--step --wheel 720,600,-600` -> 10.png
Saw: the picture got only a little bigger. The names are still small. The line under Label now says "115 labels, 16 hidden to avoid overlap" -- 16, not 14.
Elena: "Hm, I zoomed in and it went from 14 hidden to 16? That's backwards. Whatever. Maybe that grey line itself does something -- let me click on '16 hidden'."

## Step 11 -- click the "16 hidden" line
Command: `--step --click-at 1290,417` (tool: group "Label") -> 11.png
Saw: nothing changed. It is just text.
Elena: "Nope, just words. There's a little 'Aa' and 'Above' at the start of the label row -- 'Aa' is usually text settings. Trying that."

## Step 12 -- "Aa" button
Command: `--step --click-at 1220,392` (tool: button "Label position") -> 12.png
Saw: a "Label position" popup with a 3x3 grid of dots, the top-middle one highlighted. Nothing about size or hidden names.
Elena: "That's just where the name sits. Not what I want. Closing it. Maybe I just need to zoom in a lot more so they fit."

## Step 13 -- Escape
Command: `--step --key Escape` -> 13.png

## Step 14 -- zoom in more
Command: `--step --wheel 640,560,-2000` -> 14.png
Saw: the picture grew a bit more, now filling most of the canvas. Names a bit bigger but most are still tiny and some collide (OregonState / SouthernCalifornia, ColoradoState). Line now says "115 labels, 12 hidden to avoid overlap".
Elena: "12 now. It goes down slowly when I zoom. I'll zoom right into one corner and see if they all show up there."

## Step 15 -- zoom in hard
Command: `--step --wheel 640,600,-4000` -> 15.png
Saw: zoomed in so the top of the web is cut off. Names are readable now (Georgia, Vanderbilt, BrighamYoung, NewMexico, Utah, WashingtonState, OregonState...) but some still sit on top of each other (SanDiegoState over another one, NevadaLasVegas half-covered). The line now says "16 hidden" again.
Elena (frustrated, short): "16 again. Zooming doesn't do it. One more thing -- the 'Abc label' box in that row, maybe that has an option."

## Step 16 -- "Abc label" box
Command: `--step --click-at 1348,392` (tool: button "Label, Above: label") -> 16.png
Saw: the same attribute list again, now with "In use: label" on top and id, value below. Nothing about showing the hidden ones.
Elena: "Same list. OK. I'm closing that." (Engagement drops here: she stops looking for a way to show the last 16.)

## Step 17 -- Escape, then end
Command: `--step --key Escape` -> 17.png; `--end rounds/round-2/sessions/r2-s16`

## Outcome (in character)

**Did I finish?** Partly. I got names on the teams -- the drawing says "115 labels" -- but it also says 14 to 16 of them are "hidden to avoid overlap", and I could not find any way to make those show. Zooming in did not do it (the hidden count went 14, 16, 12, 16 as I zoomed). So not every team, which is what was asked. I'd paste a screenshot in Slack anyway and say "most of the teams are named".

**How easy was it?** 4 out of 7. Getting names on was quick once I found Style and Label -- that part felt like a 6. Losing a step because I had one team clicked, and then the "hidden" ones I could not get back, pulled it down.

**What confused me:**
- The first time I added a label it only went on Utah, because I had clicked Utah earlier. Nothing told me "this is only for the one you picked" before I did it. Afterwards a row called "23" appeared in the left list and I have no idea what it is.
- I only found the all-teams version by guessing that "Everything" on the left meant all the dots.
- "16 hidden to avoid overlap" -- fine, but then how do I see them? Clicking the line does nothing, the "Aa" button is only where the name sits, and the "Abc label" box only offers id / label / value again.
- Zooming in barely changed the picture at first and the hidden count jumped around instead of going down.
- The names are tiny and in a different (serif) font from the rest of the app; several still sit on top of each other even when zoomed.
- When I clicked a dot, the panel title said "23" instead of the team name Utah.
