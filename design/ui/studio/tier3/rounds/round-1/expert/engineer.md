# Screenshot audit: every tier 3 screen at 1200 x 900 and 900 x 700

Build: 758b8e8081 (`.study-builds/tier3-r1d2-758b8e8081`), the frozen build of tier 3.
Date: 2026-10-21. Auditor: Design Engineer.

## How the screens were captured

Every screen, focus action and typing check that bar 6 of `../../../criteria.md` lists (36
screens, from the start page through a run's folder and the "color from each layer" dialog) was
walked with `bars.mjs --tier 3 --size <WxH> --dist <frozen build>`, whose walks are `real.mjs`
sessions, once at 1200 x 900 and once at 900 x 700, in the light theme. Every step leaves a
screenshot, so the states between the listed screens (menus, lists, notices, Undo) are covered
too. All 117 screenshots were looked at. The dark theme was checked at 900 x 700 on the round's
own bars run of the same build (`../bars/sessions/*-900x700/`).

- 1200 x 900: `engineer/1200x900/sessions/{first-use,colleague,own-file,folder-picker}-1200x900/`
- 900 x 700: `engineer/900x700/sessions/{first-use,colleague,own-file,folder-picker}-900x700/`
- Automated readings for each size: `engineer/<size>/bars.json` (axe, cut text, shared names)

Paths below are relative to `engineer/`. Screen numbers are the screenshot file names. Severity:
0 cosmetic only, 1 minor, 2 noticeable inconsistency or cost, 3 hides content or a control,
4 blocks a task.

## Automated readings

- No text cut off with its whole text unavailable, and no visible code or field path, at either
  size (bar 10: 0 and 0 at both sizes). No MISS line: every bar 6 screen was reached at both sizes.
- axe, the same at both sizes and already known: the light theme's "Autosave: saved" badge fails
  contrast on every screen with a graph (35 screens); the "Why this look" layer links and the
  number card's two range handles are under the target size; the open shape list and the find
  box's results are scroll regions with no keyboard access.
- The cut-text check missed finding 1 below: it compares a box's own scroll width with its own
  width, and the notice is clipped by the canvas around it, not by its own box.

## Findings, most severe first

### 3 -- The notice is wider than the canvas at 900 x 700; its first words, Save and close are cut off

- Screens: a sample just opened, the key switched on, a run's folder.
- Evidence: `900x700/sessions/first-use-900x700/04.png`, `05.png`;
  `900x700/sessions/folder-picker-900x700/04.png`; dark theme `../bars/sessions/first-use-900x700/04.png`.
- At 900 x 700 the canvas column is 363 px wide. The notice "This browser may clear what it keeps
  for this site. Save a copy to a file to be sure." with its Save button and close button is about
  540 px wide, centered on the canvas and clipped on both sides: "This browser" is gone, and Save
  and close are under the inspector, so a pointer user cannot save or dismiss it (it still times
  out). At 1200 x 900 it fits (`1200x900/sessions/first-use-1200x900/04.png`).
- Mechanism: `.cm-toast-message` has `white-space: nowrap` and the toast has no maximum width
  (`compact-mantine/src/theme/css/overlays.css.ts`, section 8.6), so it never wraps to its layer.
- Owner: compact-mantine (Toast should wrap, or cap its width at its layer's width).

### 3 -- A saved project reopened in a smaller window draws its graph off-center, partly under the toolbar

- Screens: a colleague's project just opened, a colleague's layer selected.
- Evidence: `900x700/sessions/colleague-900x700/02.png`, `03.png` (graph pushed to the bottom of
  the canvas; its lowest nodes are under the "Opened lesmis-poster" notice and the toolbar);
  dark theme `../bars/sessions/colleague-900x700/02.png`, the same; at 1200 x 900
  `1200x900/sessions/colleague-1200x900/02.png` (graph drawn at about a third of the canvas,
  pushed right and down, the left half of the canvas empty).
- The same file at 1440 x 900 frames well, so the saved view is restored as it was saved rather
  than fitted to the window it opens in. Mechanism not traced: whether the element restores the
  camera without fitting, or the app restores it itself.
- Owner: graphty-element if its camera restore does not fit the viewport (likely); graphty if the
  app applies the saved camera itself.

### 2 -- The key covers the drawing

- Screens: a color bound to a category column, the size popover of a number column, a run's folder.
- Evidence: `1200x900/sessions/own-file-1200x900/17.png`, `19.png` (a node at the top left half
  under the key); `1200x900/sessions/folder-picker-1200x900/03.png` to `06.png`;
  `900x700/sessions/own-file-900x700/19.png`, `900x700/sessions/folder-picker-900x700/04.png`
  (at 900 x 700 the 240 px key covers about two thirds of the canvas width at the top, over two
  nodes of the left cluster).
- The fit ignores the key here, while on the colleague's project (above) the drawing is pushed
  right as if a column were kept for it: two different behaviors for the same key.
- Owner: graphty (where the key sits and what the frame leaves room for).

### 2 -- Two field looks side by side: grey filled and white outlined

- Screens: a number card, a groups analysis before it runs, the size popover of a number column.
- Evidence: `1200x900/sessions/own-file-1200x900/17.png` ("Values from / Values to" grey filled,
  "Size from / Size to" white outlined, in one popover); `1200x900/sessions/first-use-1200x900/29.png`
  (Resolution grey filled beside the white outlined Weight select);
  `1200x900/sessions/own-file-1200x900/07.png` (the number card's 2 and 52 grey) against
  `first-use-1200x900/07.png` (Size and Color white outlined).
- compact-mantine's TextInput and NumberInput default to filled; the app sets `variant="outlined"`
  on some fields (`PropertyRow.tsx`, `ValueField.tsx`, `BindingPopover.tsx` near line 1148,
  `StylePanel.tsx`, `LabelSettings.tsx`) and not on others, so a reader sees two kinds of box for
  the same kind of value.
- Owner: graphty (one variant for value fields), with compact-mantine if the design system needs
  a named field look for property values.

### 2 -- Two attribute pickers that look unrelated

- Screens: the add-a-condition menu; the size popover, before a column is picked.
- Evidence: `1200x900/sessions/first-use-1200x900/15.png` (borderless search, 12 px rows, group
  rules "Data" and "Structure") against `1200x900/sessions/own-file-1200x900/15.png` ("Node size by
  attribute": a 32 px boxed search, 14 px rows, a title bar and close button, about 110 px of
  empty space at the bottom); same at `900x700/.../own-file-900x700/15.png`, where it also covers
  the header bar.
- Both list a graph's attributes to pick one. Owner: graphty.

### 2 -- Condition chips have two shapes

- Screens: a layer with a condition at rest; a layer with an Edge tab condition at rest.
- Evidence: `1200x900/sessions/first-use-1200x900/21.png` (node chip: white, outlined, one line,
  hugs its text) against `first-use-1200x900/38.png` (edge chip: grey fill, full width, wraps
  "shared_chapters 1 to 31, / 254 edges" onto two lines though it fits on one); same at 900 x 700,
  `first-use-900x700/38.png`. Owner: graphty.

### 2 -- Find results squeeze the layer list into a strip of one and a half rows

- Screen: the find box, a name typed, its results.
- Evidence: `1200x900/sessions/first-use-1200x900/33.png`, `900x700/sessions/first-use-900x700/33.png`.
- "Style layers" shrinks to a strip about 60 px tall above "Graph settings", with its own scroll
  arrows and scrollbar; "Selected" is cut in half and nothing below it is visible. Owner: graphty.

### 2 -- The analysis list keeps its full height when a filter leaves one result

- Screen: the analysis list, filtered to groups.
- Evidence: `1200x900/sessions/first-use-1200x900/28.png` (one row, "Louvain", then about 360 px
  of empty popover). Owner: graphty.

### 2 -- Inspector help text comes in three sizes

- Evidence: `1200x900/sessions/first-use-1200x900/07.png` ("Everything styles all 77 nodes: it is
  the base layer..." at about 9 px), `14.png` ("Which nodes" heading and "Nodes that pass every
  condition" at about 9 to 10 px, smaller than the section headings below), `31.png` ("6 layers in
  Louvain. Layers added later are not changed." at 12 px, body size), `10.png` (the arrowhead note
  at 9 px). The same kind of line, an explanation under a heading, is set at 9 px in one place and
  12 px in another. Owner: graphty.

### 2 -- The key's title has two forms

- Evidence: `1200x900/sessions/colleague-1200x900/02.png` ("Color: Poster", 12 px, on the swatch
  row) against `1200x900/sessions/own-file-1200x900/11.png` ("Color: role", about 9 px, a header
  above the rows); `1200x900/sessions/first-use-1200x900/05.png` ("Nothing is styled yet" at about
  9 px in a 240 px box sized for a full key). Owner: graphty.

### 2 -- A layer's name breaks across lines

- Screen: two layers picked together.
- Evidence: `1200x900/sessions/first-use-1200x900/36.png`, `900x700/sessions/first-use-900x700/36.png`:
  "1 layer sets size; not set: Layer" / "1". A name should not break inside itself (a non-breaking
  space, or the whole name on the next line). Owner: graphty.

### 2 -- "«Layer»" is shown as a bracketed token

- Screens: a folder of groups, two layers picked together, a run's folder, the color from each layer dialog.
- Evidence: `1200x900/sessions/first-use-1200x900/31.png` (Color field "«Layer»" in purple,
  chip "Louvain: «Layer»"), `36.png` (chip "name: «Layer», 1 of 2 layers"),
  `1200x900/sessions/folder-picker-1200x900/04.png` (card "«Layer» 3 layers"), `06.png`
  ("Source: «Layer»"). Guillemets around a word read as template syntax, unlike every other value
  in the panel. Owner: graphty (the words); the element if it supplies the token.

### 2 -- At 900 x 700 the canvas gets 40% of the window

- Evidence: `900x700/sessions/first-use-900x700/07.png` (rail 57 + layer panel 240 + inspector
  240; the canvas is 363 px and the toolbar 314 px of it); `27.png` (the analysis list covers the
  layer panel's counts and eye buttons); `900x700/sessions/own-file-900x700/10.png` (the right
  cluster touches the inspector edge). Neither side panel narrows or folds at this width.
  Owner: graphty.

### 1 -- Popovers that hug the window edge or the header

- Evidence: `1200x900/sessions/first-use-1200x900/08.png` and `900x700/.../08.png` (the shape list
  covers the header bar, 6 px from the window's right edge, its top row half under the scroll
  arrow); `900x700/sessions/own-file-900x700/15.png` (the size picker over the header bar).
  Owner: compact-mantine (list placement and its collision padding).

### 1 -- Scroll affordances differ between lists

- Evidence: shape list arrows only (`first-use-1200x900/08.png`); analysis list arrows and a
  scrollbar (`27.png`); size popover arrows and a scrollbar (`own-file-1200x900/17.png`); squeezed
  layer list arrows and a scrollbar (`first-use-1200x900/33.png`). Owner: compact-mantine.

### 1 -- One popover has a green outline

- Evidence: `1200x900/sessions/own-file-1200x900/17.png`, `900x700/.../own-file-900x700/17.png`:
  the "Size by hours" popover is ringed in green (a focus ring on the whole surface); the color
  popover beside it (`12.png`) has none. Owner: graphty or compact-mantine (whichever focuses the
  surface rather than its first control).

### 1 -- Small alignment slips

- Field left edges move 3 px between the Node and Edge tabs (the label column follows its longest
  label, "Pattern"): `first-use-1200x900/07.png` against `10.png`.
- The folder row's expand caret sits outside the row's highlight, at x 64
  (`first-use-1200x900/31.png`); the "Why this look" caret sits left of the section headings' edge
  (`35.png`).
- The run card's gear icon stands alone with no label (`first-use-1200x900/29.png`).
- A disabled minus icon beside the Palette and Scale selects means nothing at rest
  (`own-file-1200x900/12.png`, `17.png`).
- The green Done button peeks out beside the open add-a-condition menu and the suggestion list
  (`first-use-1200x900/15.png`, `19.png`).
- Owner: graphty.

### 1 -- Text size and density mismatches inside one surface

- The color popover's group names are about 9 px while its header and counts are 12 px
  (`own-file-1200x900/12.png`, `folder-picker-1200x900/06.png`).
- The import review's preview table has 33 px rows, far looser than the rest of the app
  (`own-file-1200x900/02.png`).
- Owner: graphty.

### 1 -- The Main menu tooltip covers the logo on the start page

- Evidence: `900x700/sessions/first-use-900x700/02.png` (after the first Tab: the tooltip lies
  over the top of "graphty"). Owner: graphty.

## Not findings

- The canvas stays light in the dark theme: decided, not a defect.
- The shape list opening scrolled to the current shape, with the first row partly under the
  scroll arrow, is how the list keeps the choice in view.
- The private-window notice appearing at all comes from the browser automation's storage quota,
  which the element reads as a private window; only its width is a finding.
