# T48A pilot on build e3c5bca8e6

Task: bring in volunteers.graphml, have the program work out circles of people who work shifts
together (each in its own color), keep those colors only on people with food-safety training,
leave everyone else as the file first drew them, and say how many keep a circle's color. Answer:
15.

All four sessions ran on the frozen build `.study-builds/tier3-r1-e3c5bca8e6` (each
`session.json` records commit e3c5bca8e6) and started from an empty app. The data stayed
volunteers.graphml (24 nodes, 63 edges) the whole way in every session. The older folders here
(`pointer/`, `keyboard/`, `detours/`) come from earlier builds and are not part of this pilot.

## 1. Success path by pointer -- `e3c-pointer/` -- reached (12 steps)

- 02: No thanks.
- 03: Open project or file..., volunteers.graphml. The file-reading page: 24 nodes, 63 edges;
  trained reads "yes / no".
- 04: Load. 24 indigo dots.
- 05-07: Analyze, `louvain`, Enter. The Louvain form opens (Resolution 1, Weight None, Run).
- 08: Run. A "Louvain" folder appears and a "Color: Louvain" key with Group 1 to 3 opens over the
  top left. The inspector stays on the Graph. The drawing moves about 130 px right to make room
  for the key.
- 09: The Louvain folder: "3 layers in Louvain. Layers added later are not changed."; Which nodes
  "24 of 24 nodes", chip "Louvain: <<Layer>>".
- 10: Which nodes opens the picker; the Louvain card reads "<<Layer>> 3 layers, Group 1, Group 2,
  Group 3".
- 11: Add a condition. The list shows name, role, hours, trained, phone, and under Results
  "Louvain (already a condition)".
- 12: trained. The card starts on Yes ("15 nodes"); Which nodes reads 15 of 24; the key adds
  "15 of 24 nodes"; 9 dots turn back to indigo at once. No node moves.
- 13: Done. Chips "Louvain: <<Layer>>" and "trained: yes, 15 nodes".

`styles.json`: the starting Everything layer paints indigo on 9 nodes; every group layer keeps its
own color. The answer 15 shows in three places (Which nodes, the chip, the key).

## 2. Detours -- `e3c-detour-start/`

One session walked the commonest wrong turns in order.

- **File by another door (02-05).** "New from data..." with the usage notice left open: the notice
  goes away unanswered. Choose a file..., then Cancel: back to the start screen cleanly, notice
  back. Control+O, the file: the same reading page as the success path.
- **Find box (08-14).** `trained` offers "Select the 15 nodes (trained: yes)"; Enter selects them
  (Values summary: trained Yes (15)). A right-click on one offers Neighborhood, Path between...,
  Frame selection, New layer from selection, Add note. Escape, then two Escapes in the box: the text
  clears, the 15 stay selected and focus goes to the canvas (settled). `not trained` answers
  'No match for "not trained". Still selected: 15 nodes. To select by a value, type a rule such as
  hours >= 27': nothing reaches the untrained people.
