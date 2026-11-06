# Polish round 1: accessibility and keyboard review of the selection editor

Build under review: `7225138fd378 graphty@0.8.92` (a copy of `graphty/dist` built at that commit),
Les Miserables, 1440 x 900. Four real.mjs sessions under the main checkout's
`tmp/design-studio/tier5/polish-1/a11y/`:

- `sr-style/`: style selector, light theme, screen-reader mode (keyboard only)
- `sr-filter/`: import filter, light theme, screen-reader mode (keyboard only)
- `dark-style/`, `dark-filter/`: both hosts in the dark theme

axe-core (wcag2a, wcag2aa, wcag21aa, wcag22aa) ran through real.mjs's own measure on every screen:
editor at rest, value picker open, step card open, two groups, in both themes; results are the
`measure-<screen>.json` files beside each session's screenshots. Every finding below was seen in
the running build; code lines are in `graphty/src/workspace/selection/` unless named.

What works: "+" then Escape takes the step back, returns focus to "+" and says "No step added";
the value picker's search is a proper combobox with the highlighted option exposed; arrow keys,
Home, End walk the rows; Enter opens and Escape closes a card with focus back on its row; Mod+] and
Mod+[ move a step and announce "Moved to step 2 of 2"; F2 renames; slider moves announce the new
count ("60 of 77 nodes"); the verb menu is fully keyboard operable from the open card.

## Blockers

### B1. A step's or a group's on box cannot be reached or toggled by keyboard

Both checkboxes are `tabIndex={-1}` (`SelectionEditor.tsx:477`, `:596`) and no row key toggles them:
Space on a step row three times left `checkbox "Use Degree" checked` (`sr-style/72.png` to
`76.png`), Space on group row B left `checkbox "Use B" checked`. Turning a step or a group off,
a core task (spec 1, acceptance 2 "B off removes only B's"), is impossible without a pointer.

Fix: Space on a focused group or step row toggles its on box and announces it ("Degree off",
"B on"), as a Figma Layers row toggles visibility from the keyboard; add the same toggle to the card
"..." and group "..." menus with its key shown (MenuShortcut).

### B2. The count chips cannot be reached by keyboard

`CountChip` renders `tabIndex={-1}` (`SelectionEditor.tsx:953`) for the selection header and every
group row, and no row key stands in for it. "Select what this group counts" (style, spec 2 and
acceptance 22) and "Show these rows in the table" (filter) cannot be done without a pointer. The
Tab walk in `sr-style` goes `button "Group colors"`, `button "Table"`, `radio "No nodes"` with the
chip skipped (steps 15 to 17 of the walk, `sr-style/route.jsonl`).

Fix: the header chip is not part of the roving row list, so give it `tabIndex={0}`; for a group
row, bind Enter (unused on group rows today, `rowKeys` only handles Enter for steps, line 297) to the
chip's action and say so in the row's tooltip, or add "Select members" / "Show in table" to the
group "..." menu.

### B3. Closing a filter card whose step has no test yet deletes the whole card, silently, with no undo

In the import filter: Add filter, "deg", Enter (card holds "Degree, No test"), Escape (card closes,
focus on the row), Escape again: the filter card is gone, focus lands on "Add filter", nothing is
announced and Undo is disabled (`sr-filter/33.png` card present, `sr-filter/34.png` card gone,
undo greyed). The same card with a tested step (Degree 3 to 36) survives the same two Escapes. Spec
section 1 ("A step with a value is kept"), section 3 (Escape "keeps edits") and acceptance 4 all
say the step stays.

Fix: the filter host must keep a card whose selection holds only inert steps (the element already
reports them as inert, contributing nothing); if the owner wants empty cards dropped, the drop must
be an undo step and be announced.

### B4. A new style layer's counts contradict each other, and the closed editor's name carries a removed sentence

On a fresh layer the editor shows Start with "No nodes" and "0 of 77" while the layer list shows
Layer 1 with 77 (`sr-style/01.png`), and the closed "Which nodes" button is announced as
`button "Which nodes, 77 of 77 nodes, All 77 nodes: add a condition to narrow"` (walk step 25).
A screen-reader user hears "77 of 77" and then "0 of 77" for the same selection, and the sentence
spec section 3 removes is still spoken.

Fix: one count from the element for both the layer row, the closed button and the editor header
(an empty None selection matches nothing, so the layer and the button must read 0); drop the
"All N nodes: add a condition to narrow" words from the button's name.

## Major

### M1. Menu targets do not expose aria-expanded or aria-haspopup

The step verb menu (`StepCard.tsx:53-64`), the card's "..." (`StepCard.tsx:447-454`) and the group
"..." (`SelectionEditor.tsx:830-836`) put a Mantine `Tooltip` between `Menu.Target` and the
`ActionIcon`, so Menu.Target's ARIA props never reach the button. Screen-reader mode reads them as
`button "Verb: Add"` and `button "More for Degree"` with no state, while the split button's chevron
(which uses compact-mantine's `TargetTooltip`) reads `button "Add a step with a verb" collapsed`.

Fix: wrap these targets in compact-mantine's `TargetTooltip`, as `style/Groups.tsx` and
`graph-place/StyleTree.tsx` already do.

### M2. The step and group rows have no list semantics; a row's open card is not announced

Rows are `role="group"` with `aria-expanded` (`SelectionEditor.tsx:407`, `:540-545`). Chromium does
not expose aria-expanded on a group: the focused row reads `group "Add, Degree 6 to 36, 41 of 77
nodes so far"` whether its card is open or not. Nothing says how many rows there are or where
focus is, and after Mod+D two rows read identically (`sr-style`, walk after the duplicate).

Fix: give the list `role="tree"` and the rows `role="treeitem"` with `aria-level` (1 for a group,
2 for a step), `aria-setsize`/`aria-posinset`, and `aria-expanded` for a step's card -- the same
pattern the style layer tree uses (`treeitem "Layer 1, node layer, 41 nodes" selected`), so the
two lists in one inspector read alike.

### M3. Opening "Which nodes" by keyboard puts focus outside the editor

Enter on the closed `button "Which nodes, ..."` opens the editor but focus lands on the
`checkbox "Style nodes"` above it (`sr-style/36.png`, `sr-style/133.png`: ring on Style nodes), or,
when the editor opens with its first card open, on the page itself: `focus: nothing (the page
itself)` (`sr-style/91.png`), after which Tab starts again at "Main menu".

Fix: on open, focus the editor's roving row (or "+" when the group is empty); when it opens with
a card, focus the card's first control as `focusAfter` intends -- the selector
`[data-step-card] :is(input:not([type=hidden]), button)` runs before the card exists after a
remount, so it must be retried once the card is drawn.

### M4. The value picker's highlighted option is white on lime: 1.98:1 light, 1.3:1 dark

axe `color-contrast` (serious) on the highlighted option: `#ffffff` on `#97c800`, 1.98:1
(`sr-style/47.png`, `sr-style/measure-picker.json`), and `#ffffff` on `#c4f23a`, 1.3:1 in the
dark theme (`dark-style/03.png`, "Core number" nearly unreadable). `AddCondition`
(`style/WhichPicker.tsx:1478-1574`) renders bare Mantine `Combobox.Option`s, which keep Mantine's
white-on-primary highlight; compact-mantine's lit row ink (`ROW_LIT`, `--cm-text-onbrand`, ink
`#14161f` in the graphty accent) applies only to `.cm-listbox` / `.cm-menu-row`. This is the shared
picker, so the Data place's approved picker has it too.

Fix (shared component, not this screen): give the picker's options the compact-mantine listbox row
classes, or have compact-mantine's theme give `Combobox.Option` the same lit ink as its listbox. That
applies the existing graphty-accent tokens, so no token or Figma value changes.

### M5. Targets below 24 px (axe target-size, serious, both themes, both hosts)

- The split button's chevron, 16 x 24 (`SelectionEditor.tsx:771`, `SplitButton size="sm"`): the
  16 px chevron is compact-mantine's Figma width (`figma-spec.md` 4.5).
- The range slider thumbs, 10 x 10 (compact-mantine RangeSlider).
- The range "from" / "to" boxes, 86 x 20: the app passes `size="xs"` (`style/WhichPicker.tsx:1918`),
  where the spec's Figma control is 24 px tall.

Fix: the boxes take the default 24 px size in the app. The chevron and the thumbs are
Figma-locked: record them for the owner in `../owner-decisions.md` (WCAG 2.5.8 asks 24 x 24 or 24 px
spacing) and build without a change.

### M6. Sliders speak raw floating-point values

On a Closeness step the thumbs read `slider "Closeness range start" value "0.0033783784601837397"`
and `"0.008474576286971569"` (`sr-style`, the two-group `--read`), while the boxes beside them show
the rounded numbers. Fix: give each thumb an `aria-valuetext` written by the same formatter the boxes
use.

## Minor

- **m1. F2 does not select the name.** F2 on group row B, then typing "Staff", gives "BStaff"
  (`sr-style`, rename step); Figma and every OS rename select the whole name first. Fix: select the
  text when the rename box takes focus (`SelectionEditor.tsx:433-438`).
- **m2. Two controls share each name.** axe's shared-name check: `button "Table"` twice (toolbar
  and editor header) on every screen; with a card open, the row's `button "Verb: Add"`,
  `button "Remove Degree"` and `checkbox "Use Degree"` duplicate the card's own
  (`sr-style/measure-card-light.json`). Fix: while a step's card is open, take the row's duplicate
  verb and remove controls out of the accessibility tree (the card holds them); name the header's
  Table button for what it does here ("Table: matches only").
