# Pilot: T37A, a first look at Les Miserables

## Build 6de5f95d12 (targeted re-pilot)

Build: 6de5f95d12 (frozen, `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d1-6de5f95d12`).
Three sessions, each from the empty start screen with clean storage: `6de5f95d12/pointer/`,
`6de5f95d12/detours/` and `6de5f95d12/keyboard/` (keyboard only, screen-reader mode). Paths below
are relative to `6de5f95d12/`.

None of the routes the last fix pass touched belongs to T37A: they are the routes of T50A, T50B,
T46A, T46B, T47, T48, T45A, T38, T41 and T51 (opening a saved project, Control+O on the start page
or over an open graph, dropping a file, a layer from a find-box selection, Replace, the table's
Nodes tab after a community run). Each is walked by its own task's pilot. The one fix that reaches
a T37A screen is the table's cell text for a community run's groups; T37A's table shows a Degree
run, and its Degree cells still read as plain numbers (36, 22, 19, ...) on all three walks
(`pointer/11.png`, `detours/35.png`, `keyboard/55.png`).

The data stayed the sample's own the whole way: 77 nodes and 254 edges on the card and the Values
tab, 77 rows in the table, the same characters in the table and the inspector.

**Reached:** yes, in 3 steps (Samples, the card, a click on the central node: Valjean, Degree 36 =
Highest 36), and by the run path (Analyze, Degree, Run: "Degree 36, #1 of 77"; Table, the Degree
header: Valjean 36 on top).

| Step | What was done | What the screen showed | Screenshot |
| ---- | ------------- | ---------------------- | ---------- |
| 1 | Start screen | Start page: "Open a file", "Open network data", "Samples", "New project"; the demo drawing with Communities, Key players, Shortest path. No usage-data card | `pointer/01.png` |
| 2 | Samples (the button; a link "Samples" in the top bar shares the name) | Sample library: 19 real networks, filters, cards. Every card's picture is a broken-image icon | `pointer/03.png` |
| 3 | The card "Who holds the novel together" (Les Miserables -- 77 nodes, 254 edges) | Workspace opens; inspector Graph, Values: Nodes 77, Edges 254, Degree histogram 1..36, Highest 36 (no name). A notice: "This looks like a private window: your work is gone when it closes. Save a copy to a file to keep it." | `pointer/04.png` |
| 4 | Click the central node (766,410) | Inspector: Valjean, Node; id Valjean, name Valjean, "Degree 36 >". Shortest path ends here | `pointer/05.png` |
| 5 | Analyze | "Filter analyses" list, Degree first under "Rank nodes and edges" | `pointer/06.png` |
| 6 | Degree (the option; "Degree 36" in the inspector shares the name) | The Degree card: description, "Under a second", Run | `pointer/08.png` |
| 7 | Run | Every node on an orange-to-brown ramp; "Color: Degree 1 .. 36" key; a Degree layer (77); the drawing moved right; Valjean still selected, Results "Degree 36, #1 of 77" | `pointer/09.png` |
| 8 | Table | Nodes table, "In the order loaded", Id, name, Degree, "Columns: 3 of 3"; Valjean's row highlighted | `pointer/10.png` |
| 9 | The Degree header | "Sorted by Degree, highest first"; Valjean 36, Gavroche 22, Marius 19, Javert 17 | `pointer/11.png` |

### Answer key against the screen

- Mismatch: the key says "A's card gives no counts" and that the start page holds a samples list
  with a usage-data card. On this build the start page has no usage-data card and reaches the
  samples through a "Samples" button that opens the Sample library, where A's card reads "Les
  Miserables -- 77 nodes, 254 edges" (`pointer/01.png`, `pointer/03.png`). The counts are now on
  the card before the graph opens, as B's always were.
- Everything else on the success path matches: Values tab Nodes 77, Edges 254, Highest 36 with no
  name; Degree 36 in the inspector before a run, with no rank; the run colors every node, adds a
  Degree layer, shows the key and moves the drawing right; the still-selected Valjean gains
  "Degree 36, #1 of 77" by itself; the sorted table puts Valjean 36 on top.

### Defects on this walk

