# Polish round 2: accessibility and keyboard review of the selection editor

Build under review: `d231869fd585 graphty@0.8.92` (a copy of `graphty/dist` built at that commit),
Les Miserables, 1440 x 900. Five real.mjs sessions under the main checkout's
`tmp/design-studio/tier5/polish-2/a11y/`:

- `sr-style/`: style selector, one group, light theme, screen-reader mode (keyboard only)
- `sr-groups/`: style selector, two groups, rename, duplicate, delete, a run step, screen-reader mode
- `sr-rel/`: style selector, a Within hops of step and its reference, screen-reader mode
- `sr-filter/`: import filter, light theme, screen-reader mode, with the table opened from the editor
- `dark-style/`: style selector in the dark theme, two and three groups, the table, the reference list

axe-core (wcag2a, wcag2aa, wcag21aa, wcag22aa) ran through real.mjs's measure on every screen: the
editor at rest, the value picker open, a step card open, the card's "..." menu open, two groups, the
table open from the editor, the reference list open, in both themes and both hosts. Results are the
`measure-<screen>.json` files beside each session's screenshots. Code lines are in
`graphty/src/workspace/selection/` unless named.

Round 1 fixes that hold: Space on a group or step row turns it off and on and says so ("Degree off",
"77 of 77 nodes"); Enter on a group row is its count chip; F2 renames with the name selected and
focus comes back to the row; Mod+D and Delete on a group row are announced and keep focus in the
list; the verb and "..." targets report collapsed and expanded; the preview's start and end are
announced once; a group row says its color ("B, orange, 77 of 77 nodes"); a step row's tooltip is
its accessible description while focused; a filter card whose step has no test is kept; the
filter card's own disclosure ("Degree" collapsed / expanded) keeps focus on itself.

## Blockers

None found. Every task in this round could be finished by keyboard alone, some only by recovering
lost focus (M1, M2).

## Major

### M1. Opening Which nodes by keyboard still puts focus after the editor (round 1 M3, not fixed)

Enter on `button "Which nodes, 77 of 77" collapsed` opens the editor, and focus lands on
`button "Add to node shape"`, below it: `sr-style/06.png` (the Shape "+" has the ring, the editor is
open above it); again with a step in place, `sr-style/28.png`. A keyboard reader must Shift+Tab
back through Done, Or and "+" to reach the rows. The cause: the folded row's button
(`StyleSelection.tsx`, `SelectionRow`) unmounts when the editor opens, nothing in the open branch
(`StyleSelection.tsx:62-96`) or the editor takes focus, and Chromium moves on to the next focusable
element. The import filter's card does this right: its header button stays and reads expanded
(`sr-filter/18.png` collapsed, `sr-filter/19.png` expanded with focus kept).

Fix: when the style editor opens from the folded row, focus its roving row (or the group's "+"
when it has no step) through the editor's existing `focusAfter`; better, keep "Which nodes" as one
disclosure button that reads expanded while the editor is open, as the filter card's header does,
so both hosts behave alike.

### M2. A style count chip (header or group row Enter) drops focus to the page

In the style host, Enter on `button "Select 40 of 77 nodes"` selects the 40 nodes; the inspector
switches to the selection ("40 nodes, 172 edges selected"), the editor is gone and focus is
`nothing (the page itself)` (`sr-style/32.png`); the next Tab starts again at Main menu
(`sr-style/33.png`). The group row's Enter and the group "..." Select members take the same path
(`showMembers`, `SelectionEditor.tsx:290-296`). A keyboard reader who selects a group to look at
it loses their place and the layer they were editing.

Fix: after `session.selection.apply`, put focus somewhere on purpose: the selection inspector's
heading (it is already `heading "40 nodes, 172 edges selected"`), and say what happened; or keep the
layer's inspector up when the selection came from its own chip. Whichever the design team picks,
no path may leave focus on the body.

### M3. The table's Matches only chip is white on lime: 1.98:1 light, 1.3:1 dark

axe `color-contrast` (serious): `<span>Matches only</span>`, `#ffffff` on `#97c800` at 9 px, 1.98:1
(`sr-filter/23.png`, `sr-filter/measure-table-light.json`), and `#ffffff` on `#c4f23a`, 1.3:1 in the
dark theme, where the words cannot be read at all (`dark-style/06.png`,
`dark-style/measure-table-dark.json`). Matches only is new in this build (spec 8). It is a bare
Mantine `Chip` (`graphty/src/workspace/table/TableDock.tsx:824-833`); compact-mantine has no Chip
theme, so it keeps Mantine's white-on-primary filled look.

