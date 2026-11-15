# Pilot: T62 B (gauges.csv, "put in" days read as words)

Build: 0ffeae2ef5 (frozen, `.study-builds/tier4-r1-0ffeae2ef5`). Start: `setup:gauges.txt`
(gauges.csv open on its own, Data place showing; the table is open at start).
Screenshots are under `/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T62B/`
(abbreviated below as `T62B/`). No earlier walk of this route existed, so every step was taken by hand.

Result: **reached** by pointer and by keyboard. Birch Hollow (Jun 27, 2018) is the top row with
`installed` read as a date and sorted newest first.

## Route 1: success path by pointer (`T62B/w1-pointer/`)

1. 01.png: start. Table header `installed` shows the text glyph (Aa) and ISO text.
2. 03.png: inspector Overview "Time: installed -- Set in Data". Fields gains a Time row set to
   `installed`; the table cells now draw as "May 12, 1998" and the header gets a "Time" badge, but
   the header glyph is still Aa (text). This is the time role only; the kind is unchanged.
3. 05.png: clicking the header sorts it; caption "Sorted by installed, A to Z" (text sort).
4. 06.png: right-click on the header: nothing happens.
5. 07.png: hovering "Options for installed" (the "..." at the header's right end; at 1440 px the
   column's end, and its button, lay past the table's right edge until the table scrolled) opens
   the header menu: Type, Role, Rename..., Hide, Hide others, Details, Sort ascending/descending,
   Move left/right.
6. 08.png: Type submenu: text (checked), number "11 will not convert", yes/no "11 will not convert",
   date, category.
7. 10.png: date. Header glyph becomes a calendar; caption "Sorted by installed, oldest first".
8. 11.png: header click again: "newest first"; top row G10 Birch Hollow, Jun 27, 2018.

Path steps on this build (from the start, by the shortest pointer route): open the header menu,
Type, date, header click, header click = 5 steps.

## Route 2: detours (`T62B/w2-detours/`, plus w1 steps 2-4)

- **Inspector "Set in Data"** (w1 03.png, 05.png): sets the Time role, redraws the cells as dates,
  and the sort then gives Birch Hollow first (ISO text sorts the same as dates). The kind stays text;
  only the Aa glyph says so. A participant here reports the right name and believes the job is done
  (graded P by the answer key).
- **Data place Fields "+"** (03.png-06.png): "Add to node fields" offers Label, Kind, Weight, Time,
  Coordinates, Country, Region, City. "Kind" is a role (a category), not the column's kind of value.
  Time > column list: `installed` is drawn with a calendar glyph in this list while the table header
  shows Aa for the same column. Choosing it gives the same result as "Set in Data" (role only, kind
  text). Undo names it ("Undo setting the time field", 07.png).
- **Source row** (08.png, 09.png): its inspector shows only Loaded nodes/edges; its "..." menu holds
  Replace with file..., Select nodes, Export..., Rename, Remove. No kind of value anywhere.
- **Source issues chip "3"** (11.png): issues for depth_cm (not a number), station (padded spaces) and
  telemetry ("11 values could be yes/no", "Read as yes/no"). Nothing for `installed`, although every
  value is an ISO date: the program offers to read yes/no but not to read dates.
- **Quick actions (search)** (13.png, 14.png): "installed" and "date" both give "No results". Enter
  does nothing; Escape closes and returns focus to the Quick actions button (16.png).

## Route 3: success path by keyboard (`T62B/w3-keys/`, screen-reader mode, plus `T62B/w4-fields-keys/`)

Tab order from the start (focus starts on the page itself, as designed): Main menu, Project: gauges,
Undo (disabled), Redo (disabled), Data, Collapse Sources, Add source, "gauges.csv 11 nodes",
"3 issues in gauges.csv", "gauges.csv menu", Collapse Fields, Collapse gauges.csv, Rows are,
Add to node fields, Id, Node latitude column, Remove node latitude, Node longitude column, Remove
node longitude, Add filter, Resize left panel, Graph drawing, Analyze, Resize table, tab Nodes,
"With issues 11", Columns: 8 of 8, Table options, Maximize table, Close table, then the grid
(entered at "Key id"). 31 Tabs to the grid. Focus never fell to the page body.

