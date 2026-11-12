# Repolish round 2: Figma, graphty consistency and accessibility review of the rebuilt selection editor

Build 1b8c1045bc84 (graphty@0.8.92, the branch head), rebuilt and served from a frozen copy of
`graphty/dist`. Walked with `real.mjs` on Les Miserables: a new style layer's Which nodes in the
light theme (session `s1`: Step... Degree min 6, then Or... and group B with a name step, the
step menu, the group pane, the title pane, a Within hops of step), a Data > Filters card in the
dark theme and then a style layer in the dark theme (`s2`), and keyboard-only screen-reader
sessions: `k1` (style layer, dark) and `k2` (filter cards, light). axe ran in the light and dark
style host and the light and dark filter host, with the value picker open, with one and two
groups, and on the title pane. Computed styles were read with a Playwright script on the same
build (`measure-light.json`, `measure-dark.json`). Everything is in the main checkout under
`tmp/design-studio/tier5/repolish-2/figma/` (`s1/NN.png`, `s2/NN.png`, `k1/NN.png`, `k2/NN.png`
with each `route.jsonl`, `measure-*.json` beside each session, crops `crop-*.png`).

Compared against `compact-mantine/design/figma-spec.md`, the selection spec
(`design/ui/selection-groups/spec.md`) and the graphty surfaces beside the editor (the style
layer tree, the Style tab's Node / Edge segment, the Values tab). Only problems seen on screen,
measured or read in the code are listed. No blocker. Round 1's M1 (Enter into the pane), M2
(11 px rows), M3 (focus ring), M4 (axe `aria-required-children`) and m1 to m6 are fixed; see the
end.

## Major

### M1. Opening a collapsed filter card sends focus back to "Filters +"; the next Space adds a card

- **Evidence.** `k2`, keyboard only: Tab to the collapsed card "Degree min 6" (a button,
  `k2/25.png`), Space: the card opens, but focus lands on the section's "+" ("button Add filter",
  `k2/26.png`, `crop-k2-collapsed.png` third panel). The next Space, meant for the card, adds a new
  card and opens its value picker (`k2/27.png`, fourth panel). Enter on the collapsed card does
  the same (k2 route, "Enter" -> "focus: button Add filter"). Focus moves backwards in the tab
  order, onto a control that creates things.
- **Cause.** `data-place/Filters.tsx`: the collapsed row's `UnstyledButton.dp-filter-name` calls
  `onOpen(!open)`, the button is replaced by the editor in the same render, and nothing says where
  focus goes; the browser drops it and the section's focus fallback (`focusCard(PLUS)`) wins.
- **Fix.** On opening, set `pendingFocus = { target: <card id> }` and focus the open card's title
  treeitem (`[data-row="title"]`) once it draws, as Figma keeps focus on the layer row it expands.
  Add a `*.real-element.test.tsx` check: Tab to a collapsed card, Space, the focused element is
  that card's title row, and a second Space switches its on box, not adds a card.

### M2. The pane's segments are 9 px, where Figma and the Style tab above draw 11 px

- **Evidence.** Measured (`measure-light.json`, `measure-dark.json`): the verb segment (Keep,
  Except), By value / By position, Start with (No nodes / All nodes) and the filter's Nodes / Edges
  labels are 9px; the rows above them and every other control in the pane are 11px
  (`crop-s2-08-textpane.png`, `crop-16-grouppane.png`). figma-spec 5.2: "Text option: padding 0 8,
  11/16 450". The verb is the step's main choice and is now the smallest text in the inspector.
- **Cause.** The app passes `size="xs"` to compact-mantine's SegmentedControl, whose default
  (`size: "sm"`) is the Figma one: `selection/StepPane.tsx:104` (verb) and `:575`, `:592`, `:609`
  (Computed on, Edge ends), `selection/SelectionEditor.tsx:1309` (Start with),
  `data-place/Filters.tsx:514` (Nodes / Edges), `style/WhichPicker.tsx:2377` (By value / By
  position).
- **Fix.** Drop `size="xs"` on those six SegmentedControls (no compact-mantine change). Re-measure
  that "Add Keep Except" still fits beside "..." and Done at 240 px.

### M3. One pane, three kinds of dropdown field and two field heights

- **Evidence.** `crop-s2-08-textpane.png` (dark) and `crop-13-pane.png` (light), a text step: the
  value field "name" is a default Button with a thin chevron and a faint border; "Contains" is
  compact-mantine's outlined Select with its filled caret and a stronger border (border 0.45 vs
  the button's); the text box under it is a filled field 20 px tall where the others are 24 px
  (measured: `cm-input-wrapper` 184 x 20). A Within hops of step adds a third trigger, the
  reference field, an `InputBase` with an up/down chevron, also 20 px (`crop-s1-23-relpane3.png`).
  figma-spec: one 24 px control height; CLAUDE.md: "Use the default components. Never write a
  bespoke control".
