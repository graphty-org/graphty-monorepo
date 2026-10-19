# T40 B pilot on build 1fa51e2b0b (yeast genes, "name begins with GAL")

Every walk started `empty` on the frozen build named on the first line of `../../../../criteria.md`
(`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1-1fa51e2b0b`; each
`session.json` records commit 1fa51e2b0be8). The folders from earlier builds beside these
(`pointer/`, `detour-find/`, `detour-card/`, `keyboard/`) are older pilots and were not touched.
The data stayed the task's own file the whole way: 331 nodes, 361 edges, the eight GAL names
(GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11, GAL80) on every screen that listed them.

## 1. Success path by pointer -- `b1fa-pointer/` -- reached

| Step | What I did | What the screen showed | Screenshot |
| ---- | ---------- | ---------------------- | ---------- |
| 1 | "No thanks" | start screen, notice gone | 02.png |
| 2 | "Open project or file", yeast-galactose.graphml | "Open as a new graph": 331 nodes, 361 edges | 03.png |
| 3 | Load | the drawing, Style layers Hovered / Selected / Everything | 04.png |
| 4 | "+" beside Style layers ("Add a layer or a folder") | menu: Layer, Folder, Select layers..., Analyze... | 05.png |
| 5 | Layer | Layer 1, its name selected for renaming; "Which nodes" collapsed: "All 331 nodes: add a condition to narrow" | 06.png |
| 6 | "Add a condition" | only expands Which nodes ("Nodes that pass every condition", a second "+ Add a condition", Done); no attribute list | 07.png |
| 7 | "Add a condition" again | attribute list: name, gal1RGexp, gal4RGexp, gal80Rexp, Node id | 08.png |
| 8 | name | a Contains card, focus in "Type the text to match" | 09.png |
| 9 | the card's match menu ("name: how to match") | Contains, Starts with, Ends with, Is exactly, Has a value, Has no value | 10.png |
| 10 | Starts with | menu closes, focus stays on the match menu | 11.png |
| 11 | typed `GAL` (as a person would, straight after choosing) | the match menu reopens with "Ends with" highlighted; the letters land nowhere; text box still empty | 12.png |
| 12 | Escape | menu closes, box still empty | 14.png |
| 13 | click "Type the text to match", type `GAL` | "8 of 331 nodes", card "8 nodes", a list of the 8 names (GAL1 ... GAL80) opens under the box | 15.png |
| 14 | Enter | picker closes: "name starts with GAL, 8 nodes", layer row 8 | 16.png |
| 15 | Fill "+" ("Add to node fill") | Color line, focus in its box, `6366F1` unset in italics | 17.png |
| 16 | typed `purple`, Enter | `800080`; key "Color: Layer 1, 8 of 331 nodes" opens top left; the drawing reframes (moves right and shrinks) as the key opens | 18.png, 19.png |
| 17 | Escape, then Tab in the color box | Escape keeps focus in the box (as decided); Tab goes to "Node color by attribute" | 20.png, 21.png |

`styles.json`: layer `layer-1_2`, selector `{kind: text, reads: data.name, mode: starts-with, text: GAL}`,
`set: node.color #800080`, matched 8, painted 8; Everything unchanged. The count is readable on
screen as "8 of 331" and "name starts with GAL, 8 nodes". The eight purple dots sit together in
the middle of the drawing and are hard to tell apart (19.png), as the answer key says.

Minimal route seen on this build: Contains 12 steps (the key says 11), Starts with 15 steps when the
text box needs a click after "Starts with" (the key says 13).

## 2. Detours

### 2a. The find box -- `b1fa-detour-find/` -- ends on the eight (SD)

- `GAL` in "Find nodes, edges, values": "Nodes 8", each row titled by id with `name: GALn` under it, then
  Values rows "name is GAL10 (1)" ... (05.png). The count is on screen.
- Enter selects only the first row (YBR019C, name GAL10) and empties the box; inspector shows that
  one node, Selected 1 (06.png). The drawing shows no visible mark on the selected node at this zoom.
- Typed again, a plain click on a row selects that one node and closes the list (08.png); the next
  Shift+click had nothing to land on ("nothing on screen is called YBR020W").
- Typed again, Shift+click on all eight rows: each row gets a check mark, the list stays open,
  inspector "8 nodes selected" with a summary (18.png).
- Style tab: "The first style you set makes a layer for the 8 selected nodes." (19.png). Fill "+",
  `purple`, Enter: layer "8 nodes", "Picked by hand: 8 nodes", key "Color: 8 nodes, 8 of 331 nodes",
  notice "Made a layer for the 8 selected nodes" (22.png). The eight keep their yellow selection
  rings over the purple, so on the drawing they read as yellow-orange rather than purple.

