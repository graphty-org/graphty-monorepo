# Polish round 1: Figma and graphty consistency review of the selection editor

Build 7225138fd378 (graphty@0.8.92), served from a frozen copy of `graphty/dist`. Walked with
`real.mjs` on volunteers.graphml with PageRank run (setup `rounds/tier-4/setups/volunteers.txt`),
light theme (session s1) and dark theme (s2). Both hosts: the PageRank layer's Which nodes, and a
new card under Data > Filters. Screenshots are in the main checkout under
`tmp/design-studio/tier5/polish-1/figma/` (`s1/NN.png`, `s2/NN.png`, and zoomed crops
`crop-*.png`, `side-by-side-hosts.png`). Compared against `compact-mantine/design/figma-spec.md`,
the selection spec (`design/ui/selection-groups/spec.md`) and the rest of graphty (the style layer
list, the Style tab's sections, the approved filter card, the table).

Only problems seen on screen or read in the code are listed. Blockers first.

## Blockers

### B1. Any edit in the style host drops the layer from the legend and claims it is painted over

- **Evidence.** Before any edit the PageRank layer has its legend ("Color: PageRank", `s1/01.png`)
  and the Legend button is pressed. Changing its test (`s1/09.png`) or adding a step
  (`s1/23.png`, and in dark `s2/03.png`) at once: the Fill swatch turns grey with "Covered by
  Everything on 24 of 24", the layer row's count becomes the covered glyph with the tooltip
  "Painted over by Everything" (`s1/11.png`), and the Legend button unpresses. After Done the canvas
  still paints PageRank's colors (so PageRank does win), but the legend stays gone (`s1/12.png`,
  `s1/46.png`, `s1/48.png`). Undo brings the legend and the count back (`s1/15.png`). The Everything
  layer is below PageRank in the list, so "painted over by Everything" is false.
- **Why it matters.** A wrong result: the reader is told a layer is hidden when it is not, and the
  canvas loses its key after one edit. Every style edit through the new editor triggers it.
- **Fix.** The write is `selector: { match: "rule", where: <union> }`
  (`graphty/src/workspace/selection/StyleSelection.tsx`, the `writer.write` call). The coverage
  fact (`graphty-element/src/session/styles/explain.ts`) and the legend builder must evaluate a
  `union` rule through the same evaluator the painter uses; fix it in graphty-element, not the app,
  and add a real-input test: edit a layer's step, then assert the legend entry and the coverage are
  unchanged.

### B2. The test controls are still tier 4's, not the spec's

- **Evidence.** A number step's card shows the old select "Between / Highest / Has a value / Has no
  value" over a bare slider and two boxes (`s1/08.png`, `s1/23.png`); a category step shows the
  select "Is any of" over a checklist (`s1/36.png`). There is no "By value | By position" or "Pick |
  By size" segment, no HistogramRow brush, and no "Not measured: K" chip; "Include not measured"
  sits in the card's "..." instead (`crop-32-cardmenu.png`). `StepCard.tsx` renders the tier 4
  `CardBody` from `style/WhichPicker.tsx`.
- **Why it matters.** Spec sections 3 and 5 (and acceptance 3) define the test segment and the
  histogram as the card; "Has a value / Has no value" was to be replaced, yet both are offered.
- **Fix.** Build the per-kind segment with compact-mantine `SegmentedControl` (spec 5.2) and the
  number / time control as `HistogramRow` with its `brush` over the two boxes; replace the "has a
  value" tests with the not-measured chip and its include toggle; drop "Include not measured" from
  the menu.

### B3. A converted "has a value" step reads "No test" and "changes nothing"

- **Evidence.** The PageRank layer's saved "Keep PageRank has a value" (collapsed chip, `s1/02.png`)
  opens as a row reading "PageRank No test" with the tooltip "Keep (Intersect), PageRank, has a
  value, No test yet: this step changes nothing" (`s1/04.png`, hover in `s1/05.png`), while its card
  shows "Has a value" selected (`s1/06.png`). The element reports the step `inert`
  (`data-state="inert"`).
- **Why it matters.** The two readouts contradict each other, and if the element really treats it as
  inert, nodes with no value now pass a layer that excluded them (spec acceptance 6: same count and
  picture). PageRank has a value on all 24 nodes here, so the count could not show the difference;
  check with a column that has gaps (phone, 70%).
- **Fix.** In graphty-element, `scope.asUnion` converts "has a value" into an applied step
  (untouched range with not measured excluded, which the spec counts as a test), never an inert one;
  the row then reads "has a value" or "Not measured excluded".

### B4. Group rename is lost on click-away

- **Evidence.** Double-click B, type "Staff", click elsewhere in the panel: the name returns to "B"
  (`crop-37-39-rename.png`). `SelectionEditor.tsx` renders a plain `TextInput` whose `onBlur` only
  calls `setRenaming(null)`. The whole name is also not selected when the box opens (`s1/37.png`).
- **Why it matters.** Figma and compact-mantine's `InlineRename` (figma-spec 10.3) commit on blur and
  select the whole name on mount; graphty's style layer list already uses `InlineRename`. Typed work
  is silently thrown away.