- **Cause.** `selection/StepPane.tsx` `ValueField` draws a `Button variant="default"` with
  `GLYPHS.expand` as a select; `style/WhichPicker.tsx:2972` `Autocomplete size="xs"`;
  `selection/ReferencePicker.tsx:137` `InputBase component="button" size="xs"` with
  `Combobox.Chevron`.
- **Fix.** Draw the value field and the reference field as the same select-trigger look
  compact-mantine's Select uses (`InputBase component="button" pointer` at the default size with
  the Select's own chevron, or the Select itself in a read-only trigger mode), and drop
  `size="xs"` from the text Autocomplete and the reference field so every pane control is 24 px.

### M4. The pane's number histogram draws one-pixel hairlines, unlike the same field in the Values tab

- **Evidence.** `crop-s2-04-hist.png` (dark, Degree in a filter step) and `s1/05.png` (light): the
  step pane's histogram is a row of 1 px lines, one per degree value; the Values tab one panel
  away draws Degree as solid bars (`s2/01.png`, right). Spec 4.3: "The histogram binned to 32
  bars".
- **Cause.** `style/WhichPicker.tsx` `ValueBrush` passes each bin's `from` and `to` to
  HistogramRow, which places a bin from `from` to `to` on the brush's scale
  (`compact-mantine/src/components/rows/ChartRow.tsx:637`, width `placeOf(to) - placeOf(from)`,
  floored at 1 px). graphty-element's `scope.histogram` gives an integer column one bin per value
  with `from === to` (`buildHistogram(..., { integerValued: true })`), so every bar is 0 wide.
- **Fix.** In graphty-element, give an integer-valued bin's upper edge as the next value (half-open
  `[from, to)`, or an additive `upper` field) so a placed bin has width; or, in compact-mantine,
  give a placed bin at least `brush.step` of width. The second is a compact-mantine behavior
  change: record it in `owner-decisions.md` if chosen. Either way the app must not widen bins
  itself.

### M5. A Relative to row truncates its condition and keeps the state word whole

- **Evidence.** `crop-s1-23-relpane.png`: the selected row reads "Add | Withi... | No reference";
  the condition "Within 2 hops of" is cut to five letters at the inspector's 240 px. Spec 3.1:
  "Relative to rows put the condition in the value column ... A long node name truncates; the
  condition never does."
- **Cause.** `selection/selection.css` `.sel-value { flex: 0 1 auto; min-width: 0 }` lets the value
  column shrink before the state word (`.sel-state { flex: none }`), and an unchosen reference
  puts "No reference" in the state column, not in the test column that is meant to give way first.
- **Fix.** For relative rows give `.sel-value` `flex: none` (the condition never shrinks) and let the
  reference / state shrink with an ellipsis; check at 240 px with "Within 2 hops of" plus "No
  reference" and with a long node name.

## Minor

### m1. F2 on a step, title or All nodes row renames the project

- **Evidence.** `k1/42.png`: on the step row "Keep, Degree", F2 moves focus into the header's
  "Project name" box. F2 renames a group (group rows) and a layer in the style tree, so a reader
  pressing it on a step expects nothing or a step-level action, not the project.
- **Cause.** `SelectionEditor.tsx` `rowKeys` handles F2 only when `stepId === undefined` and a
  group row; on other rows the key bubbles to the global `project.rename` command
  (`frame/commands.ts`, `keys: ["F2"]`).
- **Fix.** In `rowKeys` (and `titleKeys`), `preventDefault` and stop F2 on every outline row; only a
  group row renames.

### m2. Tab out of the text box does not commit it; the row still says "No test"

- **Evidence.** `s1/11.png`: "Val" typed, Tab to Match case: group B's row still reads "Add | name |
  No test" and B counts 0; only Enter (`s1/13.png`) or leaving the whole pane writes it. A
  keyboard reader who tabs on hears no count change and is told the step has no test.
- **Cause.** `StepPane.tsx` commits the draft on Enter or when focus leaves the pane
  (`onBlur` on the pane `div`), not when it leaves the text box.
- **Fix.** Commit the text test when the text box itself loses focus (the Autocomplete's
  `onBlur`), as the Min and Max boxes do.

### m3. The collapsed filter card reads at 9 px, the open one at 11 px; only its name is a target

- **Evidence.** Measured: a collapsed card's name is 9px/600 and its count 9px dimmed; the same
  card open reads 11px/600 and 11px (`crop-k2-collapsed.png`, panels 1 and 3). The click target
  is the name text alone, 60 x 14 px (`dp-filter-name`); the row's empty space and its count do
  nothing.
- **Cause.** `Filters.tsx` collapsed row: `<Text size="xs" fw={600}>` and `<Text size="xs"
c="dimmed" className="sel-count">`, inside an `UnstyledButton` that wraps only the name.
- **Fix.** `size="sm"` for both, so a card reads the same open or closed (the style tree's rows are
  11 px), and make the whole row the button (the on box stays its own control), as Figma's
  collapsed layer rows are.

