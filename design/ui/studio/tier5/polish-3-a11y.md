# Polish round 3: accessibility and keyboard review of the selection editor

Build under review: `7ca4cae647dd graphty@0.8.92` (a frozen copy of `graphty/dist`), Les Miserables,
1440 x 900. Sessions are under the main checkout's `tmp/design-studio/tier5/polish-3/a11y/`:

- `sr-style/`: style selector, light theme, screen-reader mode (keyboard only): one step, Space, Mod+D,
  Delete, the card, its "how to match" list and "..." menu, a second group by Or with a Closeness
  step, arrows, Home / End, F2, Mod+D on a group, Enter on a group row
- `sr-slider/`: style selector, screen-reader mode: range thumbs by arrow keys, Shift+Mod+H and Mod+D
  from inside the card, Escape out, Done
- `sr-toggle/`, `sr-toggle2/`: style selector, screen-reader mode: the header count chip, Group
  colors off, a card opened and closed with it off, the verb menu
- `sr-filter/`: import filter, light theme, screen-reader mode: Add filter, a Degree card, Escape out,
  "+" then Escape, Or then Escape, the table opened from the editor, Select / Filter out with thumbs
- `light-style/`, `dark-style/`, `dark-filter/`: pointer sessions for axe on every screen

axe-core (wcag2a, wcag2aa, wcag21aa, wcag22aa) ran through real.mjs's measure on: the editor at rest,
the value picker open, a step card open, the card "..." menu, the verb menu, two groups, and the
table opened from the editor, in both themes and both hosts (`measure-<screen>.json` beside each
session's screenshots). Code lines are in `graphty/src/workspace/selection/` unless named.

## Fixed since round 2, verified

- Enter on the folded "Which nodes" puts focus on the first row (`sr-style/34.png`); Done and the
  last Escape hand focus back to the folded button (`sr-slider/09.png`).
- A count chip that selects puts focus on the inspector's heading and says how many
  (`sr-style/84.png`: `heading "22 nodes, 103 edges selected"`).
- The table's toggle is compact-mantine's segment "Matches only | All"; no contrast hit in either
  theme (`dark-style/measure-table-dark.json`, `sr-filter/measure-table-light.json`).
- The value picker's lit row is the listbox ink on lime, 5.4:1 (`dark-style/02.png`).
- "How to match" is the 24 px control: no target-size hit with the card open (`sr-style/measure-card-light.json`).
- A step that is off says so ("..., off", `sr-style/14.png`); the verb menu is `menuitemradio` with the
  step's verb checked (`sr-toggle2/11.png`); the card menu lists Hide on Shift+Ctrl+H, and that key,
  Mod+D and Delete work from inside the card (`sr-slider/06.png`, `07.png`).
- Group chits are 3:1 or better: A 3.42 / B 3.87 on white, A 4.08 / B 3.61 on the dark panel
  (sampled from `sr-style/70.png` and `dark-style/06.png`).

## Blockers

None found. Every task in this round was finished by keyboard alone.

## Major

### M1. The range thumbs still speak raw floating point; the cause is the import

A Closeness step reads `slider "Closeness range start" value "0.0033783784601837397"` and
`slider "Closeness range end" value "0.008474576286971569"` while the boxes show 0.00338 and
0.00847 (`sr-style/70.png`, the `--read`). `decided.md` reports this "not reproduced". It is: the
card's slider is Mantine's own, not compact-mantine's wrapper.
`graphty/src/workspace/style/WhichPicker.tsx:3-20` imports `RangeSlider` from `@mantine/core`, which
drops `thumbProps`' `aria-valuetext` (the reason compact-mantine's wrapper exists,
`compact-mantine/src/components/Slider.tsx:8-12`). compact-mantine's new test passes because it
tests the wrapper, which the card never renders.

Fix: import `RangeSlider` from `@graphty/compact-mantine` in `WhichPicker.tsx` (no look change), and
add a graphty browser test that walks a Closeness card and reads the thumbs' value text from the
accessibility tree.

### M2. A step row never says its card is open or closed

Rows carry `aria-expanded={open}` (`SelectionEditor.tsx:713`) on `role="group"`, and Chromium drops
the state there (ARIA 1.2 gives `group` no `aria-expanded`): the row reads the same before and after
Enter (`sr-style/34.png` and `35.png`), while every real disclosure in the app reads "collapsed" /
"expanded". With Group colors off, nothing at all is spoken: Enter opens the card and Escape closes
it in silence (`sr-toggle2/05.png`, `06.png`); with it on, only "Preview: group colors" hints that
something opened. A screen-reader user cannot tell whether Tab will enter a card.

Fix: give the rows a role that carries the state. The carried change to tree rows fits: a
`treegrid` whose rows (`role="row"`, `aria-level`, `aria-expanded`) hold the verb, value, count and
on box as cells, the pattern Figma's Layers rows follow. Until then, keep the state on something
that supports it rather than on the group.

