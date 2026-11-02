# Workspace polish round 1: Figma, graphty consistency and accessibility review of the selection workspace

Build 6a37a22344aa (graphty@0.8.92, the branch head), served from a frozen copy of `graphty/dist`.
The interrupted polish round's commit (4a3ed7cf1e) is in this build, and so are the later commits
that verified it. The review walked the build with `real.mjs` on Les Miserables, in three
keyboard-only screen-reader sessions:

- `k1`: a new style layer in the light theme. Opened from the sidebar outline with Enter, then a
  Degree step, F6 and Shift+F6 cycling, Escape, Done.
- `k2`: a Data > Filters card in the dark theme. "Filters +", a Degree step, F6 cycling, the value
  picker, "Or..." then Escape, the title "..." menu.
- `k3`: a style layer in the light theme with the workspace open from setup. Enter on each row
  kind, Clear, Cancel, two groups, Louvain community.

axe ran on the light step pane and the light two-group workspace, and on the dark filter
workspace with the picker and the menu open. A Playwright script read the computed styles and
boxes of the header, the pane and the canvas toolbar in both themes (`m-light.json`,
`m-dark.json`). Everything is in the main checkout under
`tmp/design-studio/tier5/ws-polish-1/figma-a11y/` (`k1/NN.png`, `k2/NN.png`, `k3/NN.png` with
each `route.jsonl` and `measure-*.json`; `m-*.json`, `m-*-step.png`; the script is
`tools/ws-measure.mjs`).

No blocker. axe reports nothing serious or critical other than two items:

- the HistogramRow thumbs' `target-size`, which is already the open compact-mantine question;
- `scrollable-region-focusable` on the value picker's list viewport, which the bars excuse because
  that list is walked with `aria-activedescendant`.

What holds:

- The workspace is a region landmark named by its title ("Which nodes -- Layer 1", "Degree min 6
  -- Filters").
- Opening and closing are announced: "Editing Which nodes, Layer 1", "Done, 41 of 77",
  "Cancelled", "Cleared".
- The covered panel is inert, and F6 skips it.
- Shift+F6 from the workspace reaches the panel that holds the selection.
- Each outline is one Tab stop walked with arrows.
- Escape closes the innermost open thing, then returns focus from the pane to the outline, then
  acts as Done. Done returns focus to the row or Edit that opened the workspace.
- Cancel and Clear are buttons in the header's Tab order, and each works with Enter or Space.

## Major

### M1. While the matches table is shown, the canvas toolbar is under it, yet F6 and Tab still land on it

- **Evidence.** In `k1`, F6 from the inspector goes to the canvas ("Graph drawing") and the next
  F6 goes to `button "Analyze"`, which is not visible: `k1/63.png` shows no toolbar and no focus
  ring anywhere. The measurement confirms this in both themes. For all seven toolbar buttons
  (Analyze, Layout, View, Legend, Table, Filters, Quick actions), `elementFromPoint` at the
  button's center returns a cell of the matches table or the properties column, never the
  button. None of them is inert. This fails WCAG 2.4.11 (Focus Not Obscured): a keyboard user
  presses Enter on controls they cannot see. The toolbar's hidden "Table" opens the main table,
  which spec 3.0 and acceptance 21 say the workspace does not do.
- **Cause.** The toolbar dock (`.ws-toolbar-dock`) sits at the bottom of the canvas column. The
  matches table (`.sel-ws-center` with `data-strip`) and the opaque properties column cover it.
  `PANELS` in `workspace/frame/focus.ts` keeps `.ws-toolbar-dock` in the F6 ring, and nothing
  makes it inert.
- **Fix.** Spec 3.0 lists the toolbar as one of the regions F6 cycles through, so keep it
  reachable and visible. While the workspace is open with the table shown, place the toolbar dock
  at the bottom edge of the preview, above the table. The workspace already measures the preview
  (`.sel-ws-preview`), so the dock can take its position from that measurement. If the owner
  prefers that the toolbar not show, set `inert` on `.ws-toolbar-dock` while it is covered, as
  `Frame.tsx` does for the covered side panel. Add a real-input check: open the workspace, press
  F6 until focus reaches the toolbar, and assert that the focused element is the topmost element
  at its center.

### M2. Enter on an "All nodes" row or on a step whose test is a checklist does not move focus into the pane

- **Evidence.** In `k3`, the workspace is open on the lone group. ArrowDown moves to `treeitem
"All nodes" selected`, and Enter leaves focus on the row (pressed twice, still on the row). The
  same happens on the step row `"Add, Louvain: Community, No test, ..."` in the two-group layer,
  whose pane holds a value field and a checklist (`k3/62.png`). Enter on the title row and on a
  Degree step's row does move focus into the pane. This breaks spec 3.4 ("in the workspace Enter
  moves focus into the pane") and acceptance 24. The same failure explains a second symptom:
  after picking Louvain: Community in a new group's picker, focus lands on the outline's title
  row, not on the test's first control as spec 3.2 asks. The next Escape there then closes the
  whole workspace.
- **Cause.** `focusPane()` and `PANE_FOCUS` (`SelectionEditor.tsx`, about line 1545) take the
  first element that matches `.sel-pane-box input:not(...)` without checking that the element can
  take focus. The collapsed Advanced keeps its controls mounted: the measurement shows the Links
  radios and a filled box at 0,0, 0 x 0 px. The first match is often one of those hidden inputs.
  `focusWithRing` on it does nothing, and `focusPane()` still reports success. The Degree pane
  works only because its "from" box comes before Advanced in the DOM.
- **Fix.** In `focusPane()` and the effect that applies `focusAfter`, keep only candidates that
  can take focus. `tabStops()` and `canFocus()` in `workspace/frame/focus.ts` already do this.
  Return false when none is left. Add checks for Enter on an All nodes row and on a category step
  row, each asserting that `document.activeElement` is inside `.sel-ws-props`.

### M3. The value field is 36 px tall, with Mantine's default border and chevron, beside 24 px compact fields

- **Evidence.** Both themes, measured: the "Value: Degree" field is 303 x **36** px with border
  `rgb(206, 212, 218)` in light and `rgb(68, 68, 68)` in dark. Mantine's up-down selector
  chevron is drawn at its right. Directly under it, the "By value" Select is 24 px with
  compact-mantine's outlined border and filled caret (`k1/60.png`, `k3/62.png`, `m-light-step.png`).
  The pane mixes two field heights and two dropdown looks. Spec 3.2 says "Every control is the
  compact Select's default size (24 px, 11/16 type); the value and reference fields are the
  compact Select's trigger with its own chevron". The code comment at `StepPane.tsx:341` claims
  the same.
- **Cause.** `StepPane.tsx:342` (the value field), `StepPane.tsx:460` (the Links value field) and
  `ReferencePicker.tsx:145` use `InputBase` from `@mantine/core`. compact-mantine's theme has no
  `InputBase` entry (`compact-mantine/src/theme/components/inputs.ts` covers TextInput,
  NumberInput, Select and others), so the field renders at Mantine's default size.
- **Fix.** The fix belongs in compact-mantine, so that every caller gets it: add an
  `InputBase.extend` entry with Select's `defaultProps` (`size: "sm"`, `variant: "outlined"`,
  `rightSection: CARET`) and its `vars` and `classNames`, so that an `InputBase` used as a
  Select's trigger is the Figma Select trigger. In the three app call sites, drop
  `<Combobox.Chevron>`, so the caret comes from the theme. This adds a themed component without
  changing an existing one. Record it in `owner-decisions.md` for the Figma lock, then check the
  pane's fields at 24 px in both themes.

