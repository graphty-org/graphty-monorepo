# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "the studio worktree" is
`.worktrees/design-studio-tier3` (branch `design/studio-tier3`). "Frozen build" is a copy of
`graphty/dist` under `.study-builds/`, named on the first line of `tier3/criteria.md`.

Summarized 2026-10-17 from 158 KB. The full earlier notes (every dated entry from 2026-10-06 to
2026-10-17) are in git: `git show 6b160deb5:design/ui/studio/notes/engineer.md`.

## Top of mind

1. (2026-10-17, focus after adding, graphty + compact-mantine) One rule picks where focus goes in
   a line or card just drawn: `keystrokeTarget` in `style/useFocusLine.ts` -- its first box that
   takes typing (`input` not read-only, hidden, checkbox or radio), else its first control. Every
   add path (section "+", folder "+", Edge tab, "One value for all", Undo) and new condition cards
   (`WhichPicker` `Cards`) route through it. A read-only select's box is never `select()`ed.
    - Width on a layer made from a selection lost focus to "Add to edge line": the selection
      tab's row unmounted holding focus and `useFocusOnRemoval`'s rAF focused its section's "+"
      because `!node.isConnected` was true, AFTER the new tab had focused its own Width box. Now
      it acts only when focus fell to the page.
    - compact-mantine `ensureListboxKeyboard`: a letter typed on a CLOSED select-only trigger
      opens the list and types ahead (APG select-only combobox), as a bubble-phase listener that
      skips a key a field already used (`defaultPrevented`, a row's "="). The walk waits for the
      list to be drawn (rAF, 10-frame guard) and runs after Mantine's zero-delay index update.
      A type-ahead run now also resets on another field (a run carried "g" across tests).
    - Test: `style/__tests__/FocusAfterAdding.real-element.test.tsx`; compact-mantine
      `StyleSelect.browser.test.tsx` "opens on a letter typed while closed". `BulkEdit` no longer
      clicks the color box before typing (a click in a focused, selected box places the caret).
    - Checked on a fresh build (`design/ui/studio/tmp/r1-dry1-focus-after-adding/`): walk1 (Width
      on a find-made layer, Edge and Node Color typed "blue"/"orange" + Enter repaint, text card
      "Mme" gives 6 of 77, Shape list opens on Enter with nothing selected), walk3 (bars' Shape
      check by hand: "Box", Enter, Escape draws boxes). bars.mjs tier 3: text card and Color line
      "written"; its Shape check never ran because an earlier move clicks "phone: match", a name
      another agent's uncommitted WhichPicker edit removed.
    - Pre-existing, not mine: compact-mantine `tests/figma/overlays.browser.test.tsx` two tooltip
      tests fail with HEAD's listbox too; several style real-element tests fail on other agents'
      uncommitted renames ("Find a value", vary button label, Which row label).
2. (2026-10-17, color box, compact-mantine) Built and checked with real.mjs on a fresh build
   (`design/ui/studio/tmp/r1-dry1-color-box/walk1`, `walk2`):
    - Escape in every color text box reverts AND keeps focus, value selected
      (`revertOnEscape` in `components/color/escape.ts`; `flushSync(revert)` before `select()`, or
      the controlled redraw drops the selection and the next key appends). The old
      "outside a pop-out it blurs" rule and `isLeavingWithoutCommit` are gone.
    - A refused entry draws a `role="alert"` message under the field (`.cm-paint` now wraps;
      `.cm-paint-message` takes a full line), tied to the hex box by `aria-describedby`. Enter keeps
      the words (`aria-invalid`); leaving reverts and says what it kept. Labels `colorRefused`,
      `colorRefusedKept` (team decision in `owner-decisions.md`).
    - One parser for every color box: `components/color/typed-color.ts` (hex or CSS name) feeds
      the paint field, the picker's Hex value box and a gradient stop's hex box.
    - Picker swatches: Mantine `Tooltip` with the accessible name; `aria-pressed` + outline on the
      swatch equal to the value in force.
    - Open: in the app's style row the "Color" label centers on the taller field while a message
      shows (the row's alignment, not the field's). Swatch names are the strings the app passes
      (hex); naming them in words would need a names list from the caller.
    - Pre-existing, not mine: `tests/figma/tree.browser.test.tsx` "toggles: 24px targets" fails
      on this branch (x 184, expected 188); nothing in the tree changed in this work.
3. (2026-10-17, drawing and camera, commits ceeea1028 element, 6b160deb5 app) Built and checked
   on a fresh build with real.mjs (`design/ui/studio/tmp/r1-dry1-drawing-and-camera/`):
    - Removing a channel repaints: `nodePaintOf` (StylePainter) gave `color: null` for "no layer
      paints a color" and `Node.applyInstanceColor` skipped the write, so the instance kept the
      old color. Now null falls back to `bootstrapNodePaint().color`. Test
      `test/managers/style-painter-removed-color.test.ts`.
    - The unasked camera moves were the APP's key card: `LegendCard` called `zoomToFit()` when the
      card grew over a node (Color line added), and reported insets measured off a canvas hidden
      behind the file page (Cancel then slid the drawing ~6 px). Now the card never frames, and
      skips a canvas with no box (`getClientRects().length === 0`; `clientWidth === 0` broke the
      unit test's zero-height host). Cost: a node can sit under the card until Zoom to fit.
    - Keys: a key pressed and released between two frames was lost (polled per frame). Both input
      controllers now keep `held` + `tapped` action sets from `CANVAS_KEY_DESCRIPTORS` (new
      `./catalog` table); 3D zoom keys act on keydown (one wheel notch, a quarter notch per
      auto-repeat), "=" "+" zoom 3D too, Shift allowed only for "+" "_". The app's
      `ELEMENT_KEYS` copy is now derived from the table; the shortcuts dialog lists it ("Drawing").
    - `zoomToPointer` (element property, off by default; app turns it on). 2D exact
      (`TwoDCameraController.zoomAt`); 3D slides the pivot (`OrbitCameraController.zoomToward`,
      exact on the pivot plane).
    - Whole-number histograms: `buildHistogram` treats a column of only whole numbers as
      `integerValued` whatever its type (degree from a run was "1 to 1.8").
    - Kelly palette (19 colors) in the catalog, NOT chosen automatically (`OFFERED_NOT_CHOSEN` in
      `session/styles/palettes.ts`; letting the element pick it changed the column-encoding
      guide's 14-department result = a changed default, so it is an owner question in
      `owner-decisions.md`). `RunStyle.groupPalettes` (first palette with a color per group); the
      app passes the catalog's group palettes in Analyze and Vary by Layer
      (`startingBinding(session, descriptor, count)`). College football Louvain: 10 distinct.
    - NOT reproduced: "a refused range rule moved every node" (T42B). On the fresh build, "to"
      below "from" still crashes the inspector ("This panel could not be shown", the number card
      unit's) but nothing moved, with or without a selection. Do not guess a mechanism.
    - NOT built: a data-column binding (not a run, not Vary by Layer) with more groups than its
      palette still gets the element's default; the reader picks Kelly in the palette select.
4. (2026-10-17) Opened projects lost their rows: anything keyed by a layer id that a document
   carries must be remapped on apply (`documentRowKeys`, commit 619ce32be).
5. (2026-10-17) Combined Style panel (V7 tabs, condition cards, several layers) is built; files
   `style/cards.ts`, `style/WhichPicker.tsx`, `RowStyle` in `StylePanel.tsx`. A controlled text
   field never round-trips through the element; one undo step per open is
   `TransactionOptions.after`. Not built: number card histogram for a run field, "lowest N",
   dashed chips at rest.
6. One BoundValue for one layer and for several layers (owner decision 2026-10-16); Layer is a
   temporary value, a data field is copied as is. Vary by Layer uses the same group list as a
   data value (`GroupRows`, `styles.layerGroups`).
7. Shared worktree: other agents commit beside me. Stage only my files; build commits from HEAD
   plus my hunks when a file is shared; re-check `git diff` on a shared file right before
   committing. Never `git stash` (not even `list`) in this repo's agents.
8. Prove a test fails without the change: copy the fixed file aside, `git show HEAD:<file>` over
   it, run the test, copy back. Check a "passes without the fix" test before trusting it (the
   histogram test passed on HEAD at 8 bins because 16/8 happened to be whole).
9. graphty tests read compact-mantine from its `dist` and graphty-element from source; rebuild
   the app (`pnpm exec nx run graphty:build`, Sentry vars unset) before a real.mjs walk; a
   session serves the dist it started on, so end and start again after a rebuild.
10. API changes: additive ones go in `owner-decisions.md` under "decided by the team" with the
    name and shape; a changed default or a renamed or removed member goes "for the owner". A new
    Graph or element member needs `doors.ts` and `test/cost-coverage/method-classes.ts` lines,
    `npm run api:report` after a build, and `jsx.ts` regenerated by the build.
11. Element facts worth citing: layers paint one kind (a row is two parts); selectors everything,
    expression, has, ids, top, member, rule, state; a user layer that sets nothing is refused
    (`E_BAD_LAYER`); Top N takes a tie group whole; `data.histogram` takes data columns only, a
    run field uses `run.result.histogram`.
12. Study tool: `real.mjs --start <dir> empty|setup:<file>` through its own browser slot;
    `--click "role=<role>:<name>"` for shared names; step N lands in screenshot N+1; `--end`
    always. Compare screenshots with PIL `ImageChops.difference(...).getbbox()` on the canvas
    crop (`(300,120,1195,835)` at 1440 x 900) before calling a drawing unchanged.

## Decisions and reasons

- (2026-10-17) **After an add, focus goes where the next keystroke belongs**: a box that takes
  typing before a swatch or a menu. A select takes typing too (letters open it on the match), so
  no control a reader lands on ignores keys. A cleanup that hands focus on must check that focus
  actually fell to the page, never that its own node is gone: a remounted tab may already hold it.
- (2026-10-17) **Escape never drops focus to the page.** A text box reverts and stays focused,
  inside a pop-out or not; only an untouched box inside a pop-out lets Escape close the pop-out.
  Evidence: three pilots ended Escape on the page body and lost their place.
- (2026-10-17) **A refusal says what the box takes, on screen and to a screen reader**, and a blur
  that throws an entry away says so; a red edge alone told readers nothing.
- (2026-10-17) **The element never moves the camera for the app's overlays; the app never
  frames on its own.** A key card growing or a page closing is not a reader asking. Insets only
  shape the next fit.
- (2026-10-17) **Canvas keys are a catalog fact** (`CANVAS_KEY_DESCRIPTORS`): the controllers read
  it, so the shortcuts list and the keys cannot drift, and the app does not copy element keys.
- (2026-10-17) **A palette the element ships is offered, not chosen, when choosing it would change
  an existing binding's drawing.** A consumer's own list (`groupPalettes`) is how a covering
  palette is picked without a changed default.
- (2026-10-14, round 6) Element additions, all additive: empty rows for starting rows, run
  `restoreLayer`, binding `otherwise`, value labels, preview palette and defaulted parts,
  proposeEncoding range fits, project palettes, `ties` on top N, descriptor `modifies`/`step`,
  in/out degree histograms.
- (2026-10-12) **One list of readable values** (`data.readableValues()`), run fields described
  by the same walk as data columns; one `columnFits` for picker and encoder. Two checks of one
  question produce this project's worst defects.
- (2026-10-12) **The style tree rides on the stack array**, so undo carries it with no new slice;
  order lives in the tree and other verbs' placements are reconciled into it; a hidden row reads
  as disabled only where painting is decided; the reader's lock refuses content edits only
  (`E_LOCKED`).
- (2026-10-12) **Changing a row's kind keeps the row** (`writeRow(id, { target })`); the rule is
  carried across kinds (`incident`, `ends`).
- (2026-10-12) **Starting rows on in the app** (`startingRows: true, runPlacement: "top"`) for
  every project opened after the workspace starts; a story's own project is left as its maker
  set it.
- (2026-10-11) **Study rules live where every caller passes** (`real.mjs --start` holds the gate
  and the slot wait). Answer-key facts live in `answers.md`, never in the tool.
- (2026-10-11) **Fix in the owning package; one change per problem; words at rest never rise.**
  A word count is diffed by word against the limit's own build before any word is cut.
- (2026-10-10) Owner decision: a chosen segment keeps Figma's face, never an inverse fill.
- (2026-10-10 to 10-11) Older standing calls: a warning that changes what Load does is part of
  Load's description; the table follows the drawing by the element's own scope; a rule names a
  column through `rulePath`; a command with nothing to do is disabled with a reason; leaving the
  step editor saves a whole rule.

## Thinking

- (2026-10-17) The no-reframe rule trades one surprise for another: a key card can now cover
  nodes (College football, left edge). If the studio sees readers lose nodes under the card, the
  fix is the card's place or size, not a camera move.
- (2026-10-17) "Keys polled per frame" hid taps for 2D pan and 3D turns too; any per-frame input
  needs a "pressed since the last frame" record.
- (2026-10-10) The dry run must walk what participants do, not last round's list; pilot each
  task on the candidate build and keyboard-press every control before freeze.
- (2026-10-10) A finding that traces to the prompt's own words is fixed in the prompt. The
  simulation understates costs a person pays; weigh those findings up.

## Tried: worked / did not work

- (2026-10-17) DID NOT WORK: swapping HEAD copies over shared files (WhichPicker, PropertyRow) to
  prove a test fails: other agents' uncommitted hunks in those files ride along and could be lost
  if they edit during the run. Safe only for files no one else has touched (`git diff` first).
- (2026-10-17) WORKED: a `focusin` listener logging a short stack per focus change found the
  thief (`PropertyRow.tsx` rAF) in one run.
- (2026-10-17) DID NOT WORK: walking a just-opened Mantine list in `setTimeout(0)` alone; a
  type-ahead run kept across fields joined a previous test's "g" into "gpent".
- (2026-10-17) DID NOT WORK: `setDraft(x); input.select()` in one handler: React redraws the
  controlled value after the select and the caret lands at the end. WORKED: `flushSync`.
- (2026-10-17) WORKED: proving five new userEvent tests fail on HEAD by copying the old sources
  over the changed ones (`git show HEAD:<file>`), running, and copying back.
- (2026-10-17) WORKED: reproducing each acceptance item with real.mjs on the fresh build and
  pixel-diffing the canvas before and after a step; it showed the Cancel case had a residual
  6 px slide after the reframe was gone. DID NOT WORK: `engine.resize()` before the 3D inset
  shift (a guess at a stale render size); the slide came from insets read off the hidden canvas.
- (2026-10-17) DID NOT WORK: `{ ...keyboardEvent }` to copy an event (its fields are prototype
  getters; the spread is empty). Pass the fields by name.
- (2026-10-17) WORKED: a run-group palette test with a fake community executor
  (`createGraphSession({ runs: { execute } })`, as `groups-as-layers.test.ts` does).
- (2026-10-12) WORKED: staging my hunks out of files other agents were editing: HEAD plus my
  `-U0` hunks as a blob (`git hash-object -w` + `git update-index --cacheinfo`), an isolated
  tree from `git archive` for tsc and tests.
- (2026-10-12) WORKED: audit walks as one Playwright script per size through `with-browser.sh`
  with a `measure()` after every screenshot (clipped text, overflowing inputs, overlaps).
- (2026-10-12) WORKED: owner-review pictures from stories (`StylePanel.stories.tsx`,
  `capture-review-stories.mjs`), reaching each state by clicks in the play function.
- (2026-10-12) Never `open(p, "w").write(f(open(p).read()))`: the write truncates first.
- (2026-10-11) Did not work: bars.mjs on two builds at once (more than four browser slots);
  writing test data from memory (copy fixture rows from the file).
- (2026-10-11) A first real-element run after vite re-optimizes dependencies can fail every file
  with "Failed to fetch dynamically imported module"; rerun once before reading anything into it.

## Sources

- Digests in `design/ui/studio/digests/`; repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 3: `design/ui/studio/tier3/` (`design.md`, `dry-run-r1-1.md`, `criteria.md`,
  `rounds/r1/pilot/`), `design/ui/studio/owner-decisions.md`.
- Full notes before this summary: `git show 6b160deb5:design/ui/studio/notes/engineer.md`.