- **Fix.** Use compact-mantine's `InlineRename` for group names, as the style tree does.

## Major

### M1. Row and card text is 9 px caption type, not 11/16 body

- **Evidence.** Every `Text size="xs"` in the editor renders the theme's xs = 9/14 caption role
  (figma-spec 2.3 and the theme comment in `compact-mantine/src/theme/components/display.ts`): the
  step values and tests, the group letters, the card's field name and the "Which nodes" heading. In
  the same card the select reads 11 px and the checklist labels 11 px (`crop-06-card.png`,
  `s1/36.png`), and the group counts are 11 px next to 9 px names (`side-by-side-hosts.png`).
- **Why it matters.** Spec section 3 says "11/16 type" and "the field name is 11/16 semibold";
  figma-spec 10.1 gives tree rows 11/32 (600 at the top level). Mixed 9 and 11 px in one row reads as
  two components.
- **Fix.** `size="sm"` (11/16) for row text, values and names; weight 600 for group names and the
  card's field name; keep 9 px only for captions.

### M2. Group and step rows are hand-built instead of compact-mantine's Tree and property rows

- **Evidence.** `SelectionEditor.tsx` draws rows as `div role="group"` with `.sel-row` CSS:
  full-width hover fill, a 2 px primary-color outline on focus (`selection.css`,
  `.sel-row:focus-visible`), a hand-drawn 12 px chit with a 2 px border. Seen as the thick ring in
  `crop-33-35-move.png` next to the 1 px ring on "+" (`s1/22.png`).
- **Why it matters.** Figma-spec rule 6 (1 px focus ring; "Mantine's 2px ring is gone"), 10.1 (hover
  and selected pills inset 4 8 0 12, focus ring on the pill), and 7.1 (ColorSwatch chit). The style
  layer list one column over uses compact-mantine's Tree, so the same reader meets two row models.
  CLAUDE.md: use the default components; never a bespoke control.
- **Fix.** Build group rows as `Tree` / `TreeItem` (roving focus, F2, drag, the pill states, the
  hover-revealed action slot come with it) and step rows as compact-mantine property rows (9.6);
  the chit as `ColorSwatch` (hollow at rest by a variant). Delete `.sel-row`, `.sel-chit` and the
  hover and focus rules from `selection.css`.

### M3. The on box is a checkbox where Figma and graphty use the eye

- **Evidence.** Group and step rows carry a filled checkbox (`s1/36.png`); the style layer list to
  the left toggles with an eye (`s1/01.png`), as Figma does on both layer rows and fill rows.
- **Why it matters.** Figma consistency: Layers rows and Fill rows both hide with an eye
  (figma-spec 4.4 `ToggleIconButton variant="swap"`; 10.1 actions slot). The approved filter card
  header's on box stays as approved.
- **Fix.** `ToggleIconButton variant="swap"` with the eye glyphs for group and step rows, visible
  while off (as the tree does for a hidden layer).

### M4. Step remove X is hidden until hover, unlike Figma's fill rows

- **Evidence.** `.sel-step-row .sel-remove { visibility: hidden }` (`selection.css`); rows show no
  X at rest (`s1/04.png`).
- **Why it matters.** figma-spec 9.6: "Row actions on property rows (paint, effect) are ALWAYS
  visible (Figma); hover-revealed actions are the tree's". Graphty's Fill row shows its "-" at rest
  (`s1/02.png`, Color row). Spec section 3 asked for hover-only; it conflicts with the Figma lock's
  own rule, so the Figma rule wins.
- **Fix.** Show the remove on step rows at rest; keep hover reveal only on group (tree) rows.

### M5. Three looks for one count chip, and duplicated counts

- **Evidence.** The selection total is a subtle 11 px button "24 of 24"; group counts are the same
  but larger than their 9 px names; step counts are plain 9 px text; the filter card's header uses
  the existing outlined chip with a blue dot "5 of 24" (`side-by-side-hosts.png`). In a filter card
  being edited, the header chip "5 of 24" and the editor's own "5 of 24" sit one row apart
  (`s1/52.png`); in a one-group style selection the header's "24 of 24" and group A's "24 of 24"
  repeat (`s1/36.png`).
- **Why it matters.** Spec 1: "Group rows and the selection header carry the existing chip"; spec 2:
  the filter card header is unchanged and already carries it.
