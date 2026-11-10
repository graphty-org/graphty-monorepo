# Workspace polish round 2: Figma, graphty consistency and accessibility review of the selection workspace

Build 64cb33f3a61e (graphty@0.8.92, the branch head), rebuilt and served from a frozen copy of
`graphty/dist`. The interrupted polish round's commit (4a3ed7cf1e) and every later fix are in this
build. The review walked it with `real.mjs` on Les Miserables in three sessions:

- `k1`: a new style layer, light theme, screen-reader mode, keyboard only. Opened from the
  inspector's outline with Enter, the Escape ladder, a Degree step, "Or..." and "Condition..."
  then Escape, a second group B, Space on a group row, Delete, Cancel, Done, F6 in both directions.
- `k2`: Data > Filters, dark theme, screen-reader mode, keyboard only. "Add filter", Escape on the
  new card's picker, a Degree card and a Closeness card, the "..." menu, Advanced, Space on the
  title row, F6.
- `k3`: the workspace opened from setup at 1280 x 800, dark theme, keyboard only.

axe ran on the light step pane (`k1/measure-light-step.json`), the light two-group workspace
(`measure-light-groups.json`), the dark filter step pane, the dark "..." menu and the dark sidebar
at rest (`k2/measure-*.json`). A Playwright script read computed styles and boxes of the header,
the pane, Fit and the canvas toolbar in both themes (`m-light.json`, `m-dark.json`). Everything is
in the main checkout under `tmp/design-studio/tier5/ws-polish-2/figma-a11y/` (`k1/NN.png`,
`k2/NN.png`, `k3/NN.png`, each with `route.jsonl`; the scripts are in `tools/`).

No blocker. axe reports nothing serious or critical other than the HistogramRow thumbs'
`target-size` (12 x 12 px), which is the open compact-mantine question.

## Round 1 findings: all fixed

| Round 1 finding                                                          | Now                                                                                                                                                                              |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The canvas toolbar was under the matches table yet still took F6 and Tab | Fixed. All seven toolbar buttons are inert and not rendered while the workspace is open, in both themes. The F6 ring is header, rail, workspace, side panel, canvas, status bar. |
| Enter on an "All nodes" row did not move focus into the pane             | Fixed. Enter on All nodes lands on "Condition...". Enter on a step row lands on the test's first box.                                                                            |
| The value field was 36 px with Mantine's border and chevron              | Fixed. The value field is the compact Select trigger, 24 px with the filled caret, in both themes (`k1/50.png`). The theming change is recorded in `owner-decisions.md`.         |
| Fit was white on the light canvas in the dark theme                      | Fixed. In the dark theme Fit draws on `rgb(44,44,44)` with a `rgb(68,68,68)` border, as the preview key does (`k2/44.png`).                                                      |
| "Or..." then Escape lost the selected row and its controls               | Fixed. The step stays selected, its controls stay, focus returns to "Or...".                                                                                                     |
| Opening from a sidebar "All nodes" row focused the title row             | Fixed. Focus and selection are both on All nodes.                                                                                                                                |
| "B not added" and "No step added" were each announced twice              | Fixed. Each is announced once.                                                                                                                                                   |
| The header's Group colors and Styled were 9 px                           | Fixed. Every header label is 11 px in both themes.                                                                                                                               |
| Two buttons were named "Table"                                           | Fixed. The header's toggle is "Table of matches".                                                                                                                                |
| The verb radios were named "Keep , Intersect"                            | Fixed. They are "Keep (Intersect)" and "Except (Subtract)".                                                                                                                      |
| F6 treated the workspace as one stop, unlike the spec                    | Resolved in the spec. Spec 3.0 now says the workspace is one region in the F6 ring, which matches the build.                                                                     |

What else holds:

- The workspace is a region landmark named by its title.
- Opening, Done and Cancel are announced: "Editing Which nodes, Layer 1", "Done, 41 of 77",
  "Cancelled".
- Cancel returns focus to the row that opened the workspace.
- Space on a group row toggles it and announces "B off" and "B on". The eye shows on focus.
- Delete leaves focus at the deleted row's place and selects no row.
- Opening a collapsed filter card puts focus on its title row. Space there switches its on box,
  and the row's name ends ", off" while it is off.
- The "..." menu shows its keys (Ctrl+D, Del) at 11/16.

## Major

### M1. Escape on an open Advanced disclosure does nothing

- **Evidence.** In `k1` (light), focus is on `button "Advanced All nodes" expanded`. Three
  Escapes leave focus there and Advanced open (`k1/36.png`). The same happens in `k2` (dark) on
  `button "Advanced" expanded` for a Degree step. Escape from a control inside Advanced works: it
  closes Advanced and focuses its button. So a keyboard user who opens Advanced with Enter and
  then presses Escape, the most common way to close it, is stuck. Spec 3.4 says "Escape closes the
  innermost open thing per press: ... close a list, menu or Advanced, return focus from the pane
  to the outline".
- **Cause.** `wsKeys` (`SelectionEditor.tsx`, about line 1454) returns early when
  `target.matches("[aria-expanded=true]")`. That check is meant to let an open combobox or menu
  trigger handle its own Escape. The Advanced button is a disclosure, and it carries
  `aria-expanded="true"` while open, so its Escape is dropped.
- **Fix.** Exclude the disclosure from the early return:
  `target.matches("[aria-expanded=true]:not(.sel-advanced)")`. The next lines already find the
  open `.sel-advanced`, click it and refocus it. Add a real-input check: Enter on Advanced, then
  Escape, and assert that Advanced is collapsed and focused.

### M2. On a new filter card, the first Escape from the pane closes the workspace instead of going to the outline

