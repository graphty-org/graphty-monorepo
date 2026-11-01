# Polish round 2: Figma and graphty consistency review of the selection editor

Build d231869fd585 (graphty@0.8.92), served from a frozen copy of `graphty/dist`. Walked with
`real.mjs` on volunteers.graphml with PageRank run (setup `rounds/tier-4/setups/volunteers.txt`),
light theme (session s1) and dark theme (s2). Both hosts: the PageRank layer's Which nodes (one
group, then two), and a new card under Data > Filters. Screenshots are in the main checkout under
`tmp/design-studio/tier5/polish-2/figma/` (`s1/NN.png`, `s2/NN.png`, zoomed crops `crop-*.png`,
side by sides `side-*.png`). Compared against `compact-mantine/design/figma-spec.md`, the
selection spec (`design/ui/selection-groups/spec.md`), the round 1 fixes in `decided.md`, and the
rest of graphty (the style layer tree and its row menu, the Style tab, the toolbar, the table).

Only problems seen on screen or read in the code are listed, blockers first. Items `decided.md`
already carries to the next build round are listed once at the end, as still open, not re-argued.

## Blockers

### B1. The preview drops the selection ring

- **Evidence.** Select effect on a filter card selects 5 staff; while its step card is open the
  5 nodes draw only in group A's color, with no halo (`s1/16.png`, `crop-16-nodes.png`); after Done
  the same 5 carry the yellow ring (`s1/17.png`, `crop-17-nodes.png`, side by side
  `side-16-17-ring-preview-vs-rest.png`). Same in the style host with the Selected layer reading
  5 (`s1/20.png`).
- **Why it matters.** Spec 9 and acceptance 18: "the Selected ring and the hover mark stay on top";
  the element's own doc for `showBranches` says so too. Without it, color is the only signal in the
  preview, and the reader building a Select card cannot see what is selected.
- **Cause.** `previewStack` in `graphty-element/src/session/styles/StylesApi.ts` suspends every
  layer whose kind is not `base`; the Selected and Hovered rows (`rows.ts`,
  `graphty:starting-selected` / `-hovered`) are ordinary layers, so they are suspended with the rest.
- **Fix (graphty-element).** Keep the state layers (`match: "state"` selected / hovered, or the two
  starting rows by template id) enabled in the preview and paint them above the branch layers; add
  an element test: select a node, `showBranches`, assert its halo channels are still written.

### B2. Two open editors fight over one slot: the key and the table stop matching the canvas

- **Evidence.** Open a filter card (Data place), then click the inspected layer's folded Which
  nodes chip: both editors stay open (`s1/45.png`). While a step is being added in the filter, the
  canvas key reads the style layer's groups ("Preview: Which nodes", A 24, Staff 0) and the table
  shows the style layer's 24 rows on Matches only, while the canvas draws the filter's 5
  (`s1/45.png`). Press Done on the style editor with the filter's card still open: the key falls
  back to "Color: PageRank" and the table loses its Group column and Matches only, while the canvas
  still draws the filter's preview (`s1/47.png` to `s1/48.png`, side by side
  `side-47-48-key-after-style-done.png`; still so in `s1/55.png`).
- **Why it matters.** A wrong result reached in two clicks: the key names colors and counts that
  are not on the canvas.
- **Cause.** Every mounted `SelectionEditor` writes the one `store.editingSelection` (while open,
  not only while picking) and sets it to null on unmount (`SelectionEditor.tsx` lines 174-189), and
  `PreviewKey.tsx` / `TableDock.tsx` read it. The canvas follows `styles.showBranches`, one view at a
  time, so the two disagree. The style editor's close-on-click-outside also misses this path: it
  closes on a blur from inside, and opening it by its chip leaves focus outside the editor, so a
  click elsewhere never blurs it (`StyleSelection.tsx` `onBlur`).
