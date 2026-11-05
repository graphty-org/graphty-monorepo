# Pilot: T62 A (pantries.csv, "which site opened most recently")

Build: 0ffeae2ef5 (frozen, served from .study-builds/tier4-r1-0ffeae2ef5). Start: setup
`pantries.txt` (pantries.csv open on its own, Data place showing; the table is open too). All
screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T62A/.
The data stayed the task's own on every walk: 12 sites, P01-P12, no edges.

Result: reached on the pointer walk and on the keyboard walk. Answer read off the screen:
**Bayview Clinic** (P12, Mar 8, 2023), with the `opened` column's kind changed to date (calendar
glyph in the header; Type submenu checks "date").

## Route 1: success path by pointer (w1-path)

| Step | Action | Screen | Screenshot |
| ---- | ------ | ------ | ---------- |
| 1 | Start | Data place, table open; `opened` header shows the text glyph (Aa) and ISO text "2015-03-02" | w1-path/01.png |
| 2 | Hover the `opened` header | A "..." button appears; tooltip "100% filled 12 unique" | w1-path/02.png |
| 3 | Click "..." ("Options for opened") | Menu: Type, Role, Rename..., Hide, Hide others, Details, Sort ascending, Sort descending, Move left, Move right | w1-path/03.png |
| 4 | Click Type | Submenu: text (checked), number "12 will not convert", yes/no "12 will not convert", date, category | w1-path/04.png |
| 5 | Click date | Header glyph becomes a calendar; cells read "Mar 2, 2015" | w1-path/05.png |
| 6 | "Options for opened" > Sort descending | Caption "Sorted by opened, newest first"; top row P12 Bayview Clinic, Mar 8, 2023 | w1-path/06.png |

Path steps: 5 clicks (menu, Type, date, menu, Sort descending). Right-clicking the header opens
the same menu (w3-fields/11.png). No errors printed.

## Route 2: detours

### 2a. The inspector's "Set in Data" (w2-inspector)

The Graph inspector's Overview shows "Time: opened" with a "Set in Data" button before anything is
set (w1-path/01.png). Clicking it sets the node Time to `opened` at once: Fields gains a Time row
holding `opened`, the canvas toolbar gains a clock button, the table header reads "Aa Time
opened" and the cells draw as dates (w2-inspector/02.png). The column's kind stays **text**.
Two header clicks sort it ("Sorted by opened, A to Z", then "Z to A") and put Bayview Clinic on
top (w2-inspector/03.png, 04.png). A participant here reads the right name and stops, believing
the program now understands dates: by the answer key that is not success. The Time row's column
list draws `opened` with a calendar glyph (w2-inspector/05.png) while the table header beside it
still shows Aa. Escape closes that list and keeps the value (06.png).

Then Fields "+" ("Add to node fields", 07.png): Label, Kind, Weight, Coordinates, Country, Region,
City. A person looking for "what kind of value this is" picks **Kind**; it adds an empty "Kind"
row asking for a column (08.png) -- the node category role, not the column's kind. Escape on the
empty row took it back and put focus on "+" (09.png), with no notice on screen.

### 2b. Data > Fields "+" > Time > opened (w3-fields)

Fields "+" lists Time (02.png). It adds an empty Time row with its column list open, `opened`
first with a calendar glyph (03.png). Enter with nothing active takes nothing (05.png, as
decided). Choosing `opened` gives the same state as 2a: Time role set, header "Aa Time opened",
cells drawn as dates, and the Type submenu still checks **text** (06.png, 07.png). The header's
Role submenu lists None, Id, Label, Kind, Weight, Time (checked), Latitude, Longitude, Coordinates,
Country, Region, City (08.png).

### 2c. Right-click the header and the source row (w3-fields)

Right-click on the `opened` header opens the same header menu as "..." (11.png). Right-click on the
pantries.csv source row: Replace with file..., Select nodes, Export... Ctrl+E, Rename F2, Remove
(12.png) -- nothing about a column's kind. The Data place has no place to set a column's kind; only
the table header menu does.

## Route 3: success path by keyboard only (w4-keys, --keys --sr)

Tab order from the start (nothing focused): Main menu; Project: pantries; Undo (disabled); Redo
(disabled); Data; Collapse Sources; Add source; "pantries.csv 12 nodes" (pressed); "2 issues in
pantries.csv"; "pantries.csv menu"; Collapse Fields; Collapse pantries.csv; "Rows are" (nodes);
Add to node fields; "Id" (id); "Node latitude column" (lat); Remove node latitude; "Node longitude
column" (lon); Remove node longitude; Add filter; Resize left panel; Graph drawing (canvas);
Analyze (toolbar, one stop); Resize table; tab Nodes; "With issues 2"; "Columns: 8 of 8"; Table
options; Maximize table; Close table; the grid at "Key id"; From pantries.csv; Graph actions; tab
Values; Set in Data; About Direction; "Largest component 1 node"; About Degree; radio All; Resize
inspector. Focus never fell to the page body.

