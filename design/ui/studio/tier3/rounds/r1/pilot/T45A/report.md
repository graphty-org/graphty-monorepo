# Pilot: T45 A (family ties thick and red, neighbors.csv)

Build 58556989e8 (frozen, `.study-builds/tier3-r1-58556989e8`). Three sessions, each from the empty
start screen, each ended. Screenshot paths are relative to this folder.

## 1. Success path by pointer (`pointer/`) -- reached

| Step | Action | Screen | Shot |
| ---- | ------ | ------ | ---- |
| 1 | No thanks | start screen | pointer/02.png |
| 2-3 | Open project or file..., neighbors.csv | read-before-load: 16 nodes, 30 edges, kind = category | pointer/03.png |
| 4 | Load | 16 people, 30 ties, no names drawn | pointer/04.png |
| 5-6 | "+" (Add a layer or a folder), Layer | Layer 1 in rename mode, inspector on its Node tab | pointer/06.png, 07.png |
| 7 | Enter | name kept | pointer/08.png |
| 8 | Edge tab | "Which edges 30 of 30", Add a condition | pointer/09.png |
| 9-10 | Add a condition, kind | card: neighbors 16, family 8, coworkers 6 | pointer/10.png, 11.png |
| 11 | tick family | "8 of 30" | pointer/12.png |
| 12 | Done | chip "kind: family, 8" | pointer/13.png |
| 13-14 | Line "+", Width | Width box, 8, focused and selected | pointer/15.png, 16.png |
| 15 | type 20, Enter | 8 ties slightly thicker | pointer/18.png |
| 16-17 | Line "+", Color | Color row A9A9A9; focus on the swatch, not the box | pointer/20.png |
| 18 | type red -- typed nothing (focus on button "Pick Edge color") | unchanged | pointer/21.png |
| 19 | click the color box, type red, Enter | FF0000; 8 family ties red; legend "Edge color: Layer 1" | pointer/23.png, 24.png |

Field checks: Width -- type then Escape reverts to the last value (pointer/25.png); type then Tab
commits (24) and moves to "Width by attribute" (pointer/26.png); Enter commits. Color -- Enter
commits, Escape after typing "blue" reverts to red (pointer/27.png).

Data check: the same 16 people and 30 ties throughout. End state (`pointer/styles.json`): Layer 1's
edge part `data.kind in [family]`, 8 matched, `edge.color #FF0000`, `edge.width 24`; its node part
paints nothing. Grade on this route: S.

## 2. Detours (`detours/`)

**a. The find box.** Typing "family" lists "Edges 8" (detours/05.png). Enter selects only the first
(Agnes -> Bruno) and clears the list (detours/06.png); there is no way to take all 8 results. The
edge's Style tab, Line "+", Color makes a one-edge layer "Agnes -> Bruno" (detours/09.png) whose
condition reads "A rule set elsewhere"; opening it shows only that chip and Done, no Add a
condition, so it cannot be widened to the family ties (detours/11.png). Undo removes it but the
inspector is left on "Gone / This row is gone" while the edge stays selected (detours/13.png).

**b. Styling from where they are (Everything).** Everything's Edge tab shows a yellow hint "All 30
edges: add a condition to narrow" (detours/15.png). Following it -- Add a condition, kind, family,
Done -- narrows the base layer and every one of the 22 other ties vanishes from the drawing
(detours/20.png). A participant who then colors this layer red gets the family ties red and the
others gone: "every other tie as they are" fails. Ctrl+Z restores (detours/21.png); a second Ctrl+Z
says "Undid 2 changes." and unloads the whole file to "No nodes to draw" (detours/22.png); Redo
brings it back (detours/23.png).

**c. Right-click a tie.** Menu: Select endpoints, Frame selection, New layer from selection, Add
note (detours/24.png). Nothing picks the ties like this one.

**d. Conditions on the Node tab.** The list offers "id" under Data and "Node id" under Structure
(detours/31.png) -- no kind. Typing "family" in "Search values" says "Nothing found" on the Node tab
(detours/32.png) and also on the Edge tab (detours/35.png), where `kind` holds family: the box
searches column names only. Escape returns focus to Add a condition (detours/37.png).

## 3. Success path by keyboard only (`keyboard/`, `--keys --sr`) -- reached

