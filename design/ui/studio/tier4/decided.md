# Tier 4: settled behaviors

Every dry-run triage reads this file and cites it. A pilot complaint against a behavior listed
here is classed "no change". Reversing one needs a new dated entry below it, with the reason and
the evidence; the old entry stays.

## Owner rules for data UI (binding for every tier 4 decision)

- **Compact Figma controls; no sentence on screen where a control will do.** (Owner, 2026-10-20.)
- **The data table is view-only; configuration lives in the Data place.** (Owner, 2026-10-20.)
  Column kinds, roles and fixes are set in the Data place; the table may show them and point there.
  Read with the owner's 2026-10-20 04:36 statement: "we lost the preferred route of how to configure
  data from the first round -- directly in the header of the table". A column's Type and Role stay
  in the table header menu (`ui/data-prototype/spec.md` lines 166, 189, 210; owner-decisions.md
  2026-10-29, item 2).
- **Say "edges"** on screen, never "links" or "ties". (Owner, 2026-10-20.)
- **Export is a common act**, reached as easily as Save. (Owner, 2026-10-20.)
- **Every hotkey has a visible button that shows its key.** (Owner, 2026-10-25.)
- **Never remove or restyle an owner-approved surface** in a fix. (Owner, 2026-10-20.)
- **Follow Figma where Figma solved the problem; graphty's own model where graphty differs.**
- **Filters are flat condition cards, the Style panel's Which nodes / Which edges cards**: each with
  Select / Hide, an on box and its own "X of Y" count; order never matters; a Data source card is
  offered only when two or more sources are loaded. (Owner, 2026-10-29, option B;
  `design/data/filter-cards.md`, PR #4454.)
- **compact-mantine is locked to Figma.** A data fix that needs a compact-mantine change in look,
  tokens or Figma tests goes to `owner-decisions.md` under "for the owner", never into the code
  without the owner's `Figma-Approved` trailer. (Owner, 2026-10-23.)

## Carried over from tier 3 (`../tier3/decided.md`), still binding on these flows

The layer tree entry below was corrected on 2026-10-19 (tier 3): a tree is entered at its focused
row, else its selected row, else its resting row; the toolbar and a grid at their first item.

- **A disabled "+" is not a Tab stop** and keeps its reason on hover. (2026-10-18.) Five pilots
  tabbed through two dead stops on every styling task. A dimmed Undo stays reachable, because its
  state is worth reading. Earlier passes flipped this both ways.

- **A condition card's remove button is a Tab stop, in the order it is drawn**: in the card's
  header, before the card's values. (2026-10-18.) Pass 3 made it reachable; pass 4 found it after
  the values although it is drawn above them. Earlier passes flipped whether it was reachable.

- **The layer tree, the canvas toolbar and a grid are one Tab stop each**, entered at their first
  item, walked with the arrows. (2026-10-17.) F6 moves between regions for the long walks.

- **Escape keeps edits in the picker and in a card; "Done" closes it.** (2026-10-16.) No cancel.

- **Tab in a list with letters typed and an option highlighted takes that option**; with nothing
  typed, Tab closes the list and takes nothing. (2026-10-18.) Two pilots lost a nearly made
  condition.

- **Opening an existing card changes nothing**: it opens with its suggestion list closed; typing or
  ArrowDown opens it. (2026-10-18.) A reader opening a colleague's rule rewrote it with two keys.

- **No confirmation for an act that can be undone.** (2026-10-17.)

- **Control+Y redoes**, beside Control+Shift+Z. (2026-10-18.)

- **The drawing moves only when the reader asks**: opening a graph, Frame (f), Reset view. A key
  that arrives or grows, a panel or the table opening, a filter step turned on or off, a layer
  added or removed, and Undo never re-frame it. The key floats over the canvas; Frame keeps clear
  of it. (2026-10-19.) REVERSES the team entry of 2026-10-18 in `owner-decisions.md` ("the key's
  room only while there is a key"), which framed the graph once when a key arrived over a drawn
  node: on this build the drawing jumped right and shrank on 16 walks across 15 tasks the moment
  the first color was set, and stayed off center after Undo. It restores the 2026-10-18 rule the
  pass 4 rows cited ("the drawing stays put; Frame is one key"). The earlier attempt, reserving
  the key's room whenever the key was on, opened every sample off center; both moved the view
  without the reader asking.

- **A dimmed Undo and Redo are Tab stops** (restates 2026-10-18; the header still passes
  `skipWhileDisabled`, so it was never built).

- **Arrow keys in a list stop on a disabled option**, which reads as dimmed with its reason
  (WAI-ARIA listbox). Tab still skips a disabled "+".

- **Arrow keys stop at the edges of a tree or a grid**; nothing wraps to the next row or the top
  (WAI-ARIA tree and grid patterns).

- **Tab out of a box that writes moves to the next control**, in the panel as the write leaves
  it; the redraw after a write never pulls focus back into the box or up to the tabs.
  (2026-10-19.)

- **Escape on a just-added line or card that holds nothing takes it back**, says so, and puts
  focus on the "+" or "Add a condition" that added it. This narrows "Escape in a style field keeps
  focus in the field" (2026-10-17), which is about a field holding a value. (The pass 4 rows
  T45A-6 and T49B-14 decided it; written here 2026-10-19.)

- **Escape in a dialog closes it from any control in it** (WAI-ARIA dialog). (2026-10-19.)

- **Control+Z in a text box undoes its typing first** (the platform's behavior). (2026-10-19.)

- **A condition card's count** (settles the pass 1 / pass 2 flip-flop): a card with no value yet
  shows no count of its own; the layer's count beside "Which nodes" says what the layer paints.
  While the reader types, the count on screen follows each keystroke and is spoken once, when
  typing pauses. (2026-10-19.)

- **An unfinished card is dropped when its picker closes**, with a notice and no Undo (nothing
  was written). A click inside either side panel keeps the picker open; a click on the canvas
  closes it. Focus leaving the picker by Tab or Shift+Tab closes it and keeps its edits ("Tab
  closes a pop-out", 2026-10-17). (2026-10-19.)

- **A list that opens with nothing active takes nothing on Enter** until the reader types or
  arrows (team entry 2026-10-18, `owner-decisions.md`).

- **An open list, menu or popover covers what is under it while open.** (r1-3 and r1-4, kept;
  written here 2026-10-19.)

- **A control's tooltip and its accessible name say the same words** (state may be added to the
  name). (2026-10-19.)

- **The cursor stays an arrow over buttons** (compact-mantine `cursorType: "default"`, desktop and
  Figma convention; r1-1, 2026-10-17).

- **Icon buttons carry no visible text**; the tooltip and the name say what they do (Figma).
  (2026-10-17, kept.)

- **A table cell's own name is its value**; the screen reader speaks the row and column headers
  on a move, the study tool does not (r1-3, r1-4). (2026-10-19.)

- **Opening a file that is already open offers Replace first and Load beside it with its
  warning**, with no confirmation, because a load can be undone. (2026-10-19.)

- **A project file opens in place of the open work**; "Replace first and Load beside it"
  (2026-10-19) is for a data file, which can be added to the open graph. Opening a project asks
  only to discard unsaved changes. (2026-10-20.) A project cannot be added to a graph, so a
  Replace or Load page for it would offer a choice that does not exist (T50A, Control+O).

- **F6 answers the long Tab walks** (r1-2, 2026-10-17): Tab follows the screen's order and its
  8 to 20 stop walks are not defects. **F6 cycles five regions**: the top bar, the left panel (at
  its first control), the canvas, the canvas toolbar, the inspector. A resize handle is never a
  region. (2026-10-19.) Whether a keyboard participant finds F6 is for the sessions.

## Tier 4 review decisions (director, 2026-10-29)

The expert walkthroughs (`review/*.md`; screenshots under the main checkout's
`tmp/design-studio/tier4/review/<role>/`) and the red team's objections, decided. Fifteen changes,
most impactful first, grouped by the shared part that owns them. Each is fixed once in that part,
with a real-input test, and re-tested by a participant briefed in words the change does not put on
screen. Items the red team showed to be owner calls are under "for the owner" in
`../owner-decisions.md` (2026-10-29) and are NOT built; the rest are in `backlog.md`.

### Study tool

- **R1. A study build serves `site.json`** (studio tool, `tool/real.mjs`; done in this commit).
  Severity 4: the frozen `graphty/dist` has no `site.json` (the deploy writes it from
  `graphty/sites/<channel>.json`), so every setup start got a 404 and `real.mjs` ended it with
  SETUP FAILED, voiding every session that starts from a setup file. The tool's server now answers
  `/site.json` from `graphty/sites/production.json` when the build has none, so every build, frozen
  or not, starts cleanly. Re-test: the next `real.mjs --prove` and one setup start of each tier 4
  setup end without SETUP FAILED.

### Filters cards (`data-place/Filters.tsx`; the Style card is approved and does not change)

- **R2. Filters "+" opens the Style panel's attribute picker** (`AddCondition`,
  `style/WhichPicker.tsx`): search shown and focused, kind glyphs, value summaries, Nodes and Edges
  sections, and a last Structure group holding Data source, Largest component, Neighbors of
  selection and Time window. Each group is `role=group` named by its heading. Why: three reviews
  (Figma, IA, visual) found the same act drawn by two pickers; decided.md says the filters ARE the
  Style cards. Pattern reused: `AddCondition` (arrows, Enter, Escape as decided). Re-test: "narrow
  the picture to the volunteers who did the most" (T65 A's subject), with no field name given.
- **R3. A text card previews its count while typing and writes on commit** (Filters.tsx). The count
  follows each keystroke as a preview that writes nothing, as the Style card does; the condition is
  written on blur, Enter, Tab out, and Escape when the card holds a value (Escape then keeps the
  card and puts focus on its on box). Only Escape takes back a card, and only an empty one (with its
  notice). Tab never discards a card: an empty card stays and Tab moves on. Why: interaction and
  a11y walks lost typed values ("Pan") and empty cards on Tab, against decided.md's count rule and
  "Escape keeps edits in a card". The red team's objection holds: writing on every pause would make
  one undo step per pause (filter-cards.md section 5), so commit still writes once. Re-test: a
  keyboard participant narrows to "sites whose name starts like Pan" and reads the count aloud
  before leaving the box.
- **R4. A filter card's header is one row at the section edge, and a written card rests as a
  summary** (Filters.tsx filter variant and `data-place.css`; `CardBody` keeps the Style card's
  look). Row 1: the field name, the count chip, remove; row 2: Select / Hide and the on box, right
  aligned; the 16 px list indent goes. A written card collapses to its header plus the summary line
  Style shows; click or Enter opens it, one card open at a time. Category value rows read box, name,
  dimmed count right aligned (filter variant only). The card is `role=group` named by its
  condition. The Hide segment's tooltip and accessible name say "Hide nodes that do not match"
  (words only; the visible label is the owner's question). Why: visual and Figma walks: three cards
  fill the 240 px panel, the field name sits on a third line at 9 px, values read as sentences.
  Pattern reused: the Style Which nodes held-card header and summary row. Re-test: T65 with two
  cards, then "which of your two rules marks some while leaving everyone in the picture?" answered
  from the panel.

### Time role (`data-place/Fields.tsx`, `data-place/TimeCard.tsx`)

- **R5. Choosing the time sets only the time.** Setting a Time role no longer adds a Time card or
  opens the timeline dock; the toolbar's clock button opens the dock, and the time window card
  appears only when the reader adds "Time window" from Filters "+" (R2). The time window row gets
  the condition card's header: left aligned, its own count, an on box named "Apply Time window" and
  remove; no Select / Hide (filter-cards.md section 7: the window is separate element state with no
  effect). One name, "Time window", in the menu, the card and the inspector ("Filter step" leaves
  `inspector/words.ts`). Why: four reviews; the canvas shrank and the drawing went under the toolbar
  unasked, against decided.md's "the drawing moves only when the reader asks". Re-test: T63 "say
  which site opened first" -- the canvas keeps its size until the reader asks for the timeline.

### Canvas (graphty-element)

- **R6. Turning a filter card on or off keeps the camera** (graphty-element). Find first whether the
  ~70 px shift is a re-frame or a layout re-run on the visible nodes, and fix it at that cause; the
  view moves only on Frame (f), Reset view or opening a graph (decided.md, 2026-10-19). Why:
  interaction walk w3 03-05. Re-test: a participant takes a group out of the picture and brings it
  back, twice, and is asked whether anything moved; the script compares node screen positions before and after.

### Data place menus (`data-place/MenuItems.tsx`, `AddSourceMenu.tsx`, `SourceRow.tsx`)

- **R7. Every Data menu uses the Style "+" menu item grammar**: glyph on the left, key on the right
  (File... Ctrl+O, Paste Ctrl+V, Rename F2, Export... Ctrl+E), headings as `role=group` with their
  label, and the add buttons report `aria-haspopup=menu` and expanded. Double-click on a source row
  starts Rename, as in the layer tree. Why: owner rule "every hotkey has a visible button showing
  its key"; three reviews. Pattern reused: Style layers "+" ("Analyze... Shift+A"). Re-test: a
  participant asked to "give the second file a shorter name" without the word rename.
- **R8. One door to network data, the same component in both places.** Sources "+" gains
  "Network data..." (added after Server..., which stays: it is approved), opening the start
  screen's `NetworkDataDialog` with its web address box; each of its cards passes its kind to the
  Server form, so "Web API" opens on Web API; the Server form's "REST API" reads "Web API". The
  address box gets a visible label and an Open button beside it (Enter still opens). Why: T60
  detour and door fidelity: the Web API card opened Neo4j, and inside a project no door took a web
  address (four reviews). Pattern: one home per capability, the start dialog as that home.
  Re-test: from an open project, "bring in the volunteer list that lives online at this address".

### Data issues (`table/IssuesList.tsx` as the one issue list)

- **R9. A source row shows its issues; the issue list has one component and the Data place is its
  home.** Each Sources row with issues gets a warning chip with the count; it opens the source's
  issue list (`IssuesList.tsx`, the same component the table popover draws, with Trim, Make blank,
  Ignore) in a popover anchored to the row. The table popover stays as a second door. Issue text at
  body size; "Ignore all" reads "Ignore in all columns"; "1 value with padded spaces". Each fix
  makes one polite announcement ("families: 1 value made blank"). Why: T67's fixes lived only in
  the table, against "configuration lives in the Data place"; three reviews proposed three homes and
  the red team asked for one. The row chip is the one home because the row already carries the
  source's counts. Re-test: T67 with the table closed -- "anything in this file that looks wrong?"

### Roles (`Fields.tsx`, `table/HeaderMenu.tsx`, the inspector)

- **R10. One role list, one home, every door in the home's words.** Fields "+" and the header
  menu's Role submenu draw the same list in the same words and sentence case (None, Id, Label, Kind,
  Weight, Time, Coordinates, Country, Region, City for nodes; Source and Target only on an edge
  table), read from graphty-element's role facts (additive there where a role is missing). The
  current Type and Role carry a check mark. The inspector's "Set as time" becomes a door, "Set in
  Data", that opens Fields with the Time row added and its column chosen. Role column choices list
  fitting columns first with the kind glyph (the Type submenu's "N will not convert" detail on the
  rest). The header menu keeps its approved items (Type, Role, Rename, Hide...): moving column kinds
  out of the table is the owner's call (`owner-decisions.md`). Why: IA and content walks found two
  role lists and three homes. Update `answers.md` T63's path ("Set as time" > "Set in Data").
  Re-test: T63 B, "the program should know when each gauge was put in".

### Source rows (`data-place/SourceRow.tsx`, CountChips)

- **R11. A source row keeps its facts under the pointer and its name gets the room.** The count
  chips stay on hover and selection, with "..." in a trailing slot after them; the file name
  truncates last, with its full name in a tooltip; the approved ratio stays but reads with its unit
  in the tooltip and name ("17 of 19 rows joined") and shows only when some rows did not join;
  the inset focus ring clears the text. Count chips' names and tooltips read "13 nodes, 18 edges"
  and "4 of 12 nodes" (the dot may stay). Why: five reviews (visual, Figma, content, a11y, IA).
  Pattern: Style layer rows. Re-test: "how many routes came in from the second file?"
- **R12. Fields shows every source, one group each, and the selected source survives a place
  switch.** Fields draws one collapsible group per source (ControlSection, the Style panel's kind
  groups), the selected source's open and first; selecting a Sources row opens and scrolls to its
  group. The selected source lives in the workspace store, so Graph and back keeps it. Why: after a
  join the first file's Time and location rows vanished (hidden mode; IA, Figma). Re-test: after
  T61, "where did you say the sites are on the map?"

### Join screen (`join/MatchChips.tsx`, `join/JoinScreen.tsx`)

- **R13. Every join count is a chip that narrows the table to what it counts.** "18 edges added",
  "1 new node", "1 not in graph", "1 repeated ..." become EntityChip toggles styled like "With
  issues"; the separate Show button goes. Sentence case ("Ignore case", "Ignore spaces"); the
  section and the button get distinct names. The chips row is the screen's `aria-describedby`.
  Why: four wordings for one act; criterion 10 (a count is a link that selects what it counts).
  Re-test: T61, "which of the delivery rows did not match a site?"

### Export (`export/ExportDialog.tsx`, `DataOutput.tsx`, `lossWords.ts`)

- **R14. Export opens on Data wherever a table is showing, and says what it loses in one line.**
  Apply tier 1's rule (not focus): Ctrl+E and every Export item open on Data when a table is
  showing, and from a source row's new "Export..." item on that source. The loss list becomes one
  counted line ("Not written: positions, 9 style settings") with a details disclosure; the Format
  list is grouped Tables / Network files without the "(keeps style layers)" suffix (one "no styles"
  hint where styles are lost); sentence case ("Include styles"). Whether "Include styles" turns off
  for CSV is decided after the engineer records what CSV writes with it on. Why: owner rule "export
  is common"; three reviews. Re-test: T68 A, "send the treasurer the list of sites as a
  spreadsheet".

### Table (`table/RecordTable.tsx`, `HeaderCell.tsx`)

- **R15. A date column reads as a date whatever its role.** Every date-kind cell is drawn the way
  the time role draws it ("Mar 2, 2015"); the sort caption follows the kind (oldest first, lowest
  first, A to Z); the first header click sorts A to Z; "Make blank" lines up with its siblings.
  Why: T62's answer had to be read from cut ISO text (content, visual). Re-test: T62, "which site
  has been open the longest?"

## Dry run pass 1 (director, 2026-10-29)

Settled by the triage of the pilot walks on build 0ffeae2ef5 (`dry-run-r1-1.md`, which names each
defect by its row). Screenshots are under the main checkout's `tmp/design-studio/tier4/r1/pilot/`.
No earlier entry is reversed.

- **A pick glides the camera to what was picked**: a find result, a table row, a right-click on a
  node, a source's Select nodes. The reader asked by picking, so this is not "the drawing moves
  without being asked". Carried from `../tier3/decided.md` (2026-10-20, narrowed 2026-10-21: a held
  selection asks for nothing after the pick), which this file's carried list left out; seven pilot
  rows asked for the drawing to stay put on a pick. How far the glide zooms (part of the graph
  leaving the canvas, T64 A) is a backlog defect, not part of this rule.

