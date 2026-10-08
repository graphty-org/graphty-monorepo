# Digest: standing decisions, owner feedback, reversals and open questions

What the graphty app's design studio has decided so far, what the owner (Adam Powers, the project's author) said, which decisions were later reversed, and what still waits on the owner. It condenses the studio's record up to 2026-10-06.

Source root (abbreviated `P/` below): `/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/`

- `P/owner-feedback.md` -- the owner's words and decisions (the highest authority; "never record an owner decision that is not in this file")
- `P/study/owner-feedback-log.md` -- what the studio did with each owner item, by round
- `P/study/decision-log.md` -- studio decisions per round (rounds 1-8), each with why, plus "considered and rejected"
- `P/framework-changes.md` -- proposed edits to `design/ui/framework/` (900 KB; late sections "After round 5/6/7", "graphty-element requirements from round 7/8", "Open decisions for the owner" at line ~3009)
- `P/study/structure-comparison/structure-b-refined.md` -- the current app structure ("refined structure B", version 5), the spec the clickable skeleton implements
- `P/study/structure-comparison/state-matrix.md` -- every skeleton surface against ten states
- `P/study/structure-comparison/element-requirements-5.md` -- what graphty-element, graph-io and graph-format must add (nothing of it is built in the app)

All study participants in rounds 1-8 were SIMULATED personas, not real people. Rounds 1-6 ran on static HTML mocks (`P/screens`, `P/flows`, `P/storyboards`); rounds 7-8 ran on the clickable skeleton `P/app-b/` served at `http://dev.ato.ms:9825/app-b/#/<section>/<state>` and checked with `node app-b/study.mjs --check | --try | --matrix`.

## 1. Where things stand (2026-10-06)

- Current focus: TIER 1, a first-time user's core path, from an empty app with no project open (owner, 2026-10-02, `P/owner-feedback.md` last section). Tier 1 tasks: bring in your own file or pick a sample; read what loaded; run an analysis (rank, find groups); color or size by a value; labels from a field; a readable layout; find a node (and its neighbors); save a picture and the numbers; save and reopen the project; and one whole first session chained end to end. A sample-data picker on the start screen is part of tier 1. Tier 2 (common repeat work): filter, shortest chain, notes, several tables, weight at load, rerun on new data. Specialized work (combining sets, comparing results, recipes, very wide data, nested documents, the Assistant, no WebGPU) waits until tier 1 meets its bars. At least 60% of sessions go to tier 1; first-time personas take tier 1 first; studio changes go to tier 1 problems until tier 1 passes.
- Success bars used in rounds 7-8 (`P/study/decision-log.md` Round 7 and Round 8 "Targets"): every task >= 80% graded success (success or success-with-difficulty); no confirmed severity-4 problem unresolved; mean ease (SEQ) >= 5.5 of 7; every tree-test task >= 70% direct success (correct, no backtracking).
- Round 8 results (`P/milestones/08.md`, decision log Round 8): no bar met. 83% of sessions succeeded (90% without four tasks decided by skeleton defects); mean ease 4.28 (from 3.54). Tier 1: 75% overall, 86% without the whole-first-session task. Failing tier 1 tasks: whole first session 0 of 21 (14 stalled on a Betweenness run that never finished, 16 on a canvas that did not repaint); labels from a field 42% (5 of 12); find a node and its neighbors 0 of 12. Picking a sample: 100%. All tier 2 tasks passed (96%). Tree test 68% direct; select-by-a-rule stuck at 10%. First click 87%; "export the data" 10%.
- Round 8's open severity-4 problems: the Label "+" offers "Show labels", which people pick and which changes nothing visible; no screen names a node's neighbors; the list's search box cannot find a node, id or value, and answers only after Enter; "Show the 32 rows" showed only 3.
- Round 9 was planned (fresh personas, every number reported with and without skeleton defects, all changes aimed at tier 1) but was STOPPED for the real-app build: last commit on that worktree, 67ffd3a77, 2026-10-02, "mock fixes made before round 9 was stopped for the real-app build".
- Milestone 8 asked the owner nothing: "every open choice here is reversible" (`P/milestones/08.md`).

