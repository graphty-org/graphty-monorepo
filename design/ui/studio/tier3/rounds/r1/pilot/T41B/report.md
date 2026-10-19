# T41 B pilot: sources.graphml, on build e3c5bca8e6

Every route started from an empty app on the frozen build
`.study-builds/tier3-r1-e3c5bca8e6` (session.json `commit` e3c5bca8e6). This pilot's sessions are
`g-pointer/`, `g-detours/` and `g-keys/`; the other folders here come from earlier attempts and
are not part of it. Screenshot paths are relative to this folder. The data stayed sources.graphml
(24 nodes, 59 edges) on every screen of every route.

## 1. Success path by pointer -- `g-pointer/` -- reached

- 01-02: No thanks.
- 03: Open project or file..., sources.graphml. The reading page shows id, name, kind, donations,
  on_record, email; the missing emails show as blank cells (s03, s04, s05, s11, s13 ...).
- 04: Load. 24 nodes, 59 edges.
- 05: The "+" beside Style layers (its name is "Add a layer or a folder") opens Layer, Folder,
  Select layers..., Analyze...
- 06: Layer. "Layer 1" is added with its name selected for renaming. Which nodes is collapsed
  and reads "All 24 nodes: add a condition to narrow".
- 07: "Add a condition" lands on that hint text: it only expands Which nodes, the list does not
  open.
- 08: Add a condition (the button) opens "Find an attribute": name, kind (3 values), donations
  (0 to 250,000), on_record (2 values), email (62% have a value), Node id.
- 09: on_record. The card starts on Yes: "12 of 24 nodes". The layer becomes a node layer, Edge
  "not styled".
- 10-11: Add a condition, email. The text card opens on Contains with focus in "Type the text
  to match"; the card shows no count yet.
- 12: email: how to match lists Contains, Starts with, Ends with, Is exactly, Has a value, Has
  no value.
- 13: Has no value: email "9 nodes", Which nodes "4 of 24 nodes", Layer 1 row 4.
- 14: Done. Chips "on_record: yes, 12 nodes" and "email: no value, 9 nodes", 4 of 24 nodes.
- 15: Fill "+" ("Add to node fill"). Focus in the color box with 6366F1 selected.
- 16: red, Enter: four dots red, the key "Color: Layer 1, 4 of 24 nodes" opens at the top left,
  and the whole drawing shrinks and moves right. Focus stays in the color box (FF0000 selected).
- 17-20: Clicking each red dot: s19 Tomas Varga, s17 Friends of the Waterfront, s11 Ines Moreau,
  s05 Della Whitfield; each reads on_record Yes, email No value. Matches the answer.

## 2. Detours -- `g-detours/`

Walked in one session, each as far as a participant would take it.

### 2a. The file opened another way (01-07)

- 03: New from data... opens "Open as a new graph" with an empty drop zone and Choose a file...
- 04: Choose a file..., sources.graphml: the same reading page as Open project or file.
- 05: Cancel goes back to the start screen cleanly (the notice was already answered).
- 06-07: The file dropped on the start screen opens the reading page; Load gives the same graph.

### 2b. The find box (08-17)

- 08: `missing email` gives 'No match for "missing email". To select by a value, type a rule
  such as donations >= 130000'. The hint teaches a number rule; nothing leads to a missing
  value.
- 09: `email` offers only "Select the 15 nodes (email: has a value)".
- 10: `=email missing`, Enter: 'Not a rule Find can read (at character 8). A rule reads like
  donations >= 130000' (nothing was selected before, so no "Still selected" line).
- 11: `=on_record && !email`, Enter: "4 nodes selected", rings on the four; the selection
  summary says on_record Yes (4), email 0 of 4 have a value, and names no one.
- 12-13: Right-click a ringed node: Neighborhood, Path between..., Frame selection, New layer
  from selection, Add note. New layer from selection makes no layer yet: "The first style you
  set makes a layer for the 4 selected nodes".
- 14-15: Fill "+", red, Enter: layer "Rule: on_record && !email", 4 of 24, key opens, notice
  "Made layer Rule: on_record && !email for 4 nodes". In this layer "Style nodes" is dimmed. SD.
- 16-17: A click on empty canvas, then Control+Z: "Undid adding the layer Rule: on_record &&
  !email." The drawing stays shrunk and off to the right after the key goes.
- 18-19: Escape in the find box clears it; a second Escape leaves the box (focus to the canvas).

### 2c. Looking for "missing" in the layer's picker (20-31)

