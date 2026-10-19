# Pilot: T37A, a first look at Les Miserables

Build: 5bd16cda6e (frozen, `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d1-5bd16cda6e`).
Three sessions, each from the empty start screen with clean storage, under `5bd16cda6e/`:
`pointer/`, `detours/`, `keyboard/`. Paths in this report are relative to `5bd16cda6e/`. The
earlier walk on build ed4351b258 stays beside them in `pointer/`, `detours/` and `keyboard/` (no
build folder), for comparison only.

The data stayed the sample's own the whole way: 77 nodes and 254 edges on every screen that shows
counts, the same characters in the table, the inspector and the neighbor list.

**Reached:** yes. By pointer in 3 steps (the shortest path) and 6 steps (the run path), plus 2 for
the sorted table. By keyboard: see section 3.

## 1. Success path by pointer (`pointer/`)

| Step | What was done | What the screen showed | Screenshot |
| ---- | ------------- | ---------------------- | ---------- |
| 1 | Start screen | Samples list "Les Miserables, 77 characters"; usage-data card at the bottom | `pointer/01.png` |
| 2 | No thanks | Card gone | `pointer/02.png` |
| 3 | Les Miserables | Graph opens; inspector on Graph, Values tab: Nodes 77, Edges 254, Degree histogram 1..36, "Highest 36" with no name. Undo and Redo greyed | `pointer/03.png` |
| 4 | Click the central node (766,410) | Inspector: Valjean, Node, Values tab; Summary id Valjean, name Valjean, "Degree 36 >". The shortest path ends here (36 = Highest 36) | `pointer/04.png` |
| 5 | Analyze (flask button in the bottom toolbar) | Analysis list with a "Filter analyses" box; Degree first under "Rank nodes and edges", described "How many edges each node has: the most connected rank highest." | `pointer/05.png` |
| 6 | Degree | A card: Degree, the same description, "Under a second", Run | `pointer/06.png` |
| 7 | Run | Every node colored on an orange-to-dark-brown ramp; "Color: Degree 1 .. 36" key top left; a Degree layer added; Valjean (still selected) now shows Results "Degree 36, #1 of 77"; Undo active | `pointer/07.png` |
| 8 | Table (toolbar) | Table below the drawing: Id, name, Degree, "In the order loaded", "Columns: 3 of 3"; Valjean's row highlighted near the bottom | `pointer/08.png` |
| 9 | Degree header | "Sorted by Degree, highest first"; Valjean 36 on top, then Gavroche 22, Marius 19 | `pointer/09.png` |
| 10 | Hover the second arrow in the Degree header | button "Options for Degree", no tooltip | `pointer/10.png` |
| 11 | Analyze again | The list holds "Degree" twice: under Recent and under Rank nodes and edges | `pointer/11.png` |
| 12 | Escape | List closes, focus ring on Analyze | `pointer/12.png` |

### Answer key against the screen

- Matches: the Values tab shows Nodes 77, Edges 254, "Highest 36" with no name; the start card
  says "77 characters"; a node's inspector shows "Degree 36" before any run, with no rank; the
  shortest path is 3 steps; Analyze > Degree > Run colors every node and adds a Degree layer;
  Valjean reads "36, #1 of 77"; Table then the Degree header sorts highest first with Valjean 36
  on top; after the run the analysis list holds two options named "Degree"; hovering a node shows
  nothing; the table before a run has only Id and name; the Data place lists id, name and
  shared_chapters; clicking Highest or the histogram shows no name.
- Mismatch: the key's routes that "do not reach the name" include the find box ('`degree` gives
  "No match"; a rule `=degree > 30` gives No column named "degree"'). On this build both lead
  somewhere: `degree` offers "Select by a value: graphty.degree, Select the 77 nodes" (Enter selects
  all 77), and `=degree > 30` says 'No column named "degree". Did you mean: graphty.degree > 30,
  Select the 1 node'; Enter selects Valjean, whose inspector shows Degree 36 (`detours/12.png`,
  `13.png`, `17.png`, `18.png`). Any word with no match ("most") now suggests the rule
  "graphty.degree > 19" (`detours/09.png`). The find box is a working (if expert) route to the
  name, and should be listed as one.
- Mismatch: the run path's step 6 "Click the darkest node" is not needed after a node was already
  clicked: the selection survives the run and the inspector gains "Results: Degree 36, #1 of 77"
  by itself (`pointer/07.png`). Harmless; the key does not say it.

## 2. Detours (`detours/`)

Each detour starts after No thanks and Les Miserables (`detours/01.png` to `03.png`), before any
analysis, as a newcomer who does not know the Analyze route would try.

