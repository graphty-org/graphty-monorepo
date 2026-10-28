# T49 B pilot on the frozen build 758b8e8081 (targeted re-pilot)

Prompt B: open Zachary's karate club and make every member yellow; follow-up (given by the tool at
the first `--end`): "The coach liked the drawing better the way it was when you opened it. Put it
back exactly as it was."

Every session started `empty` on the frozen build (`REAL_DIST` =
`.study-builds/tier3-r1d2-758b8e8081`); the T49 B sessions were started with `--task T49B`, so the
follow-up came from the tool word for word. Walked: the success path by pointer, the three detours
of the earlier T49 B passes (type the color back / the picker, the menus, removing what was made),
the success path by keyboard only (`--keys --sr`), and the eight routes the fixes touched, each on
its own task's data from an empty start.

## Result

Reached by pointer and by keyboard. No mismatch with the answer key on the success path. Nothing
crashed, blocked the task or would spoil its grading. No script error, console error or failed
request on any walk.

## 1. Success path by pointer -- `y-pointer/`

| Step | Action | Screen | Shot |
| ---- | ------ | ------ | ---- |
| 1 | Start, empty | Start page, turning demo (look `9e7e49b0439e`) | `y-pointer/01.png` |
| 2 | Samples | "Samples" is both the hero button and the top-bar link (the tool asked which); the button scrolls to the Sample library | `y-pointer/03.png` |
| 3 | Card "A club that split in two" | Zachary's karate club, 34 nodes, 78 edges, indigo dots (look `76f16b7d52f0`); the private-window notice with Save | `y-pointer/04.png` |
| 4 | Everything | Style tab open, Color `6366F1` | `y-pointer/05.png` |
| 5 | The color box ("Node color, set here, indigo") | The hex is selected; no picker | `y-pointer/06.png` |
| 6 | `yellow`, Enter | `FFFF00`, every node yellow (look `01fe52ff5dda`); focus stays in the box | `y-pointer/07.png` |
| -- | `--end` | The follow-up, word for word | -- |
| 7 | Hover Undo | Tooltip "Undo changing node color on Everything Ctrl+Z" | `y-pointer/08.png` |
| 8 | Undo | `6366F1`, indigo dots, look `76f16b7d52f0` (the start's exactly); notice "Undid changing node color on Everything."; Undo dimmed, tooltip "Nothing to undo" | `y-pointer/09.png`, `10.png` |

The data stayed the karate club's own (34 nodes, 78 edges) the whole way.

## 2. Detours (the set the earlier T49 B passes walked)

**a. The old color typed back, and the picker -- `y-detour-color/`.** Reached through the top
bar's Samples link this time. After the follow-up: `blue` typed in the color box and Escape put
`FFFF00` back with "Edit discarded; this stays FFFF00." under the box, focus kept (07); Tab then
went to "Node color by attribute" (08). `6366F1` typed and Enter drew indigo, look `587e9be416e2`
(09), as the key says. Yellow again, then the swatch ("Pick node color") opened the picker (11);
its swatches are named "indigo 6366F1", "dark gray A9A9A9", "yellow FFFF00, the color before this
edit"; "indigo 6366F1" drew indigo and Escape closed the picker keeping it (15, 16). In the
picker's hex box, `blue` and Escape put `6366F1` back with no "Edit discarded" line (18; see
Defects). Enter there closed the picker (19). Final look `587e9be416e2`: graded S by the drawing.

**b. The menus -- `y-detour-menus/`.** The canvas's right-click menu holds Fit, Frame selection,
New layer from selection, Select all, Clear selection -- no undo (06). Main menu (08) > Open sample
lists Zachary's karate club checked, "Open now" (09); choosing it asks "Discard unsaved changes?"
(10); Escape keeps the yellow work (11); Discard reopens the sample, indigo, look `76f16b7d52f0`
(13). Yellow again, then Main menu > Back to start > Discard lands on the start page scrolled to
the Sample library (17), and the card reopens the sample at `76f16b7d52f0` (18).

