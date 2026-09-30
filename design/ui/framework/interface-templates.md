# Interface templates

**Job.** One card per template graphty draws: the place or device it instantiates, the Figma pattern
it copies, its departures, its regions and rows top to bottom with their components, its tab order
and the states that apply. **Not here:** the frame, the row types, the sections and the inspector's
kinds (`interface-specification.md`, which this document continues and whose section 0 defines the
card); behavior (`interaction-patterns.md`); strings (`content-design.md`); what changes with size
(`state-matrix.md`). **Owner:** Figma product designer. **Ceiling:** the README's table.
**Validated by:** `interface-specification.md` 9.

Section numbers are the template numbers every document cites. Status words, the template card and
the ledger of components are `interface-specification.md` 0 and 7; a blocked part names its element
need in `interface-specification.md` 7.4.

## 0. Color on templates that show data

The Appearance section, the style-layer list, set swatches, the table's column headers and cells,
the legend, the histogram popover and the comparison surface draw data paint. Every chit, pill
swatch, header strip and legend entry reads the element's resolved paint (`element-needs.md`, "The
resolved value on each channel explanation"), never a `--cm-*` token. Every other template uses
chrome tokens only. The color rules for these templates, charts included, are `visual-language.md`
A1, A2 and A10. Each card's States field says whether it draws data paint.

## 1. Nav rail and main menu

- **Instantiates:** Nav rail; main menu (device).
- **Figma source:** 43 Navigation rail button; 32 Dark menu.
- **Departures:** `figma-crosswalk.md` 4.1, "Variables and the Tools panel are separate places";
  "Comments are a mode that replaces the inspector". Notes is blocked (`interface-specification.md` 7.4).
- **Regions and rows:** main-menu button; Graph (`RailButton`); the Assistant, in Figma's Agents
  slot, disabled until a provider is configured; Results; Notes. The main menu is a dark `Menu` in Figma's slots, its contents the outline's in
  `information-architecture.md` 4.1.
- **Tab order:** one stop, roving focus.
- **States:** none apply. Chrome only.

## 2. Graph panel

