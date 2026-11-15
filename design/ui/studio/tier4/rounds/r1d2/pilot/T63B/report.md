# T63B pilot (targeted re-walk) -- gauges + flows, "where and when"

Build a53beb7179 (frozen, /home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-a53beb7179).
Screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/ (not in git).

## Routes owed

None of the routes the fix pass touched (T61, T65, T66, T67, T68 routes) belong to this task. The
success path by pointer, and the earlier pass's routes still listed as unwalked (success-direct,
success-2, success-3, detours, detours-2, detours-3, keyboard, keyboard-2, keyboard-3,
keyboard-f6), were owed.

## This pass: nothing walked

Every route was queued as a replay of its newest walk on this same build
(tmp/design-studio/tier4/r1d3/pilot/T63B/r3-*, into tmp/design-studio/tier4/r1d2/pilot/T63B/r6-*),
one browser at a time. The first replay (success) waited for a free browser slot for the whole of
this pass and never started; no session was opened, so none had to be ended. The queue was stopped
when the pass had to report.

## Latest results on this build (from the earlier replays of the same routes)

All eleven routes were replayed on build a53beb7179 into
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T63B/r3-*/ and every
one matched each check point to the end (exit 0): success (14 steps), success-direct (3),
success-2 and success-3 (18 each), detours, detours-2 and detours-3 (31 each), keyboard,
keyboard-2 and keyboard-3 (93 each), keyboard-f6 (6). The task was reached by pointer and by
keyboard; the data stayed the task's own (12 nodes, 14 edges, G01-G12).

Mismatches with the answer key: none.

Defects still open (none blocks the task or spoils grading):

- The table marks the place only after the reader re-picks it: `lat` and `lon` carry no Latitude /
  Longitude chip while `installed` carries "Time", though Fields says they are the place
  (r3-success/05.png, r3-success/15.png).
- Fields' Time list: Tab with the list open leaves it open, where the decided behavior is that Tab
  closes the list and takes nothing (r3-success/12.png, r3-success/13.png).
- Keyboard: a freshly added Time row's list opens but its combobox announces "collapsed"; Space on
  a highlighted option removes the empty row instead of choosing it (r3-keyboard, the steps after
  "+" > Time).
- Layout > Map's Location button ("lat, lon") does nothing when clicked (r3-detours/13.png).
- Latitude and Longitude can both be set to `lon` with nothing said; Control+Z puts it back
  (r3-success-2/18.png).
