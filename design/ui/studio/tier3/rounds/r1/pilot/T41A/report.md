# T41A pilot on build e3c5bca8e6

Task: open volunteers.graphml, paint red every person with trained = Yes and no phone number,
leave everyone else as they are, and name them. Answer: Aisha Bello, Diego Ruiz, Nora Lindqvist,
Julia Rossi.

All four sessions ran on the frozen build `.study-builds/tier3-r1-e3c5bca8e6` (each
`session.json` records commit e3c5bca8e6). Each started from an empty app. The older folders
here (`pointer/`, `keyboard/`, `detours/`, `success-*`, `detour-*`) come from earlier builds
and are not part of this pilot.

## 1. Success path by pointer -- `e3c-pointer/` -- reached

- 01-02: No thanks.
- 03: Open project or file..., volunteers.graphml. The file-reading page shows 24 nodes and 63
  edges; the blank phone cells show as empty.
- 04-05: Load. There is no control named "+": the button's name is "Add a layer or a folder".
- 06-07: The "+" beside Style layers opens a menu: Layer, Folder, Select layers..., Analyze...
- 08: Layer. "Layer 1" is added with its name selected for renaming. Which nodes is collapsed,
  with the hint "All 24 nodes: add a condition to narrow".
- 09: "Add a condition" landed on that hint text. It expanded Which nodes but did not open the
  list.
- 10: Add a condition (the button) opens the attribute list; phone reads "70% have a value".
- 11: trained. The card starts on Yes, "15 of 24 nodes".
- 12-13: Add a condition, then phone. Focus goes to the "Type the text to match" box.
- 14: phone: how to match lists Contains, Starts with, Ends with, Is exactly, Has a value,
  Has no value.
- 15: Has no value gives "4 of 24 nodes".
- 16: Done. The summary reads "trained: yes, 15 nodes", "phone: no value, 7 nodes", 4 of 24.
- 17-18: Two clicks on empty space in the panel (the Fill "+" had moved). No change.
- 19-20: Fill "+" ("Add to node fill"). Focus goes to the color box, with 6366F1 selected.
- 21: Typing red, then Enter, turns four dots red and adds the key "Color: Layer 1, 4 of 24
  nodes". The drawing shifted to make room for the key. Focus stays in the color box (FF0000).
- 22-25: Clicking each red dot gives v20 Julia Rossi, v14 Nora Lindqvist, v10 Diego Ruiz and
  v03 Aisha Bello. Each says trained Yes, phone No value.

`styles.json`: only Layer 1 was added. The data stayed volunteers.graphml throughout.

## 2. Detours

### 2a. Opening the file another way, and the find box -- `e3c-detour-start/`

- 02-04: "New from data..." (with the notice left open), then Choose a file..., then Cancel. This
  goes back to the start screen cleanly, with the notice still there.
- 05-06: Control+O, the file, then Load. The notice was never answered and is gone.
- 07: In the find box, `missing phone` gives 'No match ... type a rule such as hours >= 27'. The
  hint teaches a number rule and says nothing about a missing value. 08: Enter does nothing.
  09: `no phone` gives the same hint.
- 10: `phone` offers only "Select the 17 nodes (phone: has a value)".
- 11-13: Enter selects those 17. A right-click offers "New layer from selection", which makes no
  layer until a style is set.
- 14: Fill, red, Enter. The layer "phone: has a value" paints the 17 who HAVE a phone: the wrong
  set. Its "Style nodes" box shows dimmed.
- 15-19: Switching the card to Has no value and adding trained Yes gives the right 4. The layer
  renames itself "phone and trained". The 17 selection rings and "phone", "17 nodes selected"
  stay on screen.

### 2b. Looking for "missing" inside the condition picker -- `e3c-detour-picker/`

- 09-11: In the attribute list, `missing` gives "Nothing found". Enter does nothing; Escape
  returns focus to Add a condition.
- 12-13: A phone text card with `missing` reads "0 of 24 nodes" and "phone leaves none". Nothing
  points to Has no value in the menu one row above.
- 14: One Escape in that text box closes the whole picker. It keeps "phone contains missing,
  0 nodes", so the layer paints no one.
- 15-17: Removing the card gives "Layer 1 now styles all 24 nodes: no condition is left", with
  Undo.
- 18-20: An unfinished phone card, then a click on the drawing, gives "Dropped the phone
  condition: it was not finished". This notice has no Undo, and the inspector leaves the layer
  for the Graph overview.
- 22-26: `tra` then Tab takes trained (settled in `decided.md`). The yes/no menu offers Yes, No,
  Has a value and Has no value. Escape closes the menu, then the picker, and Yes is kept.
- 27-33: Toolbar Filters, phone. Its "how to match" menu also lists Has no value. Add step
  hides 17 people ("7 of 24 nodes").
- 34: Undo restores all 24.

## 3. Success path by keyboard only (screen-reader mode) -- `e3c-keys/` -- reached

Focus never fell to the page body after the start.

- Start screen order: Main menu, Local only, Settings..., Open project or file..., New from
  data..., four "Open the ... sample" buttons, What is collected (collapsed), Share usage data,
  No thanks. Tab from No thanks wraps to Main menu.
