# Pilot: T63 A (pantries + deliveries), where and when -- targeted re-pilot

Build: a53beb7179 (`.study-builds/tier4-r1d3-a53beb7179`). Start: `pantries-joined.txt` (13 nodes,
18 edges, two sources). Every walk started from that start and used clicks and keys only, never a
URL. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T63A/

## Routes walked

The fixes in this pass touched T61, T65, T66, T67 and T68 routes: the issue chips and counts on the
Edges tab, the source rows, the Hide card and a style layer's Which nodes. None of those routes is a
T63 A route, so they are left to those tasks' pilots. This pass walked all three of T63 A's own
walks: the success path by pointer, the fixed detour set and the keyboard walk. Each one replayed
the newest earlier walk of the same route on this build. Every step matched the recorded screen,
and each session ended:

- Success path: 8 of 8 steps matched (`success-8/`).
- Detours: 40 of 40 steps matched (`detours-4/`).
- Keyboard walk: 55 of 55 steps matched (`keys-4/`).

## Result

Reached on all three walks. The time is designated as `opened`. Latitude `lat` and longitude `lon`
are designated at load and can be read in Data > Fields > pantries.csv. The data stayed the
pantries data the whole way: 13 nodes and 18 edges in the Overview, and the table showed P01 to P11
with their own sites, zip codes and opening days.

## 1. Success path, pointer (`success-8/`)

- 01: the start. The tool printed "the drawing is still moving" right after the setup.
- 02: hovering "Set in Data" (inspector Values, "Time: opened") shows no tooltip.
- 03: clicking it gives the `opened` header a "Time" chip, and the cells keep their ISO dates
  ("2015-03-02"). The clock joins the canvas toolbar, and the "Time: opened" row leaves the
  inspector. Fields does not open. The table's "With issues 2" chip and the deliveries source
  row's issue count of 1 are the same as at the start.
- 04: expanding pantries.csv shows Time = opened, Latitude = lat and Longitude = lon.
- 05-09: the Time list. Escape closes it and keeps opened. Enter opens it again. Tab with nothing
  typed leaves it open (08). Escape closes it with opened kept (09).

## 2. Detours (`detours-4/`), the same set as the earlier passes

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

## 3. Keyboard only (`keys-4/`, started with --keys and screen-reader output)

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

- None. The answer key's path note matches success-8/03.png: "Set in Data" sets Time = opened in
  place, Fields does not open, nothing is announced, and the "Time: opened" row leaves the
  Overview.

## Defects

None of these blocks the task or spoils its grading, and all are unchanged from the previous pass.

1. "Set in Data" acts in place. Fields does not open, there is no tooltip and no notice, and focus
   jumps to "About Direction". The decided behavior is that it opens Fields with the Time line
   added (success-8/02.png, success-8/03.png, keys-4/43.png).
2. In an open Time list, Tab leaves the list open, whether or not anything was typed. The decided
   behavior is that Tab closes the list (success-8/08.png, detours-4/40.png, keys-4/52.png,
   keys-4/55.png).
3. Typing in the Time list does not narrow the options: after "lo", every column is still listed
   (detours-4/40.png).
4. Reopening the Time list with Enter highlights "lat" for the screen reader while the screen marks
   opened as chosen (keys-4/51.png).
5. In Map layout's options, the "Location lat, lon" button does nothing when clicked and has no
   tooltip (detours-4/25.png, detours-4/26.png).
6. Escape on the empty Time line just added takes it back without a notice of its own. The decided
   behavior is that it says so (detours-4/36.png).
7. The header menu's Role items are not exposed as menu items (detours-4/30.png).
8. Some icon buttons have no tooltip: the source rows' hover buttons and the table's Table
   options, Maximize and Close (detours-4/06.png, detours-4/07.png, detours-4/18.png to
   detours-4/20.png).
9. F6 lands on the "Resize left panel" handle instead of a region's first control, and it never
   reaches the top bar (keys-4/44.png).
10. The names are inconsistent: "Node time" against "Node latitude column" and "Node longitude
    column" (keys-4/47.png).
11. The session starts with "the drawing is still moving" after the setup (success-8/01.png).

## Skipped

- The routes the fixes touched (T61A/T61B, T65A/T65B, T66A/T66B, T67A/T67B, T68A/T68B) are left to
  those tasks' own pilots. None of them is a route of T63 A.
