# Tier 3 dry run before the round 1 sessions, third pass on build 758b8e8081

Every tier 3 task half was piloted again on the frozen build 758b8e8081, the build made after the
second pass's two fixes (a layer made from a selection takes its conditions before it has a look;
Undo across a file opened over itself redraws from the layers). The pilots walked each half's
pointer success path and the eight routes those fixes touch, on each half's own data where the
route fits it; Sam's T39 A and eight other halves also by keyboard. This page sorts every problem they reported (141
lines) and gives the reason. Screenshots are under `rounds/r1d2/pilot/<task>/<session folder>/`.
(The third-pass triage of an earlier freeze, build 5bd16cda6e, is in this file's git history at
b296635060.)

The pass has the narrow job of the first two: make the build ready for sessions. No crash, no
blocked task and no wrong result that would spoil grading, on any task's success path or on a
detour its pilot walked. Friction, wording, cosmetic and keyboard-only problems go to `backlog.md`
and are fixed between rounds. T37, T42 and T44 are not run in round 1 (`roster.md`); their lines
are classed like the others, and a defect seen only there is (a) only when it also reaches a round
1 route.

Classes:

- **(a) fix now.** CRASH, BLOCKS or SPOILS GRADING on a success path or a walked detour, with its
  origin: **new**, **regression** (caused by the second pass's fixes) or **repeat** (an earlier
  triage already sent it to fix).
- **(n) no change.** Asks for something other than a settled behavior in `decided.md` (the entry is
  named), a fact the answer key already grades around, a note about the pilot or the study tool, or
  a line reporting no defect.
- **(c) backlog.** Friction, wording, cosmetic, and what only a keyboard or screen-reader user
  meets. Each heading below is one entry in `backlog.md`, with its kind.
- **(b) leave for the sessions.** A design question the study exists to answer.

## Totals

- 141 lines: 0 (a), 103 (c), 6 (b), 32 (n). The 103 (c) rows are 41 entries in `backlog.md`.
- No (a): 0 crashes, 0 blocks, 0 spoiled grades; so 0 regressions and 0 repeats. **The build is
  ready for the round 1 sessions.**
- The second pass's two fixes held on every walk that crossed them. A find-box layer takes "Has no
  value" and a second card before its look, and Done keeps both (T41 B `q4-email-layer`, T41 A
  `p3-detour-find-phone`, T38 A `r5-find-edit`, T51 A `rs-find-edit`). Undo after Control+O >
  Replace redraws from the layers, and the first find-box pick after Replace draws its ring
  (T44 B `758b8e8081/p2-detour-c-label-replace`, T45 A `d2-replace-undo`, T38 A `r5-replace-pick`).
  A "+" layer is unchanged (T41 A `p3-pointer`).