In the grid, ArrowRight walks the headers: "number lat", "number lon", "mixed families", "text
site", "text zip", "text opened" (w4-keys/48.png). The "..." options button shows on the focused
header but is not a Tab or arrow stop. **Shift+F10** opens the header menu at Type (49.png);
ArrowRight opens the Type submenu at "text" (checked); ArrowDown x3 to "date"; Enter sets it and
returns focus to the header, now "date opened" (54.png). Shift+F10, ArrowDown x7 to "Sort
descending", Enter: caption "Sorted by opened, newest first", focus on "opened, sorted
descending" (56.png). ArrowDown and ArrowLeft x2 reach the cell "Bayview Clinic" (59.png); Enter
selects it ("12 of 12 rows, 1 selected", "P12 selected") and the drawing moves (60.png). Escape
moves focus out of the table to the toolbar's "Table" button (61.png).

## Mismatches between the answer key and the screen

1. The answer key offers "the inspector's Overview 'Set in Data'" and "Data > Fields '+' > Time >
   opened" as success routes ("both count"), and asks the pilot to confirm whether designating the
   time also changes the kind. It does not: after either route the header keeps the text glyph and
   the Type submenu checks "text" (w2-inspector/02.png, w3-fields/07.png). Only the header menu's
   Type > date meets the success definition.
2. The answer key says "Set in Data" opens Fields with the Time entry added and its column chosen,
   for the reader to check. On the build it sets Time to `opened` at once with no further choice
   (w2-inspector/02.png).
3. The answer key says "sort by opened, highest first". The menu says "Sort descending"; the
   caption then says "newest first" (w1-path/06.png).
4. The answer key's path names "its kind > date"; the menu calls it "Type", with lowercase kinds
   (text, number, yes/no, date, category) (w1-path/04.png).

## Defects

1. **Setting the time role makes a text column look and sort like dates while its kind stays
   text** (routes 2a, 2b). The cells draw as "Mar 2, 2015" and the sort puts Bayview Clinic first,
   so a participant has every sign of success with the kind unchanged. The two places that show
   the kind disagree: the Time row's column list shows `opened` with a calendar glyph, the table
   header shows Aa. w2-inspector/02.png, 05.png; w3-fields/03.png, 06.png, 07.png.
2. **A date-drawn column's sort caption says "A to Z" / "Z to A"** when its kind is text but its
   role is time (route 2a). w2-inspector/03.png, 04.png.
3. **The header's accessible name drops its kind or role once sorted**: "date opened" becomes
   "opened, sorted descending"; "Time opened" becomes "opened, sorted ascending" (routes 3, 2a).
   w4-keys/54.png, 56.png; w2-inspector/03.png.
4. **The inspector says "Time: opened" before any time is set** (route 1 start), beside a "Set in
   Data" button. It reads as if the time were already designated. w1-path/01.png.
5. **Fields "+" offers "Kind"**, the node category role, which a participant looking for the
   column's kind takes for it; the column's kind is called "Type" in the header menu (route 2a).
   w2-inspector/07.png, 08.png.
6. **No control for a column's kind in the Data place** (Fields, the source row's menu); only the
   table header menu sets it (routes 2a-2c). Recorded already in `backlog.md` (2026-10-29) and as
   the owner's call in `owner-decisions.md`. w3-fields/12.png.
7. **The header menu has no keyboard door a person can see** (route 3): the "..." button is not a
   Tab or arrow stop, and only Shift+F10 opens the menu; nothing on screen shows that key.
   w4-keys/48.png, 49.png.
8. **Selecting a row in the table moves the drawing** (route 3): Enter on the "Bayview Clinic"
   cell selected P12 and the drawing zoomed and turned, leaving a node under the canvas toolbar.
   The drawing had been still for many steps before. Against "the drawing moves only when the
   reader asks". w4-keys/59.png, 60.png.
9. **Escape on a just-added empty "Kind" row took it back with no notice** on screen (route 2a);
   decided.md says it takes it back and says so. w2-inspector/09.png.
10. **Escape in a table cell sends focus out of the table** to the toolbar's "Table" button
    (route 3); a keyboard reader loses their place in the grid. w4-keys/61.png.
11. **The header tooltip runs two facts together**: "100% filled 12 unique" (route 1).
    w1-path/02.png.
12. **Field names are uneven**: "Id" beside "Node latitude column" and "Node longitude column"
    (route 3, Tab 15-18).

## Not walked

Nothing on the listed routes was skipped. The header's own accessible description (whether it
mentions Shift+F10) was not read; the grid cell and "Close table" have none.