- **Fix.** The key and the table read what the element draws, not an app copy: an additive
  `@beta` fact on the element (the shown view's rule and hold, beside `showingBranches`), so the
  key, the table and the canvas cannot disagree. In the app, only the editor that is picking
  claims the preview, and an editor clears only its own claim. Opening an editor moves focus into
  it, so a click outside ends it as spec 9 says; opening one editor ends the other.

## Major

### M1. The editor's menus and toggles speak a different dialect from the layer tree beside them

- **Evidence.** `side-menus-tree-group-card.png`: the style layer tree's row menu (`s1/09.png`)
  has a glyph on every item, divider groups, "Hide Shift+Ctrl+H" (Figma's Show/Hide) and trash on
  Delete. The group "..." (`s1/24.png`) and the card "..." (`s1/07.png`) have no glyphs, no
  dividers, "Turn off Space" for the same idea, and two different orders (group: Rename, Turn off,
  Select members, Duplicate, Move up, Move down, Delete; card: Turn off, Move up, Move down,
  Duplicate, Delete). The tree's "Select what it paints" is "Select members" here. The row on/off is
  a checkbox where the tree has an eye (carried), so the Space key is the only switch the editor
  shares with nobody.
- **Why it matters.** Figma and graphty give one menu grammar for a row: glyph, word, key, grouped.
  A reader who learns Shift+Ctrl+H on a layer cannot use it on a group or step.
- **Fix.** Build both menus from the tree's command model (`graph-place/commands.ts` row commands:
  label, icon, group, rowKeys), one order (Rename; Duplicate; Move up / down; Show/Hide; Select
  members; Delete), glyphs and dividers as the tree draws them; Show/Hide on Shift+Mod+H with Space
  kept as an alias if wanted.

### M2. The style layer tree did not gain the reorder keys

- **Evidence.** Spec 3: "the style layer tree's rows gain the same keys" (Mod+] / Mod+[).
  `Mod+]`/`Mod+[` appear only in `selection/SelectionEditor.tsx` and `StepCard.tsx`; the tree's
  row commands (`graph-place/commands.ts`) have none, and its menu shows no Move up / down
  (`s1/09.png`; Ctrl+] on a focused layer row did nothing, `s1/10.png`).
- **Fix.** Add Move up / Move down row commands with `rowKeys: ["Mod+]"]` / `["Mod+["]` to the
  tree, so the keys mean the same thing one column apart.

### M3. "Add a rule": the filter words cannot name the new steps

- **Evidence.** After a Within 1 hop step is added to the "role staff" card, the card's remove
  tooltip is "Remove role is staff, add a rule" (`s1/55.png`) and Undo's is "Undo editing the
  filter "role is staff, add a rule"" (`s1/56.png`), while the card's title reads "role, Within 1
  hop of" (`s1/47.png`).
- **Cause.** `data-place/filterWords.ts` `ruleWords` has no case for the new leaves (`hops`,
  `touching`, `nonempty`, `same-value`, `measure`, `by-size`) and falls to `default: "a rule"`;
  it also keeps the tier 4 "is" sentence grammar the folded chips dropped.
- **Fix.** Name the card's remove, its undo step and its announcements from the editor's own step
  words (`selection/words.ts` `stepWords`, as the folded chips are), one grammar per card; add the
  missing leaves to any words that stay.

### M4. Shortcut hints that are not true where they are shown

- **Evidence.** The card "..." lists Turn off on Space (`s1/07.png`), but in the card Space opens
  the test's list or presses the focused button (`crop-33.png`): `StepCard.tsx`'s `onKeyDown` takes
  Mod+[, Mod+], Mod+D and Delete, not Space. Hovering a step row's X or its on box shows the whole
  row's tooltip, "Add (Union), role, staff" (`s1/53.png`, `s1/54.png`), not "Remove role" or "Use
  role Space"; the group row's on box has its own "Use A Space" and the card's X its own "Remove
  hours" (no Delete key shown, `crop-31.png`).
- **Why it matters.** Owner rule: every hotkey shows on its button; figma-spec 9.6 row actions
  carry their own tooltip.
- **Fix.** Drop Space from the card menu (or take Space on the card's non-text, non-button
  surface); give the step row's on box and X their own TooltipShortcut ("Use role" Space, "Remove
  role" Delete) as the group row does, and show Delete on the card's X.

### M5. The reference picker calls frozen references "Live" in the import filter

- **Evidence.** In a filter card's Within 1 hop step the list's first heading is "Live" over
  "Selected (5)" and "So far" (`s1/46.png`); `referenceOptions` in `StepCard.tsx` names that group
  "Live" in both hosts.
