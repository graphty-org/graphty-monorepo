# T79 B pilot (build 0c163f54bf)

Start: `rounds/tier-5/setups/sensors-50k.txt` (50,000 sensors, 100,000 stretches, drawn at random).
Prompt B: the sensors in the Otter Creek basin in orange, and how many. Every walk began at the
task's real start, with Undo off ("Undo" disabled, "Nothing to undo"). Walk folders are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T79B/ (walks of an earlier
build that sat there are moved to `build-baac78342b/`).

Result: **reached**, by pointer and by keyboard. Layer 1 reads 1,050, Which nodes reads "1,050 of
50k" and the key reads "1,050 of 50,000 nodes", as the answer key says. The data stayed the task's
own file the whole way (50,000 nodes, 100,000 edges; the filter detour reads "1,050 of 50,000
nodes, 42 of 100,000 edges" and returns to the full graph). No script error, failed request or
setup failure on any walk.

## Routes walked

| Folder | Route | What happened |
| --- | --- | --- |
| success | Pointer: + > Layer; Which nodes; basin; type Otter Creek; tick Otter Creek; Done; Fill +; FFA500 Enter; then 00FF00 Escape; Tab | Replayed from the last pass; every step matched. Opening Which nodes settled in 5.5 s, the tick in 4.4 s, Done in 4.8 s (route.jsonl `settleDom`). Escape in the color box keeps FFA500 (13.png); Tab moves to the link button (14.png). |
| detour-1 | Scrolling the checklist for the value: basin; click "32 more"; wheel over the list; Search 40 "otter"; Enter; Tab; Shift+Tab, Escape; Check 1; Done | Matched. "32 more" does nothing and the wheel scrolls nothing (05.png). Enter in the search ticks nothing (07.png); Tab goes to Check 1; Escape sends focus to the outline's basin row (09.png). Check 1 then Done gives Layer 1 at 1,050 (10.png). |
| detour-2 | Clicking a node of the basin on the canvas, then the find box: a node click; hover and click the inspector's basin value; find "Otter Creek"; Enter | Matched. The node click shows one sensor (n38766, Maple Run) in the inspector; its basin value is not a control (04.png). The find box lists "Nodes 1050" (05.png); Enter selects only n38 and moves the camera, leaving the graph half off the canvas (06.png). No way to color from here. |
| detour-3 | A Data place filter card: Add filter, basin, "Otter", tick Otter Creek, Done; Style tab; the top bar's x | Matched. The top bar reads "1,050 of 50,000 nodes, 42 of 100,000 edges" (06.png): the other sensors leave the picture, which the answer key grades not success. The inspector's Style tab is the graph's (background, canvas), with nothing to color nodes (07.png). The x switches the card off; it stays as "1,050 of 50k" (10.png). |
| keyboard | The success path by keyboard only (Tab, Enter, type, ArrowDown, Space, Escape) | Replayed to step 3, where it differs from the last pass only because Undo now starts disabled ("Undo" disabled, not "Undo changing the layout"); carried on by hand to the end: Layer 1 orange on 1,050 nodes (43.png). Focus never fell to the page body after the first Tab. |
| fields | Enter, Tab and Escape in the fields the success path opens that the other walks did not press | Escape in a new layer's name box keeps "Layer 1" (03.png). Tab in the attribute search with "bas" takes basin and focuses Search 40 (05.png). Escape in Search 40 sends focus to the outline row (06.png); a second Escape closes the workspace and keeps the layer with a basin step and no value, 50,000 (07.png), as decided ("A new card left with only an untested step stays, inert"). |

Keyboard focus names, in order: Main menu; Project: sensors-50k; Undo (disabled); Redo (disabled);
Graph; Graph sensors-50k.graphml; Find; Add a layer or a folder; menuitem Layer; textbox Layer name;
treeitem "Layer 1, node and edge layer, 50,000 nodes, 100,000 edges"; Graph settings; separator
Resize left panel; Canvas Graph drawing; Layout; Select what it paints; Layer actions; tab Style; tab
Node; checkbox Style nodes; treeitem "Which nodes, 50000 of 50000 nodes"; combobox Find attributes,
results; textbox Search basin; button Check 1; checkbox "Otter Creek, 1050 nodes"; treeitem "basin
Otter Creek, 1,050 of 50,000 nodes so far"; Edit Which nodes; Add to node shape / visibility / text /
fill / shaders; textbox "Node color, not set, drawn #6366F1 indigo"; textbox "Node color, set here,
orange"; Node color by attribute.

## Defects

1. **Done hides the count while focus stays on Which nodes.** After Done the row shows "Edit" in
   place of "1,050 of 50k" (success 09.png, detour-1 10.png); the filter card shows "Edit" in place
   of its count too (detour-3 06.png). The count shows once focus moves (success 12.png). A
   participant who reads the count right after Done finds none. Seen in earlier passes.
2. **After Done by keyboard, focus is on a row named for the workspace.** Escape closes the
   workspace with focus on a tree item named "basin Otter Creek, 1,050 of 50,000 nodes so far",
   while the ring is drawn round the Which nodes row with Edit (keyboard 32.png). "so far" is the
   workspace's step word, and the name does not start with what is drawn ("Which nodes").
3. **The tick is announced twice, in two formats**: "1050 of 50000 nodes", then "1,050 of 50,000
   nodes" (keyboard step 29, 30.png). Seen in earlier passes.
4. **Names without the thousands separators the screen shows**: the Which nodes row "Which nodes,
   50000 of 50000 nodes" (keyboard step 21) and the checkbox "Otter Creek, 1050 nodes" (step 28).
5. **A name that is not drawn**: before a color is committed the color box is named "Node color,
   not set, drawn #6366F1 indigo" (keyboard step 39, 41.png). Seen in earlier passes.
6. **ArrowDown in the attribute search does not move**: with "bas" typed and basin the only match,
   ArrowDown leaves basin highlighted but drops its "selected" state (keyboard 25.png); Enter still
   takes basin. Harmless here, but a screen reader hears the option lose its state.
7. **The attribute list covers the workspace's Done.** While the attribute search is open its list
   lies over the header's Table, Clear, Cancel and Done (keyboard 24.png).
8. **Enter in the checklist search ticks nothing**; only "Check 1" or the row's box ticks
   (detour-1 07.png). "32 more" is plain text and the wheel does not scroll the list (detour-1
   03.png, 05.png). A participant scrolling for the value finds no way but the search. Seen in
   earlier passes.
9. **The find box's Enter moves the camera to one node** and leaves the graph half off the canvas,
   with nothing on the canvas to say which node (detour-2 06.png). The list said "Nodes 1050", so a
   participant may report 1,050 without any orange drawn.

## Mismatches with the answer key

None. Count (1,050 of 50,000) and path (10 steps) are as `answers.md` T79 says. The waits are
shorter than any timing the key records: opening Which nodes 5.5 s, the tick 4.4 s, Done 4.8 s
(success); "Drawing" behavior was not timed with glance frames in this pass.