## 2. Standing owner decisions (binding; one-way unless marked)

Dates are when the owner said it; the source is `P/owner-feedback.md` unless noted.

Structure and navigation

- 2026-09-28: Figma supplies conventions for controls and gestures only (rows, popovers, menus, keys, selection driving the inspector). graphty's STRUCTURE comes from its own ontology (`conceptual-model.md`) and information architecture. Design for graphty where it differs (data, versions, results and runs, sets and paths, filters, recipes, comparison, notes). This outranks the "paved path" Figma rule. Make real use of the nav rail; design data management as one coherent area (in, versioned, refreshed, joined, filtered, exported, shared).
- 2026-09-28: Export... belongs in the project-name menu (top left), as in Figma.
- 2026-09-28: the "M" avatar is challenged (no accounts). Studio removed it; no avatar slot.
- 2026-09-30: REFINED STRUCTURE B is the structure (not A, not a "two lists on the left" hybrid). Its owner rules: one tree of paint rows on the left (group, path, measure rows, each with a type icon, Tableau-style); the tree holds rows, not nodes; nesting means "came from this run"; parent/child can be locked; every run is a row marked by kind, its paintable outputs are children, non-paintable outputs (modularity, a pair list) go on the run's Data tab; hundreds of communities are fine (collapsed, sortable, searchable, "Show members in table"); inspector has Style and Data tabs; table dock lists many rows; filters belong with the data, hiding is the eye (drawing only); built-in "Everything" base layer; Selection is a built-in layer pinned on top; a node's inspector answers "why this look"; folders; "hide"/"show hidden" for the list separate from the eye; solo (Alt-click an eye) and note counts on rows welcome. (`structure-b-refined.md` section 1)
- 2026-09-30: A RUN PAINTS AS SOON AS IT FINISHES. "Measures don't paint on their own" rejected as a fatal flaw: "this is graph visualization software". Runs may fight over color; the eye shows/hides. (This settles the earlier open question "does a finished run paint by default?", `P/framework-changes.md` line ~1596.)
- 2026-09-30: styling should be unopinionated and left to the user (owner principle). Studio reading: "the app adds no look of its own" (`structure-b-refined.md` 16.7).
- 2026-09-30: rename a row by double-click, as in Figma, no right-click.
- 2026-09-30: the toolbar carries ICONS ONLY, no text, tooltips after a hover delay. "Why this look" is collapsible.
- 2026-09-30: legend and camera controls should follow the toolbar pattern, not float on the canvas.

Data

