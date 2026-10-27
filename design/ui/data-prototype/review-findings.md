# Data prototype review findings

Six reviews (red team, Figma patterns, information architecture, accessibility, architecture and
a flow walk) ran the prototype's flows F1 to F13 by real input. Their findings are deduplicated
here and grouped into fix groups. Each group owns its own files, so groups can be fixed in
parallel. graphty-element groups come first: several app groups read what they add. Within each
side, groups are ordered by the worst finding they hold.

Screenshots are under `tmp/data-prototype/review-*/` in this worktree.

## graphty-element

### E1. Loading: the first draw, role guessing and source names (blocker)

Files: `graphty-element/src/session/draft.ts`, the data load path it calls
(`graphty-element/src/session/commands/data.ts` load section, `src/data/`), `src/data/report.ts`.

- **The first source loaded into a new project draws nothing (F1, also auth-log).** Sources and the
  Inspector report 60 nodes and 120 edges, but the canvas stays blank for 12 s and more, and the
  scene has 0 meshes (`dataManager.nodes.size` was 0). Reported by four reviews, in fresh browser
  contexts. It draws after Restore or after a second source. Two-file drops, server loads and live
  samples draw at once. Path: `open.ts drawFirst()` -> `session.data.prepare(..., {guess:"values"})`
  -> `draft.load({mapping})` into an empty session. Find why that load leaves the graph empty, fix
  it in the element, and add a browser test that loads `tp53-interactions.tsv` into an empty
  element and waits for a visible node.
- **An event table cannot become edges (F9).** The value guess finds no edge pair in auth-log.csv
  (`sharedEnds`, draft.ts:456-520). Find user/host as an edge pair by shared values, and make
  `rowsAre` a choice that `reloadSource` can change later, so the app can offer Rows are
  nodes / edges.
- **Weight is not guessed (F1).** Only `weight` or `value` are taken (draft.ts:510); tp53's numeric
  `confidence` is left as none. With `guess:"values"`, take the single numeric edge column (or
  confidence, score, strength) as the weight with meaning similarity, and report it as a guess the
  app shows and Undo can clear. Also guess Label from name or title (suppliers.csv, Neo4j).
- **Every source gets a name.** A two-file load falls back to the internal key `s1`. Default a
  load's name from its file names (`accounts.csv + transfers.csv`).
- **flagged gets no issue (F2, F3).** A text column whose values are all yes/no should carry a
  "could be yes/no" issue code, so the header shows the warning F2 expects.

### E2. Server, live and joined sources (blocker)

Files: `graphty-element/src/session/sources/load.ts`, `src/session/sources/types.ts`, the Neo4j
and OpenAlex sources, `src/session/commands/data.ts` (matchesSource and join), `replace.ts`.

- **Load more opens a second source named `s2` (F11).** `more()` records the page as a new stored
  source (load.ts:421-441). Add the page to the same source key, name and counts. Add a test that
  asserts one source after Load more.
- **Limit is ignored and edges are dropped (F11).** Neo4j Everything with Limit 100 loads 171 nodes
  and 0 edges; Query loads 79 nodes. Apply the limit in every Start mode, read the edges between
  loaded nodes, and report a total or "more available" so a row can read loaded of total.
- **Refresh reports nothing.** Return a diff fact (+n / -n / changed) even when nothing changed.
- **Expand added no neighbors in one run, and Collapse is offered before any expansion.** Confirm
  double-click reaches `data.expand`, return +n or a "no new neighbors" code, and expose whether a
  node can be collapsed.
- **Bookkeeping leaks (F11).** `_source.expansion`, `_source.loads` and `_source.degree` show as
  columns and in the Test preview, and the app parses load keys on `/`. Mark them provenance
  (hidden from `attributes()` and previews) and add `session.data.nodeSource(id)` ->
  `{ load, canExpand, hiddenNeighbors, expanded }`.
- **Sources and load records are two lists the app joins by hand.** Put `features { more, refresh,
expand }` and `total` on `LoadedSource` (additive).
- **Preview rows have no label and facts are raw strings** (`neo4j enforced capped`). Give preview
  rows `{ id, label }` and type facts as codes.
- **OpenAlex loads 14,550 nodes in one go (F12).** Give it a first-page limit so Load more pages by
  cursor.
- **The same joined file again opens a second join (F7)**, doubling 150 edges. `matchesSource()`
  skips joined sources (data.ts:2397). Compare joined sources by their table header so a newer copy
  routes to Replace, and refuse an exact duplicate.
- **After Replace, the joined row keeps 150/150** while holding 159 edges (F8). Recompute matched
  and total on replace.
