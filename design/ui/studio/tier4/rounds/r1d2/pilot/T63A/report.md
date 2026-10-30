# Pilot: T63 A (pantries + deliveries), where and when -- targeted re-pilot

Build: a53beb7179 (`.study-builds/tier4-r1d3-a53beb7179`). Start: `pantries-joined.txt` (13 nodes,
18 edges, two sources). Every walk started from that start and used clicks and keys only, never a
URL. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T63A/

## Routes walked

This pass walked T63 A's own three walks, each replayed from the newest earlier walk of the same
route on this build. Every step matched the recorded screen, and each session ended:

- Success path: 8 of 8 steps matched (`success-9/`).
- Detours: 40 of 40 steps matched (`detours-5/`).
- Keyboard walk: 55 of 55 steps matched (`keys-5/`).

The fixes in this pass touched routes of T61, T65, T66, T67 and T68. None of them is a T63 A
route. The ones that show on T63 A's own start (the pantries and deliveries data, two sources)
were checked there by pointer in one more session (`shared-surfaces/`):

- Edges > With issues 1 (02-03): the Edges tab shows "18 edges" and a "With issues 1" chip.
  Clicking it leaves one row, P05 to P13, with P13 marked. The count is right for this data.
- The deliveries.csv source row's issue chip (04): "1 issue in deliveries.csv" opens "Issues in
  deliveries.csv" with "edges, 1 unknown end" and Add nodes, Leave out and Ignore.
- The Data source card (05-07): Filters > "+" > typing "source" lists Data source under
  Structure. Enter adds the card with pantries.csv 12 and deliveries.csv 13 (P13 comes only from
  deliveries.csv). The counts are right.
- Column issue marks in the Nodes table header: families and site carry a warning mark
  (success-9/03.png), as before.

## Result

Reached on all three walks. The time is designated as `opened`. Latitude `lat` and longitude `lon`
are designated at load and can be read in Data > Fields > pantries.csv. The data stayed the
pantries data the whole way: 13 nodes and 18 edges in the Overview, and the table showed P01 to P11
with their own sites, zip codes and opening days.

## 1. Success path, pointer (`success-9/`)

- 01: the start. The tool printed "the drawing is still moving" right after the setup.
- 02: hovering "Set in Data" (inspector Values, "Time: opened") shows no tooltip.
- 03: clicking it gives the `opened` header a "Time" chip, and the cells keep their ISO dates
  ("2015-03-02"). The clock joins the canvas toolbar, and the "Time: opened" row leaves the
  inspector. Fields does not open. The table's "With issues 2" chip and the deliveries source
  row's issue count of 1 are the same as at the start.
- 04: expanding pantries.csv shows Time = opened, Latitude = lat and Longitude = lon.
- 05-09: the Time list. Escape closes it and keeps opened. Enter opens it again. Tab with nothing
  typed leaves it open (08). Escape closes it with opened kept (09).

## 2. Detours (`detours-5/`), the same set as the earlier passes

- Hover over every icon (02-20). The source rows' hover buttons (272,134 and 272,162) and the
  table's Table options, Maximize and Close have no tooltip.
- Map layout first (21-27). Layout > Map shows "Location lat, lon". Clicking the Location button
  does nothing (26), and Escape closes the options without applying Map (27).
- Table column menu (28-32). Right-clicking the `opened` header and choosing Role > Time sets the
  time (31). A lookup by the role "menuitem" finds no "Time" (30). Control+Z undoes the change and
  shows "Undid changing a column's role." (32).
- Fields "+" (33-37). "Add to node fields" > Time adds an empty Time line with its list open.
  Escape takes the empty line back and shows no notice of its own; focus goes back to "+" (36).
  Doing it again and choosing opened sets the time (37).
- Typing into the list (38-41). Clicking "Time" by name hits the table header chip and sorts the
  table by opened (38: "opened, sorted ascending"; typing went nowhere). Clicking "Node time" and
  typing "lo" leaves every option in the list (39-40). Tab leaves the list open (40), and Escape
  closes it with opened kept (41).

