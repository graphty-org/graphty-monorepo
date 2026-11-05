# T63B pilot (targeted re-walk) -- gauges + flows, "where and when"

Build ff17391bb1 (frozen, /home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d2-ff17391bb1).
Every walk starts from the task's real start (setup `gauges-joined.txt`) and drives the app only
by clicks and keys. Screenshots are plain paths under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T63B/ (not in git).

## Verdict

Reached by pointer and by keyboard. Of the routes the fix pass touched, only "T63A/T63B success
path" belongs to this task, and it is this task's success path. The time ends designated as
`installed` (Fields: Time = installed; the table's `installed` header carries a "Time" chip); the
place stays Latitude `lat`, Longitude `lon` as designated at load. The data stays the task's own
the whole way: 12 nodes, 14 edges, G01-G12, no value changed. Nothing crashes, blocks the task or
would spoil its grading.

## Routes walked on this build

Each route replayed in its own session from its newest earlier walk, matched at every check point
to the end and was ended (exit 0). Every screenshot where something changes was looked at.

- p6-success (pointer, 11 steps; "T63A/T63B success path"): the inspector's "Set in Data" sets
  Time = installed in place (02.png against 05.png); Fields shows Time = installed, Latitude = lat,
  Longitude = lon; in the Time list Escape keeps `installed`, Enter reopens it, ArrowDown then
  Escape keeps it, Enter then Tab moves on (12.png).
- p6-success-direct (pointer, 3 steps): "Set in Data" first, then the Latitude list re-picked;
  Undo tooltip "Undo changing a column's role" (04.png).
- p6-success-2, p6-success-3 (pointer, 18 steps each): sort by `installed`, Time list keys,
  Latitude changed to `lon` and undone with Control+Z ("Undid changing a column's role.");
  ends Time = installed, Latitude = lat (19.png).
- p6-detours, p6-detours-3 (31 steps each): table header `installed` > Role > Time (06.png);
  Control+Z undoes it (07.png); Layout > Map shows "Location lat, lon" (12.png, 13.png); Fields
  "+" > Time on an empty row (17.png); Timeline over "Jun 30, 1995 - Jun 27, 2018, 12 nodes, 14
  edges" (21.png); search "time" finds nothing and suggests a rule (25.png); right-click and click
  on nodes show the node's own values (27.png, 28.png); the `lat` header's Role submenu shows
  Latitude checked (31.png).
- p6-keyboard, p6-keyboard-3 (keys only, 93 steps each): Tab walk to "Set in Data", Enter sets
  the time, focus to "About Direction" (39.png); Shift+Tab back to Fields; Time list keys;
  Control+Z announces "Undid setting the time field." (77.png); "+" > Time re-added and set;
  a Label row added and Escaped; ends Time = installed, Latitude = lat, Longitude = lon (94.png).
  Focus never fell to the page body.
- p6-keyboard-f6 (6 steps): F6 cycles the left panel ("flows.csv 13 of 15 rows joined"), the inspector ("From 2 files"), the canvas ("Graph drawing"), the toolbar ("Analyze"), the table pane (on its "Resize table" handle) and back to the left panel; no step lands on the page body.

## Mismatches between the answer key and the screen

None. "Set in Data" sets Time = installed in place, Fields does not open, nothing is announced and
the "Time: installed" row leaves the Overview, as the key says (p6-success/02.png against 05.png).
The table marks only `installed` ("Time" chip), and Layout > Map shows "Location lat, lon" on a
button that does nothing, both as the key records.

## Defects (none blocks the task or spoils its grading)

1. The table marks the place only after the reader re-picks it: `lat` and `lon` carry no Latitude /
   Longitude chip while `installed` carries "Time", though Fields says they are the place
   (p6-success/12.png). After the Latitude list is opened and Enter pressed on the same `lat`, both
   headers gain chips (p6-success-direct/04.png), and that no-op re-pick is put on the Undo stack
   ("Undo changing a column's role"). After Latitude is changed and undone the chips are gone again
   (p6-success-2/19.png).
2. "Set in Data" sets the time with nothing announced and Fields left closed; a keyboard or
   screen-reader user hears only focus landing on "About Direction" (p6-keyboard/39.png). The
   answer key records this behavior.
3. Layout > Map's Location button ("lat, lon") does nothing when clicked (p6-detours/12.png against
   13.png). The Map options popover also opens with its top cut off above the window (its first
   line reads only "the graph.", 12.png).
4. Keyboard, Fields "Node time" list: Tab with the list open and nothing typed leaves the list open
   with focus where it was ("expanded"; p6-keyboard/71.png, p6-success-2/12.png), where the decided
   behavior is that Tab closes the list and takes nothing.
5. Keyboard, a freshly added "Node time" row: its list opens at once but the combobox announces
   "collapsed" (p6-keyboard/83.png, 84.png); after ArrowDown highlights `installed` (still announced
   "collapsed", 85.png), Space removes the empty row and puts focus on "Add to node fields" instead
   of choosing the option (86.png). Enter after ArrowDown does choose it (p6-keyboard/91.png).
6. Latitude and Longitude can both be set to the same column (`lon`) with nothing said
   (p6-success-2/18.png); Control+Z puts it back.