- **Fix.** One count chip component everywhere (the filter header's). In the filter host, drop the
  editor header's count (the card header has it); in the style host with one group, show the total
  only.

### M6. The two hosts fold to different summaries

- **Evidence.** Style host at rest: outlined chips "A: Keep hours No test", "Keep PageRank 0.028 to
  0.059" (`s1/48.png`, `s1/12.png`); filter host at rest: a grey sentence "role is staff"
  (`s1/53.png`).
- **Why it matters.** Spec: ONE component for both hosts; the Figma panel's "one component, two
  headers". Two grammars (verb chips vs "is" sentence) for the same rule.
- **Fix.** One folded summary (the step-row line: verb glyph, value, short test) in both hosts.

### M7. "Which nodes" is not a section header and cannot be collapsed once open

- **Evidence.** Folded, it is a 9 px bold line with a right caret inside the Style tab (`s1/02.png`);
  open, the caret is gone and the title is plain text (`s1/04.png`), while every sibling (Shape,
  Visibility, Text, Fill) is a 40 px `ControlSection` header with 11/16 strong type and its "+"
  at the right (figma-spec 9.2). The only ways out are Done, Escape or a click outside.
- **Fix.** Render Which nodes as a `ControlSection` with the standard disclosure caret both ways;
  the selection header's add ("+ Or") can be its trailing "+", as on the other sections.

### M8. Missing pieces of the card and group menus

- **Evidence.** No "Pick on canvas" target button beside the reference picker (spec 4, acceptance
  16): `RelativeBody` in `StepCard.tsx` has only the Select and the hops box. The card "..." has no
  Settings (`crop-32-cardmenu.png`). The group "..." has no Color and no Save as set (`GroupMenu` in
  `SelectionEditor.tsx`). "Computed on" is one menu item whose words flip ("Computed on: So far")
  rather than a choice with a check.
- **Fix.** Add the 24 px target `ToggleIconButton` (crosshair, armed state, Escape disarms); Settings
  opening Analyze's options form; Color and Save as set in the group menu; Computed on as two
  checkable items ("Filtered graph" / "So far", the current one checked), as Figma menus mark a
  current choice.

### M9. The value picker is unlike graphty's other listboxes

- **Evidence.** The keyboard highlight is a full-bleed lime band with white text that runs to the
  dropdown's edge (`s1/21.png`), while the pointer highlight is a grey pill (`crop-19-20-picker.png`)
  and the card's Select listbox highlights lime with dark text (`s1/08.png`). Section labels draw a
  rule ("Data ---", "Find groups ---"). A used value says "(already a condition)" in the row instead
  of the dimmed check (spec 4). Long entries wrap to two lines ("Label propagation: / Community").
- **Why it matters.** figma-spec 6.5 and rule 10 give one listbox: one highlight that follows both
  pointer and keys, single-line rows with ellipsis; the 2026-10-23 menu decision removed section
  rules; white on lime fails contrast; the owner's rule puts hints in tooltips, not in rows.
- **Fix.** Render the picker with the shared listbox styles (the Select's), one highlight, no rules,
  truncation with the full name in the tooltip, and a dimmed check glyph for a used value.

### M10. A new filter card lacks the approved header while picking its first value

- **Evidence.** A just-added filter card reads "New filter" with Nodes | Edges and no Select /
  Filter to / Filter out, no on box and no count chip (`s1/50.png`, `s1/51.png`); they appear only
  after a value exists (`s1/52.png`), so the card jumps.
- **Fix.** Draw the approved header from the start (effect and on box disabled, with their reason in
  the tooltip, until a value exists).

## Minor

- **m1. The "Group colors" toggle's glyph is a plain circle** (`crop-04-editor.png`): nothing ties
  it to group colors. Use a glyph that reads as color swatches or the outline-mode idea, and show
  its key in the tooltip (TooltipShortcut), as other toggles do.
- **m2. The table's Group column keeps filled chits while the editor's chits are hollow** with the
  group colors off (`s1/46.png`). Follow the editor: filled only while the preview draws them.
- **m3. Start with sits under the group row**, not on it (`s1/36.png`); spec 4 puts it on the
  group's first row. On a 240 px panel, it may stay below, but then say so in the spec.
- **m4. The verb menu opens over the next group** to the left of "+" (`s1/41.png`), covering B's
  chit and name. Anchor it `bottom-start` under the caret, as Figma's split buttons do.
- **m5. The low bound box shows the tail of a long float**, "4898429324" for 0.02796...
  (`s1/09.png`). Format the boxes as the row does (3 significant digits), full value on focus.
- **m6. Card header repeats the row.** The open card's header repeats verb, value, count and X just
  under the highlighted row that has the same four (`crop-06-card.png`): two X buttons stacked. Hide
  the row's count and X while its card is open, or drop the row while the card stands in for it.
- **m7. Menu shortcuts in the card's "..." only work on the row**: the card menu lists Ctrl+[,
  Ctrl+], Ctrl+D and Delete (`crop-32-cardmenu.png`), but only the row's `rowKeys` handles them; the
  card's own `onKeyDown` in `StepCard.tsx` takes Enter only. From the row Ctrl+[ works
  (`crop-33-35-move.png`). Either take the keys inside the card too, or leave them out of that menu.

## What held up

- Escape on an empty new step takes it back and returns focus to "+" (`s1/22.png`).
- The open card's Tab order stays inside the card (`crop-tab-walk.png`).
- Ctrl+[ on a step row moves it and keeps focus (`crop-33-35-move.png`).
- The verb menu order and glyphs are Figma's (Add, Except, Keep with the squares icons).
- The Table button opens the table on Matches only with the Group column (`s1/44.png`).
