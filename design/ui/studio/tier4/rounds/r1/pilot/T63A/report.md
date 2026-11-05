# Pilot: T63 A (pantries + deliveries), where and when

Build: 0ffeae2ef5 (`.study-builds/tier4-r1-0ffeae2ef5`). Start: `pantries-joined.txt` (13 nodes, 18
edges, two sources). Every walk started from that start and was driven by clicks and keys only.
Screenshots are under `/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T63A/`.

## Result

Reached on all three walks. The time ends designated as `opened`; latitude `lat` and longitude `lon`
were designated at load and are visible in Data > Fields > pantries.csv and in the Map layout's
Location row. The data stayed the pantries data the whole way (13 nodes, 18 edges, P01 to P13).

## 1. Success path, pointer (`success/`)

- 01: the start. Data place open, table open, inspector Values shows "Time: opened" with a
  "Set in Data" button. Fields shows deliveries.csv open and pantries.csv collapsed.
- 02-03: hover "Set in Data" gives no tooltip. Click: the time is set at once (table header
  `opened` gains a "Time" chip, cells read "Mar 2, 2015", a clock button joins the canvas
  toolbar). The "Time: opened" row leaves the inspector. Fields does not open and nothing is
  announced; the pantries.csv group stays collapsed.
- 04: expanding pantries.csv shows Time = opened, Latitude = lat, Longitude = lon.
- 06-10: the Time select: Escape closes it and keeps opened; Enter reopens; ArrowDown then Escape
  keeps opened; Tab moves to "Remove node time".
- 11-12: remove buttons read "Remove node time", "Remove node latitude".

## 2. Detours (`detours/`)

- Map layout first (21-27): Layout > Map is marked "Recommended" and its options show
  "Location lat, lon". Clicking that Location button does nothing (26). Escape closes the options
  without applying. Map was not applied.
- Table column menu (28-31): right-click on the `opened` header > Role > Time sets the time
  (31). Ctrl+Z undoes it with the notice "Undid changing a column's role." (34).
- Fields "+" (35-39): "Add to node fields" > Time adds an empty Time line with its list open;
  Escape takes the empty line back with focus on "+" (38); doing it again and choosing opened
  sets it (39).

## 3. Keyboard only (`keys/`, started with --keys and screen-reader output)

Tab order from the start: Main menu, Project, Undo, Redo, Data, Sources controls, Fields
(deliveries.csv), Expand pantries.csv, Add filter, Resize left panel, canvas, Analyze, Resize
table, table controls, table grid ("Key id"), inspector (From 2 files, Graph actions, Values tab,
Set in Data). Enter on "Set in Data" sets the time; focus moves to "About Direction" and nothing
is announced. Fields > pantries.csv by keyboard reads combobox "Node time" value "opened",
"Node latitude column" value "lat", "Node longitude column" value "lon". Focus never fell to the
page body.

## Mismatches with the answer key

- The answer key says "Set in Data" opens Data > Fields with the Time entry added and the column
  chosen. On this build it sets the time in place: Fields does not open or scroll, and the
  pantries.csv group stays collapsed (success/03.png).

## Defects

1. "Set in Data" acts without saying so: no tooltip, no notice, no live announcement, Fields not
   opened; the "Time: opened" row simply disappears from the inspector, so the reader loses the
   only confirmation there (success/02.png, success/03.png, keys/43.png).
2. The place designation is invisible in the table: `opened` shows a "Time" chip but `lat` and
   `lon` show no Latitude or Longitude mark (success/04.png).
3. `opened` keeps the text glyph (Aa) in the table header while the Fields list draws it with the
   date glyph, and the sort caption reads "A to Z" for a column drawn as dates (success/05.png,
   success/06.png).
4. Map layout options: the "Location lat, lon" button does nothing on click and has no tooltip;
   its name "Location" leaves out its visible text "lat, lon" (detours/25.png, detours/26.png).
5. Icon buttons with no tooltip: the source rows' hover buttons (272,134 and 272,162) and the
   table's Table options, Maximize and Close (detours/06.png, detours/07.png, detours/18.png to detours/20.png).
6. The Role submenu items of the header menu are not exposed as menu items (a role-name lookup
   for "Time" found nothing while the submenu was open; detours/30.png).
7. Escape on the just-added empty Time line takes it back but shows no notice (decided: "says
   so") (detours/38.png).
8. Keyboard: in an open Time list, Tab does nothing -- the list stays open and focus stays
   (decided: Tab with nothing typed closes the list) (keys/89.png).
9. Keyboard: after Escape and Enter the list reopens with "lat" as the active option for a
   screen reader while the screen highlights "opened" (keys/89.png).
10. F6 cycles canvas, toolbar, table, "Resize left panel" separator, inspector: it never reaches
    the top bar, and lands on the left panel's resize handle instead of its first control
    (decided: a resize handle is never a region) (keys/57.png to keys/62.png).
11. Inconsistent names: "Node time" against "Node latitude column" / "Node longitude column".
12. The session starts with "the drawing is still moving" after the setup (success/01.png).

## Also noted

- Layout list: "Two columns ... Needs exactly two groups; families has 12" treats a count column
  as a group (detours/22.png).
- Fields opens on deliveries.csv because its Sources row is selected (decided R12), which hides
  the site list's place rows at the start.
