# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-12) **Every style has a home** (`style/coverage.ts`, test `style/__tests__/coverage.test.ts`).
  Three maps: every `Channel`, every `LabelStyle` field and every graph setting to the control that
  sets it (`{ place }`) or why it is not offered (`{ notOffered }`). The test walks the element's
  `CHANNELS`, `LABEL_STYLE_FIELDS` and the graph settings it publishes as lists
  (`GraphSelectionStyleOpts.shape` keys, `GraphBackground` kinds), checks a stubbed extra channel is
  named, and checks the map places exactly the channels the Style tab draws (`CORE_ROWS`, `LISTS`,
  the label entry's three channels) -- so the map cannot claim a control that is not built. The
  label's `enabled` is the entry's eye. Honest gaps, marked not offered: tooltip look channels (4),
  label color and background CHANNELS (the Label settings write `labelStyle.color` / `background`
  as one color; varying them has no control), end captions (10 `arrowHead/TailText*`), and the
  label fields `gradientColors`, `icon`, `overflowSuffix`. The rest of the graph's settings
  (`viewMode`, `lighting`, `layoutBehavior`, ...) have no published list, so they are mapped by hand
  and not walked; an additive `GRAPH_SETTINGS` list in the catalog would let the test walk them.
  Seen failing, not mine: the app's tsc on `historyWords.ts` (both), `inspector/words.ts` and
  `utils/channelControls.ts` (new channels missing from their records).

- (2026-10-12) **The Values tab is built for every row** (`inspector/LayerValues.tsx`, mounted by
  `Inspector.tsx` for `layer-row` and `folder-row`, whose kinds now take tabs Style | Values in
  `graph-place/commands.ts`; test `inspector/__tests__/LayerValues.real-element.test.tsx`, on Les
  Miserables). One component for every layer row, driven by what the row reads, never by where it
  came from: Summary (matched per part, Values read with the run's state or "Data", and "Is
  selected / Is hovered: This view only" for a state selector), then per value read: a path run's
  numbered steps (reuses `PathValues`, now exported), a category binding's groups (largest first,
  the chit from `legendOf`, a click selects the group by a `categories` rule scope, and the layer's
  `unmatched` codes worded), a number's histogram with min, median and max and, for a stepped
  binding, its step counts; then "Top N by" lists, a set or rule layer's members (when it matches
  100 or fewer nodes), Selected's and Hovered's current elements, and Painted last ("Node color: 11
  of 77"). A folder lists each value its layers read with the layers that read it. Element
  additions it needed: `StyleCounts.reads` (the compiled layer already knew its reads; the app's
  session type cannot reach `compiled()`) and `Histogram.min/median/max` (the column statistics
  behind every histogram already had them). Data columns have no median in `attributes()`, so the
  Degree acceptance compares the run's `summary()`, which is where a run's value is described.
  The inspector's Tabs no longer keep the hidden tab mounted, so a row's Values (a walk per layer)
  are read only when shown. NOT built: per-layer label counts (the element counts labels for the
  whole graph only; Painted shows the label channel's count), search inside "N more" (it expands
  the rest), a member list for edge-only sets. Seen: a click on a Values group selects it, and the
  inspector's selection rule then closes the row (the reader lands on the selection, the door to
  "New layer from selection"). Clicking a node on a force layout needs the click retried at the
  element's current position until it selects (the layout is still moving).

