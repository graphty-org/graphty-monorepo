# Pilot: T62 A (pantries.csv, "which site opened most recently") -- targeted re-walk

Build: 037e96e9bb (frozen, served from .study-builds/tier4-r1d1-037e96e9bb). Start: setup
`pantries.txt` (pantries.csv open on its own, Data place showing, the table open). All screenshots
are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T62A/.
The data stayed the task's own on every walk: 12 sites, P01-P12, no edges.

Each walk was started by replaying the earlier walk of the same route on this build and matched
every step to the end, so every screen below is this build's own; each screenshot was looked at.

Result: reached by pointer and by keyboard. Answer on screen: **Bayview Clinic** (P12, Mar 8,
2023), with `opened`'s kind set to date (calendar glyph in the header).

## Route 1: success path by pointer (x1-path)

| Step | Action | Screen | Screenshot |
| ---- | ------ | ------ | ---------- |
| 1 | Start | Table open; `opened` header shows Aa and ISO text "2015-03-02"; inspector shows "Time: opened" with "Set in Data" | x1-path/01.png |
| 2 | Hover `opened` | "..." appears; tooltip "100% filled 12 unique" | x1-path/02.png |
| 3 | "Options for opened" | Menu: Type, Role, Rename..., Hide, Hide others, Details, Sort ascending, Sort descending, Move left, Move right | x1-path/03.png |
| 4 | Type | text (checked), number "12 will not convert", yes/no "12 will not convert", date, category | x1-path/04.png |
| 5 | date | Header glyph a calendar; cells "Mar 2, 2015" | x1-path/05.png |
| 6 | "Options for opened" > Sort descending | Caption "Sorted by opened, newest first"; top row P12 Bayview Clinic, Mar 8, 2023 | x1-path/06.png |

No errors printed. Path steps: 5, as the answer key says.

## Route 2a: detour, the inspector's "Set in Data" (x2-detour-inspector)

"Set in Data" sets the node Time to `opened` at once: Fields gains a Time row, the canvas toolbar
gains a clock button, the header reads "Aa Time opened" and the "Time: opened" row leaves the
Overview (02.png). The cells stay ISO text ("2015-03-02"); the kind stays text. Two header
clicks sort "A to Z" then "Z to A" and put Bayview Clinic (2023-03-08) on top (03.png, 04.png).
The Time row's column list shows `opened` with the text glyph, matching the header (05.png);
Escape closes it and keeps the value (06.png). Fields "+" > Kind adds an empty Kind row with its
list open (07.png, 08.png); Escape closes the list, a second Escape takes the empty row back and
focus lands on "+" (09.png, 10.png). Header menu > Type > date then sets the kind: calendar glyph,
cells "Mar 8, 2023", caption "newest first" (11.png, 12.png).

A participant who stops after the sort reads the right name with the kind still text: P by the
answer key. The screen no longer pretends otherwise (no date drawing, Aa glyph, "Z to A" caption).

## Route 2b: detour, Data > Fields "+" > Time > opened (x3-detour-fields)

Fields "+" lists Time; it adds an empty Time row with its list open, `opened` first (03.png).
Enter with the pointer moved off the list takes nothing (05.png). Choosing `opened` gives the same
state as 2a: Time set, header "Aa Time opened", cells ISO text; Type still checks text (06.png,
07.png); Role checks Time (08.png). Right-click on the header opens the same header menu (11.png).
Right-click on the source row: Replace with file..., Select nodes, Export... Ctrl+E, Rename F2,
Remove -- nothing about a column's kind (12.png).

## Route 3: success path by keyboard only (x4-keys, --keys --sr)

Tab order from the start: Main menu; Project: pantries; Undo; Redo; Data; Collapse Sources; Add
source; "pantries.csv 12 nodes"; "2 issues in pantries.csv"; "pantries.csv menu"; Collapse Fields;
Collapse pantries.csv; Rows are; Add to node fields; Id; Node latitude column; Remove node
latitude; Node longitude column; Remove node longitude; Add filter; Resize left panel; Graph
drawing; Analyze; Resize table; tab Nodes; With issues 2; Columns: 8 of 8; Table options; Maximize
table; Close table; grid at "Key id"; From pantries.csv; Graph actions; tab Values; Set in Data;
About Direction; Largest component 1 node; About Degree; radio All; Resize inspector. Focus never
fell to the page body.

ArrowRight walks the headers to "text opened" (48.png). Shift+F10 opens the header menu at Type
(49.png); ArrowRight, ArrowDown x3, Enter sets date; focus returns to "date opened" (54.png).
Shift+F10, ArrowDown x7, Enter sorts: "Sorted by opened, newest first", focus "opened, sorted
descending" (56.png). ArrowDown, ArrowLeft x2 reach "Bayview Clinic"; Enter selects P12 and the
inspector shows its values (60.png). Escape moves focus to the toolbar's "Table" button (61.png).

## Mismatches between the answer key and the screen

1. The answer key says that after "Set in Data" or Fields "+" > Time > opened "the cells draw as
   dates". On this build they stay ISO text ("2015-03-02") with the Aa glyph and a "Time" badge in
   the header (x2-detour-inspector/02.png, x3-detour-fields/06.png). The sort still gives the right
   name (x2-detour-inspector/04.png), so the grading (P, by the header glyph) is unchanged.
2. The answer key names build 0ffeae2ef5 for these routes; the frozen build is 037e96e9bb.

## Defects (crash, block or a wrong result that spoils grading)

None on the pointer success path or the two detours.

Keyboard: the header menu, the only place that sets a column's kind, opens only with Shift+F10;
the "..." button is not a Tab or arrow stop and nothing on screen names the key (x4-keys/48.png,
49.png; the focused header's description is empty, 72.png, 74.png). A keyboard participant who
does not know Shift+F10 cannot reach Type and is blocked.

Seen, not blocking: Escape on the just-added empty Kind row took it back with no notice on screen
(x2-detour-inspector/10.png), where the binding decisions say it says so; the inspector shows
"Time: opened" before any time is set (x1-path/01.png); the header tooltip runs two facts
together, "100% filled 12 unique" (x1-path/02.png).

## Not walked

Routes in the re-walk list that belong to other tasks (T60, T61, T63-T68 and T62B's own) were not
walked here; they are those tasks' pilots.
