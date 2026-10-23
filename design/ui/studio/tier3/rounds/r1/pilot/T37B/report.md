# T37 B pilot: a first look at Zachary's karate club

Build e3c5bca8e6 (graphty@0.8.68), frozen copy `.study-builds/tier3-r1-e3c5bca8e6`. Three sessions,
each from the empty app: `r2-success/` (pointer), `r2-detours/` (pointer), `r2-keyboard/`
(keyboard only, screen-reader mode). Every session ended; no earlier work was lost (`work.json`
"gone" is empty in all three). The data stayed the karate club's own throughout: 34 nodes,
78 edges, ids 1 to 34, only the `id` column.

Result: reached on all three walks. Counts read from the screen (Nodes 34, Edges 78) and member
34 named as the most connected (Degree 17, "17, #1 of 34" after a run).

## 1. Success path by pointer (`r2-success/`)

| Step | Action | Screen | Shot |
| --- | --- | --- | --- |
| 1 | No thanks | start screen, karate card "34 members" | 02 |
| 2 | Zachary's karate club | Graph Values: Nodes 34, Edges 78, Degree Highest 17 (no name) | 03 |
| 3 | Click the central hub node | Node 34: id 34, Degree 17 (matches Highest 17) | 04 |

Run path, continued in the same session: Analyze (05); "Degree" is ambiguous for the tool with
the inspector's "Degree 17" row (06); the Degree option opens a card with Run (07); Run colors
every node, adds a Degree layer, Legend turns on, the selected node's inspector adds
"Results: Degree 17, #1 of 34" by itself (08); Table opens with Id and Degree columns (09);
clicking the Degree header sorts highest first, 34 / 17 on top, "Sorted by Degree, highest
first" (10). Find box after the run: `degree > 16` offers "Degree > 16, Select the 1 node
(Degree above 16)" (11); Enter selects 1 node and keeps `degree > 16` in the box (12); Escape
empties the box (13), second Escape leaves it with the node still selected (14), third clears
"Selection cleared: 1 node" (15).

## 2. Detours by pointer (`r2-detours/`)

- **Hover a node** (04): pointer cursor, no tooltip, no label; Hovered counts 1 but the drawing
  shows nothing.
- **The Values tab's Degree numbers** (05-07): clicking "Highest 17" and the histogram's top bar
  does nothing; "About Degree" opens a definition popover (and its tooltip shows at the same time,
  above it). Nowhere says which node is the 17.
- **The search box** (08-15): `most` gives "No match for "most"" and Enter does nothing (09, 10);
  `degree` offers "Degree, Select the 34 nodes" (11); `=degree > 16` shows "Did you mean
  Degree?" and "Degree > 16, Select the 1 node" (12); Tab moves to the clear button with the
  suggestion still shown (13); Shift+Tab, Enter selects node 34, Degree 17 (14); three Escapes
  clear it (15).
- **The Data place and the table before a run** (16-22): Node table "34 rows, 34 nodes", Edge
  table "78 rows, 78 edges"; Attributes lists only `id`. The table shows only Id; "Columns: 1 of 1"
  is dimmed with the tooltip "No other columns to show or hide" (18, 19); Table options holds
  only Export (20).
- **Right-click the biggest-looking sphere** (24-27): it is node 25, Degree 3 (a near node in 3D);
  the menu holds Neighborhood, Path between, Frame selection, New layer from selection, Add note;
  Escape closes it (25). Clicking "Degree 3" opens "25 and 3 connections" and selects 4 nodes
  (26); Escape returns to node 25 (27).
- **The analysis filter** (28-31): `ties` lists HITS and the group finders, no Degree (28); `most`
  lists Most flow first, dimmed ("Select 2 nodes first"), with Degree highlighted (29); Enter opens
  the Degree card (30); Escape returns to the list (31).
- **Quick actions** (32-36): tooltip "Quick actions Ctrl+K"; `most connected` and `degree` both
  "No results"; Escape closes it and focus returns to its button.
- **Main menu** (37, 38): Back to start, projects, save, export, settings, help: nothing about
  the network's counts or its most connected node.
- **Legend and Filters on the toolbar** (39-44): Legend shows as pressed and draws nothing (no
  styling yet), with no message; Filters switches to Data and opens "New filter step", whose
  Attribute list offers only "Node id" (41); Escape closes the list (43), a second Escape closes
  the step and puts focus on the Filters "+" (44).

## 3. Success path by keyboard only (`r2-keyboard/`, screen-reader mode)

Start: nothing focused. Tab: Main menu, Local only, Settings..., Open project or file..., New from
data..., the four samples ("Open the Zachary's karate club sample"), "What is collected"
(DisclosureTriangle), Share usage data, No thanks, then wraps to Main menu (01-14). Shift+Tab,
Enter on No thanks: focus moves to "Open project or file...", live "Usage data stays off..."
(15, 16). Tab x3 to the karate sample, Enter: focus on heading "Graph, Zachary's karate club:
34 nodes, 78 edges", live "Zachary's karate club: 34 nodes, 78 edges" (17-20).

