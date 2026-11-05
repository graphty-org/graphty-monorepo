# T65 A pilot: only the trained volunteers with 10 hours or more in the picture, staff marked

Build: 0ffeae2ef5 (frozen, `.study-builds/tier4-r1-0ffeae2ef5`). Start: `volunteers.txt` (volunteers.graphml
open, 24 nodes and 63 edges, ranked by PageRank). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T65A/ (not in git): `s1-path/`
(pointer), `s2-detours/`, `s3-keys/` (keyboard only, screen-reader lines). The pointer and keyboard walks
replayed the opening of an earlier walk of the same route on this build (every check point matched) and
were carried on by hand. The data stayed the task's own the whole way: one source, volunteers.graphml, 24
nodes and 63 edges; filters only hid nodes, nothing was deleted (`s1-path/work.json`).

## Result

Reached, with the wrong mark count. Two cards, in either order, leave **14 of 24** in the picture, as the
answer key says. But the Select card on role = staff selects **5**, not 4: it also selects the one staff
member the first card took out of the picture (trained No). The inspector says "5 nodes selected"
(trained Yes 4, No 1), the Selected layer says 5, and the screen reader hears "5 nodes selected", while
only 4 rings show on the canvas (`s1-path/17.png`, `s3-keys/111.png`). A participant who reads the
program's count reports "14 in the picture, 5 marked". The order makes no difference (both orders give 14
and 5, `s2-detours/16.png`), so the follow-up answer holds.

Path steps (pointer): 14 -- Data; Add filter; trained; open the list; Yes; Add a condition; hours; the
"from" box, 10, Enter; Add filter; role; staff; Select.

## 1. Success path by pointer (s1-path/)

1. 01.png: the start. Graph place, PageRank colors the 24 nodes.
2. 02.png: Data. Sources: volunteers.graphml 24 / 63. Fields shows a Coordinates row already set to the
   `phone` column (nobody set it). Filters "+".
3. 04.png: Filters "+" (name "Add filter") opens the attribute picker: Node id, name, role (3 values),
   hours (2 to 52), trained (2 values), phone, PageRank ...
4. 05-07.png: trained adds a card with an empty list; the list offers Yes, No, Has a value, Has no value.
   Yes writes the card with Hide already on: "15 of 24", top bar "15 of 24 nodes", key "15 of 24 nodes".
5. 08-10.png: "Add a condition" > hours (picker marks "trained (already a condition)"). The hours
   condition opens as Between 2 to 52; its operator list is Between, Highest, Has a value, Has no value --
   there is no "at least".
6. 12.png: typing 10 in the "from" box: the count still reads 15 of 24 and the slider does not move while
   typing. 13.png: Enter writes it: 14 of 24, edges 22 of 63.
7. 14.png: Add filter > role > a card "Is any of" with volunteer 16, staff 5, board 3. 15.png: ticking staff
   with the default Hide leaves 4 of 24 in the picture.
8. 17.png: Select: the role card reads "5 of 24", the picture goes back to 14, the inspector says "5 nodes
   selected" (trained Yes 4, No 1), four rings on the canvas.
9. 18.png: the first card rests as a summary ("trained is Yes and hours is between 10 and 52"); clicking it
   opens it again.
10. Field keys in the hours "to" box: typing 40 does not preview (19.png); Tab writes it (11 of 24) and moves
    to "Add a condition" (20.png); typing 52 then Escape writes it (14 of 24) and puts focus on the card's on
    box (21.png), as decided. With 40, the inspector still says 5 selected while one ring shows.
11. 22.png: opening the table shrinks and moves the drawing to fit the smaller canvas. The table marks the
    selected rows.

Hover: the Select segment has no tooltip (16.png); Hide's is "Hide nodes that do not match".

## 2. Detours (s2-detours/)

- **The find box, typing a rule.** "trained and hours 10 or more" (02.png): "No match", with a hint "type a
  rule such as hours >= 27". "hours >= 10" (03.png) offers "Select the 16 nodes"; Enter selects 16, and the
  drawing zooms and moves unasked (04.png). "trained = yes and hours >= 10" (05-06.png): "No match ... Still
  selected: 16 nodes" -- no way to combine two conditions, and nothing in the find box hides anything or
  leads to Filters. Right-click on a selected node (07.png): Neighborhood, Path between..., Frame selection,
  New layer from selection, Add note, Motion off -- nothing that takes nodes out of the picture.
- **The toolbar's filter button** (09-10.png): tooltip "Filters"; it opens the Data place with the attribute
  picker open. Typing "role", Enter adds the role card (11.png). Done in the other order from here (12-16.png):
  role staff (Hide gives 5 of 24), Select, then trained Yes and hours 10: 14 of 24 and 5 selected, the same as
  the first order.
- **A style layer's Which nodes instead of a filter** (17-26.png): Graph > "Add a layer or a folder" > Layer
  adds "Layer 1" between Pinned and PageRank. Its trained condition starts at Yes (the filter card starts
  empty). Visibility "+" offers Hide and "Show elements a layer beneath hides". Hide (25.png) hides the 15
  trained nodes -- the opposite of what was asked -- leaves their edges drawn with no ends, leaves the
  selected nodes as flat yellow discs, and the key reads "Show: Layer 1". Undo restores it with the notice
  "Undid changing node show on Layer 1." (26.png). The PageRank row's clock reads "Ran on 24 nodes; 14 shown
  now" (19.png).