| # | Route | Defect | Screenshot |
| - | ----- | ------ | ---------- |
| 1 | Success path, Sample library | Every card's thumbnail is a broken-image icon. The pictures are fetched from `https://graphty.app/data/graph-samples/v1/<name>.webp`, which answers 404 with an HTML page (checked with curl), so the browser blocks them (`ERR_BLOCKED_BY_ORB`, printed as failed requests). It does not block the task -- the card titles and counts still read -- but every participant sees a page of broken images first | `pointer/03.png` |
| 2 | Success path, the opened sample | The notice "This looks like a private window: your work is gone when it closes" appears over the drawing on opening a sample. In the study's headless browser that is what the app detects; it does not block T37A, but it tells a first-time participant their work is at risk before they have done any | `pointer/04.png` |

No script errors or console errors were printed; the only failed requests were the thumbnails
above.

### Detours on 6de5f95d12 (`detours/`)

The same detour set as the full pilot on 5bd16cda6e (section 2 below), each from the opened sample
before any analysis (`detours/01.png`-`03.png`), plus the analysis list and table after a run.

| Detour | What was done | What happened | Screenshot |
| ------ | ------------- | ------------- | ---------- |
| Hover the biggest hub | Hover the central node | Pointer cursor, no tooltip, no name | `detours/04.png` |
| The Values tab | Click the histogram's last bar; hover it; click the "Highest 36" row | Nothing happens; no name of who has 36 | `06.png`-`08.png` |
| The find box, a word | Type `most`, Enter, Escape | 'No match for "most". To select by a value, type a rule such as name == 'Napoleon''. Enter does nothing more; Escape empties the box and keeps focus in it. (The old hint `graphty.degree > 19` is gone) | `09.png`-`11.png` |
| The find box, `degree` | Type `degree`, Enter | Offers "Degree, Select the 77 nodes" (no more `graphty.` prefix); Enter selects all 77, keeps `degree` in the box; the selection's inspector now shows "Degree 1 to 36" and the whole label "Edges joining these nodes" | `12.png`, `13.png` |
| The find box, a rule | Control+A, type `=degree > 30`, Enter, Tab, Shift+Tab, Escape x3 | "Did you mean Degree?" and "Degree > 30, Select the 1 node"; Enter selects Valjean (inspector Degree 36, no rank; the camera glides to him, as decided) and says "Valjean selected". Tab goes to the clear button. Escape 1 empties the box, Escape 2 moves focus to the drawing with Valjean still selected, Escape 3 clears the selection ("Selection cleared: 1 node") | `14.png`-`19.png` |
| The table before a run | Table; Columns | Only Id and name; "Columns: 2 of 2" lists only name | `20.png`, `21.png` |
| Right-click the hub | Escape, Table (closes), right-click the central node | Selects Valjean, inspector Degree 36; menu Neighborhood G, Path between... P, Frame selection F, New layer from selection, Add note N; Escape closes it | `22.png`-`25.png` |
| The inspector's Degree row | Click "Degree 36 >"; Escape | "Valjean and 36 connections", Hops, Filter to neighbors, the 36 names; Selected 37. Escape returns to Valjean | `26.png`, `27.png` |
| The Data place | Data | Les Miserables 77 nodes, 254 edges; Node table 77 rows; Edge table 254 rows; attributes id, name; shared_chapters. No degree | `28.png` |
| The main menu | Main menu, Escape | Back to start, New project, Open project or file... Ctrl+O, Open sample, Save, Save as..., Save local copy..., Export..., Rename, Settings..., Keyboard shortcuts, Help | `29.png`, `30.png` |
| After a run | Analyze, Degree, Run Degree, Analyze, Escape, Table | Every node on the orange ramp, Valjean "36, #1 of 77". The list holds "Degree" under Recent and again under Rank nodes and edges. The table's Degree column holds plain counts | `31.png`-`35.png` |

The data stayed the sample's own throughout (77 nodes, 254 edges, the same names).

### Keyboard on 6de5f95d12 (`keyboard/`, `--keys --sr`)

