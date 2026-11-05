# T61 A pilot: two spreadsheets as one network (pantries.csv + deliveries.csv)

Build: 0ffeae2ef5 (`.study-builds/tier4-r1-0ffeae2ef5`), 1440 x 900, start `empty`. Screenshots are
under `tmp/design-studio/tier4/r1/pilot/T61A/` in the main checkout (not in git). The data stayed
the task's own on every walk: pantries.csv (12 sites P01-P12) and deliveries.csv (19 rows).

## Result

- Success path by pointer: reached. Overview reads Nodes 13, Edges 18, and Sources lists both files.
- Keyboard only: reached, with the defects listed below.
- Detours walked: the main menu's "Open project or file..." and Control+O from inside the project;
  Cancel on the join screen, then the notice's Undo, then the join again; "Replace pantries.csv" and
  "Open as a separate graph" from the Join split button; opening the second file from the start
  screen; opening deliveries.csv first and adding pantries.csv to it.

## Route 1: the success path by pointer (w1-success)

| Step | What happened | Screenshot |
| ---- | ------------- | ---------- |
| Open a file > pantries.csv | 12 nodes, the table opens, Overview offers "Time: opened -- Set in Data" | w1-success/02.png |
| Data > Sources "+" | The menu lists File... Ctrl+O, Samples..., Server..., Network data..., Paste Ctrl+V | w1-success/03.png |
| File... > deliveries.csv | The join screen reads "Join deliveries.csv -> pantries.csv", Edges, from = Id, to = Id. Chips: "18 edges added", "1 new node", "1 not in graph", "1 repeated key" | w1-success/04.png |
| "1 not in graph" | Narrows the right table to the P05 -> P13 row | w1-success/05.png |
| "1 repeated key" | Opens a menu (Keep first, Keep both, Ignore). It does not narrow the table to the repeated rows | w1-success/06.png |
| "1 new node", "18 edges added" | Nothing changes. Neither chip narrows the table | w1-success/07.png, w1-success/09.png |
| Join | Overview reads Nodes 13, Edges 18, "From 2 files". The deliveries.csv row shows 13 nodes, 18 edges and an issue chip of 1 | w1-success/11.png |
| Hovering the deliveries.csv row | Tooltip "13 nodes, 18 edges". The row's name is "deliveries.csv 17/19 17 of 19 rows joined Node 13 Edge 18 13 nodes, 18 edges" | w1-success/13.png |
| The issue chip | "Issues in deliveries.csv: edges, 1 unknown end", with Add nodes (green), Leave out and Ignore | w1-success/17.png |
| Escape, then Edges | The popover closes. The Edges table holds 18 edges and "With issues 1" | w1-success/18.png |

Answer-key path steps: 6 (Open a file, choose the file, Data, "+", File... with the file, Join),
the same as the key's path.

## Route 2: detours

### d1: the second file from the main menu, Cancel, Replace, separate graph (d1-main-menu)

- Main menu > "Open project or file..." > deliveries.csv opens the same join screen as the success
  path. This detour still succeeds. (d1-main-menu/04.png)
- The Join split button's list holds Join, Add as rows, Replace pantries.csv and Open as a separate
  graph. Only "Replace" has a glyph. (d1-main-menu/05.png)
- Cancel shows "Join canceled" with Undo. Undo on the notice reopens the join screen with the draft
  as it was. (d1-main-menu/07.png, d1-main-menu/09.png) The notice goes after about 6 seconds, and
  after that nothing brings the draft back (see the keyboard walk).
- Choosing "Replace pantries.csv" changes the main button to "Replace pantries.csv", but the header
  still reads "Join deliveries.csv -> pantries.csv" and the pantries table still shows on the left.
  (d1-main-menu/10.png)
- Replace: the notice says "Replaced pantries.csv with deliveries.csv +1 +18". Sources then lists
  only deliveries.csv, but the Nodes table still holds every pantries column (lat, lon, families,
  site, zip, opened). Overview reads 13 nodes and 18 edges, the same as a join, and the row's issue
  chip says "2 issues in deliveries.csv", which are pantries' issues. Under the answer key Replace is
  "not success", but on screen it looks the same as a join. (d1-main-menu/11.png, d1-main-menu/12.png)
  Control+Z restores pantries.csv alone.