Fix: build the toggle from a control compact-mantine already themes, the way the "Shown | All"
SegmentedControl beside it is built (`TableDock.tsx:811-821`), e.g. a SegmentedControl "Matches |
All", or a compact-mantine toggle button. Adding a Chip theme to compact-mantine would be a
Figma-locked change and goes to the owner. The table's existing Issues chip
(`TableDock.tsx:835`) has the same look.

### M4. The value picker's highlighted option is still white on lime (round 1 M4, carried)

Still present: `<span>Degree</span>` highlighted, `#ffffff` on `#c4f23a`, 1.3:1 in the dark theme
(`dark-style/02.png`, `dark-style/measure-picker-dark.json`). `decided.md` carries it to the next
build round with the picker's shared listbox look. Listed again because it is the most-used control
in both hosts and the only screen where the reader cannot read what Enter will take; it should not
wait for the rest of the picker rebuild.

### M5. The range slider still speaks raw floating-point values (round 1 M6, reported fixed)

`decided.md` says "the range slider speaks each thumb as the boxes show it", and the app passes
`thumbProps` with `aria-valuetext` (`graphty/src/workspace/style/WhichPicker.tsx:2248-2252`). The
accessibility tree has no value text: a Closeness step reads
`slider "Closeness range start" value "0.0033783784601837397"` and
`slider "Closeness range end" value "0.008474576286971569"` while the boxes show 0.00338 and
0.00847 (`sr-groups/13.png`, the `--read`), and the same after an arrow key moves the thumb
(`sr-groups/15.png`). compact-mantine's `RangeSlider` sets the attribute in a layout effect
(`compact-mantine/src/components/Slider.tsx:15-29`), and it is in the shipped bundle, so the
attribute is set and then lost, or set on nodes that are replaced.

