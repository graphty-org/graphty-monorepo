# T48B pilot, targeted re-pilot on build 758b8e8081

Task: open sources.graphml, run Louvain, keep the cluster colors only on sources with
`on_record` Yes, everyone else as the file opened; say how many keep a color (12).
Build: `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081`
(REAL_DIST). Every session started from `empty` and was driven by clicks, typing and keys only.
The data stayed sources.graphml (24 nodes, 59 edges) in every session, including after each
Replace and each Undo.

Walked: the success path by pointer, and the eight routes the fix pass touched, each in its own
session, adapted to this task's file (sources.graphml) where the route names another task's file
or column. The keyboard walk and the fixed detour set were not part of this targeted pass.

## Result

Nothing crashed, nothing blocked the task, and no route gave a wrong result that would spoil
grading. No script error, console error or failed request in any session log.

## Success path by pointer -- `q-pointer/` (reached)

01 start page; 02 Open a file > sources.graphml (24 nodes, 59 edges); 03 Load; 04 Analyze;
05 `louvain` Enter (Louvain panel, Run focused); 06 Run: 3 groups, key "Color: Louvain" with
Group 1 to 3, the drawing stays put, the key covers one Group 3 node at the top left;
07 Louvain folder ("3 layers in Louvain. Layers added later are not changed.", "24 of 24 nodes",
chip "Louvain: <<Layer>>"); 08 Which nodes opens the picker, card "<<Layer>> 3 layers";
09 Add a condition: list shows "Louvain (already a condition)", list covers Done;
10 on_record: card starts on Yes, "12 of 24 nodes", drawing changes at once, key adds
"12 of 24 nodes"; 11 Done: chips "Louvain: <<Layer>>" and "on_record: yes, 12 nodes".
Final screen: 12 dots in cluster colors (11 visible, one under the key), 12 in indigo.
Matches the answer key for B.

## Routes the fix pass touched

1. Find box `email` > right-click > New layer from selection > Has no value, add on_record Yes,
   Done, Fill red -- `q-email/`. The layer is made as "email: has a value, 15 nodes" (07);
   switching to Has no value renames it "email: no value", 9 (10); adding on_record makes it
   "email and 1 more", 4 of 24 (12-13); Fill "+" > `red` Enter paints exactly the 4 off-email,
   on-record nodes red, key "Color: email and 1 more, 4 of 24 nodes" (15). Correct.
2. The same with a second column -- `q-phone-onrecord/`. `phone` finds nothing on this file
   ("No match for "phone"", 04). Walked on with `on_record` instead: Enter selects the 12 (06),
   New layer from selection makes "on_record: yes", 12 (08); Which nodes, the value list
   (Yes, No, Has a value, Has no value; 10), Escape keeps Yes; Add a condition > Louvain
   ("Is any of", groups unticked, 14), tick all three, Done, Fill red: the 12 on-record nodes
   red, key "Color: on_record +1, 12 of 24" (17). Correct for what was asked of it.
3. A find-box layer whose condition is edited before its look -- `q-findlayer-edit/`.
   "on_record: yes" layer, Which nodes, value to No: name follows at once ("on_record: no",
   08); Done, Fill "+" Enter sets 6366F1 and repaints the 12 off-record nodes indigo while the
   12 on record keep their cluster colors (10). A correct cover.
4. "+" layer (both-kinds row) -- `q-plus-layer/`. "+" > Layer makes "Layer 1", "Node and edge
   layer", "All 24 nodes: add a condition to narrow", "Edges: nothing set" (05), as the answer
   key describes. Adding on_record No makes it "Node layer" with Edge "not styled" (12), as the
   key describes. Fill "+" Enter: 12 off-record indigo, key "Color: Layer 1, 12 of 24" (12).
5. One-node label layer from a find-box pick, Control+O > Replace, Control+Z twice, then label
   Everything -- `q-label-replace-undo/`. Find `Rita` > Enter selects s02 (05); New layer
   from selection "s02", "Picked by hand: 1 node" (08); Text > Label > name shows "Rita Vance"
   (14). Control+O > sources.graphml > Replace sources.graphml > Replace (16-17): layers kept,
   label kept, 24 / 59. First Control+Z: "Undid changing settings and importing data." (18);
   second: "Undid changing node label on s02." (19). Everything > Text > Label > name: 24
   labels (22). Correct.
6. Find-box layer colored, Control+O > Replace, Control+Z twice -- `q-findlayer-replace-undo/`.
   "on_record: yes" filled red (06); Replace keeps the layer at 12, red on the same 12 (09);
   first Control+Z undoes the import (10), second undoes the red (11). Correct.
7. Replace after a hand-picked edge layer, then Control+Z -- `q-edge-replace-undo/` (the
   route names neighbors.csv; walked with this task's own file). Click edge s12 -- s20,
   right-click > New layer from selection ("Edge layer", "Picked by hand: 1 edge", 05); Line >
   Color > red (07); Replace keeps the edge red on the same pair (09); Control+Z undoes the
   import, edge stays red, 24 / 59 (10). Correct.
8. First find-box pick after Replace (selection ring) -- `q-replace-then-find/`. After Replace,
   `on_record` Enter selects 12 and all 12 show their selection ring (06). Correct.

## Small things a participant could notice (none affects grading)

- Two layers made the same way are named two ways: two conditions on the email layer give
  "email and 1 more" (`q-email/12.png`), two on the on_record layer give "on_record +1"
  (`q-phone-onrecord/17.png`, also in the key: "Color: on_record +1").
- Pressing Control+O while the Label attribute picker is open opens the file chooser over it;
  Cancel then drops the half-made label with the notice "Label not added: no value was picked"
  (`q-label-replace-undo/10.png`, `12.png`). Reasonable, noted only.
- Already in the answer key and seen again: a find-box pick glides the camera so the right-hand
  cluster is cut off at the canvas edge (`q-email/06.png`, `q-replace-then-find/06.png`); the
  find box keeps its text after Replace (`q-findlayer-replace-undo/09.png`).