### 2b. Filters -- `b1fa-detour-filter/` -- hides, never colors (F as expected)

- Toolbar Filters opens the Data place with "New filter step" (05.png). Attribute > name: a
  Contains box with focus already in "Type the text to match" (07.png).
- `GAL` lists the 8 names (08.png); Enter with GAL1 highlighted keeps `GAL` and adds the step:
  "name contains GAL, 331 to 8 nodes", title bar "8 of 331 nodes", the rest hidden (09.png).
- Graph's Style tab while filtered offers only Canvas and Labels (10.png).
- Graph place > Everything > Fill color `purple` paints the eight shown (13.png); switching the
  step off shows all 331 purple (16.png). Everything's panel did say "Everything styles all 331
  nodes", so the trap is visible in words.

### 2c. "New from data..." from the start screen, the canvas right-click, Graph's Style tab -- `b1fa-detour-newdata/`

- "New from data..." opens the same "Open as a new graph" page with a drop zone and "Choose a
  file..." (03.png); the file loads the same 331 / 361 graph (05.png).
- Right-click on empty canvas: Fit, Frame selection ("Select something first"), New layer from
  selection ("Select something first"), Clear selection (06.png). Nothing about names or color.
- Escape closes it (07.png). Graph's Style tab: Canvas and Labels only, no node color and no
  pointer toward Style layers (08.png).

## 3. Success path by keyboard only -- `b1fa-keyboard/` (screen-reader mode) -- reached

Started `empty --sr`, so every pointer step was refused and each step printed the focused control.
Focus never fell to the page body after the first key.

| Shots | Keys | Focus (screen-reader name) and what was spoken |
| ----- | ---- | ---------------------------------------------- |
| 01 | -- | nothing (the page itself), as at any fresh start |
| 02-14 | Tab x13 | Main menu; Local only; Settings...; Open project or file...; New from data...; Open the Les Miserables sample; ... Zachary's karate club ...; ... College football ...; ... Florentine families ...; DisclosureTriangle "What is collected" collapsed; Share usage data; No thanks; (wraps) Main menu |
| 15-16 | Shift+Tab, Enter | No thanks; then focus moves to "Open project or file..." and "Usage data stays off. Change this in Settings > Privacy" is spoken |
| 17 | Enter, file chosen | button "Load"; "The first 50 rows of 331" |
| 18 | Enter | heading "Graph, yeast-galactose: 331 nodes, 361 edges"; "yeast-galactose: 331 nodes, 361 edges" |
| 19-22 | Tab, F6 x3 | From yeast-galactose.graphml; Canvas "Graph drawing"; Analyze (toolbar); Graph yeast-galactose.graphml (left panel) |
| 23-26 | Tab x3, Shift+Tab | combobox "Find"; "Add a layer or a folder"; treeitem "Everything, node and edge layer, 331 nodes, 361 edges"; back to "Add a layer or a folder" |
| 27-29 | Enter, Enter, Enter | menuitem "Layer"; textbox "Layer name" value "Layer 1"; Enter keeps the name, focus on treeitem "Layer 1, node and edge layer, 331 nodes, 361 edges" selected |
| 30-36 | Tab x7 | Graph settings; separator "Resize left panel"; Canvas "Graph drawing"; Analyze; Select what it paints; Layer actions; tab "Style" selected |
| 37-40 | Tab x4 | tab "Node"; checkbox "Style nodes" checked; button "Which nodes, 331 of 331 nodes, All 331 nodes: add a condition to narrow" collapsed; Add to node shape |
| 41-45 | Shift+Tab, Enter, Tab, Shift+Tab, Enter | Which nodes; Enter expands it and puts focus on "Add a condition" collapsed; Done; Add a condition; Enter opens combobox "Find an attribute" expanded |
| 46-47 | type `name`, Enter | highlighted option "name"; focus combobox "name: text to match" |
| 48-51 | Shift+Tab, ArrowDown x2, Enter | combobox "name: how to match" value "Contains"; opens; highlighted "Starts with"; Enter: value "Starts with" collapsed |
| 52-53 | Tab, type `GAL` | "name: text to match"; spoken "30 of 331 nodes", "9 of 331 nodes", "8 of 331 nodes"; list expanded |
| 54-55 | ArrowDown, Escape | highlighted option "GAL1" selected; Escape closes the list and keeps `GAL` |
| 56 | Enter | button "Which nodes, 8 of 331 nodes, name starts with GAL, 8 nodes" collapsed |
| 57-60 | Tab x4 | Add to node shape; Add to node visibility; Add to node text; Add to node fill |
| 61-63 | Enter, type `purple`, Enter | textbox "Node color, not set, drawn #6366F1 indigo", "Node color added: pick a value"; then "Node color, set here, purple" value 800080, "Node color now purple, on 8 nodes" |
| 64-66 | Control+A `green`, Escape, Tab | Escape: "Edit discarded; this stays 800080.", focus stays in the box; Tab: "Node color by attribute" |

