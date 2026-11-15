# Workspace polish round 3: Figma, graphty consistency and accessibility review of the selection workspace

Build 18e34e72950b (graphty@0.8.92, the branch head), rebuilt and served from a frozen copy of
`graphty/dist`. Commit 4a3ed7cf1e (the interrupted polish round) is an ancestor of this head, and
the polish 2 fixes (30bc080940 and the commits after it) are in this build. The review walked it
with `real.mjs` on Les Miserables:

- `k1`: a new style layer, light theme, screen-reader mode, keyboard only. F6 at rest, Enter on
  the inspector's outline, a Closeness step, the Escape ladder, Advanced, "Or..." then Escape, a
  group B (Degree), Space, Mod+D and Delete on group rows, Clear, Mod+Z, the title "...", F6 and
  Shift+F6 while open, Cancel, Done.
- `k2`: Data > Filters, dark theme, screen-reader mode, keyboard only. "Add filter", Escape on the
  new card, Nodes | Edges by arrow keys, an edge card (shared_chapters) and a Degree card, the
  "..." menu, the collapsed card row, Space on a title row.
- `tools/probe.mjs` and `tools/probe2.mjs`: Playwright reads of boxes, type, ARIA and the
  accessibility tree, light and dark at 1440 x 900 and dark at 1280 x 800 (`p-*.json`,
  `q-light.json`, with screenshots).

axe ran on the light two-group step pane (`k1/measure-light-newB.json`), the dark step pane and
the dark "..." menu (`k2/measure-dark-*.json`). Everything is in the main checkout under
`tmp/design-studio/tier5/ws-polish-3/figma-a11y/`.

No blocker. axe reports nothing serious or critical other than the HistogramRow thumbs'
`target-size` (12 x 12 px), the open compact-mantine question.

## Round 2 findings: all fixed

| Round 2 finding                                                     | Now                                                                                                         |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Escape on an open Advanced did nothing                              | Fixed. Enter opens it, Escape closes it and leaves focus on it, in both themes.                             |
| A new filter card's first Escape from the pane closed the workspace | Fixed. Escape from the test goes to the card's title row; the next Escape closes as "Done, 51 of 254".      |
| A new card hid Nodes \| Edges while its picker was open             | Fixed. The segment is drawn above the value field with the picker open (`p-dark-filter-new.png`).           |
| A discarded new card was silent                                     | Fixed. "Filter not added".                                                                                  |
| Two rows lit while adding, the title read as selected               | Fixed. While a step is added no tree item is `aria-selected`; only the "Value..." row is lit (`k1/49.png`). |
| Focus after an algorithm pick landed on the verb                    | Fixed. Picking Closeness focuses "Closeness from".                                                          |
| The 1280 x 800 preview under 440 px                                 | The spec now asks for 424 px. The build gives 423 px (see m4).                                              |

What else holds:

- The workspace is a region landmark named by its title, and the header is Group colors |
  Styled, "Table of matches", Clear, Cancel, Done, all 24 px at 11 px type in both themes.
- Opening, Done, Cancel and Clear are announced ("Editing Which nodes, Layer 1", "Done, 77 of 77",
  "Cancelled", "Cleared"). Mod+Z after Clear brings the groups back. Cancel and Done return focus
  to the row that opened the workspace.
- Space on a group row says "B off" / "B on"; Mod+D says "Copied B"; Delete says "Removed C" and
  leaves focus at the row's place. "Or..." then Escape says "B not added".
- While open, the canvas toolbar takes no focus and the covered left panel is out of the F6 ring.
- Except is a `switch` named "Except", 24 px tall.
- Focus rings are drawn on the outline rows and the pane controls in dark (`crop-k2-36.png`,
  `crop-k2-52.png`).

## Major

### M1. In a style layer, a changed test's count is never announced

- **Evidence.** In `k1` (style layer), typing 5 into "Degree from" and pressing Tab, or typing 0
  and pressing Enter, gives no `live:` line. The header's count changes on screen only. In `k2`
  (filter card), the same edit ("3" then Tab) announces "50 of 77 nodes". A screen-reader user
  who edits a layer's selection hears nothing about what the edit did. The two hosts are meant to
  be one editor (spec 3.0: "the same outline, verbs and controls"). WCAG 4.1.3 counts a result
  count as a status message.
- **Cause.** `SelectionEditor.tsx` line 290:
  `useAnnounceChange(host === "filter" && open ? heardCount : null);`.
- **Fix.** Announce for both hosts: `useAnnounceChange(open ? heardCount : null);`. Add a check
  to `SelectionWsPolish2.real-element.test.tsx` (or its round 3 successor): in a style layer's
  workspace, type a Degree min and assert the live region says "N of 77 nodes".

### M2. Arrow keys on a new card's Nodes | Edges pull focus into the picker

- **Evidence.** In `k2`, with focus on `radio "Nodes"`, ArrowRight selects Edges, then the
  workspace says "Editing New filter, Filters" again and focus jumps into the reopened picker's
  search box. The workspace was already open, so the announcement is wrong, and a keyboard user
  cannot press ArrowLeft to go back: Left now moves in the search box. To change sides again they
  must Shift+Tab out of the picker ("No step added") and Tab back to the segment. Moving focus
  when a radio changes is a change of context on input (WCAG 3.2.2). A Figma segment never moves
  focus.
