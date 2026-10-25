# T42A pilot on build e3c5bca8e6

Task: open volunteers.graphml, make orange everyone who gave 20 or more hours this quarter, leave
everyone else as they are, and say how many. Answer: 11 (hours 20 to 52).

Every session below ran on the frozen build `.study-builds/tier3-r1-e3c5bca8e6` (each
`session.json` records commit e3c5bca8e6) and started from an empty app. The older folders here
(`pointer/`, `keys/`, `detours/`, `success-pointer/`) come from earlier builds or a start that
never ran, and are not part of this pilot. The data stayed volunteers.graphml (24 nodes, 63
edges) in every session; no session loaded anything else.

## 1. Success path by pointer -- `e3c-success-pointer/` -- reached

- 01-02: No thanks.
- 03: Open project or file..., volunteers.graphml. The file-reading page shows 24 nodes, 63
  edges; hours reads "whole number".
- 04: Load. Graph place, layers Hovered 0, Selected 0, Everything 24.
- 05-06: The "+" beside Style layers (tooltip and name "Add a layer or a folder"; the pointer
  stays a default arrow) opens Layer, Folder, Select layers..., Analyze...
- 07: Layer. "Layer 1" is added with its name selected for renaming; Which nodes is collapsed,
  "All 24 nodes: add a condition to narrow".
- 08: "Add a condition" lands on that hint: it expands Which nodes and shows the button "Add a
  condition" and Done, but opens no list.
- 09: Add a condition opens "Find an attribute": name, role (3 values), hours (2 to 52), trained
  (2 values), phone (70% have a value), then Structure: Node id.
- 10: hours. Card "hours, 24 nodes", Between, slider, from box `2` selected with focus, to `52`.
  The subtitle already reads "Node layer" and the Edge tab "not styled".
- 11: `20`, Enter: the picker closes, "hours 20 to 52, 11 nodes", 11 of 24, the layer row 11.
- 12-13: Fill "+" ("Add to node fill"; default arrow pointer). Color line with `6366F1` in
  italics, selected, focus in the box.
- 14: `orange`, Enter: 11 dots orange (#FFA500), key "Color: Layer 1" / "11 of 24 nodes", the
  drawing shifts right to make room for the key, the Legend button turns on. Focus stays in the
  color box with FFA500 selected.
- 15: Escape keeps focus in the color box (settled). 16: Tab goes to "Node color by attribute".

`styles-steps.jsonl` ends with colors #6366f1 and #ffa500; only Layer 1 was added.

## 2. Detours

### 2a. Opening the file another way, the Data place, the find box -- `e3c-detour-start/`

- 02: "New from data..." with the usage notice still open: "Open as a new graph", Drop a file
  here / Choose a file..., Load disabled ("Choose a file first").
- 03: Cancel goes back to the start screen cleanly; the notice is still there.
- 04-05: Open project or file..., volunteers.graphml, Load.
- 06-07: Data place; clicking hours shows its summary (Number, 100% have a value, 24 distinct,
  Lowest 2, Highest 52). No styling is offered there.
- 08: Right-click on hours: Add label line, Filter to..., Show in table only.
- 09: Filter to... opens "New filter step": an attribute's value, hours, Between, 2 to 52, and
  the count line reads "24 to 24 nodes".
- 10: `20` and Enter in the from box commits the whole step at once (no Add step press): 13
  people vanish, the top bar reads "11 of 24 nodes", the step reads "hours is between 20 and 52,
  24 to 11 nodes". A dead end for this task (it hides, it does not color).
- 11: Unticking the step brings all 24 back.
- 12-13: Graph place. The find box with `hours >= 20` offers "Select the 11 nodes (hours 20 or
  more)".
- 15: Enter selects the 11; the selection rings are gold-yellow.
- 16-18: Style, Fill "+", `orange`, Enter: "Made layer hours 20 or more for 11 nodes", key "Color:
  hours 20 or more, 11 of 24 nodes". Same look as the success path (SD by the key).

### 2b. The card's other choices, wrong ends, bad values, Control+O -- `e3c-detour-card/`

- 04-06: Layer, Add a condition, hours. The "how to match" menu offers Between, Highest, Has a
  value, Has no value: nothing reads "at least" or "or more".
- 07: Highest: count box `10` with focus, 10 of 24 nodes.
- 08: `20`, Enter: "top 20 by hours, 20 nodes", 20 of 24. Nothing on screen says these are not
  the people with 20 hours or more.
- 09-10: Reopening the card and choosing Between again resets to 2 to 52 (24 nodes).
- 11: `20` in the "to" box, Tab: 2 to 20, 14 of 24 (the wrong side of the line); Tab went to
  Add a condition.
- 12: `52` back in the to box, Enter closes the picker.
- 14: `>=20` in the from box, Enter: '">=20" is not a number. Type a number, like 27. The count
  and drawing still use 2 to 52.' in small red text; the picker stays open.
- 15: Escape puts back 2 and removes the message; focus stays in the box.
- 16: `20`, Tab: 11 of 24, focus to the to box (52 selected).
- 17: Escape in the to box closes the picker and keeps 20 to 52 (settled); focus goes to Which
  nodes.
- 18-19: Control+O, volunteers.graphml: "Add to volunteers", with a warning "63 edges in this
  file are already in volunteers. Load adds them a second time." and the default button
  "Replace volunteers.graphml".
- 20: Cancel keeps the graph and the layer as they were.
- 21: Add to node fill, `orange`, Enter: the same look as the success path.

## 3. Success path by keyboard only (screen-reader mode) -- `e3c-keyboard/` -- reached

Focus never fell to the page body after the start (01 starts with nothing focused, as a fresh
page does).

