# Grade: session r2-s30 -- Morgan (screen reader, keyboard only), bigger dots for the ones that matter, Les Miserables

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json, screen-reader mode). Graded from the last
screenshot (215.png), the transcript, and a scripted re-run on the same build, run twice. Nothing
was downloaded (the task asks for no file). Screenshot NN.png is the state after step NN-1
(01.png is the start).

## Grade: SD (success with difficulty)

- **Success definition met.** 215.png shows a ranking run sized onto the dots: the legend reads
  "Size: Bridges 0 to 1624", "Color: Bridges 0 to 1624" and "Edge color: Bridge edges 1 to 536";
  the dots plainly differ in size (Valjean's is the largest); the Bridges row's Values tab says
  "Made with: Analysis Betweenness". Morgan heard the Size line as "1 to 3, variable Bridges" at
  step 104 and passed it again at step 125.
- **The measure.** Morgan read "the network depends on most" as betweenness, not PageRank.
  Betweenness is a ranking (a centrality), and for "depends on" it is arguably the better fit, so it
  is graded as a ranking, not as the "defensible non-ranking" partial.
- **Meaning stated from what the app said.** Sizes: "Bridges (betweenness), from size 1 to size 3";
  colors: "also Bridges, a linear color ramp", link colors: "Bridge edges (edge betweenness)". All
  three match the legend in 215.png. Morgan could not say which end of the ramp is which color,
  because the Palette control reports no value (problem 5); naming what the colors stand for is
  what the task asks, and that was right.
- **Why SD, not S:** seven wrong turns (below), well over the two S allows, and the link between
  "Betweenness" and the row name "Bridges" was inferred, not read.
- **Failure codes:** none. **Build-decided:** no. **Void:** no (every step reached the app as a
  keyboard user's would).
- **Screen-reader check.** The Size line's value was read as "1 to 3, variable Bridges" (step
  104). The legend's "Size: Bridges" with its range is on screen as a labeled group but is not in
  the Tab order, and Morgan never heard it (problem 6). Nothing was announced when the size bound.
- **Undo:** Morgan never undid anything.

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs) | 214 after the start, nearly all one key each | about 80 keys (keyboard path, card included; Morgan's card never appeared) |
| Steps to the size bound | 104 | -- |
| Wrong turns | 7 (4 before the size bound, 3 while finding out what it meant) | -- |

Wrong turns:

1. Steps 18-26 (19.png-27.png): typed "betweenness", pressed Enter on a list it could not hear;
   the first match, Edge betweenness, opened and ran. Its name was first spoken in "Edge
   betweenness added, running". Left on the drawing as the "Bridge edges" link color.
2. Steps 37-57 (38.png-58.png): the Graph row's Style tab, which holds only background and layout;
   walked it to the end of the page and wrapped round.
3. Step 91 (92.png): opened "Add to Effects" instead of "Add to Shape" (a miscount).
4. Step 96 (97.png): Alt+ArrowDown on the Size field set the size to 0; put back with ArrowUp.
5. Steps 133-139 (134.png-140.png): opened "Measure actions" looking for a definition of Bridges.
6. Steps 141-145 (142.png-146.png): "from Bridges, Oct 7" opened the Analyze search, where Tab did
   not leave the filter; Escape got out.
7. Step 171 (172.png): ArrowLeft on the Nodes/Edges radio switched it, and Morgan believed the edge
   style had moved onto the nodes. It had not (problem 11); the step after put the radio back.

The initial Tab walk to learn the page (steps 1-11) and the canvas probes (steps 13-15) are
orientation, not wrong turns.

## False "done"

None. Morgan's closing claims hold on 215.png: the size line reads 1 to 3 by Bridges, Bridges is
Betweenness ("Made with" on the Values tab), its top three are Valjean 1,624, Myriel 504 and
Gavroche 470.6, and Valjean's dot is the largest. One wrong belief that is not a "done" claim: in
the debrief Morgan says a stray ArrowLeft "moved the edge style onto nodes" and was put back; the
radio only switches which half of the style panel is shown (171.png and 172.png, legend unchanged).

## Problems

Severity 0-4 (Nielsen). Build defects were reproduced by `rounds/round-2/repro/r2-s30/repro.sh`
(screen-reader mode, keys only), which runs Morgan's path twice (`run1/`, `run2/`, logs
`run1.log`, `run2.log`); both runs printed the same focus and live lines as the session.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | Analyze's filtered list cannot be heard: ArrowDown on "Filter analyses" reports no option and moves no reported focus, there is no match count, and the results cannot be reached by Tab. Enter takes the first match unnamed and opens a form focused on "Run" whose method is never spoken; the pick is first named after it is already running. Here it ran Edge betweenness by mistake. | Steps 18-26, 19.png-27.png; 30-33. Repro check A: `run1.log`/`run2.log`, "Filter analyses value betweenness" twice, then "Run", then "Edge betweenness added, running". |
| 2 | 3 | build-defect | A run announces "added, running" and never "finished"; a screen-reader user cannot tell when the result exists. | Steps 26-27, 34; 27.png, 28.png. Repro check A: no live line during the 5 s wait. |
| 3 | 2 | build-defect | The Size field reports as a combobox but is a number field: Alt+ArrowDown (the key that opens a combobox) changes the size from 1 to 0 instead of opening a list. | Step 96, 97.png. Repro check B: "combobox Size value 1" then "value 0". |
| 4 | 2 | build-defect | Escape on the "Color from data" dialog closes it and drops focus to the page body. | Step 118, 119.png. Repro check C: "focus: nothing (the page itself)". |
| 5 | 2 | build-defect | The Palette combobox in "Color from data" reports no value, so the colors of the ramp are never named; Morgan could say what the colors stand for but not which end is which. | Step 113, 114.png. Repro check C: "combobox Palette" with no value. |
| 6 | 2 | accessibility | The legend (the answer key's screen-reader check: "Size: Bridges" with its range) is a labeled group outside the Tab order, and nothing is announced when the size binds; Morgan heard the range only as "1 to 3" on the Size line and never heard what 1 and 3 map to (0 and 1624). | Step 104, 105.png; legend visible in 215.png. |
| 7 | 2 | build-defect | On opening a sample, focus lands on a canvas with no name; the live region says "No nodes to draw" then "Reading Les Miserables" and never says the load finished or how large the graph is; arrows and Enter on the canvas say nothing. | Steps 12-15, 13.png-16.png. Repro: the open step of `run1.log`, `run2.log`. |
| 8 | 2 | wording | The run of Betweenness is named "Bridges" and Edge betweenness "Bridge edges" in the tree and inspector; nothing on Morgan's path tied the two words together, and whether the values are normalized is not said (1,624 is raw). | Steps 63-67 (64.png-68.png), debrief item 4. "Made with: Analysis Betweenness" exists on the Values tab below the Top 10 (215.png) but Morgan's walk stopped before it. |
| 9 | 2 | accessibility | The edge Top 10 rows are buttons named by bare number pairs ("13 536", "112 242.8"): no words for which link or what the number is. | Steps 185-187, 186.png-188.png. Not scripted. |
| 10 | 2 | accessibility | The "from Bridges, Oct 7" button's name does not say it opens Analyze; it opens the empty filter, where Tab stays on the one control. | Steps 142-144, 143.png-145.png. Not scripted. |
| 11 | 2 | wording | The Nodes/Edges switch is a radio named "Nodes" / "Edges, set": its name reads as where the style applies, so a switch of view was taken for a change of the drawing. | Step 171, 171.png vs 172.png (legend unchanged); debrief item 9. One participant. |
| 12 | 1 | accessibility | Gravity reads "-1.2000000476837158", a floating-point leak read out digit by digit. | Step 52, 53.png. Not scripted. |
| 13 | 1 | behavior | The first Style tab a keyboard user reaches (the Graph row's) holds only background and layout, with no pointer to the rows that carry node size and color. | Steps 44-57, 45.png-58.png. One participant. |
| 14 | 1 | wording | Menu items read their key after the label with no separator ("Delete Delete", "Move up Already at the top Alt+ArrowUp"). | Steps 134-136, 135.png-137.png. |

What worked, for the record: every control reached had a name; Tab and Shift+Tab reversed
cleanly; Escape returned focus to its opener on menus; after "Size by attribute" and Enter, focus
moved to the new line ("1 to 3, variable Bridges"); the node Top 10 reads name first, then score
("Valjean 1,624").
