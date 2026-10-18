# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "the studio worktree" is
`.worktrees/design-studio-tier3` (branch `design/studio-tier3`). "Frozen build" is a copy of
`graphty/dist` under `.study-builds/`, named on the first line of `tier3/criteria.md`.

Summarized 2026-10-17 from 44 KB. Every dated entry of today's dry-run fixes (table, Analyze run,
filter steps, style panel polish, page and selection, undo, inspector targets, condition lists,
yes and no, find box, names and words, focus, number card, spoken messages, color box, drawing and
camera) is in full in git: `git show 54c009f84:design/ui/studio/notes/engineer.md`. Older entries
(2026-10-06 to 10-17): `git show 6b160deb5:design/ui/studio/notes/engineer.md`.

## Top of mind

0. (2026-10-18, shared lists) A select-only list closes when focus leaves its trigger for another
   control (`focusout` in `ensureListboxKeyboard`, compact-mantine `listbox.tsx`; Mantine closes
   only a searchable Select on blur), so the grid no longer covers the panel after Tab and its
   drawn and announced highlights cannot part. Table cells of a selected row carry
   `aria-selected` (the focused cell is what a screen reader reads); real.mjs `selected=N` counts
   rows only. A column's options button is "more" with a tooltip. Tree carets drawn at rest
   (`--cm-icon-secondary`). A VariablePill with no glyph draws no empty slot. The Analyze list's
   active option: selected fill plus a ring 7.4:1 against the list (app `toolbar.css`). Test
   `compact-mantine/tests/components/SharedLists.browser.test.tsx`; walk
   `design/ui/studio/tmp/r1-dry2-r1-3-05/w2` (05, 06, 09, 11, 15), `w1/01.png`, `w3/02.png`.
1. (2026-10-18, color box) compact-mantine `colorWord` says the CSS keyword in words when the hex
   is exactly one (800080 "purple", 006400 "dark green"; table `CSS_COLOR_WORDS` in
   `utils/color-utils.ts`, checked against the `color-name` package), else a hue band; bands
   re-cut: green to 170, teal, blue to 235, indigo, violet, purple to 320, pink. 6366F1 is
   "indigo", Okabe-Ito 009E73 "green". `typedColor` joins a keyword typed as words ("dark green");
   hex digits are read from the unjoined text, so "abc def" is never ABCDEF. Refusal under the row:
   `.cm-paint-message { contain: inline-size }`. Escape speaks `colorEditDiscarded` from a status
   region that is always mounted. Hex and opacity boxes: `cursor: text`. Walk
   `design/ui/studio/tmp/r1-dry2-r1-3-04/w1` (06, 07), `w2`, `w3` (SR, 28-31).
2. (2026-10-18, redo of a run) A style layer holds the live scope it was compiled over
   (`sets/layers.ts` Entry); `LayerScopes.keep()` stops entries the stack no longer names, and an
   undo then redo puts the SAME compiled layer back, so a stopped entry re-watches and resolves
   afresh when read (`#revive`). Test `groups-as-layers` "brings the results back with the layers
   on redo". New read `runs.answered(algorithm, params, options)` says whether `start()` would
   compute; Analyze marks "Update <name> layer" disabled (`aria-disabled`, still focusable so Esc
   steps back) and says "<name> is up to date with these settings." Walk
   `design/ui/studio/tmp/r1-dry2-r1-3-12/w2` (09, 11, 14, 20, 21).
