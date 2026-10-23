# Pilot T45B: ties with 5 or more shared chapters thick and blue (Les Miserables)

Build: ed4351b258 (served from `.study-builds/tier3-r1d1-ed4351b258`). Every walk started on the
empty start screen with clean storage and opened the sample from the start screen, never by URL.
The data was the Les Miserables sample throughout: 77 nodes, 254 ties, the ties' one column
`shared_chapters` (1 to 31), the nodes' one column `name`.

Result: **reached by pointer and by keyboard.** Both end on a user layer whose edge part is
`range data.shared_chapters 5 to 31`, matched 51, setting `edge.width` 24 and `edge.color`
`#0000FF`, with no node value (`pointer/styles.json`, `keyboard/styles.json`). The find-box route
in the detours walk also ends on 51 ties, width 24, blue, no node value (`detours/styles.json`,
layer "shared_chapters 5 or more").

## 1. The success path by pointer (`pointer/`), 16 steps

| Step | Action | Screen | Shot |
| ---- | ------ | ------ | ---- |
| 1 | No thanks | consent notice closes | pointer/02.png |
| 2 | Les Miserables | drawing; Graph inspector on Values: Nodes 77, Edges 254 | pointer/03.png |
| 3 | "+" beside Style layers ("Add a layer or a folder") | menu: Layer, Folder, Select..., Analyze... | pointer/04.png |
| 4 | Layer | "Layer 1" row with its name selected; inspector on Style > Node; a line "Edges: 0 styles  Edit" | pointer/05.png |
| 5 | Edge | Edge tab: "Which edges 254 of 254", "Add a condition" | pointer/06.png |
| 6 | Add a condition | picker: Find an attribute, Data: `shared_chapters 1 to 31` | pointer/07.png |
| 7 | shared_chapters | card: Between, slider, from 1 to 31, Done | pointer/08.png |
| 8 | double-click the from box | value selected | pointer/09.png |
| 9 | type `5`, Tab | "51 of 254"; focus to the "to" box | pointer/10.png |
| 10 | Done | summary chip "shared_chapters 5 to 31, 51" | pointer/11.png |
| 11 | Line "+" ("Add to edge line") | menu: Color, Width, Pattern, Pattern count, Curved | pointer/12.png |
| 12 | Width | Width box, 8, selected; layer becomes "Edge layer" | pointer/13.png |
| 13 | type `24`, Enter | the 51 ties draw a little thicker | pointer/14.png |
| 14 | Line "+" | menu again | pointer/15.png |
| 15 | Color | Color box already focused with `A9A9A9` selected; a key "Edge color: Layer 1" appears over the drawing | pointer/16.png |
| 16 | type `blue`, Enter | `0000FF`; the 51 ties are blue, people unchanged | pointer/17.png |

The data stayed the sample's own (77, 254) on every screen.

## 2. Detours (`detours/`)

**a. Everything's Edge tab.** Selecting Everything and its Edge tab shows "Which edges 254 of 254,
All 254 edges" as plain text, with Line Color A9A9A9, Width 8, Pattern Solid already set
(detours/04.png). No condition can be added there: a hover gives an arrow cursor and no tooltip,
a click does nothing (detours/05-06.png). A participant who styles here changes every tie.

**b. The find box.** `chapters` finds nothing and the box says: No match for "chapters". To select
by a value, type a rule such as ``=shared_chapters > `16` `` (detours/07.png). Typing
`=shared_chapters >= 5` shows a red "Put numbers in backticks:" with the corrected rule
``=shared_chapters >= `5` `` and "Select its matches" under it (detours/08.png); Enter selects 51
ties and the inspector lists them with their chapter counts (detours/09.png). On the selection's
Style tab (detours/10.png), Line "+" > Width makes a new layer "shared_chapters 5 or more" (an Edge
layer, "Node not styled") and focuses its Width box (detours/11-12.png). 24 and Enter, then Line
"+" > Color, `blue`, Enter: 51 ties blue (detours/13-15.png). While still selected they draw very
thick (the selection's own highlight), and once the selection is cleared by a click on empty
canvas they fall back to only a little thicker than the rest (detours/15.png against 16.png). The
find box keeps the rule with "Rule: press Enter to select matches" (detours/16.png).

**c. A new layer's Node tab.** "+" > Layer opened the new layer on the Edge tab this time (the
inspector kept the last tab used; detours/17-18.png). In the attribute picker, `shared` then Escape
closes it and returns focus to "Add a condition" (detours/19.png); `shared` then Enter picks it
(detours/20.png). The card's from box has focus with the caret after "1", not the value selected:
typing `5` gives `15`, "6 of 254" (detours/21.png). Escape keeps 15 and closes the card
(detours/22.png). On the Node tab the "Which nodes" part is first a summary, "All 77 nodes: add a
condition to narrow" (detours/23.png, 28.png); the first click on it only expands it, a second
click on "Add a condition" opens the picker (detours/24-25.png, 29.png). The picker holds only
`name` and Node id: no tie column (detours/25.png). Fill "+" > Color, `blue`, Enter paints all 77
people blue (detours/30-32.png). One Control+Z puts the people's purple back, but the layer keeps a
Fill Color line at the starting purple (`node.color #6366F1` in detours/styles.json) and the key
over the drawing still lists "Color: Layer 1" (detours/33.png).

**d. Right-click on a tie.** The pointer at 686,628 (on the blue tie by eye) hit empty canvas; the
menu offered only Fit and disabled selection items (detours/34.png).

## 3. Keyboard only (`keyboard/`, `--keys --sr`)

