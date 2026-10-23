# Pilot: T41 B (sources.graphml, on the record and no email)

Build: ed4351b258 (graphty 0.8.68), served from `.study-builds/tier3-r1d1-ed4351b258`. Every
session started `empty` at the start screen. Screenshot paths are relative to this folder. The
data stayed the task's own the whole way: 24 nodes, 59 edges, the columns kind, donations,
on_record and email, the same rows in the read-the-file page, the inspector and the table.

Result: reached by pointer and by keyboard. The four drawn red and read back are s19 Tomas Varga,
s17 Friends of the Waterfront, s11 Ines Moreau and s05 Della Whitfield, as the answer key says.

## 1. Success path by pointer (`pointer/`)

| Step | What was done | What the screen showed | Screenshot |
| ---- | ------------- | ---------------------- | ---------- |
| 1 | "No thanks" | consent notice gone | 02.png |
| 2 | "Open project or file", sources.graphml | read-the-file page: 24 nodes, 59 edges | 03.png |
| 3 | Load | graph drawn, Graph inspector: Nodes 24, Edges 59 | 04.png |
| 4 | "+" beside Style layers ("Add a layer or a folder") | menu: Layer, Folder, Select..., Analyze... | 05.png |
| 5 | Layer | "Layer 1" in its name box, inspector on Style > Node, "24 of 24" | 06.png |
| 6 | "Add a condition" | attribute list: name, kind (3 values), donations (0 to 250,000), on_record (2 values), email (62% have a value), Node id | 07.png |
| 7 | on_record | card starts on Yes, "12", "12 of 24" | 08.png |
| 8 | "Add a condition" | list again | 09.png |
| 9 | email | email card on "Contains", empty text box, chip "12" | 10.png |
| 10 | the card's match menu | named "email", not "email: match" (the named click missed, 11.png) | 12.png |
| 11 | "Has no value" | "4 of 24", email chip "9" | 13.png |
| 12 | Done | summary chips "on_record: yes, 12" and "email: no value, 9", "4 of 24" | 14.png |
| 13 | Fill "+" ("Add to node fill") | menu: Color | 15.png |
| 14 | Color | Color line added, focus IN the color box with 6366F1 selected; legend "Color: Layer 1" | 16.png |
| 15 | typed `red`, Enter | box FF0000, four red dots, everyone else unchanged | 17.png |
| 16-19 | clicked each red dot | inspector names: Tomas Varga (s19), Friends of the Waterfront (s17), Ines Moreau (s11), Della Whitfield (s05); each on_record Yes, email No value | 18.png to 21.png |

19 steps. `styles.json`: no starting layer gone; the added layer holds the two conditions and the
red fill.

## 2. Detours (`detours/`)

Walked in one session, from the start screen, leaving the consent notice open throughout.

- **"New from data..." from the start screen, Cancel, second try** (02.png to 06.png). "New from
  data..." opens an empty "Open as a new graph" page with "Choose a file..."; the file reads the
  same as on the main route; Cancel goes back to the start screen (04.png); "Open project or
  file" then Load works. The consent notice stays only on the start screen; no harm.
