# Pilot: T62 B (gauges.csv, "put in" days read as words) -- re-walk after a fix pass

Build: 037e96e9bb (frozen, `.study-builds/tier4-r1d1-037e96e9bb`). Start: `setup:gauges.txt`
(gauges.csv open on its own, Data place showing, the table open).
Screenshots are under `/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T62B/`
(abbreviated below as `T62B/`).

Result: **reached** by pointer and by keyboard. The `installed` column reads as a date (calendar
glyph on its header), sorted newest first; the top row is G10 Birch Hollow, Jun 27, 2018. The data
stayed the task's own the whole way: 11 gauges, every value as in gauges.csv.

## Which walks ran

The earlier pass's four walks were replayed on this build first:

- `w3-keys` (the keyboard success path, screen-reader mode) matched every check point to the end, so
  its findings stand: Shift+F10 on the `installed` header opens the menu, Type > date, Enter twice
  sorts newest first, and Birch Hollow is read in the top row.
- `w1-pointer`, `w2-detours` and `w4-fields-keys` diverged where the fix pass changed the screen.
  Each was replayed again to that point and carried on by hand (below).
- One new walk, `w5-clean-pointer`, takes the success path by pointer straight from the start with
  no detour first, to count its steps on this build.

Of the routes the fix pass touched, two belong to this task: "T62B detours: Set in Data, Fields" and
"the success path (Type > date)". Both were walked. The rest of the list belongs to other tasks.

## Route 1: success path by pointer

`T62B/w5-clean-pointer/` (clean, from the start):

1. 02.png: the table scrolled right. `installed` shows `Aa` and ISO text (1998-05-12).
2. 03.png-04.png: hovering the header shows the "..." button and the tooltip "100% filled
   11 unique". Clicking "Options for installed" opens the menu.
3. 05.png: Type > date. The header now shows the calendar glyph and the cells read "May 12, 1998".
4. 06.png, 07.png: the first header click gives "oldest first" and the second gives "Sorted by
   installed, newest first". The top row is Birch Hollow, Jun 27, 2018.

Path steps: open the header menu, Type, date, header click, header click = 5, as the key says.

`T62B/w1-pointer/` (the earlier route, which tries Set in Data first):

1. 03.png: the inspector's "Set in Data" sets the Time role. The header gets a "Time" chip but keeps
   `Aa`, and its cells **stay ISO text** (1998-05-12). On the earlier build they turned into
   "May 12, 1998". The fields list's Time row reads `installed`.
2. 04.png: a header click gives "Sorted by installed, A to Z". The caption now says the column is
   still sorted as text.
3. 05.png: right-clicking the header does nothing (as before).
4. 06.png: clicking "Options for installed" by name while its button lay past the table's right
   edge scrolled the table to it, but no menu opened. 07.png: a second click on the now-visible
   button opened the menu. 11.png: with the button already on screen, one click opens the menu.
5. 08.png, 09.png: Type shows text (checked), number and yes/no ("11 will not convert"), date and
   category. Choosing date gives the calendar glyph, dates in the cells and "oldest first".
6. 10.png: a header click gives "newest first", with Birch Hollow, Jun 27, 2018 on top.

## Route 2: detours (the same set as the earlier report)

`T62B/w2-detours/`:

- **Fields "+" > Time** (04.png-06.png): the column list now shows `installed` with the `Aa` glyph,
  the same as the table header. Before the fix it showed a calendar. Choosing it sets the Time role.
  The header gets the Time chip and keeps `Aa`, and the cells stay ISO text. A participant who stops
  here can now see that the column is still read as text, and the grade stays P as the key says.
  Undo names the act: "Undo setting the time field Ctrl+Z" (07.png).
- **Source row and its menu** (08.png, 09.png): unchanged. The menu holds Replace with file...,
  Select nodes, Export... Ctrl+E, Rename F2 and Remove. Nothing there sets a kind of value.
- **Issues chip "3"** (11.png): unchanged. It lists depth_cm "1 not a number", station "1 value with
  padded spaces" and telemetry "11 values could be yes/no". Nothing is listed for `installed`.
- **Quick actions** (13.png-16.png): "installed" and "date" both give "No results". Enter does
  nothing and Escape closes it.

`T62B/w4-fields-keys/` (the Fields detour by keyboard, screen-reader mode):

- Steps 1-28 matched the earlier walk. At step 29, Enter takes "lat" as the Time (30.png). On the
  earlier build the `lat` cells then switched to 3 decimals. Now they stay at 2, the same as before
  the role was set: a number column reads the same whatever its role. The Unit row shows "Number".
- Carrying on: ArrowDown opens the list with the chosen column (lat) first and checked. ArrowUp
  wraps to the last option, telemetry (32.png). Enter on telemetry is refused with the polite notice
  "telemetry has no times", and the value stays lat (33.png). Tab moves to "Remove node time" and
  Shift+Tab comes back. Escape on the closed combobox does nothing. ArrowDown, ArrowDown, Enter
  takes `installed` (36.png). Focus never fell to the page body.

## Route 3: success path by keyboard

`T62B/w3-keys/` matched every check point of the earlier walk on this build. The earlier report's
keyboard account and its focus findings stand unchanged.

## Mismatches with the answer key

- The key gives "right-click on the header" as one way to open the header menu. A right-click on
  the `installed` header does nothing (w1-pointer 05.png).
- The key says "On 0ffeae2ef5 ... the header keeps Aa, yet the cells draw as dates". On this build
  the Set in Data and Fields routes leave the cells as ISO text, and the sort caption reads "A to Z".
  The P grading still holds, but the key's description of the screen is out of date.

## Defects

Nothing on these routes crashes, blocks the task or spoils its grading.

1. Clicking "Options for installed" while it sits past the table's right edge scrolls it into view
   but opens no menu; a second click does (w1-pointer 06.png, 07.png). How a person would meet it:
   at 1440 px the `installed` column's button starts outside the visible part of the table.
2. Right-click on a column header still does nothing (w1-pointer 05.png).
3. Still present from the earlier pass: no Data-place control and no issue offers to read an
   all-ISO-date column as dates (w2-detours 11.png), and Quick actions finds nothing for "date"
   (w2-detours 14.png).

## Skipped

- The routes on the fix list that belong to other tasks (T60, T61, T63-T68, and T62A's own
  starts). They are walked by those tasks' pilots.
- No route of this task was skipped, and every session was ended.