- **Why it matters.** Spec 2: the filter has no live references; Selected (N) freezes to node ids
  on commit. The heading says the opposite, in the one host where it matters.
- **Fix.** No heading word for that group in the filter (or the spec's words, per host); the
  list also opens to about 700 px and covers its own box and the card (`s1/46.png`); cap it at the
  shared listbox height and scroll, as the value picker does.

## Minor

- **m1. The single-group selection is called "A" where the editor never shows "A".** One group
  draws no header (spec 1), yet the preview key (`crop-06-key.png`) and the table's Group column
  (`s1/43.png`) name it "A". Use the selection's title (the card name, "Which nodes") for a single
  group's row in the key and the table, or show its letter in the editor too.
- **m2. The key's "No match" row has no swatch and sits in the swatch column**, so it does not
  line up with the group names above it (`crop-06-key.png`). Give it the faint swatch the canvas
  draws for the rest, or indent it to the name column.
- **m3. The new step's placeholder row is 9 px caption type** ("Add" beside the verb glyph,
  `crop-12-newfilter.png`), while the rows around it are 11/16 after the round 1 fix:
  `SelectionEditor.tsx` `StepPlus` anchor still has `Text size="xs"`. Same for the run line's words
  (`StepCard.tsx` `RunLine`, `size="xs"`). Use `size="sm"`.
- **m4. The row's verb menu does not mark the current verb** (`crop-51-rowverb.png`; Add is the
  step's verb, nothing shows it). Figma's boolean menu marks the current operation; the card's
  Computed on already uses `MenuCheckItem radio`. Use the same for Add / Except / Keep on an
  existing step (not on the "+" caret, which has no current verb).
- **m5. The Group colors toggle still uses the plain circle** (round 1 m1, not in the carried
  list; `crop-03-editor.png`). It is `GLYPHS.group`, which is also the paint tree's group-row icon
  in the layer list, so it reads as "a layer" rather than "color by group".
- **m6. The filter host's header is a row with two icons and nothing else**
  (`crop-12-newfilter.png`, `crop-16-filtercard.png`): with the count chip moved to the card header,
  Group colors and Table sit alone right-aligned on a 32 px row. Put them in the card header's
  trailing slot, or on the Start with row.
- **m7. Two "+" stacked, one unlabeled** (`crop-03-editor.png`): the step split button "+ v" and
  "+ Or" 30 px apart, different meanings, only one with a word. Give the step "+" its verb word
  (as its tooltip already says, "Add a step: Keep") or put it in the group row's trailing slot as
  Figma puts a section's "+" in its header.

## What held up

- Rename is InlineRename: name preselected, Enter keeps it, the key follows (`crop-26-rename.png`,
  `s1/28.png`).
- The verb menu opens under the caret now (round 1 m4), and the "+" caret and row menus list
  Figma's order with its glyphs (`crop-49-verbmenu.png`).
- A step's remove shows at rest; the open card hides the row's count and X (round 1 M4, m6).
- Step and card text is 11/16 with the value at 600 (`crop-22-groups.png`).
- Computed on is two radio items; the menus carry keys through MenuShortcut.
- The editor's Table button carries the toolbar's tooltip and key ("Table Shift+T") and opens the
  table on Matches only with the Group column, chits hollow at rest and filled while picking
  (`s1/39.png`, `s1/43.png`).
- Dark theme: rows, chits, card and key keep their contrast (`s2/02.png`).

## Still open from round 1, carried by `decided.md` (seen again, not re-argued)

The rows are still hand-built with a 2 px primary focus ring where the tree has 1 px
(`side-focus-tree-vs-step.png`) and a checkbox where the tree has an eye; Which nodes is still a
9 px caption, not a ControlSection; the value picker still shows a white-on-lime keyboard highlight
and a grey pointer highlight at once, and section rules (`side-13-14-highlight.png`); the number
card still offers Between / Highest / Has a value / Has no value over a bare slider (`crop-33.png`);
a new filter card still lacks the approved header until a value exists, and its count chip (blue
dot, `crop-16-filtercard.png`) still differs from the editor's subtle count buttons; no Pick on
canvas target, card Settings, group Color or Save as set.