3. (2026-10-18, key and drawing) Only a layout moves nodes, and the key never moves the drawing.
   The "re-laid drawing" pilots saw (T48B pointer 11-12, keyboard 68-69, detours 17-18) was the
   app's own `zoomToFit` when the key grew over a node: shapes kept, scale ~0.8. Element proof:
   `test/browser/style-change-keeps-layout.test.ts` (style layer, filter step, Louvain with the
   step on, a changed condition: positions identical to 4 decimals once at rest). Now
   `useOverlayInset` never fits for an overlay's growth; it fits only when the canvas itself changes
   size (table, window), while `autoFrame && !cameraPlaced`. The key reserves its whole room up
   front (`KeyRoom`, `.ws-legend-room`, at the card's cap, whenever the key is switched on), so
   the load's own framing keeps it clear. Key counts what is drawn: element `LegendBlock.scope`
   counts selected elements among `"visible"` (`selects` in `StylesApi.ts`), present at count 0;
   the app drops `scope.count === 0` blocks and re-reads on `visibility:changed`. Scrolling key:
   foot line "N more below" (`belowLine`, `entriesBelow`, sticky `.ws-legend-more`). A run's
   channel only one group layer writes is headed by that layer (`runSections`). Tests: element
   `legend-reach`, app `CanvasOverlays.test`, `legendWords.test`, `LegendCard.real-element`
   ("never moves the drawing..."). Walks `design/ui/studio/tmp/r1-dry2-r1-3-11/w1`-`w5`.
4. (2026-10-18, summaries) The inspector says the whole truth: a selection's category row lists
   every value with its count (`attributeSummary` in `inspector/words.ts`), a file column none of
   the selection holds reads "0 of 4 have a value" (`summaryRows`, NodeValues), Degree is a range
   from the element (`SelectionStatistics.degree`, additive); an attribute lists its values
   (`ValueCountRows`, GraphValues, `data.valueCounts`), "Kind" is "Value type"; a stat DataRow's
   name wraps (compact-mantine `tree.css.ts`); a partly filled attribute row puts its fill on a
   second line (`descriptionVisible`); one-value bins read "1: 1 node" (`rangeWords`);
   `formatNumber` (whole parts exact over 1,000) is the key's (`legendNumber`) and the table's
   (`DataTable formatNumber`, additive); an undirected edge's ends are Node A / Node B
   (`edgeEnds` in `table/columns.ts`, also EdgeValues); an unset label color draws an empty
   swatch (`CompactColorInput emptySwatch`, additive). Test
   `inspector/__tests__/WholeTruth.real-element`, element `selection-on-session`. Walk
   `design/ui/studio/tmp/r1-dry2-r1-3-07/w1` (03, 05, 09, 11-14, 19, 21).
5. (2026-10-18) The study build 5bd16cda6e was frozen from uncommitted edits; they are now
   commits d4c279613 (element `canvas:element-click`), babb23528, 3650da1d8, c0199136c
   (compact-mantine tooltips, lists, popout margin and paint reset), 812266215 (inspector),
   40cd76a18 (style), 3a2368f54 (data page) and 6dd52bfa1 (notes). Freeze a study build only from
   a clean worktree (`git status` shows no modified tracked file), so its source is in git.
6. (2026-10-18) Every fix of the second dry run, in full (labels, undo, inspector and table, key,
   find box, names and words, focus and keys, lists, number card, spoken messages, layer panel,
   shared controls): `git show 6dd52bfa1:design/ui/studio/notes/engineer.md`, Top of mind 0-11.
   Before building a handed-out fix, check `git merge-base --is-ancestor <fix> <pilot commit>`.
7. Open questions for the owner live in `owner-decisions.md` ("For the owner"): a bare rule name
   reading a run's field; comparisons by default in `selectorRule`; a larger or screen-pixel
   default label size; Kelly's palette for 10 to 19 groups.
8. Shared worktree: other agents commit beside me. Stage only my files. For a shared file, build
   the blob from `git show HEAD:<file>` plus my edits by exact string replacement in Python,
   `git hash-object -w` + `git update-index --cacheinfo`, then read `git diff --cached`. Never
   `git stash` (not even `list`). Commit headers <= 100 characters, scope from commitlint's list
   (`workspace` for studio notes, not `design`).
9. Prove a test fails without the change: copy the fixed file aside, `git show HEAD:<file>` over
   it, run only that test (`-t`), copy back at once. Only for files no one else has touched.
10. graphty tests read compact-mantine from its `dist` (rebuild it: `npm run build` there) and
    graphty-element from source; rebuild the app (`pnpm exec nx run graphty:build`, Sentry vars
    unset) before a real.mjs walk; end the session and start again after a rebuild. When nx
    refuses ("defined in multiple locations", a `compact-mantine-headproof` copy another agent
    is using), run `npm run build` in compact-mantine, graphty-element, then graphty.
11. API changes: additive ones go in `owner-decisions.md` under "decided by the team" with the
    name and shape; a changed default or a renamed or removed member goes "for the owner". A new
    Graph or element member needs `doors.ts` and `test/cost-coverage/method-classes.ts` lines,
    `npm run api:report` after a build, and `jsx.ts` regenerated by the build.
12. Combined Style panel (V7 tabs, condition cards, several layers): `style/cards.ts`,
    `style/WhichPicker.tsx`, `RowStyle` in `StylePanel.tsx`. A controlled text field never
    round-trips through the element; one undo step per open is `TransactionOptions.after`. Not
    built: number card histogram for a run field, "lowest N", dashed chips at rest. One
    BoundValue for one layer and for several (owner 2026-10-16).
13. Element facts worth citing: layers paint one kind (a row is two parts); selectors everything,
    expression, has, ids, top, member, rule, state; a user layer that sets nothing is refused
    (`E_BAD_LAYER`); Top N takes a tie group whole; `data.histogram` takes data columns only, a
    run field uses `run.result.histogram`; a bound label size wins over a label style's `sizePx`
    in the same stack (`writeRank` in `StylePainter.ts`).
14. Study tool: `real.mjs --start <dir> empty|setup:<file>` through its own browser slot;
    `--click "role=<role>:<name>"` for shared names, `--click-at x,y` when a name will not match
    (it prints the control it hit); step N lands in screenshot N+1; `--end` always. A select's
    option click can fail on `cm-pointer-still` (list opened under a still pointer): use
    `--key ArrowUp --key Enter`. Compare drawings with PIL `ImageChops.difference(...).getbbox()`
    on the canvas crop `(300,120,1195,835)` at 1440 x 900.

## Decisions and reasons

- (2026-10-18) **A list closes on focus leaving, through its own click.** Escape dispatched to
  close it would also reach a surrounding popover's Escape capture and close the panel; a
  synthetic click on the trigger toggles only the list (Mantine's `toggleDropdown`), and
  ensureFocusModality and announceOpened ignore untrusted events. Only when focus moves to an
  element (`relatedTarget`), so a window losing focus leaves the list as it was.
- (2026-10-18) **"Selected" is said on each cell of a selected row; the row keeps it too.** The
  study tool, like a screen reader moving cell to cell, reads the focused cell's state; the row's
  `aria-selected` alone was never heard (T41B). Counting tools count rows only.
- (2026-10-18) **Already met on the frozen build, no change:** End and Home in a table row (unit
  test, walk `w2/11.png`); a hovered disabled "Style nodes" and the top bar's Undo show their
  reasons as drawn tooltips (probe on 5bd16cda6e: "Stays on: style edges first to stop styling
  nodes"); fixed role boxes draw no caret. A disabled StyleSelect (and the other four annotated
  controls) still give their reason as a native `title`, which real.mjs cannot see ("tooltip:
  null" on "Role of name"); a person's browser shows it. If a study needs it drawn, the five
  controls change together (`useControlAnnotation`), not one.
- (2026-10-18) Why this look names each line for the style tree row that holds the layer
  ("Louvain / Group 1") and opens that row; tests find the line by what it sets ("Color"), not by
  a run's name. A click on the node already selected brings its inspector back.

- (2026-10-18) **The refusal squeezed the field through grid track sizing, fixed with
  containment.** `.cm-paint` is a grid `minmax(0, max-content) auto` with the message spanning both
  tracks; the message's max-content raised the reset track's growth limit, and free space is shared
  equally between tracks, so in a 200px row the field fell to 78.5px of 168 (test "keeps the field
  its full width" fails with exactly that without the line). `contain: inline-size` gives the
  message no intrinsic width; it stretches over the grid area and wraps.
- (2026-10-18) **Color words fixed in `colorWord`, the one place every caller reads** (picker
  swatches, the app's `colorName`, `valueText` of GraphSettings and LabelSettings). Keyword first:
  a reader who typed "purple" hears "purple". Recorded under "decided by the team" as a fix of
  wrong output. Tests that pinned the old words updated ("indigo 6366F1", "lime 00FF00").

- (2026-10-18) **Redo of a run fixed in the element's live scopes, not in the run history.** The
  run's entry and result did come back on redo (`runs.get().result` was defined); what stayed
  empty was each group layer's live scope, stopped by `keep()` after the undo pass resolved it with
  no run (signature `r"louvain"=-`, 0 nodes). Found by logging the resolution cache's signatures:
  after the redo nothing resolved at all. Fixed where every `{match:"member"|"rule"}` layer reads,
  so a layer over a filter, a set or a note is covered too.
- (2026-10-18) **"Update <name> layer" is not offered when it would change nothing.** Whether
  `start()` reuses a run is the element's call (canonical params, scope digest, data digest); the
  app comparing form values would reimplement it, so the element answers (`runs.answered`,
  additive). Kept focusable (`data-disabled` + `aria-disabled`, not `disabled`): a disabled
  autofocused button leaves focus nowhere and Esc no longer steps back (T7 test). real.mjs (and
  Playwright) refuse a click on an `aria-disabled` button; a number box commits on Tab or blur.
- (2026-10-18) Seen, not mine: `door-surface.test.ts` fails on HEAD (`LoadDraft.graphtyDocument`
  unclassified, from b4dc42dd2); `tasks.real-element` "folder of groups was deleted" fails on HEAD
  ("Deleted Louvain. Its results are kept." found twice); `legend-copies.test.ts` has two type
  errors (readonly `range`).

- (2026-10-18) **A column no selected node holds is said from the column list.** The element's
  statistics list only the attributes the selection carries (its documented contract), so the app
  lists the file's node columns missing from them as "0 of N". Making the element list every
  column would change what an existing call returns (breaking); reading "absent means none" is
  reading its documented fact, not computing over the graph.
- (2026-10-18) **A selection's degree is the element's range, not the app's walk.** Each node's
  degree is the element's; min and max over a selection is computing over the graph, so the
  element publishes `degree { min, max }` (the `graphty.degree` value, edges touching).
- (2026-10-18) **One number spelling for a value everywhere.** The key used exponents below
  0.001 and the table three fraction digits, so a score read three ways. All three now call
  `formatNumber`; it keeps a whole part exact (12,345 never 12,350), which four significant
  digits alone did not.
- (2026-10-18) **A stat's name wraps; a list row's name still ellipsizes.** A stat's name is a
  label the reader must read whole; a list row's name is the reader's own string with a tooltip.
  "Largest component" became a stat row (still clickable) so it wraps too.

- (2026-10-18) **A study build is frozen only from committed source.** Build 5bd16cda6e held
  uncommitted edits, so no git commit reproduced what the pilots walked until they were landed
  afterwards. A clean `git status` before the copy keeps every finding traceable to a commit.
- (2026-10-18) **The node-click subscription sits above the snapshot release list in `Graph.ts`.**
  It was inserted between that list's comment and its handler, so the comment ("AFTER the layout
  manager's own subscription") read as if it explained the click; moved, no behavior change.

- (2026-10-18) **The app turns off the element's own undo keys.** The element handles Control+Z
  on its focused canvas by default and prevents the key's default, so the app's key hook skipped
  it: Undo ran with no notice (walk w2, 15-18). The element documents `history-keys="false"` for a
  host that names its steps, so the app sets it; no element change. Undo stays one command in the
  app, with one set of words, wherever focus is.
- (2026-10-18) **A step label is an act, lowercase** ("adding Layer 1"), because it is read after
  "Undo " in the tooltip and "Undid " in the notice; "Undid Add Layer 1." read as a title.
- (2026-10-18) **The first dry run's condition-list fixes stay as built in ed738e684, minus
  two items the second dry run reversed.** First match active, combobox search, Tab and Escape
  closing the list, the list as wide as the cards' column, one Node id row and Enter finishing a
  text or number card all hold on the current build (walk
  `design/ui/studio/tmp/r1-dry1-condition-lists/walk2`, 09-13). Kept as the second dry run decided
  (`tier3/dry-run-r1-2.md`, T41B row 26 and the Layer panel group): an unfinished card shows NO
  count (12 then 9 misled), and Done is drawn on a layer with no card (removing the last card must
  not strand the reader; an empty Which row now opens straight onto the list). The first dry run's
  "count while unfinished" and "no Done before a card" are superseded, not open.
- (2026-10-18) **A contained bubble narrows to its panel, inset 8 px.** Clamping alone left a
  240 bubble in a 240 panel touching the window edge (T37A detours/07). Narrowing is inside the
  `contained` contract, so no new option. Evidence: `w1/02.png` (1208..1432).
- (2026-10-18) **A tree reveals a selection once per change, never again.** Reveal on every render
  would reopen a folder the reader just closed; keyed on the selection's ids instead. Group rows
  mark their own layer in the tree rather than changing what a membership opens.
- (2026-10-18) **Selection counts come from the element.** "N of M have a value" needed a count
  the app could only get by walking records; added `count` to the element's statistics.
- (2026-10-18) **The default dock shows ten whole rows (449 px), not 416.** Rows are 32 px plus a
  1 px rule, so 64 + 32 x 11 showed nine and a part (`w1/04.png`); `w2/02.png` shows ten.
- (2026-10-18, r1-3) **The key reserves its whole room; nothing but a canvas resize reframes.**
  Supersedes "an overlay that covers a node frames the graph again": that fit moved the drawing
  every time the key grew over a node (T46A, T48B, T51B read it as a re-layout). Reserving the
  card's cap as the inset whenever the key is on keeps both rules: the drawing never moves for the
  key, and no node is ever under it. Cost: the drawing is framed right of a 264 px column even
  before any key exists. Reported at once (no wait for `graph-frame-stable`): the room does not
  depend on the key's content, so a first open and a reopen frame alike.
- (2026-10-18) **A key's reach is the element's fact, not the app's count.** Whether a layer reaches
  some nodes and whether a value's every element is painted over need a walk of the graph; the
  element publishes them (`scope`, `paintedOverBy`) and the app only words them.
- (2026-10-18) **Legend is pressed only while a key is drawn**, so a press while none is drawn turns
  the switch on, as the unpressed button promises.
- (2026-10-18) **The find box reads the plain form, so it never teaches backticks.** It already
  offered `donations >= 10000` typed without "="; the same input with "=" was refused with a
  correction. Both now run through the element's rewrite and every rule shown is plain. Display
  stripping touches numbers only: a backticked text or `true` means a column name when bare.
- (2026-10-18) **Structure is the fallback candidate, not a second one.** A column or run field
  named degree wins; two candidates leave `checkRule` with no suggestion (its contract).
- (2026-10-18) **Yes/No words come from the consumer** (`FindOptions.booleanWords`): the element
  ships no English. The app passes `yesNoWord`, its table's words.
- (2026-10-18) **Escape takes back only the box's own selection.** One made on the canvas or in the
  inspector is not the box's to clear; membership is compared, since an add resets `origin`.
- (2026-10-18) **An option's fact and its disabled reason are part of its name.** A screen reader
  often skips a description, so "degree" and "community" read alike with neither range nor reason
  (T43B, T48B). Only a description drawn below a row that can run stays a description.

Older decisions (28 entries, 2026-10-17 to 10-18) are in full in git: `git show 14b7a7606:design/ui/studio/notes/engineer.md`.

## Thinking

- (2026-10-17) Tooltips on focus keep costing keys: they cover the next control and (until today)
  ate Escape. If another tooltip defect comes up, ask whether an icon button with a visible
  pop-out title needs a focus tooltip at all.
- (2026-10-18) If the reserved key column reads as wasted room on a graph with no key, reserve it
  only while the key has entries and frame once when it first appears; never fit on its growth.
- (2026-10-17) "Keys polled per frame" hid taps; any per-frame input needs a "pressed since the
  last frame" record.
- (2026-10-10) The dry run must walk what participants do; pilot each task on the candidate build
  and keyboard-press every control before freeze. A finding that traces to the prompt's own words
  is fixed in the prompt.

## Tried: worked / did not work

- Four entries of 2026-10-18 (landing the frozen build's source, T7/T8 lookups, the r1-3-01 walk,
  re-optimized vite deps on a first run) are in full in `git show bffcbc76d:design/ui/studio/notes/engineer.md`.

- (2026-10-18) compact-mantine's full browser + default run: 10 failures, every one also failing
  with my five files put back to HEAD (QuickActions FieldChooser axe "community" option, a
  disabled select trigger's border color, tree toggles at x 184 not 188, color swatch tests from
  another agent's uncommitted color work); `tsc -p tsconfig.check.json` reports
  `tests/components/overlays/Toast.test.tsx` unused React, not mine.

- (2026-10-18) nx in the studio worktree refuses every target while an untracked
  `compact-mantine-headproof/` (another agent's) holds a second `@graphty/compact-mantine`
  package.json. Build graphty directly: `cd graphty && npm run build` (Sentry variables unset).
  WORKED. compact-mantine at HEAD already fails: `tsc` on `tests/components/overlays/Toast.test.tsx`
  (unused React), `CompactColorInput.onChangeEnd` and figma swatch tests that expect a swatch
  named by its bare hex, the SwatchesAndChangeEnd story, Tree, QuickActions FieldChooser, the
  untracked SharedLists test. Not mine; left alone.

- (2026-10-18) `waitForSettled()` resolves before the force layout is at rest: two position reads
  ten frames apart differ. A layout test waits until two reads agree (`rest` in
  `style-change-keeps-layout.test.ts`). Proving a fix against old code without git stash: copy the
  changed files aside, `git show HEAD:<path> > <path>`, run the test, copy back. WORKED.
- (2026-10-18) Selecting with the find box for a walk: a quoted value works
  (`role != 'volunteer'`), a bare word is read as a column, and `phone == null` reads "null" as a
  column; `!phone && role` selects the people with no phone. A rule matches edges too when they
  lack the column (`role != 'volunteer'` took all 63 edges), worth a look by whoever owns rules.
- (2026-10-18) nx failed to build the project graph (a stray `compact-mantine-headproof` copy);
  `npm run build` in compact-mantine, graphty-element, then graphty worked.

- Older entries (2026-10-06 to 2026-10-18, the dry runs' walks and test runs) are in full in
  `git show 6dd52bfa1:design/ui/studio/notes/engineer.md`.

- (2026-10-18) Found, not fixed: graphty-element `real-input.test.ts` "three wheel turns out in 3d
  zoom out as far as three turns in zoom in" fails every run (start/out 1.4045 vs in/start
  1.4366, tolerance 0.01); the 2D case and the three-out-undo-three-in check pass. Zoom to the
  pointer in 3D moves the orbit target toward the pointer, and on-screen spread is not inversely
  proportional to camera distance for nodes off the target's depth, so a further three notches
  out from the start do not mirror three in. No camera code changed since 4e7c5cddd, which added
  the test; needs its own unit.

## Sources

- Digests in `design/ui/studio/digests/`; repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 3: `design/ui/studio/tier3/` (`design.md`, `dry-run-r1-1.md`, `criteria.md`,
  `rounds/r1/pilot/`), `design/ui/studio/owner-decisions.md`.
- Full notes before this summary: `git show 54c009f84:design/ui/studio/notes/engineer.md`; before
  the first summary: `git show 6b160deb5:design/ui/studio/notes/engineer.md`.
- (2026-10-18) Re-asked for truthful counts after a restart: already landed in 97d8bff7c (in the frozen build ed4351b258); `TruthfulCounts.real-element` still passes on the branch tip, walks in `design/ui/studio/tmp/r1-dry1-truthful-counts/w1`, `w2`. Check `git log` for a task's title before rebuilding it.
- (2026-10-18) Re-asked for the key (column title, 250,000, no stale fold, no repeated "Agencies", no cut entry, Tab and arrows) after a restart: already landed in ed4351b25, the frozen build itself; on the branch tip element `legend-copies`/`legend-reach` (5), app `legendWords` (21) and `LegendCard.real-element` (7) pass; walks `design/ui/studio/tmp/r1-dry1-key/w2`, `w3` show "Size: donations 0 - 250,000" and Group 1-10 whole in a focusable scrolling key.
