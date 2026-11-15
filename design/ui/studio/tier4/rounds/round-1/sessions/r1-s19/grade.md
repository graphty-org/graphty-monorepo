Grade: S
False done: 0
Wrong turns: 2
Steps: 11 (path steps: 3 -- the opened header's Options > Role > Time; success state reached at step 4)
Model: opus (claude-opus-5-5 throughout the transcript; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 27 calls checked over 1 transcript)

# r1-s19 -- T63 A, Dana (returning user), build 79ed770292

## Result

The last screenshot (12.png) shows the joined pantries network on the Data place with the Layout
list open over the canvas. The Nodes table's `opened` header carries the calendar glyph and a green
"Time" chip, its cells read as dates (Jun 14, 2017 ... Mar 8, 2023) and the caption reads "Sorted by
opened, oldest first". `lat` and `lon` carry the "#" glyph and no chip. `data.json` agrees on the
time: `knownFields.nodeTimePath` is `opened`, and the `opened` column has role `time` and type
`time`.

The participant's report names `lat` (Latitude) and `lon` (Longitude) for where each site is, and
says the program had set both itself, which she checked in each column's Role menu (06.png, 07.png).
It names `opened` for when, set to Time by her. The time is designated as `opened` and the report
names both place columns and the time column, so every part of the success definition holds: S.

The participant also changed `opened`'s Type from text to date (steps 7 and 8). The key does not
ask for it, and it is the right kind for the column, so it is not "a column changed to the wrong
kind" and not a wrong turn.

Also reported (not graded): she did not open Data > Fields to check the place. She checked it in the
table's Role menus instead.

## Route against the success path

The path is the table's `opened` header menu > Role > Time (3 steps). The participant took:

1. Clicked the `opened` header (02.png). This sorted the table and showed the header's "..." button.
   It led straight to step 2, so it counts as on the way.
2. "Options for opened" (03.png): the menu with Type, Role, Rename, Hide.
3. Role (04.png): the submenu ticks None, while the inspector reads "Time: opened / Set in Data".
4. Time (05.png): the "Time" chip appears on the header and the inspector's Time row goes away.
   **Success state reached.**
5. "Options for lat" > Role (06.png): Latitude is ticked. Closed with nothing picked. This was a
   check of the place, and the report needed it, so it is not counted as a wrong turn.
6. Escape, "Options for lon" > Role (07.png): Longitude is ticked. A check, as in step 5.
7. Escape, "Options for opened" > Type (08.png): text is ticked.
8. date (09.png): the calendar glyph appears and the cells read as dates.
9. Wheel down the table (10.png): P13 has no lat, lon or opened, because it comes only from
   deliveries.csv. She read this and reported it correctly.
10. The "3D" view menu, looking for a map (11.png): 2D, 3D, VR and camera angles. Abandoned:
    **wrong turn 1**.
11. Escape, Layout (12.png): the layout list. Abandoned without a pick: **wrong turn 2**.

She called it done after step 11. The screen and `data.json` both show the time set, and her report
of the place columns matches the Role menus she saw. No false done.

## Problems

1. **The time shows two states at once** -- severity 2, build-defect. On the joined network, the
   inspector's Overview reads "Time: opened" with a "Set in Data" button, while the `opened`
   header's Role menu ticks None (04.png). The participant could not tell whether the time was set
   or only suggested ("Which one do I believe?"), and set it herself. Repro:
   `repro/r1-s19.sh`, 02.png (the same two states on a fresh start).
2. **The place roles are not marked on the table headers** -- severity 2, build-defect. `lat` and
   `lon` are ticked Latitude and Longitude in their Role menus (06.png, 07.png), but their headers
   carry no chip, while `opened` gets a "Time" chip once its role is set (05.png). The only way to
   see the place roles from the table is to open each menu. A participant who does not do that
   would not know the place is set, and T63 asks them to say so. The `data.json` record also lists
   `roles: []` for `lat` and `lon`, and `knownFields` has no place entry, so the place designation
   is not visible in the end-state record either. Repro: `repro/r1-s19.sh`, 03.png (Latitude
   ticked, header plain) and 04.png (`opened` with its "Time" chip, `lat` and `lon` plain).
3. **Setting Role to Time leaves the column read as text** -- severity 2, behavior. After Role >
   Time the header keeps the `Aa` glyph and the cells stay ISO text (05.png), and nothing says
   whether the time works on a text column. The participant had to find Type > date separately
   (08.png, 09.png). This is recorded in the answer key under T62 and seen here again.
4. **The Role submenu highlights None when it opens** -- severity 1, behavior. On `lat` the
   highlight sits on None while the tick is on Latitude (06.png; repro 03.png), which reads as if
   None is the current value.
5. **The column's settings button shows only after a header click or hover** -- severity 1,
   opinion. The "..." is not on the `opened` header at rest (01.png). It appeared only after the
   header click sorted the table (02.png).
6. **No way to check locations on a map was found** -- severity 1, opinion. She looked in the 3D
   menu and the Layout list for a map (11.png, 12.png). The list's visible items are algorithm
   names ("Gephi word salad" in her words), and she gave up before scrolling. This was outside the
   task, so it was not graded.
7. **The joined source's name is cut to "d.."** -- severity 1, wording. This is on the Sources row
   in every screenshot (01.png to 12.png).
