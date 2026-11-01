# Repolish round 1: Figma, graphty consistency and accessibility review of the rebuilt selection editor

Build 7acb6c4c075c (graphty@0.8.92, the branch head), served from a frozen copy of `graphty/dist`.
Walked with `real.mjs` on Les Miserables: a new style layer's Which nodes in the light theme
(session `s1`: Keep Degree min 6, then "Or..." and a second group B with a text step), a new
Data > Filters card in the dark theme (`s2`), and keyboard-only screen-reader sessions of both
hosts (`k1` style layer, light; `k2` filter card, dark). axe ran through `real.mjs`'s measure in
the light style host (one group, two groups, a group row hovered) and the dark filter host.
Computed styles were read with a Playwright script on the same build (`measure.json`). Everything
is in the main checkout under `tmp/design-studio/tier5/repolish-1/figma/` (`s1/NN.png`, `s2/NN.png`,
`k1/NN.png` with `k1/route.jsonl`, `measure-*.json` beside each session, crops `crop-*.png`).

Compared against `compact-mantine/design/figma-spec.md`, the selection spec
(`design/ui/selection-groups/spec.md`), and the graphty surfaces next to the editor (the style
layer tree, the Style tab's sections, the Values tab). Only problems seen on screen, measured or
read in the code are listed. No blocker: nothing gave a wrong result in this lens and no graph
logic sits in the app.

## Major

### M1. Enter on a step row does not move focus into the pane; focus jumps there on the next key

- **Evidence.** Keyboard only (`k1`): Tab onto the selected "Keep, Degree" row, Enter: focus stays
  on the row (`k1/75.png`, route line 75). The next ArrowDown, meant to walk to the next row, lands
  in the pane's "Degree from" box instead (`k1/79.png`). The same happened with Shift+Tab after an
  Enter (`k1/60.png` to `k1/62.png`). Spec 3.4: "Enter moves focus into the pane".
- **Cause.** `SelectionEditor.tsx` `rowKeys` handles Enter with `select(id, true)`, which only sets
  `focusAfter.current = PANE_FOCUS` and calls `setSelected` / `setActive` with the values they
  already hold. Arrowing onto a row already selects it (`walk`), so Enter never changes state, React
  skips the render, and the focus effect (the `useEffect` with no deps that reads `focusAfter`) does
  not run until some later key causes a render, which then steals focus.
- **Fix.** In the Enter branch, when the row is already the selected one, focus the pane directly
  (`pane.current?.querySelector<HTMLElement>(PANE_FOCUS)` then `focusWithRing`) instead of leaving a
  pending `focusAfter`; never leave `focusAfter` set when no render follows. Add a
  `*.real-element.test.tsx` check: arrow onto a step, Enter, the focused element is the pane's first
  control, and a following ArrowDown in the outline does not move focus into the pane.

### M2. The outline's words are 9 px captions beside 11 px panel rows

- **Evidence.** Measured (`measure.json`): the title "Which nodes", its count, "All nodes", group
  letters and every step row's verb, value and test are 9px/14 (`Text size="xs"`); the Add row's
  "Add... Keep... Except...", "Or...", the pane's controls, "Style nodes", the Style tab's section
  heads (Shape, Visibility) and the style layer tree's rows beside it are 11 px. So inside one
  outline the buttons that add a step are larger than the steps they add (`crop-10-grouphover.png`,
  `crop-15-grouppane.png`). The pane's "Advanced" and the "to" between the Min and Max boxes are
  9 px too.
- **Why it matters.** figma-spec section 2 gives 9/14 to the caption role (rail labels) and 11/32 to
  layer rows; spec 3 says "11/16 type, 32 px rows". At 9 px the recipe, which is the thing the
  reader came to read, is the smallest text in the inspector, the "cramped, hard to find what
  matters" the owner named.
- **Fix.** `size="sm"` (11/16) on every `Text` in the outline rows and in the panes
  (`SelectionEditor.tsx`, `StepPane.tsx`: title, count, group letter, All nodes, verb, value, test,
  state, Advanced, the pane headers); keep `fw={600}` only on the title, as the tree does for its
  top level. `.sel-tag` is already 11 px. Re-measure that the verb column still fits "Except" in
  40 px at 11 px (it measures about 36 px).

### M3. The outline's focus ring is a 2 px lime ring at 2:1, not Figma's 1 px focus ring

- **Evidence.** `k1/60.png`: the focused step row is outlined in #97C800, 2 px
  (`selection.css` `.sel-row:focus-visible { outline: 2px solid var(--mantine-primary-color-filled) }`).
  On white that is about 2.0:1, and about 1.8:1 on the selected row's lime tint, under WCAG 1.4.11's
  3:1. The style layer tree one panel to the left draws its focused row with compact-mantine's 1 px
  ring at about 4.3:1 (`crop-k1-10-treefocus.png`, sampled #5C8606).
- **Why it matters.** figma-spec 2.7: "One color and one width: 1px solid var(--cm-border-selected)";
  the editor is the only tree in graphty with its own ring, and the one a keyboard reader can barely
  see.
- **Fix.** `.sel-row:focus-visible { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }`
  (or the row gets compact-mantine's `cm-focus-inside` class and the local rule goes).

### M4. The outline tree holds bare buttons: axe critical `aria-required-children`, in both themes and both hosts

- **Evidence.** axe, every state measured (`s1/measure-light-step.json`,
  `s1/measure-light-twogroups.json`, `s2/measure-dark-filter.json`): "Certain ARIA roles must
  contain particular children ... Element has children which are not allowed: button[aria-disabled],
  button[tabindex]" on `div[role=tree].sel-outline`. The Add row's verbs and "Or..." are `<Button>`s
  inside the tree with no treeitem around them. The screen-reader walk confirms the effect: arrows
  move from treeitems onto plain buttons ("button Keep...", `k1` route line 25), so a reader hears the
  tree's position count break, and Left and Right do nothing on a row that holds two or three verbs
  side by side.
- **Fix.** Make each Add row and the Or row a `role="treeitem"` (aria-label "Add a step" / "Or")
  that the roving walk focuses, with its verb buttons inside at `tabIndex={-1}` reached by Left and
  Right (as Figma's layer row reaches its eye and lock), Enter running the focused verb; or move the
  Add and Or rows out of the `role="tree"` element into a sibling toolbar (`role="toolbar"`,
  Left/Right between verbs). Either clears the axe rule.

### M5. The number test is a "Between" dropdown over a bare slider, not the spec's segment and histogram

- **Evidence.** `s1/05.png`, `crop-k1-60.png`: a Degree step's pane draws a Select "Between /
  Highest", a RangeSlider with no bars, and two boxes. The Values tab in the same inspector draws
  Degree as compact-mantine's HistogramRow (`s2/05.png`, right panel). Spec 5: number = segment
  "By value | By position" and "HistogramRow brush over two boxes"; spec 3 lists HistogramRow with
  its brush among the components used. Code: `style/WhichPicker.tsx` number card, `MatchSelect`
  with `{ value: "range", label: "Between" }, { value: "top", label: "Highest" }` and `RangeSlider`.
- **Why it matters.** A two-way choice is a SegmentedControl everywhere else in graphty and in Figma
  (the verb segment two rows up is one); a dropdown hides the second option. Without the bars the
  reader sets "min 6" blind, where the Values tab shows the distribution of the same field.
- **Also.** axe serious `target-size` on both slider thumbs (10 x 10 px, `s1/measure-light-step.json`):
  compact-mantine's RangeSlider has no 24 px hit area, which figma-spec section 14 gives other small
  targets. That is a compact-mantine change: record it in `owner-decisions.md`, do not make it here.
  Replacing the slider with HistogramRow's brush may remove the thumbs from this pane altogether.
- **Fix.** For `variant === "step"`, draw the number test as spec 5 says: `SegmentedControl`
  "By value | By position" (By position takes "Highest"'s place) over `HistogramRow` with `brush`,
  read from the element's binned facts, above the Min and Max boxes.

### M6. The value picker still clips long names with no ellipsis

- **Evidence.** `crop-13-picker-clip.png` (style host, typing "order"): "Depth-first order:
  Exploration orde" is cut at the dropdown's edge, and its highlight runs past the dropdown's
  rounded corner. This was M3 of the polish 3 review; the overlay scrollbar is now right, the cut is
  not.
- **Cause.** `OptionLine` truncates its name (`truncate="end"`, `minWidth: 0`), but the outer
  `Group justify="space-between"` has no `minWidth: 0`, and Mantine's `ScrollArea.Autosize` content
  is `display: table; min-width: 100%`, so the row grows to its text instead of shrinking.
- **Fix.** In `style/WhichPicker.tsx`: `style={{ minWidth: 0 }}` on `OptionLine`'s outer Group,
  and `classNames={{ content: ... }}` on the `ScrollArea.Autosize` with `display: block` so options
  take the dropdown's width (the Structure options' bare `<span>` needs the same truncation).

## Minor

### m1. The filter card's on box is a second Tab stop nested in the title treeitem, named in other words

- **Evidence.** `k2`: Tab reaches the title treeitem "Degree, 41 of 77 nodes", then a checkbox
  "Apply keep Degree 6 or more" inside it, then the pane; spec 3.4 says the outline is one Tab stop.
  The checkbox's name and tooltip say "keep Degree 6 or more" (`Filters.tsx` uses
  `conditionWords`), where the card is called "Degree" and its row says "min 6"; the group's eye in
  the same editor is "Use A", and the style tree's eye "Hide Layer 1".
- **Fix.** Give the on box `tabIndex={-1}` and make Space on the title row toggle it (as Space
  toggles a group, `rowKeys`), with the state in the treeitem's name ("Degree, on, 41 of 77 nodes");
  name it `Use ${title}` (tooltip "Use Degree (Space)"), matching the group eye.

### m2. A text step's row says "type text"

- **Evidence.** `crop-10-grouphover.png`: group B's step reads "Add | name | type text | No test".
  "No test" already says the step is unfinished; "type text" is an instruction in the test column,
  which spec 3.1 reserves for the test's summary, and the owner's rules forbid instructions in the
  UI.
- **Fix.** Leave the test column empty for an untouched text test (the state word carries it), in
  `selection/words.ts` `rowWords`.

### m3. Menu items explain why they are disabled in a second line

- **Evidence.** `k1/98.png`: the step's "..." menu shows "Move down" with "Already the last step"
  under it; the group menu has "Already at the top" / "Already at the bottom" (`SelectionEditor.tsx`
  `reason`). Figma's menus grey a disabled item and say nothing; graphty's style tree menu does the
  same. The two-line row also breaks the 24 px menu rhythm.
- **Fix.** Drop `reason` for Move up and Move down (keep it only where the reason is not obvious,
  as for "Or..." at the palette's end, and there in the tooltip).

### m4. The filter card's Duplicate shows no key

- **Evidence.** `crop-s2-07-cardmenu.png`: the card's "..." menu shows "Select 41", "Duplicate"
  with no key, "Delete Delete"; the step and group menus show "Duplicate Ctrl+D". Acceptance 24:
  "'...' items show their keys".
- **Fix.** Give the card's Duplicate `key: "Mod+D"` and bind Mod+D on the title row of a filter card.

### m5. The title pane opens the table twice, side by side

- **Evidence.** `crop-s2-06-titlepane.png`, `k2`: the filter title pane draws "41 of 77" (named "Show
  41 of 77 nodes in the table") and, two controls on, the Table button; both open the table on the
  card's matches. The same count is already on the title row above it.
- **Fix.** Keep the Table button (the toolbar's icon and key, spec 8a) and drop the pane's count
  chip in the filter host, or keep the chip and drop the button; one control per action, as Figma's
  panels have.

### m6. The Add row's verbs and "Or..." sit in neither column

- **Evidence.** `measure.json`: in one group the verb column starts at x 1225 and the value column at
  1271; "Add..." starts at 1225 plus the button's 8 px padding, "Keep..." at 1274, "Or..." at 1221
  (`crop-10-grouphover.png`, where group B's verbs start at 1249 under a value column at 1287).
  Spec 3.1: fixed columns; the CSS comment says the verbs "sit in the value column".
- **Fix.** Start the Add row at the value column (an empty 40 px `.sel-verb` first, as the All nodes
  row does) and give its buttons `px={0}` (or a negative inline margin equal to their padding), so
  "Add..." lines up with the value names it will add; "Or..." at the group chit's x.

### m7. The group pane has no color control and no name field

- **Evidence.** `crop-15-grouppane.png`: group A's pane is the letter as 9 px text, its count, "...",
  and Start with. Spec 3.2 gives the group pane "Name and '...'; Start with; Color". Rename is only
  F2 or a double-click on the row, both undiscoverable from the pane.
- **Fix.** Add the name as compact-mantine's inline-editable text field and a Color row (the
  element's group palette as swatches, the chosen one written into the group) to `GroupPane`.

## Checked and fine

- The outline is one Tab stop in the style host; arrows, Home and End walk it; Escape deselects
  the row and then ends picking, announcing "Preview ended"; "Keep..." then Escape leaves no
  step and returns focus to the Add row; "Add filter" then Escape leaves no card.
- Mod+] moves a step up and announces "Moved to step 1 of 2" (Figma's bring forward); menus show
  Ctrl+], Ctrl+[, Ctrl+D, Delete and Shift+Ctrl+H (Figma's Hide).
- The verb segment is a radio group named "Verb" with Union, Intersect, Subtract in tooltips; the
  value field, test boxes and sliders have names ("Degree from, number", "Degree range start").
- Selected rows use the tree's lime tint in both themes; no color-contrast hit in either theme.