Tab order from the start: Main menu, Local only, Settings..., Open project or file... Ctrl+O, New from
data..., the samples; the consent banner's "No thanks" comes after the samples. Enter on Open project
opens the chooser; after it focus lands on "Load"; Enter loads and focus goes to button "Graph".
Tab: "Graph neighbors.csv", combobox "Find", "Add a layer or a folder"; Enter -> menuitem "Layer";
Enter -> textbox "Row name" value "Layer 1"; Enter -> treeitem "Layer 1, node and edge layer, 16
nodes, 30 edges" selected. Tab: Graph settings, separator "Resize left panel", Canvas "Graph
drawing", "Legend" pressed, "Select what it paints", "Layer actions", tab "Style", tab "Node".
ArrowRight switches to the Edge tab but focus jumps to "Add a condition" (keyboard/27.png), not to
the tab. Enter -> textbox "Search values"; type kind -> one option shown; Enter does nothing
(keyboard/34.png); ArrowDown highlights option "kind", Enter -> combobox "kind: match" value "Is any
of". Tab: checkbox "neighbors, 16 edges", "family, 8 edges"; Space -> checked, live "8 of 30". Tab:
coworkers, Add a condition, Done; Enter -> button "Which edges, 8 of 30". Tab x3 -> "Add to edge
line"; Enter -> menuitem Color, ArrowDown Width, Enter -> combobox "Edge width" value 8, live "Edge
width added"; type 20, Enter. Shift+Tab -> "Add to edge line", Enter, Enter (Color) -> focus on
button "Pick Edge color"; Tab -> textbox "Edge color, set here" value A9A9A9; type red, Enter ->
FF0000 (keyboard/57.png). Escape then -> focus falls to the page itself.

End state (`keyboard/styles.json`): same as the pointer route, width 20. No focus to the page body
anywhere except that last Escape.

## Answer key against the screen

- Step "Color via Line '+', type red": after choosing Color, focus is on the swatch button, so typing
  does nothing; a click on (or Tab to) the color box is needed -- one step more than the key (16).
- The key says the default width is 8; the screen shows 8, as the key says. Width 20 or 24 draws
  only slightly thicker than 8 at the default framing (pointer/18.png, 24.png).
- Everything else matched: "8 of 30", the family 8 count, the Edge tab, Done, the end state.

## Defects

1. (sev 3) Everything's hint "add a condition to narrow" leads a person to narrow the base layer,
   and every tie outside the condition disappears -- detours/15.png, 20.png.
2. (sev 3) The condition picker's "Search values" box does not search values: "family" finds
   nothing on the Edge tab although kind holds it -- detours/35.png, 32.png.
3. (sev 2) After Line "+" > Color, focus goes to the swatch button "Pick Edge color", not the
   color box (Width puts focus in its box); typing a color does nothing -- pointer/21.png, keyboard.
4. (sev 2) In the condition picker, Enter with one matching column does nothing; ArrowDown is
   needed first -- keyboard/34.png.
5. (sev 2) One Ctrl+Z past the last style change unloads the whole file ("Undid 2 changes.", "No
   nodes to draw"); the notice does not say the file was removed -- detours/22.png.
6. (sev 2) The find box's 8 tie results cannot be taken together; Enter picks the first only and
   its style edits make a one-tie layer -- detours/06.png, 09.png.
7. (sev 2) A one-tie layer's condition reads "A rule set elsewhere" and offers no Add a condition
   to widen it -- detours/09.png, 11.png.
8. (sev 1) After undoing that layer the inspector shows "Gone / This row is gone" while the tie
   stays selected -- detours/13.png.
9. (sev 1) ArrowRight on the Node tab moves focus to "Add a condition", skipping the Edge tab and
   the controls above -- keyboard/27.png.
10. (sev 1) Escape in a committed color box drops focus to the page body -- keyboard/58.png.
11. (sev 1) Node-tab condition list shows "id" and "Node id" for the same thing -- detours/31.png.
12. (sev 1) The legend that appears names the layer ("Edge color: Layer 1") with no word of what it
    picks -- pointer/24.png.
13. (sev 1) An unused "Done" sits under "Add a condition" on a new layer with no condition --
    pointer/09.png.
