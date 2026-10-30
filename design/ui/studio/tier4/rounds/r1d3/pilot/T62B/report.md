# Pilot: T62 B (gauges.csv, "put in" days read as words) -- re-walk after a fix pass

Build: a53beb7179 (frozen, `.study-builds/tier4-r1d3-a53beb7179`). Start: `setup:gauges.txt`
(gauges.csv open on its own, Data place showing, the table open).
Screenshots are under `/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T62B/`
(abbreviated below as `T62B/`).

Result: **reached** by pointer and by keyboard. With `installed` set to the date type (calendar
glyph on its header) and sorted newest first, the top row is G10 Birch Hollow, Jun 27, 2018. The
data stayed the task's own the whole way: 11 gauges, every value as in gauges.csv (the table shows
lat and lon to two decimals, as on the earlier builds; the file holds four).

## Which walks ran

Each route was replayed on this build from the previous pass's walk of the same route, each in its
own session, and every session was ended:

- `T62B/w1-pointer` (success path by pointer): all 9 steps matched.
- `T62B/w2-detours` (the detour set of the first round): all 15 steps matched.
- `T62B/w3-keys` (success path by keyboard, screen-reader mode): all 65 steps matched.
- `T62B/w4-fields-keys` (Fields' Time by keyboard, with Enter, Tab and Escape in the combobox):
  all 39 steps matched.

The first round's walks diverged on this build only where the first round's build drew a text
column with the Time role as dates ("May 12, 1998") and showed lat to three decimals; this build
keeps such a column as ISO text under a "Time" chip, as the binding decisions require ("A column's
kind is drawn one way everywhere"). The previous pass's walks, recorded after that decision, match
this build step for step.

All four routes were replayed a second time on the same build, each in its own new session that
was ended: `T62B/x-w1-pointer` (9 of 9 steps matched), `T62B/x-w2-detours` (15 of 15),
`T62B/x-w3-keys` (65 of 65) and `T62B/x-w4-fields-keys` (39 of 39). x-w1-pointer 10.png and
x-w3-keys 66.png show the same end state: calendar glyph on `installed`, "Sorted by installed,
newest first", Birch Hollow, Jun 27, 2018 on top.

The routes this fix pass touched (the condition cards' counts and their Undo and Redo, a style
layer's Which nodes, the Data source card's count, the narrowed Hide card's count, the table's role
re-run and Analyze's weight) all belong to other tasks (T64, T65, T66 and T68), which start from
other files (volunteers.graphml, pantries, gauges + flows). None starts from gauges.csv on its own or
is a route of T62 B, so none was walked here.

Key screens looked at: w1-pointer 03.png, 08.png, 10.png; w2-detours 11.png; w3-keys 66.png;
w4-fields-keys 40.png.

## Route 1: success path by pointer (`T62B/w1-pointer/`)

1. 03.png: the inspector's "Set in Data" sets the Time role. The header gets a "Time" chip and
   keeps `Aa`; the cells stay ISO text. Fields' Time row reads `installed`.
2. 04.png: a header click gives "Sorted by installed, A to Z" (text sort).
3. 05.png: right-clicking the header does nothing.
4. 06.png: clicking "Options for installed" while its button lies past the table's right edge only
   scrolls the table to it; no menu opens. 08.png: a second click opens the menu; Type shows text
   (checked), number and yes/no ("11 will not convert"), date, category.
5. 09.png: date. Calendar glyph on the header, cells "Jun 30, 1995" etc.
6. 10.png: one header click gives "Sorted by installed, newest first"; top row Birch Hollow,
   Jun 27, 2018.

## Route 2: detours (`T62B/w2-detours/`)

- **Fields "+" > Time > installed** (04.png-06.png): sets the Time role only; header keeps `Aa`,
  cells stay ISO text. A participant who stops here sees the column is still text (graded P).
- **Source row and its menu** (08.png, 09.png): nothing there sets a column's kind.
- **Issues chip "3"** (11.png): depth_cm "1 not a number", station "1 value with padded spaces",
  telemetry "11 values could be yes/no". Nothing for `installed`.
- **Quick actions** (13.png-16.png): "installed" and "date" both give "No results"; Enter does
  nothing; Escape closes it.

## Route 3: success path by keyboard

`T62B/w3-keys/` matched to the end: the header menu opens from the focused header with the menu
key; Type > date; sort; 66.png shows the calendar glyph and Birch Hollow, Jun 27, 2018 on top under
"newest first". `T62B/w4-fields-keys/` matched all 39 steps: Enter, Tab, Shift+Tab and Escape in
Fields' Time combobox behave as the previous pass recorded, and ArrowDown, ArrowDown, Enter takes
`installed` (39.png, 40.png). Focus never fell to the page body.

## Mismatches with the answer key

None.

## Defects

Nothing on these routes crashes, blocks the task or spoils its grading. Still present, as before:

1. Clicking "Options for installed" while it sits past the table's right edge scrolls it into view
   but opens no menu; a second click does (w1-pointer 06.png, 08.png).
2. Right-click on a column header does nothing (w1-pointer 05.png).
3. No issue and no Data-place control offers to read an all-ISO-date column as dates
   (w2-detours 11.png), and Quick actions finds nothing for "date" (w2-detours 14.png).

## Skipped

- The fix-pass routes, which all belong to other tasks.
- No route of this task was skipped.
