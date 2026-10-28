# T41 B pilot: sources.graphml, on build 7d87760756

Every route started from an empty app on the frozen build
`.study-builds/tier3-r1-7d87760756` (session.json `commit` 7d87760756). This pilot's sessions are
`i-pointer/`, `i-detours/` and `i-keys/`; the other folders here come from earlier attempts and
are not part of it. Screenshot paths are relative to this folder. The data stayed sources.graphml
(24 nodes, 59 edges) on every screen of every route.

Result: the success path is reached by pointer and by keyboard. The four sources are s19 Tomas
Varga, s17 Friends of the Waterfront, s05 Della Whitfield and s11 Ines Moreau, painted FF0000
(`colors` #ff0000 in `styles-steps.jsonl` of both walks).

## 1. Success path by pointer -- `i-pointer/` -- reached

- 01: The start screen is a landing page: "Open a file", "Open network data", "Samples", "New
  project", and a turning demo graph on the right. No usage-data notice is visible.
- 02: "No thanks" found something (no miss was printed) but nothing visible changed except the
  page scrolling by about 26 px. The landing page logs 34 failed requests for sample thumbnails
  (`https://graphty.app/data/graph-samples/v1/generator-*.webp`, ERR_BLOCKED_BY_ORB).
- 03: "Open a file", sources.graphml. The reading page ("Open as a new graph") shows id, name,
  kind, donations, on_record (yes / no) and email; missing emails are blank cells.
- 04: Load. 24 nodes, 59 edges. A notice: "This looks like a private window: your work is gone
  when it closes. Save a copy to a file to keep it."
- 05-06: The "+" beside Style layers ("Add a layer or a folder") opens Layer, Folder, Select
  layers..., Analyze...
- 07: Layer. "Layer 1" with its name selected; Which nodes collapsed, "All 24 nodes: add a
  condition to narrow".
- 08: Which nodes only expands, showing "Add a condition" and Done. The attribute list does not
  open (see defects).
- 09: Add a condition opens "Find an attribute": name, kind, donations, on_record, email (62%
  have a value), Node id.
- 10: on_record: the card starts on Yes, "12 nodes"; layer 12 of 24.
- 11-12: Add a condition, email: a text card on Contains with "Type the text to match".
- 13: "email: how to match" lists Contains, Starts with, Ends with, Is exactly, Has a value, Has
  no value.
- 14: Has no value: email "9 nodes", Which nodes "4 of 24 nodes", Layer 1 row 4.
- 15: Done. Chips "on_record: yes, 12 nodes" and "email: no value, 9 nodes".
- 16: Fill "+" ("Add to node fill"): Color line, box shows 6366F1 selected.
- 17: Type `red`, Enter: FF0000, four red dots, key "Color: Layer 1, 4 of 24 nodes". The
  drawing did not move.
- 18-19: Click a red dot: s19, name Tomas Varga. The camera glides AND zooms in; the picked node
  lands at about (880, 433), right of the canvas center, and two of the four red dots leave the
  screen.
- 20: s17, Friends of the Waterfront (the drawing slides further right).
- 21: A click on the third red dot hit s04 Northgate Capital, a blue node drawn over it.
- 22: s05, Della Whitfield. The fourth red dot is now off screen.
- 23: `f` with s05 selected: nothing a reader can see changes.
- 24: Escape ("Selection cleared: 1 node"), `f` again: nothing changes.
- 25-26: Right-click on the canvas: Fit (0), Frame selection (F), New layer from selection,
  Select all, Clear selection. Fit shows the whole drawing again.
- 27: s11, Ines Moreau.

## 2. Detours -- `i-detours/` -- walked

- **Open network data from the start screen (02-04).** A dialog with NDEx, Neo4j and Web API
  cards and a web-address box. It has no way to open a file on this computer. Each card looks
  clickable; clicking NDEx highlights it and only then says "NDEx is on the way. For now, paste
  the web address of a graph file." Escape closes it.
- **Cancel on the reading page, then a second try (05-08).** Cancel returns to the landing page
  (44 more failed thumbnail requests); the second "Open a file" and Load work.
- **The find box (09-15).** `missing email`: "No match ... To select by a value, type a rule such
  as donations >= 130000", a number rule unrelated to what was typed. `email` offers "Select the
  15 nodes (email: has a value)"; Enter selects the 15 who HAVE an email and the camera moves.
  `no email`: "No match ... Still selected: 15 nodes", the same number hint. Tab goes to the
  box's clear button; Escape clears the text, a second Escape leaves the box with the selection
  kept (as decided).
- **New layer from selection, then edited (16-25).** Right-click > New layer from selection
  makes "email: has a value" (15) at once, "Made layer email: has a value for 15 nodes". Opening
  its chip and switching the match to Has no value shows "That rule could not be used for this
  layer" (20); the card reads "9 nodes" but Which nodes, the layer row and the layer name stay at
  15. Adding on_record Yes (22) changes nothing either. Done, Fill "+", red: the 15 WITH an email
  turn red (24) -- the opposite of the task. Setting the color also slid the drawing about 140 px
  to the right (23 to 24). Control+Z undid the color (25).
- **"Has no value" looked for in the attribute list (26-30).** A new layer, Which nodes, Add a
  condition, `missing`: "Nothing found", with no pointer to the card's match menu. Enter does
  nothing; Escape closes the list with focus on "Add a condition"; a second Escape closes the
  picker with focus on Which nodes.
- **Unfinished card (31-35).** Enter on Which nodes puts focus on "Add a condition", not in the
  attribute search. `email`, Enter: a text card with focus in its box. Escape in the empty box
  drops it ("Dropped the email condition: it was not finished") but also closes the whole picker,
  focus on Which nodes.
- **Filters (36-43).** The toolbar's Filters button switches to the Data place with "New filter
  step". email, "email: how to match" Has no value, Add step: "email has no value, 24 to 9
  nodes", the other 15 vanish (a wrong outcome for the task). The inspector still reads "15
  nodes selected", describing the hidden selection, with no rings anywhere. Control+Z restores.
- **Right-click a node (44-45).** It selects s03 and the camera glides it to the middle, so the
  menu (Neighborhood, Path between..., Frame selection, New layer from selection, Add note) stays
  at the old pointer spot, away from the node, over the undo notice's text.

## 3. Success path by keyboard (screen-reader mode) -- `i-keys/` -- reached

Focus names as printed by the tool:

- Start: focus on the page; first Tab "Main menu", then Samples, Docs, For developers, GitHub,
  "Switch to dark mode", "Settings...", the demo Canvas, Communities (pressed), Key players,
  Shortest path, 2D, "Pause the turning", then "Open a file CSV, GraphML, GEXF, Cytoscape, or a
  saved project" on the 15th Tab.
- Enter, upload: focus on "Load", live "All 24 rows". Enter: focus heading "Graph, sources: 24
  nodes, 59 edges", live "sources: 24 nodes, 59 edges" and the private-window notice. Screenshot
  20 shows no focus ring on the heading.
- Tab: "From sources.graphml", "Graph actions", tab "Values", "About Direction", "About Degree",
  separator "Resize inspector", "Main menu", "Project: sources", Undo (disabled), Redo
  (disabled), "Local only", "Graph", "Graph sources.graphml", combobox "Find", "Add a layer or a
  folder" (15 Tabs).
- Enter: menuitem "Layer"; Enter: textbox "Layer name" "Layer 1"; Enter: treeitem "Layer 1, node
  and edge layer, 24 nodes, 59 edges" selected.
- Tab x10: "Graph settings", "Resize left panel", Canvas "Graph drawing", "Analyze", "Select
  what it paints", "Layer actions", tab "Style", tab "Node", "Style nodes", then "Which nodes, 24
  of 24 nodes, All 24 nodes: add a condition to narrow".
- Enter: focus "Add a condition" (the list stays closed). Enter: "Find an attribute" expanded.
  `on`, Enter: "on_record: how to match" Yes, live "12 of 24 nodes".
- Tab: "Add a condition"; Enter, `ema`, Enter: "email: text to match". Shift+Tab: "email: how to
  match" Contains; ArrowDown, End, Enter: Has no value, live "4 of 24 nodes".
- Escape: closes the picker, focus "Which nodes, 4 of 24 nodes, on_record: yes, 12 nodes, email:
  no value, 9 nodes".
- Tab x4: "Add to node shape", "...visibility", "...text", "Add to node fill". Enter: textbox
  "Node color, not set, drawn #6366F1 indigo", live "Node color added: pick a value".
- Field checks: `re` then Escape removes the unset line, "Node color not added", focus back on
  "Add to node fill". Enter, `red`, Enter: "Node color, set here, red" FF0000, live "Node color
  now red, on 4 nodes". `blu`, Escape: back to FF0000, "Edit discarded; this stays FF0000." on
  screen and live, focus kept (76).
- F6 cycle from the color box: Canvas "Graph drawing", "Analyze", separator "Resize left panel",
  back to the color box. The top bar and the left panel are never reached (83).
- F6 to the toolbar, arrows: Layout, "View, 3D", Legend (pressed), Table, Filters. Enter on
  Table: focus "Id" header (91). The drawing shrinks and moves up when the table opens.
- Grid: End to "email", ArrowDown reads "press@harlandev.example", "rvance@mail.example", "No
  value" x3; ArrowLeft "Yes"; Home: rowheader "s05". Enter: "s05 selected"; ArrowRight: "Della
  Whitfield". Escape: focus "Table" (pressed), as decided (102). The inspector shows s05, Della
  Whitfield. Focus never fell to the page body on this walk after the app opened.

## Mismatches with the answer key

- Step 1 "No thanks" and step 2 "Open project or file": the start screen has no visible "No
  thanks" and no "Open project or file"; the way in is "Open a file" on a landing page
  (i-pointer 01-03).
- The detour line "the file opened through the start screen's New from data...": there is no
  "New from data..."; the nearest, "Open network data", cannot open a local file (i-detours
  02-03).
- The SD route "`email` ... a layer 'email: has a value' whose card can be switched to 'Has no
  value' and joined by on_record Yes (4 of 24)": the switch is refused, "That rule could not be
  used for this layer", the layer stays at 15 and paints the 15 with an email (i-detours 20-24).
- By keyboard, "the layer '+' is 13 Tabs from the graph heading": it is 15 (i-keys).
- After clicking dots (steps 16-19), the camera zooms in as well as gliding, so the four red
  dots are not all on screen; reaching all four needed right-click > Fit (i-pointer 18-26).

## Defects

1. Editing a layer made by "New layer from selection" fails: switching its card to Has no value
   gives "That rule could not be used for this layer", the count and layer stay at 15, and Fill
   red paints the wrong 15 (i-detours 20, 22, 24).
2. Which nodes on a layer with no condition only expands; the attribute list does not open and
   focus goes to "Add a condition", not its search, against decided.md (i-pointer 08, i-keys
   Enter on Which nodes, i-detours 31).
3. Escape in a just-added empty text card drops it and closes the whole picker with focus on
   Which nodes; decided.md says focus goes to "Add a condition" (i-detours 35).
4. A pick moves the camera to a point right of the canvas center and zooms in, sliding the rest
   of the drawing under the inspector; after three clicks one of the four answers is off screen
   (i-pointer 18-22, 27; i-keys 102).
5. Setting the color on the made layer slid the drawing about 140 px right; Undo slid it back.
   The drawing must not move when a key arrives (decided 2026-10-19) (i-detours 23-25).
6. Opening the table shrinks and moves the drawing; decided.md says the table opening never
   re-frames (i-keys 91).
7. `f` (Frame selection) with a node selected, and `f` with nothing selected, change nothing a
   reader can see; the whole drawing comes back only by right-click > Fit (i-pointer 23-26).
8. F6 lands on the "Resize left panel" separator and never reaches the top bar or the left
   panel; decided.md says F6 cycles five regions and a resize handle is never one (i-keys 83).
9. After a graph opens, focus is on the inspector heading but no focus ring is drawn (WCAG
   2.4.7, decided 2026-10-19) (i-keys 20).
10. The start screen's primary action "Open a file" is the 15th Tab stop, after the demo canvas
    and its five buttons, though it is drawn first on the left (i-keys).
11. "Open network data" offers three cards that look clickable and only say they are not
    available after a click; it has no local-file way in, which a person bringing a file may try
    first (i-detours 02-03).
12. The landing page fires 34 to 44 failed requests for sample thumbnails
    (`graphty.app/data/graph-samples/v1/*.webp`, ERR_BLOCKED_BY_ORB) on every visit (i-pointer
    02, i-detours 06).
13. The find box's no-match hint always teaches a number rule ("donations >= 130000"), even for
    `missing email` and `no email`; nothing points to how to pick a missing value (i-detours 09,
    12).
14. The attribute list answers `missing` with only "Nothing found", with no pointer to "Has no
    value" in a card's match menu (i-detours 27).
15. A filter step that hides the selected nodes leaves the inspector reading "15 nodes selected"
    with their summary while none of them is drawn (i-detours 42).
16. Right-click on a node glides the node away from the pointer, so the menu opens detached from
    it and over the undo notice's text (i-detours 44).
17. A red dot drawn behind a blue one takes the click of the blue one (s04 instead of s05), with
    no way to tell before clicking (i-pointer 21).
18. "Style nodes" on a layer made from a selection is drawn dimmed, as if disabled, with no
    reason given (i-detours 17).
19. The private-window notice appears on every load in this browser and covers the bottom of the
    drawing until it times out (i-pointer 04, i-keys 20).
20. "Edit discarded; this stays FF0000." names the hex value while the field's name says "red"
    (i-keys 76).

## Not walked

Nothing on the three routes was skipped. Not tried: reading all four names through "Select what
it paints" (the answer key records it gives counts only), and Tab out of the empty email text box
(Shift+Tab was used and kept the card).
