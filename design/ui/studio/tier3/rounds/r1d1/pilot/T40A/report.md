# T40 A pilot: picked out by letters in a name (Les Miserables)

Build 6de5f95d12 (served from `.study-builds/tier3-r1d1-6de5f95d12`), viewport 1440 x 900, every
walk from an empty start. Paths below are relative to this folder.

Reached on every route: the six characters with "Mme" in their name drawn `800080`, everyone else
unchanged, the count readable on screen ("6 of 77", "Nodes 6"). The data stayed Les Miserables (77
nodes, 254 edges) on every walk.

## Routes walked

| Route | Session | Result |
| --- | --- | --- |
| Success path by pointer | `rp-pointer/` | S: "name contains Mme, 6 nodes", 6 dots purple, key "Color: Layer 1, 6 of 77 nodes" (`13.png`) |
| Detour: the find box ("Mme" typed there, rows Shift+clicked, Style tab, Fill) | `rp-detour-find/` | SD: layer "6 nodes", "Picked by hand: 6 nodes", 6 purple (`10.png`, `12.png`) |
| Detour: Filters step on name | `rp-detour-filter/` | F as the answer key says: "name contains Mme, 77 to 6 nodes" hides the rest; Everything colored purple paints all 77 once the step is off (`08.png`, `15.png`) |
| Detour: "Use the selected nodes" (six selected, then "+" > Layer) | `rp-detour-useselected/` | Which nodes and the attribute list never mention the selection (`11.png`, `13.png`: "selected" gives "Nothing found"); right-click > "New layer from selection" makes "6 nodes", Fill purple paints the six; an empty "Layer 1" (77) is left behind (`16.png`, `18.png`) |
| Success path by keyboard only | `rp-keyboard/` | Reached (`82.png`). Focus never fell to the page body |

The detour set is the three detours the previous walks of this task on this build used (find box,
Filters step, use the selected nodes); "typing straight after adding a card" is part of the
success path (focus lands in the card's box after picking `name`) and behaved as the key says.

## Success path (pointer), step by step

1. Samples button (`03.png`): the sample library. 2. "Who holds the novel together" (`04.png`).
3. "+" beside Style layers (`05.png`). 4. Layer (`06.png`). 5. Which nodes: only expands (`07.png`).
6. "Add a condition": list with `name` and `Node id` (`08.png`). 7. `name`. 8. `Mme`: "6 of 77",
list of six names, "Mme de R" highlighted under the resting pointer (`10.png`). 9. Enter keeps
`Mme`: "name contains Mme, 6 nodes" (`11.png`). 10. Fill "+" (focus in the color box, `12.png`).
11. `purple`, Enter: `800080`, key appears, drawing stays put (`13.png`). 11 steps, as the key.

No mismatch with the answer key on this route.

## Keyboard walk (screen-reader names)

Start page: Main menu, Samples (link), Docs, For developers, GitHub, Switch to dark mode,
Settings..., Canvas, Communities (pressed), Key players, Shortest path, 2D, Pause the turning,
"Open a file CSV, GraphML, GEXF, Cytoscape, or a saved project", Open network data, Samples
(button, 16th Tab). Enter on Samples: the page scrolls to the library but focus stays on the
button; the next three Tabs are New project, "MIT licensed on GitHub", "Put it on your own site"
(the page scrolls back up, `19.png`), then searchbox "Search samples", Grid, List, the nine
category buttons, then button "Open the Les Miserables sample" (14 Tabs after Enter).

Enter opens the graph; focus on heading "Graph, Les Miserables: 77 nodes, 254 edges". 15 Tabs to
"Add a layer or a folder" (From Les Miserables, Graph actions, Values tab, About Direction, About
Degree, Resize inspector, Main menu, Project: Les Miserables, Undo (disabled), Redo (disabled),
Local only, Graph, Graph Les Miserables, Find combobox). Enter: menuitem Layer; Enter: textbox
"Layer name" "Layer 1"; Enter commits and leaves focus on the tree row. 10 Tabs to "Which nodes,
77 of 77 nodes, ..." (Graph settings, Resize left panel, Canvas "Graph drawing", Analyze, Select
what it paints, Layer actions, Style tab, Node tab, Style nodes). Enter: focus on "Add a condition"
(list closed). Enter: combobox "Find an attribute"; ArrowDown highlights `name`; Enter: combobox
"name: text to match"; `Mme`: "6 of 77 nodes" spoken. Escape twice: list closes, `Mme` kept, focus
kept. Enter: picker closes, focus on "Which nodes, 6 of 77 nodes, name contains Mme, 6 nodes". 4
Tabs to "Add to node fill"; Enter: "Node color added: pick a value". `pur` then Escape: "Node color
not added", focus back on the "+". Again: `purple`, Enter: "Node color now purple, on 6 nodes";
Escape keeps focus and value; Tab moves to "Node color by attribute".

Fields checked: card text box (Escape keeps text and picker, Enter closes as Done), attribute
search (Escape closes the list, focus to "Add a condition"), layer name (Enter commits), color box
(Enter writes, Escape keeps the written value, Escape on a just-added unwritten line takes it back,
Tab moves on). All as `decided.md` settles them.

## Defects

None crashes, blocks the task or spoils its grading.

1. **The drawing jumps about 155 px right when the first color is set while nodes are selected.**
   Find-box route `rp-detour-find/08.png` to `10.png`, and use-selected route
   `rp-detour-useselected/16.png` to `18.png`: the selection did not change, yet the whole drawing
   moved right as the key arrived. The success path (nothing selected) does not move
   (`rp-pointer/12.png` to `13.png`). `decided.md` (2026-10-19): a key that arrives or a layer added
   never re-frames the drawing. The answer key still describes the move as expected; one of the two
   is out of date.
2. **Enter on the start page's Samples button leaves focus on the button.** `rp-keyboard/18.png`
   (library on screen), then Tab scrolls back to the top (`19.png`) through New project and the
   footer links before reaching the library's search. A keyboard reader sees the library, presses
   Tab and is thrown back to the hero.
3. **A click on Style layers "+" while the find list is open is lost.** `rp-detour-useselected/05.png`
   to `06.png`: with the "Mme" list open, the "+" sits at the panel's foot (y 799); the click closes
   the list, the panel collapses, the "+" moves to y 122 and no menu opens. A second click is needed.
4. **The sample card's accessible name does not contain its visible title.** `rp-keyboard`: the card
   reading "Who holds the novel together" is announced as button "Open the Les Miserables sample"
   (WCAG 2.5.3, label in name); a voice-control user saying the words on screen misses it.
5. **Every sample card shows a broken image.** `rp-pointer/03.png`: each thumbnail request to
   `graphty.app/data/graph-samples/v1/*.webp` fails with `ERR_BLOCKED_BY_ORB` (the response is not
   an image), so the cards show a broken-image icon above their text.

## Mismatches with the binding decisions (not the answer key)

- `decided.md` (2026-10-19): "With no condition yet, opening 'Which nodes' opens the attribute list
  with focus in its search." On this build it only expands; by pointer the list opens on "Add a
  condition" (`rp-pointer/07.png`), by keyboard Enter puts focus on "Add a condition" with the list
  closed. The answer key ("only expands") matches the screen; the decision does not.

## Not walked

The re-pilot's other listed routes belong to other tasks: both T50 halves (a saved project file),
a project saved before the golden merge, the T46, T47 and T48 table routes after a community run,
and the Control+O > Replace routes of T45A, T38, T41 and T51. T40 A opens a sample, never a file,
so Replace with the same file does not exist on its route.
