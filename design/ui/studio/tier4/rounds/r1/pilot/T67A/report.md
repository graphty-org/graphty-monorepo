# Pilot T67A -- what looks wrong in the site list, put right

Build: 0ffeae2ef5 (frozen, `.study-builds/tier4-r1-0ffeae2ef5`). Start: setup `pantries.txt`
(pantries.csv open on its own, Data place showing, table open). Every walk started from that
start; the data stayed the task's own 12 sites (P01-P12) the whole way. Screenshots are under
`/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T67A/` (written `.../T67A/` below).

Result: **reached** by pointer and by keyboard. The program finds two issues in pantries.csv:
`families` "1 not a number" (Library Annex, `n/a`) and `site` "1 value with padded spaces"
(Northgate Center). "Make blank" and "Trim" fix them; no warning is left in the table afterwards.

## 1. Success path, by pointer (`.../T67A/x1-path/`)

| Step | Action | Screen |
| ---- | ------ | ------ |
| 01 | Start | Sources row "pantries..." with a node chip "12" and a warning chip "2"; the table shows warning marks on `families` and `site` and a "With issues 2" chip |
| 02-03 | Click the warning chip on the source row | Popover "Issues in pantries.csv": families "1 not a number" (Make blank, Ignore), site "1 value with padded spaces" (Trim, Ignore), "Ignore in all columns" |
| 06-07 | Make blank | families issue goes to "Resolved 1"; the n/a cell is empty; header warning gone; chip reads 1 |
| 08 | Trim | "Resolved 2"; no issue left; table chip "With issues" gone |
| 10 | Resolved 2 | Lists both fixed issues with dimmed Make blank / Trim |
| 12 | Click the chip again | Popover closes and the row's warning chip disappears |
| 15-16 | Undo / Redo | Toast "Undid fixing a data issue." / "Redid fixing a data issue."; a node is selected |
| 19-21 | Popover open, Tab, Escape, Tab | First Tab lands on the popover's close button; Escape closes it and returns focus to the chip |

Path steps on this build: 3 (issues chip, Make blank, Trim); the setup already shows the Data place.

## 2. Detours

### 2a. The table's warning marks first (`.../T67A/x2a-table/`)

Clicking the warning mark in the `families` header (03) opens a one-line popover: "1 not a number,
Make blank, Ignore, Show rows, Ignore all". Show rows (04) narrows the table to Library Annex and
turns the "With issues 2" chip into a pressed "With issues 1". The same works on `site` (06).
The header's "..." menu (08) carries the same fixes (Make blank / Ignore / Show rows) above
Type, Role, Rename..., Hide, Filter to..., Details, Sort, Move. Make blank and Trim from here fix the
issues as the Data place does (09-10). Type > number ("1 will not convert", 12-14) also blanks the
n/a. Rename... (15-21): Escape cancels, Enter on an empty box changes nothing, Enter after typing
renames, Tab after typing throws the typing away (19).

### 2b. The inspector of the source (`.../T67A/x2b-source/`)

Closing the table and selecting the source row (03) shows the source inspector: only "Loaded:
Nodes 12, Edges 0" -- nothing about the issues. The row's "..." menu (04) has Replace with file...,
Select nodes, Export..., Rename, Remove -- no way to the issues. The row's warning chip still works
with the table closed (06-07: Make blank and Trim, "Resolved 2"). The inspector's "..." (10) offers
"Edit source..." and "Replace with file..."; Edit source... (11) opens a page titled "Replace:
pantries.csv" with Choose file and a URL box. Enter in the empty URL box does nothing (12), Tab moves
to Direction (13), Escape leaves the page with focus on the Data rail button (14).

### 2c. The table's column header menu, and a right-click (`.../T67A/x2c-header/`)

A right-click on the n/a cell (02) does nothing. The `site` header menu's Trim fixes the spaces (04).
The `families` header menu's Details (06) opens the attribute inspector: "Value type Text, Origin From
the file, Has a value 100%, Distinct values 12" -- nothing about the value that is not a number.

## 3. Success path by keyboard only (`.../T67A/x3-keys/`, started `--keys`)

