# Tier 4 review: Figma product designer

Build e52d7c4f57 (graphty@0.8.92), the tier 4 branch's `graphty/dist`, walked 2026-10-29 with
`real.mjs` on the GPU at 1440 x 900. Two walks; screenshots under the main checkout's
`tmp/design-studio/tier4/review/figma/`:

- `w1/`: pantries.csv from a file, Data place, Fields "+" Time, Filters "+" families, Add source >
  File... deliveries.csv, the join screen and its menu, Join, the source rows and their menu, the
  table's column header and its menu with Type, "With issues", Main menu > Export... > Data,
  Add source > Server...
- `w2/`: the start screen's "Open network data" > web address of sources.graphml, Data place,
  Filters "+" kind, a Hide card, then Graph > Style layers "+" > Layer > Which nodes > Add a
  condition (the pattern the filters are meant to share).

Lens: where a Figma pattern or the app's own pattern already solves a data control, and where the
data flows draw a bespoke one. Severity 1 cosmetic, 2 friction, 3 misleads or blocks a common route,
4 data loss. Every proposed change names its package. None needs a compact-mantine change in look
or tokens; all use components that already exist there or in the app.

## Findings, most severe first

### F1. "Hide" on a filter card keeps what it matches (severity 3)

- **Flow / screen:** filter with condition cards; Data > Filters > any card (`w2/07.png`,
  `w1/12.png`).
- **What is wrong:** the card's Select / Hide toggle starts on Hide, and Hide writes `keep`. Ticking
  "person" on a kind card with Hide on leaves only the 14 people on the canvas; a families card
  with Hide on and a value no node has blanks the whole canvas ("0 of 12"). Read as words, "Hide
  person" says the opposite of what happens. The column header menu's "Hide" (hide this column)
  uses the same word in its plain meaning, so the app now has one word with two opposite effects.
  `design/data/filter-cards.md` lists this as open question 1, built with the default.
- **Pattern to reuse:** the app's own words for the two effects: the header chip already says
  "14 of 24 nodes" (what is kept), and the Style card says "Nodes that pass every condition". Figma's
  rule is that a toggle's label names its state's effect on what is on screen.
- **Proposed change (graphty app, `data-place/Filters.tsx` `ACTION_WORDS` and the segment labels;
  the owner chose "Select / Hide", so this goes to `owner-decisions.md` "for the owner"):** name the
  segment for what it does -- "Select | Show only" (keep), with Exclude reachable as the third
  effect the element already has, or keep "Hide" and make it write `exclude`. Either is an app edit;
  saved files do not change. T65's answer key reads Hide as keep, so whichever wording wins, the
  key and the decided entry are updated with it.

### F2. Filters "+" is a bare menu, not the Style panel's condition picker (severity 3)

- **Flow / screen:** filter; Data > Filters "+" (`w1/10.png`, `w2/05.png`) against Graph > layer >
  Which nodes > Add a condition (`w2/16.png`).
- **What is wrong:** decided.md binds the filters to the Style panel's Which nodes / Which edges
  cards. The card body is shared (`CardBody`), but the door into it is not: Filters "+" is a plain
  Mantine `Menu` of column names with no search field, no kind glyphs, no value summaries
  ("3 values", "0 to 250,000"), no Data / Results / Structure groups and no Edges group even when
  the graph has edges. The Style picker has all of these. Two drawings of one list; a returning
  user who learned one does not recognize the other.
- **Pattern to reuse:** `AddCondition` in `graphty/src/workspace/style/WhichPicker.tsx` (search
  always shown and focused, arrows move, Enter takes, Esc closes), which is the Figma picker rule in
  my notes (2026-10-04).
- **Proposed change (graphty app):** Filters "+" opens `AddCondition` with the node and edge fields
  (and Largest component / Time window as Structure items), so one component draws both. Fix the
  shared part, not the screen.

### F3. A column's type and its data issues can be set only in the table (severity 3)

