# Pilot: T62 B (gauges.csv, "put in" days read as words) -- re-walk after a fix pass

Build: ff17391bb1 (frozen, `.study-builds/tier4-r1d2-ff17391bb1`). Start: `setup:gauges.txt`
(gauges.csv open on its own, Data place showing, the table open).
Screenshots are under `/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T62B/`
(abbreviated below as `T62B/`).

Result: **reached** by pointer and by keyboard. With `installed` set to the date type (calendar
glyph on its header) and sorted newest first, the top row is G10 Birch Hollow, Jun 27, 2018. The
data stayed the task's own the whole way: 11 gauges, every value as in gauges.csv.

## Which walks ran

The first round's four walks were replayed on this build:

- `w3-keys` (the keyboard success path, screen-reader mode) matched every check point to the end;
  its findings stand.
- `w1-pointer`, `w2-detours` and `w4-fields-keys` diverged, each where a text-kind column now stays
  drawn as text after it gets the Time role (the cells keep ISO text "1998-05-12"; a number column
  keeps its 2 decimals). That is the settled rule that a column's kind is drawn one way whatever
  its role. Each was replayed again to that point and carried on by hand.

None of the routes on the fix list belongs to T62 B (they are T64, T65 and T68 routes), so no other
route was walked for this task.

## Route 1: success path by pointer (`T62B/w1-pointer/`)

1. 03.png: the inspector's "Set in Data" sets the Time role. The header gets a "Time" chip and
   keeps `Aa`; the cells stay ISO text. Fields' Time row reads `installed`.
2. 04.png: a header click gives "Sorted by installed, A to Z" (text sort).
3. 05.png: right-clicking the header does nothing.
4. 06.png: clicking "Options for installed" while its button lies past the table's right edge only
   scrolls the table to it; no menu opens. 08.png: a second click opens the menu; Type shows text
   (checked), number and yes/no ("11 will not convert"), date, category.
5. 09.png: date. Calendar glyph on the header, cells "Jun 30, 1995" etc., caption "Sorted by
   installed, oldest first" (the sort carried over from step 2).
6. 10.png: one header click gives "newest first"; top row Birch Hollow, Jun 27, 2018.

## Route 2: detours (`T62B/w2-detours/`, the same set as the first round)

- **Fields "+" > Time > installed** (04.png-06.png): sets the Time role only; header keeps `Aa`,
  cells stay ISO text, caption "In the order loaded". Undo names it: "Undo setting the time field
  Ctrl+Z" (07.png). A participant who stops here sees the column is still text (graded P).
- **Source row and its menu** (08.png, 09.png): unchanged. Replace with file..., Select nodes,
  Export... Ctrl+E, Rename F2, Remove. Nothing sets a kind.
- **Issues chip "3"** (11.png): unchanged. depth_cm "1 not a number", station "1 value with padded
  spaces", telemetry "11 values could be yes/no". Nothing for `installed`.
- **Quick actions** (13.png-16.png): "installed" and "date" both give "No results"; Enter does
  nothing; Escape closes and leaves focus on the Quick actions button.

## Route 3: success path by keyboard

`w3-keys` matched to the end (see the first round's report for its account).
`T62B/w4-fields-keys/` (Fields' Time by keyboard): steps 1-28 matched. Enter takes `lat` as the time
(30.png; a Unit row "Number" appears, the lat cells keep 2 decimals). ArrowDown opens the list with
lat highlighted; ArrowUp wraps to telemetry; Enter is refused with the polite notice "telemetry has
no times" and the value stays lat. Tab goes to "Remove node time", Shift+Tab back; Escape on the
closed combobox does nothing. ArrowDown, ArrowDown, Enter takes `installed` (39.png); Tab goes to
"Remove node time". Focus never fell to the page body.

## Mismatches with the answer key

- The key gives "right-click on the header" as one way to open the header menu. It does nothing
  (w1-pointer 05.png).
- The key says, for the Set in Data and Fields routes on this build, the ISO cells stay text with a
  header click sorting "A to Z": confirmed (w1-pointer 04.png). No mismatch there.

## Defects

Nothing on these routes crashes, blocks the task or spoils its grading.

1. Clicking "Options for installed" while it sits past the table's right edge scrolls it into view
   but opens no menu; a second click does (w1-pointer 06.png, 08.png).
2. Right-click on a column header does nothing (w1-pointer 05.png).
3. Still present: no issue and no Data-place control offers to read an all-ISO-date column as
   dates (w2-detours 11.png), and Quick actions finds nothing for "date" (w2-detours 14.png).

## Skipped

- The fix-list routes, which all belong to other tasks (T64A/B, T65A/B, T68A/B).
- No route of this task was skipped; every session was ended.