| Step | Keys | Focus and what was announced | Screenshot |
| ---- | ---- | ---------------------------- | ---------- |
| 1 | (start) | nothing (the page itself); a region already holding "Colored by community: 6 groups..." (the demo) marked unconfirmed | `keyboard/01.png` |
| 2 | Tab x16 | Main menu, link Samples, Docs, For developers, GitHub, Switch to dark mode, Settings..., Canvas (the demo drawing, a full sentence name), Communities pressed, Key players, Shortest path, 2D, Pause the turning, "Open a file CSV, GraphML, GEXF, Cytoscape, or a saved project", Open network data, Samples | `02.png`-`17.png` |
| 3 | Tab, Tab, Shift+Tab x2, Enter | New project, MIT licensed on GitHub, back to button Samples; Enter scrolls to the Sample library and focus stays on Samples | `18.png`-`22.png` |
| 4 | Tab x16 | New project, MIT licensed on GitHub, Put it on your own site, searchbox "Search samples", Grid pressed, List, Any pressed, Social ... Generated, button "Open the Les Miserables sample" | `23.png`-`38.png` |
| 5 | Enter | focus heading "Graph, Les Miserables: 77 nodes, 254 edges"; live "Les Miserables: 77 nodes, 254 edges", then the private-window notice | `39.png` |
| 6 | Shift+A, ArrowDown, Enter, Enter | combobox "Filter analyses"; highlighted option "Degree"; button "Run Degree"; focus back on Analyze, live "Degree added, running", "Degree finished" | `40.png`-`43.png` |
| 7 | ArrowRight x4, Enter | Layout, "View, 3D", Legend pressed, Table; the table opens, focus on header "Id" | `44.png`-`48.png` |
| 8 | ArrowRight x2, Enter | name, Degree; "Degree, sorted descending", live "Sorted by Degree, highest first" | `49.png`-`51.png` |
| 9 | ArrowDown, ArrowLeft x2, Enter | gridcell "36", gridcell "Valjean", rowheader "Valjean"; Enter: live "77 of 77 rows, 1 selected", "Valjean selected"; the inspector shows Valjean, Degree 36, Results "36, #1 of 77" | `52.png`-`55.png` |
| 10 | --read | The table region reads the sorted rows: Valjean 36 selected, Gavroche 22, Marius 19, Javert 17 ... | `56.png` |
| 11 | Escape | focus to the toolbar's "Table" pressed (as decided) | `57.png` |

**Keyboard reached the end:** yes. Focus never fell to the page body on this route.

Fields opened by keyboard, with Enter, Tab and Escape:

- **Filter analyses** (`58.png`-`66.png`): Shift+A, type `deg` highlights Degree. Tab takes it (as
  decided) and opens the Degree card with focus on "Update Degree layer", which is disabled ("Degree
  is up to date with these settings"). Shift+Tab goes to "Back to analyses". The first Escape there
  does nothing (`62.png`: card still open, focus unchanged); the second returns to the list with
  "deg" still typed; the third empties the box and keeps the list open; the fourth closes it and
  returns focus to Analyze; a fifth does nothing.
- **Find box** (`67.png`-`76.png`): F6 from Analyze goes to the table grid, F6 again to the left
  panel, Tab to combobox "Find". Typing `=degree > 30` highlights "Degree > 30 Select the 1 node
  (Degree above 30)" and says "Did you mean Degree > 30?". Enter: "Valjean selected", the text
  stays. Tab: "Clear search"; Shift+Tab back. Escape 1 empties the box, Escape 2 moves focus to
  Canvas "Graph drawing" with Valjean selected, Escape 3: "Selection cleared: 1 node". All as
  decided.

### Defects on the three walks (6de5f95d12)

Nothing crashed, nothing blocked the task, and nothing gave a wrong result: every route that
names someone names Valjean 36, and the counts read 77 and 254 everywhere.

| # | Route | Defect | Screenshot |
| - | ----- | ------ | ---------- |
| 1 | All walks, Sample library | Every card's thumbnail is a broken-image icon (`https://graphty.app/data/graph-samples/v1/<name>.webp` answers 404 with an HTML page; failed requests `ERR_BLOCKED_BY_ORB`). Titles and counts still read | `pointer/03.png`, `keyboard/22.png` |
| 2 | All walks, the opened sample | "This looks like a private window: your work is gone when it closes" shows (and is announced) on opening a sample in the study browser | `pointer/04.png`, `keyboard/39.png` |
| 3 | Keyboard, the Degree card | Escape on "Back to analyses" does nothing the first time; a second Escape is needed to leave the card | `keyboard/61.png`, `62.png` |
| 4 | Keyboard, the Degree card after a run | Picking Degree again puts focus on a disabled button, "Update Degree layer" (announced "disabled") | `keyboard/60.png` |
| 5 | Detours, after a run | The analysis list holds two options named "Degree" (Recent and Rank nodes and edges) | `detours/34.png`, `keyboard/64.png` |
| 6 | Detours, Values tab and table | Unchanged from the earlier pass and recorded in the answer key as routes that do not reach the name: "Highest 36" and the histogram name no one; the table before a run has no Degree column; hovering a node shows nothing | `detours/04.png`-`08.png`, `20.png`, `21.png` |

Fixed since 5bd16cda6e: the find box no longer shows the field path `graphty.degree` (defect 1
below), and the selection inspector's "Edges joining these nodes" is no longer cut off (defect 11).

## Build 6de5f95d12, second targeted re-walk (`6de-r2/`)

Paths below are relative to `6de-r2/`. Every session started from the empty start screen with clean storage.

- **Success path by pointer (`pointer/`), reached:** Samples, the card "Who holds the novel together" (Les Miserables -- 77 nodes, 254 edges), Values: Nodes 77, Edges 254, Highest 36 (`03.png`); a click on the central node: Valjean, Degree 36 (`04.png`); Analyze, Degree, Run Degree: every node on the orange ramp, Degree layer 77, Results "36, #1 of 77" (`07.png`); Table, the Degree header: Valjean 36 on top (`09.png`).
- **Detours (`detours/`), the same set as the earlier walks:** hovering the hub shows nothing (`04.png`); the histogram and "Highest 36" name no one (`05.png`-`07.png`); `most` gives "No match" with the `name == 'Napoleon'` hint (`09.png`); `degree` selects all 77 (`12.png`); `=degree > 30` offers "Degree > 30, Select the 1 node", and Enter selects Valjean (`13.png`, `14.png`); Escape x3 empties the box, moves focus to the canvas, then clears the selection, as decided (`17.png`-`19.png`); the table before a run shows only Id and name (`20.png`); a right-click on the hub opens its menu (`23.png`); the inspector's Degree row opens "Valjean and 36 connections" (`25.png`); Data lists no degree (`27.png`); the main menu (`28.png`); after a run the analysis list holds "Degree" twice (`33.png`); the table holds plain counts (`35.png`).
- **Keyboard (`keyboard/`, keys only, screen-reader mode), reached:** Tab x16 to Samples, Enter, Tab x20, Shift+Tab x4 to "Open the Les Miserables sample", Enter (heading "Graph, Les Miserables: 77 nodes, 254 edges"), Shift+A, ArrowDown, Enter, Enter ("Degree finished"), ArrowRight x4 to Table, Enter, ArrowRight x2, Enter (sorted), ArrowDown, ArrowLeft x2, Enter ("Valjean selected"); Escape goes to Table, as decided. Focus never fell to the page body.
- **T50A success path (`t50a-success/`), fixed:** lesmis-poster opens with its look: Poster layer, 3 orange dots, key "Color: Poster, 3 of 77 nodes" (`02.png`); Which nodes "name contains Mlle, 3 nodes" (`03.png`); Values members MlleBaptistine, MlleGillenormand, MlleVaubois (`04.png`); the card opens unchanged, and Enter and Escape close it with the rule unchanged (`06.png`-`09.png`); an orange node's "Why this look" opens the Poster layer (`11.png`, `12.png`). `styles.json` changes.changed is empty.

### Defects (still present; none blocks T37A or spoils its grading)

1. Sample library thumbnails are broken images: `graphty.app/data/graph-samples/v1/*.webp` fails with `ERR_BLOCKED_BY_ORB` (`pointer/02.png`).
2. The private-window notice shows and is announced when a sample opens (`keyboard`, after the card's Enter).
3. Keyboard: Tab from "Filter analyses" with "deg" typed opens the Degree card with focus on the disabled "Update Degree layer"; the first Escape on "Back to analyses" does nothing (`keyboard/64.png`-`66.png`).
4. After a run the analysis list holds two options named "Degree" (`detours/33.png`).
5. With the table open, F6 cycles inspector, canvas, toolbar, table, left panel and never reaches the top bar; decided lists the top bar as an F6 region (`keyboard/`, F6 steps after `70.png`).

### Not walked in this pass

No browser slot came free (all four were held by other sessions) before the run had to stop: T50A detours, T50B success path, T50B detours and keyboard, a project saved before the golden merge opened on the new build (beyond lesmis-poster, which opened with its look), T46A and T46B table Nodes tab after Louvain, T47/T48 table routes, T45A Control+O > Replace after a hand-picked layer, T38/T41/T51 find-box layer then Control+O > Replace, and T45A success path.

## Build 5bd16cda6e (earlier full pilot, kept for comparison)

Three sessions under `5bd16cda6e/`: `pointer/`, `detours/`, `keyboard/`. Paths in this section are
relative to `5bd16cda6e/`.

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