- "Open as a separate graph": the header still reads "Join ... -> pantries.csv". The new project
  "deliveries" has 13 nodes and **19** edges, and its Overview lists "1 repeated edge" and "Loaded
  weight trips". The notice that shows is "Undid replacing deliveries.csv.", which comes from the
  earlier project. (d1-main-menu/14.png, d1-main-menu/15.png)

### d2: the start screen, and deliveries.csv first (d2-start-screen)

- deliveries.csv opened from the start screen, then Main menu > Back to start > Open a file >
  pantries.csv, gives two separate projects. The start screen lists neither project, so there is no
  visible way back to the first one. (d2-start-screen/03.png, d2-start-screen/07.png) Each time
  the start screen loads, a sample thumbnail fails to load: `graphty.app/.../venice-transit.webp`
  (net::ERR_BLOCKED_BY_ORB).
- deliveries.csv first, then Data > "+" > File... > pantries.csv: the join screen reads "Join
  pantries.csv -> deliveries.csv", Node values, Match id = Id, with the chips "12 matched" and
  "1 no value". (d2-start-screen/08.png) After Join the result is 13 nodes and **19** edges.
  Overview lists "1 repeated edge", and nothing on screen says that P13 is missing from the site
  list. (d2-start-screen/09.png)

## Route 3: the success path by keyboard (k1-keyboard, `--keys --sr`)

Reached: 13 nodes and 18 edges, with focus on the new source row (k1-keyboard/88.png).

Focus order and names:

- Start screen: it takes 13 Tabs to reach "Open a file". The order is Samples, Docs, For developers,
  GitHub, Switch to dark mode, Settings..., the demo canvas, Communities, Key players, Shortest
  path, 2D, Pause the turning, then "Open a file CSV, GraphML, GEXF, Cytoscape, or a saved project".
  (k1-keyboard/02-14.png)
- After the file loads, focus is on Canvas "Graph drawing". The rail is one Tab stop (Graph), and
  ArrowDown moves to Data.
- Data > Tab Tab > "Add source" collapsed > Enter > menuitem "File..." > Enter > the file chooser.
  Focus lands on the join screen's "Join" button. The live region says "19 of 19 rows".
- Tab on the join screen goes: Join choices, Cancel, combobox "Rows are", "Source column",
  "Source graph value", "Target column", "Target graph value", Ignore case, Ignore spaces, checkbox
  "1 not in graph", button "1 repeated key", button "Key id", columnheader "Edge", then out to the
  inspector.
- Enter on Join: focus moves to the "deliveries.csv 17 of 19 rows joined 13 nodes, 18 edges" row,
  and the live region says "13 of 13 rows" twice, then "pantries: 13 nodes, 18 edges".
- The issue chip: Enter opens dialog "Issues in deliveries.csv" (Close panel, Collapse Issues,
  Ignore in all columns, "Add nodes: 1 unknown end" pressed, Leave out, Ignore). Escape returns
  focus to the chip.

Enter, Tab and Escape in each field:

- Source, Target and the graph-value comboboxes: Tab into one opens its list
  (k1-keyboard/45.png). Escape closes the list and keeps the value. Enter on a closed combobox does
  nothing. Tab out with nothing typed changes nothing, as `decided.md` says.
- Checkbox "1 not in graph": Space narrows the table, and the live region says only "1 of 1 rows".
- "1 repeated key": Enter opens its menu, and Escape returns focus to the button.
- Escape anywhere on the join screen when no list is open cancels the whole join. Focus then falls
  to the inspector's "From pantries.csv", and Control+Z does not bring the draft back
  (k1-keyboard/75.png).
- F6 cycles through: the canvas, the canvas toolbar ("Analyze"), the "Resize table" separator, the
  left panel ("Add source"), and the inspector. The top bar is never reached.

## Mismatches between the answer key and the screen

1. "1 repeated key" is drawn as a warning glyph and a menu button, not as a chip like the other
   three. It opens a policy menu instead of narrowing to the repeated rows.
2. After the join, nothing on the forward path says a route was listed twice: Overview has no
   repeated-edge line, and the issue list names only "1 unknown end". So the second half of the
   answer ("one route is listed twice") can be read only on the join screen, before Join.
3. The second file's row says "17 of 19 rows joined", but only in its accessible name; the screen
   shows 18 edges. The two numbers answer "how many routes" differently.