### M4. In the dark theme the preview's Fit button is white text on the light canvas, so it cannot be seen

- **Evidence.** `k2/26.png` and `k2/43.png`: at the top right of the preview (about 1097,100) the
  word "Fit" can barely be seen. Measured in dark, `.sel-ws-fit` has color `rgb(255, 255, 255)`
  and a transparent background, over graphty-element's canvas, which stays light in dark mode.
  That is about 1.1:1 against the canvas, which fails WCAG 1.4.3 and 1.4.11. axe cannot see it,
  because the background is a canvas. In light, Fit is legible (`k1/60.png`).
- **Cause.** `selection.css` places Fit (`.sel-ws-fit`) on the canvas with no surface of its own,
  so it takes the dark theme's text color over a light picture. The preview key next to it draws
  its own card (`--cm-bg` with a border), so it reads in both themes.
- **Fix.** Give `.sel-ws-fit` the same surface as the preview key: `background: var(--cm-bg)`,
  a 1 px `var(--cm-border)` border and the key card's radius. Then the only controls drawn on the
  canvas follow one pattern, as Figma's on-canvas chips do. Add the Fit button to the dark
  screenshot audit.

### M5. After "Or..." then Escape, nothing is selected and the pane loses the step's controls

- **Evidence.** In `k2` (dark), the filter card "Degree min 6" is named after its only step, so
  its title pane holds the step's Keep / Except, Degree, histogram and boxes (`k2/26.png`).
  "Or..." then Escape announces "B not added" and puts focus back on "Or...". That part is
  correct. But the title row is no longer selected: it reads `treeitem "Degree min 6, 41 of 77
nodes"` with no "selected". The pane now shows only "Condition... Or... ...", and the step's
  controls are gone (`k2/43.png`). A keyboard user who opened "Or..." by mistake loses the
  controls they were using and has to go back to the outline and select the row again.