- 20-22: New layer, Which nodes, Add a condition, `missing` typed: "Nothing found".
- 23: Escape closes the list; focus on Add a condition.
- 24: email, `missing` typed in its text box: "0 of 24 nodes", "email leaves none" in red. Nothing
  points to Has no value in the card's own menu.
- 25: Escape in the box closes the whole picker at once and keeps a rule that matches no one
  ("email contains missing, 0 nodes", Layer 1 row 0). Focus moves to Which nodes.
- 26: A second Escape does nothing more.
- 27-28: Reopening the chip shows the card as left; its menu > Has no value gives 9 nodes.
- 29: Add a condition, on_record: the yes/no card starts on Yes, 4 of 24.
- 30-31: An empty name card left unfinished, then a click on the drawing: "Dropped the name
  condition: it was not finished" (no Undo in the notice); the layer is deselected.

### 2d. Filters (32-37)

- 32: The Filters button goes to the Data place with "New filter step".
- 33-35: Attribute email gives Contains with a text box; its match menu ("email: how to match")
  offers Has a value and Has no value, as the layer card does. A step would keep only the
  matching nodes and hide everyone else.
- 36-37: Escape, then Graph: "Filter step not added. Press Add step to use a step."

### 2e. The table (38-41)

- 38: Table opens below the drawing; the drawing shrinks into the top half. Missing emails are
  blank cells.
- 39-40: Sorted by email, A to Z, the blank rows come last: s03, s04, s05 Della Whitfield (Yes),
  s11 Ines Moreau (Yes), s13, s15, s17 Friends of the Waterfront (Yes), s19 Tomas Varga (Yes),
  s23. The four can be read off by on_record. The table does not mark which rows a layer paints.
- 41: Close table.

### 2f. Styling from where they are: one node's inspector (42-45)

- 43-44: Click s11, its Style tab: "The first style you set makes a layer for the selected node",
  Why this look: Selected, Everything (Layer 1 is not listed since it sets nothing).
- 45: Fill "+", red: a layer "s11" "Picked by hand: 1 node", notice "Made layer s11 for 1
  node". Done this way four times it gives four layers, one per person. The key appears and the
  drawing again shrinks and moves right.

## 3. Success path by keyboard only (screen-reader mode) -- `g-keys/` -- reached

Focus never fell to the page body after the start (01 is the fresh page, nothing focused).

- 02-13: Start screen order: Main menu, Local only, Settings..., Open project or file..., New
  from data..., four "Open the ... sample" buttons, What is collected (collapsed), Share usage
  data, No thanks (last, as settled).
- Enter on No thanks: focus to "Open project or file...", live "Usage data stays off. Change
  this in Settings > Privacy". Enter opens the file chooser; sources.graphml; focus on Load,
  live "All 24 rows". `--read` of the page: region "sources: 24 nodes, 59 edges", Direction,
  Cancel, Load.
- Enter on Load: focus to the heading "Graph, sources: 24 nodes, 59 edges" in the right
  inspector (live says the same). The layer "+" is 13 Tabs away: From sources.graphml, Graph
  actions, Values, About Direction, About Degree, Resize inspector, Main menu, Project: sources,
  Local only, Graph, Graph sources.graphml, Find, Add a layer or a folder.
- Enter: menuitem "Layer". Enter: textbox "Layer name" = Layer 1. Enter: treeitem "Layer 1, node
  and edge layer, 24 nodes, 59 edges".
- Which nodes is 10 Tabs away: Graph settings, Resize left panel, Graph drawing (canvas),
  Analyze, Select what it paints, Layer actions, Style, Node, Style nodes, "Which nodes, 24 of 24
  nodes, All 24 nodes: add a condition to narrow".
- Enter: Add a condition. Enter: "Find an attribute". `on_` highlights "on_record, 2 values";
  Enter: "on_record: how to match" = Yes, live "12 of 24 nodes".
- Tab, Enter, `ema`, Enter: focus in "email: text to match" (past the match menu).
  - Enter in that empty box: "Dropped the email condition: it was not finished", focus to Which
    nodes (as the key says). Enter reopens with focus on the on_record card.
  - Shift+Tab, Enter, `ema`, Tab (takes the option, settled): same box. Escape there also drops
    the unfinished card, same notice, focus to Which nodes.
  - Third try: Shift+Tab to "email: how to match" (Contains), Enter, ArrowUp ("Has no value"),
    Enter: live "4 of 24 nodes".
- Tab, Tab: Done. Enter: "Which nodes, 4 of 24 nodes, on_record: yes, 12 nodes, email: no value,
  9 nodes".
