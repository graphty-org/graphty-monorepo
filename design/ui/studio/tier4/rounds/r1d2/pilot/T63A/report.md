# Pilot: T63 A (pantries + deliveries), where and when -- targeted re-pilot

Build: bccf8fe47f (`.study-builds/tier4-r1d2-bccf8fe47f`). Start: `pantries-joined.txt` (13 nodes,
18 edges, two sources). Walked by clicks and keys only, never by URL. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T63A/

## Routes walked

The routes the fixes touched are T61, T65, T66, T67 and T68 routes (the issue chips and counts on
the Edges tab, the source rows, the Hide card and a style layer's Which nodes). None of them
belongs to T63 A, so this pass walked only the success path by pointer. It replayed the previous
success walk on this build; all 8 steps matched the recorded screens and the session ended.

## Result

Reached. The time is designated as `opened`; latitude `lat` and longitude `lon` are designated at
load and read in Data > Fields > pantries.csv. The data stayed the pantries data the whole way (13
nodes, 18 edges in the overview, P01 to P10 visible in the table with their own sites and days).

## 1. Success path, pointer (`success-5/`)

- 01: the start (the tool printed "the drawing is still moving" right after the setup).
- 02: hover "Set in Data" (inspector Values, "Time: opened"): no tooltip.
- 03: click. The `opened` header gains a "Time" chip and keeps its ISO cells ("2015-03-02"); the
  clock joins the canvas toolbar; the "Time: opened" row leaves the inspector. Fields does not
  open. The table's "With issues 2" chip and the deliveries source row's issue count 1 show the
  same as at the start.
- 04: Expand pantries.csv: Time = opened, Latitude = lat, Longitude = lon.
- 05-09: the Time list: Escape closes it and keeps opened; Enter reopens it; Tab with nothing typed
  leaves it open (08); Escape closes it, opened kept (09).

## Mismatch with the answer key

- None. The answer key's path note ("sets Time = opened in place: Fields does not open, nothing is
  announced, and the Time: opened row leaves the Overview") matches success-5/03.png.

## Defects (none blocks the task or spoils its grading; all unchanged from the previous pass)

1. "Set in Data" acts in place: Fields does not open, no tooltip, no notice (decided R10 says it
   opens Fields with the Time row added) (success-5/02.png, success-5/03.png).
2. Tab in an open Time list with nothing typed leaves the list open (decided: Tab closes the list
   and takes nothing) (success-5/08.png).
3. The session starts with "the drawing is still moving" after the setup (success-5/01.png).

## Skipped

- The detours walk and the keyboard walk: this targeted pass walks only the success path and the
  listed routes, and none of the listed routes is a T63 A route.
- Every listed route (T61A/T61B, T65A/T65B, T66A/T66B, T67A/T67B, T68A/T68B): they belong to other
  tasks' pilots.
