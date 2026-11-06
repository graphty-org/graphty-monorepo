# Polish round 3: Figma and graphty consistency review of the selection editor

Build 7ca4cae647dd (graphty@0.8.92), served from a frozen copy of `graphty/dist`. Walked with
`real.mjs` on volunteers.graphml with PageRank run (setup `rounds/tier-4/setups/volunteers.txt`):
light theme (session s1) and dark theme (s2), the PageRank layer's Which nodes (one group, then two)
and a new card under Data > Filters. Computed styles were read with a Playwright script on the same
build (`measure-light.json`). Everything is in the main checkout under
`tmp/design-studio/tier5/polish-3/figma/` (`s1/NN.png`, `s2/NN.png`, zoomed crops `crop-*.png`,
side by sides `side-*.png`). Compared against `compact-mantine/design/figma-spec.md`, Figma's own
captured menus in `design/ui/figma/`, the selection spec (`design/ui/selection-groups/spec.md`),
`decided.md` and the rest of graphty (the style layer tree, the Style tab, Analyze, the Data place).

Only problems seen on screen or read in the code are listed. No blocker survived: nothing gave a
wrong result, nothing changed compact-mantine, and no graph logic sits in the app in this lens.
Items `decided.md` already carries are listed once at the end, not re-argued.

## Major

### M1. Mod+] and Mod+[ move rows the opposite way to Figma

- **Evidence.** Figma's Object menu, as captured in `design/ui/figma/left-sidebar/menu-main-sub-object.html`,
  lists "Bring forward Ctrl+]" and "Send backward Ctrl+[": Ctrl+] moves a layer UP the Layers list.
  In the editor Ctrl+] on the first step moved it DOWN, under the second
  (`side-s2-04-05-ctrl-bracket.png`, `s2/04.png` to `s2/05.png`); the menus say "Move down Ctrl+]" and
  "Move up Ctrl+[" (`s1/09.png`, `s1/18.png`). The style layer tree does the same:
  `graph-place/commands.ts` `moveCommand` binds `Mod+[` to Move up and `Mod+]` to Move down, and that
  tree is drawn front-first exactly as Figma's Layers panel is.
- **Why it matters.** The spec gives these keys as "Figma's bring forward / send backward" (spec 3)
  and then writes them the other way round (acceptance 30). A Figma user's muscle memory moves every
  layer and every step the wrong way, in both columns.
- **Fix.** Swap them: Mod+] is Move up, Mod+[ is Move down, in `commands.ts` (`rowKeys`),
  `SelectionEditor.tsx` (`rowKeys` handler: `"]"` is `-1`; `GroupMenu` keys), `StepCard.tsx` (its
  `onKeyDown` and menu keys) and the rows' `aria-keyshortcuts`; correct spec acceptance 30 and the
  tests that press them.

### M2. The add-a-step button has no "+" and looks like a step

- **Evidence.** `side-add-vs-placeholder-vs-inert.png`, top to bottom: the add button at rest (the
  Keep glyph, a caret, the word "Keep" in dimmed ink), the new step waiting for its value (the Keep
  glyph and dimmed "Keep" on a grey row), an inert step ("role No test", dimmed), and the add button
  of group B. The button's glyph is the same glyph, at the same x, as the step row above it
  (`crop-03-editor.png`), so the foot of each group reads as one more unfinished Keep step. Nothing on
  screen says "add"; only its tooltip and name do (`s1/04.png`).
- **Why it matters.** Every other add in graphty and in Figma is a "+": Style layers, Shape, Fill,
  Filters, "+ Or" two rows below. Spec 4 asked for the verb's glyph so the button never reads as
  "Or"; it now reads as a step instead.
- **Fix.** Keep compact-mantine's SplitButton but give its main half the add glyph (`GLYPHS.add`)
  and put the verb's glyph and word beside it ("+ v [Keep glyph] Keep"), or draw the verb as a badge
  on the plus; never the bare verb glyph in the add slot. The waiting placeholder row keeps the verb
  glyph, so the two states differ.

### M3. The value picker scrolls sideways and clips names mid-word

- **Evidence.** In both hosts the list draws a horizontal scrollbar under its rows, and long entries
  are cut with no ellipsis: "Depth-first order: Exploration or", "Clustering coefficient: How tigh"
  (`crop-12-picker.png`, `crop-13-picker.png`, `crop-11-picker.png`; filter host `s1/27.png`). The
  scrollbars are the browser's own (arrows, grey thumb), where every Select in the app (the card's
  "Between" list, `crop-30-select.png`) has the themed overlay scrollbar.
- **Why it matters.** Figma's listbox (figma-spec 6.5) truncates a row with an ellipsis and never
  scrolls sideways; figma-spec 8.7 gives every scroll container the overlay scrollbar. The picker is
  the approved Add filter picker too, so the approved surface has the same defect.
- **Cause.** `style/WhichPicker.tsx` `AddCondition`: each option is `<Group wrap="nowrap">` with the
  name in a bare `<span>`, inside `Combobox.Options` with `mah={240}` and `overflowY: auto`; nothing
  stops the row's min-content width.