- **Flow / screen:** configure column types; fix data issues. Table header "Options for families"
  (`w1/25.png`, `w1/26.png`); Data > Fields (`w1/20.png`).
- **What is wrong:** the owner's rule (decided.md) is that the table is view-only and configuration
  lives in the Data place. On this build the Data place has no way to set a column's type (text,
  number, yes/no, date, category) and no list of data issues: Fields lists roles only (Id, Time,
  Latitude, Longitude). Type, Role, Rename and the issue fixes (Make blank, Ignore) live in the
  table's header menu, which is the only route for T62 and T67. The backlog already has this as a
  "2?" row; on the walk it is the only door, so it is a 3.
- **Pattern to reuse:** the Style panel's row grammar: a label, a value control, "+" to add, "-" to
  remove, settings in a popover anchored to the row (Figma's property rows). In the Data place,
  Fields becomes one row per column: kind glyph (the table header's #, Aa, category glyphs), name,
  a type Select, its role if any, and an issue badge whose popover holds the fixes. The table keeps
  the glyphs and the warning icon as read-outs and its menu points to the row ("Edit in Data").
- **Proposed change (graphty app, `data-place/Fields.tsx`; `table/HeaderMenu.tsx` loses Type, Role,
  Rename and the fixes or turns them into one "Show in Data" door).** The element already exposes the
  type and issue facts the header menu uses; no element change.

### F4. Fields shows only the selected source, and switches without saying so (severity 2)

- **Flow / screen:** join; Data after Join (`w1/18.png` against `w1/20.png`).
- **What is wrong:** after Join, Fields shows only deliveries.csv (one count chip and Direction);
  the Time, Latitude and Longitude rows set a minute earlier on pantries.csv are gone until the
  pantries row is clicked. The only cue is a 9 px source name under "Fields". Figma's left panel
  never hides a layer's properties because another layer was added; selection changes the right
  panel, not the left.
- **Pattern to reuse:** the app's own selection rule: selecting a source already drives the
  inspector (it showed "pantries.csv Source / Loaded" on the right, `w1/24.png`). The layer tree
  pattern: every item is listed, the selected one highlighted.
- **Proposed change (graphty app, `Fields.tsx`):** list every source's fields, one sub-heading per
  source (the existing source-name label, at the section-label size), the selected source's group
  first or highlighted; never drop a group because another source was selected.

### F5. Field and source pickers are plain dropdowns, not the app's picker (severity 2)

- **Flow / screen:** configure roles; Fields "Time" column Select (`w1/06.png`), Fields "+" role
  menu (`w1/05.png`), join screen's from / to / Id selects (`w1/15.png`).
- **What is wrong:** each column choice is a Mantine `Select` with no search and no kind glyph, so
  the reader cannot tell "opened" (a date read as text) from "zip" (a code) without the table. The
  join screen's key selects repeat the same plain list. The Style picker (F2) shows the glyph and a
  value summary for every column.
- **Pattern to reuse:** the same `AddCondition` list items (glyph, name, summary at the right); a
  compact-mantine `ComboInput` / listbox for the single-choice case.
- **Proposed change (graphty app):** one column-choice component used by Fields, the join screen
  and Filters, drawing the Style picker's item row.

### F6. The Time filter is drawn unlike every other card (severity 2)

- **Flow / screen:** filter; Data > Filters after a Time role is set (`w1/07.png`, `w2` n/a).
- **What is wrong:** the Time card is a bordered button with a centered calendar glyph and "Time",
  and an unlabeled checkbox at its right edge whose tooltip is "Apply the time window". It has no
  count chip, no Select / Hide, no remove button, and its contents open elsewhere. The condition
  cards beside it have all of these. Also, adding a Time role silently adds this card and a docked
  timeline that shrinks the canvas (the drawing moved without the reader asking).
- **Pattern to reuse:** the condition card's header (count chip, toggle, on box, remove), with the
  window as its body, the way the kind card's body holds its values.
- **Proposed change (graphty app, `data-place/TimeCard.tsx` and `Filters.tsx`):** draw the time
  window as a condition card header over its body; its on box names it ("Apply Time").

### F7. One fact row drawn four ways on the join screen and the table bar (severity 2)

- **Flow / screen:** join (`w1/15.png`, `w1/17.png`); table bar (`w1/27.png`).
- **What is wrong:** the join screen's result row mixes an orange pill ("18 edges added"), a blue
  pill ("1 new node"), plain text with a text button ("1 not in graph Show") and an icon with text
  ("1 repeated key"). The table bar mixes a bordered button (Nodes), plain text (Edges), a count
  ("13 nodes") and a filled toggle chip ("With issues 2"). In the join menu one item of four has an
  icon. Figma uses one chip grammar per row and a segmented control for a view switch.
- **Pattern to reuse:** compact-mantine `EntityChip` for every count; compact-mantine
  `SegmentedControl` for Nodes | Edges (the inspector's Degree "All | In | Out" already does);
  a checkbox-style toggle with its own words for "Show rows not in graph".
- **Proposed change (graphty app, `join/MatchChips.tsx`, `table/TableDock.tsx`).**

### F8. Two homes for loading from a web address or a server, with different options (severity 2)

- **Flow / screen:** load from network. Start screen > "Open network data" (`w2/02.png`) against
  Data > Sources "+" > "Server..." (`w1/32.png`, `w1/34.png`).
- **What is wrong:** the start screen's dialog offers NDEx, Neo4j, "Web API" and a "Web address of
  a graph file" field. Inside the workspace, Sources "+" offers "Server..." whose Kind list is NDEx,
  Cypher database, Neo4j, REST API, OpenAlex and SPARQL endpoint, and no web-address field at all
  (a web address works only through "Paste" with the address on the clipboard). Different names
  ("Web API" / "REST API", "Open network data" / "Server...") and different sets for one
  capability break "one home per capability, other doors use its words".
- **Pattern to reuse:** the start screen dialog's card list plus its address field, as the one
  home; Sources "+" opens it (or the same content in a popover).
- **Proposed change (graphty app, `start/NetworkDataDialog.tsx`, `data-place/AddSourceMenu.tsx`):**
  one component and one word list for both doors; a "Web address..." item in Sources "+".

### F9. Data place menus show no icons and no shortcuts (severity 2)

- **Flow / screen:** every Data "+" (Sources, Fields, Filters) and the source row "..." menu
  (`w1/14.png`, `w1/22.png`) against Style layers "+" (`w2/13.png`: icons, "Analyze... Shift+A")
  and the main menu (shortcuts at the right).
- **What is wrong:** File... has Control+O in the main menu but not here; Paste has no Control+V;
  Rename in the source menu has no F2 and the row does not rename on double-click (`w1/23.png`),
  although the layer tree does (owner, 2026-09-30: rename by double-click). Owner rule: every
  hotkey has a visible button showing its key.
- **Pattern to reuse:** the Style layers "+" menu and the main menu (Mantine `Menu.Item` with
  `leftSection` glyph and `rightSection` shortcut).
- **Proposed change (graphty app):** the same item grammar in `AddSourceMenu.tsx`, `MenuItems.tsx`
  and the Fields / Filters menus; double-click on a source row starts Rename.

### F10. Source rows swap their counts for "..." and "17/19" on hover and selection (severity 2)

- **Flow / screen:** sources (`w1/19.png`, `w1/20.png`).
- **What is wrong:** the selected or hovered row hides its node and edge chips and shows "..."
  and, for a joined file, "17/19" with no unit; the other row truncates its name ("deliverie...",
  "17...") to fit both. A fact the reader came to read disappears under the pointer.
- **Pattern to reuse:** the Style layer row (name, count, eye at rest; "..." added on hover without
  removing the count) -- one value-row grammar (my notes, 2026-10-21, item 8).
- **Proposed change (graphty app, `data-place/SourceRow.tsx`):** keep the chips, add the "..." in a
  trailing slot (compact-mantine `TrailingSlot`); say "17 of 19 rows" in the tooltip, not on the row.

### F11. Category values drawn as sentences in the card (severity 2)

- **Flow / screen:** filter; kind card (`w2/06.png`).
- **What is wrong:** each value reads "person, 14 nodes"; the count is part of the label. The Style
  picker and the inspector put counts in a right-aligned column.
- **Pattern to reuse:** the value-row grammar: checkbox, name, count right-aligned and dimmed.
- **Proposed change (graphty app, shared card body in `style/WhichPicker.tsx`, so both places
  get it).**

### F12. Export from the Data place opens on Image and leads with a nine-sentence loss list (severity 2)

- **Flow / screen:** export (`w1/29.png`, `w1/31.png`).
- **What is wrong:** with the Data place open, Export... (Control+E) lands on Image. On Data > CSV,
  "Include Styles" is on, so nine "... not written" sentences fill the panel; the Table select
  exports nodes or edges, one at a time, so two spreadsheets take two exports. The Data place has no
  export door of its own (owner: export is as common as Save).
- **Pattern to reuse:** Figma's export section is scoped to what is selected; the app's own rule
  "selection drives the panel". One line for a loss ("Styles not written in CSV" with its count
  chip), detail in the (i) popover.
- **Proposed change (graphty app, `export/ExportDialog.tsx`, `DataOutput.tsx`, `lossWords.ts`):**
  open on Data when invoked from the Data place or a source row; a source row "..." > Export...;
  Include Styles off by default for CSV; "Nodes and edges" as a Table choice (two files in one act).

### F13. Configuration outside the Data place: the inspector's "Set as time" (severity 2)

- **Flow / screen:** configure roles; Graph inspector > Values > "Time: opened Set as time"
  (`w1/02.png`).
- **What is wrong:** the inspector sets a role, which the owner's rule puts in the Data place; it
  also teaches a second home for Time.
- **Pattern to reuse:** a door that names the home: "Set in Data" opening Fields with the Time row
  added and its column chosen (the action stays one click, the home stays one).
- **Proposed change (graphty app, inspector graph values).**

### F14. Column type menu does not mark the current type (severity 2)

- **Flow / screen:** configure types; header menu > Type (`w1/26.png`).
- **What is wrong:** text, number, yes/no, date, category are listed with "N will not convert"
  hints but no check on the current one; the header glyph (category) is the only cue. Figma's menus
  check the current value. Also "1 not a number" is offered as an issue on a column typed category.
- **Proposed change (graphty app):** checkmark on the current type wherever the type is chosen
  (after F3, in the Data place row).

### F15. Small items (severity 1)

- Header click sorts Z to A first ("Sorted by families, Z to A", `w1/24.png`); spreadsheets sort
  A to Z on the first click. (`table/HeaderCell.tsx`.)
- In the header menu, "Make blank" is indented 16 px more than "Ignore" and "Show rows" under the
  same "1 not a number" label (`w1/26.png`). (`table/HeaderMenu.tsx`.)
- Sources, Fields and Filters are collapsible with chevrons; Figma's panel sections are a title and
  "+", and my notes prefer popovers to accordions. Cosmetic while each section is short.
- Fields for a GraphML lists no columns and no edge chip (`w2/05.png`), already a "2?" backlog row;
  F3's one-row-per-column Fields answers it.

## For the owner

- F1, the wording of the filter toggle. Built as the owner chose ("Select / Hide", Hide keeps the
  matches). The walk shows the word reads backward on screen. Options: "Select | Show only", or Hide
  writes `exclude`, or a third Exclude segment. Not a compact-mantine change; an app wording change
  against a decided owner rule, so it waits for the owner.
