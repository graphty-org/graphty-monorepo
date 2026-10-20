# T37 B pilot: a first look at Zachary's karate club

Build 3ef9e6c1ec (graphty@0.8.68), frozen copy `.study-builds/tier3-r1d1-3ef9e6c1ec`. Every
session starts from the empty app. The earlier report for build ed4351b258 is kept as
`report-ed4351b258.md`. The data stayed the karate club's own on every walk: 34 nodes, 78 edges,
ids 1 to 34, with `id` as the only column. No earlier work was lost (`work.json` "gone" is
empty).

Result: reached by pointer. Counts read from the Values tab (Nodes 34, Edges 78). Member 34 was
named as the one with the most ties: Degree 17 matches "Highest 17", and after a run the screen
reads "17, #1 of 34". The keyboard walk was NOT finished (see "Not walked").

## 1. Success path by pointer (`success-3ef9/`)

| Step | Action | Screen | Shot |
| --- | --- | --- | --- |
| 1 | No thanks | Start screen; the karate card says "34 members" | 02 |
| 2 | Zachary's karate club | Values: Nodes 34, Edges 78, Degree Highest 17 (no name) | 03 |
| 3 | Click the central hub (871,311) | Inspector: 34, id 34, Degree 17 (matches Highest 17) | 04 |
| 4 | Analyze | Analysis list, Degree first, PageRank marked "Start here" | 05 |
| 5 | Degree | Card: "How many edges each node has: the most connected rank highest.", Run | 06 |
| 6 | Run | Every node colored 1 to 17, a Degree layer added, Legend on; the inspector adds "Results Degree 17, #1 of 34" by itself; the drawing stays put | 07 |
| 7 | Table | Table opens in load order (Id, Degree) | 08 |
| 8 | Degree header | "Sorted by Degree, highest first"; 34 / 17 on top, selected | 09 |

## 2. Detours by pointer (`detours-3ef9/`), the same set as round 1's pilot

- **Hovering a node** (04): pointer cursor, no tooltip, no label. Hovered counts 1, but nothing on the drawing changes.
- **The Values tab's Degree numbers** (05-07): clicking "Highest 17" or the histogram's tallest bar does nothing. "About Degree" opens a definition popover, which now shows without a tooltip on top of it, and covers the Lowest row while open (a decided behavior).
- **The find box** (08-16): `most` gives `No match for "most"`, with no hint; Enter does nothing (08, 09). `degree` offers "Degree, Select the 34 nodes" (10). `=degree > 16` gives "Did you mean Degree?" and "Degree > 16, Select the 1 node" (11). Tab moves to the clear button (12). Shift+Tab then Enter selects node 34, Degree 17. The line under the box reads "34 selected", although one node is selected (13). The first Escape empties the box (14); the second leaves the box and keeps the selection, as decided (15); a third on the canvas clears it: "Selection cleared: 1 node" (16).
- **The Data place and the table before a run** (17-22): Node table "34 rows, 34 nodes", Edge table "78 rows, 78 edges"; Attributes lists only `id` (17). The table shows only Id (18). "Columns: 1 of 1" is dimmed, with the tooltip "No other columns to show or hide" (19). Table options holds only Export (20). Escape closes that menu (21), and Close table restores the drawing (22).
- **Right-clicking the biggest-looking sphere** (23-26): it is node 25, Degree 3, a near node in 3D. The menu holds Neighborhood, Path between, Frame selection, New layer from selection and Add note (23). Escape closes only the menu (24, as decided). The "Degree 3" row opens "25 and 3 connections" (26, 28, 32) and selects them (25). Escape returns to node 25 (26).
- **The analysis filter** (27-31): `ties` lists HITS and the group finders, but not Degree (27). `most` lists Most flow first, dimmed ("Select 2 nodes first"), and highlights Degree (28). Enter opens the Degree card (29), and Escape returns to the list (30). Two more Escapes close it, with focus back on Analyze (31, 32).
- **Quick actions** (33-36): the tooltip reads "Quick actions Ctrl+K". `most connected` and `degree` both give "No results" (34, 35). Escape closes it and gives focus back to its button (36).
- **The main menu** (37, 38): Back to start, New project, Open, Open sample, the save commands, Export, Rename, Settings, Keyboard shortcuts and Help. Nothing in it is about counts or the most connected node.
- **Legend and Filters** (39-43): Legend now says "Nothing is styled yet" (39). Filters opens "New filter step" in the inspector (40). Its Attribute list offers only "Node id", not Degree (41). Escape closes the list (42); a second Escape closes the step and puts focus on the Filters "+" (43).