- **Joined columns carry no origin (F5).** Set `origin: "joined"` on descriptors a join writes,
  kept through undo, redo and restore. The app already draws the link icon from it.
- **An edges join reports "40 nodes updated"**, and the graph's provenance becomes the joined file
  (F7). Count only nodes whose attributes change; keep the first source as the origin.
- **The repeated-key join chip has no Ignore.** Record ignore (and first/last) in `JoinChoices`.

### E3. Issues, rules, columns and counts (major)

Files: `graphty-element/src/catalog/types.ts` (RuleTree), the filter and rule code
(`src/session/filter.ts` or equivalent), `src/session/columns.ts`, issue reporting in
`src/session/commands/data.ts` issue section.

- **Issues do not say which fix is in effect (F2).** Unknown ends are already added (316 = 298 + 18) yet "Add nodes" is offered; Keep equals Ignore. Report each issue's current resolution, keep
  resolved and ignored issues listable (with a way to un-ignore), and drop fixes equal to the
  current state.
- **Condition cards hand-write JMESPath and parse it back with regexes** (cards.ts:168-279),
  because RuleTree has no text, yes/no or edge range/category leaves. Add leaves `text`
  (contains / is), `flag`, and edge-side range and categories (additive), and report a rule that no
  longer fits its column's type.
- **A node-side Data source condition hides every edge (F6).** Apply a source rule on the node side
  to nodes only, with edges following their endpoints as other node rules do.
- **Key columns cannot be hidden in the element.** `setHidden` on the id, source and target columns,
  saved with the project, so Hide others survives a reload and the field list leaves them out
  (F4).
- **Key columns appear twice** (synthetic Id beside account, From/To beside from/to). Report the
  key on the real column in the column list.
- **Counts disagree** (table 40 vs 8 shown, row 14,550 vs overview 14,546, timeline 4 of 400 vs
  filter 59 of 400). One shown-versus-total count after filter steps and time window, read by
  table, Inspector, source rows and timeline.
- **Year-like integers get thousands separators** (1,975). Flag them on the descriptor.

### E4. Undo and selection (major)

Files: graphty-element history restore (`src/session/GraphSession.ts` history), and the app's
undo handler only if the investigation lands there.

- Undoing a join left 58 nodes selected; undoing a type change selected 298; undoing a replace left
  43 edges of the undone data selected. Pressing a source row also selects its nodes (see A3), which
  may explain part of it. Undo and Redo must not set the selection, and must drop selected elements
  that no longer exist.

### E5. Timeline windows (minor)

Files: graphty-element visibility commands (new `stepWindow` and `firstWindow`).

- Calendar flooring, step sizes and the first window live in the app
  (`graphty/src/workspace/timeline/commands.ts:29-191`). Add `session.visibility.stepWindow()` and
  `firstWindow(attribute, { step })`; the app keeps only the readout and its default step.

## compact-mantine

### C1. Shared component accessibility (major)

Files: `compact-mantine/src/components/DataTable/DataTable.tsx`, the Menu and Alert theme.

- The DataTable header icon slot is `aria-hidden`, so type, role and the joined icon are never
  read (DataTable.tsx:824-828). Let callers pass an accessible label.
- Menu radio items report `aria-checked=false` on the checked type.
- The yellow Alert title is 1.75:1 at 11 px. Darken it in the theme, not locally.

## graphty app

### A1. Fields and the event table (blocker)

Files: `graphty/src/workspace/data-place/Fields.tsx`, `words.ts`, `graphty/src/workspace/start/open.ts`,
the header Role menu in `graphty/src/workspace/table/`, `timeline/__tests__/Timeline.real-element.test.tsx`,
`data-place/__tests__/DataPlace.real-element.test.tsx`.

- F9 dead end (reported by five reviews): Fields shows only node rows and the Role menu only node
  roles. Delete the `{rowsAre:"nodes"}` fallback in `firstMapping`, add a Rows are (nodes / edges)
  row to Fields, show Source, Target and Kind of source/target when edges is picked, and add source
  and target to the header Role menu. Picking ends reloads through `data.reloadSource`.
- The tests load auth-log through `draft.load` with a hand-written mapping, the step the UI cannot
  do. Drive it by upload and Fields with `userEvent`.
- Two rows named "Time": group rows under node and edge chips (EntityChip), name controls "Node
  time" and "Edge time", and name the source Fields edits in its header. Hide edge rows for a
  node-attribute join.
- Show the element's weight guess (from E1) and limit Weight choices to numeric columns.
- Pass the two-file name (open.ts:128) until E1 supplies it; take a third dropped file as another
  source instead of dropping it silently.