**c. Removing what was made -- `y-detour-remove/`.** "Remove node color" removed the Color line;
the default draws the same blue-violet, look `43cd506d2038`, colors `none` (06; the pointer, left
where the minus was, now hovers Effects' "+"). Fill "+" brought the line back unset with `6366F1`
in italics (07); Enter set it, look `587e9be416e2` (08). Then "+" > Layer, Enter on its name, Fill
"+" (straight to a Color line), `yellow` Enter painted all 34 (14); Layer actions > Delete removed
it with "Deleted Layer 1." and Undo (16), look back to `587e9be416e2`.

## 3. Keyboard only -- `y-keys/` (`--keys --sr`)

Reached the end. Focus was on the page itself only at the very start (before the first Tab).
Counts match the answer key:

- Start page, 16 Tabs to button "Samples" (Main menu, link "Samples", Docs, For developers,
  GitHub, Switch to dark mode, Settings..., the demo canvas, Communities, Key players, Shortest
  path, 2D, Pause the turning, "Open a file CSV, GraphML, GEXF, Cytoscape, or a saved project",
  Open network data, Samples). The top bar's link "Samples" is Tab 2 and reaches the same library.
- Enter keeps focus on "Samples"; 17 Tabs to "Open the Zachary's karate club sample" (New
  project, MIT licensed on GitHub, Put it on your own site, searchbox "Search samples", Grid, List,
  nine category buttons, Les Miserables, karate club).
- Enter: focus on heading "Graph, Zachary's karate club: 34 nodes, 78 edges"; announced
  "Zachary's karate club: 34 nodes, 78 edges" and the private-window notice. The heading shows no
  focus ring (see Defects).
- 16 Tabs to treeitem "Everything, node and edge layer, 34 nodes, 78 edges"; Enter selects it and
  keeps focus in the tree.
- 19 Tabs to textbox "Node color, set here, indigo" value "6366F1" (Graph settings, Resize left
  panel, Graph drawing, Analyze, Select what it paints, Layer actions, Style, Node, Style nodes,
  Node shape, its by-attribute and remove, Node size, its by-attribute and remove, Add to node
  visibility, Add to node text, Pick node color, the box).
- `yellow`, Enter: name becomes "Node color, set here, yellow" value "FFFF00", announced "Node
  color now yellow, on 34 nodes"; focus stays.
- In the box: `blue` then Escape put FFFF00 back, announced "Edit discarded; this stays FFFF00.",
  focus kept.
- Control+Z with focus in the box: "Undid changing node color on Everything.", name back to
  "indigo", `6366F1`. Control+Y redid it.
- Undo button: 26 Shift+Tabs from the color box, named "Undo changing node color on Everything";
  Enter undid; a second Enter on the dimmed button announced "Nothing to undo". Its name while
  dimmed is "Undo" (disabled).

Shortest key route: 16 + Enter + 17 + Enter + 16 + Enter + 19 + `yellow` + Enter + Control+Z,
about 74 keys, as the key counts.

## 4. Routes the fixes touched (each on its own task's data)

1. **find box `email` > right-click > New layer from selection > Has no value, on_record Yes,
   Done, Fill red** (sources.graphml) -- `z1-t41b-email-layer/`. The layer "email: has a value"
   (07) took "Has no value" at once: name "email: no value", count 9 (10); on_record was added
   and started on Yes, layer "email and 1 more", 4 of 24 (12); Done kept both cards (13); red
   painted 4 (15). Fixed.
2. **The same with `phone` and trained** (volunteers.graphml) -- `z2-t41a-phone-layer/`. Phone
   "Has no value" 7, trained Yes 15, layer "phone and trained", 4 of 24 (12); Done kept them;
   red painted 4 (15).
3. **A find-box layer whose condition is edited before its look** (volunteers.graphml) --
   `z3-t38a-find-edit-before-look/`. The row "role is board (3)" made "3 nodes", "Picked by hand:
   3 nodes" (07). Its card removed ("3 nodes now styles all 24 nodes: no condition is left", with
   Undo, 10), role > staff and board checked, Done: "role: staff, board", 8 of 24 (15); blue
   painted the 8.