- **A Select card selects every match in the graph**, visible or not, so the order of the cards
  never changes what is selected (`design/data/filter-cards.md`, "Selection", the owner's option B).
  Four pilot rows (T65 A pointer, keyboard and the other order; T65 B) read "5 nodes selected" with 4
  rings as a defect, because the T65 prompt says "among those still in the picture". The answer key
  grades the cards while it stands; changing it changes the element's select effect, so it is the
  owner's question (`../owner-decisions.md` 2026-10-29, item 9).

- **A source row's counts are drawn whole.** No chip on a Sources row covers another; the issue chip
  takes its own slot after the counts, and the file name is what gives way (it keeps its tooltip).
  Why: the issue chip the review fixes added (R9) was drawn over the counts R11 placed, so the yeast
  row read "3611" for 361 edges (T60 B success-3/07.png) and the deliveries row hid its 18 (T61 A
  w3-success/11.png), the number T61's follow-up asks for.

- **An issue names only what happened to the file.** A load raises an issue for a row only when the
  graph does not hold it. Why: the yeast network from its address reported "6 rows refused" while all
  361 edges were loaded (T60 B success-3/09.png).

- **Every door that adds a data file to an open graph opens the join screen**: Sources + > File...,
  the main menu's Open project or file..., a drop on the open graph, and Quick actions > Add data....
  Why: Add data... opened an older page whose default silently dropped G12 and its stretch and then
  showed no issue (T61 B p2-menu/58-61.png).

- **A column's kind is drawn one way everywhere.** The table's cells, the sort caption and every kind
  glyph (the table header, Fields' column lists, the Label and Time lists) follow the column's kind
  alone. A date-kind column reads as dates whatever its role (R15); a text-kind column reads as text
  whatever its role, with the role's chip (Time) on its header. Why: setting the Time on a text
  column drew dates, sorted by date and showed a calendar glyph in Fields while the header said Aa,
  so neither participant nor grader could tell what the program reads (T62 A w2-inspector/02.png, T62
  B w2-detours/05.png, T63 A success/05.png).

- **A condition on a date column compares dates**: Before, After and Between, with boxes that take a
  date or a year, in every condition picker (Filters and a Style layer's Which nodes, one card).
  Why: T65 B's "before 2005" had no condition on this build, so that half could not be done
  (p3-path/02.png).

- **A Data source filter card keeps the edges whose two ends it keeps.** Ticking a load keeps the
  nodes it supplied and every edge between them, whichever load supplied the edge (graphty-element's
  source leaf `side: "nodes"`). The Style panel's Data source card is approved and keeps its reading.
  Why: keeping pantries.csv left out all 18 routes to leave out one site (T66 A s1-path/14.png; B
  success-2/07.png), and the T68 starts inherited it.

- **Export opens on the whole graph each time, and its scope names what it writes.** Control+E, the
  main menu and Table options open Export on the whole graph; a source row's Export... sets its
  source for that opening only. The Scope list and its chip count the rows of the chosen table
  (edges on the edge table; nodes and edges for a network format). Why: after a source row's
  Export..., Control+E silently wrote an 11-node, 0-edge GraphML (T68 B detours-3/31.png), and the edge
  table's scope counted nodes, so an empty edge file went out with no sign (T68 A w2-detours/13.png).

- **A weight given in Data is the weight the analyses read**, with its Higher means reading, whether
  it was set in Fields, in the table header's Role menu, or mapped at load. Why: after T64's own path
  Shortest path opened with Weight None and counted steps (T64 B keyboard-c/107.png), and listed trips
  as "farther" while Data said closer (T64 A w3-detours/32.png).

- **A PASS INCOMPLETE that left no route unwalked is not a block.** A pilot report that walked all
  three routes but could not write its report file, or could not take a route no session can take
  either (typing an address into the system file chooser, a clipboard paste, dropping a link), is
  complete for the triage. Why: eleven reports said PASS INCOMPLETE on this pass, and in every one the
  missing part was the harness refusing report files from subagents or a limit of the study tool.

## Tier 4 data management questions, decided by the team (2026-10-29)

Each settled by an existing source; `../owner-decisions.md` "2026-10-29 -- Decided by the team: tier
4 data management questions" has the full reasoning. Binding from today.

- **A filter card's effects are `Select | Filter to | Filter out`.** Filter out writes `exclude`,
  Filter to writes `keep`; a new card starts on Filter out. Why: `design/ui/framework/glossary.md`
  line ~235 names a filter step's outcomes "Filter to" and "Filter out" and rejects "Show only" and
  "Hide" for them (lines ~183, ~421, ~474); pilots read "Hide person" as hiding the people (T65B-9).
  The T65 and T66 answer keys follow.
- **A column's Type and Role stay in the table header menu.** Why: the owner's 2026-10-20 04:36
  statement above and the approved `ui/data-prototype/spec.md` lines 166, 189, 210 ("No other
  fields list").
- **A hand selection change switches select conditions off.** Clicking the canvas, a row or Escape
  that changes the selection turns every on select condition off (graphty-element). Why:
  `interaction-patterns.md` line 321, what is ringed and what is described never differ.
- **A select condition selects only what is in the picture.** The selection is the AND of the on
  select conditions intersected with what the keep and exclude conditions leave drawn, recomputed
  when one of those changes; the order of the cards never matters. Why: `interaction-patterns.md`
  line 333, "A filter step drops from the selection the ids it leaves out"; T65 pilots saw "5 nodes
  selected" with 4 rings (T65 A s1-path/17.png).
- **Roles detected on load stay applied, and a detected row is marked.** The Fields row of a role
  the load detected carries `ui/data-prototype/spec.md` line 161's warning mark (the app reads
  `LocationColumns.from`); phone numbers are no longer detected as plus codes or geohashes. Why:
  the owner, 2026-10-23, "automatically detected fields should be automatically added to the list".
- **A date-only CSV value is written date-only.** Through an additive graphty-element option or
  value type; the app asks for it; the exporter's default output is unchanged. Why: `2015-03-02`
  exported as a UTC midnight timestamp shows the day before in a negative offset.
- **"Fields" reads "Attributes" and "Sources" reads "Data sources"; Source / Target stays.** Why:
  `glossary.md` lines 107 and 415; line 75 keeps source/target and rejects "from/to". "Type" is
  decided by the next round's A/B (`backlog.md`).
- **The column "..." tooltip shows Alt+Down** through compact-mantine's TooltipShortcut. Why: every
  hotkey has a visible button that shows its key (owner, 2026-10-25); `figma-spec.md` section 8.3.
- **Open network data has an Open button beside the address box**, through FileSource's opt-in
  `openLabel`; Enter still opens. Why: the owner's hotkey rule and R8; FileSource has no Figma
  counterpart, and an opt-in prop changes no existing look.

## Dry run pass 2 (director, 2026-10-29)

Settled by the triage of the re-pilot walks on build 037e96e9bb (`dry-run-r1-2.md` as committed at 8f1aa15875, which names each
defect by its row). Screenshots are under the main checkout's `tmp/design-studio/tier4/r1d1/pilot/`.

- **REVERSAL: a select condition selects only what is in the picture.** This entry records that the
  team entry above ("A select condition selects only what is in the picture", tier 4 data management
  questions) REVERSES dry run pass 1's "A Select card selects every match in the graph"; the team entry
  did not name it. Reason: `interaction-patterns.md` line 333 ("A filter step drops from the selection
  the ids it leaves out") and line 321 (what is ringed and what is described never differ) settle it,
  and `design/data/filter-cards.md` "Selection" follows them. Evidence: T65 A reads "5 nodes selected"
  with 4 rings (`T65A/p3-path/17.png`); T65 B reads "5 nodes selected" with 3 marked and a screen reader
  hears "5 of 5 rows, 5 selected" (`T65B/y1-path/09.png`, `y3-keys-sr/10.png`). Built in
  graphty-element as an opt-in: a select condition with `within: "picture"` selects only what the keep
  and exclude conditions leave drawn; with no `within` it selects over the whole graph as before. The
  graphty app's Select cards opt in. The answer key's T65 counts become A 4 and B 3.

- **A run asked again after its data's weight changed computes again.** Shortest path (or any run that
  reads the weight by default) with the same ends, asked again after the weight role or its "Higher
  means" reading changed in Data, computes a new result; nothing changed still hands back the stored
  run. Why: after Higher means > farther, the form showed "km (farther, loaded)" but the inspector kept
  the first run, Weight None and "Each edge counts as 1" (`T64B/rp2/detour-table-role-rerun/09.png`).

- **A node is called by its name wherever a result lists it**: a path's nodes in order, a run's or a
  layer's members and top lists, as the inspector title, the path form and find name it. Why: with
  the label set to station, Nodes in order listed G05, G08, G09 (`T64B/rp2/detour-table-role/09.png`),
  and T64 asks for the name everywhere the program names a gauge.

- **A route walked on the frozen build counts as walked.** A targeted re-pilot need not walk again a
  route that a replay on the same build already walked (each task's `rewalk.json`, or an earlier walk
  folder on the build); its PASS INCOMPLETE for that route is not a block. Why: eighteen reports on this
  pass said PASS INCOMPLETE, and every task had its success path, its detours and a keyboard walk on
  037e96e9bb. Narrows nothing: it extends "A PASS INCOMPLETE that left no route unwalked is not a
  block" (dry run pass 1) to replays.

## Dry run pass 3 (director, 2026-10-29)

Settled by the triage of the re-pilot walks on build ff17391bb1 (`dry-run-r1-3.md`, which names each
defect by its row). Screenshots are under the main checkout's `tmp/design-studio/tier4/r1d2/pilot/`.
No earlier entry is reversed.

- **A Select card's count counts what it marks.** A select condition that selects only within the
  picture counts, on its card, its matches among what the keep and exclude conditions that are on leave
  drawn, out of how many are drawn (T65 A: "4 of 14"; B: "3 of 5"), whether the card is on or off. A Hide
  card, and a select condition over the whole graph, count their rule over the whole graph as before. The
  count never depends on the order of the cards. A card's value list keeps the column's own counts over
  the whole graph. Why: the previous pass made the card select only what is in the picture and left its
  count over the whole graph, so the card that marks 4 people read "5 of 24" (`T65A/u1-path/17.png`) and
  B's read "5 of 12" with 3 marked (`T65B/z1-path/14.png`); what is ringed and what is described never
  differ (`interaction-patterns.md` line 321, the reason for "A select condition selects only what is in
  the picture"). Narrows `design/data/filter-cards.md` "Counts" for this one kind of condition.

- **What the join screen resolved is not an issue after Join.** A repeated key the join screen showed,
  and resolved by the choice made there (keep the first, keep both, ignore), is not listed again in the
  source's issues after Join; the result on screen (18 edges, 1 unknown end) is true. Whether people
  notice it on the join screen, and whether a resolved choice should stay listed, is a question for the
  sessions (T61). Why: the T61 A pilot read the missing repeat after Join as a lost answer
  (`T61A/w1-success/18.png`); the join screen shows it before Join (`answers.md` T61).

## Dry run pass 4 (director, 2026-10-29)

Settled by the triage of the second re-pilot on build ff17391bb1 (`dry-run-r1-2.md`, which names each
defect by its row). Screenshots are under the main checkout's `tmp/design-studio/tier4/r1d1/pilot/`.
No earlier entry is reversed.

- **An issue's mark is on what has the problem.** An unknown end's warning sits on the edge column
  that names the node no node row gave (Target, when a route's target is not on the site list), and
  that end's cell is the one drawn in the warning color; when both ends hold unknown nodes, both end
  columns carry it. The issue's id, count, fixes and words do not change. The element says which end
  (`params.ends` on the unknown-end issue); the app places the mark from it. Why: with the route
  list's issue shown in the Edges table, the warning sat on Source and drew P05, a site on the list,
  while P13, the target, was the one not on it (`T61A/x1-success/20.png`); the issue list names no
  site, so the table is where a person reads which one did not fit, and reading it right gave the
  wrong answer. A grading note in the answer key that works around a wrong screen is not a reason to
  keep it.

## Dry run pass 5 (director, 2026-10-29)

Settled by the triage of the re-pilot walks on build bccf8fe47f (`dry-run-r1-3.md` as committed with this
entry; the third pass's triage of that name is at cc562d52cd). Screenshots are under the main checkout's
`tmp/design-studio/tier4/r1d2/pilot/`. No earlier entry is reversed.

- **A repeated edge's mark is on both of its end columns.** An issue about a repeated edge puts its warning
  on the source and the target column of the edge table, and draws both end cells of the repeated row in
  the warning color, the way an unknown end on both ends does. Why: in T61 A's detour (deliveries.csv opened
  first) the "1 repeated edge" mark sat on the from column and tinted P03 alone, so the row read as if site
  P03 were the problem rather than the route P03 -> P10 listed twice (`T61A/d9-deliveries-first/05.png`);
  "An issue's mark is on what has the problem" (dry run pass 4) applies, and for a repeated edge the
  problem is the pair. It does not spoil grading (the row shows both ends and Overview reads 1 repeated
  edge), so it waits in `backlog.md` (dry run pass 5, T61A-2).

## Dry run pass 6 (director, 2026-10-30)

Settled by the triage of the re-pilot walks on build a53beb7179 (`dry-run-r1-4.md`, which names each defect by
its row). Screenshots are under the main checkout's `tmp/design-studio/tier4/r1d3/pilot/`. No earlier entry is
reversed.

- **A fix-now unit is taken back only for a regression its re-walk shows.** A fix whose re-walk is cut off
  before every route has a verdict stays in: the re-walk is finished on the next attempt, one browser at a
  time, and the study build is not frozen until it is. A route that diverged is judged from its stop
  screenshot; only a wrong result that the fix caused takes the fix back, and the revert names that route and
  screenshot. Why: the Select card's count ("A Select card's count counts what it marks", dry run pass 3) was
  fixed twice (42ce7201c7, 355022569a) and reverted twice (5b25463780, 0b1175dabc) as "incomplete -- not a
  regression", so two frozen builds shipped without it and four passes found the same row again; on this
  build four pilots read 5 of 24 with 4 selected and 5 of 12 with 3 selected
  (`T65A/q1-T65A-path/17.png`, `T65B/g1-path/14.png`). No replay of either attempt that finished disagreed
  with the fix.
