# T37B pilot: a first look at Zachary's karate club

Build: ed4351b258 (frozen, served from `.study-builds/tier3-r1d1-ed4351b258`). Every walk starts
`empty`. The data stayed the karate club for the whole of every walk (34 nodes and 78 edges on the
Values tab, 34 rows in the table).

Result: the end was reached on all three walks. By pointer: 34 members, 78 ties, member 34 (Degree
17, "#1 of 34"). By keyboard: the same counts, announced when the sample opened, and member 34 at
the top of the table sorted on Degree.

## 1. Success path by pointer (`pointer/`)

| Step | Action | What the screen showed | Screenshot |
| ---- | ------ | ---------------------- | ---------- |
| 1 | No thanks | Consent notice gone; start screen | pointer/02.png |
| 2 | Zachary's karate club | Graph opens on the Values tab: Nodes 34, Edges 78, Degree histogram 1 to 17, Highest 17 (no name) | pointer/03.png |
| 3 | Analyze | Analysis list, Degree first ("How many edges each node has.") | pointer/04.png |
| 4 | Degree | A card with Run, "Under a second" | pointer/05.png |
| 5 | Run | Every node colored on an orange-to-brown ramp, a Degree layer added, legend "Color: Degree 1 to 17" | pointer/06.png |
| 6 | Click the darkest node (872,353) | Inspector: 34, Degree 17, Results "Degree 17, #1 of 34" | pointer/07.png |
| - | Click the other dark node (636,556) | Node 1, Degree 16, "#2 of 34": the two darkest look almost the same | pointer/08.png |
| 6-7 (table route) | Table, then the Degree header | Table opens in load order (Id, Degree); the header sorts highest first, 34 / 17 on top | pointer/09.png, pointer/11.png |