- **m3. The card's "..." shows keys that do nothing there.** Move up (Mod+[), Move down (Mod+]),
  Duplicate (Mod+D) and Delete are listed with their keys (`StepCard.tsx:476-500`), but those keys
  act only when the row itself has focus (`rowKeys` returns unless `event.target ===
event.currentTarget`, `SelectionEditor.tsx:252`); the card is the row's sibling, so the keys do
  nothing while focus is in the card. Fix: handle them in the card's `onKeyDown` when focus is not
  in a text field.
- **m4. Delete and duplicate are silent.** Moves are announced; Delete on a step or group row and
  Mod+D announce nothing (`sr-style`, the Delete and Control+d steps). Fix: `say("Removed Degree")`,
  `say("Copied Degree")`.
- **m5. A group's name has no color word.** Group rows read `group "A, 41 of 77 nodes"`; spec 8 asks
  for "A, teal, 24 of 77 nodes", so a reader who cannot see the chit can match the canvas key.
- **m6. The preview is never announced.** Opening a card suspends every layer and draws group colors
  (`sr-style/47.png`) and closing restores them, with no live message either way; spec 9 says
  "announced once".

## Not covered

Drag reordering by pointer, the Table's Group column and Matches only toggle, and Relative to
steps (no target button is built yet) were not walked in this round.