## 3. Success path by keyboard only (`keyboard-3ef9/`, screen-reader mode): NOT FINISHED

The walk was stopped after the start screen's Tab order. Each step took about 30 seconds with
the machine's load average at 42. Focus names reached, in order: nothing (the page), Main menu,
Local only, Settings..., Open project or file..., New from data..., Open the Les Miserables
sample, Open the Zachary's karate club sample, Open the College football sample, Open the
Florentine families sample, and the collapsed "What is collected" disclosure. That order matches
the decided order (the usage-data notice comes last). Opening the sample, the Analyze run, the
table sort and the Escape checks were not walked by keyboard on this build.

## Answer key against the screen

- The key says Enter on the find box's rule "announces only '1 node selected'". The line on
  screen reads "34 selected", which names the node by its id and reads like a count
  (`detours-3ef9/13.png`).
- The key says Filters' attribute list is "Node id, name, shared_chapters" (A). On B it holds only
  "Node id", and the step opens in the inspector, not on the Data place (`detours-3ef9/40.png`,
  `41.png`).
- The key's "Routes that do not reach the name" says "About Degree" opens its tooltip and its
  popover at once. Only the popover opens now (`detours-3ef9/07.png`).
- Everything else on the success path matched: the counts, Highest 17, Degree 17 on node 34, the
  card's text, "17, #1 of 34", and the sorted table.

## Defects

1. With the table open, the drawing is cut off at the top edge and pushed into the upper right
   (success, `success-3ef9/08.png`, `09.png`; detours, `detours-3ef9/18.png`). The decided rule
   only keeps the view from re-framing; part of the graph still ends up off screen.
2. After Enter on the find box's rule, the line "34 selected" reads as "34 nodes selected" when
   one node, id 34, is selected (detours, `detours-3ef9/13.png`).
3. Neither "Highest 17" nor the histogram says which node it is, and clicking them does nothing
   (detours, `detours-3ef9/05.png`, `06.png`).
4. Hovering a node shows no name and no highlight (detours, `detours-3ef9/04.png`).
5. The biggest-looking sphere is a near node in 3D (node 25, Degree 3) (detours,
   `detours-3ef9/23.png`).
6. Before a run, every node's inspector shows Degree and the find box accepts `degree`. The
   table, the Data place's Attributes and the filter step's Attribute list do not offer it
   (detours, `detours-3ef9/17.png`, `18.png`, `41.png`).
7. The filter step calls the column "Node id"; the Data place and the table call it "id" and "Id"
   (detours, `detours-3ef9/41.png`).
8. The find box answers `=degree` with "Did you mean Degree?", a question about letter case only
   (detours, `detours-3ef9/11.png`).
9. `most` in the find box gives "No match" with no hint, and Enter does nothing (detours,
   `detours-3ef9/08.png`, `09.png`).
10. The analysis filter does not list Degree for `ties` (detours, `detours-3ef9/27.png`).
11. Quick actions finds nothing for `degree` or `most connected` (detours, `detours-3ef9/34.png`,
    `35.png`).
12. Degree 17, 16 and 12 are drawn in nearly the same dark brown after the run (success,
    `success-3ef9/07.png`).

Fixed since round 1's pilot: Legend with nothing styled now says "Nothing is styled yet"; the
"About Degree" tooltip no longer sits on top of its own popover; the drawing no longer moves
when the run adds the key.

## Not walked

- The keyboard success path after the start screen: opening the sample by keyboard, Shift+A or
  Analyze, Degree, Run, the table sort and the Escape checks in the grid and the inspector. It
  was cut off because of slow steps under machine load. It must be walked again on this build.