4. Opened in the opposite order (deliveries.csv first), the same two files give 18 edges one way
   and 19 the other. The key's "Detour that still succeeds" expects the same end network either way.
5. Replace, which the key calls "not success", leaves the network looking the same as a join:
   13 nodes, 18 edges and every pantries column, with only one source listed.

## Defects

Paths are under `tmp/design-studio/tier4/r1/pilot/T61A/`.

1. Pointer: the "18 edges added" and "1 new node" chips do nothing when clicked, and only
   "1 not in graph" narrows the table (w1-success/07.png, 09.png). They are not Tab stops either.
2. Pointer and keyboard: the join chips are unnamed checkboxes, so the screen list reads four
   `input on`. The Join button has no description; the chips row is not its `aria-describedby`
   (w1-success/05.png; k1-keyboard/41.png).
3. Pointer: "1 not in graph" is drawn in smaller type than the other chips (w1-success/04.png).
4. Pointer: on the deliveries.csv source row the issue chip covers the edge-count chip, so "18"
   reads as a slash, a warning glyph and "8". The file name truncates to "delive..." first
   (w1-success/11.png, 13.png; d1-main-menu/12.png).
5. Pointer: after the join, pantries.csv's own issue chip ("2") is gone from its row, while the
   table still says "With issues 2" (w1-success/11.png).
6. Pointer: the deliveries.csv row's name repeats itself: "17/19 17 of 19 rows joined Node 13
   Edge 18 13 nodes, 18 edges". The issue chip has no tooltip (w1-success/13.png, 14.png).
7. Pointer: the second file's row counts 13 nodes, although it brought in one new node.
8. Pointer: the issue popover's "Add nodes" is a choice already applied, but it is drawn like a
   primary button that offers an action. It never names P13 (w1-success/17.png).
9. Pointer: after the join, the repeated route appears in no Overview line and no issue
   (w1-success/11.png, 18.png).
10. Detour d1: with Replace or "Open as a separate graph" chosen, the join screen's header still
    reads "Join deliveries.csv -> pantries.csv" (d1-main-menu/10.png, 14.png).
11. Detour d1: after Replace, Sources lists only deliveries.csv, but the network keeps every
    pantries column and row. Pantries' two issues are attributed to deliveries.csv
    (d1-main-menu/11.png, 12.png).
12. Detour d1: the new project from "Open as a separate graph" shows a notice from the old
    project, "Undid replacing deliveries.csv." (d1-main-menu/15.png).
13. Detours d1 and d2: the same two files give 18 edges on the forward join and 19 when
    deliveries.csv is opened alone or first. Only those orders list "1 repeated edge" and
    "Loaded weight trips" in Overview (d1-main-menu/15.png; d2-start-screen/09.png).
14. Detour d2: with deliveries.csv first, nothing after the join says that P13 is missing from
    the site list (d2-start-screen/09.png).
15. Detour d2: the start screen lists no earlier project, so a person who opened the two files
    as two projects has no visible way back to the first (d2-start-screen/07.png).
16. Detour d2: each time the start screen loads, a sample thumbnail request is blocked
    (`venice-transit.webp`, net::ERR_BLOCKED_BY_ORB) (d2-start-screen/03.png).
17. Detour d1: the Join split button's list draws a glyph only on "Replace pantries.csv"
    (d1-main-menu/05.png).
18. Keyboard: the start screen takes 13 Tabs, through the demo, before "Open a file"
    (k1-keyboard/14.png).
19. Keyboard: tabbing into Source column, Target column or either graph-value combobox opens its
    list, which covers the chips. "Rows are" does not open (k1-keyboard/45-48.png).
20. Keyboard: Enter on a closed join combobox does nothing.
21. Keyboard: Escape on the join screen with no list open cancels the whole join. Focus falls to
    the inspector's "From pantries.csv", and Control+Z does nothing; only the notice's Undo
    restores the draft (k1-keyboard/75.png).
22. Keyboard: F6 never reaches the top bar, and it stops on the "Resize table" separator, which
    `decided.md` says is never a region.
23. Keyboard: after Join the live region says "13 of 13 rows" twice. "1 not in graph" announces
    only "1 of 1 rows".
24. Keyboard: the issue popover's close button is named "Close panel" in a dialog called
    "Issues in deliveries.csv".