- Enter on No thanks moves focus to "Open project or file..." and announces "Usage data stays
  off. Change this in Settings > Privacy".
- Enter, then volunteers.graphml. Focus goes to Load ("All 24 rows"). Tab from Load wraps to
  Main menu; Shift+Tab goes back.
- Enter on Load moves focus to the heading "Graph, volunteers: 24 nodes, 63 edges" in the right
  inspector. The layer "+" is then 13 Tabs away: From volunteers.graphml, Graph actions, Values,
  About Direction, About Degree, Resize inspector, Main menu, Project: volunteers, Local only,
  Graph, Graph volunteers.graphml, Find, Add a layer or a folder.
- Enter opens the menu on "Layer". Enter puts focus in the textbox "Layer name". Enter confirms;
  focus goes to the treeitem "Layer 1, node and edge layer, 24 nodes, 63 edges".
- Which nodes is 9 Tabs away: Graph settings, Resize left panel, Graph drawing, Analyze, Select
  what it paints, Layer actions, Style, Node, Style nodes, then "Which nodes, 24 of 24 nodes,
  All 24 nodes: add a condition to narrow".
- Enter goes to Add a condition, Enter opens "Find an attribute". `tra` and Enter give "trained:
  how to match" = Yes, announcing "15 of 24 nodes".
- Tab, Enter, `pho`, Enter puts focus in "phone: text to match". Shift+Tab goes to "phone: how to
  match" (Contains). Enter, ArrowUp ("Has no value"), Enter announces "4 of 24 nodes".
- Tab, Tab reach Done. Enter moves focus to "Which nodes, 4 of 24 nodes, trained: yes, 15 nodes,
  phone: no value, 7 nodes".
- 4 Tabs reach "Add to node fill". Enter puts focus in "Node color, not set, drawn #6366F1
  indigo" ("Node color added: pick a value"). `red` and Enter give "Node color, set here, red"
  ("Node color now red, on 4 nodes").
- Escape keeps focus in the field (settled). Tab goes to "Node color by attribute", then "Remove
  node color".
- F6 twice reaches Analyze in the toolbar. ArrowRight moves to Table; Enter opens the table with
  focus on the "Id" header.
- ArrowRight to phone, Enter: "Sorted by phone, A to Z". Control+End goes to the last row's phone
  cell ("No value"). The name column, read upward: Zara Ahmed, Julia Rossi, Ivan Petrov, Nora
  Lindqvist, Diego Ruiz, Leo Novak, Aisha Bello. Screenshot 82 shows the four with trained Yes.
- Enter selects a row ("1 node selected"). Escape in the grid goes to "Table" (settled).

## Answer key vs screen (success path)

1. Step 6: the new layer's Which nodes is collapsed, and its hint also says "add a condition".
   A click on that text only expands it (pointer 09); a second click opens the list (pointer 10).
2. After step 14 the key says focus is on the disabled Fill "+". On screen it stays in the color
   box, now "Node color, set here, red" (pointer 21, keys).
3. The find hint for `missing phone` reads "hours >= 27"; the key says "hours > 27"
   (detour-start 07).
4. The key says Filters' Is box lists only values. On this build a phone filter step offers Has
   a value and Has no value (detour-picker 31-33).
5. By keyboard, focus after Load goes to the inspector heading, 13 Tabs from the layer "+". The
   key does not mention it.

## Defects

- The add-layer button has no visible text and is not named "+" (pointer 05). It and the Fill
  "+" show a default arrow pointer on hover (pointer 06, 19).
- The "add a condition to narrow" hint competes with the "Add a condition" button; the first
  click does not open the list (pointer 08-09).
- No find-box query reaches "has no value". `phone` offers only "has a value", and the no-match
  hint teaches only number rules (detour-start 07, 09, 10).
- After the selection-made layer is corrected, the 17 selection rings and "17 nodes selected"
  stay around a layer that paints 4 others (detour-start 19).
- In a layer made from a selection, "Style nodes" shows dimmed (detour-start 14, 19).
- "Nothing found" for `missing` in the attribute list, and "phone leaves none" on a text card,
  never point to Has no value in the card's menu (detour-picker 09, 13).
- One Escape in a text card's box closes the whole picker and keeps a rule that matches no one.
  The number card keeps the picker open on the first Escape (detour-picker 14).
- "Dropped the phone condition" has no Undo, unlike a removed condition, and the inspector
  leaves the layer (detour-picker 20).
- Filters offers Has no value, and a filter step hides everyone else: a likely wrong turn that
  breaks "everyone else stays", recoverable with Undo (detour-picker 31-34).
- Keyboard: after Load, focus goes to the right inspector, 13 Tabs from the layer "+" (keys).
- Keyboard: from the new layer's row, Which nodes is 9 Tabs away, through the canvas and the
  toolbar (keys).
- Keyboard: table cells read only their value, with no column name in the tool's reading
  (keys, table walk).
- The table and the inspector do not mark which people the layer paints. Names come only from
  clicking each red dot, or from reading two columns per row (pointer 22-25, keys 82).

## Skipped

Nothing.
