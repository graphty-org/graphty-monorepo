# T63B pilot (targeted re-walk) -- gauges + flows, "where and when"

Build 037e96e9bb (frozen, `/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d1-037e96e9bb`).
Every walk starts from the task's real start (setup `gauges-joined.txt`). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T63B/ (not in git).

## Verdict

Reached on every walk, by pointer and by keyboard. The time ends designated as `installed`
(Fields: Time = installed; the table's `installed` header carries a "Time" chip); the place stays
Latitude `lat`, Longitude `lon` as designated at load. The data stays the task's own data the whole
way (11 gauges G01-G11 plus G12 from flows.csv, 12 nodes, 14 edges; no value changed).

The one change from the earlier build that every earlier route hit: a text-kind column now draws its
cells as written, whatever its role. Once `installed` is the time, its cells read `1998-05-12`
(they read "May 12, 1998" before). This is the decided behavior "a column's kind alone draws its
cells", not a defect; the header keeps the text glyph and the "Time" chip, and the Timeline still
reads the values as dates ("Jun 30, 1995 - Jun 27, 2018", detours/14.png).

## Routes walked

- **success** (pointer; the inspector's "Set in Data", then Fields > Time list): replayed to step 4,
  then by hand. "Set in Data" sets Time = installed at once; the "Time: installed" row leaves the
  Overview; Fields shows Time = installed, Latitude = lat, Longitude = lon (success/05.png). In the
  Time list: Escape closes it and keeps `installed` (07.png); Enter reopens it with `installed`
  checked (08.png); ArrowDown then Escape keeps `installed` (09.png); Enter then Tab commits and moves
  on (10-12.png).
- **success-direct** (pointer; "Set in Data" with nothing else first): the time is set, gauges.csv
  stays collapsed in Fields (02.png). Expanding it and opening the Latitude list shows `lat` checked
  (03.png); Enter keeps it; Escape; the Undo tooltip reads "Undo changing a column's role Ctrl+Z"
  (04.png).
- **success-2, success-3** (pointer, longer: Time list keys, a sort, Latitude changed to another
  column and undone): replayed on this build; every check point matched once the date-only row
  changes were allowed; ends with Time = installed, Latitude = lat (success-2/19.png).
- **detours** (by hand after step 5): table header `installed` > Role > Time sets the time
  (detours/06.png); Control+Z undoes it with "Undid changing a column's role." and the "Time:
  installed / Set in Data" row returns to the Overview (07.png); Layout > Map shows Location
  "lat, lon" (08.png); Escape closes it; Data > Fields > gauges.csv "+" > Time opens an empty Time
  row with its list (10-11.png); Escape, then Enter and `installed` set it (13.png); Timeline opens
  over 1995-2018 (14.png); search "installed" offers "Select the 11 nodes (installed: has a value)"
  (16.png); search "time" finds nothing and suggests a rule (17.png); right-click on G02 selects it
  and the inspector lists `installed 2003-07-01` (19.png); the `lat` header's Role submenu shows
  Latitude checked (22.png).
- **detours-2, detours-3** (the same detours, longer): replayed to the end, every check point
  matched with the date-only row changes allowed.
- **keyboard** (keys only; replayed to step 37, then by hand): Enter on "Set in Data" sets the time;
  the button goes and focus moves to "About Direction" (keyboard/39.png), never to the page body.
  Shift+Tab reaches "Expand gauges.csv"; the Fields rows read "Rows are", "Add to node fields", "Id",
  "Node time" value "installed", "Remove node time", "Node latitude column" value "lat", "Remove
  node latitude", "Node longitude column" value "lon", "Remove node longitude". Control+Z announces
  "Undid setting the time field."; "+" > Time > ArrowDown > Enter sets it again (45.png).
- **keyboard-2, keyboard-3** (the same with a Label row added and Escaped): replayed to the end,
  every check point matched.
- **keyboard-f6**: matched in full earlier on this build; its earlier findings stand.

## Defects (none blocks the task or spoils its grading)

1. The table marks the place only after the reader re-picks it. At the start `lat` and `lon` show
   no Latitude / Longitude chip in the table, though Fields and the header's Role menu say they are
   the place; after the reader opens the Latitude list in Fields and presses Enter on the same `lat`,
   both headers gain "Latitude" and "Longitude" chips (success-direct/03.png against 04.png).
   A participant who checks the table first sees the time marked and the place not.
2. "Set in Data" sets the time with nothing announced and Fields left closed (success-direct/02.png,
   keyboard/39.png); a keyboard or screen-reader user hears only focus landing on "About Direction".
   The answer key already records this behavior.
3. Layout > Map's Location button ("lat, lon") does nothing when clicked (detours/08.png against
   09.png).
4. Keyboard, in the Fields Time list: Tab with the list open leaves it open and focus where it was
   (still "expanded"); on a freshly added empty "Node time" row Enter does not open the list, and
   Space after ArrowDown closes the row's editing with focus back on "Add to node fields" (keyboard
   route steps after 45.png, same as the earlier build).