- **Cause.** `addGroup` (`SelectionEditor.tsx`, about line 526) calls `setSelected(null)` when it
  makes the group. `stopAdding` removes the group again but never restores the row that was
  selected before.
- **Fix.** Remember `selected` when `addGroup` runs. When `stopAdding` takes the fresh group back,
  restore that row and keep focus on "Or..." (spec 4.1: taking a step or group back leaves
  everything as it was). Add a check: on a single-step filter card, "Or..." then Escape leaves
  the title row selected and the pane's Degree "from" box present.

## Minor

### m1. Opening the workspace from a sidebar "All nodes" row puts focus on the title row but selects All nodes

- **Evidence.** In `k1`, Enter on the sidebar's `treeitem "All nodes"` opens the workspace with
  the All nodes row highlighted as selected, but focus (and the ring) is on `treeitem "Which
nodes, 77 of 77 nodes"` (`k1/18.png`). Spec 3.0 says opening "moves focus to the selected
  outline row", so focus and selection disagree.
- **Cause.** `openAt` sets `focusAfter` to `[data-row="<id>"]`, but the All nodes row carries
  `data-selects`, not `data-row`, so the title row is used as the fallback. `close` builds its
  return target the same way (line 301).
- **Fix.** In `openAt` and `close`, try `[data-selects="<id>"]` after `[data-row="<id>"]`, as
  `wsKeys` already does for Escape (line 1394).

### m2. "B not added" and "No step added" are each announced twice

- **Evidence.** In `k3` and `k2`, "Or..." then Escape gives two `live: status (polite): "B not
added"` lines. "Condition..." then Escape gives two `"No step added"` lines. "Cleared",
  "Cancelled" and "Editing ..." are each announced once. Spec 4.1 says "announced once".
- **Cause.** `stopAdding` runs twice for one close: the picker's `onOpened(false)` fires for the
  Escape and again as the dropdown unmounts. It calls `say()` both times.
- **Fix.** Return early from `stopAdding` when `adding` is already null, so a second call does
  nothing.

### m3. The header's Group colors | Styled segment is 9 px, where the rest of the header is 11 px

- **Evidence.** Measured in both themes: the "Group colors" and "Styled" labels are **9px**.
  The title, the count and Table, Clear, Cancel and Done are 11px (`m-light.json` and
  `m-dark.json`, `head`). In light, "Styled" is drawn at 9 px in `rgba(0,0,0,0.55)`. figma-spec
  5.2 gives 11/16 for a text option. Repolish 2 removed the same `size="xs"` from six segments in
  the pane. This one came later, with the workspace header.
- **Fix.** Drop `size="xs"` from the header's `SegmentedControl` (`SelectionEditor.tsx`, about
  line 1440). This needs no compact-mantine change. Then check that the header still fits at
  1280 x 800.

### m4. Two buttons named "Table" do different things

- **Evidence.** The name measure lists `button "Table"` twice in `k1` and `k3`. One is the
  workspace header's, which shows or hides the matches table (`aria-pressed`). The other is the
  canvas toolbar's, which opens the main data table. A screen reader's button list gives two
  identical names for two different actions (WCAG 2.4.6 and 3.2.4).
- **Fix.** Keep the visible word "Table" and name the header button "Table of matches"
  (`aria-label`). That keeps label-in-name (2.5.3) and matches the spec's "matches table strip".

### m5. The verb radios are named "Keep , Intersect" and "Except , Subtract"

- **Evidence.** In `k2`, `--read` gives `radio "Keep , Intersect" checked`, with a space before
  the comma. The cause is the hidden `, Intersect` span: Chromium joins the visible word and the
  absolutely positioned hidden span with a space.
- **Fix.** In `VerbSegment` (`StepPane.tsx`, about line 121), change the hidden text to
  `(Intersect)`, giving "Keep (Intersect)". Alternatively, drop the hidden text and keep the
  Figma word in the tooltip only, because the spec does not require it in the name.

### m6. F6 treats the whole workspace as one stop, where spec 3.0 lists its outline, properties and preview separately

- **Evidence.** In `k1` and `k3`, the F6 ring is: header, rail, workspace (one stop, landing on
  its last-focused control), inspector, canvas, toolbar, status bar. Spec 3.0 says "F6 and
  Shift+F6 cycle focus between the regions (the workspace's outline, its properties, the
  preview, the right sidebar, the toolbar)". Acceptance 47 tests only the workspace to sidebar
  move, which passes. Moving between the outline and the properties pane works with Enter and
  Escape, so nothing is unreachable.
- **Fix.** Pick one. Either add `.sel-ws-outline`, `.sel-ws-props` and `.sel-ws-preview` to
  `PANELS` in place of `.sel-ws`, which is the spec as written. Or change the spec sentence to
  "the workspace" and leave the code as it is. The second is smaller and matches how users moved
  in these sessions.
