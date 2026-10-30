# Pilot: T63 A (pantries + deliveries), where and when -- targeted re-pilot

Build: ff17391bb1 (`.study-builds/tier4-r1d2-ff17391bb1`). Start: `pantries-joined.txt` (13 nodes,
18 edges, two sources). Walked by clicks and keys only, never by URL. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T63A/

## Routes walked

None of the routes the fixes touched belongs to T63 A (they are T64, T65 and T68 routes), so this
pass walked only the success path by pointer. It replayed the previous pass's success walk on the
new build; every one of its 8 steps matched the recorded screen and the session ended.

## Result

Reached. The time is designated as `opened`; latitude `lat` and longitude `lon` are designated at
load and read in Data > Fields > pantries.csv. The data stayed the pantries data the whole way (13
nodes, 18 edges in the overview, P01 to P10 visible in the table with their own sites and days).

## 1. Success path, pointer (`success/`)

- 01: the start (the tool printed "the drawing is still moving" right after the setup).
- 02: hover "Set in Data" (inspector Values, "Time: opened"): no tooltip.
- 03: click. The `opened` header gains a "Time" chip, keeps its text glyph and its ISO cells
  ("2015-03-02"); the clock joins the canvas toolbar; the "Time: opened" row leaves the inspector.
  Fields does not open.
- 04: Expand pantries.csv: Time = opened, Latitude = lat, Longitude = lon.
- 05-09: the Time list: Escape closes it and keeps opened; Enter reopens it; Tab with nothing typed
  leaves it open; Escape closes it, opened kept (09).

## Mismatch with the answer key

- None. The answer key's path note ("sets Time = opened in place: Fields does not open, nothing is
  announced, and the Time: opened row leaves the Overview") matches success/03.png.

## Defects (none blocks the task or spoils its grading; all unchanged from the previous pass)

1. "Set in Data" acts in place: Fields does not open, no tooltip, no notice (decided R10 says it
   opens Fields with the Time row added) (success/02.png, success/03.png).
2. Tab in an open Time list with nothing typed leaves the list open (decided: Tab closes the list
   and takes nothing) (success/08.png).
3. The session starts with "the drawing is still moving" after the setup (success/01.png).

## Skipped

- The detours walk and the keyboard walk: this targeted pass walks only the success path and the
  listed routes, and none of the listed routes is a T63 A route.
- Every listed route (T64A/T64B, T65A/T65B, T68A/T68B): they belong to other tasks' pilots.
