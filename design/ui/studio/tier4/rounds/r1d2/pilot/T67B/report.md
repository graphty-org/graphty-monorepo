# T67 B pilot -- targeted re-walk on build ff17391bb1

Task: "Before you pass this gauge list on, check whether the program thinks anything in it looks
wrong. Where the program can put something right for you, do it. Tell us what it found and what you
changed." Start: setup `gauges.txt` (gauges.csv, 11 gauges G01-G11, Data place open, table open).
Build: ff17391bb1, served from `.study-builds/tier4-r1d2-ff17391bb1`.

Every walk was replayed with `real.mjs --replay` from the route walked on the previous build into a
fresh folder on this build, each its own session, each from the task's real start. The pointer
walk and the three detours matched every step to the end (exit 0). The keyboard walk diverged at
one step on its first replay (a new notice, below), was carried on by hand, and its own route then
replayed to the end with every step matching (exit 0). The data stayed gauges.csv's own 11 gauges
on every walk.

Result: **reached** by pointer and by keyboard. No crash, no block, no wrong result that would
spoil grading. No mismatch with the answer key.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T67B/<walk>/NN.png

## Routes in the fix list

None of the routes in this re-pilot's list (T64A/T64B, T65A/T65B, T68A/T68B) belongs to T67 B:
each starts from another task's own file and is walked by that task's pilot. Only T67 B's own
success path, detours and keyboard walk were walked here.

## 1. Success path by pointer (a1-pointer)

- 01: Sources row "gauges...." 11, a warning mark and "3"; the table shows "With issues 11" and
  warning marks on depth_cm and station.
- 03: the chip opens "Issues in gauges.csv": depth_cm "1 not a number" (Make blank, Ignore),
  station "1 value with padded spaces" (Trim, Ignore), telemetry "11 values could be yes/no" (Read
  as yes/no, Ignore), and "Ignore in all columns".
- 04-06: Make blank, Trim, Read as yes/no; the chip counts down to 0; Stone Weir's depth is blank.
- 07: "Resolved 3", each fix button dimmed. 08: Escape closes the list; the chip is gone.
- 10: telemetry reads yes/no with no warning mark. Matches the answer key.
- 11: Undo brings back the telemetry issue ("Undid fixing a data issue.") and selects all 11 nodes
  (defect 1).

## 2. Detours (the same three the previous report walked)

### 2a. The table's warning marks first (a2a-detour-table-marks)

- 03: the depth_cm mark opens the one-line list: "1 not a number", Make blank, Ignore, Show rows,
  Ignore all. 04: Show rows filters to G07 Stone Weir.
- 06: Make blank there leaves "No rows" and "With issues 0" while station still carries its mark
  and the source chip says 2 (defect 2).
- 09-10: station's header menu offers Trim; Trim clears the mark, source chip 1.
- 12: the source row's menu has nothing about issues. 14: telemetry keeps its mark (leaving it is
  not a failure).

### 2b. Main menu, Quick actions, then the column header menu (a2b-detour-menus)

- 03: the main menu has nothing on issues. 04-07: Quick actions, typing "issues" gives "No
  results"; Enter does nothing; Tab goes to "Clear search"; Escape closes it (defect 3).
- 09: clicking Stone Weir selects G07; the inspector shows depth_cm "-" with no hint of an issue.
- 11-13: depth_cm's header menu offers the issue with Make blank, Ignore, Show rows; Type > number.
- 14: depth_cm becomes a number column, Stone Weir reads "No value", source chip 2 -- the answer
  key's "also success" route.

### 2c. The inspector of a source (a2c-detour-source-inspector)

- 02: source inspector > ... > Edit source... opens "Replace: gauges.csv".
- 03: typing "abc" in the URL box and Enter: nothing happens and nothing is said (defect 4).
- 04: Escape returns to the project unchanged (3 issues, 11 nodes).

## 3. Success path by keyboard (b3-keyboard; keyboard-only, screen-reader mode)

Focus order from the top: Main menu, Project: gauges, Undo (disabled), Redo (disabled), Data,
Collapse Sources, Add source, "gauges.csv 11 nodes", "3 issues in gauges.csv", "gauges.csv menu".

- 13: Enter on the chip opens dialog "Issues in gauges.csv"; the read names every row and button.
- 18: Enter on "Make blank: 1 not a number" announces "depth_cm: 1 value made blank"; focus goes
  back up to "Ignore in all columns". 22: Space on Trim announces "station: 1 value trimmed".
  24: Enter on Read as yes/no announces "telemetry: 11 values read as yes/no"; focus to "Collapse
  Issues".
- 26-28: Tab to "Resolved 3", Enter expands it, Tab leaves the dialog to "gauges.csv menu" and the
  dialog closes; Escape there does nothing harmful.
- 31: Control+Z announces "11 nodes selected" and "Undid fixing a data issue." (defect 1).
- 36-37: Enter reopens the dialog; Escape closes it and focus returns to the chip.
- 38-39: Control+Y redoes; Escape clears the selection, announced "Selection cleared: 11 nodes",
  and a notice with a Dismiss button appears on the canvas (46: the Dismiss button is now a Tab
  stop between "Resize table" and "Analyze" -- new on this build, named, harmless).
- 40-47: Tab and Shift+Tab run through Fields, Filters, the resizers, the canvas, Analyze, the table
  headers (arrow keys move between them) and the inspector; every stop is named. Focus never fell to
  the page body after the start.

## Defects

1. **Undo of a data fix selects every node.** Undo (button or Control+Z) restores the fix and also
   selects all 11 nodes: rings on the canvas, every row highlighted, the inspector switches to "11
   nodes selected", and the screen reader hears "11 nodes selected". a1-pointer/11.png,
   b3-keyboard/32.png.
2. **"With issues 0" while issues remain.** After Show rows from one column's mark and fixing that
   column, the table chip reads "With issues 0" over "No rows" while station still has its mark and
   the source chip says 2. a2a-detour-table-marks/06.png.
3. **Quick actions knows nothing about issues**: "issues" gives "No results".
   a2b-detour-menus/06.png.
4. **The source inspector does not show the source's issues**; its "Edit source..." opens a screen
   titled "Replace: gauges.csv", and Enter with a non-address in the URL box does nothing and says
   nothing. a2c-detour-source-inspector/02.png, 03.png.
5. **The source chip reads a warning mark and "0"** while the issue list is still open after the
   last fix. a1-pointer/07.png.
6. **After Make blank or Trim by keyboard, focus jumps back up to "Ignore in all columns"**, above
   the row just fixed, so the next Tab lands on the next fix only by luck of order.
   b3-keyboard/19.png.

None of these blocks the task or changes what the participant ends with.
