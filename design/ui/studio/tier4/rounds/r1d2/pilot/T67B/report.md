# T67 B pilot -- targeted re-walk on build bccf8fe47f

Task: "Before you pass this gauge list on, check whether the program thinks anything in it looks
wrong. Where the program can put something right for you, do it. Tell us what it found and what you
changed." Start: setup `gauges.txt` (gauges.csv, 11 gauges G01-G11, Data place open, table open).
Build: bccf8fe47f, served from `.study-builds/tier4-r1d2-bccf8fe47f`.

Every walk was replayed with `real.mjs --replay` from the newest earlier walk of the same route into
a fresh folder, each its own session, each from the task's real start, and every one matched every
step to the end (exit 0, session ended). Every screenshot where something changes was looked at.
The data stayed gauges.csv's own 11 gauges on every walk.

Result: **reached** by pointer and by keyboard. No crash, no block, no wrong result that would
spoil grading. No mismatch with the answer key.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T67B/<walk>/NN.png

## Routes in the fix list

Of the routes the fixes touched, only "T67A/T67B success path: column issue marks in the table
header" belongs to this task; it is the table-marks detour below (h2a-detour-table-marks): the marks
still sit on depth_cm and station, open their one-line list, and clear when the column is fixed.
The other routes (T61A/B, T65A/B, T66A/B, T68A/B) start from other tasks' files and are walked by
those tasks' pilots.

## 1. Success path by pointer (h1-pointer)

- 01: Sources row "gauges...." 11, a warning mark and "3"; table "With issues 11"; warning marks on
  depth_cm and station.
- 03: the chip opens "Issues in gauges.csv": depth_cm "1 not a number" (Make blank, Ignore), station
  "1 value with padded spaces" (Trim, Ignore), telemetry "11 values could be yes/no" (Read as
  yes/no, Ignore), and "Ignore in all columns".
- 04-06: Make blank, Trim, Read as yes/no; Stone Weir's depth is blank, depth_cm becomes a number
  column.
- 07: "Resolved 3", each fix button dimmed; the source chip still shows a warning mark and "0"
  (defect 5). 08: Escape closes the list; the chip is gone.
- 10: telemetry reads Yes/No with no warning mark. Matches the answer key.
- 11: Undo brings back the telemetry issue ("Undid fixing a data issue.") and selects all 11 nodes
  (defect 1).

## 2. Detours (the same three as the earlier passes)

### 2a. The table's warning marks first (h2a-detour-table-marks)

- 03: the depth_cm mark opens the one-line list: "1 not a number", Make blank, Ignore, Show rows,
  Ignore all. 04: Show rows filters to G07 Stone Weir.
- 06: Make blank there leaves "No rows" and a green "With issues 0" while station keeps its mark and
  the source chip says 2 (defect 2).
- 09-10: station's mark offers Trim; Trim clears the mark, source chip 1.
- 12: the source row's menu has nothing about issues. 14: telemetry keeps its mark (leaving it is
  not a failure).

### 2b. Main menu, Quick actions, then the column header menu (h2b-detour-menus)

- 03: the main menu has nothing on issues. 04-08: Quick actions, typing "issues" gives "No
  results"; Enter does nothing; Tab goes to "Clear search"; Escape closes it (defect 3).
- 09: clicking Stone Weir selects G07; the inspector shows depth_cm "-" with no hint of an issue.
- 11-13: depth_cm's header menu offers the issue with Make blank, Ignore, Show rows; Type > number.
- 14: depth_cm is a number column, Stone Weir reads "No value", source chip 2 -- the answer key's
  "also success" route.

### 2c. The inspector of a source (h2c-detour-source-inspector)

- 02: source inspector > ... > Edit source... opens "Replace: gauges.csv".
- 03: typing "abc" in the URL box and Enter: nothing happens and nothing is said (defect 4).
- 04: Escape returns to the project unchanged (3 issues, 11 nodes).

## 3. Success path by keyboard (h3-keyboard; keyboard-only, screen-reader mode)

Focus order from the top: Main menu, Project: gauges, Undo (disabled), Redo (disabled), Data,
Collapse Sources, Add source, "gauges.csv 11 nodes", "3 issues in gauges.csv", "gauges.csv menu".

- Enter on the chip opens dialog "Issues in gauges.csv"; the read names every row and button.
- Enter on "Make blank: 1 not a number" announces "depth_cm: 1 value made blank"; focus goes back
  up to "Ignore in all columns" (19, defect 6). Space on Trim announces "station: 1 value trimmed".
  Enter on Read as yes/no announces "telemetry: 11 values read as yes/no".
- Tab to "Resolved 3", Enter expands it, Tab leaves the dialog and it closes; Escape there does
  nothing harmful.
- Control+Z announces "11 nodes selected" and "Undid fixing a data issue." (32, defect 1).
- Enter reopens the dialog; Escape closes it and focus returns to the chip. Control+Y redoes;
  Escape clears the selection.
- Tab and Shift+Tab run through Fields, Filters, the resizers, the canvas, Analyze, the table
  headers (arrow keys move between them) and the inspector; every stop is named. Focus never fell
  to the page body after the start.

## Defects (all carried over unchanged; none blocks the task or changes what the participant ends with)

1. **Undo of a data fix selects every node** (rings, every row highlighted, inspector "11 nodes
   selected", screen reader "11 nodes selected"). h1-pointer/11.png, h3-keyboard/32.png.
2. **"With issues 0" while issues remain**, after Show rows from one column's mark and fixing that
   column. h2a-detour-table-marks/06.png.
3. **Quick actions knows nothing about issues**: "issues" gives "No results".
   h2b-detour-menus/06.png.
4. **The source inspector does not show the source's issues**; "Edit source..." opens "Replace:
   gauges.csv", and Enter with a non-address in the URL box does nothing and says nothing.
   h2c-detour-source-inspector/03.png.
5. **The source chip reads a warning mark and "0"** while the issue list is still open after the
   last fix. h1-pointer/07.png.
6. **After Make blank or Trim by keyboard, focus jumps back up to "Ignore in all columns"**, above
   the row just fixed. h3-keyboard/19.png.
