# T45 B pilot: ties of 5 or more shared chapters, thick and blue

Build: e3c5bca8e6 (served from `.study-builds/tier3-r1-e3c5bca8e6`). Every route started from the
empty app, opened Les Miserables from the start screen, and kept the sample's own data the whole
way (77 nodes, 254 edges, edge column `shared_chapters` 1 to 31).

Result: reached on the success path by pointer and by keyboard. Both end on a layer whose edge part
picks the 51 ties and sets `edge.width` 24 and `edge.color` #0000FF, with no node value
(`f-pointer/styles.json`, `f-keyboard/styles.json`).

## 1. Success path by pointer (`f-pointer/`)

| Step | What happened | Screenshot |
| ---- | ------------- | ---------- |
| No thanks, Les Miserables | Graph opens, 77 nodes, 254 edges | 03.png |
| "+" (Add a layer or a folder) > Layer | Layer 1 made, name box in edit mode, Node tab open | 05.png, 06.png |
| Edge tab | "All 254 edges: add a condition to narrow" | 07.png |
| Click "add a condition" | Only expands Which edges; shows an "Add a condition" button and Done | 08.png |
| Click "Add a condition" again | Attribute list: shared_chapters, 1 to 31 | 09.png |
| shared_chapters | Between 1 to 31, focus in the from box with 1 selected; subtitle already "Edge layer", row count 254 | 10.png |
| Type 5, Tab | "51 of 254 edges" | 11.png |
| Done | "shared_chapters 5 to 31, 51 edges" | 12.png |
| Line "+" > Width | Box with 8 selected | 14.png, 15.png |
| Type 24, Enter | Width 24; ties only a little thicker | 16.png |
| Escape in width box | 24 kept, focus kept | 17.png |
| Tab | "Edge width by attribute"; its tooltip covers the Arrowheads "+" | 18.png |
| Line "+" > Color | Box with A9A9A9 selected | 20.png |
| Type blue, Enter | The 51 ties blue; key "Edge color: Layer 1, 51 of 254 edges"; the drawing shifts and rescales as the key appears; focus stays in the color box | 21.png |
| Type green, Escape | Back to 0000FF; nothing on screen says the edit was discarded | 22.png |

## 2. Detours

### 2a. Search box (`f-detour-find/`)

- "chapters": "No match for "chapters"" with a node-only rule example (`name == 'Napoleon'`);
  nothing says an edge column `shared_chapters` exists (03.png).
- "5": 17 ties, each "shared_chapters: 5" (04.png); nothing points to "5 or more".
- `shared_chapters >= 5`: "Select the 51 edges (shared_chapters 5 or more)" (05.png); Enter selects
  51 (06.png).
- Style tab > Line "+" > Color, blue: makes layer "shared_chapters 5 or more" for 51 edges (09.png);
  Width 24 (11.png): while selected the ties draw very thick; once the selection clears (click on
  empty canvas) they draw only slightly thicker than the rest (12.png). Saved rule
  `shared_chapters >= 5`. A participant who knows the rule syntax succeeds by this route.

### 2b. Layer's Node tab, a tie, the Data place (`f-detour-nodetab/`)

- New layer, stay on the Node tab, "Add a condition" (two clicks again, 04.png, 05.png): the list
  offers only name and Node id.
- Typing "chapters": "shared_chapters is an edge attribute; it is on the Edge tab" and "Add
  shared_chapters on the Edge tab" (06.png); Enter opens the Edge tab with the card (07.png).
- The card's mode list: Between, Highest, Has a value, Has no value; no "at least" (08.png).
- Node tab Fill "+": an unset Color line at 6366F1 (13.png); typing blue paints all 77 characters
  (14.png, failure); the layer flips to "Node layer", "Edge not styled". Control+Z undoes it
  ("Undid changing node color on Layer 1.", 15.png).
- Hovering a tie: pointer cursor, no tooltip (16.png). Right-click: Select endpoints, Frame
  selection, New layer from selection, Add note (17.png); Escape closes it, the tie stays selected
  (18.png).
- Data > Edges > shared_chapters: a summary (Edges, Number, 17 distinct, 1 to 31), nothing to
  select or style by it (20.png); right-click offers only "Filter to..." and "Show in table" (21.png).

### 2c. Everything layer, the toolbar (`f-detour-everything/`)

- Everything's Edge tab: "Everything styles all 254 edges: it is the base layer, under every other
  layer.", no condition, nothing pointing to a new layer (05.png).
- "Edge width by attribute" > shared_chapters: every tie 8 to 16 by value (07.png, failure), hard to
  see at the default framing. Control+Z undoes it (08.png).
- Toolbar Filters: a "New filter step" in the Data place (10.png); a filter hides ties (failure).