- (2026-10-12) **Graph settings are built** (`inspector/GraphSettings.tsx`, mounted for the graph
  in place of the old Canvas section; test `inspector/__tests__/GraphSettings.real-element.test.tsx`).
  Canvas: Background (Color | Image; Image takes an address, since an empty skybox is refused),
  View (3D | 2D through `session.layout.setDimension`), Lighting, Same size at any depth,
  Highlight color. Labels: Hide overlapping labels, Move labels off nodes and edges. The
  background and the view are the project's and go through the session; lighting, the label
  rules, same size and the highlight color are the reader's view preferences, kept in the chrome
  store (`lighting`, `labelsAvoid`, `sameSizeAtAnyDepth`, `highlightColor`) and written on the
  element's tag by `frame/ElementHost.tsx`, so they survive a project switch (each project mounts a
  new element) and record no undo step. Same size is null until the reader sets it, so it follows
  the size binding as before (`frame/useSizeBound.ts`, moved out so the panel shows the same
  value). Hide overlapping labels is the inverse of the existing `allLabelsShown`, shared with the
  Text list's "Show all labels". No element change was needed. Seen: the layout form under the
  settings draws its own 3D | 2D (the layout's shape, not the camera), so tests reach View through
  its radiogroup; two identical-looking toggles in one panel is a candidate for the studio to
  judge. Failing, not mine: `frame/__tests__/undoWords.real-element.test.tsx` cannot find a
  treeitem named "Selection", and the app's tsc on `historyWords.ts` and `inspector/words.ts`.

- (2026-10-12) **The binding popovers are built** (`style/BindingPopover.tsx`, test
  `BindingPopover.real-element.test.tsx`). One component, two bodies chosen by the element's own
  preview: `preview.domain === null` is categories, else a ramp. Ramp: compact-mantine `RampEditor`
  fed by `styles.preview` (bars painted for colors, plain for numbers), domain handles write
  `domain` and drop `clamp` (the element takes one or the other), "Fit to the data" clears the
  domain, "Clamp outliers" writes percentiles [2, 98] with two percentile fields, and the brackets
  sit at the clamped domain's ends with the preview's below/above counts. A stepped scale (Equal
  bins, Equal counts) gets a Steps number and a list of steps with `preview.stepCounts` and "New
  layer for <step>" (a `range` rule). Categories: palette select with strips, rows from
  `styles.categories` (chit = `CompactColorInput` or a number field writing `styles.setValueEntry`,
  name, count, the minus "Back to the palette: <v>", the eye through `styles.setValueHidden`, a
  menu with "New layer for <v>"), a search past 8 rows, and "More values than colors" (overflow).
  Both: No value, Combine (numbers), and "Fix at <value>" -- the value is the element's own
  one-bin preview (or the largest group's paint), written as a literal; the pill's own detach still
  writes the starting value. Why one-bin preview and not `resolveToStatic`: the button must name
  the value before it is pressed, and the preview is the element's answer for it.
  "New layer for <v>" adds a layer `{ above: layerId }` whose rule is a `categories` leaf on the
  binding's path, starting with `set` = what that value paints now: the element refuses a layer
  that writes nothing, and this changes nothing on the canvas until the reader edits it.
  Element fixes it needed: `BindingPreview.stepCounts` (additive) and rule leaves over a run's value
  (`results.louvain.group` matched nothing: `valueSourceOf` in `GraphSession.ts` read only records;
  it now reads `results.` paths through the style selector source). The element's own
  value-entries test only checked that a hand rule FOLLOWED community 3, never that it matched
  anything; it now counts.
  NOT built: "values not listed (Skip or Paint)" -- no binding field for it in the element
  (additive later); Other's share as a number; shape and pattern schemes (the scheme select is
  colors only); handle words with percentiles (`describe` says the value only); a clamp dragged on
  the bars (clamps are percentiles, the axis spans the clamped domain, so the brackets are drawn
  without a drag handler -- they still render as sliders that do nothing). The axis spans the
  domain, not the data: widening past the data is typed, not dragged. A range rule includes both
  ends while a step does not, so a value on a cut is in two step layers.
  Seen failing at HEAD, not mine: `door-surface.test.ts` ("SelectionApi.layerSelector" not
  classified), and the app's tsc on history words and channel controls.

- (2026-10-12) **The value picker is built** (`style/ValuePicker.tsx`, replacing `FromDataList.tsx`;
  test `ValuePicker.real-element.test.tsx`). Still compact-mantine's `QuickActions` (search focused
  on open, arrows and Enter, flat results while searching), now with its second line: each row
  carries one fact from the column's descriptor ("20 to 40", "6 values", "84% have a value") and a
  glyph for what it measures (`typeOf`, now exported from `data-place/words.ts`). Groups: In use
  (a column's `usedBy`, plus the caller's `inUse` paths for run results), Data, one per run. What
  the channel cannot take folds into one row, "N that do not fit size", counted from
  `styles.proposeEncoding`; running it lists each refused column, disabled, its reason as the
  second line; a search finds them anyway. Why fold and not a "Cannot be used: <reason>" heading per
  reason: on 200 columns those headings pushed the usable list off the panel. "=" in a number
  field opens it: the open state moved from `VaryButton` up into `Field` (the capture-phase key
  handler sets it), so the glyph stays the popout's anchor. Only fields with a vary glyph react
  (`bindsAtRest`: size and width among numbers). The dialog keeps the accessible name "From data"
  so every existing test and story still finds it. NOT built: the Facts group (is selected, is
  hovered): no binding reads a state, and Selected and Hovered are layers already; a fact per run
  result (a run's `FieldDescriptor` carries no range; the element would need one, additive).
  Measured: the 200-column fixture opens with zero calls to `data.nodes`, `edges`, `nodePage`,
  `edgePage`, `node` and `histogram`. A row's `textContent` now includes its fact: tests read an
  option's name from `aria-label`.
- (2026-10-12) Seen again: the first real-element run after vite's "Forced re-optimization of
  dependencies" fails every file with "Failed to fetch dynamically imported module"; the same run
  again passes. Not a code failure; rerun once before reading anything into it.

- (2026-10-12) **Folders, several rows at once, and the draft are built** (`style/FolderPanel.tsx`,
  `style/MultiRowPanel.tsx`, `style/SelectionColors.tsx`, the draft in `StylePanel.tsx`; test
  `style/__tests__/RowKinds.real-element.test.tsx`). The old one-line panels in `StyleTree.tsx` are
  gone. A folder's panel lists its rows top first, each with its eye, a click opening the row, then
  Selection colors. Selection colors read `styles.colors(rowIds)` and write
  `styles.replaceColor(rowIds, from, to)`: up to three chits and "+N", a click expands to one row
  per color naming its layers top first; the element skips locked layers and makes it one undo
  step. Several rows reuse the Style tab's own groups through a new optional `RowContext.many`
  (`line`, `write`, `clear`): `Field` and the settings' combine read and write through it, so there
  is no second field component. A write is one `session.transaction` of `tx.styles.update` on each
  row's topmost unlocked layer of that kind; a locked row (or one in a locked folder) is left out of
  both the reading and the write and named in "Locked, left unchanged: ...". Groups shown are the
  kinds every writable layer row has; folders among the selection add only their colors. "Mixed"
  is the placeholder when the rows differ or some leave it unset; the accessible name says
  "<field>, mixed: <rows>". A color field now shows "Mixed" through `CompactColorInput.emptyText`
  whenever what lies beneath is mixed (single rows too), which the design's table asks for.
  The draft's id is absent until a kind is chosen, so it shows no groups; then a `RowStyle` with a
  `fresh` "New layer" over everything for that kind. `NewLayer.both` makes the first write
  `styles.addRow({ target: "both" })`, so Both is one row. The draft watches for a new user layer
  named "New layer" that was not there when it opened, and opens it as a layer row. `beneathOf`
  moved to `row.ts` (react-refresh refuses a non-component export from a component file).
  Not built (ponytail): the label and the lists under several rows ("Click + to replace mixed
  content"), Selection colors with their own alpha (the picker edits six hex digits), and a
  draft whose Which elements is more than the kind choice. Seen during the run: vitest browser
  imports failing ("Failed to fetch dynamically imported module") while other agents' runs
  re-optimized the shared deps; a rerun passes. Another agent's uncommitted `PropertyRow.tsx`
  edits (the value picker) sat in the same file, so the commit staged a blob of HEAD plus my
  hunks only.

- (2026-10-12) **Effects lists are built; the arrow ends are the core "ends" row** (`style/Effects.tsx`,
  test `Effects.real-element.test.tsx`, mounted by `StylePanel` for the list with id `effects`).
  "+" or the empty title opens a menu with a glyph per effect (new `GLYPHS` outline, glow, halo,
  band, motion); picking keeps a pending entry in component state only, focuses its hex box (or
  Motion's number), writes on the first chosen value, and an Escape caught in the CAPTURE phase
  drops it (the hex box stops its own Escape, so a bubbling handler never saw it). The eye writes
  the descriptor's `off` and, turned back on, the descriptor's default (ponytail: it forgets the
  color it hid). Gray lines read `sharesBeneath` (moved to `row.ts`, the label's agreement-below
  read with values). Settings behind an entry are `Field`s, so their Clear is the panel's minus.
  Deleted the compound-entry path (`CompoundField`, `compoundOf`): Effects was its only user, and
  it wrote the default glow on pick, which the design forbids. NOT built: `Ends.tsx`. The edges'
  `Head | Tail` row and Ends settings already exist as a `CORE_ROWS` spec drawn by `PropertyRow`;
  a second component would have given the arrows a different Clear. The one missing piece, an empty
  end color reading "Line color", came from the element: new `ChannelDescriptor.follows`
  (`edge.arrowHeadColor` / `edge.arrowTailColor` follow `edge.color`, as Edge.ts draws them) and
  compact-mantine `CompactColorInput.emptyText`. Seen failing, not mine: `row.test.ts` (no starting
  value for `node.labelBackground`) and the app's tsc on history words and channel controls.

- (2026-10-12) **The Style tab is built** (`style/StylePanel.tsx`, `style/PropertyRow.tsx`,
  `style/style.css`; `StyleTab.tsx` and `SetLine.tsx` are gone, and every caller -- tree rows,
  the Everything, run and selection rows -- renders `StylePanel`). Nodes and Edges are
  `ControlSection`s (heading level 3, sticky by CSS), shown per kind the row has a part on. The
  seven core properties are always drawn on four rows (`CORE_ROWS` in `words.ts`); rare ones sit
  in each row's settings pop-out and draw as their own row once set. A `Field` is one property in
  three states: empty with the beneath value as placeholder, set with a minus, set to nothing.
  Clear = the minus, empty + Enter in a typed field, Delete/Backspace on a closed select or chit;
  focus is moved into the field BEFORE the write, so the minus unmounting never drops focus to the
  page. The placeholder and the minus's words come from `styles.agreement("graph", undefined,
{ below: rowId })` read once per render; one value from several layers is that value, only
  differing values are "Mixed". Combine lives in `encode[channel] = { value, combine }`
  (`row.ts` `LiteralWrite`); its select is in the row's settings pop-out. The vary glyph shows on
  hover and focus only (CSS `@media (hover: hover)`), so tests reach it by hovering the
  `.ws-field` or by Tab from the field; storybook's synthetic hover moves no CSS, so stories focus
  the field's input. Route layer measured: fits at 1440 x 900; at 900 x 700 its content is 704 px
  in a 660 px panel (44 px of scroll). Why the inspector's own header and no second one: the
  inspector already draws glyph, name and the row menu for a tree row; a second header was 40 px
  of the same words.
  Not built, owed: "Select what it paints" and a placeholder over the LAYER's own elements both
  need a scope for "what a layer matches", which the element does not publish (the placeholder
  reads the whole graph beneath the row; ponytail note in `beneathOf`). "Mixed" cannot show in a
  color field (no words slot in `CompactColorInput` until the effects unit's `emptyText` lands;
  the field shows the most common beneath color in italics, and its accessible name says mixed).
  Tooltip stays its own list until the Text list takes it. The label entries are named the same
  in both groups (`Text`, `Add to Text`, ...): the label unit must put the kind in those names;
  its tests are scoped to the Nodes group for now.
  Seen once, not reproduced in three reruns: FindToRule's Shift-click test found no node spheres
  drawn while another agent was editing graphty-element source mid-run (vite serves it live).
  `row.test.ts` "the element's own value for every channel" fails on HEAD: new label channels
  (`node.labelBackground` first) state no default, so `startingValue` throws.

- (2026-10-12) **Label entries are built** (`style/LabelSection.tsx`, `LabelSettings.tsx`, test
  `Labels.real-element.test.tsx`). The Text list keeps LabelSection's old props (`target`, `row`,
  `layers`, `fresh`) so the new StylePanel can mount it as StyleTab did. A new entry starts on the
  Card look with `onTop` and `pickable`, and its size goes to the `node.labelSize` channel (72),
  not the style's `sizePx`: any look field the app writes makes the look read "edited" from the
  first frame. For the same reason the element's `labelLookChanges` now leaves out `location`,
  `onTop` and `pickable` (position sits beside the look on the entry), and the non-default looks
  name `Verdana, sans-serif` (Verdana alone fell back to serif here). Settings fields are
  compact-mantine's set-or-inherited trio, so a field's clear is the trio's reset ("Reset Font to
  default"), not a minus; if the studio wants a minus glyph, change it in compact-mantine for
  every caller. The gray line for a label written beneath reads `styles.agreement("graph",
"node.label", { below: own.row ?? own.id })`, over the whole graph (no scope names a layer's
  matches). Not built: Tooltip and edge captions in the Text menu (Tooltip keeps its own section),
  typed words as a source, vary on text color and background, the gradient's colors, icon and
  overflow suffix fields. Seen failing at HEAD, not mine: `words.test.ts` and `row.test.ts` on the
  new label, halo and band channels (no words, no starting value). WORKED again: an isolated tree
  (`git archive HEAD` + my files, node_modules and dist symlinked) while another agent was
  mid-rewrite of `words.ts` and had deleted `StyleTab.tsx` in the shared worktree.

- (2026-10-12) **The app's style tree is built** (`graph-place/StyleTree.tsx`, replacing
  `PaintTree.tsx` and the paint rows). It draws `styles.tree()` top first (the element's tree is
  bottom first at every level, so each level is reversed) with two row kinds, a layer and a
  folder; accessible names "Key people, layer, 2 nodes" and "Annotations, folder, 1 layer" from
  `styles.counts(...).matched` per part; "Painted over" when every `painted` count is 0. Eye and
  lock are `ToggleIconButton`s on the row; a pin is a `data-pinned` mark. Moves go through
  `rows.ts` `placeOf`, which turns the tree control's top-first index into the element's
  bottom-first `StyleRowPlace` and REFUSES a landing outside the row's pin band. Why refuse and
  not let the element clamp: a clamp moves the row somewhere the reader did not drop it (Key
  people dropped on Hovered would land at the top of the unpinned rows). New inspector kinds:
  `folder-row`, `rows` (id = JSON array, header "2 layers"), `draft-row` (id = node / edge /
  both). The draft lives only in `inspected`, so opening anything else abandons it with nothing to
  clean up. A locked row's panel is a native `<fieldset disabled>` around the Style tab (the
  platform disables every input and button in it; no flag threaded through StyleTab). Row menu:
  Rename, Pin to top, Pin to bottom, Unpin, Ungroup (folder: moves the rows out in one
  `session.transaction`, then deletes the folder), Delete. Not built, owed to the element first:
  Duplicate and Select what it paints (no `styles` verb or layer scope exists), and a fact for
  which starting rows are missing (the footer reads the `graphty:starting-` template ids, marked
  temporary in `lacksStartingRows`). Move to folder is drag only. Given up: the tree no longer
  shows a run with no layer (running, failed), group rows and their eyes, or a path's length;
  those go to the Values tab and the binding popover in their own units. The app does NOT turn
  on `startingRows` yet, so Everything, Selected and Hovered appear only where a project sets it
  (the tests set it); turning it on app-wide changes the selection look and belongs with the
  Style tab unit. Seen failing on this branch, not mine: the app's tsc (new halo and band
  channels and the `style.restore-starting-rows` history code have no words) and the selection
  row test that expects an ids selector (the find-and-selection unit in flight).

- (2026-10-12) **The ramp editor is built in compact-mantine** (`RampEditor`, story
  `Components/Color/RampEditor`). It wraps `HistogramRow` (bars now take `paint`) and lays the
  handles over it, so the table of values and the named image come free. Handles snap to the
  caller's bin edges: pointer x rounds to the nearest edge index, arrows step to the next edge,
  Home/End are the first and last edge. Why edges and no interpolation: the element's
  `styles.preview` bins are equal stretches of the scale's own space, so equal-width bars ARE the
  scale's axis and any value the editor reports is one the element produced; no scale in the
  control. Scale and palette use StyleSelect's set/unset model (`scale` undefined shows
  `defaultScale`, no reset); a controlled `value` always shows a reset that did nothing. Real
  pointer drags in compact-mantine: `userEvent.hover(el, { position })` plus `commands.mouseDown`
  / `mouseUp` (CompactColorInput's test). Owed to the app: feed it from `styles.preview` with a
  preview over the data's whole extent for the axis, and the real domain for the paints. Not
  built: a size ramp drawn as sizes (bars are painted only), and a Smooth / Steps toggle (the
  scale select carries stepped scales).
- (2026-10-12) **Starting rows and run placement are built in the element** (commit "starting
  rows for Everything, Selected and Hovered"). Project settings `startingRows` and `runPlacement`
  (config keys, so the app turns them on with `config.set` inside the baseline window and they save
  with the project); `styles.restoreStartingRows()`; selector `{ match: "state", state }` read live
  from the selection masks and `selection.hovered` (repaints only the changed elements, and does no
  work while no layer reads state); channels `node.halo*` and `edge.band*` (color takes `"none"`).
  Why a selector kind and not rule leaves: the "selection" scope resolves edges BETWEEN selected
  nodes, not the selection's own edge mask, and changing that is breaking; a selector kind needed
  one switch case instead of seven. Limits: Selected/Hovered cannot be combined inside a rule yet;
  an empty layer is allowed only for a starting row (owner item); every distinct halo color and
  opacity mints a cached source mesh (ponytail note in `Node.haloLook`). A starting row is found
  by its template source, so renames keep it.
- (2026-10-12) **Placing several new rows in one plan: pin them after all are placed.**
  `reconcile` normalizes pin bands, so pinning Selected before Hovered was placed put Hovered below
  it. And `planAddRow`'s minter reads `current()`, not the working stack: give rows distinct names.
- (2026-10-12) **Browser tests that click: keep the element inside 414 px wide** (the test frame);
  a 640-px canvas took clicks outside the frame and selected nothing while hover still worked.
- (2026-10-12) **Isolating my hunks when HEAD moves under me:** snapshot the files before editing;
  my patch = diff(snapshot, mine); when another commit lands, rebase it with diff(oldHEAD:file,
  mine) applied to the new HEAD; commit from a temp `GIT_INDEX_FILE`, then point the main index at
  the new HEAD blobs with `update-index --cacheinfo` (no reset).
- (2026-10-12) **Glyphs and label looks are in the element's catalog** (`catalog/shapes.ts`,
  `catalog/label-looks.ts`). Glyph tables are rows `[id, plainName, svgBody]`, not objects keyed by
  value, because snake-case shape ids break `camelcase` and prettier strips quotes; completeness is
  pinned by `test/catalog/glyphs.test.ts` against the zod enums instead. A look is expanded in
  `repaint.ts` `writeColumn` (the one place label styles merge), so a look covers what lies beneath
  per layer and the layer's own fields win; `labelLookChanges` is a pure function, so the app reads
  "edited" and per-field minus from it. Contact sheet of every glyph: render with ImageMagick per
  glyph and `montage` (nested SVGs render black). Seen failing on HEAD, not mine:
  `optionsFromZod` (NodeStyle `visible`) and the story-subject contract (`Styles/Label::
BackgroundGradient` against the new `background` channel word).
- (2026-10-12) **Colors across rows and an effect's off value are built in the element**
  (`styles.colors`, `styles.replaceColor`, `session/styles/colors.ts`; `ChannelDescriptor.off`).
  Colors are fixed writes only (set, literal binding, `map` entry), keyed by `toColorValue().hex`
  so spellings merge; a folder id reaches every layer in it, a layer id both parts of its row.
  Replace is a `{ batch }` edit: `edit()` runs the commands in one `dispatcher.transaction`, which
  joins a caller's own transaction; reader-locked layers are skipped. Off is `"none"` on outline
  and glow (an `OFF_COLOR` sentinel whose hex is "none": the painter writes nothing, the mesh key
  pushes absent) and `0` on `edge.animationSpeed`. Why a descriptor field and no new value type:
  `ChannelValues` stays `ColorValue`, so no reader of a resolved color changes. Owed: the halo and
  band channels (starting rows, landed beside this) need `off: EFFECT_OFF` too.
  `ColorWrite.value` is `string | number | boolean`, not `string`: the API report's plain-string
  check refuses a bare string on anything a session method returns.
- (2026-10-12) **The shared worktree moved twice during one unit.** Two commits landed between my
  isolated build and staging, so the first build was on a stale HEAD (177 foreign lines in one
  file). Record the base sha with the build and refuse to stage when HEAD moved; replay edits as
  anchored insertions, never whole-file copies, once another agent touches a file (doors.ts and
  the cost lists gained starting-rows hunks mid-unit). `eslint --fix` on a shared file also edits
  the other agent's half-written code: lint only my own files, or revert what it touched.
- (2026-10-12) **A glow over a light canvas is pink, not magenta**: count pixels with red and blue
  30 above green (`test/browser/effect-off-covers.test.ts`), not a full-magenta threshold (it
  counted 0).

- (2026-10-12) **Per-value entries replace the split** (`styles.categories(layer, channel)`,
  `styles.setValueEntry(layer, channel, value, entry)`; `session/styles/values.ts`). No split
  command, row or field: a community is a category row of its binding (design decision 1.7). On
  every re-run `RunsApi.realignGroups` walks EVERY layer: bindings over `results.<run>.*` and rule
  leaves (`categories`, and `item` following the current run) move to the group with most shared
  members; codes `group.new` / `group.gone` (`dropped`) on `Layer.unmatched`. Why every layer: a
  hand layer "community is 3" must keep meaning the same nodes. By name (no `sizes`), a layer that
  names no value is skipped, so numeric runs cost nothing. Limits: a reader-locked layer is skipped
  (E_LOCKED caught; a lock-bypassing patch would fix it); expression selectors are not rewritten.
- (2026-10-12) **Rows on both kinds are built in the element** (`styles.addRow`, `writeRow`,
  `parts`; `session/styles/rows.ts`): a "both" row is a node part and an edge part right under it,
  sharing a selector, tied by `Layer.row` (the node part's id). Writes route by channel kind
  (`color` both, `width` edges); remove and move on a part move the row; the tree keys the pair by
  `row`. New edge reading `incident` (touching) beside `induced` (between), rules only. Why two
  parts: one layer painting both kinds changes `target`, which is breaking. Limits: a write's
  history step lists no channels; `Valjean` and `Javert` are neighbors in Les Miserables, so their
  shortest path is one edge -- the 5-node, 4-edge test route is Napoleon to Tholomyes.
- (2026-10-12) **Never `open(p, "w").write(f(open(p).read()))` in a script**: the write opens and
  truncates before the read, and it emptied `owner-decisions.md` (restored from HEAD and the
  entries read before). Read into a variable first. Shared files here change under you: build a
  unit's commit from HEAD plus its own edits (a replay script and a scratch worktree), never
  `git add` a file another agent is editing.
- (2026-10-12) **Panel facts built in the element**: `styles.agreement(scope, channel, { below })`
  cuts the painted stack beneath a tree row (rows met before it in the tree walk are exactly the
  consumer layers beneath, since tree order is paint order); `styles.preview(binding, { channel,
bins })` runs the repaint's own `prepareBinding` plus `previewBinding` (`encoding.ts`): numeric
  bins are equal stretches of the scale's position (bin edges found by bisection, so plugin scales
  work), stepped scales bin in data units and report `steps` (new `PreparedBinding.steps`);
  binding `stops` is an inline palette (`palettes.ts` `inlinePalette`, legend id `custom`). Why:
  reuse the one preparation so a preview cannot disagree with the paint. Limit: a continuous bin's
  `paints` is its middle's color, so only a value at the middle matches it exactly; the ramp
  editor should draw the ramp, not one color per bar, if that ever reads wrong.
  (2026-10-12, re-checked) Kept as is: Clear's tooltip needs only `agreement(..., { below })`,
  which already names the value beneath and its `layerId` (or a per-layer breakdown when mixed),
  so no `from` field was added. 9 preview tests pass.
- (2026-10-12) **The style tree is built in graphty-element** (`src/session/styles/tree.ts`):
  `styles.tree()` plus addFolder, renameRow, moveRow, pinRow, lockRow, hideRow, deleteRow; error
  `E_LOCKED`; saved as `StyleDocument.tree`. The app's panel reads rows from it and never orders
  layers itself. Not yet exercised in a browser or by the renderer twin of the history fixtures.
  (2026-10-12, rechecked) Only two row kinds, layer and folder; split children are ordinary
  layers under a folder, so no "split parent" row exists. `styles-tree.test.ts` stays green (7)
  with the split-to-values rename in flight; a run mid-rename fails on a missing `./split`
  import, which is the other agent's half-built state, not a tree defect -- wait and rerun.
- (2026-10-12) **Split by value is built in the element** (`styles.split`, `unsplit`,
  `setSplitOverride`, `splitChildren`; `session/styles/split.ts`). A child's override is the
  parent binding's `map` entry, so palettes reach every other child and unsplit is free; a re-run of
  a partition run matches groups by shared members inside the run's own step (`RunsApi.commit`).
  Limit: a child overrides only channels the parent paints by the split value; overriding a fixed
  property needs generated child layers in the stack. The tree must still show split rows from
  `layer.split` and `splitChildren` (the tree unit was in flight beside this one).
- (2026-10-12) **Generic rules built in the element** (commit "generic layer rules"): selector
  `{ match: "rule", where, edges? }` (a member of the inline rule set, so live scopes and data
  dependencies come free); `RuleTree` leaf `{ kind: "text", reads: "id" | path, mode, text,
caseSensitive? }` on one matcher `textMatcher` (`session/text.ts`) that selection's `textTest`
  also runs; `FindValueRow.rule` (exact, case-sensitive leaf); top N by a data column is the existing
  `threshold` leaf. Why: reuse beat new machinery; the member path already watches and repaints.
  Not done: `{ match: "top" }` still refuses `data.*` (use the rule); `stabiliseEdgeRefs` does not
  walk a rule selector's member leaves (a session edge id inside one is not made stable).
- (2026-10-12) **Worked: staging my hunks when another agent's half-built work breaks the build.**
  `git apply --cached --unidiff-zero` of a FILTERED -U0 patch misplaces hunks; instead build each
  mixed file's blob as HEAD plus my -U0 hunks applied bottom-up by old line number
  (`git hash-object -w` + `update-index --cacheinfo`). Then `git archive $(git write-tree)` into
  `tmp/<task>/iso`, symlink the rest of the repo and `node_modules`, `tsc -p tsconfig.build.json`,
  and run `tools/api-report.mjs` by its REAL path (a symlinked path skips its main guard silently).
- (2026-10-12) **Tier 3 (unified styles) started; my answers to the owner's 12 questions are in
  `tier3/decide/engineer.md`.** The studio worktree is now `.worktrees/design-studio-tier3`
  (branch `design/studio-tier3`). The owner approves the built UI before any study.
- (2026-10-12) **Element facts the tier 3 build leans on** (cite, do not re-derive): layers still
  paint one kind (`Layer.ts:112`, a breaking change to widen); selectors are everything, expression,
  has, ids, top, member (`selector.ts:98`); a member selector takes `{ define: rule }`, so a
  `RuleTree` (range, categories, degree, neighborhood, threshold, all, any) reaches a layer; no
  rule has a text test or functions, while selection has substring, exact and regex
  (`selection/targets.ts:68`); `styles.proposeEncoding` answers fit per column cheaply; lighting
  (`config/Lighting.ts`) is on this branch and absent from the mock; `LabelStyle` has `onTop` and
  `pickable` here (49 fields).
- (2026-10-11) **Round 5 audit on 8c015b806 done** (`tier2/rounds/round-5/expert/engineer.md`): five
  round 4 fixes hold; new: an edge-only filter step marks runs "out of date" with "Ran on 20 nodes;
  20 shown now" (needs edge counts in `run.stale`, element, additive); table count cut at 900.
  "Or more" row still below the find list's fold (sev 3, app). Edge-only walk added at 900 x 700
  the same day (same words); every walk now exists at both sizes.
- (2026-10-11) **Round 5 runs on frozen build 8c015b806** (graphty@0.8.65, `.study-builds/tier2-r5-8c015b806/`);
  the first dry run is triaged with no fixes (d2440153c). Never touch that build; fixes go to round 6.
- (2026-10-11) **Owed before round 5's sessions: r4-s05b, r4-s20b, r4-s28b** on 5277e2cbe, new
  folders, fresh participant agents, scored into round 4. Not run yet (no folders). Gate evidence
  for round 4 is in place (c256dc839), so `--start` accepts them.
- (2026-10-11) **Round 4 taught: a study rule lives where every caller passes.** The gate and the
  bounded slot wait are in `real.mjs --start` (571a15488); briefings name file and kind only and
  `--leaks` reads briefings (2d085d627). Watch in round 5: both refusals fire on their own, no void.
- (2026-10-11) **Round 4: 53 of 53 succeeded; bars 9 (b) and 10 failed.** Bar 10 on drawn names
  covering ties and dots (element, owner's list) and the find box's "=`10`" refusal. Shift-click
  took T24 to 7 of 7, discounted for priming (briefing lists `--shift-click`).
- (2026-10-11) **Watch T22 in round 5:** credit "10" reaching the right stops with no refusal, not
  a pick of the "or more" row (the prompt and the row share the words).
- (2026-10-11) **Watch T17:** the table count ("12 of 41 edges") agrees with the top bar; histories
  no longer name the toolbar's analysis button, so a toolbar-first door is less primed now.
- (2026-10-11) **Bar 9 (b), edge inspector 29 against 27,** fails honestly: added scope words stay;
  only a repeat on the same screen may go. Diff words by build (`bars.mjs --dist`) before cutting.
- (2026-10-11) **Three claims reproduced on 5277e2cbe, fix in round 6 build** (`round-5/claims/`):
  "weight >= 10" on Les Mis says only "Nothing matches" (element `E_UNKNOWN_ATTRIBUTE`); Escape on a
  focused Color swatch clears the selection (app keeps a panel's Escape); a click on the "Stadium"
  chip over the tie picks Stadium (element pick question).
- (2026-10-11) **Open from round 4 critique:** `FindBox.tsx` Values first for a number (held: no
  task met the row below the fold).
- (2026-10-11) **Held, first in line:** hops per name at Hops 2/3 (element `depth` and `hops`,
  additive); "4 hops" vs "5 nodes, 4 edges" (sev 1); `nodesInRect(..., { labels: true })`.
- (2026-10-11) **Not to change:** Shift-click, toolbar Filters door, Replace place, scope words,
  names off in setups, T18 (8 against 8), second path replacing the first, label placement in the app.
- (2026-10-10) **Never mine in the app:** names covering names and ties, sized nodes overlapping
  (element label placement, layout spacing); bare numbers in rules, edge width meaning (breaking).
- (2026-10-11) **A one-specialist claim is scripted on the frozen build before any fix;** reading
  source does not replace the script.
- (2026-10-10) **Still open from audits:** Escape on Data pages; two-table source has no actions;
  "Edit source..." lands on Replace; neighbor Back row scrolls sideways; path popover covers nodes;
  Delete does nothing on a step; Analyze box jumps as the list narrows.

## Decisions and reasons

- (2026-10-12) **The style tree rides on the stack array, not in a new project slice.** The
  `styles` slice is the stack, and undo keeps it by reference, so a tree carried as a property of
  that frozen array comes back with every undo, redo and rollback with no new slice, draft writer
  or project-file member. The draft's no-op test and the state digest read it too (a tree-only
  change is a step). A plain tree (no folder, pin, lock or hidden row) is not carried, so existing
  stacks, digests and saved documents are byte for byte what they were.
- (2026-10-12) **Order lives in the tree; other verbs' placements are reconciled into it.** A layer
  another verb adds goes into the deepest folder holding both its stack neighbors, just above the
  one beneath it; a legacy `move` re-places its row the same way. Then pin bands are restored, so
  the stack always equals the flattened tree. Reason: one source of truth for paint order, and no
  verb can leave the panel showing an order the canvas does not paint.
- (2026-10-12) **A hidden row reads as disabled only where painting is decided** (repaint,
  `compiled()`, legend, `explain`), never in `list()`. Reason: the eye is the reader's view, not
  the author's `enabled`, and showing the row again must restore exactly what was written.
- (2026-10-12) **The reader's lock refuses content edits only** (`update` and what goes through
  it), not rename, move, pin, hide or delete, as Figma's lock does; a new code `E_LOCKED` because
  `E_PROTECTED` means "the element owns this".
- (2026-10-12) **Tier 3 recommendations, and why** (full text in `tier3/decide/engineer.md`):
  a 0-or-1 property is an always-present row whose empty field means off, because "+" promised
  many where one fits and a switch has no "not set" position; yes-or-no properties are two-word
  selects. Rows pair on the 88 | 88 grid so a layer at rest fits at 1440 x 900, rather than tabs
  or folding, which hide what a layer does. An empty kind group folds to one line with the
  element's reason. The degree ramp becomes a histogram-plus-ramp editor in compact-mantine,
  because Figma's stop editor has a color axis, not a data axis. Category layers arrive unsplit.
  "Which elements" starts with Nodes / Edges / Both. Additive element asks: `reach` on
  validation, `scalePreview`, inline palettes, `addPair` until the major, a text leaf in
  `RuleTree`, `contains`/`starts_with` in the expression subset, label looks, shape schemes,
  bindable label size and colors. None is built yet; record each in `owner-decisions.md` when it is.

- (2026-10-11) **Round 4 closed; what it decided and why:** study fixed first (a refusal in the
  command every session runs, because a written rule failed twice); one change per problem; fix in
  the owning package (no app guard around `suggestBackticks`); words at rest never rise; Values-first
  in the find box held as a second change on one problem. `--shift-click` stays in briefings: removing
  it would make T24 measure the tool, not the app.

- (2026-10-11) **The table's count names the whole only while they differ.** "12 of 41 edges"
  matches the top bar's filter chip word for word, so a reader sees one phrase for one fact; with
  nothing hidden it stays "41 edges", so the unfiltered screen gains no words. Bar 9's screens never
  show the table or the Export dialog, so their counts cannot move. The Export words changed
  "per" to "for every" (same word count + 1, on a screen no bar counts) because the table now
  shows less than Export writes.
- (2026-10-11) **A closed note editor hands focus to "+", where a note is opened.** Same target
  Delete uses when no note is left, so the Notes place has one rule: focus never falls to the page.
  No words change. The real-element test (`NoteDraftFocus.real-element.test.tsx`) failed on the old
  file and passes now.
- (2026-10-11) **A component mounted with a new element reads that element's session, never the
  workspace's.** The workspace hands the session up through state, so for one commit after an
  element is replaced it still holds the disposed one; anything that mounts in that commit (keyed by
  project) and reads it at once throws. Root cause is the app's hand-up, not the element: the
  element is right to refuse a disposed session. Other workspace readers re-run only when the
  session changes, so they never see the gap.

- (2026-10-11) **Answer-key facts live in `answers.md`, never in `real.mjs`.** A participant may
  read `real.mjs` (the leak check allows it), so the self-test plants the first two listed facts
  read from the answer key instead of writing them out. Facts match as whole words outside
  hyphenated names: the first try matched session `r5-s11` as the row `s11` and refused that
  briefing; a regression check now covers it.

- (2026-10-11) **A word count is diffed by word against the limit's own build before any word is
  cut.** The roles' three diagnoses of the edge inspector's +2 were partly wrong ("of nodes" was
  in round 1's count too); `bars.mjs <out> --dist <build>` on both frozen builds named the real
  change in one run each (about 10 minutes). Scope words stay; only a repeat on the same screen
  may go.
- (2026-10-11) **A study rule lives where every caller passes through it.** The gate moved from
  the runner's prompt into `--start`, because the runner is only one caller: continuation scripts
  after a stopped run and hand starts skipped it (round 4). Same for the slot: the wait is bounded
  in `--start` (`REAL_SLOT_WAIT_SECONDS`) so any caller can retry in the foreground, and the runner
  starts the session in its own step so a participant's turn never holds a wait.
- (2026-10-11) `BROWSER_SLOT_DIR` (with-browser.sh) points the slot pool elsewhere, only so the
  self-test can fill every slot without holding the machine's real ones.
- (2026-10-11) **A rule names a column through the element's `rulePath(path)`** (new `./session`
  export beside `quotePath`): the bare name for a `data.` column whose name is one unquoted
  identifier, else `quotePath(path)`. The find box's own `columnText` is deleted and calls it, and
  `atLeastOf` uses it, so the "or more" layer reads "minutes >= `5`". Reason: the app was the only
  place that knew the short spelling, and the element's own rule text disagreed with it. Additive
  (`atLeast` is unreleased); recorded in `owner-decisions.md`. A dotted name ("a.b") stays
  `data.a.b`: the grammar joins segments into one key, so `quotePath` never quotes a dot.

- (2026-10-11, condensed) Built for round 4, walked on fresh builds (`tmp/t2r3-r4-*/`): Shift-click
  adds, Made with after Undo, two focus drops, find "or more" (9b69ca650), Analyze name matches
  first, toolbar Filters (`filters.open`), repeated-ties warning in Load's description, filter step
  counts edges (element `plan`), disabled submit says what is missing, "Distribution" heading.
- (2026-10-11) **The table follows the drawing, by the element's own scope.** Reason: under a filter
  step the table listed 41 edges beside "12 of 41" everywhere else (r4-s27, s21); the element
  already has `scope: "visible"`, so the app needs no computing, only the scope it asks for.

- (2026-10-11) **Round 3 decisions I build to:** study fixed first (gate and T24 key before any
  session); one variant per problem; every fix in its owning package; words at rest do not rise;
  a claim only one specialist made is scripted before it is fixed. Not changed: Replace's place
  and out-of-date marks (8 of 8), the weight's meaning at load, Recent in Analyze, the find box's
  example rule, names not drawn by default (the app's consumer choice), "PageRank, full graph"
  under a filter. Reason: each was read right by every session that met it.
- (2026-10-11) Heading a histogram and its range "Distribution": a heading that repeats its tab's
  name tells the reader nothing, and "distribution" is the standard word for that pair.
- (2026-10-11) Still open from the round 3 critique: element `depth` on `data.neighbors` and `hops`
  on each `Neighbor`, then the app shows each name's hops (Shift-click, "or more", Analyze name
  matches and the toolbar Filters tool are built).
- (2026-10-10) **Owner decision: the chosen segment keeps Figma's face, never an inverse fill.**
  Dark #2c2c2c face, 1px #444 edge on #383838; light white face, 1px #e6e6e6 edge on #f5f5f5;
  `highContrast` gives a 3:1 edge. See `owner-decisions.md`.
- (2026-10-09) Script before calling it a defect (two round 2 "app faults" were the study tool's
  click by name landing on a same-named control); every study-tool change gets a planted-failure
  check.
- (2026-10-10, condensed 2026-10-11) **Typed filter: the badge stays on a marked entry**, never on
  an unmarked first result (it would invent a recommendation); description-only matches stay listed.
  **Bar 9 matches data names as written; ids and values case-blind** (ceiling: an app word spelled
  exactly like a data name). The axe exception is code, excused only while the scroll check holds.
- (2026-10-10) **A warning that changes what Load does is part of Load's description**
  (`aria-describedby` from the ids that show); the glyph is `aria-hidden`. Replace not promoted.
- (2026-10-10, condensed 2026-10-11) **"Or more" counts both kinds of a column, because the rule
  does.** The target is rule text, so it reads every node and edge with that column; a value row
  stays one kind. Number as a JSON literal in backticks; non-finite numbers get no `atLeast`;
  `SearchRequest.scopeInput` keeps a scoped find's rule scoped. Column written with `rulePath`.
- (2026-10-10, condensed 2026-10-11) **Element calls, round 4.** A run's `params`/`seed` read the
  held record history put back, and `rerun()` adopts them (not breaking: documented as "the
  current execution's"). Shift-click on a node adds through a new `SelectionManager.add(node)`
  (additive; edge clicks already did; Shift only; XR `select()` still replaces). A distance per
  neighbor is the element's fact: additive `depth` option and `hops` field, never split in the app.

- (2026-10-10, condensed 2026-10-11) **Round 2 calls I build to.** One change per confirmed
  problem, in its owning package; no feature moves; no second door where one is measured; words
  at rest only go down (rejected: opt-in `bareNumbers`, guessing repeat Adds by file name). A
  scope change gets a `ControlSection`, never a lone `DataRowHeader` (reads as a row missing its
  value). A command with nothing to do is disabled (`data-disabled`/`aria-disabled`, tooltip says
  why); Filter to neighbors is a command, one step per center, its checkbox turns it off. A
  selection notice ends with the selection by a flag; scrolling panes reserve their gutter; one
  focus request per find pick. Repeated announcements keyed by a counter; scope words follow
  `stale.ranOn` against `visibility.summary`. A rule selection's row is the rule's text without
  "=". Path search words go in aliases. Keep `selection.count`. **Leaving the step editor saves**
  a whole rule that differs from the step's (on or off: an unedited off step stays off, 2026-10-11);
  an incomplete rule waits as the "+" draft. Hops/Follow refocus the checked radio after remount.
  Path length words come from one `pathLengthWords`.
- (2026-10-08 to 10-09, condensed 2026-10-11) **Older standing calls.** Only participant folders
  are refused in the studio (pilots, experts, `--prove` start there). 24 px checkbox target is the
  input. Find list scrolls by option id. Read the report type before adding a field. Audits walk
  screens by script at both sizes; no new words at rest. Label picks resolve in `pickNodeId`. Path
  Weight starts on the loaded weight; live regions exist before their words; neighbor list opens at
  the ON step's depth; arrow cursor on every control but a link; a start-screen data file goes
  through the Data page; one neighborhood filter per center; a tool that hides what a person saw is
  fixed in the tool; camera unsaved; reopen is a fresh fit; a resolved option is a caveat, never
  written into params; what a rule tested is `selection.originPaths`. OPEN: Columns after "=" omit
  run results; edge-only `edgePage` selection (owner door); dijkstra over a negative undirected
  weight freezes the page; a reopen once drew no "Opened friends" (not reproduced).

## Thinking

- (2026-10-11) **Watch in round 5:** T22 A on bus stops typing "10"; T17 with the table open
  under a step.
- (2026-10-10) The dry run must walk what participants do, not last round's list: 12 of about 30
  build faults sat on the one detour nobody walked (styling a selection). Pilot each task on the
  candidate build, script the routes, keyboard-press every control, and fix before freeze.
- (2026-10-10) Round 2's study leak biases one way: a problem found anyway is solid, a route that
  worked proves little. So treat every round 2 "pass" on a new route as unmeasured, and every
  confirmed failure as real.
- (2026-10-10) Prompts shape behavior: "stand out" produced the whole styling detour. When a
  finding traces to the prompt's own words, fix the prompt, not the app.
- (2026-10-10) The simulation understates costs a person pays (typing a backtick, guessing Replace
  is "replace"); weigh those findings up, not down.

## Tried: worked / did not work

- (2026-10-11) WORKED: completing a committed audit instead of redoing it: list both size folders
  side by side, run only the missing walk, take its commands from the earlier transcript.
  `--hover "role=treeitem:PageRank"` prints `tooltip: null` (the tooltip lives on the row's icon; use
  `--hover-at` on the icon), but the inspector bar shows the same words, so no hover is needed.
- (2026-10-11) WORKED: re-running last round's audit walks by pulling their exact commands out of
  the earlier subagent transcript (`~/.claude/projects/<proj>/<session>/subagents/workflows/*/agent-*.jsonl`,
  Bash inputs containing `real.mjs --start`); session folders do not record steps. Four chains (two
  groups x two sizes) in the background finished in about 25 minutes with other experts holding
  slots. Two-up montages (`montage -tile 2x1`) read well; 4-wide contact sheets only for spotting.
  Screenshots are 1x, so crops use 1x coordinates. `--click "Add to Edge"` does not exist on an
  edge selection's Style tab (Line, Arrows, Label sections).

- (2026-10-11) Worked: the new table test failed on the old scope ("6 of 13 edges" never
  appeared) by a one-line sed back to `"graph"` and forward again, no stash. In real.mjs, `--click
weight` hit the table's weight header, not the attribute row; `--click "role=treeitem:weight,
edge attribute"` reaches the row.
- (2026-10-11) Did not work as a check on the frozen build: the bars.mjs Cancel move. The
  "returning" walk stops earlier there, at "leaving an off step's editor unedited" (the off-step
  bug fixed in 8f6426ab6), so every later move is MISS. Checked the frozen build directly instead
  with `real.mjs --sr` (keyboard: n, type, Tab, Enter), which prints `focus:` after each step.
  Plain `--step` prints no focus line; only `--sr` does.
- (2026-10-11) Did not work: running bars.mjs on two builds at once. The two runs want more than
  the 4 browser slots, so three tier 2 sessions of the second run never got one ("the session did
  not start"). Run bars one build at a time. "a node's Values with its neighbors" (tier 1) misses
  on both builds alike: a click timeout, not from the note change.
- (2026-10-11) Claim scripts by pointer, not `--sr`: a pointer route to the same focus (click
  `role=menuitem:Color`) plus `--read` after the Escape showed focus on the page (whole page read).
  Worked, and far shorter than a keys-only walk. For a label-vs-edge pick, hover/click three
  points (centers' midpoint, on the tie inside the chip, on the tie outside it): the third is the
  control that proves the tie itself is clickable.

- (2026-10-11) Worked, built: `rulePath` (element, `./session`); the find box and "or more" both use it.
  On a fresh build, bus stops "5" -> "minutes is 5 or more (10)" -> Style, Width: the layer is
  "minutes >= `5`" (`tmp/t2r4-9/s1/08.png`).
- (2026-10-11) Worked: the real-element test of New project then Discard failed with the same
  `E_DISPOSED` stack (`ElementHost.tsx` `useSizeBound` -> `styles.legend()` -> `data.attributes()`)
  before the change and passes after; it also cleared the follow-on unhandled rejection from the
  old element's Lit update. `real.mjs` cuts a console error at 300 characters, so the full stack
  came from the test, not the study tool.

- (2026-10-11) WORKED: proving an app fix fails without it by copying the fixed file aside,
  writing `git show HEAD:<file>` over it, running the one test (`-t`), and copying the fix back --
  no stash, no checkout. The off-step leave test failed on HEAD (`on: true`) and passed fixed.
  The same moves through real.mjs: 5277e2cbe shows "19 of 20 nodes" after clicking Graph
  (`tmp/t2r4-5/old/05.png`); the fresh build keeps the step off (`tmp/t2r4-5/new/05-06.png`).
- (2026-10-11) WORKED: a mock round (round 4's plan rows renamed `r5-sNN` in
  `tmp/t2r4-2/rounds/round-5/`, `--brief` each, then `--leaks` the round) checks every real
  briefing without touching round 4's records; `--leaks <round dir>` writes `leaks.json` into each
  session copy, so never run it on a closed round's folder to test the tool.

- (2026-10-11) WORKED: `bars.mjs` already targets any build with `--dist`; its word lists are in
  the printed log (`bar 9 (b)` lines) and in `bars.json` under `tier2.words`. The edge inspector is
  screenshot 20 of `sessions/returning-1440x900/`. Round 1's build exits 1 (later moves miss on its
  older screens); that does not touch the screens measured before the miss. A bars run on
  5277e2cbe is in `tmp/t2r4-12/r4-5277e2cbe/bars.json` (not the round's gate run).
- (2026-10-11) DID NOT WORK at first: a planted slot holder `flock <file> sleep 600` killed with
  `.kill()`. flock hands the lock fd to the sleep it forks, so killing flock left the lock held and
  the test's start waited. Spawn it `detached` and kill the process group (`process.kill(-pid)`);
  `--start`'s own give-up kills its session process the same way.
- (2026-10-11) WORKED: the "or more" row for a number no value equals, all in the element. A
  number column is one whose every indexed value is a number (id column skipped); its row is
  offered when some value lies below N, some above, none equal, deduplicated by path across
  kinds, at most VALUE_ROWS, only when the whole trimmed text is a decimal (`minutes:10` gets
  none: I first tested the prefix-stripped text, and the test caught it). The app maps each row
  to `{ type: "value", row: { ...row, atLeast: row }, orMore: true }` and counts it in
  `foundNothing`, so "No match" no longer shows beside it. No app parsing or counting.
- (2026-10-11) DID NOT WORK: writing test data from memory. I wrote bus-stops rows that matched
  the file's value counts but not its rows; real.mjs's load preview showed the difference. Copy
  fixture rows from the file (`tail -n +2 ... | tr '\n' '|'`), never reconstruct them.
- (2026-10-11) real.mjs `--expect selected=N` counts selected TABLE rows, not graph selection;
  with no table open it says "0 rows are selected" while the inspector says "3 edges selected".

- (2026-10-11) DID NOT WORK at first: another agent rewrote `predicate.ts` from its own read while
  I edited it, and my `rulePath` vanished ("rulePath is not a function"). Re-applied as a
  targeted insert. In the shared worktree, re-check `git diff` on a shared file before building.
  A one-off "failed to resolve" in vitest was a dependency `dist` mid-rebuild; reran clean.

- (2026-10-11) WORKED: the bare-number suggestion fix belonged in the element, not the app. The
  selector's acceptance test is "parses and reads at least one attribute" (compileExpressionPredicate);
  `suggestBackticks` now applies the same test via `collectPaths`. Unit test in
  `test/session/styles/selector.test.ts` fails without it. On a fresh build, typing "10" on bus
  stops shows "No match ... type a rule such as =minutes > `9`"; "=minutes > 9" still offers
  "=minutes > `9`" (`tmp/t2r4-3/bus10/02.png`, `03.png`). No app guard needed.

- (2026-10-11) Worked: reading each round 4 finding's mechanism in source before proposing a fix
  (grep the refusal reason, the leave handler's `unchanged`, the table's scope). Two of six fixes
  turned out to be one word or one condition because the element already had the capability.

- (2026-10-11) **Audit without a wrapper script worked:** one Bash call per walk, each line a
  direct `node real.mjs --step <own folder> ...` with output to `<walk>.log`, run in the background
  (four machine slots were mostly taken by other experts; each start waited, none failed); a later
  batch chained behind the earlier with `until grep -q "session ended" <log>`. Names that changed
  since round 3: "Save and turn on" is "Save step"; "Graph" and "Data" need `role=button:`; the find
  list's lower rows need `--wheel x,y,800` before a screenshot shows them; `--hover-at` on a tree
  row's icon prints its accessible name and tooltip (how the "out of date" name was found).

- (2026-10-11) Worked: wrapping the Tree description in compact-mantine (`overflow-wrap:
anywhere`, row `height: auto; min-height: 44px; padding-block: 6px`, pill and ring `bottom:
4px`). One-line rows look the same (44). Did not do: no-break spaces inside each count phrase so
  "41 to 12" and "edges" stay together; the wrap puts "edges" alone on a third line, which reads
  fine and the acceptance allows.

- (2026-10-11) **Shared files in a shared worktree.** Stage only my hunks (HEAD plus my edits as a
  blob, `git update-index --cacheinfo`). Another agent's commit can sweep up my uncommitted edits
  to a shared file: a test in 115bc0aa4, answer key lines in c9f2ceed3. Commit shared edits
  (`answers.md`, shared tests) as soon as they are made.

- (2026-10-06 to 10-10, condensed 2026-10-11) **Older lessons.** Focus after a pointer click
  draws no ring; `--key ArrowDown` opens a focused Select. real.mjs cannot click aria-disabled
  buttons (prove with `--key Enter` or a real-element test). Descriptions: `--expect
"described=<text>"`. Pilot on a copied `graphty/dist`. Another agent's rebuild breaks tsc,
  vitest and `bars.mjs` mid-run: copy the dist or rerun. Prove a test fails without the change.
  Read output, not exit codes; step N lands in screenshot N+1; read `setup.log` after `--start`.
  Builds need `NODE_OPTIONS=--max-old-space-size=8192`. Subagent logs under
  `~/.claude/projects/<proj>/<session>/subagents/`. Resuming after an interruption: check `git
log`, the round folder and `tmp/<task>/` first.

- (2026-10-12) **A plan item marked "built and kept" needs only a check.** The row that paints
  nodes and edges (`styles.addRow` with target both, commit 262b846095) was re-listed in a later
  plan; I confirmed the commit is on the branch and its 7 tests pass, and changed no code. Check
  `git branch --contains <sha>` and run the named test before rebuilding anything. Same again
  for the generic layer rules (commit 2242877542, `test/session/rule-text.test.ts`, 7 pass).
  Budget about 5 minutes for the test-slot queue on a single small file.

- (2026-10-12) WORKED: committing one item out of files three agents were editing at once
  (channels.ts, repaint.ts, Node.ts held my hunks beside the halo/band and effect-off ones). A
  small hunk picker (`tmp/element-channels/hunks.py`: HEAD plus chosen `git diff -U0` hunks, mixed
  hunks trimmed by hand) built my-only copies; `git archive HEAD graphty-element tsconfig.base.json
tools vitest.* eslint.config.js compact-mantine/eslint` into a temp tree, the copies laid over
  it, node_modules symlinked, gave a tree where tsc, eslint, the session and browser tests, the
  build and `api:report` ran on exactly what the commit holds. Staged with `git hash-object -w` and
  `git update-index --cacheinfo`. It caught two things the full worktree hid: the edge channel
  count in the test assumed the band channels, and the combine checks lived in Layer.ts, a file
  the item did not list. Data files the tests read (design/documents, studio tool files) are not
  in such a tree: those failures are the tree's, not the change's.

- (2026-10-12) WORKED: a two-dimensional grid inside Mantine's Select without replacing it.
  `StyleSelect` takes `layout="grid"`, `columns` and a `glyph` per option. The grid's arrows are
  caught in a capture-phase keydown on the wrapper (React's `stopPropagation` there keeps
  Mantine's own one-step arrow from running), and the highlight is walked to the target cell
  with the listbox module's `walkHighlight` (now exported), which presses Mantine's own arrows as
  untrusted events, so the store, `aria-activedescendant`, Enter and the theme's type-ahead all
  keep working. Guard on `isTrusted` or the walk's own presses recurse. The cells are the theme's
  options with `classNames={{ options: "cm-listbox-grid" }}` (Mantine adds it beside the theme's
  classes) and an inline `gridTemplateColumns`; cell CSS lives in `inputs.css.ts`. Every new prop
  is undefined by default and Mantine drops undefined props, so existing selects keep the theme's
  renderer and look. `ControlSection` takes `headingLevel`: a `display: contents` heading around
  the lead, named by `aria-labelledby` the section's name (else the heading is named "Collapse
  Nodes" after the button inside it). jsdom paints Mantine's open list `display: none`: query
  options with `hidden: true`; prove keyboard behavior in a `*.browser.test.tsx`
  (`userEvent` from `vitest/browser`). No story was added: a new story is an unapproved image that
  blocks merging until the owner accepts it; add one when the app's panel uses the grid.

- (2026-10-12) **A user layer that sets nothing is refused** (`E_BAD_LAYER`, "writes no channel"),
  only starting rows may be empty. So "New layer from selection" cannot make a layer outright: it
  opens the selection's own Style row, whose first value makes the layer (`selectionLayer` now uses
  the element's `selection.layerSelector`, so a rule-made selection becomes a live expression
  layer). Reason: the design makes a layer real with its first value (the draft), and relaxing the
  refusal changes what `styles.add` does, a breaking change. The single-node menu leaves the door
  out: a node always opens on Values, so the command would land on the wrong tab.

- (2026-10-12) WORKED: find's "contains" offer from the element (`FindResult.contains`, each row
  with the substring text leaf as `rule`) rather than the app building "name contains bob" from a
  hit's `match.path` and the typed text. The value rows only say "is"; the count and the rule both
  had to come from the element. Columns holding numbers are left out because find matches those
  only whole and the substring rule would not agree.

- (2026-10-12) **Another agent replaced the layer-row panel mid-task** (`LayerRowPanel` in
  `graph-place/StyleTree.tsx` passes `layers` to `StyleTab`), so a section mounted on "StyleTab
  with no layers" never showed. Mount on what is inspected (`inspected.kind === "layer-row"` and
  every layer the reader's), not on how the caller built the tab. The other agent had also staged
  deletions in the shared index: commit through a private `GIT_INDEX_FILE` built from HEAD.

- (2026-10-12) WORKED: the Which elements editor writes each whole rule to the layer as it is
  edited (one transaction over the row's parts), so the count and the canvas are the element's
  (`styles.counts`), and Escape writes back the selectors captured when it opened. No element
  "count this selector" call was needed. Condition logic lives in `graphty/src/workspace/rules/
conditions.ts` (a `.tsx` exporting functions trips react-refresh), the rows in `RuleRows.tsx`;
  Filters keeps its look by offering one comparison on a category (no compare select, operand
  named "Is") and drawing labels. Every Filters, FilterFocus and DataPlace test passed unchanged.
  Typing a regex with userEvent: "[[" types one "[". Mantine Select inputs are role "combobox".
- (2026-10-12) NOT BUILT: changing an existing layer's kind (Nodes, Edges, Both). graphty-element
  refuses a retarget of a row part ("A row part keeps its row and its kind"), `RowWrite` has no
  `target`, and a part that sets nothing is refused (`E_BAD_LAYER`). The editor draws the kind
  choice with only the layer's own kind enabled. The fix is additive in the element: a
  `RowWrite.target` that adds or drops a part, with an empty part allowed until its first write.
  The draft's kind choice (`StyleTree.tsx`) already covers new layers.

## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments citing element issues: grep `#[0-9]{3,4}` under `graphty/src/`.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
