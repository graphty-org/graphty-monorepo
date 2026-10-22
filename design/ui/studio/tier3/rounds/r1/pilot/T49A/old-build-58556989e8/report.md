# Pilot: T49 A (make every character red, then put it back; Les Miserables)

Build 58556989e8 (frozen, `.study-builds/tier3-r1-58556989e8`). Four sessions, each from the empty
start screen, each started with `--task T49A` so the first `--end` handed over the follow-up, and
each ended. Screenshot paths are relative to this folder.

## 1. Success path by pointer (`pointer/`) -- reached

| Step | Action | Screen | Shot |
| ---- | ------ | ------ | ---- |
| 1 | No thanks | start screen | pointer/02.png |
| 2 | Les Miserables | 77 blue-violet dots; Graph inspector on Values; the Undo arrow already active | pointer/03.png |
| 3 | Everything (layer row) | inspector opens on Everything's Style tab, Node part; Fill Color 6366F1 | pointer/04.png |
| 4 | Style tab | already selected; nothing changes | pointer/05.png |
| 5 | the color box | "Node color, set here"; its text selected on focus | pointer/07.png |
| 6 | type red, Enter | FF0000; all 77 dots red | pointer/08.png |
| -- | `--end` | follow-up: "Your editor liked the drawing better the way it was when you opened it. Put it back exactly as it was." | -- |
| 7 | Control+Z (focus still in the color box) | notice "Undid changing Color on Everything."; box 6366F1; dots blue-violet | pointer/09.png |

Data check: the same 77 characters and 254 links throughout. In `pointer/styles-steps.jsonl` the
look after the follow-up (09) equals the opening look (03), `14bbda5e594c`, and 08 has every node
`#ff0000`. Grade on this route: S.

Naming: `--click "Color"` is refused as ambiguous: four controls share "Color" ("Pick Node color",
"Node color by attribute", "Remove node color", "Node color, set here"). A person clicks the box.

## 2. Detours

### a. `detours-a/`: right-click, a node's own Style, Control+A, the color picker, Undo past the start

- **Right-click a dot** (Valjean): Neighborhood, Path between..., Frame selection, New layer from
  selection, Add note; nothing about color (detours-a/03.png). Escape closes it.
- **The node's Style tab**: Shape, Visibility, Text, Fill, Effects, Rendering, each with "+", and
  "Why this look: Selected Glow, Halo; Everything Color, Size, Shape" (detours-a/05.png). Clicking
  "Everything" there does nothing: plain text, not a way to the layer that paints the color
  (detours-a/06.png).
- **Fill "+", Color** on the node makes a one-node layer "Valjean" (legend "Color: Valjean"), its
  Which nodes reading "A rule set elsewhere" (detours-a/08.png). Typing red, Enter: only Valjean
  turns red (detours-a/09.png).
- **Control+A on the canvas** (after clicking empty canvas) selects the whole page's text -- blue
  highlight across both side panels and the toolbar -- and nothing in the graph (detours-a/11.png).
  The highlight stays through the next step (detours-a/12.png).
- **Graph Style tab** holds only Canvas and Labels; no node color (detours-a/12.png).
- **Everything, the swatch** ("Pick Node color") opens the picker with a Hex box and six swatches;
  the row says "Covered by Valjean on 1 of 77" (detours-a/14.png). The red swatch turns all 77 red
  (detours-a/15.png); Escape closes the picker, focus back on the swatch (detours-a/16.png).
- **Follow-up, the Undo arrow.** Tooltip "Undo changing Color on Everything Ctrl+Z" (17). Click 1:
  "Undid changing Color on Everything." (18). Click 2: "Undid changing Color on Valjean." (20).
  Click 3: "Undid adding Valjean." -- exactly as opened, look `14bbda5e594c` (22). Click 4, one too
  many: "Undid 2 changes." and the graph is gone: "No nodes to draw, Add data... / Open a sample",
  while the title still reads "Les Miserables" and the inspector still shows Everything with "All
  0 nodes" (detours-a/24.png). The notice does not say the sample was closed. Redo ("Redo 2 changes
  Shift+Ctrl+Z") brings it back as it was (detours-a/26.png). End look `14bbda5e594c`: S.

### b. `detours-b/`: the find box, Tab to commit, the remove button, retyping, Back to start

- **Find box "red"**: "No match for "red". To select by a value, type a rule such as
  =shared_chapters > `16`" (detours-b/03.png). Enter does nothing more (04); Escape clears the box
  (05); a second Escape leaves focus in the empty box (06).
- **Everything, type red, Tab**: Tab commits FF0000 and moves to "Color by attribute"
  (detours-b/08.png).
- **Follow-up, "Remove node color" (the minus).** The Color row leaves Fill, but every dot stays
  red, also after a 3-second wait (detours-b/10.png, 11.png). The recorded node colors read `none`:
  the layer no longer sets a color, yet the drawing keeps the last one. The removal looks broken.
