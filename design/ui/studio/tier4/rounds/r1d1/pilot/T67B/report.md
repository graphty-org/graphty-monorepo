# T67 B pilot -- targeted re-walk on build 037e96e9bb

Task: "Before you pass this gauge list on, check whether the program thinks anything in it looks
wrong. Where the program can put something right for you, do it. Tell us what it found and what you
changed." Start: setup `gauges.txt` (gauges.csv, 11 gauges G01-G11, Data place open, table open).
Build: 037e96e9bb, served from `.study-builds/tier4-r1d1-037e96e9bb`.

Every walk below was started with `real.mjs --replay` from the same route walked earlier on this
build; every step's screen matched, and every screenshot was looked at again. The data stayed
gauges.csv's own 11 gauges on every walk.

Result: **reached** by pointer and by keyboard. No crash, no block, no wrong result that would
spoil grading. No mismatch with the answer key.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T67B/<walk>/NN.png

## 1. Success path by pointer (z1-pointer)

- 01: the Sources row reads "gauges...." 11, a warning mark and "3" (name "3 issues in gauges.csv");
  the table shows "With issues 11" and warning marks on depth_cm and station.
- 03: the chip opens "Issues in gauges.csv": depth_cm "1 not a number" (Make blank, Ignore),
  station "1 value with padded spaces" (Trim, Ignore), telemetry "11 values could be yes/no" (Read
  as yes/no, Ignore), and "Ignore in all columns".
- 04-06: Make blank, Trim, Read as yes/no; the chip counts 2, 1, 0. Stone Weir's depth is blank,
  depth_cm turns into a number column, "With issues" goes away.
- 07: "Resolved 3" lists the three fixes, each button dimmed. 08: Escape closes it; the chip is gone.
- 10: scrolled right, telemetry reads Yes/No with no warning mark. Matches the answer key.
- 11: Undo brings back one issue (telemetry) and the notice "Undid fixing a data issue." -- but it
  also selects all 11 nodes (see defects).

## 2. Detours

The earlier pass on this task has no report, so the detours are the three the task list names for
T67: the table's warning marks first, the table's column header menu, and the inspector of a source.

### 2a. The table's warning marks first (z2a-detour-table-marks)

- 03: the depth_cm mark opens a one-line list: "1 not a number", Make blank, Ignore, Show rows,
  Ignore all -- as the answer key says.
- 04: Show rows filters to G07 Stone Weir ("With issues 1"). 06: Make blank there leaves the
  filtered table empty, chip "With issues 0", while the station and telemetry issues remain and the
  source chip still says 2 (see defects).
- 09-10: station's header menu offers "1 value with padded spaces" Trim, Ignore, Show rows at the
  top; Trim clears the station mark, source chip 1.
- 12: the source row's menu (Replace with file..., Select nodes, Export..., Rename, Remove) has
  nothing about issues; the chip next to it is the door. 14: telemetry's header still carries its
  warning mark. A participant leaving telemetry as text is not a failure.

### 2b. The table's column header menu, with the main menu and Quick actions first (z2b-detour-menus)

- 02: right-click on the source row opens the same row menu. 03: the main menu has nothing on issues.
- 04-07: Quick actions, typing "issues" -> "No results"; Enter does nothing; Tab goes to "Clear
  search"; Escape closes it (see defects).
- 09: clicking Stone Weir selects G07; the inspector shows depth_cm "-" with no hint of an issue.
- 11-12: depth_cm's header menu: the issue "1 not a number" with Make blank, Ignore, Show rows; Type
  submenu lists number "1 will not convert", yes/no "11 will not convert", date "1 will not convert".
- 14: Type > number: the column becomes numeric, Stone Weir reads "No value", source chip 2. This is
  the answer key's "also success" route.
- 16: the source inspector's "..." offers Edit source... and Replace with file....

### 2c. The inspector of a source (z2c-detour-source-inspector)

- 02: source inspector > ... > Edit source... opens "Replace: gauges.csv" (Choose file, a URL box,
  Cancel, Replace dimmed, "Choose a file first").
- 03: typing "abc" in the URL box and Enter: nothing happens and nothing is said.
- 04: Escape returns to the project unchanged (3 issues, 11 nodes). The source inspector itself
  shows only Loaded: Nodes 11, Edges 0 -- no issues. A participant gets back safely.

## 3. Success path by keyboard (z3-keyboard, keyboard-only and screen-reader mode)

Focus order from the top: Main menu, Project: gauges, Undo (dimmed), Redo (dimmed), Data, Collapse
Sources, Add source, "gauges.csv 11 nodes", "3 issues in gauges.csv", "gauges.csv menu".

- 13: Enter on the chip opens the dialog "Issues in gauges.csv" with focus on the dialog; the read
  names every row and button ("Make blank: 1 not a number", "Ignore 1 not a number", "Trim: 1 value
  with padded spaces", "Read as yes/no: 11 values could be yes/no", ...).
- 19: Enter on Make blank announces "depth_cm: 1 value made blank"; focus goes to "Ignore in all
  columns". 23: Space on Trim announces "station: 1 value trimmed". 25: Enter on Read as yes/no
  announces "telemetry: 11 values read as yes/no"; focus to "Collapse Issues".
- 27-28: Tab to "Resolved 3", Enter expands it. 29: Tab leaves the dialog to "gauges.csv menu" and
  the dialog closes.
- 32: Control+Z announces "Undid fixing a data issue." and also "11 nodes selected" (see defects).
- 37-38: Enter reopens the dialog; Escape closes it and focus returns to the chip.
- 39-40: Control+Y redoes ("Redid fixing a data issue."); Escape clears the selection.
- 41: 30 Tabs onward run through Fields, Filters, the panel resizer, the canvas ("Graph drawing"),
  Analyze, the table and the inspector, every stop named. Focus never fell to the page body during
  the walk.

## Defects

1. **Undo of a data fix selects every node.** Undo (button or Control+Z) after fixing an issue
   restores it but also selects all 11 nodes: rings on the canvas, every table row highlighted, the
   inspector switches to "11 nodes selected", and the screen reader hears "11 nodes selected".
   Nothing the person did asked for a selection. z1-pointer/11.png, z3-keyboard/32.png.
2. **"With issues 0" while issues remain.** After Show rows from one column's mark and fixing that
   column, the table's chip reads "With issues 0" with an empty table, while station and telemetry
   still carry warning marks and the source chip says 2. The chip counts only the column it was
   opened from but does not say so. z2a-detour-table-marks/06.png.
3. **Quick actions knows nothing about issues.** Typing "issues" gives "No results".
   z2b-detour-menus/06.png.
4. **The source inspector does not show the source's issues**, and its "Edit source..." opens a
   screen titled "Replace: gauges.csv"; Enter with a non-address in its URL box does nothing and says
   nothing. z2c-detour-source-inspector/02.png, 03.png, 04.png.
5. **The source chip reads a warning mark and "0"** while the issue list is still open after the last
   fix (it goes away when the list closes). z1-pointer/07.png.

None of these blocks the task or changes what the participant ends with.

## Not walked

The other routes in this re-pilot's list belong to other tasks (T60-T66, T68) and their own starts;
only "T67A/T67B success path (the issue chip is the path's first click)" belongs to T67 B, and it is
walked above.