- 2026-09-30: loading SEVERAL data sources and joining them on ANY key column (not only node id) is a PRIMARY task. Worked example: door-entries table (person_id, building_id, time) joined to people and buildings tables.
- 2026-09-30: WEIGHT (node and edge) is a field defined when the data source is loaded. (Reverses six rounds of studio decisions; see section 4.)
- 2026-09-30: a LABEL is a variable picked in styling, not a predefined field; several labels per node (above, below); "+ next to label should start empty" (binds nothing until a field is picked).
- 2026-09-30: blending is out of scope for now. Live sources vs snapshots is a future enhancement (issue #643).
- 2026-09-30: you must say which field holds the ids (owner challenged "the link is fixed by the file format").
- 2026-10-01: before the next study -- a state matrix, a design that holds up with dozens of attributes per node/edge, and nested-JSON loading (paths through sub-objects and arrays). Delivered: `state-matrix.md` (343 routes, 0 failures at the time), routes `data-page/wide-hosts`, `data-page/json-tree`, `data-page/json-report`.

Notes and authorship

- 2026-09-28: each note records its author and time; a recipe records who saved it and when; both from the project's author setting as given (blank if unset); author shown only when a project holds more than one.
- 2026-10-01: notes are part of graphty-element's PUBLIC API (`element-notes-api.md`). The author name comes only from Settings, is optional, and will usually be empty; the design must work well without it. Note metadata: time and target (node, edge, group, path, ...) required; everything else optional.
- 2026-09-30 (owner question answered yes by studio): notes can be on edges.

Output and formats

- 2026-09-28: the findings report is ONE self-contained HTML file (figures embedded, text as real text, offline, prints to PDF); a native PDF may follow later.
- 2026-09-28: graphty-element publishes SVG figure export now, PDF later; the Print look keeps a grayscale check (a check, not a grayscale file).
- 2026-09-28: reader messages are published as { key, params, text } with keys `graphty.<area>.<message>`.
- 2026-09-28: keyboard node walk is Shift+Arrow; plain arrows orbit (3D) / pan (2D).

Privacy and telemetry

- 2026-09-29: telemetry OFF until the user opts in at first use; graph content always masked. Collected when opted in: Sentry Session Replay with every node name, attribute value, label and file content masked; anonymous task events (file loaded, first graph drawn, measure run, result read, style added, export, undo) with timings; errors and performance; a feedback widget. No file contents leave the computer. Opt-in text is the owner's (content designer may tighten, must keep every commitment): "Your data is yours, but please help us. We will never see the data you analyze, but we would like to collect information about how you use the app so that we can improve the user experience. This data will only ever be used by the author of the application and his Claude Code sessions." Reason: Sentry on graphty.app will be the REAL user study, so the first shipped pass must be mostly right, with no trust-busting flaws on first use. Drawn as a non-blocking card at the foot of the start screen, equal-weight "Share usage data" / "No thanks" (`structure-b-refined.md` 11.2).

Process rules from the owner

- 2026-09-28: do not re-ask decided questions; check `P/owner-feedback.md` before writing any milestone question.
- 2026-09-28: owner items outrank simulated findings; show before-and-after for each owner review item.
- 2026-09-28: participant view must never trap the viewer (Esc and a faint corner control exit; test at touch width).
- 2026-09-29 (overfitting): task wording must never reuse the words a fix puts on screen; every label or wording change is tested on at least two domains (transfers plus a non-money dataset); no one-domain special cases (currency detection dropped; weighted measures are "Total <column> in", "Total <column> out", "Links in (count)", with a unit only if the data declares one). Audit fixes for both patterns.
- 2026-09-30: American spelling everywhere (color, gray, behavior, center, analyze).
- 2026-09-30 (third review): "as a primary focus ... go through every screen, every component, every interaction. what can we simplify? refine? polish? where can we make interaction patterns the same?"
- 2026-10-01: run user studies on the skeleton without waiting for the owner's review.
- 2026-10-02: prioritize the average first-time user (tier 1) before specialized features (section 1).

Decided on the owner's behalf (reversible; `P/owner-feedback.md` 2026-09-28)

- The project file saves the selection when it closes (optional additive field); reopen shows "Selection restored: 14 nodes".
- No separate Note tool; Add note's entry points cover it (N key, selection bar, context menus). Test several-notes-in-a-row before proposing a tool again.
- After undoing a filter step, a one-line notice names the step (undo "version B").
- The misplaced-filter-step warning mark: the studio's call.

## 3. Standing studio decisions (reversible; latest wins)

Shared interaction rules (`structure-b-refined.md` 2.5 "One pattern per job", 17 "One home per feature"; `P/framework-changes.md` "After round 7")

- One home per object/state; commands have DOORS (keys, Quick actions, menus, selection bar). A door is a command registered once (skeleton `AB.cmd`) with identical words everywhere; two entries that open the same dialog are fine, two controls that set the same state are a defect (R7).
- Every count names its unit and, when a part, its whole ("1,204 of 9,113 edges"); never a bare number (R7). Every count or claim in a message is COMPUTED from the state it describes, or the message is removed (R8; fixed strings like "64 hidden" were the top trust-killer).
- Empty selection = inspector shows the graph as its subject; the graph is never put INTO the selection. Esc closes the innermost open thing first, then clears selection (R7). Esc does one thing per press (R6). Focus never falls to the page body (R6). Focus never changes selection or paint.
- Nothing is preselected where the reader must choose (R5). No confirm dialog for undoable actions; Delete acts at once with "Undo" notice (refined B 2.5; R7).
- Unset style values are not drawn; a section's "+" adds a property (Figma pattern); advanced options in popovers, never accordions (owner third review; refined B 2.5).
- Tooltips: one component; 500 ms hover delay; immediate on keyboard focus; nothing needed to finish a task lives only in a tooltip.
- Vocabulary lives in `design/ui/framework/glossary.md`; the skeleton keeps no glossary of its own (R7). "Create set" (Ctrl+G) is the one set verb, plus "Create set from rule"; confirmations read "Created '<name>' in Sets" (R7). "Add label line" is the one label command (R7). Neighborhood distance is "1 to 3 edges away" ("hops" and "steps" only as search aliases); path length is "steps" (R7, replacing "k hops"). "Recipe" is the one noun for a saved style or workflow file; "style file" retired (R4-R5) -- BUT the round-7 File list and refined B still say "Apply recipe or style file..." (inconsistency to resolve).
- Rail (refined B 4): Graph (the paint tree, default), Data, Views, Notes, Assistant. A rail button names a collection, never an activity. No Results/Algorithms place: runs are tree rows.
- Toolbar (refined B 2.3, amended R7-R8): icon buttons at bottom center -- Analyze (Shift+A, catalog popover), Layout, View (fit, standard views, saved views, 2D/3D via key 5, VR/AR), Legend (L), Quick actions (Ctrl+K). The canvas carries no controls. No Select tool until graphty-element has area selection. Layout: its own Layout group on the graph's inspector, toolbar button opens it as a popover; slow methods say "slow" and offer Stop (R7); glyph must read as "arrange", not "play" (R8). Rejected: left or movable toolbar, text labels.
- Selection bar above the toolbar while something is selected: Neighborhood (G), Path between (P), Create set, Hide on canvas, Add note (N).
- Analyze: catalog generated from graphty-element (never typed), grouped by what the run adds (Rank, Find groups, Find paths and edge sets, Measure the graph); result lands as a tree row and paints when finished; no notice on run start; "Run as copy" keeps two partitions; Analyze's box is labeled "Filter analyses" and at most one "Start here" per heading (R8).
- One File list shown from both the main menu and the project-name menu: Save, Export..., Apply recipe or style file..., Version history, and one intake "Open project or file..." (R7, restoring the File menu refined B had dropped; tree task fell from 100% to 19% without it).
- Start screen (refined B 11.1): Open project or file..., New from data... (the Data page), drop anywhere, "Files are read on this computer"; Recent projects; Samples (Les Miserables, Zachary's karate club, a protein sample, a card-and-transfer sample) each with one line on what it is good for. The Les Miserables sample opens with NOTHING run (no pre-run PageRank, legend or layer) so a newcomer sees bare data and their own results (R8). No "Worked examples" group.
- Data: one full-width Data page for every load (one table or many), with roles chosen under each column header (Key, From, To, Links to, Type, Name, Time, Weight, Edge id, Position); the Data rail place keeps Sources, Filters, Attributes (refined B 2.4; R7). Tableau copied: the data source page, typed fields, joins on any key column; skipped: join types, the word "join", blending, live extracts. Each link line counts found keys ("9,113 of 9,113 from_account found in accounts"); near-miss keys (7 vs 0007) counted at the top of the report; unmatched-rows view shows every row (R7-R8). "Add rows from file..." on a source row, page headed "Add to <table>" (R7). One field list component for every attribute picker at every length (refined B v5).
- Weight at load, by kind (R8): every run (Path between, Analyze, the graph inspector) uses the loaded weight by default, read through its declared kind. A distance is summed; a similarity ("stronger") is never summed as a distance (inverse, said in words, or "None (fewest steps)" with a reason); a weight with no kind is summed and labeled as a sum. Path between names its weight: "<attribute> (set at load)" and "None (fewest steps)". A run's override is recorded in its "Made with", never written back.
- Styling: the Everything row and named rows use the same Style panel (R7). Bind icon at rest on Color, Size, Label lines ("Color by attribute"...). Color by / Size by on an attribute add a measure row named after the attribute. "Why this look" lists covered rows under each winner and is collapsible. Size encodings scale by area with a visible minimum (skeleton 2 to 12 px; a 0.5 px minimum hides nodes) (R8). The canvas legend names the method with one plain sentence from graphty-element's catalog, every channel in use and the bound size range (R8). Path's suggested style is a highlight layer scoped to `isInPath == true`, never dims anything else (R8; matches the repo's Algorithm Styles rule).
- Labels (R8): with no label drawn anywhere, the Label "+" directly adds an empty label line and opens its field picker; "Show labels" (element's label enabled flag) is offered only when a row beneath sets a label. Label line states live counts ("77 names, 64 hidden to avoid overlap"); "Show all labels" is the one name for the overlap switch.
- Find (R8): the list's search box is the one find over the whole project, live as you type; groups Rows, Elements (nodes and edges by label, id or attribute value, full graph, names any filter step that hides a hit), Notes; a value hit offers "Select where <attribute> is <value> (<count>)". Placeholder "Find rows, elements, values". "/" focuses it; Ctrl+K stays commands only with a "Find '<text>' in the graph" handoff. Find accepts a typed rule ("country = UK and amount > 1000") (R7). The lookup itself must be graphty-element's.
- A node opens on its Data tab; its degree and "N connections" chip select its one-hop neighbors; the neighborhood list is titled "Javert's 17 connections" with members by name and tie value, sorted by strength (R8). Neighborhood selects one hop; "Filter to neighbors" reports what it draws.
- Export (R7-R8): one Export dialog; one shared legend state drives canvas, Present and exported image (graphty-element draws the legend into the image); no export-only "Include legend" switch; Export > Data opens on the table that is showing (Nodes by default, "one row per node, with every computed value"); the table's "Export..." opens the same dialog. Rank exports as an integer with a separate Tie column (R6).
- Notes (R7, refined B 2.1): individual notes are not tree rows; one built-in Notes row paints noted elements (ordinary style layers, added only when the reader gives it a look); rows show note counts; notes read in the Notes place. Stored date and time shown ("Sep 28, 2026, 14:05"); with no author the writing box says once "Notes are saved without a name. Add your name in Settings." Ctrl+Enter posts. A note target that disappears is kept, shown struck through.
- Settings (R7): no separate Assistant switch; the app ships with no AI provider chosen, so the Assistant stays disabled until the user picks one. Performance page leads with the device status graphty-element reports; GPU agreement claimed only within a catalog-declared tolerance.
- Undo (R5-R6): selection changes are not undo steps; Ctrl+Z restores a cleared selection from one slot without touching Undo/Redo; notice "Selection cleared (N nodes). Bring it back". No notice clears on a timer (R5) -- note refined B 2.5 says notices last 6 s, a conflict to resolve.
- Static gallery mocks are marked as replaced by the app-b skeleton (R8); owner's old items on them (avatar, "Export files", rail redraw) closed by replacement, owner may reopen.
- Element boundary: every capability the design needs and the element lacks is listed in `element-requirements-5.md` and filed as a graphty-element / graph-io / graph-format issue (type, priority, effort labels) before its screen ships; nothing is built in the app. Kept in the app only: searching/ordering/grouping/truncating lists on screen and which table columns are shown (section 9 there).

## 4. Owner feedback grouped by theme (with what was done)

- Figma vs graphty ontology (2026-09-28): rail rebuilt from the ontology; five figma-crosswalk departures recorded (a Data place, the Layers slot for graphty objects, no avatar, no top-right Export, results placement). `P/study/owner-feedback-log.md` Round 3.
- Export placement and data management (2026-09-28): top-right Export removed; Data place created; one export dialog with several doors. Log Round 3.
- Styles placement (2026-09-28: "styles doesn't need to be under the graph nav link ... under the color picker"): moved to the right panel (R3), then superseded by refined B's paint tree on the left.
- Results on the left (2026-09-28: "shouldn't the right tab or the bar on the bottom be responsible for exploring results?"): see reversals below.
- Refined B second review (2026-09-30; ten items): show ALL styling options while keeping the sidebar organized; rename by double-click; Add/Paste data belong with the Data tab -- should Data be Tableau's "Data Sources"?; notes maybe a style layer, styling unopinionated; "Why this look" too big, list active layers; toolbar on the left or repositionable?, is Path top-level or under Select?; the design misses graphty-element functionality (saved camera views, image and video export) -- review all of it; bring back Views/Present/Export to the rail?; one home per element (View menu duplicated the toolbar); is Preferences = Settings and complete?; right sidebars cluttered -- one well-designed sidebar pattern per layer type, and the right side is for reading, not actions like "re-run layout". Answered in `structure-b-refined.md` (2.3 toolbar, 2.4 Data, 4.1 Views place, 16 Style tab, 17 one home, 18 capability register, 12.3 Settings) but NOT logged item by item in `P/study/owner-feedback-log.md` (milestone 8 promised it; the Round 8 log section does not contain it).
- Refined B third review (2026-09-30): "Line 5", "Arrow head 4" numbers (removed, units shown); unset values via "+" or popovers (done); Everything styled differently from "For the report" (same panel now); legend/camera buttons on canvas (moved to toolbar); no text on toolbar (done); data sidebar too complex (moved to Data page); how much Tableau to copy (`owner-questions-3.md` section 7); label from a field, a note's text or note count (label line picks from attributes, results, notes; note text as label source is an element requirement); notes on edges (yes); "Why this look" collapsible (done). Log Round 7.
- Tableau/data notes (2026-09-30): id field chosen on the Data page; weight set at load; labels picked in styling, several per node; "+" starts empty; join on any key (door-entries example loads as one graph); blending out; live data issue #643. Log Round 7.
- Scale (2026-10-01): state matrix, wide data, nested JSON delivered. Log Round 7.
- Overfitting (2026-09-29): currency special case dropped; two-domain testing rule.
- Spelling (2026-09-30): American spelling.
- Participant-view trap (2026-09-28): Esc rule and corner exit; logged as not done for several rounds until the kit gate passed.
- First-time user priority (2026-10-02): tiered tasks adopted in round 8.

## 5. Decisions later reversed (oldest to newest)

- Notes and authorship: R1 "each note records its date, with no author" was recorded as an owner decision; the owner never made it -> WITHDRAWN 2026-09-28; owner decided author + time. 2026-10-01: author optional, usually empty. (`P/owner-feedback.md` CORRECTION; decision log R1 bracketed note.)
- Where results live: Results rail panel -> retired into an inspector section (R3, owner-review driven, "provisional") -> R4 missed its bar (63%, 0%, 69% direct vs 70%) but kept, two-arm test -> R5 test moved Results back to a RAIL place (inspector arm 25% direct; rail better by 7 of 48) -> R6 kept the label "Results" over "Runs" -> owner's refined B (2026-09-30): runs are TREE ROWS; no Results or Algorithms place; runs start from the toolbar's Analyze popover.
- Where styles live: Graph panel (left) -> right panel "Style stack"/Appearance, Figma Selection-colors pattern (R3) -> refined B: paint tree of style rows on the left, Style tab in the inspector.
- What a weight means (seven turns): asked at load (pre-R1) -> removed from load, asked at the first run that reads it and stored on the attribute (R1) -> asked once on the column, every measure reads it (R2) -> load asks nothing, per-run choice via "Weight by" (R3) -> per-run graphty-element option prefilled from the column's "Default for new runs" (R4) -> no default, nothing preselected, Run disabled until chosen (R5) -> load declares no meaning; Weight role and "Change..." removed (R6) -> OWNER 2026-09-30: weight is defined at load and every run uses it by default, overridable per run (refined B, R7) -> R8: the loaded weight's declared kind (distance / similarity / capacity) decides how it is used; a similarity is never summed as a distance.
- Toolbar text labels: rejected R1-R3 pending a live hover test -> owner 2026-09-30: icons only, tooltips.
- Paint on finish: open question (option A paint vs B added off) -> owner: a run paints when it finishes.
- Undo: "undo is silent" vs notice tested (R1) -> notice on every undo/redo, silent version dropped (R2); "Undo back to here" (R1) deleted (R4); Edit > Previous selection and its key (R1-R4) deleted (R5) in favor of the Ctrl+Z selection restore; notice-only arm retired (R6).
- Ties: CSV keeps "=" tie marks (R5) -> rank exported as an integer with a Tie column; fixed 1% near-tie rule removed (R6).
- Money words: "Money in / Money out" when a column is currency (R5) -> owner 2026-09-29: overfitting; generic "Total <column> in/out", no currency special case.
- Style files: a separate kind of file (R1-R3) -> folded into recipes, "style file" retired (R4-R5) -> reappears in refined B and the R7 File list as "Apply recipe or style file..." (unresolved drift).
- File menu: one File list (R4) -> dropped by the refined B skeleton -> restored R7 after tree task fell to 19% direct.
- Neighbors: main action "Filter to neighbors" because a selection inside a density drawing shows nothing (R2) -> refined B / R8: Neighborhood selects one hop and lands on a named list; Filter to neighbors is the second commit.
- Find: Find and Go to focus the walk without selecting (R4) -> refined B / R8: picking an element selects and frames it and opens its Data tab.
- Neighborhood wording: "k hops" (glossary, R7 vocabulary entry) -> "1 to 3 edges away" (R7 later entry).
- Les Miserables sample: opened pre-run with a PageRank layer -> opens bare (R8).
- Labels on a selected node: "Show label anyway" writes to a "Labels shown anyway" layer (R5) -> one term "Show all labels" for the overlap switch (R8).
- Owner's "hide"/"show hidden" for the list -> studio renamed to "Remove from list view" / "Show in list view", state "not listed" (R7), a deliberate, reversible departure from the owner's words because 4 of 5 read a "hidden" row that still paints as a bug.
- Avatar/"Export files"/rail-redraw item: reported done (R3), corrected as not done (R4, R5, R6) -> closed by marking the static mocks replaced (R8).

## 6. Open questions still waiting on the owner

One-way doors listed in `P/framework-changes.md` "Open decisions for the owner" (line ~3009) and not answered in `P/owner-feedback.md`:

- Where graphty is hosted (hosting country); whether it can be self-hosted.
- An organization-wide switch that turns the Assistant off (the studio closed it for now in R7 with "no separate switch; no provider chosen by default" -- reversible; the owner never answered).
- Who answers IT/security reviewers about "Where your data goes", and the contact address.
- Where a data-source password is kept (recommended: memory until the tab closes, never browser storage).
- Spelling of CSV column headers for runs (e.g. `betweenness_sampled50_seed7_filtered`).
- Note edit history and an optional source field in the project file format.
- Where a renamed category lives (on the attribute, or a label map in a style layer).
- An asymmetric diverging palette for the Print look.
  Other owner-level items raised by the studio:
- Saved views that keep the look (not only the camera): held "until the owner rules on it" (decision log R7 rejected list).
- Published names and keys: the Looks' names (Screen, Print, High contrast); moving the legend's out-of-scope message to `graphty.legend.notDrawn`; new published message keys (`framework-changes.md` ~3741, 4102).
- graphty-element public contracts flagged as one-way doors: appending rows to a loaded source (R7, "a one-way door for the owner when built"); "Follow time order" path option; a "reliability" weight role in the glossary; the cost gate's default budget (whether costly runs are refused or "created unrun"; `framework-changes.md` ~1603).
- Conditional comeback: if fewer than about half of first clicks find the Layout or View icon, a toolbar label experiment goes back to the owner (refined B 2.3).
- Not owner questions but unresolved: whether selected nodes rank first in label culling (R8 element requirements, "they should not override it"); notes-on-edges picked on the canvas needs element edge picking.

## 7. Known inconsistencies a new round should settle

- "Apply recipe or style file..." (refined B, R7 File list) vs "style file" retired (R4-R6).
- Notices: "6 s, paused while hovered" (refined B 2.5) vs "no notice clears on a timer" (framework-changes, after round 5).
- The owner's first refined B review (ten items, 2026-09-30) has answers in the spec but no item-by-item entry in the owner feedback log.
- Telemetry is decided (2026-09-29), yet R6 still listed it as "Not decided yet"; later documents (refined B 11.2) carry the decision.