## 3. Success path by keyboard, screen-reader mode (`f-keyboard/`)

Focus in order: Main menu; Local only; Settings...; Open project or file...; New from data...; Open
the Les Miserables sample (Enter) > heading "Graph, Les Miserables: 77 nodes, 254 edges" (status
"Les Miserables: 77 nodes, 254 edges"). Tab goes into the right-hand inspector (From Les
Miserables, Graph actions, Values, About Direction). F6: Canvas "Graph drawing", Analyze, "Graph Les
Miserables"; Tab: combobox "Find", "Add a layer or a folder", treeitem "Everything, ...". Shift+Tab,
Enter: menuitem Layer > Enter: textbox "Layer name" "Layer 1" > Enter: treeitem "Layer 1, node and
edge layer, 77 nodes, 254 edges" selected. Tab: Graph settings; separator "Resize left panel";
Canvas; Analyze; "Select what it paints"; "Layer actions"; tab Style; tab Node; ArrowRight: tab
Edge; Tab: checkbox "Style edges"; button "Add a condition" (Enter opens the list) > combobox "Find
an attribute" > ArrowDown: option "shared_chapters, 1 to 31" > Enter: textbox "shared_chapters
from, number" 1. Type 5, Escape: back to 1 (44.png). Shift+Tab, 5, Tab: "51 of 254 edges"; Enter in
the to box closes the card: button "Which edges, 51 of 254 edges, shared_chapters 5 to 31, 51
edges". Tab: Add to edge visibility; Add to edge text; Add to edge line > Enter: menuitem Color;
ArrowDown: Width; Enter: spinbutton "Edge width" 8 ("Edge width added: pick a value"); 24 Enter:
"Edge width now 24, on 51 edges". Tab: "Edge width by attribute"; "Remove edge width"; Shift+Tab
back to "Add to edge line" > Enter > Enter (Color): textbox "Edge color, not set, drawn #A9A9A9 dark
gray"; blue Enter: "Edge color now blue, on 51 edges" (63.png). green Escape: "Edit discarded; this
stays 0000FF."; Tab: "Edge color by attribute".

Focus never fell to the page body. Reached.

## Mismatches with the answer key

- "Add a condition" is two clicks by pointer: the first on the collapsed line only expands Which
  edges (f-pointer/08.png); by keyboard one Enter opens the list.
- Subtitle "Edge layer" and the ties' count (254, then 51) appear as soon as the condition is
  added, not only once a width is committed (f-pointer/10.png, 11.png).
- The Node tab's "Add shared_chapters on the Edge tab" row is not cut off and has no scrollbar
  (f-detour-nodetab/06.png).
- After blue, Enter, focus stays in the color box with 0000FF selected (f-pointer/21.png).

## Defects

1. Escape in the card's from box throws away the typed 5 (back to 1), against "Escape keeps edits in
   the picker and in a card" (keyboard, f-keyboard/44.png).
2. The card saves "5 to 31" (min 5, max 31) while the search box saves `shared_chapters >= 5`; the
   card has no "at least" mode, so "5 or more" is stored with today's top value (f-pointer/12.png,
   f-detour-nodetab/08.png).
3. Width 24 draws only slightly thicker than the default 8 once nothing is selected; selected, the
   ties look far thicker, so the result shrinks when the selection clears (f-detour-find/11.png vs
   12.png; f-pointer/16.png).
4. "Add a condition" by pointer needs two clicks (f-pointer/08.png, f-detour-nodetab/04.png).
5. Search "chapters" finds nothing; column names are not matched and the hint gives only a node
   rule example (f-detour-find/03.png).
6. The drawing shifts and rescales when the key appears (f-pointer/20.png vs 21.png) and stays
   shifted after undo (f-detour-everything/08.png).
7. Escape after typing in the color box tells a sighted reader nothing; "Edit discarded" is only
   spoken (f-pointer/22.png).
8. Hovering a tie shows no tooltip or name (f-detour-nodetab/16.png).
9. The Data place's attribute offers no way to select or style by its value, only Filter and Show
   in table (f-detour-nodetab/20.png, 21.png).
10. Tab from the opened graph's heading goes into the right-hand inspector, not to the left panel
    where "+" is; the layer tree is entered at Everything, not its first item (keyboard,
    f-keyboard/12.png to 22.png).
11. A layer with only an edge condition and no edge look is called "Edge layer"; one node look flips
    it to "Node layer", "Edge not styled" (f-detour-nodetab/10.png, 14.png).
12. The "Edge width by attribute" tooltip covers the Arrowheads "+" (f-pointer/18.png).

## Not walked

Nothing skipped. The usage-data notice was left unanswered in the keyboard walk (last in the Tab
order by decision).