- Never show `error.message` in the add-source notice; word the element's code.

### A2. Server form (blocker)

Files: `graphty/src/workspace/server/ServerForm.tsx`, `server.css`, `PreviewRows.tsx`.

- After Test the pop-over grows to about 2,600 px and Load goes off-screen (four reviews). Cap its
  width (min(560px, 100vw - 32px)), wrap or scroll the preview rows inside it, keep the footer
  inside.
- Test and Load are enabled with an empty endpoint: disable them until required fields are set.
  While busy, use aria-disabled with loading so focus is not dropped.
- An example switches Start to Everything and keeps Transport on Bolt for an https endpoint. Keep
  the reader's Start (Query for examples with a query) and take the transport from the example.
- The dialog has no accessible name (aria-labelledby points at an aria-hidden anchor): add
  `aria-label="Server"`.
- Put Database, Transport and Expand settings in an Advanced + section; show Query only in Query
  mode. Show preview facts and labels from E2's codes.

### A3. Source rows and the Add source menu (major)

Files: `graphty/src/workspace/data-place/SourceRow.tsx`, `AddSourceMenu.tsx`, `data-place/commands.ts`.

- Names collapse to `s..`, `tum...` or nothing, with the count `171` in their place, and the hover
  actions draw over the edge chip. Give the name the flexible width with a minimum, label the
  server count (loaded of total), and swap actions in place of chips on hover. Never fall back to
  the source key.
- Omit a chip whose count is 0 ("Edge 0").
- Pressing a row selects that source's nodes. Keep press for choosing what Fields edits; put
  "Select nodes" in the row menu.
- Load more gives no busy state or +n receipt; show both. Read `canLoadMore` from E2.
- Samples... and Server... from the + menu never get focus (Menu returnFocus wins). Set
  `returnFocus={false}` or open after the menu closes; add a keyboard test.
- After a load, join or sample, focus the new source row.

### A4. Table dock and headers (major)

Files: `graphty/src/workspace/table/TableDock.tsx`, `MaximizedPanel.tsx`, `columns.ts`,
`HeaderCell.tsx`, `IssuesList.tsx`, `table/` header menu.

- Maximized mode repeats Sources and Fields beside the sidebar, with its own selected-source state,
  and lacks Filters. Hide the sidebar Data place while maximized (or show only Issues and Filters
  in the panel); keep one selection state.
- The dock maximizes for a cosmetic issue (1 padded space). Maximize only for issues that block
  drawing; otherwise show a warning count on the Table button.
- Drop the synthetic Id, From and To columns once E3 marks the real key columns; show the role tag
  on the real column.
- Issue rows: the side as EntityChip, button names with side and noun ("Merge: edges, 5 repeated"),
  the active fix as a selected segment, a collapsed resolved/ignored group (from E3). After a row
  goes, focus the next row or the heading. Do not render an empty Issues section.
- The header warning icon is mouse-only with the name "Issues in Id": name it with the issue and
  count and tie it to the header with aria-describedby.
- Hidden columns: an Unhide submenu listing hidden columns; read hidden key columns from E3. Make
  the single-item "..." menu a direct Export icon button.
- The table ignores filters: add a Shown / All scope in the header and refit the camera after a
  filter changes what is drawn.
- Hide the Edges tab when there are no edges.
- A wide table pushes the canvas under the inspector: center column `min-width: 0`, scroll inside
  the dock.
- Make the canvas and toolbar inert under a maximized table.
- The maximize toggle reads "Minimize table, pressed": keep a fixed name with aria-pressed.

### A5. Filters, condition cards and style layers (blocker)

Files: `graphty/src/workspace/data-place/Filters.tsx` (or its filter location), `graphty/src/workspace/style/cards.ts`,
`WhichPicker.tsx`, `StyleTab.tsx`, `style/row.ts`, the legend.

- A new yes/no card shows Yes selected and "100 of 298" but writes no rule until No then Yes. Start
  with no value and no count, or write the default as a rule at once.
- Adding, changing and removing a card is not an undo step. Wrap it in `session.transaction`.
- Cards on a hidden field turn into an opaque "Rule": keep them readable and editable with a
  hidden marker.
- Use E3's RuleTree leaves and delete `queryOf` / `cardOfQuery`; the node-side Data source card
  follows E3's nodes-only rule.
- Count chips: EntityChip (speaks Node/Edge, passes contrast); source options counted with chips
  instead of "(60)"; full count when no source is picked; name the pill's button "Remove <name>".
  Focus the new card after Add filter.