- No settled behavior is reversed. One behavior is added to `decided.md` (2026-10-21, "Dry run pass
  3 on build 758b8e8081"): a held selection asks for nothing after the pick. It settles where the
  owner's glide (2026-10-20) meets "the drawing moves only when the reader asks" (2026-10-19), for
  the backlog's most-walked entry.
- 27 lines are PASS INCOMPLETE. Every one is (n): the eight fix routes were each walked on this
  build by the pilot of the task they belong to; routes the two fixes do not cross keep their
  earlier walks (`criteria.md`, preflight 4); the Replace routes have no form on a sample or a
  project file; and a missing `report.md` is the harness refusing a subagent's report file. T48 A's
  late pilot never got a browser, but earlier sessions on this build (`758c-pointer`, `758c-rp-*`)
  walked its success path to the target (15 of 24 in their Louvain colors) and every fix route.

## Why the lines that sounded like (a) are not

- **The drawing moves right while a selection is held (23 rows on 21 task
  halves).** Two pilots called it a spoiled grade: painted nodes went off screen on the last
  screenshot (7 of T38 B's 10 blue, 3 of T41 B's 4 red). Nothing drawn is wrong. The answer key
  grades the layer from `styles.json` and takes a count or a name only as read from the screen;
  Fit (right-click, or `0`) brings every node back; and T41's own success path already needs Fit,
  because the owner's glide to each picked dot carries the others to the edges. It stays in the
  backlog, first. Mechanism, read in graphty-element: with `camera.pivotOnSelection` on,
  `UpdateManager.followSelection` sets the pivot to the selection's average every frame, and
  `OrbitCameraController.updateCameraPosition` puts the pivot at the center of the area the view
  insets leave free. When the first key appears the app widens the left inset for it;
  `setViewInsets` moves the pivot to keep the drawing still, and the next frame's follow pulls it
  back onto the selection, so the selection re-centers in the narrower free area: half the key's
  width, about 140 px. With nothing selected the follow returns early and the compensation holds,
  which is why the "+" route never moved.
- **A layer made from a `>` rule shows the raw rule (T42 A and B).** `hours > 20` and
  `donations > 10000` make a card reading `{"kind":"threshold",...}` that takes no edit. Not a
  block: the find box's `>=` makes an editable Between card, and Remove then a new card also reaches
  the line. T42 is not run in round 1, and no round 1 success path or detour makes a layer from a
  `>` rule and then edits it. It is in the backlog marked to be fixed before T42 runs in round 2.
- **The key drops the Louvain section after Undo (T46 B).** Seen only after Control+O > Replace
  with a GraphML the app exported, which brings its own style groups and marks the run out of
  date. With a data file the same Replace and Undo keep the run in the key (T48 B
  `q-findlayer-replace-undo/10.png`, three Louvain groups listed). No round 1 route reopens an
  app-exported file.
- **Enter on an unset Width line makes no layer (T50 B, on T45 A's route).** Enter on the default
  8, or 8 typed again, changes nothing a reader could see; a width over 8, the success path's step,
  makes the layer, and T45 grades a width above 8.
- **The Data place's "Filter to..." leaves focus on the tree row (T42 A).** A click in the box
  reaches it; T42 only.

## Backlog

Each heading is one entry in `backlog.md`, with its kind, most-walked first. A row against a settled
behavior names the entry.

### The drawing moves without the reader asking (friction)

- T37A 7 (c): about 140 px right as the key arrives with nodes selected; still against decided.md 2026-10-19 (fx2-hasvalue-b/15.png, fx3-findlayer-edit/14.png).
- T38A 1 (c): about 140 px right as the first color lands with nodes selected; all 8 blue stay visible (r5-find-edit/14-15.png, r5-replace-undo/09-10.png, r5-replace-pick/12-13.png).
- T38B 1 (c): the first color with a selection held moves the drawing right; on e-edit-cond/22.png 7 of the 10 blue are on screen. Not a spoiled grade: the layer is graded from `styles.json`, and a count or a name counts only as read from the screen (answers.md, "A run" and T41); nothing drawn is wrong, Fit (right-click, or `0`) brings every node back, and T41's own success path already needs Fit after the owner's glide (decided.md 2026-10-20) (e-email/15.png, e-phone/16.png, e-edit-cond/22.png, e-color-replace/10.png).
- T39A 1 (c): Select all (canvas menu or Control+A) shrinks and shifts the drawing (m-detours1/10-11.png, m-detours2/10-11.png).
- T39A 2 (c): Select all > New layer from selection > Fill: about 140 px right; still off center after two Control+Z (m-detours1/13-14.png, 17.png).
- T39B 2 (c): 130-150 px right as the key first appears for a layer made from a selection (n-findbox-condition/11-12.png, n-reopen-undo/07-08.png).
- T40A 1 (c): about 135 to 155 px right after a find-box selection (r3-email-fromselection/15.png, r3-phone-fromselection/15.png, r3-role-edit-before-look/14.png, r3-color-replace-undo/14.png).
- T40B 1 (c): about 135 px right with nodes selected; graded on the tree (s3-find-layer-edit/17-18.png, s3-replace-first-pick/09-13.png, s3-find-replace-undo/08.png).
- T41A 2 (c): 140-155 px right on the first color of a layer made from a selection; all four red stay visible (p3-detour-find-phone/14-15.png, p3-detour-rule-replace/09.png).
- T41B 1 (c): the first color with a find-box selection held moves the drawing right; 3 of the 4 red on screen on q4-findlayer-replace/09.png. Not a spoiled grade: the layer is graded from `styles.json`, and a count or a name counts only as read from the screen (answers.md, "A run" and T41); nothing drawn is wrong, Fit (right-click, or `0`) brings every node back, and T41's own success path already needs Fit after the owner's glide (decided.md 2026-10-20) (q4-findlayer-replace/09.png, q4-email-layer/14-15.png, q4-a-phone-layer/15.png, q4-findrule-edit/17.png).
- T42A 3 (c): about 140 px right on the first color after a find-box selection (r3-detour-start/21.png, r3-fix-find-edit/15.png, r3-fix-find-phone/12.png, r3-fix-replace-find/09.png).
- T42B 2 (c): 120 to 155 px right; the key still says 9 of 24 (p4-find-edit/14.png, p4-email/14.png, p4-phone/14.png).
- T43A 1 (c): 140 to 155 px right with nodes selected, for a color and for a size binding (w3-novalue-phone/13-14.png, w3-find-condition/14-15.png, w3-color-replace-undo/07-08.png).
- T43B 1 (c): 135 to 155 px right as the first look lands with a selection held; one red dot cut at the inspector (z-email-layer/16-17.png, z-phone-layer/15-16.png, z-findlayer-replace/09-10.png, z-find-condition/17-18.png).
- T44B 1 (c): 140-150 px right with a selection held; on volunteers one node goes behind the inspector (p2-t41b-email/15-17.png, p2-t41a-phone/14-17.png, p2-t38a-role-edit/14-18.png, p2-color-replace-undo/11.png).
- T44B 3 (c): after the undos the drawing stays shifted right; Undo never re-frames, as decided, so this follows from the move above (p2-color-replace-undo/19.png).
- T46A 1 (c): 130-155 px right on the first Fill with a find-box selection held; every painted node stayed visible (w4-email-layer/17-18.png, w4-phone-layer/13-14.png, w4-findlayer-edit/13-14.png, w4-findcolor-replace-undo/07-08.png).
- T47A 1 (c): 140 to 155 px right with a selection held (r3-route1-email/14-15.png, r3-route2-phone/15.png, r3-route3-condition-first/16.png, r3-route6-color-replace-undo/09.png).
- T49A 5 (c): 140 to 155 px right with a find-box selection held (f1-t41b-email-layer/16.png, f2-t41a-phone-layer/13.png, f3-t38a-find-edit/13.png, f6-findlayer-replace-undo/07.png).
- T49B 1 (c): 130 to 155 px right with a selection held, still off center after Replace and Undo (z1-t41b-email-layer/13-15.png, z2-t41a-phone-layer/14-15.png, z3-t38a-find-edit-before-look/15.png, z6-findlayer-color-replace-undo/09.png, 13.png, 15.png).
- T50B 2 (c): about 135 px right as the first Fill red brings the key; a node cut at the inspector (t3-email-onrecord/16-17.png).
- T51A 1 (c): about 150 px right as the find-box layer's color lands; none when Everything's color is bound (rs-find-edit/16-17.png, rs-replace-undo/09-10.png).
- T51B 1 (c): about 140 px right with a selection held; already in the answer key (r4-email-layer/19.png, r4-phone-layer/14.png, r4-find-layer-condition-b/14.png).

### "Which nodes" with no condition opens without its attribute list (friction)

- T38B 2 (c): a second click or Enter on 'Add a condition'; against decided.md 2026-10-19 (e-pointer/07.png, e-keys).
- T45B 2 (c): 'Which edges' only expands; a second click on 'Add a condition'; against decided.md 2026-10-19 (y-pointer/09.png, 10.png; y-detour-nodetab/06.png, 07.png).
- T47A 2 (c): the hint 'All 24 nodes: add a condition to narrow' opens the picker with its list closed (r3-route4-plus-layer/07.png, 09.png).
- T49A 6 (c): 'Which nodes' only expands (f4-t41a-plus-layer/05.png).
- T50A 1 (c): 'Which nodes' opens the picker without the attribute list (s5-plus-layer/06.png).
- T51B 2 (c): Which nodes opens with the list closed; letters typed at once after 'Add a condition' were refused, a moment later they reached the search (r4-plus-layer/08.png, 10.png, 11.png).

### Layers made the same way are named differently (wording)

- T38B 5 (c): 'email and 1 more' on sources, 'phone and trained' on volunteers (e-email/13.png, e-phone/14.png).
- T44B 2 (c): 'email and 1 more' against 'phone and trained' (p2-t41b-email/13.png, p2-t41a-phone/13.png).
- T46A 2 (c): 'email and 1 more' against 'phone and trained' (w4-email-layer/13.png, w4-phone-layer/11.png).
- T48B 1 (c): 'email and 1 more' against 'on_record +1' in the row and the key (q-email/12.png, q-phone-onrecord/17.png).
- T50B 3 (c): 'phone and trained' though its rule is phone: Has no value, and 'email and 1 more' (t2-phone-trained/16.png, t3-email-onrecord/15.png).
- T51A 2 (c): adding a second card renames '3 nodes' to 'Picked by hand: 3 nodes' (cut to 'Picked by hand: 3...') before a value; 'role: board' at the end (rs-find-edit/10.png).

### F6 misses the top bar and stops on resize handles (accessibility)

- T37A 2 (c): the cycle never reaches the top bar (keyboard/, F6 steps).
- T41A 1 (c): Canvas, Analyze, 'Resize left panel', the color box; no top bar, a resize handle as a stop (p3-keys/85.png).
- T42A 7 (c): canvas, toolbar, left panel, inspector heading; no top bar (r3-keyboard/18.png to 23.png).
- T42A 8 (c): F6 enters the left panel at its first control once and at the Layer 1 row later (r3-keyboard/20.png, 68.png).
- T43A 3 (c): four regions, no top bar (w3-keyboard).

### A layer made from a find-box rule shows the raw rule and cannot be edited (fix before T42 runs in round 2) (friction, wording)

- T37A 6 (c): a find-box pick on 'id' makes 'Rule: id', a raw card with no match control; the degree card reads 'graphty.degree > `16`' and the key 'Color: Rule: graphty.degree > 16' (fx2-hasvalue-b/08.png, fx3-findlayer-edit/07.png).
- T37B 3 (c): 'Rule: graphty.degree > 16' and its card's raw 'graphty.degree > `16`' (p-findlayer/08.png, 09.png).
- T37B 4 (c): Which nodes offers only 'Node id'; Degree, which the find box and the inspector show, cannot be picked (p-findlayer/10.png).
- T42A 1 (c): 'hours > 20' makes a card showing {"kind":"threshold",...} with no match menu or boxes; only Remove changes it. Not a block: the find box's 'hours >= 20', or Remove and a new hours card, reach the line; T42 runs only in round 2 (r3-fix-find-edit/08.png, 09.png, 11.png).
- T42B 1 (c): 'donations > 10000' makes the raw threshold card; '>=' gives an editable Between card. Not a block: '>=' or Remove and a new card reach the line; T42 runs only in round 2 (p4-find-edit/08.png, 09.png).

### Enter on the start page's Samples leaves focus behind (accessibility)

- T37B 6 (c): Enter on Samples leaves focus on the button; New project, two footer links, the search, two view buttons and ten category buttons before the cards (p-keyboard/21.png to 38.png).
- T39A 6 (c): 3 extra Tabs before the library; the count to the card still matches the key (m-keys/22.png).
- T44A 1 (c): focus stays on Samples, off screen; 19 Tabs to the first card (s3-keyboard/18.png).
- T45B 1 (c): New project and two footer links before the library's search (y-keyboard/22.png).
- T46B 6 (c): Enter on the header's Samples link leaves focus at the top; 30 Tabs to a card (t3-keyboard/06.png).

### After Replace the drawing is framed right of center (friction)

- T41A 3 (c): after Control+O > Replace the graph sits right of center against the inspector (p3-detour-rule-replace/12.png).
- T43B 2 (c): after Replace with the same file the drawing is small and right, the left third empty, and stays so after Undo (z-findlayer-replace/13.png, 15.png, z-edge-replace/13.png, 14.png).
- T47A 3 (c): right of the middle after Replace, and after Undo (r3-route6-color-replace-undo/12-14.png, r3-route7-edge-replace-undo/13.png).
- T49A 7 (c): right of the middle after Replace; Undo leaves it (f6-findlayer-replace-undo/10.png, f7-t45a-edge-replace-undo/11.png).
- T51A 3 (c): after Replace the drawing sits in the right half against the inspector (rs-replace-undo/13.png).

### Two controls share a name (accessibility)

- T37B 7 (c): 'Samples' names the header link and the button (p-success/03.png).
- T44A 2 (c): the tree row and the 'Why this look' link are both named 'Everything' (s3-replace-undo/15.png).
- T46A 3 (c): 'Samples' names the top-bar link and the start card's button (the study tool refuses the bare name) (w4-pointer/02.png, 03.png).

### A focused heading draws no ring (accessibility)

- T40B 2 (c): no ring on 'Graph, yeast-galactose: 331 nodes, 361 edges' (s3-keyboard/17.png).
- T49B 2 (c): no ring on 'Graph, Zachary's karate club: 34 nodes, 78 edges' (y-keys/44.png).
- T50A 3 (c): no ring on 'Graph, lesmis-poster: 77 nodes, 254 edges' (s10-keyboard/18.png).

### Reopening an exported GraphML adds the file's own style groups (friction, cosmetic)

- T46B 1 (c): after Replace with a GraphML the app exported, one Control+Z drops the Louvain section from the key while the 10 groups stay drawn; the next Undo brings it back. Against decided.md 'the key and the drawing never disagree', but reached only by reopening an app-exported file, which no round 1 route does: with a data file the same Undo keeps the Louvain key (T48B q-findlayer-replace-undo/10.png) (t3-findlayer-replace-undo/13.png, t3-edge-layer-replace-undo/17.png, t3-label-replace-undo/23.png).
- T46B 3 (c): the exported GraphML brings back twelve 'A group from the ...' layers and internal columns as data, and the run reads 'out of date' (t3-label-replace-undo/19.png, 21.png; t3-replace-first-pick/10.png, 14.png).
- T46B 4 (c): the notice after that Replace is one line cut off at both ends (t3-label-replace-undo/21.png, t3-findlayer-replace-undo/12.png).

### Escape on the inspector and in dialogs (friction)

- T37A 5 (c): Escape after Enter in the find-box layer's Which-nodes value box clears the 77-node selection while the inspector shows a layer; against decided.md 'Escape in the inspector' (2026-10-19) (fx1-hasvalue/17.png, 18.png).
- T37B 5 (c): Escape on the Which-nodes summary of a layer's inspector cleared the selection; against decided.md 'Escape in the inspector' (2026-10-19) (p-findlayer/14.png).

### Find-box rows: right-click does nothing, and a click keeps or clears the text (friction)

- T38B 3 (c): right-click on the 'phone' value row opens no menu and selects nothing (e-phone/06.png).
- T38B 4 (c): a click on the 'email' value row keeps 'email' in the box; 'kind is company (6)' empties it (e-email/06.png, e-edit-cond/12.png).

### A pick glides to a point right of the canvas center, or zooms (friction)

- T39A 3 (c): a node clicked in Why this look is centered (decided.md 2026-10-20) and the top of the drawing is cut off (m-detours1/17-18.png, m-detours2/12-13.png).
- T41B 2 (c): each pick glides and zooms, the other red dots leave the screen; Fit leaves the drawing low and right. The glide is decided (2026-10-20), the zoom is the backlog's; already in the answer key (q4-pointer/17.png, 19.png).

### "Style nodes" or "Style edges" drawn dimmed with no reason (friction)

- T41A 4 (c): 'Style nodes' dimmed on a layer made from a selection; the 17 rings stay around a layer that paints 4 others (the answer key grades the layer) (p3-detour-find-phone/07.png, 15.png).
- T45B 9 (c): 'Style edges' dimmed on a layer made from a selection, live on a '+' layer (y-detour-find-newlayer/08.png, y-detour-find/13.png).

### Selected and styled things are hard to read (cosmetic)

- T42A 6 (c): gold-yellow selection rings close to the asked orange (r3-detour-start/19.png, r3-fix-replace-find/08.png).
- T45B 4 (c): width 24 draws only a little thicker than 8 once the selection clears; graded on edge.width above 8 (answers.md T45) (y-detour-find-newlayer/14.png, 15.png; y-detour-find/15.png).

### The picker says "together none" when one condition alone leaves none (wording)

- T43A 2 (c): 'Each condition leaves some; together none' while the hours card alone says 0 nodes (w3-novalue-hours/12.png, 10.png).
- T50A 2 (c): 'Each condition leaves some; together none' while the name card says 0 nodes (s2-findbox-hasnovalue/09.png, 12.png).

### Escape in a popover's or the picker's box reverts silently (accessibility)

- T49A 1 (c): Escape in the picker's hex box puts the old value back with no 'Edit discarded' line; against decided.md 2026-10-19 (d-a-typeback/15.png, 16.png).
- T49B 3 (c): Escape in the hex box reverts with no 'Edit discarded'; already in the answer key (y-detour-color/18.png).

### A tooltip and the control's name differ (accessibility)

- T49A 4 (c): the eye is named 'Hide Everything', its tooltip says 'Turn this layer off' (d-b-reopen/23.png).
- T49B 4 (c): the dimmed Undo is named 'Undo', its tooltip says 'Nothing to undo' (y-keys/124.png).

### The analysis filter: Tab lands on a disabled button, Escape on Back does nothing (accessibility)

- T37A 1 (c): Tab from 'Filter analyses' with 'deg' lands on the disabled 'Update Degree layer'; the first Escape on 'Back to analyses' does nothing (keyboard/, after 55.png).

### Two analyses named Degree after a run (wording)

- T37A 3 (c): Recent and Rank nodes and edges both list 'Degree' (detours/34.png).

### The private-window notice on every open (accessibility)

- T37A 4 (c): the notice appears and is announced as the sample opens (pointer/04.png).

### After Load of a second file the breadcrumb names that file (wording)

- T37A 8 (c): the left panel reads 'Graph florentine.gml' while the top bar says Les Miserables; neighbors.csv added 0 nodes and 0 edges (its people and ties are already in the sample); a stale 'Did you mean Degree?' stays under the find box (fx6-findlayer-open-undo/11.png, fx7-edgelayer-open-undo/20.png).

### '34 selected' reads as a count (wording)

- T37B 2 (c): '34 selected' (screen and live region) for the one node named 34; recorded in answers.md (p-success/14.png, p-keyboard/53.png).

### Removing a line slides the next one under the pointer (friction)

- T39A 4 (c): after 'Remove edge color' Width slides under the pointer; a second click removes it (m-detours1/23.png, 24.png).

### Undo's words for a load or a setting (wording)

- T39A 5 (c): undoing Background color says only 'Undid changing settings.' (m-detours1/07.png).

### A node is named by its id, not its label (wording)

- T39B 1 (c): '82' in the inspector title, the layer, the notices and the key, 'NotreDame' in find and Values; against decided.md 'A node is called by one name' (2026-10-19) (n-findbox-condition/05.png, 07.png, 09.png; n-reopen-undo/08.png).

### Replace takes two pages and two clicks (friction)

- T40B 3 (c): Control+O with the same file: Replace on the Add-to page, then Replace again (s3-find-replace-undo/09.png, 10.png).

### The Data place's 'Filter to...' leaves focus on the tree row (friction)

- T42A 2 (c): the New filter step opens with focus on the hours row; a typed 20 goes nowhere and the next Enter drops the step. A click in the box reaches it; T42 only (r3-detour-start/11.png, 12.png).

### Tab in a list with letters typed takes nothing (friction)

- T43A 4 (c): 'ho' highlights hours and Tab takes nothing; against decided.md (2026-10-18); already in the answer key (w3-keyboard/43.png).

### A card with no value shows a count of its own (friction)

- T45B 3 (c): a just-added shared_chapters card with nothing typed shows '254 edges'; against decided.md 'A condition card's count' (2026-10-19) (y-pointer/11.png, y-detour-nodetab/09.png).

### A tooltip covers the next control (cosmetic)

- T45B 5 (c): the 'Edge width by attribute' tooltip covers the Arrowheads '+' (y-pointer/18.png).

### "Has no value" and number hints in find (wording)

- T45B 6 (c): 'chapters' finds nothing; the hint gives a node rule, never the edge column (y-detour-find/05.png).

### Escape in a condition card closes the picker (friction)

- T46B 2 (c): Escape in a card's 'Search Louvain' box closes the picker; the edits are kept; against decided.md 2026-10-19 (t3-find-edit-before-look/14.png, t3-keyboard/99.png).

### The find list's heading counts rows it does not list (friction)

- T46B 5 (c): 'Nodes 4' for Kansas lists Kansas and KansasState; Arkansas and ArkansasState show only for 'nsas' (t3-findlayer-condition2/06.png, 08.png).

### Control+O while a picker is open drops the half-made line (friction)

- T48B 2 (c): Cancel on the chooser drops the half-made label with 'Label not added: no value was picked' (q-label-replace-undo/09.png, 10.png, 12.png).

### A click into the picker's hex box does not select its value (friction)

- T49A 2 (c): the caret lands after the value and typing adds on ('0000FF00FF00'); the inline color box selects its value (d-a-typeback/15.png).

### After a line is removed focus goes to another section's '+' (accessibility)

- T49A 3 (c): after 'Remove node color' focus lands on Effects' '+'; against decided.md 2026-10-19 (d-a-typeback/18.png).

### Tab does nothing in an open '+' menu (accessibility)

- T50A 4 (c): eight Tab and Shift+Tab presses leave focus on 'Shape'; only Escape leaves; against decided.md 'Tab closes a pop-out' (2026-10-17) (s10-keyboard/56.png to 64.png).

### After Discard focus once landed on the canvas (accessibility)

- T50A 5 (c): a focus ring on the canvas instead of focus on the inspector heading; seen once (s6/13.png and s8/12.png went right) (s7-color-reopen-undo/10.png).

### Escape on a member opened from a layer's list closes the layer (friction)

- T50A 6 (c): Escape after opening a member returns to the Graph, not to the Poster layer's member row; already in the answer key (s1-pointer/06.png, s10-keyboard/93.png).

### An unset line does not take its value on Enter (friction)

- T50B 1 (c): Enter on the unset Width line showing 8 makes no layer; a canvas click then drops it; against decided.md 2026-10-18. A width typed over 8, the success path, makes the layer (t8-edge-layer-replace/10.png, 11.png, 12.png, 16.png).

## Leave for the sessions

- T37A 9 (b): 'Highest 36' and the histogram name no one, the table has no Degree column before a run, a hover shows nothing (detours/04.png-08.png, 20.png). What a hover, the Values histogram and the table before a run show (r1-1 T37A 5); recorded in answers.md T37 as routes that do not reach the name; Escape on the 'Add to' page is the backlog's 'Escape on a page or form'.
- T42A 4 (b): 'top 20 by hours, 20 nodes' says nothing about counting people rather than a line (r3-detour-card/09.png). What a newcomer expects of 'Highest' against a line ('at least' has no match; r1-1 T42A 5, r1-2 T45B 3).
- T42A 5 (b): 20 in the 'to' box gives 'hours 2 to 20, 14 nodes', the wrong side of the line (r3-detour-card/12.png). The number typed into the range's high end is a T42 detour under study (tasks.md, 'T42'); the card states the range it holds.
- T45B 7 (b): hovering a tie shows nothing (y-detour-nodetab/16.png). What a hover shows (r1-1 T37A 5, r1-2 T45B 6).
- T45B 8 (b): the Data place's edge attribute offers only 'Filter to...' and 'Show in table' (y-detour-nodetab/21.png). Where styling by value lives: the Data place (r1-1 T43B 16, r1-2 T45B 7).
- T50B 4 (b): Control+O with a different file shows 'Add to volunteers-thanks' with Cancel and Load, no Replace (t3-email-onrecord/03.png, t6-label-replace-undo/11.png). Whether opening a different data file should offer Replace: today it offers only Load into the open graph, and decided.md (2026-10-19) offers Replace for the file already open.

## No change

- T37A 10 (n): PASS INCOMPLETE. The Replace page is offered for a file already open (decided.md 2026-10-19); a sample has no file, so the Replace routes were walked on their own tasks' data by those tasks' pilots. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T37B 1 (n): no crash, block or wrong result. No defect: the pilot's summary that the counts and the name are right on every walk.
- T37B 8 (n): PASS INCOMPLETE. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text; T37 is not run in round 1.
- T38A 2 (n): PASS INCOMPLETE. T38 A's keyboard walk and r1 detours ran on 6de5f95d12 (rounds/r1d1/pilot/T38A/), which the two fixes do not cross. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T38B 6 (n): a right-click aimed at empty canvas lands on an edge after the glide and makes a one-edge layer (e-edit-cond/07-08.png). decided.md 'Right-click selects what is under the pointer' (2026-10-19) and 'The camera glides to center a picked node' (2026-10-20), as the line itself says; Undo recovers.
- T38B 7 (n): PASS INCOMPLETE. No route was skipped; rounds/r1/pilot/T38B/report.md never existed, and the listed routes replaced its detour set; a missing report.md is the harness's refusal.
- T39A 7 (n): PASS INCOMPLETE. T39 A's own routes and keyboard walk ran on this build (m-pointer, m-detours1, m-detours2, m-keys); the listed fix routes belong to other tasks. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text. The queued start in m-fix1/ (only session.log) needs an --end if it opens.
- T39B 3 (n): PASS INCOMPLETE. T39 B is not a keyboard half (roster.md); its own detours were walked; the listed file routes have no T39 B form. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T40A 2 (n): PASS INCOMPLETE. T40 A's keyboard walk ran on 6de5f95d12 (rounds/r1d1/pilot/T40A/); its success path, a '+' layer with a text card, crosses neither fix (both make throwing or stale calls behave and change nothing on a '+' layer's path, which r3-pointer walked on this build). Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T41A 5 (n): PASS INCOMPLETE. T41 A's own r1 detours ran on 7d87760756 and 6de5f95d12 and cross neither fix. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T41B 3 (n): PASS INCOMPLETE. T41 B is not a keyboard half; its keyboard walk ran on 6de5f95d12 (w3-keys). Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T42A 9 (n): a hand-picked edge with Width 5 draws no wider than any other edge (r3-fix-replace-edges/10.png, 13.png, 14.png). No defect: Width 5 is below the default 8 every edge starts at (answers.md T45: 'wider than the 8 they start at'), so the edge draws no wider than the rest; the element reports edge.width 5 on it.
- T42A 10 (n): PASS INCOMPLETE. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text; T42 is not run in round 1.
- T42B 3 (n): PASS INCOMPLETE. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text; T42 is not run in round 1.
- T43A 5 (n): PASS INCOMPLETE. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T43B 3 (n): PASS INCOMPLETE. T43 B's keyboard walk ran on 6de5f95d12 and crosses neither fix. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T44A 3 (n): nothing crashed, blocked or spoiled (s3-pointer/14.png, s3-keyboard/80.png). No defect: the pilot's summary (node.label by data.name on 77 of 77, size 96, Cosette readable).
- T44A 4 (n): PASS INCOMPLETE. A sample has no file to Replace; the sample-reopen form was walked. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text; T44 is not run in round 1.
- T44B 4 (n): PASS INCOMPLETE. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text; T44 is not run in round 1.
- T45A 1 (n): PASS INCOMPLETE. T45 A's success path and its Replace routes ran on this build (d2-success-pointer, d2-replace-undo, d2-find-layer-condition); its keyboard walk ran on 6dd0b00bd7 and crosses neither fix. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T45B 10 (n): PASS INCOMPLETE. A sample has no file to Replace (the browser's chooser opened), and the Undo half was walked; the T41 B and T44 B routes belong to other data. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T46A 4 (n): PASS INCOMPLETE. T46 A's r1 detours ran on 7d87760756 and cross neither fix. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T46B 7 (n): PASS INCOMPLETE. T46 B's r1 detours ran on earlier builds and cross neither fix. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T47A 4 (n): PASS INCOMPLETE. T47 A's r1 detours ran on earlier builds and cross neither fix. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T47B 1 (n): PASS INCOMPLETE. T47 B's pointer success path ran on this build (758r-pointer); its keyboard walk ran on 7d87760756 (p4-keyboard) and its folder route crosses neither fix. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T48A 1 (n): PASS INCOMPLETE. The success path and every fix route ran on this build in earlier sessions (758c-pointer ends with 15 of 24 in their Louvain colors and the rest indigo; 758c-rp-*); the keyboard walk ran on 6de5f95d12 (6de5c-keys) and crosses neither fix. The queued 758d-pointer never started.
- T48B 3 (n): PASS INCOMPLETE. Sources has no phone column, so the T41 A route ran with on_record; Replace ran with sources.graphml. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T49A 8 (n): none crashes, blocks or changes the grade. No defect: the pilot's summary that T49 A's success path, detours and keyboard walk all end on the start look.
- T50A 7 (n): PASS INCOMPLETE. A project file has no Replace or Load page (decided.md 2026-10-20, 'A project file opens in place of the open work'), so the T45 A and T44 B forms used Discard. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T50B 5 (n): PASS INCOMPLETE. T50 B's keyboard walk ran on 6de5f95d12 (g3-keyboard) and crosses neither fix. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T51A 4 (n): PASS INCOMPLETE. T51 A's keyboard walk ran on 6de5f95d12 and crosses neither fix. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text.
- T51B 3 (n): PASS INCOMPLETE. The T44 B and T45 A routes were walked by their own pilots (T44 B p2-detour-c-label-replace, T45 A d2-replace-undo); T51 B's keyboard walk ran on 6de5f95d12. Every route the fixes touched was walked on this build by the pilot of the task it belongs to (T41 B q4-email-layer, T41 A p3-detour-find-phone, T38 A r5-find-edit and T51 A rs-find-edit, T41 A p3-pointer, T44 B 758b8e8081/p2-detour-c-label-replace, T41 A p3-detour-rule-replace and T51 A rs-replace-undo, T45 A d2-replace-undo, T38 A r5-replace-pick); routes the two fixes do not cross keep their earlier walks (criteria.md, preflight 4); a missing report.md is the harness's refusal, its content is in the returned text. The queued start in r4-label-replace-undo/ (only session.log) closes itself after 15 minutes idle if it opens.

## What happens next

No unit is sent to fix, so nothing is rebuilt and the build stays 758b8e8081. The round 1
sessions run on it. The two queued pilot starts that never got a browser (`T39A/m-fix1/`,
`T51B/r4-label-replace-undo/`, each holding only `session.log`) must be ended if they open, so they
do not hold a browser slot during the sessions.
