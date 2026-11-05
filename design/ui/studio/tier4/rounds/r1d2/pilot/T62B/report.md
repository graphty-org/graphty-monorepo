# Pilot: T62 B (gauges.csv, "put in" days read as words) -- re-walk after a fix pass

Build: bccf8fe47f (frozen, `.study-builds/tier4-r1d2-bccf8fe47f`). Start: `setup:gauges.txt`
(gauges.csv open on its own, Data place showing, the table open).
Screenshots are under `/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T62B/`
(abbreviated below as `T62B/`).

Result: **reached** by pointer and by keyboard. With `installed` set to the date type (calendar
glyph on its header) and sorted newest first, the top row is G10 Birch Hollow, Jun 27, 2018. The
data stayed the task's own the whole way: 11 gauges, every value as in gauges.csv.

## Which walks ran

Every route was walked again on this build, each in its own session, by replaying the previous
walk of the same route on this build (every session ended):

- `T62B/v1-pointer` (success path by pointer): all 9 steps matched.
- `T62B/v2-detours` (the detour set of the first round): all 15 steps matched.
- `T62B/v3-keys` (success path by keyboard, screen-reader mode): all 65 steps matched.
- `T62B/v4-fields-keys` (Fields' Time by keyboard, with Enter, Tab and Escape in the combobox):
  all 39 steps matched.

The key screens were looked at again (v1-pointer 08.png, 10.png; v2-detours 11.png; v3-keys
66.png; v4-fields-keys 40.png). None of the routes on this pass's fix list belongs to T62 B (they
are T61, T65, T66, T67 and T68 routes), so no other route was walked for this task.

## Route 1: success path by pointer (`T62B/v1-pointer/`)

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

## Route 2: detours (`T62B/v2-detours/`, the same set as the first round)

- **Fields "+" > Time > installed** (04.png-06.png): sets the Time role only; header keeps `Aa`,
  cells stay ISO text, caption "In the order loaded". A participant who stops here sees the column
  is still text (graded P).
- **Source row and its menu** (08.png, 09.png): Replace with file..., Select nodes, Export...
  Ctrl+E, Rename F2, Remove. Nothing sets a kind.
- **Issues chip "3"** (11.png): depth_cm "1 not a number", station "1 value with padded spaces",
  telemetry "11 values could be yes/no". Nothing for `installed`.
- **Quick actions** (13.png-16.png): "installed" and "date" both give "No results"; Enter does
  nothing; Escape closes and leaves focus on the Quick actions button.

## Route 3: success path by keyboard

`T62B/v3-keys/` matched to the end (the first round's report gives its account: the header menu
opens from the focused header with Shift+F10, ContextMenu or Alt+ArrowDown; Type > date; sort).
`T62B/v4-fields-keys/` (Fields' Time by keyboard) matched all 39 steps: Enter takes `lat` as the
time; ArrowDown opens the list; ArrowUp wraps to telemetry; Enter there is refused with the polite
notice "telemetry has no times" and the value stays lat; Tab goes to "Remove node time", Shift+Tab
back; Escape on the closed combobox does nothing; ArrowDown, ArrowDown, Enter takes `installed`
(39.png). Focus never fell to the page body.

## Mismatches with the answer key

None. The key already records that B's right-click on the header does nothing, that the first click
on "Options for installed" only scrolls, and that after Set in Data the ISO cells stay text with an
"A to Z" sort (v1-pointer 04.png-08.png).

## Defects

Nothing on these routes crashes, blocks the task or spoils its grading. Still present, as before:

1. Clicking "Options for installed" while it sits past the table's right edge scrolls it into view
   but opens no menu; a second click does (v1-pointer 06.png, 08.png).
2. Right-click on a column header does nothing (v1-pointer 05.png).
3. No issue and no Data-place control offers to read an all-ISO-date column as dates
   (v2-detours 11.png), and Quick actions finds nothing for "date" (v2-detours 14.png).

## Skipped

- The fix-list routes, which all belong to other tasks.
- No route of this task was skipped; every session was ended.

## Targeted re-walk on a53beb7179 (not completed)

A re-walk of this task's success path, its detours and keyboard walk, and every route the fix pass
touched (T65A, T65B, T66A/B, T68A/B, T61A, T61B and T67A/B) was queued on the frozen build
(`.study-builds/tier4-r1d3-a53beb7179`), each in its own replay session under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T62B/q00-* to q19-*
(list in q-list.txt). Every replay was still waiting for a free browser slot when this pass had to
report, so none of these routes was walked here and nothing new is recorded. The last completed walk
of this task on the same build is in rounds/r1d3/pilot/T62B/report.md (reached, no mismatches).