- No route creates a reader's own style layer, so the target picker (and its Data source condition)
  cannot be reached. Add "New layer" on the Paint tree and Quick actions, and "Paint selection" on
  the Selection row; give the Selection row a view.
- Color by attribute on Everything makes a second layer named "Everything" and a legend "Color:
  Everything". Name the layer and legend after the attribute.

### A6. Join screen (major)

Files: `graphty/src/workspace/join/JoinScreen.tsx`, `join/commands.ts`.

- A capture-phase Escape on `globalThis` cancels the join from anywhere and throws away the file.
  Scope Escape to the join section and make Cancel undoable.
- Focus the first control when the screen opens; after Join, focus the new source row (A3).
- Incoming headers truncate to `l...`, `p...`: size the tables by content (graph side to its key),
  full name on hover; make the Include checkbox reachable by keyboard.
- The repeated-key ignore is React state; use E2's `JoinChoices`.
- Replace data picks the first non-join source; let the reader pick it.
- Replace the sentence header with chips (incoming -> base).

### A7. Samples and the start screen (major)

Files: `graphty/src/workspace/start/SamplesDialog.tsx`, `StartScreen.tsx`, the "Add data..." door.

- The start screen's Samples scrolls to a library without the fixtures. Open the same Samples
  dialog from both places.
- Remove the graphs listed twice, add search, tag each live sample with its provider (OpenAlex,
  NDEx) and show size or "large".
- File fixtures add a source; live and dataset rows replace the project behind a discard confirm.
  Route every sample through `addSource`, with Open as a separate graph as the explicit choice.
- Sentence-case section labels (no `tt=uppercase`).
- Remove the old "Add data..." door that opens a Data page with Load disabled; File... covers it.
- Disable Table, Analyze, Layout and View while a project has no sources.

### A8. Export (major)

Files: `graphty/src/workspace/export/DataOutput.tsx`, `lossWords.ts`, the Video and Image panels.

- CSV warns 'Part of "user" is not kept' for text columns that round-trip: that is the fallback
  for an unknown loss code (lossWords.ts:155-163). Find the code; word it or stop the element
  emitting it, and make an unknown code fail a test.
- Losses as compact rows (icon, column chip, count, details on hover), not an 8-sentence list;
  "The legend is not in the image" as a tag.
- Video views show `frontView`, `topView`: use the presets' plain names.
- Hide 0 counts (Layers 0, Joins 0) and the Edges toggle when there are no edges.

### A9. Timeline strip (minor)

Files: `graphty/src/workspace/timeline/TimelineStrip.tsx`, `timeline.css`, `timeline/commands.ts`.

- The window band is 1.1:1; give it a 3:1 outline.
- The readout is rewritten every 800 ms in a polite live region; announce only on pause, step or a
  manual move. Drop `aria-label` on the role-less span.
- The timeline precedes the toolbar in DOM order, so Tab never reaches Play from the Timeline
  button. Render it after the toolbar.
- Use E5's window helpers; hide "0 of 0" and the edge side when there are no edges.

### A10. Project, autosave and notices (minor)

Files: the workspace autosave and restore code, the banner's Autosave chip, the notice toasts.

- Restore renames the project "Recovered work": keep the saved title.
- "This browser may clear..." is a persistent toast that covers dock buttons: make it an icon on
  the Autosave chip with details on hover. Other hint sentences ("Restored your work...",
  "Analyze (Shift+A) to add results here") become chips or one-word labels.
- The Autosave chip text is 2.17:1: darken the token.
- Add one polite status region that receives a short fact after each data change ("58 matched",
  "Node 79, Edge 100").

## Rejected

- **Open the Data place after every load (F1, F11).** The place the reader chose is theirs; Sources
  is one click away, and switching on every load is the app imposing a view.
- **Add an NDEx TP53 sample (F12).** It exists and loads (133-f12-ndex-loaded.png); the defect is
  that providers are unnamed, which A7 fixes.
- **Type in the header menu is a forbidden multi-level menu.** The owner's no-submenu rule covers
  fixes, and the owner asked for Type in the header context menu. The aria-checked part is kept
  (C1).
- **Undo after Type > yes/no should restore text, not category.** Undo correctly restores the
  guessed type; the real gap is the missing yes/no hint, kept in E1.
- **Ignored issues could not be verified after reload because restore brought back another
  tester's project.** Parallel test contexts shared one origin's storage; a reader has one
  autosave. Another review verified the ignore persists (34-F2-after-reload-table.png).
- **"Canvas blank may come from this headless environment."** Disproved: four reviews reproduced
  it with working WebGL, and other loads drew in the same tab (E1).

The last finding of the batch arrived cut off after its flow (F2) and was not judged.