In the grid the headers read "Key id", "number lat", "number lon", "mixed depth_cm", "text station",
"text code", "text installed", "category telemetry". Tab from a header leaves the grid for the
inspector; the header's "Options" button is not a Tab stop. Shift+F10 (also the ContextMenu key and
Alt+ArrowDown) opens the header menu at "Type"; ArrowRight opens it ("text" checked); ArrowDown x3 to
"date"; Enter: focus returns to the header, now "date installed". Enter sorts: live "Sorted by
installed, oldest first"; Enter again: "newest first". ArrowDown and ArrowLeft read "Jun 27, 2018",
"0090", "Birch Hollow" (55.png). Escape in the menu returns focus to the header.

Fields detour by keyboard (`w4-fields-keys/`): "Add to node fields" > menu (Label first) > Time >
combobox "Node time". Escape on the empty line removes it and returns focus to "Add to node fields"
(23.png). Added again: the column list is drawn open (25.png) while the combobox reports
"collapsed"; typing "inst" does nothing; Tab moves to "Remove node time" and the list stays drawn
open (27.png); ArrowDown highlights options and Enter takes one.

## Mismatches with the answer key

- The key's "Data > Fields '+' > Time > opened" and "the inspector's Overview 'Set in Data'" do not
  change the column's kind on this build: they set the time role only (header still Aa). They are P
  routes, not success routes. The only route that sets the kind is the table header menu > Type > date.
  No control in the Data place sets a column's kind.
- The success check names `data.json`; `real.mjs --end` writes no `data.json` (the folder holds
  work.json, key.json, styles*.json), and none of these records a column's kind. The grader can tell
  kind from role only from the final screenshot's header glyph.
- The answer's start state says nothing about the table being open; the setup opens it (the table
  is showing at 01.png).

## Defects

1. Setting the time role redraws a text column's cells as dates ("May 12, 1998") and the sort then
   gives the right order, so the screen looks as though the program now reads dates while the kind
   is still text; the Aa glyph is the only sign. (w1 03.png, 05.png)
2. The Fields "+" menu's "Kind" is a role, while "kind of value" (Type) lives elsewhere; the two
   words collide for this task. (w2 04.png)
3. Fields' column list shows `installed` with a calendar glyph while the table header shows Aa for the
   same column. (w2 05.png against 01.png)
4. The issue list offers "Read as yes/no" for telemetry but nothing for an all-ISO-date column read
   as text. (w2 11.png)
5. No control in the Data place sets a column's kind; the only route is the table header menu,
   against the rule that configuration lives in the Data place. (w2 04.png, 09.png; w1 08.png)
6. "With issues 11" counts every row because telemetry's yes/no suggestion flags all 11; only two
   values have real problems. (w1 01.png)
7. Right-click on a column header does nothing. (w1 06.png)
8. The installed column's "Options" button sat past the table's right edge at 1440 px; hovering the
   visible header showed no menu affordance. (w1 04.png)
9. Hovering "Options for installed" opened the header menu without a click, and the tooltip
   overlapped the open menu. (w1 07.png)
10. The header's options button is not a Tab stop and the header announces no menu (no
    has-popup, no description); a keyboard user must guess Shift+F10. (w3, Tab from "text
    installed" went to "From gauges.csv")
11. A header's name drops its kind once sorted: "text installed" becomes "installed, sorted
    ascending". (w3 50.png)
12. Changing the type makes no announcement; only the focused header's name changes. (w3 Enter on
    "date")
13. The source row's name reads "gauges.csv Node 11 11 nodes" to a pointer hit test and
    "gauges.csv 11 nodes" by keyboard; the first repeats the count. (w2 08.png)
14. Escape on a just-added empty Time line removes it with no notice, against the settled rule that
    it "says so". (w4 23.png)
15. The "Node time" combobox reports "collapsed" while its list is drawn open; typed letters do
    nothing; after Tab the list stays drawn open with focus elsewhere. (w4 25.png, 27.png)
16. "Add to node fields" reports no has-popup/expanded state although it opens a menu. (w4, Tab
    to "Add to node fields")

## Tool note

`--start setup:gauges.txt` run from `design/ui/studio/tier4/` looked in `tier2/` and
`rounds/tier-2/setups/` and failed ("no such setup file"); it works from
`rounds/tier-4/setups/`.

## Skipped

Nothing. All three routes were walked; every session was ended.
