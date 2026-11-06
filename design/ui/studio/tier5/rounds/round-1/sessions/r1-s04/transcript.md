# Session r1-s04 -- Maren (returning user), gauges task

Commands use REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33 and node design/ui/studio/tool/real.mjs, folder S=tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s04

## Step 0 -- start
Command: `--start $S setup:gauges-clean.txt` -> 01.png
Note: The colleague's gauges project is open. Network on top, node table below. 11 nodes, 13 edges. I see an "installed" date column and a "telemetry" yes/no column -- telemetry "no" must be the gauges that don't send readings by themselves. Table only shows 10 rows, need to scroll for the 11th.

## Step 1
Note: Funnel icon in the floating toolbar looks like Cytoscape's filter panel. Clicking it.
Command: `--step $S --click-at 832,391` -> "button Filters" -> 02.png
Result: Took me to the Data place with a "New filter" being edited, and a column picker list open (Node id, lat, lon, depth_cm, station, code, installed, telemetry "2 values", Data source). Good, telemetry is there.

## Step 2-3
Command: `--step $S --click "telemetry"` -> ambiguous (a button and an option), did nothing -> 03.png
Command: `--step $S --click "role=option:telemetry"` -> 04.png
Result: Filter now on telemetry, with checkboxes "yes 7" and "no 4" and an "Except" switch. Counts shown -- I like that. Top bar says "11 of 11 nodes". I'll tick yes, assuming the filter keeps what matches.

## Step 4
Command: `--step $S --click "yes"` -> 05.png
Result: Top bar "7 of 11 nodes, 3 of 13 edges". "No match 4" listed under the filter, the 4 non-telemetry gauges pale in the preview. Exactly the count I wanted to see. Clicking Done.

## Step 5
Command: `--step $S --click "Done"` -> 06.png
Result: Back to the network: "Nodes showing 7 of 11", table lists the 7 kept (G01, G02, G04, G06, G07, G09, G11). Nothing deleted ("Full graph 11 nodes"). Good -- kept the parent network. Next: orange for the 1990s gauges. Going to Graph and the "+" by Style layers.

## Step 6
Command: `--step $S --click "Graph" --wait 500` -> 07.png
Result: Graph place, Style layers: Hovered, Selected, Pinned, Everything (7). Clicking the "+" next to Style layers.

## Step 7
Command: `--step $S --click-at 276,122` -> "Add a layer or a folder" -> 08.png
Result: Menu: Layer, Folder, Hover highlight, Analyze... Picking Layer.

## Step 8
Command: `--step $S --click "Layer"` -> 09.png
Result: "Layer 1" added, name in edit mode. Right panel: "Which nodes 7 of 7 -- All nodes", Shape, Visibility, Text, Fill. Naming it, then Which nodes.

## Step 9
Command: `--step $S --type "1990s gauges" --key Enter --click "Which nodes"` -> 10.png
Result: Layer renamed "1990s gauges". Which nodes editor opened, same picker as the filter, "7 of 7" (so it only counts the shown gauges). Picking "installed".

## Step 10
Command: `--step $S --click "role=option:installed"` -> 11.png
Result: Condition: installed / Before / "A date or a year". I need a range for the 1990s. Opening the Before dropdown to look for Between.

## Step 11
Command: `--step $S --click-at 1040,190` -> combobox "installed: how to match" -> 12.png
Result: Options Before, After, Between, Has a value, Has no value. Picking Between.

## Step 12
Command: `--step $S --click "Between"` -> 13.png
Result: Two boxes "A date or a year" to "A date or a year". Typing 1990 and 1999.

## Step 13
Command: `--step $S --click-at 964,216 --type "1990" --click-at 1116,216 --type "1999" --key Tab` -> 14.png
Result: "installed 1990 to 1999", 2 of 7 match: G01 Upper Falls (May 12, 1998) and G09 Lake Inlet (Oct 11, 1999) -- so "1999" includes the whole year. 5 no match. Old Bridge (1995) is not counted because it's hidden by the telemetry filter, as intended. Clicking Done, then Fill.