Focus names in order, from the start screen: Main menu, Local only, Settings..., "Open project or
file... Ctrl+O", "New from data...", "Open the Les Miserables sample", the other three samples,
"What is collected" (DisclosureTriangle), "Share usage data", "No thanks". Enter on No thanks moves
focus to "Open project or file" and announces "Usage data stays off. Change this in Settings >
Privacy". Enter on the Les Miserables sample: focus "Graph", live "Les Miserables: 77 nodes, 254
edges" (keyboard/24.png).

Then: Tab to "Graph Les Miserables", combobox "Find", button "Add a layer or a folder"; Enter
opens the menu with focus on menuitem "Layer" (keyboard/26.png); Enter gives textbox "Layer name"
value "Layer 1" (keyboard/27.png); Enter keeps the name and focus goes to treeitem "Layer 1, node
and edge layer, 77 nodes, 254 edges" selected. Tab passes Graph settings, separator "Resize left
panel", Canvas "Graph drawing", button "Legend" pressed, "Select what it paints", "Layer actions",
tab "Style", tab "Node" (keyboard/28-29.png). ArrowRight selects tab "Edge" (keyboard/30.png).
Tab: "Edit nodes", checkbox "Style edges" checked, button "Add a condition" collapsed; Enter opens
combobox "Find an attribute" expanded (keyboard/31.png). Tab there closes the picker and goes on
to "Add to edge visibility" (keyboard/32.png). Back, Enter, ArrowDown highlights option
"shared_chapters"; Enter gives textbox "shared_chapters from, number" value "1" (keyboard/33.png).
Typing `5` gives value "15", live "6 of 254" (keyboard/34.png). Control+A, `5`, Enter: live "51
of 254", focus to button "Which edges, 51 of 254, shared_chapters 5 to 31" collapsed
(keyboard/35.png). Tab: "Add to edge visibility", "Add to edge text", "Add to edge line"; Enter
opens the menu on "Color" (keyboard/36.png); ArrowDown, Enter on Width: combobox "Edge width"
value "8", live "Edge width added" (keyboard/37.png). `24` Enter keeps focus, value 24
(keyboard/38.png); `30` then Escape puts 24 back and keeps focus (keyboard/39.png). Tab goes to
"Edge width by attribute". Back to "Add to edge line", Enter, Enter on Color: textbox "Edge color,
set here" value "A9A9A9", live "Edge color added" (keyboard/40.png). `blue` Enter: "0000FF", ties
blue (keyboard/41.png). Typing `re` after that appends ("0000FFre"); Escape puts "0000FF" back and
keeps focus in the box (keyboard/42.png). Tab: "Edge color by attribute", "Remove edge color"
(keyboard/43.png, the final screen: 51 ties blue, width 24).

Focus never fell to the page body on this walk. (Screenshots 14-23 hold a few extra Tab and
Shift+Tab steps on the start screen.)

## Where the answer key and the screen differ

- Step count: the key says B is 16 steps but "11-16. Width and color as A", and A's width and color
  are 7 steps (11-17), which makes 17. On this build it is 16, because the color step needs no
  click in the box (next point).
- After Line "+" > Color, focus lands in the color box itself ("Edge color, set here") with the old
  value selected, so typing `blue` works at once (pointer/16.png, keyboard/40.png). The key's
  "Things every path meets" says focus lands on the swatch button and the box must be clicked
  first.
- Escape in a color box puts the old value back and keeps focus in the box (keyboard/42.png); the
  key says it sends focus to the page.
- Everything's Edge tab reads "All 254 edges" and offers no condition (detours/04-06.png); the
  key's "Detour that removes ties" quotes "All 254 edges: add a condition to narrow" and says a
  condition can be added there. That trap is gone on this build.
- A new layer opens on the tab last used in the inspector (Edge, after an earlier Edge visit;
  detours/17-18.png), not always on Node as the key's "Selecting a layer" note says.

## Defects

1. **The from box is focused with the caret after the old value, not the value selected**
   (pointer/08.png, detours/21.png, keyboard/33-34.png). Typing `5` makes `15` and "6 of 254";
   the count changes but nothing says the number was appended. A pointer user who types without
   double-clicking, and every keyboard user, sets the wrong threshold.
2. **Width 24 draws only a little thicker than the starting 8** at the default framing
   (pointer/14.png, pointer/17.png, detours/16.png), so "thick" is hard to judge. While the ties
   are selected they draw far thicker (detours/15.png), and that vanishes when the selection is
   cleared.
3. **Undo leaves a node color behind.** After Fill "+" > Color > blue, one Control+Z restores the
   look but the layer keeps a Fill Color line at the starting purple, so it still writes
   `node.color`, and the drawing's key still lists "Color: Layer 1" (detours/33.png).
4. **Node tab "Which nodes" needs two clicks**: the first click on the summary text "All 77 nodes:
   add a condition to narrow" only expands it (detours/23-24.png, 28-29.png).
5. **Everything's "All 254 edges" does nothing** on hover or click and says nothing about how to
   narrow (detours/05-06.png); minor.
6. **Typing after Enter in the color box appends to the hex** ("0000FFre", keyboard/42.png): Enter
   leaves the value unselected, so a second color word typed straight after is not read.
7. **Ties cannot be right-clicked in practice**: a right-click on a tie by eye landed on empty
   canvas (detours/34.png).
8. Keyboard: the consent notice's buttons come after the four samples in Tab order, so a keyboard
   participant meets the samples before "No thanks" (keyboard/02-13.png). Not a blocker.