## 3. Keyboard only (`keys-5/`, started with --keys and screen-reader output)

- Tab order from the start: Main menu, Project, Undo, Redo, Data, the Sources controls
  (including "1 issue in deliveries.csv"), Fields (deliveries.csv), Expand pantries.csv, Add
  filter, Resize left panel, the canvas, Analyze, Resize table, the table controls ("With issues
  2", Columns, Table options, Maximize, Close), the table grid ("Key id"), and then the inspector
  (From 2 files, Graph actions, the Values tab, Set in Data, About Direction, About Degree, All).
- `--read` on the inspector reads "Time: opened" and then the button "Set in Data" (39).
- Enter on "Set in Data" sets the time (43: the "Time" chip appears on `opened`). Focus moves to
  "About Direction", and nothing is announced.
- F6 pressed four times visits the canvas, Analyze, "Key id" and then "Resize left panel" (44).
- In Fields > pantries.csv, the names read are combobox "Node time" value "opened", "Node latitude
  column" value "lat" and "Node longitude column" value "lon". The remove buttons read "Remove node
  time", "Remove node latitude" and "Remove node longitude".
- In the Time list: Escape closes it (50). Enter opens it with "lat" highlighted for the screen
  reader (51). Tab leaves it open (52, 55). Typing "op" highlights opened (54). Escape closes it
  with opened kept, still 13 nodes (56).
- Focus never fell to the page body after the start. Before the first Tab, nothing has focus
  because the setup leaves it that way.

## Mismatch with the answer key

- None. The answer key's path note matches success-9/03.png: "Set in Data" sets Time = opened in
  place, Fields does not open, nothing is announced, and the "Time: opened" row leaves the
  Overview.

## Defects

None of these blocks the task or spoils its grading, and all are unchanged from the previous pass.

1. "Set in Data" acts in place. Fields does not open, there is no tooltip and no notice, and focus
   jumps to "About Direction". The decided behavior is that it opens Fields with the Time line
   added (success-9/02.png, success-9/03.png, keys-5/43.png).
2. In an open Time list, Tab leaves the list open, whether or not anything was typed. The decided
   behavior is that Tab closes the list (success-9/08.png, detours-5/40.png, keys-5/52.png,
   keys-5/55.png).
3. Typing in the Time list does not narrow the options: after "lo", every column is still listed
   (detours-5/40.png).
4. Reopening the Time list with Enter highlights "lat" for the screen reader while the screen marks
   opened as chosen (keys-5/51.png).
5. In Map layout's options, the "Location lat, lon" button does nothing when clicked and has no
   tooltip (detours-5/25.png, detours-5/26.png).
6. Escape on the empty Time line just added takes it back without a notice of its own. The decided
   behavior is that it says so (detours-5/36.png).
7. The header menu's Role items are not exposed as menu items (detours-5/30.png).
8. Some icon buttons have no tooltip: the source rows' hover buttons and the table's Table
   options, Maximize and Close (detours-5/06.png, detours-5/07.png, detours-5/18.png to
   detours-5/20.png).
9. F6 lands on the "Resize left panel" handle instead of a region's first control, and it never
   reaches the top bar (keys-5/44.png).
10. The names are inconsistent: "Node time" against "Node latitude column" and "Node longitude
    column" (keys-5/47.png).
11. The session starts with "the drawing is still moving" after the setup (success-9/01.png).

## Skipped

- T65A and T65B (both card orders, the keyboard walk, the style layer's Which nodes): T65 starts
  on volunteers.graphml or the tidied gauges data, not on T63 A's start, and is not a T63 A route.
- T61A with deliveries.csv opened first, T61B and the T61A keyboard walk of the Edges header: they
  start from an empty app and build the join, which T63 A never does.
- T68A and T68B starts (the narrowed Hide card's count): T68 starts with a node left out, a state
  T63 A never reaches.
