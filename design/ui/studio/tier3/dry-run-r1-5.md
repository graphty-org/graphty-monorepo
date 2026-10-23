# Tier 3 dry run before round 1, fifth pass: what to fix and what to leave

Every tier 3 task (T37 to T51, both halves) was piloted on the frozen build e3c5bca8e6, the build
that holds the fourth dry run's fixes (commits 28e989215 to 52cb47a85), from a clean tree (every
pilot's `session.json` says `commit: e3c5bca8e6...`, `uncommittedChanges: false`): the success
path by pointer, the commonest detours, and the task by keyboard with a screen reader's reading.
This page lists every problem those pilots reported (369 lines), sorts each one and gives the
reason. Screenshots are under `rounds/r1/pilot/<task>/<route>/`.

The sessions are for learning what a first-time user needs to style a graph. A session spent on a
drawing that jumps away, a click that only half works or a key that throws away what was typed
teaches nothing about that, so every such problem is fixed before round 1. A real design question
-- where something lives, what a reader expects, what a new concept is called -- is left in.

Classes:

- **(a) fix now.** Blocks the task or misleads the reader on a task's path or a listed detour.
  Each names its fix group and its origin: **new**; **regression** (caused by the fourth pass's
  fixes, commit named); **repeat** (an earlier triage already sent the same problem to fix);
  **instance** (another screen showing a defect of a shared part already seen).
- **(b) leave for the sessions.** A design question the study exists to answer.
- **(c) cosmetic.** Neither blocks nor misleads; moved to `backlog.md`.
- **(n) no change.** A settled behavior in `decided.md` (the entry is named), an owner item, a
  property of the data, or a note about the pilot or the study tool.

## Totals

- 369 lines: 124 (a), 11 (c), 101 (b), 133 (n).
- Of the 124 (a): 37 regressions, 14 repeats, 31 instances, 42 new. 2 block a task (T40B: the
  letters typed after "Starts with" are lost; T47A: after Undo the shape list shows Box as set
  and will not take Box again).
- Regressions by fix commit: ef2f796ee (the key's arrival frames the graph) 16; 9f8c35c76 (a
  layer with no condition opens with the attribute list closed) 10; ce953d22e (focus after a style
  line is written) 3; 3c27003a6 (find names columns as the screen does) 2; bdd01700e (a type-ahead
  that matches nothing highlights nothing) 2; d714c8530 (the "About Degree" tooltip) 2; a90c4d40c
  (Escape in the inspector) 1; 52cb47a85 (layer rows say what a layer draws) 1. 37 of 124 is 30%:
  under the 40% stop line, over the exit test's 10%.
- One settled behavior is reversed: the drawing never re-frames when the key arrives (see
  `decided.md`, "The drawing"). One entry is corrected without a change in the build: the layer
  tree is entered at its resting row Everything, as the team decided on 2026-10-18.

## Pass 4's blockers on this build

- An unset line that could not take the default it shows: fixed. Enter and typing now set it; Tab
  leaves it unset (T49A row 5), which `decided.md` keeps. Escape on a just-added unset line takes
  it back (T42B, T43A, T43B), settled in `decided.md`.
- "cube" in the shape list picking Cylinder: fixed, but the fix made "cube" answer with nothing at
  all (group 20, regression of bdd01700e).
- ArrowDown and Enter rewriting a colleague's open rule: not seen on this build (T50 A and B
  opened the rule by pointer and keyboard).

## Not walked on this build

- T46B keyboard walk past the start screen (the screen-reader walk took about 25 seconds a step).
- T49B keyboard walk past the start screen. Its pilot reported the session left open; no
  `real.mjs` process was running when this triage was written, so no browser slot is held.
- T38A: Escape and Tab in a new layer's name field; Done by keyboard. T38B: Analyze, Quick
  actions, the toolbar's filter button and the Graph inspector's Style tab.