- 02-13: Start screen order: Main menu, Local only, Settings..., Open project or file..., New
  from data..., the four "Open the ... sample" buttons, What is collected (read as a
  DisclosureTriangle, collapsed), Share usage data, No thanks.
- 14: Enter on No thanks moves focus to "Open project or file..." and announces "Usage data
  stays off. Change this in Settings > Privacy".
- 15-16: Enter opens the chooser; volunteers.graphml puts focus on Load ("All 24 rows").
- 17: Enter on Load: focus on the heading "Graph, volunteers: 24 nodes, 63 edges", announced.
- 18-24: F6 cycles inspector heading, Graph drawing (canvas), Analyze (toolbar), "Graph
  volunteers.graphml" (left panel), and back to the inspector. The top bar is not in the F6
  cycle.
- 25-27: From the left panel, Tab to Find, Tab to "Add a layer or a folder", Enter: menu opens on
  "Layer".
- 28-29: Enter gives the textbox "Layer name" (Layer 1); Enter confirms, focus on the treeitem
  "Layer 1, node and edge layer, 24 nodes, 63 edges".
- 30-36: F6 goes to the inspector at "Select what it paints"; then Layer actions, Style, Node,
  Style nodes, "Which nodes, 24 of 24 nodes, All 24 nodes: add a condition to narrow"; one Tab
  too many lands on "Add to node shape".
- 37-38: Shift+Tab, Enter: focus on "Add a condition".
- 39-41: Enter opens "Find an attribute"; `hou` highlights "hours, 2 to 52"; Enter puts focus in
  "hours from, number" (2).
- 42-43: `20`, Tab: focus to "hours to, number" (52) and "11 of 24 nodes" is announced.
- 44-45: Shift+Tab back to the from box; Escape closes the picker, keeping 20 to 52 (settled):
  focus on "Which nodes, 11 of 24 nodes, hours 20 to 52, 11 nodes".
- 46-50: Enter reopens the card with focus in the from box (20). Its Tab order is slider start,
  slider end ("hours range start/end"), from box, to box.
- 51: Enter in the from box closes the picker, focus on Which nodes.
- 52-55: Four Tabs: Add to node shape, visibility, text, fill.
- 56: Enter: "Node color, not set, drawn #6366F1 indigo", announced "Node color added: pick a
  value".
- 57-58: `orange`, Enter: "Node color, set here, orange", announced "Node color now orange, on 11
  nodes". 11 dots orange, key "Color: Layer 1, 11 of 24 nodes".
- 59-61: Escape keeps focus in the field (settled); Tab goes to "Node color by attribute";
  Shift+Tab returns.

## Answer key vs screen (success path)

1. Steps 5-6: after Layer, Which nodes is collapsed and its hint also says "add a condition". A
   click on that text only expands it (pointer 08); a second click on the "Add a condition"
   button opens the list (pointer 09). The pointer route is 11 steps, not 10.
2. Step 9: the key says the subtitle still reads "Node and edge layer" when Fill "+" is pressed.
   On screen it already reads "Node layer" (and Edge "not styled") as soon as hours is picked
   (pointer 10).
3. Step 10: the key says focus ends on the disabled Fill "+". On screen it stays in the color
   box with FFA500 selected (pointer 14, keyboard 58).
4. The key says that by keyboard no live region announces the new count. On this build Tab out
   of the from box announces "11 of 24 nodes" (keyboard 43), and the color says "on 11 nodes".
5. The key says that after Highest is picked focus stays on the match list. On this build focus
   goes to the count box with 10 selected, so typing 20 goes straight in (detour-card 07-08).
6. The key does not give the keyboard route to the layer "+" after Load. F6 reaches the left
   panel in 4 presses from the canvas, then 2 Tabs (keyboard 18-26).

## Defects

- Pointer: the "add a condition to narrow" hint is a click target that only expands Which nodes
  and opens no list, next to a real "Add a condition" button (pointer 07-09).
- Pointer: the add-layer "+" and the Fill "+" show a default arrow pointer, not a hand, on hover
  (pointer 05, 12).
- Detour: the match menu offers Between, Highest, Has a value, Has no value; nothing says "at
  least" or "or more", the words of the task. "At or over" needs Between with the top left at
  the maximum (detour-card 06).
- Detour: Highest with 20 gives "top 20 by hours, 20 nodes" and nothing warns that this is a
  count of people, not a line on hours (detour-card 08). False-done risk.
- Detour: 20 typed into the "to" box gives 2 to 20, 14 nodes, with nothing to say it is the
  wrong side (detour-card 11).
- Detour: '">=20" is not a number. Type a number, like 27.' does not say how to get "20 or more";
  the message is small red text (detour-card 14).
- Detour: in a new filter step, Enter in the from box adds the whole step at once, hiding 13
  people without pressing Add step (detour-start 10). Its count line reads "24 to 24 nodes" before
  and "24 to 11 nodes" after, which reads oddly (detour-start 09, 10).
- Detour: the find box's selection rings are gold-yellow, close to the orange the task asks
  for, so a selection can look like the task is done (detour-start 15, 18).
- Keyboard: F6 does not visit the top bar (Main menu, project name, Undo); it cycles inspector,
  canvas, toolbar, left panel (keyboard 18-24).
- Keyboard: after Load, focus is on the inspector heading; the layer "+" is 4 F6 presses and 2
  Tabs away, or about 13 Tabs (keyboard 17-26).
- Keyboard: F6 into the inspector lands on "Select what it paints", and Which nodes is 5 Tabs
  further (keyboard 30-35).
- Screen reader: "What is collected" is read with the raw role DisclosureTriangle (keyboard 11).

## Skipped

Nothing. Every route above was walked to its end on the frozen build, each in its own session,
and every session was ended.