Shift+Tab: button "Analyze" collapsed, Canvas "Graph drawing", separator "Resize left panel"
(21-23). ArrowRight on the canvas turns the camera with nothing announced (25). Enter on Analyze:
combobox "Filter analyses"; typing `degree` highlights "Degree"; ArrowDown highlights "Steps
away" disabled (29); ArrowUp, Enter: button "Run Degree" (30-32). Enter: live "Degree added,
running", "Degree finished"; focus back on Analyze (33). ArrowRight x4: Layout, "View, 3D",
"Legend" pressed, "Table" (34-37). Enter: focus on button "Id" (38); Tab leaves to "From
Zachary's karate club" (39); Shift+Tab, ArrowRight: "Degree"; Enter: "Degree, sorted descending",
live "Sorted by Degree, highest first" (40-42). ArrowDown: gridcell "17"; ArrowLeft: rowheader
"34"; Enter: "34 of 34 rows, 1 selected", "1 node selected" (43-45). Tab: Node actions, tab
Values, button "Degree 17", separator "Resize inspector", Main menu (46-50). Browse read of the
inspector: heading "34", "Degree 17", Results "Degree 17, #1 of 34" (51). Escape on "Degree 17"
(52): focus stays, selection stays. Escape in the grid (55): focus to "Table" pressed, as decided.

Focus never fell to the page body on this walk.

## Answer key against the screen

- Find box after a run: the key says the suggestion is `results.degree.value > 16` and Enter
  rewrites the box to `=results.degree.value > 16`; the screen offers "Degree > 16, Select the 1
  node (Degree above 16)" and keeps `degree > 16` (`r2-success/11.png`, `12.png`).
- Find box before a run: the key says `=degree > 16` gives 'No column named "degree". Did you
  mean: graphty.degree > ...'; the screen shows "Did you mean Degree?" and "Degree > 16, Select
  the 1 node"; `degree` alone offers "Degree, Select the 34 nodes", not "graphty.degree"
  (`r2-detours/11.png`, `12.png`).
- "Columns: 1 of 1": the key says it opens an empty popover; it is now dimmed with the tooltip
  "No other columns to show or hide" (`r2-detours/18.png`, `19.png`).
- Analysis filter `most`: the key says Most flow is first and Enter opens it with Source and Sink
  filled; Most flow is first but dimmed ("Select 2 nodes first") with one node selected, and the
  highlight and Enter go to Degree (`r2-detours/29.png`, `30.png`).
- The Degree card's button: the key says it is named only "Run"; its name is "Run Degree"
  (`r2-keyboard/31.png`).
- Hovering a node: the key says Hovered stays 0 (dry run); the layer now counts 1, but the
  drawing still shows nothing (`r2-detours/04.png`).
- The drawing at opening fills the middle of the canvas, not its right two thirds
  (`r2-success/03.png`).

## Defects

1. Escape on a node's inspector does not clear the selection: focus stays on "Degree 17",
   Selected stays 1, nothing announced; decided.md says it clears (keyboard,
   `r2-keyboard/52.png`).
2. Highest 17 and the histogram name nobody, and neither can be clicked to find the node
   (detours, `r2-detours/05.png`, `06.png`).
3. Hovering a node shows no name or highlight (detours, `r2-detours/04.png`).
4. The biggest-looking sphere is a near node in 3D (node 25, Degree 3), inviting a wrong answer
   (detours, `r2-detours/24.png`).
5. Degree is shown on every node's inspector and in the find box before a run, but the table,
   the Data place's Attributes and the filter step's Attribute list do not offer it
   (detours, `r2-detours/16.png`, `17.png`, `41.png`).
6. The filter step's Attribute list calls the column "Node id" while the Data place and the
   table call it "id" / "Id" (detours, `r2-detours/41.png`).
7. The find box answers `=degree` with "Did you mean Degree?", a question about letter case
   only (detours, `r2-detours/12.png`).
8. A word in the find box (`most`) gives "No match" with no hint, and Enter does nothing
   (detours, `r2-detours/09.png`, `10.png`).
9. The analysis filter does not list Degree for `ties` (detours, `r2-detours/28.png`).
10. Quick actions finds nothing for `degree` or `most connected`, though Degree is an analysis
    (detours, `r2-detours/33.png`, `34.png`).
11. Legend turns pressed with nothing to show and no message (detours, `r2-detours/39.png`).
12. The "About Degree" tooltip shows on top of its own open popover, which covers the Lowest row
    (detours, `r2-detours/07.png`).
13. A table cell reads "17" with no column or row name; only ArrowLeft to the row header tells
    which node (keyboard, `r2-keyboard/43.png`).
14. Selecting the row announces "1 node selected" but not the node or its rank; the result
    "Degree 17, #1 of 34" is not a Tab stop and is found only by browse reading (keyboard,
    `r2-keyboard/45.png`, `51.png`).
15. Tab from the table's header leaves the table for the inspector's "From Zachary's karate
    club" link; nothing says the arrows move through the grid (keyboard, `r2-keyboard/39.png`).
16. Arrow keys in the analysis list stop on a disabled option ("Steps away") (keyboard,
    `r2-keyboard/29.png`).
17. ArrowRight on the canvas turns the camera with nothing announced (keyboard,
    `r2-keyboard/25.png`).
18. With the table open the drawing stays in the upper right, leaving most of the canvas empty
    (success, `r2-success/09.png`).
19. The three best-connected nodes (17, 16, 12) are drawn in nearly the same dark brown after
    the run (success, `r2-success/08.png`).

## Not walked

Nothing on the task's routes was skipped.