- **Instantiates:** Graph panel; chevron menu (device).
- **Figma source:** left-sidebar captures; 47 Page row; 46 Layer row.
- **Departures:** `figma-crosswalk.md` 4.1, "A layers tree lists every layer"; "Flows sit in the
  prototype sidebar"; "The left header names the file". Several graphs are blocked (`interface-specification.md` 7.4); set
  swatches are blocked (`interface-specification.md` 7.4, the set's-paint row).
- **Regions and rows:** header (project name with Not saved and View only beside it, chevron
  `Menu` holding Project info... (section 20), Minimize UI; the filter chip under the name, section 7); Graphs (`ControlSection` with the Find
  icon and "+", then `PageList`); Sets and paths (`Tree` rows as `visual-language.md` A7 orders
  them: the set, path or group glyph in the icon slot, name, the kind word in secondary text, a
  fixed paint slot with the set's resolved paint read from graphty-element (A2), empty when nothing
  paints it, then the count; member rows of the selected set take the selected-secondary role; a loaded set collection
  is one closed row with a chevron and its count, expanding in place to its sets); the split
  handle, Figma's between Pages and Layers; Styles (section 9), sharing the lower region with Sets and
  paths through the handle; Views (`Tree` rows in the analyst's order, reorderable, collapsed to its
  header by default with its count). Find replaces the lists while open (section 2a).
- **Tab order:** header; chip; Graphs; Sets and paths; Styles; Views. Each list is one stop with
  roving focus.
- **States:** the empty object list; collection sizes of sets, style layers and views, and the rows
  each shows at 1366 by 768 (`state-matrix.md` 7, 8). Data paint in set swatches and layer chips.

## 2a. Find

- **Instantiates:** Find (device).
- **Figma source:** the Pages header's Find icon and the Find panel
  (`left-sidebar/README.md` 175 and 344); 25 Search field; 48 Result and list rows.
- **Departures:** none: what Find looks for and how it groups is `information-architecture.md` 7's.
  Ranking and every hit but an exact id are blocked (`interface-specification.md` 7.4, the search row).
- **Regions and rows:** the Find `ActionIcon` on the Graphs header, whose tooltip names the kinds
  it finds (`content-design.md`); while open, in place of the lists: the search bar row
  (`SearchInput`; a scope `StyleSelect`, this graph or all graphs; Find's `Menu` with Create rule
  set); the hits as `ResultRow`s under one group header per kind, in
  `information-architecture.md` 7's order; a hit a filter step leaves out carries that step's mark;
  style-layer hits narrow the Styles list in place instead of listing rows here.
  The empty canvas and the undrawn canvas past the drawing limit point to Find
  (`state-matrix.md` 4.2).
- **Tab order:** field; scope; menu; the list (arrows move the highlight while focus stays in the
  field).
- **States:** empty query; no match; past the drawing limit (`state-matrix.md` 4.2). Chrome only.

## 3. Results panel

- **Instantiates:** Results panel.
- **Figma source:** Tools panel (actions-tab captures); 48 Result and list rows.
- **Departures:** `figma-crosswalk.md` 4.1, "Variables and the Tools panel are separate places";
  "Library updates wait behind one badged button" (the pinned strip); "A toast is transient" (the
  running notice, `interface-specification.md` 7.2). Compare with... is blocked (`interface-specification.md` 7.4, the comparison row).
- **Regions and rows:** the left panel header (`interface-specification.md` 1.2), which stays above every rail panel; `SearchInput`; pinned strip of failed or out-of-date results; "In this
  project" (one `ActionRow` per result, whose `actions` carry Compare with...; runs one disclosure
  down, whose context menu carries Compare with... for two focused runs; the band of partitions
  with no run, from the element's descriptor flags, `information-architecture.md` 3); the Catalog, one flat list of `ActionRow`s with (i), a precondition mark and a
  cost word (its threshold `principles.md`'s), narrowed by the search field and the Source and
  Family filters at every count, as Figma's Tools panel is. A result row's run states (queued,
  progress with Cancel, failed, out of date) are `ActionRow`'s `state`, `busy` and `actions`, plus
  the variant in `interface-specification.md` 7.2.
- **Tab order:** field; pinned strip; In this project; catalog.
- **States:** run states; collection sizes of results. Chrome only.

## 4. Notes panel

- **Instantiates:** Notes panel.
- **Figma source:** comments list, without its mode.
- **Departures:** `figma-crosswalk.md` 4.1, "Comments are a mode that replaces the inspector".
  Blocked on the notes collection (`interface-specification.md` 7.4).
- **Regions and rows:** the left panel header (`interface-specification.md` 1.2); `SearchInput` (Find over notes, with a target filter); a `Tree` row per
  note, newest first.
- **Tab order:** field; list.
- **States:** collection sizes of notes. Chrome only.

## 5. Assistant

- **Instantiates:** Assistant.
- **Figma source:** the Agents panel (canvas-selection `s1`, `s2` captures).
- **Departures:** none.
- **Regions and rows:** the left panel header (`interface-specification.md` 1.2); conversation; composer. Width in `interface-specification.md` 1.3. No graph rows; an object it names is
  a link that selects it.
- **Tab order:** conversation; composer.
- **States:** no provider: the rail button disabled with its reason (`state-matrix.md` 3). Chrome only.

## 6. Header rows

- **Instantiates:** Header.
- **Figma source:** header-and-modes captures.
- **Departures:** `figma-crosswalk.md` 4.1, "Share is the filled header button"; "Header row 2
  holds the Design and Prototype tabs".
- **Regions and rows:** row 1, Export... (primary `Button`). Row 2, the tab slot (Mantine `Tabs`,
  one tab naming the mode while Version history or the comparison surface holds the right column,
  as Figma's single Comments tab does; empty at rest), then the zoom and view `Menu` shown as the
  zoom level. There is no Undo button, as in Figma. The fate of the app's current history controls
  is `implementation-mapping.md` 8's.
- **Tab order:** Export; the mode tab when present; zoom menu.
- **States:** nothing to undo; a mode open. Chrome only.

## 7. Filter chip and its steps

- **Instantiates:** the filter chip and the filter steps (device).
- **Figma source:** the left header's Drafts line (`header-and-modes/README.md` 85) for the slot; a
  Mantine `Pill` trigger with 35 Light popover; 46 Layer row for the ordered list.
- **Departures:** `figma-crosswalk.md` 4.1, "The left header names the file". A checkbox, not an
  eye, turns a step off (`interface-specification.md` 2.2). Blocked (`interface-specification.md` 7.4, the filter-steps row): more than one step, reorder,
  the per-step checkbox, and step marks.
- **Regions and rows:** the chip, under the project name in the left panel header, showing the
  scope and the filter steps' count, its truncation order `content-design.md`'s; **missing**
  (`interface-specification.md` 7.3); from slice 1 a read-only statement, "Full graph". It binds the scope API that door 22, The filtered-graph scope's name and
  door 86, Whether an element is drawn settle, never `visibility.set`. Its popover, opening right of the left panel: header with Create rule set; the ordered
  steps (`Tree` rows with a checkbox in `actions`; the **Window** step while the time slider is
  on); "+". The rule editor (section 10) takes the list's place in the same popover, headed by a back
  row.
- **Tab order:** chip; then in the popover, header; the list as one stop through the treegrid
  variant (`interface-specification.md` 7.2); "+".
- **States:** filter-step counts (`state-matrix.md` 7). Chrome only.

## 8. Inspector

- **Instantiates:** Inspector.
- **Figma source:** right-sidebar-selection captures; 44 Panel section header; 45 Property rows.
- **Departures:** `figma-crosswalk.md` 4.2, "The right sidebar orders a selection's sections"; "The
  inspector shows only editable values"; "A selection's type row is one line"; "A list inside the
  right sidebar has no search field"; "A node's inspector would open with X and Y fields"; "A
  multi-selection lists every property". A definition is edited in its popover (section 10), never
  inspected here.
- **Regions and rows:** sections 3 and 4.
- **Tab order:** `interface-specification.md` 4.3.
- **States:** place by state and collection by count (`state-matrix.md` 3 and 7). Data paint in
  Appearance.

## 9. Styles list

- **Instantiates:** the Styles list in the Graph panel, and the style-layer picker opened from an
  Appearance row. Why it is in the left panel, and the one rule by which a study could move it, are
  `information-architecture.md` 11.
- **Figma source:** 46 Layer row in the Layers slot (`left-sidebar/README.md` 3, 4); the fill list
  (`right-sidebar-selection/README.md` 391) for a row's paint.
- **Departures:** `figma-crosswalk.md` 4.2, "A style row names a reusable style"; "Local styles never overlap"; "A layers panel is
  grouped by hand"; "Hovering a style in Selection colors marks what uses it"; "Overrides are listed
  per instance"; "A frame's default look is its own fill". Blocked (`interface-specification.md` 7.4): the Overrides and Base
  style rows (the Overrides row), the painted count and Select painted (the painted row).
- **Regions and rows:** section header with "+" and a `Menu` holding Export style...
  (`output-homes.md` 3), and no search field of its own: Find's style-layer hits narrow this list in
  stack order (section 2a); hidden elements are never here (their home is the not-drawn line,
  `output-homes.md` 1). **Overrides** kept first once used; the stack in precedence order, top wins,
  cut at rest by count with an "N more" row that expands in place in the section's own scroll area;
  a run of layers that paint nothing collapses in place into one "N layers paint nothing" row, so
  nothing reorders (`interaction-pattern-entries.md` 6.8); **Base style** pinned last and always
  visible, because the floor of the stack is never hidden. Rows at rest and how the section shares
  height with Sets and paths are `state-matrix.md` 7 and 8. Each `Tree` row, as
  `visual-language.md` A7 orders it: the layer's chip in the icon slot (the drawing of
  `canvas-drawing.md` 3; no style-layer glyph), name, its origin word from `LayerSource.by` in
  secondary text (the words are `content-design.md` 3's; `element` layers are the Base style row, or
  marks that are not listed), and the eye (`ToggleIconButton`); the channels it writes, the count it
  paints and **Select painted** sit in the hover and focus `TrailingSlot`. Never sections or bands by
  source; a **Source** facet in the header menu narrows the list to what one recipe or run brought.
  The row's menu holds Move up and Move down. A drop resolves to a flat stack index: `Tree`'s "into"
  zone is disabled here (a variant, `interface-specification.md` 7.2). Activating a row opens the style-layer editor to the right
  of the left panel (section 10).
- **Tab order:** header; the list as one stop, once `Tree` has the treegrid variant (`interface-specification.md` 7.2).
- **States:** style-layer count classes (`state-matrix.md` 7). Data paint in chits.

## 10. Editor popovers

One template, many editors.

- **Instantiates:** the editor popover (device).
- **Figma source:** 35 Light popover; `../figma/flows.md` 5.
- **Departures:** `figma-crosswalk.md` 4.2, "A style's editor header names the style"; "A popover
  opens beside its trigger". The Position editor is read-only (`interface-specification.md` 7.4, the position precondition).
- **Regions and rows:** header (drawn by `Popout.Panel` from `PopoutHeaderConfig`, naming target
  and kind; the result editor carries Run, and Cancel while running, and the layout editor
  Run, and Stop while settling, as its `TrailingSlot`); body of rows; no footer unless the editor commits explicitly. Width
  `PANEL_GRID.POPOVER_WIDTH`; label column `PANEL_GRID.LABEL_COLUMN`. It sits beside the row of
  the definition it edits: left of the inspector from an inspector row, right of the left panel from
  a left-panel row or the chip, top-aligned to that row. A catalog row focuses the new result's row
  (`interaction-pattern-entries.md` 6.1), and the editor sits beside that row. From a menu or
  Quick actions it sits beside the definition's row when that row is in view, else in the inspector
  position. Its modality and depth are
  `interaction-pattern-entries.md` 6.2's; an advanced tier inside an editor folds in place (section 11).
- **Tab order:** header, including Run; body in row order.
- **States:** a short window (`state-matrix.md` 3). Data paint in the style-layer editor.

| Editor | Body, in order | Form mode |
|---|---|---|
| Style layer | header: eye, Move up, Move down; selector (its inline rule, or the kept set it references); channel groups, including the tooltip channels; each bound channel's pill, whose scale opens in the encoding popover (below); legend; the count painted (blocked); the No value count on a bound channel; Notes (the notes about this layer); Used by | sparse |
| Base style (blocked) | channel groups, no selector | sparse |
| Result | header: Run or Cancel; the state line; Scope (with a search's Filtered graph or Full graph); arguments; Direction and Weight; Parameters; **Appearance**: its automatic layer with its eye, the suppression state line ("<channel> set by <layer>", Apply anyway), then the encoding verbs `options-and-encodings.md` 4 lists for the result's shape, each adding a style layer bound to this result; then its readings: headline readings; for a partition, top and bottom items (opening the item tab); for a metric, **Top nodes**, its top N with values, whose "N more" opens the Nodes tab sorted by this result's column (`element-needs.md`, "A ranking read for a metric result"); Notes (the notes about this result); Used by | dense |
| Layout | header: Run or Stop, and the Run line's state word ("waits for Run" or "applies as you edit", `interaction-patterns.md` 3.3); layout; its method (force layouts); scope, read from the layout settings, with the count of hidden nodes it reads; the layout's options; encoded axes | dense |
| Encoding (the nested picker of a bound row) | header: the attribute and channel, then Fix at <value> when opened from a layer editor, or the layer it will write when opened by a verb (Size by, Color by); scale; domain with its histogram; palette; bins or steps; midpoint; overflow (Other); No value; Range, with its unit (required until the element has a default range per channel) | dense |
| Edges | Direction; Weight and its role | dense |
| Position (blocked) | x, y, and z in 3D, as `FieldRow`s | -- |
| Rule | predicate with AND, OR, NOT and membership; Scope; Population; Notes (on a filter step or rule set) | -- |
| View | title, caption, graphs, notes shown (blocked), export setting (3), changed-since-applied row | -- |
| Note (blocked) | text, targets, cited runs and steps, quoted values | -- |

**The encoding popover takes the nested-picker slot** of `interaction-pattern-entries.md` 6.2: it
opens beside the bound row of a style-layer editor, or beside the column header or Appearance row
whose verb opened it, and its own color and palette choices fold in place inside it, so no third
overlay opens. Its rules are `options-and-encodings.md` 4 and 5.

**Style channel groups.** Each group is a `ControlSection` whose empty state is the header with "+"
(a `ControlSection` variant, `interface-specification.md` 7.2). The groups, their order and the advanced tier are data on
graphty-element's channel descriptor, blocked (`interface-specification.md` 7.4, the channel-descriptor row); the design rule,
the provisional table and the card sort are `options-and-encodings.md`'s. In **Ends** the first
row, **Arrows**, is one `PANEL_GRID.CAPTION_ROW` with head on the left and tail on the right, each a
shape `StyleSelect`, as Figma pairs Start point and End point on one row
(`right-sidebar-selection/line-sec-stroke.html`); the end's size, color, opacity and text sit under
a head/tail `SegmentedControl`, since a chit plus a number fills a column.

## 11. The option form

- **Instantiates:** the body of every editor that shows options: algorithm, layout, style channels,
  import mapping, export.
- **Figma source:** 45 Property rows; 27 Color chit, 28 Paint row and 30 Color picker for color
  values; 21 Alignment matrix for label position; 35 Light popover for the advanced tier of an
  inspector row.
- **Departures:** `figma-crosswalk.md` 4.2, "Property rows take typed values". The pick command and
  the filtered lists are blocked (`interface-specification.md` 7.4, the pick row).
- **Regions and rows:** `SchemaForm`, **missing** (`interface-specification.md` 7.3; its port is `implementation-mapping.md`
  5's). Channel rows are blocked on the channel descriptor (`interface-specification.md` 7.4).
- **Tab order:** row order; an advanced tier after the rows it belongs to.
- **States:** channel readability (`scale-levels.md` 4). Data paint in color fields.

Which component draws each option type (`OPTION_TYPES`, `catalog/types.ts`) and each style value
kind (`ChannelValueKind`), the one table; every row is one of the closed set of `interface-specification.md` 2.1. **The app renders**
`seed`, the type slots, `labelStyle` and a bound channel; compact-mantine the rest. Numeric fields
are `ComboInput`s given a glyph by `SchemaForm`, so they scrub. Tiers are
`options-and-encodings.md`'s.

| Type | Row |
|---|---|
| `number` | `FieldRow` with a numeric `ComboInput`, scrubbing by `step`, or by one unit where `step` is absent |
| `integer` | as `number`, with a step of 1 |
| `enum`, three values or fewer | `SegmentedControl` |
| `enum`, more | `StyleSelect` |
| `boolean` | `ToggleRow` checkbox, grouped with neighbors |
| `string` | `FieldRow` with a text input; `PanelField` when it spans |
| `unknown` | a read-only `DataRow` quoting `unsupportedReason`, never hidden |
| `seed` | as `number`, with New seed in the `TrailingSlot` |
| `attribute`, `partition`, `ordering` | a **type slot**: `ComboInput` filled from the element's attribute or partition list, filtered by measurement level (blocked, `interface-specification.md` 7.4) |
| `node-id`, `node-set` | a **type slot**: a field that accepts a typed id, the selection, a set, or a pick on the canvas through the element's pick command, in the `TrailingSlot` (blocked, `interface-specification.md` 7.4) |
| color channel (`accepts: "color"`) | `FieldRow` holding `CompactColorInput` (chit and hex), which opens `ColorPickerPanel` as the nested picker |
| `number`, `enum`, `boolean`, `text` channel | as the option of the same kind (`text` as `string`), from the descriptor's `min`, `max` and `values` |
| `labelStyle` channel | constants only (the element refuses a binding): size (numeric `ComboInput`) inline on the text row; color (`CompactColorInput`) in the popover's Fill section, as in Figma; the rest in the text-style popover (`options-and-encodings.md` 3), with font `StyleSelect` and position `AlignmentMatrix` |
| `nothing` channel | not drawn (`node.marker`) |
| a bound channel | `VariablePill` naming the attribute in place of the field; its scale is in the encoding popover (`options-and-encodings.md` 4): a ramp for a quantity, swatch rows for categories |

| Modifier field | Effect on the row |
|---|---|
| `group` | the row sits in that group's `ControlSection`, or a `ControlGroup` legend inside one |
| `advanced: true`, inside an editor popover | folds in place in a `ControlSubGroup`, so no third overlay opens |
| `advanced: true`, on a row drawn directly in the inspector | behind the row's `AdvancedButton`, in a popover |
| `internal: true` | never drawn |
| `description` | an `InfoCircle` on the label |
| `min` or `max` as an `OptionBound` | blocked on graph-dependent bounds (`interface-specification.md` 7.4) |
| `caveat` on a renderable channel | an `InfoCircle` on the label |

The app renders a type slot and calls the element's pick command and list reads; it never resolves
a pick or filters attributes itself.

## 12. Attribute histogram popover

- **Instantiates:** the histogram, a device opened from a column header, a numeric Attributes row,
  and the degree distribution.
- **Figma source:** 35 Light popover; Figma has no chart.
- **Departures:** `figma-crosswalk.md` 4.2, "Figma's popovers hold no chart". A result field over
  the whole graph reads that result's `histogram(field)`; bins for any other attribute or scope, and
  the degree distribution, are blocked (`interface-specification.md` 7.4, the histogram-bins row).
- **Regions and rows:** header; variant row (on degree); `HistogramRow` at popover width with a
  band; caption (`ProseBlock`); top items (`DataRow`, cap in `interface-specification.md` 4.1a); band menu
  (Create set, Create rule set). A draggable band on `HistogramRow` **needs a variant** (`interface-specification.md` 7.2). **The
  degree distribution takes a taller form** than a one- or two-pitch statistics row, because a
  heavy tail needs log axes to be read: log-log axes or a complementary cumulative mode, a dot strip
  below about twenty values, the count of zero-degree nodes beside the chart, and the encoding ramp
  drawn over it on the same transform (`options-and-encodings.md` 5). The element returns the
  chart's description (bins, transform, ticks) and `HistogramRow` only draws it; its variants are
  `implementation-mapping.md` 10.1's.
- **Tab order:** header; variant; chart; top items; band menu.
- **States:** histogram bins, small graphs (`state-matrix.md` 7; `scale-levels.md` 3). Data paint.

## 13. Canvas furniture

- **Instantiates:** Canvas.
- **Figma source:** 50 Canvas overlays; 15 Floating help button; Figma's minimap (documentation, not
  captured).
- **Departures:** `figma-crosswalk.md` 4.1, "The canvas carries no chrome but the toolbar and
  Help"; 4.3, "Hover draws an outline and nothing else". In `interface-specification.md` 7.4: the drawn legend, the not-drawn
  line and the minimap (workarounds), note markers (the notes row), the default tooltip.
- **Regions and rows:** the drawing, the hover forms and tooltip (`canvas-drawing.md` 9), the legend
  (bottom left, `interface-specification.md` 1.1) with the not-drawn line as its last line, the minimap and note markers, all **graphty-element's**, because a bare embed
  needs them too (their show state: `conceptual-model.md` 1.1). **There is one legend**,
  graphty-element's; the app hosts it (door 58, The legend and not-drawn notice). The tooltip is drawn by the element
  from the `node.tooltip` and `node.tooltipStyle` channels (its surface: `canvas-drawing.md` 8).
  Help (`HelpButton`, bottom right). Everything else sits at its smallest scope
  (`interaction-pattern-entries.md` 8.1). A pending recipe's binding summary is a `ProseBlock`
  here and on the start screen (section 19).
- **Tab order:** the canvas is one region (`interaction-pattern-entries.md` 9.2); Help is its own stop.
- **States:** capability by scale (`scale-levels.md`). Data paint in the legend and tooltip.

## 14. Floating toolbar and secondary bar

- **Instantiates:** Floating toolbar.
- **Figma source:** 40 Floating toolbar; 41 Tool button, tool group and flyout; 42 Contextual
  secondary bar; the mode control at the right end of the bottom toolbar, an 18 Segmented control
  (`header-and-modes/README.md`, `toolbelt-mode-segmented-control`), whose slot the view mode takes.
- **Departures:** `figma-crosswalk.md` 4.1, "The bottom toolbar holds about seventeen targets";
  4.3, "The mode control shows every mode"; "Lasso belongs to vector edit mode". The Note tool is
  blocked (`interface-specification.md` 7.4).
- **Regions and rows:** Select (with Lasso and Hand in its flyout, as Figma UI3 puts Hand in the
  Move tool's flyout), Path, Note (`ToolButton` in `ToolGroup`); Quick actions button; view mode
  (`ToolButton` with flyout, the same component as Select's). The secondary bar exists only while a
  tool is armed: the Path tool's holds From, To, Scope, Parameters and Run; the Note tool's holds
  its target.
- **Tab order:** toolbar one stop with roving focus; the secondary bar after it.
- **States:** a tool armed (`state-matrix.md` 2). Chrome only.

## 15. Quick actions

- **Instantiates:** Quick actions (device).
- **Figma source:** 38 Quick actions palette.
- **Departures:** `figma-crosswalk.md` 4.1, "The Actions menu has tabs".
- **Regions and rows:** input; one list of recents, commands, then catalog entries
  (`ResultRow`). `QuickActions`, exists.
- **Tab order:** input; the list (arrows move the highlight while focus stays in the input).
- **States:** empty query; no match. Chrome only.

## 16. Bottom dock: table and time slider

- **Instantiates:** Bottom dock.
- **Figma source:** 56 Spreadsheet table (Variables); 54 Resize handle; 16 Pill tabs.
- **Departures:** `figma-crosswalk.md` 4.1, "Figma has no dock table"; "The Variables table sits
  on Figma's row pitch". Blocked (`interface-specification.md` 7.4): rows past the drawing limit (the paged-listing row); the
  column profile over any scope but the whole graph (scoped reads); cell chits (the resolved-value
  row); the Scatter and Between groups views (the binned-density row).
- **Regions and rows:** `ResizeHandle`; the **time slider strip**, pinned above the tabs whenever
  the View menu's Time slider is on: range handles, Play and Pause with speed, Step, and an
  overflow `Menu` holding Compare with previous window (the time-window component, `interface-specification.md` 7.3). The tab
  header (Mantine `Tabs`, pills: Nodes, Edges, one item tab; a type facet when a type role is declared; Export
  table); the scope line (`ProseBlock`) naming the table's scope (`information-architecture.md`
  8.1, "The table's scope") and, when it is not the filtered graph, ending in Show filtered graph;
  `DataTable` (virtualized, `DataTable.tsx` 21 and 378), sorting and searching the rows it holds,
  a result column sorting by that result's `ranking(field)`; on the Nodes and Edges tabs a Scatter
  view, reached by Compare with... on a column; on the item tab of a partition result, named by its
  kind and result ("Communities: Louvain"), Between groups and Scatter. The Scatter and Between
  groups views are views of the table, outside the tree test (`information-architecture.md` 10,
  question 5). Column headers carry the profile and completeness (over the
  whole graph, `data.attributes()`), and an encoding strip when a layer reads the
  column, drawn with `RampRow`'s mini form; each cell of such a column carries a chit of its
  resolved paint beside the raw value (a `DataTable` cell variant, `interface-specification.md` 7.2), as
  `information-architecture.md` 8.1 places it. The header menu's length is `interface-specification.md` 4.1a's; rows keep one density (`visual-language.md` A5).
- **Tab order:** slider strip; tabs; the grid (one stop, a WAI-ARIA grid).
- **States:** past the drawing limit (`state-matrix.md` 4.2); time windows (`scale-levels.md`,
  7). Data paint in header strips and cell chits.

## 17. Version history mode

- **Instantiates:** Version history.
- **Figma source:** Figma's version history panel (documentation, not captured; only the save
  dialog and menu entries are).
- **Departures:** `figma-crosswalk.md` 4.1, "Version history lists autosaves". Blocked (`interface-specification.md` 7.4).
- **Regions and rows:** replaces the inspector column: header with Done and Export (the operation
  log); entries (`ActionRow`); an entry's report at full height. Report contents are
  `conceptual-model.md`'s.
- **Tab order:** header; entries; the open report.
- **States:** one entry; many entries. Chrome only.

## 18. Comparison surface mode

- **Instantiates:** Comparison surface.
- **Figma source:** branch review (documentation, not captured).
- **Departures:** `figma-crosswalk.md` 4.3, "Branch review overlays two versions"; "Branch review
  marks changes by color". The whole surface is blocked (`interface-specification.md` 7.4, the comparison row).
- **Regions and rows:** canvas split into two sides, each with a header row naming its graph and
  version; `ResizeHandle` between them; the inspector column replaced by a header with Save
  comparison and Done, always visible, over the difference list (`ActionRow`s; `CompoundRow` A, B
  and difference readings, in the compact form of `content-design.md` 5). **Entry points:** a
  result row's Compare with...; two focused runs' Compare with...; a graph row's; two focused set
  or graph rows'; a kept object's; the time slider's Compare with previous window; the
  Compare-with picker (section 22) names a second side that the entry point does not.
- **Tab order:** a focus region of its own; Save comparison; Done, its exit; the difference list.
  Esc inside it is `interaction-patterns.md` 3.6's.
- **States:** readings per side (`state-matrix.md` 8). Data paint; membership is drawn by form
  (`canvas-drawing.md` 11).

## 19. Start screen

- **Instantiates:** Start screen.
- **Figma source:** the file browser's recents, reduced (documentation, not captured).
- **Departures:** none in order, as principle 5 models it: recents first, then samples by name and
  thumbnail, then one Open... that also accepts a drop, with Connect to data source... beside it.
- **Regions and rows:** recents (`ActionRow`, "N more" at the cap in `principles.md` 5); samples
  (`ActionRow` with a thumbnail); Open... and Connect to data source... (`ActionRow`s; the list is
  `information-architecture.md` 4.1's). With a recipe pending, a binding-summary `ProseBlock`
  heads the list (`task-flows.md`, Apply a recipe).
- **Tab order:** recents; samples; Open...; Connect to data source....
- **States:** first run (no recents, so the section is absent); recipe pending
  (`state-matrix.md` 3). Chrome only.

## 20. Dialogs

- **Instantiates:** every dialog in the table below.
- **Figma source:** 36 Modal dialog; per body as listed.
- **Departures:** `figma-crosswalk.md` 4.1, "Every dialog has a Figma counterpart" (New graph
  from, Connect to data source, AI provider); the load step's (section 20a). New graph from is blocked
  (`interface-specification.md` 7.4, several graphs).
- **Regions and rows:** Mantine `Modal`; body of rows; `ModalFooter` with the commit button. Modal,
  because each commits something that cannot be left half set.
- **Tab order:** body in row order; footer.
- **States:** a preview not yet available (the body shows its loading row). Chrome only.

| Dialog | Figma source | Body |
|---|---|---|
| Load step | none (section 20a) | 5.20a |
| Apply recipe, Use as this project's overview | Libraries modal | a recipe preview: what the file carries (style layers, views, algorithms, an overview), each a `ToggleRow`; then the binding step |
| Binding step | missing-fonts dialog | one row per unresolved reference: its name, then a picker (`ComboInput` type slot for an attribute; `StyleSelect` for a set or argument slot); unbound rows stay listed with what they block (`task-flows.md`, Apply a recipe) |
| Add attribute... | Variables' create dialog | name (`PanelField`), kind, the value or expression (`PanelField`) |
| New graph from: Combine graphs, Bipartite projection, Quotient graph, Sample from null model | none; one template with variants | the source graphs or the partition (`StyleSelect`), then the variant's options through the option form (section 11) |
| Connect to data source... | none | the source's fields through the option form |
| Export... | Export dialog | one `ControlSection` per exportable kind, each item with a checkbox and its own setting row: **figure** (the current view and each saved view, with the Export section's setting row and Copy as PNG (3); vector formats blocked, `interface-specification.md` 7.4); **data** (a graph-io format `StyleSelect` and a scope; blocked, `interface-specification.md` 7.4); **table** (the dock's tabs); **recipe** (Export recipe...); **style** (Export style...); **findings report** (notes with their quotes and citations; blocked, `interface-specification.md` 7.4) |
| Project info... | file details (documentation, not captured) | name and description (`PanelField`s); provenance readings |
| Preferences | Preferences submenu | `ToggleRow`s, and the GPU policy the element owns; a place of the device kind (`information-architecture.md` 4) |
| AI provider | none | provider, key, model (`FieldRow`s) |

## 20a. Load step

- **Instantiates:** the load step for Open, Add data, Join, Replace data and Re-map columns.
- **Figma source:** none; Figma's import has no mapping or validation step.
- **Departures:** `figma-crosswalk.md` 4.2, "adds first with defaults, for data"; "The
  Missing-fonts dialog lists unresolved items". The load preview is blocked (`interface-specification.md` 7.4).
- **Regions and rows:** the format row (`FieldRow`, `StyleSelect` holding the detected format);
  the mapping rows: source, target and id columns as `ComboInput` type slots, and each column's
  kind and role as `StyleSelect`; for a join, the expected match count (`MetricRow`); the issues
  list, one `DataRow` per issue with a severity glyph, blocking issues first, each routing to its
  rows in the sample, and an issue with a policy (parallel edges, `load.parallelEdges`) carrying a
  `StyleSelect` of its policies, each stating its result in counts, committed by the footer; the `DataTable` sample; the counts (`MetricRow`s, nodes and edges read);
  `ModalFooter` with a reason slot beside the commit. Detection, mapping, issues, the sample and
  the counts are the element's preview; the app draws them.
- **Tab order:** format; mapping rows; issues; sample; footer.
- **States:** the load step and size (`state-matrix.md` 3, 4.3).
  Chrome only.

## 21. Menus

- **Instantiates:** chevron menu, zoom and view menu, context menu, header menus.
- **Figma source:** 32 Dark menu; 33 Context menu.
- **Departures:** none.
- **Regions and rows:** Mantine `Menu`, dark in both themes; `ContextMenu` at the pointer;
  `MenuCheckItem` for toggles, in two groups split by a divider: those a saved view captures
  (Labels on canvas, Show arrows, Legend) and the reader's (Note markers, Minimap, Additional
  labels, Follow selection; Minimap and Note markers blocked, `interface-specification.md` 7.4); the split's reason is
  `interaction-patterns.md` 1.1's. Contents are the outline's, less every command whose need is
  in `interface-specification.md` 7.4.
- **Tab order:** arrows within the menu; where focus goes after Esc is `interaction-patterns.md`
  3.6.
- **States:** none apply. Chrome only.

## 22. Small popovers

- **Instantiates:** the Compare-with picker; the catalog (i) popover.
- **Figma source:** 35 Light popover; 34 Tooltip for the (i).
- **Departures:** none.
- **Regions and rows:** Compare-with picker: a `SearchInput` over the operands
  `conceptual-model.md` 4.7 allows for the first side, then `ResultRow`s. The (i) popover: title,
  the method (`ProseBlock`), cost word, preconditions and a citation link, read from the catalog
  entry.
- **Tab order:** field, then list; the (i) popover holds one link.
- **States:** nothing comparable (the picker shows its title only). Chrome only.

## Sources

- As `interface-specification.md`, Sources; this document held its section 5 until the
  specification passed its ceiling and split by its growth rule