| Detour | What was done | What happened | Screenshot |
| ------ | ------------- | ------------- | ---------- |
| Hover the biggest hub | Hover the central node (766,410) | Pointer cursor, no tooltip, no name, no visible hover change | `detours/04.png` |
| The Values tab | Click "Highest 36"; click the histogram's last bar (36) | Neither does anything: no name of who has 36 | `05.png`-`08.png` |
| The find box, a word | Type `most`, Enter, Escape | "No match for "most". To select by a value, type a rule such as graphty.degree > 19", the rule in code type. Enter does nothing more; Escape empties the box, focus stays in it | `09.png`-`11.png` |
| The find box, `degree` | Type `degree`, Enter | Offers "Select by a value: graphty.degree, Select the 77 nodes"; Enter selects all 77 and the box now reads "=graphty.degree". The selection's inspector: Nodes 77, "Edges joining these no..." (cut off), id and name "77 of 77 have a value" -- no Degree | `12.png`, `13.png` |
| The find box, a rule | Select all, type `graphty.degree > 30`, Enter; type `=degree > 30`, Enter; Tab; Escape, Escape | The first offers "Select the 1 node"; Enter selects Valjean (inspector: Degree 36, no rank). `=degree > 30` says 'No column named "degree". Did you mean: graphty.degree > 30'; Enter takes the suggestion. Tab moves to the clear button. First Escape empties the box (Valjean stays selected); the second clears the selection | `14.png`-`21.png` |
| The table before a run | Table; Columns | Only Id and name; "Columns: 2 of 2" lists only name. No Degree column to sort, although the inspector and the find box both know each node's degree | `22.png`, `23.png` |
| Right-click the hub | Escape, Table (closes it), right-click the central node | Selects it: inspector Valjean, Degree 36 (no rank) -- the answer is on screen with no run. Context menu: Neighborhood G, Path between... P, Frame selection F, New layer from selection, Add note N. Escape closes it and leaves a focus ring on the drawing | `24.png`-`27.png` |
| The inspector's Degree row | Click "Degree 36 >" | Opens the neighborhood: "Valjean and 36 connections", Hops 1/2/3, Filter to neighbors, the 36 names; the drawing rings the 36 neighbors. Escape goes back to Valjean | `28.png`, `29.png` |
| The Data place | Data | Sources: Les Miserables 77 nodes, 254 edges; Node table 77 rows; Edge table 254 rows; Attributes: Nodes id, name; Edges shared_chapters. No degree | `30.png` |
| The main menu | Main menu, Escape | Back to start, New project, Open..., Open sample, Save, Save as..., Save local copy..., Export..., Rename, Settings..., Keyboard shortcuts, Help. Nothing about the network's contents | `31.png`, `32.png` |

The data stayed the sample's own throughout (77 nodes, 254 edges, the same names).

## 3. Success path by keyboard only (`keyboard/`, screen-reader mode)

Started `empty --keys --sr`: every pointer step refused. Focus names as read from Chromium's
accessibility tree. Screenshots are numbered in step order.

| Step | Keys | Focus and what was announced | Screenshot |
| ---- | ---- | ---------------------------- | ---------- |
| 1 | (start) | nothing (the page itself) | `keyboard/01.png` |
| 2 | Tab x13 | Main menu, Local only, Settings..., "Open project or file...", New from data..., "Open the Les Miserables sample", "...Zachary's karate club sample", "...College football sample", "...Florentine families sample", DisclosureTriangle "What is collected" collapsed, Share usage data, No thanks, (wraps) Main menu | `02.png`-`14.png` |
| 3 | Shift+Tab, Enter | No thanks; focus moves to "Open project or file..."; live: "Usage data stays off. Change this in Settings > Privacy" | `15.png`, `16.png` |
| 4 | Tab, Tab | New from data..., "Open the Les Miserables sample" | `17.png`, `18.png` |
| 5 | Enter | The sample opens; focus lands on treeitem "Hovered, node layer, 0 nodes" (the first style layer); live: "Les Miserables: 77 nodes, 254 edges" | `19.png` |
| 6 | Tab x20 | Graph settings, separator "Resize left panel" value "240 pixels (min)", Canvas "Graph drawing", button "Analyze" collapsed (the bottom toolbar is one Tab stop), From Les Miserables, Graph actions, tab "Values" selected, About Direction, About Degree, separator "Resize inspector", Main menu, Project: Les Miserables, Local only, Graph, Graph Les Miserables, combobox "Find", Add a layer or a folder, treeitem Hovered, Graph settings, Resize left panel. Undo and Redo are skipped while disabled. Focus never fell to the page | `20.png`-`39.png` |
| 7 | Tab, Tab, Enter | Canvas "Graph drawing", Analyze; combobox "Filter analyses" expanded, nothing highlighted | `40.png`-`42.png` |
| 8 | ArrowDown, ArrowDown, ArrowUp | highlighted option "Degree", "Betweenness", "Degree" (a faint gray row on screen) | `43.png`-`45.png` |
| 9 | Enter | focus button "Run" (the Degree card) | `46.png` |
| 10 | Enter | focus back on "Analyze"; live: "Degree added, running", "Degree finished"; nodes colored, Degree layer added | `47.png` |
| 11 | ArrowRight x4, Enter | Layout, "View, 3D", Legend pressed, Table; the table opens and focus lands on its "Id" header | `48.png`-`52.png` |
| 12 | ArrowRight x2, Enter | name, Degree; then button "Degree, sorted descending"; live: "Sorted by Degree, highest first"; Valjean 36 on top | `53.png`-`55.png` |
| 13 | ArrowDown, ArrowLeft, ArrowLeft | gridcell "36", gridcell "Valjean", rowheader "Valjean" | `56.png`-`58.png` |
| 14 | Enter | live: "77 of 77 rows, 1 selected", "1 node selected"; the inspector shows Valjean, Degree 36, Results "Degree 36, #1 of 77" | `59.png` |
| 15 | Tab, Shift+Tab, Escape | Tab leaves the table for the inspector's "Node actions"; Shift+Tab comes back to rowheader "Valjean"; Escape: live "Selection cleared: 1 node", focus stays on the row | `60.png`-`62.png` |