End style (`styles.json`): the same layer as the pointer walk, 8 matched and painted `#800080`.
The keyboard route needs Which nodes and then Add a condition, the same two activations the pointer
needed. After the color is committed focus stays in the color box (63.png).

## Field checks

- Card text box: Enter with a list option highlighted keeps the typed `GAL` and closes the picker
  (pointer 16.png); Escape closes only the list and keeps the text (keyboard 55.png).
- Match menu: typing letters right after choosing "Starts with" reopens the menu and drops the
  letters (pointer 12.png).
- Color box: Enter commits; Escape after typing discards the edit and keeps focus (decided
  behavior); Tab moves to "Node color by attribute" (pointer 21.png, keyboard 65-66).
- Layer name box: Enter keeps the name and moves focus to the layer's row (keyboard 29).
- Find box: Enter selects the first row only and empties the box (detour-find 06.png).
- Filter step's text box: Enter with GAL1 highlighted keeps `GAL` and adds the step (detour-filter 09.png).

## Mismatches between the answer key and the screen

1. "Add a condition" is two steps, not one: the "add a condition to narrow" line of a new layer only
   expands Which nodes; a second "Add a condition" opens the attribute list (pointer 07.png, 08.png;
   keyboard 41-45). The Contains route is 12 steps, not 11.
2. After "Starts with", focus stays on the match menu, so the text box needs a click (or a Tab) before
   typing: the Starts with route is 15 steps, not 13 (pointer 11-15.png).
3. After `purple`, Enter, focus stays in the color box, not on the disabled Fill "+" (pointer 21.png,
   keyboard 63). This follows the newer decision that a disabled "+" is not a Tab stop.
4. Shift+clicked find-box rows now show a check mark each (detour-find 18.png); the key says no row
   shows it is selected.
5. In the Filters detour, picking `name` moves focus into the text box (detour-filter 07.png); the key
   says focus stays in the Attribute box so typing writes `nameGAL` there.

## Defects (anything a participant could trip over)

1. Pointer, step 6: "add a condition to narrow" reads as the action but only opens the section; a
   second "Add a condition" is needed (pointer 07.png). Two controls with one purpose in a row.
2. Pointer, steps 10-12: choosing "Starts with" leaves focus on the match menu; typing `GAL` reopens
   the menu, highlights "Ends with" and silently discards the letters (pointer 12.png). Anyone who
   follows the prompt's "begins with" meets this.
3. Pointer, step 16: committing the color opens the key and reframes the drawing, which shrinks and
   moves right (pointer 17.png against 18.png); the same happens on the find route (detour-find
   20.png against 21.png). The participant loses the place they were looking at.
4. Find route: after styling, the eight keep their yellow selection rings over the purple, so on the
   drawing they look yellow-orange, not purple (detour-find 22.png).
5. Find route: a plain click on a row selects one node and closes the list, so Shift+click on the next
   row has nothing to land on (detour-find 08.png); Enter also takes only the first row (06.png).
   There is no way to take all eight in one action from the list.
6. Find route: the selected node from Enter has no visible mark on the drawing at the opening zoom
   (detour-find 06.png).
7. Graph's Style tab (where a person lands after opening a file and clicking Style) offers Canvas and
   Labels only, with no pointer toward Style layers or a node color (detour-newdata 08.png,
   detour-filter 10.png).
8. Keyboard: from a layer row, Tab runs through Graph settings, the panel resize handle, the canvas,
   the toolbar and two header buttons before the Style tab (keyboard 30-36): seven stops to reach
   the inspector. F6 is not announced anywhere on screen.
9. Keyboard: an option highlighted with ArrowDown in the text card's list is spoken as "GAL1
   selected" while the box keeps `GAL` and Enter keeps `GAL` (keyboard 54); "selected" suggests the
   highlighted name will be taken.
10. Keyboard: each letter typed in the card's text box is spoken as a new count ("30 of 331 nodes",
    "9 of 331 nodes", "8 of 331 nodes"), three announcements for one word (keyboard 53).

No script errors, console errors or failed requests were printed on any walk.

## Not walked

Nothing skipped. The canvas right-click on a node (rather than empty canvas) was not tried: the
GAL nodes have no drawn labels, so a participant cannot find them by pointing.