- **Cause.** `Filters.tsx` lines 567 to 577: the segment's `onChange` replaces the draft rule, and
  `openPicker={draft && stepless}` with `openTitle` reopens the editor, which announces opening
  and focuses the picker.
- **Fix.** Keep focus on the segment when the side changes: open the picker again only if it was
  open before the change and the change came from a pointer, or leave it closed and let Enter on
  the value field open it. Do not announce "Editing ..." on a side change; if anything, say
  "Edges". Add a real-input check: Tab to Nodes, press ArrowRight, and assert that focus is on
  `radio "Edges"` and that ArrowLeft selects Nodes again.

## Minor

### m1. The value picker is narrower than its field, and cuts value names

- **Evidence.** The picker opens under a 285 px field in a 320 px properties column. Its width is
  287 px when it opens from a stepless layer (Enter on the field), 239 px for "Add filter", and
  220 px after "Or..." (`q-light-or-picker.png`, `p-dark-filter-new.png`). At 220 px the Results
  row reads "Close... 0.003378 to 0.008475" (`crop-q-light-or-picker.png`). A Figma dropdown is as
  wide as its field, and spec 3.0 gives the column 320 px so that value fields never truncate.
- **Cause.** `AddCondition` in `WhichPicker.tsx` (about line 1290) measures the column from
  `button.current ?? document.activeElement`. With an `anchor`, `button` is null, so it measures
  the column of whatever had focus: "Add filter" in the Data place (239 px). On "Or..." the list
  is opened through `opened`, `onDropdownOpen` does not run, and the default 220 stays.
- **Fix.** When an `anchor` is given, use Mantine's `width="target"` on the `Combobox`, or measure
  from the anchor's own `.sel-ws-props` column in an effect on `opened`. Add a check that the
  listbox is as wide as the value field after "Or..." and after "Add filter".

### m2. The outline tree is flat to assistive technology: a step does not belong to its group

- **Evidence.** With groups A and B, Chrome's accessibility tree gives every group row and every
  step row `level 2` (`q-light.json`, `axLevels`): "A, green", "Closeness: Reach", "B, orange",
  "Degree min 10" are siblings. The screen shows the steps indented under their group. A screen
  reader cannot tell which group a step narrows, and the step's name does not say it. Figma's
  layers panel exposes nesting.
- **Cause.** `SelectionEditor.tsx` (about line 1057): each `role="group"` holds the group row and
  its steps side by side, and is not owned by the group row's tree item.
- **Fix.** When there are two or more groups, set `aria-level={2}` on group rows and
  `aria-level={3}` on their step rows (and `aria-level={2}` on steps of a single group), or nest
  the steps' `role="group"` inside the group row's tree item. Assert the levels in a test through
  the accessibility tree.

### m3. A collapsed filter card's name runs its name and count together

- **Evidence.** In `k2` the collapsed card is read as `button "shared_chapters min 5 51 of 254"`.
  A screen reader says "min 5 51 of 254", and the card does not say edges. The same card's title
  row says "shared_chapters min 5, 51 of 254 edges".
- **Cause.** `Filters.tsx` (about line 600): the `UnstyledButton` has no `aria-label`, so its name
  is its text spans joined.
- **Fix.** Name it as the title row does: `aria-label={[title, countWords(count, of, side)].join(", ")}`
  (with ", off" when off).

### m4. At 1280 x 800 the preview is 423 px, one under the spec's 424

- **Evidence.** In `p-1280.json` (dark, style layer) the preview spans x 297 to 720, 423 px. The
  rail is 57 px, the outline 240, the properties 320 and the inspector 240. The strip is 209 px,
  over its 180.
- **Fix.** Change spec 3.0's minimum to 423 px; the round 2 arithmetic took the rail as 56 px.

### m5. The value field does not say whether its picker is open

- **Evidence.** The value field (`button "Value"`, `button "Value: Closeness: Reach"`) has
  `aria-haspopup="listbox"` and no `aria-expanded`, open or closed (`p-light.json`, `trig`). The
  popup it opens is a search box with a list, not a listbox. The test select beside it
  ("Closeness test") does say "collapsed".
- **Cause.** `StepPane.tsx` line 340 and `SelectionEditor.tsx` line 1929.
- **Fix.** Add `aria-expanded={open}` to both triggers and change `aria-haspopup` to `"dialog"`
  (or to `true`), matching what opens.

### m6. The preview canvas is outside the workspace region and comes after the side panel in F6

- **Evidence.** While a style layer's workspace is open, F6 goes: the workspace, the inspector
  (`button "Select what it paints"`), `Canvas "Graph drawing"`, the status bar, the app header,
  the rail. The canvas is drawn inside the workspace as its preview (spec 3.0: "the canvas is the
  preview"), but `canvasInRegion` is false in every probe. A keyboard user must pass through the
  inspector to reach the preview they are editing, and a screen reader does not hear it as part
  of "Which nodes -- Layer 1".
- **Fix.** While the workspace is open, put the canvas's F6 stop right after the workspace's, and
  name it as the preview ("Preview: Which nodes"), matching the key. Moving it into the region's
  DOM is not needed.