- **Evidence.** In `k2` (dark): "Add filter", pick Closeness. Focus is in the pane. One Escape
  announces "Done, 77 of 77" and closes the workspace. Spec 3.4 says the Escape ladder first
  returns focus from the pane to the outline. The same happened after a new Degree card: Escape
  from inside Advanced collapsed it, and the next Escape closed the workspace (`k2/77.png`). After
  the card is reopened from the sidebar, the same keys correctly go to the outline row. So the
  ladder fails only on a card's first edit, which is when it is used most.
- **Cause.** A card named after its only step draws only its title row (spec 3.3). After the
  first pick, `pick()` selects the new step's id (`select(made.id, ...)`). `wsKeys` looks for
  `[data-row=<selected>]` or `[data-selects=<selected>]` in the outline. No row has the step's id,
  because the title row stands for it, so `wsKeys` falls through to `close("done")`.
- **Fix.** In `wsKeys`, fall back to the title row before closing:
  `const back = recipeOpen ? TITLE : (selected ?? TITLE)`, or try `[data-row="${TITLE}"]` when
  the selected row's query finds nothing. Add a check: on a new filter card, pick a value, press
  Escape, and assert that the workspace is still open with focus on its title row.

### M3. A new filter card hides Nodes | Edges while its value picker is open, and Escape there discards the card

- **Evidence.** In `k2` (dark), "Add filter" opens the workspace with the picker open under a
  "Keep / Value..." pane, and no Nodes | Edges segment anywhere (`k2/15.png`; `--read` lists none).
  The picker lists only node values. Spec 3.3 says "Filters +" opens the workspace "on its title
  row, Nodes | Edges and the value picker open", and spec 3.2 lists Nodes / Edges in the title
  pane for a new card. To make an edge filter, a keyboard user must Shift+Tab out of the picker
  ("No step added"), after which the title pane shows Nodes | Edges (`k2/26.png`). A pointer user
  must click off the picker. Escape, the obvious key, takes the whole card back and closes the
  workspace.
- **Cause.** `Filters.tsx` passes the segment as `titleExtra`, and `SelectionEditor` draws
  `TitlePane` (which holds `titleExtra`) only when `adding === null`. "Add filter" opens with
  `adding` set, so `NewStepPane` replaces the title pane.
- **Fix.** While `adding` is set and `titleExtra` is defined, draw `titleExtra` above
  `NewStepPane`'s verb row, so the segment and the picker show together, as the spec says. The
  segment's `onChange` already starts the selection again on the other side. Add a check: "Add
  filter" shows `radio "Edges"` with the picker open, and choosing Edges lists edge values.

## Minor

### m1. The new card's Escape closes the workspace silently

- **Evidence.** In `k2`, Escape on a new card's picker returns focus to "Add filter" with no
  `live:` line. Every other close is announced ("Done, 41 of 77", "Cancelled"), and every other
  take-back is announced ("B not added", "No step added"). Spec 3.0 says closing is announced.
- **Cause.** `stopAdding` calls `onEmptyCancel()` and returns before its `say()`.
- **Fix.** Call `say(...)` before `onEmptyCancel()`, for example "Filter not added", in the form
  of "B not added".

### m2. While a step is being added, two outline rows are lit and the screen reader is told the title is selected

- **Evidence.** In `k1` (light) after "Condition..." on the title pane, the title row "Which
  nodes" and the new "Keep Value..." row are both drawn with the selected background
  (`k1/76.png`). The same happens on a new filter card in dark (`k2/15.png`). Spec 3.2 says the
  step being added has "its outline row lit as Value...". `--read` gives
  `treeitem "Which nodes, 41 of 77 nodes" selected`, while the new row is `aria-hidden`. A screen
  reader therefore says the title is selected while the pane holds the new step.
- **Cause.** `startAdding` keeps `selected` (TITLE), so the title row stays `aria-selected`. The
  new row is drawn with `data-selected`. `openAt`'s stepless path already does
  `setSelected(null)` for this reason ("the new step's row is the one lit, never the title's
  too"). The Condition... path and the "Add filter" path do not.
- **Fix.** In `startAdding`, remember `selected` as `back` (as `addGroup` does) and set
  `selected` to null. Restore it in `stopAdding` when nothing is picked.

### m3. After picking an algorithm value, focus lands on the verb radio, not the test

- **Evidence.** In `k2`, picking Closeness puts focus on `radio "Keep (Intersect)" checked`. The
  test's controls ("Closeness test", the range, the from and to boxes) appear a moment later.
  Picking Degree, which needs no computation, focuses "Degree from" as spec 3.2 asks ("After a
  value is picked, focus goes to the test's first control").
- **Cause.** The focus effect applies `PANE_FOCUS` on the first render after the pick. The test
  is not drawn yet while Closeness computes, so the third selector,
  `.sel-pane-box input:not([type=hidden])`, matches the verb radio.
- **Fix.** After a pick, target the test (for example `.sel-pane-box [data-first-focus]`, set on
  the test's first control) and leave `focusAfter` pending until it mounts. Fall back to the
  value field only if the step reads "Run" or "No test".

### m4. At 1280 x 800 the preview is 423 px wide, under the spec's 440

- **Evidence.** In `k3` (1280 x 800, dark, style layer), the preview spans x 297 to 720, which is
  423 px (`k3/01.png`). The outline is 240 px, the properties 320 px and the inspector 240 px.
  Spec 3.0 asks for at least 440 px at 1280 x 800. The strip is 200 px, which meets its 180.
- **Fix.** Either let the outline take its content width here (its rows are short, "All nodes"
  and "Keep Value..."), within the spec's 200 to 280 px, or change the spec's minimum to the width
  that 240 + 320 + 240 columns leave (424 px). The second is smaller and needs no code.