- **Fill "+", Color** puts the row back at 6366F1 and the dots return to blue-violet
  (detours-b/13.png). Visibly identical to the start, but the recorded look is `54ae8c137668`, not
  `14bbda5e594c` (the mechanism -- what in the layer's spec differs -- was not traced). Under "S
  only when the look matches exactly" this visibly exact restoration grades F.
- **Color box, type 00FF00, Escape**: reverts to 6366F1, nothing changes; no focus ring is left
  anywhere (detours-b/15.png; see the keyboard walk: focus falls to the page).
- **Main menu, Back to start** (first item in the menu) asks "Discard unsaved changes? Les
  Miserables has changes that are not saved" (detours-b/17.png); Discard, then the Les Miserables
  sample again: opening look `14bbda5e594c` (detours-b/19.png).

## 3. Success path by keyboard only (`keyboard/`, `--sr`) -- reached

Start screen Tab order (02-11): Main menu, Local only, Settings..., "Open project or file...
Ctrl+O", New from data..., "Open the Les Miserables sample", then Zachary's karate club, College
football, Florentine families, then the consent box last: DisclosureTriangle "What is collected",
"Share usage data", "No thanks". Enter on No thanks: focus goes to "Open project or file... Ctrl+O"
(14), not the page. Tab, Tab, Enter on the Les Miserables sample (16): focus button "Graph", live
status "Les Miserables: 77 nodes, 254 edges".

Workspace Tab order: "Graph Les Miserables", combobox "Find", "Add a layer or a folder", treeitem
"Hovered, node layer, 0 nodes" (the layer tree is one stop), "Graph settings", separator "Resize
left panel" value "240 pixels (min)", Canvas "Graph drawing", "Legend" pressed. Shift+Tab back to
the tree, ArrowDown twice: treeitem "Everything, node and edge layer, 77 nodes, 254 edges"; Enter
selects it (28). Then Tab: Graph settings, Resize left panel, Canvas, Legend, "Select what it
paints", "Layer actions", tab "Style" selected, tab "Node" selected, "Edit edges", checkbox "Style
nodes" checked, "Which nodes, 77 of 77", "Add to node shape" disabled, combobox "Node shape" value
"Icosphere", "Node shape by attribute", "Remove node shape", combobox "Node size" value "1", "Node
size by attribute", "Remove node size", "Add to node visibility", "Add to node text", "Add to node
fill" disabled, "Pick Node color", textbox "Node color, set here" value "6366F1", "Node color by
attribute", "Remove node color", "Add to node effects", "Add to node rendering", separator "Resize
inspector". 23 Tabs from the tree to the color box, through every Shape and Size control.

Type red (58), Enter: value "FF0000", all red (59; look `030d9c64dd57`, every node `#ff0000`). No
live message says what changed. Follow-up: Escape in the box -> focus: nothing (the page itself)
(60). Control+Z from there: "Undid changing Color on Everything." announced twice, once as an
assertive alert and once as a polite status (61); look `14bbda5e594c`. The next Tab lands on
"Node color by attribute" (62). Grade on this route: S.

## Mismatches between the answer key and the screen

- Step 4 "Style": clicking the Everything row already opens its Style tab (pointer/04.png).
- Step 5 "The color box": four controls on that row are named with "Color"; the box is the one
  showing 6366F1 ("Node color, set here") (pointer/06.png).
- Routes: "Removing a layer the participant made: S when the look matches" -- removing the color
  and adding it back gives the same visible color but a different recorded look
  (detours-b/13.png), so a visibly exact restoration grades F under the stated rule.
- Routes do not list reopening the sample (Main menu, Back to start, Discard, Les Miserables),
  which restores the opening look exactly (detours-b/19.png).

## Defects

1. "Remove node color" on Everything leaves every node drawn red; the element reports no color
   (`none`) but the canvas keeps the last one (detours-b/10.png, 11.png).
2. Undo one step past the start unloads the sample: "Undid 2 changes.", "No nodes to draw", title
   still "Les Miserables", inspector on Everything "All 0 nodes" (detours-a/24.png). The Undo arrow
   is active from the moment the sample opens (pointer/03.png), so a first Control+Z by someone
   who changed nothing empties the drawing.
3. Control+A on the canvas selects all page text instead of graph nodes, and the highlight
   persists (detours-a/11.png, 12.png).
4. Escape in the color box sends focus to the page body (keyboard/60.png; detours-b/15.png).
5. The undo notice is announced twice to a screen reader (alert and status) (keyboard/61.png).
6. Committing a color announces nothing beyond the field's new value (keyboard/59.png).
7. "Everything" in the node's "Why this look" is not clickable, though it names the layer to
   change (detours-a/06.png).
8. A one-node layer made from a node's Style says "Which nodes: A rule set elsewhere"
   (detours-a/08.png) -- no rule is visible anywhere.
9. Keyboard: 23 Tabs from the layer tree to the color box; disabled "Add to node shape" and "Add to
   node fill" are still tab stops (keyboard/29-52).
10. In the find box a second Escape on an empty box keeps focus there (detours-b/06.png).
11. Tool note, not the app: every `--sr` step on the start screen took 30.5 s (keyboard/01-14
    timestamps in `styles-steps.jsonl`); steps with a graph open took 2 s.