## 3. Keyboard only (s3-keys/, screen-reader lines)

Reached the same end state (111.png): 14 of 24 in the picture, "5 nodes selected". The route: Tab x5 to the
rail, ArrowDown, Enter (Data); Tab x9 to "Add filter" (the Tab walk passes the resize handle into the canvas
first; 22-26); Enter opens the picker with its search focused ("Find an attribute"); ArrowDown x5, Enter on
"trained, 2 values" puts focus on "trained: how to match"; ArrowDown/Enter chooses Yes (live "Filter on: 15 of
24 nodes, 25 edges"); Tab to "Add a condition", Enter, type "hours", Enter.

Focus lines worth noting:

- After the hours condition is added, focus returns to "Add a condition" below it (51.png); its "from" box is
  four Shift+Tabs back, past "hours to", "hours range end", "hours range start" (sliders before the boxes).
  The first card's Enter put focus into the card; this one does not.
- Control+A pressed on the "hours range start" slider (73.png, meant to clear the box) selected the whole
  graph: live "15 nodes, 25 edges selected", every node and edge highlighted, the inspector switched to the
  selection (76.png).
- Enter in "hours from" writes (live "Filter on: 14 of 24 nodes, 22 edges", 76).
- Role card: Enter on "role, 3 values" focuses "volunteer, 16 nodes"; Space on "staff, 5 nodes" gives "Filter on:
  4 of 24 nodes, 2 edges"; the Select / Hide pair is a radio group named "Hide nodes that do not match" and
  "Select"; ArrowLeft to Select: live "Filter on: 14 of 24 nodes, 22 edges", then "5 nodes selected".
- In the picker, letters typed then Tab takes the highlighted option (hours added to the role card, 122.png),
  as decided; Control+Z undoes it ("Undid editing the filter ...").
- F6 from the left panel cycles four regions: "Selection actions" (inspector), the canvas, "Analyze"
  (toolbar), back to the left panel at "Add a condition" -- never the top bar, and the left panel is entered
  at its last focused control, not its first.
- No step left focus on the page body.

## Mismatches between the answer key and the screen

1. The hours condition has no "at least": the operators are Between, Highest, Has a value, Has no value. The
   route is Between with the "from" box set to 10 (the "to" box stays 52).
2. A new card is written with Hide already on, so the first card needs no Select / Hide step; the role card
   has to be switched to Select (with the default Hide it leaves 4 of 24 in the picture).
3. The marked count is 5, not 4: Select selects the staff member the first card hid (trained No).
4. Names: Filters "+" is "Add filter"; the second field is added with "Add a condition", not "+ field"; the
   role card's operator reads "Is any of".

## Defects (route, screenshot)

1. Select marks nodes that another card took out of the picture: "5 nodes selected" with 4 rings showing;
   the Selected layer and the spoken count agree on 5. (success, s1-path/17.png, 20.png; keyboard,
   s3-keys/111.png; other order, s2-detours/16.png)
2. Control+A with focus on a filter card's range slider selects every node and edge in the graph.
   (keyboard, s3-keys/73.png, 76.png)
3. Adding a condition with "Add a condition" leaves focus on that button, below the new condition, instead of
   in it; a keyboard reader Shift+Tabs back four stops past two sliders to reach the "from" box.
   (keyboard, s3-keys/51.png, 59-63)
4. A number box's count does not follow typing: "15 of 24" stays until Enter or Tab, against the settled
   count rule (the count follows each keystroke). (success, s1-path/12.png, 19.png)
5. F6 never reaches the top bar and re-enters the left panel at its last focused control, not its first;
   the settled cycle is top bar, left panel at its first control, canvas, toolbar, inspector.
   (keyboard, s3-keys/124-128)
6. Selecting from the find box zooms and moves the drawing with no request. (find detour, s2-detours/04.png)
7. Opening the table shrinks and moves the drawing to fit. (success, s1-path/22.png)
8. The find box reads a rule but has no way to combine two conditions and no door from a rule to Filters;
   "trained and hours 10 or more" and "trained = yes and hours >= 10" both end in "No match". (find detour,
   s2-detours/02.png, 05.png)
9. A style layer that hides nodes leaves their edges drawn with no ends and the hidden selected nodes drawn as
   flat yellow discs; the key then reads "Show: Layer 1" for a layer that hides. (style detour,
   s2-detours/25.png)
10. A yes/no condition starts empty in a filter card but already at Yes in a Style layer's Which nodes.
    (success s1-path/05.png; style detour s2-detours/22.png)
11. Fields shows a Coordinates row set to the `phone` column that the reader never set. (success,
    s1-path/02.png)
12. The Select segment has no tooltip, and its accessible name "Select" does not say what it selects,
    while Hide's says "Hide nodes that do not match". (success, s1-path/16.png; keyboard, s3-keys/111)
13. The undo notice reads "Undid changing node show on Layer 1." (style detour, s2-detours/26.png)
