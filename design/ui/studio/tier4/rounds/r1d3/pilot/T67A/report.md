# T67A pilot (targeted re-pilot), build a53beb7179

Build: /home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-a53beb7179 (graphty 0.8.92).
Start: setup pantries.txt (pantries.csv open, Data place showing).

## Scope

A targeted re-pilot walks the success path by pointer, plus each route the fix pass touched that
belongs to this task. Every route the fix pass touched belongs to another task and starts from that
task's own data: the keep and depth cards and their spoken counts, undo and redo of their edits and
a style layer's Which nodes (T65A, T65B), the Data source card's count (T66A, T66B), the narrowed
Hide card's count (T68A, T68B), and the table role re-run and Analyze's weight (T64A, T64B). None
of them starts from pantries.csv or is a step of T67A, so they are walked in those tasks' own
re-pilots, not here. The task's own detours (the three the first round walked) and its keyboard
walk were walked too, so every route of this task is covered on this build.

Every route below was walked twice on this build: once in the walks named in each section, and
again in a fresh replay of each into its own session (a1-path, a2a-table, a2b-source, a2c-header,
a3-keys under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T67A/).
Every step of every replay matched its earlier screen and every session ended. The second success
path walk shows the same screens: a1-path/05.png (the two issues), a1-path/10.png (Resolved 2,
P07 families blank), a1-path/18.png (two Undos bring both issues back, still 12 pantry sites).

## Success path by pointer -- reached

Walk: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T67A/y1-path
(replayed from the earlier walk x1-path; all 20 steps matched the earlier screens and the session ended).

- 01.png: pantries.csv open, the source row shows the issues chip "2".
- 03.png to 05.png: the chip opens "Issues in pantries.csv": families "1 not a number" (Make blank,
  Ignore) and site "1 value with padded spaces" (Trim, Ignore).
- 07.png, 08.png: Make blank, then Trim; the chip reads 0 issues.
- 10.png: "Resolved 2" lists both; the table shows P07 Library Annex with families blank and no
  warning marks left on families or site.
- 12.png to 16.png: chip with 0 issues, Escape, main menu icon, undo and redo in the top bar.
- 18.png: two Undos bring back both issues (chip 2, P07 families "n/a", "Nothing to undo"); the
  data stays pantries.csv (12 nodes) the whole way.
- 19.png to 21.png: Tab and Escape inside the reopened issue list behave as expected.

Mismatches with the answer key: none. The chip, the two issues, the named rows (Library Annex,
Northgate Center) and the fixes are as the key says.

Defects: none that crash, block the task or spoil its grading.

## Detours

Each detour was replayed from the earlier walk of the same route on this build; every step matched
the earlier screens and each session ended.

- The table's warning marks first:
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T67A/x2a-table
  (21 of 21 steps matched). The header mark's popover offers Make blank, Ignore and Show rows;
  Make blank and Trim from the table fix both issues as the Data place does.
- The source's inspector and its "..." menus:
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T67A/x2b-source
  (13 of 13 matched). The inspector says nothing about the issues; the row's warning chip still
  fixes both with the table closed.
- The column header menu and a right-click on a cell:
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T67A/z2c-header
  (5 of 5 matched). Right-click does nothing (02.png); the site menu's Trim fixes the spaces
  (04.png); Details for families shows "Value type Text" and nothing about the value that is not
  a number (06.png).

None of these crashes, blocks the task or changes the data: the table keeps the 12 pantry sites.

## Success path by keyboard -- reached

Walk: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T67A/z3-keys
(69 of 69 steps matched the earlier keyboard walk; the session ended).

Tab reaches "2 issues in pantries.csv"; Enter opens the issues dialog (13.png); Enter on "Make blank:
1 not a number" and Space on "Trim: 1 value with padded spaces" fix both (19.png, 23.png); Escape
closes it; Control+Z twice brings both issues back (29.png) and Control+Y twice fixes them again
(70.png). Focus is on the page itself only at the start, before the first Tab; it never falls to the
page body during the walk.

## Not walked

Nothing. The success path, the three detours and the keyboard walk were all walked on this build.