- **Fix.** In the shared picker: the name `Text truncate` with `minWidth: 0` (full name in the
  option's tooltip and accessible name, as now), the fact `flex: none`; wrap the options in
  Mantine's `ScrollArea.Autosize mah={240}` (the themed overlay scrollbar every Select uses) and
  `overflowX: hidden`.

### M4. "No nodes | All nodes" is set in 9 px type, and the filter card stacks three segment styles

- **Evidence.** Measured: the Start with segments are 9px/16 (`--sc-font-size` of size `xs`), the
  track full width (`measure-light.json`, `segLabel`); figma-spec 5.2 sets a text option at 11/16 450,
  as Analyze's path form, the inspector and Settings draw theirs (default size). In a filter card
  three segmented controls sit in four rows with three looks: Nodes | Edges at its content width,
  Select | Filter to | Filter out right-aligned at its content width, and Start with full width at
  9 px (`crop-32-filtercard.png`, `crop-27-newfilter.png`). The step card's Ends segment
  (`StepCard.tsx`) is `xs` too.
- **Why it matters.** Start with decides a whole group's answer and is the editor's most used
  segment; at 9 px it reads as a caption, not a control, and beside the header's segments it looks
  like a different component.
- **Fix.** Drop `size="xs"` from the editor's own SegmentedControls (Start with, Ends) so they draw
  at the 11/16 default. The filter card's approved header segments are not touched here.

## Minor

- **m1. Closing a row's menu strands keyboard focus.** After Escape closes a group's "..." menu
  (or a step row's verb menu), focus returns to that button, which has `tabIndex={-1}`; the arrows,
  Space, Delete and F2 then do nothing, because `rowKeys` ignores keys whose target is not the row
  (`crop-19.png`, `crop-21.png`: ArrowUp twice, nothing moved). The style tree keeps focus on its
  row. Fix: `returnFocus={false}` on those Menus and focus the row in `onClose`.
- **m2. Two tooltips open twice as fast as the rest.** The step row's words and the folded chips use
  `openDelay={500}` (`SelectionEditor.tsx` line 749, `StyleSelection.tsx` line 125); figma-spec
  rule 8 and compact-mantine's theme use 1000 ms cold. Drop the override.
- **m3. One verb menu, two layouts.** The "+" caret menu opens `bottom-end`, hanging out of the panel
  over the canvas, and draws plain items; the row's verb menu opens `bottom-start` under its button
  with a check column (`crop-s2-06-caret-wide.png` against `crop-06-verbmenu.png`). Pass
  `menuProps={{ position: "bottom-start" }}` to the SplitButton and draw its items as
  `MenuCheckItem` (none checked), so the words line up in both.
- **m4. The open card repeats the row above it.** The row keeps its verb button, value and on box,
  and the card's head draws a second verb button and the value again 36 px lower (`s1/08.png`,
  `crop-32-filtercard.png`). Figma's Fill row never repeats itself in its detail. Let the row be the
  card's head while open (the card body under it, count, "..." and X on the row), or hide the row.
- **m5. A step's count is plain text where every other count is a chip.** The group rows and the
  header draw "16 of 24" as a count button that selects or shows its members; the step row draws a
  dimmed "16" (`SelectionEditor.tsx` lines 766-770), though spec 3 lists a count chip on the step row.
  Draw the same CountChip (its "so far" words in the tooltip), or say in the spec why a step's count
  does not act.
- **m6. Row remove and on box are 16 and 12 px targets in a 32 px row.** Measured: the step's
  CloseButton 16 x 16 (`size="xs"`, figma-spec 4.7's inline clear inside a field) and the Checkbox
  12 x 12 (`size="xs"`); Figma's row actions are 24 ghost buttons (4.3, 10.1 actions 48 x 24) and its
  checkbox face 16 (5.4). Use the default CloseButton size (24 box, 10 glyph); the on box goes when
  the carried eye toggle lands.
- **m7. A card in a card.** In the filter host the step card draws its own border 6 px inside the
  filter card's border (`crop-32-filtercard.png`), where the style host has one frame
  (`s1/08.png`). Drop the step card's border inside a filter card (keep its background and padding).

## What held up

- Group and step "..." menus now match the style tree's grammar: glyph, word, key, dividers, the
  disabled reason under the item (`s1/09.png`, `s1/18.png`).
- The verb menu checks the step's own verb (`crop-06-verbmenu.png`); the card's test select and the
  value picker share the listbox highlight (`crop-30-select.png`, `crop-13-picker.png`).
- Controls in the editor are 24 tall (count chip, Group colors, Table, Or, Done; `measure-light.json`).
- The preview key, the chit filling only while picking, and the dark theme's contrast for rows and
  cards (`s2/03.png`, `crop-s2-03-dark.png`).

## Still open, carried by `decided.md` (seen again, not re-argued)

The rows are still hand-built: a 2 px lime focus ring at -2 px (measured `rowFocus`) where the tree
draws 1 px, a full-row hover band where the tree draws its inset pill, steps not indented under their
group row, and a checkbox where the tree has an eye. Which nodes is still a 9 px caption, not a
ControlSection. The filter card still spends a row on Group colors and Table alone, and its count
chip (blue dot) still differs from the editor's. A new filter card still lacks the approved header
until a step applies, and a Select card still selects while its editor is open (`s1/32.png`).