**Keyboard reached the end:** yes. Valjean 36 at the top of the sorted table, and "#1 of 77" in
the inspector after Enter on the row. Focus never fell to the page body on this route.

Fields opened by keyboard, with Enter, Tab and Escape (`keyboard/63.png`-`77.png`):

- **Filter analyses** (Shift+A opens it): typing `deg` highlights option "Degree". Enter opens the
  Degree card with focus on its button, which after a run reads "Update Degree layer" instead of
  Run (`65.png`). Escape from the card goes back to the list with "deg" still typed. Tab from the
  box moves to "Clear search". Escape there empties the box and puts focus back in it with the
  list still open; a second Escape closes the list and returns focus to Analyze; a third does
  nothing. All as a person expects. (Shift+A pressed while the box already has focus types "A"
  into it, as any letter would.)
- **Find box** (walked by pointer, `detours/09.png`-`21.png`): Enter on a word with no match does
  nothing more; Enter on a suggestion takes it; Tab moves to the clear button; the first Escape
  empties the box and keeps focus, the second clears the selection.
- **Drawing** (`73.png`-`77.png`): Shift+Tab from Analyze reaches Canvas "Graph drawing". Enter,
  Space and Escape do nothing and announce nothing; ArrowRight turns the camera. No node can be
  reached or selected from the drawing by keyboard, so a keyboard user can name the most
  connected character only through the table (after a run) or the find box rule.

## 4. Defects found on the three walks

| # | Route | Defect | Screenshot |
| - | ----- | ------ | ---------- |
| 1 | Detours: find box | The find box's own hint and suggestions show an internal field path, `graphty.degree`, in code type ("type a rule such as graphty.degree > 19"; "Select by a value: graphty.degree"; 'No column named "degree". Did you mean: graphty.degree > 30'). A newcomer has never seen "graphty." anywhere else; the inspector, the Values tab and the table all say "Degree" | `detours/09.png`, `12.png`, `17.png` |
| 2 | Detours: find box, `degree` | Typing the word "degree" and pressing Enter selects all 77 nodes (the suggestion "graphty.degree, Select the 77 nodes" means "has a degree"), which answers nothing and replaces the selection. The selection's inspector then shows no Degree at all | `detours/12.png`, `13.png` |
| 3 | Detours: table before a run | The table has no Degree column (Id and name only; "Columns: 2 of 2"), although every node's inspector already shows Degree and the find box can select by it. The one place built for "who has the most" cannot sort by the value the screen already knows | `detours/22.png`, `23.png` |
| 4 | Detours: Values tab | "Highest 36" and the histogram's top bar name no one and do nothing when clicked. The count a newcomer reads first has no route to who holds it | `detours/05.png`-`08.png` |
| 5 | Detours: the inspector's Degree row | "Degree 36 >" looks like a value with a disclosure arrow, but clicking it replaces the selection with Valjean's 36 neighbors and opens a neighborhood view; nothing says it will | `detours/28.png` |
| 6 | Detours: hover | Hovering a node shows no name, tooltip or highlight; the pointer turns to a hand, which promises something | `detours/04.png` |
| 7 | Keyboard: drawing | Canvas "Graph drawing" takes focus but Enter, Space and the arrows reach no node; nothing is announced. A keyboard or screen-reader user cannot pick a node from the drawing | `keyboard/73.png`-`77.png` |
| 8 | Keyboard: opening the sample | After Enter on "Open the Les Miserables sample", focus lands on the first style layer, treeitem "Hovered, node layer, 0 nodes" -- a technical layer a newcomer did not ask for -- rather than on the graph or the top of the workspace. The same focus shows the Hovered row's lock and action icons to pointer users after a click on the sample | `keyboard/19.png`, `pointer/03.png` |
| 9 | Pointer: after the run | The analysis list shows "Degree" twice (under Recent and under Rank nodes and edges), two options with one name | `pointer/11.png` |
| 10 | Pointer: sorted table | The sorted Degree header shows two small arrows side by side: the sort arrow and an "Options for Degree" button with no tooltip; the second arrow looks like a duplicate of the first. | `pointer/09.png`, `pointer/10.png`, `keyboard/55.png` |
| 11 | Detours: selection inspector | The label "Edges joining these no..." is cut off at the inspector's default width | `detours/13.png` |
| 12 | Keyboard: Filter analyses | The highlighted option is a faint gray row, hard to see against the list | `keyboard/43.png`-`45.png` |

No script errors, failed requests or notices were printed on any walk.