- **The find box** (07.png to 18.png). Typing `email` offers "=email, Select its matches" (07.png);
  Enter selects 15 nodes -- those that HAVE an email, the opposite of the task (08.png). Nothing
  on screen says which 15: the header says "15 nodes selected" and the summary lists kind,
  donations and on_record but no email row. Typing `=email missing` shows "Not a rule Find can
  read (at character 8)", and the 15 stay selected and highlighted under that text (09.png,
  10.png). Escape empties the box and keeps the selection (11.png). Styling from there (the
  selection's Style tab, Fill "+", Color, `red`) makes a layer "Rule: email" that paints the 15
  with an email red (14.png to 16.png). Its rule card reads only "Rule: email" / "email", 15,
  with no way to turn it into "has no value" (16.png). One Control+Z puts the color back; the
  layer stays, and the legend keeps "Color: Rule: email" with the default color (18.png).
- **"Has no value" looked for in the add list; Escape; an unfinished card** (21.png to 32.png).
  On a new layer, "Add a condition" then typing `no value` shows "Nothing found" with no hint
  that it lives on a card's own menu (24.png). Escape closes the list and focus returns to "Add a
  condition" (25.png). An email card left on an empty "Contains" and a click on the canvas: the
  layer is deselected, and on coming back the card is gone with no notice (27.png to 29.png).
  Escape with a fresh on_record card open keeps the card and collapses the editor (32.png).
- **Right-click, the table, Filters, Control+O** (33.png to 44.png). Right-click on a node offers
  Neighborhood, Path between..., Frame selection, New layer from selection, Add note: nothing for
  color (33.png). The table (toolbar "Table") shows 4 rows at this window size; a missing email is
  a blank cell (the inspector says "No value"); sorting email puts the blanks last both A to Z
  and Z to A (36.png, 37.png), so the nine are found by scrolling to the bottom (38.png), where
  on_record can be read beside each name. The column's "Options for email" menu offers only Move
  left and Move right (39.png). "Filters" switches to the Data view with a "New filter step"
  (41.png), a way to hide, not to color. Control+O with the graph open opens "Add to sources",
  warns "59 edges in this file are already in sources. Load adds them a second time." and offers
  "Replace sources.graphml"; Cancel leaves the graph as it was (43.png, 44.png).

## 3. Success path by keyboard only (`keyboard/`, started `--keys --sr`)

Each focused control's screen-reader name, in order. Focus never fell to the page body.

- Start: nothing focused (01.png). Tab: "Main menu", "Local only", "Settings...", "Open project
  or file... Ctrl+O", "New from data...", "Open the Les Miserables sample", "Open the Zachary's
  karate club sample", "Open the College football sample" (02.png to 09.png). The consent
  buttons come after the samples. Shift+Tab x4 back to "Open project or file... Ctrl+O" (13.png);
  Enter opens the chooser (14.png); focus lands on "Load", live "All 24 rows".
- Enter on Load: focus on rail button "Graph", live "sources: 24 nodes, 59 edges" (15.png).
- Tab: "Graph sources.graphml", combobox "Find", "Add a layer or a folder" (16.png to 18.png).
  Enter: menuitem "Layer"; Enter: textbox "Layer name" value "Layer 1" (26.png). Enter keeps the
  name; focus on treeitem "Layer 1, node and edge layer, 24 nodes, 59 edges" selected (27.png).
- Tab: "Graph settings", "Resize left panel", Canvas "Graph drawing", "Legend" pressed, "Select
  what it paints", "Layer actions", tab "Style", tab "Node", "Edit edges", checkbox "Style
  nodes", "Add a condition" (28.png to 38.png).
- Enter: combobox "Find an attribute" expanded. Typed `on`: the highlight is on "donations"
  first; ArrowDown to "on_record"; Enter: combobox "on_record" value "Yes", live "12 of 24"
  (42.png to 44.png).
- Tab: "Add a condition"; Enter; typed `email`; Enter: focus lands in textbox "email: text", not
  on the match menu (52.png). Enter in that empty box closes the editor and the email card is
  gone, with no notice; focus on "Which nodes, 12 of 24, on_record: yes" (53.png).
- Enter reopens the editor; "Add a condition", `email`, Enter again (60.png); Tab goes to
  checkbox "Match case" (61.png); Shift+Tab x2 to combobox "email" value "Contains" (63.png).
  Enter opens it; ArrowDown x5 to "Has no value"; Enter: live "4 of 24" (70.png).
- Tab: "Add a condition", "Done"; Enter: "Which nodes, 4 of 24, on_record: yes, email: no value"
  (73.png). Tab x4 to "Add to node fill" (79.png); Enter: menuitem "Color"; Enter: textbox "Node
  color, set here" value "6366F1", live "Node color added" (81.png). Typed `red`, Enter: FF0000,
  four red dots (83.png).
- Fields checked: typed `blue` after that Enter gives "FF0000blue" (the old value is not
  selected); Escape puts FF0000 back and focus stays in the box (85.png). Tab goes on to "Node
  color by attribute", "Remove node color" (86.png, 87.png).
- Names: on Canvas "Graph drawing" (103.png) the arrow keys turn the camera and Enter does
  nothing (104.png to 106.png): no node can be reached by keyboard. Tab to the toolbar ("Legend"
  pressed), ArrowRight to "Table", Enter: focus on header "Id" (109.png). Tab from there leaves
  the table for the inspector; inside the grid the arrow keys move cell to cell. On header
  "email", Enter: live "Sorted by email, A to Z" (137.png). Control+End: gridcell "No value";
  reading on_record up the nine blank-email rows and the names down gives Tomas Varga, Friends of
  the Waterfront, Ines Moreau and Della Whitfield as the four with Yes (143.png to 166.png).
  Escape in the grid does nothing (167.png).
- The card's remove button is named "Remove on_record" (176.png). Escape while it has focus leaves
  the editor open (179.png), where Escape on the card's select had closed it.

Reached by keyboard: yes.

## Mismatches between the answer key and the screen

1. Step 10: the email card's match menu is named "email" (combobox "email" value "Contains"),
   not "email: match" (pointer/11.png, 12.png; keyboard/63.png).
2. Step 15 is not needed on this build: after Fill "+" > Color, focus is already in the color box
   ("Node color, set here", value selected), and `red` + Enter works at once (pointer/16.png,
   17.png; keyboard/81.png to 83.png). The pointer path is 19 steps, not 20. The general note "focus
   lands on the swatch button ... typed letters go nowhere" does not hold here.
3. The general note "Escape in a color box ... sends focus to the page" does not hold: focus stays
   in the box (keyboard/85.png).
4. The match menu's first option reads "Contains" (capital C), the key "contains".

Everything else on the success path matched: on_record starts on Yes with 12; "Has no value"
gives "4 of 24"; the final chips read "on_record: yes, 12" and "email: no value, 9"; the four
names and ids match.

## Defects (all three walks)

Severity 0-4.

1. (3) Find box, detour: an unreadable rule ("=email missing", "Not a rule Find can read (at
   character 8)") leaves the previous 15-node selection highlighted under it, so a reader styles
   the people WITH an email believing they are the missing ones. The message names a character
   position and gives no example of a rule that would work. detours/09.png, 10.png.
2. (3) An unfinished condition card disappears with no notice, by pointer (a click away,
   detours/27.png to 29.png) and by keyboard (Enter in its empty text box, the key a keyboard
   user presses to confirm, keyboard/52.png, 53.png; no live announcement).
3. (2) "=email" selects those that HAVE an email and nothing says so: "15 nodes selected", and the
   selection summary has no email row. detours/08.png.
4. (2) A layer made from that selection carries a read-only rule card reading only "email", 15:
   it does not say "has a value" and cannot be changed to "has no value". detours/16.png.
5. (2) "no value" typed into "Find an attribute" gives "Nothing found", with no pointer to the
   card's own menu where it lives. detours/24.png.
6. (2) After an attribute is picked by keyboard, focus lands in the text box ("email: text"),
   past the match menu a missing-value condition needs; two Shift+Tabs back. keyboard/52.png,
   61.png, 63.png.
7. (2) No node can be reached by keyboard on the canvas (arrows turn the camera, Enter does
   nothing), so a keyboard reader gets names only from the table. keyboard/103.png to 106.png.
8. (2) Table: Tab from a header leaves the table for the inspector (arrows only, and nothing
   says so); 4 rows show at a time; blank cells sort last in both directions; a missing value is
   a blank cell on screen but "No value" in the inspector and to a screen reader. detours/35.png
   to 38.png; keyboard/109.png to 116.png, 138.png.
9. (1) In "Find an attribute", typing `on` highlights "donations" before "on_record"; Enter would
   add the wrong card. keyboard/42.png.
10. (1) An email card on an empty "Contains" shows the chip "12" (the running total), then "9"
    (its own count) once set. pointer/10.png, 13.png.
11. (1) After Enter in the color box the value is not selected, so typing again appends
    ("FF0000blue"). keyboard/84.png.
12. (1) Escape on the card's "Remove on_record" button does not close the condition editor, while
    Escape on the card's select does. keyboard/179.png.
13. (1) After Control+Z undoes a layer's color, the legend keeps "Color: Rule: email" with the
    default color. detours/18.png.
14. (1) Right-click on a node offers nothing for color or for picking similar nodes (a dead end,
    not a trap). detours/33.png.