- 4 Tabs: Add to node shape, visibility, text, fill. Enter: "Node color, not set, drawn #6366F1
  indigo" (live "Node color added: pick a value"). `red`, Enter: "Node color, set here, red", live
  "Node color now red, on 4 nodes". Escape keeps focus in the field (settled). Tab: Node color by
  attribute, Remove node color.
- F6: Graph drawing; F6: Analyze. Arrows: Layout, View 3D, Legend (pressed), Table, Filters.
  Enter on Table: focus on the "Id" header. Arrows to email, Enter: "email, sorted ascending",
  live "Sorted by email, A to Z". Control+End: gridcell "No value".
- `--read` of the table reads every row whole; the last nine are the missing emails, and the
  four with on_record Yes are s05 Della Whitfield, s11 Ines Moreau, s17 Friends of the
  Waterfront, s19 Tomas Varga (97 shows them).
- Enter on a row: "1 node selected". Escape in the grid: focus to "Table" (settled).

## Answer key vs screen (success path)

1. Step 6, "Add a condition": the new layer's Which nodes is collapsed and its hint also reads
   "add a condition". A click on the hint only expands it (g-pointer/07); the button a second
   click away opens the list (08). The key reads it as one click.
2. Steps 4 and 13 call the controls "+"; their names are "Add a layer or a folder" and "Add to
   node fill" (g-pointer/05, 15).
3. After step 14 the key says focus is on the disabled Fill "+"; on screen it stays in the color
   box, "Node color, set here, red", FF0000 selected (g-pointer/16, g-keys).
4. The key's list of where "Has no value" is says Filters' Is box lists only values; Filters'
   email step offers Has a value and Has no value (g-detours/35).
5. The find box's hint for a missing email reads "donations >= 130000" (g-detours/08); the key
   quotes ">" forms for the hints.
6. By keyboard, focus after Load is on the inspector heading, 13 Tabs from the layer "+", and
   from the new layer's row Which nodes is 10 Tabs away; the key gives no keyboard counts for
   these (g-keys).
7. Everything else matched: 12 for on_record, 9 and "4 of 24" for email, the final chips, the
   four names (g-pointer/09, 13, 14, 17-20).

## Defects (any route)

- The "add a condition to narrow" hint text competes with the Add a condition button; the
  first click on it does not open the list (pointer, g-pointer/07).
- The layer "+" and Fill "+" have no visible text (pointer, g-pointer/05, 15).
- The drawing shrinks and moves right when the key opens, and stays shrunk and off-center
  after the key goes (Undo); the four red dots get small, s05 at the back is a few pixels wide
  (pointer g-pointer/16; detour g-detours/15, 17, 45).
- No find-box query reaches "has no value": `missing email` gets a hint teaching a number rule,
  and `email` offers only "has a value" (detour, g-detours/08-09).
- "Nothing found" for `missing` in the attribute list, and "email leaves none" on a text card,
  never point to Has no value in the card's own menu (detour, g-detours/22, 24).
- One Escape in a text card's box closes the whole picker and keeps a rule that matches no one
  ("email contains missing, 0 nodes") (detour, g-detours/25).
- By keyboard, Escape in an empty new text card drops the card at once ("Dropped the email
  condition"), the same as Enter; a reader who pressed Escape to get out of the box loses the
  condition and must find Add a condition again (keyboard, g-keys).
- "Dropped the ... condition: it was not finished" has no Undo, and a click on the drawing also
  deselects the layer (detour, g-detours/31).
- In a layer made from a selection, "Style nodes" shows dimmed (detour, g-detours/15).
- Filters offers Has no value; a filter step hides everyone else, which breaks "everyone else
  stays as they are" (detour, g-detours/35).
- Styling a clicked node makes one layer per person ("s11, Picked by hand: 1 node"); four
  people give four layers (detour, g-detours/45).
- By keyboard, after Load focus lands in the right inspector, 13 Tabs from the layer "+"; from
  the new layer's row Which nodes is 10 Tabs away, through the canvas and the toolbar (g-keys).
- By keyboard, Enter on Which nodes jumps into the first card's value; the card's remove button
  comes before it and is passed (g-keys).
- Table cells read only their value ("No", "No value") with no column name, and the header row
  reads "name Options for name kind Options for kind ..." (keyboard, g-keys).
- The table and the inspector do not mark which people the layer paints; names come only from
  clicking each red dot or reading two columns per row (pointer and keyboard).

## Skipped

Nothing. All three routes were walked on the frozen build and every session was ended.