Focus order from the start, with each control's screen-reader name: Main menu; Project: pantries;
Undo (disabled); Redo (disabled); Data; Collapse Sources; Add source; "pantries.csv 12 nodes"
(pressed); "2 issues in pantries.csv" (collapsed). Enter opens dialog "Issues in pantries.csv" with
focus on the dialog (13). Tab: Close panel; Collapse Issues; Ignore in all columns; "Make blank: 1 not a
number". Enter makes blank, announces "families: 1 value made blank" and puts focus on "Ignore in all
columns" (19). Tab to "Trim: 1 value with padded spaces", Space trims, announces "site: 1 value
trimmed", focus goes to "Collapse Issues" (23). Tab, Enter on "Resolved 2" (26); Escape closes the
popover with focus on "pantries.csv menu" (27). Control+Z twice undoes both fixes and announces
"P06 selected", "P07 selected" (29). Further on: the table header is one stop ("Key id"), ArrowRight
walks "number lat", "number lon", "mixed families"; Enter sorts ("Sorted by families, A to Z");
Escape leaves the grid for the canvas toolbar's "Table" button (54); Shift+F10 does nothing; the
ContextMenu key and Alt+ArrowDown open the header menu with focus on "Make blank" (65, 67); Control+Y
twice redoes both fixes (70). No focus fell to the page body. Reached: yes.

## Mismatches between the answer key and the screen

- `answers.md` names the frozen build 7de2dc4e23; the study build is 0ffeae2ef5.
- The path's "Data >" step is not needed from this start: the setup leaves the Data place showing.
- "Also success: volunteer_run Y/N read as yes/no if the program offers it": the program does not
  offer it -- neither issue list names `volunteer_run`.
- The settled issue-list decision says "Ignore all" reads "Ignore in all columns" and that the table
  popover draws the same list; the table's header popover still reads "Ignore all" and is a
  different one-line layout with "Show rows" (x2a-table/03.png).

## Defects (any walk)

1. The source row's warning chip has no tooltip (its name is "2 issues in pantries.csv") -- pointer, x1-path/02.png.
2. The table's header warning mark is an image named "Issues in families" with no tooltip, yet it opens a popover on click -- x2a-table/02.png.
3. With the popover open and both issues fixed, the source row keeps a warning glyph with "0" and the button reads "0 issues in pantries.csv" -- x1-path/08.png, x1-path/11.png.
4. Undo and Redo of a fix select the changed node and swap the inspector to it, unasked ("P06 selected", "P07 selected") -- x1-path/15.png, x1-path/19.png, x3-keys/29.png, x3-keys/70.png.
5. Undo's toast says only "Undid fixing a data issue." -- not which column or what -- x1-path/15.png.
6. The table's "With issues" chip changes meaning: "With issues 2" counts issues, then after Show rows the same chip reads "With issues 1" counting one column's rows -- x2a-table/04.png.
7. The header popover reads "Ignore all" where the Data place list reads "Ignore in all columns" -- x2a-table/03.png.
8. Rename... opens an empty box with no current name in it -- x2a-table/16.png.
9. Rename: Tab after typing discards the new name and focus jumps to the inspector's "..." button -- x2a-table/19.png.
10. The source inspector shows nothing about the file's issues, and the row's "..." menu has no way to them -- x2b-source/03.png, x2b-source/04.png.
11. "Edit source..." opens a page titled "Replace: pantries.csv", the same act as "Replace with file..." beside it -- x2b-source/11.png.
12. The Replace page's URL box has a placeholder and no label -- x2b-source/11.png.
13. Escape from the Replace page puts focus on the Data rail button, not on the "..." that opened it -- x2b-source/14.png.
14. Right-clicking a table cell does nothing -- x2c-header/02.png.
15. The column inspector (Details) for `families` says "Value type Text" and nothing about the value that is not a number; the header glyph for `families` is neither the text nor the number glyph; the keyboard name says "mixed families" -- x2c-header/06.png, x3-keys/52.png.
16. Main menu's tooltip reads "Main menu: open, save, export, settings" but its name is "Main menu" -- x2b-source/09.png (out of step 8).
17. The source row's name repeats its count and reads a glyph as a word: "pantries.csv Node 12 12 nodes" (pointer probe); the issue rows read "Node families 1 not a number" -- x1-path/17.png, x3-keys/14.png.
18. Keyboard: after Make blank focus jumps back up to "Ignore in all columns"; after Trim it jumps to "Collapse Issues" -- x3-keys/19.png, x3-keys/23.png.
19. Keyboard: a popover opened by pointer does not take focus; the first Tab lands on its close button -- x1-path/19.png.
20. Keyboard: Escape in the table header leaves the grid for the canvas toolbar's "Table" button; Shift+F10 on a header does nothing (the ContextMenu key and Alt+ArrowDown work) -- x3-keys/54.png.
21. The resolved list keeps dimmed "Make blank" / "Trim" buttons and does not say which row was changed (Library Annex, Northgate Center), so the reader cannot report what changed without the table -- x1-path/10.png.

## Not walked

Nothing on the three routes was skipped. The search box and the main menu as detours were only
glanced at (the main menu opened in x2b-source/09.png); the task's listed detours are the three walked above.