- No pilot could write its `report.md` (the harness refuses a subagent's report file); each
  report's content is in the lines below.

The next pass walks these first.

## Fix groups

Blocking lines first: group 10 (letters lost after "Starts with") and group 19 (Box after Undo).

1. **The drawing stays put** (graphty `canvas/viewInsets.ts`, `canvas/LegendCard.tsx`,
   `canvas/CanvasOverlays.tsx`). When the first color is set the key appears and the whole
   drawing shrinks and moves right, so the reader loses what they were looking at; it stays off
   center after Undo removes the key (16 walks, 15 tasks). Cause: ef2f796ee frames the graph once
   when a key arrives over a drawn node. Remove that arrival frame; the key's room is used only by
   Frame and by the first framing at open. A filter step on or off does not re-frame either
   (T48B). `decided.md`: "The drawing moves only when the reader asks".
2. **Find box words and keys** (graphty `graph-place/FindBox.tsx`). "Did you mean Degree?" for
   `=degree`, differing only in letter case (3c27003a6 compares case): accept a column name in any
   case and never suggest a case change. After a run the stale "Did you mean" line comes back under
   the unfocused box and is spoken again between "Degree added, running" and "Degree finished":
   the line belongs to the text being typed and goes when the box loses focus. Enter on text with
   no match says nothing (repeat of pass 4 group 6): speak and show the no-match line. Clicking
   another panel while the list is open erases the typed text: the text stays until the reader
   clears it. The box keeps "hours" after the selection it made was replaced by a click on a dot
   (repeat of pass 4 group 6): it clears when its selection is replaced.
3. **Announcements name what changed** (graphty `inspector/words.ts`, the status announcer). A
   one-node selection is spoken as "1 node selected" with no name, from find and from the table:
   say "Valjean selected" (the node's name, group 17). Frame (f) says nothing to a screen reader:
   say what was framed.
4. **Analysis filter: Tab takes the highlighted analysis** (graphty `analyze/AnalyzePopover.tsx`).
   Tab with "cluster" typed and an option highlighted closed the popover, took nothing and moved
   focus to the inspector (repeat of pass 4 group 8). `decided.md`: "Tab in a list with letters
   typed and an option highlighted takes that option".
5. **Tooltips only for the control the reader is on** (compact-mantine
   `components/overlays/overlayBehavior.ts`, `tooltipPlacement.ts`). The "About Degree" tooltip
   shows on top of its own open popover (d714c8530 added the tooltip). A tooltip stays after Tab
   leaves its control (Shape box, T47A). After Undo the label line's markup tooltip opens by
   itself (T44A). A tooltip closes while its trigger's popover is open, and closes when focus or
   the pointer leaves its trigger; focus put back by Undo does not open one.
6. **Dimmed Undo and Redo stay Tab stops** (graphty `frame/Header.tsx`). The header passes
   `skipWhileDisabled` to both, so right after a graph opens Tab goes from the project name to
   "Local only" (6 walks). Delete the prop. `decided.md`: "A dimmed Undo and Redo are Tab stops".
7. **F6 moves between the five regions** (graphty `frame/focus.ts`, `keys/keys.ts`,
   `frame/Frame.tsx`). F6 cycles inspector, canvas, toolbar and the "Resize left panel"
   separator: it never reaches the left panel's controls or the top bar (6 walks). Regions: top
   bar, left panel (its first control), canvas, toolbar, inspector; a separator is never one.
   Also trace why Shift+Tab from Main menu on the start screen took over two minutes to return
   (T48A keyboard); name the cause before closing the group.
8. **A focused heading shows its ring** (graphty inspector heading, compact-mantine focus ring).
   After a graph opens, and after Enter in find, focus sits on the inspector heading with no
   visible ring (WCAG 2.4.7).
9. **Add a condition in one click** (graphty `style/WhichPicker.tsx`). The collapsed line "All 24
   nodes: add a condition to narrow" opens a picker holding a second "Add a condition" button and
   Done, so the act takes two clicks and two controls share a name (10 walks). Cause: 9f8c35c76
   opens a layer with no condition "on Add a condition with its list closed". With no condition,
   opening the picker opens the attribute list with focus in its search; "Add a condition" opens
   the list and never toggles it closed. `decided.md`: "With no condition yet, opening 'Which
   nodes' opens the attribute list".
10. **Condition cards: focus, Escape and spoken counts** (graphty `style/WhichPicker.tsx`,
    `style/cards.ts`; the filter step shares them through `data-place/Filters.tsx`). BLOCKING:
    after "Starts with" focus stays on the match menu, so typing GAL reopens it with "Ends with"
    highlighted and the letters never reach the box (pass 4 fixed this for Highest and Between
    only). Every match pick puts focus in the value box. Escape in a number card's "from" box
    throws away the typed 10000 or 5 and puts back the old value; one Escape in a text card's box
    closes the whole picker and keeps "phone contains missing, 0 nodes": Escape keeps what was
    typed and keeps the picker open. ArrowDown on the closed suggestion list is spoken "GAL1
    selected" while Enter keeps GAL: nothing is spoken as chosen unless Enter takes it. Each
    typed letter is spoken as a new count (three announcements for "GAL"): speak it once when
    typing pauses. `decided.md`: the "Lists and cards" and "Escape" entries of 2026-10-19.
11. **Style fields: Tab, Escape and remove** (graphty `style/useFocusLine.ts`,
    `style/PropertyRow.tsx`, `style/LabelSettings.tsx`; compact-mantine `StyleNumberInput.tsx`,
    `CompactColorInput.tsx`). Tab after typing a width writes it but focus stays in the box with
    the value reselected, so a second Tab is needed; Tab out of a selection's color box makes the
    layer and throws focus to the Style tab (both ce953d22e: the write redraws the line and the
    focus hook pulls focus back). After "Remove edge color" the Width line slides up and its
    remove button takes focus, so a second Enter removes Width too (ce953d22e): focus goes to the
    section's "+". Escape in Label settings' Size box closes the whole popover: it keeps focus in
    the box. Escape in a width box restores the value silently while the color box speaks "Edit
    discarded"; the color box shows nothing on screen: every style box says it, spoken and shown.
12. **Color picker: refusals and Tab order** (compact-mantine `color/ColorPickerPanel.tsx`).
    "FF0000blue" in the hex box is dropped silently and Enter closes the picker: say the refusal as
    the color box does. The close button, format list, eyedropper and sliders are not Tab stops,
    and Tab past the last swatch closes the picker: Tab walks every control before it leaves.
13. **One name per control, and names that say the value** (graphty `style/cards.ts`,
    `style/words.ts`, `style/ValuePicker.tsx`, `style/BindingPopover.tsx`,
    `graph-place/StyleTree.tsx`, `frame/menus.tsx`, `frame/historyWords.ts`,
    `inspector/GraphSettings.tsx`, `data-page/DataPage.tsx`). The filter's attribute list says
    "Node id" where the table and Data place say "id" (repeat since pass 1). The Shape group is
    named "Shape Shape". A group and a text box in the Graph inspector are both named
    "Background color". The box labeled "Combine" is named "How size meets the layers beneath" and
    exposes no value (WCAG 2.5.3). The gear's tooltip says "Label settings" and its name "Node
    label settings"; the bound icon's tooltip and name differ. The "Select layers" check boxes
    have no name, and the folder's box shows partly checked while all its layers are checked. A
    yes/no card's value select is named "how to match". "Open now" on the open sample reads as a
    command: "Already open". "Undid changing settings." names nothing (repeat of pass 4 group 7):
    name the setting. The size popover's group headings are not read (repeat of pass 4 group 9).
    On the read-the-file page the roles under "Set by the file" look like empty inputs with gray
    placeholders: show them as values.
14. **Labels: the overlap count and the selection ring** (graphty-element
    `meshes/RichTextLabel.ts`, `Graph.ts`). "24 labels, 0 hidden" while names visibly touch and
    overlap, and it never changes with zoom or size 96; the selection ring covers the start of
    the selected node's name (repeats of pass 4 group 14). Recount on zoom and size; count
    touching labels as overlapping; keep the ring clear of the label.
15. **New layer from selection makes the layer** (graphty `canvas/CanvasMenu.tsx`,
    `style/commands.ts`). It makes nothing, says nothing and leaves focus on the drawing (3
    walks). It makes the picked-by-hand layer at once, selects it and opens its Style tab.
16. **The key and layer rows say what is drawn** (graphty `canvas/LegendCard.tsx`,
    `graph-place/rows.ts`, `style/StylePanel.tsx`). Legend is drawn pressed and shows nothing when
    nothing is styled: say that nothing is styled yet. "Edge width: kind" keeps listing a group a
    layer above covers (repeat of pass 4 group 10). A layer with only an edge condition reads
    "Edge layer" and flips to "Node layer" with "Edge not styled" when one node look is added
    (52cb47a85 names the kind from the looks alone): a layer's kind is the union of its
    conditions and looks.
17. **A node is called by its label everywhere** (graphty `inspector/words.ts` and its callers:
    the node and edge inspectors, the layer made for one node, notices, the key). College football
    shows "Nebraska" in find but titles the node "74"; a one-node layer, its notice, its key line
    and its undo say "0" or "40"; an edge's title uses names while its Summary lists ids. One
    helper gives every place the element's node label.
18. **Selecting a layer shows the layer list** (graphty left panel). A run started from the Data
    panel, and a Memberships button, select a layer the left panel does not show. Selecting or
    making a layer switches the left panel to the layers.
19. **An open inspector shows what Undo put back** (graphty `style/MultiRowPanel.tsx`,
    `style/FolderPanel.tsx`). BLOCKING: after Undo of a shape set on the folder or on several
    picked layers, the drawing is balls again but the inspector shows Box as set, and picking Box
    again does nothing (instance of pass 4's open card keeping an undone value). The panel reads
    the style state after every undo and redo.
20. **Lists say when typing matches nothing, and stay in the window** (compact-mantine
    `inputs/listbox.tsx`, the shape grid, combobox placement). "cube" in the shape list now
    highlights nothing, says nothing and Enter does nothing (bdd01700e): show and speak "No shape
    called cube". The filter step's attribute list runs past the window's right edge: it flips
    or shifts to stay inside.
21. **Color words: crimson is red** (compact-mantine `colorWord`). BE0032 is spoken "pink"
    (instance of the hue bands fixed for purple in pass 3).
22. **Escape in the inspector** (graphty `keys/useCommandKeys.ts` `inspectorEscape`,
    `inspector/Inspector.tsx`). On a node's inspector with focus on its "Degree 17" row, Escape
    clears nothing (repeat of pass 4 group 8). In a layer's inspector Escape clears a selection
    the find box made, with no Undo (a90c4d40c clears anywhere outside a field). After Enter on a
    member, Escape leaves the inspector on the whole graph, so the reader reopens the layer for
    every member. `decided.md`: "Escape in the inspector".
23. **"Color by" dialog: one Tab stop, Escape closes** (graphty `style/BindingPopover.tsx`).
    Each row's Hide and actions buttons are Tab stops after the grid, and Escape on a row's
    actions button does nothing. `decided.md`: a grid is one Tab stop; Escape in a dialog closes
    it.
24. **"Why this look" lands on the line it explains** (graphty `inspector/WhyThisLook.tsx`).
    The link to Everything puts focus on the layer's heading, not on its Color line.
25. **Select all** (graphty `keys/useCommandKeys.ts`, `canvas/CanvasMenu.tsx`). Control+A on the
    canvas does nothing and no menu offers it. Add the command through the element's selection
    API.
26. **"Style nodes" says why it is dimmed** (graphty `style/ValuePicker.tsx`). On a layer made
    from a selection the box is dimmed with no reason (repeat since pass 3).
27. **Table: Show in table and sorting** (graphty `table/columns.ts`, `data-place/
attributeActions.ts`; compact-mantine `DataTable`). "Show in table" opens the table without
    marking or scrolling to the column. Sorting keeps the old scroll, so "highest first" shows the
    lowest rows: a sort scrolls to the top. The header's hint says "once more for highest first"
    and the third click turns the sort off: the hint names what the next click does.
28. **Size with "Clamp outliers" off follows the number** (graphty-element size mapping). With
    "Values to" at 100,000 and clamping off, 250,000 and 90,000 draw about the same size. Read the
    mechanism first; if the element documents a ceiling, record it for the owner instead.
29. **Quick actions' "Add label line" is the Text "+" line** (graphty `style/commands.ts`,
    `style/row.ts`, `data-place/attributeActions.ts`). It makes a new layer named "name" with
    Look Card and size 72, where Text "+" on Everything gives size 48 and no look; it is dimmed and
    sends the reader to Data > Attributes even when Everything already labels by name. It adds the
    same line Text "+" adds, on the selected layer or Everything.

## A first look (T37)

1. T37A: the drawing shifts about 140 px right and shrinks after the Degree run (`v-pointer/07.png`
   vs `08.png`, `v-keyboard/33.png`). **(a) 1**, regression (ef2f796ee).
2. T37A: the stale "Did you mean Degree?" reappears and is spoken again after the run
   (`v-keyboard/33.png`, `44.png`). **(a) 2**, regression (3c27003a6).
3. T37A: Enter on a find rule announces "1 node selected", no name (`v-keyboard/19.png`). **(a)
   3**, new.
4. T37A: "Degree finished" does not say who ranks first (`v-keyboard/33.png`). **(b)** Where "who"
   lives.
5. T37A: in Filter analyses, Enter with nothing highlighted does nothing; Shift+A then Enter leaves
   the list open (`v-keyboard/30.png`). **(n)** `decided.md`: a list that opens with nothing active
   takes nothing on Enter.
6. T37A: Degree on every inspector but no Degree column in the table before a run
   (`v-detours/15.png`, `16.png`). **(b)** Which structural values the table carries.
7. T37A: the filter step's attribute list has no Degree (`v-detours/27.png`). **(b)** As row 6.
8. T37A: Quick actions finds nothing for "degree" or "most connected"; Enter on No results does
   nothing (`v-detours/19-21.png`). **(b)** What Quick actions holds.
9. T37A: "ties" does not find Degree (`v-detours/29.png`). **(b)** A word the product does not use.
10. T37A: hovering a node shows no name (`v-detours/03.png`). **(b)** Hover names.
11. T37A: clicking "Highest 36" does nothing and names nobody (`v-detours/04.png`). **(b)** Where
    "who" lives.
12. T37A: the "About Degree" tooltip and its popover show at once (`v-detours/05.png`). **(a) 5**,
    regression (d714c8530).
13. T37A: the no-match hint suggests `name == 'Napoleon'` (`v-detours/06.png`). **(b)** Whether find
    reaches structural values.
14. T37A: report not written; every route walked. **(n)** Pilot tool note.
15. T37B: Escape on a node's inspector with focus on "Degree 17" clears nothing
    (`r2-keyboard/52.png`). **(a) 22**, repeat (pass 4 group 8).
16. T37B: "Highest 17" and the histogram name nobody (`r2-detours/05.png`, `06.png`). **(b)** Where
    "who" lives.
17. T37B: hovering a node shows no name (`r2-detours/04.png`). **(b)** Hover names.
18. T37B: the biggest-looking sphere is a near node in 3D (`r2-detours/24.png`). **(n)** Perspective
    in the 3D view the sample opens in.
19. T37B: Degree in the inspector and find, not in the table, Data place or filter list before a run
    (`r2-detours/16.png`, `17.png`, `41.png`). **(b)** As row 6.
20. T37B: the filter list says "Node id" where the Data place and table say "id"
    (`r2-detours/41.png`). **(a) 13**, repeat (since pass 1).
21. T37B: `=degree` answers "Did you mean Degree?" (`r2-detours/12.png`). **(a) 2**, regression
    (3c27003a6).
22. T37B: "most" gives No match with no hint, and Enter does nothing (`r2-detours/09.png`,
    `10.png`). **(a) 2**, repeat (pass 4 group 6).
23. T37B: the analysis filter does not list Degree for "ties" (`r2-detours/28.png`). **(b)** As
    row 9.
24. T37B: Quick actions finds nothing for "degree" (`r2-detours/33.png`, `34.png`). **(b)** As
    row 8.
25. T37B: Legend drawn pressed shows nothing and says nothing when nothing is styled
    (`r2-detours/39.png`). **(a) 16**, new.
26. T37B: the "About Degree" tooltip over its own open popover (`r2-detours/07.png`). **(a) 5**,
    regression (d714c8530).
27. T37B: a table cell reads gridcell "17" (`r2-keyboard/43.png`). **(n)** `decided.md`: a cell's
    own name is its value.
28. T37B: selecting the row announces only "1 node selected"; "Degree 17, #1 of 34" is not a Tab
    stop (`r2-keyboard/45.png`, `51.png`). **(a) 3**, instance (the name); text is not a Tab stop.
29. T37B: Tab from the table header leaves the table; nothing says arrows move through it
    (`r2-keyboard/39.png`). **(n)** `decided.md`: a grid is one Tab stop.
30. T37B: the arrow keys stop on the disabled "Steps away" (`r2-keyboard/29.png`). **(n)**
    `decided.md`: arrow keys stop on a disabled option.
31. T37B: ArrowRight on the canvas turns the camera, unannounced (`r2-keyboard/25.png`). **(b)** The
    canvas keyboard walk.
32. T37B: with the table open the drawing stays in the upper right (`r2-success/09.png`). **(n)**
    `decided.md`: the drawing moves only when the reader asks.
33. T37B: 17, 16 and 12 ties in nearly the same brown (`r2-success/08.png`). **(n)** Close values on
    a continuous ramp; the answer key records it.

## Your own file, then one kind of person (T38)

1. T38A: the drawing jumps right when the key appears (`r3-pointer/15-16.png`,
   `r3-detour-find/12-13.png`). **(a) 1**, regression (ef2f796ee).
2. T38A: nodes titled by id, find rows by id (`r3-detour-newdata/09.png`, `r3-detour-find/05.png`).
   **(b)** What names a node (this file has no label column).
3. T38A: the open attribute list covers Done (`r3-pointer/09.png`). **(n)** `decided.md`: an open
   list covers what is under it.
4. T38A: "add a condition to narrow" only expands the section (`r3-pointer/08.png`). **(a) 9**,
   regression (9f8c35c76).
5. T38A: adding to the selection needs Shift+click and nothing says so (`r3-detour-find/07.png`,
   `08.png`). **(b)** What a click in find takes.
6. T38A: reopening the file offers Load beside Replace (`r3-detour-find/15.png`). **(n)**
   `decided.md`: Replace first, Load with its warning.
7. T38A: after Layer, focus stays in the tree; Which nodes is 10 Tabs away
   (`r3-keyboard/28-38.png`). **(n)** `decided.md`: Enter keeps focus in the tree; F6.
8. T38A: Shift+Tab from "Remove role" closes the picker; Tab back lands on the collapsed line
   (`r3-keyboard/57.png`, `58.png`). **(n)** `decided.md`: focus leaving the picker closes it and
   keeps its edits.
9. T38A: the arrow cursor over Fill "+" (`r3-pointer/14.png`). **(n)** `decided.md`: the cursor.
10. T38A: report not written; the name field's Escape and Tab and Done by keyboard not walked.
    **(n)** Pilot gap; walked first next pass.
11. T38B: the drawing jumps when the key appears (`x-pointer/15-16.png`). **(a) 1**, regression
    (ef2f796ee).
12. T38B: two clicks on "Add a condition" (`x-pointer/08.png`). **(a) 9**, regression (9f8c35c76).
13. T38B: a plain click on a value row replaces the selection (`x-detour-find/07.png`). **(b)** As
    row 5.
14. T38B: node rows and inspector titled by id (`x-detour-find/04.png`). **(b)** As row 2.
15. T38B: reopening offers Load that doubles ties (`x-detour-newdata/26.png`). **(n)** As row 6.
16. T38B: value rows and table cells do nothing; the attribute menu has no color
    (`x-detour-newdata/09-11.png`, `19.png`). **(b)** Where "draw by" lives.
17. T38B: after Load, 14 Tabs to the Style layers "+" (`x-keys/08-21.png`). **(n)** `decided.md`:
    F6 answers the long Tab walks.
18. T38B: the Effects "+" tooltip covers "Remove node color" (`x-keys/61.png`). **(c)** Backlog.
19. T38B: the arrow cursor over "Add to node fill" (`x-pointer/14.png`). **(n)** The cursor.
20. T38B: the column roles under "Set by the file" look like empty inputs (`x-pointer/03.png`).
    **(a) 13**, new.
21. T38B: report not written; Analyze, Quick actions, the filter button, Graph's Style tab not
    tried. **(n)** Pilot gap; walked first next pass.

## One color for the whole drawing (T39)

1. T39A: the drawing jumps when the key appears (`f-detours/21.png` vs `22.png`). **(a) 1**,
   regression (ef2f796ee).
2. T39A: Graph's Style tab points nowhere near node color; Background color paints the canvas
   (`f-detours/05.png`, `06.png`). **(b)** Where the color of everything lives.
3. T39A: "Undid changing settings." names nothing (`f-detours/07.png`). **(a) 13**, repeat (pass 4
   group 7).
4. T39A: "Why this look" > Everything lands on the heading (`f-detours/14.png`). **(a) 24**, new.
5. T39A: after "Remove edge color" Width slides up and its remove takes focus (`f-detours/18.png`).
   **(a) 11**, regression (ce953d22e).
6. T39A: after a sample opens, 8 Shift+Tabs to Everything (`f-keys/17.png`, `18.png`). **(n)**
   `decided.md`: focus after open; F6.
7. T39A: Enter on a layer row keeps focus on the row; the color box is 20 Tabs away
   (`f-keys/19-21.png`). **(n)** `decided.md`: Enter keeps focus in the tree.
8. T39A: Control+A does nothing; no select all anywhere (`f-detours/09.png`, `24.png`, `27.png`).
   **(a) 25**, new.
9. T39B: Graph settings offers only Background color (`f-detours/04.png`, `08.png`). **(b)** As
   row 2.
10. T39B: the node inspector titles Colorado "40", and its layer, key, notice and undo say "40"
    (`f-detours/11.png`, `14.png`, `15.png`). **(a) 17**, instance (College football has labels).
11. T39B: the drawing jumped right and stayed after Control+Z (`f-detours/13-15.png`). **(a) 1**,
    regression (ef2f796ee).
12. T39B: a group and a text box both named "Background color" (`f-detours/05.png`). **(a) 13**,
    new.
13. T39B: Control+A does nothing (`f-detours/29.png`, `21.png`). **(a) 25**, instance.
14. T39B: "Why this look" lands on the heading (`f-detours/17.png`). **(a) 24**, instance.
15. T39B: the swatch stays indigo while the box reads "orange" before Enter (`f-pointer/06.png`).
    **(n)** A box writes on commit (2026-10-17, r1-3).
16. T39B: dimmed Undo and Redo are not Tab stops (`f-keys/21.png`). **(a) 6**, new (decided
    2026-10-18, never built).
17. T39B: the tree is entered at Everything (`f-keys/22.png`). **(n)** `decided.md`: correction,
    the tree's resting row.
18. T39B: 12 Tabs to the layers after open; 19 more to the color box (`f-keys/20-27.png`). **(n)**
    F6.
19. T39B: F6 never reaches the left panel's content or the top bar (`f-keys/34.png`). **(a) 7**,
    new.
20. T39B: ArrowDown on the last tree row gives no end cue (`f-keys/23.png`). **(n)** `decided.md`:
    arrows stop at a tree's edges.
21. T39B: "What is collected" reads as DisclosureTriangle (`f-keys/11.png`). **(n)** `decided.md`:
    native disclosure.
22. T39B: keyboard detours and opening a file not walked. **(n)** Pilot gap; a file does not apply.

## Picked out by letters in a name (T40)

1. T40A: "add a condition to narrow" opens a picker with a second "Add a condition"
   (`p-pointer/05-07.png`). **(a) 9**, regression (9f8c35c76).
2. T40A: "New layer from selection" makes nothing, says nothing (`d-rclick/10.png`). **(a) 15**,
   new.
3. T40A: after a sample opens, 14 Tabs to the layers "+" (`k-keys/21-36.png`). **(n)** F6.
4. T40A: styled nodes keep a thick yellow ring and read yellow (`d-find/13.png`,
   `d-rclick/12.png`). **(b)** How a selection looks while styled.
5. T40A: the drawing jumps when the key appears (`p-pointer/11-12.png`). **(a) 1**, regression
   (ef2f796ee).
6. T40A: the arrow cursor over Filters (`d-filter/04.png`). **(n)** The cursor.
7. T40A: clicking the Style tab while the find list is open erases "Mme" (`d-find/11.png`). **(a)
   2**, new.
8. T40A: report not written; "Use the selected nodes" not tried. **(n)** Pilot gap.
9. T40B: "add a condition to narrow" only opens the section (`w2-pointer/06.png`, `07.png`). **(a)
   9**, regression (9f8c35c76).
10. T40B: after "Starts with", typing GAL reopens the menu and the letters are lost
    (`w2-pointer/12.png`, `13.png`). **(a) 10**, BLOCKING, instance (pass 4 fixed Highest and
    Between only).
11. T40B: the drawing jumps when the key opens (`w2-pointer/16-17.png`). **(a) 1**, regression
    (ef2f796ee).
12. T40B: the suggestion list covers "Add a condition" and Done (`w2-pointer/14.png`). **(n)** An
    open list covers what is under it.
13. T40B: Enter takes the first row; no act takes all eight (`w2-detour-find/06.png`, `09.png`).
    **(b)** What Enter in find takes.
14. T40B: the node Enter selected has no visible mark at the opening zoom
    (`w2-detour-find/06.png`). **(b)** How a selection looks.
15. T40B: the eight keep rings and read orange-red; "Style nodes" dims with no reason
    (`w2-detour-find/20-21.png`). **(a) 26**, repeat (since pass 3); the ring's look is (b).
16. T40B: Graph's Style tab offers only Canvas and Labels (`w2-detour-other/10.png`). **(b)** Where
    the color of everything lives.
17. T40B: right-click selects the edge under the pointer; Escape keeps it; ends by id
    (`w2-detour-other/06.png`, `07.png`). **(n)** `decided.md`: right-click selects, Escape closes
    the menu; names are (b).
18. T40B: "Show in table" does not mark or scroll to the name column
    (`w2-detour-other/16.png`). **(a) 27**, new.
19. T40B: the arrow cursor over Filters (`w2-detour-filter/17.png`). **(n)** The cursor.
20. T40B: after Load, focus on the heading has no ring; the layers are 11 Shift+Tabs away
    (`w2-keyboard/18.png`). **(a) 8**, new (the ring); the walk is (n), F6.
21. T40B: layer row to Which nodes is ten Tabs; F6 is not shown on screen (`w2-keyboard`). **(n)**
    F6; whether readers find it is for the sessions.
22. T40B: "What is collected" reads as DisclosureTriangle (`w2-keyboard/12.png`). **(n)** Native
    disclosure.
23. T40B: ArrowDown on the closed list is spoken "GAL1 selected" while Enter keeps GAL
    (`w2-keyboard/64.png`). **(a) 10**, new.
24. T40B: each letter is spoken as a new count (`w2-keyboard/63.png`). **(a) 10**, new.
    `decided.md`: a card's count is spoken once when typing pauses.
25. T40B: report not written; right-click on a GAL node not tried (no drawn labels). **(n)**
    Pilot gap.

## Two facts at once (T41)

1. T41A: the "add a condition to narrow" hint competes with the button (`e3c-pointer/08.png`,
   `09.png`). **(a) 9**, regression (9f8c35c76).
2. T41A: the add-layer "+" has no visible text; arrow cursor (`e3c-pointer/05.png`, `06.png`,
   `19.png`). **(n)** `decided.md`: icon buttons; the cursor.
3. T41A: no find query reaches "has no value" (`e3c-detour-start/07-10.png`). **(b)** Where "has
   no value" lives.
4. T41A: the 17 old rings, "phone" and "17 nodes selected" stay after the layer is corrected
   (`e3c-detour-start/19.png`). **(b)** How a selection looks while styled; the selection lasts
   until cleared.
5. T41A: "Style nodes" dimmed on a layer made from a selection (`e3c-detour-start/14.png`). **(a)
   26**, repeat.
6. T41A: "Nothing found" for "missing" and "phone leaves none" give no hint toward Has no value
   (`e3c-detour-picker/09.png`, `13.png`). **(b)** As row 3.
7. T41A: one Escape in a text card closes the picker and keeps a 0-node rule
   (`e3c-detour-picker/14.png`). **(a) 10**, new. `decided.md`: Escape keeps edits in a card.
8. T41A: the "Dropped the phone condition" notice has no Undo; the inspector shows the Graph
   (`e3c-detour-picker/20.png`). **(n)** `decided.md`: an unfinished card is dropped with no Undo;
   a canvas click shows the Graph.
9. T41A: Filters' Has no value hides everyone else (`e3c-detour-picker/31-34.png`). **(n)** A
   filter hides by design; the answer key records it.
10. T41A: after Load, 13 Tabs to the layer "+" (`e3c-keys`). **(n)** F6.
11. T41A: layer row to Which nodes, 9 Tabs (`e3c-keys`). **(n)** F6.
12. T41A: table cells read only their value (`e3c-keys/82.png`). **(n)** A cell's own name.
13. T41A: neither table nor inspector marks whom the layer paints (`e3c-pointer/22-25.png`). **(b)**
    Where "who" lives.
14. T41B: the hint competes with the button (`g-pointer/07.png`). **(a) 9**, regression
    (9f8c35c76).
15. T41B: the layer "+" and Fill "+" have no visible text (`g-pointer/05.png`, `15.png`). **(n)**
    Icon buttons.
16. T41B: the drawing shrinks and moves right and stays after Undo (`g-pointer/16.png`,
    `g-detours/15.png`). **(a) 1**, regression (ef2f796ee).
17. T41B: no find query reaches "has no value" (`g-detours/08-09.png`). **(b)** As row 3.
18. T41B: "Nothing found" and "email leaves none" never point to Has no value
    (`g-detours/22.png`, `24.png`). **(b)** As row 3.
19. T41B: one Escape closes the picker and keeps "email contains missing, 0 nodes"
    (`g-detours/25.png`). **(a) 10**, instance.
20. T41B: Escape in an empty new text card drops it (`g-keys`). **(n)** `decided.md`: Escape on a
    just-added card that holds nothing takes it back.
21. T41B: the drop notice has no Undo; the canvas click deselects the layer (`g-detours/31.png`).
    **(n)** As row 8.
22. T41B: "Style nodes" dimmed on a layer made from a selection (`g-detours/15.png`). **(a) 26**,
    repeat.
23. T41B: Filters' Has no value hides everyone else (`g-detours/35.png`). **(n)** As row 9.
24. T41B: styling a clicked node makes one layer per person (`g-detours/45.png`). **(b)** A node's
    own Style tab styling one node.
25. T41B: after Load, 13 Tabs to the "+"; 10 from the row to Which nodes (`g-keys`). **(n)** F6.
26. T41B: Enter on Which nodes lands in the first card's value, past its remove button
    (`g-keys`). **(n)** Opening puts focus where the next key belongs; Shift+Tab reaches remove,
    which `decided.md` keeps first in the card.
27. T41B: cells read only their value; the header row reads each column's menu name
    (`g-keys`). **(n)** A cell's own name; the study tool's reading.
28. T41B: table and inspector do not mark whom the layer paints (`g-pointer/17-20.png`). **(b)**
    Where "who" lives.

## At or over a line (T42)

1. T42A: the hint is a click target that only expands Which nodes
   (`e3c-success-pointer/07-09.png`). **(a) 9**, regression (9f8c35c76).
2. T42A: the arrow cursor over "+" (`e3c-success-pointer/05.png`, `12.png`). **(n)** The cursor.
3. T42A: no match reads "at least" or "or more" (`e3c-detour-card/06.png`). **(b)** What the number
   card's matches are called.
4. T42A: Highest with 20 gives "top 20 by hours" (`e3c-detour-card/08.png`). **(b)** As row 3.
5. T42A: 20 typed in "to" gives 2 to 20 with nothing flagged (`e3c-detour-card/11.png`). **(b)** As
   row 3; a valid range.
6. T42A: the refusal of ">=20" does not say how to write "20 or more" (`e3c-detour-card/14.png`).
   **(b)** As row 3.
7. T42A: Enter in a new filter step's "from" commits the step (`e3c-detour-start/10.png`). **(n)**
   `decided.md`: Enter in a filter step's box commits it.
8. T42A: the step's count reads "24 to 24 nodes" (`e3c-detour-start/09.png`). **(c)** Backlog.
9. T42A: gold selection rings look like the requested orange (`e3c-detour-start/15.png`). **(b)**
   How a selection looks.
10. T42A: F6 never visits the top bar (`e3c-keyboard/18-24.png`). **(a) 7**, instance.
11. T42A: after Load, the layer "+" is 13 Tabs away (`e3c-keyboard/17-26.png`). **(n)** F6.
12. T42A: F6 into the inspector lands on "Select what it paints" (`e3c-keyboard/30-35.png`). **(n)**
    F6 enters a region at its first control.
13. T42A: DisclosureTriangle (`e3c-keyboard/11.png`). **(n)** Native disclosure.
14. T42B: the drawing shrinks and shifts right and stays after Undo (`f-pointer/16.png`,
    `f-keys/62.png`). **(a) 1**, regression (ef2f796ee).
15. T42B: Tab out of the color box makes the layer and throws focus to the Style tab
    (`f-detours/14.png`). **(a) 11**, regression (ce953d22e).
16. T42B: Escape in an unset color line removes it, focus to Fill "+" (`f-detours/11.png`,
    `12.png`). **(n)** `decided.md`: Escape on a just-added line that holds nothing.
17. T42B: Escape in the "from" box throws away a typed 10000 (`f-keys/48.png`, `49.png`). **(a)
    10**, new. `decided.md`: Escape keeps edits in a card. The answer key's line is updated with
    the fix.
18. T42B: the dimmed Undo is not a Tab stop (`f-keys/17.png`, `18.png`). **(a) 6**, instance.
19. T42B: F6 never reaches the left panel or the top bar (`f-keys/66-71.png`). **(a) 7**, instance.
20. T42B: after Load, 13 Tabs to "Add a layer or a folder" (`f-keys/09-22.png`). **(n)** F6.
21. T42B: the node inspector titled "s20" (`f-detours/37.png`). **(b)** What names a node.
22. T42B: a sort keeps the old scroll and shows the lowest rows (`f-detours/46.png`). **(a) 27**,
    new.
23. T42B: the third header click turns the sort off while the hint says "highest first"
    (`f-detours/43.png`, `45.png`). **(a) 27**, new.
24. T42B: a card shows only a count; nothing marks the matches on the drawing
    (`f-detours/24.png`). **(b)** Where "who" lives.
25. T42B: the arrow cursor over three buttons (`f-pointer/07.png`). **(n)** The cursor.
26. T42B: report not written; every route walked. **(n)** Pilot tool note.

## Bigger by a number (T43)

1. T43A: Escape in an unset Size box removes the line, focus to Shape "+" (`r3-detours/08.png`).
   **(n)** Escape on a just-added line.
2. T43A: binding the size moves the drawing right; it stays after Undo (`r3-success/07.png`,
   `r3-detours/13-15.png`). **(a) 1**, regression (ef2f796ee).
3. T43A: the "Combine" box is named otherwise and exposes no value (`r3-keys/59.png`). **(a) 13**,
   new.
4. T43A: the "Size by hours" dialog hides the biggest dot (`r3-keys/59.png`). **(n)** A popover
   covers what is under it.
5. T43A: arrow keys on the canvas turn the camera; no dot takes focus (`r3-keys/91-94.png`).
   **(b)** The canvas keyboard walk.
6. T43A: the tree is entered at Everything. **(n)** Correction: the tree's resting row.
7. T43A: a second Escape after the table clears the row selected there (`r3-keys/89-90.png`).
   **(n)** `decided.md`: Escape in the grid goes to the Table button; Escape there clears, as the
   canvas menu says.
8. T43A: the column menu and Attribute actions have nothing for size (`r3-detours/24.png`,
   `31.png`). **(b)** Where "draw by" lives.
9. T43A: the Visibility "+" tooltip covers Shape "+" (`r3-detours/09.png`). **(c)** Backlog.
10. T43A: the find box still shows "hours" after the selection changed (`r3-detours/15.png`). **(a)
    2**, repeat (pass 4 group 6).
11. T43A: the canvas menu opens over the inspector (`r3-detours/27.png`). **(n)** A menu covers
    what is under it.
12. T43A: the node inspector headed "v09" (`r3-success/08.png`). **(b)** What names a node.
13. T43A: "Clamp outliers" runs into the next label in the tool's reading. **(n)** The study tool
    reads text without role boundaries.
14. T43A: report not written; every route walked. **(n)** Pilot tool note.
15. T43B: binding the size re-frames the drawing off center (`g-pointer/08.png`, `09.png`). **(a)
    1**, regression (ef2f796ee).
16. T43B: a one-node layer's key reads "Size: donations" (`g-detour-node/12.png`). **(b)** How a
    key shows a binding on one node.
17. T43B: a fixed size of 3 pushes the dot under the inspector's edge (`g-detour-node/09.png`).
    **(n)** The drawing moves only when the reader asks; Frame.
18. T43B: with clamping off, 250,000 and 90,000 draw about the same size (`g-keys/132.png`). **(a)
    28**, new.
19. T43B: Escape in a just-added Size line deletes it (`g-detour-find/11.png`). **(n)** Escape on a
    just-added line.
20. T43B: the size popover's group headings are not read. **(a) 13**, repeat (pass 4 group 9).
21. T43B: F6 stops on the "Resize left panel" separator. **(a) 7**, instance.
22. T43B: the node menu covers the inspector's labels (`g-detour-node/05.png`). **(n)** A menu
    covers what is under it.
23. T43B: the arrow cursor over the link buttons. **(n)** The cursor.
24. T43B: the bound icon's name and tooltip differ (`g-pointer/13.png`). **(a) 13**, instance.
25. T43B: "Show in table" opens unsorted and unmarked; "Highest 250,000" names nobody
    (`g-detour-node/14.png`, `16.png`). **(a) 27**, instance; "who" is (b).
26. T43B: the size popovers cover the drawing and the table (`g-pointer/07.png`, `14.png`). **(n)**
    A popover covers what is under it.
27. T43B: the chip's tooltip covers the Size label (`g-pointer/17.png`). **(c)** Backlog.
28. T43B: report not written; the keyboard walk ran in screen-reader mode, which also refuses
    pointer steps. **(n)** Pilot tool note.

## Names on the drawing (T44)

1. T44A: "0 hidden" while labels touch and overlap (`f-pointer/08.png`, `13.png`). **(a) 14**,
   repeat (pass 4 group 14).
2. T44A: turning "Hide overlapping labels" off cannot be undone (`f-detour-graphstyle/08.png`).
   **(n)** Owner item: decluttering outside undo.
3. T44A: "Show all labels" is not on the undo stack (`f-detour-fixedtext/10.png`). **(n)** As row 2.
4. T44A: after Undo the markup tooltip opens by itself (`f-detour-fixedtext/10.png`). **(a) 5**,
   new.
5. T44A: Text "+" and Quick actions' "Add label line" draw differently
   (`f-pointer/08.png` vs `f-detour-graphstyle/28.png`). **(a) 29**, new.
6. T44A: Quick actions' new layer is named "name" (`f-detour-graphstyle/28.png`). **(a) 29**,
   instance.
7. T44A: Graph's Labels section only has overlap switches (`f-detour-graphstyle/06.png`). **(b)**
   Where labels are put on.
8. T44A: the node menu offers nothing about labels (`f-detour-graphstyle/10.png`). **(b)** As row 7.
9. T44A: "label" and "names" find nothing in find or Quick actions
   (`f-detour-graphstyle/16-20.png`). **(b)** Which words lead to labels.
10. T44A: a one-node label is tiny at the default framing (`f-detour-graphstyle/15.png`). **(n)**
    Owner item: the small default size.
11. T44A: "Node label added" is only spoken (`f-keyboard/48.png`). **(n)** The drawing and the
    panel show the change; the notice is for screen readers.
12. T44A: Tab from the graph heading goes into the inspector (`f-keyboard/12-21.png`). **(n)** F6.
13. T44A: the tree is entered at Everything (`f-keyboard/21.png`). **(n)** Correction: the tree's
    resting row.
14. T44A: the gear's tooltip and spoken name differ (`f-pointer/14.png`). **(a) 13**, new.
15. T44A: report not written; Cancel on the file chooser cannot be walked; Size keys checked by
    pointer only. **(n)** Pilot tool note.
16. T44B: Graph's Labels section turns nothing on (`p3-detours/07.png`). **(b)** As row 7.
17. T44B: Quick actions "label" offers only a dimmed "Add label line" sending to Data > Attributes
    (`p3-detours/31.png`, `30.png`). **(a) 29**, instance; "names" finding nothing is (b).
18. T44B: a selected person is called by id everywhere (`p3-detours/11.png`, `16.png`). **(b)**
    What names a node (no label column).
19. T44B: her own Text "+" labels only her (`p3-detours/16.png`). **(b)** A node's own Style tab.
20. T44B: turning "Hide overlapping labels" off cannot be undone (`p3-detours/09.png`). **(n)** As
    row 2.
21. T44B: "24 labels, 0 hidden" never changes with zoom or size 96 (`p3-pointer/18.png`,
    `p3-detours/37.png`). **(a) 14**, repeat.
22. T44B: the label picker and Label settings cover the drawing while open (`p3-pointer/08.png`).
    **(n)** A popover covers what is under it.
23. T44B: the "Label settings" and "Node label size by attribute" tooltips cover other lines
    (`p3-pointer/13.png`). **(c)** Backlog.
24. T44B: the inspector heading takes focus with no visible ring (`p3-keys/20.png`, `77.png`).
    **(a) 8**, instance.
25. T44B: Escape in Label settings' Size box closes the popover (`p3-detours/38.png`). **(a) 11**,
    new. `decided.md`: Escape in a style field keeps focus, inline or in a popover.
26. T44B: "f" frames the selection but nothing is spoken (`p3-keys/78.png`). **(a) 3**, new.
27. T44B: the selection ring overlaps the start of "Lucy Grant" (`p3-keys/78.png`). **(a) 14**,
    repeat.
28. T44B: the reset control is a bare minus sign (`p3-pointer/15.png`). **(n)** One Clear glyph,
    decided 2026-10-17 (`owner-decisions.md`).
29. T44B: report not written; Escape on the heading and "=" zoom not tried; Open sample does not
    apply. **(n)** Pilot gap.

## Thick ties by a value (T45)

1. T45A: Tab commits a width but focus stays in the box (`r4-pointer/17.png`, `19.png`). **(a)
   11**, regression (ce953d22e).
2. T45A: "add a condition to narrow" only expands (`r4-pointer/09.png`). **(a) 9**, regression
   (9f8c35c76).
3. T45A: Enter in find takes the first of 8 ties; the "kind is family (8)" row sits below them
   (`r4-detours/05.png`). **(b)** What Enter in find takes.
4. T45A: coloring Everything by kind recolors every tie (`r4-detours2/10.png`). **(n)** That is
   what coloring Everything by kind asks; the key shows the groups.
5. T45A: "New layer from selection" makes no layer (`r4-detours/15.png`). **(a) 15**, instance.
6. T45A: "Edge width: kind" keeps listing family, which a layer above covers
   (`r4-detours2/27.png`). **(a) 16**, repeat (pass 4 group 10).
7. T45A: "Remove edge color" on Everything removes the base Color line (`r4-detours2/27.png`).
   **(n)** Remove removes the line; whether readers expect "back to gray" is (b) with T49.
8. T45A: leaving the Edge tab drops an unticked card (`r4-detours2/34.png`). **(n)** `decided.md`:
   an unfinished card is dropped when its picker closes.
9. T45A: after Load, three F6 and two Tabs to the "+" (`r4-keyboard`). **(n)** F6.
10. T45A: Escape in a committed width box restores it silently (`r4-keyboard`). **(a) 11**, new.
11. T45A: the family swatch under Color does nothing on click (`r4-detours2/11.png`). **(b)**
    Whether a chit leads anywhere (a round 1 question).
12. T45A: report not written. **(n)** Pilot tool note.
13. T45B: Escape in the card's "from" box discards the typed 5 (`f-keyboard/44.png`). **(a) 10**,
    instance.
14. T45B: the card stores "Between 5 and 31"; no "at least" (`f-pointer/12.png`). **(b)** What the
    number card's matches are.
15. T45B: width 24 looks barely thicker once deselected (`f-detour-find/11.png` vs `12.png`).
    **(b)** How a selection looks; the edge width unit is an owner item.
16. T45B: "Add a condition" needs two clicks (`f-pointer/08.png`). **(a) 9**, regression
    (9f8c35c76).
17. T45B: "chapters" gives No match (`f-detour-find/03.png`). **(b)** Whether find reaches column
    names.
18. T45B: the drawing shifts when the key appears and stays after undo (`f-pointer/20-21.png`).
    **(a) 1**, regression (ef2f796ee).
19. T45B: Escape in the color box shows nothing; the discard is only spoken (`f-pointer/22.png`).
    **(a) 11**, instance.
20. T45B: hovering a tie shows no name (`f-detour-nodetab/16.png`). **(b)** Hover names.
21. T45B: the attribute's menu offers no way to style ties by it (`f-detour-nodetab/20.png`).
    **(b)** Where "draw by" lives.
22. T45B: Tab from the heading goes to the inspector; the tree at Everything (`f-keyboard/12-22`).
    **(n)** F6; the tree's resting row.
23. T45B: an edge-only layer reads "Edge layer" and flips to "Node layer" (`f-detour-nodetab/10.png`,
    `14.png`). **(a) 16**, regression (52cb47a85).
24. T45B: the "Edge width by attribute" tooltip covers Arrowheads "+" (`f-pointer/18.png`). **(c)**
    Backlog.

## One group's color (T46)

1. T46A: "circles", "community" and "together" find no grouping analysis (`f-detours/04.png`,
   `09.png`, `10.png`). **(b)** What readers type for clusters.
2. T46A: the key looks like a list of the groups but does nothing (`f-detours/14-16.png`). **(b)**
   Whether the key leads anywhere.
3. T46A: hovering shows no name (`f-detours/17.png`). **(b)** Hover names.
4. T46A: Fill "+" on a node makes a one-node layer with no pointer to its group
   (`f-detours/22.png`). **(b)** A node's own Style tab.
5. T46A: the folder's chain icon paints every group one color (`f-detours/36-37.png`). **(n)** The
   folder's bulk act, documented in the answer key.
6. T46A: the folder's swatch strip names a group but does nothing on click (`f-detours/29.png`).
   **(b)** Whether anyone clicks a chit.
7. T46A: the Data place does not list the run's groups (`f-detours/41.png`). **(b)** Which
   computed values the Data place carries.
8. T46A: Quick actions finds no node, analysis or styling command (`f-detours/44-49.png`). **(b)**
   What Quick actions holds.
9. T46A: the tree is entered at Everything. **(n)** Correction: the tree's resting row.
10. T46A: 18 Tabs to Analyze; 14 to the color field. **(n)** F6.
11. T46A: after Run the drawing moves and shrinks (`f-pointer/03.png` vs `07.png`). **(a) 1**,
    regression (ef2f796ee).
12. T46B: Tab with "cluster" typed takes nothing and moves to the inspector
    (`w3-detours/06.png`). **(a) 4**, repeat (pass 4 group 8).
13. T46B: "cluster" highlights Clustering coefficient first (`w3-detours/05.png`). **(b)** As
    row 1.
14. T46B: the chain icon turns every group yellow (`w3-detours/41.png`). **(n)** As row 5.
15. T46B: the "Color from each layer" table does not say which group holds the node; "Source:
    <<Layer>>" (`w3-detours/33.png`, `34.png`). **(b)** Whether the Layer token is read as a column
    (a round 1 question).
16. T46B: the first color makes a one-node layer named "74"; the key scrolls "3 more below"
    (`w3-detours/25.png`). **(a) 17**, instance; the scrolling key was settled in pass 4 (n).
17. T46B: the node inspector is titled "74" while find shows "Nebraska" (`w3-pointer/09.png`,
    `10.png`). **(a) 17**, new.
18. T46B: the key does nothing on hover, click or right-click (`w3-detours/17-19.png`). **(b)** As
    row 2.
19. T46B: the Memberships "Group 4" button looks like text; from the Data panel its layer is out of
    sight (`w3-detours/48.png`, `49.png`). **(a) 18**, new; the button's look is in the backlog.
20. T46B: the node menu reaches nothing of its group (`w3-detours/45.png`). **(b)** Where a node's
    group lives.
21. T46B: Group 5's crimson sits next to the new red (`w3-pointer/16.png`). **(n)** The reader's
    own color beside the palette's.
22. T46B: keyboard walk past the start screen not done. **(n)** Pilot gap; walked first next pass.

## One shape for every group (T47)

1. T47A: after Undo the inspector shows Box as set and Box cannot be picked again
   (`e3c-detours/39.png`, `50-55.png`, `e3c-keyboard/69.png`). **(a) 19**, BLOCKING, instance.
2. T47A: "cube" gives no message and no highlight; Enter does nothing (`e3c-detours/13.png`,
   `14.png`). **(a) 20**, regression (bdd01700e).
3. T47A: Tab out of the Shape box leaves its tooltip over "Shape: 6 changed"
   (`e3c-pointer/17.png`). **(a) 5**, new.
4. T47A: the Shape group is named "Shape Shape" (`e3c-pointer/12.png`). **(a) 13**, new.
5. T47A: the arrow cursor over "+", the caret and the toolbar (`e3c-pointer/09.png`). **(n)** The
   cursor.
6. T47A: dimmed Undo and Redo are not Tab stops (`e3c-keyboard/18.png`). **(a) 6**, instance.
7. T47A: F6 lands on the "Resize left panel" separator (`e3c-keyboard/37.png`). **(a) 7**,
   instance.
8. T47A: Analyze is 18 Tabs away after open (`e3c-keyboard/10-28.png`). **(n)** F6.
9. T47A: the key's rows do nothing on click (`e3c-detours/06.png`). **(b)** Whether the key leads
   anywhere.
10. T47A: Graph's Style tab offers no node look (`e3c-detours/05.png`). **(b)** Where the look of
    everything lives.
11. T47B: the dimmed Undo is not a Tab stop (`walk-keyboard/19-30.png`). **(a) 6**, instance.
12. T47B: "cube" matches nothing and nothing says so (`walk-detour-node/17-18.png`,
    `walk-keyboard/67-68.png`). **(a) 20**, regression (bdd01700e).
13. T47B: a one-node layer named "0", not BrighamYoung; the inspector titled "0"
    (`walk-detour-node/22.png`). **(a) 17**, instance.
14. T47B: the edge Summary lists ids while the title uses names (`walk-detour-node/10.png`). **(a)
    17**, instance.
15. T47B: "cluster" highlights Clustering coefficient first; no Start here on Louvain
    (`walk-detour-node/05-06.png`). **(b)** What readers type for clusters.
16. T47B: the Data place lacks the Louvain groups (`walk-detour-node/60.png`). **(b)** Which
    computed values it carries.
17. T47B: the shape tooltip covers the "Not set yet" hint (`walk-detour-node/20.png`). **(c)**
    Backlog.
18. T47B: an unset Shape line on a group layer shows no "Not set yet" hint
    (`walk-detour-node/45.png`). **(n)** The hint says the first pick makes a layer; a group layer
    exists already.
19. T47B: the arrow cursor over Shape "+" and the caret (`walk-pointer/09.png`). **(n)** The
    cursor.
20. T47B: Enter in Louvain's Resolution box runs it (`walk-keyboard/42.png`). **(n)**
    `decided.md`: Enter in an analysis card's box runs it.
21. T47B: BE0032 is spoken "pink" (`walk-keyboard/73.png`). **(a) 21**, instance.
22. T47B: ArrowRight at a row's end does not go to the next row (`walk-keyboard/71.png`). **(n)**
    `decided.md`: arrows stop at a grid's edges.
23. T47B: the key scrolls and hides Groups 8 to 10 (`walk-pointer/13.png`). **(n)** The scrolling
    key settled in pass 4.
24. T47B: opening a file does not apply; the chain icon only hovered. **(n)** Pilot note.

## Keep a group's colors on some nodes (T48)

1. T48A: "not trained" finds nothing (`e3c-detour-start/14.png`). **(b)** Whether find reaches "has
   no value".
2. T48A: the answer 15 shows nowhere; the key says "9 of 24" (`e3c-detour-start/42.png`). **(b)**
   Whether a count is read as the total.
3. T48A: a layer added with a group layer selected lands in the Louvain folder
   (`e3c-detour-start/34.png`). **(n)** A new layer goes next to the selected row (Figma); "Layers
   added later are not changed" means a re-run leaves them alone.
4. T48A: the trained card on a group layer says 15 while the layer paints 5
   (`e3c-detour-start/28.png`). **(b)** A card's count read as the layer's.
5. T48A: Escape in a layer's inspector clears the find selection, no Undo
   (`e3c-detour-start/30.png`). **(a) 22**, regression (a90c4d40c).
6. T48A: the drawing moves about 130 px when the key opens (`e3c-pointer/04.png` vs `08.png`).
   **(a) 1**, regression (ef2f796ee).
7. T48A: the cover layer's row has no swatch (`e3c-detour-start/44.png`). **(c)** Backlog.
8. T48A: the filter step gives the count with the wrong look (`e3c-detour-start/20-22.png`). **(n)**
   A filter hides by design; the answer key records the false finish.
9. T48A: "has no value" in the add-condition list finds nothing (`e3c-detour-cards/12-13.png`).
   **(b)** Where "has no value" lives.
10. T48A: a canvas click drops an unfinished card; a panel click does not
    (`e3c-detour-cards/23.png` vs `34.png`). **(n)** `decided.md`: a click in a side panel keeps the
    picker open. The answer key's detour line is corrected.
11. T48A: after Load, Analyze is 18 Tabs away. **(n)** F6.
12. T48A: from the folder row, Which nodes is 10 Tabs away. **(n)** F6.
13. T48A: Which nodes is spoken "each layer's own value" while the screen shows <<Layer>>. **(n)**
    The token is spoken in words by design; how it reads is a round 1 question.
14. T48A: Shift+Tab from Main menu on the start screen took over two minutes. **(a) 7**, new: the
    cause is traced and named in group 7.
15. T48B: a filter step on or off leaves the right cluster cut off (`final-detours/15.png`,
    `19.png`, `21.png`, `32.png`). **(a) 1**, new.
16. T48B: Tab enters the tree at its last row (`final-keyboard/24.png`). **(n)** Correction: the
    tree's resting row.
17. T48B: the "Select layers" check boxes have no name (`final-detours/65.png`). **(a) 13**, new.
18. T48B: the folder's box shows partly checked with all its layers checked
    (`final-detours/65.png`). **(a) 13**, new.
19. T48B: after a run from the Data panel the new folder is out of sight (`final-detours/21.png`,
    `25.png`). **(a) 18**, instance.
20. T48B: the attribute list covers Done (`final-pointer/11.png`). **(n)** An open list covers what
    is under it.
21. T48B: a cluster layer's chip shows the whole file's 12 (`final-detours/37.png`). **(b)** A
    card's count read as the layer's; the answer key accepts it.
22. T48B: the filter step's attribute list runs past the window's edge (`final-detours/09.png`).
    **(a) 20**, new.
23. T48B: the node inspector headed "s05" (`final-detours/57.png`). **(b)** What names a node.
24. T48B: the yes/no value select is named "how to match" (`final-detours/47.png`). **(a) 13**,
    new.
25. T48B: the arrow cursor over the step's box and the "+" (`final-detours/14.png`). **(n)** The
    cursor.
26. T48B: report not written; general detours not walked; Tab in the list settled. **(n)** Pilot
    note.

## Put a color back (T49)

1. T49A: "Remove node color" looks like the start while the tree holds no color
   (`f-detours-a/25.png`). **(b)** What "put back" means: remove or set the old value.
2. T49A: the dimmed Undo is skipped by Tab and Shift+Tab (`f-keyboard`). **(a) 6**, instance.
3. T49A: "FF0000blue" in the hex box is dropped silently (`f-detours-a/13.png`, `14.png`). **(a)
   12**, new.
4. T49A: hiding Everything blanks the whole drawing (`f-detours-b/23.png`). **(n)** Hiding the base
   layer hides what it draws; the inspector says why.
5. T49A: Tab leaves a re-added Color line unset under its italic 6366F1 (`f-detours-a/30.png`).
   **(n)** `decided.md`: an unset line takes its value on Enter or typing; the drawing shows the
   same default.
6. T49A: the arrow cursor over the picker's swatches (`f-detours-a/07-09.png`). **(n)** The cursor.
7. T49A: the picker's close, format list, eyedropper and sliders are not Tab stops
   (`f-keyboard/127-133.png`). **(a) 12**, new.
8. T49A: the tree entered at Everything. **(n)** Correction: the tree's resting row.
9. T49A: the open sample is labeled "Open now" (`f-detours-b/14.png`). **(a) 13**, new.
10. T49A: report not written; half B outside the pilot. **(n)** Pilot note.
11. T49B: Escape in the hex box throws away a typed hex (`g-detour-color/17.png`). **(n)**
    `decided.md`: Escape in a style field reverts typing; the picker clause is the Which-nodes
    picker.
12. T49B: the reopened picker calls yellow "the color before this edit" (`g-detour-color/08.png`).
    **(b)** What the reopened color is called.
13. T49B: "Remove node color" is a false done (`g-detour-color/21.png`). **(b)** As row 1.
14. T49B: Control+Z in the find box undoes the typing (`g-detour-menus/11.png`). **(n)**
    `decided.md`: a text box undoes its typing first.
15. T49B: the arrow cursor over Undo and swatches (`g-pointer/07.png`). **(n)** The cursor.
16. T49B: keyboard walk past the start screen not done; session left open. **(n)** Pilot gap; no
    session process is running.

## A colleague's project (T50)

1. T50A: the key line does nothing and is not a Tab stop (`p2-detours/06.png`,
   `p2-pointer/18.png`). **(b)** Whether the key leads to its layer.
2. T50A: "Select what it paints" names nobody (`p2-detours/18.png`). **(b)** Where "who" lives.
3. T50A: members listed by id (`p2-pointer/05.png`, `06.png`). **(b)** What names a node.
4. T50A: Escape after a member leaves the inspector on the whole graph (`p2-keyboard/62.png`).
   **(a) 22**, new.
5. T50A: the tree entered at Everything (`p2-keyboard/25.png`). **(n)** Correction: the tree's
   resting row.
6. T50A: hovering shows no name (`p2-detours/07.png`). **(b)** Hover names.
7. T50A: find cannot search by color (`p2-detours/11.png`). **(b)** What find reaches.
8. T50A: the table cannot show only the selection (`p2-detours/19.png`). **(b)** What the table
   offers.
9. T50A: focus on the heading; the layers 6 Shift+Tabs back (`p2-keyboard/19-27.png`). **(n)** F6.
10. T50A: "New layer from selection" shows nothing (`p3-detours/22-26.png`). **(a) 15**, instance.
11. T50A: find cannot take all its matches (`p3-detours/07.png`, `09.png`). **(b)** What Enter in
    find takes.
12. T50A: "Use the selected nodes" is only on the Node id card (`p3-detours/14.png`). **(b)** Where
    a selection becomes a rule.
13. T50A: the usage notice leaves unanswered on open from Main menu (`p3-detours/02.png`). **(n)**
    Decided in pass 2: the notice leaves when a graph opens.
14. T50B: the dimmed Undo and Redo are not Tab stops (`s3-keyboard`). **(a) 6**, instance.
15. T50B: the tree entered at its last row (`s3-keyboard`). **(n)** Correction: the tree's resting
    row.
16. T50B: after open, 13 Tabs to the layers (`s3-keyboard`). **(n)** F6.
17. T50B: the key is never a Tab stop (`s3-keyboard`). **(b)** As row 1; the toolbar's one stop is
    decided.
18. T50B: clicking the key's line does nothing (`s2-detours/06.png`). **(b)** As row 1.
19. T50B: the key's "green" tooltip covers "6 of 24 nodes" (`s2-detours/05.png`). **(c)** Backlog.
20. T50B: the collapsed line gives each condition's count with nothing joining them
    (`s1-pointer/04.png`). **(b)** "And" between cards; a card's count read as the layer's.
21. T50B: members, heading and click report by id (`s1-pointer/15-16.png`). **(b)** What names a
    node.
22. T50B: Enter on a member replaces the layer's inspector; Escape leaves it on the Graph
    (`s1-pointer/16-17.png`). **(a) 22**, instance.
23. T50B: a green node's Style tab shows no Color line (`s2-detours/09.png`). **(b)** A node's own
    Style tab against the layers that paint it.
24. T50B: nothing skipped; the notice left open. **(n)** Pilot note.

## Color by a kind (T51)

1. T51A: the drawing jumps when the key opens (`g1-pointer/08.png`, `g3-keys/49.png`). **(a) 1**,
   regression (ef2f796ee).
2. T51A: the key reads "Color: 3 nodes" and "Color: 5 nodes"; Everything has no line
   (`g2-detours/21.png`). **(b)** A layer named for its count.
3. T51A: a one-node layer bound to role shows three squares and "board green" while board draws
   red (`g2-detours/27.png`, `28.png`). **(n)** A layer's panel shows its own setting; "Why this
   look" says which layer wins.
4. T51A: the role attribute offers no "color by this" (`g2-detours/31.png`, `32.png`). **(b)**
   Where "draw by" lives.
5. T51A: Analyze answers "color" with an empty popover (`g2-detours/40.png`). **(b)** Where a
   no-match points.
6. T51A: the node menu covers the inspector; the title is "v12" (`g2-detours/22.png`). **(n)** A
   menu covers what is under it; names are (b).
7. T51A: find rows by id (`g2-detours/13.png`). **(b)** What names a node.
8. T51A: 5 Shift+Tabs to the tree, 19 Tabs back to the color box (`g3-keys`). **(n)** F6.
9. T51A: report not written; Open sample not opened. **(n)** Pilot note.
10. T51B: the drawing re-frames when the key opens (`w2-success/08.png`, `w2-keyboard/61.png`).
    **(a) 1**, regression (ef2f796ee).
11. T51B: Escape on a row's actions button does nothing (`w2-keyboard/71.png`, `72.png`). **(a)
    23**, new.
12. T51B: each row's Hide and actions buttons are Tab stops after the grid (`w2-keyboard/70.png`,
    `71.png`). **(a) 23**, new.
13. T51B: "company , 6 nodes" (`w2-keyboard/68.png`). **(c)** Backlog.
14. T51B: the tree entered at Everything. **(n)** Correction: the tree's resting row.
15. T51B: find rows and the inspector by id (`w2-detours/40.png`, `46.png`). **(b)** What names a
    node.
16. T51B: the layer from "kind is company" is named "6 nodes" (`w2-detours/44.png`). **(b)** A
    layer named for its count.
17. T51B: no color-by-value from the data's menus (`w2-detours/46-52.png`). **(b)** Where "draw
    by" lives.
18. T51B: a color square's tooltip covers its neighbor (`w2-success/10.png`). **(c)** Backlog.
19. T51B: DisclosureTriangle (`w2-keyboard/11.png`). **(n)** Native disclosure.
20. T51B: the arrow cursor over the link icon and "+" (`w2-success/06.png`). **(n)** The cursor.
21. T51B: "add a condition to narrow" opens a second button (`w2-detours/17.png`); Effects drawn
    bright after Done. **(a) 9**, regression (9f8c35c76); the bright heading is in the backlog.

## Kept for the sessions

The (b) list is the same as every earlier pass: what names a node when a file has a name column
and no label; where "who" and "draw by" live; hover names; what Enter and a click in find take;
a card's count read as the layer's, and "and" between cards; how a selection looks while styled;
the canvas keyboard walk; whether the key and a chit lead anywhere; the words for clusters and for
"at least"; where the look of everything lives; whether the Layer token reads as a column.