### m4. The reference field's chevron is an unnamed image, and its placeholder is cut with no ellipsis

- **Evidence.** `s1` `--read` of a Within hops of pane: `button "Reference" collapsed`, then `image
(no name)`, then `button "Pick on canvas"`. `crop-s1-23-relpane3.png`: "Choose a reference" is cut
  to "Choose a" with no ellipsis, and the Hops box beside it shows a bare "2" with no visible
  caption.
- **Cause.** `ReferencePicker.tsx:147` `rightSection={<Combobox.Chevron />}` renders an svg without
  `aria-hidden`; the placeholder has no truncation.
- **Fix.** `aria-hidden` on the chevron (moot if M3 swaps the trigger); `truncate` on the
  placeholder and token; a "Hops" caption or prefix on the box, as other number boxes carry their
  name.

### m5. A one-option verb segment

- **Evidence.** `crop-16-grouppane.png` and `crop-13-pane.png`: the first step of a None group draws
  a SegmentedControl holding only "Add" (a radiogroup of one radio, "radio Add checked"). A
  segment with one face is not a choice; Figma never draws one.
- **Fix.** When `verbsAt` offers one verb, draw the verb as plain 11 px text in that place (or
  nothing), and keep the segment for two or more.

### m6. The verb tooltips (Union, Intersect, Subtract) are pointer-only

- **Evidence.** `StepPane.tsx:110` wraps each verb label in a `Tooltip` around a `span`; keyboard
  focus is on the radio input, so arrowing through the segment never shows or announces "Union",
  "Intersect" or "Subtract" (k1: `radio "Keep" checked`). Spec 11 gives these words in tooltips,
  and the rows' tooltip names them only on hover.
- **Fix.** Give each radio an `aria-description` (or a `title` on the face that compact-mantine's
  segment tooltips use, figma-spec 5.2 "Tooltip per option") with the Figma word, so focus reaches
  it too.

### m7. The title pane's controls sit in no order

- **Evidence.** `crop-s1-17-titlepane.png` (style host): "Select" sits at the left, the Group colors
  and Table icons float in the middle, Done at the right; the filter host's title pane draws the
  same icons right-aligned with nothing on the left (`crop-k2-collapsed.png`, panel 4). The group
  and step panes put their main control on the left and "..." and Done at the right.
- **Fix.** One header order for all panes: main control (Select, the name box, the verb segment)
  at the left filling the space, then icon buttons, "...", Done at the right with 4 px gaps; in the
  filter title pane, where there is no Select, let the Nodes / Edges segment take that place.

### m8. owner-decisions.md says the step pane no longer draws the 12 px slider thumbs; it does

- **Evidence.** axe serious `target-size` in both themes, in both hosts (`s1/measure-light-step.json`,
  `s2/measure-dark-step.json`): `div[aria-label="Degree range start"]` and `"Degree range end"`,
  12 x 12 px, `cm-slider-thumb`. They are HistogramRow's brush thumbs. The 2026-11-01 entry in
  `owner-decisions.md` ends: "The number test's 10 px slider thumbs ... no longer appear in a
  step's pane".
- **Fix.** Correct that sentence: the brush keeps 12 px thumbs, so the compact-mantine question
  (a 24 px hit area for slider thumbs) still covers the step pane. Do not change the thumbs here.

## Checked and fine

- axe: no critical or serious hit other than the thumbs above, in the light and dark style host
  (one group, two groups, title pane, value picker open) and the light and dark filter host;
  `aria-required-children` is gone (the Add and Or rows are treeitems).
- Keyboard: the outline is one Tab stop; Enter on a selected step puts focus in its first box
  (`k1/19.png`) and the next ArrowDown stays there; Escape returns to the row and announces
  "Preview ended"; arrows reach Step... and Or... while a row is selected; "Step..." Enter, type,
  Enter adds a step with focus in the test; the open card's on box takes no Tab stop and Space on
  its title row switches it, the name ending ", off"; Ctrl+D on the card title duplicates it.
- Focus ring: 1 px `--cm-border-selected` at -1 px on rows in both themes (`crop-k1-22-restfocus.png`,
  `crop-k1-29-addfocus.png`); pane controls use compact-mantine's rings (`crop-k1-pane-focus.png`).
- Rows: 11/16 type, verbs in a 40 px column, value names aligned per group, "Or..." at the chit's x;
  the step menu shows Turn off Shift+Ctrl+H, Duplicate Ctrl+D, Move up Ctrl+], Move down Ctrl+[,
  Delete Del with no second-line reasons (`crop-14-menu.png`); the group pane has a name box.
- The value picker's highlighted option is dark text on the brand lime (sampled about 9:1), not
  white.
- Known and deferred, not counted here: the group pane's Color row and the algorithm's Settings
  under Advanced (`decided.md`, "Not done here").