4. **'+' layer, both-kinds row** (volunteers.graphml) -- `z4-t41a-plus-layer/`. "+" > Layer
   gives "Layer 1", "Node and edge layer", 24, with the name in an edit box (05). "Which nodes"
   only expands (06), as the key's step 5 says; "Add a condition" opens the attribute list with
   focus moving into its search; trained Yes 15, then phone > Has no value 7; Done; red painted 4
   (19). Unchanged.
5. **One-node label layer from a find-box selection, Control+O > Replace, Control+Z twice, then
   label Everything** (volunteers.graphml) -- `z5-t44b-label-replace-undo/`. "Lucy" > v16 > new
   layer "v16" > Text "+" > Label > name drew "Lucy Grant" (10). Control+O offered "Add to
   volunteers" with "Replace volunteers.graphml" first (11); Replace, Replace (12, 13) kept the
   layer and its label. Control+Z: "Undid changing settings and importing data." (14); Control+Z:
   "Undid changing node label on v16." and the label left the drawing (15). Everything > Text "+" >
   Label > name then drew all 24 names, "24 labels, 0 hidden" (19). Fixed.
6. **A find-box layer colored, Control+O > Replace, Control+Z twice** (volunteers.graphml) --
   `z6-findlayer-color-replace-undo/`. "3 nodes" green (09); Replace kept it green on the same 3
   (13); Control+Z undid the import, Control+Z "Undid changing node color on 3 nodes." and the
   green and the key left the drawing (15). Fixed.
7. **Control+O > Replace on neighbors.csv after a hand-picked edge layer, then Control+Z** --
   `z7-t45a-edge-layer-replace-undo/`. "kind is family (8)" selected 8 ties (05); the selection's
   Style tab, Line "+" > Color, `red` made "8 edges", "Picked by hand: 8 edges" (09). After
   Replace the layer paints the same 8 family ties red (13); Control+Z "Undid changing settings and
   importing data." leaves them so (14).
8. **First find-box pick after Replace** (volunteers.graphml) -- `z8-t38a-find-after-replace/`.
   After Control+O > Replace, `board` > "role is board (3)" drew the three selection rings at once
   (08). Fixed.

## Defects

None blocks T49 B or changes its grade.

- **The drawing jumps sideways when a look is first set on a layer made while nodes are
  selected.** Routes 1, 2, 3 and 6: with a find-box selection open, the first color on the new
  layer (when the key appears) moved the whole drawing about 130 to 155 px right, pushing nodes
  under the inspector, with nothing asked of it (`z1-t41b-email-layer/13.png` -> `15.png`,
  `z2-t41a-phone-layer/14.png` -> `15.png`, `z3-t38a-find-edit-before-look/15.png`,
  `z6-findlayer-color-replace-undo/09.png`). After Replace the reopened drawing sits right of
  center, and after the color is undone and the key leaves it stays there, with the left half of
  the canvas empty (`z6-findlayer-color-replace-undo/13.png`, `15.png`). The same first color with
  no selection (route 4, `z4-t41a-plus-layer/19.png`; route 7) did not move it. Against
  `decided.md` 2026-10-19, "The drawing moves only when the reader asks". Not on T49 B's own
  routes (Everything's color makes no key).
- **The inspector heading takes focus with no visible ring** after the sample opens by keyboard
  (`y-keys/44.png`; the next Tab's ring on "From Zachary's karate club" shows in `y-keys/45.png`).
  Against `decided.md` 2026-10-19, "the heading draws a visible focus ring (WCAG 2.4.7)". A
  keyboard participant cannot see where focus is until the first Tab.
- **Escape in the color picker's hex box discards silently** -- the typed `blue` goes back to
  `6366F1` with no "Edit discarded; this stays ..." line (`y-detour-color/18.png`). Against
  `decided.md` 2026-10-19 ("the same way in every style box ... the color picker's hex box
  included"); the answer key already records it.
- **The dimmed Undo's name and tooltip differ**: name "Undo" (disabled), tooltip "Nothing to
  undo" (`y-keys/124.png`). `decided.md` 2026-10-19 asks the tooltip and the name to say the same
  words; a screen-reader user hears only "Undo, dimmed".

## Not walked

Nothing. Every route asked for was walked.