Fix (compact-mantine, behavior only, no look change): add a browser test that reads the thumbs'
`aria-valuetext` from the accessibility tree after mount and after a value change, then make the
wrapper keep it (re-apply when Mantine replaces or re-renders the thumbs, e.g. a MutationObserver on
the root, or Mantine's own label hook if it has one). Every RangeSlider caller gets the fix.

### M6. The card's "How to match" select is 18 px tall (axe target-size, serious)

`combobox "Degree: how to match"` is 186 x 18 (`sr-style/measure-card-menu-light.json`,
`dark-style/measure-two-dark.json`, both themes). The app passes `size="xs"`
(`graphty/src/workspace/style/WhichPicker.tsx:1838-1841`); the round 1 fix moved the number boxes
to the default 24 px but not this select, which sits directly above them in the same card
(`sr-groups/15.png`: "Between" visibly shorter than the boxes).

Fix: drop `size="xs"` so it takes the 24 px Figma control height, as the boxes now do.

### M7. The reference picker does not say which option Enter will take

In the Within hops of card, typing "Valj" into `combobox "Reference"` reads
`combobox "Reference" value "Valj" expanded` with no highlighted option (`sr-rel/07.png`), though
`selectFirstOptionOnChange` highlights one; Enter then takes Valjean and only the count is
announced (`sr-rel/08.png`). The value picker, by contrast, reads
`highlighted: option "Degree" selected`. A screen-reader user commits a reference blind. The
reference picker is a bare Mantine `Select` (`StepCard.tsx:182-205`).

Fix: expose the highlighted option as the value picker does (`aria-activedescendant` on the input
pointing at the highlighted option), ideally by building the reference picker from the same
searchable listbox as the value picker (spec 4 calls both "searchable"), so the two lists in one
card read alike.

### M8. Rows' keys cannot be discovered by a screen-reader user (round 1 M2, carried, and more)

Rows are still `role="group"` (`SelectionEditor.tsx:496`, `:638`): a step row reads
`group "Keep, Degree 6 to 35, 40 of 77 nodes so far"` whether its card is open or not
(`sr-style` walk, steps 17 and 18), and nothing says it takes Enter, Space, F2, Mod+D, Mod+[ / ] or
Delete. The two places that would teach the keys do not reach a screen reader: the group "..."
button is `tabIndex={-1}` (`SelectionEditor.tsx:946`), so it is never reached by keyboard, and the
card "..." menu's items read only `menuitem "Turn off"`, `menuitem "Duplicate"`, with no key
(`sr-style`, the menu walk after `24.png`): `MenuShortcut` is not part of the item's name or
`aria-keyshortcuts`.

Fix: the carried change to tree rows (`treeitem` with `aria-level`, `aria-expanded`) plus
`aria-keyshortcuts` on each row and on each menu item that shows a key (MenuShortcut can set it on
its item, a compact-mantine behavior change with no look change). Make the group "..." a Tab stop
inside the group row when the row has focus, or reachable by Shift+F10 / the ContextMenu key on the
row, as Figma's Layers rows are.

## Minor

- **m1. A step that is off does not say so.** Space on the Degree row says "Degree off", but the
  row then reads `group "Keep, Degree 6 to 35, 77 of 77 nodes so far"` with no "off"
  (`sr-style/19.png`), while a group row adds "off". Fix: add "off" to the step row's name
  (`SelectionEditor.tsx:644`) as the group row does (`:504`).
- **m2. The card's "..." lists Space for Turn off, but Space does nothing in the card.** The card's
  key handler takes Mod+[, Mod+], Mod+D and Delete (`StepCard.tsx:423-445`) but not Space, and every
  focusable control in the card uses Space itself; the menu shows `Turn off Space`
  (`sr-style/24.png`). Fix: show Space only where it works, or drop the key from the card's menu
  item (the row's Space is shown in its tooltip). Backspace, which the row takes as Delete, is also
  not taken by the card.
- **m3. Picking an algorithm that has to run puts focus on the card's verb button.** "clos", Enter:
  focus is `button "Verb: Add"` (`sr-groups/12.png`), not the first box, because the card opens
  pending with no box and `cardFocus` falls back to its first button (`SelectionEditor.tsx:1087-1095`).
  Fix: keep `focusAfter` pending until the card's body draws its first box, or when the run
  finishes.
- **m4. "Or" then Escape says "No step added" but leaves a new empty group.** In the dark session,
  Or then Escape left group C, "0 of 77", No nodes, with focus on its "+" (`dark-style/11.png`); the
  announcement (`stopAdding`, `SelectionEditor.tsx:223-228`) speaks only of the step. Fix: either
  take the group back too when its first picker closes with nothing chosen (the same rule as the
  step), or announce "Added C" when Or is pressed.
- **m5. Duplicate names across groups.** With two groups, `checkbox "Use Degree"`,
  `button "Verb: Add"`, `button "Remove Degree"`, `radio "No nodes"`, `radio "All nodes"` and
  `button "Select 41 of 77 nodes"` (header and group A, both counting 41) each occur twice
  (`dark-style/measure-two-dark.json`, `names.shared`); a duplicated group keeps the same name
  ("Staff" twice, `sr-groups`, the Mod+D step). The row's verb button still duplicates the open
  card's (round 1 m2). Fix: put the group's name in its steps' control names ("Use Degree in B"),
  name the header chip for the whole selection ("Select all 41 matches"), and give a duplicated
  group a new letter or "Staff 2".
- **m6. Two spellings of one filter in one card.** The import filter card reads
  `button "Remove Degree is at least 10"` and `checkbox "Apply Degree is at least 10"` in its header,
  and `group "Add, Degree 10 or more, ..."` on its row (`sr-filter/13.png`, the `--read`).
  Fix: one words function for both (`filterWords.ts` and `words.ts`).
- **m7. No count of matches while typing in a picker.** Typing "deg" or "Valj" announces nothing
  until a pick; a "No match" status exists for an empty search but not "3 results". Fix: a polite
  status with the number of options after the search settles.
- **m8. The reference list is a scrollable region axe cannot reach by Tab**
  (`scrollable-region-focusable`, serious, `dark-style/measure-reference-dark.json`). The options
  are reached with the arrow keys from the combobox, so this goes away with M7's shared listbox; no
  separate fix.

## Already with the owner

The "+" split button's 16 x 24 chevron and the slider thumbs' 10 x 10 targets (axe target-size,
serious, every screen) are compact-mantine's Figma look and are recorded in
`../owner-decisions.md` (2026-11-01). They were seen again on every screen and are not repeated
above.

## Not covered

Drag reordering by pointer, the Pick on canvas target and card Settings (not built), the edge side's
end chip, and a palette used up to its last color (Or disabled with its reason) were not walked in
this round.