## Step 14
Command: `--step $S --click "Done" --click "Fill"` -> Done ran; "Fill" ambiguous so it did nothing -> 15.png
Result: Layer "1990s gauges" with 2 nodes, Which nodes "installed 1990 to 1999". Clicking the + next to Fill.

## Step 15
Command: `--step $S --click-at 1404,400` -> "Add to node fill" -> 16.png
Result: A "Color" row with an empty box appeared. Clicking into it.

## Step 16
Command: `--step $S --click-at 1312,434` -> input "Node color, not set" -> 17.png
Result: Nothing visibly opened -- no palette. Trying to type "orange".

## Step 17
Command: `--step $S --type "orange" --key Enter` -> 18.png
Result: It took the word: the box now reads FFA500 with an orange swatch, two nodes on the canvas are orange, and a legend card appeared on the canvas: "Color: 1990s gauges -- 2 of 7 nodes". Top bar still "7 of 11 nodes, 3 of 13 edges". Done.

## End (in character)

Did I finish? Yes. 7 gauges are still in the picture (the 4 with telemetry "no" are filtered out, not deleted -- the full network still says 11 nodes), and 2 of those 7 are orange: Upper Falls (1998) and Lake Inlet (1999). Old Bridge (1995) is a 1990s gauge but doesn't report by itself, so it's out of the picture and not counted.

Ease: 6 out of 7.

What went well: the filter showed counts at every point (yes 7 / no 4, "7 of 11 nodes", "No match 4", "2 of 7"), which is exactly what I never get in Cytoscape. It kept the parent network. The "Which nodes" picker was the same as the filter's, so the second time was easy. "Between 1990 and 1999" included all of 1999, which I checked against Lake Inlet in October 1999. And the legend card on the canvas came for free -- "2 of 7 nodes" right there.

What confused me:
- The color box. I clicked it expecting a palette and nothing opened; I only got orange because I guessed I could type the word. Someone who doesn't think to type would be stuck looking at an empty box.
- Not obvious at first whether ticking "yes" in a filter keeps or removes those -- I guessed "keeps", and the "7 of 11" confirmed it, but only after the fact.
- I had to wonder whether "1999" as the end of a range means Jan 1 or Dec 31; I could only tell by looking at which rows matched.
- Small thing: one node sits behind the floating toolbar at the bottom of the canvas.

Would I use it? For this kind of quick "highlight these, hide those" -- yes, faster than Cytoscape's filter chains. For a paper figure I'd still want to know how to cite it.

## Follow-up

Question: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen. Then: what did you notice the drawing do while you were choosing which gauges go in orange, and what did you take it to mean? Would you rather it had shown something else?"

Answer (Maren): 2. Mostly I knew the next move -- the filter and the "Which nodes" picker are the same thing, and the counts kept telling me I was on track.

Least sure: after I pressed + by Fill and clicked into the Color box (17.png). The panel on the right showed "Fill", a "Color" row with an empty box and a little link icon next to it, the network above with all 7 gauges still the same blue, and the gauge table underneath. I clicked the box expecting a palette like Cytoscape's colour chooser and nothing opened -- no swatches, no hint text I could see. For a few seconds I didn't know if I'd clicked the wrong thing or if it was broken. I only typed "orange" on a hunch.

The drawing while choosing: in the Which nodes editor there is a small preview of the network. When I first picked "installed" all 7 dots were dark green. Once I typed 1990 to 1999, two dots stayed green and the other five went pale lilac. I took that to mean "green = the ones this layer will catch, pale = not caught" -- a preview of the selection, not the actual colour. It matched the "2 of 7" and the two rows (Upper Falls, Lake Inlet) in the table below, so I trusted it. But it did briefly read like "these will be green", and I was making an orange layer. I'd rather it had shown the two gauges highlighted on my real network -- the same layout I'd just been looking at -- or, if I'd already picked a colour, in that colour. And since the fill comes after Which nodes, the preview can't know orange yet; a neutral outline or ring around the matches would say "selected" without suggesting a colour.