- **Filters (17-22).** The toolbar's Filters switches the left panel to Data. trained, Yes, Add
  step: 9 people disappear, "15 of 24 nodes" in the title bar and the key ("Color: Louvain, full
  graph"). The right count with the wrong look (false finish). The Undo arrow ("Undo adding the
  filter step "trained is Yes" Ctrl+Z") brings everyone back.
- **One cluster only (24-31).** The folder's caret expands Group 1 to 3 (8 each). Group 1, Which
  nodes, Add a condition, trained: Group 1 paints 5, the key reads "21 of 24 nodes", yet the trained
  card still says "15 nodes". Escape closes the picker and keeps the card (settled). A second
  Escape, with focus in the layer's inspector, clears the 15-node selection made earlier in the find
  box ("Selection cleared: 15 nodes"). Control+Z undoes the condition ("Undid changing the
  conditions on Group 1.").
- **A covering layer (32-42).** With Group 1 selected, "+" > Layer makes "Layer 1" inside the
  Louvain folder, above Group 1, although the folder says "Layers added later are not changed".
  Which nodes opens the picker with the attribute list closed; one click on Add a condition opens it
  (its Results also list "Community size 8 to 8"). trained, No, Done: "trained: no, 9 nodes". Fill
  "+" adds a Color line at `6366F1`, selected and in italics; Enter sets it (settled: an unset line
  takes the value it shows) and the 9 return to indigo. The key gains "Color: Layer 1, 9 of 24
  nodes" above the Louvain groups. The drawing matches the target, but nothing on screen says 15.
- **Control+O with a graph open (43-44).** The page is titled "Add to volunteers", warns "63 edges
  in this file are already in volunteers. Load adds them a second time." and makes "Replace
  volunteers.graphml" the main button. Cancel returns to the graph unchanged.

## 2b. Detours on the condition card -- `e3c-detour-cards/` -- 59 steps

A second detour session, from an empty start to the same Louvain run (02-08, as the success path).

- **"Has no value" looked for in the add list (11-13).** On the folder's picker, Add a condition,
  `has no value` typed into "Find an attribute": the list reads "Nothing found", and Enter does
  nothing. Nothing there points to the card's own menu. Escape closes the list (14).
- **The card's own menu (15-20).** trained, then the card's value menu: Yes, No, Has a value, Has
  no value (17). Has no value: "0 nodes", Which nodes "0 of 24", every node back to indigo and
  the color key closes (18). Back to Yes: 15 of 24, the key returns (20).
- **An unfinished card (21-43).** A `role` card added and left with no value ticked:
    - a click on empty canvas closes the picker, drops the card with the notice "Dropped the role
      condition: it was not finished", keeps the trained card (15 of 24) and moves the inspector to
      the Graph (23);
    - Enter on the card's "Is any of" field opens its menu (Is any of, Has a value, Has no value)
      and drops nothing (28); Escape closes the menu (29), a second Escape closes the picker, drops
      the card with the same notice and leaves focus on Which nodes (30);
    - Done drops it with the same notice (38);
    - a click in the right panel outside the picker (the folder's description at 34, the Shape
      heading at 42) or in the left panel's empty layer list (43) leaves the picker open with the
      unfinished card in it: nothing is dropped and nothing closes.
- **The cover route's other branch (44-59).** Everything selected, "+" > Layer: "Layer 1" lands
  above the Louvain folder, not inside it (47). Which nodes opens the picker with the attribute
  list closed (48). trained, No, Done: "trained: no, 9 nodes" (53). Fill "+": an unset `6366F1`
  line in italics, its text selected (55). `dc2626` and Enter: the 9 turn red, the key adds
  "Color: Layer 1, 9 of 24 nodes", focus stays in the field (56). `6366F1` typed over it and
  Enter: the 9 return to indigo (57). Escape keeps focus in the field (58, as `decided.md`
  settles); Tab goes to "Node color by attribute" (59). Everything's Fill line, seen at 46, reads
  "Covered by Group 1, Group 2 and Group 3 on 15 of 24": one more place the answer shows.

## 3. Success path by keyboard only, screen-reader mode -- `e3c-keys/` -- reached

Focus never fell to the page body after the start.

- Start screen: Main menu, Local only, Settings..., Open project or file..., New from data...;
  Shift+Tab from Main menu wraps to No thanks (that one step took over two minutes to return; the
  cause was not traced and no other step was slow). Enter on No thanks moves focus to "Open project
  or file..." and announces "Usage data stays off. Change this in Settings > Privacy". Enter, the
  file: focus on Load ("All 24 rows").
- Enter on Load: focus on the heading "Graph, volunteers: 24 nodes, 63 edges" in the right
  inspector. Analyze is 18 Tabs away: From volunteers.graphml, Graph actions, Values, About
  Direction, About Degree, Resize inspector, Main menu, Project: volunteers, Local only, Graph,
  Graph volunteers.graphml, Find, Add a layer or a folder, the layer tree, Graph settings, Resize
  left panel, Graph drawing, Analyze. Shift+A also opens Analyze, but only the "+" menu shows it.
- Escape on the analysis list returns focus to Analyze. Enter, `louvain` (Louvain highlighted),
  Enter: focus on "Run Louvain". Tab order: Back to analyses, Resolution, Weight, Expand Advanced,
  Run Louvain. In Resolution, Escape goes back to the list with `louvain` kept; Tab goes to Weight;
  Enter runs Louvain at once, returns focus to Analyze and announces "Louvain finished: 3 groups,
  each a layer in the Louvain folder of Style layers".
- Shift+Tab 4 times reaches the tree on Everything; ArrowUp reaches "Louvain, folder, 3 layers";
  Enter selects it. Which nodes is then 10 Tabs away: Graph settings, Resize left panel, Graph
  drawing, Analyze, Select what it paints, Folder actions, Style, Node, Style nodes, "Which nodes,
  24 of 24 nodes, Louvain: each layer's own value".
- Enter opens the picker with focus on "Louvain: from each layer, 3 layers. Group 1, Group 2,
  Group 3"; Shift+Tab reaches "Remove Louvain from every layer". Enter on Add a condition gives
  "Find an attribute"; `tra` highlights "trained, 2 values"; Enter gives "trained: how to match"
  = Yes and announces "15 of 24 nodes".
- In that field: Enter opens the list on Yes; Escape closes the list; a second Escape closes the
  picker, keeps the card, and puts focus on "Which nodes, 15 of 24 nodes, Louvain: each layer's own
  value, trained: yes, 15 nodes". Tab order inside the reopened picker: Louvain card, Remove
  trained, the trained value, Add a condition, Done. Tab past Done closes the picker and lands on
  "Add to node shape". Enter on Done closes it and returns focus to Which nodes.
- Final screen (113.png) as on the pointer path.

## Answer key vs screen

1. The key says that on a new layer with no conditions the picker opens with the attribute list
   already open, so the first click on "Add a condition" closes it. On this build Which nodes opens
   the picker with the list closed and one click on Add a condition opens it (detour 35-36).
2. The key says Enter on the cover layer's unset `6366F1` line, or `6366F1` typed and Enter, leaves
   it unset, and the cover route needs another color first (2 steps more). On this build Enter sets
   it and repaints the 9 (detour 41-42), as `decided.md` settles. The cover route is 2 steps
   shorter than the key says.
3. The key says Tab from the card's value goes to "Remove trained" before Add a condition. On this
   build Remove trained comes before the value; Tab from the value goes to Add a condition (keys).
4. Step 7 in the key does not mention that the drawing moves when the color key opens; it moves
   about 130 px (pointer 04 vs 08). (T46 and T47 in the key say the drawing keeps its size and
   place.)
5. The key does not mention the "Community size 8 to 8" entry under Results in a new layer's
   attribute list (detour 36).

## Defects

- Find box: `not trained` gives no match, and its hint teaches only a number rule
  ("hours >= 27"). Nothing in the find box selects the people without training, though "everyone
  else" is half the task (detour-start 14).
- Cover route: the answer is on screen nowhere. The key says "Color: Layer 1, 9 of 24 nodes" and
  the Louvain groups carry no count, so the reader must subtract 9 from 24 (detour-start 42, 44).
- A layer added while a group layer is selected lands inside the Louvain folder, which says "Layers
  added later are not changed" (detour-start 34).
- The trained card on a single group layer says "15 nodes" while that layer paints 5. The count
  reads as the layer's result but is the whole file's (detour-start 28).
- Escape with focus in a layer's inspector clears a selection made earlier in the find box, with
  no Undo in the notice (detour-start 30).
- The drawing moves when the color key opens after Run (pointer 04, 08).
- The cover layer's row has no color swatch in the layer tree, unlike the group rows (detour-start
  44).
- The filter step "trained is Yes" gives the right count with the wrong look: it hides the 9
  instead of leaving them indigo. Undo recovers it (detour-start 20-22).
- Keyboard: after Load, focus goes to the right inspector's heading, 18 Tabs from Analyze (keys).
- Keyboard: from the folder row, Which nodes is 10 Tabs away, through the canvas and the toolbar
  (keys).
- Add list: `has no value` typed into "Find an attribute" answers only "Nothing found"; nothing
  says the option lives in a card's own value menu (detour-cards 12-13).
- An unfinished card is kept open by a click anywhere in either panel, but dropped by a click on
  the drawing; the same "click away" does two different things depending on where it lands
  (detour-cards 23 vs 34, 42, 43). The detour list in `tasks.md` says a click in the panel drops
  it; on this build it does not.
- Screen reader: Which nodes is named "Louvain: each layer's own value" where the screen shows
  "Louvain: <<Layer>>", so a sighted helper and a screen-reader user use different words (keys).

## Not walked

Nothing. Every route the task's detour list names was walked on this build.