`--click "Degree"` with the table open was refused as ambiguous: three controls share the name
"Degree" (the table header, the Degree layer row, and the inspector's "Degree 16" row button)
(pointer/10.png). A person sees them in different places, so this is a tool naming fact, not a
participant problem.

## 2. Detours (`detours/`)

- **Consent notice left open; sample opened from the main menu.** Main menu opens with "New
  project" already highlighted (detours/02.png); Open sample submenu lists the four samples
  (03.png); the karate club opens the same as from the start screen (04.png). The unanswered
  consent notice is gone once a graph is open.
- **Hover a node to read it.** Pointer cursor, no tooltip, no visible change (05.png). Dead end.
- **Click the Highest row or the histogram.** Nothing happens (06.png, 07.png). "Highest 17" never
  says who.
- **Hover the Degree info button.** A popover explains degree (08.png). The tool prints `tooltip:
  null` because the popover is not a tooltip.
- **Find box: "most", "degree", then a rule.** "most" and "degree": "No match ... To select by a
  value, type a rule such as =id > `18`" (09.png, 11.png). Enter does nothing (10.png). The rule
  `=degree > \`16\`` answers "No column named "degree"" (12.png), although the Values tab shows a
  Degree section and every node's inspector shows a Degree row. Escape clears the box and keeps
  focus in it (13.png).
- **Data place.** Sources, Node table 34 rows, Edge table 78 rows; Attributes lists only `id`
  (14.png). The counts are readable here as well.
- **Right-click the biggest-looking node.** Context menu: Neighborhood, Path between, Frame
  selection, New layer from selection, Add note (15.png). The node (25) has Degree 3: the biggest
  sphere is the nearest, not the best connected. A left click shows id 25 and "Degree 3 >" in the
  inspector BEFORE any analysis ran (16.png). The Degree row opens the node's neighborhood
  ("25 and 3 connections", 17.png).
- **Table before a run.** Only an Id column, "Columns: 1 of 1" (19.png, 20.png). Dead end, though
  the inspector already shows each node's degree.
- **Search the analysis list in everyday words.** "connected" lists Eigenvector, PageRank,
  Connected components, Leiden, Shortest path and a disabled Guided route, but not Degree (21.png).
  "ties" lists HITS and the cluster analyses, not Degree (22.png). "most" highlights "Most flow",
  which is disabled ("Select 2 nodes first"), and Enter on it does nothing, with no message
  (23.png, 24.png). Tab moves to the clear button (25.png); Escape clears the filter (26.png); a
  second Escape closes the list and gives focus back to Analyze (27.png).
- **The analysis marked "Start here" (PageRank).** Runs, colors by PageRank 0.009565 to 0.1009 and
  adds a PageRank column to the table (28.png to 30.png). It points at member 34 as well, but gives
  no count of ties, so a participant who stops here cannot answer the question as asked.

## 3. Success path by keyboard only (`keys/`, keyboard-only and screen-reader mode)

Focus names, in order:

- Start: nothing focused (the page). Tab: Main menu, Local only, Settings..., Open project or
  file... Ctrl+O, New from data..., Open the Les Miserables sample, Open the Zachary's karate club
  sample, Open the College football sample, Open the Florentine families sample, What is collected
  (disclosure, collapsed), Share usage data, No thanks, then the page itself (end of the page).
- Shift+Tab to No thanks, Enter: focus to "Open project or file... Ctrl+O"; live: "Usage data stays
  off. Change this in Settings > Privacy".
- Tab Tab to "Open the Zachary's karate club sample", Enter: focus to button "Graph"; live:
  "Zachary's karate club: 34 nodes, 78 edges".
- Tab through the workspace: Graph Zachary's karate club, combobox Find, Add a layer or a folder,
  treeitem "Hovered, node layer, 0 nodes", Graph settings, separator "Resize left panel", Canvas
  "Graph drawing", Legend (pressed; the toolbar's one Tab stop), From Zachary's karate club, Graph
  actions, tab Values, About Direction, About Degree, separator "Resize inspector".
- In the toolbar, arrows move: Legend, View 3D, Layout, Analyze; ArrowLeft from Analyze wraps to
  "Quick actions" (the magnifier). Enter on Analyze: combobox "Filter analyses" expanded. ArrowDown
  highlights option "Degree". Enter: the Degree card, focus on Run. Enter on Run: focus back to
  Analyze; live: "Degree added, running", "Degree finished".
- Arrows to Table, Enter: focus goes to column header "Id". Tab from Id leaves the table for the
  inspector; ArrowRight goes to "Degree". Enter: "Degree, sorted descending"; live: "Sorted by
  Degree, highest first". ArrowDown: gridcell "17"; ArrowLeft: gridcell "34" (keys/35.png).

Focus never fell to the page body during the task. The only time it did was Tab past the last
control on the start screen, which is the end of the page.

## Mismatches with the answer key

- The key says the Graph's Values tab and the start card give the counts; both do. It also says
  the counts can only be read there and from the start card; the Data place (Node table 34 rows,
  Edge table 78 rows) and, by keyboard, the live announcement on opening also give them.
- The key lists the table before a run as having "only id and name"; for the karate club it has
  only Id (the sample has no name column).
- The key says the biggest-looking sphere on B is node 15, Degree 2; on this walk it was node 25,
  Degree 3. The layout is unseeded, so which node looks biggest varies from session to session.
- The key's list of routes that do not reach the name omits that a node's inspector already shows
  its degree before any run ("Degree 3 >", detours/16.png). It gives no rank, so clicking around
  can find 17 only by trying nodes one by one.

## Defects

1. **Highest gives no name.** The Values tab says "Highest 17", but neither the row nor the
   histogram can be clicked to show which node it is (detours/06.png, 07.png).
2. **Degree is shown but cannot be used in a rule.** Values shows a Degree section and every
   inspector shows a Degree row before any run, but `=degree > ...` in the find box answers "No
   column named "degree"" (detours/12.png), and the table has no Degree column until Degree is run
   (detours/19.png).
3. **The analysis filter misses everyday words for Degree.** "connected", "ties" and "most" do not
   list Degree, whose own description is "How many edges each node has" (detours/21.png to 23.png).
4. **Enter on a disabled highlighted analysis does nothing, with no message.** Filtering "most"
   highlights the disabled "Most flow" first; Enter is silently ignored (detours/24.png).
5. **"Start here" points at PageRank, not at the count of ties**, so a newcomer following the badge
   gets a score with no number of ties (detours/26.png, 30.png).
6. **The two darkest nodes look the same.** Degree 17 and 16 are drawn in nearly the same dark
   brown, so the first click can land on member 1, "#2 of 34" (pointer/06.png, 08.png).
7. **Hovering a node shows nothing**: no name and no degree, though the pointer cursor suggests
   something is there (detours/05.png).
8. **Table cells are named only by their value.** By keyboard, ArrowDown in the Degree column reads
   gridcell "17" with no row id; a screen-reader user must arrow left to hear "34" (keys/35.png).
9. **Tab from the table's first header leaves the table**: headers are reached only by arrow keys,
   and nothing says so (the walk's Tab from "Id" went to "From Zachary's karate club").
10. **The Attributes list does not show computed columns.** After Degree and PageRank runs, Data's
    Attributes still lists only `id` (detours/30.png).