### M3. The folded summary presents off steps as working

Two steps both switched off (Shift+Ctrl+H, then Mod+D) fold to
`button "Which nodes, 77 of 77, Keep Degree 4 to 36, Keep Degree 4 to 36"`, and the chips draw both
as live (`sr-slider/09.png`). The reader is told the layer keeps Degree 4 to 36 while it paints all 77. `summaryChips` (`words.ts:240-266`) never reads `step.on` or `branch.on`.

Fix: in `summaryChips`, add "off" to an off step's (or off group's) spoken words and draw its chip
with the same off look its row has; the count chip already follows the element.

### M4. The import filter speaks other panels' counts, never its card's own

Moving a thumb in a Select card speaks the table and the selection on every press,
`"17 of 17 rows, 17 selected"` then `"17 nodes selected"` (`sr-filter/48.png`, `49.png`); in a Filter
out card it speaks the graph that is left, `"Filter on: 60 of 77 nodes, 71 edges"`
(`sr-filter/54.png`). The card's own count, which its header and row show, is never said. The style
host says the step's count once per press, `"60 of 77 nodes"` (`sr-slider/03.png`). A filter's reader
hears two messages per arrow key, and a different number per mode, for one edit.

Fix: let the editor announce its own count in both hosts through the path the style host uses, and
keep the table's row-count status and the selection status quiet while a selection editor is
picking (the change did not come from them).

## Minor

- **m1. A picked algorithm still leaves focus on the card's verb button.** "clos", Enter: after the run
  finished ("Closeness finished: ...") focus is still `button "Verb: Add"` with the boxes drawn
  (`sr-style/69.png`, `70.png`). `decided.md` reports round 2 m3 fixed ("a pending card keeps focus
  waiting for its first box"); it is not on this path. Fix: move focus to the first box when the
  pending card draws it.
- **m2. The filter host's Escape and Done land on the Apply checkbox.** Closing the editor puts focus on
  `checkbox "Apply Degree 10 or more"`, past the card's own disclosure and its mode radios
  (`sr-filter/08.png`), with nothing said; the style host returns to the button that opened it. Fix:
  for a written card, focus the card's header button (now collapsed) in `data-place/Filters.tsx:694-699`.
- **m3. Delete from the card's "..." is not announced.** The row's Delete says "Removed Degree"
  (`sr-style/20.png`); the menu's Delete says only "Preview ended", "77 of 77 nodes" (`sr-style/62.png`).
  Fix: one remove path, one announcement.
- **m4. "+" then Escape says nothing of the step; "Or" then Escape says "No group added".** (`sr-filter/32.png`,
  `36.png`.) Fix: "No step added" for "+", and name the group by its letter rather than the noun
  spec 11 keeps off screen.
- **m5. Names repeat across groups and copies (round 2 m5, carried).** With two groups:
  `Select 22 of 77 nodes`, `Add a step: Keep`, `Add a step with a verb`, `Verb: Add`, `No nodes`,
  `All nodes` and `Table` each occur twice (`dark-style/measure-two-dark.json`, `names.shared`); after
  Mod+D two rows read identically and the arrows give no position (`sr-style/16.png`-`19.png`).
  Fix as carried: the group in its controls' names, a new name for a copy.
- **m6. Disabled menu items cannot be reached, so their reasons are never heard.** In the card "...",
  the arrows skip Move up / Move down ("Already the first step") (`sr-style/51.png`-`58.png`, the items
  in `52.png`): `CommandMenuItem` sets `data-disabled` (`graphty/src/workspace/frame/menus.tsx:60-61`),
  which Mantine's roving focus skips, and compact-mantine's disabled look keys on it
  (`compact-mantine/src/theme/css/00-foundation.css.ts:321-325`). Changing that is compact-mantine's
  behavior: record it for the owner in `../owner-decisions.md`; app-wide, not this editor's.
- **m7. Selecting from a count chip leaves no way back.** After the chip's selection, Escape clears it
  and focus goes to the graph's heading (`sr-toggle/10.png`); the layer being edited is reached again
  only through the layer tree. Fix: Escape from that selection inspector returns to the layer and its
  folded row when the selection came from its chip.

## Already with the owner

The "+" split button's 16 x 24 chevron and the range thumbs' 10 x 10 targets (axe target-size,
serious) appear on every screen in both themes and hosts; they are compact-mantine's Figma look
(`../owner-decisions.md`, 2026-11-01). No other axe finding on any screen; the target-size hit on
"how to match" in `measure-menu-light.json` and `dark-filter/measure-menu-dark.json` is the open
menu overlapping it.

## Carried, not walked again

The reference picker's missing highlighted option (round 2 M7) and rows as `group` rather than tree
rows (round 2 M8) are carried in `decided.md`; M2 above is the most concrete cost of the second.
